/**
 * Collaboration types and validation schemas
 * Requirements: 21 - Collaborate with team members on projects
 */

import { z } from 'zod';

// ============================================
// Enums
// ============================================

/**
 * Collaborator roles with different permission levels
 * Requirements: 21.4 - Support roles including viewer, editor, and admin
 */
export enum CollaboratorRole {
  VIEWER = 'VIEWER',
  EDITOR = 'EDITOR',
  ADMIN = 'ADMIN',
}

/**
 * Invitation status
 */
export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
}

/**
 * Activity action types for logging
 * Requirements: 21.5 - Maintain an activity log showing all actions
 */
export enum ActivityAction {
  // Invitation actions
  INVITATION_SENT = 'INVITATION_SENT',
  INVITATION_ACCEPTED = 'INVITATION_ACCEPTED',
  INVITATION_DECLINED = 'INVITATION_DECLINED',
  INVITATION_REVOKED = 'INVITATION_REVOKED',
  
  // Collaborator actions
  COLLABORATOR_REMOVED = 'COLLABORATOR_REMOVED',
  ROLE_CHANGED = 'ROLE_CHANGED',
  
  // Project actions by collaborators
  PROJECT_VIEWED = 'PROJECT_VIEWED',
  PROJECT_EDITED = 'PROJECT_EDITED',
  TRANSFORMATION_STARTED = 'TRANSFORMATION_STARTED',
  VERSION_CREATED = 'VERSION_CREATED',
}

// ============================================
// Validation Schemas
// ============================================

/**
 * Schema for inviting a collaborator
 * Requirements: 21.1 - Send invitation email with secure access link
 */
export const inviteCollaboratorSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.nativeEnum(CollaboratorRole).default(CollaboratorRole.VIEWER),
  message: z.string().max(500, 'Message must be less than 500 characters').optional(),
});

/**
 * Schema for accepting an invitation
 * Requirements: 21.2 - Grant access to shared project with specified permissions
 */
export const acceptInvitationSchema = z.object({
  token: z.string().min(1, 'Invitation token is required'),
});

/**
 * Schema for updating collaborator role
 * Requirements: 21.4 - Support roles with appropriate access controls
 */
export const updateCollaboratorRoleSchema = z.object({
  role: z.nativeEnum(CollaboratorRole),
});

/**
 * Schema for listing collaborators
 */
export const listCollaboratorsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

/**
 * Schema for listing activity logs
 * Requirements: 21.5 - Activity log showing all actions
 */
export const listActivitySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  action: z.nativeEnum(ActivityAction).optional(),
  userId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// ============================================
// Types derived from schemas
// ============================================

export type InviteCollaboratorInput = z.infer<typeof inviteCollaboratorSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
export type UpdateCollaboratorRoleInput = z.infer<typeof updateCollaboratorRoleSchema>;
export type ListCollaboratorsInput = z.infer<typeof listCollaboratorsSchema>;
export type ListActivityInput = z.infer<typeof listActivitySchema>;

// ============================================
// Response Types
// ============================================

/**
 * Invitation response type
 */
export interface InvitationResponse {
  id: string;
  projectId: string;
  email: string;
  role: CollaboratorRole;
  status: InvitationStatus;
  invitedBy: string;
  invitedByName: string | null;
  message: string | null;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * Collaborator response type
 */
export interface CollaboratorResponse {
  id: string;
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: CollaboratorRole;
  invitedAt: Date;
  acceptedAt: Date | null;
}

/**
 * Collaborator list response with pagination
 */
export interface CollaboratorListResponse {
  collaborators: CollaboratorResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/**
 * Activity log entry
 * Requirements: 21.5 - Activity log showing all actions taken by team members
 */
export interface ActivityLogEntry {
  id: string;
  projectId: string;
  userId: string;
  userEmail: string;
  userName: string | null;
  action: ActivityAction;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: Date;
}

/**
 * Activity log list response with pagination
 */
export interface ActivityLogListResponse {
  activities: ActivityLogEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  hasAccess: boolean;
  isOwner: boolean;
  role: CollaboratorRole | null;
  canView: boolean;
  canEdit: boolean;
  canManageCollaborators: boolean;
}

/**
 * Email notification options
 */
export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}
