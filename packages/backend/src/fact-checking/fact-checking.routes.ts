/**
 * Fact-Checking Routes
 * API endpoints for content fact-checking and verification
 * Requirements: 110
 */

import { Router, Request, Response, NextFunction } from 'express';
import { factCheckingService } from './fact-checking.service';
import { FactCheckOptions } from './types';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /fact-check/verify
 * Verify factual claims in text
 * Requirement 110.1: Verify factual claims against reliable sources
 */
router.post('/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text, options } = req.body as {
      text: string;
      options?: FactCheckOptions;
    };

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Text is required and must be a string',
        code: 'INVALID_TEXT',
      });
    }

    if (text.trim().length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Text cannot be empty',
        code: 'EMPTY_TEXT',
      });
    }

    const report = await factCheckingService.verifyText(text, options);

    return res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    logger.error('Fact-check verification failed:', error);
    return next(error);
  }
});

/**
 * POST /fact-check/extract-claims
 * Extract factual claims from text without verification
 */
router.post('/extract-claims', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text, options } = req.body as {
      text: string;
      options?: FactCheckOptions;
    };

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Text is required and must be a string',
        code: 'INVALID_TEXT',
      });
    }

    const claims = factCheckingService.extractClaims(text, options);

    return res.json({
      success: true,
      data: {
        claims,
        totalClaims: claims.length,
      },
    });
  } catch (error) {
    logger.error('Claim extraction failed:', error);
    return next(error);
  }
});

/**
 * POST /fact-check/flag
 * Flag inaccurate statements in a verification report
 * Requirement 110.2: Flag questionable statements and provide source links
 */
router.post('/flag', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { report } = req.body;

    if (!report || !report.claimVerifications) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Valid verification report is required',
        code: 'INVALID_REPORT',
      });
    }

    const flaggedStatements = factCheckingService.flagInaccuracies(report);

    return res.json({
      success: true,
      data: {
        flaggedStatements,
        totalFlagged: flaggedStatements.length,
      },
    });
  } catch (error) {
    logger.error('Flagging inaccuracies failed:', error);
    return next(error);
  }
});

/**
 * POST /fact-check/highlight
 * Generate highlighted text with fact-check annotations
 */
router.post('/highlight', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text, report } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Text is required and must be a string',
        code: 'INVALID_TEXT',
      });
    }

    if (!report || !report.claimVerifications) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Valid verification report is required',
        code: 'INVALID_REPORT',
      });
    }

    const annotatedText = factCheckingService.highlightClaims(text, report);

    return res.json({
      success: true,
      data: annotatedText,
    });
  } catch (error) {
    logger.error('Highlighting claims failed:', error);
    return next(error);
  }
});

/**
 * POST /fact-check/report
 * Generate a comprehensive fact-check report
 * Requirement 110.5: Generate verification report with confidence scores
 */
router.post('/report', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text, options } = req.body as {
      text: string;
      options?: FactCheckOptions;
    };

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Text is required and must be a string',
        code: 'INVALID_TEXT',
      });
    }

    // Generate full verification report
    const report = await factCheckingService.verifyText(text, {
      ...options,
      generateCorrections: true,
    });

    // Generate highlighted text
    const annotatedText = factCheckingService.highlightClaims(text, report);

    // Get flagged statements
    const flaggedStatements = factCheckingService.flagInaccuracies(report);

    return res.json({
      success: true,
      data: {
        report,
        annotatedText,
        flaggedStatements,
      },
    });
  } catch (error) {
    logger.error('Report generation failed:', error);
    return next(error);
  }
});

/**
 * POST /fact-check/correction
 * Generate correction suggestions for a claim
 * Requirement 110.4: Provide accurate alternatives with citations
 */
router.post('/correction', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { claim, sources } = req.body;

    if (!claim || !claim.text) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Valid claim is required',
        code: 'INVALID_CLAIM',
      });
    }

    if (!Array.isArray(sources) || sources.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'At least one source is required',
        code: 'INVALID_SOURCES',
      });
    }

    const correction = factCheckingService.generateCorrection(claim, sources);

    if (!correction) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Could not generate correction for this claim',
        code: 'CORRECTION_NOT_FOUND',
      });
    }

    return res.json({
      success: true,
      data: correction,
    });
  } catch (error) {
    logger.error('Correction generation failed:', error);
    return next(error);
  }
});

export const factCheckingRoutes = router;
