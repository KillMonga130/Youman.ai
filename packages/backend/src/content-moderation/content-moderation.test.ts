/**
 * Content Moderation Service Tests
 * Tests for content scanning, flagging, review workflow, policy enforcement, and abuse detection
 * Requirements: 97 - Content moderation features
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContentModerationService, ContentModerationError } from './content-moderation.service';
import type {
  ScanContentInput,
  FlagContentInput,
  ReviewContentInput,
  SubmitAppealInput,
  CreatePolicyInput,
  ReportAbuseInput,
} from './types';

// Mock Prisma
vi.mock('../database/prisma', () => ({
  prisma: {
    contentScanResult: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
    },
    contentFlag: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    moderationPolicy: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    appeal: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    abuseReport: {
      create: vi.fn(),
    },
    moderationAuditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    userWarning: {
      create: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
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

import { prisma } from '../database/prisma';

describe('ContentModerationService', () => {
  let service: ContentModerationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ContentModerationService();
  });

  describe('scanContent', () => {
    it('should scan content and return approved status for clean content', async () => {
      const input: ScanContentInput = {
        content: 'This is a normal piece of content without any issues.',
        contentType: 'TEXT',
      };

      vi.mocked(prisma.moderationPolicy.findMany).mockResolvedValue([]);
      vi.mocked(prisma.contentScanResult.create).mockResolvedValue({
        id: 'scan-1',
        contentId: 'content-123',
        userId: 'user-1',
        status: 'APPROVED',
        riskScore: 0,
        contentType: 'TEXT',
        processingTimeMs: 50,
        violations: [],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.moderationAuditLog.create).mockResolvedValue({
        id: 'audit-1',
        action: 'CONTENT_SCANNED',
        actorId: 'user-1',
        targetUserId: null,
        contentId: 'content-123',
        flagId: null,
        appealId: null,
        policyId: null,
        details: {},
        ipAddress: null,
        createdAt: new Date(),
      });

      const result = await service.scanContent('user-1', input);

      expect(result.status).toBe('APPROVED');
      expect(result.riskScore).toBe(0);
      expect(result.flags).toHaveLength(0);
      expect(result.policyViolations).toHaveLength(0);
    });

    it('should detect spam patterns in content', async () => {
      const input: ScanContentInput = {
        content: 'Buy now! Click here for a limited offer! Act now! Free money!',
        contentType: 'TEXT',
      };

      vi.mocked(prisma.moderationPolicy.findMany).mockResolvedValue([]);
      vi.mocked(prisma.contentFlag.create).mockResolvedValue({
        id: 'flag-1',
        contentId: 'content-123',
        flagType: 'SPAM',
        severity: 'MEDIUM',
        reason: 'Detected spam pattern',
        evidence: 'buy now, click here, limited offer',
        reportedBy: null,
        status: 'FLAGGED',
        assignedTo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        reviewedBy: null,
        reviewedAt: null,
        reviewNotes: null,
      });
      vi.mocked(prisma.contentScanResult.create).mockResolvedValue({
        id: 'scan-1',
        contentId: 'content-123',
        userId: 'user-1',
        status: 'FLAGGED',
        riskScore: 30,
        contentType: 'TEXT',
        processingTimeMs: 50,
        violations: [],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.moderationAuditLog.create).mockResolvedValue({
        id: 'audit-1',
        action: 'CONTENT_SCANNED',
        actorId: 'user-1',
        targetUserId: null,
        contentId: 'content-123',
        flagId: null,
        appealId: null,
        policyId: null,
        details: {},
        ipAddress: null,
        createdAt: new Date(),
      });

      const result = await service.scanContent('user-1', input);

      expect(result.flags.length).toBeGreaterThan(0);
      expect(result.riskScore).toBeGreaterThan(0);
    });

    it('should detect personal information patterns', async () => {
      const input: ScanContentInput = {
        content: 'My SSN is 123-45-6789 and my credit card is 1234567890123456',
        contentType: 'TEXT',
      };

      vi.mocked(prisma.moderationPolicy.findMany).mockResolvedValue([]);
      vi.mocked(prisma.contentFlag.create).mockResolvedValue({
        id: 'flag-1',
        contentId: 'content-123',
        flagType: 'PERSONAL_INFO',
        severity: 'CRITICAL',
        reason: 'Detected personal info pattern',
        evidence: '123-45-6789',
        reportedBy: null,
        status: 'FLAGGED',
        assignedTo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        reviewedBy: null,
        reviewedAt: null,
        reviewNotes: null,
      });
      vi.mocked(prisma.contentScanResult.create).mockResolvedValue({
        id: 'scan-1',
        contentId: 'content-123',
        userId: 'user-1',
        status: 'FLAGGED',
        riskScore: 100,
        contentType: 'TEXT',
        processingTimeMs: 50,
        violations: [],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.moderationAuditLog.create).mockResolvedValue({
        id: 'audit-1',
        action: 'CONTENT_SCANNED',
        actorId: 'user-1',
        targetUserId: null,
        contentId: 'content-123',
        flagId: null,
        appealId: null,
        policyId: null,
        details: {},
        ipAddress: null,
        createdAt: new Date(),
      });

      const result = await service.scanContent('user-1', input);

      expect(result.flags.length).toBeGreaterThan(0);
      expect(result.riskScore).toBeGreaterThan(0);
    });
  });

  describe('flagContent', () => {
    it('should create a content flag', async () => {
      const input: FlagContentInput = {
        contentId: 'content-123',
        flagType: 'SPAM',
        severity: 'MEDIUM',
        reason: 'This content appears to be spam',
      };

      vi.mocked(prisma.contentFlag.create).mockResolvedValue({
        id: 'flag-1',
        contentId: 'content-123',
        flagType: 'SPAM',
        severity: 'MEDIUM',
        reason: 'This content appears to be spam',
        evidence: null,
        reportedBy: 'user-1',
        status: 'FLAGGED',
        assignedTo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        reviewedBy: null,
        reviewedAt: null,
        reviewNotes: null,
      });
      vi.mocked(prisma.moderationAuditLog.create).mockResolvedValue({
        id: 'audit-1',
        action: 'CONTENT_FLAGGED',
        actorId: 'user-1',
        targetUserId: null,
        contentId: 'content-123',
        flagId: 'flag-1',
        appealId: null,
        policyId: null,
        details: {},
        ipAddress: null,
        createdAt: new Date(),
      });

      const result = await service.flagContent('user-1', input);

      expect(result.id).toBe('flag-1');
      expect(result.flagType).toBe('SPAM');
      expect(result.severity).toBe('MEDIUM');
      expect(result.status).toBe('FLAGGED');
    });
  });

  describe('reviewContent', () => {
    it('should approve flagged content', async () => {
      const input: ReviewContentInput = {
        flagId: 'flag-1',
        decision: 'APPROVE',
        notes: 'Content is acceptable',
      };

      vi.mocked(prisma.contentFlag.findUnique).mockResolvedValue({
        id: 'flag-1',
        contentId: 'content-123',
        flagType: 'SPAM',
        severity: 'MEDIUM',
        reason: 'Suspected spam',
        evidence: null,
        reportedBy: 'user-2',
        status: 'FLAGGED',
        assignedTo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        reviewedBy: null,
        reviewedAt: null,
        reviewNotes: null,
      });
      vi.mocked(prisma.contentFlag.update).mockResolvedValue({
        id: 'flag-1',
        contentId: 'content-123',
        flagType: 'SPAM',
        severity: 'MEDIUM',
        reason: 'Suspected spam',
        evidence: null,
        reportedBy: 'user-2',
        status: 'APPROVED',
        assignedTo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        reviewedBy: 'reviewer-1',
        reviewedAt: new Date(),
        reviewNotes: 'Content is acceptable',
      });
      vi.mocked(prisma.moderationAuditLog.create).mockResolvedValue({
        id: 'audit-1',
        action: 'REVIEW_COMPLETED',
        actorId: 'reviewer-1',
        targetUserId: null,
        contentId: 'content-123',
        flagId: 'flag-1',
        appealId: null,
        policyId: null,
        details: {},
        ipAddress: null,
        createdAt: new Date(),
      });

      const result = await service.reviewContent('reviewer-1', input);

      expect(result.status).toBe('APPROVED');
      expect(result.reviewedBy).toBe('reviewer-1');
    });

    it('should reject flagged content', async () => {
      const input: ReviewContentInput = {
        flagId: 'flag-1',
        decision: 'REJECT',
        notes: 'Content violates policy',
      };

      vi.mocked(prisma.contentFlag.findUnique).mockResolvedValue({
        id: 'flag-1',
        contentId: 'content-123',
        flagType: 'HATE_SPEECH',
        severity: 'HIGH',
        reason: 'Hate speech detected',
        evidence: null,
        reportedBy: 'user-2',
        status: 'FLAGGED',
        assignedTo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        reviewedBy: null,
        reviewedAt: null,
        reviewNotes: null,
      });
      vi.mocked(prisma.contentFlag.update).mockResolvedValue({
        id: 'flag-1',
        contentId: 'content-123',
        flagType: 'HATE_SPEECH',
        severity: 'HIGH',
        reason: 'Hate speech detected',
        evidence: null,
        reportedBy: 'user-2',
        status: 'REJECTED',
        assignedTo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        reviewedBy: 'reviewer-1',
        reviewedAt: new Date(),
        reviewNotes: 'Content violates policy',
      });
      vi.mocked(prisma.moderationAuditLog.create).mockResolvedValue({
        id: 'audit-1',
        action: 'REVIEW_COMPLETED',
        actorId: 'reviewer-1',
        targetUserId: null,
        contentId: 'content-123',
        flagId: 'flag-1',
        appealId: null,
        policyId: null,
        details: {},
        ipAddress: null,
        createdAt: new Date(),
      });

      const result = await service.reviewContent('reviewer-1', input);

      expect(result.status).toBe('REJECTED');
    });

    it('should throw error for non-existent flag', async () => {
      const input: ReviewContentInput = {
        flagId: 'non-existent',
        decision: 'APPROVE',
      };

      vi.mocked(prisma.contentFlag.findUnique).mockResolvedValue(null);

      await expect(service.reviewContent('reviewer-1', input)).rejects.toThrow(
        ContentModerationError
      );
    });
  });

  describe('submitAppeal', () => {
    it('should submit an appeal for flagged content', async () => {
      const input: SubmitAppealInput = {
        flagId: 'flag-1',
        reason: 'I believe this content was incorrectly flagged',
      };

      vi.mocked(prisma.contentFlag.findUnique).mockResolvedValue({
        id: 'flag-1',
        contentId: 'content-123',
        flagType: 'SPAM',
        severity: 'MEDIUM',
        reason: 'Suspected spam',
        evidence: null,
        reportedBy: 'user-2',
        status: 'FLAGGED',
        assignedTo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        reviewedBy: null,
        reviewedAt: null,
        reviewNotes: null,
      });
      vi.mocked(prisma.appeal.count).mockResolvedValue(0);
      vi.mocked(prisma.appeal.create).mockResolvedValue({
        id: 'appeal-1',
        flagId: 'flag-1',
        userId: 'user-1',
        reason: 'I believe this content was incorrectly flagged',
        additionalEvidence: null,
        status: 'PENDING',
        createdAt: new Date(),
        reviewedBy: null,
        reviewedAt: null,
        reviewNotes: null,
      });
      vi.mocked(prisma.contentFlag.update).mockResolvedValue({
        id: 'flag-1',
        contentId: 'content-123',
        flagType: 'SPAM',
        severity: 'MEDIUM',
        reason: 'Suspected spam',
        evidence: null,
        reportedBy: 'user-2',
        status: 'APPEALED',
        assignedTo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        reviewedBy: null,
        reviewedAt: null,
        reviewNotes: null,
      });
      vi.mocked(prisma.moderationAuditLog.create).mockResolvedValue({
        id: 'audit-1',
        action: 'APPEAL_SUBMITTED',
        actorId: 'user-1',
        targetUserId: null,
        contentId: null,
        flagId: 'flag-1',
        appealId: 'appeal-1',
        policyId: null,
        details: {},
        ipAddress: null,
        createdAt: new Date(),
      });

      const result = await service.submitAppeal('user-1', input);

      expect(result.id).toBe('appeal-1');
      expect(result.status).toBe('PENDING');
    });

    it('should throw error when flag not found', async () => {
      const input: SubmitAppealInput = {
        flagId: 'non-existent',
        reason: 'Appeal reason',
      };

      vi.mocked(prisma.contentFlag.findUnique).mockResolvedValue(null);

      await expect(service.submitAppeal('user-1', input)).rejects.toThrow(
        ContentModerationError
      );
    });
  });

  describe('createPolicy', () => {
    it('should create a moderation policy', async () => {
      const input: CreatePolicyInput = {
        name: 'Anti-Spam Policy',
        type: 'SPAM_PREVENTION',
        description: 'Policy to prevent spam content',
        rules: [
          {
            pattern: '\\b(buy now|click here)\\b',
            action: 'FLAG_FOR_REVIEW',
            severity: 'MEDIUM',
          },
        ],
        isActive: true,
      };

      vi.mocked(prisma.moderationPolicy.create).mockResolvedValue({
        id: 'policy-1',
        name: 'Anti-Spam Policy',
        type: 'SPAM_PREVENTION',
        description: 'Policy to prevent spam content',
        rules: input.rules,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin-1',
      });

      const result = await service.createPolicy('admin-1', input);

      expect(result.id).toBe('policy-1');
      expect(result.name).toBe('Anti-Spam Policy');
      expect(result.isActive).toBe(true);
    });
  });

  describe('detectAbuse', () => {
    it('should detect no abuse for normal user', async () => {
      vi.mocked(prisma.contentScanResult.count).mockResolvedValue(5);
      vi.mocked(prisma.contentFlag.count).mockResolvedValue(0);
      vi.mocked(prisma.contentScanResult.findMany).mockResolvedValue([]);

      const result = await service.detectAbuse('user-1');

      expect(result.detected).toBe(false);
      expect(result.patterns).toHaveLength(0);
      expect(result.riskScore).toBe(0);
    });

    it('should detect rate abuse', async () => {
      vi.mocked(prisma.contentScanResult.count).mockResolvedValue(150);
      vi.mocked(prisma.contentFlag.count).mockResolvedValue(0);
      vi.mocked(prisma.contentScanResult.findMany).mockResolvedValue([]);
      vi.mocked(prisma.moderationAuditLog.create).mockResolvedValue({
        id: 'audit-1',
        action: 'ABUSE_DETECTED',
        actorId: null,
        targetUserId: 'user-1',
        contentId: null,
        flagId: null,
        appealId: null,
        policyId: null,
        details: {},
        ipAddress: null,
        createdAt: new Date(),
      });

      const result = await service.detectAbuse('user-1');

      expect(result.detected).toBe(true);
      expect(result.patterns.some(p => p.type === 'RATE_ABUSE')).toBe(true);
      expect(result.riskScore).toBeGreaterThan(0);
    });
  });

  describe('reportAbuse', () => {
    it('should create an abuse report', async () => {
      const input: ReportAbuseInput = {
        targetUserId: 'user-2',
        patternType: 'BOT_ACTIVITY',
        description: 'This user appears to be a bot based on activity patterns',
      };

      vi.mocked(prisma.abuseReport.create).mockResolvedValue({
        id: 'report-1',
        reporterId: 'user-1',
        targetUserId: 'user-2',
        patternType: 'BOT_ACTIVITY',
        description: 'This user appears to be a bot based on activity patterns',
        evidence: [],
        status: 'PENDING',
        createdAt: new Date(),
        investigatedBy: null,
        investigatedAt: null,
        actionTaken: null,
      });

      const result = await service.reportAbuse('user-1', input);

      expect(result.id).toBe('report-1');
      expect(result.patternType).toBe('BOT_ACTIVITY');
      expect(result.status).toBe('PENDING');
    });
  });

  describe('getModerationStats', () => {
    it('should return moderation statistics', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      vi.mocked(prisma.contentScanResult.count).mockResolvedValue(1000);
      vi.mocked(prisma.contentFlag.count)
        .mockResolvedValueOnce(100) // totalFlagged
        .mockResolvedValueOnce(80) // totalApproved
        .mockResolvedValueOnce(15) // totalRejected
        .mockResolvedValueOnce(5); // pendingReview
      vi.mocked(prisma.appeal.count).mockResolvedValue(2);
      vi.mocked(prisma.contentFlag.groupBy)
        .mockResolvedValueOnce([
          { flagType: 'SPAM', _count: 50 },
          { flagType: 'HATE_SPEECH', _count: 20 },
        ] as never)
        .mockResolvedValueOnce([
          { severity: 'LOW', _count: 30 },
          { severity: 'MEDIUM', _count: 50 },
          { severity: 'HIGH', _count: 20 },
        ] as never);
      vi.mocked(prisma.contentFlag.findMany).mockResolvedValue([
        {
          id: 'flag-1',
          createdAt: new Date('2024-01-15T10:00:00Z'),
          reviewedAt: new Date('2024-01-15T10:30:00Z'),
        },
      ] as never);

      const result = await service.getModerationStats(startDate, endDate);

      expect(result.totalScanned).toBe(1000);
      expect(result.totalFlagged).toBe(100);
      expect(result.pendingAppeals).toBe(2);
    });
  });
});
