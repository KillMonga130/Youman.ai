/**
 * Learning Profile Types
 * Type definitions for user-specific learning and adaptation
 * Requirements: 28
 */

import { TransformStrategy, HumanizationLevel } from '../transform/types';

/**
 * Feedback on a specific transformation
 * Requirement 28.1: Record user preferences when accepting/rejecting transformations
 */
export interface Feedback {
  /** Whether the transformation was accepted */
  accepted: boolean;
  /** Optional rating (1-5) */
  rating?: number;
  /** Optional comments */
  comments?: string;
  /** Specific changes acceptance/rejection */
  specificChanges?: ChangeAcceptance[];
}

/**
 * Acceptance status for a specific change
 */
export interface ChangeAcceptance {
  /** Change identifier */
  changeId: string;
  /** Original text */
  originalText: string;
  /** Transformed text */
  transformedText: string;
  /** Whether this specific change was accepted */
  accepted: boolean;
}

/**
 * User preferences for transformations
 * Requirement 28.2: Apply learned preferences automatically
 */
export interface UserPreferences {
  /** Preferred humanization level */
  preferredLevel?: HumanizationLevel;
  /** Preferred transformation strategy */
  preferredStrategy?: TransformStrategy;
  /** Preferred vocabulary - words to use */
  preferredVocabulary?: string[];
  /** Avoided vocabulary - words to avoid */
  avoidedVocabulary?: string[];
  /** Tone preferences */
  tonePreferences?: {
    formality: number; // 0-100
    enthusiasm: number; // 0-100
  };
  /** Language preference */
  preferredLanguage?: string;
}

/**
 * Transformation weight adjustments
 * Requirement 28.4: Adjust transformation weights based on feedback
 */
export interface TransformationWeights {
  /** Weight for sentence restructuring (0-1) */
  sentenceRestructuring: number;
  /** Weight for vocabulary replacement (0-1) */
  vocabularyReplacement: number;
  /** Weight for tone adjustment (0-1) */
  toneAdjustment: number;
  /** Weight for adding natural imperfections (0-1) */
  naturalImperfections: number;
  /** Weight for varying sentence length (0-1) */
  sentenceLengthVariation: number;
}

/**
 * Personalized recommendation
 * Requirement 28.3: Suggest personalized transformation strategies
 */
export interface Recommendation {
  /** Recommendation identifier */
  id: string;
  /** Recommendation type */
  type: 'strategy' | 'level' | 'vocabulary' | 'tone' | 'general';
  /** Recommendation title */
  title: string;
  /** Recommendation description */
  description: string;
  /** Confidence score (0-100) */
  confidence: number;
  /** Suggested value */
  suggestedValue: string | number | object;
  /** Reason for recommendation */
  reason: string;
  /** Created timestamp */
  createdAt: Date;
}

/**
 * Feedback record stored in the profile
 */
export interface FeedbackRecord {
  /** Record identifier */
  id: string;
  /** Transformation identifier */
  transformationId: string;
  /** Feedback data */
  feedback: Feedback;
  /** Strategy used for the transformation */
  strategyUsed: TransformStrategy;
  /** Level used for the transformation */
  levelUsed: HumanizationLevel;
  /** Content type of the transformed text */
  contentType?: string;
  /** Timestamp */
  recordedAt: Date;
}

/**
 * Learning profile for a user
 * Requirement 28: Contextual learning from user feedback
 */
export interface LearningProfile {
  /** Profile identifier */
  id: string;
  /** User identifier */
  userId: string;
  /** User preferences */
  preferences: UserPreferences;
  /** Transformation weights */
  weights: TransformationWeights;
  /** Feedback history */
  feedbackHistory: FeedbackRecord[];
  /** Total feedback count */
  totalFeedbackCount: number;
  /** Positive feedback count */
  positiveFeedbackCount: number;
  /** Strategy usage statistics */
  strategyStats: Record<TransformStrategy, { used: number; accepted: number }>;
  /** Level usage statistics */
  levelStats: Record<HumanizationLevel, { used: number; accepted: number }>;
  /** Profile maturity (sufficient data for recommendations) */
  isMatured: boolean;
  /** Created timestamp */
  createdAt: Date;
  /** Last updated timestamp */
  updatedAt: Date;
}

/**
 * Options for recording feedback
 */
export interface RecordFeedbackOptions {
  /** User identifier */
  userId: string;
  /** Transformation identifier */
  transformationId: string;
  /** Feedback data */
  feedback: Feedback;
  /** Strategy used */
  strategyUsed: TransformStrategy;
  /** Level used */
  levelUsed: HumanizationLevel;
  /** Content type */
  contentType?: string;
}

/**
 * Options for updating preferences
 */
export interface UpdatePreferencesOptions {
  /** User identifier */
  userId: string;
  /** Preferences to update */
  preferences: Partial<UserPreferences>;
}

/**
 * Service configuration
 */
export interface LearningProfileServiceConfig {
  /** Minimum feedback count for profile maturity */
  minFeedbackForMaturity: number;
  /** Maximum feedback history to keep */
  maxFeedbackHistory: number;
  /** Minimum confidence for recommendations */
  minRecommendationConfidence: number;
  /** Weight learning rate (how fast weights adjust) */
  weightLearningRate: number;
}

/**
 * Profile statistics
 */
export interface ProfileStats {
  /** Total transformations */
  totalTransformations: number;
  /** Acceptance rate (0-100) */
  acceptanceRate: number;
  /** Average rating */
  averageRating: number;
  /** Most used strategy */
  mostUsedStrategy: TransformStrategy;
  /** Most successful strategy */
  mostSuccessfulStrategy: TransformStrategy;
  /** Preferred level based on usage */
  preferredLevel: HumanizationLevel;
  /** Profile maturity status */
  isMatured: boolean;
  /** Days since profile creation */
  profileAgeDays: number;
}
