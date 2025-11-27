/**
 * Admin Panel Tests
 * Requirements: 19 - Monitor system performance and user activity
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getSystemMetrics,
  getUserActivitySummary,
  getUserActivityList,
  getLogs,
  getErrorSummary,
  getErrorLogs,
  resolveError,
  logError,
  configureAlert,
  getAlertConfigs,
  getAlerts,
  acknowledgeAlert,
  getPerformanceHistory,
  recordPerformanceData,
  getAdminDashboard,
} from './admin.service';
import { AlertType, LogLevel } from './types';

// Mock Prisma
vi.mock('../database/prisma', () => ({
  prisma: {
    usageRecord: {
      groupBy: vi.fn().mockResolvedValue([
        { userId: 'user-1' },
        { userId: 'user-2' },
      ]),
      count: vi.fn().mockResolvedValue(100),
      aggregate: vi.fn().mockResolvedValue({ _sum: { amount: BigInt(50000) } }),
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'record-1',
          userId: 'user-1',
          resourceType: 'words',
          amount: BigInt(1000),
          periodStart: new Date(),
          periodEnd: new Date(),
          createdAt: new Date(),
          user: { email: 'user1@example.com' },
        },
      ]),
    },
    user: {
      count: vi.fn().mockResolvedValue(50),
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'user-1',
          email: 'user1@example.com',
          updatedAt: new Date(),
          subscription: { tier: 'PROFESSIONAL' },
        },
      ]),
    },
    project: {
      count: vi.fn().mockResolvedValue(5),
    },
  },
}));

describe('Admin Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSystemMetrics', () => {
    it('should return system metrics with active users and resource utilization', async () => {
      const metrics = await getSystemMetrics();

      expect(metrics).toHaveProperty('timestamp');
      expect(metrics).toHaveProperty('activeUsers');
      expect(metrics).toHaveProperty('totalUsers');
      expect(metrics).toHaveProperty('processingQueueLength');
      expect(metrics).toHaveProperty('resourceUtilization');
      expect(metrics).toHaveProperty('performance');

      // Verify resource utilization structure
      expect(metrics.resourceUtilization).toHaveProperty('cpuUsage');
      expect(metrics.resourceUtilization).toHaveProperty('memoryUsage');
      expect(metrics.resourceUtilization).toHaveProperty('memoryUsedMB');
      expect(metrics.resourceUtilization).toHaveProperty('memoryTotalMB');
      expect(metrics.resourceUtilization).toHaveProperty('diskUsage');

      // Verify performance metrics structure
      expect(metrics.performance).toHaveProperty('averageProcessingTimePer1000Words');
      expect(metrics.performance).toHaveProperty('requestsPerMinute');
      expect(metrics.performance).toHaveProperty('averageResponseTime');
      expect(metrics.performance).toHaveProperty('errorRate');
      expect(metrics.performance).toHaveProperty('successRate');
    });

    it('should return valid percentage values for resource utilization', async () => {
      const metrics = await getSystemMetrics();

      expect(metrics.resourceUtilization.cpuUsage).toBeGreaterThanOrEqual(0);
      expect(metrics.resourceUtilization.cpuUsage).toBeLessThanOrEqual(100);
      expect(metrics.resourceUtilization.memoryUsage).toBeGreaterThanOrEqual(0);
      expect(metrics.resourceUtilization.memoryUsage).toBeLessThanOrEqual(100);
    });
  });

  describe('getUserActivitySummary', () => {
    it('should return user activity summary with all required fields', async () => {
      const summary = await getUserActivitySummary();

      expect(summary).toHaveProperty('totalTransformations');
      expect(summary).toHaveProperty('totalWordsProcessed');
      expect(summary).toHaveProperty('totalApiCalls');
      expect(summary).toHaveProperty('totalErrors');
      expect(summary).toHaveProperty('activeUsersToday');
      expect(summary).toHaveProperty('activeUsersThisWeek');
      expect(summary).toHaveProperty('activeUsersThisMonth');
      expect(summary).toHaveProperty('newUsersToday');
      expect(summary).toHaveProperty('newUsersThisWeek');
      expect(summary).toHaveProperty('newUsersThisMonth');
    });
  });

  describe('getUserActivityList', () => {
    it('should return list of user activities', async () => {
      const activities = await getUserActivityList(10, 0);

      expect(Array.isArray(activities)).toBe(true);
      if (activities.length > 0) {
        expect(activities[0]).toHaveProperty('userId');
        expect(activities[0]).toHaveProperty('email');
        expect(activities[0]).toHaveProperty('lastActive');
        expect(activities[0]).toHaveProperty('transformationsCount');
        expect(activities[0]).toHaveProperty('wordsProcessed');
        expect(activities[0]).toHaveProperty('apiCallsCount');
        expect(activities[0]).toHaveProperty('errorsCount');
        expect(activities[0]).toHaveProperty('subscriptionTier');
      }
    });
  });

  describe('Error Logging', () => {
    it('should log an error and return error entry', async () => {
      const error = await logError('TEST_ERROR', 'Test error message', {
        userId: 'user-1',
        endpoint: '/api/test',
      });

      expect(error).toHaveProperty('id');
      expect(error).toHaveProperty('timestamp');
      expect(error.errorCode).toBe('TEST_ERROR');
      expect(error.message).toBe('Test error message');
      expect(error.userId).toBe('user-1');
      expect(error.endpoint).toBe('/api/test');
      expect(error.resolved).toBe(false);
    });

    it('should get error summary', async () => {
      // Log some errors first
      await logError('ERROR_A', 'Error A');
      await logError('ERROR_B', 'Error B');
      await logError('ERROR_A', 'Error A again');

      const summary = await getErrorSummary();

      expect(summary).toHaveProperty('totalErrors');
      expect(summary).toHaveProperty('errorsToday');
      expect(summary).toHaveProperty('errorsThisWeek');
      expect(summary).toHaveProperty('errorsByType');
      expect(summary).toHaveProperty('topErrors');
      expect(summary.totalErrors).toBeGreaterThan(0);
    });

    it('should get error logs with filtering', async () => {
      await logError('FILTER_TEST', 'Filter test error', { userId: 'filter-user' });

      const result = await getErrorLogs(100, 0, { userId: 'filter-user' });

      expect(result).toHaveProperty('logs');
      expect(result).toHaveProperty('total');
      expect(Array.isArray(result.logs)).toBe(true);
    });

    it('should resolve an error', async () => {
      const error = await logError('RESOLVE_TEST', 'Error to resolve');
      const resolved = await resolveError(error.id);

      expect(resolved).not.toBeNull();
      expect(resolved?.resolved).toBe(true);
    });

    it('should return null when resolving non-existent error', async () => {
      const resolved = await resolveError('non-existent-id');
      expect(resolved).toBeNull();
    });
  });

  describe('Alert Management', () => {
    it('should configure an alert', async () => {
      const config = await configureAlert({
        alertType: AlertType.CPU_HIGH,
        enabled: true,
        threshold: 90,
        notifyEmail: 'admin@example.com',
      });

      expect(config).toHaveProperty('id');
      expect(config.alertType).toBe(AlertType.CPU_HIGH);
      expect(config.enabled).toBe(true);
      expect(config.threshold).toBe(90);
      expect(config.notifyEmail).toBe('admin@example.com');
    });

    it('should get all alert configurations', async () => {
      const configs = await getAlertConfigs();

      expect(Array.isArray(configs)).toBe(true);
      expect(configs.length).toBeGreaterThan(0);
      
      // Should have default alert types
      const alertTypes = configs.map(c => c.alertType);
      expect(alertTypes).toContain(AlertType.CPU_HIGH);
      expect(alertTypes).toContain(AlertType.MEMORY_HIGH);
    });

    it('should get alerts', async () => {
      const result = await getAlerts();

      expect(result).toHaveProperty('alerts');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('unacknowledged');
      expect(Array.isArray(result.alerts)).toBe(true);
    });

    it('should acknowledge an alert', async () => {
      // This test depends on having an active alert
      // In a real scenario, we'd trigger an alert first
      const result = await acknowledgeAlert('non-existent-alert', 'admin-user');
      expect(result).toBeNull(); // No alert to acknowledge
    });
  });

  describe('Activity Logs', () => {
    it('should get logs with default parameters', async () => {
      const result = await getLogs({
        limit: 100,
        offset: 0,
      });

      expect(result).toHaveProperty('logs');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('offset');
      expect(Array.isArray(result.logs)).toBe(true);
    });

    it('should filter logs by level', async () => {
      const result = await getLogs({
        level: LogLevel.INFO,
        limit: 100,
        offset: 0,
      });

      expect(result).toHaveProperty('logs');
      // All logs should be INFO level
      result.logs.forEach(log => {
        expect(log.level).toBe(LogLevel.INFO);
      });
    });
  });

  describe('Performance Tracking', () => {
    it('should record performance data', async () => {
      await recordPerformanceData(150, 10, 1, 200);
      
      const history = await getPerformanceHistory({ interval: 'hour' });

      expect(history).toHaveProperty('dataPoints');
      expect(history).toHaveProperty('interval');
      expect(history).toHaveProperty('startDate');
      expect(history).toHaveProperty('endDate');
      expect(history).toHaveProperty('summary');
    });

    it('should get performance history with summary', async () => {
      // Record some data points
      await recordPerformanceData(100, 5, 0, 150);
      await recordPerformanceData(120, 8, 1, 180);

      const history = await getPerformanceHistory({ interval: 'hour' });

      expect(history.summary).toHaveProperty('averageProcessingTime');
      expect(history.summary).toHaveProperty('totalRequests');
      expect(history.summary).toHaveProperty('totalErrors');
      expect(history.summary).toHaveProperty('peakRequestsPerMinute');
    });
  });

  describe('Admin Dashboard', () => {
    it('should return complete dashboard data', async () => {
      const dashboard = await getAdminDashboard();

      expect(dashboard).toHaveProperty('systemMetrics');
      expect(dashboard).toHaveProperty('userActivity');
      expect(dashboard).toHaveProperty('errorSummary');
      expect(dashboard).toHaveProperty('recentAlerts');
      expect(dashboard).toHaveProperty('performanceHistory');

      // Verify nested structures
      expect(dashboard.systemMetrics).toHaveProperty('activeUsers');
      expect(dashboard.systemMetrics).toHaveProperty('resourceUtilization');
      expect(dashboard.userActivity).toHaveProperty('totalTransformations');
      expect(dashboard.errorSummary).toHaveProperty('totalErrors');
      expect(Array.isArray(dashboard.recentAlerts)).toBe(true);
      expect(Array.isArray(dashboard.performanceHistory)).toBe(true);
    });
  });
});
