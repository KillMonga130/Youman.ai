import { useState, useMemo, useEffect } from 'react';
import { diffWords } from 'diff';
import { Check, X, RotateCcw, GitCompare, AlertCircle } from 'lucide-react';
import { useAppStore } from '../store';
import { useProjects, useProjectVersions, useCompareVersions } from '../api/hooks';
import { Spinner, Alert } from '../components/ui';

interface DiffSegment {
  id: number;
  value: string;
  added?: boolean | undefined;
  removed?: boolean | undefined;
  count?: number | undefined;
  accepted?: boolean | undefined;
}

export function Comparison(): JSX.Element {
  const { originalText, humanizedText, setHumanizedText } = useAppStore();
  const [viewMode, setViewMode] = useState<'side-by-side' | 'inline'>('side-by-side');
  const [comparisonMode, setComparisonMode] = useState<'editor' | 'versions'>('editor');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [versionId1, setVersionId1] = useState<string>('');
  const [versionId2, setVersionId2] = useState<string>('');
  
  const { data: projectsData } = useProjects({ page: 1, limit: 100 });
  const { data: versionsData } = useProjectVersions(selectedProjectId || null);
  const compareVersionsMutation = useCompareVersions();
  
  const projects = projectsData?.projects || [];
  const versions = versionsData?.versions || [];
  
  // Editor mode diff
  const editorDiffSegments = useMemo((): DiffSegment[] => {
    if (!originalText || !humanizedText) return [];
    const changes = diffWords(originalText, humanizedText);
    return changes.map((change, index) => ({
      ...change,
      id: index,
      accepted: change.added || change.removed ? undefined : true,
    }));
  }, [originalText, humanizedText]);

  // Version comparison diff
  const versionComparison = compareVersionsMutation.data;
  const versionDiffSegments = useMemo((): DiffSegment[] => {
    if (!versionComparison) return [];
    const changes = versionComparison.changes;
    return changes.map((change, index) => ({
      id: index,
      value: change.value,
      added: change.type === 'add',
      removed: change.type === 'remove',
      accepted: change.type === 'unchanged' ? true : undefined,
    }));
  }, [versionComparison]);

  // Use appropriate segments based on mode
  const diffSegments = comparisonMode === 'editor' ? editorDiffSegments : versionDiffSegments;
  const [segments, setSegments] = useState<DiffSegment[]>(diffSegments);

  // Update segments when diff changes
  useEffect(() => {
    setSegments(diffSegments);
  }, [diffSegments]);

  // Handle version comparison
  const handleCompareVersions = () => {
    if (versionId1 && versionId2) {
      compareVersionsMutation.mutate({ versionId1, versionId2 });
    }
  };

  const handleAccept = (id: number): void => {
    setSegments((prev) =>
      prev.map((seg) => (seg.id === id ? { ...seg, accepted: true } : seg))
    );
  };

  const handleReject = (id: number): void => {
    setSegments((prev) =>
      prev.map((seg) => (seg.id === id ? { ...seg, accepted: false } : seg))
    );
  };

  const handleApplyChanges = (): void => {
    const newText = segments
      .filter((seg) => {
        if (seg.removed && seg.accepted === false) return true; // Keep original
        if (seg.removed && seg.accepted === true) return false; // Remove
        if (seg.added && seg.accepted === false) return false; // Don't add
        if (seg.added && seg.accepted === true) return true; // Add
        return true; // Unchanged
      })
      .map((seg) => seg.value)
      .join('');
    setHumanizedText(newText);
  };

  const stats = useMemo(() => {
    const additions = segments.filter((s) => s.added).length;
    const deletions = segments.filter((s) => s.removed).length;
    const unchanged = segments.filter((s) => !s.added && !s.removed).length;
    return { additions, deletions, unchanged };
  }, [segments]);

  // Show empty state for editor mode
  if (comparisonMode === 'editor' && (!originalText || !humanizedText)) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          No content to compare. Please humanize some text first.
        </p>
        <a href="/editor" className="btn btn-primary">
          Go to Editor
        </a>
      </div>
    );
  }

  // Show empty state for version mode
  if (comparisonMode === 'versions' && !versionComparison && (!versionId1 || !versionId2)) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Compare Versions</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Compare different versions of your projects
          </p>
        </div>
        
        <div className="card p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Project
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                setVersionId1('');
                setVersionId2('');
              }}
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

          {selectedProjectId && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Version 1 (Older)
                </label>
                <select
                  value={versionId1}
                  onChange={(e) => setVersionId1(e.target.value)}
                  className="input w-full"
                >
                  <option value="">-- Select version --</option>
                  {versions.map(version => (
                    <option key={version.id} value={version.id}>
                      Version {version.versionNumber} - {new Date(version.createdAt).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Version 2 (Newer)
                </label>
                <select
                  value={versionId2}
                  onChange={(e) => setVersionId2(e.target.value)}
                  className="input w-full"
                >
                  <option value="">-- Select version --</option>
                  {versions.map(version => (
                    <option key={version.id} value={version.id}>
                      Version {version.versionNumber} - {new Date(version.createdAt).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleCompareVersions}
                disabled={!versionId1 || !versionId2 || compareVersionsMutation.isPending}
                className="btn btn-primary w-full"
              >
                {compareVersionsMutation.isPending ? (
                  <>
                    <Spinner size="sm" />
                    Comparing...
                  </>
                ) : (
                  <>
                    <GitCompare className="w-4 h-4" />
                    Compare Versions
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (compareVersionsMutation.isPending) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (compareVersionsMutation.isError) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Compare Versions</h1>
        </div>
        <Alert variant="error">
          <AlertCircle className="w-4 h-4" />
          <span>Failed to compare versions. Please try again.</span>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {comparisonMode === 'editor' ? 'Compare Changes' : 'Compare Versions'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {comparisonMode === 'editor' 
              ? 'Review and selectively accept or reject changes'
              : 'Compare different versions of your project'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Mode selector */}
          <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden mr-2">
            <button
              onClick={() => setComparisonMode('editor')}
              className={`px-3 py-1.5 text-sm ${
                comparisonMode === 'editor'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              Editor
            </button>
            <button
              onClick={() => setComparisonMode('versions')}
              className={`px-3 py-1.5 text-sm ${
                comparisonMode === 'versions'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              Versions
            </button>
          </div>
          {/* View mode selector */}
          <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
            <button
              onClick={() => setViewMode('side-by-side')}
              className={`px-3 py-1.5 text-sm ${
                viewMode === 'side-by-side'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              Side by Side
            </button>
            <button
              onClick={() => setViewMode('inline')}
              className={`px-3 py-1.5 text-sm ${
                viewMode === 'inline'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              Inline
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-green-500" />
          {stats.additions} additions
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-red-500" />
          {stats.deletions} deletions
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-gray-300" />
          {stats.unchanged} unchanged
        </span>
        {versionComparison && (
          <>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-blue-500" />
              {versionComparison.similarityPercentage}% similar
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-teal-500" />
              {versionComparison.wordCountDiff > 0 ? '+' : ''}{versionComparison.wordCountDiff} words
            </span>
          </>
        )}
      </div>

      {/* Diff view */}
      {viewMode === 'side-by-side' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left side (Original/Version 1) */}
          <div className="card">
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-medium">
                {comparisonMode === 'editor' 
                  ? 'Original' 
                  : versionComparison 
                    ? `Version ${versionComparison.version1.versionNumber}`
                    : 'Version 1'}
              </h3>
              {versionComparison && (
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(versionComparison.version1.createdAt).toLocaleString()}
                </p>
              )}
            </div>
            <div className="p-4 font-mono text-sm whitespace-pre-wrap">
              {segments.map((seg) => {
                if (seg.added) return null;
                return (
                  <span
                    key={seg.id}
                    className={seg.removed ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' : ''}
                  >
                    {seg.value}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Right side (Humanized/Version 2) */}
          <div className="card">
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-medium">
                {comparisonMode === 'editor' 
                  ? 'Humanized' 
                  : versionComparison 
                    ? `Version ${versionComparison.version2.versionNumber}`
                    : 'Version 2'}
              </h3>
              {versionComparison && (
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(versionComparison.version2.createdAt).toLocaleString()}
                </p>
              )}
            </div>
            <div className="p-4 font-mono text-sm whitespace-pre-wrap">
              {segments.map((seg) => {
                if (seg.removed) return null;
                return (
                  <span
                    key={seg.id}
                    className={seg.added ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : ''}
                  >
                    {seg.value}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="card p-4">
          <div className="font-mono text-sm whitespace-pre-wrap">
            {segments.map((seg) => (
              <span
                key={seg.id}
                className={`${
                  seg.added
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                    : seg.removed
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 line-through'
                    : ''
                } ${seg.accepted === false ? 'opacity-50' : ''}`}
              >
                {seg.value}
                {(seg.added || seg.removed) && seg.accepted === undefined && (
                  <span className="inline-flex gap-1 mx-1">
                    <button
                      onClick={() => handleAccept(seg.id)}
                      className="p-0.5 bg-green-500 text-white rounded hover:bg-green-600"
                      title="Accept"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleReject(seg.id)}
                      className="p-0.5 bg-red-500 text-white rounded hover:bg-red-600"
                      title="Reject"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between gap-3">
        {comparisonMode === 'versions' && (
          <button
            onClick={() => {
              setVersionId1('');
              setVersionId2('');
              compareVersionsMutation.reset();
            }}
            className="btn btn-outline flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Select Different Versions
          </button>
        )}
        <div className="flex gap-3 ml-auto">
          {comparisonMode === 'editor' && (
            <>
              <button
                onClick={() => setSegments(diffSegments)}
                className="btn btn-outline flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
              <button onClick={handleApplyChanges} className="btn btn-primary">
                Apply Selected Changes
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
