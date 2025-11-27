/**
 * Support and Diagnostics Types
 * Requirements: 94 - Support and diagnostics tools
 */

import { z } from 'zod';

// ============================================
// Enums
// ============================================

export enum ImpersonationAction {
  START = 'start',
  END = 'end',
}

export enum AuditEventType {
  IMPERSONATION_START = 'impersonation_start',
  IMPERSONATION_END = 'impersonation_end',
  IMPERSONATION_ACTION = 'impersonation_action',
  REQUEST_INSPECTION = 'request_inspection',
  OPERATION_RETRY = 'operation_retry',
  DIAGNOSTIC_REPORT = 'diagnostic_report',
  ERROR_CONTEXT_CAPTURE = 'error_context_capture',
}

export enum OperationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRYING = 'retrying',
}

// ============================================
// Validation Schemas
// ============================================

export const startImpersonationSchema = z.object({
  targetUserId: z.string().uuid('Invalid user ID'),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
  duration: z.number().int().min(1).max(60).default(30), // minutes
});

export const endImpersonationSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
});

export const captureErrorContextSchema = z.object({
  errorId: z.string().optional(),
  requestId: z.string().optional(),
  userId: z.string().optional(),
  includeStackTrace: z.boolean().default(true),
  includeRequestData: z.boolean().default(true),
  includeSystemState: z.boolean().default(true),
});

export const inspectRequestSchema = z.object({
  requestId: z.string(),
  includeHeaders: z.boolean().default(true),
  includeBody: z.boolean().default(true),
  includeResponse: z.boolean().default(true),
  includeTiming: z.boolean().default(true),
});

export const retryOperationSchema = z.object({
  operationId: z.string(),
  maxRetries: z.number().int().min(1).max(5).default(3),
  backoffMs: z.number().int().min(100).max(30000).default(1000),
});

export const generateDiagnosticReportSchema = z.object({
  userId: z.string().optional(),
  includeSystemMetrics: z.boolean().default(true),
  includeRecentErrors: z.boolean().default(true),
  includeRecentRequests: z.boolean().default(true),
  includePerformanceData: z.boolean().default(true),
  timeRangeMinutes: z.number().int().min(5).max(1440).default(60),
});

// ============================================
// Input Types
// ============================================

export type StartImpersonationInput = z.infer<typeof startImpersonationSchema>;
export type EndImpersonationInput = z.infer<typeof endImpersonationSchema>;
export type CaptureErrorContextInput = z.infer<typeof captureErrorContextSchema>;
export type InspectRequestInput = z.infer<typeof inspectRequestSchema>;
export type RetryOperationInput = z.infer<typeof retryOperationSchema>;
export type GenerateDiagnosticReportInput = z.infer<typeof generateDiagnosticReportSchema>;

// ============================================
// Impersonation Types
// ============================================

export interface ImpersonationSession {
  id: string;
  adminUserId: string;
  adminEmail: string;
  targetUserId: string;
  targetEmail: string;
  reason: string;
  startedAt: Date;
  expiresAt: Date;
  endedAt?: Date;
  actionsPerformed: ImpersonationActionLog[];
  token: string;
}

export interface ImpersonationActionLog {
  timestamp: Date;
  action: string;
  endpoint: string;
  method: string;
  statusCode?: number;
  metadata?: Record<string, unknown>;
}

export interface ImpersonationResponse {
  session: ImpersonationSession;
  token: string;
  expiresIn: number;
}

// ============================================
// Audit Log Types
// ============================================

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  eventType: AuditEventType;
  adminUserId: string;
  adminEmail: string;
  targetUserId?: string;
  targetEmail?: string;
  action: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

// ============================================
// Error Context Types
// ============================================

export interface ErrorContext {
  id: string;
  capturedAt: Date;
  error: {
    name: string;
    message: string;
    code?: string;
    stack?: string;
  };
  request?: {
    id: string;
    method: string;
    path: string;
    headers: Record<string, string>;
    query: Record<string, string>;
    body?: unknown;
    userId?: string;
    sessionId?: string;
    timestamp: Date;
  };
  response?: {
    statusCode: number;
    headers: Record<string, string>;
    body?: unknown;
    duration: number;
  };
  systemState?: {
    memory: {
      heapUsed: number;
      heapTotal: number;
      external: number;
      rss: number;
    };
    cpu: {
      user: number;
      system: number;
    };
    uptime: number;
    activeConnections: number;
  };
  relatedErrors?: Array<{
    id: string;
    message: string;
    timestamp: Date;
  }>;
}

// ============================================
// Request Inspection Types
// ============================================

export interface RequestInspection {
  id: string;
  inspectedAt: Date;
  request: {
    id: string;
    method: string;
    path: string;
    fullUrl: string;
    headers: Record<string, string>;
    query: Record<string, string>;
    body?: unknown;
    userId?: string;
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
    timestamp: Date;
  };
  response?: {
    statusCode: number;
    statusMessage: string;
    headers: Record<string, string>;
    body?: unknown;
    size: number;
  };
  timing?: {
    startTime: Date;
    endTime: Date;
    duration: number;
    phases: {
      dns?: number;
      connect?: number;
      tls?: number;
      processing: number;
      transfer?: number;
    };
  };
  metadata?: {
    routeMatched: string;
    middlewaresExecuted: string[];
    cacheHit?: boolean;
    dbQueries?: number;
  };
}

// ============================================
// Operation Retry Types
// ============================================

export interface TrackedOperation {
  id: string;
  type: string;
  status: OperationStatus;
  userId?: string;
  input: unknown;
  output?: unknown;
  error?: {
    name: string;
    message: string;
    code?: string;
    stack?: string;
  };
  attempts: OperationAttempt[];
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface OperationAttempt {
  attemptNumber: number;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  success: boolean;
  error?: {
    name: string;
    message: string;
    code?: string;
  };
}

export interface RetryResult {
  operationId: string;
  success: boolean;
  attempts: number;
  finalStatus: OperationStatus;
  output?: unknown;
  error?: {
    name: string;
    message: string;
    code?: string;
  };
}

// ============================================
// Diagnostic Report Types
// ============================================

export interface SupportDiagnosticReport {
  id: string;
  generatedAt: Date;
  generatedBy: string;
  targetUserId?: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  systemMetrics?: {
    cpu: {
      usage: number;
      cores: number;
    };
    memory: {
      total: number;
      used: number;
      free: number;
      heapUsed: number;
      heapTotal: number;
    };
    uptime: number;
    activeConnections: number;
    requestsPerMinute: number;
  };
  userMetrics?: {
    totalRequests: number;
    errorCount: number;
    averageResponseTime: number;
    lastActivity: Date;
    subscriptionTier?: string;
    quotaUsage?: {
      words: { used: number; limit: number };
      apiCalls: { used: number; limit: number };
    };
  };
  recentErrors?: Array<{
    id: string;
    timestamp: Date;
    message: string;
    code?: string;
    endpoint?: string;
    count: number;
  }>;
  recentRequests?: Array<{
    id: string;
    timestamp: Date;
    method: string;
    path: string;
    statusCode: number;
    duration: number;
  }>;
  performanceData?: {
    p50ResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    errorRate: number;
    throughput: number;
  };
  recommendations: string[];
}
