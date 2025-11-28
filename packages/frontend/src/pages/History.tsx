import { useState, useEffect } from 'react';
import { Clock, FileText, ChevronRight, Search, Filter, AlertCircle } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useProjectVersions } from '../api/hooks';
import { useProjects } from '../api/hooks';
import { Spinner, Alert } from '../components/ui';

interface HistoryItem {
  id: string;
  projectName: string;
  versionNumber: number;
  createdAt: string;
  wordCount: number;
  detectionScore: number;
  strategy: string;
}


function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStrategyBadge(strategy: string): JSX.Element {
  const colors: Record<string, string> = {
    casual: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    professional: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    academic: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    auto: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  };

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${colors[strategy] || colors.auto}`}>
      {strategy.charAt(0).toUpperCase() + strategy.slice(1)}
    </span>
  );
}

export function History(): JSX.Element {
  const { projectId } = useParams<{ projectId?: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStrategy, setFilterStrategy] = useState<string>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(projectId || null);

  // Get all projects for the dropdown
  const { data: projectsData, isLoading: isLoadingProjects } = useProjects({ page: 1, limit: 100 });
  const projects = projectsData?.projects || [];

  // Get versions for selected project
  const { data: versionsData, isLoading: isLoadingVersions, error: versionsError } = useProjectVersions(selectedProjectId);

  const versions = versionsData?.versions || [];
  
  // Create history items from versions
  const historyItems: HistoryItem[] = versions.map((version) => {
    const project = projects.find(p => p.id === selectedProjectId);
    const wordCount = version.content ? version.content.split(/\s+/).length : 0;
    
    // Try to get detection score and strategy from version metadata
    // If not available, use defaults
    const versionData = version as any;
    const detectionScore = versionData.detectionScore ?? versionData.metrics?.detectionScore ?? 0;
    const strategy = versionData.strategy ?? versionData.metrics?.strategy ?? 'auto';
    
    return {
      id: version.id,
      projectName: project?.name || 'Unknown Project',
      versionNumber: version.versionNumber,
      createdAt: version.createdAt,
      wordCount,
      detectionScore,
      strategy,
    };
  });

  const filteredHistory = historyItems.filter((item) => {
    const matchesSearch = item.projectName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  if (isLoadingProjects || isLoadingVersions) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Version History</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Browse and restore previous versions of your projects
        </p>
      </div>

      {/* Project Selector */}
      <div className="card p-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Select Project
        </label>
        <select
          value={selectedProjectId || ''}
          onChange={(e) => setSelectedProjectId(e.target.value || null)}
          className="input w-full"
        >
          <option value="">-- Select a project --</option>
          {projects.map(project => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      {versionsError && (
        <Alert variant="error">
          <AlertCircle className="w-4 h-4" />
          <span>Failed to load versions. Please try again.</span>
        </Alert>
      )}

      {!selectedProjectId && (
        <div className="card p-8 text-center">
          <Clock className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">Select a project to view its version history</p>
        </div>
      )}

      {selectedProjectId && (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search versions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>

          {/* History list */}
          <div className="card divide-y divide-gray-200 dark:divide-gray-700">
            {filteredHistory.length === 0 ? (
              <div className="p-8 text-center">
                <Clock className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  {searchQuery ? 'No versions match your search' : 'No version history for this project'}
                </p>
              </div>
            ) : (
              filteredHistory.map((item) => (
                <Link
                  key={item.id}
                  to={`/editor/${selectedProjectId}?version=${item.id}`}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <FileText className="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{item.projectName}</h3>
                        <span className="text-sm text-gray-500">v{item.versionNumber}</span>
                        {getStrategyBadge(item.strategy)}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                        <span>{item.wordCount.toLocaleString()} words</span>
                        {item.detectionScore > 0 && (
                          <span
                            className={
                              item.detectionScore < 20
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-amber-600 dark:text-amber-400'
                            }
                          >
                            {item.detectionScore}% AI detected
                          </span>
                        )}
                        <span>{formatDate(item.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </Link>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
