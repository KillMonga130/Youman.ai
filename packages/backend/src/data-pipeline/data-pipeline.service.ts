/**
 * Data Pipeline Service
 * Provides ETL pipeline system, data quality validation, batch processing, and scheduling
 * Requirements: 89
 */

import crypto from 'crypto';
import { logger } from '../utils/logger';
import {
  Pipeline,
  PipelineConfig,
  PipelineStatus,
  PipelineJob,
  JobStatus,
  PipelineResult,
  PipelineError,
  QualityReport,
  QualityCheck,
  QualityIssue,
  QualityCheckType,
  QualitySeverity,
  ProcessedData,
  Transformation,
  ValidationRule,
  JobLog,
  CreatePipelineOptions,
  ExecutePipelineOptions,
  DataPipelineServiceConfig,
  ScheduleConfig,
} from './types';

/** Default configuration */
const DEFAULT_CONFIG: DataPipelineServiceConfig = {
  defaultRetryAttempts: 3,
  defaultRetryDelayMs: 1000,
  maxBatchSize: 10000,
  jobTimeoutMs: 3600000, // 1 hour
  qualityThreshold: 80,
  logRetentionDays: 30,
};

/**
 * Data Pipeline Service class
 * Handles ETL pipeline creation, execution, data quality validation, and scheduling
 */
export class DataPipelineService {
  private config: DataPipelineServiceConfig;
  private pipelines: Map<string, Pipeline>;
  private jobs: Map<string, PipelineJob>;
  private scheduledJobs: Map<string, NodeJS.Timeout>;

  constructor(serviceConfig?: Partial<DataPipelineServiceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...serviceConfig };
    this.pipelines = new Map();
    this.jobs = new Map();
    this.scheduledJobs = new Map();
  }

  // ============ Pipeline Management ============

  /**
   * Creates a new pipeline
   * Requirement 89: Create ETL pipeline system
   * @param options - Pipeline creation options
   * @returns Created pipeline
   */
  async createPipeline(options: CreatePipelineOptions): Promise<Pipeline> {
    const id = this.generateId('pipe');
    const now = new Date();

    // Validate pipeline configuration
    this.validatePipelineConfig(options.config);

    const pipeline: Pipeline = {
      id,
      config: options.config,
      status: options.autoActivate ? 'active' : 'draft',
      createdAt: now,
      updatedAt: now,
      createdBy: options.createdBy,
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
    };

    // Calculate next run if scheduled
    if (options.config.schedule?.enabled) {
      pipeline.nextRunAt = this.calculateNextRun(options.config.schedule);
    }

    this.pipelines.set(id, pipeline);

    // Set up scheduling if enabled
    if (options.autoActivate && options.config.schedule?.enabled) {
      this.scheduleNextRun(pipeline);
    }

    logger.info(`Created pipeline: ${id} (${options.config.name})`);
    return pipeline;
  }

  /**
   * Gets a pipeline by ID
   * @param pipelineId - Pipeline identifier
   * @returns Pipeline or null
   */
  async getPipeline(pipelineId: string): Promise<Pipeline | null> {
    return this.pipelines.get(pipelineId) || null;
  }

  /**
   * Lists all pipelines
   * @param status - Optional status filter
   * @returns Array of pipelines
   */
  async listPipelines(status?: PipelineStatus): Promise<Pipeline[]> {
    const pipelines = Array.from(this.pipelines.values());
    return status ? pipelines.filter(p => p.status === status) : pipelines;
  }

  /**
   * Updates a pipeline
   * @param pipelineId - Pipeline identifier
   * @param updates - Partial pipeline config updates
   * @returns Updated pipeline
   */
  async updatePipeline(
    pipelineId: string,
    updates: Partial<PipelineConfig>
  ): Promise<Pipeline> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline not found: ${pipelineId}`);
    }

    pipeline.config = { ...pipeline.config, ...updates };
    pipeline.updatedAt = new Date();

    // Recalculate next run if schedule changed
    if (updates.schedule) {
      pipeline.nextRunAt = updates.schedule.enabled
        ? this.calculateNextRun(updates.schedule)
        : undefined;
      
      // Reschedule if active
      if (pipeline.status === 'active') {
        this.cancelScheduledRun(pipelineId);
        if (updates.schedule.enabled) {
          this.scheduleNextRun(pipeline);
        }
      }
    }

    logger.info(`Updated pipeline: ${pipelineId}`);
    return pipeline;
  }

  /**
   * Activates a pipeline
   * @param pipelineId - Pipeline identifier
   */
  async activatePipeline(pipelineId: string): Promise<void> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline not found: ${pipelineId}`);
    }

    pipeline.status = 'active';
    pipeline.updatedAt = new Date();

    if (pipeline.config.schedule?.enabled) {
      this.scheduleNextRun(pipeline);
    }

    logger.info(`Activated pipeline: ${pipelineId}`);
  }

  /**
   * Pauses a pipeline
   * @param pipelineId - Pipeline identifier
   */
  async pausePipeline(pipelineId: string): Promise<void> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline not found: ${pipelineId}`);
    }

    pipeline.status = 'paused';
    pipeline.updatedAt = new Date();
    this.cancelScheduledRun(pipelineId);

    logger.info(`Paused pipeline: ${pipelineId}`);
  }

  /**
   * Deletes a pipeline
   * @param pipelineId - Pipeline identifier
   */
  async deletePipeline(pipelineId: string): Promise<void> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline not found: ${pipelineId}`);
    }

    this.cancelScheduledRun(pipelineId);
    this.pipelines.delete(pipelineId);

    logger.info(`Deleted pipeline: ${pipelineId}`);
  }

  // ============ Pipeline Execution ============

  /**
   * Executes a pipeline
   * Requirement 89: Execute ETL pipeline
   * @param options - Execution options
   * @returns Pipeline result
   */
  async executePipeline(options: ExecutePipelineOptions): Promise<PipelineResult> {
    const pipeline = this.pipelines.get(options.pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline not found: ${options.pipelineId}`);
    }

    if (pipeline.status !== 'active' && pipeline.status !== 'draft') {
      throw new Error(`Pipeline is not executable (status: ${pipeline.status})`);
    }

    // Create job
    const job = this.createJob(options.pipelineId, options.triggeredBy || 'manual');
    const startTime = Date.now();

    try {
      // Extract data
      this.addJobLog(job, 'info', 'Starting data extraction', 'extract');
      const sourceData = options.sourceData || await this.extractData(pipeline.config.source);
      job.recordsProcessed = sourceData.length;
      this.addJobLog(job, 'info', `Extracted ${sourceData.length} records`, 'extract');

      // Transform data
      this.addJobLog(job, 'info', 'Starting transformations', 'transform');
      const transformedData = await this.transformData(
        sourceData,
        pipeline.config.transformations,
        job
      );

      // Validate data quality
      this.addJobLog(job, 'info', 'Validating data quality', 'validate');
      const qualityReport = await this.validateDataQuality(transformedData);

      // Check quality threshold
      if (qualityReport.overallScore < this.config.qualityThreshold && !options.dryRun) {
        throw new Error(
          `Data quality below threshold: ${qualityReport.overallScore}% < ${this.config.qualityThreshold}%`
        );
      }

      // Load data (skip if dry run)
      if (!options.dryRun) {
        this.addJobLog(job, 'info', 'Loading data to destination', 'load');
        await this.loadData(
          transformedData.filter(d => d.valid).map(d => d.transformed),
          pipeline.config.destination
        );
      }

      // Complete job
      const durationMs = Date.now() - startTime;
      job.status = 'completed';
      job.completedAt = new Date();
      job.progress = 100;
      job.recordsFailed = transformedData.filter(d => !d.valid).length;

      // Update pipeline stats
      pipeline.lastRunAt = new Date();
      pipeline.totalRuns++;
      pipeline.successfulRuns++;
      pipeline.updatedAt = new Date();

      // Schedule next run
      if (pipeline.config.schedule?.enabled) {
        pipeline.nextRunAt = this.calculateNextRun(pipeline.config.schedule);
        this.scheduleNextRun(pipeline);
      }

      this.addJobLog(job, 'info', `Pipeline completed in ${durationMs}ms`, 'complete');

      const result: PipelineResult = {
        jobId: job.id,
        pipelineId: options.pipelineId,
        success: true,
        recordsProcessed: job.recordsProcessed,
        recordsFailed: job.recordsFailed,
        durationMs,
        qualityReport,
        errors: [],
      };

      logger.info(`Pipeline ${options.pipelineId} completed successfully`);
      return result;

    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      job.status = 'failed';
      job.completedAt = new Date();
      job.errorMessage = errorMessage;
      this.addJobLog(job, 'error', errorMessage, 'error');

      // Update pipeline stats
      pipeline.lastRunAt = new Date();
      pipeline.totalRuns++;
      pipeline.failedRuns++;
      pipeline.updatedAt = new Date();

      // Handle retry
      if (this.shouldRetry(job, pipeline)) {
        await this.retryJob(job.id);
      }

      const result: PipelineResult = {
        jobId: job.id,
        pipelineId: options.pipelineId,
        success: false,
        recordsProcessed: job.recordsProcessed,
        recordsFailed: job.recordsFailed,
        durationMs,
        errors: [{
          code: 'PIPELINE_FAILED',
          message: errorMessage,
          timestamp: new Date(),
          recoverable: this.shouldRetry(job, pipeline),
        }],
      };

      logger.error(`Pipeline ${options.pipelineId} failed: ${errorMessage}`);
      return result;
    }
  }

  // ============ Data Quality Validation ============

  /**
   * Validates data quality
   * Requirement 89: Build data quality validation
   * @param data - Data to validate
   * @returns Quality report
   */
  async validateDataQuality(data: ProcessedData[]): Promise<QualityReport> {
    const checks: QualityCheck[] = [];
    const issues: QualityIssue[] = [];
    const totalRecords = data.length;
    let validRecords = 0;

    // Completeness check
    const completenessResult = this.checkCompleteness(data);
    checks.push(completenessResult.check);
    issues.push(...completenessResult.issues);

    // Uniqueness check
    const uniquenessResult = this.checkUniqueness(data);
    checks.push(uniquenessResult.check);
    issues.push(...uniquenessResult.issues);

    // Validity check
    const validityResult = this.checkValidity(data);
    checks.push(validityResult.check);
    issues.push(...validityResult.issues);
    validRecords = validityResult.validCount;

    // Consistency check
    const consistencyResult = this.checkConsistency(data);
    checks.push(consistencyResult.check);
    issues.push(...consistencyResult.issues);

    // Calculate overall score
    const overallScore = checks.length > 0
      ? Math.round(checks.reduce((sum, c) => sum + c.score, 0) / checks.length)
      : 100;

    const report: QualityReport = {
      overallScore,
      totalRecords,
      validRecords,
      invalidRecords: totalRecords - validRecords,
      checks,
      issues,
      generatedAt: new Date(),
    };

    return report;
  }

  /**
   * Checks data completeness
   */
  private checkCompleteness(data: ProcessedData[]): { check: QualityCheck; issues: QualityIssue[] } {
    const issues: QualityIssue[] = [];
    let completeRecords = 0;
    const fieldMissingCounts: Record<string, number> = {};

    for (const record of data) {
      const transformed = record.transformed;
      let isComplete = true;

      for (const [key, value] of Object.entries(transformed)) {
        if (value === null || value === undefined || value === '') {
          isComplete = false;
          fieldMissingCounts[key] = (fieldMissingCounts[key] || 0) + 1;
        }
      }

      if (isComplete) completeRecords++;
    }

    const score = data.length > 0 ? Math.round((completeRecords / data.length) * 100) : 100;

    // Create issues for fields with high missing rates
    for (const [field, count] of Object.entries(fieldMissingCounts)) {
      const missingRate = count / data.length;
      if (missingRate > 0.1) {
        issues.push({
          id: this.generateId('issue'),
          type: 'completeness',
          severity: missingRate > 0.5 ? 'error' : 'warning',
          field,
          message: `Field "${field}" has ${Math.round(missingRate * 100)}% missing values`,
          affectedRecords: count,
          recommendation: `Review data source for field "${field}" or add default value transformation`,
        });
      }
    }

    return {
      check: {
        type: 'completeness',
        name: 'Data Completeness',
        passed: score >= this.config.qualityThreshold,
        score,
        details: `${completeRecords}/${data.length} records are complete`,
      },
      issues,
    };
  }

  /**
   * Checks data uniqueness
   */
  private checkUniqueness(data: ProcessedData[]): { check: QualityCheck; issues: QualityIssue[] } {
    const issues: QualityIssue[] = [];
    const seen = new Set<string>();
    let duplicates = 0;

    for (const record of data) {
      const key = JSON.stringify(record.transformed);
      if (seen.has(key)) {
        duplicates++;
      } else {
        seen.add(key);
      }
    }

    const uniqueRecords = data.length - duplicates;
    const score = data.length > 0 ? Math.round((uniqueRecords / data.length) * 100) : 100;

    if (duplicates > 0) {
      issues.push({
        id: this.generateId('issue'),
        type: 'uniqueness',
        severity: duplicates > data.length * 0.1 ? 'error' : 'warning',
        message: `Found ${duplicates} duplicate records`,
        affectedRecords: duplicates,
        recommendation: 'Add deduplication transformation or review data source',
      });
    }

    return {
      check: {
        type: 'uniqueness',
        name: 'Data Uniqueness',
        passed: score >= this.config.qualityThreshold,
        score,
        details: `${uniqueRecords}/${data.length} records are unique`,
      },
      issues,
    };
  }

  /**
   * Checks data validity
   */
  private checkValidity(data: ProcessedData[]): { check: QualityCheck; issues: QualityIssue[]; validCount: number } {
    const issues: QualityIssue[] = [];
    const validRecords = data.filter(d => d.valid).length;
    const score = data.length > 0 ? Math.round((validRecords / data.length) * 100) : 100;

    // Collect validation errors
    const errorCounts: Record<string, number> = {};
    for (const record of data) {
      if (record.errors) {
        for (const error of record.errors) {
          errorCounts[error] = (errorCounts[error] || 0) + 1;
        }
      }
    }

    for (const [error, count] of Object.entries(errorCounts)) {
      issues.push({
        id: this.generateId('issue'),
        type: 'validity',
        severity: count > data.length * 0.1 ? 'error' : 'warning',
        message: error,
        affectedRecords: count,
        recommendation: 'Review validation rules or fix source data',
      });
    }

    return {
      check: {
        type: 'validity',
        name: 'Data Validity',
        passed: score >= this.config.qualityThreshold,
        score,
        details: `${validRecords}/${data.length} records passed validation`,
      },
      issues,
      validCount: validRecords,
    };
  }

  /**
   * Checks data consistency
   */
  private checkConsistency(data: ProcessedData[]): { check: QualityCheck; issues: QualityIssue[] } {
    const issues: QualityIssue[] = [];
    let consistentRecords = 0;

    // Check type consistency across records
    const fieldTypes: Record<string, Set<string>> = {};

    for (const record of data) {
      let isConsistent = true;
      for (const [key, value] of Object.entries(record.transformed)) {
        const type = typeof value;
        if (!fieldTypes[key]) {
          fieldTypes[key] = new Set();
        }
        fieldTypes[key].add(type);
        if (fieldTypes[key].size > 1) {
          isConsistent = false;
        }
      }
      if (isConsistent) consistentRecords++;
    }

    // Check for type inconsistencies
    for (const [field, types] of Object.entries(fieldTypes)) {
      if (types.size > 1) {
        issues.push({
          id: this.generateId('issue'),
          type: 'consistency',
          severity: 'warning',
          field,
          message: `Field "${field}" has inconsistent types: ${Array.from(types).join(', ')}`,
          affectedRecords: data.length,
          recommendation: `Add type coercion transformation for field "${field}"`,
        });
      }
    }

    const score = data.length > 0 ? Math.round((consistentRecords / data.length) * 100) : 100;

    return {
      check: {
        type: 'consistency',
        name: 'Data Consistency',
        passed: score >= this.config.qualityThreshold,
        score,
        details: `${consistentRecords}/${data.length} records are consistent`,
      },
      issues,
    };
  }


  // ============ Batch Processing ============

  /**
   * Processes data in batches
   * Requirement 89: Implement batch processing
   * @param data - Data to process
   * @returns Processed data array
   */
  async processInBatch(data: Record<string, unknown>[]): Promise<ProcessedData[]> {
    const results: ProcessedData[] = [];
    const batchSize = this.config.maxBatchSize;

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const batchResults = await this.processBatch(batch);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Processes a single batch
   */
  private async processBatch(batch: Record<string, unknown>[]): Promise<ProcessedData[]> {
    return batch.map(record => ({
      original: record,
      transformed: { ...record },
      valid: true,
    }));
  }

  // ============ Job Management ============

  /**
   * Gets a job by ID
   * @param jobId - Job identifier
   * @returns Job or null
   */
  async getJob(jobId: string): Promise<PipelineJob | null> {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Lists jobs for a pipeline
   * @param pipelineId - Pipeline identifier
   * @param status - Optional status filter
   * @returns Array of jobs
   */
  async listJobs(pipelineId: string, status?: JobStatus): Promise<PipelineJob[]> {
    const jobs = Array.from(this.jobs.values())
      .filter(j => j.pipelineId === pipelineId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
    
    return status ? jobs.filter(j => j.status === status) : jobs;
  }

  /**
   * Cancels a running job
   * @param jobId - Job identifier
   */
  async cancelJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    if (job.status !== 'running' && job.status !== 'pending') {
      throw new Error(`Job cannot be cancelled (status: ${job.status})`);
    }

    job.status = 'cancelled';
    job.completedAt = new Date();
    this.addJobLog(job, 'info', 'Job cancelled by user', 'cancel');

    logger.info(`Cancelled job: ${jobId}`);
  }

  /**
   * Handles failed jobs
   * Requirement 89: Add failed job handling
   * @param jobId - Job identifier
   */
  async handleFailedJobs(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    if (job.status !== 'failed') {
      throw new Error(`Job is not in failed status: ${jobId}`);
    }

    const pipeline = this.pipelines.get(job.pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline not found: ${job.pipelineId}`);
    }

    // Check if retry is possible
    if (this.shouldRetry(job, pipeline)) {
      await this.retryJob(jobId);
    } else {
      // Send alert if configured
      if (pipeline.config.alerts?.onFailure) {
        await this.sendAlert(pipeline, job, 'failure');
      }
      logger.warn(`Job ${jobId} failed and cannot be retried`);
    }
  }

  /**
   * Retries a failed job
   * @param jobId - Job identifier
   */
  private async retryJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    const pipeline = this.pipelines.get(job.pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline not found: ${job.pipelineId}`);
    }

    const retryConfig = pipeline.config.retry || {
      maxAttempts: this.config.defaultRetryAttempts,
      initialDelayMs: this.config.defaultRetryDelayMs,
      maxDelayMs: 60000,
      backoffMultiplier: 2,
    };

    if (job.retryCount >= retryConfig.maxAttempts) {
      logger.warn(`Job ${jobId} exceeded max retry attempts`);
      return;
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      retryConfig.initialDelayMs * Math.pow(retryConfig.backoffMultiplier, job.retryCount),
      retryConfig.maxDelayMs
    );

    job.status = 'retrying';
    job.retryCount++;
    this.addJobLog(job, 'info', `Retrying in ${delay}ms (attempt ${job.retryCount})`, 'retry');

    // Schedule retry
    setTimeout(async () => {
      await this.executePipeline({
        pipelineId: job.pipelineId,
        triggeredBy: 'retry',
      });
    }, delay);

    logger.info(`Scheduled retry for job ${jobId} in ${delay}ms`);
  }

  /**
   * Checks if job should be retried
   */
  private shouldRetry(job: PipelineJob, pipeline: Pipeline): boolean {
    const retryConfig = pipeline.config.retry;
    if (!retryConfig) return false;

    return job.retryCount < retryConfig.maxAttempts;
  }

  // ============ Scheduling ============

  /**
   * Schedules next pipeline run
   * Requirement 89: Create pipeline scheduling
   */
  private scheduleNextRun(pipeline: Pipeline): void {
    if (!pipeline.config.schedule?.enabled || !pipeline.nextRunAt) {
      return;
    }

    const delay = pipeline.nextRunAt.getTime() - Date.now();
    if (delay <= 0) {
      // Run immediately if past due
      this.executePipeline({ pipelineId: pipeline.id, triggeredBy: 'schedule' });
      return;
    }

    // Cancel existing scheduled run
    this.cancelScheduledRun(pipeline.id);

    // Schedule new run
    const timeout = setTimeout(async () => {
      await this.executePipeline({ pipelineId: pipeline.id, triggeredBy: 'schedule' });
    }, delay);

    this.scheduledJobs.set(pipeline.id, timeout);
    logger.info(`Scheduled pipeline ${pipeline.id} to run at ${pipeline.nextRunAt.toISOString()}`);
  }

  /**
   * Cancels scheduled pipeline run
   */
  private cancelScheduledRun(pipelineId: string): void {
    const timeout = this.scheduledJobs.get(pipelineId);
    if (timeout) {
      clearTimeout(timeout);
      this.scheduledJobs.delete(pipelineId);
    }
  }

  /**
   * Calculates next run time based on schedule
   */
  private calculateNextRun(schedule: ScheduleConfig): Date {
    const now = new Date();
    
    switch (schedule.frequency) {
      case 'once':
        return schedule.startTime || now;
      
      case 'hourly':
        const nextHour = new Date(now);
        nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
        return nextHour;
      
      case 'daily':
        const nextDay = new Date(now);
        nextDay.setDate(nextDay.getDate() + 1);
        nextDay.setHours(0, 0, 0, 0);
        return nextDay;
      
      case 'weekly':
        const nextWeek = new Date(now);
        nextWeek.setDate(nextWeek.getDate() + 7);
        nextWeek.setHours(0, 0, 0, 0);
        return nextWeek;
      
      case 'monthly':
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1, 1);
        nextMonth.setHours(0, 0, 0, 0);
        return nextMonth;
      
      case 'cron':
        // Simplified cron parsing - in production use a library like node-cron
        return this.parseCronExpression(schedule.cronExpression || '0 0 * * *');
      
      default:
        return now;
    }
  }

  /**
   * Parses cron expression (simplified)
   */
  private parseCronExpression(expression: string): Date {
    // Simplified implementation - returns next hour
    // In production, use a proper cron parser library
    const next = new Date();
    next.setHours(next.getHours() + 1, 0, 0, 0);
    return next;
  }

  // ============ Data Operations ============

  /**
   * Extracts data from source
   */
  private async extractData(source: any): Promise<Record<string, unknown>[]> {
    // In production, implement actual data extraction based on source type
    // For now, return empty array as placeholder
    logger.info(`Extracting data from ${source.type}: ${source.connection}`);
    return [];
  }

  /**
   * Transforms data through pipeline steps
   */
  private async transformData(
    data: Record<string, unknown>[],
    transformations: Transformation[],
    job: PipelineJob
  ): Promise<ProcessedData[]> {
    let processedData: ProcessedData[] = data.map(record => ({
      original: record,
      transformed: { ...record },
      valid: true,
    }));

    const enabledTransformations = transformations
      .filter(t => t.enabled)
      .sort((a, b) => a.order - b.order);

    for (const transformation of enabledTransformations) {
      job.currentStep = transformation.name;
      this.addJobLog(job, 'info', `Applying transformation: ${transformation.name}`, transformation.id);

      processedData = await this.applyTransformation(processedData, transformation);
      
      const progress = Math.round(
        ((enabledTransformations.indexOf(transformation) + 1) / enabledTransformations.length) * 80
      );
      job.progress = progress;
    }

    return processedData;
  }

  /**
   * Applies a single transformation
   */
  private async applyTransformation(
    data: ProcessedData[],
    transformation: Transformation
  ): Promise<ProcessedData[]> {
    switch (transformation.type) {
      case 'filter':
        return this.applyFilter(data, transformation);
      case 'map':
        return this.applyMap(data, transformation);
      case 'validate':
        return this.applyValidation(data, transformation);
      case 'deduplicate':
        return this.applyDeduplicate(data);
      case 'sort':
        return this.applySort(data, transformation);
      default:
        return data;
    }
  }

  /**
   * Applies filter transformation
   */
  private applyFilter(data: ProcessedData[], transformation: Transformation): ProcessedData[] {
    const expression = transformation.config.filterExpression;
    if (!expression) return data;

    return data.filter(record => {
      try {
        // Simple expression evaluation - in production use a proper expression parser
        const fn = new Function('record', `return ${expression}`);
        return fn(record.transformed);
      } catch {
        return true;
      }
    });
  }

  /**
   * Applies map transformation
   */
  private applyMap(data: ProcessedData[], transformation: Transformation): ProcessedData[] {
    const mappings = transformation.config.fieldMappings;
    if (!mappings) return data;

    return data.map(record => {
      const transformed = { ...record.transformed };
      for (const [newField, oldField] of Object.entries(mappings)) {
        if (oldField in transformed) {
          transformed[newField] = transformed[oldField as string];
          if (newField !== oldField) {
            delete transformed[oldField as string];
          }
        }
      }
      return { ...record, transformed };
    });
  }

  /**
   * Applies validation transformation
   */
  private applyValidation(data: ProcessedData[], transformation: Transformation): ProcessedData[] {
    const rules = transformation.config.validationRules || [];

    return data.map(record => {
      const errors: string[] = [];

      for (const rule of rules) {
        const value = record.transformed[rule.field];
        const isValid = this.validateField(value, rule);
        
        if (!isValid) {
          errors.push(rule.message);
        }
      }

      return {
        ...record,
        valid: errors.length === 0,
        errors: errors.length > 0 ? [...(record.errors || []), ...errors] : record.errors,
      };
    });
  }

  /**
   * Validates a field against a rule
   */
  private validateField(value: unknown, rule: ValidationRule): boolean {
    switch (rule.type) {
      case 'required':
        return value !== null && value !== undefined && value !== '';
      case 'type':
        return typeof value === rule.expected;
      case 'range':
        const range = rule.expected as { min?: number; max?: number };
        const numValue = Number(value);
        return (
          (!range.min || numValue >= range.min) &&
          (!range.max || numValue <= range.max)
        );
      case 'pattern':
        return new RegExp(rule.expected as string).test(String(value));
      case 'enum':
        return (rule.expected as unknown[]).includes(value);
      default:
        return true;
    }
  }

  /**
   * Applies deduplication transformation
   */
  private applyDeduplicate(data: ProcessedData[]): ProcessedData[] {
    const seen = new Set<string>();
    return data.filter(record => {
      const key = JSON.stringify(record.transformed);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Applies sort transformation
   */
  private applySort(data: ProcessedData[], transformation: Transformation): ProcessedData[] {
    const sortConfig = transformation.config.sort;
    if (!sortConfig?.fields?.length) return data;

    return [...data].sort((a, b) => {
      for (const field of sortConfig.fields) {
        const aVal = a.transformed[field.field] as string | number | boolean | null;
        const bVal = b.transformed[field.field] as string | number | boolean | null;
        
        let comparison = 0;
        if (aVal === null || aVal === undefined) comparison = -1;
        else if (bVal === null || bVal === undefined) comparison = 1;
        else if (aVal < bVal) comparison = -1;
        else if (aVal > bVal) comparison = 1;
        
        if (comparison !== 0) {
          return field.direction === 'desc' ? -comparison : comparison;
        }
      }
      return 0;
    });
  }

  /**
   * Loads data to destination
   */
  private async loadData(data: Record<string, unknown>[], destination: any): Promise<void> {
    // In production, implement actual data loading based on destination type
    logger.info(`Loading ${data.length} records to ${destination.type}: ${destination.target || destination.connection}`);
  }

  // ============ Alerts ============

  /**
   * Sends alert for pipeline events
   */
  private async sendAlert(pipeline: Pipeline, job: PipelineJob, type: 'success' | 'failure' | 'warning'): Promise<void> {
    const alerts = pipeline.config.alerts;
    if (!alerts) return;

    for (const channel of alerts.channels) {
      logger.info(`Sending ${type} alert to ${channel.type}: ${channel.target}`);
      // In production, implement actual alert sending
    }
  }

  // ============ Helper Methods ============

  /**
   * Creates a new job
   */
  private createJob(pipelineId: string, triggeredBy: PipelineJob['triggeredBy']): PipelineJob {
    const id = this.generateId('job');
    const job: PipelineJob = {
      id,
      pipelineId,
      status: 'running',
      startedAt: new Date(),
      recordsProcessed: 0,
      recordsFailed: 0,
      progress: 0,
      retryCount: 0,
      triggeredBy,
      logs: [],
    };

    this.jobs.set(id, job);
    return job;
  }

  /**
   * Adds a log entry to a job
   */
  private addJobLog(
    job: PipelineJob,
    level: JobLog['level'],
    message: string,
    step?: string
  ): void {
    job.logs.push({
      timestamp: new Date(),
      level,
      message,
      step,
    });
  }

  /**
   * Validates pipeline configuration
   */
  private validatePipelineConfig(config: PipelineConfig): void {
    if (!config.name) {
      throw new Error('Pipeline name is required');
    }
    if (!config.source) {
      throw new Error('Pipeline source is required');
    }
    if (!config.destination) {
      throw new Error('Pipeline destination is required');
    }
  }

  /**
   * Generates a unique ID
   */
  private generateId(prefix: string): string {
    return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
  }
}

/** Singleton instance */
export const dataPipelineService = new DataPipelineService();
