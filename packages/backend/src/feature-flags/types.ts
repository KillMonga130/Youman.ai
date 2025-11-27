/**
 * Feature Flag Service Types
 * Type definitions for experiment management, user bucketing, and feature rollouts
 * Requirements: 87
 */

/**
 * Experiment status
 */
export type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed' | 'archived';

/**
 * Feature flag status
 */
export type FeatureFlagStatus = 'enabled' | 'disabled' | 'percentage_rollout';

/**
 * Variant in an experiment
 */
export interface Variant {
  /** Unique variant identifier */
  id: string;
  /** Variant name */
  name: string;
  /** Percentage weight allocation (0-100) */
  weight: number;
  /** Variant-specific configuration */
  config: Record<string, unknown>;
  /** Description of the variant */
  description?: string;
}

/**
 * Experiment definition
 */
export interface Experiment {
  /** Unique experiment identifier */
  id: string;
  /** Experiment name */
  name: string;
  /** Experiment description */
  description?: string;
  /** Variants in the experiment */
  variants: Variant[];
  /** Target user segments (optional) */
  targetSegments?: string[];
  /** Experiment status */
  status: ExperimentStatus;
  /** Start date */
  startDate: Date;
  /** End date (optional) */
  endDate?: Date;
  /** User ID who created the experiment */
  createdBy: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Last updated timestamp */
  updatedAt: Date;
  /** Metrics to track */
  metrics: string[];
  /** Minimum sample size for significance */
  minSampleSize: number;
}

/**
 * User assignment to a variant
 */
export interface UserAssignment {
  /** User identifier */
  userId: string;
  /** Experiment identifier */
  experimentId: string;
  /** Assigned variant identifier */
  variantId: string;
  /** Assignment timestamp */
  assignedAt: Date;
  /** Assignment method */
  method: 'random' | 'segment' | 'override';
}

/**
 * Conversion event
 */
export interface ConversionEvent {
  /** Event identifier */
  id: string;
  /** User identifier */
  userId: string;
  /** Experiment identifier */
  experimentId: string;
  /** Variant identifier */
  variantId: string;
  /** Metric name */
  metric: string;
  /** Metric value */
  value: number;
  /** Event timestamp */
  timestamp: Date;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Variant statistics
 */
export interface VariantStats {
  /** Variant identifier */
  variantId: string;
  /** Variant name */
  variantName: string;
  /** Number of users assigned */
  sampleSize: number;
  /** Total conversions */
  conversions: number;
  /** Conversion rate */
  conversionRate: number;
  /** Average metric value */
  averageValue: number;
  /** Standard deviation */
  standardDeviation: number;
  /** Confidence interval lower bound */
  confidenceIntervalLower: number;
  /** Confidence interval upper bound */
  confidenceIntervalUpper: number;
}

/**
 * Experiment results
 */
export interface ExperimentResults {
  /** Experiment identifier */
  experimentId: string;
  /** Experiment name */
  experimentName: string;
  /** Experiment status */
  status: ExperimentStatus;
  /** Total participants */
  totalParticipants: number;
  /** Total conversions */
  totalConversions: number;
  /** Statistics per variant */
  variantStats: VariantStats[];
  /** Winning variant (if determined) */
  winningVariant?: string;
  /** Statistical significance achieved */
  isStatisticallySignificant: boolean;
  /** P-value */
  pValue: number;
  /** Confidence level */
  confidenceLevel: number;
  /** Lift percentage (improvement over control) */
  lift: number;
  /** Analysis timestamp */
  analyzedAt: Date;
  /** Recommendations */
  recommendations: string[];
}

/**
 * Feature flag definition
 */
export interface FeatureFlag {
  /** Unique flag identifier */
  id: string;
  /** Flag key (used in code) */
  key: string;
  /** Flag name */
  name: string;
  /** Flag description */
  description?: string;
  /** Flag status */
  status: FeatureFlagStatus;
  /** Rollout percentage (0-100) */
  rolloutPercentage: number;
  /** Target user segments */
  targetSegments?: string[];
  /** User overrides (userId -> enabled) */
  userOverrides: Map<string, boolean>;
  /** Default value when flag is disabled */
  defaultValue: boolean;
  /** Creation timestamp */
  createdAt: Date;
  /** Last updated timestamp */
  updatedAt: Date;
  /** User ID who created the flag */
  createdBy: string;
  /** Tags for organization */
  tags?: string[];
}

/**
 * Feature flag evaluation result
 */
export interface FlagEvaluation {
  /** Flag key */
  key: string;
  /** Evaluated value */
  value: boolean;
  /** Evaluation reason */
  reason: 'default' | 'override' | 'segment' | 'percentage' | 'disabled';
  /** Variant (if part of experiment) */
  variant?: string;
}

/**
 * Options for creating an experiment
 */
export interface CreateExperimentOptions {
  /** Experiment name */
  name: string;
  /** Experiment description */
  description?: string;
  /** Variants to create */
  variants: Omit<Variant, 'id'>[];
  /** Target segments */
  targetSegments?: string[];
  /** Start date */
  startDate?: Date;
  /** End date */
  endDate?: Date;
  /** User ID creating the experiment */
  createdBy: string;
  /** Metrics to track */
  metrics?: string[];
  /** Minimum sample size */
  minSampleSize?: number;
  /** Auto-start the experiment */
  autoStart?: boolean;
}

/**
 * Options for creating a feature flag
 */
export interface CreateFeatureFlagOptions {
  /** Flag key */
  key: string;
  /** Flag name */
  name: string;
  /** Flag description */
  description?: string;
  /** Initial status */
  status?: FeatureFlagStatus;
  /** Rollout percentage */
  rolloutPercentage?: number;
  /** Target segments */
  targetSegments?: string[];
  /** Default value */
  defaultValue?: boolean;
  /** User ID creating the flag */
  createdBy: string;
  /** Tags */
  tags?: string[];
}

/**
 * Options for tracking conversion
 */
export interface TrackConversionOptions {
  /** User identifier */
  userId: string;
  /** Experiment identifier */
  experimentId: string;
  /** Metric name */
  metric: string;
  /** Metric value (default: 1) */
  value?: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Service configuration
 */
export interface FeatureFlagServiceConfig {
  /** Default confidence level for statistical tests */
  defaultConfidenceLevel: number;
  /** Default minimum sample size */
  defaultMinSampleSize: number;
  /** Hash seed for consistent bucketing */
  hashSeed: string;
  /** Maximum experiments per user */
  maxExperimentsPerUser: number;
  /** Maximum variants per experiment */
  maxVariantsPerExperiment: number;
}
