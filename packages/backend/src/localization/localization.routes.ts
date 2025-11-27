/**
 * Content Localization Routes
 * API endpoints for content localization functionality
 * Requirements: 111
 */

import { Router, Request, Response } from 'express';
import { LocalizationService } from './localization.service';
import { LocalizationRequest, MultiRegionLocalizationRequest, SensitivityCheckRequest, TargetRegion } from './types';

const router = Router();
const localizationService = new LocalizationService();

/** Valid regions */
const VALID_REGIONS: TargetRegion[] = [
  'us', 'uk', 'au', 'ca', 'de', 'fr', 'es', 'mx', 'br', 'jp', 'cn', 'in', 'ae', 'za'
];

/**
 * POST /localization/localize
 * Localizes content for a target region
 */
router.post('/localize', async (req: Request, res: Response) => {
  try {
    const request: LocalizationRequest = req.body;

    if (!request.content || typeof request.content !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Content is required and must be a string',
      });
    }

    if (request.content.trim().length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Content cannot be empty',
      });
    }

    if (!request.targetRegion) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Target region is required',
      });
    }

    if (!VALID_REGIONS.includes(request.targetRegion)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Invalid target region. Must be one of: ${VALID_REGIONS.join(', ')}`,
      });
    }

    if (request.sourceRegion && !VALID_REGIONS.includes(request.sourceRegion)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Invalid source region. Must be one of: ${VALID_REGIONS.join(', ')}`,
      });
    }

    // Set defaults for boolean options
    const normalizedRequest: LocalizationRequest = {
      ...request,
      adaptIdioms: request.adaptIdioms ?? true,
      adaptMetaphors: request.adaptMetaphors ?? true,
      adaptCulturalReferences: request.adaptCulturalReferences ?? true,
      convertUnits: request.convertUnits ?? true,
      convertCurrency: request.convertCurrency ?? true,
      convertDateFormats: request.convertDateFormats ?? true,
      checkSensitivity: request.checkSensitivity ?? true,
    };

    const result = await localizationService.localize(normalizedRequest);
    return res.json(result);
  } catch (error) {
    console.error('Error localizing content:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to localize content',
    });
  }
});

/**
 * POST /localization/multi-region
 * Localizes content for multiple regions
 */
router.post('/multi-region', async (req: Request, res: Response) => {
  try {
    const request: MultiRegionLocalizationRequest = req.body;

    if (!request.content || typeof request.content !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Content is required and must be a string',
      });
    }

    if (request.content.trim().length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Content cannot be empty',
      });
    }

    if (!request.targetRegions || !Array.isArray(request.targetRegions) || request.targetRegions.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Target regions array is required and must not be empty',
      });
    }

    for (const region of request.targetRegions) {
      if (!VALID_REGIONS.includes(region)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: `Invalid region: ${region}. Must be one of: ${VALID_REGIONS.join(', ')}`,
        });
      }
    }

    if (request.sourceRegion && !VALID_REGIONS.includes(request.sourceRegion)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Invalid source region. Must be one of: ${VALID_REGIONS.join(', ')}`,
      });
    }

    // Set defaults for boolean options
    const normalizedRequest: MultiRegionLocalizationRequest = {
      ...request,
      adaptIdioms: request.adaptIdioms ?? true,
      adaptMetaphors: request.adaptMetaphors ?? true,
      adaptCulturalReferences: request.adaptCulturalReferences ?? true,
      convertUnits: request.convertUnits ?? true,
      convertCurrency: request.convertCurrency ?? true,
      convertDateFormats: request.convertDateFormats ?? true,
      checkSensitivity: request.checkSensitivity ?? true,
    };

    const result = await localizationService.localizeMultiRegion(normalizedRequest);
    return res.json(result);
  } catch (error) {
    console.error('Error localizing content for multiple regions:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to localize content for multiple regions',
    });
  }
});

/**
 * POST /localization/sensitivity-check
 * Checks content for cultural sensitivity issues
 */
router.post('/sensitivity-check', (req: Request, res: Response) => {
  try {
    const request: SensitivityCheckRequest = req.body;

    if (!request.content || typeof request.content !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Content is required and must be a string',
      });
    }

    if (request.content.trim().length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Content cannot be empty',
      });
    }

    if (!request.targetRegions || !Array.isArray(request.targetRegions) || request.targetRegions.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Target regions array is required and must not be empty',
      });
    }

    for (const region of request.targetRegions) {
      if (!VALID_REGIONS.includes(region)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: `Invalid region: ${region}. Must be one of: ${VALID_REGIONS.join(', ')}`,
        });
      }
    }

    const result = localizationService.checkSensitivityOnly(request);
    return res.json(result);
  } catch (error) {
    console.error('Error checking sensitivity:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to check content sensitivity',
    });
  }
});

/**
 * GET /localization/regions
 * Gets all supported regions with their configurations
 */
router.get('/regions', (_req: Request, res: Response) => {
  try {
    const regions = localizationService.getAllRegions();
    return res.json(regions);
  } catch (error) {
    console.error('Error getting regions:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get regions',
    });
  }
});

/**
 * GET /localization/regions/:region
 * Gets configuration for a specific region
 */
router.get('/regions/:region', (req: Request, res: Response) => {
  try {
    const { region } = req.params;

    if (!region || !VALID_REGIONS.includes(region as TargetRegion)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Invalid region. Must be one of: ${VALID_REGIONS.join(', ')}`,
      });
    }

    const config = localizationService.getRegionConfig(region as TargetRegion);
    return res.json(config);
  } catch (error) {
    console.error('Error getting region config:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get region configuration',
    });
  }
});

export default router;
