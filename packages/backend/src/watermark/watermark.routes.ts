/**
 * Watermarking Routes
 * API endpoints for watermark embedding, detection, and configuration
 * Requirements: 76 - Invisible watermarking system
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { watermarkService, WatermarkError } from './watermark.service';
import { logger } from '../utils/logger';

const router = Router();

// ============================================
// Validation Schemas
// ============================================

const embedWatermarkSchema = z.object({
  text: z.string().min(1, 'Text is required'),
  projectId: z.string().min(1, 'Project ID is required'),
  customData: z.record(z.any()).optional(),
});

const detectWatermarkSchema = z.object({
  text: z.string().min(1, 'Text is required'),
});

const verifyWatermarkSchema = z.object({
  text: z.string().min(1, 'Text is required'),
  expectedUserId: z.string().min(1, 'Expected user ID is required'),
});

const configureWatermarkSchema = z.object({
  enabled: z.boolean().optional(),
  includeUserId: z.boolean().optional(),
  includeProjectId: z.boolean().optional(),
  includeTimestamp: z.boolean().optional(),
  customFields: z.array(z.string()).optional(),
});

const removeWatermarkSchema = z.object({
  text: z.string().min(1, 'Text is required'),
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
 * Error handler for watermark routes
 */
function handleWatermarkError(error: unknown, res: Response): void {
  if (error instanceof WatermarkError) {
    const statusMap: Record<string, number> = {
      EMPTY_TEXT: 400,
      INVALID_USER_ID: 400,
      ENCODING_ERROR: 500,
      DECODING_ERROR: 500,
    };

    const status = statusMap[error.code] || 400;
    res.status(status).json({
      error: error.message,
      code: error.code,
    });
    return;
  }

  logger.error('Watermark route error:', error);
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
}

// ============================================
// Routes
// ============================================

/**
 * POST /api/watermark/embed
 * Embed watermark into text
 * Requirement 76: Implement invisible watermark embedding
 */
router.post(
  '/embed',
  validateBody(embedWatermarkSchema),
  async (req: Request, res: Response) => {
    try {
      const { text, projectId, customData } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
        return;
      }

      const watermarkedText = await watermarkService.embedWatermark(text, {
        userId,
        projectId,
        timestamp: new Date(),
        customData,
      });

      res.json({
        success: true,
        text: watermarkedText,
        hasWatermark: watermarkService.hasWatermark(watermarkedText),
      });
    } catch (error) {
      handleWatermarkError(error, res);
    }
  }
);

/**
 * POST /api/watermark/detect
 * Detect watermark in text
 * Requirement 76: Create watermark detection tool
 */
router.post(
  '/detect',
  validateBody(detectWatermarkSchema),
  async (req: Request, res: Response) => {
    try {
      const { text } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
        return;
      }

      const watermarkInfo = await watermarkService.detectWatermark(text);

      res.json({
        detected: watermarkInfo?.detected || false,
        watermarkInfo,
      });
    } catch (error) {
      handleWatermarkError(error, res);
    }
  }
);

/**
 * POST /api/watermark/verify
 * Verify watermark matches expected user
 * Requirement 76: Build watermark verification
 */
router.post(
  '/verify',
  validateBody(verifyWatermarkSchema),
  async (req: Request, res: Response) => {
    try {
      const { text, expectedUserId } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
        return;
      }

      const result = await watermarkService.getVerificationResult(text, expectedUserId);

      res.json(result);
    } catch (error) {
      handleWatermarkError(error, res);
    }
  }
);

/**
 * GET /api/watermark/config
 * Get watermark configuration for current user
 * Requirement 76: Add watermark configuration
 */
router.get('/config', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
      return;
    }

    const config = watermarkService.getWatermarkConfig(userId);

    res.json({ config });
  } catch (error) {
    handleWatermarkError(error, res);
  }
});

/**
 * PUT /api/watermark/config
 * Update watermark configuration for current user
 * Requirement 76: Add watermark configuration
 */
router.put(
  '/config',
  validateBody(configureWatermarkSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
        return;
      }

      await watermarkService.configureWatermark(userId, req.body);
      const config = watermarkService.getWatermarkConfig(userId);

      res.json({
        success: true,
        config,
      });
    } catch (error) {
      handleWatermarkError(error, res);
    }
  }
);

/**
 * POST /api/watermark/remove
 * Remove watermark from text
 */
router.post(
  '/remove',
  validateBody(removeWatermarkSchema),
  async (req: Request, res: Response) => {
    try {
      const { text } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
        return;
      }

      const cleanText = watermarkService.removeWatermark(text);

      res.json({
        success: true,
        text: cleanText,
        hadWatermark: text !== cleanText,
      });
    } catch (error) {
      handleWatermarkError(error, res);
    }
  }
);

/**
 * POST /api/watermark/check
 * Quick check if text has watermark
 */
router.post(
  '/check',
  validateBody(detectWatermarkSchema),
  async (req: Request, res: Response) => {
    try {
      const { text } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
        return;
      }

      const hasWatermark = watermarkService.hasWatermark(text);

      res.json({ hasWatermark });
    } catch (error) {
      handleWatermarkError(error, res);
    }
  }
);

export default router;
