/**
 * Authentication types and interfaces
 */

import { z } from 'zod';

// Validation schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// Types derived from schemas
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

// JWT payload types
export interface JWTPayload {
  userId: string;
  email: string;
  sessionId: string;
  type: 'access' | 'refresh';
  firstName?: string | null;
  lastName?: string | null;
  iat?: number;
  exp?: number;
}

// Auth response types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  emailVerified: boolean;
  mfaEnabled: boolean;
  createdAt: Date;
}

export interface AuthResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

// Session types
export interface SessionData {
  userId: string;
  email: string;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
  createdAt: string;
}

// Metadata for auth operations
export interface AuthMetadata {
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}
