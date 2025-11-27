/**
 * Auto-Scaling Service Tests
 * Tests for CPU/memory-based scaling, queue depth monitoring, predictive scaling,
 * cost optimization, and scaling policy configuration
 * Requirements: 91 - Auto-scaling and resource optimization
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AutoScalingService } from './auto-scaling.service';
import { ScalingPolicy, ServiceConfig, QueueMetrics } from './types';

describe('AutoScalingService', () => {
  let service: AutoScalingService;
  const testServiceId = 'test-service-1';

  beforeEach(() => {
    service = new AutoScalingService();
  });

  describe('configureScalingPolicy', () => {
    it('should create a new scaling policy', async () => {
      const policyConfig = {
        name: 'Test Policy',
        minInstances: 2,
        maxInstances: 10,
        targetCPU: 70,
        targetMemory: 80,
        scaleUpThreshold: 80,
        scaleDownThreshold: 30,
        cooldownPeriod: 300,
        enabled: true,
      };

      const policy = await service.configureScalingPolicy(testServiceId, policyConfig);

      expect(policy.id).toBeDefined();
      expect(policy.serviceId).toBe(testServiceId);
      expect(policy.name).toBe('Test Policy');
      expect(policy.minInstances).toBe(2);
      expect(policy.maxInstances).toBe(10);
      expect(policy.targetCPU).toBe(70);
      expect(policy.targetMemory).toBe(80);
      expect(policy.enabled).toBe(true);
      expect(policy.createdAt).toBeInstanceOf(Date);
      expect(policy.updatedAt).toBeInstanceOf(Date);
    });

    it('should reject invalid minInstances', async () => {
      const policyConfig = {
        name: 'Invalid Policy',
        minInstances: -1,
        maxInstances: 10,
        targetCPU: 70,
        targetMemory: 80,
        scaleUpThreshold: 80,
        scaleDownThreshold: 30,
        cooldownPeriod: 300,
        enabled: true,
      };

      await expect(service.configureScalingPolicy(testServiceId, policyConfig))
        .rejects.toThrow('minInstances must be non-negative');
    });

    it('should reject maxInstances less than minInstances', async () => {
      const policyConfig = {
        name: 'Invalid Policy',
        minInstances: 10,
        maxInstances: 5,
        targetCPU: 70,
        targetMemory: 80,
        scaleUpThreshold: 80,
        scaleDownThreshold: 30,
        cooldownPeriod: 300,
        enabled: true,
      };

      await expect(service.configureScalingPolicy(testServiceId, policyConfig))
        .rejects.toThrow('maxInstances must be greater than or equal to minInstances');
    });

    it('should reject invalid targetCPU', async () => {
      const policyConfig = {
        name: 'Invalid Policy',
        minInstances: 2,
        maxInstances: 10,
        targetCPU: 150,
        targetMemory: 80,
        scaleUpThreshold: 80,
        scaleDownThreshold: 30,
        cooldownPeriod: 300,
        enabled: true,
      };

      await expect(service.configureScalingPolicy(testServiceId, policyConfig))
        .rejects.toThrow('targetCPU must be between 0 and 100');
    });

    it('should update existing policy', async () => {
      const initialPolicy = {
        name: 'Initial Policy',
        minInstances: 2,
        maxInstances: 10,
        targetCPU: 70,
        targetMemory: 80,
        scaleUpThreshold: 80,
        scaleDownThreshold: 30,
        cooldownPeriod: 300,
        enabled: true,
      };

      const policy1 = await service.configureScalingPolicy(testServiceId, initialPolicy);
      
      const updatedPolicy = {
        ...initialPolicy,
        name: 'Updated Policy',
        maxInstances: 20,
      };

      const policy2 = await service.configureScalingPolicy(testServiceId, updatedPolicy);

      expect(policy2.id).toBe(policy1.id);
      expect(policy2.name).toBe('Updated Policy');
      expect(policy2.maxInstances).toBe(20);
      expect(policy2.createdAt).toEqual(policy1.createdAt);
      expect(policy2.updatedAt.getTime()).toBeGreaterThanOrEqual(policy1.updatedAt.getTime());
    });
  });

  describe('scaleUp', () => {
    beforeEach(async () => {
      await service.configureScalingPolicy(testServiceId, {
        name: 'Test Policy',
        minInstances: 1,
        maxInstances: 5,
        targetCPU: 70,
        targetMemory: 80,
        scaleUpThreshold: 80,
        scaleDownThreshold: 30,
        cooldownPeriod: 60,
        enabled: true,
      });
    });

    it('should scale up successfully', async () => {
      const event = await service.scaleUp(testServiceId, 'High CPU usage');

      expect(event.type).toBe('scale_up');
      expect(event.reason).toBe('High CPU usage');
      expect(event.fromInstances).toBe(1);
      expect(event.toInstances).toBe(2);
      expect(event.status).toBe('completed');
    });

    it('should reject scale up when at max instances', async () => {
      // Scale up to max
      await service.scaleUp(testServiceId, 'Test');
      await service.clearCooldown(testServiceId);
      await service.scaleUp(testServiceId, 'Test');
      await service.clearCooldown(testServiceId);
      await service.scaleUp(testServiceId, 'Test');
      await service.clearCooldown(testServiceId);
      await service.scaleUp(testServiceId, 'Test');
      await service.clearCooldown(testServiceId);

      await expect(service.scaleUp(testServiceId, 'Test'))
        .rejects.toThrow('already at maximum instances');
    });

    it('should reject scale up during cooldown', async () => {
      await service.scaleUp(testServiceId, 'First scale');

      await expect(service.scaleUp(testServiceId, 'Second scale'))
        .rejects.toThrow('cooldown period');
    });

    it('should reject scale up without policy', async () => {
      await expect(service.scaleUp('unknown-service', 'Test'))
        .rejects.toThrow('No scaling policy found');
    });
  });

  describe('scaleDown', () => {
    beforeEach(async () => {
      await service.configureScalingPolicy(testServiceId, {
        name: 'Test Policy',
        minInstances: 1,
        maxInstances: 5,
        targetCPU: 70,
        targetMemory: 80,
        scaleUpThreshold: 80,
        scaleDownThreshold: 30,
        cooldownPeriod: 60,
        enabled: true,
      });
      // Scale up first so we can scale down
      await service.scaleUp(testServiceId, 'Setup');
      await service.clearCooldown(testServiceId);
    });

    it('should scale down successfully', async () => {
      const event = await service.scaleDown(testServiceId);

      expect(event.type).toBe('scale_down');
      expect(event.fromInstances).toBe(2);
      expect(event.toInstances).toBe(1);
      expect(event.status).toBe('completed');
    });

    it('should reject scale down when at min instances', async () => {
      await service.scaleDown(testServiceId);
      await service.clearCooldown(testServiceId);

      await expect(service.scaleDown(testServiceId))
        .rejects.toThrow('already at minimum instances');
    });
  });

  describe('predictLoad', () => {
    beforeEach(async () => {
      await service.configureScalingPolicy(testServiceId, {
        name: 'Test Policy',
        minInstances: 1,
        maxInstances: 10,
        targetCPU: 70,
        targetMemory: 80,
        scaleUpThreshold: 80,
        scaleDownThreshold: 30,
        cooldownPeriod: 60,
        enabled: true,
      });
    });

    it('should generate load predictions', async () => {
      const prediction = await service.predictLoad(testServiceId, 24);

      expect(prediction.serviceId).toBe(testServiceId);
      expect(prediction.predictions).toHaveLength(24);
      expect(prediction.confidence).toBeGreaterThan(0);
      expect(prediction.model).toBe('time-series-historical');
      
      prediction.predictions.forEach(p => {
        expect(p.timestamp).toBeInstanceOf(Date);
        expect(p.predictedLoad).toBeGreaterThanOrEqual(0);
        expect(p.predictedLoad).toBeLessThanOrEqual(100);
        expect(p.predictedInstances).toBeGreaterThanOrEqual(1);
        expect(p.confidence).toBeGreaterThan(0);
      });
    });

    it('should use historical data when available', async () => {
      // Record some historical metrics
      const metrics = await service.getMetrics(testServiceId);
      await service.recordHistoricalMetrics(testServiceId, metrics);

      const prediction = await service.predictLoad(testServiceId, 1);

      expect(prediction.predictions).toHaveLength(1);
    });
  });

  describe('optimizeCosts', () => {
    beforeEach(async () => {
      await service.configureScalingPolicy(testServiceId, {
        name: 'Test Policy',
        minInstances: 2,
        maxInstances: 10,
        targetCPU: 70,
        targetMemory: 80,
        scaleUpThreshold: 80,
        scaleDownThreshold: 30,
        cooldownPeriod: 60,
        enabled: true,
      });
      await service.registerService({
        id: testServiceId,
        name: 'Test Service',
        namespace: 'default',
        deploymentName: 'test-deployment',
        containerName: 'test-container',
        resourceRequests: { cpu: '100m', memory: '256Mi' },
        resourceLimits: { cpu: '500m', memory: '512Mi' },
        spotInstanceEnabled: false,
        reservedCapacity: 0,
      });
    });

    it('should generate cost optimization recommendations', async () => {
      const optimization = await service.optimizeCosts(testServiceId);

      expect(optimization.serviceId).toBe(testServiceId);
      expect(optimization.currentMonthlyCost).toBeGreaterThan(0);
      expect(optimization.recommendations).toBeDefined();
      expect(Array.isArray(optimization.recommendations)).toBe(true);
      expect(optimization.timestamp).toBeInstanceOf(Date);
    });

    it('should recommend spot instances when not enabled', async () => {
      const optimization = await service.optimizeCosts(testServiceId);

      const spotRecommendation = optimization.recommendations.find(
        r => r.type === 'spot_instances'
      );
      expect(spotRecommendation).toBeDefined();
      expect(spotRecommendation?.estimatedSavings).toBeGreaterThan(0);
    });

    it('should recommend reserved capacity for minimum instances', async () => {
      const optimization = await service.optimizeCosts(testServiceId);

      const reservedRecommendation = optimization.recommendations.find(
        r => r.type === 'reserved_capacity'
      );
      expect(reservedRecommendation).toBeDefined();
    });
  });

  describe('makeScalingDecision', () => {
    beforeEach(async () => {
      await service.configureScalingPolicy(testServiceId, {
        name: 'Test Policy',
        minInstances: 1,
        maxInstances: 10,
        targetCPU: 70,
        targetMemory: 80,
        scaleUpThreshold: 80,
        scaleDownThreshold: 30,
        cooldownPeriod: 60,
        enabled: true,
      });
    });

    it('should return scaling decision', async () => {
      const decision = await service.makeScalingDecision(testServiceId);

      expect(decision.serviceId).toBe(testServiceId);
      expect(decision.currentInstances).toBeGreaterThanOrEqual(1);
      expect(decision.metrics).toBeDefined();
      expect(['up', 'down', 'none']).toContain(decision.direction);
    });

    it('should not scale when policy is disabled', async () => {
      await service.configureScalingPolicy(testServiceId, {
        name: 'Disabled Policy',
        minInstances: 1,
        maxInstances: 10,
        targetCPU: 70,
        targetMemory: 80,
        scaleUpThreshold: 80,
        scaleDownThreshold: 30,
        cooldownPeriod: 60,
        enabled: false,
      });

      const decision = await service.makeScalingDecision(testServiceId);

      expect(decision.shouldScale).toBe(false);
      expect(decision.reason).toContain('disabled');
    });

    it('should not scale during cooldown', async () => {
      await service.scaleUp(testServiceId, 'Test');
      
      const decision = await service.makeScalingDecision(testServiceId);

      expect(decision.shouldScale).toBe(false);
      expect(decision.reason).toContain('cooldown');
      expect(decision.cooldownRemaining).toBeGreaterThan(0);
    });
  });

  describe('getStatus', () => {
    beforeEach(async () => {
      await service.configureScalingPolicy(testServiceId, {
        name: 'Test Policy',
        minInstances: 1,
        maxInstances: 10,
        targetCPU: 70,
        targetMemory: 80,
        scaleUpThreshold: 80,
        scaleDownThreshold: 30,
        cooldownPeriod: 60,
        enabled: true,
      });
    });

    it('should return auto-scaling status', async () => {
      const status = await service.getStatus(testServiceId);

      expect(status.serviceId).toBe(testServiceId);
      expect(status.enabled).toBe(true);
      expect(status.currentInstances).toBeGreaterThanOrEqual(1);
      expect(status.minInstances).toBe(1);
      expect(status.maxInstances).toBe(10);
      expect(status.healthStatus).toBe('healthy');
      expect(status.lastMetricsUpdate).toBeInstanceOf(Date);
    });

    it('should show cooldown status after scaling', async () => {
      await service.scaleUp(testServiceId, 'Test');
      
      const status = await service.getStatus(testServiceId);

      expect(status.cooldownActive).toBe(true);
      expect(status.cooldownEndsAt).toBeInstanceOf(Date);
      expect(status.lastScalingEvent).toBeDefined();
      expect(status.lastScalingEvent?.type).toBe('scale_up');
    });

    it('should show degraded health with warning alerts', async () => {
      await service.createAlert(
        testServiceId,
        'cpu_high',
        'warning',
        'CPU usage high',
        85,
        80
      );

      const status = await service.getStatus(testServiceId);

      expect(status.healthStatus).toBe('degraded');
      expect(status.alerts).toHaveLength(1);
    });

    it('should show unhealthy status with critical alerts', async () => {
      await service.createAlert(
        testServiceId,
        'scaling_failed',
        'critical',
        'Scaling operation failed',
        0,
        0
      );

      const status = await service.getStatus(testServiceId);

      expect(status.healthStatus).toBe('unhealthy');
    });
  });

  describe('alerts', () => {
    beforeEach(async () => {
      await service.configureScalingPolicy(testServiceId, {
        name: 'Test Policy',
        minInstances: 1,
        maxInstances: 10,
        targetCPU: 70,
        targetMemory: 80,
        scaleUpThreshold: 80,
        scaleDownThreshold: 30,
        cooldownPeriod: 60,
        enabled: true,
      });
    });

    it('should create an alert', async () => {
      const alert = await service.createAlert(
        testServiceId,
        'cpu_high',
        'warning',
        'CPU usage is high',
        90,
        80
      );

      expect(alert.id).toBeDefined();
      expect(alert.serviceId).toBe(testServiceId);
      expect(alert.type).toBe('cpu_high');
      expect(alert.severity).toBe('warning');
      expect(alert.currentValue).toBe(90);
      expect(alert.threshold).toBe(80);
      expect(alert.acknowledged).toBe(false);
    });

    it('should acknowledge an alert', async () => {
      const alert = await service.createAlert(
        testServiceId,
        'memory_high',
        'warning',
        'Memory usage is high',
        85,
        80
      );

      await service.acknowledgeAlert(testServiceId, alert.id);
      const status = await service.getStatus(testServiceId);

      const acknowledgedAlert = status.alerts.find(a => a.id === alert.id);
      expect(acknowledgedAlert?.acknowledged).toBe(true);
    });

    it('should resolve an alert', async () => {
      const alert = await service.createAlert(
        testServiceId,
        'queue_depth_high',
        'warning',
        'Queue depth is high',
        8000,
        5000
      );

      await service.resolveAlert(testServiceId, alert.id);
      const status = await service.getStatus(testServiceId);

      // Resolved alerts should not appear in active alerts
      const resolvedAlert = status.alerts.find(a => a.id === alert.id);
      expect(resolvedAlert).toBeUndefined();
    });
  });

  describe('monitorQueueDepth', () => {
    beforeEach(async () => {
      await service.configureScalingPolicy(testServiceId, {
        name: 'Test Policy',
        minInstances: 1,
        maxInstances: 10,
        targetCPU: 70,
        targetMemory: 80,
        scaleUpThreshold: 80,
        scaleDownThreshold: 30,
        cooldownPeriod: 60,
        enabled: true,
      });
    });

    it('should recommend scale up for high queue depth', async () => {
      const queueMetrics: QueueMetrics = {
        queueName: 'test-queue',
        depth: 9000,
        oldestMessageAge: 120,
        messagesPerSecond: 100,
        processingRate: 50,
        backlogTime: 180,
        maxCapacity: 10000,
      };

      const decision = await service.monitorQueueDepth(testServiceId, queueMetrics);

      expect(decision).not.toBeNull();
      expect(decision?.shouldScale).toBe(true);
      expect(decision?.direction).toBe('up');
      expect(decision?.reason).toContain('queue depth');
    });

    it('should recommend scale down for low queue depth', async () => {
      // First scale up so we can scale down
      await service.scaleUp(testServiceId, 'Setup');
      await service.clearCooldown(testServiceId);

      const queueMetrics: QueueMetrics = {
        queueName: 'test-queue',
        depth: 500,
        oldestMessageAge: 5,
        messagesPerSecond: 10,
        processingRate: 50,
        backlogTime: 10,
        maxCapacity: 10000,
      };

      const decision = await service.monitorQueueDepth(testServiceId, queueMetrics);

      expect(decision).not.toBeNull();
      expect(decision?.shouldScale).toBe(true);
      expect(decision?.direction).toBe('down');
    });

    it('should return null when policy is disabled', async () => {
      await service.configureScalingPolicy(testServiceId, {
        name: 'Disabled Policy',
        minInstances: 1,
        maxInstances: 10,
        targetCPU: 70,
        targetMemory: 80,
        scaleUpThreshold: 80,
        scaleDownThreshold: 30,
        cooldownPeriod: 60,
        enabled: false,
      });

      const queueMetrics: QueueMetrics = {
        queueName: 'test-queue',
        depth: 9000,
        oldestMessageAge: 120,
        messagesPerSecond: 100,
        processingRate: 50,
        backlogTime: 180,
        maxCapacity: 10000,
      };

      const decision = await service.monitorQueueDepth(testServiceId, queueMetrics);

      expect(decision).toBeNull();
    });
  });

  describe('getMetrics', () => {
    beforeEach(async () => {
      await service.configureScalingPolicy(testServiceId, {
        name: 'Test Policy',
        minInstances: 1,
        maxInstances: 10,
        targetCPU: 70,
        targetMemory: 80,
        scaleUpThreshold: 80,
        scaleDownThreshold: 30,
        cooldownPeriod: 60,
        enabled: true,
      });
    });

    it('should return resource metrics', async () => {
      const metrics = await service.getMetrics(testServiceId);

      expect(metrics.serviceId).toBe(testServiceId);
      expect(metrics.timestamp).toBeInstanceOf(Date);
      expect(metrics.cpu.current).toBeGreaterThanOrEqual(0);
      expect(metrics.cpu.current).toBeLessThanOrEqual(100);
      expect(metrics.memory.current).toBeGreaterThanOrEqual(0);
      expect(metrics.memory.current).toBeLessThanOrEqual(100);
      expect(metrics.queueDepth.current).toBeGreaterThanOrEqual(0);
      expect(metrics.instances.current).toBeGreaterThanOrEqual(1);
    });

    it('should calculate averages over time', async () => {
      // Get multiple metrics to build history
      await service.getMetrics(testServiceId);
      await service.getMetrics(testServiceId);
      const metrics = await service.getMetrics(testServiceId);

      expect(metrics.cpu.average).toBeDefined();
      expect(metrics.memory.average).toBeDefined();
      expect(metrics.queueDepth.average).toBeDefined();
    });
  });

  describe('getScalingEvents', () => {
    beforeEach(async () => {
      await service.configureScalingPolicy(testServiceId, {
        name: 'Test Policy',
        minInstances: 1,
        maxInstances: 10,
        targetCPU: 70,
        targetMemory: 80,
        scaleUpThreshold: 80,
        scaleDownThreshold: 30,
        cooldownPeriod: 60,
        enabled: true,
      });
    });

    it('should return scaling events', async () => {
      await service.scaleUp(testServiceId, 'Test 1');
      await service.clearCooldown(testServiceId);
      await service.scaleUp(testServiceId, 'Test 2');

      const events = await service.getScalingEvents(testServiceId);

      expect(events).toHaveLength(2);
      expect(events[0].reason).toBe('Test 1');
      expect(events[1].reason).toBe('Test 2');
    });

    it('should limit returned events', async () => {
      await service.scaleUp(testServiceId, 'Test 1');
      await service.clearCooldown(testServiceId);
      await service.scaleUp(testServiceId, 'Test 2');
      await service.clearCooldown(testServiceId);
      await service.scaleUp(testServiceId, 'Test 3');

      const events = await service.getScalingEvents(testServiceId, 2);

      expect(events).toHaveLength(2);
      expect(events[0].reason).toBe('Test 2');
      expect(events[1].reason).toBe('Test 3');
    });
  });

  describe('setInstanceCount', () => {
    beforeEach(async () => {
      await service.configureScalingPolicy(testServiceId, {
        name: 'Test Policy',
        minInstances: 2,
        maxInstances: 10,
        targetCPU: 70,
        targetMemory: 80,
        scaleUpThreshold: 80,
        scaleDownThreshold: 30,
        cooldownPeriod: 60,
        enabled: true,
      });
    });

    it('should set instance count within bounds', async () => {
      await service.setInstanceCount(testServiceId, 5);
      const status = await service.getStatus(testServiceId);

      expect(status.currentInstances).toBe(5);
    });

    it('should reject instance count below minimum', async () => {
      await expect(service.setInstanceCount(testServiceId, 1))
        .rejects.toThrow('Instance count must be between 2 and 10');
    });

    it('should reject instance count above maximum', async () => {
      await expect(service.setInstanceCount(testServiceId, 15))
        .rejects.toThrow('Instance count must be between 2 and 10');
    });
  });
});
