import { useState, useMemo } from 'react';
import { diffWords } from 'diff';
import { Check, X, RotateCcw } from 'lucide-react';
import { useAppStore } from '../store';

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
  
  const diffSegments = useMemo((): DiffSegment[] => {
    if (!originalText || !humanizedText) return [];
    const changes = diffWords(originalText, humanizedText);
    return changes.map((change, index) => ({
      ...change,
      id: index,
      accepted: change.added || change.removed ? undefined : true,
    }));
  }, [originalText, humanizedText]);

  const [segments, setSegments] = useState<DiffSegment[]>(diffSegments);

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

  if (!originalText || !humanizedText) {
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Compare Changes</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Review and selectively accept or reject changes
          </p>
        </div>
        <div className="flex items-center gap-2">
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
      </div>

      {/* Diff view */}
      {viewMode === 'side-by-side' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Original */}
          <div className="card">
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-medium">Original</h3>
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

          {/* Humanized */}
          <div className="card">
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-medium">Humanized</h3>
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
      <div className="flex justify-end gap-3">
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
      </div>
    </div>
  );
}
