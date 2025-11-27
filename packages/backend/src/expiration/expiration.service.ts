/**
 * Content Expiration Service
 * Manages time-based content deletion and expiration reminders
 * Requirements: 75 - Content expiration with automatic deletion
 */

import crypto from 'crypto';
import { prisma } from '../database/prisma';
import { logger } from '../utils/logger';
import { sendEmail } from '../collaboration/email.service';
import {
  ExpiringProject,
  DeletionReport,
  DeletedProjectInfo,
  FailedDeletionInfo,
  SetExpirationOptions,
  ExtendExpirationOptions,
  RemoveExpirationOptions,
  ExpirationReminder,
  ReminderResult,
  ExpirationServiceConfig,
  ExpirationNotificationOptions,
  ProjectExpirationInfo,
  ExpirationStatus,
  REMINDER_DAYS,
  ReminderDay,
} from './types';

/** Default configuration */
const DEFAULT_CONFIG: ExpirationServiceConfig = {
  enableAutoDeletion: true,
  enableReminders: true,
  reminderDays: REMINDER_DAYS,
  minExpirationDays: 1,
  maxExpirationDays: 365,
  deletionBatchSize: 100,
};

/**
 * Custom error class for expiration-related errors
 */
export class ExpirationError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'ExpirationError';
    this.code = code;
  }
}

/**
 * Content Expiration Service class
 * Handles expiration setting, reminders, and automatic deletion
 */
export class ExpirationService {
  private config: ExpirationServiceConfig;

  constructor(serviceConfig?: Partial<ExpirationServiceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...serviceConfig };
  }

  /**
   * Sets expiration date for a project
   * Requirement 75.1: Allow users to specify expiration date
   * @param options - Set expiration options
   */
  async setExpiration(options: SetExpirationOptions): Promise<ProjectExpirationInfo> {
    const { projectId, userId, expirationDate, sendNotification = true } = options;

    // Validate expiration date
    this.validateExpirationDate(expirationDate);

    // Get project and verify ownership
    const project = await this.getProjectWithOwner(projectId, userId);

    // Update project with expiration date
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: { expiresAt: expirationDate },
      include: {
        owner: {
          select: { email: true, firstName: true, lastName: true },
        },
      },
    });

    logger.info('Expiration set for project', {
      projectId,
      userId,
      expirationDate: expirationDate.toISOString(),
    });

    // Send notification if enabled
    if (sendNotification && this.config.enableReminders) {
      await this.sendExpirationNotification({
        to: updatedProject.owner.email,
        name: this.formatOwnerName(updatedProject.owner),
        projectName: updatedProject.name,
        projectId,
        type: 'expiration_set',
        expirationDate,
        daysRemaining: this.calculateDaysRemaining(expirationDate),
      });
    }

    return this.toProjectExpirationInfo(updatedProject);
  }

  /**
   * Extends expiration date for a project
   * Requirement 75.4: Allow users to extend expiration dates
   * @param options - Extend expiration options
   */
  async extendExpiration(options: ExtendExpirationOptions): Promise<ProjectExpirationInfo> {
    const { projectId, userId, newExpirationDate, sendNotification = true } = options;

    // Validate new expiration date
    this.validateExpirationDate(newExpirationDate);

    // Get project and verify ownership
    const project = await this.getProjectWithOwner(projectId, userId);

    // Verify project has existing expiration
    if (!project.expiresAt) {
      throw new ExpirationError(
        'Project does not have an expiration date set',
        'NO_EXPIRATION_SET'
      );
    }

    // Verify new date is after current expiration
    if (newExpirationDate <= project.expiresAt) {
      throw new ExpirationError(
        'New expiration date must be after current expiration date',
        'INVALID_EXTENSION_DATE'
      );
    }

    // Update project with new expiration date
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: { expiresAt: newExpirationDate },
      include: {
        owner: {
          select: { email: true, firstName: true, lastName: true },
        },
      },
    });

    logger.info('Expiration extended for project', {
      projectId,
      userId,
      oldExpirationDate: project.expiresAt.toISOString(),
      newExpirationDate: newExpirationDate.toISOString(),
    });

    // Send notification if enabled
    if (sendNotification && this.config.enableReminders) {
      await this.sendExpirationNotification({
        to: updatedProject.owner.email,
        name: this.formatOwnerName(updatedProject.owner),
        projectName: updatedProject.name,
        projectId,
        type: 'expiration_extended',
        expirationDate: newExpirationDate,
        daysRemaining: this.calculateDaysRemaining(newExpirationDate),
      });
    }

    return this.toProjectExpirationInfo(updatedProject);
  }

  /**
   * Removes expiration from a project
   * @param options - Remove expiration options
   */
  async removeExpiration(options: RemoveExpirationOptions): Promise<ProjectExpirationInfo> {
    const { projectId, userId } = options;

    // Get project and verify ownership
    await this.getProjectWithOwner(projectId, userId);

    // Update project to remove expiration
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: { expiresAt: null },
      include: {
        owner: {
          select: { email: true, firstName: true, lastName: true },
        },
      },
    });

    logger.info('Expiration removed from project', { projectId, userId });

    return this.toProjectExpirationInfo(updatedProject);
  }

  /**
   * Gets expiration info for a project
   * @param projectId - Project identifier
   * @param userId - User identifier
   */
  async getExpirationInfo(projectId: string, userId: string): Promise<ProjectExpirationInfo> {
    const project = await this.getProjectWithOwner(projectId, userId);
    return this.toProjectExpirationInfo(project);
  }

  /**
   * Sends expiration reminder notifications
   * Requirement 75.2: Send reminders 7, 3, and 1 days before expiration
   */
  async sendExpirationReminders(): Promise<ReminderResult> {
    if (!this.config.enableReminders) {
      return {
        totalReminders: 0,
        sentCount: 0,
        failedCount: 0,
        reminders: [],
        timestamp: new Date(),
      };
    }

    const reminders: ExpirationReminder[] = [];
    let sentCount = 0;
    let failedCount = 0;

    // Process each reminder day
    for (const reminderDay of this.config.reminderDays) {
      const projectsToRemind = await this.getProjectsExpiringInDays(reminderDay);

      for (const project of projectsToRemind) {
        const reminder: ExpirationReminder = {
          projectId: project.projectId,
          projectName: project.name,
          ownerEmail: project.ownerEmail || '',
          expirationDate: project.expirationDate,
          daysRemaining: project.daysRemaining,
          reminderDay: reminderDay as ReminderDay,
        };

        reminders.push(reminder);

        if (project.ownerEmail) {
          try {
            await this.sendExpirationNotification({
              to: project.ownerEmail,
              projectName: project.name,
              projectId: project.projectId,
              type: 'expiration_reminder',
              expirationDate: project.expirationDate,
              daysRemaining: project.daysRemaining,
            });
            sentCount++;
          } catch (error) {
            logger.error('Failed to send expiration reminder', {
              projectId: project.projectId,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            failedCount++;
          }
        }
      }
    }

    logger.info('Expiration reminders sent', {
      totalReminders: reminders.length,
      sentCount,
      failedCount,
    });

    return {
      totalReminders: reminders.length,
      sentCount,
      failedCount,
      reminders,
      timestamp: new Date(),
    };
  }

  /**
   * Deletes expired content
   * Requirement 75.3: Automatically delete expired content
   */
  async deleteExpiredContent(): Promise<DeletionReport> {
    const startTime = Date.now();
    const reportId = this.generateId('report');
    const deletedProjects: DeletedProjectInfo[] = [];
    const failedProjects: FailedDeletionInfo[] = [];
    let skippedCount = 0;

    if (!this.config.enableAutoDeletion) {
      return {
        id: reportId,
        timestamp: new Date(),
        totalProcessed: 0,
        deletedCount: 0,
        failedCount: 0,
        skippedCount: 0,
        deletedProjects: [],
        failedProjects: [],
        durationMs: Date.now() - startTime,
      };
    }

    // Get all expired projects
    const expiredProjects = await prisma.project.findMany({
      where: {
        expiresAt: {
          lte: new Date(),
        },
        deletedAt: null,
        status: { not: 'DELETED' },
      },
      include: {
        owner: {
          select: { email: true, firstName: true, lastName: true },
        },
      },
      take: this.config.deletionBatchSize,
    });

    for (const project of expiredProjects) {
      try {
        // Skip if already deleted
        if (project.deletedAt || project.status === 'DELETED') {
          skippedCount++;
          continue;
        }

        // Soft delete the project
        await prisma.project.update({
          where: { id: project.id },
          data: {
            deletedAt: new Date(),
            status: 'DELETED',
          },
        });

        deletedProjects.push({
          projectId: project.id,
          name: project.name,
          expirationDate: project.expiresAt!,
          ownerId: project.ownerId,
          wordCount: project.wordCount,
        });

        // Send deletion notification
        if (this.config.enableReminders && project.owner.email) {
          await this.sendExpirationNotification({
            to: project.owner.email,
            name: this.formatOwnerName(project.owner),
            projectName: project.name,
            projectId: project.id,
            type: 'content_deleted',
          });
        }

        logger.info('Expired project deleted', {
          projectId: project.id,
          ownerId: project.ownerId,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        failedProjects.push({
          projectId: project.id,
          name: project.name,
          error: errorMessage,
        });
        logger.error('Failed to delete expired project', {
          projectId: project.id,
          error: errorMessage,
        });
      }
    }

    const durationMs = Date.now() - startTime;

    logger.info('Expired content deletion completed', {
      reportId,
      totalProcessed: expiredProjects.length,
      deletedCount: deletedProjects.length,
      failedCount: failedProjects.length,
      skippedCount,
      durationMs,
    });

    return {
      id: reportId,
      timestamp: new Date(),
      totalProcessed: expiredProjects.length,
      deletedCount: deletedProjects.length,
      failedCount: failedProjects.length,
      skippedCount,
      deletedProjects,
      failedProjects,
      durationMs,
    };
  }

  /**
   * Gets expiring projects for a user
   * @param userId - User identifier
   */
  async getExpiringProjects(userId: string): Promise<ExpiringProject[]> {
    const projects = await prisma.project.findMany({
      where: {
        ownerId: userId,
        expiresAt: { not: null },
        deletedAt: null,
        status: { not: 'DELETED' },
      },
      include: {
        owner: {
          select: { email: true },
        },
      },
      orderBy: { expiresAt: 'asc' },
    });

    return projects.map((project) => this.toExpiringProject(project));
  }

  /**
   * Gets projects expiring in a specific number of days
   * Used for sending reminder notifications
   * @param days - Number of days until expiration
   */
  private async getProjectsExpiringInDays(days: number): Promise<ExpiringProject[]> {
    const now = new Date();
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + days);

    // Set to start and end of the target day
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const projects = await prisma.project.findMany({
      where: {
        expiresAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        deletedAt: null,
        status: { not: 'DELETED' },
      },
      include: {
        owner: {
          select: { email: true },
        },
      },
    });

    return projects.map((project) => this.toExpiringProject(project));
  }

  // ============ Private Helper Methods ============

  /**
   * Generates a unique identifier
   */
  private generateId(prefix: string): string {
    return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Validates expiration date
   */
  private validateExpirationDate(date: Date): void {
    const now = new Date();
    const minDate = new Date(now);
    minDate.setDate(minDate.getDate() + this.config.minExpirationDays);

    const maxDate = new Date(now);
    maxDate.setDate(maxDate.getDate() + this.config.maxExpirationDays);

    if (date < minDate) {
      throw new ExpirationError(
        `Expiration date must be at least ${this.config.minExpirationDays} day(s) in the future`,
        'EXPIRATION_TOO_SOON'
      );
    }

    if (date > maxDate) {
      throw new ExpirationError(
        `Expiration date cannot be more than ${this.config.maxExpirationDays} days in the future`,
        'EXPIRATION_TOO_FAR'
      );
    }
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
    expiresAt: Date | null;
    ownerId: string;
    wordCount: number;
    status: 'ACTIVE' | 'ARCHIVED' | 'DELETED';
    deletedAt: Date | null;
    owner: { email: string; firstName: string | null; lastName: string | null };
  }> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        owner: {
          select: { email: true, firstName: true, lastName: true },
        },
      },
    });

    if (!project) {
      throw new ExpirationError('Project not found', 'PROJECT_NOT_FOUND');
    }

    if (project.deletedAt || project.status === 'DELETED') {
      throw new ExpirationError('Project not found', 'PROJECT_NOT_FOUND');
    }

    if (project.ownerId !== userId) {
      throw new ExpirationError(
        'Only the project owner can manage expiration settings',
        'ACCESS_DENIED'
      );
    }

    return project;
  }

  /**
   * Calculates days remaining until expiration
   */
  private calculateDaysRemaining(expirationDate: Date): number {
    const now = new Date();
    const diffTime = expirationDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Determines expiration status
   */
  private getExpirationStatus(expiresAt: Date | null): ExpirationStatus {
    if (!expiresAt) {
      return 'no_expiration';
    }

    const daysRemaining = this.calculateDaysRemaining(expiresAt);

    if (daysRemaining <= 0) {
      return 'expired';
    }

    if (daysRemaining <= 7) {
      return 'expiring_soon';
    }

    return 'active';
  }

  /**
   * Formats owner name for notifications
   */
  private formatOwnerName(owner: { firstName: string | null; lastName: string | null }): string {
    if (owner.firstName && owner.lastName) {
      return `${owner.firstName} ${owner.lastName}`;
    }
    return owner.firstName || owner.lastName || 'User';
  }

  /**
   * Converts project to ExpiringProject format
   */
  private toExpiringProject(project: {
    id: string;
    name: string;
    expiresAt: Date | null;
    ownerId: string;
    wordCount: number;
    owner: { email: string };
  }): ExpiringProject {
    const daysRemaining = project.expiresAt
      ? this.calculateDaysRemaining(project.expiresAt)
      : 0;

    return {
      projectId: project.id,
      name: project.name,
      expirationDate: project.expiresAt!,
      daysRemaining,
      ownerId: project.ownerId,
      ownerEmail: project.owner.email,
      wordCount: project.wordCount,
      status: this.getExpirationStatus(project.expiresAt),
    };
  }

  /**
   * Converts project to ProjectExpirationInfo format
   */
  private toProjectExpirationInfo(project: {
    id: string;
    name: string;
    expiresAt: Date | null;
    status: 'ACTIVE' | 'ARCHIVED' | 'DELETED';
  }): ProjectExpirationInfo {
    const daysRemaining = project.expiresAt
      ? this.calculateDaysRemaining(project.expiresAt)
      : null;

    const status = this.getExpirationStatus(project.expiresAt);

    return {
      projectId: project.id,
      name: project.name,
      hasExpiration: project.expiresAt !== null,
      expirationDate: project.expiresAt,
      daysRemaining,
      status,
      canExtend: project.expiresAt !== null && status !== 'expired',
    };
  }

  /**
   * Sends expiration notification email
   */
  private async sendExpirationNotification(
    options: ExpirationNotificationOptions
  ): Promise<void> {
    const { to, name, projectName, projectId, type, expirationDate, daysRemaining } = options;

    let subject: string;
    let html: string;

    switch (type) {
      case 'expiration_set':
        subject = `[AI Humanizer] Expiration Set: ${projectName}`;
        html = this.buildNotificationHtml({
          title: 'Expiration Date Set',
          name,
          projectName,
          message: `Your project "${projectName}" has been set to expire on ${expirationDate?.toLocaleDateString()}.`,
          color: '#3498db',
          daysRemaining,
          showExtendLink: true,
          projectId,
        });
        break;

      case 'expiration_extended':
        subject = `[AI Humanizer] Expiration Extended: ${projectName}`;
        html = this.buildNotificationHtml({
          title: 'Expiration Date Extended',
          name,
          projectName,
          message: `Your project "${projectName}" expiration has been extended to ${expirationDate?.toLocaleDateString()}.`,
          color: '#27ae60',
          daysRemaining,
          showExtendLink: false,
          projectId,
        });
        break;

      case 'expiration_reminder':
        subject = `[AI Humanizer] Expiring Soon: ${projectName} (${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining)`;
        html = this.buildNotificationHtml({
          title: 'Content Expiring Soon',
          name,
          projectName,
          message: `Your project "${projectName}" will expire in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} on ${expirationDate?.toLocaleDateString()}.`,
          color: '#f39c12',
          daysRemaining,
          showExtendLink: true,
          projectId,
        });
        break;

      case 'content_deleted':
        subject = `[AI Humanizer] Content Deleted: ${projectName}`;
        html = this.buildNotificationHtml({
          title: 'Content Has Been Deleted',
          name,
          projectName,
          message: `Your project "${projectName}" has been automatically deleted due to expiration.`,
          color: '#e74c3c',
          showExtendLink: false,
          projectId,
        });
        break;

      default:
        return;
    }

    try {
      await sendEmail({ to, subject, html });
    } catch (error) {
      logger.error('Failed to send expiration notification:', error);
    }
  }

  /**
   * Builds notification email HTML
   */
  private buildNotificationHtml(params: {
    title: string;
    name?: string;
    projectName: string;
    message: string;
    color: string;
    daysRemaining?: number;
    showExtendLink: boolean;
    projectId: string;
  }): string {
    const { title, name, projectName, message, color, daysRemaining, showExtendLink, projectId } =
      params;

    const greeting = name ? `Hello ${name},` : 'Hello,';

    let actionHtml = '';
    if (showExtendLink) {
      actionHtml = `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.APP_URL || 'http://localhost:3000'}/projects/${projectId}/settings" 
             style="background: ${color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Manage Expiration
          </a>
        </div>
      `;
    }

    let daysHtml = '';
    if (daysRemaining !== undefined && daysRemaining > 0) {
      daysHtml = `
        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 20px; text-align: center;">
          <span style="font-size: 24px; font-weight: bold; color: ${color};">${daysRemaining}</span>
          <span style="color: #666;"> day${daysRemaining === 1 ? '' : 's'} remaining</span>
        </div>
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: ${color}; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">${title}</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p>${greeting}</p>
          <p>${message}</p>
          
          ${daysHtml}
          ${actionHtml}
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} AI Humanizer. All rights reserved.
          </p>
        </div>
      </body>
      </html>
    `;
  }
}

// Export singleton instance
export const expirationService = new ExpirationService();
