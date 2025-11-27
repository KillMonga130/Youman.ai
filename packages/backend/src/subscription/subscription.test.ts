/**
 * Subscription Service Tests
 * Tests for subscription management, usage tracking, and quota enforcement
 * 
 * Requirements: 20 - Subscription tiers with different capabilities
 * Requirements: 86 - Billing and invoice management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  SubscriptionTier,
  SubscriptionStatus,
  TIER_LIMITS,
  type TierLimits,
} from './types';

// Mock Prisma
vi.mock('../database/prisma', () => ({
  prisma: {
    subscription: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    usageRecord: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock config
vi.mock('../config/env', () => ({
  config: {
    stripe: {
      secretKey: null,
      webhookSecret: null,
    },
  },
}));

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { prisma } from '../database/prisma';

// ============================================
// Tier Limits Tests
// ============================================

describe('Subscription Tier Limits', () => {
  describe('FREE tier', () => {
    it('should have correct word limit', () => {
      expect(TIER_LIMITS[SubscriptionTier.FREE].monthlyWordLimit).toBe(10000);
    });

    it('should have correct API call limit', () => {
      expect(TIER_LIMITS[SubscriptionTier.FREE].monthlyApiCallLimit).toBe(100);
    });

    it('should have correct storage limit (100 MB)', () => {
      expect(TIER_LIMITS[SubscriptionTier.FREE].storageLimit).toBe(BigInt(100 * 1024 * 1024));
    });

    it('should not have priority processing', () => {
      expect(TIER_LIMITS[SubscriptionTier.FREE].priorityProcessing).toBe(false);
    });

    it('should not have API access', () => {
      expect(TIER_LIMITS[SubscriptionTier.FREE].apiAccess).toBe(false);
    });
  });

  describe('BASIC tier', () => {
    it('should have correct word limit', () => {
      expect(TIER_LIMITS[SubscriptionTier.BASIC].monthlyWordLimit).toBe(50000);
    });

    it('should have correct API call limit', () => {
      expect(TIER_LIMITS[SubscriptionTier.BASIC].monthlyApiCallLimit).toBe(500);
    });

    it('should have API access', () => {
      expect(TIER_LIMITS[SubscriptionTier.BASIC].apiAccess).toBe(true);
    });

    it('should have advanced analytics', () => {
      expect(TIER_LIMITS[SubscriptionTier.BASIC].advancedAnalytics).toBe(true);
    });
  });

  describe('PROFESSIONAL tier', () => {
    it('should have correct word limit', () => {
      expect(TIER_LIMITS[SubscriptionTier.PROFESSIONAL].monthlyWordLimit).toBe(200000);
    });

    it('should have priority processing', () => {
      expect(TIER_LIMITS[SubscriptionTier.PROFESSIONAL].priorityProcessing).toBe(true);
    });

    it('should have custom AI models', () => {
      expect(TIER_LIMITS[SubscriptionTier.PROFESSIONAL].customAiModels).toBe(true);
    });

    it('should have team collaboration', () => {
      expect(TIER_LIMITS[SubscriptionTier.PROFESSIONAL].teamCollaboration).toBe(true);
    });
  });

  describe('ENTERPRISE tier', () => {
    it('should have correct word limit', () => {
      expect(TIER_LIMITS[SubscriptionTier.ENTERPRISE].monthlyWordLimit).toBe(1000000);
    });

    it('should have unlimited concurrent projects', () => {
      expect(TIER_LIMITS[SubscriptionTier.ENTERPRISE].maxConcurrentProjects).toBe(-1);
    });

    it('should have all premium features', () => {
      const limits = TIER_LIMITS[SubscriptionTier.ENTERPRISE];
      expect(limits.priorityProcessing).toBe(true);
      expect(limits.customAiModels).toBe(true);
      expect(limits.advancedAnalytics).toBe(true);
      expect(limits.teamCollaboration).toBe(true);
      expect(limits.apiAccess).toBe(true);
    });
  });

  describe('Tier progression', () => {
    it('should have increasing word limits across tiers', () => {
      const tiers = [
        SubscriptionTier.FREE,
        SubscriptionTier.BASIC,
        SubscriptionTier.PROFESSIONAL,
        SubscriptionTier.ENTERPRISE,
      ];

      for (let i = 1; i < tiers.length; i++) {
        expect(TIER_LIMITS[tiers[i]].monthlyWordLimit)
          .toBeGreaterThan(TIER_LIMITS[tiers[i - 1]].monthlyWordLimit);
      }
    });

    it('should have increasing API call limits across tiers', () => {
      const tiers = [
        SubscriptionTier.FREE,
        SubscriptionTier.BASIC,
        SubscriptionTier.PROFESSIONAL,
        SubscriptionTier.ENTERPRISE,
      ];

      for (let i = 1; i < tiers.length; i++) {
        expect(TIER_LIMITS[tiers[i]].monthlyApiCallLimit)
          .toBeGreaterThan(TIER_LIMITS[tiers[i - 1]].monthlyApiCallLimit);
      }
    });
  });
});

// ============================================
// Subscription Service Tests
// ============================================

describe('Subscription Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createSubscription', () => {
    it('should create a free subscription by default', async () => {
      const userId = 'user-123';
      const mockSubscription = {
        id: 'sub-123',
        userId,
        tier: 'FREE',
        status: 'ACTIVE',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        monthlyWordLimit: 10000,
        monthlyApiCallLimit: 100,
        storageLimit: BigInt(100 * 1024 * 1024),
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.subscription.create).mockResolvedValue(mockSubscription);

      const { createSubscription } = await import('./subscription.service');
      const result = await createSubscription(userId);

      expect(result.tier).toBe(SubscriptionTier.FREE);
      expect(result.status).toBe(SubscriptionStatus.ACTIVE);
      expect(prisma.subscription.create).toHaveBeenCalled();
    });

    it('should throw error if subscription already exists', async () => {
      const userId = 'user-123';
      const existingSubscription = {
        id: 'sub-123',
        userId,
        tier: 'FREE',
        status: 'ACTIVE',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        monthlyWordLimit: 10000,
        monthlyApiCallLimit: 100,
        storageLimit: BigInt(100 * 1024 * 1024),
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(existingSubscription);

      const { createSubscription, SubscriptionError } = await import('./subscription.service');
      
      await expect(createSubscription(userId)).rejects.toThrow(SubscriptionError);
    });
  });

  describe('getSubscription', () => {
    it('should return existing subscription', async () => {
      const userId = 'user-123';
      const mockSubscription = {
        id: 'sub-123',
        userId,
        tier: 'BASIC',
        status: 'ACTIVE',
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_stripe_123',
        monthlyWordLimit: 50000,
        monthlyApiCallLimit: 500,
        storageLimit: BigInt(1024 * 1024 * 1024),
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockSubscription);

      const { getSubscription } = await import('./subscription.service');
      const result = await getSubscription(userId);

      expect(result.tier).toBe(SubscriptionTier.BASIC);
      expect(result.limits.monthlyWordLimit).toBe(50000);
    });

    it('should auto-create free subscription if none exists', async () => {
      const userId = 'user-123';
      const mockSubscription = {
        id: 'sub-123',
        userId,
        tier: 'FREE',
        status: 'ACTIVE',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        monthlyWordLimit: 10000,
        monthlyApiCallLimit: 100,
        storageLimit: BigInt(100 * 1024 * 1024),
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.subscription.findUnique)
        .mockResolvedValueOnce(null) // First call in getSubscription
        .mockResolvedValueOnce(null); // Second call in createSubscription
      vi.mocked(prisma.subscription.create).mockResolvedValue(mockSubscription);

      const { getSubscription } = await import('./subscription.service');
      const result = await getSubscription(userId);

      expect(result.tier).toBe(SubscriptionTier.FREE);
      expect(prisma.subscription.create).toHaveBeenCalled();
    });
  });

  describe('trackUsage', () => {
    it('should create usage record', async () => {
      const userId = 'user-123';
      const resourceType = 'words';
      const amount = 1000;

      vi.mocked(prisma.usageRecord.create).mockResolvedValue({
        id: 'usage-123',
        userId,
        resourceType,
        amount: BigInt(amount),
        periodStart: new Date(),
        periodEnd: new Date(),
        createdAt: new Date(),
      });

      const { trackUsage } = await import('./subscription.service');
      await trackUsage(userId, resourceType, amount);

      expect(prisma.usageRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          resourceType,
          amount: BigInt(amount),
        }),
      });
    });
  });

  describe('getUsage', () => {
    it('should calculate usage correctly', async () => {
      const userId = 'user-123';
      const mockSubscription = {
        id: 'sub-123',
        userId,
        tier: 'FREE',
        status: 'ACTIVE',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        monthlyWordLimit: 10000,
        monthlyApiCallLimit: 100,
        storageLimit: BigInt(100 * 1024 * 1024),
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockSubscription);
      vi.mocked(prisma.usageRecord.findMany).mockResolvedValue([
        { id: '1', userId, resourceType: 'words', amount: BigInt(3000), periodStart: new Date(), periodEnd: new Date(), createdAt: new Date() },
        { id: '2', userId, resourceType: 'words', amount: BigInt(2000), periodStart: new Date(), periodEnd: new Date(), createdAt: new Date() },
      ]);

      const { getUsage } = await import('./subscription.service');
      const result = await getUsage(userId, 'words');

      expect(result.used).toBe(5000);
      expect(result.limit).toBe(10000);
      expect(result.remaining).toBe(5000);
      expect(result.percentUsed).toBe(50);
    });

    it('should cap percentUsed at 100', async () => {
      const userId = 'user-123';
      const mockSubscription = {
        id: 'sub-123',
        userId,
        tier: 'FREE',
        status: 'ACTIVE',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        monthlyWordLimit: 10000,
        monthlyApiCallLimit: 100,
        storageLimit: BigInt(100 * 1024 * 1024),
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockSubscription);
      vi.mocked(prisma.usageRecord.findMany).mockResolvedValue([
        { id: '1', userId, resourceType: 'words', amount: BigInt(15000), periodStart: new Date(), periodEnd: new Date(), createdAt: new Date() },
      ]);

      const { getUsage } = await import('./subscription.service');
      const result = await getUsage(userId, 'words');

      expect(result.used).toBe(15000);
      expect(result.remaining).toBe(0);
      expect(result.percentUsed).toBe(100);
    });
  });

  describe('checkQuota', () => {
    it('should allow usage within quota', async () => {
      const userId = 'user-123';
      const mockSubscription = {
        id: 'sub-123',
        userId,
        tier: 'FREE',
        status: 'ACTIVE',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        monthlyWordLimit: 10000,
        monthlyApiCallLimit: 100,
        storageLimit: BigInt(100 * 1024 * 1024),
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockSubscription);
      vi.mocked(prisma.usageRecord.findMany).mockResolvedValue([
        { id: '1', userId, resourceType: 'words', amount: BigInt(5000), periodStart: new Date(), periodEnd: new Date(), createdAt: new Date() },
      ]);

      const { checkQuota } = await import('./subscription.service');
      const result = await checkQuota(userId, 'words', 1000);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5000);
      expect(result.upgradeRequired).toBe(false);
    });

    it('should deny usage exceeding quota', async () => {
      const userId = 'user-123';
      const mockSubscription = {
        id: 'sub-123',
        userId,
        tier: 'FREE',
        status: 'ACTIVE',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        monthlyWordLimit: 10000,
        monthlyApiCallLimit: 100,
        storageLimit: BigInt(100 * 1024 * 1024),
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockSubscription);
      vi.mocked(prisma.usageRecord.findMany).mockResolvedValue([
        { id: '1', userId, resourceType: 'words', amount: BigInt(9500), periodStart: new Date(), periodEnd: new Date(), createdAt: new Date() },
      ]);

      const { checkQuota } = await import('./subscription.service');
      const result = await checkQuota(userId, 'words', 1000);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(500);
      expect(result.upgradeRequired).toBe(true);
    });
  });

  describe('getQuotaStatus', () => {
    it('should return quota status for all resource types', async () => {
      const userId = 'user-123';
      const mockSubscription = {
        id: 'sub-123',
        userId,
        tier: 'FREE',
        status: 'ACTIVE',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        monthlyWordLimit: 10000,
        monthlyApiCallLimit: 100,
        storageLimit: BigInt(100 * 1024 * 1024),
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockSubscription);
      vi.mocked(prisma.usageRecord.findMany).mockResolvedValue([]);

      const { getQuotaStatus } = await import('./subscription.service');
      const result = await getQuotaStatus(userId);

      expect(result.words).toBeDefined();
      expect(result.apiCalls).toBeDefined();
      expect(result.storage).toBeDefined();
      expect(result.tier).toBe(SubscriptionTier.FREE);
      expect(result.isOverLimit).toBe(false);
    });

    it('should detect when over limit', async () => {
      const userId = 'user-123';
      const mockSubscription = {
        id: 'sub-123',
        userId,
        tier: 'FREE',
        status: 'ACTIVE',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        monthlyWordLimit: 10000,
        monthlyApiCallLimit: 100,
        storageLimit: BigInt(100 * 1024 * 1024),
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockSubscription);
      vi.mocked(prisma.usageRecord.findMany).mockImplementation(async ({ where }) => {
        if (where?.resourceType === 'words') {
          return [{ id: '1', userId, resourceType: 'words', amount: BigInt(15000), periodStart: new Date(), periodEnd: new Date(), createdAt: new Date() }];
        }
        return [];
      });

      const { getQuotaStatus } = await import('./subscription.service');
      const result = await getQuotaStatus(userId);

      expect(result.isOverLimit).toBe(true);
    });
  });

  describe('hasFeatureAccess', () => {
    it('should return false for premium features on free tier', async () => {
      const userId = 'user-123';
      const mockSubscription = {
        id: 'sub-123',
        userId,
        tier: 'FREE',
        status: 'ACTIVE',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        monthlyWordLimit: 10000,
        monthlyApiCallLimit: 100,
        storageLimit: BigInt(100 * 1024 * 1024),
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockSubscription);

      const { hasFeatureAccess } = await import('./subscription.service');
      
      expect(await hasFeatureAccess(userId, 'priorityProcessing')).toBe(false);
      expect(await hasFeatureAccess(userId, 'customAiModels')).toBe(false);
      expect(await hasFeatureAccess(userId, 'apiAccess')).toBe(false);
    });

    it('should return true for premium features on professional tier', async () => {
      const userId = 'user-123';
      const mockSubscription = {
        id: 'sub-123',
        userId,
        tier: 'PROFESSIONAL',
        status: 'ACTIVE',
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_123',
        monthlyWordLimit: 200000,
        monthlyApiCallLimit: 2000,
        storageLimit: BigInt(10 * 1024 * 1024 * 1024),
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockSubscription);

      const { hasFeatureAccess } = await import('./subscription.service');
      
      expect(await hasFeatureAccess(userId, 'priorityProcessing')).toBe(true);
      expect(await hasFeatureAccess(userId, 'customAiModels')).toBe(true);
      expect(await hasFeatureAccess(userId, 'apiAccess')).toBe(true);
    });
  });
});

// ============================================
// Subscription Status Tests
// ============================================

describe('Subscription Status', () => {
  it('should have all expected status values', () => {
    expect(SubscriptionStatus.ACTIVE).toBe('ACTIVE');
    expect(SubscriptionStatus.PAST_DUE).toBe('PAST_DUE');
    expect(SubscriptionStatus.CANCELED).toBe('CANCELED');
    expect(SubscriptionStatus.PAUSED).toBe('PAUSED');
  });
});
