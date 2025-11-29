/**
 * ML Model Management Routes
 * API endpoints for model versioning, deployment, performance tracking, and drift detection
 * Requirements: 88
 */

import { Router, Request, Response, NextFunction } from 'express';
import { mlModelService } from './ml-model.service';
import { getLLMInferenceService } from './llm-inference.service';
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

// ============ Model Listing Routes ============

/**
 * GET /api/ml-models/available
 * Lists all available models including LLM providers and Bedrock models
 */
router.get(
  '/available',
  asyncHandler(async (req: Request, res: Response) => {
    const llmService = getLLMInferenceService();
    const llmProviders = llmService.getAvailableProviders();
    
    const availableModels = [];
    
    // Add LLM models
    for (const provider of llmProviders) {
      let modelName: string;
      switch (provider) {
        case 'openai':
          modelName = 'OpenAI GPT-4o';
          break;
        case 'anthropic':
          modelName = 'Anthropic Claude 3.5 Sonnet';
          break;
        case 'gemini':
          modelName = 'Google Gemini 2.0 Flash';
          break;
        default:
          modelName = provider.toUpperCase();
      }
      
      availableModels.push({
        id: `llm-${provider}`,
        name: modelName,
        type: 'llm',
        provider,
        available: true,
      });
    }
    
    // Add AWS Bedrock models
    const { listBedrockModels } = await import('./bedrock.service');
    const bedrockModels = listBedrockModels();
    for (const model of bedrockModels) {
      availableModels.push({
        id: model.id,
        name: model.name,
        type: 'bedrock',
        provider: model.provider,
        tier: model.tier,
        available: true,
        costInfo: {
          inputCostPer1KTokens: model.inputCostPer1KTokens,
          outputCostPer1KTokens: model.outputCostPer1KTokens,
        },
      });
    }
    
    // Add custom ML models from service (if any)
    // This would typically come from the database or service registry
    
    res.json({ models: availableModels });
  })
);

// ============ Model Version Routes ============

/**
 * POST /api/ml-models/versions
 * Creates a new model version
 */
router.post(
  '/versions',
  asyncHandler(async (req: Request, res: Response) => {
    const { modelId, version, description, artifactPath, config, trainingMetrics, tags } = req.body;
    const userId = req.headers['x-user-id'] as string || 'anonymous';

    if (!modelId || !version || !artifactPath || !config) {
      res.status(400).json({ error: 'modelId, version, artifactPath, and config are required' });
      return;
    }

    const modelVersion = await mlModelService.createModelVersion({
      modelId,
      version,
      description,
      artifactPath,
      config,
      trainingMetrics,
      createdBy: userId,
      tags,
    });

    logger.info(`Created model version via API: ${modelVersion.id}`);
    res.status(201).json(modelVersion);
  })
);

/**
 * GET /api/ml-models/:modelId/versions
 * Gets all versions for a model
 */
router.get(
  '/:modelId/versions',
  asyncHandler(async (req: Request, res: Response) => {
    const modelId = req.params.modelId as string;
    const versions = mlModelService.getModelVersions(modelId);
    res.json(versions);
  })
);

/**
 * GET /api/ml-models/:modelId/versions/latest
 * Gets the latest version for a model
 */
router.get(
  '/:modelId/versions/latest',
  asyncHandler(async (req: Request, res: Response) => {
    const modelId = req.params.modelId as string;
    const version = await mlModelService.getLatestVersion(modelId);
    
    if (!version) {
      res.status(404).json({ error: 'No versions found for model' });
      return;
    }
    
    res.json(version);
  })
);

/**
 * GET /api/ml-models/versions/:versionId
 * Gets a specific model version
 */
router.get(
  '/versions/:versionId',
  asyncHandler(async (req: Request, res: Response) => {
    const versionId = req.params.versionId as string;
    const version = await mlModelService.getModelVersion(versionId);
    
    if (!version) {
      res.status(404).json({ error: 'Model version not found' });
      return;
    }
    
    res.json(version);
  })
);

/**
 * PATCH /api/ml-models/versions/:versionId/status
 * Updates model version status
 */
router.patch(
  '/versions/:versionId/status',
  asyncHandler(async (req: Request, res: Response) => {
    const versionId = req.params.versionId as string;
    const { status } = req.body;

    if (!status) {
      res.status(400).json({ error: 'status is required' });
      return;
    }

    await mlModelService.updateVersionStatus(versionId, status);
    res.json({ success: true, versionId, status });
  })
);

// ============ Deployment Routes ============

/**
 * POST /api/ml-models/deployments
 * Deploys a model version
 */
router.post(
  '/deployments',
  asyncHandler(async (req: Request, res: Response) => {
    const {
      modelId,
      version,
      deploymentType,
      environment,
      replicas,
      canaryPercentage,
      autoRollback,
      timeoutSeconds,
    } = req.body;
    const userId = req.headers['x-user-id'] as string || 'anonymous';

    if (!modelId || !version) {
      res.status(400).json({ error: 'modelId and version are required' });
      return;
    }

    const deployment = await mlModelService.deployModel({
      modelId,
      version,
      deploymentType,
      environment,
      replicas,
      canaryPercentage,
      autoRollback,
      timeoutSeconds,
      deployedBy: userId,
    });

    logger.info(`Deployed model via API: ${deployment.id}`);
    res.status(201).json(deployment);
  })
);

/**
 * GET /api/ml-models/:modelId/deployments
 * Gets deployment history for a model
 */
router.get(
  '/:modelId/deployments',
  asyncHandler(async (req: Request, res: Response) => {
    const modelId = req.params.modelId as string;
    const deployments = await mlModelService.getDeploymentHistory(modelId);
    res.json(deployments);
  })
);

/**
 * GET /api/ml-models/:modelId/deployments/active
 * Gets active deployment for a model
 */
router.get(
  '/:modelId/deployments/active',
  asyncHandler(async (req: Request, res: Response) => {
    const modelId = req.params.modelId as string;
    const deployment = await mlModelService.getActiveDeployment(modelId);
    
    if (!deployment) {
      res.status(404).json({ error: 'No active deployment found' });
      return;
    }
    
    res.json(deployment);
  })
);

/**
 * GET /api/ml-models/deployments/:deploymentId
 * Gets a specific deployment
 */
router.get(
  '/deployments/:deploymentId',
  asyncHandler(async (req: Request, res: Response) => {
    const deploymentId = req.params.deploymentId as string;
    const deployment = await mlModelService.getDeployment(deploymentId);
    
    if (!deployment) {
      res.status(404).json({ error: 'Deployment not found' });
      return;
    }
    
    res.json(deployment);
  })
);

/**
 * POST /api/ml-models/:modelId/rollback
 * Rolls back a model to a previous version
 */
router.post(
  '/:modelId/rollback',
  asyncHandler(async (req: Request, res: Response) => {
    const modelId = req.params.modelId as string;
    const { previousVersion } = req.body;

    if (!previousVersion) {
      res.status(400).json({ error: 'previousVersion is required' });
      return;
    }

    await mlModelService.rollbackModel(modelId, previousVersion);
    logger.info(`Rolled back model ${modelId} to version ${previousVersion}`);
    res.json({ success: true, modelId, rolledBackTo: previousVersion });
  })
);

// ============ Performance & Metrics Routes ============

/**
 * GET /api/ml-models/:modelId/metrics
 * Gets current performance metrics for a model
 */
router.get(
  '/:modelId/metrics',
  asyncHandler(async (req: Request, res: Response) => {
    const modelId = req.params.modelId as string;
    try {
      const metrics = await mlModelService.trackModelPerformance(modelId);
      res.json(metrics);
    } catch (error: any) {
      if (error.message?.includes('No active deployment')) {
        res.status(404).json({ error: 'No active deployment found. Please deploy a model version first.' });
        return;
      }
      throw error;
    }
  })
);

/**
 * GET /api/ml-models/:modelId/metrics/history
 * Gets metrics history for a model
 */
router.get(
  '/:modelId/metrics/history',
  asyncHandler(async (req: Request, res: Response) => {
    const modelId = req.params.modelId as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const history = await mlModelService.getMetricsHistory(modelId, limit);
    res.json(history);
  })
);

/**
 * POST /api/ml-models/:modelId/predictions
 * Records a prediction for metrics tracking
 */
router.post(
  '/:modelId/predictions',
  asyncHandler(async (req: Request, res: Response) => {
    const modelId = req.params.modelId as string;
    const { prediction, groundTruth, latencyMs, success, detectionScore, features, errorMessage } = req.body;

    if (latencyMs === undefined || success === undefined) {
      res.status(400).json({ error: 'latencyMs and success are required' });
      return;
    }

    await mlModelService.recordPrediction(modelId, {
      prediction,
      groundTruth,
      latencyMs,
      success,
      detectionScore,
      features,
      errorMessage,
    });

    res.status(201).json({ success: true });
  })
);

// ============ Drift Detection Routes ============

/**
 * GET /api/ml-models/:modelId/drift
 * Detects model drift
 */
router.get(
  '/:modelId/drift',
  asyncHandler(async (req: Request, res: Response) => {
    const modelId = req.params.modelId as string;
    try {
      const report = await mlModelService.detectModelDrift(modelId);
      res.json(report);
    } catch (error: any) {
      if (error.message?.includes('No active deployment')) {
        res.status(404).json({ error: 'No active deployment found. Please deploy a model version first.' });
        return;
      }
      throw error;
    }
  })
);

// ============ A/B Testing Routes ============

/**
 * POST /api/ml-models/ab-tests
 * Creates an A/B test for models
 */
router.post(
  '/ab-tests',
  asyncHandler(async (req: Request, res: Response) => {
    const { name, modelIds, trafficAllocation, minSampleSize, primaryMetric, autoStart } = req.body;
    const userId = req.headers['x-user-id'] as string || 'anonymous';

    if (!name || !modelIds || !trafficAllocation) {
      res.status(400).json({ error: 'name, modelIds, and trafficAllocation are required' });
      return;
    }

    const abTest = await mlModelService.createABTest({
      name,
      modelIds,
      trafficAllocation,
      minSampleSize,
      primaryMetric,
      createdBy: userId,
      autoStart,
    });

    logger.info(`Created A/B test via API: ${abTest.id}`);
    res.status(201).json(abTest);
  })
);

/**
 * GET /api/ml-models/ab-tests
 * Lists all A/B tests
 */
router.get(
  '/ab-tests',
  asyncHandler(async (req: Request, res: Response) => {
    const status = req.query.status as string | undefined;
    const tests = await mlModelService.listABTests(status as any);
    res.json(tests);
  })
);

/**
 * GET /api/ml-models/ab-tests/:testId
 * Gets a specific A/B test
 */
router.get(
  '/ab-tests/:testId',
  asyncHandler(async (req: Request, res: Response) => {
    const testId = req.params.testId as string;
    const test = await mlModelService.getABTest(testId);
    
    if (!test) {
      res.status(404).json({ error: 'A/B test not found' });
      return;
    }
    
    res.json(test);
  })
);

/**
 * POST /api/ml-models/ab-tests/:testId/start
 * Starts an A/B test
 */
router.post(
  '/ab-tests/:testId/start',
  asyncHandler(async (req: Request, res: Response) => {
    const testId = req.params.testId as string;
    await mlModelService.startABTest(testId);
    res.json({ success: true, testId, status: 'running' });
  })
);

/**
 * POST /api/ml-models/ab-tests/:testId/stop
 * Stops an A/B test
 */
router.post(
  '/ab-tests/:testId/stop',
  asyncHandler(async (req: Request, res: Response) => {
    const testId = req.params.testId as string;
    await mlModelService.stopABTest(testId);
    res.json({ success: true, testId, status: 'completed' });
  })
);

/**
 * POST /api/ml-models/compare
 * Compares multiple models
 */
router.post(
  '/compare',
  asyncHandler(async (req: Request, res: Response) => {
    const { modelIds } = req.body;

    if (!modelIds || modelIds.length < 2) {
      res.status(400).json({ error: 'At least 2 modelIds are required' });
      return;
    }

    const comparison = await mlModelService.abTestModels(modelIds);
    res.json(comparison);
  })
);

export default router;
