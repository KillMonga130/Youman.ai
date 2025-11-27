/**
 * Collaboration Routes
 * Handles collaboration API endpoints
 * 
 * Requirements: 21 - Collaborate with team members on projects
 */

import { Router, Request, Response } from 'express';
import {
  inviteCollaborator,
  acceptInvitation,
  declineInvitation,
  revokeInvitation,
  getPendingInvitations,
  listCollaborators,
  updateCollaboratorRole,
  removeCollaborator,
  getActivityLog,
  getUserPendingInvitations,
  CollaborationError,
} from './collaboration.service';
import { authenticate } from '../auth/auth.middleware';
import {
  inviteCollaboratorSchema,
  acceptInvitationSchema,
  updateCollaboratorRoleSchema,
  listCollaboratorsSchema,
  listActivitySchema,
} from './types';
import { projectIdSchema } from '../project/types';
import { logger } from '../utils/logger';
import { z } from 'zod';

const router = Router();

// All collaboration routes require authentication
router.use(authenticate);

// ============================================
// User Invitation Routes
// ============================================

/**
 * GET /collaboration/invitations
 * Get pending invitations for the current user
 */
router.get('/invitations', (async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    const invitations = await getUserPendingInvitations(req.user.id);

    res.status(200).json({ invitations });
  } catch (error) {
    if (error instanceof CollaborationError) {
      const statusCode = getStatusCodeForError(error.code);
      res.status(statusCode).json({
        error: error.message,
        code: error.code,
      });
      return;
    }
    logger.error('Get user invitations error:', error);
    res.status(500).json({
      error: 'Failed to get invitations',
      code: 'INTERNAL_ERROR',
    });
  }
}) as unknown as Router);

/**
 * POST /collaboration/invitations/accept
 * Accept an invitation
 * Requirements: 21.2 - Grant access to shared project with specified permissions
 */
router.post('/invitations/accept', (async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    // Validate input
    const validationResult = acceptInvitationSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validationResult.error.flatten().fieldErrors,
      });
      return;
    }

    const result = await acceptInvitation(
      validationResult.data.token,
      req.user.id,
      { ipAddress: req.ip || undefined }
    );

    res.status(200).json({
      message: 'Invitation accepted successfully',
      ...result,
    });
  } catch (error) {
    if (error instanceof CollaborationError) {
      const statusCode = getStatusCodeForError(error.code);
      res.status(statusCode).json({
        error: error.message,
        code: error.code,
      });
      return;
    }
    logger.error('Accept invitation error:', error);
    res.status(500).json({
      error: 'Failed to accept invitation',
      code: 'INTERNAL_ERROR',
    });
  }
}) as unknown as Router);

/**
 * POST /collaboration/invitations/decline
 * Decline an invitation
 */
router.post('/invitations/decline', (async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    // Validate input
    const validationResult = acceptInvitationSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validationResult.error.flatten().fieldErrors,
      });
      return;
    }

    await declineInvitation(validationResult.data.token, req.user.id);

    res.status(200).json({
      message: 'Invitation declined successfully',
    });
  } catch (error) {
    if (error instanceof CollaborationError) {
      const statusCode = getStatusCodeForError(error.code);
      res.status(statusCode).json({
        error: error.message,
        code: error.code,
      });
      return;
    }
    logger.error('Decline invitation error:', error);
    res.status(500).json({
      error: 'Failed to decline invitation',
      code: 'INTERNAL_ERROR',
    });
  }
}) as unknown as Router);

// ============================================
// Project Collaboration Routes
// ============================================

/**
 * POST /collaboration/projects/:projectId/invite
 * Invite a collaborator to a project
 * Requirements: 21.1 - Send invitation email with secure access link
 */
router.post('/projects/:projectId/invite', (async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    // Validate project ID
    const idValidation = projectIdSchema.safeParse({ id: req.params.projectId });
    if (!idValidation.success) {
      res.status(400).json({
        error: 'Invalid project ID',
        code: 'VALIDATION_ERROR',
        details: idValidation.error.flatten().fieldErrors,
      });
      return;
    }

    // Validate input
    const bodyValidation = inviteCollaboratorSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: bodyValidation.error.flatten().fieldErrors,
      });
      return;
    }

    const invitation = await inviteCollaborator(
      idValidation.data.id,
      req.user.id,
      bodyValidation.data,
      { ipAddress: req.ip || undefined }
    );

    res.status(201).json({
      message: 'Invitation sent successfully',
      invitation,
    });
  } catch (error) {
    if (error instanceof CollaborationError) {
      const statusCode = getStatusCodeForError(error.code);
      res.status(statusCode).json({
        error: error.message,
        code: error.code,
      });
      return;
    }
    logger.error('Invite collaborator error:', error);
    res.status(500).json({
      error: 'Failed to send invitation',
      code: 'INTERNAL_ERROR',
    });
  }
}) as unknown as Router);

/**
 * GET /collaboration/projects/:projectId/invitations
 * Get pending invitations for a project
 */
router.get('/projects/:projectId/invitations', (async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    // Validate project ID
    const idValidation = projectIdSchema.safeParse({ id: req.params.projectId });
    if (!idValidation.success) {
      res.status(400).json({
        error: 'Invalid project ID',
        code: 'VALIDATION_ERROR',
        details: idValidation.error.flatten().fieldErrors,
      });
      return;
    }

    const invitations = await getPendingInvitations(idValidation.data.id, req.user.id);

    res.status(200).json({ invitations });
  } catch (error) {
    if (error instanceof CollaborationError) {
      const statusCode = getStatusCodeForError(error.code);
      res.status(statusCode).json({
        error: error.message,
        code: error.code,
      });
      return;
    }
    logger.error('Get project invitations error:', error);
    res.status(500).json({
      error: 'Failed to get invitations',
      code: 'INTERNAL_ERROR',
    });
  }
}) as unknown as Router);

/**
 * DELETE /collaboration/projects/:projectId/invitations/:invitationId
 * Revoke an invitation
 */
router.delete('/projects/:projectId/invitations/:invitationId', (async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    // Validate IDs
    const invitationIdSchema = z.object({
      invitationId: z.string().uuid('Invalid invitation ID'),
    });

    const idValidation = invitationIdSchema.safeParse({ invitationId: req.params.invitationId });
    if (!idValidation.success) {
      res.status(400).json({
        error: 'Invalid invitation ID',
        code: 'VALIDATION_ERROR',
        details: idValidation.error.flatten().fieldErrors,
      });
      return;
    }

    await revokeInvitation(
      idValidation.data.invitationId,
      req.user.id,
      { ipAddress: req.ip || undefined }
    );

    res.status(200).json({
      message: 'Invitation revoked successfully',
    });
  } catch (error) {
    if (error instanceof CollaborationError) {
      const statusCode = getStatusCodeForError(error.code);
      res.status(statusCode).json({
        error: error.message,
        code: error.code,
      });
      return;
    }
    logger.error('Revoke invitation error:', error);
    res.status(500).json({
      error: 'Failed to revoke invitation',
      code: 'INTERNAL_ERROR',
    });
  }
}) as unknown as Router);

/**
 * GET /collaboration/projects/:projectId/collaborators
 * List collaborators for a project
 */
router.get('/projects/:projectId/collaborators', (async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    // Validate project ID
    const idValidation = projectIdSchema.safeParse({ id: req.params.projectId });
    if (!idValidation.success) {
      res.status(400).json({
        error: 'Invalid project ID',
        code: 'VALIDATION_ERROR',
        details: idValidation.error.flatten().fieldErrors,
      });
      return;
    }

    // Validate query parameters
    const queryValidation = listCollaboratorsSchema.safeParse(req.query);
    if (!queryValidation.success) {
      res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: queryValidation.error.flatten().fieldErrors,
      });
      return;
    }

    const result = await listCollaborators(
      idValidation.data.id,
      req.user.id,
      queryValidation.data
    );

    res.status(200).json(result);
  } catch (error) {
    if (error instanceof CollaborationError) {
      const statusCode = getStatusCodeForError(error.code);
      res.status(statusCode).json({
        error: error.message,
        code: error.code,
      });
      return;
    }
    logger.error('List collaborators error:', error);
    res.status(500).json({
      error: 'Failed to list collaborators',
      code: 'INTERNAL_ERROR',
    });
  }
}) as unknown as Router);

/**
 * PATCH /collaboration/projects/:projectId/collaborators/:userId
 * Update a collaborator's role
 * Requirements: 21.4 - Support roles with appropriate access controls
 */
router.patch('/projects/:projectId/collaborators/:userId', (async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    // Validate project ID
    const projectIdValidation = projectIdSchema.safeParse({ id: req.params.projectId });
    if (!projectIdValidation.success) {
      res.status(400).json({
        error: 'Invalid project ID',
        code: 'VALIDATION_ERROR',
        details: projectIdValidation.error.flatten().fieldErrors,
      });
      return;
    }

    // Validate user ID
    const userIdSchema = z.object({
      userId: z.string().uuid('Invalid user ID'),
    });
    const userIdValidation = userIdSchema.safeParse({ userId: req.params.userId });
    if (!userIdValidation.success) {
      res.status(400).json({
        error: 'Invalid user ID',
        code: 'VALIDATION_ERROR',
        details: userIdValidation.error.flatten().fieldErrors,
      });
      return;
    }

    // Validate body
    const bodyValidation = updateCollaboratorRoleSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: bodyValidation.error.flatten().fieldErrors,
      });
      return;
    }

    const collaborator = await updateCollaboratorRole(
      projectIdValidation.data.id,
      userIdValidation.data.userId,
      bodyValidation.data.role,
      req.user.id,
      { ipAddress: req.ip || undefined }
    );

    res.status(200).json({
      message: 'Collaborator role updated successfully',
      collaborator,
    });
  } catch (error) {
    if (error instanceof CollaborationError) {
      const statusCode = getStatusCodeForError(error.code);
      res.status(statusCode).json({
        error: error.message,
        code: error.code,
      });
      return;
    }
    logger.error('Update collaborator role error:', error);
    res.status(500).json({
      error: 'Failed to update collaborator role',
      code: 'INTERNAL_ERROR',
    });
  }
}) as unknown as Router);

/**
 * DELETE /collaboration/projects/:projectId/collaborators/:userId
 * Remove a collaborator from a project
 */
router.delete('/projects/:projectId/collaborators/:userId', (async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    // Validate project ID
    const projectIdValidation = projectIdSchema.safeParse({ id: req.params.projectId });
    if (!projectIdValidation.success) {
      res.status(400).json({
        error: 'Invalid project ID',
        code: 'VALIDATION_ERROR',
        details: projectIdValidation.error.flatten().fieldErrors,
      });
      return;
    }

    // Validate user ID
    const userIdSchema = z.object({
      userId: z.string().uuid('Invalid user ID'),
    });
    const userIdValidation = userIdSchema.safeParse({ userId: req.params.userId });
    if (!userIdValidation.success) {
      res.status(400).json({
        error: 'Invalid user ID',
        code: 'VALIDATION_ERROR',
        details: userIdValidation.error.flatten().fieldErrors,
      });
      return;
    }

    await removeCollaborator(
      projectIdValidation.data.id,
      userIdValidation.data.userId,
      req.user.id,
      { ipAddress: req.ip || undefined }
    );

    res.status(200).json({
      message: 'Collaborator removed successfully',
    });
  } catch (error) {
    if (error instanceof CollaborationError) {
      const statusCode = getStatusCodeForError(error.code);
      res.status(statusCode).json({
        error: error.message,
        code: error.code,
      });
      return;
    }
    logger.error('Remove collaborator error:', error);
    res.status(500).json({
      error: 'Failed to remove collaborator',
      code: 'INTERNAL_ERROR',
    });
  }
}) as unknown as Router);

/**
 * GET /collaboration/projects/:projectId/activity
 * Get activity log for a project
 * Requirements: 21.5 - Activity log showing all actions taken by team members
 */
router.get('/projects/:projectId/activity', (async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    // Validate project ID
    const idValidation = projectIdSchema.safeParse({ id: req.params.projectId });
    if (!idValidation.success) {
      res.status(400).json({
        error: 'Invalid project ID',
        code: 'VALIDATION_ERROR',
        details: idValidation.error.flatten().fieldErrors,
      });
      return;
    }

    // Validate query parameters
    const queryValidation = listActivitySchema.safeParse(req.query);
    if (!queryValidation.success) {
      res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: queryValidation.error.flatten().fieldErrors,
      });
      return;
    }

    const result = await getActivityLog(
      idValidation.data.id,
      req.user.id,
      queryValidation.data
    );

    res.status(200).json(result);
  } catch (error) {
    if (error instanceof CollaborationError) {
      const statusCode = getStatusCodeForError(error.code);
      res.status(statusCode).json({
        error: error.message,
        code: error.code,
      });
      return;
    }
    logger.error('Get activity log error:', error);
    res.status(500).json({
      error: 'Failed to get activity log',
      code: 'INTERNAL_ERROR',
    });
  }
}) as unknown as Router);

// ============================================
// Helper Functions
// ============================================

/**
 * Map collaboration error codes to HTTP status codes
 */
function getStatusCodeForError(code: string): number {
  switch (code) {
    case 'PROJECT_NOT_FOUND':
    case 'INVITATION_NOT_FOUND':
    case 'COLLABORATOR_NOT_FOUND':
    case 'USER_NOT_FOUND':
      return 404;
    case 'ACCESS_DENIED':
    case 'PERMISSION_DENIED':
      return 403;
    case 'INVALID_TOKEN':
    case 'EMAIL_MISMATCH':
      return 400;
    case 'INVITATION_EXPIRED':
    case 'INVITATION_NOT_PENDING':
      return 410;
    case 'ALREADY_OWNER':
    case 'ALREADY_COLLABORATOR':
    case 'INVITATION_EXISTS':
    case 'SELF_INVITATION':
    case 'CANNOT_CHANGE_OWN_ROLE':
      return 409;
    default:
      return 400;
  }
}

export { router as collaborationRouter };
