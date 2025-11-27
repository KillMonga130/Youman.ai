/**
 * Content Analysis Service
 * Provides writing style analysis, gap analysis, audience analysis,
 * competitive analysis, performance prediction, credibility assessment,
 * controversy detection, and freshness optimization
 * Requirements: 54, 62, 122-130
 */

import crypto from 'crypto';
import {
  StyleCategory,
  VoiceType,
  Inconsistency,
  StyleAnalysis,
  GapAnalysis,
  TopicCoverage,
  AudienceType,
  AudienceProfile,
  EngagementIndicator,
  CompetitiveAnalysis,
  CompetitorComparison,
  PerformancePrediction,
  PerformanceFactor,
  CredibilityScore,
  CredibilityFactor,
  CredibilityIssue,
  ControversyReport,
  ControversialTopic,
  SensitiveLanguage,
  PolarizingStatement,
  FreshnessScore,
  AgeIndicator,
  OutdatedReference,
  TimeSensitiveElement,
  ContentAnalysisOptions,
  ComprehensiveAnalysis,
  ContentAnalysisConfig,
} from './types';

/** Default timeout for analysis (15 seconds) */
const DEFAULT_TIMEOUT = 15000;

/** Minimum text length for analysis (in words) */
const MIN_TEXT_LENGTH = 10;

/** Maximum text length for single analysis (in words) */
const MAX_TEXT_LENGTH = 100000;

/** Default controversy threshold */
const CONTROVERSY_THRESHOLD = 50;

/** Default credibility threshold */
const CREDIBILITY_THRESHOLD = 60;

/** Default freshness threshold */
const FRESHNESS_THRESHOLD = 50;

/**
 * Formal language indicators
 */
const FORMAL_INDICATORS = [
  'therefore', 'consequently', 'furthermore', 'moreover', 'nevertheless',
  'hereby', 'herein', 'thereof', 'whereby', 'notwithstanding',
  'accordingly', 'subsequently', 'henceforth', 'pursuant', 'whereas',
];

/**
 * Informal language indicators
 */
const INFORMAL_INDICATORS = [
  'gonna', 'wanna', 'gotta', 'kinda', 'sorta', 'yeah', 'yep', 'nope',
  'cool', 'awesome', 'totally', 'basically', 'literally', 'super',
  'stuff', 'things', 'guy', 'guys', 'ok', 'okay',
];

/**
 * Technical vocabulary indicators
 */
const TECHNICAL_INDICATORS = [
  'algorithm', 'implementation', 'architecture', 'framework', 'protocol',
  'interface', 'module', 'component', 'database', 'api', 'server',
  'client', 'function', 'variable', 'parameter', 'configuration',
];


/**
 * Academic vocabulary indicators
 */
const ACADEMIC_INDICATORS = [
  'hypothesis', 'methodology', 'empirical', 'theoretical', 'analysis',
  'framework', 'paradigm', 'discourse', 'phenomenon', 'correlation',
  'research', 'study', 'findings', 'literature', 'evidence',
];

/**
 * Persuasive language indicators
 */
const PERSUASIVE_INDICATORS = [
  'must', 'need', 'should', 'essential', 'crucial', 'vital',
  'proven', 'guaranteed', 'exclusive', 'revolutionary', 'breakthrough',
  'imagine', 'consider', 'discover', 'transform', 'achieve',
];

/**
 * Controversial topics
 */
const CONTROVERSIAL_TOPICS = [
  'politics', 'religion', 'abortion', 'gun control', 'immigration',
  'climate change', 'vaccines', 'gender', 'race', 'sexuality',
  'terrorism', 'war', 'drugs', 'death penalty', 'euthanasia',
];

/**
 * Sensitive language patterns
 */
const SENSITIVE_PATTERNS: { pattern: RegExp; category: SensitiveLanguage['category']; severity: number }[] = [
  { pattern: /\b(democrat|republican|liberal|conservative)\b/gi, category: 'political', severity: 0.4 },
  { pattern: /\b(christian|muslim|jewish|hindu|atheist)\b/gi, category: 'religious', severity: 0.3 },
  { pattern: /\b(racist|sexist|bigot|discrimination)\b/gi, category: 'social', severity: 0.7 },
  { pattern: /\b(illegal immigrant|undocumented)\b/gi, category: 'political', severity: 0.5 },
  { pattern: /\b(conspiracy|hoax|fake news)\b/gi, category: 'social', severity: 0.6 },
];

/**
 * Date patterns for freshness detection
 */
const DATE_PATTERNS = [
  /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}\b/gi,
  /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
  /\b\d{4}-\d{2}-\d{2}\b/g,
  /\b(last year|this year|next year|last month|this month)\b/gi,
  /\b(20\d{2})\b/g,
];

/**
 * Content Analysis Service class
 * Handles comprehensive content analysis including style, gaps, audience,
 * competition, performance, credibility, controversy, and freshness
 */
export class ContentAnalysisService {
  private config: ContentAnalysisConfig;

  constructor(serviceConfig?: Partial<ContentAnalysisConfig>) {
    this.config = this.buildConfig(serviceConfig);
  }

  /**
   * Builds the service configuration
   */
  private buildConfig(overrides?: Partial<ContentAnalysisConfig>): ContentAnalysisConfig {
    return {
      defaultTimeout: overrides?.defaultTimeout ?? DEFAULT_TIMEOUT,
      minTextLength: overrides?.minTextLength ?? MIN_TEXT_LENGTH,
      maxTextLength: overrides?.maxTextLength ?? MAX_TEXT_LENGTH,
      controversyThreshold: overrides?.controversyThreshold ?? CONTROVERSY_THRESHOLD,
      credibilityThreshold: overrides?.credibilityThreshold ?? CREDIBILITY_THRESHOLD,
      freshnessThreshold: overrides?.freshnessThreshold ?? FRESHNESS_THRESHOLD,
    };
  }

  /**
   * Generates a unique identifier
   */
  private generateId(prefix: string): string {
    return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Counts words in text
   */
  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

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
   * Splits text into sentences
   */
  private splitIntoSentences(text: string): string[] {
    return text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }


  /**
   * Analyzes writing style of text
   * Requirement 54: Writing style analysis
   * @param text - Text to analyze
   * @returns Style analysis result
   */
  async analyzeWritingStyle(text: string): Promise<StyleAnalysis> {
    const startTime = Date.now();
    const id = this.generateId('style');

    const wordCount = this.countWords(text);
    if (wordCount < this.config.minTextLength) {
      return this.createEmptyStyleAnalysis(id, startTime);
    }

    const words = this.tokenize(text);
    const sentences = this.splitIntoSentences(text);

    // Calculate formality
    const formality = this.calculateFormality(words);

    // Calculate complexity
    const complexity = this.calculateComplexity(words, sentences);

    // Detect voice
    const voice = this.detectVoice(text);

    // Detect category
    const category = this.detectStyleCategory(words);

    // Find inconsistencies
    const inconsistencies = this.findStyleInconsistencies(text, formality, category);

    // Calculate metrics
    const avgSentenceLength = sentences.length > 0
      ? words.length / sentences.length
      : 0;

    const uniqueWords = new Set(words);
    const vocabularyRichness = words.length > 0
      ? uniqueWords.size / words.length
      : 0;

    const readabilityScore = this.calculateReadability(words, sentences);
    const passiveVoicePercent = this.calculatePassiveVoicePercent(sentences);

    return {
      id,
      formality,
      complexity,
      voice,
      category,
      inconsistencies,
      avgSentenceLength,
      vocabularyRichness,
      readabilityScore,
      passiveVoicePercent,
      timestamp: new Date(),
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Identifies content gaps
   * Requirement 62: Gap analysis system
   * @param text - Text to analyze
   * @param topic - Topic to analyze against
   * @returns Gap analysis result
   */
  async identifyGaps(text: string, topic: string): Promise<GapAnalysis> {
    const startTime = Date.now();
    const id = this.generateId('gap');

    const words = this.tokenize(text);

    // Generate expected subtopics based on the main topic
    const expectedSubtopics = this.generateExpectedSubtopics(topic);

    // Analyze coverage
    const { coveredTopics, missingTopics, topicCoverage } = this.analyzeTopicCoverage(
      words,
      topic,
      expectedSubtopics
    );

    // Calculate completeness score
    const completenessScore = this.calculateCompletenessScore(topicCoverage);

    // Generate recommendations
    const recommendations = this.generateGapRecommendations(missingTopics, topicCoverage);

    // Find missing subtopics
    const missingSubtopics = topicCoverage
      .flatMap(tc => tc.subtopicsMissing)
      .filter((v, i, a) => a.indexOf(v) === i);

    return {
      id,
      missingTopics,
      missingSubtopics,
      completenessScore,
      recommendations,
      coveredTopics,
      topicCoverage,
      timestamp: new Date(),
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Analyzes target audience
   * Requirement 122: Audience analysis
   * @param text - Text to analyze
   * @returns Audience profile
   */
  async analyzeAudience(text: string): Promise<AudienceProfile> {
    const startTime = Date.now();
    const id = this.generateId('audience');

    const words = this.tokenize(text);
    const sentences = this.splitIntoSentences(text);

    // Determine primary audience
    const primaryAudience = this.determinePrimaryAudience(words, sentences);

    // Find secondary audiences
    const secondaryAudiences = this.findSecondaryAudiences(words, primaryAudience);

    // Calculate reading level
    const readingLevel = this.calculateReadingLevel(words, sentences);

    // Calculate technical level
    const technicalLevel = this.calculateTechnicalLevel(words);

    // Determine age group
    const ageGroup = this.determineAgeGroup(readingLevel, words);

    // Identify industries
    const industries = this.identifyIndustries(words);

    // Find engagement indicators
    const engagementIndicators = this.findEngagementIndicators(text);

    // Generate recommendations
    const recommendations = this.generateAudienceRecommendations(
      primaryAudience,
      readingLevel,
      engagementIndicators
    );

    return {
      id,
      primaryAudience,
      secondaryAudiences,
      readingLevel,
      technicalLevel,
      ageGroup,
      industries,
      engagementIndicators,
      recommendations,
      timestamp: new Date(),
      processingTimeMs: Date.now() - startTime,
    };
  }


  /**
   * Compares content with competitors
   * Requirement 123: Competitive analysis
   * @param text - Text to analyze
   * @param competitors - Competitor texts to compare against
   * @returns Competitive analysis result
   */
  async compareWithCompetitors(text: string, competitors: string[]): Promise<CompetitiveAnalysis> {
    const startTime = Date.now();
    const id = this.generateId('competitive');

    if (competitors.length === 0) {
      return this.createEmptyCompetitiveAnalysis(id, startTime);
    }

    const words = this.tokenize(text);
    const comparisons: CompetitorComparison[] = [];

    // Analyze each competitor
    for (let i = 0; i < competitors.length; i++) {
      const competitor = competitors[i];
      if (!competitor) continue;
      
      const comparison = this.compareWithSingleCompetitor(text, competitor, `competitor_${i + 1}`);
      comparisons.push(comparison);
    }

    // Calculate overall competitive score
    const competitiveScore = this.calculateCompetitiveScore(comparisons);

    // Identify strengths and weaknesses
    const { strengths, weaknesses } = this.identifyStrengthsWeaknesses(text, competitors);

    // Find opportunities
    const opportunities = this.findOpportunities(comparisons);

    // Find unique elements
    const uniqueElements = this.findUniqueElements(words, competitors);

    // Generate recommendations
    const recommendations = this.generateCompetitiveRecommendations(
      strengths,
      weaknesses,
      opportunities
    );

    return {
      id,
      competitiveScore,
      strengths,
      weaknesses,
      opportunities,
      uniqueElements,
      comparisons,
      recommendations,
      timestamp: new Date(),
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Predicts content performance
   * Requirement 124: Performance prediction
   * @param text - Text to analyze
   * @returns Performance prediction result
   */
  async predictPerformance(text: string): Promise<PerformancePrediction> {
    const startTime = Date.now();
    const id = this.generateId('performance');

    const words = this.tokenize(text);
    const sentences = this.splitIntoSentences(text);

    // Calculate individual scores
    const engagementRate = this.predictEngagementRate(text, words, sentences);
    const readabilityScore = this.calculateReadability(words, sentences);
    const shareability = this.predictShareability(text, words);
    const seoPerformance = this.predictSEOPerformance(text, words);
    const conversionPotential = this.predictConversionPotential(text, words);

    // Calculate overall score
    const overallScore = Math.round(
      (engagementRate * 0.25 +
        readabilityScore * 0.2 +
        shareability * 0.2 +
        seoPerformance * 0.2 +
        conversionPotential * 0.15)
    );

    // Calculate confidence
    const confidence = this.calculatePredictionConfidence(words.length);

    // Identify factors
    const factors = this.identifyPerformanceFactors(
      engagementRate,
      readabilityScore,
      shareability,
      seoPerformance,
      conversionPotential
    );

    // Generate recommendations
    const recommendations = this.generatePerformanceRecommendations(factors);

    return {
      id,
      overallScore,
      engagementRate,
      readabilityScore,
      shareability,
      seoPerformance,
      conversionPotential,
      confidence,
      factors,
      recommendations,
      timestamp: new Date(),
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Assesses content credibility
   * Requirement 125: Credibility assessment
   * @param text - Text to analyze
   * @returns Credibility score result
   */
  async assessCredibility(text: string): Promise<CredibilityScore> {
    const startTime = Date.now();
    const id = this.generateId('credibility');

    const words = this.tokenize(text);

    // Calculate individual scores
    const sourceCitationScore = this.calculateSourceCitationScore(text);
    const factualIndicators = this.calculateFactualIndicators(text, words);
    const authoritySignals = this.calculateAuthoritySignals(text, words);
    const biasScore = this.calculateBiasScore(text, words);
    const transparencyScore = this.calculateTransparencyScore(text);

    // Calculate overall score
    const overallScore = Math.round(
      (sourceCitationScore * 0.25 +
        factualIndicators * 0.2 +
        authoritySignals * 0.2 +
        biasScore * 0.2 +
        transparencyScore * 0.15)
    );

    // Identify factors
    const factors = this.identifyCredibilityFactors(
      sourceCitationScore,
      factualIndicators,
      authoritySignals,
      biasScore,
      transparencyScore
    );

    // Find issues
    const issues = this.findCredibilityIssues(text);

    // Generate recommendations
    const recommendations = this.generateCredibilityRecommendations(factors, issues);

    return {
      id,
      overallScore,
      sourceCitationScore,
      factualIndicators,
      authoritySignals,
      biasScore,
      transparencyScore,
      factors,
      issues,
      recommendations,
      timestamp: new Date(),
      processingTimeMs: Date.now() - startTime,
    };
  }


  /**
   * Detects controversial content
   * Requirement 126: Controversy detection
   * @param text - Text to analyze
   * @returns Controversy report
   */
  async detectControversy(text: string): Promise<ControversyReport> {
    const startTime = Date.now();
    const id = this.generateId('controversy');

    const lowerText = text.toLowerCase();

    // Detect controversial topics
    const controversialTopics = this.detectControversialTopics(text, lowerText);

    // Detect sensitive language
    const sensitiveLanguage = this.detectSensitiveLanguage(text);

    // Find polarizing statements
    const polarizingStatements = this.findPolarizingStatements(text);

    // Calculate controversy level
    const controversyLevel = this.calculateControversyLevel(
      controversialTopics,
      sensitiveLanguage,
      polarizingStatements
    );

    // Determine risk level
    const riskLevel = this.determineRiskLevel(controversyLevel);

    // Generate recommendations
    const recommendations = this.generateControversyRecommendations(
      controversialTopics,
      sensitiveLanguage,
      polarizingStatements
    );

    return {
      id,
      controversyLevel,
      isControversial: controversyLevel >= this.config.controversyThreshold,
      controversialTopics,
      sensitiveLanguage,
      polarizingStatements,
      riskLevel,
      recommendations,
      timestamp: new Date(),
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Assesses content freshness
   * Requirement 127: Freshness optimization
   * @param text - Text to analyze
   * @returns Freshness score result
   */
  async assessFreshness(text: string): Promise<FreshnessScore> {
    const startTime = Date.now();
    const id = this.generateId('freshness');

    // Detect age indicators
    const ageIndicators = this.detectAgeIndicators(text);

    // Find outdated references
    const outdatedReferences = this.findOutdatedReferences(text);

    // Calculate trending alignment
    const trendingAlignment = this.calculateTrendingAlignment(text);

    // Calculate evergreen score
    const evergreenScore = this.calculateEvergreenScore(text, ageIndicators);

    // Find time-sensitive elements
    const timeSensitiveElements = this.findTimeSensitiveElements(text);

    // Calculate overall freshness score
    const overallScore = this.calculateFreshnessScore(
      ageIndicators,
      outdatedReferences,
      trendingAlignment,
      evergreenScore
    );

    // Generate recommendations
    const recommendations = this.generateFreshnessRecommendations(
      ageIndicators,
      outdatedReferences,
      timeSensitiveElements
    );

    return {
      id,
      overallScore,
      ageIndicators,
      outdatedReferences,
      trendingAlignment,
      evergreenScore,
      timeSensitiveElements,
      recommendations,
      timestamp: new Date(),
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Performs comprehensive content analysis
   * @param text - Text to analyze
   * @param options - Analysis options
   * @returns Comprehensive analysis result
   */
  async analyzeComprehensive(
    text: string,
    options?: ContentAnalysisOptions
  ): Promise<ComprehensiveAnalysis> {
    const startTime = Date.now();

    // Run all analyses in parallel
    const [
      styleAnalysis,
      audienceProfile,
      performancePrediction,
      credibilityScore,
      controversyReport,
      freshnessScore,
    ] = await Promise.all([
      this.analyzeWritingStyle(text),
      this.analyzeAudience(text),
      this.predictPerformance(text),
      this.assessCredibility(text),
      this.detectControversy(text),
      this.assessFreshness(text),
    ]);

    // Optional analyses
    let gapAnalysis: GapAnalysis | undefined;
    if (options?.topic) {
      gapAnalysis = await this.identifyGaps(text, options.topic);
    }

    let competitiveAnalysis: CompetitiveAnalysis | undefined;
    if (options?.competitors && options.competitors.length > 0) {
      competitiveAnalysis = await this.compareWithCompetitors(text, options.competitors);
    }

    // Calculate overall quality score
    const overallQualityScore = this.calculateOverallQualityScore(
      styleAnalysis,
      performancePrediction,
      credibilityScore,
      controversyReport,
      freshnessScore
    );

    // Generate top recommendations
    const topRecommendations = this.generateTopRecommendations(
      styleAnalysis,
      audienceProfile,
      performancePrediction,
      credibilityScore,
      controversyReport,
      freshnessScore
    );

    const result: ComprehensiveAnalysis = {
      styleAnalysis,
      audienceProfile,
      performancePrediction,
      credibilityScore,
      controversyReport,
      freshnessScore,
      overallQualityScore,
      topRecommendations,
      timestamp: new Date(),
      totalProcessingTimeMs: Date.now() - startTime,
    };

    if (gapAnalysis) {
      result.gapAnalysis = gapAnalysis;
    }

    if (competitiveAnalysis) {
      result.competitiveAnalysis = competitiveAnalysis;
    }

    return result;
  }


  // ============ Helper Methods ============

  /**
   * Creates empty style analysis for short texts
   */
  private createEmptyStyleAnalysis(id: string, startTime: number): StyleAnalysis {
    return {
      id,
      formality: 50,
      complexity: 50,
      voice: 'mixed',
      category: 'informative',
      inconsistencies: [],
      avgSentenceLength: 0,
      vocabularyRichness: 0,
      readabilityScore: 0,
      passiveVoicePercent: 0,
      timestamp: new Date(),
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Creates empty competitive analysis
   */
  private createEmptyCompetitiveAnalysis(id: string, startTime: number): CompetitiveAnalysis {
    return {
      id,
      competitiveScore: 50,
      strengths: [],
      weaknesses: [],
      opportunities: [],
      uniqueElements: [],
      comparisons: [],
      recommendations: ['Add competitor content for comparison'],
      timestamp: new Date(),
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Calculates formality score (0-100)
   */
  private calculateFormality(words: string[]): number {
    let formalCount = 0;
    let informalCount = 0;

    for (const word of words) {
      if (FORMAL_INDICATORS.includes(word)) formalCount++;
      if (INFORMAL_INDICATORS.includes(word)) informalCount++;
    }

    const total = formalCount + informalCount;
    if (total === 0) return 50;

    const formalRatio = formalCount / total;
    return Math.round(formalRatio * 100);
  }

  /**
   * Calculates complexity score (0-100)
   */
  private calculateComplexity(words: string[], sentences: string[]): number {
    // Average word length
    const avgWordLength = words.length > 0
      ? words.reduce((sum, w) => sum + w.length, 0) / words.length
      : 0;

    // Average sentence length
    const avgSentenceLength = sentences.length > 0
      ? words.length / sentences.length
      : 0;

    // Normalize to 0-100 scale
    const wordLengthScore = Math.min(100, (avgWordLength / 8) * 100);
    const sentenceLengthScore = Math.min(100, (avgSentenceLength / 25) * 100);

    return Math.round((wordLengthScore + sentenceLengthScore) / 2);
  }

  /**
   * Detects dominant voice type
   */
  private detectVoice(text: string): VoiceType {
    const passivePatterns = [
      /\b(was|were|is|are|been|being)\s+\w+ed\b/gi,
      /\b(was|were|is|are|been|being)\s+\w+en\b/gi,
    ];

    let passiveCount = 0;
    for (const pattern of passivePatterns) {
      const matches = text.match(pattern);
      if (matches) passiveCount += matches.length;
    }

    const sentences = this.splitIntoSentences(text);
    const passiveRatio = sentences.length > 0 ? passiveCount / sentences.length : 0;

    if (passiveRatio > 0.5) return 'passive';
    if (passiveRatio < 0.2) return 'active';
    return 'mixed';
  }

  /**
   * Detects style category
   */
  private detectStyleCategory(words: string[]): StyleCategory {
    const scores: Record<StyleCategory, number> = {
      technical: 0,
      creative: 0,
      persuasive: 0,
      informative: 0,
      conversational: 0,
      academic: 0,
      journalistic: 0,
      marketing: 0,
    };

    for (const word of words) {
      if (TECHNICAL_INDICATORS.includes(word)) scores.technical++;
      if (ACADEMIC_INDICATORS.includes(word)) scores.academic++;
      if (PERSUASIVE_INDICATORS.includes(word)) {
        scores.persuasive++;
        scores.marketing++;
      }
      if (INFORMAL_INDICATORS.includes(word)) scores.conversational++;
    }

    // Find highest scoring category
    let maxCategory: StyleCategory = 'informative';
    let maxScore = 0;

    for (const [category, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        maxCategory = category as StyleCategory;
      }
    }

    return maxCategory;
  }

  /**
   * Finds style inconsistencies
   */
  private findStyleInconsistencies(
    text: string,
    formality: number,
    _category: StyleCategory
  ): Inconsistency[] {
    const inconsistencies: Inconsistency[] = [];
    const sentences = this.splitIntoSentences(text);

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      if (!sentence) continue;

      const words = this.tokenize(sentence);

      // Check for formality inconsistencies
      if (formality > 70) {
        for (const word of words) {
          if (INFORMAL_INDICATORS.includes(word)) {
            inconsistencies.push({
              type: 'formality',
              description: `Informal word "${word}" in formal text`,
              position: text.indexOf(sentence),
              segment: sentence.substring(0, 100),
              severity: 0.6,
              suggestion: `Consider replacing "${word}" with a more formal alternative`,
            });
            break;
          }
        }
      }

      // Check for voice inconsistencies
      if (i > 0 && sentences[i - 1]) {
        const prevVoice = this.detectVoice(sentences[i - 1] || '');
        const currVoice = this.detectVoice(sentence);
        if (prevVoice !== currVoice && prevVoice !== 'mixed' && currVoice !== 'mixed') {
          inconsistencies.push({
            type: 'voice',
            description: `Voice shift from ${prevVoice} to ${currVoice}`,
            position: text.indexOf(sentence),
            segment: sentence.substring(0, 100),
            severity: 0.4,
            suggestion: 'Consider maintaining consistent voice throughout',
          });
        }
      }
    }

    return inconsistencies.slice(0, 10); // Limit to 10 inconsistencies
  }


  /**
   * Calculates readability score (Flesch-Kincaid grade level approximation)
   */
  private calculateReadability(words: string[], sentences: string[]): number {
    if (words.length === 0 || sentences.length === 0) return 0;

    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = this.estimateAvgSyllables(words);

    // Simplified Flesch-Kincaid formula
    const gradeLevel = 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;

    // Convert to 0-100 scale (lower grade = higher readability score)
    const readabilityScore = Math.max(0, Math.min(100, 100 - (gradeLevel * 5)));
    return Math.round(readabilityScore);
  }

  /**
   * Estimates average syllables per word
   */
  private estimateAvgSyllables(words: string[]): number {
    if (words.length === 0) return 0;

    let totalSyllables = 0;
    for (const word of words) {
      totalSyllables += this.countSyllables(word);
    }

    return totalSyllables / words.length;
  }

  /**
   * Counts syllables in a word (approximation)
   */
  private countSyllables(word: string): number {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;

    const vowels = 'aeiouy';
    let count = 0;
    let prevWasVowel = false;

    for (const char of word) {
      const isVowel = vowels.includes(char);
      if (isVowel && !prevWasVowel) count++;
      prevWasVowel = isVowel;
    }

    // Adjust for silent e
    if (word.endsWith('e')) count--;
    if (word.endsWith('le') && word.length > 2 && !vowels.includes(word[word.length - 3] || '')) {
      count++;
    }

    return Math.max(1, count);
  }

  /**
   * Calculates passive voice percentage
   */
  private calculatePassiveVoicePercent(sentences: string[]): number {
    if (sentences.length === 0) return 0;

    let passiveCount = 0;
    const passivePattern = /\b(was|were|is|are|been|being)\s+\w+(ed|en)\b/gi;

    for (const sentence of sentences) {
      if (passivePattern.test(sentence)) passiveCount++;
      passivePattern.lastIndex = 0; // Reset regex
    }

    return Math.round((passiveCount / sentences.length) * 100);
  }

  /**
   * Generates expected subtopics for a topic
   */
  private generateExpectedSubtopics(topic: string): string[] {
    const subtopics: string[] = [];

    // Generic subtopics that apply to most topics
    subtopics.push(
      `${topic} definition`,
      `${topic} benefits`,
      `${topic} challenges`,
      `${topic} examples`,
      `${topic} best practices`,
      `${topic} implementation`,
      `${topic} future trends`
    );

    return subtopics;
  }

  /**
   * Analyzes topic coverage
   */
  private analyzeTopicCoverage(
    words: string[],
    topic: string,
    expectedSubtopics: string[]
  ): { coveredTopics: string[]; missingTopics: string[]; topicCoverage: TopicCoverage[] } {
    const wordSet = new Set(words);
    const topicWords = this.tokenize(topic);
    const coveredTopics: string[] = [];
    const missingTopics: string[] = [];
    const topicCoverage: TopicCoverage[] = [];

    // Check main topic coverage
    const mainTopicCovered = topicWords.some(tw => wordSet.has(tw));
    if (mainTopicCovered) {
      coveredTopics.push(topic);
    } else {
      missingTopics.push(topic);
    }

    // Check subtopic coverage
    for (const subtopic of expectedSubtopics) {
      const subtopicWords = this.tokenize(subtopic);
      const matchCount = subtopicWords.filter(sw => wordSet.has(sw)).length;
      const coverage = (matchCount / subtopicWords.length) * 100;

      if (coverage > 50) {
        coveredTopics.push(subtopic);
      } else {
        missingTopics.push(subtopic);
      }

      topicCoverage.push({
        topic: subtopic,
        coverage: Math.round(coverage),
        depth: coverage > 70 ? 'deep' : coverage > 30 ? 'moderate' : 'shallow',
        subtopicsCovered: coverage > 50 ? [subtopic] : [],
        subtopicsMissing: coverage <= 50 ? [subtopic] : [],
      });
    }

    return { coveredTopics, missingTopics, topicCoverage };
  }

  /**
   * Calculates completeness score
   */
  private calculateCompletenessScore(topicCoverage: TopicCoverage[]): number {
    if (topicCoverage.length === 0) return 0;

    const totalCoverage = topicCoverage.reduce((sum, tc) => sum + tc.coverage, 0);
    return Math.round(totalCoverage / topicCoverage.length);
  }

  /**
   * Generates gap recommendations
   */
  private generateGapRecommendations(
    missingTopics: string[],
    topicCoverage: TopicCoverage[]
  ): string[] {
    const recommendations: string[] = [];

    for (const topic of missingTopics.slice(0, 5)) {
      recommendations.push(`Consider adding content about: ${topic}`);
    }

    const shallowTopics = topicCoverage.filter(tc => tc.depth === 'shallow');
    for (const tc of shallowTopics.slice(0, 3)) {
      recommendations.push(`Expand coverage of: ${tc.topic}`);
    }

    return recommendations;
  }


  /**
   * Determines primary audience
   */
  private determinePrimaryAudience(words: string[], sentences: string[]): AudienceType {
    const technicalCount = words.filter(w => TECHNICAL_INDICATORS.includes(w)).length;
    const academicCount = words.filter(w => ACADEMIC_INDICATORS.includes(w)).length;
    const informalCount = words.filter(w => INFORMAL_INDICATORS.includes(w)).length;

    const avgSentenceLength = sentences.length > 0 ? words.length / sentences.length : 0;

    if (technicalCount > words.length * 0.05) return 'technical';
    if (academicCount > words.length * 0.03) return 'academic';
    if (informalCount > words.length * 0.05) return 'casual';
    if (avgSentenceLength > 20) return 'professional';
    if (avgSentenceLength < 12) return 'general';

    return 'general';
  }

  /**
   * Finds secondary audiences
   */
  private findSecondaryAudiences(_words: string[], primary: AudienceType): AudienceType[] {
    const audiences: AudienceType[] = [];
    const allAudiences: AudienceType[] = ['general', 'technical', 'academic', 'business', 'professional', 'casual'];

    for (const audience of allAudiences) {
      if (audience !== primary) {
        // Simple heuristic - add audiences that might also be interested
        if (primary === 'technical' && audience === 'professional') audiences.push(audience);
        if (primary === 'academic' && audience === 'professional') audiences.push(audience);
        if (primary === 'business' && audience === 'professional') audiences.push(audience);
        if (primary === 'casual' && audience === 'general') audiences.push(audience);
      }
    }

    return audiences.slice(0, 2);
  }

  /**
   * Calculates reading level (grade level)
   */
  private calculateReadingLevel(words: string[], sentences: string[]): number {
    if (words.length === 0 || sentences.length === 0) return 8;

    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = this.estimateAvgSyllables(words);

    // Flesch-Kincaid Grade Level
    const gradeLevel = 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;

    return Math.max(1, Math.min(18, Math.round(gradeLevel)));
  }

  /**
   * Calculates technical level (0-100)
   */
  private calculateTechnicalLevel(words: string[]): number {
    if (words.length === 0) return 0;

    const technicalCount = words.filter(w => TECHNICAL_INDICATORS.includes(w)).length;
    const ratio = technicalCount / words.length;

    return Math.min(100, Math.round(ratio * 1000));
  }

  /**
   * Determines age group suitability
   */
  private determineAgeGroup(readingLevel: number, _words: string[]): 'children' | 'teens' | 'adults' | 'all' {
    if (readingLevel <= 6) return 'children';
    if (readingLevel <= 10) return 'teens';
    if (readingLevel >= 14) return 'adults';
    return 'all';
  }

  /**
   * Identifies relevant industries
   */
  private identifyIndustries(words: string[]): string[] {
    const industries: string[] = [];
    const wordSet = new Set(words);

    const industryKeywords: Record<string, string[]> = {
      'Technology': ['software', 'technology', 'digital', 'computer', 'data', 'ai', 'machine'],
      'Healthcare': ['health', 'medical', 'patient', 'clinical', 'treatment', 'healthcare'],
      'Finance': ['financial', 'investment', 'banking', 'money', 'market', 'trading'],
      'Education': ['education', 'learning', 'student', 'teaching', 'school', 'academic'],
      'Marketing': ['marketing', 'brand', 'advertising', 'campaign', 'customer', 'sales'],
    };

    for (const [industry, keywords] of Object.entries(industryKeywords)) {
      const matchCount = keywords.filter(k => wordSet.has(k)).length;
      if (matchCount >= 2) industries.push(industry);
    }

    return industries;
  }

  /**
   * Finds engagement indicators
   */
  private findEngagementIndicators(text: string): EngagementIndicator[] {
    const indicators: EngagementIndicator[] = [];

    // Call-to-action patterns
    const ctaPattern = /\b(click|subscribe|sign up|download|learn more|get started|try|buy|order)\b/gi;
    const ctaMatches = text.match(ctaPattern) || [];
    if (ctaMatches.length > 0) {
      indicators.push({
        type: 'call-to-action',
        count: ctaMatches.length,
        effectiveness: Math.min(1, ctaMatches.length * 0.2),
        positions: this.findPositions(text, ctaPattern),
      });
    }

    // Question patterns
    const questionPattern = /\?/g;
    const questionMatches = text.match(questionPattern) || [];
    if (questionMatches.length > 0) {
      indicators.push({
        type: 'question',
        count: questionMatches.length,
        effectiveness: Math.min(1, questionMatches.length * 0.15),
        positions: this.findPositions(text, questionPattern),
      });
    }

    // Statistic patterns
    const statPattern = /\b\d+(\.\d+)?%|\b\d{1,3}(,\d{3})+\b/g;
    const statMatches = text.match(statPattern) || [];
    if (statMatches.length > 0) {
      indicators.push({
        type: 'statistic',
        count: statMatches.length,
        effectiveness: Math.min(1, statMatches.length * 0.25),
        positions: this.findPositions(text, statPattern),
      });
    }

    return indicators;
  }

  /**
   * Finds positions of pattern matches
   */
  private findPositions(text: string, pattern: RegExp): number[] {
    const positions: number[] = [];
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);

    while ((match = regex.exec(text)) !== null) {
      positions.push(match.index);
      if (positions.length >= 10) break;
    }

    return positions;
  }

  /**
   * Generates audience recommendations
   */
  private generateAudienceRecommendations(
    audience: AudienceType,
    readingLevel: number,
    indicators: EngagementIndicator[]
  ): string[] {
    const recommendations: string[] = [];

    if (readingLevel > 12 && audience === 'general') {
      recommendations.push('Consider simplifying language for broader audience appeal');
    }

    const hasQuestions = indicators.some(i => i.type === 'question');
    if (!hasQuestions) {
      recommendations.push('Add rhetorical questions to increase engagement');
    }

    const hasCTA = indicators.some(i => i.type === 'call-to-action');
    if (!hasCTA) {
      recommendations.push('Include clear calls-to-action');
    }

    return recommendations;
  }


  /**
   * Compares with a single competitor
   */
  private compareWithSingleCompetitor(
    text: string,
    competitor: string,
    competitorId: string
  ): CompetitorComparison {
    const ourWords = new Set(this.tokenize(text));
    const theirWords = new Set(this.tokenize(competitor));

    // Calculate similarity (Jaccard index)
    const intersection = new Set([...ourWords].filter(w => theirWords.has(w)));
    const union = new Set([...ourWords, ...theirWords]);
    const similarity = Math.round((intersection.size / union.size) * 100);

    // Find unique words
    const ourUnique = [...ourWords].filter(w => !theirWords.has(w));
    const theirUnique = [...theirWords].filter(w => !ourWords.has(w));

    const advantages = ourUnique.length > theirUnique.length
      ? ['More diverse vocabulary']
      : [];

    const disadvantages = theirUnique.length > ourUnique.length
      ? ['Less diverse vocabulary']
      : [];

    const differentiators = ourUnique.slice(0, 5).map(w => `Uses "${w}"`);

    return {
      competitor: competitorId,
      similarity,
      advantages,
      disadvantages,
      differentiators,
    };
  }

  /**
   * Calculates competitive score
   */
  private calculateCompetitiveScore(comparisons: CompetitorComparison[]): number {
    if (comparisons.length === 0) return 50;

    let totalScore = 0;
    for (const comp of comparisons) {
      // Lower similarity = more unique = better
      const uniquenessScore = 100 - comp.similarity;
      const advantageScore = comp.advantages.length * 10;
      const disadvantageScore = comp.disadvantages.length * 10;

      totalScore += uniquenessScore + advantageScore - disadvantageScore;
    }

    return Math.max(0, Math.min(100, Math.round(totalScore / comparisons.length)));
  }

  /**
   * Identifies strengths and weaknesses
   */
  private identifyStrengthsWeaknesses(
    text: string,
    competitors: string[]
  ): { strengths: string[]; weaknesses: string[] } {
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    const ourWords = this.tokenize(text);
    const ourLength = ourWords.length;

    // Compare lengths
    const avgCompetitorLength = competitors.reduce((sum, c) => sum + this.countWords(c), 0) / competitors.length;

    if (ourLength > avgCompetitorLength * 1.2) {
      strengths.push('More comprehensive content');
    } else if (ourLength < avgCompetitorLength * 0.8) {
      weaknesses.push('Less comprehensive than competitors');
    }

    // Check vocabulary richness
    const ourRichness = new Set(ourWords).size / ourWords.length;
    if (ourRichness > 0.6) {
      strengths.push('Rich vocabulary');
    } else if (ourRichness < 0.4) {
      weaknesses.push('Limited vocabulary variety');
    }

    return { strengths, weaknesses };
  }

  /**
   * Finds opportunities from competitor analysis
   */
  private findOpportunities(comparisons: CompetitorComparison[]): string[] {
    const opportunities: string[] = [];

    for (const comp of comparisons) {
      if (comp.similarity < 30) {
        opportunities.push(`Differentiated content from ${comp.competitor}`);
      }
      if (comp.advantages.length > comp.disadvantages.length) {
        opportunities.push(`Competitive advantage over ${comp.competitor}`);
      }
    }

    return opportunities.slice(0, 5);
  }

  /**
   * Finds unique elements in our content
   */
  private findUniqueElements(words: string[], competitors: string[]): string[] {
    const ourWords = new Set(words);
    const competitorWords = new Set<string>();

    for (const competitor of competitors) {
      for (const word of this.tokenize(competitor)) {
        competitorWords.add(word);
      }
    }

    const unique = [...ourWords].filter(w => !competitorWords.has(w) && w.length > 4);
    return unique.slice(0, 10);
  }

  /**
   * Generates competitive recommendations
   */
  private generateCompetitiveRecommendations(
    strengths: string[],
    weaknesses: string[],
    opportunities: string[]
  ): string[] {
    const recommendations: string[] = [];

    for (const weakness of weaknesses) {
      recommendations.push(`Address: ${weakness}`);
    }

    for (const opportunity of opportunities.slice(0, 2)) {
      recommendations.push(`Leverage: ${opportunity}`);
    }

    if (strengths.length > 0) {
      recommendations.push(`Highlight your strengths: ${strengths.join(', ')}`);
    }

    return recommendations;
  }

  /**
   * Predicts engagement rate
   */
  private predictEngagementRate(text: string, words: string[], sentences: string[]): number {
    let score = 50;

    // Questions increase engagement
    const questionCount = (text.match(/\?/g) || []).length;
    score += Math.min(20, questionCount * 5);

    // Shorter sentences are more engaging
    const avgSentenceLength = sentences.length > 0 ? words.length / sentences.length : 0;
    if (avgSentenceLength < 15) score += 10;
    if (avgSentenceLength > 25) score -= 10;

    // Variety in sentence length
    if (sentences.length > 3) {
      const lengths = sentences.map(s => this.countWords(s));
      const variance = this.calculateVariance(lengths);
      if (variance > 20) score += 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculates variance of numbers
   */
  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length;
  }


  /**
   * Predicts shareability
   */
  private predictShareability(text: string, words: string[]): number {
    let score = 50;

    // Emotional words increase shareability
    const emotionalWords = ['amazing', 'incredible', 'shocking', 'surprising', 'essential', 'must'];
    const emotionalCount = words.filter(w => emotionalWords.includes(w)).length;
    score += Math.min(20, emotionalCount * 5);

    // Lists are shareable
    const listPattern = /^\s*[-•*]\s/gm;
    const listCount = (text.match(listPattern) || []).length;
    score += Math.min(15, listCount * 3);

    // Numbers/statistics are shareable
    const statPattern = /\b\d+(\.\d+)?%/g;
    const statCount = (text.match(statPattern) || []).length;
    score += Math.min(15, statCount * 5);

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Predicts SEO performance
   */
  private predictSEOPerformance(text: string, words: string[]): number {
    let score = 50;

    // Word count (300-2000 is optimal)
    if (words.length >= 300 && words.length <= 2000) score += 15;
    else if (words.length < 300) score -= 10;

    // Headings
    const headingPattern = /^#+\s/gm;
    const headingCount = (text.match(headingPattern) || []).length;
    score += Math.min(15, headingCount * 5);

    // Links
    const linkPattern = /\[.*?\]\(.*?\)/g;
    const linkCount = (text.match(linkPattern) || []).length;
    score += Math.min(10, linkCount * 2);

    // Keyword density (check for repeated important words)
    const wordFreq = new Map<string, number>();
    for (const word of words) {
      if (word.length > 4) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    }
    const hasKeywords = [...wordFreq.values()].some(count => count >= 3);
    if (hasKeywords) score += 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Predicts conversion potential
   */
  private predictConversionPotential(_text: string, words: string[]): number {
    let score = 50;

    // Call-to-action words
    const ctaWords = ['click', 'subscribe', 'sign', 'download', 'buy', 'order', 'get', 'try'];
    const ctaCount = words.filter(w => ctaWords.includes(w)).length;
    score += Math.min(20, ctaCount * 5);

    // Urgency words
    const urgencyWords = ['now', 'today', 'limited', 'exclusive', 'hurry', 'last'];
    const urgencyCount = words.filter(w => urgencyWords.includes(w)).length;
    score += Math.min(15, urgencyCount * 5);

    // Benefit words
    const benefitWords = ['free', 'save', 'easy', 'fast', 'best', 'guaranteed'];
    const benefitCount = words.filter(w => benefitWords.includes(w)).length;
    score += Math.min(15, benefitCount * 5);

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculates prediction confidence
   */
  private calculatePredictionConfidence(wordCount: number): number {
    // More words = higher confidence
    if (wordCount < 50) return 0.3;
    if (wordCount < 200) return 0.5;
    if (wordCount < 500) return 0.7;
    if (wordCount < 1000) return 0.85;
    return 0.95;
  }

  /**
   * Identifies performance factors
   */
  private identifyPerformanceFactors(
    engagement: number,
    readability: number,
    shareability: number,
    seo: number,
    conversion: number
  ): PerformanceFactor[] {
    const factors: PerformanceFactor[] = [];

    factors.push({
      name: 'Engagement',
      impact: (engagement - 50) / 50,
      score: engagement,
      suggestion: engagement < 50 ? 'Add questions and vary sentence length' : 'Good engagement potential',
    });

    factors.push({
      name: 'Readability',
      impact: (readability - 50) / 50,
      score: readability,
      suggestion: readability < 50 ? 'Simplify language and shorten sentences' : 'Good readability',
    });

    factors.push({
      name: 'Shareability',
      impact: (shareability - 50) / 50,
      score: shareability,
      suggestion: shareability < 50 ? 'Add emotional hooks and statistics' : 'Good shareability',
    });

    factors.push({
      name: 'SEO',
      impact: (seo - 50) / 50,
      score: seo,
      suggestion: seo < 50 ? 'Add headings and optimize word count' : 'Good SEO potential',
    });

    factors.push({
      name: 'Conversion',
      impact: (conversion - 50) / 50,
      score: conversion,
      suggestion: conversion < 50 ? 'Add clear calls-to-action' : 'Good conversion potential',
    });

    return factors;
  }

  /**
   * Generates performance recommendations
   */
  private generatePerformanceRecommendations(factors: PerformanceFactor[]): string[] {
    return factors
      .filter(f => f.score < 60)
      .map(f => f.suggestion)
      .slice(0, 5);
  }

  /**
   * Calculates source citation score
   */
  private calculateSourceCitationScore(text: string): number {
    let score = 30; // Base score

    // Check for citation patterns
    const citationPatterns = [
      /\([A-Z][a-z]+,?\s*\d{4}\)/g, // (Author, 2024)
      /\[\d+\]/g, // [1]
      /according to/gi,
      /research shows/gi,
      /studies indicate/gi,
      /https?:\/\/[^\s]+/g, // URLs
    ];

    for (const pattern of citationPatterns) {
      const matches = text.match(pattern) || [];
      score += Math.min(15, matches.length * 5);
    }

    return Math.min(100, score);
  }

  /**
   * Calculates factual indicators score
   */
  private calculateFactualIndicators(text: string, words: string[]): number {
    let score = 40;

    // Statistics and numbers
    const statPattern = /\b\d+(\.\d+)?%|\b\d{1,3}(,\d{3})+\b/g;
    const statCount = (text.match(statPattern) || []).length;
    score += Math.min(30, statCount * 5);

    // Factual language
    const factualWords = ['data', 'research', 'study', 'evidence', 'findings', 'results'];
    const factualCount = words.filter(w => factualWords.includes(w)).length;
    score += Math.min(30, factualCount * 5);

    return Math.min(100, score);
  }


  /**
   * Calculates authority signals score
   */
  private calculateAuthoritySignals(text: string, words: string[]): number {
    let score = 40;

    // Expert language
    const expertWords = ['expert', 'professional', 'specialist', 'authority', 'leading'];
    const expertCount = words.filter(w => expertWords.includes(w)).length;
    score += Math.min(20, expertCount * 5);

    // Credentials mentioned
    const credentialPatterns = [/\bPhD\b/g, /\bMD\b/g, /\bProfessor\b/gi, /\bDr\.\b/g];
    for (const pattern of credentialPatterns) {
      if (pattern.test(text)) score += 10;
    }

    return Math.min(100, score);
  }

  /**
   * Calculates bias score (higher = less biased)
   */
  private calculateBiasScore(text: string, words: string[]): number {
    let score = 80; // Start high, deduct for bias indicators

    // Absolute language (indicates bias)
    const absoluteWords = ['always', 'never', 'everyone', 'nobody', 'all', 'none'];
    const absoluteCount = words.filter(w => absoluteWords.includes(w)).length;
    score -= Math.min(30, absoluteCount * 5);

    // Emotional/loaded language
    const loadedWords = ['terrible', 'amazing', 'horrible', 'fantastic', 'worst', 'best'];
    const loadedCount = words.filter(w => loadedWords.includes(w)).length;
    score -= Math.min(20, loadedCount * 5);

    // One-sided arguments
    const balanceWords = ['however', 'although', 'on the other hand', 'alternatively'];
    const hasBalance = balanceWords.some(w => text.toLowerCase().includes(w));
    if (hasBalance) score += 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculates transparency score
   */
  private calculateTransparencyScore(text: string): number {
    let score = 50;

    // Disclosure language
    const disclosurePatterns = [
      /\bdisclosure\b/gi,
      /\bsponsored\b/gi,
      /\baffiliate\b/gi,
      /\bpartnership\b/gi,
      /\bpaid\b/gi,
    ];

    for (const pattern of disclosurePatterns) {
      if (pattern.test(text)) score += 10;
    }

    // Methodology explanation
    if (/\bmethodology\b/gi.test(text) || /\bmethod\b/gi.test(text)) {
      score += 15;
    }

    // Limitations mentioned
    if (/\blimitation\b/gi.test(text) || /\bcaveat\b/gi.test(text)) {
      score += 15;
    }

    return Math.min(100, score);
  }

  /**
   * Identifies credibility factors
   */
  private identifyCredibilityFactors(
    sourceCitation: number,
    factual: number,
    authority: number,
    bias: number,
    transparency: number
  ): CredibilityFactor[] {
    return [
      { name: 'Source Citations', score: sourceCitation, weight: 0.25, description: 'References and citations' },
      { name: 'Factual Indicators', score: factual, weight: 0.2, description: 'Data and evidence' },
      { name: 'Authority Signals', score: authority, weight: 0.2, description: 'Expert credentials' },
      { name: 'Objectivity', score: bias, weight: 0.2, description: 'Balanced perspective' },
      { name: 'Transparency', score: transparency, weight: 0.15, description: 'Disclosure and methodology' },
    ];
  }

  /**
   * Finds credibility issues
   */
  private findCredibilityIssues(text: string): CredibilityIssue[] {
    const issues: CredibilityIssue[] = [];

    // Check for unsupported claims
    const claimPatterns = [
      /\b(studies show|research proves|experts agree)\b/gi,
    ];

    for (const pattern of claimPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        // Check if there's a citation nearby
        const context = text.substring(Math.max(0, match.index - 50), match.index + 100);
        if (!/\(\d{4}\)|\[\d+\]/.test(context)) {
          issues.push({
            type: 'unsupported-claim',
            description: 'Claim without citation',
            position: match.index,
            segment: match[0],
            severity: 0.6,
            suggestion: 'Add a citation to support this claim',
          });
        }
        if (issues.length >= 5) break;
      }
    }

    return issues;
  }

  /**
   * Generates credibility recommendations
   */
  private generateCredibilityRecommendations(
    factors: CredibilityFactor[],
    issues: CredibilityIssue[]
  ): string[] {
    const recommendations: string[] = [];

    for (const factor of factors) {
      if (factor.score < 50) {
        recommendations.push(`Improve ${factor.name.toLowerCase()}: ${factor.description}`);
      }
    }

    for (const issue of issues.slice(0, 3)) {
      recommendations.push(issue.suggestion);
    }

    return recommendations.slice(0, 5);
  }

  /**
   * Detects controversial topics
   */
  private detectControversialTopics(text: string, lowerText: string): ControversialTopic[] {
    const topics: ControversialTopic[] = [];

    for (const topic of CONTROVERSIAL_TOPICS) {
      const index = lowerText.indexOf(topic);
      if (index !== -1) {
        const context = text.substring(Math.max(0, index - 30), index + topic.length + 30);
        topics.push({
          topic,
          score: 70,
          context,
          position: index,
          suggestion: `Consider neutral framing when discussing ${topic}`,
        });
      }
    }

    return topics;
  }

  /**
   * Detects sensitive language
   */
  private detectSensitiveLanguage(text: string): SensitiveLanguage[] {
    const sensitive: SensitiveLanguage[] = [];

    for (const { pattern, category, severity } of SENSITIVE_PATTERNS) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(text)) !== null) {
        sensitive.push({
          term: match[0],
          category,
          severity,
          position: match.index,
          alternative: 'Consider more neutral language',
        });
        if (sensitive.length >= 10) break;
      }
    }

    return sensitive;
  }


  /**
   * Finds polarizing statements
   */
  private findPolarizingStatements(text: string): PolarizingStatement[] {
    const statements: PolarizingStatement[] = [];
    const sentences = this.splitIntoSentences(text);

    const polarizingPatterns = [
      /\b(always|never|everyone|nobody|all|none)\b.*\b(should|must|need)\b/gi,
      /\b(obviously|clearly|undoubtedly)\b/gi,
      /\b(stupid|idiotic|moronic)\b/gi,
    ];

    for (const sentence of sentences) {
      for (const pattern of polarizingPatterns) {
        if (pattern.test(sentence)) {
          const position = text.indexOf(sentence);
          statements.push({
            statement: sentence.substring(0, 100),
            position,
            score: 70,
            neutralAlternative: 'Consider using more balanced language',
          });
          pattern.lastIndex = 0;
          break;
        }
      }
      if (statements.length >= 5) break;
    }

    return statements;
  }

  /**
   * Calculates controversy level
   */
  private calculateControversyLevel(
    topics: ControversialTopic[],
    sensitive: SensitiveLanguage[],
    polarizing: PolarizingStatement[]
  ): number {
    let level = 0;

    // Topics contribute most
    level += topics.length * 15;

    // Sensitive language
    level += sensitive.reduce((sum, s) => sum + s.severity * 10, 0);

    // Polarizing statements
    level += polarizing.length * 10;

    return Math.min(100, level);
  }

  /**
   * Determines risk level
   */
  private determineRiskLevel(controversyLevel: number): 'low' | 'medium' | 'high' | 'critical' {
    if (controversyLevel < 25) return 'low';
    if (controversyLevel < 50) return 'medium';
    if (controversyLevel < 75) return 'high';
    return 'critical';
  }

  /**
   * Generates controversy recommendations
   */
  private generateControversyRecommendations(
    topics: ControversialTopic[],
    sensitive: SensitiveLanguage[],
    polarizing: PolarizingStatement[]
  ): string[] {
    const recommendations: string[] = [];

    if (topics.length > 0) {
      recommendations.push('Consider presenting multiple perspectives on controversial topics');
    }

    if (sensitive.length > 0) {
      recommendations.push('Review and potentially soften sensitive language');
    }

    if (polarizing.length > 0) {
      recommendations.push('Replace absolute statements with more nuanced language');
    }

    if (recommendations.length === 0) {
      recommendations.push('Content appears neutral and balanced');
    }

    return recommendations;
  }

  /**
   * Detects age indicators in content
   */
  private detectAgeIndicators(text: string): AgeIndicator[] {
    const indicators: AgeIndicator[] = [];
    const currentYear = new Date().getFullYear();

    for (const pattern of DATE_PATTERNS) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(text)) !== null) {
        const dateText = match[0];
        let estimatedAge = 0;

        // Try to extract year
        const yearMatch = dateText.match(/\b(20\d{2})\b/);
        if (yearMatch && yearMatch[1]) {
          const year = parseInt(yearMatch[1], 10);
          estimatedAge = (currentYear - year) * 365;
        }

        // Handle relative dates
        if (/last year/i.test(dateText)) estimatedAge = 365;
        if (/this year/i.test(dateText)) estimatedAge = 0;
        if (/last month/i.test(dateText)) estimatedAge = 30;

        indicators.push({
          type: 'date',
          text: dateText,
          estimatedAge,
          position: match.index,
          impact: estimatedAge > 365 ? 0.8 : estimatedAge > 180 ? 0.5 : 0.2,
        });

        if (indicators.length >= 10) break;
      }
    }

    return indicators;
  }

  /**
   * Finds outdated references
   */
  private findOutdatedReferences(text: string): OutdatedReference[] {
    const outdated: OutdatedReference[] = [];
    const currentYear = new Date().getFullYear();

    // Check for old years
    const yearPattern = /\b(20[0-1]\d|19\d{2})\b/g;
    let match;
    while ((match = yearPattern.exec(text)) !== null) {
      if (!match[1]) continue;
      const year = parseInt(match[1], 10);
      if (currentYear - year > 5) {
        outdated.push({
          reference: match[0],
          reason: `Reference from ${year} may be outdated`,
          position: match.index,
          suggestedUpdate: `Consider updating with more recent data from ${currentYear - 1} or ${currentYear}`,
        });
      }
      if (outdated.length >= 5) break;
    }

    return outdated;
  }

  /**
   * Calculates trending alignment
   */
  private calculateTrendingAlignment(text: string): number {
    // This would ideally connect to a trending topics API
    // For now, use heuristics based on current tech/business terms
    const trendingTerms = [
      'ai', 'artificial intelligence', 'machine learning', 'chatgpt', 'generative',
      'sustainability', 'remote work', 'hybrid', 'digital transformation',
      'blockchain', 'cryptocurrency', 'metaverse', 'web3',
    ];

    const lowerText = text.toLowerCase();
    let matchCount = 0;

    for (const term of trendingTerms) {
      if (lowerText.includes(term)) matchCount++;
    }

    return Math.min(100, matchCount * 15);
  }

  /**
   * Calculates evergreen score
   */
  private calculateEvergreenScore(text: string, ageIndicators: AgeIndicator[]): number {
    let score = 80;

    // Deduct for time-specific references
    score -= ageIndicators.length * 5;

    // Check for evergreen language
    const evergreenPatterns = [
      /\bfundamental\b/gi,
      /\bprinciple\b/gi,
      /\btimeless\b/gi,
      /\bclassic\b/gi,
    ];

    for (const pattern of evergreenPatterns) {
      if (pattern.test(text)) score += 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Finds time-sensitive elements
   */
  private findTimeSensitiveElements(text: string): TimeSensitiveElement[] {
    const elements: TimeSensitiveElement[] = [];

    // Deadline patterns
    const deadlinePattern = /\b(deadline|expires?|ends?|until)\b[^.]*\b(\d{1,2}\/\d{1,2}|\w+ \d{1,2})\b/gi;
    let match;
    while ((match = deadlinePattern.exec(text)) !== null) {
      elements.push({
        text: match[0],
        type: 'deadline',
        position: match.index,
        expiresIn: null,
        recommendation: 'Update or remove time-sensitive deadline',
      });
      if (elements.length >= 5) break;
    }

    // Seasonal patterns
    const seasonalPattern = /\b(spring|summer|fall|autumn|winter|holiday|christmas|thanksgiving)\b/gi;
    while ((match = seasonalPattern.exec(text)) !== null) {
      elements.push({
        text: match[0],
        type: 'seasonal',
        position: match.index,
        expiresIn: null,
        recommendation: 'Consider if seasonal reference is still relevant',
      });
      if (elements.length >= 10) break;
    }

    return elements;
  }

  /**
   * Calculates overall freshness score
   */
  private calculateFreshnessScore(
    ageIndicators: AgeIndicator[],
    outdatedReferences: OutdatedReference[],
    trendingAlignment: number,
    evergreenScore: number
  ): number {
    let score = 70;

    // Deduct for old content
    const avgAge = ageIndicators.length > 0
      ? ageIndicators.reduce((sum, a) => sum + a.estimatedAge, 0) / ageIndicators.length
      : 0;
    score -= Math.min(30, avgAge / 100);

    // Deduct for outdated references
    score -= outdatedReferences.length * 5;

    // Add for trending alignment
    score += trendingAlignment * 0.2;

    // Factor in evergreen score
    score = (score + evergreenScore) / 2;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Generates freshness recommendations
   */
  private generateFreshnessRecommendations(
    ageIndicators: AgeIndicator[],
    outdatedReferences: OutdatedReference[],
    timeSensitive: TimeSensitiveElement[]
  ): string[] {
    const recommendations: string[] = [];

    if (outdatedReferences.length > 0) {
      recommendations.push('Update outdated references with current data');
    }

    if (timeSensitive.length > 0) {
      recommendations.push('Review time-sensitive elements for relevance');
    }

    const oldIndicators = ageIndicators.filter(a => a.estimatedAge > 365);
    if (oldIndicators.length > 0) {
      recommendations.push('Consider updating content with more recent information');
    }

    if (recommendations.length === 0) {
      recommendations.push('Content appears fresh and up-to-date');
    }

    return recommendations;
  }

  /**
   * Calculates overall quality score
   */
  private calculateOverallQualityScore(
    style: StyleAnalysis,
    performance: PerformancePrediction,
    credibility: CredibilityScore,
    controversy: ControversyReport,
    freshness: FreshnessScore
  ): number {
    const scores = [
      style.readabilityScore * 0.2,
      performance.overallScore * 0.25,
      credibility.overallScore * 0.25,
      (100 - controversy.controversyLevel) * 0.15,
      freshness.overallScore * 0.15,
    ];

    return Math.round(scores.reduce((a, b) => a + b, 0));
  }

  /**
   * Generates top recommendations
   */
  private generateTopRecommendations(
    style: StyleAnalysis,
    audience: AudienceProfile,
    performance: PerformancePrediction,
    credibility: CredibilityScore,
    controversy: ControversyReport,
    freshness: FreshnessScore
  ): string[] {
    const allRecommendations: { text: string; priority: number }[] = [];

    // Add recommendations with priorities
    for (const rec of style.inconsistencies.slice(0, 2)) {
      allRecommendations.push({ text: rec.suggestion, priority: rec.severity });
    }

    for (const rec of audience.recommendations.slice(0, 2)) {
      allRecommendations.push({ text: rec, priority: 0.5 });
    }

    for (const rec of performance.recommendations.slice(0, 2)) {
      allRecommendations.push({ text: rec, priority: 0.6 });
    }

    for (const rec of credibility.recommendations.slice(0, 2)) {
      allRecommendations.push({ text: rec, priority: 0.7 });
    }

    for (const rec of controversy.recommendations.slice(0, 1)) {
      allRecommendations.push({ text: rec, priority: 0.8 });
    }

    for (const rec of freshness.recommendations.slice(0, 1)) {
      allRecommendations.push({ text: rec, priority: 0.4 });
    }

    // Sort by priority and return top 5
    return allRecommendations
      .sort((a, b) => b.priority - a.priority)
      .map(r => r.text)
      .slice(0, 5);
  }
}
