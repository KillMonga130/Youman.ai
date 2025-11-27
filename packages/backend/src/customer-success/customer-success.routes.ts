/**
 * Customer Success Routes
 * API endpoints for onboarding, engagement, churn risk, retention, NPS, and milestones
 * Requirements: 96 - Customer success tools
 */

import { Router, Request, Response } from 'express';
import { customerSuccessService, CustomerSuccessError } from './customer-success.service';
import {
  updateOnboardingStepSchema,
  recordActivitySchema,
  npsResponseSchema,
  triggerCampaignSchema,
} from './types';
import { z } from 'zod';

const router = Router();

/**
 * Error handler for customer success routes
 */
function handleError(error: unknown, res: Response): void {
  if (error instanceof CustomerSuccessError) {
    const statusMap: Record<string, number> = {
      CAMPAIGNS_DISABLED: 503,
      NPS_DISABLED: 503,
      NOT_FOUND: 404,
      UNAUTHORIZED: 401,
    };
    const status = statusMap[error.code] || 400;
    res.status(status).json({ error: error.message, code: error.code });
  } else if (error instanceof z.ZodError) {
    res.status(400).json({ error: 'Validation error', details: error.errors });
  } else {
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ============================================
// Onboarding Routes
// ============================================

/**
 * POST /api/customer-success/onboarding/initialize
 * Initialize onboarding for current user
 */
router.post('/onboarding/initialize', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const progress = await customerSuccessService.initializeOnboarding(userId);
    res.json({ progress });
  } catch (error) {
    handleError(error, res);
  }
});


/**
 * GET /api/customer-success/onboarding/progress
 * Get onboarding progress for current user
 */
router.get('/onboarding/progress', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const progress = await customerSuccessService.getOnboardingProgress(userId);
    res.json({ progress });
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * PATCH /api/customer-success/onboarding/step
 * Update onboarding step status
 */
router.patch('/onboarding/step', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const input = updateOnboardingStepSchema.parse(req.body);
    const step = await customerSuccessService.updateOnboardingStep(userId, input);
    res.json({ step });
  } catch (error) {
    handleError(error, res);
  }
});

// ============================================
// Activity & Engagement Routes
// ============================================

/**
 * POST /api/customer-success/activity
 * Record user activity
 */
router.post('/activity', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const input = recordActivitySchema.parse(req.body);
    const activity = await customerSuccessService.recordActivity(userId, input);
    res.json({ activity });
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * GET /api/customer-success/engagement
 * Get engagement metrics for current user
 */
router.get('/engagement', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const metrics = await customerSuccessService.getEngagementMetrics(userId);
    res.json({ metrics });
  } catch (error) {
    handleError(error, res);
  }
});

// ============================================
// Churn Risk Routes
// ============================================

/**
 * GET /api/customer-success/churn-risk
 * Get churn risk assessment for current user
 */
router.get('/churn-risk', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const assessment = await customerSuccessService.assessChurnRisk(userId);
    res.json({ assessment });
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * GET /api/customer-success/churn-risk/:userId (admin)
 * Get churn risk assessment for a specific user
 */
router.get('/churn-risk/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    if (!userId) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    const assessment = await customerSuccessService.assessChurnRisk(userId);
    res.json({ assessment });
  } catch (error) {
    handleError(error, res);
  }
});

// ============================================
// Retention Campaign Routes
// ============================================

/**
 * POST /api/customer-success/campaigns
 * Trigger a retention campaign
 */
router.post('/campaigns', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.body.userId || (req as Request & { user?: { id: string } }).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const input = triggerCampaignSchema.parse(req.body);
    const campaign = await customerSuccessService.triggerRetentionCampaign(userId, input);
    res.status(201).json({ campaign });
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * GET /api/customer-success/campaigns
 * Get campaigns for current user
 */
router.get('/campaigns', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const campaigns = await customerSuccessService.getUserCampaigns(userId);
    res.json({ campaigns });
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * PATCH /api/customer-success/campaigns/:id/status
 * Update campaign status
 */
router.patch('/campaigns/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id) {
      res.status(400).json({ error: 'Campaign ID is required' });
      return;
    }

    const validStatuses = ['PENDING', 'SENT', 'OPENED', 'CLICKED', 'CONVERTED', 'FAILED'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const campaign = await customerSuccessService.updateCampaignStatus(id, status);
    res.json({ campaign });
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * GET /api/customer-success/campaigns/pending
 * Get pending campaigns (admin)
 */
router.get('/campaigns/pending', async (_req: Request, res: Response): Promise<void> => {
  try {
    const campaigns = await customerSuccessService.getPendingCampaigns();
    res.json({ campaigns });
  } catch (error) {
    handleError(error, res);
  }
});


// ============================================
// NPS Routes
// ============================================

/**
 * POST /api/customer-success/nps
 * Record NPS response
 */
router.post('/nps', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const input = npsResponseSchema.parse(req.body);
    const response = await customerSuccessService.recordNPSResponse(userId, input);
    res.status(201).json({ response });
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * GET /api/customer-success/nps/should-prompt
 * Check if user should be prompted for NPS
 */
router.get('/nps/should-prompt', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const shouldPrompt = await customerSuccessService.shouldPromptNPS(userId);
    res.json({ shouldPrompt });
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * GET /api/customer-success/nps/summary
 * Get NPS summary for a period (admin)
 */
router.get('/nps/summary', async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate
      ? new Date(startDate as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const summary = await customerSuccessService.getNPSSummary(start, end);
    res.json({ summary });
  } catch (error) {
    handleError(error, res);
  }
});

// ============================================
// Milestone Routes
// ============================================

/**
 * GET /api/customer-success/milestones
 * Get all milestones for current user
 */
router.get('/milestones', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const milestones = await customerSuccessService.getUserMilestones(userId);
    res.json({ milestones });
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * GET /api/customer-success/milestones/uncelebrated
 * Get uncelebrated milestones for current user
 */
router.get('/milestones/uncelebrated', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const celebrations = await customerSuccessService.getUncelebratedMilestones(userId);
    res.json({ celebrations });
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * GET /api/customer-success/milestones/:id/celebration
 * Get milestone celebration details
 */
router.get('/milestones/:id/celebration', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: 'Milestone ID is required' });
      return;
    }

    const celebration = await customerSuccessService.getMilestoneCelebration(id);
    if (!celebration) {
      res.status(404).json({ error: 'Milestone not found' });
      return;
    }

    res.json({ celebration });
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * POST /api/customer-success/milestones/:id/celebrate
 * Mark milestone as celebrated
 */
router.post('/milestones/:id/celebrate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: 'Milestone ID is required' });
      return;
    }

    const milestone = await customerSuccessService.celebrateMilestone(id);
    res.json({ milestone });
  } catch (error) {
    handleError(error, res);
  }
});

// ============================================
// Health Score Routes
// ============================================

/**
 * GET /api/customer-success/health-score
 * Get customer health score for current user
 */
router.get('/health-score', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const healthScore = await customerSuccessService.getCustomerHealthScore(userId);
    res.json({ healthScore });
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * GET /api/customer-success/health-score/:userId (admin)
 * Get customer health score for a specific user
 */
router.get('/health-score/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    if (!userId) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    const healthScore = await customerSuccessService.getCustomerHealthScore(userId);
    res.json({ healthScore });
  } catch (error) {
    handleError(error, res);
  }
});

export default router;
