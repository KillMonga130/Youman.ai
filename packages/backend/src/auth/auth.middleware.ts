/**
 * Authentication Middleware
 * Protects routes by validating JWT tokens and sessions
 */

import { Request, Response, NextFunction } from 'express';
import { verifyToken, validateSession, getUserById, AuthError } from './auth.service';
import type { AuthUser, JWTPayload } from './types';
import { logger } from '../utils/logger';

// Extend Express Request type to include auth info
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      sessionId?: string;
      token?: JWTPayload;
    }
  }
}

/**
 * Extract bearer token from Authorization header
 */
function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

/**
 * Authentication middleware - requires valid JWT token
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    res.status(401).json({
      error: 'Authentication required',
      code: 'NO_TOKEN',
    });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({
      error: 'Invalid or expired token',
      code: 'INVALID_TOKEN',
    });
    return;
  }

  if (payload.type !== 'access') {
    res.status(401).json({
      error: 'Invalid token type',
      code: 'INVALID_TOKEN_TYPE',
    });
    return;
  }


  // Validate session
  validateSession(payload.sessionId)
    .then(async (session) => {
      if (!session) {
        res.status(401).json({
          error: 'Session expired or revoked',
          code: 'SESSION_EXPIRED',
        });
        return;
      }

      // Get user
      const user = await getUserById(payload.userId);
      if (!user) {
        res.status(401).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        });
        return;
      }

      // Attach auth info to request
      req.user = user;
      req.sessionId = payload.sessionId;
      req.token = payload;

      next();
    })
    .catch((error) => {
      logger.error('Authentication error:', error);
      res.status(500).json({
        error: 'Authentication failed',
        code: 'AUTH_ERROR',
      });
    });
}

/**
 * Optional authentication middleware - attaches user if token is valid, but doesn't require it
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    next();
    return;
  }

  const payload = verifyToken(token);
  if (!payload || payload.type !== 'access') {
    next();
    return;
  }

  validateSession(payload.sessionId)
    .then(async (session) => {
      if (!session) {
        next();
        return;
      }

      const user = await getUserById(payload.userId);
      if (user) {
        req.user = user;
        req.sessionId = payload.sessionId;
        req.token = payload;
      }

      next();
    })
    .catch(() => {
      // Silently continue without auth on error
      next();
    });
}

/**
 * Admin role middleware - requires user to be an admin
 * Admin users are configured via ADMIN_EMAILS environment variable
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      error: 'Authentication required',
      code: 'NO_AUTH',
    });
    return;
  }

  // Get admin emails from environment variable (comma-separated)
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
  
  // Check if user's email is in the admin list
  const isAdmin = adminEmails.includes(req.user.email.toLowerCase());

  if (!isAdmin) {
    res.status(403).json({
      error: 'Admin access required',
      code: 'FORBIDDEN',
    });
    return;
  }

  next();
}

/**
 * Authenticated request type for routes that require authentication
 */
export interface AuthenticatedRequest extends Request {
  user: AuthUser;
  sessionId: string;
  token: JWTPayload;
}

/**
 * Auth middleware alias for backward compatibility
 */
export const authMiddleware = authenticate;

/**
 * Error handler for auth errors
 */
export function handleAuthError(
  err: Error,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof AuthError) {
    const statusCode = getStatusCodeForAuthError(err.code);
    res.status(statusCode).json({
      error: err.message,
      code: err.code,
    });
    return;
  }
  next(err);
}

/**
 * Map auth error codes to HTTP status codes
 */
function getStatusCodeForAuthError(code: string): number {
  switch (code) {
    case 'EMAIL_EXISTS':
      return 409;
    case 'INVALID_CREDENTIALS':
    case 'INVALID_TOKEN':
    case 'INVALID_TOKEN_TYPE':
    case 'SESSION_EXPIRED':
    case 'USER_NOT_FOUND':
      return 401;
    case 'ACCOUNT_DELETED':
      return 403;
    default:
      return 400;
  }
}
