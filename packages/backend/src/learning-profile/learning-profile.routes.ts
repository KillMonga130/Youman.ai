/**
 * Learning Profile Routes
 * API endpoints for user learning profile management
 * Requirements: 28
 */

import { Router, Request, Response, NextFunction } from 'express';
import { learningProfileService } from './learning-profile.service';
import { logger } from '../utils/logger';
import { RecordFeedbackOptions, UpdatePreferencesOptions } from './types';

const router = Router();

/**
 * POST /api/learning-profile/feedback
 * Records feedback for a transformation
 * Requirement 28.1: Record preferences when accepting/rejecting transformations
 */
router.post('/feedback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, transformationId, feedback, strategyUsed, levelUsed, contentType } = req.body;

    if (!userId || !transformationId || !feedback) {
      res.status(400).json({
        error: 'Missing required fields: userId, transformationId, feedback',
      });
      return;
    }

    if (typeof feedback.accepted !== 'boolean') {
      res.status(400).json({
        error: 'feedback.accepted must be a boolean',
      });
      return;
    }

    const options: RecordFeedbackOptions = {
      userId,
      transformationId,
      feedback,
      strategyUsed: strategyUsed || 'auto',
      levelUsed: levelUsed || 3,
    };

    if (contentType) {
      options.contentType = contentType;
    }

    await learningProfileService.recordFeedback(options);

    res.status(200).json({
      success: true,
      message: 'Feedback recorded successfully',
    });
  } catch (error) {
    logger.error('Error recording feedback:', error);
    next(error);
  }
});

/**
 * GET /api/learning-profile/:userId
 * Gets a user's learning profile
 */
router.get('/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.userId;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    const profile = await learningProfileService.getProfile(userId);

    if (!profile) {
      res.status(404).json({
        error: 'Profile not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      profile,
    });
  } catch (error) {
    logger.error('Error getting profile:', error);
    next(error);
  }
});

/**
 * PUT /api/learning-profile/:userId/preferences
 * Updates user preferences
 * Requirement 28.2: Apply learned preferences automatically
 */
router.put('/:userId/preferences', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.userId;
    const { preferences } = req.body;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    if (!preferences || typeof preferences !== 'object') {
      res.status(400).json({
        error: 'preferences object is required',
      });
      return;
    }

    const options: UpdatePreferencesOptions = {
      userId,
      preferences,
    };

    await learningProfileService.updateProfile(options);

    res.status(200).json({
      success: true,
      message: 'Preferences updated successfully',
    });
  } catch (error) {
    logger.error('Error updating preferences:', error);
    next(error);
  }
});

/**
 * GET /api/learning-profile/:userId/recommendations
 * Gets personalized recommendations
 * Requirement 28.3: Suggest personalized transformation strategies
 */
router.get('/:userId/recommendations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.userId;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    const recommendations = await learningProfileService.getRecommendations(userId);

    res.status(200).json({
      success: true,
      recommendations,
    });
  } catch (error) {
    logger.error('Error getting recommendations:', error);
    next(error);
  }
});

/**
 * GET /api/learning-profile/:userId/stats
 * Gets profile statistics
 */
router.get('/:userId/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.userId;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    const stats = await learningProfileService.getProfileStats(userId);

    res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    logger.error('Error getting profile stats:', error);
    next(error);
  }
});

/**
 * GET /api/learning-profile/:userId/preferences
 * Gets learned preferences for automatic application
 * Requirement 28.2: Apply learned preferences automatically
 */
router.get('/:userId/preferences', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.userId;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    const preferences = await learningProfileService.getLearnedPreferences(userId);

    res.status(200).json({
      success: true,
      preferences,
    });
  } catch (error) {
    logger.error('Error getting learned preferences:', error);
    next(error);
  }
});

/**
 * GET /api/learning-profile/:userId/weights
 * Gets transformation weights for a user
 * Requirement 28.4: Adjust transformation weights based on feedback
 */
router.get('/:userId/weights', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.userId;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    const weights = await learningProfileService.getTransformationWeights(userId);

    res.status(200).json({
      success: true,
      weights,
    });
  } catch (error) {
    logger.error('Error getting transformation weights:', error);
    next(error);
  }
});

/**
 * DELETE /api/learning-profile/:userId
 * Resets a user's learning profile
 * Requirement 28.5: Clear learning profile and revert to default behavior
 */
router.delete('/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.userId;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    await learningProfileService.resetProfile(userId);

    res.status(200).json({
      success: true,
      message: 'Profile reset successfully',
    });
  } catch (error) {
    logger.error('Error resetting profile:', error);
    next(error);
  }
});

export default router;
