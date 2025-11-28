/**
 * Content Moderation Routes
 * API endpoints for content scanning, flagging, review, policy enforcement, and abuse detection
 * Requirements: 97 - Content moderation features
 */

import { Router, Request, Response, NextFunction } from 'express';
import { contentModerationService, ContentModerationError } from './content-moderation.service';
import {
  scanContentSchema,
  flagContentSchema,
  reviewContentSchema,
  submitAppealSchema,
  reviewAppealSchema,
  createPolicySchema,
  reportAbuseSchema,
} from './types';

const router = Router();

/**
 * Error handler middleware
 */
const handleError = (error: unknown, res: Response): void => {
  if (error instanceof ContentModerationError) {
    res.status(400).json({ error: error.message, code: error.code });
  } else if (error instanceof Error) {
    res.status(500).json({ error: error.message });
  } else {
    res.status(500).json({ error: 'An unexpected error occurred' });
  }
};

/**
 * POST /api/moderation/scan
 * Scan content for policy violations
 */
router.post('/scan', async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const userId = req.user?.id ?? 'anonymous';
    const input = scanContentSchema.parse(req.body);
    const result = await contentModerationService.scanContent(userId, input);
    res.json(result);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * POST /api/moderation/flag
 * Flag content for review
 */
router.post('/flag', async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const input = flagContentSchema.parse(req.body);
    const result = await contentModerationService.flagContent(userId, input);
    res.json(result);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * GET /api/moderation/flags/:contentId
 * Get flags for specific content
 */
router.get('/flags/:contentId', async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { contentId } = req.params;
    const flags = await contentModerationService.getContentFlags(contentId);
    res.json(flags);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * POST /api/moderation/review
 * Review flagged content
 */
router.post('/review', async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const reviewerId = req.user?.id;
    if (!reviewerId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const input = reviewContentSchema.parse(req.body);
    const result = await contentModerationService.reviewContent(reviewerId, input);
    res.json(result);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * GET /api/moderation/queue
 * Get moderation queue
 */
router.get('/queue', async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { status, severity, assignedTo, limit, offset } = req.query;
    const queue = await contentModerationService.getModerationQueue({
      status: status as string | undefined,
      severity: severity as string | undefined,
      assignedTo: assignedTo as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });
    res.json(queue);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * POST /api/moderation/queue/:flagId/assign
 * Assign flag to reviewer
 */
router.post('/queue/:flagId/assign', async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const reviewerId = req.user?.id;
    if (!reviewerId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const { flagId } = req.params;
    const result = await contentModerationService.assignToReviewer(flagId, reviewerId);
    res.json(result);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * POST /api/moderation/policies
 * Create a moderation policy
 */
router.post('/policies', async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const input = createPolicySchema.parse(req.body);
    const result = await contentModerationService.createPolicy(userId, input);
    res.json(result);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * GET /api/moderation/policies
 * Get active policies
 */
router.get('/policies', async (_req: Request, res: Response, _next: NextFunction) => {
  try {
    const policies = await contentModerationService.getActivePolicies();
    res.json(policies);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * PUT /api/moderation/policies/:policyId
 * Update a policy
 */
router.put('/policies/:policyId', async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { policyId } = req.params;
    const updates = createPolicySchema.partial().parse(req.body);
    const result = await contentModerationService.updatePolicy(policyId, updates);
    res.json(result);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * POST /api/moderation/appeals
 * Submit an appeal
 */
router.post('/appeals', async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const input = submitAppealSchema.parse(req.body);
    const result = await contentModerationService.submitAppeal(userId, input);
    res.json(result);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * POST /api/moderation/appeals/:appealId/review
 * Review an appeal
 */
router.post('/appeals/:appealId/review', async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const reviewerId = req.user?.id;
    if (!reviewerId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const { appealId } = req.params;
    const input = reviewAppealSchema.parse({ ...req.body, appealId });
    const result = await contentModerationService.reviewAppeal(reviewerId, input);
    res.json(result);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * GET /api/moderation/appeals/pending
 * Get pending appeals
 */
router.get('/appeals/pending', async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const appeals = await contentModerationService.getPendingAppeals(limit);
    res.json(appeals);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * POST /api/moderation/abuse/detect/:userId
 * Detect abuse patterns for a user
 */
router.post('/abuse/detect/:userId', async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { userId } = req.params;
    const result = await contentModerationService.detectAbuse(userId);
    res.json(result);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * POST /api/moderation/abuse/report
 * Report abuse
 */
router.post('/abuse/report', async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const reporterId = req.user?.id ?? null;
    const input = reportAbuseSchema.parse(req.body);
    const result = await contentModerationService.reportAbuse(reporterId, input);
    res.json(result);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * GET /api/moderation/stats
 * Get moderation statistics
 */
router.get('/stats', async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();
    const stats = await contentModerationService.getModerationStats(start, end);
    res.json(stats);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * GET /api/moderation/history/:userId
 * Get user moderation history
 */
router.get('/history/:userId', async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { userId } = req.params;
    const history = await contentModerationService.getUserModerationHistory(userId);
    res.json(history);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * GET /api/moderation/audit
 * Get audit logs
 */
router.get('/audit', async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { action, actorId, targetUserId, startDate, endDate, limit } = req.query;
    const logs = await contentModerationService.getAuditLogs({
      action: action as string | undefined,
      actorId: actorId as string | undefined,
      targetUserId: targetUserId as string | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });
    res.json(logs);
  } catch (error) {
    handleError(error, res);
  }
});

export default router;
