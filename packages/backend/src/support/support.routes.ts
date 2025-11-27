/**
 * Support and Diagnostics Routes
 * API endpoints for support tools including user impersonation,
 * error context capture, request inspection, and diagnostic reports
 * 
 * Requirements: 94 - Support and diagnostics tools
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireAdmin } from '../auth/auth.middleware';
import { logger } from '../utils/logger';
import {
  startImpersonationSchema,
  endImpersonationSchema,
  captureErrorContextSchema,
  inspectRequestSchema,
  retryOperationSchema,
  generateDiagnosticReportSchema,
  AuditEventType,
  OperationStatus,
} from './types';
import {
  startImpersonation,
  endImpersonation,
  getImpersonationSession,
  getActiveImpersonationSessions,
  logImpersonationAction,
  validateImpersonationToken,
  captureErrorContext,
  getErrorContext,
  getRecentErrorContexts,
  storeRequestForInspection,
  updateRequestInspection,
  inspectRequest,
  getRecentRequestInspections,
  trackOperation,
  updateOperationStatus,
  retryOperation,
  getOperation,
  getOperationsByStatus,
  generateDiagnosticReport,
  getAuditLogs,
  cleanupExpiredSessions,
  SupportError,
} from './support.service';

const router = Router();

// ============================================
// Error Handler
// ============================================

function handleSupportError(
  err: Error,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof SupportError) {
    const statusCode = getStatusCodeForError(err.code);
    res.status(statusCode).json({
      error: err.message,
      code: err.code,
    });
    return;
  }
  next(err);
}

function getStatusCodeForError(code: string): number {
  switch (code) {
    case 'USER_NOT_FOUND':
    case 'SESSION_NOT_FOUND':
    case 'OPERATION_NOT_FOUND':
      return 404;
    case 'UNAUTHORIZED':
      return 403;
    case 'ALREADY_IMPERSONATING':
    case 'SESSION_ENDED':
    case 'ALREADY_COMPLETED':
      return 409;
    default:
      return 400;
  }
}

// ============================================
// Impersonation Routes
// ============================================

/**
 * POST /support/impersonation/start
 * Start impersonating a user (admin only)
 */
router.post(
  '/impersonation/start',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validation = startImpersonationSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: validation.error.errors,
        });
        return;
      }

      const result = await startImpersonation(
        req.user!.id,
        req.user!.email,
        validation.data,
        {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }
      );

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /support/impersonation/end
 * End an impersonation session
 */
router.post(
  '/impersonation/end',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validation = endImpersonationSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: validation.error.errors,
        });
        return;
      }

      const session = await endImpersonation(
        validation.data.sessionId,
        req.user!.id,
        req.user!.email,
        {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }
      );

      res.json({ session });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /support/impersonation/sessions
 * Get all active impersonation sessions (admin only)
 */
router.get(
  '/impersonation/sessions',
  authenticate,
  requireAdmin,
  (_req: Request, res: Response) => {
    const sessions = getActiveImpersonationSessions();
    res.json({ sessions });
  }
);

/**
 * GET /support/impersonation/sessions/:sessionId
 * Get a specific impersonation session
 */
router.get(
  '/impersonation/sessions/:sessionId',
  authenticate,
  requireAdmin,
  (req: Request, res: Response) => {
    const session = getImpersonationSession(req.params.sessionId);
    if (!session) {
      res.status(404).json({
        error: 'Session not found',
        code: 'SESSION_NOT_FOUND',
      });
      return;
    }
    res.json({ session });
  }
);

/**
 * POST /support/impersonation/validate
 * Validate an impersonation token
 */
router.post(
  '/impersonation/validate',
  authenticate,
  requireAdmin,
  (req: Request, res: Response) => {
    const { token } = req.body;
    if (!token) {
      res.status(400).json({
        error: 'Token is required',
        code: 'MISSING_TOKEN',
      });
      return;
    }

    const result = validateImpersonationToken(token);
    res.json(result);
  }
);

// ============================================
// Error Context Routes
// ============================================

/**
 * POST /support/errors/capture
 * Capture error context (typically called internally)
 */
router.post(
  '/errors/capture',
  authenticate,
  requireAdmin,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const validation = captureErrorContextSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: validation.error.errors,
        });
        return;
      }

      const { error: errorData, request: requestData, response: responseData } = req.body;

      const error = new Error(errorData?.message || 'Unknown error');
      error.name = errorData?.name || 'Error';
      if (errorData?.stack) {
        error.stack = errorData.stack;
      }

      const context = captureErrorContext(
        error,
        validation.data,
        requestData,
        responseData
      );

      res.status(201).json({ context });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /support/errors/:contextId
 * Get error context by ID
 */
router.get(
  '/errors/:contextId',
  authenticate,
  requireAdmin,
  (req: Request, res: Response) => {
    const context = getErrorContext(req.params.contextId);
    if (!context) {
      res.status(404).json({
        error: 'Error context not found',
        code: 'CONTEXT_NOT_FOUND',
      });
      return;
    }
    res.json({ context });
  }
);

/**
 * GET /support/errors
 * Get recent error contexts
 */
router.get(
  '/errors',
  authenticate,
  requireAdmin,
  (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const filters = {
      userId: req.query.userId as string | undefined,
      errorCode: req.query.errorCode as string | undefined,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
    };

    const contexts = getRecentErrorContexts(limit, filters);
    res.json({ contexts, total: contexts.length });
  }
);

// ============================================
// Request Inspection Routes
// ============================================

/**
 * GET /support/requests/:requestId
 * Inspect a specific request
 */
router.get(
  '/requests/:requestId',
  authenticate,
  requireAdmin,
  (req: Request, res: Response) => {
    const validation = inspectRequestSchema.safeParse({
      requestId: req.params.requestId,
      includeHeaders: req.query.includeHeaders !== 'false',
      includeBody: req.query.includeBody !== 'false',
      includeResponse: req.query.includeResponse !== 'false',
      includeTiming: req.query.includeTiming !== 'false',
    });

    if (!validation.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
      return;
    }

    const inspection = inspectRequest(validation.data);
    if (!inspection) {
      res.status(404).json({
        error: 'Request not found',
        code: 'REQUEST_NOT_FOUND',
      });
      return;
    }

    res.json({ inspection });
  }
);

/**
 * GET /support/requests
 * Get recent request inspections
 */
router.get(
  '/requests',
  authenticate,
  requireAdmin,
  (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const filters = {
      userId: req.query.userId as string | undefined,
      method: req.query.method as string | undefined,
      statusCode: req.query.statusCode ? parseInt(req.query.statusCode as string) : undefined,
      minDuration: req.query.minDuration ? parseInt(req.query.minDuration as string) : undefined,
    };

    const inspections = getRecentRequestInspections(limit, filters);
    res.json({ inspections, total: inspections.length });
  }
);

// ============================================
// Operation Retry Routes
// ============================================

/**
 * GET /support/operations/:operationId
 * Get operation details
 */
router.get(
  '/operations/:operationId',
  authenticate,
  requireAdmin,
  (req: Request, res: Response) => {
    const operation = getOperation(req.params.operationId);
    if (!operation) {
      res.status(404).json({
        error: 'Operation not found',
        code: 'OPERATION_NOT_FOUND',
      });
      return;
    }
    res.json({ operation });
  }
);

/**
 * GET /support/operations
 * Get operations by status
 */
router.get(
  '/operations',
  authenticate,
  requireAdmin,
  (req: Request, res: Response) => {
    const status = req.query.status as OperationStatus | undefined;
    const limit = parseInt(req.query.limit as string) || 50;

    if (status && !Object.values(OperationStatus).includes(status)) {
      res.status(400).json({
        error: 'Invalid status',
        code: 'INVALID_STATUS',
      });
      return;
    }

    const operations = status
      ? getOperationsByStatus(status, limit)
      : getOperationsByStatus(OperationStatus.FAILED, limit);

    res.json({ operations, total: operations.length });
  }
);

/**
 * POST /support/operations/:operationId/retry
 * Retry a failed operation
 */
router.post(
  '/operations/:operationId/retry',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validation = retryOperationSchema.safeParse({
        operationId: req.params.operationId,
        ...req.body,
      });

      if (!validation.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: validation.error.errors,
        });
        return;
      }

      // For now, we'll use a simple executor that just returns the input
      // In production, this would be replaced with actual operation executors
      const executor = async (input: unknown) => {
        // Simulate operation execution
        return { success: true, input };
      };

      const result = await retryOperation(validation.data, executor);
      res.json({ result });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Diagnostic Report Routes
// ============================================

/**
 * POST /support/diagnostics/report
 * Generate a diagnostic report
 */
router.post(
  '/diagnostics/report',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validation = generateDiagnosticReportSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: validation.error.errors,
        });
        return;
      }

      const report = await generateDiagnosticReport(req.user!.id, validation.data);
      res.status(201).json({ report });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Audit Log Routes
// ============================================

/**
 * GET /support/audit-logs
 * Get audit logs
 */
router.get(
  '/audit-logs',
  authenticate,
  requireAdmin,
  (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const filters = {
      eventType: req.query.eventType as AuditEventType | undefined,
      adminUserId: req.query.adminUserId as string | undefined,
      targetUserId: req.query.targetUserId as string | undefined,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
    };

    const result = getAuditLogs(filters, limit, offset);
    res.json(result);
  }
);

// ============================================
// Maintenance Routes
// ============================================

/**
 * POST /support/maintenance/cleanup
 * Clean up expired sessions and old data
 */
router.post(
  '/maintenance/cleanup',
  authenticate,
  requireAdmin,
  (_req: Request, res: Response) => {
    const cleanedSessions = cleanupExpiredSessions();
    res.json({
      message: 'Cleanup completed',
      cleanedSessions,
    });
  }
);

// Apply error handler
router.use(handleSupportError);

export { router as supportRoutes };
