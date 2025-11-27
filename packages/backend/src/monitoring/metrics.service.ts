/**
 * Prometheus Metrics Service
 * Custom metrics collection with prom-client
 */

import client, {
  Counter,
  Histogram,
  Gauge,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';
import { MetricsConfig } from './types';

export class MetricsService {
  private registry: Registry;
  private config: MetricsConfig;

  // HTTP metrics
  public httpRequestsTotal: Counter<string>;
  public httpRequestDuration: Histogram<string>;
  public httpRequestsInProgress: Gauge<string>;

  // Transformation metrics
  public transformationsTotal: Counter<string>;
  public transformationDuration: Histogram<string>;
  public transformationWordsProcessed: Counter<string>;

  // Detection metrics
  public detectionsTotal: Counter<string>;
  public detectionScore: Histogram<string>;
  public detectionDuration: Histogram<string>;

  // Database metrics
  public dbQueryDuration: Histogram<string>;
  public dbConnectionsActive: Gauge<string>;
  public dbErrors: Counter<string>;

  // Cache metrics
  public cacheHits: Counter<string>;
  public cacheMisses: Counter<string>;
  public cacheSize: Gauge<string>;

  // WebSocket metrics
  public wsConnectionsActive: Gauge<string>;
  public wsMessagesTotal: Counter<string>;

  // Business metrics
  public activeUsers: Gauge<string>;
  public projectsCreated: Counter<string>;
  public apiCallsTotal: Counter<string>;

  constructor(config: Partial<MetricsConfig> = {}) {
    this.config = {
      enabled: true,
      prefix: 'ai_humanizer_',
      defaultLabels: { app: 'ai-humanizer' },
      collectDefaultMetrics: true,
      httpMetricsPath: '/metrics',
      ...config,
    };

    this.registry = new Registry();
    this.registry.setDefaultLabels(this.config.defaultLabels);

    if (this.config.collectDefaultMetrics) {
      collectDefaultMetrics({ register: this.registry, prefix: this.config.prefix });
    }

    // Initialize HTTP metrics
    this.httpRequestsTotal = new Counter({
      name: `${this.config.prefix}http_requests_total`,
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: `${this.config.prefix}http_request_duration_seconds`,
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'path', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    this.httpRequestsInProgress = new Gauge({
      name: `${this.config.prefix}http_requests_in_progress`,
      help: 'Number of HTTP requests currently in progress',
      labelNames: ['method'],
      registers: [this.registry],
    });

    // Initialize transformation metrics
    this.transformationsTotal = new Counter({
      name: `${this.config.prefix}transformations_total`,
      help: 'Total number of text transformations',
      labelNames: ['strategy', 'level', 'status'],
      registers: [this.registry],
    });

    this.transformationDuration = new Histogram({
      name: `${this.config.prefix}transformation_duration_seconds`,
      help: 'Transformation duration in seconds',
      labelNames: ['strategy', 'level'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120],
      registers: [this.registry],
    });

    this.transformationWordsProcessed = new Counter({
      name: `${this.config.prefix}transformation_words_processed_total`,
      help: 'Total words processed in transformations',
      labelNames: ['strategy'],
      registers: [this.registry],
    });

    // Initialize detection metrics
    this.detectionsTotal = new Counter({
      name: `${this.config.prefix}detections_total`,
      help: 'Total number of AI detection checks',
      labelNames: ['detector', 'result'],
      registers: [this.registry],
    });

    this.detectionScore = new Histogram({
      name: `${this.config.prefix}detection_score`,
      help: 'AI detection scores distribution',
      labelNames: ['detector'],
      buckets: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
      registers: [this.registry],
    });

    this.detectionDuration = new Histogram({
      name: `${this.config.prefix}detection_duration_seconds`,
      help: 'Detection check duration in seconds',
      labelNames: ['detector'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 15],
      registers: [this.registry],
    });

    // Initialize database metrics
    this.dbQueryDuration = new Histogram({
      name: `${this.config.prefix}db_query_duration_seconds`,
      help: 'Database query duration in seconds',
      labelNames: ['database', 'operation'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
      registers: [this.registry],
    });

    this.dbConnectionsActive = new Gauge({
      name: `${this.config.prefix}db_connections_active`,
      help: 'Number of active database connections',
      labelNames: ['database'],
      registers: [this.registry],
    });

    this.dbErrors = new Counter({
      name: `${this.config.prefix}db_errors_total`,
      help: 'Total number of database errors',
      labelNames: ['database', 'operation'],
      registers: [this.registry],
    });

    // Initialize cache metrics
    this.cacheHits = new Counter({
      name: `${this.config.prefix}cache_hits_total`,
      help: 'Total number of cache hits',
      labelNames: ['cache'],
      registers: [this.registry],
    });

    this.cacheMisses = new Counter({
      name: `${this.config.prefix}cache_misses_total`,
      help: 'Total number of cache misses',
      labelNames: ['cache'],
      registers: [this.registry],
    });

    this.cacheSize = new Gauge({
      name: `${this.config.prefix}cache_size_bytes`,
      help: 'Current cache size in bytes',
      labelNames: ['cache'],
      registers: [this.registry],
    });

    // Initialize WebSocket metrics
    this.wsConnectionsActive = new Gauge({
      name: `${this.config.prefix}ws_connections_active`,
      help: 'Number of active WebSocket connections',
      registers: [this.registry],
    });

    this.wsMessagesTotal = new Counter({
      name: `${this.config.prefix}ws_messages_total`,
      help: 'Total WebSocket messages',
      labelNames: ['type', 'direction'],
      registers: [this.registry],
    });

    // Initialize business metrics
    this.activeUsers = new Gauge({
      name: `${this.config.prefix}active_users`,
      help: 'Number of currently active users',
      registers: [this.registry],
    });

    this.projectsCreated = new Counter({
      name: `${this.config.prefix}projects_created_total`,
      help: 'Total projects created',
      labelNames: ['tier'],
      registers: [this.registry],
    });

    this.apiCallsTotal = new Counter({
      name: `${this.config.prefix}api_calls_total`,
      help: 'Total API calls',
      labelNames: ['endpoint', 'tier'],
      registers: [this.registry],
    });
  }

  /**
   * Get metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  /**
   * Get metrics content type
   */
  getContentType(): string {
    return this.registry.contentType;
  }

  /**
   * Get registry for custom metrics
   */
  getRegistry(): Registry {
    return this.registry;
  }

  /**
   * Record HTTP request metrics
   */
  recordHttpRequest(
    method: string,
    path: string,
    status: number,
    duration: number
  ): void {
    const labels = { method, path: this.normalizePath(path), status: String(status) };
    this.httpRequestsTotal.inc(labels);
    this.httpRequestDuration.observe(labels, duration);
  }

  /**
   * Record transformation metrics
   */
  recordTransformation(
    strategy: string,
    level: number,
    status: 'success' | 'error',
    duration: number,
    wordCount: number
  ): void {
    const labels = { strategy, level: String(level), status };
    this.transformationsTotal.inc(labels);
    this.transformationDuration.observe({ strategy, level: String(level) }, duration);
    this.transformationWordsProcessed.inc({ strategy }, wordCount);
  }

  /**
   * Record detection metrics
   */
  recordDetection(
    detector: string,
    score: number,
    duration: number,
    result: 'pass' | 'fail'
  ): void {
    this.detectionsTotal.inc({ detector, result });
    this.detectionScore.observe({ detector }, score);
    this.detectionDuration.observe({ detector }, duration);
  }

  /**
   * Record database query metrics
   */
  recordDbQuery(
    database: 'postgresql' | 'mongodb' | 'redis',
    operation: string,
    duration: number,
    error: boolean = false
  ): void {
    this.dbQueryDuration.observe({ database, operation }, duration);
    if (error) {
      this.dbErrors.inc({ database, operation });
    }
  }

  /**
   * Normalize path for metrics (remove IDs)
   */
  private normalizePath(path: string): string {
    return path
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
      .replace(/\/\d+/g, '/:id');
  }

  /**
   * Reset all metrics (useful for testing)
   */
  resetMetrics(): void {
    this.registry.resetMetrics();
  }
}

// Singleton instance
export const metricsService = new MetricsService();
