/**
 * Usage Metering Service Tests
 * Tests for usage tracking, quota management, and statistics
 * 
 * Requirements: 20 - Subscription tiers with different capabilities
 * Requirements: 66 - Usage analytics and benchmarking
 * Requirements: 80 - API rate limits with transparency
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prisma } from '../database/prisma';
import {
  trackUsageEvent,
  trackWordsProcessed,
  trackApiCall,
  trackStorageChange,
  getUsageMetrics,
  getUsageStatistics,
  getUsageHistory,
  getUsageTrends,
  getUsageSummary,
  checkQuota,
  getRateLimitInfo,
  getRateLimitHeaders,
  getStorageUsage,
  resetMonthlyQuotas,
  resetUserQuota,
} from './usage.service';
import { ResourceType, UsageEventType } from './types';
import { SubscriptionTier } from '../subscription/types';

// Mock Prisma
vi.mock('../database/prisma', () => ({
  prisma: {
    usageRecord: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    subscription: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Usage Metering Service', () => {
  const mockUserId = 'user-123';
  const mockSubscription = {
    id: 'sub-123',
    userId: mockUserId,
    tier: SubscriptionTier.BASIC,
    monthlyWordLimit: 50000,
    monthlyApiCallLimit: 500,
    storageLimit: BigInt(1024 * 1024 * 1024), // 1 GB
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockSubscription as never);
    vi.mocked(prisma.usageRecord.findMany).mockResolvedValue([]);
    vi.mocked(prisma.usageRecord.create).mockResolvedValue({
      id: 'record-123',
      userId: mockUserId,
      resourceType: ResourceType.WORDS,
      amount: BigInt(1000),
      periodStart: new Date(),
      periodEnd: new Date(),
      createdAt: new Date(),
    } as never);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('trackUsageEvent', () => {
    it('should create a usage record', async () => {
      await trackUsageEvent(mockUserId, {
        eventType: UsageEventType.TRANSFORMATION,
        resourceType: ResourceType.WORDS,
        amount: 1000,
      });

      expect(prisma.usageRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUserId,
          resourceType: ResourceType.WORDS,
          amount: BigInt(1000),
        }),
      });
    });
  });

  describe('trackWordsProcessed', () => {
    it('should track words processed', async () => {
      await trackWordsProcessed(mockUserId, 5000);

      expect(prisma.usageRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUserId,
          resourceType: ResourceType.WORDS,
          amount: BigInt(5000),
        }),
      });
    });

    it('should include metadata when provided', async () => {
      await trackWordsProcessed(mockUserId, 5000, { projectId: 'proj-123' });

      expect(prisma.usageRecord.create).toHaveBeenCalled();
    });
  });

  describe('trackApiCall', () => {
    it('should track API call', async () => {
      await trackApiCall(mockUserId, '/api/v1/transform');

      expect(prisma.usageRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUserId,
          resourceType: ResourceType.API_CALLS,
          amount: BigInt(1),
        }),
      });
    });
  });

  describe('trackStorageChange', () => {
    it('should track file upload', async () => {
      await trackStorageChange(mockUserId, 1024 * 1024, UsageEventType.FILE_UPLOAD);

      expect(prisma.usageRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUserId,
          resourceType: ResourceType.STORAGE,
          amount: BigInt(1024 * 1024),
        }),
      });
    });

    it('should track file delete with absolute value', async () => {
      await trackStorageChange(mockUserId, -1024 * 1024, UsageEventType.FILE_DELETE);

      expect(prisma.usageRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUserId,
          resourceType: ResourceType.STORAGE,
          amount: BigInt(1024 * 1024), // Absolute value
        }),
      });
    });
  });

  describe('getUsageMetrics', () => {
    it('should return usage metrics for words', async () => {
      vi.mocked(prisma.usageRecord.findMany).mockResolvedValue([
        { amount: BigInt(10000), resourceType: ResourceType.WORDS },
        { amount: BigInt(5000), resourceType: ResourceType.WORDS },
      ] as never);

      const metrics = await getUsageMetrics(mockUserId, ResourceType.WORDS);

      expect(metrics.used).toBe(15000);
      expect(metrics.limit).toBe(50000);
      expect(metrics.remaining).toBe(35000);
      expect(metrics.percentUsed).toBe(30);
    });

    it('should return usage metrics for API calls', async () => {
      vi.mocked(prisma.usageRecord.findMany).mockResolvedValue([
        { amount: BigInt(100), resourceType: ResourceType.API_CALLS },
      ] as never);

      const metrics = await getUsageMetrics(mockUserId, ResourceType.API_CALLS);

      expect(metrics.used).toBe(100);
      expect(metrics.limit).toBe(500);
      expect(metrics.remaining).toBe(400);
      expect(metrics.percentUsed).toBe(20);
    });

    it('should return usage metrics for storage', async () => {
      vi.mocked(prisma.usageRecord.findMany).mockResolvedValue([
        { amount: BigInt(512 * 1024 * 1024), resourceType: ResourceType.STORAGE },
      ] as never);

      const metrics = await getUsageMetrics(mockUserId, ResourceType.STORAGE);

      expect(metrics.used).toBe(512 * 1024 * 1024);
      expect(metrics.limit).toBe(1024 * 1024 * 1024);
      expect(metrics.remaining).toBe(512 * 1024 * 1024);
      expect(metrics.percentUsed).toBe(50);
    });

    it('should cap percentUsed at 100', async () => {
      vi.mocked(prisma.usageRecord.findMany).mockResolvedValue([
        { amount: BigInt(60000), resourceType: ResourceType.WORDS },
      ] as never);

      const metrics = await getUsageMetrics(mockUserId, ResourceType.WORDS);

      expect(metrics.percentUsed).toBe(100);
      expect(metrics.remaining).toBe(0);
    });
  });

  describe('getUsageStatistics', () => {
    it('should return comprehensive usage statistics', async () => {
      vi.mocked(prisma.usageRecord.findMany).mockResolvedValue([]);

      const stats = await getUsageStatistics(mockUserId);

      expect(stats.userId).toBe(mockUserId);
      expect(stats.tier).toBe(SubscriptionTier.BASIC);
      expect(stats.words).toBeDefined();
      expect(stats.apiCalls).toBeDefined();
      expect(stats.storage).toBeDefined();
      expect(stats.isOverLimit).toBe(false);
      expect(stats.warningThresholdReached).toBe(false);
    });

    it('should detect when over limit', async () => {
      vi.mocked(prisma.usageRecord.findMany).mockResolvedValue([
        { amount: BigInt(60000), resourceType: ResourceType.WORDS },
      ] as never);

      const stats = await getUsageStatistics(mockUserId);

      expect(stats.isOverLimit).toBe(true);
    });

    it('should detect warning threshold', async () => {
      vi.mocked(prisma.usageRecord.findMany).mockResolvedValue([
        { amount: BigInt(42000), resourceType: ResourceType.WORDS }, // 84% of 50000
      ] as never);

      const stats = await getUsageStatistics(mockUserId);

      expect(stats.warningThresholdReached).toBe(true);
    });
  });

  describe('getUsageHistory', () => {
    it('should return usage history grouped by date', async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      vi.mocked(prisma.usageRecord.findMany).mockResolvedValue([
        { amount: BigInt(1000), resourceType: ResourceType.WORDS, createdAt: today },
        { amount: BigInt(500), resourceType: ResourceType.WORDS, createdAt: yesterday },
        { amount: BigInt(10), resourceType: ResourceType.API_CALLS, createdAt: today },
      ] as never);

      const history = await getUsageHistory(mockUserId, 7);

      expect(history.userId).toBe(mockUserId);
      expect(history.entries.length).toBeGreaterThan(0);
      expect(history.totals.words).toBe(1500);
      expect(history.totals.apiCalls).toBe(10);
    });
  });

  describe('getUsageTrends', () => {
    it('should return usage trends', async () => {
      vi.mocked(prisma.usageRecord.findMany).mockResolvedValue([]);

      const trends = await getUsageTrends(mockUserId);

      expect(trends.length).toBe(3); // words, api_calls, storage
      expect(trends[0].resourceType).toBeDefined();
      expect(trends[0].trend).toBeDefined();
    });

    it('should detect upward trend', async () => {
      // Mock current period with higher usage
      vi.mocked(prisma.usageRecord.findMany)
        .mockResolvedValueOnce([{ amount: BigInt(10000), resourceType: ResourceType.WORDS }] as never)
        .mockResolvedValueOnce([{ amount: BigInt(5000), resourceType: ResourceType.WORDS }] as never);

      const trends = await getUsageTrends(mockUserId);
      const wordsTrend = trends.find(t => t.resourceType === ResourceType.WORDS);

      expect(wordsTrend?.trend).toBe('up');
    });
  });

  describe('getUsageSummary', () => {
    it('should return complete usage summary', async () => {
      vi.mocked(prisma.usageRecord.findMany).mockResolvedValue([]);

      const summary = await getUsageSummary(mockUserId);

      expect(summary.statistics).toBeDefined();
      expect(summary.history).toBeDefined();
      expect(summary.trends).toBeDefined();
      expect(summary.recommendations).toBeDefined();
    });

    it('should include recommendations when approaching limits', async () => {
      const now = new Date();
      vi.mocked(prisma.usageRecord.findMany).mockResolvedValue([
        { amount: BigInt(48000), resourceType: ResourceType.WORDS, createdAt: now }, // 96% of 50000
      ] as never);

      const summary = await getUsageSummary(mockUserId);

      expect(summary.recommendations.length).toBeGreaterThan(0);
      expect(summary.recommendations.some(r => r.includes('approaching'))).toBe(true);
    });
  });

  describe('checkQuota', () => {
    it('should allow when quota is available', async () => {
      vi.mocked(prisma.usageRecord.findMany).mockResolvedValue([
        { amount: BigInt(10000), resourceType: ResourceType.WORDS },
      ] as never);

      const result = await checkQuota(mockUserId, ResourceType.WORDS, 5000);

      expect(result.allowed).toBe(true);
      expect(result.upgradeRequired).toBe(false);
      expect(result.remaining).toBe(40000);
    });

    it('should deny when quota is exceeded', async () => {
      vi.mocked(prisma.usageRecord.findMany).mockResolvedValue([
        { amount: BigInt(48000), resourceType: ResourceType.WORDS },
      ] as never);

      const result = await checkQuota(mockUserId, ResourceType.WORDS, 5000);

      expect(result.allowed).toBe(false);
      expect(result.upgradeRequired).toBe(true);
      expect(result.message).toContain('Insufficient');
    });

    it('should include warning message when approaching limit', async () => {
      vi.mocked(prisma.usageRecord.findMany).mockResolvedValue([
        { amount: BigInt(42000), resourceType: ResourceType.WORDS }, // 84%
      ] as never);

      const result = await checkQuota(mockUserId, ResourceType.WORDS, 1000);

      expect(result.allowed).toBe(true);
      expect(result.message).toContain('Warning');
    });
  });

  describe('getRateLimitInfo', () => {
    it('should return rate limit info', async () => {
      vi.mocked(prisma.usageRecord.findMany).mockResolvedValue([
        { amount: BigInt(100), resourceType: ResourceType.API_CALLS },
      ] as never);

      const info = await getRateLimitInfo(mockUserId);

      expect(info.limit).toBe(500);
      expect(info.remaining).toBe(400);
      expect(info.percentUsed).toBe(20);
      expect(info.resetTime).toBeInstanceOf(Date);
    });
  });

  describe('getRateLimitHeaders', () => {
    it('should return rate limit headers', async () => {
      vi.mocked(prisma.usageRecord.findMany).mockResolvedValue([
        { amount: BigInt(100), resourceType: ResourceType.API_CALLS },
      ] as never);

      const headers = await getRateLimitHeaders(mockUserId);

      expect(headers['X-RateLimit-Limit']).toBe('500');
      expect(headers['X-RateLimit-Remaining']).toBe('400');
      expect(headers['X-RateLimit-Reset']).toBeDefined();
      expect(headers['X-RateLimit-Resource']).toBe(ResourceType.API_CALLS);
    });
  });

  describe('getStorageUsage', () => {
    it('should return storage usage', async () => {
      vi.mocked(prisma.usageRecord.findMany).mockResolvedValue([
        { amount: BigInt(256 * 1024 * 1024), resourceType: ResourceType.STORAGE },
      ] as never);

      const storage = await getStorageUsage(mockUserId);

      expect(storage.used).toBe(256 * 1024 * 1024);
      expect(storage.limit).toBe(1024 * 1024 * 1024);
      expect(storage.remaining).toBe(768 * 1024 * 1024);
      expect(storage.percentUsed).toBe(25);
    });
  });

  describe('resetMonthlyQuotas', () => {
    it('should reset quotas for expired subscriptions', async () => {
      vi.mocked(prisma.subscription.updateMany).mockResolvedValue({ count: 5 } as never);

      const result = await resetMonthlyQuotas();

      expect(result.usersReset).toBe(5);
      expect(prisma.subscription.updateMany).toHaveBeenCalled();
    });
  });

  describe('resetUserQuota', () => {
    it('should reset quota for a specific user', async () => {
      vi.mocked(prisma.subscription.update).mockResolvedValue(mockSubscription as never);

      await resetUserQuota(mockUserId);

      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        data: expect.objectContaining({
          currentPeriodStart: expect.any(Date),
          currentPeriodEnd: expect.any(Date),
        }),
      });
    });
  });

  describe('Free tier defaults', () => {
    it('should use free tier limits when no subscription exists', async () => {
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.usageRecord.findMany).mockResolvedValue([]);

      const metrics = await getUsageMetrics(mockUserId, ResourceType.WORDS);

      expect(metrics.limit).toBe(10000); // Free tier limit
    });
  });
});
