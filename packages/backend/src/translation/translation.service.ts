/**
 * Translation Service
 * Provides translation integration including batch translation,
 * translation with humanization, and quality assessment
 * Requirements: 77
 */

import crypto from 'crypto';
import {
  SupportedLanguage,
  LanguageInfo,
  TranslationRequest,
  TranslationResult,
  BatchTranslationRequest,
  BatchTranslationResult,
  TransformSettings,
  TranslateAndHumanizeRequest,
  TranslateAndHumanizeResult,
  QualityAssessmentRequest,
  QualityScore,
  QualityFeedback,
  LanguageDetectionResult,
  TranslationConfig,
} from './types';

/** Default configuration values */
const DEFAULT_SOURCE_LANGUAGE: SupportedLanguage = 'en';
const DEFAULT_HUMANIZATION_LEVEL = 3;
const DEFAULT_STRATEGY: 'casual' | 'professional' | 'academic' | 'auto' = 'auto';
const DEFAULT_TIMEOUT = 60000;
const MAX_TEXT_LENGTH = 100000;
const MIN_TEXT_LENGTH = 1;

/** Language information database */
const LANGUAGE_INFO: Record<SupportedLanguage, LanguageInfo> = {
  en: { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr', humanizationSupported: true },
  es: { code: 'es', name: 'Spanish', nativeName: 'Español', direction: 'ltr', humanizationSupported: true },
  fr: { code: 'fr', name: 'French', nativeName: 'Français', direction: 'ltr', humanizationSupported: true },
  de: { code: 'de', name: 'German', nativeName: 'Deutsch', direction: 'ltr', humanizationSupported: true },
  pt: { code: 'pt', name: 'Portuguese', nativeName: 'Português', direction: 'ltr', humanizationSupported: true },
  it: { code: 'it', name: 'Italian', nativeName: 'Italiano', direction: 'ltr', humanizationSupported: true },
  nl: { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', direction: 'ltr', humanizationSupported: true },
  ru: { code: 'ru', name: 'Russian', nativeName: 'Русский', direction: 'ltr', humanizationSupported: true },
  zh: { code: 'zh', name: 'Chinese', nativeName: '中文', direction: 'ltr', humanizationSupported: true },
  ja: { code: 'ja', name: 'Japanese', nativeName: '日本語', direction: 'ltr', humanizationSupported: true },
  ko: { code: 'ko', name: 'Korean', nativeName: '한국어', direction: 'ltr', humanizationSupported: true },
  ar: { code: 'ar', name: 'Arabic', nativeName: 'العربية', direction: 'rtl', humanizationSupported: true },
  hi: { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', direction: 'ltr', humanizationSupported: true },
  pl: { code: 'pl', name: 'Polish', nativeName: 'Polski', direction: 'ltr', humanizationSupported: true },
  tr: { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', direction: 'ltr', humanizationSupported: true },
};

/** Language detection patterns */
const LANGUAGE_PATTERNS: Record<SupportedLanguage, RegExp[]> = {
  en: [/\b(the|and|is|are|was|were|have|has|been|will|would|could|should)\b/gi],
  es: [/\b(el|la|los|las|es|son|está|están|que|de|en|con|por|para)\b/gi, /[áéíóúñ¿¡]/g],
  fr: [/\b(le|la|les|est|sont|que|de|en|avec|pour|dans|sur)\b/gi, /[àâçéèêëîïôùûü]/g],
  de: [/\b(der|die|das|ist|sind|und|oder|aber|wenn|weil|dass)\b/gi, /[äöüß]/g],
  pt: [/\b(o|a|os|as|é|são|que|de|em|com|por|para)\b/gi, /[ãõçáéíóú]/g],
  it: [/\b(il|la|lo|gli|le|è|sono|che|di|in|con|per)\b/gi, /[àèéìòù]/g],
  nl: [/\b(de|het|een|is|zijn|en|of|maar|als|omdat|dat)\b/gi],
  ru: [/[а-яА-ЯёЁ]/g],
  zh: [/[\u4e00-\u9fff]/g],
  ja: [/[\u3040-\u309f\u30a0-\u30ff]/g],
  ko: [/[\uac00-\ud7af\u1100-\u11ff]/g],
  ar: [/[\u0600-\u06ff]/g],
  hi: [/[\u0900-\u097f]/g],
  pl: [/\b(jest|są|i|lub|ale|że|który|która|które)\b/gi, /[ąćęłńóśźż]/g],
  tr: [/\b(ve|veya|ama|için|ile|bu|şu|o|bir)\b/gi, /[çğıöşü]/g],
};

/** Simple translation mappings for common phrases (simulation) */
const TRANSLATION_MAPPINGS: Record<string, Record<SupportedLanguage, string>> = {
  'hello': { en: 'hello', es: 'hola', fr: 'bonjour', de: 'hallo', pt: 'olá', it: 'ciao', nl: 'hallo', ru: 'привет', zh: '你好', ja: 'こんにちは', ko: '안녕하세요', ar: 'مرحبا', hi: 'नमस्ते', pl: 'cześć', tr: 'merhaba' },
  'goodbye': { en: 'goodbye', es: 'adiós', fr: 'au revoir', de: 'auf wiedersehen', pt: 'adeus', it: 'arrivederci', nl: 'tot ziens', ru: 'до свидания', zh: '再见', ja: 'さようなら', ko: '안녕히 가세요', ar: 'وداعا', hi: 'अलविदा', pl: 'do widzenia', tr: 'hoşça kal' },
  'thank you': { en: 'thank you', es: 'gracias', fr: 'merci', de: 'danke', pt: 'obrigado', it: 'grazie', nl: 'dank u', ru: 'спасибо', zh: '谢谢', ja: 'ありがとう', ko: '감사합니다', ar: 'شكرا', hi: 'धन्यवाद', pl: 'dziękuję', tr: 'teşekkür ederim' },
  'please': { en: 'please', es: 'por favor', fr: 's\'il vous plaît', de: 'bitte', pt: 'por favor', it: 'per favore', nl: 'alstublieft', ru: 'пожалуйста', zh: '请', ja: 'お願いします', ko: '제발', ar: 'من فضلك', hi: 'कृपया', pl: 'proszę', tr: 'lütfen' },
  'yes': { en: 'yes', es: 'sí', fr: 'oui', de: 'ja', pt: 'sim', it: 'sì', nl: 'ja', ru: 'да', zh: '是', ja: 'はい', ko: '예', ar: 'نعم', hi: 'हाँ', pl: 'tak', tr: 'evet' },
  'no': { en: 'no', es: 'no', fr: 'non', de: 'nein', pt: 'não', it: 'no', nl: 'nee', ru: 'нет', zh: '不', ja: 'いいえ', ko: '아니요', ar: 'لا', hi: 'नहीं', pl: 'nie', tr: 'hayır' },
};

/**
 * Translation Service class
 * Handles translation, batch translation, translation with humanization,
 * and quality assessment
 */
export class TranslationService {
  private config: TranslationConfig;

  constructor(serviceConfig?: Partial<TranslationConfig>) {
    this.config = this.buildConfig(serviceConfig);
  }

  /**
   * Builds the service configuration
   */
  private buildConfig(overrides?: Partial<TranslationConfig>): TranslationConfig {
    return {
      defaultSourceLanguage: overrides?.defaultSourceLanguage ?? DEFAULT_SOURCE_LANGUAGE,
      defaultHumanizationLevel: overrides?.defaultHumanizationLevel ?? DEFAULT_HUMANIZATION_LEVEL,
      defaultStrategy: overrides?.defaultStrategy ?? DEFAULT_STRATEGY,
      timeout: overrides?.timeout ?? DEFAULT_TIMEOUT,
      maxTextLength: overrides?.maxTextLength ?? MAX_TEXT_LENGTH,
      minTextLength: overrides?.minTextLength ?? MIN_TEXT_LENGTH,
    };
  }

  /**
   * Generates a unique identifier
   */
  private generateId(prefix: string): string {
    return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Gets language information
   */
  getLanguageInfo(language: SupportedLanguage): LanguageInfo {
    return LANGUAGE_INFO[language];
  }

  /**
   * Gets all supported languages
   */
  getAllLanguages(): LanguageInfo[] {
    return Object.values(LANGUAGE_INFO);
  }

  /**
   * Checks if a language is supported
   */
  isLanguageSupported(language: string): language is SupportedLanguage {
    return language in LANGUAGE_INFO;
  }

  /**
   * Detects the language of text
   * Requirement 77.1: Support translation to and from all supported languages
   */
  detectLanguage(text: string): LanguageDetectionResult {
    const scores: Record<SupportedLanguage, number> = {} as Record<SupportedLanguage, number>;
    const textLength = text.length;

    for (const [lang, patterns] of Object.entries(LANGUAGE_PATTERNS)) {
      let matchCount = 0;
      for (const pattern of patterns) {
        const matches = text.match(pattern);
        if (matches) {
          matchCount += matches.length;
        }
      }
      scores[lang as SupportedLanguage] = matchCount / Math.max(1, textLength / 100);
    }

    // Sort by score
    const sorted = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .map(([lang, score]) => ({
        language: lang as SupportedLanguage,
        confidence: Math.min(1, score / 10),
      }));

    const detected = sorted[0] || { language: 'en' as SupportedLanguage, confidence: 0.5 };
    
    return {
      language: detected.language,
      confidence: detected.confidence,
      alternatives: sorted.slice(1, 4),
    };
  }

  /**
   * Counts words in text
   */
  private countWords(text: string): number {
    return text.split(/\s+/).filter(w => w.length > 0).length;
  }

  /**
   * Simulates translation (in production, would call external API)
   * This is a simplified simulation for demonstration
   */
  private simulateTranslation(text: string, sourceLanguage: SupportedLanguage, targetLanguage: SupportedLanguage): string {
    if (sourceLanguage === targetLanguage) {
      return text;
    }

    let translated = text;

    // Apply known translations
    for (const [phrase, translations] of Object.entries(TRANSLATION_MAPPINGS)) {
      const sourcePhrase = translations[sourceLanguage];
      const targetPhrase = translations[targetLanguage];
      
      if (sourcePhrase && targetPhrase) {
        const pattern = new RegExp(`\\b${this.escapeRegex(sourcePhrase)}\\b`, 'gi');
        translated = translated.replace(pattern, targetPhrase);
      }
    }

    // Add language-specific markers for simulation
    const langInfo = LANGUAGE_INFO[targetLanguage];
    if (langInfo && translated === text) {
      // If no changes were made, add a marker to indicate translation occurred
      translated = `[${langInfo.name}] ${text}`;
    }

    return translated;
  }

  /**
   * Escapes special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Calculates a simulated detection score
   */
  private calculateDetectionScore(text: string, language: SupportedLanguage): number {
    // Simulate detection score based on text characteristics
    const wordCount = this.countWords(text);
    const avgWordLength = text.length / Math.max(1, wordCount);
    
    // Base score
    let score = 30;
    
    // Adjust based on text characteristics
    if (avgWordLength > 6) score += 10;
    if (wordCount < 10) score -= 10;
    if (wordCount > 100) score += 5;
    
    // Add some randomness for simulation
    score += Math.floor(Math.random() * 20) - 10;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculates translation quality score
   */
  private calculateQualityScore(original: string, translated: string): number {
    const originalWords = this.countWords(original);
    const translatedWords = this.countWords(translated);
    
    // Base quality score
    let quality = 75;
    
    // Adjust based on word count ratio (should be similar)
    const ratio = translatedWords / Math.max(1, originalWords);
    if (ratio >= 0.8 && ratio <= 1.2) {
      quality += 10;
    } else if (ratio < 0.5 || ratio > 2) {
      quality -= 15;
    }
    
    // Adjust based on length preservation
    const lengthRatio = translated.length / Math.max(1, original.length);
    if (lengthRatio >= 0.7 && lengthRatio <= 1.5) {
      quality += 5;
    }
    
    return Math.max(0, Math.min(100, quality));
  }

  /**
   * Translates text to target language
   * Requirement 77.1: Support translation to and from all supported languages
   */
  async translate(request: TranslationRequest): Promise<TranslationResult> {
    const startTime = Date.now();
    const id = this.generateId('trans');

    // Detect source language if not provided
    const sourceLanguage = request.sourceLanguage ?? this.detectLanguage(request.text).language;
    
    // Perform translation
    const translatedText = this.simulateTranslation(request.text, sourceLanguage, request.targetLanguage);
    
    // Calculate scores
    const detectionScore = this.calculateDetectionScore(translatedText, request.targetLanguage);
    const quality = this.calculateQualityScore(request.text, translatedText);

    return {
      id,
      originalText: request.text,
      translatedText,
      sourceLanguage,
      targetLanguage: request.targetLanguage,
      detectionScore,
      quality,
      originalWordCount: this.countWords(request.text),
      translatedWordCount: this.countWords(translatedText),
      timestamp: new Date(),
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Translates text to multiple languages simultaneously
   * Requirement 77.4: Support batch translation to multiple target languages
   */
  async batchTranslate(request: BatchTranslationRequest): Promise<BatchTranslationResult> {
    const startTime = Date.now();
    const id = this.generateId('batch_trans');

    // Detect source language if not provided
    const sourceLanguage = request.sourceLanguage ?? this.detectLanguage(request.text).language;

    // Translate to all target languages
    const translations: TranslationResult[] = [];
    
    for (const targetLanguage of request.targetLanguages) {
      const result = await this.translate({
        text: request.text,
        sourceLanguage,
        targetLanguage,
      });
      translations.push(result);
    }

    return {
      id,
      originalText: request.text,
      sourceLanguage,
      translations,
      totalLanguages: request.targetLanguages.length,
      timestamp: new Date(),
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Applies humanization to translated text
   * Simulates humanization transformations
   */
  private applyHumanization(text: string, settings: TransformSettings, language: SupportedLanguage): string {
    let humanized = text;
    const level = settings.level;

    // Apply transformations based on level
    if (level >= 2) {
      // Add slight variations
      humanized = humanized.replace(/\. /g, '. ');
    }

    if (level >= 3) {
      // Add more natural phrasing
      humanized = humanized.replace(/\bvery\b/gi, 'quite');
      humanized = humanized.replace(/\bimportant\b/gi, 'significant');
    }

    if (level >= 4) {
      // Add contractions for casual style
      if (settings.strategy === 'casual' || settings.strategy === 'auto') {
        humanized = humanized.replace(/\bdo not\b/gi, "don't");
        humanized = humanized.replace(/\bcannot\b/gi, "can't");
        humanized = humanized.replace(/\bwill not\b/gi, "won't");
        humanized = humanized.replace(/\bis not\b/gi, "isn't");
        humanized = humanized.replace(/\bare not\b/gi, "aren't");
      }
    }

    if (level >= 5) {
      // Maximum humanization - add more natural variations
      humanized = humanized.replace(/\bHowever,\b/g, 'But,');
      humanized = humanized.replace(/\bTherefore,\b/g, 'So,');
      humanized = humanized.replace(/\bFurthermore,\b/g, 'Also,');
    }

    return humanized;
  }

  /**
   * Translates and humanizes text
   * Requirement 77.2: Maintain humanization quality in target language
   * Requirement 77.3: Apply language-specific humanization to translated text
   */
  async translateAndHumanize(request: TranslateAndHumanizeRequest): Promise<TranslateAndHumanizeResult> {
    const startTime = Date.now();
    const id = this.generateId('trans_human');

    // Detect source language if not provided
    const sourceLanguage = request.sourceLanguage ?? this.detectLanguage(request.text).language;

    // First, translate the text
    const translatedText = this.simulateTranslation(request.text, sourceLanguage, request.targetLanguage);
    
    // Calculate pre-humanization detection score
    const preHumanizationScore = this.calculateDetectionScore(translatedText, request.targetLanguage);

    // Apply humanization
    const humanizedText = this.applyHumanization(translatedText, request.settings, request.targetLanguage);
    
    // Calculate post-humanization detection score
    const postHumanizationScore = this.calculateDetectionScore(humanizedText, request.targetLanguage);
    
    // Calculate translation quality
    const translationQuality = this.calculateQualityScore(request.text, translatedText);

    return {
      id,
      originalText: request.text,
      translatedText,
      humanizedText,
      sourceLanguage,
      targetLanguage: request.targetLanguage,
      preHumanizationScore,
      postHumanizationScore,
      translationQuality,
      settingsApplied: request.settings,
      timestamp: new Date(),
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Assesses translation quality
   * Requirement 77.5: Provide detection scores for each translated version
   */
  async assessTranslationQuality(request: QualityAssessmentRequest): Promise<QualityScore> {
    const startTime = Date.now();
    const id = this.generateId('quality');

    const feedback: QualityFeedback[] = [];
    
    // Calculate individual scores
    const originalWords = this.countWords(request.original);
    const translatedWords = this.countWords(request.translated);
    
    // Fluency score - how natural the translation reads
    let fluency = 80;
    const avgSentenceLength = request.translated.split(/[.!?]/).filter(s => s.trim()).length;
    if (avgSentenceLength > 0) {
      const wordsPerSentence = translatedWords / avgSentenceLength;
      if (wordsPerSentence > 25) {
        fluency -= 10;
        feedback.push({
          category: 'fluency',
          severity: 'warning',
          message: 'Some sentences may be too long for natural reading',
          suggestion: 'Consider breaking long sentences into shorter ones',
        });
      }
    }

    // Adequacy score - how well meaning is preserved
    let adequacy = 75;
    const wordRatio = translatedWords / Math.max(1, originalWords);
    if (wordRatio >= 0.8 && wordRatio <= 1.3) {
      adequacy += 15;
    } else {
      feedback.push({
        category: 'adequacy',
        severity: 'info',
        message: `Word count changed significantly (${Math.round(wordRatio * 100)}% of original)`,
        suggestion: 'Review translation for completeness',
      });
    }

    // Consistency score
    let consistency = 85;
    
    // Grammar score
    let grammar = 80;
    // Check for common issues
    if (/\s{2,}/.test(request.translated)) {
      grammar -= 5;
      feedback.push({
        category: 'grammar',
        severity: 'info',
        message: 'Multiple consecutive spaces detected',
        suggestion: 'Remove extra spaces',
      });
    }

    // Style score
    let style = 75;
    const langInfo = LANGUAGE_INFO[request.targetLanguage];
    if (langInfo?.humanizationSupported) {
      style += 10;
    }

    // Detection score
    const detectionScore = this.calculateDetectionScore(request.translated, request.targetLanguage);
    if (detectionScore > 70) {
      feedback.push({
        category: 'style',
        severity: 'warning',
        message: 'Translation may be detected as AI-generated',
        suggestion: 'Apply humanization to improve natural flow',
      });
    }

    // Calculate overall score
    const overall = Math.round(
      (fluency * 0.25 + adequacy * 0.25 + consistency * 0.15 + grammar * 0.2 + style * 0.15)
    );

    return {
      id,
      overall,
      fluency,
      adequacy,
      consistency,
      grammar,
      style,
      detectionScore,
      feedback,
      timestamp: new Date(),
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Validates translation request
   */
  validateRequest(text: string): { valid: boolean; error?: string } {
    if (!text || text.trim().length === 0) {
      return { valid: false, error: 'Text cannot be empty' };
    }

    if (text.length < this.config.minTextLength) {
      return { valid: false, error: `Text must be at least ${this.config.minTextLength} character(s)` };
    }

    if (text.length > this.config.maxTextLength) {
      return { valid: false, error: `Text cannot exceed ${this.config.maxTextLength} characters` };
    }

    return { valid: true };
  }
}
