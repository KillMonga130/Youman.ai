/**
 * API Gateway Tests
 * Tests for rate limiting, error handling, and security middleware
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { ApiError, asyncHandler } from './middleware/error-handler';
import { rateLimitConfigs, createRateLimiter } from './middleware/rate-limiter';

describe('API Gateway', () => {
  describe('ApiError', () => {
    it('should create a bad request error with correct properties', () => {
      const error = ApiError.badRequest('Invalid input', 'INVALID_INPUT', { field: 'email' });
      
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('INVALID_INPUT');
      expect(error.message).toBe('Invalid input');
      expect(error.details).toEqual({ field: 'email' });
      expect(error.isOperational).toBe(true);
    });

    it('should create an unauthorized error', () => {
      const error = ApiError.unauthorized('Invalid token');
      
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.message).toBe('Invalid token');
    });

    it('should create a forbidden error', () => {
      const error = ApiError.forbidden('Access denied');
      
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
      expect(error.message).toBe('Access denied');
    });

    it('should create a not found error', () => {
      const error = ApiError.notFound('Resource not found');
      
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toBe('Resource not found');
    });

    it('should create a conflict error', () => {
      const error = ApiError.conflict('Resource already exists');
      
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
      expect(error.message).toBe('Resource already exists');
    });

    it('should create a rate limit error with correct status code', () => {
      const error = ApiError.tooManyRequests('Rate limit exceeded');
      
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(error.message).toBe('Rate limit exceeded');
    });

    it('should create an internal error with isOperational false', () => {
      const error = ApiError.internal('Database connection failed');
      
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.isOperational).toBe(false);
    });

    it('should create a service unavailable error', () => {
      const error = ApiError.serviceUnavailable('Service temporarily unavailable');
      
      expect(error.statusCode).toBe(503);
      expect(error.code).toBe('SERVICE_UNAVAILABLE');
      expect(error.message).toBe('Service temporarily unavailable');
    });

    it('should be an instance of Error', () => {
      const error = ApiError.badRequest('Test error');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ApiError);
    });

    it('should have a stack trace', () => {
      const error = ApiError.badRequest('Test error');
      
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('error-handler');
    });
  });

  describe('Rate Limit Configurations', () => {
    it('should have standard rate limit config', () => {
      expect(rateLimitConfigs.standard).toBeDefined();
      expect(rateLimitConfigs.standard.windowMs).toBe(15 * 60 * 1000);
      expect(rateLimitConfigs.standard.max).toBe(100);
    });

    it('should have strict rate limit config for auth', () => {
      expect(rateLimitConfigs.strict).toBeDefined();
      expect(rateLimitConfigs.strict.windowMs).toBe(15 * 60 * 1000);
      expect(rateLimitConfigs.strict.max).toBe(20);
    });

    it('should have relaxed rate limit config', () => {
      expect(rateLimitConfigs.relaxed).toBeDefined();
      expect(rateLimitConfigs.relaxed.windowMs).toBe(15 * 60 * 1000);
      expect(rateLimitConfigs.relaxed.max).toBe(500);
    });

    it('should have transformation rate limit config', () => {
      expect(rateLimitConfigs.transformation).toBeDefined();
      expect(rateLimitConfigs.transformation.windowMs).toBe(60 * 60 * 1000);
      expect(rateLimitConfigs.transformation.max).toBe(50);
    });

    it('should create a rate limiter from config', () => {
      const limiter = createRateLimiter(rateLimitConfigs.standard);
      
      expect(limiter).toBeDefined();
      expect(typeof limiter).toBe('function');
    });
  });

  describe('asyncHandler', () => {
    it('should pass successful async function result', async () => {
      const mockReq = {} as Request;
      const mockRes = {
        json: (data: unknown) => data,
      } as unknown as Response;
      const mockNext = () => {};

      const asyncFn = async (_req: Request, res: Response) => {
        res.json({ success: true });
      };

      const handler = asyncHandler(asyncFn);
      
      // Should not throw
      await expect(
        new Promise<void>((resolve) => {
          handler(mockReq, mockRes, () => {
            resolve();
          });
          // Give it time to complete
          setTimeout(resolve, 100);
        })
      ).resolves.toBeUndefined();
    });

    it('should catch and forward async errors to next', async () => {
      const mockReq = {} as Request;
      const mockRes = {} as Response;
      const testError = new Error('Test async error');
      
      let caughtError: Error | null = null;
      const mockNext = (err?: Error) => {
        if (err) caughtError = err;
      };

      const asyncFn = async () => {
        throw testError;
      };

      const handler = asyncHandler(asyncFn);
      handler(mockReq, mockRes, mockNext);

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(caughtError).toBe(testError);
    });
  });

  describe('Error Response Format', () => {
    it('should include all required fields in error response', () => {
      const error = ApiError.badRequest('Test error', 'TEST_CODE', { extra: 'data' });
      
      // Verify error has all necessary properties for response formatting
      expect(error).toHaveProperty('message');
      expect(error).toHaveProperty('statusCode');
      expect(error).toHaveProperty('code');
      expect(error).toHaveProperty('details');
      expect(error).toHaveProperty('isOperational');
    });
  });
});
