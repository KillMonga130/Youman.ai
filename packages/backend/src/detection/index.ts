/**
 * Detection Module
 * Exports AI detection service, routes, and types
 * Requirements: 26, 52
 */

export {
  DetectionService,
  createDetectionService,
  getDetectionService,
} from './detection.service';

export { detectionRouter } from './detection.routes';

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
  PassFailIndicator,
  ImprovementSuggestion,
  ReprocessRequest,
  ReprocessResult,
  DetectionTestResult,
  DetectionTestOptions,
} from './types';
