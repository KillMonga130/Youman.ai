/**
 * Monitoring Types
 * Type definitions for logging, metrics, tracing, and alerting
 */

// Log levels
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

// Structured log entry for ELK stack
export interface StructuredLogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  environment: string;
  traceId?: string;
  spanId?: string;
  userId?: string;
  requestId?: string;
  duration?: number;
  statusCode?: number;
  method?: string;
  path?: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  metadata?: Record<string, unknown>;
}

// Trace context for distributed tracing
export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  sampled: boolean;
  baggage?: Record<string, string>;
}

// Span for distributed tracing
export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  serviceName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'ok' | 'error' | 'unset';
  tags: Record<string, string | number | boolean>;
  logs: SpanLog[];
}

export interface SpanLog {
  timestamp: number;
  fields: Record<string, unknown>;
}

// Alert configuration
export interface AlertConfig {
  id: string;
  name: string;
  description: string;
  condition: AlertCondition;
  channels: AlertChannel[];
  severity: AlertSeverity;
  enabled: boolean;
  cooldownMinutes: number;
  lastTriggered?: Date;
}

export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  duration: number; // seconds
}

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface AlertChannel {
  type: 'email' | 'slack' | 'pagerduty' | 'webhook';
  config: EmailAlertConfig | SlackAlertConfig | PagerDutyAlertConfig | WebhookAlertConfig;
}

export interface EmailAlertConfig {
  recipients: string[];
  subject?: string;
}

export interface SlackAlertConfig {
  webhookUrl: string;
  channel?: string;
  username?: string;
}

export interface PagerDutyAlertConfig {
  routingKey: string;
  severity?: 'info' | 'warning' | 'error' | 'critical';
}

export interface WebhookAlertConfig {
  url: string;
  headers?: Record<string, string>;
  method?: 'POST' | 'PUT';
}

// Alert event
export interface AlertEvent {
  alertId: string;
  alertName: string;
  severity: AlertSeverity;
  message: string;
  metric: string;
  currentValue: number;
  threshold: number;
  timestamp: Date;
  resolved: boolean;
}

// Diagnostic report
export interface DiagnosticReport {
  id: string;
  generatedAt: Date;
  system: SystemDiagnostics;
  application: ApplicationDiagnostics;
  database: DatabaseDiagnostics;
  metrics: MetricsSummary;
  recentErrors: ErrorSummary[];
  recommendations: string[];
}

export interface SystemDiagnostics {
  hostname: string;
  platform: string;
  arch: string;
  nodeVersion: string;
  uptime: number;
  memory: {
    total: number;
    used: number;
    free: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  cpu: {
    cores: number;
    model: string;
    usage: number;
  };
}

export interface ApplicationDiagnostics {
  version: string;
  environment: string;
  startTime: Date;
  uptime: number;
  activeConnections: number;
  requestsPerMinute: number;
  averageResponseTime: number;
  errorRate: number;
}

export interface DatabaseDiagnostics {
  postgresql: {
    connected: boolean;
    latency: number;
    activeConnections: number;
    poolSize: number;
  };
  mongodb: {
    connected: boolean;
    latency: number;
    collections: number;
  };
  redis: {
    connected: boolean;
    latency: number;
    memoryUsage: number;
    connectedClients: number;
  };
}

export interface MetricsSummary {
  httpRequests: {
    total: number;
    byStatus: Record<string, number>;
    byMethod: Record<string, number>;
  };
  transformations: {
    total: number;
    successful: number;
    failed: number;
    averageDuration: number;
  };
  detections: {
    total: number;
    averageScore: number;
  };
}

export interface ErrorSummary {
  timestamp: Date;
  message: string;
  count: number;
  lastOccurrence: Date;
  stack?: string;
}

// Metrics configuration
export interface MetricsConfig {
  enabled: boolean;
  prefix: string;
  defaultLabels: Record<string, string>;
  collectDefaultMetrics: boolean;
  httpMetricsPath: string;
}
