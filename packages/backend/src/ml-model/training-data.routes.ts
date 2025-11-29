/**
 * Training Data API Routes
 * Endpoints for managing training data collection, querying, and export
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, AuthenticatedRequest } from '../auth/auth.middleware';
import { getTrainingDataCollectionService } from './training-data-collection.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/training-data/collect
 * Manually collect training data from a transformation
 */
router.post(
  '/collect',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { transformationId } = req.body;

      if (!transformationId) {
        res.status(400).json({ error: 'transformationId is required' });
        return;
      }

      const service = getTrainingDataCollectionService();
      const dataPoint = await service.collectFromTransformation(transformationId);

      if (!dataPoint) {
        res.status(404).json({ error: 'Transformation not found or not completed' });
        return;
      }

      res.status(201).json({
        id: dataPoint.id,
        transformationId: dataPoint.transformationId,
        qualityScore: dataPoint.qualityScore,
        detectionImprovement: dataPoint.detectionScoreImprovement,
        collectedAt: dataPoint.collectedAt,
      });
    } catch (error) {
      logger.error('Failed to collect training data:', error);
      next(error);
    }
  }
);

/**
 * POST /api/training-data/feedback
 * Add user feedback to a training data point
 */
router.post(
  '/feedback',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { dataPointId, rating, accepted, comments, specificChanges } = req.body;

      if (!dataPointId) {
        res.status(400).json({ error: 'dataPointId is required' });
        return;
      }

      const service = getTrainingDataCollectionService();
      const updated = await service.addUserFeedback(dataPointId, {
        rating,
        accepted: accepted ?? true,
        comments,
        specificChanges,
      });

      res.status(200).json({
        id: updated?.id,
        qualityScore: updated?.qualityScore,
        userFeedback: updated?.userFeedback,
      });
    } catch (error) {
      logger.error('Failed to add feedback:', error);
      next(error);
    }
  }
);

/**
 * GET /api/training-data
 * Query training data with filters
 */
router.get(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const {
        strategy,
        level,
        minQualityScore,
        minDetectionImprovement,
        hasUserFeedback,
        usedInTraining,
        startDate,
        endDate,
        limit = 50,
        offset = 0,
      } = req.query;

      const service = getTrainingDataCollectionService();
      const dataPoints = await service.queryTrainingData({
        userId: authReq.user.id,
        strategy: strategy as any,
        level: level ? parseInt(level as string) : undefined,
        minQualityScore: minQualityScore ? parseFloat(minQualityScore as string) : undefined,
        minDetectionImprovement: minDetectionImprovement
          ? parseFloat(minDetectionImprovement as string)
          : undefined,
        hasUserFeedback: hasUserFeedback === 'true',
        usedInTraining: usedInTraining as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });

      res.status(200).json({
        dataPoints: dataPoints.map((dp) => ({
          id: dp.id,
          transformationId: dp.transformationId,
          strategy: dp.strategy,
          level: dp.level,
          inputDetectionScore: dp.inputDetectionScore,
          outputDetectionScore: dp.outputDetectionScore,
          detectionScoreImprovement: dp.detectionScoreImprovement,
          qualityScore: dp.qualityScore,
          hasUserFeedback: !!dp.userFeedback,
          collectedAt: dp.collectedAt,
        })),
        count: dataPoints.length,
      });
    } catch (error) {
      logger.error('Failed to query training data:', error);
      next(error);
    }
  }
);

/**
 * GET /api/training-data/stats
 * Get training data statistics
 */
router.get(
  '/stats',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getTrainingDataCollectionService();
      const stats = await service.getTrainingDataStatistics();

      res.status(200).json(stats);
    } catch (error) {
      logger.error('Failed to get training data statistics:', error);
      next(error);
    }
  }
);

/**
 * POST /api/training-data/export
 * Export training data for model training
 */
router.post(
  '/export',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const {
        format = 'json',
        strategy,
        level,
        minQualityScore,
        minDetectionImprovement,
        hasUserFeedback,
      } = req.body;

      const service = getTrainingDataCollectionService();
      const exportData = await service.exportTrainingData({
        userId: authReq.user.id,
        strategy,
        level,
        minQualityScore,
        minDetectionImprovement,
        hasUserFeedback,
      });

      // Set appropriate content type
      const contentType =
        format === 'csv' ? 'text/csv' : format === 'jsonl' ? 'application/x-ndjson' : 'application/json';

      res.setHeader('Content-Type', contentType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="training-data-${Date.now()}.${format}"`
      );

      if (format === 'json') {
        res.status(200).json(exportData.dataPoints);
      } else if (format === 'jsonl') {
        const jsonl = exportData.dataPoints.map((dp) => JSON.stringify(dp)).join('\n');
        res.status(200).send(jsonl);
      } else {
        // CSV format (basic implementation)
        const headers = ['input', 'output', ...Object.keys(exportData.dataPoints[0]?.metadata || {})];
        const csv = [
          headers.join(','),
          ...exportData.dataPoints.map((dp) =>
            [
              JSON.stringify(dp.input),
              JSON.stringify(dp.output),
              ...Object.values(dp.metadata || {}).map((v) => JSON.stringify(v)),
            ].join(',')
          ),
        ].join('\n');
        res.status(200).send(csv);
      }
    } catch (error) {
      logger.error('Failed to export training data:', error);
      next(error);
    }
  }
);

export default router;

