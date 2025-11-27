/**
 * Grammar Style Preferences Routes
 * API endpoints for grammar style configuration
 * Requirements: 103
 */

import { Router, Request, Response } from 'express';
import { grammarService } from './grammar.service';
import { logger } from '../utils/logger';
import {
  CreateGrammarStyleInput,
  UpdateGrammarStyleInput,
  RegionalVariant,
  GrammarStylePreferences,
} from './types';

const router = Router();

/**
 * GET /grammar/preferences/:userId
 * Get grammar style preferences for a user
 */
router.get('/preferences/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const preferences = await grammarService.getPreferences(userId);
    
    if (!preferences) {
      return res.status(404).json({ error: 'Preferences not found' });
    }

    return res.json(preferences);
  } catch (error) {
    logger.error('Error getting grammar preferences:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /grammar/preferences
 * Create grammar style preferences for a user
 */
router.post('/preferences', async (req: Request, res: Response) => {
  try {
    const input: CreateGrammarStyleInput = req.body;

    if (!input.userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Validate regional variant if provided
    if (input.regionalVariant && !isValidRegionalVariant(input.regionalVariant)) {
      return res.status(400).json({ 
        error: 'Invalid regional variant. Must be one of: US, UK, CA, AU' 
      });
    }

    // Validate quote style if provided
    if (input.quoteStyle && !['single', 'double'].includes(input.quoteStyle)) {
      return res.status(400).json({ 
        error: 'Invalid quote style. Must be "single" or "double"' 
      });
    }

    const preferences = await grammarService.createPreferences(input);
    return res.status(201).json(preferences);
  } catch (error) {
    logger.error('Error creating grammar preferences:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /grammar/preferences/:userId
 * Update grammar style preferences for a user
 */
router.put('/preferences/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const input: UpdateGrammarStyleInput = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Validate regional variant if provided
    if (input.regionalVariant && !isValidRegionalVariant(input.regionalVariant)) {
      return res.status(400).json({ 
        error: 'Invalid regional variant. Must be one of: US, UK, CA, AU' 
      });
    }

    // Validate quote style if provided
    if (input.quoteStyle && !['single', 'double'].includes(input.quoteStyle)) {
      return res.status(400).json({ 
        error: 'Invalid quote style. Must be "single" or "double"' 
      });
    }

    const preferences = await grammarService.updatePreferences(userId, input);
    
    if (!preferences) {
      return res.status(404).json({ error: 'Preferences not found' });
    }

    return res.json(preferences);
  } catch (error) {
    logger.error('Error updating grammar preferences:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /grammar/preferences/:userId
 * Delete grammar style preferences for a user
 */
router.delete('/preferences/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const deleted = await grammarService.deletePreferences(userId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Preferences not found' });
    }

    return res.status(204).send();
  } catch (error) {
    logger.error('Error deleting grammar preferences:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /grammar/apply
 * Apply grammar style preferences to text
 */
router.post('/apply', async (req: Request, res: Response) => {
  try {
    const { text, preferences } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (!preferences) {
      return res.status(400).json({ error: 'Preferences are required' });
    }

    const result = await grammarService.applyPreferences(text, preferences);
    return res.json(result);
  } catch (error) {
    logger.error('Error applying grammar preferences:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /grammar/analyze
 * Analyze text for grammar style patterns
 */
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const result = await grammarService.analyzeText(text);
    return res.json(result);
  } catch (error) {
    logger.error('Error analyzing text:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /grammar/variants
 * Get available regional variants
 */
router.get('/variants', (_req: Request, res: Response) => {
  try {
    const variants = grammarService.getAvailableVariants();
    return res.json({ variants });
  } catch (error) {
    logger.error('Error getting variants:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /grammar/variants/:variant/defaults
 * Get default preferences for a regional variant
 */
router.get('/variants/:variant/defaults', (req: Request, res: Response) => {
  try {
    const { variant } = req.params;

    if (!variant || !isValidRegionalVariant(variant as RegionalVariant)) {
      return res.status(400).json({ 
        error: 'Invalid regional variant. Must be one of: US, UK, CA, AU' 
      });
    }

    const defaults = grammarService.getDefaultPreferences(variant as RegionalVariant);
    return res.json(defaults);
  } catch (error) {
    logger.error('Error getting variant defaults:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /grammar/format/date
 * Format a date according to preferences
 */
router.post('/format/date', (req: Request, res: Response) => {
  try {
    const { date, format } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    if (!format) {
      return res.status(400).json({ error: 'Format is required' });
    }

    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ error: 'Invalid date' });
    }

    const formatted = grammarService.formatDate(dateObj, format);
    return res.json({ formatted });
  } catch (error) {
    logger.error('Error formatting date:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /grammar/format/number
 * Format a number according to preferences
 */
router.post('/format/number', (req: Request, res: Response) => {
  try {
    const { value, format } = req.body;

    if (value === undefined || value === null) {
      return res.status(400).json({ error: 'Value is required' });
    }

    if (!format) {
      return res.status(400).json({ error: 'Format is required' });
    }

    const formatted = grammarService.formatNumber(value, format);
    return res.json({ formatted });
  } catch (error) {
    logger.error('Error formatting number:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /grammar/format/currency
 * Format a currency value according to preferences
 */
router.post('/format/currency', (req: Request, res: Response) => {
  try {
    const { value, format } = req.body;

    if (value === undefined || value === null) {
      return res.status(400).json({ error: 'Value is required' });
    }

    if (!format) {
      return res.status(400).json({ error: 'Format is required' });
    }

    const formatted = grammarService.formatCurrency(value, format);
    return res.json({ formatted });
  } catch (error) {
    logger.error('Error formatting currency:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Helper function to validate regional variant
 */
function isValidRegionalVariant(variant: string): variant is RegionalVariant {
  return ['US', 'UK', 'CA', 'AU'].includes(variant);
}

export { router as grammarRoutes };
