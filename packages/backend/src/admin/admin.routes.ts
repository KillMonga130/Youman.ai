/**
 * Admin Panel Routes
 * API endpoints for system monitoring, user activity, and alert management
 * 
 * Requirements: 19 - Monitor system performance and user activity
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireAdmin } from '../auth/auth.middleware';
import { logger } from '../utils/logger';
import {
  getSystemMetrics,
  getUserActivitySummary,
  getUserActivityList,
  getLogs,
  getErrorSummary,
  getErrorLogs,
  resolveError,
  logError,
  configureAlert,
  getAlertConfigs,
  getAlerts,
  acknowledgeAlert,
  getPerformanceHistory,
  getAdminDashboard,
  AdminError,
} from './admin.service';
import {
  getLogsSchema,
  configureAlertSchema,
  getMetricsSchema,
} from './types';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// ============================================
// Dashboard Endpoint
// ============================================

/**
 * GET /admin/dashboard
 * Get complete admin dashboard data
 * Requirements: 19.1 - Display system metrics including active users, processing queue length, and resource utilization
 */
router.get(
  '/dashboard',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const dashboard = await getAdminDashboard();
      res.json({ success: true, data: dashboard });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// System Metrics Endpoints
// ============================================

/**
 * GET /admin/metrics
 * Get current system metrics
 * Requirements: 19.1 - Display system metrics including active users, processing queue length, and resource utilization
 */
router.get(
  '/metrics',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const metrics = await getSystemMetrics();
      res.json({ success: true, data: metrics });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /admin/metrics/performance
 * Get performance history
 * Requirements: 19.2 - Track and display average processing time per 1,000 words
 */
router.get(
  '/metrics/performance',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = getMetricsSchema.parse({
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        interval: req.query.interval || 'hour',
      });
      const history = await getPerformanceHistory(input);
      res.json({ success: true, data: history });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// User Activity Endpoints
// ============================================

/**
 * GET /admin/activity
 * Get user activity summary
 * Requirements: 19.3 - Provide logs of transformations, errors, and API usage
 */
router.get(
  '/activity',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const summary = await getUserActivitySummary();
      res.json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /admin/activity/users
 * Get detailed user activity list
 */
router.get(
  '/activity/users',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = parseInt(req.query.limit as string, 10) || 50;
      const offset = parseInt(req.query.offset as string, 10) || 0;
      const activities = await getUserActivityList(limit, offset);
      res.json({ success: true, data: activities });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Logs Endpoints
// ============================================

/**
 * GET /admin/logs
 * Get activity logs with filtering
 * Requirements: 19.3 - Provide logs of transformations, errors, and API usage
 */
router.get(
  '/logs',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = getLogsSchema.parse({
        level: req.query.level,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        userId: req.query.userId,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 100,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : 0,
      });
      const logs = await getLogs(input);
      res.json({ success: true, data: logs });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Error Log Endpoints
// ============================================

/**
 * GET /admin/errors
 * Get error summary
 * Requirements: 19.4 - Log detailed error information
 */
router.get(
  '/errors',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const summary = await getErrorSummary();
      res.json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /admin/errors/logs
 * Get error logs with filtering
 */
router.get(
  '/errors/logs',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = parseInt(req.query.limit as string, 10) || 100;
      const offset = parseInt(req.query.offset as string, 10) || 0;
      const filters = {
        errorCode: req.query.errorCode as string | undefined,
        userId: req.query.userId as string | undefined,
        resolved: req.query.resolved === 'true' ? true : req.query.resolved === 'false' ? false : undefined,
      };
      const logs = await getErrorLogs(limit, offset, filters);
      res.json({ success: true, data: logs });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /admin/errors/:errorId/resolve
 * Mark an error as resolved
 */
router.post(
  '/errors/:errorId/resolve',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errorId = req.params.errorId;
      if (!errorId) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Error ID is required' },
        });
        return;
      }
      const error = await resolveError(errorId);
      if (!error) {
        res.status(404).json({
          success: false,
          error: { code: 'ERROR_NOT_FOUND', message: 'Error log not found' },
        });
        return;
      }
      res.json({ success: true, data: error });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /admin/errors
 * Log a new error (for testing/manual logging)
 */
router.post(
  '/errors',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { errorCode, message, userId, endpoint, stackTrace, metadata } = req.body;
      
      if (!errorCode || !message) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'errorCode and message are required' },
        });
        return;
      }

      const error = await logError(errorCode, message, {
        userId,
        endpoint,
        stackTrace,
        metadata,
      });
      res.status(201).json({ success: true, data: error });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Alert Endpoints
// ============================================

/**
 * GET /admin/alerts/config
 * Get all alert configurations
 * Requirements: 19.5 - Trigger alerts when resource thresholds are exceeded
 */
router.get(
  '/alerts/config',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const configs = await getAlertConfigs();
      res.json({ success: true, data: configs });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /admin/alerts/config
 * Configure an alert
 */
router.put(
  '/alerts/config',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = configureAlertSchema.parse(req.body);
      const config = await configureAlert(input);
      res.json({ success: true, data: config });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /admin/alerts
 * Get active alerts
 */
router.get(
  '/alerts',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const acknowledged = req.query.acknowledged === 'true' ? true : 
                          req.query.acknowledged === 'false' ? false : undefined;
      const alerts = await getAlerts(acknowledged);
      res.json({ success: true, data: alerts });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /admin/alerts/:alertId/acknowledge
 * Acknowledge an alert
 */
router.post(
  '/alerts/:alertId/acknowledge',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const alertId = req.params.alertId;
      if (!alertId) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Alert ID is required' },
        });
        return;
      }
      const userId = req.user!.id;
      const alert = await acknowledgeAlert(alertId, userId);
      if (!alert) {
        res.status(404).json({
          success: false,
          error: { code: 'ALERT_NOT_FOUND', message: 'Alert not found' },
        });
        return;
      }
      res.json({ success: true, data: alert });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Error Handler
// ============================================

// eslint-disable-next-line @typescript-eslint/no-unused-vars
router.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof AdminError) {
    const statusCode = error.code === 'NOT_FOUND' ? 404 :
                       error.code === 'UNAUTHORIZED' ? 401 :
                       error.code === 'FORBIDDEN' ? 403 : 400;
    
    res.status(statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  logger.error('Admin route error', { error });
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
});

export { router as adminRoutes };
