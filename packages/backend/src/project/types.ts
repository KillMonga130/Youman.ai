/**
 * Project types and validation schemas
 * Requirements: 14 - User account and project management
 * Requirements: 15 - Web-based interface for document processing
 */

import { z } from 'zod';

// ============================================
// Validation Schemas
// ============================================

/**
 * Schema for creating a new project
 */
export const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, 'Project name is required')
    .max(255, 'Project name must be less than 255 characters'),
  description: z
    .string()
    .max(2000, 'Description must be less than 2000 characters')
    .optional(),
  settings: z
    .object({
      defaultLevel: z.number().min(1).max(5).optional(),
      defaultStrategy: z.enum(['auto', 'casual', 'professional', 'academic']).optional(),
      defaultLanguage: z.string().optional(),
    })
    .optional(),
});

/**
 * Schema for updating a project
 */
export const updateProjectSchema = z.object({
  name: z
    .string()
    .min(1, 'Project name is required')
    .max(255, 'Project name must be less than 255 characters')
    .optional(),
  description: z
    .string()
    .max(2000, 'Description must be less than 2000 characters')
    .nullable()
    .optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
  settings: z
    .object({
      defaultLevel: z.number().min(1).max(5).optional(),
      defaultStrategy: z.enum(['auto', 'casual', 'professional', 'academic']).optional(),
      defaultLanguage: z.string().optional(),
    })
    .optional(),
});

/**
 * Schema for listing projects with filters
 */
export const listProjectsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(['ACTIVE', 'ARCHIVED', 'ALL']).default('ACTIVE'),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt', 'wordCount']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Schema for project ID parameter
 */
export const projectIdSchema = z.object({
  id: z.string().uuid('Invalid project ID'),
});

// ============================================
// Types derived from schemas
// ============================================

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ListProjectsInput = z.infer<typeof listProjectsSchema>;

// ============================================
// Response Types
// ============================================

/**
 * Project settings type
 */
export interface ProjectSettings {
  defaultLevel?: number;
  defaultStrategy?: 'auto' | 'casual' | 'professional' | 'academic';
  defaultLanguage?: string;
}

/**
 * Project response type
 */
export interface ProjectResponse {
  id: string;
  name: string;
  description: string | null;
  status: 'ACTIVE' | 'ARCHIVED' | 'DELETED';
  wordCount: number;
  documentId: string | null;
  settings: ProjectSettings | null;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Project list response with pagination
 */
export interface ProjectListResponse {
  projects: ProjectResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/**
 * Project metadata for dashboard display
 * Requirements: 14.4 - Display projects with metadata
 */
export interface ProjectMetadata {
  id: string;
  name: string;
  description: string | null;
  status: 'ACTIVE' | 'ARCHIVED' | 'DELETED';
  wordCount: number;
  createdAt: Date;
  updatedAt: Date;
  lastTransformationAt: Date | null;
  transformationCount: number;
  collaboratorCount: number;
}
