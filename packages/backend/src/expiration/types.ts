/**
 * Content Expiration Service Types
 * Type definitions for content expiration, reminders, and automatic deletion
 * Requirements: 75 - Content expiration with automatic deletion
 */

/**
 * Expiration reminder notification days
 * Requirement 75.2: Send reminders 7, 3, and 1 days before expiration
 */
export const REMINDER_DAYS = [7, 3, 1] as const;
export type ReminderDay = (typeof REMINDER_DAYS)[number];

/**
 * Expiration status for projects
 */
export type ExpirationStatus = 'active' | 'expiring_soon' | 'expired' | 'no_expiration';

/**
 * Expiring project information
 * Requirement 75: Display projects approaching expiration
 */
export interface ExpiringProject {
  /** Project identifier */
  projectId: string;
  /** Project name */
  name: string;
  /** Expiration date */
  expirationDate: Date;
  /** Days remaining until expiration */
  daysRemaining: number;
  /** Owner user ID */
  ownerId: string;
  /** Owner email for notifications */
  ownerEmail?: string;
  /** Project word count */
  wordCount: number;
  /** Expiration status */
  status: ExpirationStatus;
}

/**
 * Deletion report for expired content
 * Requirement 75.3: Automatic deletion of expired content
 */
export interface DeletionReport {
  /** Report identifier */
  id: string;
  /** Timestamp of deletion operation */
  timestamp: Date;
  /** Total projects processed */
  totalProcessed: number;
  /** Successfully deleted projects */
  deletedCount: number;
  /** Failed deletions */
  failedCount: number;
  /** Skipped projects (e.g., already deleted) */
  skippedCount: number;
  /** Details of deleted projects */
  deletedProjects: DeletedProjectInfo[];
  /** Details of failed deletions */
  failedProjects: FailedDeletionInfo[];
  /** Duration of operation in milliseconds */
  durationMs: number;
}

/**
 * Information about a deleted project
 */
export interface DeletedProjectInfo {
  /** Project identifier */
  projectId: string;
  /** Project name */
  name: string;
  /** Original expiration date */
  expirationDate: Date;
  /** Owner user ID */
  ownerId: string;
  /** Word count at deletion */
  wordCount: number;
}

/**
 * Information about a failed deletion
 */
export interface FailedDeletionInfo {
  /** Project identifier */
  projectId: string;
  /** Project name */
  name: string;
  /** Error message */
  error: string;
}

/**
 * Options for setting expiration
 * Requirement 75.1: Allow users to specify expiration date
 */
export interface SetExpirationOptions {
  /** Project identifier */
  projectId: string;
  /** User ID (must be owner) */
  userId: string;
  /** Expiration date */
  expirationDate: Date;
  /** Send confirmation notification */
  sendNotification?: boolean;
}

/**
 * Options for extending expiration
 * Requirement 75.4: Allow users to extend expiration dates
 */
export interface ExtendExpirationOptions {
  /** Project identifier */
  projectId: string;
  /** User ID (must be owner) */
  userId: string;
  /** New expiration date */
  newExpirationDate: Date;
  /** Send confirmation notification */
  sendNotification?: boolean;
}

/**
 * Options for removing expiration
 */
export interface RemoveExpirationOptions {
  /** Project identifier */
  projectId: string;
  /** User ID (must be owner) */
  userId: string;
}

/**
 * Expiration reminder notification
 * Requirement 75.2: Send reminder notifications
 */
export interface ExpirationReminder {
  /** Project identifier */
  projectId: string;
  /** Project name */
  projectName: string;
  /** Owner email */
  ownerEmail: string;
  /** Owner name */
  ownerName?: string;
  /** Expiration date */
  expirationDate: Date;
  /** Days remaining */
  daysRemaining: number;
  /** Reminder type (7, 3, or 1 day) */
  reminderDay: ReminderDay;
}

/**
 * Result of sending reminders
 */
export interface ReminderResult {
  /** Total reminders to send */
  totalReminders: number;
  /** Successfully sent */
  sentCount: number;
  /** Failed to send */
  failedCount: number;
  /** Reminder details */
  reminders: ExpirationReminder[];
  /** Timestamp */
  timestamp: Date;
}

/**
 * Expiration service configuration
 */
export interface ExpirationServiceConfig {
  /** Enable automatic deletion */
  enableAutoDeletion: boolean;
  /** Enable reminder notifications */
  enableReminders: boolean;
  /** Reminder days before expiration */
  reminderDays: readonly number[];
  /** Minimum expiration period in days */
  minExpirationDays: number;
  /** Maximum expiration period in days */
  maxExpirationDays: number;
  /** Batch size for deletion operations */
  deletionBatchSize: number;
}

/**
 * Expiration notification options
 */
export interface ExpirationNotificationOptions {
  /** Recipient email */
  to: string;
  /** Recipient name */
  name?: string;
  /** Project name */
  projectName: string;
  /** Project ID */
  projectId: string;
  /** Notification type */
  type: 'expiration_set' | 'expiration_extended' | 'expiration_reminder' | 'content_deleted';
  /** Expiration date */
  expirationDate?: Date;
  /** Days remaining */
  daysRemaining?: number;
}

/**
 * Project expiration info response
 */
export interface ProjectExpirationInfo {
  /** Project identifier */
  projectId: string;
  /** Project name */
  name: string;
  /** Has expiration set */
  hasExpiration: boolean;
  /** Expiration date (if set) */
  expirationDate: Date | null;
  /** Days remaining (if expiration set) */
  daysRemaining: number | null;
  /** Expiration status */
  status: ExpirationStatus;
  /** Can extend expiration */
  canExtend: boolean;
}
