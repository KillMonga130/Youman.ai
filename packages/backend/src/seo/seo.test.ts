/**
 * SEO Service Tests
 * Tests for SEO keyword preservation and metadata management
 * Requirements: 27
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SEOService } from './seo.service';
import { SEODocument, Keyword } from './types';

describe('SEOService', () => {
  let seoService: SEOService;

  beforeEach(() => {
    seoService = new SEOService();
  });

  describe('extractKeywords', () => {
    it('should extract keywords from text', () => {
      const text = 'The quick brown fox jumps over the lazy dog. The fox is quick and brown.';
      const keywords = seoService.extractKeywords(text);

      expect(keywords.length).toBeGreaterThan(0);
      expect(keywords.some(k => k.term === 'quick')).toBe(true);
      expect(keywords.some(k => k.term === 'brown')).toBe(true);
      expect(keywords.some(k => k.term === 'fox')).toBe(true);
    });

    it('should exclude stop words', () => {
      const text = 'The the the and and and or or or';
      const keywords = seoService.extractKeywords(text);

      expect(keywords.length).toBe(0);
    });

    it('should calculate keyword density', () => {
      const text = 'test test test test other other';
      const keywords = seoService.extractKeywords(text);

      const testKeyword = keywords.find(k => k.term === 'test');
      expect(testKeyword).toBeDefined();
      expect(testKeyword!.originalCount).toBe(4);
      expect(testKeyword!.originalDensity).toBeGreaterThan(0);
    });

    it('should extract bi-grams', () => {
      const text = 'machine learning machine learning machine learning is great';
      const keywords = seoService.extractKeywords(text, { minKeywordFrequency: 2 });

      const bigram = keywords.find(k => k.term === 'machine learning');
      expect(bigram).toBeDefined();
      expect(bigram!.wordCount).toBe(2);
    });
  });


  describe('validateKeywordDensity', () => {
    it('should validate keyword density within 0.5% threshold', () => {
      const original = 'keyword keyword keyword other other other other other other other';
      const transformed = 'keyword keyword keyword different different different different different different different';
      
      const keywords: Keyword[] = [{
        term: 'keyword',
        originalDensity: 30,
        targetDensity: 30,
        importance: 'high',
        originalCount: 3,
        wordCount: 1,
      }];

      const report = seoService.validateKeywordDensity(original, transformed, keywords);

      expect(report.results.length).toBe(1);
      expect(report.results[0]!.keyword).toBe('keyword');
      expect(report.results[0]!.originalCount).toBe(3);
      expect(report.results[0]!.transformedCount).toBe(3);
    });

    it('should detect density deviation outside threshold', () => {
      const original = 'keyword keyword keyword keyword keyword other other other other other';
      const transformed = 'keyword other other other other other other other other other';
      
      const keywords: Keyword[] = [{
        term: 'keyword',
        originalDensity: 50,
        targetDensity: 50,
        importance: 'high',
        originalCount: 5,
        wordCount: 1,
      }];

      const report = seoService.validateKeywordDensity(original, transformed, keywords);

      expect(report.overallValid).toBe(false);
      expect(report.keywordsNeedingAdjustment).toContain('keyword');
    });

    it('should handle empty text', () => {
      const keywords: Keyword[] = [{
        term: 'test',
        originalDensity: 0,
        targetDensity: 0,
        importance: 'medium',
        originalCount: 0,
        wordCount: 1,
      }];

      const report = seoService.validateKeywordDensity('', '', keywords);

      expect(report.results.length).toBe(1);
      expect(report.results[0]!.originalDensity).toBe(0);
      expect(report.results[0]!.transformedDensity).toBe(0);
    });
  });

  describe('preserveMetaTags', () => {
    it('should extract title tag', () => {
      const document: SEODocument = {
        content: '<html><head><title>Test Page Title</title></head><body></body></html>',
      };

      const metaTags = seoService.preserveMetaTags(document);

      expect(metaTags.title).toBeDefined();
      expect(metaTags.title!.content).toBe('Test Page Title');
    });

    it('should extract meta description', () => {
      const document: SEODocument = {
        content: '<html><head><meta name="description" content="This is a test description"></head></html>',
      };

      const metaTags = seoService.preserveMetaTags(document);

      expect(metaTags.description).toBeDefined();
      expect(metaTags.description!.content).toBe('This is a test description');
    });

    it('should extract Open Graph tags', () => {
      const document: SEODocument = {
        content: '<html><head><meta property="og:title" content="OG Title"><meta property="og:description" content="OG Desc"></head></html>',
      };

      const metaTags = seoService.preserveMetaTags(document);

      expect(metaTags.openGraph.length).toBe(2);
      expect(metaTags.openGraph.some(t => t.name === 'og:title')).toBe(true);
    });

    it('should extract Twitter Card tags', () => {
      const document: SEODocument = {
        content: '<html><head><meta name="twitter:title" content="Twitter Title"></head></html>',
      };

      const metaTags = seoService.preserveMetaTags(document);

      expect(metaTags.twitter.length).toBe(1);
      expect(metaTags.twitter[0]!.content).toBe('Twitter Title');
    });
  });


  describe('maintainHeadingHierarchy', () => {
    it('should extract HTML headings', () => {
      const document: SEODocument = {
        content: '<h1>Main Title</h1><h2>Section 1</h2><h3>Subsection</h3>',
      };

      const structure = seoService.maintainHeadingHierarchy(document);

      expect(structure.headings.length).toBe(3);
      expect(structure.levelCounts[1]).toBe(1);
      expect(structure.levelCounts[2]).toBe(1);
      expect(structure.levelCounts[3]).toBe(1);
    });

    it('should extract markdown headings', () => {
      const document: SEODocument = {
        content: '# Main Title\n## Section 1\n### Subsection',
      };

      const structure = seoService.maintainHeadingHierarchy(document);

      expect(structure.headings.length).toBe(3);
      expect(structure.headings[0]!.level).toBe(1);
      expect(structure.headings[0]!.text).toBe('Main Title');
    });

    it('should detect hierarchy errors', () => {
      const document: SEODocument = {
        content: '<h1>Title</h1><h3>Skipped H2</h3>',
      };

      const structure = seoService.maintainHeadingHierarchy(document);

      expect(structure.hierarchyValid).toBe(false);
      expect(structure.hierarchyErrors.length).toBeGreaterThan(0);
    });

    it('should find keywords in headings', () => {
      const document: SEODocument = {
        content: '<h1>SEO Optimization Guide</h1><h2>Keyword Research</h2>',
      };

      const keywords: Keyword[] = [
        { term: 'seo', originalDensity: 1, targetDensity: 1, importance: 'high', originalCount: 1, wordCount: 1 },
        { term: 'keyword', originalDensity: 1, targetDensity: 1, importance: 'high', originalCount: 1, wordCount: 1 },
      ];

      const structure = seoService.maintainHeadingHierarchy(document, keywords);

      expect(structure.preservedKeywords).toContain('seo');
      expect(structure.preservedKeywords).toContain('keyword');
    });
  });

  describe('preserveLinkStructure', () => {
    it('should extract HTML links', () => {
      const document: SEODocument = {
        content: '<a href="/page1">Internal Link</a><a href="https://external.com">External</a>',
        baseUrl: 'https://example.com',
      };

      const linkMap = seoService.preserveLinkStructure(document);

      expect(linkMap.totalLinks).toBe(2);
      expect(linkMap.internalCount).toBe(1);
      expect(linkMap.externalCount).toBe(1);
    });

    it('should extract markdown links', () => {
      const document: SEODocument = {
        content: '[Link Text](https://example.com/page)',
      };

      const linkMap = seoService.preserveLinkStructure(document);

      expect(linkMap.totalLinks).toBe(1);
      expect(linkMap.links[0]!.anchorText).toBe('Link Text');
      expect(linkMap.links[0]!.href).toBe('https://example.com/page');
    });

    it('should identify internal links', () => {
      const document: SEODocument = {
        content: '<a href="/internal">Internal</a><a href="#anchor">Anchor</a><a href="./relative">Relative</a>',
        baseUrl: 'https://example.com',
      };

      const linkMap = seoService.preserveLinkStructure(document);

      expect(linkMap.internalCount).toBe(3);
      expect(linkMap.externalCount).toBe(0);
    });

    it('should extract link attributes', () => {
      const document: SEODocument = {
        content: '<a href="/page" title="Page Title" rel="nofollow">Link</a>',
      };

      const linkMap = seoService.preserveLinkStructure(document);

      expect(linkMap.links[0]!.title).toBe('Page Title');
      expect(linkMap.links[0]!.rel).toBe('nofollow');
    });
  });

  describe('extractAltTexts', () => {
    it('should extract HTML image alt texts', () => {
      const document: SEODocument = {
        content: '<img src="image1.jpg" alt="Description of image"><img src="image2.jpg" alt="">',
      };

      const altTexts = seoService.extractAltTexts(document);

      expect(altTexts.length).toBe(2);
      expect(altTexts[0]!.altText).toBe('Description of image');
      expect(altTexts[1]!.altText).toBe('');
    });

    it('should extract markdown image alt texts', () => {
      const document: SEODocument = {
        content: '![Alt text for image](image.jpg)',
      };

      const altTexts = seoService.extractAltTexts(document);

      expect(altTexts.length).toBe(1);
      expect(altTexts[0]!.altText).toBe('Alt text for image');
    });

    it('should find keywords in alt text', () => {
      const document: SEODocument = {
        content: '<img src="seo.jpg" alt="SEO optimization diagram">',
      };

      const keywords: Keyword[] = [
        { term: 'seo', originalDensity: 1, targetDensity: 1, importance: 'high', originalCount: 1, wordCount: 1 },
      ];

      const altTexts = seoService.extractAltTexts(document, keywords);

      expect(altTexts[0]!.keywords).toContain('seo');
    });
  });


  describe('analyzeDocument', () => {
    it('should perform full SEO analysis', () => {
      const document: SEODocument = {
        content: `
          <html>
            <head>
              <title>SEO Guide</title>
              <meta name="description" content="Learn about SEO">
            </head>
            <body>
              <h1>SEO Optimization</h1>
              <p>SEO is important for visibility. SEO helps websites rank better.</p>
              <h2>Keywords</h2>
              <p>Keywords are essential for SEO.</p>
              <a href="/more">Learn more</a>
              <img src="seo.jpg" alt="SEO diagram">
            </body>
          </html>
        `,
        baseUrl: 'https://example.com',
      };

      const analysis = seoService.analyzeDocument(document);

      expect(analysis.keywords.length).toBeGreaterThan(0);
      expect(analysis.metaTags.title).toBeDefined();
      expect(analysis.metaTags.description).toBeDefined();
      expect(analysis.headingStructure.totalHeadings).toBe(2);
      expect(analysis.linkMap.totalLinks).toBe(1);
      expect(analysis.altTexts.length).toBe(1);
      expect(analysis.seoScore).toBeGreaterThan(0);
    });

    it('should use provided keywords', () => {
      const document: SEODocument = {
        content: '<p>Custom content here</p>',
      };

      const analysis = seoService.analyzeDocument(document, {
        keywords: ['custom', 'content'],
      });

      expect(analysis.keywords.length).toBe(2);
      expect(analysis.keywords.some(k => k.term === 'custom')).toBe(true);
    });
  });

  describe('validatePreservation', () => {
    it('should validate SEO preservation after transformation', () => {
      const original: SEODocument = {
        content: '<h1>SEO Title</h1><p>SEO content with SEO keywords about SEO.</p>',
      };

      const transformed: SEODocument = {
        content: '<h1>SEO Title</h1><p>SEO content with SEO keywords about SEO optimization.</p>',
      };

      const result = seoService.validatePreservation(original, transformed);

      expect(result.densityReport).toBeDefined();
      expect(result.headingStructure).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it('should detect issues when keywords are removed', () => {
      const original: SEODocument = {
        content: 'keyword keyword keyword keyword keyword other other other other other',
      };

      const transformed: SEODocument = {
        content: 'other other other other other other other other other other',
      };

      const result = seoService.validatePreservation(original, transformed, {
        keywords: ['keyword'],
      });

      expect(result.allPreserved).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should pass when SEO elements are preserved', () => {
      // Use longer content so small changes don't significantly affect density
      const original: SEODocument = {
        content: '<h1>Title</h1><p>Content with keyword here and more text to make the document longer so density changes are minimal.</p>',
      };

      const transformed: SEODocument = {
        content: '<h1>Title</h1><p>Content with keyword here and more text to make the document longer so density changes are small.</p>',
      };

      const result = seoService.validatePreservation(original, transformed, {
        keywords: ['keyword'],
      });

      expect(result.densityReport.overallValid).toBe(true);
    });
  });

  describe('SEO Score Calculation', () => {
    it('should give higher score for well-optimized content', () => {
      const wellOptimized: SEODocument = {
        content: `
          <html>
            <head>
              <title>Well Optimized Page</title>
              <meta name="description" content="A well optimized page description">
              <meta property="og:title" content="OG Title">
            </head>
            <body>
              <h1>Main Heading</h1>
              <h2>Subheading</h2>
              <p>Content with keywords repeated keywords for density.</p>
              <a href="/internal">Internal link</a>
              <a href="https://external.com">External link</a>
              <img src="image.jpg" alt="Descriptive alt text">
            </body>
          </html>
        `,
      };

      const poorlyOptimized: SEODocument = {
        content: '<p>Just some plain text without any SEO elements.</p>',
      };

      const wellOptimizedAnalysis = seoService.analyzeDocument(wellOptimized);
      const poorlyOptimizedAnalysis = seoService.analyzeDocument(poorlyOptimized);

      expect(wellOptimizedAnalysis.seoScore).toBeGreaterThan(poorlyOptimizedAnalysis.seoScore);
    });
  });

  describe('Recommendations', () => {
    it('should recommend adding title tag when missing', () => {
      const document: SEODocument = {
        content: '<p>Content without title</p>',
      };

      const analysis = seoService.analyzeDocument(document);

      expect(analysis.recommendations).toContain('Add a title tag');
    });

    it('should recommend adding meta description when missing', () => {
      const document: SEODocument = {
        content: '<title>Title</title><p>Content</p>',
      };

      const analysis = seoService.analyzeDocument(document);

      expect(analysis.recommendations).toContain('Add a meta description');
    });

    it('should recommend adding H1 when missing', () => {
      const document: SEODocument = {
        content: '<h2>Only H2</h2><p>Content</p>',
      };

      const analysis = seoService.analyzeDocument(document);

      expect(analysis.recommendations).toContain('Add an H1 heading');
    });
  });
});
