/**
 * Storage Service
 * Handles document and chunk storage with S3 and MongoDB
 * 
 * Requirements: 12 - Efficient memory management and resumable processing
 * Requirements: 15 - Web-based interface for document processing
 * Requirements: 63 - Data retention policies
 */

import { DocumentModel, IDocument } from '../database/schemas/document.schema';
import { ChunkModel, IChunk } from '../database/schemas/chunk.schema';
import { StorageQuotaModel, IStorageQuota } from '../database/schemas/storage-quota.schema';
import { logger } from '../utils/logger';
import {
  isS3Available,
  uploadToS3,
  downloadFromS3,
  deleteFromS3,
  generateDocumentKey,
  generateChunkKey,
} from './s3-client';
import {
  calculateContentHash,
  calculateWordCount,
  calculateCharacterCount,
  calculateByteSize,
  calculateContentStats,
} from './content-hash';
import type {
  DocumentUploadInput,
  DocumentStorageResult,
  ChunkUploadInput,
  ChunkStorageResult,
  ChunkRetrievalOptions,
  StorageQuotaStatus,
  StorageLocation,
  StorageProvider,
} from './types';
import { prisma } from '../database/prisma';

// ============================================
// Error Classes
// ============================================

export class StorageError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'StorageError';
    this.code = code;
  }
}

// ============================================
// Document Storage
// ============================================

/**
 * Store a document with deduplication
 * First checks if content already exists by hash
 */
export async function storeDocument(
  userId: string,
  input: DocumentUploadInput
): Promise<DocumentStorageResult> {
  const { projectId, versionId, content, type, metadata } = input;
  
  // Calculate content statistics
  const stats = calculateContentStats(content);
  
  // Check for duplicate content
  const existingDoc = await DocumentModel.findOne({ 
    contentHash: stats.hash,
    projectId,
  });

  if (existingDoc) {
    logger.info('Duplicate content detected', { 
      projectId, 
      existingDocId: existingDoc._id,
      hash: stats.hash,
    });

    return {
      documentId: existingDoc._id.toString(),
      contentHash: stats.hash,
      wordCount: stats.wordCount,
      characterCount: stats.characterCount,
      storageLocation: {
        provider: 'mongodb',
        mongoId: existingDoc._id.toString(),
      },
      isDuplicate: true,
      existingDocumentId: existingDoc._id.toString(),
    };
  }

  // Determine storage location
  let storageLocation: StorageLocation;
  const useS3 = isS3Available() && stats.byteSize > 1024 * 1024; // Use S3 for files > 1MB

  if (useS3) {
    // Store in S3 for large documents
    const key = generateDocumentKey(projectId, stats.hash, type);
    await uploadToS3({
      key,
      content,
      contentType: 'text/plain; charset=utf-8',
      metadata: {
        projectId,
        type,
        wordCount: stats.wordCount.toString(),
      },
    });

    storageLocation = {
      provider: 's3',
      bucket: process.env.S3_BUCKET,
      key,
    };
  } else {
    storageLocation = {
      provider: 'mongodb',
    };
  }

  // Create document in MongoDB
  const document = await DocumentModel.create({
    projectId,
    versionId,
    type,
    content: useS3 ? '' : content, // Don't store content in MongoDB if using S3
    contentHash: stats.hash,
    wordCount: stats.wordCount,
    characterCount: stats.characterCount,
    metadata: {
      ...metadata,
      encoding: 'utf-8',
    },
    isChunked: false,
  });

  // Update storage location with MongoDB ID
  storageLocation.mongoId = document._id.toString();

  // Update storage quota
  await updateStorageQuota(userId, projectId, document._id.toString(), stats.byteSize, 'upload');

  logger.info('Document stored', {
    documentId: document._id,
    projectId,
    type,
    wordCount: stats.wordCount,
    provider: storageLocation.provider,
  });

  return {
    documentId: document._id.toString(),
    contentHash: stats.hash,
    wordCount: stats.wordCount,
    characterCount: stats.characterCount,
    storageLocation,
    isDuplicate: false,
  };
}

/**
 * Retrieve a document by ID
 */
export async function retrieveDocument(documentId: string): Promise<IDocument | null> {
  const document = await DocumentModel.findById(documentId);
  
  if (!document) {
    return null;
  }

  // If content is stored in S3, retrieve it
  if (document.content === '' && isS3Available()) {
    const key = generateDocumentKey(
      document.projectId,
      document.contentHash,
      document.type
    );
    
    try {
      const result = await downloadFromS3(key);
      // Update document content in memory and return
      document.content = result.content;
      return document;
    } catch (error) {
      logger.error('Failed to retrieve document from S3', { documentId, key, error });
      throw new StorageError('Failed to retrieve document content', 'S3_RETRIEVAL_FAILED');
    }
  }

  return document;
}

/**
 * Delete a document
 */
export async function deleteDocument(
  userId: string,
  documentId: string
): Promise<boolean> {
  const document = await DocumentModel.findById(documentId);
  
  if (!document) {
    return false;
  }

  const byteSize = calculateByteSize(document.content || '');

  // Delete from S3 if stored there
  if (document.content === '' && isS3Available()) {
    const key = generateDocumentKey(
      document.projectId,
      document.contentHash,
      document.type
    );
    
    try {
      await deleteFromS3(key);
    } catch (error) {
      logger.warn('Failed to delete document from S3', { documentId, key, error });
    }
  }

  // Delete associated chunks
  await ChunkModel.deleteMany({ documentId });

  // Delete document from MongoDB
  await DocumentModel.findByIdAndDelete(documentId);

  // Update storage quota
  await updateStorageQuota(userId, document.projectId, documentId, byteSize, 'delete');

  logger.info('Document deleted', { documentId });

  return true;
}

/**
 * Find document by content hash (for deduplication)
 */
export async function findDocumentByHash(
  projectId: string,
  contentHash: string
): Promise<IDocument | null> {
  return DocumentModel.findOne({ projectId, contentHash });
}

// ============================================
// Chunk Storage
// ============================================

/**
 * Store a chunk
 */
export async function storeChunk(input: ChunkUploadInput): Promise<ChunkStorageResult> {
  const {
    documentId,
    transformationId,
    index,
    totalChunks,
    content,
    startOffset,
    endOffset,
    chapterIndex,
    context,
  } = input;

  const stats = calculateContentStats(content);

  // Check for existing chunk (for resumable processing)
  const existingChunk = await ChunkModel.findOne({
    documentId,
    index,
    contentHash: stats.hash,
  });

  if (existingChunk) {
    logger.debug('Chunk already exists', { documentId, index });
    return {
      chunkId: existingChunk._id.toString(),
      contentHash: stats.hash,
      wordCount: stats.wordCount,
      characterCount: stats.characterCount,
    };
  }

  // Store chunk in S3 if available and chunk is large
  const useS3 = isS3Available() && stats.byteSize > 100 * 1024; // Use S3 for chunks > 100KB

  if (useS3) {
    const key = generateChunkKey(documentId, index);
    await uploadToS3({
      key,
      content,
      contentType: 'text/plain; charset=utf-8',
      metadata: {
        documentId,
        index: index.toString(),
        totalChunks: totalChunks.toString(),
      },
    });
  }

  // Create chunk in MongoDB
  const chunk = await ChunkModel.create({
    documentId,
    transformationId,
    index,
    totalChunks,
    content: useS3 ? '' : content,
    contentHash: stats.hash,
    wordCount: stats.wordCount,
    characterCount: stats.characterCount,
    startOffset,
    endOffset,
    chapterIndex,
    status: 'pending',
    context: context || {
      previousSentences: [],
      themes: [],
      keyTerms: [],
    },
    retryCount: 0,
  });

  logger.debug('Chunk stored', { chunkId: chunk._id, documentId, index });

  return {
    chunkId: chunk._id.toString(),
    contentHash: stats.hash,
    wordCount: stats.wordCount,
    characterCount: stats.characterCount,
  };
}

/**
 * Retrieve chunks for a document
 */
export async function retrieveChunks(options: ChunkRetrievalOptions): Promise<IChunk[]> {
  const { documentId, transformationId, startIndex, endIndex, status } = options;

  const query: Record<string, unknown> = { documentId };

  if (transformationId) {
    query.transformationId = transformationId;
  }

  if (status) {
    query.status = status;
  }

  if (startIndex !== undefined || endIndex !== undefined) {
    query.index = {};
    if (startIndex !== undefined) {
      (query.index as Record<string, number>).$gte = startIndex;
    }
    if (endIndex !== undefined) {
      (query.index as Record<string, number>).$lte = endIndex;
    }
  }

  const chunks = await ChunkModel.find(query).sort({ index: 1 });

  // Retrieve content from S3 for chunks stored there
  const chunksWithContent = await Promise.all(
    chunks.map(async (chunk) => {
      if (chunk.content === '' && isS3Available()) {
        const key = generateChunkKey(chunk.documentId, chunk.index);
        try {
          const result = await downloadFromS3(key);
          // Update chunk content in memory and return
          chunk.content = result.content;
          return chunk;
        } catch (error) {
          logger.warn('Failed to retrieve chunk from S3', { 
            chunkId: chunk._id, 
            key, 
            error 
          });
          return chunk;
        }
      }
      return chunk;
    })
  );

  return chunksWithContent;
}

/**
 * Update chunk status
 */
export async function updateChunkStatus(
  chunkId: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  transformedContent?: string,
  errorMessage?: string,
  processingTimeMs?: number
): Promise<IChunk | null> {
  const updateData: Record<string, unknown> = { status };

  if (transformedContent !== undefined) {
    updateData.transformedContent = transformedContent;
  }

  if (errorMessage !== undefined) {
    updateData.errorMessage = errorMessage;
  }

  if (processingTimeMs !== undefined) {
    updateData.processingTimeMs = processingTimeMs;
  }

  if (status === 'failed') {
    updateData.$inc = { retryCount: 1 };
  }

  return ChunkModel.findByIdAndUpdate(chunkId, updateData, { new: true });
}

/**
 * Get chunk processing progress
 */
export async function getChunkProgress(documentId: string): Promise<{
  total: number;
  completed: number;
  failed: number;
  pending: number;
  processing: number;
  percentComplete: number;
}> {
  const [total, completed, failed, pending, processing] = await Promise.all([
    ChunkModel.countDocuments({ documentId }),
    ChunkModel.countDocuments({ documentId, status: 'completed' }),
    ChunkModel.countDocuments({ documentId, status: 'failed' }),
    ChunkModel.countDocuments({ documentId, status: 'pending' }),
    ChunkModel.countDocuments({ documentId, status: 'processing' }),
  ]);

  return {
    total,
    completed,
    failed,
    pending,
    processing,
    percentComplete: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

/**
 * Delete chunks for a document
 */
export async function deleteChunks(documentId: string): Promise<number> {
  // Delete from S3 if available
  if (isS3Available()) {
    const chunks = await ChunkModel.find({ documentId, content: '' });
    await Promise.all(
      chunks.map(async (chunk) => {
        const key = generateChunkKey(documentId, chunk.index);
        try {
          await deleteFromS3(key);
        } catch (error) {
          logger.warn('Failed to delete chunk from S3', { chunkId: chunk._id, key });
        }
      })
    );
  }

  const result = await ChunkModel.deleteMany({ documentId });
  return result.deletedCount;
}

// ============================================
// Storage Quota Management
// ============================================

/**
 * Update storage quota for a user
 */
export async function updateStorageQuota(
  userId: string,
  projectId: string,
  documentId: string,
  bytes: number,
  operation: 'upload' | 'delete'
): Promise<void> {
  const bytesChange = operation === 'upload' ? bytes : -bytes;
  const countChange = operation === 'upload' ? 1 : -1;

  await StorageQuotaModel.findOneAndUpdate(
    { userId },
    {
      $inc: {
        totalBytesUsed: bytesChange,
        documentCount: countChange,
      },
      $push: {
        usageHistory: {
          $each: [{
            projectId,
            documentId,
            bytes,
            operation,
            timestamp: new Date(),
          }],
          $slice: -1000, // Keep only last 1000 entries
        },
      },
      $set: {
        lastCalculatedAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );

  logger.debug('Storage quota updated', { userId, operation, bytes });
}

/**
 * Get storage quota status for a user
 */
export async function getStorageQuotaStatus(
  userId: string,
  quotaLimit: number
): Promise<StorageQuotaStatus> {
  let quota = await StorageQuotaModel.findOne({ userId });

  if (!quota) {
    // Create initial quota record
    quota = await StorageQuotaModel.create({
      userId,
      totalBytesUsed: 0,
      documentCount: 0,
      usageHistory: [],
    });
  }

  const usedBytes = Math.max(0, quota.totalBytesUsed);
  const remainingBytes = Math.max(0, quotaLimit - usedBytes);
  const percentUsed = quotaLimit > 0 ? Math.round((usedBytes / quotaLimit) * 100) : 0;

  return {
    userId,
    totalBytes: quotaLimit,
    usedBytes,
    remainingBytes,
    percentUsed,
    documentCount: quota.documentCount,
    lastUpdated: quota.lastCalculatedAt,
  };
}

/**
 * Check if user has sufficient storage quota
 */
export async function checkStorageQuota(
  userId: string,
  requiredBytes: number,
  quotaLimit: number
): Promise<{ hasQuota: boolean; availableBytes: number }> {
  const status = await getStorageQuotaStatus(userId, quotaLimit);
  
  return {
    hasQuota: status.remainingBytes >= requiredBytes,
    availableBytes: status.remainingBytes,
  };
}

/**
 * Recalculate storage quota from actual documents
 * Used for quota reconciliation
 */
export async function recalculateStorageQuota(userId: string): Promise<StorageQuotaStatus> {
  // Get all documents for user's projects
  const projects = await prisma.project.findMany({
    where: { ownerId: userId },
    select: { id: true },
  });

  const projectIds = projects.map(p => p.id);

  // Calculate total storage from MongoDB documents
  const documents = await DocumentModel.find({ 
    projectId: { $in: projectIds } 
  });

  let totalBytes = 0;
  for (const doc of documents) {
    totalBytes += calculateByteSize(doc.content || '');
  }

  // Update quota record
  await StorageQuotaModel.findOneAndUpdate(
    { userId },
    {
      $set: {
        totalBytesUsed: totalBytes,
        documentCount: documents.length,
        lastCalculatedAt: new Date(),
      },
    },
    { upsert: true }
  );

  logger.info('Storage quota recalculated', { 
    userId, 
    totalBytes, 
    documentCount: documents.length 
  });

  // Return updated status (using a default quota limit)
  return getStorageQuotaStatus(userId, 10 * 1024 * 1024 * 1024); // 10GB default
}
