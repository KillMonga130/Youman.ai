/**
 * Training Data Collection Service
 * Collects and manages training data for ML model training
 * Collects (AI text, humanized text) pairs, user feedback, and quality metrics
 * Phase 2: Training Infrastructure
 */

import { prisma } from '../database/prisma';
import { logger } from '../utils/logger';
import { retrieveDocument } from '../storage/storage.service';
import { TransformStrategy, HumanizationLevel } from '../transform/types';

export interface TrainingDataPoint {
  id: string;
  originalText: string;
  humanizedText: string;
  transformationId: string;
  userId?: string;
  projectId?: string;
  strategy: TransformStrategy;
  level: HumanizationLevel;
  inputDetectionScore?: number;
  outputDetectionScore?: number;
  detectionScoreImprovement?: number;
  qualityScore?: number;
  userFeedback?: UserFeedback;
  metadata: TrainingDataMetadata;
  collectedAt: Date;
  usedInTraining?: string[]; // Model version IDs that used this data
}

export interface UserFeedback {
  rating?: number; // 1-5 scale
  accepted: boolean;
  comments?: string;
  specificChanges?: ChangeFeedback[];
}

export interface ChangeFeedback {
  changeId: string;
  accepted: boolean;
  reason?: string;
}

export interface TrainingDataMetadata {
  contentType?: string;
  language?: string;
  wordCount: number;
  processingTimeMs?: number;
  modelUsed?: string; // LLM or custom model ID
  qualityMetrics?: QualityMetrics;
}

export interface QualityMetrics {
  perplexityBefore?: number;
  perplexityAfter?: number;
  burstinessBefore?: number;
  burstinessAfter?: number;
  modificationPercentage?: number;
}

export interface TrainingDataCollectionOptions {
  transformationId: string;
  originalText: string;
  humanizedText: string;
  userId?: string;
  projectId?: string;
  strategy: TransformStrategy;
  level: HumanizationLevel;
  inputDetectionScore?: number;
  outputDetectionScore?: number;
  metadata?: Partial<TrainingDataMetadata>;
  userFeedback?: UserFeedback;
}

export interface TrainingDataQueryOptions {
  userId?: string;
  strategy?: TransformStrategy;
  level?: HumanizationLevel;
  minQualityScore?: number;
  minDetectionImprovement?: number;
  hasUserFeedback?: boolean;
  usedInTraining?: string; // Model version ID
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Training Data Collection Service
 * Handles collection, storage, and retrieval of training data
 */
export class TrainingDataCollectionService {
  private readonly MIN_TEXT_LENGTH = 50;
  private readonly MAX_TEXT_LENGTH = 50000;
  private readonly MIN_DETECTION_IMPROVEMENT = 5; // Minimum improvement to consider

  /**
   * Collects training data from a completed transformation
   */
  async collectTrainingData(
    options: TrainingDataCollectionOptions
  ): Promise<TrainingDataPoint> {
    // Validate inputs
    this.validateTrainingData(options);

    // Calculate metrics
    const detectionScoreImprovement =
      options.inputDetectionScore && options.outputDetectionScore
        ? options.inputDetectionScore - options.outputDetectionScore
        : undefined;

    const qualityScore = this.calculateQualityScore(
      options.inputDetectionScore,
      options.outputDetectionScore,
      options.userFeedback,
      options.metadata?.qualityMetrics
    );

    const metadata: TrainingDataMetadata = {
      wordCount: options.originalText.split(/\s+/).length,
      language: options.metadata?.language || 'en',
      contentType: options.metadata?.contentType,
      processingTimeMs: options.metadata?.processingTimeMs,
      modelUsed: options.metadata?.modelUsed,
      qualityMetrics: options.metadata?.qualityMetrics,
    };

    const dataPoint: TrainingDataPoint = {
      id: this.generateId('td'),
      originalText: options.originalText,
      humanizedText: options.humanizedText,
      transformationId: options.transformationId,
      userId: options.userId,
      projectId: options.projectId,
      strategy: options.strategy,
      level: options.level,
      inputDetectionScore: options.inputDetectionScore,
      outputDetectionScore: options.outputDetectionScore,
      detectionScoreImprovement,
      qualityScore,
      userFeedback: options.userFeedback,
      metadata,
      collectedAt: new Date(),
    };

    // Store in database (we'll use a simple storage mechanism for now)
    // In production, this would be stored in a dedicated training data table
    await this.storeTrainingDataPoint(dataPoint);

    logger.info('Training data collected', {
      dataPointId: dataPoint.id,
      transformationId: options.transformationId,
      detectionImprovement: detectionScoreImprovement,
      qualityScore,
    });

    return dataPoint;
  }

  /**
   * Collects training data from an existing transformation record
   */
  async collectFromTransformation(
    transformationId: string
  ): Promise<TrainingDataPoint | null> {
    try {
      // Fetch transformation record
      const transformation = await prisma.transformation.findUnique({
        where: { id: transformationId },
        include: { project: true },
      });

      if (!transformation || transformation.status !== 'COMPLETED') {
        logger.warn('Transformation not found or not completed', { transformationId });
        return null;
      }

      // Fetch input and output documents from MongoDB
      const inputDoc = await retrieveDocument(transformation.inputDocumentId);
      const outputDoc = transformation.outputDocumentId
        ? await retrieveDocument(transformation.outputDocumentId)
        : null;

      if (!inputDoc || !outputDoc) {
        logger.warn('Could not retrieve documents for transformation', { transformationId });
        return null;
      }

      // Documents store content as string, type indicates original vs transformed
      const originalText = inputDoc.content || '';
      const humanizedText = outputDoc.content || '';

      if (!originalText || !humanizedText) {
        logger.warn('Missing text content in documents', { transformationId });
        return null;
      }

      // Collect training data
      return await this.collectTrainingData({
        transformationId,
        originalText,
        humanizedText,
        userId: transformation.createdBy || undefined,
        projectId: transformation.projectId,
        strategy: this.mapStrategy(transformation.strategy),
        level: transformation.level as HumanizationLevel,
        inputDetectionScore: transformation.inputDetectionScore || undefined,
        outputDetectionScore: transformation.outputDetectionScore || undefined,
        metadata: {
          language: transformation.language,
          wordCount: transformation.inputWordCount,
          processingTimeMs: transformation.processingTimeMs || undefined,
          qualityMetrics: {
            perplexityBefore: transformation.inputPerplexity || undefined,
            perplexityAfter: transformation.outputPerplexity || undefined,
            burstinessBefore: transformation.inputBurstiness || undefined,
            burstinessAfter: transformation.outputBurstiness || undefined,
            modificationPercentage: transformation.modifiedPercentage || undefined,
          },
        },
      });
    } catch (error) {
      logger.error('Failed to collect training data from transformation', {
        transformationId,
        error,
      });
      return null;
    }
  }

  /**
   * Adds user feedback to an existing training data point
   */
  async addUserFeedback(
    dataPointId: string,
    feedback: UserFeedback
  ): Promise<TrainingDataPoint | null> {
    const dataPoint = await this.getTrainingDataPoint(dataPointId);
    if (!dataPoint) {
      throw new Error(`Training data point not found: ${dataPointId}`);
    }

    // Update quality score based on feedback
    const updatedQualityScore = this.calculateQualityScore(
      dataPoint.inputDetectionScore,
      dataPoint.outputDetectionScore,
      feedback,
      dataPoint.metadata.qualityMetrics
    );

    dataPoint.userFeedback = feedback;
    dataPoint.qualityScore = updatedQualityScore;

    await this.storeTrainingDataPoint(dataPoint);

    logger.info('User feedback added to training data', {
      dataPointId,
      rating: feedback.rating,
      accepted: feedback.accepted,
    });

    return dataPoint;
  }

  /**
   * Queries training data based on criteria
   */
  async queryTrainingData(
    options: TrainingDataQueryOptions = {}
  ): Promise<TrainingDataPoint[]> {
    // In production, this would query a dedicated training data table
    // For now, we'll return all stored data points (limited)
    const allDataPoints = await this.getAllTrainingDataPoints();

    // Filter based on criteria
    let filtered = allDataPoints;

    if (options.userId) {
      filtered = filtered.filter((dp) => dp.userId === options.userId);
    }

    if (options.strategy) {
      filtered = filtered.filter((dp) => dp.strategy === options.strategy);
    }

    if (options.level) {
      filtered = filtered.filter((dp) => dp.level === options.level);
    }

    if (options.minQualityScore !== undefined) {
      filtered = filtered.filter(
        (dp) => (dp.qualityScore || 0) >= options.minQualityScore!
      );
    }

    if (options.minDetectionImprovement !== undefined) {
      filtered = filtered.filter(
        (dp) =>
          (dp.detectionScoreImprovement || 0) >= options.minDetectionImprovement!
      );
    }

    if (options.hasUserFeedback) {
      filtered = filtered.filter((dp) => !!dp.userFeedback);
    }

    if (options.usedInTraining) {
      filtered = filtered.filter(
        (dp) => dp.usedInTraining?.includes(options.usedInTraining!)
      );
    }

    if (options.startDate) {
      filtered = filtered.filter((dp) => dp.collectedAt >= options.startDate!);
    }

    if (options.endDate) {
      filtered = filtered.filter((dp) => dp.collectedAt <= options.endDate!);
    }

    // Apply pagination
    const offset = options.offset || 0;
    const limit = options.limit || 1000;
    const paginated = filtered.slice(offset, offset + limit);

    return paginated;
  }

  /**
   * Gets statistics about collected training data
   */
  async getTrainingDataStatistics(): Promise<{
    totalDataPoints: number;
    withUserFeedback: number;
    averageQualityScore: number;
    averageDetectionImprovement: number;
    byStrategy: Record<string, number>;
    byLevel: Record<string, number>;
  }> {
    const allDataPoints = await this.getAllTrainingDataPoints();

    const withFeedback = allDataPoints.filter((dp) => !!dp.userFeedback);
    const qualityScores = allDataPoints
      .map((dp) => dp.qualityScore || 0)
      .filter((score) => score > 0);
    const improvements = allDataPoints
      .map((dp) => dp.detectionScoreImprovement || 0)
      .filter((imp) => imp > 0);

    const byStrategy: Record<string, number> = {};
    const byLevel: Record<string, number> = {};

    allDataPoints.forEach((dp) => {
      byStrategy[dp.strategy] = (byStrategy[dp.strategy] || 0) + 1;
      byLevel[`level-${dp.level}`] = (byLevel[`level-${dp.level}`] || 0) + 1;
    });

    return {
      totalDataPoints: allDataPoints.length,
      withUserFeedback: withFeedback.length,
      averageQualityScore:
        qualityScores.length > 0
          ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
          : 0,
      averageDetectionImprovement:
        improvements.length > 0
          ? improvements.reduce((a, b) => a + b, 0) / improvements.length
          : 0,
      byStrategy,
      byLevel,
    };
  }

  /**
   * Exports training data in format suitable for model training
   */
  async exportTrainingData(
    options: TrainingDataQueryOptions = {}
  ): Promise<{
    dataPoints: Array<{
      input: string;
      output: string;
      metadata: Record<string, unknown>;
    }>;
    format: 'jsonl' | 'csv' | 'json';
  }> {
    const dataPoints = await this.queryTrainingData(options);

    const exported = dataPoints.map((dp) => ({
      input: dp.originalText,
      output: dp.humanizedText,
      metadata: {
        strategy: dp.strategy,
        level: dp.level,
        inputDetectionScore: dp.inputDetectionScore,
        outputDetectionScore: dp.outputDetectionScore,
        detectionImprovement: dp.detectionScoreImprovement,
        qualityScore: dp.qualityScore,
        hasUserFeedback: !!dp.userFeedback,
        wordCount: dp.metadata.wordCount,
        language: dp.metadata.language,
      },
    }));

    return {
      dataPoints: exported,
      format: 'json',
    };
  }

  // ============ Private Methods ============

  /**
   * Validates training data before collection
   */
  private validateTrainingData(options: TrainingDataCollectionOptions): void {
    if (!options.originalText || options.originalText.trim().length < this.MIN_TEXT_LENGTH) {
      throw new Error(
        `Original text must be at least ${this.MIN_TEXT_LENGTH} characters`
      );
    }

    if (!options.humanizedText || options.humanizedText.trim().length < this.MIN_TEXT_LENGTH) {
      throw new Error(
        `Humanized text must be at least ${this.MIN_TEXT_LENGTH} characters`
      );
    }

    if (options.originalText.length > this.MAX_TEXT_LENGTH) {
      throw new Error(
        `Original text exceeds maximum length of ${this.MAX_TEXT_LENGTH} characters`
      );
    }

    if (options.humanizedText.length > this.MAX_TEXT_LENGTH) {
      throw new Error(
        `Humanized text exceeds maximum length of ${this.MAX_TEXT_LENGTH} characters`
      );
    }
  }

  /**
   * Calculates a quality score for training data point
   */
  private calculateQualityScore(
    inputDetectionScore?: number,
    outputDetectionScore?: number,
    userFeedback?: UserFeedback,
    qualityMetrics?: QualityMetrics
  ): number {
    let score = 0;
    let factors = 0;

    // Detection improvement factor (0-50 points)
    if (
      inputDetectionScore !== undefined &&
      outputDetectionScore !== undefined
    ) {
      const improvement = inputDetectionScore - outputDetectionScore;
      const improvementScore = Math.min(50, (improvement / 50) * 50);
      score += improvementScore;
      factors += 1;
    }

    // User feedback factor (0-30 points)
    if (userFeedback) {
      if (userFeedback.accepted) {
        score += 20;
      }
      if (userFeedback.rating !== undefined) {
        score += (userFeedback.rating / 5) * 10;
      }
      factors += 1;
    }

    // Quality metrics factor (0-20 points)
    if (qualityMetrics) {
      if (qualityMetrics.perplexityAfter && qualityMetrics.perplexityBefore) {
        const perplexityImprovement =
          qualityMetrics.perplexityBefore - qualityMetrics.perplexityAfter;
        if (perplexityImprovement > 0) {
          score += Math.min(10, perplexityImprovement / 10);
        }
      }
      if (qualityMetrics.burstinessAfter && qualityMetrics.burstinessBefore) {
        const burstinessImprovement =
          qualityMetrics.burstinessAfter - qualityMetrics.burstinessBefore;
        if (burstinessImprovement > 0) {
          score += Math.min(10, burstinessImprovement / 10);
        }
      }
      factors += 1;
    }

    // Normalize to 0-100 scale
    return factors > 0 ? Math.min(100, score) : 50; // Default to 50 if no factors
  }

  /**
   * Maps database strategy enum to TransformStrategy type
   */
  private mapStrategy(dbStrategy: string): TransformStrategy {
    const mapping: Record<string, TransformStrategy> = {
      AUTO: 'auto',
      CASUAL: 'casual',
      PROFESSIONAL: 'professional',
      ACADEMIC: 'academic',
    };
    return mapping[dbStrategy] || 'auto';
  }

  /**
   * Generates a unique ID for training data point
   */
  private generateId(prefix: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Stores training data point (placeholder - would use database in production)
   */
  private async storeTrainingDataPoint(dataPoint: TrainingDataPoint): Promise<void> {
    // TODO: In production, store in a dedicated training_data table
    // For now, we'll use a simple in-memory store or file system
    // This is a placeholder that would be replaced with actual database storage
    
    // In production implementation:
    // await prisma.trainingDataPoint.create({ data: { ... } });
    
    logger.debug('Training data point stored', { dataPointId: dataPoint.id });
  }

  /**
   * Retrieves training data point by ID
   */
  private async getTrainingDataPoint(id: string): Promise<TrainingDataPoint | null> {
    // TODO: Query from database
    // For now, return null as placeholder
    return null;
  }

  /**
   * Gets all training data points (placeholder)
   */
  private async getAllTrainingDataPoints(): Promise<TrainingDataPoint[]> {
    // TODO: Query all from database
    // For now, return empty array as placeholder
    return [];
  }
}

// Singleton instance
let trainingDataCollectionServiceInstance: TrainingDataCollectionService | null = null;

/**
 * Gets the singleton training data collection service instance
 */
export function getTrainingDataCollectionService(): TrainingDataCollectionService {
  if (!trainingDataCollectionServiceInstance) {
    trainingDataCollectionServiceInstance = new TrainingDataCollectionService();
  }
  return trainingDataCollectionServiceInstance;
}

