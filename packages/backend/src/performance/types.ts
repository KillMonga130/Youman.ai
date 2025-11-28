/**
 * Performance Optimization Types
 * Requirements: 70 - Performance optimization
 */

// Query Optimization Types
export interface QueryOptimizationConfig {
  enableQueryCache: boolean;
  queryCacheTTL: number; // seconds
  slowQueryThreshold: number; // milliseconds
  enableQueryAnalysis: boolean;
  maxCacheSize: number; // bytes
}

export interface QueryCacheEntry {
  key: string;
  result: unknown;
  createdAt: Date;
  expiresAt: Date;
  hitCount: number;
  queryHash: string;
}

export interface SlowQueryLog {
  id: string;
  query: string;
  duration: number;
  timestamp: Date;
  parameters?: unknown[];
  stackTrace?: string;
  suggestions: string[];
}

export interface QueryAnalysis {
  query: string;
  estimatedCost: number;
  indexesUsed: string[];
  suggestedIndexes: string[];
  optimizationSuggestions: string[];
}

// Connection Pooling Types
export interface ConnectionPoolConfig {
  minConnections: number;
  maxConnections: number;
  acquireTimeout: number; // milliseconds
  idleTimeout: number; // milliseconds
  connectionTimeout: number; // milliseconds
  maxWaitingClients: number;
  enableHealthCheck: boolean;
  healthCheckInterval: number; // milliseconds
}

export interface ConnectionPoolStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingClients: number;
  acquiredConnections: number;
  averageAcquireTime: number;
  peakConnections: number;
  connectionErrors: number;
}

export interface PooledConnection {
  id: string;
  createdAt: Date;
  lastUsedAt: Date;
  isActive: boolean;
  queryCount: number;
}

// Materialized View Types
export interface MaterializedViewConfig {
  name: string;
  query: string;
  refreshInterval: number; // seconds
  refreshStrategy: 'full' | 'incremental';
  dependencies: string[];
  indexes: string[];
}

export interface MaterializedViewStatus {
  name: string;
  lastRefreshed: Date | null;
  nextRefresh: Date;
  rowCount: number;
  sizeBytes: number;
  isStale: boolean;
  refreshDuration: number;
}

export interface MaterializedViewRefreshResult {
  name: string;
  success: boolean;
  rowsAffected: number;
  duration: number;
  error?: string;
}

// Model Quantization Types
export interface QuantizationConfig {
  enabled: boolean;
  precision: 'fp32' | 'fp16' | 'int8' | 'int4';
  dynamicQuantization: boolean;
  calibrationSamples: number;
  targetLatency: number; // milliseconds
}

export interface QuantizedModel {
  id: string;
  originalModelId: string;
  precision: string;
  sizeReduction: number; // percentage
  latencyImprovement: number; // percentage
  accuracyDelta: number; // percentage change
  createdAt: Date;
}

export interface QuantizationResult {
  modelId: string;
  originalSize: number;
  quantizedSize: number;
  compressionRatio: number;
  inferenceSpeedup: number;
  qualityMetrics: {
    accuracy: number;
    precision: number;
    recall: number;
  };
}

// Request Batching Types
export interface BatchingConfig {
  enabled: boolean;
  maxBatchSize: number;
  maxWaitTime: number; // milliseconds
  batchByType: boolean;
  priorityLevels: number;
}

export interface BatchRequest<T = unknown> {
  id: string;
  type: string;
  payload: T;
  priority: number;
  createdAt: Date;
  timeout: number;
}

export interface BatchResult<T = unknown> {
  requestId: string;
  success: boolean;
  result?: T;
  error?: string;
  processingTime: number;
}

export interface BatchStats {
  totalBatches: number;
  totalRequests: number;
  averageBatchSize: number;
  averageWaitTime: number;
  averageProcessingTime: number;
  batchEfficiency: number; // percentage
}

// Performance Metrics Types
export interface PerformanceMetrics {
  queryMetrics: {
    totalQueries: number;
    cacheHits: number;
    cacheMisses: number;
    averageQueryTime: number;
    slowQueries: number;
  };
  connectionMetrics: ConnectionPoolStats;
  batchingMetrics: BatchStats;
  memoryMetrics: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  timestamp: Date;
}

export interface PerformanceReport {
  period: {
    start: Date;
    end: Date;
  };
  metrics: PerformanceMetrics;
  recommendations: string[];
  alerts: PerformanceAlert[];
}

export interface PerformanceAlert {
  id: string;
  type: 'warning' | 'critical';
  category: 'query' | 'connection' | 'memory' | 'latency';
  message: string;
  value: number;
  threshold: number;
  timestamp: Date;
}

// Optimization Service Interface
export interface PerformanceOptimizationService {
  // Query Optimization
  enableQueryCache(config: QueryOptimizationConfig): void;
  getCachedQuery<T>(key: string): Promise<T | null>;
  setCachedQuery<T>(key: string, result: T, ttl?: number): Promise<void>;
  invalidateQueryCache(pattern?: string): Promise<number>;
  analyzeQuery(query: string): Promise<QueryAnalysis>;
  getSlowQueries(limit?: number): Promise<SlowQueryLog[]>;

  // Connection Pooling
  configureConnectionPool(config: ConnectionPoolConfig): void;
  getConnectionPoolStats(): ConnectionPoolStats;
  acquireConnection(): Promise<PooledConnection>;
  releaseConnection(connectionId: string): void;
  drainPool(): Promise<void>;

  // Materialized Views
  createMaterializedView(config: MaterializedViewConfig): Promise<void>;
  refreshMaterializedView(name: string): Promise<MaterializedViewRefreshResult>;
  getMaterializedViewStatus(name: string): Promise<MaterializedViewStatus>;
  dropMaterializedView(name: string): Promise<void>;

  // Model Quantization
  quantizeModel(modelId: string, config: QuantizationConfig): Promise<QuantizationResult>;
  getQuantizedModel(modelId: string): Promise<QuantizedModel | null>;
  listQuantizedModels(): Promise<QuantizedModel[]>;

  // Request Batching
  configureBatching(config: BatchingConfig): void;
  addToBatch<T>(request: BatchRequest<T>): Promise<BatchResult<T>>;
  processBatch(): Promise<BatchResult[]>;
  getBatchStats(): BatchStats;

  // Metrics & Reporting
  getPerformanceMetrics(): PerformanceMetrics;
  generatePerformanceReport(startDate: Date, endDate: Date): Promise<PerformanceReport>;
  getPerformanceAlerts(): PerformanceAlert[];
}
