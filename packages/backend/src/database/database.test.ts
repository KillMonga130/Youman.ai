/**
 * Database module tests
 */

import { describe, it, expect } from 'vitest';

describe('Database Module', () => {
  describe('Prisma Schema', () => {
    it('should export prisma client', async () => {
      const { prisma } = await import('./prisma');
      expect(prisma).toBeDefined();
    });
  });

  describe('MongoDB Schemas', () => {
    it('should export DocumentModel', async () => {
      const { DocumentModel } = await import('./schemas/document.schema');
      expect(DocumentModel).toBeDefined();
      expect(DocumentModel.modelName).toBe('Document');
    });

    it('should export ChunkModel', async () => {
      const { ChunkModel } = await import('./schemas/chunk.schema');
      expect(ChunkModel).toBeDefined();
      expect(ChunkModel.modelName).toBe('Chunk');
    });

    it('should export StyleProfileModel', async () => {
      const { StyleProfileModel } = await import('./schemas/style-profile.schema');
      expect(StyleProfileModel).toBeDefined();
      expect(StyleProfileModel.modelName).toBe('StyleProfile');
    });
  });

  describe('Database Initialization', () => {
    it('should export initialization functions', async () => {
      const { initializeDatabases, shutdownDatabases, checkDatabaseHealth } = await import('./init');
      expect(initializeDatabases).toBeDefined();
      expect(typeof initializeDatabases).toBe('function');
      expect(shutdownDatabases).toBeDefined();
      expect(typeof shutdownDatabases).toBe('function');
      expect(checkDatabaseHealth).toBeDefined();
      expect(typeof checkDatabaseHealth).toBe('function');
    });
  });
});
