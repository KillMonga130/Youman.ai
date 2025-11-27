/**
 * Admin Panel Types
 * Requirements: 19 - Monitor system performance and user activity
 */

import { z } from 'zod';

// ============================================
// Enums
// ============================================

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

export enum AlertType {
  CPU_HIGH = 'cpu_high',
  MEMORY_HIGH = 'memory_high',
  QUEUE_BACKLOG = 'queue_backlog',
  ERROR_RATE_HIGH = 'error_rate_high',
  LATENCY_HIGH = 'latency_high',
  DISK_SPACE_LOW = 'disk_space_low',
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

// ============================================
// Validation Schemas
// ============================================

export const getLogsSchema = z.object({
  level: z.nativeEnum(LogLevel).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  userId: z.string().optional(),
  limit: z.number().int().min(1).max(1000).default(100),
  offset: z.number().int().min(0).default(0),
});

export const configureAlertSchema = z.object({
  alertType: z.nativeEnum(AlertType),
  enabled: z.boolean(),
  threshold: z.number().min(0).max(100),
  notifyEmail: z.string().email().optional(),
});

export const getMetricsSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  interval: z.enum(['minute', 'hour', 'day']).default('hour'),
});

// ============================================
// Input Types
// ============================================

export type GetLogsInput = z.infer<typeof getLogsSchema>;
export type ConfigureAlertInput = z.infer<typeof configureAlertSchema>;
export type GetMetricsInput = z.infer<typeof getMetricsSchema>;

// ============================================
// System Metrics Types
// ============================================

export interface SystemMetrics {
  timestamp: Date;
  activeUsers: number;
  totalUsers: number;
  processingQueueLength: number;
  resourceUtilization: ResourceUtilization;
  performance: PerformanceMetrics;
}

export interface ResourceUtilization {
  cpuUsage: number; // percentage 0-100
  memoryUsage: number; // percentage 0-100
  memoryUsedMB: number;
  memoryTotalMB: number;
  diskUsage: number; // percentage 0-100
  diskUsedGB: number;
  diskTotalGB: number;
}

export interface PerformanceMetrics {
  averageProcessingTimePer1000Words: number; // milliseconds
  requestsPerMinute: number;
  averageResponseTime: number; // milliseconds
  errorRate: number; // percentage 0-100
  successRate: number; // percentage 0-100
}

// ============================================
// User Activity Types
// ============================================

export interface UserActivitySummary {
  totalTransformations: number;
  totalWordsProcessed: number;
  totalApiCalls: number;
  totalErrors: number;
  activeUsersToday: number;
  activeUsersThisWeek: number;
  activeUsersThisMonth: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
}

export interface UserActivity {
  userId: string;
  email: string;
  lastActive: Date;
  transformationsCount: number;
  wordsProcessed: number;
  apiCallsCount: number;
  errorsCount: number;
  subscriptionTier: string;
}

// ============================================
// Log Types
// ============================================

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  userId?: string;
  action?: string;
  metadata?: Record<string, unknown>;
  errorCode?: string;
  stackTrace?: string;
}

export interface LogsResponse {
  logs: LogEntry[];
  total: number;
  limit: number;
  offset: number;
}

// ============================================
// Error Log Types
// ============================================

export interface ErrorLogEntry {
  id: string;
  timestamp: Date;
  errorCode: string;
  message: string;
  userId?: string | undefined;
  endpoint?: string | undefined;
  stackTrace?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
  resolved: boolean;
}

export interface ErrorSummary {
  totalErrors: number;
  errorsToday: number;
  errorsThisWeek: number;
  errorsByType: Record<string, number>;
  topErrors: Array<{
    errorCode: string;
    count: number;
    lastOccurrence: Date;
  }>;
}

// ============================================
// Alert Types
// ============================================

export interface AlertConfig {
  id: string;
  alertType: AlertType;
  enabled: boolean;
  threshold: number;
  notifyEmail?: string | undefined;
  createdAt: Date;
  updatedAt: Date;
}

export interface Alert {
  id: string;
  alertType: AlertType;
  severity: AlertSeverity;
  message: string;
  currentValue: number;
  threshold: number;
  triggeredAt: Date;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
}

export interface AlertsResponse {
  alerts: Alert[];
  total: number;
  unacknowledged: number;
}

// ============================================
// Performance Tracking Types
// ============================================

export interface PerformanceDataPoint {
  timestamp: Date;
  processingTime: number;
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
}

export interface PerformanceHistory {
  dataPoints: PerformanceDataPoint[];
  interval: string;
  startDate: Date;
  endDate: Date;
  summary: {
    averageProcessingTime: number;
    totalRequests: number;
    totalErrors: number;
    peakRequestsPerMinute: number;
  };
}

// ============================================
// Dashboard Types
// ============================================

export interface AdminDashboard {
  systemMetrics: SystemMetrics;
  userActivity: UserActivitySummary;
  errorSummary: ErrorSummary;
  recentAlerts: Alert[];
  performanceHistory: PerformanceDataPoint[];
}
