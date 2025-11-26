/**
 * Detection Module
 * Exports AI detection service and types
 * Requirements: 26, 52
 */

export {
  DetectionService,
  createDetectionService,
  getDetectionService,
} from './detection.service';

export type {
  DetectionProvider,
  DetectionResult,
  AggregatedDetectionResult,
  DetectionOptions,
  ProviderConfig,
  DetectionServiceConfig,
  GPTZeroResponse,
  OriginalityResponse,
  TurnitinResponse,
  InternalDetectionResult,
  DetectorComparison,
  DiscrepancyReport,
  ComparisonMatrixEntry,
  ComparisonMatrix,
  HistoricalDetectionRecord,
  DetectorTrendPoint,
  DetectorTrend,
  HistoricalTrendReport,
  DetectorPrioritySuggestion,
  MultiDetectorComparisonResult,
} from './types';
