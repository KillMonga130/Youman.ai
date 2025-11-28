/**
 * Search Service
 * Implements full-text search across projects with advanced filtering
 * 
 * Requirements: 61 - Advanced search and filtering
 */

import { prisma } from '../database/prisma';
import { logger } from '../utils/logger';
import type {
  SearchQuery,
  SearchFilters,
  SearchResults,
  SearchResultItem,
  SearchHighlight,
  SavedSearchInput,
  UpdateSavedSearchInput,
  SavedSearch,
  SavedSearchesResponse,
} from './types';

// ============================================
// Error Classes
// ============================================

export class SearchError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'SearchError';
    this.code = code;
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Generate search highlights for matched text
 */
function generateHighlights(
  text: string,
  query: string,
  field: string
): SearchHighlight | null {
  if (!text || !query) return null;

  const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 0);
  const lowerText = text.toLowerCase();
  const matchedTerms: string[] = [];

  for (const term of terms) {
    if (lowerText.includes(term)) {
      matchedTerms.push(term);
    }
  }

  if (matchedTerms.length === 0) return null;

  // Create snippet with context around first match
  const firstMatch = matchedTerms[0];
  const matchIndex = lowerText.indexOf(firstMatch);
  const snippetStart = Math.max(0, matchIndex - 50);
  const snippetEnd = Math.min(text.length, matchIndex + firstMatch.length + 50);
  
  let snippet = text.substring(snippetStart, snippetEnd);
  if (snippetStart > 0) snippet = '...' + snippet;
  if (snippetEnd < text.length) snippet = snippet + '...';

  // Highlight matched terms in snippet
  for (const term of matchedTerms) {
    const regex = new RegExp(`(${escapeRegex(term)})`, 'gi');
    snippet = snippet.replace(regex, '<mark>$1</mark>');
  }

  return {
    field,
    snippet,
    matchedTerms,
  };
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Calculate relevance score for a result
 */
function calculateRelevanceScore(
  project: { name: string; description: string | null },
  query: string
): number {
  const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 0);
  let score = 0;

  const nameLower = project.name.toLowerCase();
  const descLower = (project.description || '').toLowerCase();

  for (const term of terms) {
    // Name matches are weighted higher
    if (nameLower.includes(term)) {
      score += 10;
      // Exact match bonus
      if (nameLower === term) score += 5;
      // Starts with bonus
      if (nameLower.startsWith(term)) score += 3;
    }
    // Description matches
    if (descLower.includes(term)) {
      score += 5;
    }
  }

  return score;
}

// ============================================
// Search Operations
// ============================================

/**
 * Search projects with full-text search and filters
 * Requirements: 61 - Full-text search across projects
 */
export async function searchProjects(
  userId: string,
  input: SearchQuery
): Promise<SearchResults> {
  const startTime = Date.now();
  const { query, filters, page, limit, sortBy, sortOrder } = input;
  const skip = (page - 1) * limit;

  // Build where clause
  const whereClause: Record<string, unknown> = {
    deletedAt: null,
    OR: [
      { ownerId: userId },
      { collaborators: { some: { userId } } },
    ],
  };

  // Full-text search on name and description
  if (query) {
    whereClause.AND = [
      {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
    ];
  }

  // Apply filters
  if (filters) {
    applyFilters(whereClause, filters);
  }

  // Build order by clause
  const orderBy: Record<string, 'asc' | 'desc'>[] = [];
  if (sortBy === 'relevance') {
    // For relevance, we'll sort in memory after fetching
    orderBy.push({ updatedAt: 'desc' });
  } else {
    orderBy.push({ [sortBy]: sortOrder });
  }

  // Execute queries
  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where: whereClause,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        wordCount: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.project.count({ where: whereClause }),
  ]);

  // Transform results with highlights and scores
  let results: SearchResultItem[] = projects.map(project => {
    const highlights: SearchHighlight[] = [];
    
    if (query) {
      const nameHighlight = generateHighlights(project.name, query, 'name');
      if (nameHighlight) highlights.push(nameHighlight);
      
      if (project.description) {
        const descHighlight = generateHighlights(project.description, query, 'description');
        if (descHighlight) highlights.push(descHighlight);
      }
    }

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      wordCount: project.wordCount,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      highlights,
      score: query ? calculateRelevanceScore(project, query) : 0,
    };
  });

  // Sort by relevance if requested
  if (sortBy === 'relevance' && query) {
    results = results.sort((a, b) => 
      sortOrder === 'desc' ? b.score - a.score : a.score - b.score
    );
  }

  const executionTimeMs = Date.now() - startTime;
  const totalPages = Math.ceil(total / limit);

  logger.info('Search executed', { userId, query, total, executionTimeMs });

  return {
    results,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
    query,
    filters: filters || {},
    executionTimeMs,
  };
}

/**
 * Apply search filters to where clause
 */
function applyFilters(whereClause: Record<string, unknown>, filters: SearchFilters): void {
  // Date range filter
  if (filters.dateRange) {
    const dateFilter: Record<string, Date> = {};
    if (filters.dateRange.from) {
      dateFilter.gte = new Date(filters.dateRange.from);
    }
    if (filters.dateRange.to) {
      dateFilter.lte = new Date(filters.dateRange.to);
    }
    if (Object.keys(dateFilter).length > 0) {
      whereClause.createdAt = dateFilter;
    }
  }

  // Word count range filter
  if (filters.wordCountRange) {
    const wordCountFilter: Record<string, number> = {};
    if (filters.wordCountRange.min !== undefined) {
      wordCountFilter.gte = filters.wordCountRange.min;
    }
    if (filters.wordCountRange.max !== undefined) {
      wordCountFilter.lte = filters.wordCountRange.max;
    }
    if (Object.keys(wordCountFilter).length > 0) {
      whereClause.wordCount = wordCountFilter;
    }
  }

  // Status filter
  if (filters.status && filters.status.length > 0) {
    whereClause.status = { in: filters.status };
  }
}

// ============================================
// Saved Search Operations
// ============================================

/**
 * Save a search for later use
 * Requirements: 61 - Saved searches
 */
export async function saveSearch(
  userId: string,
  input: SavedSearchInput
): Promise<SavedSearch> {
  const savedSearch = await prisma.savedSearch.create({
    data: {
      name: input.name,
      query: input.query || null,
      filters: input.filters ? JSON.parse(JSON.stringify(input.filters)) : {},
      userId,
      useCount: 0,
    },
  });

  logger.info('Search saved', { userId, searchId: savedSearch.id });

  return {
    id: savedSearch.id,
    name: savedSearch.name,
    query: savedSearch.query,
    filters: savedSearch.filters as SearchFilters,
    userId: savedSearch.userId,
    createdAt: savedSearch.createdAt,
    updatedAt: savedSearch.updatedAt,
    lastUsedAt: savedSearch.lastUsedAt,
    useCount: savedSearch.useCount,
  };
}

/**
 * Get all saved searches for a user
 */
export async function getSavedSearches(userId: string): Promise<SavedSearchesResponse> {
  const savedSearches = await prisma.savedSearch.findMany({
    where: { userId },
    orderBy: { lastUsedAt: 'desc' },
  });

  return {
    savedSearches: savedSearches.map(s => ({
      id: s.id,
      name: s.name,
      query: s.query,
      filters: s.filters as SearchFilters,
      userId: s.userId,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      lastUsedAt: s.lastUsedAt,
      useCount: s.useCount,
    })),
    total: savedSearches.length,
  };
}

/**
 * Get a saved search by ID
 */
export async function getSavedSearch(
  searchId: string,
  userId: string
): Promise<SavedSearch> {
  const savedSearch = await prisma.savedSearch.findUnique({
    where: { id: searchId },
  });

  if (!savedSearch) {
    throw new SearchError('Saved search not found', 'SEARCH_NOT_FOUND');
  }

  if (savedSearch.userId !== userId) {
    throw new SearchError('Access denied', 'ACCESS_DENIED');
  }

  return {
    id: savedSearch.id,
    name: savedSearch.name,
    query: savedSearch.query,
    filters: savedSearch.filters as SearchFilters,
    userId: savedSearch.userId,
    createdAt: savedSearch.createdAt,
    updatedAt: savedSearch.updatedAt,
    lastUsedAt: savedSearch.lastUsedAt,
    useCount: savedSearch.useCount,
  };
}

/**
 * Update a saved search
 */
export async function updateSavedSearch(
  searchId: string,
  userId: string,
  input: UpdateSavedSearchInput
): Promise<SavedSearch> {
  const existing = await prisma.savedSearch.findUnique({
    where: { id: searchId },
  });

  if (!existing) {
    throw new SearchError('Saved search not found', 'SEARCH_NOT_FOUND');
  }

  if (existing.userId !== userId) {
    throw new SearchError('Access denied', 'ACCESS_DENIED');
  }

  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.query !== undefined) updateData.query = input.query;
  if (input.filters !== undefined) updateData.filters = input.filters;

  const savedSearch = await prisma.savedSearch.update({
    where: { id: searchId },
    data: updateData,
  });

  logger.info('Saved search updated', { userId, searchId });

  return {
    id: savedSearch.id,
    name: savedSearch.name,
    query: savedSearch.query,
    filters: savedSearch.filters as SearchFilters,
    userId: savedSearch.userId,
    createdAt: savedSearch.createdAt,
    updatedAt: savedSearch.updatedAt,
    lastUsedAt: savedSearch.lastUsedAt,
    useCount: savedSearch.useCount,
  };
}

/**
 * Delete a saved search
 */
export async function deleteSavedSearch(
  searchId: string,
  userId: string
): Promise<{ message: string }> {
  const existing = await prisma.savedSearch.findUnique({
    where: { id: searchId },
  });

  if (!existing) {
    throw new SearchError('Saved search not found', 'SEARCH_NOT_FOUND');
  }

  if (existing.userId !== userId) {
    throw new SearchError('Access denied', 'ACCESS_DENIED');
  }

  await prisma.savedSearch.delete({
    where: { id: searchId },
  });

  logger.info('Saved search deleted', { userId, searchId });

  return { message: 'Saved search deleted successfully' };
}

/**
 * Execute a saved search and update usage stats
 */
export async function executeSavedSearch(
  searchId: string,
  userId: string,
  pagination?: { page?: number; limit?: number }
): Promise<SearchResults> {
  const savedSearch = await getSavedSearch(searchId, userId);

  // Update usage stats
  await prisma.savedSearch.update({
    where: { id: searchId },
    data: {
      lastUsedAt: new Date(),
      useCount: { increment: 1 },
    },
  });

  // Execute the search
  return searchProjects(userId, {
    query: savedSearch.query || '',
    filters: savedSearch.filters,
    page: pagination?.page || 1,
    limit: pagination?.limit || 20,
    sortBy: 'relevance',
    sortOrder: 'desc',
  });
}
