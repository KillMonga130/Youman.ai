/**
 * Bulk Operations Toolbar Component
 * Displays bulk action buttons when projects are selected
 */

import { useState } from 'react';
import { Trash2, Download, Archive, RefreshCw, X, AlertTriangle } from 'lucide-react';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { Progress } from './ui/Progress';
import type {
  BulkActionType,
  BulkOperationProgress,
  BulkOperationResult,
  BulkExportOptions,
  ProjectForBulk,
} from '../types/bulk-operations';
import { executeBulkOperation, generateSummaryReport } from '../services/bulk-operations';

interface BulkOperationsToolbarProps {
  selectedProjects: ProjectForBulk[];
  onClearSelection: () => void;
  onOperationComplete: (result: BulkOperationResult) => void;
}

export function BulkOperationsToolbar({
  selectedProjects,
  onClearSelection,
  onOperationComplete,
}: BulkOperationsToolbarProps): JSX.Element | null {
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [currentAction, setCurrentAction] = useState<BulkActionType | null>(null);
  const [progress, setProgress] = useState<BulkOperationProgress | null>(null);
  const [result, setResult] = useState<BulkOperationResult | null>(null);
  const [exportOptions, setExportOptions] = useState<BulkExportOptions>({
    format: 'json',
    includeMetadata: true,
    includeHumanized: true,
    includeOriginal: true,
  });

  if (selectedProjects.length === 0) {
    return null;
  }

  const handleAction = (action: BulkActionType): void => {
    setCurrentAction(action);
    if (action === 'delete') {
      setIsConfirmModalOpen(true);
    } else if (action === 'export') {
      setIsExportModalOpen(true);
    } else {
      executeAction(action);
    }
  };

  const executeAction = async (
    action: BulkActionType,
    options?: { exportOptions?: BulkExportOptions }
  ): Promise<void> => {
    setIsConfirmModalOpen(false);
    setIsExportModalOpen(false);
    setIsProgressModalOpen(true);
    setProgress({
      total: selectedProjects.length,
      completed: 0,
      failed: 0,
      inProgress: true,
      errors: [],
    });

    const operationResult = await executeBulkOperation(
      action,
      selectedProjects,
      options,
      (p) => setProgress({ ...p })
    );

    setResult(operationResult);
    setIsProgressModalOpen(false);
    setIsResultModalOpen(true);
    onOperationComplete(operationResult);
  };

  const handleExportConfirm = (): void => {
    executeAction('export', { exportOptions });
  };

  const handleResultClose = (): void => {
    setIsResultModalOpen(false);
    setResult(null);
    setCurrentAction(null);
    if (result?.success) {
      onClearSelection();
    }
  };

  const downloadReport = (): void => {
    if (!result || !currentAction) return;
    const report = generateSummaryReport(result, currentAction);
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bulk-operation-report-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Toolbar */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {selectedProjects.length} selected
          </span>
          
          <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={() => handleAction('export')}
            >
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Archive className="w-4 h-4" />}
              onClick={() => handleAction('archive')}
            >
              Archive
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={() => handleAction('reprocess')}
            >
              Re-process
            </Button>
            <Button
              variant="error"
              size="sm"
              leftIcon={<Trash2 className="w-4 h-4" />}
              onClick={() => handleAction('delete')}
            >
              Delete
            </Button>
          </div>
          
          <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
          
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            onClick={onClearSelection}
            aria-label="Clear selection"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="Confirm Delete"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsConfirmModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="error" onClick={() => executeAction('delete')}>
              Delete {selectedProjects.length} Projects
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-gray-700 dark:text-gray-300">
              Are you sure you want to delete {selectedProjects.length} project
              {selectedProjects.length > 1 ? 's' : ''}? This action cannot be undone.
            </p>
            <ul className="mt-3 text-sm text-gray-500 dark:text-gray-400 max-h-32 overflow-y-auto">
              {selectedProjects.slice(0, 5).map((p) => (
                <li key={p.id}>• {p.name}</li>
              ))}
              {selectedProjects.length > 5 && (
                <li>• ...and {selectedProjects.length - 5} more</li>
              )}
            </ul>
          </div>
        </div>
      </Modal>

      {/* Export Options Modal */}
      <ExportOptionsModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        options={exportOptions}
        onOptionsChange={setExportOptions}
        onConfirm={handleExportConfirm}
        projectCount={selectedProjects.length}
      />

      {/* Progress Modal */}
      <Modal
        isOpen={isProgressModalOpen}
        onClose={() => {}}
        title={`${currentAction?.charAt(0).toUpperCase()}${currentAction?.slice(1) || ''} in Progress`}
        size="sm"
        showCloseButton={false}
        closeOnOverlayClick={false}
        closeOnEscape={false}
      >
        {progress && (
          <div className="space-y-4">
            <Progress
              value={progress.completed + progress.failed}
              max={progress.total}
              showLabel
              label={`Processing ${progress.currentItem || '...'}`}
              variant={progress.failed > 0 ? 'warning' : 'primary'}
            />
            <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
              <span>Completed: {progress.completed}</span>
              {progress.failed > 0 && (
                <span className="text-red-500">Failed: {progress.failed}</span>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Result Modal */}
      <Modal
        isOpen={isResultModalOpen}
        onClose={handleResultClose}
        title="Operation Complete"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={downloadReport}>
              Download Report
            </Button>
            <Button variant="primary" onClick={handleResultClose}>
              Done
            </Button>
          </>
        }
      >
        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {result.totalProcessed}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {result.successCount}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Successful</p>
              </div>
              <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {result.failedCount}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Failed</p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Errors
                </h4>
                <ul className="text-sm text-red-600 dark:text-red-400 space-y-1 max-h-32 overflow-y-auto">
                  {result.errors.map((error, index) => (
                    <li key={index}>
                      <strong>{error.name}:</strong> {error.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}


/**
 * Export Options Modal Component
 */
interface ExportOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  options: BulkExportOptions;
  onOptionsChange: (options: BulkExportOptions) => void;
  onConfirm: () => void;
  projectCount: number;
}

function ExportOptionsModal({
  isOpen,
  onClose,
  options,
  onOptionsChange,
  onConfirm,
  projectCount,
}: ExportOptionsModalProps): JSX.Element {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Export Options"
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            Export {projectCount} Projects
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Export Format
          </label>
          <div className="flex gap-2">
            {(['json', 'txt'] as const).map((format) => (
              <button
                key={format}
                type="button"
                onClick={() => onOptionsChange({ ...options, format })}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  options.format === format
                    ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                    : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {format.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Include in Export
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={options.includeMetadata}
              onChange={(e) =>
                onOptionsChange({ ...options, includeMetadata: e.target.checked })
              }
              className="checkbox"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Project metadata (name, dates, word count)
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={options.includeOriginal}
              onChange={(e) =>
                onOptionsChange({ ...options, includeOriginal: e.target.checked })
              }
              className="checkbox"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Original content
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={options.includeHumanized}
              onChange={(e) =>
                onOptionsChange({ ...options, includeHumanized: e.target.checked })
              }
              className="checkbox"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Humanized content
            </span>
          </label>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          Projects will be exported as a ZIP archive containing individual folders for each
          project.
        </p>
      </div>
    </Modal>
  );
}
