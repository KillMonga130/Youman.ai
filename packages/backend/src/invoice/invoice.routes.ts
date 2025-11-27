/**
 * Invoice Routes
 * API endpoints for invoice management
 *
 * Requirements: 86 - Billing and invoice management
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  generateInvoice,
  getInvoices,
  getInvoice,
  sendInvoiceEmail,
  retryPayment,
  processRefund,
  getRevenueAnalytics,
  calculateMRR,
  calculateChurn,
  calculateLTV,
  InvoiceError,
} from './invoice.service';
import {
  createInvoiceSchema,
  processRefundSchema,
  retryPaymentSchema,
  getInvoicesSchema,
  InvoiceStatus,
  RefundReason,
} from './types';
import { logger } from '../utils/logger';

const router = Router();

// ============================================
// Middleware
// ============================================

/**
 * Validate request body against a Zod schema
 */
function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation error',
          details: error.errors,
        });
        return;
      }
      next(error);
    }
  };
}

/**
 * Error handler for invoice routes
 */
function handleError(error: unknown, res: Response): void {
  if (error instanceof InvoiceError) {
    const statusCode =
      error.code === 'USER_NOT_FOUND' || error.code === 'INVOICE_NOT_FOUND'
        ? 404
        : error.code === 'INVALID_INVOICE_STATUS' || error.code === 'INVALID_REFUND_AMOUNT'
          ? 400
          : 500;

    res.status(statusCode).json({
      error: error.message,
      code: error.code,
    });
    return;
  }

  logger.error('Invoice route error', { error });
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
}

// ============================================
// Invoice CRUD Routes
// ============================================

/**
 * POST /invoices
 * Generate a new invoice for a user
 */
router.post(
  '/',
  validateBody(createInvoiceSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const invoice = await generateInvoice(req.body);
      res.status(201).json(invoice);
    } catch (error) {
      handleError(error, res);
    }
  }
);

/**
 * GET /invoices
 * Get invoices with optional filters
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const input = getInvoicesSchema.parse({
      userId: req.query.userId as string | undefined,
      status: req.query.status as InvoiceStatus | undefined,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      offset: req.query.offset ? parseInt(req.query.offset as string, 10) : 0,
    });

    const invoices = await getInvoices(input);
    res.json({ invoices, count: invoices.length });
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * GET /invoices/:id
 * Get a single invoice by ID
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const invoiceId = req.params.id;
    if (!invoiceId) {
      res.status(400).json({
        error: 'Invoice ID is required',
        code: 'MISSING_INVOICE_ID',
      });
      return;
    }
    const invoice = await getInvoice(invoiceId);

    if (!invoice) {
      res.status(404).json({
        error: 'Invoice not found',
        code: 'INVOICE_NOT_FOUND',
      });
      return;
    }

    res.json(invoice);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * POST /invoices/:id/send
 * Send invoice email to user
 */
router.post('/:id/send', async (req: Request, res: Response): Promise<void> => {
  try {
    const invoiceId = req.params.id;
    if (!invoiceId) {
      res.status(400).json({
        error: 'Invoice ID is required',
        code: 'MISSING_INVOICE_ID',
      });
      return;
    }
    const invoice = await getInvoice(invoiceId);

    if (!invoice) {
      res.status(404).json({
        error: 'Invoice not found',
        code: 'INVOICE_NOT_FOUND',
      });
      return;
    }

    const sent = await sendInvoiceEmail(invoice);

    res.json({
      success: sent,
      message: sent ? 'Invoice email sent successfully' : 'Failed to send invoice email',
    });
  } catch (error) {
    handleError(error, res);
  }
});

// ============================================
// Payment Routes
// ============================================

/**
 * POST /invoices/:id/retry
 * Retry a failed payment
 */
router.post(
  '/:id/retry',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const input = retryPaymentSchema.parse({
        invoiceId: req.params.id,
        paymentMethodId: req.body.paymentMethodId,
      });

      const result = await retryPayment(input);
      res.json(result);
    } catch (error) {
      handleError(error, res);
    }
  }
);

/**
 * POST /invoices/:id/refund
 * Process a refund for an invoice
 */
router.post(
  '/:id/refund',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const input = processRefundSchema.parse({
        invoiceId: req.params.id,
        amount: req.body.amount,
        reason: req.body.reason || RefundReason.REQUESTED_BY_CUSTOMER,
        notes: req.body.notes,
      });

      const refund = await processRefund(input);
      res.json(refund);
    } catch (error) {
      handleError(error, res);
    }
  }
);

// ============================================
// Analytics Routes
// ============================================

/**
 * GET /invoices/analytics/revenue
 * Get comprehensive revenue analytics
 */
router.get('/analytics/revenue', async (_req: Request, res: Response): Promise<void> => {
  try {
    const analytics = await getRevenueAnalytics();
    res.json(analytics);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * GET /invoices/analytics/mrr
 * Get Monthly Recurring Revenue
 */
router.get('/analytics/mrr', async (_req: Request, res: Response): Promise<void> => {
  try {
    const mrr = await calculateMRR();
    res.json(mrr);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * GET /invoices/analytics/churn
 * Get churn metrics
 */
router.get('/analytics/churn', async (req: Request, res: Response): Promise<void> => {
  try {
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const churn = await calculateChurn(startDate, endDate);
    res.json(churn);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * GET /invoices/analytics/ltv
 * Get Customer Lifetime Value metrics
 */
router.get('/analytics/ltv', async (_req: Request, res: Response): Promise<void> => {
  try {
    const ltv = await calculateLTV();
    res.json(ltv);
  } catch (error) {
    handleError(error, res);
  }
});

export default router;
