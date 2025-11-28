/**
 * Template Routes
 * API endpoints for template management
 * Requirements: 25
 */

import { Router, Request, Response, NextFunction } from 'express';
import { templateService } from './template.service';
import {
  CreateTemplateOptions,
  UpdateTemplateOptions,
  ApplyTemplateOptions,
  TemplateFilterOptions,
  TemplateCategory,
  TemplateVisibility,
  TemplateExport,
} from './types';
import { logger } from '../utils/logger';
import { authenticate } from '../auth/auth.middleware';

const router = Router();

// All template routes require authentication
router.use(authenticate);

/**
 * GET /api/templates
 * Gets templates with optional filtering
 * Requirement 25.1: Provide pre-configured templates for common use cases
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const options: TemplateFilterOptions = {};

    // Parse query parameters
    if (req.query.category) {
      options.category = req.query.category as TemplateCategory;
    }
    if (req.query.visibility) {
      options.visibility = req.query.visibility as TemplateVisibility;
    }
    if (req.query.userId) {
      options.userId = req.query.userId as string;
    }
    if (req.query.includeSystem !== undefined) {
      options.includeSystem = req.query.includeSystem === 'true';
    }
    if (req.query.searchQuery) {
      options.searchQuery = req.query.searchQuery as string;
    }
    if (req.query.tags) {
      options.tags = (req.query.tags as string).split(',');
    }
    if (req.query.sortBy) {
      options.sortBy = req.query.sortBy as 'name' | 'createdAt' | 'usageCount' | 'rating';
    }
    if (req.query.sortDirection) {
      options.sortDirection = req.query.sortDirection as 'asc' | 'desc';
    }
    if (req.query.limit) {
      options.limit = parseInt(req.query.limit as string, 10);
    }
    if (req.query.offset) {
      options.offset = parseInt(req.query.offset as string, 10);
    }

    const templates = await templateService.getTemplates(options);

    return res.json({
      success: true,
      data: {
        templates: templates.map(t => ({
          id: t.id,
          name: t.name,
          description: t.description,
          category: t.category,
          visibility: t.visibility,
          isSystem: t.isSystem,
          settings: t.settings,
          metadata: t.metadata,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        })),
        count: templates.length,
      },
    });
  } catch (error) {
    logger.error('Error getting templates:', error);
    return next(error);
  }
});

/**
 * GET /api/templates/categories
 * Gets available template categories
 */
router.get('/categories', async (_req: Request, res: Response) => {
  const categories: TemplateCategory[] = [
    'blog-posts',
    'academic-papers',
    'creative-writing',
    'business-content',
    'technical-docs',
    'social-media',
    'marketing',
    'custom',
  ];

  return res.json({
    success: true,
    data: { categories },
  });
});

/**
 * GET /api/templates/:templateId
 * Gets a template by ID
 */
router.get('/:templateId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const templateId = req.params.templateId as string;

    const template = await templateService.getTemplate(templateId);

    if (!template) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: `Template not found: ${templateId}`,
      });
    }

    return res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    logger.error('Error getting template:', error);
    return next(error);
  }
});

/**
 * POST /api/templates
 * Creates a new custom template
 * Requirement 25.3: Custom template creation
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as CreateTemplateOptions;

    // Validate required fields
    if (!body.name || typeof body.name !== 'string') {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Template name is required',
      });
    }

    if (!body.description || typeof body.description !== 'string') {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Template description is required',
      });
    }

    if (!body.category) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Template category is required',
      });
    }

    if (!body.userId || typeof body.userId !== 'string') {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'User ID is required',
      });
    }

    if (!body.settings) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Template settings are required',
      });
    }

    if (!body.settings.level || body.settings.level < 1 || body.settings.level > 5) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Humanization level must be between 1 and 5',
      });
    }

    if (!body.settings.strategy) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Transformation strategy is required',
      });
    }

    const template = await templateService.createTemplate(body);

    return res.status(201).json({
      success: true,
      data: {
        id: template.id,
        name: template.name,
        category: template.category,
        createdAt: template.createdAt,
      },
    });
  } catch (error) {
    logger.error('Error creating template:', error);
    return next(error);
  }
});

/**
 * PATCH /api/templates/:templateId
 * Updates a template
 */
router.patch('/:templateId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const templateId = req.params.templateId as string;
    const userId = req.body.userId as string;
    const options = req.body as UpdateTemplateOptions;

    if (!userId) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'User ID is required',
      });
    }

    const template = await templateService.updateTemplate(templateId, userId, options);

    return res.json({
      success: true,
      data: {
        id: template.id,
        name: template.name,
        version: template.metadata.version,
        updatedAt: template.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Error updating template:', error);
    return next(error);
  }
});

/**
 * DELETE /api/templates/:templateId
 * Deletes a template
 */
router.delete('/:templateId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const templateId = req.params.templateId as string;
    const userId = req.query.userId as string;

    if (!userId) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'User ID is required',
      });
    }

    await templateService.deleteTemplate(templateId, userId);

    return res.json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting template:', error);
    return next(error);
  }
});

/**
 * POST /api/templates/:templateId/apply
 * Applies a template to a project
 * Requirement 25.2: Automatically apply template's settings
 * Requirement 25.5: Allow users to override individual settings
 */
router.post('/:templateId/apply', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const templateId = req.params.templateId as string;
    const { projectId, overrides } = req.body;

    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Project ID is required',
      });
    }

    const options: ApplyTemplateOptions = {
      templateId,
      projectId,
      overrides,
    };

    const result = await templateService.applyTemplate(options);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error applying template:', error);
    return next(error);
  }
});

/**
 * GET /api/templates/:templateId/export
 * Exports a template
 * Requirement 25.4: Export template configurations
 */
router.get('/:templateId/export', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const templateId = req.params.templateId as string;

    const exportData = await templateService.exportTemplate(templateId);

    return res.json({
      success: true,
      data: exportData,
    });
  } catch (error) {
    logger.error('Error exporting template:', error);
    return next(error);
  }
});

/**
 * POST /api/templates/import
 * Imports a template
 * Requirement 25.4: Import template configurations
 */
router.post('/import', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, exportData } = req.body;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'User ID is required',
      });
    }

    if (!exportData) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Export data is required',
      });
    }

    const template = await templateService.importTemplate(userId, exportData as TemplateExport);

    return res.status(201).json({
      success: true,
      data: {
        id: template.id,
        name: template.name,
        category: template.category,
        createdAt: template.createdAt,
      },
    });
  } catch (error) {
    logger.error('Error importing template:', error);
    return next(error);
  }
});

/**
 * POST /api/templates/:templateId/share
 * Shares a template with another user
 * Requirement 25.4: Allow users to share templates
 */
router.post('/:templateId/share', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const templateId = req.params.templateId as string;
    const { targetUserId, permission } = req.body;

    if (!targetUserId || typeof targetUserId !== 'string') {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Target user ID is required',
      });
    }

    const validPermissions = ['view', 'use', 'edit'];
    if (!permission || !validPermissions.includes(permission)) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: `Permission must be one of: ${validPermissions.join(', ')}`,
      });
    }

    const share = await templateService.shareTemplate({
      templateId,
      targetUserId,
      permission,
    });

    return res.status(201).json({
      success: true,
      data: share,
    });
  } catch (error) {
    logger.error('Error sharing template:', error);
    return next(error);
  }
});

/**
 * DELETE /api/templates/shares/:shareId
 * Removes a template share
 */
router.delete('/shares/:shareId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shareId = req.params.shareId as string;
    const userId = req.query.userId as string;

    if (!userId) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'User ID is required',
      });
    }

    await templateService.unshareTemplate(shareId, userId);

    return res.json({
      success: true,
      message: 'Share removed successfully',
    });
  } catch (error) {
    logger.error('Error removing share:', error);
    return next(error);
  }
});

/**
 * GET /api/templates/:templateId/shares
 * Gets shares for a template
 */
router.get('/:templateId/shares', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const templateId = req.params.templateId as string;

    const shares = await templateService.getTemplateShares(templateId);

    return res.json({
      success: true,
      data: {
        shares,
        count: shares.length,
      },
    });
  } catch (error) {
    logger.error('Error getting shares:', error);
    return next(error);
  }
});

/**
 * POST /api/templates/:templateId/rate
 * Rates a template
 */
router.post('/:templateId/rate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const templateId = req.params.templateId as string;
    const { userId, rating } = req.body;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'User ID is required',
      });
    }

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Rating must be a number between 1 and 5',
      });
    }

    await templateService.rateTemplate(templateId, userId, rating);

    return res.json({
      success: true,
      message: 'Template rated successfully',
    });
  } catch (error) {
    logger.error('Error rating template:', error);
    return next(error);
  }
});

/**
 * POST /api/templates/:templateId/duplicate
 * Duplicates a template
 */
router.post('/:templateId/duplicate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const templateId = req.params.templateId as string;
    const { userId, newName } = req.body;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'User ID is required',
      });
    }

    const template = await templateService.duplicateTemplate(templateId, userId, newName);

    return res.status(201).json({
      success: true,
      data: {
        id: template.id,
        name: template.name,
        category: template.category,
        createdAt: template.createdAt,
      },
    });
  } catch (error) {
    logger.error('Error duplicating template:', error);
    return next(error);
  }
});

export { router as templateRoutes };
