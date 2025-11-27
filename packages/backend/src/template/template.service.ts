/**
 * Template Service
 * Manages transformation templates and presets
 * Requirements: 25
 */

import crypto from 'crypto';
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
  private templates: Map<string, Template>;
  private shares: Map<string, TemplateShare>;
  private systemTemplatesInitialized: boolean;

  constructor(serviceConfig?: Partial<TemplateServiceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...serviceConfig };
    this.templates = new Map();
    this.shares = new Map();
    this.systemTemplatesInitialized = false;

    // Initialize system templates
    if (this.config.enableSystemTemplates) {
      this.initializeSystemTemplates();
    }
  }

  /**
   * Initializes pre-configured system templates
   * Requirement 25.1: Pre-configured templates for common use cases
   */
  private initializeSystemTemplates(): void {
    if (this.systemTemplatesInitialized) return;

    for (const def of SYSTEM_TEMPLATES) {
      const id = this.generateId('sys_tpl');
      const now = new Date();

      const template: Template = {
        id,
        name: def.name,
        description: def.description,
        category: def.category,
        visibility: 'public',
        userId: 'system',
        settings: def.settings,
        metadata: {
          author: 'AI Humanizer',
          version: '1.0.0',
          tags: def.tags,
          usageCount: 0,
          ratingCount: 0,
        },
        isSystem: true,
        createdAt: now,
        updatedAt: now,
      };

      this.templates.set(id, template);
    }

    this.systemTemplatesInitialized = true;
    logger.info(`Initialized ${SYSTEM_TEMPLATES.length} system templates`);
  }

  /**
   * Gets templates with optional filtering
   * Requirement 25.1: Provide pre-configured templates for common use cases
   * @param options - Filter options
   * @returns Array of templates
   */
  async getTemplates(options?: TemplateFilterOptions): Promise<Template[]> {
    let templates = Array.from(this.templates.values());

    // Apply filters
    if (options) {
      // Filter by category
      if (options.category) {
        templates = templates.filter(t => t.category === options.category);
      }

      // Filter by visibility
      if (options.visibility) {
        templates = templates.filter(t => t.visibility === options.visibility);
      }

      // Filter by user ID
      if (options.userId) {
        templates = templates.filter(t => 
          t.userId === options.userId || 
          t.visibility === 'public' ||
          this.hasSharedAccess(t.id, options.userId)
        );
      }

      // Include/exclude system templates
      if (options.includeSystem === false) {
        templates = templates.filter(t => !t.isSystem);
      }

      // Search query
      if (options.searchQuery) {
        const query = options.searchQuery.toLowerCase();
        templates = templates.filter(t =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query)
        );
      }

      // Filter by tags
      if (options.tags && options.tags.length > 0) {
        templates = templates.filter(t =>
          options.tags!.some(tag => t.metadata.tags.includes(tag))
        );
      }

      // Sort
      if (options.sortBy) {
        templates.sort((a, b) => {
          let comparison = 0;
          switch (options.sortBy) {
            case 'name':
              comparison = a.name.localeCompare(b.name);
              break;
            case 'createdAt':
              comparison = a.createdAt.getTime() - b.createdAt.getTime();
              break;
            case 'usageCount':
              comparison = a.metadata.usageCount - b.metadata.usageCount;
              break;
            case 'rating':
              comparison = (a.metadata.rating || 0) - (b.metadata.rating || 0);
              break;
          }
          return options.sortDirection === 'desc' ? -comparison : comparison;
        });
      }

      // Pagination
      if (options.offset !== undefined) {
        templates = templates.slice(options.offset);
      }
      if (options.limit !== undefined) {
        templates = templates.slice(0, options.limit);
      }
    }

    return templates;
  }

  /**
   * Gets a template by ID
   * @param templateId - Template identifier
   * @returns Template or null
   */
  async getTemplate(templateId: string): Promise<Template | null> {
    return this.templates.get(templateId) || null;
  }

  /**
   * Creates a new custom template
   * Requirement 25.3: Custom template creation
   * @param options - Template creation options
   * @returns Created template
   */
  async createTemplate(options: CreateTemplateOptions): Promise<Template> {
    // Validate user template limit
    const userTemplates = await this.getTemplates({ 
      userId: options.userId, 
      includeSystem: false 
    });
    const ownedTemplates = userTemplates.filter(t => t.userId === options.userId);
    
    if (ownedTemplates.length >= this.config.maxTemplatesPerUser) {
      throw new Error(`Maximum templates per user (${this.config.maxTemplatesPerUser}) exceeded`);
    }

    // Validate tags limit
    const tags = options.tags || [];
    if (tags.length > this.config.maxTagsPerTemplate) {
      throw new Error(`Maximum tags per template (${this.config.maxTagsPerTemplate}) exceeded`);
    }

    // Validate settings
    this.validateSettings(options.settings);

    const id = this.generateId('tpl');
    const now = new Date();

    const template: Template = {
      id,
      name: options.name,
      description: options.description,
      category: options.category,
      visibility: options.visibility || 'private',
      userId: options.userId,
      settings: options.settings,
      metadata: {
        version: '1.0.0',
        tags,
        usageCount: 0,
        ratingCount: 0,
      },
      isSystem: false,
      createdAt: now,
      updatedAt: now,
    };

    this.templates.set(id, template);

    logger.info(`Created template: ${id}`, {
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
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Check authorization
    if (template.isSystem) {
      throw new Error('Cannot modify system templates');
    }
    if (template.userId !== userId && !this.hasEditAccess(templateId, userId)) {
      throw new Error('Not authorized to modify this template');
    }

    // Update fields
    if (options.name !== undefined) template.name = options.name;
    if (options.description !== undefined) template.description = options.description;
    if (options.category !== undefined) template.category = options.category;
    if (options.visibility !== undefined) template.visibility = options.visibility;
    if (options.tags !== undefined) {
      if (options.tags.length > this.config.maxTagsPerTemplate) {
        throw new Error(`Maximum tags per template (${this.config.maxTagsPerTemplate}) exceeded`);
      }
      template.metadata.tags = options.tags;
    }

    // Update settings
    if (options.settings) {
      template.settings = { ...template.settings, ...options.settings };
      this.validateSettings(template.settings);
    }

    // Increment version
    const versionParts = template.metadata.version.split('.').map(Number);
    versionParts[2]!++;
    template.metadata.version = versionParts.join('.');

    template.updatedAt = new Date();

    logger.info(`Updated template: ${templateId}`);
    return template;
  }

  /**
   * Deletes a template
   * @param templateId - Template identifier
   * @param userId - User ID (for authorization)
   */
  async deleteTemplate(templateId: string, userId: string): Promise<void> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

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

    this.templates.delete(templateId);
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
    const template = this.templates.get(options.templateId);
    if (!template) {
      throw new Error(`Template not found: ${options.templateId}`);
    }

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

    // Increment usage count
    template.metadata.usageCount++;
    template.updatedAt = new Date();

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
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

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
    const template = this.templates.get(options.templateId);
    if (!template) {
      throw new Error(`Template not found: ${options.templateId}`);
    }

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
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    // Simple average calculation (in production, would track individual ratings)
    const currentTotal = (template.metadata.rating || 0) * template.metadata.ratingCount;
    template.metadata.ratingCount++;
    template.metadata.rating = (currentTotal + rating) / template.metadata.ratingCount;
    template.updatedAt = new Date();

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
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

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
