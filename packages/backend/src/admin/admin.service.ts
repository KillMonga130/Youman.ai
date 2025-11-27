/**
 * Admin Panel Service
 * Provides system metrics, user activity monitoring, error logging, and alert management
 * 
 * Requirements: 19 - Monitor system performance and user activity
 * 19.1 - Display system metrics including active users, processing queue length, and resource utilization
 * 19.2 - Track and display average processing time per 1,000 words
 * 19.3 - Provide logs of transformations, errors, and API usage
 * 19.4 - Log detailed error information and notify administrators via email
 * 19.5 - Trigger alerts when resource thresholds are exceeded
 */

import os from 'os';
import { prisma } from '../database/prisma';
import { logger } from '../utils/logger';
import {
  AlertSeverity,
  AlertType,
  LogLevel,
  type SystemMetrics,
  type ResourceUtilization,
  type PerformanceMetrics,
  type UserActivitySummary,
  type UserActivity,
  type LogEntry,
  type LogsResponse,
  type ErrorLogEntry,
  type ErrorSummary,
  type AlertConfig,
  type Alert,
  type AlertsResponse,
  type PerformanceDataPoint,
  type PerformanceHistory,
  type AdminDashboard,
  type GetLogsInput,
  type ConfigureAlertInput,
  type GetMetricsInput,
} from './types';

// ============================================
// In-Memory Storage (for demo purposes)
// In production, these would be stored in Redis or a time-series database
// ============================================

const alertConfigs: Map<AlertType, AlertConfig> = new Map();
const activeAlerts: Alert[] = [];
const errorLogs: ErrorLogEntry[] = [];
const performanceData: PerformanceDataPoint[] = [];

// Initialize default alert configurations
function initializeAlertConfigs(): void {
  const defaultConfigs: Array<{ type: AlertType; threshold: number }> = [
    { type: AlertType.CPU_HIGH, threshold: 80 },
    { type: AlertType.MEMORY_HIGH, threshold: 85 },
    { type: AlertType.QUEUE_BACKLOG, threshold: 100 },
    { type: AlertType.ERROR_RATE_HIGH, threshold: 5 },
    { type: AlertType.LATENCY_HIGH, threshold: 5000 },
    { type: AlertType.DISK_SPACE_LOW, threshold: 90 },
  ];

  for (const config of defaultConfigs) {
    if (!alertConfigs.has(config.type)) {
      alertConfigs.set(config.type, {
        id: `alert-${config.type}`,
        alertType: config.type,
        enabled: true,
        threshold: config.threshold,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }
}

initializeAlertConfigs();

// ============================================
// Error Classes
// ============================================

export class AdminError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'AdminError';
    this.code = code;
  }
}

// ============================================
// System Metrics
// ============================================

/**
 * Get current resource utilization
 * Requirements: 19.1 - Display resource utilization
 */
function getResourceUtilization(): ResourceUtilization {
  const cpus = os.cpus();
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;

  // Calculate CPU usage (simplified - average across all cores)
  let totalIdle = 0;
  let totalTick = 0;
  for (const cpu of cpus) {
    for (const type in cpu.times) {
      totalTick += cpu.times[type as keyof typeof cpu.times];
    }
    totalIdle += cpu.times.idle;
  }
  const cpuUsage = Math.round((1 - totalIdle / totalTick) * 100);

  // Memory calculations
  const memoryUsage = Math.round((usedMemory / totalMemory) * 100);
  const memoryUsedMB = Math.round(usedMemory / (1024 * 1024));
  const memoryTotalMB = Math.round(totalMemory / (1024 * 1024));

  // Disk usage (simplified - would need platform-specific implementation)
  const diskUsage = 45; // Placeholder
  const diskUsedGB = 50; // Placeholder
  const diskTotalGB = 100; // Placeholder

  return {
    cpuUsage,
    memoryUsage,
    memoryUsedMB,
    memoryTotalMB,
    diskUsage,
    diskUsedGB,
    diskTotalGB,
  };
}

/**
 * Get performance metrics
 * Requirements: 19.2 - Track and display average processing time per 1,000 words
 */
async function getPerformanceMetrics(): Promise<PerformanceMetrics> {
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  // Get recent performance data
  const recentData = performanceData.filter(
    (d) => d.timestamp >= oneHourAgo
  );

  // Calculate average processing time per 1000 words
  const avgProcessingTime = recentData.length > 0
    ? recentData.reduce((sum, d) => sum + d.processingTime, 0) / recentData.length
    : 0;

  // Calculate requests per minute (from last minute)
  const lastMinuteData = recentData.filter(
    (d) => d.timestamp >= oneMinuteAgo
  );
  const requestsPerMinute = lastMinuteData.reduce(
    (sum, d) => sum + d.requestCount,
    0
  );

  // Calculate average response time
  const avgResponseTime = recentData.length > 0
    ? recentData.reduce((sum, d) => sum + d.averageResponseTime, 0) / recentData.length
    : 0;

  // Calculate error rate
  const totalRequests = recentData.reduce((sum, d) => sum + d.requestCount, 0);
  const totalErrors = recentData.reduce((sum, d) => sum + d.errorCount, 0);
  const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

  return {
    averageProcessingTimePer1000Words: Math.round(avgProcessingTime),
    requestsPerMinute,
    averageResponseTime: Math.round(avgResponseTime),
    errorRate: Math.round(errorRate * 100) / 100,
    successRate: Math.round((100 - errorRate) * 100) / 100,
  };
}

/**
 * Get system metrics
 * Requirements: 19.1 - Display system metrics including active users, processing queue length, and resource utilization
 */
export async function getSystemMetrics(): Promise<SystemMetrics> {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Get active users (users with activity in last 24 hours)
  const activeUsers = await prisma.usageRecord.groupBy({
    by: ['userId'],
    where: {
      createdAt: { gte: oneDayAgo },
    },
  });

  // Get total users
  const totalUsers = await prisma.user.count();

  // Get processing queue length (projects with active status as proxy for processing)
  // Note: In production, this would query a separate processing queue
  const processingQueueLength = await prisma.project.count({
    where: {
      status: 'ACTIVE',
    },
  });

  const resourceUtilization = getResourceUtilization();
  const performance = await getPerformanceMetrics();

  // Check thresholds and trigger alerts
  await checkResourceThresholds(resourceUtilization, performance);

  return {
    timestamp: now,
    activeUsers: activeUsers.length,
    totalUsers,
    processingQueueLength,
    resourceUtilization,
    performance,
  };
}

// ============================================
// User Activity Monitoring
// ============================================

/**
 * Get user activity summary
 * Requirements: 19.3 - Provide logs of transformations, errors, and API usage
 */
export async function getUserActivitySummary(): Promise<UserActivitySummary> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Get transformation counts
  const totalTransformations = await prisma.usageRecord.count({
    where: { resourceType: 'words' },
  });

  // Get total words processed
  const wordsResult = await prisma.usageRecord.aggregate({
    where: { resourceType: 'words' },
    _sum: { amount: true },
  });
  const totalWordsProcessed = Number(wordsResult._sum.amount || 0);

  // Get API calls
  const totalApiCalls = await prisma.usageRecord.count({
    where: { resourceType: 'api_calls' },
  });

  // Get error count
  const totalErrors = errorLogs.length;

  // Get active users by period
  const [activeToday, activeWeek, activeMonth] = await Promise.all([
    prisma.usageRecord.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: todayStart } },
    }),
    prisma.usageRecord.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: weekStart } },
    }),
    prisma.usageRecord.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: monthStart } },
    }),
  ]);

  // Get new users by period
  const [newToday, newWeek, newMonth] = await Promise.all([
    prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.user.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
  ]);

  return {
    totalTransformations,
    totalWordsProcessed,
    totalApiCalls,
    totalErrors,
    activeUsersToday: activeToday.length,
    activeUsersThisWeek: activeWeek.length,
    activeUsersThisMonth: activeMonth.length,
    newUsersToday: newToday,
    newUsersThisWeek: newWeek,
    newUsersThisMonth: newMonth,
  };
}

/**
 * Get detailed user activity list
 */
export async function getUserActivityList(
  limit: number = 50,
  offset: number = 0
): Promise<UserActivity[]> {
  const users = await prisma.user.findMany({
    take: limit,
    skip: offset,
    include: {
      subscription: true,
    },
    orderBy: { updatedAt: 'desc' },
  });

  const activities: UserActivity[] = [];

  for (const user of users) {
    const [transformations, words, apiCalls] = await Promise.all([
      prisma.usageRecord.count({
        where: { userId: user.id, resourceType: 'words' },
      }),
      prisma.usageRecord.aggregate({
        where: { userId: user.id, resourceType: 'words' },
        _sum: { amount: true },
      }),
      prisma.usageRecord.count({
        where: { userId: user.id, resourceType: 'api_calls' },
      }),
    ]);

    const userErrors = errorLogs.filter((e) => e.userId === user.id).length;

    activities.push({
      userId: user.id,
      email: user.email,
      lastActive: user.updatedAt,
      transformationsCount: transformations,
      wordsProcessed: Number(words._sum.amount || 0),
      apiCallsCount: apiCalls,
      errorsCount: userErrors,
      subscriptionTier: user.subscription?.tier || 'FREE',
    });
  }

  return activities;
}

// ============================================
// Error Logging
// ============================================

/**
 * Log an error
 * Requirements: 19.4 - Log detailed error information
 */
export async function logError(
  errorCode: string,
  message: string,
  options?: {
    userId?: string;
    endpoint?: string;
    stackTrace?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<ErrorLogEntry> {
  const entry: ErrorLogEntry = {
    id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
    errorCode,
    message,
    userId: options?.userId,
    endpoint: options?.endpoint,
    stackTrace: options?.stackTrace,
    metadata: options?.metadata,
    resolved: false,
  };

  errorLogs.push(entry);

  // Keep only last 10000 errors in memory
  if (errorLogs.length > 10000) {
    errorLogs.shift();
  }

  logger.error('Admin error logged', { errorCode, message, userId: options?.userId });

  // Check if error rate is high and trigger alert
  await checkErrorRateThreshold();

  return entry;
}

/**
 * Get error summary
 * Requirements: 19.3 - Provide logs of errors
 */
export async function getErrorSummary(): Promise<ErrorSummary> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

  const errorsToday = errorLogs.filter((e) => e.timestamp >= todayStart).length;
  const errorsThisWeek = errorLogs.filter((e) => e.timestamp >= weekStart).length;

  // Group errors by type
  const errorsByType: Record<string, number> = {};
  for (const error of errorLogs) {
    errorsByType[error.errorCode] = (errorsByType[error.errorCode] || 0) + 1;
  }

  // Get top errors
  const topErrors = Object.entries(errorsByType)
    .map(([errorCode, count]) => {
      const lastError = errorLogs
        .filter((e) => e.errorCode === errorCode)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
      return {
        errorCode,
        count,
        lastOccurrence: lastError?.timestamp || new Date(),
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalErrors: errorLogs.length,
    errorsToday,
    errorsThisWeek,
    errorsByType,
    topErrors,
  };
}

/**
 * Get error logs with filtering
 */
export async function getErrorLogs(
  limit: number = 100,
  offset: number = 0,
  filters?: { errorCode?: string | undefined; userId?: string | undefined; resolved?: boolean | undefined }
): Promise<{ logs: ErrorLogEntry[]; total: number }> {
  let filtered = [...errorLogs];

  if (filters?.errorCode !== undefined) {
    filtered = filtered.filter((e) => e.errorCode === filters.errorCode);
  }
  if (filters?.userId !== undefined) {
    filtered = filtered.filter((e) => e.userId === filters.userId);
  }
  if (filters?.resolved !== undefined) {
    filtered = filtered.filter((e) => e.resolved === filters.resolved);
  }

  // Sort by timestamp descending
  filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return {
    logs: filtered.slice(offset, offset + limit),
    total: filtered.length,
  };
}

/**
 * Mark error as resolved
 */
export async function resolveError(errorId: string): Promise<ErrorLogEntry | null> {
  const error = errorLogs.find((e) => e.id === errorId);
  if (error) {
    error.resolved = true;
    return error;
  }
  return null;
}

// ============================================
// Activity Logs
// ============================================

/**
 * Get activity logs
 * Requirements: 19.3 - Provide logs of transformations, errors, and API usage
 */
export async function getLogs(input: GetLogsInput): Promise<LogsResponse> {
  const { level, startDate, endDate, userId, limit, offset } = input;

  // Build where clause
  const where: Record<string, unknown> = {};
  
  if (userId) {
    where.userId = userId;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      (where.createdAt as Record<string, Date>).gte = new Date(startDate);
    }
    if (endDate) {
      (where.createdAt as Record<string, Date>).lte = new Date(endDate);
    }
  }

  // Get usage records as activity logs
  const [records, total] = await Promise.all([
    prisma.usageRecord.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { email: true } } },
    }),
    prisma.usageRecord.count({ where }),
  ]);

  const logs: LogEntry[] = records.map((record) => ({
    id: record.id,
    timestamp: record.createdAt,
    level: LogLevel.INFO,
    message: `${record.resourceType} usage: ${record.amount}`,
    userId: record.userId,
    action: record.resourceType,
    metadata: {
      amount: Number(record.amount),
      periodStart: record.periodStart,
      periodEnd: record.periodEnd,
    },
  }));

  // Filter by level if specified
  const filteredLogs = level
    ? logs.filter((log) => log.level === level)
    : logs;

  return {
    logs: filteredLogs,
    total,
    limit,
    offset,
  };
}

// ============================================
// Alert Management
// ============================================

/**
 * Configure an alert
 * Requirements: 19.5 - Trigger alerts when resource thresholds are exceeded
 */
export async function configureAlert(
  input: ConfigureAlertInput
): Promise<AlertConfig> {
  const existing = alertConfigs.get(input.alertType);
  
  const config: AlertConfig = {
    id: existing?.id || `alert-${input.alertType}`,
    alertType: input.alertType,
    enabled: input.enabled,
    threshold: input.threshold,
    notifyEmail: input.notifyEmail,
    createdAt: existing?.createdAt || new Date(),
    updatedAt: new Date(),
  };

  alertConfigs.set(input.alertType, config);

  logger.info('Alert configured', { alertType: input.alertType, threshold: input.threshold });

  return config;
}

/**
 * Get all alert configurations
 */
export async function getAlertConfigs(): Promise<AlertConfig[]> {
  return Array.from(alertConfigs.values());
}

/**
 * Get active alerts
 */
export async function getAlerts(
  acknowledged?: boolean
): Promise<AlertsResponse> {
  let filtered = [...activeAlerts];

  if (acknowledged !== undefined) {
    filtered = filtered.filter((a) => a.acknowledged === acknowledged);
  }

  // Sort by triggered time descending
  filtered.sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime());

  return {
    alerts: filtered,
    total: filtered.length,
    unacknowledged: activeAlerts.filter((a) => !a.acknowledged).length,
  };
}

/**
 * Acknowledge an alert
 */
export async function acknowledgeAlert(
  alertId: string,
  acknowledgedBy: string
): Promise<Alert | null> {
  const alert = activeAlerts.find((a) => a.id === alertId);
  if (alert) {
    alert.acknowledged = true;
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = acknowledgedBy;
    return alert;
  }
  return null;
}

/**
 * Trigger an alert
 */
async function triggerAlert(
  alertType: AlertType,
  severity: AlertSeverity,
  message: string,
  currentValue: number,
  threshold: number
): Promise<void> {
  const config = alertConfigs.get(alertType);
  if (!config?.enabled) {
    return;
  }

  // Check if similar alert already exists and is not acknowledged
  const existingAlert = activeAlerts.find(
    (a) => a.alertType === alertType && !a.acknowledged
  );
  if (existingAlert) {
    // Update existing alert
    existingAlert.currentValue = currentValue;
    existingAlert.triggeredAt = new Date();
    return;
  }

  const alert: Alert = {
    id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    alertType,
    severity,
    message,
    currentValue,
    threshold,
    triggeredAt: new Date(),
    acknowledged: false,
  };

  activeAlerts.push(alert);

  // Keep only last 1000 alerts
  if (activeAlerts.length > 1000) {
    activeAlerts.shift();
  }

  logger.warn('Alert triggered', { alertType, severity, message, currentValue, threshold });

  // Send email notification if configured
  if (config.notifyEmail) {
    await sendAlertNotification(config.notifyEmail, alert);
  }
}

/**
 * Send alert notification via email
 * Requirements: 19.4 - Notify administrators via email
 */
async function sendAlertNotification(email: string, alert: Alert): Promise<void> {
  // In production, this would use an email service
  logger.info('Alert notification sent', { email, alertType: alert.alertType });
}

/**
 * Check resource thresholds and trigger alerts
 * Requirements: 19.5 - Trigger alerts when resource thresholds are exceeded
 */
async function checkResourceThresholds(
  resources: ResourceUtilization,
  performance: PerformanceMetrics
): Promise<void> {
  const cpuConfig = alertConfigs.get(AlertType.CPU_HIGH);
  if (cpuConfig?.enabled && resources.cpuUsage > cpuConfig.threshold) {
    await triggerAlert(
      AlertType.CPU_HIGH,
      AlertSeverity.WARNING,
      `CPU usage is at ${resources.cpuUsage}%, exceeding threshold of ${cpuConfig.threshold}%`,
      resources.cpuUsage,
      cpuConfig.threshold
    );
  }

  const memoryConfig = alertConfigs.get(AlertType.MEMORY_HIGH);
  if (memoryConfig?.enabled && resources.memoryUsage > memoryConfig.threshold) {
    await triggerAlert(
      AlertType.MEMORY_HIGH,
      AlertSeverity.WARNING,
      `Memory usage is at ${resources.memoryUsage}%, exceeding threshold of ${memoryConfig.threshold}%`,
      resources.memoryUsage,
      memoryConfig.threshold
    );
  }

  const diskConfig = alertConfigs.get(AlertType.DISK_SPACE_LOW);
  if (diskConfig?.enabled && resources.diskUsage > diskConfig.threshold) {
    await triggerAlert(
      AlertType.DISK_SPACE_LOW,
      AlertSeverity.CRITICAL,
      `Disk usage is at ${resources.diskUsage}%, exceeding threshold of ${diskConfig.threshold}%`,
      resources.diskUsage,
      diskConfig.threshold
    );
  }

  const latencyConfig = alertConfigs.get(AlertType.LATENCY_HIGH);
  if (latencyConfig?.enabled && performance.averageResponseTime > latencyConfig.threshold) {
    await triggerAlert(
      AlertType.LATENCY_HIGH,
      AlertSeverity.WARNING,
      `Average response time is ${performance.averageResponseTime}ms, exceeding threshold of ${latencyConfig.threshold}ms`,
      performance.averageResponseTime,
      latencyConfig.threshold
    );
  }
}

/**
 * Check error rate threshold
 */
async function checkErrorRateThreshold(): Promise<void> {
  const config = alertConfigs.get(AlertType.ERROR_RATE_HIGH);
  if (!config?.enabled) {
    return;
  }

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const recentErrors = errorLogs.filter((e) => e.timestamp >= oneHourAgo).length;

  // Estimate error rate (errors per hour as percentage of expected requests)
  const estimatedRequests = 1000; // Placeholder
  const errorRate = (recentErrors / estimatedRequests) * 100;

  if (errorRate > config.threshold) {
    await triggerAlert(
      AlertType.ERROR_RATE_HIGH,
      AlertSeverity.CRITICAL,
      `Error rate is at ${errorRate.toFixed(2)}%, exceeding threshold of ${config.threshold}%`,
      errorRate,
      config.threshold
    );
  }
}

// ============================================
// Performance Tracking
// ============================================

/**
 * Record performance data point
 * Requirements: 19.2 - Track and display average processing time per 1,000 words
 */
export async function recordPerformanceData(
  processingTime: number,
  requestCount: number,
  errorCount: number,
  averageResponseTime: number
): Promise<void> {
  const dataPoint: PerformanceDataPoint = {
    timestamp: new Date(),
    processingTime,
    requestCount,
    errorCount,
    averageResponseTime,
  };

  performanceData.push(dataPoint);

  // Keep only last 24 hours of data (assuming 1 data point per minute)
  const maxDataPoints = 24 * 60;
  if (performanceData.length > maxDataPoints) {
    performanceData.shift();
  }
}

/**
 * Get performance history
 */
export async function getPerformanceHistory(
  input: GetMetricsInput
): Promise<PerformanceHistory> {
  const now = new Date();
  const startDate = input.startDate ? new Date(input.startDate) : new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const endDate = input.endDate ? new Date(input.endDate) : now;

  const filtered = performanceData.filter(
    (d) => d.timestamp >= startDate && d.timestamp <= endDate
  );

  // Calculate summary
  const totalRequests = filtered.reduce((sum, d) => sum + d.requestCount, 0);
  const totalErrors = filtered.reduce((sum, d) => sum + d.errorCount, 0);
  const avgProcessingTime = filtered.length > 0
    ? filtered.reduce((sum, d) => sum + d.processingTime, 0) / filtered.length
    : 0;
  const peakRequestsPerMinute = filtered.length > 0
    ? Math.max(...filtered.map((d) => d.requestCount))
    : 0;

  return {
    dataPoints: filtered,
    interval: input.interval,
    startDate,
    endDate,
    summary: {
      averageProcessingTime: Math.round(avgProcessingTime),
      totalRequests,
      totalErrors,
      peakRequestsPerMinute,
    },
  };
}

// ============================================
// Admin Dashboard
// ============================================

/**
 * Get complete admin dashboard data
 */
export async function getAdminDashboard(): Promise<AdminDashboard> {
  const [systemMetrics, userActivity, errorSummary, alertsResponse, performanceHistory] =
    await Promise.all([
      getSystemMetrics(),
      getUserActivitySummary(),
      getErrorSummary(),
      getAlerts(false), // Get unacknowledged alerts
      getPerformanceHistory({ interval: 'hour' }),
    ]);

  return {
    systemMetrics,
    userActivity,
    errorSummary,
    recentAlerts: alertsResponse.alerts.slice(0, 10),
    performanceHistory: performanceHistory.dataPoints.slice(-24), // Last 24 data points
  };
}
