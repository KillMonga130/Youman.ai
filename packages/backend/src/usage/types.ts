/**
 * Usage Metering Types
 * Requirements: 20 - Subscription tiers with different capabilities
 * Requirements: 66 - Usage analytics and benchmarking
 * Requirements: 80 - API rate limits with transparency
 */

import { z } from 'zod';

// ============================================
// Enums
// ============================================

export enum ResourceType {
  WORDS = 'words',
  API_CALLS = 'api_calls',
  STORAGE = 'storage',
}

export enum UsageEventType {
  TRANSFORMATION = 'transformation',
  API_REQUEST = 'api_request',
  FILE_UPLOAD = 'file_upload',
  FILE_DELETE = 'file_delete',
  PROJECT_CREATE = 'project_create',
  EXPORT = 'export',
}

// ============================================
// Validation Schemas
// ============================================

export const trackUsageEventSchema = z.object({
  eventType: z.nativeEnum(UsageEventType),
  resourceType: z.nativeEnum(ResourceType),
  amount: z.number().int().nonnegative(),
  metadata: z.record(z.unknown()).optional(),
});

export const getUsageStatsSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  groupBy: z.enum(['day', 'week', 'month']).optional(),
});

// ============================================
// Input Types
// ============================================

export type TrackUsageEventInput = z.infer<typeof trackUsageEventSchema>;
export type GetUsageStatsInput = z.infer<typeof getUsageStatsSchema>;

// ============================================
// Response Types
// ============================================

export interface UsageMetrics {
  resourceType: ResourceType;
  used: number;
  limit: number;
  remaining: number;
  percentUsed: number;
  periodStart: Date;
  periodEnd: Date;
}

export interface UsageStatistics {
  userId: string;
  period: {
    start: Date;
    end: Date;
  };
  words: UsageMetrics;
  apiCalls: UsageMetrics;
  storage: UsageMetrics;
  isOverLimit: boolean;
  warningThresholdReached: boolean;
  tier: string;
}

export interface UsageHistoryEntry {
  date: Date;
  words: number;
  apiCalls: number;
  storage: number;
}

export interface UsageHistory {
  userId: string;
  entries: UsageHistoryEntry[];
  totals: {
    words: number;
    apiCalls: number;
    storage: number;
  };
}

export interface UsageTrend {
  resourceType: ResourceType;
  currentPeriod: number;
  previousPeriod: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
}

export interface UsageSummary {
  statistics: UsageStatistics;
  history: UsageHistory;
  trends: UsageTrend[];
  recommendations: string[];
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: Date;
  percentUsed: number;
}

export interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
  'X-RateLimit-Resource': string;
}

export interface QuotaCheckResult {
  allowed: boolean;
  remaining: number;
  upgradeRequired: boolean;
  message?: string;
}

export interface UsageAlert {
  userId: string;
  resourceType: ResourceType;
  threshold: number;
  currentUsage: number;
  message: string;
  createdAt: Date;
}
