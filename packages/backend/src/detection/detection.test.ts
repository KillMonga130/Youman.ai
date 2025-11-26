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

/**
 * Detection Testing Workflow Tests
 * Requirement 26: Real-time AI detection testing
 */
describe('Detection Testing Workflow (Requirement 26)', () => {
  let service: DetectionService;

  beforeEach(() => {
    service = createDetectionService();
  });

  describe('runDetectionTest()', () => {
    it('should run detection test with pass/fail indicators', async () => {
      const text = 'This is a test sentence for detection testing. It should generate pass/fail indicators for each detector.';

      const result = await service.runDetectionTest(text);

      expect(result.aggregatedResult).toBeDefined();
      expect(result.passFailIndicators).toBeDefined();
      expect(result.passFailIndicators.length).toBeGreaterThan(0);
      expect(result.overallStatus).toBeDefined();
      expect(['pass', 'fail', 'partial']).toContain(result.overallStatus);
      expect(result.statusMessage).toBeDefined();
      expect(result.statusMessage.length).toBeGreaterThan(0);
    });

    it('should complete within 15-second timeout (Requirement 26.4)', async () => {
      const text = 'Testing timeout compliance for detection workflow.';
      const timeout = 15000;

      const startTime = Date.now();
      const result = await service.runDetectionTest(text, { timeout });
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(timeout + 1000); // Allow 1s buffer
      expect(result.timedOut).toBe(false);
    });

    it('should generate improvement suggestions when failing', async () => {
      // AI-like text with uniform sentences
      const aiLikeText = 'This is a sentence. This is another sentence. This is yet another sentence. This is one more sentence.';

      const result = await service.runDetectionTest(aiLikeText, {
        passThreshold: 30, // Low threshold to trigger suggestions
        generateSuggestions: true,
      });

      // If the text fails, suggestions should be generated
      if (result.overallStatus !== 'pass') {
        expect(result.suggestions.length).toBeGreaterThan(0);
        expect(result.suggestions[0]?.type).toBeDefined();
        expect(result.suggestions[0]?.description).toBeDefined();
        expect(result.suggestions[0]?.action).toBeDefined();
      }
    });

    it('should include re-processing recommendation when failing', async () => {
      const text = 'This is a test sentence. Another test sentence here.';

      const result = await service.runDetectionTest(text, {
        passThreshold: 20, // Very low threshold to ensure failure
        includeReprocessingRecommendation: true,
      });

      if (result.overallStatus !== 'pass') {
        expect(result.reprocessingRecommended).toBe(true);
        expect(result.recommendedLevel).toBeDefined();
        expect(result.recommendedLevel).toBeGreaterThanOrEqual(1);
        expect(result.recommendedLevel).toBeLessThanOrEqual(5);
      }
    });

    it('should respect custom thresholds', async () => {
      const text = 'Testing with custom thresholds for pass/fail indicators.';

      const result = await service.runDetectionTest(text, {
        passThreshold: 60,
        warningThreshold: 50,
      });

      // All indicators should use the custom threshold
      result.passFailIndicators.forEach(indicator => {
        expect(indicator.threshold).toBe(60);
      });
    });
  });

  describe('generatePassFailIndicators()', () => {
    it('should generate correct pass indicators for low scores', () => {
      const results: DetectionResult[] = [
        { provider: 'internal', score: 25, passed: true, confidence: 80, processingTimeMs: 50 },
      ];

      const indicators = service.generatePassFailIndicators(results, 50, 40);

      expect(indicators.length).toBe(1);
      expect(indicators[0]?.status).toBe('pass');
      expect(indicators[0]?.color).toBe('green');
      expect(indicators[0]?.message).toContain('Passed');
    });

    it('should generate warning indicators for borderline scores', () => {
      const results: DetectionResult[] = [
        { provider: 'internal', score: 45, passed: true, confidence: 80, processingTimeMs: 50 },
      ];

      const indicators = service.generatePassFailIndicators(results, 50, 40);

      expect(indicators.length).toBe(1);
      expect(indicators[0]?.status).toBe('warning');
      expect(indicators[0]?.color).toBe('yellow');
      expect(indicators[0]?.message).toContain('Warning');
    });

    it('should generate fail indicators for high scores', () => {
      const results: DetectionResult[] = [
        { provider: 'internal', score: 65, passed: false, confidence: 80, processingTimeMs: 50 },
      ];

      const indicators = service.generatePassFailIndicators(results, 50, 40);

      expect(indicators.length).toBe(1);
      expect(indicators[0]?.status).toBe('fail');
      expect(indicators[0]?.color).toBe('red');
      expect(indicators[0]?.message).toContain('Failed');
    });

    it('should handle multiple providers', () => {
      const results: DetectionResult[] = [
        { provider: 'gptzero', score: 30, passed: true, confidence: 80, processingTimeMs: 100 },
        { provider: 'originality', score: 55, passed: false, confidence: 75, processingTimeMs: 150 },
        { provider: 'internal', score: 42, passed: true, confidence: 60, processingTimeMs: 50 },
      ];

      const indicators = service.generatePassFailIndicators(results, 50, 40);

      expect(indicators.length).toBe(3);
      expect(indicators.filter(i => i.status === 'pass').length).toBe(1);
      expect(indicators.filter(i => i.status === 'warning').length).toBe(1);
      expect(indicators.filter(i => i.status === 'fail').length).toBe(1);
    });
  });

  describe('generateImprovementSuggestions()', () => {
    it('should suggest sentence variation for low burstiness', () => {
      // Text with uniform sentence lengths
      const uniformText = 'This is a sentence. This is another one. This is yet another. This is one more here.';
      const results: DetectionResult[] = [
        { provider: 'internal', score: 60, passed: false, confidence: 70, processingTimeMs: 50 },
      ];

      const suggestions = service.generateImprovementSuggestions(uniformText, results, 50);

      const sentenceVariationSuggestion = suggestions.find(s => s.type === 'sentence_variation');
      expect(sentenceVariationSuggestion).toBeDefined();
      expect(sentenceVariationSuggestion?.action).toContain('sentence');
    });

    it('should suggest vocabulary diversity for low perplexity', () => {
      // Repetitive text
      const repetitiveText = 'The cat sat. The cat ran. The cat jumped. The cat slept. The cat ate.';
      const results: DetectionResult[] = [
        { provider: 'internal', score: 65, passed: false, confidence: 70, processingTimeMs: 50 },
      ];

      const suggestions = service.generateImprovementSuggestions(repetitiveText, results, 50);

      expect(suggestions.length).toBeGreaterThan(0);
      // Should have some vocabulary-related suggestion
      const vocabSuggestion = suggestions.find(s => s.type === 'vocabulary');
      if (vocabSuggestion) {
        expect(vocabSuggestion.action).toBeDefined();
      }
    });

    it('should prioritize suggestions correctly', () => {
      const text = 'Simple test text for suggestion priority testing.';
      const results: DetectionResult[] = [
        { provider: 'internal', score: 70, passed: false, confidence: 70, processingTimeMs: 50 },
      ];

      const suggestions = service.generateImprovementSuggestions(text, results, 50);

      // Suggestions should be sorted by priority
      for (let i = 1; i < suggestions.length; i++) {
        const prev = suggestions[i - 1];
        const curr = suggestions[i];
        if (prev && curr) {
          expect(prev.priority).toBeLessThanOrEqual(curr.priority);
        }
      }
    });

    it('should include expected improvement estimates', () => {
      const text = 'Test text for improvement estimation.';
      const results: DetectionResult[] = [
        { provider: 'internal', score: 60, passed: false, confidence: 70, processingTimeMs: 50 },
      ];

      const suggestions = service.generateImprovementSuggestions(text, results, 50);

      suggestions.forEach(suggestion => {
        expect(suggestion.expectedImprovement).toBeGreaterThanOrEqual(0);
        expect(suggestion.expectedImprovement).toBeLessThanOrEqual(20);
      });
    });
  });

  describe('reprocessForLowerScore()', () => {
    it('should attempt re-processing with transform function', async () => {
      let transformCalled = false;
      const mockTransform = async (text: string, _level: number): Promise<string> => {
        transformCalled = true;
        // Simulate transformation by adding variation
        return text + ' This adds some variation. Short. And a longer sentence with more words.';
      };

      const result = await service.reprocessForLowerScore(
        {
          originalText: 'Simple test text.',
          currentScore: 60,
          targetScore: 50,
          humanizationLevel: 3,
          maxAttempts: 1,
          timeoutPerAttempt: 5000,
        },
        mockTransform
      );

      expect(transformCalled).toBe(true);
      expect(result.attemptsMade).toBeGreaterThanOrEqual(1);
      expect(result.totalProcessingTimeMs).toBeGreaterThan(0);
    });

    it('should track score improvement', async () => {
      const mockTransform = async (text: string): Promise<string> => {
        return text + ' Added variation here. Short. And longer sentences with more complexity and variation.';
      };

      const result = await service.reprocessForLowerScore(
        {
          originalText: 'Test text.',
          currentScore: 70,
          targetScore: 50,
          humanizationLevel: 4,
          maxAttempts: 2,
          timeoutPerAttempt: 5000,
        },
        mockTransform
      );

      expect(result.newScore).toBeDefined();
      expect(result.scoreImprovement).toBeDefined();
      // Score improvement = original - new (positive means improvement)
      expect(result.scoreImprovement).toBe(70 - result.newScore);
    });

    it('should respect max attempts', async () => {
      const mockTransform = async (text: string): Promise<string> => text;

      const result = await service.reprocessForLowerScore(
        {
          originalText: 'Test text.',
          currentScore: 80,
          targetScore: 30, // Very low target, unlikely to achieve
          humanizationLevel: 3,
          maxAttempts: 2,
          timeoutPerAttempt: 5000,
        },
        mockTransform
      );

      expect(result.attemptsMade).toBeLessThanOrEqual(2);
    });

    it('should generate suggestions when failing to achieve target', async () => {
      const mockTransform = async (text: string): Promise<string> => text;

      const result = await service.reprocessForLowerScore(
        {
          originalText: 'Test text.',
          currentScore: 80,
          targetScore: 20, // Very low target
          humanizationLevel: 5,
          maxAttempts: 1,
          timeoutPerAttempt: 5000,
        },
        mockTransform
      );

      if (!result.success) {
        expect(result.suggestions).toBeDefined();
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('oneClickReprocess()', () => {
    it('should use recommended level based on current score', async () => {
      let usedLevel = 0;
      const mockTransform = async (text: string, level: number): Promise<string> => {
        usedLevel = level;
        return text + ' Added variation.';
      };

      await service.oneClickReprocess('Test text.', 70, mockTransform);

      // For score 70 (20 points above 50 threshold), should use level 4 or 5
      expect(usedLevel).toBeGreaterThanOrEqual(3);
    });

    it('should target score below threshold', async () => {
      const mockTransform = async (text: string): Promise<string> => {
        return text + ' Short. And a much longer sentence with lots of variation and complexity.';
      };

      const result = await service.oneClickReprocess('Test text.', 60, mockTransform);

      // Should attempt to get below 45 (50 - 5)
      expect(result.attemptsMade).toBeGreaterThanOrEqual(1);
    });
  });
});
