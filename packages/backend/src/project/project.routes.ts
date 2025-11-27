/**
 * Project Routes
 * Handles project CRUD API endpoints
 * 
 * Requirements: 14 - User account and project management
 * Requirements: 15 - Web-based interface for document processing
 */

import { Router, Request, Response } from 'express';
import {
  createProject,
  getProject,
  listProjects,
  updateProject,
  deleteProject,
  getProjectMetadata,
  ProjectError,
} from './project.service';
import { authenticate } from '../auth/auth.middleware';
import {
  createProjectSchema,
  updateProjectSchema,
  listProjectsSchema,
  projectIdSchema,
} from './types';
import { logger } from '../utils/logger';

const router = Router();

// All project routes require authentication
router.use(authenticate);

/**
 * POST /projects
 * Create a new project
 * Requirements: 14.3 - Store project with unique identifier
 */
router.post('/', (async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    // Validate input
    const validationResult = createProjectSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validationResult.error.flatten().fieldErrors,
      });
      return;
    }

    const project = await createProject(req.user.id, validationResult.data);

    res.status(201).json({
      message: 'Project created successfully',
      project,
    });
  } catch (error) {
    if (error instanceof ProjectError) {
      const statusCode = getStatusCodeForProjectError(error.code);
      res.status(statusCode).json({
        error: error.message,
        code: error.code,
      });
      return;
    }
    logger.error('Create project error:', error);
    res.status(500).json({
      error: 'Failed to create project',
      code: 'INTERNAL_ERROR',
    });
  }
}) as unknown as Router);

/**
 * GET /projects
 * List projects with filtering and pagination
 * Requirements: 14.4 - Display all projects with metadata
 */
router.get('/', (async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    // Validate query parameters
    const validationResult = listProjectsSchema.safeParse(req.query);
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validationResult.error.flatten().fieldErrors,
      });
      return;
    }

    const result = await listProjects(req.user.id, validationResult.data);

    res.status(200).json(result);
  } catch (error) {
    if (error instanceof ProjectError) {
      const statusCode = getStatusCodeForProjectError(error.code);
      res.status(statusCode).json({
        error: error.message,
        code: error.code,
      });
      return;
    }
    logger.error('List projects error:', error);
    res.status(500).json({
      error: 'Failed to list projects',
      code: 'INTERNAL_ERROR',
    });
  }
}) as unknown as Router);

/**
 * GET /projects/:id
 * Get a specific project by ID
 */
router.get('/:id', (async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    // Validate project ID
    const validationResult = projectIdSchema.safeParse({ id: req.params.id });
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Invalid project ID',
        code: 'VALIDATION_ERROR',
        details: validationResult.error.flatten().fieldErrors,
      });
      return;
    }

    const project = await getProject(validationResult.data.id, req.user.id);

    res.status(200).json({ project });
  } catch (error) {
    if (error instanceof ProjectError) {
      const statusCode = getStatusCodeForProjectError(error.code);
      res.status(statusCode).json({
        error: error.message,
        code: error.code,
      });
      return;
    }
    logger.error('Get project error:', error);
    res.status(500).json({
      error: 'Failed to get project',
      code: 'INTERNAL_ERROR',
    });
  }
}) as unknown as Router);

/**
 * GET /projects/:id/metadata
 * Get project metadata for dashboard display
 * Requirements: 14.4 - Display projects with metadata including creation date, word count, and processing status
 */
router.get('/:id/metadata', (async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    // Validate project ID
    const validationResult = projectIdSchema.safeParse({ id: req.params.id });
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Invalid project ID',
        code: 'VALIDATION_ERROR',
        details: validationResult.error.flatten().fieldErrors,
      });
      return;
    }

    const metadata = await getProjectMetadata(validationResult.data.id, req.user.id);

    res.status(200).json({ metadata });
  } catch (error) {
    if (error instanceof ProjectError) {
      const statusCode = getStatusCodeForProjectError(error.code);
      res.status(statusCode).json({
        error: error.message,
        code: error.code,
      });
      return;
    }
    logger.error('Get project metadata error:', error);
    res.status(500).json({
      error: 'Failed to get project metadata',
      code: 'INTERNAL_ERROR',
    });
  }
}) as unknown as Router);

/**
 * PATCH /projects/:id
 * Update a project
 */
router.patch('/:id', (async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    // Validate project ID
    const idValidation = projectIdSchema.safeParse({ id: req.params.id });
    if (!idValidation.success) {
      res.status(400).json({
        error: 'Invalid project ID',
        code: 'VALIDATION_ERROR',
        details: idValidation.error.flatten().fieldErrors,
      });
      return;
    }

    // Validate update input
    const bodyValidation = updateProjectSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: bodyValidation.error.flatten().fieldErrors,
      });
      return;
    }

    const project = await updateProject(
      idValidation.data.id,
      req.user.id,
      bodyValidation.data
    );

    res.status(200).json({
      message: 'Project updated successfully',
      project,
    });
  } catch (error) {
    if (error instanceof ProjectError) {
      const statusCode = getStatusCodeForProjectError(error.code);
      res.status(statusCode).json({
        error: error.message,
        code: error.code,
      });
      return;
    }
    logger.error('Update project error:', error);
    res.status(500).json({
      error: 'Failed to update project',
      code: 'INTERNAL_ERROR',
    });
  }
}) as unknown as Router);

/**
 * DELETE /projects/:id
 * Delete a project (soft delete)
 * Requirements: 14.5 - Remove all associated data and confirm deletion
 */
router.delete('/:id', (async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    // Validate project ID
    const validationResult = projectIdSchema.safeParse({ id: req.params.id });
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Invalid project ID',
        code: 'VALIDATION_ERROR',
        details: validationResult.error.flatten().fieldErrors,
      });
      return;
    }

    const result = await deleteProject(validationResult.data.id, req.user.id);

    res.status(200).json(result);
  } catch (error) {
    if (error instanceof ProjectError) {
      const statusCode = getStatusCodeForProjectError(error.code);
      res.status(statusCode).json({
        error: error.message,
        code: error.code,
      });
      return;
    }
    logger.error('Delete project error:', error);
    res.status(500).json({
      error: 'Failed to delete project',
      code: 'INTERNAL_ERROR',
    });
  }
}) as unknown as Router);

/**
 * Map project error codes to HTTP status codes
 */
function getStatusCodeForProjectError(code: string): number {
  switch (code) {
    case 'PROJECT_NOT_FOUND':
      return 404;
    case 'ACCESS_DENIED':
      return 403;
    case 'PROJECT_ALREADY_DELETED':
      return 410;
    case 'VALIDATION_ERROR':
      return 400;
    default:
      return 400;
  }
}

export { router as projectRouter };
