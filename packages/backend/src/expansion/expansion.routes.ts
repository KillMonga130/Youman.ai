/**
 * Expansion Routes
 * API endpoints for content expansion functionality
 * Requirements: 79
 */

import { Router, Request, Response } from 'express';
import { ExpansionService } from './expansion.service';
import {
  OutlineExpansionRequest,
  BulletPointExpansionRequest,
  CoherenceRequest,
  ExpansionLevel,
  ExpansionStyle,
} from './types';

const router = Router();
const expansionService = new ExpansionService();

/** Valid expansion levels */
const VALID_LEVELS: ExpansionLevel[] = [1, 2, 3, 4, 5];

/** Valid styles */
const VALID_STYLES: ExpansionStyle[] = ['formal', 'casual', 'technical', 'academic'];

/**
 * POST /expansion/outline
 * Expands an outline into full content
 */
router.post('/outline', async (req: Request, res: Response) => {
  try {
    const request: OutlineExpansionRequest = req.body;

    // Validate outline
    const validation = expansionService.validateOutline(request.outline);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Bad Request',
        message: validation.error,
      });
    }

    // Validate expansion level
    if (!request.expansionLevel || !VALID_LEVELS.includes(request.expansionLevel)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Expansion level is required and must be one of: ${VALID_LEVELS.join(', ')}`,
      });
    }

    // Validate style if provided
    if (request.style && !VALID_STYLES.includes(request.style)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Invalid style. Must be one of: ${VALID_STYLES.join(', ')}`,
      });
    }

    // Validate target words per section
    if (request.targetWordsPerSection !== undefined) {
      if (typeof request.targetWordsPerSection !== 'number' || 
          request.targetWordsPerSection < 10 || 
          request.targetWordsPerSection > 1000) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Target words per section must be between 10 and 1000',
        });
      }
    }

    const result = await expansionService.expandOutline(request);
    return res.json(result);
  } catch (error) {
    console.error('Error expanding outline:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to expand outline',
    });
  }
});

/**
 * POST /expansion/bullets
 * Expands bullet points into detailed content
 */
router.post('/bullets', async (req: Request, res: Response) => {
  try {
    const request: BulletPointExpansionRequest = req.body;

    // Validate bullets
    const validation = expansionService.validateBullets(request.bullets);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Bad Request',
        message: validation.error,
      });
    }

    // Validate detail level
    if (!request.detailLevel || !VALID_LEVELS.includes(request.detailLevel)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Detail level is required and must be one of: ${VALID_LEVELS.join(', ')}`,
      });
    }

    // Validate style if provided
    if (request.style && !VALID_STYLES.includes(request.style)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Invalid style. Must be one of: ${VALID_STYLES.join(', ')}`,
      });
    }

    // Validate target words per bullet
    if (request.targetWordsPerBullet !== undefined) {
      if (typeof request.targetWordsPerBullet !== 'number' || 
          request.targetWordsPerBullet < 10 || 
          request.targetWordsPerBullet > 500) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Target words per bullet must be between 10 and 500',
        });
      }
    }

    const result = await expansionService.expandBulletPoints(request);
    return res.json(result);
  } catch (error) {
    console.error('Error expanding bullet points:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to expand bullet points',
    });
  }
});

/**
 * POST /expansion/coherence
 * Maintains coherence across expanded sections
 */
router.post('/coherence', async (req: Request, res: Response) => {
  try {
    const request: CoherenceRequest = req.body;

    // Validate expanded sections
    if (!request.expandedSections || !Array.isArray(request.expandedSections)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Expanded sections must be an array',
      });
    }

    if (request.expandedSections.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'At least one expanded section is required',
      });
    }

    if (request.expandedSections.length > 50) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Cannot process more than 50 sections',
      });
    }

    for (let i = 0; i < request.expandedSections.length; i++) {
      const section = request.expandedSections[i];
      if (!section || typeof section !== 'string' || section.trim().length === 0) {
        return res.status(400).json({
          error: 'Bad Request',
          message: `Section at index ${i} is invalid`,
        });
      }
    }

    // Validate target style if provided
    if (request.targetStyle && !VALID_STYLES.includes(request.targetStyle)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Invalid target style. Must be one of: ${VALID_STYLES.join(', ')}`,
      });
    }

    const result = await expansionService.maintainCoherence(request);
    return res.json(result);
  } catch (error) {
    console.error('Error maintaining coherence:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to maintain coherence',
    });
  }
});

/**
 * GET /expansion/levels
 * Gets available expansion level options
 */
router.get('/levels', (_req: Request, res: Response) => {
  try {
    const levels = expansionService.getAvailableLevels();
    return res.json(levels);
  } catch (error) {
    console.error('Error getting levels:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get available levels',
    });
  }
});

/**
 * GET /expansion/styles
 * Gets available expansion styles
 */
router.get('/styles', (_req: Request, res: Response) => {
  try {
    const styles = expansionService.getAvailableStyles();
    return res.json(styles);
  } catch (error) {
    console.error('Error getting styles:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get available styles',
    });
  }
});

export default router;
