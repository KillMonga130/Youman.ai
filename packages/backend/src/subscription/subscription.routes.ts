/**
 * Subscription Routes
 * API endpoints for subscription management and billing
 * 
 * Requirements: 20 - Subscription tiers with different capabilities
 * Requirements: 86 - Billing and invoice management
 */

import { Router, Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { config } from '../config/env';
import { authenticate } from '../auth/auth.middleware';
import { logger } from '../utils/logger';
import {
  createSubscription,
  getSubscription,
  updateSubscription,
  cancelSubscription,
  getQuotaStatus,
  checkQuota,
  getBillingDashboard,
  getUpgradePreview,
  handleStripeWebhook,
  trackUsage,
  SubscriptionError,
} from './subscription.service';
import {
  createSubscriptionSchema,
  updateSubscriptionSchema,
  cancelSubscriptionSchema,
  trackUsageSchema,
  SubscriptionTier,
} from './types';

const router = Router();

// ============================================
// Subscription Management Endpoints
// ============================================

/**
 * GET /subscription
 * Get current user's subscription
 */
router.get(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const subscription = await getSubscription(userId);
      res.json({ success: true, data: subscription });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /subscription
 * Create a new subscription (upgrade from free)
 */
router.post(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const input = createSubscriptionSchema.parse(req.body);
      const subscription = await createSubscription(userId, input);
      res.status(201).json({ success: true, data: subscription });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /subscription
 * Update subscription tier (upgrade/downgrade)
 */
router.put(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const input = updateSubscriptionSchema.parse(req.body);
      const subscription = await updateSubscription(userId, input);
      res.json({ success: true, data: subscription });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /subscription
 * Cancel subscription
 */
router.delete(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const input = cancelSubscriptionSchema.parse(req.body);
      const subscription = await cancelSubscription(userId, input);
      res.json({ success: true, data: subscription });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Usage & Quota Endpoints
// ============================================

/**
 * GET /subscription/usage
 * Get current usage and quota status
 * Requirements: 20.5 - Display current usage statistics and remaining quota
 */
router.get(
  '/usage',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const quota = await getQuotaStatus(userId);
      res.json({ success: true, data: quota });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /subscription/usage
 * Track usage (internal use)
 */
router.post(
  '/usage',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const input = trackUsageSchema.parse(req.body);
      await trackUsage(userId, input.resourceType, input.amount);
      res.json({ success: true, message: 'Usage tracked' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /subscription/quota/check
 * Check if user has quota for a specific resource
 * Requirements: 20.2 - Display upgrade prompt when limit reached
 */
router.get(
  '/quota/check',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const resourceType = req.query.resourceType as 'words' | 'api_calls' | 'storage';
      const amount = parseInt(req.query.amount as string, 10) || 1;

      if (!['words', 'api_calls', 'storage'].includes(resourceType)) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_RESOURCE_TYPE', message: 'Invalid resource type' },
        });
        return;
      }

      const result = await checkQuota(userId, resourceType, amount);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Billing Dashboard Endpoints
// ============================================

/**
 * GET /subscription/billing
 * Get billing dashboard data
 */
router.get(
  '/billing',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const dashboard = await getBillingDashboard(userId);
      res.json({ success: true, data: dashboard });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /subscription/upgrade-preview
 * Get preview of upgrade costs and changes
 */
router.get(
  '/upgrade-preview',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const tier = req.query.tier as SubscriptionTier;

      if (!Object.values(SubscriptionTier).includes(tier)) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_TIER', message: 'Invalid subscription tier' },
        });
        return;
      }

      const preview = await getUpgradePreview(userId, tier);
      res.json({ success: true, data: preview });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /subscription/tiers
 * Get available subscription tiers and their features
 */
router.get(
  '/tiers',
  async (_req: Request, res: Response) => {
    const tiers = Object.values(SubscriptionTier).map(tier => ({
      tier,
      limits: {
        monthlyWordLimit: tier === 'FREE' ? 10000 : tier === 'BASIC' ? 50000 : tier === 'PROFESSIONAL' ? 200000 : 1000000,
        monthlyApiCallLimit: tier === 'FREE' ? 100 : tier === 'BASIC' ? 500 : tier === 'PROFESSIONAL' ? 2000 : 10000,
        storageLimit: tier === 'FREE' ? '100 MB' : tier === 'BASIC' ? '1 GB' : tier === 'PROFESSIONAL' ? '10 GB' : '100 GB',
        maxConcurrentProjects: tier === 'FREE' ? 3 : tier === 'BASIC' ? 10 : tier === 'PROFESSIONAL' ? 50 : 'Unlimited',
        priorityProcessing: tier === 'PROFESSIONAL' || tier === 'ENTERPRISE',
        customAiModels: tier === 'PROFESSIONAL' || tier === 'ENTERPRISE',
        advancedAnalytics: tier !== 'FREE',
        teamCollaboration: tier === 'PROFESSIONAL' || tier === 'ENTERPRISE',
        apiAccess: tier !== 'FREE',
      },
    }));

    res.json({ success: true, data: tiers });
  }
);

// ============================================
// Stripe Webhook Endpoint
// ============================================

/**
 * POST /subscription/webhook
 * Handle Stripe webhook events
 */
router.post(
  '/webhook',
  async (req: Request, res: Response, next: NextFunction) => {
    const sig = req.headers['stripe-signature'] as string;

    if (!config.stripe.webhookSecret || !config.stripe.secretKey) {
      logger.warn('Stripe webhook received but Stripe is not configured');
      res.status(400).json({ error: 'Stripe not configured' });
      return;
    }

    try {
      const stripe = new Stripe(config.stripe.secretKey);
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        config.stripe.webhookSecret
      );

      await handleStripeWebhook(event);
      res.json({ received: true });
    } catch (error) {
      logger.error('Stripe webhook error', { error });
      res.status(400).json({ error: 'Webhook error' });
    }
  }
);

// ============================================
// Error Handler
// ============================================

// eslint-disable-next-line @typescript-eslint/no-unused-vars
router.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof SubscriptionError) {
    const statusCode = error.code === 'SUBSCRIPTION_NOT_FOUND' ? 404 :
                       error.code === 'SUBSCRIPTION_EXISTS' ? 409 :
                       error.code === 'QUOTA_EXCEEDED' ? 402 : 400;
    
    res.status(statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  logger.error('Subscription route error', { error });
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
});

export { router as subscriptionRoutes };
