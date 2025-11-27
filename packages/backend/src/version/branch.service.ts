/**
 * Branch Service
 * Handles branch creation, switching, merging, and comparison
 * 
 * Requirements: 56 - Branching system with merge conflict resolution
 */

import { prisma } from '../database/prisma';
import { DocumentModel } from '../database/schemas';
import { logger } from '../utils/logger';
import { VersionError, computeDiff, calculateContentHash, countWords, createVersion } from './version.service';
import type {
  CreateBranchInput,
  ListBranchesInput,
  MergeBranchInput,
  CompareBranchesInput,
  BranchResponse,
  BranchWithStats,
  BranchTreeNode,
  MergeResult,
  MergeConflict,
  BranchComparisonResult,
} from './types';

// ============================================
// Helper Functions
// ============================================

/**
 * Transform database branch to response format
 */
function toBranchResponse(branch: {
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
}): BranchResponse {
  return {
    id: branch.id,
    projectId: branch.projectId,
    name: branch.name,
    parentBranchId: branch.parentBranchId,
    baseVersionId: branch.baseVersionId,
    isDefault: branch.isDefault,
    createdAt: branch.createdAt,
    createdBy: branch.createdBy,
    mergedAt: branch.mergedAt,
    mergedInto: branch.mergedInto,
  };
}


/**
 * Verify user has access to project
 */
async function verifyProjectAccess(
  projectId: string,
  userId: string,
  requireEdit: boolean = false
): Promise<{ isOwner: boolean; role: string | null }> {
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
  const collaboratorRole = project.collaborators[0]?.role ?? null;

  if (!isOwner && !isCollaborator) {
    throw new VersionError('Access denied', 'ACCESS_DENIED');
  }

  if (requireEdit && !isOwner && collaboratorRole === 'VIEWER') {
    throw new VersionError('Viewers cannot modify branches', 'ACCESS_DENIED');
  }

  return { isOwner, role: collaboratorRole };
}

// ============================================
// Branch CRUD Operations
// ============================================

/**
 * Create a new branch from any version
 * Requirements: 56 - Create branch creation from any version
 */
export async function createBranch(
  userId: string,
  input: CreateBranchInput
): Promise<BranchResponse> {
  const { projectId, name, baseVersionId, parentBranchId } = input;

  // Verify project access
  await verifyProjectAccess(projectId, userId, true);

  // Check if branch name already exists for this project
  const existingBranch = await prisma.branch.findUnique({
    where: {
      projectId_name: {
        projectId,
        name,
      },
    },
  });

  if (existingBranch) {
    throw new VersionError('Branch name already exists', 'BRANCH_EXISTS');
  }

  // Verify base version exists if provided
  if (baseVersionId) {
    const baseVersion = await prisma.version.findUnique({
      where: { id: baseVersionId },
    });

    if (!baseVersion || baseVersion.projectId !== projectId) {
      throw new VersionError('Base version not found', 'VERSION_NOT_FOUND');
    }
  }

  // Verify parent branch exists if provided
  if (parentBranchId) {
    const parentBranch = await prisma.branch.findUnique({
      where: { id: parentBranchId },
    });

    if (!parentBranch || parentBranch.projectId !== projectId) {
      throw new VersionError('Parent branch not found', 'BRANCH_NOT_FOUND');
    }
  }

  // Check if this is the first branch (make it default)
  const branchCount = await prisma.branch.count({
    where: { projectId },
  });

  const isDefault = branchCount === 0;

  // Create the branch
  const branch = await prisma.branch.create({
    data: {
      projectId,
      name,
      parentBranchId: parentBranchId ?? null,
      baseVersionId: baseVersionId ?? null,
      isDefault,
      createdBy: userId,
    },
  });

  logger.info('Branch created', {
    branchId: branch.id,
    projectId,
    name,
    userId,
  });

  return toBranchResponse(branch);
}

/**
 * Get a branch by ID
 */
export async function getBranch(
  branchId: string,
  userId: string
): Promise<BranchResponse> {
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
  });

  if (!branch) {
    throw new VersionError('Branch not found', 'BRANCH_NOT_FOUND');
  }

  // Verify project access
  await verifyProjectAccess(branch.projectId, userId);

  return toBranchResponse(branch);
}

/**
 * Get branch with statistics
 */
export async function getBranchWithStats(
  branchId: string,
  userId: string
): Promise<BranchWithStats> {
  const branch = await getBranch(branchId, userId);

  // Get version statistics
  const [versionCount, latestVersion] = await Promise.all([
    prisma.version.count({
      where: { branchId },
    }),
    prisma.version.findFirst({
      where: { branchId },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true, createdAt: true },
    }),
  ]);

  return {
    ...branch,
    versionCount,
    latestVersionNumber: latestVersion?.versionNumber ?? null,
    latestVersionDate: latestVersion?.createdAt ?? null,
  };
}

/**
 * List all branches for a project
 */
export async function listBranches(
  userId: string,
  input: ListBranchesInput
): Promise<BranchWithStats[]> {
  const { projectId } = input;

  // Verify project access
  await verifyProjectAccess(projectId, userId);

  // Get all branches
  const branches = await prisma.branch.findMany({
    where: { projectId },
    orderBy: [
      { isDefault: 'desc' },
      { createdAt: 'asc' },
    ],
  });

  // Get stats for each branch
  const branchesWithStats = await Promise.all(
    branches.map(async (branch) => {
      const [versionCount, latestVersion] = await Promise.all([
        prisma.version.count({
          where: { branchId: branch.id },
        }),
        prisma.version.findFirst({
          where: { branchId: branch.id },
          orderBy: { versionNumber: 'desc' },
          select: { versionNumber: true, createdAt: true },
        }),
      ]);

      return {
        ...toBranchResponse(branch),
        versionCount,
        latestVersionNumber: latestVersion?.versionNumber ?? null,
        latestVersionDate: latestVersion?.createdAt ?? null,
      };
    })
  );

  return branchesWithStats;
}


/**
 * Build visual branch tree display
 * Requirements: 56 - Build visual branch tree display
 */
export async function getBranchTree(
  projectId: string,
  userId: string
): Promise<BranchTreeNode[]> {
  // Verify project access
  await verifyProjectAccess(projectId, userId);

  // Get all branches
  const branches = await prisma.branch.findMany({
    where: { projectId },
    orderBy: { createdAt: 'asc' },
  });

  // Build tree structure
  const branchMap = new Map<string, BranchTreeNode>();
  const rootNodes: BranchTreeNode[] = [];

  // First pass: create all nodes
  for (const branch of branches) {
    branchMap.set(branch.id, {
      branch: toBranchResponse(branch),
      children: [],
      depth: 0,
    });
  }

  // Second pass: build tree relationships
  for (const branch of branches) {
    const node = branchMap.get(branch.id)!;
    
    if (branch.parentBranchId && branchMap.has(branch.parentBranchId)) {
      const parentNode = branchMap.get(branch.parentBranchId)!;
      parentNode.children.push(node);
      node.depth = parentNode.depth + 1;
    } else {
      rootNodes.push(node);
    }
  }

  // Calculate depths recursively
  function updateDepths(node: BranchTreeNode, depth: number): void {
    node.depth = depth;
    for (const child of node.children) {
      updateDepths(child, depth + 1);
    }
  }

  for (const root of rootNodes) {
    updateDepths(root, 0);
  }

  return rootNodes;
}

/**
 * Get the default branch for a project
 */
export async function getDefaultBranch(
  projectId: string,
  userId: string
): Promise<BranchResponse | null> {
  // Verify project access
  await verifyProjectAccess(projectId, userId);

  const branch = await prisma.branch.findFirst({
    where: {
      projectId,
      isDefault: true,
    },
  });

  return branch ? toBranchResponse(branch) : null;
}

/**
 * Switch to a different branch (set as active)
 * Requirements: 56 - Implement branch switching
 */
export async function switchBranch(
  branchId: string,
  userId: string
): Promise<BranchWithStats> {
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
  });

  if (!branch) {
    throw new VersionError('Branch not found', 'BRANCH_NOT_FOUND');
  }

  // Verify project access
  await verifyProjectAccess(branch.projectId, userId);

  // Check if branch is merged (cannot switch to merged branch)
  if (branch.mergedAt) {
    throw new VersionError('Cannot switch to a merged branch', 'BRANCH_MERGED');
  }

  // Return branch with stats
  return getBranchWithStats(branchId, userId);
}

/**
 * Set a branch as the default branch
 */
export async function setDefaultBranch(
  branchId: string,
  userId: string
): Promise<BranchResponse> {
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
  });

  if (!branch) {
    throw new VersionError('Branch not found', 'BRANCH_NOT_FOUND');
  }

  // Verify project access (requires edit permission)
  await verifyProjectAccess(branch.projectId, userId, true);

  // Update all branches: unset current default, set new default
  await prisma.$transaction([
    prisma.branch.updateMany({
      where: {
        projectId: branch.projectId,
        isDefault: true,
      },
      data: { isDefault: false },
    }),
    prisma.branch.update({
      where: { id: branchId },
      data: { isDefault: true },
    }),
  ]);

  const updatedBranch = await prisma.branch.findUnique({
    where: { id: branchId },
  });

  logger.info('Default branch changed', {
    branchId,
    projectId: branch.projectId,
    userId,
  });

  return toBranchResponse(updatedBranch!);
}

/**
 * Delete a branch
 */
export async function deleteBranch(
  branchId: string,
  userId: string
): Promise<void> {
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
  });

  if (!branch) {
    throw new VersionError('Branch not found', 'BRANCH_NOT_FOUND');
  }

  // Verify project access (requires edit permission)
  await verifyProjectAccess(branch.projectId, userId, true);

  // Cannot delete default branch
  if (branch.isDefault) {
    throw new VersionError('Cannot delete the default branch', 'CANNOT_DELETE_DEFAULT');
  }

  // Check for child branches
  const childBranches = await prisma.branch.count({
    where: { parentBranchId: branchId },
  });

  if (childBranches > 0) {
    throw new VersionError('Cannot delete branch with child branches', 'HAS_CHILD_BRANCHES');
  }

  // Delete the branch (versions will have branchId set to null due to onDelete: SetNull)
  await prisma.branch.delete({
    where: { id: branchId },
  });

  logger.info('Branch deleted', {
    branchId,
    projectId: branch.projectId,
    userId,
  });
}


// ============================================
// Branch Merging
// Requirements: 56 - Add branch merging with conflict resolution
// ============================================

/**
 * Get the latest content from a branch
 */
async function getBranchLatestContent(branchId: string): Promise<{ content: string; versionId: string } | null> {
  const latestVersion = await prisma.version.findFirst({
    where: { branchId },
    orderBy: { versionNumber: 'desc' },
  });

  if (!latestVersion) {
    return null;
  }

  const document = await DocumentModel.findById(latestVersion.documentId);
  if (!document) {
    return null;
  }

  return {
    content: document.content,
    versionId: latestVersion.id,
  };
}

/**
 * Detect merge conflicts between two contents
 */
export function detectMergeConflicts(
  sourceContent: string,
  targetContent: string,
  baseContent?: string
): MergeConflict[] {
  const conflicts: MergeConflict[] = [];
  
  const sourceLines = sourceContent.split('\n');
  const targetLines = targetContent.split('\n');
  const baseLines = baseContent?.split('\n') ?? [];

  // Use diff to find changes
  const sourceDiff = baseContent ? computeDiff(baseContent, sourceContent) : [];
  const targetDiff = baseContent ? computeDiff(baseContent, targetContent) : [];

  // Find conflicting changes (both modified the same line differently)
  const sourceChanges = new Map<number, { type: string; value: string }>();
  const targetChanges = new Map<number, { type: string; value: string }>();

  for (const change of sourceDiff) {
    if (change.type !== 'unchanged' && change.lineNumber) {
      sourceChanges.set(change.lineNumber, { type: change.type, value: change.value });
    }
  }

  for (const change of targetDiff) {
    if (change.type !== 'unchanged' && change.lineNumber) {
      targetChanges.set(change.lineNumber, { type: change.type, value: change.value });
    }
  }

  // Find overlapping changes
  for (const [lineNumber, sourceChange] of sourceChanges) {
    const targetChange = targetChanges.get(lineNumber);
    if (targetChange && sourceChange.value !== targetChange.value) {
      conflicts.push({
        lineNumber,
        sourceContent: sourceChange.value,
        targetContent: targetChange.value,
        type: sourceChange.type === 'add' && targetChange.type === 'add' ? 'add' :
              sourceChange.type === 'remove' && targetChange.type === 'remove' ? 'remove' : 'modify',
      });
    }
  }

  // If no base content, do a simple line-by-line comparison
  if (!baseContent) {
    const maxLines = Math.max(sourceLines.length, targetLines.length);
    for (let i = 0; i < maxLines; i++) {
      const sourceLine = sourceLines[i] ?? '';
      const targetLine = targetLines[i] ?? '';
      
      if (sourceLine !== targetLine) {
        conflicts.push({
          lineNumber: i + 1,
          sourceContent: sourceLine,
          targetContent: targetLine,
          type: !sourceLines[i] ? 'add' : !targetLines[i] ? 'remove' : 'modify',
        });
      }
    }
  }

  return conflicts;
}

/**
 * Merge content with conflict resolution
 */
function mergeContent(
  sourceContent: string,
  targetContent: string,
  conflicts: MergeConflict[],
  resolution: 'source' | 'target' | 'manual',
  manualResolutions?: Array<{ lineNumber: number; resolution: 'source' | 'target' }>
): string {
  if (resolution === 'source') {
    return sourceContent;
  }
  
  if (resolution === 'target') {
    return targetContent;
  }

  // Manual resolution
  const sourceLines = sourceContent.split('\n');
  const targetLines = targetContent.split('\n');
  const resolutionMap = new Map(manualResolutions?.map(r => [r.lineNumber, r.resolution]) ?? []);

  const mergedLines: string[] = [];
  const maxLines = Math.max(sourceLines.length, targetLines.length);

  for (let i = 0; i < maxLines; i++) {
    const lineNumber = i + 1;
    const conflict = conflicts.find(c => c.lineNumber === lineNumber);
    
    if (conflict) {
      const lineResolution = resolutionMap.get(lineNumber) ?? 'target';
      mergedLines.push(lineResolution === 'source' ? sourceLines[i] ?? '' : targetLines[i] ?? '');
    } else {
      // No conflict, use target line (or source if target doesn't have it)
      mergedLines.push(targetLines[i] ?? sourceLines[i] ?? '');
    }
  }

  return mergedLines.join('\n');
}

/**
 * Merge two branches
 * Requirements: 56 - Add branch merging with conflict resolution
 */
export async function mergeBranches(
  userId: string,
  input: MergeBranchInput
): Promise<MergeResult> {
  const { sourceBranchId, targetBranchId, conflictResolution, manualResolutions } = input;

  // Get both branches
  const [sourceBranch, targetBranch] = await Promise.all([
    prisma.branch.findUnique({ where: { id: sourceBranchId } }),
    prisma.branch.findUnique({ where: { id: targetBranchId } }),
  ]);

  if (!sourceBranch) {
    throw new VersionError('Source branch not found', 'BRANCH_NOT_FOUND');
  }

  if (!targetBranch) {
    throw new VersionError('Target branch not found', 'BRANCH_NOT_FOUND');
  }

  // Verify both branches belong to the same project
  if (sourceBranch.projectId !== targetBranch.projectId) {
    throw new VersionError('Cannot merge branches from different projects', 'INVALID_MERGE');
  }

  // Verify project access (requires edit permission)
  await verifyProjectAccess(sourceBranch.projectId, userId, true);

  // Check if source branch is already merged
  if (sourceBranch.mergedAt) {
    throw new VersionError('Source branch is already merged', 'BRANCH_ALREADY_MERGED');
  }

  // Get latest content from both branches
  const [sourceData, targetData] = await Promise.all([
    getBranchLatestContent(sourceBranchId),
    getBranchLatestContent(targetBranchId),
  ]);

  if (!sourceData) {
    throw new VersionError('Source branch has no content', 'NO_CONTENT');
  }

  if (!targetData) {
    throw new VersionError('Target branch has no content', 'NO_CONTENT');
  }

  // Get base content if there's a common ancestor
  let baseContent: string | undefined;
  if (sourceBranch.baseVersionId) {
    const baseVersion = await prisma.version.findUnique({
      where: { id: sourceBranch.baseVersionId },
    });
    if (baseVersion) {
      const baseDoc = await DocumentModel.findById(baseVersion.documentId);
      baseContent = baseDoc?.content;
    }
  }

  // Detect conflicts
  const conflicts = detectMergeConflicts(sourceData.content, targetData.content, baseContent);

  // If there are conflicts and resolution is manual but no resolutions provided
  if (conflicts.length > 0 && conflictResolution === 'manual' && !manualResolutions) {
    return {
      success: false,
      mergedVersionId: null,
      conflicts,
      hasConflicts: true,
      sourceBranch: toBranchResponse(sourceBranch),
      targetBranch: toBranchResponse(targetBranch),
    };
  }

  // Merge content
  const mergedContent = mergeContent(
    sourceData.content,
    targetData.content,
    conflicts,
    conflictResolution,
    manualResolutions
  );

  // Create a new version on the target branch with merged content
  const mergedVersion = await createVersion(userId, {
    projectId: targetBranch.projectId,
    content: mergedContent,
    changesSummary: `Merged branch '${sourceBranch.name}' into '${targetBranch.name}'`,
    isAutoSave: false,
    branchId: targetBranchId,
  });

  // Mark source branch as merged
  await prisma.branch.update({
    where: { id: sourceBranchId },
    data: {
      mergedAt: new Date(),
      mergedInto: targetBranchId,
    },
  });

  logger.info('Branches merged', {
    sourceBranchId,
    targetBranchId,
    mergedVersionId: mergedVersion.id,
    conflictsResolved: conflicts.length,
    userId,
  });

  return {
    success: true,
    mergedVersionId: mergedVersion.id,
    conflicts,
    hasConflicts: conflicts.length > 0,
    sourceBranch: toBranchResponse(sourceBranch),
    targetBranch: toBranchResponse(targetBranch),
    mergedContent,
  };
}


// ============================================
// Branch Comparison
// Requirements: 56 - Create branch comparison tools
// ============================================

/**
 * Compare two branches
 * Requirements: 56 - Create branch comparison tools
 */
export async function compareBranches(
  userId: string,
  input: CompareBranchesInput
): Promise<BranchComparisonResult> {
  const { branchId1, branchId2 } = input;

  // Get both branches with stats
  const [branch1, branch2] = await Promise.all([
    getBranchWithStats(branchId1, userId),
    getBranchWithStats(branchId2, userId),
  ]);

  // Verify both branches belong to the same project
  if (branch1.projectId !== branch2.projectId) {
    throw new VersionError('Cannot compare branches from different projects', 'INVALID_COMPARISON');
  }

  // Find common ancestor
  let commonAncestorVersionId: string | null = null;
  let divergencePoint: Date | null = null;

  // Check if one branch is derived from the other
  if (branch1.baseVersionId) {
    const baseVersion = await prisma.version.findUnique({
      where: { id: branch1.baseVersionId },
    });
    if (baseVersion?.branchId === branchId2) {
      commonAncestorVersionId = branch1.baseVersionId;
      divergencePoint = baseVersion.createdAt;
    }
  }

  if (!commonAncestorVersionId && branch2.baseVersionId) {
    const baseVersion = await prisma.version.findUnique({
      where: { id: branch2.baseVersionId },
    });
    if (baseVersion?.branchId === branchId1) {
      commonAncestorVersionId = branch2.baseVersionId;
      divergencePoint = baseVersion.createdAt;
    }
  }

  // Count versions ahead
  let branch1AheadBy = 0;
  let branch2AheadBy = 0;

  if (commonAncestorVersionId) {
    const ancestorVersion = await prisma.version.findUnique({
      where: { id: commonAncestorVersionId },
    });

    if (ancestorVersion) {
      branch1AheadBy = await prisma.version.count({
        where: {
          branchId: branchId1,
          versionNumber: { gt: ancestorVersion.versionNumber },
        },
      });

      branch2AheadBy = await prisma.version.count({
        where: {
          branchId: branchId2,
          versionNumber: { gt: ancestorVersion.versionNumber },
        },
      });
    }
  } else {
    // No common ancestor, count all versions
    branch1AheadBy = branch1.versionCount;
    branch2AheadBy = branch2.versionCount;
  }

  // Estimate potential conflicts
  let potentialConflicts = 0;
  const [content1, content2] = await Promise.all([
    getBranchLatestContent(branchId1),
    getBranchLatestContent(branchId2),
  ]);

  if (content1 && content2) {
    const conflicts = detectMergeConflicts(content1.content, content2.content);
    potentialConflicts = conflicts.length;
  }

  // Determine if branches can be merged
  const canMerge = !branch1.mergedAt && !branch2.mergedAt;

  return {
    branch1,
    branch2,
    commonAncestorVersionId,
    divergencePoint,
    branch1AheadBy,
    branch2AheadBy,
    canMerge,
    potentialConflicts,
  };
}

/**
 * Rename a branch
 */
export async function renameBranch(
  branchId: string,
  newName: string,
  userId: string
): Promise<BranchResponse> {
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
  });

  if (!branch) {
    throw new VersionError('Branch not found', 'BRANCH_NOT_FOUND');
  }

  // Verify project access (requires edit permission)
  await verifyProjectAccess(branch.projectId, userId, true);

  // Check if new name already exists
  const existingBranch = await prisma.branch.findUnique({
    where: {
      projectId_name: {
        projectId: branch.projectId,
        name: newName,
      },
    },
  });

  if (existingBranch && existingBranch.id !== branchId) {
    throw new VersionError('Branch name already exists', 'BRANCH_EXISTS');
  }

  // Update branch name
  const updatedBranch = await prisma.branch.update({
    where: { id: branchId },
    data: { name: newName },
  });

  logger.info('Branch renamed', {
    branchId,
    oldName: branch.name,
    newName,
    userId,
  });

  return toBranchResponse(updatedBranch);
}
