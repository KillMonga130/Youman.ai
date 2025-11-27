/**
 * ML Model Management Service Tests
 * Tests for model versioning, deployment, performance tracking, drift detection, and A/B testing
 * Requirements: 88
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MLModelService } from './ml-model.service';
import {
  ModelVersion,
  Deployment,
  ModelMetrics,
  DriftReport,
  ModelComparison,
  ModelABTest,
} from './types';

describe('MLModelService', () => {
  let service: MLModelService;

  beforeEach(() => {
    service = new MLModelService();
  });

  // ============ Model Version Management Tests ============

  describe('Model Version Management', () => {
    it('should create a model version', async () => {
      const version = await service.createModelVersion({
        modelId: 'model-1',
        version: '1.0.0',
        description: 'Initial version',
        artifactPath: 's3://models/model-1/v1.0.0',
        config: {
          type: 'transformer',
          framework: 'pytorch',
        },
        createdBy: 'user-1',
        tags: ['production'],
      });

      expect(version).toBeDefined();
      expect(version.id).toMatch(/^mv_/);
      expect(version.modelId).toBe('model-1');
      expect(version.version).toBe('1.0.0');
      expect(version.status).toBe('ready');
      expect(version.config.type).toBe('transformer');
    });

    it('should reject duplicate versions', async () => {
      await service.createModelVersion({
        modelId: 'model-1',
        version: '1.0.0',
        artifactPath: 's3://models/model-1/v1.0.0',
        config: { type: 'transformer', framework: 'pytorch' },
        createdBy: 'user-1',
      });

      await expect(
        service.createModelVersion({
          modelId: 'model-1',
          version: '1.0.0',
          artifactPath: 's3://models/model-1/v1.0.0-dup',
          config: { type: 'transformer', framework: 'pytorch' },
          createdBy: 'user-1',
        })
      ).rejects.toThrow('already exists');
    });

    it('should get model versions', async () => {
      await service.createModelVersion({
        modelId: 'model-1',
        version: '1.0.0',
        artifactPath: 's3://models/model-1/v1.0.0',
        config: { type: 'transformer', framework: 'pytorch' },
        createdBy: 'user-1',
      });

      await service.createModelVersion({
        modelId: 'model-1',
        version: '1.1.0',
        artifactPath: 's3://models/model-1/v1.1.0',
        config: { type: 'transformer', framework: 'pytorch' },
        createdBy: 'user-1',
      });

      const versions = service.getModelVersions('model-1');
      expect(versions).toHaveLength(2);
    });

    it('should get latest version', async () => {
      await service.createModelVersion({
        modelId: 'model-1',
        version: '1.0.0',
        artifactPath: 's3://models/model-1/v1.0.0',
        config: { type: 'transformer', framework: 'pytorch' },
        createdBy: 'user-1',
      });

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      await service.createModelVersion({
        modelId: 'model-1',
        version: '1.1.0',
        artifactPath: 's3://models/model-1/v1.1.0',
        config: { type: 'transformer', framework: 'pytorch' },
        createdBy: 'user-1',
      });

      const latest = await service.getLatestVersion('model-1');
      expect(latest).toBeDefined();
      expect(latest!.version).toBe('1.1.0');
    });

    it('should update version status', async () => {
      const version = await service.createModelVersion({
        modelId: 'model-1',
        version: '1.0.0',
        artifactPath: 's3://models/model-1/v1.0.0',
        config: { type: 'transformer', framework: 'pytorch' },
        createdBy: 'user-1',
      });

      await service.updateVersionStatus(version.id, 'deprecated');
      
      const updated = await service.getModelVersion(version.id);
      expect(updated!.status).toBe('deprecated');
    });
  });

  // ============ Deployment Tests ============

  describe('Model Deployment', () => {
    beforeEach(async () => {
      await service.createModelVersion({
        modelId: 'model-1',
        version: '1.0.0',
        artifactPath: 's3://models/model-1/v1.0.0',
        config: { type: 'transformer', framework: 'pytorch' },
        createdBy: 'user-1',
      });
    });

    it('should deploy a model with blue-green strategy', async () => {
      const deployment = await service.deployModel({
        modelId: 'model-1',
        version: '1.0.0',
        deploymentType: 'blue-green',
        deployedBy: 'user-1',
      });

      expect(deployment).toBeDefined();
      expect(deployment.id).toMatch(/^dep_/);
      expect(deployment.modelId).toBe('model-1');
      expect(deployment.version).toBe('1.0.0');
      expect(deployment.deploymentType).toBe('blue-green');
      expect(deployment.status).toBe('active');
    });

    it('should deploy a model with canary strategy', async () => {
      const deployment = await service.deployModel({
        modelId: 'model-1',
        version: '1.0.0',
        deploymentType: 'canary',
        canaryPercentage: 10,
        deployedBy: 'user-1',
      });

      expect(deployment.deploymentType).toBe('canary');
      expect(deployment.config.canaryPercentage).toBe(10);
    });

    it('should deploy a model with rolling strategy', async () => {
      const deployment = await service.deployModel({
        modelId: 'model-1',
        version: '1.0.0',
        deploymentType: 'rolling',
        deployedBy: 'user-1',
      });

      expect(deployment.deploymentType).toBe('rolling');
    });

    it('should reject deployment of non-existent version', async () => {
      await expect(
        service.deployModel({
          modelId: 'model-1',
          version: '9.9.9',
          deployedBy: 'user-1',
        })
      ).rejects.toThrow('not found');
    });

    it('should get active deployment', async () => {
      await service.deployModel({
        modelId: 'model-1',
        version: '1.0.0',
        deployedBy: 'user-1',
      });

      const active = await service.getActiveDeployment('model-1');
      expect(active).toBeDefined();
      expect(active!.version).toBe('1.0.0');
      expect(active!.status).toBe('active');
    });

    it('should get deployment history', async () => {
      await service.deployModel({
        modelId: 'model-1',
        version: '1.0.0',
        deployedBy: 'user-1',
      });

      const history = await service.getDeploymentHistory('model-1');
      expect(history).toHaveLength(1);
    });

    it('should rollback to previous version', async () => {
      // Deploy v1.0.0
      await service.deployModel({
        modelId: 'model-1',
        version: '1.0.0',
        deployedBy: 'user-1',
      });

      // Create and deploy v1.1.0
      await service.createModelVersion({
        modelId: 'model-1',
        version: '1.1.0',
        artifactPath: 's3://models/model-1/v1.1.0',
        config: { type: 'transformer', framework: 'pytorch' },
        createdBy: 'user-1',
      });

      await service.deployModel({
        modelId: 'model-1',
        version: '1.1.0',
        deployedBy: 'user-1',
      });

      // Rollback to v1.0.0
      await service.rollbackModel('model-1', '1.0.0');

      const active = await service.getActiveDeployment('model-1');
      expect(active!.version).toBe('1.0.0');
    });
  });


  // ============ Performance Tracking Tests ============

  describe('Performance Tracking', () => {
    beforeEach(async () => {
      await service.createModelVersion({
        modelId: 'model-1',
        version: '1.0.0',
        artifactPath: 's3://models/model-1/v1.0.0',
        config: { type: 'transformer', framework: 'pytorch' },
        createdBy: 'user-1',
      });

      await service.deployModel({
        modelId: 'model-1',
        version: '1.0.0',
        deployedBy: 'user-1',
      });
    });

    it('should track model performance', async () => {
      // Record some predictions
      await service.recordPrediction('model-1', {
        prediction: 'humanized',
        latencyMs: 50,
        success: true,
        detectionScore: 0.3,
      });

      await service.recordPrediction('model-1', {
        prediction: 'humanized',
        latencyMs: 60,
        success: true,
        detectionScore: 0.2,
      });

      const metrics = await service.trackModelPerformance('model-1');

      expect(metrics).toBeDefined();
      expect(metrics.modelId).toBe('model-1');
      expect(metrics.version).toBe('1.0.0');
      expect(metrics.totalRequests).toBe(2);
      expect(metrics.successfulRequests).toBe(2);
      expect(metrics.failedRequests).toBe(0);
      expect(metrics.latency).toBe(55); // Average of 50 and 60
      expect(metrics.errorRate).toBe(0);
    });

    it('should calculate error rate correctly', async () => {
      await service.recordPrediction('model-1', {
        prediction: 'humanized',
        latencyMs: 50,
        success: true,
      });

      await service.recordPrediction('model-1', {
        prediction: null,
        latencyMs: 100,
        success: false,
        errorMessage: 'Timeout',
      });

      const metrics = await service.trackModelPerformance('model-1');

      expect(metrics.totalRequests).toBe(2);
      expect(metrics.successfulRequests).toBe(1);
      expect(metrics.failedRequests).toBe(1);
      expect(metrics.errorRate).toBe(0.5);
    });

    it('should calculate detection evasion rate', async () => {
      // 3 predictions that evade detection (score < 0.5)
      await service.recordPrediction('model-1', {
        prediction: 'humanized',
        latencyMs: 50,
        success: true,
        detectionScore: 0.2,
      });

      await service.recordPrediction('model-1', {
        prediction: 'humanized',
        latencyMs: 50,
        success: true,
        detectionScore: 0.3,
      });

      await service.recordPrediction('model-1', {
        prediction: 'humanized',
        latencyMs: 50,
        success: true,
        detectionScore: 0.4,
      });

      // 1 prediction that doesn't evade detection
      await service.recordPrediction('model-1', {
        prediction: 'humanized',
        latencyMs: 50,
        success: true,
        detectionScore: 0.7,
      });

      const metrics = await service.trackModelPerformance('model-1');

      expect(metrics.detectionEvasionRate).toBe(0.75); // 3 out of 4
    });

    it('should get metrics history', async () => {
      await service.recordPrediction('model-1', {
        prediction: 'humanized',
        latencyMs: 50,
        success: true,
      });

      await service.trackModelPerformance('model-1');
      await service.trackModelPerformance('model-1');

      const history = await service.getMetricsHistory('model-1');
      expect(history.length).toBeGreaterThanOrEqual(2);
    });

    it('should reject tracking for model without deployment', async () => {
      await expect(
        service.trackModelPerformance('non-existent-model')
      ).rejects.toThrow('No active deployment');
    });
  });

  // ============ Drift Detection Tests ============

  describe('Drift Detection', () => {
    beforeEach(async () => {
      await service.createModelVersion({
        modelId: 'model-1',
        version: '1.0.0',
        artifactPath: 's3://models/model-1/v1.0.0',
        config: { type: 'transformer', framework: 'pytorch' },
        createdBy: 'user-1',
      });

      await service.deployModel({
        modelId: 'model-1',
        version: '1.0.0',
        deployedBy: 'user-1',
      });
    });

    it('should detect model drift', async () => {
      // Record some predictions
      await service.recordPrediction('model-1', {
        prediction: 'humanized',
        latencyMs: 50,
        success: true,
        features: { textLength: 100, complexity: 0.5 },
      });

      const report = await service.detectModelDrift('model-1');

      expect(report).toBeDefined();
      expect(report.modelId).toBe('model-1');
      expect(report.version).toBe('1.0.0');
      expect(report.severity).toBeDefined();
      expect(report.driftScore).toBeGreaterThanOrEqual(0);
      expect(report.recommendations).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it('should include feature drift analysis', async () => {
      await service.recordPrediction('model-1', {
        prediction: 'humanized',
        latencyMs: 50,
        success: true,
        features: { textLength: 100 },
      });

      const report = await service.detectModelDrift('model-1');

      expect(report.featureDrift).toBeDefined();
      expect(Array.isArray(report.featureDrift)).toBe(true);
    });

    it('should include prediction drift analysis', async () => {
      await service.recordPrediction('model-1', {
        prediction: 'humanized',
        latencyMs: 50,
        success: true,
      });

      const report = await service.detectModelDrift('model-1');

      expect(report.predictionDrift).toBeDefined();
      expect(report.predictionDrift.driftScore).toBeGreaterThanOrEqual(0);
    });

    it('should reject drift detection for model without deployment', async () => {
      await expect(
        service.detectModelDrift('non-existent-model')
      ).rejects.toThrow('No active deployment');
    });
  });

  // ============ A/B Testing Tests ============

  describe('A/B Testing', () => {
    beforeEach(async () => {
      // Create and deploy model-1
      await service.createModelVersion({
        modelId: 'model-1',
        version: '1.0.0',
        artifactPath: 's3://models/model-1/v1.0.0',
        config: { type: 'transformer', framework: 'pytorch' },
        createdBy: 'user-1',
      });

      await service.deployModel({
        modelId: 'model-1',
        version: '1.0.0',
        deployedBy: 'user-1',
      });

      // Create and deploy model-2
      await service.createModelVersion({
        modelId: 'model-2',
        version: '1.0.0',
        artifactPath: 's3://models/model-2/v1.0.0',
        config: { type: 'transformer', framework: 'pytorch' },
        createdBy: 'user-1',
      });

      await service.deployModel({
        modelId: 'model-2',
        version: '1.0.0',
        deployedBy: 'user-1',
      });
    });

    it('should create an A/B test', async () => {
      const test = await service.createABTest({
        name: 'Model Comparison Test',
        modelIds: ['model-1', 'model-2'],
        trafficAllocation: { 'model-1': 50, 'model-2': 50 },
        createdBy: 'user-1',
      });

      expect(test).toBeDefined();
      expect(test.id).toMatch(/^abtest_/);
      expect(test.name).toBe('Model Comparison Test');
      expect(test.modelIds).toHaveLength(2);
      expect(test.status).toBe('draft');
    });

    it('should auto-start A/B test when specified', async () => {
      const test = await service.createABTest({
        name: 'Auto-start Test',
        modelIds: ['model-1', 'model-2'],
        trafficAllocation: { 'model-1': 50, 'model-2': 50 },
        createdBy: 'user-1',
        autoStart: true,
      });

      expect(test.status).toBe('running');
    });

    it('should reject A/B test with less than 2 models', async () => {
      await expect(
        service.createABTest({
          name: 'Invalid Test',
          modelIds: ['model-1'],
          trafficAllocation: { 'model-1': 100 },
          createdBy: 'user-1',
        })
      ).rejects.toThrow('At least 2 models');
    });

    it('should reject A/B test with invalid traffic allocation', async () => {
      await expect(
        service.createABTest({
          name: 'Invalid Allocation',
          modelIds: ['model-1', 'model-2'],
          trafficAllocation: { 'model-1': 30, 'model-2': 30 }, // Sum is 60, not 100
          createdBy: 'user-1',
        })
      ).rejects.toThrow('sum to 100');
    });

    it('should start and stop A/B test', async () => {
      const test = await service.createABTest({
        name: 'Lifecycle Test',
        modelIds: ['model-1', 'model-2'],
        trafficAllocation: { 'model-1': 50, 'model-2': 50 },
        createdBy: 'user-1',
      });

      await service.startABTest(test.id);
      let updated = await service.getABTest(test.id);
      expect(updated!.status).toBe('running');

      await service.stopABTest(test.id);
      updated = await service.getABTest(test.id);
      expect(updated!.status).toBe('completed');
    });

    it('should list A/B tests', async () => {
      await service.createABTest({
        name: 'Test 1',
        modelIds: ['model-1', 'model-2'],
        trafficAllocation: { 'model-1': 50, 'model-2': 50 },
        createdBy: 'user-1',
      });

      await service.createABTest({
        name: 'Test 2',
        modelIds: ['model-1', 'model-2'],
        trafficAllocation: { 'model-1': 50, 'model-2': 50 },
        createdBy: 'user-1',
        autoStart: true,
      });

      const allTests = await service.listABTests();
      expect(allTests).toHaveLength(2);

      const runningTests = await service.listABTests('running');
      expect(runningTests).toHaveLength(1);
    });

    it('should compare models', async () => {
      // Record predictions for both models
      await service.recordPrediction('model-1', {
        prediction: 'humanized',
        latencyMs: 50,
        success: true,
        groundTruth: 'humanized',
      });

      await service.recordPrediction('model-2', {
        prediction: 'humanized',
        latencyMs: 60,
        success: true,
        groundTruth: 'humanized',
      });

      const comparison = await service.abTestModels(['model-1', 'model-2']);

      expect(comparison).toBeDefined();
      expect(comparison.models).toHaveLength(2);
      expect(comparison.comparisonMetrics).toContain('accuracy');
      expect(comparison.comparisonMetrics).toContain('latency');
      expect(comparison.recommendations).toBeDefined();
    });

    it('should reject comparison with less than 2 models', async () => {
      await expect(
        service.abTestModels(['model-1'])
      ).rejects.toThrow('At least 2 models');
    });
  });
});
