/**
 * Text Analyzer
 * Main entry point for text analysis, combining language detection,
 * document parsing, metrics calculation, and protected segment identification.
 * Requirements: 1, 2, 4, 8
 */

import {
  TextAnalysisResult,
  TextAnalyzerOptions,
  ContentType,
  TextMetrics,
  DocumentStructure,
} from './types';
import { detectLanguage } from './language-detector';
import { parseDocument, countWords, extractSentences } from './document-parser';
import { calculateMetrics } from './metrics-calculator';
import { parseProtectedSegments, validateProtectedSegments } from './protected-segment-parser';

/** Default maximum word count (500,000 words = ~1000 pages) */
const DEFAULT_MAX_WORD_COUNT = 500000;

/** Minimum word count for valid input */
const MIN_WORD_COUNT = 1;

/**
 * TextAnalyzer class for comprehensive text analysis
 */
export class TextAnalyzer {
  private options: Required<TextAnalyzerOptions>;

  constructor(options?: TextAnalyzerOptions) {
    this.options = {
      maxWordCount: options?.maxWordCount ?? DEFAULT_MAX_WORD_COUNT,
      protectedSegmentOptions: options?.protectedSegmentOptions ?? {},
      skipMetrics: options?.skipMetrics ?? false,
    };
  }

  /**
   * Performs comprehensive analysis on the input text
   * @param text - The text to analyze
   * @returns Complete analysis result
   */
  analyze(text: string): TextAnalysisResult {
    const validationErrors: string[] = [];

    // Validate input
    const inputValidation = this.validateInput(text);
    if (!inputValidation.isValid) {
      validationErrors.push(...inputValidation.errors);
    }

    // Detect language
    const language = detectLanguage(text);

    // Parse document structure
    const structure = parseDocument(text);

    // Parse protected segments
    const protectedSegments = parseProtectedSegments(
      text,
      this.options.protectedSegmentOptions
    );


    // Validate protected segments
    const segmentValidation = validateProtectedSegments(
      text,
      this.options.protectedSegmentOptions
    );
    if (!segmentValidation.isValid) {
      validationErrors.push(...segmentValidation.errors);
    }

    // Calculate metrics (unless skipped)
    const metrics = this.options.skipMetrics
      ? this.getEmptyMetrics()
      : calculateMetrics(text);

    // Detect content type
    const contentType = this.detectContentType(text, structure);

    return {
      language,
      contentType,
      structure,
      metrics,
      protectedSegments,
      isValid: validationErrors.length === 0 && inputValidation.isValid,
      validationErrors,
    };
  }

  /**
   * Validates input text
   * @param text - The text to validate
   * @returns Validation result
   */
  validateInput(text: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for empty or whitespace-only input (Requirement 1.4)
    if (!text || text.trim().length === 0) {
      errors.push('Input text cannot be empty or whitespace-only');
      return { isValid: false, errors };
    }

    // Check word count
    const wordCount = countWords(text);

    if (wordCount < MIN_WORD_COUNT) {
      errors.push('Input text must contain at least one word');
    }

    // Check maximum word count (Requirement 1.1)
    if (wordCount > this.options.maxWordCount) {
      errors.push(
        `Input text exceeds maximum word count of ${this.options.maxWordCount} words (found ${wordCount})`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Detects the content type based on text characteristics
   * @param text - The text to analyze
   * @param structure - Parsed document structure
   * @returns Detected content type
   */
  private detectContentType(text: string, _structure: DocumentStructure): ContentType {
    const lowerText = text.toLowerCase();

    // Academic indicators
    const academicPatterns = [
      /\b(abstract|introduction|methodology|conclusion|references|bibliography)\b/i,
      /\b(et al\.|ibid\.|op\. cit\.)\b/i,
      /\b(hypothesis|empirical|theoretical|analysis)\b/i,
      /\(\d{4}\)/, // Citation year pattern
      /\[\d+\]/, // Numbered citations
    ];

    // Technical indicators
    const technicalPatterns = [
      /\b(function|class|interface|module|api|endpoint)\b/i,
      /\b(implementation|algorithm|parameter|configuration)\b/i,
      /```[\s\S]*```/, // Code blocks
      /\b(npm|git|docker|kubernetes)\b/i,
    ];

    // Business indicators
    const businessPatterns = [
      /\b(revenue|profit|market|stakeholder|roi|kpi)\b/i,
      /\b(strategy|objective|deliverable|milestone)\b/i,
      /\b(q[1-4]|fiscal|quarterly|annual)\b/i,
    ];

    // Casual indicators
    const casualPatterns = [
      /\b(hey|gonna|wanna|kinda|sorta|yeah|nope)\b/i,
      /!{2,}/, // Multiple exclamation marks
      /\b(lol|omg|btw|imo|imho)\b/i,
    ];

    // Creative indicators
    const creativePatterns = [
      /\b(chapter|scene|character|dialogue|narrative)\b/i,
      /"[^"]+"\s+(he|she|they)\s+(said|asked|replied)/i,
      /\b(once upon|happily ever|the end)\b/i,
    ];

    // Count matches for each type
    const scores = {
      academic: this.countPatternMatches(lowerText, academicPatterns),
      technical: this.countPatternMatches(lowerText, technicalPatterns),
      business: this.countPatternMatches(lowerText, businessPatterns),
      casual: this.countPatternMatches(lowerText, casualPatterns),
      creative: this.countPatternMatches(lowerText, creativePatterns),
    };

    // Find the type with highest score
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore === 0) {
      return 'unknown';
    }

    const contentType = Object.entries(scores).find(([_, score]) => score === maxScore)?.[0];
    return (contentType as ContentType) || 'unknown';
  }

  /**
   * Counts pattern matches in text
   * @param text - The text to search
   * @param patterns - Array of regex patterns
   * @returns Number of matches
   */
  private countPatternMatches(text: string, patterns: RegExp[]): number {
    return patterns.reduce((count, pattern) => {
      const matches = text.match(new RegExp(pattern, 'gi'));
      return count + (matches?.length || 0);
    }, 0);
  }

  /**
   * Returns empty metrics object
   * @returns Empty metrics
   */
  private getEmptyMetrics(): TextMetrics {
    return {
      perplexity: 0,
      burstiness: 0,
      lexicalDiversity: 0,
      averageSentenceLength: 0,
      sentenceLengthStdDev: 0,
      sentenceLengths: [],
    };
  }

  /**
   * Quick validation check without full analysis
   * @param text - The text to validate
   * @returns Whether the text is valid for processing
   */
  isValidInput(text: string): boolean {
    return this.validateInput(text).isValid;
  }

  /**
   * Gets the word count of the text
   * @param text - The text to count
   * @returns Word count
   */
  getWordCount(text: string): number {
    return countWords(text);
  }

  /**
   * Gets the sentence count of the text
   * @param text - The text to count
   * @returns Sentence count
   */
  getSentenceCount(text: string): number {
    return extractSentences(text).length;
  }
}

/**
 * Creates a new TextAnalyzer instance with default options
 * @param options - Optional configuration
 * @returns TextAnalyzer instance
 */
export function createTextAnalyzer(options?: TextAnalyzerOptions): TextAnalyzer {
  return new TextAnalyzer(options);
}

/**
 * Performs quick text analysis with default options
 * @param text - The text to analyze
 * @returns Analysis result
 */
export function analyzeText(text: string): TextAnalysisResult {
  const analyzer = new TextAnalyzer();
  return analyzer.analyze(text);
}
