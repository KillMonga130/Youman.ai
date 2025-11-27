/**
 * Content Analysis Routes
 * API endpoints for content analysis functionality
 * Requirements: 54, 62, 122-130
 */

import { Router, Request, Response } from 'express';
import { ContentAnalysisService } from './content-analysis.service';
import { ContentAnalysisOptions } from './types';
import { logger } from '../utils/logger';

const router = Router();
const contentAnalysisService = new ContentAnalysisService();

/**
 * POST /api/content-analysis/style
 * Analyzes writing style of text
 * Requirement 54: Writing style analysis
 */
router.post('/style', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Text is required and must be a string',
      });
    }

    const result = await contentAnalysisService.analyzeWritingStyle(text);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error analyzing writing style:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to analyze writing style',
    });
  }
});

/**
 * POST /api/content-analysis/gaps
 * Identifies content gaps
 * Requirement 62: Gap analysis system
 */
router.post('/gaps', async (req: Request, res: Response) => {
  try {
    const { text, topic } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Text is required and must be a string',
      });
    }

    if (!topic || typeof topic !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Topic is required and must be a string',
      });
    }

    const result = await contentAnalysisService.identifyGaps(text, topic);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error identifying gaps:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to identify content gaps',
    });
  }
});

/**
 * POST /api/content-analysis/audience
 * Analyzes target audience
 * Requirement 122: Audience analysis
 */
router.post('/audience', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Text is required and must be a string',
      });
    }

    const result = await contentAnalysisService.analyzeAudience(text);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error analyzing audience:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to analyze audience',
    });
  }
});

/**
 * POST /api/content-analysis/competitive
 * Compares content with competitors
 * Requirement 123: Competitive analysis
 */
router.post('/competitive', async (req: Request, res: Response) => {
  try {
    const { text, competitors } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Text is required and must be a string',
      });
    }

    if (!competitors || !Array.isArray(competitors)) {
      return res.status(400).json({
        success: false,
        error: 'Competitors array is required',
      });
    }

    const result = await contentAnalysisService.compareWithCompetitors(text, competitors);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error comparing with competitors:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to compare with competitors',
    });
  }
});

/**
 * POST /api/content-analysis/performance
 * Predicts content performance
 * Requirement 124: Performance prediction
 */
router.post('/performance', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Text is required and must be a string',
      });
    }

    const result = await contentAnalysisService.predictPerformance(text);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error predicting performance:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to predict performance',
    });
  }
});

/**
 * POST /api/content-analysis/credibility
 * Assesses content credibility
 * Requirement 125: Credibility assessment
 */
router.post('/credibility', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Text is required and must be a string',
      });
    }

    const result = await contentAnalysisService.assessCredibility(text);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error assessing credibility:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to assess credibility',
    });
  }
});

/**
 * POST /api/content-analysis/controversy
 * Detects controversial content
 * Requirement 126: Controversy detection
 */
router.post('/controversy', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Text is required and must be a string',
      });
    }

    const result = await contentAnalysisService.detectControversy(text);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error detecting controversy:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to detect controversy',
    });
  }
});

/**
 * POST /api/content-analysis/freshness
 * Assesses content freshness
 * Requirement 127: Freshness optimization
 */
router.post('/freshness', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Text is required and must be a string',
      });
    }

    const result = await contentAnalysisService.assessFreshness(text);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error assessing freshness:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to assess freshness',
    });
  }
});

/**
 * POST /api/content-analysis/comprehensive
 * Performs comprehensive content analysis
 */
router.post('/comprehensive', async (req: Request, res: Response) => {
  try {
    const { text, topic, competitors } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Text is required and must be a string',
      });
    }

    const options: ContentAnalysisOptions = {
      topic: topic || undefined,
      competitors: competitors || undefined,
    };

    const result = await contentAnalysisService.analyzeComprehensive(text, options);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error performing comprehensive analysis:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to perform comprehensive analysis',
    });
  }
});

export default router;
