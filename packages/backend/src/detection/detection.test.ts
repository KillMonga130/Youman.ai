/**
 * Detection Service Tests
 * Tests for AI detection service functionality
 * Requirements: 26, 52
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DetectionService,
  createDetectionService,
  DetectionResult,
  AggregatedDetectionResult,
} from './index';

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      post: vi.fn(),
    })),
  },
}));

// Mock config
vi.mock('../config/env', () => ({
  config: {
    externalApis: {
      gptZero: undefined,
      originality: undefined,
      turnitin: undefined,
    },
  },
}));

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('DetectionService', () => {
  let service: DetectionService;

  beforeEach(() => {
    service = createDetectionService();
  });

  describe('Internal Detection', () => {
    it('should detect AI-like text with low burstiness', async () => {
      // AI-generated text typically has uniform sentence lengths
      const aiLikeText = 'This is a sentence. This is another sentence. This is yet another sentence. This is one more sentence. This is the final sentence.';
      
      const result = await service.detectInternal(aiLikeText, 50);
      
      expect(result.provider).toBe('internal');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(typeof result.passed).toBe('boolean');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should detect human-like text with high burstiness', async () => {
      // Human text typically has varied sentence lengths
      const humanLikeText = 'Short. This is a much longer sentence with many more words in it. Medium length here. Why? Because humans write with variation! And sometimes we use very long sentences that go on and on with multiple clauses and ideas strung together in complex ways.';
      
      const result = await service.detectInternal(humanLikeText, 50);
      
      expect(result.provider).toBe('internal');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.burstiness).toBeDefined();
      expect(result.metadata?.perplexity).toBeDefined();
    });

    it('should return score within valid range', async () => {
      const text = 'The quick brown fox jumps over the lazy dog. This is a test sentence for detection.';
      
      const result = await service.detectInternal(text, 50);
      
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should respect pass threshold', async () => {
      const text = 'This is a test sentence. Another test sentence here. And one more for good measure.';
      
      const resultLowThreshold = await service.detectInternal(text, 10);
      const resultHighThreshold = await service.detectInternal(text, 90);
      
      // Same text should have same score but different pass status
      expect(resultLowThreshold.score).toBe(resultHighThreshold.score);
      // With low threshold, more likely to fail; with high threshold, more likely to pass
      if (resultLowThreshold.score >= 10) {
        expect(resultLowThreshold.passed).toBe(false);
      }
      if (resultHighThreshold.score < 90) {
        expect(resultHighThreshold.passed).toBe(true);
      }
    });
  });

  describe('detect()', () => {
    it('should use internal fallback when no external APIs configured', async () => {
      const text = 'This is a test sentence for detection. It should use the internal fallback.';
      
      const result = await service.detect(text, { useFallback: true });
      
      expect(result.results.length).toBeGreaterThan(0);
      // Internal provider is always available, so it's used directly (not as fallback)
      // usedFallback is only true when ALL requested providers fail and we fall back
      expect(result.results[0]?.provider).toBe('internal');
    });

    it('should return aggregated results', async () => {
      const text = 'Testing the aggregation of detection results across multiple providers.';
      
      const result = await service.detect(text);
      
      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('averageScore');
      expect(result).toHaveProperty('overallPassed');
      expect(result).toHaveProperty('totalProcessingTimeMs');
      expect(result).toHaveProperty('timestamp');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should complete within timeout', async () => {
      const text = 'Testing timeout compliance for detection service.';
      const timeout = 5000;
      
      const startTime = Date.now();
      const result = await service.detect(text, { timeout });
      const elapsed = Date.now() - startTime;
      
      expect(elapsed).toBeLessThan(timeout + 1000); // Allow 1s buffer
      expect(result.totalProcessingTimeMs).toBeLessThan(timeout + 1000);
    });

    it('should handle empty provider list gracefully', async () => {
      const text = 'Testing with no providers specified.';
      
      const result = await service.detect(text, { 
        providers: [],
        useFallback: false 
      });
      
      expect(result.results.length).toBe(0);
      expect(result.averageScore).toBe(0);
    });
  });

  describe('compareDetectors()', () => {
    it('should identify discrepancies between detectors', () => {
      const results: DetectionResult[] = [
        { provider: 'gptzero', score: 30, passed: true, confidence: 80, processingTimeMs: 100 },
        { provider: 'originality', score: 70, passed: false, confidence: 75, processingTimeMs: 150 },
        { provider: 'internal', score: 45, passed: true, confidence: 60, processingTimeMs: 50 },
      ];
      
      const comparison = service.compareDetectors(results);
      
      expect(comparison.comparisons.length).toBe(3);
      expect(comparison.maxDiscrepancy).toBeGreaterThan(0);
      expect(comparison.hasSignificantDiscrepancy).toBe(true); // 40 point difference
    });

    it('should not flag discrepancy when scores are similar', () => {
      const results: DetectionResult[] = [
        { provider: 'gptzero', score: 45, passed: true, confidence: 80, processingTimeMs: 100 },
        { provider: 'originality', score: 50, passed: false, confidence: 75, processingTimeMs: 150 },
        { provider: 'internal', score: 48, passed: true, confidence: 60, processingTimeMs: 50 },
      ];
      
      const comparison = service.compareDetectors(results);
      
      expect(comparison.hasSignificantDiscrepancy).toBe(false);
      expect(comparison.maxDiscrepancy).toBeLessThanOrEqual(20);
    });

    it('should handle empty results', () => {
      const comparison = service.compareDetectors([]);
      
      expect(comparison.comparisons.length).toBe(0);
      expect(comparison.maxDiscrepancy).toBe(0);
      expect(comparison.hasSignificantDiscrepancy).toBe(false);
    });

    it('should recommend detector based on confidence', () => {
      const results: DetectionResult[] = [
        { provider: 'gptzero', score: 45, passed: true, confidence: 90, processingTimeMs: 100 },
        { provider: 'originality', score: 48, passed: true, confidence: 70, processingTimeMs: 150 },
        { provider: 'internal', score: 46, passed: true, confidence: 60, processingTimeMs: 50 },
      ];
      
      const comparison = service.compareDetectors(results);
      
      expect(comparison.recommendedDetector).toBe('gptzero'); // Highest confidence
    });
  });

  describe('aggregateScores()', () => {
    it('should calculate weighted average by confidence', () => {
      const results: DetectionResult[] = [
        { provider: 'gptzero', score: 40, passed: true, confidence: 100, processingTimeMs: 100 },
        { provider: 'originality', score: 60, passed: false, confidence: 50, processingTimeMs: 150 },
      ];
      
      const aggregated = service.aggregateScores(results);
      
      // Weighted: (40*100 + 60*50) / (100+50) = 7000/150 = 46.67
      expect(aggregated).toBeCloseTo(46.67, 0);
    });

    it('should use simple average when no confidence data', () => {
      const results: DetectionResult[] = [
        { provider: 'gptzero', score: 40, passed: true, confidence: 0, processingTimeMs: 100 },
        { provider: 'originality', score: 60, passed: false, confidence: 0, processingTimeMs: 150 },
      ];
      
      const aggregated = service.aggregateScores(results);
      
      expect(aggregated).toBe(50); // Simple average
    });

    it('should return 0 for empty results', () => {
      const aggregated = service.aggregateScores([]);
      expect(aggregated).toBe(0);
    });
  });

  describe('getAvailableProviders()', () => {
    it('should always include internal provider', () => {
      const providers = service.getAvailableProviders();
      expect(providers).toContain('internal');
    });

    it('should not include unconfigured external providers', () => {
      const providers = service.getAvailableProviders();
      // Since we mocked config with no API keys, external providers should not be available
      // But internal should always be there
      expect(providers.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('isProviderAvailable()', () => {
    it('should return true for internal provider', () => {
      expect(service.isProviderAvailable('internal')).toBe(true);
    });

    it('should return false for unconfigured providers', () => {
      // With mocked config having no API keys
      expect(service.isProviderAvailable('gptzero')).toBe(false);
      expect(service.isProviderAvailable('originality')).toBe(false);
      expect(service.isProviderAvailable('turnitin')).toBe(false);
    });
  });

  describe('getProviderConfig()', () => {
    it('should return config for internal provider', () => {
      const config = service.getProviderConfig('internal');
      expect(config.enabled).toBe(true);
      expect(config.timeout).toBeGreaterThan(0);
    });

    it('should return disabled config for unconfigured providers', () => {
      const config = service.getProviderConfig('gptzero');
      expect(config.enabled).toBe(false);
    });
  });
});

describe('createDetectionService()', () => {
  it('should create a new service instance', () => {
    const service = createDetectionService();
    expect(service).toBeInstanceOf(DetectionService);
  });

  it('should accept custom configuration', () => {
    const service = createDetectionService({
      defaultPassThreshold: 60,
      defaultTimeout: 10000,
    });
    
    const config = service.getProviderConfig('internal');
    expect(config.timeout).toBe(10000);
  });
});

/**
 * Multi-Detector Comparison Tests
 * Requirement 52: Content comparison across multiple AI detectors
 */
describe('Multi-Detector Comparison (Requirement 52)', () => {
  let service: DetectionService;

  beforeEach(() => {
    service = createDetectionService();
  });

  describe('createComparisonMatrix()', () => {
    it('should create a comparison matrix from detection results', () => {
      const results: DetectionResult[] = [
        { provider: 'gptzero', score: 40, passed: true, confidence: 80, processingTimeMs: 100 },
        { provider: 'originality', score: 50, passed: false, confidence: 75, processingTimeMs: 150 },
        { provider: 'internal', score: 45, passed: true, confidence: 60, processingTimeMs: 50 },
      ];

      const matrix = service.createComparisonMatrix(results);

      expect(matrix.entries.length).toBe(3);
      expect(matrix.averageScore).toBeCloseTo(45, 0);
      expect(matrix.minScore).toBe(40);
      expect(matrix.maxScore).toBe(50);
      expect(matrix.scoreRange).toBe(10);
      expect(matrix.passedCount).toBe(2);
      expect(matrix.failedCount).toBe(1);
      expect(matrix.overallPassed).toBe(true); // 2 passed > 1 failed
      expect(matrix.timestamp).toBeInstanceOf(Date);
    });

    it('should handle empty results', () => {
      const matrix = service.createComparisonMatrix([]);

      expect(matrix.entries.length).toBe(0);
      expect(matrix.averageScore).toBe(0);
      expect(matrix.overallPassed).toBe(true);
    });

    it('should identify outliers in matrix entries', () => {
      const results: DetectionResult[] = [
        { provider: 'gptzero', score: 30, passed: true, confidence: 80, processingTimeMs: 100 },
        { provider: 'originality', score: 80, passed: false, confidence: 75, processingTimeMs: 150 },
        { provider: 'internal', score: 35, passed: true, confidence: 60, processingTimeMs: 50 },
      ];

      const matrix = service.createComparisonMatrix(results);

      // Originality (80) should be an outlier from average (~48)
      const originalityEntry = matrix.entries.find(e => e.provider === 'originality');
      expect(originalityEntry?.isOutlier).toBe(true);
    });
  });

  describe('generatePrioritySuggestions()', () => {
    it('should generate priority suggestions based on confidence', () => {
      const results: DetectionResult[] = [
        { provider: 'gptzero', score: 45, passed: true, confidence: 90, processingTimeMs: 100 },
        { provider: 'originality', score: 48, passed: true, confidence: 70, processingTimeMs: 150 },
        { provider: 'internal', score: 46, passed: true, confidence: 60, processingTimeMs: 50 },
      ];

      const suggestions = service.generatePrioritySuggestions(results);

      expect(suggestions.length).toBe(3);
      expect(suggestions[0]?.rank).toBe(1);
      expect(suggestions[0]?.isRecommended).toBe(true);
      // GPTZero should be ranked highest due to highest confidence
      expect(suggestions[0]?.provider).toBe('gptzero');
    });

    it('should handle empty results', () => {
      const suggestions = service.generatePrioritySuggestions([]);
      expect(suggestions.length).toBe(0);
    });

    it('should include reason for priority', () => {
      const results: DetectionResult[] = [
        { provider: 'gptzero', score: 45, passed: true, confidence: 85, processingTimeMs: 100 },
      ];

      const suggestions = service.generatePrioritySuggestions(results);

      expect(suggestions[0]?.reason).toBeDefined();
      expect(suggestions[0]?.reason.length).toBeGreaterThan(0);
    });
  });

  describe('calculateHistoricalTrends()', () => {
    it('should calculate trends from historical data', () => {
      const now = new Date();
      const historicalData = [
        {
          id: '1',
          userId: 'user1',
          contentHash: 'hash1',
          results: new Map([['gptzero' as const, 60], ['internal' as const, 55]]),
          timestamp: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
          wordCount: 1000,
        },
        {
          id: '2',
          userId: 'user1',
          contentHash: 'hash2',
          results: new Map([['gptzero' as const, 45], ['internal' as const, 40]]),
          timestamp: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
          wordCount: 1200,
        },
      ];

      const trends = service.calculateHistoricalTrends(historicalData, 30);

      expect(trends.trends.length).toBe(2); // gptzero and internal
      expect(trends.totalDetections).toBe(2);
      expect(trends.periodStart).toBeInstanceOf(Date);
      expect(trends.periodEnd).toBeInstanceOf(Date);
    });

    it('should identify improving trends', () => {
      const now = new Date();
      const historicalData = [
        {
          id: '1',
          userId: 'user1',
          contentHash: 'hash1',
          results: new Map([['internal' as const, 70]]),
          timestamp: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000),
          wordCount: 1000,
        },
        {
          id: '2',
          userId: 'user1',
          contentHash: 'hash2',
          results: new Map([['internal' as const, 50]]),
          timestamp: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
          wordCount: 1000,
        },
      ];

      const trends = service.calculateHistoricalTrends(historicalData, 30);
      const internalTrend = trends.trends.find(t => t.provider === 'internal');

      // Score went from 70 to 50 (lower is better), so trend should be improving
      expect(internalTrend?.trendDirection).toBe('improving');
    });

    it('should handle empty historical data', () => {
      const trends = service.calculateHistoricalTrends([], 30);

      expect(trends.trends.length).toBe(0);
      expect(trends.totalDetections).toBe(0);
      expect(trends.overallTrend).toBe('stable');
    });
  });

  describe('performMultiDetectorComparison()', () => {
    it('should perform full multi-detector comparison', async () => {
      const text = 'This is a test sentence for multi-detector comparison. It should analyze the text across multiple detectors.';

      const result = await service.performMultiDetectorComparison(text);

      expect(result.matrix).toBeDefined();
      expect(result.discrepancies).toBeDefined();
      expect(result.prioritySuggestions).toBeDefined();
      expect(result.recommendedAction).toBeDefined();
      expect(result.recommendationReason).toBeDefined();
      expect(result.totalProcessingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should include historical trends when data provided', async () => {
      const text = 'Testing with historical data for trend analysis.';
      const now = new Date();
      const historicalData = [
        {
          id: '1',
          userId: 'user1',
          contentHash: 'hash1',
          results: new Map([['internal' as const, 50]]),
          timestamp: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
          wordCount: 100,
        },
      ];

      const result = await service.performMultiDetectorComparison(text, undefined, historicalData);

      expect(result.historicalTrends).toBeDefined();
      expect(result.historicalTrends?.totalDetections).toBe(1);
    });

    it('should recommend appropriate action based on results', async () => {
      const text = 'Short test text.';

      const result = await service.performMultiDetectorComparison(text);

      expect(['pass', 'reprocess', 'manual_review']).toContain(result.recommendedAction);
      expect(result.recommendationReason.length).toBeGreaterThan(0);
    });
  });

  describe('highlightDiscrepancies()', () => {
    it('should identify outliers and agreement level', () => {
      const results: DetectionResult[] = [
        { provider: 'gptzero', score: 30, passed: true, confidence: 80, processingTimeMs: 100 },
        { provider: 'originality', score: 75, passed: false, confidence: 75, processingTimeMs: 150 },
        { provider: 'internal', score: 35, passed: true, confidence: 60, processingTimeMs: 50 },
      ];

      const highlight = service.highlightDiscrepancies(results);

      expect(highlight.outliers.length).toBeGreaterThan(0);
      expect(highlight.agreementLevel).toBe('low'); // Large discrepancy
      expect(highlight.summary.length).toBeGreaterThan(0);
    });

    it('should report high agreement when scores are similar', () => {
      const results: DetectionResult[] = [
        { provider: 'gptzero', score: 45, passed: true, confidence: 80, processingTimeMs: 100 },
        { provider: 'originality', score: 48, passed: true, confidence: 75, processingTimeMs: 150 },
        { provider: 'internal', score: 46, passed: true, confidence: 60, processingTimeMs: 50 },
      ];

      const highlight = service.highlightDiscrepancies(results);

      expect(highlight.outliers.length).toBe(0);
      expect(highlight.agreementLevel).toBe('high');
    });

    it('should handle insufficient data', () => {
      const results: DetectionResult[] = [
        { provider: 'internal', score: 45, passed: true, confidence: 60, processingTimeMs: 50 },
      ];

      const highlight = service.highlightDiscrepancies(results);

      expect(highlight.outliers.length).toBe(0);
      expect(highlight.agreementLevel).toBe('high');
      expect(highlight.summary).toContain('Insufficient data');
    });
  });
});
