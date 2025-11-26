/**
 * Language Detection Module
 * Detects the language of input text and validates against supported languages.
 * Requirements: 8.1, 8.3, 8.4, 8.5
 */

import { franc } from 'franc-min';
import { LanguageDetectionResult, SupportedLanguage } from './types';

/** Mapping from franc language codes to ISO 639-1 codes */
const FRANC_TO_ISO: Record<string, string> = {
  eng: 'en',
  spa: 'es',
  fra: 'fr',
  deu: 'de',
  por: 'pt',
  ita: 'it',
  nld: 'nl',
  rus: 'ru',
  jpn: 'ja',
  zho: 'zh',
  ara: 'ar',
  kor: 'ko',
  und: 'unknown',
};

/** Supported languages for humanization */
export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['en', 'es', 'fr', 'de', 'pt'];

/** Minimum text length for reliable detection */
const MIN_TEXT_LENGTH = 20;

/** Confidence threshold for uncertain detection */
const CONFIDENCE_THRESHOLD = 0.5;

/**
 * Detects the language of the given text
 * @param text - The text to analyze
 * @returns Language detection result with confidence score
 */
export function detectLanguage(text: string): LanguageDetectionResult {
  // Handle empty or very short text
  if (!text || text.trim().length < MIN_TEXT_LENGTH) {
    return {
      language: 'unknown',
      confidence: 0,
      isSupported: false,
      supportedLanguages: SUPPORTED_LANGUAGES,
    };
  }

  // Use franc for language detection
  const francResult = franc(text);
  const isoCode = FRANC_TO_ISO[francResult] || francResult;

  // Calculate confidence based on text characteristics
  const confidence = calculateConfidence(text, francResult);
  const isSupported = SUPPORTED_LANGUAGES.includes(isoCode as SupportedLanguage);

  // If confidence is low, mark as uncertain
  if (confidence < CONFIDENCE_THRESHOLD) {
    return {
      language: isoCode,
      confidence,
      isSupported,
      supportedLanguages: SUPPORTED_LANGUAGES,
    };
  }

  const result: LanguageDetectionResult = {
    language: isoCode,
    confidence,
    isSupported,
  };

  if (!isSupported) {
    result.supportedLanguages = SUPPORTED_LANGUAGES;
  }

  return result;
}

/**
 * Calculates confidence score for language detection
 * @param text - The analyzed text
 * @param francResult - The franc detection result
 * @returns Confidence score between 0 and 1
 */
function calculateConfidence(text: string, francResult: string): number {
  // Base confidence starts at 0.7 for any detection
  let confidence = 0.7;

  // Increase confidence for longer texts
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  if (wordCount > 100) confidence += 0.1;
  if (wordCount > 500) confidence += 0.1;

  // Decrease confidence for unknown language
  if (francResult === 'und') {
    confidence = 0.1;
  }

  // Check for mixed language indicators (reduces confidence)
  const hasMultipleScripts = detectMultipleScripts(text);
  if (hasMultipleScripts) {
    confidence -= 0.2;
  }

  return Math.max(0, Math.min(1, confidence));
}

/**
 * Detects if text contains multiple writing scripts
 * @param text - The text to analyze
 * @returns True if multiple scripts detected
 */
function detectMultipleScripts(text: string): boolean {
  const latinPattern = /[a-zA-Z]/;
  const cyrillicPattern = /[\u0400-\u04FF]/;
  const cjkPattern = /[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]/;
  const arabicPattern = /[\u0600-\u06FF]/;

  const scripts = [
    latinPattern.test(text),
    cyrillicPattern.test(text),
    cjkPattern.test(text),
    arabicPattern.test(text),
  ].filter(Boolean);

  return scripts.length > 1;
}

/**
 * Checks if a language code is supported
 * @param languageCode - ISO 639-1 language code
 * @returns True if the language is supported
 */
export function isLanguageSupported(languageCode: string): boolean {
  return SUPPORTED_LANGUAGES.includes(languageCode as SupportedLanguage);
}

/**
 * Gets the list of supported languages with their names
 * @returns Array of supported language info
 */
export function getSupportedLanguages(): Array<{ code: SupportedLanguage; name: string }> {
  return [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'pt', name: 'Portuguese' },
  ];
}
