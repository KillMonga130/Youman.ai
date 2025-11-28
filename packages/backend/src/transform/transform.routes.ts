/**
 * Transformation Routes
 * HTTP endpoints for text humanization and transformation
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, AuthenticatedRequest } from '../auth/auth.middleware';
import { createTransformationPipeline } from './transformation-pipeline';
import { TransformRequest, HumanizationLevel, TransformStrategy } from './types';
import { logger } from '../utils/logger';

const router = Router();
const pipeline = createTransformationPipeline();

/**
 * POST /humanize
 * Humanize text with specified level and strategy
 * Requirements: 2.1, 2.2, 2.3
 */
router.post(
  '/humanize',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { text, level, strategy, protectedSegments } = req.body;

      // Input validation
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        res.status(400).json({
          error: 'Text is required and cannot be empty',
          code: 'INVALID_INPUT',
        });
        return;
      }

      // Validate text length (max 1MB)
      const maxLength = 1024 * 1024; // 1MB
      if (text.length > maxLength) {
        res.status(400).json({
          error: `Text exceeds maximum length of ${maxLength} characters`,
          code: 'TEXT_TOO_LONG',
        });
        return;
      }

      // Validate level if provided
      if (level !== undefined) {
        const validLevels: HumanizationLevel[] = [1, 2, 3, 4, 5];
        if (!validLevels.includes(level)) {
          res.status(400).json({
            error: 'Invalid humanization level. Must be between 1 and 5',
            code: 'INVALID_LEVEL',
          });
          return;
        }
      }

      // Validate strategy if provided
      if (strategy !== undefined) {
        const validStrategies: TransformStrategy[] = ['casual', 'professional', 'academic', 'auto'];
        if (!validStrategies.includes(strategy)) {
          res.status(400).json({
            error: 'Invalid strategy. Must be one of: casual, professional, academic, auto',
            code: 'INVALID_STRATEGY',
          });
          return;
        }
      }

      // Build transform request
      const transformRequest: TransformRequest = {
        text,
        level: level ?? 3,
        strategy: strategy ?? 'auto',
        userId: authReq.user.id,
      };

      // Add protected segments if provided
      if (protectedSegments && Array.isArray(protectedSegments)) {
        transformRequest.protectedDelimiters = protectedSegments;
      }

      logger.info('Starting transformation', {
        userId: authReq.user.id,
        textLength: text.length,
        level: transformRequest.level,
        strategy: transformRequest.strategy,
      });

      // Transform text
      const result = await pipeline.transform(transformRequest);

      logger.info('Transformation completed', {
        jobId: result.id,
        userId: authReq.user.id,
        processingTime: result.processingTime,
        chunksProcessed: result.chunksProcessed,
      });

      // Return result
      res.status(200).json({
        id: result.id,
        humanizedText: result.humanizedText,
        metrics: {
          detectionScore: result.detectionScores?.average,
          perplexity: result.metrics.after.perplexity,
          burstiness: result.metrics.after.burstiness,
          modificationPercentage: result.metrics.modificationPercentage,
          sentencesModified: result.metrics.sentencesModified,
          totalSentences: result.metrics.totalSentences,
        },
        processingTime: result.processingTime,
        strategyUsed: result.strategyUsed,
        levelApplied: result.levelApplied,
      });
    } catch (error) {
      logger.error('Transformation error:', error);
      next(error);
    }
  }
);

/**
 * GET /status/:jobId
 * Check transformation progress
 * Requirements: 2.4
 */
router.get(
  '/status/:jobId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { jobId } = req.params;

      if (!jobId) {
        res.status(400).json({
          error: 'Job ID is required',
          code: 'INVALID_INPUT',
        });
        return;
      }

      const status = await pipeline.getStatus(jobId);

      if (!status) {
        res.status(404).json({
          error: 'Job not found',
          code: 'JOB_NOT_FOUND',
        });
        return;
      }

      res.status(200).json({
        jobId: status.jobId,
        status: status.status,
        progress: status.progress,
        currentChunk: status.currentChunk,
        totalChunks: status.totalChunks,
        wordsProcessed: status.wordsProcessed,
        totalWords: status.totalWords,
        estimatedTimeRemaining: status.estimatedTimeRemaining,
        phase: status.phase,
        timestamp: status.timestamp,
      });
    } catch (error) {
      logger.error('Status check error:', error);
      next(error);
    }
  }
);

/**
 * POST /cancel/:jobId
 * Cancel a running transformation
 * Requirements: 2.4
 */
router.post(
  '/cancel/:jobId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { jobId } = req.params;

      if (!jobId) {
        res.status(400).json({
          error: 'Job ID is required',
          code: 'INVALID_INPUT',
        });
        return;
      }

      await pipeline.cancel(jobId);

      logger.info('Transformation cancelled', { jobId });

      res.status(200).json({
        message: 'Transformation cancelled successfully',
        jobId,
      });
    } catch (error) {
      logger.error('Cancellation error:', error);
      next(error);
    }
  }
);

export { router as transformRouter };
