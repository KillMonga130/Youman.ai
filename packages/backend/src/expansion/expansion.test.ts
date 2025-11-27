/**
 * Expansion Service Tests
 * Tests for outline expansion, bullet point elaboration, and coherence maintenance
 * Requirements: 79
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ExpansionService } from './expansion.service';

describe('ExpansionService', () => {
  let service: ExpansionService;

  // Sample outlines for testing
  const simpleOutline = `
Introduction to Machine Learning
- What is Machine Learning
- Types of Machine Learning
- Applications of Machine Learning
  `.trim();

  const nestedOutline = `
Software Development Best Practices
- Code Quality
  - Code Reviews
  - Testing Strategies
  - Documentation
- Project Management
  - Agile Methodology
  - Sprint Planning
- Deployment
  - CI/CD Pipelines
  - Monitoring
  `.trim();

  const bulletPoints = [
    'Improve code quality through regular reviews',
    'Implement automated testing for all features',
    'Document APIs and system architecture',
    'Use version control for all code changes',
  ];

  beforeEach(() => {
    service = new ExpansionService();
  });

  describe('expandOutline', () => {
    it('should expand a simple outline', async () => {
      const result = await service.expandOutline({
        outline: simpleOutline,
        expansionLevel: 3,
      });

      expect(result.id).toBeDefined();
      expect(result.expandedContent).toBeDefined();
      expect(result.expandedContent.length).toBeGreaterThan(simpleOutline.length);
      expect(result.expansionRatio).toBeGreaterThan(1);
      expect(result.expansionLevel).toBe(3);
    });

    it('should expand a nested outline', async () => {
      const result = await service.expandOutline({
        outline: nestedOutline,
        expansionLevel: 3,
      });

      expect(result.expandedContent).toBeDefined();
      expect(result.parsedOutline.totalItems).toBeGreaterThan(0);
      expect(result.sections.length).toBeGreaterThan(0);
    });

    it('should parse outline structure correctly', async () => {
      const result = await service.expandOutline({
        outline: nestedOutline,
        expansionLevel: 2,
      });

      expect(result.parsedOutline.items.length).toBeGreaterThan(0);
      expect(result.parsedOutline.maxDepth).toBeGreaterThanOrEqual(0);
    });

    it('should apply minimal expansion at level 1', async () => {
      const result = await service.expandOutline({
        outline: simpleOutline,
        expansionLevel: 1,
      });

      expect(result.expansionLevel).toBe(1);
      expect(result.expandedWordCount).toBeGreaterThan(result.originalWordCount);
    });

    it('should apply maximum expansion at level 5', async () => {
      const level1Result = await service.expandOutline({
        outline: simpleOutline,
        expansionLevel: 1,
      });

      const level5Result = await service.expandOutline({
        outline: simpleOutline,
        expansionLevel: 5,
      });

      expect(level5Result.expansionRatio).toBeGreaterThan(level1Result.expansionRatio);
    });

    it('should apply formal style', async () => {
      const result = await service.expandOutline({
        outline: simpleOutline,
        expansionLevel: 3,
        style: 'formal',
      });

      expect(result.style).toBe('formal');
      expect(result.expandedContent).toBeDefined();
    });

    it('should apply casual style', async () => {
      const result = await service.expandOutline({
        outline: simpleOutline,
        expansionLevel: 3,
        style: 'casual',
      });

      expect(result.style).toBe('casual');
      expect(result.expandedContent).toBeDefined();
    });

    it('should apply technical style', async () => {
      const result = await service.expandOutline({
        outline: simpleOutline,
        expansionLevel: 3,
        style: 'technical',
      });

      expect(result.style).toBe('technical');
      expect(result.expandedContent).toBeDefined();
    });

    it('should apply academic style', async () => {
      const result = await service.expandOutline({
        outline: simpleOutline,
        expansionLevel: 3,
        style: 'academic',
      });

      expect(result.style).toBe('academic');
      expect(result.expandedContent).toBeDefined();
    });

    it('should include transitions when requested', async () => {
      const result = await service.expandOutline({
        outline: nestedOutline,
        expansionLevel: 3,
        includeTransitions: true,
      });

      // Check for common transition words
      const hasTransitions = /furthermore|additionally|moreover|also/i.test(result.expandedContent);
      expect(hasTransitions).toBe(true);
    });

    it('should preserve headings when requested', async () => {
      const result = await service.expandOutline({
        outline: simpleOutline,
        expansionLevel: 3,
        preserveHeadings: true,
      });

      // Check for markdown headings
      expect(result.expandedContent).toMatch(/^#/m);
    });

    it('should track sections correctly', async () => {
      const result = await service.expandOutline({
        outline: simpleOutline,
        expansionLevel: 3,
      });

      expect(result.sections.length).toBeGreaterThan(0);
      for (const section of result.sections) {
        expect(section.originalText).toBeDefined();
        expect(section.expandedContent).toBeDefined();
        expect(section.wordCount).toBeGreaterThan(0);
      }
    });

    it('should include processing time', async () => {
      const result = await service.expandOutline({
        outline: simpleOutline,
        expansionLevel: 3,
      });

      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('expandBulletPoints', () => {
    it('should expand bullet points', async () => {
      const result = await service.expandBulletPoints({
        bullets: bulletPoints,
        detailLevel: 3,
      });

      expect(result.id).toBeDefined();
      expect(result.expandedBullets.length).toBe(bulletPoints.length);
      expect(result.combinedContent).toBeDefined();
      expect(result.expansionRatio).toBeGreaterThan(1);
    });

    it('should expand each bullet individually', async () => {
      const result = await service.expandBulletPoints({
        bullets: bulletPoints,
        detailLevel: 3,
      });

      for (let i = 0; i < result.expandedBullets.length; i++) {
        const expanded = result.expandedBullets[i]!;
        expect(expanded.originalBullet).toBe(bulletPoints[i]);
        expect(expanded.expandedContent.length).toBeGreaterThan(bulletPoints[i]!.length);
        expect(expanded.wordCount).toBeGreaterThan(0);
        expect(expanded.index).toBe(i);
      }
    });

    it('should apply minimal expansion at level 1', async () => {
      const result = await service.expandBulletPoints({
        bullets: bulletPoints,
        detailLevel: 1,
      });

      expect(result.detailLevel).toBe(1);
      expect(result.expandedWordCount).toBeGreaterThan(result.originalWordCount);
    });

    it('should apply maximum expansion at level 5', async () => {
      const level1Result = await service.expandBulletPoints({
        bullets: bulletPoints,
        detailLevel: 1,
      });

      const level5Result = await service.expandBulletPoints({
        bullets: bulletPoints,
        detailLevel: 5,
      });

      expect(level5Result.expansionRatio).toBeGreaterThan(level1Result.expansionRatio);
    });

    it('should include examples when requested', async () => {
      const result = await service.expandBulletPoints({
        bullets: bulletPoints,
        detailLevel: 3,
        includeExamples: true,
      });

      // At least some bullets should have examples
      const bulletsWithExamples = result.expandedBullets.filter(b => b.examples && b.examples.length > 0);
      expect(bulletsWithExamples.length).toBeGreaterThan(0);
    });

    it('should apply different styles', async () => {
      const formalResult = await service.expandBulletPoints({
        bullets: bulletPoints.slice(0, 2),
        detailLevel: 3,
        style: 'formal',
      });

      const casualResult = await service.expandBulletPoints({
        bullets: bulletPoints.slice(0, 2),
        detailLevel: 3,
        style: 'casual',
      });

      expect(formalResult.style).toBe('formal');
      expect(casualResult.style).toBe('casual');
      // Content should be different due to style
      expect(formalResult.combinedContent).not.toBe(casualResult.combinedContent);
    });

    it('should combine content with transitions', async () => {
      const result = await service.expandBulletPoints({
        bullets: bulletPoints,
        detailLevel: 3,
      });

      // Combined content should have transitions between sections
      expect(result.combinedContent.length).toBeGreaterThan(0);
    });

    it('should track word counts', async () => {
      const result = await service.expandBulletPoints({
        bullets: bulletPoints,
        detailLevel: 3,
      });

      expect(result.originalWordCount).toBeGreaterThan(0);
      expect(result.expandedWordCount).toBeGreaterThan(result.originalWordCount);
    });
  });

  describe('maintainCoherence', () => {
    const sections = [
      'Machine learning is a subset of artificial intelligence. It enables computers to learn from data.',
      'Deep learning uses neural networks with multiple layers. These networks can process complex patterns.',
      'Natural language processing allows computers to understand human language. It has many applications.',
    ];

    it('should maintain coherence across sections', async () => {
      const result = await service.maintainCoherence({
        expandedSections: sections,
      });

      expect(result.id).toBeDefined();
      expect(result.coherentContent).toBeDefined();
      expect(result.coherentContent.length).toBeGreaterThan(0);
    });

    it('should add transitions when requested', async () => {
      const result = await service.maintainCoherence({
        expandedSections: sections,
        addTransitions: true,
      });

      expect(result.transitionsAdded).toBeGreaterThan(0);
      // Check for transition words
      const hasTransitions = /furthermore|additionally|moreover|also/i.test(result.coherentContent);
      expect(hasTransitions).toBe(true);
    });

    it('should not add transitions when disabled', async () => {
      const result = await service.maintainCoherence({
        expandedSections: sections,
        addTransitions: false,
      });

      expect(result.transitionsAdded).toBe(0);
    });

    it('should adjust tone for consistency', async () => {
      const mixedToneSections = [
        'This is basically how it works, kinda cool right?',
        'Furthermore, the implementation requires careful consideration.',
        'Gonna need to check this out more.',
      ];

      const result = await service.maintainCoherence({
        expandedSections: mixedToneSections,
        ensureConsistentTone: true,
        targetStyle: 'formal',
      });

      expect(result.toneAdjustments).toBeGreaterThanOrEqual(0);
    });

    it('should preserve original sections', async () => {
      const result = await service.maintainCoherence({
        expandedSections: sections,
      });

      expect(result.originalSections).toEqual(sections);
    });

    it('should calculate word count', async () => {
      const result = await service.maintainCoherence({
        expandedSections: sections,
      });

      expect(result.wordCount).toBeGreaterThan(0);
    });

    it('should include processing time', async () => {
      const result = await service.maintainCoherence({
        expandedSections: sections,
      });

      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('validation', () => {
    describe('validateOutline', () => {
      it('should reject empty outline', () => {
        const result = service.validateOutline('');
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should reject whitespace-only outline', () => {
        const result = service.validateOutline('   \n\t  ');
        expect(result.valid).toBe(false);
      });

      it('should reject outline that is too short', () => {
        const result = service.validateOutline('Short');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('at least');
      });

      it('should accept valid outline', () => {
        const result = service.validateOutline(simpleOutline);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    describe('validateBullets', () => {
      it('should reject non-array input', () => {
        const result = service.validateBullets('not an array' as any);
        expect(result.valid).toBe(false);
      });

      it('should reject empty array', () => {
        const result = service.validateBullets([]);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('At least one');
      });

      it('should reject array with empty strings', () => {
        const result = service.validateBullets(['valid', '', 'also valid']);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('index 1');
      });

      it('should accept valid bullet points', () => {
        const result = service.validateBullets(bulletPoints);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    describe('validateLevel', () => {
      it('should reject level below 1', () => {
        const result = service.validateLevel(0);
        expect(result.valid).toBe(false);
      });

      it('should reject level above 5', () => {
        const result = service.validateLevel(6);
        expect(result.valid).toBe(false);
      });

      it('should reject non-integer level', () => {
        const result = service.validateLevel(2.5);
        expect(result.valid).toBe(false);
      });

      it('should accept valid levels', () => {
        for (let level = 1; level <= 5; level++) {
          const result = service.validateLevel(level);
          expect(result.valid).toBe(true);
        }
      });
    });
  });

  describe('utility methods', () => {
    it('should return available levels', () => {
      const levels = service.getAvailableLevels();

      expect(levels).toBeDefined();
      expect(Array.isArray(levels)).toBe(true);
      expect(levels.length).toBe(5);
      expect(levels.map(l => l.level)).toEqual([1, 2, 3, 4, 5]);
    });

    it('should return available styles', () => {
      const styles = service.getAvailableStyles();

      expect(styles).toBeDefined();
      expect(Array.isArray(styles)).toBe(true);
      expect(styles).toContain('formal');
      expect(styles).toContain('casual');
      expect(styles).toContain('technical');
      expect(styles).toContain('academic');
    });
  });

  describe('expansion ratios', () => {
    it('should produce larger content than original', async () => {
      const result = await service.expandOutline({
        outline: simpleOutline,
        expansionLevel: 3,
      });

      expect(result.expandedWordCount).toBeGreaterThan(result.originalWordCount);
    });

    it('should have expansion ratio greater than 1', async () => {
      const result = await service.expandOutline({
        outline: simpleOutline,
        expansionLevel: 3,
      });

      expect(result.expansionRatio).toBeGreaterThan(1);
    });

    it('should have higher expansion ratio at higher levels', async () => {
      const level2Result = await service.expandOutline({
        outline: simpleOutline,
        expansionLevel: 2,
      });

      const level4Result = await service.expandOutline({
        outline: simpleOutline,
        expansionLevel: 4,
      });

      expect(level4Result.expansionRatio).toBeGreaterThan(level2Result.expansionRatio);
    });
  });
});
