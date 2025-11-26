/**
 * Rate Limiting Middleware
 * Implements API rate limiting with proper HTTP 429 responses and retry-after headers
 * 
 * Requirements: 7.4 - Rate limits with HTTP 429 status and retry-after headers
 */

import rateLimit, { RateLimitRequestHandler, Options } from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '../../utils/logger';

/**
 * Rate limit configuration by tier
 */
export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
}

/**
 * Default rate limit configurations
 */
export const rateLimitConfigs = {
  // Standard API rate limit
  standard: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: 'Too many requests, please try again later.',
  },
  // Strict rate limit for sensitive endpoints (auth)
  strict: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    message: 'Too many authentication attempts, please try again later.',
  },
  // Relaxed rate limit for read-only endpoints
  relaxed: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500,
    message: 'Too many requests, please try again later.',
  },
  // Transformation endpoint rate limit
  transformation: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50,
    message: 'Transformation rate limit exceeded, please try again later.',
  },
} as const;

/**
 * Custom key generator for rate limiting
 * Uses API key if present, otherwise falls back to IP
 */
function keyGenerator(req: Request): string {
  // Check for API key in header
  const apiKey = req.headers['x-api-key'];
  if (apiKey && typeof apiKey === 'string') {
    return `api:${apiKey}`;
  }
  
  // Fall back to IP address
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  return `ip:${ip}`;
}

/**
 * Custom handler for rate limit exceeded
 * Returns HTTP 429 with retry-after header
 */
function rateLimitHandler(req: Request, res: Response): void {
  const retryAfter = Math.ceil((res.getHeader('X-RateLimit-Reset') as number - Date.now()) / 1000);
  
  logger.warn('Rate limit exceeded', {
    ip: req.ip,
    path: req.path,
    method: req.method,
    key: keyGenerator(req),
  });

  res.status(429).json({
    error: 'Too many requests',
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'You have exceeded the rate limit. Please try again later.',
    retryAfter: retryAfter > 0 ? retryAfter : 60,
  });
}

/**
 * Skip rate limiting for certain conditions
 */
function skipRateLimit(req: Request): boolean {
  // Skip rate limiting for health checks
  if (req.path === '/health' || req.path === '/api/v1/health') {
    return true;
  }
  return false;
}

/**
 * Create a rate limiter with custom configuration
 */
export function createRateLimiter(config: RateLimitConfig): RateLimitRequestHandler {
  const options: Partial<Options> = {
    windowMs: config.windowMs,
    max: config.max,
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: true, // Also return `X-RateLimit-*` headers for compatibility
    keyGenerator,
    handler: rateLimitHandler,
    skip: skipRateLimit,
    message: {
      error: 'Too many requests',
      code: 'RATE_LIMIT_EXCEEDED',
      message: config.message,
    },
  };

  return rateLimit(options);
}

/**
 * Standard API rate limiter
 */
export const standardRateLimiter = createRateLimiter(rateLimitConfigs.standard);

/**
 * Strict rate limiter for authentication endpoints
 */
export const strictRateLimiter = createRateLimiter(rateLimitConfigs.strict);

/**
 * Relaxed rate limiter for read-only endpoints
 */
export const relaxedRateLimiter = createRateLimiter(rateLimitConfigs.relaxed);

/**
 * Transformation rate limiter
 */
export const transformationRateLimiter = createRateLimiter(rateLimitConfigs.transformation);
