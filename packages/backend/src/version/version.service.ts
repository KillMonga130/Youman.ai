/**
 * Version Control Service
 * Handles version creation, history, comparison, and restoration
 * 
 * Requirements: 16 - Save drafts and revisions with version history
 * Requirements: 102 - Auto-save functionality every 2 minutes
 */

import crypto from 'crypto';
import { prisma } from '../database/prisma';
import { DocumentModel } from '../database/schemas';
import { logger } from '../utils/logger';
import type {
  CreateVersionInput,
  ListVersionsInput,
  CompareVersionsInput,
  RestoreVersionInput,
  VersionResponse,
  VersionListResponse,
  VersionWithContent,
  VersionComparisonResult,
  DiffChange,
  VersionHistoryEntry,
} from './types';

// ============================================
// Error Classes
// ============================================

/**
 * Custom error class for version-related errors
 */
export class VersionError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'VersionError';
    this.code = code;
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Calculate content hash using SHA-256
 */
export function calculateContentHash(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Count words in text
 */
export function countWords(text: string): number {
  if (!text || text.trim().length === 0) {
    return 0;
  }
  return text.trim().split(/\s+/).length;
}

/**
 * Transform database version to response format
 */
function toVersionResponse(version: {
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
}): VersionResponse {
  return {
    id: version.id,
    projectId: version.projectId,
    branchId: version.branchId,
    versionNumber: version.versionNumber,
    documentId: version.documentId,
    contentHash: version.contentHash,
    wordCount: version.wordCount,
    changesSummary: version.changesSummary,
    isAutoSave: version.isAutoSave,
    createdAt: version.createdAt,
    createdBy: version.createdBy,
  };
}

/**
 * Simple diff algorithm for comparing text
 * Returns line-by-line changes
 */
export function computeDiff(text1: string, text2: string): DiffChange[] {
  const lines1 = text1.split('\n');
  const lines2 = text2.split('\n');
  const changes: DiffChange[] = [];

  // Use a simple LCS-based diff approach
  const lcs = computeLCS(lines1, lines2);
  
  let i = 0;
  let j = 0;
  let lcsIndex = 0;

  while (i < lines1.length || j < lines2.length) {
    if (lcsIndex < lcs.length && i < lines1.length && lines1[i] === lcs[lcsIndex]) {
      if (j < lines2.length && lines2[j] === lcs[lcsIndex]) {
        // Line is unchanged
        changes.push({
          type: 'unchanged',
          value: lines1[i],
          lineNumber: j + 1,
        });
        i++;
        j++;
        lcsIndex++;
      } else {
        // Line was added in text2
        changes.push({
          type: 'add',
          value: lines2[j],
          lineNumber: j + 1,
        });
        j++;
      }
    } else if (i < lines1.length) {
      // Line was removed from text1
      changes.push({
        type: 'remove',
        value: lines1[i],
        lineNumber: i + 1,
      });
      i++;
    } else if (j < lines2.length) {
      // Line was added in text2
      changes.push({
        type: 'add',
        value: lines2[j],
        lineNumber: j + 1,
      });
      j++;
    }
  }

  return changes;
}

/**
 * Compute Longest Common Subsequence for diff
 */
function computeLCS(arr1: string[], arr2: string[]): string[] {
  const m = arr1.length;
  const n = arr2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (arr1[i - 1] === arr2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find LCS
  const lcs: string[] = [];
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (arr1[i - 1] === arr2[j - 1]) {
      lcs.unshift(arr1[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return lcs;
}

// ============================================
// Version CRUD Operations
// ============================================

/**
 * Create a new version
 * Requirements: 16.1 - Store current state with timestamp and version number
 */
export async function createVersion(
  userId: string,
  input: CreateVersionInput
): Promise<VersionResponse> {
  const { projectId, content, changesSummary, isAutoSave, branchId } = input;

  // Verify project exists and user has access
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      collaborators: {
        where: { userId },
      },
    },
  });

  if (!project) {
    throw new VersionError('Project not found', 'PROJECT_NOT_FOUND');
  }

  const isOwner = project.ownerId === userId;
  const isCollaborator = project.collaborators.length > 0;
  const collaboratorRole = project.collaborators[0]?.role;

  if (!isOwner && !isCollaborator) {
    throw new VersionError('Access denied', 'ACCESS_DENIED');
  }

  // Collaborators with VIEWER role cannot create versions
  if (!isOwner && collaboratorRole === 'VIEWER') {
    throw new VersionError('Viewers cannot create versions', 'ACCESS_DENIED');
  }

  // Calculate content hash and word count
  const contentHash = calculateContentHash(content);
  const wordCount = countWords(content);

  // Get the next version number for this project/branch
  const lastVersion = await prisma.version.findFirst({
    where: {
      projectId,
      branchId: branchId ?? null,
    },
    orderBy: { versionNumber: 'desc' },
  });

  const versionNumber = (lastVersion?.versionNumber ?? 0) + 1;

  // Check if content is identical to last version (skip if same hash)
  if (lastVersion && lastVersion.contentHash === contentHash) {
    logger.debug('Content unchanged, returning existing version', {
      projectId,
      versionId: lastVersion.id,
    });
    return toVersionResponse(lastVersion);
  }

  // Store document content in MongoDB
  const document = await DocumentModel.create({
    projectId,
    versionId: undefined, // Will be updated after version creation
    type: 'draft',
    content,
    contentHash,
    wordCount,
    characterCount: content.length,
    metadata: {
      language: 'en',
      format: 'plain',
      encoding: 'utf-8',
    },
  });

  // Create version in PostgreSQL
  const version = await prisma.version.create({
    data: {
      projectId,
      branchId: branchId ?? null,
      versionNumber,
      documentId: document._id.toString(),
      contentHash,
      wordCount,
      changesSummary: changesSummary ?? null,
      isAutoSave,
      createdBy: userId,
    },
  });

  // Update document with version ID
  await DocumentModel.updateOne(
    { _id: document._id },
    { versionId: version.id }
  );

  // Update project word count
  await prisma.project.update({
    where: { id: projectId },
    data: { wordCount },
  });

  logger.info('Version created', {
    versionId: version.id,
    projectId,
    versionNumber,
    isAutoSave,
    userId,
  });

  return toVersionResponse(version);
}

/**
 * Get a version by ID
 */
export async function getVersion(
  versionId: string,
  userId: string
): Promise<VersionResponse> {
  const version = await prisma.version.findUnique({
    where: { id: versionId },
    include: {
      project: {
        include: {
          collaborators: {
            where: { userId },
          },
        },
      },
    },
  });

  if (!version) {
    throw new VersionError('Version not found', 'VERSION_NOT_FOUND');
  }

  // Check access
  const isOwner = version.project.ownerId === userId;
  const isCollaborator = version.project.collaborators.length > 0;

  if (!isOwner && !isCollaborator) {
    throw new VersionError('Access denied', 'ACCESS_DENIED');
  }

  return toVersionResponse(version);
}

/**
 * Get version with content
 * Requirements: 16.3 - Load version and allow restoration or comparison
 */
export async function getVersionWithContent(
  versionId: string,
  userId: string
): Promise<VersionWithContent> {
  const version = await getVersion(versionId, userId);

  // Fetch content from MongoDB
  const document = await DocumentModel.findById(version.documentId);

  if (!document) {
    throw new VersionError('Version content not found', 'CONTENT_NOT_FOUND');
  }

  return {
    ...version,
    content: document.content,
  };
}

/**
 * List versions for a project
 * Requirements: 16.2 - Display all saved versions with timestamps and word count differences
 */
export async function listVersions(
  userId: string,
  input: ListVersionsInput
): Promise<VersionListResponse> {
  const { projectId, branchId, page, limit, includeAutoSaves } = input;
  const skip = (page - 1) * limit;

  // Verify project access
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      collaborators: {
        where: { userId },
      },
    },
  });

  if (!project) {
    throw new VersionError('Project not found', 'PROJECT_NOT_FOUND');
  }

  const isOwner = project.ownerId === userId;
  const isCollaborator = project.collaborators.length > 0;

  if (!isOwner && !isCollaborator) {
    throw new VersionError('Access denied', 'ACCESS_DENIED');
  }

  // Build where clause
  const whereClause: {
    projectId: string;
    branchId?: string | null;
    isAutoSave?: boolean;
  } = { projectId };

  if (branchId !== undefined) {
    whereClause.branchId = branchId;
  }

  if (!includeAutoSaves) {
    whereClause.isAutoSave = false;
  }

  // Execute queries
  const [versions, total] = await Promise.all([
    prisma.version.findMany({
      where: whereClause,
      orderBy: { versionNumber: 'desc' },
      skip,
      take: limit,
    }),
    prisma.version.count({ where: whereClause }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    versions: versions.map(toVersionResponse),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  };
}


/**
 * Get version history with word count differences
 * Requirements: 16.2 - Display all saved versions with timestamps and word count differences
 */
export async function getVersionHistory(
  projectId: string,
  userId: string,
  branchId?: string
): Promise<VersionHistoryEntry[]> {
  // Verify project access
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      collaborators: {
        where: { userId },
      },
    },
  });

  if (!project) {
    throw new VersionError('Project not found', 'PROJECT_NOT_FOUND');
  }

  const isOwner = project.ownerId === userId;
  const isCollaborator = project.collaborators.length > 0;

  if (!isOwner && !isCollaborator) {
    throw new VersionError('Access denied', 'ACCESS_DENIED');
  }

  // Get all versions ordered by version number
  const versions = await prisma.version.findMany({
    where: {
      projectId,
      branchId: branchId ?? null,
    },
    orderBy: { versionNumber: 'desc' },
  });

  // Calculate word count differences
  const history: VersionHistoryEntry[] = versions.map((version, index) => {
    const previousVersion = versions[index + 1];
    const wordCountDiff = previousVersion
      ? version.wordCount - previousVersion.wordCount
      : version.wordCount;

    return {
      id: version.id,
      versionNumber: version.versionNumber,
      wordCount: version.wordCount,
      wordCountDiff,
      changesSummary: version.changesSummary,
      isAutoSave: version.isAutoSave,
      createdAt: version.createdAt,
      createdBy: version.createdBy,
    };
  });

  return history;
}

/**
 * Compare two versions
 * Requirements: 16.3 - Load version and allow restoration or comparison
 */
export async function compareVersions(
  userId: string,
  input: CompareVersionsInput
): Promise<VersionComparisonResult> {
  const { versionId1, versionId2 } = input;

  // Get both versions with content
  const [version1, version2] = await Promise.all([
    getVersionWithContent(versionId1, userId),
    getVersionWithContent(versionId2, userId),
  ]);

  // Ensure both versions belong to the same project
  if (version1.projectId !== version2.projectId) {
    throw new VersionError(
      'Cannot compare versions from different projects',
      'INVALID_COMPARISON'
    );
  }

  // Compute diff
  const changes = computeDiff(version1.content, version2.content);

  // Count change types
  const addedLines = changes.filter(c => c.type === 'add').length;
  const removedLines = changes.filter(c => c.type === 'remove').length;
  const unchangedLines = changes.filter(c => c.type === 'unchanged').length;

  // Calculate similarity percentage
  const totalLines = addedLines + removedLines + unchangedLines;
  const similarityPercentage = totalLines > 0
    ? Math.round((unchangedLines / totalLines) * 100)
    : 100;

  return {
    version1: {
      id: version1.id,
      projectId: version1.projectId,
      branchId: version1.branchId,
      versionNumber: version1.versionNumber,
      documentId: version1.documentId,
      contentHash: version1.contentHash,
      wordCount: version1.wordCount,
      changesSummary: version1.changesSummary,
      isAutoSave: version1.isAutoSave,
      createdAt: version1.createdAt,
      createdBy: version1.createdBy,
    },
    version2: {
      id: version2.id,
      projectId: version2.projectId,
      branchId: version2.branchId,
      versionNumber: version2.versionNumber,
      documentId: version2.documentId,
      contentHash: version2.contentHash,
      wordCount: version2.wordCount,
      changesSummary: version2.changesSummary,
      isAutoSave: version2.isAutoSave,
      createdAt: version2.createdAt,
      createdBy: version2.createdBy,
    },
    wordCountDiff: version2.wordCount - version1.wordCount,
    changes,
    addedLines,
    removedLines,
    unchangedLines,
    similarityPercentage,
  };
}

/**
 * Restore a version
 * Requirements: 16.3 - Load version and allow restoration
 */
export async function restoreVersion(
  userId: string,
  input: RestoreVersionInput
): Promise<VersionResponse> {
  const { versionId, createNewVersion } = input;

  // Get the version to restore
  const versionToRestore = await getVersionWithContent(versionId, userId);

  // Verify user has edit access
  const project = await prisma.project.findUnique({
    where: { id: versionToRestore.projectId },
    include: {
      collaborators: {
        where: { userId },
      },
    },
  });

  if (!project) {
    throw new VersionError('Project not found', 'PROJECT_NOT_FOUND');
  }

  const isOwner = project.ownerId === userId;
  const collaboratorRole = project.collaborators[0]?.role;

  if (!isOwner && collaboratorRole === 'VIEWER') {
    throw new VersionError('Viewers cannot restore versions', 'ACCESS_DENIED');
  }

  if (createNewVersion) {
    // Create a new version with the restored content
    const restoredVersion = await createVersion(userId, {
      projectId: versionToRestore.projectId,
      content: versionToRestore.content,
      changesSummary: `Restored from version ${versionToRestore.versionNumber}`,
      isAutoSave: false,
      branchId: versionToRestore.branchId ?? undefined,
    });

    logger.info('Version restored', {
      originalVersionId: versionId,
      newVersionId: restoredVersion.id,
      userId,
    });

    return restoredVersion;
  } else {
    // Just return the version to restore (client will use its content)
    return versionToRestore;
  }
}

/**
 * Delete old auto-save versions to manage storage
 * Keeps the last N auto-saves per project/branch
 */
export async function cleanupAutoSaves(
  projectId: string,
  keepCount: number = 10
): Promise<number> {
  // Get auto-save versions to delete
  const autoSaves = await prisma.version.findMany({
    where: {
      projectId,
      isAutoSave: true,
    },
    orderBy: { createdAt: 'desc' },
    skip: keepCount,
    select: { id: true, documentId: true },
  });

  if (autoSaves.length === 0) {
    return 0;
  }

  const versionIds = autoSaves.map(v => v.id);
  const documentIds = autoSaves.map(v => v.documentId);

  // Delete from PostgreSQL
  await prisma.version.deleteMany({
    where: { id: { in: versionIds } },
  });

  // Delete from MongoDB
  await DocumentModel.deleteMany({
    _id: { $in: documentIds },
  });

  logger.info('Auto-save cleanup completed', {
    projectId,
    deletedCount: autoSaves.length,
  });

  return autoSaves.length;
}

/**
 * Get the latest version for a project
 */
export async function getLatestVersion(
  projectId: string,
  userId: string,
  branchId?: string
): Promise<VersionResponse | null> {
  // Verify project access
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      collaborators: {
        where: { userId },
      },
    },
  });

  if (!project) {
    throw new VersionError('Project not found', 'PROJECT_NOT_FOUND');
  }

  const isOwner = project.ownerId === userId;
  const isCollaborator = project.collaborators.length > 0;

  if (!isOwner && !isCollaborator) {
    throw new VersionError('Access denied', 'ACCESS_DENIED');
  }

  const version = await prisma.version.findFirst({
    where: {
      projectId,
      branchId: branchId ?? null,
    },
    orderBy: { versionNumber: 'desc' },
  });

  return version ? toVersionResponse(version) : null;
}

/**
 * Check if content has changed since last version
 */
export async function hasContentChanged(
  projectId: string,
  content: string,
  branchId?: string
): Promise<boolean> {
  const contentHash = calculateContentHash(content);

  const lastVersion = await prisma.version.findFirst({
    where: {
      projectId,
      branchId: branchId ?? null,
    },
    orderBy: { versionNumber: 'desc' },
    select: { contentHash: true },
  });

  if (!lastVersion) {
    return true; // No previous version, content is "new"
  }

  return lastVersion.contentHash !== contentHash;
}
