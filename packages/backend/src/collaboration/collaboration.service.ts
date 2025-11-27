/**
 * Collaboration Service
 * Handles project collaboration, invitations, and activity logging
 * 
 * Requirements: 21 - Collaborate with team members on projects
 */

import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { prisma } from '../database/prisma';
import { logger } from '../utils/logger';
import { sendInvitationEmail, sendInvitationAcceptedEmail } from './email.service';
import {
  CollaboratorRole,
  InvitationStatus,
  ActivityAction,
  type InviteCollaboratorInput,
  type ListCollaboratorsInput,
  type ListActivityInput,
  type InvitationResponse,
  type CollaboratorResponse,
  type CollaboratorListResponse,
  type ActivityLogListResponse,
  type PermissionCheckResult,
} from './types';

// ============================================
// Constants
// ============================================

const INVITATION_EXPIRY_DAYS = 7;

// ============================================
// Error Classes
// ============================================

/**
 * Custom error class for collaboration-related errors
 */
export class CollaborationError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'CollaborationError';
    this.code = code;
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Generate a secure invitation token
 */
function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Check if user has permission to manage collaborators
 * Requirements: 21.4 - Support roles with appropriate access controls
 */
export async function checkCollaboratorPermission(
  projectId: string,
  userId: string
): Promise<PermissionCheckResult> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      collaborators: {
        where: { userId, acceptedAt: { not: null } },
      },
    },
  });

  if (!project || project.deletedAt) {
    return {
      hasAccess: false,
      isOwner: false,
      role: null,
      canView: false,
      canEdit: false,
      canManageCollaborators: false,
    };
  }

  const isOwner = project.ownerId === userId;
  const collaborator = project.collaborators[0];
  const role = collaborator?.role as CollaboratorRole | undefined;

  // Owner has all permissions
  if (isOwner) {
    return {
      hasAccess: true,
      isOwner: true,
      role: null,
      canView: true,
      canEdit: true,
      canManageCollaborators: true,
    };
  }

  // Check collaborator permissions based on role
  if (collaborator) {
    return {
      hasAccess: true,
      isOwner: false,
      role: role || null,
      canView: true,
      canEdit: role === CollaboratorRole.EDITOR || role === CollaboratorRole.ADMIN,
      canManageCollaborators: role === CollaboratorRole.ADMIN,
    };
  }

  return {
    hasAccess: false,
    isOwner: false,
    role: null,
    canView: false,
    canEdit: false,
    canManageCollaborators: false,
  };
}

// ============================================
// Invitation Functions
// ============================================

/**
 * Invite a collaborator to a project
 * Requirements: 21.1 - Send invitation email with secure access link
 */
export async function inviteCollaborator(
  projectId: string,
  inviterId: string,
  input: InviteCollaboratorInput,
  metadata?: { ipAddress?: string | undefined }
): Promise<InvitationResponse> {
  const { email, role, message } = input;
  const normalizedEmail = email.toLowerCase();

  // Check if inviter has permission to invite
  const permission = await checkCollaboratorPermission(projectId, inviterId);
  if (!permission.canManageCollaborators) {
    throw new CollaborationError(
      'You do not have permission to invite collaborators',
      'PERMISSION_DENIED'
    );
  }

  // Get project details
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      owner: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
    },
  });

  if (!project) {
    throw new CollaborationError('Project not found', 'PROJECT_NOT_FOUND');
  }

  // Check if user is trying to invite themselves
  const inviter = await prisma.user.findUnique({
    where: { id: inviterId },
    select: { email: true, firstName: true, lastName: true },
  });

  if (inviter?.email.toLowerCase() === normalizedEmail) {
    throw new CollaborationError('You cannot invite yourself', 'SELF_INVITATION');
  }

  // Check if user is already a collaborator
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    // Check if already owner
    if (project.ownerId === existingUser.id) {
      throw new CollaborationError(
        'This user is the project owner',
        'ALREADY_OWNER'
      );
    }

    // Check if already a collaborator
    const existingCollaborator = await prisma.projectCollaborator.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: existingUser.id,
        },
      },
    });

    if (existingCollaborator) {
      throw new CollaborationError(
        'This user is already a collaborator',
        'ALREADY_COLLABORATOR'
      );
    }
  }

  // Check for existing pending invitation
  const existingInvitation = await prisma.projectInvitation.findFirst({
    where: {
      projectId,
      email: normalizedEmail,
      status: 'PENDING',
      expiresAt: { gt: new Date() },
    },
  });

  if (existingInvitation) {
    throw new CollaborationError(
      'An invitation has already been sent to this email',
      'INVITATION_EXISTS'
    );
  }

  // Generate invitation token and expiry
  const token = generateInvitationToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

  // Create invitation
  const invitation = await prisma.projectInvitation.create({
    data: {
      id: uuidv4(),
      projectId,
      email: normalizedEmail,
      role,
      token,
      message: message || null,
      invitedBy: inviterId,
      status: 'PENDING',
      expiresAt,
    },
  });

  // Log activity
  await logActivity({
    projectId,
    userId: inviterId,
    action: ActivityAction.INVITATION_SENT,
    details: { email: normalizedEmail, role },
    ipAddress: metadata?.ipAddress,
  });

  // Send invitation email
  const inviterName = inviter
    ? `${inviter.firstName || ''} ${inviter.lastName || ''}`.trim() || inviter.email
    : 'A team member';

  await sendInvitationEmail({
    to: normalizedEmail,
    inviterName,
    projectName: project.name,
    role,
    invitationToken: token,
    message: message || undefined,
    expiresAt,
  });

  logger.info('Invitation sent', {
    projectId,
    inviterId,
    email: normalizedEmail,
    role,
  });

  return {
    id: invitation.id,
    projectId: invitation.projectId,
    email: invitation.email,
    role: invitation.role as CollaboratorRole,
    status: invitation.status as InvitationStatus,
    invitedBy: invitation.invitedBy,
    invitedByName: inviterName,
    message: invitation.message,
    expiresAt: invitation.expiresAt,
    createdAt: invitation.createdAt,
  };
}

/**
 * Accept an invitation
 * Requirements: 21.2 - Grant access to shared project with specified permissions
 */
export async function acceptInvitation(
  token: string,
  userId: string,
  metadata?: { ipAddress?: string | undefined }
): Promise<{ projectId: string; role: CollaboratorRole }> {
  // Find invitation by token
  const invitation = await prisma.projectInvitation.findUnique({
    where: { token },
    include: {
      project: {
        include: {
          owner: {
            select: { email: true },
          },
        },
      },
    },
  });

  if (!invitation) {
    throw new CollaborationError('Invalid invitation token', 'INVALID_TOKEN');
  }

  if (invitation.status !== 'PENDING') {
    throw new CollaborationError(
      `Invitation has already been ${invitation.status.toLowerCase()}`,
      'INVITATION_NOT_PENDING'
    );
  }

  if (invitation.expiresAt < new Date()) {
    // Update status to expired
    await prisma.projectInvitation.update({
      where: { id: invitation.id },
      data: { status: 'EXPIRED' },
    });
    throw new CollaborationError('Invitation has expired', 'INVITATION_EXPIRED');
  }

  // Get accepting user
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, firstName: true, lastName: true },
  });

  if (!user) {
    throw new CollaborationError('User not found', 'USER_NOT_FOUND');
  }

  // Verify the invitation is for this user's email
  if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    throw new CollaborationError(
      'This invitation was sent to a different email address',
      'EMAIL_MISMATCH'
    );
  }

  // Check if already a collaborator (edge case)
  const existingCollaborator = await prisma.projectCollaborator.findUnique({
    where: {
      projectId_userId: {
        projectId: invitation.projectId,
        userId,
      },
    },
  });

  if (existingCollaborator) {
    // Update invitation status and return existing
    await prisma.projectInvitation.update({
      where: { id: invitation.id },
      data: { status: 'ACCEPTED', acceptedAt: new Date() },
    });
    return {
      projectId: invitation.projectId,
      role: existingCollaborator.role as CollaboratorRole,
    };
  }

  // Create collaborator and update invitation in a transaction
  await prisma.$transaction([
    prisma.projectCollaborator.create({
      data: {
        projectId: invitation.projectId,
        userId,
        role: invitation.role,
        invitedBy: invitation.invitedBy,
        invitedAt: invitation.createdAt,
        acceptedAt: new Date(),
      },
    }),
    prisma.projectInvitation.update({
      where: { id: invitation.id },
      data: { status: 'ACCEPTED', acceptedAt: new Date() },
    }),
  ]);

  // Log activity
  await logActivity({
    projectId: invitation.projectId,
    userId,
    action: ActivityAction.INVITATION_ACCEPTED,
    details: { role: invitation.role },
    ipAddress: metadata?.ipAddress,
  });

  // Notify the inviter
  const inviter = await prisma.user.findUnique({
    where: { id: invitation.invitedBy },
    select: { email: true },
  });

  if (inviter) {
    const accepterName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    await sendInvitationAcceptedEmail({
      to: inviter.email,
      accepterName,
      accepterEmail: user.email,
      projectName: invitation.project.name,
    });
  }

  logger.info('Invitation accepted', {
    projectId: invitation.projectId,
    userId,
    role: invitation.role,
  });

  return {
    projectId: invitation.projectId,
    role: invitation.role as CollaboratorRole,
  };
}

/**
 * Decline an invitation
 */
export async function declineInvitation(
  token: string,
  userId: string
): Promise<void> {
  const invitation = await prisma.projectInvitation.findUnique({
    where: { token },
  });

  if (!invitation) {
    throw new CollaborationError('Invalid invitation token', 'INVALID_TOKEN');
  }

  if (invitation.status !== 'PENDING') {
    throw new CollaborationError(
      `Invitation has already been ${invitation.status.toLowerCase()}`,
      'INVITATION_NOT_PENDING'
    );
  }

  // Get user email to verify
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user || user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    throw new CollaborationError(
      'This invitation was sent to a different email address',
      'EMAIL_MISMATCH'
    );
  }

  await prisma.projectInvitation.update({
    where: { id: invitation.id },
    data: { status: 'DECLINED' },
  });

  // Log activity
  await logActivity({
    projectId: invitation.projectId,
    userId,
    action: ActivityAction.INVITATION_DECLINED,
    details: {},
  });

  logger.info('Invitation declined', {
    projectId: invitation.projectId,
    userId,
  });
}

/**
 * Revoke an invitation
 */
export async function revokeInvitation(
  invitationId: string,
  userId: string,
  metadata?: { ipAddress?: string | undefined }
): Promise<void> {
  const invitation = await prisma.projectInvitation.findUnique({
    where: { id: invitationId },
  });

  if (!invitation) {
    throw new CollaborationError('Invitation not found', 'INVITATION_NOT_FOUND');
  }

  // Check permission
  const permission = await checkCollaboratorPermission(invitation.projectId, userId);
  if (!permission.canManageCollaborators) {
    throw new CollaborationError(
      'You do not have permission to revoke invitations',
      'PERMISSION_DENIED'
    );
  }

  if (invitation.status !== 'PENDING') {
    throw new CollaborationError(
      `Cannot revoke invitation that has been ${invitation.status.toLowerCase()}`,
      'INVITATION_NOT_PENDING'
    );
  }

  await prisma.projectInvitation.update({
    where: { id: invitationId },
    data: { status: 'REVOKED' },
  });

  // Log activity
  await logActivity({
    projectId: invitation.projectId,
    userId,
    action: ActivityAction.INVITATION_REVOKED,
    details: { email: invitation.email },
    ipAddress: metadata?.ipAddress,
  });

  logger.info('Invitation revoked', {
    invitationId,
    projectId: invitation.projectId,
    userId,
  });
}

/**
 * Get pending invitations for a project
 */
export async function getPendingInvitations(
  projectId: string,
  userId: string
): Promise<InvitationResponse[]> {
  // Check permission
  const permission = await checkCollaboratorPermission(projectId, userId);
  if (!permission.hasAccess) {
    throw new CollaborationError('Access denied', 'ACCESS_DENIED');
  }

  const invitations = await prisma.projectInvitation.findMany({
    where: {
      projectId,
      status: 'PENDING',
      expiresAt: { gt: new Date() },
    },
    include: {
      inviter: {
        select: { firstName: true, lastName: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return invitations.map((inv) => ({
    id: inv.id,
    projectId: inv.projectId,
    email: inv.email,
    role: inv.role as CollaboratorRole,
    status: inv.status as InvitationStatus,
    invitedBy: inv.invitedBy,
    invitedByName: inv.inviter
      ? `${inv.inviter.firstName || ''} ${inv.inviter.lastName || ''}`.trim() || inv.inviter.email
      : null,
    message: inv.message,
    expiresAt: inv.expiresAt,
    createdAt: inv.createdAt,
  }));
}


// ============================================
// Collaborator Management Functions
// ============================================

/**
 * List collaborators for a project
 */
export async function listCollaborators(
  projectId: string,
  userId: string,
  input: ListCollaboratorsInput
): Promise<CollaboratorListResponse> {
  const { page, limit } = input;
  const skip = (page - 1) * limit;

  // Check permission
  const permission = await checkCollaboratorPermission(projectId, userId);
  if (!permission.hasAccess) {
    throw new CollaborationError('Access denied', 'ACCESS_DENIED');
  }

  // Get collaborators with user details
  const [collaborators, total] = await Promise.all([
    prisma.projectCollaborator.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { invitedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.projectCollaborator.count({ where: { projectId } }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    collaborators: collaborators.map((c) => ({
      id: c.id,
      userId: c.userId,
      email: c.user.email,
      firstName: c.user.firstName,
      lastName: c.user.lastName,
      role: c.role as CollaboratorRole,
      invitedAt: c.invitedAt,
      acceptedAt: c.acceptedAt,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  };
}

/**
 * Update a collaborator's role
 * Requirements: 21.4 - Support roles with appropriate access controls
 */
export async function updateCollaboratorRole(
  projectId: string,
  collaboratorUserId: string,
  newRole: CollaboratorRole,
  requesterId: string,
  metadata?: { ipAddress?: string | undefined }
): Promise<CollaboratorResponse> {
  // Check permission
  const permission = await checkCollaboratorPermission(projectId, requesterId);
  if (!permission.canManageCollaborators) {
    throw new CollaborationError(
      'You do not have permission to update collaborator roles',
      'PERMISSION_DENIED'
    );
  }

  // Get the collaborator
  const collaborator = await prisma.projectCollaborator.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId: collaboratorUserId,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  if (!collaborator) {
    throw new CollaborationError('Collaborator not found', 'COLLABORATOR_NOT_FOUND');
  }

  // Cannot change own role unless owner
  if (collaboratorUserId === requesterId && !permission.isOwner) {
    throw new CollaborationError(
      'You cannot change your own role',
      'CANNOT_CHANGE_OWN_ROLE'
    );
  }

  const oldRole = collaborator.role;

  // Update role
  const updated = await prisma.projectCollaborator.update({
    where: { id: collaborator.id },
    data: { role: newRole },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  // Log activity
  await logActivity({
    projectId,
    userId: requesterId,
    action: ActivityAction.ROLE_CHANGED,
    details: {
      collaboratorUserId,
      collaboratorEmail: collaborator.user.email,
      oldRole,
      newRole,
    },
    ipAddress: metadata?.ipAddress,
  });

  logger.info('Collaborator role updated', {
    projectId,
    collaboratorUserId,
    oldRole,
    newRole,
    requesterId,
  });

  return {
    id: updated.id,
    userId: updated.userId,
    email: updated.user.email,
    firstName: updated.user.firstName,
    lastName: updated.user.lastName,
    role: updated.role as CollaboratorRole,
    invitedAt: updated.invitedAt,
    acceptedAt: updated.acceptedAt,
  };
}

/**
 * Remove a collaborator from a project
 */
export async function removeCollaborator(
  projectId: string,
  collaboratorUserId: string,
  requesterId: string,
  metadata?: { ipAddress?: string | undefined }
): Promise<void> {
  // Check permission
  const permission = await checkCollaboratorPermission(projectId, requesterId);
  
  // Allow self-removal or admin/owner removal
  const isSelfRemoval = collaboratorUserId === requesterId;
  if (!isSelfRemoval && !permission.canManageCollaborators) {
    throw new CollaborationError(
      'You do not have permission to remove collaborators',
      'PERMISSION_DENIED'
    );
  }

  // Get the collaborator
  const collaborator = await prisma.projectCollaborator.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId: collaboratorUserId,
      },
    },
    include: {
      user: {
        select: { email: true },
      },
    },
  });

  if (!collaborator) {
    throw new CollaborationError('Collaborator not found', 'COLLABORATOR_NOT_FOUND');
  }

  // Delete collaborator
  await prisma.projectCollaborator.delete({
    where: { id: collaborator.id },
  });

  // Log activity
  await logActivity({
    projectId,
    userId: requesterId,
    action: ActivityAction.COLLABORATOR_REMOVED,
    details: {
      collaboratorUserId,
      collaboratorEmail: collaborator.user.email,
      selfRemoval: isSelfRemoval,
    },
    ipAddress: metadata?.ipAddress,
  });

  logger.info('Collaborator removed', {
    projectId,
    collaboratorUserId,
    requesterId,
    selfRemoval: isSelfRemoval,
  });
}

// ============================================
// Activity Logging Functions
// ============================================

/**
 * Log an activity
 * Requirements: 21.5 - Maintain an activity log showing all actions
 */
export async function logActivity(params: {
  projectId: string;
  userId: string;
  action: ActivityAction;
  details?: Record<string, unknown> | undefined;
  ipAddress?: string | undefined;
}): Promise<void> {
  const { projectId, userId, action, details, ipAddress } = params;

  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType: 'project',
        entityId: projectId,
        metadata: details ? JSON.parse(JSON.stringify(details)) : undefined,
        ipAddress: ipAddress || null,
      },
    });
  } catch (error) {
    // Don't fail the main operation if logging fails
    logger.error('Failed to log activity', {
      error: error instanceof Error ? error.message : 'Unknown error',
      projectId,
      userId,
      action,
    });
  }
}

/**
 * Get activity log for a project
 * Requirements: 21.5 - Activity log showing all actions taken by team members
 */
export async function getActivityLog(
  projectId: string,
  userId: string,
  input: ListActivityInput
): Promise<ActivityLogListResponse> {
  const { page, limit, action, userId: filterUserId, startDate, endDate } = input;
  const skip = (page - 1) * limit;

  // Check permission
  const permission = await checkCollaboratorPermission(projectId, userId);
  if (!permission.hasAccess) {
    throw new CollaborationError('Access denied', 'ACCESS_DENIED');
  }

  // Build where clause
  const whereClause: {
    entityType: string;
    entityId: string;
    action?: string;
    userId?: string;
    createdAt?: { gte?: Date; lte?: Date };
  } = {
    entityType: 'project',
    entityId: projectId,
  };

  if (action) {
    whereClause.action = action;
  }

  if (filterUserId) {
    whereClause.userId = filterUserId;
  }

  if (startDate || endDate) {
    whereClause.createdAt = {};
    if (startDate) {
      whereClause.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      whereClause.createdAt.lte = new Date(endDate);
    }
  }

  // Get activities with user details
  const [activities, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where: whereClause }),
  ]);

  // Get user details for all activities
  const userIds = [...new Set(activities.map((a) => a.userId).filter(Boolean))] as string[];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true, firstName: true, lastName: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  const totalPages = Math.ceil(total / limit);

  return {
    activities: activities.map((a) => {
      const user = a.userId ? userMap.get(a.userId) : null;
      return {
        id: a.id,
        projectId,
        userId: a.userId || '',
        userEmail: user?.email || 'Unknown',
        userName: user
          ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || null
          : null,
        action: a.action as ActivityAction,
        details: a.metadata as Record<string, unknown> | null,
        ipAddress: a.ipAddress,
        createdAt: a.createdAt,
      };
    }),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  };
}

/**
 * Get user's pending invitations (invitations sent to the user)
 */
export async function getUserPendingInvitations(
  userId: string
): Promise<InvitationResponse[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user) {
    throw new CollaborationError('User not found', 'USER_NOT_FOUND');
  }

  const invitations = await prisma.projectInvitation.findMany({
    where: {
      email: user.email.toLowerCase(),
      status: 'PENDING',
      expiresAt: { gt: new Date() },
    },
    include: {
      project: {
        select: { name: true },
      },
      inviter: {
        select: { firstName: true, lastName: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return invitations.map((inv) => ({
    id: inv.id,
    projectId: inv.projectId,
    email: inv.email,
    role: inv.role as CollaboratorRole,
    status: inv.status as InvitationStatus,
    invitedBy: inv.invitedBy,
    invitedByName: inv.inviter
      ? `${inv.inviter.firstName || ''} ${inv.inviter.lastName || ''}`.trim() || inv.inviter.email
      : null,
    message: inv.message,
    expiresAt: inv.expiresAt,
    createdAt: inv.createdAt,
  }));
}
