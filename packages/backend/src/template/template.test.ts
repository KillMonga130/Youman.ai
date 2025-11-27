/**
 * Template Service Tests
 * Tests for template management functionality
 * Requirements: 25
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TemplateService } from './template.service';
import { CreateTemplateOptions, TemplateExport } from './types';

describe('TemplateService', () => {
  let service: TemplateService;

  beforeEach(() => {
    service = new TemplateService();
  });

  describe('System Templates', () => {
    /**
     * Requirement 25.1: Pre-configured templates for common use cases
     */
    it('should initialize with system templates', async () => {
      const templates = await service.getTemplates({ includeSystem: true });
      const systemTemplates = templates.filter(t => t.isSystem);

      expect(systemTemplates.length).toBeGreaterThan(0);
    });

    it('should have blog post templates', async () => {
      const templates = await service.getTemplates({ category: 'blog-posts' });

      expect(templates.length).toBeGreaterThan(0);
      expect(templates.some(t => t.name.toLowerCase().includes('blog'))).toBe(true);
    });

    it('should have academic paper templates', async () => {
      const templates = await service.getTemplates({ category: 'academic-papers' });

      expect(templates.length).toBeGreaterThan(0);
      expect(templates.some(t => t.name.toLowerCase().includes('academic'))).toBe(true);
    });

    it('should have creative writing templates', async () => {
      const templates = await service.getTemplates({ category: 'creative-writing' });

      expect(templates.length).toBeGreaterThan(0);
    });

    it('should have business content templates', async () => {
      const templates = await service.getTemplates({ category: 'business-content' });

      expect(templates.length).toBeGreaterThan(0);
    });

    it('should not allow modification of system templates', async () => {
      const templates = await service.getTemplates({ includeSystem: true });
      const systemTemplate = templates.find(t => t.isSystem);

      expect(systemTemplate).toBeDefined();

      await expect(
        service.updateTemplate(systemTemplate!.id, 'user_123', { name: 'Modified' })
      ).rejects.toThrow('Cannot modify system templates');
    });

    it('should not allow deletion of system templates', async () => {
      const templates = await service.getTemplates({ includeSystem: true });
      const systemTemplate = templates.find(t => t.isSystem);

      expect(systemTemplate).toBeDefined();

      await expect(
        service.deleteTemplate(systemTemplate!.id, 'user_123')
      ).rejects.toThrow('Cannot delete system templates');
    });
  });

  describe('Custom Template Creation', () => {
    /**
     * Requirement 25.3: Custom template creation
     */
    it('should create a custom template', async () => {
      const options: CreateTemplateOptions = {
        name: 'My Custom Template',
        description: 'A custom template for testing',
        category: 'custom',
        userId: 'user_123',
        settings: {
          level: 3,
          strategy: 'professional',
        },
        tags: ['test', 'custom'],
      };

      const template = await service.createTemplate(options);

      expect(template.id).toBeDefined();
      expect(template.name).toBe('My Custom Template');
      expect(template.description).toBe('A custom template for testing');
      expect(template.category).toBe('custom');
      expect(template.userId).toBe('user_123');
      expect(template.settings.level).toBe(3);
      expect(template.settings.strategy).toBe('professional');
      expect(template.isSystem).toBe(false);
      expect(template.metadata.tags).toContain('test');
    });

    it('should validate humanization level', async () => {
      const options: CreateTemplateOptions = {
        name: 'Invalid Template',
        description: 'Test',
        category: 'custom',
        userId: 'user_123',
        settings: {
          level: 10 as any, // Invalid level
          strategy: 'casual',
        },
      };

      await expect(service.createTemplate(options)).rejects.toThrow(
        'Humanization level must be between 1 and 5'
      );
    });

    it('should validate strategy', async () => {
      const options: CreateTemplateOptions = {
        name: 'Invalid Template',
        description: 'Test',
        category: 'custom',
        userId: 'user_123',
        settings: {
          level: 3,
          strategy: 'invalid' as any,
        },
      };

      await expect(service.createTemplate(options)).rejects.toThrow(
        'Strategy must be one of'
      );
    });

    it('should enforce maximum tags limit', async () => {
      const options: CreateTemplateOptions = {
        name: 'Too Many Tags',
        description: 'Test',
        category: 'custom',
        userId: 'user_123',
        settings: {
          level: 3,
          strategy: 'casual',
        },
        tags: Array(15).fill('tag'), // More than max
      };

      await expect(service.createTemplate(options)).rejects.toThrow(
        'Maximum tags per template'
      );
    });
  });

  describe('Template Application', () => {
    /**
     * Requirement 25.2: Automatically apply template's settings
     */
    it('should apply template settings to a project', async () => {
      const templates = await service.getTemplates({ category: 'blog-posts' });
      const template = templates[0]!;

      const result = await service.applyTemplate({
        templateId: template.id,
        projectId: 'project_123',
      });

      expect(result.templateId).toBe(template.id);
      expect(result.projectId).toBe('project_123');
      expect(result.appliedSettings.level).toBe(template.settings.level);
      expect(result.appliedSettings.strategy).toBe(template.settings.strategy);
      expect(result.overriddenFields).toHaveLength(0);
    });

    /**
     * Requirement 25.5: Allow users to override individual settings
     */
    it('should allow overriding individual settings', async () => {
      const templates = await service.getTemplates({ category: 'blog-posts' });
      const template = templates[0]!;

      const result = await service.applyTemplate({
        templateId: template.id,
        projectId: 'project_123',
        overrides: {
          level: 5,
          language: 'es',
        },
      });

      expect(result.appliedSettings.level).toBe(5);
      expect(result.appliedSettings.language).toBe('es');
      expect(result.appliedSettings.strategy).toBe(template.settings.strategy);
      expect(result.overriddenFields).toContain('level');
      expect(result.overriddenFields).toContain('language');
    });

    it('should increment usage count when applied', async () => {
      const templates = await service.getTemplates({ category: 'blog-posts' });
      const template = templates[0]!;
      const initialCount = template.metadata.usageCount;

      await service.applyTemplate({
        templateId: template.id,
        projectId: 'project_123',
      });

      const updatedTemplate = await service.getTemplate(template.id);
      expect(updatedTemplate!.metadata.usageCount).toBe(initialCount + 1);
    });
  });

  describe('Template Export/Import', () => {
    /**
     * Requirement 25.4: Export and import template configurations
     */
    it('should export a template', async () => {
      const template = await service.createTemplate({
        name: 'Export Test',
        description: 'Template for export testing',
        category: 'custom',
        userId: 'user_123',
        settings: {
          level: 4,
          strategy: 'academic',
        },
        tags: ['export', 'test'],
      });

      const exportData = await service.exportTemplate(template.id);

      expect(exportData.formatVersion).toBeDefined();
      expect(exportData.exportedAt).toBeDefined();
      expect(exportData.template.name).toBe('Export Test');
      expect(exportData.template.settings.level).toBe(4);
      expect(exportData.checksum).toBeDefined();
    });

    it('should import a template', async () => {
      const template = await service.createTemplate({
        name: 'Import Source',
        description: 'Source template',
        category: 'custom',
        userId: 'user_123',
        settings: {
          level: 2,
          strategy: 'casual',
        },
      });

      const exportData = await service.exportTemplate(template.id);
      const imported = await service.importTemplate('user_456', exportData);

      expect(imported.id).not.toBe(template.id);
      expect(imported.name).toContain('Import Source');
      expect(imported.name).toContain('Imported');
      expect(imported.userId).toBe('user_456');
      expect(imported.settings.level).toBe(2);
      expect(imported.settings.strategy).toBe('casual');
    });

    it('should reject import with invalid checksum', async () => {
      const exportData: TemplateExport = {
        formatVersion: '1.0.0',
        exportedAt: new Date().toISOString(),
        template: {
          name: 'Tampered',
          description: 'Test',
          category: 'custom',
          settings: { level: 3, strategy: 'casual' },
          tags: [],
          version: '1.0.0',
        },
        checksum: 'invalid_checksum',
      };

      await expect(service.importTemplate('user_123', exportData)).rejects.toThrow(
        'checksum mismatch'
      );
    });
  });

  describe('Template Sharing', () => {
    /**
     * Requirement 25.4: Allow users to share templates
     */
    it('should share a template with another user', async () => {
      const template = await service.createTemplate({
        name: 'Shared Template',
        description: 'Template to share',
        category: 'custom',
        userId: 'user_123',
        settings: {
          level: 3,
          strategy: 'professional',
        },
      });

      const share = await service.shareTemplate({
        templateId: template.id,
        targetUserId: 'user_456',
        permission: 'use',
      });

      expect(share.id).toBeDefined();
      expect(share.templateId).toBe(template.id);
      expect(share.targetUserId).toBe('user_456');
      expect(share.permission).toBe('use');
    });

    it('should list shares for a template', async () => {
      const template = await service.createTemplate({
        name: 'Multi-Share Template',
        description: 'Template with multiple shares',
        category: 'custom',
        userId: 'user_123',
        settings: {
          level: 3,
          strategy: 'casual',
        },
      });

      await service.shareTemplate({
        templateId: template.id,
        targetUserId: 'user_456',
        permission: 'view',
      });

      await service.shareTemplate({
        templateId: template.id,
        targetUserId: 'user_789',
        permission: 'edit',
      });

      const shares = await service.getTemplateShares(template.id);

      expect(shares).toHaveLength(2);
    });

    it('should not allow sharing system templates', async () => {
      const templates = await service.getTemplates({ includeSystem: true });
      const systemTemplate = templates.find(t => t.isSystem);

      await expect(
        service.shareTemplate({
          templateId: systemTemplate!.id,
          targetUserId: 'user_456',
          permission: 'use',
        })
      ).rejects.toThrow('System templates are already public');
    });
  });

  describe('Template Filtering', () => {
    it('should filter by category', async () => {
      const templates = await service.getTemplates({ category: 'academic-papers' });

      expect(templates.every(t => t.category === 'academic-papers')).toBe(true);
    });

    it('should filter by search query', async () => {
      const templates = await service.getTemplates({ searchQuery: 'blog' });

      expect(templates.length).toBeGreaterThan(0);
      expect(
        templates.every(
          t =>
            t.name.toLowerCase().includes('blog') ||
            t.description.toLowerCase().includes('blog')
        )
      ).toBe(true);
    });

    it('should filter by tags', async () => {
      await service.createTemplate({
        name: 'Tagged Template',
        description: 'Test',
        category: 'custom',
        userId: 'user_123',
        settings: { level: 3, strategy: 'casual' },
        tags: ['unique-tag'],
      });

      const templates = await service.getTemplates({ tags: ['unique-tag'] });

      expect(templates.length).toBeGreaterThan(0);
      expect(templates.some(t => t.metadata.tags.includes('unique-tag'))).toBe(true);
    });

    it('should sort by name', async () => {
      const templates = await service.getTemplates({
        sortBy: 'name',
        sortDirection: 'asc',
      });

      for (let i = 1; i < templates.length; i++) {
        expect(templates[i]!.name.localeCompare(templates[i - 1]!.name)).toBeGreaterThanOrEqual(0);
      }
    });

    it('should paginate results', async () => {
      const allTemplates = await service.getTemplates({});
      const page1 = await service.getTemplates({ limit: 3, offset: 0 });
      const page2 = await service.getTemplates({ limit: 3, offset: 3 });

      expect(page1.length).toBeLessThanOrEqual(3);
      expect(page2.length).toBeLessThanOrEqual(3);

      if (allTemplates.length > 3) {
        expect(page1[0]!.id).not.toBe(page2[0]?.id);
      }
    });
  });

  describe('Template Rating', () => {
    it('should rate a template', async () => {
      const template = await service.createTemplate({
        name: 'Rateable Template',
        description: 'Test',
        category: 'custom',
        userId: 'user_123',
        settings: { level: 3, strategy: 'casual' },
      });

      await service.rateTemplate(template.id, 'user_456', 5);
      await service.rateTemplate(template.id, 'user_789', 3);

      const updated = await service.getTemplate(template.id);

      expect(updated!.metadata.rating).toBe(4); // Average of 5 and 3
      expect(updated!.metadata.ratingCount).toBe(2);
    });

    it('should reject invalid ratings', async () => {
      const template = await service.createTemplate({
        name: 'Test Template',
        description: 'Test',
        category: 'custom',
        userId: 'user_123',
        settings: { level: 3, strategy: 'casual' },
      });

      await expect(service.rateTemplate(template.id, 'user_456', 0)).rejects.toThrow(
        'Rating must be between 1 and 5'
      );

      await expect(service.rateTemplate(template.id, 'user_456', 6)).rejects.toThrow(
        'Rating must be between 1 and 5'
      );
    });
  });

  describe('Template Duplication', () => {
    it('should duplicate a template', async () => {
      const original = await service.createTemplate({
        name: 'Original Template',
        description: 'Original description',
        category: 'custom',
        userId: 'user_123',
        settings: { level: 4, strategy: 'academic' },
        tags: ['original'],
      });

      const duplicate = await service.duplicateTemplate(original.id, 'user_456');

      expect(duplicate.id).not.toBe(original.id);
      expect(duplicate.name).toContain('Copy');
      expect(duplicate.userId).toBe('user_456');
      expect(duplicate.settings.level).toBe(original.settings.level);
      expect(duplicate.settings.strategy).toBe(original.settings.strategy);
    });

    it('should allow custom name for duplicate', async () => {
      const original = await service.createTemplate({
        name: 'Original',
        description: 'Test',
        category: 'custom',
        userId: 'user_123',
        settings: { level: 3, strategy: 'casual' },
      });

      const duplicate = await service.duplicateTemplate(original.id, 'user_456', 'My Copy');

      expect(duplicate.name).toBe('My Copy');
    });
  });

  describe('Template Update', () => {
    it('should update template fields', async () => {
      const template = await service.createTemplate({
        name: 'Updatable Template',
        description: 'Original description',
        category: 'custom',
        userId: 'user_123',
        settings: { level: 3, strategy: 'casual' },
      });

      const updated = await service.updateTemplate(template.id, 'user_123', {
        name: 'Updated Name',
        description: 'Updated description',
        settings: { level: 5 },
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.description).toBe('Updated description');
      expect(updated.settings.level).toBe(5);
      expect(updated.settings.strategy).toBe('casual'); // Unchanged
    });

    it('should increment version on update', async () => {
      const template = await service.createTemplate({
        name: 'Versioned Template',
        description: 'Test',
        category: 'custom',
        userId: 'user_123',
        settings: { level: 3, strategy: 'casual' },
      });

      const initialVersion = template.metadata.version;

      await service.updateTemplate(template.id, 'user_123', { name: 'Updated' });

      const updated = await service.getTemplate(template.id);
      expect(updated!.metadata.version).not.toBe(initialVersion);
    });

    it('should not allow unauthorized updates', async () => {
      const template = await service.createTemplate({
        name: 'Protected Template',
        description: 'Test',
        category: 'custom',
        userId: 'user_123',
        settings: { level: 3, strategy: 'casual' },
      });

      await expect(
        service.updateTemplate(template.id, 'user_456', { name: 'Hacked' })
      ).rejects.toThrow('Not authorized');
    });
  });

  describe('Template Deletion', () => {
    it('should delete a template', async () => {
      const template = await service.createTemplate({
        name: 'Deletable Template',
        description: 'Test',
        category: 'custom',
        userId: 'user_123',
        settings: { level: 3, strategy: 'casual' },
      });

      await service.deleteTemplate(template.id, 'user_123');

      const deleted = await service.getTemplate(template.id);
      expect(deleted).toBeNull();
    });

    it('should not allow unauthorized deletion', async () => {
      const template = await service.createTemplate({
        name: 'Protected Template',
        description: 'Test',
        category: 'custom',
        userId: 'user_123',
        settings: { level: 3, strategy: 'casual' },
      });

      await expect(service.deleteTemplate(template.id, 'user_456')).rejects.toThrow(
        'Not authorized'
      );
    });

    it('should remove shares when template is deleted', async () => {
      const template = await service.createTemplate({
        name: 'Shared Template',
        description: 'Test',
        category: 'custom',
        userId: 'user_123',
        settings: { level: 3, strategy: 'casual' },
      });

      await service.shareTemplate({
        templateId: template.id,
        targetUserId: 'user_456',
        permission: 'use',
      });

      await service.deleteTemplate(template.id, 'user_123');

      const shares = await service.getTemplateShares(template.id);
      expect(shares).toHaveLength(0);
    });
  });
});
