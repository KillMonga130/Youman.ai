/**
 * Security Middleware
 * Configures CORS, security headers, and other security measures
 * 
 * Requirements: 7, 84 - API security with proper headers
 */

import cors, { CorsOptions } from 'cors';
import helmet, { HelmetOptions } from 'helmet';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { config } from '../../config/env';
import { logger } from '../../utils/logger';

/**
 * CORS configuration
 */
export function createCorsMiddleware(): RequestHandler {
  const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) {
        callback(null, true);
        return;
      }

      // Check if origin is in allowed list
      if (config.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      // In development, allow localhost origins
      if (config.isDevelopment && origin.includes('localhost')) {
        callback(null, true);
        return;
      }

      logger.warn('CORS blocked request from origin', { origin });
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-API-Key',
      'X-Request-ID',
      'X-Requested-With',
    ],
    exposedHeaders: [
      'X-Request-ID',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'RateLimit-Limit',
      'RateLimit-Remaining',
      'RateLimit-Reset',
      'Retry-After',
    ],
    maxAge: 86400, // 24 hours
  };

  return cors(corsOptions);
}

/**
 * Helmet security headers configuration
 */
export function createHelmetMiddleware(): RequestHandler {
  const helmetOptions: HelmetOptions = {
    // Content Security Policy
    contentSecurityPolicy: config.isProduction ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    } : false, // Disable CSP in development for easier debugging
    
    // Cross-Origin settings
    crossOriginEmbedderPolicy: false, // Disable for API
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    
    // DNS Prefetch Control
    dnsPrefetchControl: { allow: false },
    
    // Frameguard - prevent clickjacking
    frameguard: { action: 'deny' },
    
    // Hide X-Powered-By header
    hidePoweredBy: true,
    
    // HSTS - HTTP Strict Transport Security
    hsts: config.isProduction ? {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    } : false,
    
    // IE No Open
    ieNoOpen: true,
    
    // No Sniff - prevent MIME type sniffing
    noSniff: true,
    
    // Origin Agent Cluster
    originAgentCluster: true,
    
    // Permitted Cross-Domain Policies
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    
    // Referrer Policy
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    
    // XSS Filter
    xssFilter: true,
  };

  return helmet(helmetOptions);
}

/**
 * API Key validation middleware
 * Validates API key for programmatic access
 */
export function validateApiKey(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'];

  // Skip API key validation for browser requests with JWT auth
  if (req.headers.authorization?.startsWith('Bearer ')) {
    next();
    return;
  }

  // For API routes that require API key
  if (!apiKey) {
    // Allow requests without API key for public endpoints
    next();
    return;
  }

  // Validate API key format (basic validation)
  if (typeof apiKey !== 'string' || apiKey.length < 32) {
    res.status(401).json({
      error: 'Invalid API key',
      code: 'INVALID_API_KEY',
    });
    return;
  }

  // TODO: Validate API key against database
  // For now, attach API key to request for downstream use
  (req as Request & { apiKey?: string }).apiKey = apiKey;
  
  next();
}

/**
 * Security headers middleware
 * Adds additional security headers not covered by Helmet
 */
export function additionalSecurityHeaders(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  // Prevent caching of sensitive data
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');

  // Additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  next();
}

/**
 * Request sanitization middleware
 * Sanitizes request data to prevent injection attacks
 */
export function sanitizeRequest(req: Request, _res: Response, next: NextFunction): void {
  // Sanitize query parameters
  if (req.query) {
    for (const key of Object.keys(req.query)) {
      const value = req.query[key];
      if (typeof value === 'string') {
        // Remove potential script tags and SQL injection patterns
        req.query[key] = value
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/['";]/g, '');
      }
    }
  }

  next();
}

/**
 * Combined security middleware
 */
export const corsMiddleware = createCorsMiddleware();
export const helmetMiddleware = createHelmetMiddleware();
