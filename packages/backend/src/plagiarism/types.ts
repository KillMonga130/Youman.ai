/**
 * Plagiarism Detection Service Types
 * Type definitions for plagiarism checking and originality reports
 * Requirements: 31, 118
 */

/**
 * Plagiarism detection provider
 */
export type PlagiarismProvider = 'copyscape' | 'turnitin' | 'grammarly' | 'internal';

/**
 * Match source type
 */
export type SourceType = 'web' | 'academic' | 'publication' | 'database' | 'unknown';

/**
 * Match severity level
 */
export type MatchSeverity = 'high' | 'medium' | 'low';

/**
 * Text match found during plagiarism check
 * Requirement 31.2: Highlight matching passages and show similarity percentages
 */
export interface Match {
  /** Unique match identifier */
  id: string;
  /** Matched text from the input */
  matchedText: string;
  /** Start position in the input text */
  startPosition: number;
  /** End position in the input text */
  endPosition: number;
  /** Similarity percentage for this match (0-100) */
  similarity: number;
  /** Source where the match was found */
  source: Source;
  /** Severity level based on similarity */
  severity: MatchSeverity;
  /** Word count of the match */
  wordCount: number;
}

/**
 * Source where plagiarism was detected
 * Requirement 31.4: Generate detailed originality report with source citations
 */
export interface Source {
  /** Unique source identifier */
  id: string;
  /** Source URL (if available) */
  url?: string;
  /** Source title */
  title: string;
  /** Source author (if available) */
  author?: string;
  /** Publication date (if available) */
  publishedDate?: Date;
  /** Source type */
  type: SourceType;
  /** Domain name (for web sources) */
  domain?: string;
  /** Citation in standard format */
  citation?: string;
}

/**
 * Annotated text with highlighted matches
 * Requirement 31.2: Highlight matching passages
 */
export interface AnnotatedText {
  /** Original text */
  originalText: string;
  /** Text with HTML highlighting */
  highlightedHtml: string;
  /** Text with markdown highlighting */
  highlightedMarkdown: string;
  /** Match annotations */
  annotations: MatchAnnotation[];
  /** Total matches found */
  totalMatches: number;
}

/**
 * Match annotation for text highlighting
 */
export interface MatchAnnotation {
  /** Match ID */
  matchId: string;
  /** Start position */
  start: number;
  /** End position */
  end: number;
  /** Highlight color based on severity */
  color: 'red' | 'orange' | 'yellow';
  /** Tooltip text */
  tooltip: string;
}

/**
 * Plagiarism report
 * Requirement 31.4: Generate detailed originality report with source citations
 */
export interface PlagiarismReport {
  /** Unique report identifier */
  id: string;
  /** Overall similarity percentage (0-100) */
  overallSimilarity: number;
  /** All matches found */
  matches: Match[];
  /** All sources cited */
  sources: Source[];
  /** Report generation timestamp */
  timestamp: Date;
  /** Text word count */
  wordCount: number;
  /** Original text analyzed */
  originalText: string;
  /** Processing time in milliseconds */
  processingTimeMs: number;
  /** Provider used for detection */
  provider: PlagiarismProvider;
  /** Whether the content is considered original */
  isOriginal: boolean;
  /** Originality score (100 - similarity) */
  originalityScore: number;
}

/**
 * Plagiarism-free certificate
 * Requirement 31.5: Provide plagiarism-free guarantee certificate for premium users
 */
export interface Certificate {
  /** Unique certificate identifier */
  id: string;
  /** Certificate number for verification */
  certificateNumber: string;
  /** Report ID this certificate is based on */
  reportId: string;
  /** User ID who requested the certificate */
  userId: string;
  /** Document title */
  documentTitle: string;
  /** Originality score at time of certification */
  originalityScore: number;
  /** Certificate issue date */
  issuedAt: Date;
  /** Certificate expiration date */
  expiresAt: Date;
  /** Verification URL */
  verificationUrl: string;
  /** Digital signature */
  signature: string;
  /** Whether the certificate is valid */
  isValid: boolean;
}


/**
 * Rephrase suggestion for flagged sections
 * Requirement 31.3: Offer to rephrase flagged sections
 */
export interface RephraseSuggestion {
  /** Match ID this suggestion is for */
  matchId: string;
  /** Original text */
  originalText: string;
  /** Suggested rephrased text */
  suggestedText: string;
  /** Transformation intensity used */
  intensity: number;
  /** Expected similarity reduction */
  expectedReduction: number;
}

/**
 * Rephrase result
 * Requirement 31.3: Offer to rephrase flagged sections with increased transformation intensity
 */
export interface RephraseResult {
  /** Whether rephrasing was successful */
  success: boolean;
  /** Original text */
  originalText: string;
  /** Rephrased text */
  rephrasedText: string;
  /** Original similarity score */
  originalSimilarity: number;
  /** New similarity score after rephrasing */
  newSimilarity: number;
  /** Similarity reduction achieved */
  similarityReduction: number;
  /** Processing time in milliseconds */
  processingTimeMs: number;
  /** Error message if failed */
  error?: string;
}

/**
 * Plagiarism check options
 */
export interface PlagiarismCheckOptions {
  /** Providers to use (defaults to all available) */
  providers?: PlagiarismProvider[];
  /** Whether to check against web sources */
  checkWeb?: boolean;
  /** Whether to check against academic databases */
  checkAcademic?: boolean;
  /** Minimum match length in words to report */
  minMatchLength?: number;
  /** Similarity threshold for flagging (0-100) */
  similarityThreshold?: number;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Whether to generate suggestions for high similarity matches */
  generateSuggestions?: boolean;
  /** Excluded URLs (e.g., user's own published content) */
  excludedUrls?: string[];
  /** Excluded domains */
  excludedDomains?: string[];
}

/**
 * Provider configuration
 */
export interface PlagiarismProviderConfig {
  /** API key for the provider */
  apiKey?: string;
  /** Base URL for the API */
  baseUrl: string;
  /** Whether the provider is enabled */
  enabled: boolean;
  /** Request timeout in milliseconds */
  timeout: number;
  /** Rate limit (requests per minute) */
  rateLimit?: number;
}

/**
 * Plagiarism service configuration
 */
export interface PlagiarismServiceConfig {
  /** Copyscape configuration */
  copyscape: PlagiarismProviderConfig;
  /** Turnitin configuration */
  turnitin: PlagiarismProviderConfig;
  /** Grammarly configuration */
  grammarly: PlagiarismProviderConfig;
  /** Default similarity threshold */
  defaultSimilarityThreshold: number;
  /** Default timeout in milliseconds */
  defaultTimeout: number;
  /** Minimum match length in words */
  minMatchLength: number;
}

/**
 * Copyscape API response
 */
export interface CopyscapeResponse {
  querywords: number;
  result: Array<{
    index: number;
    url: string;
    title: string;
    percentmatched: number;
    minwordsmatched: number;
    textsnippet: string;
  }>;
}

/**
 * Turnitin plagiarism API response
 */
export interface TurnitinPlagiarismResponse {
  overall_match_percentage: number;
  matches: Array<{
    source_url: string;
    source_title: string;
    match_percentage: number;
    matched_text: string;
    start_index: number;
    end_index: number;
  }>;
}

/**
 * Internal plagiarism detection result
 */
export interface InternalPlagiarismResult {
  /** Similarity score (0-1) */
  similarity: number;
  /** Detected matches */
  matches: Array<{
    text: string;
    start: number;
    end: number;
    similarity: number;
  }>;
}

/**
 * Certificate generation options
 */
export interface CertificateOptions {
  /** Document title */
  documentTitle: string;
  /** User ID */
  userId: string;
  /** Report ID */
  reportId: string;
  /** Certificate validity period in days */
  validityDays?: number;
}

/**
 * Certificate verification result
 */
export interface CertificateVerification {
  /** Whether the certificate is valid */
  isValid: boolean;
  /** Certificate details (if valid) */
  certificate?: Certificate;
  /** Verification message */
  message: string;
  /** Verification timestamp */
  verifiedAt: Date;
}
