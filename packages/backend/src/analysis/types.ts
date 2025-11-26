/**
 * Type definitions for the text analysis module
 */

/** Supported languages for humanization */
export type SupportedLanguage = 'en' | 'es' | 'fr' | 'de' | 'pt';

/** Language detection result */
export interface LanguageDetectionResult {
  /** Detected language code (ISO 639-1) */
  language: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Whether the language is supported */
  isSupported: boolean;
  /** List of supported languages if not supported */
  supportedLanguages?: SupportedLanguage[];
}

/** Content type classification */
export type ContentType = 'technical' | 'creative' | 'academic' | 'business' | 'casual' | 'unknown';

/** Document structure element types */
export type StructureElementType = 'chapter' | 'section' | 'paragraph' | 'sentence' | 'heading';

/** Document structure element */
export interface StructureElement {
  type: StructureElementType;
  content: string;
  startIndex: number;
  endIndex: number;
  level?: number; // For headings (1-6)
  children?: StructureElement[];
}

/** Parsed document structure */
export interface DocumentStructure {
  /** Total word count */
  wordCount: number;
  /** Total sentence count */
  sentenceCount: number;
  /** Total paragraph count */
  paragraphCount: number;
  /** Chapter count (if applicable) */
  chapterCount: number;
  /** Hierarchical structure */
  elements: StructureElement[];
  /** Detected format (plain, markdown, etc.) */
  format: 'plain' | 'markdown' | 'html';
}


/** Text metrics for humanization quality */
export interface TextMetrics {
  /** Perplexity score (40-120 is natural range) */
  perplexity: number;
  /** Burstiness score (sentence length variation, >0.6 is good) */
  burstiness: number;
  /** Lexical diversity (unique words / total words) */
  lexicalDiversity: number;
  /** Average sentence length in words */
  averageSentenceLength: number;
  /** Standard deviation of sentence lengths */
  sentenceLengthStdDev: number;
  /** Array of individual sentence lengths */
  sentenceLengths: number[];
}

/** Protected segment with delimiters */
export interface ProtectedSegment {
  /** Original content including delimiters */
  original: string;
  /** Content without delimiters */
  content: string;
  /** Start index in original text */
  startIndex: number;
  /** End index in original text */
  endIndex: number;
  /** Opening delimiter used */
  openDelimiter: string;
  /** Closing delimiter used */
  closeDelimiter: string;
}

/** Protected segment parsing options */
export interface ProtectedSegmentOptions {
  /** Custom delimiter pairs (default: [[...]], {{...}}, <<...>>) */
  delimiters?: Array<{ open: string; close: string }>;
}

/** Complete text analysis result */
export interface TextAnalysisResult {
  /** Language detection result */
  language: LanguageDetectionResult;
  /** Detected content type */
  contentType: ContentType;
  /** Document structure */
  structure: DocumentStructure;
  /** Text metrics */
  metrics: TextMetrics;
  /** Protected segments found */
  protectedSegments: ProtectedSegment[];
  /** Whether the text is valid for processing */
  isValid: boolean;
  /** Validation errors if any */
  validationErrors: string[];
}

/** Text analyzer options */
export interface TextAnalyzerOptions {
  /** Maximum word count allowed (default: 500000) */
  maxWordCount?: number;
  /** Protected segment options */
  protectedSegmentOptions?: ProtectedSegmentOptions;
  /** Skip metrics calculation for performance */
  skipMetrics?: boolean;
}
