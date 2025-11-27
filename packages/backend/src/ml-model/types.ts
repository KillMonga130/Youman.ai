/**
 * ML Model Management Types
 * Type definitions for model versioning, deployment, performance tracking, and drift detection
 * Requirements: 88
 */

/**
 * Model deployment type
 */
export type DeploymentType = 'blue-green' | 'canary' | 'rolling';

/**
 * Deployment status
 */
export type DeploymentStatus = 'pending' | 'deploying' | 'active' | 'failed' | 'rolled_back';

/**
 * Model status
 */
export type ModelStatus = 'draft' | 'training' | 'ready' | 'deployed' | 'deprecated' | 'archived';

/**
 * Drift severity level
 */
export type DriftSeverity = 'none' | 'low' | 'medium' | 'high' | 'critical';

/**
 * Model version definition
 */
export interface ModelVersion {
  /** Unique version identifier */
  id: string;
  /** Model identifier */
  modelId: string;
  /** Version string (semver) */
  version: string;
  /** Version description */
  description?: string;
  /** Model status */
  status: ModelStatus;
  /** Model artifact path/URL */
  artifactPath: string;
  /** Model configuration */
  config: ModelConfig;
  /** Training metrics */
  trainingMetrics?: TrainingMetrics;
  /** Creation timestamp */
  createdAt: Date;
  /** Last updated timestamp */
  updatedAt: Date;
  /** User ID who created the version */
  createdBy: string;
  /** Tags for organization */
  tags?: string[];
}

/**
 * Model configuration
 */
export interface ModelConfig {
  /** Model type/architecture */
  type: string;
  /** Framework (tensorflow, pytorch, etc.) */
  framework: string;
  /** Input schema */
  inputSchema?: Record<string, unknown>;
  /** Output schema */
  outputSchema?: Record<string, unknown>;
  /** Hyperparameters */
  hyperparameters?: Record<string, unknown>;
  /** Resource requirements */
  resources?: ResourceRequirements;
}


/**
 * Resource requirements for model deployment
 */
export interface ResourceRequirements {
  /** CPU cores */
  cpu: number;
  /** Memory in MB */
  memory: number;
  /** GPU count (optional) */
  gpu?: number;
  /** GPU type (optional) */
  gpuType?: string;
}

/**
 * Training metrics
 */
export interface TrainingMetrics {
  /** Training accuracy */
  accuracy: number;
  /** Training loss */
  loss: number;
  /** Validation accuracy */
  validationAccuracy?: number;
  /** Validation loss */
  validationLoss?: number;
  /** Training duration in seconds */
  trainingDuration: number;
  /** Number of epochs */
  epochs: number;
  /** Additional metrics */
  additionalMetrics?: Record<string, number>;
}

/**
 * Model deployment
 */
export interface Deployment {
  /** Unique deployment identifier */
  id: string;
  /** Model identifier */
  modelId: string;
  /** Model version */
  version: string;
  /** Deployment type */
  deploymentType: DeploymentType;
  /** Deployment status */
  status: DeploymentStatus;
  /** Deployment timestamp */
  deployedAt: Date;
  /** Completion timestamp */
  completedAt?: Date;
  /** Rollback timestamp (if rolled back) */
  rolledBackAt?: Date;
  /** Previous version (for rollback) */
  previousVersion?: string;
  /** Deployment configuration */
  config: DeploymentConfig;
  /** User ID who initiated deployment */
  deployedBy: string;
  /** Error message (if failed) */
  errorMessage?: string;
}

/**
 * Deployment configuration
 */
export interface DeploymentConfig {
  /** Target environment */
  environment: string;
  /** Number of replicas */
  replicas: number;
  /** Canary percentage (for canary deployments) */
  canaryPercentage?: number;
  /** Health check endpoint */
  healthCheckPath?: string;
  /** Rollback on failure */
  autoRollback: boolean;
  /** Deployment timeout in seconds */
  timeoutSeconds: number;
}

/**
 * Model performance metrics
 */
export interface ModelMetrics {
  /** Model identifier */
  modelId: string;
  /** Model version */
  version: string;
  /** Accuracy score */
  accuracy: number;
  /** Average latency in ms */
  latency: number;
  /** Throughput (requests per second) */
  throughput: number;
  /** Detection evasion rate (specific to AI humanizer) */
  detectionEvasionRate: number;
  /** Error rate */
  errorRate: number;
  /** Total requests processed */
  totalRequests: number;
  /** Successful requests */
  successfulRequests: number;
  /** Failed requests */
  failedRequests: number;
  /** Metrics collection period start */
  periodStart: Date;
  /** Metrics collection period end */
  periodEnd: Date;
}

/**
 * Drift detection report
 */
export interface DriftReport {
  /** Model identifier */
  modelId: string;
  /** Model version */
  version: string;
  /** Overall drift detected */
  driftDetected: boolean;
  /** Drift severity */
  severity: DriftSeverity;
  /** Drift score (0-1) */
  driftScore: number;
  /** Feature-level drift details */
  featureDrift: FeatureDrift[];
  /** Prediction drift details */
  predictionDrift: PredictionDrift;
  /** Recommendations */
  recommendations: string[];
  /** Analysis timestamp */
  analyzedAt: Date;
  /** Baseline period */
  baselinePeriod: DateRange;
  /** Current period */
  currentPeriod: DateRange;
}

/**
 * Feature-level drift information
 */
export interface FeatureDrift {
  /** Feature name */
  featureName: string;
  /** Drift detected for this feature */
  driftDetected: boolean;
  /** Drift score (0-1) */
  driftScore: number;
  /** Statistical test used */
  testType: string;
  /** P-value from statistical test */
  pValue: number;
  /** Baseline statistics */
  baselineStats: FeatureStats;
  /** Current statistics */
  currentStats: FeatureStats;
}

/**
 * Feature statistics
 */
export interface FeatureStats {
  /** Mean value */
  mean: number;
  /** Standard deviation */
  stdDev: number;
  /** Minimum value */
  min: number;
  /** Maximum value */
  max: number;
  /** Median value */
  median: number;
}

/**
 * Prediction drift information
 */
export interface PredictionDrift {
  /** Drift detected in predictions */
  driftDetected: boolean;
  /** Drift score (0-1) */
  driftScore: number;
  /** Baseline prediction distribution */
  baselineDistribution: Record<string, number>;
  /** Current prediction distribution */
  currentDistribution: Record<string, number>;
  /** KL divergence */
  klDivergence: number;
}

/**
 * Date range
 */
export interface DateRange {
  /** Start date */
  start: Date;
  /** End date */
  end: Date;
}

/**
 * Model comparison result
 */
export interface ModelComparison {
  /** Models being compared */
  models: ModelComparisonEntry[];
  /** Winner model ID (if determined) */
  winner?: string;
  /** Comparison metrics */
  comparisonMetrics: string[];
  /** Statistical significance */
  isStatisticallySignificant: boolean;
  /** Comparison timestamp */
  comparedAt: Date;
  /** Recommendations */
  recommendations: string[];
}

/**
 * Model comparison entry
 */
export interface ModelComparisonEntry {
  /** Model identifier */
  modelId: string;
  /** Model version */
  version: string;
  /** Performance metrics */
  metrics: ModelMetrics;
  /** Traffic allocation percentage */
  trafficPercentage: number;
  /** Sample size */
  sampleSize: number;
}

/**
 * A/B test for models
 */
export interface ModelABTest {
  /** Test identifier */
  id: string;
  /** Test name */
  name: string;
  /** Models being tested */
  modelIds: string[];
  /** Traffic allocation per model */
  trafficAllocation: Record<string, number>;
  /** Test status */
  status: 'draft' | 'running' | 'completed' | 'cancelled';
  /** Start date */
  startDate: Date;
  /** End date */
  endDate?: Date;
  /** Minimum sample size */
  minSampleSize: number;
  /** Primary metric */
  primaryMetric: string;
  /** Created by */
  createdBy: string;
  /** Creation timestamp */
  createdAt: Date;
}

/**
 * Options for deploying a model
 */
export interface DeployModelOptions {
  /** Model identifier */
  modelId: string;
  /** Version to deploy */
  version: string;
  /** Deployment type */
  deploymentType?: DeploymentType;
  /** Target environment */
  environment?: string;
  /** Number of replicas */
  replicas?: number;
  /** Canary percentage */
  canaryPercentage?: number;
  /** Auto rollback on failure */
  autoRollback?: boolean;
  /** Deployment timeout */
  timeoutSeconds?: number;
  /** User initiating deployment */
  deployedBy: string;
}

/**
 * Options for creating a model version
 */
export interface CreateModelVersionOptions {
  /** Model identifier */
  modelId: string;
  /** Version string */
  version: string;
  /** Description */
  description?: string;
  /** Artifact path */
  artifactPath: string;
  /** Model configuration */
  config: ModelConfig;
  /** Training metrics */
  trainingMetrics?: TrainingMetrics;
  /** User creating the version */
  createdBy: string;
  /** Tags */
  tags?: string[];
}

/**
 * Options for creating an A/B test
 */
export interface CreateABTestOptions {
  /** Test name */
  name: string;
  /** Model IDs to test */
  modelIds: string[];
  /** Traffic allocation (must sum to 100) */
  trafficAllocation: Record<string, number>;
  /** Minimum sample size */
  minSampleSize?: number;
  /** Primary metric to optimize */
  primaryMetric?: string;
  /** User creating the test */
  createdBy: string;
  /** Auto-start the test */
  autoStart?: boolean;
}

/**
 * Service configuration
 */
export interface MLModelServiceConfig {
  /** Default deployment type */
  defaultDeploymentType: DeploymentType;
  /** Default replicas */
  defaultReplicas: number;
  /** Default timeout in seconds */
  defaultTimeoutSeconds: number;
  /** Drift detection threshold */
  driftThreshold: number;
  /** Minimum sample size for A/B tests */
  defaultMinSampleSize: number;
  /** Metrics retention period in days */
  metricsRetentionDays: number;
}
