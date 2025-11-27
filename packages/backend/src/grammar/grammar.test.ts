/**
 * Grammar Style Preferences Tests
 * Tests for grammar style configuration including Oxford comma,
 * quote styles, date/number formats, and regional variant support
 * Requirements: 103
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GrammarService } from './grammar.service';
import {
  RegionalVariant,
  QuoteStyle,
  DateFormat,
  NumberFormat,
  GrammarStylePreferences,
} from './types';

describe('GrammarService', () => {
  let service: GrammarService;

  beforeEach(() => {
    service = new GrammarService();
  });

  describe('createPreferences', () => {
    it('should create preferences with default values for US variant', async () => {
      const preferences = await service.createPreferences({
        userId: 'user-1',
        regionalVariant: 'US',
      });

      expect(preferences.userId).toBe('user-1');
      expect(preferences.regionalVariant).toBe('US');
      expect(preferences.useOxfordComma).toBe(true);
      expect(preferences.quoteStyle).toBe('double');
      expect(preferences.dateFormat).toBe('MM/DD/YYYY');
      expect(preferences.numberFormat.decimalSeparator).toBe('.');
      expect(preferences.numberFormat.thousandsSeparator).toBe(',');
      expect(preferences.numberFormat.currencySymbol).toBe('$');
    });

    it('should create preferences with default values for UK variant', async () => {
      const preferences = await service.createPreferences({
        userId: 'user-2',
        regionalVariant: 'UK',
      });

      expect(preferences.regionalVariant).toBe('UK');
      expect(preferences.useOxfordComma).toBe(false);
      expect(preferences.quoteStyle).toBe('single');
      expect(preferences.dateFormat).toBe('DD/MM/YYYY');
      expect(preferences.numberFormat.currencySymbol).toBe('£');
    });

    it('should create preferences with custom values', async () => {
      const preferences = await service.createPreferences({
        userId: 'user-3',
        regionalVariant: 'US',
        useOxfordComma: false,
        quoteStyle: 'single',
        dateFormat: 'YYYY-MM-DD',
      });

      expect(preferences.useOxfordComma).toBe(false);
      expect(preferences.quoteStyle).toBe('single');
      expect(preferences.dateFormat).toBe('YYYY-MM-DD');
    });
  });

  describe('getPreferences', () => {
    it('should return null for non-existent user', async () => {
      const preferences = await service.getPreferences('non-existent');
      expect(preferences).toBeNull();
    });

    it('should return preferences for existing user', async () => {
      await service.createPreferences({
        userId: 'user-get-test',
        regionalVariant: 'CA',
      });

      const preferences = await service.getPreferences('user-get-test');
      expect(preferences).not.toBeNull();
      expect(preferences?.regionalVariant).toBe('CA');
    });
  });

  describe('updatePreferences', () => {
    it('should update existing preferences', async () => {
      await service.createPreferences({
        userId: 'user-update-test',
        regionalVariant: 'US',
      });

      const updated = await service.updatePreferences('user-update-test', {
        useOxfordComma: false,
        quoteStyle: 'single',
      });

      expect(updated).not.toBeNull();
      expect(updated?.useOxfordComma).toBe(false);
      expect(updated?.quoteStyle).toBe('single');
      expect(updated?.regionalVariant).toBe('US'); // Unchanged
    });

    it('should return null for non-existent user', async () => {
      const updated = await service.updatePreferences('non-existent', {
        useOxfordComma: false,
      });
      expect(updated).toBeNull();
    });
  });

  describe('deletePreferences', () => {
    it('should delete existing preferences', async () => {
      await service.createPreferences({
        userId: 'user-delete-test',
        regionalVariant: 'AU',
      });

      const deleted = await service.deletePreferences('user-delete-test');
      expect(deleted).toBe(true);

      const preferences = await service.getPreferences('user-delete-test');
      expect(preferences).toBeNull();
    });

    it('should return false for non-existent user', async () => {
      const deleted = await service.deletePreferences('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('getDefaultPreferences', () => {
    it('should return correct defaults for US', () => {
      const defaults = service.getDefaultPreferences('US');
      expect(defaults.useOxfordComma).toBe(true);
      expect(defaults.quoteStyle).toBe('double');
      expect(defaults.dateFormat).toBe('MM/DD/YYYY');
    });

    it('should return correct defaults for UK', () => {
      const defaults = service.getDefaultPreferences('UK');
      expect(defaults.useOxfordComma).toBe(false);
      expect(defaults.quoteStyle).toBe('single');
      expect(defaults.dateFormat).toBe('DD/MM/YYYY');
    });

    it('should return correct defaults for CA', () => {
      const defaults = service.getDefaultPreferences('CA');
      expect(defaults.useOxfordComma).toBe(true);
      expect(defaults.dateFormat).toBe('YYYY-MM-DD');
    });

    it('should return correct defaults for AU', () => {
      const defaults = service.getDefaultPreferences('AU');
      expect(defaults.useOxfordComma).toBe(false);
      expect(defaults.quoteStyle).toBe('single');
      expect(defaults.dateFormat).toBe('DD/MM/YYYY');
    });
  });

  describe('applyPreferences - Oxford Comma', () => {
    it('should add Oxford comma when preference is true', async () => {
      const preferences = await service.createPreferences({
        userId: 'oxford-add-test',
        useOxfordComma: true,
      });

      const result = await service.applyPreferences(
        'I like apples, oranges and bananas.',
        preferences
      );

      expect(result.success).toBe(true);
      expect(result.transformedText).toBe('I like apples, oranges, and bananas.');
      expect(result.changes.length).toBeGreaterThan(0);
      expect(result.changes[0].type).toBe('oxford_comma');
    });

    it('should remove Oxford comma when preference is false', async () => {
      const preferences = await service.createPreferences({
        userId: 'oxford-remove-test',
        useOxfordComma: false,
      });

      const result = await service.applyPreferences(
        'I like apples, oranges, and bananas.',
        preferences
      );

      expect(result.success).toBe(true);
      expect(result.transformedText).toBe('I like apples, oranges and bananas.');
    });

    it('should handle "or" conjunction', async () => {
      const preferences = await service.createPreferences({
        userId: 'oxford-or-test',
        useOxfordComma: true,
      });

      const result = await service.applyPreferences(
        'Choose red, blue or green.',
        preferences
      );

      expect(result.success).toBe(true);
      expect(result.transformedText).toBe('Choose red, blue, or green.');
    });
  });

  describe('applyPreferences - Quote Style', () => {
    it('should convert double quotes to single quotes', async () => {
      const preferences = await service.createPreferences({
        userId: 'quote-single-test',
        quoteStyle: 'single',
      });

      const result = await service.applyPreferences(
        'He said "hello" to everyone.',
        preferences
      );

      expect(result.success).toBe(true);
      expect(result.transformedText).toBe("He said 'hello' to everyone.");
    });

    it('should convert single quotes to double quotes', async () => {
      const preferences = await service.createPreferences({
        userId: 'quote-double-test',
        quoteStyle: 'double',
      });

      const result = await service.applyPreferences(
        "He said 'hello world' to everyone.",
        preferences
      );

      expect(result.success).toBe(true);
      expect(result.transformedText).toBe('He said "hello world" to everyone.');
    });
  });

  describe('applyPreferences - Regional Spelling', () => {
    it('should convert US spelling to UK spelling', async () => {
      const preferences = await service.createPreferences({
        userId: 'spelling-uk-test',
        regionalVariant: 'UK',
      });

      const result = await service.applyPreferences(
        'The color of the center is gray.',
        preferences
      );

      expect(result.success).toBe(true);
      // Check that at least some spelling changes were made
      expect(result.changes.some(c => c.type === 'spelling')).toBe(true);
    });

    it('should convert UK spelling to US spelling', async () => {
      const preferences = await service.createPreferences({
        userId: 'spelling-us-test',
        regionalVariant: 'US',
      });

      const result = await service.applyPreferences(
        'The colour of the centre is grey.',
        preferences
      );

      expect(result.success).toBe(true);
      expect(result.changes.some(c => c.type === 'spelling')).toBe(true);
    });
  });

  describe('formatDate', () => {
    const testDate = new Date('2024-03-15');

    it('should format date as MM/DD/YYYY', () => {
      const formatted = service.formatDate(testDate, 'MM/DD/YYYY');
      expect(formatted).toBe('03/15/2024');
    });

    it('should format date as DD/MM/YYYY', () => {
      const formatted = service.formatDate(testDate, 'DD/MM/YYYY');
      expect(formatted).toBe('15/03/2024');
    });

    it('should format date as YYYY-MM-DD', () => {
      const formatted = service.formatDate(testDate, 'YYYY-MM-DD');
      expect(formatted).toBe('2024-03-15');
    });

    it('should format date as DD-MM-YYYY', () => {
      const formatted = service.formatDate(testDate, 'DD-MM-YYYY');
      expect(formatted).toBe('15-03-2024');
    });

    it('should format date as MMMM D, YYYY', () => {
      const formatted = service.formatDate(testDate, 'MMMM D, YYYY');
      expect(formatted).toBe('March 15, 2024');
    });

    it('should format date as D MMMM YYYY', () => {
      const formatted = service.formatDate(testDate, 'D MMMM YYYY');
      expect(formatted).toBe('15 March 2024');
    });
  });

  describe('formatNumber', () => {
    it('should format number with US format', () => {
      const format: NumberFormat = {
        decimalSeparator: '.',
        thousandsSeparator: ',',
        currencyPosition: 'before',
        currencySymbol: '$',
      };

      const formatted = service.formatNumber(1234567.89, format);
      expect(formatted).toBe('1,234,567.89');
    });

    it('should format number with European format', () => {
      const format: NumberFormat = {
        decimalSeparator: ',',
        thousandsSeparator: '.',
        currencyPosition: 'after',
        currencySymbol: '€',
      };

      const formatted = service.formatNumber(1234567.89, format);
      expect(formatted).toBe('1.234.567,89');
    });

    it('should format number with space separator', () => {
      const format: NumberFormat = {
        decimalSeparator: ',',
        thousandsSeparator: ' ',
        currencyPosition: 'after',
        currencySymbol: '€',
      };

      const formatted = service.formatNumber(1234567.89, format);
      expect(formatted).toBe('1 234 567,89');
    });
  });

  describe('formatCurrency', () => {
    it('should format currency with symbol before', () => {
      const format: NumberFormat = {
        decimalSeparator: '.',
        thousandsSeparator: ',',
        currencyPosition: 'before',
        currencySymbol: '$',
      };

      const formatted = service.formatCurrency(1234.56, format);
      expect(formatted).toBe('$1,234.56');
    });

    it('should format currency with symbol after', () => {
      const format: NumberFormat = {
        decimalSeparator: ',',
        thousandsSeparator: '.',
        currencyPosition: 'after',
        currencySymbol: '€',
      };

      const formatted = service.formatCurrency(1234.56, format);
      expect(formatted).toBe('1.234,56€');
    });
  });

  describe('analyzeText', () => {
    it('should detect US spelling variant', async () => {
      const result = await service.analyzeText(
        'The color of the center is gray. I organized the program.'
      );

      expect(result.detectedVariant).toBe('US');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should detect UK spelling variant', async () => {
      const result = await service.analyzeText(
        'The colour of the centre is grey. I organised the programme.'
      );

      expect(result.detectedVariant).toBe('UK');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should detect double quote style', async () => {
      const result = await service.analyzeText(
        'He said "hello" and she said "goodbye".'
      );

      expect(result.detectedQuoteStyle).toBe('double');
    });

    it('should detect single quote style', async () => {
      const result = await service.analyzeText(
        "He said 'hello' and she said 'goodbye'."
      );

      expect(result.detectedQuoteStyle).toBe('single');
    });

    it('should detect Oxford comma usage', async () => {
      const result = await service.analyzeText(
        'I like apples, oranges, and bananas. She likes red, blue, and green.'
      );

      expect(result.usesOxfordComma).toBe(true);
    });

    it('should detect lack of Oxford comma', async () => {
      const result = await service.analyzeText(
        'I like apples, oranges and bananas. She likes red, blue and green.'
      );

      expect(result.usesOxfordComma).toBe(false);
    });

    it('should detect inconsistent quote styles', async () => {
      const result = await service.analyzeText(
        'He said "hello" and she said \'goodbye\'.'
      );

      expect(result.issues.some(i => i.type === 'inconsistent_quotes')).toBe(true);
    });

    it('should detect inconsistent spelling', async () => {
      const result = await service.analyzeText(
        'The color of the centre is gray. I organised the program.'
      );

      expect(result.issues.some(i => i.type === 'inconsistent_spelling')).toBe(true);
    });
  });

  describe('getAvailableVariants', () => {
    it('should return all available variants', () => {
      const variants = service.getAvailableVariants();
      expect(variants).toContain('US');
      expect(variants).toContain('UK');
      expect(variants).toContain('CA');
      expect(variants).toContain('AU');
      expect(variants.length).toBe(4);
    });
  });

  describe('getRegionalConfig', () => {
    it('should return config for US variant', () => {
      const config = service.getRegionalConfig('US');
      expect(config.variant).toBe('US');
      expect(config.defaultOxfordComma).toBe(true);
      expect(config.defaultQuoteStyle).toBe('double');
    });

    it('should return config for UK variant', () => {
      const config = service.getRegionalConfig('UK');
      expect(config.variant).toBe('UK');
      expect(config.defaultOxfordComma).toBe(false);
      expect(config.defaultQuoteStyle).toBe('single');
    });
  });
});
