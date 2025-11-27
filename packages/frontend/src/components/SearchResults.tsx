/**
 * SearchResults Component
 * Displays search results with highlighting and sorting
 * Requirements: 61 - Advanced search and filtering
 */

import { Link } from 'react-router-dom';
import { FileText, Clock, Edit, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSearch, type SearchResultItem, type SortBy, type SortOrder } from '../context/SearchContext';
import { Badge } from './ui/Badge';
import { Select } from './ui/Select';
import { Button } from './ui/Button';

interface SearchResultsProps {
  onPageChange: (page: number) => void;
  className?: string;
}

export function SearchResults({ onPageChange, className = '' }: SearchResultsProps): JSX.Element {
  const { results, sortBy, setSortBy, sortOrder, setSortOrder, isSearching } = useSearch();

  if (!results) {
    return <div className={className} />;
  }

  const { results: items, pagination, executionTimeMs } = results;

  const sortOptions = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'name', label: 'Name' },
    { value: 'createdAt', label: 'Date Created' },
    { value: 'updatedAt', label: 'Date Updated' },
    { value: 'wordCount', label: 'Word Count' },
  ];

  const handleSortChange = (value: string) => {
    setSortBy(value as SortBy);
  };

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className={className}>
      {/* Results Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {pagination.total} result{pagination.total !== 1 ? 's' : ''} found
          <span className="ml-2 text-gray-400">
            ({executionTimeMs}ms)
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Sort by:</span>
          <Select
            options={sortOptions}
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            fullWidth={false}
            className="w-40"
          />
          <button
            onClick={toggleSortOrder}
            className="
              p-2 rounded-lg
              text-gray-500 hover:text-gray-700
              dark:text-gray-400 dark:hover:text-gray-200
              hover:bg-gray-100 dark:hover:bg-gray-700
              transition-colors
            "
            title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          >
            <ArrowUpDown className={`w-4 h-4 ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Results List */}
      {isSearching ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-3" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card p-8 text-center">
          <FileText className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No results found</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Try adjusting your search or filters
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <SearchResultCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Page {pagination.page} of {pagination.totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              leftIcon={<ChevronLeft className="w-4 h-4" />}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={!pagination.hasMore}
              rightIcon={<ChevronRight className="w-4 h-4" />}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Search Result Card
// ============================================

interface SearchResultCardProps {
  item: SearchResultItem;
}

function SearchResultCard({ item }: SearchResultCardProps): JSX.Element {
  const statusVariant = getStatusVariant(item.status);

  return (
    <Link
      to={`/editor/${item.id}`}
      className="
        card p-4 block
        hover:border-primary-300 dark:hover:border-primary-700
        transition-colors
      "
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-gray-900 dark:text-white truncate">
              {item.name}
            </h3>
            <Badge variant={statusVariant} size="sm">
              {formatStatus(item.status)}
            </Badge>
          </div>
          
          {/* Highlights */}
          {item.highlights.length > 0 && (
            <div className="mb-2">
              {item.highlights.map((highlight, index) => (
                <p
                  key={index}
                  className="text-sm text-gray-600 dark:text-gray-400"
                  dangerouslySetInnerHTML={{ __html: highlight.snippet }}
                />
              ))}
            </div>
          )}
          
          {/* Description fallback if no highlights */}
          {item.highlights.length === 0 && item.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
              {item.description}
            </p>
          )}
          
          {/* Metadata */}
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span>{item.wordCount.toLocaleString()} words</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDate(item.updatedAt)}
            </span>
            {item.score > 0 && (
              <span className="text-primary-500">
                Score: {item.score}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex-shrink-0">
          <Edit className="w-5 h-5 text-gray-400" />
        </div>
      </div>
    </Link>
  );
}

// ============================================
// Helper Functions
// ============================================

function getStatusVariant(status: string): 'success' | 'warning' | 'gray' | 'primary' {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'active':
      return 'success';
    case 'processing':
      return 'warning';
    case 'archived':
      return 'gray';
    default:
      return 'primary';
  }
}

function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }
}
