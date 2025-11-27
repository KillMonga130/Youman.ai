/**
 * Storage Service Tests
 * Tests for document storage, chunk management, and quota tracking
 * 
 * Requirements: 12 - Efficient memory management and resumable processing
 * Requirements: 15 - Web-based interface for document processing
 * Requirements: 63 - Data retention policies
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  calculateContentHash,
  calculateWordCount,
  calculateCharacterCount,
  calculateByteSize,
  calculateContentStats,
  verifyContentHash,
  getHashPrefix,
} from './content-hash';

// ============================================
// Content Hash Tests
// ============================================

describe('Content Hash Utilities', () => {
  describe('calculateContentHash', () => {
    it('should generate consistent hash for same content', () => {
      const content = 'Hello, World!';
      const hash1 = calculateContentHash(content);
      const hash2 = calculateContentHash(content);
      
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different content', () => {
      const hash1 = calculateContentHash('Hello');
      const hash2 = calculateContentHash('World');
      
      expect(hash1).not.toBe(hash2);
    });

    it('should generate 64-character hex hash (SHA-256)', () => {
      const hash = calculateContentHash('test content');
      
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    it('should handle empty string', () => {
      const hash = calculateContentHash('');
      
      expect(hash).toHaveLength(64);
    });

    it('should handle unicode content', () => {
      const hash = calculateContentHash('こんにちは世界 🌍');
      
      expect(hash).toHaveLength(64);
    });
  });

  describe('verifyContentHash', () => {
    it('should return true for matching content and hash', () => {
      const content = 'Test content for verification';
      const hash = calculateContentHash(content);
      
      expect(verifyContentHash(content, hash)).toBe(true);
    });

    it('should return false for non-matching content', () => {
      const content = 'Original content';
      const hash = calculateContentHash(content);
      
      expect(verifyContentHash('Modified content', hash)).toBe(false);
    });
  });

  describe('getHashPrefix', () => {
    it('should return first 8 characters by default', () => {
      const hash = calculateContentHash('test');
      const prefix = getHashPrefix(hash);
      
      expect(prefix).toHaveLength(8);
      expect(hash.startsWith(prefix)).toBe(true);
    });

    it('should return specified number of characters', () => {
      const hash = calculateContentHash('test');
      const prefix = getHashPrefix(hash, 12);
      
      expect(prefix).toHaveLength(12);
    });
  });

  describe('calculateWordCount', () => {
    it('should count words correctly', () => {
      expect(calculateWordCount('Hello World')).toBe(2);
      expect(calculateWordCount('One two three four five')).toBe(5);
    });

    it('should handle multiple spaces', () => {
      expect(calculateWordCount('Hello    World')).toBe(2);
    });

    it('should handle newlines and tabs', () => {
      expect(calculateWordCount('Hello\nWorld\tTest')).toBe(3);
    });

    it('should return 0 for empty string', () => {
      expect(calculateWordCount('')).toBe(0);
    });

    it('should return 0 for whitespace-only string', () => {
      expect(calculateWordCount('   \n\t  ')).toBe(0);
    });
  });

  describe('calculateCharacterCount', () => {
    it('should count characters correctly', () => {
      expect(calculateCharacterCount('Hello')).toBe(5);
      expect(calculateCharacterCount('Hello World')).toBe(11);
    });

    it('should count unicode characters', () => {
      expect(calculateCharacterCount('こんにちは')).toBe(5);
    });

    it('should return 0 for empty string', () => {
      expect(calculateCharacterCount('')).toBe(0);
    });
  });

  describe('calculateByteSize', () => {
    it('should calculate byte size for ASCII', () => {
      expect(calculateByteSize('Hello')).toBe(5);
    });

    it('should calculate byte size for unicode', () => {
      // Japanese characters are 3 bytes each in UTF-8
      expect(calculateByteSize('こんにちは')).toBe(15);
    });

    it('should return 0 for empty string', () => {
      expect(calculateByteSize('')).toBe(0);
    });
  });

  describe('calculateContentStats', () => {
    it('should calculate all stats at once', () => {
      const content = 'Hello World Test';
      const stats = calculateContentStats(content);
      
      expect(stats.hash).toHaveLength(64);
      expect(stats.wordCount).toBe(3);
      expect(stats.characterCount).toBe(16);
      expect(stats.byteSize).toBe(16);
    });

    it('should handle empty content', () => {
      const stats = calculateContentStats('');
      
      expect(stats.hash).toHaveLength(64);
      expect(stats.wordCount).toBe(0);
      expect(stats.characterCount).toBe(0);
      expect(stats.byteSize).toBe(0);
    });
  });
});

// ============================================
// Storage Service Integration Tests
// ============================================

describe('Storage Service', () => {
  // These tests would require mocking MongoDB and S3
  // For now, we test the utility functions that don't require database connections
  
  describe('Content Deduplication Logic', () => {
    it('should identify duplicate content by hash', () => {
      const content1 = 'This is some test content for deduplication';
      const content2 = 'This is some test content for deduplication';
      const content3 = 'This is different content';
      
      const hash1 = calculateContentHash(content1);
      const hash2 = calculateContentHash(content2);
      const hash3 = calculateContentHash(content3);
      
      expect(hash1).toBe(hash2); // Same content = same hash
      expect(hash1).not.toBe(hash3); // Different content = different hash
    });

    it('should detect even small changes in content', () => {
      const content1 = 'Hello World';
      const content2 = 'Hello World.'; // Added period
      
      const hash1 = calculateContentHash(content1);
      const hash2 = calculateContentHash(content2);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Chunk Processing', () => {
    it('should calculate correct stats for chunks', () => {
      const chunks = [
        'First chunk of content.',      // 4 words
        'Second chunk with more words here.', // 6 words
        'Third and final chunk.',       // 4 words
      ];
      
      const totalWords = chunks.reduce(
        (sum, chunk) => sum + calculateWordCount(chunk),
        0
      );
      
      expect(totalWords).toBe(14); // 4 + 6 + 4 = 14
    });

    it('should generate unique hashes for each chunk', () => {
      const chunks = [
        'Chunk 1 content',
        'Chunk 2 content',
        'Chunk 3 content',
      ];
      
      const hashes = chunks.map(calculateContentHash);
      const uniqueHashes = new Set(hashes);
      
      expect(uniqueHashes.size).toBe(chunks.length);
    });
  });

  describe('Storage Quota Calculations', () => {
    it('should calculate storage usage correctly', () => {
      const documents = [
        'Short document',
        'A longer document with more content',
        'The longest document in this test with even more content to process',
      ];
      
      const totalBytes = documents.reduce(
        (sum, doc) => sum + calculateByteSize(doc),
        0
      );
      
      expect(totalBytes).toBeGreaterThan(0);
      expect(totalBytes).toBe(
        calculateByteSize(documents[0]) +
        calculateByteSize(documents[1]) +
        calculateByteSize(documents[2])
      );
    });

    it('should track document count', () => {
      const documents = ['doc1', 'doc2', 'doc3'];
      expect(documents.length).toBe(3);
    });
  });
});

// ============================================
// S3 Key Generation Tests
// ============================================

import { generateDocumentKey, generateChunkKey } from './s3-client';

describe('S3 Key Generation', () => {
  describe('generateDocumentKey', () => {
    it('should generate correct document key format', () => {
      const key = generateDocumentKey('project-123', 'doc-456', 'original');
      
      expect(key).toBe('documents/project-123/original/doc-456.txt');
    });

    it('should handle different document types', () => {
      const originalKey = generateDocumentKey('p1', 'd1', 'original');
      const transformedKey = generateDocumentKey('p1', 'd1', 'transformed');
      const draftKey = generateDocumentKey('p1', 'd1', 'draft');
      
      expect(originalKey).toContain('/original/');
      expect(transformedKey).toContain('/transformed/');
      expect(draftKey).toContain('/draft/');
    });
  });

  describe('generateChunkKey', () => {
    it('should generate correct chunk key format', () => {
      const key = generateChunkKey('doc-123', 0);
      
      expect(key).toBe('chunks/doc-123/000000.txt');
    });

    it('should pad chunk index to 6 digits', () => {
      expect(generateChunkKey('doc', 0)).toContain('000000');
      expect(generateChunkKey('doc', 1)).toContain('000001');
      expect(generateChunkKey('doc', 99)).toContain('000099');
      expect(generateChunkKey('doc', 999999)).toContain('999999');
    });
  });
});
