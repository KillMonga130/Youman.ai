/**
 * Content Enrichment Service
 * Provides opportunity identification, citation addition, statistics insertion,
 * and content marking for user review
 * Requirements: 105
 */

import crypto from 'crypto';
import {
  EnrichmentOpportunityType,
  EnrichmentPriority,
  EnrichmentOpportunity,
  Citation,
  CitationFormat,
  Statistic,
  MarkedContent,
  OpportunityIdentificationResult,
  CitationAdditionRequest,
  CitationAdditionResult,
  CitationPosition,
  StatisticsInsertionRequest,
  StatisticsInsertionResult,
  StatisticPosition,
  VerificationSummary,
  ContentMarkingRequest,
  ContentMarkingResult,
  ReviewDecision,
  ReviewApplicationResult,
  ComprehensiveEnrichmentRequest,
  ComprehensiveEnrichmentResult,
  EnrichmentSummary,
  EnrichmentConfig,
} from './types';

/** Default configuration values */
const DEFAULT_CITATION_FORMAT: CitationFormat = 'APA';
const DEFAULT_MAX_ENRICHMENTS = 10;
const DEFAULT_MIN_RELEVANCE = 0.6;
const DEFAULT_MIN_CONFIDENCE = 0.7;
const DEFAULT_VERIFY = true;
const MIN_TEXT_LENGTH = 50;
const MAX_TEXT_LENGTH = 100000;
const DEFAULT_TIMEOUT = 30000;

/** Patterns for identifying enrichment opportunities */
const CLAIM_PATTERNS = [
  /\b(studies show|research indicates|experts say|according to|it is known that)\b/gi,
  /\b(many people|most users|the majority|a significant number)\b/gi,
  /\b(always|never|every|all|none)\b/gi,
];

const EXAMPLE_OPPORTUNITY_PATTERNS = [
  /\b(for instance|for example|such as|like)\b/gi,
  /\b(consider|imagine|suppose|think about)\b/gi,
];

const STATISTIC_OPPORTUNITY_PATTERNS = [
  /\b(percentage|percent|ratio|rate|number of|amount of)\b/gi,
  /\b(increase|decrease|growth|decline|rise|fall)\b/gi,
  /\b(average|median|mean|typical)\b/gi,
];

const DEFINITION_OPPORTUNITY_PATTERNS = [
  /\b(is defined as|refers to|means|is called|known as)\b/gi,
  /\b(concept|term|definition|meaning)\b/gi,
];

/** Sample statistics database (in production, this would be an external service) */
const SAMPLE_STATISTICS: Statistic[] = [
  {
    id: 'stat_001',
    value: '73%',
    description: 'of consumers prefer personalized content',
    source: 'Content Marketing Institute',
    year: 2023,
    verified: true,
    confidence: 0.9,
    category: 'marketing',
    keywords: ['content', 'personalization', 'consumer', 'preference'],
  },
  {
    id: 'stat_002',
    value: '47%',
    description: 'increase in engagement with data-driven content',
    source: 'HubSpot Research',
    year: 2023,
    verified: true,
    confidence: 0.85,
    category: 'engagement',
    keywords: ['engagement', 'data', 'content', 'marketing'],
  },
  {
    id: 'stat_003',
    value: '65%',
    description: 'of B2B buyers find vendor content more trustworthy with statistics',
    source: 'Demand Gen Report',
    year: 2022,
    verified: true,
    confidence: 0.88,
    category: 'trust',
    keywords: ['B2B', 'trust', 'statistics', 'vendor'],
  },
];

/** Sample citations database */
const SAMPLE_CITATIONS: Omit<Citation, 'id' | 'formattedCitation' | 'relevance' | 'verified'>[] = [
  {
    title: 'The Impact of AI on Content Creation',
    authors: ['Smith, J.', 'Johnson, M.'],
    year: 2023,
    publication: 'Journal of Digital Marketing',
    volume: '15',
    issue: '3',
    pages: '45-67',
    format: 'APA',
  },
  {
    title: 'Content Strategy in the Digital Age',
    authors: ['Williams, R.'],
    year: 2022,
    publisher: 'Academic Press',
    format: 'APA',
  },
];

/**
 * Content Enrichment Service class
 * Handles opportunity identification, citation addition, statistics insertion,
 * and content marking for user review
 */
export class EnrichmentService {
  private config: EnrichmentConfig;

  constructor(serviceConfig?: Partial<EnrichmentConfig>) {
    this.config = this.buildConfig(serviceConfig);
  }

  /**
   * Builds the service configuration
   */
  private buildConfig(overrides?: Partial<EnrichmentConfig>): EnrichmentConfig {
    return {
      defaultCitationFormat: overrides?.defaultCitationFormat ?? DEFAULT_CITATION_FORMAT,
      defaultMaxEnrichments: overrides?.defaultMaxEnrichments ?? DEFAULT_MAX_ENRICHMENTS,
      defaultMinRelevance: overrides?.defaultMinRelevance ?? DEFAULT_MIN_RELEVANCE,
      defaultMinConfidence: overrides?.defaultMinConfidence ?? DEFAULT_MIN_CONFIDENCE,
      defaultVerify: overrides?.defaultVerify ?? DEFAULT_VERIFY,
      minTextLength: overrides?.minTextLength ?? MIN_TEXT_LENGTH,
      maxTextLength: overrides?.maxTextLength ?? MAX_TEXT_LENGTH,
      timeout: overrides?.timeout ?? DEFAULT_TIMEOUT,
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
   * Gets context around a position in text
   */
  private getContext(text: string, position: number, contextLength: number = 100): string {
    const start = Math.max(0, position - contextLength);
    const end = Math.min(text.length, position + contextLength);
    return text.substring(start, end);
  }

  /**
   * Identifies enrichment opportunities in text
   * Requirement 105: Create opportunity identification for examples/data
   * @param text - Text to analyze
   * @returns Opportunity identification result
   */
  async identifyOpportunities(text: string): Promise<OpportunityIdentificationResult> {
    const startTime = Date.now();
    const id = this.generateId('opp');
    const wordCount = this.countWords(text);

    if (wordCount < this.config.minTextLength) {
      return this.createEmptyOpportunityResult(id, text, wordCount, startTime);
    }

    const opportunities: EnrichmentOpportunity[] = [];

    // Find claim opportunities (need citations/statistics)
    this.findPatternOpportunities(text, CLAIM_PATTERNS, 'citation', opportunities);

    // Find example opportunities
    this.findPatternOpportunities(text, EXAMPLE_OPPORTUNITY_PATTERNS, 'example', opportunities);

    // Find statistic opportunities
    this.findPatternOpportunities(text, STATISTIC_OPPORTUNITY_PATTERNS, 'statistic', opportunities);

    // Find definition opportunities
    this.findPatternOpportunities(text, DEFINITION_OPPORTUNITY_PATTERNS, 'definition', opportunities);

    // Find vague statements that could use data
    this.findVagueStatements(text, opportunities);

    // Sort by priority and position
    opportunities.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.position - b.position;
    });

    // Calculate statistics
    const opportunitiesByType = this.countByType(opportunities);
    const opportunitiesByPriority = this.countByPriority(opportunities);
    const enrichmentPotential = this.calculateEnrichmentPotential(opportunities, wordCount);
    const recommendations = this.generateOpportunityRecommendations(opportunities, opportunitiesByType);

    return {
      id,
      originalText: text,
      wordCount,
      opportunities,
      totalOpportunities: opportunities.length,
      opportunitiesByType,
      opportunitiesByPriority,
      enrichmentPotential,
      recommendations,
      timestamp: new Date(),
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Finds opportunities based on regex patterns
   */
  private findPatternOpportunities(
    text: string,
    patterns: RegExp[],
    type: EnrichmentOpportunityType,
    opportunities: EnrichmentOpportunity[]
  ): void {
    for (const pattern of patterns) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(text)) !== null) {
        const position = match.index;
        const segment = match[0];
        const context = this.getContext(text, position);
        const sentence = this.getSentenceAtPosition(text, position);

        opportunities.push({
          id: this.generateId('opp_item'),
          type,
          position,
          endPosition: position + segment.length,
          segment,
          context,
          reason: this.getOpportunityReason(type, segment),
          priority: this.determinePriority(type, segment, context),
          confidence: this.calculateConfidence(type, context),
          suggestion: this.generateSuggestion(type, sentence, segment),
          keywords: this.extractKeywords(context),
        });
      }
    }
  }

  /**
   * Finds vague statements that could benefit from data
   */
  private findVagueStatements(text: string, opportunities: EnrichmentOpportunity[]): void {
    const vaguePatterns = [
      /\b(a lot of|lots of|many|few|some|several)\s+\w+/gi,
      /\b(significantly|substantially|considerably|dramatically)\b/gi,
      /\b(often|sometimes|rarely|frequently|usually)\b/gi,
    ];

    for (const pattern of vaguePatterns) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(text)) !== null) {
        const position = match.index;
        const segment = match[0];
        const context = this.getContext(text, position);

        opportunities.push({
          id: this.generateId('opp_item'),
          type: 'data-point',
          position,
          endPosition: position + segment.length,
          segment,
          context,
          reason: `Vague quantifier "${segment}" could be replaced with specific data`,
          priority: 'medium',
          confidence: 0.7,
          suggestion: `Consider replacing "${segment}" with specific numbers or percentages`,
          keywords: this.extractKeywords(context),
        });
      }
    }
  }

  /**
   * Gets the sentence containing a position
   */
  private getSentenceAtPosition(text: string, position: number): string {
    const sentences = this.splitIntoSentences(text);
    let currentPos = 0;

    for (const sentence of sentences) {
      const sentenceStart = text.indexOf(sentence, currentPos);
      const sentenceEnd = sentenceStart + sentence.length;

      if (position >= sentenceStart && position <= sentenceEnd) {
        return sentence;
      }
      currentPos = sentenceEnd;
    }

    return text.substring(Math.max(0, position - 50), Math.min(text.length, position + 50));
  }

  /**
   * Gets reason for opportunity based on type
   */
  private getOpportunityReason(type: EnrichmentOpportunityType, segment: string): string {
    const reasons: Record<EnrichmentOpportunityType, string> = {
      'example': `The phrase "${segment}" suggests an example could strengthen this point`,
      'statistic': `This section could benefit from supporting statistics`,
      'citation': `The claim "${segment}" should be supported with a citation`,
      'definition': `A clear definition could improve understanding here`,
      'case-study': `A case study would provide concrete evidence`,
      'data-point': `Specific data would make this claim more credible`,
      'quote': `An expert quote could add authority to this point`,
      'comparison': `A comparison could help illustrate this concept`,
    };
    return reasons[type] || 'This section could benefit from enrichment';
  }

  /**
   * Determines priority based on type and context
   */
  private determinePriority(
    type: EnrichmentOpportunityType,
    segment: string,
    context: string
  ): EnrichmentPriority {
    // Claims without citations are high priority
    if (type === 'citation' && /\b(studies show|research indicates|experts say)\b/i.test(segment)) {
      return 'high';
    }

    // Absolute statements are critical
    if (/\b(always|never|every|all|none)\b/i.test(segment)) {
      return 'critical';
    }

    // Statistics opportunities in key sections
    if (type === 'statistic' && /\b(conclusion|summary|key|important)\b/i.test(context)) {
      return 'high';
    }

    // Default priorities by type
    const defaultPriorities: Record<EnrichmentOpportunityType, EnrichmentPriority> = {
      'citation': 'high',
      'statistic': 'medium',
      'example': 'medium',
      'definition': 'low',
      'case-study': 'medium',
      'data-point': 'medium',
      'quote': 'low',
      'comparison': 'low',
    };

    return defaultPriorities[type] || 'medium';
  }

  /**
   * Calculates confidence score for an opportunity
   */
  private calculateConfidence(type: EnrichmentOpportunityType, context: string): number {
    let confidence = 0.7; // Base confidence

    // Increase confidence for clear patterns
    if (/\b(studies show|research indicates|according to)\b/i.test(context)) {
      confidence += 0.15;
    }

    // Decrease confidence for ambiguous contexts
    if (/\b(maybe|perhaps|possibly|might)\b/i.test(context)) {
      confidence -= 0.1;
    }

    // Type-specific adjustments
    if (type === 'citation') confidence += 0.1;
    if (type === 'example') confidence += 0.05;

    return Math.min(1, Math.max(0, confidence));
  }

  /**
   * Generates suggestion for enrichment
   */
  private generateSuggestion(
    type: EnrichmentOpportunityType,
    sentence: string,
    _segment: string
  ): string {
    const suggestions: Record<EnrichmentOpportunityType, string> = {
      'example': `Add a concrete example to illustrate: "${sentence.substring(0, 50)}..."`,
      'statistic': `Support with relevant statistics from reputable sources`,
      'citation': `Add a citation from a peer-reviewed source or authoritative publication`,
      'definition': `Include a clear definition from an authoritative source`,
      'case-study': `Reference a relevant case study to provide evidence`,
      'data-point': `Replace vague language with specific numbers or percentages`,
      'quote': `Include a quote from a subject matter expert`,
      'comparison': `Add a comparison to help readers understand the concept`,
    };
    return suggestions[type] || 'Consider adding supporting content';
  }

  /**
   * Extracts keywords from context
   */
  private extractKeywords(context: string): string[] {
    const words = this.tokenize(context);
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
      'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'this',
      'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their',
    ]);

    return words
      .filter(word => word.length > 3 && !stopWords.has(word))
      .slice(0, 5);
  }

  /**
   * Counts opportunities by type
   */
  private countByType(
    opportunities: EnrichmentOpportunity[]
  ): Record<EnrichmentOpportunityType, number> {
    const counts: Record<EnrichmentOpportunityType, number> = {
      'example': 0,
      'statistic': 0,
      'citation': 0,
      'definition': 0,
      'case-study': 0,
      'data-point': 0,
      'quote': 0,
      'comparison': 0,
    };

    for (const opp of opportunities) {
      counts[opp.type]++;
    }

    return counts;
  }

  /**
   * Counts opportunities by priority
   */
  private countByPriority(
    opportunities: EnrichmentOpportunity[]
  ): Record<EnrichmentPriority, number> {
    const counts: Record<EnrichmentPriority, number> = {
      'low': 0,
      'medium': 0,
      'high': 0,
      'critical': 0,
    };

    for (const opp of opportunities) {
      counts[opp.priority]++;
    }

    return counts;
  }

  /**
   * Calculates enrichment potential score
   */
  private calculateEnrichmentPotential(
    opportunities: EnrichmentOpportunity[],
    wordCount: number
  ): number {
    if (opportunities.length === 0) return 0;

    // Base score from opportunity density
    const density = (opportunities.length / wordCount) * 1000;
    let score = Math.min(50, density * 10);

    // Add points for high-priority opportunities
    const priorityWeights = { critical: 10, high: 5, medium: 2, low: 1 };
    for (const opp of opportunities) {
      score += priorityWeights[opp.priority];
    }

    return Math.min(100, Math.round(score));
  }

  /**
   * Generates recommendations based on opportunities
   */
  private generateOpportunityRecommendations(
    opportunities: EnrichmentOpportunity[],
    byType: Record<EnrichmentOpportunityType, number>
  ): string[] {
    const recommendations: string[] = [];

    if (byType.citation > 0) {
      recommendations.push(
        `Add ${byType.citation} citation(s) to support claims and increase credibility`
      );
    }

    if (byType.statistic > 0) {
      recommendations.push(
        `Include ${byType.statistic} statistic(s) to strengthen arguments with data`
      );
    }

    if (byType.example > 0) {
      recommendations.push(
        `Add ${byType.example} example(s) to make concepts more concrete`
      );
    }

    if (byType['data-point'] > 0) {
      recommendations.push(
        `Replace ${byType['data-point']} vague statement(s) with specific data`
      );
    }

    const criticalCount = opportunities.filter(o => o.priority === 'critical').length;
    if (criticalCount > 0) {
      recommendations.unshift(
        `Address ${criticalCount} critical enrichment opportunity(ies) first`
      );
    }

    return recommendations;
  }

  /**
   * Creates empty opportunity result for short texts
   */
  private createEmptyOpportunityResult(
    id: string,
    text: string,
    wordCount: number,
    startTime: number
  ): OpportunityIdentificationResult {
    return {
      id,
      originalText: text,
      wordCount,
      opportunities: [],
      totalOpportunities: 0,
      opportunitiesByType: {
        'example': 0, 'statistic': 0, 'citation': 0, 'definition': 0,
        'case-study': 0, 'data-point': 0, 'quote': 0, 'comparison': 0,
      },
      opportunitiesByPriority: { 'low': 0, 'medium': 0, 'high': 0, 'critical': 0 },
      enrichmentPotential: 0,
      recommendations: ['Text is too short for meaningful enrichment analysis'],
      timestamp: new Date(),
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Adds citations to text
   * Requirement 105: Build citation addition system
   * @param request - Citation addition request
   * @returns Citation addition result
   */
  async addCitations(request: CitationAdditionRequest): Promise<CitationAdditionResult> {
    const startTime = Date.now();
    const id = this.generateId('cit');
    const { text, format, topic, maxCitations = 5, minRelevance = 0.6 } = request;

    const citations: Citation[] = [];
    const citationPositions: CitationPosition[] = [];
    let enrichedText = text;

    // Find positions where citations should be added
    const citationOpportunities = await this.findCitationOpportunities(text);

    // Limit to maxCitations
    const opportunitiesToProcess = citationOpportunities.slice(0, maxCitations);

    // Generate and add citations
    let citationNumber = 1;
    let positionOffset = 0;

    for (const opportunity of opportunitiesToProcess) {
      const citation = this.generateCitation(format, topic, citationNumber);
      
      if (citation.relevance >= minRelevance) {
        citations.push(citation);

        // Create in-text citation
        const inTextCitation = this.formatInTextCitation(citation, format, citationNumber);
        
        // Insert citation into text
        const insertPosition = opportunity.endPosition + positionOffset;
        enrichedText = 
          enrichedText.substring(0, insertPosition) + 
          ` ${inTextCitation}` + 
          enrichedText.substring(insertPosition);

        citationPositions.push({
          citationId: citation.id,
          position: insertPosition,
          inTextCitation,
          sentence: opportunity.segment,
        });

        positionOffset += inTextCitation.length + 1;
        citationNumber++;
      }
    }

    // Generate bibliography
    const bibliography = this.generateBibliography(citations, format);

    return {
      id,
      originalText: text,
      enrichedText,
      citations,
      citationPositions,
      totalCitationsAdded: citations.length,
      bibliography,
      timestamp: new Date(),
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Finds opportunities for citation insertion
   */
  private async findCitationOpportunities(text: string): Promise<EnrichmentOpportunity[]> {
    const result = await this.identifyOpportunities(text);
    return result.opportunities.filter(o => o.type === 'citation');
  }

  /**
   * Generates a citation
   */
  private generateCitation(
    format: CitationFormat,
    topic: string | undefined,
    number: number
  ): Citation {
    // In production, this would query a citation database or API
    const sampleCitation = SAMPLE_CITATIONS[number % SAMPLE_CITATIONS.length];
    
    if (!sampleCitation) {
      return this.createDefaultCitation(format, topic, number);
    }

    const citation: Citation = {
      id: this.generateId('cit_item'),
      formattedCitation: '',
      format,
      title: sampleCitation.title,
      authors: sampleCitation.authors,
      year: sampleCitation.year,
      publication: sampleCitation.publication,
      publisher: sampleCitation.publisher,
      volume: sampleCitation.volume,
      issue: sampleCitation.issue,
      pages: sampleCitation.pages,
      relevance: 0.8 + Math.random() * 0.2,
      verified: true,
    };

    citation.formattedCitation = this.formatFullCitation(citation, format);
    return citation;
  }

  /**
   * Creates a default citation when no sample is available
   */
  private createDefaultCitation(
    format: CitationFormat,
    topic: string | undefined,
    number: number
  ): Citation {
    const citation: Citation = {
      id: this.generateId('cit_item'),
      formattedCitation: '',
      format,
      title: topic ? `Research on ${topic}` : `Academic Source ${number}`,
      authors: ['Author, A.'],
      year: 2023,
      publication: 'Academic Journal',
      relevance: 0.7,
      verified: false,
    };

    citation.formattedCitation = this.formatFullCitation(citation, format);
    return citation;
  }

  /**
   * Formats in-text citation based on format
   */
  private formatInTextCitation(
    citation: Citation,
    format: CitationFormat,
    number: number
  ): string {
    const firstAuthor = citation.authors[0]?.split(',')[0] || 'Author';

    switch (format) {
      case 'APA':
        return `(${firstAuthor}, ${citation.year})`;
      case 'MLA':
        return `(${firstAuthor} ${citation.pages || ''})`.trim() + ')';
      case 'Chicago':
        return `[${number}]`;
      case 'Harvard':
        return `(${firstAuthor} ${citation.year})`;
      case 'IEEE':
        return `[${number}]`;
      case 'Vancouver':
        return `(${number})`;
      default:
        return `(${firstAuthor}, ${citation.year})`;
    }
  }

  /**
   * Formats full citation for bibliography
   */
  private formatFullCitation(citation: Citation, format: CitationFormat): string {
    const authors = citation.authors.join(', ');

    switch (format) {
      case 'APA':
        return `${authors} (${citation.year}). ${citation.title}. ${citation.publication || citation.publisher || ''}.`;
      case 'MLA':
        return `${authors}. "${citation.title}." ${citation.publication || citation.publisher || ''}, ${citation.year}.`;
      case 'Chicago':
        return `${authors}. "${citation.title}." ${citation.publication || citation.publisher || ''} (${citation.year}).`;
      case 'Harvard':
        return `${authors} (${citation.year}) '${citation.title}', ${citation.publication || citation.publisher || ''}.`;
      case 'IEEE':
        return `${authors}, "${citation.title}," ${citation.publication || citation.publisher || ''}, ${citation.year}.`;
      case 'Vancouver':
        return `${authors}. ${citation.title}. ${citation.publication || citation.publisher || ''}; ${citation.year}.`;
      default:
        return `${authors} (${citation.year}). ${citation.title}.`;
    }
  }

  /**
   * Generates bibliography section
   */
  private generateBibliography(citations: Citation[], format: CitationFormat): string {
    if (citations.length === 0) return '';

    const header = format === 'APA' ? 'References' : 
                   format === 'MLA' ? 'Works Cited' : 
                   'Bibliography';

    const entries = citations
      .map((c, i) => `${format === 'IEEE' || format === 'Chicago' ? `[${i + 1}] ` : ''}${c.formattedCitation}`)
      .join('\n');

    return `\n\n${header}\n${'='.repeat(header.length)}\n${entries}`;
  }

  /**
   * Inserts statistics into text
   * Requirement 105: Implement statistics insertion with verification
   * @param request - Statistics insertion request
   * @returns Statistics insertion result
   */
  async insertStatistics(request: StatisticsInsertionRequest): Promise<StatisticsInsertionResult> {
    const startTime = Date.now();
    const id = this.generateId('stat');
    const { 
      text, 
      topic, 
      maxStatistics = 5, 
      verifyStatistics = true,
      minConfidence = 0.7,
      categories = [],
    } = request;

    const statistics: Statistic[] = [];
    const statisticPositions: StatisticPosition[] = [];
    let enrichedText = text;

    // Find opportunities for statistics
    const opportunities = await this.findStatisticOpportunities(text);
    const opportunitiesToProcess = opportunities.slice(0, maxStatistics);

    // Find relevant statistics
    const relevantStats = this.findRelevantStatistics(topic, categories, minConfidence);

    let positionOffset = 0;
    let statIndex = 0;

    for (const opportunity of opportunitiesToProcess) {
      if (statIndex >= relevantStats.length) break;

      const stat = relevantStats[statIndex];
      if (!stat) continue;

      // Verify statistic if requested
      if (verifyStatistics) {
        stat.verified = this.verifyStatistic(stat);
      }

      statistics.push(stat);

      // Format and insert statistic
      const formattedStat = this.formatStatistic(stat);
      const insertPosition = opportunity.endPosition + positionOffset;

      enrichedText = 
        enrichedText.substring(0, insertPosition) + 
        ` ${formattedStat}` + 
        enrichedText.substring(insertPosition);

      statisticPositions.push({
        statisticId: stat.id,
        position: insertPosition,
        formattedStatistic: formattedStat,
        context: opportunity.context,
      });

      positionOffset += formattedStat.length + 1;
      statIndex++;
    }

    // Generate verification summary
    const verificationSummary = this.generateVerificationSummary(statistics);

    return {
      id,
      originalText: text,
      enrichedText,
      statistics,
      statisticPositions,
      totalStatisticsInserted: statistics.length,
      verificationSummary,
      timestamp: new Date(),
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Finds opportunities for statistic insertion
   */
  private async findStatisticOpportunities(text: string): Promise<EnrichmentOpportunity[]> {
    const result = await this.identifyOpportunities(text);
    return result.opportunities.filter(
      o => o.type === 'statistic' || o.type === 'data-point'
    );
  }

  /**
   * Finds relevant statistics based on topic and categories
   */
  private findRelevantStatistics(
    topic: string | undefined,
    categories: string[],
    minConfidence: number
  ): Statistic[] {
    let stats = [...SAMPLE_STATISTICS];

    // Filter by confidence
    stats = stats.filter(s => s.confidence >= minConfidence);

    // Filter by categories if specified
    if (categories.length > 0) {
      stats = stats.filter(s => categories.includes(s.category));
    }

    // Filter by topic keywords if specified
    if (topic) {
      const topicWords = this.tokenize(topic);
      stats = stats.filter(s => 
        s.keywords.some(k => topicWords.includes(k.toLowerCase()))
      );
    }

    // If no matches, return all stats that meet confidence threshold
    if (stats.length === 0) {
      stats = SAMPLE_STATISTICS.filter(s => s.confidence >= minConfidence);
    }

    return stats;
  }

  /**
   * Verifies a statistic (simulated verification)
   */
  private verifyStatistic(stat: Statistic): boolean {
    // In production, this would verify against external sources
    // For now, we check if the statistic has required fields
    return !!(
      stat.value &&
      stat.source &&
      stat.year &&
      stat.year >= 2020 && // Recent data
      stat.confidence >= 0.7
    );
  }

  /**
   * Formats a statistic for insertion
   */
  private formatStatistic(stat: Statistic): string {
    return `(${stat.value} ${stat.description} - ${stat.source}, ${stat.year})`;
  }

  /**
   * Generates verification summary
   */
  private generateVerificationSummary(statistics: Statistic[]): VerificationSummary {
    const verified = statistics.filter(s => s.verified).length;
    const unverified = statistics.length - verified;

    const issues = statistics
      .filter(s => !s.verified)
      .map(s => ({
        statisticId: s.id,
        issue: 'Could not verify statistic from original source',
        severity: 'warning' as const,
        suggestion: 'Consider verifying this statistic manually before publishing',
      }));

    return {
      totalChecked: statistics.length,
      verified,
      unverified,
      issues,
    };
  }

  /**
   * Marks content for user review
   * Requirement 105: Add content marking for user review
   * @param request - Content marking request
   * @returns Content marking result
   */
  async markContentForReview(request: ContentMarkingRequest): Promise<ContentMarkingResult> {
    const startTime = Date.now();
    const id = this.generateId('mark');
    const { text, opportunities, autoApplyLowRisk = false } = request;

    const markedItems: MarkedContent[] = [];
    let markedText = text;
    let autoApplied = 0;
    let pendingReview = 0;
    let positionOffset = 0;

    // Sort opportunities by position (reverse order for easier insertion)
    const sortedOpportunities = [...opportunities].sort((a, b) => b.position - a.position);

    for (const opportunity of sortedOpportunities) {
      const enrichedText = this.generateEnrichedText(opportunity);
      const shouldAutoApply = autoApplyLowRisk && 
        opportunity.priority === 'low' && 
        opportunity.confidence >= 0.9;

      const markedContent: MarkedContent = {
        id: this.generateId('marked_item'),
        position: opportunity.position,
        endPosition: opportunity.endPosition,
        originalText: opportunity.segment,
        enrichedText,
        enrichmentType: opportunity.type,
        status: shouldAutoApply ? 'applied' : 'pending',
        reason: opportunity.reason,
        markedAt: new Date(),
      };

      markedItems.push(markedContent);

      if (shouldAutoApply) {
        // Apply the enrichment directly
        markedText = this.applyEnrichment(markedText, opportunity, enrichedText, positionOffset);
        positionOffset += enrichedText.length - opportunity.segment.length;
        autoApplied++;
      } else {
        // Mark for review with visual indicators
        markedText = this.markForReview(markedText, opportunity, enrichedText, positionOffset);
        positionOffset += this.getMarkupLength(enrichedText);
        pendingReview++;
      }
    }

    return {
      id,
      originalText: text,
      markedText,
      markedItems: markedItems.reverse(), // Return in original order
      totalMarked: markedItems.length,
      autoApplied,
      pendingReview,
      timestamp: new Date(),
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Generates enriched text for an opportunity
   */
  private generateEnrichedText(opportunity: EnrichmentOpportunity): string {
    switch (opportunity.type) {
      case 'example':
        return `${opportunity.segment} (for example, [INSERT SPECIFIC EXAMPLE])`;
      case 'statistic':
        return `${opportunity.segment} [INSERT RELEVANT STATISTIC]`;
      case 'citation':
        return `${opportunity.segment} [CITATION NEEDED]`;
      case 'definition':
        return `${opportunity.segment} (defined as [INSERT DEFINITION])`;
      case 'data-point':
        return `[REPLACE WITH SPECIFIC DATA: ${opportunity.segment}]`;
      case 'quote':
        return `${opportunity.segment} [INSERT EXPERT QUOTE]`;
      case 'comparison':
        return `${opportunity.segment} (compared to [INSERT COMPARISON])`;
      case 'case-study':
        return `${opportunity.segment} [INSERT CASE STUDY REFERENCE]`;
      default:
        return opportunity.segment;
    }
  }

  /**
   * Applies enrichment to text
   */
  private applyEnrichment(
    text: string,
    opportunity: EnrichmentOpportunity,
    enrichedText: string,
    offset: number
  ): string {
    const start = opportunity.position + offset;
    const end = opportunity.endPosition + offset;
    return text.substring(0, start) + enrichedText + text.substring(end);
  }

  /**
   * Marks text for review with visual indicators
   */
  private markForReview(
    text: string,
    opportunity: EnrichmentOpportunity,
    enrichedText: string,
    offset: number
  ): string {
    const start = opportunity.position + offset;
    const end = opportunity.endPosition + offset;
    const marker = `[[REVIEW:${opportunity.type.toUpperCase()}]] ${enrichedText} [[/REVIEW]]`;
    return text.substring(0, start) + marker + text.substring(end);
  }

  /**
   * Gets the length of markup added
   */
  private getMarkupLength(enrichedText: string): number {
    // Account for [[REVIEW:TYPE]] and [[/REVIEW]] markers
    return enrichedText.length + 30; // Approximate markup length
  }

  /**
   * Applies review decisions to marked content
   * @param originalText - Original text
   * @param markedItems - Marked content items
   * @param decisions - Review decisions
   * @returns Review application result
   */
  async applyReviewDecisions(
    originalText: string,
    markedItems: MarkedContent[],
    decisions: ReviewDecision[]
  ): Promise<ReviewApplicationResult> {
    const id = this.generateId('review');
    let finalText = originalText;
    let approved = 0;
    let rejected = 0;
    let modified = 0;

    // Create a map of decisions by marked content ID
    const decisionMap = new Map(decisions.map(d => [d.markedContentId, d]));

    // Sort items by position (reverse order for easier replacement)
    const sortedItems = [...markedItems].sort((a, b) => b.position - a.position);

    for (const item of sortedItems) {
      const decision = decisionMap.get(item.id);
      
      if (!decision) continue;

      if (decision.decision === 'approve') {
        const textToInsert = decision.modifiedText || item.enrichedText;
        finalText = 
          finalText.substring(0, item.position) + 
          textToInsert + 
          finalText.substring(item.endPosition);
        
        if (decision.modifiedText) {
          modified++;
        } else {
          approved++;
        }
        
        item.status = 'approved';
        item.reviewedAt = new Date();
        item.notes = decision.notes;
      } else {
        // Rejected - keep original text
        rejected++;
        item.status = 'rejected';
        item.reviewedAt = new Date();
        item.notes = decision.notes;
      }
    }

    return {
      id,
      finalText,
      decisionsApplied: decisions.length,
      approved,
      rejected,
      modified,
      timestamp: new Date(),
    };
  }

  /**
   * Performs comprehensive content enrichment
   * @param request - Comprehensive enrichment request
   * @returns Comprehensive enrichment result
   */
  async enrichComprehensive(
    request: ComprehensiveEnrichmentRequest
  ): Promise<ComprehensiveEnrichmentResult> {
    const startTime = Date.now();
    const id = this.generateId('enrich');
    const {
      text,
      topic,
      citationFormat = this.config.defaultCitationFormat,
      maxEnrichments = this.config.defaultMaxEnrichments,
      enrichmentTypes,
      verify = this.config.defaultVerify,
      markForReview = true,
    } = request;

    // Step 1: Identify opportunities
    const opportunityResult = await this.identifyOpportunities(text);

    // Filter opportunities by type if specified
    let filteredOpportunities = opportunityResult.opportunities;
    if (enrichmentTypes && enrichmentTypes.length > 0) {
      filteredOpportunities = filteredOpportunities.filter(
        o => enrichmentTypes.includes(o.type)
      );
    }

    // Limit to maxEnrichments
    filteredOpportunities = filteredOpportunities.slice(0, maxEnrichments);

    let enrichedText = text;
    let citationResult: CitationAdditionResult | undefined;
    let statisticsResult: StatisticsInsertionResult | undefined;
    let markingResult: ContentMarkingResult | undefined;

    // Step 2: Add citations if needed
    const citationOpportunities = filteredOpportunities.filter(o => o.type === 'citation');
    if (citationOpportunities.length > 0) {
      citationResult = await this.addCitations({
        text: enrichedText,
        format: citationFormat,
        topic,
        maxCitations: citationOpportunities.length,
        verifyCitations: verify,
      });
      enrichedText = citationResult.enrichedText;
    }

    // Step 3: Insert statistics if needed
    const statisticOpportunities = filteredOpportunities.filter(
      o => o.type === 'statistic' || o.type === 'data-point'
    );
    if (statisticOpportunities.length > 0) {
      statisticsResult = await this.insertStatistics({
        text: enrichedText,
        topic,
        maxStatistics: statisticOpportunities.length,
        verifyStatistics: verify,
      });
      enrichedText = statisticsResult.enrichedText;
    }

    // Step 4: Mark remaining opportunities for review
    const remainingOpportunities = filteredOpportunities.filter(
      o => o.type !== 'citation' && o.type !== 'statistic' && o.type !== 'data-point'
    );
    if (markForReview && remainingOpportunities.length > 0) {
      markingResult = await this.markContentForReview({
        text: enrichedText,
        opportunities: remainingOpportunities,
        autoApplyLowRisk: false,
      });
      enrichedText = markingResult.markedText;
    }

    // Calculate summary
    const summary = this.calculateEnrichmentSummary(
      text,
      enrichedText,
      citationResult,
      statisticsResult,
      markingResult
    );

    // Calculate overall enrichment score
    const enrichmentScore = this.calculateEnrichmentScore(
      opportunityResult,
      citationResult,
      statisticsResult
    );

    return {
      id,
      originalText: text,
      enrichedText,
      opportunityResult,
      citationResult,
      statisticsResult,
      markingResult,
      enrichmentScore,
      summary,
      timestamp: new Date(),
      totalProcessingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Calculates enrichment summary
   */
  private calculateEnrichmentSummary(
    originalText: string,
    enrichedText: string,
    citationResult?: CitationAdditionResult,
    statisticsResult?: StatisticsInsertionResult,
    markingResult?: ContentMarkingResult
  ): EnrichmentSummary {
    const originalWordCount = this.countWords(originalText);
    const enrichedWordCount = this.countWords(enrichedText);
    const wordCountChange = enrichedWordCount - originalWordCount;

    const byType: Record<EnrichmentOpportunityType, number> = {
      'example': 0,
      'statistic': statisticsResult?.totalStatisticsInserted || 0,
      'citation': citationResult?.totalCitationsAdded || 0,
      'definition': 0,
      'case-study': 0,
      'data-point': 0,
      'quote': 0,
      'comparison': 0,
    };

    // Count marked items by type
    if (markingResult) {
      for (const item of markingResult.markedItems) {
        byType[item.enrichmentType]++;
      }
    }

    const totalEnrichments = Object.values(byType).reduce((a, b) => a + b, 0);

    return {
      totalEnrichments,
      byType,
      citationsAdded: citationResult?.totalCitationsAdded || 0,
      statisticsAdded: statisticsResult?.totalStatisticsInserted || 0,
      examplesAdded: byType.example,
      wordCountChange,
      percentageIncrease: originalWordCount > 0 
        ? Math.round((wordCountChange / originalWordCount) * 100) 
        : 0,
    };
  }

  /**
   * Calculates overall enrichment score
   */
  private calculateEnrichmentScore(
    opportunityResult: OpportunityIdentificationResult,
    citationResult?: CitationAdditionResult,
    statisticsResult?: StatisticsInsertionResult
  ): number {
    let score = 0;

    // Base score from enrichment potential
    score += opportunityResult.enrichmentPotential * 0.3;

    // Points for citations added
    if (citationResult) {
      score += Math.min(30, citationResult.totalCitationsAdded * 10);
    }

    // Points for statistics added
    if (statisticsResult) {
      score += Math.min(30, statisticsResult.totalStatisticsInserted * 10);
      
      // Bonus for verified statistics
      const verifiedRatio = statisticsResult.verificationSummary.verified / 
        Math.max(1, statisticsResult.verificationSummary.totalChecked);
      score += verifiedRatio * 10;
    }

    return Math.min(100, Math.round(score));
  }
}
