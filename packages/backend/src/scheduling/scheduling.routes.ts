/**
 * Scheduling & Automation Routes
 * API endpoints for scheduled job management
 * Requirements: 35
 */

import { Router, Request, Response, NextFunction } from 'express';
import { schedulingService } from './scheduling.service';
import { CreateScheduleOptions, UpdateScheduleOptions, ScheduleFrequency } from './types';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/scheduling/jobs
 * Creates a new scheduled job
 * Requirement 35: Implement recurring schedule creation
 */
router.post('/jobs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const options = req.body as CreateScheduleOptions;

    // Validate required fields
    if (!options.name || typeof options.name !== 'string') {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Job name is required',
      });
    }

    if (!options.userId || typeof options.userId !== 'string') {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'User ID is required',
      });
    }

    if (!options.schedule) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Schedule configuration is required',
      });
    }

    const validFrequencies: ScheduleFrequency[] = ['once', 'daily', 'weekly', 'monthly'];
    if (!options.schedule.frequency || !validFrequencies.includes(options.schedule.frequency)) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: `Frequency must be one of: ${validFrequencies.join(', ')}`,
      });
    }

    if (!options.schedule.time || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(options.schedule.time)) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Time is required in HH:MM format (24-hour)',
      });
    }

    if (!options.source) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Content source is required',
      });
    }

    if (!options.settings) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Transform settings are required',
      });
    }

    if (!options.notificationEmail || typeof options.notificationEmail !== 'string') {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Notification email is required',
      });
    }

    const job = await schedulingService.createSchedule(options);

    return res.status(201).json({
      success: true,
      data: {
        id: job.id,
        name: job.name,
        status: job.status,
        cronExpression: job.cronExpression,
        nextExecutionAt: job.nextExecutionAt,
        createdAt: job.createdAt,
      },
    });
  } catch (error) {
    logger.error('Error creating scheduled job:', error);
    return next(error);
  }
});

/**
 * GET /api/scheduling/jobs
 * Gets all jobs for a user
 */
router.get('/jobs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.query.userId as string;

    if (!userId) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'User ID is required',
      });
    }

    const jobs = schedulingService.getJobsByUser(userId);

    return res.json({
      success: true,
      data: {
        jobs: jobs.map(job => ({
          id: job.id,
          name: job.name,
          description: job.description,
          status: job.status,
          schedule: job.schedule,
          nextExecutionAt: job.nextExecutionAt,
          lastExecutedAt: job.lastExecutedAt,
          executionCount: job.executionCount,
          enabled: job.enabled,
          createdAt: job.createdAt,
        })),
        count: jobs.length,
      },
    });
  } catch (error) {
    logger.error('Error getting jobs:', error);
    return next(error);
  }
});

/**
 * GET /api/scheduling/jobs/upcoming
 * Gets upcoming scheduled jobs for a user
 * Requirement 35: Display upcoming scheduled tasks
 */
router.get('/jobs/upcoming', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.query.userId as string;

    if (!userId) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'User ID is required',
      });
    }

    const upcomingJobs = await schedulingService.getUpcomingJobs(userId);

    return res.json({
      success: true,
      data: {
        jobs: upcomingJobs,
        count: upcomingJobs.length,
      },
    });
  } catch (error) {
    logger.error('Error getting upcoming jobs:', error);
    return next(error);
  }
});

/**
 * GET /api/scheduling/jobs/:jobId
 * Gets a job by ID
 */
router.get('/jobs/:jobId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const jobId = req.params.jobId as string;

    const job = await schedulingService.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: `Job not found: ${jobId}`,
      });
    }

    return res.json({
      success: true,
      data: job,
    });
  } catch (error) {
    logger.error('Error getting job:', error);
    return next(error);
  }
});

/**
 * PATCH /api/scheduling/jobs/:jobId
 * Updates a scheduled job
 */
router.patch('/jobs/:jobId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const jobId = req.params.jobId as string;
    const options = req.body as UpdateScheduleOptions;

    const job = await schedulingService.updateSchedule(jobId, options);

    return res.json({
      success: true,
      data: {
        id: job.id,
        name: job.name,
        status: job.status,
        nextExecutionAt: job.nextExecutionAt,
        updatedAt: job.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Error updating job:', error);
    return next(error);
  }
});

/**
 * DELETE /api/scheduling/jobs/:jobId
 * Cancels a scheduled job
 */
router.delete('/jobs/:jobId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const jobId = req.params.jobId as string;

    await schedulingService.cancelSchedule(jobId);

    return res.json({
      success: true,
      message: 'Job cancelled successfully',
    });
  } catch (error) {
    logger.error('Error cancelling job:', error);
    return next(error);
  }
});

/**
 * POST /api/scheduling/jobs/:jobId/execute
 * Manually triggers a job execution
 */
router.post('/jobs/:jobId/execute', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const jobId = req.params.jobId as string;

    const result = await schedulingService.triggerJob(jobId);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error executing job:', error);
    return next(error);
  }
});

/**
 * POST /api/scheduling/jobs/:jobId/pause
 * Pauses a scheduled job
 */
router.post('/jobs/:jobId/pause', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const jobId = req.params.jobId as string;

    await schedulingService.pauseJob(jobId);

    return res.json({
      success: true,
      message: 'Job paused successfully',
    });
  } catch (error) {
    logger.error('Error pausing job:', error);
    return next(error);
  }
});

/**
 * POST /api/scheduling/jobs/:jobId/resume
 * Resumes a paused job
 */
router.post('/jobs/:jobId/resume', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const jobId = req.params.jobId as string;

    await schedulingService.resumeJob(jobId);

    return res.json({
      success: true,
      message: 'Job resumed successfully',
    });
  } catch (error) {
    logger.error('Error resuming job:', error);
    return next(error);
  }
});

/**
 * GET /api/scheduling/jobs/:jobId/history
 * Gets job execution history
 */
router.get('/jobs/:jobId/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const jobId = req.params.jobId as string;
    const limit = parseInt(req.query.limit as string) || 10;

    const history = schedulingService.getJobHistory(jobId, limit);

    return res.json({
      success: true,
      data: {
        history,
        count: history.length,
      },
    });
  } catch (error) {
    logger.error('Error getting job history:', error);
    return next(error);
  }
});

export { router as schedulingRoutes };
