/**
 * Detection Routes
 * HTTP endpoints for AI detection testing
 * Requirements: 26 - Real-time AI detection testing
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, AuthenticatedRequest } from '../auth/auth.middleware';
import { getDetectionService } from './detection.service';
import { DetectionProvider } from './types';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /analyze
 * Analyze text for AI detection across multiple providers
 * Requirements: 26.1, 26.2
 */
router.post(
  '/analyze',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { text, providers } = req.body;

      // Input validation
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        res.status(400).json({
          error: 'Text is required and cannot be empty',
          code: 'INVALID_INPUT',
        });
        return;
      }

      // Validate providers if provided
      const validProviders: DetectionProvider[] = ['gptzero', 'originality', 'turnitin', 'internal'];
      if (providers && Array.isArray(providers)) {
        const invalidProviders = providers.filter(p => !validProviders.includes(p));
        if (invalidProviders.length > 0) {
          res.status(400).json({
            error: `Invalid providers: ${invalidProviders.join(', ')}. Valid providers are: ${validProviders.join(', ')}`,
            code: 'INVALID_PROVIDERS',
          });
          return;
        }
      }

      logger.info('Starting AI detection analysis', {
        userId: authReq.user.id,
        textLength: text.length,
        providers: providers || 'all',
      });

      const detectionService = getDetectionService();
      const result = await detectionService.detect(text, {
        providers: providers as DetectionProvider[] | undefined,
        parallel: true,
        useFallback: true,
      });

      logger.info('AI detection analysis completed', {
        userId: authReq.user.id,
        averageScore: result.averageScore,
        overallPassed: result.overallPassed,
        processingTime: result.totalProcessingTimeMs,
      });

      res.status(200).json({
        results: result.results,
        averageScore: result.averageScore,
        overallPassed: result.overallPassed,
        processingTimeMs: result.totalProcessingTimeMs,
        unavailableProviders: result.unavailableProviders,
        usedFallback: result.usedFallback,
      });
    } catch (error) {
      logger.error('Detection analysis error:', error);
      next(error);
    }
  }
);

/**
 * GET /providers
 * Get list of available detection providers
 */
router.get(
  '/providers',
  authenticate,
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const detectionService = getDetectionService();
      const providers = detectionService.getAvailableProviders();

      res.status(200).json({
        providers,
        count: providers.length,
      });
    } catch (error) {
      logger.error('Get providers error:', error);
      next(error);
    }
  }
);

/**
 * POST /compare
 * Compare detection results across multiple providers
 * Requirements: 52
 */
router.post(
  '/compare',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { text } = req.body;

      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        res.status(400).json({
          error: 'Text is required and cannot be empty',
          code: 'INVALID_INPUT',
        });
        return;
      }

      logger.info('Starting multi-detector comparison', {
        userId: authReq.user.id,
        textLength: text.length,
      });

      const detectionService = getDetectionService();
      const result = await detectionService.performMultiDetectorComparison(text);

      res.status(200).json(result);
    } catch (error) {
      logger.error('Multi-detector comparison error:', error);
      next(error);
    }
  }
);

export { router as detectionRouter };
