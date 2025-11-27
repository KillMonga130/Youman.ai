/**
 * Cost Management Routes
 * API endpoints for cost tracking, reporting, and optimization
 * 
 * Requirements: 99 - Cost tracking and optimization
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../auth/auth.middleware';
import { logger } from '../utils/logger';
import {
  trackCost,
  allocateCosts,
  forecastCosts,
  identifyOptimizations,
  getUnderutilizedResources,
  setBudget,
  getBudgets,
  getBudget,
  getBudgetAlerts,
  acknowledgeBudgetAlert,
  getCostReport,
  benchmarkCosts,
  getCostSummary,
  CostManagementError,
} from './cost-management.service';
import {
  trackCostSchema,
  setBudgetSchema,
  getCostReportSchema,
  forecastCostSchema,
  TimePeriod,
} from './types';

const router = Router();

// ============================================
// Cost Tracking Endpoints
// ============================================

/**
 * POST /cost/track
 * Track a cost event
 * Requirements: 99.1 - Track costs by service, feature, and customer
 */
router.post(
  '/track',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validation = trackCostSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: validation.error.errors,
          },
        });
        return;
      }

      const customerId = req.body.customerId || req.user?.id;
      const record = await trackCost(validation.data, customerId);

      res.status(201).json({ success: true, data: record });
    } catch (error) {
      next(error);
    }
  }
);


// ============================================
// Cost Allocation Endpoints
// ============================================

/**
 * GET /cost/allocation/:customerId
 * Get cost allocation for a customer
 * Requirements: 99.2 - Provide cost allocation reports
 */
router.get(
  '/allocation/:customerId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { customerId } = req.params;
      const { startDate, endDate } = req.query;

      const allocation = await allocateCosts(
        customerId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json({ success: true, data: allocation });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Cost Report Endpoints
// ============================================

/**
 * GET /cost/report
 * Generate a cost report
 * Requirements: 99.2 - Provide cost allocation reports
 */
router.get(
  '/report',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validation = getCostReportSchema.safeParse(req.query);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: validation.error.errors,
          },
        });
        return;
      }

      const report = await getCostReport(validation.data);
      res.json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /cost/summary
 * Get comprehensive cost summary
 */
router.get(
  '/summary',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const summary = await getCostSummary();
      res.json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Cost Forecasting Endpoints
// ============================================

/**
 * POST /cost/forecast
 * Forecast future costs
 * Requirements: 99.4 - Project future costs based on usage trends
 */
router.post(
  '/forecast',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validation = forecastCostSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: validation.error.errors,
          },
        });
        return;
      }

      const forecast = await forecastCosts(validation.data);
      res.json({ success: true, data: forecast });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /cost/forecast/:period
 * Get cost forecast for a specific period
 */
router.get(
  '/forecast/:period',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { period } = req.params;
      const includeOptimizations = req.query.includeOptimizations === 'true';

      if (!Object.values(TimePeriod).includes(period as TimePeriod)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PERIOD',
            message: `Invalid period. Must be one of: ${Object.values(TimePeriod).join(', ')}`,
          },
        });
        return;
      }

      const forecast = await forecastCosts({
        period: period as TimePeriod,
        includeOptimizations,
      });

      res.json({ success: true, data: forecast });
    } catch (error) {
      next(error);
    }
  }
);


// ============================================
// Cost Optimization Endpoints
// ============================================

/**
 * GET /cost/optimizations
 * Get cost optimization recommendations
 * Requirements: 99.3 - Identify underutilized resources and recommend cost-saving measures
 */
router.get(
  '/optimizations',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const optimizations = await identifyOptimizations();
      res.json({ success: true, data: optimizations });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /cost/underutilized
 * Get underutilized resources
 * Requirements: 99.3 - Identify underutilized resources
 */
router.get(
  '/underutilized',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const resources = await getUnderutilizedResources();
      res.json({ success: true, data: resources });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Budget Management Endpoints
// ============================================

/**
 * POST /cost/budgets
 * Create a new budget
 * Requirements: 99.5 - Enforce spending limits and alert when thresholds are exceeded
 */
router.post(
  '/budgets',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validation = setBudgetSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: validation.error.errors,
          },
        });
        return;
      }

      const budget = await setBudget(validation.data);
      res.status(201).json({ success: true, data: budget });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /cost/budgets
 * Get all budgets
 */
router.get(
  '/budgets',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const budgetList = await getBudgets();
      res.json({ success: true, data: budgetList });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /cost/budgets/:budgetId
 * Get a specific budget
 */
router.get(
  '/budgets/:budgetId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { budgetId } = req.params;
      const budget = await getBudget(budgetId);

      if (!budget) {
        res.status(404).json({
          success: false,
          error: {
            code: 'BUDGET_NOT_FOUND',
            message: 'Budget not found',
          },
        });
        return;
      }

      res.json({ success: true, data: budget });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Budget Alert Endpoints
// ============================================

/**
 * GET /cost/alerts
 * Get budget alerts
 * Requirements: 99.5 - Alert when thresholds are exceeded
 */
router.get(
  '/alerts',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const acknowledged = req.query.acknowledged === 'true' ? true :
                          req.query.acknowledged === 'false' ? false :
                          undefined;

      const alerts = await getBudgetAlerts(acknowledged);
      res.json({ success: true, data: alerts });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /cost/alerts/:alertId/acknowledge
 * Acknowledge a budget alert
 */
router.post(
  '/alerts/:alertId/acknowledge',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { alertId } = req.params;
      await acknowledgeBudgetAlert(alertId);
      res.json({ success: true, message: 'Alert acknowledged' });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Cost Benchmarking Endpoints
// ============================================

/**
 * GET /cost/benchmark/:industry
 * Benchmark costs against industry standards
 * Requirements: 99.6 - Benchmark infrastructure costs against industry standards
 */
router.get(
  '/benchmark/:industry',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { industry } = req.params;
      const benchmarks = await benchmarkCosts(industry);
      res.json({ success: true, data: benchmarks });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Error Handler
// ============================================

router.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof CostManagementError) {
    res.status(400).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  logger.error('Cost management route error', { error });
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
});

export { router as costManagementRoutes };
