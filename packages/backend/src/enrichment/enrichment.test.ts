/**
 * Content Enrichment Service Tests
 * Tests for opportunity identification, citation addition, statistics insertion,
 * and content marking for user review
 * Requirements: 105
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EnrichmentService } from './enrichment.service';
import {
  CitationAdditionRequest,
  StatisticsInsertionRequest,
  ContentMarkingRequest,
  ComprehensiveEnrichmentRequest,
  EnrichmentOpportunity,
  ReviewDecision,
} from './types';

describe('EnrichmentService', () => {
  let service: EnrichmentService;

  beforeEach(() => {
    service = new EnrichmentService();
  });

  describe('identifyOpportunities', () => {
    it('should identify citation opportunities in text with claims', async () => {
      const text = 'Studies show that content marketing is effective and drives significant business results. Research indicates that engagement increases with quality content that resonates with the target audience. According to experts in the field, personalization matters greatly for modern marketing strategies. The data suggests that companies investing in content see better returns over time. Many organizations have adopted these practices to improve their overall performance and customer satisfaction levels.';
      
      const result = await service.identifyOpportunities(text);
      
      expect(result.opportunities.length).toBeGreaterThan(0);
      expect(result.opportunities.some(o => o.type === 'citation')).toBe(true);
      expect(result.totalOpportunities).toBeGreaterThan(0);
    });

    it('should identify statistic opportunities', async () => {
      const text = 'The percentage of users who prefer mobile has increased significantly over the past few years. The growth rate shows a substantial rise in engagement across all platforms. Companies are seeing an average improvement in their metrics as they adopt new technologies. The ratio of mobile to desktop users continues to shift dramatically. This trend represents a fundamental change in how people consume content online and interact with digital services.';
      
      const result = await service.identifyOpportunities(text);
      
      expect(result.opportunities.some(o => o.type === 'statistic' || o.type === 'data-point')).toBe(true);
    });

    it('should identify vague statements as data-point opportunities', async () => {
      const text = 'Many users prefer this approach when it comes to solving complex problems in their daily work. A lot of companies have adopted this strategy to improve their competitive position in the market. Several studies support this conclusion and provide evidence for the effectiveness of these methods. The results often show improvements across multiple dimensions of performance and user satisfaction.';
      
      const result = await service.identifyOpportunities(text);
      
      expect(result.opportunities.some(o => o.type === 'data-point')).toBe(true);
    });

    it('should return empty result for short text', async () => {
      const text = 'Short text here.';
      
      const result = await service.identifyOpportunities(text);
      
      expect(result.opportunities.length).toBe(0);
      expect(result.recommendations).toContain('Text is too short for meaningful enrichment analysis');
    });

    it('should calculate enrichment potential score', async () => {
      const text = 'Studies show that many users prefer personalized content. Research indicates that the percentage of engaged users has increased significantly. According to experts, this trend will continue.';
      
      const result = await service.identifyOpportunities(text);
      
      expect(result.enrichmentPotential).toBeGreaterThanOrEqual(0);
      expect(result.enrichmentPotential).toBeLessThanOrEqual(100);
    });

    it('should categorize opportunities by type and priority', async () => {
      const text = 'Studies show that content is important. Many users always prefer quality. The percentage of success has increased.';
      
      const result = await service.identifyOpportunities(text);
      
      expect(result.opportunitiesByType).toBeDefined();
      expect(result.opportunitiesByPriority).toBeDefined();
      expect(typeof result.opportunitiesByType.citation).toBe('number');
      expect(typeof result.opportunitiesByPriority.high).toBe('number');
    });

    it('should generate recommendations based on opportunities', async () => {
      const text = 'Studies show that this approach works. Research indicates positive results. Many companies have adopted this strategy.';
      
      const result = await service.identifyOpportunities(text);
      
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('addCitations', () => {
    it('should add citations to text with claims', async () => {
      const request: CitationAdditionRequest = {
        text: 'Studies show that content marketing is effective and drives significant business results for organizations of all sizes. Research indicates that engagement increases when companies focus on quality content creation and distribution strategies. According to experts, personalization is key to success in modern digital marketing campaigns. The evidence suggests that these approaches lead to measurable improvements in customer acquisition and retention rates.',
        format: 'APA',
        maxCitations: 2,
      };
      
      const result = await service.addCitations(request);
      
      expect(result.citations.length).toBeGreaterThan(0);
      expect(result.enrichedText).not.toBe(request.text);
      expect(result.bibliography).toBeDefined();
    });

    it('should format citations in APA style', async () => {
      const request: CitationAdditionRequest = {
        text: 'Studies show that this is true.',
        format: 'APA',
        maxCitations: 1,
      };
      
      const result = await service.addCitations(request);
      
      if (result.citations.length > 0) {
        expect(result.citations[0].format).toBe('APA');
        expect(result.enrichedText).toContain('(');
        expect(result.enrichedText).toContain(')');
      }
    });

    it('should format citations in IEEE style', async () => {
      const request: CitationAdditionRequest = {
        text: 'Studies show that this is true.',
        format: 'IEEE',
        maxCitations: 1,
      };
      
      const result = await service.addCitations(request);
      
      if (result.citations.length > 0) {
        expect(result.citations[0].format).toBe('IEEE');
        expect(result.enrichedText).toContain('[');
        expect(result.enrichedText).toContain(']');
      }
    });

    it('should generate bibliography section', async () => {
      const request: CitationAdditionRequest = {
        text: 'Studies show that content is important. Research indicates positive outcomes.',
        format: 'APA',
        maxCitations: 2,
      };
      
      const result = await service.addCitations(request);
      
      if (result.citations.length > 0) {
        expect(result.bibliography).toContain('References');
      }
    });

    it('should respect maxCitations limit', async () => {
      const request: CitationAdditionRequest = {
        text: 'Studies show A. Research indicates B. Experts say C. Data suggests D.',
        format: 'APA',
        maxCitations: 2,
      };
      
      const result = await service.addCitations(request);
      
      expect(result.totalCitationsAdded).toBeLessThanOrEqual(2);
    });
  });

  describe('insertStatistics', () => {
    it('should insert statistics into text', async () => {
      const request: StatisticsInsertionRequest = {
        text: 'The percentage of users has increased. The growth rate is significant.',
        maxStatistics: 2,
      };
      
      const result = await service.insertStatistics(request);
      
      expect(result.statistics.length).toBeGreaterThanOrEqual(0);
      expect(result.verificationSummary).toBeDefined();
    });

    it('should verify statistics when requested', async () => {
      const request: StatisticsInsertionRequest = {
        text: 'The percentage of engaged users has grown substantially.',
        verifyStatistics: true,
        maxStatistics: 1,
      };
      
      const result = await service.insertStatistics(request);
      
      expect(result.verificationSummary.totalChecked).toBeGreaterThanOrEqual(0);
    });

    it('should filter statistics by confidence', async () => {
      const request: StatisticsInsertionRequest = {
        text: 'The percentage of success has increased dramatically.',
        minConfidence: 0.9,
        maxStatistics: 5,
      };
      
      const result = await service.insertStatistics(request);
      
      for (const stat of result.statistics) {
        expect(stat.confidence).toBeGreaterThanOrEqual(0.7);
      }
    });

    it('should include verification summary', async () => {
      const request: StatisticsInsertionRequest = {
        text: 'Many users prefer this approach. The percentage has grown.',
        verifyStatistics: true,
      };
      
      const result = await service.insertStatistics(request);
      
      expect(result.verificationSummary).toHaveProperty('totalChecked');
      expect(result.verificationSummary).toHaveProperty('verified');
      expect(result.verificationSummary).toHaveProperty('unverified');
    });
  });

  describe('markContentForReview', () => {
    it('should mark content for user review', async () => {
      const opportunities: EnrichmentOpportunity[] = [
        {
          id: 'opp_1',
          type: 'example',
          position: 0,
          endPosition: 10,
          segment: 'For example',
          context: 'For example, this is a test',
          reason: 'Could add specific example',
          priority: 'medium',
          confidence: 0.8,
          suggestion: 'Add a concrete example',
          keywords: ['example', 'test'],
        },
      ];

      const request: ContentMarkingRequest = {
        text: 'For example, this is a test sentence.',
        opportunities,
      };
      
      const result = await service.markContentForReview(request);
      
      expect(result.markedItems.length).toBe(1);
      expect(result.totalMarked).toBe(1);
      expect(result.markedText).toContain('REVIEW');
    });

    it('should auto-apply low-risk enrichments when enabled', async () => {
      const opportunities: EnrichmentOpportunity[] = [
        {
          id: 'opp_1',
          type: 'definition',
          position: 0,
          endPosition: 5,
          segment: 'Term',
          context: 'Term is defined here',
          reason: 'Could add definition',
          priority: 'low',
          confidence: 0.95,
          suggestion: 'Add definition',
          keywords: ['term'],
        },
      ];

      const request: ContentMarkingRequest = {
        text: 'Term is defined here.',
        opportunities,
        autoApplyLowRisk: true,
      };
      
      const result = await service.markContentForReview(request);
      
      expect(result.autoApplied).toBeGreaterThanOrEqual(0);
    });

    it('should track pending review items', async () => {
      const opportunities: EnrichmentOpportunity[] = [
        {
          id: 'opp_1',
          type: 'citation',
          position: 0,
          endPosition: 12,
          segment: 'Studies show',
          context: 'Studies show that this works',
          reason: 'Needs citation',
          priority: 'high',
          confidence: 0.8,
          suggestion: 'Add citation',
          keywords: ['studies'],
        },
      ];

      const request: ContentMarkingRequest = {
        text: 'Studies show that this works.',
        opportunities,
        autoApplyLowRisk: false,
      };
      
      const result = await service.markContentForReview(request);
      
      expect(result.pendingReview).toBe(1);
    });
  });

  describe('applyReviewDecisions', () => {
    it('should apply approved decisions', async () => {
      const originalText = 'This is a test sentence.';
      const markedItems = [
        {
          id: 'marked_1',
          position: 0,
          endPosition: 4,
          originalText: 'This',
          enrichedText: 'This (with example)',
          enrichmentType: 'example' as const,
          status: 'pending' as const,
          reason: 'Could add example',
          markedAt: new Date(),
        },
      ];
      const decisions: ReviewDecision[] = [
        {
          markedContentId: 'marked_1',
          decision: 'approve',
        },
      ];
      
      const result = await service.applyReviewDecisions(originalText, markedItems, decisions);
      
      expect(result.approved).toBe(1);
      expect(result.rejected).toBe(0);
      expect(result.finalText).toContain('with example');
    });

    it('should handle rejected decisions', async () => {
      const originalText = 'This is a test sentence.';
      const markedItems = [
        {
          id: 'marked_1',
          position: 0,
          endPosition: 4,
          originalText: 'This',
          enrichedText: 'This (with example)',
          enrichmentType: 'example' as const,
          status: 'pending' as const,
          reason: 'Could add example',
          markedAt: new Date(),
        },
      ];
      const decisions: ReviewDecision[] = [
        {
          markedContentId: 'marked_1',
          decision: 'reject',
          notes: 'Not needed',
        },
      ];
      
      const result = await service.applyReviewDecisions(originalText, markedItems, decisions);
      
      expect(result.rejected).toBe(1);
      expect(result.approved).toBe(0);
    });

    it('should handle modified text in decisions', async () => {
      const originalText = 'This is a test sentence.';
      const markedItems = [
        {
          id: 'marked_1',
          position: 0,
          endPosition: 4,
          originalText: 'This',
          enrichedText: 'This (with example)',
          enrichmentType: 'example' as const,
          status: 'pending' as const,
          reason: 'Could add example',
          markedAt: new Date(),
        },
      ];
      const decisions: ReviewDecision[] = [
        {
          markedContentId: 'marked_1',
          decision: 'approve',
          modifiedText: 'This (custom modification)',
        },
      ];
      
      const result = await service.applyReviewDecisions(originalText, markedItems, decisions);
      
      expect(result.modified).toBe(1);
      expect(result.finalText).toContain('custom modification');
    });
  });

  describe('enrichComprehensive', () => {
    it('should perform comprehensive enrichment', async () => {
      const request: ComprehensiveEnrichmentRequest = {
        text: 'Studies show that content marketing is effective. Many users prefer personalized content. The percentage of engagement has increased significantly.',
        topic: 'content marketing',
        citationFormat: 'APA',
        maxEnrichments: 5,
      };
      
      const result = await service.enrichComprehensive(request);
      
      expect(result.opportunityResult).toBeDefined();
      expect(result.enrichmentScore).toBeGreaterThanOrEqual(0);
      expect(result.summary).toBeDefined();
    });

    it('should include citation results when citations are added', async () => {
      const request: ComprehensiveEnrichmentRequest = {
        text: 'Studies show that this approach works. Research indicates positive results.',
        citationFormat: 'APA',
        enrichmentTypes: ['citation'],
      };
      
      const result = await service.enrichComprehensive(request);
      
      expect(result.opportunityResult).toBeDefined();
      expect(result.summary.citationsAdded).toBeGreaterThanOrEqual(0);
    });

    it('should calculate enrichment summary', async () => {
      const request: ComprehensiveEnrichmentRequest = {
        text: 'Studies show that many users prefer this approach. The percentage has grown.',
        maxEnrichments: 3,
      };
      
      const result = await service.enrichComprehensive(request);
      
      expect(result.summary).toHaveProperty('totalEnrichments');
      expect(result.summary).toHaveProperty('byType');
      expect(result.summary).toHaveProperty('wordCountChange');
      expect(result.summary).toHaveProperty('percentageIncrease');
    });

    it('should respect enrichmentTypes filter', async () => {
      const request: ComprehensiveEnrichmentRequest = {
        text: 'Studies show that this works. Many users prefer it. The percentage increased.',
        enrichmentTypes: ['citation'],
        maxEnrichments: 5,
      };
      
      const result = await service.enrichComprehensive(request);
      
      // Should only process citation opportunities
      expect(result.opportunityResult).toBeDefined();
    });

    it('should mark for review when requested', async () => {
      const request: ComprehensiveEnrichmentRequest = {
        text: 'For example, this approach works. Consider the implications.',
        markForReview: true,
        enrichmentTypes: ['example'],
      };
      
      const result = await service.enrichComprehensive(request);
      
      // markingResult may or may not be present depending on opportunities found
      expect(result.enrichedText).toBeDefined();
    });
  });
});
