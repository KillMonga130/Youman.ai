/**
 * Content Formalization Routes
 * API endpoints for content formalization functionality
 * Requirements: 107
 */

import { Router, Request, Response } from 'express';
import { FormalizationService } from './formalization.service';
import { FormalizationRequest } from './types';

const router = Router();
const formalizationService = new FormalizationService();

/**
 * POST /formalization/analyze
 * Analyzes the formalization level of text
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

    const result = formalizationService.analyzeFormalization(text);
    return res.json(result);
  } catch (error) {
    console.error('Error analyzing formalization:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to analyze formalization',
    });
  }
});

/**
 * POST /formalization/detect-slang
 * Detects slang in text
 */
router.post('/detect-slang', async (req: Request, res: Response) => {
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

    const result = await formalizationService.detectSlang(text);
    return res.json(result);
  } catch (error) {
    console.error('Error detecting slang:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to detect slang',
    });
  }
});

/**
 * POST /formalization/formalize
 * Formalizes text to target level
 */
router.post('/formalize', async (req: Request, res: Response) => {
  try {
    const request: FormalizationRequest = req.body;

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
      request.targetLevel = 'professional';
    }

    const validLevels = ['casual', 'standard', 'professional', 'academic', 'legal'];
    if (!validLevels.includes(request.targetLevel)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Invalid target level. Must be one of: ${validLevels.join(', ')}`,
      });
    }

    const result = await formalizationService.formalize(request);
    return res.json(result);
  } catch (error) {
    console.error('Error formalizing text:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to formalize text',
    });
  }
});

/**
 * GET /formalization/levels
 * Gets available formalization levels
 */
router.get('/levels', (_req: Request, res: Response) => {
  try {
    const levels = formalizationService.getAvailableFormalizationLevels();
    return res.json(levels);
  } catch (error) {
    console.error('Error getting formalization levels:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get formalization levels',
    });
  }
});

/**
 * GET /formalization/slang-categories
 * Gets available slang categories
 */
router.get('/slang-categories', (_req: Request, res: Response) => {
  try {
    const categories = formalizationService.getSlangCategories();
    return res.json(categories);
  } catch (error) {
    console.error('Error getting slang categories:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get slang categories',
    });
  }
});

/**
 * GET /formalization/slang/:category
 * Gets slang terms by category
 */
router.get('/slang/:category', (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    
    if (!category) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Category is required',
      });
    }

    const terms = formalizationService.getSlangByCategory(category);
    return res.json(terms);
  } catch (error) {
    console.error('Error getting slang by category:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get slang by category',
    });
  }
});

/**
 * GET /formalization/contractions
 * Gets all contractions
 */
router.get('/contractions', (_req: Request, res: Response) => {
  try {
    const contractions = formalizationService.getContractions();
    return res.json(contractions);
  } catch (error) {
    console.error('Error getting contractions:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get contractions',
    });
  }
});

/**
 * GET /formalization/hedging-phrases
 * Gets hedging phrases
 */
router.get('/hedging-phrases', (req: Request, res: Response) => {
  try {
    const { type } = req.query;
    const phrases = formalizationService.getHedgingPhrases(type as any);
    return res.json(phrases);
  } catch (error) {
    console.error('Error getting hedging phrases:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get hedging phrases',
    });
  }
});

export default router;
