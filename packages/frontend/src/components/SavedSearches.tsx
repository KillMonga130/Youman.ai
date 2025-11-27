/**
 * SavedSearches Component
 * Manage and execute saved searches
 * Requirements: 61 - Saved searches
 */

import { useState } from 'react';
import { Bookmark, Play, Trash2, Edit2, Plus, X, Check } from 'lucide-react';
import { useSearch, type SavedSearch, type SearchFilters } from '../context/SearchContext';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Modal } from './ui/Modal';
import { Badge } from './ui/Badge';

interface SavedSearchesProps {
  onExecute: (savedSearch: SavedSearch) => void;
  onSave: (name: string, query: string, filters: SearchFilters) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, name: string) => Promise<void>;
  className?: string;
}

export function SavedSearches({
  onExecute,
  onSave,
  onDelete,
  onUpdate,
  className = '',
}: SavedSearchesProps): JSX.Element {
  const { savedSearches, query, filters } = useSearch();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [saveName, setSaveName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!saveName.trim()) return;
    
    setIsSaving(true);
    try {
      await onSave(saveName.trim(), query, filters);
      setSaveName('');
      setShowSaveModal(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEdit = (search: SavedSearch) => {
    setEditingId(search.id);
    setEditName(search.name);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return;
    
    await onUpdate(id, editName.trim());
    setEditingId(null);
    setEditName('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const canSaveSearch = query.trim() || Object.keys(filters).length > 0;

  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Bookmark className="w-5 h-5 text-gray-500" />
          <span className="font-medium">Saved Searches</span>
          {savedSearches.length > 0 && (
            <Badge variant="gray" size="sm">
              {savedSearches.length}
            </Badge>
          )}
        </div>
        {canSaveSearch && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSaveModal(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Save Current
          </Button>
        )}
      </div>

      {/* Saved Searches List */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {savedSearches.length === 0 ? (
          <div className="p-6 text-center">
            <Bookmark className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No saved searches yet
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Save your searches to quickly access them later
            </p>
          </div>
        ) : (
          savedSearches.map((search) => (
            <div
              key={search.id}
              className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              {editingId === search.id ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit(search.id);
                      if (e.key === 'Escape') handleCancelEdit();
                    }}
                  />
                  <button
                    onClick={() => handleSaveEdit(search.id)}
                    className="p-2 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {search.name}
                      </span>
                      {search.useCount > 0 && (
                        <span className="text-xs text-gray-400">
                          {search.useCount}×
                        </span>
                      )}
                    </div>
                    {search.query && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        &quot;{search.query}&quot;
                      </p>
                    )}
                    {getFilterSummary(search.filters) && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                        {getFilterSummary(search.filters)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => onExecute(search)}
                      className="p-2 text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                      title="Run search"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleStartEdit(search)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Edit name"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(search.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Save Modal */}
      <Modal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        title="Save Search"
      >
        <div className="space-y-4">
          <Input
            label="Search Name"
            placeholder="Enter a name for this search"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            autoFocus
          />
          
          {query && (
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Query:</p>
              <p className="text-sm">&quot;{query}&quot;</p>
            </div>
          )}
          
          {Object.keys(filters).length > 0 && (
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Filters:</p>
              <p className="text-sm">{getFilterSummary(filters)}</p>
            </div>
          )}
          
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowSaveModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              loading={isSaving}
              disabled={!saveName.trim()}
            >
              Save Search
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ============================================
// Helper Functions
// ============================================

function getFilterSummary(filters: SearchFilters): string {
  const parts: string[] = [];

  if (filters.dateRange?.from || filters.dateRange?.to) {
    parts.push('Date range');
  }
  if (filters.wordCountRange?.min !== undefined || filters.wordCountRange?.max !== undefined) {
    parts.push('Word count');
  }
  if (filters.status && filters.status.length > 0) {
    parts.push(`Status: ${filters.status.join(', ')}`);
  }
  if (filters.strategy && filters.strategy.length > 0) {
    parts.push(`Strategy: ${filters.strategy.join(', ')}`);
  }
  if (filters.humanizationLevel && filters.humanizationLevel.length > 0) {
    parts.push(`Level: ${filters.humanizationLevel.join(', ')}`);
  }

  return parts.join(' • ');
}
