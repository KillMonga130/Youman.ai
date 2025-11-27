/**
 * Monitoring Module
 * Exports all monitoring components for logging, metrics, tracing, and alerting
 */

// Types
export * from './types';

// Services
export { metricsService, MetricsService } from './metrics.service';
export { tracingService, TracingService, TracingSpan } from './tracing.service';
export { alertingService, AlertingService } from './alerting.service';
export { diagnosticsService, DiagnosticsService } from './diagnostics.service';

// Logger
export { structuredLogger, ContextualLogger, logger } from './structured-logger';

// Routes
export { monitoringRoutes } from './monitoring.routes';

// Middleware
export {
  requestTrackingMiddleware,
  tracingMiddleware,
  metricsMiddleware,
  requestLoggingMiddleware,
  errorTrackingMiddleware,
  monitoringMiddleware,
} from './monitoring.middleware';
