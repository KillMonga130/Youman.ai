/**
 * Cloud Storage Service Tests
 * Tests for Google Drive, Dropbox, and OneDrive integrations
 * 
 * Requirements: 22 - Integrate with cloud storage services
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CloudProvider,
  CloudFileType,
  SyncStatus,
  type CloudFile,
  type CloudFileListResponse,
} from './types';
import {
  getOAuthUrl,
  CloudStorageError,
} from './cloud-storage.service';

// Mock external dependencies
vi.mock('../database/prisma', () => ({
  prisma: {
    cloudConnection: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    projectSyncConfig: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    project: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../storage/storage.service', () => ({
  storeDocument: vi.fn().mockResolvedValue({
    documentId: 'doc-123',
    contentHash: 'hash-123',
    wordCount: 100,
    characterCount: 500,
    storageLocation: { provider: 'mongodb', mongoId: 'mongo-123' },
    isDuplicate: false,
  }),
  retrieveDocument: vi.fn().mockResolvedValue({
    _id: 'doc-123',
    content: 'Test document content',
    projectId: 'project-123',
    type: 'original',
  }),
}));

vi.mock('../database/schemas/document.schema', () => ({
  DocumentModel: {
    find: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({}),
  },
}));

describe('Cloud Storage Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CloudProvider enum', () => {
    it('should have correct provider values', () => {
      expect(CloudProvider.GOOGLE_DRIVE).toBe('GOOGLE_DRIVE');
      expect(CloudProvider.DROPBOX).toBe('DROPBOX');
      expect(CloudProvider.ONEDRIVE).toBe('ONEDRIVE');
    });
  });

  describe('CloudFileType enum', () => {
    it('should have correct file type values', () => {
      expect(CloudFileType.FILE).toBe('FILE');
      expect(CloudFileType.FOLDER).toBe('FOLDER');
    });
  });

  describe('SyncStatus enum', () => {
    it('should have correct sync status values', () => {
      expect(SyncStatus.IDLE).toBe('IDLE');
      expect(SyncStatus.SYNCING).toBe('SYNCING');
      expect(SyncStatus.SUCCESS).toBe('SUCCESS');
      expect(SyncStatus.FAILED).toBe('FAILED');
    });
  });

  describe('CloudStorageError', () => {
    it('should create error with message and code', () => {
      const error = new CloudStorageError('Test error', 'TEST_CODE');
      
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.name).toBe('CloudStorageError');
    });
  });

  describe('getOAuthUrl', () => {
    it('should generate Google Drive OAuth URL', () => {
      const result = getOAuthUrl(
        CloudProvider.GOOGLE_DRIVE,
        'http://localhost:3000/callback',
        'test-state'
      );

      expect(result.url).toContain('accounts.google.com');
      expect(result.url).toContain('oauth2');
      expect(result.state).toBe('test-state');
    });

    it('should generate Dropbox OAuth URL', () => {
      const result = getOAuthUrl(
        CloudProvider.DROPBOX,
        'http://localhost:3000/callback',
        'test-state'
      );

      expect(result.url).toContain('dropbox.com');
      expect(result.url).toContain('oauth2');
      expect(result.url).toContain('state=test-state');
      expect(result.state).toBe('test-state');
    });

    it('should generate OneDrive OAuth URL', () => {
      const result = getOAuthUrl(
        CloudProvider.ONEDRIVE,
        'http://localhost:3000/callback',
        'test-state'
      );

      expect(result.url).toContain('login.microsoftonline.com');
      expect(result.url).toContain('oauth2');
      expect(result.url).toContain('state=test-state');
      expect(result.state).toBe('test-state');
    });

    it('should throw error for unsupported provider', () => {
      expect(() => {
        getOAuthUrl(
          'INVALID_PROVIDER' as CloudProvider,
          'http://localhost:3000/callback',
          'test-state'
        );
      }).toThrow(CloudStorageError);
    });
  });

  describe('CloudFile type', () => {
    it('should correctly type a cloud file', () => {
      const file: CloudFile = {
        id: 'file-123',
        name: 'test-document.txt',
        type: CloudFileType.FILE,
        mimeType: 'text/plain',
        size: 1024,
        path: '/documents/test-document.txt',
        parentId: 'folder-123',
        modifiedAt: new Date(),
        createdAt: new Date(),
        downloadUrl: 'https://example.com/download',
        thumbnailUrl: 'https://example.com/thumbnail',
        isShared: false,
        provider: CloudProvider.GOOGLE_DRIVE,
      };

      expect(file.id).toBe('file-123');
      expect(file.name).toBe('test-document.txt');
      expect(file.type).toBe(CloudFileType.FILE);
      expect(file.provider).toBe(CloudProvider.GOOGLE_DRIVE);
    });
  });

  describe('CloudFileListResponse type', () => {
    it('should correctly type a file list response', () => {
      const response: CloudFileListResponse = {
        files: [
          {
            id: 'file-1',
            name: 'document1.txt',
            type: CloudFileType.FILE,
            path: '/document1.txt',
            provider: CloudProvider.DROPBOX,
          },
          {
            id: 'folder-1',
            name: 'My Folder',
            type: CloudFileType.FOLDER,
            path: '/My Folder',
            provider: CloudProvider.DROPBOX,
          },
        ],
        nextPageToken: 'next-page-token',
        hasMore: true,
      };

      expect(response.files).toHaveLength(2);
      expect(response.files[0].type).toBe(CloudFileType.FILE);
      expect(response.files[1].type).toBe(CloudFileType.FOLDER);
      expect(response.hasMore).toBe(true);
    });
  });

  describe('Provider-specific URL generation', () => {
    it('should include correct scopes for Google Drive', () => {
      const result = getOAuthUrl(
        CloudProvider.GOOGLE_DRIVE,
        'http://localhost:3000/callback',
        'test-state'
      );

      expect(result.url).toContain('drive.file');
      expect(result.url).toContain('drive.readonly');
    });

    it('should include offline access for Dropbox', () => {
      const result = getOAuthUrl(
        CloudProvider.DROPBOX,
        'http://localhost:3000/callback',
        'test-state'
      );

      expect(result.url).toContain('token_access_type=offline');
    });

    it('should include correct scopes for OneDrive', () => {
      const result = getOAuthUrl(
        CloudProvider.ONEDRIVE,
        'http://localhost:3000/callback',
        'test-state'
      );

      expect(result.url).toContain('files.readwrite.all');
      expect(result.url).toContain('offline_access');
    });
  });

  describe('Validation schemas', () => {
    it('should validate connect provider input', async () => {
      const { connectProviderSchema } = await import('./types');
      
      const validInput = {
        provider: CloudProvider.GOOGLE_DRIVE,
        code: 'auth-code-123',
        redirectUri: 'http://localhost:3000/callback',
      };

      const result = connectProviderSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid provider', async () => {
      const { connectProviderSchema } = await import('./types');
      
      const invalidInput = {
        provider: 'INVALID',
        code: 'auth-code-123',
        redirectUri: 'http://localhost:3000/callback',
      };

      const result = connectProviderSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should validate list files input', async () => {
      const { listFilesSchema } = await import('./types');
      
      const validInput = {
        provider: CloudProvider.DROPBOX,
        path: '/documents',
        pageSize: 50,
      };

      const result = listFilesSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate import file input', async () => {
      const { importFileSchema } = await import('./types');
      
      const validInput = {
        provider: CloudProvider.ONEDRIVE,
        fileId: 'file-123',
        projectId: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = importFileSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate export file input', async () => {
      const { exportFileSchema } = await import('./types');
      
      const validInput = {
        provider: CloudProvider.GOOGLE_DRIVE,
        documentId: 'doc-123',
        targetPath: '/exports',
        filename: 'my-document',
        format: 'txt',
      };

      const result = exportFileSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate configure sync input', async () => {
      const { configureSyncSchema } = await import('./types');
      
      const validInput = {
        provider: CloudProvider.DROPBOX,
        cloudFolderId: 'folder-123',
        autoSync: true,
        syncInterval: 60,
      };

      const result = configureSyncSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject sync interval out of range', async () => {
      const { configureSyncSchema } = await import('./types');
      
      const invalidInput = {
        provider: CloudProvider.DROPBOX,
        cloudFolderId: 'folder-123',
        autoSync: true,
        syncInterval: 2, // Less than minimum of 5
      };

      const result = configureSyncSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });
});
