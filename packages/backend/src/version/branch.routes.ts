/**
 * Branch Routes
 * API endpoints for branch management
 * 
 * Requirements: 56 - Branching system with merge conflict resolution
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  createBranch,
  getBranchWithStats,
  listBranches,
  getBranchTree,
  getDefaultBranch,
  switchBranch,
  setDefaultBranch,
  deleteBranch,
  mergeBranches,
  compareBranches,
  renameBranch,
} from './branch.service';
import { VersionError } from './version.service';
import {
  createBranchSchema,
  listBranchesSchema,
  branchIdSchema,
  switchBranchSchema,
  mergeBranchSchema,
  compareBranchesSchema,
} from './types';
import { authenticate } from '../auth/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * Create a new branch
 * POST /api/branches
 */
router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const input = createBranchSchema.parse(req.body);
    const branch = await createBranch(userId, input);

    res.status(201).json(branch);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }
    if (error instanceof VersionError) {
      const statusCode = error.code === 'ACCESS_DENIED' ? 403 : 
                         error.code === 'BRANCH_EXISTS' ? 409 : 404;
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
 * List branches for a project
 * GET /api/branches?projectId=xxx
 */
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const input = listBranchesSchema.parse(req.query);
    const branches = await listBranches(userId, input);

    res.json({ branches });
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
 * Get branch tree for a project
 * GET /api/branches/tree/:projectId
 */
router.get('/tree/:projectId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

    const tree = await getBranchTree(projectId, userId);

    res.json({ tree });
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
 * Get default branch for a project
 * GET /api/branches/default/:projectId
 */
router.get('/default/:projectId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

    const branch = await getDefaultBranch(projectId, userId);

    if (!branch) {
      res.status(404).json({
        error: 'No default branch found',
        code: 'NO_DEFAULT_BRANCH',
      });
      return;
    }

    res.json(branch);
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
 * Switch to a branch
 * POST /api/branches/switch
 */
router.post('/switch', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const input = switchBranchSchema.parse(req.body);
    const branch = await switchBranch(input.branchId, userId);

    res.json(branch);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }
    if (error instanceof VersionError) {
      const statusCode = error.code === 'ACCESS_DENIED' ? 403 : 
                         error.code === 'BRANCH_MERGED' ? 400 : 404;
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
 * Merge branches
 * POST /api/branches/merge
 */
router.post('/merge', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const input = mergeBranchSchema.parse(req.body);
    const result = await mergeBranches(userId, input);

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
      const statusCode = error.code === 'ACCESS_DENIED' ? 403 : 
                         error.code === 'INVALID_MERGE' || error.code === 'BRANCH_ALREADY_MERGED' ? 400 : 404;
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
 * Compare branches
 * POST /api/branches/compare
 */
router.post('/compare', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const input = compareBranchesSchema.parse(req.body);
    const result = await compareBranches(userId, input);

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
      const statusCode = error.code === 'ACCESS_DENIED' ? 403 : 
                         error.code === 'INVALID_COMPARISON' ? 400 : 404;
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
 * Get a specific branch by ID
 * GET /api/branches/:id
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = branchIdSchema.parse(req.params);
    const branch = await getBranchWithStats(id, userId);

    res.json(branch);
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
 * Set branch as default
 * PUT /api/branches/:id/default
 */
router.put('/:id/default', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = branchIdSchema.parse(req.params);
    const branch = await setDefaultBranch(id, userId);

    res.json(branch);
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
 * Rename a branch
 * PUT /api/branches/:id/rename
 */
router.put('/:id/rename', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = branchIdSchema.parse(req.params);
    const { name } = z.object({ name: z.string().min(1).max(100) }).parse(req.body);
    
    const branch = await renameBranch(id, name, userId);

    res.json(branch);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }
    if (error instanceof VersionError) {
      const statusCode = error.code === 'ACCESS_DENIED' ? 403 : 
                         error.code === 'BRANCH_EXISTS' ? 409 : 404;
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
 * Delete a branch
 * DELETE /api/branches/:id
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = branchIdSchema.parse(req.params);
    await deleteBranch(id, userId);

    res.status(204).send();
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }
    if (error instanceof VersionError) {
      const statusCode = error.code === 'ACCESS_DENIED' ? 403 : 
                         error.code === 'CANNOT_DELETE_DEFAULT' || error.code === 'HAS_CHILD_BRANCHES' ? 400 : 404;
      res.status(statusCode).json({
        error: error.message,
        code: error.code,
      });
      return;
    }
    next(error);
  }
});

export const branchRouter = router;
