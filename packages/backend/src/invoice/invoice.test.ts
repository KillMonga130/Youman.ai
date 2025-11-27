/**
 * Invoice Service Tests
 * Requirements: 86 - Billing and invoice management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateInvoice,
  getInvoices,
  retryPayment,
  processRefund,
  calculateMRR,
  calculateChurn,
  calculateLTV,
  getSubscriptionBreakdown,
  getRevenueHistory,
  getRevenueAnalytics,
  InvoiceError,
} from './invoice.service';
import {
  InvoiceStatus,
  RefundStatus,
  RefundReason,
} from './types';
import { SubscriptionTier, SubscriptionStatus } from '../subscription/types';

// Mock Prisma
vi.mock('../database/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    subscription: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}));

// Mock email service
vi.mock('../collaboration/email.service', () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

// Mock config
vi.mock('../config/env', () => ({
  config: {
    stripe: {
      secretKey: null, // Disable Stripe for tests
    },
    isTest: true,
    isDevelopment: false,
  },
}));

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { prisma } from '../database/prisma';

describe('Invoice Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('generateInvoice', () => {
    it('should throw error when user not found', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(generateInvoice({ userId: 'user-123' })).rejects.toThrow(
        new InvoiceError('User not found', 'USER_NOT_FOUND')
      );
    });

    it('should throw error when user has no subscription', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: 'hash',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: null,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        mfaEnabled: false,
        mfaSecret: null,
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        subscription: null,
      } as any);

      await expect(generateInvoice({ userId: 'user-123' })).rejects.toThrow(
        new InvoiceError('User has no subscription', 'NO_SUBSCRIPTION')
      );
    });

    it('should throw error for free tier', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: 'hash',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: null,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        mfaEnabled: false,
        mfaSecret: null,
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        subscription: {
          id: 'sub-123',
          userId: 'user-123',
          tier: SubscriptionTier.FREE,
          status: SubscriptionStatus.ACTIVE,
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
        },
      } as any);

      await expect(generateInvoice({ userId: 'user-123' })).rejects.toThrow(
        new InvoiceError('Free tier does not require invoices', 'FREE_TIER')
      );
    });

    it('should generate local invoice for paid tier without Stripe', async () => {
      const now = new Date();
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: 'hash',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: null,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        mfaEnabled: false,
        mfaSecret: null,
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        subscription: {
          id: 'sub-123',
          userId: 'user-123',
          tier: SubscriptionTier.BASIC,
          status: SubscriptionStatus.ACTIVE,
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          monthlyWordLimit: 50000,
          monthlyApiCallLimit: 500,
          storageLimit: BigInt(1024 * 1024 * 1024),
          currentPeriodStart: now,
          currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          cancelAtPeriodEnd: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      } as any);

      const invoice = await generateInvoice({ userId: 'user-123' });

      expect(invoice).toBeDefined();
      expect(invoice.userId).toBe('user-123');
      expect(invoice.userEmail).toBe('test@example.com');
      expect(invoice.status).toBe(InvoiceStatus.OPEN);
      expect(invoice.total).toBe(1999); // $19.99 in cents
      expect(invoice.lineItems).toHaveLength(1);
      expect(invoice.lineItems[0].description).toContain('BASIC');
    });
  });

  describe('getInvoices', () => {
    it('should return empty array when Stripe not configured', async () => {
      const invoices = await getInvoices({ limit: 20, offset: 0 });
      expect(invoices).toEqual([]);
    });
  });

  describe('calculateMRR', () => {
    it('should calculate MRR correctly', async () => {
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([
        {
          id: 'sub-1',
          userId: 'user-1',
          tier: SubscriptionTier.BASIC,
          status: SubscriptionStatus.ACTIVE,
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          monthlyWordLimit: 50000,
          monthlyApiCallLimit: 500,
          storageLimit: BigInt(1024 * 1024 * 1024),
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
          cancelAtPeriodEnd: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'sub-2',
          userId: 'user-2',
          tier: SubscriptionTier.PROFESSIONAL,
          status: SubscriptionStatus.ACTIVE,
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          monthlyWordLimit: 200000,
          monthlyApiCallLimit: 2000,
          storageLimit: BigInt(10 * 1024 * 1024 * 1024),
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
          cancelAtPeriodEnd: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const mrr = await calculateMRR();

      // BASIC ($19.99) + PROFESSIONAL ($49.99) = $69.98
      expect(mrr.mrr).toBe(69.98);
      expect(mrr.arr).toBe(69.98 * 12);
      expect(mrr.averageRevenuePerUser).toBe(34.99);
      expect(mrr.currency).toBe('usd');
    });

    it('should return zero MRR when no paid subscriptions', async () => {
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      const mrr = await calculateMRR();

      expect(mrr.mrr).toBe(0);
      expect(mrr.arr).toBe(0);
      expect(mrr.averageRevenuePerUser).toBe(0);
    });
  });

  describe('calculateChurn', () => {
    it('should calculate churn rate correctly', async () => {
      // Mock customers at start of period
      vi.mocked(prisma.subscription.count)
        .mockResolvedValueOnce(100) // customersAtStart
        .mockResolvedValueOnce(5) // churnedCustomers
        .mockResolvedValueOnce(95); // totalCustomers

      const churn = await calculateChurn();

      expect(churn.churnRate).toBe(5);
      expect(churn.churnedCustomers).toBe(5);
      expect(churn.totalCustomers).toBe(95);
      expect(churn.retentionRate).toBe(95);
    });

    it('should handle zero customers at start', async () => {
      vi.mocked(prisma.subscription.count)
        .mockResolvedValueOnce(0) // customersAtStart
        .mockResolvedValueOnce(0) // churnedCustomers
        .mockResolvedValueOnce(10); // totalCustomers

      const churn = await calculateChurn();

      expect(churn.churnRate).toBe(0);
      expect(churn.retentionRate).toBe(100);
    });
  });

  describe('calculateLTV', () => {
    it('should calculate LTV correctly', async () => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      vi.mocked(prisma.subscription.findMany).mockResolvedValue([
        {
          tier: SubscriptionTier.BASIC,
          status: SubscriptionStatus.ACTIVE,
          createdAt: sixMonthsAgo,
          updatedAt: new Date(),
        },
        {
          tier: SubscriptionTier.PROFESSIONAL,
          status: SubscriptionStatus.ACTIVE,
          createdAt: sixMonthsAgo,
          updatedAt: new Date(),
        },
      ] as any);

      const ltv = await calculateLTV();

      expect(ltv.averageLTV).toBeGreaterThan(0);
      expect(ltv.averageCustomerLifespan).toBeGreaterThan(0);
      expect(ltv.currency).toBe('usd');
    });

    it('should return zero LTV when no subscriptions', async () => {
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      const ltv = await calculateLTV();

      expect(ltv.averageLTV).toBe(0);
      expect(ltv.ltv).toBe(0);
      expect(ltv.averageCustomerLifespan).toBe(0);
    });
  });

  describe('getSubscriptionBreakdown', () => {
    it('should return subscription breakdown by tier', async () => {
      vi.mocked(prisma.subscription.groupBy).mockResolvedValue([
        { tier: SubscriptionTier.FREE, _count: 50 },
        { tier: SubscriptionTier.BASIC, _count: 30 },
        { tier: SubscriptionTier.PROFESSIONAL, _count: 15 },
        { tier: SubscriptionTier.ENTERPRISE, _count: 5 },
      ] as any);

      const breakdown = await getSubscriptionBreakdown();

      expect(breakdown).toHaveLength(4);
      expect(breakdown.find((b) => b.tier === SubscriptionTier.FREE)?.count).toBe(50);
      expect(breakdown.find((b) => b.tier === SubscriptionTier.BASIC)?.count).toBe(30);
    });
  });

  describe('getRevenueHistory', () => {
    it('should return revenue history entries', async () => {
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([
        {
          tier: SubscriptionTier.BASIC,
          status: SubscriptionStatus.ACTIVE,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as any);

      const history = await getRevenueHistory(7);

      expect(history).toBeDefined();
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('getRevenueAnalytics', () => {
    it('should return comprehensive analytics', async () => {
      // Mock all required data
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([
        {
          id: 'sub-1',
          userId: 'user-1',
          tier: SubscriptionTier.BASIC,
          status: SubscriptionStatus.ACTIVE,
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          monthlyWordLimit: 50000,
          monthlyApiCallLimit: 500,
          storageLimit: BigInt(1024 * 1024 * 1024),
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
          cancelAtPeriodEnd: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      vi.mocked(prisma.subscription.count)
        .mockResolvedValueOnce(10) // customersAtStart
        .mockResolvedValueOnce(1) // churnedCustomers
        .mockResolvedValueOnce(9); // totalCustomers

      vi.mocked(prisma.subscription.groupBy).mockResolvedValue([
        { tier: SubscriptionTier.BASIC, _count: 9 },
      ] as any);

      const analytics = await getRevenueAnalytics();

      expect(analytics).toBeDefined();
      expect(analytics.revenue).toBeDefined();
      expect(analytics.churn).toBeDefined();
      expect(analytics.ltv).toBeDefined();
      expect(analytics.subscriptionBreakdown).toBeDefined();
      expect(analytics.revenueHistory).toBeDefined();
    });
  });

  describe('retryPayment', () => {
    it('should throw error when Stripe not configured', async () => {
      await expect(
        retryPayment({ invoiceId: 'inv_123' })
      ).rejects.toThrow(new InvoiceError('Stripe not configured', 'STRIPE_NOT_CONFIGURED'));
    });
  });

  describe('processRefund', () => {
    it('should throw error when invoice not found', async () => {
      await expect(
        processRefund({
          invoiceId: 'inv_nonexistent',
          reason: RefundReason.REQUESTED_BY_CUSTOMER,
        })
      ).rejects.toThrow(new InvoiceError('Invoice not found', 'INVOICE_NOT_FOUND'));
    });
  });
});
