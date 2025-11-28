/**
 * Scheduling & Automation Service
 * Manages scheduled processing and recurring tasks
 * Requirements: 35
 */

import crypto from 'crypto';
import cron, { ScheduledTask } from 'node-cron';
import { logger } from '../utils/logger';
import { sendEmail } from '../collaboration/email.service';
import {
  ScheduledJob,
  Schedule,
  JobResult,
  JobStatus,
  CreateScheduleOptions,
  UpdateScheduleOptions,
  UpcomingJob,
  RetryConfig,
  SchedulingServiceConfig,
  JobNotificationOptions,
  DayOfWeek,
  JobHistoryEntry,
  ContentSource,
  TransformSettings,
} from './types';

/** Default configuration */
const DEFAULT_CONFIG: SchedulingServiceConfig = {
  defaultRetryConfig: {
    maxRetries: 3,
    currentRetries: 0,
    retryDelayMs: 60000, // 1 minute
    exponentialBackoff: true,
    maxDelayMs: 3600000, // 1 hour
  },
  maxJobsPerUser: 50,
  minIntervalMinutes: 5,
  defaultTimezone: 'UTC',
  enableNotifications: true,
  executionTimeoutMs: 300000, // 5 minutes
};

/** Day of week to cron number mapping */
const DAY_TO_CRON: Record<DayOfWeek, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

/**
 * Scheduling Service class
 * Handles scheduled job creation, execution, and management
 */
export class SchedulingService {
  private config: SchedulingServiceConfig;
  private jobs: Map<string, ScheduledJob>;
  private cronTasks: Map<string, ScheduledTask>;
  private jobHistory: Map<string, JobResult[]>;

  constructor(serviceConfig?: Partial<SchedulingServiceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...serviceConfig };
    this.jobs = new Map();
    this.cronTasks = new Map();
    this.jobHistory = new Map();
  }

  /**
   * Creates a new scheduled job
   * Requirement 35: Implement recurring schedule creation
   * @param options - Job creation options
   * @returns Created scheduled job
   */
  async createSchedule(options: CreateScheduleOptions): Promise<ScheduledJob> {
    // Validate user job limit
    const userJobs = this.getJobsByUser(options.userId);
    if (userJobs.length >= this.config.maxJobsPerUser) {
      throw new Error(`Maximum jobs per user (${this.config.maxJobsPerUser}) exceeded`);
    }

    // Validate schedule
    this.validateSchedule(options.schedule);

    // Generate cron expression
    const cronExpression = this.scheduleToCron(options.schedule);

    // Validate cron expression
    if (!cron.validate(cronExpression)) {
      throw new Error(`Invalid cron expression generated: ${cronExpression}`);
    }

    const id = this.generateId('job');
    const now = new Date();

    const retryConfig: RetryConfig = {
      ...this.config.defaultRetryConfig,
      ...options.retryConfig,
      currentRetries: 0,
    };

    const job: ScheduledJob = {
      id,
      name: options.name,
      description: options.description,
      userId: options.userId,
      projectId: options.projectId,
      schedule: options.schedule,
      source: options.source,
      settings: options.settings,
      notificationEmail: options.notificationEmail,
      status: 'pending',
      cronExpression,
      executionCount: 0,
      retryConfig,
      createdAt: now,
      updatedAt: now,
      enabled: true,
    };

    // Calculate next execution time
    job.nextExecutionAt = this.calculateNextExecution(job.schedule);

    // Store job
    this.jobs.set(id, job);

    // Start cron task if enabled
    if (options.startImmediately !== false) {
      this.startCronTask(job);
    }

    logger.info(`Created scheduled job: ${id}`, {
      name: job.name,
      userId: job.userId,
      cronExpression,
      nextExecution: job.nextExecutionAt,
    });

    return job;
  }

  /**
   * Executes a scheduled job
   * @param jobId - Job identifier
   * @returns Job execution result
   */
  async executeScheduledJob(jobId: string): Promise<JobResult> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    const resultId = this.generateId('result');
    const startedAt = new Date();

    // Update job status
    job.status = 'running';
    job.updatedAt = new Date();

    // Send start notification
    if (this.config.enableNotifications) {
      await this.sendJobNotification({
        to: job.notificationEmail,
        jobName: job.name,
        type: 'started',
      });
    }

    let result: JobResult;

    try {
      // Simulate content import and transformation
      // In production, this would call actual services
      const importedContent = await this.importContent(job.source);
      const transformedContent = await this.transformContent(importedContent, job.settings);

      const completedAt = new Date();
      const durationMs = completedAt.getTime() - startedAt.getTime();

      result = {
        id: resultId,
        jobId,
        status: 'success',
        startedAt,
        completedAt,
        durationMs,
        wordsProcessed: this.countWords(transformedContent),
        outputDocumentId: this.generateId('doc'),
        retryAttempt: job.retryConfig.currentRetries,
        metrics: {
          detectionScoreBefore: 75,
          detectionScoreAfter: 25,
          transformationPercentage: 45,
        },
      };

      // Reset retry count on success
      job.retryConfig.currentRetries = 0;
      job.status = 'completed';

      // Send success notification
      if (this.config.enableNotifications) {
        await this.sendJobNotification({
          to: job.notificationEmail,
          jobName: job.name,
          type: 'completed',
          result,
        });
      }
    } catch (error) {
      const completedAt = new Date();
      const durationMs = completedAt.getTime() - startedAt.getTime();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      result = {
        id: resultId,
        jobId,
        status: 'failure',
        startedAt,
        completedAt,
        durationMs,
        wordsProcessed: 0,
        error: errorMessage,
        errorDetails: { stack: error instanceof Error ? error.stack : undefined },
        retryAttempt: job.retryConfig.currentRetries,
      };

      // Handle retry logic
      await this.handleJobFailure(job, result);
    }

    // Update job metadata
    job.executionCount++;
    job.lastExecutedAt = startedAt;
    job.lastResult = result;
    job.nextExecutionAt = this.calculateNextExecution(job.schedule);
    job.updatedAt = new Date();

    // Store in history
    this.addToHistory(jobId, result);

    logger.info(`Job execution completed: ${jobId}`, {
      status: result.status,
      durationMs: result.durationMs,
      wordsProcessed: result.wordsProcessed,
    });

    return result;
  }

  /**
   * Gets upcoming scheduled jobs for a user
   * Requirement 35: Display upcoming scheduled tasks
   * @param userId - User identifier
   * @returns Array of upcoming jobs
   */
  async getUpcomingJobs(userId: string): Promise<UpcomingJob[]> {
    const userJobs = this.getJobsByUser(userId);
    const now = Date.now();

    const upcoming: UpcomingJob[] = userJobs
      .filter(job => job.enabled && job.nextExecutionAt && job.status !== 'cancelled')
      .map(job => ({
        jobId: job.id,
        name: job.name,
        nextExecutionAt: job.nextExecutionAt!,
        timeUntilMs: job.nextExecutionAt!.getTime() - now,
        frequency: job.schedule.frequency,
        status: job.status,
        sourceType: job.source.type,
      }))
      .sort((a, b) => a.nextExecutionAt.getTime() - b.nextExecutionAt.getTime());

    return upcoming;
  }

  /**
   * Cancels a scheduled job
   * @param jobId - Job identifier
   */
  async cancelSchedule(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    // Stop cron task
    this.stopCronTask(jobId);

    // Update job status
    job.status = 'cancelled';
    job.enabled = false;
    job.updatedAt = new Date();

    logger.info(`Cancelled scheduled job: ${jobId}`);
  }

  /**
   * Updates a scheduled job
   * @param jobId - Job identifier
   * @param options - Update options
   * @returns Updated job
   */
  async updateSchedule(jobId: string, options: UpdateScheduleOptions): Promise<ScheduledJob> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    // Update fields
    if (options.name !== undefined) job.name = options.name;
    if (options.description !== undefined) job.description = options.description;
    if (options.source !== undefined) job.source = options.source;
    if (options.settings !== undefined) job.settings = options.settings;
    if (options.notificationEmail !== undefined) job.notificationEmail = options.notificationEmail;
    if (options.enabled !== undefined) job.enabled = options.enabled;

    if (options.retryConfig) {
      job.retryConfig = { ...job.retryConfig, ...options.retryConfig };
    }

    // Update schedule if provided
    if (options.schedule) {
      this.validateSchedule(options.schedule);
      job.schedule = options.schedule;
      job.cronExpression = this.scheduleToCron(options.schedule);
      job.nextExecutionAt = this.calculateNextExecution(options.schedule);

      // Restart cron task with new schedule
      this.stopCronTask(jobId);
      if (job.enabled) {
        this.startCronTask(job);
      }
    }

    job.updatedAt = new Date();

    logger.info(`Updated scheduled job: ${jobId}`);
    return job;
  }

  /**
   * Gets a job by ID
   * @param jobId - Job identifier
   * @returns Job or null
   */
  async getJob(jobId: string): Promise<ScheduledJob | null> {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Gets all jobs for a user
   * @param userId - User identifier
   * @returns Array of jobs
   */
  getJobsByUser(userId: string): ScheduledJob[] {
    return Array.from(this.jobs.values()).filter(job => job.userId === userId);
  }

  /**
   * Gets job execution history
   * @param jobId - Job identifier
   * @param limit - Maximum entries to return
   * @returns Array of job results
   */
  getJobHistory(jobId: string, limit: number = 10): JobResult[] {
    const history = this.jobHistory.get(jobId) || [];
    return history.slice(-limit);
  }

  /**
   * Pauses a scheduled job
   * @param jobId - Job identifier
   */
  async pauseJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    this.stopCronTask(jobId);
    job.status = 'paused';
    job.enabled = false;
    job.updatedAt = new Date();

    logger.info(`Paused scheduled job: ${jobId}`);
  }

  /**
   * Resumes a paused job
   * @param jobId - Job identifier
   */
  async resumeJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    job.status = 'pending';
    job.enabled = true;
    job.nextExecutionAt = this.calculateNextExecution(job.schedule);
    job.updatedAt = new Date();

    this.startCronTask(job);

    logger.info(`Resumed scheduled job: ${jobId}`);
  }

  /**
   * Manually triggers a job execution
   * @param jobId - Job identifier
   * @returns Job result
   */
  async triggerJob(jobId: string): Promise<JobResult> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    return this.executeScheduledJob(jobId);
  }

  /**
   * Shuts down the scheduling service
   */
  shutdown(): void {
    for (const [jobId] of this.cronTasks) {
      this.stopCronTask(jobId);
    }
    logger.info('Scheduling service shut down');
  }

  // ============ Private Helper Methods ============

  /**
   * Generates a unique identifier
   */
  private generateId(prefix: string): string {
    return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Validates schedule configuration
   */
  private validateSchedule(schedule: Schedule): void {
    // Validate time format (HH:MM)
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(schedule.time)) {
      throw new Error('Invalid time format. Use HH:MM (24-hour format)');
    }

    // Validate day of month for monthly schedules
    if (schedule.frequency === 'monthly') {
      if (!schedule.dayOfMonth || schedule.dayOfMonth < 1 || schedule.dayOfMonth > 31) {
        throw new Error('Day of month must be between 1 and 31 for monthly schedules');
      }
    }

    // Validate day of week for weekly schedules
    if (schedule.frequency === 'weekly') {
      if (!schedule.dayOfWeek) {
        throw new Error('Day of week is required for weekly schedules');
      }
    }

    // Validate date range
    if (schedule.startDate && schedule.endDate) {
      if (schedule.startDate >= schedule.endDate) {
        throw new Error('Start date must be before end date');
      }
    }
  }

  /**
   * Converts schedule to cron expression
   */
  private scheduleToCron(schedule: Schedule): string {
    const [hours, minutes] = schedule.time.split(':').map(Number);

    switch (schedule.frequency) {
      case 'once':
        // For one-time jobs, we'll handle them differently
        // Use a specific date/time pattern
        return `${minutes} ${hours} * * *`;

      case 'daily':
        return `${minutes} ${hours} * * *`;

      case 'weekly':
        const dayNum = DAY_TO_CRON[schedule.dayOfWeek!];
        return `${minutes} ${hours} * * ${dayNum}`;

      case 'monthly':
        return `${minutes} ${hours} ${schedule.dayOfMonth} * *`;

      default:
        throw new Error(`Unsupported frequency: ${schedule.frequency}`);
    }
  }

  /**
   * Calculates the next execution time
   */
  private calculateNextExecution(schedule: Schedule): Date {
    const now = new Date();
    const [hours, minutes] = schedule.time.split(':').map(Number);

    let next = new Date(now);
    next.setHours(hours!, minutes!, 0, 0);

    // If the time has passed today, move to next occurrence
    if (next <= now) {
      switch (schedule.frequency) {
        case 'once':
        case 'daily':
          next.setDate(next.getDate() + 1);
          break;

        case 'weekly':
          const targetDay = DAY_TO_CRON[schedule.dayOfWeek!];
          const currentDay = next.getDay();
          let daysUntil = targetDay - currentDay;
          if (daysUntil <= 0) daysUntil += 7;
          next.setDate(next.getDate() + daysUntil);
          break;

        case 'monthly':
          next.setMonth(next.getMonth() + 1);
          next.setDate(schedule.dayOfMonth!);
          break;
      }
    } else {
      // Adjust for weekly/monthly if needed
      if (schedule.frequency === 'weekly') {
        const targetDay = DAY_TO_CRON[schedule.dayOfWeek!];
        const currentDay = next.getDay();
        if (currentDay !== targetDay) {
          let daysUntil = targetDay - currentDay;
          if (daysUntil < 0) daysUntil += 7;
          next.setDate(next.getDate() + daysUntil);
        }
      } else if (schedule.frequency === 'monthly') {
        if (next.getDate() !== schedule.dayOfMonth) {
          if (now.getDate() > schedule.dayOfMonth!) {
            next.setMonth(next.getMonth() + 1);
          }
          next.setDate(schedule.dayOfMonth!);
        }
      }
    }

    return next;
  }

  /**
   * Starts a cron task for a job
   */
  private startCronTask(job: ScheduledJob): void {
    if (this.cronTasks.has(job.id)) {
      this.stopCronTask(job.id);
    }

    const task = cron.schedule(job.cronExpression, async () => {
      // Check if job is still enabled
      const currentJob = this.jobs.get(job.id);
      if (!currentJob || !currentJob.enabled) {
        return;
      }

      // Check end date
      if (currentJob.schedule.endDate && new Date() > currentJob.schedule.endDate) {
        await this.cancelSchedule(job.id);
        return;
      }

      // Execute the job
      try {
        await this.executeScheduledJob(job.id);
      } catch (error) {
        logger.error(`Error executing scheduled job ${job.id}:`, error);
      }

      // For one-time jobs, cancel after execution
      if (currentJob.schedule.frequency === 'once') {
        await this.cancelSchedule(job.id);
      }
    }, {
      timezone: job.schedule.timezone || this.config.defaultTimezone,
    });

    this.cronTasks.set(job.id, task);
    logger.debug(`Started cron task for job: ${job.id}`);
  }

  /**
   * Stops a cron task
   */
  private stopCronTask(jobId: string): void {
    const task = this.cronTasks.get(jobId);
    if (task) {
      task.stop();
      this.cronTasks.delete(jobId);
      logger.debug(`Stopped cron task for job: ${jobId}`);
    }
  }

  /**
   * Handles job failure with retry logic
   * Requirement 35: Add retry logic for failed jobs
   */
  private async handleJobFailure(job: ScheduledJob, result: JobResult): Promise<void> {
    job.retryConfig.currentRetries++;

    if (job.retryConfig.currentRetries < job.retryConfig.maxRetries) {
      // Calculate retry delay
      let delay = job.retryConfig.retryDelayMs;
      if (job.retryConfig.exponentialBackoff) {
        delay = Math.min(
          delay * Math.pow(2, job.retryConfig.currentRetries - 1),
          job.retryConfig.maxDelayMs
        );
      }

      job.status = 'pending';

      // Schedule retry
      setTimeout(async () => {
        try {
          await this.executeScheduledJob(job.id);
        } catch (error) {
          logger.error(`Retry failed for job ${job.id}:`, error);
        }
      }, delay);

      logger.info(`Scheduled retry for job ${job.id} in ${delay}ms (attempt ${job.retryConfig.currentRetries})`);
    } else {
      // Max retries exceeded
      job.status = 'failed';

      // Send failure notification
      if (this.config.enableNotifications) {
        await this.sendJobNotification({
          to: job.notificationEmail,
          jobName: job.name,
          type: 'failed',
          result,
          message: `Job failed after ${job.retryConfig.maxRetries} retry attempts`,
        });
      }

      logger.error(`Job ${job.id} failed after ${job.retryConfig.maxRetries} retries`);
    }
  }

  /**
   * Adds result to job history
   */
  private addToHistory(jobId: string, result: JobResult): void {
    let history = this.jobHistory.get(jobId);
    if (!history) {
      history = [];
      this.jobHistory.set(jobId, history);
    }

    history.push(result);

    // Keep only last 100 entries
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * Sends job notification email
   * Requirement 35: Build email notification system
   */
  private async sendJobNotification(options: JobNotificationOptions): Promise<void> {
    const { to, jobName, type, result, nextExecutionAt, message } = options;

    let subject: string;
    let html: string;

    switch (type) {
      case 'started':
        subject = `[AI Humanizer] Job Started: ${jobName}`;
        html = this.buildNotificationHtml({
          title: 'Job Started',
          jobName,
          message: 'Your scheduled job has started processing.',
          color: '#3498db',
        });
        break;

      case 'completed':
        subject = `[AI Humanizer] Job Completed: ${jobName}`;
        html = this.buildNotificationHtml({
          title: 'Job Completed Successfully',
          jobName,
          message: `Processed ${result?.wordsProcessed || 0} words in ${result?.durationMs || 0}ms.`,
          color: '#27ae60',
          metrics: result?.metrics,
        });
        break;

      case 'failed':
        subject = `[AI Humanizer] Job Failed: ${jobName}`;
        html = this.buildNotificationHtml({
          title: 'Job Failed',
          jobName,
          message: message || result?.error || 'An error occurred during job execution.',
          color: '#e74c3c',
        });
        break;

      case 'reminder':
        subject = `[AI Humanizer] Upcoming Job: ${jobName}`;
        html = this.buildNotificationHtml({
          title: 'Upcoming Scheduled Job',
          jobName,
          message: `Your job is scheduled to run at ${nextExecutionAt?.toISOString() || 'soon'}.`,
          color: '#f39c12',
        });
        break;

      default:
        return;
    }

    try {
      await sendEmail({ to, subject, html });
    } catch (error) {
      logger.error('Failed to send job notification:', error);
    }
  }

  /**
   * Builds notification email HTML
   */
  private buildNotificationHtml(params: {
    title: string;
    jobName: string;
    message: string;
    color: string;
    metrics?: { detectionScoreBefore: number; detectionScoreAfter: number; transformationPercentage: number };
  }): string {
    const { title, jobName, message, color, metrics } = params;

    let metricsHtml = '';
    if (metrics) {
      metricsHtml = `
        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 20px;">
          <h4 style="margin: 0 0 10px 0; color: #333;">Transformation Metrics</h4>
          <p style="margin: 5px 0;"><strong>Detection Score:</strong> ${metrics.detectionScoreBefore}% → ${metrics.detectionScoreAfter}%</p>
          <p style="margin: 5px 0;"><strong>Transformation:</strong> ${metrics.transformationPercentage}% of content modified</p>
        </div>
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: ${color}; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">${title}</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Job: ${jobName}</h2>
          <p>${message}</p>
          ${metricsHtml}
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} AI Humanizer. All rights reserved.
          </p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Simulates content import (placeholder for actual implementation)
   * Requirement 35: Create automated content import
   */
  private async importContent(source: ContentSource): Promise<string> {
    // In production, this would actually fetch content from the source
    logger.debug(`Importing content from ${source.type}: ${source.location}`);

    // Simulate import delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Return placeholder content
    return `Imported content from ${source.location}. This is placeholder text that would be replaced with actual content in production.`;
  }

  /**
   * Simulates content transformation (placeholder for actual implementation)
   */
  private async transformContent(content: string, settings: TransformSettings): Promise<string> {
    // In production, this would call the actual transformation pipeline
    logger.debug(`Transforming content with level ${settings.level} and strategy ${settings.strategy}`);

    // Simulate transformation delay
    await new Promise(resolve => setTimeout(resolve, 100));

    return `Transformed: ${content}`;
  }

  /**
   * Counts words in text
   */
  private countWords(text: string): number {
    return text.split(/\s+/).filter(w => w.length > 0).length;
  }
}

// Export singleton instance
export const schedulingService = new SchedulingService();
