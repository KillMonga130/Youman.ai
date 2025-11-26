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
  AuthError,
} from './auth.service';
import { authenticate } from './auth.middleware';
import { registerSchema, loginSchema, refreshTokenSchema, AuthMetadata } from './types';
import { logger } from '../utils/logger';

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

export { router as authRouter };
