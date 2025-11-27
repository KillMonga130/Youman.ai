/**
 * Feature Flag Service Tests
 * Tests for experiment management, user bucketing, conversion tracking, and feature rollouts
 * Requirements: 87
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FeatureFlagService } from './feature-flags.service';
import {
  CreateExperimentOptions,
  CreateFeatureFlagOptions,
  TrackConversionOptions,
} from './types';

describe('FeatureFlagService', () => {
  let service: FeatureFlagService;

  beforeEach(() => {
    service = new FeatureFlagService();
  });

  // ============ Experiment Management Tests ============

  describe('createExperiment', () => {
    it('should create an experiment with valid options', async () => {
      const options: CreateExperimentOptions = {
        name: 'Test Experiment',
        description: 'A test experiment',
        variants: [
          { name: 'Control', weight: 50, config: {} },
          { name: 'Treatment', weight: 50, config: { feature: true } },
        ],
        createdBy: 'user_123',
      };

      const experiment = await service.createExperiment(options);

      expect(experiment.id).toBeDefined();
      expect(experiment.name).toBe('Test Experiment');
      expect(experiment.variants).toHaveLength(2);
      expect(experiment.status).toBe('draft');
      expect(experiment.createdBy).toBe('user_123');
    });

    it('should auto-start experiment when autoStart is true', async () => {
      const options: CreateExperimentOptions = {
        name: 'Auto-start Experiment',
        variants: [
          { name: 'Control', weight: 50, config: {} },
          { name: 'Treatment', weight: 50, config: {} },
        ],
        createdBy: 'user_123',
        autoStart: true,
      };

      const experiment = await service.createExperiment(options);

      expect(experiment.status).toBe('running');
    });

    it('should reject experiment with less than 2 variants', async () => {
      const options: CreateExperimentOptions = {
        name: 'Invalid Experiment',
        variants: [{ name: 'Only One', weight: 100, config: {} }],
        createdBy: 'user_123',
      };

      await expect(service.createExperiment(options)).rejects.toThrow(
        'At least 2 variants are required'
      );
    });

    it('should reject experiment with weights not summing to 100', async () => {
      const options: CreateExperimentOptions = {
        name: 'Invalid Weights',
        variants: [
          { name: 'Control', weight: 30, config: {} },
          { name: 'Treatment', weight: 30, config: {} },
        ],
        createdBy: 'user_123',
      };

      await expect(service.createExperiment(options)).rejects.toThrow(
        'Variant weights must sum to 100'
      );
    });
  });

  describe('getExperiment', () => {
    it('should return experiment by ID', async () => {
      const options: CreateExperimentOptions = {
        name: 'Get Test',
        variants: [
          { name: 'A', weight: 50, config: {} },
          { name: 'B', weight: 50, config: {} },
        ],
        createdBy: 'user_123',
      };

      const created = await service.createExperiment(options);
      const retrieved = await service.getExperiment(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.name).toBe('Get Test');
    });

    it('should return null for non-existent experiment', async () => {
      const result = await service.getExperiment('non_existent_id');
      expect(result).toBeNull();
    });
  });

  describe('listExperiments', () => {
    it('should list all experiments', async () => {
      await service.createExperiment({
        name: 'Exp 1',
        variants: [
          { name: 'A', weight: 50, config: {} },
          { name: 'B', weight: 50, config: {} },
        ],
        createdBy: 'user_123',
      });

      await service.createExperiment({
        name: 'Exp 2',
        variants: [
          { name: 'A', weight: 50, config: {} },
          { name: 'B', weight: 50, config: {} },
        ],
        createdBy: 'user_123',
        autoStart: true,
      });

      const all = await service.listExperiments();
      expect(all).toHaveLength(2);
    });

    it('should filter experiments by status', async () => {
      await service.createExperiment({
        name: 'Draft Exp',
        variants: [
          { name: 'A', weight: 50, config: {} },
          { name: 'B', weight: 50, config: {} },
        ],
        createdBy: 'user_123',
      });

      await service.createExperiment({
        name: 'Running Exp',
        variants: [
          { name: 'A', weight: 50, config: {} },
          { name: 'B', weight: 50, config: {} },
        ],
        createdBy: 'user_123',
        autoStart: true,
      });

      const running = await service.listExperiments('running');
      expect(running).toHaveLength(1);
      expect(running[0]?.name).toBe('Running Exp');
    });
  });

  describe('updateExperimentStatus', () => {
    it('should update experiment status', async () => {
      const experiment = await service.createExperiment({
        name: 'Status Test',
        variants: [
          { name: 'A', weight: 50, config: {} },
          { name: 'B', weight: 50, config: {} },
        ],
        createdBy: 'user_123',
      });

      await service.updateExperimentStatus(experiment.id, 'running');
      const updated = await service.getExperiment(experiment.id);

      expect(updated?.status).toBe('running');
    });

    it('should set endDate when completing experiment', async () => {
      const experiment = await service.createExperiment({
        name: 'Complete Test',
        variants: [
          { name: 'A', weight: 50, config: {} },
          { name: 'B', weight: 50, config: {} },
        ],
        createdBy: 'user_123',
        autoStart: true,
      });

      await service.updateExperimentStatus(experiment.id, 'completed');
      const updated = await service.getExperiment(experiment.id);

      expect(updated?.status).toBe('completed');
      expect(updated?.endDate).toBeDefined();
    });
  });

  // ============ User Bucketing Tests ============

  describe('assignUserToVariant', () => {
    it('should assign user to a variant', async () => {
      const experiment = await service.createExperiment({
        name: 'Bucketing Test',
        variants: [
          { name: 'Control', weight: 50, config: {} },
          { name: 'Treatment', weight: 50, config: {} },
        ],
        createdBy: 'user_123',
        autoStart: true,
      });

      const variantId = await service.assignUserToVariant('user_456', experiment.id);

      expect(variantId).toBeDefined();
      expect(experiment.variants.some(v => v.id === variantId)).toBe(true);
    });

    it('should return same variant for same user (consistent bucketing)', async () => {
      const experiment = await service.createExperiment({
        name: 'Consistency Test',
        variants: [
          { name: 'Control', weight: 50, config: {} },
          { name: 'Treatment', weight: 50, config: {} },
        ],
        createdBy: 'user_123',
        autoStart: true,
      });

      const firstAssignment = await service.assignUserToVariant('user_789', experiment.id);
      const secondAssignment = await service.assignUserToVariant('user_789', experiment.id);

      expect(firstAssignment).toBe(secondAssignment);
    });

    it('should reject assignment to non-running experiment', async () => {
      const experiment = await service.createExperiment({
        name: 'Draft Experiment',
        variants: [
          { name: 'A', weight: 50, config: {} },
          { name: 'B', weight: 50, config: {} },
        ],
        createdBy: 'user_123',
      });

      await expect(
        service.assignUserToVariant('user_456', experiment.id)
      ).rejects.toThrow('Experiment is not running');
    });
  });

  describe('getUserAssignment', () => {
    it('should return user assignment', async () => {
      const experiment = await service.createExperiment({
        name: 'Assignment Test',
        variants: [
          { name: 'A', weight: 50, config: {} },
          { name: 'B', weight: 50, config: {} },
        ],
        createdBy: 'user_123',
        autoStart: true,
      });

      await service.assignUserToVariant('user_test', experiment.id);
      const assignment = service.getUserAssignment('user_test', experiment.id);

      expect(assignment).not.toBeNull();
      expect(assignment?.userId).toBe('user_test');
      expect(assignment?.experimentId).toBe(experiment.id);
    });

    it('should return null for unassigned user', () => {
      const assignment = service.getUserAssignment('unknown_user', 'unknown_exp');
      expect(assignment).toBeNull();
    });
  });

  // ============ Conversion Tracking Tests ============

  describe('trackConversion', () => {
    it('should track conversion event', async () => {
      const experiment = await service.createExperiment({
        name: 'Conversion Test',
        variants: [
          { name: 'A', weight: 50, config: {} },
          { name: 'B', weight: 50, config: {} },
        ],
        createdBy: 'user_123',
        autoStart: true,
      });

      await service.assignUserToVariant('user_conv', experiment.id);

      const options: TrackConversionOptions = {
        userId: 'user_conv',
        experimentId: experiment.id,
        metric: 'purchase',
        value: 99.99,
      };

      await expect(service.trackConversion(options)).resolves.not.toThrow();
    });

    it('should reject conversion for unassigned user', async () => {
      const experiment = await service.createExperiment({
        name: 'Unassigned Test',
        variants: [
          { name: 'A', weight: 50, config: {} },
          { name: 'B', weight: 50, config: {} },
        ],
        createdBy: 'user_123',
        autoStart: true,
      });

      const options: TrackConversionOptions = {
        userId: 'unassigned_user',
        experimentId: experiment.id,
        metric: 'click',
      };

      await expect(service.trackConversion(options)).rejects.toThrow(
        'User unassigned_user is not assigned to experiment'
      );
    });
  });

  // ============ Statistical Analysis Tests ============

  describe('analyzeResults', () => {
    it('should analyze experiment results', async () => {
      const experiment = await service.createExperiment({
        name: 'Analysis Test',
        variants: [
          { name: 'Control', weight: 50, config: {} },
          { name: 'Treatment', weight: 50, config: {} },
        ],
        createdBy: 'user_123',
        autoStart: true,
        minSampleSize: 10,
      });

      // Assign users and track conversions
      for (let i = 0; i < 20; i++) {
        const userId = `user_${i}`;
        await service.assignUserToVariant(userId, experiment.id);
        
        // Track some conversions
        if (i % 3 === 0) {
          await service.trackConversion({
            userId,
            experimentId: experiment.id,
            metric: 'conversion',
          });
        }
      }

      const results = await service.analyzeResults(experiment.id);

      expect(results.experimentId).toBe(experiment.id);
      expect(results.totalParticipants).toBe(20);
      expect(results.variantStats).toHaveLength(2);
      expect(results.analyzedAt).toBeDefined();
    });

    it('should indicate insufficient sample size', async () => {
      const experiment = await service.createExperiment({
        name: 'Small Sample Test',
        variants: [
          { name: 'A', weight: 50, config: {} },
          { name: 'B', weight: 50, config: {} },
        ],
        createdBy: 'user_123',
        autoStart: true,
        minSampleSize: 100,
      });

      // Only assign a few users
      for (let i = 0; i < 5; i++) {
        await service.assignUserToVariant(`user_${i}`, experiment.id);
      }

      const results = await service.analyzeResults(experiment.id);

      expect(results.isStatisticallySignificant).toBe(false);
      expect(results.recommendations.some(r => r.includes('more participants'))).toBe(true);
    });
  });

  // ============ Feature Flag Tests ============

  describe('createFeatureFlag', () => {
    it('should create a feature flag', async () => {
      const options: CreateFeatureFlagOptions = {
        key: 'new_feature',
        name: 'New Feature',
        description: 'A new feature flag',
        createdBy: 'user_123',
      };

      const flag = await service.createFeatureFlag(options);

      expect(flag.id).toBeDefined();
      expect(flag.key).toBe('new_feature');
      expect(flag.name).toBe('New Feature');
      expect(flag.status).toBe('disabled');
      expect(flag.rolloutPercentage).toBe(0);
    });

    it('should reject duplicate flag key', async () => {
      await service.createFeatureFlag({
        key: 'duplicate_key',
        name: 'First Flag',
        createdBy: 'user_123',
      });

      await expect(
        service.createFeatureFlag({
          key: 'duplicate_key',
          name: 'Second Flag',
          createdBy: 'user_123',
        })
      ).rejects.toThrow('already exists');
    });
  });

  describe('evaluateFlag', () => {
    it('should return default value for disabled flag', async () => {
      await service.createFeatureFlag({
        key: 'disabled_flag',
        name: 'Disabled Flag',
        createdBy: 'user_123',
        defaultValue: false,
      });

      const evaluation = await service.evaluateFlag('disabled_flag', 'user_456');

      expect(evaluation.value).toBe(false);
      expect(evaluation.reason).toBe('disabled');
    });

    it('should return override value when set', async () => {
      const flag = await service.createFeatureFlag({
        key: 'override_flag',
        name: 'Override Flag',
        createdBy: 'user_123',
        status: 'enabled',
      });

      await service.setUserOverride(flag.id, 'special_user', true);

      const evaluation = await service.evaluateFlag('override_flag', 'special_user');

      expect(evaluation.value).toBe(true);
      expect(evaluation.reason).toBe('override');
    });

    it('should evaluate percentage rollout correctly', async () => {
      const flag = await service.createFeatureFlag({
        key: 'rollout_flag',
        name: 'Rollout Flag',
        createdBy: 'user_123',
        status: 'percentage_rollout',
        rolloutPercentage: 50,
      });

      // Test multiple users to verify distribution
      let enabledCount = 0;
      const totalUsers = 100;

      for (let i = 0; i < totalUsers; i++) {
        const evaluation = await service.evaluateFlag('rollout_flag', `user_${i}`);
        if (evaluation.value) enabledCount++;
      }

      // Should be roughly 50% (allow some variance)
      expect(enabledCount).toBeGreaterThan(30);
      expect(enabledCount).toBeLessThan(70);
    });

    it('should return false for non-existent flag', async () => {
      const evaluation = await service.evaluateFlag('non_existent', 'user_123');

      expect(evaluation.value).toBe(false);
      expect(evaluation.reason).toBe('default');
    });
  });

  describe('rolloutFeature', () => {
    it('should rollout feature to percentage', async () => {
      const flag = await service.createFeatureFlag({
        key: 'rollout_test',
        name: 'Rollout Test',
        createdBy: 'user_123',
      });

      await service.rolloutFeature(flag.id, 25);

      const updated = await service.getFeatureFlag(flag.id);
      expect(updated?.rolloutPercentage).toBe(25);
      expect(updated?.status).toBe('percentage_rollout');
    });

    it('should set status to enabled at 100%', async () => {
      const flag = await service.createFeatureFlag({
        key: 'full_rollout',
        name: 'Full Rollout',
        createdBy: 'user_123',
      });

      await service.rolloutFeature(flag.id, 100);

      const updated = await service.getFeatureFlag(flag.id);
      expect(updated?.status).toBe('enabled');
    });

    it('should set status to disabled at 0%', async () => {
      const flag = await service.createFeatureFlag({
        key: 'zero_rollout',
        name: 'Zero Rollout',
        createdBy: 'user_123',
        status: 'enabled',
      });

      await service.rolloutFeature(flag.id, 0);

      const updated = await service.getFeatureFlag(flag.id);
      expect(updated?.status).toBe('disabled');
    });

    it('should reject invalid percentage', async () => {
      const flag = await service.createFeatureFlag({
        key: 'invalid_pct',
        name: 'Invalid Percentage',
        createdBy: 'user_123',
      });

      await expect(service.rolloutFeature(flag.id, 150)).rejects.toThrow(
        'Percentage must be between 0 and 100'
      );
    });
  });

  describe('rollbackFeature', () => {
    it('should rollback feature', async () => {
      const flag = await service.createFeatureFlag({
        key: 'rollback_test',
        name: 'Rollback Test',
        createdBy: 'user_123',
        status: 'enabled',
        rolloutPercentage: 100,
      });

      await service.rollbackFeature(flag.id);

      const updated = await service.getFeatureFlag(flag.id);
      expect(updated?.status).toBe('disabled');
      expect(updated?.rolloutPercentage).toBe(0);
    });
  });

  describe('user overrides', () => {
    it('should set and remove user override', async () => {
      const flag = await service.createFeatureFlag({
        key: 'override_test',
        name: 'Override Test',
        createdBy: 'user_123',
      });

      await service.setUserOverride(flag.id, 'user_override', true);
      
      let updated = await service.getFeatureFlag(flag.id);
      expect(updated?.userOverrides.get('user_override')).toBe(true);

      await service.removeUserOverride(flag.id, 'user_override');
      
      updated = await service.getFeatureFlag(flag.id);
      expect(updated?.userOverrides.has('user_override')).toBe(false);
    });
  });

  // ============ Consistent Bucketing Tests ============

  describe('consistent bucketing', () => {
    it('should bucket same user consistently across service instances', async () => {
      const service1 = new FeatureFlagService({ hashSeed: 'test-seed' });
      const service2 = new FeatureFlagService({ hashSeed: 'test-seed' });

      const flag1 = await service1.createFeatureFlag({
        key: 'consistent_flag',
        name: 'Consistent Flag',
        createdBy: 'user_123',
        status: 'percentage_rollout',
        rolloutPercentage: 50,
      });

      await service2.createFeatureFlag({
        key: 'consistent_flag',
        name: 'Consistent Flag',
        createdBy: 'user_123',
        status: 'percentage_rollout',
        rolloutPercentage: 50,
      });

      const eval1 = await service1.evaluateFlag('consistent_flag', 'test_user');
      const eval2 = await service2.evaluateFlag('consistent_flag', 'test_user');

      expect(eval1.value).toBe(eval2.value);
    });
  });
});
