/**
 * Subscription Service
 * Handles subscription management, usage tracking, and quota enforcement
 * 
 * Requirements: 20 - Subscription tiers with different capabilities
 * Requirements: 86 - Billing and invoice management
 */

import Stripe from 'stripe';
import { prisma } from '../database/prisma';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import {
  SubscriptionTier,
  SubscriptionStatus,
  TIER_LIMITS,
  STRIPE_PRICE_IDS,
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
} from './types';

// ============================================
// Stripe Client Initialization
// ============================================

const stripe = config.stripe.secretKey
  ? new Stripe(config.stripe.secretKey)
  : null;

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
function toSubscriptionResponse(subscription: {
  id: string;
  userId: string;
  tier: string;
  status: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  monthlyWordLimit: number;
  monthlyApiCallLimit: number;
  storageLimit: bigint;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  updatedAt: Date;
}): SubscriptionResponse {
  const tier = subscription.tier as SubscriptionTier;
  return {
    id: subscription.id,
    userId: subscription.userId,
    tier,
    status: subscription.status as SubscriptionStatus,
    stripeCustomerId: subscription.stripeCustomerId,
    stripeSubscriptionId: subscription.stripeSubscriptionId,
    limits: TIER_LIMITS[tier],
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
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
): Promise<SubscriptionResponse> {
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

  let stripeCustomerId: string | null = null;
  let stripeSubscriptionId: string | null = null;

  // Create Stripe customer and subscription for paid tiers
  if (tier !== SubscriptionTier.FREE && stripe) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new SubscriptionError('User not found', 'USER_NOT_FOUND');
    }

    // Create Stripe customer
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId },
    });
    stripeCustomerId = customer.id;

    // Create subscription if payment method provided
    if (input?.paymentMethodId) {
      await stripe.paymentMethods.attach(input.paymentMethodId, {
        customer: customer.id,
      });

      await stripe.customers.update(customer.id, {
        invoice_settings: { default_payment_method: input.paymentMethodId },
      });

      const priceId = STRIPE_PRICE_IDS[tier];
      if (priceId) {
        const stripeSubscription = await stripe.subscriptions.create({
          customer: customer.id,
          items: [{ price: priceId }],
          payment_behavior: 'default_incomplete',
          expand: ['latest_invoice.payment_intent'],
        });
        stripeSubscriptionId = stripeSubscription.id;
      }
    }
  }

  const subscription = await prisma.subscription.create({
    data: {
      userId,
      tier,
      status: 'ACTIVE',
      stripeCustomerId,
      stripeSubscriptionId,
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
export async function getSubscription(userId: string): Promise<SubscriptionResponse> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription) {
    // Auto-create free subscription if none exists
    return createSubscription(userId);
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

  // Handle Stripe subscription update for paid tiers
  if (stripe && subscription.stripeSubscriptionId) {
    const priceId = STRIPE_PRICE_IDS[newTier];
    
    if (newTier === SubscriptionTier.FREE) {
      // Cancel Stripe subscription when downgrading to free
      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
    } else if (priceId) {
      // Update Stripe subscription
      const stripeSubscription = await stripe.subscriptions.retrieve(
        subscription.stripeSubscriptionId
      );
      
      const subscriptionItem = stripeSubscription.items.data[0];
      if (subscriptionItem) {
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          items: [{
            id: subscriptionItem.id,
            price: priceId,
          }],
          proration_behavior: 'create_prorations',
        });
      }
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

  // Cancel Stripe subscription
  if (stripe && subscription.stripeSubscriptionId) {
    if (input.cancelAtPeriodEnd) {
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    } else {
      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
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

  // Fetch Stripe data if available
  if (stripe && subscription.stripeCustomerId) {
    try {
      // Get invoices
      const stripeInvoices = await stripe.invoices.list({
        customer: subscription.stripeCustomerId,
        limit: 10,
      });

      invoices = stripeInvoices.data.map(inv => ({
        id: inv.id,
        amount: inv.amount_due / 100,
        currency: inv.currency,
        status: inv.status ?? 'unknown',
        periodStart: new Date(inv.period_start * 1000),
        periodEnd: new Date(inv.period_end * 1000),
        paidAt: inv.status_transitions?.paid_at 
          ? new Date(inv.status_transitions.paid_at * 1000) 
          : null,
        invoiceUrl: inv.hosted_invoice_url ?? null,
      }));

      // Get payment methods
      const stripePaymentMethods = await stripe.paymentMethods.list({
        customer: subscription.stripeCustomerId,
        type: 'card',
      });

      const customer = await stripe.customers.retrieve(subscription.stripeCustomerId);
      const defaultPaymentMethodId = 
        typeof customer !== 'string' && !customer.deleted
          ? (customer.invoice_settings?.default_payment_method as string | null)
          : null;

      paymentMethods = stripePaymentMethods.data.map(pm => ({
        id: pm.id,
        type: pm.type,
        brand: pm.card?.brand ?? null,
        last4: pm.card?.last4 ?? null,
        expiryMonth: pm.card?.exp_month ?? null,
        expiryYear: pm.card?.exp_year ?? null,
        isDefault: pm.id === defaultPaymentMethodId,
      }));
    } catch (error) {
      logger.error('Failed to fetch Stripe data', { error, userId });
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

  // Calculate prorated amount from Stripe if available
  if (stripe && subscription.stripeSubscriptionId) {
    const priceId = STRIPE_PRICE_IDS[newTier];
    if (priceId) {
      try {
        const stripeSubscription = await stripe.subscriptions.retrieve(
          subscription.stripeSubscriptionId
        );

        const subscriptionItem = stripeSubscription.items.data[0];
        if (subscriptionItem) {
          const preview = await stripe.invoices.createPreview({
            customer: subscription.stripeCustomerId!,
            subscription: subscription.stripeSubscriptionId,
            subscription_details: {
              items: [{
                id: subscriptionItem.id,
                price: priceId,
              }],
            },
          });

          proratedAmount = preview.amount_due / 100;
        }

        const price = await stripe.prices.retrieve(priceId);
        newMonthlyAmount = (price.unit_amount ?? 0) / 100;
      } catch (error) {
        logger.error('Failed to get upgrade preview from Stripe', { error, userId });
      }
    }
  }

  return {
    currentTier,
    newTier,
    proratedAmount,
    newMonthlyAmount,
    effectiveDate: new Date(),
    newLimits,
  };
}

// ============================================
// Stripe Webhook Handlers
// ============================================

/**
 * Handle Stripe webhook events
 */
export async function handleStripeWebhook(
  event: Stripe.Event
): Promise<void> {
  switch (event.type) {
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionUpdated(subscription);
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionDeleted(subscription);
      break;
    }
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      await handlePaymentSucceeded(invoice);
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      await handlePaymentFailed(invoice);
      break;
    }
    default:
      logger.debug('Unhandled Stripe event', { type: event.type });
  }
}

async function handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription): Promise<void> {
  const subscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: stripeSubscription.id },
  });

  if (!subscription) {
    logger.warn('Subscription not found for Stripe subscription', { 
      stripeSubscriptionId: stripeSubscription.id 
    });
    return;
  }

  let status: SubscriptionStatus;
  switch (stripeSubscription.status) {
    case 'active':
      status = SubscriptionStatus.ACTIVE;
      break;
    case 'past_due':
      status = SubscriptionStatus.PAST_DUE;
      break;
    case 'canceled':
      status = SubscriptionStatus.CANCELED;
      break;
    case 'paused':
      status = SubscriptionStatus.PAUSED;
      break;
    default:
      status = SubscriptionStatus.ACTIVE;
  }

  // Get period dates from subscription items or use current period
  const periodStart = stripeSubscription.items.data[0]?.current_period_start 
    ? new Date(stripeSubscription.items.data[0].current_period_start * 1000)
    : getCurrentPeriod().start;
  const periodEnd = stripeSubscription.items.data[0]?.current_period_end
    ? new Date(stripeSubscription.items.data[0].current_period_end * 1000)
    : getCurrentPeriod().end;

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
    },
  });

  logger.info('Subscription updated from webhook', { 
    subscriptionId: subscription.id, 
    status 
  });
}

async function handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription): Promise<void> {
  const subscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: stripeSubscription.id },
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
      stripeSubscriptionId: null,
      monthlyWordLimit: freeLimits.monthlyWordLimit,
      monthlyApiCallLimit: freeLimits.monthlyApiCallLimit,
      storageLimit: freeLimits.storageLimit,
    },
  });

  logger.info('Subscription canceled and downgraded to free', { 
    subscriptionId: subscription.id 
  });
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId = typeof invoice.parent?.subscription_details?.subscription === 'string'
    ? invoice.parent.subscription_details.subscription
    : null;
  
  if (!subscriptionId) return;

  const subscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
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

async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId = typeof invoice.parent?.subscription_details?.subscription === 'string'
    ? invoice.parent.subscription_details.subscription
    : null;
  
  if (!subscriptionId) return;

  const subscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
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
 * Get tier limits for a user
 */
export async function getTierLimits(userId: string): Promise<TierLimits> {
  const subscription = await getSubscription(userId);
  return subscription.limits;
}
