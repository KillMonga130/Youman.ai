/**
 * SearchFilters Component
 * Advanced filtering panel for search results
 * Requirements: 61 - Advanced search and filtering
 */

import { useState } from 'react';
import { Filter, X, ChevronDown, ChevronUp, Calendar, Hash, Layers, Tag } from 'lucide-react';
import { useSearch, type SearchFilters as SearchFiltersType } from '../context/SearchContext';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Checkbox } from './ui/Checkbox';
import { Badge } from './ui/Badge';

interface SearchFiltersProps {
  onApply: () => void;
  className?: string;
}

export function SearchFilters({ onApply, className = '' }: SearchFiltersProps): JSX.Element {
  const { filters, setFilters, clearFilters, hasActiveFilters } = useSearch();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['status']));

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const updateFilters = (updates: Partial<SearchFiltersType>) => {
    setFilters({ ...filters, ...updates });
  };

  const handleStatusChange = (status: string, checked: boolean) => {
    const currentStatus = filters.status || [];
    const newStatus = checked
      ? [...currentStatus, status]
      : currentStatus.filter(s => s !== status);
    updateFilters({ status: newStatus.length > 0 ? newStatus : undefined });
  };

  const handleStrategyChange = (strategy: 'auto' | 'casual' | 'professional' | 'academic', checked: boolean) => {
    const currentStrategy = filters.strategy || [];
    const newStrategy = checked
      ? [...currentStrategy, strategy]
      : currentStrategy.filter(s => s !== strategy);
    updateFilters({ strategy: newStrategy.length > 0 ? newStrategy : undefined });
  };

  const handleLevelChange = (level: number, checked: boolean) => {
    const currentLevels = filters.humanizationLevel || [];
    const newLevels = checked
      ? [...currentLevels, level]
      : currentLevels.filter(l => l !== level);
    updateFilters({ humanizationLevel: newLevels.length > 0 ? newLevels : undefined });
  };

  const handleApply = () => {
    onApply();
  };

  const handleClear = () => {
    clearFilters();
    onApply();
  };

  const statusOptions = [
    { value: 'ACTIVE', label: 'Active' },
    { value: 'ARCHIVED', label: 'Archived' },
    { value: 'draft', label: 'Draft' },
    { value: 'processing', label: 'Processing' },
    { value: 'completed', label: 'Completed' },
  ];

  const strategyOptions = [
    { value: 'auto' as const, label: 'Auto' },
    { value: 'casual' as const, label: 'Casual' },
    { value: 'professional' as const, label: 'Professional' },
    { value: 'academic' as const, label: 'Academic' },
  ];

  const levelOptions = [1, 2, 3, 4, 5];

  const activeFilterCount = [
    filters.dateRange?.from || filters.dateRange?.to,
    filters.wordCountRange?.min !== undefined || filters.wordCountRange?.max !== undefined,
    filters.status && filters.status.length > 0,
    filters.strategy && filters.strategy.length > 0,
    filters.humanizationLevel && filters.humanizationLevel.length > 0,
    filters.tags && filters.tags.length > 0,
  ].filter(Boolean).length;

  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-500" />
          <span className="font-medium">Filters</span>
          {activeFilterCount > 0 && (
            <Badge variant="primary" size="sm">
              {activeFilterCount}
            </Badge>
          )}
        </div>
        {hasActiveFilters && (
          <button
            onClick={handleClear}
            className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Filter Sections */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {/* Date Range */}
        <FilterSection
          title="Date Range"
          icon={<Calendar className="w-4 h-4" />}
          expanded={expandedSections.has('date')}
          onToggle={() => toggleSection('date')}
        >
          <div className="space-y-3">
            <Input
              type="date"
              label="From"
              value={filters.dateRange?.from?.split('T')[0] || ''}
              onChange={(e) => updateFilters({
                dateRange: {
                  ...filters.dateRange,
                  from: e.target.value ? `${e.target.value}T00:00:00Z` : undefined,
                },
              })}
            />
            <Input
              type="date"
              label="To"
              value={filters.dateRange?.to?.split('T')[0] || ''}
              onChange={(e) => updateFilters({
                dateRange: {
                  ...filters.dateRange,
                  to: e.target.value ? `${e.target.value}T23:59:59Z` : undefined,
                },
              })}
            />
          </div>
        </FilterSection>

        {/* Word Count */}
        <FilterSection
          title="Word Count"
          icon={<Hash className="w-4 h-4" />}
          expanded={expandedSections.has('wordCount')}
          onToggle={() => toggleSection('wordCount')}
        >
          <div className="flex gap-3">
            <Input
              type="number"
              label="Min"
              placeholder="0"
              value={filters.wordCountRange?.min ?? ''}
              onChange={(e) => updateFilters({
                wordCountRange: {
                  ...filters.wordCountRange,
                  min: e.target.value ? parseInt(e.target.value) : undefined,
                },
              })}
            />
            <Input
              type="number"
              label="Max"
              placeholder="∞"
              value={filters.wordCountRange?.max ?? ''}
              onChange={(e) => updateFilters({
                wordCountRange: {
                  ...filters.wordCountRange,
                  max: e.target.value ? parseInt(e.target.value) : undefined,
                },
              })}
            />
          </div>
        </FilterSection>

        {/* Status */}
        <FilterSection
          title="Status"
          icon={<Tag className="w-4 h-4" />}
          expanded={expandedSections.has('status')}
          onToggle={() => toggleSection('status')}
        >
          <div className="space-y-2">
            {statusOptions.map((option) => (
              <Checkbox
                key={option.value}
                label={option.label}
                checked={filters.status?.includes(option.value) || false}
                onChange={(e) => handleStatusChange(option.value, e.target.checked)}
              />
            ))}
          </div>
        </FilterSection>

        {/* Strategy */}
        <FilterSection
          title="Strategy"
          icon={<Layers className="w-4 h-4" />}
          expanded={expandedSections.has('strategy')}
          onToggle={() => toggleSection('strategy')}
        >
          <div className="space-y-2">
            {strategyOptions.map((option) => (
              <Checkbox
                key={option.value}
                label={option.label}
                checked={filters.strategy?.includes(option.value) || false}
                onChange={(e) => handleStrategyChange(option.value, e.target.checked)}
              />
            ))}
          </div>
        </FilterSection>

        {/* Humanization Level */}
        <FilterSection
          title="Humanization Level"
          icon={<Layers className="w-4 h-4" />}
          expanded={expandedSections.has('level')}
          onToggle={() => toggleSection('level')}
        >
          <div className="flex flex-wrap gap-2">
            {levelOptions.map((level) => (
              <button
                key={level}
                onClick={() => handleLevelChange(level, !filters.humanizationLevel?.includes(level))}
                className={`
                  w-10 h-10 rounded-lg font-medium
                  transition-colors
                  ${filters.humanizationLevel?.includes(level)
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }
                `}
              >
                {level}
              </button>
            ))}
          </div>
        </FilterSection>
      </div>

      {/* Apply Button */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <Button onClick={handleApply} fullWidth>
          Apply Filters
        </Button>
      </div>
    </div>
  );
}

// ============================================
// Filter Section Component
// ============================================

interface FilterSectionProps {
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function FilterSection({ title, icon, expanded, onToggle, children }: FilterSectionProps): JSX.Element {
  return (
    <div>
      <button
        onClick={onToggle}
        className="
          w-full flex items-center justify-between p-4
          text-left
          hover:bg-gray-50 dark:hover:bg-gray-700/50
          transition-colors
        "
      >
        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
          {icon}
          <span className="font-medium">{title}</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}
