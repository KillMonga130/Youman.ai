/**
 * SEO Routes
 * API endpoints for SEO preservation functionality
 * Requirements: 27
 */

import { Router, Request, Response } from 'express';
import { SEOService } from './seo.service';
import { SEODocument, SEOPreservationOptions } from './types';
import { logger } from '../utils/logger';

const router = Router();
const seoService = new SEOService();

/**
 * POST /api/seo/extract-keywords
 * Extracts keywords from text
 * Requirement 27.1: Maintain keyword density
 */
router.post('/extract-keywords', async (req: Request, res: Response) => {
  try {
    const { text, options } = req.body as {
      text: string;
      options?: SEOPreservationOptions;
    };

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Text is required and must be a string',
      });
    }

    const keywords = seoService.extractKeywords(text, options);

    return res.json({
      success: true,
      keywords,
      count: keywords.length,
    });
  } catch (error) {
    logger.error('Error extracting keywords:', error);
    return res.status(500).json({
      error: 'EXTRACTION_ERROR',
      message: 'Failed to extract keywords',
    });
  }
});


/**
 * POST /api/seo/validate-density
 * Validates keyword density between original and transformed text
 * Requirement 27.1: Maintain keyword density within 0.5% of original
 */
router.post('/validate-density', async (req: Request, res: Response) => {
  try {
    const { original, transformed, keywords } = req.body as {
      original: string;
      transformed: string;
      keywords?: string[];
    };

    if (!original || !transformed) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Both original and transformed text are required',
      });
    }

    // Extract keywords if not provided
    const keywordList = keywords
      ? keywords.map(term => ({
          term,
          originalDensity: 0,
          targetDensity: 0,
          importance: 'medium' as const,
          originalCount: 0,
          wordCount: term.split(/\s+/).length,
        }))
      : seoService.extractKeywords(original);

    const report = seoService.validateKeywordDensity(original, transformed, keywordList);

    return res.json({
      success: true,
      report,
    });
  } catch (error) {
    logger.error('Error validating keyword density:', error);
    return res.status(500).json({
      error: 'VALIDATION_ERROR',
      message: 'Failed to validate keyword density',
    });
  }
});

/**
 * POST /api/seo/analyze
 * Performs full SEO analysis on document
 */
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { document, options } = req.body as {
      document: SEODocument;
      options?: SEOPreservationOptions;
    };

    if (!document || !document.content) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Document with content is required',
      });
    }

    const analysis = seoService.analyzeDocument(document, options);

    return res.json({
      success: true,
      analysis,
    });
  } catch (error) {
    logger.error('Error analyzing document:', error);
    return res.status(500).json({
      error: 'ANALYSIS_ERROR',
      message: 'Failed to analyze document',
    });
  }
});

/**
 * POST /api/seo/preserve-meta-tags
 * Extracts and preserves meta tags from document
 * Requirement 27.2: Preserve or enhance meta tags while humanizing
 */
router.post('/preserve-meta-tags', async (req: Request, res: Response) => {
  try {
    const { document } = req.body as { document: SEODocument };

    if (!document || !document.content) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Document with content is required',
      });
    }

    const metaTags = seoService.preserveMetaTags(document);

    return res.json({
      success: true,
      metaTags,
    });
  } catch (error) {
    logger.error('Error preserving meta tags:', error);
    return res.status(500).json({
      error: 'PRESERVATION_ERROR',
      message: 'Failed to preserve meta tags',
    });
  }
});

/**
 * POST /api/seo/heading-structure
 * Analyzes and maintains heading hierarchy
 * Requirement 27.3: Maintain H1-H6 hierarchy and keyword placement
 */
router.post('/heading-structure', async (req: Request, res: Response) => {
  try {
    const { document, keywords } = req.body as {
      document: SEODocument;
      keywords?: string[];
    };

    if (!document || !document.content) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Document with content is required',
      });
    }

    const keywordList = keywords
      ? keywords.map(term => ({
          term,
          originalDensity: 0,
          targetDensity: 0,
          importance: 'medium' as const,
          originalCount: 0,
          wordCount: term.split(/\s+/).length,
        }))
      : undefined;

    const headingStructure = seoService.maintainHeadingHierarchy(document, keywordList);

    return res.json({
      success: true,
      headingStructure,
    });
  } catch (error) {
    logger.error('Error analyzing heading structure:', error);
    return res.status(500).json({
      error: 'ANALYSIS_ERROR',
      message: 'Failed to analyze heading structure',
    });
  }
});

/**
 * POST /api/seo/link-structure
 * Extracts and preserves link structure
 * Requirement 27.5: Preserve all anchor text and link structures
 */
router.post('/link-structure', async (req: Request, res: Response) => {
  try {
    const { document } = req.body as { document: SEODocument };

    if (!document || !document.content) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Document with content is required',
      });
    }

    const linkMap = seoService.preserveLinkStructure(document);

    return res.json({
      success: true,
      linkMap,
    });
  } catch (error) {
    logger.error('Error analyzing link structure:', error);
    return res.status(500).json({
      error: 'ANALYSIS_ERROR',
      message: 'Failed to analyze link structure',
    });
  }
});

/**
 * POST /api/seo/validate-preservation
 * Validates SEO preservation after transformation
 */
router.post('/validate-preservation', async (req: Request, res: Response) => {
  try {
    const { original, transformed, options } = req.body as {
      original: SEODocument;
      transformed: SEODocument;
      options?: SEOPreservationOptions;
    };

    if (!original?.content || !transformed?.content) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Both original and transformed documents with content are required',
      });
    }

    const result = seoService.validatePreservation(original, transformed, options);

    return res.json({
      success: true,
      result,
    });
  } catch (error) {
    logger.error('Error validating preservation:', error);
    return res.status(500).json({
      error: 'VALIDATION_ERROR',
      message: 'Failed to validate SEO preservation',
    });
  }
});

export { router as seoRoutes };
