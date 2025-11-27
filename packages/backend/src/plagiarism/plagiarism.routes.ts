/**
 * Plagiarism Detection Routes
 * API endpoints for plagiarism checking and originality reports
 * Requirements: 31, 118
 */

import { Router, Request, Response, NextFunction } from 'express';
import { plagiarismService } from './plagiarism.service';
import { PlagiarismCheckOptions, CertificateOptions } from './types';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /plagiarism/check
 * Check text for plagiarism
 * Requirement 31.1: Run plagiarism detection against web sources and academic databases
 */
router.post('/check', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text, options } = req.body as {
      text: string;
      options?: PlagiarismCheckOptions;
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

    const report = await plagiarismService.checkOriginality(text, options);

    return res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    logger.error('Plagiarism check failed:', error);
    return next(error);
  }
});

/**
 * POST /plagiarism/highlight
 * Highlight matching passages in text
 * Requirement 31.2: Highlight matching passages and show similarity percentages
 */
router.post('/highlight', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text, matches } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Text is required and must be a string',
        code: 'INVALID_TEXT',
      });
    }

    if (!Array.isArray(matches)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Matches must be an array',
        code: 'INVALID_MATCHES',
      });
    }

    const annotatedText = plagiarismService.highlightMatches(text, matches);

    return res.json({
      success: true,
      data: annotatedText,
    });
  } catch (error) {
    logger.error('Highlight matches failed:', error);
    return next(error);
  }
});

/**
 * POST /plagiarism/rephrase
 * Rephrase a section to reduce similarity
 * Requirement 31.3: Offer to rephrase flagged sections with increased transformation intensity
 */
router.post('/rephrase', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text, intensity } = req.body as {
      text: string;
      intensity?: number;
    };

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Text is required and must be a string',
        code: 'INVALID_TEXT',
      });
    }

    const result = await plagiarismService.rephraseSection(text, intensity);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Rephrase section failed:', error);
    return next(error);
  }
});

/**
 * POST /plagiarism/suggestions
 * Generate rephrase suggestions for matches
 * Requirement 31.3: Offer to rephrase flagged sections
 */
router.post('/suggestions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { matches } = req.body;

    if (!Array.isArray(matches)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Matches must be an array',
        code: 'INVALID_MATCHES',
      });
    }

    const suggestions = plagiarismService.generateRephraseSuggestions(matches);

    return res.json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    logger.error('Generate suggestions failed:', error);
    return next(error);
  }
});

/**
 * POST /plagiarism/certificate
 * Generate a plagiarism-free certificate
 * Requirement 31.5: Provide plagiarism-free guarantee certificate for premium users
 */
router.post('/certificate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const options = req.body as CertificateOptions;

    if (!options.reportId || !options.userId || !options.documentTitle) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'reportId, userId, and documentTitle are required',
        code: 'MISSING_FIELDS',
      });
    }

    const certificate = await plagiarismService.generateCertificate(options);

    return res.json({
      success: true,
      data: certificate,
    });
  } catch (error) {
    logger.error('Generate certificate failed:', error);
    return next(error);
  }
});

/**
 * GET /plagiarism/certificate/verify/:certificateNumber
 * Verify a plagiarism-free certificate
 */
router.get('/certificate/verify/:certificateNumber', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { certificateNumber } = req.params;

    if (!certificateNumber) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Certificate number is required',
        code: 'MISSING_CERTIFICATE_NUMBER',
      });
    }

    const verification = await plagiarismService.verifyCertificate(certificateNumber);

    return res.json({
      success: true,
      data: verification,
    });
  } catch (error) {
    logger.error('Verify certificate failed:', error);
    return next(error);
  }
});

/**
 * POST /plagiarism/report
 * Generate a detailed originality report
 * Requirement 31.4: Generate detailed originality report with source citations
 */
router.post('/report', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text, options } = req.body as {
      text: string;
      options?: PlagiarismCheckOptions;
    };

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Text is required and must be a string',
        code: 'INVALID_TEXT',
      });
    }

    // Generate full report with all details
    const report = await plagiarismService.checkOriginality(text, {
      ...options,
      generateSuggestions: true,
    });

    // Add highlighted text to report
    const annotatedText = plagiarismService.highlightMatches(text, report.matches);

    // Generate suggestions for high similarity matches
    const suggestions = plagiarismService.generateRephraseSuggestions(report.matches);

    return res.json({
      success: true,
      data: {
        report,
        annotatedText,
        suggestions,
      },
    });
  } catch (error) {
    logger.error('Generate report failed:', error);
    return next(error);
  }
});

export const plagiarismRoutes = router;
