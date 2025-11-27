/**
 * Search types and validation schemas
 * Requirements: 61 - Advanced search and filtering
 */

import { z } from 'zod';

// ============================================
// Validation Schemas
// ============================================

/**
 * Date range schema
 */
export const dateRangeSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

/**
 * Number range schema
 */
export const numberRangeSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
});

/**
 * Search filters schema
 */
export const searchFiltersSchema = z.object({
  dateRange: dateRangeSchema.optional(),
  wordCountRange: numberRangeSchema.optional(),
  humanizationLevel: z.array(z.number().min(1).max(5)).optional(),
  strategy: z.array(z.enum(['auto', 'casual', 'professional', 'academic'])).optional(),
  status: z.array(z.enum(['draft', 'processing', 'completed', 'ACTIVE', 'ARCHIVED'])).optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * Search query schema
 */
export const searchQuerySchema = z.object({
  query: z.string().min(1, 'Search query is required').max(500, 'Query too long'),
  filters: searchFiltersSchema.optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(['relevance', 'name', 'createdAt', 'updatedAt', 'wordCount']).default('relevance'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Saved search schema
 */
export const savedSearchSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  query: z.string().optional(),
  filters: searchFiltersSchema,
});

/**
 * Update saved search schema
 */
export const updateSavedSearchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  query: z.string().optional(),
  filters: searchFiltersSchema.optional(),
});

// ============================================
// Types derived from schemas
// ============================================

export type DateRange = z.infer<typeof dateRangeSchema>;
export type NumberRange = z.infer<typeof numberRangeSchema>;
export type SearchFilters = z.infer<typeof searchFiltersSchema>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type SavedSearchInput = z.infer<typeof savedSearchSchema>;
export type UpdateSavedSearchInput = z.infer<typeof updateSavedSearchSchema>;

// ============================================
// Response Types
// ============================================

/**
 * Search result item with highlighting
 */
export interface SearchResultItem {
  id: string;
  name: string;
  description: string | null;
  status: string;
  wordCount: number;
  createdAt: Date;
  updatedAt: Date;
  highlights: SearchHighlight[];
  score: number;
}

/**
 * Search highlight for matched text
 */
export interface SearchHighlight {
  field: string;
  snippet: string;
  matchedTerms: string[];
}

/**
 * Search results response
 */
export interface SearchResults {
  results: SearchResultItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  query: string;
  filters: SearchFilters;
  executionTimeMs: number;
}

/**
 * Saved search response
 */
export interface SavedSearch {
  id: string;
  name: string;
  query: string | null;
  filters: SearchFilters;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt: Date | null;
  useCount: number;
}

/**
 * Saved searches list response
 */
export interface SavedSearchesResponse {
  savedSearches: SavedSearch[];
  total: number;
}
