/**
 * Citation Management API Routes
 * Provides endpoints for citation detection, preservation, validation, and standardization
 * Requirements: 33
 */

import { Router, Request, Response, NextFunction } from 'express';
import { getCitationService } from './citation.service';
import { CitationFormat, CitationAnalysisOptions } from './types';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/citation/detect-format
 * Detects citation format in text
 * Requirement 33.1: Detect APA, MLA, Chicago, and Harvard citation formats
 */
router.post('/detect-format', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Text is required and must be a string',
      });
    }

    const service = getCitationService();
    const result = await service.detectCitationFormat(text);

    logger.info('Citation format detection completed', {
      format: result.primaryFormat,
      confidence: result.confidence,
      hasMixedFormats: result.hasMixedFormats,
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/citation/preserve
 * Preserves citations for transformation
 * Requirement 33.2: Maintain in-text citations and reference list integrity
 */
router.post('/preserve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Text is required and must be a string',
      });
    }

    const service = getCitationService();
    const result = await service.preserveCitations(text);

    logger.info('Citation preservation completed', {
      totalCitations: result.totalCitations,
      totalReferences: result.totalReferences,
      digitalIdentifiers: result.digitalIdentifiers.length,
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/citation/validate-bibliography
 * Validates bibliography entries
 * Requirement 33.3: Preserve all bibliographic information exactly
 */
router.post('/validate-bibliography', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Text is required and must be a string',
      });
    }

    const service = getCitationService();
    const result = await service.validateBibliography(text);

    logger.info('Bibliography validation completed', {
      totalEntries: result.totalEntries,
      validEntries: result.validEntries,
      invalidEntries: result.invalidEntries,
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/citation/standardize
 * Standardizes citation format
 * Requirement 33.5: Detect inconsistencies and offer to standardize formatting
 */
router.post('/standardize', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text, targetFormat } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Text is required and must be a string',
      });
    }

    const validFormats: CitationFormat[] = ['APA', 'MLA', 'Chicago', 'Harvard'];
    if (!targetFormat || !validFormats.includes(targetFormat)) {
      return res.status(400).json({
        success: false,
        error: `Target format must be one of: ${validFormats.join(', ')}`,
      });
    }

    const service = getCitationService();
    const result = await service.standardizeFormat(text, targetFormat as CitationFormat);

    logger.info('Citation standardization completed', {
      targetFormat,
      citationsConverted: result.citationsConverted,
      success: result.success,
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/citation/extract
 * Extracts and analyzes all citations
 */
router.post('/extract', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text, options } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Text is required and must be a string',
      });
    }

    const analysisOptions: CitationAnalysisOptions = {
      detectFormat: options?.detectFormat !== false,
      validateBibliography: options?.validateBibliography !== false,
      extractIdentifiers: options?.extractIdentifiers !== false,
    };

    const service = getCitationService();
    const result = await service.extractCitations(text, analysisOptions);

    logger.info('Citation extraction completed', {
      citationsFound: result.citations.length,
      format: result.formatDetection.primaryFormat,
      identifiersFound: result.digitalIdentifiers.length,
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/citation/formats
 * Returns supported citation formats
 */
router.get('/formats', (_req: Request, res: Response) => {
  const formats = [
    {
      id: 'APA',
      name: 'APA (American Psychological Association)',
      description: 'Common in social sciences. Uses author-date in-text citations.',
      example: '(Smith, 2023)',
    },
    {
      id: 'MLA',
      name: 'MLA (Modern Language Association)',
      description: 'Common in humanities. Uses author-page in-text citations.',
      example: '(Smith 45)',
    },
    {
      id: 'Chicago',
      name: 'Chicago Manual of Style',
      description: 'Used in history and some humanities. Uses footnotes or author-date.',
      example: '[1] or (Smith 2023)',
    },
    {
      id: 'Harvard',
      name: 'Harvard Referencing',
      description: 'Similar to APA but without comma. Common in UK and Australia.',
      example: '(Smith 2023)',
    },
  ];

  return res.json({
    success: true,
    data: formats,
  });
});

export const citationRoutes = router;
