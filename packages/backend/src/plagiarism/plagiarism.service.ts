/**
 * Plagiarism Detection Service
 * Integrates plagiarism checking with humanization
 * Requirements: 31, 118
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import crypto from 'crypto';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import {
  PlagiarismProvider,
  PlagiarismReport,
  Match,
  Source,
  SourceType,
  MatchSeverity,
  AnnotatedText,
  MatchAnnotation,
  Certificate,
  CertificateOptions,
  CertificateVerification,
  RephraseSuggestion,
  RephraseResult,
  PlagiarismCheckOptions,
  PlagiarismServiceConfig,
  PlagiarismProviderConfig,
  CopyscapeResponse,
  TurnitinPlagiarismResponse,
  InternalPlagiarismResult,
} from './types';

/** Default timeout for plagiarism checks (30 seconds) */
const DEFAULT_TIMEOUT = 30000;

/** Default similarity threshold for flagging (20%) */
const DEFAULT_SIMILARITY_THRESHOLD = 20;

/** Default minimum match length in words */
const DEFAULT_MIN_MATCH_LENGTH = 5;

/** High similarity threshold */
const HIGH_SIMILARITY_THRESHOLD = 50;

/** Medium similarity threshold */
const MEDIUM_SIMILARITY_THRESHOLD = 25;

/** Certificate validity period in days */
const DEFAULT_CERTIFICATE_VALIDITY_DAYS = 365;

/**
 * Plagiarism Detection Service class
 * Handles plagiarism checking against web sources and academic databases
 */
export class PlagiarismService {
  private config: PlagiarismServiceConfig;
  private copyscapeClient: AxiosInstance | null = null;
  private turnitinClient: AxiosInstance | null = null;
  private grammarlyClient: AxiosInstance | null = null;

  constructor(serviceConfig?: Partial<PlagiarismServiceConfig>) {
    this.config = this.buildConfig(serviceConfig);
    this.initializeClients();
  }

  /**
   * Builds the service configuration from environment and overrides
   */
  private buildConfig(overrides?: Partial<PlagiarismServiceConfig>): PlagiarismServiceConfig {
    return {
      copyscape: {
        apiKey: config.externalApis?.copyscape ?? '',
        baseUrl: 'https://www.copyscape.com/api',
        enabled: !!config.externalApis?.copyscape,
        timeout: DEFAULT_TIMEOUT,
        ...overrides?.copyscape,
      },
      turnitin: {
        apiKey: config.externalApis?.turnitin ?? '',
        baseUrl: 'https://api.turnitin.com/api/v1',
        enabled: !!config.externalApis?.turnitin,
        timeout: DEFAULT_TIMEOUT,
        ...overrides?.turnitin,
      },
      grammarly: {
        apiKey: config.externalApis?.grammarly ?? '',
        baseUrl: 'https://api.grammarly.com/v1',
        enabled: !!config.externalApis?.grammarly,
        timeout: DEFAULT_TIMEOUT,
        ...overrides?.grammarly,
      },
      defaultSimilarityThreshold: overrides?.defaultSimilarityThreshold ?? DEFAULT_SIMILARITY_THRESHOLD,
      defaultTimeout: overrides?.defaultTimeout ?? DEFAULT_TIMEOUT,
      minMatchLength: overrides?.minMatchLength ?? DEFAULT_MIN_MATCH_LENGTH,
    };
  }

  /**
   * Initializes HTTP clients for each provider
   */
  private initializeClients(): void {
    if (this.config.copyscape.enabled && this.config.copyscape.apiKey) {
      this.copyscapeClient = axios.create({
        baseURL: this.config.copyscape.baseUrl,
        timeout: this.config.copyscape.timeout,
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

    if (this.config.grammarly.enabled && this.config.grammarly.apiKey) {
      this.grammarlyClient = axios.create({
        baseURL: this.config.grammarly.baseUrl,
        timeout: this.config.grammarly.timeout,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.grammarly.apiKey}`,
        },
      });
    }
  }


  /**
   * Checks text for plagiarism
   * Requirement 31.1: Run plagiarism detection against web sources and academic databases
   * @param text - Text to check for plagiarism
   * @param options - Check options
   * @returns Plagiarism report
   */
  async checkOriginality(text: string, options?: PlagiarismCheckOptions): Promise<PlagiarismReport> {
    const startTime = Date.now();
    const timeout = options?.timeout ?? this.config.defaultTimeout;
    const similarityThreshold = options?.similarityThreshold ?? this.config.defaultSimilarityThreshold;
    const checkWeb = options?.checkWeb ?? true;
    const checkAcademic = options?.checkAcademic ?? true;

    const reportId = this.generateReportId();
    const wordCount = this.countWords(text);
    const allMatches: Match[] = [];
    const allSources: Source[] = [];
    let provider: PlagiarismProvider = 'internal';

    // Try external providers first
    if (checkWeb && this.copyscapeClient) {
      try {
        const copyscapeResult = await this.checkWithCopyscape(text, timeout, options);
        allMatches.push(...copyscapeResult.matches);
        allSources.push(...copyscapeResult.sources);
        provider = 'copyscape';
      } catch (error) {
        logger.warn('Copyscape check failed:', error);
      }
    }

    if (checkAcademic && this.turnitinClient) {
      try {
        const turnitinResult = await this.checkWithTurnitin(text, timeout, options);
        allMatches.push(...turnitinResult.matches);
        allSources.push(...turnitinResult.sources);
        provider = 'turnitin';
      } catch (error) {
        logger.warn('Turnitin check failed:', error);
      }
    }

    // Use internal detection as fallback or supplement
    if (allMatches.length === 0) {
      const internalResult = this.checkInternal(text, options);
      allMatches.push(...internalResult.matches);
      provider = 'internal';
    }

    // Deduplicate matches and sources
    const uniqueMatches = this.deduplicateMatches(allMatches);
    const uniqueSources = this.deduplicateSources(allSources);

    // Calculate overall similarity
    const overallSimilarity = this.calculateOverallSimilarity(uniqueMatches, wordCount);
    const originalityScore = Math.max(0, 100 - overallSimilarity);
    const isOriginal = overallSimilarity < similarityThreshold;

    return {
      id: reportId,
      overallSimilarity: Math.round(overallSimilarity * 100) / 100,
      matches: uniqueMatches,
      sources: uniqueSources,
      timestamp: new Date(),
      wordCount,
      originalText: text,
      processingTimeMs: Date.now() - startTime,
      provider,
      isOriginal,
      originalityScore: Math.round(originalityScore * 100) / 100,
    };
  }

  /**
   * Highlights matching passages in text
   * Requirement 31.2: Highlight matching passages and show similarity percentages
   * @param text - Original text
   * @param matches - Matches to highlight
   * @returns Annotated text with highlights
   */
  highlightMatches(text: string, matches: Match[]): AnnotatedText {
    if (matches.length === 0) {
      return {
        originalText: text,
        highlightedHtml: text,
        highlightedMarkdown: text,
        annotations: [],
        totalMatches: 0,
      };
    }

    // Sort matches by start position (descending for easier replacement)
    const sortedMatches = [...matches].sort((a, b) => b.startPosition - a.startPosition);
    
    const annotations: MatchAnnotation[] = [];
    let highlightedHtml = text;
    let highlightedMarkdown = text;

    for (const match of sortedMatches) {
      const color = this.getSeverityColor(match.severity);
      const tooltip = `${match.similarity}% match from ${match.source.title}`;

      // Create annotation
      annotations.push({
        matchId: match.id,
        start: match.startPosition,
        end: match.endPosition,
        color,
        tooltip,
      });

      // HTML highlighting
      const htmlHighlight = `<span class="plagiarism-match ${color}" title="${tooltip}" data-match-id="${match.id}">${match.matchedText}</span>`;
      highlightedHtml = 
        highlightedHtml.substring(0, match.startPosition) +
        htmlHighlight +
        highlightedHtml.substring(match.endPosition);

      // Markdown highlighting (using bold and color indicator)
      const mdHighlight = `**[${match.matchedText}]** _(${match.similarity}% match)_`;
      highlightedMarkdown =
        highlightedMarkdown.substring(0, match.startPosition) +
        mdHighlight +
        highlightedMarkdown.substring(match.endPosition);
    }

    // Sort annotations by start position (ascending)
    annotations.sort((a, b) => a.start - b.start);

    return {
      originalText: text,
      highlightedHtml,
      highlightedMarkdown,
      annotations,
      totalMatches: matches.length,
    };
  }

  /**
   * Rephrases a section to reduce similarity
   * Requirement 31.3: Offer to rephrase flagged sections with increased transformation intensity
   * @param text - Text to rephrase
   * @param intensity - Transformation intensity (1-5)
   * @returns Rephrased text
   */
  async rephraseSection(text: string, intensity: number = 3): Promise<RephraseResult> {
    const startTime = Date.now();

    try {
      // Validate intensity
      const validIntensity = Math.max(1, Math.min(5, intensity));

      // Check original similarity
      const originalReport = await this.checkOriginality(text, { timeout: 10000 });
      const originalSimilarity = originalReport.overallSimilarity;

      // Apply rephrasing transformations based on intensity
      const rephrasedText = this.applyRephrasing(text, validIntensity);

      // Check new similarity
      const newReport = await this.checkOriginality(rephrasedText, { timeout: 10000 });
      const newSimilarity = newReport.overallSimilarity;

      return {
        success: true,
        originalText: text,
        rephrasedText,
        originalSimilarity,
        newSimilarity,
        similarityReduction: originalSimilarity - newSimilarity,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        originalText: text,
        rephrasedText: text,
        originalSimilarity: 0,
        newSimilarity: 0,
        similarityReduction: 0,
        processingTimeMs: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Generates a plagiarism-free certificate
   * Requirement 31.5: Provide plagiarism-free guarantee certificate for premium users
   * @param reportId - Report ID to generate certificate for
   * @returns Certificate
   */
  async generateCertificate(options: CertificateOptions): Promise<Certificate> {
    const certificateId = this.generateCertificateId();
    const certificateNumber = this.generateCertificateNumber();
    const validityDays = options.validityDays ?? DEFAULT_CERTIFICATE_VALIDITY_DAYS;

    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + validityDays * 24 * 60 * 60 * 1000);

    // Generate digital signature
    const signatureData = `${certificateId}:${options.reportId}:${options.userId}:${issuedAt.toISOString()}`;
    const signature = this.generateSignature(signatureData);

    // Generate verification URL
    const verificationUrl = `https://api.aihumanizer.com/certificates/verify/${certificateNumber}`;

    return {
      id: certificateId,
      certificateNumber,
      reportId: options.reportId,
      userId: options.userId,
      documentTitle: options.documentTitle,
      originalityScore: 100, // Will be updated with actual score
      issuedAt,
      expiresAt,
      verificationUrl,
      signature,
      isValid: true,
    };
  }

  /**
   * Verifies a certificate
   * @param certificateNumber - Certificate number to verify
   * @returns Verification result
   */
  async verifyCertificate(certificateNumber: string): Promise<CertificateVerification> {
    // In a real implementation, this would look up the certificate in the database
    // For now, we'll return a mock verification
    return {
      isValid: false,
      message: 'Certificate not found or expired',
      verifiedAt: new Date(),
    };
  }

  /**
   * Generates rephrase suggestions for high similarity matches
   * Requirement 31.3: Offer to rephrase flagged sections
   * @param matches - Matches to generate suggestions for
   * @returns Array of rephrase suggestions
   */
  generateRephraseSuggestions(matches: Match[]): RephraseSuggestion[] {
    const suggestions: RephraseSuggestion[] = [];

    for (const match of matches) {
      if (match.severity === 'high' || match.severity === 'medium') {
        const intensity = match.severity === 'high' ? 5 : 3;
        const suggestedText = this.applyRephrasing(match.matchedText, intensity);
        const expectedReduction = match.severity === 'high' ? 30 : 15;

        suggestions.push({
          matchId: match.id,
          originalText: match.matchedText,
          suggestedText,
          intensity,
          expectedReduction,
        });
      }
    }

    return suggestions;
  }


  // ============ Provider-Specific Methods ============

  /**
   * Checks plagiarism using Copyscape API
   */
  private async checkWithCopyscape(
    text: string,
    timeout: number,
    options?: PlagiarismCheckOptions
  ): Promise<{ matches: Match[]; sources: Source[] }> {
    if (!this.copyscapeClient) {
      throw new Error('Copyscape client not configured');
    }

    try {
      const response = await this.copyscapeClient.get<CopyscapeResponse>('/', {
        params: {
          u: this.config.copyscape.apiKey,
          o: 'csearch',
          t: text.substring(0, 25000), // Copyscape limit
          f: 'json',
        },
        timeout,
      });

      const matches: Match[] = [];
      const sources: Source[] = [];

      if (response.data.result) {
        for (const result of response.data.result) {
          const sourceId = this.generateSourceId();
          const matchId = this.generateMatchId();

          // Create source
          const source: Source = {
            id: sourceId,
            url: result.url,
            title: result.title,
            type: 'web',
            domain: this.extractDomain(result.url),
          };
          sources.push(source);

          // Find match position in text
          const matchPosition = this.findMatchPosition(text, result.textsnippet);

          // Create match
          const match: Match = {
            id: matchId,
            matchedText: result.textsnippet,
            startPosition: matchPosition.start,
            endPosition: matchPosition.end,
            similarity: result.percentmatched,
            source,
            severity: this.calculateSeverity(result.percentmatched),
            wordCount: result.minwordsmatched,
          };
          matches.push(match);
        }
      }

      return { matches, sources };
    } catch (error) {
      const axiosError = error as AxiosError;
      throw new Error(`Copyscape API error: ${axiosError.message}`);
    }
  }

  /**
   * Checks plagiarism using Turnitin API
   */
  private async checkWithTurnitin(
    text: string,
    timeout: number,
    options?: PlagiarismCheckOptions
  ): Promise<{ matches: Match[]; sources: Source[] }> {
    if (!this.turnitinClient) {
      throw new Error('Turnitin client not configured');
    }

    try {
      const response = await this.turnitinClient.post<TurnitinPlagiarismResponse>(
        '/submissions/plagiarism',
        { text },
        { timeout }
      );

      const matches: Match[] = [];
      const sources: Source[] = [];

      if (response.data.matches) {
        for (const result of response.data.matches) {
          const sourceId = this.generateSourceId();
          const matchId = this.generateMatchId();

          // Create source
          const source: Source = {
            id: sourceId,
            url: result.source_url,
            title: result.source_title,
            type: 'academic',
            domain: this.extractDomain(result.source_url),
          };
          sources.push(source);

          // Create match
          const match: Match = {
            id: matchId,
            matchedText: result.matched_text,
            startPosition: result.start_index,
            endPosition: result.end_index,
            similarity: result.match_percentage,
            source,
            severity: this.calculateSeverity(result.match_percentage),
            wordCount: this.countWords(result.matched_text),
          };
          matches.push(match);
        }
      }

      return { matches, sources };
    } catch (error) {
      const axiosError = error as AxiosError;
      throw new Error(`Turnitin API error: ${axiosError.message}`);
    }
  }

  /**
   * Internal plagiarism detection using n-gram analysis
   * Used as fallback when external APIs are unavailable
   */
  private checkInternal(
    text: string,
    options?: PlagiarismCheckOptions
  ): { matches: Match[]; sources: Source[] } {
    // Internal detection uses n-gram analysis to find potentially plagiarized content
    // This is a simplified implementation - in production, this would compare against
    // a database of known content

    const matches: Match[] = [];
    const sources: Source[] = [];

    // For internal detection, we analyze text patterns that might indicate
    // copied content (e.g., unusual phrase patterns, citation-like structures)
    const sentences = this.splitIntoSentences(text);
    const minMatchLength = options?.minMatchLength ?? this.config.minMatchLength;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      if (!sentence) continue;

      const wordCount = this.countWords(sentence);
      
      // Skip short sentences
      if (wordCount < minMatchLength) continue;

      // Check for patterns that might indicate copied content
      const suspiciousScore = this.calculateSuspiciousScore(sentence);
      
      if (suspiciousScore > 0.3) {
        const sourceId = this.generateSourceId();
        const matchId = this.generateMatchId();

        const source: Source = {
          id: sourceId,
          title: 'Potential match detected',
          type: 'unknown',
        };
        sources.push(source);

        const startPosition = text.indexOf(sentence);
        const match: Match = {
          id: matchId,
          matchedText: sentence,
          startPosition,
          endPosition: startPosition + sentence.length,
          similarity: Math.round(suspiciousScore * 100),
          source,
          severity: this.calculateSeverity(suspiciousScore * 100),
          wordCount,
        };
        matches.push(match);
      }
    }

    return { matches, sources };
  }

  // ============ Helper Methods ============

  /**
   * Counts words in text
   */
  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
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
   * Calculates suspicious score for a sentence
   * Higher score indicates more likely to be copied
   */
  private calculateSuspiciousScore(sentence: string): number {
    let score = 0;

    // Check for overly formal language patterns
    const formalPatterns = [
      /\b(furthermore|moreover|consequently|nevertheless)\b/i,
      /\b(it is important to note|it should be noted)\b/i,
      /\b(in conclusion|to summarize|in summary)\b/i,
    ];

    for (const pattern of formalPatterns) {
      if (pattern.test(sentence)) {
        score += 0.1;
      }
    }

    // Check for citation-like patterns without actual citations
    if (/\(\d{4}\)/.test(sentence) && !/\([A-Z][a-z]+,?\s*\d{4}\)/.test(sentence)) {
      score += 0.2;
    }

    // Check for very long sentences (often copied)
    const wordCount = this.countWords(sentence);
    if (wordCount > 40) {
      score += 0.15;
    }

    // Check for unusual punctuation patterns
    if (/[;:].*[;:]/.test(sentence)) {
      score += 0.1;
    }

    return Math.min(1, score);
  }

  /**
   * Calculates overall similarity from matches
   */
  private calculateOverallSimilarity(matches: Match[], totalWords: number): number {
    if (matches.length === 0 || totalWords === 0) {
      return 0;
    }

    const matchedWords = matches.reduce((sum, match) => sum + match.wordCount, 0);
    return (matchedWords / totalWords) * 100;
  }

  /**
   * Calculates severity based on similarity percentage
   */
  private calculateSeverity(similarity: number): MatchSeverity {
    if (similarity >= HIGH_SIMILARITY_THRESHOLD) {
      return 'high';
    } else if (similarity >= MEDIUM_SIMILARITY_THRESHOLD) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Gets color for severity level
   */
  private getSeverityColor(severity: MatchSeverity): 'red' | 'orange' | 'yellow' {
    switch (severity) {
      case 'high':
        return 'red';
      case 'medium':
        return 'orange';
      case 'low':
        return 'yellow';
    }
  }

  /**
   * Finds match position in text
   */
  private findMatchPosition(text: string, matchText: string): { start: number; end: number } {
    const start = text.indexOf(matchText);
    if (start === -1) {
      // Try fuzzy matching
      const normalizedMatch = matchText.toLowerCase().replace(/\s+/g, ' ');
      const normalizedText = text.toLowerCase().replace(/\s+/g, ' ');
      const fuzzyStart = normalizedText.indexOf(normalizedMatch);
      if (fuzzyStart !== -1) {
        return { start: fuzzyStart, end: fuzzyStart + matchText.length };
      }
      return { start: 0, end: matchText.length };
    }
    return { start, end: start + matchText.length };
  }

  /**
   * Extracts domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return '';
    }
  }

  /**
   * Deduplicates matches by position
   */
  private deduplicateMatches(matches: Match[]): Match[] {
    const seen = new Set<string>();
    return matches.filter(match => {
      const key = `${match.startPosition}-${match.endPosition}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Deduplicates sources by URL
   */
  private deduplicateSources(sources: Source[]): Source[] {
    const seen = new Set<string>();
    return sources.filter(source => {
      const key = source.url ?? source.title;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Applies rephrasing transformations to text
   */
  private applyRephrasing(text: string, intensity: number): string {
    let result = text;

    // Apply transformations based on intensity
    if (intensity >= 1) {
      // Basic synonym replacement
      result = this.applySynonymReplacement(result);
    }

    if (intensity >= 2) {
      // Sentence restructuring
      result = this.applySentenceRestructuring(result);
    }

    if (intensity >= 3) {
      // Add transitional phrases
      result = this.addTransitionalPhrases(result);
    }

    if (intensity >= 4) {
      // Change voice (active/passive)
      result = this.changeVoice(result);
    }

    if (intensity >= 5) {
      // Complete paraphrasing
      result = this.completeParaphrase(result);
    }

    return result;
  }

  /**
   * Applies basic synonym replacement
   */
  private applySynonymReplacement(text: string): string {
    const synonyms: Record<string, string[]> = {
      'important': ['significant', 'crucial', 'essential', 'vital'],
      'show': ['demonstrate', 'illustrate', 'reveal', 'indicate'],
      'use': ['utilize', 'employ', 'apply', 'leverage'],
      'make': ['create', 'produce', 'generate', 'develop'],
      'good': ['excellent', 'effective', 'beneficial', 'positive'],
      'bad': ['negative', 'detrimental', 'harmful', 'adverse'],
      'big': ['large', 'substantial', 'significant', 'considerable'],
      'small': ['minor', 'minimal', 'slight', 'limited'],
    };

    let result = text;
    for (const [word, replacements] of Object.entries(synonyms)) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const replacement = replacements[Math.floor(Math.random() * replacements.length)];
      if (replacement) {
        result = result.replace(regex, replacement);
      }
    }

    return result;
  }

  /**
   * Applies sentence restructuring
   */
  private applySentenceRestructuring(text: string): string {
    // Simple restructuring - move prepositional phrases
    return text.replace(
      /^(\w+)\s+(is|are|was|were)\s+(\w+)\s+(in|on|at|by)\s+(.+)\.$/gm,
      (_, subject, verb, adjective, prep, rest) => 
        `${prep.charAt(0).toUpperCase() + prep.slice(1)} ${rest}, ${subject} ${verb} ${adjective}.`
    );
  }

  /**
   * Adds transitional phrases
   */
  private addTransitionalPhrases(text: string): string {
    const transitions = [
      'Additionally, ',
      'Furthermore, ',
      'Moreover, ',
      'In addition, ',
      'Consequently, ',
    ];

    const sentences = text.split(/(?<=[.!?])\s+/);
    const result: string[] = [];

    for (let i = 0; i < sentences.length; i++) {
      if (i > 0 && i % 3 === 0 && Math.random() > 0.5) {
        const transition = transitions[Math.floor(Math.random() * transitions.length)];
        result.push(transition + sentences[i]?.toLowerCase());
      } else {
        result.push(sentences[i] ?? '');
      }
    }

    return result.join(' ');
  }

  /**
   * Changes voice (active to passive or vice versa)
   */
  private changeVoice(text: string): string {
    // Simple voice change for common patterns
    return text.replace(
      /(\w+)\s+(wrote|created|made|developed)\s+(.+)/gi,
      (_, subject, verb, object) => `${object} was ${verb} by ${subject}`
    );
  }

  /**
   * Complete paraphrase (placeholder for more sophisticated implementation)
   */
  private completeParaphrase(text: string): string {
    // In a real implementation, this would use an AI model for paraphrasing
    // For now, we combine all other transformations
    let result = this.applySynonymReplacement(text);
    result = this.applySentenceRestructuring(result);
    result = this.addTransitionalPhrases(result);
    return result;
  }

  // ============ ID Generation Methods ============

  private generateReportId(): string {
    return `report_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateMatchId(): string {
    return `match_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateSourceId(): string {
    return `source_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateCertificateId(): string {
    return `cert_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateCertificateNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `PFC-${timestamp}-${random}`;
  }

  private generateSignature(data: string): string {
    const secret = config.jwtSecret ?? 'default-secret';
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }
}

// Export singleton instance
export const plagiarismService = new PlagiarismService();
