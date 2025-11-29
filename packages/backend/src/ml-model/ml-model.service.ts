/**
 * ML Model Management Service
 * Provides model versioning, blue-green deployment, performance tracking, drift detection, and A/B testing
 * Requirements: 88
 */

import crypto from 'crypto';
import { logger } from '../utils/logger';
import {
  ModelVersion,
  ModelStatus,
  Deployment,
  DeploymentStatus,
  DeploymentType,
  ModelMetrics,
  DriftReport,
  DriftSeverity,
  FeatureDrift,
  FeatureStats,
  PredictionDrift,
  ModelComparison,
  ModelComparisonEntry,
  ModelABTest,
  DeployModelOptions,
  CreateModelVersionOptions,
  CreateABTestOptions,
  MLModelServiceConfig,
  DateRange,
} from './types';

/** Default configuration */
const DEFAULT_CONFIG: MLModelServiceConfig = {
  defaultDeploymentType: 'blue-green',
  defaultReplicas: 2,
  defaultTimeoutSeconds: 300,
  driftThreshold: 0.1,
  defaultMinSampleSize: 1000,
  metricsRetentionDays: 90,
};

/**
 * ML Model Management Service class
 * Handles model versioning, deployment, performance tracking, and drift detection
 */
export class MLModelService {
  private config: MLModelServiceConfig;
  private modelVersions: Map<string, ModelVersion>;
  private deployments: Map<string, Deployment>;
  private activeDeployments: Map<string, string>; // modelId -> deploymentId
  private metricsHistory: Map<string, ModelMetrics[]>;
  private abTests: Map<string, ModelABTest>;
  private predictionLogs: Map<string, PredictionLog[]>;

  constructor(serviceConfig?: Partial<MLModelServiceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...serviceConfig };
    this.modelVersions = new Map();
    this.deployments = new Map();
    this.activeDeployments = new Map();
    this.metricsHistory = new Map();
    this.abTests = new Map();
    this.predictionLogs = new Map();
  }

  // ============ Model Version Management ============

  /**
   * Creates a new model version
   * Requirement 88: Model versioning
   * @param options - Model version creation options
   * @returns Created model version
   */
  async createModelVersion(options: CreateModelVersionOptions): Promise<ModelVersion> {
    const id = this.generateId('mv');
    const now = new Date();

    // Check for duplicate version
    const existingVersions = this.getModelVersions(options.modelId);
    const duplicate = existingVersions.find(v => v.version === options.version);
    if (duplicate) {
      throw new Error(`Version ${options.version} already exists for model ${options.modelId}`);
    }

    const modelVersion: ModelVersion = {
      id,
      modelId: options.modelId,
      version: options.version,
      description: options.description,
      status: 'ready',
      artifactPath: options.artifactPath,
      config: options.config,
      trainingMetrics: options.trainingMetrics,
      createdAt: now,
      updatedAt: now,
      createdBy: options.createdBy,
      tags: options.tags,
    };

    this.modelVersions.set(id, modelVersion);
    logger.info(`Created model version: ${id} (${options.modelId}@${options.version})`);

    return modelVersion;
  }

  /**
   * Gets a model version by ID
   * @param versionId - Version identifier
   * @returns Model version or null
   */
  async getModelVersion(versionId: string): Promise<ModelVersion | null> {
    return this.modelVersions.get(versionId) || null;
  }

  /**
   * Gets all versions for a model
   * @param modelId - Model identifier
   * @returns Array of model versions
   */
  getModelVersions(modelId: string): ModelVersion[] {
    return Array.from(this.modelVersions.values())
      .filter(v => v.modelId === modelId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Gets the latest version for a model
   * @param modelId - Model identifier
   * @returns Latest model version or null
   */
  async getLatestVersion(modelId: string): Promise<ModelVersion | null> {
    const versions = this.getModelVersions(modelId);
    return versions[0] || null;
  }

  /**
   * Updates model version status
   * @param versionId - Version identifier
   * @param status - New status
   */
  async updateVersionStatus(versionId: string, status: ModelStatus): Promise<void> {
    const version = this.modelVersions.get(versionId);
    if (!version) {
      throw new Error(`Model version not found: ${versionId}`);
    }

    version.status = status;
    version.updatedAt = new Date();
    logger.info(`Updated model version ${versionId} status to ${status}`);
  }

  // ============ Deployment Management ============

  /**
   * Deploys a model version
   * Requirement 88: Blue-green model deployment
   * @param options - Deployment options
   * @returns Deployment record
   */
  async deployModel(options: DeployModelOptions): Promise<Deployment> {
    // Find the model version
    const versions = this.getModelVersions(options.modelId);
    const targetVersion = versions.find(v => v.version === options.version);
    
    if (!targetVersion) {
      throw new Error(`Version ${options.version} not found for model ${options.modelId}`);
    }

    if (targetVersion.status !== 'ready' && targetVersion.status !== 'deployed') {
      throw new Error(`Model version ${options.version} is not ready for deployment (status: ${targetVersion.status})`);
    }

    const id = this.generateId('dep');
    const now = new Date();
    const deploymentType = options.deploymentType || this.config.defaultDeploymentType;

    // Get current active deployment for rollback reference
    const currentDeploymentId = this.activeDeployments.get(options.modelId);
    const currentDeployment = currentDeploymentId ? this.deployments.get(currentDeploymentId) : null;

    const deployment: Deployment = {
      id,
      modelId: options.modelId,
      version: options.version,
      deploymentType,
      status: 'deploying',
      deployedAt: now,
      previousVersion: currentDeployment?.version,
      config: {
        environment: options.environment || 'production',
        replicas: options.replicas || this.config.defaultReplicas,
        canaryPercentage: options.canaryPercentage,
        autoRollback: options.autoRollback ?? true,
        timeoutSeconds: options.timeoutSeconds || this.config.defaultTimeoutSeconds,
      },
      deployedBy: options.deployedBy,
    };

    this.deployments.set(id, deployment);

    // Simulate deployment process
    try {
      await this.executeDeployment(deployment, deploymentType);
      
      deployment.status = 'active';
      deployment.completedAt = new Date();
      
      // Update active deployment
      this.activeDeployments.set(options.modelId, id);
      
      // Update model version status
      targetVersion.status = 'deployed';
      targetVersion.updatedAt = new Date();

      logger.info(`Successfully deployed model ${options.modelId}@${options.version} (${deploymentType})`);
    } catch (error) {
      deployment.status = 'failed';
      deployment.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (deployment.config.autoRollback && currentDeployment) {
        logger.warn(`Deployment failed, auto-rolling back to ${currentDeployment.version}`);
        await this.rollbackModel(options.modelId, currentDeployment.version);
      }
      
      throw error;
    }

    return deployment;
  }


  /**
   * Executes the deployment based on type
   * @param deployment - Deployment record
   * @param type - Deployment type
   */
  private async executeDeployment(deployment: Deployment, type: DeploymentType): Promise<void> {
    switch (type) {
      case 'blue-green':
        await this.executeBlueGreenDeployment(deployment);
        break;
      case 'canary':
        await this.executeCanaryDeployment(deployment);
        break;
      case 'rolling':
        await this.executeRollingDeployment(deployment);
        break;
      default:
        throw new Error(`Unknown deployment type: ${type}`);
    }
  }

  /**
   * Executes blue-green deployment
   * Requirement 88: Blue-green model deployment
   */
  private async executeBlueGreenDeployment(deployment: Deployment): Promise<void> {
    logger.info(`Executing blue-green deployment for ${deployment.modelId}@${deployment.version}`);
    
    // In production, this would:
    // 1. Deploy new version to "green" environment
    // 2. Run health checks
    // 3. Switch traffic from "blue" to "green"
    // 4. Keep "blue" as fallback
    
    // Simulate deployment time
    await this.simulateDeploymentDelay();
  }

  /**
   * Executes canary deployment
   */
  private async executeCanaryDeployment(deployment: Deployment): Promise<void> {
    const canaryPercentage = deployment.config.canaryPercentage || 10;
    logger.info(`Executing canary deployment (${canaryPercentage}%) for ${deployment.modelId}@${deployment.version}`);
    
    // In production, this would:
    // 1. Deploy new version alongside existing
    // 2. Route canaryPercentage of traffic to new version
    // 3. Monitor metrics
    // 4. Gradually increase traffic if healthy
    
    await this.simulateDeploymentDelay();
  }

  /**
   * Executes rolling deployment
   */
  private async executeRollingDeployment(deployment: Deployment): Promise<void> {
    logger.info(`Executing rolling deployment for ${deployment.modelId}@${deployment.version}`);
    
    // In production, this would:
    // 1. Update instances one at a time
    // 2. Wait for health check after each update
    // 3. Continue until all instances updated
    
    await this.simulateDeploymentDelay();
  }

  /**
   * Simulates deployment delay for testing
   */
  private async simulateDeploymentDelay(): Promise<void> {
    // In tests, this is instant. In production, actual deployment happens here.
    return Promise.resolve();
  }

  /**
   * Rolls back a model to a previous version
   * Requirement 88: Model rollback
   * @param modelId - Model identifier
   * @param previousVersion - Version to roll back to
   */
  async rollbackModel(modelId: string, previousVersion: string): Promise<void> {
    const versions = this.getModelVersions(modelId);
    const targetVersion = versions.find(v => v.version === previousVersion);
    
    if (!targetVersion) {
      throw new Error(`Version ${previousVersion} not found for model ${modelId}`);
    }

    // Get current deployment
    const currentDeploymentId = this.activeDeployments.get(modelId);
    const currentDeployment = currentDeploymentId ? this.deployments.get(currentDeploymentId) : null;

    if (currentDeployment) {
      currentDeployment.status = 'rolled_back';
      currentDeployment.rolledBackAt = new Date();
    }

    // Create rollback deployment
    const rollbackDeployment = await this.deployModel({
      modelId,
      version: previousVersion,
      deploymentType: 'blue-green',
      deployedBy: 'system_rollback',
      autoRollback: false,
    });

    logger.info(`Rolled back model ${modelId} to version ${previousVersion}`);
  }

  /**
   * Gets deployment by ID
   * @param deploymentId - Deployment identifier
   * @returns Deployment or null
   */
  async getDeployment(deploymentId: string): Promise<Deployment | null> {
    return this.deployments.get(deploymentId) || null;
  }

  /**
   * Gets active deployment for a model
   * @param modelId - Model identifier
   * @returns Active deployment or null
   */
  async getActiveDeployment(modelId: string): Promise<Deployment | null> {
    const deploymentId = this.activeDeployments.get(modelId);
    return deploymentId ? this.deployments.get(deploymentId) || null : null;
  }

  /**
   * Gets deployment history for a model
   * @param modelId - Model identifier
   * @returns Array of deployments
   */
  async getDeploymentHistory(modelId: string): Promise<Deployment[]> {
    return Array.from(this.deployments.values())
      .filter(d => d.modelId === modelId)
      .sort((a, b) => b.deployedAt.getTime() - a.deployedAt.getTime());
  }

  // ============ Performance Tracking ============

  /**
   * Tracks model performance metrics
   * Requirement 88: Performance tracking
   * @param modelId - Model identifier
   * @returns Current model metrics
   */
  async trackModelPerformance(modelId: string): Promise<ModelMetrics> {
    const activeDeployment = await this.getActiveDeployment(modelId);
    if (!activeDeployment) {
      throw new Error(`No active deployment found for model ${modelId}`);
    }

    const logs = this.predictionLogs.get(modelId) || [];
    const now = new Date();
    const periodStart = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours

    const recentLogs = logs.filter(l => l.timestamp >= periodStart);
    
    const totalRequests = recentLogs.length;
    const successfulRequests = recentLogs.filter(l => l.success).length;
    const failedRequests = totalRequests - successfulRequests;
    
    const latencies = recentLogs.map(l => l.latencyMs);
    const avgLatency = latencies.length > 0 
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length 
      : 0;

    // Calculate accuracy from predictions with ground truth
    const withGroundTruth = recentLogs.filter(l => l.groundTruth !== undefined);
    const correctPredictions = withGroundTruth.filter(l => l.prediction === l.groundTruth).length;
    const accuracy = withGroundTruth.length > 0 
      ? correctPredictions / withGroundTruth.length 
      : 0;

    // Calculate detection evasion rate (specific to AI humanizer)
    const detectionTests = recentLogs.filter(l => l.detectionScore !== undefined);
    const evadedDetection = detectionTests.filter(l => (l.detectionScore || 0) < 0.5).length;
    const detectionEvasionRate = detectionTests.length > 0 
      ? evadedDetection / detectionTests.length 
      : 0;

    // Calculate throughput (requests per second)
    const periodSeconds = (now.getTime() - periodStart.getTime()) / 1000;
    const throughput = periodSeconds > 0 ? totalRequests / periodSeconds : 0;

    const metrics: ModelMetrics = {
      modelId,
      version: activeDeployment.version,
      accuracy,
      latency: avgLatency,
      throughput,
      detectionEvasionRate,
      errorRate: totalRequests > 0 ? failedRequests / totalRequests : 0,
      totalRequests,
      successfulRequests,
      failedRequests,
      periodStart,
      periodEnd: now,
    };

    // Store metrics history
    const history = this.metricsHistory.get(modelId) || [];
    history.push(metrics);
    this.metricsHistory.set(modelId, history);

    return metrics;
  }

  /**
   * Records a prediction for metrics tracking
   * @param modelId - Model identifier
   * @param log - Prediction log entry
   */
  async recordPrediction(modelId: string, log: Omit<PredictionLog, 'id' | 'timestamp'>): Promise<void> {
    const entry: PredictionLog = {
      id: this.generateId('pred'),
      timestamp: new Date(),
      ...log,
    };

    const logs = this.predictionLogs.get(modelId) || [];
    logs.push(entry);
    this.predictionLogs.set(modelId, logs);
  }

  /**
   * Gets metrics history for a model
   * @param modelId - Model identifier
   * @param limit - Maximum number of records
   * @returns Array of metrics
   */
  async getMetricsHistory(modelId: string, limit?: number): Promise<ModelMetrics[]> {
    const history = this.metricsHistory.get(modelId) || [];
    return limit ? history.slice(-limit) : history;
  }


  // ============ Drift Detection ============

  /**
   * Detects model drift
   * Requirement 88: Model drift detection
   * @param modelId - Model identifier
   * @returns Drift report
   */
  async detectModelDrift(modelId: string): Promise<DriftReport> {
    const activeDeployment = await this.getActiveDeployment(modelId);
    if (!activeDeployment) {
      throw new Error(`No active deployment found for model ${modelId}`);
    }

    const logs = this.predictionLogs.get(modelId) || [];
    const now = new Date();
    
    // Define baseline and current periods
    const baselinePeriod: DateRange = {
      start: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
      end: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),   // 7 days ago
    };
    
    const currentPeriod: DateRange = {
      start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      end: now,
    };

    const baselineLogs = logs.filter(
      l => l.timestamp >= baselinePeriod.start && l.timestamp <= baselinePeriod.end
    );
    const currentLogs = logs.filter(
      l => l.timestamp >= currentPeriod.start && l.timestamp <= currentPeriod.end
    );

    // Analyze feature drift
    const featureDrift = this.analyzeFeatureDrift(baselineLogs, currentLogs);
    
    // Analyze prediction drift
    const predictionDrift = this.analyzePredictionDrift(baselineLogs, currentLogs);

    // Calculate overall drift score
    const featureDriftScore = featureDrift.length > 0
      ? featureDrift.reduce((sum, f) => sum + f.driftScore, 0) / featureDrift.length
      : 0;
    const overallDriftScore = (featureDriftScore + predictionDrift.driftScore) / 2;

    // Determine severity
    const severity = this.determineDriftSeverity(overallDriftScore);
    const driftDetected = overallDriftScore > this.config.driftThreshold;

    // Generate recommendations
    const recommendations = this.generateDriftRecommendations(
      driftDetected,
      severity,
      featureDrift,
      predictionDrift
    );

    const report: DriftReport = {
      modelId,
      version: activeDeployment.version,
      driftDetected,
      severity,
      driftScore: overallDriftScore,
      featureDrift,
      predictionDrift,
      recommendations,
      analyzedAt: now,
      baselinePeriod,
      currentPeriod,
    };

    logger.info(`Drift detection for ${modelId}: ${driftDetected ? 'DRIFT DETECTED' : 'No drift'} (score: ${overallDriftScore.toFixed(3)})`);

    return report;
  }

  /**
   * Analyzes feature drift between baseline and current periods
   */
  private analyzeFeatureDrift(baselineLogs: PredictionLog[], currentLogs: PredictionLog[]): FeatureDrift[] {
    const featureDrift: FeatureDrift[] = [];

    // Extract feature names from logs
    const featureNames = new Set<string>();
    [...baselineLogs, ...currentLogs].forEach(log => {
      if (log.features) {
        Object.keys(log.features).forEach(name => featureNames.add(name));
      }
    });

    for (const featureName of featureNames) {
      const baselineValues = baselineLogs
        .filter(l => l.features?.[featureName] !== undefined)
        .map(l => l.features![featureName] as number);
      
      const currentValues = currentLogs
        .filter(l => l.features?.[featureName] !== undefined)
        .map(l => l.features![featureName] as number);

      if (baselineValues.length === 0 || currentValues.length === 0) {
        continue;
      }

      const baselineStats = this.calculateFeatureStats(baselineValues);
      const currentStats = this.calculateFeatureStats(currentValues);

      // Calculate drift using Kolmogorov-Smirnov test approximation
      const { driftScore, pValue } = this.calculateKSTest(baselineValues, currentValues);
      const driftDetected = driftScore > this.config.driftThreshold;

      featureDrift.push({
        featureName,
        driftDetected,
        driftScore,
        testType: 'kolmogorov-smirnov',
        pValue,
        baselineStats,
        currentStats,
      });
    }

    return featureDrift;
  }

  /**
   * Analyzes prediction drift
   */
  private analyzePredictionDrift(baselineLogs: PredictionLog[], currentLogs: PredictionLog[]): PredictionDrift {
    const baselineDistribution = this.calculatePredictionDistribution(baselineLogs);
    const currentDistribution = this.calculatePredictionDistribution(currentLogs);

    // Calculate KL divergence
    const klDivergence = this.calculateKLDivergence(baselineDistribution, currentDistribution);
    const driftScore = Math.min(klDivergence, 1); // Cap at 1
    const driftDetected = driftScore > this.config.driftThreshold;

    return {
      driftDetected,
      driftScore,
      baselineDistribution,
      currentDistribution,
      klDivergence,
    };
  }

  /**
   * Calculates feature statistics
   */
  private calculateFeatureStats(values: number[]): FeatureStats {
    if (values.length === 0) {
      return { mean: 0, stdDev: 0, min: 0, max: 0, median: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const stdDev = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
    const median = sorted[Math.floor(sorted.length / 2)];

    return {
      mean,
      stdDev,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median,
    };
  }

  /**
   * Calculates Kolmogorov-Smirnov test approximation
   */
  private calculateKSTest(baseline: number[], current: number[]): { driftScore: number; pValue: number } {
    if (baseline.length === 0 || current.length === 0) {
      return { driftScore: 0, pValue: 1 };
    }

    const sortedBaseline = [...baseline].sort((a, b) => a - b);
    const sortedCurrent = [...current].sort((a, b) => a - b);

    // Calculate maximum difference between CDFs
    let maxDiff = 0;
    const allValues = [...new Set([...sortedBaseline, ...sortedCurrent])].sort((a, b) => a - b);

    for (const value of allValues) {
      const baselineCDF = sortedBaseline.filter(v => v <= value).length / sortedBaseline.length;
      const currentCDF = sortedCurrent.filter(v => v <= value).length / sortedCurrent.length;
      maxDiff = Math.max(maxDiff, Math.abs(baselineCDF - currentCDF));
    }

    // Approximate p-value
    const n = Math.min(baseline.length, current.length);
    const pValue = Math.exp(-2 * n * maxDiff * maxDiff);

    return { driftScore: maxDiff, pValue };
  }

  /**
   * Calculates prediction distribution
   */
  private calculatePredictionDistribution(logs: PredictionLog[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    const total = logs.length;

    if (total === 0) {
      return distribution;
    }

    for (const log of logs) {
      const prediction = String(log.prediction);
      distribution[prediction] = (distribution[prediction] || 0) + 1;
    }

    // Normalize to percentages
    for (const key of Object.keys(distribution)) {
      distribution[key] = distribution[key] / total;
    }

    return distribution;
  }

  /**
   * Calculates KL divergence between two distributions
   */
  private calculateKLDivergence(p: Record<string, number>, q: Record<string, number>): number {
    const allKeys = new Set([...Object.keys(p), ...Object.keys(q)]);
    let divergence = 0;
    const epsilon = 1e-10; // Avoid log(0)

    for (const key of allKeys) {
      const pVal = p[key] || epsilon;
      const qVal = q[key] || epsilon;
      divergence += pVal * Math.log(pVal / qVal);
    }

    return Math.max(0, divergence);
  }

  /**
   * Determines drift severity based on score
   */
  private determineDriftSeverity(score: number): DriftSeverity {
    if (score < 0.05) return 'none';
    if (score < 0.1) return 'low';
    if (score < 0.2) return 'medium';
    if (score < 0.4) return 'high';
    return 'critical';
  }

  /**
   * Generates recommendations based on drift analysis
   */
  private generateDriftRecommendations(
    driftDetected: boolean,
    severity: DriftSeverity,
    featureDrift: FeatureDrift[],
    predictionDrift: PredictionDrift
  ): string[] {
    const recommendations: string[] = [];

    if (!driftDetected) {
      recommendations.push('No significant drift detected. Continue monitoring.');
      return recommendations;
    }

    if (severity === 'critical' || severity === 'high') {
      recommendations.push('Consider retraining the model with recent data.');
      recommendations.push('Review data pipeline for potential issues.');
    }

    const driftedFeatures = featureDrift.filter(f => f.driftDetected);
    if (driftedFeatures.length > 0) {
      const featureNames = driftedFeatures.map(f => f.featureName).join(', ');
      recommendations.push(`Features with significant drift: ${featureNames}`);
      recommendations.push('Investigate changes in input data distribution.');
    }

    if (predictionDrift.driftDetected) {
      recommendations.push('Prediction distribution has shifted significantly.');
      recommendations.push('Validate model outputs against business expectations.');
    }

    if (severity === 'medium') {
      recommendations.push('Schedule model review within the next sprint.');
    }

    return recommendations;
  }


  // ============ A/B Testing for Models ============

  /**
   * Creates an A/B test for models
   * Requirement 88: A/B testing for models
   * @param options - A/B test creation options
   * @returns Created A/B test
   */
  async createABTest(options: CreateABTestOptions): Promise<ModelABTest> {
    // Validate model IDs
    if (options.modelIds.length < 2) {
      throw new Error('At least 2 models are required for A/B testing');
    }

    // Validate traffic allocation
    const totalAllocation = Object.values(options.trafficAllocation).reduce((a, b) => a + b, 0);
    if (Math.abs(totalAllocation - 100) > 0.01) {
      throw new Error('Traffic allocation must sum to 100');
    }

    // Verify all models have active deployments
    for (const modelId of options.modelIds) {
      const deployment = await this.getActiveDeployment(modelId);
      if (!deployment) {
        throw new Error(`Model ${modelId} does not have an active deployment`);
      }
    }

    const id = this.generateId('abtest');
    const now = new Date();

    const abTest: ModelABTest = {
      id,
      name: options.name,
      modelIds: options.modelIds,
      trafficAllocation: options.trafficAllocation,
      status: options.autoStart ? 'running' : 'draft',
      startDate: now,
      minSampleSize: options.minSampleSize || this.config.defaultMinSampleSize,
      primaryMetric: options.primaryMetric || 'accuracy',
      createdBy: options.createdBy,
      createdAt: now,
    };

    this.abTests.set(id, abTest);
    logger.info(`Created A/B test: ${id} with ${options.modelIds.length} models`);

    return abTest;
  }

  /**
   * Gets an A/B test by ID
   * @param testId - Test identifier
   * @returns A/B test or null
   */
  async getABTest(testId: string): Promise<ModelABTest | null> {
    return this.abTests.get(testId) || null;
  }

  /**
   * Lists all A/B tests
   * @param status - Optional status filter
   * @returns Array of A/B tests
   */
  async listABTests(status?: ModelABTest['status']): Promise<ModelABTest[]> {
    const tests = Array.from(this.abTests.values());
    return status ? tests.filter(t => t.status === status) : tests;
  }

  /**
   * Starts an A/B test
   * @param testId - Test identifier
   */
  async startABTest(testId: string): Promise<void> {
    const test = this.abTests.get(testId);
    if (!test) {
      throw new Error(`A/B test not found: ${testId}`);
    }

    if (test.status !== 'draft') {
      throw new Error(`A/B test is not in draft status: ${testId}`);
    }

    test.status = 'running';
    test.startDate = new Date();
    logger.info(`Started A/B test: ${testId}`);
  }

  /**
   * Stops an A/B test
   * @param testId - Test identifier
   */
  async stopABTest(testId: string): Promise<void> {
    const test = this.abTests.get(testId);
    if (!test) {
      throw new Error(`A/B test not found: ${testId}`);
    }

    test.status = 'completed';
    test.endDate = new Date();
    logger.info(`Stopped A/B test: ${testId}`);
  }

  /**
   * Compares models in an A/B test
   * Requirement 88: A/B testing for models
   * @param modelIds - Model identifiers to compare
   * @returns Model comparison result
   */
  async abTestModels(modelIds: string[]): Promise<ModelComparison> {
    if (modelIds.length < 2) {
      throw new Error('At least 2 models are required for comparison');
    }

    const entries: ModelComparisonEntry[] = [];
    const totalTraffic = 100 / modelIds.length;

    for (const modelId of modelIds) {
      const deployment = await this.getActiveDeployment(modelId);
      if (!deployment) {
        throw new Error(`Model ${modelId} does not have an active deployment`);
      }

      const metrics = await this.trackModelPerformance(modelId);
      
      entries.push({
        modelId,
        version: deployment.version,
        metrics,
        trafficPercentage: totalTraffic,
        sampleSize: metrics.totalRequests,
      });
    }

    // Determine winner based on primary metric (accuracy)
    const sortedByAccuracy = [...entries].sort((a, b) => b.metrics.accuracy - a.metrics.accuracy);
    const potentialWinner = sortedByAccuracy[0];
    const runnerUp = sortedByAccuracy[1];

    // Check statistical significance
    const { isSignificant, winner } = this.calculateModelSignificance(
      potentialWinner,
      runnerUp,
      this.config.defaultMinSampleSize
    );

    // Generate recommendations
    const recommendations = this.generateComparisonRecommendations(
      entries,
      isSignificant,
      winner
    );

    return {
      models: entries,
      winner: isSignificant ? winner : undefined,
      comparisonMetrics: ['accuracy', 'latency', 'throughput', 'detectionEvasionRate', 'errorRate'],
      isStatisticallySignificant: isSignificant,
      comparedAt: new Date(),
      recommendations,
    };
  }

  /**
   * Calculates statistical significance between two models
   */
  private calculateModelSignificance(
    model1: ModelComparisonEntry,
    model2: ModelComparisonEntry,
    minSampleSize: number
  ): { isSignificant: boolean; winner: string } {
    // Check minimum sample size
    if (model1.sampleSize < minSampleSize || model2.sampleSize < minSampleSize) {
      return { isSignificant: false, winner: '' };
    }

    // Calculate z-score for accuracy difference
    const p1 = model1.metrics.accuracy;
    const p2 = model2.metrics.accuracy;
    const n1 = model1.sampleSize;
    const n2 = model2.sampleSize;

    const pooledP = (p1 * n1 + p2 * n2) / (n1 + n2);
    const standardError = Math.sqrt(pooledP * (1 - pooledP) * (1/n1 + 1/n2));
    
    if (standardError === 0) {
      return { isSignificant: false, winner: '' };
    }

    const zScore = Math.abs(p1 - p2) / standardError;
    const isSignificant = zScore > 1.96; // 95% confidence

    const winner = p1 > p2 ? model1.modelId : model2.modelId;

    return { isSignificant, winner };
  }

  /**
   * Generates recommendations based on model comparison
   */
  private generateComparisonRecommendations(
    entries: ModelComparisonEntry[],
    isSignificant: boolean,
    winner: string
  ): string[] {
    const recommendations: string[] = [];

    if (!isSignificant) {
      const minSample = Math.min(...entries.map(e => e.sampleSize));
      if (minSample < this.config.defaultMinSampleSize) {
        recommendations.push(
          `Need more samples for statistical significance. Current minimum: ${minSample}, required: ${this.config.defaultMinSampleSize}`
        );
      } else {
        recommendations.push('No statistically significant difference between models.');
        recommendations.push('Consider other factors like latency and resource usage.');
      }
    } else {
      const winnerEntry = entries.find(e => e.modelId === winner);
      if (winnerEntry) {
        recommendations.push(
          `Model ${winner} (v${winnerEntry.version}) shows statistically significant improvement.`
        );
        recommendations.push('Consider promoting this model to full production traffic.');
      }
    }

    // Check for latency concerns
    const highLatencyModels = entries.filter(e => e.metrics.latency > 100);
    if (highLatencyModels.length > 0) {
      recommendations.push(
        `Models with high latency (>100ms): ${highLatencyModels.map(m => m.modelId).join(', ')}`
      );
    }

    // Check for error rate concerns
    const highErrorModels = entries.filter(e => e.metrics.errorRate > 0.05);
    if (highErrorModels.length > 0) {
      recommendations.push(
        `Models with high error rate (>5%): ${highErrorModels.map(m => m.modelId).join(', ')}`
      );
    }

    return recommendations;
  }

  // ============ Helper Methods ============

  /**
   * Generates a unique identifier
   */
  private generateId(prefix: string): string {
    return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
  }
}

/**
 * Prediction log entry for metrics tracking
 */
interface PredictionLog {
  /** Log entry identifier */
  id: string;
  /** Timestamp */
  timestamp: Date;
  /** Prediction result */
  prediction: unknown;
  /** Ground truth (if available) */
  groundTruth?: unknown;
  /** Latency in milliseconds */
  latencyMs: number;
  /** Whether prediction was successful */
  success: boolean;
  /** Detection score (for AI humanizer) */
  detectionScore?: number;
  /** Input features (for drift detection) */
  features?: Record<string, unknown>;
  /** Error message (if failed) */
  errorMessage?: string;
}

// Export singleton instance
export const mlModelService = new MLModelService();

/**
 * Gets the singleton ML model service instance
 */
export function getMLModelService(): MLModelService {
  return mlModelService;
}