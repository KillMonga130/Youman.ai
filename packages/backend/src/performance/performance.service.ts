/**
 * Performance Optimization Service
 * Requirements: 70 - Performance optimization
 * 
 * Implements query optimization, connection pooling, materialized views,
 * model quantization, and request batching for improved system performance.
 */

import { redis } from '../database/redis';
import { prisma } from '../database/prisma';
import { logger } from '../utils/logger';
import {
  QueryOptimizationConfig,
  QueryCacheEntry,
  SlowQueryLog,
  QueryAnalysis,
  ConnectionPoolConfig,
  ConnectionPoolStats,
  PooledConnection,
  MaterializedViewConfig,
  MaterializedViewStatus,
  MaterializedViewRefreshResult,
  QuantizationConfig,
  QuantizedModel,
  QuantizationResult,
  BatchingConfig,
  BatchRequest,
  BatchResult,
  BatchStats,
  PerformanceMetrics,
  PerformanceReport,
  PerformanceAlert,
} from './types';
import crypto from 'crypto';

// Default configurations
const DEFAULT_QUERY_CONFIG: QueryOptimizationConfig = {
  enableQueryCache: true,
  queryCacheTTL: 300, // 5 minutes
  slowQueryThreshold: 1000, // 1 second
  enableQueryAnalysis: true,
  maxCacheSize: 100 * 1024 * 1024, // 100MB
};

const DEFAULT_POOL_CONFIG: ConnectionPoolConfig = {
  minConnections: 5,
  maxConnections: 20,
  acquireTimeout: 30000,
  idleTimeout: 60000,
  connectionTimeout: 10000,
  maxWaitingClients: 100,
  enableHealthCheck: true,
  healthCheckInterval: 30000,
};

const DEFAULT_BATCHING_CONFIG: BatchingConfig = {
  enabled: true,
  maxBatchSize: 100,
  maxWaitTime: 50, // 50ms
  batchByType: true,
  priorityLevels: 3,
};

// Cache key prefixes
const CACHE_PREFIX = 'perf:query:';
const SLOW_QUERY_PREFIX = 'perf:slow:';
const MATERIALIZED_VIEW_PREFIX = 'perf:mv:';
const QUANTIZED_MODEL_PREFIX = 'perf:qm:';

// In-memory state
let queryConfig = { ...DEFAULT_QUERY_CONFIG };
let poolConfig = { ...DEFAULT_POOL_CONFIG };
let batchingConfig = { ...DEFAULT_BATCHING_CONFIG };

const slowQueryLogs: SlowQueryLog[] = [];
const connectionPool: Map<string, PooledConnection> = new Map();
const materializedViews: Map<string, MaterializedViewConfig> = new Map();
const quantizedModels: Map<string, QuantizedModel> = new Map();
const pendingBatches: Map<string, BatchRequest[]> = new Map();
const batchResolvers: Map<string, { resolve: (value: BatchResult) => void; reject: (error: Error) => void }> = new Map();

// Statistics tracking
let poolStats: ConnectionPoolStats = {
  totalConnections: 0,
  activeConnections: 0,
  idleConnections: 0,
  waitingClients: 0,
  acquiredConnections: 0,
  averageAcquireTime: 0,
  peakConnections: 0,
  connectionErrors: 0,
};

let batchStats: BatchStats = {
  totalBatches: 0,
  totalRequests: 0,
  averageBatchSize: 0,
  averageWaitTime: 0,
  averageProcessingTime: 0,
  batchEfficiency: 0,
};

const performanceAlerts: PerformanceAlert[] = [];

/**
 * Generate a hash for a query string
 */
function hashQuery(query: string, params?: unknown[]): string {
  const content = JSON.stringify({ query, params });
  return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return crypto.randomUUID();
}

// ============================================
// Query Optimization
// ============================================

/**
 * Enable and configure query caching
 */
export function enableQueryCache(config: Partial<QueryOptimizationConfig>): void {
  queryConfig = { ...queryConfig, ...config };
  logger.info('Query cache configured', { config: queryConfig });
}

/**
 * Get a cached query result
 */
export async function getCachedQuery<T>(key: string): Promise<T | null> {
  if (!queryConfig.enableQueryCache) {
    return null;
  }

  try {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      const entry: QueryCacheEntry = JSON.parse(cached);
      entry.hitCount++;
      await redis.set(cacheKey, JSON.stringify(entry), 'EX', queryConfig.queryCacheTTL);
      return entry.result as T;
    }
    
    return null;
  } catch (error) {
    logger.error('Error getting cached query', { error, key });
    return null;
  }
}

/**
 * Cache a query result
 */
export async function setCachedQuery<T>(key: string, result: T, ttl?: number): Promise<void> {
  if (!queryConfig.enableQueryCache) {
    return;
  }

  try {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    const entry: QueryCacheEntry = {
      key,
      result,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + (ttl || queryConfig.queryCacheTTL) * 1000),
      hitCount: 0,
      queryHash: hashQuery(key),
    };
    
    await redis.set(cacheKey, JSON.stringify(entry), 'EX', ttl || queryConfig.queryCacheTTL);
  } catch (error) {
    logger.error('Error caching query', { error, key });
  }
}

/**
 * Invalidate query cache entries matching a pattern
 */
export async function invalidateQueryCache(pattern?: string): Promise<number> {
  try {
    const searchPattern = pattern ? `${CACHE_PREFIX}${pattern}*` : `${CACHE_PREFIX}*`;
    const keys = await redis.keys(searchPattern);
    
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    
    logger.info('Query cache invalidated', { pattern, keysRemoved: keys.length });
    return keys.length;
  } catch (error) {
    logger.error('Error invalidating query cache', { error, pattern });
    return 0;
  }
}

/**
 * Analyze a query for optimization opportunities
 */
export async function analyzeQuery(query: string): Promise<QueryAnalysis> {
  const analysis: QueryAnalysis = {
    query,
    estimatedCost: 0,
    indexesUsed: [],
    suggestedIndexes: [],
    optimizationSuggestions: [],
  };

  try {
    // Analyze query patterns
    const lowerQuery = query.toLowerCase();
    
    // Check for SELECT *
    if (lowerQuery.includes('select *')) {
      analysis.optimizationSuggestions.push('Avoid SELECT * - specify only needed columns');
      analysis.estimatedCost += 10;
    }
    
    // Check for missing WHERE clause
    if (!lowerQuery.includes('where') && (lowerQuery.includes('select') || lowerQuery.includes('update') || lowerQuery.includes('delete'))) {
      analysis.optimizationSuggestions.push('Consider adding WHERE clause to limit rows');
      analysis.estimatedCost += 50;
    }
    
    // Check for LIKE with leading wildcard
    if (lowerQuery.includes("like '%")) {
      analysis.optimizationSuggestions.push('Leading wildcard in LIKE prevents index usage - consider full-text search');
      analysis.estimatedCost += 30;
    }
    
    // Check for ORDER BY without LIMIT
    if (lowerQuery.includes('order by') && !lowerQuery.includes('limit')) {
      analysis.optimizationSuggestions.push('Add LIMIT clause when using ORDER BY for better performance');
      analysis.estimatedCost += 20;
    }
    
    // Check for subqueries
    if ((lowerQuery.match(/select/g) || []).length > 1) {
      analysis.optimizationSuggestions.push('Consider using JOINs instead of subqueries where possible');
      analysis.estimatedCost += 15;
    }
    
    // Check for OR conditions
    if (lowerQuery.includes(' or ')) {
      analysis.optimizationSuggestions.push('OR conditions may prevent index usage - consider UNION or restructuring');
      analysis.estimatedCost += 10;
    }

    // Suggest indexes based on WHERE and JOIN conditions
    const whereMatch = lowerQuery.match(/where\s+(\w+)/);
    if (whereMatch) {
      analysis.suggestedIndexes.push(`Index on ${whereMatch[1]}`);
    }

    const joinMatch = lowerQuery.match(/join\s+\w+\s+on\s+\w+\.(\w+)/g);
    if (joinMatch) {
      joinMatch.forEach(match => {
        const column = match.match(/\.(\w+)$/)?.[1];
        if (column) {
          analysis.suggestedIndexes.push(`Index on join column: ${column}`);
        }
      });
    }

  } catch (error) {
    logger.error('Error analyzing query', { error, query });
  }

  return analysis;
}

/**
 * Log a slow query
 */
export function logSlowQuery(query: string, duration: number, parameters?: unknown[]): void {
  if (duration < queryConfig.slowQueryThreshold) {
    return;
  }

  const slowQuery: SlowQueryLog = {
    id: generateId(),
    query,
    duration,
    timestamp: new Date(),
    parameters,
    suggestions: [],
  };

  // Add basic suggestions
  if (duration > 5000) {
    slowQuery.suggestions.push('Query exceeds 5 seconds - consider query optimization or caching');
  }
  if (duration > 10000) {
    slowQuery.suggestions.push('Query exceeds 10 seconds - investigate immediately');
  }

  slowQueryLogs.push(slowQuery);
  
  // Keep only last 1000 slow queries
  if (slowQueryLogs.length > 1000) {
    slowQueryLogs.shift();
  }

  // Create alert for very slow queries
  if (duration > 5000) {
    addPerformanceAlert({
      id: generateId(),
      type: duration > 10000 ? 'critical' : 'warning',
      category: 'query',
      message: `Slow query detected: ${duration}ms`,
      value: duration,
      threshold: queryConfig.slowQueryThreshold,
      timestamp: new Date(),
    });
  }

  logger.warn('Slow query detected', { query: query.substring(0, 100), duration });
}

/**
 * Get slow query logs
 */
export function getSlowQueries(limit: number = 100): SlowQueryLog[] {
  return slowQueryLogs.slice(-limit);
}

// ============================================
// Connection Pooling
// ============================================

/**
 * Configure connection pool settings
 */
export function configureConnectionPool(config: Partial<ConnectionPoolConfig>): void {
  poolConfig = { ...poolConfig, ...config };
  logger.info('Connection pool configured', { config: poolConfig });
}

/**
 * Get connection pool statistics
 */
export function getConnectionPoolStats(): ConnectionPoolStats {
  poolStats.totalConnections = connectionPool.size;
  poolStats.activeConnections = Array.from(connectionPool.values()).filter(c => c.isActive).length;
  poolStats.idleConnections = poolStats.totalConnections - poolStats.activeConnections;
  
  return { ...poolStats };
}

/**
 * Acquire a connection from the pool
 */
export async function acquireConnection(): Promise<PooledConnection> {
  const startTime = Date.now();

  // Find an idle connection
  for (const [id, conn] of connectionPool) {
    if (!conn.isActive) {
      conn.isActive = true;
      conn.lastUsedAt = new Date();
      conn.queryCount++;
      
      const acquireTime = Date.now() - startTime;
      updateAcquireTimeStats(acquireTime);
      
      return conn;
    }
  }

  // Create new connection if under limit
  if (connectionPool.size < poolConfig.maxConnections) {
    const newConn: PooledConnection = {
      id: generateId(),
      createdAt: new Date(),
      lastUsedAt: new Date(),
      isActive: true,
      queryCount: 1,
    };
    
    connectionPool.set(newConn.id, newConn);
    poolStats.acquiredConnections++;
    
    if (connectionPool.size > poolStats.peakConnections) {
      poolStats.peakConnections = connectionPool.size;
    }
    
    const acquireTime = Date.now() - startTime;
    updateAcquireTimeStats(acquireTime);
    
    return newConn;
  }

  // Wait for a connection to become available
  poolStats.waitingClients++;
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      poolStats.waitingClients--;
      poolStats.connectionErrors++;
      reject(new Error('Connection acquire timeout'));
    }, poolConfig.acquireTimeout);

    const checkInterval = setInterval(() => {
      for (const [id, conn] of connectionPool) {
        if (!conn.isActive) {
          clearTimeout(timeout);
          clearInterval(checkInterval);
          
          conn.isActive = true;
          conn.lastUsedAt = new Date();
          conn.queryCount++;
          poolStats.waitingClients--;
          
          const acquireTime = Date.now() - startTime;
          updateAcquireTimeStats(acquireTime);
          
          resolve(conn);
          return;
        }
      }
    }, 10);
  });
}

/**
 * Release a connection back to the pool
 */
export function releaseConnection(connectionId: string): void {
  const conn = connectionPool.get(connectionId);
  if (conn) {
    conn.isActive = false;
    conn.lastUsedAt = new Date();
  }
}

/**
 * Drain all connections from the pool
 */
export async function drainPool(): Promise<void> {
  connectionPool.clear();
  poolStats = {
    totalConnections: 0,
    activeConnections: 0,
    idleConnections: 0,
    waitingClients: 0,
    acquiredConnections: 0,
    averageAcquireTime: 0,
    peakConnections: 0,
    connectionErrors: 0,
  };
  logger.info('Connection pool drained');
}

function updateAcquireTimeStats(acquireTime: number): void {
  const totalAcquires = poolStats.acquiredConnections;
  poolStats.averageAcquireTime = 
    (poolStats.averageAcquireTime * (totalAcquires - 1) + acquireTime) / totalAcquires;
}

// ============================================
// Materialized Views
// ============================================

/**
 * Create a materialized view configuration
 */
export async function createMaterializedView(config: MaterializedViewConfig): Promise<void> {
  materializedViews.set(config.name, config);
  
  // Store in Redis for persistence
  await redis.set(
    `${MATERIALIZED_VIEW_PREFIX}${config.name}`,
    JSON.stringify(config)
  );
  
  logger.info('Materialized view created', { name: config.name });
  
  // Initial refresh
  await refreshMaterializedView(config.name);
}

/**
 * Refresh a materialized view
 */
export async function refreshMaterializedView(name: string): Promise<MaterializedViewRefreshResult> {
  const config = materializedViews.get(name);
  if (!config) {
    return {
      name,
      success: false,
      rowsAffected: 0,
      duration: 0,
      error: 'Materialized view not found',
    };
  }

  const startTime = Date.now();
  
  try {
    // Execute the view query and cache results
    const result = await prisma.$queryRawUnsafe(config.query);
    const rowCount = Array.isArray(result) ? result.length : 0;
    
    // Cache the materialized view data
    await redis.set(
      `${MATERIALIZED_VIEW_PREFIX}data:${name}`,
      JSON.stringify(result),
      'EX',
      config.refreshInterval
    );
    
    const duration = Date.now() - startTime;
    
    logger.info('Materialized view refreshed', { name, rowCount, duration });
    
    return {
      name,
      success: true,
      rowsAffected: rowCount,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error('Error refreshing materialized view', { name, error: errorMessage });
    
    return {
      name,
      success: false,
      rowsAffected: 0,
      duration,
      error: errorMessage,
    };
  }
}

/**
 * Get materialized view status
 */
export async function getMaterializedViewStatus(name: string): Promise<MaterializedViewStatus> {
  const config = materializedViews.get(name);
  if (!config) {
    throw new Error(`Materialized view ${name} not found`);
  }

  const dataKey = `${MATERIALIZED_VIEW_PREFIX}data:${name}`;
  const ttl = await redis.ttl(dataKey);
  const data = await redis.get(dataKey);
  
  const parsedData = data ? JSON.parse(data) : [];
  const rowCount = Array.isArray(parsedData) ? parsedData.length : 0;
  
  return {
    name,
    lastRefreshed: ttl > 0 ? new Date(Date.now() - (config.refreshInterval - ttl) * 1000) : null,
    nextRefresh: new Date(Date.now() + ttl * 1000),
    rowCount,
    sizeBytes: data ? Buffer.byteLength(data, 'utf8') : 0,
    isStale: ttl <= 0,
    refreshDuration: 0, // Would need to track this separately
  };
}

/**
 * Drop a materialized view
 */
export async function dropMaterializedView(name: string): Promise<void> {
  materializedViews.delete(name);
  await redis.del(`${MATERIALIZED_VIEW_PREFIX}${name}`);
  await redis.del(`${MATERIALIZED_VIEW_PREFIX}data:${name}`);
  logger.info('Materialized view dropped', { name });
}

// ============================================
// Model Quantization
// ============================================

/**
 * Quantize a model for improved inference performance
 */
export async function quantizeModel(
  modelId: string,
  config: QuantizationConfig
): Promise<QuantizationResult> {
  const startTime = Date.now();
  
  // Simulate model quantization (in production, this would use actual ML frameworks)
  const originalSize = 1000000000; // 1GB placeholder
  const compressionRatios: Record<string, number> = {
    fp32: 1.0,
    fp16: 0.5,
    int8: 0.25,
    int4: 0.125,
  };
  
  const compressionRatio = compressionRatios[config.precision] || 1.0;
  const quantizedSize = Math.floor(originalSize * compressionRatio);
  
  // Simulate accuracy impact
  const accuracyDeltas: Record<string, number> = {
    fp32: 0,
    fp16: -0.1,
    int8: -0.5,
    int4: -1.5,
  };
  
  const quantizedModel: QuantizedModel = {
    id: generateId(),
    originalModelId: modelId,
    precision: config.precision,
    sizeReduction: (1 - compressionRatio) * 100,
    latencyImprovement: (1 - compressionRatio) * 50, // Rough estimate
    accuracyDelta: accuracyDeltas[config.precision] || 0,
    createdAt: new Date(),
  };
  
  quantizedModels.set(modelId, quantizedModel);
  
  // Store in Redis
  await redis.set(
    `${QUANTIZED_MODEL_PREFIX}${modelId}`,
    JSON.stringify(quantizedModel)
  );
  
  const duration = Date.now() - startTime;
  
  logger.info('Model quantized', { modelId, precision: config.precision, duration });
  
  return {
    modelId,
    originalSize,
    quantizedSize,
    compressionRatio: 1 / compressionRatio,
    inferenceSpeedup: 1 / compressionRatio,
    qualityMetrics: {
      accuracy: 100 + accuracyDeltas[config.precision],
      precision: 100 + accuracyDeltas[config.precision] * 0.8,
      recall: 100 + accuracyDeltas[config.precision] * 0.6,
    },
  };
}

/**
 * Get a quantized model
 */
export async function getQuantizedModel(modelId: string): Promise<QuantizedModel | null> {
  const cached = quantizedModels.get(modelId);
  if (cached) {
    return cached;
  }
  
  const stored = await redis.get(`${QUANTIZED_MODEL_PREFIX}${modelId}`);
  if (stored) {
    const model = JSON.parse(stored) as QuantizedModel;
    quantizedModels.set(modelId, model);
    return model;
  }
  
  return null;
}

/**
 * List all quantized models
 */
export async function listQuantizedModels(): Promise<QuantizedModel[]> {
  return Array.from(quantizedModels.values());
}

// ============================================
// Request Batching
// ============================================

/**
 * Configure request batching
 */
export function configureBatching(config: Partial<BatchingConfig>): void {
  batchingConfig = { ...batchingConfig, ...config };
  logger.info('Batching configured', { config: batchingConfig });
}

/**
 * Add a request to a batch
 */
export async function addToBatch<T>(request: BatchRequest<T>): Promise<BatchResult<T>> {
  if (!batchingConfig.enabled) {
    // Process immediately if batching is disabled
    return processSingleRequest(request);
  }

  const batchKey = batchingConfig.batchByType ? request.type : 'default';
  
  if (!pendingBatches.has(batchKey)) {
    pendingBatches.set(batchKey, []);
    
    // Schedule batch processing
    setTimeout(() => {
      processBatchByKey(batchKey);
    }, batchingConfig.maxWaitTime);
  }
  
  const batch = pendingBatches.get(batchKey)!;
  batch.push(request);
  
  // Process immediately if batch is full
  if (batch.length >= batchingConfig.maxBatchSize) {
    return processBatchByKey(batchKey).then(results => {
      const found = results.find(r => r.requestId === request.id);
      return (found || {
        requestId: request.id,
        success: false,
        error: 'Request not found in batch results',
        processingTime: 0,
      }) as BatchResult<T>;
    });
  }
  
  // Return a promise that resolves when the batch is processed
  return new Promise((resolve, reject) => {
    batchResolvers.set(request.id, { resolve: resolve as (value: BatchResult) => void, reject });
  });
}

async function processSingleRequest<T>(request: BatchRequest<T>): Promise<BatchResult<T>> {
  const startTime = Date.now();
  
  try {
    // Process the request (implementation depends on request type)
    return {
      requestId: request.id,
      success: true,
      result: request.payload as T,
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      requestId: request.id,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: Date.now() - startTime,
    };
  }
}

async function processBatchByKey(batchKey: string): Promise<BatchResult[]> {
  const batch = pendingBatches.get(batchKey);
  if (!batch || batch.length === 0) {
    return [];
  }
  
  pendingBatches.delete(batchKey);
  
  const startTime = Date.now();
  const results: BatchResult[] = [];
  
  // Sort by priority
  batch.sort((a, b) => b.priority - a.priority);
  
  // Process all requests in the batch
  for (const request of batch) {
    const result = await processSingleRequest(request);
    results.push(result);
    
    // Resolve the promise for this request
    const resolver = batchResolvers.get(request.id);
    if (resolver) {
      resolver.resolve(result);
      batchResolvers.delete(request.id);
    }
  }
  
  // Update batch statistics
  const processingTime = Date.now() - startTime;
  updateBatchStats(batch.length, processingTime);
  
  return results;
}

/**
 * Process all pending batches
 */
export async function processBatch(): Promise<BatchResult[]> {
  const allResults: BatchResult[] = [];
  
  for (const batchKey of pendingBatches.keys()) {
    const results = await processBatchByKey(batchKey);
    allResults.push(...results);
  }
  
  return allResults;
}

/**
 * Get batch statistics
 */
export function getBatchStats(): BatchStats {
  return { ...batchStats };
}

function updateBatchStats(batchSize: number, processingTime: number): void {
  batchStats.totalBatches++;
  batchStats.totalRequests += batchSize;
  batchStats.averageBatchSize = batchStats.totalRequests / batchStats.totalBatches;
  batchStats.averageProcessingTime = 
    (batchStats.averageProcessingTime * (batchStats.totalBatches - 1) + processingTime) / batchStats.totalBatches;
  batchStats.batchEfficiency = Math.min(100, (batchStats.averageBatchSize / batchingConfig.maxBatchSize) * 100);
}

// ============================================
// Performance Metrics & Reporting
// ============================================

/**
 * Get current performance metrics
 */
export function getPerformanceMetrics(): PerformanceMetrics {
  const memoryUsage = process.memoryUsage();
  
  return {
    queryMetrics: {
      totalQueries: 0, // Would need to track this
      cacheHits: 0, // Would need to track this
      cacheMisses: 0, // Would need to track this
      averageQueryTime: 0, // Would need to track this
      slowQueries: slowQueryLogs.length,
    },
    connectionMetrics: getConnectionPoolStats(),
    batchingMetrics: getBatchStats(),
    memoryMetrics: {
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      external: memoryUsage.external,
      rss: memoryUsage.rss,
    },
    timestamp: new Date(),
  };
}

/**
 * Generate a performance report
 */
export async function generatePerformanceReport(
  startDate: Date,
  endDate: Date
): Promise<PerformanceReport> {
  const metrics = getPerformanceMetrics();
  const recommendations: string[] = [];
  
  // Generate recommendations based on metrics
  if (metrics.connectionMetrics.waitingClients > 0) {
    recommendations.push('Consider increasing max connections in the pool');
  }
  
  if (metrics.queryMetrics.slowQueries > 10) {
    recommendations.push('Review and optimize slow queries');
  }
  
  if (metrics.memoryMetrics.heapUsed / metrics.memoryMetrics.heapTotal > 0.8) {
    recommendations.push('Memory usage is high - consider increasing heap size or optimizing memory usage');
  }
  
  if (metrics.batchingMetrics.batchEfficiency < 50) {
    recommendations.push('Batch efficiency is low - consider adjusting batch size or wait time');
  }
  
  return {
    period: {
      start: startDate,
      end: endDate,
    },
    metrics,
    recommendations,
    alerts: getPerformanceAlerts(),
  };
}

/**
 * Get performance alerts
 */
export function getPerformanceAlerts(): PerformanceAlert[] {
  return [...performanceAlerts];
}

/**
 * Add a performance alert
 */
function addPerformanceAlert(alert: PerformanceAlert): void {
  performanceAlerts.push(alert);
  
  // Keep only last 100 alerts
  if (performanceAlerts.length > 100) {
    performanceAlerts.shift();
  }
}

/**
 * Clear performance alerts
 */
export function clearPerformanceAlerts(): void {
  performanceAlerts.length = 0;
}

// Export the service object for convenience
export const performanceService = {
  // Query Optimization
  enableQueryCache,
  getCachedQuery,
  setCachedQuery,
  invalidateQueryCache,
  analyzeQuery,
  logSlowQuery,
  getSlowQueries,
  
  // Connection Pooling
  configureConnectionPool,
  getConnectionPoolStats,
  acquireConnection,
  releaseConnection,
  drainPool,
  
  // Materialized Views
  createMaterializedView,
  refreshMaterializedView,
  getMaterializedViewStatus,
  dropMaterializedView,
  
  // Model Quantization
  quantizeModel,
  getQuantizedModel,
  listQuantizedModels,
  
  // Request Batching
  configureBatching,
  addToBatch,
  processBatch,
  getBatchStats,
  
  // Metrics & Reporting
  getPerformanceMetrics,
  generatePerformanceReport,
  getPerformanceAlerts,
  clearPerformanceAlerts,
};
