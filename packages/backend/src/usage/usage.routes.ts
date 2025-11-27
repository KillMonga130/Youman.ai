/**
 * Usage Metering Routes
 * API endpoints for usage tracking and statistics
 * 
 * Requirements: 20 - Subscription tiers with different capabilities
 * Requirements: 66 - Usage analytics and benchmarking
 * Requirements: 80 - API rate limits with transparency
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../auth/auth.middleware';
import { logger } from '../utils/logger';
import {
  getUsageStatistics,
  getUsageHistory,
  getUsageTrends,
  getUsageSummary,
  checkQuota,
  getRateLimitInfo,
  getRateLimitHeaders,
  getStorageUsage,
  trackWordsProcessed,
  trackApiCall,
  trackStorageChange,
  UsageError,
} from './usage.service';
import {
  ResourceType,
  UsageEventType,
  trackUsageEventSchema,
  getUsageStatsSchema,
} from './types';

const router = Router();

// ============================================
// Usage Statistics Endpoints
// ============================================

/**
 * GET /usage/statistics
 * Get current usage statistics for the authenticated user
 * Requirements: 20.5 - Display current usage statistics and remaining quota
 */
router.get(
  '/statistics',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const statistics = await getUsageStatistics(userId);
      
      // Add rate limit headers
      const headers = await getRateLimitHeaders(userId);
      Object.entries(headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });

      res.json({ success: true, data: statistics });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /usage/history
 * Get usage history over time
 * Requirements: 66 - Usage analytics
 */
router.get(
  '/history',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const days = parseInt(req.query.days as string, 10) || 30;
      
      // Limit to max 90 days
      const limitedDays = Math.min(days, 90);
      
      const history = await getUsageHistory(userId, limitedDays);
      res.json({ success: true, data: history });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /usage/trends
 * Get usage trends comparing current and previous periods
 */
router.get(
  '/trends',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const trends = await getUsageTrends(userId);
      res.json({ success: true, data: trends });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /usage/summary
 * Get complete usage summary with statistics, history, and recommendations
 */
router.get(
  '/summary',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const summary = await getUsageSummary(userId);
      res.json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Quota Check Endpoints
// ============================================

/**
 * GET /usage/quota/check
 * Check if user has quota for a specific resource
 * Requirements: 20.2 - Display upgrade prompt when limit reached
 */
router.get(
  '/quota/check',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const resourceType = req.query.resourceType as ResourceType;
      const amount = parseInt(req.query.amount as string, 10) || 1;

      if (!Object.values(ResourceType).includes(resourceType)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_RESOURCE_TYPE',
            message: 'Invalid resource type. Must be one of: words, api_calls, storage',
          },
        });
        return;
      }

      const result = await checkQuota(userId, resourceType, amount);
      
      // Return 402 Payment Required if quota exceeded
      if (!result.allowed) {
        res.status(402).json({
          success: false,
          error: {
            code: 'QUOTA_EXCEEDED',
            message: result.message,
            upgradeRequired: result.upgradeRequired,
            remaining: result.remaining,
          },
        });
        return;
      }

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Rate Limit Info Endpoints
// ============================================

/**
 * GET /usage/rate-limit
 * Get rate limit information for the authenticated user
 * Requirements: 80 - API rate limits with transparency
 */
router.get(
  '/rate-limit',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const resourceType = (req.query.resourceType as ResourceType) || ResourceType.API_CALLS;

      const info = await getRateLimitInfo(userId, resourceType);
      const headers = await getRateLimitHeaders(userId, resourceType);

      // Set rate limit headers
      Object.entries(headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });

      res.json({ success: true, data: info });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Storage Usage Endpoints
// ============================================

/**
 * GET /usage/storage
 * Get storage usage for the authenticated user
 */
router.get(
  '/storage',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const storage = await getStorageUsage(userId);
      res.json({ success: true, data: storage });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Usage Tracking Endpoints (Internal Use)
// ============================================

/**
 * POST /usage/track/words
 * Track words processed (internal use)
 */
router.post(
  '/track/words',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { wordCount, metadata } = req.body;

      if (typeof wordCount !== 'number' || wordCount < 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_WORD_COUNT',
            message: 'Word count must be a non-negative number',
          },
        });
        return;
      }

      await trackWordsProcessed(userId, wordCount, metadata);
      res.json({ success: true, message: 'Words tracked' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /usage/track/api-call
 * Track API call (internal use)
 */
router.post(
  '/track/api-call',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { endpoint } = req.body;

      await trackApiCall(userId, endpoint);
      res.json({ success: true, message: 'API call tracked' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /usage/track/storage
 * Track storage change (internal use)
 */
router.post(
  '/track/storage',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { bytesChange, eventType } = req.body;

      if (typeof bytesChange !== 'number') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_BYTES_CHANGE',
            message: 'Bytes change must be a number',
          },
        });
        return;
      }

      const validEventTypes = [UsageEventType.FILE_UPLOAD, UsageEventType.FILE_DELETE];
      if (!validEventTypes.includes(eventType)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_EVENT_TYPE',
            message: 'Event type must be file_upload or file_delete',
          },
        });
        return;
      }

      await trackStorageChange(userId, bytesChange, eventType);
      res.json({ success: true, message: 'Storage change tracked' });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Error Handler
// ============================================

router.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof UsageError) {
    const statusCode = error.code === 'QUOTA_EXCEEDED' ? 402 : 400;

    res.status(statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  logger.error('Usage route error', { error });
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
});

export { router as usageRoutes };
