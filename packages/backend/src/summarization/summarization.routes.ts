/**
 * Summarization Routes
 * API endpoints for content summarization functionality
 * Requirements: 78
 */

import { Router, Request, Response } from 'express';
import { SummarizationService } from './summarization.service';
import {
  SummarizationRequest,
  ExtractiveSummarizationRequest,
  AbstractiveSummarizationRequest,
  HumanizeSummaryRequest,
} from './types';

const router = Router();
const summarizationService = new SummarizationService();

/**
 * POST /summarization/summarize
 * General summarization with length control
 */
router.post('/summarize', async (req: Request, res: Response) => {
  try {
    const request: SummarizationRequest = req.body;

    const validation = summarizationService.validateText(request.text);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Bad Request',
        message: validation.error,
      });
    }

    // Validate length
    const validLengths = ['short', 'medium', 'long'];
    if (request.length && !validLengths.includes(request.length)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Invalid length. Must be one of: ${validLengths.join(', ')}`,
      });
    }

    // Validate method
    const validMethods = ['extractive', 'abstractive', 'hybrid'];
    if (request.method && !validMethods.includes(request.method)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Invalid method. Must be one of: ${validMethods.join(', ')}`,
      });
    }

    // Validate humanization level
    if (request.humanizationLevel && (request.humanizationLevel < 1 || request.humanizationLevel > 5)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Humanization level must be between 1 and 5',
      });
    }

    const result = await summarizationService.summarize(request);
    return res.json(result);
  } catch (error) {
    console.error('Error summarizing text:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to summarize text',
    });
  }
});

/**
 * POST /summarization/extractive
 * Extractive summarization - selects most important sentences
 */
router.post('/extractive', async (req: Request, res: Response) => {
  try {
    const request: ExtractiveSummarizationRequest = req.body;

    const validation = summarizationService.validateText(request.text);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Bad Request',
        message: validation.error,
      });
    }

    if (!request.sentenceCount || typeof request.sentenceCount !== 'number') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Sentence count is required and must be a number',
      });
    }

    if (request.sentenceCount < 1 || request.sentenceCount > 100) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Sentence count must be between 1 and 100',
      });
    }

    const result = await summarizationService.extractiveSummarize(request);
    return res.json(result);
  } catch (error) {
    console.error('Error in extractive summarization:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to perform extractive summarization',
    });
  }
});

/**
 * POST /summarization/abstractive
 * Abstractive summarization - generates new summary text
 */
router.post('/abstractive', async (req: Request, res: Response) => {
  try {
    const request: AbstractiveSummarizationRequest = req.body;

    const validation = summarizationService.validateText(request.text);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Bad Request',
        message: validation.error,
      });
    }

    if (!request.wordCount || typeof request.wordCount !== 'number') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Word count is required and must be a number',
      });
    }

    if (request.wordCount < 10 || request.wordCount > 10000) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Word count must be between 10 and 10000',
      });
    }

    // Validate style
    const validStyles = ['formal', 'casual', 'technical'];
    if (request.style && !validStyles.includes(request.style)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Invalid style. Must be one of: ${validStyles.join(', ')}`,
      });
    }

    const result = await summarizationService.abstractiveSummarize(request);
    return res.json(result);
  } catch (error) {
    console.error('Error in abstractive summarization:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to perform abstractive summarization',
    });
  }
});

/**
 * POST /summarization/humanize
 * Humanizes a summary to make it sound more natural
 */
router.post('/humanize', async (req: Request, res: Response) => {
  try {
    const request: HumanizeSummaryRequest = req.body;

    if (!request.summary || typeof request.summary !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Summary is required and must be a string',
      });
    }

    if (request.summary.trim().length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Summary cannot be empty',
      });
    }

    // Validate level
    if (request.level && (request.level < 1 || request.level > 5)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Level must be between 1 and 5',
      });
    }

    // Validate tone
    const validTones = ['casual', 'professional', 'academic'];
    if (request.tone && !validTones.includes(request.tone)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Invalid tone. Must be one of: ${validTones.join(', ')}`,
      });
    }

    const result = await summarizationService.humanizeSummary(request);
    return res.json(result);
  } catch (error) {
    console.error('Error humanizing summary:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to humanize summary',
    });
  }
});

/**
 * GET /summarization/lengths
 * Gets available summary length options
 */
router.get('/lengths', (_req: Request, res: Response) => {
  try {
    const lengths = summarizationService.getAvailableLengths();
    return res.json(lengths);
  } catch (error) {
    console.error('Error getting lengths:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get available lengths',
    });
  }
});

/**
 * GET /summarization/methods
 * Gets available summarization methods
 */
router.get('/methods', (_req: Request, res: Response) => {
  try {
    const methods = summarizationService.getAvailableMethods();
    return res.json(methods);
  } catch (error) {
    console.error('Error getting methods:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get available methods',
    });
  }
});

export default router;
