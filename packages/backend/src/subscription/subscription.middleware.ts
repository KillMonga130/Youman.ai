/**
 * Subscription Enforcement Middleware
 * Ensures users have active subscriptions (except admin)
 */

import { Request, Response, NextFunction } from 'express';
import { getSubscription } from './subscription.service';
import { SubscriptionStatus, SubscriptionTier } from './types';
import { logger } from '../utils/logger';

const ADMIN_EMAIL = 'mubvafhimoses813@gmail.com';

/**
 * Check if user has an active subscription
 * Admin email bypasses this check
 */
export async function requireSubscription(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'NOT_AUTHENTICATED',
      });
      return;
    }

    // Admin bypass
    if (req.user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      next();
      return;
    }

    // Get subscription
    const subscription = await getSubscription(req.user.id);

    // Check if subscription is active
    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      res.status(403).json({
        error: 'Active subscription required',
        code: 'SUBSCRIPTION_REQUIRED',
        subscription: {
          tier: subscription.tier,
          status: subscription.status,
        },
      });
      return;
    }

    // Check if subscription is not FREE (if you want to require paid subscription)
    // For now, we allow FREE tier but you can uncomment this to require paid:
    // if (subscription.tier === SubscriptionTier.FREE) {
    //   res.status(403).json({
    //     error: 'Paid subscription required',
    //     code: 'PAID_SUBSCRIPTION_REQUIRED',
    //     subscription: {
    //       tier: subscription.tier,
    //       status: subscription.status,
    //     },
    //   });
    //   return;
    // }

    // Attach subscription to request for use in route handlers
    (req as any).subscription = subscription;

    next();
  } catch (error) {
    logger.error('Subscription check error:', error);
    res.status(500).json({
      error: 'Failed to verify subscription',
      code: 'SUBSCRIPTION_CHECK_ERROR',
    });
  }
}

/**
 * Require a specific subscription tier or higher
 */
export function requireTier(minTier: SubscriptionTier) {
  const tierOrder: Record<SubscriptionTier, number> = {
    [SubscriptionTier.FREE]: 0,
    [SubscriptionTier.BASIC]: 1,
    [SubscriptionTier.PROFESSIONAL]: 2,
    [SubscriptionTier.ENTERPRISE]: 3,
  };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Authentication required',
          code: 'NOT_AUTHENTICATED',
        });
        return;
      }

      // Admin bypass
      if (req.user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        next();
        return;
      }

      // Get subscription
      const subscription = await getSubscription(req.user.id);

      // Check tier
      const userTierLevel = tierOrder[subscription.tier];
      const requiredTierLevel = tierOrder[minTier];

      if (userTierLevel < requiredTierLevel) {
        res.status(403).json({
          error: `Subscription tier ${minTier} or higher required`,
          code: 'INSUFFICIENT_TIER',
          subscription: {
            tier: subscription.tier,
            requiredTier: minTier,
          },
        });
        return;
      }

      // Attach subscription to request
      (req as any).subscription = subscription;

      next();
    } catch (error) {
      logger.error('Tier check error:', error);
      res.status(500).json({
        error: 'Failed to verify subscription tier',
        code: 'TIER_CHECK_ERROR',
      });
    }
  };
}

