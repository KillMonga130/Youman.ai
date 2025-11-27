/**
 * Content Expiration Routes
 * API endpoints for managing content expiration
 * Requirements: 75 - Content expiration with automatic deletion
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { expirationService, ExpirationError } from './expiration.service';
import { logger } from '../utils/logger';

const router = Router();

// ============================================
// Validation Schemas
// ============================================

const setExpirationSchema = z.object({
  expirationDate: z.string().datetime().transform((str) => new Date(str)),
  sendNotification: z.boolean().optional().default(true),
});

const extendExpirationSchema = z.object({
  newExpirationDate: z.string().datetime().transform((str) => new Date(str)),
  sendNotification: z.boolean().optional().default(true),
});

const projectIdSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
});

// ============================================
// Middleware
// ============================================

/**
 * Validates request body against a schema
 */
function validateBody(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'Validation error',
        details: result.error.errors,
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

/**
 * Validates request params against a schema
 */
function validateParams(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json({
        error: 'Validation error',
        details: result.error.errors,
      });
      return;
    }
    next();
  };
}

/**
 * Error handler for expiration routes
 */
function handleExpirationError(
  error: unknown,
  res: Response
): void {
  if (error instanceof ExpirationError) {
    const statusMap: Record<string, number> = {
      PROJECT_NOT_FOUND: 404,
      ACCESS_DENIED: 403,
      NO_EXPIRATION_SET: 400,
      INVALID_EXTENSION_DATE: 400,
      EXPIRATION_TOO_SOON: 400,
      EXPIRATION_TOO_FAR: 400,
    };

    const status = statusMap[error.code] || 400;
    res.status(status).json({
      error: error.message,
      code: error.code,
    });
    return;
  }

  logger.error('Expiration route error:', error);
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
}

// ============================================
// Routes
// ============================================

/**
 * GET /api/expiration/:projectId
 * Get expiration info for a project
 */
router.get(
  '/:projectId',
  validateParams(projectIdSchema),
  async (req: Request, res: Response) => {
    try {
      const projectId = req.params.projectId as string;
      const userId = (req as any).user?.id as string | undefined;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
        return;
      }

      const info = await expirationService.getExpirationInfo(projectId, userId);
      res.json(info);
    } catch (error) {
      handleExpirationError(error, res);
    }
  }
);

/**
 * POST /api/expiration/:projectId
 * Set expiration date for a project
 * Requirement 75.1: Allow users to specify expiration date
 */
router.post(
  '/:projectId',
  validateParams(projectIdSchema),
  validateBody(setExpirationSchema),
  async (req: Request, res: Response) => {
    try {
      const projectId = req.params.projectId as string;
      const { expirationDate, sendNotification } = req.body;
      const userId = (req as any).user?.id as string | undefined;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
        return;
      }

      const info = await expirationService.setExpiration({
        projectId,
        userId,
        expirationDate,
        sendNotification,
      });

      res.status(201).json(info);
    } catch (error) {
      handleExpirationError(error, res);
    }
  }
);

/**
 * PUT /api/expiration/:projectId/extend
 * Extend expiration date for a project
 * Requirement 75.4: Allow users to extend expiration dates
 */
router.put(
  '/:projectId/extend',
  validateParams(projectIdSchema),
  validateBody(extendExpirationSchema),
  async (req: Request, res: Response) => {
    try {
      const projectId = req.params.projectId as string;
      const { newExpirationDate, sendNotification } = req.body;
      const userId = (req as any).user?.id as string | undefined;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
        return;
      }

      const info = await expirationService.extendExpiration({
        projectId,
        userId,
        newExpirationDate,
        sendNotification,
      });

      res.json(info);
    } catch (error) {
      handleExpirationError(error, res);
    }
  }
);

/**
 * DELETE /api/expiration/:projectId
 * Remove expiration from a project
 */
router.delete(
  '/:projectId',
  validateParams(projectIdSchema),
  async (req: Request, res: Response) => {
    try {
      const projectId = req.params.projectId as string;
      const userId = (req as any).user?.id as string | undefined;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
        return;
      }

      const info = await expirationService.removeExpiration({
        projectId,
        userId,
      });

      res.json(info);
    } catch (error) {
      handleExpirationError(error, res);
    }
  }
);

/**
 * GET /api/expiration/user/expiring
 * Get all expiring projects for the current user
 */
router.get(
  '/user/expiring',
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
        return;
      }

      const projects = await expirationService.getExpiringProjects(userId);
      res.json({ projects });
    } catch (error) {
      handleExpirationError(error, res);
    }
  }
);

/**
 * POST /api/expiration/admin/send-reminders
 * Trigger sending of expiration reminders (admin only)
 * Requirement 75.2: Send reminder notifications
 */
router.post(
  '/admin/send-reminders',
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;

      if (!user) {
        res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
        return;
      }

      // Check for admin role (simplified check)
      if (user.role !== 'admin') {
        res.status(403).json({ error: 'Admin access required', code: 'FORBIDDEN' });
        return;
      }

      const result = await expirationService.sendExpirationReminders();
      res.json(result);
    } catch (error) {
      handleExpirationError(error, res);
    }
  }
);

/**
 * POST /api/expiration/admin/delete-expired
 * Trigger deletion of expired content (admin only)
 * Requirement 75.3: Automatically delete expired content
 */
router.post(
  '/admin/delete-expired',
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;

      if (!user) {
        res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
        return;
      }

      // Check for admin role (simplified check)
      if (user.role !== 'admin') {
        res.status(403).json({ error: 'Admin access required', code: 'FORBIDDEN' });
        return;
      }

      const report = await expirationService.deleteExpiredContent();
      res.json(report);
    } catch (error) {
      handleExpirationError(error, res);
    }
  }
);

export default router;
