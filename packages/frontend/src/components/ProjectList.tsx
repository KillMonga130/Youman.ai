/**
 * Project List Component with Multi-Select
 * Displays projects with checkbox selection for bulk operations
 */

import { useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Edit, Trash2, Plus } from 'lucide-react';
import { Checkbox } from './ui/Checkbox';
import { BulkOperationsToolbar } from './BulkOperationsToolbar';
import type { Project } from '../store';
import type { ProjectForBulk, BulkOperationResult } from '../types/bulk-operations';

interface ProjectListProps {
  projects: Project[];
  onDeleteProject: (id: string) => void;
  onBulkOperationComplete?: (result: BulkOperationResult) => void;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getStatusBadge(status: Project['status']): JSX.Element {
  const styles = {
    draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    processing: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export function ProjectList({
  projects,
  onDeleteProject,
  onBulkOperationComplete,
}: ProjectListProps): JSX.Element {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isAllSelected = useMemo(
    () => projects.length > 0 && selectedIds.size === projects.length,
    [projects.length, selectedIds.size]
  );

  const isIndeterminate = useMemo(
    () => selectedIds.size > 0 && selectedIds.size < projects.length,
    [projects.length, selectedIds.size]
  );

  const selectedProjects = useMemo<ProjectForBulk[]>(
    () =>
      projects
        .filter((p) => selectedIds.has(p.id))
        .map((p) => ({
          id: p.id,
          name: p.name,
          status: p.status,
          wordCount: p.wordCount,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        })),
    [projects, selectedIds]
  );

  const handleSelectAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(projects.map((p) => p.id)));
    }
  }, [isAllSelected, projects]);

  const handleSelectProject = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleOperationComplete = useCallback(
    (result: BulkOperationResult) => {
      // Clear selection for successful deletes
      if (result.success) {
        setSelectedIds(new Set());
      }
      onBulkOperationComplete?.(result);
    },
    [onBulkOperationComplete]
  );

  if (projects.length === 0) {
    return (
      <div className="p-8 text-center">
        <FileText className="w-12 h-12 mx-auto text-gray-400 mb-3" />
        <p className="text-gray-500 dark:text-gray-400">No projects yet</p>
        <Link to="/editor" className="btn btn-primary mt-4 inline-flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create your first project
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Header with select all */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
        <Checkbox
          checked={isAllSelected}
          indeterminate={isIndeterminate}
          onChange={handleSelectAll}
          aria-label="Select all projects"
        />
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {selectedIds.size > 0
            ? `${selectedIds.size} of ${projects.length} selected`
            : `${projects.length} projects`}
        </span>
      </div>

      {/* Project list */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {projects.map((project) => (
          <div
            key={project.id}
            className={`p-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
              selectedIds.has(project.id) ? 'bg-primary-50 dark:bg-primary-900/10' : ''
            }`}
          >
            <Checkbox
              checked={selectedIds.has(project.id)}
              onChange={(e) => handleSelectProject(project.id, e.target.checked)}
              aria-label={`Select ${project.name}`}
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium truncate">{project.name}</h3>
                {getStatusBadge(project.status)}
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                <span>{project.wordCount.toLocaleString()} words</span>
                <span>Updated {formatDate(project.updatedAt)}</span>
                {project.detectionScore !== undefined && (
                  <span className="text-green-600 dark:text-green-400">
                    {project.detectionScore}% AI detected
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to={`/editor/${project.id}`}
                className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Edit"
              >
                <Edit className="w-4 h-4" />
              </Link>
              <button
                onClick={() => onDeleteProject(project.id)}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Bulk operations toolbar */}
      <BulkOperationsToolbar
        selectedProjects={selectedProjects}
        onClearSelection={handleClearSelection}
        onOperationComplete={handleOperationComplete}
      />
    </>
  );
}
