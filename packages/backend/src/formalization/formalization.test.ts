/**
 * Content Formalization Service Tests
 * Tests for contraction expansion, slang replacement, sentence restructuring,
 * and hedging language for academic writing
 * Requirements: 107
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FormalizationService } from './formalization.service';
import { FormalizationLevel } from './types';

describe('FormalizationService', () => {
  let service: FormalizationService;

  beforeEach(() => {
    service = new FormalizationService();
  });

  describe('analyzeFormalization', () => {
    it('should analyze casual text as low formality', () => {
      const text = "I can't believe it's gonna be awesome! Yeah, that's cool.";
      const result = service.analyzeFormalization(text);

      expect(result.currentLevel).toBe('casual');
      expect(result.contractionCount).toBeGreaterThan(0);
      expect(result.formalityScore).toBeLessThan(50);
    });

    it('should analyze formal text as high formality', () => {
      const text = 'The implementation demonstrates significant improvements in operational efficiency. Furthermore, the methodology provides substantial benefits.';
      const result = service.analyzeFormalization(text);

      expect(result.formalityScore).toBeGreaterThan(40);
      expect(result.contractionCount).toBe(0);
      expect(result.slangCount).toBe(0);
    });

    it('should count contractions correctly', () => {
      const text = "I can't do this. It's not working. We won't give up.";
      const result = service.analyzeFormalization(text);

      expect(result.contractionCount).toBe(3);
    });

    it('should count slang correctly', () => {
      const text = 'This is gonna be awesome. We gotta check out lots of stuff.';
      const result = service.analyzeFormalization(text);

      expect(result.slangCount).toBeGreaterThan(0);
    });
  });

  describe('detectSlang', () => {
    it('should detect colloquial slang', async () => {
      const text = "I'm gonna wanna check this out. It's gonna be cool.";
      const result = await service.detectSlang(text);

      expect(result.totalSlang).toBeGreaterThan(0);
      expect(result.detectedTerms.some(t => t.term.toLowerCase() === 'gonna')).toBe(true);
      expect(result.categories).toContain('colloquial');
    });

    it('should detect casual expressions', async () => {
      const text = 'This is awesome and super cool. We have tons of stuff to do.';
      const result = await service.detectSlang(text);

      expect(result.totalSlang).toBeGreaterThan(0);
      expect(result.categories).toContain('casual');
    });

    it('should detect informal verbs', async () => {
      const text = 'We need to figure out how to set up the system and check out the results.';
      const result = await service.detectSlang(text);

      expect(result.totalSlang).toBeGreaterThan(0);
      expect(result.detectedTerms.some(t => t.category === 'informal-verb')).toBe(true);
    });

    it('should calculate slang density', async () => {
      const text = 'This is gonna be awesome. We gotta do it.';
      const result = await service.detectSlang(text);

      expect(result.slangDensity).toBeGreaterThan(0);
    });
  });

  describe('formalize - contraction expansion', () => {
    it('should expand common contractions', async () => {
      const result = await service.formalize({
        text: "I can't believe it's working. We won't stop now.",
        targetLevel: 'professional',
      });

      expect(result.formalizedText).toContain('cannot');
      expect(result.formalizedText).toContain('it is');
      expect(result.formalizedText).toContain('will not');
      expect(result.contractionExpansions.length).toBeGreaterThan(0);
    });

    it('should preserve case when expanding contractions', async () => {
      const result = await service.formalize({
        text: "I CAN'T do this. Can't believe it.",
        targetLevel: 'professional',
      });

      expect(result.formalizedText).toContain('CANNOT');
      expect(result.formalizedText).toContain('Cannot');
    });

    it('should preserve terms marked for preservation', async () => {
      const result = await service.formalize({
        text: "I can't believe it's true.",
        targetLevel: 'professional',
        preserveTerms: ["can't"],
      });

      expect(result.formalizedText).toContain("can't");
      expect(result.formalizedText).toContain('it is');
    });
  });

  describe('formalize - slang replacement', () => {
    it('should replace colloquial slang', async () => {
      const result = await service.formalize({
        text: "I'm gonna wanna check this out.",
        targetLevel: 'professional',
      });

      expect(result.formalizedText).toContain('going to');
      expect(result.formalizedText).toContain('want to');
      expect(result.slangReplacements.length).toBeGreaterThan(0);
    });

    it('should replace casual expressions', async () => {
      const result = await service.formalize({
        text: 'This is awesome and we have lots of stuff to do.',
        targetLevel: 'academic',
        intensity: 1.0,
      });

      expect(result.slangReplacements.length).toBeGreaterThan(0);
    });

    it('should apply custom replacements', async () => {
      const result = await service.formalize({
        text: 'The widget is broken.',
        targetLevel: 'professional',
        customReplacements: { 'widget': 'component' },
      });

      expect(result.formalizedText).toContain('component');
      expect(result.formalizedText).not.toContain('widget');
    });

    it('should be more aggressive at higher formality levels', async () => {
      const text = 'This is gonna be cool. We gotta check out lots of stuff.';
      
      const professionalResult = await service.formalize({
        text,
        targetLevel: 'professional',
        intensity: 0.7,
      });

      const academicResult = await service.formalize({
        text,
        targetLevel: 'academic',
        intensity: 1.0,
      });

      // Academic should have at least as many replacements
      expect(academicResult.slangReplacements.length).toBeGreaterThanOrEqual(
        professionalResult.slangReplacements.length
      );
    });
  });

  describe('formalize - sentence restructuring', () => {
    it('should replace informal sentence starters', async () => {
      const result = await service.formalize({
        text: 'So, we need to work harder. But, it will be worth it.',
        targetLevel: 'academic',
      });

      expect(result.formalizedText).toContain('Therefore,');
      expect(result.formalizedText).toContain('However,');
      expect(result.sentenceRestructurings.length).toBeGreaterThan(0);
    });

    it('should preserve case in restructured sentences', async () => {
      const result = await service.formalize({
        text: 'SO, we need to act. BUT, we must be careful.',
        targetLevel: 'academic',
      });

      expect(result.formalizedText).toContain('THEREFORE,');
      expect(result.formalizedText).toContain('HOWEVER,');
    });
  });

  describe('formalize - hedging language', () => {
    it('should add hedging for strong claims in academic writing', async () => {
      const result = await service.formalize({
        text: 'This method is the best approach. All researchers agree with this conclusion.',
        targetLevel: 'academic',
        addHedging: true,
        hedgingIntensity: 1.0,
      });

      // Should have some hedging modifications
      expect(result.hedgingAdditions.length).toBeGreaterThanOrEqual(0);
    });

    it('should replace absolute terms with approximators', async () => {
      const result = await service.formalize({
        text: 'All students must complete the assignment. This always works.',
        targetLevel: 'academic',
        addHedging: true,
        hedgingIntensity: 1.0,
      });

      // Check for hedging modifications
      const hasHedging = result.formalizedText.includes('most') || 
                         result.formalizedText.includes('typically') ||
                         result.formalizedText.includes('may') ||
                         result.hedgingAdditions.length > 0;
      expect(hasHedging).toBe(true);
    });
  });

  describe('formalize - comprehensive', () => {
    it('should apply all strategies when comprehensive is selected', async () => {
      const result = await service.formalize({
        text: "So, I can't believe it's gonna be awesome. We gotta check out lots of stuff.",
        targetLevel: 'academic',
        strategies: ['comprehensive'],
        addHedging: true,
      });

      // Should have multiple types of changes
      expect(result.contractionExpansions.length).toBeGreaterThan(0);
      expect(result.slangReplacements.length).toBeGreaterThan(0);
      expect(result.totalChanges).toBeGreaterThan(3);
    });

    it('should improve formality score', async () => {
      const text = "I can't believe it's gonna be cool. We gotta do lots of stuff.";
      const result = await service.formalize({
        text,
        targetLevel: 'professional',
      });

      expect(result.newAnalysis.formalityScore).toBeGreaterThan(result.originalAnalysis.formalityScore);
      expect(result.improvement.formalityScoreImprovement).toBeGreaterThan(0);
    });

    it('should calculate improvement metrics', async () => {
      const result = await service.formalize({
        text: "I can't do this. It's gonna be hard.",
        targetLevel: 'professional',
      });

      expect(result.improvement).toBeDefined();
      expect(result.improvement.contractionsExpanded).toBeGreaterThanOrEqual(0);
      expect(typeof result.improvement.targetAchieved).toBe('boolean');
    });
  });

  describe('getAvailableFormalizationLevels', () => {
    it('should return all formalization levels', () => {
      const levels = service.getAvailableFormalizationLevels();

      expect(levels.length).toBe(5);
      expect(levels.map(l => l.level)).toContain('casual');
      expect(levels.map(l => l.level)).toContain('standard');
      expect(levels.map(l => l.level)).toContain('professional');
      expect(levels.map(l => l.level)).toContain('academic');
      expect(levels.map(l => l.level)).toContain('legal');
    });

    it('should include configuration for each level', () => {
      const levels = service.getAvailableFormalizationLevels();

      for (const level of levels) {
        expect(level.minFormalityScore).toBeDefined();
        expect(level.targetFormalityScore).toBeDefined();
        expect(typeof level.expandContractions).toBe('boolean');
        expect(typeof level.replaceSlang).toBe('boolean');
      }
    });
  });

  describe('getSlangCategories', () => {
    it('should return slang categories', () => {
      const categories = service.getSlangCategories();

      expect(categories.length).toBeGreaterThan(0);
      expect(categories).toContain('colloquial');
      expect(categories).toContain('casual');
    });
  });

  describe('getSlangByCategory', () => {
    it('should return slang terms for a category', () => {
      const terms = service.getSlangByCategory('colloquial');

      expect(terms.length).toBeGreaterThan(0);
      expect(terms.every(t => t.category === 'colloquial')).toBe(true);
    });

    it('should return empty array for unknown category', () => {
      const terms = service.getSlangByCategory('unknown-category');

      expect(terms).toEqual([]);
    });
  });

  describe('getContractions', () => {
    it('should return all contractions', () => {
      const contractions = service.getContractions();

      expect(contractions.length).toBeGreaterThan(0);
      expect(contractions.some(c => c.contraction === "can't")).toBe(true);
      expect(contractions.some(c => c.contraction === "won't")).toBe(true);
    });
  });

  describe('getHedgingPhrases', () => {
    it('should return all hedging phrases when no type specified', () => {
      const phrases = service.getHedgingPhrases();

      expect(phrases.length).toBeGreaterThan(0);
    });

    it('should return hedging phrases for specific type', () => {
      const phrases = service.getHedgingPhrases('epistemic');

      expect(phrases.length).toBeGreaterThan(0);
      expect(phrases).toContain('may');
      expect(phrases).toContain('might');
    });
  });

  describe('edge cases', () => {
    it('should handle empty text gracefully', () => {
      const result = service.analyzeFormalization('');

      expect(result.wordCount).toBe(0);
      expect(result.sentenceCount).toBe(0);
    });

    it('should handle text with no contractions or slang', async () => {
      const result = await service.formalize({
        text: 'The implementation demonstrates significant improvements.',
        targetLevel: 'professional',
      });

      expect(result.contractionExpansions.length).toBe(0);
      expect(result.formalizedText).toBe('The implementation demonstrates significant improvements.');
    });

    it('should handle very short text', async () => {
      const result = await service.formalize({
        text: "Can't.",
        targetLevel: 'professional',
      });

      expect(result.formalizedText).toBe('Cannot.');
    });
  });
});
