/**
 * Invoice Types
 * Requirements: 86 - Billing and invoice management
 */

import { z } from 'zod';

// ============================================
// Enums
// ============================================

export enum InvoiceStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  PAID = 'paid',
  VOID = 'void',
  UNCOLLECTIBLE = 'uncollectible',
}

export enum RefundStatus {
  PENDING = 'pending',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELED = 'canceled',
}

export enum RefundReason {
  DUPLICATE = 'duplicate',
  FRAUDULENT = 'fraudulent',
  REQUESTED_BY_CUSTOMER = 'requested_by_customer',
  OTHER = 'other',
}

// ============================================
// Validation Schemas
// ============================================

export const createInvoiceSchema = z.object({
  userId: z.string().uuid(),
  description: z.string().optional(),
  dueDate: z.date().optional(),
});

export const processRefundSchema = z.object({
  invoiceId: z.string(),
  amount: z.number().positive().optional(), // If not provided, full refund
  reason: z.nativeEnum(RefundReason),
  notes: z.string().optional(),
});

export const retryPaymentSchema = z.object({
  invoiceId: z.string(),
  paymentMethodId: z.string().optional(),
});

export const getInvoicesSchema = z.object({
  userId: z.string().uuid().optional(),
  status: z.nativeEnum(InvoiceStatus).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().default(0),
});

// ============================================
// Input Types
// ============================================

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type ProcessRefundInput = z.infer<typeof processRefundSchema>;
export type RetryPaymentInput = z.infer<typeof retryPaymentSchema>;
export type GetInvoicesInput = z.infer<typeof getInvoicesSchema>;

// ============================================
// Response Types
// ============================================

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitAmount: number;
  amount: number;
  currency: string;
}

export interface Invoice {
  id: string;
  stripeInvoiceId: string | null;
  userId: string;
  userEmail: string;
  status: InvoiceStatus;
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  lineItems: InvoiceLineItem[];
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date | null;
  paidAt: Date | null;
  invoiceUrl: string | null;
  invoicePdf: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RefundResult {
  id: string;
  invoiceId: string;
  stripeRefundId: string | null;
  amount: number;
  currency: string;
  status: RefundStatus;
  reason: RefundReason;
  notes: string | null;
  createdAt: Date;
}

export interface PaymentRetryResult {
  success: boolean;
  invoiceId: string;
  status: InvoiceStatus;
  errorMessage: string | null;
  nextRetryDate: Date | null;
  attemptCount: number;
}

// ============================================
// Revenue Analytics Types
// ============================================

export interface RevenueMetrics {
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
  totalRevenue: number;
  averageRevenuePerUser: number;
  currency: string;
  calculatedAt: Date;
}

export interface ChurnMetrics {
  churnRate: number; // Percentage
  churnedCustomers: number;
  totalCustomers: number;
  retentionRate: number;
  period: {
    start: Date;
    end: Date;
  };
}

export interface LTVMetrics {
  averageLTV: number; // Lifetime Value
  ltv: number; // Current LTV calculation
  averageCustomerLifespan: number; // In months
  currency: string;
}

export interface RevenueAnalytics {
  revenue: RevenueMetrics;
  churn: ChurnMetrics;
  ltv: LTVMetrics;
  subscriptionBreakdown: SubscriptionBreakdown[];
  revenueHistory: RevenueHistoryEntry[];
}

export interface SubscriptionBreakdown {
  tier: string;
  count: number;
  revenue: number;
  percentageOfTotal: number;
}

export interface RevenueHistoryEntry {
  date: Date;
  revenue: number;
  newSubscriptions: number;
  canceledSubscriptions: number;
  upgrades: number;
  downgrades: number;
}

// ============================================
// Email Types
// ============================================

export interface InvoiceEmailParams {
  to: string;
  userName: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  dueDate: Date | null;
  invoiceUrl: string | null;
  status: InvoiceStatus;
}

export interface PaymentFailedEmailParams {
  to: string;
  userName: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  retryDate: Date | null;
  updatePaymentUrl: string;
}

export interface RefundEmailParams {
  to: string;
  userName: string;
  refundAmount: number;
  currency: string;
  reason: string;
  originalInvoiceNumber: string;
}
