import { useState, useMemo, useEffect } from 'react';
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
  Search,
  Filter,
  X,
  Info,
  GitBranch,
  Server,
} from 'lucide-react';
import { Card, Spinner, Alert, Badge, Button, Modal, Input, Textarea, Select, Checkbox } from '../components/ui';
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
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const [modelFilterType, setModelFilterType] = useState<string>('all');
  const [modelFilterProvider, setModelFilterProvider] = useState<string>('all');
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [versionStatusFilter, setVersionStatusFilter] = useState<string>('all');
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
  const { data: versionsData, isLoading: isLoadingVersions, error: versionsError } = useModelVersions(selectedModelId);
  const { data: latestVersion, error: latestVersionError } = useLatestModelVersion(selectedModelId);
  const { data: deploymentHistory, isLoading: isLoadingDeployments, error: deploymentsError } = useDeploymentHistory(selectedModelId);
  const { data: activeDeployment, error: activeDeploymentError } = useActiveDeployment(selectedModelId);
  const { data: metricsData, isLoading: isLoadingMetrics, error: metricsError } = useModelMetrics(selectedModelId);
  const { data: metricsHistory, error: metricsHistoryError } = useMetricsHistory(selectedModelId, 30);
  const { data: driftData, error: driftError } = useModelDrift(selectedModelId);
  const { data: abTestsData, isLoading: isLoadingABTests } = useABTests();
  const deployModelMutation = useDeployModel();
  const rollbackModelMutation = useRollbackModel();
  const createVersionMutation = useCreateModelVersion();
  const updateVersionStatusMutation = useUpdateModelVersionStatus();
  const createABTestMutation = useCreateABTest();
  const startABTestMutation = useStartABTest();
  const stopABTestMutation = useStopABTest();

  const models = modelsData?.models || [];
  // Filter out LLM models - they're external APIs and can't be versioned/deployed
  // This page is for managing CUSTOM ML models only
  const customModels = models.filter(model => 
    model.type !== 'llm' && !model.id.startsWith('llm-')
  );
  // Handle errors gracefully - 404s are expected for models without versions/deployments
  const versions = versionsData || [];
  const deployments = deploymentHistory || [];
  const metrics = metricsData;
  const metricsHistoryData = metricsHistory || [];
  const abTests = abTestsData || [];
  
  // Check if errors are 404s (expected) vs 500s (actual errors)
  const isExpected404 = (error: any) => {
    if (!error) return false;
    try {
      const errorMessage = error?.message || '';
      const errorStatus = typeof error?.status === 'number' ? error.status : 
        (errorMessage.includes('404') ? 404 : null);
      return errorStatus === 404 || errorMessage.includes('404') || errorMessage.includes('Not Found');
    } catch {
      return false;
    }
  };

  // Show error alerts for actual errors (not 404s)
  const hasRealError = (error: any) => {
    if (!error) return false;
    if (isExpected404(error)) return false;
    try {
      const errorMessage = error?.message || '';
      const errorStatus = typeof error?.status === 'number' ? error.status : 
        (errorMessage.includes('500') ? 500 : null);
      // Only show errors for 500s, not 404s
      return errorStatus === 500 || errorMessage.includes('500') || errorMessage.includes('Internal Server Error');
    } catch {
      return false;
    }
  };

  // Auto-select latest version when versions are loaded and deploy form is empty
  useEffect(() => {
    if (versions.length > 0 && selectedModelId && !deployForm.version) {
      const defaultVersion = latestVersion?.version || versions.find(v => v.status === 'active' || v.status === 'draft')?.version || versions[0]?.version;
      if (defaultVersion) {
        setDeployForm(prev => ({ ...prev, version: defaultVersion }));
      }
    }
  }, [versions, latestVersion, selectedModelId, deployForm.version]);

  // Filter versions by status
  const filteredVersions = useMemo(() => {
    if (versionStatusFilter === 'all') return versions;
    return versions.filter((v) => v.status === versionStatusFilter);
  }, [versions, versionStatusFilter]);
  
  const handleVersionStatusChange = async (versionId: string, newStatus: string) => {
    try {
      await updateVersionStatusMutation.mutateAsync({ versionId, status: newStatus });
    } catch (error) {
      console.error('Failed to update version status:', error);
    }
  };

  // Filter and search models (only custom models, not LLM APIs)
  const filteredModels = useMemo(() => {
    return customModels.filter((model) => {
      const matchesSearch = modelSearchQuery === '' || 
        model.name.toLowerCase().includes(modelSearchQuery.toLowerCase()) ||
        model.id.toLowerCase().includes(modelSearchQuery.toLowerCase()) ||
        (model.provider && model.provider.toLowerCase().includes(modelSearchQuery.toLowerCase()));
      
      const matchesType = modelFilterType === 'all' || model.type === modelFilterType;
      const matchesProvider = modelFilterProvider === 'all' || model.provider === modelFilterProvider;
      
      return matchesSearch && matchesType && matchesProvider;
    });
  }, [models, modelSearchQuery, modelFilterType, modelFilterProvider]);

  const modelTypes = useMemo(() => {
    const types = new Set(customModels.map((m) => m.type));
    return Array.from(types);
  }, [customModels]);

  const modelProviders = useMemo(() => {
    const providers = new Set(customModels.filter((m) => m.provider).map((m) => m.provider!));
    return Array.from(providers);
  }, [customModels]);

  const validateDeployForm = () => {
    const errors: Record<string, string> = {};
    if (!deployForm.version.trim()) {
      errors.version = 'Version is required';
    } else {
      // Validate that the version exists
      const versionExists = versions.some(v => v.version === deployForm.version.trim());
      if (!versionExists) {
        errors.version = 'Selected version does not exist. Please create a version first.';
      } else {
        // Check if version is ready for deployment
        const version = versions.find(v => v.version === deployForm.version.trim());
        if (version && version.status !== 'active' && version.status !== 'draft') {
          errors.version = `Version ${version.version} is ${version.status} and cannot be deployed.`;
        }
      }
    }
    if (deployForm.replicas < 1) {
      errors.replicas = 'Replicas must be at least 1';
    }
    if (deployForm.deploymentType === 'canary' && (deployForm.canaryPercentage < 1 || deployForm.canaryPercentage > 100)) {
      errors.canaryPercentage = 'Canary percentage must be between 1 and 100';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleDeploy = async () => {
    if (!selectedModelId) return;
    if (!validateDeployForm()) return;
    
    setFormErrors({});
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
      // Reset to latest version if available, otherwise empty
      const defaultVersion = latestVersion?.version || (versions.length > 0 ? versions.find(v => v.status === 'active' || v.status === 'draft')?.version || versions[0]?.version : '') || '';
      setDeployForm({
        version: defaultVersion,
        deploymentType: 'canary',
        environment: 'production',
        replicas: 1,
        canaryPercentage: 10,
        autoRollback: true,
      });
      setFormErrors({});
    } catch (error: any) {
      setFormErrors({ 
        general: error?.message || 'Failed to deploy model. Please try again.' 
      });
    }
  };

  const validateVersionForm = () => {
    const errors: Record<string, string> = {};
    if (!versionForm.version.trim()) {
      errors.version = 'Version is required';
    } else if (!/^\d+\.\d+\.\d+$/.test(versionForm.version.trim())) {
      errors.version = 'Version must be in semver format (e.g., 1.2.3)';
    }
    if (!versionForm.artifactPath.trim()) {
      errors.artifactPath = 'Artifact path is required';
    }
    if (!versionForm.config.trim()) {
      errors.config = 'Config is required';
    } else {
      try {
        JSON.parse(versionForm.config);
      } catch {
        errors.config = 'Config must be valid JSON';
      }
    }
    if (versionForm.trainingMetrics && versionForm.trainingMetrics.trim()) {
      try {
        JSON.parse(versionForm.trainingMetrics);
      } catch {
        errors.trainingMetrics = 'Training metrics must be valid JSON';
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateVersion = async () => {
    if (!selectedModelId) return;
    if (!validateVersionForm()) return;
    
    setFormErrors({});
    try {
      await createVersionMutation.mutateAsync({
        modelId: selectedModelId,
        version: versionForm.version.trim(),
        description: versionForm.description.trim() || undefined,
        artifactPath: versionForm.artifactPath.trim(),
        config: JSON.parse(versionForm.config),
        trainingMetrics: versionForm.trainingMetrics.trim() ? JSON.parse(versionForm.trainingMetrics) : undefined,
        tags: versionForm.tags.trim() ? versionForm.tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
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
      setFormErrors({});
    } catch (error: any) {
      setFormErrors({ 
        general: error?.message || 'Failed to create version. Please try again.' 
      });
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

  const validateABTestForm = () => {
    const errors: Record<string, string> = {};
    if (!abTestForm.name.trim()) {
      errors.name = 'Test name is required';
    }
    if (abTestForm.modelIds.length < 2) {
      errors.modelIds = 'At least 2 models must be selected';
    }
    const allocation = abTestForm.trafficAllocation.split(':').map(Number);
    const total = allocation.reduce((sum, val) => sum + val, 0);
    if (total !== 100) {
      errors.trafficAllocation = 'Traffic allocation must sum to 100';
    }
    if (abTestForm.minSampleSize < 100) {
      errors.minSampleSize = 'Minimum sample size must be at least 100';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateABTest = async () => {
    if (!validateABTestForm()) return;
    
    const allocation = abTestForm.trafficAllocation.split(':').map(Number);
    const trafficAllocation: Record<string, number> = {};
    abTestForm.modelIds.forEach((modelId, index) => {
      trafficAllocation[modelId] = allocation[index] || Math.floor(100 / abTestForm.modelIds.length);
    });
    
    setFormErrors({});
    try {
      await createABTestMutation.mutateAsync({
        name: abTestForm.name.trim(),
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
      setFormErrors({});
    } catch (error: any) {
      setFormErrors({ 
        general: error?.message || 'Failed to create A/B test. Please try again.' 
      });
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
                  <p className="text-gray-600 dark:text-gray-400">
                    Manage custom ML models, versions, deployments, and A/B tests
                    {customModels.length === 0 && models.length > 0 && (
                      <span className="block text-sm text-warning-600 dark:text-warning-400 mt-1">
                        Note: LLM models (Claude, GPT, etc.) are external APIs and cannot be managed here. 
                        Create custom ML models to use this interface.
                      </span>
                    )}
                  </p>
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
          {/* Search and Filters */}
          <Card className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    value={modelSearchQuery}
                    onChange={(e) => setModelSearchQuery(e.target.value)}
                    placeholder="Search models by name, ID, or provider..."
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select
                  value={modelFilterType}
                  onChange={(e) => setModelFilterType(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Types' },
                    ...modelTypes.map((type) => ({ value: type, label: type.toUpperCase() })),
                  ]}
                />
                <Select
                  value={modelFilterProvider}
                  onChange={(e) => setModelFilterProvider(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Providers' },
                    ...modelProviders.map((provider) => ({ value: provider, label: provider })),
                  ]}
                />
                {(modelSearchQuery || modelFilterType !== 'all' || modelFilterProvider !== 'all') && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setModelSearchQuery('');
                      setModelFilterType('all');
                      setModelFilterProvider('all');
                    }}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {isLoadingModels ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : filteredModels.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {filteredModels.length} of {customModels.length} custom model{customModels.length !== 1 ? 's' : ''}
                  {models.length > customModels.length && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      ({models.length - customModels.length} LLM models excluded)
                    </span>
                  )}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredModels.map((model) => {
                  const isSelected = selectedModelId === model.id;
                  return (
                    <Card
                      key={model.id}
                      className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
                        isSelected ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/20' : ''
                      }`}
                      onClick={() => setSelectedModelId(model.id)}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Brain className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-lg truncate">{model.name}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{model.type}</p>
                          </div>
                        </div>
                        <Badge variant={model.available ? 'success' : 'gray'}>
                          {model.available ? 'Available' : 'Unavailable'}
                        </Badge>
                      </div>
                      
                      {model.provider && (
                        <div className="flex items-center gap-2 mb-3">
                          <Server className="w-4 h-4 text-gray-400" />
                          <p className="text-sm text-gray-600 dark:text-gray-400">{model.provider}</p>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                        {selectedModelId === model.id ? (
                          <>
                            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                              <GitBranch className="w-3 h-3" />
                              <span>{latestVersion?.version || 'No version'}</span>
                            </div>
                            {activeDeployment && (
                              <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                                <CheckCircle className="w-3 h-3" />
                                <span>Deployed</span>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <span>Click to view details</span>
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </>
          ) : (
            <Alert variant="info">
              {customModels.length === 0 
                ? 'No custom ML models available. LLM models (Claude, GPT, etc.) are external APIs and cannot be managed here. Create a custom ML model to use this interface.'
                : 'No models match your filters'}
            </Alert>
          )}

          {selectedModelId && (
            <Card className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold mb-1">
                    {models.find((m) => m.id === selectedModelId)?.name}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{selectedModelId}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedModelId(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Model Type</p>
                    <Badge variant="primary">{models.find((m) => m.id === selectedModelId)?.type}</Badge>
                  </div>
                  {models.find((m) => m.id === selectedModelId)?.provider && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Provider</p>
                      <p className="text-sm">{models.find((m) => m.id === selectedModelId)?.provider}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status</p>
                    <Badge variant={models.find((m) => m.id === selectedModelId)?.available ? 'success' : 'gray'}>
                      {models.find((m) => m.id === selectedModelId)?.available ? 'Available' : 'Unavailable'}
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {latestVersion && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Latest Version</p>
                      <Badge variant="primary">{latestVersion.version}</Badge>
                    </div>
                  )}
                  {activeDeployment && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Active Deployment</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="success">{activeDeployment.version}</Badge>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {activeDeployment.deploymentType}
                        </span>
                      </div>
                    </div>
                  )}
                  {!latestVersion && !activeDeployment && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      No versions or deployments yet
                    </div>
                  )}
                </div>
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
          ) : (
            <>
              {/* Version Filters and Actions */}
              <Card className="p-4">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="flex gap-2 flex-1">
                    <Select
                      value={versionStatusFilter}
                      onChange={(e) => setVersionStatusFilter(e.target.value)}
                      options={[
                        { value: 'all', label: 'All Statuses' },
                        { value: 'active', label: 'Active' },
                        { value: 'draft', label: 'Draft' },
                        { value: 'deprecated', label: 'Deprecated' },
                      ]}
                    />
                  </div>
                  <div className="flex gap-2">
                    {selectedVersions.length > 0 && (
                      <Button
                        variant="outline"
                        onClick={() => setSelectedVersions([])}
                        size="sm"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Clear Selection ({selectedVersions.length})
                      </Button>
                    )}
                    <Button onClick={() => setShowVersionModal(true)} variant="primary">
                      <Upload className="w-4 h-4 mr-2" />
                      New Version
                    </Button>
                  </div>
                </div>
              </Card>

              {isLoadingVersions ? (
                <div className="flex justify-center py-12">
                  <Spinner size="lg" />
                </div>
              ) : filteredVersions.length > 0 ? (
                <div className="space-y-4">
                  {filteredVersions.map((version) => {
                    const isSelected = selectedVersions.includes(version.id);
                    return (
                      <Card
                        key={version.id}
                        className={`p-6 transition-all ${
                          isSelected ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/20' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <Checkbox
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedVersions([...selectedVersions, version.id]);
                                  } else {
                                    setSelectedVersions(selectedVersions.filter((id) => id !== version.id));
                                  }
                                }}
                              />
                              <h3 className="font-bold text-lg">Version {version.version}</h3>
                              <Badge
                                variant={
                                  version.status === 'active'
                                    ? 'success'
                                    : version.status === 'deprecated'
                                    ? 'error'
                                    : 'primary'
                                }
                              >
                                {version.status}
                              </Badge>
                              {version.version === latestVersion?.version && (
                                <Badge variant="primary" size="sm">Latest</Badge>
                              )}
                            </div>
                            
                            {version.description && (
                              <p className="text-gray-600 dark:text-gray-400 mb-3">{version.description}</p>
                            )}
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                              <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Created</p>
                                <p className="text-sm">{new Date(version.createdAt).toLocaleDateString()}</p>
                                <p className="text-xs text-gray-400">{new Date(version.createdAt).toLocaleTimeString()}</p>
                              </div>
                              {(version as any).tags && (version as any).tags.length > 0 && (
                                <div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tags</p>
                                  <div className="flex flex-wrap gap-1">
                                    {(version as any).tags.map((tag: string, idx: number) => (
                                      <Badge key={idx} variant="gray" size="sm">{tag}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {(version as any).trainingMetrics && (
                                <div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Training Metrics</p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {Object.keys((version as any).trainingMetrics).length} metrics
                                  </p>
                                </div>
                              )}
                              <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Status</p>
                                <Select
                                  value={version.status}
                                  onChange={(e) => handleVersionStatusChange(version.id, e.target.value)}
                                  options={[
                                    { value: 'draft', label: 'Draft' },
                                    { value: 'active', label: 'Active' },
                                    { value: 'deprecated', label: 'Deprecated' },
                                  ]}
                                  disabled={updateVersionStatusMutation.isPending}
                                />
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-2 ml-4">
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
                            <Button
                              onClick={() => setShowDeployModal(true)}
                              variant="primary"
                              size="sm"
                              disabled={version.status === 'deprecated'}
                            >
                              <Play className="w-4 h-4 mr-2" />
                              Deploy
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Alert variant="info">
                  {versions.length === 0
                    ? 'No versions found for this model'
                    : 'No versions match the selected filter'}
                </Alert>
              )}
            </>
          )}
        </div>
      )}

      {/* Deployments Tab */}
      {activeTab === 'deployments' && (
        <div className="space-y-6">
          {!selectedModelId ? (
            <Alert variant="info">Please select a model first</Alert>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Deployment History</h2>
                {activeDeployment && (
                  <div className="flex items-center gap-2">
                    <Badge variant="success" dot>Active</Badge>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Version {activeDeployment.version}
                    </span>
                  </div>
                )}
              </div>

              {isLoadingDeployments ? (
                <div className="flex justify-center py-12">
                  <Spinner size="lg" />
                </div>
              ) : deployments.length > 0 ? (
                <div className="space-y-6">
                  {/* Timeline View */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Deployment Timeline</h3>
                    <div className="relative">
                      {/* Timeline line */}
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
                      
                      <div className="space-y-6">
                        {deployments.map((deployment, index) => {
                          const isActive = deployment.status === 'active';
                          const isFailed = deployment.status === 'failed';
                          const deploymentDate = new Date(deployment.deployedAt);
                          const timeAgo = Math.floor((Date.now() - deploymentDate.getTime()) / (1000 * 60));
                          
                          return (
                            <div key={deployment.id} className="relative flex items-start gap-4">
                              {/* Timeline dot */}
                              <div className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                isActive 
                                  ? 'bg-success-500 ring-4 ring-success-200 dark:ring-success-900' 
                                  : isFailed
                                  ? 'bg-error-500 ring-4 ring-error-200 dark:ring-error-900'
                                  : 'bg-primary-500 ring-4 ring-primary-200 dark:ring-primary-900'
                              }`}>
                                {isActive ? (
                                  <CheckCircle className="w-5 h-5 text-white" />
                                ) : isFailed ? (
                                  <XCircle className="w-5 h-5 text-white" />
                                ) : (
                                  <Clock className="w-5 h-5 text-white" />
                                )}
                              </div>
                              
                              {/* Content */}
                              <Card className={`flex-1 p-4 ${isActive ? 'ring-2 ring-success-500' : ''}`}>
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                      <h4 className="font-bold text-lg">Version {deployment.version}</h4>
                                      <Badge
                                        variant={
                                          deployment.status === 'active'
                                            ? 'success'
                                            : deployment.status === 'failed'
                                            ? 'error'
                                            : 'primary'
                                        }
                                      >
                                        {deployment.status}
                                      </Badge>
                                      {isActive && (
                                        <Badge variant="success" size="sm">Current</Badge>
                                      )}
                                    </div>
                                    
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                                      <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Deployment Type</p>
                                        <p className="text-sm font-semibold capitalize">{deployment.deploymentType}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Environment</p>
                                        <Badge variant="gray" size="sm">{deployment.environment}</Badge>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Deployed</p>
                                        <p className="text-sm font-semibold">{deploymentDate.toLocaleDateString()}</p>
                                        <p className="text-xs text-gray-400">
                                          {timeAgo < 60 
                                            ? `${timeAgo}m ago` 
                                            : timeAgo < 1440 
                                            ? `${Math.floor(timeAgo / 60)}h ago`
                                            : `${Math.floor(timeAgo / 1440)}d ago`
                                          }
                                        </p>
                                      </div>
                                      {(deployment as any).replicas && (
                                        <div>
                                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Replicas</p>
                                          <p className="text-sm font-semibold">{(deployment as any).replicas}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="flex flex-col gap-2 ml-4">
                                    {isActive && deployments.length > 1 && (
                                      <Button
                                        onClick={() => {
                                          const previousDeployment = deployments[index + 1];
                                          if (previousDeployment) {
                                            handleRollback(previousDeployment.version);
                                          }
                                        }}
                                        variant="outline"
                                        size="sm"
                                        disabled={rollbackModelMutation.isPending || index === deployments.length - 1}
                                      >
                                        <RotateCcw className="w-4 h-4 mr-2" />
                                        Rollback
                                      </Button>
                                    )}
                                    {!isActive && (
                                      <Button
                                        onClick={() => {
                                          setDeployForm({
                                            ...deployForm,
                                            version: deployment.version,
                                          });
                                          setShowDeployModal(true);
                                        }}
                                        variant="primary"
                                        size="sm"
                                      >
                                        <Play className="w-4 h-4 mr-2" />
                                        Redeploy
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </Card>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </Card>
                  
                  {/* Deployment Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {deployments.map((deployment) => (
                      <Card 
                        key={deployment.id} 
                        className={`p-6 ${deployment.status === 'active' ? 'ring-2 ring-success-500' : ''}`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-bold text-lg mb-1">Version {deployment.version}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {new Date(deployment.deployedAt).toLocaleString()}
                            </p>
                          </div>
                          <Badge
                            variant={
                              deployment.status === 'active'
                                ? 'success'
                                : deployment.status === 'failed'
                                ? 'error'
                                : 'primary'
                            }
                          >
                            {deployment.status}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Type</span>
                            <span className="text-sm font-semibold capitalize">{deployment.deploymentType}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Environment</span>
                            <Badge variant="gray" size="sm">{deployment.environment}</Badge>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <Alert variant="info">No deployments found for this model</Alert>
              )}
            </>
          )}
        </div>
      )}

      {/* Metrics Tab */}
      {activeTab === 'metrics' && (
        <div className="space-y-6">
          {!selectedModelId ? (
            <Alert variant="info">Please select a model first</Alert>
          ) : hasRealError(metricsError) ? (
            <Alert variant="error">
              Failed to load metrics. The model may not have any metrics data yet, or there was a server error.
            </Alert>
          ) : isLoadingMetrics ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : metrics ? (
            <>
              {/* Key Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Accuracy</h3>
                    <TrendingUp className="w-4 h-4 text-success-500" />
                  </div>
                  <p className="text-3xl font-bold mb-2">{(metrics.accuracy * 100).toFixed(2)}%</p>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-success-500 h-2 rounded-full transition-all"
                      style={{ width: `${metrics.accuracy * 100}%` }}
                    />
                  </div>
                </Card>
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Latency</h3>
                    <Clock className="w-4 h-4 text-primary-500" />
                  </div>
                  <p className="text-3xl font-bold">{metrics.latency.toFixed(2)}ms</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {metrics.latency < 100 ? 'Excellent' : metrics.latency < 500 ? 'Good' : 'Needs Improvement'}
                  </p>
                </Card>
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Throughput</h3>
                    <Activity className="w-4 h-4 text-primary-500" />
                  </div>
                  <p className="text-3xl font-bold">{metrics.throughput.toFixed(2)} req/s</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {metrics.throughput > 100 ? 'High' : metrics.throughput > 50 ? 'Medium' : 'Low'}
                  </p>
                </Card>
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Detection Evasion</h3>
                    <CheckCircle className="w-4 h-4 text-success-500" />
                  </div>
                  <p className="text-3xl font-bold">{(metrics.detectionEvasionRate * 100).toFixed(2)}%</p>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                    <div 
                      className="bg-success-500 h-2 rounded-full transition-all"
                      style={{ width: `${metrics.detectionEvasionRate * 100}%` }}
                    />
                  </div>
                </Card>
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Error Rate</h3>
                    <AlertTriangle className="w-4 h-4 text-error-500" />
                  </div>
                  <p className="text-3xl font-bold">{(metrics.errorRate * 100).toFixed(2)}%</p>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${
                        metrics.errorRate < 0.01 ? 'bg-success-500' : metrics.errorRate < 0.05 ? 'bg-warning-500' : 'bg-error-500'
                      }`}
                      style={{ width: `${Math.min(metrics.errorRate * 1000, 100)}%` }}
                    />
                  </div>
                </Card>
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Requests</h3>
                    <BarChart3 className="w-4 h-4 text-primary-500" />
                  </div>
                  <p className="text-3xl font-bold">{metrics.totalRequests.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">All time</p>
                </Card>
              </div>

              {/* Charts */}
              {metricsHistoryData.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Accuracy Trend Chart */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Accuracy Trend</h3>
                    <div className="h-64">
                      <svg width="100%" height="100%" className="overflow-visible">
                        <defs>
                          <linearGradient id="accuracyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="rgb(34, 197, 94)" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="rgb(34, 197, 94)" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        {(() => {
                          const data = metricsHistoryData.slice(-20).map((e) => e.accuracy * 100);
                          const max = Math.max(...data, 100);
                          const min = Math.min(...data, 0);
                          const range = max - min || 1;
                          const width = 100;
                          const height = 100;
                          const points = data.map((val, i) => {
                            const x = (i / (data.length - 1 || 1)) * width;
                            const y = height - ((val - min) / range) * height;
                            return `${x},${y}`;
                          }).join(' ');
                          const areaPoints = `${points} ${width},${height} 0,${height}`;
                          return (
                            <>
                              <polyline
                                points={points}
                                fill="none"
                                stroke="rgb(34, 197, 94)"
                                strokeWidth="2"
                                vectorEffect="non-scaling-stroke"
                              />
                              <polygon
                                points={areaPoints}
                                fill="url(#accuracyGradient)"
                                vectorEffect="non-scaling-stroke"
                              />
                            </>
                          );
                        })()}
                      </svg>
                    </div>
                  </Card>

                  {/* Latency Trend Chart */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Latency Trend</h3>
                    <div className="h-64">
                      <svg width="100%" height="100%" className="overflow-visible">
                        <defs>
                          <linearGradient id="latencyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        {(() => {
                          const data = metricsHistoryData.slice(-20).map((e) => e.latency);
                          const max = Math.max(...data, 1);
                          const min = Math.min(...data, 0);
                          const range = max - min || 1;
                          const width = 100;
                          const height = 100;
                          const points = data.map((val, i) => {
                            const x = (i / (data.length - 1 || 1)) * width;
                            const y = height - ((val - min) / range) * height;
                            return `${x},${y}`;
                          }).join(' ');
                          const areaPoints = `${points} ${width},${height} 0,${height}`;
                          return (
                            <>
                              <polyline
                                points={points}
                                fill="none"
                                stroke="rgb(59, 130, 246)"
                                strokeWidth="2"
                                vectorEffect="non-scaling-stroke"
                              />
                              <polygon
                                points={areaPoints}
                                fill="url(#latencyGradient)"
                                vectorEffect="non-scaling-stroke"
                              />
                            </>
                          );
                        })()}
                      </svg>
                    </div>
                  </Card>

                  {/* Throughput Trend Chart */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Throughput Trend</h3>
                    <div className="h-64">
                      <svg width="100%" height="100%" className="overflow-visible">
                        <defs>
                          <linearGradient id="throughputGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="rgb(20, 184, 166)" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="rgb(20, 184, 166)" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        {(() => {
                          const data = metricsHistoryData.slice(-20).map((e) => (e as any).throughput || 0);
                          const max = Math.max(...data, 1);
                          const min = Math.min(...data, 0);
                          const range = max - min || 1;
                          const width = 100;
                          const height = 100;
                          const points = data.map((val, i) => {
                            const x = (i / (data.length - 1 || 1)) * width;
                            const y = height - ((val - min) / range) * height;
                            return `${x},${y}`;
                          }).join(' ');
                          const areaPoints = `${points} ${width},${height} 0,${height}`;
                          return (
                            <>
                              <polyline
                                points={points}
                                fill="none"
                                stroke="rgb(20, 184, 166)"
                                strokeWidth="2"
                                vectorEffect="non-scaling-stroke"
                              />
                              <polygon
                                points={areaPoints}
                                fill="url(#throughputGradient)"
                                vectorEffect="non-scaling-stroke"
                              />
                            </>
                          );
                        })()}
                      </svg>
                    </div>
                  </Card>

                  {/* Error Rate Trend Chart */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Error Rate Trend</h3>
                    <div className="h-64">
                      <svg width="100%" height="100%" className="overflow-visible">
                        <defs>
                          <linearGradient id="errorGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="rgb(239, 68, 68)" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="rgb(239, 68, 68)" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        {(() => {
                          const data = metricsHistoryData.slice(-20).map((e) => e.errorRate * 100);
                          const max = Math.max(...data, 1);
                          const min = Math.min(...data, 0);
                          const range = max - min || 1;
                          const width = 100;
                          const height = 100;
                          const points = data.map((val, i) => {
                            const x = (i / (data.length - 1 || 1)) * width;
                            const y = height - ((val - min) / range) * height;
                            return `${x},${y}`;
                          }).join(' ');
                          const areaPoints = `${points} ${width},${height} 0,${height}`;
                          return (
                            <>
                              <polyline
                                points={points}
                                fill="none"
                                stroke="rgb(239, 68, 68)"
                                strokeWidth="2"
                                vectorEffect="non-scaling-stroke"
                              />
                              <polygon
                                points={areaPoints}
                                fill="url(#errorGradient)"
                                vectorEffect="non-scaling-stroke"
                              />
                            </>
                          );
                        })()}
                      </svg>
                    </div>
                  </Card>
                </div>
              )}

              {/* Metrics History Table */}
              {metricsHistoryData.length > 0 && (
                <Card className="p-6">
                  <h2 className="text-xl font-bold mb-4">Recent Metrics History</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-2 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Timestamp</th>
                          <th className="text-right py-2 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Accuracy</th>
                          <th className="text-right py-2 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Latency</th>
                          <th className="text-right py-2 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Throughput</th>
                          <th className="text-right py-2 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Error Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metricsHistoryData.slice(-10).reverse().map((entry, index) => (
                          <tr key={index} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                              {new Date(entry.timestamp).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-sm text-right font-semibold">
                              {(entry.accuracy * 100).toFixed(2)}%
                            </td>
                            <td className="py-3 px-4 text-sm text-right">
                              {entry.latency.toFixed(2)}ms
                            </td>
                            <td className="py-3 px-4 text-sm text-right">
                              {((entry as any).throughput || 0).toFixed(2)} req/s
                            </td>
                            <td className="py-3 px-4 text-sm text-right">
                              <span className={entry.errorRate > 0.05 ? 'text-error-500' : entry.errorRate > 0.01 ? 'text-warning-500' : 'text-success-500'}>
                                {(entry.errorRate * 100).toFixed(2)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
          ) : hasRealError(driftError) ? (
            <Alert variant="error">
              Failed to load drift detection data. The model may not have enough prediction logs yet, or there was a server error.
            </Alert>
          ) : driftData === undefined ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : driftData === null ? (
            <Alert variant="info">No drift data available. Model needs to be deployed and have prediction logs.</Alert>
          ) : (
            <>
              {/* Overall Drift Summary */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      driftData.driftDetected 
                        ? 'bg-error-100 dark:bg-error-900/30' 
                        : 'bg-success-100 dark:bg-success-900/30'
                    }`}>
                      <AlertTriangle
                        className={`w-6 h-6 ${
                          driftData.driftDetected ? 'text-error-500' : 'text-success-500'
                        }`}
                      />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Drift Detection Report</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Analyzed: {new Date((driftData as any).analyzedAt || Date.now()).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Badge 
                    variant={driftData.driftDetected ? 'error' : 'success'}
                    size="lg"
                  >
                    {driftData.driftDetected ? 'Drift Detected' : 'No Drift'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Overall Drift Score</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-3xl font-bold">{driftData.driftScore.toFixed(3)}</p>
                      <span className="text-sm text-gray-500">/ 1.0</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mt-2">
                      <div 
                        className={`h-3 rounded-full transition-all ${
                          driftData.driftScore > 0.7 ? 'bg-error-500' :
                          driftData.driftScore > 0.4 ? 'bg-warning-500' :
                          driftData.driftScore > 0.2 ? 'bg-primary-500' :
                          'bg-success-500'
                        }`}
                        style={{ width: `${driftData.driftScore * 100}%` }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Severity</p>
                    <Badge 
                      variant={
                        driftData.severity === 'high' || driftData.severity === 'critical' ? 'error' : 
                        driftData.severity === 'medium' ? 'warning' : 
                        driftData.severity === 'low' ? 'primary' : 
                        'success'
                      }
                      size="lg"
                    >
                      {driftData.severity || 'none'}
                    </Badge>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {driftData.severity === 'critical' ? 'Immediate action required' :
                       driftData.severity === 'high' ? 'Action recommended' :
                       driftData.severity === 'medium' ? 'Monitor closely' :
                       driftData.severity === 'low' ? 'Minor concern' :
                       'No issues detected'}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Analysis Period</p>
                    {(driftData as any).baselinePeriod && (
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Baseline: {new Date((driftData as any).baselinePeriod.start).toLocaleDateString()} - {new Date((driftData as any).baselinePeriod.end).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Current: {new Date((driftData as any).currentPeriod?.start || Date.now()).toLocaleDateString()} - {new Date((driftData as any).currentPeriod?.end || Date.now()).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* Feature Drift Details */}
              {(driftData as any).featureDrift && (driftData as any).featureDrift.length > 0 && (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Feature-Level Drift Analysis</h3>
                  <div className="space-y-4">
                    {(driftData as any).featureDrift.map((feature: any, index: number) => (
                      <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{feature.featureName}</h4>
                            <Badge 
                              variant={feature.driftDetected ? 'error' : 'success'}
                              size="sm"
                            >
                              {feature.driftDetected ? 'Drift' : 'Normal'}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">Score: {feature.driftScore.toFixed(3)}</p>
                            <p className="text-xs text-gray-500">p-value: {feature.pValue?.toFixed(4) || 'N/A'}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Baseline Stats</p>
                            {feature.baselineStats && (
                              <div className="text-sm space-y-1">
                                <p>Mean: {feature.baselineStats.mean?.toFixed(2) || 'N/A'}</p>
                                <p>Std: {feature.baselineStats.stdDev?.toFixed(2) || 'N/A'}</p>
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current Stats</p>
                            {feature.currentStats && (
                              <div className="text-sm space-y-1">
                                <p>Mean: {feature.currentStats.mean?.toFixed(2) || 'N/A'}</p>
                                <p>Std: {feature.currentStats.stdDev?.toFixed(2) || 'N/A'}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all ${
                              feature.driftScore > 0.7 ? 'bg-error-500' :
                              feature.driftScore > 0.4 ? 'bg-warning-500' :
                              'bg-primary-500'
                            }`}
                            style={{ width: `${feature.driftScore * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Prediction Drift */}
              {(driftData as any).predictionDrift && (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Prediction Distribution Drift</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Prediction Drift Detected</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          KL Divergence: {(driftData as any).predictionDrift.klDivergence?.toFixed(4) || 'N/A'}
                        </p>
                      </div>
                      <Badge 
                        variant={(driftData as any).predictionDrift.driftDetected ? 'error' : 'success'}
                      >
                        {(driftData as any).predictionDrift.driftDetected ? 'Drift' : 'Normal'}
                      </Badge>
                    </div>
                    
                    {(driftData as any).predictionDrift.baselineDistribution && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium mb-2">Baseline Distribution</p>
                          <div className="space-y-1">
                            {Object.entries((driftData as any).predictionDrift.baselineDistribution).map(([key, value]: [string, any]) => (
                              <div key={key} className="flex items-center justify-between text-sm">
                                <span>{key}</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div 
                                      className="bg-primary-500 h-2 rounded-full"
                                      style={{ width: `${(value as number) * 100}%` }}
                                    />
                                  </div>
                                  <span className="text-xs w-12 text-right">{(value * 100).toFixed(1)}%</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-2">Current Distribution</p>
                          <div className="space-y-1">
                            {Object.entries((driftData as any).predictionDrift.currentDistribution || {}).map(([key, value]: [string, any]) => (
                              <div key={key} className="flex items-center justify-between text-sm">
                                <span>{key}</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div 
                                      className="bg-primary-500 h-2 rounded-full"
                                      style={{ width: `${(value as number) * 100}%` }}
                                    />
                                  </div>
                                  <span className="text-xs w-12 text-right">{(value * 100).toFixed(1)}%</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Recommendations */}
              {driftData.recommendations && driftData.recommendations.length > 0 && (
                <Card className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-5 h-5 text-warning-500" />
                    <h3 className="text-lg font-semibold">Recommendations</h3>
                  </div>
                  <ul className="space-y-3">
                    {driftData.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">
                            {index + 1}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 flex-1">{rec}</p>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* A/B Tests Tab */}
      {activeTab === 'ab-tests' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">A/B Tests</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Compare model performance with controlled traffic allocation
              </p>
            </div>
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
            <div className="space-y-6">
              {abTests.map((test) => {
                const testResults = (test as any).results;
                const trafficAllocation = (test as any).trafficAllocation || {};
                const isRunning = test.status === 'running';
                const isCompleted = test.status === 'completed';
                
                return (
                  <Card key={test.id} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <FlaskConical className="w-5 h-5 text-primary-500" />
                          <h3 className="font-bold text-lg">{test.name}</h3>
                          <Badge
                            variant={
                              test.status === 'running'
                                ? 'success'
                                : test.status === 'completed'
                                ? 'primary'
                                : 'gray'
                            }
                          >
                            {test.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Created</p>
                            <p className="text-sm">{new Date(test.createdAt).toLocaleDateString()}</p>
                          </div>
                          {(test as any).startedAt && (
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Started</p>
                              <p className="text-sm">{new Date((test as any).startedAt).toLocaleDateString()}</p>
                            </div>
                          )}
                          {(test as any).minSampleSize && (
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Min Sample Size</p>
                              <p className="text-sm">{(test as any).minSampleSize.toLocaleString()}</p>
                            </div>
                          )}
                          {(test as any).primaryMetric && (
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Primary Metric</p>
                              <Badge variant="gray" size="sm">{(test as any).primaryMetric}</Badge>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {test.status === 'draft' && (
                          <Button
                            onClick={() => startABTestMutation.mutate(test.id)}
                            variant="primary"
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

                    {/* Model Comparison */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                      <h4 className="font-semibold mb-3">Model Comparison</h4>
                      <div className="space-y-3">
                        {test.modelIds.map((modelId, idx) => {
                          const model = models.find((m) => m.id === modelId);
                          const allocation = trafficAllocation[modelId] || (100 / test.modelIds.length);
                          const result = testResults?.[modelId];
                          
                          return (
                            <div key={modelId} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                                    <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">
                                      {String.fromCharCode(65 + idx)}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="font-semibold">{model?.name || modelId}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Traffic: {allocation}%</p>
                                  </div>
                                </div>
                                {result && (
                                  <Badge variant={result.isWinner ? 'success' : 'gray'}>
                                    {result.isWinner ? 'Winner' : 'Candidate'}
                                  </Badge>
                                )}
                              </div>
                              
                              {result && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                                  {result.accuracy !== undefined && (
                                    <div>
                                      <p className="text-xs text-gray-500 dark:text-gray-400">Accuracy</p>
                                      <p className="text-sm font-semibold">{(result.accuracy * 100).toFixed(2)}%</p>
                                    </div>
                                  )}
                                  {result.latency !== undefined && (
                                    <div>
                                      <p className="text-xs text-gray-500 dark:text-gray-400">Latency</p>
                                      <p className="text-sm font-semibold">{result.latency.toFixed(2)}ms</p>
                                    </div>
                                  )}
                                  {result.throughput !== undefined && (
                                    <div>
                                      <p className="text-xs text-gray-500 dark:text-gray-400">Throughput</p>
                                      <p className="text-sm font-semibold">{result.throughput.toFixed(2)} req/s</p>
                                    </div>
                                  )}
                                  {result.sampleSize !== undefined && (
                                    <div>
                                      <p className="text-xs text-gray-500 dark:text-gray-400">Samples</p>
                                      <p className="text-sm font-semibold">{result.sampleSize.toLocaleString()}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {/* Traffic Allocation Bar */}
                              <div className="mt-3">
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                  <div 
                                    className="bg-primary-500 h-2 rounded-full transition-all"
                                    style={{ width: `${allocation}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Test Results Summary */}
                    {testResults && Object.keys(testResults).length > 0 && (
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                        <h4 className="font-semibold mb-3">Test Results Summary</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {Object.entries(testResults).map(([modelId, result]: [string, any]) => {
                            const model = models.find((m) => m.id === modelId);
                            return (
                              <Card key={modelId} className="p-4">
                                <p className="font-semibold mb-2">{model?.name || modelId}</p>
                                {result.primaryMetricValue !== undefined && (
                                  <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Primary Metric</p>
                                    <p className="text-lg font-bold">{result.primaryMetricValue.toFixed(4)}</p>
                                  </div>
                                )}
                                {result.confidenceLevel !== undefined && (
                                  <div className="mt-2">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Confidence</p>
                                    <p className="text-sm font-semibold">{(result.confidenceLevel * 100).toFixed(1)}%</p>
                                  </div>
                                )}
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          ) : (
            <Alert variant="info">No A/B tests found. Create your first A/B test to compare model performance.</Alert>
          )}
        </div>
      )}

      {/* Deploy Modal */}
      <Modal
        isOpen={showDeployModal}
        title="Deploy Model"
        onClose={() => {
          setShowDeployModal(false);
          setFormErrors({});
        }}
        footer={
          <>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDeployModal(false);
                setFormErrors({});
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleDeploy}
              disabled={deployModelMutation.isPending}
            >
              {deployModelMutation.isPending ? 'Deploying...' : 'Deploy'}
            </Button>
          </>
        }
      >
          <div className="space-y-4">
            {formErrors.general && (
              <Alert variant="error">{formErrors.general}</Alert>
            )}
            <div>
              <label className="block text-sm font-medium mb-2">Version *</label>
              {versions.length === 0 ? (
                <div className="space-y-2">
                  <Alert variant="info" className="text-sm">
                    No versions available. Please create a version first.
                  </Alert>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowDeployModal(false);
                      setShowVersionModal(true);
                    }}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Create Version First
                  </Button>
                </div>
              ) : (
                <>
                  <Select
                    value={deployForm.version}
                    onChange={(e) => {
                      setDeployForm({ ...deployForm, version: e.target.value });
                      if (formErrors.version) setFormErrors({ ...formErrors, version: '' });
                    }}
                    options={versions
                      .filter(v => v.status === 'active' || v.status === 'draft')
                      .map(v => ({
                        value: v.version,
                        label: `${v.version}${v.status === 'draft' ? ' (Draft)' : ''}${v.description ? ` - ${v.description}` : ''}`,
                      }))}
                    className={formErrors.version ? 'border-error-500' : ''}
                  />
                  {formErrors.version && (
                    <p className="text-xs text-error-500 mt-1">{formErrors.version}</p>
                  )}
                  {versions.length > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {versions.filter(v => v.status === 'active' || v.status === 'draft').length} deployable version(s) available
                    </p>
                  )}
                </>
              )}
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
              <label className="block text-sm font-medium mb-2">Replicas *</label>
              <Input
                type="number"
                min="1"
                value={deployForm.replicas}
                onChange={(e) => {
                  setDeployForm({ ...deployForm, replicas: parseInt(e.target.value) || 1 });
                  if (formErrors.replicas) setFormErrors({ ...formErrors, replicas: '' });
                }}
                className={formErrors.replicas ? 'border-error-500' : ''}
              />
              {formErrors.replicas && (
                <p className="text-xs text-error-500 mt-1">{formErrors.replicas}</p>
              )}
            </div>
            {deployForm.deploymentType === 'canary' && (
              <div>
                <label className="block text-sm font-medium mb-2">Canary Percentage *</label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={deployForm.canaryPercentage}
                  onChange={(e) => {
                    setDeployForm({ ...deployForm, canaryPercentage: parseInt(e.target.value) || 10 });
                    if (formErrors.canaryPercentage) setFormErrors({ ...formErrors, canaryPercentage: '' });
                  }}
                  className={formErrors.canaryPercentage ? 'border-error-500' : ''}
                />
                {formErrors.canaryPercentage && (
                  <p className="text-xs text-error-500 mt-1">{formErrors.canaryPercentage}</p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Percentage of traffic to route to the new version
                </p>
              </div>
            )}
          </div>
        </Modal>

      {/* Version Modal */}
      <Modal
        isOpen={showVersionModal}
        title="Create Model Version"
        onClose={() => {
          setShowVersionModal(false);
          setFormErrors({});
        }}
        footer={
          <>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowVersionModal(false);
                setFormErrors({});
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateVersion}
              disabled={createVersionMutation.isPending}
            >
              {createVersionMutation.isPending ? 'Creating...' : 'Create Version'}
            </Button>
          </>
        }
      >
          <div className="space-y-4">
            {formErrors.general && (
              <Alert variant="error">{formErrors.general}</Alert>
            )}
            <div>
              <label className="block text-sm font-medium mb-2">Version *</label>
              <Input
                value={versionForm.version}
                onChange={(e) => {
                  setVersionForm({ ...versionForm, version: e.target.value });
                  if (formErrors.version) setFormErrors({ ...formErrors, version: '' });
                }}
                placeholder="e.g., 1.2.3"
                className={formErrors.version ? 'border-error-500' : ''}
              />
              {formErrors.version && (
                <p className="text-xs text-error-500 mt-1">{formErrors.version}</p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Use semantic versioning format (major.minor.patch)
              </p>
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
              <label className="block text-sm font-medium mb-2">Artifact Path *</label>
              <Input
                value={versionForm.artifactPath}
                onChange={(e) => {
                  setVersionForm({ ...versionForm, artifactPath: e.target.value });
                  if (formErrors.artifactPath) setFormErrors({ ...formErrors, artifactPath: '' });
                }}
                placeholder="/path/to/model.artifact"
                className={formErrors.artifactPath ? 'border-error-500' : ''}
              />
              {formErrors.artifactPath && (
                <p className="text-xs text-error-500 mt-1">{formErrors.artifactPath}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Config (JSON) *</label>
              <Textarea
                value={versionForm.config}
                onChange={(e) => {
                  setVersionForm({ ...versionForm, config: e.target.value });
                  if (formErrors.config) setFormErrors({ ...formErrors, config: '' });
                }}
                placeholder='{"key": "value"}'
                rows={4}
                className={formErrors.config ? 'border-error-500' : ''}
              />
              {formErrors.config && (
                <p className="text-xs text-error-500 mt-1">{formErrors.config}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Training Metrics (JSON, optional)</label>
              <Textarea
                value={versionForm.trainingMetrics}
                onChange={(e) => {
                  setVersionForm({ ...versionForm, trainingMetrics: e.target.value });
                  if (formErrors.trainingMetrics) setFormErrors({ ...formErrors, trainingMetrics: '' });
                }}
                placeholder='{"accuracy": 0.95}'
                rows={4}
                className={formErrors.trainingMetrics ? 'border-error-500' : ''}
              />
              {formErrors.trainingMetrics && (
                <p className="text-xs text-error-500 mt-1">{formErrors.trainingMetrics}</p>
              )}
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
        onClose={() => {
          setShowABTestModal(false);
          setFormErrors({});
        }}
        footer={
          <>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowABTestModal(false);
                setFormErrors({});
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateABTest}
              disabled={createABTestMutation.isPending}
            >
              {createABTestMutation.isPending ? 'Creating...' : 'Create Test'}
            </Button>
          </>
        }
      >
          <div className="space-y-4">
            {formErrors.general && (
              <Alert variant="error">{formErrors.general}</Alert>
            )}
            <div>
              <label className="block text-sm font-medium mb-2">Test Name *</label>
              <Input
                value={abTestForm.name}
                onChange={(e) => {
                  setABTestForm({ ...abTestForm, name: e.target.value });
                  if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
                }}
                placeholder="A/B Test Name"
                className={formErrors.name ? 'border-error-500' : ''}
              />
              {formErrors.name && (
                <p className="text-xs text-error-500 mt-1">{formErrors.name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Select Models (at least 2) *</label>
              <div className={`space-y-2 max-h-40 overflow-y-auto border rounded-lg p-2 ${
                formErrors.modelIds 
                  ? 'border-error-500' 
                  : 'border-gray-300 dark:border-gray-600'
              }`}>
                {customModels.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No custom models available. LLM models cannot be used in A/B tests.</p>
                ) : (
                  customModels.map((model) => (
                    <label key={model.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-1 rounded">
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
                          if (formErrors.modelIds) setFormErrors({ ...formErrors, modelIds: '' });
                        }}
                      />
                      <span>{model.name}</span>
                    </label>
                  ))
                )}
              </div>
              {formErrors.modelIds && (
                <p className="text-xs text-error-500 mt-1">{formErrors.modelIds}</p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Selected: {abTestForm.modelIds.length} model(s)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Traffic Allocation *</label>
              <Input
                value={abTestForm.trafficAllocation}
                onChange={(e) => {
                  setABTestForm({ ...abTestForm, trafficAllocation: e.target.value });
                  if (formErrors.trafficAllocation) setFormErrors({ ...formErrors, trafficAllocation: '' });
                }}
                placeholder="50:50 or 30:40:30"
                className={formErrors.trafficAllocation ? 'border-error-500' : ''}
              />
              {formErrors.trafficAllocation && (
                <p className="text-xs text-error-500 mt-1">{formErrors.trafficAllocation}</p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Use colon-separated percentages that sum to 100 (e.g., 50:50 for 2 models)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Min Sample Size *</label>
              <Input
                type="number"
                min="100"
                value={abTestForm.minSampleSize}
                onChange={(e) => {
                  setABTestForm({ ...abTestForm, minSampleSize: parseInt(e.target.value) || 1000 });
                  if (formErrors.minSampleSize) setFormErrors({ ...formErrors, minSampleSize: '' });
                }}
                className={formErrors.minSampleSize ? 'border-error-500' : ''}
              />
              {formErrors.minSampleSize && (
                <p className="text-xs text-error-500 mt-1">{formErrors.minSampleSize}</p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Minimum number of samples required before determining a winner
              </p>
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
