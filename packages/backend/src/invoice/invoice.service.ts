/**
 * Invoice Service
 * Handles invoice generation, payment retry, refunds, and revenue analytics
 *
 * Requirements: 86 - Billing and invoice management
 */

import Stripe from 'stripe';
import { prisma } from '../database/prisma';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { sendEmail } from '../collaboration/email.service';
import {
  InvoiceStatus,
  RefundStatus,
  RefundReason,
  type Invoice,
  type InvoiceLineItem,
  type RefundResult,
  type PaymentRetryResult,
  type RevenueMetrics,
  type ChurnMetrics,
  type LTVMetrics,
  type RevenueAnalytics,
  type SubscriptionBreakdown,
  type RevenueHistoryEntry,
  type CreateInvoiceInput,
  type ProcessRefundInput,
  type RetryPaymentInput,
  type GetInvoicesInput,
} from './types';
import { SubscriptionTier, SubscriptionStatus } from '../subscription/types';

// ============================================
// Stripe Client Initialization
// ============================================

const stripe = config.stripe.secretKey ? new Stripe(config.stripe.secretKey) : null;

// ============================================
// Constants
// ============================================

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_DAYS = [1, 3, 7]; // Days to wait between retries

// Tier pricing (monthly in cents)
const TIER_PRICING: Record<SubscriptionTier, number> = {
  [SubscriptionTier.FREE]: 0,
  [SubscriptionTier.BASIC]: 1999, // $19.99
  [SubscriptionTier.PROFESSIONAL]: 4999, // $49.99
  [SubscriptionTier.ENTERPRISE]: 19999, // $199.99
};

// ============================================
// Error Classes
// ============================================

export class InvoiceError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'InvoiceError';
    this.code = code;
  }
}


// ============================================
// Helper Functions
// ============================================

/**
 * Map Stripe invoice status to our InvoiceStatus enum
 */
function mapStripeStatus(status: string | null): InvoiceStatus {
  switch (status) {
    case 'draft':
      return InvoiceStatus.DRAFT;
    case 'open':
      return InvoiceStatus.OPEN;
    case 'paid':
      return InvoiceStatus.PAID;
    case 'void':
      return InvoiceStatus.VOID;
    case 'uncollectible':
      return InvoiceStatus.UNCOLLECTIBLE;
    default:
      return InvoiceStatus.OPEN;
  }
}

/**
 * Format currency amount for display
 */
function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

/**
 * Transform Stripe invoice to our Invoice type
 */
function transformStripeInvoice(
  stripeInvoice: Stripe.Invoice,
  userId: string,
  userEmail: string
): Invoice {
  const lineItems: InvoiceLineItem[] = stripeInvoice.lines.data.map((line) => ({
    id: line.id,
    description: line.description || 'Subscription',
    quantity: line.quantity || 1,
    unitAmount: (line.amount || 0) / (line.quantity || 1),
    amount: line.amount || 0,
    currency: line.currency,
  }));

  return {
    id: stripeInvoice.id,
    stripeInvoiceId: stripeInvoice.id,
    userId,
    userEmail,
    status: mapStripeStatus(stripeInvoice.status),
    currency: stripeInvoice.currency,
    subtotal: stripeInvoice.subtotal || 0,
    tax: (stripeInvoice.total - stripeInvoice.subtotal) || 0,
    total: stripeInvoice.total || 0,
    amountPaid: stripeInvoice.amount_paid || 0,
    amountDue: stripeInvoice.amount_due || 0,
    lineItems,
    periodStart: new Date(stripeInvoice.period_start * 1000),
    periodEnd: new Date(stripeInvoice.period_end * 1000),
    dueDate: stripeInvoice.due_date ? new Date(stripeInvoice.due_date * 1000) : null,
    paidAt: stripeInvoice.status_transitions?.paid_at
      ? new Date(stripeInvoice.status_transitions.paid_at * 1000)
      : null,
    invoiceUrl: stripeInvoice.hosted_invoice_url || null,
    invoicePdf: stripeInvoice.invoice_pdf || null,
    createdAt: new Date(stripeInvoice.created * 1000),
    updatedAt: new Date(),
  };
}

// ============================================
// Invoice Generation
// ============================================

/**
 * Generate an invoice for a user
 * Requirements: 86 - Create automated invoice generation
 */
export async function generateInvoice(input: CreateInvoiceInput): Promise<Invoice> {
  const { userId, description } = input;

  // Get user and subscription
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true },
  });

  if (!user) {
    throw new InvoiceError('User not found', 'USER_NOT_FOUND');
  }

  if (!user.subscription) {
    throw new InvoiceError('User has no subscription', 'NO_SUBSCRIPTION');
  }

  const subscription = user.subscription;

  // For free tier, no invoice needed
  if (subscription.tier === SubscriptionTier.FREE) {
    throw new InvoiceError('Free tier does not require invoices', 'FREE_TIER');
  }

  // If Stripe is configured and customer exists, create Stripe invoice
  if (stripe && subscription.stripeCustomerId) {
    try {
      const stripeInvoice = await stripe.invoices.create({
        customer: subscription.stripeCustomerId,
        auto_advance: true,
        description: description || `AI Humanizer ${subscription.tier} Subscription`,
        collection_method: 'charge_automatically',
      });

      // Add line item for subscription
      await stripe.invoiceItems.create({
        customer: subscription.stripeCustomerId,
        invoice: stripeInvoice.id,
        amount: TIER_PRICING[subscription.tier as SubscriptionTier],
        currency: 'usd',
        description: `${subscription.tier} Plan - Monthly Subscription`,
      });

      // Finalize the invoice
      const finalizedInvoice = await stripe.invoices.finalizeInvoice(stripeInvoice.id);

      logger.info('Invoice generated', {
        userId,
        invoiceId: finalizedInvoice.id,
        amount: finalizedInvoice.total,
      });

      return transformStripeInvoice(finalizedInvoice, userId, user.email);
    } catch (error) {
      logger.error('Failed to generate Stripe invoice', { error, userId });
      throw new InvoiceError('Failed to generate invoice', 'STRIPE_ERROR');
    }
  }

  // Create a local invoice if Stripe is not configured
  const now = new Date();
  const periodStart = subscription.currentPeriodStart;
  const periodEnd = subscription.currentPeriodEnd;
  const amount = TIER_PRICING[subscription.tier as SubscriptionTier];

  const localInvoice: Invoice = {
    id: `inv_local_${Date.now()}`,
    stripeInvoiceId: null,
    userId,
    userEmail: user.email,
    status: InvoiceStatus.OPEN,
    currency: 'usd',
    subtotal: amount,
    tax: 0,
    total: amount,
    amountPaid: 0,
    amountDue: amount,
    lineItems: [
      {
        id: `li_${Date.now()}`,
        description: `${subscription.tier} Plan - Monthly Subscription`,
        quantity: 1,
        unitAmount: amount,
        amount: amount,
        currency: 'usd',
      },
    ],
    periodStart,
    periodEnd,
    dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    paidAt: null,
    invoiceUrl: null,
    invoicePdf: null,
    createdAt: now,
    updatedAt: now,
  };

  logger.info('Local invoice generated', { userId, invoiceId: localInvoice.id });

  return localInvoice;
}

/**
 * Get invoices for a user or all users
 */
export async function getInvoices(input: GetInvoicesInput): Promise<Invoice[]> {
  const { userId, status, startDate, endDate, limit, offset: _offset } = input;

  if (!stripe) {
    logger.warn('Stripe not configured, returning empty invoice list');
    return [];
  }

  // If userId provided, get that user's invoices
  if (userId) {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!subscription?.stripeCustomerId) {
      return [];
    }

    const listParams: Stripe.InvoiceListParams = {
      customer: subscription.stripeCustomerId,
      limit: limit || 20,
    };
    if (status) {
      listParams.status = status as Stripe.InvoiceListParams.Status;
    }
    if (startDate && endDate) {
      listParams.created = {
        gte: Math.floor(startDate.getTime() / 1000),
        lte: Math.floor(endDate.getTime() / 1000),
      };
    } else if (startDate) {
      listParams.created = { gte: Math.floor(startDate.getTime() / 1000) };
    } else if (endDate) {
      listParams.created = { lte: Math.floor(endDate.getTime() / 1000) };
    }
    const stripeInvoices = await stripe.invoices.list(listParams);

    return stripeInvoices.data.map((inv) =>
      transformStripeInvoice(inv, userId, subscription.user.email)
    );
  }

  // Get all invoices (admin use case)
  const adminListParams: Stripe.InvoiceListParams = {
    limit: limit || 20,
  };
  if (status) {
    adminListParams.status = status as Stripe.InvoiceListParams.Status;
  }
  if (startDate && endDate) {
    adminListParams.created = {
      gte: Math.floor(startDate.getTime() / 1000),
      lte: Math.floor(endDate.getTime() / 1000),
    };
  } else if (startDate) {
    adminListParams.created = { gte: Math.floor(startDate.getTime() / 1000) };
  } else if (endDate) {
    adminListParams.created = { lte: Math.floor(endDate.getTime() / 1000) };
  }
  const stripeInvoices = await stripe.invoices.list(adminListParams);

  // Map invoices to users
  const invoices: Invoice[] = [];
  for (const inv of stripeInvoices.data) {
    const customerId = typeof inv.customer === 'string' ? inv.customer : inv.customer?.id;
    if (!customerId) continue;

    const subscription = await prisma.subscription.findUnique({
      where: { stripeCustomerId: customerId },
      include: { user: true },
    });

    if (subscription) {
      invoices.push(transformStripeInvoice(inv, subscription.userId, subscription.user.email));
    }
  }

  return invoices;
}

/**
 * Get a single invoice by ID
 */
export async function getInvoice(invoiceId: string): Promise<Invoice | null> {
  if (!stripe) {
    return null;
  }

  try {
    const stripeInvoice = await stripe.invoices.retrieve(invoiceId);
    const customerId =
      typeof stripeInvoice.customer === 'string'
        ? stripeInvoice.customer
        : stripeInvoice.customer?.id;

    if (!customerId) {
      return null;
    }

    const subscription = await prisma.subscription.findUnique({
      where: { stripeCustomerId: customerId },
      include: { user: true },
    });

    if (!subscription) {
      return null;
    }

    return transformStripeInvoice(stripeInvoice, subscription.userId, subscription.user.email);
  } catch (error) {
    logger.error('Failed to retrieve invoice', { error, invoiceId });
    return null;
  }
}


// ============================================
// Invoice Email Delivery
// ============================================

/**
 * Send invoice email to user
 * Requirements: 86 - Build invoice email delivery
 */
export async function sendInvoiceEmail(invoice: Invoice): Promise<boolean> {
  const formattedAmount = formatCurrency(invoice.total, invoice.currency);
  const dueDateFormatted = invoice.dueDate
    ? invoice.dueDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Upon receipt';

  const statusText =
    invoice.status === InvoiceStatus.PAID
      ? 'Payment Received'
      : invoice.status === InvoiceStatus.OPEN
        ? 'Payment Due'
        : invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1);

  const statusColor =
    invoice.status === InvoiceStatus.PAID
      ? '#28a745'
      : invoice.status === InvoiceStatus.OPEN
        ? '#ffc107'
        : '#dc3545';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice from AI Humanizer</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">AI Humanizer</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Invoice</p>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
          <div>
            <p style="margin: 0; color: #666;">Invoice Number</p>
            <p style="margin: 5px 0 0 0; font-weight: bold;">${invoice.id}</p>
          </div>
          <div style="text-align: right;">
            <span style="background: ${statusColor}; color: white; padding: 5px 15px; border-radius: 20px; font-size: 14px;">
              ${statusText}
            </span>
          </div>
        </div>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f0f0f0;">
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Description</th>
              <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.lineItems
              .map(
                (item) => `
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.description}</td>
                <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">${formatCurrency(item.amount, item.currency)}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
          <tfoot>
            <tr>
              <td style="padding: 10px; font-weight: bold;">Total</td>
              <td style="padding: 10px; text-align: right; font-weight: bold; font-size: 18px;">${formattedAmount}</td>
            </tr>
          </tfoot>
        </table>
        
        <div style="background: #fff; padding: 15px; border-radius: 5px; margin-top: 20px;">
          <p style="margin: 0;"><strong>Period:</strong> ${invoice.periodStart.toLocaleDateString()} - ${invoice.periodEnd.toLocaleDateString()}</p>
          <p style="margin: 10px 0 0 0;"><strong>Due Date:</strong> ${dueDateFormatted}</p>
        </div>
        
        ${
          invoice.invoiceUrl
            ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${invoice.invoiceUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            View Invoice Online
          </a>
        </div>
        `
            : ''
        }
        
        ${
          invoice.invoicePdf
            ? `
        <p style="text-align: center;">
          <a href="${invoice.invoicePdf}" style="color: #667eea;">Download PDF</a>
        </p>
        `
            : ''
        }
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="color: #999; font-size: 12px; text-align: center;">
          Questions about your invoice? Contact us at support@aihumanizer.com
          <br>
          © ${new Date().getFullYear()} AI Humanizer. All rights reserved.
        </p>
      </div>
    </body>
    </html>
  `;

  const subject =
    invoice.status === InvoiceStatus.PAID
      ? `Payment Received - Invoice ${invoice.id}`
      : `Invoice ${invoice.id} - ${formattedAmount} Due`;

  return sendEmail({
    to: invoice.userEmail,
    subject,
    html,
  });
}

/**
 * Send payment failed notification email
 */
export async function sendPaymentFailedEmail(
  invoice: Invoice,
  retryDate: Date | null
): Promise<boolean> {
  const formattedAmount = formatCurrency(invoice.total, invoice.currency);
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const updatePaymentUrl = `${baseUrl}/settings/billing`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Failed - AI Humanizer</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #dc3545; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">Payment Failed</h1>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p>We were unable to process your payment of <strong>${formattedAmount}</strong> for your AI Humanizer subscription.</p>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; margin: 20px 0;">
          <p style="margin: 0;">
            <strong>Invoice:</strong> ${invoice.id}<br>
            <strong>Amount:</strong> ${formattedAmount}
            ${retryDate ? `<br><strong>Next retry:</strong> ${retryDate.toLocaleDateString()}` : ''}
          </p>
        </div>
        
        <p>Please update your payment method to avoid service interruption.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${updatePaymentUrl}" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Update Payment Method
          </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="color: #999; font-size: 12px; text-align: center;">
          Need help? Contact us at support@aihumanizer.com
          <br>
          © ${new Date().getFullYear()} AI Humanizer. All rights reserved.
        </p>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: invoice.userEmail,
    subject: `Action Required: Payment Failed for Invoice ${invoice.id}`,
    html,
  });
}

/**
 * Send refund confirmation email
 */
export async function sendRefundEmail(
  userEmail: string,
  refund: RefundResult,
  originalInvoice: Invoice
): Promise<boolean> {
  const formattedAmount = formatCurrency(refund.amount, refund.currency);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Refund Processed - AI Humanizer</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">Refund Processed</h1>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p>Your refund has been processed successfully.</p>
        
        <div style="background: #d4edda; padding: 15px; border-radius: 5px; border-left: 4px solid #28a745; margin: 20px 0;">
          <p style="margin: 0;">
            <strong>Refund Amount:</strong> ${formattedAmount}<br>
            <strong>Original Invoice:</strong> ${originalInvoice.id}<br>
            <strong>Refund ID:</strong> ${refund.id}
          </p>
        </div>
        
        <p>The refund should appear in your account within 5-10 business days, depending on your bank.</p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="color: #999; font-size: 12px; text-align: center;">
          Questions? Contact us at support@aihumanizer.com
          <br>
          © ${new Date().getFullYear()} AI Humanizer. All rights reserved.
        </p>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: userEmail,
    subject: `Refund Processed - ${formattedAmount}`,
    html,
  });
}


// ============================================
// Payment Retry Logic
// ============================================

/**
 * Retry a failed payment
 * Requirements: 86 - Add payment retry logic
 */
export async function retryPayment(input: RetryPaymentInput): Promise<PaymentRetryResult> {
  const { invoiceId, paymentMethodId } = input;

  if (!stripe) {
    throw new InvoiceError('Stripe not configured', 'STRIPE_NOT_CONFIGURED');
  }

  try {
    // Get the invoice
    const stripeInvoice = await stripe.invoices.retrieve(invoiceId);

    if (stripeInvoice.status === 'paid') {
      return {
        success: true,
        invoiceId,
        status: InvoiceStatus.PAID,
        errorMessage: null,
        nextRetryDate: null,
        attemptCount: 0,
      };
    }

    if (stripeInvoice.status !== 'open') {
      throw new InvoiceError(
        `Invoice cannot be retried. Status: ${stripeInvoice.status}`,
        'INVALID_INVOICE_STATUS'
      );
    }

    // If a new payment method is provided, update the customer's default
    if (paymentMethodId) {
      const customerId =
        typeof stripeInvoice.customer === 'string'
          ? stripeInvoice.customer
          : stripeInvoice.customer?.id;

      if (customerId) {
        await stripe.paymentMethods.attach(paymentMethodId, {
          customer: customerId,
        });

        await stripe.customers.update(customerId, {
          invoice_settings: { default_payment_method: paymentMethodId },
        });
      }
    }

    // Attempt to pay the invoice
    const paidInvoice = await stripe.invoices.pay(invoiceId);

    logger.info('Payment retry successful', { invoiceId });

    return {
      success: true,
      invoiceId,
      status: mapStripeStatus(paidInvoice.status),
      errorMessage: null,
      nextRetryDate: null,
      attemptCount: paidInvoice.attempt_count || 1,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Payment retry failed', { error: errorMessage, invoiceId });

    // Calculate next retry date
    const attemptCount = await getPaymentAttemptCount(invoiceId);
    const nextRetryDate =
      attemptCount < MAX_RETRY_ATTEMPTS ? calculateNextRetryDate(attemptCount) : null;

    // Send payment failed email
    const invoice = await getInvoice(invoiceId);
    if (invoice) {
      await sendPaymentFailedEmail(invoice, nextRetryDate);
    }

    return {
      success: false,
      invoiceId,
      status: InvoiceStatus.OPEN,
      errorMessage,
      nextRetryDate,
      attemptCount,
    };
  }
}

/**
 * Get the number of payment attempts for an invoice
 */
async function getPaymentAttemptCount(invoiceId: string): Promise<number> {
  if (!stripe) return 0;

  try {
    const invoice = await stripe.invoices.retrieve(invoiceId);
    return invoice.attempt_count || 0;
  } catch {
    return 0;
  }
}

/**
 * Calculate the next retry date based on attempt count
 */
function calculateNextRetryDate(attemptCount: number): Date {
  const daysToWait = RETRY_DELAY_DAYS[attemptCount] ?? RETRY_DELAY_DAYS[RETRY_DELAY_DAYS.length - 1] ?? 7;
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + daysToWait);
  return nextDate;
}

/**
 * Process scheduled payment retries
 * This should be called by a cron job
 */
export async function processScheduledRetries(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  if (!stripe) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  try {
    // Get all open invoices that are past due
    const openInvoices = await stripe.invoices.list({
      status: 'open',
      limit: 100,
    });

    for (const invoice of openInvoices.data) {
      // Check if invoice is past due and hasn't exceeded max retries
      if (invoice.attempt_count && invoice.attempt_count < MAX_RETRY_ATTEMPTS) {
        processed++;

        try {
          await stripe.invoices.pay(invoice.id);
          succeeded++;
          logger.info('Scheduled retry succeeded', { invoiceId: invoice.id });
        } catch (error) {
          failed++;
          logger.warn('Scheduled retry failed', {
            invoiceId: invoice.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }
  } catch (error) {
    logger.error('Failed to process scheduled retries', { error });
  }

  logger.info('Scheduled retries processed', { processed, succeeded, failed });

  return { processed, succeeded, failed };
}

// ============================================
// Refund Processing
// ============================================

/**
 * Process a refund for an invoice
 * Requirements: 86 - Implement refund processing
 */
export async function processRefund(input: ProcessRefundInput): Promise<RefundResult> {
  const { invoiceId, amount, reason, notes } = input;

  // Get the invoice
  const invoice = await getInvoice(invoiceId);
  if (!invoice) {
    throw new InvoiceError('Invoice not found', 'INVOICE_NOT_FOUND');
  }

  if (invoice.status !== InvoiceStatus.PAID) {
    throw new InvoiceError('Can only refund paid invoices', 'INVALID_INVOICE_STATUS');
  }

  const refundAmount = amount || invoice.amountPaid;

  if (refundAmount > invoice.amountPaid) {
    throw new InvoiceError('Refund amount exceeds paid amount', 'INVALID_REFUND_AMOUNT');
  }

  if (stripe && invoice.stripeInvoiceId) {
    try {
      // Get the payment intent from the invoice
      const stripeInvoiceResponse = await stripe.invoices.retrieve(invoice.stripeInvoiceId);
      // Access payment_intent from the response
      const paymentIntentRaw = (stripeInvoiceResponse as { payment_intent?: string | { id: string } | null }).payment_intent;
      const paymentIntentId = typeof paymentIntentRaw === 'string' 
        ? paymentIntentRaw 
        : paymentIntentRaw?.id ?? null;

      if (!paymentIntentId) {
        throw new InvoiceError('No payment intent found for invoice', 'NO_PAYMENT_INTENT');
      }

      // Create the refund
      const stripeRefund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: refundAmount,
        reason: reason === RefundReason.DUPLICATE ? 'duplicate' : 
                reason === RefundReason.FRAUDULENT ? 'fraudulent' : 
                'requested_by_customer',
        metadata: {
          invoiceId,
          notes: notes || '',
        },
      });

      const refundResult: RefundResult = {
        id: stripeRefund.id,
        invoiceId,
        stripeRefundId: stripeRefund.id,
        amount: stripeRefund.amount,
        currency: stripeRefund.currency,
        status:
          stripeRefund.status === 'succeeded'
            ? RefundStatus.SUCCEEDED
            : stripeRefund.status === 'pending'
              ? RefundStatus.PENDING
              : stripeRefund.status === 'canceled'
                ? RefundStatus.CANCELED
                : RefundStatus.FAILED,
        reason,
        notes: notes || null,
        createdAt: new Date(stripeRefund.created * 1000),
      };

      // Send refund confirmation email
      await sendRefundEmail(invoice.userEmail, refundResult, invoice);

      logger.info('Refund processed', {
        invoiceId,
        refundId: stripeRefund.id,
        amount: refundAmount,
      });

      return refundResult;
    } catch (error) {
      logger.error('Failed to process Stripe refund', { error, invoiceId });
      throw new InvoiceError('Failed to process refund', 'STRIPE_REFUND_ERROR');
    }
  }

  // Local refund (when Stripe is not configured)
  const localRefund: RefundResult = {
    id: `re_local_${Date.now()}`,
    invoiceId,
    stripeRefundId: null,
    amount: refundAmount,
    currency: invoice.currency,
    status: RefundStatus.SUCCEEDED,
    reason,
    notes: notes || null,
    createdAt: new Date(),
  };

  await sendRefundEmail(invoice.userEmail, localRefund, invoice);

  logger.info('Local refund processed', { invoiceId, refundId: localRefund.id });

  return localRefund;
}


// ============================================
// Revenue Analytics
// ============================================

/**
 * Calculate Monthly Recurring Revenue (MRR)
 * Requirements: 86 - Generate revenue analytics (MRR)
 */
export async function calculateMRR(): Promise<RevenueMetrics> {
  const subscriptions = await prisma.subscription.findMany({
    where: {
      status: SubscriptionStatus.ACTIVE,
      tier: { not: SubscriptionTier.FREE },
    },
  });

  let mrr = 0;
  for (const sub of subscriptions) {
    const tierPrice = TIER_PRICING[sub.tier as SubscriptionTier] || 0;
    mrr += tierPrice;
  }

  const totalCustomers = subscriptions.length;
  const averageRevenuePerUser = totalCustomers > 0 ? mrr / totalCustomers : 0;

  return {
    mrr: mrr / 100, // Convert from cents to dollars
    arr: (mrr * 12) / 100, // Annual Recurring Revenue
    totalRevenue: mrr / 100,
    averageRevenuePerUser: averageRevenuePerUser / 100,
    currency: 'usd',
    calculatedAt: new Date(),
  };
}

/**
 * Calculate churn metrics
 * Requirements: 86 - Generate revenue analytics (churn)
 */
export async function calculateChurn(
  startDate?: Date,
  endDate?: Date
): Promise<ChurnMetrics> {
  const periodStart = startDate || new Date(new Date().setMonth(new Date().getMonth() - 1));
  const periodEnd = endDate || new Date();

  // Get total customers at start of period
  const customersAtStart = await prisma.subscription.count({
    where: {
      createdAt: { lt: periodStart },
      status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.CANCELED] },
      tier: { not: SubscriptionTier.FREE },
    },
  });

  // Get churned customers during period
  const churnedCustomers = await prisma.subscription.count({
    where: {
      status: SubscriptionStatus.CANCELED,
      updatedAt: {
        gte: periodStart,
        lte: periodEnd,
      },
      tier: { not: SubscriptionTier.FREE },
    },
  });

  // Get current total customers
  const totalCustomers = await prisma.subscription.count({
    where: {
      status: SubscriptionStatus.ACTIVE,
      tier: { not: SubscriptionTier.FREE },
    },
  });

  const churnRate = customersAtStart > 0 ? (churnedCustomers / customersAtStart) * 100 : 0;
  const retentionRate = 100 - churnRate;

  return {
    churnRate: Math.round(churnRate * 100) / 100,
    churnedCustomers,
    totalCustomers,
    retentionRate: Math.round(retentionRate * 100) / 100,
    period: {
      start: periodStart,
      end: periodEnd,
    },
  };
}

/**
 * Calculate Customer Lifetime Value (LTV)
 * Requirements: 86 - Generate revenue analytics (LTV)
 */
export async function calculateLTV(): Promise<LTVMetrics> {
  // Get all subscriptions with their creation dates
  const subscriptions = await prisma.subscription.findMany({
    where: {
      tier: { not: SubscriptionTier.FREE },
    },
    select: {
      tier: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (subscriptions.length === 0) {
    return {
      averageLTV: 0,
      ltv: 0,
      averageCustomerLifespan: 0,
      currency: 'usd',
    };
  }

  // Calculate average customer lifespan in months
  let totalLifespanMonths = 0;
  let completedLifespans = 0;

  for (const sub of subscriptions) {
    const endDate = sub.status === SubscriptionStatus.CANCELED ? sub.updatedAt : new Date();
    const lifespanMs = endDate.getTime() - sub.createdAt.getTime();
    const lifespanMonths = lifespanMs / (1000 * 60 * 60 * 24 * 30);
    totalLifespanMonths += lifespanMonths;
    completedLifespans++;
  }

  const averageCustomerLifespan =
    completedLifespans > 0 ? totalLifespanMonths / completedLifespans : 0;

  // Calculate average revenue per user per month
  const revenueMetrics = await calculateMRR();
  const arpu = revenueMetrics.averageRevenuePerUser;

  // LTV = ARPU * Average Customer Lifespan
  const ltv = arpu * averageCustomerLifespan;

  return {
    averageLTV: Math.round(ltv * 100) / 100,
    ltv: Math.round(ltv * 100) / 100,
    averageCustomerLifespan: Math.round(averageCustomerLifespan * 10) / 10,
    currency: 'usd',
  };
}

/**
 * Get subscription breakdown by tier
 */
export async function getSubscriptionBreakdown(): Promise<SubscriptionBreakdown[]> {
  const subscriptions = await prisma.subscription.groupBy({
    by: ['tier'],
    where: {
      status: SubscriptionStatus.ACTIVE,
    },
    _count: true,
  });

  const totalRevenue = subscriptions.reduce((sum, sub) => {
    const tierPrice = TIER_PRICING[sub.tier as SubscriptionTier] || 0;
    return sum + tierPrice * sub._count;
  }, 0);

  return subscriptions.map((sub) => {
    const tierPrice = TIER_PRICING[sub.tier as SubscriptionTier] || 0;
    const revenue = (tierPrice * sub._count) / 100;
    const percentageOfTotal = totalRevenue > 0 ? ((tierPrice * sub._count) / totalRevenue) * 100 : 0;

    return {
      tier: sub.tier,
      count: sub._count,
      revenue,
      percentageOfTotal: Math.round(percentageOfTotal * 100) / 100,
    };
  });
}

/**
 * Get revenue history over time
 */
export async function getRevenueHistory(days: number = 30): Promise<RevenueHistoryEntry[]> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get subscription changes over the period
  const subscriptions = await prisma.subscription.findMany({
    where: {
      OR: [
        { createdAt: { gte: startDate, lte: endDate } },
        { updatedAt: { gte: startDate, lte: endDate } },
      ],
    },
    select: {
      tier: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // Group by date
  const entriesByDate = new Map<string, RevenueHistoryEntry>();

  // Initialize all dates in range
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateKey = d.toISOString().split('T')[0] || '';
    if (dateKey) {
      entriesByDate.set(dateKey, {
        date: new Date(dateKey),
        revenue: 0,
        newSubscriptions: 0,
        canceledSubscriptions: 0,
        upgrades: 0,
        downgrades: 0,
      });
    }
  }

  // Process subscriptions
  for (const sub of subscriptions) {
    const createdDateKey = sub.createdAt.toISOString().split('T')[0] || '';
    const updatedDateKey = sub.updatedAt.toISOString().split('T')[0] || '';

    // New subscription
    if (sub.createdAt >= startDate && sub.createdAt <= endDate) {
      const entry = entriesByDate.get(createdDateKey);
      if (entry) {
        entry.newSubscriptions++;
        entry.revenue += (TIER_PRICING[sub.tier as SubscriptionTier] || 0) / 100;
      }
    }

    // Canceled subscription
    if (
      sub.status === SubscriptionStatus.CANCELED &&
      sub.updatedAt >= startDate &&
      sub.updatedAt <= endDate
    ) {
      const entry = entriesByDate.get(updatedDateKey);
      if (entry) {
        entry.canceledSubscriptions++;
      }
    }
  }

  return Array.from(entriesByDate.values()).sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );
}

/**
 * Get comprehensive revenue analytics
 * Requirements: 86 - Generate revenue analytics (MRR, churn, LTV)
 */
export async function getRevenueAnalytics(): Promise<RevenueAnalytics> {
  const [revenue, churn, ltv, subscriptionBreakdown, revenueHistory] = await Promise.all([
    calculateMRR(),
    calculateChurn(),
    calculateLTV(),
    getSubscriptionBreakdown(),
    getRevenueHistory(30),
  ]);

  return {
    revenue,
    churn,
    ltv,
    subscriptionBreakdown,
    revenueHistory,
  };
}
