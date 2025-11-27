/**
 * Template System Types
 * Type definitions for transformation templates and presets
 * Requirements: 25
 */

import { TransformStrategy, HumanizationLevel, CustomSettings } from '../transform/types';

/**
 * Template category for organization
 */
export type TemplateCategory = 
  | 'blog-posts'
  | 'academic-papers'
  | 'creative-writing'
  | 'business-content'
  | 'technical-docs'
  | 'social-media'
  | 'marketing'
  | 'custom';

/**
 * Template visibility settings
 */
export type TemplateVisibility = 'private' | 'shared' | 'public';

/**
 * Transform settings stored in a template
 * Requirement 25.2: Template's humanization level, strategy, and advanced settings
 */
export interface TemplateSettings {
  /** Humanization level (1-5) */
  level: HumanizationLevel;
  /** Transformation strategy */
  strategy: TransformStrategy;
  /** Protected segment delimiters */
  protectedDelimiters?: Array<{ open: string; close: string }>;
  /** Language preference */
  language?: string;
  /** Custom transformation settings */
  customSettings?: CustomSettings;
}

/**
 * Template metadata
 */
export interface TemplateMetadata {
  /** Template author */
  author?: string;
  /** Template version */
  version: string;
  /** Tags for searchability */
  tags: string[];
  /** Usage count */
  usageCount: number;
  /** Average rating (1-5) */
  rating?: number;
  /** Number of ratings */
  ratingCount: number;
}

/**
 * Template definition
 * Requirement 25: Templates and presets for humanization configurations
 */
export interface Template {
  /** Unique template identifier */
  id: string;
  /** Template name */
  name: string;
  /** Template description */
  description: string;
  /** Template category */
  category: TemplateCategory;
  /** Template visibility */
  visibility: TemplateVisibility;
  /** User ID who created the template */
  userId: string;
  /** Transform settings */
  settings: TemplateSettings;
  /** Template metadata */
  metadata: TemplateMetadata;
  /** Whether this is a system template */
  isSystem: boolean;
  /** Creation timestamp */
  createdAt: Date;
  /** Last updated timestamp */
  updatedAt: Date;
}

/**
 * Options for creating a template
 * Requirement 25.3: Custom template creation
 */
export interface CreateTemplateOptions {
  /** Template name */
  name: string;
  /** Template description */
  description: string;
  /** Template category */
  category: TemplateCategory;
  /** User ID */
  userId: string;
  /** Transform settings */
  settings: TemplateSettings;
  /** Template visibility */
  visibility?: TemplateVisibility;
  /** Tags for searchability */
  tags?: string[];
}

/**
 * Options for updating a template
 */
export interface UpdateTemplateOptions {
  /** Template name */
  name?: string;
  /** Template description */
  description?: string;
  /** Template category */
  category?: TemplateCategory;
  /** Transform settings */
  settings?: Partial<TemplateSettings>;
  /** Template visibility */
  visibility?: TemplateVisibility;
  /** Tags */
  tags?: string[];
}

/**
 * Template export format
 * Requirement 25.4: Export and import template configurations
 */
export interface TemplateExport {
  /** Export format version */
  formatVersion: string;
  /** Export timestamp */
  exportedAt: string;
  /** Template data */
  template: {
    name: string;
    description: string;
    category: TemplateCategory;
    settings: TemplateSettings;
    tags: string[];
    version: string;
  };
  /** Checksum for validation */
  checksum: string;
}

/**
 * Template application options
 * Requirement 25.5: Override individual settings while keeping other template parameters
 */
export interface ApplyTemplateOptions {
  /** Template ID to apply */
  templateId: string;
  /** Project ID to apply to */
  projectId: string;
  /** Settings overrides */
  overrides?: Partial<TemplateSettings>;
}

/**
 * Result of applying a template
 */
export interface ApplyTemplateResult {
  /** Applied template ID */
  templateId: string;
  /** Project ID */
  projectId: string;
  /** Final settings (template + overrides) */
  appliedSettings: TemplateSettings;
  /** Which settings were overridden */
  overriddenFields: string[];
  /** Timestamp */
  appliedAt: Date;
}

/**
 * Template search/filter options
 */
export interface TemplateFilterOptions {
  /** Filter by category */
  category?: TemplateCategory;
  /** Filter by visibility */
  visibility?: TemplateVisibility;
  /** Filter by user ID */
  userId?: string;
  /** Include system templates */
  includeSystem?: boolean;
  /** Search query (name/description) */
  searchQuery?: string;
  /** Filter by tags */
  tags?: string[];
  /** Sort by field */
  sortBy?: 'name' | 'createdAt' | 'usageCount' | 'rating';
  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
  /** Pagination limit */
  limit?: number;
  /** Pagination offset */
  offset?: number;
}

/**
 * Template share options
 */
export interface ShareTemplateOptions {
  /** Template ID */
  templateId: string;
  /** User ID to share with */
  targetUserId: string;
  /** Permission level */
  permission: 'view' | 'use' | 'edit';
}

/**
 * Template share record
 */
export interface TemplateShare {
  /** Share ID */
  id: string;
  /** Template ID */
  templateId: string;
  /** Owner user ID */
  ownerUserId: string;
  /** Target user ID */
  targetUserId: string;
  /** Permission level */
  permission: 'view' | 'use' | 'edit';
  /** Share timestamp */
  sharedAt: Date;
}

/**
 * Pre-configured system templates
 * Requirement 25.1: Pre-configured templates for common use cases
 */
export interface SystemTemplateDefinition {
  /** Template name */
  name: string;
  /** Template description */
  description: string;
  /** Template category */
  category: TemplateCategory;
  /** Transform settings */
  settings: TemplateSettings;
  /** Tags */
  tags: string[];
}

/**
 * Service configuration
 */
export interface TemplateServiceConfig {
  /** Maximum templates per user */
  maxTemplatesPerUser: number;
  /** Maximum tags per template */
  maxTagsPerTemplate: number;
  /** Export format version */
  exportFormatVersion: string;
  /** Enable system templates */
  enableSystemTemplates: boolean;
}
