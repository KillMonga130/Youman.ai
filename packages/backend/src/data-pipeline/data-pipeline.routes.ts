/**
 * Data Pipeline Routes
 * API endpoints for ETL pipeline management, execution, and monitoring
 * Requirements: 89
 */

import { Router, Request, Response, NextFunction } from 'express';
import { dataPipelineService } from './data-pipeline.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Async handler wrapper
 */
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// ============ Pipeline Management Routes ============

/**
 * POST /api/data-pipelines
 * Creates a new pipeline
 */
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { config, autoActivate } = req.body;
    const userId = req.headers['x-user-id'] as string || 'anonymous';

    if (!config || !config.name || !config.source || !config.destination) {
      res.status(400).json({ 
        error: 'config with name, source, and destination is required' 
      });
      return;
    }

    const pipeline = await dataPipelineService.createPipeline({
      config,
      createdBy: userId,
      autoActivate,
    });

    logger.info(`Created pipeline via API: ${pipeline.id}`);
    res.status(201).json(pipeline);
  })
);

/**
 * GET /api/data-pipelines
 * Lists all pipelines
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const status = req.query.status as string | undefined;
    const pipelines = await dataPipelineService.listPipelines(status as any);
    res.json(pipelines);
  })
);

/**
 * GET /api/data-pipelines/:pipelineId
 * Gets a specific pipeline
 */
router.get(
  '/:pipelineId',
  asyncHandler(async (req: Request, res: Response) => {
    const pipelineId = req.params.pipelineId as string;
    const pipeline = await dataPipelineService.getPipeline(pipelineId);
    
    if (!pipeline) {
      res.status(404).json({ error: 'Pipeline not found' });
      return;
    }
    
    res.json(pipeline);
  })
);

/**
 * PATCH /api/data-pipelines/:pipelineId
 * Updates a pipeline
 */
router.patch(
  '/:pipelineId',
  asyncHandler(async (req: Request, res: Response) => {
    const pipelineId = req.params.pipelineId as string;
    const updates = req.body;

    const pipeline = await dataPipelineService.updatePipeline(pipelineId, updates);
    logger.info(`Updated pipeline via API: ${pipelineId}`);
    res.json(pipeline);
  })
);

/**
 * DELETE /api/data-pipelines/:pipelineId
 * Deletes a pipeline
 */
router.delete(
  '/:pipelineId',
  asyncHandler(async (req: Request, res: Response) => {
    const pipelineId = req.params.pipelineId as string;
    await dataPipelineService.deletePipeline(pipelineId);
    logger.info(`Deleted pipeline via API: ${pipelineId}`);
    res.json({ success: true, pipelineId });
  })
);

/**
 * POST /api/data-pipelines/:pipelineId/activate
 * Activates a pipeline
 */
router.post(
  '/:pipelineId/activate',
  asyncHandler(async (req: Request, res: Response) => {
    const pipelineId = req.params.pipelineId as string;
    await dataPipelineService.activatePipeline(pipelineId);
    res.json({ success: true, pipelineId, status: 'active' });
  })
);

/**
 * POST /api/data-pipelines/:pipelineId/pause
 * Pauses a pipeline
 */
router.post(
  '/:pipelineId/pause',
  asyncHandler(async (req: Request, res: Response) => {
    const pipelineId = req.params.pipelineId as string;
    await dataPipelineService.pausePipeline(pipelineId);
    res.json({ success: true, pipelineId, status: 'paused' });
  })
);

// ============ Pipeline Execution Routes ============

/**
 * POST /api/data-pipelines/:pipelineId/execute
 * Executes a pipeline
 */
router.post(
  '/:pipelineId/execute',
  asyncHandler(async (req: Request, res: Response) => {
    const pipelineId = req.params.pipelineId as string;
    const { sourceData, dryRun } = req.body;

    const result = await dataPipelineService.executePipeline({
      pipelineId,
      sourceData,
      dryRun,
      triggeredBy: 'api',
    });

    logger.info(`Executed pipeline via API: ${pipelineId}`);
    res.json(result);
  })
);

/**
 * POST /api/data-pipelines/validate
 * Validates data quality
 */
router.post(
  '/validate',
  asyncHandler(async (req: Request, res: Response) => {
    const { data } = req.body;

    if (!data || !Array.isArray(data)) {
      res.status(400).json({ error: 'data array is required' });
      return;
    }

    // Convert raw data to ProcessedData format
    const processedData = data.map((record: Record<string, unknown>) => ({
      original: record,
      transformed: record,
      valid: true,
    }));

    const report = await dataPipelineService.validateDataQuality(processedData);
    res.json(report);
  })
);

/**
 * POST /api/data-pipelines/batch
 * Processes data in batch
 */
router.post(
  '/batch',
  asyncHandler(async (req: Request, res: Response) => {
    const { data } = req.body;

    if (!data || !Array.isArray(data)) {
      res.status(400).json({ error: 'data array is required' });
      return;
    }

    const results = await dataPipelineService.processInBatch(data);
    res.json({
      totalRecords: results.length,
      validRecords: results.filter(r => r.valid).length,
      invalidRecords: results.filter(r => !r.valid).length,
      results,
    });
  })
);

// ============ Job Management Routes ============

/**
 * GET /api/data-pipelines/:pipelineId/jobs
 * Lists jobs for a pipeline
 */
router.get(
  '/:pipelineId/jobs',
  asyncHandler(async (req: Request, res: Response) => {
    const pipelineId = req.params.pipelineId as string;
    const status = req.query.status as string | undefined;
    const jobs = await dataPipelineService.listJobs(pipelineId, status as any);
    res.json(jobs);
  })
);

/**
 * GET /api/data-pipelines/jobs/:jobId
 * Gets a specific job
 */
router.get(
  '/jobs/:jobId',
  asyncHandler(async (req: Request, res: Response) => {
    const jobId = req.params.jobId as string;
    const job = await dataPipelineService.getJob(jobId);
    
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    
    res.json(job);
  })
);

/**
 * POST /api/data-pipelines/jobs/:jobId/cancel
 * Cancels a running job
 */
router.post(
  '/jobs/:jobId/cancel',
  asyncHandler(async (req: Request, res: Response) => {
    const jobId = req.params.jobId as string;
    await dataPipelineService.cancelJob(jobId);
    res.json({ success: true, jobId, status: 'cancelled' });
  })
);

/**
 * POST /api/data-pipelines/jobs/:jobId/retry
 * Handles a failed job (retry or alert)
 */
router.post(
  '/jobs/:jobId/retry',
  asyncHandler(async (req: Request, res: Response) => {
    const jobId = req.params.jobId as string;
    await dataPipelineService.handleFailedJobs(jobId);
    res.json({ success: true, jobId, message: 'Failed job handling initiated' });
  })
);

export default router;
