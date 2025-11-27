/**
 * Data Retention Routes
 * API endpoints for data retention policy management
 * Requirements: 63 - Data lifecycle and retention policies
 */

import { Router, Request, Response } from 'express';
import { retentionService, RetentionError } from './retention.service';
import {
  retentionPolicySchema,
  scheduleExpirationSchema,
  archiveProjectSchema,
  RetentionAction,
} from './types';
import { z } from 'zod';

const router = Router();

/**
 * Error handler for retention routes
 */
function handleError(error: unknown, res: Response): void {
  if (error instanceof RetentionError) {
    const statusMap: Record<string, number> = {
      PROJECT_NOT_FOUND: 404,
      ARCHIVE_NOT_FOUND: 404,
      ACCESS_DENIED: 403,
      ARCHIVE_DELETED: 410,
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
// Retention Policy Routes
// ============================================

/**
 * GET /api/retention/policy
 * Get current user's retention policy
 */
router.get('/policy', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const policy = await retentionService.getPolicy(userId);
    res.json({ policy });
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * POST /api/retention/policy
 * Create or update retention policy
 */
router.post('/policy', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const input = retentionPolicySchema.parse(req.body);
    const policy = await retentionService.configurePolicy(userId, input, getRequestInfo(req));
    res.json({ policy });
  } catch (error) {
    handleError(error, res);
  }
});

// ============================================
// Project Expiration Routes
// ============================================

/**
 * POST /api/retention/schedule
 * Schedule expiration for a project
 */
router.post('/schedule', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const input = scheduleExpirationSchema.parse(req.body);
    const result = await retentionService.scheduleExpiration(
      input.projectId,
      userId,
      input.expirationDate,
      getRequestInfo(req)
    );
    res.json(result);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * GET /api/retention/scheduled
 * Get scheduled projects for deletion
 */
router.get('/scheduled', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const projects = await retentionService.getScheduledProjects(userId);
    res.json({ projects });
  } catch (error) {
    handleError(error, res);
  }
});

// ============================================
// Archive Routes
// ============================================

/**
 * POST /api/retention/archive
 * Archive a project
 */
router.post('/archive', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const input = archiveProjectSchema.parse(req.body);
    const archive = await retentionService.archiveProject(
      input.projectId,
      userId,
      input.retentionDays,
      getRequestInfo(req)
    );
    res.json({ archive });
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * GET /api/retention/archives
 * Get archived projects
 */
router.get('/archives', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const archives = await retentionService.getArchivedProjects(userId);
    res.json({ archives });
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * POST /api/retention/archives/:id/restore
 * Restore an archived project
 */
router.post('/archives/:id/restore', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const archiveId = req.params.id;
    if (!archiveId) {
      res.status(400).json({ error: 'Archive ID is required' });
      return;
    }
    const result = await retentionService.restoreArchivedProject(
      archiveId,
      userId,
      getRequestInfo(req)
    );
    res.json(result);
  } catch (error) {
    handleError(error, res);
  }
});


// ============================================
// Audit Log Routes
// ============================================

/**
 * GET /api/retention/audit-logs
 * Get retention audit logs
 */
router.get('/audit-logs', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { action, projectId, startDate, endDate, page, limit } = req.query;

    const logs = await retentionService.getAuditLogs({
      userId,
      action: action as RetentionAction | undefined,
      projectId: projectId as string | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    res.json(logs);
  } catch (error) {
    handleError(error, res);
  }
});

// ============================================
// Admin Routes (for scheduled jobs)
// ============================================

/**
 * POST /api/retention/admin/delete-expired
 * Trigger deletion of expired projects (admin only)
 */
router.post('/admin/delete-expired', async (_req: Request, res: Response): Promise<void> => {
  try {
    // In production, this should be protected by admin authentication
    const report = await retentionService.deleteExpiredProjects();
    res.json({ report });
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * POST /api/retention/admin/send-notifications
 * Trigger sending of deletion notifications (admin only)
 */
router.post('/admin/send-notifications', async (_req: Request, res: Response): Promise<void> => {
  try {
    // In production, this should be protected by admin authentication
    const result = await retentionService.sendDeletionNotifications();
    res.json({ result });
  } catch (error) {
    handleError(error, res);
  }
});

export default router;
