/**
 * Version Control Types and Validation Schemas
 * Requirements: 16 - Save drafts and revisions with version history
 * Requirements: 56 - Branching system with merge conflict resolution
 * Requirements: 102 - Auto-save functionality
 */

import { z } from 'zod';

// ============================================
// Validation Schemas
// ============================================

/**
 * Schema for creating a new version
 */
export const createVersionSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  content: z.string().min(1, 'Content is required'),
  changesSummary: z.string().max(500, 'Summary must be less than 500 characters').optional(),
  isAutoSave: z.boolean().default(false),
  branchId: z.string().uuid('Invalid branch ID').optional(),
});

/**
 * Schema for listing versions
 */
export const listVersionsSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  branchId: z.string().uuid('Invalid branch ID').optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  includeAutoSaves: z.coerce.boolean().default(false),
});

/**
 * Schema for version ID parameter
 */
export const versionIdSchema = z.object({
  id: z.string().uuid('Invalid version ID'),
});

/**
 * Schema for comparing versions
 */
export const compareVersionsSchema = z.object({
  versionId1: z.string().uuid('Invalid version ID'),
  versionId2: z.string().uuid('Invalid version ID'),
});

/**
 * Schema for restoring a version
 */
export const restoreVersionSchema = z.object({
  versionId: z.string().uuid('Invalid version ID'),
  createNewVersion: z.boolean().default(true),
});

// ============================================
// Types derived from schemas
// ============================================

export type CreateVersionInput = z.infer<typeof createVersionSchema>;
export type ListVersionsInput = z.infer<typeof listVersionsSchema>;
export type CompareVersionsInput = z.infer<typeof compareVersionsSchema>;
export type RestoreVersionInput = z.infer<typeof restoreVersionSchema>;

// ============================================
// Response Types
// ============================================

/**
 * Version response type
 */
export interface VersionResponse {
  id: string;
  projectId: string;
  branchId: string | null;
  versionNumber: number;
  documentId: string;
  contentHash: string;
  wordCount: number;
  changesSummary: string | null;
  isAutoSave: boolean;
  createdAt: Date;
  createdBy: string | null;
}

/**
 * Version list response with pagination
 */
export interface VersionListResponse {
  versions: VersionResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/**
 * Version with content for display
 */
export interface VersionWithContent extends VersionResponse {
  content: string;
}

/**
 * Diff change type
 */
export interface DiffChange {
  type: 'add' | 'remove' | 'unchanged';
  value: string;
  lineNumber?: number;
}

/**
 * Version comparison result
 */
export interface VersionComparisonResult {
  version1: VersionResponse;
  version2: VersionResponse;
  wordCountDiff: number;
  changes: DiffChange[];
  addedLines: number;
  removedLines: number;
  unchangedLines: number;
  similarityPercentage: number;
}

/**
 * Auto-save status
 */
export interface AutoSaveStatus {
  enabled: boolean;
  intervalSeconds: number;
  lastAutoSaveAt: Date | null;
  pendingChanges: boolean;
}

/**
 * Version history entry for timeline display
 */
export interface VersionHistoryEntry {
  id: string;
  versionNumber: number;
  wordCount: number;
  wordCountDiff: number;
  changesSummary: string | null;
  isAutoSave: boolean;
  createdAt: Date;
  createdBy: string | null;
}

// ============================================
// Branch Validation Schemas
// Requirements: 56 - Branching system
// ============================================

/**
 * Schema for creating a new branch
 */
export const createBranchSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  name: z.string().min(1, 'Branch name is required').max(100, 'Branch name must be less than 100 characters'),
  baseVersionId: z.string().uuid('Invalid base version ID').optional(),
  parentBranchId: z.string().uuid('Invalid parent branch ID').optional(),
});

/**
 * Schema for listing branches
 */
export const listBranchesSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
});

/**
 * Schema for branch ID parameter
 */
export const branchIdSchema = z.object({
  id: z.string().uuid('Invalid branch ID'),
});

/**
 * Schema for switching branches
 */
export const switchBranchSchema = z.object({
  branchId: z.string().uuid('Invalid branch ID'),
});

/**
 * Schema for merging branches
 */
export const mergeBranchSchema = z.object({
  sourceBranchId: z.string().uuid('Invalid source branch ID'),
  targetBranchId: z.string().uuid('Invalid target branch ID'),
  conflictResolution: z.enum(['source', 'target', 'manual']).default('manual'),
  manualResolutions: z.array(z.object({
    lineNumber: z.number(),
    resolution: z.enum(['source', 'target']),
  })).optional(),
});

/**
 * Schema for comparing branches
 */
export const compareBranchesSchema = z.object({
  branchId1: z.string().uuid('Invalid branch ID'),
  branchId2: z.string().uuid('Invalid branch ID'),
});

// ============================================
// Branch Types derived from schemas
// ============================================

export type CreateBranchInput = z.infer<typeof createBranchSchema>;
export type ListBranchesInput = z.infer<typeof listBranchesSchema>;
export type SwitchBranchInput = z.infer<typeof switchBranchSchema>;
export type MergeBranchInput = z.infer<typeof mergeBranchSchema>;
export type CompareBranchesInput = z.infer<typeof compareBranchesSchema>;

// ============================================
// Branch Response Types
// ============================================

/**
 * Branch response type
 */
export interface BranchResponse {
  id: string;
  projectId: string;
  name: string;
  parentBranchId: string | null;
  baseVersionId: string | null;
  isDefault: boolean;
  createdAt: Date;
  createdBy: string | null;
  mergedAt: Date | null;
  mergedInto: string | null;
}

/**
 * Branch with version count
 */
export interface BranchWithStats extends BranchResponse {
  versionCount: number;
  latestVersionNumber: number | null;
  latestVersionDate: Date | null;
}

/**
 * Branch tree node for visual display
 */
export interface BranchTreeNode {
  branch: BranchResponse;
  children: BranchTreeNode[];
  depth: number;
}

/**
 * Merge conflict type
 */
export interface MergeConflict {
  lineNumber: number;
  sourceContent: string;
  targetContent: string;
  type: 'add' | 'remove' | 'modify';
}

/**
 * Merge result type
 */
export interface MergeResult {
  success: boolean;
  mergedVersionId: string | null;
  conflicts: MergeConflict[];
  hasConflicts: boolean;
  sourceBranch: BranchResponse;
  targetBranch: BranchResponse;
  mergedContent?: string;
}

/**
 * Branch comparison result
 */
export interface BranchComparisonResult {
  branch1: BranchWithStats;
  branch2: BranchWithStats;
  commonAncestorVersionId: string | null;
  divergencePoint: Date | null;
  branch1AheadBy: number;
  branch2AheadBy: number;
  canMerge: boolean;
  potentialConflicts: number;
}
