/**
 * Content Hash Utility
 * Provides content hashing for deduplication
 * 
 * Requirements: 12 - Efficient memory management
 * Requirements: 15 - Document storage with deduplication
 */

import { createHash } from 'crypto';

/**
 * Calculate SHA-256 hash of content
 * Used for content deduplication
 */
export function calculateContentHash(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex');
}

/**
 * Calculate hash for a buffer
 */
export function calculateBufferHash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

/**
 * Calculate hash for streaming content (large files)
 * Processes content in chunks to avoid memory issues
 */
export function calculateStreamingHash(chunks: string[]): string {
  const hash = createHash('sha256');
  for (const chunk of chunks) {
    hash.update(chunk, 'utf-8');
  }
  return hash.digest('hex');
}

/**
 * Generate a short hash prefix for display purposes
 */
export function getHashPrefix(hash: string, length: number = 8): string {
  return hash.substring(0, length);
}

/**
 * Verify content matches a given hash
 */
export function verifyContentHash(content: string, expectedHash: string): boolean {
  const actualHash = calculateContentHash(content);
  return actualHash === expectedHash;
}

/**
 * Calculate word count from content
 */
export function calculateWordCount(content: string): number {
  if (!content || content.trim().length === 0) {
    return 0;
  }
  // Split by whitespace and filter empty strings
  return content.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Calculate character count from content
 */
export function calculateCharacterCount(content: string): number {
  return content.length;
}

/**
 * Calculate byte size of content
 */
export function calculateByteSize(content: string): number {
  return Buffer.byteLength(content, 'utf-8');
}

/**
 * Content statistics
 */
export interface ContentStats {
  hash: string;
  wordCount: number;
  characterCount: number;
  byteSize: number;
}

/**
 * Calculate all content statistics at once
 */
export function calculateContentStats(content: string): ContentStats {
  return {
    hash: calculateContentHash(content),
    wordCount: calculateWordCount(content),
    characterCount: calculateCharacterCount(content),
    byteSize: calculateByteSize(content),
  };
}
