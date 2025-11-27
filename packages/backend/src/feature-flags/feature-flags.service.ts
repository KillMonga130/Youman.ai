/**
 * Feature Flag Service
 * Provides experiment management, user bucketing, conversion tracking, and feature rollouts
 * Requirements: 87
 */

import crypto from 'crypto';
import { logger } from '../utils/logger';
import {
  Experiment,
  ExperimentStatus,
  Variant,
  UserAssignment,
  ConversionEvent,
  ExperimentResults,
  VariantStats,
  FeatureFlag,
  FeatureFlagStatus,
  FlagEvaluation,
  CreateExperimentOptions,
  CreateFeatureFlagOptions,
  TrackConversionOptions,
  FeatureFlagServiceConfig,
} from './types';

/** Default configuration */
const DEFAULT_CONFIG: FeatureFlagServiceConfig = {
  defaultConfidenceLevel: 0.95,
  defaultMinSampleSize: 100,
  hashSeed: 'feature-flag-seed',
  maxExperimentsPerUser: 10,
  maxVariantsPerExperiment: 10,
};

/**
 * Feature Flag Service class
 * Handles experiment management, user bucketing, and feature rollouts
 */
export class FeatureFlagService {
  private config: FeatureFlagServiceConfig;
  private experiments: Map<string, Experiment>;
  private featureFlags: Map<string, FeatureFlag>;
  private userAssignments: Map<string, UserAssignment[]>;
  private conversionEvents: Map<string, ConversionEvent[]>;

  constructor(serviceConfig?: Partial<FeatureFlagServiceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...serviceConfig };
    this.experiments = new Map();
    this.featureFlags = new Map();
    this.userAssignments = new Map();
    this.conversionEvents = new Map();
  }

  // ============ Experiment Management ============

  /**
   * Creates a new experiment
   * Requirement 87: A/B testing and feature rollouts
   * @param options - Experiment creation options
   * @returns Created experiment
   */
  async createExperiment(options: CreateExperimentOptions): Promise<Experiment> {
    // Validate variants
    if (!options.variants || options.variants.length < 2) {
      throw new Error('At least 2 variants are required for an experiment');
    }

    if (options.variants.length > this.config.maxVariantsPerExperiment) {
      throw new Error(`Maximum ${this.config.maxVariantsPerExperiment} variants allowed`);
    }

    // Validate weights sum to 100
    const totalWeight = options.variants.reduce((sum, v) => sum + v.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      throw new Error('Variant weights must sum to 100');
    }

    const id = this.generateId('exp');
    const now = new Date();

    // Create variants with IDs
    const variants: Variant[] = options.variants.map((v, index) => ({
      ...v,
      id: this.generateId(`var_${index}`),
    }));

    const experiment: Experiment = {
      id,
      name: options.name,
      description: options.description,
      variants,
      targetSegments: options.targetSegments,
      status: options.autoStart ? 'running' : 'draft',
      startDate: options.startDate || now,
      endDate: options.endDate,
      createdBy: options.createdBy,
      createdAt: now,
      updatedAt: now,
      metrics: options.metrics || ['conversion'],
      minSampleSize: options.minSampleSize || this.config.defaultMinSampleSize,
    };

    this.experiments.set(id, experiment);
    logger.info(`Created experiment: ${id} with ${variants.length} variants`);

    return experiment;
  }

  /**
   * Gets an experiment by ID
   * @param experimentId - Experiment identifier
   * @returns Experiment or null
   */
  async getExperiment(experimentId: string): Promise<Experiment | null> {
    return this.experiments.get(experimentId) || null;
  }

  /**
   * Lists all experiments
   * @param status - Optional status filter
   * @returns Array of experiments
   */
  async listExperiments(status?: ExperimentStatus): Promise<Experiment[]> {
    const experiments = Array.from(this.experiments.values());
    if (status) {
      return experiments.filter(e => e.status === status);
    }
    return experiments;
  }

  /**
   * Updates experiment status
   * @param experimentId - Experiment identifier
   * @param status - New status
   */
  async updateExperimentStatus(experimentId: string, status: ExperimentStatus): Promise<void> {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment not found: ${experimentId}`);
    }

    experiment.status = status;
    experiment.updatedAt = new Date();

    if (status === 'completed') {
      experiment.endDate = new Date();
    }

    logger.info(`Updated experiment ${experimentId} status to ${status}`);
  }

  // ============ User Bucketing ============

  /**
   * Assigns a user to a variant in an experiment
   * Requirement 87: User bucketing
   * @param userId - User identifier
   * @param experimentId - Experiment identifier
   * @returns Assigned variant ID
   */
  async assignUserToVariant(userId: string, experimentId: string): Promise<string> {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment not found: ${experimentId}`);
    }

    if (experiment.status !== 'running') {
      throw new Error(`Experiment is not running: ${experimentId}`);
    }

    // Check for existing assignment
    const existingAssignment = this.getUserAssignment(userId, experimentId);
    if (existingAssignment) {
      return existingAssignment.variantId;
    }

    // Check segment targeting
    if (experiment.targetSegments && experiment.targetSegments.length > 0) {
      // In production, check if user belongs to target segments
      // For now, we'll allow all users
    }

    // Deterministic bucketing using hash
    const variantId = this.bucketUser(userId, experiment);

    // Store assignment
    const assignment: UserAssignment = {
      userId,
      experimentId,
      variantId,
      assignedAt: new Date(),
      method: 'random',
    };

    const userAssignments = this.userAssignments.get(userId) || [];
    userAssignments.push(assignment);
    this.userAssignments.set(userId, userAssignments);

    logger.debug(`Assigned user ${userId} to variant ${variantId} in experiment ${experimentId}`);
    return variantId;
  }

  /**
   * Gets a user's assignment for an experiment
   * @param userId - User identifier
   * @param experimentId - Experiment identifier
   * @returns User assignment or null
   */
  getUserAssignment(userId: string, experimentId: string): UserAssignment | null {
    const assignments = this.userAssignments.get(userId) || [];
    return assignments.find(a => a.experimentId === experimentId) || null;
  }

  /**
   * Gets all assignments for a user
   * @param userId - User identifier
   * @returns Array of user assignments
   */
  getUserAssignments(userId: string): UserAssignment[] {
    return this.userAssignments.get(userId) || [];
  }

  // ============ Conversion Tracking ============

  /**
   * Tracks a conversion event
   * Requirement 87: Conversion tracking
   * @param options - Conversion tracking options
   */
  async trackConversion(options: TrackConversionOptions): Promise<void> {
    const experiment = this.experiments.get(options.experimentId);
    if (!experiment) {
      throw new Error(`Experiment not found: ${options.experimentId}`);
    }

    // Get user's variant assignment
    const assignment = this.getUserAssignment(options.userId, options.experimentId);
    if (!assignment) {
      throw new Error(`User ${options.userId} is not assigned to experiment ${options.experimentId}`);
    }

    const event: ConversionEvent = {
      id: this.generateId('conv'),
      userId: options.userId,
      experimentId: options.experimentId,
      variantId: assignment.variantId,
      metric: options.metric,
      value: options.value ?? 1,
      timestamp: new Date(),
      metadata: options.metadata,
    };

    const events = this.conversionEvents.get(options.experimentId) || [];
    events.push(event);
    this.conversionEvents.set(options.experimentId, events);

    logger.debug(`Tracked conversion for user ${options.userId} in experiment ${options.experimentId}`);
  }

  // ============ Statistical Analysis ============

  /**
   * Analyzes experiment results
   * Requirement 87: Statistical analysis
   * @param experimentId - Experiment identifier
   * @returns Experiment results
   */
  async analyzeResults(experimentId: string): Promise<ExperimentResults> {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment not found: ${experimentId}`);
    }

    const events = this.conversionEvents.get(experimentId) || [];
    const assignments = this.getAllAssignmentsForExperiment(experimentId);

    // Calculate stats per variant
    const variantStats: VariantStats[] = [];
    let controlStats: VariantStats | null = null;

    for (const variant of experiment.variants) {
      const variantAssignments = assignments.filter(a => a.variantId === variant.id);
      const variantEvents = events.filter(e => e.variantId === variant.id);

      const sampleSize = variantAssignments.length;
      const conversions = variantEvents.length;
      const conversionRate = sampleSize > 0 ? conversions / sampleSize : 0;

      const values = variantEvents.map(e => e.value);
      const averageValue = values.length > 0 
        ? values.reduce((a, b) => a + b, 0) / values.length 
        : 0;
      const standardDeviation = this.calculateStdDev(values);

      // Calculate confidence interval (95%)
      const z = 1.96; // 95% confidence
      const standardError = sampleSize > 0 ? Math.sqrt((conversionRate * (1 - conversionRate)) / sampleSize) : 0;
      const confidenceIntervalLower = Math.max(0, conversionRate - z * standardError);
      const confidenceIntervalUpper = Math.min(1, conversionRate + z * standardError);

      const stats: VariantStats = {
        variantId: variant.id,
        variantName: variant.name,
        sampleSize,
        conversions,
        conversionRate,
        averageValue,
        standardDeviation,
        confidenceIntervalLower,
        confidenceIntervalUpper,
      };

      variantStats.push(stats);

      // First variant is typically control
      if (!controlStats) {
        controlStats = stats;
      }
    }

    // Calculate statistical significance
    const { isSignificant, pValue, winningVariant, lift } = this.calculateSignificance(
      variantStats,
      controlStats,
      experiment.minSampleSize
    );

    const totalParticipants = assignments.length;
    const totalConversions = events.length;

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      experiment,
      variantStats,
      isSignificant,
      totalParticipants
    );

    return {
      experimentId,
      experimentName: experiment.name,
      status: experiment.status,
      totalParticipants,
      totalConversions,
      variantStats,
      winningVariant: isSignificant ? winningVariant : undefined,
      isStatisticallySignificant: isSignificant,
      pValue,
      confidenceLevel: this.config.defaultConfidenceLevel,
      lift,
      analyzedAt: new Date(),
      recommendations,
    };
  }

  // ============ Feature Flags ============

  /**
   * Creates a feature flag
   * Requirement 87: Percentage-based rollouts
   * @param options - Feature flag creation options
   * @returns Created feature flag
   */
  async createFeatureFlag(options: CreateFeatureFlagOptions): Promise<FeatureFlag> {
    // Check for duplicate key
    const existingFlag = Array.from(this.featureFlags.values()).find(f => f.key === options.key);
    if (existingFlag) {
      throw new Error(`Feature flag with key "${options.key}" already exists`);
    }

    const id = this.generateId('flag');
    const now = new Date();

    const flag: FeatureFlag = {
      id,
      key: options.key,
      name: options.name,
      description: options.description,
      status: options.status || 'disabled',
      rolloutPercentage: options.rolloutPercentage ?? 0,
      targetSegments: options.targetSegments,
      userOverrides: new Map(),
      defaultValue: options.defaultValue ?? false,
      createdAt: now,
      updatedAt: now,
      createdBy: options.createdBy,
      tags: options.tags,
    };

    this.featureFlags.set(id, flag);
    logger.info(`Created feature flag: ${id} (${options.key})`);

    return flag;
  }

  /**
   * Gets a feature flag by ID
   * @param flagId - Feature flag identifier
   * @returns Feature flag or null
   */
  async getFeatureFlag(flagId: string): Promise<FeatureFlag | null> {
    return this.featureFlags.get(flagId) || null;
  }

  /**
   * Gets a feature flag by key
   * @param key - Feature flag key
   * @returns Feature flag or null
   */
  async getFeatureFlagByKey(key: string): Promise<FeatureFlag | null> {
    return Array.from(this.featureFlags.values()).find(f => f.key === key) || null;
  }

  /**
   * Lists all feature flags
   * @returns Array of feature flags
   */
  async listFeatureFlags(): Promise<FeatureFlag[]> {
    return Array.from(this.featureFlags.values());
  }

  /**
   * Evaluates a feature flag for a user
   * Requirement 87: Percentage-based rollouts
   * @param key - Feature flag key
   * @param userId - User identifier
   * @returns Flag evaluation result
   */
  async evaluateFlag(key: string, userId: string): Promise<FlagEvaluation> {
    const flag = await this.getFeatureFlagByKey(key);
    
    if (!flag) {
      return {
        key,
        value: false,
        reason: 'default',
      };
    }

    // Check if flag is disabled
    if (flag.status === 'disabled') {
      return {
        key,
        value: flag.defaultValue,
        reason: 'disabled',
      };
    }

    // Check user override
    if (flag.userOverrides.has(userId)) {
      return {
        key,
        value: flag.userOverrides.get(userId)!,
        reason: 'override',
      };
    }

    // Check segment targeting
    if (flag.targetSegments && flag.targetSegments.length > 0) {
      // In production, check if user belongs to target segments
      // For now, we'll proceed to percentage check
    }

    // Percentage-based rollout
    if (flag.status === 'percentage_rollout') {
      const bucket = this.getUserBucket(userId, key);
      const isEnabled = bucket < flag.rolloutPercentage;
      
      return {
        key,
        value: isEnabled,
        reason: 'percentage',
      };
    }

    // Flag is enabled for all
    return {
      key,
      value: true,
      reason: 'default',
    };
  }

  /**
   * Rolls out a feature to a percentage of users
   * Requirement 87: Percentage-based rollouts
   * @param flagId - Feature flag identifier
   * @param percentage - Rollout percentage (0-100)
   */
  async rolloutFeature(flagId: string, percentage: number): Promise<void> {
    const flag = this.featureFlags.get(flagId);
    if (!flag) {
      throw new Error(`Feature flag not found: ${flagId}`);
    }

    if (percentage < 0 || percentage > 100) {
      throw new Error('Percentage must be between 0 and 100');
    }

    flag.rolloutPercentage = percentage;
    flag.status = percentage === 100 ? 'enabled' : percentage === 0 ? 'disabled' : 'percentage_rollout';
    flag.updatedAt = new Date();

    logger.info(`Rolled out feature ${flagId} to ${percentage}%`);
  }

  /**
   * Rolls back a feature (disables it)
   * @param flagId - Feature flag identifier
   */
  async rollbackFeature(flagId: string): Promise<void> {
    const flag = this.featureFlags.get(flagId);
    if (!flag) {
      throw new Error(`Feature flag not found: ${flagId}`);
    }

    flag.status = 'disabled';
    flag.rolloutPercentage = 0;
    flag.updatedAt = new Date();

    logger.info(`Rolled back feature ${flagId}`);
  }

  /**
   * Sets a user override for a feature flag
   * @param flagId - Feature flag identifier
   * @param userId - User identifier
   * @param enabled - Whether the flag is enabled for this user
   */
  async setUserOverride(flagId: string, userId: string, enabled: boolean): Promise<void> {
    const flag = this.featureFlags.get(flagId);
    if (!flag) {
      throw new Error(`Feature flag not found: ${flagId}`);
    }

    flag.userOverrides.set(userId, enabled);
    flag.updatedAt = new Date();

    logger.debug(`Set user override for flag ${flagId}: user ${userId} = ${enabled}`);
  }

  /**
   * Removes a user override
   * @param flagId - Feature flag identifier
   * @param userId - User identifier
   */
  async removeUserOverride(flagId: string, userId: string): Promise<void> {
    const flag = this.featureFlags.get(flagId);
    if (!flag) {
      throw new Error(`Feature flag not found: ${flagId}`);
    }

    flag.userOverrides.delete(userId);
    flag.updatedAt = new Date();
  }

  // ============ Private Helper Methods ============

  /**
   * Generates a unique identifier
   */
  private generateId(prefix: string): string {
    return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Buckets a user into a variant using consistent hashing
   */
  private bucketUser(userId: string, experiment: Experiment): string {
    const bucket = this.getUserBucket(userId, experiment.id);
    
    let cumulativeWeight = 0;
    for (const variant of experiment.variants) {
      cumulativeWeight += variant.weight;
      if (bucket < cumulativeWeight) {
        return variant.id;
      }
    }

    // Fallback to last variant
    return experiment.variants[experiment.variants.length - 1]?.id || '';
  }

  /**
   * Gets a user's bucket (0-100) using consistent hashing
   */
  private getUserBucket(userId: string, key: string): number {
    const hash = crypto
      .createHash('md5')
      .update(`${this.config.hashSeed}:${userId}:${key}`)
      .digest('hex');
    
    // Convert first 8 hex chars to number and mod 100
    const num = parseInt(hash.substring(0, 8), 16);
    return num % 100;
  }

  /**
   * Gets all assignments for an experiment
   */
  private getAllAssignmentsForExperiment(experimentId: string): UserAssignment[] {
    const allAssignments: UserAssignment[] = [];
    for (const assignments of this.userAssignments.values()) {
      allAssignments.push(...assignments.filter(a => a.experimentId === experimentId));
    }
    return allAssignments;
  }

  /**
   * Calculates standard deviation
   */
  private calculateStdDev(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }

  /**
   * Calculates statistical significance using chi-squared test approximation
   */
  private calculateSignificance(
    variantStats: VariantStats[],
    controlStats: VariantStats | null,
    minSampleSize: number
  ): { isSignificant: boolean; pValue: number; winningVariant: string; lift: number } {
    if (!controlStats || variantStats.length < 2) {
      return { isSignificant: false, pValue: 1, winningVariant: '', lift: 0 };
    }

    // Check minimum sample size
    const totalSample = variantStats.reduce((sum, v) => sum + v.sampleSize, 0);
    if (totalSample < minSampleSize) {
      return { isSignificant: false, pValue: 1, winningVariant: '', lift: 0 };
    }

    // Find best performing variant
    let bestVariant = variantStats[0];
    for (const variant of variantStats) {
      if (variant.conversionRate > bestVariant.conversionRate) {
        bestVariant = variant;
      }
    }

    // Calculate lift over control
    const lift = controlStats.conversionRate > 0
      ? ((bestVariant.conversionRate - controlStats.conversionRate) / controlStats.conversionRate) * 100
      : 0;

    // Simplified p-value calculation using z-test
    const pooledRate = (controlStats.conversions + bestVariant.conversions) / 
                       (controlStats.sampleSize + bestVariant.sampleSize);
    const standardError = Math.sqrt(
      pooledRate * (1 - pooledRate) * 
      (1 / controlStats.sampleSize + 1 / bestVariant.sampleSize)
    );

    const zScore = standardError > 0
      ? Math.abs(bestVariant.conversionRate - controlStats.conversionRate) / standardError
      : 0;

    // Convert z-score to p-value (approximation)
    const pValue = Math.exp(-0.5 * zScore * zScore) / Math.sqrt(2 * Math.PI);

    const isSignificant = pValue < (1 - this.config.defaultConfidenceLevel);

    return {
      isSignificant,
      pValue,
      winningVariant: bestVariant.variantId,
      lift,
    };
  }

  /**
   * Generates recommendations based on experiment results
   */
  private generateRecommendations(
    experiment: Experiment,
    variantStats: VariantStats[],
    isSignificant: boolean,
    totalParticipants: number
  ): string[] {
    const recommendations: string[] = [];

    if (totalParticipants < experiment.minSampleSize) {
      recommendations.push(
        `Need ${experiment.minSampleSize - totalParticipants} more participants for statistical significance.`
      );
    }

    if (isSignificant) {
      const winner = variantStats.reduce((best, v) => 
        v.conversionRate > best.conversionRate ? v : best
      );
      recommendations.push(
        `Consider rolling out "${winner.variantName}" as it shows statistically significant improvement.`
      );
    } else {
      recommendations.push(
        'Results are not yet statistically significant. Continue running the experiment.'
      );
    }

    // Check for low conversion rates
    const avgConversionRate = variantStats.reduce((sum, v) => sum + v.conversionRate, 0) / variantStats.length;
    if (avgConversionRate < 0.01) {
      recommendations.push(
        'Overall conversion rates are low. Consider reviewing the conversion metric definition.'
      );
    }

    return recommendations;
  }
}

// Export singleton instance
export const featureFlagService = new FeatureFlagService();
