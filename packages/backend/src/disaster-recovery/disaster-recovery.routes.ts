/**
 * Disaster Recovery Routes
 * API endpoints for backup, recovery, replication, and failover management
 * Requirements: 92 - Disaster recovery and business continuity
 */

import { Router, Request, Response } from 'express';
import { disasterRecoveryService } from './disaster-recovery.service';
import { CreateBackupRequest, RestoreRequest, FailoverRequest, ConfigureReplicationRequest } from './types';

const router = Router();

// Status
router.get('/status', async (_req: Request, res: Response): Promise<void> => {
  try {
    const status = await disasterRecoveryService.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Backup endpoints
router.post('/backups', async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, description } = req.body as CreateBackupRequest;
    if (!type || !['full', 'incremental', 'differential'].includes(type)) {
      res.status(400).json({ error: 'Valid backup type is required (full, incremental, differential)' });
      return;
    }
    const backup = await disasterRecoveryService.createBackup(type, description);
    res.status(201).json(backup);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/backups', async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const backups = await disasterRecoveryService.listBackups(limit);
    res.json(backups);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/backups/:backupId', async (req: Request, res: Response): Promise<void> => {
  try {
    const backup = await disasterRecoveryService.getBackup(req.params.backupId);
    if (!backup) {
      res.status(404).json({ error: 'Backup not found' });
      return;
    }
    res.json(backup);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/backups/:backupId/verify', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await disasterRecoveryService.verifyBackup(req.params.backupId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.delete('/backups/:backupId', async (req: Request, res: Response): Promise<void> => {
  try {
    await disasterRecoveryService.deleteBackup(req.params.backupId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Recovery endpoints
router.get('/recovery-points', async (req: Request, res: Response): Promise<void> => {
  try {
    const startTime = req.query.startTime ? new Date(req.query.startTime as string) : undefined;
    const endTime = req.query.endTime ? new Date(req.query.endTime as string) : undefined;
    const points = await disasterRecoveryService.getRecoveryPoints(startTime, endTime);
    res.json(points);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/restore', async (req: Request, res: Response): Promise<void> => {
  try {
    const { backupId, pointInTime, validateOnly } = req.body as RestoreRequest;
    
    let request;
    if (backupId) {
      request = await disasterRecoveryService.restoreFromBackup(backupId, validateOnly);
    } else if (pointInTime) {
      request = await disasterRecoveryService.restoreToPointInTime(new Date(pointInTime), validateOnly);
    } else {
      res.status(400).json({ error: 'Either backupId or pointInTime is required' });
      return;
    }
    
    res.status(201).json(request);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.get('/restore/:requestId', async (req: Request, res: Response): Promise<void> => {
  try {
    const request = await disasterRecoveryService.getRecoveryRequest(req.params.requestId);
    if (!request) {
      res.status(404).json({ error: 'Recovery request not found' });
      return;
    }
    res.json(request);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Replication endpoints
router.post('/replication', async (req: Request, res: Response): Promise<void> => {
  try {
    const config = req.body as ConfigureReplicationRequest;
    if (!config.sourceRegion || !config.targetRegions || !config.mode) {
      res.status(400).json({ error: 'sourceRegion, targetRegions, and mode are required' });
      return;
    }
    const result = await disasterRecoveryService.configureReplication({
      ...config,
      enabled: config.enabled ?? true,
      lagThresholdMs: config.lagThresholdMs ?? 5000,
    });
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.get('/replication/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const configId = req.query.configId as string | undefined;
    const statuses = await disasterRecoveryService.getReplicationStatus(configId);
    res.json(statuses);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/replication/:configId/pause', async (req: Request, res: Response): Promise<void> => {
  try {
    await disasterRecoveryService.pauseReplication(req.params.configId);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.post('/replication/:configId/resume', async (req: Request, res: Response): Promise<void> => {
  try {
    await disasterRecoveryService.resumeReplication(req.params.configId);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Failover endpoints
router.post('/failover/config', async (req: Request, res: Response): Promise<void> => {
  try {
    const config = req.body;
    if (!config.primaryRegion || !config.failoverRegions) {
      res.status(400).json({ error: 'primaryRegion and failoverRegions are required' });
      return;
    }
    const result = await disasterRecoveryService.configureFailover(config);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.post('/failover/:configId/initiate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { targetRegion, reason, force } = req.body as FailoverRequest;
    if (!targetRegion || !reason) {
      res.status(400).json({ error: 'targetRegion and reason are required' });
      return;
    }
    const event = await disasterRecoveryService.initiateFailover(
      req.params.configId, targetRegion, reason, force
    );
    res.status(201).json(event);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.post('/failover/events/:eventId/rollback', async (req: Request, res: Response): Promise<void> => {
  try {
    const event = await disasterRecoveryService.rollbackFailover(req.params.eventId);
    res.json(event);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.get('/failover/:configId/events', async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const events = await disasterRecoveryService.getFailoverEvents(req.params.configId, limit);
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Health check endpoints
router.post('/health/:region', async (req: Request, res: Response): Promise<void> => {
  try {
    const healthCheck = await disasterRecoveryService.performHealthCheck(req.params.region);
    res.json(healthCheck);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/health/:region/history', async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const history = await disasterRecoveryService.getHealthHistory(req.params.region, limit);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Recovery test endpoints
router.post('/tests', async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, scheduledTime } = req.body;
    if (!type || !['backup_restore', 'failover', 'replication'].includes(type)) {
      res.status(400).json({ error: 'Valid test type is required (backup_restore, failover, replication)' });
      return;
    }
    const test = await disasterRecoveryService.scheduleRecoveryTest(
      type, 
      scheduledTime ? new Date(scheduledTime) : new Date()
    );
    res.status(201).json(test);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/tests/:testId/run', async (req: Request, res: Response): Promise<void> => {
  try {
    const test = await disasterRecoveryService.runRecoveryTest(req.params.testId);
    res.json(test);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.get('/tests/:testId', async (req: Request, res: Response): Promise<void> => {
  try {
    const test = await disasterRecoveryService.getRecoveryTest(req.params.testId);
    if (!test) {
      res.status(404).json({ error: 'Recovery test not found' });
      return;
    }
    res.json(test);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/tests', async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const tests = await disasterRecoveryService.listRecoveryTests(limit);
    res.json(tests);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Alert endpoints
router.get('/alerts', async (req: Request, res: Response): Promise<void> => {
  try {
    const acknowledged = req.query.acknowledged === 'true' ? true : 
                         req.query.acknowledged === 'false' ? false : undefined;
    const alerts = await disasterRecoveryService.getAlerts(acknowledged);
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/alerts/:alertId/acknowledge', async (req: Request, res: Response): Promise<void> => {
  try {
    await disasterRecoveryService.acknowledgeAlert(req.params.alertId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
