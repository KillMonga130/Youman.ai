/**
 * Training Job API Routes
 * Endpoints for managing training jobs
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, AuthenticatedRequest } from '../auth/auth.middleware';
import { getTrainingJobService } from './training-job.service';
import { getTrainingPipelineOrchestratorService } from './training-pipeline-orchestrator.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/training-jobs
 * Create a new training job
 */
router.post(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const {
        name,
        description,
        modelId,
        baseVersionId,
        config,
        dataQuery,
        dataPointIds,
        executorType,
        executorConfig,
        resourceRequirements,
      } = req.body;

      if (!name || !modelId || !config) {
        res.status(400).json({ error: 'name, modelId, and config are required' });
        return;
      }

      const service = getTrainingJobService();
      const job = await service.createTrainingJob({
        name,
        description,
        modelId,
        baseVersionId,
        config,
        dataQuery,
        dataPointIds,
        executorType,
        executorConfig,
        resourceRequirements,
        createdBy: authReq.user.id,
      });

      res.status(201).json({
        id: job.id,
        name: job.name,
        modelId: job.modelId,
        status: job.status,
        createdAt: job.createdAt,
      });
    } catch (error) {
      logger.error('Failed to create training job:', error);
      next(error);
    }
  }
);

/**
 * GET /api/training-jobs
 * List training jobs
 */
router.get(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { modelId, status, limit = 50, offset = 0 } = req.query;

      const service = getTrainingJobService();
      const result = await service.listTrainingJobs({
        modelId: modelId as string,
        status: status as any,
        createdBy: authReq.user.id,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });

      res.status(200).json({
        jobs: result.jobs.map((job) => ({
          id: job.id,
          name: job.name,
          modelId: job.modelId,
          status: job.status,
          progress: job.progress,
          currentEpoch: job.currentEpoch,
          totalEpochs: job.totalEpochs,
          startedAt: job.startedAt,
          completedAt: job.completedAt,
          failedAt: job.failedAt,
          errorMessage: job.errorMessage,
          createdAt: job.createdAt,
        })),
        total: result.total,
      });
    } catch (error) {
      logger.error('Failed to list training jobs:', error);
      next(error);
    }
  }
);

/**
 * GET /api/training-jobs/:jobId
 * Get a training job by ID
 */
router.get(
  '/:jobId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { jobId } = req.params;

      const service = getTrainingJobService();
      const job = await service.getTrainingJob(jobId);

      if (!job) {
        res.status(404).json({ error: 'Training job not found' });
        return;
      }

      res.status(200).json({
        id: job.id,
        name: job.name,
        description: job.description,
        modelId: job.modelId,
        baseVersionId: job.baseVersionId,
        config: job.config,
        status: job.status,
        progress: job.progress,
        currentEpoch: job.currentEpoch,
        totalEpochs: job.totalEpochs,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        failedAt: job.failedAt,
        errorMessage: job.errorMessage,
        resultingVersionId: job.resultingVersionId,
        trainingMetrics: job.trainingMetrics,
        validationMetrics: job.validationMetrics,
        executorType: job.executorType,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      });
    } catch (error) {
      logger.error('Failed to get training job:', error);
      next(error);
    }
  }
);

/**
 * POST /api/training-jobs/:jobId/start
 * Start a training job
 */
router.post(
  '/:jobId/start',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { jobId } = req.params;

      const orchestrator = getTrainingPipelineOrchestratorService();
      await orchestrator.submitTrainingJob(jobId);

      res.status(200).json({
        message: 'Training job submitted to pipeline',
        jobId,
      });
    } catch (error) {
      logger.error('Failed to start training job:', error);
      next(error);
    }
  }
);

/**
 * POST /api/training-jobs/:jobId/cancel
 * Cancel a training job
 */
router.post(
  '/:jobId/cancel',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { jobId } = req.params;

      const orchestrator = getTrainingPipelineOrchestratorService();
      await orchestrator.cancelJob(jobId);

      res.status(200).json({
        message: 'Training job cancelled',
        jobId,
      });
    } catch (error) {
      logger.error('Failed to cancel training job:', error);
      next(error);
    }
  }
);

/**
 * GET /api/training-jobs/pipeline/status
 * Get training pipeline status
 */
router.get(
  '/pipeline/status',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orchestrator = getTrainingPipelineOrchestratorService();
      const status = orchestrator.getPipelineStatus();

      res.status(200).json(status);
    } catch (error) {
      logger.error('Failed to get pipeline status:', error);
      next(error);
    }
  }
);

export default router;

