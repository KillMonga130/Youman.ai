/**
 * Authentication Routes
 * Handles user registration, login, logout, and token refresh
 */

import { Router, Request, Response } from 'express';
import {
  register,
  login,
  logout,
  logoutAll,
  refreshAccessToken,
  updateUser,
  changePassword,
  deleteAccount,
  AuthError,
} from './auth.service';
import { authenticate } from './auth.middleware';
import { registerSchema, loginSchema, refreshTokenSchema, AuthMetadata } from './types';
import { logger } from '../utils/logger';
import { getOAuthUrl, authenticateOAuth, OAuthProvider } from './oauth.service';

const router = Router();

/**
 * POST /auth/register
 * Register a new user
 */
router.post('/register', (async (req: Request, res: Response) => {
  try {
    // Validate input
    const validationResult = registerSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validationResult.error.flatten().fieldErrors,
      });
      return;
    }

    const metadata: AuthMetadata = {
      ipAddress: req.ip ?? req.socket.remoteAddress ?? undefined,
      userAgent: req.get('user-agent') ?? undefined,
    };

    const result = await register(validationResult.data, metadata);

    res.status(201).json({
      message: 'Registration successful',
      ...result,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      const statusCode = error.code === 'EMAIL_EXISTS' ? 409 : 400;
      res.status(statusCode).json({
        error: error.message,
        code: error.code,
      });
      return;
    }
    logger.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      code: 'INTERNAL_ERROR',
    });
  }
}) as unknown as Router);


/**
 * POST /auth/login
 * Login a user
 */
router.post('/login', (async (req: Request, res: Response) => {
  try {
    // Validate input
    const validationResult = loginSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validationResult.error.flatten().fieldErrors,
      });
      return;
    }

    const metadata: AuthMetadata = {
      ipAddress: req.ip ?? req.socket.remoteAddress ?? undefined,
      userAgent: req.get('user-agent') ?? undefined,
    };

    const result = await login(validationResult.data, metadata);

    res.status(200).json({
      message: 'Login successful',
      ...result,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      res.status(401).json({
        error: error.message,
        code: error.code,
      });
      return;
    }
    logger.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      code: 'INTERNAL_ERROR',
    });
  }
}) as unknown as Router);

/**
 * POST /auth/logout
 * Logout current session
 */
router.post('/logout', authenticate, (async (req: Request, res: Response) => {
  try {
    if (!req.sessionId) {
      res.status(400).json({
        error: 'No active session',
        code: 'NO_SESSION',
      });
      return;
    }

    await logout(req.sessionId);

    res.status(200).json({
      message: 'Logout successful',
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      code: 'INTERNAL_ERROR',
    });
  }
}) as unknown as Router);

/**
 * POST /auth/logout-all
 * Logout all sessions for the current user
 */
router.post('/logout-all', authenticate, (async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(400).json({
        error: 'No authenticated user',
        code: 'NO_USER',
      });
      return;
    }

    await logoutAll(req.user.id);

    res.status(200).json({
      message: 'All sessions logged out successfully',
    });
  } catch (error) {
    logger.error('Logout all error:', error);
    res.status(500).json({
      error: 'Logout failed',
      code: 'INTERNAL_ERROR',
    });
  }
}) as unknown as Router);


/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', (async (req: Request, res: Response) => {
  try {
    // Validate input
    const validationResult = refreshTokenSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validationResult.error.flatten().fieldErrors,
      });
      return;
    }

    const tokens = await refreshAccessToken(validationResult.data.refreshToken);

    res.status(200).json({
      message: 'Token refreshed successfully',
      tokens,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      res.status(401).json({
        error: error.message,
        code: error.code,
      });
      return;
    }
    logger.error('Token refresh error:', error);
    res.status(500).json({
      error: 'Token refresh failed',
      code: 'INTERNAL_ERROR',
    });
  }
}) as unknown as Router);

/**
 * GET /auth/me
 * Get current authenticated user
 */
router.get('/me', authenticate, ((req: Request, res: Response) => {
  res.status(200).json({
    user: req.user,
  });
}) as unknown as Router);

/**
 * PUT /auth/me
 * Update current authenticated user
 */
router.put('/me', authenticate, (async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED',
      });
      return;
    }

    const { firstName, lastName, email } = req.body;
    const updateData: { firstName?: string; lastName?: string; email?: string } = {};
    
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email;

    const updatedUser = await updateUser(req.user.id, updateData);

    res.status(200).json({
      user: updatedUser,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      const statusCode = error.code === 'EMAIL_EXISTS' ? 409 : 400;
      res.status(statusCode).json({
        error: error.message,
        code: error.code,
      });
      return;
    }
    logger.error('Update user error:', error);
    res.status(500).json({
      error: 'Failed to update user',
      code: 'INTERNAL_ERROR',
    });
  }
}) as unknown as Router);

/**
 * POST /auth/change-password
 * Change user password
 */
router.post('/change-password', authenticate, (async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED',
      });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        error: 'Current password and new password are required',
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({
        error: 'New password must be at least 8 characters long',
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    await changePassword(req.user.id, currentPassword, newPassword);

    res.status(200).json({
      message: 'Password changed successfully',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      res.status(400).json({
        error: error.message,
        code: error.code,
      });
      return;
    }
    logger.error('Change password error:', error);
    res.status(500).json({
      error: 'Failed to change password',
      code: 'INTERNAL_ERROR',
    });
  }
}) as unknown as Router);

/**
 * DELETE /auth/account
 * Permanently delete user account
 */
router.delete('/account', authenticate, (async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED',
      });
      return;
    }

    const { password } = req.body;

    await deleteAccount(req.user.id, password);

    res.status(200).json({
      message: 'Account deleted successfully',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      const statusCode = error.code === 'INVALID_PASSWORD' || error.code === 'PASSWORD_REQUIRED' ? 400 : 401;
      res.status(statusCode).json({
        error: error.message,
        code: error.code,
      });
      return;
    }
    logger.error('Delete account error:', error);
    res.status(500).json({
      error: 'Failed to delete account',
      code: 'INTERNAL_ERROR',
    });
  }
}) as unknown as Router);

// ============================================
// OAuth Routes
// ============================================

/**
 * GET /auth/oauth/:provider
 * Get OAuth authorization URL
 */
router.get('/oauth/:provider', (async (req: Request, res: Response) => {
  try {
    const provider = req.params.provider.toUpperCase() as OAuthProvider;
    
    if (!Object.values(OAuthProvider).includes(provider)) {
      res.status(400).json({
        error: 'Invalid OAuth provider',
        code: 'INVALID_PROVIDER',
      });
      return;
    }

    const redirectUri = req.query.redirect_uri as string;
    if (!redirectUri) {
      res.status(400).json({
        error: 'Redirect URI is required',
        code: 'MISSING_REDIRECT_URI',
      });
      return;
    }

    const state = req.query.state as string || require('crypto').randomBytes(32).toString('hex');
    const url = getOAuthUrl(provider, redirectUri, state);

    res.json({
      url,
      state,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      res.status(400).json({
        error: error.message,
        code: error.code,
      });
      return;
    }
    logger.error('OAuth URL error:', error);
    res.status(500).json({
      error: 'Failed to generate OAuth URL',
      code: 'INTERNAL_ERROR',
    });
  }
}) as unknown as Router);

/**
 * POST /auth/oauth/:provider/callback
 * Handle OAuth callback
 */
router.post('/oauth/:provider/callback', (async (req: Request, res: Response) => {
  try {
    const provider = req.params.provider.toUpperCase() as OAuthProvider;
    
    if (!Object.values(OAuthProvider).includes(provider)) {
      res.status(400).json({
        error: 'Invalid OAuth provider',
        code: 'INVALID_PROVIDER',
      });
      return;
    }

    const { code, redirect_uri, state } = req.body;

    if (!code || !redirect_uri) {
      res.status(400).json({
        error: 'Code and redirect URI are required',
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    const metadata: AuthMetadata = {
      ipAddress: req.ip ?? req.socket.remoteAddress ?? undefined,
      userAgent: req.get('user-agent') ?? undefined,
    };

    const result = await authenticateOAuth(provider, code, redirect_uri, metadata);

    res.status(200).json({
      message: 'OAuth authentication successful',
      ...result,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      res.status(401).json({
        error: error.message,
        code: error.code,
      });
      return;
    }
    logger.error('OAuth callback error:', error);
    res.status(500).json({
      error: 'OAuth authentication failed',
      code: 'INTERNAL_ERROR',
    });
  }
}) as unknown as Router);

export { router as authRouter };
