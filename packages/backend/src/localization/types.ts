/**
 * Content Localization Service Types
 * Type definitions for content localization including idiom/metaphor adaptation,
 * cultural reference localization, unit/currency conversion, and cultural sensitivity checking
 * Requirements: 111
 */

/**
 * Supported target regions for localization
 */
export type TargetRegion =
  | 'us'      // United States
  | 'uk'      // United Kingdom
  | 'au'      // Australia
  | 'ca'      // Canada
  | 'de'      // Germany
  | 'fr'      // France
  | 'es'      // Spain
  | 'mx'      // Mexico
  | 'br'      // Brazil
  | 'jp'      // Japan
  | 'cn'      // China
  | 'in'      // India
  | 'ae'      // United Arab Emirates
  | 'za';     // South Africa

/**
 * Cultural sensitivity level
 */
export type SensitivityLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Unit system types
 */
export type UnitSystem = 'metric' | 'imperial';

/**
 * Date format styles
 */
export type DateFormatStyle = 'mdy' | 'dmy' | 'ymd';

/**
 * Currency information
 */
export interface CurrencyInfo {
  /** Currency code (ISO 4217) */
  code: string;
  /** Currency symbol */
  symbol: string;
  /** Currency name */
  name: string;
  /** Symbol position */
  symbolPosition: 'before' | 'after';
  /** Decimal separator */
  decimalSeparator: string;
  /** Thousands separator */
  thousandsSeparator: string;
}

/**
 * Region configuration
 */
export interface RegionConfig {
  /** Region code */
  region: TargetRegion;
  /** Region display name */
  name: string;
  /** Primary language */
  language: string;
  /** Unit system */
  unitSystem: UnitSystem;
  /** Date format style */
  dateFormat: DateFormatStyle;
  /** Currency information */
  currency: CurrencyInfo;
  /** Cultural notes */
  culturalNotes: string[];
}

/**
 * Idiom adaptation result
 */
export interface IdiomAdaptation {
  /** Original idiom found */
  original: string;
  /** Adapted version for target region */
  adapted: string;
  /** Explanation of the adaptation */
  explanation: string;
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Metaphor adaptation result
 */
export interface MetaphorAdaptation {
  /** Original metaphor found */
  original: string;
  /** Adapted version for target region */
  adapted: string;
  /** Cultural context explanation */
  culturalContext: string;
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Cultural reference adaptation
 */
export interface CulturalReferenceAdaptation {
  /** Original reference */
  original: string;
  /** Adapted reference */
  adapted: string;
  /** Type of reference */
  referenceType: 'celebrity' | 'brand' | 'event' | 'location' | 'media' | 'food' | 'sport' | 'other';
  /** Explanation */
  explanation: string;
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Unit conversion result
 */
export interface UnitConversion {
  /** Original text with unit */
  original: string;
  /** Converted text */
  converted: string;
  /** Original value */
  originalValue: number;
  /** Converted value */
  convertedValue: number;
  /** Original unit */
  originalUnit: string;
  /** Target unit */
  targetUnit: string;
}

/**
 * Currency conversion result
 */
export interface CurrencyConversion {
  /** Original text with currency */
  original: string;
  /** Converted text */
  converted: string;
  /** Original amount */
  originalAmount: number;
  /** Converted amount */
  convertedAmount: number;
  /** Original currency code */
  originalCurrency: string;
  /** Target currency code */
  targetCurrency: string;
  /** Exchange rate used */
  exchangeRate: number;
}

/**
 * Date format conversion result
 */
export interface DateFormatConversion {
  /** Original date text */
  original: string;
  /** Converted date text */
  converted: string;
  /** Original format */
  originalFormat: DateFormatStyle;
  /** Target format */
  targetFormat: DateFormatStyle;
}

/**
 * Cultural sensitivity flag
 */
export interface CulturalSensitivityFlag {
  /** Flagged text */
  text: string;
  /** Start position in content */
  startPosition: number;
  /** End position in content */
  endPosition: number;
  /** Sensitivity level */
  level: SensitivityLevel;
  /** Reason for flagging */
  reason: string;
  /** Affected regions */
  affectedRegions: TargetRegion[];
  /** Suggested alternative */
  suggestion?: string;
}

/**
 * Localization request
 */
export interface LocalizationRequest {
  /** Content to localize */
  content: string;
  /** Source region (optional, will be auto-detected if not provided) */
  sourceRegion?: TargetRegion;
  /** Target region */
  targetRegion: TargetRegion;
  /** Whether to adapt idioms */
  adaptIdioms: boolean;
  /** Whether to adapt metaphors */
  adaptMetaphors: boolean;
  /** Whether to adapt cultural references */
  adaptCulturalReferences: boolean;
  /** Whether to convert units */
  convertUnits: boolean;
  /** Whether to convert currency */
  convertCurrency: boolean;
  /** Whether to convert date formats */
  convertDateFormats: boolean;
  /** Whether to check cultural sensitivity */
  checkSensitivity: boolean;
  /** Preserve specific terms (won't be localized) */
  preserveTerms?: string[];
}

/**
 * Localization result
 */
export interface LocalizationResult {
  /** Unique result identifier */
  id: string;
  /** Original content */
  originalContent: string;
  /** Localized content */
  localizedContent: string;
  /** Source region */
  sourceRegion: TargetRegion;
  /** Target region */
  targetRegion: TargetRegion;
  /** Idiom adaptations made */
  idiomAdaptations: IdiomAdaptation[];
  /** Metaphor adaptations made */
  metaphorAdaptations: MetaphorAdaptation[];
  /** Cultural reference adaptations made */
  culturalReferenceAdaptations: CulturalReferenceAdaptation[];
  /** Unit conversions made */
  unitConversions: UnitConversion[];
  /** Currency conversions made */
  currencyConversions: CurrencyConversion[];
  /** Date format conversions made */
  dateFormatConversions: DateFormatConversion[];
  /** Cultural sensitivity flags */
  sensitivityFlags: CulturalSensitivityFlag[];
  /** Cultural appropriateness score (0-100) */
  culturalAppropriatenessScore: number;
  /** Total adaptations count */
  totalAdaptations: number;
  /** Processing timestamp */
  timestamp: Date;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Multi-region localization request
 */
export interface MultiRegionLocalizationRequest {
  /** Content to localize */
  content: string;
  /** Source region (optional) */
  sourceRegion?: TargetRegion;
  /** Target regions */
  targetRegions: TargetRegion[];
  /** Whether to adapt idioms */
  adaptIdioms: boolean;
  /** Whether to adapt metaphors */
  adaptMetaphors: boolean;
  /** Whether to adapt cultural references */
  adaptCulturalReferences: boolean;
  /** Whether to convert units */
  convertUnits: boolean;
  /** Whether to convert currency */
  convertCurrency: boolean;
  /** Whether to convert date formats */
  convertDateFormats: boolean;
  /** Whether to check cultural sensitivity */
  checkSensitivity: boolean;
  /** Preserve specific terms */
  preserveTerms?: string[];
}

/**
 * Multi-region localization result
 */
export interface MultiRegionLocalizationResult {
  /** Unique result identifier */
  id: string;
  /** Original content */
  originalContent: string;
  /** Source region */
  sourceRegion: TargetRegion;
  /** Results per region */
  regionResults: Record<TargetRegion, LocalizationResult>;
  /** Total regions processed */
  totalRegions: number;
  /** Processing timestamp */
  timestamp: Date;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Sensitivity check request
 */
export interface SensitivityCheckRequest {
  /** Content to check */
  content: string;
  /** Target regions to check against */
  targetRegions: TargetRegion[];
}

/**
 * Sensitivity check result
 */
export interface SensitivityCheckResult {
  /** Unique result identifier */
  id: string;
  /** Content checked */
  content: string;
  /** Sensitivity flags found */
  flags: CulturalSensitivityFlag[];
  /** Overall sensitivity level */
  overallLevel: SensitivityLevel;
  /** Regions checked */
  regionsChecked: TargetRegion[];
  /** Is content safe for all regions */
  isSafeForAllRegions: boolean;
  /** Processing timestamp */
  timestamp: Date;
}

/**
 * Localization service configuration
 */
export interface LocalizationConfig {
  /** Default source region */
  defaultSourceRegion: TargetRegion;
  /** Minimum confidence threshold for adaptations */
  minConfidenceThreshold: number;
  /** Processing timeout in milliseconds */
  timeout: number;
  /** Maximum content length */
  maxContentLength: number;
}
