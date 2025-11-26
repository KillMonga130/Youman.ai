/**
 * Request/Response Logging Middleware
 * Comprehensive logging for API requests and responses
 * 
 * Requirements: 7 - API integration with proper logging
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger';

// Extend Express Request to include request ID
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: number;
    }
  }
}

/**
 * Sensitive headers that should be redacted in logs
 */
const SENSITIVE_HEADERS = [
  'authorization',
  'x-api-key',
  'cookie',
  'set-cookie',
];

/**
 * Sensitive body fields that should be redacted in logs
 */
const SENSITIVE_BODY_FIELDS = [
  'password',
  'token',
  'refreshToken',
  'apiKey',
  'secret',
  'creditCard',
];

/**
 * Redact sensitive information from headers
 * @internal Used for debug logging when needed
 */
function _redactHeaders(headers: Record<string, unknown>): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(headers)) {
    if (SENSITIVE_HEADERS.includes(key.toLowerCase())) {
      redacted[key] = '[REDACTED]';
    } else {
      redacted[key] = value;
    }
  }
  
  return redacted;
}

// Export for potential future use
export { _redactHeaders as redactHeaders };

/**
 * Redact sensitive information from body
 */
function redactBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') {
    return body;
  }

  if (Array.isArray(body)) {
    return body.map(redactBody);
  }

  const redacted: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (SENSITIVE_BODY_FIELDS.includes(key)) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactBody(value);
    } else {
      redacted[key] = value;
    }
  }
  
  return redacted;
}

/**
 * Get content length from response
 */
function getContentLength(res: Response): number | undefined {
  const contentLength = res.getHeader('content-length');
  if (typeof contentLength === 'string') {
    return parseInt(contentLength, 10);
  }
  if (typeof contentLength === 'number') {
    return contentLength;
  }
  return undefined;
}

/**
 * Request logging middleware
 * Logs incoming requests with unique request ID
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  // Generate unique request ID
  const requestId = uuidv4();
  req.requestId = requestId;
  req.startTime = Date.now();

  // Add request ID to response headers
  res.setHeader('X-Request-ID', requestId);

  // Log incoming request
  logger.info('Incoming request', {
    requestId,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
    contentType: req.get('content-type'),
    contentLength: req.get('content-length'),
  });

  // Log request body for non-GET requests (with sensitive data redacted)
  if (req.method !== 'GET' && req.body && Object.keys(req.body).length > 0) {
    logger.debug('Request body', {
      requestId,
      body: redactBody(req.body),
    });
  }

  next();
}

/**
 * Response logging middleware
 * Logs outgoing responses with timing information
 */
export function responseLogger(req: Request, res: Response, next: NextFunction): void {
  // Store original end function
  const originalEnd = res.end.bind(res);
  
  // Track if we've already logged this response
  let logged = false;
  
  // Override end function to log response
  res.end = function(
    chunk?: Buffer | string | (() => void),
    encodingOrCallback?: BufferEncoding | (() => void),
    callback?: () => void
  ): Response {
    // Only log once
    if (!logged) {
      logged = true;
      
      // Calculate response time
      const responseTime = req.startTime ? Date.now() - req.startTime : 0;
      
      // Log response
      logger.info('Outgoing response', {
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        contentLength: getContentLength(res),
      });

      // Log slow requests
      if (responseTime > 5000) {
        logger.warn('Slow request detected', {
          requestId: req.requestId,
          method: req.method,
          path: req.path,
          responseTime: `${responseTime}ms`,
        });
      }
    }

    // Handle different call signatures
    if (typeof chunk === 'function') {
      return originalEnd(chunk);
    }
    if (typeof encodingOrCallback === 'function') {
      return originalEnd(chunk, encodingOrCallback);
    }
    if (encodingOrCallback) {
      return originalEnd(chunk, encodingOrCallback, callback);
    }
    return originalEnd(chunk);
  } as typeof res.end;

  next();
}

/**
 * Combined request/response logger
 */
export function combinedLogger(req: Request, res: Response, next: NextFunction): void {
  requestLogger(req, res, () => {
    responseLogger(req, res, next);
  });
}

/**
 * Error logging middleware
 * Logs errors with full context
 */
export function errorLogger(
  err: Error,
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  logger.error('Request error', {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    error: err.message,
    stack: err.stack,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
  });

  next(err);
}
