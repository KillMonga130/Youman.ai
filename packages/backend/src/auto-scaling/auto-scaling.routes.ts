/**
 * Auto-Scaling Routes
 * API endpoints for auto-scaling management
 * Requirements: 91 - Auto-scaling and resource optimization
 */

import { Router, Request, Response } from 'express';
import { autoScalingService } from './auto-scaling.service';
import { ConfigureScalingPolicyRequest, ScaleRequest } from './types';

const router = Router();

/**
 * GET /auto-scaling/:serviceId/status
 * Get auto-scaling status for a service
 */
router.get('/:serviceId/status', async (req: Request, res: Response) => {
  try {
    const serviceId = req.params.serviceId;
    if (!serviceId) {
      return res.status(400).json({ error: 'serviceId is required' });
    }
    const status = await autoScalingService.getStatus(serviceId);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /auto-scaling/:serviceId/metrics
 * Get current resource metrics for a service
 */
router.get('/:serviceId/metrics', async (req: Request, res: Response) => {
  try {
    const serviceId = req.params.serviceId;
    if (!serviceId) {
      return res.status(400).json({ error: 'serviceId is required' });
    }
    const metrics = await autoScalingService.getMetrics(serviceId);
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /auto-scaling/:serviceId/policy
 * Get scaling policy for a service
 */
router.get('/:serviceId/policy', async (req: Request, res: Response) => {
  try {
    const serviceId = req.params.serviceId;
    if (!serviceId) {
      return res.status(400).json({ error: 'serviceId is required' });
    }
    const policy = await autoScalingService.getScalingPolicy(serviceId);
    if (!policy) {
      return res.status(404).json({ error: 'Scaling policy not found' });
    }
    res.json(policy);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /auto-scaling/:serviceId/policy
 * Configure scaling policy for a service
 */
router.post('/:serviceId/policy', async (req: Request, res: Response) => {
  try {
    const serviceId = req.params.serviceId;
    if (!serviceId) {
      return res.status(400).json({ error: 'serviceId is required' });
    }
    const policyConfig = req.body as ConfigureScalingPolicyRequest['policy'];
    const policy = await autoScalingService.configureScalingPolicy(serviceId, policyConfig);
    res.status(201).json(policy);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

/**
 * POST /auto-scaling/:serviceId/scale-up
 * Manually scale up a service
 */
router.post('/:serviceId/scale-up', async (req: Request, res: Response) => {
  try {
    const serviceId = req.params.serviceId;
    if (!serviceId) {
      return res.status(400).json({ error: 'serviceId is required' });
    }
    const { reason } = req.body as ScaleRequest;
    const event = await autoScalingService.scaleUp(serviceId, reason || 'Manual scale up');
    res.json(event);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

/**
 * POST /auto-scaling/:serviceId/scale-down
 * Manually scale down a service
 */
router.post('/:serviceId/scale-down', async (req: Request, res: Response) => {
  try {
    const serviceId = req.params.serviceId;
    if (!serviceId) {
      return res.status(400).json({ error: 'serviceId is required' });
    }
    const event = await autoScalingService.scaleDown(serviceId);
    res.json(event);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

/**
 * GET /auto-scaling/:serviceId/prediction
 * Get load prediction for a service
 */
router.get('/:serviceId/prediction', async (req: Request, res: Response) => {
  try {
    const serviceId = req.params.serviceId;
    if (!serviceId) {
      return res.status(400).json({ error: 'serviceId is required' });
    }
    const hoursAhead = parseInt(req.query.hoursAhead as string) || 24;
    const prediction = await autoScalingService.predictLoad(serviceId, hoursAhead);
    res.json(prediction);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /auto-scaling/:serviceId/cost-optimization
 * Get cost optimization recommendations for a service
 */
router.get('/:serviceId/cost-optimization', async (req: Request, res: Response) => {
  try {
    const serviceId = req.params.serviceId;
    if (!serviceId) {
      return res.status(400).json({ error: 'serviceId is required' });
    }
    const optimization = await autoScalingService.optimizeCosts(serviceId);
    res.json(optimization);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /auto-scaling/:serviceId/events
 * Get scaling events for a service
 */
router.get('/:serviceId/events', async (req: Request, res: Response) => {
  try {
    const serviceId = req.params.serviceId;
    if (!serviceId) {
      return res.status(400).json({ error: 'serviceId is required' });
    }
    const limit = parseInt(req.query.limit as string) || 100;
    const events = await autoScalingService.getScalingEvents(serviceId, limit);
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /auto-scaling/:serviceId/decision
 * Get scaling decision for a service
 */
router.get('/:serviceId/decision', async (req: Request, res: Response) => {
  try {
    const serviceId = req.params.serviceId;
    if (!serviceId) {
      return res.status(400).json({ error: 'serviceId is required' });
    }
    const decision = await autoScalingService.makeScalingDecision(serviceId);
    res.json(decision);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /auto-scaling/:serviceId/alerts/:alertId/acknowledge
 * Acknowledge an alert
 */
router.post('/:serviceId/alerts/:alertId/acknowledge', async (req: Request, res: Response) => {
  try {
    const { serviceId, alertId } = req.params;
    if (!serviceId || !alertId) {
      return res.status(400).json({ error: 'serviceId and alertId are required' });
    }
    await autoScalingService.acknowledgeAlert(serviceId, alertId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /auto-scaling/:serviceId/alerts/:alertId/resolve
 * Resolve an alert
 */
router.post('/:serviceId/alerts/:alertId/resolve', async (req: Request, res: Response) => {
  try {
    const { serviceId, alertId } = req.params;
    if (!serviceId || !alertId) {
      return res.status(400).json({ error: 'serviceId and alertId are required' });
    }
    await autoScalingService.resolveAlert(serviceId, alertId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /auto-scaling/:serviceId/register
 * Register a service for auto-scaling
 */
router.post('/:serviceId/register', async (req: Request, res: Response) => {
  try {
    const serviceId = req.params.serviceId;
    if (!serviceId) {
      return res.status(400).json({ error: 'serviceId is required' });
    }
    const config = { ...req.body, id: serviceId };
    await autoScalingService.registerService(config);
    res.status(201).json({ success: true, serviceId });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

export default router;
