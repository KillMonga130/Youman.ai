/**
 * Search Routes
 * Handles search and saved search API endpoints
 * 
 * Requirements: 61 - Advanced search and filtering
 */

import { Router, Request, Response } from 'express';
import {
  searchProjects,
  saveSearch,
  getSavedSearches,
  getSavedSearch,
  updateSavedSearch,
  deleteSavedSearch,
  executeSavedSearch,
  SearchError,
} from './search.service';
import { authenticate } from '../auth/auth.middleware';
import {
  searchQuerySchema,
  savedSearchSchema,
  updateSavedSearchSchema,
} from './types';
import { logger } from '../utils/logger';
import { z } from 'zod';

const router = Router();

// All search routes require authentication
router.use(authenticate);

/**
 * POST /search
 * Search projects with full-text search and filters
 * Requirements: 61 - Full-text search across projects
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
    const validationResult = searchQuerySchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validationResult.error.flatten().fieldErrors,
      });
      return;
    }

    const results = await searchProjects(req.user.id, validationResult.data);

    res.status(200).json(results);
  } catch (error) {
    if (error instanceof SearchError) {
      const statusCode = getStatusCodeForSearchError(error.code);
      res.status(statusCode).json({
        error: error.message,
        code: error.code,
      });
      return;
    }
    logger.error('Search error:', error);
    res.status(500).json({
      error: 'Search failed',
      code: 'INTERNAL_ERROR',
    });
  }
}) as unknown as Router);

/**
 * GET /search/saved
 * Get all saved searches for the current user
 * Requirements: 61 - Saved searches
 */
router.get('/saved', (async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    const result = await getSavedSearches(req.user.id);

    res.status(200).json(result);
  } catch (error) {
    if (error instanceof SearchError) {
      const statusCode = getStatusCodeForSearchError(error.code);
      res.status(statusCode).json({
        error: error.message,
        code: error.code,
      });
      return;
    }
    logger.error('Get saved searches error:', error);
    res.status(500).json({
      error: 'Failed to get saved searches',
      code: 'INTERNAL_ERROR',
    });
  }
}) as unknown as Router);

/**
 * POST /search/saved
 * Save a search for later use
 * Requirements: 61 - Saved searches
 */
router.post('/saved', (async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    // Validate input
    const validationResult = savedSearchSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validationResult.error.flatten().fieldErrors,
      });
      return;
    }

    const savedSearch = await saveSearch(req.user.id, validationResult.data);

    res.status(201).json({
      message: 'Search saved successfully',
      savedSearch,
    });
  } catch (error) {
    if (error instanceof SearchError) {
      const statusCode = getStatusCodeForSearchError(error.code);
      res.status(statusCode).json({
        error: error.message,
        code: error.code,
      });
      return;
    }
    logger.error('Save search error:', error);
    res.status(500).json({
      error: 'Failed to save search',
      code: 'INTERNAL_ERROR',
    });
  }
}) as unknown as Router);

/**
 * GET /search/saved/:id
 * Get a specific saved search
 */
router.get('/saved/:id', (async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    const idSchema = z.object({ id: z.string().uuid() });
    const validationResult = idSchema.safeParse({ id: req.params.id });
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Invalid search ID',
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    const savedSearch = await getSavedSearch(validationResult.data.id, req.user.id);

    res.status(200).json({ savedSearch });
  } catch (error) {
    if (error instanceof SearchError) {
      const statusCode = getStatusCodeForSearchError(error.code);
      res.status(statusCode).json({
        error: error.message,
        code: error.code,
      });
      return;
    }
    logger.error('Get saved search error:', error);
    res.status(500).json({
      error: 'Failed to get saved search',
      code: 'INTERNAL_ERROR',
    });
  }
}) as unknown as Router);

/**
 * PATCH /search/saved/:id
 * Update a saved search
 */
router.patch('/saved/:id', (async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    const idSchema = z.object({ id: z.string().uuid() });
    const idValidation = idSchema.safeParse({ id: req.params.id });
    if (!idValidation.success) {
      res.status(400).json({
        error: 'Invalid search ID',
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    const bodyValidation = updateSavedSearchSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: bodyValidation.error.flatten().fieldErrors,
      });
      return;
    }

    const savedSearch = await updateSavedSearch(
      idValidation.data.id,
      req.user.id,
      bodyValidation.data
    );

    res.status(200).json({
      message: 'Saved search updated successfully',
      savedSearch,
    });
  } catch (error) {
    if (error instanceof SearchError) {
      const statusCode = getStatusCodeForSearchError(error.code);
      res.status(statusCode).json({
        error: error.message,
        code: error.code,
      });
      return;
    }
    logger.error('Update saved search error:', error);
    res.status(500).json({
      error: 'Failed to update saved search',
      code: 'INTERNAL_ERROR',
    });
  }
}) as unknown as Router);

/**
 * DELETE /search/saved/:id
 * Delete a saved search
 */
router.delete('/saved/:id', (async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    const idSchema = z.object({ id: z.string().uuid() });
    const validationResult = idSchema.safeParse({ id: req.params.id });
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Invalid search ID',
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    const result = await deleteSavedSearch(validationResult.data.id, req.user.id);

    res.status(200).json(result);
  } catch (error) {
    if (error instanceof SearchError) {
      const statusCode = getStatusCodeForSearchError(error.code);
      res.status(statusCode).json({
        error: error.message,
        code: error.code,
      });
      return;
    }
    logger.error('Delete saved search error:', error);
    res.status(500).json({
      error: 'Failed to delete saved search',
      code: 'INTERNAL_ERROR',
    });
  }
}) as unknown as Router);

/**
 * POST /search/saved/:id/execute
 * Execute a saved search
 */
router.post('/saved/:id/execute', (async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    const idSchema = z.object({ id: z.string().uuid() });
    const validationResult = idSchema.safeParse({ id: req.params.id });
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Invalid search ID',
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    const paginationSchema = z.object({
      page: z.coerce.number().min(1).optional(),
      limit: z.coerce.number().min(1).max(100).optional(),
    });
    const pagination = paginationSchema.parse(req.body);

    const results = await executeSavedSearch(
      validationResult.data.id,
      req.user.id,
      pagination
    );

    res.status(200).json(results);
  } catch (error) {
    if (error instanceof SearchError) {
      const statusCode = getStatusCodeForSearchError(error.code);
      res.status(statusCode).json({
        error: error.message,
        code: error.code,
      });
      return;
    }
    logger.error('Execute saved search error:', error);
    res.status(500).json({
      error: 'Failed to execute saved search',
      code: 'INTERNAL_ERROR',
    });
  }
}) as unknown as Router);

/**
 * Map search error codes to HTTP status codes
 */
function getStatusCodeForSearchError(code: string): number {
  switch (code) {
    case 'SEARCH_NOT_FOUND':
      return 404;
    case 'ACCESS_DENIED':
      return 403;
    case 'VALIDATION_ERROR':
      return 400;
    default:
      return 400;
  }
}

export { router as searchRouter };
