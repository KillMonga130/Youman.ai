/**
 * Content Localization Service Tests
 * Tests for idiom/metaphor adaptation, cultural reference localization,
 * unit/currency conversion, and cultural sensitivity checking
 * Requirements: 111
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LocalizationService } from './localization.service';
import { TargetRegion, LocalizationRequest } from './types';

describe('LocalizationService', () => {
  let service: LocalizationService;

  beforeEach(() => {
    service = new LocalizationService();
  });

  describe('getRegionConfig', () => {
    it('should return correct config for US', () => {
      const config = service.getRegionConfig('us');
      
      expect(config.region).toBe('us');
      expect(config.name).toBe('United States');
      expect(config.unitSystem).toBe('imperial');
      expect(config.dateFormat).toBe('mdy');
      expect(config.currency.code).toBe('USD');
    });

    it('should return correct config for UK', () => {
      const config = service.getRegionConfig('uk');
      
      expect(config.region).toBe('uk');
      expect(config.name).toBe('United Kingdom');
      expect(config.unitSystem).toBe('metric');
      expect(config.dateFormat).toBe('dmy');
      expect(config.currency.code).toBe('GBP');
    });

    it('should return correct config for Japan', () => {
      const config = service.getRegionConfig('jp');
      
      expect(config.region).toBe('jp');
      expect(config.unitSystem).toBe('metric');
      expect(config.dateFormat).toBe('ymd');
      expect(config.currency.code).toBe('JPY');
    });

    it('should return correct config for Germany', () => {
      const config = service.getRegionConfig('de');
      
      expect(config.region).toBe('de');
      expect(config.unitSystem).toBe('metric');
      expect(config.currency.code).toBe('EUR');
      expect(config.currency.symbolPosition).toBe('after');
    });
  });

  describe('getAllRegions', () => {
    it('should return all supported regions', () => {
      const regions = service.getAllRegions();
      
      expect(regions.length).toBeGreaterThanOrEqual(14);
      expect(regions.map(r => r.region)).toContain('us');
      expect(regions.map(r => r.region)).toContain('uk');
      expect(regions.map(r => r.region)).toContain('jp');
      expect(regions.map(r => r.region)).toContain('de');
    });
  });

  describe('detectSourceRegion', () => {
    it('should detect US region from dollar sign and American spelling', () => {
      const content = 'The color of the $50 item is blue.';
      const region = service.detectSourceRegion(content);
      
      expect(region).toBe('us');
    });

    it('should detect UK region from pound sign and British spelling', () => {
      const content = 'The colour of the £50 item is blue.';
      const region = service.detectSourceRegion(content);
      
      expect(region).toBe('uk');
    });

    it('should detect Australian region from A$ and slang', () => {
      const content = 'G\'day mate, that costs A$50.';
      const region = service.detectSourceRegion(content);
      
      expect(region).toBe('au');
    });
  });

  describe('localize - idiom adaptation', () => {
    it('should adapt idioms for target region', async () => {
      const request: LocalizationRequest = {
        content: 'This task is a piece of cake.',
        targetRegion: 'au',
        adaptIdioms: true,
        adaptMetaphors: false,
        adaptCulturalReferences: false,
        convertUnits: false,
        convertCurrency: false,
        convertDateFormats: false,
        checkSensitivity: false,
      };

      const result = await service.localize(request);

      expect(result.id).toBeDefined();
      expect(result.idiomAdaptations.length).toBeGreaterThan(0);
      expect(result.localizedContent).toContain('easy as');
    });

    it('should adapt "cost an arm and a leg" for UK', async () => {
      const request: LocalizationRequest = {
        content: 'That car cost an arm and a leg.',
        targetRegion: 'uk',
        adaptIdioms: true,
        adaptMetaphors: false,
        adaptCulturalReferences: false,
        convertUnits: false,
        convertCurrency: false,
        convertDateFormats: false,
        checkSensitivity: false,
      };

      const result = await service.localize(request);

      expect(result.idiomAdaptations.length).toBeGreaterThan(0);
      expect(result.localizedContent).toContain('cost a bomb');
    });

    it('should preserve terms when specified', async () => {
      const request: LocalizationRequest = {
        content: 'This task is a piece of cake.',
        targetRegion: 'au',
        adaptIdioms: true,
        adaptMetaphors: false,
        adaptCulturalReferences: false,
        convertUnits: false,
        convertCurrency: false,
        convertDateFormats: false,
        checkSensitivity: false,
        preserveTerms: ['piece of cake'],
      };

      const result = await service.localize(request);

      expect(result.idiomAdaptations.length).toBe(0);
      expect(result.localizedContent).toContain('piece of cake');
    });
  });

  describe('localize - metaphor adaptation', () => {
    it('should adapt metaphors for target region', async () => {
      const request: LocalizationRequest = {
        content: 'Remember, time is money in business.',
        targetRegion: 'mx',
        adaptIdioms: false,
        adaptMetaphors: true,
        adaptCulturalReferences: false,
        convertUnits: false,
        convertCurrency: false,
        convertDateFormats: false,
        checkSensitivity: false,
      };

      const result = await service.localize(request);

      expect(result.metaphorAdaptations.length).toBeGreaterThan(0);
      expect(result.localizedContent).toContain('time is gold');
    });

    it('should adapt "the world is your oyster" for Germany', async () => {
      const request: LocalizationRequest = {
        content: 'With your skills, the world is your oyster.',
        targetRegion: 'de',
        adaptIdioms: false,
        adaptMetaphors: true,
        adaptCulturalReferences: false,
        convertUnits: false,
        convertCurrency: false,
        convertDateFormats: false,
        checkSensitivity: false,
      };

      const result = await service.localize(request);

      expect(result.metaphorAdaptations.length).toBeGreaterThan(0);
      expect(result.localizedContent).toContain('the world is open to you');
    });
  });

  describe('localize - cultural reference adaptation', () => {
    it('should adapt Super Bowl reference for UK', async () => {
      const request: LocalizationRequest = {
        content: 'The event was as big as the Super Bowl.',
        targetRegion: 'uk',
        adaptIdioms: false,
        adaptMetaphors: false,
        adaptCulturalReferences: true,
        convertUnits: false,
        convertCurrency: false,
        convertDateFormats: false,
        checkSensitivity: false,
      };

      const result = await service.localize(request);

      expect(result.culturalReferenceAdaptations.length).toBeGreaterThan(0);
      expect(result.localizedContent).toContain('FA Cup Final');
    });

    it('should adapt Thanksgiving reference for India', async () => {
      const request: LocalizationRequest = {
        content: 'We gathered like Thanksgiving dinner.',
        targetRegion: 'in',
        adaptIdioms: false,
        adaptMetaphors: false,
        adaptCulturalReferences: true,
        convertUnits: false,
        convertCurrency: false,
        convertDateFormats: false,
        checkSensitivity: false,
      };

      const result = await service.localize(request);

      expect(result.culturalReferenceAdaptations.length).toBeGreaterThan(0);
      expect(result.localizedContent).toContain('Diwali celebration');
    });

    it('should adapt Hollywood reference for India', async () => {
      const request: LocalizationRequest = {
        content: 'It was like a Hollywood movie.',
        targetRegion: 'in',
        adaptIdioms: false,
        adaptMetaphors: false,
        adaptCulturalReferences: true,
        convertUnits: false,
        convertCurrency: false,
        convertDateFormats: false,
        checkSensitivity: false,
      };

      const result = await service.localize(request);

      expect(result.culturalReferenceAdaptations.length).toBeGreaterThan(0);
      expect(result.localizedContent).toContain('Bollywood');
    });
  });

  describe('localize - unit conversion', () => {
    it('should convert miles to kilometers for UK', async () => {
      const request: LocalizationRequest = {
        content: 'The distance is 10 miles.',
        sourceRegion: 'us',
        targetRegion: 'uk',
        adaptIdioms: false,
        adaptMetaphors: false,
        adaptCulturalReferences: false,
        convertUnits: true,
        convertCurrency: false,
        convertDateFormats: false,
        checkSensitivity: false,
      };

      const result = await service.localize(request);

      expect(result.unitConversions.length).toBeGreaterThan(0);
      expect(result.localizedContent).toContain('kilometer');
      expect(result.unitConversions[0]!.convertedValue).toBeCloseTo(16.09, 1);
    });

    it('should convert pounds to kilograms for Germany', async () => {
      const request: LocalizationRequest = {
        content: 'The package weighs 5 pounds.',
        sourceRegion: 'us',
        targetRegion: 'de',
        adaptIdioms: false,
        adaptMetaphors: false,
        adaptCulturalReferences: false,
        convertUnits: true,
        convertCurrency: false,
        convertDateFormats: false,
        checkSensitivity: false,
      };

      const result = await service.localize(request);

      expect(result.unitConversions.length).toBeGreaterThan(0);
      expect(result.localizedContent).toContain('kilogram');
      expect(result.unitConversions[0]!.convertedValue).toBeCloseTo(2.27, 1);
    });

    it('should not convert units when source and target use same system', async () => {
      const request: LocalizationRequest = {
        content: 'The distance is 10 kilometers.',
        sourceRegion: 'uk',
        targetRegion: 'de',
        adaptIdioms: false,
        adaptMetaphors: false,
        adaptCulturalReferences: false,
        convertUnits: true,
        convertCurrency: false,
        convertDateFormats: false,
        checkSensitivity: false,
      };

      const result = await service.localize(request);

      expect(result.unitConversions.length).toBe(0);
    });
  });

  describe('localize - currency conversion', () => {
    it('should convert USD to GBP for UK', async () => {
      const request: LocalizationRequest = {
        content: 'The price is $100.',
        sourceRegion: 'us',
        targetRegion: 'uk',
        adaptIdioms: false,
        adaptMetaphors: false,
        adaptCulturalReferences: false,
        convertUnits: false,
        convertCurrency: true,
        convertDateFormats: false,
        checkSensitivity: false,
      };

      const result = await service.localize(request);

      expect(result.currencyConversions.length).toBeGreaterThan(0);
      expect(result.localizedContent).toContain('£');
      expect(result.currencyConversions[0]!.targetCurrency).toBe('GBP');
    });

    it('should convert USD to EUR for Germany', async () => {
      const request: LocalizationRequest = {
        content: 'The item costs $50.',
        sourceRegion: 'us',
        targetRegion: 'de',
        adaptIdioms: false,
        adaptMetaphors: false,
        adaptCulturalReferences: false,
        convertUnits: false,
        convertCurrency: true,
        convertDateFormats: false,
        checkSensitivity: false,
      };

      const result = await service.localize(request);

      expect(result.currencyConversions.length).toBeGreaterThan(0);
      expect(result.localizedContent).toContain('€');
      expect(result.currencyConversions[0]!.targetCurrency).toBe('EUR');
    });

    it('should not convert currency when source and target use same currency', async () => {
      const request: LocalizationRequest = {
        content: 'The price is €100.',
        sourceRegion: 'de',
        targetRegion: 'fr',
        adaptIdioms: false,
        adaptMetaphors: false,
        adaptCulturalReferences: false,
        convertUnits: false,
        convertCurrency: true,
        convertDateFormats: false,
        checkSensitivity: false,
      };

      const result = await service.localize(request);

      expect(result.currencyConversions.length).toBe(0);
    });
  });

  describe('localize - date format conversion', () => {
    it('should convert MM/DD/YYYY to DD/MM/YYYY for UK', async () => {
      const request: LocalizationRequest = {
        content: 'The event is on 12/25/2024.',
        sourceRegion: 'us',
        targetRegion: 'uk',
        adaptIdioms: false,
        adaptMetaphors: false,
        adaptCulturalReferences: false,
        convertUnits: false,
        convertCurrency: false,
        convertDateFormats: true,
        checkSensitivity: false,
      };

      const result = await service.localize(request);

      expect(result.dateFormatConversions.length).toBeGreaterThan(0);
      expect(result.localizedContent).toContain('25/12/2024');
    });

    it('should convert to YYYY/MM/DD for Japan', async () => {
      const request: LocalizationRequest = {
        content: 'The meeting is on 03/15/2024.',
        sourceRegion: 'us',
        targetRegion: 'jp',
        adaptIdioms: false,
        adaptMetaphors: false,
        adaptCulturalReferences: false,
        convertUnits: false,
        convertCurrency: false,
        convertDateFormats: true,
        checkSensitivity: false,
      };

      const result = await service.localize(request);

      expect(result.dateFormatConversions.length).toBeGreaterThan(0);
      expect(result.localizedContent).toContain('2024/03/15');
    });
  });

  describe('localize - cultural sensitivity checking', () => {
    it('should flag pork references for UAE', async () => {
      const request: LocalizationRequest = {
        content: 'We served pork at the dinner.',
        targetRegion: 'ae',
        adaptIdioms: false,
        adaptMetaphors: false,
        adaptCulturalReferences: false,
        convertUnits: false,
        convertCurrency: false,
        convertDateFormats: false,
        checkSensitivity: true,
      };

      const result = await service.localize(request);

      expect(result.sensitivityFlags.length).toBeGreaterThan(0);
      expect(result.sensitivityFlags[0]!.level).toBe('high');
      expect(result.sensitivityFlags[0]!.affectedRegions).toContain('ae');
    });

    it('should flag beef references for India', async () => {
      const request: LocalizationRequest = {
        content: 'The restaurant serves beef dishes.',
        targetRegion: 'in',
        adaptIdioms: false,
        adaptMetaphors: false,
        adaptCulturalReferences: false,
        convertUnits: false,
        convertCurrency: false,
        convertDateFormats: false,
        checkSensitivity: true,
      };

      const result = await service.localize(request);

      expect(result.sensitivityFlags.length).toBeGreaterThan(0);
      expect(result.sensitivityFlags[0]!.level).toBe('high');
      expect(result.sensitivityFlags[0]!.affectedRegions).toContain('in');
    });

    it('should not flag content without sensitive terms', async () => {
      const request: LocalizationRequest = {
        content: 'The weather is nice today.',
        targetRegion: 'ae',
        adaptIdioms: false,
        adaptMetaphors: false,
        adaptCulturalReferences: false,
        convertUnits: false,
        convertCurrency: false,
        convertDateFormats: false,
        checkSensitivity: true,
      };

      const result = await service.localize(request);

      expect(result.sensitivityFlags.length).toBe(0);
    });
  });

  describe('localize - cultural appropriateness score', () => {
    it('should return high score for content without sensitivity issues', async () => {
      const request: LocalizationRequest = {
        content: 'The weather is beautiful today.',
        targetRegion: 'uk',
        adaptIdioms: true,
        adaptMetaphors: true,
        adaptCulturalReferences: true,
        convertUnits: true,
        convertCurrency: true,
        convertDateFormats: true,
        checkSensitivity: true,
      };

      const result = await service.localize(request);

      expect(result.culturalAppropriatenessScore).toBeGreaterThanOrEqual(90);
    });

    it('should return lower score for content with sensitivity issues', async () => {
      const request: LocalizationRequest = {
        content: 'We served pork and alcohol at the party.',
        targetRegion: 'ae',
        adaptIdioms: false,
        adaptMetaphors: false,
        adaptCulturalReferences: false,
        convertUnits: false,
        convertCurrency: false,
        convertDateFormats: false,
        checkSensitivity: true,
      };

      const result = await service.localize(request);

      expect(result.culturalAppropriatenessScore).toBeLessThan(80);
    });
  });

  describe('localizeMultiRegion', () => {
    it('should localize content for multiple regions', async () => {
      const request = {
        content: 'This task is a piece of cake and costs $100.',
        targetRegions: ['uk', 'de', 'jp'] as TargetRegion[],
        adaptIdioms: true,
        adaptMetaphors: false,
        adaptCulturalReferences: false,
        convertUnits: false,
        convertCurrency: true,
        convertDateFormats: false,
        checkSensitivity: false,
      };

      const result = await service.localizeMultiRegion(request);

      expect(result.id).toBeDefined();
      expect(result.totalRegions).toBe(3);
      expect(result.regionResults.uk).toBeDefined();
      expect(result.regionResults.de).toBeDefined();
      expect(result.regionResults.jp).toBeDefined();
    });

    it('should apply different adaptations for different regions', async () => {
      const request = {
        content: 'The Super Bowl was exciting.',
        targetRegions: ['uk', 'au', 'in'] as TargetRegion[],
        adaptIdioms: false,
        adaptMetaphors: false,
        adaptCulturalReferences: true,
        convertUnits: false,
        convertCurrency: false,
        convertDateFormats: false,
        checkSensitivity: false,
      };

      const result = await service.localizeMultiRegion(request);

      expect(result.regionResults.uk.localizedContent).toContain('FA Cup Final');
      expect(result.regionResults.au.localizedContent).toContain('AFL Grand Final');
      expect(result.regionResults.in.localizedContent).toContain('IPL Final');
    });
  });

  describe('checkSensitivityOnly', () => {
    it('should check sensitivity for multiple regions', () => {
      const request = {
        content: 'We served pork and beef at the dinner.',
        targetRegions: ['ae', 'in'] as TargetRegion[],
      };

      const result = service.checkSensitivityOnly(request);

      expect(result.id).toBeDefined();
      expect(result.flags.length).toBeGreaterThan(0);
      expect(result.isSafeForAllRegions).toBe(false);
    });

    it('should return safe for content without issues', () => {
      const request = {
        content: 'The weather is nice today.',
        targetRegions: ['ae', 'in', 'jp'] as TargetRegion[],
      };

      const result = service.checkSensitivityOnly(request);

      expect(result.flags.length).toBe(0);
      expect(result.isSafeForAllRegions).toBe(true);
      expect(result.overallLevel).toBe('low');
    });

    it('should determine correct overall sensitivity level', () => {
      const request = {
        content: 'We served pork at the event.',
        targetRegions: ['ae'] as TargetRegion[],
      };

      const result = service.checkSensitivityOnly(request);

      expect(result.overallLevel).toBe('high');
    });
  });

  describe('full localization workflow', () => {
    it('should perform complete localization with all options enabled', async () => {
      const request: LocalizationRequest = {
        content: 'This piece of cake costs $50 and weighs 2 pounds. The event is on 12/25/2024.',
        sourceRegion: 'us',
        targetRegion: 'uk',
        adaptIdioms: true,
        adaptMetaphors: true,
        adaptCulturalReferences: true,
        convertUnits: true,
        convertCurrency: true,
        convertDateFormats: true,
        checkSensitivity: true,
      };

      const result = await service.localize(request);

      expect(result.id).toBeDefined();
      expect(result.sourceRegion).toBe('us');
      expect(result.targetRegion).toBe('uk');
      expect(result.totalAdaptations).toBeGreaterThan(0);
      expect(result.culturalAppropriatenessScore).toBeGreaterThanOrEqual(0);
      expect(result.culturalAppropriatenessScore).toBeLessThanOrEqual(100);
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should track processing time', async () => {
      const request: LocalizationRequest = {
        content: 'Simple test content.',
        targetRegion: 'uk',
        adaptIdioms: true,
        adaptMetaphors: true,
        adaptCulturalReferences: true,
        convertUnits: true,
        convertCurrency: true,
        convertDateFormats: true,
        checkSensitivity: true,
      };

      const result = await service.localize(request);

      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });
});
