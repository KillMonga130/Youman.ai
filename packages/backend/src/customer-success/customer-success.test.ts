/**
 * Customer Success Service Tests
 * Tests for onboarding tracking, engagement metrics, churn risk, retention, NPS, and milestones
 * Requirements: 96 - Customer success tools
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CustomerSuccessService } from './customer-success.service';

// Mock Prisma
vi.mock('../database/prisma', () => ({
  prisma: {
    onboardingStep: {
      upsert: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    userActivity: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
    },
    project: {
      count: vi.fn(),
    },
    churnRiskAssessment: {
      upsert: vi.fn(),
    },
    retentionCampaign: {
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    nPSResponse: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    milestone: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { prisma } from '../database/prisma';

describe('CustomerSuccessService', () => {
  let service: CustomerSuccessService;
  const mockUserId = 'user-123';


  beforeEach(() => {
    vi.clearAllMocks();
    service = new CustomerSuccessService();
  });

  describe('Onboarding Tracking', () => {
    it('should initialize onboarding steps for a new user', async () => {
      const mockSteps = [
        { id: '1', userId: mockUserId, stepType: 'ACCOUNT_SETUP', status: 'COMPLETED', startedAt: null, completedAt: new Date(), skippedAt: null, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
        { id: '2', userId: mockUserId, stepType: 'PROFILE_COMPLETE', status: 'NOT_STARTED', startedAt: null, completedAt: null, skippedAt: null, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
        { id: '3', userId: mockUserId, stepType: 'FIRST_PROJECT', status: 'NOT_STARTED', startedAt: null, completedAt: null, skippedAt: null, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
        { id: '4', userId: mockUserId, stepType: 'FIRST_TRANSFORMATION', status: 'NOT_STARTED', startedAt: null, completedAt: null, skippedAt: null, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
        { id: '5', userId: mockUserId, stepType: 'EXPLORE_SETTINGS', status: 'NOT_STARTED', startedAt: null, completedAt: null, skippedAt: null, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
      ];

      vi.mocked(prisma.onboardingStep.upsert).mockResolvedValue(mockSteps[0] as never);
      vi.mocked(prisma.onboardingStep.findMany).mockResolvedValue(mockSteps as never);

      const progress = await service.initializeOnboarding(mockUserId);

      expect(progress.userId).toBe(mockUserId);
      expect(progress.completedCount).toBe(1);
      expect(progress.totalCount).toBe(5);
      expect(progress.percentComplete).toBe(20);
      expect(progress.isComplete).toBe(false);
    });

    it('should update onboarding step status', async () => {
      const mockStep = {
        id: '1',
        userId: mockUserId,
        stepType: 'PROFILE_COMPLETE',
        status: 'COMPLETED',
        startedAt: null,
        completedAt: new Date(),
        skippedAt: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.onboardingStep.upsert).mockResolvedValue(mockStep as never);

      const step = await service.updateOnboardingStep(mockUserId, {
        stepType: 'PROFILE_COMPLETE',
        status: 'COMPLETED',
      });

      expect(step.status).toBe('COMPLETED');
      expect(step.stepType).toBe('PROFILE_COMPLETE');
    });

    it('should get onboarding progress', async () => {
      const mockSteps = [
        { id: '1', userId: mockUserId, stepType: 'ACCOUNT_SETUP', status: 'COMPLETED', startedAt: null, completedAt: new Date(), skippedAt: null, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
        { id: '2', userId: mockUserId, stepType: 'PROFILE_COMPLETE', status: 'COMPLETED', startedAt: null, completedAt: new Date(), skippedAt: null, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
        { id: '3', userId: mockUserId, stepType: 'FIRST_PROJECT', status: 'IN_PROGRESS', startedAt: new Date(), completedAt: null, skippedAt: null, metadata: {}, createdAt: new Date(), updatedAt: new Date() },
      ];

      vi.mocked(prisma.onboardingStep.findMany).mockResolvedValue(mockSteps as never);

      const progress = await service.getOnboardingProgress(mockUserId);

      expect(progress.completedCount).toBe(2);
      expect(progress.totalCount).toBe(3);
      expect(progress.currentStep).toBe('FIRST_PROJECT');
    });
  });

  describe('Engagement Metrics', () => {
    it('should record user activity', async () => {
      const mockActivity = {
        id: 'activity-1',
        userId: mockUserId,
        activityType: 'LOGIN',
        featureName: null,
        metadata: {},
        createdAt: new Date(),
      };

      vi.mocked(prisma.userActivity.create).mockResolvedValue(mockActivity as never);
      vi.mocked(prisma.userActivity.count).mockResolvedValue(1 as never);
      vi.mocked(prisma.userActivity.findMany).mockResolvedValue([mockActivity] as never);
      vi.mocked(prisma.milestone.findFirst).mockResolvedValue(null as never);
      vi.mocked(prisma.milestone.create).mockResolvedValue({
        id: 'milestone-1', userId: mockUserId, milestoneType: 'STREAK_7_DAYS', achievedAt: new Date(), celebratedAt: null, metadata: {},
      } as never);

      const activity = await service.recordActivity(mockUserId, {
        activityType: 'LOGIN',
      });

      expect(activity.activityType).toBe('LOGIN');
      expect(prisma.userActivity.create).toHaveBeenCalled();
    });

    it('should calculate engagement metrics', async () => {
      const now = new Date();
      const mockActivities = [
        { id: '1', userId: mockUserId, activityType: 'LOGIN', featureName: null, metadata: {}, createdAt: now },
        { id: '2', userId: mockUserId, activityType: 'TRANSFORMATION', featureName: 'humanize', metadata: {}, createdAt: now },
        { id: '3', userId: mockUserId, activityType: 'LOGIN', featureName: null, metadata: {}, createdAt: now },
      ];

      vi.mocked(prisma.userActivity.findMany).mockResolvedValue(mockActivities as never);
      vi.mocked(prisma.project.count).mockResolvedValue(2 as never);
      vi.mocked(prisma.userActivity.findFirst).mockResolvedValue(mockActivities[0] as never);

      const metrics = await service.getEngagementMetrics(mockUserId);

      expect(metrics.userId).toBe(mockUserId);
      expect(metrics.loginCount30Days).toBe(2);
      expect(metrics.transformationCount30Days).toBe(1);
      expect(metrics.projectCount).toBe(2);
      expect(metrics.level).toBeDefined();
      expect(metrics.score).toBeGreaterThanOrEqual(0);
      expect(metrics.score).toBeLessThanOrEqual(100);
    });

    it('should determine correct engagement level based on score', async () => {
      vi.mocked(prisma.userActivity.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.project.count).mockResolvedValue(0 as never);
      vi.mocked(prisma.userActivity.findFirst).mockResolvedValue(null as never);

      const metrics = await service.getEngagementMetrics(mockUserId);

      expect(metrics.level).toBe('INACTIVE');
      expect(metrics.score).toBe(0);
    });
  });


  describe('Churn Risk Assessment', () => {
    it('should assess churn risk for a user', async () => {
      const now = new Date();
      const mockActivities = [
        { id: '1', userId: mockUserId, activityType: 'LOGIN', featureName: null, metadata: {}, createdAt: now },
      ];

      vi.mocked(prisma.userActivity.findMany).mockResolvedValue(mockActivities as never);
      vi.mocked(prisma.project.count).mockResolvedValue(1 as never);
      vi.mocked(prisma.userActivity.findFirst).mockResolvedValue(mockActivities[0] as never);
      vi.mocked(prisma.userActivity.count).mockResolvedValue(0 as never);
      vi.mocked(prisma.churnRiskAssessment.upsert).mockResolvedValue({
        id: 'assessment-1',
        userId: mockUserId,
        riskLevel: 'LOW',
        riskScore: 20,
        factors: [],
        predictedChurnDate: null,
        recommendedActions: [],
        createdAt: now,
        updatedAt: now,
      } as never);

      const assessment = await service.assessChurnRisk(mockUserId);

      expect(assessment.userId).toBe(mockUserId);
      expect(assessment.riskLevel).toBeDefined();
      expect(assessment.riskScore).toBeGreaterThanOrEqual(0);
      expect(assessment.riskScore).toBeLessThanOrEqual(100);
      expect(assessment.factors).toBeInstanceOf(Array);
      expect(assessment.recommendedActions).toBeInstanceOf(Array);
    });

    it('should identify high churn risk for inactive users', async () => {
      const thirtyDaysAgo = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);
      const mockActivities = [
        { id: '1', userId: mockUserId, activityType: 'LOGIN', featureName: null, metadata: {}, createdAt: thirtyDaysAgo },
      ];

      vi.mocked(prisma.userActivity.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.project.count).mockResolvedValue(0 as never);
      vi.mocked(prisma.userActivity.findFirst).mockResolvedValue(mockActivities[0] as never);
      vi.mocked(prisma.userActivity.count).mockResolvedValue(0 as never);
      vi.mocked(prisma.churnRiskAssessment.upsert).mockImplementation(async (args) => ({
        id: 'assessment-1',
        userId: mockUserId,
        ...(args.create as object),
        createdAt: new Date(),
        updatedAt: new Date(),
      }) as never);

      const assessment = await service.assessChurnRisk(mockUserId);

      expect(assessment.riskScore).toBeGreaterThan(50);
      expect(['HIGH', 'CRITICAL']).toContain(assessment.riskLevel);
    });
  });

  describe('Retention Campaigns', () => {
    it('should trigger a retention campaign', async () => {
      const mockCampaign = {
        id: 'campaign-1',
        userId: mockUserId,
        campaignType: 'RE_ENGAGEMENT',
        status: 'SENT',
        customMessage: null,
        scheduledAt: null,
        sentAt: new Date(),
        openedAt: null,
        clickedAt: null,
        convertedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.retentionCampaign.create).mockResolvedValue(mockCampaign as never);

      const campaign = await service.triggerRetentionCampaign(mockUserId, {
        campaignType: 'RE_ENGAGEMENT',
      });

      expect(campaign.campaignType).toBe('RE_ENGAGEMENT');
      expect(campaign.status).toBe('SENT');
    });

    it('should schedule a campaign for later', async () => {
      const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const mockCampaign = {
        id: 'campaign-1',
        userId: mockUserId,
        campaignType: 'FEATURE_EDUCATION',
        status: 'PENDING',
        customMessage: 'Check out our new features!',
        scheduledAt,
        sentAt: null,
        openedAt: null,
        clickedAt: null,
        convertedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.retentionCampaign.create).mockResolvedValue(mockCampaign as never);

      const campaign = await service.triggerRetentionCampaign(mockUserId, {
        campaignType: 'FEATURE_EDUCATION',
        customMessage: 'Check out our new features!',
        scheduledAt,
      });

      expect(campaign.status).toBe('PENDING');
      expect(campaign.scheduledAt).toEqual(scheduledAt);
    });

    it('should update campaign status', async () => {
      const mockCampaign = {
        id: 'campaign-1',
        userId: mockUserId,
        campaignType: 'RE_ENGAGEMENT',
        status: 'OPENED',
        customMessage: null,
        scheduledAt: null,
        sentAt: new Date(),
        openedAt: new Date(),
        clickedAt: null,
        convertedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.retentionCampaign.update).mockResolvedValue(mockCampaign as never);

      const campaign = await service.updateCampaignStatus('campaign-1', 'OPENED');

      expect(campaign.status).toBe('OPENED');
      expect(campaign.openedAt).toBeDefined();
    });
  });


  describe('NPS Collection', () => {
    it('should record NPS response', async () => {
      const mockResponse = {
        id: 'nps-1',
        userId: mockUserId,
        score: 9,
        category: 'PROMOTER',
        feedback: 'Great product!',
        context: 'post-transformation',
        createdAt: new Date(),
      };

      vi.mocked(prisma.nPSResponse.create).mockResolvedValue(mockResponse as never);

      const response = await service.recordNPSResponse(mockUserId, {
        score: 9,
        feedback: 'Great product!',
        context: 'post-transformation',
      });

      expect(response.score).toBe(9);
      expect(response.category).toBe('PROMOTER');
      expect(response.feedback).toBe('Great product!');
    });

    it('should categorize NPS scores correctly', async () => {
      // Test promoter (9-10)
      vi.mocked(prisma.nPSResponse.create).mockResolvedValue({
        id: 'nps-1', userId: mockUserId, score: 10, category: 'PROMOTER', feedback: null, context: null, createdAt: new Date(),
      } as never);
      let response = await service.recordNPSResponse(mockUserId, { score: 10 });
      expect(response.category).toBe('PROMOTER');

      // Test passive (7-8)
      vi.mocked(prisma.nPSResponse.create).mockResolvedValue({
        id: 'nps-2', userId: mockUserId, score: 8, category: 'PASSIVE', feedback: null, context: null, createdAt: new Date(),
      } as never);
      response = await service.recordNPSResponse(mockUserId, { score: 8 });
      expect(response.category).toBe('PASSIVE');

      // Test detractor (0-6)
      vi.mocked(prisma.nPSResponse.create).mockResolvedValue({
        id: 'nps-3', userId: mockUserId, score: 5, category: 'DETRACTOR', feedback: null, context: null, createdAt: new Date(),
      } as never);
      response = await service.recordNPSResponse(mockUserId, { score: 5 });
      expect(response.category).toBe('DETRACTOR');
    });

    it('should calculate NPS summary', async () => {
      const mockResponses = [
        { id: '1', userId: 'user-1', score: 10, category: 'PROMOTER', feedback: null, context: null, createdAt: new Date() },
        { id: '2', userId: 'user-2', score: 9, category: 'PROMOTER', feedback: null, context: null, createdAt: new Date() },
        { id: '3', userId: 'user-3', score: 8, category: 'PASSIVE', feedback: null, context: null, createdAt: new Date() },
        { id: '4', userId: 'user-4', score: 5, category: 'DETRACTOR', feedback: null, context: null, createdAt: new Date() },
      ];

      vi.mocked(prisma.nPSResponse.findMany).mockResolvedValue(mockResponses as never);

      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = new Date();
      const summary = await service.getNPSSummary(startDate, endDate);

      expect(summary.totalResponses).toBe(4);
      expect(summary.distribution.promoters).toBe(2);
      expect(summary.distribution.passives).toBe(1);
      expect(summary.distribution.detractors).toBe(1);
      expect(summary.npsScore).toBe(25); // (50% promoters - 25% detractors) = 25
    });

    it('should check if user should be prompted for NPS', async () => {
      // No previous response - should prompt
      vi.mocked(prisma.nPSResponse.findFirst).mockResolvedValue(null as never);
      let shouldPrompt = await service.shouldPromptNPS(mockUserId);
      expect(shouldPrompt).toBe(true);

      // Recent response - should not prompt
      vi.mocked(prisma.nPSResponse.findFirst).mockResolvedValue({
        id: 'nps-1', userId: mockUserId, score: 8, category: 'PASSIVE', feedback: null, context: null, createdAt: new Date(),
      } as never);
      shouldPrompt = await service.shouldPromptNPS(mockUserId);
      expect(shouldPrompt).toBe(false);
    });
  });

  describe('Milestones', () => {
    it('should award milestone on first transformation', async () => {
      vi.mocked(prisma.userActivity.count).mockResolvedValue(1 as never);
      vi.mocked(prisma.milestone.findFirst).mockResolvedValue(null as never);
      vi.mocked(prisma.milestone.create).mockResolvedValue({
        id: 'milestone-1',
        userId: mockUserId,
        milestoneType: 'FIRST_TRANSFORMATION',
        achievedAt: new Date(),
        celebratedAt: null,
        metadata: {},
      } as never);
      vi.mocked(prisma.userActivity.create).mockResolvedValue({
        id: 'activity-1', userId: mockUserId, activityType: 'TRANSFORMATION', featureName: null, metadata: {}, createdAt: new Date(),
      } as never);

      await service.recordActivity(mockUserId, { activityType: 'TRANSFORMATION' });

      expect(prisma.milestone.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: mockUserId,
            milestoneType: 'FIRST_TRANSFORMATION',
          }),
        })
      );
    });

    it('should get uncelebrated milestones', async () => {
      const mockMilestones = [
        { id: '1', userId: mockUserId, milestoneType: 'FIRST_TRANSFORMATION', achievedAt: new Date(), celebratedAt: null, metadata: {} },
        { id: '2', userId: mockUserId, milestoneType: 'TENTH_TRANSFORMATION', achievedAt: new Date(), celebratedAt: null, metadata: {} },
      ];

      vi.mocked(prisma.milestone.findMany).mockResolvedValue(mockMilestones as never);

      const celebrations = await service.getUncelebratedMilestones(mockUserId);

      expect(celebrations).toHaveLength(2);
      expect(celebrations[0].title).toBeDefined();
      expect(celebrations[0].message).toBeDefined();
    });

    it('should mark milestone as celebrated', async () => {
      const mockMilestone = {
        id: 'milestone-1',
        userId: mockUserId,
        milestoneType: 'FIRST_TRANSFORMATION',
        achievedAt: new Date(),
        celebratedAt: new Date(),
        metadata: {},
      };

      vi.mocked(prisma.milestone.update).mockResolvedValue(mockMilestone as never);

      const milestone = await service.celebrateMilestone('milestone-1');

      expect(milestone.celebratedAt).toBeDefined();
    });
  });

  describe('Customer Health Score', () => {
    it('should calculate customer health score', async () => {
      const now = new Date();
      const mockActivities = [
        { id: '1', userId: mockUserId, activityType: 'LOGIN', featureName: null, metadata: {}, createdAt: now },
        { id: '2', userId: mockUserId, activityType: 'TRANSFORMATION', featureName: 'humanize', metadata: {}, createdAt: now },
      ];
      const mockSteps = [
        { id: '1', userId: mockUserId, stepType: 'ACCOUNT_SETUP', status: 'COMPLETED', startedAt: null, completedAt: now, skippedAt: null, metadata: {}, createdAt: now, updatedAt: now },
      ];

      vi.mocked(prisma.userActivity.findMany).mockResolvedValue(mockActivities as never);
      vi.mocked(prisma.project.count).mockResolvedValue(1 as never);
      vi.mocked(prisma.userActivity.findFirst).mockResolvedValue(mockActivities[0] as never);
      vi.mocked(prisma.userActivity.count).mockResolvedValue(0 as never);
      vi.mocked(prisma.onboardingStep.findMany).mockResolvedValue(mockSteps as never);
      vi.mocked(prisma.churnRiskAssessment.upsert).mockResolvedValue({
        id: 'assessment-1', userId: mockUserId, riskLevel: 'LOW', riskScore: 20, factors: [], predictedChurnDate: null, recommendedActions: [], createdAt: now, updatedAt: now,
      } as never);
      vi.mocked(prisma.nPSResponse.findFirst).mockResolvedValue({
        id: 'nps-1', userId: mockUserId, score: 8, category: 'PASSIVE', feedback: null, context: null, createdAt: now,
      } as never);

      const healthScore = await service.getCustomerHealthScore(mockUserId);

      expect(healthScore.userId).toBe(mockUserId);
      expect(healthScore.overallScore).toBeGreaterThanOrEqual(0);
      expect(healthScore.overallScore).toBeLessThanOrEqual(100);
      expect(healthScore.components).toHaveProperty('engagement');
      expect(healthScore.components).toHaveProperty('adoption');
      expect(healthScore.components).toHaveProperty('satisfaction');
      expect(healthScore.components).toHaveProperty('growth');
      expect(['HEALTHY', 'AT_RISK', 'CRITICAL']).toContain(healthScore.status);
    });
  });
});
