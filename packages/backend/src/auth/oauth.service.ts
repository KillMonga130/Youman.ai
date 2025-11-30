/**
 * OAuth Authentication Service
 * Handles OAuth authentication with Google and GitHub
 */

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../database/prisma';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { generateTokens, storeSession } from './auth.service';
import { AuthError } from './types';

export enum OAuthProvider {
  GOOGLE = 'GOOGLE',
  GITHUB = 'GITHUB',
}

interface OAuthUserInfo {
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  providerId: string;
}

/**
 * Get OAuth authorization URL for a provider
 */
export function getOAuthUrl(provider: OAuthProvider, redirectUri: string, state: string): string {
  switch (provider) {
    case OAuthProvider.GOOGLE: {
      if (!config.oauth.google.clientId) {
        throw new AuthError('Google OAuth is not configured', 'OAUTH_NOT_CONFIGURED');
      }
      const params = new URLSearchParams({
        client_id: config.oauth.google.clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        state,
        access_type: 'offline',
        prompt: 'consent',
      });
      return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    }

    case OAuthProvider.GITHUB: {
      if (!config.oauth.github.clientId) {
        throw new AuthError('GitHub OAuth is not configured', 'OAUTH_NOT_CONFIGURED');
      }
      const params = new URLSearchParams({
        client_id: config.oauth.github.clientId,
        redirect_uri: redirectUri,
        scope: 'user:email',
        state,
      });
      return `https://github.com/login/oauth/authorize?${params.toString()}`;
    }

    default:
      throw new AuthError(`Unsupported OAuth provider: ${provider}`, 'UNSUPPORTED_PROVIDER');
  }
}

/**
 * Exchange OAuth code for access token and get user info
 */
export async function exchangeOAuthCode(
  provider: OAuthProvider,
  code: string,
  redirectUri: string
): Promise<OAuthUserInfo> {
  switch (provider) {
    case OAuthProvider.GOOGLE:
      return exchangeGoogleCode(code, redirectUri);

    case OAuthProvider.GITHUB:
      return exchangeGitHubCode(code, redirectUri);

    default:
      throw new AuthError(`Unsupported OAuth provider: ${provider}`, 'UNSUPPORTED_PROVIDER');
  }
}

/**
 * Exchange Google OAuth code for user info
 */
async function exchangeGoogleCode(code: string, redirectUri: string): Promise<OAuthUserInfo> {
  if (!config.oauth.google.clientId || !config.oauth.google.clientSecret) {
    throw new AuthError('Google OAuth is not configured', 'OAUTH_NOT_CONFIGURED');
  }

  // Exchange code for tokens
  const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
    code,
    client_id: config.oauth.google.clientId,
    client_secret: config.oauth.google.clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const { access_token, refresh_token } = tokenResponse.data;

  // Get user info
  const userResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  const userData = userResponse.data;

  return {
    email: userData.email,
    firstName: userData.given_name,
    lastName: userData.family_name,
    avatarUrl: userData.picture,
    providerId: userData.id,
  };
}

/**
 * Exchange GitHub OAuth code for user info
 */
async function exchangeGitHubCode(code: string, redirectUri: string): Promise<OAuthUserInfo> {
  if (!config.oauth.github.clientId || !config.oauth.github.clientSecret) {
    throw new AuthError('GitHub OAuth is not configured', 'OAUTH_NOT_CONFIGURED');
  }

  // Exchange code for access token
  const tokenResponse = await axios.post(
    'https://github.com/login/oauth/access_token',
    {
      client_id: config.oauth.github.clientId,
      client_secret: config.oauth.github.clientSecret,
      code,
      redirect_uri: redirectUri,
    },
    {
      headers: { Accept: 'application/json' },
    }
  );

  const { access_token } = tokenResponse.data;

  if (!access_token) {
    throw new AuthError('Failed to get access token from GitHub', 'OAUTH_ERROR');
  }

  // Get user info
  const userResponse = await axios.get('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  const userData = userResponse.data;

  // Get user email (may need to fetch from emails endpoint)
  let email = userData.email;
  if (!email) {
    const emailsResponse = await axios.get('https://api.github.com/user/emails', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const emails = emailsResponse.data;
    const primaryEmail = emails.find((e: any) => e.primary) || emails[0];
    email = primaryEmail?.email;
  }

  if (!email) {
    throw new AuthError('Could not get email from GitHub', 'OAUTH_ERROR');
  }

  // Parse name
  const nameParts = (userData.name || userData.login || '').split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  return {
    email,
    firstName,
    lastName,
    avatarUrl: userData.avatar_url,
    providerId: userData.id.toString(),
  };
}

/**
 * Authenticate or create user via OAuth
 */
export async function authenticateOAuth(
  provider: OAuthProvider,
  code: string,
  redirectUri: string,
  metadata?: { ipAddress?: string; userAgent?: string }
): Promise<{ user: any; tokens: any }> {
  // Exchange code for user info
  const oauthUserInfo = await exchangeOAuthCode(provider, code, redirectUri);

  // Find or create user
  let user = await prisma.user.findUnique({
    where: { email: oauthUserInfo.email.toLowerCase() },
  });

  if (user) {
    // Update OAuth info if user exists
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        oauthProvider: provider,
        oauthProviderId: oauthUserInfo.providerId,
        firstName: oauthUserInfo.firstName || user.firstName,
        lastName: oauthUserInfo.lastName || user.lastName,
        avatarUrl: oauthUserInfo.avatarUrl || user.avatarUrl,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        lastLoginAt: new Date(),
      },
    });
  } else {
    // Create new user
    user = await prisma.user.create({
      data: {
        email: oauthUserInfo.email.toLowerCase(),
        passwordHash: null, // OAuth users don't have passwords
        firstName: oauthUserInfo.firstName || null,
        lastName: oauthUserInfo.lastName || null,
        avatarUrl: oauthUserInfo.avatarUrl || null,
        oauthProvider: provider,
        oauthProviderId: oauthUserInfo.providerId,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        lastLoginAt: new Date(),
      },
    });
  }

  // Create session
  const sessionId = uuidv4();
  await storeSession(sessionId, user.id, {
    email: user.email,
    ipAddress: metadata?.ipAddress ?? '',
    userAgent: metadata?.userAgent ?? '',
  });

  // Also store session in PostgreSQL
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

  // Create FREE subscription for new OAuth users (if they don't have one)
  try {
    const existingSubscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
    });
    
    if (!existingSubscription) {
      const { createSubscription } = await import('../subscription/subscription.service');
      await createSubscription(user.id, { tier: 'FREE' });
      logger.info('Free subscription created for new OAuth user', { userId: user.id, provider });
    }
  } catch (error) {
    // Log error but don't fail OAuth
    logger.warn('Failed to create subscription for OAuth user', { userId: user.id, error });
  }

  logger.info('OAuth authentication successful', { userId: user.id, provider, email: user.email });

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      emailVerified: user.emailVerified,
      mfaEnabled: user.mfaEnabled,
      createdAt: user.createdAt,
    },
    tokens,
  };
}

