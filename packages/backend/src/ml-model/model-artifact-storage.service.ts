/**
 * Model Artifact Storage Service
 * Manages storage and retrieval of ML model artifacts (models, checkpoints, metadata)
 * Phase 2: Model Registry and Artifact Storage
 */

import { prisma } from '../database/prisma';
import { logger } from '../utils/logger';
import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { uploadToS3, downloadFromS3, isS3Available } from '../storage/s3-client';

export type StorageProvider = 's3' | 'local';
export type ArtifactType = 'model' | 'checkpoint' | 'metadata' | 'tokenizer' | 'config' | 'other';

export interface ArtifactUploadOptions {
  modelId: string;
  versionId?: string;
  trainingJobId?: string;
  artifactType: ArtifactType;
  filePath: string; // Local file path to upload
  metadata?: Record<string, unknown>;
  lineage?: Record<string, unknown>;
}

export interface ArtifactInfo {
  id: string;
  modelId: string;
  versionId?: string;
  trainingJobId?: string;
  artifactType: ArtifactType;
  artifactPath: string;
  artifactSize?: bigint;
  artifactHash?: string;
  storageProvider: StorageProvider;
  storageLocation: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  lineage?: Record<string, unknown>;
  createdAt: Date;
}

export interface ArtifactDownloadOptions {
  artifactId: string;
  destinationPath: string;
}

/**
 * Model Artifact Storage Service
 */
export class ModelArtifactStorageService {
  private readonly baseLocalPath: string;
  private readonly useS3: boolean;

  constructor() {
    this.baseLocalPath = process.env.MODEL_ARTIFACTS_PATH || './storage/model-artifacts';
    this.useS3 = isS3Available();
  }

  /**
   * Uploads an artifact to storage
   */
  async uploadArtifact(options: ArtifactUploadOptions): Promise<ArtifactInfo> {
    // Read file and calculate hash
    const fileBuffer = await fs.readFile(options.filePath);
    const fileStats = await fs.stat(options.filePath);
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Determine storage provider
    const useS3ForThis = this.useS3 && fileStats.size > 10 * 1024 * 1024; // Use S3 for files > 10MB

    let artifactPath: string;
    let storageProvider: StorageProvider;
    let storageLocation: Record<string, unknown>;

    if (useS3ForThis) {
      // Upload to S3
      artifactPath = this.generateS3Path(options.modelId, options.versionId, options.artifactType);
      storageProvider = 's3';
      
      await uploadToS3({
        key: artifactPath,
        content: fileBuffer.toString('base64'),
        contentType: this.getContentType(options.artifactType),
        metadata: {
          modelId: options.modelId,
          versionId: options.versionId || '',
          artifactType: options.artifactType,
          hash: fileHash,
        },
      });

      storageLocation = {
        provider: 's3',
        bucket: process.env.S3_BUCKET,
        key: artifactPath,
      };
    } else {
      // Store locally
      const localPath = this.generateLocalPath(options.modelId, options.versionId, options.artifactType);
      const fullPath = path.join(this.baseLocalPath, localPath);
      
      // Ensure directory exists
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      
      // Copy file to storage location
      await fs.copyFile(options.filePath, fullPath);

      artifactPath = fullPath;
      storageProvider = 'local';
      storageLocation = {
        provider: 'local',
        path: fullPath,
      };
    }

    // Create artifact record in database
    const artifact = await prisma.modelArtifact.create({
      data: {
        modelId: options.modelId,
        versionId: options.versionId,
        trainingJobId: options.trainingJobId,
        artifactType: options.artifactType,
        artifactPath: artifactPath,
        artifactSize: BigInt(fileStats.size),
        artifactHash: fileHash,
        storageProvider: storageProvider,
        storageLocation: storageLocation as any,
        metadata: options.metadata as any,
        lineage: options.lineage as any,
      },
    });

    logger.info('Model artifact uploaded', {
      artifactId: artifact.id,
      modelId: options.modelId,
      artifactType: options.artifactType,
      size: fileStats.size,
      provider: storageProvider,
    });

    return this.mapToArtifactInfo(artifact);
  }

  /**
   * Downloads an artifact from storage
   */
  async downloadArtifact(options: ArtifactDownloadOptions): Promise<void> {
    const artifact = await prisma.modelArtifact.findUnique({
      where: { id: options.artifactId },
    });

    if (!artifact) {
      throw new Error(`Artifact not found: ${options.artifactId}`);
    }

    // Ensure destination directory exists
    await fs.mkdir(path.dirname(options.destinationPath), { recursive: true });

    if (artifact.storageProvider === 's3') {
      // Download from S3
      const location = artifact.storageLocation as any;
      const content = await downloadFromS3(location.key);
      
      // Write to destination
      await fs.writeFile(options.destinationPath, Buffer.from(content.content, 'base64'));
    } else {
      // Copy from local storage
      await fs.copyFile(artifact.artifactPath, options.destinationPath);
    }

    logger.info('Model artifact downloaded', {
      artifactId: options.artifactId,
      destination: options.destinationPath,
    });
  }

  /**
   * Gets artifact info by ID
   */
  async getArtifactInfo(artifactId: string): Promise<ArtifactInfo | null> {
    const artifact = await prisma.modelArtifact.findUnique({
      where: { id: artifactId },
    });

    if (!artifact) {
      return null;
    }

    return this.mapToArtifactInfo(artifact);
  }

  /**
   * Lists artifacts for a model/version
   */
  async listArtifacts(options: {
    modelId?: string;
    versionId?: string;
    trainingJobId?: string;
    artifactType?: ArtifactType;
    limit?: number;
    offset?: number;
  }): Promise<{ artifacts: ArtifactInfo[]; total: number }> {
    const where: any = {};

    if (options.modelId) {
      where.modelId = options.modelId;
    }

    if (options.versionId) {
      where.versionId = options.versionId;
    }

    if (options.trainingJobId) {
      where.trainingJobId = options.trainingJobId;
    }

    if (options.artifactType) {
      where.artifactType = options.artifactType;
    }

    const [artifacts, total] = await Promise.all([
      prisma.modelArtifact.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options.limit || 50,
        skip: options.offset || 0,
      }),
      prisma.modelArtifact.count({ where }),
    ]);

    return {
      artifacts: artifacts.map(artifact => this.mapToArtifactInfo(artifact)),
      total,
    };
  }

  /**
   * Deletes an artifact
   */
  async deleteArtifact(artifactId: string): Promise<void> {
    const artifact = await prisma.modelArtifact.findUnique({
      where: { id: artifactId },
    });

    if (!artifact) {
      throw new Error(`Artifact not found: ${artifactId}`);
    }

    // Delete from storage
    if (artifact.storageProvider === 's3') {
      // Delete from S3 (would need deleteFromS3 function)
      logger.warn('S3 deletion not yet implemented', { artifactId });
    } else {
      // Delete local file
      try {
        await fs.unlink(artifact.artifactPath);
      } catch (error) {
        logger.warn('Failed to delete local artifact file', { artifactId, error });
      }
    }

    // Delete database record
    await prisma.modelArtifact.delete({
      where: { id: artifactId },
    });

    logger.info('Model artifact deleted', { artifactId });
  }

  /**
   * Verifies artifact integrity
   */
  async verifyArtifact(artifactId: string): Promise<boolean> {
    const artifact = await prisma.modelArtifact.findUnique({
      where: { id: artifactId },
    });

    if (!artifact || !artifact.artifactHash) {
      return false;
    }

    // Read file and calculate hash
    let fileBuffer: Buffer;
    if (artifact.storageProvider === 's3') {
      const location = artifact.storageLocation as any;
      const content = await downloadFromS3(location.key);
      fileBuffer = Buffer.from(content.content, 'base64');
    } else {
      fileBuffer = await fs.readFile(artifact.artifactPath);
    }

    const calculatedHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    return calculatedHash === artifact.artifactHash;
  }

  // ============ Private Helper Methods ============

  /**
   * Generates S3 path for artifact
   */
  private generateS3Path(
    modelId: string,
    versionId: string | undefined,
    artifactType: ArtifactType
  ): string {
    const base = `model-artifacts/${modelId}`;
    if (versionId) {
      return `${base}/${versionId}/${artifactType}-${Date.now()}.bin`;
    }
    return `${base}/${artifactType}-${Date.now()}.bin`;
  }

  /**
   * Generates local path for artifact
   */
  private generateLocalPath(
    modelId: string,
    versionId: string | undefined,
    artifactType: ArtifactType
  ): string {
    const base = `${modelId}`;
    if (versionId) {
      return `${base}/${versionId}/${artifactType}-${Date.now()}.bin`;
    }
    return `${base}/${artifactType}-${Date.now()}.bin`;
  }

  /**
   * Gets content type for artifact
   */
  private getContentType(artifactType: ArtifactType): string {
    switch (artifactType) {
      case 'model':
        return 'application/octet-stream';
      case 'checkpoint':
        return 'application/octet-stream';
      case 'metadata':
        return 'application/json';
      case 'tokenizer':
        return 'application/json';
      case 'config':
        return 'application/json';
      default:
        return 'application/octet-stream';
    }
  }

  /**
   * Maps Prisma model to ArtifactInfo interface
   */
  private mapToArtifactInfo(artifact: any): ArtifactInfo {
    return {
      id: artifact.id,
      modelId: artifact.modelId,
      versionId: artifact.versionId || undefined,
      trainingJobId: artifact.trainingJobId || undefined,
      artifactType: artifact.artifactType as ArtifactType,
      artifactPath: artifact.artifactPath,
      artifactSize: artifact.artifactSize || undefined,
      artifactHash: artifact.artifactHash || undefined,
      storageProvider: artifact.storageProvider as StorageProvider,
      storageLocation: artifact.storageLocation as Record<string, unknown>,
      metadata: artifact.metadata as Record<string, unknown> | undefined,
      lineage: artifact.lineage as Record<string, unknown> | undefined,
      createdAt: artifact.createdAt,
    };
  }
}

// Singleton instance
let modelArtifactStorageServiceInstance: ModelArtifactStorageService | null = null;

/**
 * Gets the singleton model artifact storage service instance
 */
export function getModelArtifactStorageService(): ModelArtifactStorageService {
  if (!modelArtifactStorageServiceInstance) {
    modelArtifactStorageServiceInstance = new ModelArtifactStorageService();
  }
  return modelArtifactStorageServiceInstance;
}

