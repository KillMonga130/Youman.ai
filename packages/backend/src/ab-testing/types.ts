/**
 * A/B Testing Service Types
 * Type definitions for variation generation, comparison, and performance tracking
 * Requirements: 34, 121
 */

import { TransformStrategy, HumanizationLevel, TransformMetrics } from '../transform/types';

/**
 * Test status for A/B tests
 */
export type TestStatus = 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';

/**
 * Variation parameters for generating test variations
 */
export interface VariationParams {
  /** Strategies to use for variations */
  strategies?: TransformStrategy[];
  /** Humanization levels to test */
  levels?: HumanizationLevel[];
  /** Whether to include original text as a variation */
  includeOriginal?: boolean;
  /** Custom seed for reproducibility */
  seed?: number;
  /** Maximum variations to generate */
  maxVariations?: number;
}

/**
 * A single variation in an A/B test
 * Requirement 34: A/B testing for content variations
 */
export interface Variation {
  /** Unique variation identifier */
  id: string;
  /** The transformed text */
  text: string;
  /** Strategy used for this variation */
  strategy: TransformStrategy;
  /** Humanization level used */
  level: HumanizationLevel;
  /** AI detection score (0-100, lower is better) */
  detectionScore: number;
  /** List of key differences from original */
  differences: string[];
  /** Word count */
  wordCount: number;
  /** Transformation metrics */
  metrics?: TransformMetrics;
  /** Creation timestamp */
  createdAt: Date;
  /** Whether this is the original text */
  isOriginal: boolean;
}

/**
 * Performance metrics for a variation
 */
export interface PerformanceMetrics {
  /** Number of views/impressions */
  views: number;
  /** Number of positive interactions (clicks, selections) */
  positiveInteractions: number;
  /** Number of negative interactions (rejections) */
  negativeInteractions: number;
  /** Engagement rate (positive / views) */
  engagementRate: number;
  /** Average time spent viewing (ms) */
  averageViewTime: number;
  /** User satisfaction score (0-5) */
  satisfactionScore: number;
  /** Number of ratings */
  ratingCount: number;
  /** Detection score improvement from original */
  detectionImprovement: number;
}

/**
 * Comparison report between variations
 */
export interface ComparisonReport {
  /** Unique report identifier */
  id: string;
  /** Test identifier */
  testId: string;
  /** Variations being compared */
  variations: Variation[];
  /** Side-by-side comparison data */
  sideBySide: SideBySideComparison[];
  /** Statistical analysis */
  statistics: ComparisonStatistics;
  /** Recommendations based on analysis */
  recommendations: string[];
  /** Report generation timestamp */
  generatedAt: Date;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Side-by-side comparison entry
 */
export interface SideBySideComparison {
  /** Segment index */
  segmentIndex: number;
  /** Original text segment */
  original: string;
  /** Variation texts for this segment */
  variations: {
    variationId: string;
    text: string;
    changeType: 'unchanged' | 'modified' | 'added' | 'removed';
  }[];
}

/**
 * Statistical comparison between variations
 */
export interface ComparisonStatistics {
  /** Best performing variation ID */
  bestVariationId: string;
  /** Confidence level (0-1) */
  confidenceLevel: number;
  /** Statistical significance achieved */
  isStatisticallySignificant: boolean;
  /** P-value for significance test */
  pValue: number;
  /** Sample size used */
  sampleSize: number;
  /** Minimum detectable effect */
  minimumDetectableEffect: number;
  /** Variation rankings */
  rankings: VariationRanking[];
}

/**
 * Ranking entry for a variation
 */
export interface VariationRanking {
  /** Variation ID */
  variationId: string;
  /** Overall rank (1 = best) */
  rank: number;
  /** Composite score (0-100) */
  score: number;
  /** Individual metric scores */
  metricScores: {
    detectionScore: number;
    engagementScore: number;
    qualityScore: number;
  };
}

/**
 * A/B Test configuration
 */
export interface ABTest {
  /** Unique test identifier */
  id: string;
  /** Test name */
  name: string;
  /** Test description */
  description?: string;
  /** Original text being tested */
  originalText: string;
  /** Generated variations */
  variations: Variation[];
  /** Test status */
  status: TestStatus;
  /** Variation parameters used */
  parameters: VariationParams;
  /** Performance metrics per variation */
  performanceMetrics: Map<string, PerformanceMetrics>;
  /** Winner variation ID (if determined) */
  winnerId?: string;
  /** User ID who created the test */
  userId: string;
  /** Project ID (optional) */
  projectId?: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Last updated timestamp */
  updatedAt: Date;
  /** Completion timestamp */
  completedAt?: Date;
}

/**
 * Test result report
 */
export interface TestResultReport {
  /** Report identifier */
  id: string;
  /** Test identifier */
  testId: string;
  /** Test name */
  testName: string;
  /** Test duration in milliseconds */
  testDuration: number;
  /** Total variations tested */
  totalVariations: number;
  /** Winner variation */
  winner: Variation;
  /** Winner performance metrics */
  winnerMetrics: PerformanceMetrics;
  /** All variation results */
  allResults: VariationResult[];
  /** Key insights from the test */
  insights: string[];
  /** Recommendations for future tests */
  recommendations: string[];
  /** Report generation timestamp */
  generatedAt: Date;
}

/**
 * Individual variation result
 */
export interface VariationResult {
  /** Variation details */
  variation: Variation;
  /** Performance metrics */
  metrics: PerformanceMetrics;
  /** Rank in the test */
  rank: number;
  /** Improvement over original (percentage) */
  improvementOverOriginal: number;
}

/**
 * Options for creating an A/B test
 */
export interface CreateTestOptions {
  /** Test name */
  name: string;
  /** Test description */
  description?: string;
  /** Original text to test */
  originalText: string;
  /** Number of variations to generate */
  variationCount: number;
  /** Variation parameters */
  parameters?: VariationParams;
  /** User ID */
  userId: string;
  /** Project ID (optional) */
  projectId?: string;
  /** Auto-start the test */
  autoStart?: boolean;
}

/**
 * Options for tracking performance
 */
export interface TrackPerformanceOptions {
  /** Variation ID */
  variationId: string;
  /** Event type */
  eventType: 'view' | 'positive' | 'negative' | 'rating';
  /** View time in milliseconds (for view events) */
  viewTime?: number;
  /** Rating value (for rating events, 0-5) */
  rating?: number;
  /** User ID (optional) */
  userId?: string;
}

/**
 * Service configuration
 */
export interface ABTestingServiceConfig {
  /** Default number of variations */
  defaultVariationCount: number;
  /** Maximum variations per test */
  maxVariationsPerTest: number;
  /** Minimum sample size for significance */
  minSampleSize: number;
  /** Confidence level for statistical tests */
  confidenceLevel: number;
  /** Default strategies to use */
  defaultStrategies: TransformStrategy[];
  /** Default levels to test */
  defaultLevels: HumanizationLevel[];
}
