/**
 * A/B Testing Routes
 * API endpoints for variation generation, comparison, and performance tracking
 * Requirements: 34, 121
 */

import { Router, Request, Response, NextFunction } from 'express';
import { abTestingService } from './ab-testing.service';
import { VariationParams, CreateTestOptions, TrackPerformanceOptions } from './types';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/ab-testing/variations
 * Generates variations of text for A/B testing
 * Requirement 34: A/B testing for content variations
 */
router.post('/variations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text, count, parameters } = req.body as {
      text: string;
      count: number;
      parameters?: VariationParams;
    };

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Text is required and must be a string',
      });
    }

    if (!count || typeof count !== 'number' || count < 1) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Count is required and must be a positive number',
      });
    }

    const variations = await abTestingService.generateVariations(text, count, parameters);

    return res.json({
      success: true,
      data: {
        variations,
        count: variations.length,
      },
    });
  } catch (error) {
    logger.error('Error generating variations:', error);
    return next(error);
  }
});


/**
 * POST /api/ab-testing/compare
 * Compares variations and generates a comparison report
 * Requirement 34: Side-by-side comparison display
 */
router.post('/compare', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { variations } = req.body as {
      variations: Array<{
        id: string;
        text: string;
        strategy: string;
        level: number;
        detectionScore: number;
        differences: string[];
        wordCount: number;
        createdAt: string;
        isOriginal: boolean;
      }>;
    };

    if (!variations || !Array.isArray(variations) || variations.length < 2) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'At least 2 variations are required for comparison',
      });
    }

    // Convert date strings to Date objects
    const parsedVariations = variations.map(v => ({
      ...v,
      createdAt: new Date(v.createdAt),
    }));

    const report = await abTestingService.compareVariations(parsedVariations as any);

    return res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    logger.error('Error comparing variations:', error);
    return next(error);
  }
});

/**
 * POST /api/ab-testing/tests
 * Creates a new A/B test
 * Requirement 34: A/B testing for content variations
 */
router.post('/tests', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const options = req.body as CreateTestOptions;

    if (!options.name || typeof options.name !== 'string') {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Test name is required',
      });
    }

    if (!options.originalText || typeof options.originalText !== 'string') {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Original text is required',
      });
    }

    if (!options.variationCount || options.variationCount < 1) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Variation count must be at least 1',
      });
    }

    if (!options.userId) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'User ID is required',
      });
    }

    const test = await abTestingService.createTest(options);

    return res.status(201).json({
      success: true,
      data: {
        id: test.id,
        name: test.name,
        status: test.status,
        variationCount: test.variations.length,
        createdAt: test.createdAt,
      },
    });
  } catch (error) {
    logger.error('Error creating test:', error);
    return next(error);
  }
});

/**
 * GET /api/ab-testing/tests/:testId
 * Gets a test by ID
 */
router.get('/tests/:testId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { testId } = req.params;

    const test = await abTestingService.getTest(testId);

    if (!test) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: `Test not found: ${testId}`,
      });
    }

    return res.json({
      success: true,
      data: test,
    });
  } catch (error) {
    logger.error('Error getting test:', error);
    return next(error);
  }
});

/**
 * PATCH /api/ab-testing/tests/:testId/status
 * Updates test status
 */
router.patch('/tests/:testId/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { testId } = req.params;
    const { status } = req.body as { status: string };

    const validStatuses = ['draft', 'running', 'paused', 'completed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: `Status must be one of: ${validStatuses.join(', ')}`,
      });
    }

    await abTestingService.updateTestStatus(testId, status as any);

    return res.json({
      success: true,
      message: `Test status updated to ${status}`,
    });
  } catch (error) {
    logger.error('Error updating test status:', error);
    return next(error);
  }
});


/**
 * POST /api/ab-testing/track
 * Tracks performance metrics for a variation
 * Requirement 121: Performance tracking
 */
router.post('/track', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const options = req.body as TrackPerformanceOptions;

    if (!options.variationId) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Variation ID is required',
      });
    }

    const validEventTypes = ['view', 'positive', 'negative', 'rating'];
    if (!options.eventType || !validEventTypes.includes(options.eventType)) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: `Event type must be one of: ${validEventTypes.join(', ')}`,
      });
    }

    if (options.eventType === 'rating' && (options.rating === undefined || options.rating < 0 || options.rating > 5)) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Rating must be between 0 and 5',
      });
    }

    await abTestingService.trackPerformance(options.variationId, options);

    return res.json({
      success: true,
      message: 'Performance tracked successfully',
    });
  } catch (error) {
    logger.error('Error tracking performance:', error);
    return next(error);
  }
});

/**
 * GET /api/ab-testing/metrics/:variationId
 * Gets performance metrics for a variation
 */
router.get('/metrics/:variationId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { variationId } = req.params;

    const metrics = abTestingService.getPerformanceMetrics(variationId);

    return res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    logger.error('Error getting metrics:', error);
    return next(error);
  }
});

/**
 * POST /api/ab-testing/tests/:testId/winner
 * Selects the winning variation for a test
 * Requirement 121: Winner selection analytics
 */
router.post('/tests/:testId/winner', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { testId } = req.params;

    const winner = await abTestingService.selectWinner(testId);

    return res.json({
      success: true,
      data: {
        winnerId: winner.id,
        strategy: winner.strategy,
        level: winner.level,
        detectionScore: winner.detectionScore,
      },
    });
  } catch (error) {
    logger.error('Error selecting winner:', error);
    return next(error);
  }
});

/**
 * GET /api/ab-testing/tests/:testId/report
 * Generates a test result report
 * Requirement 34: Create test result reports
 */
router.get('/tests/:testId/report', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { testId } = req.params;

    const report = await abTestingService.generateTestReport(testId);

    return res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    logger.error('Error generating report:', error);
    return next(error);
  }
});

export { router as abTestingRoutes };
