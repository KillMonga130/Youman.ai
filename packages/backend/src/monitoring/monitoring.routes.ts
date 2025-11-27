/**
 * Monitoring Routes
 * Endpoints for metrics, health checks, and diagnostics
 */

import { Router, Request, Response } from 'express';
import { metricsService } from './metrics.service';
import { diagnosticsService } from './diagnostics.service';
import { alertingService } from './alerting.service';
import { structuredLogger } from './structured-logger';

const router = Router();

/**
 * GET /metrics
 * Prometheus metrics endpoint
 */
router.get('/metrics', async (_req: Request, res: Response) => {
  try {
    const metrics = await metricsService.getMetrics();
    res.set('Content-Type', metricsService.getContentType());
    res.send(metrics);
  } catch (error) {
    structuredLogger.error('Failed to get metrics', error as Error);
    res.status(500).json({ error: 'Failed to retrieve metrics' });
  }
});

/**
 * GET /health
 * Basic health check endpoint
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * GET /health/ready
 * Readiness probe for Kubernetes
 */
router.get('/health/ready', async (_req: Request, res: Response) => {
  try {
    // Check if all dependencies are ready
    // This would include database connections, external services, etc.
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      error: (error as Error).message,
    });
  }
});

/**
 * GET /health/live
 * Liveness probe for Kubernetes
 */
router.get('/health/live', (_req: Request, res: Response) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /diagnostics
 * Generate diagnostic report
 */
router.get('/diagnostics', async (_req: Request, res: Response) => {
  try {
    const report = await diagnosticsService.generateReport();
    res.json(report);
  } catch (error) {
    structuredLogger.error('Failed to generate diagnostic report', error as Error);
    res.status(500).json({ error: 'Failed to generate diagnostic report' });
  }
});

/**
 * GET /alerts
 * Get all registered alerts
 */
router.get('/alerts', (_req: Request, res: Response) => {
  const alerts = alertingService.getAlerts();
  res.json(alerts);
});

/**
 * GET /alerts/history
 * Get alert history
 */
router.get('/alerts/history', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string, 10) || 100;
  const history = alertingService.getAlertHistory(limit);
  res.json(history);
});

/**
 * POST /alerts
 * Register a new alert
 */
router.post('/alerts', (req: Request, res: Response) => {
  try {
    alertingService.registerAlert(req.body);
    res.status(201).json({ message: 'Alert registered successfully' });
  } catch (error) {
    structuredLogger.error('Failed to register alert', error as Error);
    res.status(400).json({ error: 'Failed to register alert' });
  }
});

/**
 * DELETE /alerts/:id
 * Remove an alert
 */
router.delete('/alerts/:id', (req: Request, res: Response) => {
  alertingService.removeAlert(req.params.id);
  res.json({ message: 'Alert removed successfully' });
});

/**
 * POST /alerts/:id/resolve
 * Resolve an alert
 */
router.post('/alerts/:id/resolve', async (req: Request, res: Response) => {
  try {
    await alertingService.resolveAlert(req.params.id);
    res.json({ message: 'Alert resolved successfully' });
  } catch (error) {
    structuredLogger.error('Failed to resolve alert', error as Error);
    res.status(500).json({ error: 'Failed to resolve alert' });
  }
});

export const monitoringRoutes = router;
