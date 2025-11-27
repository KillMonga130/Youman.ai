/**
 * Data Retention Service Tests
 * Tests for retention policy management, archival, and deletion
 * Requirements: 63 - Data lifecycle and retention policies
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RetentionService, RetentionError } from './retention.service';

// Mock Prisma
vi.mock('../database/prisma', () => ({
  prisma: {
    retentionPolicy: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    archivedProject: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    retentionAuditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock email service
vi.mock('../collaboration/email.service', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));


import { prisma } from '../database/prisma';

describe('RetentionService', () => {
  let service: RetentionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RetentionService();
  });

  describe('configurePolicy', () => {
    it('should create a new retention policy', async () => {
      const userId = 'user-123';
      const input = {
        defaultRetentionDays: 180,
        archiveBeforeDelete: true,
        notificationDays: [30, 7, 1],
        autoDeleteEnabled: true,
        exemptProjectIds: [],
      };

      const mockPolicy = {
        id: 'policy-123',
        userId,
        ...input,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.retentionPolicy.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.retentionPolicy.create).mockResolvedValue(mockPolicy);
      vi.mocked(prisma.retentionAuditLog.create).mockResolvedValue({
        id: 'log-123',
        userId,
        action: 'POLICY_CREATED',
        projectId: null,
        projectName: null,
        archiveId: null,
        details: { policy: input },
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(),
      });

      const result = await service.configurePolicy(userId, input);

      expect(result.userId).toBe(userId);
      expect(result.defaultRetentionDays).toBe(180);
      expect(result.autoDeleteEnabled).toBe(true);
      expect(prisma.retentionPolicy.create).toHaveBeenCalled();
    });

    it('should update an existing retention policy', async () => {
      const userId = 'user-123';
      const existingPolicy = {
        id: 'policy-123',
        userId,
        defaultRetentionDays: 365,
        archiveBeforeDelete: true,
        notificationDays: [30, 7, 1],
        autoDeleteEnabled: false,
        exemptProjectIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const input = {
        defaultRetentionDays: 90,
        archiveBeforeDelete: false,
        notificationDays: [14, 7],
        autoDeleteEnabled: true,
        exemptProjectIds: ['project-1'],
      };

      const updatedPolicy = {
        ...existingPolicy,
        ...input,
        updatedAt: new Date(),
      };

      vi.mocked(prisma.retentionPolicy.findUnique).mockResolvedValue(existingPolicy);
      vi.mocked(prisma.retentionPolicy.update).mockResolvedValue(updatedPolicy);
      vi.mocked(prisma.retentionAuditLog.create).mockResolvedValue({
        id: 'log-123',
        userId,
        action: 'POLICY_UPDATED',
        projectId: null,
        projectName: null,
        archiveId: null,
        details: { policy: input },
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(),
      });

      const result = await service.configurePolicy(userId, input);

      expect(result.defaultRetentionDays).toBe(90);
      expect(result.autoDeleteEnabled).toBe(true);
      expect(prisma.retentionPolicy.update).toHaveBeenCalled();
    });
  });

  describe('getPolicy', () => {
    it('should return null when no policy exists', async () => {
      vi.mocked(prisma.retentionPolicy.findUnique).mockResolvedValue(null);

      const result = await service.getPolicy('user-123');

      expect(result).toBeNull();
    });

    it('should return the policy when it exists', async () => {
      const mockPolicy = {
        id: 'policy-123',
        userId: 'user-123',
        defaultRetentionDays: 365,
        archiveBeforeDelete: true,
        notificationDays: [30, 7, 1],
        autoDeleteEnabled: true,
        exemptProjectIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.retentionPolicy.findUnique).mockResolvedValue(mockPolicy);

      const result = await service.getPolicy('user-123');

      expect(result).not.toBeNull();
      expect(result?.defaultRetentionDays).toBe(365);
    });
  });


  describe('archiveProject', () => {
    it('should archive a project successfully', async () => {
      const userId = 'user-123';
      const projectId = 'project-123';

      const mockProject = {
        id: projectId,
        ownerId: userId,
        name: 'Test Project',
        description: 'A test project',
        wordCount: 1000,
        status: 'ACTIVE' as const,
        documentId: 'doc-123',
        settings: { level: 3 },
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const mockArchive = {
        id: 'archive-123',
        originalId: projectId,
        userId,
        name: mockProject.name,
        description: mockProject.description,
        wordCount: mockProject.wordCount,
        documentData: mockProject.settings,
        metadata: {},
        archivedAt: new Date(),
        retentionDays: 365,
        scheduledDeleteAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        deletedAt: null,
      };

      vi.mocked(prisma.retentionPolicy.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject);
      vi.mocked(prisma.archivedProject.create).mockResolvedValue(mockArchive);
      vi.mocked(prisma.project.update).mockResolvedValue({
        ...mockProject,
        deletedAt: new Date(),
        status: 'DELETED',
      });
      vi.mocked(prisma.retentionAuditLog.create).mockResolvedValue({
        id: 'log-123',
        userId,
        action: 'PROJECT_ARCHIVED',
        projectId,
        projectName: mockProject.name,
        archiveId: mockArchive.id,
        details: {},
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(),
      });

      const result = await service.archiveProject(projectId, userId);

      expect(result.originalId).toBe(projectId);
      expect(result.name).toBe('Test Project');
      expect(prisma.archivedProject.create).toHaveBeenCalled();
      expect(prisma.project.update).toHaveBeenCalled();
    });

    it('should throw error when project not found', async () => {
      vi.mocked(prisma.retentionPolicy.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.project.findUnique).mockResolvedValue(null);

      await expect(service.archiveProject('invalid-id', 'user-123'))
        .rejects.toThrow(RetentionError);
    });

    it('should throw error when user is not owner', async () => {
      const mockProject = {
        id: 'project-123',
        ownerId: 'other-user',
        name: 'Test Project',
        description: null,
        wordCount: 1000,
        status: 'ACTIVE' as const,
        documentId: null,
        settings: null,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      vi.mocked(prisma.retentionPolicy.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject);

      await expect(service.archiveProject('project-123', 'user-123'))
        .rejects.toThrow('Access denied');
    });
  });

  describe('getArchivedProjects', () => {
    it('should return archived projects for a user', async () => {
      const userId = 'user-123';
      const mockArchives = [
        {
          id: 'archive-1',
          originalId: 'project-1',
          userId,
          name: 'Project 1',
          description: null,
          wordCount: 500,
          documentData: null,
          metadata: null,
          archivedAt: new Date(),
          retentionDays: 365,
          scheduledDeleteAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          deletedAt: null,
        },
        {
          id: 'archive-2',
          originalId: 'project-2',
          userId,
          name: 'Project 2',
          description: 'Description',
          wordCount: 1000,
          documentData: null,
          metadata: null,
          archivedAt: new Date(),
          retentionDays: 180,
          scheduledDeleteAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
          deletedAt: null,
        },
      ];

      vi.mocked(prisma.archivedProject.findMany).mockResolvedValue(mockArchives);

      const result = await service.getArchivedProjects(userId);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Project 1');
      expect(result[1].name).toBe('Project 2');
    });
  });


  describe('restoreArchivedProject', () => {
    it('should restore an archived project', async () => {
      const userId = 'user-123';
      const archiveId = 'archive-123';
      const projectId = 'project-123';

      const mockArchive = {
        id: archiveId,
        originalId: projectId,
        userId,
        name: 'Test Project',
        description: null,
        wordCount: 1000,
        documentData: null,
        metadata: null,
        archivedAt: new Date(),
        retentionDays: 365,
        scheduledDeleteAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        deletedAt: null,
      };

      const mockProject = {
        id: projectId,
        ownerId: userId,
        name: 'Test Project',
        description: null,
        wordCount: 1000,
        status: 'ACTIVE' as const,
        documentId: null,
        settings: null,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      vi.mocked(prisma.archivedProject.findUnique).mockResolvedValue(mockArchive);
      vi.mocked(prisma.project.update).mockResolvedValue(mockProject);
      vi.mocked(prisma.archivedProject.delete).mockResolvedValue(mockArchive);
      vi.mocked(prisma.retentionAuditLog.create).mockResolvedValue({
        id: 'log-123',
        userId,
        action: 'ARCHIVE_DELETED',
        projectId,
        projectName: mockArchive.name,
        archiveId,
        details: { restored: true },
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(),
      });

      const result = await service.restoreArchivedProject(archiveId, userId);

      expect(result.projectId).toBe(projectId);
      expect(result.message).toBe('Project restored successfully');
    });

    it('should throw error when archive not found', async () => {
      vi.mocked(prisma.archivedProject.findUnique).mockResolvedValue(null);

      await expect(service.restoreArchivedProject('invalid-id', 'user-123'))
        .rejects.toThrow('Archive not found');
    });
  });

  describe('deleteExpiredProjects', () => {
    it('should return empty report when auto-delete is disabled', async () => {
      const serviceWithDisabledAutoDelete = new RetentionService({
        enableAutoDelete: false,
      });

      const result = await serviceWithDisabledAutoDelete.deleteExpiredProjects();

      expect(result.totalProcessed).toBe(0);
      expect(result.deletedCount).toBe(0);
      expect(result.archivedCount).toBe(0);
    });

    it('should process expired projects', async () => {
      vi.mocked(prisma.retentionPolicy.findMany).mockResolvedValue([]);
      vi.mocked(prisma.archivedProject.findMany).mockResolvedValue([]);

      const result = await service.deleteExpiredProjects();

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('totalProcessed');
    });
  });

  describe('getAuditLogs', () => {
    it('should return audit logs with pagination', async () => {
      const userId = 'user-123';
      const mockLogs = [
        {
          id: 'log-1',
          userId,
          action: 'POLICY_CREATED' as const,
          projectId: null,
          projectName: null,
          archiveId: null,
          details: {},
          ipAddress: '127.0.0.1',
          userAgent: 'Test Agent',
          createdAt: new Date(),
        },
        {
          id: 'log-2',
          userId,
          action: 'PROJECT_ARCHIVED' as const,
          projectId: 'project-123',
          projectName: 'Test Project',
          archiveId: 'archive-123',
          details: {},
          ipAddress: '127.0.0.1',
          userAgent: 'Test Agent',
          createdAt: new Date(),
        },
      ];

      vi.mocked(prisma.retentionAuditLog.findMany).mockResolvedValue(mockLogs);
      vi.mocked(prisma.retentionAuditLog.count).mockResolvedValue(2);

      const result = await service.getAuditLogs({ userId });

      expect(result.logs).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
    });

    it('should filter by action', async () => {
      vi.mocked(prisma.retentionAuditLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.retentionAuditLog.count).mockResolvedValue(0);

      await service.getAuditLogs({
        userId: 'user-123',
        action: 'PROJECT_DELETED',
      });

      expect(prisma.retentionAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: 'PROJECT_DELETED',
          }),
        })
      );
    });
  });

  describe('scheduleExpiration', () => {
    it('should schedule expiration for a project', async () => {
      const userId = 'user-123';
      const projectId = 'project-123';
      const expirationDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const mockProject = {
        id: projectId,
        ownerId: userId,
        name: 'Test Project',
        description: null,
        wordCount: 1000,
        status: 'ACTIVE' as const,
        documentId: null,
        settings: null,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject);
      vi.mocked(prisma.project.update).mockResolvedValue({
        ...mockProject,
        expiresAt: expirationDate,
      });
      vi.mocked(prisma.retentionAuditLog.create).mockResolvedValue({
        id: 'log-123',
        userId,
        action: 'POLICY_UPDATED',
        projectId,
        projectName: mockProject.name,
        archiveId: null,
        details: { expirationDate: expirationDate.toISOString() },
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(),
      });

      const result = await service.scheduleExpiration(projectId, userId, expirationDate);

      expect(result.projectId).toBe(projectId);
      expect(result.expirationDate).toEqual(expirationDate);
    });
  });
});
