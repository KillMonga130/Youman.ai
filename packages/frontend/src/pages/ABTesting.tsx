import { useState, useEffect } from 'react';
import {
  FlaskConical,
  Plus,
  Play,
  Pause,
  Square,
  Trophy,
  BarChart3,
  FileText,
  Trash2,
  Eye,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  TrendingUp,
  Users,
  Target,
  Download,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { useAppStore } from '../store';
import { Alert } from '../components/ui';

interface ABTest {
  id: string;
  name: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  variationCount: number;
  createdAt: string;
  variations?: Array<{
    id: string;
    text: string;
    strategy: string;
    level: number;
    detectionScore: number;
  }>;
}

interface PerformanceMetrics {
  variationId: string;
  views: number;
  clicks: number;
  conversions: number;
  conversionRate: number;
  clickThroughRate: number;
}

export function ABTesting(): JSX.Element {
  const { user } = useAppStore();
  const [tests, setTests] = useState<ABTest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTestDetailsModal, setShowTestDetailsModal] = useState(false);
  const [showMetricsModal, setShowMetricsModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showComparisonView, setShowComparisonView] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<any>(null);
  const [isComparing, setIsComparing] = useState(false);
  
  // Selected test
  const [selectedTest, setSelectedTest] = useState<ABTest | null>(null);
  const [testMetrics, setTestMetrics] = useState<PerformanceMetrics | null>(null);
  const [testReport, setTestReport] = useState<any>(null);
  
  // Form states
  const [createTestForm, setCreateTestForm] = useState({
    name: '',
    originalText: '',
    variationCount: 3,
  });
  const [testIdInput, setTestIdInput] = useState('');

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    // Backend doesn't have a list endpoint, so we'll track test IDs in localStorage
    const savedTestIds = JSON.parse(localStorage.getItem('ab_test_ids') || '[]') as string[];
    if (savedTestIds.length > 0) {
      setIsLoading(true);
      const loadedTests: ABTest[] = [];
      for (const testId of savedTestIds) {
        try {
          const result = await apiClient.getABTest(testId);
          loadedTests.push({
            id: result.data.id,
            name: result.data.name,
            status: result.data.status as any,
            variationCount: result.data.variations?.length || 0,
            createdAt: new Date().toISOString(),
            variations: result.data.variations,
          });
        } catch (err) {
          // Test might not exist anymore, remove from saved list
          const updatedIds = savedTestIds.filter(id => id !== testId);
          localStorage.setItem('ab_test_ids', JSON.stringify(updatedIds));
        }
      }
      setTests(loadedTests);
      setIsLoading(false);
    }
  };

  const saveTestId = (testId: string) => {
    const savedTestIds = JSON.parse(localStorage.getItem('ab_test_ids') || '[]') as string[];
    if (!savedTestIds.includes(testId)) {
      savedTestIds.push(testId);
      localStorage.setItem('ab_test_ids', JSON.stringify(savedTestIds));
    }
  };

  const handleCreateTest = async () => {
    if (!createTestForm.name.trim() || !createTestForm.originalText.trim()) {
      setError('Please fill in all required fields');
      return;
    }
    if (!user?.id) {
      setError('User not found');
      return;
    }
    try {
      const result = await apiClient.createABTest({
        name: createTestForm.name.trim(),
        originalText: createTestForm.originalText.trim(),
        variationCount: createTestForm.variationCount,
        userId: user.id,
      });
      saveTestId(result.data.id);
      setSuccess('A/B test created successfully');
      setShowCreateModal(false);
      setCreateTestForm({
        name: '',
        originalText: '',
        variationCount: 3,
      });
      loadTests();
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError('Failed to create A/B test');
    }
  };

  const handleUpdateStatus = async (testId: string, status: 'draft' | 'running' | 'paused' | 'completed') => {
    try {
      await apiClient.updateABTestStatus(testId, status);
      setSuccess('Test status updated');
      loadTests();
      if (selectedTest && selectedTest.id === testId) {
        setSelectedTest({ ...selectedTest, status });
      }
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError('Failed to update test status');
    }
  };

  const handleDeleteTest = async (testId: string) => {
    if (!confirm('Are you sure you want to delete this A/B test?')) return;
    try {
      await apiClient.deleteABTest(testId);
      // Remove from localStorage
      const savedTestIds = JSON.parse(localStorage.getItem('ab_test_ids') || '[]') as string[];
      const updatedIds = savedTestIds.filter(id => id !== testId);
      localStorage.setItem('ab_test_ids', JSON.stringify(updatedIds));
      setSuccess('Test deleted successfully');
      loadTests();
      if (selectedTest?.id === testId) {
        setShowTestDetailsModal(false);
        setSelectedTest(null);
      }
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError('Failed to delete test');
    }
  };

  const handleViewTest = async (testId: string) => {
    try {
      const result = await apiClient.getABTest(testId);
      const test: ABTest = {
        id: result.data.id,
        name: result.data.name,
        status: result.data.status as any,
        variationCount: result.data.variations?.length || 0,
        createdAt: new Date().toISOString(),
        variations: result.data.variations,
      };
      setSelectedTest(test);
      saveTestId(testId);
      // Add to list if not already there
      if (!tests.find(t => t.id === testId)) {
        setTests([...tests, test]);
      }
      setShowTestDetailsModal(true);
    } catch (err) {
      setError('Failed to load test details');
    }
  };

  const handleViewMetrics = async (variationId: string) => {
    try {
      const result = await apiClient.getPerformanceMetrics(variationId);
      setTestMetrics(result.data);
      setShowMetricsModal(true);
    } catch (err) {
      setError('Failed to load metrics');
    }
  };

  const handleSelectWinner = async (testId: string, variationId: string) => {
    if (!confirm('Are you sure you want to select this variation as the winner? This will complete the test.')) {
      return;
    }
    try {
      await apiClient.selectWinner(testId, variationId);
      setSuccess('Winner selected successfully');
      handleViewTest(testId);
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError('Failed to select winner');
    }
  };

  const handleGenerateReport = async (testId: string) => {
    try {
      const result = await apiClient.generateTestReport(testId);
      setTestReport(result.data);
      setShowReportModal(true);
    } catch (err) {
      setError('Failed to generate report');
    }
  };

  const handleTrackPerformance = async (variationId: string, metrics: { views?: number; clicks?: number; conversions?: number }) => {
    try {
      await apiClient.trackPerformance(variationId, metrics);
      setSuccess('Performance tracked');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError('Failed to track performance');
    }
  };

  const handleCompareVariations = async () => {
    if (!selectedTest || !selectedTest.variations || selectedTest.variations.length < 2) {
      setError('Need at least 2 variations to compare');
      return;
    }
    setIsComparing(true);
    setError(null);
    try {
      const result = await apiClient.compareVariations(selectedTest.variations.map(v => ({
        id: v.id,
        text: v.text,
        strategy: v.strategy,
        level: v.level,
        detectionScore: v.detectionScore,
        differences: [],
        wordCount: v.text.split(/\s+/).length,
        createdAt: new Date().toISOString(),
        isOriginal: false,
      })));
      setComparisonResult(result.data);
      setShowComparisonView(true);
    } catch (err) {
      setError('Failed to compare variations');
    } finally {
      setIsComparing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'completed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'draft':
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Play className="w-4 h-4" />;
      case 'paused':
        return <Pause className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-glow-purple flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-warning-400" />
            Potion Lab
          </h1>
          <p className="text-gray-400 mt-1">
            Create and manage A/B tests to compare content variations
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary btn-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Test
        </button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success"><CheckCircle className="w-4 h-4 mr-2" />{success}</Alert>}

      {/* Info Banner */}
      <div className="card p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <FlaskConical className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <p className="font-medium text-blue-900 dark:text-blue-100">Quick Start</p>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Generate variations in the Editor, then create an A/B test to track their performance and determine the best version. 
              You can also create tests directly from here.
            </p>
          </div>
        </div>
      </div>

      {/* Add Test by ID */}
      <div className="card p-4">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">Open Test by ID</label>
            <input
              type="text"
              value={testIdInput}
              onChange={(e) => setTestIdInput(e.target.value)}
              placeholder="Enter test ID..."
              className="input w-full"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && testIdInput.trim()) {
                  handleViewTest(testIdInput.trim());
                  setTestIdInput('');
                }
              }}
            />
          </div>
          <button
            onClick={() => {
              if (testIdInput.trim()) {
                handleViewTest(testIdInput.trim());
                setTestIdInput('');
              }
            }}
            className="btn btn-outline"
          >
            Open
          </button>
        </div>
      </div>

      {/* Tests List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : tests.length > 0 ? (
        <div className="space-y-3">
          {tests.map((test) => (
            <div
              key={test.id}
              className="card p-4 flex items-center justify-between hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className={`p-3 rounded-lg ${getStatusColor(test.status)}`}>
                  {getStatusIcon(test.status)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg">{test.name}</h3>
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(test.status)}`}>
                      {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {test.variationCount} variation{test.variationCount !== 1 ? 's' : ''} • 
                    Created {new Date(test.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleViewTest(test.id)}
                  className="btn btn-outline btn-sm"
                  title="View test"
                >
                  <Eye className="w-4 h-4" />
                </button>
                {test.status === 'running' && (
                  <button
                    onClick={() => handleUpdateStatus(test.id, 'paused')}
                    className="btn btn-outline btn-sm"
                    title="Pause test"
                  >
                    <Pause className="w-4 h-4" />
                  </button>
                )}
                {test.status === 'paused' && (
                  <button
                    onClick={() => handleUpdateStatus(test.id, 'running')}
                    className="btn btn-outline btn-sm"
                    title="Resume test"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                )}
                {test.status === 'running' && (
                  <button
                    onClick={() => handleUpdateStatus(test.id, 'completed')}
                    className="btn btn-outline btn-sm"
                    title="Complete test"
                  >
                    <Square className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => handleGenerateReport(test.id)}
                  className="btn btn-outline btn-sm"
                  title="Generate report"
                >
                  <BarChart3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteTest(test.id)}
                  className="btn btn-outline btn-sm text-red-600"
                  title="Delete test"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <FlaskConical className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No A/B Tests Yet</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Create your first A/B test to compare content variations and find the best performing version.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create First Test
          </button>
        </div>
      )}

      {/* Create Test Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold">Create A/B Test</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateTestForm({ name: '', originalText: '', variationCount: 3 });
                }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Test Name *</label>
                <input
                  type="text"
                  value={createTestForm.name}
                  onChange={(e) => setCreateTestForm({ ...createTestForm, name: e.target.value })}
                  className="input w-full"
                  placeholder="My A/B Test"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Original Text *</label>
                <textarea
                  value={createTestForm.originalText}
                  onChange={(e) => setCreateTestForm({ ...createTestForm, originalText: e.target.value })}
                  className="input w-full h-32"
                  placeholder="Enter the original text to test variations of..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Number of Variations</label>
                <select
                  value={createTestForm.variationCount}
                  onChange={(e) => setCreateTestForm({ ...createTestForm, variationCount: Number(e.target.value) })}
                  className="input w-full"
                >
                  {[2, 3, 4, 5].map(count => (
                    <option key={count} value={count}>{count}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateTestForm({ name: '', originalText: '', variationCount: 3 });
                  }}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTest}
                  className="btn btn-primary"
                >
                  Create Test
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Details Modal */}
      {showTestDetailsModal && selectedTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold">{selectedTest.name}</h2>
              <button
                onClick={() => {
                  setShowTestDetailsModal(false);
                  setSelectedTest(null);
                }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <span className={`px-3 py-1 rounded text-sm ${getStatusColor(selectedTest.status)}`}>
                  {selectedTest.status.charAt(0).toUpperCase() + selectedTest.status.slice(1)}
                </span>
                <span className="text-sm text-gray-500">
                  Created {new Date(selectedTest.createdAt).toLocaleDateString()}
                </span>
              </div>

              {selectedTest.variations && selectedTest.variations.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Variations</h3>
                  <div className="space-y-3">
                    {selectedTest.variations.map((variation, index) => (
                      <div
                        key={variation.id}
                        className="card p-4"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Variation {index + 1}</span>
                            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                              {variation.strategy} (Level {variation.level})
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              variation.detectionScore < 30 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {variation.detectionScore}% AI
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewMetrics(variation.id)}
                              className="btn btn-outline btn-sm"
                              title="View metrics"
                            >
                              <BarChart3 className="w-4 h-4" />
                            </button>
                            {selectedTest.status === 'running' && (
                              <button
                                onClick={() => handleSelectWinner(selectedTest.id, variation.id)}
                                className="btn btn-primary btn-sm flex items-center gap-1"
                                title="Select as winner"
                              >
                                <Trophy className="w-4 h-4" />
                                Winner
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                          {variation.text.substring(0, 200)}...
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                {selectedTest.variations && selectedTest.variations.length >= 2 && (
                  <button
                    onClick={handleCompareVariations}
                    disabled={isComparing}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    {isComparing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Comparing...
                      </>
                    ) : (
                      <>
                        <BarChart3 className="w-4 h-4" />
                        Compare Variations
                      </>
                    )}
                  </button>
                )}
                {selectedTest.status === 'running' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedTest.id, 'paused')}
                    className="btn btn-outline"
                  >
                    <Pause className="w-4 h-4 mr-2" />
                    Pause Test
                  </button>
                )}
                {selectedTest.status === 'paused' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedTest.id, 'running')}
                    className="btn btn-primary"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Resume Test
                  </button>
                )}
                <button
                  onClick={() => handleGenerateReport(selectedTest.id)}
                  className="btn btn-outline"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Generate Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Modal */}
      {showMetricsModal && testMetrics && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold">Performance Metrics</h2>
              <button
                onClick={() => {
                  setShowMetricsModal(false);
                  setTestMetrics(null);
                }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-500">Views</span>
                  </div>
                  <p className="text-2xl font-bold">{testMetrics.views}</p>
                </div>
                <div className="card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-500">Clicks</span>
                  </div>
                  <p className="text-2xl font-bold">{testMetrics.clicks}</p>
                </div>
                <div className="card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-500">Conversions</span>
                  </div>
                  <p className="text-2xl font-bold">{testMetrics.conversions}</p>
                </div>
                <div className="card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-500">Conversion Rate</span>
                  </div>
                  <p className="text-2xl font-bold">{(testMetrics.conversionRate * 100).toFixed(1)}%</p>
                </div>
              </div>
              <div className="card p-4">
                <p className="text-sm text-gray-500 mb-1">Click-Through Rate</p>
                <p className="text-2xl font-bold">{(testMetrics.clickThroughRate * 100).toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comparison View Modal */}
      {showComparisonView && comparisonResult && selectedTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold">Variation Comparison</h2>
              <button
                onClick={() => {
                  setShowComparisonView(false);
                  setComparisonResult(null);
                }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Best Variation */}
              {comparisonResult.statistics?.bestVariationId && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <h3 className="font-semibold text-green-900 dark:text-green-100">Best Variation</h3>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {selectedTest.variations?.find(v => v.id === comparisonResult.statistics.bestVariationId)?.text.substring(0, 200) || 'N/A'}
                  </p>
                  {comparisonResult.statistics.isStatisticallySignificant && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                      Statistically significant (p-value: {comparisonResult.statistics.pValue.toFixed(4)}, confidence: {(comparisonResult.statistics.confidenceLevel * 100).toFixed(1)}%)
                    </p>
                  )}
                </div>
              )}

              {/* Statistics Summary */}
              {comparisonResult.statistics && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="card p-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Confidence Level</div>
                    <div className="text-2xl font-bold">{(comparisonResult.statistics.confidenceLevel * 100).toFixed(1)}%</div>
                  </div>
                  <div className="card p-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">P-Value</div>
                    <div className="text-2xl font-bold">{comparisonResult.statistics.pValue.toFixed(4)}</div>
                  </div>
                  <div className="card p-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Sample Size</div>
                    <div className="text-2xl font-bold">{comparisonResult.statistics.sampleSize}</div>
                  </div>
                  <div className="card p-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Significant?</div>
                    <div className={`text-2xl font-bold ${comparisonResult.statistics.isStatisticallySignificant ? 'text-green-600' : 'text-gray-400'}`}>
                      {comparisonResult.statistics.isStatisticallySignificant ? 'Yes' : 'No'}
                    </div>
                  </div>
                </div>
              )}

              {/* Rankings */}
              {comparisonResult.statistics?.rankings && comparisonResult.statistics.rankings.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-4">Rankings</h3>
                  <div className="space-y-3">
                    {comparisonResult.statistics.rankings
                      .sort((a: any, b: any) => a.rank - b.rank)
                      .map((ranking: any) => {
                        const variation = selectedTest.variations?.find(v => v.id === ranking.variationId);
                        const isWinner = ranking.variationId === comparisonResult.statistics?.bestVariationId;
                        return (
                          <div
                            key={ranking.variationId}
                            className={`card p-4 ${
                              isWinner
                                ? 'ring-2 ring-green-500 bg-green-50/50 dark:bg-green-900/10'
                                : ''
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                  <span className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded font-semibold">
                                    Rank #{ranking.rank}
                                  </span>
                                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                                    Score: {ranking.score.toFixed(2)}
                                  </span>
                                  {ranking.metricScores && (
                                    <>
                                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded text-xs">
                                        Detection: {ranking.metricScores.detectionScore.toFixed(1)}
                                      </span>
                                      <span className="px-2 py-1 bg-teal-100 dark:bg-teal-900/30 rounded text-xs">
                                        Quality: {ranking.metricScores.qualityScore.toFixed(1)}
                                      </span>
                                    </>
                                  )}
                                  {variation && (
                                    <>
                                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded text-xs">
                                        {variation.strategy} (Level {variation.level})
                                      </span>
                                      <span className={`px-2 py-1 rounded text-xs ${
                                        variation.detectionScore < 30 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                                      }`}>
                                        {variation.detectionScore}% AI
                                      </span>
                                    </>
                                  )}
                                </div>
                                {variation && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-4">
                                    {variation.text}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Side-by-side comparison */}
              {comparisonResult.sideBySide && comparisonResult.sideBySide.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-4">Side-by-Side Comparison</h3>
                  <div className="space-y-4 max-h-96 overflow-auto">
                    {comparisonResult.sideBySide.slice(0, 10).map((segment: any, segmentIdx: number) => (
                      <div key={segment.segmentIndex || segmentIdx} className="card p-4">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Segment {segment.segmentIndex || segmentIdx + 1}</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Original</div>
                            <div className="text-sm bg-gray-50 dark:bg-gray-900 p-3 rounded">
                              {segment.original || 'N/A'}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Variations</div>
                            <div className="space-y-2">
                              {segment.variations?.slice(0, 2).map((variationSegment: any, idx: number) => {
                                const variation = selectedTest.variations?.find(v => v.id === variationSegment.variationId);
                                const changeTypeColors: Record<string, string> = {
                                  unchanged: 'bg-gray-50 dark:bg-gray-900',
                                  modified: 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800',
                                  added: 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800',
                                  removed: 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800',
                                };
                                return (
                                  <div key={idx} className={`text-sm p-3 rounded ${changeTypeColors[variationSegment.changeType] || 'bg-gray-50 dark:bg-gray-900'}`}>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                      {variation?.strategy || 'Variation'} ({variationSegment.changeType})
                                    </div>
                                    {variationSegment.text}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {comparisonResult.recommendations && comparisonResult.recommendations.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-4">Recommendations</h3>
                  <div className="space-y-2">
                    {comparisonResult.recommendations.map((recommendation: string, idx: number) => (
                      <div key={idx} className="card p-4 flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-700 dark:text-gray-300">{recommendation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && testReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold">Test Report</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const reportText = JSON.stringify(testReport, null, 2);
                    const blob = new Blob([reportText], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `ab-test-report-${testReport.testId}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="btn btn-outline btn-sm"
                  title="Download report"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setShowReportModal(false);
                    setTestReport(null);
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Summary</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{testReport.report?.summary}</p>
              </div>
              {testReport.report?.winner && (
                <div className="card p-4 bg-green-50 dark:bg-green-900/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <span className="font-semibold">Winner</span>
                  </div>
                  <p className="text-sm">{testReport.report.winner}</p>
                </div>
              )}
              {testReport.report?.metrics && (
                <div>
                  <h3 className="font-semibold mb-2">Metrics</h3>
                  <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded text-xs overflow-auto">
                    {JSON.stringify(testReport.report.metrics, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

