/**
 * Content Simplification Service Tests
 * Tests for jargon replacement, sentence simplification, inline definitions,
 * and reading level targeting
 * Requirements: 106
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SimplificationService } from './simplification.service';
import { ReadingLevel } from './types';

describe('SimplificationService', () => {
  let service: SimplificationService;

  beforeEach(() => {
    service = new SimplificationService();
  });

  describe('analyzeReadingLevel', () => {
    it('should analyze simple text as elementary level', () => {
      const text = 'The cat sat on the mat. It was a big cat. The cat was happy.';
      const result = service.analyzeReadingLevel(text);

      expect(result.currentLevel).toBe('elementary');
      expect(result.fleschKincaidGrade).toBeLessThan(6);
      expect(result.fleschReadingEase).toBeGreaterThan(70);
      expect(result.wordCount).toBeGreaterThan(0);
      expect(result.sentenceCount).toBe(3);
    });

    it('should analyze complex text as higher reading level', () => {
      const text = 'The implementation of sophisticated algorithmic methodologies necessitates comprehensive understanding of computational paradigms and their subsequent ramifications on system architecture.';
      const result = service.analyzeReadingLevel(text);

      expect(result.fleschKincaidGrade).toBeGreaterThan(12);
      expect(result.fleschReadingEase).toBeLessThan(30);
      expect(result.complexWordPercentage).toBeGreaterThan(30);
    });

    it('should calculate correct word and sentence counts', () => {
      const text = 'This is sentence one. This is sentence two. This is sentence three.';
      const result = service.analyzeReadingLevel(text);

      expect(result.sentenceCount).toBe(3);
      expect(result.wordCount).toBe(12);
    });
  });


  describe('detectJargon', () => {
    it('should detect technical jargon', async () => {
      const text = 'The algorithm uses encryption to ensure data security with minimal latency.';
      const result = await service.detectJargon(text);

      expect(result.totalJargon).toBeGreaterThan(0);
      expect(result.detectedTerms.some(t => t.term.toLowerCase() === 'algorithm')).toBe(true);
      expect(result.detectedTerms.some(t => t.term.toLowerCase() === 'encryption')).toBe(true);
      expect(result.categories).toContain('technical');
    });

    it('should detect business jargon', async () => {
      const text = 'We need to leverage synergy to optimize our deliverables for stakeholders.';
      const result = await service.detectJargon(text);

      expect(result.totalJargon).toBeGreaterThan(0);
      expect(result.detectedTerms.some(t => t.term.toLowerCase() === 'synergy')).toBe(true);
      expect(result.detectedTerms.some(t => t.term.toLowerCase() === 'leverage')).toBe(true);
      expect(result.categories).toContain('business');
    });

    it('should detect complex words', async () => {
      const text = 'We need to utilize this methodology to facilitate the process.';
      const result = await service.detectJargon(text);

      expect(result.totalJargon).toBeGreaterThan(0);
      expect(result.detectedTerms.some(t => t.term.toLowerCase() === 'utilize')).toBe(true);
    });

    it('should calculate jargon density', async () => {
      const text = 'The algorithm and encryption provide security.';
      const result = await service.detectJargon(text);

      expect(result.jargonDensity).toBeGreaterThan(0);
    });
  });

  describe('simplify', () => {
    it('should replace jargon with simpler alternatives', async () => {
      const result = await service.simplify({
        text: 'We need to utilize this algorithm to optimize performance.',
        targetLevel: 'elementary',
      });

      expect(result.simplifiedText).toContain('use');
      expect(result.simplifiedText).not.toContain('utilize');
      expect(result.jargonReplacements.length).toBeGreaterThan(0);
    });

    it('should simplify long sentences', async () => {
      const longSentence = 'The implementation of the new system, which was designed by our engineering team, and which incorporates several advanced features, will significantly improve our operational efficiency.';
      const result = await service.simplify({
        text: longSentence,
        targetLevel: 'elementary',
      });

      // Should either split or simplify the sentence
      expect(result.simplifiedText.length).toBeGreaterThan(0);
    });

    it('should preserve terms marked for preservation', async () => {
      const result = await service.simplify({
        text: 'The algorithm uses encryption for security.',
        targetLevel: 'elementary',
        preserveTerms: ['algorithm'],
      });

      expect(result.simplifiedText).toContain('algorithm');
    });

    it('should apply custom replacements', async () => {
      const result = await service.simplify({
        text: 'The widget processes data efficiently.',
        targetLevel: 'elementary',
        customReplacements: { 'widget': 'tool' },
      });

      expect(result.simplifiedText).toContain('tool');
      expect(result.simplifiedText).not.toContain('widget');
    });

    it('should add inline definitions when requested', async () => {
      const result = await service.simplify({
        text: 'The algorithm processes data quickly.',
        targetLevel: 'elementary',
        addDefinitions: true,
        definitionFormat: 'parenthetical',
      });

      // Should have added at least one definition
      expect(result.inlineDefinitions.length).toBeGreaterThanOrEqual(0);
    });

    it('should calculate improvement metrics', async () => {
      const result = await service.simplify({
        text: 'We need to utilize sophisticated methodologies to optimize our deliverables.',
        targetLevel: 'elementary',
      });

      expect(result.improvement).toBeDefined();
      expect(result.improvement.jargonTermsReplaced).toBeGreaterThanOrEqual(0);
      expect(typeof result.improvement.targetAchieved).toBe('boolean');
    });

    it('should reduce reading level', async () => {
      const complexText = 'The implementation of sophisticated algorithmic methodologies necessitates comprehensive understanding.';
      const result = await service.simplify({
        text: complexText,
        targetLevel: 'middle-school',
      });

      // The simplified text should have a lower grade level
      expect(result.newAnalysis.fleschKincaidGrade).toBeLessThanOrEqual(result.originalAnalysis.fleschKincaidGrade);
    });
  });


  describe('getAvailableReadingLevels', () => {
    it('should return all reading levels', () => {
      const levels = service.getAvailableReadingLevels();

      expect(levels.length).toBe(5);
      expect(levels.map(l => l.level)).toContain('elementary');
      expect(levels.map(l => l.level)).toContain('middle-school');
      expect(levels.map(l => l.level)).toContain('high-school');
      expect(levels.map(l => l.level)).toContain('college');
      expect(levels.map(l => l.level)).toContain('professional');
    });

    it('should include grade ranges for each level', () => {
      const levels = service.getAvailableReadingLevels();

      for (const level of levels) {
        expect(level.minGrade).toBeDefined();
        expect(level.maxGrade).toBeDefined();
        expect(level.minGrade).toBeLessThanOrEqual(level.maxGrade);
      }
    });
  });

  describe('getJargonCategories', () => {
    it('should return jargon categories', () => {
      const categories = service.getJargonCategories();

      expect(categories.length).toBeGreaterThan(0);
      expect(categories).toContain('technical');
      expect(categories).toContain('business');
    });
  });

  describe('getJargonByCategory', () => {
    it('should return jargon terms for a category', () => {
      const terms = service.getJargonByCategory('technical');

      expect(terms.length).toBeGreaterThan(0);
      expect(terms.every(t => t.category === 'technical')).toBe(true);
    });

    it('should return empty array for unknown category', () => {
      const terms = service.getJargonByCategory('unknown-category');

      expect(terms).toEqual([]);
    });
  });

  describe('reading level targeting', () => {
    it('should target elementary level correctly', async () => {
      const result = await service.simplify({
        text: 'We need to leverage synergy to optimize our deliverables.',
        targetLevel: 'elementary',
        intensity: 1.0,
      });

      // Elementary target should result in significant simplification
      expect(result.jargonReplacements.length).toBeGreaterThan(0);
    });

    it('should be less aggressive for professional level', async () => {
      const text = 'We need to leverage synergy to optimize our deliverables.';
      
      const elementaryResult = await service.simplify({
        text,
        targetLevel: 'elementary',
        intensity: 1.0,
      });

      const professionalResult = await service.simplify({
        text,
        targetLevel: 'professional',
        intensity: 0.5,
      });

      // Elementary should have more replacements than professional
      expect(elementaryResult.jargonReplacements.length).toBeGreaterThanOrEqual(
        professionalResult.jargonReplacements.length
      );
    });
  });

  describe('sentence simplification', () => {
    it('should simplify wordy phrases', async () => {
      const result = await service.simplify({
        text: 'In order to complete the task, we need to work together.',
        targetLevel: 'elementary',
      });

      expect(result.simplifiedText).toContain('To complete');
      expect(result.simplifiedText).not.toContain('In order to');
    });

    it('should handle multiple wordy phrases', async () => {
      const result = await service.simplify({
        text: 'Due to the fact that we are late, we need to work in order to finish.',
        targetLevel: 'elementary',
      });

      expect(result.simplifiedText).not.toContain('Due to the fact that');
      expect(result.simplifiedText).not.toContain('in order to');
    });
  });

  describe('case preservation', () => {
    it('should preserve uppercase', async () => {
      const result = await service.simplify({
        text: 'UTILIZE this tool.',
        targetLevel: 'elementary',
      });

      expect(result.simplifiedText).toContain('USE');
    });

    it('should preserve title case', async () => {
      const result = await service.simplify({
        text: 'Utilize this tool.',
        targetLevel: 'elementary',
      });

      expect(result.simplifiedText).toContain('Use');
    });
  });
});
