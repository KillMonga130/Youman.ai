/**
 * Version Control Service Tests
 * 
 * Requirements: 16 - Save drafts and revisions with version history
 * Requirements: 102 - Auto-save functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateContentHash,
  countWords,
  computeDiff,
} from './version.service';
import {
  DEFAULT_AUTO_SAVE_INTERVAL_MS,
} from './auto-save.service';

// ============================================
// Unit Tests for Helper Functions
// ============================================

describe('Version Service - Helper Functions', () => {
  describe('calculateContentHash', () => {
    it('should return consistent hash for same content', () => {
      const content = 'Hello, world!';
      const hash1 = calculateContentHash(content);
      const hash2 = calculateContentHash(content);
      
      expect(hash1).toBe(hash2);
    });

    it('should return different hash for different content', () => {
      const hash1 = calculateContentHash('Hello, world!');
      const hash2 = calculateContentHash('Hello, universe!');
      
      expect(hash1).not.toBe(hash2);
    });

    it('should return 64-character hex string (SHA-256)', () => {
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

  describe('countWords', () => {
    it('should count words correctly', () => {
      expect(countWords('Hello world')).toBe(2);
      expect(countWords('One two three four five')).toBe(5);
    });

    it('should handle multiple spaces', () => {
      expect(countWords('Hello    world')).toBe(2);
    });

    it('should handle tabs and newlines', () => {
      expect(countWords('Hello\tworld\ntest')).toBe(3);
    });

    it('should return 0 for empty string', () => {
      expect(countWords('')).toBe(0);
    });

    it('should return 0 for whitespace-only string', () => {
      expect(countWords('   \t\n  ')).toBe(0);
    });

    it('should handle leading and trailing whitespace', () => {
      expect(countWords('  Hello world  ')).toBe(2);
    });
  });

  describe('computeDiff', () => {
    it('should detect no changes for identical text', () => {
      const text = 'Line 1\nLine 2\nLine 3';
      const diff = computeDiff(text, text);
      
      const unchangedCount = diff.filter(d => d.type === 'unchanged').length;
      expect(unchangedCount).toBe(3);
    });

    it('should detect added lines', () => {
      const text1 = 'Line 1\nLine 2';
      const text2 = 'Line 1\nLine 2\nLine 3';
      const diff = computeDiff(text1, text2);
      
      const addedLines = diff.filter(d => d.type === 'add');
      expect(addedLines.length).toBeGreaterThan(0);
    });

    it('should detect removed lines', () => {
      const text1 = 'Line 1\nLine 2\nLine 3';
      const text2 = 'Line 1\nLine 3';
      const diff = computeDiff(text1, text2);
      
      const removedLines = diff.filter(d => d.type === 'remove');
      expect(removedLines.length).toBeGreaterThan(0);
    });

    it('should handle empty strings', () => {
      const diff1 = computeDiff('', 'New content');
      expect(diff1.some(d => d.type === 'add')).toBe(true);
      
      const diff2 = computeDiff('Old content', '');
      expect(diff2.some(d => d.type === 'remove')).toBe(true);
    });

    it('should handle single line changes', () => {
      const text1 = 'Hello world';
      const text2 = 'Hello universe';
      const diff = computeDiff(text1, text2);
      
      expect(diff.length).toBeGreaterThan(0);
    });
  });
});

// ============================================
// Auto-Save Service Tests
// ============================================

describe('Auto-Save Service', () => {
  describe('DEFAULT_AUTO_SAVE_INTERVAL_MS', () => {
    it('should be 2 minutes (120000ms)', () => {
      // Requirements: 16.4 - Auto-save drafts every 2 minutes
      expect(DEFAULT_AUTO_SAVE_INTERVAL_MS).toBe(2 * 60 * 1000);
      expect(DEFAULT_AUTO_SAVE_INTERVAL_MS).toBe(120000);
    });
  });
});

// ============================================
// Type Validation Tests
// ============================================

describe('Version Types', () => {
  describe('createVersionSchema', () => {
    it('should validate correct input', async () => {
      const { createVersionSchema } = await import('./types');
      
      const validInput = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        content: 'Test content',
        changesSummary: 'Initial version',
        isAutoSave: false,
      };
      
      const result = createVersionSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid project ID', async () => {
      const { createVersionSchema } = await import('./types');
      
      const invalidInput = {
        projectId: 'not-a-uuid',
        content: 'Test content',
      };
      
      const result = createVersionSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject empty content', async () => {
      const { createVersionSchema } = await import('./types');
      
      const invalidInput = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        content: '',
      };
      
      const result = createVersionSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should default isAutoSave to false', async () => {
      const { createVersionSchema } = await import('./types');
      
      const input = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        content: 'Test content',
      };
      
      const result = createVersionSchema.parse(input);
      expect(result.isAutoSave).toBe(false);
    });
  });

  describe('listVersionsSchema', () => {
    it('should validate correct input', async () => {
      const { listVersionsSchema } = await import('./types');
      
      const validInput = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        page: 1,
        limit: 20,
        includeAutoSaves: false,
      };
      
      const result = listVersionsSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should apply default values', async () => {
      const { listVersionsSchema } = await import('./types');
      
      const input = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
      };
      
      const result = listVersionsSchema.parse(input);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.includeAutoSaves).toBe(false);
    });
  });

  describe('compareVersionsSchema', () => {
    it('should validate correct input', async () => {
      const { compareVersionsSchema } = await import('./types');
      
      const validInput = {
        versionId1: '123e4567-e89b-12d3-a456-426614174000',
        versionId2: '123e4567-e89b-12d3-a456-426614174001',
      };
      
      const result = compareVersionsSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUIDs', async () => {
      const { compareVersionsSchema } = await import('./types');
      
      const invalidInput = {
        versionId1: 'invalid',
        versionId2: '123e4567-e89b-12d3-a456-426614174001',
      };
      
      const result = compareVersionsSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('restoreVersionSchema', () => {
    it('should validate correct input', async () => {
      const { restoreVersionSchema } = await import('./types');
      
      const validInput = {
        versionId: '123e4567-e89b-12d3-a456-426614174000',
        createNewVersion: true,
      };
      
      const result = restoreVersionSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should default createNewVersion to true', async () => {
      const { restoreVersionSchema } = await import('./types');
      
      const input = {
        versionId: '123e4567-e89b-12d3-a456-426614174000',
      };
      
      const result = restoreVersionSchema.parse(input);
      expect(result.createNewVersion).toBe(true);
    });
  });
});

// ============================================
// Diff Algorithm Tests
// ============================================

describe('Diff Algorithm', () => {
  it('should correctly identify unchanged lines', () => {
    const text1 = 'Line A\nLine B\nLine C';
    const text2 = 'Line A\nLine B\nLine C';
    const diff = computeDiff(text1, text2);
    
    expect(diff.every(d => d.type === 'unchanged')).toBe(true);
    expect(diff.length).toBe(3);
  });

  it('should correctly identify a single line addition at end', () => {
    const text1 = 'Line A\nLine B';
    const text2 = 'Line A\nLine B\nLine C';
    const diff = computeDiff(text1, text2);
    
    const added = diff.filter(d => d.type === 'add');
    expect(added.length).toBe(1);
    expect(added[0].value).toBe('Line C');
  });

  it('should correctly identify a single line removal', () => {
    const text1 = 'Line A\nLine B\nLine C';
    const text2 = 'Line A\nLine C';
    const diff = computeDiff(text1, text2);
    
    const removed = diff.filter(d => d.type === 'remove');
    expect(removed.length).toBe(1);
    expect(removed[0].value).toBe('Line B');
  });

  it('should handle complete replacement', () => {
    const text1 = 'Old content';
    const text2 = 'New content';
    const diff = computeDiff(text1, text2);
    
    const added = diff.filter(d => d.type === 'add');
    const removed = diff.filter(d => d.type === 'remove');
    
    expect(added.length).toBe(1);
    expect(removed.length).toBe(1);
  });

  it('should handle insertion in the middle', () => {
    const text1 = 'Line A\nLine C';
    const text2 = 'Line A\nLine B\nLine C';
    const diff = computeDiff(text1, text2);
    
    const added = diff.filter(d => d.type === 'add');
    expect(added.length).toBe(1);
    expect(added[0].value).toBe('Line B');
  });
});


// ============================================
// Branch Service Tests
// Requirements: 56 - Branching system with merge conflict resolution
// ============================================

describe('Branch Service', () => {
  describe('Branch Types Validation', () => {
    describe('createBranchSchema', () => {
      it('should validate correct input', async () => {
        const { createBranchSchema } = await import('./types');
        
        const validInput = {
          projectId: '123e4567-e89b-12d3-a456-426614174000',
          name: 'feature-branch',
        };
        
        const result = createBranchSchema.safeParse(validInput);
        expect(result.success).toBe(true);
      });

      it('should validate input with optional fields', async () => {
        const { createBranchSchema } = await import('./types');
        
        const validInput = {
          projectId: '123e4567-e89b-12d3-a456-426614174000',
          name: 'feature-branch',
          baseVersionId: '123e4567-e89b-12d3-a456-426614174001',
          parentBranchId: '123e4567-e89b-12d3-a456-426614174002',
        };
        
        const result = createBranchSchema.safeParse(validInput);
        expect(result.success).toBe(true);
      });

      it('should reject invalid project ID', async () => {
        const { createBranchSchema } = await import('./types');
        
        const invalidInput = {
          projectId: 'not-a-uuid',
          name: 'feature-branch',
        };
        
        const result = createBranchSchema.safeParse(invalidInput);
        expect(result.success).toBe(false);
      });

      it('should reject empty branch name', async () => {
        const { createBranchSchema } = await import('./types');
        
        const invalidInput = {
          projectId: '123e4567-e89b-12d3-a456-426614174000',
          name: '',
        };
        
        const result = createBranchSchema.safeParse(invalidInput);
        expect(result.success).toBe(false);
      });

      it('should reject branch name over 100 characters', async () => {
        const { createBranchSchema } = await import('./types');
        
        const invalidInput = {
          projectId: '123e4567-e89b-12d3-a456-426614174000',
          name: 'a'.repeat(101),
        };
        
        const result = createBranchSchema.safeParse(invalidInput);
        expect(result.success).toBe(false);
      });
    });

    describe('mergeBranchSchema', () => {
      it('should validate correct input', async () => {
        const { mergeBranchSchema } = await import('./types');
        
        const validInput = {
          sourceBranchId: '123e4567-e89b-12d3-a456-426614174000',
          targetBranchId: '123e4567-e89b-12d3-a456-426614174001',
        };
        
        const result = mergeBranchSchema.safeParse(validInput);
        expect(result.success).toBe(true);
      });

      it('should default conflictResolution to manual', async () => {
        const { mergeBranchSchema } = await import('./types');
        
        const input = {
          sourceBranchId: '123e4567-e89b-12d3-a456-426614174000',
          targetBranchId: '123e4567-e89b-12d3-a456-426614174001',
        };
        
        const result = mergeBranchSchema.parse(input);
        expect(result.conflictResolution).toBe('manual');
      });

      it('should accept valid conflict resolution strategies', async () => {
        const { mergeBranchSchema } = await import('./types');
        
        const strategies = ['source', 'target', 'manual'];
        
        for (const strategy of strategies) {
          const input = {
            sourceBranchId: '123e4567-e89b-12d3-a456-426614174000',
            targetBranchId: '123e4567-e89b-12d3-a456-426614174001',
            conflictResolution: strategy,
          };
          
          const result = mergeBranchSchema.safeParse(input);
          expect(result.success).toBe(true);
        }
      });

      it('should reject invalid conflict resolution strategy', async () => {
        const { mergeBranchSchema } = await import('./types');
        
        const invalidInput = {
          sourceBranchId: '123e4567-e89b-12d3-a456-426614174000',
          targetBranchId: '123e4567-e89b-12d3-a456-426614174001',
          conflictResolution: 'invalid',
        };
        
        const result = mergeBranchSchema.safeParse(invalidInput);
        expect(result.success).toBe(false);
      });
    });

    describe('compareBranchesSchema', () => {
      it('should validate correct input', async () => {
        const { compareBranchesSchema } = await import('./types');
        
        const validInput = {
          branchId1: '123e4567-e89b-12d3-a456-426614174000',
          branchId2: '123e4567-e89b-12d3-a456-426614174001',
        };
        
        const result = compareBranchesSchema.safeParse(validInput);
        expect(result.success).toBe(true);
      });

      it('should reject invalid UUIDs', async () => {
        const { compareBranchesSchema } = await import('./types');
        
        const invalidInput = {
          branchId1: 'invalid',
          branchId2: '123e4567-e89b-12d3-a456-426614174001',
        };
        
        const result = compareBranchesSchema.safeParse(invalidInput);
        expect(result.success).toBe(false);
      });
    });

    describe('switchBranchSchema', () => {
      it('should validate correct input', async () => {
        const { switchBranchSchema } = await import('./types');
        
        const validInput = {
          branchId: '123e4567-e89b-12d3-a456-426614174000',
        };
        
        const result = switchBranchSchema.safeParse(validInput);
        expect(result.success).toBe(true);
      });

      it('should reject invalid branch ID', async () => {
        const { switchBranchSchema } = await import('./types');
        
        const invalidInput = {
          branchId: 'not-a-uuid',
        };
        
        const result = switchBranchSchema.safeParse(invalidInput);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Merge Conflict Detection', () => {
    it('should detect no conflicts for identical content', async () => {
      const { detectMergeConflicts } = await import('./branch.service');
      
      const content = 'Line 1\nLine 2\nLine 3';
      const conflicts = detectMergeConflicts(content, content);
      
      expect(conflicts.length).toBe(0);
    });

    it('should detect conflicts for different content', async () => {
      const { detectMergeConflicts } = await import('./branch.service');
      
      const source = 'Line 1\nLine 2 modified\nLine 3';
      const target = 'Line 1\nLine 2 changed\nLine 3';
      const conflicts = detectMergeConflicts(source, target);
      
      expect(conflicts.length).toBeGreaterThan(0);
    });

    it('should detect added lines as conflicts', async () => {
      const { detectMergeConflicts } = await import('./branch.service');
      
      const source = 'Line 1\nLine 2';
      const target = 'Line 1\nLine 2\nLine 3';
      const conflicts = detectMergeConflicts(source, target);
      
      expect(conflicts.some(c => c.type === 'add' || c.type === 'modify')).toBe(true);
    });

    it('should detect removed lines as conflicts', async () => {
      const { detectMergeConflicts } = await import('./branch.service');
      
      const source = 'Line 1\nLine 2\nLine 3';
      const target = 'Line 1\nLine 3';
      const conflicts = detectMergeConflicts(source, target);
      
      expect(conflicts.some(c => c.type === 'remove' || c.type === 'modify')).toBe(true);
    });

    it('should handle empty source content', async () => {
      const { detectMergeConflicts } = await import('./branch.service');
      
      const source = '';
      const target = 'Line 1\nLine 2';
      const conflicts = detectMergeConflicts(source, target);
      
      expect(conflicts.length).toBeGreaterThan(0);
    });

    it('should handle empty target content', async () => {
      const { detectMergeConflicts } = await import('./branch.service');
      
      const source = 'Line 1\nLine 2';
      const target = '';
      const conflicts = detectMergeConflicts(source, target);
      
      expect(conflicts.length).toBeGreaterThan(0);
    });
  });
});
