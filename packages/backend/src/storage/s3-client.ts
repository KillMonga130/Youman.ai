/**
 * S3 Client Service
 * Provides S3-compatible storage operations
 * 
 * Requirements: 12 - Efficient memory management and resumable processing
 * Requirements: 15 - Web-based interface for document processing
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import type {
  S3Config,
  S3UploadOptions,
  S3UploadResult,
  S3DownloadResult,
  S3DeleteResult,
} from './types';

// ============================================
// S3 Client Configuration
// ============================================

/**
 * Get S3 client configuration from environment
 */
function getS3Config(): S3Config | null {
  const { bucket, region, accessKey, secretKey } = config.storage;
  
  if (!bucket || !accessKey || !secretKey) {
    return null;
  }

  return {
    bucket,
    region,
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
  };
}

/**
 * Create S3 client instance
 */
function createS3Client(s3Config: S3Config): S3Client {
  return new S3Client({
    region: s3Config.region,
    credentials: {
      accessKeyId: s3Config.accessKeyId,
      secretAccessKey: s3Config.secretAccessKey,
    },
    ...(s3Config.endpoint && { endpoint: s3Config.endpoint }),
  });
}

// Singleton S3 client instance
let s3Client: S3Client | null = null;
let s3Config: S3Config | null = null;

/**
 * Get or create S3 client
 */
export function getS3Client(): { client: S3Client; config: S3Config } | null {
  if (!s3Client) {
    s3Config = getS3Config();
    if (!s3Config) {
      logger.warn('S3 storage not configured - using MongoDB fallback');
      return null;
    }
    s3Client = createS3Client(s3Config);
  }
  return { client: s3Client, config: s3Config! };
}

/**
 * Check if S3 storage is available
 */
export function isS3Available(): boolean {
  return getS3Client() !== null;
}

// ============================================
// S3 Operations
// ============================================

/**
 * Upload content to S3
 */
export async function uploadToS3(options: S3UploadOptions): Promise<S3UploadResult> {
  const s3 = getS3Client();
  if (!s3) {
    throw new Error('S3 storage not configured');
  }

  const { key, content, contentType, metadata } = options;
  const body = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;

  const command = new PutObjectCommand({
    Bucket: s3.config.bucket,
    Key: key,
    Body: body,
    ContentType: contentType || 'text/plain; charset=utf-8',
    Metadata: metadata,
  });

  try {
    const response = await s3.client.send(command);
    
    logger.debug('Uploaded to S3', { key, size: body.length });

    return {
      key,
      etag: response.ETag || '',
      location: `s3://${s3.config.bucket}/${key}`,
      versionId: response.VersionId,
    };
  } catch (error) {
    logger.error('S3 upload failed', { key, error });
    throw error;
  }
}

/**
 * Download content from S3
 */
export async function downloadFromS3(key: string): Promise<S3DownloadResult> {
  const s3 = getS3Client();
  if (!s3) {
    throw new Error('S3 storage not configured');
  }

  const command = new GetObjectCommand({
    Bucket: s3.config.bucket,
    Key: key,
  });

  try {
    const response = await s3.client.send(command);
    
    // Convert stream to string
    const content = await response.Body?.transformToString('utf-8');
    if (!content) {
      throw new Error('Empty response from S3');
    }

    logger.debug('Downloaded from S3', { key });

    return {
      content,
      contentType: response.ContentType,
      metadata: response.Metadata,
      lastModified: response.LastModified,
    };
  } catch (error) {
    logger.error('S3 download failed', { key, error });
    throw error;
  }
}

/**
 * Delete content from S3
 */
export async function deleteFromS3(key: string): Promise<S3DeleteResult> {
  const s3 = getS3Client();
  if (!s3) {
    throw new Error('S3 storage not configured');
  }

  const command = new DeleteObjectCommand({
    Bucket: s3.config.bucket,
    Key: key,
  });

  try {
    const response = await s3.client.send(command);
    
    logger.debug('Deleted from S3', { key });

    return {
      key,
      deleted: true,
      versionId: response.VersionId,
    };
  } catch (error) {
    logger.error('S3 delete failed', { key, error });
    throw error;
  }
}

/**
 * Check if object exists in S3
 */
export async function existsInS3(key: string): Promise<boolean> {
  const s3 = getS3Client();
  if (!s3) {
    return false;
  }

  const command = new HeadObjectCommand({
    Bucket: s3.config.bucket,
    Key: key,
  });

  try {
    await s3.client.send(command);
    return true;
  } catch (error: unknown) {
    if ((error as { name?: string }).name === 'NotFound') {
      return false;
    }
    throw error;
  }
}

/**
 * List objects in S3 with prefix
 */
export async function listS3Objects(prefix: string): Promise<string[]> {
  const s3 = getS3Client();
  if (!s3) {
    return [];
  }

  const command = new ListObjectsV2Command({
    Bucket: s3.config.bucket,
    Prefix: prefix,
  });

  try {
    const response = await s3.client.send(command);
    return (response.Contents || []).map(obj => obj.Key || '').filter(Boolean);
  } catch (error) {
    logger.error('S3 list failed', { prefix, error });
    throw error;
  }
}

/**
 * Generate S3 key for document storage
 */
export function generateDocumentKey(
  projectId: string,
  documentId: string,
  type: 'original' | 'transformed' | 'draft'
): string {
  return `documents/${projectId}/${type}/${documentId}.txt`;
}

/**
 * Generate S3 key for chunk storage
 */
export function generateChunkKey(
  documentId: string,
  chunkIndex: number
): string {
  return `chunks/${documentId}/${chunkIndex.toString().padStart(6, '0')}.txt`;
}
