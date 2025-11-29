/**
 * Model Registry Service
 * Manages ML model metadata, lineage, and registry information
 * Phase 2: Model Registry and Artifact Storage
 */

import { prisma } from '../database/prisma';
import { logger } from '../utils/logger';
import { getMLModelService } from './ml-model.service';

export interface CreateModelRegistryOptions {
  modelId: string;
  name: string;
  description?: string;
  modelType: string; // transformer, lstm, etc
  framework: string; // pytorch, tensorflow, etc
  architecture?: Record<string, unknown>;
  parentModelId?: string;
  baseModelId?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  createdBy: string;
}

export interface ModelRegistryEntry {
  id: string;
  modelId: string;
  name: string;
  description?: string;
  modelType: string;
  framework: string;
  architecture?: Record<string, unknown>;
  parentModelId?: string;
  baseModelId?: string;
  tags: string[];
  metadata?: Record<string, unknown>;
  latestVersion?: string;
  totalVersions: number;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ModelLineage {
  modelId: string;
  name: string;
  parent?: {
    modelId: string;
    name: string;
    relation: 'parent' | 'base' | 'fork';
  };
  children: Array<{
    modelId: string;
    name: string;
    relation: 'child' | 'fork';
  }>;
  versions: Array<{
    versionId: string;
    version: string;
    createdAt: Date;
  }>;
}

/**
 * Model Registry Service
 */
export class ModelRegistryService {
  /**
   * Creates or updates a model registry entry
   */
  async createOrUpdateModel(options: CreateModelRegistryOptions): Promise<ModelRegistryEntry> {
    // Check if model already exists
    const existing = await prisma.modelRegistry.findUnique({
      where: { modelId: options.modelId },
    });

    if (existing) {
      // Update existing
      const updated = await prisma.modelRegistry.update({
        where: { modelId: options.modelId },
        data: {
          name: options.name,
          description: options.description,
          modelType: options.modelType,
          framework: options.framework,
          architecture: options.architecture as any,
          parentModelId: options.parentModelId,
          baseModelId: options.baseModelId,
          tags: options.tags || [],
          metadata: options.metadata as any,
          updatedAt: new Date(),
        },
      });

      logger.info('Model registry updated', { modelId: options.modelId });
      return this.mapToModelRegistryEntry(updated);
    } else {
      // Create new
      const created = await prisma.modelRegistry.create({
        data: {
          modelId: options.modelId,
          name: options.name,
          description: options.description,
          modelType: options.modelType,
          framework: options.framework,
          architecture: options.architecture as any,
          parentModelId: options.parentModelId,
          baseModelId: options.baseModelId,
          tags: options.tags || [],
          metadata: options.metadata as any,
          createdBy: options.createdBy,
        },
      });

      logger.info('Model registered', { modelId: options.modelId });
      return this.mapToModelRegistryEntry(created);
    }
  }

  /**
   * Gets a model registry entry by model ID
   */
  async getModel(modelId: string): Promise<ModelRegistryEntry | null> {
    const model = await prisma.modelRegistry.findUnique({
      where: { modelId },
    });

    if (!model) {
      return null;
    }

    // Update version count
    const mlModelService = getMLModelService();
    const versions = mlModelService.getModelVersions(modelId);
    const latestVersion = versions[0];

    if (latestVersion) {
      await prisma.modelRegistry.update({
        where: { modelId },
        data: {
          latestVersion: latestVersion.version,
          totalVersions: versions.length,
        },
      });

      model.latestVersion = latestVersion.version;
      model.totalVersions = versions.length;
    }

    return this.mapToModelRegistryEntry(model);
  }

  /**
   * Lists models in registry
   */
  async listModels(options: {
    modelType?: string;
    framework?: string;
    isActive?: boolean;
    tags?: string[];
    limit?: number;
    offset?: number;
  }): Promise<{ models: ModelRegistryEntry[]; total: number }> {
    const where: any = {};

    if (options.modelType) {
      where.modelType = options.modelType;
    }

    if (options.framework) {
      where.framework = options.framework;
    }

    if (options.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    if (options.tags && options.tags.length > 0) {
      where.tags = {
        hasEvery: options.tags,
      };
    }

    const [models, total] = await Promise.all([
      prisma.modelRegistry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options.limit || 50,
        skip: options.offset || 0,
      }),
      prisma.modelRegistry.count({ where }),
    ]);

    return {
      models: models.map(model => this.mapToModelRegistryEntry(model)),
      total,
    };
  }

  /**
   * Gets model lineage (parent, children, versions)
   */
  async getModelLineage(modelId: string): Promise<ModelLineage | null> {
    const model = await this.getModel(modelId);
    if (!model) {
      return null;
    }

    const mlModelService = getMLModelService();
    const versions = mlModelService.getModelVersions(modelId);

    // Get parent/base models
    let parent: { modelId: string; name: string; relation: 'parent' | 'base' | 'fork' } | undefined;
    if (model.parentModelId) {
      const parentModel = await this.getModel(model.parentModelId);
      if (parentModel) {
        parent = {
          modelId: parentModel.modelId,
          name: parentModel.name,
          relation: 'parent',
        };
      }
    }
    if (model.baseModelId && model.baseModelId !== model.parentModelId) {
      const baseModel = await this.getModel(model.baseModelId);
      if (baseModel) {
        parent = {
          modelId: baseModel.modelId,
          name: baseModel.name,
          relation: 'base',
        };
      }
    }

    // Get child models (models that have this as parent or base)
    const children = await prisma.modelRegistry.findMany({
      where: {
        OR: [
          { parentModelId: modelId },
          { baseModelId: modelId },
        ],
      },
    });

    const lineage: ModelLineage = {
      modelId: model.modelId,
      name: model.name,
      parent,
      children: children.map(child => ({
        modelId: child.modelId,
        name: child.name,
        relation: child.parentModelId === modelId ? 'child' : 'fork',
      })),
      versions: versions.map(v => ({
        versionId: v.id,
        version: v.version,
        createdAt: v.createdAt,
      })),
    };

    return lineage;
  }

  /**
   * Updates model metadata
   */
  async updateModelMetadata(
    modelId: string,
    metadata: Partial<{
      name: string;
      description: string;
      tags: string[];
      metadata: Record<string, unknown>;
      isActive: boolean;
    }>
  ): Promise<ModelRegistryEntry> {
    const updateData: any = {};

    if (metadata.name) {
      updateData.name = metadata.name;
    }

    if (metadata.description !== undefined) {
      updateData.description = metadata.description;
    }

    if (metadata.tags) {
      updateData.tags = metadata.tags;
    }

    if (metadata.metadata) {
      updateData.metadata = metadata.metadata as any;
    }

    if (metadata.isActive !== undefined) {
      updateData.isActive = metadata.isActive;
    }

    const updated = await prisma.modelRegistry.update({
      where: { modelId },
      data: updateData,
    });

    logger.info('Model metadata updated', { modelId });
    return this.mapToModelRegistryEntry(updated);
  }

  /**
   * Deactivates a model
   */
  async deactivateModel(modelId: string): Promise<void> {
    await prisma.modelRegistry.update({
      where: { modelId },
      data: { isActive: false },
    });

    logger.info('Model deactivated', { modelId });
  }

  /**
   * Activates a model
   */
  async activateModel(modelId: string): Promise<void> {
    await prisma.modelRegistry.update({
      where: { modelId },
      data: { isActive: true },
    });

    logger.info('Model activated', { modelId });
  }

  /**
   * Maps Prisma model to ModelRegistryEntry interface
   */
  private mapToModelRegistryEntry(model: any): ModelRegistryEntry {
    return {
      id: model.id,
      modelId: model.modelId,
      name: model.name,
      description: model.description || undefined,
      modelType: model.modelType,
      framework: model.framework,
      architecture: model.architecture as Record<string, unknown> | undefined,
      parentModelId: model.parentModelId || undefined,
      baseModelId: model.baseModelId || undefined,
      tags: model.tags || [],
      metadata: model.metadata as Record<string, unknown> | undefined,
      latestVersion: model.latestVersion || undefined,
      totalVersions: model.totalVersions,
      isActive: model.isActive,
      createdBy: model.createdBy,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    };
  }
}

// Singleton instance
let modelRegistryServiceInstance: ModelRegistryService | null = null;

/**
 * Gets the singleton model registry service instance
 */
export function getModelRegistryService(): ModelRegistryService {
  if (!modelRegistryServiceInstance) {
    modelRegistryServiceInstance = new ModelRegistryService();
  }
  return modelRegistryServiceInstance;
}

