/**
 * Translation Service Tests
 * Tests for translation integration including batch translation,
 * translation with humanization, and quality assessment
 * Requirements: 77
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TranslationService } from './translation.service';
import {
  SupportedLanguage,
  TranslationRequest,
  BatchTranslationRequest,
  TranslateAndHumanizeRequest,
  QualityAssessmentRequest,
} from './types';

describe('TranslationService', () => {
  let service: TranslationService;

  beforeEach(() => {
    service = new TranslationService();
  });

  describe('Language Support', () => {
    it('should return all supported languages', () => {
      const languages = service.getAllLanguages();
      
      expect(languages).toBeDefined();
      expect(languages.length).toBeGreaterThan(0);
      expect(languages.some(l => l.code === 'en')).toBe(true);
      expect(languages.some(l => l.code === 'es')).toBe(true);
      expect(languages.some(l => l.code === 'fr')).toBe(true);
      expect(languages.some(l => l.code === 'de')).toBe(true);
      expect(languages.some(l => l.code === 'pt')).toBe(true);
    });

    it('should return language info for valid language code', () => {
      const info = service.getLanguageInfo('en');
      
      expect(info).toBeDefined();
      expect(info.code).toBe('en');
      expect(info.name).toBe('English');
      expect(info.direction).toBe('ltr');
      expect(info.humanizationSupported).toBe(true);
    });

    it('should correctly identify supported languages', () => {
      expect(service.isLanguageSupported('en')).toBe(true);
      expect(service.isLanguageSupported('es')).toBe(true);
      expect(service.isLanguageSupported('invalid')).toBe(false);
      expect(service.isLanguageSupported('')).toBe(false);
    });

    it('should include RTL language support', () => {
      const arabicInfo = service.getLanguageInfo('ar');
      
      expect(arabicInfo).toBeDefined();
      expect(arabicInfo.direction).toBe('rtl');
    });
  });

  describe('Language Detection', () => {
    it('should detect English text', () => {
      const result = service.detectLanguage('The quick brown fox jumps over the lazy dog.');
      
      expect(result).toBeDefined();
      expect(result.language).toBe('en');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should detect Spanish text', () => {
      const result = service.detectLanguage('El rápido zorro marrón salta sobre el perro perezoso.');
      
      expect(result).toBeDefined();
      expect(result.language).toBe('es');
    });

    it('should detect French text', () => {
      const result = service.detectLanguage('Le renard brun rapide saute par-dessus le chien paresseux.');
      
      expect(result).toBeDefined();
      expect(result.language).toBe('fr');
    });

    it('should detect German text', () => {
      const result = service.detectLanguage('Der schnelle braune Fuchs springt über den faulen Hund.');
      
      expect(result).toBeDefined();
      expect(result.language).toBe('de');
    });

    it('should provide alternative language suggestions', () => {
      const result = service.detectLanguage('Hello world, this is a test.');
      
      expect(result.alternatives).toBeDefined();
      expect(Array.isArray(result.alternatives)).toBe(true);
    });
  });

  describe('Translation', () => {
    it('should translate text to target language', async () => {
      const request: TranslationRequest = {
        text: 'hello',
        sourceLanguage: 'en',
        targetLanguage: 'es',
      };

      const result = await service.translate(request);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.originalText).toBe('hello');
      expect(result.translatedText).toBeDefined();
      expect(result.sourceLanguage).toBe('en');
      expect(result.targetLanguage).toBe('es');
      expect(result.detectionScore).toBeGreaterThanOrEqual(0);
      expect(result.detectionScore).toBeLessThanOrEqual(100);
      expect(result.quality).toBeGreaterThanOrEqual(0);
      expect(result.quality).toBeLessThanOrEqual(100);
      expect(result.timestamp).toBeDefined();
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should auto-detect source language when not provided', async () => {
      const request: TranslationRequest = {
        text: 'The quick brown fox jumps over the lazy dog.',
        targetLanguage: 'es',
      };

      const result = await service.translate(request);

      expect(result).toBeDefined();
      expect(result.sourceLanguage).toBe('en');
    });

    it('should return same text when source and target are the same', async () => {
      const request: TranslationRequest = {
        text: 'Hello world',
        sourceLanguage: 'en',
        targetLanguage: 'en',
      };

      const result = await service.translate(request);

      expect(result.translatedText).toBe(request.text);
    });

    it('should include word counts in result', async () => {
      const request: TranslationRequest = {
        text: 'Hello world this is a test',
        sourceLanguage: 'en',
        targetLanguage: 'es',
      };

      const result = await service.translate(request);

      expect(result.originalWordCount).toBe(6);
      expect(result.translatedWordCount).toBeGreaterThan(0);
    });
  });

  describe('Batch Translation', () => {
    it('should translate to multiple languages simultaneously', async () => {
      const request: BatchTranslationRequest = {
        text: 'hello',
        sourceLanguage: 'en',
        targetLanguages: ['es', 'fr', 'de'],
      };

      const result = await service.batchTranslate(request);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.originalText).toBe('hello');
      expect(result.sourceLanguage).toBe('en');
      expect(result.translations).toHaveLength(3);
      expect(result.totalLanguages).toBe(3);
      expect(result.timestamp).toBeDefined();
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should include detection scores for each translation', async () => {
      const request: BatchTranslationRequest = {
        text: 'Thank you for your help',
        sourceLanguage: 'en',
        targetLanguages: ['es', 'fr'],
      };

      const result = await service.batchTranslate(request);

      for (const translation of result.translations) {
        expect(translation.detectionScore).toBeGreaterThanOrEqual(0);
        expect(translation.detectionScore).toBeLessThanOrEqual(100);
        expect(translation.quality).toBeGreaterThanOrEqual(0);
        expect(translation.quality).toBeLessThanOrEqual(100);
      }
    });

    it('should auto-detect source language for batch translation', async () => {
      const request: BatchTranslationRequest = {
        text: 'The weather is nice today.',
        targetLanguages: ['es', 'fr'],
      };

      const result = await service.batchTranslate(request);

      expect(result.sourceLanguage).toBe('en');
    });
  });

  describe('Translation with Humanization', () => {
    it('should translate and humanize text', async () => {
      const request: TranslateAndHumanizeRequest = {
        text: 'Hello, how are you doing today?',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        settings: {
          level: 3,
          strategy: 'casual',
        },
      };

      const result = await service.translateAndHumanize(request);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.originalText).toBe(request.text);
      expect(result.translatedText).toBeDefined();
      expect(result.humanizedText).toBeDefined();
      expect(result.sourceLanguage).toBe('en');
      expect(result.targetLanguage).toBe('es');
      expect(result.preHumanizationScore).toBeGreaterThanOrEqual(0);
      expect(result.postHumanizationScore).toBeGreaterThanOrEqual(0);
      expect(result.translationQuality).toBeGreaterThanOrEqual(0);
      expect(result.settingsApplied).toEqual(request.settings);
    });

    it('should apply different humanization levels', async () => {
      const baseRequest = {
        text: 'This is not a test. It will not fail.',
        sourceLanguage: 'en' as SupportedLanguage,
        targetLanguage: 'es' as SupportedLanguage,
      };

      const lowLevel = await service.translateAndHumanize({
        ...baseRequest,
        settings: { level: 1, strategy: 'auto' },
      });

      const highLevel = await service.translateAndHumanize({
        ...baseRequest,
        settings: { level: 5, strategy: 'casual' },
      });

      expect(lowLevel.humanizedText).toBeDefined();
      expect(highLevel.humanizedText).toBeDefined();
    });

    it('should support different strategies', async () => {
      const baseRequest = {
        text: 'The meeting will commence at noon.',
        sourceLanguage: 'en' as SupportedLanguage,
        targetLanguage: 'fr' as SupportedLanguage,
      };

      const casualResult = await service.translateAndHumanize({
        ...baseRequest,
        settings: { level: 4, strategy: 'casual' },
      });

      const professionalResult = await service.translateAndHumanize({
        ...baseRequest,
        settings: { level: 4, strategy: 'professional' },
      });

      expect(casualResult.settingsApplied.strategy).toBe('casual');
      expect(professionalResult.settingsApplied.strategy).toBe('professional');
    });
  });

  describe('Quality Assessment', () => {
    it('should assess translation quality', async () => {
      const request: QualityAssessmentRequest = {
        original: 'Hello, how are you?',
        translated: 'Hola, ¿cómo estás?',
        sourceLanguage: 'en',
        targetLanguage: 'es',
      };

      const result = await service.assessTranslationQuality(request);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(result.overall).toBeLessThanOrEqual(100);
      expect(result.fluency).toBeGreaterThanOrEqual(0);
      expect(result.adequacy).toBeGreaterThanOrEqual(0);
      expect(result.consistency).toBeGreaterThanOrEqual(0);
      expect(result.grammar).toBeGreaterThanOrEqual(0);
      expect(result.style).toBeGreaterThanOrEqual(0);
      expect(result.detectionScore).toBeGreaterThanOrEqual(0);
      expect(result.feedback).toBeDefined();
      expect(Array.isArray(result.feedback)).toBe(true);
    });

    it('should provide feedback for quality issues', async () => {
      const request: QualityAssessmentRequest = {
        original: 'Short text.',
        translated: 'This is a much longer translation that significantly differs from the original in length and may indicate issues with the translation quality.',
        sourceLanguage: 'en',
        targetLanguage: 'es',
      };

      const result = await service.assessTranslationQuality(request);

      expect(result.feedback.length).toBeGreaterThan(0);
      expect(result.feedback.some(f => f.category === 'adequacy')).toBe(true);
    });

    it('should detect grammar issues', async () => {
      const request: QualityAssessmentRequest = {
        original: 'Hello world',
        translated: 'Hola  mundo', // Double space
        sourceLanguage: 'en',
        targetLanguage: 'es',
      };

      const result = await service.assessTranslationQuality(request);

      expect(result.feedback.some(f => f.category === 'grammar')).toBe(true);
    });
  });

  describe('Request Validation', () => {
    it('should reject empty text', () => {
      const result = service.validateRequest('');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject whitespace-only text', () => {
      const result = service.validateRequest('   ');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should accept valid text', () => {
      const result = service.validateRequest('Hello world');
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject text exceeding max length', () => {
      const longText = 'a'.repeat(100001);
      const result = service.validateRequest(longText);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceed');
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in text', async () => {
      const request: TranslationRequest = {
        text: 'Hello! How are you? I\'m fine, thanks.',
        sourceLanguage: 'en',
        targetLanguage: 'es',
      };

      const result = await service.translate(request);

      expect(result).toBeDefined();
      expect(result.translatedText).toBeDefined();
    });

    it('should handle unicode characters', async () => {
      const request: TranslationRequest = {
        text: '你好世界',
        targetLanguage: 'en',
      };

      const result = await service.translate(request);

      expect(result).toBeDefined();
      expect(result.sourceLanguage).toBe('zh');
    });

    it('should handle empty target languages array in batch', async () => {
      const request: BatchTranslationRequest = {
        text: 'Hello',
        targetLanguages: [],
      };

      const result = await service.batchTranslate(request);

      expect(result.translations).toHaveLength(0);
      expect(result.totalLanguages).toBe(0);
    });

    it('should handle single word translation', async () => {
      const request: TranslationRequest = {
        text: 'yes',
        sourceLanguage: 'en',
        targetLanguage: 'es',
      };

      const result = await service.translate(request);

      expect(result).toBeDefined();
      expect(result.translatedText).toBeDefined();
    });
  });
});
