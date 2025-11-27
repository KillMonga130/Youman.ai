/**
 * Webhook Routes
 * API endpoints for webhook management
 * Requirements: 51
 */

import { Router, Request, Response, NextFunction } from 'express';
import { webhookService } from './webhook.service';
import { RegisterWebhookOptions, UpdateWebhookOptions, WebhookEventType, WebhookLogFilter } from './types';
import { logger } from '../utils/logger';

const router = Router();

/** Valid event types for validation */
const VALID_EVENT_TYPES: WebhookEventType[] = [
  'project.created',
  'project.updated',
  'project.deleted',
  'transformation.started',
  'transformation.completed',
  'transformation.failed',
  'detection.completed',
  'batch.started',
  'batch.completed',
  'batch.failed',
  'version.created',
  'collaboration.invited',
  'collaboration.joined',
];

/**
 * POST /api/webhooks
 * Registers a new webhook
 * Requirement 51: Support HTTP POST notifications to user-specified endpoints
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const options = req.body as RegisterWebhookOptions;

    // Validate required fields
    if (!options.userId || typeof options.userId !== 'string') {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'User ID is required',
      });
    }

    if (!options.name || typeof options.name !== 'string') {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Webhook name is required',
      });
    }

    if (!options.url || typeof options.url !== 'string') {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Webhook URL is required',
      });
    }

    if (!options.events || !Array.isArray(options.events) || options.events.length === 0) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'At least one event type must be specified',
      });
    }

    // Validate event types
    const invalidEvents = options.events.filter(e => !VALID_EVENT_TYPES.includes(e));
    if (invalidEvents.length > 0) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: `Invalid event types: ${invalidEvents.join(', ')}`,
        validEventTypes: VALID_EVENT_TYPES,
      });
    }

    const webhook = await webhookService.registerWebhook(options);

    return res.status(201).json({
      success: true,
      data: {
        id: webhook.id,
        name: webhook.name,
        url: webhook.url,
        events: webhook.events,
        secret: webhook.secret, // Only returned on creation
        status: webhook.status,
        enabled: webhook.enabled,
        createdAt: webhook.createdAt,
      },
    });
  } catch (error) {
    logger.error('Error registering webhook:', error);
    return next(error);
  }
});

/**
 * GET /api/webhooks
 * Gets all webhooks for a user
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.query.userId as string;

    if (!userId) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'User ID is required',
      });
    }

    const webhooks = webhookService.getWebhooksByUser(userId);

    return res.json({
      success: true,
      data: {
        webhooks: webhooks.map(wh => ({
          id: wh.id,
          name: wh.name,
          url: wh.url,
          events: wh.events,
          status: wh.status,
          enabled: wh.enabled,
          deliveryCount: wh.deliveryCount,
          failedCount: wh.failedCount,
          successRate: wh.successRate,
          lastDeliveryAt: wh.lastDeliveryAt,
          createdAt: wh.createdAt,
          updatedAt: wh.updatedAt,
        })),
        count: webhooks.length,
      },
    });
  } catch (error) {
    logger.error('Error getting webhooks:', error);
    return next(error);
  }
});

/**
 * GET /api/webhooks/:webhookId
 * Gets a webhook by ID
 */
router.get('/:webhookId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const webhookId = req.params.webhookId as string;

    const webhook = await webhookService.getWebhook(webhookId);

    if (!webhook) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: `Webhook not found: ${webhookId}`,
      });
    }

    return res.json({
      success: true,
      data: {
        id: webhook.id,
        name: webhook.name,
        url: webhook.url,
        events: webhook.events,
        status: webhook.status,
        enabled: webhook.enabled,
        headers: webhook.headers,
        deliveryCount: webhook.deliveryCount,
        failedCount: webhook.failedCount,
        successRate: webhook.successRate,
        lastDeliveryAt: webhook.lastDeliveryAt,
        createdAt: webhook.createdAt,
        updatedAt: webhook.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Error getting webhook:', error);
    return next(error);
  }
});

/**
 * PATCH /api/webhooks/:webhookId
 * Updates a webhook
 */
router.patch('/:webhookId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const webhookId = req.params.webhookId as string;
    const options = req.body as UpdateWebhookOptions;

    // Validate event types if provided
    if (options.events) {
      if (!Array.isArray(options.events) || options.events.length === 0) {
        return res.status(400).json({
          error: 'INVALID_INPUT',
          message: 'At least one event type must be specified',
        });
      }

      const invalidEvents = options.events.filter(e => !VALID_EVENT_TYPES.includes(e));
      if (invalidEvents.length > 0) {
        return res.status(400).json({
          error: 'INVALID_INPUT',
          message: `Invalid event types: ${invalidEvents.join(', ')}`,
          validEventTypes: VALID_EVENT_TYPES,
        });
      }
    }

    const webhook = await webhookService.updateWebhook(webhookId, options);

    return res.json({
      success: true,
      data: {
        id: webhook.id,
        name: webhook.name,
        url: webhook.url,
        events: webhook.events,
        status: webhook.status,
        enabled: webhook.enabled,
        updatedAt: webhook.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Error updating webhook:', error);
    return next(error);
  }
});

/**
 * DELETE /api/webhooks/:webhookId
 * Deletes a webhook
 */
router.delete('/:webhookId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const webhookId = req.params.webhookId as string;

    await webhookService.deleteWebhook(webhookId);

    return res.json({
      success: true,
      message: 'Webhook deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting webhook:', error);
    return next(error);
  }
});

/**
 * GET /api/webhooks/:webhookId/logs
 * Gets webhook delivery logs
 * Requirement 51: Create webhook logs and monitoring
 */
router.get('/:webhookId/logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const webhookId = req.params.webhookId as string;

    const filter: WebhookLogFilter = {};

    if (req.query.eventType) {
      filter.eventType = req.query.eventType as WebhookEventType;
    }
    if (req.query.status) {
      filter.status = req.query.status as any;
    }
    if (req.query.startDate) {
      filter.startDate = new Date(req.query.startDate as string);
    }
    if (req.query.endDate) {
      filter.endDate = new Date(req.query.endDate as string);
    }
    if (req.query.limit) {
      filter.limit = parseInt(req.query.limit as string, 10);
    }
    if (req.query.offset) {
      filter.offset = parseInt(req.query.offset as string, 10);
    }

    const logs = await webhookService.getWebhookLogs(webhookId, filter);

    return res.json({
      success: true,
      data: {
        logs,
        count: logs.length,
      },
    });
  } catch (error) {
    logger.error('Error getting webhook logs:', error);
    return next(error);
  }
});

/**
 * GET /api/webhooks/:webhookId/stats
 * Gets webhook statistics
 */
router.get('/:webhookId/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const webhookId = req.params.webhookId as string;

    const stats = await webhookService.getWebhookStats(webhookId);

    return res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Error getting webhook stats:', error);
    return next(error);
  }
});

/**
 * POST /api/webhooks/:webhookId/test
 * Sends a test event to a webhook
 */
router.post('/:webhookId/test', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const webhookId = req.params.webhookId as string;

    const webhook = await webhookService.getWebhook(webhookId);
    if (!webhook) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: `Webhook not found: ${webhookId}`,
      });
    }

    // Create a test event
    const testEvent = {
      id: `evt_test_${Date.now()}`,
      type: 'project.created' as WebhookEventType,
      timestamp: new Date(),
      userId: webhook.userId,
      projectId: 'test_project_123',
      data: {
        test: true,
        message: 'This is a test webhook delivery',
      },
      apiVersion: '2024-01-01',
    };

    const result = await webhookService.deliverWebhook(webhookId, testEvent);

    return res.json({
      success: result.success,
      data: {
        deliveryId: result.deliveryId,
        statusCode: result.statusCode,
        durationMs: result.durationMs,
        error: result.error,
      },
    });
  } catch (error) {
    logger.error('Error testing webhook:', error);
    return next(error);
  }
});

/**
 * POST /api/webhooks/:webhookId/retry/:deliveryId
 * Retries a failed webhook delivery
 * Requirement 51: Retry up to 5 times with exponential backoff
 */
router.post('/:webhookId/retry/:deliveryId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deliveryId = req.params.deliveryId as string;

    await webhookService.retryFailedWebhook(deliveryId);

    return res.json({
      success: true,
      message: 'Retry scheduled successfully',
    });
  } catch (error) {
    logger.error('Error retrying webhook:', error);
    return next(error);
  }
});

/**
 * POST /api/webhooks/verify
 * Verifies a webhook signature (utility endpoint for clients)
 * Requirement 51: Sign payloads with HMAC signatures for verification
 */
router.post('/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { payload, signature, secret, timestamp } = req.body;

    if (!payload || !signature || !secret || !timestamp) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'payload, signature, secret, and timestamp are required',
      });
    }

    const isValid = webhookService.verifySignature(
      typeof payload === 'string' ? payload : JSON.stringify(payload),
      signature,
      secret,
      parseInt(timestamp, 10)
    );

    return res.json({
      success: true,
      data: {
        valid: isValid,
      },
    });
  } catch (error) {
    logger.error('Error verifying signature:', error);
    return next(error);
  }
});

/**
 * GET /api/webhooks/events
 * Gets list of available event types
 * Requirement 51: Support event filtering to send only specified event types
 */
router.get('/events/types', async (_req: Request, res: Response) => {
  return res.json({
    success: true,
    data: {
      eventTypes: VALID_EVENT_TYPES,
    },
  });
});

export { router as webhookRoutes };
