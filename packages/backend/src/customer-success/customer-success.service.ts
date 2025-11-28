/**
 * Customer Success Service
 * Manages onboarding tracking, engagement metrics, churn risk, retention campaigns, and NPS
 * Requirements: 96 - Customer success tools
 */

import { prisma } from '../database/prisma';
import { Prisma } from '../generated/prisma';
import { logger } from '../utils/logger';
import type {
  OnboardingStep,
  OnboardingStepType,
  OnboardingStepStatus,
  OnboardingProgress,
  UpdateOnboardingStepInput,
  UserActivity,
  ActivityType,
  RecordActivityInput,
  EngagementMetrics,
  EngagementLevel,
  ChurnRiskAssessment,
  ChurnRiskLevel,
  ChurnRiskFactor,
  RetentionCampaign,
  RetentionCampaignType,
  TriggerCampaignInput,
  NPSResponse,
  NPSResponseInput,
  NPSCategory,
  NPSSummary,
  Milestone,
  MilestoneType,
  MilestoneCelebration,
  CustomerHealthScore,
  CustomerSuccessConfig,
} from './types';
import { ONBOARDING_STEPS, MILESTONE_DEFINITIONS } from './types';

/** Default configuration */
const DEFAULT_CONFIG: CustomerSuccessConfig = {
  enableOnboardingTracking: true,
  enableChurnPrediction: true,
  enableRetentionCampaigns: true,
  enableNPS: true,
  enableMilestones: true,
  npsCollectionIntervalDays: 90,
  churnAssessmentIntervalDays: 7,
  inactivityThresholdDays: 14,
};


/**
 * Custom error class for customer success errors
 */
export class CustomerSuccessError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'CustomerSuccessError';
    this.code = code;
  }
}

/**
 * Customer Success Service class
 * Handles onboarding, engagement, churn prediction, retention, and NPS
 */
export class CustomerSuccessService {
  private config: CustomerSuccessConfig;

  constructor(serviceConfig?: Partial<CustomerSuccessConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...serviceConfig };
  }

  // ============================================
  // Onboarding Tracking
  // ============================================

  /**
   * Initialize onboarding steps for a new user
   * Requirement 96: Implement onboarding tracking
   */
  async initializeOnboarding(userId: string): Promise<OnboardingProgress> {
    if (!this.config.enableOnboardingTracking) {
      return this.getEmptyOnboardingProgress(userId);
    }

    const stepTypes: OnboardingStepType[] = [
      'ACCOUNT_SETUP',
      'PROFILE_COMPLETE',
      'FIRST_PROJECT',
      'FIRST_TRANSFORMATION',
      'EXPLORE_SETTINGS',
    ];

    // Create onboarding steps
    const steps = await Promise.all(
      stepTypes.map((stepType) =>
        prisma.onboardingStep.upsert({
          where: { userId_stepType: { userId, stepType } },
          create: {
            userId,
            stepType,
            status: stepType === 'ACCOUNT_SETUP' ? 'COMPLETED' : 'NOT_STARTED',
            completedAt: stepType === 'ACCOUNT_SETUP' ? new Date() : null,
            metadata: {},
          },
          update: {},
        })
      )
    );

    logger.info('Onboarding initialized', { userId, stepCount: steps.length });

    return this.getOnboardingProgress(userId);
  }

  /**
   * Update onboarding step status
   */
  async updateOnboardingStep(
    userId: string,
    input: UpdateOnboardingStepInput
  ): Promise<OnboardingStep> {
    const now = new Date();

    const step = await prisma.onboardingStep.upsert({
      where: { userId_stepType: { userId, stepType: input.stepType } },
      create: {
        userId,
        stepType: input.stepType,
        status: input.status,
        startedAt: input.status === 'IN_PROGRESS' ? now : null,
        completedAt: input.status === 'COMPLETED' ? now : null,
        skippedAt: input.status === 'SKIPPED' ? now : null,
        metadata: (input.metadata as Prisma.InputJsonValue) ?? {},
      },
      update: {
        status: input.status,
        startedAt: input.status === 'IN_PROGRESS' ? now : undefined,
        completedAt: input.status === 'COMPLETED' ? now : undefined,
        skippedAt: input.status === 'SKIPPED' ? now : undefined,
        metadata: input.metadata ? (input.metadata as Prisma.InputJsonValue) : undefined,
      },
    });

    logger.info('Onboarding step updated', { userId, stepType: input.stepType, status: input.status });

    return this.toOnboardingStep(step);
  }

  /**
   * Get onboarding progress for a user
   */
  async getOnboardingProgress(userId: string): Promise<OnboardingProgress> {
    const steps = await prisma.onboardingStep.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    const completedCount = steps.filter((s) => s.status === 'COMPLETED').length;
    const totalCount = steps.length || Object.keys(ONBOARDING_STEPS).length;
    const currentStep = steps.find((s) => s.status === 'IN_PROGRESS' || s.status === 'NOT_STARTED');

    const estimatedTimeRemaining = steps
      .filter((s) => s.status !== 'COMPLETED' && s.status !== 'SKIPPED')
      .reduce((sum, s) => sum + (ONBOARDING_STEPS[s.stepType as OnboardingStepType]?.estimatedMinutes ?? 0), 0);

    return {
      userId,
      steps: steps.map((s) => this.toOnboardingStep(s)),
      completedCount,
      totalCount,
      percentComplete: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
      isComplete: completedCount >= totalCount,
      currentStep: currentStep?.stepType as OnboardingStepType | null,
      estimatedTimeRemaining,
    };
  }


  // ============================================
  // Activity & Engagement Tracking
  // ============================================

  /**
   * Record user activity
   * Requirement 96: Create engagement metrics
   */
  async recordActivity(userId: string, input: RecordActivityInput): Promise<UserActivity> {
    const activity = await prisma.userActivity.create({
      data: {
        userId,
        activityType: input.activityType,
        featureName: input.featureName ?? null,
        metadata: (input.metadata as Prisma.InputJsonValue) ?? {},
      },
    });

    // Check for milestone triggers
    await this.checkMilestoneTriggers(userId, input.activityType);

    logger.debug('Activity recorded', { userId, activityType: input.activityType });

    return this.toUserActivity(activity);
  }

  /**
   * Get engagement metrics for a user
   */
  async getEngagementMetrics(userId: string): Promise<EngagementMetrics> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Get recent activities
    const [recentActivities, previousActivities, projectCount, lastActivity] = await Promise.all([
      prisma.userActivity.findMany({
        where: { userId, createdAt: { gte: thirtyDaysAgo } },
      }),
      prisma.userActivity.findMany({
        where: { userId, createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
      }),
      prisma.project.count({ where: { ownerId: userId } }),
      prisma.userActivity.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const loginCount30Days = recentActivities.filter((a) => a.activityType === 'LOGIN').length;
    const transformationCount30Days = recentActivities.filter((a) => a.activityType === 'TRANSFORMATION').length;
    const previousLoginCount = previousActivities.filter((a) => a.activityType === 'LOGIN').length;
    const previousTransformationCount = previousActivities.filter((a) => a.activityType === 'TRANSFORMATION').length;

    const daysSinceLastActive = lastActivity
      ? Math.floor((now.getTime() - lastActivity.createdAt.getTime()) / (24 * 60 * 60 * 1000))
      : 999;

    // Calculate engagement score
    const score = this.calculateEngagementScore({
      loginCount30Days,
      transformationCount30Days,
      projectCount,
      daysSinceLastActive,
    });

    const level = this.getEngagementLevel(score);

    // Calculate trends
    const loginTrend = this.calculateTrend(loginCount30Days, previousLoginCount);
    const usageTrend = this.calculateTrend(transformationCount30Days, previousTransformationCount);

    // Calculate feature adoption
    const uniqueFeatures = new Set(recentActivities.filter((a) => a.featureName).map((a) => a.featureName));
    const totalFeatures = 10; // Approximate number of key features
    const featureAdoptionRate = Math.round((uniqueFeatures.size / totalFeatures) * 100);

    // Calculate weekly streak
    const weeklyActiveStreak = await this.calculateWeeklyStreak(userId);

    return {
      userId,
      level,
      score,
      lastActiveAt: lastActivity?.createdAt ?? null,
      daysSinceLastActive,
      loginCount30Days,
      transformationCount30Days,
      projectCount,
      averageSessionDuration: 15, // Placeholder - would need session tracking
      featureAdoptionRate,
      weeklyActiveStreak,
      trends: {
        loginTrend,
        usageTrend,
      },
    };
  }

  /**
   * Calculate engagement score (0-100)
   */
  private calculateEngagementScore(metrics: {
    loginCount30Days: number;
    transformationCount30Days: number;
    projectCount: number;
    daysSinceLastActive: number;
  }): number {
    let score = 0;

    // Login frequency (max 25 points)
    score += Math.min(25, metrics.loginCount30Days * 2.5);

    // Transformation activity (max 35 points)
    score += Math.min(35, metrics.transformationCount30Days * 3.5);

    // Project count (max 20 points)
    score += Math.min(20, metrics.projectCount * 4);

    // Recency bonus (max 20 points)
    if (metrics.daysSinceLastActive <= 1) score += 20;
    else if (metrics.daysSinceLastActive <= 3) score += 15;
    else if (metrics.daysSinceLastActive <= 7) score += 10;
    else if (metrics.daysSinceLastActive <= 14) score += 5;

    return Math.round(Math.min(100, score));
  }

  /**
   * Get engagement level from score
   */
  private getEngagementLevel(score: number): EngagementLevel {
    if (score >= 80) return 'POWER_USER';
    if (score >= 60) return 'HIGH';
    if (score >= 40) return 'MEDIUM';
    if (score >= 20) return 'LOW';
    return 'INACTIVE';
  }

  /**
   * Calculate trend direction
   */
  private calculateTrend(current: number, previous: number): 'INCREASING' | 'STABLE' | 'DECREASING' {
    const change = previous > 0 ? (current - previous) / previous : current > 0 ? 1 : 0;
    if (change > 0.1) return 'INCREASING';
    if (change < -0.1) return 'DECREASING';
    return 'STABLE';
  }

  /**
   * Calculate weekly active streak
   */
  private async calculateWeeklyStreak(userId: string): Promise<number> {
    const activities = await prisma.userActivity.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    if (activities.length === 0) return 0;

    let streak = 0;
    const now = new Date();
    let currentWeekStart = this.getWeekStart(now);

    while (true) {
      const weekEnd = new Date(currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      const hasActivity = activities.some(
        (a) => a.createdAt >= currentWeekStart && a.createdAt < weekEnd
      );

      if (!hasActivity) break;
      streak++;
      currentWeekStart = new Date(currentWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    return streak;
  }

  /**
   * Get start of week (Monday)
   */
  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }


  // ============================================
  // Churn Risk Assessment
  // ============================================

  /**
   * Assess churn risk for a user
   * Requirement 96: Build churn risk identification
   */
  async assessChurnRisk(userId: string): Promise<ChurnRiskAssessment> {
    if (!this.config.enableChurnPrediction) {
      return {
        userId,
        riskLevel: 'LOW',
        riskScore: 0,
        factors: [],
        predictedChurnDate: null,
        recommendedActions: [],
        lastAssessedAt: new Date(),
      };
    }

    const engagement = await this.getEngagementMetrics(userId);
    const factors: ChurnRiskFactor[] = [];
    let riskScore = 0;

    // Factor 1: Days since last active (weight: 30)
    const inactivityFactor = this.calculateInactivityFactor(engagement.daysSinceLastActive);
    factors.push(inactivityFactor);
    riskScore += inactivityFactor.value * inactivityFactor.weight;

    // Factor 2: Engagement level (weight: 25)
    const engagementFactor = this.calculateEngagementFactor(engagement.level);
    factors.push(engagementFactor);
    riskScore += engagementFactor.value * engagementFactor.weight;

    // Factor 3: Usage trend (weight: 20)
    const trendFactor = this.calculateTrendFactor(engagement.trends.usageTrend);
    factors.push(trendFactor);
    riskScore += trendFactor.value * trendFactor.weight;

    // Factor 4: Feature adoption (weight: 15)
    const adoptionFactor = this.calculateAdoptionFactor(engagement.featureAdoptionRate);
    factors.push(adoptionFactor);
    riskScore += adoptionFactor.value * adoptionFactor.weight;

    // Factor 5: Support tickets (weight: 10)
    const supportFactor = await this.calculateSupportFactor(userId);
    factors.push(supportFactor);
    riskScore += supportFactor.value * supportFactor.weight;

    // Normalize score to 0-100
    riskScore = Math.min(100, Math.round(riskScore));

    const riskLevel = this.getChurnRiskLevel(riskScore);
    const recommendedActions = this.getRecommendedActions(riskLevel, factors);
    const predictedChurnDate = this.predictChurnDate(riskScore, engagement.daysSinceLastActive);

    // Store assessment
    await prisma.churnRiskAssessment.upsert({
      where: { userId },
      create: {
        userId,
        riskLevel,
        riskScore,
        factors: factors as unknown as Prisma.InputJsonValue,
        predictedChurnDate,
        recommendedActions,
      },
      update: {
        riskLevel,
        riskScore,
        factors: factors as unknown as Prisma.InputJsonValue,
        predictedChurnDate,
        recommendedActions,
      },
    });

    logger.info('Churn risk assessed', { userId, riskLevel, riskScore });

    return {
      userId,
      riskLevel,
      riskScore,
      factors,
      predictedChurnDate,
      recommendedActions,
      lastAssessedAt: new Date(),
    };
  }

  private calculateInactivityFactor(daysSinceLastActive: number): ChurnRiskFactor {
    let value = 0;
    if (daysSinceLastActive > 30) value = 1;
    else if (daysSinceLastActive > 14) value = 0.7;
    else if (daysSinceLastActive > 7) value = 0.4;
    else if (daysSinceLastActive > 3) value = 0.2;

    return {
      factor: 'inactivity',
      weight: 30,
      value,
      description: `${daysSinceLastActive} days since last activity`,
    };
  }

  private calculateEngagementFactor(level: EngagementLevel): ChurnRiskFactor {
    const valueMap: Record<EngagementLevel, number> = {
      INACTIVE: 1,
      LOW: 0.7,
      MEDIUM: 0.3,
      HIGH: 0.1,
      POWER_USER: 0,
    };

    return {
      factor: 'engagement',
      weight: 25,
      value: valueMap[level],
      description: `Engagement level: ${level}`,
    };
  }

  private calculateTrendFactor(trend: 'INCREASING' | 'STABLE' | 'DECREASING'): ChurnRiskFactor {
    const valueMap = { INCREASING: 0, STABLE: 0.3, DECREASING: 0.8 };

    return {
      factor: 'usage_trend',
      weight: 20,
      value: valueMap[trend],
      description: `Usage trend: ${trend}`,
    };
  }

  private calculateAdoptionFactor(adoptionRate: number): ChurnRiskFactor {
    const value = 1 - adoptionRate / 100;

    return {
      factor: 'feature_adoption',
      weight: 15,
      value,
      description: `Feature adoption: ${adoptionRate}%`,
    };
  }

  private async calculateSupportFactor(userId: string): Promise<ChurnRiskFactor> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const ticketCount = await prisma.userActivity.count({
      where: { userId, activityType: 'SUPPORT_TICKET', createdAt: { gte: thirtyDaysAgo } },
    });

    let value = 0;
    if (ticketCount > 5) value = 0.8;
    else if (ticketCount > 2) value = 0.4;
    else if (ticketCount > 0) value = 0.2;

    return {
      factor: 'support_tickets',
      weight: 10,
      value,
      description: `${ticketCount} support tickets in last 30 days`,
    };
  }

  private getChurnRiskLevel(score: number): ChurnRiskLevel {
    if (score >= 75) return 'CRITICAL';
    if (score >= 50) return 'HIGH';
    if (score >= 25) return 'MEDIUM';
    return 'LOW';
  }

  private getRecommendedActions(level: ChurnRiskLevel, factors: ChurnRiskFactor[]): string[] {
    const actions: string[] = [];

    if (level === 'CRITICAL' || level === 'HIGH') {
      actions.push('Send personalized re-engagement email');
      actions.push('Offer one-on-one onboarding session');
    }

    const highestFactor = factors.reduce((a, b) => (a.value * a.weight > b.value * b.weight ? a : b));

    switch (highestFactor.factor) {
      case 'inactivity':
        actions.push('Send feature highlight email');
        actions.push('Offer limited-time discount');
        break;
      case 'engagement':
        actions.push('Provide tutorial recommendations');
        actions.push('Suggest relevant use cases');
        break;
      case 'usage_trend':
        actions.push('Schedule check-in call');
        actions.push('Share success stories');
        break;
      case 'feature_adoption':
        actions.push('Send feature discovery tips');
        actions.push('Offer feature walkthrough');
        break;
      case 'support_tickets':
        actions.push('Escalate to customer success manager');
        actions.push('Provide priority support');
        break;
    }

    return actions;
  }

  private predictChurnDate(riskScore: number, daysSinceLastActive: number): Date | null {
    if (riskScore < 50) return null;

    const daysUntilChurn = Math.max(7, 30 - daysSinceLastActive - Math.floor(riskScore / 10));
    return new Date(Date.now() + daysUntilChurn * 24 * 60 * 60 * 1000);
  }


  // ============================================
  // Retention Campaigns
  // ============================================

  /**
   * Trigger a retention campaign for a user
   * Requirement 96: Add retention campaign triggers
   */
  async triggerRetentionCampaign(
    userId: string,
    input: TriggerCampaignInput
  ): Promise<RetentionCampaign> {
    if (!this.config.enableRetentionCampaigns) {
      throw new CustomerSuccessError('Retention campaigns are disabled', 'CAMPAIGNS_DISABLED');
    }

    const campaign = await prisma.retentionCampaign.create({
      data: {
        userId,
        campaignType: input.campaignType,
        status: input.scheduledAt ? 'PENDING' : 'SENT',
        customMessage: input.customMessage ?? null,
        scheduledAt: input.scheduledAt ?? null,
        sentAt: input.scheduledAt ? null : new Date(),
      },
    });

    logger.info('Retention campaign triggered', { userId, campaignType: input.campaignType });

    return this.toRetentionCampaign(campaign);
  }

  /**
   * Update campaign status
   */
  async updateCampaignStatus(
    campaignId: string,
    status: RetentionCampaign['status']
  ): Promise<RetentionCampaign> {
    const now = new Date();
    const updateData: Prisma.RetentionCampaignUpdateInput = { status };

    switch (status) {
      case 'SENT':
        updateData.sentAt = now;
        break;
      case 'OPENED':
        updateData.openedAt = now;
        break;
      case 'CLICKED':
        updateData.clickedAt = now;
        break;
      case 'CONVERTED':
        updateData.convertedAt = now;
        break;
    }

    const campaign = await prisma.retentionCampaign.update({
      where: { id: campaignId },
      data: updateData,
    });

    return this.toRetentionCampaign(campaign);
  }

  /**
   * Get campaigns for a user
   */
  async getUserCampaigns(userId: string): Promise<RetentionCampaign[]> {
    const campaigns = await prisma.retentionCampaign.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return campaigns.map((c) => this.toRetentionCampaign(c));
  }

  /**
   * Get pending campaigns to send
   */
  async getPendingCampaigns(): Promise<RetentionCampaign[]> {
    const now = new Date();
    const campaigns = await prisma.retentionCampaign.findMany({
      where: {
        status: 'PENDING',
        OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }],
      },
      orderBy: { createdAt: 'asc' },
    });

    return campaigns.map((c) => this.toRetentionCampaign(c));
  }

  // ============================================
  // NPS Collection
  // ============================================

  /**
   * Record NPS response
   * Requirement 96: Implement NPS collection
   */
  async recordNPSResponse(userId: string, input: NPSResponseInput): Promise<NPSResponse> {
    if (!this.config.enableNPS) {
      throw new CustomerSuccessError('NPS collection is disabled', 'NPS_DISABLED');
    }

    const category = this.getNPSCategory(input.score);

    const response = await prisma.nPSResponse.create({
      data: {
        userId,
        score: input.score,
        category,
        feedback: input.feedback ?? null,
        context: input.context ?? null,
      },
    });

    logger.info('NPS response recorded', { userId, score: input.score, category });

    return this.toNPSResponse(response);
  }

  /**
   * Get NPS category from score
   */
  private getNPSCategory(score: number): NPSCategory {
    if (score >= 9) return 'PROMOTER';
    if (score >= 7) return 'PASSIVE';
    return 'DETRACTOR';
  }

  /**
   * Get NPS summary for a period
   */
  async getNPSSummary(startDate: Date, endDate: Date): Promise<NPSSummary> {
    const responses = await prisma.nPSResponse.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
    });

    const totalResponses = responses.length;
    if (totalResponses === 0) {
      return {
        totalResponses: 0,
        averageScore: 0,
        npsScore: 0,
        distribution: { detractors: 0, passives: 0, promoters: 0 },
        percentages: { detractors: 0, passives: 0, promoters: 0 },
        trend: 'STABLE',
        periodStart: startDate,
        periodEnd: endDate,
      };
    }

    const distribution = {
      detractors: responses.filter((r) => r.category === 'DETRACTOR').length,
      passives: responses.filter((r) => r.category === 'PASSIVE').length,
      promoters: responses.filter((r) => r.category === 'PROMOTER').length,
    };

    const percentages = {
      detractors: Math.round((distribution.detractors / totalResponses) * 100),
      passives: Math.round((distribution.passives / totalResponses) * 100),
      promoters: Math.round((distribution.promoters / totalResponses) * 100),
    };

    const averageScore = responses.reduce((sum, r) => sum + r.score, 0) / totalResponses;
    const npsScore = percentages.promoters - percentages.detractors;

    // Calculate trend by comparing to previous period
    const periodLength = endDate.getTime() - startDate.getTime();
    const previousStart = new Date(startDate.getTime() - periodLength);
    const previousResponses = await prisma.nPSResponse.findMany({
      where: { createdAt: { gte: previousStart, lt: startDate } },
    });

    let trend: 'IMPROVING' | 'STABLE' | 'DECLINING' = 'STABLE';
    if (previousResponses.length > 0) {
      const prevPromoters = previousResponses.filter((r) => r.category === 'PROMOTER').length;
      const prevDetractors = previousResponses.filter((r) => r.category === 'DETRACTOR').length;
      const prevNPS = ((prevPromoters - prevDetractors) / previousResponses.length) * 100;
      const currentNPS = npsScore;

      if (currentNPS > prevNPS + 5) trend = 'IMPROVING';
      else if (currentNPS < prevNPS - 5) trend = 'DECLINING';
    }

    return {
      totalResponses,
      averageScore: Math.round(averageScore * 10) / 10,
      npsScore,
      distribution,
      percentages,
      trend,
      periodStart: startDate,
      periodEnd: endDate,
    };
  }

  /**
   * Check if user should be prompted for NPS
   */
  async shouldPromptNPS(userId: string): Promise<boolean> {
    if (!this.config.enableNPS) return false;

    const lastResponse = await prisma.nPSResponse.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!lastResponse) return true;

    const daysSinceLastResponse = Math.floor(
      (Date.now() - lastResponse.createdAt.getTime()) / (24 * 60 * 60 * 1000)
    );

    return daysSinceLastResponse >= this.config.npsCollectionIntervalDays;
  }


  // ============================================
  // Milestones & Celebrations
  // ============================================

  /**
   * Check and award milestones
   * Requirement 96: Create milestone celebrations
   */
  async checkMilestoneTriggers(userId: string, activityType: ActivityType): Promise<Milestone[]> {
    if (!this.config.enableMilestones) return [];

    const newMilestones: Milestone[] = [];

    // Check transformation milestones
    if (activityType === 'TRANSFORMATION') {
      const transformationCount = await prisma.userActivity.count({
        where: { userId, activityType: 'TRANSFORMATION' },
      });

      if (transformationCount === 1) {
        const milestone = await this.awardMilestone(userId, 'FIRST_TRANSFORMATION');
        if (milestone) newMilestones.push(milestone);
      } else if (transformationCount === 10) {
        const milestone = await this.awardMilestone(userId, 'TENTH_TRANSFORMATION');
        if (milestone) newMilestones.push(milestone);
      } else if (transformationCount === 100) {
        const milestone = await this.awardMilestone(userId, 'HUNDREDTH_TRANSFORMATION');
        if (milestone) newMilestones.push(milestone);
      }
    }

    // Check team milestones
    if (activityType === 'TEAM_INVITE') {
      const teamCount = await prisma.userActivity.count({
        where: { userId, activityType: 'TEAM_INVITE' },
      });

      if (teamCount === 1) {
        const milestone = await this.awardMilestone(userId, 'FIRST_TEAM_MEMBER');
        if (milestone) newMilestones.push(milestone);
      }
    }

    // Check API milestones
    if (activityType === 'API_CALL') {
      const apiCount = await prisma.userActivity.count({
        where: { userId, activityType: 'API_CALL' },
      });

      if (apiCount === 1) {
        const milestone = await this.awardMilestone(userId, 'FIRST_API_CALL');
        if (milestone) newMilestones.push(milestone);
      }
    }

    // Check streak milestones
    if (activityType === 'LOGIN') {
      const streak = await this.calculateDailyStreak(userId);
      if (streak === 7) {
        const milestone = await this.awardMilestone(userId, 'STREAK_7_DAYS');
        if (milestone) newMilestones.push(milestone);
      } else if (streak === 30) {
        const milestone = await this.awardMilestone(userId, 'STREAK_30_DAYS');
        if (milestone) newMilestones.push(milestone);
      }
    }

    return newMilestones;
  }

  /**
   * Award a milestone to a user
   */
  private async awardMilestone(userId: string, milestoneType: MilestoneType): Promise<Milestone | null> {
    // Check if already awarded
    const existing = await prisma.milestone.findFirst({
      where: { userId, milestoneType },
    });

    if (existing) return null;

    const milestone = await prisma.milestone.create({
      data: {
        userId,
        milestoneType,
        metadata: {},
      },
    });

    logger.info('Milestone awarded', { userId, milestoneType });

    return this.toMilestone(milestone);
  }

  /**
   * Get milestone celebration details
   */
  async getMilestoneCelebration(milestoneId: string): Promise<MilestoneCelebration | null> {
    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
    });

    if (!milestone) return null;

    const definition = MILESTONE_DEFINITIONS[milestone.milestoneType as MilestoneType];

    return {
      milestone: this.toMilestone(milestone),
      title: definition.title,
      message: definition.message,
      badgeUrl: null, // Would be a URL to badge image
      rewardType: null,
      rewardValue: null,
    };
  }

  /**
   * Mark milestone as celebrated
   */
  async celebrateMilestone(milestoneId: string): Promise<Milestone> {
    const milestone = await prisma.milestone.update({
      where: { id: milestoneId },
      data: { celebratedAt: new Date() },
    });

    return this.toMilestone(milestone);
  }

  /**
   * Get uncelebrated milestones for a user
   */
  async getUncelebratedMilestones(userId: string): Promise<MilestoneCelebration[]> {
    const milestones = await prisma.milestone.findMany({
      where: { userId, celebratedAt: null },
      orderBy: { achievedAt: 'desc' },
    });

    return milestones.map((m) => {
      const definition = MILESTONE_DEFINITIONS[m.milestoneType as MilestoneType];
      return {
        milestone: this.toMilestone(m),
        title: definition.title,
        message: definition.message,
        badgeUrl: null,
        rewardType: null,
        rewardValue: null,
      };
    });
  }

  /**
   * Get all milestones for a user
   */
  async getUserMilestones(userId: string): Promise<Milestone[]> {
    const milestones = await prisma.milestone.findMany({
      where: { userId },
      orderBy: { achievedAt: 'desc' },
    });

    return milestones.map((m) => this.toMilestone(m));
  }

  /**
   * Calculate daily login streak
   */
  private async calculateDailyStreak(userId: string): Promise<number> {
    const activities = await prisma.userActivity.findMany({
      where: { userId, activityType: 'LOGIN' },
      orderBy: { createdAt: 'desc' },
      take: 60,
    });

    if (activities.length === 0) return 0;

    let streak = 1;
    let currentDate = new Date(activities[0].createdAt);
    currentDate.setHours(0, 0, 0, 0);

    for (let i = 1; i < activities.length; i++) {
      const activityDate = new Date(activities[i].createdAt);
      activityDate.setHours(0, 0, 0, 0);

      const dayDiff = Math.floor(
        (currentDate.getTime() - activityDate.getTime()) / (24 * 60 * 60 * 1000)
      );

      if (dayDiff === 1) {
        streak++;
        currentDate = activityDate;
      } else if (dayDiff > 1) {
        break;
      }
    }

    return streak;
  }


  // ============================================
  // Customer Health Score
  // ============================================

  /**
   * Calculate customer health score
   */
  async getCustomerHealthScore(userId: string): Promise<CustomerHealthScore> {
    const engagement = await this.getEngagementMetrics(userId);
    const churnRisk = await this.assessChurnRisk(userId);
    const onboarding = await this.getOnboardingProgress(userId);

    // Get NPS score if available
    const lastNPS = await prisma.nPSResponse.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate component scores
    const engagementScore = engagement.score;
    const adoptionScore = Math.round(
      (onboarding.percentComplete * 0.4 + engagement.featureAdoptionRate * 0.6)
    );
    const satisfactionScore = lastNPS ? lastNPS.score * 10 : 50;
    const growthScore = engagement.trends.usageTrend === 'INCREASING' ? 80 :
      engagement.trends.usageTrend === 'STABLE' ? 50 : 20;

    // Calculate overall score
    const overallScore = Math.round(
      engagementScore * 0.35 +
      adoptionScore * 0.25 +
      satisfactionScore * 0.25 +
      growthScore * 0.15
    );

    // Determine status
    let status: 'HEALTHY' | 'AT_RISK' | 'CRITICAL' = 'HEALTHY';
    if (overallScore < 40 || churnRisk.riskLevel === 'CRITICAL') {
      status = 'CRITICAL';
    } else if (overallScore < 60 || churnRisk.riskLevel === 'HIGH') {
      status = 'AT_RISK';
    }

    return {
      userId,
      overallScore,
      components: {
        engagement: engagementScore,
        adoption: adoptionScore,
        satisfaction: satisfactionScore,
        growth: growthScore,
      },
      status,
      lastUpdatedAt: new Date(),
    };
  }

  // ============================================
  // Helper Methods
  // ============================================

  private getEmptyOnboardingProgress(userId: string): OnboardingProgress {
    return {
      userId,
      steps: [],
      completedCount: 0,
      totalCount: 0,
      percentComplete: 100,
      isComplete: true,
      currentStep: null,
      estimatedTimeRemaining: 0,
    };
  }

  private toOnboardingStep(step: {
    id: string;
    userId: string;
    stepType: string;
    status: string;
    startedAt: Date | null;
    completedAt: Date | null;
    skippedAt: Date | null;
    metadata: Prisma.JsonValue;
  }): OnboardingStep {
    return {
      id: step.id,
      userId: step.userId,
      stepType: step.stepType as OnboardingStepType,
      status: step.status as OnboardingStepStatus,
      startedAt: step.startedAt,
      completedAt: step.completedAt,
      skippedAt: step.skippedAt,
      metadata: (step.metadata as Record<string, unknown>) ?? {},
    };
  }

  private toUserActivity(activity: {
    id: string;
    userId: string;
    activityType: string;
    featureName: string | null;
    metadata: Prisma.JsonValue;
    createdAt: Date;
  }): UserActivity {
    return {
      id: activity.id,
      userId: activity.userId,
      activityType: activity.activityType as ActivityType,
      featureName: activity.featureName,
      metadata: (activity.metadata as Record<string, unknown>) ?? {},
      createdAt: activity.createdAt,
    };
  }

  private toRetentionCampaign(campaign: {
    id: string;
    userId: string;
    campaignType: string;
    status: string;
    customMessage: string | null;
    scheduledAt: Date | null;
    sentAt: Date | null;
    openedAt: Date | null;
    clickedAt: Date | null;
    convertedAt: Date | null;
    createdAt: Date;
  }): RetentionCampaign {
    return {
      id: campaign.id,
      userId: campaign.userId,
      campaignType: campaign.campaignType as RetentionCampaignType,
      status: campaign.status as RetentionCampaign['status'],
      customMessage: campaign.customMessage,
      scheduledAt: campaign.scheduledAt,
      sentAt: campaign.sentAt,
      openedAt: campaign.openedAt,
      clickedAt: campaign.clickedAt,
      convertedAt: campaign.convertedAt,
      createdAt: campaign.createdAt,
    };
  }

  private toNPSResponse(response: {
    id: string;
    userId: string;
    score: number;
    category: string;
    feedback: string | null;
    context: string | null;
    createdAt: Date;
  }): NPSResponse {
    return {
      id: response.id,
      userId: response.userId,
      score: response.score,
      category: response.category as NPSCategory,
      feedback: response.feedback,
      context: response.context,
      createdAt: response.createdAt,
    };
  }

  private toMilestone(milestone: {
    id: string;
    userId: string;
    milestoneType: string;
    achievedAt: Date;
    celebratedAt: Date | null;
    metadata: Prisma.JsonValue;
  }): Milestone {
    return {
      id: milestone.id,
      userId: milestone.userId,
      milestoneType: milestone.milestoneType as MilestoneType,
      achievedAt: milestone.achievedAt,
      celebratedAt: milestone.celebratedAt,
      metadata: (milestone.metadata as Record<string, unknown>) ?? {},
    };
  }
}

/** Singleton instance */
export const customerSuccessService = new CustomerSuccessService();
