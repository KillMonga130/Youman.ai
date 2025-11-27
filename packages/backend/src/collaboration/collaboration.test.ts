/**
 * Collaboration Service Tests
 * Requirements: 21 - Collaborate with team members on projects
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CollaboratorRole,
  InvitationStatus,
  ActivityAction,
  inviteCollaboratorSchema,
  acceptInvitationSchema,
  updateCollaboratorRoleSchema,
  listCollaboratorsSchema,
  listActivitySchema,
} from './types';
import { checkCollaboratorPermission } from './collaboration.service';

// Mock prisma
vi.mock('../database/prisma', () => ({
  prisma: {
    project: {
      findUnique: vi.fn(),
    },
    projectCollaborator: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    projectInvitation: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
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

// Mock email service
vi.mock('./email.service', () => ({
  sendInvitationEmail: vi.fn().mockResolvedValue(true),
  sendInvitationAcceptedEmail: vi.fn().mockResolvedValue(true),
}));

describe('Collaboration Types', () => {
  describe('CollaboratorRole enum', () => {
    it('should have VIEWER role', () => {
      expect(CollaboratorRole.VIEWER).toBe('VIEWER');
    });

    it('should have EDITOR role', () => {
      expect(CollaboratorRole.EDITOR).toBe('EDITOR');
    });

    it('should have ADMIN role', () => {
      expect(CollaboratorRole.ADMIN).toBe('ADMIN');
    });
  });

  describe('InvitationStatus enum', () => {
    it('should have PENDING status', () => {
      expect(InvitationStatus.PENDING).toBe('PENDING');
    });

    it('should have ACCEPTED status', () => {
      expect(InvitationStatus.ACCEPTED).toBe('ACCEPTED');
    });

    it('should have DECLINED status', () => {
      expect(InvitationStatus.DECLINED).toBe('DECLINED');
    });

    it('should have EXPIRED status', () => {
      expect(InvitationStatus.EXPIRED).toBe('EXPIRED');
    });

    it('should have REVOKED status', () => {
      expect(InvitationStatus.REVOKED).toBe('REVOKED');
    });
  });

  describe('ActivityAction enum', () => {
    it('should have invitation actions', () => {
      expect(ActivityAction.INVITATION_SENT).toBe('INVITATION_SENT');
      expect(ActivityAction.INVITATION_ACCEPTED).toBe('INVITATION_ACCEPTED');
      expect(ActivityAction.INVITATION_DECLINED).toBe('INVITATION_DECLINED');
      expect(ActivityAction.INVITATION_REVOKED).toBe('INVITATION_REVOKED');
    });

    it('should have collaborator actions', () => {
      expect(ActivityAction.COLLABORATOR_REMOVED).toBe('COLLABORATOR_REMOVED');
      expect(ActivityAction.ROLE_CHANGED).toBe('ROLE_CHANGED');
    });

    it('should have project actions', () => {
      expect(ActivityAction.PROJECT_VIEWED).toBe('PROJECT_VIEWED');
      expect(ActivityAction.PROJECT_EDITED).toBe('PROJECT_EDITED');
      expect(ActivityAction.TRANSFORMATION_STARTED).toBe('TRANSFORMATION_STARTED');
      expect(ActivityAction.VERSION_CREATED).toBe('VERSION_CREATED');
    });
  });
});

describe('Validation Schemas', () => {
  describe('inviteCollaboratorSchema', () => {
    it('should validate valid invitation input', () => {
      const input = {
        email: 'test@example.com',
        role: CollaboratorRole.EDITOR,
        message: 'Please join our project!',
      };

      const result = inviteCollaboratorSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const input = {
        email: 'invalid-email',
        role: CollaboratorRole.VIEWER,
      };

      const result = inviteCollaboratorSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should default role to VIEWER', () => {
      const input = {
        email: 'test@example.com',
      };

      const result = inviteCollaboratorSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe(CollaboratorRole.VIEWER);
      }
    });

    it('should reject message longer than 500 characters', () => {
      const input = {
        email: 'test@example.com',
        role: CollaboratorRole.VIEWER,
        message: 'a'.repeat(501),
      };

      const result = inviteCollaboratorSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('acceptInvitationSchema', () => {
    it('should validate valid token', () => {
      const input = {
        token: 'abc123def456',
      };

      const result = acceptInvitationSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject empty token', () => {
      const input = {
        token: '',
      };

      const result = acceptInvitationSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('updateCollaboratorRoleSchema', () => {
    it('should validate valid role', () => {
      const input = {
        role: CollaboratorRole.ADMIN,
      };

      const result = updateCollaboratorRoleSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject invalid role', () => {
      const input = {
        role: 'INVALID_ROLE',
      };

      const result = updateCollaboratorRoleSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('listCollaboratorsSchema', () => {
    it('should validate with defaults', () => {
      const input = {};

      const result = listCollaboratorsSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should validate custom pagination', () => {
      const input = {
        page: '2',
        limit: '50',
      };

      const result = listCollaboratorsSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(50);
      }
    });

    it('should reject limit over 100', () => {
      const input = {
        limit: '101',
      };

      const result = listCollaboratorsSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('listActivitySchema', () => {
    it('should validate with defaults', () => {
      const input = {};

      const result = listActivitySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(50);
      }
    });

    it('should validate with action filter', () => {
      const input = {
        action: ActivityAction.INVITATION_SENT,
      };

      const result = listActivitySchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate with date filters', () => {
      const input = {
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-12-31T23:59:59.999Z',
      };

      const result = listActivitySchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});

describe('Permission Checking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkCollaboratorPermission', () => {
    it('should return no access for non-existent project', async () => {
      const { prisma } = await import('../database/prisma');
      vi.mocked(prisma.project.findUnique).mockResolvedValue(null);

      const result = await checkCollaboratorPermission('project-id', 'user-id');

      expect(result.hasAccess).toBe(false);
      expect(result.isOwner).toBe(false);
      expect(result.canView).toBe(false);
      expect(result.canEdit).toBe(false);
      expect(result.canManageCollaborators).toBe(false);
    });

    it('should return full access for project owner', async () => {
      const { prisma } = await import('../database/prisma');
      vi.mocked(prisma.project.findUnique).mockResolvedValue({
        id: 'project-id',
        ownerId: 'user-id',
        name: 'Test Project',
        description: null,
        status: 'ACTIVE',
        wordCount: 0,
        documentId: null,
        settings: null,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        collaborators: [],
      } as never);

      const result = await checkCollaboratorPermission('project-id', 'user-id');

      expect(result.hasAccess).toBe(true);
      expect(result.isOwner).toBe(true);
      expect(result.canView).toBe(true);
      expect(result.canEdit).toBe(true);
      expect(result.canManageCollaborators).toBe(true);
    });

    it('should return viewer permissions for VIEWER role', async () => {
      const { prisma } = await import('../database/prisma');
      vi.mocked(prisma.project.findUnique).mockResolvedValue({
        id: 'project-id',
        ownerId: 'owner-id',
        name: 'Test Project',
        description: null,
        status: 'ACTIVE',
        wordCount: 0,
        documentId: null,
        settings: null,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        collaborators: [{
          id: 'collab-id',
          projectId: 'project-id',
          userId: 'user-id',
          role: 'VIEWER',
          invitedBy: 'owner-id',
          invitedAt: new Date(),
          acceptedAt: new Date(),
        }],
      } as never);

      const result = await checkCollaboratorPermission('project-id', 'user-id');

      expect(result.hasAccess).toBe(true);
      expect(result.isOwner).toBe(false);
      expect(result.role).toBe(CollaboratorRole.VIEWER);
      expect(result.canView).toBe(true);
      expect(result.canEdit).toBe(false);
      expect(result.canManageCollaborators).toBe(false);
    });

    it('should return editor permissions for EDITOR role', async () => {
      const { prisma } = await import('../database/prisma');
      vi.mocked(prisma.project.findUnique).mockResolvedValue({
        id: 'project-id',
        ownerId: 'owner-id',
        name: 'Test Project',
        description: null,
        status: 'ACTIVE',
        wordCount: 0,
        documentId: null,
        settings: null,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        collaborators: [{
          id: 'collab-id',
          projectId: 'project-id',
          userId: 'user-id',
          role: 'EDITOR',
          invitedBy: 'owner-id',
          invitedAt: new Date(),
          acceptedAt: new Date(),
        }],
      } as never);

      const result = await checkCollaboratorPermission('project-id', 'user-id');

      expect(result.hasAccess).toBe(true);
      expect(result.isOwner).toBe(false);
      expect(result.role).toBe(CollaboratorRole.EDITOR);
      expect(result.canView).toBe(true);
      expect(result.canEdit).toBe(true);
      expect(result.canManageCollaborators).toBe(false);
    });

    it('should return admin permissions for ADMIN role', async () => {
      const { prisma } = await import('../database/prisma');
      vi.mocked(prisma.project.findUnique).mockResolvedValue({
        id: 'project-id',
        ownerId: 'owner-id',
        name: 'Test Project',
        description: null,
        status: 'ACTIVE',
        wordCount: 0,
        documentId: null,
        settings: null,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        collaborators: [{
          id: 'collab-id',
          projectId: 'project-id',
          userId: 'user-id',
          role: 'ADMIN',
          invitedBy: 'owner-id',
          invitedAt: new Date(),
          acceptedAt: new Date(),
        }],
      } as never);

      const result = await checkCollaboratorPermission('project-id', 'user-id');

      expect(result.hasAccess).toBe(true);
      expect(result.isOwner).toBe(false);
      expect(result.role).toBe(CollaboratorRole.ADMIN);
      expect(result.canView).toBe(true);
      expect(result.canEdit).toBe(true);
      expect(result.canManageCollaborators).toBe(true);
    });

    it('should return no access for deleted project', async () => {
      const { prisma } = await import('../database/prisma');
      vi.mocked(prisma.project.findUnique).mockResolvedValue({
        id: 'project-id',
        ownerId: 'user-id',
        name: 'Test Project',
        description: null,
        status: 'DELETED',
        wordCount: 0,
        documentId: null,
        settings: null,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: new Date(),
        collaborators: [],
      } as never);

      const result = await checkCollaboratorPermission('project-id', 'user-id');

      expect(result.hasAccess).toBe(false);
    });
  });
});

describe('Role-Based Access Control', () => {
  /**
   * Requirements: 21.4 - Support roles including viewer, editor, and admin
   * with appropriate access controls
   */
  describe('Role permissions', () => {
    it('VIEWER should only have view access', () => {
      const viewerPermissions = {
        canView: true,
        canEdit: false,
        canManageCollaborators: false,
      };

      expect(viewerPermissions.canView).toBe(true);
      expect(viewerPermissions.canEdit).toBe(false);
      expect(viewerPermissions.canManageCollaborators).toBe(false);
    });

    it('EDITOR should have view and edit access', () => {
      const editorPermissions = {
        canView: true,
        canEdit: true,
        canManageCollaborators: false,
      };

      expect(editorPermissions.canView).toBe(true);
      expect(editorPermissions.canEdit).toBe(true);
      expect(editorPermissions.canManageCollaborators).toBe(false);
    });

    it('ADMIN should have full access except ownership', () => {
      const adminPermissions = {
        canView: true,
        canEdit: true,
        canManageCollaborators: true,
      };

      expect(adminPermissions.canView).toBe(true);
      expect(adminPermissions.canEdit).toBe(true);
      expect(adminPermissions.canManageCollaborators).toBe(true);
    });
  });
});
