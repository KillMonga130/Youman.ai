/**
 * Performance Optimization Routes
 * Requirements: 70 - Performance optimization
 */

import { Router, Request, Response } from 'express';
import {
  enableQueryCache,
  invalidateQueryCache,
  analyzeQuery,
  getSlowQueries,
  configureConnectionPool,
  getConnectionPoolStats,
  drainPool,
  createMaterializedView,
  refreshMaterializedView,
  getMaterializedViewStatus,
  dropMaterializedView,
  quantizeModel,
  getQuantizedModel,
  listQuantizedModels,
  configureBatching,
  getBatchStats,
  getPerformanceMetrics,
  generatePerformanceReport,
  getPerformanceAlerts,
  clearPerformanceAlerts,
} from './performance.service';
import { logger } from '../utils/logger';

const router = Router();

// ============================================
// Query Optimization Routes
// ============================================

/**
 * Configure query cache
 * POST /api/performance/query-cache/config
 */
router.post('/query-cache/config', async (req: Request, res: Response) => {
  try {
    const config = req.body;
    enableQueryCache(config);
    res.json({ success: true, message: 'Query cache configured' });
  } catch (error) {
    logger.error('Error configuring query cache', { error });
    res.status(500).json({ error: 'Failed to configure query cache' });
  }
});

/**
 * Invalidate query cache
 * POST /api/performance/query-cache/invalidate
 */
router.post('/query-cache/invalidate', async (req: Request, res: Response) => {
  try {
    const { pattern } = req.body;
    const keysRemoved = await invalidateQueryCache(pattern);
    res.json({ success: true, keysRemoved });
  } catch (error) {
    logger.error('Error invalidating query cache', { error });
    res.status(500).json({ error: 'Failed to invalidate query cache' });
  }
});

/**
 * Analyze a query
 * POST /api/performance/query/analyze
 */
router.post('/query/analyze', async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    const analysis = await analyzeQuery(query);
    res.json(analysis);
  } catch (error) {
    logger.error('Error analyzing query', { error });
    res.status(500).json({ error: 'Failed to analyze query' });
  }
});

/**
 * Get slow queries
 * GET /api/performance/query/slow
 */
router.get('/query/slow', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const slowQueries = getSlowQueries(limit);
    res.json(slowQueries);
  } catch (error) {
    logger.error('Error getting slow queries', { error });
    res.status(500).json({ error: 'Failed to get slow queries' });
  }
});

// ============================================
// Connection Pool Routes
// ============================================

/**
 * Configure connection pool
 * POST /api/performance/connection-pool/config
 */
router.post('/connection-pool/config', async (req: Request, res: Response) => {
  try {
    const config = req.body;
    configureConnectionPool(config);
    res.json({ success: true, message: 'Connection pool configured' });
  } catch (error) {
    logger.error('Error configuring connection pool', { error });
    res.status(500).json({ error: 'Failed to configure connection pool' });
  }
});

/**
 * Get connection pool stats
 * GET /api/performance/connection-pool/stats
 */
router.get('/connection-pool/stats', async (req: Request, res: Response) => {
  try {
    const stats = getConnectionPoolStats();
    res.json(stats);
  } catch (error) {
    logger.error('Error getting connection pool stats', { error });
    res.status(500).json({ error: 'Failed to get connection pool stats' });
  }
});

/**
 * Drain connection pool
 * POST /api/performance/connection-pool/drain
 */
router.post('/connection-pool/drain', async (req: Request, res: Response) => {
  try {
    await drainPool();
    res.json({ success: true, message: 'Connection pool drained' });
  } catch (error) {
    logger.error('Error draining connection pool', { error });
    res.status(500).json({ error: 'Failed to drain connection pool' });
  }
});

// ============================================
// Materialized View Routes
// ============================================

/**
 * Create materialized view
 * POST /api/performance/materialized-views
 */
router.post('/materialized-views', async (req: Request, res: Response) => {
  try {
    const config = req.body;
    if (!config.name || !config.query) {
      return res.status(400).json({ error: 'Name and query are required' });
    }
    await createMaterializedView(config);
    res.status(201).json({ success: true, message: 'Materialized view created' });
  } catch (error) {
    logger.error('Error creating materialized view', { error });
    res.status(500).json({ error: 'Failed to create materialized view' });
  }
});

/**
 * Refresh materialized view
 * POST /api/performance/materialized-views/:name/refresh
 */
router.post('/materialized-views/:name/refresh', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const result = await refreshMaterializedView(name);
    res.json(result);
  } catch (error) {
    logger.error('Error refreshing materialized view', { error });
    res.status(500).json({ error: 'Failed to refresh materialized view' });
  }
});

/**
 * Get materialized view status
 * GET /api/performance/materialized-views/:name/status
 */
router.get('/materialized-views/:name/status', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const status = await getMaterializedViewStatus(name);
    res.json(status);
  } catch (error) {
    logger.error('Error getting materialized view status', { error });
    res.status(500).json({ error: 'Failed to get materialized view status' });
  }
});

/**
 * Drop materialized view
 * DELETE /api/performance/materialized-views/:name
 */
router.delete('/materialized-views/:name', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    await dropMaterializedView(name);
    res.json({ success: true, message: 'Materialized view dropped' });
  } catch (error) {
    logger.error('Error dropping materialized view', { error });
    res.status(500).json({ error: 'Failed to drop materialized view' });
  }
});

// ============================================
// Model Quantization Routes
// ============================================

/**
 * Quantize a model
 * POST /api/performance/models/:modelId/quantize
 */
router.post('/models/:modelId/quantize', async (req: Request, res: Response) => {
  try {
    const { modelId } = req.params;
    const config = req.body;
    const result = await quantizeModel(modelId, config);
    res.json(result);
  } catch (error) {
    logger.error('Error quantizing model', { error });
    res.status(500).json({ error: 'Failed to quantize model' });
  }
});

/**
 * Get quantized model
 * GET /api/performance/models/:modelId/quantized
 */
router.get('/models/:modelId/quantized', async (req: Request, res: Response) => {
  try {
    const { modelId } = req.params;
    const model = await getQuantizedModel(modelId);
    if (!model) {
      return res.status(404).json({ error: 'Quantized model not found' });
    }
    res.json(model);
  } catch (error) {
    logger.error('Error getting quantized model', { error });
    res.status(500).json({ error: 'Failed to get quantized model' });
  }
});

/**
 * List quantized models
 * GET /api/performance/models/quantized
 */
router.get('/models/quantized', async (req: Request, res: Response) => {
  try {
    const models = await listQuantizedModels();
    res.json(models);
  } catch (error) {
    logger.error('Error listing quantized models', { error });
    res.status(500).json({ error: 'Failed to list quantized models' });
  }
});

// ============================================
// Request Batching Routes
// ============================================

/**
 * Configure batching
 * POST /api/performance/batching/config
 */
router.post('/batching/config', async (req: Request, res: Response) => {
  try {
    const config = req.body;
    configureBatching(config);
    res.json({ success: true, message: 'Batching configured' });
  } catch (error) {
    logger.error('Error configuring batching', { error });
    res.status(500).json({ error: 'Failed to configure batching' });
  }
});

/**
 * Get batch stats
 * GET /api/performance/batching/stats
 */
router.get('/batching/stats', async (req: Request, res: Response) => {
  try {
    const stats = getBatchStats();
    res.json(stats);
  } catch (error) {
    logger.error('Error getting batch stats', { error });
    res.status(500).json({ error: 'Failed to get batch stats' });
  }
});

// ============================================
// Metrics & Reporting Routes
// ============================================

/**
 * Get performance metrics
 * GET /api/performance/metrics
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const metrics = getPerformanceMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error('Error getting performance metrics', { error });
    res.status(500).json({ error: 'Failed to get performance metrics' });
  }
});

/**
 * Generate performance report
 * POST /api/performance/report
 */
router.post('/report', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.body;
    const report = await generatePerformanceReport(
      new Date(startDate || Date.now() - 24 * 60 * 60 * 1000),
      new Date(endDate || Date.now())
    );
    res.json(report);
  } catch (error) {
    logger.error('Error generating performance report', { error });
    res.status(500).json({ error: 'Failed to generate performance report' });
  }
});

/**
 * Get performance alerts
 * GET /api/performance/alerts
 */
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const alerts = getPerformanceAlerts();
    res.json(alerts);
  } catch (error) {
    logger.error('Error getting performance alerts', { error });
    res.status(500).json({ error: 'Failed to get performance alerts' });
  }
});

/**
 * Clear performance alerts
 * DELETE /api/performance/alerts
 */
router.delete('/alerts', async (req: Request, res: Response) => {
  try {
    clearPerformanceAlerts();
    res.json({ success: true, message: 'Performance alerts cleared' });
  } catch (error) {
    logger.error('Error clearing performance alerts', { error });
    res.status(500).json({ error: 'Failed to clear performance alerts' });
  }
});

export const performanceRoutes = router;
