/**
 * Content Repurposing Routes
 * API endpoints for content repurposing functionality
 * Requirements: 109
 */

import { Router, Request, Response } from 'express';
import { RepurposingService } from './repurposing.service';
import { RepurposingRequest, MultiPlatformRequest, SocialPlatform } from './types';

const router = Router();
const repurposingService = new RepurposingService();

/** Valid platforms */
const VALID_PLATFORMS: SocialPlatform[] = ['twitter', 'linkedin', 'facebook', 'medium', 'instagram', 'threads'];

/**
 * POST /repurposing/analyze
 * Analyzes content for repurposing
 */
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { content } = req.body;

    if (!content || typeof content !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Content is required and must be a string',
      });
    }

    if (content.trim().length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Content cannot be empty',
      });
    }

    const result = repurposingService.analyzeContent(content);
    return res.json(result);
  } catch (error) {
    console.error('Error analyzing content:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to analyze content',
    });
  }
});

/**
 * POST /repurposing/repurpose
 * Repurposes content for a specific platform
 */
router.post('/repurpose', async (req: Request, res: Response) => {
  try {
    const request: RepurposingRequest = req.body;

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

    if (!request.targetPlatform) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Target platform is required',
      });
    }

    if (!VALID_PLATFORMS.includes(request.targetPlatform)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Invalid target platform. Must be one of: ${VALID_PLATFORMS.join(', ')}`,
      });
    }

    // Set default for allowSplitting if not provided
    if (request.allowSplitting === undefined) {
      request.allowSplitting = true;
    }

    const result = await repurposingService.repurpose(request);
    return res.json(result);
  } catch (error) {
    console.error('Error repurposing content:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to repurpose content',
    });
  }
});

/**
 * POST /repurposing/multi-platform
 * Repurposes content for multiple platforms
 */
router.post('/multi-platform', async (req: Request, res: Response) => {
  try {
    const request: MultiPlatformRequest = req.body;

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

    if (!request.targetPlatforms || !Array.isArray(request.targetPlatforms) || request.targetPlatforms.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Target platforms array is required and must not be empty',
      });
    }

    for (const platform of request.targetPlatforms) {
      if (!VALID_PLATFORMS.includes(platform)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: `Invalid platform: ${platform}. Must be one of: ${VALID_PLATFORMS.join(', ')}`,
        });
      }
    }

    // Set default for allowSplitting if not provided
    if (request.allowSplitting === undefined) {
      request.allowSplitting = true;
    }

    const result = await repurposingService.repurposeMultiPlatform(request);
    return res.json(result);
  } catch (error) {
    console.error('Error repurposing content for multiple platforms:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to repurpose content for multiple platforms',
    });
  }
});

/**
 * GET /repurposing/platforms
 * Gets all supported platforms with their limits
 */
router.get('/platforms', (_req: Request, res: Response) => {
  try {
    const platformLimits = repurposingService.getAllPlatformLimits();
    // Transform to match frontend expected format
    const platforms = platformLimits.map(limit => ({
      id: limit.platform,
      name: limit.platform.charAt(0).toUpperCase() + limit.platform.slice(1),
      maxLength: limit.maxCharacters,
      features: [
        ...(limit.supportsMarkdown ? ['markdown'] : []),
        ...(limit.supportsLineBreaks ? ['line-breaks'] : []),
        ...(limit.supportsEmojis ? ['emojis'] : []),
        `max-hashtags-${limit.maxHashtags}`,
        `max-links-${limit.maxLinks}`,
      ],
    }));
    return res.json({ platforms });
  } catch (error) {
    console.error('Error getting platforms:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get platforms',
    });
  }
});

/**
 * GET /repurposing/platforms/:platform
 * Gets limits for a specific platform
 */
router.get('/platforms/:platform', (req: Request, res: Response) => {
  try {
    const { platform } = req.params;

    if (!platform || !VALID_PLATFORMS.includes(platform as SocialPlatform)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(', ')}`,
      });
    }

    const limits = repurposingService.getPlatformLimits(platform as SocialPlatform);
    return res.json(limits);
  } catch (error) {
    console.error('Error getting platform limits:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get platform limits',
    });
  }
});

/**
 * GET /repurposing/platforms/:platform/rules
 * Gets formatting rules for a specific platform
 */
router.get('/platforms/:platform/rules', (req: Request, res: Response) => {
  try {
    const { platform } = req.params;

    if (!platform || !VALID_PLATFORMS.includes(platform as SocialPlatform)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(', ')}`,
      });
    }

    const rules = repurposingService.getPlatformFormattingRules(platform as SocialPlatform);
    return res.json(rules);
  } catch (error) {
    console.error('Error getting platform rules:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get platform rules',
    });
  }
});

export default router;
