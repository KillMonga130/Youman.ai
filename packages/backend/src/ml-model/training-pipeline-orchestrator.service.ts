/**
 * Training Pipeline Orchestrator Service
 * Orchestrates the complete training workflow: job scheduling, execution, progress tracking, validation
 * Phase 2: Training Pipeline Orchestration
 */

import { logger } from '../utils/logger';
import { getTrainingJobService, TrainingJob, TrainingJobStatus } from './training-job.service';
import { getModelArtifactStorageService } from './model-artifact-storage.service';
import { getModelRegistryService } from './model-registry.service';
import { getMLModelService } from './ml-model.service';
import { getTrainingDataCollectionService } from './training-data-collection.service';

export interface TrainingPipelineConfig {
  maxConcurrentJobs?: number;
  defaultResourceRequirements?: {
    cpu: string;
    memory: string;
    gpu?: { count: number; type?: string };
  };
  autoValidationEnabled?: boolean;
  validationThresholds?: {
    minAccuracy?: number;
    maxLoss?: number;
    minDetectionImprovement?: number;
  };
}

export interface ValidationResult {
  passed: boolean;
  score: number;
  metrics: Record<string, number>;
  errors: string[];
  warnings: string[];
}

/**
 * Training Pipeline Orchestrator Service
 * Coordinates training jobs, scheduling, execution, and validation
 */
export class TrainingPipelineOrchestratorService {
  private config: TrainingPipelineConfig;
  private jobQueue: string[] = [];
  private runningJobs: Set<string> = new Set();
  private maxConcurrentJobs: number;

  constructor(config?: TrainingPipelineConfig) {
    this.config = {
      maxConcurrentJobs: 3,
      autoValidationEnabled: true,
      validationThresholds: {
        minAccuracy: 0.85,
        maxLoss: 0.5,
        minDetectionImprovement: 5,
      },
      ...config,
    };
    this.maxConcurrentJobs = this.config.maxConcurrentJobs || 3;
  }

  /**
   * Submits a training job to the pipeline
   */
  async submitTrainingJob(jobId: string): Promise<void> {
    const trainingJobService = getTrainingJobService();
    const job = await trainingJobService.getTrainingJob(jobId);

    if (!job) {
      throw new Error(`Training job not found: ${jobId}`);
    }

    if (job.status !== 'PENDING') {
      throw new Error(`Job is not in PENDING status: ${job.status}`);
    }

    // Add to queue
    this.jobQueue.push(jobId);
    logger.info('Training job submitted to pipeline', { jobId, queuePosition: this.jobQueue.length });

    // Process queue
    this.processQueue();
  }

  /**
   * Processes the job queue
   */
  private async processQueue(): Promise<void> {
    // Don't process if at capacity
    if (this.runningJobs.size >= this.maxConcurrentJobs) {
      return;
    }

    // Process next job in queue
    if (this.jobQueue.length === 0) {
      return;
    }

    const jobId = this.jobQueue.shift();
    if (!jobId) {
      return;
    }

    // Start job execution
    this.runningJobs.add(jobId);
    this.executeTrainingPipeline(jobId)
      .then(() => {
        this.runningJobs.delete(jobId);
        logger.info('Training job completed in pipeline', { jobId });
      })
      .catch((error) => {
        this.runningJobs.delete(jobId);
        logger.error('Training job failed in pipeline', { jobId, error });
      })
      .finally(() => {
        // Process next job
        this.processQueue();
      });
  }

  /**
   * Executes the complete training pipeline
   */
  private async executeTrainingPipeline(jobId: string): Promise<void> {
    const trainingJobService = getTrainingJobService();
    const artifactStorageService = getModelArtifactStorageService();
    const modelRegistryService = getModelRegistryService();
    const mlModelService = getMLModelService();
    const trainingDataService = getTrainingDataCollectionService();

    try {
      // Step 1: Start the training job
      logger.info('Starting training pipeline', { jobId, step: 1 });
      await trainingJobService.startTrainingJob(jobId);
      const job = await trainingJobService.getTrainingJob(jobId);
      if (!job) {
        throw new Error('Job not found after starting');
      }

      // Step 2: Validate training data availability
      logger.info('Validating training data', { jobId, step: 2 });
      const dataPoints = job.dataPointIds.length > 0
        ? await trainingDataService.queryTrainingData({})
        : await trainingDataService.queryTrainingData(job.dataQuery as any);

      if (dataPoints.length === 0) {
        throw new Error('No training data available');
      }

      logger.info('Training data validated', { jobId, dataPointCount: dataPoints.length });

      // Step 3: Execute training (this will update progress internally)
      logger.info('Executing training', { jobId, step: 3 });
      
      // The training job service handles actual execution
      // We'll monitor progress here
      await this.monitorTrainingProgress(jobId);

      // Step 4: Validate training results
      logger.info('Validating training results', { jobId, step: 4 });
      const updatedJob = await trainingJobService.getTrainingJob(jobId);
      if (!updatedJob) {
        throw new Error('Job not found after training');
      }

      if (updatedJob.status !== 'COMPLETED') {
        throw new Error(`Training did not complete successfully: ${updatedJob.status}`);
      }

      const validationResult = await this.validateTrainingResults(updatedJob);
      
      if (!validationResult.passed && this.config.autoValidationEnabled) {
        logger.warn('Training validation failed', { jobId, validationResult });
        // Optionally fail the job or mark it as needing review
      }

      // Step 5: Register model artifacts
      if (updatedJob.resultingVersionId) {
        logger.info('Registering model artifacts', { jobId, step: 5, versionId: updatedJob.resultingVersionId });
        
        // In production, artifacts would be uploaded during training
        // Here we would register them with the artifact storage service
        const modelVersion = await mlModelService.getModelVersion(updatedJob.resultingVersionId);
        if (modelVersion && modelVersion.artifactPath) {
          // Artifact should already be stored, we just verify registration
          logger.info('Model artifact registered', { jobId, artifactPath: modelVersion.artifactPath });
        }
      }

      // Step 6: Update model registry
      logger.info('Updating model registry', { jobId, step: 6 });
      const registryEntry = await modelRegistryService.getModel(job.modelId);
      if (!registryEntry) {
        // Create registry entry if it doesn't exist
        await modelRegistryService.createOrUpdateModel({
          modelId: job.modelId,
          name: job.modelId,
          modelType: (job.config as any).modelType || 'transformer',
          framework: (job.config as any).framework || 'pytorch',
          createdBy: job.createdBy,
        });
      }

      logger.info('Training pipeline completed successfully', { jobId });

    } catch (error) {
      logger.error('Training pipeline execution failed', { jobId, error });
      await trainingJobService.failTrainingJob(jobId, (error as Error).message);
      throw error;
    }
  }

  /**
   * Monitors training progress
   */
  private async monitorTrainingProgress(jobId: string): Promise<void> {
    const trainingJobService = getTrainingJobService();
    const maxWaitTime = 3600000; // 1 hour
    const checkInterval = 5000; // 5 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const job = await trainingJobService.getTrainingJob(jobId);
      if (!job) {
        throw new Error('Job not found during monitoring');
      }

      if (job.status === 'COMPLETED' || job.status === 'FAILED' || job.status === 'CANCELLED') {
        return;
      }

      // Log progress
      if (job.progress > 0) {
        logger.debug('Training progress', {
          jobId,
          progress: job.progress,
          epoch: job.currentEpoch,
          totalEpochs: job.totalEpochs,
        });
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    throw new Error('Training job exceeded maximum wait time');
  }

  /**
   * Validates training results
   */
  private async validateTrainingResults(job: TrainingJob): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 0;
    let passed = true;

    const thresholds = this.config.validationThresholds || {};

    // Validate training metrics
    if (job.trainingMetrics) {
      const metrics = job.trainingMetrics as Record<string, unknown>;

      // Check loss
      if (metrics.finalLoss !== undefined) {
        const loss = metrics.finalLoss as number;
        if (thresholds.maxLoss && loss > thresholds.maxLoss) {
          errors.push(`Final loss (${loss}) exceeds threshold (${thresholds.maxLoss})`);
          passed = false;
        } else {
          score += 30; // Loss is acceptable
        }
      }

      // Check accuracy if available
      if (metrics.accuracy !== undefined) {
        const accuracy = metrics.accuracy as number;
        if (thresholds.minAccuracy && accuracy < thresholds.minAccuracy) {
          warnings.push(`Accuracy (${accuracy}) is below threshold (${thresholds.minAccuracy})`);
        } else {
          score += 40; // Accuracy is acceptable
        }
      }
    }

    // Validate validation metrics
    if (job.validationMetrics) {
      const valMetrics = job.validationMetrics as Record<string, unknown>;

      if (valMetrics.validationLoss !== undefined) {
        const valLoss = valMetrics.validationLoss as number;
        if (valLoss > (thresholds.maxLoss || 0.5)) {
          warnings.push(`Validation loss (${valLoss}) is high`);
        } else {
          score += 30; // Validation loss is acceptable
        }
      }
    }

    // Check if resulting version exists
    if (!job.resultingVersionId) {
      errors.push('No resulting model version created');
      passed = false;
    } else {
      score += 20; // Version was created
    }

    return {
      passed,
      score: Math.min(100, score),
      metrics: {
        ...(job.trainingMetrics as Record<string, number> || {}),
        ...(job.validationMetrics as Record<string, number> || {}),
      },
      errors,
      warnings,
    };
  }

  /**
   * Gets pipeline status
   */
  getPipelineStatus(): {
    queueLength: number;
    runningJobs: number;
    maxConcurrentJobs: number;
    queue: string[];
    running: string[];
  } {
    return {
      queueLength: this.jobQueue.length,
      runningJobs: this.runningJobs.size,
      maxConcurrentJobs: this.maxConcurrentJobs,
      queue: [...this.jobQueue],
      running: Array.from(this.runningJobs),
    };
  }

  /**
   * Cancels a job in the pipeline
   */
  async cancelJob(jobId: string): Promise<void> {
    // Remove from queue if pending
    const queueIndex = this.jobQueue.indexOf(jobId);
    if (queueIndex !== -1) {
      this.jobQueue.splice(queueIndex, 1);
      logger.info('Job removed from queue', { jobId });
    }

    // Cancel if running
    if (this.runningJobs.has(jobId)) {
      this.runningJobs.delete(jobId);
      const trainingJobService = getTrainingJobService();
      await trainingJobService.cancelTrainingJob(jobId);
      logger.info('Running job cancelled', { jobId });
    }
  }
}

// Singleton instance
let trainingPipelineOrchestratorServiceInstance: TrainingPipelineOrchestratorService | null = null;

/**
 * Gets the singleton training pipeline orchestrator service instance
 */
export function getTrainingPipelineOrchestratorService(): TrainingPipelineOrchestratorService {
  if (!trainingPipelineOrchestratorServiceInstance) {
    trainingPipelineOrchestratorServiceInstance = new TrainingPipelineOrchestratorService();
  }
  return trainingPipelineOrchestratorServiceInstance;
}

