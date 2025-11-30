/**
 * Authentication Service
 * Handles user registration, login, logout, and token management
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../database/prisma';
import { storeSession, deleteSession, deleteUserSessions, getSession, refreshSession } from '../database/redis';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import type {
  RegisterInput,
  LoginInput,
  AuthResponse,
  AuthTokens,
  AuthUser,
  JWTPayload,
  SessionData,
  AuthMetadata,
} from './types';

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60; // 15 minutes

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT tokens (access and refresh)
 */
export function generateTokens(userId: string, email: string, sessionId: string): AuthTokens {
  const accessPayload: JWTPayload = {
    userId,
    email,
    sessionId,
    type: 'access',
  };

  const refreshPayload: JWTPayload = {
    userId,
    email,
    sessionId,
    type: 'refresh',
  };


  const accessToken = jwt.sign(accessPayload, config.jwt.secret, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });

  const refreshToken = jwt.sign(refreshPayload, config.jwt.secret, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
  };
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;
    return decoded;
  } catch (error) {
    logger.debug('Token verification failed:', error);
    return null;
  }
}

/**
 * Transform user model to auth user response
 */
function toAuthUser(user: {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  emailVerified: boolean;
  mfaEnabled: boolean;
  createdAt: Date;
}): AuthUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    emailVerified: user.emailVerified,
    mfaEnabled: user.mfaEnabled,
    createdAt: user.createdAt,
  };
}

/**
 * Register a new user
 */
export async function register(
  input: RegisterInput,
  metadata?: AuthMetadata
): Promise<AuthResponse> {
  const { email, password, firstName, lastName } = input;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existingUser) {
    throw new AuthError('User with this email already exists', 'EMAIL_EXISTS');
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      firstName: firstName ?? null,
      lastName: lastName ?? null,
    },
  });

  // Create session
  const sessionId = uuidv4();

  // Store session in Redis
  await storeSession(sessionId, user.id, {
    email: user.email,
    ipAddress: metadata?.ipAddress ?? '',
    userAgent: metadata?.userAgent ?? '',
  });

  // Also store session in PostgreSQL for persistence
  await prisma.session.create({
    data: {
      id: sessionId,
      userId: user.id,
      token: sessionId,
      ipAddress: metadata?.ipAddress ?? null,
      userAgent: metadata?.userAgent ?? null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  // Generate tokens
  const tokens = generateTokens(user.id, user.email, sessionId);

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // Create FREE subscription for new user
  try {
    const { createSubscription } = await import('../subscription/subscription.service');
    await createSubscription(user.id, { tier: 'FREE' });
    logger.info('Free subscription created for new user', { userId: user.id });
  } catch (error) {
    // Log error but don't fail registration
    logger.warn('Failed to create subscription for new user', { userId: user.id, error });
  }

  logger.info('User registered successfully', { userId: user.id, email: user.email });

  return {
    user: toAuthUser(user),
    tokens,
  };
}


/**
 * Login a user
 */
export async function login(
  input: LoginInput,
  metadata?: AuthMetadata
): Promise<AuthResponse> {
  const { email, password } = input;

  // Find user
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    throw new AuthError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  // Check if user is deleted
  if (user.deletedAt) {
    throw new AuthError('Account has been deleted', 'ACCOUNT_DELETED');
  }

  // Check if user has a password (OAuth users don't have passwords)
  if (!user.passwordHash) {
    throw new AuthError('This account uses OAuth login. Please sign in with Google or GitHub.', 'OAUTH_ACCOUNT');
  }

  // Verify password
  const isValidPassword = await verifyPassword(password, user.passwordHash);
  if (!isValidPassword) {
    throw new AuthError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  // Create session
  const sessionId = uuidv4();

  // Store session in Redis
  await storeSession(sessionId, user.id, {
    email: user.email,
    ipAddress: metadata?.ipAddress ?? '',
    userAgent: metadata?.userAgent ?? '',
  });

  // Also store session in PostgreSQL for persistence
  await prisma.session.create({
    data: {
      id: sessionId,
      userId: user.id,
      token: sessionId,
      ipAddress: metadata?.ipAddress ?? null,
      userAgent: metadata?.userAgent ?? null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  // Generate tokens
  const tokens = generateTokens(user.id, user.email, sessionId);

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  logger.info('User logged in successfully', { userId: user.id, email: user.email });

  return {
    user: toAuthUser(user),
    tokens,
  };
}

/**
 * Logout a user (invalidate session)
 */
export async function logout(sessionId: string): Promise<void> {
  // Delete from Redis
  await deleteSession(sessionId);

  // Revoke session in PostgreSQL
  await prisma.session.update({
    where: { id: sessionId },
    data: { revokedAt: new Date() },
  }).catch(() => {
    // Session might not exist in DB, ignore error
  });

  logger.info('User logged out', { sessionId });
}

/**
 * Logout all sessions for a user
 */
export async function logoutAll(userId: string): Promise<void> {
  // Delete all sessions from Redis
  await deleteUserSessions(userId);

  // Revoke all sessions in PostgreSQL
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  logger.info('All sessions logged out', { userId });
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
  // Verify refresh token
  const payload = verifyToken(refreshToken);
  if (!payload || payload.type !== 'refresh') {
    throw new AuthError('Invalid refresh token', 'INVALID_TOKEN');
  }

  // Check if session exists in Redis
  const session = await getSession(payload.sessionId);
  if (!session) {
    // Check PostgreSQL as fallback
    const dbSession = await prisma.session.findUnique({
      where: { id: payload.sessionId },
    });

    if (!dbSession || dbSession.revokedAt || dbSession.expiresAt < new Date()) {
      throw new AuthError('Session expired or revoked', 'SESSION_EXPIRED');
    }
  }

  // Refresh session TTL in Redis
  await refreshSession(payload.sessionId);

  // Generate new tokens
  const tokens = generateTokens(payload.userId, payload.email, payload.sessionId);

  logger.debug('Access token refreshed', { userId: payload.userId });

  return tokens;
}


/**
 * Validate a session
 */
export async function validateSession(sessionId: string): Promise<SessionData | null> {
  // Check Redis first
  const redisSession = await getSession(sessionId);
  if (redisSession) {
    return {
      userId: redisSession.userId,
      email: redisSession.email ?? '',
      ipAddress: redisSession.ipAddress ?? undefined,
      userAgent: redisSession.userAgent ?? undefined,
      createdAt: redisSession.createdAt,
    };
  }

  // Fallback to PostgreSQL
  const dbSession = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });

  if (!dbSession || dbSession.revokedAt || dbSession.expiresAt < new Date()) {
    return null;
  }

  // Re-populate Redis cache
  await storeSession(sessionId, dbSession.userId, {
    email: dbSession.user.email,
    ipAddress: dbSession.ipAddress ?? '',
    userAgent: dbSession.userAgent ?? '',
  });

  return {
    userId: dbSession.userId,
    email: dbSession.user.email,
    ipAddress: dbSession.ipAddress ?? undefined,
    userAgent: dbSession.userAgent ?? undefined,
    createdAt: dbSession.createdAt.toISOString(),
  };
}

/**
 * Get user by ID
 */
export async function updateUser(
  userId: string,
  data: { firstName?: string; lastName?: string; email?: string }
): Promise<AuthUser> {
  const updateData: { firstName?: string | null; lastName?: string | null; email?: string } = {};
  
  if (data.firstName !== undefined) {
    updateData.firstName = data.firstName || null;
  }
  if (data.lastName !== undefined) {
    updateData.lastName = data.lastName || null;
  }
  if (data.email !== undefined) {
    // Check if email is already taken
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    if (existingUser && existingUser.id !== userId) {
      throw new AuthError('Email already in use', 'EMAIL_EXISTS');
    }
    updateData.email = data.email.toLowerCase();
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  return toAuthUser(user);
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AuthError('User not found', 'USER_NOT_FOUND');
  }

  // OAuth users don't have passwords
  if (!user.passwordHash) {
    throw new AuthError('OAuth users cannot change password. Use OAuth login instead.', 'OAUTH_ACCOUNT');
  }

  // Verify current password
  const isValidPassword = await verifyPassword(currentPassword, user.passwordHash);
  if (!isValidPassword) {
    throw new AuthError('Current password is incorrect', 'INVALID_PASSWORD');
  }

  // Hash new password
  const newPasswordHash = await hashPassword(newPassword);

  // Update password
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newPasswordHash },
  });

  logger.info('Password changed successfully', { userId });
}

export async function getUserById(userId: string): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || user.deletedAt) {
    return null;
  }

  return toAuthUser(user);
}

/**
 * Permanently delete user account
 * This will:
 * 1. Log out all sessions
 * 2. Cancel Paystack subscription if active
 * 3. Permanently delete the user and all related data (cascade)
 */
export async function deleteAccount(userId: string, password?: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true },
  });

  if (!user) {
    throw new AuthError('User not found', 'USER_NOT_FOUND');
  }

  // If user has a password, verify it before deletion
  if (user.passwordHash && password) {
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      throw new AuthError('Invalid password', 'INVALID_PASSWORD');
    }
  } else if (user.passwordHash && !password) {
    // User has password but didn't provide it
    throw new AuthError('Password required to delete account', 'PASSWORD_REQUIRED');
  }

  // Log out all sessions
  await logoutAll(userId);

  // Cancel Paystack subscription if active
  if (user.subscription?.paystackSubscriptionId) {
    try {
      const { cancelSubscription } = await import('../subscription/subscription.service');
      await cancelSubscription(userId, {
        cancelAtPeriodEnd: false,
        reason: 'Account deletion',
      });
    } catch (error) {
      // Log error but continue with deletion
      logger.warn('Failed to cancel subscription during account deletion', { userId, error });
    }
  }

  // Permanently delete user (cascade will handle related data)
  await prisma.user.delete({
    where: { id: userId },
  });

  logger.info('Account permanently deleted', { userId, email: user.email });
}

/**
 * Custom error class for authentication errors
 */
export class AuthError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}
