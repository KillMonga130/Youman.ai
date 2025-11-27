/**
 * Usage Metering Service
 * Tracks words processed, API calls, storage usage, and quota management
 * 
 * Requirements: 20 - Subscription tiers with different capabilities
 * Requirements: 66 - Usage analytics and benchmarking
 * Requirements: 80 - API rate limits with transparency
 */

import { prisma } from '../database/prisma';
import { logger } from '../utils/logger';
import {
  ResourceType,
  UsageEventType,
  type TrackUsageEventInput,
  type UsageMetrics,
  type UsageStatistics,
  type UsageHistory,
  type UsageHistoryEntry,
  type UsageTrend,
  type UsageSummary,
  type RateLimitInfo,
  type RateLimitHeaders,
  type QuotaCheckResult,
  type UsageAlert,
} from './types';
import { TIER_LIMITS, SubscriptionTier } from '../subscription/types';

// ============================================
// Constants
// ============================================

const WARNING_THRESHOLD = 80; // Percentage at which to warn users
const CRITICAL_THRESHOLD = 95; // Percentage at which to send critical alerts

// ============================================
// Error Classes
// ============================================

export class UsageError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'UsageError';
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
 * Get the previous billing period dates
 */
function getPreviousPeriod(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  return { start, end };
}

/**
 * Get user's subscription tier limits
 */
async function getUserLimits(userId: string): Promise<{
  tier: SubscriptionTier;
  monthlyWordLimit: number;
  monthlyApiCallLimit: number;
  storageLimit: bigint;
}> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription) {
    // Default to free tier limits
    const freeLimits = TIER_LIMITS[SubscriptionTier.FREE];
    return {
      tier: SubscriptionTier.FREE,
      monthlyWordLimit: freeLimits.monthlyWordLimit,
      monthlyApiCallLimit: freeLimits.monthlyApiCallLimit,
      storageLimit: freeLimits.storageLimit,
    };
  }

  return {
    tier: subscription.tier as SubscriptionTier,
    monthlyWordLimit: subscription.monthlyWordLimit,
    monthlyApiCallLimit: subscription.monthlyApiCallLimit,
    storageLimit: subscription.storageLimit,
  };
}

// ============================================
// Usage Tracking
// ============================================

/**
 * Track a usage event
 * Requirements: 20 - Track usage against tier limits
 */
export async function trackUsageEvent(
  userId: string,
  input: TrackUsageEventInput
): Promise<void> {
  const { start, end } = getCurrentPeriod();

  await prisma.usageRecord.create({
    data: {
      userId,
      resourceType: input.resourceType,
      amount: BigInt(input.amount),
      periodStart: start,
      periodEnd: end,
    },
  });

  logger.debug('Usage event tracked', {
    userId,
    eventType: input.eventType,
    resourceType: input.resourceType,
    amount: input.amount,
  });

  // Check if user is approaching limits
  await checkUsageThresholds(userId, input.resourceType);
}

/**
 * Track words processed
 * Requirements: 20 - Track words processed per user
 */
export async function trackWordsProcessed(
  userId: string,
  wordCount: number,
  metadata?: Record<string, unknown>
): Promise<void> {
  await trackUsageEvent(userId, {
    eventType: UsageEventType.TRANSFORMATION,
    resourceType: ResourceType.WORDS,
    amount: wordCount,
    metadata,
  });
}

/**
 * Track API call
 * Requirements: 80 - Monitor API call counts
 */
export async function trackApiCall(
  userId: string,
  endpoint?: string
): Promise<void> {
  await trackUsageEvent(userId, {
    eventType: UsageEventType.API_REQUEST,
    resourceType: ResourceType.API_CALLS,
    amount: 1,
    metadata: endpoint ? { endpoint } : undefined,
  });
}

/**
 * Track storage usage change
 * Requirements: 20 - Measure storage usage
 */
export async function trackStorageChange(
  userId: string,
  bytesChange: number,
  eventType: UsageEventType.FILE_UPLOAD | UsageEventType.FILE_DELETE
): Promise<void> {
  await trackUsageEvent(userId, {
    eventType,
    resourceType: ResourceType.STORAGE,
    amount: Math.abs(bytesChange),
  });
}

// ============================================
// Usage Retrieval
// ============================================

/**
 * Get usage metrics for a specific resource type
 */
export async function getUsageMetrics(
  userId: string,
  resourceType: ResourceType
): Promise<UsageMetrics> {
  const limits = await getUserLimits(userId);
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
    case ResourceType.WORDS:
      limit = limits.monthlyWordLimit;
      break;
    case ResourceType.API_CALLS:
      limit = limits.monthlyApiCallLimit;
      break;
    case ResourceType.STORAGE:
      limit = Number(limits.storageLimit);
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
 * Get comprehensive usage statistics
 * Requirements: 20.5 - Display current usage statistics and remaining quota
 */
export async function getUsageStatistics(userId: string): Promise<UsageStatistics> {
  const limits = await getUserLimits(userId);
  const { start, end } = getCurrentPeriod();

  const [words, apiCalls, storage] = await Promise.all([
    getUsageMetrics(userId, ResourceType.WORDS),
    getUsageMetrics(userId, ResourceType.API_CALLS),
    getUsageMetrics(userId, ResourceType.STORAGE),
  ]);

  const isOverLimit =
    words.percentUsed >= 100 ||
    apiCalls.percentUsed >= 100 ||
    storage.percentUsed >= 100;

  const warningThresholdReached =
    words.percentUsed >= WARNING_THRESHOLD ||
    apiCalls.percentUsed >= WARNING_THRESHOLD ||
    storage.percentUsed >= WARNING_THRESHOLD;

  return {
    userId,
    period: { start, end },
    words,
    apiCalls,
    storage,
    isOverLimit,
    warningThresholdReached,
    tier: limits.tier,
  };
}

/**
 * Get usage history over time
 * Requirements: 66 - Usage analytics
 */
export async function getUsageHistory(
  userId: string,
  days: number = 30
): Promise<UsageHistory> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const usageRecords = await prisma.usageRecord.findMany({
    where: {
      userId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Group by date
  const entriesByDate = new Map<string, UsageHistoryEntry>();

  for (const record of usageRecords) {
    const dateKey = record.createdAt.toISOString().split('T')[0];
    
    if (!entriesByDate.has(dateKey)) {
      entriesByDate.set(dateKey, {
        date: new Date(dateKey),
        words: 0,
        apiCalls: 0,
        storage: 0,
      });
    }

    const entry = entriesByDate.get(dateKey)!;
    const amount = Number(record.amount);

    switch (record.resourceType) {
      case ResourceType.WORDS:
        entry.words += amount;
        break;
      case ResourceType.API_CALLS:
        entry.apiCalls += amount;
        break;
      case ResourceType.STORAGE:
        entry.storage += amount;
        break;
    }
  }

  const entries = Array.from(entriesByDate.values());
  const totals = entries.reduce(
    (acc, entry) => ({
      words: acc.words + entry.words,
      apiCalls: acc.apiCalls + entry.apiCalls,
      storage: acc.storage + entry.storage,
    }),
    { words: 0, apiCalls: 0, storage: 0 }
  );

  return {
    userId,
    entries,
    totals,
  };
}

/**
 * Get usage trends comparing current and previous periods
 */
export async function getUsageTrends(userId: string): Promise<UsageTrend[]> {
  const current = getCurrentPeriod();
  const previous = getPreviousPeriod();

  const [currentUsage, previousUsage] = await Promise.all([
    getUsageForPeriod(userId, current.start, current.end),
    getUsageForPeriod(userId, previous.start, previous.end),
  ]);

  const trends: UsageTrend[] = [];

  for (const resourceType of Object.values(ResourceType)) {
    const currentAmount = currentUsage[resourceType] || 0;
    const previousAmount = previousUsage[resourceType] || 0;

    let changePercent = 0;
    if (previousAmount > 0) {
      changePercent = ((currentAmount - previousAmount) / previousAmount) * 100;
    } else if (currentAmount > 0) {
      changePercent = 100;
    }

    let trend: 'up' | 'down' | 'stable';
    if (changePercent > 5) {
      trend = 'up';
    } else if (changePercent < -5) {
      trend = 'down';
    } else {
      trend = 'stable';
    }

    trends.push({
      resourceType,
      currentPeriod: currentAmount,
      previousPeriod: previousAmount,
      changePercent: Math.round(changePercent * 100) / 100,
      trend,
    });
  }

  return trends;
}

/**
 * Get usage for a specific period
 */
async function getUsageForPeriod(
  userId: string,
  start: Date,
  end: Date
): Promise<Record<string, number>> {
  const records = await prisma.usageRecord.findMany({
    where: {
      userId,
      periodStart: { gte: start },
      periodEnd: { lte: end },
    },
  });

  const usage: Record<string, number> = {};
  for (const record of records) {
    usage[record.resourceType] = (usage[record.resourceType] || 0) + Number(record.amount);
  }

  return usage;
}

/**
 * Get complete usage summary with statistics, history, and trends
 */
export async function getUsageSummary(userId: string): Promise<UsageSummary> {
  const [statistics, history, trends] = await Promise.all([
    getUsageStatistics(userId),
    getUsageHistory(userId, 30),
    getUsageTrends(userId),
  ]);

  const recommendations = generateRecommendations(statistics, trends);

  return {
    statistics,
    history,
    trends,
    recommendations,
  };
}

/**
 * Generate usage recommendations based on statistics and trends
 */
function generateRecommendations(
  statistics: UsageStatistics,
  trends: UsageTrend[]
): string[] {
  const recommendations: string[] = [];

  // Check if approaching limits
  if (statistics.words.percentUsed >= CRITICAL_THRESHOLD) {
    recommendations.push(
      'You are approaching your monthly word limit. Consider upgrading your plan.'
    );
  } else if (statistics.words.percentUsed >= WARNING_THRESHOLD) {
    recommendations.push(
      `You have used ${Math.round(statistics.words.percentUsed)}% of your monthly word limit.`
    );
  }

  if (statistics.apiCalls.percentUsed >= CRITICAL_THRESHOLD) {
    recommendations.push(
      'You are approaching your monthly API call limit. Consider upgrading your plan.'
    );
  }

  if (statistics.storage.percentUsed >= WARNING_THRESHOLD) {
    recommendations.push(
      'Your storage is filling up. Consider archiving old projects or upgrading your plan.'
    );
  }

  // Check trends
  const wordsTrend = trends.find(t => t.resourceType === ResourceType.WORDS);
  if (wordsTrend && wordsTrend.trend === 'up' && wordsTrend.changePercent > 50) {
    recommendations.push(
      'Your word usage has increased significantly. Monitor your usage to avoid hitting limits.'
    );
  }

  // Tier-specific recommendations
  if (statistics.tier === SubscriptionTier.FREE && statistics.isOverLimit) {
    recommendations.push(
      'Upgrade to a paid plan to unlock higher limits and additional features.'
    );
  }

  return recommendations;
}

// ============================================
// Quota Management
// ============================================

/**
 * Check if user has quota for a specific resource
 * Requirements: 20.2 - Display upgrade prompt when limit reached
 */
export async function checkQuota(
  userId: string,
  resourceType: ResourceType,
  requiredAmount: number
): Promise<QuotaCheckResult> {
  const metrics = await getUsageMetrics(userId, resourceType);
  const allowed = metrics.remaining >= requiredAmount;

  let message: string | undefined;
  if (!allowed) {
    message = `Insufficient ${resourceType} quota. You need ${requiredAmount} but only have ${metrics.remaining} remaining.`;
  } else if (metrics.percentUsed >= WARNING_THRESHOLD) {
    message = `Warning: You have used ${Math.round(metrics.percentUsed)}% of your ${resourceType} quota.`;
  }

  return {
    allowed,
    remaining: metrics.remaining,
    upgradeRequired: !allowed,
    message,
  };
}

/**
 * Check usage thresholds and generate alerts
 */
async function checkUsageThresholds(
  userId: string,
  resourceType: ResourceType
): Promise<UsageAlert | null> {
  const metrics = await getUsageMetrics(userId, resourceType);

  if (metrics.percentUsed >= CRITICAL_THRESHOLD) {
    const alert: UsageAlert = {
      userId,
      resourceType,
      threshold: CRITICAL_THRESHOLD,
      currentUsage: metrics.percentUsed,
      message: `Critical: You have used ${Math.round(metrics.percentUsed)}% of your ${resourceType} quota.`,
      createdAt: new Date(),
    };

    logger.warn('Usage critical threshold reached', alert);
    return alert;
  }

  if (metrics.percentUsed >= WARNING_THRESHOLD) {
    const alert: UsageAlert = {
      userId,
      resourceType,
      threshold: WARNING_THRESHOLD,
      currentUsage: metrics.percentUsed,
      message: `Warning: You have used ${Math.round(metrics.percentUsed)}% of your ${resourceType} quota.`,
      createdAt: new Date(),
    };

    logger.info('Usage warning threshold reached', alert);
    return alert;
  }

  return null;
}

// ============================================
// Monthly Quota Reset
// ============================================

/**
 * Reset monthly quotas for all users
 * Requirements: 20 - Implement monthly quota resets
 */
export async function resetMonthlyQuotas(): Promise<{ usersReset: number }> {
  const { start, end } = getCurrentPeriod();

  // Update all subscriptions with new period dates
  const result = await prisma.subscription.updateMany({
    where: {
      currentPeriodEnd: { lt: start },
    },
    data: {
      currentPeriodStart: start,
      currentPeriodEnd: end,
    },
  });

  logger.info('Monthly quotas reset', { usersReset: result.count });

  return { usersReset: result.count };
}

/**
 * Reset quota for a specific user (e.g., after payment)
 */
export async function resetUserQuota(userId: string): Promise<void> {
  const { start, end } = getCurrentPeriod();

  await prisma.subscription.update({
    where: { userId },
    data: {
      currentPeriodStart: start,
      currentPeriodEnd: end,
    },
  });

  logger.info('User quota reset', { userId });
}

// ============================================
// Rate Limiting Support
// ============================================

/**
 * Get rate limit info for API responses
 * Requirements: 80 - API rate limits with transparency
 */
export async function getRateLimitInfo(
  userId: string,
  resourceType: ResourceType = ResourceType.API_CALLS
): Promise<RateLimitInfo> {
  const metrics = await getUsageMetrics(userId, resourceType);

  return {
    limit: metrics.limit,
    remaining: metrics.remaining,
    resetTime: metrics.periodEnd,
    percentUsed: metrics.percentUsed,
  };
}

/**
 * Generate rate limit headers for API responses
 * Requirements: 80 - Return rate limit headers
 */
export async function getRateLimitHeaders(
  userId: string,
  resourceType: ResourceType = ResourceType.API_CALLS
): Promise<RateLimitHeaders> {
  const info = await getRateLimitInfo(userId, resourceType);

  return {
    'X-RateLimit-Limit': info.limit.toString(),
    'X-RateLimit-Remaining': info.remaining.toString(),
    'X-RateLimit-Reset': Math.floor(info.resetTime.getTime() / 1000).toString(),
    'X-RateLimit-Resource': resourceType,
  };
}

/**
 * Send rate limit warning if approaching limit
 * Requirements: 80 - Send warning when approaching limit
 */
export async function checkRateLimitWarning(
  userId: string
): Promise<{ shouldWarn: boolean; percentUsed: number }> {
  const info = await getRateLimitInfo(userId);

  return {
    shouldWarn: info.percentUsed >= WARNING_THRESHOLD,
    percentUsed: info.percentUsed,
  };
}

// ============================================
// Storage Usage
// ============================================

/**
 * Get current storage usage for a user
 */
export async function getStorageUsage(userId: string): Promise<{
  used: number;
  limit: number;
  remaining: number;
  percentUsed: number;
}> {
  const metrics = await getUsageMetrics(userId, ResourceType.STORAGE);

  return {
    used: metrics.used,
    limit: metrics.limit,
    remaining: metrics.remaining,
    percentUsed: metrics.percentUsed,
  };
}

/**
 * Calculate total storage used by a user from their projects
 */
export async function calculateTotalStorageUsed(userId: string): Promise<number> {
  // This would typically query the storage service or MongoDB
  // For now, we'll use the usage records
  const { start, end } = getCurrentPeriod();

  const uploadRecords = await prisma.usageRecord.findMany({
    where: {
      userId,
      resourceType: ResourceType.STORAGE,
      periodStart: { gte: start },
      periodEnd: { lte: end },
    },
  });

  return uploadRecords.reduce((sum, record) => sum + Number(record.amount), 0);
}
