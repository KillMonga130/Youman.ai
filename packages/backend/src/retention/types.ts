/**
 * Data Retention Service Types
 * Type definitions for data retention policies, archival, and deletion
 * Requirements: 63 - Data lifecycle and retention policies
 */

import { z } from 'zod';

// ============================================
// Enums
// ============================================

/**
 * Retention action types for audit logging
 */
export type RetentionAction =
  | 'POLICY_CREATED'
  | 'POLICY_UPDATED'
  | 'PROJECT_ARCHIVED'
  | 'PROJECT_DELETED'
  | 'ARCHIVE_DELETED'
  | 'NOTIFICATION_SENT'
  | 'AUTO_DELETE_TRIGGERED';

// ============================================
// Validation Schemas
// ============================================

/**
 * Schema for creating/updating retention policy
 */
export const retentionPolicySchema = z.object({
  defaultRetentionDays: z
    .number()
    .min(1, 'Retention days must be at least 1')
    .max(3650, 'Retention days cannot exceed 10 years')
    .default(365),
  archiveBeforeDelete: z.boolean().default(true),
  notificationDays: z
    .array(z.number().min(1).max(365))
    .default([30, 7, 1]),
  autoDeleteEnabled: z.boolean().default(false),
  exemptProjectIds: z.array(z.string().uuid()).default([]),
});

/**
 * Schema for scheduling project expiration
 */
export const scheduleExpirationSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  expirationDate: z.coerce.date().refine(
    (date) => date > new Date(),
    'Expiration date must be in the future'
  ),
});

/**
 * Schema for archiving a project
 */
export const archiveProjectSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  retentionDays: z.number().min(1).max(3650).optional(),
});

// ============================================
// Types derived from schemas
// ============================================

export type RetentionPolicyInput = z.infer<typeof retentionPolicySchema>;
export type ScheduleExpirationInput = z.infer<typeof scheduleExpirationSchema>;
export type ArchiveProjectInput = z.infer<typeof archiveProjectSchema>;

// ============================================
// Response Types
// ============================================

/**
 * Retention policy configuration
 */
export interface RetentionPolicy {
  id: string;
  userId: string;
  defaultRetentionDays: number;
  archiveBeforeDelete: boolean;
  notificationDays: number[];
  autoDeleteEnabled: boolean;
  exemptProjectIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Archived project information
 */
export interface ArchivedProject {
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
}

/**
 * Retention audit log entry
 */
export interface RetentionAuditLogEntry {
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
}

/**
 * Deletion report for scheduled deletions
 */
export interface DeletionReport {
  id: string;
  timestamp: Date;
  totalProcessed: number;
  archivedCount: number;
  deletedCount: number;
  failedCount: number;
  skippedCount: number;
  archivedProjects: ArchivedProjectInfo[];
  deletedProjects: DeletedProjectInfo[];
  failedProjects: FailedDeletionInfo[];
  durationMs: number;
}

/**
 * Information about an archived project
 */
export interface ArchivedProjectInfo {
  projectId: string;
  archiveId: string;
  name: string;
  wordCount: number;
  scheduledDeleteAt: Date;
}

/**
 * Information about a deleted project
 */
export interface DeletedProjectInfo {
  projectId: string;
  name: string;
  deletionType: 'project' | 'archive';
  ownerId: string;
}

/**
 * Information about a failed deletion
 */
export interface FailedDeletionInfo {
  projectId: string;
  name: string;
  error: string;
}

/**
 * Project scheduled for deletion
 */
export interface ScheduledProject {
  projectId: string;
  name: string;
  ownerId: string;
  ownerEmail: string;
  scheduledDeleteAt: Date;
  daysRemaining: number;
  isArchived: boolean;
  archiveId?: string;
}

/**
 * Notification result
 */
export interface NotificationResult {
  totalNotifications: number;
  sentCount: number;
  failedCount: number;
  notifications: NotificationInfo[];
  timestamp: Date;
}

/**
 * Individual notification info
 */
export interface NotificationInfo {
  projectId: string;
  projectName: string;
  ownerEmail: string;
  daysRemaining: number;
  notificationType: 'deletion_warning' | 'archive_warning';
}

/**
 * Service configuration
 */
export interface RetentionServiceConfig {
  enableAutoDelete: boolean;
  enableNotifications: boolean;
  defaultRetentionDays: number;
  archiveBatchSize: number;
  deletionBatchSize: number;
}

/**
 * Audit log creation options
 */
export interface CreateAuditLogOptions {
  userId: string;
  action: RetentionAction;
  projectId?: string;
  projectName?: string;
  archiveId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}

/**
 * Get audit logs options
 */
export interface GetAuditLogsOptions {
  userId?: string | undefined;
  action?: RetentionAction | undefined;
  projectId?: string | undefined;
  startDate?: Date | undefined;
  endDate?: Date | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

/**
 * Audit logs response with pagination
 */
export interface AuditLogsResponse {
  logs: RetentionAuditLogEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}
