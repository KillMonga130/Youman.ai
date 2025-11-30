/**
 * Subscription types and interfaces
 * Requirements: 20 - Subscription tiers with different capabilities
 * Requirements: 86 - Billing and invoice management
 */

import { z } from 'zod';

// ============================================
// Enums
// ============================================

export enum SubscriptionTier {
  FREE = 'FREE',
  BASIC = 'BASIC',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  CANCELED = 'CANCELED',
  PAUSED = 'PAUSED',
}

// ============================================
// Tier Limits Configuration
// ============================================

export interface TierLimits {
  monthlyWordLimit: number;
  monthlyApiCallLimit: number;
  storageLimit: bigint; // in bytes
  maxConcurrentProjects: number;
  priorityProcessing: boolean;
  customAiModels: boolean;
  advancedAnalytics: boolean;
  teamCollaboration: boolean;
  apiAccess: boolean;
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  [SubscriptionTier.FREE]: {
    monthlyWordLimit: 10000,
    monthlyApiCallLimit: 100,
    storageLimit: BigInt(100 * 1024 * 1024), // 100 MB
    maxConcurrentProjects: 3,
    priorityProcessing: false,
    customAiModels: false,
    advancedAnalytics: false,
    teamCollaboration: false,
    apiAccess: false,
  },
  [SubscriptionTier.BASIC]: {
    monthlyWordLimit: 50000,
    monthlyApiCallLimit: 500,
    storageLimit: BigInt(1024 * 1024 * 1024), // 1 GB
    maxConcurrentProjects: 10,
    priorityProcessing: false,
    customAiModels: false,
    advancedAnalytics: true,
    teamCollaboration: false,
    apiAccess: true,
  },
  [SubscriptionTier.PROFESSIONAL]: {
    monthlyWordLimit: 200000,
    monthlyApiCallLimit: 2000,
    storageLimit: BigInt(10 * 1024 * 1024 * 1024), // 10 GB
    maxConcurrentProjects: 50,
    priorityProcessing: true,
    customAiModels: true,
    advancedAnalytics: true,
    teamCollaboration: true,
    apiAccess: true,
  },
  [SubscriptionTier.ENTERPRISE]: {
    monthlyWordLimit: 1000000,
    monthlyApiCallLimit: 10000,
    storageLimit: BigInt(100 * 1024 * 1024 * 1024), // 100 GB
    maxConcurrentProjects: -1, // unlimited
    priorityProcessing: true,
    customAiModels: true,
    advancedAnalytics: true,
    teamCollaboration: true,
    apiAccess: true,
  },
};

// Paystack Plan Codes (configured in Paystack Dashboard)
export const PAYSTACK_PLAN_CODES: Record<SubscriptionTier, string | null> = {
  [SubscriptionTier.FREE]: null, // Free tier has no Paystack plan
  [SubscriptionTier.BASIC]: process.env.PAYSTACK_BASIC_PLAN_CODE || 'PLN_basic',
  [SubscriptionTier.PROFESSIONAL]: process.env.PAYSTACK_PROFESSIONAL_PLAN_CODE || 'PLN_professional',
  [SubscriptionTier.ENTERPRISE]: process.env.PAYSTACK_ENTERPRISE_PLAN_CODE || 'PLN_enterprise',
};

// ============================================
// Validation Schemas
// ============================================

export const createSubscriptionSchema = z.object({
  tier: z.nativeEnum(SubscriptionTier),
  paymentMethodId: z.string().optional(),
});

export const updateSubscriptionSchema = z.object({
  tier: z.nativeEnum(SubscriptionTier),
});

export const cancelSubscriptionSchema = z.object({
  cancelAtPeriodEnd: z.boolean().default(true),
  reason: z.string().optional(),
});

export const trackUsageSchema = z.object({
  resourceType: z.enum(['words', 'api_calls', 'storage']),
  amount: z.number().int().positive(),
});

// ============================================
// Input Types
// ============================================

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;
export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;
export type TrackUsageInput = z.infer<typeof trackUsageSchema>;

// ============================================
// Response Types
// ============================================

// Serializable version of TierLimits (for JSON responses)
export interface SerializableTierLimits {
  monthlyWordLimit: number;
  monthlyApiCallLimit: number;
  storageLimit: number; // Converted from bigint for JSON serialization
  maxConcurrentProjects: number;
  priorityProcessing: boolean;
  customAiModels: boolean;
  advancedAnalytics: boolean;
  teamCollaboration: boolean;
  apiAccess: boolean;
}

export interface SubscriptionResponse {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  paystackCustomerId: string | null;
  paystackSubscriptionId: string | null;
  limits: SerializableTierLimits; // Use serializable version for JSON responses
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsageResponse {
  resourceType: string;
  used: number;
  limit: number;
  remaining: number;
  percentUsed: number;
  periodStart: Date;
  periodEnd: Date;
}

export interface QuotaStatus {
  words: UsageResponse;
  apiCalls: UsageResponse;
  storage: UsageResponse;
  isOverLimit: boolean;
  tier: SubscriptionTier;
}

export interface BillingDashboard {
  subscription: SubscriptionResponse;
  usage: QuotaStatus;
  invoices: InvoiceSummary[];
  paymentMethods: PaymentMethodSummary[];
}

export interface InvoiceSummary {
  id: string;
  amount: number;
  currency: string;
  status: string;
  periodStart: Date;
  periodEnd: Date;
  paidAt: Date | null;
  invoiceUrl: string | null;
}

export interface PaymentMethodSummary {
  id: string;
  type: string;
  brand: string | null;
  last4: string | null;
  expiryMonth: number | null;
  expiryYear: number | null;
  isDefault: boolean;
}

export interface UpgradePreview {
  currentTier: SubscriptionTier;
  newTier: SubscriptionTier;
  proratedAmount: number;
  newMonthlyAmount: number;
  effectiveDate: Date;
  newLimits: SerializableTierLimits;
}

// ============================================
// Webhook Event Types
// ============================================

export interface PaystackWebhookEvent {
  event: string;
  data: {
    [key: string]: unknown;
  };
}
