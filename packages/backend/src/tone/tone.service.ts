/**
 * Tone and Sentiment Analysis Service
 * Provides sentiment analysis, tone adjustment, and emotional detection
 * Requirements: 32, 47, 108, 116
 */

import crypto from 'crypto';
import { logger } from '../utils/logger';
import {
  SentimentType,
  ToneCategory,
  EmotionScores,
  SentimentAnalysis,
  ToneAdjustment,
  ToneAdjustmentResult,
  ToneChange,
  EmotionalProfile,
  EmotionalArcPoint,
  ConsistencyReport,
  ToneShift,
  InconsistentSegment,
  SentimentTarget,
  SentimentTargetResult,
  ToneAnalysisOptions,
  ToneAdjustmentOptions,
  ToneServiceConfig,
  LexiconEntry,
} from './types';

/** Default timeout for analysis (10 seconds) */
const DEFAULT_TIMEOUT = 10000;

/** Default number of segments for emotional arc */
const DEFAULT_ARC_SEGMENTS = 5;

/** Minimum text length for analysis (in words) */
const MIN_TEXT_LENGTH = 3;

/** Maximum text length for single analysis (in words) */
const MAX_TEXT_LENGTH = 100000;

/** Consistency threshold */
const CONSISTENCY_THRESHOLD = 0.7;


/**
 * Sentiment lexicon for word-level analysis
 * Maps words to sentiment scores and emotion associations
 */
const SENTIMENT_LEXICON: LexiconEntry[] = [
  // Positive words
  { term: 'excellent', sentiment: 0.9, emotions: { joy: 0.8, trust: 0.6 }, intensity: 0.9 },
  { term: 'amazing', sentiment: 0.85, emotions: { joy: 0.9, surprise: 0.5 }, intensity: 0.85 },
  { term: 'wonderful', sentiment: 0.8, emotions: { joy: 0.8, trust: 0.4 }, intensity: 0.8 },
  { term: 'great', sentiment: 0.7, emotions: { joy: 0.6, trust: 0.4 }, intensity: 0.7 },
  { term: 'good', sentiment: 0.5, emotions: { joy: 0.4, trust: 0.3 }, intensity: 0.5 },
  { term: 'happy', sentiment: 0.7, emotions: { joy: 0.9, anticipation: 0.3 }, intensity: 0.7 },
  { term: 'love', sentiment: 0.8, emotions: { joy: 0.7, trust: 0.6 }, intensity: 0.8 },
  { term: 'beautiful', sentiment: 0.7, emotions: { joy: 0.6, surprise: 0.3 }, intensity: 0.7 },
  { term: 'fantastic', sentiment: 0.85, emotions: { joy: 0.8, surprise: 0.5 }, intensity: 0.85 },
  { term: 'brilliant', sentiment: 0.8, emotions: { joy: 0.6, surprise: 0.4, trust: 0.3 }, intensity: 0.8 },
  { term: 'delightful', sentiment: 0.75, emotions: { joy: 0.8, surprise: 0.3 }, intensity: 0.75 },
  { term: 'pleased', sentiment: 0.6, emotions: { joy: 0.6, trust: 0.3 }, intensity: 0.6 },
  { term: 'excited', sentiment: 0.7, emotions: { joy: 0.6, anticipation: 0.7, surprise: 0.3 }, intensity: 0.75 },
  { term: 'thrilled', sentiment: 0.8, emotions: { joy: 0.8, anticipation: 0.5, surprise: 0.4 }, intensity: 0.85 },
  
  // Negative words
  { term: 'terrible', sentiment: -0.9, emotions: { anger: 0.5, fear: 0.4, disgust: 0.5 }, intensity: 0.9 },
  { term: 'awful', sentiment: -0.85, emotions: { anger: 0.4, disgust: 0.6 }, intensity: 0.85 },
  { term: 'horrible', sentiment: -0.85, emotions: { fear: 0.5, disgust: 0.5, anger: 0.3 }, intensity: 0.85 },
  { term: 'bad', sentiment: -0.5, emotions: { sadness: 0.3, anger: 0.2 }, intensity: 0.5 },
  { term: 'sad', sentiment: -0.6, emotions: { sadness: 0.9, fear: 0.1 }, intensity: 0.6 },
  { term: 'angry', sentiment: -0.7, emotions: { anger: 0.9, disgust: 0.2 }, intensity: 0.7 },
  { term: 'hate', sentiment: -0.85, emotions: { anger: 0.8, disgust: 0.5 }, intensity: 0.85 },
  { term: 'disappointing', sentiment: -0.6, emotions: { sadness: 0.6, anger: 0.3 }, intensity: 0.6 },
  { term: 'frustrated', sentiment: -0.6, emotions: { anger: 0.7, sadness: 0.3 }, intensity: 0.65 },
  { term: 'worried', sentiment: -0.5, emotions: { fear: 0.7, anticipation: 0.4 }, intensity: 0.55 },
  { term: 'anxious', sentiment: -0.55, emotions: { fear: 0.8, anticipation: 0.5 }, intensity: 0.6 },
  { term: 'upset', sentiment: -0.6, emotions: { sadness: 0.5, anger: 0.5 }, intensity: 0.6 },
  { term: 'miserable', sentiment: -0.8, emotions: { sadness: 0.9, disgust: 0.2 }, intensity: 0.8 },
  
  // Neutral/mixed words
  { term: 'okay', sentiment: 0.1, emotions: { trust: 0.2 }, intensity: 0.2 },
  { term: 'fine', sentiment: 0.15, emotions: { trust: 0.2 }, intensity: 0.25 },
  { term: 'interesting', sentiment: 0.3, emotions: { surprise: 0.4, anticipation: 0.3 }, intensity: 0.4 },
  { term: 'surprising', sentiment: 0.1, emotions: { surprise: 0.9 }, intensity: 0.5 },
  { term: 'unexpected', sentiment: 0.0, emotions: { surprise: 0.8 }, intensity: 0.4 },
];


/**
 * Tone indicators for classification
 */
const TONE_INDICATORS: Record<ToneCategory, { patterns: RegExp[]; words: string[] }> = {
  formal: {
    patterns: [
      /\b(therefore|consequently|furthermore|moreover|nevertheless)\b/gi,
      /\b(it is|one must|one should|it should be noted)\b/gi,
      /\b(hereby|herein|thereof|whereby)\b/gi,
    ],
    words: ['accordingly', 'subsequently', 'henceforth', 'notwithstanding', 'pursuant'],
  },
  informal: {
    patterns: [
      /\b(gonna|wanna|gotta|kinda|sorta)\b/gi,
      /\b(yeah|yep|nope|nah)\b/gi,
      /\b(stuff|things|guy|guys)\b/gi,
    ],
    words: ['cool', 'awesome', 'totally', 'basically', 'literally', 'super'],
  },
  professional: {
    patterns: [
      /\b(implement|leverage|optimize|streamline|facilitate)\b/gi,
      /\b(stakeholder|deliverable|synergy|bandwidth)\b/gi,
      /\b(best practices|key performance|action items)\b/gi,
    ],
    words: ['strategic', 'initiative', 'objective', 'metrics', 'scalable', 'proactive'],
  },
  casual: {
    patterns: [
      /\b(hey|hi|hello there)\b/gi,
      /\b(pretty much|kind of|sort of)\b/gi,
      /!{2,}/g,
    ],
    words: ['fun', 'nice', 'cool', 'great', 'awesome', 'sweet'],
  },
  academic: {
    patterns: [
      /\b(hypothesis|methodology|empirical|theoretical)\b/gi,
      /\b(according to|research suggests|studies show)\b/gi,
      /\([A-Z][a-z]+,?\s*\d{4}\)/g, // Citation pattern
    ],
    words: ['analysis', 'framework', 'paradigm', 'discourse', 'phenomenon', 'correlation'],
  },
  conversational: {
    patterns: [
      /\b(you know|I mean|like)\b/gi,
      /\b(right\?|isn't it\?|don't you think)\b/gi,
      /\.\.\./g,
    ],
    words: ['well', 'so', 'actually', 'honestly', 'basically'],
  },
  persuasive: {
    patterns: [
      /\b(must|need to|should|have to|essential)\b/gi,
      /\b(imagine|consider|think about)\b/gi,
      /\b(don't miss|act now|limited time)\b/gi,
    ],
    words: ['proven', 'guaranteed', 'exclusive', 'revolutionary', 'breakthrough'],
  },
  informative: {
    patterns: [
      /\b(first|second|third|finally|in conclusion)\b/gi,
      /\b(for example|such as|including)\b/gi,
      /\b(defined as|refers to|means that)\b/gi,
    ],
    words: ['explains', 'describes', 'illustrates', 'demonstrates', 'shows'],
  },
  enthusiastic: {
    patterns: [
      /!+/g,
      /\b(amazing|incredible|fantastic|wonderful)\b/gi,
      /\b(love|excited|thrilled|can't wait)\b/gi,
    ],
    words: ['awesome', 'brilliant', 'outstanding', 'remarkable', 'extraordinary'],
  },
  neutral: {
    patterns: [
      /\b(is|are|was|were|has|have)\b/gi,
    ],
    words: ['the', 'a', 'an', 'this', 'that'],
  },
};


/**
 * Tone transformation mappings
 */
const TONE_TRANSFORMATIONS: Record<string, Record<string, string>> = {
  'formal_to_casual': {
    'therefore': 'so',
    'consequently': 'as a result',
    'furthermore': 'also',
    'moreover': 'plus',
    'nevertheless': 'still',
    'however': 'but',
    'regarding': 'about',
    'utilize': 'use',
    'implement': 'do',
    'facilitate': 'help',
    'commence': 'start',
    'terminate': 'end',
    'sufficient': 'enough',
    'approximately': 'about',
    'subsequently': 'then',
    'prior to': 'before',
    'in order to': 'to',
    'at this point in time': 'now',
    'in the event that': 'if',
    'with regard to': 'about',
  },
  'casual_to_formal': {
    'so': 'therefore',
    'also': 'furthermore',
    'plus': 'moreover',
    'still': 'nevertheless',
    'but': 'however',
    'about': 'regarding',
    'use': 'utilize',
    'do': 'implement',
    'help': 'facilitate',
    'start': 'commence',
    'end': 'terminate',
    'enough': 'sufficient',
    'then': 'subsequently',
    'before': 'prior to',
    'now': 'at present',
    'if': 'in the event that',
    'gonna': 'going to',
    'wanna': 'want to',
    'gotta': 'have to',
    'kinda': 'somewhat',
    'sorta': 'rather',
  },
  'neutral_to_enthusiastic': {
    'good': 'excellent',
    'nice': 'wonderful',
    'interesting': 'fascinating',
    'helpful': 'incredibly helpful',
    'useful': 'extremely useful',
    'important': 'crucial',
    'great': 'amazing',
    'like': 'love',
    'enjoy': 'absolutely enjoy',
    'recommend': 'highly recommend',
  },
  'enthusiastic_to_neutral': {
    'excellent': 'good',
    'wonderful': 'nice',
    'fascinating': 'interesting',
    'incredibly helpful': 'helpful',
    'extremely useful': 'useful',
    'crucial': 'important',
    'amazing': 'good',
    'love': 'like',
    'absolutely enjoy': 'enjoy',
    'highly recommend': 'recommend',
    'fantastic': 'good',
    'brilliant': 'good',
    'outstanding': 'good',
  },
  'professional_to_casual': {
    'leverage': 'use',
    'optimize': 'improve',
    'streamline': 'simplify',
    'stakeholder': 'person involved',
    'deliverable': 'result',
    'synergy': 'teamwork',
    'bandwidth': 'time',
    'scalable': 'can grow',
    'proactive': 'ahead of time',
    'initiative': 'project',
    'objective': 'goal',
    'metrics': 'numbers',
  },
};


/**
 * Tone and Sentiment Analysis Service class
 * Handles sentiment analysis, tone adjustment, and emotional detection
 */
export class ToneService {
  private config: ToneServiceConfig;
  private lexiconMap: Map<string, LexiconEntry>;

  constructor(serviceConfig?: Partial<ToneServiceConfig>) {
    this.config = this.buildConfig(serviceConfig);
    this.lexiconMap = this.buildLexiconMap();
  }

  /**
   * Builds the service configuration
   */
  private buildConfig(overrides?: Partial<ToneServiceConfig>): ToneServiceConfig {
    return {
      defaultTimeout: overrides?.defaultTimeout ?? DEFAULT_TIMEOUT,
      defaultArcSegments: overrides?.defaultArcSegments ?? DEFAULT_ARC_SEGMENTS,
      minTextLength: overrides?.minTextLength ?? MIN_TEXT_LENGTH,
      maxTextLength: overrides?.maxTextLength ?? MAX_TEXT_LENGTH,
      consistencyThreshold: overrides?.consistencyThreshold ?? CONSISTENCY_THRESHOLD,
    };
  }

  /**
   * Builds a map from the sentiment lexicon for fast lookup
   */
  private buildLexiconMap(): Map<string, LexiconEntry> {
    const map = new Map<string, LexiconEntry>();
    for (const entry of SENTIMENT_LEXICON) {
      map.set(entry.term.toLowerCase(), entry);
    }
    return map;
  }

  /**
   * Analyzes sentiment of text
   * Requirement 32: Tone adjustment capabilities - sentiment analysis
   * @param text - Text to analyze
   * @param options - Analysis options
   * @returns Sentiment analysis result
   */
  async analyzeSentiment(text: string, options?: ToneAnalysisOptions): Promise<SentimentAnalysis> {
    const startTime = Date.now();
    const id = this.generateId('sentiment');

    // Validate input
    const wordCount = this.countWords(text);
    if (wordCount < this.config.minTextLength) {
      return this.createEmptySentimentAnalysis(id, wordCount, startTime);
    }

    // Analyze sentiment using lexicon-based approach
    const words = this.tokenize(text);
    const emotions = this.calculateEmotions(words);
    const sentimentScore = this.calculateSentimentScore(words);
    const intensity = this.calculateIntensity(emotions);
    const tone = this.detectTone(text);
    const confidence = this.calculateConfidence(words, sentimentScore);

    // Determine overall sentiment
    const overall = this.classifySentiment(sentimentScore);

    return {
      id,
      overall,
      emotions,
      intensity,
      confidence,
      tone,
      timestamp: new Date(),
      wordCount,
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Adjusts the tone of text
   * Requirement 32: Shift emotional tone of content
   * @param text - Text to adjust
   * @param targetTone - Target tone configuration
   * @param options - Adjustment options
   * @returns Tone adjustment result
   */
  async adjustTone(
    text: string,
    targetTone: ToneAdjustment,
    options?: ToneAdjustmentOptions
  ): Promise<ToneAdjustmentResult> {
    const startTime = Date.now();

    try {
      // Analyze original sentiment
      const originalSentiment = await this.analyzeSentiment(text);

      // Apply tone transformations
      const { adjustedText, changes } = this.applyToneTransformations(
        text,
        targetTone,
        options
      );

      // Analyze new sentiment
      const newSentiment = await this.analyzeSentiment(adjustedText);

      return {
        success: true,
        originalText: text,
        adjustedText,
        originalSentiment,
        newSentiment,
        changes,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      const originalSentiment = await this.analyzeSentiment(text);
      return {
        success: false,
        originalText: text,
        adjustedText: text,
        originalSentiment,
        newSentiment: originalSentiment,
        changes: [],
        processingTimeMs: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }


  /**
   * Detects emotional dimensions in text
   * Requirement 108: Emotional dimension detection
   * @param text - Text to analyze
   * @param options - Analysis options
   * @returns Emotional profile
   */
  async detectEmotionalDimensions(
    text: string,
    options?: ToneAnalysisOptions
  ): Promise<EmotionalProfile> {
    const id = this.generateId('emotional');
    const includeArc = options?.includeEmotionalArc ?? true;
    const arcSegments = options?.arcSegments ?? this.config.defaultArcSegments;

    // Calculate overall emotions
    const words = this.tokenize(text);
    const emotions = this.calculateEmotions(words);

    // Find primary and secondary emotions
    const sortedEmotions = this.sortEmotionsByScore(emotions);
    const primaryEmotion = sortedEmotions[0]?.[0] ?? 'joy';
    const secondaryEmotion = sortedEmotions[1]?.[1] && sortedEmotions[1][1] > 0.1 
      ? sortedEmotions[1][0] 
      : null;

    // Calculate emotional arc if requested
    const emotionalArc = includeArc 
      ? this.calculateEmotionalArc(text, arcSegments)
      : [];

    // Calculate stability
    const stability = this.calculateEmotionalStability(emotionalArc);

    // Determine valence
    const valence = this.determineValence(emotions);

    // Calculate overall intensity
    const overallIntensity = this.calculateIntensity(emotions);

    return {
      id,
      primaryEmotion: primaryEmotion as keyof EmotionScores,
      secondaryEmotion: secondaryEmotion as keyof EmotionScores | null,
      emotions,
      emotionalArc,
      overallIntensity,
      stability,
      valence,
      timestamp: new Date(),
    };
  }

  /**
   * Validates tone consistency throughout text
   * Requirement 116: Tone consistency validation
   * @param text - Text to validate
   * @returns Consistency report
   */
  async validateToneConsistency(text: string): Promise<ConsistencyReport> {
    const startTime = Date.now();
    const id = this.generateId('consistency');

    // Split text into segments
    const segments = this.splitIntoSegments(text);
    
    // Analyze tone of each segment
    const segmentTones: { tone: ToneCategory; text: string; index: number }[] = [];
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      if (segment && segment.trim().length > 0) {
        const tone = this.detectTone(segment);
        segmentTones.push({ tone, text: segment, index: i });
      }
    }

    // Detect tone shifts
    const toneShifts = this.detectToneShifts(segmentTones, text);

    // Find inconsistent segments
    const inconsistentSegments = this.findInconsistentSegments(segmentTones, text);

    // Calculate consistency score
    const consistencyScore = this.calculateConsistencyScore(toneShifts, segments.length);

    // Generate recommendations
    const recommendations = this.generateConsistencyRecommendations(
      toneShifts,
      inconsistentSegments
    );

    const isConsistent = consistencyScore >= this.config.consistencyThreshold;

    return {
      id,
      isConsistent,
      consistencyScore,
      toneShifts,
      recommendations,
      inconsistentSegments,
      timestamp: new Date(),
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Targets a specific sentiment in text
   * Requirement 47: Sentiment targeting controls
   * @param text - Text to transform
   * @param target - Target sentiment configuration
   * @returns Sentiment targeting result
   */
  async targetSentiment(
    text: string,
    target: SentimentTarget
  ): Promise<SentimentTargetResult> {
    const startTime = Date.now();

    try {
      // Analyze current sentiment
      const currentSentiment = await this.analyzeSentiment(text);

      // Determine required adjustments
      const adjustment = this.calculateRequiredAdjustment(currentSentiment, target);

      // Apply adjustments
      const { adjustedText } = this.applyToneTransformations(text, adjustment);

      // Analyze achieved sentiment
      const achievedSentiment = await this.analyzeSentiment(adjustedText);

      // Calculate target accuracy
      const targetAccuracy = this.calculateTargetAccuracy(achievedSentiment, target);

      return {
        success: true,
        originalText: text,
        transformedText: adjustedText,
        target,
        achievedSentiment,
        targetAccuracy,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      const achievedSentiment = await this.analyzeSentiment(text);
      return {
        success: false,
        originalText: text,
        transformedText: text,
        target,
        achievedSentiment,
        targetAccuracy: 0,
        processingTimeMs: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }


  // ============ Helper Methods ============

  /**
   * Tokenizes text into words
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s'-]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
  }

  /**
   * Counts words in text
   */
  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Calculates emotion scores from words
   */
  private calculateEmotions(words: string[]): EmotionScores {
    const emotions: EmotionScores = {
      joy: 0,
      sadness: 0,
      anger: 0,
      fear: 0,
      surprise: 0,
      trust: 0,
      anticipation: 0,
      disgust: 0,
    };

    let matchCount = 0;

    for (const word of words) {
      const entry = this.lexiconMap.get(word);
      if (entry && entry.emotions) {
        matchCount++;
        for (const [emotion, score] of Object.entries(entry.emotions)) {
          if (emotion in emotions && typeof score === 'number') {
            emotions[emotion as keyof EmotionScores] += score;
          }
        }
      }
    }

    // Normalize scores
    if (matchCount > 0) {
      for (const emotion of Object.keys(emotions) as (keyof EmotionScores)[]) {
        emotions[emotion] = Math.min(1, emotions[emotion] / matchCount);
      }
    }

    return emotions;
  }

  /**
   * Calculates overall sentiment score (-1 to 1)
   */
  private calculateSentimentScore(words: string[]): number {
    let totalScore = 0;
    let matchCount = 0;

    for (const word of words) {
      const entry = this.lexiconMap.get(word);
      if (entry) {
        totalScore += entry.sentiment * entry.intensity;
        matchCount++;
      }
    }

    if (matchCount === 0) return 0;
    return Math.max(-1, Math.min(1, totalScore / matchCount));
  }

  /**
   * Calculates overall emotional intensity
   */
  private calculateIntensity(emotions: EmotionScores): number {
    const values = Object.values(emotions);
    const sum = values.reduce((a, b) => a + b, 0);
    return Math.min(1, sum / values.length);
  }

  /**
   * Calculates confidence score for the analysis
   */
  private calculateConfidence(words: string[], sentimentScore: number): number {
    let matchCount = 0;
    for (const word of words) {
      if (this.lexiconMap.has(word)) {
        matchCount++;
      }
    }

    const coverage = words.length > 0 ? matchCount / words.length : 0;
    const scoreStrength = Math.abs(sentimentScore);
    
    return Math.min(1, (coverage * 0.6 + scoreStrength * 0.4));
  }

  /**
   * Classifies sentiment based on score
   */
  private classifySentiment(score: number): SentimentType {
    if (score > 0.1) return 'positive';
    if (score < -0.1) return 'negative';
    return 'neutral';
  }

  /**
   * Detects the dominant tone of text
   */
  private detectTone(text: string): ToneCategory {
    const scores: Record<ToneCategory, number> = {
      formal: 0,
      informal: 0,
      professional: 0,
      casual: 0,
      academic: 0,
      conversational: 0,
      persuasive: 0,
      informative: 0,
      enthusiastic: 0,
      neutral: 0,
    };

    const lowerText = text.toLowerCase();

    for (const [tone, indicators] of Object.entries(TONE_INDICATORS)) {
      // Check patterns
      for (const pattern of indicators.patterns) {
        const matches = text.match(pattern);
        if (matches) {
          scores[tone as ToneCategory] += matches.length * 2;
        }
      }

      // Check words
      for (const word of indicators.words) {
        if (lowerText.includes(word)) {
          scores[tone as ToneCategory] += 1;
        }
      }
    }

    // Find highest scoring tone
    let maxTone: ToneCategory = 'neutral';
    let maxScore = 0;

    for (const [tone, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        maxTone = tone as ToneCategory;
      }
    }

    return maxTone;
  }


  /**
   * Creates an empty sentiment analysis for short texts
   */
  private createEmptySentimentAnalysis(
    id: string,
    wordCount: number,
    startTime: number
  ): SentimentAnalysis {
    return {
      id,
      overall: 'neutral',
      emotions: {
        joy: 0,
        sadness: 0,
        anger: 0,
        fear: 0,
        surprise: 0,
        trust: 0,
        anticipation: 0,
        disgust: 0,
      },
      intensity: 0,
      confidence: 0,
      tone: 'neutral',
      timestamp: new Date(),
      wordCount,
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Sorts emotions by score (descending)
   */
  private sortEmotionsByScore(emotions: EmotionScores): [keyof EmotionScores, number][] {
    return (Object.entries(emotions) as [keyof EmotionScores, number][])
      .sort((a, b) => b[1] - a[1]);
  }

  /**
   * Calculates emotional arc throughout text
   */
  private calculateEmotionalArc(text: string, segments: number): EmotionalArcPoint[] {
    const arc: EmotionalArcPoint[] = [];
    const sentences = this.splitIntoSentences(text);
    
    if (sentences.length === 0) return arc;

    const segmentSize = Math.max(1, Math.ceil(sentences.length / segments));

    for (let i = 0; i < segments; i++) {
      const start = i * segmentSize;
      const end = Math.min(start + segmentSize, sentences.length);
      const segmentSentences = sentences.slice(start, end);
      
      if (segmentSentences.length === 0) continue;

      const segmentText = segmentSentences.join(' ');
      const words = this.tokenize(segmentText);
      const emotions = this.calculateEmotions(words);
      const sortedEmotions = this.sortEmotionsByScore(emotions);

      arc.push({
        position: (i + 0.5) / segments,
        emotions,
        dominantEmotion: (sortedEmotions[0]?.[0] ?? 'joy') as keyof EmotionScores,
        segmentIndex: i,
      });
    }

    return arc;
  }

  /**
   * Calculates emotional stability from arc
   */
  private calculateEmotionalStability(arc: EmotionalArcPoint[]): number {
    if (arc.length < 2) return 1;

    let totalVariation = 0;
    for (let i = 1; i < arc.length; i++) {
      const prev = arc[i - 1];
      const curr = arc[i];
      if (!prev || !curr) continue;

      // Calculate variation between consecutive points
      let variation = 0;
      for (const emotion of Object.keys(prev.emotions) as (keyof EmotionScores)[]) {
        variation += Math.abs(curr.emotions[emotion] - prev.emotions[emotion]);
      }
      totalVariation += variation / 8; // Normalize by number of emotions
    }

    const avgVariation = totalVariation / (arc.length - 1);
    return Math.max(0, 1 - avgVariation);
  }

  /**
   * Determines emotional valence
   */
  private determineValence(emotions: EmotionScores): 'positive' | 'negative' | 'mixed' | 'neutral' {
    const positive = emotions.joy + emotions.trust + emotions.anticipation;
    const negative = emotions.sadness + emotions.anger + emotions.fear + emotions.disgust;

    const total = positive + negative;
    if (total < 0.1) return 'neutral';

    const ratio = positive / (positive + negative);
    if (ratio > 0.65) return 'positive';
    if (ratio < 0.35) return 'negative';
    return 'mixed';
  }

  /**
   * Splits text into sentences
   */
  private splitIntoSentences(text: string): string[] {
    return text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  /**
   * Splits text into segments for consistency analysis
   */
  private splitIntoSegments(text: string): string[] {
    // Split by paragraphs first
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
    
    if (paragraphs.length >= 3) {
      return paragraphs;
    }

    // Fall back to sentence groups
    const sentences = this.splitIntoSentences(text);
    const segments: string[] = [];
    const groupSize = Math.max(2, Math.ceil(sentences.length / 5));

    for (let i = 0; i < sentences.length; i += groupSize) {
      const group = sentences.slice(i, i + groupSize);
      if (group.length > 0) {
        segments.push(group.join('. ') + '.');
      }
    }

    return segments;
  }


  /**
   * Detects tone shifts between segments
   */
  private detectToneShifts(
    segmentTones: { tone: ToneCategory; text: string; index: number }[],
    fullText: string
  ): ToneShift[] {
    const shifts: ToneShift[] = [];

    for (let i = 1; i < segmentTones.length; i++) {
      const prev = segmentTones[i - 1];
      const curr = segmentTones[i];
      
      if (!prev || !curr) continue;

      if (prev.tone !== curr.tone) {
        const position = fullText.indexOf(curr.text);
        const severity = this.calculateShiftSeverity(prev.tone, curr.tone);

        shifts.push({
          position,
          fromTone: prev.tone,
          toTone: curr.tone,
          severity,
          segment: curr.text.substring(0, 100),
          segmentIndex: curr.index,
        });
      }
    }

    return shifts;
  }

  /**
   * Calculates severity of a tone shift
   */
  private calculateShiftSeverity(from: ToneCategory, to: ToneCategory): number {
    // Define tone distances
    const toneGroups: Record<string, ToneCategory[]> = {
      formal: ['formal', 'professional', 'academic'],
      informal: ['informal', 'casual', 'conversational'],
      emotional: ['enthusiastic', 'persuasive'],
      neutral: ['neutral', 'informative'],
    };

    // Check if tones are in the same group
    for (const group of Object.values(toneGroups)) {
      if (group.includes(from) && group.includes(to)) {
        return 0.3; // Low severity for same-group shifts
      }
    }

    // Check for opposite groups
    const formalGroup = toneGroups.formal ?? [];
    const informalGroup = toneGroups.informal ?? [];
    
    if (
      (formalGroup.includes(from) && informalGroup.includes(to)) ||
      (informalGroup.includes(from) && formalGroup.includes(to))
    ) {
      return 0.9; // High severity for formal/informal shifts
    }

    return 0.6; // Medium severity for other shifts
  }


  /**
   * Finds segments with inconsistent tone
   */
  private findInconsistentSegments(
    segmentTones: { tone: ToneCategory; text: string; index: number }[],
    fullText: string
  ): InconsistentSegment[] {
    if (segmentTones.length < 2) return [];

    // Find dominant tone
    const toneCounts: Record<ToneCategory, number> = {} as Record<ToneCategory, number>;
    for (const { tone } of segmentTones) {
      toneCounts[tone] = (toneCounts[tone] || 0) + 1;
    }

    let dominantTone: ToneCategory = 'neutral';
    let maxCount = 0;
    for (const [tone, count] of Object.entries(toneCounts)) {
      if (count > maxCount) {
        maxCount = count;
        dominantTone = tone as ToneCategory;
      }
    }

    // Find segments that don't match dominant tone
    const inconsistent: InconsistentSegment[] = [];
    for (const { tone, text, index } of segmentTones) {
      if (tone !== dominantTone) {
        const startPosition = fullText.indexOf(text);
        inconsistent.push({
          text: text.substring(0, 200),
          startPosition,
          endPosition: startPosition + text.length,
          expectedTone: dominantTone,
          actualTone: tone,
          suggestion: this.generateToneSuggestion(tone, dominantTone),
        });
      }
    }

    return inconsistent;
  }

  /**
   * Generates suggestion for fixing tone inconsistency
   */
  private generateToneSuggestion(actual: ToneCategory, expected: ToneCategory): string {
    const suggestions: Record<string, string> = {
      'formal_informal': 'Consider using more formal language and avoiding contractions.',
      'informal_formal': 'Consider using more casual language and contractions.',
      'professional_casual': 'Consider using more business-appropriate terminology.',
      'casual_professional': 'Consider using more relaxed, everyday language.',
      'academic_conversational': 'Consider using more scholarly language and citations.',
      'enthusiastic_neutral': 'Consider toning down the enthusiasm to match the rest.',
      'neutral_enthusiastic': 'Consider adding more expressive language.',
    };

    const key = `${actual}_${expected}`;
    return suggestions[key] || `Consider adjusting the tone from ${actual} to ${expected}.`;
  }

  /**
   * Calculates consistency score
   */
  private calculateConsistencyScore(shifts: ToneShift[], totalSegments: number): number {
    if (totalSegments <= 1) return 1;

    const totalSeverity = shifts.reduce((sum, shift) => sum + shift.severity, 0);
    const maxPossibleSeverity = (totalSegments - 1) * 1; // Max severity is 1

    return Math.max(0, 1 - (totalSeverity / maxPossibleSeverity));
  }

  /**
   * Generates recommendations for improving consistency
   */
  private generateConsistencyRecommendations(
    shifts: ToneShift[],
    inconsistentSegments: InconsistentSegment[]
  ): string[] {
    const recommendations: string[] = [];

    if (shifts.length === 0) {
      recommendations.push('The text maintains consistent tone throughout.');
      return recommendations;
    }

    if (shifts.length > 3) {
      recommendations.push(
        'Consider reviewing the overall structure to maintain a more consistent voice.'
      );
    }

    // Add specific recommendations based on shift types
    const shiftTypes = new Set(shifts.map(s => `${s.fromTone}_${s.toTone}`));
    
    if (shiftTypes.has('formal_informal') || shiftTypes.has('informal_formal')) {
      recommendations.push(
        'There are shifts between formal and informal language. Choose one style and apply it consistently.'
      );
    }

    if (inconsistentSegments.length > 0) {
      recommendations.push(
        `${inconsistentSegments.length} segment(s) have different tone than the rest of the text.`
      );
    }

    return recommendations;
  }


  /**
   * Applies tone transformations to text
   */
  private applyToneTransformations(
    text: string,
    adjustment: ToneAdjustment,
    options?: ToneAdjustmentOptions
  ): { adjustedText: string; changes: ToneChange[] } {
    const changes: ToneChange[] = [];
    let adjustedText = text;

    // Get transformation map
    const transformKey = `${adjustment.from}_to_${adjustment.to}`;
    let transformations = TONE_TRANSFORMATIONS[transformKey];

    // Try alternative keys
    if (!transformations) {
      const altKey1 = `${adjustment.from}_${adjustment.to}`;
      const altKey2 = `${adjustment.to}_to_${adjustment.from}`;
      transformations = TONE_TRANSFORMATIONS[altKey1] || TONE_TRANSFORMATIONS[altKey2];
    }

    // Apply custom replacements if provided
    if (options?.customReplacements) {
      transformations = { ...transformations, ...options.customReplacements };
    }

    if (!transformations) {
      // Use generic transformations based on tone categories
      transformations = this.getGenericTransformations(adjustment.from, adjustment.to);
    }

    // Apply transformations
    for (const [original, replacement] of Object.entries(transformations)) {
      const regex = new RegExp(`\\b${this.escapeRegex(original)}\\b`, 'gi');
      const matches = adjustedText.match(regex);

      if (matches) {
        for (const match of matches) {
          const position = adjustedText.indexOf(match);
          changes.push({
            original: match,
            replacement,
            startPosition: position,
            endPosition: position + match.length,
            reason: `Changed from ${adjustment.from} to ${adjustment.to} tone`,
          });
        }
        adjustedText = adjustedText.replace(regex, replacement);
      }
    }

    // Apply intensity-based modifications
    if (adjustment.intensity > 50) {
      const result = this.applyIntensityModifications(adjustedText, adjustment, changes);
      adjustedText = result.text;
      changes.push(...result.additionalChanges);
    }

    return { adjustedText, changes };
  }

  /**
   * Gets generic transformations based on tone categories
   */
  private getGenericTransformations(from: ToneCategory, to: ToneCategory): Record<string, string> {
    // Map tone categories to transformation keys
    const categoryMappings: Record<ToneCategory, string> = {
      formal: 'formal',
      informal: 'casual',
      professional: 'professional',
      casual: 'casual',
      academic: 'formal',
      conversational: 'casual',
      persuasive: 'enthusiastic',
      informative: 'neutral',
      enthusiastic: 'enthusiastic',
      neutral: 'neutral',
    };

    const fromKey = categoryMappings[from] || 'neutral';
    const toKey = categoryMappings[to] || 'neutral';

    // Try to find a matching transformation
    const possibleKeys = [
      `${fromKey}_to_${toKey}`,
      `${fromKey}_${toKey}`,
      `${toKey}_to_${fromKey}`,
    ];

    for (const key of possibleKeys) {
      if (TONE_TRANSFORMATIONS[key]) {
        return TONE_TRANSFORMATIONS[key];
      }
    }

    return {};
  }

  /**
   * Applies intensity-based modifications
   */
  private applyIntensityModifications(
    text: string,
    adjustment: ToneAdjustment,
    existingChanges: ToneChange[]
  ): { text: string; additionalChanges: ToneChange[] } {
    const additionalChanges: ToneChange[] = [];
    let modifiedText = text;

    // High intensity: add more expressive language for enthusiastic tone
    if (adjustment.to === 'enthusiastic' && adjustment.intensity > 70) {
      const intensifiers = [
        { pattern: /\bgood\b/gi, replacement: 'great' },
        { pattern: /\bnice\b/gi, replacement: 'wonderful' },
        { pattern: /\binteresting\b/gi, replacement: 'fascinating' },
      ];

      for (const { pattern, replacement } of intensifiers) {
        const matches = modifiedText.match(pattern);
        if (matches) {
          for (const match of matches) {
            const position = modifiedText.indexOf(match);
            additionalChanges.push({
              original: match,
              replacement,
              startPosition: position,
              endPosition: position + match.length,
              reason: 'Intensified for enthusiastic tone',
            });
          }
          modifiedText = modifiedText.replace(pattern, replacement);
        }
      }
    }

    return { text: modifiedText, additionalChanges };
  }


  /**
   * Calculates required adjustment to reach target sentiment
   */
  private calculateRequiredAdjustment(
    current: SentimentAnalysis,
    target: SentimentTarget
  ): ToneAdjustment {
    // Determine source and target tones based on sentiment
    const fromTone = current.tone;
    let toTone: ToneCategory;

    switch (target.targetSentiment) {
      case 'positive':
        toTone = 'enthusiastic';
        break;
      case 'negative':
        toTone = 'formal'; // More reserved
        break;
      default:
        toTone = 'neutral';
    }

    // Calculate intensity based on how far we need to move
    const currentIntensity = current.intensity;
    const targetIntensity = target.targetIntensity;
    const intensityDiff = Math.abs(targetIntensity - currentIntensity);
    const adjustmentIntensity = Math.min(100, intensityDiff * 100 + 30);

    return {
      from: fromTone,
      to: toTone,
      intensity: adjustmentIntensity,
      enhanceEmotions: target.targetEmotions 
        ? Object.keys(target.targetEmotions) as (keyof EmotionScores)[]
        : undefined,
    };
  }

  /**
   * Calculates how close we got to the target sentiment
   */
  private calculateTargetAccuracy(
    achieved: SentimentAnalysis,
    target: SentimentTarget
  ): number {
    let accuracy = 0;

    // Check sentiment type match
    if (achieved.overall === target.targetSentiment) {
      accuracy += 0.4;
    } else if (
      (achieved.overall === 'neutral' && target.targetSentiment !== 'neutral') ||
      (target.targetSentiment === 'neutral' && achieved.overall !== 'neutral')
    ) {
      accuracy += 0.2;
    }

    // Check intensity match
    const intensityDiff = Math.abs(achieved.intensity - target.targetIntensity);
    const intensityAccuracy = Math.max(0, 1 - intensityDiff) * 0.3;
    accuracy += intensityAccuracy;

    // Check emotion matches if specified
    if (target.targetEmotions) {
      let emotionAccuracy = 0;
      const emotionCount = Object.keys(target.targetEmotions).length;

      for (const [emotion, targetScore] of Object.entries(target.targetEmotions)) {
        const achievedScore = achieved.emotions[emotion as keyof EmotionScores] || 0;
        const diff = Math.abs(achievedScore - targetScore);
        emotionAccuracy += Math.max(0, 1 - diff);
      }

      if (emotionCount > 0) {
        accuracy += (emotionAccuracy / emotionCount) * 0.3;
      }
    } else {
      accuracy += 0.3; // Full points if no specific emotions targeted
    }

    return Math.min(1, accuracy);
  }

  /**
   * Escapes special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Generates a unique ID
   */
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }
}

// Export singleton instance
export const toneService = new ToneService();
