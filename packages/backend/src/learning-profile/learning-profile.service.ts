/**
 * Learning Profile Service
 * Manages user-specific learning and adaptation
 * Requirements: 28
 */

import crypto from 'crypto';
import { logger } from '../utils/logger';
import { TransformStrategy, HumanizationLevel } from '../transform/types';
import {
  LearningProfile,
  Feedback,
  UserPreferences,
  TransformationWeights,
  Recommendation,
  FeedbackRecord,
  RecordFeedbackOptions,
  UpdatePreferencesOptions,
  LearningProfileServiceConfig,
  ProfileStats,
} from './types';

/** Default configuration */
const DEFAULT_CONFIG: LearningProfileServiceConfig = {
  minFeedbackForMaturity: 10,
  maxFeedbackHistory: 100,
  minRecommendationConfidence: 60,
  weightLearningRate: 0.1,
};

/** Default transformation weights */
const DEFAULT_WEIGHTS: TransformationWeights = {
  sentenceRestructuring: 0.5,
  vocabularyReplacement: 0.5,
  toneAdjustment: 0.5,
  naturalImperfections: 0.5,
  sentenceLengthVariation: 0.5,
};

/** Default user preferences */
const DEFAULT_PREFERENCES: UserPreferences = {};

/**
 * Learning Profile Service class
 * Handles feedback recording, preference learning, and recommendations
 */
export class LearningProfileService {
  private config: LearningProfileServiceConfig;
  private profiles: Map<string, LearningProfile>;

  constructor(serviceConfig?: Partial<LearningProfileServiceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...serviceConfig };
    this.profiles = new Map();
  }

  /**
   * Records feedback for a transformation
   * Requirement 28.1: Record preferences when accepting/rejecting transformations
   * @param options - Feedback recording options
   */
  async recordFeedback(options: RecordFeedbackOptions): Promise<void> {
    const profile = await this.getOrCreateProfile(options.userId);

    const feedbackRecord: FeedbackRecord = {
      id: this.generateId('fb'),
      transformationId: options.transformationId,
      feedback: options.feedback,
      strategyUsed: options.strategyUsed,
      levelUsed: options.levelUsed,
      recordedAt: new Date(),
    };

    if (options.contentType) {
      feedbackRecord.contentType = options.contentType;
    }

    // Add to feedback history
    profile.feedbackHistory.push(feedbackRecord);

    // Trim history if needed
    if (profile.feedbackHistory.length > this.config.maxFeedbackHistory) {
      profile.feedbackHistory = profile.feedbackHistory.slice(-this.config.maxFeedbackHistory);
    }

    // Update statistics
    profile.totalFeedbackCount++;
    if (options.feedback.accepted) {
      profile.positiveFeedbackCount++;
    }

    // Update strategy stats
    const strategyStats = profile.strategyStats[options.strategyUsed];
    strategyStats.used++;
    if (options.feedback.accepted) {
      strategyStats.accepted++;
    }

    // Update level stats
    const levelStats = profile.levelStats[options.levelUsed];
    levelStats.used++;
    if (options.feedback.accepted) {
      levelStats.accepted++;
    }

    // Adjust weights based on feedback
    this.adjustWeights(profile, options.feedback);

    // Check profile maturity
    profile.isMatured = profile.totalFeedbackCount >= this.config.minFeedbackForMaturity;

    profile.updatedAt = new Date();

    logger.info(`Recorded feedback for user ${options.userId}`, {
      transformationId: options.transformationId,
      accepted: options.feedback.accepted,
      totalFeedback: profile.totalFeedbackCount,
    });
  }

  /**
   * Updates user preferences
   * Requirement 28.2: Apply learned preferences automatically
   * @param options - Update options
   */
  async updateProfile(options: UpdatePreferencesOptions): Promise<void> {
    const profile = await this.getOrCreateProfile(options.userId);

    // Merge preferences
    profile.preferences = {
      ...profile.preferences,
      ...options.preferences,
    };

    profile.updatedAt = new Date();

    logger.info(`Updated preferences for user ${options.userId}`);
  }

  /**
   * Gets personalized recommendations
   * Requirement 28.3: Suggest personalized transformation strategies
   * @param userId - User identifier
   * @returns Array of recommendations
   */
  async getRecommendations(userId: string): Promise<Recommendation[]> {
    const profile = await this.getOrCreateProfile(userId);
    const recommendations: Recommendation[] = [];

    // Only provide recommendations if profile is matured
    if (!profile.isMatured) {
      recommendations.push({
        id: this.generateId('rec'),
        type: 'general',
        title: 'Keep providing feedback',
        description: `Provide ${this.config.minFeedbackForMaturity - profile.totalFeedbackCount} more feedback responses to unlock personalized recommendations.`,
        confidence: 100,
        suggestedValue: this.config.minFeedbackForMaturity - profile.totalFeedbackCount,
        reason: 'Insufficient data for personalized recommendations',
        createdAt: new Date(),
      });
      return recommendations;
    }

    // Strategy recommendation
    const strategyRec = this.generateStrategyRecommendation(profile);
    if (strategyRec && strategyRec.confidence >= this.config.minRecommendationConfidence) {
      recommendations.push(strategyRec);
    }

    // Level recommendation
    const levelRec = this.generateLevelRecommendation(profile);
    if (levelRec && levelRec.confidence >= this.config.minRecommendationConfidence) {
      recommendations.push(levelRec);
    }

    // Tone recommendation
    const toneRec = this.generateToneRecommendation(profile);
    if (toneRec && toneRec.confidence >= this.config.minRecommendationConfidence) {
      recommendations.push(toneRec);
    }

    // Vocabulary recommendation
    const vocabRec = this.generateVocabularyRecommendation(profile);
    if (vocabRec && vocabRec.confidence >= this.config.minRecommendationConfidence) {
      recommendations.push(vocabRec);
    }

    return recommendations;
  }

  /**
   * Resets a user's learning profile
   * Requirement 28.5: Clear learning profile and revert to default behavior
   * @param userId - User identifier
   */
  async resetProfile(userId: string): Promise<void> {
    const existingProfile = this.profiles.get(userId);
    
    if (existingProfile) {
      // Create fresh profile
      const newProfile = this.createEmptyProfile(userId);
      newProfile.id = existingProfile.id; // Keep same ID
      newProfile.createdAt = existingProfile.createdAt; // Keep original creation date
      this.profiles.set(userId, newProfile);

      logger.info(`Reset learning profile for user ${userId}`);
    }
  }

  /**
   * Gets a user's learning profile
   * @param userId - User identifier
   * @returns Learning profile or null
   */
  async getProfile(userId: string): Promise<LearningProfile | null> {
    return this.profiles.get(userId) || null;
  }

  /**
   * Gets profile statistics
   * @param userId - User identifier
   * @returns Profile statistics
   */
  async getProfileStats(userId: string): Promise<ProfileStats> {
    const profile = await this.getOrCreateProfile(userId);

    const acceptanceRate = profile.totalFeedbackCount > 0
      ? (profile.positiveFeedbackCount / profile.totalFeedbackCount) * 100
      : 0;

    // Calculate average rating
    const ratingsWithValues = profile.feedbackHistory
      .filter(f => f.feedback.rating !== undefined)
      .map(f => f.feedback.rating!);
    const averageRating = ratingsWithValues.length > 0
      ? ratingsWithValues.reduce((a, b) => a + b, 0) / ratingsWithValues.length
      : 0;

    // Find most used strategy
    const mostUsedStrategy = this.findMostUsedStrategy(profile);

    // Find most successful strategy
    const mostSuccessfulStrategy = this.findMostSuccessfulStrategy(profile);

    // Find preferred level
    const preferredLevel = this.findPreferredLevel(profile);

    // Calculate profile age
    const profileAgeDays = Math.floor(
      (Date.now() - profile.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      totalTransformations: profile.totalFeedbackCount,
      acceptanceRate: Math.round(acceptanceRate * 100) / 100,
      averageRating: Math.round(averageRating * 100) / 100,
      mostUsedStrategy,
      mostSuccessfulStrategy,
      preferredLevel,
      isMatured: profile.isMatured,
      profileAgeDays,
    };
  }

  /**
   * Gets learned preferences for automatic application
   * Requirement 28.2: Apply learned preferences automatically
   * @param userId - User identifier
   * @returns User preferences
   */
  async getLearnedPreferences(userId: string): Promise<UserPreferences> {
    const profile = await this.getOrCreateProfile(userId);

    // Start with explicit preferences
    const preferences: UserPreferences = { ...profile.preferences };

    // If profile is matured, add learned preferences
    if (profile.isMatured) {
      // Set preferred strategy if not explicitly set
      if (!preferences.preferredStrategy) {
        preferences.preferredStrategy = this.findMostSuccessfulStrategy(profile);
      }

      // Set preferred level if not explicitly set
      if (!preferences.preferredLevel) {
        preferences.preferredLevel = this.findPreferredLevel(profile);
      }
    }

    return preferences;
  }

  /**
   * Gets transformation weights for a user
   * @param userId - User identifier
   * @returns Transformation weights
   */
  async getTransformationWeights(userId: string): Promise<TransformationWeights> {
    const profile = await this.getOrCreateProfile(userId);
    return { ...profile.weights };
  }

  // ============ Private Helper Methods ============

  /**
   * Gets or creates a learning profile for a user
   */
  private async getOrCreateProfile(userId: string): Promise<LearningProfile> {
    let profile = this.profiles.get(userId);
    
    if (!profile) {
      profile = this.createEmptyProfile(userId);
      this.profiles.set(userId, profile);
      logger.info(`Created new learning profile for user ${userId}`);
    }

    return profile;
  }

  /**
   * Creates an empty learning profile
   */
  private createEmptyProfile(userId: string): LearningProfile {
    const now = new Date();
    
    return {
      id: this.generateId('lp'),
      userId,
      preferences: { ...DEFAULT_PREFERENCES },
      weights: { ...DEFAULT_WEIGHTS },
      feedbackHistory: [],
      totalFeedbackCount: 0,
      positiveFeedbackCount: 0,
      strategyStats: {
        casual: { used: 0, accepted: 0 },
        professional: { used: 0, accepted: 0 },
        academic: { used: 0, accepted: 0 },
        auto: { used: 0, accepted: 0 },
      },
      levelStats: {
        1: { used: 0, accepted: 0 },
        2: { used: 0, accepted: 0 },
        3: { used: 0, accepted: 0 },
        4: { used: 0, accepted: 0 },
        5: { used: 0, accepted: 0 },
      },
      isMatured: false,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Adjusts transformation weights based on feedback
   * Requirement 28.4: Adjust transformation weights based on feedback
   */
  private adjustWeights(profile: LearningProfile, feedback: Feedback): void {
    const adjustment = feedback.accepted 
      ? this.config.weightLearningRate 
      : -this.config.weightLearningRate;

    // Adjust all weights slightly based on overall feedback
    // In a real implementation, this would be more sophisticated
    // based on specific changes that were accepted/rejected
    for (const key of Object.keys(profile.weights) as (keyof TransformationWeights)[]) {
      profile.weights[key] = Math.max(0.1, Math.min(1.0, profile.weights[key] + adjustment * 0.5));
    }

    // If specific changes are provided, adjust more precisely
    if (feedback.specificChanges && feedback.specificChanges.length > 0) {
      const acceptedCount = feedback.specificChanges.filter(c => c.accepted).length;
      const rejectedCount = feedback.specificChanges.length - acceptedCount;
      
      // Adjust vocabulary replacement weight based on specific change acceptance
      const vocabAdjustment = ((acceptedCount - rejectedCount) / feedback.specificChanges.length) 
        * this.config.weightLearningRate;
      profile.weights.vocabularyReplacement = Math.max(0.1, 
        Math.min(1.0, profile.weights.vocabularyReplacement + vocabAdjustment));
    }
  }

  /**
   * Generates strategy recommendation
   */
  private generateStrategyRecommendation(profile: LearningProfile): Recommendation | null {
    const bestStrategy = this.findMostSuccessfulStrategy(profile);
    const stats = profile.strategyStats[bestStrategy];
    
    if (stats.used < 3) return null;

    const successRate = (stats.accepted / stats.used) * 100;
    const confidence = Math.min(100, successRate * (stats.used / 10));

    return {
      id: this.generateId('rec'),
      type: 'strategy',
      title: `Use ${bestStrategy} strategy`,
      description: `Based on your feedback, the ${bestStrategy} strategy has a ${Math.round(successRate)}% acceptance rate.`,
      confidence: Math.round(confidence),
      suggestedValue: bestStrategy,
      reason: `${stats.accepted} out of ${stats.used} transformations accepted`,
      createdAt: new Date(),
    };
  }

  /**
   * Generates level recommendation
   */
  private generateLevelRecommendation(profile: LearningProfile): Recommendation | null {
    const bestLevel = this.findPreferredLevel(profile);
    const stats = profile.levelStats[bestLevel];
    
    if (stats.used < 3) return null;

    const successRate = (stats.accepted / stats.used) * 100;
    const confidence = Math.min(100, successRate * (stats.used / 10));

    return {
      id: this.generateId('rec'),
      type: 'level',
      title: `Use humanization level ${bestLevel}`,
      description: `Level ${bestLevel} has shown the best results for your content with a ${Math.round(successRate)}% acceptance rate.`,
      confidence: Math.round(confidence),
      suggestedValue: bestLevel,
      reason: `${stats.accepted} out of ${stats.used} transformations accepted`,
      createdAt: new Date(),
    };
  }

  /**
   * Generates tone recommendation
   */
  private generateToneRecommendation(profile: LearningProfile): Recommendation | null {
    // Analyze feedback to determine tone preferences
    const recentFeedback = profile.feedbackHistory.slice(-20);
    if (recentFeedback.length < 5) return null;

    const acceptedCasual = recentFeedback.filter(
      f => f.feedback.accepted && f.strategyUsed === 'casual'
    ).length;
    const acceptedProfessional = recentFeedback.filter(
      f => f.feedback.accepted && f.strategyUsed === 'professional'
    ).length;

    let suggestedFormality: number;
    let description: string;

    if (acceptedCasual > acceptedProfessional * 1.5) {
      suggestedFormality = 30;
      description = 'Your feedback suggests you prefer a more casual, conversational tone.';
    } else if (acceptedProfessional > acceptedCasual * 1.5) {
      suggestedFormality = 70;
      description = 'Your feedback suggests you prefer a more formal, professional tone.';
    } else {
      return null; // No clear preference
    }

    return {
      id: this.generateId('rec'),
      type: 'tone',
      title: 'Adjust tone preferences',
      description,
      confidence: 65,
      suggestedValue: { formality: suggestedFormality },
      reason: `Based on ${recentFeedback.length} recent transformations`,
      createdAt: new Date(),
    };
  }

  /**
   * Generates vocabulary recommendation
   */
  private generateVocabularyRecommendation(profile: LearningProfile): Recommendation | null {
    // This would analyze specific changes in feedback to identify vocabulary patterns
    // For now, return a general recommendation based on weights
    
    if (profile.weights.vocabularyReplacement < 0.3) {
      return {
        id: this.generateId('rec'),
        type: 'vocabulary',
        title: 'Reduce vocabulary changes',
        description: 'Your feedback suggests you prefer to keep more of the original vocabulary.',
        confidence: 70,
        suggestedValue: { reduceVocabularyChanges: true },
        reason: 'Low acceptance rate for vocabulary replacements',
        createdAt: new Date(),
      };
    } else if (profile.weights.vocabularyReplacement > 0.7) {
      return {
        id: this.generateId('rec'),
        type: 'vocabulary',
        title: 'More vocabulary variation',
        description: 'Your feedback suggests you appreciate varied vocabulary in transformations.',
        confidence: 70,
        suggestedValue: { increaseVocabularyVariation: true },
        reason: 'High acceptance rate for vocabulary replacements',
        createdAt: new Date(),
      };
    }

    return null;
  }

  /**
   * Finds the most used strategy
   */
  private findMostUsedStrategy(profile: LearningProfile): TransformStrategy {
    let maxUsed = 0;
    let mostUsed: TransformStrategy = 'auto';

    for (const [strategy, stats] of Object.entries(profile.strategyStats)) {
      if (stats.used > maxUsed) {
        maxUsed = stats.used;
        mostUsed = strategy as TransformStrategy;
      }
    }

    return mostUsed;
  }

  /**
   * Finds the most successful strategy
   */
  private findMostSuccessfulStrategy(profile: LearningProfile): TransformStrategy {
    let bestRate = 0;
    let bestStrategy: TransformStrategy = 'auto';

    for (const [strategy, stats] of Object.entries(profile.strategyStats)) {
      if (stats.used >= 3) {
        const rate = stats.accepted / stats.used;
        if (rate > bestRate) {
          bestRate = rate;
          bestStrategy = strategy as TransformStrategy;
        }
      }
    }

    return bestStrategy;
  }

  /**
   * Finds the preferred humanization level
   */
  private findPreferredLevel(profile: LearningProfile): HumanizationLevel {
    let bestRate = 0;
    let bestLevel: HumanizationLevel = 3;

    for (const [level, stats] of Object.entries(profile.levelStats)) {
      if (stats.used >= 3) {
        const rate = stats.accepted / stats.used;
        if (rate > bestRate) {
          bestRate = rate;
          bestLevel = parseInt(level) as HumanizationLevel;
        }
      }
    }

    return bestLevel;
  }

  /**
   * Generates a unique identifier
   */
  private generateId(prefix: string): string {
    return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
  }
}

// Export singleton instance
export const learningProfileService = new LearningProfileService();
