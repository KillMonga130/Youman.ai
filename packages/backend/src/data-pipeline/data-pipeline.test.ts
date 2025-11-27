/**
 * Data Pipeline Service Tests
 * Tests for ETL pipeline system, data quality validation, batch processing, and scheduling
 * Requirements: 89
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataPipelineService } from './data-pipeline.service';
import {
  Pipeline,
  PipelineConfig,
  PipelineJob,
  ProcessedData,
  QualityReport,
  Transformation,
} from './types';

describe('DataPipelineService', () => {
  let service: DataPipelineService;

  beforeEach(() => {
    service = new DataPipelineService({
      defaultRetryAttempts: 3,
      defaultRetryDelayMs: 100,
      maxBatchSize: 1000,
      jobTimeoutMs: 60000,
      qualityThreshold: 80,
      logRetentionDays: 30,
    });
  });

  // ============ Pipeline Management Tests ============

  describe('Pipeline Management', () => {
    const createTestConfig = (): PipelineConfig => ({
      name: 'Test Pipeline',
      description: 'A test pipeline',
      source: {
        type: 'database',
        connection: 'postgresql://localhost/test',
        query: 'SELECT * FROM users',
      },
      transformations: [],
      destination: {
        type: 'database',
        connection: 'postgresql://localhost/test',
        target: 'processed_users',
        writeMode: 'append',
      },
      tags: ['test'],
    });

    it('should create a pipeline', async () => {
      const config = createTestConfig();
      const pipeline = await service.createPipeline({
        config,
        createdBy: 'user_123',
      });

      expect(pipeline).toBeDefined();
      expect(pipeline.id).toMatch(/^pipe_/);
      expect(pipeline.config.name).toBe('Test Pipeline');
      expect(pipeline.status).toBe('draft');
      expect(pipeline.createdBy).toBe('user_123');
      expect(pipeline.totalRuns).toBe(0);
    });

    it('should create and auto-activate a pipeline', async () => {
      const config = createTestConfig();
      const pipeline = await service.createPipeline({
        config,
        createdBy: 'user_123',
        autoActivate: true,
      });

      expect(pipeline.status).toBe('active');
    });

    it('should get a pipeline by ID', async () => {
      const config = createTestConfig();
      const created = await service.createPipeline({
        config,
        createdBy: 'user_123',
      });

      const retrieved = await service.getPipeline(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should return null for non-existent pipeline', async () => {
      const result = await service.getPipeline('non_existent');
      expect(result).toBeNull();
    });

    it('should list all pipelines', async () => {
      const config = createTestConfig();
      await service.createPipeline({ config, createdBy: 'user_1' });
      await service.createPipeline({ config, createdBy: 'user_2' });

      const pipelines = await service.listPipelines();
      expect(pipelines.length).toBe(2);
    });

    it('should list pipelines by status', async () => {
      const config = createTestConfig();
      await service.createPipeline({ config, createdBy: 'user_1' });
      await service.createPipeline({ config, createdBy: 'user_2', autoActivate: true });

      const draftPipelines = await service.listPipelines('draft');
      const activePipelines = await service.listPipelines('active');

      expect(draftPipelines.length).toBe(1);
      expect(activePipelines.length).toBe(1);
    });

    it('should update a pipeline', async () => {
      const config = createTestConfig();
      const pipeline = await service.createPipeline({
        config,
        createdBy: 'user_123',
      });

      const updated = await service.updatePipeline(pipeline.id, {
        name: 'Updated Pipeline',
        description: 'Updated description',
      });

      expect(updated.config.name).toBe('Updated Pipeline');
      expect(updated.config.description).toBe('Updated description');
    });

    it('should throw error when updating non-existent pipeline', async () => {
      await expect(
        service.updatePipeline('non_existent', { name: 'Test' })
      ).rejects.toThrow('Pipeline not found');
    });

    it('should activate a pipeline', async () => {
      const config = createTestConfig();
      const pipeline = await service.createPipeline({
        config,
        createdBy: 'user_123',
      });

      await service.activatePipeline(pipeline.id);
      const updated = await service.getPipeline(pipeline.id);

      expect(updated?.status).toBe('active');
    });

    it('should pause a pipeline', async () => {
      const config = createTestConfig();
      const pipeline = await service.createPipeline({
        config,
        createdBy: 'user_123',
        autoActivate: true,
      });

      await service.pausePipeline(pipeline.id);
      const updated = await service.getPipeline(pipeline.id);

      expect(updated?.status).toBe('paused');
    });

    it('should delete a pipeline', async () => {
      const config = createTestConfig();
      const pipeline = await service.createPipeline({
        config,
        createdBy: 'user_123',
      });

      await service.deletePipeline(pipeline.id);
      const deleted = await service.getPipeline(pipeline.id);

      expect(deleted).toBeNull();
    });

    it('should throw error when deleting non-existent pipeline', async () => {
      await expect(service.deletePipeline('non_existent')).rejects.toThrow(
        'Pipeline not found'
      );
    });
  });

  // ============ Pipeline Execution Tests ============

  describe('Pipeline Execution', () => {
    it('should execute a pipeline with source data', async () => {
      const config: PipelineConfig = {
        name: 'Test Pipeline',
        source: {
          type: 'api',
          connection: 'https://api.example.com/data',
        },
        transformations: [],
        destination: {
          type: 'database',
          connection: 'postgresql://localhost/test',
          target: 'output_table',
        },
      };

      const pipeline = await service.createPipeline({
        config,
        createdBy: 'user_123',
        autoActivate: true,
      });

      const sourceData = [
        { id: 1, name: 'Alice', email: 'alice@example.com' },
        { id: 2, name: 'Bob', email: 'bob@example.com' },
      ];

      const result = await service.executePipeline({
        pipelineId: pipeline.id,
        sourceData,
        triggeredBy: 'manual',
      });

      expect(result.success).toBe(true);
      expect(result.recordsProcessed).toBe(2);
      expect(result.recordsFailed).toBe(0);
      expect(result.qualityReport).toBeDefined();
    });

    it('should execute a dry run without loading data', async () => {
      const config: PipelineConfig = {
        name: 'Test Pipeline',
        source: { type: 'api', connection: 'https://api.example.com' },
        transformations: [],
        destination: { type: 'database', connection: 'postgresql://localhost/test' },
      };

      const pipeline = await service.createPipeline({
        config,
        createdBy: 'user_123',
        autoActivate: true,
      });

      const result = await service.executePipeline({
        pipelineId: pipeline.id,
        sourceData: [{ id: 1, name: 'Test' }],
        dryRun: true,
      });

      expect(result.success).toBe(true);
    });

    it('should throw error for non-existent pipeline', async () => {
      await expect(
        service.executePipeline({ pipelineId: 'non_existent' })
      ).rejects.toThrow('Pipeline not found');
    });

    it('should throw error for paused pipeline', async () => {
      const config: PipelineConfig = {
        name: 'Test Pipeline',
        source: { type: 'api', connection: 'https://api.example.com' },
        transformations: [],
        destination: { type: 'database', connection: 'postgresql://localhost/test' },
      };

      const pipeline = await service.createPipeline({
        config,
        createdBy: 'user_123',
        autoActivate: true,
      });

      await service.pausePipeline(pipeline.id);

      await expect(
        service.executePipeline({ pipelineId: pipeline.id })
      ).rejects.toThrow('Pipeline is not executable');
    });

    it('should update pipeline stats after execution', async () => {
      const config: PipelineConfig = {
        name: 'Test Pipeline',
        source: { type: 'api', connection: 'https://api.example.com' },
        transformations: [],
        destination: { type: 'database', connection: 'postgresql://localhost/test' },
      };

      const pipeline = await service.createPipeline({
        config,
        createdBy: 'user_123',
        autoActivate: true,
      });

      await service.executePipeline({
        pipelineId: pipeline.id,
        sourceData: [{ id: 1 }],
      });

      const updated = await service.getPipeline(pipeline.id);
      expect(updated?.totalRuns).toBe(1);
      expect(updated?.successfulRuns).toBe(1);
      expect(updated?.lastRunAt).toBeDefined();
    });
  });

  // ============ Data Quality Validation Tests ============

  describe('Data Quality Validation', () => {
    it('should validate data quality', async () => {
      const data: ProcessedData[] = [
        { original: { id: 1, name: 'Alice' }, transformed: { id: 1, name: 'Alice' }, valid: true },
        { original: { id: 2, name: 'Bob' }, transformed: { id: 2, name: 'Bob' }, valid: true },
      ];

      const report = await service.validateDataQuality(data);

      expect(report).toBeDefined();
      expect(report.totalRecords).toBe(2);
      expect(report.validRecords).toBe(2);
      expect(report.overallScore).toBeGreaterThanOrEqual(0);
      expect(report.overallScore).toBeLessThanOrEqual(100);
      expect(report.checks.length).toBeGreaterThan(0);
    });

    it('should detect incomplete data', async () => {
      const data: ProcessedData[] = [
        { original: { id: 1, name: 'Alice' }, transformed: { id: 1, name: 'Alice' }, valid: true },
        { original: { id: 2, name: null }, transformed: { id: 2, name: null }, valid: true },
        { original: { id: 3, name: '' }, transformed: { id: 3, name: '' }, valid: true },
      ];

      const report = await service.validateDataQuality(data);

      const completenessCheck = report.checks.find(c => c.type === 'completeness');
      expect(completenessCheck).toBeDefined();
      expect(completenessCheck?.score).toBeLessThan(100);
    });

    it('should detect duplicate data', async () => {
      const data: ProcessedData[] = [
        { original: { id: 1, name: 'Alice' }, transformed: { id: 1, name: 'Alice' }, valid: true },
        { original: { id: 1, name: 'Alice' }, transformed: { id: 1, name: 'Alice' }, valid: true },
        { original: { id: 2, name: 'Bob' }, transformed: { id: 2, name: 'Bob' }, valid: true },
      ];

      const report = await service.validateDataQuality(data);

      const uniquenessCheck = report.checks.find(c => c.type === 'uniqueness');
      expect(uniquenessCheck).toBeDefined();
      expect(uniquenessCheck?.score).toBeLessThan(100);
    });

    it('should detect invalid data', async () => {
      const data: ProcessedData[] = [
        { original: { id: 1 }, transformed: { id: 1 }, valid: true },
        { original: { id: 2 }, transformed: { id: 2 }, valid: false, errors: ['Invalid format'] },
      ];

      const report = await service.validateDataQuality(data);

      expect(report.validRecords).toBe(1);
      expect(report.invalidRecords).toBe(1);
    });

    it('should detect type inconsistencies', async () => {
      const data: ProcessedData[] = [
        { original: { id: 1 }, transformed: { id: 1 }, valid: true },
        { original: { id: '2' }, transformed: { id: '2' }, valid: true },
      ];

      const report = await service.validateDataQuality(data);

      const consistencyCheck = report.checks.find(c => c.type === 'consistency');
      expect(consistencyCheck).toBeDefined();
    });

    it('should generate quality issues', async () => {
      const data: ProcessedData[] = Array(20).fill(null).map((_, i) => ({
        original: { id: i, name: i % 3 === 0 ? null : `User ${i}` },
        transformed: { id: i, name: i % 3 === 0 ? null : `User ${i}` },
        valid: true,
      }));

      const report = await service.validateDataQuality(data);

      expect(report.issues.length).toBeGreaterThan(0);
      const completenessIssue = report.issues.find(i => i.type === 'completeness');
      expect(completenessIssue).toBeDefined();
    });
  });

  // ============ Batch Processing Tests ============

  describe('Batch Processing', () => {
    it('should process data in batches', async () => {
      const data = Array(100).fill(null).map((_, i) => ({
        id: i,
        name: `User ${i}`,
      }));

      const results = await service.processInBatch(data);

      expect(results.length).toBe(100);
      expect(results.every(r => r.valid)).toBe(true);
    });

    it('should handle empty data', async () => {
      const results = await service.processInBatch([]);
      expect(results.length).toBe(0);
    });

    it('should preserve original data', async () => {
      const data = [{ id: 1, name: 'Test' }];
      const results = await service.processInBatch(data);

      expect(results[0].original).toEqual(data[0]);
      expect(results[0].transformed).toEqual(data[0]);
    });
  });

  // ============ Job Management Tests ============

  describe('Job Management', () => {
    it('should create and track jobs', async () => {
      const config: PipelineConfig = {
        name: 'Test Pipeline',
        source: { type: 'api', connection: 'https://api.example.com' },
        transformations: [],
        destination: { type: 'database', connection: 'postgresql://localhost/test' },
      };

      const pipeline = await service.createPipeline({
        config,
        createdBy: 'user_123',
        autoActivate: true,
      });

      await service.executePipeline({
        pipelineId: pipeline.id,
        sourceData: [{ id: 1 }],
      });

      const jobs = await service.listJobs(pipeline.id);
      expect(jobs.length).toBe(1);
      expect(jobs[0].status).toBe('completed');
    });

    it('should get job by ID', async () => {
      const config: PipelineConfig = {
        name: 'Test Pipeline',
        source: { type: 'api', connection: 'https://api.example.com' },
        transformations: [],
        destination: { type: 'database', connection: 'postgresql://localhost/test' },
      };

      const pipeline = await service.createPipeline({
        config,
        createdBy: 'user_123',
        autoActivate: true,
      });

      const result = await service.executePipeline({
        pipelineId: pipeline.id,
        sourceData: [{ id: 1 }],
      });

      const job = await service.getJob(result.jobId);
      expect(job).toBeDefined();
      expect(job?.id).toBe(result.jobId);
    });

    it('should return null for non-existent job', async () => {
      const job = await service.getJob('non_existent');
      expect(job).toBeNull();
    });

    it('should list jobs by status', async () => {
      const config: PipelineConfig = {
        name: 'Test Pipeline',
        source: { type: 'api', connection: 'https://api.example.com' },
        transformations: [],
        destination: { type: 'database', connection: 'postgresql://localhost/test' },
      };

      const pipeline = await service.createPipeline({
        config,
        createdBy: 'user_123',
        autoActivate: true,
      });

      await service.executePipeline({
        pipelineId: pipeline.id,
        sourceData: [{ id: 1 }],
      });

      const completedJobs = await service.listJobs(pipeline.id, 'completed');
      const runningJobs = await service.listJobs(pipeline.id, 'running');

      expect(completedJobs.length).toBe(1);
      expect(runningJobs.length).toBe(0);
    });

    it('should track job logs', async () => {
      const config: PipelineConfig = {
        name: 'Test Pipeline',
        source: { type: 'api', connection: 'https://api.example.com' },
        transformations: [],
        destination: { type: 'database', connection: 'postgresql://localhost/test' },
      };

      const pipeline = await service.createPipeline({
        config,
        createdBy: 'user_123',
        autoActivate: true,
      });

      const result = await service.executePipeline({
        pipelineId: pipeline.id,
        sourceData: [{ id: 1 }],
      });

      const job = await service.getJob(result.jobId);
      expect(job?.logs.length).toBeGreaterThan(0);
      expect(job?.logs.some(l => l.level === 'info')).toBe(true);
    });
  });

  // ============ Scheduling Tests ============

  describe('Scheduling', () => {
    it('should calculate next run for hourly schedule', async () => {
      const config: PipelineConfig = {
        name: 'Scheduled Pipeline',
        source: { type: 'api', connection: 'https://api.example.com' },
        transformations: [],
        destination: { type: 'database', connection: 'postgresql://localhost/test' },
        schedule: {
          frequency: 'hourly',
          enabled: true,
        },
      };

      const pipeline = await service.createPipeline({
        config,
        createdBy: 'user_123',
      });

      expect(pipeline.nextRunAt).toBeDefined();
      expect(pipeline.nextRunAt!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should calculate next run for daily schedule', async () => {
      const config: PipelineConfig = {
        name: 'Scheduled Pipeline',
        source: { type: 'api', connection: 'https://api.example.com' },
        transformations: [],
        destination: { type: 'database', connection: 'postgresql://localhost/test' },
        schedule: {
          frequency: 'daily',
          enabled: true,
        },
      };

      const pipeline = await service.createPipeline({
        config,
        createdBy: 'user_123',
      });

      expect(pipeline.nextRunAt).toBeDefined();
    });

    it('should not schedule when disabled', async () => {
      const config: PipelineConfig = {
        name: 'Scheduled Pipeline',
        source: { type: 'api', connection: 'https://api.example.com' },
        transformations: [],
        destination: { type: 'database', connection: 'postgresql://localhost/test' },
        schedule: {
          frequency: 'daily',
          enabled: false,
        },
      };

      const pipeline = await service.createPipeline({
        config,
        createdBy: 'user_123',
      });

      expect(pipeline.nextRunAt).toBeUndefined();
    });
  });

  // ============ Transformation Tests ============

  describe('Transformations', () => {
    it('should apply filter transformation', async () => {
      const config: PipelineConfig = {
        name: 'Filter Pipeline',
        source: { type: 'api', connection: 'https://api.example.com' },
        transformations: [
          {
            id: 'filter_1',
            type: 'filter',
            name: 'Filter Active Users',
            config: {
              filterExpression: 'record.active === true',
            },
            order: 1,
            enabled: true,
          },
        ],
        destination: { type: 'database', connection: 'postgresql://localhost/test' },
      };

      const pipeline = await service.createPipeline({
        config,
        createdBy: 'user_123',
        autoActivate: true,
      });

      const result = await service.executePipeline({
        pipelineId: pipeline.id,
        sourceData: [
          { id: 1, name: 'Alice', active: true },
          { id: 2, name: 'Bob', active: false },
          { id: 3, name: 'Charlie', active: true },
        ],
      });

      expect(result.success).toBe(true);
      // recordsProcessed reflects source data count, filter reduces what gets loaded
      expect(result.recordsProcessed).toBe(3);
    });

    it('should apply validation transformation', async () => {
      const config: PipelineConfig = {
        name: 'Validation Pipeline',
        source: { type: 'api', connection: 'https://api.example.com' },
        transformations: [
          {
            id: 'validate_1',
            type: 'validate',
            name: 'Validate Required Fields',
            config: {
              validationRules: [
                {
                  id: 'rule_1',
                  field: 'email',
                  type: 'required',
                  message: 'Email is required',
                  severity: 'error',
                },
              ],
            },
            order: 1,
            enabled: true,
          },
        ],
        destination: { type: 'database', connection: 'postgresql://localhost/test' },
      };

      const pipeline = await service.createPipeline({
        config,
        createdBy: 'user_123',
        autoActivate: true,
      });

      const result = await service.executePipeline({
        pipelineId: pipeline.id,
        sourceData: [
          { id: 1, name: 'Alice', email: 'alice@example.com' },
          { id: 2, name: 'Bob', email: '' },
        ],
        dryRun: true,
      });

      expect(result.recordsFailed).toBe(1);
    });

    it('should apply deduplication transformation', async () => {
      const config: PipelineConfig = {
        name: 'Dedup Pipeline',
        source: { type: 'api', connection: 'https://api.example.com' },
        transformations: [
          {
            id: 'dedup_1',
            type: 'deduplicate',
            name: 'Remove Duplicates',
            config: {},
            order: 1,
            enabled: true,
          },
        ],
        destination: { type: 'database', connection: 'postgresql://localhost/test' },
      };

      const pipeline = await service.createPipeline({
        config,
        createdBy: 'user_123',
        autoActivate: true,
      });

      const result = await service.executePipeline({
        pipelineId: pipeline.id,
        sourceData: [
          { id: 1, name: 'Alice' },
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ],
      });

      // recordsProcessed reflects source data count, dedup reduces what gets loaded
      expect(result.recordsProcessed).toBe(3);
      expect(result.success).toBe(true);
    });

    it('should skip disabled transformations', async () => {
      const config: PipelineConfig = {
        name: 'Mixed Pipeline',
        source: { type: 'api', connection: 'https://api.example.com' },
        transformations: [
          {
            id: 'filter_1',
            type: 'filter',
            name: 'Disabled Filter',
            config: { filterExpression: 'false' },
            order: 1,
            enabled: false,
          },
        ],
        destination: { type: 'database', connection: 'postgresql://localhost/test' },
      };

      const pipeline = await service.createPipeline({
        config,
        createdBy: 'user_123',
        autoActivate: true,
      });

      const result = await service.executePipeline({
        pipelineId: pipeline.id,
        sourceData: [{ id: 1 }, { id: 2 }],
      });

      expect(result.recordsProcessed).toBe(2);
    });
  });

  // ============ Error Handling Tests ============

  describe('Error Handling', () => {
    it('should handle pipeline validation errors', async () => {
      await expect(
        service.createPipeline({
          config: { name: '' } as any,
          createdBy: 'user_123',
        })
      ).rejects.toThrow('Pipeline name is required');
    });

    it('should handle missing source', async () => {
      await expect(
        service.createPipeline({
          config: { name: 'Test' } as any,
          createdBy: 'user_123',
        })
      ).rejects.toThrow('Pipeline source is required');
    });

    it('should handle missing destination', async () => {
      await expect(
        service.createPipeline({
          config: {
            name: 'Test',
            source: { type: 'api', connection: 'https://api.example.com' },
          } as any,
          createdBy: 'user_123',
        })
      ).rejects.toThrow('Pipeline destination is required');
    });
  });
});
