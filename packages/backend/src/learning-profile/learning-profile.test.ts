/**
 * Learning Profile Service Tests
 * Requirements: 28
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LearningProfileService } from './learning-profile.service';
import { TransformStrategy, HumanizationLevel } from '../transform/types';

describe('LearningProfileService', () => {
  let service: LearningProfileService;

  beforeEach(() => {
    service = new LearningProfileService({
      minFeedbackForMaturity: 5, // Lower threshold for testing
      maxFeedbackHistory: 50,
      minRecommendationConfidence: 50,
      weightLearningRate: 0.1,
    });
  });

  describe('recordFeedback', () => {
    it('should create a new profile when recording feedback for new user', async () => {
      const userId = 'user-1';
      
      await service.recordFeedback({
        userId,
        transformationId: 'trans-1',
        feedback: { accepted: true },
        strategyUsed: 'casual',
        levelUsed: 3,
      });

      const profile = await service.getProfile(userId);
      expect(profile).not.toBeNull();
      expect(profile!.userId).toBe(userId);
      expect(profile!.totalFeedbackCount).toBe(1);
      expect(profile!.positiveFeedbackCount).toBe(1);
    });

    it('should increment feedback counts correctly', async () => {
      const userId = 'user-2';
      
      // Record positive feedback
      await service.recordFeedback({
        userId,
        transformationId: 'trans-1',
        feedback: { accepted: true },
        strategyUsed: 'professional',
        levelUsed: 2,
      });

      // Record negative feedback
      await service.recordFeedback({
        userId,
        transformationId: 'trans-2',
        feedback: { accepted: false },
        strategyUsed: 'professional',
        levelUsed: 2,
      });

      const profile = await service.getProfile(userId);
      expect(profile!.totalFeedbackCount).toBe(2);
      expect(profile!.positiveFeedbackCount).toBe(1);
    });

    it('should update strategy stats correctly', async () => {
      const userId = 'user-3';
      
      await service.recordFeedback({
        userId,
        transformationId: 'trans-1',
        feedback: { accepted: true },
        strategyUsed: 'academic',
        levelUsed: 2,
      });

      const profile = await service.getProfile(userId);
      expect(profile!.strategyStats.academic.used).toBe(1);
      expect(profile!.strategyStats.academic.accepted).toBe(1);
    });

    it('should update level stats correctly', async () => {
      const userId = 'user-4';
      
      await service.recordFeedback({
        userId,
        transformationId: 'trans-1',
        feedback: { accepted: true },
        strategyUsed: 'casual',
        levelUsed: 4,
      });

      const profile = await service.getProfile(userId);
      expect(profile!.levelStats[4].used).toBe(1);
      expect(profile!.levelStats[4].accepted).toBe(1);
    });

    it('should mark profile as matured after sufficient feedback', async () => {
      const userId = 'user-5';
      
      // Record 5 feedbacks (minFeedbackForMaturity)
      for (let i = 0; i < 5; i++) {
        await service.recordFeedback({
          userId,
          transformationId: `trans-${i}`,
          feedback: { accepted: true },
          strategyUsed: 'casual',
          levelUsed: 3,
        });
      }

      const profile = await service.getProfile(userId);
      expect(profile!.isMatured).toBe(true);
    });

    it('should store feedback with rating', async () => {
      const userId = 'user-6';
      
      await service.recordFeedback({
        userId,
        transformationId: 'trans-1',
        feedback: { accepted: true, rating: 5, comments: 'Great transformation!' },
        strategyUsed: 'professional',
        levelUsed: 3,
      });

      const profile = await service.getProfile(userId);
      expect(profile!.feedbackHistory[0].feedback.rating).toBe(5);
      expect(profile!.feedbackHistory[0].feedback.comments).toBe('Great transformation!');
    });
  });

  describe('updateProfile', () => {
    it('should update user preferences', async () => {
      const userId = 'user-7';
      
      await service.updateProfile({
        userId,
        preferences: {
          preferredStrategy: 'academic',
          preferredLevel: 2,
        },
      });

      const profile = await service.getProfile(userId);
      expect(profile!.preferences.preferredStrategy).toBe('academic');
      expect(profile!.preferences.preferredLevel).toBe(2);
    });

    it('should merge preferences without overwriting existing ones', async () => {
      const userId = 'user-8';
      
      await service.updateProfile({
        userId,
        preferences: {
          preferredStrategy: 'casual',
        },
      });

      await service.updateProfile({
        userId,
        preferences: {
          preferredLevel: 4,
        },
      });

      const profile = await service.getProfile(userId);
      expect(profile!.preferences.preferredStrategy).toBe('casual');
      expect(profile!.preferences.preferredLevel).toBe(4);
    });
  });

  describe('getRecommendations', () => {
    it('should return maturity message for immature profiles', async () => {
      const userId = 'user-9';
      
      // Record only 2 feedbacks (below threshold)
      await service.recordFeedback({
        userId,
        transformationId: 'trans-1',
        feedback: { accepted: true },
        strategyUsed: 'casual',
        levelUsed: 3,
      });

      const recommendations = await service.getRecommendations(userId);
      expect(recommendations.length).toBe(1);
      expect(recommendations[0].type).toBe('general');
      expect(recommendations[0].title).toContain('Keep providing feedback');
    });

    it('should return strategy recommendation for matured profiles', async () => {
      const userId = 'user-10';
      
      // Record enough feedback to mature the profile
      for (let i = 0; i < 6; i++) {
        await service.recordFeedback({
          userId,
          transformationId: `trans-${i}`,
          feedback: { accepted: true },
          strategyUsed: 'professional',
          levelUsed: 3,
        });
      }

      const recommendations = await service.getRecommendations(userId);
      const strategyRec = recommendations.find(r => r.type === 'strategy');
      expect(strategyRec).toBeDefined();
      expect(strategyRec!.suggestedValue).toBe('professional');
    });
  });

  describe('resetProfile', () => {
    it('should reset profile to default state', async () => {
      const userId = 'user-11';
      
      // Build up a profile
      for (let i = 0; i < 5; i++) {
        await service.recordFeedback({
          userId,
          transformationId: `trans-${i}`,
          feedback: { accepted: true },
          strategyUsed: 'casual',
          levelUsed: 3,
        });
      }

      // Reset the profile
      await service.resetProfile(userId);

      const profile = await service.getProfile(userId);
      expect(profile!.totalFeedbackCount).toBe(0);
      expect(profile!.positiveFeedbackCount).toBe(0);
      expect(profile!.feedbackHistory.length).toBe(0);
      expect(profile!.isMatured).toBe(false);
    });

    it('should preserve profile ID and creation date after reset', async () => {
      const userId = 'user-12';
      
      await service.recordFeedback({
        userId,
        transformationId: 'trans-1',
        feedback: { accepted: true },
        strategyUsed: 'casual',
        levelUsed: 3,
      });

      const originalProfile = await service.getProfile(userId);
      const originalId = originalProfile!.id;
      const originalCreatedAt = originalProfile!.createdAt;

      await service.resetProfile(userId);

      const resetProfile = await service.getProfile(userId);
      expect(resetProfile!.id).toBe(originalId);
      expect(resetProfile!.createdAt).toEqual(originalCreatedAt);
    });
  });

  describe('getProfileStats', () => {
    it('should calculate acceptance rate correctly', async () => {
      const userId = 'user-13';
      
      // 3 accepted, 2 rejected = 60% acceptance rate
      for (let i = 0; i < 3; i++) {
        await service.recordFeedback({
          userId,
          transformationId: `trans-${i}`,
          feedback: { accepted: true },
          strategyUsed: 'casual',
          levelUsed: 3,
        });
      }
      for (let i = 3; i < 5; i++) {
        await service.recordFeedback({
          userId,
          transformationId: `trans-${i}`,
          feedback: { accepted: false },
          strategyUsed: 'casual',
          levelUsed: 3,
        });
      }

      const stats = await service.getProfileStats(userId);
      expect(stats.acceptanceRate).toBe(60);
      expect(stats.totalTransformations).toBe(5);
    });

    it('should calculate average rating correctly', async () => {
      const userId = 'user-14';
      
      await service.recordFeedback({
        userId,
        transformationId: 'trans-1',
        feedback: { accepted: true, rating: 5 },
        strategyUsed: 'casual',
        levelUsed: 3,
      });
      await service.recordFeedback({
        userId,
        transformationId: 'trans-2',
        feedback: { accepted: true, rating: 3 },
        strategyUsed: 'casual',
        levelUsed: 3,
      });

      const stats = await service.getProfileStats(userId);
      expect(stats.averageRating).toBe(4);
    });

    it('should identify most used strategy', async () => {
      const userId = 'user-15';
      
      // Use professional 3 times, casual 1 time
      for (let i = 0; i < 3; i++) {
        await service.recordFeedback({
          userId,
          transformationId: `trans-${i}`,
          feedback: { accepted: true },
          strategyUsed: 'professional',
          levelUsed: 3,
        });
      }
      await service.recordFeedback({
        userId,
        transformationId: 'trans-3',
        feedback: { accepted: true },
        strategyUsed: 'casual',
        levelUsed: 3,
      });

      const stats = await service.getProfileStats(userId);
      expect(stats.mostUsedStrategy).toBe('professional');
    });
  });

  describe('getLearnedPreferences', () => {
    it('should return explicit preferences', async () => {
      const userId = 'user-16';
      
      await service.updateProfile({
        userId,
        preferences: {
          preferredStrategy: 'academic',
          preferredLevel: 2,
        },
      });

      const preferences = await service.getLearnedPreferences(userId);
      expect(preferences.preferredStrategy).toBe('academic');
      expect(preferences.preferredLevel).toBe(2);
    });

    it('should add learned preferences for matured profiles', async () => {
      const userId = 'user-17';
      
      // Build matured profile with professional strategy
      for (let i = 0; i < 6; i++) {
        await service.recordFeedback({
          userId,
          transformationId: `trans-${i}`,
          feedback: { accepted: true },
          strategyUsed: 'professional',
          levelUsed: 4,
        });
      }

      const preferences = await service.getLearnedPreferences(userId);
      expect(preferences.preferredStrategy).toBe('professional');
      expect(preferences.preferredLevel).toBe(4);
    });
  });

  describe('getTransformationWeights', () => {
    it('should return default weights for new profile', async () => {
      const userId = 'user-18';
      
      const weights = await service.getTransformationWeights(userId);
      expect(weights.sentenceRestructuring).toBe(0.5);
      expect(weights.vocabularyReplacement).toBe(0.5);
      expect(weights.toneAdjustment).toBe(0.5);
    });

    it('should adjust weights based on positive feedback', async () => {
      const userId = 'user-19';
      
      // Get initial weights
      const initialWeights = await service.getTransformationWeights(userId);
      
      // Record positive feedback
      await service.recordFeedback({
        userId,
        transformationId: 'trans-1',
        feedback: { accepted: true },
        strategyUsed: 'casual',
        levelUsed: 3,
      });

      const adjustedWeights = await service.getTransformationWeights(userId);
      
      // Weights should increase slightly with positive feedback
      expect(adjustedWeights.sentenceRestructuring).toBeGreaterThan(initialWeights.sentenceRestructuring);
    });

    it('should adjust weights based on negative feedback', async () => {
      const userId = 'user-20';
      
      // Get initial weights
      const initialWeights = await service.getTransformationWeights(userId);
      
      // Record negative feedback
      await service.recordFeedback({
        userId,
        transformationId: 'trans-1',
        feedback: { accepted: false },
        strategyUsed: 'casual',
        levelUsed: 3,
      });

      const adjustedWeights = await service.getTransformationWeights(userId);
      
      // Weights should decrease slightly with negative feedback
      expect(adjustedWeights.sentenceRestructuring).toBeLessThan(initialWeights.sentenceRestructuring);
    });
  });
});
