/**
 * Search Context
 * Provides search state and functionality across the application
 * Requirements: 61 - Advanced search and filtering
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

// ============================================
// Types
// ============================================

export interface DateRange {
  from?: string;
  to?: string;
}

export interface NumberRange {
  min?: number;
  max?: number;
}

export interface SearchFilters {
  dateRange?: DateRange;
  wordCountRange?: NumberRange;
  humanizationLevel?: number[];
  strategy?: ('auto' | 'casual' | 'professional' | 'academic')[];
  status?: string[];
  tags?: string[];
}

export interface SearchHighlight {
  field: string;
  snippet: string;
  matchedTerms: string[];
}

export interface SearchResultItem {
  id: string;
  name: string;
  description: string | null;
  status: string;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
  highlights: SearchHighlight[];
  score: number;
}

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

export interface SavedSearch {
  id: string;
  name: string;
  query: string | null;
  filters: SearchFilters;
  useCount: number;
  lastUsedAt: string | null;
  createdAt: string;
}

export type SortBy = 'relevance' | 'name' | 'createdAt' | 'updatedAt' | 'wordCount';
export type SortOrder = 'asc' | 'desc';

interface SearchContextValue {
  // Search state
  query: string;
  setQuery: (query: string) => void;
  filters: SearchFilters;
  setFilters: (filters: SearchFilters) => void;
  sortBy: SortBy;
  setSortBy: (sortBy: SortBy) => void;
  sortOrder: SortOrder;
  setSortOrder: (sortOrder: SortOrder) => void;
  
  // Results
  results: SearchResults | null;
  setResults: (results: SearchResults | null) => void;
  isSearching: boolean;
  setIsSearching: (isSearching: boolean) => void;
  
  // Saved searches
  savedSearches: SavedSearch[];
  setSavedSearches: (searches: SavedSearch[]) => void;
  
  // Actions
  clearSearch: () => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
}

// ============================================
// Context
// ============================================

const SearchContext = createContext<SearchContextValue | null>(null);

// ============================================
// Provider
// ============================================

interface SearchProviderProps {
  children: ReactNode;
}

export function SearchProvider({ children }: SearchProviderProps): JSX.Element {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [sortBy, setSortBy] = useState<SortBy>('relevance');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults(null);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const hasActiveFilters = Boolean(
    filters.dateRange?.from ||
    filters.dateRange?.to ||
    filters.wordCountRange?.min !== undefined ||
    filters.wordCountRange?.max !== undefined ||
    (filters.humanizationLevel && filters.humanizationLevel.length > 0) ||
    (filters.strategy && filters.strategy.length > 0) ||
    (filters.status && filters.status.length > 0) ||
    (filters.tags && filters.tags.length > 0)
  );

  const value: SearchContextValue = {
    query,
    setQuery,
    filters,
    setFilters,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    results,
    setResults,
    isSearching,
    setIsSearching,
    savedSearches,
    setSavedSearches,
    clearSearch,
    clearFilters,
    hasActiveFilters,
  };

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

export function useSearch(): SearchContextValue {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}
