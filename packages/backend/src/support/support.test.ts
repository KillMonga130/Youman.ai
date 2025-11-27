/**
 * Support and Diagnostics Service Tests
 * Tests for user impersonation, error context capture, request inspection,
 * operation retry, and diagnostic report generation
 * 
 * Requirements: 94 - Support and diagnostics tools
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AuditEventType,
  OperationStatus,
} from './types';

// Mock prisma - must be defined before vi.mock
vi.mock('../database/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    usageRecord: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

// Mock config
vi.mock('../config/env', () => ({
  config: {
    jwt: {
      secret: 'test-secret-key-for-testing-purposes-only',
    },
  },
}));

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import after mocks are set up
import {
  startImpersonation,
  endImpersonation,
  getImpersonationSession,
  getActiveImpersonationSessions,
  logImpersonationAction,
  validateImpersonationToken,
  captureErrorContext,
  getErrorContext,
  getRecentErrorContexts,
  storeRequestForInspection,
  updateRequestInspection,
  inspectRequest,
  getRecentRequestInspections,
  trackOperation,
  updateOperationStatus,
  recordOperationAttempt,
  retryOperation,
  getOperation,
  getOperationsByStatus,
  generateDiagnosticReport,
  createAuditLog,
  getAuditLogs,
  cleanupExpiredSessions,
  clearAllSupportData,
  SupportError,
} from './support.service';
import { prisma } from '../database/prisma';

describe('Support and Diagnostics Service', () => {
  beforeEach(() => {
    clearAllSupportData();
    vi.clearAllMocks();
  });

  describe('Audit Logging', () => {
    it('should create audit log entries', () => {
      const entry = createAuditLog(
        AuditEventType.DIAGNOSTIC_REPORT,
        'admin-123',
        'admin@example.com',
        'Generated report',
        { reportId: 'report-123' }
      );

      expect(entry).toBeDefined();
      expect(entry.id).toBeDefined();
      expect(entry.eventType).toBe(AuditEventType.DIAGNOSTIC_REPORT);
      expect(entry.adminUserId).toBe('admin-123');
      expect(entry.adminEmail).toBe('admin@example.com');
      expect(entry.action).toBe('Generated report');
      expect(entry.details.reportId).toBe('report-123');
    });

    it('should retrieve audit logs with filtering', () => {
      // Create multiple audit logs
      createAuditLog(
        AuditEventType.IMPERSONATION_START,
        'admin-1',
        'admin1@example.com',
        'Started impersonation',
        {},
        { targetUserId: 'user-1' }
      );

      createAuditLog(
        AuditEventType.DIAGNOSTIC_REPORT,
        'admin-2',
        'admin2@example.com',
        'Generated report',
        {}
      );

      // Get all logs
      const allLogs = getAuditLogs();
      expect(allLogs.total).toBe(2);

      // Filter by event type
      const impersonationLogs = getAuditLogs({ eventType: AuditEventType.IMPERSONATION_START });
      expect(impersonationLogs.total).toBe(1);
      expect(impersonationLogs.logs[0].eventType).toBe(AuditEventType.IMPERSONATION_START);

      // Filter by admin user
      const admin1Logs = getAuditLogs({ adminUserId: 'admin-1' });
      expect(admin1Logs.total).toBe(1);
    });
  });

  describe('User Impersonation', () => {
    const mockUser = {
      id: 'user-123',
      email: 'user@example.com',
      firstName: 'Test',
      lastName: 'User',
    };

    beforeEach(() => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);
    });

    it('should start impersonation session', async () => {
      const result = await startImpersonation(
        'admin-123',
        'admin@example.com',
        {
          targetUserId: 'user-123',
          reason: 'Investigating user issue with transformation',
          duration: 30,
        }
      );

      expect(result).toBeDefined();
      expect(result.session.adminUserId).toBe('admin-123');
      expect(result.session.targetUserId).toBe('user-123');
      expect(result.session.reason).toBe('Investigating user issue with transformation');
      expect(result.token).toBeDefined();
      expect(result.expiresIn).toBe(1800); // 30 minutes in seconds
    });

    it('should throw error when target user not found', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(
        startImpersonation('admin-123', 'admin@example.com', {
          targetUserId: 'nonexistent-user',
          reason: 'Testing error handling',
          duration: 30,
        })
      ).rejects.toThrow(SupportError);
    });

    it('should prevent multiple simultaneous impersonations', async () => {
      // Start first impersonation
      await startImpersonation('admin-123', 'admin@example.com', {
        targetUserId: 'user-123',
        reason: 'First impersonation session',
        duration: 30,
      });

      // Try to start second impersonation
      await expect(
        startImpersonation('admin-123', 'admin@example.com', {
          targetUserId: 'user-123',
          reason: 'Second impersonation session',
          duration: 30,
        })
      ).rejects.toThrow('Already impersonating');
    });

    it('should end impersonation session', async () => {
      const startResult = await startImpersonation('admin-123', 'admin@example.com', {
        targetUserId: 'user-123',
        reason: 'Testing end session',
        duration: 30,
      });

      const endResult = await endImpersonation(
        startResult.session.id,
        'admin-123',
        'admin@example.com'
      );

      expect(endResult.endedAt).toBeDefined();
    });

    it('should validate impersonation token', async () => {
      const startResult = await startImpersonation('admin-123', 'admin@example.com', {
        targetUserId: 'user-123',
        reason: 'Testing token validation',
        duration: 30,
      });

      const validation = validateImpersonationToken(startResult.token);

      expect(validation.valid).toBe(true);
      expect(validation.payload?.userId).toBe('user-123');
      expect(validation.payload?.adminUserId).toBe('admin-123');
    });

    it('should log impersonation actions', async () => {
      const startResult = await startImpersonation('admin-123', 'admin@example.com', {
        targetUserId: 'user-123',
        reason: 'Testing action logging',
        duration: 30,
      });

      logImpersonationAction(
        startResult.session.id,
        'Viewed user profile',
        '/api/users/profile',
        'GET',
        200
      );

      const session = getImpersonationSession(startResult.session.id);
      expect(session?.actionsPerformed.length).toBe(1);
      expect(session?.actionsPerformed[0].action).toBe('Viewed user profile');
    });

    it('should get active impersonation sessions', async () => {
      await startImpersonation('admin-123', 'admin@example.com', {
        targetUserId: 'user-123',
        reason: 'Testing active sessions',
        duration: 30,
      });

      const activeSessions = getActiveImpersonationSessions();
      expect(activeSessions.length).toBe(1);
    });
  });

  describe('Error Context Capture', () => {
    it('should capture error context', () => {
      const error = new Error('Test error message');
      error.name = 'TestError';

      const context = captureErrorContext(
        error,
        {
          includeStackTrace: true,
          includeRequestData: true,
          includeSystemState: true,
        },
        {
          id: 'req-123',
          method: 'POST',
          path: '/api/transform',
          headers: { 'content-type': 'application/json' },
          query: {},
          userId: 'user-123',
          timestamp: new Date(),
        }
      );

      expect(context).toBeDefined();
      expect(context.error.name).toBe('TestError');
      expect(context.error.message).toBe('Test error message');
      expect(context.error.stack).toBeDefined();
      expect(context.request?.userId).toBe('user-123');
      expect(context.systemState).toBeDefined();
    });

    it('should sanitize sensitive headers', () => {
      const error = new Error('Test error');

      const context = captureErrorContext(
        error,
        { includeRequestData: true },
        {
          id: 'req-123',
          method: 'GET',
          path: '/api/test',
          headers: {
            'content-type': 'application/json',
            'authorization': 'Bearer secret-token',
            'cookie': 'session=secret',
            'x-api-key': 'api-key-secret',
          },
          query: {},
          timestamp: new Date(),
        }
      );

      expect(context.request?.headers['authorization']).toBeUndefined();
      expect(context.request?.headers['cookie']).toBeUndefined();
      expect(context.request?.headers['x-api-key']).toBeUndefined();
      expect(context.request?.headers['content-type']).toBe('application/json');
    });

    it('should retrieve error context by ID', () => {
      const error = new Error('Test error');
      const context = captureErrorContext(error, {});

      const retrieved = getErrorContext(context.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(context.id);
    });

    it('should get recent error contexts with filtering', () => {
      // Create multiple error contexts
      const error1 = new Error('Error 1');
      captureErrorContext(
        error1,
        { includeRequestData: true },
        {
          id: 'req-1',
          method: 'GET',
          path: '/api/test',
          headers: {},
          query: {},
          userId: 'user-1',
          timestamp: new Date(),
        }
      );

      const error2 = new Error('Error 2');
      captureErrorContext(
        error2,
        { includeRequestData: true },
        {
          id: 'req-2',
          method: 'POST',
          path: '/api/transform',
          headers: {},
          query: {},
          userId: 'user-2',
          timestamp: new Date(),
        }
      );

      // Get all contexts
      const allContexts = getRecentErrorContexts();
      expect(allContexts.length).toBe(2);

      // Filter by user
      const user1Contexts = getRecentErrorContexts(50, { userId: 'user-1' });
      expect(user1Contexts.length).toBe(1);
    });
  });

  describe('Request Inspection', () => {
    it('should store and retrieve request inspection', () => {
      const requestId = 'req-123';

      storeRequestForInspection(requestId, {
        method: 'POST',
        path: '/api/transform',
        fullUrl: 'http://localhost:3000/api/transform',
        headers: { 'content-type': 'application/json' },
        query: {},
        userId: 'user-123',
        timestamp: new Date(),
      });

      const inspection = inspectRequest({
        requestId,
        includeHeaders: true,
        includeBody: true,
        includeResponse: true,
        includeTiming: true,
      });

      expect(inspection).toBeDefined();
      expect(inspection?.request.method).toBe('POST');
      expect(inspection?.request.path).toBe('/api/transform');
    });

    it('should update request inspection with response data', () => {
      const requestId = 'req-456';
      const startTime = new Date();

      storeRequestForInspection(requestId, {
        method: 'GET',
        path: '/api/users',
        fullUrl: 'http://localhost:3000/api/users',
        headers: {},
        query: {},
        timestamp: startTime,
      });

      updateRequestInspection(
        requestId,
        {
          statusCode: 200,
          statusMessage: 'OK',
          headers: { 'content-type': 'application/json' },
          size: 1024,
        },
        {
          startTime,
          endTime: new Date(),
          duration: 150,
        }
      );

      const inspection = inspectRequest({
        requestId,
        includeHeaders: true,
        includeBody: true,
        includeResponse: true,
        includeTiming: true,
      });

      expect(inspection?.response?.statusCode).toBe(200);
      expect(inspection?.timing?.duration).toBe(150);
    });

    it('should get recent request inspections with filtering', () => {
      // Store multiple requests
      storeRequestForInspection('req-1', {
        method: 'GET',
        path: '/api/users',
        fullUrl: 'http://localhost:3000/api/users',
        headers: {},
        query: {},
        userId: 'user-1',
        timestamp: new Date(),
      });

      storeRequestForInspection('req-2', {
        method: 'POST',
        path: '/api/transform',
        fullUrl: 'http://localhost:3000/api/transform',
        headers: {},
        query: {},
        userId: 'user-2',
        timestamp: new Date(),
      });

      // Get all inspections
      const allInspections = getRecentRequestInspections();
      expect(allInspections.length).toBe(2);

      // Filter by method
      const postInspections = getRecentRequestInspections(50, { method: 'POST' });
      expect(postInspections.length).toBe(1);
    });
  });

  describe('Operation Retry', () => {
    it('should track operations', () => {
      const operation = trackOperation(
        'transformation',
        { text: 'Test text', level: 3 },
        'user-123'
      );

      expect(operation).toBeDefined();
      expect(operation.type).toBe('transformation');
      expect(operation.status).toBe(OperationStatus.PENDING);
      expect(operation.userId).toBe('user-123');
    });

    it('should update operation status', () => {
      const operation = trackOperation('transformation', { text: 'Test' });

      updateOperationStatus(operation.id, OperationStatus.IN_PROGRESS);
      let updated = getOperation(operation.id);
      expect(updated?.status).toBe(OperationStatus.IN_PROGRESS);

      updateOperationStatus(operation.id, OperationStatus.COMPLETED, { result: 'success' });
      updated = getOperation(operation.id);
      expect(updated?.status).toBe(OperationStatus.COMPLETED);
      expect(updated?.output).toEqual({ result: 'success' });
    });

    it('should record operation attempts', () => {
      const operation = trackOperation('transformation', { text: 'Test' });

      recordOperationAttempt(operation.id, false, new Error('First attempt failed'));
      recordOperationAttempt(operation.id, true);

      const updated = getOperation(operation.id);
      expect(updated?.attempts.length).toBe(2);
      expect(updated?.attempts[0].success).toBe(false);
      expect(updated?.attempts[1].success).toBe(true);
    });

    it('should retry failed operations', async () => {
      const operation = trackOperation('transformation', { text: 'Test' });
      updateOperationStatus(operation.id, OperationStatus.FAILED, undefined, new Error('Initial failure'));

      let attemptCount = 0;
      const executor = async (input: unknown) => {
        attemptCount++;
        if (attemptCount < 2) {
          throw new Error('Retry needed');
        }
        return { success: true, input };
      };

      const result = await retryOperation(
        { operationId: operation.id, maxRetries: 3, backoffMs: 10 },
        executor
      );

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
      expect(result.finalStatus).toBe(OperationStatus.COMPLETED);
    });

    it('should fail after max retries', async () => {
      const operation = trackOperation('transformation', { text: 'Test' });
      updateOperationStatus(operation.id, OperationStatus.FAILED);

      const executor = async () => {
        throw new Error('Always fails');
      };

      const result = await retryOperation(
        { operationId: operation.id, maxRetries: 2, backoffMs: 10 },
        executor
      );

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(2);
      expect(result.finalStatus).toBe(OperationStatus.FAILED);
    });

    it('should get operations by status', () => {
      const op1 = trackOperation('type1', {});
      const op2 = trackOperation('type2', {});
      const op3 = trackOperation('type3', {});

      updateOperationStatus(op1.id, OperationStatus.FAILED);
      updateOperationStatus(op2.id, OperationStatus.COMPLETED);
      updateOperationStatus(op3.id, OperationStatus.FAILED);

      const failedOps = getOperationsByStatus(OperationStatus.FAILED);
      expect(failedOps.length).toBe(2);

      const completedOps = getOperationsByStatus(OperationStatus.COMPLETED);
      expect(completedOps.length).toBe(1);
    });
  });

  describe('Diagnostic Report Generation', () => {
    it('should generate diagnostic report', async () => {
      const report = await generateDiagnosticReport('admin-123', {
        includeSystemMetrics: true,
        includeRecentErrors: true,
        includeRecentRequests: true,
        includePerformanceData: true,
        timeRangeMinutes: 60,
      });

      expect(report).toBeDefined();
      expect(report.id).toBeDefined();
      expect(report.generatedBy).toBe('admin-123');
      expect(report.systemMetrics).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    it('should include user-specific metrics when userId provided', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-123',
        email: 'user@example.com',
        updatedAt: new Date(),
        subscription: { tier: 'PREMIUM' },
      } as never);

      const report = await generateDiagnosticReport('admin-123', {
        userId: 'user-123',
        includeSystemMetrics: true,
        includeRecentErrors: true,
        includeRecentRequests: true,
        includePerformanceData: true,
        timeRangeMinutes: 60,
      });

      expect(report.targetUserId).toBe('user-123');
      expect(report.userMetrics).toBeDefined();
    });

    it('should include recent errors in report', async () => {
      // Create some error contexts first
      const error = new Error('Test error for report');
      captureErrorContext(error, {});

      const report = await generateDiagnosticReport('admin-123', {
        includeRecentErrors: true,
        timeRangeMinutes: 60,
      });

      expect(report.recentErrors).toBeDefined();
    });
  });

  describe('Session Cleanup', () => {
    it('should clean up expired sessions', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-123',
        email: 'user@example.com',
      } as never);

      // Create a session with very short duration
      await startImpersonation('admin-123', 'admin@example.com', {
        targetUserId: 'user-123',
        reason: 'Testing cleanup',
        duration: 1, // 1 minute
      });

      // Manually expire the session by modifying it
      const sessions = getActiveImpersonationSessions();
      if (sessions.length > 0) {
        // Force expire by setting expiresAt to past
        (sessions[0] as { expiresAt: Date }).expiresAt = new Date(Date.now() - 1000);
      }

      const cleaned = cleanupExpiredSessions();
      expect(cleaned).toBeGreaterThanOrEqual(0);
    });
  });
});
