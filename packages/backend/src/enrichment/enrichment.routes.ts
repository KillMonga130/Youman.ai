/**
 * Content Enrichment Routes
 * API endpoints for content enrichment functionality
 * Requirements: 105
 */

import { Router, Request, Response } from 'express';
import { EnrichmentService } from './enrichment.service';
import {
  CitationAdditionRequest,
  StatisticsInsertionRequest,
  ContentMarkingRequest,
  ComprehensiveEnrichmentRequest,
  ReviewDecision,
  MarkedContent,
} from './types';

const router = Router();
const enrichmentService = new EnrichmentService();

/**
 * POST /enrichment/opportunities
 * Identifies enrichment opportunities in text
 */
router.post('/opportunities', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Text is required and must be a string',
      });
    }

    const result = await enrichmentService.identifyOpportunities(text);
    return res.json(result);
  } catch (error) {
    console.error('Error identifying opportunities:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to identify enrichment opportunities',
    });
  }
});

/**
 * POST /enrichment/citations
 * Adds citations to text
 */
router.post('/citations', async (req: Request, res: Response) => {
  try {
    const request: CitationAdditionRequest = req.body;

    if (!request.text || typeof request.text !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Text is required and must be a string',
      });
    }

    if (!request.format) {
      request.format = 'APA';
    }

    const result = await enrichmentService.addCitations(request);
    return res.json(result);
  } catch (error) {
    console.error('Error adding citations:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to add citations',
    });
  }
});

/**
 * POST /enrichment/statistics
 * Inserts statistics into text
 */
router.post('/statistics', async (req: Request, res: Response) => {
  try {
    const request: StatisticsInsertionRequest = req.body;

    if (!request.text || typeof request.text !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Text is required and must be a string',
      });
    }

    const result = await enrichmentService.insertStatistics(request);
    return res.json(result);
  } catch (error) {
    console.error('Error inserting statistics:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to insert statistics',
    });
  }
});

/**
 * POST /enrichment/mark
 * Marks content for user review
 */
router.post('/mark', async (req: Request, res: Response) => {
  try {
    const request: ContentMarkingRequest = req.body;

    if (!request.text || typeof request.text !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Text is required and must be a string',
      });
    }

    if (!request.opportunities || !Array.isArray(request.opportunities)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Opportunities array is required',
      });
    }

    const result = await enrichmentService.markContentForReview(request);
    return res.json(result);
  } catch (error) {
    console.error('Error marking content:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to mark content for review',
    });
  }
});

/**
 * POST /enrichment/review
 * Applies review decisions to marked content
 */
router.post('/review', async (req: Request, res: Response) => {
  try {
    const { originalText, markedItems, decisions } = req.body as {
      originalText: string;
      markedItems: MarkedContent[];
      decisions: ReviewDecision[];
    };

    if (!originalText || typeof originalText !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Original text is required',
      });
    }

    if (!markedItems || !Array.isArray(markedItems)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Marked items array is required',
      });
    }

    if (!decisions || !Array.isArray(decisions)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Decisions array is required',
      });
    }

    const result = await enrichmentService.applyReviewDecisions(
      originalText,
      markedItems,
      decisions
    );
    return res.json(result);
  } catch (error) {
    console.error('Error applying review decisions:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to apply review decisions',
    });
  }
});

/**
 * POST /enrichment/comprehensive
 * Performs comprehensive content enrichment
 */
router.post('/comprehensive', async (req: Request, res: Response) => {
  try {
    const request: ComprehensiveEnrichmentRequest = req.body;

    if (!request.text || typeof request.text !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Text is required and must be a string',
      });
    }

    const result = await enrichmentService.enrichComprehensive(request);
    return res.json(result);
  } catch (error) {
    console.error('Error performing comprehensive enrichment:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to perform comprehensive enrichment',
    });
  }
});

export default router;
