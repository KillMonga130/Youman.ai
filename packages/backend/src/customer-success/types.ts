/**
 * Customer Success Service Types
 * Type definitions for onboarding tracking, engagement metrics, churn risk, retention, and NPS
 * Requirements: 96 - Customer success tools
 */

import { z } from 'zod';

// ============================================
// Enums
// ============================================

/**
 * Onboarding step status
 */
export type OnboardingStepStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';

/**
 * Onboarding step types
 */
export type OnboardingStepType =
  | 'ACCOUNT_SETUP'
  | 'PROFILE_COMPLETE'
  | 'FIRST_PROJECT'
  | 'FIRST_TRANSFORMATION'
  | 'EXPLORE_SETTINGS'
  | 'INVITE_TEAM'
  | 'CONNECT_CLOUD'
  | 'API_INTEGRATION'
  | 'UPGRADE_PLAN';

/**
 * Engagement level
 */
export type EngagementLevel = 'INACTIVE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'POWER_USER';

/**
 * Churn risk level
 */
export type ChurnRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * Retention campaign types
 */
export type RetentionCampaignType =
  | 'RE_ENGAGEMENT'
  | 'FEATURE_EDUCATION'
  | 'UPGRADE_OFFER'
  | 'FEEDBACK_REQUEST'
  | 'WIN_BACK'
  | 'LOYALTY_REWARD';

/**
 * NPS response category
 */
export type NPSCategory = 'DETRACTOR' | 'PASSIVE' | 'PROMOTER';

/**
 * Milestone types
 */
export type MilestoneType =
  | 'FIRST_TRANSFORMATION'
  | 'TENTH_TRANSFORMATION'
  | 'HUNDREDTH_TRANSFORMATION'
  | 'FIRST_MONTH'
  | 'FIRST_YEAR'
  | 'FIRST_TEAM_MEMBER'
  | 'FIRST_API_CALL'
  | 'WORDS_PROCESSED_10K'
  | 'WORDS_PROCESSED_100K'
  | 'WORDS_PROCESSED_1M'
  | 'PERFECT_DETECTION_SCORE'
  | 'STREAK_7_DAYS'
  | 'STREAK_30_DAYS';

/**
 * Activity types for tracking
 */
export type ActivityType =
  | 'LOGIN'
  | 'PROJECT_CREATE'
  | 'PROJECT_VIEW'
  | 'TRANSFORMATION'
  | 'EXPORT'
  | 'SETTINGS_CHANGE'
  | 'TEAM_INVITE'
  | 'API_CALL'
  | 'SUPPORT_TICKET'
  | 'FEATURE_USE';

// ============================================
// Validation Schemas
// ============================================

/**
 * Schema for updating onboarding step
 */
export const updateOnboardingStepSchema = z.object({
  stepType: z.enum([
    'ACCOUNT_SETUP',
    'PROFILE_COMPLETE',
    'FIRST_PROJECT',
    'FIRST_TRANSFORMATION',
    'EXPLORE_SETTINGS',
    'INVITE_TEAM',
    'CONNECT_CLOUD',
    'API_INTEGRATION',
    'UPGRADE_PLAN',
  ]),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED']),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Schema for recording activity
 */
export const recordActivitySchema = z.object({
  activityType: z.enum([
    'LOGIN',
    'PROJECT_CREATE',
    'PROJECT_VIEW',
    'TRANSFORMATION',
    'EXPORT',
    'SETTINGS_CHANGE',
    'TEAM_INVITE',
    'API_CALL',
    'SUPPORT_TICKET',
    'FEATURE_USE',
  ]),
  metadata: z.record(z.unknown()).optional(),
  featureName: z.string().optional(),
});

/**
 * Schema for NPS response
 */
export const npsResponseSchema = z.object({
  score: z.number().int().min(0).max(10),
  feedback: z.string().max(2000).optional(),
  context: z.string().optional(),
});

/**
 * Schema for triggering retention campaign
 */
export const triggerCampaignSchema = z.object({
  campaignType: z.enum([
    'RE_ENGAGEMENT',
    'FEATURE_EDUCATION',
    'UPGRADE_OFFER',
    'FEEDBACK_REQUEST',
    'WIN_BACK',
    'LOYALTY_REWARD',
  ]),
  customMessage: z.string().max(500).optional(),
  scheduledAt: z.coerce.date().optional(),
});

// ============================================
// Types derived from schemas
// ============================================

export type UpdateOnboardingStepInput = z.infer<typeof updateOnboardingStepSchema>;
export type RecordActivityInput = z.infer<typeof recordActivitySchema>;
export type NPSResponseInput = z.infer<typeof npsResponseSchema>;
export type TriggerCampaignInput = z.infer<typeof triggerCampaignSchema>;

// ============================================
// Response Types
// ============================================

/**
 * Onboarding step record
 */
export interface OnboardingStep {
  id: string;
  userId: string;
  stepType: OnboardingStepType;
  status: OnboardingStepStatus;
  startedAt: Date | null;
  completedAt: Date | null;
  skippedAt: Date | null;
  metadata: Record<string, unknown>;
}

/**
 * Onboarding progress summary
 */
export interface OnboardingProgress {
  userId: string;
  steps: OnboardingStep[];
  completedCount: number;
  totalCount: number;
  percentComplete: number;
  isComplete: boolean;
  currentStep: OnboardingStepType | null;
  estimatedTimeRemaining: number; // minutes
}

/**
 * User activity record
 */
export interface UserActivity {
  id: string;
  userId: string;
  activityType: ActivityType;
  featureName: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

/**
 * Engagement metrics
 */
export interface EngagementMetrics {
  userId: string;
  level: EngagementLevel;
  score: number; // 0-100
  lastActiveAt: Date | null;
  daysSinceLastActive: number;
  loginCount30Days: number;
  transformationCount30Days: number;
  projectCount: number;
  averageSessionDuration: number; // minutes
  featureAdoptionRate: number; // 0-100
  weeklyActiveStreak: number;
  trends: {
    loginTrend: 'INCREASING' | 'STABLE' | 'DECREASING';
    usageTrend: 'INCREASING' | 'STABLE' | 'DECREASING';
  };
}

/**
 * Churn risk assessment
 */
export interface ChurnRiskAssessment {
  userId: string;
  riskLevel: ChurnRiskLevel;
  riskScore: number; // 0-100
  factors: ChurnRiskFactor[];
  predictedChurnDate: Date | null;
  recommendedActions: string[];
  lastAssessedAt: Date;
}

/**
 * Churn risk factor
 */
export interface ChurnRiskFactor {
  factor: string;
  weight: number;
  value: number;
  description: string;
}

/**
 * Retention campaign
 */
export interface RetentionCampaign {
  id: string;
  userId: string;
  campaignType: RetentionCampaignType;
  status: 'PENDING' | 'SENT' | 'OPENED' | 'CLICKED' | 'CONVERTED' | 'FAILED';
  customMessage: string | null;
  scheduledAt: Date | null;
  sentAt: Date | null;
  openedAt: Date | null;
  clickedAt: Date | null;
  convertedAt: Date | null;
  createdAt: Date;
}

/**
 * NPS response record
 */
export interface NPSResponse {
  id: string;
  userId: string;
  score: number;
  category: NPSCategory;
  feedback: string | null;
  context: string | null;
  createdAt: Date;
}

/**
 * NPS summary statistics
 */
export interface NPSSummary {
  totalResponses: number;
  averageScore: number;
  npsScore: number; // -100 to 100
  distribution: {
    detractors: number;
    passives: number;
    promoters: number;
  };
  percentages: {
    detractors: number;
    passives: number;
    promoters: number;
  };
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  periodStart: Date;
  periodEnd: Date;
}

/**
 * Milestone record
 */
export interface Milestone {
  id: string;
  userId: string;
  milestoneType: MilestoneType;
  achievedAt: Date;
  celebratedAt: Date | null;
  metadata: Record<string, unknown>;
}

/**
 * Milestone celebration
 */
export interface MilestoneCelebration {
  milestone: Milestone;
  title: string;
  message: string;
  badgeUrl: string | null;
  rewardType: string | null;
  rewardValue: string | null;
}

/**
 * Customer health score
 */
export interface CustomerHealthScore {
  userId: string;
  overallScore: number; // 0-100
  components: {
    engagement: number;
    adoption: number;
    satisfaction: number;
    growth: number;
  };
  status: 'HEALTHY' | 'AT_RISK' | 'CRITICAL';
  lastUpdatedAt: Date;
}

/**
 * User segment
 */
export interface UserSegment {
  id: string;
  name: string;
  description: string;
  criteria: SegmentCriteria;
  userCount: number;
  createdAt: Date;
}

/**
 * Segment criteria
 */
export interface SegmentCriteria {
  engagementLevel?: EngagementLevel[];
  churnRiskLevel?: ChurnRiskLevel[];
  subscriptionTier?: string[];
  onboardingComplete?: boolean;
  daysSinceSignup?: { min?: number; max?: number };
  transformationCount?: { min?: number; max?: number };
}

/**
 * Service configuration
 */
export interface CustomerSuccessConfig {
  enableOnboardingTracking: boolean;
  enableChurnPrediction: boolean;
  enableRetentionCampaigns: boolean;
  enableNPS: boolean;
  enableMilestones: boolean;
  npsCollectionIntervalDays: number;
  churnAssessmentIntervalDays: number;
  inactivityThresholdDays: number;
}

/**
 * Onboarding step definitions
 */
export const ONBOARDING_STEPS: Record<OnboardingStepType, { title: string; description: string; estimatedMinutes: number }> = {
  ACCOUNT_SETUP: {
    title: 'Set up your account',
    description: 'Complete your account registration and verify your email',
    estimatedMinutes: 2,
  },
  PROFILE_COMPLETE: {
    title: 'Complete your profile',
    description: 'Add your name, avatar, and preferences',
    estimatedMinutes: 3,
  },
  FIRST_PROJECT: {
    title: 'Create your first project',
    description: 'Start a new project to organize your content',
    estimatedMinutes: 2,
  },
  FIRST_TRANSFORMATION: {
    title: 'Transform your first text',
    description: 'Experience the power of AI humanization',
    estimatedMinutes: 5,
  },
  EXPLORE_SETTINGS: {
    title: 'Explore settings',
    description: 'Customize your transformation preferences',
    estimatedMinutes: 3,
  },
  INVITE_TEAM: {
    title: 'Invite team members',
    description: 'Collaborate with your team on projects',
    estimatedMinutes: 2,
  },
  CONNECT_CLOUD: {
    title: 'Connect cloud storage',
    description: 'Link Google Drive, Dropbox, or OneDrive',
    estimatedMinutes: 3,
  },
  API_INTEGRATION: {
    title: 'Set up API access',
    description: 'Generate API keys for programmatic access',
    estimatedMinutes: 5,
  },
  UPGRADE_PLAN: {
    title: 'Upgrade your plan',
    description: 'Unlock premium features and higher limits',
    estimatedMinutes: 3,
  },
};

/**
 * Milestone definitions
 */
export const MILESTONE_DEFINITIONS: Record<MilestoneType, { title: string; message: string; badgeEmoji: string }> = {
  FIRST_TRANSFORMATION: {
    title: 'First Steps',
    message: 'Congratulations on your first transformation!',
    badgeEmoji: '🎉',
  },
  TENTH_TRANSFORMATION: {
    title: 'Getting Started',
    message: 'You\'ve completed 10 transformations!',
    badgeEmoji: '🚀',
  },
  HUNDREDTH_TRANSFORMATION: {
    title: 'Power User',
    message: 'Amazing! 100 transformations completed!',
    badgeEmoji: '💪',
  },
  FIRST_MONTH: {
    title: 'One Month Strong',
    message: 'You\'ve been with us for a month!',
    badgeEmoji: '📅',
  },
  FIRST_YEAR: {
    title: 'Anniversary',
    message: 'Happy one year anniversary!',
    badgeEmoji: '🎂',
  },
  FIRST_TEAM_MEMBER: {
    title: 'Team Builder',
    message: 'You invited your first team member!',
    badgeEmoji: '👥',
  },
  FIRST_API_CALL: {
    title: 'Developer Mode',
    message: 'You made your first API call!',
    badgeEmoji: '⚡',
  },
  WORDS_PROCESSED_10K: {
    title: 'Wordsmith',
    message: 'You\'ve processed 10,000 words!',
    badgeEmoji: '📝',
  },
  WORDS_PROCESSED_100K: {
    title: 'Author',
    message: 'You\'ve processed 100,000 words!',
    badgeEmoji: '📚',
  },
  WORDS_PROCESSED_1M: {
    title: 'Prolific Writer',
    message: 'You\'ve processed 1 million words!',
    badgeEmoji: '🏆',
  },
  PERFECT_DETECTION_SCORE: {
    title: 'Undetectable',
    message: 'You achieved a perfect detection score!',
    badgeEmoji: '🎯',
  },
  STREAK_7_DAYS: {
    title: 'Week Warrior',
    message: '7 days of consecutive usage!',
    badgeEmoji: '🔥',
  },
  STREAK_30_DAYS: {
    title: 'Monthly Master',
    message: '30 days of consecutive usage!',
    badgeEmoji: '⭐',
  },
};
