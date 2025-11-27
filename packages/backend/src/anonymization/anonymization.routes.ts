/**
 * Content Anonymization Routes
 * API endpoints for PII detection and content anonymization
 * Requirements: 104
 */

import { Router, Request, Response } from 'express';
import { anonymizationService } from './anonymization.service';
import { AnonymizationConfig, PIIType } from './types';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/anonymization/detect
 * Detects PII in text
 */
router.post('/detect', async (req: Request, res: Response) => {
  try {
    const { text, piiTypes, confidenceThreshold } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Text is required and must be a string',
      });
    }

    const result = await anonymizationService.detectPII(
      text,
      piiTypes as PIIType[] | undefined,
      confidenceThreshold as number | undefined
    );

    return res.json(result);
  } catch (error) {
    logger.error('Error in PII detection endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});


/**
 * POST /api/anonymization/anonymize
 * Anonymizes text by replacing PII
 */
router.post('/anonymize', async (req: Request, res: Response) => {
  try {
    const { text, config } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Text is required and must be a string',
      });
    }

    const result = await anonymizationService.anonymize(
      text,
      config as Partial<AnonymizationConfig> | undefined
    );

    return res.json(result);
  } catch (error) {
    logger.error('Error in anonymization endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/anonymization/deanonymize
 * De-anonymizes text using a mapping
 */
router.post('/deanonymize', async (req: Request, res: Response) => {
  try {
    const { text, mapId } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Text is required and must be a string',
      });
    }

    if (!mapId || typeof mapId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Map ID is required and must be a string',
      });
    }

    const result = await anonymizationService.deAnonymize(text, mapId);

    return res.json(result);
  } catch (error) {
    logger.error('Error in de-anonymization endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/anonymization/hipaa-report
 * Generates HIPAA compliance report
 */
router.post('/hipaa-report', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Text is required and must be a string',
      });
    }

    const report = await anonymizationService.generateHIPAAReport(text);

    return res.json({
      success: true,
      report,
    });
  } catch (error) {
    logger.error('Error in HIPAA report endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/anonymization/map/:mapId
 * Gets a de-anonymization map
 */
router.get('/map/:mapId', async (req: Request, res: Response) => {
  try {
    const mapId = req.params.mapId as string;

    const map = anonymizationService.getDeAnonymizationMap(mapId);

    if (!map) {
      return res.status(404).json({
        success: false,
        error: 'De-anonymization map not found',
      });
    }

    return res.json({
      success: true,
      map,
    });
  } catch (error) {
    logger.error('Error getting de-anonymization map:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * DELETE /api/anonymization/map/:mapId
 * Deletes a de-anonymization map
 */
router.delete('/map/:mapId', async (req: Request, res: Response) => {
  try {
    const mapId = req.params.mapId as string;

    const deleted = anonymizationService.deleteDeAnonymizationMap(mapId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'De-anonymization map not found',
      });
    }

    return res.json({
      success: true,
      message: 'De-anonymization map deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting de-anonymization map:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export { router as anonymizationRoutes };
