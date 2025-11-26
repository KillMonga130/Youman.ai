/**
 * Error Handler Middleware
 * Centralized error handling with proper error codes and messages
 * 
 * Requirements: 7.5 - Descriptive error messages with error codes
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../../utils/logger';
import { config } from '../../config/env';

/**
 * API Error class for structured error handling
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    details?: unknown,
    isOperational = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Create a 400 Bad Request error
   */
  static badRequest(message: string, code = 'BAD_REQUEST', details?: unknown): ApiError {
    return new ApiError(message, 400, code, details);
  }

  /**
   * Create a 401 Unauthorized error
   */
  static unauthorized(message: string, code = 'UNAUTHORIZED', details?: unknown): ApiError {
    return new ApiError(message, 401, code, details);
  }

  /**
   * Create a 403 Forbidden error
   */
  static forbidden(message: string, code = 'FORBIDDEN', details?: unknown): ApiError {
    return new ApiError(message, 403, code, details);
  }

  /**
   * Create a 404 Not Found error
   */
  static notFound(message: string, code = 'NOT_FOUND', details?: unknown): ApiError {
    return new ApiError(message, 404, code, details);
  }

  /**
   * Create a 409 Conflict error
   */
  static conflict(message: string, code = 'CONFLICT', details?: unknown): ApiError {
    return new ApiError(message, 409, code, details);
  }

  /**
   * Create a 422 Unprocessable Entity error
   */
  static unprocessableEntity(message: string, code = 'UNPROCESSABLE_ENTITY', details?: unknown): ApiError {
    return new ApiError(message, 422, code, details);
  }

  /**
   * Create a 429 Too Many Requests error
   */
  static tooManyRequests(message: string, code = 'RATE_LIMIT_EXCEEDED', details?: unknown): ApiError {
    return new ApiError(message, 429, code, details);
  }

  /**
   * Create a 500 Internal Server Error
   */
  static internal(message: string, code = 'INTERNAL_ERROR', details?: unknown): ApiError {
    return new ApiError(message, 500, code, details, false);
  }

  /**
   * Create a 503 Service Unavailable error
   */
  static serviceUnavailable(message: string, code = 'SERVICE_UNAVAILABLE', details?: unknown): ApiError {
    return new ApiError(message, 503, code, details);
  }
}

/**
 * Error response structure
 */
interface ErrorResponse {
  error: string;
  code: string;
  message: string;
  details?: unknown;
  requestId?: string | undefined;
  timestamp: string;
  path?: string | undefined;
  stack?: string | undefined;
}

/**
 * Format error response
 */
function formatErrorResponse(
  err: Error | ApiError,
  req: Request
): ErrorResponse {
  const isApiError = err instanceof ApiError;
  
  const response: ErrorResponse = {
    error: isApiError ? err.code : 'INTERNAL_ERROR',
    code: isApiError ? err.code : 'INTERNAL_ERROR',
    message: err.message || 'An unexpected error occurred',
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
    path: req.path,
  };

  // Include details if available
  if (isApiError && err.details) {
    response.details = err.details;
  }

  // Include stack trace in development
  if (config.isDevelopment && err.stack) {
    response.stack = err.stack;
  }

  return response;
}

/**
 * Handle Zod validation errors
 */
function handleZodError(err: ZodError): ApiError {
  const details = err.flatten().fieldErrors;
  return ApiError.badRequest(
    'Validation failed',
    'VALIDATION_ERROR',
    details
  );
}

/**
 * Handle JSON parsing errors
 */
function handleJsonError(err: SyntaxError): ApiError {
  return ApiError.badRequest(
    'Invalid JSON in request body',
    'INVALID_JSON',
    { originalError: err.message }
  );
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  const response: ErrorResponse = {
    error: 'NOT_FOUND',
    code: 'NOT_FOUND',
    message: `Cannot ${req.method} ${req.path}`,
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
    path: req.path,
  };

  res.status(404).json(response);
}

/**
 * Global error handler middleware
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Handle specific error types
  let apiError: ApiError;

  if (err instanceof ApiError) {
    apiError = err;
  } else if (err instanceof ZodError) {
    apiError = handleZodError(err);
  } else if (err instanceof SyntaxError && 'body' in err) {
    apiError = handleJsonError(err);
  } else {
    // Unknown error - treat as internal error
    apiError = ApiError.internal(
      config.isProduction ? 'An unexpected error occurred' : err.message
    );
  }

  // Log error
  if (apiError.statusCode >= 500) {
    logger.error('Server error', {
      requestId: req.requestId,
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  } else {
    logger.warn('Client error', {
      requestId: req.requestId,
      error: err.message,
      code: apiError.code,
      path: req.path,
      method: req.method,
    });
  }

  // Send error response
  const response = formatErrorResponse(apiError, req);
  res.status(apiError.statusCode).json(response);
}

/**
 * Async handler wrapper to catch async errors
 */
export function asyncHandler<T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
