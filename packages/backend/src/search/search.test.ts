/**
 * Search Service Tests
 * Requirements: 61 - Advanced search and filtering
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  searchProjects,
  saveSearch,
  getSavedSearches,
  getSavedSearch,
  updateSavedSearch,
  deleteSavedSearch,
  executeSavedSearch,
  SearchError,
} from './search.service';

// Mock Prisma
vi.mock('../database/prisma', () => ({
  prisma: {
    project: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    savedSearch: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { prisma } from '../database/prisma';

describe('Search Service', () => {
  const mockUserId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchProjects', () => {
    it('should search projects with query', async () => {
      const mockProjects = [
        {
          id: 'project-1',
          name: 'Test Project',
          description: 'A test project description',
          status: 'ACTIVE',
          wordCount: 1000,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.project.findMany).mockResolvedValue(mockProjects as never);
      vi.mocked(prisma.project.count).mockResolvedValue(1);

      const result = await searchProjects(mockUserId, {
        query: 'test',
        page: 1,
        limit: 20,
        sortBy: 'relevance',
        sortOrder: 'desc',
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].name).toBe('Test Project');
      expect(result.pagination.total).toBe(1);
      expect(result.query).toBe('test');
    });

    it('should apply date range filter', async () => {
      vi.mocked(prisma.project.findMany).mockResolvedValue([]);
      vi.mocked(prisma.project.count).mockResolvedValue(0);

      await searchProjects(mockUserId, {
        query: 'test',
        filters: {
          dateRange: {
            from: '2024-01-01T00:00:00Z',
            to: '2024-12-31T23:59:59Z',
          },
        },
        page: 1,
        limit: 20,
        sortBy: 'relevance',
        sortOrder: 'desc',
      });

      expect(prisma.project.findMany).toHaveBeenCalled();
    });

    it('should apply word count range filter', async () => {
      vi.mocked(prisma.project.findMany).mockResolvedValue([]);
      vi.mocked(prisma.project.count).mockResolvedValue(0);

      await searchProjects(mockUserId, {
        query: 'test',
        filters: {
          wordCountRange: {
            min: 100,
            max: 5000,
          },
        },
        page: 1,
        limit: 20,
        sortBy: 'relevance',
        sortOrder: 'desc',
      });

      expect(prisma.project.findMany).toHaveBeenCalled();
    });

    it('should apply status filter', async () => {
      vi.mocked(prisma.project.findMany).mockResolvedValue([]);
      vi.mocked(prisma.project.count).mockResolvedValue(0);

      await searchProjects(mockUserId, {
        query: 'test',
        filters: {
          status: ['ACTIVE', 'ARCHIVED'],
        },
        page: 1,
        limit: 20,
        sortBy: 'relevance',
        sortOrder: 'desc',
      });

      expect(prisma.project.findMany).toHaveBeenCalled();
    });

    it('should generate highlights for matched text', async () => {
      const mockProjects = [
        {
          id: 'project-1',
          name: 'Test Project',
          description: 'This is a test description',
          status: 'ACTIVE',
          wordCount: 1000,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.project.findMany).mockResolvedValue(mockProjects as never);
      vi.mocked(prisma.project.count).mockResolvedValue(1);

      const result = await searchProjects(mockUserId, {
        query: 'test',
        page: 1,
        limit: 20,
        sortBy: 'relevance',
        sortOrder: 'desc',
      });

      expect(result.results[0].highlights.length).toBeGreaterThan(0);
      expect(result.results[0].highlights[0].matchedTerms).toContain('test');
    });

    it('should sort by relevance score', async () => {
      const mockProjects = [
        {
          id: 'project-1',
          name: 'Other Project',
          description: 'Contains test word',
          status: 'ACTIVE',
          wordCount: 1000,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'project-2',
          name: 'Test Project',
          description: 'Another description',
          status: 'ACTIVE',
          wordCount: 2000,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.project.findMany).mockResolvedValue(mockProjects as never);
      vi.mocked(prisma.project.count).mockResolvedValue(2);

      const result = await searchProjects(mockUserId, {
        query: 'test',
        page: 1,
        limit: 20,
        sortBy: 'relevance',
        sortOrder: 'desc',
      });

      // Project with 'test' in name should have higher score
      expect(result.results[0].name).toBe('Test Project');
    });
  });

  describe('saveSearch', () => {
    it('should save a search', async () => {
      const mockSavedSearch = {
        id: 'search-1',
        name: 'My Search',
        query: 'test query',
        filters: { status: ['ACTIVE'] },
        userId: mockUserId,
        useCount: 0,
        lastUsedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.savedSearch.create).mockResolvedValue(mockSavedSearch as never);

      const result = await saveSearch(mockUserId, {
        name: 'My Search',
        query: 'test query',
        filters: { status: ['ACTIVE'] },
      });

      expect(result.name).toBe('My Search');
      expect(result.query).toBe('test query');
      expect(prisma.savedSearch.create).toHaveBeenCalled();
    });
  });

  describe('getSavedSearches', () => {
    it('should get all saved searches for a user', async () => {
      const mockSavedSearches = [
        {
          id: 'search-1',
          name: 'Search 1',
          query: 'query 1',
          filters: {},
          userId: mockUserId,
          useCount: 5,
          lastUsedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'search-2',
          name: 'Search 2',
          query: 'query 2',
          filters: {},
          userId: mockUserId,
          useCount: 3,
          lastUsedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.savedSearch.findMany).mockResolvedValue(mockSavedSearches as never);

      const result = await getSavedSearches(mockUserId);

      expect(result.savedSearches).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });

  describe('getSavedSearch', () => {
    it('should get a saved search by ID', async () => {
      const mockSavedSearch = {
        id: 'search-1',
        name: 'My Search',
        query: 'test query',
        filters: {},
        userId: mockUserId,
        useCount: 0,
        lastUsedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.savedSearch.findUnique).mockResolvedValue(mockSavedSearch as never);

      const result = await getSavedSearch('search-1', mockUserId);

      expect(result.id).toBe('search-1');
      expect(result.name).toBe('My Search');
    });

    it('should throw error if search not found', async () => {
      vi.mocked(prisma.savedSearch.findUnique).mockResolvedValue(null);

      await expect(getSavedSearch('nonexistent', mockUserId)).rejects.toThrow(SearchError);
    });

    it('should throw error if user does not own the search', async () => {
      const mockSavedSearch = {
        id: 'search-1',
        name: 'My Search',
        query: 'test query',
        filters: {},
        userId: 'other-user',
        useCount: 0,
        lastUsedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.savedSearch.findUnique).mockResolvedValue(mockSavedSearch as never);

      await expect(getSavedSearch('search-1', mockUserId)).rejects.toThrow(SearchError);
    });
  });

  describe('updateSavedSearch', () => {
    it('should update a saved search', async () => {
      const existingSearch = {
        id: 'search-1',
        name: 'Old Name',
        query: 'old query',
        filters: {},
        userId: mockUserId,
        useCount: 0,
        lastUsedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedSearch = {
        ...existingSearch,
        name: 'New Name',
      };

      vi.mocked(prisma.savedSearch.findUnique).mockResolvedValue(existingSearch as never);
      vi.mocked(prisma.savedSearch.update).mockResolvedValue(updatedSearch as never);

      const result = await updateSavedSearch('search-1', mockUserId, { name: 'New Name' });

      expect(result.name).toBe('New Name');
    });
  });

  describe('deleteSavedSearch', () => {
    it('should delete a saved search', async () => {
      const mockSavedSearch = {
        id: 'search-1',
        name: 'My Search',
        query: 'test query',
        filters: {},
        userId: mockUserId,
        useCount: 0,
        lastUsedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.savedSearch.findUnique).mockResolvedValue(mockSavedSearch as never);
      vi.mocked(prisma.savedSearch.delete).mockResolvedValue(mockSavedSearch as never);

      const result = await deleteSavedSearch('search-1', mockUserId);

      expect(result.message).toBe('Saved search deleted successfully');
    });
  });

  describe('executeSavedSearch', () => {
    it('should execute a saved search and update usage stats', async () => {
      const mockSavedSearch = {
        id: 'search-1',
        name: 'My Search',
        query: 'test query',
        filters: {},
        userId: mockUserId,
        useCount: 5,
        lastUsedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.savedSearch.findUnique).mockResolvedValue(mockSavedSearch as never);
      vi.mocked(prisma.savedSearch.update).mockResolvedValue({
        ...mockSavedSearch,
        useCount: 6,
        lastUsedAt: new Date(),
      } as never);
      vi.mocked(prisma.project.findMany).mockResolvedValue([]);
      vi.mocked(prisma.project.count).mockResolvedValue(0);

      const result = await executeSavedSearch('search-1', mockUserId);

      expect(result.query).toBe('test query');
      expect(prisma.savedSearch.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'search-1' },
          data: expect.objectContaining({
            useCount: { increment: 1 },
          }),
        })
      );
    });
  });
});
