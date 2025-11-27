/**
 * Tone and Sentiment Analysis Routes
 * API endpoints for sentiment analysis, tone adjustment, and emotional detection
 * Requirements: 32, 47, 108, 116
 */

import { Router, Request, Response, NextFunction } from 'express';
import { toneService } from './tone.service';
import { ToneAdjustment, SentimentTarget, ToneAnalysisOptions } from './types';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/tone/analyze
 * Analyzes sentiment of provided text
 * Requirement 32: Tone adjustment capabilities
 */
router.post('/analyze', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text, options } = req.body as {
      text: string;
      options?: ToneAnalysisOptions;
    };

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Text is required and must be a string',
      });
    }

    const analysis = await toneService.analyzeSentiment(text, options);
    
    return res.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    logger.error('Error analyzing sentiment:', error);
    return next(error);
  }
});

/**
 * POST /api/tone/adjust
 * Adjusts the tone of provided text
 * Requirement 32: Shift emotional tone of content
 */
router.post('/adjust', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text, targetTone, options } = req.body as {
      text: string;
      targetTone: ToneAdjustment;
      options?: Record<string, unknown>;
    };


    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Text is required and must be a string',
      });
    }

    if (!targetTone || !targetTone.from || !targetTone.to) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Target tone configuration is required with from and to properties',
      });
    }

    const result = await toneService.adjustTone(text, targetTone, options);
    
    return res.json({
      success: result.success,
      data: result,
    });
  } catch (error) {
    logger.error('Error adjusting tone:', error);
    return next(error);
  }
});

/**
 * POST /api/tone/emotions
 * Detects emotional dimensions in text
 * Requirement 108: Emotional dimension detection
 */
router.post('/emotions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text, options } = req.body as {
      text: string;
      options?: ToneAnalysisOptions;
    };

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Text is required and must be a string',
      });
    }

    const profile = await toneService.detectEmotionalDimensions(text, options);
    
    return res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    logger.error('Error detecting emotions:', error);
    return next(error);
  }
});

/**
 * POST /api/tone/consistency
 * Validates tone consistency throughout text
 * Requirement 116: Tone consistency validation
 */
router.post('/consistency', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text } = req.body as { text: string };

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Text is required and must be a string',
      });
    }

    const report = await toneService.validateToneConsistency(text);
    
    return res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    logger.error('Error validating consistency:', error);
    return next(error);
  }
});

/**
 * POST /api/tone/target
 * Targets a specific sentiment in text
 * Requirement 47: Sentiment targeting controls
 */
router.post('/target', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text, target } = req.body as {
      text: string;
      target: SentimentTarget;
    };

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Text is required and must be a string',
      });
    }

    if (!target || !target.targetSentiment) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Target sentiment configuration is required',
      });
    }

    const result = await toneService.targetSentiment(text, target);
    
    return res.json({
      success: result.success,
      data: result,
    });
  } catch (error) {
    logger.error('Error targeting sentiment:', error);
    return next(error);
  }
});

export { router as toneRoutes };
