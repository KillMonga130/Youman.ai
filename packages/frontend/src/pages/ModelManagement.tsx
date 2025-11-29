import { useState } from 'react';
import {
  Brain,
  Upload,
  Play,
  Pause,
  RotateCcw,
  TrendingUp,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Settings,
  BarChart3,
  FlaskConical,
} from 'lucide-react';
import { Card, Spinner, Alert, Badge, Button, Modal, Input, Textarea, Select } from '../components/ui';
import {
  useAvailableModels,
  useModelVersions,
  useLatestModelVersion,
  useModelVersion,
  useCreateModelVersion,
  useUpdateModelVersionStatus,
  useDeploymentHistory,
  useActiveDeployment,
  useDeployModel,
  useRollbackModel,
  useModelMetrics,
  useMetricsHistory,
  useModelDrift,
  useABTests,
  useABTest,
  useCreateABTest,
  useStartABTest,
  useStopABTest,
} from '../api/hooks';

export function ModelManagement(): JSX.Element {
  const [activeTab, setActiveTab] = useState('models');
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [showABTestModal, setShowABTestModal] = useState(false);
  const [deployForm, setDeployForm] = useState({
    version: '',
    deploymentType: 'canary' as 'blue-green' | 'canary' | 'rolling',
    environment: 'production',
    replicas: 1,
    canaryPercentage: 10,
    autoRollback: true,
  });
  const [versionForm, setVersionForm] = useState({
    version: '',
    description: '',
    artifactPath: '',
    config: '{}',
    trainingMetrics: '{}',
    tags: '',
  });
  const [abTestForm, setABTestForm] = useState({
    name: '',
    modelIds: [] as string[],
    trafficAllocation: '50:50',
    minSampleSize: 1000,
    primaryMetric: 'detectionEvasionRate',
    autoStart: false,
  });

  const { data: modelsData, isLoading: isLoadingModels } = useAvailableModels();
  const { data: versionsData, isLoading: isLoadingVersions } = useModelVersions(selectedModelId);
  const { data: latestVersion } = useLatestModelVersion(selectedModelId);
  const { data: deploymentHistory, isLoading: isLoadingDeployments } = useDeploymentHistory(selectedModelId);
  const { data: activeDeployment } = useActiveDeployment(selectedModelId);
  const { data: metricsData, isLoading: isLoadingMetrics } = useModelMetrics(selectedModelId);
  const { data: metricsHistory } = useMetricsHistory(selectedModelId, 30);
  const { data: driftData } = useModelDrift(selectedModelId);
  const { data: abTestsData, isLoading: isLoadingABTests } = useABTests();
  const deployModelMutation = useDeployModel();
  const rollbackModelMutation = useRollbackModel();
  const createVersionMutation = useCreateModelVersion();
  const createABTestMutation = useCreateABTest();
  const startABTestMutation = useStartABTest();
  const stopABTestMutation = useStopABTest();

  const models = modelsData?.models || [];
  const versions = versionsData || [];
  const deployments = deploymentHistory || [];
  const metrics = metricsData;
  const metricsHistoryData = metricsHistory || [];
  const abTests = abTestsData || [];

  const handleDeploy = async () => {
    if (!selectedModelId || !deployForm.version) return;
    try {
      await deployModelMutation.mutateAsync({
        modelId: selectedModelId,
        version: deployForm.version,
        deploymentType: deployForm.deploymentType,
        environment: deployForm.environment,
        replicas: deployForm.replicas,
        canaryPercentage: deployForm.canaryPercentage,
        autoRollback: deployForm.autoRollback,
      });
      setShowDeployModal(false);
      setDeployForm({
        version: '',
        deploymentType: 'canary',
        environment: 'production',
        replicas: 1,
        canaryPercentage: 10,
        autoRollback: true,
      });
    } catch (error) {
      console.error('Failed to deploy model:', error);
    }
  };

  const handleCreateVersion = async () => {
    if (!selectedModelId || !versionForm.version || !versionForm.artifactPath || !versionForm.config) return;
    try {
      await createVersionMutation.mutateAsync({
        modelId: selectedModelId,
        version: versionForm.version,
        description: versionForm.description,
        artifactPath: versionForm.artifactPath,
        config: JSON.parse(versionForm.config),
        trainingMetrics: versionForm.trainingMetrics ? JSON.parse(versionForm.trainingMetrics) : undefined,
        tags: versionForm.tags ? versionForm.tags.split(',').map((t) => t.trim()) : undefined,
      });
      setShowVersionModal(false);
      setVersionForm({
        version: '',
        description: '',
        artifactPath: '',
        config: '{}',
        trainingMetrics: '{}',
        tags: '',
      });
    } catch (error) {
      console.error('Failed to create version:', error);
    }
  };

  const handleRollback = async (previousVersion: string) => {
    if (!selectedModelId) return;
    if (!confirm(`Are you sure you want to rollback to version ${previousVersion}?`)) return;
    try {
      await rollbackModelMutation.mutateAsync({
        modelId: selectedModelId,
        previousVersion,
      });
    } catch (error) {
      console.error('Failed to rollback model:', error);
    }
  };

  const handleCreateABTest = async () => {
    if (!abTestForm.name || abTestForm.modelIds.length < 2) return;
    const allocation = abTestForm.trafficAllocation.split(':').map(Number);
    const trafficAllocation: Record<string, number> = {};
    abTestForm.modelIds.forEach((modelId, index) => {
      trafficAllocation[modelId] = allocation[index] || 50;
    });
    try {
      await createABTestMutation.mutateAsync({
        name: abTestForm.name,
        modelIds: abTestForm.modelIds,
        trafficAllocation,
        minSampleSize: abTestForm.minSampleSize,
        primaryMetric: abTestForm.primaryMetric,
        autoStart: abTestForm.autoStart,
      });
      setShowABTestModal(false);
      setABTestForm({
        name: '',
        modelIds: [],
        trafficAllocation: '50:50',
        minSampleSize: 1000,
        primaryMetric: 'detectionEvasionRate',
        autoStart: false,
      });
    } catch (error) {
      console.error('Failed to create A/B test:', error);
    }
  };

  const tabs = [
    { id: 'models', label: 'Models', icon: Brain },
    { id: 'versions', label: 'Versions', icon: Settings },
    { id: 'deployments', label: 'Deployments', icon: Play },
    { id: 'metrics', label: 'Metrics', icon: BarChart3 },
    { id: 'drift', label: 'Drift Detection', icon: AlertTriangle },
    { id: 'ab-tests', label: 'A/B Tests', icon: FlaskConical },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gradient mb-2">Model Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage ML models, versions, deployments, and A/B tests</p>
        </div>
        {selectedModelId && (
          <div className="flex gap-2">
            <Button onClick={() => setShowVersionModal(true)} variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              New Version
            </Button>
            <Button onClick={() => setShowDeployModal(true)} variant="primary">
              <Play className="w-4 h-4 mr-2" />
              Deploy
            </Button>
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-primary-600 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Models Tab */}
      {activeTab === 'models' && (
        <div className="space-y-6">
          {isLoadingModels ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : models.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {models.map((model) => (
                <Card
                  key={model.id}
                  className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
                    selectedModelId === model.id ? 'ring-2 ring-primary-500' : ''
                  }`}
                  onClick={() => setSelectedModelId(model.id)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                        <Brain className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{model.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{model.type}</p>
                      </div>
                    </div>
                    <Badge variant={model.available ? 'success' : 'default'}>
                      {model.available ? 'Available' : 'Unavailable'}
                    </Badge>
                  </div>
                  {model.provider && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">Provider: {model.provider}</p>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <Alert variant="info">No models available</Alert>
          )}

          {selectedModelId && (
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Selected Model: {models.find((m) => m.id === selectedModelId)?.name}</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Model ID</p>
                  <p className="font-mono text-sm">{selectedModelId}</p>
                </div>
                {latestVersion && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Latest Version</p>
                    <Badge variant="info">{latestVersion.version}</Badge>
                  </div>
                )}
                {activeDeployment && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Active Deployment</p>
                    <Badge variant="success">{activeDeployment.version}</Badge>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Versions Tab */}
      {activeTab === 'versions' && (
        <div className="space-y-6">
          {!selectedModelId ? (
            <Alert variant="info">Please select a model first</Alert>
          ) : isLoadingVersions ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : versions.length > 0 ? (
            <div className="space-y-4">
              {versions.map((version) => (
                <Card key={version.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-lg">Version {version.version}</h3>
                        <Badge
                          variant={
                            version.status === 'active'
                              ? 'success'
                              : version.status === 'deprecated'
                              ? 'error'
                              : 'info'
                          }
                        >
                          {version.status}
                        </Badge>
                      </div>
                      {version.description && (
                        <p className="text-gray-600 dark:text-gray-400 mb-2">{version.description}</p>
                      )}
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Created: {new Date(version.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {version.status !== 'active' && (
                        <Button
                          onClick={() => handleRollback(version.version)}
                          variant="outline"
                          size="sm"
                          disabled={rollbackModelMutation.isPending}
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Rollback
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Alert variant="info">No versions found for this model</Alert>
          )}
        </div>
      )}

      {/* Deployments Tab */}
      {activeTab === 'deployments' && (
        <div className="space-y-6">
          {!selectedModelId ? (
            <Alert variant="info">Please select a model first</Alert>
          ) : isLoadingDeployments ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : deployments.length > 0 ? (
            <div className="space-y-4">
              {deployments.map((deployment) => (
                <Card key={deployment.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-lg">Deployment {deployment.version}</h3>
                        <Badge
                          variant={
                            deployment.status === 'active'
                              ? 'success'
                              : deployment.status === 'failed'
                              ? 'error'
                              : 'info'
                          }
                        >
                          {deployment.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Type</p>
                          <p className="font-semibold">{deployment.deploymentType}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Environment</p>
                          <p className="font-semibold">{deployment.environment}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Deployed At</p>
                          <p className="font-semibold text-sm">{new Date(deployment.deployedAt).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Alert variant="info">No deployments found for this model</Alert>
          )}
        </div>
      )}

      {/* Metrics Tab */}
      {activeTab === 'metrics' && (
        <div className="space-y-6">
          {!selectedModelId ? (
            <Alert variant="info">Please select a model first</Alert>
          ) : isLoadingMetrics ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : metrics ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-6">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Accuracy</h3>
                  <p className="text-2xl font-bold">{(metrics.accuracy * 100).toFixed(2)}%</p>
                </Card>
                <Card className="p-6">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Latency</h3>
                  <p className="text-2xl font-bold">{metrics.latency.toFixed(2)}ms</p>
                </Card>
                <Card className="p-6">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Throughput</h3>
                  <p className="text-2xl font-bold">{metrics.throughput.toFixed(2)} req/s</p>
                </Card>
                <Card className="p-6">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Detection Evasion</h3>
                  <p className="text-2xl font-bold">{(metrics.detectionEvasionRate * 100).toFixed(2)}%</p>
                </Card>
                <Card className="p-6">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Error Rate</h3>
                  <p className="text-2xl font-bold">{(metrics.errorRate * 100).toFixed(2)}%</p>
                </Card>
                <Card className="p-6">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Requests</h3>
                  <p className="text-2xl font-bold">{metrics.totalRequests}</p>
                </Card>
              </div>

              {metricsHistoryData.length > 0 && (
                <Card className="p-6">
                  <h2 className="text-xl font-bold mb-4">Metrics History</h2>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {metricsHistoryData.map((entry, index) => (
                      <div
                        key={index}
                        className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(entry.timestamp).toLocaleString()}
                          </span>
                          <div className="flex gap-4">
                            <span className="text-sm">Accuracy: {(entry.accuracy * 100).toFixed(2)}%</span>
                            <span className="text-sm">Latency: {entry.latency.toFixed(2)}ms</span>
                            <span className="text-sm">Error Rate: {(entry.errorRate * 100).toFixed(2)}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          ) : (
            <Alert variant="info">No metrics available for this model</Alert>
          )}
        </div>
      )}

      {/* Drift Detection Tab */}
      {activeTab === 'drift' && (
        <div className="space-y-6">
          {!selectedModelId ? (
            <Alert variant="info">Please select a model first</Alert>
          ) : !driftData ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : (
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle
                  className={`w-6 h-6 ${
                    driftData.driftDetected ? 'text-red-500' : 'text-green-500'
                  }`}
                />
                <h2 className="text-xl font-bold">Drift Detection Report</h2>
                <Badge variant={driftData.driftDetected ? 'error' : 'success'}>
                  {driftData.driftDetected ? 'Drift Detected' : 'No Drift'}
                </Badge>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Severity</p>
                  <Badge variant={driftData.severity === 'high' ? 'error' : driftData.severity === 'medium' ? 'warning' : 'info'}>
                    {driftData.severity}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Drift Score</p>
                  <p className="text-2xl font-bold">{driftData.driftScore.toFixed(2)}</p>
                </div>
                {driftData.recommendations.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Recommendations</p>
                    <ul className="list-disc list-inside space-y-1">
                      {driftData.recommendations.map((rec, index) => (
                        <li key={index} className="text-sm text-gray-700 dark:text-gray-300">
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* A/B Tests Tab */}
      {activeTab === 'ab-tests' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">A/B Tests</h2>
            <Button onClick={() => setShowABTestModal(true)} variant="primary">
              <FlaskConical className="w-4 h-4 mr-2" />
              Create A/B Test
            </Button>
          </div>
          {isLoadingABTests ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : abTests.length > 0 ? (
            <div className="space-y-4">
              {abTests.map((test) => (
                <Card key={test.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-lg">{test.name}</h3>
                        <Badge
                          variant={
                            test.status === 'running'
                              ? 'success'
                              : test.status === 'completed'
                              ? 'info'
                              : 'default'
                          }
                        >
                          {test.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Models: {test.modelIds.join(', ')}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Created: {new Date(test.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {test.status === 'draft' && (
                        <Button
                          onClick={() => startABTestMutation.mutate(test.id)}
                          variant="outline"
                          size="sm"
                          disabled={startABTestMutation.isPending}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Start
                        </Button>
                      )}
                      {test.status === 'running' && (
                        <Button
                          onClick={() => stopABTestMutation.mutate(test.id)}
                          variant="outline"
                          size="sm"
                          disabled={stopABTestMutation.isPending}
                        >
                          <Pause className="w-4 h-4 mr-2" />
                          Stop
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Alert variant="info">No A/B tests found</Alert>
          )}
        </div>
      )}

      {/* Deploy Modal */}
      <Modal
        isOpen={showDeployModal}
        title="Deploy Model"
        onClose={() => setShowDeployModal(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowDeployModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleDeploy}
              disabled={!deployForm.version || deployModelMutation.isPending}
            >
              Deploy
            </Button>
          </>
        }
      >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Version</label>
              <Input
                value={deployForm.version}
                onChange={(e) => setDeployForm({ ...deployForm, version: e.target.value })}
                placeholder="e.g., 1.2.3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Deployment Type</label>
              <Select
                value={deployForm.deploymentType}
                onChange={(e) =>
                  setDeployForm({ ...deployForm, deploymentType: e.target.value as any })
                }
                options={[
                  { value: 'canary', label: 'Canary' },
                  { value: 'blue-green', label: 'Blue-Green' },
                  { value: 'rolling', label: 'Rolling' },
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Environment</label>
              <Input
                value={deployForm.environment}
                onChange={(e) => setDeployForm({ ...deployForm, environment: e.target.value })}
                placeholder="production"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Replicas</label>
              <Input
                type="number"
                value={deployForm.replicas}
                onChange={(e) => setDeployForm({ ...deployForm, replicas: parseInt(e.target.value) || 1 })}
              />
            </div>
            {deployForm.deploymentType === 'canary' && (
              <div>
                <label className="block text-sm font-medium mb-2">Canary Percentage</label>
                <Input
                  type="number"
                  value={deployForm.canaryPercentage}
                  onChange={(e) =>
                    setDeployForm({ ...deployForm, canaryPercentage: parseInt(e.target.value) || 10 })
                  }
                />
              </div>
            )}
          </div>
        </Modal>

      {/* Version Modal */}
      <Modal
        isOpen={showVersionModal}
        title="Create Model Version"
        onClose={() => setShowVersionModal(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowVersionModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateVersion}
              disabled={!versionForm.version || !versionForm.artifactPath || createVersionMutation.isPending}
            >
              Create Version
            </Button>
          </>
        }
      >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Version</label>
              <Input
                value={versionForm.version}
                onChange={(e) => setVersionForm({ ...versionForm, version: e.target.value })}
                placeholder="e.g., 1.2.3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <Textarea
                value={versionForm.description}
                onChange={(e) => setVersionForm({ ...versionForm, description: e.target.value })}
                placeholder="Version description"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Artifact Path</label>
              <Input
                value={versionForm.artifactPath}
                onChange={(e) => setVersionForm({ ...versionForm, artifactPath: e.target.value })}
                placeholder="/path/to/model.artifact"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Config (JSON)</label>
              <Textarea
                value={versionForm.config}
                onChange={(e) => setVersionForm({ ...versionForm, config: e.target.value })}
                placeholder='{"key": "value"}'
                rows={4}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Training Metrics (JSON, optional)</label>
              <Textarea
                value={versionForm.trainingMetrics}
                onChange={(e) => setVersionForm({ ...versionForm, trainingMetrics: e.target.value })}
                placeholder='{"accuracy": 0.95}'
                rows={4}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Tags (comma-separated)</label>
              <Input
                value={versionForm.tags}
                onChange={(e) => setVersionForm({ ...versionForm, tags: e.target.value })}
                placeholder="production, stable"
              />
            </div>
          </div>
        </Modal>

      {/* A/B Test Modal */}
      <Modal
        isOpen={showABTestModal}
        title="Create A/B Test"
        onClose={() => setShowABTestModal(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowABTestModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateABTest}
              disabled={!abTestForm.name || abTestForm.modelIds.length < 2 || createABTestMutation.isPending}
            >
              Create Test
            </Button>
          </>
        }
      >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Test Name</label>
              <Input
                value={abTestForm.name}
                onChange={(e) => setABTestForm({ ...abTestForm, name: e.target.value })}
                placeholder="A/B Test Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Select Models (at least 2)</label>
              <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2">
                {models.map((model) => (
                  <label key={model.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={abTestForm.modelIds.includes(model.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setABTestForm({ ...abTestForm, modelIds: [...abTestForm.modelIds, model.id] });
                        } else {
                          setABTestForm({
                            ...abTestForm,
                            modelIds: abTestForm.modelIds.filter((id) => id !== model.id),
                          });
                        }
                      }}
                    />
                    <span>{model.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Traffic Allocation (e.g., 50:50)</label>
              <Input
                value={abTestForm.trafficAllocation}
                onChange={(e) => setABTestForm({ ...abTestForm, trafficAllocation: e.target.value })}
                placeholder="50:50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Min Sample Size</label>
              <Input
                type="number"
                value={abTestForm.minSampleSize}
                onChange={(e) =>
                  setABTestForm({ ...abTestForm, minSampleSize: parseInt(e.target.value) || 1000 })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Primary Metric</label>
              <Select
                value={abTestForm.primaryMetric}
                onChange={(e) => setABTestForm({ ...abTestForm, primaryMetric: e.target.value })}
                options={[
                  { value: 'detectionEvasionRate', label: 'Detection Evasion Rate' },
                  { value: 'accuracy', label: 'Accuracy' },
                  { value: 'latency', label: 'Latency' },
                  { value: 'throughput', label: 'Throughput' },
                ]}
              />
            </div>
          </div>
        </Modal>
    </div>
  );
}
