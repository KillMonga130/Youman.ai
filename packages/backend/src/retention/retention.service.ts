/**
 * Data Retention Service
 * Manages data lifecycle, retention policies, archival, and deletion
 * Requirements: 63 - Data lifecycle and retention policies
 */

import crypto from 'crypto';
import { prisma } from '../database/prisma';
import { Prisma } from '../generated/prisma';
import { logger } from '../utils/logger';
import { sendEmail } from '../collaboration/email.service';
import type {
  RetentionPolicy,
  RetentionPolicyInput,
  ArchivedProject,
  DeletionReport,
  ArchivedProjectInfo,
  DeletedProjectInfo,
  FailedDeletionInfo,
  ScheduledProject,
  NotificationResult,
  NotificationInfo,
  RetentionServiceConfig,
  CreateAuditLogOptions,
  GetAuditLogsOptions,
  AuditLogsResponse,
  RetentionAuditLogEntry,
  RetentionAction,
} from './types';

/** Default configuration */
const DEFAULT_CONFIG: RetentionServiceConfig = {
  enableAutoDelete: true,
  enableNotifications: true,
  defaultRetentionDays: 365,
  archiveBatchSize: 100,
  deletionBatchSize: 100,
};

/**
 * Custom error class for retention-related errors
 */
export class RetentionError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'RetentionError';
    this.code = code;
  }
}


/**
 * Data Retention Service class
 * Handles retention policy management, archival, and scheduled deletions
 */
export class RetentionService {
  private config: RetentionServiceConfig;

  constructor(serviceConfig?: Partial<RetentionServiceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...serviceConfig };
  }

  // ============================================
  // Retention Policy Management
  // ============================================

  /**
   * Configure retention policy for a user
   * Requirement 63: Create retention policy configuration
   */
  async configurePolicy(
    userId: string,
    input: RetentionPolicyInput,
    requestInfo?: { ipAddress?: string | undefined; userAgent?: string | undefined }
  ): Promise<RetentionPolicy> {
    // Check if policy already exists
    const existingPolicy = await prisma.retentionPolicy.findUnique({
      where: { userId },
    });

    let policy;
    let action: RetentionAction;

    if (existingPolicy) {
      // Update existing policy
      policy = await prisma.retentionPolicy.update({
        where: { userId },
        data: {
          defaultRetentionDays: input.defaultRetentionDays,
          archiveBeforeDelete: input.archiveBeforeDelete,
          notificationDays: input.notificationDays,
          autoDeleteEnabled: input.autoDeleteEnabled,
          exemptProjectIds: input.exemptProjectIds,
        },
      });
      action = 'POLICY_UPDATED';
    } else {
      // Create new policy
      policy = await prisma.retentionPolicy.create({
        data: {
          userId,
          defaultRetentionDays: input.defaultRetentionDays,
          archiveBeforeDelete: input.archiveBeforeDelete,
          notificationDays: input.notificationDays,
          autoDeleteEnabled: input.autoDeleteEnabled,
          exemptProjectIds: input.exemptProjectIds,
        },
      });
      action = 'POLICY_CREATED';
    }

    // Create audit log
    await this.createAuditLog({
      userId,
      action,
      details: { policy: input },
      ipAddress: requestInfo?.ipAddress,
      userAgent: requestInfo?.userAgent,
    });

    logger.info('Retention policy configured', { userId, action });

    return this.toRetentionPolicy(policy);
  }

  /**
   * Get retention policy for a user
   */
  async getPolicy(userId: string): Promise<RetentionPolicy | null> {
    const policy = await prisma.retentionPolicy.findUnique({
      where: { userId },
    });

    return policy ? this.toRetentionPolicy(policy) : null;
  }


  // ============================================
  // Project Expiration Scheduling
  // ============================================

  /**
   * Schedule expiration for a project
   * Requirement 63: Schedule project expiration
   */
  async scheduleExpiration(
    projectId: string,
    userId: string,
    expirationDate: Date,
    requestInfo?: { ipAddress?: string | undefined; userAgent?: string | undefined }
  ): Promise<{ projectId: string; expirationDate: Date }> {
    // Verify project exists and user is owner
    const project = await this.getProjectWithOwner(projectId, userId);

    // Update project with expiration date
    await prisma.project.update({
      where: { id: projectId },
      data: { expiresAt: expirationDate },
    });

    // Create audit log
    await this.createAuditLog({
      userId,
      action: 'POLICY_UPDATED',
      projectId,
      projectName: project.name,
      details: { expirationDate: expirationDate.toISOString() },
      ipAddress: requestInfo?.ipAddress,
      userAgent: requestInfo?.userAgent,
    });

    logger.info('Project expiration scheduled', {
      projectId,
      userId,
      expirationDate: expirationDate.toISOString(),
    });

    return { projectId, expirationDate };
  }

  // ============================================
  // Archival System
  // ============================================

  /**
   * Archive a project
   * Requirement 63: Add archival system
   */
  async archiveProject(
    projectId: string,
    userId: string,
    retentionDays?: number,
    requestInfo?: { ipAddress?: string | undefined; userAgent?: string | undefined }
  ): Promise<ArchivedProject> {
    // Get user's retention policy for default retention days
    const policy = await this.getPolicy(userId);
    const effectiveRetentionDays = retentionDays ?? policy?.defaultRetentionDays ?? this.config.defaultRetentionDays;

    // Verify project exists and user is owner
    const project = await this.getProjectWithOwner(projectId, userId);

    // Calculate scheduled delete date
    const scheduledDeleteAt = new Date();
    scheduledDeleteAt.setDate(scheduledDeleteAt.getDate() + effectiveRetentionDays);

    // Create archive entry
    const archive = await prisma.archivedProject.create({
      data: {
        originalId: projectId,
        userId,
        name: project.name,
        description: project.description,
        wordCount: project.wordCount,
        documentData: (project.settings as object) ?? undefined,
        metadata: {
          status: project.status,
          documentId: project.documentId,
          createdAt: project.createdAt.toISOString(),
          updatedAt: project.updatedAt.toISOString(),
        },
        retentionDays: effectiveRetentionDays,
        scheduledDeleteAt,
      },
    });

    // Soft delete the original project
    await prisma.project.update({
      where: { id: projectId },
      data: {
        deletedAt: new Date(),
        status: 'DELETED',
      },
    });

    // Create audit log
    await this.createAuditLog({
      userId,
      action: 'PROJECT_ARCHIVED',
      projectId,
      projectName: project.name,
      archiveId: archive.id,
      details: {
        retentionDays: effectiveRetentionDays,
        scheduledDeleteAt: scheduledDeleteAt.toISOString(),
      },
      ipAddress: requestInfo?.ipAddress,
      userAgent: requestInfo?.userAgent,
    });

    logger.info('Project archived', {
      projectId,
      archiveId: archive.id,
      userId,
      scheduledDeleteAt: scheduledDeleteAt.toISOString(),
    });

    return this.toArchivedProject(archive);
  }


  /**
   * Get archived projects for a user
   */
  async getArchivedProjects(userId: string): Promise<ArchivedProject[]> {
    const archives = await prisma.archivedProject.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      orderBy: { archivedAt: 'desc' },
    });

    return archives.map((a) => this.toArchivedProject(a));
  }

  /**
   * Restore an archived project
   */
  async restoreArchivedProject(
    archiveId: string,
    userId: string,
    requestInfo?: { ipAddress?: string | undefined; userAgent?: string | undefined }
  ): Promise<{ projectId: string; message: string }> {
    // Get archive and verify ownership
    const archive = await prisma.archivedProject.findUnique({
      where: { id: archiveId },
    });

    if (!archive) {
      throw new RetentionError('Archive not found', 'ARCHIVE_NOT_FOUND');
    }

    if (archive.userId !== userId) {
      throw new RetentionError('Access denied', 'ACCESS_DENIED');
    }

    if (archive.deletedAt) {
      throw new RetentionError('Archive has been permanently deleted', 'ARCHIVE_DELETED');
    }

    // Restore the project
    const project = await prisma.project.update({
      where: { id: archive.originalId },
      data: {
        deletedAt: null,
        status: 'ACTIVE',
      },
    });

    // Delete the archive entry
    await prisma.archivedProject.delete({
      where: { id: archiveId },
    });

    // Create audit log
    await this.createAuditLog({
      userId,
      action: 'ARCHIVE_DELETED',
      projectId: archive.originalId,
      projectName: archive.name,
      archiveId,
      details: { restored: true },
      ipAddress: requestInfo?.ipAddress,
      userAgent: requestInfo?.userAgent,
    });

    logger.info('Archived project restored', {
      archiveId,
      projectId: archive.originalId,
      userId,
    });

    return {
      projectId: project.id,
      message: 'Project restored successfully',
    };
  }

  // ============================================
  // Automatic Deletion Scheduler
  // ============================================

  /**
   * Delete expired projects based on retention policies
   * Requirement 63: Build automatic deletion scheduler
   */
  async deleteExpiredProjects(): Promise<DeletionReport> {
    const startTime = Date.now();
    const reportId = this.generateId('report');
    const archivedProjects: ArchivedProjectInfo[] = [];
    const deletedProjects: DeletedProjectInfo[] = [];
    const failedProjects: FailedDeletionInfo[] = [];
    let skippedCount = 0;

    if (!this.config.enableAutoDelete) {
      return this.createEmptyReport(reportId, startTime);
    }

    // Get all users with auto-delete enabled
    const policies = await prisma.retentionPolicy.findMany({
      where: { autoDeleteEnabled: true },
    });

    for (const policy of policies) {
      try {
        // Get projects that have exceeded retention period
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - policy.defaultRetentionDays);

        const expiredProjects = await prisma.project.findMany({
          where: {
            ownerId: policy.userId,
            deletedAt: null,
            status: { not: 'DELETED' },
            id: { notIn: policy.exemptProjectIds },
            updatedAt: { lt: cutoffDate },
          },
          take: this.config.archiveBatchSize,
        });

        for (const project of expiredProjects) {
          try {
            if (policy.archiveBeforeDelete) {
              // Archive the project first
              const archive = await this.archiveProject(
                project.id,
                policy.userId,
                policy.defaultRetentionDays
              );
              archivedProjects.push({
                projectId: project.id,
                archiveId: archive.id,
                name: project.name,
                wordCount: project.wordCount,
                scheduledDeleteAt: archive.scheduledDeleteAt,
              });
            } else {
              // Delete directly
              await this.permanentlyDeleteProject(project.id, policy.userId);
              deletedProjects.push({
                projectId: project.id,
                name: project.name,
                deletionType: 'project',
                ownerId: policy.userId,
              });
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            failedProjects.push({
              projectId: project.id,
              name: project.name,
              error: errorMessage,
            });
          }
        }
      } catch (error) {
        logger.error('Error processing retention policy', {
          userId: policy.userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Also delete archives that have passed their scheduled delete date
    const expiredArchives = await prisma.archivedProject.findMany({
      where: {
        deletedAt: null,
        scheduledDeleteAt: { lte: new Date() },
      },
      take: this.config.deletionBatchSize,
    });

    for (const archive of expiredArchives) {
      try {
        await this.permanentlyDeleteArchive(archive.id, archive.userId);
        deletedProjects.push({
          projectId: archive.originalId,
          name: archive.name,
          deletionType: 'archive',
          ownerId: archive.userId,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        failedProjects.push({
          projectId: archive.originalId,
          name: archive.name,
          error: errorMessage,
        });
      }
    }

    const durationMs = Date.now() - startTime;

    logger.info('Expired projects deletion completed', {
      reportId,
      archivedCount: archivedProjects.length,
      deletedCount: deletedProjects.length,
      failedCount: failedProjects.length,
      durationMs,
    });

    return {
      id: reportId,
      timestamp: new Date(),
      totalProcessed: archivedProjects.length + deletedProjects.length + failedProjects.length,
      archivedCount: archivedProjects.length,
      deletedCount: deletedProjects.length,
      failedCount: failedProjects.length,
      skippedCount,
      archivedProjects,
      deletedProjects,
      failedProjects,
      durationMs,
    };
  }


  // ============================================
  // Deletion Notifications
  // ============================================

  /**
   * Send deletion warning notifications
   * Requirement 63: Implement deletion notifications
   */
  async sendDeletionNotifications(): Promise<NotificationResult> {
    if (!this.config.enableNotifications) {
      return {
        totalNotifications: 0,
        sentCount: 0,
        failedCount: 0,
        notifications: [],
        timestamp: new Date(),
      };
    }

    const notifications: NotificationInfo[] = [];
    let sentCount = 0;
    let failedCount = 0;

    // Get all policies with notifications enabled
    const policies = await prisma.retentionPolicy.findMany({
      where: { autoDeleteEnabled: true },
    });

    for (const policy of policies) {
      // Get user info
      const user = await prisma.user.findUnique({
        where: { id: policy.userId },
        select: { email: true, firstName: true, lastName: true },
      });

      if (!user) continue;

      for (const notificationDay of policy.notificationDays) {
        // Find projects that will be deleted in X days
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + notificationDay);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - policy.defaultRetentionDays + notificationDay);

        // Check for projects approaching retention limit
        const projectsToNotify = await prisma.project.findMany({
          where: {
            ownerId: policy.userId,
            deletedAt: null,
            status: { not: 'DELETED' },
            id: { notIn: policy.exemptProjectIds },
            updatedAt: {
              gte: new Date(cutoffDate.getTime() - 24 * 60 * 60 * 1000),
              lt: new Date(cutoffDate.getTime() + 24 * 60 * 60 * 1000),
            },
          },
        });

        for (const project of projectsToNotify) {
          const notification: NotificationInfo = {
            projectId: project.id,
            projectName: project.name,
            ownerEmail: user.email,
            daysRemaining: notificationDay,
            notificationType: 'deletion_warning',
          };

          notifications.push(notification);

          try {
            await this.sendDeletionWarningEmail({
              to: user.email,
              name: this.formatUserName(user),
              projectName: project.name,
              projectId: project.id,
              daysRemaining: notificationDay,
              isArchive: false,
            });

            // Create audit log
            await this.createAuditLog({
              userId: policy.userId,
              action: 'NOTIFICATION_SENT',
              projectId: project.id,
              projectName: project.name,
              details: { daysRemaining: notificationDay, type: 'deletion_warning' },
            });

            sentCount++;
          } catch (error) {
            logger.error('Failed to send deletion notification', {
              projectId: project.id,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            failedCount++;
          }
        }
      }
    }

    // Also notify about archives approaching permanent deletion
    for (const notificationDay of [30, 7, 1]) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + notificationDay);

      const archivesToNotify = await prisma.archivedProject.findMany({
        where: {
          deletedAt: null,
          scheduledDeleteAt: {
            gte: new Date(targetDate.getTime() - 24 * 60 * 60 * 1000),
            lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      });

      for (const archive of archivesToNotify) {
        const user = await prisma.user.findUnique({
          where: { id: archive.userId },
          select: { email: true, firstName: true, lastName: true },
        });

        if (!user) continue;

        const notification: NotificationInfo = {
          projectId: archive.originalId,
          projectName: archive.name,
          ownerEmail: user.email,
          daysRemaining: notificationDay,
          notificationType: 'archive_warning',
        };

        notifications.push(notification);

        try {
          await this.sendDeletionWarningEmail({
            to: user.email,
            name: this.formatUserName(user),
            projectName: archive.name,
            projectId: archive.originalId,
            daysRemaining: notificationDay,
            isArchive: true,
            archiveId: archive.id,
          });

          await this.createAuditLog({
            userId: archive.userId,
            action: 'NOTIFICATION_SENT',
            projectId: archive.originalId,
            projectName: archive.name,
            archiveId: archive.id,
            details: { daysRemaining: notificationDay, type: 'archive_warning' },
          });

          sentCount++;
        } catch (error) {
          logger.error('Failed to send archive deletion notification', {
            archiveId: archive.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          failedCount++;
        }
      }
    }

    logger.info('Deletion notifications sent', {
      totalNotifications: notifications.length,
      sentCount,
      failedCount,
    });

    return {
      totalNotifications: notifications.length,
      sentCount,
      failedCount,
      notifications,
      timestamp: new Date(),
    };
  }


  // ============================================
  // Audit Logging
  // ============================================

  /**
   * Create audit log entry
   * Requirement 63: Create audit logs for deletions
   */
  async createAuditLog(options: CreateAuditLogOptions): Promise<RetentionAuditLogEntry> {
    const log = await prisma.retentionAuditLog.create({
      data: {
        userId: options.userId,
        action: options.action,
        projectId: options.projectId ?? null,
        projectName: options.projectName ?? null,
        archiveId: options.archiveId ?? null,
        details: (options.details as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        ipAddress: options.ipAddress ?? null,
        userAgent: options.userAgent ?? null,
      },
    });

    return this.toAuditLogEntry(log);
  }

  /**
   * Get audit logs with filtering and pagination
   */
  async getAuditLogs(options: GetAuditLogsOptions): Promise<AuditLogsResponse> {
    const { userId, action, projectId, startDate, endDate, page = 1, limit = 50 } = options;
    const skip = (page - 1) * limit;

    const whereClause: {
      userId?: string;
      action?: RetentionAction;
      projectId?: string;
      createdAt?: { gte?: Date; lte?: Date };
    } = {};

    if (userId) whereClause.userId = userId;
    if (action) whereClause.action = action;
    if (projectId) whereClause.projectId = projectId;
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = startDate;
      if (endDate) whereClause.createdAt.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.retentionAuditLog.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.retentionAuditLog.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      logs: logs.map((l) => this.toAuditLogEntry(l)),
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
   * Get scheduled projects for a user
   */
  async getScheduledProjects(userId: string): Promise<ScheduledProject[]> {
    const policy = await this.getPolicy(userId);
    if (!policy || !policy.autoDeleteEnabled) {
      return [];
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.defaultRetentionDays);

    // Get projects approaching deletion
    const projects = await prisma.project.findMany({
      where: {
        ownerId: userId,
        deletedAt: null,
        status: { not: 'DELETED' },
        id: { notIn: policy.exemptProjectIds },
        updatedAt: { lt: cutoffDate },
      },
      include: {
        owner: { select: { email: true } },
      },
    });

    // Get archived projects
    const archives = await prisma.archivedProject.findMany({
      where: {
        userId,
        deletedAt: null,
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    const scheduledProjects: ScheduledProject[] = [];

    // Add projects
    for (const project of projects) {
      const scheduledDeleteAt = new Date(project.updatedAt);
      scheduledDeleteAt.setDate(scheduledDeleteAt.getDate() + policy.defaultRetentionDays);

      scheduledProjects.push({
        projectId: project.id,
        name: project.name,
        ownerId: userId,
        ownerEmail: user?.email || '',
        scheduledDeleteAt,
        daysRemaining: this.calculateDaysRemaining(scheduledDeleteAt),
        isArchived: false,
      });
    }

    // Add archives
    for (const archive of archives) {
      scheduledProjects.push({
        projectId: archive.originalId,
        name: archive.name,
        ownerId: userId,
        ownerEmail: user?.email || '',
        scheduledDeleteAt: archive.scheduledDeleteAt,
        daysRemaining: this.calculateDaysRemaining(archive.scheduledDeleteAt),
        isArchived: true,
        archiveId: archive.id,
      });
    }

    return scheduledProjects.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }


  // ============================================
  // Private Helper Methods
  // ============================================

  /**
   * Generates a unique identifier
   */
  private generateId(prefix: string): string {
    return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Gets project and verifies ownership
   */
  private async getProjectWithOwner(
    projectId: string,
    userId: string
  ): Promise<{
    id: string;
    name: string;
    description: string | null;
    wordCount: number;
    status: 'ACTIVE' | 'ARCHIVED' | 'DELETED';
    documentId: string | null;
    settings: unknown;
    createdAt: Date;
    updatedAt: Date;
  }> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new RetentionError('Project not found', 'PROJECT_NOT_FOUND');
    }

    if (project.deletedAt || project.status === 'DELETED') {
      throw new RetentionError('Project not found', 'PROJECT_NOT_FOUND');
    }

    if (project.ownerId !== userId) {
      throw new RetentionError('Access denied', 'ACCESS_DENIED');
    }

    return project;
  }

  /**
   * Permanently delete a project
   */
  private async permanentlyDeleteProject(projectId: string, userId: string): Promise<void> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) return;

    // Delete the project permanently
    await prisma.project.delete({
      where: { id: projectId },
    });

    // Create audit log
    await this.createAuditLog({
      userId,
      action: 'PROJECT_DELETED',
      projectId,
      projectName: project.name,
      details: { permanent: true },
    });

    logger.info('Project permanently deleted', { projectId, userId });
  }

  /**
   * Permanently delete an archive
   */
  private async permanentlyDeleteArchive(archiveId: string, userId: string): Promise<void> {
    const archive = await prisma.archivedProject.findUnique({
      where: { id: archiveId },
    });

    if (!archive) return;

    // Mark archive as deleted
    await prisma.archivedProject.update({
      where: { id: archiveId },
      data: { deletedAt: new Date() },
    });

    // Create audit log
    await this.createAuditLog({
      userId,
      action: 'ARCHIVE_DELETED',
      projectId: archive.originalId,
      projectName: archive.name,
      archiveId,
      details: { permanent: true },
    });

    logger.info('Archive permanently deleted', { archiveId, userId });
  }

  /**
   * Calculate days remaining until a date
   */
  private calculateDaysRemaining(date: Date): number {
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Format user name for notifications
   */
  private formatUserName(user: { firstName: string | null; lastName: string | null }): string {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.firstName || user.lastName || 'User';
  }

  /**
   * Create empty deletion report
   */
  private createEmptyReport(reportId: string, startTime: number): DeletionReport {
    return {
      id: reportId,
      timestamp: new Date(),
      totalProcessed: 0,
      archivedCount: 0,
      deletedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      archivedProjects: [],
      deletedProjects: [],
      failedProjects: [],
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Convert database retention policy to response type
   */
  private toRetentionPolicy(policy: {
    id: string;
    userId: string;
    defaultRetentionDays: number;
    archiveBeforeDelete: boolean;
    notificationDays: number[];
    autoDeleteEnabled: boolean;
    exemptProjectIds: string[];
    createdAt: Date;
    updatedAt: Date;
  }): RetentionPolicy {
    return {
      id: policy.id,
      userId: policy.userId,
      defaultRetentionDays: policy.defaultRetentionDays,
      archiveBeforeDelete: policy.archiveBeforeDelete,
      notificationDays: policy.notificationDays,
      autoDeleteEnabled: policy.autoDeleteEnabled,
      exemptProjectIds: policy.exemptProjectIds,
      createdAt: policy.createdAt,
      updatedAt: policy.updatedAt,
    };
  }

  /**
   * Convert database archived project to response type
   */
  private toArchivedProject(archive: {
    id: string;
    originalId: string;
    userId: string;
    name: string;
    description: string | null;
    wordCount: number;
    documentData: unknown;
    metadata: unknown;
    archivedAt: Date;
    retentionDays: number;
    scheduledDeleteAt: Date;
    deletedAt: Date | null;
  }): ArchivedProject {
    return {
      id: archive.id,
      originalId: archive.originalId,
      userId: archive.userId,
      name: archive.name,
      description: archive.description,
      wordCount: archive.wordCount,
      documentData: archive.documentData,
      metadata: archive.metadata,
      archivedAt: archive.archivedAt,
      retentionDays: archive.retentionDays,
      scheduledDeleteAt: archive.scheduledDeleteAt,
      deletedAt: archive.deletedAt,
    };
  }

  /**
   * Convert database audit log to response type
   */
  private toAuditLogEntry(log: {
    id: string;
    userId: string;
    action: RetentionAction;
    projectId: string | null;
    projectName: string | null;
    archiveId: string | null;
    details: unknown;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: Date;
  }): RetentionAuditLogEntry {
    return {
      id: log.id,
      userId: log.userId,
      action: log.action,
      projectId: log.projectId,
      projectName: log.projectName,
      archiveId: log.archiveId,
      details: log.details,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt,
    };
  }


  /**
   * Send deletion warning email
   */
  private async sendDeletionWarningEmail(params: {
    to: string;
    name?: string;
    projectName: string;
    projectId: string;
    daysRemaining: number;
    isArchive: boolean;
    archiveId?: string;
  }): Promise<void> {
    const { to, name, projectName, projectId, daysRemaining, isArchive, archiveId } = params;

    const greeting = name ? `Hello ${name},` : 'Hello,';
    const contentType = isArchive ? 'archived project' : 'project';
    const actionUrl = isArchive
      ? `${process.env.APP_URL || 'http://localhost:3000'}/archives/${archiveId}`
      : `${process.env.APP_URL || 'http://localhost:3000'}/projects/${projectId}`;

    const subject = `[AI Humanizer] ${contentType.charAt(0).toUpperCase() + contentType.slice(1)} "${projectName}" will be deleted in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Deletion Warning</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #e74c3c; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Deletion Warning</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p>${greeting}</p>
          <p>Your ${contentType} <strong>"${projectName}"</strong> is scheduled for permanent deletion.</p>
          
          <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
            <span style="font-size: 24px; font-weight: bold; color: #e74c3c;">${daysRemaining}</span>
            <span style="color: #666;"> day${daysRemaining === 1 ? '' : 's'} remaining</span>
          </div>
          
          <p>To prevent deletion, you can:</p>
          <ul>
            <li>${isArchive ? 'Restore the project from the archive' : 'Update the project to reset the retention timer'}</li>
            <li>Add the project to your exempt list in retention settings</li>
            <li>Disable auto-delete in your retention policy</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${actionUrl}" 
               style="background: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              ${isArchive ? 'View Archive' : 'View Project'}
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} AI Humanizer. All rights reserved.
          </p>
        </div>
      </body>
      </html>
    `;

    await sendEmail({ to, subject, html });
  }
}

// Export singleton instance
export const retentionService = new RetentionService();
