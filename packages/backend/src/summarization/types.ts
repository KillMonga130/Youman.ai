/**
 * Summarization Service Types
 * Type definitions for content summarization including extractive and abstractive methods
 * Requirements: 78
 */

/**
 * Summary length options
 */
export type SummaryLength = 'short' | 'medium' | 'long';

/**
 * Summarization method types
 */
export type SummarizationMethod = 'extractive' | 'abstractive' | 'hybrid';

/**
 * Sentence with scoring for extractive summarization
 */
export interface ScoredSentence {
  /** Original sentence text */
  text: string;
  /** Position in original text (0-based) */
  position: number;
  /** Importance score (0-1) */
  score: number;
  /** Word count */
  wordCount: number;
  /** Whether sentence is selected for summary */
  selected: boolean;
}

/**
 * Extractive summarization result
 */
export interface ExtractiveSummaryResult {
  /** Unique result identifier */
  id: string;
  /** Original text */
  originalText: string;
  /** Summarized text */
  summary: string;
  /** Sentences selected for summary */
  selectedSentences: ScoredSentence[];
  /** Total sentences in original */
  totalSentences: number;
  /** Sentences included in summary */
  sentencesIncluded: number;
  /** Compression ratio (summary length / original length) */
  compressionRatio: number;
  /** Original word count */
  originalWordCount: number;
  /** Summary word count */
  summaryWordCount: number;
  /** Processing timestamp */
  timestamp: Date;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Abstractive summarization result
 */
export interface AbstractiveSummaryResult {
  /** Unique result identifier */
  id: string;
  /** Original text */
  originalText: string;
  /** Summarized text */
  summary: string;
  /** Key concepts extracted */
  keyConcepts: string[];
  /** Main themes identified */
  themes: string[];
  /** Target word count */
  targetWordCount: number;
  /** Actual word count */
  actualWordCount: number;
  /** Compression ratio */
  compressionRatio: number;
  /** Original word count */
  originalWordCount: number;
  /** Processing timestamp */
  timestamp: Date;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * General summarization request
 */
export interface SummarizationRequest {
  /** Text to summarize */
  text: string;
  /** Desired summary length */
  length: SummaryLength;
  /** Summarization method (default: hybrid) */
  method?: SummarizationMethod;
  /** Whether to humanize the summary */
  humanize?: boolean;
  /** Humanization level (1-5) */
  humanizationLevel?: 1 | 2 | 3 | 4 | 5;
  /** Preserve specific terms */
  preserveTerms?: string[];
  /** Focus on specific topics */
  focusTopics?: string[];
}

/**
 * General summarization result
 */
export interface SummarizationResult {
  /** Unique result identifier */
  id: string;
  /** Original text */
  originalText: string;
  /** Summarized text */
  summary: string;
  /** Humanized summary (if requested) */
  humanizedSummary?: string;
  /** Summary length category */
  length: SummaryLength;
  /** Method used */
  method: SummarizationMethod;
  /** Key points extracted */
  keyPoints: string[];
  /** Compression ratio */
  compressionRatio: number;
  /** Original word count */
  originalWordCount: number;
  /** Summary word count */
  summaryWordCount: number;
  /** Whether humanization was applied */
  wasHumanized: boolean;
  /** Processing timestamp */
  timestamp: Date;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Extractive summarization request
 */
export interface ExtractiveSummarizationRequest {
  /** Text to summarize */
  text: string;
  /** Number of sentences to include */
  sentenceCount: number;
  /** Preserve sentence order */
  preserveOrder?: boolean;
  /** Minimum sentence length (words) */
  minSentenceLength?: number;
}

/**
 * Abstractive summarization request
 */
export interface AbstractiveSummarizationRequest {
  /** Text to summarize */
  text: string;
  /** Target word count for summary */
  wordCount: number;
  /** Style of summary */
  style?: 'formal' | 'casual' | 'technical';
  /** Include key concepts list */
  includeKeyConcepts?: boolean;
}

/**
 * Humanization request for summaries
 */
export interface HumanizeSummaryRequest {
  /** Summary text to humanize */
  summary: string;
  /** Humanization level (1-5) */
  level?: 1 | 2 | 3 | 4 | 5;
  /** Target tone */
  tone?: 'casual' | 'professional' | 'academic';
}

/**
 * Humanization result for summaries
 */
export interface HumanizeSummaryResult {
  /** Unique result identifier */
  id: string;
  /** Original summary */
  originalSummary: string;
  /** Humanized summary */
  humanizedSummary: string;
  /** Humanization level applied */
  levelApplied: number;
  /** Tone applied */
  toneApplied: string;
  /** Modifications made */
  modificationsCount: number;
  /** Processing timestamp */
  timestamp: Date;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Summarization service configuration
 */
export interface SummarizationConfig {
  /** Default summary length */
  defaultLength: SummaryLength;
  /** Default summarization method */
  defaultMethod: SummarizationMethod;
  /** Minimum text length for summarization */
  minTextLength: number;
  /** Maximum text length for summarization */
  maxTextLength: number;
  /** Default humanization level */
  defaultHumanizationLevel: 1 | 2 | 3 | 4 | 5;
  /** Processing timeout in milliseconds */
  timeout: number;
}

/**
 * Length configuration for summary targets
 */
export interface LengthConfig {
  /** Length category */
  length: SummaryLength;
  /** Target compression ratio (0-1) */
  targetRatio: number;
  /** Minimum sentences */
  minSentences: number;
  /** Maximum sentences */
  maxSentences: number;
  /** Description */
  description: string;
}
