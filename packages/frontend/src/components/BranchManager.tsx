import { useState, useEffect } from 'react';
import {
  GitBranch,
  Plus,
  Edit,
  Trash2,
  ArrowRight,
  Check,
  X,
  GitMerge,
  GitCompare,
  Star,
  Loader2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { useAppStore } from '../store';
import { Alert } from './ui';

interface Branch {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
  lastCommitAt: string;
  versionCount?: number;
  latestVersionNumber?: number | null;
}

interface BranchManagerProps {
  projectId: string;
  currentBranchId?: string;
  onBranchSwitch?: (branchId: string) => void;
  onClose?: () => void;
}

export function BranchManager({ projectId, currentBranchId, onBranchSwitch, onClose }: BranchManagerProps): JSX.Element {
  const { user } = useAppStore();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  
  // Form states
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchSource, setNewBranchSource] = useState<string>('current');
  const [renameBranchId, setRenameBranchId] = useState<string | null>(null);
  const [renameBranchName, setRenameBranchName] = useState('');
  const [compareBranch1, setCompareBranch1] = useState<string>('');
  const [compareBranch2, setCompareBranch2] = useState<string>('');
  const [mergeSourceBranch, setMergeSourceBranch] = useState<string>('');
  const [mergeTargetBranch, setMergeTargetBranch] = useState<string>('');

  useEffect(() => {
    if (projectId) {
      loadBranches();
    }
  }, [projectId]);

  const loadBranches = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiClient.getProjectBranches(projectId);
      setBranches(result.branches ?? []);
    } catch (err) {
      console.error('Failed to load branches:', err);
      setError('Failed to load branches');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) {
      setError('Branch name is required');
      return;
    }
    try {
      const result = await apiClient.createBranch({
        projectId,
        name: newBranchName.trim(),
        sourceBranchId: newBranchSource !== 'current' ? newBranchSource : undefined,
      });
      setSuccess('Branch created successfully');
      setShowCreateModal(false);
      setNewBranchName('');
      setNewBranchSource('current');
      loadBranches();
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError('Failed to create branch');
    }
  };

  const handleRenameBranch = async () => {
    if (!renameBranchId || !renameBranchName.trim()) {
      setError('Branch name is required');
      return;
    }
    try {
      await apiClient.renameBranch(renameBranchId, renameBranchName.trim());
      setSuccess('Branch renamed successfully');
      setShowRenameModal(false);
      setRenameBranchId(null);
      setRenameBranchName('');
      loadBranches();
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError('Failed to rename branch');
    }
  };

  const handleDeleteBranch = async (branchId: string, branchName: string) => {
    if (!confirm(`Are you sure you want to delete branch "${branchName}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await apiClient.deleteBranch(branchId);
      setSuccess('Branch deleted successfully');
      loadBranches();
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError('Failed to delete branch');
    }
  };

  const handleSwitchBranch = async (branchId: string) => {
    try {
      await apiClient.switchBranch(branchId);
      setSuccess('Switched to branch successfully');
      loadBranches();
      if (onBranchSwitch) {
        onBranchSwitch(branchId);
      }
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError('Failed to switch branch');
    }
  };

  const handleSetDefault = async (branchId: string) => {
    try {
      await apiClient.setDefaultBranch(branchId);
      setSuccess('Default branch updated');
      loadBranches();
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError('Failed to set default branch');
    }
  };

  const handleCompareBranches = async () => {
    if (!compareBranch1 || !compareBranch2) {
      setError('Please select two branches to compare');
      return;
    }
    if (compareBranch1 === compareBranch2) {
      setError('Please select two different branches');
      return;
    }
    try {
      const result = await apiClient.compareBranches(compareBranch1, compareBranch2);
      // Show comparison results (could open in comparison page)
      alert(`Branches compared. Similarity: ${(result.similarity * 100).toFixed(1)}%\nDifferences: ${result.differences.length}`);
      setShowCompareModal(false);
      setCompareBranch1('');
      setCompareBranch2('');
    } catch (err) {
      setError('Failed to compare branches');
    }
  };

  const handleMergeBranches = async () => {
    if (!mergeSourceBranch || !mergeTargetBranch) {
      setError('Please select source and target branches');
      return;
    }
    if (mergeSourceBranch === mergeTargetBranch) {
      setError('Source and target branches must be different');
      return;
    }
    if (!confirm(`Merge branch "${branches.find(b => b.id === mergeSourceBranch)?.name}" into "${branches.find(b => b.id === mergeTargetBranch)?.name}"?`)) {
      return;
    }
    try {
      await apiClient.mergeBranch(mergeSourceBranch, mergeTargetBranch);
      setSuccess('Branches merged successfully');
      setShowMergeModal(false);
      setMergeSourceBranch('');
      setMergeTargetBranch('');
      loadBranches();
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError('Failed to merge branches');
    }
  };

  const openRenameModal = (branch: Branch) => {
    setRenameBranchId(branch.id);
    setRenameBranchName(branch.name);
    setShowRenameModal(true);
  };

  const currentBranch = branches.find(b => b.id === currentBranchId);
  const defaultBranch = branches.find(b => b.isDefault);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            Branch Management
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage branches for this project
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCompareModal(true)}
            className="btn btn-outline btn-sm flex items-center gap-2"
            disabled={branches.length < 2}
          >
            <GitCompare className="w-4 h-4" />
            Compare
          </button>
          <button
            onClick={() => setShowMergeModal(true)}
            className="btn btn-outline btn-sm flex items-center gap-2"
            disabled={branches.length < 2}
          >
            <GitMerge className="w-4 h-4" />
            Merge
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary btn-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Branch
          </button>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success"><CheckCircle className="w-4 h-4 mr-2" />{success}</Alert>}

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : branches.length > 0 ? (
        <div className="space-y-2">
          {branches.map((branch) => (
            <div
              key={branch.id}
              className={`card p-4 flex items-center justify-between ${
                branch.id === currentBranchId ? 'ring-2 ring-primary-500' : ''
              }`}
            >
              <div className="flex items-center gap-3 flex-1">
                <GitBranch className="w-5 h-5 text-gray-400" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{branch.name}</span>
                    {branch.isDefault && (
                      <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded text-xs flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        Default
                      </span>
                    )}
                    {branch.id === currentBranchId && (
                      <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {branch.versionCount !== undefined && (
                      <span>{branch.versionCount} version{branch.versionCount !== 1 ? 's' : ''}</span>
                    )}
                    {branch.latestVersionNumber && (
                      <span className="ml-2">Latest: v{branch.latestVersionNumber}</span>
                    )}
                    <span className="ml-2">
                      Created: {new Date(branch.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!branch.isDefault && (
                  <button
                    onClick={() => handleSetDefault(branch.id)}
                    className="btn btn-outline btn-sm"
                    title="Set as default"
                  >
                    <Star className="w-4 h-4" />
                  </button>
                )}
                {branch.id !== currentBranchId && (
                  <button
                    onClick={() => handleSwitchBranch(branch.id)}
                    className="btn btn-outline btn-sm"
                    title="Switch to this branch"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => openRenameModal(branch)}
                  className="btn btn-outline btn-sm"
                  title="Rename branch"
                >
                  <Edit className="w-4 h-4" />
                </button>
                {!branch.isDefault && (
                  <button
                    onClick={() => handleDeleteBranch(branch.id, branch.name)}
                    className="btn btn-outline btn-sm text-red-600"
                    title="Delete branch"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <GitBranch className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No branches found</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary btn-sm mt-4"
          >
            Create First Branch
          </button>
        </div>
      )}

      {/* Create Branch Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold">Create New Branch</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewBranchName('');
                  setNewBranchSource('current');
                }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Branch Name</label>
                <input
                  type="text"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  className="input w-full"
                  placeholder="feature/new-feature"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Source Branch</label>
                <select
                  value={newBranchSource}
                  onChange={(e) => setNewBranchSource(e.target.value)}
                  className="input w-full"
                >
                  <option value="current">Current Branch</option>
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewBranchName('');
                    setNewBranchSource('current');
                  }}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateBranch}
                  className="btn btn-primary"
                >
                  Create Branch
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rename Branch Modal */}
      {showRenameModal && renameBranchId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold">Rename Branch</h3>
              <button
                onClick={() => {
                  setShowRenameModal(false);
                  setRenameBranchId(null);
                  setRenameBranchName('');
                }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">New Branch Name</label>
                <input
                  type="text"
                  value={renameBranchName}
                  onChange={(e) => setRenameBranchName(e.target.value)}
                  className="input w-full"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowRenameModal(false);
                    setRenameBranchId(null);
                    setRenameBranchName('');
                  }}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRenameBranch}
                  className="btn btn-primary"
                >
                  Rename
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compare Branches Modal */}
      {showCompareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold">Compare Branches</h3>
              <button
                onClick={() => {
                  setShowCompareModal(false);
                  setCompareBranch1('');
                  setCompareBranch2('');
                }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Branch 1</label>
                <select
                  value={compareBranch1}
                  onChange={(e) => setCompareBranch1(e.target.value)}
                  className="input w-full"
                >
                  <option value="">Select branch</option>
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Branch 2</label>
                <select
                  value={compareBranch2}
                  onChange={(e) => setCompareBranch2(e.target.value)}
                  className="input w-full"
                >
                  <option value="">Select branch</option>
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowCompareModal(false);
                    setCompareBranch1('');
                    setCompareBranch2('');
                  }}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCompareBranches}
                  className="btn btn-primary"
                >
                  Compare
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Merge Branches Modal */}
      {showMergeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold">Merge Branches</h3>
              <button
                onClick={() => {
                  setShowMergeModal(false);
                  setMergeSourceBranch('');
                  setMergeTargetBranch('');
                }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Source Branch (to merge from)</label>
                <select
                  value={mergeSourceBranch}
                  onChange={(e) => setMergeSourceBranch(e.target.value)}
                  className="input w-full"
                >
                  <option value="">Select source branch</option>
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Target Branch (to merge into)</label>
                <select
                  value={mergeTargetBranch}
                  onChange={(e) => setMergeTargetBranch(e.target.value)}
                  className="input w-full"
                >
                  <option value="">Select target branch</option>
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowMergeModal(false);
                    setMergeSourceBranch('');
                    setMergeTargetBranch('');
                  }}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMergeBranches}
                  className="btn btn-primary"
                >
                  Merge
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

