/**
 * Training Job Management Service
 * Manages ML model training jobs, scheduling, execution, and progress tracking
 * Phase 2: Training Infrastructure
 */

import { prisma } from '../database/prisma';
import { logger } from '../utils/logger';
import { getTrainingDataCollectionService } from './training-data-collection.service';
import { MLModelService } from './ml-model.service';
import { getMLModelService } from './ml-model.service';

export type TrainingJobStatus = 'PENDING' | 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'PAUSED';
export type ExecutorType = 'local' | 'kubernetes' | 'sagemaker' | 'custom';

export interface TrainingJobConfig {
  framework: 'pytorch' | 'tensorflow' | 'transformers';
  modelType: string;
  hyperparameters: Record<string, unknown>;
  batchSize?: number;
  learningRate?: number;
  epochs?: number;
  validationSplit?: number;
  earlyStopping?: {
    patience: number;
    monitor: string;
    minDelta?: number;
  };
  callbacks?: Array<{
    type: string;
    config: Record<string, unknown>;
  }>;
}

export interface ResourceRequirements {
  cpu?: string; // e.g., "4", "2-8"
  memory?: string; // e.g., "8Gi", "4Gi-16Gi"
  gpu?: {
    count: number;
    type?: string; // e.g., "nvidia-tesla-v100"
  };
  disk?: string; // e.g., "100Gi"
}

export interface ExecutorConfig {
  image?: string;
  environment?: Record<string, string>;
  command?: string[];
  args?: string[];
  volumes?: Array<{
    name: string;
    mountPath: string;
    type: 'configMap' | 'secret' | 'pvc';
  }>;
}

export interface CreateTrainingJobOptions {
  name: string;
  description?: string;
  modelId: string;
  baseVersionId?: string;
  config: TrainingJobConfig;
  dataQuery?: Record<string, unknown>;
  dataPointIds?: string[];
  executorType?: ExecutorType;
  executorConfig?: ExecutorConfig;
  resourceRequirements?: ResourceRequirements;
  createdBy: string;
}

export interface TrainingJob {
  id: string;
  name: string;
  description?: string;
  modelId: string;
  baseVersionId?: string;
  config: TrainingJobConfig;
  dataQuery?: Record<string, unknown>;
  dataPointIds: string[];
  status: TrainingJobStatus;
  progress: number;
  currentEpoch?: number;
  totalEpochs?: number;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  errorMessage?: string;
  resultingVersionId?: string;
  trainingMetrics?: Record<string, unknown>;
  validationMetrics?: Record<string, unknown>;
  executorType: ExecutorType;
  executorConfig?: ExecutorConfig;
  resourceRequirements?: ResourceRequirements;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrainingProgress {
  epoch: number;
  totalEpochs: number;
  step: number;
  totalSteps: number;
  loss: number;
  validationLoss?: number;
  metrics?: Record<string, number>;
  timestamp: Date;
}

/**
 * Training Job Management Service
 */
export class TrainingJobService {
  private mlModelService: MLModelService;

  constructor() {
    this.mlModelService = getMLModelService();
  }

  /**
   * Creates a new training job
   */
  async createTrainingJob(options: CreateTrainingJobOptions): Promise<TrainingJob> {
    // Validate configuration
    this.validateTrainingConfig(options.config);

    // Create job record
    const job = await prisma.trainingJob.create({
      data: {
        name: options.name,
        description: options.description,
        modelId: options.modelId,
        baseVersionId: options.baseVersionId,
        config: options.config as any,
        dataQuery: options.dataQuery as any,
        dataPointIds: options.dataPointIds || [],
        status: 'PENDING',
        progress: 0,
        executorType: options.executorType || 'local',
        executorConfig: options.executorConfig as any,
        resourceRequirements: options.resourceRequirements as any,
        createdBy: options.createdBy,
      },
    });

    logger.info('Training job created', {
      jobId: job.id,
      modelId: options.modelId,
      executorType: job.executorType,
    });

    return this.mapToTrainingJob(job);
  }

  /**
   * Gets a training job by ID
   */
  async getTrainingJob(jobId: string): Promise<TrainingJob | null> {
    const job = await prisma.trainingJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return null;
    }

    return this.mapToTrainingJob(job);
  }

  /**
   * Lists training jobs with filters
   */
  async listTrainingJobs(options: {
    modelId?: string;
    status?: TrainingJobStatus;
    createdBy?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ jobs: TrainingJob[]; total: number }> {
    const where: any = {};

    if (options.modelId) {
      where.modelId = options.modelId;
    }

    if (options.status) {
      where.status = options.status;
    }

    if (options.createdBy) {
      where.createdBy = options.createdBy;
    }

    const [jobs, total] = await Promise.all([
      prisma.trainingJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options.limit || 50,
        skip: options.offset || 0,
      }),
      prisma.trainingJob.count({ where }),
    ]);

    return {
      jobs: jobs.map(job => this.mapToTrainingJob(job)),
      total,
    };
  }

  /**
   * Starts a training job
   */
  async startTrainingJob(jobId: string): Promise<TrainingJob> {
    const job = await prisma.trainingJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new Error(`Training job not found: ${jobId}`);
    }

    if (job.status !== 'PENDING' && job.status !== 'PAUSED') {
      throw new Error(`Cannot start job in status: ${job.status}`);
    }

    // Update status to QUEUED/RUNNING
    const updated = await prisma.trainingJob.update({
      where: { id: jobId },
      data: {
        status: 'QUEUED',
        startedAt: new Date(),
      },
    });

    logger.info('Training job started', { jobId });

    // Queue the job for execution (async)
    this.executeTrainingJob(jobId).catch((error) => {
      logger.error('Training job execution failed', { jobId, error });
    });

    return this.mapToTrainingJob(updated);
  }

  /**
   * Cancels a training job
   */
  async cancelTrainingJob(jobId: string): Promise<TrainingJob> {
    const job = await prisma.trainingJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new Error(`Training job not found: ${jobId}`);
    }

    if (job.status === 'COMPLETED' || job.status === 'FAILED' || job.status === 'CANCELLED') {
      throw new Error(`Cannot cancel job in status: ${job.status}`);
    }

    const updated = await prisma.trainingJob.update({
      where: { id: jobId },
      data: {
        status: 'CANCELLED',
      },
    });

    logger.info('Training job cancelled', { jobId });

    return this.mapToTrainingJob(updated);
  }

  /**
   * Updates training progress
   */
  async updateProgress(
    jobId: string,
    progress: {
      epoch?: number;
      totalEpochs?: number;
      progress?: number;
      metrics?: Record<string, unknown>;
    }
  ): Promise<void> {
    const updateData: any = {};

    if (progress.progress !== undefined) {
      updateData.progress = Math.max(0, Math.min(100, progress.progress));
    }

    if (progress.epoch !== undefined) {
      updateData.currentEpoch = progress.epoch;
    }

    if (progress.totalEpochs !== undefined) {
      updateData.totalEpochs = progress.totalEpochs;
    }

    if (progress.metrics) {
      // Store metrics in trainingMetrics field
      const job = await prisma.trainingJob.findUnique({
        where: { id: jobId },
      });

      const existingMetrics = (job?.trainingMetrics as Record<string, unknown>) || {};
      updateData.trainingMetrics = {
        ...existingMetrics,
        ...progress.metrics,
        lastUpdate: new Date().toISOString(),
      } as any;
    }

    await prisma.trainingJob.update({
      where: { id: jobId },
      data: updateData,
    });
  }

  /**
   * Completes a training job successfully
   */
  async completeTrainingJob(
    jobId: string,
    options: {
      resultingVersionId: string;
      trainingMetrics: Record<string, unknown>;
      validationMetrics?: Record<string, unknown>;
    }
  ): Promise<TrainingJob> {
    const updated = await prisma.trainingJob.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        progress: 100,
        completedAt: new Date(),
        resultingVersionId: options.resultingVersionId,
        trainingMetrics: options.trainingMetrics as any,
        validationMetrics: options.validationMetrics as any,
      },
    });

    logger.info('Training job completed', {
      jobId,
      resultingVersionId: options.resultingVersionId,
    });

    return this.mapToTrainingJob(updated);
  }

  /**
   * Marks a training job as failed
   */
  async failTrainingJob(jobId: string, errorMessage: string): Promise<TrainingJob> {
    const updated = await prisma.trainingJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        failedAt: new Date(),
        errorMessage,
      },
    });

    logger.error('Training job failed', { jobId, errorMessage });

    return this.mapToTrainingJob(updated);
  }

  /**
   * Executes a training job (orchestrates the training process)
   */
  private async executeTrainingJob(jobId: string): Promise<void> {
    const job = await prisma.trainingJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new Error(`Training job not found: ${jobId}`);
    }

    try {
      // Update status to RUNNING
      await prisma.trainingJob.update({
        where: { id: jobId },
        data: { status: 'RUNNING' },
      });

      // Fetch training data
      const trainingDataService = getTrainingDataCollectionService();
      const dataPoints = job.dataPointIds.length > 0
        ? await trainingDataService.queryTrainingData({
            // Query by specific IDs if provided
          })
        : await trainingDataService.queryTrainingData(job.dataQuery as any);

      logger.info('Training data fetched', {
        jobId,
        dataPointCount: dataPoints.length,
      });

      // Execute training based on executor type
      switch (job.executorType) {
        case 'local':
          await this.executeLocalTraining(jobId, job, dataPoints);
          break;
        case 'kubernetes':
          await this.executeKubernetesTraining(jobId, job);
          break;
        case 'sagemaker':
          await this.executeSageMakerTraining(jobId, job);
          break;
        default:
          throw new Error(`Unsupported executor type: ${job.executorType}`);
      }
    } catch (error) {
      await this.failTrainingJob(jobId, (error as Error).message);
      throw error;
    }
  }

  /**
   * Executes training locally (placeholder - would call actual training script)
   */
  private async executeLocalTraining(
    jobId: string,
    job: any,
    dataPoints: any[]
  ): Promise<void> {
    // This is a placeholder - in production, this would:
    // 1. Prepare training data
    // 2. Call training script (Python/PyTorch/TensorFlow)
    // 3. Monitor progress
    // 4. Save model artifacts
    // 5. Create model version

    logger.info('Starting local training execution', {
      jobId,
      framework: (job.config as any).framework,
    });

    // Simulate training progress
    const config = job.config as TrainingJobConfig;
    const epochs = config.epochs || 10;
    const totalSteps = dataPoints.length / (config.batchSize || 32);

    for (let epoch = 1; epoch <= epochs; epoch++) {
      // Update progress
      const progress = (epoch / epochs) * 100;
      await this.updateProgress(jobId, {
        epoch,
        totalEpochs: epochs,
        progress,
        metrics: {
          loss: Math.random() * 0.5 + 0.1, // Simulated loss
        },
      });

      // Simulate epoch duration
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Create model version from training
    // In production, this would load the saved model and create version
    const modelVersion = await this.mlModelService.createModelVersion({
      modelId: job.modelId,
      version: `v${Date.now()}`,
      description: `Trained from job: ${job.name}`,
      artifactPath: `/models/${job.modelId}/v${Date.now()}`,
      config: {
        type: (job.config as any).modelType,
        framework: (job.config as any).framework,
        hyperparameters: (job.config as any).hyperparameters,
      },
      trainingMetrics: {
        finalLoss: 0.1,
        epochs: epochs,
      },
      createdBy: job.createdBy,
    });

    await this.completeTrainingJob(jobId, {
      resultingVersionId: modelVersion.id,
      trainingMetrics: {
        finalLoss: 0.1,
        epochs: epochs,
      },
      validationMetrics: {
        validationLoss: 0.12,
        accuracy: 0.95,
      },
    });
  }

  /**
   * Executes training on Kubernetes (placeholder)
   */
  private async executeKubernetesTraining(jobId: string, job: any): Promise<void> {
    // Placeholder for Kubernetes execution
    logger.info('Kubernetes training execution not yet implemented', { jobId });
    throw new Error('Kubernetes training execution not yet implemented');
  }

  /**
   * Executes training on AWS SageMaker (placeholder)
   */
  private async executeSageMakerTraining(jobId: string, job: any): Promise<void> {
    // Placeholder for SageMaker execution
    logger.info('SageMaker training execution not yet implemented', { jobId });
    throw new Error('SageMaker training execution not yet implemented');
  }

  /**
   * Validates training configuration
   */
  private validateTrainingConfig(config: TrainingJobConfig): void {
    if (!config.framework) {
      throw new Error('Framework is required');
    }

    if (!['pytorch', 'tensorflow', 'transformers'].includes(config.framework)) {
      throw new Error(`Unsupported framework: ${config.framework}`);
    }

    if (!config.modelType) {
      throw new Error('Model type is required');
    }

    if (!config.hyperparameters || Object.keys(config.hyperparameters).length === 0) {
      throw new Error('Hyperparameters are required');
    }
  }

  /**
   * Maps Prisma model to TrainingJob interface
   */
  private mapToTrainingJob(job: any): TrainingJob {
    return {
      id: job.id,
      name: job.name,
      description: job.description || undefined,
      modelId: job.modelId,
      baseVersionId: job.baseVersionId || undefined,
      config: job.config as TrainingJobConfig,
      dataQuery: job.dataQuery as Record<string, unknown> | undefined,
      dataPointIds: job.dataPointIds || [],
      status: job.status as TrainingJobStatus,
      progress: job.progress,
      currentEpoch: job.currentEpoch || undefined,
      totalEpochs: job.totalEpochs || undefined,
      startedAt: job.startedAt || undefined,
      completedAt: job.completedAt || undefined,
      failedAt: job.failedAt || undefined,
      errorMessage: job.errorMessage || undefined,
      resultingVersionId: job.resultingVersionId || undefined,
      trainingMetrics: job.trainingMetrics as Record<string, unknown> | undefined,
      validationMetrics: job.validationMetrics as Record<string, unknown> | undefined,
      executorType: job.executorType as ExecutorType,
      executorConfig: job.executorConfig as ExecutorConfig | undefined,
      resourceRequirements: job.resourceRequirements as ResourceRequirements | undefined,
      createdBy: job.createdBy,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }
}

// Singleton instance
let trainingJobServiceInstance: TrainingJobService | null = null;

/**
 * Gets the singleton training job service instance
 */
export function getTrainingJobService(): TrainingJobService {
  if (!trainingJobServiceInstance) {
    trainingJobServiceInstance = new TrainingJobService();
  }
  return trainingJobServiceInstance;
}

