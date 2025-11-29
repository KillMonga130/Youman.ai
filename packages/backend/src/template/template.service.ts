/**
 * Template Service
 * Manages transformation templates and presets
 * Requirements: 25
 */

import crypto from 'crypto';
import { prisma } from '../database/prisma';
import { logger } from '../utils/logger';
import {
  Template,
  TemplateSettings,
  TemplateCategory,
  TemplateExport,
  CreateTemplateOptions,
  UpdateTemplateOptions,
  ApplyTemplateOptions,
  ApplyTemplateResult,
  TemplateFilterOptions,
  ShareTemplateOptions,
  TemplateShare,
  SystemTemplateDefinition,
  TemplateServiceConfig,
  TemplateMetadata,
} from './types';

/** Default configuration */
const DEFAULT_CONFIG: TemplateServiceConfig = {
  maxTemplatesPerUser: 100,
  maxTagsPerTemplate: 10,
  exportFormatVersion: '1.0.0',
  enableSystemTemplates: true,
};

/**
 * Pre-configured system templates
 * Requirement 25.1: Pre-configured templates for common use cases
 */
const SYSTEM_TEMPLATES: SystemTemplateDefinition[] = [
  {
    name: 'Blog Post - Casual',
    description: 'Optimized for casual blog posts with conversational tone and natural flow',
    category: 'blog-posts',
    settings: {
      level: 3,
      strategy: 'casual',
      customSettings: {
        preserveFormatting: true,
        tonePreferences: {
          formality: 30,
          enthusiasm: 70,
        },
      },
    },
    tags: ['blog', 'casual', 'conversational'],
  },
  {
    name: 'Blog Post - Professional',
    description: 'Professional blog content with balanced formality and engagement',
    category: 'blog-posts',
    settings: {
      level: 3,
      strategy: 'professional',
      customSettings: {
        preserveFormatting: true,
        tonePreferences: {
          formality: 60,
          enthusiasm: 50,
        },
      },
    },
    tags: ['blog', 'professional', 'business'],
  },
  {
    name: 'Academic Paper',
    description: 'Scholarly writing with academic tone, citations preserved, and formal language',
    category: 'academic-papers',
    settings: {
      level: 2,
      strategy: 'academic',
      protectedDelimiters: [
        { open: '(', close: ')' },
        { open: '[', close: ']' },
      ],
      customSettings: {
        preserveFormatting: true,
        tonePreferences: {
          formality: 90,
          enthusiasm: 20,
        },
      },
    },
    tags: ['academic', 'research', 'scholarly', 'citations'],
  },
  {
    name: 'Research Abstract',
    description: 'Concise academic abstracts with precise language and minimal transformation',
    category: 'academic-papers',
    settings: {
      level: 1,
      strategy: 'academic',
      customSettings: {
        preserveFormatting: true,
        tonePreferences: {
          formality: 95,
          enthusiasm: 10,
        },
      },
    },
    tags: ['academic', 'abstract', 'research'],
  },
  {
    name: 'Creative Fiction',
    description: 'Creative writing with varied sentence structures and expressive language',
    category: 'creative-writing',
    settings: {
      level: 4,
      strategy: 'casual',
      customSettings: {
        preserveFormatting: true,
        tonePreferences: {
          formality: 40,
          enthusiasm: 60,
        },
      },
    },
    tags: ['fiction', 'creative', 'storytelling'],
  },
  {
    name: 'Poetry & Prose',
    description: 'Artistic writing with emphasis on rhythm and natural expression',
    category: 'creative-writing',
    settings: {
      level: 5,
      strategy: 'casual',
      customSettings: {
        preserveFormatting: true,
        tonePreferences: {
          formality: 30,
          enthusiasm: 80,
        },
      },
    },
    tags: ['poetry', 'prose', 'artistic'],
  },
  {
    name: 'Business Report',
    description: 'Professional business documents with clear, formal language',
    category: 'business-content',
    settings: {
      level: 2,
      strategy: 'professional',
      customSettings: {
        preserveFormatting: true,
        tonePreferences: {
          formality: 80,
          enthusiasm: 30,
        },
      },
    },
    tags: ['business', 'report', 'formal'],
  },
  {
    name: 'Marketing Copy',
    description: 'Engaging marketing content with persuasive and energetic tone',
    category: 'marketing',
    settings: {
      level: 4,
      strategy: 'casual',
      customSettings: {
        preserveFormatting: true,
        tonePreferences: {
          formality: 40,
          enthusiasm: 90,
        },
      },
    },
    tags: ['marketing', 'advertising', 'persuasive'],
  },
  {
    name: 'Technical Documentation',
    description: 'Clear technical writing with preserved code blocks and terminology',
    category: 'technical-docs',
    settings: {
      level: 2,
      strategy: 'professional',
      protectedDelimiters: [
        { open: '```', close: '```' },
        { open: '`', close: '`' },
      ],
      customSettings: {
        preserveFormatting: true,
        tonePreferences: {
          formality: 70,
          enthusiasm: 30,
        },
      },
    },
    tags: ['technical', 'documentation', 'code'],
  },
  {
    name: 'Social Media Post',
    description: 'Short-form social content with casual, engaging tone',
    category: 'social-media',
    settings: {
      level: 4,
      strategy: 'casual',
      customSettings: {
        preserveFormatting: false,
        tonePreferences: {
          formality: 20,
          enthusiasm: 85,
        },
      },
    },
    tags: ['social', 'short-form', 'engaging'],
  },
];

/**
 * Template Service class
 * Handles template creation, management, and application
 */
export class TemplateService {
  private config: TemplateServiceConfig;
  private shares: Map<string, TemplateShare>;
  private systemTemplatesInitialized: boolean;

  constructor(serviceConfig?: Partial<TemplateServiceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...serviceConfig };
    this.shares = new Map();
    this.systemTemplatesInitialized = false;

    // Initialize system templates asynchronously
    if (this.config.enableSystemTemplates) {
      this.initializeSystemTemplates().catch(err => {
        logger.error('Failed to initialize system templates:', err);
      });
    }
  }

  /**
   * Initializes pre-configured system templates
   * Requirement 25.1: Pre-configured templates for common use cases
   */
  private async initializeSystemTemplates(): Promise<void> {
    if (this.systemTemplatesInitialized) return;

    try {
      for (const def of SYSTEM_TEMPLATES) {
        // Check if template already exists
        const existing = await prisma.template.findFirst({
          where: {
            name: def.name,
            createdBy: 'system',
          },
        });

        if (existing) {
          continue; // Skip if already exists
        }

        // Create system template
        const metadata: TemplateMetadata = {
          author: 'AI Humanizer',
          version: '1.0.0',
          tags: def.tags,
          usageCount: 0,
          ratingCount: 0,
        };

        const settingsWithMetadata = {
          ...def.settings,
          _metadata: metadata,
        };

        await prisma.template.create({
          data: {
            name: def.name,
            description: def.description,
            category: def.category,
            isPublic: true,
            createdBy: 'system',
            settings: settingsWithMetadata as any,
            usageCount: 0,
          },
        });
      }

      this.systemTemplatesInitialized = true;
      logger.info(`Initialized ${SYSTEM_TEMPLATES.length} system templates`);
    } catch (error) {
      logger.error('Error initializing system templates:', error);
      throw error;
    }
  }

  /**
   * Converts database model to Template interface
   */
  private dbToTemplate(dbTemplate: {
    id: string;
    name: string;
    description: string | null;
    category: string;
    isPublic: boolean;
    createdBy: string | null;
    settings: any;
    usageCount: number;
    createdAt: Date;
    updatedAt: Date;
  }): Template {
    const settings = dbTemplate.settings as any;
    const metadata: TemplateMetadata = settings._metadata || {
      version: '1.0.0',
      tags: [],
      usageCount: dbTemplate.usageCount,
      ratingCount: 0,
    };

    // Extract settings without metadata
    const { _metadata, ...templateSettings } = settings;
    const cleanSettings: TemplateSettings = templateSettings;

    return {
      id: dbTemplate.id,
      name: dbTemplate.name,
      description: dbTemplate.description || '',
      category: dbTemplate.category as TemplateCategory,
      visibility: dbTemplate.isPublic ? 'public' : (dbTemplate.createdBy === 'system' ? 'public' : 'private'),
      userId: dbTemplate.createdBy || '',
      settings: cleanSettings,
      metadata: {
        ...metadata,
        usageCount: dbTemplate.usageCount, // Use actual usageCount from DB
      },
      isSystem: dbTemplate.createdBy === 'system',
      createdAt: dbTemplate.createdAt,
      updatedAt: dbTemplate.updatedAt,
    };
  }

  /**
   * Converts Template interface to database model data
   */
  private templateToDbData(template: {
    name: string;
    description: string;
    category: TemplateCategory;
    visibility: TemplateVisibility;
    userId: string;
    settings: TemplateSettings;
    metadata: TemplateMetadata;
    isSystem?: boolean;
  }): {
    name: string;
    description: string;
    category: string;
    isPublic: boolean;
    createdBy: string;
    settings: any;
    usageCount: number;
  } {
    const settingsWithMetadata = {
      ...template.settings,
      _metadata: template.metadata,
    };

    return {
      name: template.name,
      description: template.description,
      category: template.category,
      isPublic: template.visibility === 'public',
      createdBy: template.isSystem ? 'system' : template.userId,
      settings: settingsWithMetadata as any,
      usageCount: template.metadata.usageCount,
    };
  }

  /**
   * Gets templates with optional filtering
   * Requirement 25.1: Provide pre-configured templates for common use cases
   * @param options - Filter options
   * @returns Array of templates
   */
  async getTemplates(options?: TemplateFilterOptions): Promise<Template[]> {
    const where: any = {};

    // Apply filters
    if (options) {
      if (options.category) {
        where.category = options.category;
      }

      if (options.visibility) {
        where.isPublic = options.visibility === 'public';
      }

      if (options.includeSystem === false) {
        where.createdBy = { not: 'system' };
      }

      // Handle userId filter
      if (options.userId) {
        // Include user's templates, public templates, and system templates
        where.OR = [
          { createdBy: options.userId },
          { isPublic: true },
          { createdBy: 'system' },
        ];
      }

      // Handle search query (combines with userId filter if both exist)
      if (options.searchQuery) {
        const searchConditions = [
          { name: { contains: options.searchQuery, mode: 'insensitive' } },
          { description: { contains: options.searchQuery, mode: 'insensitive' } },
        ];

        if (where.OR) {
          // If userId filter exists, combine with AND
          where.AND = [
            { OR: where.OR },
            { OR: searchConditions },
          ];
          delete where.OR;
        } else {
          where.OR = searchConditions;
        }
      }
    }

    let dbTemplates = await prisma.template.findMany({
      where,
      orderBy: this.getOrderBy(options),
      skip: options?.offset,
      take: options?.limit,
    });

    // Convert to Template interface
    let templates = dbTemplates.map(t => this.dbToTemplate(t));

    // Apply additional filters that require Template interface
    if (options) {
      // Filter by tags (stored in metadata)
      if (options.tags && options.tags.length > 0) {
        templates = templates.filter(t =>
          options.tags!.some(tag => t.metadata.tags.includes(tag))
        );
      }

      // Filter by shared access
      if (options.userId) {
        templates = templates.filter(t =>
          t.userId === options.userId ||
          t.visibility === 'public' ||
          t.isSystem ||
          this.hasSharedAccess(t.id, options.userId!)
        );
      }

      // Sort by rating in memory (since it's stored in metadata)
      if (options.sortBy === 'rating') {
        templates.sort((a, b) => {
          const ratingA = a.metadata.rating || 0;
          const ratingB = b.metadata.rating || 0;
          const comparison = ratingA - ratingB;
          return options.sortDirection === 'desc' ? -comparison : comparison;
        });
      }
    }

    return templates;
  }

  /**
   * Gets orderBy clause for Prisma
   */
  private getOrderBy(options?: TemplateFilterOptions): any {
    if (!options?.sortBy) {
      return { createdAt: 'desc' };
    }

    switch (options.sortBy) {
      case 'name':
        return { name: options.sortDirection || 'asc' };
      case 'createdAt':
        return { createdAt: options.sortDirection || 'desc' };
      case 'usageCount':
        return { usageCount: options.sortDirection || 'desc' };
      case 'rating':
        // Rating is in metadata, so we'll sort in memory
        return { createdAt: 'desc' };
      default:
        return { createdAt: 'desc' };
    }
  }

  /**
   * Gets a template by ID
   * @param templateId - Template identifier
   * @returns Template or null
   */
  async getTemplate(templateId: string): Promise<Template | null> {
    const dbTemplate = await prisma.template.findUnique({
      where: { id: templateId },
    });

    if (!dbTemplate) {
      return null;
    }

    return this.dbToTemplate(dbTemplate);
  }

  /**
   * Creates a new custom template
   * Requirement 25.3: Custom template creation
   * @param options - Template creation options
   * @returns Created template
   */
  async createTemplate(options: CreateTemplateOptions): Promise<Template> {
    // Validate user template limit
    const userTemplatesCount = await prisma.template.count({
      where: {
        createdBy: options.userId,
      },
    });
    
    if (userTemplatesCount >= this.config.maxTemplatesPerUser) {
      throw new Error(`Maximum templates per user (${this.config.maxTemplatesPerUser}) exceeded`);
    }

    // Validate tags limit
    const tags = options.tags || [];
    if (tags.length > this.config.maxTagsPerTemplate) {
      throw new Error(`Maximum tags per template (${this.config.maxTagsPerTemplate}) exceeded`);
    }

    // Validate settings
    this.validateSettings(options.settings);

    const metadata: TemplateMetadata = {
      version: '1.0.0',
      tags,
      usageCount: 0,
      ratingCount: 0,
    };

    const dbData = this.templateToDbData({
      name: options.name,
      description: options.description,
      category: options.category,
      visibility: options.visibility || 'private',
      userId: options.userId,
      settings: options.settings,
      metadata,
      isSystem: false,
    });

    const dbTemplate = await prisma.template.create({
      data: dbData,
    });

    const template = this.dbToTemplate(dbTemplate);

    logger.info(`Created template: ${template.id}`, {
      name: template.name,
      userId: template.userId,
      category: template.category,
    });

    return template;
  }

  /**
   * Updates an existing template
   * @param templateId - Template identifier
   * @param userId - User ID (for authorization)
   * @param options - Update options
   * @returns Updated template
   */
  async updateTemplate(
    templateId: string,
    userId: string,
    options: UpdateTemplateOptions
  ): Promise<Template> {
    const dbTemplate = await prisma.template.findUnique({
      where: { id: templateId },
    });

    if (!dbTemplate) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const template = this.dbToTemplate(dbTemplate);

    // Check authorization
    if (template.isSystem) {
      throw new Error('Cannot modify system templates');
    }
    if (template.userId !== userId && !this.hasEditAccess(templateId, userId)) {
      throw new Error('Not authorized to modify this template');
    }

    // Prepare update data
    const updateData: any = {};
    const newMetadata = { ...template.metadata };

    if (options.name !== undefined) updateData.name = options.name;
    if (options.description !== undefined) updateData.description = options.description;
    if (options.category !== undefined) updateData.category = options.category;
    if (options.visibility !== undefined) {
      updateData.isPublic = options.visibility === 'public';
    }

    if (options.tags !== undefined) {
      if (options.tags.length > this.config.maxTagsPerTemplate) {
        throw new Error(`Maximum tags per template (${this.config.maxTagsPerTemplate}) exceeded`);
      }
      newMetadata.tags = options.tags;
    }

    // Update settings
    let newSettings = { ...template.settings };
    if (options.settings) {
      newSettings = { ...newSettings, ...options.settings };
      this.validateSettings(newSettings);
    }

    // Increment version
    const versionParts = newMetadata.version.split('.').map(Number);
    versionParts[2]!++;
    newMetadata.version = versionParts.join('.');

    // Combine settings with metadata
    const settingsWithMetadata = {
      ...newSettings,
      _metadata: newMetadata,
    };

    updateData.settings = settingsWithMetadata as any;

    const updatedDbTemplate = await prisma.template.update({
      where: { id: templateId },
      data: updateData,
    });

    logger.info(`Updated template: ${templateId}`);
    return this.dbToTemplate(updatedDbTemplate);
  }

  /**
   * Deletes a template
   * @param templateId - Template identifier
   * @param userId - User ID (for authorization)
   */
  async deleteTemplate(templateId: string, userId: string): Promise<void> {
    const dbTemplate = await prisma.template.findUnique({
      where: { id: templateId },
    });

    if (!dbTemplate) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const template = this.dbToTemplate(dbTemplate);

    if (template.isSystem) {
      throw new Error('Cannot delete system templates');
    }
    if (template.userId !== userId) {
      throw new Error('Not authorized to delete this template');
    }

    // Remove shares
    for (const [shareId, share] of this.shares) {
      if (share.templateId === templateId) {
        this.shares.delete(shareId);
      }
    }

    await prisma.template.delete({
      where: { id: templateId },
    });

    logger.info(`Deleted template: ${templateId}`);
  }

  /**
   * Applies a template to a project
   * Requirement 25.2: Automatically apply template's settings
   * Requirement 25.5: Allow users to override individual settings
   * @param options - Apply options
   * @returns Application result
   */
  async applyTemplate(options: ApplyTemplateOptions): Promise<ApplyTemplateResult> {
    const dbTemplate = await prisma.template.findUnique({
      where: { id: options.templateId },
    });

    if (!dbTemplate) {
      throw new Error(`Template not found: ${options.templateId}`);
    }

    const template = this.dbToTemplate(dbTemplate);

    // Merge template settings with overrides
    const appliedSettings: TemplateSettings = { ...template.settings };
    const overriddenFields: string[] = [];

    if (options.overrides) {
      if (options.overrides.level !== undefined) {
        appliedSettings.level = options.overrides.level;
        overriddenFields.push('level');
      }
      if (options.overrides.strategy !== undefined) {
        appliedSettings.strategy = options.overrides.strategy;
        overriddenFields.push('strategy');
      }
      if (options.overrides.protectedDelimiters !== undefined) {
        appliedSettings.protectedDelimiters = options.overrides.protectedDelimiters;
        overriddenFields.push('protectedDelimiters');
      }
      if (options.overrides.language !== undefined) {
        appliedSettings.language = options.overrides.language;
        overriddenFields.push('language');
      }
      if (options.overrides.customSettings !== undefined) {
        appliedSettings.customSettings = {
          ...appliedSettings.customSettings,
          ...options.overrides.customSettings,
        };
        overriddenFields.push('customSettings');
      }
    }

    // Increment usage count in database
    const newMetadata = {
      ...template.metadata,
      usageCount: template.metadata.usageCount + 1,
    };

    const settingsWithMetadata = {
      ...template.settings,
      _metadata: newMetadata,
    };

    await prisma.template.update({
      where: { id: options.templateId },
      data: {
        usageCount: newMetadata.usageCount,
        settings: settingsWithMetadata as any,
      },
    });

    const result: ApplyTemplateResult = {
      templateId: options.templateId,
      projectId: options.projectId,
      appliedSettings,
      overriddenFields,
      appliedAt: new Date(),
    };

    logger.info(`Applied template ${options.templateId} to project ${options.projectId}`, {
      overriddenFields,
    });

    return result;
  }

  /**
   * Exports a template for sharing
   * Requirement 25.4: Export template configurations
   * @param templateId - Template identifier
   * @returns Template export data
   */
  async exportTemplate(templateId: string): Promise<TemplateExport> {
    const dbTemplate = await prisma.template.findUnique({
      where: { id: templateId },
    });

    if (!dbTemplate) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const template = this.dbToTemplate(dbTemplate);

    const exportData: TemplateExport = {
      formatVersion: this.config.exportFormatVersion,
      exportedAt: new Date().toISOString(),
      template: {
        name: template.name,
        description: template.description,
        category: template.category,
        settings: template.settings,
        tags: template.metadata.tags,
        version: template.metadata.version,
      },
      checksum: '',
    };

    // Generate checksum
    exportData.checksum = this.generateChecksum(exportData.template);

    logger.info(`Exported template: ${templateId}`);
    return exportData;
  }

  /**
   * Imports a template from export data
   * Requirement 25.4: Import template configurations
   * @param userId - User ID
   * @param exportData - Template export data
   * @returns Imported template
   */
  async importTemplate(userId: string, exportData: TemplateExport): Promise<Template> {
    // Validate format version
    if (!exportData.formatVersion) {
      throw new Error('Invalid export format: missing formatVersion');
    }

    // Validate checksum
    const expectedChecksum = this.generateChecksum(exportData.template);
    if (exportData.checksum !== expectedChecksum) {
      throw new Error('Invalid export data: checksum mismatch');
    }

    // Validate template data
    if (!exportData.template.name || !exportData.template.settings) {
      throw new Error('Invalid export data: missing required fields');
    }

    // Create template from import
    const template = await this.createTemplate({
      name: `${exportData.template.name} (Imported)`,
      description: exportData.template.description,
      category: exportData.template.category,
      userId,
      settings: exportData.template.settings,
      visibility: 'private',
      tags: exportData.template.tags,
    });

    logger.info(`Imported template: ${template.id}`, {
      originalName: exportData.template.name,
      userId,
    });

    return template;
  }

  /**
   * Shares a template with another user
   * Requirement 25.4: Allow users to share templates
   * @param options - Share options
   * @returns Share record
   */
  async shareTemplate(options: ShareTemplateOptions): Promise<TemplateShare> {
    const dbTemplate = await prisma.template.findUnique({
      where: { id: options.templateId },
    });

    if (!dbTemplate) {
      throw new Error(`Template not found: ${options.templateId}`);
    }

    const template = this.dbToTemplate(dbTemplate);

    if (template.isSystem) {
      throw new Error('System templates are already public');
    }

    const id = this.generateId('share');
    const share: TemplateShare = {
      id,
      templateId: options.templateId,
      ownerUserId: template.userId,
      targetUserId: options.targetUserId,
      permission: options.permission,
      sharedAt: new Date(),
    };

    this.shares.set(id, share);

    logger.info(`Shared template ${options.templateId} with user ${options.targetUserId}`);
    return share;
  }

  /**
   * Removes a template share
   * @param shareId - Share identifier
   * @param userId - User ID (for authorization)
   */
  async unshareTemplate(shareId: string, userId: string): Promise<void> {
    const share = this.shares.get(shareId);
    if (!share) {
      throw new Error(`Share not found: ${shareId}`);
    }

    if (share.ownerUserId !== userId) {
      throw new Error('Not authorized to remove this share');
    }

    this.shares.delete(shareId);
    logger.info(`Removed template share: ${shareId}`);
  }

  /**
   * Gets shares for a template
   * @param templateId - Template identifier
   * @returns Array of shares
   */
  async getTemplateShares(templateId: string): Promise<TemplateShare[]> {
    return Array.from(this.shares.values()).filter(s => s.templateId === templateId);
  }

  /**
   * Rates a template
   * @param templateId - Template identifier
   * @param userId - User ID
   * @param rating - Rating (1-5)
   */
  async rateTemplate(templateId: string, userId: string, rating: number): Promise<void> {
    const dbTemplate = await prisma.template.findUnique({
      where: { id: templateId },
    });

    if (!dbTemplate) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const template = this.dbToTemplate(dbTemplate);

    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    // Simple average calculation (in production, would track individual ratings)
    const currentTotal = (template.metadata.rating || 0) * template.metadata.ratingCount;
    const newRatingCount = template.metadata.ratingCount + 1;
    const newRating = (currentTotal + rating) / newRatingCount;

    const newMetadata = {
      ...template.metadata,
      rating: newRating,
      ratingCount: newRatingCount,
    };

    const settingsWithMetadata = {
      ...template.settings,
      _metadata: newMetadata,
    };

    await prisma.template.update({
      where: { id: templateId },
      data: {
        settings: settingsWithMetadata as any,
      },
    });

    logger.info(`Rated template ${templateId}: ${rating}`);
  }

  /**
   * Duplicates a template
   * @param templateId - Template identifier
   * @param userId - User ID
   * @param newName - New template name
   * @returns Duplicated template
   */
  async duplicateTemplate(templateId: string, userId: string, newName?: string): Promise<Template> {
    const dbTemplate = await prisma.template.findUnique({
      where: { id: templateId },
    });

    if (!dbTemplate) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const template = this.dbToTemplate(dbTemplate);

    return this.createTemplate({
      name: newName || `${template.name} (Copy)`,
      description: template.description,
      category: template.category,
      userId,
      settings: { ...template.settings },
      visibility: 'private',
      tags: [...template.metadata.tags],
    });
  }

  // ============ Private Helper Methods ============

  /**
   * Generates a unique identifier
   */
  private generateId(prefix: string): string {
    return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Validates template settings
   */
  private validateSettings(settings: TemplateSettings): void {
    if (settings.level < 1 || settings.level > 5) {
      throw new Error('Humanization level must be between 1 and 5');
    }

    const validStrategies = ['casual', 'professional', 'academic', 'auto'];
    if (!validStrategies.includes(settings.strategy)) {
      throw new Error(`Strategy must be one of: ${validStrategies.join(', ')}`);
    }
  }

  /**
   * Generates a checksum for template data
   */
  private generateChecksum(data: object): string {
    const json = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('sha256').update(json).digest('hex').substring(0, 16);
  }

  /**
   * Checks if a user has shared access to a template
   */
  private hasSharedAccess(templateId: string, userId: string): boolean {
    return Array.from(this.shares.values()).some(
      s => s.templateId === templateId && s.targetUserId === userId
    );
  }

  /**
   * Checks if a user has edit access to a template
   */
  private hasEditAccess(templateId: string, userId: string): boolean {
    return Array.from(this.shares.values()).some(
      s => s.templateId === templateId && s.targetUserId === userId && s.permission === 'edit'
    );
  }
}

// Export singleton instance
export const templateService = new TemplateService();
