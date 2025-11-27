/**
 * Feature Flag Routes
 * API endpoints for experiment management, user bucketing, and feature rollouts
 * Requirements: 87
 */

import { Router, Request, Response, NextFunction } from 'express';
import { featureFlagService } from './feature-flags.service';
import {
  CreateExperimentOptions,
  CreateFeatureFlagOptions,
  TrackConversionOptions,
  ExperimentStatus,
} from './types';
import { logger } from '../utils/logger';

const router = Router();

// ============ Experiment Endpoints ============

/**
 * POST /api/feature-flags/experiments
 * Creates a new experiment
 * Requirement 87: A/B testing and feature rollouts
 */
router.post('/experiments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const options = req.body as CreateExperimentOptions;

    if (!options.name || typeof options.name !== 'string') {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Experiment name is required',
      });
    }

    if (!options.variants || !Array.isArray(options.variants) || options.variants.length < 2) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'At least 2 variants are required',
      });
    }

    if (!options.createdBy) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Creator user ID is required',
      });
    }

    const experiment = await featureFlagService.createExperiment(options);

    return res.status(201).json({
      success: true,
      data: {
        id: experiment.id,
        name: experiment.name,
        status: experiment.status,
        variantCount: experiment.variants.length,
        createdAt: experiment.createdAt,
      },
    });
  } catch (error) {
    logger.error('Error creating experiment:', error);
    return next(error);
  }
});

/**
 * GET /api/feature-flags/experiments
 * Lists all experiments
 */
router.get('/experiments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;
    const experiments = await featureFlagService.listExperiments(status as ExperimentStatus);

    return res.json({
      success: true,
      data: experiments.map(e => ({
        id: e.id,
        name: e.name,
        status: e.status,
        variantCount: e.variants.length,
        startDate: e.startDate,
        endDate: e.endDate,
        createdAt: e.createdAt,
      })),
    });
  } catch (error) {
    logger.error('Error listing experiments:', error);
    return next(error);
  }
});

/**
 * GET /api/feature-flags/experiments/:experimentId
 * Gets an experiment by ID
 */
router.get('/experiments/:experimentId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const experimentId = req.params.experimentId as string;
    const experiment = await featureFlagService.getExperiment(experimentId);

    if (!experiment) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: `Experiment not found: ${experimentId}`,
      });
    }

    return res.json({
      success: true,
      data: experiment,
    });
  } catch (error) {
    logger.error('Error getting experiment:', error);
    return next(error);
  }
});

/**
 * PATCH /api/feature-flags/experiments/:experimentId/status
 * Updates experiment status
 */
router.patch('/experiments/:experimentId/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const experimentId = req.params.experimentId as string;
    const { status } = req.body as { status: ExperimentStatus };

    const validStatuses: ExperimentStatus[] = ['draft', 'running', 'paused', 'completed', 'archived'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: `Status must be one of: ${validStatuses.join(', ')}`,
      });
    }

    await featureFlagService.updateExperimentStatus(experimentId, status);

    return res.json({
      success: true,
      message: `Experiment status updated to ${status}`,
    });
  } catch (error) {
    logger.error('Error updating experiment status:', error);
    return next(error);
  }
});

// ============ User Bucketing Endpoints ============

/**
 * POST /api/feature-flags/experiments/:experimentId/assign
 * Assigns a user to a variant
 * Requirement 87: User bucketing
 */
router.post('/experiments/:experimentId/assign', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const experimentId = req.params.experimentId as string;
    const { userId } = req.body as { userId: string };

    if (!userId) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'User ID is required',
      });
    }

    const variantId = await featureFlagService.assignUserToVariant(userId, experimentId);

    return res.json({
      success: true,
      data: {
        userId,
        experimentId,
        variantId,
      },
    });
  } catch (error) {
    logger.error('Error assigning user to variant:', error);
    return next(error);
  }
});

/**
 * GET /api/feature-flags/users/:userId/assignments
 * Gets all assignments for a user
 */
router.get('/users/:userId/assignments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.userId as string;
    const assignments = featureFlagService.getUserAssignments(userId);

    return res.json({
      success: true,
      data: assignments,
    });
  } catch (error) {
    logger.error('Error getting user assignments:', error);
    return next(error);
  }
});

// ============ Conversion Tracking Endpoints ============

/**
 * POST /api/feature-flags/conversions
 * Tracks a conversion event
 * Requirement 87: Conversion tracking
 */
router.post('/conversions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const options = req.body as TrackConversionOptions;

    if (!options.userId) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'User ID is required',
      });
    }

    if (!options.experimentId) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Experiment ID is required',
      });
    }

    if (!options.metric) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Metric name is required',
      });
    }

    await featureFlagService.trackConversion(options);

    return res.json({
      success: true,
      message: 'Conversion tracked successfully',
    });
  } catch (error) {
    logger.error('Error tracking conversion:', error);
    return next(error);
  }
});

// ============ Analysis Endpoints ============

/**
 * GET /api/feature-flags/experiments/:experimentId/results
 * Analyzes experiment results
 * Requirement 87: Statistical analysis
 */
router.get('/experiments/:experimentId/results', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const experimentId = req.params.experimentId as string;
    const results = await featureFlagService.analyzeResults(experimentId);

    return res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    logger.error('Error analyzing results:', error);
    return next(error);
  }
});

// ============ Feature Flag Endpoints ============

/**
 * POST /api/feature-flags/flags
 * Creates a feature flag
 * Requirement 87: Percentage-based rollouts
 */
router.post('/flags', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const options = req.body as CreateFeatureFlagOptions;

    if (!options.key || typeof options.key !== 'string') {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Flag key is required',
      });
    }

    if (!options.name || typeof options.name !== 'string') {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Flag name is required',
      });
    }

    if (!options.createdBy) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Creator user ID is required',
      });
    }

    const flag = await featureFlagService.createFeatureFlag(options);

    return res.status(201).json({
      success: true,
      data: {
        id: flag.id,
        key: flag.key,
        name: flag.name,
        status: flag.status,
        rolloutPercentage: flag.rolloutPercentage,
        createdAt: flag.createdAt,
      },
    });
  } catch (error) {
    logger.error('Error creating feature flag:', error);
    return next(error);
  }
});

/**
 * GET /api/feature-flags/flags
 * Lists all feature flags
 */
router.get('/flags', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const flags = await featureFlagService.listFeatureFlags();

    return res.json({
      success: true,
      data: flags.map(f => ({
        id: f.id,
        key: f.key,
        name: f.name,
        status: f.status,
        rolloutPercentage: f.rolloutPercentage,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      })),
    });
  } catch (error) {
    logger.error('Error listing feature flags:', error);
    return next(error);
  }
});

/**
 * GET /api/feature-flags/flags/:flagId
 * Gets a feature flag by ID
 */
router.get('/flags/:flagId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const flagId = req.params.flagId as string;
    const flag = await featureFlagService.getFeatureFlag(flagId);

    if (!flag) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: `Feature flag not found: ${flagId}`,
      });
    }

    return res.json({
      success: true,
      data: {
        ...flag,
        userOverrides: Object.fromEntries(flag.userOverrides),
      },
    });
  } catch (error) {
    logger.error('Error getting feature flag:', error);
    return next(error);
  }
});

/**
 * POST /api/feature-flags/flags/:flagId/evaluate
 * Evaluates a feature flag for a user
 */
router.post('/flags/:flagId/evaluate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const flagId = req.params.flagId as string;
    const { userId } = req.body as { userId: string };

    if (!userId) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'User ID is required',
      });
    }

    // Get flag to get the key
    const flag = await featureFlagService.getFeatureFlag(flagId);
    if (!flag) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: `Feature flag not found: ${flagId}`,
      });
    }

    const evaluation = await featureFlagService.evaluateFlag(flag.key, userId);

    return res.json({
      success: true,
      data: evaluation,
    });
  } catch (error) {
    logger.error('Error evaluating feature flag:', error);
    return next(error);
  }
});

/**
 * POST /api/feature-flags/evaluate
 * Evaluates a feature flag by key for a user
 */
router.post('/evaluate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { key, userId } = req.body as { key: string; userId: string };

    if (!key) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Flag key is required',
      });
    }

    if (!userId) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'User ID is required',
      });
    }

    const evaluation = await featureFlagService.evaluateFlag(key, userId);

    return res.json({
      success: true,
      data: evaluation,
    });
  } catch (error) {
    logger.error('Error evaluating feature flag:', error);
    return next(error);
  }
});

/**
 * POST /api/feature-flags/flags/:flagId/rollout
 * Rolls out a feature to a percentage of users
 * Requirement 87: Percentage-based rollouts
 */
router.post('/flags/:flagId/rollout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const flagId = req.params.flagId as string;
    const { percentage } = req.body as { percentage: number };

    if (percentage === undefined || typeof percentage !== 'number') {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Percentage is required and must be a number',
      });
    }

    if (percentage < 0 || percentage > 100) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Percentage must be between 0 and 100',
      });
    }

    await featureFlagService.rolloutFeature(flagId, percentage);

    return res.json({
      success: true,
      message: `Feature rolled out to ${percentage}% of users`,
    });
  } catch (error) {
    logger.error('Error rolling out feature:', error);
    return next(error);
  }
});

/**
 * POST /api/feature-flags/flags/:flagId/rollback
 * Rolls back a feature (disables it)
 */
router.post('/flags/:flagId/rollback', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const flagId = _req.params.flagId as string;

    await featureFlagService.rollbackFeature(flagId);

    return res.json({
      success: true,
      message: 'Feature rolled back successfully',
    });
  } catch (error) {
    logger.error('Error rolling back feature:', error);
    return next(error);
  }
});

/**
 * POST /api/feature-flags/flags/:flagId/overrides
 * Sets a user override for a feature flag
 */
router.post('/flags/:flagId/overrides', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const flagId = req.params.flagId as string;
    const { userId, enabled } = req.body as { userId: string; enabled: boolean };

    if (!userId) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'User ID is required',
      });
    }

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Enabled must be a boolean',
      });
    }

    await featureFlagService.setUserOverride(flagId, userId, enabled);

    return res.json({
      success: true,
      message: `User override set: ${userId} = ${enabled}`,
    });
  } catch (error) {
    logger.error('Error setting user override:', error);
    return next(error);
  }
});

/**
 * DELETE /api/feature-flags/flags/:flagId/overrides/:userId
 * Removes a user override
 */
router.delete('/flags/:flagId/overrides/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const flagId = req.params.flagId as string;
    const userId = req.params.userId as string;

    await featureFlagService.removeUserOverride(flagId, userId);

    return res.json({
      success: true,
      message: 'User override removed',
    });
  } catch (error) {
    logger.error('Error removing user override:', error);
    return next(error);
  }
});

export { router as featureFlagRoutes };
