/**
 * Search Page
 * Full-text search with advanced filtering and saved searches
 * Requirements: 61 - Advanced search and filtering
 */

import { useState, useCallback, useEffect } from 'react';
import { Search as SearchIcon, SlidersHorizontal, X } from 'lucide-react';
import { SearchProvider, useSearch, type SavedSearch, type SearchFilters } from '../context/SearchContext';
import { SearchBar } from '../components/SearchBar';
import { SearchFilters as SearchFiltersPanel } from '../components/SearchFilters';
import { SearchResults } from '../components/SearchResults';
import { SavedSearches } from '../components/SavedSearches';
import { Button } from '../components/ui/Button';

// Mock API functions - replace with actual API calls
async function searchProjectsApi(params: {
  query: string;
  filters: SearchFilters;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: string;
}) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Mock response
  return {
    results: [
      {
        id: '1',
        name: 'Blog Post Draft',
        description: 'A comprehensive guide to AI content creation',
        status: 'ACTIVE',
        wordCount: 1250,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        highlights: params.query ? [
          {
            field: 'name',
            snippet: `Blog Post <mark>${params.query}</mark>`,
            matchedTerms: [params.query],
          },
        ] : [],
        score: 10,
      },
      {
        id: '2',
        name: 'Research Paper',
        description: 'Academic research on natural language processing',
        status: 'completed',
        wordCount: 5420,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
        highlights: [],
        score: 5,
      },
    ],
    pagination: {
      page: params.page,
      limit: params.limit,
      total: 2,
      totalPages: 1,
      hasMore: false,
    },
    query: params.query,
    filters: params.filters,
    executionTimeMs: 45,
  };
}

async function getSavedSearchesApi() {
  await new Promise(resolve => setTimeout(resolve, 200));
  return {
    savedSearches: [
      {
        id: '1',
        name: 'Active Projects',
        query: '',
        filters: { status: ['ACTIVE'] },
        useCount: 5,
        lastUsedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        name: 'Large Documents',
        query: '',
        filters: { wordCountRange: { min: 5000 } },
        useCount: 3,
        lastUsedAt: new Date(Date.now() - 86400000).toISOString(),
        createdAt: new Date().toISOString(),
      },
    ],
    total: 2,
  };
}

async function saveSearchApi(name: string, query: string, filters: SearchFilters) {
  await new Promise(resolve => setTimeout(resolve, 300));
  return {
    id: Date.now().toString(),
    name,
    query,
    filters,
    useCount: 0,
    lastUsedAt: null,
    createdAt: new Date().toISOString(),
  };
}

async function deleteSavedSearchApi(_id: string) {
  await new Promise(resolve => setTimeout(resolve, 200));
}

async function updateSavedSearchApi(_id: string, _name: string) {
  await new Promise(resolve => setTimeout(resolve, 200));
}

function SearchPageContent(): JSX.Element {
  const {
    query,
    setQuery,
    filters,
    setFilters,
    sortBy,
    sortOrder,
    results,
    setResults,
    setIsSearching,
    savedSearches,
    setSavedSearches,
    hasActiveFilters,
  } = useSearch();

  const [showFilters, setShowFilters] = useState(false);

  // Load saved searches on mount
  useEffect(() => {
    getSavedSearchesApi().then(data => {
      setSavedSearches(data.savedSearches);
    });
  }, [setSavedSearches]);

  // Perform search
  const performSearch = useCallback(async (searchQuery: string, page = 1) => {
    setIsSearching(true);
    
    try {
      const data = await searchProjectsApi({
        query: searchQuery,
        filters,
        page,
        limit: 20,
        sortBy,
        sortOrder,
      });
      setResults(data);
    } finally {
      setIsSearching(false);
    }
  }, [filters, sortBy, sortOrder, setIsSearching, setResults]);

  // Handle search from search bar
  const handleSearch = useCallback((searchQuery: string) => {
    performSearch(searchQuery, 1);
  }, [performSearch]);

  // Handle filter apply
  const handleApplyFilters = useCallback(() => {
    performSearch(query, 1);
    setShowFilters(false);
  }, [query, performSearch]);

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    performSearch(query, page);
  }, [query, performSearch]);

  // Handle saved search selection
  const handleSavedSearchSelect = useCallback((savedSearch: SavedSearch) => {
    setQuery(savedSearch.query || '');
    setFilters(savedSearch.filters);
    performSearch(savedSearch.query || '', 1);
  }, [setQuery, setFilters, performSearch]);

  // Handle save search
  const handleSaveSearch = useCallback(async (name: string, searchQuery: string, searchFilters: SearchFilters) => {
    const newSearch = await saveSearchApi(name, searchQuery, searchFilters);
    setSavedSearches([newSearch, ...savedSearches]);
  }, [savedSearches, setSavedSearches]);

  // Handle delete saved search
  const handleDeleteSavedSearch = useCallback(async (id: string) => {
    await deleteSavedSearchApi(id);
    setSavedSearches(savedSearches.filter(s => s.id !== id));
  }, [savedSearches, setSavedSearches]);

  // Handle update saved search
  const handleUpdateSavedSearch = useCallback(async (id: string, name: string) => {
    await updateSavedSearchApi(id, name);
    setSavedSearches(savedSearches.map(s => s.id === id ? { ...s, name } : s));
  }, [savedSearches, setSavedSearches]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Search</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Find projects by name, content, or filters
        </p>
      </div>

      {/* Search Bar and Filter Toggle */}
      <div className="flex gap-3">
        <SearchBar
          onSearch={handleSearch}
          onSavedSearchSelect={handleSavedSearchSelect}
          className="flex-1"
        />
        <Button
          variant={hasActiveFilters ? 'primary' : 'outline'}
          onClick={() => setShowFilters(!showFilters)}
          leftIcon={<SlidersHorizontal className="w-4 h-4" />}
        >
          Filters
          {hasActiveFilters && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-white/20 rounded">
              Active
            </span>
          )}
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex gap-6">
        {/* Left Sidebar - Filters & Saved Searches */}
        <div className={`
          ${showFilters ? 'block' : 'hidden lg:block'}
          w-full lg:w-80 flex-shrink-0 space-y-4
        `}>
          {/* Mobile Close Button */}
          <div className="lg:hidden flex justify-end">
            <button
              onClick={() => setShowFilters(false)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <SearchFiltersPanel onApply={handleApplyFilters} />
          
          <SavedSearches
            onExecute={handleSavedSearchSelect}
            onSave={handleSaveSearch}
            onDelete={handleDeleteSavedSearch}
            onUpdate={handleUpdateSavedSearch}
          />
        </div>

        {/* Results */}
        <div className={`flex-1 ${showFilters ? 'hidden lg:block' : 'block'}`}>
          {results ? (
            <SearchResults onPageChange={handlePageChange} />
          ) : (
            <div className="card p-12 text-center">
              <SearchIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h2 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search your projects
              </h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                Enter a search term or use filters to find projects. 
                You can also use saved searches for quick access.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function Search(): JSX.Element {
  return (
    <SearchProvider>
      <SearchPageContent />
    </SearchProvider>
  );
}
