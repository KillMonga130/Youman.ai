/**
 * Content Expiration Service Tests
 * Tests for content expiration, reminders, and automatic deletion
 * Requirements: 75 - Content expiration with automatic deletion
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ExpirationService, ExpirationError } from './expiration.service';
import { prisma } from '../database/prisma';
import * as emailService from '../collaboration/email.service';

// Mock dependencies
vi.mock('../database/prisma', () => ({
  prisma: {
    project: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock('../collaboration/email.service', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('ExpirationService', () => {
  let service: ExpirationService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
  };

  const mockProject = {
    id: 'project-123',
    name: 'Test Project',
    description: 'Test description',
    ownerId: mockUser.id,
    expiresAt: null,
    wordCount: 1000,
    status: 'ACTIVE' as const,
    deletedAt: null,
    documentId: null,
    settings: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    owner: {
      email: mockUser.email,
      firstName: mockUser.firstName,
      lastName: mockUser.lastName,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ExpirationService({
      enableAutoDeletion: true,
      enableReminders: true,
      minExpirationDays: 1,
      maxExpirationDays: 365,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('setExpiration', () => {
    it('should set expiration date for a project', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject);
      vi.mocked(prisma.project.update).mockResolvedValue({
        ...mockProject,
        expiresAt: futureDate,
      });

      const result = await service.setExpiration({
        projectId: mockProject.id,
        userId: mockUser.id,
        expirationDate: futureDate,
      });

      expect(result.hasExpiration).toBe(true);
      expect(result.expirationDate).toEqual(futureDate);
      expect(result.projectId).toBe(mockProject.id);
      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: mockProject.id },
        data: { expiresAt: futureDate },
        include: {
          owner: {
            select: { email: true, firstName: true, lastName: true },
          },
        },
      });
    });

    it('should reject expiration date too soon', async () => {
      const tooSoonDate = new Date();
      tooSoonDate.setHours(tooSoonDate.getHours() + 1); // Only 1 hour in future

      vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject);

      await expect(
        service.setExpiration({
          projectId: mockProject.id,
          userId: mockUser.id,
          expirationDate: tooSoonDate,
        })
      ).rejects.toThrow(ExpirationError);
    });

    it('should reject expiration date too far in future', async () => {
      const tooFarDate = new Date();
      tooFarDate.setDate(tooFarDate.getDate() + 400); // 400 days

      vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject);

      await expect(
        service.setExpiration({
          projectId: mockProject.id,
          userId: mockUser.id,
          expirationDate: tooFarDate,
        })
      ).rejects.toThrow(ExpirationError);
    });

    it('should reject if user is not project owner', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject);

      await expect(
        service.setExpiration({
          projectId: mockProject.id,
          userId: 'different-user',
          expirationDate: futureDate,
        })
      ).rejects.toThrow(ExpirationError);
    });

    it('should reject if project not found', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      vi.mocked(prisma.project.findUnique).mockResolvedValue(null);

      await expect(
        service.setExpiration({
          projectId: 'non-existent',
          userId: mockUser.id,
          expirationDate: futureDate,
        })
      ).rejects.toThrow(ExpirationError);
    });

    it('should send notification when expiration is set', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject);
      vi.mocked(prisma.project.update).mockResolvedValue({
        ...mockProject,
        expiresAt: futureDate,
      });

      await service.setExpiration({
        projectId: mockProject.id,
        userId: mockUser.id,
        expirationDate: futureDate,
        sendNotification: true,
      });

      expect(emailService.sendEmail).toHaveBeenCalled();
    });
  });

  describe('extendExpiration', () => {
    it('should extend expiration date', async () => {
      const currentExpiration = new Date();
      currentExpiration.setDate(currentExpiration.getDate() + 10);

      const newExpiration = new Date();
      newExpiration.setDate(newExpiration.getDate() + 60);

      const projectWithExpiration = {
        ...mockProject,
        expiresAt: currentExpiration,
      };

      vi.mocked(prisma.project.findUnique).mockResolvedValue(projectWithExpiration);
      vi.mocked(prisma.project.update).mockResolvedValue({
        ...projectWithExpiration,
        expiresAt: newExpiration,
      });

      const result = await service.extendExpiration({
        projectId: mockProject.id,
        userId: mockUser.id,
        newExpirationDate: newExpiration,
      });

      expect(result.expirationDate).toEqual(newExpiration);
    });

    it('should reject if project has no expiration set', async () => {
      const newExpiration = new Date();
      newExpiration.setDate(newExpiration.getDate() + 60);

      vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject);

      await expect(
        service.extendExpiration({
          projectId: mockProject.id,
          userId: mockUser.id,
          newExpirationDate: newExpiration,
        })
      ).rejects.toThrow('Project does not have an expiration date set');
    });

    it('should reject if new date is before current expiration', async () => {
      const currentExpiration = new Date();
      currentExpiration.setDate(currentExpiration.getDate() + 30);

      const earlierDate = new Date();
      earlierDate.setDate(earlierDate.getDate() + 10);

      const projectWithExpiration = {
        ...mockProject,
        expiresAt: currentExpiration,
      };

      vi.mocked(prisma.project.findUnique).mockResolvedValue(projectWithExpiration);

      await expect(
        service.extendExpiration({
          projectId: mockProject.id,
          userId: mockUser.id,
          newExpirationDate: earlierDate,
        })
      ).rejects.toThrow('New expiration date must be after current expiration date');
    });
  });

  describe('removeExpiration', () => {
    it('should remove expiration from project', async () => {
      const projectWithExpiration = {
        ...mockProject,
        expiresAt: new Date(),
      };

      vi.mocked(prisma.project.findUnique).mockResolvedValue(projectWithExpiration);
      vi.mocked(prisma.project.update).mockResolvedValue({
        ...mockProject,
        expiresAt: null,
      });

      const result = await service.removeExpiration({
        projectId: mockProject.id,
        userId: mockUser.id,
      });

      expect(result.hasExpiration).toBe(false);
      expect(result.expirationDate).toBeNull();
    });
  });

  describe('getExpirationInfo', () => {
    it('should return expiration info for project with expiration', async () => {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 30);

      const projectWithExpiration = {
        ...mockProject,
        expiresAt: expirationDate,
      };

      vi.mocked(prisma.project.findUnique).mockResolvedValue(projectWithExpiration);

      const result = await service.getExpirationInfo(mockProject.id, mockUser.id);

      expect(result.hasExpiration).toBe(true);
      expect(result.expirationDate).toEqual(expirationDate);
      expect(result.daysRemaining).toBeGreaterThan(0);
      expect(result.status).toBe('active');
    });

    it('should return no_expiration status for project without expiration', async () => {
      vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject);

      const result = await service.getExpirationInfo(mockProject.id, mockUser.id);

      expect(result.hasExpiration).toBe(false);
      expect(result.status).toBe('no_expiration');
    });

    it('should return expiring_soon status for project expiring within 7 days', async () => {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 3);

      const projectWithExpiration = {
        ...mockProject,
        expiresAt: expirationDate,
      };

      vi.mocked(prisma.project.findUnique).mockResolvedValue(projectWithExpiration);

      const result = await service.getExpirationInfo(mockProject.id, mockUser.id);

      expect(result.status).toBe('expiring_soon');
    });
  });

  describe('deleteExpiredContent', () => {
    it('should delete expired projects', async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1);

      const expiredProject = {
        ...mockProject,
        expiresAt: expiredDate,
      };

      vi.mocked(prisma.project.findMany).mockResolvedValue([expiredProject]);
      vi.mocked(prisma.project.update).mockResolvedValue({
        ...expiredProject,
        deletedAt: new Date(),
        status: 'DELETED' as const,
      });

      const report = await service.deleteExpiredContent();

      expect(report.deletedCount).toBe(1);
      expect(report.deletedProjects).toHaveLength(1);
      expect(report.deletedProjects[0].projectId).toBe(mockProject.id);
    });

    it('should skip already deleted projects', async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1);

      const alreadyDeletedProject = {
        ...mockProject,
        expiresAt: expiredDate,
        deletedAt: new Date(),
        status: 'DELETED' as const,
      };

      vi.mocked(prisma.project.findMany).mockResolvedValue([alreadyDeletedProject]);

      const report = await service.deleteExpiredContent();

      expect(report.skippedCount).toBe(1);
      expect(report.deletedCount).toBe(0);
    });

    it('should handle deletion failures gracefully', async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1);

      const expiredProject = {
        ...mockProject,
        expiresAt: expiredDate,
      };

      vi.mocked(prisma.project.findMany).mockResolvedValue([expiredProject]);
      vi.mocked(prisma.project.update).mockRejectedValue(new Error('Database error'));

      const report = await service.deleteExpiredContent();

      expect(report.failedCount).toBe(1);
      expect(report.failedProjects).toHaveLength(1);
      expect(report.failedProjects[0].error).toBe('Database error');
    });

    it('should not delete when auto-deletion is disabled', async () => {
      const disabledService = new ExpirationService({
        enableAutoDeletion: false,
      });

      const report = await disabledService.deleteExpiredContent();

      expect(report.totalProcessed).toBe(0);
      expect(prisma.project.findMany).not.toHaveBeenCalled();
    });
  });

  describe('sendExpirationReminders', () => {
    it('should send reminders for projects expiring in 7, 3, and 1 days', async () => {
      const in7Days = new Date();
      in7Days.setDate(in7Days.getDate() + 7);
      in7Days.setHours(12, 0, 0, 0);

      const projectExpiring = {
        ...mockProject,
        expiresAt: in7Days,
      };

      // Mock for each reminder day check
      vi.mocked(prisma.project.findMany).mockResolvedValue([projectExpiring]);

      const result = await service.sendExpirationReminders();

      expect(result.totalReminders).toBeGreaterThan(0);
      expect(emailService.sendEmail).toHaveBeenCalled();
    });

    it('should not send reminders when disabled', async () => {
      const disabledService = new ExpirationService({
        enableReminders: false,
      });

      const result = await disabledService.sendExpirationReminders();

      expect(result.totalReminders).toBe(0);
      expect(emailService.sendEmail).not.toHaveBeenCalled();
    });
  });

  describe('getExpiringProjects', () => {
    it('should return all expiring projects for a user', async () => {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 10);

      const projectsWithExpiration = [
        { ...mockProject, expiresAt: expirationDate },
        { ...mockProject, id: 'project-456', name: 'Another Project', expiresAt: expirationDate },
      ];

      vi.mocked(prisma.project.findMany).mockResolvedValue(projectsWithExpiration);

      const result = await service.getExpiringProjects(mockUser.id);

      expect(result).toHaveLength(2);
      expect(result[0].projectId).toBe(mockProject.id);
    });

    it('should return empty array when no expiring projects', async () => {
      vi.mocked(prisma.project.findMany).mockResolvedValue([]);

      const result = await service.getExpiringProjects(mockUser.id);

      expect(result).toHaveLength(0);
    });
  });
});
