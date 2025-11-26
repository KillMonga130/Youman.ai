/**
 * Detection Service
 * Integrates with external AI detection APIs (GPTZero, Originality.ai, Turnitin)
 * and provides internal fallback detection.
 * Requirements: 26, 52
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { calculateMetrics } from '../analysis/metrics-calculator';
import {
  DetectionProvider,
  DetectionResult,
  AggregatedDetectionResult,
  DetectionOptions,
  DetectionServiceConfig,
  GPTZeroResponse,
  OriginalityResponse,
  TurnitinResponse,
  InternalDetectionResult,
  DiscrepancyReport,
  DetectorComparison,
  ComparisonMatrix,
  ComparisonMatrixEntry,
  HistoricalDetectionRecord,
  DetectorTrend,
  DetectorTrendPoint,
  HistoricalTrendReport,
  DetectorPrioritySuggestion,
  MultiDetectorComparisonResult,
} from './types';

/** Default timeout for detection requests (15 seconds per Requirement 26.4) */
const DEFAULT_TIMEOUT = 15000;

/** Default pass threshold (50% AI probability) */
const DEFAULT_PASS_THRESHOLD = 50;

/** Discrepancy threshold for flagging outliers */
const DISCREPANCY_THRESHOLD = 20;

/**
 * Detection Service class
 * Handles AI detection testing against multiple providers
 */
export class DetectionService {
  private config: DetectionServiceConfig;
  private gptzeroClient: AxiosInstance | null = null;
  private originalityClient: AxiosInstance | null = null;
  private turnitinClient: AxiosInstance | null = null;

  constructor(serviceConfig?: Partial<DetectionServiceConfig>) {
    this.config = this.buildConfig(serviceConfig);
    this.initializeClients();
  }

  /**
   * Builds the service configuration from environment and overrides
   */
  private buildConfig(overrides?: Partial<DetectionServiceConfig>): DetectionServiceConfig {
    return {
      gptzero: {
        apiKey: config.externalApis.gptZero,
        baseUrl: 'https://api.gptzero.me/v2',
        enabled: !!config.externalApis.gptZero,
        timeout: DEFAULT_TIMEOUT,
        ...overrides?.gptzero,
      },
      originality: {
        apiKey: config.externalApis.originality,
        baseUrl: 'https://api.originality.ai/api/v1',
        enabled: !!config.externalApis.originality,
        timeout: DEFAULT_TIMEOUT,
        ...overrides?.originality,
      },
      turnitin: {
        apiKey: config.externalApis.turnitin,
        baseUrl: 'https://api.turnitin.com/api/v1',
        enabled: !!config.externalApis.turnitin,
        timeout: DEFAULT_TIMEOUT,
        ...overrides?.turnitin,
      },
      defaultPassThreshold: overrides?.defaultPassThreshold ?? DEFAULT_PASS_THRESHOLD,
      defaultTimeout: overrides?.defaultTimeout ?? DEFAULT_TIMEOUT,
    };
  }

  /**
   * Initializes HTTP clients for each provider
   */
  private initializeClients(): void {
    if (this.config.gptzero.enabled && this.config.gptzero.apiKey) {
      this.gptzeroClient = axios.create({
        baseURL: this.config.gptzero.baseUrl,
        timeout: this.config.gptzero.timeout,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.gptzero.apiKey,
        },
      });
    }

    if (this.config.originality.enabled && this.config.originality.apiKey) {
      this.originalityClient = axios.create({
        baseURL: this.config.originality.baseUrl,
        timeout: this.config.originality.timeout,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.originality.apiKey}`,
        },
      });
    }

    if (this.config.turnitin.enabled && this.config.turnitin.apiKey) {
      this.turnitinClient = axios.create({
        baseURL: this.config.turnitin.baseUrl,
        timeout: this.config.turnitin.timeout,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.turnitin.apiKey}`,
        },
      });
    }
  }


  /**
   * Detects AI-generated content using multiple providers
   * Requirement 26.1: Test output against multiple AI detection services
   * Requirement 26.4: Complete all detection tests within 15 seconds
   * @param text - Text to analyze
   * @param options - Detection options
   * @returns Aggregated detection results
   */
  async detect(text: string, options?: DetectionOptions): Promise<AggregatedDetectionResult> {
    const startTime = Date.now();
    const timeout = options?.timeout ?? this.config.defaultTimeout;
    const passThreshold = options?.passThreshold ?? this.config.defaultPassThreshold;
    const useFallback = options?.useFallback ?? true;
    const parallel = options?.parallel ?? true;

    // Determine which providers to use
    const requestedProviders = options?.providers ?? this.getAvailableProviders();
    const results: DetectionResult[] = [];
    const unavailableProviders: DetectionProvider[] = [];
    let usedFallback = false;

    // Run detection on each provider
    if (parallel) {
      const promises = requestedProviders.map(provider =>
        this.detectWithProvider(provider, text, timeout, passThreshold)
          .catch(error => {
            logger.warn(`Detection failed for provider ${provider}:`, error);
            unavailableProviders.push(provider);
            return null;
          })
      );

      const providerResults = await Promise.all(promises);
      results.push(...providerResults.filter((r): r is DetectionResult => r !== null));
    } else {
      for (const provider of requestedProviders) {
        try {
          const result = await this.detectWithProvider(provider, text, timeout, passThreshold);
          results.push(result);
        } catch (error) {
          logger.warn(`Detection failed for provider ${provider}:`, error);
          unavailableProviders.push(provider);
        }
      }
    }

    // Use internal fallback if no external results and fallback is enabled
    // Requirement 26.5: Use fallback internal detection models when APIs unavailable
    if (results.length === 0 && useFallback) {
      try {
        const fallbackResult = await this.detectInternal(text, passThreshold);
        fallbackResult.isFallback = true;
        results.push(fallbackResult);
        usedFallback = true;
        logger.info('Using internal fallback detection model');
      } catch (error) {
        logger.error('Internal fallback detection failed:', error);
      }
    }

    // Calculate aggregated results
    const totalProcessingTimeMs = Date.now() - startTime;
    const averageScore = results.length > 0
      ? results.reduce((sum, r) => sum + r.score, 0) / results.length
      : 0;
    const overallPassed = results.length > 0 && results.every(r => r.passed);

    return {
      results,
      averageScore: Math.round(averageScore * 100) / 100,
      overallPassed,
      totalProcessingTimeMs,
      timestamp: new Date(),
      unavailableProviders,
      usedFallback,
    };
  }

  /**
   * Gets list of available (configured) providers
   */
  getAvailableProviders(): DetectionProvider[] {
    const providers: DetectionProvider[] = [];
    
    if (this.config.gptzero.enabled) providers.push('gptzero');
    if (this.config.originality.enabled) providers.push('originality');
    if (this.config.turnitin.enabled) providers.push('turnitin');
    
    // Internal is always available
    providers.push('internal');
    
    return providers;
  }

  /**
   * Detects using a specific provider
   */
  private async detectWithProvider(
    provider: DetectionProvider,
    text: string,
    timeout: number,
    passThreshold: number
  ): Promise<DetectionResult> {
    switch (provider) {
      case 'gptzero':
        return this.detectWithGPTZero(text, timeout, passThreshold);
      case 'originality':
        return this.detectWithOriginality(text, timeout, passThreshold);
      case 'turnitin':
        return this.detectWithTurnitin(text, timeout, passThreshold);
      case 'internal':
        return this.detectInternal(text, passThreshold);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * Detects AI content using GPTZero API
   * Requirement 26.1: Integrate GPTZero
   */
  private async detectWithGPTZero(
    text: string,
    timeout: number,
    passThreshold: number
  ): Promise<DetectionResult> {
    const startTime = Date.now();

    if (!this.gptzeroClient) {
      throw new Error('GPTZero client not configured');
    }

    try {
      const response = await this.gptzeroClient.post<GPTZeroResponse>(
        '/predict/text',
        { document: text },
        { timeout }
      );

      const doc = response.data.documents[0];
      if (!doc) {
        throw new Error('No document in GPTZero response');
      }

      // Convert probability to percentage score
      const score = Math.round(doc.completely_generated_prob * 100);
      const confidence = Math.round((1 - Math.abs(doc.average_generated_prob - 0.5) * 2) * 100);

      return {
        provider: 'gptzero',
        score,
        passed: score < passThreshold,
        confidence,
        processingTimeMs: Date.now() - startTime,
        metadata: {
          averageGeneratedProb: doc.average_generated_prob,
          burstiness: doc.overall_burstiness,
          paragraphCount: doc.paragraphs.length,
        },
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      throw new Error(`GPTZero API error: ${axiosError.message}`);
    }
  }

  /**
   * Detects AI content using Originality.ai API
   * Requirement 26.1: Integrate Originality.ai
   */
  private async detectWithOriginality(
    text: string,
    timeout: number,
    passThreshold: number
  ): Promise<DetectionResult> {
    const startTime = Date.now();

    if (!this.originalityClient) {
      throw new Error('Originality.ai client not configured');
    }

    try {
      const response = await this.originalityClient.post<OriginalityResponse>(
        '/scan/ai',
        { content: text },
        { timeout }
      );

      // Originality returns AI score as decimal (0-1)
      const score = Math.round(response.data.score.ai * 100);
      const confidence = Math.round(Math.abs(response.data.score.ai - response.data.score.original) * 100);

      return {
        provider: 'originality',
        score,
        passed: score < passThreshold,
        confidence,
        processingTimeMs: Date.now() - startTime,
        metadata: {
          originalScore: response.data.score.original,
          aiScore: response.data.score.ai,
        },
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      throw new Error(`Originality.ai API error: ${axiosError.message}`);
    }
  }

  /**
   * Detects AI content using Turnitin API
   * Requirement 26.1: Integrate Turnitin
   */
  private async detectWithTurnitin(
    text: string,
    timeout: number,
    passThreshold: number
  ): Promise<DetectionResult> {
    const startTime = Date.now();

    if (!this.turnitinClient) {
      throw new Error('Turnitin client not configured');
    }

    try {
      const response = await this.turnitinClient.post<TurnitinResponse>(
        '/submissions/ai-detection',
        { text },
        { timeout }
      );

      const score = Math.round(response.data.ai_writing_detection.ai_score * 100);
      const confidence = Math.round(
        Math.abs(
          response.data.ai_writing_detection.ai_score -
          response.data.ai_writing_detection.human_score
        ) * 100
      );

      return {
        provider: 'turnitin',
        score,
        passed: score < passThreshold,
        confidence,
        processingTimeMs: Date.now() - startTime,
        metadata: {
          aiScore: response.data.ai_writing_detection.ai_score,
          humanScore: response.data.ai_writing_detection.human_score,
          matchPercentage: response.data.overall_match_percentage,
        },
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      throw new Error(`Turnitin API error: ${axiosError.message}`);
    }
  }


  /**
   * Internal AI detection using text metrics analysis
   * Requirement 26.5: Fallback internal detection model
   * Uses perplexity, burstiness, and sentence variation to estimate AI probability
   */
  async detectInternal(text: string, passThreshold: number): Promise<DetectionResult> {
    const startTime = Date.now();

    try {
      const internalResult = this.calculateInternalDetection(text);
      const score = Math.round(internalResult.aiProbability * 100);

      return {
        provider: 'internal',
        score,
        passed: score < passThreshold,
        confidence: this.calculateInternalConfidence(internalResult),
        processingTimeMs: Date.now() - startTime,
        metadata: {
          perplexity: internalResult.perplexity,
          burstiness: internalResult.burstiness,
          sentenceLengthVariation: internalResult.sentenceLengthVariation,
        },
      };
    } catch (error) {
      throw new Error(`Internal detection error: ${(error as Error).message}`);
    }
  }

  /**
   * Calculates internal AI detection metrics
   * Uses heuristics based on text characteristics typical of AI vs human writing
   */
  private calculateInternalDetection(text: string): InternalDetectionResult {
    const metrics = calculateMetrics(text);

    // AI text typically has:
    // - Lower burstiness (more uniform sentence lengths)
    // - Perplexity in a specific range (too predictable)
    // - Lower sentence length variation

    // Burstiness factor: AI tends to have burstiness < 0.6
    // Human writing typically has burstiness > 0.6
    const burstiessScore = metrics.burstiness < 0.6 ? 0.7 : 0.3;

    // Perplexity factor: AI tends to have perplexity between 20-60
    // Human writing typically has perplexity between 40-120
    let perplexityScore: number;
    if (metrics.perplexity < 40) {
      perplexityScore = 0.8; // Very predictable, likely AI
    } else if (metrics.perplexity > 120) {
      perplexityScore = 0.2; // Very unpredictable, likely human
    } else {
      // Linear interpolation in the middle range
      perplexityScore = 0.5 - ((metrics.perplexity - 40) / 80) * 0.3;
    }

    // Sentence length variation factor
    // AI tends to have std dev < 8 words
    const variationScore = metrics.sentenceLengthStdDev < 8 ? 0.7 : 0.3;

    // Lexical diversity factor
    // AI tends to have lower lexical diversity
    const diversityScore = metrics.lexicalDiversity < 0.5 ? 0.6 : 0.4;

    // Weighted average of all factors
    const aiProbability =
      burstiessScore * 0.3 +
      perplexityScore * 0.3 +
      variationScore * 0.25 +
      diversityScore * 0.15;

    return {
      aiProbability: Math.min(1, Math.max(0, aiProbability)),
      perplexity: metrics.perplexity,
      burstiness: metrics.burstiness,
      sentenceLengthVariation: metrics.sentenceLengthStdDev,
    };
  }

  /**
   * Calculates confidence level for internal detection
   */
  private calculateInternalConfidence(result: InternalDetectionResult): number {
    // Confidence is higher when metrics are clearly in AI or human range
    const burstiessConfidence = Math.abs(result.burstiness - 0.6) * 100;
    const perplexityConfidence = result.perplexity < 30 || result.perplexity > 100 ? 80 : 50;
    const variationConfidence = Math.abs(result.sentenceLengthVariation - 8) * 5;

    const avgConfidence = (burstiessConfidence + perplexityConfidence + variationConfidence) / 3;
    return Math.min(100, Math.max(0, Math.round(avgConfidence)));
  }

  /**
   * Compares results from multiple detectors
   * Requirement 52: Multi-detector comparison
   */
  compareDetectors(results: DetectionResult[]): DiscrepancyReport {
    if (results.length === 0) {
      return {
        comparisons: [],
        maxDiscrepancy: 0,
        hasSignificantDiscrepancy: false,
      };
    }

    const averageScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;

    const comparisons: DetectorComparison[] = results.map(result => {
      const differenceFromAverage = result.score - averageScore;
      return {
        provider: result.provider,
        score: result.score,
        differenceFromAverage: Math.round(differenceFromAverage * 100) / 100,
        isOutlier: Math.abs(differenceFromAverage) > DISCREPANCY_THRESHOLD,
      };
    });

    const maxDiscrepancy = Math.max(...comparisons.map(c => Math.abs(c.differenceFromAverage)));
    const hasSignificantDiscrepancy = maxDiscrepancy > DISCREPANCY_THRESHOLD;

    // Recommend the detector with highest confidence that's not an outlier
    const nonOutliers = results.filter((_, i) => !comparisons[i]?.isOutlier);

    const report: DiscrepancyReport = {
      comparisons,
      maxDiscrepancy: Math.round(maxDiscrepancy * 100) / 100,
      hasSignificantDiscrepancy,
    };

    if (nonOutliers.length > 0) {
      report.recommendedDetector = nonOutliers.reduce((best, current) =>
        current.confidence > best.confidence ? current : best
      ).provider;
    }

    return report;
  }

  /**
   * Creates a comparison matrix from detection results
   * Requirement 52.2: Show a comparison matrix with scores from each detector
   */
  createComparisonMatrix(results: DetectionResult[]): ComparisonMatrix {
    if (results.length === 0) {
      return {
        entries: [],
        averageScore: 0,
        minScore: 0,
        maxScore: 0,
        scoreRange: 0,
        overallPassed: true,
        passedCount: 0,
        failedCount: 0,
        timestamp: new Date(),
      };
    }

    const scores = results.map(r => r.score);
    const averageScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);

    const entries: ComparisonMatrixEntry[] = results.map(result => {
      const differenceFromAverage = result.score - averageScore;
      return {
        provider: result.provider,
        score: result.score,
        passed: result.passed,
        confidence: result.confidence,
        processingTimeMs: result.processingTimeMs,
        differenceFromAverage: Math.round(differenceFromAverage * 100) / 100,
        isOutlier: Math.abs(differenceFromAverage) > DISCREPANCY_THRESHOLD,
        isAvailable: true,
      };
    });

    const passedCount = results.filter(r => r.passed).length;
    const failedCount = results.length - passedCount;

    return {
      entries,
      averageScore: Math.round(averageScore * 100) / 100,
      minScore,
      maxScore,
      scoreRange: maxScore - minScore,
      overallPassed: passedCount > failedCount,
      passedCount,
      failedCount,
      timestamp: new Date(),
    };
  }

  /**
   * Generates detector priority suggestions based on results and historical data
   * Requirement 52.3: Suggest which detector to prioritize
   */
  generatePrioritySuggestions(
    results: DetectionResult[],
    historicalData?: HistoricalDetectionRecord[]
  ): DetectorPrioritySuggestion[] {
    if (results.length === 0) {
      return [];
    }

    // Calculate historical accuracy for each provider
    const historicalAccuracyMap = new Map<DetectionProvider, number>();
    const avgResponseTimeMap = new Map<DetectionProvider, number>();

    if (historicalData && historicalData.length > 0) {
      const providerScores = new Map<DetectionProvider, number[]>();
      
      for (const record of historicalData) {
        for (const [provider, score] of record.results) {
          if (!providerScores.has(provider)) {
            providerScores.set(provider, []);
          }
          providerScores.get(provider)!.push(score);
        }
      }

      // Calculate consistency (lower variance = higher accuracy)
      for (const [provider, scores] of providerScores) {
        if (scores.length > 1) {
          const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
          const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
          const consistency = Math.max(0, 100 - Math.sqrt(variance));
          historicalAccuracyMap.set(provider, Math.round(consistency));
        }
      }
    }

    // Calculate average response time from current results
    for (const result of results) {
      avgResponseTimeMap.set(result.provider, result.processingTimeMs);
    }

    // Generate suggestions
    const suggestions: DetectorPrioritySuggestion[] = results.map(result => {
      const historicalAccuracy = historicalAccuracyMap.get(result.provider) ?? 70; // Default 70%
      const avgResponseTime = avgResponseTimeMap.get(result.provider) ?? result.processingTimeMs;

      // Calculate reliability score based on confidence, historical accuracy, and response time
      const confidenceWeight = 0.4;
      const historicalWeight = 0.4;
      const speedWeight = 0.2;

      // Normalize response time (faster = better, max 5000ms)
      const speedScore = Math.max(0, 100 - (avgResponseTime / 50));

      const reliabilityScore = Math.round(
        result.confidence * confidenceWeight +
        historicalAccuracy * historicalWeight +
        speedScore * speedWeight
      );

      // Determine reason for priority
      let reason: string;
      if (result.confidence >= 80 && historicalAccuracy >= 80) {
        reason = 'High confidence and consistent historical results';
      } else if (result.confidence >= 80) {
        reason = 'High confidence in current detection';
      } else if (historicalAccuracy >= 80) {
        reason = 'Consistent historical performance';
      } else if (avgResponseTime < 500) {
        reason = 'Fast response time with acceptable accuracy';
      } else {
        reason = 'Standard detection capability';
      }

      return {
        provider: result.provider,
        rank: 0, // Will be set after sorting
        reason,
        reliabilityScore,
        historicalAccuracy,
        averageResponseTime: avgResponseTime,
        isRecommended: false, // Will be set after sorting
      };
    });

    // Sort by reliability score and assign ranks
    suggestions.sort((a, b) => b.reliabilityScore - a.reliabilityScore);
    suggestions.forEach((suggestion, index) => {
      suggestion.rank = index + 1;
      suggestion.isRecommended = index === 0;
    });

    return suggestions;
  }

  /**
   * Calculates historical trends for each detector
   * Requirement 52.4: Show trends in how each detector has scored content over time
   */
  calculateHistoricalTrends(
    historicalData: HistoricalDetectionRecord[],
    periodDays: number = 30
  ): HistoricalTrendReport {
    const now = new Date();
    const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

    // Filter data within period
    const filteredData = historicalData.filter(
      record => record.timestamp >= periodStart && record.timestamp <= now
    );

    if (filteredData.length === 0) {
      return {
        trends: [],
        overallTrend: 'stable',
        periodStart,
        periodEnd: now,
        totalDetections: 0,
      };
    }

    // Group data by provider
    const providerData = new Map<DetectionProvider, DetectorTrendPoint[]>();

    for (const record of filteredData) {
      for (const [provider, score] of record.results) {
        if (!providerData.has(provider)) {
          providerData.set(provider, []);
        }
        providerData.get(provider)!.push({
          timestamp: record.timestamp,
          score,
          contentHash: record.contentHash,
        });
      }
    }

    // Calculate trends for each provider
    const trends: DetectorTrend[] = [];

    for (const [provider, dataPoints] of providerData) {
      // Sort by timestamp
      dataPoints.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      const scores = dataPoints.map(dp => dp.score);
      const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;

      // Calculate trend direction using linear regression
      let trendDirection: 'improving' | 'worsening' | 'stable' = 'stable';
      let scoreChange = 0;

      if (dataPoints.length >= 2) {
        const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
        const secondHalf = scores.slice(Math.floor(scores.length / 2));

        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

        scoreChange = Math.round((secondAvg - firstAvg) * 100) / 100;

        // Lower scores are better (less AI-like)
        if (scoreChange < -5) {
          trendDirection = 'improving';
        } else if (scoreChange > 5) {
          trendDirection = 'worsening';
        }
      }

      trends.push({
        provider,
        dataPoints,
        averageScore: Math.round(averageScore * 100) / 100,
        trendDirection,
        scoreChange,
        detectionCount: dataPoints.length,
      });
    }

    // Calculate overall trend
    const allScoreChanges = trends.map(t => t.scoreChange);
    const avgScoreChange = allScoreChanges.length > 0
      ? allScoreChanges.reduce((a, b) => a + b, 0) / allScoreChanges.length
      : 0;

    let overallTrend: 'improving' | 'worsening' | 'stable' = 'stable';
    if (avgScoreChange < -3) {
      overallTrend = 'improving';
    } else if (avgScoreChange > 3) {
      overallTrend = 'worsening';
    }

    return {
      trends,
      overallTrend,
      periodStart,
      periodEnd: now,
      totalDetections: filteredData.length,
    };
  }

  /**
   * Performs multi-detector comparison with full analysis
   * Requirement 52: Content comparison across multiple AI detectors
   */
  async performMultiDetectorComparison(
    text: string,
    options?: DetectionOptions,
    historicalData?: HistoricalDetectionRecord[]
  ): Promise<MultiDetectorComparisonResult> {
    const startTime = Date.now();

    // Run detection across all available providers
    const aggregatedResult = await this.detect(text, {
      ...options,
      parallel: true,
    });

    // Create comparison matrix
    const matrix = this.createComparisonMatrix(aggregatedResult.results);

    // Generate discrepancy report
    const discrepancies = this.compareDetectors(aggregatedResult.results);

    // Generate priority suggestions
    const prioritySuggestions = this.generatePrioritySuggestions(
      aggregatedResult.results,
      historicalData
    );

    // Calculate historical trends if data available
    let historicalTrends: HistoricalTrendReport | undefined;
    if (historicalData && historicalData.length > 0) {
      historicalTrends = this.calculateHistoricalTrends(historicalData);
    }

    // Determine recommended action
    let recommendedAction: 'pass' | 'reprocess' | 'manual_review';
    let recommendationReason: string;

    if (matrix.overallPassed && !discrepancies.hasSignificantDiscrepancy) {
      recommendedAction = 'pass';
      recommendationReason = 'Content passed majority of detectors with consistent scores';
    } else if (discrepancies.hasSignificantDiscrepancy) {
      recommendedAction = 'manual_review';
      recommendationReason = `Significant discrepancy detected (${discrepancies.maxDiscrepancy}% difference). Manual review recommended.`;
    } else if (!matrix.overallPassed && matrix.averageScore < 70) {
      recommendedAction = 'reprocess';
      recommendationReason = `Average score ${matrix.averageScore}% is borderline. Consider reprocessing with higher humanization level.`;
    } else {
      recommendedAction = 'reprocess';
      recommendationReason = `Content failed ${matrix.failedCount} of ${matrix.entries.length} detectors. Reprocessing recommended.`;
    }

    const result: MultiDetectorComparisonResult = {
      matrix,
      discrepancies,
      prioritySuggestions,
      recommendedAction,
      recommendationReason,
      totalProcessingTimeMs: Date.now() - startTime,
    };

    if (historicalTrends) {
      result.historicalTrends = historicalTrends;
    }

    return result;
  }

  /**
   * Highlights discrepancies in detection results
   * Requirement 52.3: Highlight discrepancies and suggest which detector to prioritize
   */
  highlightDiscrepancies(results: DetectionResult[]): {
    outliers: DetectionResult[];
    agreementLevel: 'high' | 'medium' | 'low';
    summary: string;
  } {
    if (results.length < 2) {
      return {
        outliers: [],
        agreementLevel: 'high',
        summary: 'Insufficient data for discrepancy analysis',
      };
    }

    const comparison = this.compareDetectors(results);
    const outliers = results.filter((_, i) => comparison.comparisons[i]?.isOutlier);

    let agreementLevel: 'high' | 'medium' | 'low';
    if (comparison.maxDiscrepancy <= 10) {
      agreementLevel = 'high';
    } else if (comparison.maxDiscrepancy <= 25) {
      agreementLevel = 'medium';
    } else {
      agreementLevel = 'low';
    }

    const outlierNames = outliers.map(o => o.provider).join(', ');
    let summary: string;

    if (outliers.length === 0) {
      summary = `All ${results.length} detectors agree within acceptable range (max ${comparison.maxDiscrepancy}% difference)`;
    } else if (outliers.length === 1) {
      summary = `${outlierNames} shows significantly different results (${comparison.maxDiscrepancy}% from average). Consider prioritizing other detectors.`;
    } else {
      summary = `Multiple detectors disagree: ${outlierNames}. Manual review recommended.`;
    }

    return {
      outliers,
      agreementLevel,
      summary,
    };
  }

  /**
   * Aggregates scores from multiple providers
   * Returns weighted average based on confidence
   */
  aggregateScores(results: DetectionResult[]): number {
    if (results.length === 0) return 0;

    const totalConfidence = results.reduce((sum, r) => sum + r.confidence, 0);
    if (totalConfidence === 0) {
      // If no confidence data, use simple average
      return results.reduce((sum, r) => sum + r.score, 0) / results.length;
    }

    // Weighted average by confidence
    const weightedSum = results.reduce(
      (sum, r) => sum + r.score * r.confidence,
      0
    );

    return Math.round((weightedSum / totalConfidence) * 100) / 100;
  }

  /**
   * Checks if a provider is available
   */
  isProviderAvailable(provider: DetectionProvider): boolean {
    switch (provider) {
      case 'gptzero':
        return this.config.gptzero.enabled && !!this.gptzeroClient;
      case 'originality':
        return this.config.originality.enabled && !!this.originalityClient;
      case 'turnitin':
        return this.config.turnitin.enabled && !!this.turnitinClient;
      case 'internal':
        return true; // Internal is always available
      default:
        return false;
    }
  }

  /**
   * Gets the configuration for a specific provider
   */
  getProviderConfig(provider: DetectionProvider): { enabled: boolean; timeout: number } {
    switch (provider) {
      case 'gptzero':
        return { enabled: this.config.gptzero.enabled, timeout: this.config.gptzero.timeout };
      case 'originality':
        return { enabled: this.config.originality.enabled, timeout: this.config.originality.timeout };
      case 'turnitin':
        return { enabled: this.config.turnitin.enabled, timeout: this.config.turnitin.timeout };
      case 'internal':
        return { enabled: true, timeout: this.config.defaultTimeout };
      default:
        return { enabled: false, timeout: this.config.defaultTimeout };
    }
  }
}

/**
 * Creates a new DetectionService instance
 */
export function createDetectionService(config?: Partial<DetectionServiceConfig>): DetectionService {
  return new DetectionService(config);
}

/**
 * Default singleton instance
 */
let defaultInstance: DetectionService | null = null;

/**
 * Gets the default DetectionService instance
 */
export function getDetectionService(): DetectionService {
  if (!defaultInstance) {
    defaultInstance = new DetectionService();
  }
  return defaultInstance;
}
