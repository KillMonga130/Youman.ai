/**
 * A/B Testing Service
 * Provides variation generation, comparison, and performance tracking
 * Requirements: 34, 121
 */

import crypto from 'crypto';
import { logger } from '../utils/logger';
import { TransformStrategy, HumanizationLevel, TransformMetrics } from '../transform/types';
import {
  Variation,
  VariationParams,
  PerformanceMetrics,
  ComparisonReport,
  SideBySideComparison,
  ComparisonStatistics,
  VariationRanking,
  ABTest,
  TestStatus,
  TestResultReport,
  VariationResult,
  CreateTestOptions,
  TrackPerformanceOptions,
  ABTestingServiceConfig,
} from './types';

/** Default configuration */
const DEFAULT_CONFIG: ABTestingServiceConfig = {
  defaultVariationCount: 3,
  maxVariationsPerTest: 10,
  minSampleSize: 30,
  confidenceLevel: 0.95,
  defaultStrategies: ['casual', 'professional', 'academic'],
  defaultLevels: [2, 3, 4],
};

/** Transformation patterns for different strategies */
const STRATEGY_PATTERNS: Record<TransformStrategy, { patterns: Array<{ from: RegExp; to: string }> }> = {
  casual: {
    patterns: [
      { from: /\bTherefore\b/g, to: 'So' },
      { from: /\bHowever\b/g, to: 'But' },
      { from: /\bFurthermore\b/g, to: 'Also' },
      { from: /\bConsequently\b/g, to: 'As a result' },
      { from: /\bNevertheless\b/g, to: 'Still' },
      { from: /\bUtilize\b/gi, to: 'use' },
      { from: /\bImplement\b/gi, to: 'do' },
      { from: /\bFacilitate\b/gi, to: 'help' },
      { from: /\bCommence\b/gi, to: 'start' },
      { from: /\bTerminate\b/gi, to: 'end' },
    ],
  },
  professional: {
    patterns: [
      { from: /\bso\b/gi, to: 'therefore' },
      { from: /\bbut\b/gi, to: 'however' },
      { from: /\balso\b/gi, to: 'additionally' },
      { from: /\buse\b/gi, to: 'utilize' },
      { from: /\bhelp\b/gi, to: 'assist' },
      { from: /\bstart\b/gi, to: 'initiate' },
      { from: /\bend\b/gi, to: 'conclude' },
    ],
  },
  academic: {
    patterns: [
      { from: /\bshows\b/gi, to: 'demonstrates' },
      { from: /\bthink\b/gi, to: 'hypothesize' },
      { from: /\bstudy\b/gi, to: 'research' },
      { from: /\bfind\b/gi, to: 'observe' },
      { from: /\buse\b/gi, to: 'employ' },
      { from: /\bget\b/gi, to: 'obtain' },
      { from: /\bmake\b/gi, to: 'construct' },
    ],
  },
  auto: {
    patterns: [],
  },
};

/** Level intensity multipliers */
const LEVEL_INTENSITY: Record<HumanizationLevel, number> = {
  1: 0.2,
  2: 0.4,
  3: 0.6,
  4: 0.8,
  5: 1.0,
};

/**
 * A/B Testing Service class
 * Handles variation generation, comparison, and performance tracking
 */
export class ABTestingService {
  private config: ABTestingServiceConfig;
  private tests: Map<string, ABTest>;
  private performanceData: Map<string, PerformanceMetrics>;

  constructor(serviceConfig?: Partial<ABTestingServiceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...serviceConfig };
    this.tests = new Map();
    this.performanceData = new Map();
  }

  /**
   * Generates variations of text for A/B testing
   * Requirement 34: A/B testing for content variations
   * @param text - Original text to generate variations from
   * @param count - Number of variations to generate
   * @param parameters - Variation parameters
   * @returns Array of variations
   */
  async generateVariations(
    text: string,
    count: number,
    parameters: VariationParams = {}
  ): Promise<Variation[]> {
    const startTime = Date.now();
    const variations: Variation[] = [];

    // Validate inputs
    if (!text || text.trim().length === 0) {
      throw new Error('Text is required for variation generation');
    }

    const effectiveCount = Math.min(count, this.config.maxVariationsPerTest);
    const strategies = parameters.strategies || this.config.defaultStrategies;
    const levels = parameters.levels || this.config.defaultLevels;

    // Include original if requested
    if (parameters.includeOriginal) {
      variations.push(this.createOriginalVariation(text));
    }

    // Generate variations using different strategy/level combinations
    const combinations = this.generateCombinations(strategies, levels, effectiveCount);

    for (const { strategy, level } of combinations) {
      if (variations.length >= effectiveCount) break;

      const variation = await this.createVariation(text, strategy, level);
      variations.push(variation);
    }

    logger.info(`Generated ${variations.length} variations in ${Date.now() - startTime}ms`);
    return variations;
  }


  /**
   * Compares variations and generates a comparison report
   * Requirement 34: Side-by-side comparison display
   * @param variations - Variations to compare
   * @returns Comparison report
   */
  async compareVariations(variations: Variation[]): Promise<ComparisonReport> {
    const startTime = Date.now();
    const id = this.generateId('report');
    const testId = this.generateId('test');

    if (variations.length < 2) {
      throw new Error('At least 2 variations are required for comparison');
    }

    // Generate side-by-side comparison
    const sideBySide = this.generateSideBySideComparison(variations);

    // Calculate statistics
    const statistics = this.calculateComparisonStatistics(variations);

    // Generate recommendations
    const recommendations = this.generateRecommendations(variations, statistics);

    return {
      id,
      testId,
      variations,
      sideBySide,
      statistics,
      recommendations,
      generatedAt: new Date(),
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Tracks performance metrics for a variation
   * Requirement 121: Performance tracking
   * @param variationId - Variation identifier
   * @param metrics - Performance metrics to track
   */
  async trackPerformance(variationId: string, options: TrackPerformanceOptions): Promise<void> {
    let metrics = this.performanceData.get(variationId);

    if (!metrics) {
      metrics = this.createEmptyPerformanceMetrics();
      this.performanceData.set(variationId, metrics);
    }

    switch (options.eventType) {
      case 'view':
        metrics.views++;
        if (options.viewTime) {
          const totalTime = metrics.averageViewTime * (metrics.views - 1) + options.viewTime;
          metrics.averageViewTime = totalTime / metrics.views;
        }
        break;
      case 'positive':
        metrics.positiveInteractions++;
        break;
      case 'negative':
        metrics.negativeInteractions++;
        break;
      case 'rating':
        if (options.rating !== undefined) {
          const totalRating = metrics.satisfactionScore * metrics.ratingCount + options.rating;
          metrics.ratingCount++;
          metrics.satisfactionScore = totalRating / metrics.ratingCount;
        }
        break;
    }

    // Update engagement rate
    if (metrics.views > 0) {
      metrics.engagementRate = metrics.positiveInteractions / metrics.views;
    }

    logger.debug(`Tracked ${options.eventType} event for variation ${variationId}`);
  }

  /**
   * Selects the winning variation based on performance
   * Requirement 121: Winner selection analytics
   * @param testId - Test identifier
   * @returns Winning variation
   */
  async selectWinner(testId: string): Promise<Variation> {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test not found: ${testId}`);
    }

    if (test.variations.length === 0) {
      throw new Error('No variations to select winner from');
    }

    // Calculate scores for each variation
    const scores: Array<{ variation: Variation; score: number }> = [];

    for (const variation of test.variations) {
      const metrics = this.performanceData.get(variation.id) || this.createEmptyPerformanceMetrics();
      const score = this.calculateVariationScore(variation, metrics);
      scores.push({ variation, score });
    }

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    const winner = scores[0]?.variation;
    if (!winner) {
      throw new Error('Could not determine winner');
    }

    // Update test with winner
    test.winnerId = winner.id;
    test.status = 'completed';
    test.completedAt = new Date();
    test.updatedAt = new Date();

    logger.info(`Selected winner for test ${testId}: ${winner.id}`);
    return winner;
  }


  /**
   * Creates a new A/B test
   * @param options - Test creation options
   * @returns Created test
   */
  async createTest(options: CreateTestOptions): Promise<ABTest> {
    const id = this.generateId('test');
    const parameters: VariationParams = options.parameters || {};

    // Generate variations
    const variations = await this.generateVariations(
      options.originalText,
      options.variationCount,
      parameters
    );

    const test: ABTest = {
      id,
      name: options.name,
      description: options.description,
      originalText: options.originalText,
      variations,
      status: options.autoStart ? 'running' : 'draft',
      parameters,
      performanceMetrics: new Map(),
      userId: options.userId,
      projectId: options.projectId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.tests.set(id, test);
    logger.info(`Created A/B test: ${id} with ${variations.length} variations`);

    return test;
  }

  /**
   * Gets a test by ID
   * @param testId - Test identifier
   * @returns Test or null
   */
  async getTest(testId: string): Promise<ABTest | null> {
    return this.tests.get(testId) || null;
  }

  /**
   * Updates test status
   * @param testId - Test identifier
   * @param status - New status
   */
  async updateTestStatus(testId: string, status: TestStatus): Promise<void> {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test not found: ${testId}`);
    }

    test.status = status;
    test.updatedAt = new Date();

    if (status === 'completed') {
      test.completedAt = new Date();
    }
  }

  /**
   * Generates a test result report
   * Requirement 34: Create test result reports
   * @param testId - Test identifier
   * @returns Test result report
   */
  async generateTestReport(testId: string): Promise<TestResultReport> {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test not found: ${testId}`);
    }

    // Get winner or select one
    let winner: Variation;
    if (test.winnerId) {
      winner = test.variations.find(v => v.id === test.winnerId)!;
    } else {
      winner = await this.selectWinner(testId);
    }

    const winnerMetrics = this.performanceData.get(winner.id) || this.createEmptyPerformanceMetrics();

    // Calculate results for all variations
    const allResults: VariationResult[] = [];
    const originalVariation = test.variations.find(v => v.isOriginal);
    const originalScore = originalVariation?.detectionScore || 100;

    for (let i = 0; i < test.variations.length; i++) {
      const variation = test.variations[i];
      if (!variation) continue;
      
      const metrics = this.performanceData.get(variation.id) || this.createEmptyPerformanceMetrics();
      const improvement = originalScore > 0 
        ? ((originalScore - variation.detectionScore) / originalScore) * 100 
        : 0;

      allResults.push({
        variation,
        metrics,
        rank: i + 1,
        improvementOverOriginal: improvement,
      });
    }

    // Sort by detection score (lower is better)
    allResults.sort((a, b) => a.variation.detectionScore - b.variation.detectionScore);
    allResults.forEach((r, i) => r.rank = i + 1);

    // Generate insights
    const insights = this.generateInsights(test, allResults);
    const recommendations = this.generateTestRecommendations(test, allResults);

    const testDuration = test.completedAt 
      ? test.completedAt.getTime() - test.createdAt.getTime()
      : Date.now() - test.createdAt.getTime();

    return {
      id: this.generateId('report'),
      testId,
      testName: test.name,
      testDuration,
      totalVariations: test.variations.length,
      winner,
      winnerMetrics,
      allResults,
      insights,
      recommendations,
      generatedAt: new Date(),
    };
  }


  /**
   * Gets performance metrics for a variation
   * @param variationId - Variation identifier
   * @returns Performance metrics
   */
  getPerformanceMetrics(variationId: string): PerformanceMetrics {
    return this.performanceData.get(variationId) || this.createEmptyPerformanceMetrics();
  }

  // ============ Private Helper Methods ============

  /**
   * Generates a unique identifier
   */
  private generateId(prefix: string): string {
    return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Creates the original text as a variation
   */
  private createOriginalVariation(text: string): Variation {
    return {
      id: this.generateId('var'),
      text,
      strategy: 'auto',
      level: 3,
      detectionScore: this.estimateDetectionScore(text),
      differences: [],
      wordCount: this.countWords(text),
      createdAt: new Date(),
      isOriginal: true,
    };
  }

  /**
   * Creates a variation with the given strategy and level
   */
  private async createVariation(
    originalText: string,
    strategy: TransformStrategy,
    level: HumanizationLevel
  ): Promise<Variation> {
    const transformedText = this.applyTransformation(originalText, strategy, level);
    const differences = this.findDifferences(originalText, transformedText);

    return {
      id: this.generateId('var'),
      text: transformedText,
      strategy,
      level,
      detectionScore: this.estimateDetectionScore(transformedText),
      differences,
      wordCount: this.countWords(transformedText),
      createdAt: new Date(),
      isOriginal: false,
    };
  }

  /**
   * Applies transformation based on strategy and level
   */
  private applyTransformation(
    text: string,
    strategy: TransformStrategy,
    level: HumanizationLevel
  ): string {
    let result = text;
    const effectiveStrategy = strategy === 'auto' ? this.detectBestStrategy(text) : strategy;
    const patterns = STRATEGY_PATTERNS[effectiveStrategy]?.patterns || [];
    const intensity = LEVEL_INTENSITY[level];

    // Apply patterns based on intensity
    for (const pattern of patterns) {
      if (Math.random() < intensity) {
        result = result.replace(pattern.from, pattern.to);
      }
    }

    // Add sentence variation based on level
    result = this.addSentenceVariation(result, level);

    return result;
  }

  /**
   * Detects the best strategy for the text
   */
  private detectBestStrategy(text: string): TransformStrategy {
    const lowerText = text.toLowerCase();
    
    // Check for academic indicators
    if (/\b(hypothesis|methodology|empirical|theoretical|research)\b/i.test(text)) {
      return 'academic';
    }
    
    // Check for professional indicators
    if (/\b(stakeholder|deliverable|synergy|leverage|optimize)\b/i.test(text)) {
      return 'professional';
    }
    
    // Check for casual indicators
    if (/\b(gonna|wanna|kinda|awesome|cool)\b/i.test(lowerText)) {
      return 'casual';
    }
    
    return 'professional'; // Default
  }

  /**
   * Adds sentence variation based on level
   */
  private addSentenceVariation(text: string, level: HumanizationLevel): string {
    const sentences = text.split(/(?<=[.!?])\s+/);
    const intensity = LEVEL_INTENSITY[level];
    
    return sentences.map(sentence => {
      if (Math.random() < intensity * 0.3) {
        // Add occasional filler words for higher levels
        const fillers = ['Actually, ', 'In fact, ', 'Interestingly, ', 'Notably, '];
        const filler = fillers[Math.floor(Math.random() * fillers.length)];
        return filler + sentence.charAt(0).toLowerCase() + sentence.slice(1);
      }
      return sentence;
    }).join(' ');
  }

  /**
   * Finds differences between original and transformed text
   */
  private findDifferences(original: string, transformed: string): string[] {
    const differences: string[] = [];
    const originalWords = original.split(/\s+/);
    const transformedWords = transformed.split(/\s+/);

    const maxLen = Math.max(originalWords.length, transformedWords.length);
    for (let i = 0; i < maxLen; i++) {
      if (originalWords[i] !== transformedWords[i]) {
        const orig = originalWords[i] || '(removed)';
        const trans = transformedWords[i] || '(added)';
        differences.push(`"${orig}" → "${trans}"`);
        if (differences.length >= 10) break; // Limit differences shown
      }
    }

    return differences;
  }


  /**
   * Estimates AI detection score (simplified simulation)
   */
  private estimateDetectionScore(text: string): number {
    // Simplified detection score estimation
    // In production, this would call actual detection APIs
    const words = text.split(/\s+/);
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    const lexicalDiversity = uniqueWords.size / words.length;

    // Calculate sentence length variation
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const sentenceLengths = sentences.map(s => s.split(/\s+/).length);
    const avgLength = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length || 0;
    const variance = sentenceLengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / sentenceLengths.length || 0;
    const stdDev = Math.sqrt(variance);

    // Higher diversity and variation = lower detection score
    const diversityFactor = Math.min(1, lexicalDiversity * 2);
    const variationFactor = Math.min(1, stdDev / 10);

    // Base score starts high (AI-like) and decreases with human-like features
    const baseScore = 70;
    const score = baseScore - (diversityFactor * 20) - (variationFactor * 20);

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Counts words in text
   */
  private countWords(text: string): number {
    return text.split(/\s+/).filter(w => w.length > 0).length;
  }

  /**
   * Generates strategy/level combinations
   */
  private generateCombinations(
    strategies: TransformStrategy[],
    levels: HumanizationLevel[],
    maxCount: number
  ): Array<{ strategy: TransformStrategy; level: HumanizationLevel }> {
    const combinations: Array<{ strategy: TransformStrategy; level: HumanizationLevel }> = [];

    for (const strategy of strategies) {
      for (const level of levels) {
        combinations.push({ strategy, level });
        if (combinations.length >= maxCount) break;
      }
      if (combinations.length >= maxCount) break;
    }

    return combinations;
  }

  /**
   * Generates side-by-side comparison
   */
  private generateSideBySideComparison(variations: Variation[]): SideBySideComparison[] {
    const comparisons: SideBySideComparison[] = [];
    
    // Split first variation into segments for comparison
    const baseVariation = variations[0];
    if (!baseVariation) return comparisons;

    const segments = baseVariation.text.split(/(?<=[.!?])\s+/).slice(0, 10); // Limit to 10 segments

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      if (!segment) continue;

      const variationTexts = variations.map(v => {
        const vSegments = v.text.split(/(?<=[.!?])\s+/);
        const vSegment = vSegments[i] || '';
        return {
          variationId: v.id,
          text: vSegment,
          changeType: this.determineChangeType(segment, vSegment),
        };
      });

      comparisons.push({
        segmentIndex: i,
        original: segment,
        variations: variationTexts,
      });
    }

    return comparisons;
  }

  /**
   * Determines the type of change between segments
   */
  private determineChangeType(
    original: string,
    variation: string
  ): 'unchanged' | 'modified' | 'added' | 'removed' {
    if (original === variation) return 'unchanged';
    if (!original && variation) return 'added';
    if (original && !variation) return 'removed';
    return 'modified';
  }

  /**
   * Calculates comparison statistics
   */
  private calculateComparisonStatistics(variations: Variation[]): ComparisonStatistics {
    // Sort by detection score (lower is better)
    const sorted = [...variations].sort((a, b) => a.detectionScore - b.detectionScore);
    const best = sorted[0];

    // Calculate rankings
    const rankings: VariationRanking[] = sorted.map((v, i) => ({
      variationId: v.id,
      rank: i + 1,
      score: 100 - v.detectionScore, // Invert so higher is better
      metricScores: {
        detectionScore: 100 - v.detectionScore,
        engagementScore: 50, // Placeholder
        qualityScore: 50, // Placeholder
      },
    }));

    return {
      bestVariationId: best?.id || '',
      confidenceLevel: this.config.confidenceLevel,
      isStatisticallySignificant: variations.length >= this.config.minSampleSize,
      pValue: 0.05, // Simplified
      sampleSize: variations.length,
      minimumDetectableEffect: 0.1,
      rankings,
    };
  }


  /**
   * Generates recommendations based on comparison
   */
  private generateRecommendations(
    variations: Variation[],
    statistics: ComparisonStatistics
  ): string[] {
    const recommendations: string[] = [];
    const best = variations.find(v => v.id === statistics.bestVariationId);

    if (best) {
      recommendations.push(
        `The ${best.strategy} strategy with level ${best.level} performed best with a detection score of ${best.detectionScore}%.`
      );

      if (best.detectionScore > 30) {
        recommendations.push(
          'Consider increasing the humanization level for better detection evasion.'
        );
      }

      if (best.detectionScore < 20) {
        recommendations.push(
          'Excellent detection score achieved. This variation is ready for use.'
        );
      }
    }

    if (!statistics.isStatisticallySignificant) {
      recommendations.push(
        `More samples needed for statistical significance. Current: ${statistics.sampleSize}, Required: ${this.config.minSampleSize}.`
      );
    }

    return recommendations;
  }

  /**
   * Creates empty performance metrics
   */
  private createEmptyPerformanceMetrics(): PerformanceMetrics {
    return {
      views: 0,
      positiveInteractions: 0,
      negativeInteractions: 0,
      engagementRate: 0,
      averageViewTime: 0,
      satisfactionScore: 0,
      ratingCount: 0,
      detectionImprovement: 0,
    };
  }

  /**
   * Calculates overall score for a variation
   */
  private calculateVariationScore(variation: Variation, metrics: PerformanceMetrics): number {
    // Weight factors
    const detectionWeight = 0.4;
    const engagementWeight = 0.3;
    const satisfactionWeight = 0.3;

    // Detection score (inverted, lower is better)
    const detectionScore = 100 - variation.detectionScore;

    // Engagement score (0-100)
    const engagementScore = Math.min(100, metrics.engagementRate * 100);

    // Satisfaction score (0-100)
    const satisfactionScore = (metrics.satisfactionScore / 5) * 100;

    return (
      detectionScore * detectionWeight +
      engagementScore * engagementWeight +
      satisfactionScore * satisfactionWeight
    );
  }

  /**
   * Generates insights from test results
   */
  private generateInsights(test: ABTest, results: VariationResult[]): string[] {
    const insights: string[] = [];

    // Best strategy insight
    const strategies = new Map<TransformStrategy, number[]>();
    for (const result of results) {
      const scores = strategies.get(result.variation.strategy) || [];
      scores.push(result.variation.detectionScore);
      strategies.set(result.variation.strategy, scores);
    }

    let bestStrategy: TransformStrategy = 'auto';
    let bestAvg = 100;
    for (const [strategy, scores] of strategies) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (avg < bestAvg) {
        bestAvg = avg;
        bestStrategy = strategy;
      }
    }
    insights.push(`The ${bestStrategy} strategy produced the best average detection scores.`);

    // Level insight
    const levels = new Map<HumanizationLevel, number[]>();
    for (const result of results) {
      const scores = levels.get(result.variation.level) || [];
      scores.push(result.variation.detectionScore);
      levels.set(result.variation.level, scores);
    }

    let bestLevel: HumanizationLevel = 3;
    let bestLevelAvg = 100;
    for (const [level, scores] of levels) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (avg < bestLevelAvg) {
        bestLevelAvg = avg;
        bestLevel = level;
      }
    }
    insights.push(`Humanization level ${bestLevel} achieved the best results.`);

    // Improvement insight
    const improvements = results.map(r => r.improvementOverOriginal).filter(i => i > 0);
    if (improvements.length > 0) {
      const avgImprovement = improvements.reduce((a, b) => a + b, 0) / improvements.length;
      insights.push(`Average detection score improvement: ${avgImprovement.toFixed(1)}%.`);
    }

    return insights;
  }

  /**
   * Generates recommendations for future tests
   */
  private generateTestRecommendations(test: ABTest, results: VariationResult[]): string[] {
    const recommendations: string[] = [];

    const winner = results[0];
    if (winner && winner.variation.detectionScore > 25) {
      recommendations.push('Consider testing with higher humanization levels (4-5) for better results.');
    }

    if (test.variations.length < 5) {
      recommendations.push('Testing more variations could help identify optimal settings.');
    }

    const strategiesTested = new Set(test.variations.map(v => v.strategy));
    if (strategiesTested.size < 3) {
      recommendations.push('Try testing with additional strategies for broader coverage.');
    }

    return recommendations;
  }
}

// Export singleton instance
export const abTestingService = new ABTestingService();
