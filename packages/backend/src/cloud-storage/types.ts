/**
 * Cloud Storage Types
 * Types for Google Drive, Dropbox, and OneDrive integrations
 * 
 * Requirements: 22 - Integrate with cloud storage services
 */

import { z } from 'zod';

// ============================================
// Enums
// ============================================

/**
 * Supported cloud storage providers
 * Requirements: 22.1 - Support Google Drive, Dropbox, and OneDrive
 */
export enum CloudProvider {
  GOOGLE_DRIVE = 'GOOGLE_DRIVE',
  DROPBOX = 'DROPBOX',
  ONEDRIVE = 'ONEDRIVE',
}

/**
 * Cloud file types
 */
export enum CloudFileType {
  FILE = 'FILE',
  FOLDER = 'FOLDER',
}

/**
 * Sync status for automatic backups
 * Requirements: 22.5 - Automatically backup projects to cloud storage
 */
export enum SyncStatus {
  IDLE = 'IDLE',
  SYNCING = 'SYNCING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

// ============================================
// OAuth Types
// ============================================

/**
 * OAuth2 credentials for cloud providers
 */
export interface OAuth2Credentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  tokenType?: string;
  scope?: string;
}

/**
 * OAuth2 token response
 */
export interface OAuth2TokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType: string;
  scope?: string;
}

/**
 * Connected cloud account
 */
export interface CloudConnection {
  id: string;
  userId: string;
  provider: CloudProvider;
  email: string;
  displayName?: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  isActive: boolean;
  connectedAt: Date;
  lastUsedAt?: Date;
}

// ============================================
// Cloud File Types
// ============================================

/**
 * Cloud file representation
 * Requirements: 22.2 - Display a file browser showing available documents
 */
export interface CloudFile {
  id: string;
  name: string;
  type: CloudFileType;
  mimeType?: string;
  size?: number;
  path: string;
  parentId?: string;
  modifiedAt?: Date;
  createdAt?: Date;
  downloadUrl?: string;
  thumbnailUrl?: string;
  isShared?: boolean;
  provider: CloudProvider;
}

/**
 * Cloud file list response with pagination
 */
export interface CloudFileListResponse {
  files: CloudFile[];
  nextPageToken?: string;
  hasMore: boolean;
}

// ============================================
// Import/Export Types
// ============================================

/**
 * Import file input
 * Requirements: 22.3 - Import document directly without manual download
 */
export interface ImportFileInput {
  provider: CloudProvider;
  fileId: string;
  projectId?: string;
  targetPath?: string;
}

/**
 * Import file result
 */
export interface ImportFileResult {
  documentId: string;
  projectId: string;
  filename: string;
  wordCount: number;
  characterCount: number;
  importedAt: Date;
}

/**
 * Export file input
 * Requirements: 22.4 - Save humanized output directly to cloud account
 */
export interface ExportFileInput {
  provider: CloudProvider;
  documentId: string;
  targetPath: string;
  filename: string;
  format?: 'docx' | 'pdf' | 'txt' | 'markdown';
}

/**
 * Export file result
 */
export interface ExportFileResult {
  fileId: string;
  filename: string;
  path: string;
  size: number;
  exportedAt: Date;
  webViewLink?: string;
}

// ============================================
// Sync Types
// ============================================

/**
 * Project sync configuration
 * Requirements: 22.5 - Automatically backup projects to cloud storage
 */
export interface ProjectSyncConfig {
  id: string;
  projectId: string;
  userId: string;
  provider: CloudProvider;
  cloudFolderId: string;
  cloudFolderPath: string;
  autoSync: boolean;
  syncInterval?: number; // in minutes
  lastSyncAt?: Date;
  lastSyncStatus: SyncStatus;
  lastSyncError?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Sync result
 */
export interface SyncResult {
  projectId: string;
  provider: CloudProvider;
  status: SyncStatus;
  filesUploaded: number;
  filesUpdated: number;
  errors: string[];
  syncedAt: Date;
}

// ============================================
// Validation Schemas
// ============================================

/**
 * Schema for connecting a cloud provider
 */
export const connectProviderSchema = z.object({
  provider: z.nativeEnum(CloudProvider),
  code: z.string().min(1, 'Authorization code is required'),
  redirectUri: z.string().url('Invalid redirect URI'),
});

/**
 * Schema for listing cloud files
 * Requirements: 22.2 - Display a file browser
 */
export const listFilesSchema = z.object({
  provider: z.nativeEnum(CloudProvider),
  path: z.string().default('/'),
  folderId: z.string().optional(),
  pageToken: z.string().optional(),
  pageSize: z.coerce.number().min(1).max(100).default(50),
});

/**
 * Schema for importing a file
 * Requirements: 22.3 - Import document directly
 */
export const importFileSchema = z.object({
  provider: z.nativeEnum(CloudProvider),
  fileId: z.string().min(1, 'File ID is required'),
  projectId: z.string().uuid('Invalid project ID').optional(),
});

/**
 * Schema for exporting a file
 * Requirements: 22.4 - Save output to cloud
 */
export const exportFileSchema = z.object({
  provider: z.nativeEnum(CloudProvider),
  documentId: z.string().min(1, 'Document ID is required'),
  targetPath: z.string().default('/'),
  filename: z.string().min(1, 'Filename is required'),
  format: z.enum(['docx', 'pdf', 'txt', 'markdown']).default('txt'),
});

/**
 * Schema for configuring project sync
 * Requirements: 22.5 - Automatic backup
 */
export const configureSyncSchema = z.object({
  provider: z.nativeEnum(CloudProvider),
  cloudFolderId: z.string().min(1, 'Cloud folder ID is required'),
  autoSync: z.boolean().default(true),
  syncInterval: z.number().min(5).max(1440).default(60), // 5 min to 24 hours
});

/**
 * Schema for disconnecting a provider
 */
export const disconnectProviderSchema = z.object({
  provider: z.nativeEnum(CloudProvider),
});

// ============================================
// Type Exports from Schemas
// ============================================

export type ConnectProviderInput = z.infer<typeof connectProviderSchema>;
export type ListFilesInput = z.infer<typeof listFilesSchema>;
export type ImportFileSchemaInput = z.infer<typeof importFileSchema>;
export type ExportFileSchemaInput = z.infer<typeof exportFileSchema>;
export type ConfigureSyncInput = z.infer<typeof configureSyncSchema>;
export type DisconnectProviderInput = z.infer<typeof disconnectProviderSchema>;

// ============================================
// Response Types
// ============================================

/**
 * Cloud connection response
 */
export interface CloudConnectionResponse {
  id: string;
  provider: CloudProvider;
  email: string;
  displayName?: string;
  isActive: boolean;
  connectedAt: Date;
  lastUsedAt?: Date;
}

/**
 * OAuth URL response
 */
export interface OAuthUrlResponse {
  url: string;
  state: string;
}

/**
 * Provider status response
 */
export interface ProviderStatusResponse {
  provider: CloudProvider;
  isConnected: boolean;
  connection?: CloudConnectionResponse;
}
