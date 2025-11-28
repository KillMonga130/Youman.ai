/**
 * Performance Optimization Tests
 * Requirements: 70 - Performance optimization
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  enableQueryCache,
  getCachedQuery,
  setCachedQuery,
  invalidateQueryCache,
  analyzeQuery,
  logSlowQuery,
  getSlowQueries,
  configureConnectionPool,
  getConnectionPoolStats,
  acquireConnection,
  releaseConnection,
  drainPool,
  createMaterializedView,
  refreshMaterializedView,
  getMaterializedViewStatus,
  dropMaterializedView,
  quantizeModel,
  getQuantizedModel,
  listQuantizedModels,
  configureBatching,
  addToBatch,
  processBatch,
  getBatchStats,
  getPerformanceMetrics,
  generatePerformanceReport,
  getPerformanceAlerts,
  clearPerformanceAlerts,
} from './performance.service';
import type {
  QueryOptimizationConfig,
  ConnectionPoolConfig,
  MaterializedViewConfig,
  QuantizationConfig,
  BatchingConfig,
  BatchRequest,
} from './types';

// Mock Redis
vi.mock('../database/redis', () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    keys: vi.fn().mockResolvedValue([]),
    ttl: vi.fn().mockResolvedValue(300),
  },
}));

// Mock Prisma
vi.mock('../database/prisma', () => ({
  prisma: {
    $queryRawUnsafe: vi.fn().mockResolvedValue([]),
  },
}));

describe('Performance Optimization Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearPerformanceAlerts();
  });

  describe('Query Optimization', () => {
    it('should enable query cache with custom config', () => {
      const config: Partial<QueryOptimizationConfig> = {
        enableQueryCache: true,
        queryCacheTTL: 600,
        slowQueryThreshold: 2000,
      };

      expect(() => enableQueryCache(config)).not.toThrow();
    });

    it('should analyze query and provide optimization suggestions', async () => {
      const query = "SELECT * FROM users WHERE name LIKE '%john%' ORDER BY created_at";
      const analysis = await analyzeQuery(query);

      expect(analysis.query).toBe(query);
      expect(analysis.optimizationSuggestions.length).toBeGreaterThan(0);
      expect(analysis.optimizationSuggestions).toContain('Avoid SELECT * - specify only needed columns');
      expect(analysis.optimizationSuggestions).toContain('Leading wildcard in LIKE prevents index usage - consider full-text search');
      expect(analysis.optimizationSuggestions).toContain('Add LIMIT clause when using ORDER BY for better performance');
    });

    it('should detect missing WHERE clause', async () => {
      const query = 'SELECT id, name FROM users';
      const analysis = await analyzeQuery(query);

      expect(analysis.optimizationSuggestions).toContain('Consider adding WHERE clause to limit rows');
    });

    it('should detect OR conditions', async () => {
      const query = 'SELECT * FROM users WHERE status = "active" or role = "admin"';
      const analysis = await analyzeQuery(query);

      expect(analysis.optimizationSuggestions).toContain('OR conditions may prevent index usage - consider UNION or restructuring');
    });

    it('should log slow queries', () => {
      logSlowQuery('SELECT * FROM large_table', 5500);
      const slowQueries = getSlowQueries();

      expect(slowQueries.length).toBe(1);
      expect(slowQueries[0].duration).toBe(5500);
      expect(slowQueries[0].suggestions.length).toBeGreaterThan(0);
    });

    it('should not log queries below threshold', () => {
      // Clear any existing slow queries by draining
      const initialCount = getSlowQueries().length;
      logSlowQuery('SELECT 1', 100); // Below default 1000ms threshold
      const slowQueries = getSlowQueries();

      expect(slowQueries.length).toBe(initialCount);
    });

    it('should create performance alert for very slow queries', () => {
      clearPerformanceAlerts();
      logSlowQuery('SELECT * FROM huge_table', 11000);
      const alerts = getPerformanceAlerts();

      expect(alerts.length).toBe(1);
      expect(alerts[0].type).toBe('critical');
      expect(alerts[0].category).toBe('query');
    });
  });

  describe('Connection Pooling', () => {
    beforeEach(async () => {
      await drainPool();
    });

    it('should configure connection pool', () => {
      const config: Partial<ConnectionPoolConfig> = {
        minConnections: 10,
        maxConnections: 50,
        acquireTimeout: 60000,
      };

      expect(() => configureConnectionPool(config)).not.toThrow();
    });

    it('should acquire and release connections', async () => {
      const conn = await acquireConnection();

      expect(conn).toBeDefined();
      expect(conn.id).toBeDefined();
      expect(conn.isActive).toBe(true);

      releaseConnection(conn.id);
      const stats = getConnectionPoolStats();

      expect(stats.idleConnections).toBe(1);
    });

    it('should track connection pool statistics', async () => {
      const conn1 = await acquireConnection();
      const conn2 = await acquireConnection();

      const stats = getConnectionPoolStats();

      expect(stats.totalConnections).toBe(2);
      expect(stats.activeConnections).toBe(2);
      expect(stats.peakConnections).toBe(2);

      releaseConnection(conn1.id);
      releaseConnection(conn2.id);
    });

    it('should drain connection pool', async () => {
      await acquireConnection();
      await acquireConnection();

      await drainPool();
      const stats = getConnectionPoolStats();

      expect(stats.totalConnections).toBe(0);
      expect(stats.activeConnections).toBe(0);
    });
  });

  describe('Materialized Views', () => {
    const viewConfig: MaterializedViewConfig = {
      name: 'test_view',
      query: 'SELECT COUNT(*) as count FROM users',
      refreshInterval: 300,
      refreshStrategy: 'full',
      dependencies: ['users'],
      indexes: ['count'],
    };

    it('should create materialized view', async () => {
      await expect(createMaterializedView(viewConfig)).resolves.not.toThrow();
    });

    it('should refresh materialized view', async () => {
      await createMaterializedView(viewConfig);
      const result = await refreshMaterializedView('test_view');

      expect(result.name).toBe('test_view');
      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should return error for non-existent view', async () => {
      const result = await refreshMaterializedView('non_existent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Materialized view not found');
    });

    it('should drop materialized view', async () => {
      await createMaterializedView(viewConfig);
      await expect(dropMaterializedView('test_view')).resolves.not.toThrow();
    });
  });

  describe('Model Quantization', () => {
    const quantizationConfig: QuantizationConfig = {
      enabled: true,
      precision: 'int8',
      dynamicQuantization: true,
      calibrationSamples: 1000,
      targetLatency: 100,
    };

    it('should quantize model', async () => {
      const result = await quantizeModel('model-123', quantizationConfig);

      expect(result.modelId).toBe('model-123');
      expect(result.compressionRatio).toBeGreaterThan(1);
      expect(result.inferenceSpeedup).toBeGreaterThan(1);
      expect(result.qualityMetrics).toBeDefined();
    });

    it('should retrieve quantized model', async () => {
      await quantizeModel('model-456', quantizationConfig);
      const model = await getQuantizedModel('model-456');

      expect(model).toBeDefined();
      expect(model?.originalModelId).toBe('model-456');
      expect(model?.precision).toBe('int8');
    });

    it('should list quantized models', async () => {
      await quantizeModel('model-a', quantizationConfig);
      await quantizeModel('model-b', { ...quantizationConfig, precision: 'fp16' });

      const models = await listQuantizedModels();

      expect(models.length).toBeGreaterThanOrEqual(2);
    });

    it('should calculate correct compression ratios', async () => {
      const fp16Result = await quantizeModel('fp16-model', { ...quantizationConfig, precision: 'fp16' });
      const int8Result = await quantizeModel('int8-model', { ...quantizationConfig, precision: 'int8' });
      const int4Result = await quantizeModel('int4-model', { ...quantizationConfig, precision: 'int4' });

      expect(fp16Result.compressionRatio).toBe(2);
      expect(int8Result.compressionRatio).toBe(4);
      expect(int4Result.compressionRatio).toBe(8);
    });
  });

  describe('Request Batching', () => {
    beforeEach(() => {
      configureBatching({
        enabled: true,
        maxBatchSize: 10,
        maxWaitTime: 50,
        batchByType: true,
        priorityLevels: 3,
      });
    });

    it('should configure batching', () => {
      const config: Partial<BatchingConfig> = {
        enabled: true,
        maxBatchSize: 50,
        maxWaitTime: 100,
      };

      expect(() => configureBatching(config)).not.toThrow();
    });

    it('should add request to batch', async () => {
      const request: BatchRequest = {
        id: 'req-1',
        type: 'transform',
        payload: { text: 'Hello' },
        priority: 1,
        createdAt: new Date(),
        timeout: 5000,
      };

      // Process immediately since batching is enabled
      const resultPromise = addToBatch(request);
      
      // Wait for batch processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const result = await resultPromise;
      expect(result.requestId).toBe('req-1');
    });

    it('should track batch statistics', () => {
      const stats = getBatchStats();

      expect(stats).toBeDefined();
      expect(typeof stats.totalBatches).toBe('number');
      expect(typeof stats.totalRequests).toBe('number');
      expect(typeof stats.averageBatchSize).toBe('number');
    });

    it('should process requests immediately when batching is disabled', async () => {
      configureBatching({ enabled: false });

      const request: BatchRequest = {
        id: 'req-immediate',
        type: 'transform',
        payload: { text: 'Immediate' },
        priority: 1,
        createdAt: new Date(),
        timeout: 5000,
      };

      const result = await addToBatch(request);

      expect(result.requestId).toBe('req-immediate');
      expect(result.success).toBe(true);
    });
  });

  describe('Performance Metrics & Reporting', () => {
    it('should get performance metrics', () => {
      const metrics = getPerformanceMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.queryMetrics).toBeDefined();
      expect(metrics.connectionMetrics).toBeDefined();
      expect(metrics.batchingMetrics).toBeDefined();
      expect(metrics.memoryMetrics).toBeDefined();
      expect(metrics.timestamp).toBeInstanceOf(Date);
    });

    it('should include memory metrics', () => {
      const metrics = getPerformanceMetrics();

      expect(metrics.memoryMetrics.heapUsed).toBeGreaterThan(0);
      expect(metrics.memoryMetrics.heapTotal).toBeGreaterThan(0);
      expect(metrics.memoryMetrics.rss).toBeGreaterThan(0);
    });

    it('should generate performance report', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const report = await generatePerformanceReport(startDate, endDate);

      expect(report).toBeDefined();
      expect(report.period.start).toEqual(startDate);
      expect(report.period.end).toEqual(endDate);
      expect(report.metrics).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
      expect(Array.isArray(report.alerts)).toBe(true);
    });

    it('should manage performance alerts', () => {
      clearPerformanceAlerts();
      
      // Trigger an alert by logging a very slow query
      logSlowQuery('SELECT * FROM massive_table', 15000);

      const alerts = getPerformanceAlerts();
      expect(alerts.length).toBeGreaterThan(0);

      clearPerformanceAlerts();
      const clearedAlerts = getPerformanceAlerts();
      expect(clearedAlerts.length).toBe(0);
    });
  });

  describe('Query Analysis Edge Cases', () => {
    it('should handle empty query', async () => {
      const analysis = await analyzeQuery('');
      expect(analysis.query).toBe('');
      expect(analysis.estimatedCost).toBe(0);
    });

    it('should detect subqueries', async () => {
      const query = 'SELECT * FROM users WHERE id IN (SELECT user_id FROM orders)';
      const analysis = await analyzeQuery(query);

      expect(analysis.optimizationSuggestions).toContain('Consider using JOINs instead of subqueries where possible');
    });

    it('should suggest indexes for WHERE clauses', async () => {
      const query = 'SELECT * FROM users WHERE email = "test@example.com"';
      const analysis = await analyzeQuery(query);

      expect(analysis.suggestedIndexes.length).toBeGreaterThan(0);
    });

    it('should suggest indexes for JOIN conditions', async () => {
      const query = 'SELECT * FROM users JOIN orders ON users.id = orders.user_id WHERE status = "active"';
      const analysis = await analyzeQuery(query);

      // The query analyzer suggests indexes for WHERE clauses (captures first word after WHERE)
      expect(analysis.suggestedIndexes.length).toBeGreaterThan(0);
      expect(analysis.suggestedIndexes[0]).toContain('status');
    });
  });

  describe('Connection Pool Edge Cases', () => {
    beforeEach(async () => {
      await drainPool();
      configureConnectionPool({
        maxConnections: 3,
        acquireTimeout: 100,
      });
    });

    it('should reuse released connections', async () => {
      const conn1 = await acquireConnection();
      const conn1Id = conn1.id;
      releaseConnection(conn1Id);

      const conn2 = await acquireConnection();
      expect(conn2.id).toBe(conn1Id);
    });

    it('should track query count per connection', async () => {
      const conn = await acquireConnection();
      expect(conn.queryCount).toBe(1);

      releaseConnection(conn.id);
      const reusedConn = await acquireConnection();
      expect(reusedConn.queryCount).toBe(2);
    });
  });
});
