/**
 * Content Analysis Service Tests
 * Tests for writing style analysis, gap analysis, audience analysis,
 * competitive analysis, performance prediction, credibility assessment,
 * controversy detection, and freshness optimization
 * Requirements: 54, 62, 122-130
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ContentAnalysisService } from './content-analysis.service';

describe('ContentAnalysisService', () => {
  let service: ContentAnalysisService;

  beforeEach(() => {
    service = new ContentAnalysisService();
  });

  describe('analyzeWritingStyle', () => {
    it('should analyze formal writing style', async () => {
      const text = `
        Therefore, it is imperative to consider the implications of this decision.
        Furthermore, the consequences may be far-reaching and substantial.
        Consequently, we must proceed with due diligence and careful consideration.
        Moreover, the stakeholders have expressed their concerns regarding this matter.
      `;

      const result = await service.analyzeWritingStyle(text);

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^style_/);
      expect(result.formality).toBeGreaterThan(50);
      expect(result.category).toBeDefined();
      expect(result.voice).toBeDefined();
      expect(result.avgSentenceLength).toBeGreaterThan(0);
      expect(result.vocabularyRichness).toBeGreaterThan(0);
      expect(result.readabilityScore).toBeGreaterThanOrEqual(0);
      expect(result.readabilityScore).toBeLessThanOrEqual(100);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should analyze informal writing style', async () => {
      const text = `
        Hey, so basically this is gonna be super cool!
        Yeah, I totally think we should just go for it.
        It's kinda awesome how things work out sometimes.
        Stuff like this is pretty much the best thing ever.
      `;

      const result = await service.analyzeWritingStyle(text);

      expect(result).toBeDefined();
      expect(result.formality).toBeLessThan(50);
      expect(result.category).toBeDefined();
    });

    it('should detect style inconsistencies', async () => {
      const text = `
        Therefore, the implementation of this methodology is paramount.
        Furthermore, we must consider the theoretical implications.
        Hey, this is gonna be super cool though!
        Consequently, the results demonstrate significant findings.
      `;

      const result = await service.analyzeWritingStyle(text);

      expect(result).toBeDefined();
      expect(result.inconsistencies).toBeDefined();
      expect(Array.isArray(result.inconsistencies)).toBe(true);
    });

    it('should handle short text gracefully', async () => {
      const text = 'Short text.';

      const result = await service.analyzeWritingStyle(text);

      expect(result).toBeDefined();
      expect(result.formality).toBe(50);
    });
  });

  describe('identifyGaps', () => {
    it('should identify content gaps for a topic', async () => {
      const text = `
        Machine learning is a subset of artificial intelligence.
        It involves training algorithms on data to make predictions.
        Neural networks are commonly used in deep learning applications.
      `;
      const topic = 'machine learning';

      const result = await service.identifyGaps(text, topic);

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^gap_/);
      expect(result.completenessScore).toBeGreaterThanOrEqual(0);
      expect(result.completenessScore).toBeLessThanOrEqual(100);
      expect(Array.isArray(result.missingTopics)).toBe(true);
      expect(Array.isArray(result.missingSubtopics)).toBe(true);
      expect(Array.isArray(result.coveredTopics)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should provide topic coverage breakdown', async () => {
      const text = `
        Software development best practices include code reviews and testing.
        Implementation of these practices leads to better quality software.
        The benefits include fewer bugs and improved maintainability.
      `;
      const topic = 'software development';

      const result = await service.identifyGaps(text, topic);

      expect(result.topicCoverage).toBeDefined();
      expect(Array.isArray(result.topicCoverage)).toBe(true);
      result.topicCoverage.forEach(tc => {
        expect(tc.topic).toBeDefined();
        expect(tc.coverage).toBeGreaterThanOrEqual(0);
        expect(tc.coverage).toBeLessThanOrEqual(100);
        expect(['shallow', 'moderate', 'deep']).toContain(tc.depth);
      });
    });
  });

  describe('analyzeAudience', () => {
    it('should identify technical audience', async () => {
      const text = `
        The algorithm implements a binary search tree with O(log n) complexity.
        The API endpoint accepts JSON payloads and returns structured responses.
        Database queries are optimized using indexes and query caching.
        The server architecture follows microservices patterns.
      `;

      const result = await service.analyzeAudience(text);

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^audience_/);
      expect(result.primaryAudience).toBe('technical');
      expect(result.technicalLevel).toBeGreaterThan(0);
      expect(result.readingLevel).toBeGreaterThan(0);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should identify general audience', async () => {
      const text = `
        This is a simple guide for beginners.
        We will explain things in easy terms.
        Anyone can follow these basic steps.
        No special knowledge is required.
      `;

      const result = await service.analyzeAudience(text);

      expect(result).toBeDefined();
      expect(['general', 'casual']).toContain(result.primaryAudience);
    });

    it('should find engagement indicators', async () => {
      const text = `
        Did you know that 85% of users prefer this approach?
        Click here to learn more about our amazing features!
        Subscribe now to get exclusive access.
        What would you do in this situation?
      `;

      const result = await service.analyzeAudience(text);

      expect(result.engagementIndicators).toBeDefined();
      expect(Array.isArray(result.engagementIndicators)).toBe(true);
      expect(result.engagementIndicators.length).toBeGreaterThan(0);
    });
  });


  describe('compareWithCompetitors', () => {
    it('should compare content with competitors', async () => {
      const text = `
        Our product offers unique features that set us apart.
        We provide excellent customer service and support.
        Our pricing is competitive and transparent.
      `;
      const competitors = [
        'Their product has basic features. Customer service is limited.',
        'Another competitor offers similar services at higher prices.',
      ];

      const result = await service.compareWithCompetitors(text, competitors);

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^competitive_/);
      expect(result.competitiveScore).toBeGreaterThanOrEqual(0);
      expect(result.competitiveScore).toBeLessThanOrEqual(100);
      expect(Array.isArray(result.strengths)).toBe(true);
      expect(Array.isArray(result.weaknesses)).toBe(true);
      expect(Array.isArray(result.opportunities)).toBe(true);
      expect(Array.isArray(result.comparisons)).toBe(true);
      expect(result.comparisons.length).toBe(2);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should handle empty competitors array', async () => {
      const text = 'Our product is great.';
      const competitors: string[] = [];

      const result = await service.compareWithCompetitors(text, competitors);

      expect(result).toBeDefined();
      expect(result.comparisons.length).toBe(0);
    });

    it('should calculate similarity scores', async () => {
      const text = 'Machine learning and artificial intelligence are transforming industries.';
      const competitors = [
        'Machine learning is changing how businesses operate.',
        'Completely different topic about cooking recipes.',
      ];

      const result = await service.compareWithCompetitors(text, competitors);

      expect(result.comparisons[0]?.similarity).toBeGreaterThan(result.comparisons[1]?.similarity || 0);
    });
  });

  describe('predictPerformance', () => {
    it('should predict content performance', async () => {
      const text = `
        # How to Improve Your Writing Skills

        Writing is an essential skill in today's world. Here are 5 tips to help you improve:

        1. Read more books and articles
        2. Practice writing daily
        3. Get feedback from others
        4. Study grammar and style guides
        5. Edit and revise your work

        Did you know that 73% of employers value strong writing skills?

        Click here to download our free writing guide!
      `;

      const result = await service.predictPerformance(text);

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^performance_/);
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.engagementRate).toBeGreaterThanOrEqual(0);
      expect(result.readabilityScore).toBeGreaterThanOrEqual(0);
      expect(result.shareability).toBeGreaterThanOrEqual(0);
      expect(result.seoPerformance).toBeGreaterThanOrEqual(0);
      expect(result.conversionPotential).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(Array.isArray(result.factors)).toBe(true);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should identify performance factors', async () => {
      const text = `
        This is a test article about performance prediction.
        It contains multiple sentences to analyze.
        The content should be evaluated for various metrics.
      `;

      const result = await service.predictPerformance(text);

      expect(result.factors.length).toBeGreaterThan(0);
      result.factors.forEach(factor => {
        expect(factor.name).toBeDefined();
        expect(factor.score).toBeGreaterThanOrEqual(0);
        expect(factor.score).toBeLessThanOrEqual(100);
        expect(factor.impact).toBeGreaterThanOrEqual(-1);
        expect(factor.impact).toBeLessThanOrEqual(1);
        expect(factor.suggestion).toBeDefined();
      });
    });
  });

  describe('assessCredibility', () => {
    it('should assess content credibility', async () => {
      const text = `
        According to research by Smith (2023), the findings indicate significant results.
        Studies show that 85% of participants experienced improvements.
        Dr. Johnson, a leading expert in the field, confirms these findings.
        The methodology was peer-reviewed and validated by independent researchers.
      `;

      const result = await service.assessCredibility(text);

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^credibility_/);
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.sourceCitationScore).toBeGreaterThanOrEqual(0);
      expect(result.factualIndicators).toBeGreaterThanOrEqual(0);
      expect(result.authoritySignals).toBeGreaterThanOrEqual(0);
      expect(result.biasScore).toBeGreaterThanOrEqual(0);
      expect(result.transparencyScore).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.factors)).toBe(true);
      expect(Array.isArray(result.issues)).toBe(true);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should detect low credibility content', async () => {
      const text = `
        Everyone knows this is the best product ever!
        It always works perfectly and never fails.
        This is obviously the only solution you need.
      `;

      const result = await service.assessCredibility(text);

      expect(result).toBeDefined();
      expect(result.biasScore).toBeLessThan(80);
    });

    it('should find credibility issues', async () => {
      const text = `
        Studies show that this product is effective.
        Research proves that our method works.
        Experts agree that this is the best approach.
      `;

      const result = await service.assessCredibility(text);

      expect(result.issues).toBeDefined();
      expect(Array.isArray(result.issues)).toBe(true);
    });
  });

  describe('detectControversy', () => {
    it('should detect controversial content', async () => {
      const text = `
        The debate over gun control continues to divide the nation.
        Immigration policies have become increasingly polarizing.
        Climate change remains a contentious topic in politics.
      `;

      const result = await service.detectControversy(text);

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^controversy_/);
      expect(result.controversyLevel).toBeGreaterThan(0);
      expect(result.isControversial).toBe(true);
      expect(Array.isArray(result.controversialTopics)).toBe(true);
      expect(result.controversialTopics.length).toBeGreaterThan(0);
      expect(['low', 'medium', 'high', 'critical']).toContain(result.riskLevel);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should identify neutral content', async () => {
      const text = `
        The weather today is sunny with a high of 75 degrees.
        Trees provide shade and produce oxygen.
        Water is essential for human survival.
      `;

      const result = await service.detectControversy(text);

      expect(result).toBeDefined();
      expect(result.controversyLevel).toBeLessThan(50);
      expect(result.isControversial).toBe(false);
      expect(result.riskLevel).toBe('low');
    });

    it('should detect sensitive language', async () => {
      const text = `
        The liberal and conservative viewpoints differ significantly.
        Democrats and Republicans continue to debate the issue.
      `;

      const result = await service.detectControversy(text);

      expect(result.sensitiveLanguage).toBeDefined();
      expect(Array.isArray(result.sensitiveLanguage)).toBe(true);
    });
  });


  describe('assessFreshness', () => {
    it('should assess content freshness', async () => {
      const text = `
        In 2024, artificial intelligence continues to evolve rapidly.
        This year has seen significant advances in machine learning.
        Recent developments in AI have transformed many industries.
      `;

      const result = await service.assessFreshness(text);

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^freshness_/);
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.trendingAlignment).toBeGreaterThanOrEqual(0);
      expect(result.evergreenScore).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.ageIndicators)).toBe(true);
      expect(Array.isArray(result.outdatedReferences)).toBe(true);
      expect(Array.isArray(result.timeSensitiveElements)).toBe(true);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should detect outdated references', async () => {
      const text = `
        According to a 2010 study, the results were significant.
        In 2005, researchers discovered this phenomenon.
        Data from 2008 shows interesting trends.
      `;

      const result = await service.assessFreshness(text);

      expect(result.outdatedReferences).toBeDefined();
      expect(result.outdatedReferences.length).toBeGreaterThan(0);
    });

    it('should identify age indicators', async () => {
      const text = `
        Last year, we launched our new product.
        The event on January 15, 2024 was successful.
        This month we are celebrating our anniversary.
      `;

      const result = await service.assessFreshness(text);

      expect(result.ageIndicators).toBeDefined();
      expect(result.ageIndicators.length).toBeGreaterThan(0);
    });

    it('should calculate evergreen score', async () => {
      const text = `
        The fundamental principles of good writing remain timeless.
        Classic literature continues to inspire readers.
        These principles have stood the test of time.
      `;

      const result = await service.assessFreshness(text);

      expect(result.evergreenScore).toBeGreaterThan(50);
    });
  });

  describe('analyzeComprehensive', () => {
    it('should perform comprehensive analysis', async () => {
      const text = `
        # Complete Guide to Content Marketing

        Content marketing is essential for modern businesses. According to recent studies,
        companies that invest in content marketing see 3x more leads than traditional marketing.

        ## Key Benefits

        1. Increased brand awareness
        2. Better customer engagement
        3. Higher conversion rates

        Did you know that 70% of consumers prefer learning about products through content?

        Subscribe to our newsletter for more insights!
      `;

      const result = await service.analyzeComprehensive(text);

      expect(result).toBeDefined();
      expect(result.styleAnalysis).toBeDefined();
      expect(result.audienceProfile).toBeDefined();
      expect(result.performancePrediction).toBeDefined();
      expect(result.credibilityScore).toBeDefined();
      expect(result.controversyReport).toBeDefined();
      expect(result.freshnessScore).toBeDefined();
      expect(result.overallQualityScore).toBeGreaterThanOrEqual(0);
      expect(result.overallQualityScore).toBeLessThanOrEqual(100);
      expect(Array.isArray(result.topRecommendations)).toBe(true);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.totalProcessingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should include gap analysis when topic provided', async () => {
      const text = `
        Machine learning algorithms process data to make predictions.
        Neural networks are used in deep learning applications.
      `;

      const result = await service.analyzeComprehensive(text, {
        topic: 'machine learning',
      });

      expect(result.gapAnalysis).toBeDefined();
      expect(result.gapAnalysis?.completenessScore).toBeGreaterThanOrEqual(0);
    });

    it('should include competitive analysis when competitors provided', async () => {
      const text = 'Our product offers unique features and excellent support.';
      const competitors = ['Competitor offers basic features.'];

      const result = await service.analyzeComprehensive(text, {
        competitors,
      });

      expect(result.competitiveAnalysis).toBeDefined();
      expect(result.competitiveAnalysis?.comparisons.length).toBe(1);
    });

    it('should generate top recommendations', async () => {
      const text = `
        This is a sample text for analysis.
        It contains multiple sentences.
        The content should be evaluated.
      `;

      const result = await service.analyzeComprehensive(text);

      expect(result.topRecommendations).toBeDefined();
      expect(Array.isArray(result.topRecommendations)).toBe(true);
    });
  });
});
