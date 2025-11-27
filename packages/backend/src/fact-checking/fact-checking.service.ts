/**
 * Fact-Checking Service
 * Verifies factual claims against reliable sources
 * Requirements: 110
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import crypto from 'crypto';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import {
  FactualClaim,
  ClaimType,
  VerificationStatus,
  ConfidenceLevel,
  VerificationSource,
  FactSourceType,
  ClaimVerification,
  CorrectionSuggestion,
  VerificationReport,
  ReportSummary,
  FlaggedStatement,
  AnnotatedFactCheckText,
  FactCheckAnnotation,
  FactCheckOptions,
  FactCheckServiceConfig,
  WikipediaSearchResponse,
} from './types';

/** Default timeout for fact-checking (30 seconds) */
const DEFAULT_TIMEOUT = 30000;

/** Default confidence threshold (60%) */
const DEFAULT_CONFIDENCE_THRESHOLD = 60;

/** Maximum claims per request */
const DEFAULT_MAX_CLAIMS = 50;

/** High confidence threshold */
const HIGH_CONFIDENCE_THRESHOLD = 80;

/** Medium confidence threshold */
const MEDIUM_CONFIDENCE_THRESHOLD = 50;

/**
 * Fact-Checking Service class
 * Handles verification of factual claims against reliable sources
 */
export class FactCheckingService {
  private config: FactCheckServiceConfig;
  private wikipediaClient: AxiosInstance;

  constructor(serviceConfig?: Partial<FactCheckServiceConfig>) {
    this.config = this.buildConfig(serviceConfig);
    this.wikipediaClient = this.initializeWikipediaClient();
  }

  /**
   * Builds the service configuration
   */
  private buildConfig(overrides?: Partial<FactCheckServiceConfig>): FactCheckServiceConfig {
    return {
      defaultConfidenceThreshold: overrides?.defaultConfidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD,
      defaultTimeout: overrides?.defaultTimeout ?? DEFAULT_TIMEOUT,
      maxClaimsPerRequest: overrides?.maxClaimsPerRequest ?? DEFAULT_MAX_CLAIMS,
      providers: {
        wikipedia: {
          baseUrl: 'https://en.wikipedia.org/w/api.php',
          enabled: true,
          timeout: DEFAULT_TIMEOUT,
          ...overrides?.providers?.wikipedia,
        },
        googleFactCheck: {
          apiKey: config.externalApis?.googleFactCheck ?? '',
          baseUrl: 'https://factchecktools.googleapis.com/v1alpha1',
          enabled: !!config.externalApis?.googleFactCheck,
          timeout: DEFAULT_TIMEOUT,
          ...overrides?.providers?.googleFactCheck,
        },
      },
    };
  }

  /**
   * Initializes Wikipedia API client
   */
  private initializeWikipediaClient(): AxiosInstance {
    return axios.create({
      baseURL: this.config.providers.wikipedia.baseUrl,
      timeout: this.config.providers.wikipedia.timeout,
      params: {
        format: 'json',
        origin: '*',
      },
    });
  }

  /**
   * Verifies factual claims in text
   * Requirement 110.1: Verify factual claims against reliable sources
   * @param text - Text to fact-check
   * @param options - Fact-check options
   * @returns Verification report
   */
  async verifyText(text: string, options?: FactCheckOptions): Promise<VerificationReport> {
    const startTime = Date.now();
    const reportId = this.generateReportId();

    // Extract claims from text
    const claims = this.extractClaims(text, options);
    const maxClaims = options?.maxClaims ?? this.config.maxClaimsPerRequest;
    const claimsToVerify = claims.slice(0, maxClaims);

    // Verify each claim
    const claimVerifications: ClaimVerification[] = [];
    for (const claim of claimsToVerify) {
      const verification = await this.verifyClaim(claim, options);
      claimVerifications.push(verification);
    }

    // Calculate statistics
    const verifiedClaims = claimVerifications.filter(v => v.status === 'verified').length;
    const inaccurateClaims = claimVerifications.filter(v => v.status === 'false' || v.status === 'disputed').length;
    const unverifiableClaims = claimVerifications.filter(v => v.status === 'unverified' || v.status === 'needs_review').length;

    // Calculate accuracy score
    const accuracyScore = claimVerifications.length > 0
      ? Math.round((verifiedClaims / claimVerifications.length) * 100)
      : 100;

    // Generate summary
    const summary = this.generateSummary(claimVerifications, accuracyScore);

    return {
      id: reportId,
      originalText: text,
      totalClaims: claimVerifications.length,
      verifiedClaims,
      inaccurateClaims,
      unverifiableClaims,
      accuracyScore,
      claimVerifications,
      timestamp: new Date(),
      processingTimeMs: Date.now() - startTime,
      summary,
    };
  }

  /**
   * Extracts factual claims from text
   * @param text - Text to analyze
   * @param options - Options for extraction
   * @returns Array of extracted claims
   */
  extractClaims(text: string, options?: FactCheckOptions): FactualClaim[] {
    const claims: FactualClaim[] = [];
    const sentences = this.splitIntoSentences(text);
    const claimTypes = options?.claimTypes;

    for (const sentence of sentences) {
      const claimType = this.detectClaimType(sentence);
      
      // Skip if claim type filter is specified and doesn't match
      if (claimTypes && claimTypes.length > 0 && !claimTypes.includes(claimType)) {
        continue;
      }

      // Check if sentence contains a verifiable claim
      if (this.isVerifiableClaim(sentence)) {
        const startPosition = text.indexOf(sentence);
        const claim: FactualClaim = {
          id: this.generateClaimId(),
          text: sentence,
          startPosition,
          endPosition: startPosition + sentence.length,
          claimType,
          entities: this.extractEntities(sentence),
          keywords: this.extractKeywords(sentence),
        };
        claims.push(claim);
      }
    }

    return claims;
  }

  /**
   * Verifies a single claim
   * Requirement 110.1: Verify factual claims against reliable sources
   * @param claim - Claim to verify
   * @param options - Verification options
   * @returns Claim verification result
   */
  async verifyClaim(claim: FactualClaim, options?: FactCheckOptions): Promise<ClaimVerification> {
    const sources: VerificationSource[] = [];
    let status: VerificationStatus = 'unverified';
    let confidenceScore = 0;
    let explanation = '';

    try {
      // Search Wikipedia for relevant information
      const wikiResults = await this.searchWikipedia(claim.keywords.join(' '));
      
      if (wikiResults.length > 0) {
        for (const result of wikiResults.slice(0, 3)) {
          sources.push({
            id: this.generateSourceId(),
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(result.title.replace(/ /g, '_'))}`,
            title: result.title,
            type: 'encyclopedia',
            credibilityScore: 85,
            excerpt: result.snippet,
          });
        }

        // Analyze claim against sources
        const analysis = this.analyzeClaimAgainstSources(claim, sources);
        status = analysis.status;
        confidenceScore = analysis.confidence;
        explanation = analysis.explanation;
      } else {
        status = 'needs_review';
        confidenceScore = 0;
        explanation = 'No reliable sources found to verify this claim. Manual verification recommended.';
      }
    } catch (error) {
      logger.warn('Claim verification failed:', error);
      status = 'needs_review';
      confidenceScore = 0;
      explanation = 'Verification failed due to an error. Manual review required.';
    }

    const confidenceLevel = this.getConfidenceLevel(confidenceScore);
    const needsManualReview = status === 'needs_review' || status === 'unverified' || confidenceScore < (options?.confidenceThreshold ?? this.config.defaultConfidenceThreshold);

    // Generate correction suggestion if claim is false
    let suggestedCorrection: CorrectionSuggestion | undefined;
    if ((status === 'false' || status === 'disputed') && options?.generateCorrections !== false && sources.length > 0) {
      suggestedCorrection = this.generateCorrection(claim, sources);
    }

    return {
      claim,
      status,
      confidenceScore,
      confidenceLevel,
      sources,
      explanation,
      suggestedCorrection,
      needsManualReview,
    };
  }

  /**
   * Flags inaccurate statements in text
   * Requirement 110.2: Flag questionable statements and provide source links
   * @param report - Verification report
   * @returns Array of flagged statements
   */
  flagInaccuracies(report: VerificationReport): FlaggedStatement[] {
    const flagged: FlaggedStatement[] = [];

    for (const verification of report.claimVerifications) {
      if (verification.status === 'false') {
        flagged.push({
          verification,
          severity: 'critical',
          actionRequired: 'This claim appears to be inaccurate. Review and correct before publishing.',
        });
      } else if (verification.status === 'disputed') {
        flagged.push({
          verification,
          severity: 'warning',
          actionRequired: 'This claim is disputed. Consider adding context or alternative viewpoints.',
        });
      } else if (verification.status === 'needs_review') {
        flagged.push({
          verification,
          severity: 'info',
          actionRequired: 'This claim could not be automatically verified. Manual review recommended.',
        });
      } else if (verification.status === 'unverified' && verification.confidenceScore < 50) {
        flagged.push({
          verification,
          severity: 'info',
          actionRequired: 'Low confidence in verification. Consider adding citations.',
        });
      }
    }

    return flagged;
  }

  /**
   * Generates correction suggestions for inaccurate claims
   * Requirement 110.4: Provide accurate alternatives with citations
   * @param claim - Original claim
   * @param sources - Verification sources
   * @returns Correction suggestion
   */
  generateCorrection(claim: FactualClaim, sources: VerificationSource[]): CorrectionSuggestion | undefined {
    if (sources.length === 0) {
      return undefined;
    }

    const primarySource = sources[0]!;
    
    // Generate a corrected version based on source information
    const correctedText = this.generateCorrectedText(claim, primarySource);
    const citation = this.formatCitation(primarySource);

    return {
      originalText: claim.text,
      correctedText,
      citation,
      source: primarySource,
      confidence: primarySource.credibilityScore,
    };
  }

  /**
   * Generates annotated text with fact-check highlights
   * @param text - Original text
   * @param report - Verification report
   * @returns Annotated text
   */
  highlightClaims(text: string, report: VerificationReport): AnnotatedFactCheckText {
    if (report.claimVerifications.length === 0) {
      return {
        originalText: text,
        highlightedHtml: text,
        highlightedMarkdown: text,
        annotations: [],
        totalFlagged: 0,
      };
    }

    // Sort verifications by position (descending for easier replacement)
    const sortedVerifications = [...report.claimVerifications].sort(
      (a, b) => b.claim.startPosition - a.claim.startPosition
    );

    const annotations: FactCheckAnnotation[] = [];
    let highlightedHtml = text;
    let highlightedMarkdown = text;
    let totalFlagged = 0;

    for (const verification of sortedVerifications) {
      const color = this.getStatusColor(verification.status);
      const tooltip = `${verification.status}: ${verification.explanation} (${verification.confidenceScore}% confidence)`;

      if (verification.status !== 'verified') {
        totalFlagged++;
      }

      annotations.push({
        claimId: verification.claim.id,
        start: verification.claim.startPosition,
        end: verification.claim.endPosition,
        color,
        tooltip,
        status: verification.status,
      });

      // HTML highlighting
      const htmlHighlight = `<span class="fact-check ${color}" title="${tooltip}" data-claim-id="${verification.claim.id}">${verification.claim.text}</span>`;
      highlightedHtml =
        highlightedHtml.substring(0, verification.claim.startPosition) +
        htmlHighlight +
        highlightedHtml.substring(verification.claim.endPosition);

      // Markdown highlighting
      const statusIcon = this.getStatusIcon(verification.status);
      const mdHighlight = `${statusIcon} ${verification.claim.text}`;
      highlightedMarkdown =
        highlightedMarkdown.substring(0, verification.claim.startPosition) +
        mdHighlight +
        highlightedMarkdown.substring(verification.claim.endPosition);
    }

    // Sort annotations by start position (ascending)
    annotations.sort((a, b) => a.start - b.start);

    return {
      originalText: text,
      highlightedHtml,
      highlightedMarkdown,
      annotations,
      totalFlagged,
    };
  }

  /**
   * Generates a verification report summary
   * Requirement 110.5: Generate verification report with confidence scores
   */
  private generateSummary(verifications: ClaimVerification[], accuracyScore: number): ReportSummary {
    const falseClaims = verifications.filter(v => v.status === 'false');
    const disputedClaims = verifications.filter(v => v.status === 'disputed');
    const unverifiedClaims = verifications.filter(v => v.status === 'unverified' || v.status === 'needs_review');

    const keyFindings: string[] = [];
    const recommendations: string[] = [];

    if (falseClaims.length > 0) {
      keyFindings.push(`${falseClaims.length} claim(s) appear to be inaccurate and require correction.`);
      recommendations.push('Review and correct inaccurate claims before publishing.');
    }

    if (disputedClaims.length > 0) {
      keyFindings.push(`${disputedClaims.length} claim(s) are disputed and may need additional context.`);
      recommendations.push('Consider adding alternative viewpoints for disputed claims.');
    }

    if (unverifiedClaims.length > 0) {
      keyFindings.push(`${unverifiedClaims.length} claim(s) could not be automatically verified.`);
      recommendations.push('Manually verify unverified claims or add citations.');
    }

    if (keyFindings.length === 0) {
      keyFindings.push('All claims appear to be accurate based on available sources.');
    }

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high';
    if (falseClaims.length > 0 || accuracyScore < 50) {
      riskLevel = 'high';
    } else if (disputedClaims.length > 0 || unverifiedClaims.length > verifications.length * 0.3) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }

    const overview = `Analyzed ${verifications.length} factual claim(s). Accuracy score: ${accuracyScore}%. Risk level: ${riskLevel}.`;

    return {
      overview,
      keyFindings,
      recommendations,
      riskLevel,
    };
  }

  // ============ Wikipedia Integration ============

  /**
   * Searches Wikipedia for relevant information
   */
  private async searchWikipedia(query: string): Promise<Array<{ title: string; snippet: string }>> {
    try {
      const response = await this.wikipediaClient.get<WikipediaSearchResponse>('', {
        params: {
          action: 'query',
          list: 'search',
          srsearch: query,
          srlimit: 5,
        },
      });

      return response.data.query?.search?.map(result => ({
        title: result.title,
        snippet: this.stripHtml(result.snippet),
      })) ?? [];
    } catch (error) {
      logger.warn('Wikipedia search failed:', error);
      return [];
    }
  }

  // ============ Claim Analysis ============

  /**
   * Analyzes a claim against sources
   */
  private analyzeClaimAgainstSources(
    claim: FactualClaim,
    sources: VerificationSource[]
  ): { status: VerificationStatus; confidence: number; explanation: string } {
    if (sources.length === 0) {
      return {
        status: 'unverified',
        confidence: 0,
        explanation: 'No sources found to verify this claim.',
      };
    }

    // Check if claim keywords appear in source excerpts
    const claimKeywords = claim.keywords.map(k => k.toLowerCase());
    let matchScore = 0;
    let matchingSource: VerificationSource | undefined;

    for (const source of sources) {
      const excerpt = (source.excerpt ?? '').toLowerCase();
      const title = source.title.toLowerCase();
      
      let sourceMatchScore = 0;
      for (const keyword of claimKeywords) {
        if (excerpt.includes(keyword) || title.includes(keyword)) {
          sourceMatchScore += 1;
        }
      }

      const normalizedScore = claimKeywords.length > 0 
        ? (sourceMatchScore / claimKeywords.length) * 100 
        : 0;

      if (normalizedScore > matchScore) {
        matchScore = normalizedScore;
        matchingSource = source;
      }
    }

    // Determine status based on match score
    let status: VerificationStatus;
    let explanation: string;

    if (matchScore >= 70) {
      status = 'verified';
      explanation = `Claim supported by ${matchingSource?.title ?? 'reliable sources'}.`;
    } else if (matchScore >= 40) {
      status = 'unverified';
      explanation = 'Partial match found. Claim may be accurate but requires additional verification.';
    } else if (matchScore >= 20) {
      status = 'needs_review';
      explanation = 'Limited supporting evidence found. Manual verification recommended.';
    } else {
      status = 'needs_review';
      explanation = 'Could not find sufficient evidence to verify this claim.';
    }

    return {
      status,
      confidence: Math.round(matchScore),
      explanation,
    };
  }

  // ============ Helper Methods ============

  /**
   * Splits text into sentences
   */
  private splitIntoSentences(text: string): string[] {
    return text
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  /**
   * Detects the type of claim
   */
  private detectClaimType(sentence: string): ClaimType {
    const lowerSentence = sentence.toLowerCase();

    // Statistical patterns
    if (/\d+%|\d+\s*(percent|million|billion|thousand)|\bstatistic/i.test(sentence)) {
      return 'statistical';
    }

    // Historical patterns
    if (/\b(in\s+\d{4}|century|historical|history|war|revolution)\b/i.test(sentence)) {
      return 'historical';
    }

    // Scientific patterns
    if (/\b(study|research|scientist|experiment|theory|hypothesis|evidence)\b/i.test(sentence)) {
      return 'scientific';
    }

    // Geographical patterns
    if (/\b(country|city|continent|ocean|mountain|river|located|capital)\b/i.test(sentence)) {
      return 'geographical';
    }

    // Biographical patterns
    if (/\b(born|died|founded|invented|discovered|president|ceo|author)\b/i.test(sentence)) {
      return 'biographical';
    }

    return 'general';
  }

  /**
   * Checks if a sentence contains a verifiable claim
   */
  private isVerifiableClaim(sentence: string): boolean {
    // Skip very short sentences
    if (sentence.split(/\s+/).length < 5) {
      return false;
    }

    // Skip questions
    if (sentence.endsWith('?')) {
      return false;
    }

    // Skip subjective statements
    if (/\b(i think|i believe|in my opinion|probably|maybe|might)\b/i.test(sentence)) {
      return false;
    }

    // Check for factual indicators
    const factualIndicators = [
      /\b(is|are|was|were|has|have|had)\b/i,
      /\b\d+/,
      /\b(according to|studies show|research indicates)\b/i,
      /\b(always|never|every|all|none)\b/i,
    ];

    return factualIndicators.some(pattern => pattern.test(sentence));
  }

  /**
   * Extracts entities from text
   */
  private extractEntities(text: string): string[] {
    const entities: string[] = [];
    
    // Extract capitalized words (potential proper nouns)
    const capitalizedWords = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) ?? [];
    entities.push(...capitalizedWords);

    // Extract numbers with context
    const numbers = text.match(/\d+(?:\.\d+)?(?:\s*(?:percent|%|million|billion|thousand))?/gi) ?? [];
    entities.push(...numbers);

    return [...new Set(entities)];
  }

  /**
   * Extracts keywords from text
   */
  private extractKeywords(text: string): string[] {
    // Remove common stop words and extract meaningful terms
    const stopWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
      'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
      'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above',
      'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here',
      'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more',
      'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
      'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or',
      'because', 'until', 'while', 'this', 'that', 'these', 'those', 'it',
    ]);

    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));

    return [...new Set(words)].slice(0, 10);
  }

  /**
   * Gets confidence level from score
   */
  private getConfidenceLevel(score: number): ConfidenceLevel {
    if (score >= HIGH_CONFIDENCE_THRESHOLD) {
      return 'high';
    } else if (score >= MEDIUM_CONFIDENCE_THRESHOLD) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Gets color for verification status
   */
  private getStatusColor(status: VerificationStatus): 'green' | 'yellow' | 'red' | 'gray' {
    switch (status) {
      case 'verified':
        return 'green';
      case 'unverified':
      case 'needs_review':
        return 'yellow';
      case 'false':
      case 'disputed':
        return 'red';
      default:
        return 'gray';
    }
  }

  /**
   * Gets icon for verification status
   */
  private getStatusIcon(status: VerificationStatus): string {
    switch (status) {
      case 'verified':
        return '✓';
      case 'unverified':
      case 'needs_review':
        return '?';
      case 'false':
        return '✗';
      case 'disputed':
        return '⚠';
      default:
        return '○';
    }
  }

  /**
   * Generates corrected text based on source
   */
  private generateCorrectedText(claim: FactualClaim, source: VerificationSource): string {
    // In a real implementation, this would use NLP to generate a corrected version
    // For now, we suggest reviewing the source
    return `[Review needed: See ${source.title} for accurate information]`;
  }

  /**
   * Formats a citation for a source
   */
  private formatCitation(source: VerificationSource): string {
    const parts: string[] = [];
    
    if (source.author) {
      parts.push(source.author);
    }
    
    parts.push(`"${source.title}"`);
    
    if (source.publishedDate) {
      parts.push(`(${source.publishedDate.getFullYear()})`);
    }
    
    if (source.url) {
      parts.push(`Available at: ${source.url}`);
    }

    return parts.join('. ');
  }

  /**
   * Strips HTML tags from text
   */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }

  // ============ ID Generation ============

  private generateReportId(): string {
    return `report_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateClaimId(): string {
    return `claim_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateSourceId(): string {
    return `source_${crypto.randomBytes(8).toString('hex')}`;
  }
}

// Export singleton instance
export const factCheckingService = new FactCheckingService();
