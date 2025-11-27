/**
 * Translation Service Routes
 * API endpoints for translation integration
 * Requirements: 77
 */

import { Router, Request, Response } from 'express';
import { TranslationService } from './translation.service';
import { SupportedLanguage } from './types';

const router = Router();
const translationService = new TranslationService();

/**
 * GET /translation/languages
 * Get all supported languages
 */
router.get('/languages', (_req: Request, res: Response): void => {
  try {
    const languages = translationService.getAllLanguages();
    res.json({
      success: true,
      data: languages,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve languages',
    });
  }
});

/**
 * GET /translation/languages/:code
 * Get information about a specific language
 */
router.get('/languages/:code', (req: Request, res: Response): void => {
  try {
    const { code } = req.params;
    
    if (!translationService.isLanguageSupported(code as string)) {
      res.status(400).json({
        success: false,
        error: `Language '${code}' is not supported`,
      });
      return;
    }

    const languageInfo = translationService.getLanguageInfo(code as SupportedLanguage);
    res.json({
      success: true,
      data: languageInfo,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve language information',
    });
  }
});

/**
 * POST /translation/detect
 * Detect the language of text
 */
router.post('/detect', (req: Request, res: Response): void => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Text is required',
      });
      return;
    }

    const validation = translationService.validateRequest(text);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        error: validation.error,
      });
      return;
    }

    const result = translationService.detectLanguage(text);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to detect language',
    });
  }
});

/**
 * POST /translation/translate
 * Translate text to target language
 * Requirement 77.1: Support translation to and from all supported languages
 */
router.post('/translate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { text, sourceLanguage, targetLanguage } = req.body;

    if (!text || typeof text !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Text is required',
      });
      return;
    }

    if (!targetLanguage) {
      res.status(400).json({
        success: false,
        error: 'Target language is required',
      });
      return;
    }

    if (!translationService.isLanguageSupported(targetLanguage)) {
      res.status(400).json({
        success: false,
        error: `Target language '${targetLanguage}' is not supported`,
      });
      return;
    }

    if (sourceLanguage && !translationService.isLanguageSupported(sourceLanguage)) {
      res.status(400).json({
        success: false,
        error: `Source language '${sourceLanguage}' is not supported`,
      });
      return;
    }

    const validation = translationService.validateRequest(text);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        error: validation.error,
      });
      return;
    }

    const result = await translationService.translate({
      text,
      ...(sourceLanguage ? { sourceLanguage: sourceLanguage as SupportedLanguage } : {}),
      targetLanguage: targetLanguage as SupportedLanguage,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to translate text',
    });
  }
});

/**
 * POST /translation/batch
 * Translate text to multiple languages simultaneously
 * Requirement 77.4: Support batch translation to multiple target languages
 */
router.post('/batch', async (req: Request, res: Response): Promise<void> => {
  try {
    const { text, sourceLanguage, targetLanguages } = req.body;

    if (!text || typeof text !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Text is required',
      });
      return;
    }

    if (!targetLanguages || !Array.isArray(targetLanguages) || targetLanguages.length === 0) {
      res.status(400).json({
        success: false,
        error: 'At least one target language is required',
      });
      return;
    }

    // Validate all target languages
    for (const lang of targetLanguages) {
      if (!translationService.isLanguageSupported(lang)) {
        res.status(400).json({
          success: false,
          error: `Target language '${lang}' is not supported`,
        });
        return;
      }
    }

    if (sourceLanguage && !translationService.isLanguageSupported(sourceLanguage)) {
      res.status(400).json({
        success: false,
        error: `Source language '${sourceLanguage}' is not supported`,
      });
      return;
    }

    const validation = translationService.validateRequest(text);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        error: validation.error,
      });
      return;
    }

    const result = await translationService.batchTranslate({
      text,
      ...(sourceLanguage ? { sourceLanguage: sourceLanguage as SupportedLanguage } : {}),
      targetLanguages: targetLanguages as SupportedLanguage[],
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to batch translate text',
    });
  }
});

/**
 * POST /translation/translate-humanize
 * Translate and humanize text
 * Requirement 77.2: Maintain humanization quality in target language
 * Requirement 77.3: Apply language-specific humanization to translated text
 */
router.post('/translate-humanize', async (req: Request, res: Response): Promise<void> => {
  try {
    const { text, sourceLanguage, targetLanguage, settings } = req.body;

    if (!text || typeof text !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Text is required',
      });
      return;
    }

    if (!targetLanguage) {
      res.status(400).json({
        success: false,
        error: 'Target language is required',
      });
      return;
    }

    if (!settings) {
      res.status(400).json({
        success: false,
        error: 'Humanization settings are required',
      });
      return;
    }

    if (!settings.level || settings.level < 1 || settings.level > 5) {
      res.status(400).json({
        success: false,
        error: 'Humanization level must be between 1 and 5',
      });
      return;
    }

    if (!translationService.isLanguageSupported(targetLanguage)) {
      res.status(400).json({
        success: false,
        error: `Target language '${targetLanguage}' is not supported`,
      });
      return;
    }

    if (sourceLanguage && !translationService.isLanguageSupported(sourceLanguage)) {
      res.status(400).json({
        success: false,
        error: `Source language '${sourceLanguage}' is not supported`,
      });
      return;
    }

    const validation = translationService.validateRequest(text);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        error: validation.error,
      });
      return;
    }

    const result = await translationService.translateAndHumanize({
      text,
      ...(sourceLanguage ? { sourceLanguage: sourceLanguage as SupportedLanguage } : {}),
      targetLanguage: targetLanguage as SupportedLanguage,
      settings,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to translate and humanize text',
    });
  }
});

/**
 * POST /translation/quality
 * Assess translation quality
 * Requirement 77.5: Provide detection scores for each translated version
 */
router.post('/quality', async (req: Request, res: Response): Promise<void> => {
  try {
    const { original, translated, sourceLanguage, targetLanguage } = req.body;

    if (!original || typeof original !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Original text is required',
      });
      return;
    }

    if (!translated || typeof translated !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Translated text is required',
      });
      return;
    }

    if (!sourceLanguage || !targetLanguage) {
      res.status(400).json({
        success: false,
        error: 'Source and target languages are required',
      });
      return;
    }

    if (!translationService.isLanguageSupported(sourceLanguage)) {
      res.status(400).json({
        success: false,
        error: `Source language '${sourceLanguage}' is not supported`,
      });
      return;
    }

    if (!translationService.isLanguageSupported(targetLanguage)) {
      res.status(400).json({
        success: false,
        error: `Target language '${targetLanguage}' is not supported`,
      });
      return;
    }

    const result = await translationService.assessTranslationQuality({
      original,
      translated,
      sourceLanguage: sourceLanguage as SupportedLanguage,
      targetLanguage: targetLanguage as SupportedLanguage,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to assess translation quality',
    });
  }
});

export default router;
