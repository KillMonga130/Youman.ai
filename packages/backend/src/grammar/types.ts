/**
 * Grammar Style Preferences Types
 * Type definitions for grammar style configuration including Oxford comma,
 * quote styles, date/number formats, and regional variants
 * Requirements: 103
 */

/**
 * Regional variant codes
 */
export type RegionalVariant = 'US' | 'UK' | 'CA' | 'AU';

/**
 * Quote style options
 */
export type QuoteStyle = 'single' | 'double';

/**
 * Date format options
 */
export type DateFormat = 
  | 'MM/DD/YYYY'  // US style
  | 'DD/MM/YYYY'  // UK/AU style
  | 'YYYY-MM-DD'  // ISO style
  | 'DD-MM-YYYY'  // Alternative European
  | 'MMMM D, YYYY' // Long format US
  | 'D MMMM YYYY'; // Long format UK

/**
 * Number format options
 */
export type NumberFormat = {
  /** Decimal separator character */
  decimalSeparator: '.' | ',';
  /** Thousands separator character */
  thousandsSeparator: ',' | '.' | ' ' | '';
  /** Currency symbol position */
  currencyPosition: 'before' | 'after';
  /** Currency symbol */
  currencySymbol: string;
};

/**
 * Grammar style preferences configuration
 * Requirement 103: Grammar style preferences
 */
export interface GrammarStylePreferences {
  /** Unique identifier */
  id: string;
  /** User ID this preference belongs to */
  userId: string;
  /** Whether to use Oxford comma (serial comma) */
  useOxfordComma: boolean;
  /** Quote style preference */
  quoteStyle: QuoteStyle;
  /** Date format preference */
  dateFormat: DateFormat;
  /** Number format configuration */
  numberFormat: NumberFormat;
  /** Regional variant for spelling and grammar */
  regionalVariant: RegionalVariant;
  /** Created timestamp */
  createdAt: Date;
  /** Updated timestamp */
  updatedAt: Date;
}

/**
 * Input for creating grammar style preferences
 */
export interface CreateGrammarStyleInput {
  userId: string;
  useOxfordComma?: boolean;
  quoteStyle?: QuoteStyle;
  dateFormat?: DateFormat;
  numberFormat?: Partial<NumberFormat>;
  regionalVariant?: RegionalVariant;
}

/**
 * Input for updating grammar style preferences
 */
export interface UpdateGrammarStyleInput {
  useOxfordComma?: boolean;
  quoteStyle?: QuoteStyle;
  dateFormat?: DateFormat;
  numberFormat?: Partial<NumberFormat>;
  regionalVariant?: RegionalVariant;
}

/**
 * Regional variant configuration
 */
export interface RegionalConfig {
  /** Variant code */
  variant: RegionalVariant;
  /** Default date format for this region */
  defaultDateFormat: DateFormat;
  /** Default number format for this region */
  defaultNumberFormat: NumberFormat;
  /** Default quote style for this region */
  defaultQuoteStyle: QuoteStyle;
  /** Default Oxford comma preference */
  defaultOxfordComma: boolean;
  /** Spelling differences from US English */
  spellingRules: SpellingRule[];
  /** Grammar rules specific to this variant */
  grammarRules: GrammarRule[];
}

/**
 * Spelling rule for regional variants
 */
export interface SpellingRule {
  /** US English spelling */
  us: string;
  /** UK English spelling */
  uk: string;
  /** Pattern to match */
  pattern: RegExp;
  /** Category of the rule */
  category: 'ize_ise' | 'or_our' | 'er_re' | 'og_ogue' | 'l_ll' | 'other';
}

/**
 * Grammar rule for regional variants
 */
export interface GrammarRule {
  /** Rule identifier */
  id: string;
  /** Description of the rule */
  description: string;
  /** Pattern to match */
  pattern: RegExp;
  /** Replacement for US variant */
  usReplacement: string;
  /** Replacement for UK variant */
  ukReplacement: string;
  /** Whether this rule applies to CA */
  appliesToCA: boolean;
  /** Whether this rule applies to AU */
  appliesToAU: boolean;
}

/**
 * Text transformation result
 */
export interface GrammarTransformResult {
  /** Whether transformation was successful */
  success: boolean;
  /** Original text */
  originalText: string;
  /** Transformed text */
  transformedText: string;
  /** Changes made during transformation */
  changes: GrammarChange[];
  /** Processing time in milliseconds */
  processingTimeMs: number;
  /** Error message if failed */
  error?: string;
}

/**
 * Individual grammar change made during transformation
 */
export interface GrammarChange {
  /** Type of change */
  type: 'oxford_comma' | 'quote_style' | 'date_format' | 'number_format' | 'spelling' | 'grammar';
  /** Original text segment */
  original: string;
  /** Replacement text */
  replacement: string;
  /** Start position in original text */
  startPosition: number;
  /** End position in original text */
  endPosition: number;
  /** Reason for the change */
  reason: string;
}

/**
 * Grammar service configuration
 */
export interface GrammarServiceConfig {
  /** Default regional variant */
  defaultRegionalVariant: RegionalVariant;
  /** Default Oxford comma preference */
  defaultOxfordComma: boolean;
  /** Default quote style */
  defaultQuoteStyle: QuoteStyle;
  /** Default date format */
  defaultDateFormat: DateFormat;
  /** Maximum text length for processing */
  maxTextLength: number;
  /** Processing timeout in milliseconds */
  timeout: number;
}

/**
 * Grammar analysis result
 */
export interface GrammarAnalysisResult {
  /** Detected regional variant */
  detectedVariant: RegionalVariant | null;
  /** Confidence score for detection (0-1) */
  confidence: number;
  /** Detected quote style */
  detectedQuoteStyle: QuoteStyle | null;
  /** Whether Oxford comma is used */
  usesOxfordComma: boolean | null;
  /** Detected date formats in text */
  detectedDateFormats: DateFormat[];
  /** Issues found */
  issues: GrammarIssue[];
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Grammar issue found during analysis
 */
export interface GrammarIssue {
  /** Issue type */
  type: 'inconsistent_spelling' | 'inconsistent_quotes' | 'missing_oxford_comma' | 'extra_oxford_comma' | 'date_format_inconsistency';
  /** Description of the issue */
  description: string;
  /** Position in text */
  position: number;
  /** Text segment with issue */
  segment: string;
  /** Suggested fix */
  suggestion: string;
}
