/**
 * Subscription Service
 * Handles subscription management, usage tracking, and quota enforcement
 * 
 * Requirements: 20 - Subscription tiers with different capabilities
 * Requirements: 86 - Billing and invoice management
 */

import { prisma } from '../database/prisma';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { paystackClient } from './paystack.client';
import {
  SubscriptionTier,
  SubscriptionStatus,
  TIER_LIMITS,
  PAYSTACK_PLAN_CODES,
  type CreateSubscriptionInput,
  type UpdateSubscriptionInput,
  type CancelSubscriptionInput,
  type SubscriptionResponse,
  type UsageResponse,
  type QuotaStatus,
  type BillingDashboard,
  type InvoiceSummary,
  type PaymentMethodSummary,
  type UpgradePreview,
  type TierLimits,
  type SerializableTierLimits,
  type PaystackWebhookEvent,
} from './types';

// ============================================
// Error Classes
// ============================================

export class SubscriptionError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'SubscriptionError';
    this.code = code;
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get the current billing period dates
 */
function getCurrentPeriod(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

/**
 * Transform database subscription to response format
 */
function toSerializableLimits(limits: TierLimits): SerializableTierLimits {
  return {
    ...limits,
    storageLimit: Number(limits.storageLimit),
  };
}

function toSubscriptionResponse(subscription: {
  id: string;
  userId: string;
  tier: string;
  status: string;
  paystackCustomerId: string | null;
  paystackSubscriptionId: string | null;
  monthlyWordLimit: number;
  monthlyApiCallLimit: number;
  storageLimit: bigint;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  updatedAt: Date;
}): SubscriptionResponse & { monthlyWordLimit: number; monthlyApiCallLimit: number; storageLimit: number } {
  const tier = subscription.tier as SubscriptionTier;
  const limits = TIER_LIMITS[tier];
  
  return {
    id: subscription.id,
    userId: subscription.userId,
    tier,
    status: subscription.status as SubscriptionStatus,
    paystackCustomerId: subscription.paystackCustomerId,
    paystackSubscriptionId: subscription.paystackSubscriptionId,
    limits: toSerializableLimits(limits),
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
    // Include direct fields for frontend compatibility
    monthlyWordLimit: subscription.monthlyWordLimit,
    monthlyApiCallLimit: subscription.monthlyApiCallLimit,
    storageLimit: Number(subscription.storageLimit), // Convert bigint to number
  };
}

// ============================================
// Subscription CRUD Operations
// ============================================

/**
 * Create a subscription for a user (defaults to FREE tier)
 */
export async function createSubscription(
  userId: string,
  input?: CreateSubscriptionInput
): Promise<SubscriptionResponse & { monthlyWordLimit: number; monthlyApiCallLimit: number; storageLimit: number }> {
  const tier = input?.tier ?? SubscriptionTier.FREE;
  const limits = TIER_LIMITS[tier];
  const { start, end } = getCurrentPeriod();

  // Check if user already has a subscription
  const existing = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (existing) {
    throw new SubscriptionError('User already has a subscription', 'SUBSCRIPTION_EXISTS');
  }

  let paystackCustomerId: string | null = null;
  let paystackSubscriptionId: string | null = null;
  let paystackAuthorizationCode: string | null = null;

  // Create Paystack customer and subscription for paid tiers
  if (tier !== SubscriptionTier.FREE && paystackClient) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new SubscriptionError('User not found', 'USER_NOT_FOUND');
    }

    // Check if customer already exists
    let customer = await paystackClient.getCustomer(user.email);
    
    if (!customer) {
      // Create Paystack customer
      customer = await paystackClient.createCustomer({
        email: user.email,
        first_name: user.firstName || undefined,
        last_name: user.lastName || undefined,
        metadata: { userId },
      });
    }
    
    paystackCustomerId = customer.customer_code;

    // Create subscription if authorization code provided
    if (input?.paymentMethodId) {
      paystackAuthorizationCode = input.paymentMethodId;
      const planCode = PAYSTACK_PLAN_CODES[tier];
      
      if (planCode) {
        const paystackSubscription = await paystackClient.createSubscription({
          customer: customer.customer_code,
          plan: planCode,
          authorization: paystackAuthorizationCode,
        });
        paystackSubscriptionId = paystackSubscription.subscription_code;
      }
    }
  }

  const subscription = await prisma.subscription.create({
    data: {
      userId,
      tier,
      status: 'ACTIVE',
      paystackCustomerId,
      paystackSubscriptionId,
      paystackAuthorizationCode,
      monthlyWordLimit: limits.monthlyWordLimit,
      monthlyApiCallLimit: limits.monthlyApiCallLimit,
      storageLimit: limits.storageLimit,
      currentPeriodStart: start,
      currentPeriodEnd: end,
    },
  });

  logger.info('Subscription created', { userId, tier });

  return toSubscriptionResponse(subscription);
}

/**
 * Get subscription for a user
 */
export async function getSubscription(userId: string): Promise<SubscriptionResponse & { monthlyWordLimit: number; monthlyApiCallLimit: number; storageLimit: number }> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription) {
    // Auto-create free subscription if none exists
    return createSubscription(userId) as Promise<SubscriptionResponse & { monthlyWordLimit: number; monthlyApiCallLimit: number; storageLimit: number }>;
  }

  return toSubscriptionResponse(subscription);
}

/**
 * Upgrade or downgrade subscription
 * Requirements: 20.4 - Immediately grant access to new tier features
 */
export async function updateSubscription(
  userId: string,
  input: UpdateSubscriptionInput
): Promise<SubscriptionResponse> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription) {
    throw new SubscriptionError('Subscription not found', 'SUBSCRIPTION_NOT_FOUND');
  }

  const newTier = input.tier;
  const newLimits = TIER_LIMITS[newTier];

  // Handle Paystack subscription update for paid tiers
  if (paystackClient && subscription.paystackSubscriptionId) {
    const planCode = PAYSTACK_PLAN_CODES[newTier];
    
    if (newTier === SubscriptionTier.FREE) {
      // Cancel Paystack subscription when downgrading to free
      await paystackClient.cancelSubscription(subscription.paystackSubscriptionId);
    } else if (planCode && subscription.paystackAuthorizationCode) {
      // Update Paystack subscription
      await paystackClient.updateSubscription(subscription.paystackSubscriptionId, {
        plan: planCode,
        authorization: subscription.paystackAuthorizationCode,
      });
    }
  }

  const updated = await prisma.subscription.update({
    where: { userId },
    data: {
      tier: newTier,
      monthlyWordLimit: newLimits.monthlyWordLimit,
      monthlyApiCallLimit: newLimits.monthlyApiCallLimit,
      storageLimit: newLimits.storageLimit,
    },
  });

  logger.info('Subscription updated', { userId, oldTier: subscription.tier, newTier });

  return toSubscriptionResponse(updated);
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  userId: string,
  input: CancelSubscriptionInput
): Promise<SubscriptionResponse> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription) {
    throw new SubscriptionError('Subscription not found', 'SUBSCRIPTION_NOT_FOUND');
  }

  // Cancel Paystack subscription
  if (paystackClient && subscription.paystackSubscriptionId) {
    if (input.cancelAtPeriodEnd) {
      // Paystack doesn't have a direct "cancel at period end" option
      // We'll handle this by setting the flag and letting the webhook handle it
      // For now, we'll just mark it in our database
    } else {
      await paystackClient.cancelSubscription(subscription.paystackSubscriptionId);
    }
  }

  const status = input.cancelAtPeriodEnd ? subscription.status : 'CANCELED';

  const updated = await prisma.subscription.update({
    where: { userId },
    data: {
      status,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd,
    },
  });

  logger.info('Subscription canceled', { userId, cancelAtPeriodEnd: input.cancelAtPeriodEnd });

  return toSubscriptionResponse(updated);
}

// ============================================
// Usage Tracking
// ============================================

/**
 * Track usage for a resource type
 */
export async function trackUsage(
  userId: string,
  resourceType: 'words' | 'api_calls' | 'storage',
  amount: number
): Promise<void> {
  const { start, end } = getCurrentPeriod();

  await prisma.usageRecord.create({
    data: {
      userId,
      resourceType,
      amount: BigInt(amount),
      periodStart: start,
      periodEnd: end,
    },
  });

  logger.debug('Usage tracked', { userId, resourceType, amount });
}

/**
 * Get usage for a specific resource type
 */
export async function getUsage(
  userId: string,
  resourceType: 'words' | 'api_calls' | 'storage'
): Promise<UsageResponse> {
  const subscription = await getSubscription(userId);
  const { start, end } = getCurrentPeriod();

  const usageRecords = await prisma.usageRecord.findMany({
    where: {
      userId,
      resourceType,
      periodStart: { gte: start },
      periodEnd: { lte: end },
    },
  });

  const used = usageRecords.reduce((sum, record) => sum + Number(record.amount), 0);
  
  let limit: number;
  switch (resourceType) {
    case 'words':
      limit = subscription.limits.monthlyWordLimit;
      break;
    case 'api_calls':
      limit = subscription.limits.monthlyApiCallLimit;
      break;
    case 'storage':
      limit = Number(subscription.limits.storageLimit);
      break;
  }

  const remaining = Math.max(0, limit - used);
  const percentUsed = limit > 0 ? (used / limit) * 100 : 0;

  return {
    resourceType,
    used,
    limit,
    remaining,
    percentUsed: Math.min(100, percentUsed),
    periodStart: start,
    periodEnd: end,
  };
}

/**
 * Get quota status for all resource types
 * Requirements: 20.5 - Display current usage statistics and remaining quota
 */
export async function getQuotaStatus(userId: string): Promise<QuotaStatus> {
  const subscription = await getSubscription(userId);
  
  const [words, apiCalls, storage] = await Promise.all([
    getUsage(userId, 'words'),
    getUsage(userId, 'api_calls'),
    getUsage(userId, 'storage'),
  ]);

  const isOverLimit = 
    words.percentUsed >= 100 || 
    apiCalls.percentUsed >= 100 || 
    storage.percentUsed >= 100;

  return {
    words,
    apiCalls,
    storage,
    isOverLimit,
    tier: subscription.tier,
  };
}

/**
 * Check if user has quota for a specific resource
 * Requirements: 20.2 - Display upgrade prompt when limit reached
 */
export async function checkQuota(
  userId: string,
  resourceType: 'words' | 'api_calls' | 'storage',
  requiredAmount: number
): Promise<{ allowed: boolean; remaining: number; upgradeRequired: boolean }> {
  const usage = await getUsage(userId, resourceType);
  const allowed = usage.remaining >= requiredAmount;

  return {
    allowed,
    remaining: usage.remaining,
    upgradeRequired: !allowed,
  };
}

// ============================================
// Billing Dashboard
// ============================================

/**
 * Get billing dashboard data
 */
export async function getBillingDashboard(userId: string): Promise<BillingDashboard> {
  const subscription = await getSubscription(userId);
  const usage = await getQuotaStatus(userId);
  
  let invoices: InvoiceSummary[] = [];
  let paymentMethods: PaymentMethodSummary[] = [];

  // Fetch Paystack data if available
  if (paystackClient && subscription.paystackCustomerId) {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        // Get transactions (Paystack uses transactions instead of invoices)
        const transactions = await paystackClient.getTransactions(user.email, 10);
        
        invoices = transactions
          .filter(tx => tx.status === 'success')
          .map(tx => ({
            id: tx.reference,
            amount: tx.amount / 100, // Convert from kobo to naira
            currency: tx.currency.toUpperCase(),
            status: tx.status,
            periodStart: new Date(tx.created_at),
            periodEnd: new Date(tx.created_at), // Paystack doesn't have period end in transactions
            paidAt: tx.paid_at ? new Date(tx.paid_at) : new Date(tx.created_at),
            invoiceUrl: null, // Paystack doesn't provide invoice URLs in transactions
          }));

        // Get payment methods from authorization data
        if (transactions.length > 0 && transactions[0].authorization) {
          const auth = transactions[0].authorization;
          paymentMethods = [{
            id: auth.authorization_code,
            type: 'card',
            brand: auth.brand,
            last4: auth.last4,
            expiryMonth: parseInt(auth.exp_month),
            expiryYear: parseInt(auth.exp_year),
            isDefault: true,
          }];
        }
      }
    } catch (error) {
      logger.error('Failed to fetch Paystack data', { error, userId });
    }
  }

  return {
    subscription,
    usage,
    invoices,
    paymentMethods,
  };
}

/**
 * Get upgrade preview
 */
export async function getUpgradePreview(
  userId: string,
  newTier: SubscriptionTier
): Promise<UpgradePreview> {
  const subscription = await getSubscription(userId);
  const currentTier = subscription.tier;
  const newLimits = TIER_LIMITS[newTier];

  let proratedAmount = 0;
  let newMonthlyAmount = 0;

  // Calculate prorated amount from Paystack if available
  if (paystackClient) {
    const planCode = PAYSTACK_PLAN_CODES[newTier];
    if (planCode) {
      try {
        const plans = await paystackClient.getPlans();
        const plan = plans.find(p => p.plan_code === planCode);
        if (plan) {
          newMonthlyAmount = plan.amount / 100; // Convert from kobo to naira
          // Paystack doesn't have a prorated preview API, so we'll estimate
          // based on remaining days in the current period
          const now = new Date();
          const daysRemaining = Math.ceil(
            (subscription.currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );
          const daysInMonth = 30; // Approximate
          proratedAmount = (newMonthlyAmount * daysRemaining) / daysInMonth;
        }
      } catch (error) {
        logger.error('Failed to get upgrade preview from Paystack', { error, userId });
      }
    }
  }

  return {
    currentTier,
    newTier,
    proratedAmount,
    newMonthlyAmount,
    effectiveDate: new Date(),
    newLimits: {
      ...newLimits,
      storageLimit: Number(newLimits.storageLimit), // Convert BigInt to number for JSON serialization
    },
  };
}

// ============================================
// Paystack Webhook Handlers
// ============================================

/**
 * Handle Paystack webhook events
 */
export async function handlePaystackWebhook(
  event: PaystackWebhookEvent
): Promise<void> {
  switch (event.event) {
    case 'subscription.create':
    case 'subscription.update':
    case 'subscription.enable':
    case 'subscription.disable': {
      const subscription = event.data as any;
      await handleSubscriptionUpdated(subscription);
      break;
    }
    case 'subscription.not_renew': {
      const subscription = event.data as any;
      await handleSubscriptionDeleted(subscription);
      break;
    }
    case 'charge.success':
    case 'subscription.create': {
      const transaction = event.data as any;
      await handlePaymentSucceeded(transaction);
      break;
    }
    case 'charge.failed':
    case 'subscription.failed': {
      const transaction = event.data as any;
      await handlePaymentFailed(transaction);
      break;
    }
    default:
      logger.debug('Unhandled Paystack event', { type: event.event });
  }
}

async function handleSubscriptionUpdated(paystackSubscription: any): Promise<void> {
  const subscription = await prisma.subscription.findUnique({
    where: { paystackSubscriptionId: paystackSubscription.subscription_code },
  });

  if (!subscription) {
    logger.warn('Subscription not found for Paystack subscription', { 
      paystackSubscriptionId: paystackSubscription.subscription_code 
    });
    return;
  }

  let status: SubscriptionStatus;
  switch (paystackSubscription.status) {
    case 'active':
      status = SubscriptionStatus.ACTIVE;
      break;
    case 'non-renewing':
      status = SubscriptionStatus.PAST_DUE;
      break;
    case 'cancelled':
      status = SubscriptionStatus.CANCELED;
      break;
    case 'paused':
      status = SubscriptionStatus.PAUSED;
      break;
    default:
      status = SubscriptionStatus.ACTIVE;
  }

  // Get period dates from Paystack subscription
  const periodStart = paystackSubscription.start 
    ? new Date(paystackSubscription.start * 1000)
    : getCurrentPeriod().start;
  const periodEnd = paystackSubscription.next_payment_date
    ? new Date(paystackSubscription.next_payment_date)
    : getCurrentPeriod().end;

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: paystackSubscription.status === 'non-renewing',
    },
  });

  logger.info('Subscription updated from webhook', { 
    subscriptionId: subscription.id, 
    status 
  });
}

async function handleSubscriptionDeleted(paystackSubscription: any): Promise<void> {
  const subscription = await prisma.subscription.findUnique({
    where: { paystackSubscriptionId: paystackSubscription.subscription_code },
  });

  if (!subscription) {
    return;
  }

  // Downgrade to free tier
  const freeLimits = TIER_LIMITS[SubscriptionTier.FREE];
  
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      tier: SubscriptionTier.FREE,
      status: SubscriptionStatus.CANCELED,
      paystackSubscriptionId: null,
      paystackAuthorizationCode: null,
      monthlyWordLimit: freeLimits.monthlyWordLimit,
      monthlyApiCallLimit: freeLimits.monthlyApiCallLimit,
      storageLimit: freeLimits.storageLimit,
    },
  });

  logger.info('Subscription canceled and downgraded to free', { 
    subscriptionId: subscription.id 
  });
}

async function handlePaymentSucceeded(transaction: any): Promise<void> {
  const subscriptionCode = transaction.subscription?.subscription_code || transaction.subscription_code;
  
  if (!subscriptionCode) return;

  const subscription = await prisma.subscription.findUnique({
    where: { paystackSubscriptionId: subscriptionCode },
  });

  if (!subscription) return;

  // Reset usage for new billing period
  const { start, end } = getCurrentPeriod();
  
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: start,
      currentPeriodEnd: end,
    },
  });

  logger.info('Payment succeeded, subscription renewed', { 
    subscriptionId: subscription.id 
  });
}

async function handlePaymentFailed(transaction: any): Promise<void> {
  const subscriptionCode = transaction.subscription?.subscription_code || transaction.subscription_code;
  
  if (!subscriptionCode) return;

  const subscription = await prisma.subscription.findUnique({
    where: { paystackSubscriptionId: subscriptionCode },
  });

  if (!subscription) return;

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: SubscriptionStatus.PAST_DUE,
    },
  });

  logger.warn('Payment failed, subscription marked as past due', { 
    subscriptionId: subscription.id 
  });
}

// ============================================
// Tier Feature Checks
// ============================================

/**
 * Check if user has access to a specific feature
 * Requirements: 20.3 - Premium users get access to advanced features
 */
export async function hasFeatureAccess(
  userId: string,
  feature: keyof TierLimits
): Promise<boolean> {
  const subscription = await getSubscription(userId);
  const limits = subscription.limits;

  const value = limits[feature];
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value > 0 || value === -1; // -1 means unlimited
  }
  return true;
}

/**
 * Get tier limits for a user (returns serializable version)
 */
export async function getTierLimits(userId: string): Promise<SerializableTierLimits> {
  const subscription = await getSubscription(userId);
  return subscription.limits;
}
