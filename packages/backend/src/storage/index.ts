/**
 * Storage Module
 * Exports all storage-related functionality
 * 
 * Requirements: 12 - Efficient memory management and resumable processing
 * Requirements: 15 - Web-based interface for document processing
 * Requirements: 63 - Data retention policies
 */

// Types
export * from './types';

// Content hash utilities
export {
  calculateContentHash,
  calculateBufferHash,
  calculateStreamingHash,
  getHashPrefix,
  verifyContentHash,
  calculateWordCount,
  calculateCharacterCount,
  calculateByteSize,
  calculateContentStats,
} from './content-hash';

// S3 client
export {
  getS3Client,
  isS3Available,
  uploadToS3,
  downloadFromS3,
  deleteFromS3,
  existsInS3,
  listS3Objects,
  generateDocumentKey,
  generateChunkKey,
} from './s3-client';

// Storage service
export {
  StorageError,
  storeDocument,
  retrieveDocument,
  deleteDocument,
  findDocumentByHash,
  storeChunk,
  retrieveChunks,
  updateChunkStatus,
  getChunkProgress,
  deleteChunks,
  updateStorageQuota,
  getStorageQuotaStatus,
  checkStorageQuota,
  recalculateStorageQuota,
} from './storage.service';

// Routes
export { storageRouter } from './storage.routes';
