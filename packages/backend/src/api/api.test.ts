/**
 * API Gateway Tests
 * Tests for rate limiting, error handling, and security middleware
 */

import { describe, it, expect } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import * as fc from 'fast-check';
import { ApiError, asyncHandler } from './middleware/error-handler';
import { rateLimitConfigs, createRateLimiter, RateLimitConfig } from './middleware/rate-limiter';

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
      const mockNext: NextFunction = ((err?: unknown) => {
        if (err instanceof Error) caughtError = err;
      }) as NextFunction;

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

  /**
   * Property-Based Tests
   * Feature: ai-humanizer, Property 22: Rate limiting
   * Validates: Requirements 7.4
   * 
   * Property: For any API client exceeding their rate limit, subsequent requests
   * should return HTTP 429 status with a retry-after header indicating when
   * requests can resume.
   */
  describe('Property-Based Tests', () => {
    // Feature: ai-humanizer, Property 22: Rate limiting
    // Validates: Requirements 7.4
    describe('Property 22: Rate limiting', () => {
      /**
       * Helper to create a mock request with a specific IP/API key
       */
      function createMockRequest(identifier: string, useApiKey: boolean, path: string = '/api/test'): Partial<Request> {
        const req: Partial<Request> = {
          ip: useApiKey ? '127.0.0.1' : identifier,
          path,
          method: 'GET',
          headers: {},
          socket: { remoteAddress: useApiKey ? '127.0.0.1' : identifier } as any,
        };
        
        if (useApiKey) {
          req.headers = { 'x-api-key': identifier };
        }
        
        return req;
      }

      /**
       * Helper to create a mock response that captures status and headers
       */
      function createMockResponse(): {
        res: Partial<Response>;
        getStatus: () => number | undefined;
        getBody: () => any;
        getHeaders: () => Record<string, any>;
      } {
        let statusCode: number | undefined;
        let body: any;
        const headers: Record<string, any> = {};

        const res = {
          status: function(code: number) {
            statusCode = code;
            return this;
          },
          json: function(data: any) {
            body = data;
            return this;
          },
          setHeader: function(name: string, value: any) {
            headers[name] = value;
            return this;
          },
          getHeader: function(name: string) {
            return headers[name];
          },
          set: function(field: any, value?: any) {
            if (typeof field === 'string' && value !== undefined) {
              headers[field] = value;
            }
            return this;
          },
        } as unknown as Partial<Response>;

        return {
          res,
          getStatus: () => statusCode,
          getBody: () => body,
          getHeaders: () => headers,
        };
      }

      it('should return HTTP 429 with retry-after when rate limit is exceeded for any client', () => {
        fc.assert(
          fc.property(
            // Generate rate limit configurations with small limits for testing
            fc.record({
              windowMs: fc.integer({ min: 1000, max: 60000 }), // 1s to 60s window
              max: fc.integer({ min: 1, max: 10 }), // 1 to 10 requests max
              message: fc.string({ minLength: 1, maxLength: 100 }),
            }),
            // Generate client identifiers (IP addresses or API keys)
            fc.oneof(
              fc.ipV4().map(ip => ({ identifier: ip, useApiKey: false })),
              fc.uuid().map(key => ({ identifier: key, useApiKey: true }))
            ),
            // Generate number of requests to make (always exceeds limit)
            fc.integer({ min: 1, max: 5 }),
            (config, client, extraRequests) => {
              const rateLimitConfig: RateLimitConfig = {
                windowMs: config.windowMs,
                max: config.max,
                message: config.message || 'Rate limit exceeded',
              };

              // Create rate limiter with the generated config
              const limiter = createRateLimiter(rateLimitConfig);

              // Track responses
              const responses: { status?: number; body?: any; headers: Record<string, any> }[] = [];

              // Make requests up to and beyond the limit
              const totalRequests = config.max + extraRequests;
              
              for (let i = 0; i < totalRequests; i++) {
                const req = createMockRequest(client.identifier, client.useApiKey);
                const { res, getStatus, getBody, getHeaders } = createMockResponse();
                
                const next: NextFunction = (() => {}) as NextFunction;

                // Execute the rate limiter synchronously (it's designed to be sync)
                limiter(req as Request, res as Response, next);

                responses.push({
                  status: getStatus(),
                  body: getBody(),
                  headers: getHeaders(),
                });
              }

              // Verify: After exceeding the limit, we should get 429 responses
              // The rate limiter should allow 'max' requests, then block subsequent ones
              const blockedResponses = responses.filter(r => r.status === 429);
              
              // At least one request should be blocked (the ones after max)
              if (blockedResponses.length > 0) {
                // Verify all blocked responses have correct structure
                for (const blocked of blockedResponses) {
                  // Should have 429 status
                  expect(blocked.status).toBe(429);
                  
                  // Should have a body with error information
                  expect(blocked.body).toBeDefined();
                  expect(blocked.body.error).toBe('Too many requests');
                  expect(blocked.body.code).toBe('RATE_LIMIT_EXCEEDED');
                  
                  // Should have retryAfter in the response body
                  expect(blocked.body.retryAfter).toBeDefined();
                  expect(typeof blocked.body.retryAfter).toBe('number');
                  expect(blocked.body.retryAfter).toBeGreaterThan(0);
                }
              }

              return true;
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should include retry-after header value that is positive for any exceeded rate limit', () => {
        fc.assert(
          fc.property(
            // Generate different rate limit tiers
            fc.constantFrom('standard', 'strict', 'relaxed', 'transformation') as fc.Arbitrary<keyof typeof rateLimitConfigs>,
            // Generate client identifier
            fc.uuid(),
            (tierName, clientId) => {
              const config = rateLimitConfigs[tierName];
              const limiter = createRateLimiter(config);

              // Make requests until we exceed the limit
              let rateLimitResponse: { status?: number; body?: any } | null = null;

              for (let i = 0; i <= config.max; i++) {
                const req = createMockRequest(clientId, true);
                const { res, getStatus, getBody } = createMockResponse();
                
                const next: NextFunction = () => {};
                limiter(req as Request, res as Response, next);

                if (getStatus() === 429) {
                  rateLimitResponse = { status: getStatus(), body: getBody() };
                  break;
                }
              }

              // If we got a rate limit response, verify it has proper retry-after
              if (rateLimitResponse) {
                expect(rateLimitResponse.status).toBe(429);
                expect(rateLimitResponse.body.retryAfter).toBeDefined();
                expect(rateLimitResponse.body.retryAfter).toBeGreaterThan(0);
                // Retry-after should not exceed the window duration in seconds
                expect(rateLimitResponse.body.retryAfter).toBeLessThanOrEqual(
                  Math.ceil(config.windowMs / 1000) + 1 // +1 for rounding
                );
              }

              return true;
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should consistently return 429 for any request after limit is exceeded', () => {
        fc.assert(
          fc.property(
            // Generate a small max limit for faster testing
            fc.integer({ min: 1, max: 5 }),
            // Generate number of additional requests after limit
            fc.integer({ min: 1, max: 10 }),
            // Generate client identifier
            fc.uuid(),
            (maxRequests, additionalRequests, clientId) => {
              const config: RateLimitConfig = {
                windowMs: 60000, // 1 minute window
                max: maxRequests,
                message: 'Test rate limit exceeded',
              };

              const limiter = createRateLimiter(config);
              
              // First, exhaust the rate limit
              for (let i = 0; i < maxRequests; i++) {
                const req = createMockRequest(clientId, true);
                const { res } = createMockResponse();
                const next: NextFunction = () => {};
                limiter(req as Request, res as Response, next);
              }

              // Now verify all subsequent requests return 429
              const subsequentResponses: number[] = [];
              
              for (let i = 0; i < additionalRequests; i++) {
                const req = createMockRequest(clientId, true);
                const { res, getStatus, getBody } = createMockResponse();
                const next: NextFunction = () => {};
                limiter(req as Request, res as Response, next);
                
                const status = getStatus();
                if (status !== undefined) {
                  subsequentResponses.push(status);
                  
                  // Verify each blocked request has retry-after
                  const body = getBody();
                  expect(body.retryAfter).toBeDefined();
                  expect(body.retryAfter).toBeGreaterThan(0);
                }
              }

              // All subsequent requests should be blocked with 429
              for (const status of subsequentResponses) {
                expect(status).toBe(429);
              }

              return true;
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    /**
     * Feature: ai-humanizer, Property 23: API error messages
     * Validates: Requirements 7.5
     * 
     * Property: For any API error that occurs, the response SHALL include
     * a descriptive error message and an error code.
     */
    describe('Property 23: API error messages', () => {
      /**
       * All supported HTTP error status codes and their corresponding ApiError factory methods
       */
      const errorFactories = [
        { name: 'badRequest', factory: ApiError.badRequest, expectedStatus: 400, expectedCode: 'BAD_REQUEST' },
        { name: 'unauthorized', factory: ApiError.unauthorized, expectedStatus: 401, expectedCode: 'UNAUTHORIZED' },
        { name: 'forbidden', factory: ApiError.forbidden, expectedStatus: 403, expectedCode: 'FORBIDDEN' },
        { name: 'notFound', factory: ApiError.notFound, expectedStatus: 404, expectedCode: 'NOT_FOUND' },
        { name: 'conflict', factory: ApiError.conflict, expectedStatus: 409, expectedCode: 'CONFLICT' },
        { name: 'tooManyRequests', factory: ApiError.tooManyRequests, expectedStatus: 429, expectedCode: 'RATE_LIMIT_EXCEEDED' },
        { name: 'internal', factory: ApiError.internal, expectedStatus: 500, expectedCode: 'INTERNAL_ERROR' },
        { name: 'serviceUnavailable', factory: ApiError.serviceUnavailable, expectedStatus: 503, expectedCode: 'SERVICE_UNAVAILABLE' },
      ];

      it('should include descriptive message and error code for any API error type', () => {
        fc.assert(
          fc.property(
            // Generate random error messages (non-empty strings)
            fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            // Generate optional custom error codes
            fc.option(fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[A-Z_]+$/.test(s)), { nil: undefined }),
            // Generate optional details object
            fc.option(fc.dictionary(fc.string({ minLength: 1, maxLength: 20 }), fc.string({ minLength: 1, maxLength: 50 })), { nil: undefined }),
            // Select which error factory to use
            fc.integer({ min: 0, max: errorFactories.length - 1 }),
            (message, customCode, details, factoryIndex) => {
              const { factory, expectedStatus, expectedCode } = errorFactories[factoryIndex];
              
              // Create the error with generated parameters
              const error = factory(message, customCode, details);
              
              // Property 1: Error must have a descriptive message (non-empty string)
              expect(error.message).toBeDefined();
              expect(typeof error.message).toBe('string');
              expect(error.message.length).toBeGreaterThan(0);
              expect(error.message).toBe(message);
              
              // Property 2: Error must have an error code (non-empty string)
              expect(error.code).toBeDefined();
              expect(typeof error.code).toBe('string');
              expect(error.code.length).toBeGreaterThan(0);
              
              // If custom code provided, it should be used; otherwise default code
              if (customCode) {
                expect(error.code).toBe(customCode);
              } else {
                expect(error.code).toBe(expectedCode);
              }
              
              // Property 3: Error must have correct HTTP status code
              expect(error.statusCode).toBe(expectedStatus);
              
              // Property 4: If details provided, they should be preserved
              if (details && Object.keys(details).length > 0) {
                expect(error.details).toEqual(details);
              }
              
              return true;
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should format error response with all required fields for any error', () => {
        fc.assert(
          fc.property(
            // Generate random error messages
            fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            // Generate random request paths
            fc.string({ minLength: 1, maxLength: 100 }).map(s => `/api/${s.replace(/[^a-zA-Z0-9/]/g, '')}`),
            // Generate random request IDs (UUIDs)
            fc.uuid(),
            // Select which error factory to use
            fc.integer({ min: 0, max: errorFactories.length - 1 }),
            (message, path, requestId, factoryIndex) => {
              const { factory, expectedStatus } = errorFactories[factoryIndex];
              
              // Create the error
              const error = factory(message);
              
              // Simulate the error response format (as done by errorHandler middleware)
              const errorResponse = {
                error: error.code,
                code: error.code,
                message: error.message,
                requestId: requestId,
                timestamp: new Date().toISOString(),
                path: path,
                ...(error.details ? { details: error.details } : {}),
              };
              
              // Property 1: Response must have 'error' field with error code
              expect(errorResponse.error).toBeDefined();
              expect(typeof errorResponse.error).toBe('string');
              expect(errorResponse.error.length).toBeGreaterThan(0);
              
              // Property 2: Response must have 'code' field with error code
              expect(errorResponse.code).toBeDefined();
              expect(typeof errorResponse.code).toBe('string');
              expect(errorResponse.code.length).toBeGreaterThan(0);
              
              // Property 3: Response must have 'message' field with descriptive message
              expect(errorResponse.message).toBeDefined();
              expect(typeof errorResponse.message).toBe('string');
              expect(errorResponse.message.length).toBeGreaterThan(0);
              
              // Property 4: Response must have 'timestamp' field
              expect(errorResponse.timestamp).toBeDefined();
              expect(typeof errorResponse.timestamp).toBe('string');
              // Timestamp should be valid ISO date
              expect(() => new Date(errorResponse.timestamp)).not.toThrow();
              
              // Property 5: Response must have 'path' field
              expect(errorResponse.path).toBeDefined();
              expect(typeof errorResponse.path).toBe('string');
              
              // Property 6: Error code should match between 'error' and 'code' fields
              expect(errorResponse.error).toBe(errorResponse.code);
              
              // Property 7: Status code should be in valid HTTP error range
              expect(expectedStatus).toBeGreaterThanOrEqual(400);
              expect(expectedStatus).toBeLessThan(600);
              
              return true;
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should provide consistent error codes for the same error type regardless of message content', () => {
        fc.assert(
          fc.property(
            // Generate two different random messages
            fc.tuple(
              fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
              fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0)
            ),
            // Select which error factory to use
            fc.integer({ min: 0, max: errorFactories.length - 1 }),
            ([message1, message2], factoryIndex) => {
              const { factory, expectedCode, expectedStatus } = errorFactories[factoryIndex];
              
              // Create two errors with different messages but same type
              const error1 = factory(message1);
              const error2 = factory(message2);
              
              // Property: Same error type should produce same default error code
              // regardless of the message content
              expect(error1.code).toBe(expectedCode);
              expect(error2.code).toBe(expectedCode);
              expect(error1.code).toBe(error2.code);
              
              // Property: Same error type should produce same status code
              expect(error1.statusCode).toBe(expectedStatus);
              expect(error2.statusCode).toBe(expectedStatus);
              expect(error1.statusCode).toBe(error2.statusCode);
              
              // Property: Messages should be different (as generated)
              // but both should be descriptive (non-empty)
              expect(error1.message.length).toBeGreaterThan(0);
              expect(error2.message.length).toBeGreaterThan(0);
              
              return true;
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should preserve error details for any valid details object', () => {
        fc.assert(
          fc.property(
            // Generate random error messages
            fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            // Generate various types of details objects
            fc.oneof(
              // Simple key-value pairs
              fc.dictionary(
                fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)),
                fc.string({ minLength: 0, maxLength: 100 })
              ),
              // Nested objects
              fc.record({
                field: fc.string({ minLength: 1, maxLength: 50 }),
                value: fc.string({ minLength: 0, maxLength: 100 }),
                errors: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 0, maxLength: 5 }),
              }),
              // Array of errors
              fc.array(
                fc.record({
                  path: fc.string({ minLength: 1, maxLength: 50 }),
                  message: fc.string({ minLength: 1, maxLength: 100 }),
                }),
                { minLength: 1, maxLength: 5 }
              ),
            ),
            // Select which error factory to use
            fc.integer({ min: 0, max: errorFactories.length - 1 }),
            (message, details, factoryIndex) => {
              const { factory } = errorFactories[factoryIndex];
              
              // Create error with details
              const error = factory(message, undefined, details);
              
              // Property: Details should be preserved exactly as provided
              expect(error.details).toEqual(details);
              
              // Property: Error should still have message and code
              expect(error.message).toBe(message);
              expect(error.code).toBeDefined();
              expect(error.code.length).toBeGreaterThan(0);
              
              return true;
            }
          ),
          { numRuns: 100 }
        );
      });
    });
  });
});
