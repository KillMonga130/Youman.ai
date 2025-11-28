/**
 * Monitoring Middleware
 * Express middleware for request tracking, metrics, and tracing
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { metricsService } from './metrics.service';
import { tracingService, TracingSpan } from './tracing.service';
import { diagnosticsService } from './diagnostics.service';
import { ContextualLogger } from './structured-logger';

// Extend Express Request to include monitoring context
// Note: requestId and startTime are already declared in request-logger.ts
declare global {
  namespace Express {
    interface Request {
      span?: TracingSpan;
      logger?: ContextualLogger;
    }
  }
}

/**
 * Request tracking middleware
 * Adds request ID, timing, and logging context
 */
export function requestTrackingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Generate or extract request ID
  req.requestId = (req.headers['x-request-id'] as string) || uuidv4();
  req.startTime = Date.now();

  // Set request ID in response headers
  res.setHeader('X-Request-ID', req.requestId);

  // Create contextual logger for this request
  req.logger = new ContextualLogger();
  req.logger.setRequestId(req.requestId);

  // Extract user ID if available (from auth middleware)
  const userId = (req as Request & { user?: { id: string } }).user?.id;
  if (userId) {
    req.logger.setUserId(userId);
  }

  next();
}

/**
 * Distributed tracing middleware
 * Creates spans for incoming requests
 */
export function tracingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Extract trace context from headers
  const parentContext = tracingService.extractContext(req.headers as Record<string, string | string[] | undefined>);

  // Start a new span for this request
  const span = tracingService.startSpan(`HTTP ${req.method} ${req.path}`, parentContext);
  
  // Add request metadata to span
  span.setTag('http.method', req.method);
  span.setTag('http.url', req.originalUrl);
  span.setTag('http.host', req.hostname);
  if (req.requestId) {
    span.setTag('request.id', req.requestId);
  }

  // Store span in request for use in handlers
  req.span = span;

  // Update logger with trace context
  req.logger?.setTraceContext(span.getContext());

  // Finish span when response is sent
  res.on('finish', () => {
    span.setTag('http.status_code', res.statusCode);
    
    if (res.statusCode >= 400) {
      span.setError();
    } else {
      span.setOk();
    }
    
    span.finish();
  });

  next();
}

/**
 * Metrics collection middleware
 * Records HTTP request metrics for Prometheus
 */
export function metricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Track in-progress requests
  metricsService.httpRequestsInProgress.inc({ method: req.method });

  // Record metrics when response is finished
  res.on('finish', () => {
    const duration = (Date.now() - (req.startTime || Date.now())) / 1000; // Convert to seconds
    const path = normalizePath(req.route?.path || req.path);

    // Record HTTP metrics
    metricsService.recordHttpRequest(req.method, path, res.statusCode, duration);

    // Decrement in-progress counter
    metricsService.httpRequestsInProgress.dec({ method: req.method });

    // Track for diagnostics
    diagnosticsService.trackRequest(duration * 1000, res.statusCode >= 400);
  });

  next();
}

/**
 * Request logging middleware
 * Logs incoming requests and responses
 */
export function requestLoggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log incoming request
  req.logger?.debug('Incoming request', {
    method: req.method,
    path: req.path,
    query: req.query,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - (req.startTime || Date.now());
    
    req.logger?.httpRequest(
      req.method,
      req.path,
      res.statusCode,
      duration,
      {
        contentLength: res.get('Content-Length'),
      }
    );
  });

  next();
}

/**
 * Error tracking middleware
 * Tracks errors for diagnostics
 */
export function errorTrackingMiddleware(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Track error for diagnostics
  diagnosticsService.trackError(err);

  // Log error with context
  req.logger?.error('Request error', err, {
    method: req.method,
    path: req.path,
    statusCode: res.statusCode,
  });

  // Mark span as error if available
  if (req.span) {
    req.span.setError(err);
  }

  next(err);
}

/**
 * Normalize path for metrics (remove dynamic segments)
 */
function normalizePath(path: string): string {
  return path
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
    .replace(/\/\d+/g, '/:id');
}

/**
 * Combined monitoring middleware
 * Applies all monitoring middleware in correct order
 */
export function monitoringMiddleware() {
  return [
    requestTrackingMiddleware,
    tracingMiddleware,
    metricsMiddleware,
    requestLoggingMiddleware,
  ];
}
