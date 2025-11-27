/**
 * Citation and Reference Management Types
 * Type definitions for citation detection, preservation, and standardization
 * Requirements: 33
 */

/**
 * Supported citation formats
 * Requirement 33.1: Detect and preserve APA, MLA, Chicago, and Harvard citation formats
 */
export type CitationFormat = 'APA' | 'MLA' | 'Chicago' | 'Harvard' | 'Unknown';

/**
 * Citation type classification
 */
export type CitationType = 
  | 'in-text'
  | 'parenthetical'
  | 'narrative'
  | 'footnote'
  | 'endnote'
  | 'bibliography';

/**
 * Individual citation entry
 */
export interface Citation {
  /** Unique identifier */
  id: string;
  /** Raw citation text */
  raw: string;
  /** Detected format */
  format: CitationFormat;
  /** Citation type */
  type: CitationType;
  /** Start position in text */
  startPosition: number;
  /** End position in text */
  endPosition: number;
  /** Parsed components */
  components: CitationComponents;
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Parsed citation components
 */
export interface CitationComponents {
  /** Author(s) */
  authors?: string[];
  /** Publication year */
  year?: string;
  /** Title of work */
  title?: string;
  /** Journal/Publisher name */
  source?: string;
  /** Volume number */
  volume?: string;
  /** Issue number */
  issue?: string;
  /** Page numbers */
  pages?: string;
  /** DOI */
  doi?: string;
  /** URL */
  url?: string;
  /** Access date */
  accessDate?: string;
  /** Edition */
  edition?: string;
  /** Editor(s) */
  editors?: string[];
  /** Publisher location */
  location?: string;
}

/**
 * Protected segment for citation preservation
 * Requirement 33.2: Maintain in-text citations and reference list integrity
 */
export interface ProtectedCitationSegment {
  /** Segment identifier */
  id: string;
  /** Original text */
  text: string;
  /** Start position */
  startPosition: number;
  /** End position */
  endPosition: number;
  /** Associated citation */
  citation: Citation;
  /** Whether this is a reference list entry */
  isReferenceEntry: boolean;
}

/**
 * Bibliography entry
 * Requirement 33.3: Preserve all bibliographic information exactly
 */
export interface BibliographyEntry {
  /** Entry identifier */
  id: string;
  /** Raw entry text */
  raw: string;
  /** Detected format */
  format: CitationFormat;
  /** Parsed components */
  components: CitationComponents;
  /** Line number in bibliography */
  lineNumber: number;
  /** Is entry valid */
  isValid: boolean;
  /** Validation errors */
  errors: string[];
}

/**
 * Digital identifier (DOI/URL)
 * Requirement 33.4: Maintain all digital identifiers unchanged
 */
export interface DigitalIdentifier {
  /** Identifier type */
  type: 'DOI' | 'URL' | 'ISBN' | 'ISSN' | 'PMID' | 'arXiv';
  /** Raw value */
  value: string;
  /** Start position in text */
  startPosition: number;
  /** End position in text */
  endPosition: number;
  /** Is valid format */
  isValid: boolean;
}

/**
 * Citation format detection result
 */
export interface FormatDetectionResult {
  /** Primary detected format */
  primaryFormat: CitationFormat;
  /** Confidence score (0-1) */
  confidence: number;
  /** All detected formats with scores */
  formatScores: Record<CitationFormat, number>;
  /** Sample citations used for detection */
  sampleCitations: Citation[];
  /** Whether mixed formats were detected */
  hasMixedFormats: boolean;
  /** Inconsistencies found */
  inconsistencies: FormatInconsistency[];
}

/**
 * Format inconsistency
 * Requirement 33.5: Detect inconsistencies and offer to standardize formatting
 */
export interface FormatInconsistency {
  /** Citation with inconsistent format */
  citation: Citation;
  /** Expected format based on document */
  expectedFormat: CitationFormat;
  /** Actual detected format */
  actualFormat: CitationFormat;
  /** Suggestion for fixing */
  suggestion: string;
}

/**
 * Bibliography validation report
 */
export interface BibliographyReport {
  /** Report identifier */
  id: string;
  /** Total entries found */
  totalEntries: number;
  /** Valid entries count */
  validEntries: number;
  /** Invalid entries count */
  invalidEntries: number;
  /** Detected format */
  format: CitationFormat;
  /** All bibliography entries */
  entries: BibliographyEntry[];
  /** Validation errors */
  errors: BibliographyError[];
  /** Missing required fields */
  missingFields: MissingFieldReport[];
  /** Duplicate entries */
  duplicates: DuplicateEntry[];
  /** Processing timestamp */
  timestamp: Date;
  /** Processing time in ms */
  processingTimeMs: number;
}

/**
 * Bibliography validation error
 */
export interface BibliographyError {
  /** Entry index */
  entryIndex: number;
  /** Entry text */
  entryText: string;
  /** Error type */
  errorType: 'format' | 'missing_field' | 'invalid_field' | 'duplicate';
  /** Error message */
  message: string;
  /** Suggestion for fixing */
  suggestion?: string;
}

/**
 * Missing field report
 */
export interface MissingFieldReport {
  /** Entry index */
  entryIndex: number;
  /** Missing field name */
  fieldName: string;
  /** Is field required for format */
  isRequired: boolean;
}

/**
 * Duplicate entry report
 */
export interface DuplicateEntry {
  /** First occurrence index */
  firstIndex: number;
  /** Duplicate index */
  duplicateIndex: number;
  /** Similarity score (0-1) */
  similarity: number;
}

/**
 * Citation preservation result
 */
export interface CitationPreservationResult {
  /** All protected segments */
  protectedSegments: ProtectedCitationSegment[];
  /** All digital identifiers */
  digitalIdentifiers: DigitalIdentifier[];
  /** Total citations found */
  totalCitations: number;
  /** Total reference entries found */
  totalReferences: number;
  /** Processing timestamp */
  timestamp: Date;
}

/**
 * Citation standardization result
 */
export interface StandardizationResult {
  /** Whether standardization was successful */
  success: boolean;
  /** Original text */
  originalText: string;
  /** Standardized text */
  standardizedText: string;
  /** Target format */
  targetFormat: CitationFormat;
  /** Number of citations converted */
  citationsConverted: number;
  /** Conversion details */
  conversions: CitationConversion[];
  /** Errors encountered */
  errors: string[];
  /** Processing time in ms */
  processingTimeMs: number;
}

/**
 * Individual citation conversion
 */
export interface CitationConversion {
  /** Original citation */
  original: string;
  /** Converted citation */
  converted: string;
  /** Source format */
  sourceFormat: CitationFormat;
  /** Target format */
  targetFormat: CitationFormat;
  /** Position in text */
  position: number;
}

/**
 * Citation service configuration
 */
export interface CitationServiceConfig {
  /** Default timeout in ms */
  defaultTimeout: number;
  /** Minimum text length for analysis */
  minTextLength: number;
  /** Maximum text length for analysis */
  maxTextLength: number;
  /** Confidence threshold for format detection */
  confidenceThreshold: number;
}

/**
 * Citation analysis options
 */
export interface CitationAnalysisOptions {
  /** Whether to detect format */
  detectFormat?: boolean;
  /** Whether to validate bibliography */
  validateBibliography?: boolean;
  /** Whether to extract digital identifiers */
  extractIdentifiers?: boolean;
  /** Timeout in ms */
  timeout?: number;
}

/**
 * Citation extraction result
 */
export interface CitationExtractionResult {
  /** All extracted citations */
  citations: Citation[];
  /** Format detection result */
  formatDetection: FormatDetectionResult;
  /** Digital identifiers found */
  digitalIdentifiers: DigitalIdentifier[];
  /** Bibliography section if found */
  bibliography?: BibliographyReport;
  /** Processing time in ms */
  processingTimeMs: number;
}
