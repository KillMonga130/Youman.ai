/**
 * Translation Service Types
 * Type definitions for translation integration including batch translation,
 * translation with humanization, and quality assessment
 * Requirements: 77
 */

/**
 * Supported languages for translation
 */
export type SupportedLanguage =
  | 'en'  // English
  | 'es'  // Spanish
  | 'fr'  // French
  | 'de'  // German
  | 'pt'  // Portuguese
  | 'it'  // Italian
  | 'nl'  // Dutch
  | 'ru'  // Russian
  | 'zh'  // Chinese
  | 'ja'  // Japanese
  | 'ko'  // Korean
  | 'ar'  // Arabic
  | 'hi'  // Hindi
  | 'pl'  // Polish
  | 'tr'; // Turkish

/**
 * Language information
 */
export interface LanguageInfo {
  /** Language code */
  code: SupportedLanguage;
  /** Language name in English */
  name: string;
  /** Native language name */
  nativeName: string;
  /** Text direction */
  direction: 'ltr' | 'rtl';
  /** Whether humanization is fully supported */
  humanizationSupported: boolean;
}

/**
 * Translation request
 */
export interface TranslationRequest {
  /** Text to translate */
  text: string;
  /** Source language (optional, will be auto-detected if not provided) */
  sourceLanguage?: SupportedLanguage;
  /** Target language */
  targetLanguage: SupportedLanguage;
}

/**
 * Translation result
 */
export interface TranslationResult {
  /** Unique result identifier */
  id: string;
  /** Original text */
  originalText: string;
  /** Translated text */
  translatedText: string;
  /** Source language */
  sourceLanguage: SupportedLanguage;
  /** Target language */
  targetLanguage: SupportedLanguage;
  /** AI detection score for translated text (0-100, lower is better) */
  detectionScore: number;
  /** Translation quality score (0-100, higher is better) */
  quality: number;
  /** Word count of original */
  originalWordCount: number;
  /** Word count of translation */
  translatedWordCount: number;
  /** Processing timestamp */
  timestamp: Date;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Batch translation request
 */
export interface BatchTranslationRequest {
  /** Text to translate */
  text: string;
  /** Source language (optional, will be auto-detected if not provided) */
  sourceLanguage?: SupportedLanguage;
  /** Target languages */
  targetLanguages: SupportedLanguage[];
}

/**
 * Batch translation result
 */
export interface BatchTranslationResult {
  /** Unique result identifier */
  id: string;
  /** Original text */
  originalText: string;
  /** Source language */
  sourceLanguage: SupportedLanguage;
  /** Results per language */
  translations: TranslationResult[];
  /** Total languages processed */
  totalLanguages: number;
  /** Processing timestamp */
  timestamp: Date;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Humanization settings for translation
 */
export interface TransformSettings {
  /** Humanization level (1-5) */
  level: number;
  /** Transformation strategy */
  strategy: 'casual' | 'professional' | 'academic' | 'auto';
  /** Whether to preserve specific terms */
  preserveTerms?: string[];
}

/**
 * Translation with humanization request
 */
export interface TranslateAndHumanizeRequest {
  /** Text to translate and humanize */
  text: string;
  /** Source language (optional) */
  sourceLanguage?: SupportedLanguage;
  /** Target language */
  targetLanguage: SupportedLanguage;
  /** Humanization settings */
  settings: TransformSettings;
}

/**
 * Translation with humanization result
 */
export interface TranslateAndHumanizeResult {
  /** Unique result identifier */
  id: string;
  /** Original text */
  originalText: string;
  /** Translated text (before humanization) */
  translatedText: string;
  /** Humanized translated text */
  humanizedText: string;
  /** Source language */
  sourceLanguage: SupportedLanguage;
  /** Target language */
  targetLanguage: SupportedLanguage;
  /** Detection score before humanization */
  preHumanizationScore: number;
  /** Detection score after humanization */
  postHumanizationScore: number;
  /** Translation quality score */
  translationQuality: number;
  /** Humanization settings applied */
  settingsApplied: TransformSettings;
  /** Processing timestamp */
  timestamp: Date;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Quality assessment request
 */
export interface QualityAssessmentRequest {
  /** Original text */
  original: string;
  /** Translated text */
  translated: string;
  /** Source language */
  sourceLanguage: SupportedLanguage;
  /** Target language */
  targetLanguage: SupportedLanguage;
}

/**
 * Quality score breakdown
 */
export interface QualityScore {
  /** Unique result identifier */
  id: string;
  /** Overall quality score (0-100) */
  overall: number;
  /** Fluency score - how natural the translation reads */
  fluency: number;
  /** Adequacy score - how well meaning is preserved */
  adequacy: number;
  /** Consistency score - terminology consistency */
  consistency: number;
  /** Grammar score */
  grammar: number;
  /** Style appropriateness score */
  style: number;
  /** AI detection score for the translation */
  detectionScore: number;
  /** Detailed feedback */
  feedback: QualityFeedback[];
  /** Processing timestamp */
  timestamp: Date;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Quality feedback item
 */
export interface QualityFeedback {
  /** Feedback category */
  category: 'fluency' | 'adequacy' | 'grammar' | 'style' | 'terminology';
  /** Severity level */
  severity: 'info' | 'warning' | 'error';
  /** Feedback message */
  message: string;
  /** Position in text (if applicable) */
  position?: number;
  /** Suggestion for improvement */
  suggestion?: string;
}

/**
 * Language detection result
 */
export interface LanguageDetectionResult {
  /** Detected language */
  language: SupportedLanguage;
  /** Confidence score (0-1) */
  confidence: number;
  /** Alternative languages detected */
  alternatives: Array<{
    language: SupportedLanguage;
    confidence: number;
  }>;
}

/**
 * Translation service configuration
 */
export interface TranslationConfig {
  /** Default source language */
  defaultSourceLanguage: SupportedLanguage;
  /** Default humanization level */
  defaultHumanizationLevel: number;
  /** Default transformation strategy */
  defaultStrategy: 'casual' | 'professional' | 'academic' | 'auto';
  /** Processing timeout in milliseconds */
  timeout: number;
  /** Maximum text length */
  maxTextLength: number;
  /** Minimum text length */
  minTextLength: number;
}
