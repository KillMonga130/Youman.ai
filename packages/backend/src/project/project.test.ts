/**
 * Project Service Tests
 * Tests for project CRUD operations
 * 
 * Requirements: 14 - User account and project management
 * Requirements: 15 - Web-based interface for document processing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createProject,
  getProject,
  listProjects,
  updateProject,
  deleteProject,
  getProjectMetadata,
  checkProjectAccess,
  ProjectError,
} from './project.service';
import {
  createProjectSchema,
  updateProjectSchema,
  listProjectsSchema,
  projectIdSchema,
} from './types';

// Mock Prisma
vi.mock('../database/prisma', () => ({
  prisma: {
    project: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

import { prisma } from '../database/prisma';

describe('Project Service', () => {
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockProjectId = '123e4567-e89b-12d3-a456-426614174001';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createProject', () => {
    it('should create a project with valid input', async () => {
      const mockProject = {
        id: mockProjectId,
        name: 'Test Project',
        description: 'A test project',
        status: 'ACTIVE' as const,
        wordCount: 0,
        documentId: null,
        settings: null,
        ownerId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: null,
        deletedAt: null,
      };

      vi.mocked(prisma.project.create).mockResolvedValue(mockProject);

      const result = await createProject(mockUserId, {
        name: 'Test Project',
        description: 'A test project',
      });

      expect(result.id).toEqual(mockProject.id);
      expect(result.name).toEqual(mockProject.name);
      expect(prisma.project.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Test Project',
          description: 'A test project',
          ownerId: mockUserId,
          status: 'ACTIVE',
          wordCount: 0,
        }),
      });
    });

    it('should create a project with settings', async () => {
      const mockProject = {
        id: mockProjectId,
        name: 'Test Project',
        description: null,
        status: 'ACTIVE' as const,
        wordCount: 0,
        documentId: null,
        settings: { defaultLevel: 3, defaultStrategy: 'professional' },
        ownerId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: null,
        deletedAt: null,
      };

      vi.mocked(prisma.project.create).mockResolvedValue(mockProject);

      const result = await createProject(mockUserId, {
        name: 'Test Project',
        settings: { defaultLevel: 3, defaultStrategy: 'professional' },
      });

      expect(result.settings).toEqual({ defaultLevel: 3, defaultStrategy: 'professional' });
    });
  });

  describe('getProject', () => {
    it('should return project for owner', async () => {
      const mockProject = {
        id: mockProjectId,
        name: 'Test Project',
        description: null,
        status: 'ACTIVE' as const,
        wordCount: 100,
        documentId: null,
        settings: null,
        ownerId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        expiresAt: null,
        collaborators: [],
      };

      vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject);

      const result = await getProject(mockProjectId, mockUserId);

      expect(result.id).toBe(mockProjectId);
      expect(result.name).toBe('Test Project');
    });

    it('should throw error for non-existent project', async () => {
      vi.mocked(prisma.project.findUnique).mockResolvedValue(null);

      await expect(getProject(mockProjectId, mockUserId)).rejects.toThrow(ProjectError);
      await expect(getProject(mockProjectId, mockUserId)).rejects.toThrow('Project not found');
    });

    it('should throw error for unauthorized access', async () => {
      const mockProject = {
        id: mockProjectId,
        name: 'Test Project',
        description: null,
        status: 'ACTIVE' as const,
        wordCount: 100,
        documentId: null,
        settings: null,
        ownerId: 'different-user-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        expiresAt: null,
        collaborators: [],
      };

      vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject);

      await expect(getProject(mockProjectId, mockUserId)).rejects.toThrow('Access denied');
    });
  });

  describe('listProjects', () => {
    it('should return paginated projects', async () => {
      const mockProjects = [
        {
          id: mockProjectId,
          name: 'Project 1',
          description: null,
          status: 'ACTIVE' as const,
          wordCount: 100,
          documentId: null,
          settings: null,
          ownerId: mockUserId,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          expiresAt: null,
        },
      ];

      vi.mocked(prisma.project.findMany).mockResolvedValue(mockProjects);
      vi.mocked(prisma.project.count).mockResolvedValue(1);

      const result = await listProjects(mockUserId, {
        page: 1,
        limit: 20,
        status: 'ACTIVE',
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      });

      expect(result.projects).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.hasMore).toBe(false);
    });

    it('should filter by search term', async () => {
      vi.mocked(prisma.project.findMany).mockResolvedValue([]);
      vi.mocked(prisma.project.count).mockResolvedValue(0);

      await listProjects(mockUserId, {
        page: 1,
        limit: 20,
        status: 'ACTIVE',
        search: 'test',
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      });

      expect(prisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: { contains: 'test', mode: 'insensitive' },
          }),
        })
      );
    });
  });

  describe('updateProject', () => {
    it('should update project for owner', async () => {
      const existingProject = {
        id: mockProjectId,
        name: 'Old Name',
        description: null,
        status: 'ACTIVE' as const,
        wordCount: 100,
        documentId: null,
        settings: null,
        ownerId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        expiresAt: null,
      };

      const updatedProject = {
        id: mockProjectId,
        name: 'New Name',
        description: 'New description',
        status: 'ACTIVE' as const,
        wordCount: 100,
        documentId: null,
        settings: null,
        ownerId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        expiresAt: null,
      };

      vi.mocked(prisma.project.findUnique).mockResolvedValue(existingProject);
      vi.mocked(prisma.project.update).mockResolvedValue(updatedProject);

      const result = await updateProject(mockProjectId, mockUserId, {
        name: 'New Name',
        description: 'New description',
      });

      expect(result.name).toBe('New Name');
      expect(result.description).toBe('New description');
    });

    it('should throw error for non-owner', async () => {
      const existingProject = {
        id: mockProjectId,
        name: 'Test Project',
        description: null,
        status: 'ACTIVE' as const,
        wordCount: 100,
        documentId: null,
        settings: null,
        ownerId: 'different-user-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        expiresAt: null,
      };

      vi.mocked(prisma.project.findUnique).mockResolvedValue(existingProject);

      await expect(
        updateProject(mockProjectId, mockUserId, { name: 'New Name' })
      ).rejects.toThrow('Only the project owner can update the project');
    });
  });

  describe('deleteProject', () => {
    it('should soft delete project for owner', async () => {
      const existingProject = {
        id: mockProjectId,
        name: 'Test Project',
        description: null,
        status: 'ACTIVE' as const,
        wordCount: 100,
        documentId: null,
        settings: null,
        ownerId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        expiresAt: null,
      };

      vi.mocked(prisma.project.findUnique).mockResolvedValue(existingProject);
      vi.mocked(prisma.project.update).mockResolvedValue({
        ...existingProject,
        deletedAt: new Date(),
        status: 'DELETED' as const,
      });

      const result = await deleteProject(mockProjectId, mockUserId);

      expect(result.message).toBe('Project deleted successfully');
      expect(result.projectId).toBe(mockProjectId);
      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: mockProjectId },
        data: {
          deletedAt: expect.any(Date),
          status: 'DELETED',
        },
      });
    });

    it('should throw error for already deleted project', async () => {
      const existingProject = {
        id: mockProjectId,
        name: 'Test Project',
        description: null,
        status: 'DELETED' as const,
        wordCount: 100,
        documentId: null,
        settings: null,
        ownerId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: new Date(),
        expiresAt: null,
      };

      vi.mocked(prisma.project.findUnique).mockResolvedValue(existingProject);

      await expect(deleteProject(mockProjectId, mockUserId)).rejects.toThrow(
        'Project already deleted'
      );
    });
  });

  describe('checkProjectAccess', () => {
    it('should return owner access', async () => {
      const mockProject = {
        id: mockProjectId,
        name: 'Test Project',
        description: null,
        status: 'ACTIVE' as const,
        wordCount: 100,
        documentId: null,
        settings: null,
        ownerId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        expiresAt: null,
        collaborators: [],
      };

      vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject);

      const result = await checkProjectAccess(mockProjectId, mockUserId);

      expect(result.hasAccess).toBe(true);
      expect(result.isOwner).toBe(true);
      expect(result.role).toBe('OWNER');
    });

    it('should return no access for deleted project', async () => {
      const mockProject = {
        id: mockProjectId,
        name: 'Test Project',
        description: null,
        status: 'DELETED' as const,
        wordCount: 100,
        documentId: null,
        settings: null,
        ownerId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: new Date(),
        expiresAt: null,
        collaborators: [],
      };

      vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject);

      const result = await checkProjectAccess(mockProjectId, mockUserId);

      expect(result.hasAccess).toBe(false);
    });
  });
});

describe('Project Validation Schemas', () => {
  describe('createProjectSchema', () => {
    it('should validate valid project creation input', () => {
      const result = createProjectSchema.safeParse({
        name: 'Test Project',
        description: 'A test project',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const result = createProjectSchema.safeParse({
        name: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject name over 255 characters', () => {
      const result = createProjectSchema.safeParse({
        name: 'a'.repeat(256),
      });
      expect(result.success).toBe(false);
    });

    it('should validate settings', () => {
      const result = createProjectSchema.safeParse({
        name: 'Test',
        settings: {
          defaultLevel: 3,
          defaultStrategy: 'professional',
        },
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid humanization level', () => {
      const result = createProjectSchema.safeParse({
        name: 'Test',
        settings: {
          defaultLevel: 6,
        },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateProjectSchema', () => {
    it('should validate partial update', () => {
      const result = updateProjectSchema.safeParse({
        name: 'New Name',
      });
      expect(result.success).toBe(true);
    });

    it('should validate status change', () => {
      const result = updateProjectSchema.safeParse({
        status: 'ARCHIVED',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const result = updateProjectSchema.safeParse({
        status: 'INVALID',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('listProjectsSchema', () => {
    it('should provide defaults', () => {
      const result = listProjectsSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
        expect(result.data.status).toBe('ACTIVE');
        expect(result.data.sortBy).toBe('updatedAt');
        expect(result.data.sortOrder).toBe('desc');
      }
    });

    it('should coerce string numbers', () => {
      const result = listProjectsSchema.safeParse({
        page: '2',
        limit: '50',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(50);
      }
    });

    it('should reject limit over 100', () => {
      const result = listProjectsSchema.safeParse({
        limit: 101,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('projectIdSchema', () => {
    it('should validate valid UUID', () => {
      const result = projectIdSchema.safeParse({
        id: '123e4567-e89b-12d3-a456-426614174000',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const result = projectIdSchema.safeParse({
        id: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });
  });
});
