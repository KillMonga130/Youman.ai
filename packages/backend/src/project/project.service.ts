/**
 * Project Service
 * Handles project CRUD operations and metadata management
 * 
 * Requirements: 14 - User account and project management
 * Requirements: 15 - Web-based interface for document processing
 */

import { prisma } from '../database/prisma';
import { logger } from '../utils/logger';
import type {
  CreateProjectInput,
  UpdateProjectInput,
  ListProjectsInput,
  ProjectResponse,
  ProjectListResponse,
  ProjectMetadata,
  ProjectSettings,
} from './types';

// ============================================
// Error Classes
// ============================================

/**
 * Custom error class for project-related errors
 */
export class ProjectError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'ProjectError';
    this.code = code;
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Transform database project to response format
 */
function toProjectResponse(project: {
  id: string;
  name: string;
  description: string | null;
  status: 'ACTIVE' | 'ARCHIVED' | 'DELETED';
  wordCount: number;
  documentId: string | null;
  settings: unknown;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}): ProjectResponse {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
    wordCount: project.wordCount,
    documentId: project.documentId,
    settings: project.settings as ProjectSettings | null,
    ownerId: project.ownerId,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

// ============================================
// Project CRUD Operations
// ============================================

/**
 * Create a new project
 * Requirements: 14.3 - Store project with unique identifier
 */
export async function createProject(
  userId: string,
  input: CreateProjectInput
): Promise<ProjectResponse> {
  const { name, description, settings } = input;

  const createData: Parameters<typeof prisma.project.create>[0]['data'] = {
    name,
    description: description ?? null,
    ownerId: userId,
    status: 'ACTIVE',
    wordCount: 0,
  };

  // Only include settings if provided (Prisma JSON field handling)
  if (settings) {
    createData.settings = settings;
  }

  const project = await prisma.project.create({
    data: createData,
  });

  logger.info('Project created', { projectId: project.id, userId });

  return toProjectResponse(project);
}

/**
 * Get a project by ID
 * Validates that the user has access to the project
 */
export async function getProject(
  projectId: string,
  userId: string
): Promise<ProjectResponse> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      collaborators: {
        where: { userId },
      },
    },
  });

  if (!project) {
    throw new ProjectError('Project not found', 'PROJECT_NOT_FOUND');
  }

  // Check if user is owner or collaborator
  const isOwner = project.ownerId === userId;
  const isCollaborator = project.collaborators.length > 0;

  if (!isOwner && !isCollaborator) {
    throw new ProjectError('Access denied', 'ACCESS_DENIED');
  }

  // Don't return deleted projects
  if (project.deletedAt) {
    throw new ProjectError('Project not found', 'PROJECT_NOT_FOUND');
  }

  return toProjectResponse(project);
}

/**
 * List projects for a user with filtering and pagination
 * Requirements: 14.4 - Display all projects with metadata
 */
export async function listProjects(
  userId: string,
  input: ListProjectsInput
): Promise<ProjectListResponse> {
  const { page, limit, status, search, sortBy, sortOrder } = input;
  const skip = (page - 1) * limit;

  // Build where clause
  const whereClause: {
    deletedAt: null;
    OR: Array<{ ownerId: string } | { collaborators: { some: { userId: string } } }>;
    status?: 'ACTIVE' | 'ARCHIVED';
    name?: { contains: string; mode: 'insensitive' };
  } = {
    deletedAt: null,
    OR: [
      { ownerId: userId },
      { collaborators: { some: { userId } } },
    ],
  };

  // Filter by status
  if (status !== 'ALL') {
    whereClause.status = status;
  }

  // Search by name
  if (search) {
    whereClause.name = {
      contains: search,
      mode: 'insensitive',
    };
  }

  // Build order by clause
  const orderBy: Record<string, 'asc' | 'desc'> = {};
  orderBy[sortBy] = sortOrder;

  // Execute queries in parallel
  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where: whereClause,
      orderBy,
      skip,
      take: limit,
    }),
    prisma.project.count({ where: whereClause }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    projects: projects.map(toProjectResponse),
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
 * Update a project
 * Only the owner can update the project
 */
export async function updateProject(
  projectId: string,
  userId: string,
  input: UpdateProjectInput
): Promise<ProjectResponse> {
  // First check if project exists and user is owner
  const existingProject = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!existingProject) {
    throw new ProjectError('Project not found', 'PROJECT_NOT_FOUND');
  }

  if (existingProject.ownerId !== userId) {
    throw new ProjectError('Only the project owner can update the project', 'ACCESS_DENIED');
  }

  if (existingProject.deletedAt) {
    throw new ProjectError('Project not found', 'PROJECT_NOT_FOUND');
  }

  // Build update data
  const updateData: Parameters<typeof prisma.project.update>[0]['data'] = {};

  if (input.name !== undefined) {
    updateData.name = input.name;
  }

  if (input.description !== undefined) {
    updateData.description = input.description;
  }

  if (input.status !== undefined) {
    updateData.status = input.status;
  }

  if (input.settings !== undefined) {
    // Merge with existing settings
    updateData.settings = {
      ...(existingProject.settings as object ?? {}),
      ...input.settings,
    };
  }

  const project = await prisma.project.update({
    where: { id: projectId },
    data: updateData,
  });

  logger.info('Project updated', { projectId, userId });

  return toProjectResponse(project);
}

/**
 * Delete a project (soft delete)
 * Requirements: 14.5 - Remove all associated data and confirm deletion
 */
export async function deleteProject(
  projectId: string,
  userId: string
): Promise<{ message: string; projectId: string }> {
  // First check if project exists and user is owner
  const existingProject = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!existingProject) {
    throw new ProjectError('Project not found', 'PROJECT_NOT_FOUND');
  }

  if (existingProject.ownerId !== userId) {
    throw new ProjectError('Only the project owner can delete the project', 'ACCESS_DENIED');
  }

  if (existingProject.deletedAt) {
    throw new ProjectError('Project already deleted', 'PROJECT_ALREADY_DELETED');
  }

  // Soft delete the project
  await prisma.project.update({
    where: { id: projectId },
    data: {
      deletedAt: new Date(),
      status: 'DELETED',
    },
  });

  logger.info('Project deleted', { projectId, userId });

  return {
    message: 'Project deleted successfully',
    projectId,
  };
}

/**
 * Get project metadata for dashboard display
 * Requirements: 14.4 - Display projects with metadata including creation date, word count, and processing status
 */
export async function getProjectMetadata(
  projectId: string,
  userId: string
): Promise<ProjectMetadata> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      collaborators: true,
      transformations: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      _count: {
        select: {
          transformations: true,
          collaborators: true,
        },
      },
    },
  });

  if (!project) {
    throw new ProjectError('Project not found', 'PROJECT_NOT_FOUND');
  }

  // Check if user is owner or collaborator
  const isOwner = project.ownerId === userId;
  const isCollaborator = project.collaborators.some(c => c.userId === userId);

  if (!isOwner && !isCollaborator) {
    throw new ProjectError('Access denied', 'ACCESS_DENIED');
  }

  if (project.deletedAt) {
    throw new ProjectError('Project not found', 'PROJECT_NOT_FOUND');
  }

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
    wordCount: project.wordCount,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    lastTransformationAt: project.transformations[0]?.createdAt ?? null,
    transformationCount: project._count.transformations,
    collaboratorCount: project._count.collaborators,
  };
}

/**
 * Check if user has access to a project
 */
export async function checkProjectAccess(
  projectId: string,
  userId: string
): Promise<{ hasAccess: boolean; isOwner: boolean; role: string | null }> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      collaborators: {
        where: { userId },
      },
    },
  });

  if (!project || project.deletedAt) {
    return { hasAccess: false, isOwner: false, role: null };
  }

  const isOwner = project.ownerId === userId;
  const collaborator = project.collaborators[0];

  return {
    hasAccess: isOwner || !!collaborator,
    isOwner,
    role: isOwner ? 'OWNER' : collaborator?.role ?? null,
  };
}
