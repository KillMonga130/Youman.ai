/**
 * Storage Routes
 * API endpoints for document storage operations
 * 
 * Requirements: 12 - Efficient memory management and resumable processing
 * Requirements: 15 - Web-based interface for document processing
 * Requirements: 63 - Data retention policies
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  storeDocument,
  retrieveDocument,
  deleteDocument,
  storeChunk,
  retrieveChunks,
  getChunkProgress,
  getStorageQuotaStatus,
  checkStorageQuota,
  calculateByteSize,
  documentUploadSchema,
  chunkUploadSchema,
} from './index';
import { StorageError } from './storage.service';
import fileExtractionRouter from './file-extraction.routes';

const router = Router();

// ============================================
// Middleware
// ============================================

/**
 * Extract user ID from authenticated request
 */
function getUserId(req: Request): string {
  // In a real app, this would come from the authenticated user
  // For now, we'll use a header or default
  return (req.headers['x-user-id'] as string) || 'anonymous';
}

/**
 * Get user's storage quota limit based on subscription
 * In a real app, this would come from the subscription service
 */
function getQuotaLimit(_userId: string): number {
  // Default 10GB for now
  return 10 * 1024 * 1024 * 1024;
}

// ============================================
// Document Routes
// ============================================

/**
 * Upload a document
 * POST /storage/documents
 */
router.post('/documents', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const input = documentUploadSchema.parse(req.body);

    // Check storage quota
    const contentSize = calculateByteSize(input.content);
    const quotaLimit = getQuotaLimit(userId);
    const quotaCheck = await checkStorageQuota(userId, contentSize, quotaLimit);

    if (!quotaCheck.hasQuota) {
      res.status(413).json({
        error: 'Storage quota exceeded',
        code: 'QUOTA_EXCEEDED',
        availableBytes: quotaCheck.availableBytes,
        requiredBytes: contentSize,
      });
      return;
    }

    const result = await storeDocument(userId, input);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }
    next(error);
  }
});

/**
 * Get a document by ID
 * GET /storage/documents/:id
 */
router.get('/documents/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ error: 'Document ID is required', code: 'MISSING_ID' });
      return;
    }
    const document = await retrieveDocument(id);

    if (!document) {
      res.status(404).json({
        error: 'Document not found',
        code: 'DOCUMENT_NOT_FOUND',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: document._id,
        projectId: document.projectId,
        versionId: document.versionId,
        type: document.type,
        content: document.content,
        contentHash: document.contentHash,
        wordCount: document.wordCount,
        characterCount: document.characterCount,
        metadata: document.metadata,
        structure: document.structure,
        isChunked: document.isChunked,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof StorageError) {
      res.status(500).json({
        error: error.message,
        code: error.code,
      });
      return;
    }
    next(error);
  }
});

/**
 * Delete a document
 * DELETE /storage/documents/:id
 */
router.delete('/documents/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ error: 'Document ID is required', code: 'MISSING_ID' });
      return;
    }

    const deleted = await deleteDocument(userId, id);

    if (!deleted) {
      res.status(404).json({
        error: 'Document not found',
        code: 'DOCUMENT_NOT_FOUND',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Chunk Routes
// ============================================

/**
 * Upload a chunk
 * POST /storage/chunks
 */
router.post('/chunks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = chunkUploadSchema.parse(req.body);
    const result = await storeChunk(input);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }
    next(error);
  }
});

/**
 * Get chunks for a document
 * GET /storage/chunks/:documentId
 */
router.get('/chunks/:documentId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const documentId = req.params.documentId;
    if (!documentId) {
      res.status(400).json({ error: 'Document ID is required', code: 'MISSING_DOCUMENT_ID' });
      return;
    }
    const { startIndex, endIndex, status, transformationId } = req.query;

    const chunks = await retrieveChunks({
      documentId: documentId,
      transformationId: transformationId as string | undefined,
      startIndex: startIndex ? parseInt(startIndex as string, 10) : undefined,
      endIndex: endIndex ? parseInt(endIndex as string, 10) : undefined,
      status: status as 'pending' | 'processing' | 'completed' | 'failed' | undefined,
    });

    res.json({
      success: true,
      data: chunks.map(chunk => ({
        id: chunk._id,
        documentId: chunk.documentId,
        transformationId: chunk.transformationId,
        index: chunk.index,
        totalChunks: chunk.totalChunks,
        content: chunk.content,
        transformedContent: chunk.transformedContent,
        contentHash: chunk.contentHash,
        wordCount: chunk.wordCount,
        characterCount: chunk.characterCount,
        startOffset: chunk.startOffset,
        endOffset: chunk.endOffset,
        chapterIndex: chunk.chapterIndex,
        status: chunk.status,
        context: chunk.context,
        processingTimeMs: chunk.processingTimeMs,
        errorMessage: chunk.errorMessage,
        retryCount: chunk.retryCount,
        createdAt: chunk.createdAt,
        updatedAt: chunk.updatedAt,
      })),
      count: chunks.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get chunk processing progress
 * GET /storage/chunks/:documentId/progress
 */
router.get('/chunks/:documentId/progress', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const documentId = req.params.documentId;
    if (!documentId) {
      res.status(400).json({ error: 'Document ID is required', code: 'MISSING_DOCUMENT_ID' });
      return;
    }
    const progress = await getChunkProgress(documentId);

    res.json({
      success: true,
      data: progress,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Quota Routes
// ============================================

/**
 * Get storage quota status
 * GET /storage/quota
 */
router.get('/quota', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const quotaLimit = getQuotaLimit(userId);
    const status = await getStorageQuotaStatus(userId, quotaLimit);

    res.json({
      success: true,
      data: {
        ...status,
        // Format bytes for readability
        totalBytesFormatted: formatBytes(status.totalBytes),
        usedBytesFormatted: formatBytes(status.usedBytes),
        remainingBytesFormatted: formatBytes(status.remainingBytes),
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Helper Functions
// ============================================

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Mount file extraction routes
router.use('/files', fileExtractionRouter);

export { router as storageRouter };
