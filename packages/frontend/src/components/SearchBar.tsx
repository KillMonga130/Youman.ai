/**
 * SearchBar Component
 * Full-text search input with autocomplete and saved searches
 * Requirements: 61 - Advanced search and filtering
 */

import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { Search, X, Clock, Star, Loader2 } from 'lucide-react';
import { useSearch, type SavedSearch } from '../context/SearchContext';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onSavedSearchSelect?: (savedSearch: SavedSearch) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({
  onSearch,
  onSavedSearchSelect,
  placeholder = 'Search projects...',
  className = '',
}: SearchBarProps): JSX.Element {
  const { query, setQuery, savedSearches, isSearching } = useSearch();
  const [isFocused, setIsFocused] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    setShowDropdown(true);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim()) {
      onSearch(query.trim());
      setShowDropdown(false);
    }
    if (e.key === 'Escape') {
      setShowDropdown(false);
      inputRef.current?.blur();
    }
  };

  const handleClear = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  const handleSavedSearchClick = (savedSearch: SavedSearch) => {
    setQuery(savedSearch.query || '');
    setShowDropdown(false);
    onSavedSearchSelect?.(savedSearch);
  };

  const recentSearches = savedSearches
    .filter(s => s.lastUsedAt)
    .sort((a, b) => new Date(b.lastUsedAt!).getTime() - new Date(a.lastUsedAt!).getTime())
    .slice(0, 5);

  const popularSearches = savedSearches
    .sort((a, b) => b.useCount - a.useCount)
    .slice(0, 5);

  return (
    <div className={`relative ${className}`}>
      <div
        className={`
          relative flex items-center
          bg-white dark:bg-gray-800
          border rounded-lg
          transition-all duration-200
          ${isFocused 
            ? 'border-primary-500 ring-2 ring-primary-500/20' 
            : 'border-gray-300 dark:border-gray-600'
          }
        `}
      >
        <span className="pl-3 text-gray-400">
          {isSearching ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Search className="w-5 h-5" />
          )}
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            setIsFocused(true);
            setShowDropdown(true);
          }}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="
            flex-1 px-3 py-2.5
            bg-transparent
            text-gray-900 dark:text-white
            placeholder-gray-400 dark:placeholder-gray-500
            focus:outline-none
            min-w-0
          "
          aria-label="Search"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
        />
        {query && (
          <button
            onClick={handleClear}
            className="
              p-2 mr-1
              text-gray-400 hover:text-gray-600
              dark:hover:text-gray-300
              rounded-md
              transition-colors
            "
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (recentSearches.length > 0 || popularSearches.length > 0) && (
        <div
          ref={dropdownRef}
          className="
            absolute top-full left-0 right-0 mt-1
            bg-white dark:bg-gray-800
            border border-gray-200 dark:border-gray-700
            rounded-lg shadow-lg
            z-50
            max-h-80 overflow-y-auto
          "
          role="listbox"
        >
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div className="p-2">
              <div className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Recent Searches
              </div>
              {recentSearches.map((search) => (
                <button
                  key={search.id}
                  onClick={() => handleSavedSearchClick(search)}
                  className="
                    w-full flex items-center gap-2 px-2 py-2
                    text-left text-sm
                    text-gray-700 dark:text-gray-300
                    hover:bg-gray-100 dark:hover:bg-gray-700
                    rounded-md
                    transition-colors
                  "
                  role="option"
                >
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="flex-1 truncate">{search.name}</span>
                  {search.query && (
                    <span className="text-xs text-gray-400 truncate max-w-[100px]">
                      {search.query}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Popular Searches */}
          {popularSearches.length > 0 && recentSearches.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700" />
          )}
          {popularSearches.length > 0 && (
            <div className="p-2">
              <div className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Popular Searches
              </div>
              {popularSearches.map((search) => (
                <button
                  key={search.id}
                  onClick={() => handleSavedSearchClick(search)}
                  className="
                    w-full flex items-center gap-2 px-2 py-2
                    text-left text-sm
                    text-gray-700 dark:text-gray-300
                    hover:bg-gray-100 dark:hover:bg-gray-700
                    rounded-md
                    transition-colors
                  "
                  role="option"
                >
                  <Star className="w-4 h-4 text-amber-400" />
                  <span className="flex-1 truncate">{search.name}</span>
                  <span className="text-xs text-gray-400">
                    {search.useCount} uses
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
