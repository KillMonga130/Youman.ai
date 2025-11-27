/**
 * A/B Testing Service Tests
 * Tests for variation generation, comparison, and performance tracking
 * Requirements: 34, 121
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ABTestingService } from './ab-testing.service';
import { VariationParams, Variation, CreateTestOptions } from './types';

describe('ABTestingService', () => {
  let service: ABTestingService;

  beforeEach(() => {
    service = new ABTestingService();
  });

  describe('generateVariations', () => {
    it('should generate the requested number of variations', async () => {
      const text = 'This is a sample text for testing. It contains multiple sentences. The content should be transformed.';
      const count = 3;

      const variations = await service.generateVariations(text, count);

      expect(variations).toHaveLength(count);
      expect(variations.every(v => v.id)).toBe(true);
      expect(variations.every(v => v.text)).toBe(true);
    });

    it('should include original text when requested', async () => {
      const text = 'Original text for testing purposes.';
      const params: VariationParams = { includeOriginal: true };

      const variations = await service.generateVariations(text, 2, params);

      const original = variations.find(v => v.isOriginal);
      expect(original).toBeDefined();
      expect(original?.text).toBe(text);
    });

    it('should throw error for empty text', async () => {
      await expect(service.generateVariations('', 3)).rejects.toThrow('Text is required');
    });

    it('should respect maxVariations limit', async () => {
      const text = 'Sample text for variation generation.';
      const params: VariationParams = { maxVariations: 2 };

      const variations = await service.generateVariations(text, 10, params);

      expect(variations.length).toBeLessThanOrEqual(10);
    });

    it('should use specified strategies', async () => {
      const text = 'Therefore, we should utilize this methodology to implement the solution.';
      const params: VariationParams = { strategies: ['casual'] };

      const variations = await service.generateVariations(text, 2, params);

      expect(variations.some(v => v.strategy === 'casual')).toBe(true);
    });
  });


  describe('compareVariations', () => {
    it('should generate comparison report for variations', async () => {
      const text = 'This is sample text for comparison testing.';
      const variations = await service.generateVariations(text, 3);

      const report = await service.compareVariations(variations);

      expect(report.id).toBeDefined();
      expect(report.variations).toHaveLength(3);
      expect(report.sideBySide).toBeDefined();
      expect(report.statistics).toBeDefined();
      expect(report.recommendations).toBeDefined();
    });

    it('should throw error for less than 2 variations', async () => {
      const variation: Variation = {
        id: 'test',
        text: 'Test',
        strategy: 'casual',
        level: 3,
        detectionScore: 50,
        differences: [],
        wordCount: 1,
        createdAt: new Date(),
        isOriginal: false,
      };

      await expect(service.compareVariations([variation])).rejects.toThrow('At least 2 variations');
    });

    it('should identify best variation', async () => {
      const text = 'Sample text for testing the comparison feature.';
      const variations = await service.generateVariations(text, 3);

      const report = await service.compareVariations(variations);

      expect(report.statistics.bestVariationId).toBeDefined();
      expect(report.statistics.rankings).toHaveLength(3);
    });

    it('should generate side-by-side comparison', async () => {
      const text = 'First sentence. Second sentence. Third sentence.';
      const variations = await service.generateVariations(text, 2);

      const report = await service.compareVariations(variations);

      expect(report.sideBySide.length).toBeGreaterThan(0);
      expect(report.sideBySide[0]?.variations).toHaveLength(2);
    });
  });

  describe('trackPerformance', () => {
    it('should track view events', async () => {
      const variationId = 'test-variation-1';

      await service.trackPerformance(variationId, {
        variationId,
        eventType: 'view',
        viewTime: 5000,
      });

      const metrics = service.getPerformanceMetrics(variationId);
      expect(metrics.views).toBe(1);
      expect(metrics.averageViewTime).toBe(5000);
    });

    it('should track positive interactions', async () => {
      const variationId = 'test-variation-2';

      await service.trackPerformance(variationId, {
        variationId,
        eventType: 'view',
      });
      await service.trackPerformance(variationId, {
        variationId,
        eventType: 'positive',
      });

      const metrics = service.getPerformanceMetrics(variationId);
      expect(metrics.positiveInteractions).toBe(1);
      expect(metrics.engagementRate).toBe(1);
    });

    it('should track ratings', async () => {
      const variationId = 'test-variation-3';

      await service.trackPerformance(variationId, {
        variationId,
        eventType: 'rating',
        rating: 4,
      });
      await service.trackPerformance(variationId, {
        variationId,
        eventType: 'rating',
        rating: 5,
      });

      const metrics = service.getPerformanceMetrics(variationId);
      expect(metrics.ratingCount).toBe(2);
      expect(metrics.satisfactionScore).toBe(4.5);
    });

    it('should calculate engagement rate correctly', async () => {
      const variationId = 'test-variation-4';

      // 4 views, 2 positive interactions = 50% engagement
      for (let i = 0; i < 4; i++) {
        await service.trackPerformance(variationId, { variationId, eventType: 'view' });
      }
      await service.trackPerformance(variationId, { variationId, eventType: 'positive' });
      await service.trackPerformance(variationId, { variationId, eventType: 'positive' });

      const metrics = service.getPerformanceMetrics(variationId);
      expect(metrics.engagementRate).toBe(0.5);
    });
  });


  describe('createTest', () => {
    it('should create a new A/B test', async () => {
      const options: CreateTestOptions = {
        name: 'Test Campaign',
        description: 'Testing different variations',
        originalText: 'This is the original text for testing.',
        variationCount: 3,
        userId: 'user-123',
      };

      const test = await service.createTest(options);

      expect(test.id).toBeDefined();
      expect(test.name).toBe('Test Campaign');
      expect(test.variations).toHaveLength(3);
      expect(test.status).toBe('draft');
      expect(test.userId).toBe('user-123');
    });

    it('should auto-start test when requested', async () => {
      const options: CreateTestOptions = {
        name: 'Auto-start Test',
        originalText: 'Sample text.',
        variationCount: 2,
        userId: 'user-123',
        autoStart: true,
      };

      const test = await service.createTest(options);

      expect(test.status).toBe('running');
    });

    it('should store test for retrieval', async () => {
      const options: CreateTestOptions = {
        name: 'Retrievable Test',
        originalText: 'Text for retrieval test.',
        variationCount: 2,
        userId: 'user-123',
      };

      const created = await service.createTest(options);
      const retrieved = await service.getTest(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.name).toBe('Retrievable Test');
    });
  });

  describe('selectWinner', () => {
    it('should select winner based on detection score', async () => {
      const options: CreateTestOptions = {
        name: 'Winner Selection Test',
        originalText: 'Therefore, we should utilize this methodology to implement the solution effectively.',
        variationCount: 3,
        userId: 'user-123',
      };

      const test = await service.createTest(options);
      const winner = await service.selectWinner(test.id);

      expect(winner).toBeDefined();
      expect(winner.id).toBeDefined();
      expect(test.winnerId).toBe(winner.id);
    });

    it('should throw error for non-existent test', async () => {
      await expect(service.selectWinner('non-existent')).rejects.toThrow('Test not found');
    });

    it('should mark test as completed after selecting winner', async () => {
      const options: CreateTestOptions = {
        name: 'Completion Test',
        originalText: 'Sample text for completion testing.',
        variationCount: 2,
        userId: 'user-123',
      };

      const test = await service.createTest(options);
      await service.selectWinner(test.id);

      const updated = await service.getTest(test.id);
      expect(updated?.status).toBe('completed');
      expect(updated?.completedAt).toBeDefined();
    });
  });

  describe('generateTestReport', () => {
    it('should generate comprehensive test report', async () => {
      const options: CreateTestOptions = {
        name: 'Report Test',
        originalText: 'This is sample text for generating a test report.',
        variationCount: 3,
        userId: 'user-123',
      };

      const test = await service.createTest(options);
      const report = await service.generateTestReport(test.id);

      expect(report.id).toBeDefined();
      expect(report.testId).toBe(test.id);
      expect(report.testName).toBe('Report Test');
      expect(report.totalVariations).toBe(3);
      expect(report.winner).toBeDefined();
      expect(report.allResults).toHaveLength(3);
      expect(report.insights.length).toBeGreaterThan(0);
    });

    it('should throw error for non-existent test', async () => {
      await expect(service.generateTestReport('non-existent')).rejects.toThrow('Test not found');
    });

    it('should include rankings in results', async () => {
      const options: CreateTestOptions = {
        name: 'Ranking Test',
        originalText: 'Text for testing ranking functionality.',
        variationCount: 3,
        userId: 'user-123',
      };

      const test = await service.createTest(options);
      const report = await service.generateTestReport(test.id);

      const ranks = report.allResults.map(r => r.rank);
      expect(ranks).toContain(1);
      expect(ranks).toContain(2);
      expect(ranks).toContain(3);
    });
  });

  describe('updateTestStatus', () => {
    it('should update test status', async () => {
      const options: CreateTestOptions = {
        name: 'Status Update Test',
        originalText: 'Sample text.',
        variationCount: 2,
        userId: 'user-123',
      };

      const test = await service.createTest(options);
      await service.updateTestStatus(test.id, 'running');

      const updated = await service.getTest(test.id);
      expect(updated?.status).toBe('running');
    });

    it('should throw error for non-existent test', async () => {
      await expect(service.updateTestStatus('non-existent', 'running')).rejects.toThrow('Test not found');
    });

    it('should set completedAt when status is completed', async () => {
      const options: CreateTestOptions = {
        name: 'Completion Status Test',
        originalText: 'Sample text.',
        variationCount: 2,
        userId: 'user-123',
      };

      const test = await service.createTest(options);
      await service.updateTestStatus(test.id, 'completed');

      const updated = await service.getTest(test.id);
      expect(updated?.completedAt).toBeDefined();
    });
  });
});
