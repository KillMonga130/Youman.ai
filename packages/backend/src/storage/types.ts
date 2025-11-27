/**
 * Storage Types
 * Types for document storage, S3 operations, and quota tracking
 * 
 * Requirements: 12 - Efficient memory management and resumable processing
 * Requirements: 15 - Web-based interface for document processing
 * Requirements: 63 - Data retention policies
 */

import { z } from 'zod';

// ============================================
// Storage Configuration
// ============================================

/**
 * S3 storage configuration
 */
export interface S3Config {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string; // For S3-compatible services like MinIO
}

/**
 * Storage provider type
 */
export type StorageProvider = 's3' | 'local' | 'mongodb';

// ============================================
// Document Storage Types
// ============================================

/**
 * Document upload input
 */
export interface DocumentUploadInput {
  projectId: string;
  versionId?: string | undefined;
  content: string;
  type: 'original' | 'transformed' | 'draft';
  metadata: {
    title?: string | undefined;
    author?: string | undefined;
    language: string;
    format: 'plain' | 'markdown' | 'html' | 'docx' | 'pdf' | 'epub';
    originalFilename?: string | undefined;
    mimeType?: string | undefined;
  };
}

/**
 * Document storage result
 */
export interface DocumentStorageResult {
  documentId: string;
  contentHash: string;
  wordCount: number;
  characterCount: number;
  storageLocation: StorageLocation;
  isDuplicate: boolean;
  existingDocumentId?: string;
}

/**
 * Storage location information
 */
export interface StorageLocation {
  provider: StorageProvider;
  bucket?: string;
  key?: string;
  mongoId?: string;
}

// ============================================
// Chunk Storage Types
// ============================================

/**
 * Chunk upload input
 */
export interface ChunkUploadInput {
  documentId: string;
  transformationId?: string | undefined;
  index: number;
  totalChunks: number;
  content: string;
  startOffset: number;
  endOffset: number;
  chapterIndex?: number | undefined;
  context?: {
    previousSentences?: string[] | undefined;
    themes?: string[] | undefined;
    keyTerms?: string[] | undefined;
  } | undefined;
}

/**
 * Chunk storage result
 */
export interface ChunkStorageResult {
  chunkId: string;
  contentHash: string;
  wordCount: number;
  characterCount: number;
}

/**
 * Chunk retrieval options
 */
export interface ChunkRetrievalOptions {
  documentId: string;
  transformationId?: string | undefined;
  startIndex?: number | undefined;
  endIndex?: number | undefined;
  status?: 'pending' | 'processing' | 'completed' | 'failed' | undefined;
}

// ============================================
// Storage Quota Types
// ============================================

/**
 * Storage quota status
 */
export interface StorageQuotaStatus {
  userId: string;
  totalBytes: number;
  usedBytes: number;
  remainingBytes: number;
  percentUsed: number;
  documentCount: number;
  lastUpdated: Date;
}

/**
 * Storage usage record
 */
export interface StorageUsageRecord {
  userId: string;
  projectId: string;
  documentId: string;
  bytes: number;
  operation: 'upload' | 'delete';
  timestamp: Date;
}

// ============================================
// S3 Operation Types
// ============================================

/**
 * S3 upload options
 */
export interface S3UploadOptions {
  key: string;
  content: string | Buffer;
  contentType?: string;
  metadata?: Record<string, string>;
}

/**
 * S3 upload result
 */
export interface S3UploadResult {
  key: string;
  etag: string;
  location: string;
  versionId?: string;
}

/**
 * S3 download result
 */
export interface S3DownloadResult {
  content: string;
  contentType?: string;
  metadata?: Record<string, string>;
  lastModified?: Date;
}

/**
 * S3 delete result
 */
export interface S3DeleteResult {
  key: string;
  deleted: boolean;
  versionId?: string;
}

// ============================================
// Export Format Types
// ============================================

/**
 * Export format options
 * Requirements: 12.4 - Export in multiple formats
 */
export type ExportFormat = 'docx' | 'pdf' | 'epub' | 'txt' | 'markdown' | 'html';

/**
 * Export options
 */
export interface ExportOptions {
  documentId: string;
  format: ExportFormat;
  includeMetadata?: boolean;
  includeVersionHistory?: boolean;
}

/**
 * Export result
 */
export interface ExportResult {
  content: Buffer;
  filename: string;
  mimeType: string;
  size: number;
}

// ============================================
// Validation Schemas
// ============================================

/**
 * Document upload validation schema
 */
export const documentUploadSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  versionId: z.string().uuid('Invalid version ID').optional(),
  content: z.string().min(1, 'Content is required'),
  type: z.enum(['original', 'transformed', 'draft']),
  metadata: z.object({
    title: z.string().optional(),
    author: z.string().optional(),
    language: z.string().default('en'),
    format: z.enum(['plain', 'markdown', 'html', 'docx', 'pdf', 'epub']).default('plain'),
    originalFilename: z.string().optional(),
    mimeType: z.string().optional(),
  }),
});

/**
 * Chunk upload validation schema
 */
export const chunkUploadSchema = z.object({
  documentId: z.string(),
  transformationId: z.string().optional(),
  index: z.number().min(0),
  totalChunks: z.number().min(1),
  content: z.string().min(1, 'Content is required'),
  startOffset: z.number().min(0),
  endOffset: z.number().min(0),
  chapterIndex: z.number().optional(),
  context: z.object({
    previousSentences: z.array(z.string()).optional(),
    themes: z.array(z.string()).optional(),
    keyTerms: z.array(z.string()).optional(),
  }).optional(),
});

export type DocumentUploadValidated = z.infer<typeof documentUploadSchema>;
export type ChunkUploadValidated = z.infer<typeof chunkUploadSchema>;
