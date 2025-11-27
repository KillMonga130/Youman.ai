/**
 * Support and Diagnostics Service
 * Implements user impersonation, error context capture, request inspection,
 * operation retry, and diagnostic report generation
 * 
 * Requirements: 94 - Support and diagnostics tools
 */

import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import os from 'os';
import { prisma } from '../database/prisma';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import {
  AuditEventType,
  OperationStatus,
  type StartImpersonationInput,
  type CaptureErrorContextInput,
  type InspectRequestInput,
  type RetryOperationInput,
  type GenerateDiagnosticReportInput,
  type ImpersonationSession,
  type ImpersonationResponse,
  type ImpersonationActionLog,
  type AuditLogEntry,
  type ErrorContext,
  type RequestInspection,
  type TrackedOperation,
  type OperationAttempt,
  type RetryResult,
  type SupportDiagnosticReport,
} from './types';

// ============================================
// In-Memory Storage
// In production, these would be stored in Redis or a database
// ============================================

const impersonationSessions: Map<string, ImpersonationSession> = new Map();
const auditLogs: AuditLogEntry[] = [];
const errorContexts: Map<string, ErrorContext> = new Map();
const requestInspections: Map<string, RequestInspection> = new Map();
const trackedOperations: Map<string, TrackedOperation> = new Map();

// Maximum storage limits
const MAX_AUDIT_LOGS = 10000;
const MAX_ERROR_CONTEXTS = 1000;
const MAX_REQUEST_INSPECTIONS = 1000;
const MAX_TRACKED_OPERATIONS = 5000;

// ============================================
// Error Classes
// ============================================

export class SupportError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'SupportError';
    this.code = code;
  }
}

// ============================================
// Audit Logging
// ============================================

/**
 * Create an audit log entry
 */
export function createAuditLog(
  eventType: AuditEventType,
  adminUserId: string,
  adminEmail: string,
  action: string,
  details: Record<string, unknown>,
  options?: {
    targetUserId?: string;
    targetEmail?: string;
    ipAddress?: string;
    userAgent?: string;
  }
): AuditLogEntry {
  const entry: AuditLogEntry = {
    id: uuidv4(),
    timestamp: new Date(),
    eventType,
    adminUserId,
    adminEmail,
    targetUserId: options?.targetUserId,
    targetEmail: options?.targetEmail,
    action,
    details,
    ipAddress: options?.ipAddress,
    userAgent: options?.userAgent,
  };

  auditLogs.push(entry);

  // Trim old logs
  if (auditLogs.length > MAX_AUDIT_LOGS) {
    auditLogs.shift();
  }

  logger.info('Audit log created', {
    eventType,
    adminUserId,
    action,
    targetUserId: options?.targetUserId,
  });

  return entry;
}

/**
 * Get audit logs with filtering
 */
export function getAuditLogs(
  filters?: {
    eventType?: AuditEventType;
    adminUserId?: string;
    targetUserId?: string;
    startDate?: Date;
    endDate?: Date;
  },
  limit: number = 100,
  offset: number = 0
): { logs: AuditLogEntry[]; total: number } {
  let filtered = [...auditLogs];

  if (filters?.eventType) {
    filtered = filtered.filter((log) => log.eventType === filters.eventType);
  }
  if (filters?.adminUserId) {
    filtered = filtered.filter((log) => log.adminUserId === filters.adminUserId);
  }
  if (filters?.targetUserId) {
    filtered = filtered.filter((log) => log.targetUserId === filters.targetUserId);
  }
  if (filters?.startDate) {
    filtered = filtered.filter((log) => log.timestamp >= filters.startDate!);
  }
  if (filters?.endDate) {
    filtered = filtered.filter((log) => log.timestamp <= filters.endDate!);
  }

  // Sort by timestamp descending
  filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return {
    logs: filtered.slice(offset, offset + limit),
    total: filtered.length,
  };
}

// ============================================
// User Impersonation
// ============================================

/**
 * Start impersonating a user
 * Creates a special session that allows admin to act as the target user
 */
export async function startImpersonation(
  adminUserId: string,
  adminEmail: string,
  input: StartImpersonationInput,
  metadata?: { ipAddress?: string; userAgent?: string }
): Promise<ImpersonationResponse> {
  const { targetUserId, reason, duration } = input;

  // Verify target user exists
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!targetUser) {
    throw new SupportError('Target user not found', 'USER_NOT_FOUND');
  }

  // Check if admin is already impersonating someone
  const existingSession = Array.from(impersonationSessions.values()).find(
    (session) => session.adminUserId === adminUserId && !session.endedAt
  );

  if (existingSession) {
    throw new SupportError(
      'Already impersonating another user. End current session first.',
      'ALREADY_IMPERSONATING'
    );
  }

  // Create impersonation session
  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + duration * 60 * 1000);

  // Generate impersonation token
  const token = jwt.sign(
    {
      userId: targetUserId,
      email: targetUser.email,
      sessionId,
      type: 'impersonation',
      adminUserId,
      adminEmail,
    },
    config.jwt.secret,
    { expiresIn: `${duration}m` }
  );

  const session: ImpersonationSession = {
    id: sessionId,
    adminUserId,
    adminEmail,
    targetUserId,
    targetEmail: targetUser.email,
    reason,
    startedAt: new Date(),
    expiresAt,
    actionsPerformed: [],
    token,
  };

  impersonationSessions.set(sessionId, session);

  // Create audit log
  createAuditLog(
    AuditEventType.IMPERSONATION_START,
    adminUserId,
    adminEmail,
    'Started user impersonation',
    { reason, duration },
    {
      targetUserId,
      targetEmail: targetUser.email,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    }
  );

  logger.warn('User impersonation started', {
    adminUserId,
    adminEmail,
    targetUserId,
    targetEmail: targetUser.email,
    reason,
    sessionId,
  });

  return {
    session,
    token,
    expiresIn: duration * 60,
  };
}

/**
 * End an impersonation session
 */
export async function endImpersonation(
  sessionId: string,
  adminUserId: string,
  adminEmail: string,
  metadata?: { ipAddress?: string; userAgent?: string }
): Promise<ImpersonationSession> {
  const session = impersonationSessions.get(sessionId);

  if (!session) {
    throw new SupportError('Impersonation session not found', 'SESSION_NOT_FOUND');
  }

  if (session.adminUserId !== adminUserId) {
    throw new SupportError('Not authorized to end this session', 'UNAUTHORIZED');
  }

  if (session.endedAt) {
    throw new SupportError('Session already ended', 'SESSION_ENDED');
  }

  session.endedAt = new Date();

  // Create audit log
  createAuditLog(
    AuditEventType.IMPERSONATION_END,
    adminUserId,
    adminEmail,
    'Ended user impersonation',
    {
      sessionDuration: session.endedAt.getTime() - session.startedAt.getTime(),
      actionsCount: session.actionsPerformed.length,
    },
    {
      targetUserId: session.targetUserId,
      targetEmail: session.targetEmail,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    }
  );

  logger.info('User impersonation ended', {
    adminUserId,
    targetUserId: session.targetUserId,
    sessionId,
    actionsPerformed: session.actionsPerformed.length,
  });

  return session;
}

/**
 * Log an action performed during impersonation
 */
export function logImpersonationAction(
  sessionId: string,
  action: string,
  endpoint: string,
  method: string,
  statusCode?: number,
  metadata?: Record<string, unknown>
): void {
  const session = impersonationSessions.get(sessionId);

  if (!session || session.endedAt) {
    return;
  }

  const actionLog: ImpersonationActionLog = {
    timestamp: new Date(),
    action,
    endpoint,
    method,
    statusCode,
    metadata,
  };

  session.actionsPerformed.push(actionLog);

  // Also create audit log for significant actions
  createAuditLog(
    AuditEventType.IMPERSONATION_ACTION,
    session.adminUserId,
    session.adminEmail,
    action,
    { endpoint, method, statusCode, ...metadata },
    {
      targetUserId: session.targetUserId,
      targetEmail: session.targetEmail,
    }
  );
}

/**
 * Get impersonation session by ID
 */
export function getImpersonationSession(sessionId: string): ImpersonationSession | null {
  return impersonationSessions.get(sessionId) || null;
}

/**
 * Get all active impersonation sessions
 */
export function getActiveImpersonationSessions(): ImpersonationSession[] {
  const now = new Date();
  return Array.from(impersonationSessions.values()).filter(
    (session) => !session.endedAt && session.expiresAt > now
  );
}

/**
 * Validate impersonation token
 */
export function validateImpersonationToken(token: string): {
  valid: boolean;
  session?: ImpersonationSession;
  payload?: {
    userId: string;
    email: string;
    sessionId: string;
    adminUserId: string;
    adminEmail: string;
  };
} {
  try {
    const payload = jwt.verify(token, config.jwt.secret) as {
      userId: string;
      email: string;
      sessionId: string;
      type: string;
      adminUserId: string;
      adminEmail: string;
    };

    if (payload.type !== 'impersonation') {
      return { valid: false };
    }

    const session = impersonationSessions.get(payload.sessionId);
    if (!session || session.endedAt || session.expiresAt < new Date()) {
      return { valid: false };
    }

    return {
      valid: true,
      session,
      payload: {
        userId: payload.userId,
        email: payload.email,
        sessionId: payload.sessionId,
        adminUserId: payload.adminUserId,
        adminEmail: payload.adminEmail,
      },
    };
  } catch {
    return { valid: false };
  }
}


// ============================================
// Error Context Capture
// ============================================

/**
 * Capture error context for debugging
 */
export function captureErrorContext(
  error: Error,
  input: CaptureErrorContextInput,
  requestData?: {
    id: string;
    method: string;
    path: string;
    headers: Record<string, string>;
    query: Record<string, string>;
    body?: unknown;
    userId?: string;
    sessionId?: string;
    timestamp: Date;
  },
  responseData?: {
    statusCode: number;
    headers: Record<string, string>;
    body?: unknown;
    duration: number;
  }
): ErrorContext {
  const contextId = input.errorId || uuidv4();

  const context: ErrorContext = {
    id: contextId,
    capturedAt: new Date(),
    error: {
      name: error.name,
      message: error.message,
      code: (error as { code?: string }).code,
      stack: input.includeStackTrace ? error.stack : undefined,
    },
  };

  if (input.includeRequestData && requestData) {
    // Sanitize sensitive headers
    const sanitizedHeaders = { ...requestData.headers };
    delete sanitizedHeaders['authorization'];
    delete sanitizedHeaders['cookie'];
    delete sanitizedHeaders['x-api-key'];

    context.request = {
      ...requestData,
      headers: sanitizedHeaders,
    };
  }

  if (responseData) {
    context.response = responseData;
  }

  if (input.includeSystemState) {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    context.systemState = {
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss,
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      uptime: process.uptime(),
      activeConnections: 0, // Would be populated from actual connection tracking
    };
  }

  // Find related errors (same error message in recent history)
  const relatedErrors = Array.from(errorContexts.values())
    .filter(
      (ctx) =>
        ctx.error.message === error.message &&
        ctx.id !== contextId &&
        ctx.capturedAt > new Date(Date.now() - 24 * 60 * 60 * 1000)
    )
    .slice(0, 5)
    .map((ctx) => ({
      id: ctx.id,
      message: ctx.error.message,
      timestamp: ctx.capturedAt,
    }));

  if (relatedErrors.length > 0) {
    context.relatedErrors = relatedErrors;
  }

  errorContexts.set(contextId, context);

  // Trim old contexts
  if (errorContexts.size > MAX_ERROR_CONTEXTS) {
    const oldestKey = errorContexts.keys().next().value;
    if (oldestKey) {
      errorContexts.delete(oldestKey);
    }
  }

  logger.debug('Error context captured', { contextId, errorMessage: error.message });

  return context;
}

/**
 * Get error context by ID
 */
export function getErrorContext(contextId: string): ErrorContext | null {
  return errorContexts.get(contextId) || null;
}

/**
 * Get recent error contexts
 */
export function getRecentErrorContexts(
  limit: number = 50,
  filters?: {
    userId?: string;
    errorCode?: string;
    startDate?: Date;
    endDate?: Date;
  }
): ErrorContext[] {
  let contexts = Array.from(errorContexts.values());

  if (filters?.userId) {
    contexts = contexts.filter((ctx) => ctx.request?.userId === filters.userId);
  }
  if (filters?.errorCode) {
    contexts = contexts.filter((ctx) => ctx.error.code === filters.errorCode);
  }
  if (filters?.startDate) {
    contexts = contexts.filter((ctx) => ctx.capturedAt >= filters.startDate!);
  }
  if (filters?.endDate) {
    contexts = contexts.filter((ctx) => ctx.capturedAt <= filters.endDate!);
  }

  return contexts
    .sort((a, b) => b.capturedAt.getTime() - a.capturedAt.getTime())
    .slice(0, limit);
}

// ============================================
// Request Inspection
// ============================================

/**
 * Store request data for inspection
 */
export function storeRequestForInspection(
  requestId: string,
  requestData: {
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
  }
): void {
  // Sanitize sensitive headers
  const sanitizedHeaders = { ...requestData.headers };
  delete sanitizedHeaders['authorization'];
  delete sanitizedHeaders['cookie'];
  delete sanitizedHeaders['x-api-key'];

  const inspection: RequestInspection = {
    id: uuidv4(),
    inspectedAt: new Date(),
    request: {
      id: requestId,
      ...requestData,
      headers: sanitizedHeaders,
    },
  };

  requestInspections.set(requestId, inspection);

  // Trim old inspections
  if (requestInspections.size > MAX_REQUEST_INSPECTIONS) {
    const oldestKey = requestInspections.keys().next().value;
    if (oldestKey) {
      requestInspections.delete(oldestKey);
    }
  }
}

/**
 * Update request inspection with response data
 */
export function updateRequestInspection(
  requestId: string,
  responseData: {
    statusCode: number;
    statusMessage: string;
    headers: Record<string, string>;
    body?: unknown;
    size: number;
  },
  timing: {
    startTime: Date;
    endTime: Date;
    duration: number;
    phases?: {
      dns?: number;
      connect?: number;
      tls?: number;
      processing: number;
      transfer?: number;
    };
  },
  metadata?: {
    routeMatched: string;
    middlewaresExecuted: string[];
    cacheHit?: boolean;
    dbQueries?: number;
  }
): void {
  const inspection = requestInspections.get(requestId);
  if (!inspection) {
    return;
  }

  inspection.response = responseData;
  inspection.timing = {
    ...timing,
    phases: timing.phases || { processing: timing.duration },
  };
  inspection.metadata = metadata;
}

/**
 * Inspect a specific request
 */
export function inspectRequest(input: InspectRequestInput): RequestInspection | null {
  const inspection = requestInspections.get(input.requestId);
  if (!inspection) {
    return null;
  }

  // Create a filtered copy based on input options
  const result: RequestInspection = {
    id: inspection.id,
    inspectedAt: new Date(),
    request: {
      id: inspection.request.id,
      method: inspection.request.method,
      path: inspection.request.path,
      fullUrl: inspection.request.fullUrl,
      headers: input.includeHeaders ? inspection.request.headers : {},
      query: inspection.request.query,
      body: input.includeBody ? inspection.request.body : undefined,
      userId: inspection.request.userId,
      sessionId: inspection.request.sessionId,
      ipAddress: inspection.request.ipAddress,
      userAgent: inspection.request.userAgent,
      timestamp: inspection.request.timestamp,
    },
  };

  if (input.includeResponse && inspection.response) {
    result.response = inspection.response;
  }

  if (input.includeTiming && inspection.timing) {
    result.timing = inspection.timing;
  }

  if (inspection.metadata) {
    result.metadata = inspection.metadata;
  }

  return result;
}

/**
 * Get recent request inspections
 */
export function getRecentRequestInspections(
  limit: number = 50,
  filters?: {
    userId?: string;
    method?: string;
    statusCode?: number;
    minDuration?: number;
  }
): RequestInspection[] {
  let inspections = Array.from(requestInspections.values());

  if (filters?.userId) {
    inspections = inspections.filter((i) => i.request.userId === filters.userId);
  }
  if (filters?.method) {
    inspections = inspections.filter((i) => i.request.method === filters.method);
  }
  if (filters?.statusCode) {
    inspections = inspections.filter((i) => i.response?.statusCode === filters.statusCode);
  }
  if (filters?.minDuration) {
    inspections = inspections.filter((i) => (i.timing?.duration || 0) >= filters.minDuration!);
  }

  return inspections
    .sort((a, b) => b.request.timestamp.getTime() - a.request.timestamp.getTime())
    .slice(0, limit);
}

// ============================================
// Operation Retry
// ============================================

/**
 * Track an operation for potential retry
 */
export function trackOperation(
  operationType: string,
  input: unknown,
  userId?: string,
  metadata?: Record<string, unknown>
): TrackedOperation {
  const operation: TrackedOperation = {
    id: uuidv4(),
    type: operationType,
    status: OperationStatus.PENDING,
    userId,
    input,
    attempts: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata,
  };

  trackedOperations.set(operation.id, operation);

  // Trim old operations
  if (trackedOperations.size > MAX_TRACKED_OPERATIONS) {
    const oldestKey = trackedOperations.keys().next().value;
    if (oldestKey) {
      trackedOperations.delete(oldestKey);
    }
  }

  return operation;
}

/**
 * Update operation status
 */
export function updateOperationStatus(
  operationId: string,
  status: OperationStatus,
  output?: unknown,
  error?: Error
): TrackedOperation | null {
  const operation = trackedOperations.get(operationId);
  if (!operation) {
    return null;
  }

  operation.status = status;
  operation.updatedAt = new Date();

  if (output !== undefined) {
    operation.output = output;
  }

  if (error) {
    operation.error = {
      name: error.name,
      message: error.message,
      code: (error as { code?: string }).code,
      stack: error.stack,
    };
  }

  if (status === OperationStatus.COMPLETED || status === OperationStatus.FAILED) {
    operation.completedAt = new Date();
  }

  return operation;
}

/**
 * Record an operation attempt
 */
export function recordOperationAttempt(
  operationId: string,
  success: boolean,
  error?: Error
): OperationAttempt | null {
  const operation = trackedOperations.get(operationId);
  if (!operation) {
    return null;
  }

  const attempt: OperationAttempt = {
    attemptNumber: operation.attempts.length + 1,
    startedAt: new Date(),
    completedAt: new Date(),
    duration: 0,
    success,
    error: error
      ? {
          name: error.name,
          message: error.message,
          code: (error as { code?: string }).code,
        }
      : undefined,
  };

  operation.attempts.push(attempt);
  operation.updatedAt = new Date();

  return attempt;
}

/**
 * Retry a failed operation
 */
export async function retryOperation(
  input: RetryOperationInput,
  executor: (operationInput: unknown) => Promise<unknown>
): Promise<RetryResult> {
  const operation = trackedOperations.get(input.operationId);
  if (!operation) {
    throw new SupportError('Operation not found', 'OPERATION_NOT_FOUND');
  }

  if (operation.status === OperationStatus.COMPLETED) {
    throw new SupportError('Operation already completed', 'ALREADY_COMPLETED');
  }

  operation.status = OperationStatus.RETRYING;
  operation.updatedAt = new Date();

  let lastError: Error | undefined;
  let attempts = 0;

  for (let i = 0; i < input.maxRetries; i++) {
    attempts++;
    const startTime = Date.now();

    try {
      const output = await executor(operation.input);

      const attempt: OperationAttempt = {
        attemptNumber: operation.attempts.length + 1,
        startedAt: new Date(startTime),
        completedAt: new Date(),
        duration: Date.now() - startTime,
        success: true,
      };
      operation.attempts.push(attempt);

      operation.status = OperationStatus.COMPLETED;
      operation.output = output;
      operation.completedAt = new Date();
      operation.updatedAt = new Date();

      logger.info('Operation retry succeeded', {
        operationId: input.operationId,
        attempts,
      });

      return {
        operationId: input.operationId,
        success: true,
        attempts,
        finalStatus: OperationStatus.COMPLETED,
        output,
      };
    } catch (error) {
      lastError = error as Error;

      const attempt: OperationAttempt = {
        attemptNumber: operation.attempts.length + 1,
        startedAt: new Date(startTime),
        completedAt: new Date(),
        duration: Date.now() - startTime,
        success: false,
        error: {
          name: lastError.name,
          message: lastError.message,
          code: (lastError as { code?: string }).code,
        },
      };
      operation.attempts.push(attempt);

      logger.warn('Operation retry attempt failed', {
        operationId: input.operationId,
        attempt: attempts,
        error: lastError.message,
      });

      // Wait before next retry (exponential backoff)
      if (i < input.maxRetries - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, input.backoffMs * Math.pow(2, i))
        );
      }
    }
  }

  // All retries failed
  operation.status = OperationStatus.FAILED;
  operation.error = lastError
    ? {
        name: lastError.name,
        message: lastError.message,
        code: (lastError as { code?: string }).code,
        stack: lastError.stack,
      }
    : undefined;
  operation.completedAt = new Date();
  operation.updatedAt = new Date();

  logger.error('Operation retry exhausted', {
    operationId: input.operationId,
    attempts,
    error: lastError?.message,
  });

  return {
    operationId: input.operationId,
    success: false,
    attempts,
    finalStatus: OperationStatus.FAILED,
    error: lastError
      ? {
          name: lastError.name,
          message: lastError.message,
          code: (lastError as { code?: string }).code,
        }
      : undefined,
  };
}

/**
 * Get operation by ID
 */
export function getOperation(operationId: string): TrackedOperation | null {
  return trackedOperations.get(operationId) || null;
}

/**
 * Get operations by status
 */
export function getOperationsByStatus(
  status: OperationStatus,
  limit: number = 50
): TrackedOperation[] {
  return Array.from(trackedOperations.values())
    .filter((op) => op.status === status)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, limit);
}


// ============================================
// Diagnostic Report Generation
// ============================================

/**
 * Generate a comprehensive diagnostic report
 */
export async function generateDiagnosticReport(
  generatedBy: string,
  input: GenerateDiagnosticReportInput
): Promise<SupportDiagnosticReport> {
  const now = new Date();
  const startTime = new Date(now.getTime() - input.timeRangeMinutes * 60 * 1000);

  const report: SupportDiagnosticReport = {
    id: uuidv4(),
    generatedAt: now,
    generatedBy,
    targetUserId: input.userId,
    timeRange: {
      start: startTime,
      end: now,
    },
    recommendations: [],
  };

  // System metrics
  if (input.includeSystemMetrics) {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memUsage = process.memoryUsage();

    // Calculate CPU usage
    const cpuUsage = cpus.reduce((acc, cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      const idle = cpu.times.idle;
      return acc + ((total - idle) / total) * 100;
    }, 0) / cpus.length;

    // Calculate requests per minute from recent inspections
    const recentRequests = Array.from(requestInspections.values()).filter(
      (i) => i.request.timestamp >= startTime
    );
    const requestsPerMinute = recentRequests.length / input.timeRangeMinutes;

    report.systemMetrics = {
      cpu: {
        usage: Math.round(cpuUsage * 100) / 100,
        cores: cpus.length,
      },
      memory: {
        total: totalMem,
        used: totalMem - freeMem,
        free: freeMem,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
      },
      uptime: process.uptime(),
      activeConnections: 0, // Would be populated from actual tracking
      requestsPerMinute: Math.round(requestsPerMinute * 100) / 100,
    };

    // Add recommendations based on system metrics
    const memoryUsagePercent = ((totalMem - freeMem) / totalMem) * 100;
    if (memoryUsagePercent > 80) {
      report.recommendations.push(
        `High memory usage (${memoryUsagePercent.toFixed(1)}%). Consider scaling up or investigating memory leaks.`
      );
    }
    if (cpuUsage > 80) {
      report.recommendations.push(
        `High CPU usage (${cpuUsage.toFixed(1)}%). Consider scaling horizontally.`
      );
    }
  }

  // User-specific metrics
  if (input.userId) {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      include: { subscription: true },
    });

    if (user) {
      const userRequests = Array.from(requestInspections.values()).filter(
        (i) => i.request.userId === input.userId && i.request.timestamp >= startTime
      );

      const userErrors = Array.from(errorContexts.values()).filter(
        (ctx) => ctx.request?.userId === input.userId && ctx.capturedAt >= startTime
      );

      const avgResponseTime =
        userRequests.length > 0
          ? userRequests.reduce((sum, r) => sum + (r.timing?.duration || 0), 0) /
            userRequests.length
          : 0;

      // Get usage data
      const usageRecords = await prisma.usageRecord.findMany({
        where: {
          userId: input.userId,
          createdAt: { gte: startTime },
        },
      });

      const wordsUsed = usageRecords
        .filter((r) => r.resourceType === 'words')
        .reduce((sum, r) => sum + Number(r.amount), 0);

      const apiCallsUsed = usageRecords
        .filter((r) => r.resourceType === 'api_calls')
        .reduce((sum, r) => sum + Number(r.amount), 0);

      report.userMetrics = {
        totalRequests: userRequests.length,
        errorCount: userErrors.length,
        averageResponseTime: Math.round(avgResponseTime),
        lastActivity: user.updatedAt,
        subscriptionTier: user.subscription?.tier || 'FREE',
        quotaUsage: {
          words: { used: wordsUsed, limit: 10000 }, // Default limit
          apiCalls: { used: apiCallsUsed, limit: 1000 }, // Default limit
        },
      };

      // Add user-specific recommendations
      if (userErrors.length > 10) {
        report.recommendations.push(
          `User has ${userErrors.length} errors in the time range. Investigate common error patterns.`
        );
      }
      if (avgResponseTime > 2000) {
        report.recommendations.push(
          `User's average response time is ${avgResponseTime}ms. Check for slow queries or operations.`
        );
      }
    }
  }

  // Recent errors
  if (input.includeRecentErrors) {
    const recentErrors = Array.from(errorContexts.values())
      .filter((ctx) => {
        if (ctx.capturedAt < startTime) return false;
        if (input.userId && ctx.request?.userId !== input.userId) return false;
        return true;
      })
      .sort((a, b) => b.capturedAt.getTime() - a.capturedAt.getTime());

    // Group errors by message
    const errorGroups = new Map<string, { count: number; latest: ErrorContext }>();
    for (const error of recentErrors) {
      const key = error.error.message;
      const existing = errorGroups.get(key);
      if (existing) {
        existing.count++;
        if (error.capturedAt > existing.latest.capturedAt) {
          existing.latest = error;
        }
      } else {
        errorGroups.set(key, { count: 1, latest: error });
      }
    }

    report.recentErrors = Array.from(errorGroups.entries())
      .map(([message, data]) => ({
        id: data.latest.id,
        timestamp: data.latest.capturedAt,
        message,
        code: data.latest.error.code,
        endpoint: data.latest.request?.path,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    if (report.recentErrors.length > 0) {
      const topError = report.recentErrors[0];
      report.recommendations.push(
        `Most frequent error: "${topError.message}" (${topError.count} occurrences). Prioritize fixing this.`
      );
    }
  }

  // Recent requests
  if (input.includeRecentRequests) {
    const recentRequests = Array.from(requestInspections.values())
      .filter((i) => {
        if (i.request.timestamp < startTime) return false;
        if (input.userId && i.request.userId !== input.userId) return false;
        return true;
      })
      .sort((a, b) => b.request.timestamp.getTime() - a.request.timestamp.getTime())
      .slice(0, 100);

    report.recentRequests = recentRequests.map((i) => ({
      id: i.request.id,
      timestamp: i.request.timestamp,
      method: i.request.method,
      path: i.request.path,
      statusCode: i.response?.statusCode || 0,
      duration: i.timing?.duration || 0,
    }));
  }

  // Performance data
  if (input.includePerformanceData) {
    const requestsWithTiming = Array.from(requestInspections.values())
      .filter((i) => {
        if (!i.timing?.duration) return false;
        if (i.request.timestamp < startTime) return false;
        if (input.userId && i.request.userId !== input.userId) return false;
        return true;
      })
      .map((i) => i.timing!.duration);

    if (requestsWithTiming.length > 0) {
      requestsWithTiming.sort((a, b) => a - b);

      const p50Index = Math.floor(requestsWithTiming.length * 0.5);
      const p95Index = Math.floor(requestsWithTiming.length * 0.95);
      const p99Index = Math.floor(requestsWithTiming.length * 0.99);

      const errorRequests = Array.from(requestInspections.values()).filter(
        (i) =>
          i.request.timestamp >= startTime &&
          i.response?.statusCode &&
          i.response.statusCode >= 400
      );

      report.performanceData = {
        p50ResponseTime: requestsWithTiming[p50Index] || 0,
        p95ResponseTime: requestsWithTiming[p95Index] || 0,
        p99ResponseTime: requestsWithTiming[p99Index] || 0,
        errorRate:
          requestsWithTiming.length > 0
            ? (errorRequests.length / requestsWithTiming.length) * 100
            : 0,
        throughput: requestsWithTiming.length / input.timeRangeMinutes,
      };

      // Add performance recommendations
      if (report.performanceData.p95ResponseTime > 3000) {
        report.recommendations.push(
          `P95 response time is ${report.performanceData.p95ResponseTime}ms. Optimize slow endpoints.`
        );
      }
      if (report.performanceData.errorRate > 5) {
        report.recommendations.push(
          `Error rate is ${report.performanceData.errorRate.toFixed(1)}%. Investigate and fix errors.`
        );
      }
    }
  }

  // Add general recommendations if none were added
  if (report.recommendations.length === 0) {
    report.recommendations.push('All systems operating within normal parameters.');
  }

  // Create audit log for report generation
  createAuditLog(
    AuditEventType.DIAGNOSTIC_REPORT,
    generatedBy,
    '', // Email would be populated from context
    'Generated diagnostic report',
    {
      reportId: report.id,
      targetUserId: input.userId,
      timeRangeMinutes: input.timeRangeMinutes,
    }
  );

  logger.info('Diagnostic report generated', {
    reportId: report.id,
    generatedBy,
    targetUserId: input.userId,
  });

  return report;
}

// ============================================
// Cleanup Functions
// ============================================

/**
 * Clean up expired impersonation sessions
 */
export function cleanupExpiredSessions(): number {
  const now = new Date();
  let cleaned = 0;

  for (const [sessionId, session] of impersonationSessions) {
    if (session.expiresAt < now && !session.endedAt) {
      session.endedAt = now;
      cleaned++;

      logger.info('Expired impersonation session cleaned up', {
        sessionId,
        adminUserId: session.adminUserId,
        targetUserId: session.targetUserId,
      });
    }
  }

  return cleaned;
}

/**
 * Clear all support data (for testing)
 */
export function clearAllSupportData(): void {
  impersonationSessions.clear();
  auditLogs.length = 0;
  errorContexts.clear();
  requestInspections.clear();
  trackedOperations.clear();
}
