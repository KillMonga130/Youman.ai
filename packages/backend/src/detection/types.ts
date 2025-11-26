/**
 * Detection Service Types
 * Type definitions for AI detection service integrations
 * Requirements: 26, 52
 */

/**
 * Supported detection providers
 */
export type DetectionProvider = 'gptzero' | 'originality' | 'turnitin' | 'internal';

/**
 * Detection result from a single provider
 */
export interface DetectionResult {
  /** Provider name */
  provider: DetectionProvider;
  /** AI detection score (0-100, higher = more likely AI) */
  score: number;
  /** Whether the content passed detection (score below threshold) */
  passed: boolean;
  /** Confidence level of the detection (0-100) */
  confidence: number;
  /** Time taken for detection in milliseconds */
  processingTimeMs: number;
  /** Error message if detection failed */
  error?: string;
  /** Whether this result is from a fallback provider */
  isFallback?: boolean;
  /** Additional metadata from the provider */
  metadata?: Record<string, unknown>;
}

/**
 * Aggregated detection results from multiple providers
 */
export interface AggregatedDetectionResult {
  /** Individual results from each provider */
  results: DetectionResult[];
  /** Average score across all providers */
  averageScore: number;
  /** Whether content passed all detection tests */
  overallPassed: boolean;
  /** Total processing time in milliseconds */
  totalProcessingTimeMs: number;
  /** Timestamp of the detection */
  timestamp: Date;
  /** Providers that were unavailable */
  unavailableProviders: DetectionProvider[];
  /** Whether fallback was used */
  usedFallback: boolean;
}

/**
 * Detection request options
 */
export interface DetectionOptions {
  /** Specific providers to use (defaults to all available) */
  providers?: DetectionProvider[];
  /** Timeout for each provider in milliseconds (default: 15000) */
  timeout?: number;
  /** Score threshold for passing (default: 50) */
  passThreshold?: number;
  /** Whether to use internal fallback if external APIs fail */
  useFallback?: boolean;
  /** Whether to run providers in parallel */
  parallel?: boolean;
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  /** API key for the provider */
  apiKey?: string;
  /** Base URL for the API */
  baseUrl: string;
  /** Whether the provider is enabled */
  enabled: boolean;
  /** Request timeout in milliseconds */
  timeout: number;
  /** Rate limit (requests per minute) */
  rateLimit?: number;
}

/**
 * Detection service configuration
 */
export interface DetectionServiceConfig {
  /** GPTZero configuration */
  gptzero: ProviderConfig;
  /** Originality.ai configuration */
  originality: ProviderConfig;
  /** Turnitin configuration */
  turnitin: ProviderConfig;
  /** Default pass threshold */
  defaultPassThreshold: number;
  /** Default timeout in milliseconds */
  defaultTimeout: number;
}

/**
 * GPTZero API response structure
 */
export interface GPTZeroResponse {
  documents: Array<{
    average_generated_prob: number;
    completely_generated_prob: number;
    overall_burstiness: number;
    paragraphs: Array<{
      completely_generated_prob: number;
      num_sentences: number;
    }>;
  }>;
}

/**
 * Originality.ai API response structure
 */
export interface OriginalityResponse {
  score: {
    ai: number;
    original: number;
  };
  content: {
    text: string;
  };
}

/**
 * Turnitin API response structure
 */
export interface TurnitinResponse {
  overall_match_percentage: number;
  ai_writing_detection: {
    ai_score: number;
    human_score: number;
  };
}

/**
 * Internal detection model result
 */
export interface InternalDetectionResult {
  /** AI probability score (0-1) */
  aiProbability: number;
  /** Perplexity score */
  perplexity: number;
  /** Burstiness score */
  burstiness: number;
  /** Sentence length variation */
  sentenceLengthVariation: number;
}

/**
 * Multi-detector comparison result
 */
export interface DetectorComparison {
  /** Provider name */
  provider: DetectionProvider;
  /** Detection score */
  score: number;
  /** Difference from average */
  differenceFromAverage: number;
  /** Whether this result is an outlier */
  isOutlier: boolean;
}

/**
 * Discrepancy report between detectors
 */
export interface DiscrepancyReport {
  /** Comparisons for each detector */
  comparisons: DetectorComparison[];
  /** Maximum score difference between detectors */
  maxDiscrepancy: number;
  /** Whether significant discrepancy exists */
  hasSignificantDiscrepancy: boolean;
  /** Recommended detector based on historical accuracy */
  recommendedDetector?: DetectionProvider;
}

/**
 * Comparison matrix entry for multi-detector comparison
 * Requirement 52.2: Show a comparison matrix with scores from each detector
 */
export interface ComparisonMatrixEntry {
  /** Provider name */
  provider: DetectionProvider;
  /** Detection score (0-100) */
  score: number;
  /** Pass/fail status */
  passed: boolean;
  /** Confidence level */
  confidence: number;
  /** Processing time in ms */
  processingTimeMs: number;
  /** Difference from average score */
  differenceFromAverage: number;
  /** Whether this result is an outlier */
  isOutlier: boolean;
  /** Whether this provider is available */
  isAvailable: boolean;
}

/**
 * Comparison matrix for multi-detector comparison
 * Requirement 52.2: Show a comparison matrix with scores from each detector
 */
export interface ComparisonMatrix {
  /** Matrix entries for each detector */
  entries: ComparisonMatrixEntry[];
  /** Average score across all detectors */
  averageScore: number;
  /** Minimum score */
  minScore: number;
  /** Maximum score */
  maxScore: number;
  /** Score range (max - min) */
  scoreRange: number;
  /** Overall pass/fail based on majority */
  overallPassed: boolean;
  /** Number of detectors that passed */
  passedCount: number;
  /** Number of detectors that failed */
  failedCount: number;
  /** Timestamp of comparison */
  timestamp: Date;
}

/**
 * Historical detection record for trend tracking
 * Requirement 52.4: Show trends in how each detector has scored content over time
 */
export interface HistoricalDetectionRecord {
  /** Unique record ID */
  id: string;
  /** User ID */
  userId: string;
  /** Project ID (optional) */
  projectId?: string;
  /** Content hash for deduplication */
  contentHash: string;
  /** Detection results by provider */
  results: Map<DetectionProvider, number>;
  /** Timestamp of detection */
  timestamp: Date;
  /** Text length in words */
  wordCount: number;
}

/**
 * Trend data point for a single detector
 */
export interface DetectorTrendPoint {
  /** Timestamp */
  timestamp: Date;
  /** Detection score */
  score: number;
  /** Content hash */
  contentHash: string;
}

/**
 * Trend data for a single detector
 * Requirement 52.4: Show trends in how each detector has scored content over time
 */
export interface DetectorTrend {
  /** Provider name */
  provider: DetectionProvider;
  /** Historical data points */
  dataPoints: DetectorTrendPoint[];
  /** Average score over time */
  averageScore: number;
  /** Score trend direction */
  trendDirection: 'improving' | 'worsening' | 'stable';
  /** Score change over period */
  scoreChange: number;
  /** Number of detections */
  detectionCount: number;
}

/**
 * Historical trend report
 * Requirement 52.4: Show trends in how each detector has scored content over time
 */
export interface HistoricalTrendReport {
  /** Trends for each detector */
  trends: DetectorTrend[];
  /** Overall trend across all detectors */
  overallTrend: 'improving' | 'worsening' | 'stable';
  /** Time period covered */
  periodStart: Date;
  /** Time period end */
  periodEnd: Date;
  /** Total number of detections in period */
  totalDetections: number;
}

/**
 * Detector priority suggestion
 * Requirement 52.3: Suggest which detector to prioritize
 */
export interface DetectorPrioritySuggestion {
  /** Provider name */
  provider: DetectionProvider;
  /** Priority rank (1 = highest priority) */
  rank: number;
  /** Reason for priority */
  reason: string;
  /** Reliability score (0-100) */
  reliabilityScore: number;
  /** Historical accuracy (0-100) */
  historicalAccuracy: number;
  /** Average response time in ms */
  averageResponseTime: number;
  /** Whether this detector is recommended */
  isRecommended: boolean;
}

/**
 * Multi-detector comparison result
 * Requirement 52: Content comparison across multiple AI detectors
 */
export interface MultiDetectorComparisonResult {
  /** Comparison matrix */
  matrix: ComparisonMatrix;
  /** Discrepancy report */
  discrepancies: DiscrepancyReport;
  /** Priority suggestions */
  prioritySuggestions: DetectorPrioritySuggestion[];
  /** Historical trends (if available) */
  historicalTrends?: HistoricalTrendReport;
  /** Recommended action based on results */
  recommendedAction: 'pass' | 'reprocess' | 'manual_review';
  /** Explanation for recommendation */
  recommendationReason: string;
  /** Total processing time */
  totalProcessingTimeMs: number;
}
