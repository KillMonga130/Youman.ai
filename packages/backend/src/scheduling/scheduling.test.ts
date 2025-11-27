/**
 * Scheduling Service Tests
 * Tests for scheduled job management and automation
 * Requirements: 35
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SchedulingService } from './scheduling.service';
import {
  CreateScheduleOptions,
  Schedule,
  ContentSource,
  TransformSettings,
  ScheduleFrequency,
  DayOfWeek,
} from './types';

// Mock the email service
vi.mock('../collaboration/email.service', () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

// Mock the logger
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('SchedulingService', () => {
  let service: SchedulingService;

  const createValidOptions = (overrides?: Partial<CreateScheduleOptions>): CreateScheduleOptions => ({
    name: 'Test Job',
    description: 'A test scheduled job',
    userId: 'user_123',
    schedule: {
      frequency: 'daily',
      time: '09:00',
    },
    source: {
      type: 'url',
      location: 'https://example.com/content',
    },
    settings: {
      level: 3,
      strategy: 'professional',
    },
    notificationEmail: 'test@example.com',
    ...overrides,
  });

  beforeEach(() => {
    service = new SchedulingService({
      enableNotifications: false, // Disable notifications for tests
    });
  });

  afterEach(() => {
    service.shutdown();
    vi.clearAllMocks();
  });

  describe('createSchedule', () => {
    it('should create a daily scheduled job', async () => {
      const options = createValidOptions();
      const job = await service.createSchedule(options);

      expect(job).toBeDefined();
      expect(job.id).toMatch(/^job_/);
      expect(job.name).toBe('Test Job');
      expect(job.userId).toBe('user_123');
      expect(job.status).toBe('pending');
      expect(job.enabled).toBe(true);
      expect(job.cronExpression).toBe('0 9 * * *');
      expect(job.nextExecutionAt).toBeInstanceOf(Date);
    });

    it('should create a weekly scheduled job', async () => {
      const options = createValidOptions({
        schedule: {
          frequency: 'weekly',
          time: '14:30',
          dayOfWeek: 'monday',
        },
      });
      const job = await service.createSchedule(options);

      expect(job.cronExpression).toBe('30 14 * * 1');
      expect(job.schedule.frequency).toBe('weekly');
      expect(job.schedule.dayOfWeek).toBe('monday');
    });

    it('should create a monthly scheduled job', async () => {
      const options = createValidOptions({
        schedule: {
          frequency: 'monthly',
          time: '08:00',
          dayOfMonth: 15,
        },
      });
      const job = await service.createSchedule(options);

      expect(job.cronExpression).toBe('0 8 15 * *');
      expect(job.schedule.frequency).toBe('monthly');
      expect(job.schedule.dayOfMonth).toBe(15);
    });

    it('should create a one-time scheduled job', async () => {
      const options = createValidOptions({
        schedule: {
          frequency: 'once',
          time: '10:00',
        },
      });
      const job = await service.createSchedule(options);

      expect(job.schedule.frequency).toBe('once');
    });

    it('should reject invalid time format', async () => {
      const options = createValidOptions({
        schedule: {
          frequency: 'daily',
          time: '25:00', // Invalid hour
        },
      });

      await expect(service.createSchedule(options)).rejects.toThrow('Invalid time format');
    });

    it('should reject weekly schedule without day of week', async () => {
      const options = createValidOptions({
        schedule: {
          frequency: 'weekly',
          time: '09:00',
          // Missing dayOfWeek
        },
      });

      await expect(service.createSchedule(options)).rejects.toThrow('Day of week is required');
    });

    it('should reject monthly schedule with invalid day', async () => {
      const options = createValidOptions({
        schedule: {
          frequency: 'monthly',
          time: '09:00',
          dayOfMonth: 32, // Invalid day
        },
      });

      await expect(service.createSchedule(options)).rejects.toThrow('Day of month must be between 1 and 31');
    });

    it('should enforce maximum jobs per user', async () => {
      const limitedService = new SchedulingService({
        maxJobsPerUser: 2,
        enableNotifications: false,
      });

      await limitedService.createSchedule(createValidOptions({ name: 'Job 1' }));
      await limitedService.createSchedule(createValidOptions({ name: 'Job 2' }));

      await expect(
        limitedService.createSchedule(createValidOptions({ name: 'Job 3' }))
      ).rejects.toThrow('Maximum jobs per user');

      limitedService.shutdown();
    });

    it('should set default retry configuration', async () => {
      const options = createValidOptions();
      const job = await service.createSchedule(options);

      expect(job.retryConfig).toBeDefined();
      expect(job.retryConfig.maxRetries).toBe(3);
      expect(job.retryConfig.currentRetries).toBe(0);
      expect(job.retryConfig.exponentialBackoff).toBe(true);
    });

    it('should allow custom retry configuration', async () => {
      const options = createValidOptions({
        retryConfig: {
          maxRetries: 5,
          retryDelayMs: 30000,
        },
      });
      const job = await service.createSchedule(options);

      expect(job.retryConfig.maxRetries).toBe(5);
      expect(job.retryConfig.retryDelayMs).toBe(30000);
    });
  });

  describe('getJob', () => {
    it('should return a job by ID', async () => {
      const options = createValidOptions();
      const created = await service.createSchedule(options);

      const job = await service.getJob(created.id);

      expect(job).toBeDefined();
      expect(job?.id).toBe(created.id);
      expect(job?.name).toBe('Test Job');
    });

    it('should return null for non-existent job', async () => {
      const job = await service.getJob('non_existent_id');
      expect(job).toBeNull();
    });
  });

  describe('getJobsByUser', () => {
    it('should return all jobs for a user', async () => {
      await service.createSchedule(createValidOptions({ name: 'Job 1', userId: 'user_1' }));
      await service.createSchedule(createValidOptions({ name: 'Job 2', userId: 'user_1' }));
      await service.createSchedule(createValidOptions({ name: 'Job 3', userId: 'user_2' }));

      const user1Jobs = service.getJobsByUser('user_1');
      const user2Jobs = service.getJobsByUser('user_2');

      expect(user1Jobs).toHaveLength(2);
      expect(user2Jobs).toHaveLength(1);
    });

    it('should return empty array for user with no jobs', () => {
      const jobs = service.getJobsByUser('non_existent_user');
      expect(jobs).toHaveLength(0);
    });
  });

  describe('getUpcomingJobs', () => {
    it('should return upcoming jobs sorted by execution time', async () => {
      await service.createSchedule(createValidOptions({
        name: 'Later Job',
        schedule: { frequency: 'daily', time: '23:00' },
      }));
      await service.createSchedule(createValidOptions({
        name: 'Earlier Job',
        schedule: { frequency: 'daily', time: '06:00' },
      }));

      const upcoming = await service.getUpcomingJobs('user_123');

      expect(upcoming).toHaveLength(2);
      // Jobs should be sorted by next execution time
      expect(upcoming[0]!.nextExecutionAt.getTime()).toBeLessThanOrEqual(
        upcoming[1]!.nextExecutionAt.getTime()
      );
    });

    it('should not include cancelled jobs', async () => {
      const job = await service.createSchedule(createValidOptions());
      await service.cancelSchedule(job.id);

      const upcoming = await service.getUpcomingJobs('user_123');

      expect(upcoming).toHaveLength(0);
    });

    it('should not include disabled jobs', async () => {
      const job = await service.createSchedule(createValidOptions());
      await service.pauseJob(job.id);

      const upcoming = await service.getUpcomingJobs('user_123');

      expect(upcoming).toHaveLength(0);
    });
  });

  describe('updateSchedule', () => {
    it('should update job name and description', async () => {
      const job = await service.createSchedule(createValidOptions());

      const updated = await service.updateSchedule(job.id, {
        name: 'Updated Name',
        description: 'Updated description',
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.description).toBe('Updated description');
    });

    it('should update schedule configuration', async () => {
      const job = await service.createSchedule(createValidOptions());

      const updated = await service.updateSchedule(job.id, {
        schedule: {
          frequency: 'weekly',
          time: '15:00',
          dayOfWeek: 'friday',
        },
      });

      expect(updated.schedule.frequency).toBe('weekly');
      expect(updated.schedule.time).toBe('15:00');
      expect(updated.cronExpression).toBe('0 15 * * 5');
    });

    it('should throw error for non-existent job', async () => {
      await expect(
        service.updateSchedule('non_existent', { name: 'New Name' })
      ).rejects.toThrow('Job not found');
    });
  });

  describe('cancelSchedule', () => {
    it('should cancel a scheduled job', async () => {
      const job = await service.createSchedule(createValidOptions());

      await service.cancelSchedule(job.id);

      const cancelled = await service.getJob(job.id);
      expect(cancelled?.status).toBe('cancelled');
      expect(cancelled?.enabled).toBe(false);
    });

    it('should throw error for non-existent job', async () => {
      await expect(service.cancelSchedule('non_existent')).rejects.toThrow('Job not found');
    });
  });

  describe('pauseJob and resumeJob', () => {
    it('should pause a running job', async () => {
      const job = await service.createSchedule(createValidOptions());

      await service.pauseJob(job.id);

      const paused = await service.getJob(job.id);
      expect(paused?.status).toBe('paused');
      expect(paused?.enabled).toBe(false);
    });

    it('should resume a paused job', async () => {
      const job = await service.createSchedule(createValidOptions());
      await service.pauseJob(job.id);

      await service.resumeJob(job.id);

      const resumed = await service.getJob(job.id);
      expect(resumed?.status).toBe('pending');
      expect(resumed?.enabled).toBe(true);
    });
  });

  describe('executeScheduledJob', () => {
    it('should execute a job and return result', async () => {
      const job = await service.createSchedule(createValidOptions());

      const result = await service.executeScheduledJob(job.id);

      expect(result).toBeDefined();
      expect(result.jobId).toBe(job.id);
      expect(result.status).toBe('success');
      expect(result.wordsProcessed).toBeGreaterThan(0);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should update job metadata after execution', async () => {
      const job = await service.createSchedule(createValidOptions());

      await service.executeScheduledJob(job.id);

      const updated = await service.getJob(job.id);
      expect(updated?.executionCount).toBe(1);
      expect(updated?.lastExecutedAt).toBeInstanceOf(Date);
      expect(updated?.lastResult).toBeDefined();
    });

    it('should throw error for non-existent job', async () => {
      await expect(service.executeScheduledJob('non_existent')).rejects.toThrow('Job not found');
    });
  });

  describe('triggerJob', () => {
    it('should manually trigger job execution', async () => {
      const job = await service.createSchedule(createValidOptions());

      const result = await service.triggerJob(job.id);

      expect(result.status).toBe('success');
    });
  });

  describe('getJobHistory', () => {
    it('should return job execution history', async () => {
      const job = await service.createSchedule(createValidOptions());

      await service.executeScheduledJob(job.id);
      await service.executeScheduledJob(job.id);

      const history = service.getJobHistory(job.id);

      expect(history).toHaveLength(2);
      expect(history[0]!.jobId).toBe(job.id);
    });

    it('should limit history entries', async () => {
      const job = await service.createSchedule(createValidOptions());

      await service.executeScheduledJob(job.id);
      await service.executeScheduledJob(job.id);
      await service.executeScheduledJob(job.id);

      const history = service.getJobHistory(job.id, 2);

      expect(history).toHaveLength(2);
    });

    it('should return empty array for job with no history', async () => {
      const job = await service.createSchedule(createValidOptions());
      const history = service.getJobHistory(job.id);
      expect(history).toHaveLength(0);
    });
  });

  describe('schedule validation', () => {
    it('should validate all days of week', async () => {
      const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const expectedCronDays = [0, 1, 2, 3, 4, 5, 6];

      for (let i = 0; i < days.length; i++) {
        const job = await service.createSchedule(createValidOptions({
          name: `Job ${days[i]}`,
          schedule: {
            frequency: 'weekly',
            time: '12:00',
            dayOfWeek: days[i],
          },
        }));

        expect(job.cronExpression).toBe(`0 12 * * ${expectedCronDays[i]}`);
      }
    });

    it('should validate all frequencies', async () => {
      const frequencies: ScheduleFrequency[] = ['once', 'daily', 'weekly', 'monthly'];

      for (const frequency of frequencies) {
        const schedule: Schedule = {
          frequency,
          time: '10:00',
        };

        if (frequency === 'weekly') {
          schedule.dayOfWeek = 'monday';
        } else if (frequency === 'monthly') {
          schedule.dayOfMonth = 1;
        }

        const job = await service.createSchedule(createValidOptions({
          name: `Job ${frequency}`,
          schedule,
        }));

        expect(job.schedule.frequency).toBe(frequency);
      }
    });
  });

  describe('content source types', () => {
    it('should accept URL source', async () => {
      const job = await service.createSchedule(createValidOptions({
        source: {
          type: 'url',
          location: 'https://example.com/content',
        },
      }));

      expect(job.source.type).toBe('url');
    });

    it('should accept file source', async () => {
      const job = await service.createSchedule(createValidOptions({
        source: {
          type: 'file',
          location: '/path/to/file.txt',
        },
      }));

      expect(job.source.type).toBe('file');
    });

    it('should accept cloud source with credentials', async () => {
      const job = await service.createSchedule(createValidOptions({
        source: {
          type: 'cloud',
          location: 'gdrive://folder/file.docx',
          credentials: {
            token: 'oauth_token_123',
          },
        },
      }));

      expect(job.source.type).toBe('cloud');
      expect(job.source.credentials?.token).toBe('oauth_token_123');
    });

    it('should accept API source', async () => {
      const job = await service.createSchedule(createValidOptions({
        source: {
          type: 'api',
          location: 'https://api.example.com/content',
          credentials: {
            apiKey: 'api_key_123',
          },
        },
      }));

      expect(job.source.type).toBe('api');
    });
  });
});
