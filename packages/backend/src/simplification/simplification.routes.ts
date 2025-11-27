/**
 * Content Simplification Routes
 * API endpoints for content simplification functionality
 * Requirements: 106
 */

import { Router, Request, Response } from 'express';
import { SimplificationService } from './simplification.service';
import { SimplificationRequest } from './types';

const router = Router();
const simplificationService = new SimplificationService();

/**
 * POST /simplification/analyze
 * Analyzes the reading level of text
 */
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Text is required and must be a string',
      });
    }

    if (text.trim().length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Text cannot be empty',
      });
    }

    const result = simplificationService.analyzeReadingLevel(text);
    return res.json(result);
  } catch (error) {
    console.error('Error analyzing reading level:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to analyze reading level',
    });
  }
});

/**
 * POST /simplification/detect-jargon
 * Detects jargon in text
 */
router.post('/detect-jargon', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;


    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Text is required and must be a string',
      });
    }

    if (text.trim().length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Text cannot be empty',
      });
    }

    const result = await simplificationService.detectJargon(text);
    return res.json(result);
  } catch (error) {
    console.error('Error detecting jargon:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to detect jargon',
    });
  }
});

/**
 * POST /simplification/simplify
 * Simplifies text to target reading level
 */
router.post('/simplify', async (req: Request, res: Response) => {
  try {
    const request: SimplificationRequest = req.body;

    if (!request.text || typeof request.text !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Text is required and must be a string',
      });
    }

    if (request.text.trim().length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Text cannot be empty',
      });
    }

    if (!request.targetLevel) {
      request.targetLevel = 'middle-school';
    }

    const validLevels = ['elementary', 'middle-school', 'high-school', 'college', 'professional'];
    if (!validLevels.includes(request.targetLevel)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Invalid target level. Must be one of: ${validLevels.join(', ')}`,
      });
    }

    const result = await simplificationService.simplify(request);
    return res.json(result);
  } catch (error) {
    console.error('Error simplifying text:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to simplify text',
    });
  }
});

/**
 * GET /simplification/reading-levels
 * Gets available reading levels
 */
router.get('/reading-levels', (_req: Request, res: Response) => {
  try {
    const levels = simplificationService.getAvailableReadingLevels();
    return res.json(levels);
  } catch (error) {
    console.error('Error getting reading levels:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get reading levels',
    });
  }
});

/**
 * GET /simplification/jargon-categories
 * Gets available jargon categories
 */
router.get('/jargon-categories', (_req: Request, res: Response) => {
  try {
    const categories = simplificationService.getJargonCategories();
    return res.json(categories);
  } catch (error) {
    console.error('Error getting jargon categories:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get jargon categories',
    });
  }
});

/**
 * GET /simplification/jargon/:category
 * Gets jargon terms by category
 */
router.get('/jargon/:category', (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    
    if (!category) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Category is required',
      });
    }

    const terms = simplificationService.getJargonByCategory(category);
    return res.json(terms);
  } catch (error) {
    console.error('Error getting jargon by category:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get jargon by category',
    });
  }
});

export default router;
