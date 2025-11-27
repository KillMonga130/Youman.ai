/**
 * Scheduling & Automation Service Types
 * Type definitions for scheduled jobs, recurring tasks, and automation
 * Requirements: 35
 */

import { TransformStrategy, HumanizationLevel } from '../transform/types';

/**
 * Job status for scheduled tasks
 */
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';

/**
 * Frequency options for recurring schedules
 */
export type ScheduleFrequency = 'once' | 'daily' | 'weekly' | 'monthly';

/**
 * Day of week for weekly schedules
 */
export type DayOfWeek = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

/**
 * Content source types for automated import
 */
export type ContentSourceType = 'url' | 'file' | 'cloud' | 'api';

/**
 * Content source configuration
 */
export interface ContentSource {
  /** Source type */
  type: ContentSourceType;
  /** Source URL or path */
  location: string;
  /** Authentication credentials (if needed) */
  credentials?: {
    apiKey?: string;
    token?: string;
    username?: string;
    password?: string;
  };
  /** Additional source options */
  options?: Record<string, unknown>;
}

/**
 * Transform settings for scheduled jobs
 */
export interface TransformSettings {
  /** Humanization level (1-5) */
  level: HumanizationLevel;
  /** Transformation strategy */
  strategy: TransformStrategy;
  /** Protected segments delimiters */
  protectedDelimiters?: string[];
  /** SEO keywords to preserve */
  seoKeywords?: string[];
  /** Custom options */
  customOptions?: Record<string, unknown>;
}

/**
 * Schedule configuration
 * Requirement 35: Recurring schedule creation
 */
export interface Schedule {
  /** Schedule frequency */
  frequency: ScheduleFrequency;
  /** Time of day (HH:MM format, 24-hour) */
  time: string;
  /** Day of week (for weekly schedules) */
  dayOfWeek?: DayOfWeek;
  /** Day of month (for monthly schedules, 1-31) */
  dayOfMonth?: number;
  /** Timezone (e.g., 'America/New_York') */
  timezone?: string;
  /** Start date for the schedule */
  startDate?: Date;
  /** End date for the schedule (optional) */
  endDate?: Date;
}

/**
 * Scheduled job configuration
 */
export interface ScheduledJob {
  /** Unique job identifier */
  id: string;
  /** Job name */
  name: string;
  /** Job description */
  description?: string;
  /** User ID who created the job */
  userId: string;
  /** Project ID (optional) */
  projectId?: string;
  /** Schedule configuration */
  schedule: Schedule;
  /** Content source for automated import */
  source: ContentSource;
  /** Transform settings */
  settings: TransformSettings;
  /** Email for notifications */
  notificationEmail: string;
  /** Job status */
  status: JobStatus;
  /** Cron expression (generated from schedule) */
  cronExpression: string;
  /** Number of times executed */
  executionCount: number;
  /** Last execution timestamp */
  lastExecutedAt?: Date;
  /** Next scheduled execution */
  nextExecutionAt?: Date;
  /** Last execution result */
  lastResult?: JobResult;
  /** Retry configuration */
  retryConfig: RetryConfig;
  /** Creation timestamp */
  createdAt: Date;
  /** Last updated timestamp */
  updatedAt: Date;
  /** Whether the job is enabled */
  enabled: boolean;
}

/**
 * Retry configuration for failed jobs
 * Requirement 35: Add retry logic for failed jobs
 */
export interface RetryConfig {
  /** Maximum number of retries */
  maxRetries: number;
  /** Current retry count */
  currentRetries: number;
  /** Delay between retries in milliseconds */
  retryDelayMs: number;
  /** Whether to use exponential backoff */
  exponentialBackoff: boolean;
  /** Maximum delay for exponential backoff */
  maxDelayMs: number;
}

/**
 * Job execution result
 */
export interface JobResult {
  /** Result identifier */
  id: string;
  /** Job identifier */
  jobId: string;
  /** Execution status */
  status: 'success' | 'failure' | 'partial';
  /** Execution start time */
  startedAt: Date;
  /** Execution end time */
  completedAt: Date;
  /** Duration in milliseconds */
  durationMs: number;
  /** Words processed */
  wordsProcessed: number;
  /** Output document ID (if successful) */
  outputDocumentId?: string;
  /** Error message (if failed) */
  error?: string;
  /** Error details */
  errorDetails?: Record<string, unknown>;
  /** Retry attempt number */
  retryAttempt: number;
  /** Metrics from transformation */
  metrics?: {
    detectionScoreBefore: number;
    detectionScoreAfter: number;
    transformationPercentage: number;
  };
}

/**
 * Options for creating a scheduled job
 */
export interface CreateScheduleOptions {
  /** Job name */
  name: string;
  /** Job description */
  description?: string;
  /** User ID */
  userId: string;
  /** Project ID (optional) */
  projectId?: string;
  /** Schedule configuration */
  schedule: Schedule;
  /** Content source */
  source: ContentSource;
  /** Transform settings */
  settings: TransformSettings;
  /** Notification email */
  notificationEmail: string;
  /** Retry configuration (optional) */
  retryConfig?: Partial<RetryConfig>;
  /** Start immediately */
  startImmediately?: boolean;
}

/**
 * Options for updating a scheduled job
 */
export interface UpdateScheduleOptions {
  /** Job name */
  name?: string;
  /** Job description */
  description?: string;
  /** Schedule configuration */
  schedule?: Schedule;
  /** Content source */
  source?: ContentSource;
  /** Transform settings */
  settings?: TransformSettings;
  /** Notification email */
  notificationEmail?: string;
  /** Retry configuration */
  retryConfig?: Partial<RetryConfig>;
  /** Enable/disable the job */
  enabled?: boolean;
}

/**
 * Upcoming job information
 * Requirement 35: Display upcoming scheduled tasks
 */
export interface UpcomingJob {
  /** Job identifier */
  jobId: string;
  /** Job name */
  name: string;
  /** Next execution time */
  nextExecutionAt: Date;
  /** Time until execution in milliseconds */
  timeUntilMs: number;
  /** Schedule frequency */
  frequency: ScheduleFrequency;
  /** Job status */
  status: JobStatus;
  /** Source type */
  sourceType: ContentSourceType;
}

/**
 * Job execution history entry
 */
export interface JobHistoryEntry {
  /** Result details */
  result: JobResult;
  /** Job name at time of execution */
  jobName: string;
  /** Schedule frequency at time of execution */
  frequency: ScheduleFrequency;
}

/**
 * Email notification options
 * Requirement 35: Build email notification system
 */
export interface JobNotificationOptions {
  /** Recipient email */
  to: string;
  /** Job name */
  jobName: string;
  /** Notification type */
  type: 'started' | 'completed' | 'failed' | 'reminder';
  /** Job result (for completed/failed) */
  result?: JobResult;
  /** Next execution time (for reminder) */
  nextExecutionAt?: Date;
  /** Additional message */
  message?: string;
}

/**
 * Service configuration
 */
export interface SchedulingServiceConfig {
  /** Default retry configuration */
  defaultRetryConfig: RetryConfig;
  /** Maximum jobs per user */
  maxJobsPerUser: number;
  /** Minimum schedule interval in minutes */
  minIntervalMinutes: number;
  /** Default timezone */
  defaultTimezone: string;
  /** Enable email notifications */
  enableNotifications: boolean;
  /** Job execution timeout in milliseconds */
  executionTimeoutMs: number;
}
