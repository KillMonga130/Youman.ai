/**
 * Version Control Routes
 * API endpoints for version management
 * 
 * Requirements: 16 - Save drafts and revisions with version history
 * Requirements: 102 - Auto-save functionality
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  createVersion,
  getVersion,
  getVersionWithContent,
  listVersions,
  getVersionHistory,
  compareVersions,
  restoreVersion,
  getLatestVersion,
  hasContentChanged,
  cleanupAutoSaves,
  VersionError,
} from './version.service';
import {
  createVersionSchema,
  listVersionsSchema,
  versionIdSchema,
  compareVersionsSchema,
  restoreVersionSchema,
} from './types';
import { authenticate } from '../auth/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * Create a new version
 * POST /api/versions
 */
router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const input = createVersionSchema.parse(req.body);
    const version = await createVersion(userId, input);

    res.status(201).json(version);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }
    if (error instanceof VersionError) {
      const statusCode = error.code === 'ACCESS_DENIED' ? 403 : 404;
      res.status(statusCode).json({
        error: error.message,
        code: error.code,
      });
      return;
    }
    next(error);
  }
});

/**
 * List versions for a project
 * GET /api/versions?projectId=xxx
 */
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const input = listVersionsSchema.parse(req.query);
    const result = await listVersions(userId, input);

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }
    if (error instanceof VersionError) {
      const statusCode = error.code === 'ACCESS_DENIED' ? 403 : 404;
      res.status(statusCode).json({
        error: error.message,
        code: error.code,
      });
      return;
    }
    next(error);
  }
});

/**
 * Get version history for a project
 * GET /api/versions/history/:projectId
 */
router.get('/history/:projectId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { projectId } = req.params;
    const branchId = req.query.branchId as string | undefined;

    if (!projectId || !z.string().uuid().safeParse(projectId).success) {
      res.status(400).json({ error: 'Invalid project ID' });
      return;
    }

    const history = await getVersionHistory(projectId, userId, branchId);

    res.json({ history });
  } catch (error) {
    if (error instanceof VersionError) {
      const statusCode = error.code === 'ACCESS_DENIED' ? 403 : 404;
      res.status(statusCode).json({
        error: error.message,
        code: error.code,
      });
      return;
    }
    next(error);
  }
});

/**
 * Get latest version for a project
 * GET /api/versions/latest/:projectId
 */
router.get('/latest/:projectId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { projectId } = req.params;
    const branchId = req.query.branchId as string | undefined;

    if (!projectId || !z.string().uuid().safeParse(projectId).success) {
      res.status(400).json({ error: 'Invalid project ID' });
      return;
    }

    const version = await getLatestVersion(projectId, userId, branchId);

    if (!version) {
      res.status(404).json({
        error: 'No versions found',
        code: 'NO_VERSIONS',
      });
      return;
    }

    res.json(version);
  } catch (error) {
    if (error instanceof VersionError) {
      const statusCode = error.code === 'ACCESS_DENIED' ? 403 : 404;
      res.status(statusCode).json({
        error: error.message,
        code: error.code,
      });
      return;
    }
    next(error);
  }
});

/**
 * Compare two versions
 * POST /api/versions/compare
 */
router.post('/compare', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const input = compareVersionsSchema.parse(req.body);
    const comparison = await compareVersions(userId, input);

    res.json(comparison);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }
    if (error instanceof VersionError) {
      const statusCode = error.code === 'ACCESS_DENIED' ? 403 : 404;
      res.status(statusCode).json({
        error: error.message,
        code: error.code,
      });
      return;
    }
    next(error);
  }
});

/**
 * Restore a version
 * POST /api/versions/restore
 */
router.post('/restore', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const input = restoreVersionSchema.parse(req.body);
    const version = await restoreVersion(userId, input);

    res.json(version);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }
    if (error instanceof VersionError) {
      const statusCode = error.code === 'ACCESS_DENIED' ? 403 : 404;
      res.status(statusCode).json({
        error: error.message,
        code: error.code,
      });
      return;
    }
    next(error);
  }
});

/**
 * Check if content has changed
 * POST /api/versions/check-changes
 */
router.post('/check-changes', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const schema = z.object({
      projectId: z.string().uuid(),
      content: z.string(),
      branchId: z.string().uuid().optional(),
    });

    const { projectId, content, branchId } = schema.parse(req.body);
    const hasChanged = await hasContentChanged(projectId, content, branchId);

    res.json({ hasChanged });
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
});

/**
 * Get a specific version by ID
 * GET /api/versions/:id
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = versionIdSchema.parse(req.params);
    const version = await getVersion(id, userId);

    res.json(version);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }
    if (error instanceof VersionError) {
      const statusCode = error.code === 'ACCESS_DENIED' ? 403 : 404;
      res.status(statusCode).json({
        error: error.message,
        code: error.code,
      });
      return;
    }
    next(error);
  }
});

/**
 * Get version with content
 * GET /api/versions/:id/content
 */
router.get('/:id/content', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = versionIdSchema.parse(req.params);
    const version = await getVersionWithContent(id, userId);

    res.json(version);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }
    if (error instanceof VersionError) {
      const statusCode = error.code === 'ACCESS_DENIED' ? 403 : 404;
      res.status(statusCode).json({
        error: error.message,
        code: error.code,
      });
      return;
    }
    next(error);
  }
});

/**
 * Cleanup old auto-saves for a project
 * POST /api/versions/cleanup/:projectId
 */
router.post('/cleanup/:projectId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { projectId } = req.params;

    if (!projectId || !z.string().uuid().safeParse(projectId).success) {
      res.status(400).json({ error: 'Invalid project ID' });
      return;
    }

    const keepCount = req.body.keepCount ?? 10;
    const deletedCount = await cleanupAutoSaves(projectId, keepCount);

    res.json({
      message: 'Cleanup completed',
      deletedCount,
    });
  } catch (error) {
    next(error);
  }
});

export const versionRouter = router;
