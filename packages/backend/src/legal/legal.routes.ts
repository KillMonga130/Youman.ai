/**
 * Legal and Compliance Routes
 * API endpoints for terms of service, consent, DMCA, licensing, and export control
 * Requirements: 95 - Legal and compliance features
 */

import { Router, Request, Response } from 'express';
import { legalService, LegalError } from './legal.service';
import {
  acceptTermsSchema,
  consentSchema,
  dmcaRequestSchema,
  dmcaCounterNoticeSchema,
  licenseValidationSchema,
  exportControlCheckSchema,
  LegalDocumentType,
  DMCAStatus,
  LegalAuditAction,
} from './types';
import { z } from 'zod';

const router = Router();

/**
 * Error handler for legal routes
 */
function handleError(error: unknown, res: Response): void {
  if (error instanceof LegalError) {
    const statusMap: Record<string, number> = {
      DOCUMENT_NOT_FOUND: 404,
      DMCA_NOT_FOUND: 404,
      DMCA_DISABLED: 503,
      INVALID_DMCA_STATUS: 400,
      LICENSE_NOT_FOUND: 404,
      ACCESS_DENIED: 403,
    };
    const status = statusMap[error.code] || 400;
    res.status(status).json({ error: error.message, code: error.code });
  } else if (error instanceof z.ZodError) {
    res.status(400).json({ error: 'Validation error', details: error.errors });
  } else {
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get request info for audit logging
 */
function getRequestInfo(req: Request): { ipAddress: string | undefined; userAgent: string | undefined } {
  return {
    ipAddress: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
  };
}


// ============================================
// Terms of Service Routes
// ============================================

/**
 * GET /api/legal/documents/:type
 * Get current version of a legal document
 */
router.get('/documents/:type', async (req: Request, res: Response): Promise<void> => {
  try {
    const type = req.params.type as LegalDocumentType;
    const validTypes = [
      'TERMS_OF_SERVICE',
      'PRIVACY_POLICY',
      'ACCEPTABLE_USE_POLICY',
      'DATA_PROCESSING_AGREEMENT',
      'COOKIE_POLICY',
    ];

    if (!validTypes.includes(type)) {
      res.status(400).json({ error: 'Invalid document type' });
      return;
    }

    const document = await legalService.getCurrentDocument(type);
    if (!document) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    res.json({ document });
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * GET /api/legal/documents/:type/versions
 * Get all versions of a legal document
 */
router.get('/documents/:type/versions', async (req: Request, res: Response): Promise<void> => {
  try {
    const type = req.params.type as LegalDocumentType;
    const documents = await legalService.getDocumentVersions(type);
    res.json({ documents });
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * POST /api/legal/terms/accept
 * Accept terms of service
 */
router.post('/terms/accept', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const input = acceptTermsSchema.parse(req.body);
    const acceptance = await legalService.acceptTerms(userId, input, getRequestInfo(req));
    res.json({ acceptance });
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * GET /api/legal/terms/status
 * Get terms acceptance status for current user
 */
router.get('/terms/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const status = await legalService.getTermsAcceptanceStatus(userId);
    res.json({ status });
  } catch (error) {
    handleError(error, res);
  }
});

// ============================================
// Consent Management Routes
// ============================================

/**
 * POST /api/legal/consent
 * Update user consent
 */
router.post('/consent', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const input = consentSchema.parse(req.body);
    const consent = await legalService.updateConsent(userId, input, getRequestInfo(req));
    res.json({ consent });
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * GET /api/legal/consent/status
 * Get consent status for current user
 */
router.get('/consent/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const status = await legalService.getConsentStatus(userId);
    res.json({ status });
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * DELETE /api/legal/consent
 * Revoke all consents
 */
router.delete('/consent', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const count = await legalService.revokeAllConsents(userId, getRequestInfo(req));
    res.json({ message: 'All consents revoked', count });
  } catch (error) {
    handleError(error, res);
  }
});


// ============================================
// DMCA Routes
// ============================================

/**
 * POST /api/legal/dmca
 * Create a DMCA takedown request
 */
router.post('/dmca', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id;
    const input = dmcaRequestSchema.parse(req.body);
    const request = await legalService.createDMCARequest(input, userId, getRequestInfo(req));
    res.status(201).json({ request });
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * GET /api/legal/dmca/:id
 * Get a DMCA request by ID
 */
router.get('/dmca/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const requestId = req.params.id;
    if (!requestId) {
      res.status(400).json({ error: 'Request ID is required' });
      return;
    }

    const request = await legalService.getDMCARequest(requestId);
    if (!request) {
      res.status(404).json({ error: 'DMCA request not found' });
      return;
    }

    res.json({ request });
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * PATCH /api/legal/dmca/:id/status
 * Update DMCA request status (admin only)
 */
router.patch('/dmca/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const requestId = req.params.id;
    if (!requestId) {
      res.status(400).json({ error: 'Request ID is required' });
      return;
    }

    const { status, resolutionNotes } = req.body;
    const validStatuses: DMCAStatus[] = [
      'PENDING',
      'UNDER_REVIEW',
      'CONTENT_REMOVED',
      'COUNTER_NOTICE_FILED',
      'RESTORED',
      'REJECTED',
      'RESOLVED',
    ];

    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const request = await legalService.updateDMCAStatus(
      requestId,
      status,
      resolutionNotes,
      getRequestInfo(req)
    );
    res.json({ request });
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * POST /api/legal/dmca/:id/counter-notice
 * File a counter notice for a DMCA request
 */
router.post('/dmca/:id/counter-notice', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const dmcaRequestId = req.params.id;
    if (!dmcaRequestId) {
      res.status(400).json({ error: 'DMCA request ID is required' });
      return;
    }

    const input = dmcaCounterNoticeSchema.parse({ ...req.body, dmcaRequestId });
    const counterNotice = await legalService.fileDMCACounterNotice(userId, input, getRequestInfo(req));
    res.status(201).json({ counterNotice });
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * GET /api/legal/dmca/pending
 * Get pending DMCA requests (admin only)
 */
router.get('/dmca/pending', async (_req: Request, res: Response): Promise<void> => {
  try {
    const requests = await legalService.getPendingDMCARequests();
    res.json({ requests });
  } catch (error) {
    handleError(error, res);
  }
});

// ============================================
// License Routes
// ============================================

/**
 * POST /api/legal/license/validate
 * Validate a license key
 */
router.post('/license/validate', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const input = licenseValidationSchema.parse(req.body);
    const result = await legalService.validateLicense(userId, input, getRequestInfo(req));
    res.json({ result });
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * GET /api/legal/licenses
 * Get user's licenses
 */
router.get('/licenses', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const licenses = await legalService.getUserLicenses(userId);
    res.json({ licenses });
  } catch (error) {
    handleError(error, res);
  }
});

// ============================================
// Export Control Routes
// ============================================

/**
 * POST /api/legal/export-control/check
 * Check export control restrictions
 */
router.post('/export-control/check', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id;
    const input = exportControlCheckSchema.parse(req.body);
    const result = await legalService.checkExportControl(input, userId, getRequestInfo(req));
    res.json({ result });
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * GET /api/legal/export-control/access
 * Check if user can access service from their location
 */
router.get('/export-control/access', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id;
    const countryCode = req.query.countryCode as string;

    if (!countryCode || countryCode.length !== 2) {
      res.status(400).json({ error: 'Valid country code is required' });
      return;
    }

    const result = await legalService.canAccessService(countryCode, userId);
    res.json(result);
  } catch (error) {
    handleError(error, res);
  }
});

// ============================================
// Audit Log Routes
// ============================================

/**
 * GET /api/legal/audit-logs
 * Get legal audit logs (admin or own logs)
 */
router.get('/audit-logs', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { action, startDate, endDate, page, limit } = req.query;

    const result = await legalService.getAuditLogs({
      userId,
      action: action as LegalAuditAction | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    res.json(result);
  } catch (error) {
    handleError(error, res);
  }
});

export default router;
