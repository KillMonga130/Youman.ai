import { useState } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  BarChart3, 
  FileText, 
  Server, 
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Shield,
  Zap,
  Database,
  Globe,
  Gauge,
  DollarSign,
  HelpCircle,
  ArrowUp,
  ArrowDown,
  Play,
  Pause,
  Settings
} from 'lucide-react';
import { Tabs, Card, Spinner, Alert, Badge, Button } from '../components/ui';
import {
  useAdminDashboard,
  useSystemMetrics,
  usePerformanceHistory,
  useUserActivitySummary,
  useUserActivityList,
  useAdminLogs,
  useErrorSummary,
  useErrorLogs,
  useResolveError,
  useAlertConfigs,
  useConfigureAlert,
  useAlerts,
  useAcknowledgeAlert,
  // DevOps hooks
  useAutoScalingStatus,
  useAutoScalingMetrics,
  useScalingPolicy,
  useConfigureScalingPolicy,
  useScaleUp,
  useScaleDown,
  useScalingEvents,
  useRegisterService,
  useDisasterRecoveryStatus,
  useBackups,
  useCreateBackup,
  useRecoveryPoints,
  useReplicationStatus,
  useFailoverEvents,
  useRecoveryTests,
  useCDNDistributions,
  useCacheStats,
  useCreateCDNDistribution,
  useInvalidateCache,
  usePerformanceMetrics as usePerformanceMetricsDevOps,
  useSlowQueries,
  useConnectionPoolStats,
  usePerformanceAlerts,
  useCostSummary,
  useCostReport,
  useCostForecast,
  useCostOptimizations,
  useBudgets,
  useBudgetAlerts,
  useActiveImpersonationSessions,
  useErrorContexts,
  useRequestInspections,
  useAuditLogs,
  useGenerateDiagnosticReport,
} from '../api/hooks';

export function Admin(): JSX.Element {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [logLevel, setLogLevel] = useState<string>('');
  const [errorFilter, setErrorFilter] = useState<'all' | 'resolved' | 'unresolved'>('unresolved');
  const [alertFilter, setAlertFilter] = useState<'all' | 'acknowledged' | 'unacknowledged'>('unacknowledged');

  const { data: dashboardData, isLoading: isLoadingDashboard, error: dashboardError } = useAdminDashboard();
  const { data: metricsData, isLoading: isLoadingMetrics, error: metricsError } = useSystemMetrics();
  const { data: activitySummary, isLoading: isLoadingActivity, error: activityError } = useUserActivitySummary();
  const { data: activityList, isLoading: isLoadingActivityList, error: activityListError } = useUserActivityList(50, 0);
  const { data: logsData, isLoading: isLoadingLogs, error: logsError } = useAdminLogs({ level: logLevel || undefined, limit: 100 });
  const { data: errorSummary, isLoading: isLoadingErrorSummary, error: errorSummaryError } = useErrorSummary();
  const { data: errorLogsData, isLoading: isLoadingErrorLogs, error: errorLogsError } = useErrorLogs(100, 0, {
    resolved: errorFilter === 'all' ? undefined : errorFilter === 'resolved',
  });
  const { data: alertsData, isLoading: isLoadingAlerts, error: alertsError } = useAlerts(
    alertFilter === 'all' ? undefined : alertFilter === 'acknowledged'
  );
  const { data: alertConfigsData, error: alertConfigsError } = useAlertConfigs();
  const resolveErrorMutation = useResolveError();
  const acknowledgeAlertMutation = useAcknowledgeAlert();

  const dashboard = dashboardData?.data;
  const metrics = metricsData?.data;
  const activity = activitySummary?.data;
  const logs = logsData?.data?.logs || [];
  const errors = errorLogsData?.data?.logs || [];
  const alerts = (alertsData?.data as any)?.alerts || (Array.isArray(alertsData?.data) ? alertsData.data : []);
  const alertConfigs = alertConfigsData?.data || [];

  // Safe defaults for dashboard data - match backend structure
  const systemMetrics = dashboard?.systemMetrics || metrics || {
    activeUsers: 0,
    totalUsers: 0,
    processingQueueLength: 0,
    resourceUtilization: {
      cpuUsage: 0,
      memoryUsage: 0,
      memoryUsedMB: 0,
      memoryTotalMB: 0,
      diskUsage: 0,
      diskUsedGB: 0,
      diskTotalGB: 0,
    },
    performance: {
      averageProcessingTimePer1000Words: 0,
      requestsPerMinute: 0,
      averageResponseTime: 0,
      errorRate: 0,
      successRate: 0,
    },
  };
  const userActivity = dashboard?.userActivity || activity || {
    totalTransformations: 0,
    totalWordsProcessed: 0,
    totalApiCalls: 0,
    totalErrors: 0,
    activeUsersToday: 0,
    activeUsersThisWeek: 0,
    activeUsersThisMonth: 0,
    newUsersToday: 0,
    newUsersThisWeek: 0,
    newUsersThisMonth: 0,
  };
  const recentAlerts = (dashboard?.recentAlerts as any[]) || [];

  const handleResolveError = async (errorId: string) => {
    try {
      await resolveErrorMutation.mutateAsync(errorId);
    } catch (error) {
      console.error('Failed to resolve error:', error);
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await acknowledgeAlertMutation.mutateAsync(alertId);
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'metrics', label: 'System Metrics', icon: Server },
    { id: 'activity', label: 'User Activity', icon: Users },
    { id: 'logs', label: 'Logs', icon: FileText },
    { id: 'errors', label: 'Errors', icon: AlertTriangle },
    { id: 'alerts', label: 'Alerts', icon: AlertCircle },
    { id: 'auto-scaling', label: 'Auto-Scaling', icon: Zap },
    { id: 'disaster-recovery', label: 'Disaster Recovery', icon: Database },
    { id: 'cdn', label: 'CDN & Caching', icon: Globe },
    { id: 'performance', label: 'Performance', icon: Gauge },
    { id: 'cost', label: 'Cost Management', icon: DollarSign },
    { id: 'support', label: 'Support', icon: HelpCircle },
  ];

  // Check if user has admin access (403 errors indicate no admin access)
  const hasAccessError = dashboardError || metricsError || activityError;
  let isForbidden = false;
  
  if (hasAccessError) {
    if (hasAccessError instanceof Error) {
      try {
        const errorData = JSON.parse(hasAccessError.message);
        isForbidden = errorData.status === 403 || errorData.code === 'FORBIDDEN';
      } catch {
        // If parsing fails, check message string
        isForbidden = hasAccessError.message.includes('403') || hasAccessError.message.includes('FORBIDDEN');
      }
    } else if (typeof hasAccessError === 'object' && hasAccessError !== null) {
      isForbidden = 'status' in hasAccessError && (hasAccessError as any).status === 403;
    }
  }

  if (isForbidden) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="error" className="max-w-2xl mx-auto">
          <div className="flex items-start gap-4">
            <Shield className="w-6 h-6 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-xl font-bold mb-2">Access Denied</h2>
              <p className="text-gray-700 dark:text-gray-300">
                You do not have admin access to view this page. Admin access is restricted to users with admin privileges.
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                If you believe you should have access, please contact your system administrator.
              </p>
            </div>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gradient mb-2">Admin Panel</h1>
          <p className="text-gray-600 dark:text-gray-400">Monitor system performance and user activity</p>
        </div>
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      <Tabs activeTab={activeTab} onTabChange={setActiveTab} className="w-full">
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

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {isLoadingDashboard ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : dashboard ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <Users className="w-8 h-8 text-blue-500" />
                      <Badge variant="success">Active</Badge>
                    </div>
                    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Active Users</h3>
                    <p className="text-2xl font-bold">{systemMetrics.activeUsers}</p>
                  </Card>
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <Activity className="w-8 h-8 text-green-500" />
                      <Badge variant="primary">Queue</Badge>
                    </div>
                    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Queue Length</h3>
                    <p className="text-2xl font-bold">{systemMetrics.processingQueueLength}</p>
                  </Card>
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <TrendingUp className="w-8 h-8 text-purple-500" />
                      <Badge variant={(systemMetrics.resourceUtilization?.cpuUsage ?? 0) > 80 ? 'error' : 'success'}>
                        {systemMetrics.resourceUtilization?.cpuUsage ?? 0}%
                      </Badge>
                    </div>
                    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">CPU Usage</h3>
                    <p className="text-2xl font-bold">{systemMetrics.resourceUtilization?.cpuUsage ?? 0}%</p>
                  </Card>
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <Server className="w-8 h-8 text-orange-500" />
                      <Badge variant={(systemMetrics.resourceUtilization?.memoryUsage ?? 0) > 80 ? 'error' : 'success'}>
                        {systemMetrics.resourceUtilization?.memoryUsage ?? 0}%
                      </Badge>
                    </div>
                    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Memory Usage</h3>
                    <p className="text-2xl font-bold">{systemMetrics.resourceUtilization?.memoryUsage ?? 0}%</p>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="p-6">
                    <h2 className="text-xl font-bold mb-4">Activity Summary</h2>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">Total Transformations</span>
                        <span className="font-bold">{userActivity.totalTransformations}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">Total API Calls</span>
                        <span className="font-bold">{userActivity.totalApiCalls}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">Total Errors</span>
                        <span className="font-bold text-red-600">{userActivity.totalErrors}</span>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6">
                    <h2 className="text-xl font-bold mb-4">Recent Alerts</h2>
                    <div className="space-y-3">
                      {recentAlerts.length > 0 ? (
                        recentAlerts.slice(0, 5).map((alert) => (
                          <div
                            key={alert.id}
                            className={`p-3 rounded-lg border ${
                              alert.severity === 'critical'
                                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                                : alert.severity === 'warning'
                                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                                : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-semibold text-sm">{alert.message}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {alert.triggeredAt ? new Date(alert.triggeredAt).toLocaleString() : 'Unknown time'}
                                </p>
                              </div>
                              <Badge variant={alert.severity === 'critical' ? 'error' : 'warning'}>
                                {alert.severity}
                              </Badge>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-sm">No recent alerts</p>
                      )}
                    </div>
                  </Card>
                </div>
              </>
            ) : (
              <Alert variant="error">Failed to load dashboard data</Alert>
            )}
          </div>
        )}

        {/* Metrics Tab */}
        {activeTab === 'metrics' && (
          <div className="space-y-6">
            {isLoadingMetrics ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : metrics ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="p-6">
                  <h3 className="text-lg font-bold mb-4">Resource Utilization</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">CPU</span>
                        <span className="text-sm font-bold">{systemMetrics.resourceUtilization?.cpuUsage ?? 0}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            (systemMetrics.resourceUtilization?.cpuUsage ?? 0) > 80
                              ? 'bg-red-500'
                              : (systemMetrics.resourceUtilization?.cpuUsage ?? 0) > 60
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${systemMetrics.resourceUtilization?.cpuUsage ?? 0}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Memory</span>
                        <span className="text-sm font-bold">{systemMetrics.resourceUtilization?.memoryUsage ?? 0}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            (systemMetrics.resourceUtilization?.memoryUsage ?? 0) > 80
                              ? 'bg-red-500'
                              : (systemMetrics.resourceUtilization?.memoryUsage ?? 0) > 60
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${systemMetrics.resourceUtilization?.memoryUsage ?? 0}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Disk</span>
                        <span className="text-sm font-bold">{systemMetrics.resourceUtilization?.diskUsage ?? 0}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            (systemMetrics.resourceUtilization?.diskUsage ?? 0) > 80
                              ? 'bg-red-500'
                              : (systemMetrics.resourceUtilization?.diskUsage ?? 0) > 60
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${systemMetrics.resourceUtilization?.diskUsage ?? 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Card>
                <Card className="p-6">
                  <h3 className="text-lg font-bold mb-4">System Status</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Active Users</span>
                      <Badge variant="success">{systemMetrics.activeUsers}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Queue Length</span>
                      <Badge variant={(systemMetrics.processingQueueLength ?? 0) > 100 ? 'error' : 'primary'}>
                        {systemMetrics.processingQueueLength}
                      </Badge>
                    </div>
                  </div>
                </Card>
              </div>
            ) : (
              <Alert variant="error">Failed to load metrics</Alert>
            )}
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="space-y-6">
            {isLoadingActivity ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : userActivity ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="p-6">
                    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Users</h3>
                    <p className="text-2xl font-bold">{systemMetrics.totalUsers ?? 0}</p>
                  </Card>
                  <Card className="p-6">
                    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Active Users (Today)</h3>
                    <p className="text-2xl font-bold">{userActivity.activeUsersToday ?? 0}</p>
                  </Card>
                  <Card className="p-6">
                    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">New Users (Today)</h3>
                    <p className="text-2xl font-bold">{userActivity.newUsersToday ?? 0}</p>
                  </Card>
                  <Card className="p-6">
                    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total API Calls</h3>
                    <p className="text-2xl font-bold">{userActivity.totalApiCalls ?? 0}</p>
                  </Card>
                </div>

                <Card className="p-6">
                  <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
                  {isLoadingActivityList ? (
                    <div className="flex justify-center py-8">
                      <Spinner />
                    </div>
                  ) : activityList?.data && activityList.data.length > 0 ? (
                    <div className="space-y-3">
                      {activityList.data.map((item, index) => (
                        <div
                          key={item.userId || `activity-${index}`}
                          className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-semibold">{item.email || 'Unknown User'}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Last Active: {item.lastActive ? new Date(item.lastActive).toLocaleString() : 'Unknown'}
                              </p>
                              <div className="mt-2 flex gap-4 text-xs text-gray-500 dark:text-gray-400">
                                <span>Transformations: {item.transformationsCount}</span>
                                <span>Words: {item.wordsProcessed.toLocaleString()}</span>
                                <span>API Calls: {item.apiCallsCount}</span>
                                <span>Errors: {item.errorsCount}</span>
                                <span>Tier: {item.subscriptionTier}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">No activity found</p>
                  )}
                </Card>
              </>
            ) : (
              <Alert variant="error">Failed to load activity data</Alert>
            )}
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <label className="text-sm font-medium">Filter by Level:</label>
                <select
                  value={logLevel}
                  onChange={(e) => setLogLevel(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                >
                  <option value="">All Levels</option>
                  <option value="error">Error</option>
                  <option value="warn">Warning</option>
                  <option value="info">Info</option>
                  <option value="debug">Debug</option>
                </select>
              </div>

              {isLoadingLogs ? (
                <div className="flex justify-center py-12">
                  <Spinner size="lg" />
                </div>
              ) : logs.length > 0 ? (
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 scrollbar-modern">
                  {logs.map((log, index) => (
                    <div
                      key={log.id || `log-${index}`}
                      className={`p-3 rounded-lg border ${
                        log.level === 'error'
                          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                          : log.level === 'warn'
                          ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                          : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant={
                                log.level === 'error' || log.level === 'ERROR'
                                  ? 'error'
                                  : log.level === 'warn' || log.level === 'WARN'
                                  ? 'warning'
                                  : 'primary'
                              }
                            >
                              {log.level}
                            </Badge>
                            {log.endpoint && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">{log.endpoint}</span>
                            )}
                          </div>
                          <p className="text-sm">{log.message}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {log.timestamp
                              ? new Date(log.timestamp).toLocaleString()
                              : 'Unknown time'}
                            {log.userId && ` • User: ${log.userId}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">No logs found</p>
              )}
            </Card>
          </div>
        )}

        {/* Errors Tab */}
        {activeTab === 'errors' && (
          <div className="space-y-6">
            {isLoadingErrorSummary ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : errorSummary?.data ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-6">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Errors</h3>
                  <p className="text-2xl font-bold">{errorSummary.data.totalErrors ?? 0}</p>
                </Card>
                <Card className="p-6">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Errors Today</h3>
                  <p className="text-2xl font-bold text-red-600">{errorSummary.data.errorsToday ?? 0}</p>
                </Card>
                <Card className="p-6">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Errors This Week</h3>
                  <p className="text-2xl font-bold">{errorSummary.data.errorsThisWeek ?? 0}</p>
                </Card>
                <Card className="p-6">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Error Types</h3>
                  <p className="text-2xl font-bold">
                    {errorSummary.data.errorsByType && typeof errorSummary.data.errorsByType === 'object'
                      ? Object.keys(errorSummary.data.errorsByType).length
                      : 0}
                  </p>
                </Card>
              </div>
            ) : null}

            <Card className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <label className="text-sm font-medium">Filter:</label>
                <select
                  value={errorFilter}
                  onChange={(e) => setErrorFilter(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                >
                  <option value="all">All Errors</option>
                  <option value="unresolved">Unresolved</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>

              {isLoadingErrorLogs ? (
                <div className="flex justify-center py-12">
                  <Spinner size="lg" />
                </div>
              ) : errors.length > 0 ? (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 scrollbar-modern">
                  {errors.map((error, index) => (
                    <div
                      key={error.id || `error-${index}`}
                      className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="error">{error.errorCode}</Badge>
                            {error.resolved ? (
                              <Badge variant="success">Resolved</Badge>
                            ) : (
                              <Badge variant="warning">Unresolved</Badge>
                            )}
                          </div>
                          <p className="font-semibold mb-1">{error.message}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {error.endpoint && `Endpoint: ${error.endpoint} • `}
                            {error.timestamp
                              ? new Date(error.timestamp).toLocaleString()
                              : 'Unknown time'}
                            {error.userId && ` • User: ${error.userId}`}
                          </p>
                        </div>
                        {!error.resolved && (
                          <Button
                            onClick={() => handleResolveError(error.id)}
                            variant="outline"
                            size="sm"
                            disabled={resolveErrorMutation.isPending}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Resolve
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">No errors found</p>
              )}
            </Card>
          </div>
        )}

        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <label className="text-sm font-medium">Filter:</label>
                <select
                  value={alertFilter}
                  onChange={(e) => setAlertFilter(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                >
                  <option value="all">All Alerts</option>
                  <option value="unacknowledged">Unacknowledged</option>
                  <option value="acknowledged">Acknowledged</option>
                </select>
              </div>

              {isLoadingAlerts ? (
                <div className="flex justify-center py-12">
                  <Spinner size="lg" />
                </div>
              ) : alerts.length > 0 ? (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 scrollbar-modern">
                  {alerts.map((alert: any, index: number) => (
                    <div
                      key={alert.id || `alert-${index}`}
                      className={`p-4 rounded-lg border ${
                        alert.severity === 'critical'
                          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                          : alert.severity === 'warning'
                          ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                          : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge
                              variant={
                                alert.severity === 'critical' || alert.severity === 'CRITICAL'
                                  ? 'error'
                                  : alert.severity === 'warning' || alert.severity === 'WARNING'
                                  ? 'warning'
                                  : 'primary'
                              }
                            >
                              {alert.severity}
                            </Badge>
                            <Badge variant={alert.alertType === 'error' ? 'error' : 'primary'}>
                              {alert.alertType || alert.type || 'alert'}
                            </Badge>
                            {alert.acknowledged ? (
                              <Badge variant="success">Acknowledged</Badge>
                            ) : (
                              <Badge variant="warning">Unacknowledged</Badge>
                            )}
                          </div>
                          <p className="font-semibold mb-1">{alert.message}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {alert.createdAt
                              ? new Date(alert.createdAt).toLocaleString()
                              : alert.triggeredAt
                              ? new Date(alert.triggeredAt).toLocaleString()
                              : 'Unknown time'}
                            {alert.acknowledgedAt && ` • Acknowledged: ${new Date(alert.acknowledgedAt).toLocaleString()}`}
                          </p>
                        </div>
                        {!alert.acknowledged && (
                          <Button
                            onClick={() => handleAcknowledgeAlert(alert.id)}
                            variant="outline"
                            size="sm"
                            disabled={acknowledgeAlertMutation.isPending}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Acknowledge
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">No alerts found</p>
              )}
            </Card>

            {alertConfigs.length > 0 && (
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">Alert Configurations</h2>
                <div className="space-y-3">
                  {alertConfigs.map((config, index) => (
                    <div
                      key={config.id || `config-${index}`}
                      className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{config.type || 'Unknown'}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Threshold: {config.threshold ?? 0} • {config.enabled ? 'Enabled' : 'Disabled'}
                          </p>
                        </div>
                        <Badge variant={config.enabled ? 'success' : 'gray'}>
                          {config.enabled ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Auto-Scaling Tab */}
        {activeTab === 'auto-scaling' && (
          <AutoScalingTab />
        )}

        {/* Disaster Recovery Tab */}
        {activeTab === 'disaster-recovery' && (
          <DisasterRecoveryTab />
        )}

        {/* CDN & Caching Tab */}
        {activeTab === 'cdn' && (
          <CDNTab />
        )}

        {/* Performance Tab */}
        {activeTab === 'performance' && (
          <PerformanceTab />
        )}

        {/* Cost Management Tab */}
        {activeTab === 'cost' && (
          <CostManagementTab />
        )}

        {/* Support Tab */}
        {activeTab === 'support' && (
          <SupportTab />
        )}
      </Tabs>
    </div>
  );
}

// Auto-Scaling Tab Component
function AutoScalingTab(): JSX.Element {
  const [selectedService, setSelectedService] = useState('backend');
  const { data: status, isLoading: isLoadingStatus, error: statusError } = useAutoScalingStatus(selectedService);
  const { data: metrics, isLoading: isLoadingMetrics, error: metricsError } = useAutoScalingMetrics(selectedService);
  const { data: policy, isLoading: isLoadingPolicy, error: policyError } = useScalingPolicy(selectedService);
  const { data: events, error: eventsError } = useScalingEvents(selectedService, 50);
  const scaleUpMutation = useScaleUp();
  const scaleDownMutation = useScaleDown();
  const configurePolicyMutation = useConfigureScalingPolicy();
  const registerServiceMutation = useRegisterService();
  
  // Helper to extract status from error
  const getErrorStatus = (error: unknown): number | undefined => {
    if (!error) return undefined;
    try {
      if (error instanceof Error) {
        const parsed = JSON.parse(error.message);
        return parsed.status;
      }
      if (typeof error === 'object' && 'status' in error) {
        return (error as any).status;
      }
    } catch {
      // Error message is not JSON, check if it contains status
      if (error instanceof Error && error.message.includes('404')) {
        return 404;
      }
    }
    return undefined;
  };

  // Check if service is not registered (404 error)
  const isServiceNotRegistered = 
    getErrorStatus(statusError) === 404 || 
    getErrorStatus(policyError) === 404 ||
    getErrorStatus(metricsError) === 404;
  
  const handleRegisterService = async () => {
    try {
      // First register the service
      await registerServiceMutation.mutateAsync({
        serviceId: selectedService,
        config: {
          minInstances: 1,
          maxInstances: 10,
          initialInstances: 1,
        },
      });
      
      // Then configure a default scaling policy
      await configurePolicyMutation.mutateAsync({
        serviceId: selectedService,
        policy: {
          minInstances: 1,
          maxInstances: 10,
          targetCpuUtilization: 70,
          scaleUpThreshold: 80,
          scaleDownThreshold: 30,
          cooldownPeriod: 300, // 5 minutes
        },
      });
    } catch (error) {
      console.error('Failed to register service:', error);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Auto-Scaling Management</h2>
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
          >
            <option value="backend">Backend</option>
            <option value="frontend">Frontend</option>
            <option value="api">API Gateway</option>
          </select>
        </div>

        {isServiceNotRegistered ? (
          <Alert variant="warning" className="mb-4">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Service Not Registered</h3>
                <p className="text-gray-700 dark:text-gray-300 mb-3">
                  The service "{selectedService}" is not registered for auto-scaling. Register it to enable auto-scaling features.
                </p>
                <Button
                  onClick={handleRegisterService}
                  disabled={registerServiceMutation.isPending || configurePolicyMutation.isPending}
                  variant="outline"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  {registerServiceMutation.isPending || configurePolicyMutation.isPending 
                    ? 'Registering...' 
                    : 'Register Service'}
                </Button>
              </div>
            </div>
          </Alert>
        ) : null}

        {!isServiceNotRegistered && (isLoadingStatus || isLoadingMetrics || isLoadingPolicy) ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : !isServiceNotRegistered ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Current Instances</h3>
                <p className="text-3xl font-bold">{(status as any)?.currentInstances ?? 0}</p>
              </Card>
              <Card className="p-4">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">CPU Usage</h3>
                <p className="text-3xl font-bold">{((metrics as any)?.cpuUsage ?? 0).toFixed(1)}%</p>
              </Card>
              <Card className="p-4">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Memory Usage</h3>
                <p className="text-3xl font-bold">{((metrics as any)?.memoryUsage ?? 0).toFixed(1)}%</p>
              </Card>
            </div>

            {policy && (
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="font-semibold mb-2">Scaling Policy</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Min Instances:</span>
                <span className="ml-2 font-bold">{(policy as any).minInstances ?? 0}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Max Instances:</span>
                <span className="ml-2 font-bold">{(policy as any).maxInstances ?? 0}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Target CPU:</span>
                <span className="ml-2 font-bold">{(policy as any).targetCpuUtilization ?? 0}%</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Cooldown:</span>
                <span className="ml-2 font-bold">{(policy as any).cooldownPeriod ?? 0}s</span>
              </div>
            </div>
          </div>
            )}
          </>
        ) : null}

        <div className="flex gap-2 mt-4">
          <Button
            onClick={() => scaleUpMutation.mutate({ serviceId: selectedService })}
            disabled={scaleUpMutation.isPending}
            variant="outline"
          >
            <ArrowUp className="w-4 h-4 mr-2" />
            Scale Up
          </Button>
          <Button
            onClick={() => scaleDownMutation.mutate(selectedService)}
            disabled={scaleDownMutation.isPending}
            variant="outline"
          >
            <ArrowDown className="w-4 h-4 mr-2" />
            Scale Down
          </Button>
        </div>

        {events && events.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold mb-3">Recent Scaling Events</h3>
            <div className="space-y-2">
              {events.slice(0, 10).map((event) => (
                <div key={event.id || `event-${event.timestamp}`} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">{event.type === 'scale_up' ? 'Scale Up' : 'Scale Down'}</span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {new Date(event.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    {event.previousInstances} → {event.newInstances} instances
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// Disaster Recovery Tab Component
function DisasterRecoveryTab(): JSX.Element {
  const { data: status } = useDisasterRecoveryStatus();
  const { data: backups } = useBackups(50);
  const { data: recoveryPoints } = useRecoveryPoints();
  const { data: replicationStatus } = useReplicationStatus();
  const { data: tests } = useRecoveryTests(20);
  const createBackupMutation = useCreateBackup();

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Disaster Recovery</h2>
          <Button
            onClick={() => createBackupMutation.mutate({ type: 'full' })}
            disabled={createBackupMutation.isPending}
            variant="outline"
          >
            <Database className="w-4 h-4 mr-2" />
            Create Backup
          </Button>
        </div>

        {status && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Status</h3>
              <Badge variant={status.status === 'healthy' ? 'success' : 'warning'}>
                {status.status}
              </Badge>
            </Card>
            <Card className="p-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Last Backup</h3>
              <p className="text-sm">{status.lastBackup ? new Date(status.lastBackup).toLocaleString() : 'Never'}</p>
            </Card>
            <Card className="p-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Replication</h3>
              <Badge variant={status.replicationStatus === 'active' ? 'success' : 'gray'}>
                {status.replicationStatus}
              </Badge>
            </Card>
            <Card className="p-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Failover Ready</h3>
              <Badge variant={status.failoverReady ? 'success' : 'warning'}>
                {status.failoverReady ? 'Yes' : 'No'}
              </Badge>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-3">Recent Backups</h3>
            {backups && backups.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-2 scrollbar-modern">
                {backups.slice(0, 10).map((backup) => (
                  <div key={backup.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">{backup.type}</span>
                      <Badge variant={backup.status === 'completed' ? 'success' : 'warning'}>
                        {backup.status}
                      </Badge>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      {new Date(backup.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No backups found</p>
            )}
          </div>

          <div>
            <h3 className="font-semibold mb-3">Recovery Tests</h3>
            {tests && tests.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-2 scrollbar-modern">
                {tests.slice(0, 10).map((test) => (
                  <div key={test.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">{test.type}</span>
                      <Badge variant={test.status === 'passed' ? 'success' : 'warning'}>
                        {test.status}
                      </Badge>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      {new Date(test.scheduledTime).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No recovery tests found</p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

// CDN & Caching Tab Component
function CDNTab(): JSX.Element {
  const { data: distributions, isLoading: isLoadingDistributions } = useCDNDistributions();
  const { data: cacheStats, isLoading: isLoadingCacheStats } = useCacheStats();
  const invalidateCacheMutation = useInvalidateCache();

  if (isLoadingDistributions || isLoadingCacheStats) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">CDN & Caching</h2>

        {cacheStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Cache Hit Rate</h3>
              <p className="text-3xl font-bold">{((cacheStats.hitRate ?? 0) * 100).toFixed(1)}%</p>
            </Card>
            <Card className="p-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Requests</h3>
              <p className="text-3xl font-bold">{(cacheStats.totalRequests ?? 0).toLocaleString()}</p>
            </Card>
            <Card className="p-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Cache Size</h3>
              <p className="text-3xl font-bold">{((cacheStats.cacheSize ?? 0) / 1024 / 1024).toFixed(2)} MB</p>
            </Card>
            <Card className="p-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Entries</h3>
              <p className="text-3xl font-bold">{cacheStats.entriesCount ?? 0}</p>
            </Card>
          </div>
        )}

        <div className="flex gap-2 mb-4">
          <Button
            onClick={() => invalidateCacheMutation.mutate(['*'])}
            disabled={invalidateCacheMutation.isPending}
            variant="outline"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Purge All Cache
          </Button>
        </div>

        <div>
          <h3 className="font-semibold mb-3">CDN Distributions</h3>
          {distributions && distributions.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
              {distributions.map((dist) => (
                <div key={dist.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold">{dist.name || 'Unnamed Distribution'}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{dist.origin || 'N/A'}</p>
                      {dist.createdAt && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Created: {new Date(dist.createdAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <Badge variant={dist.status === 'deployed' ? 'success' : 'warning'}>
                      {dist.status || 'unknown'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No CDN distributions found</p>
          )}
        </div>
      </Card>
    </div>
  );
}

// Performance Tab Component
function PerformanceTab(): JSX.Element {
  const { data: metrics, isLoading: isLoadingMetrics } = usePerformanceMetricsDevOps();
  const { data: slowQueries, isLoading: isLoadingSlowQueries } = useSlowQueries(20);
  const { data: poolStats, isLoading: isLoadingPoolStats } = useConnectionPoolStats();
  const { data: alerts, isLoading: isLoadingAlerts } = usePerformanceAlerts();

  if (isLoadingMetrics || isLoadingSlowQueries || isLoadingPoolStats || isLoadingAlerts) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Performance Optimization</h2>

        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="p-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Avg Response Time</h3>
              <p className="text-3xl font-bold">{((metrics as any).averageResponseTime ?? 0).toFixed(2)}ms</p>
            </Card>
            <Card className="p-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">P95 Response Time</h3>
              <p className="text-3xl font-bold">{((metrics as any).p95ResponseTime ?? 0).toFixed(2)}ms</p>
            </Card>
            <Card className="p-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Requests/sec</h3>
              <p className="text-3xl font-bold">{((metrics as any).requestsPerSecond ?? 0).toFixed(1)}</p>
            </Card>
          </div>
        )}

        {poolStats && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="font-semibold mb-2">Connection Pool</h3>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Total:</span>
                <span className="ml-2 font-bold">{(poolStats as any).totalConnections ?? 0}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Active:</span>
                <span className="ml-2 font-bold">{(poolStats as any).activeConnections ?? 0}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Idle:</span>
                <span className="ml-2 font-bold">{(poolStats as any).idleConnections ?? 0}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Waiting:</span>
                <span className="ml-2 font-bold">{(poolStats as any).waitingRequests ?? 0}</span>
              </div>
            </div>
          </div>
        )}

        {slowQueries && slowQueries.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold mb-3">Slow Queries</h3>
            <div className="space-y-2">
              {slowQueries.slice(0, 10).map((query, idx) => (
                <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">{query.duration ?? 0}ms</span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {query.timestamp ? new Date(query.timestamp).toLocaleString() : 'Unknown'}
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 font-mono text-xs truncate">
                    {query.query || 'N/A'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {alerts && alerts.length > 0 && (
          <div>
            <h3 className="font-semibold mb-3">Performance Alerts</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2 scrollbar-modern">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg ${
                    alert.severity === 'critical'
                      ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                      : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                  }`}
                >
                  <p className="font-semibold">{alert.message || 'Unknown alert'}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {alert.timestamp ? new Date(alert.timestamp).toLocaleString() : 'Unknown time'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// Cost Management Tab Component
function CostManagementTab(): JSX.Element {
  const { data: summary, isLoading: isLoadingSummary } = useCostSummary();
  const { data: optimizations, isLoading: isLoadingOptimizations } = useCostOptimizations();
  const { data: budgets, isLoading: isLoadingBudgets } = useBudgets();
  const { data: alerts, isLoading: isLoadingAlerts } = useBudgetAlerts();

  if (isLoadingSummary || isLoadingOptimizations || isLoadingBudgets || isLoadingAlerts) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Cost Management</h2>

        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="p-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Cost</h3>
              <p className="text-3xl font-bold">${(summary.totalCost ?? 0).toFixed(2)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{summary.period || 'N/A'}</p>
            </Card>
            <Card className="p-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Services</h3>
              <p className="text-2xl font-bold">{Object.keys(summary.costByService || {}).length}</p>
            </Card>
            <Card className="p-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Features</h3>
              <p className="text-2xl font-bold">{Object.keys(summary.costByFeature || {}).length}</p>
            </Card>
          </div>
        )}

        {optimizations && optimizations.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold mb-3">Cost Optimization Recommendations</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2 scrollbar-modern">
              {optimizations.slice(0, 10).map((opt, idx) => (
                <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold">{opt.type}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{opt.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">${(opt.estimatedSavings ?? 0).toFixed(2)}</p>
                      <Badge
                        variant={opt.priority === 'high' ? 'error' : opt.priority === 'medium' ? 'warning' : 'primary'}
                        className="mt-1"
                      >
                        {opt.priority || 'low'}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-3">Budgets</h3>
            {budgets && budgets.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-2 scrollbar-modern">
                {budgets.map((budget) => (
                  <div key={budget.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold">{budget.name}</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{budget.period}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>${(budget.currentSpend ?? 0).toFixed(2)}</span>
                      <span className="text-gray-600 dark:text-gray-400">of ${(budget.amount ?? 0).toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ 
                          width: `${Math.min(((budget.currentSpend ?? 0) / (budget.amount ?? 1)) * 100, 100)}%` 
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No budgets configured</p>
            )}
          </div>

          <div>
            <h3 className="font-semibold mb-3">Budget Alerts</h3>
            {alerts && alerts.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-2 scrollbar-modern">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg ${
                      !alert.acknowledged
                        ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                        : 'bg-gray-50 dark:bg-gray-800'
                    }`}
                  >
                    <p className="font-semibold">{alert.message}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      ${(alert.currentSpend ?? 0).toFixed(2)} / {alert.threshold ?? 0}% threshold
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No budget alerts</p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

// Support Tab Component
function SupportTab(): JSX.Element {
  const { data: sessions } = useActiveImpersonationSessions();
  const { data: errorContexts } = useErrorContexts(20);
  const { data: auditLogs } = useAuditLogs({ limit: 50 });
  const generateReportMutation = useGenerateDiagnosticReport();

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Support & Diagnostics</h2>
          <Button
            onClick={() =>
              generateReportMutation.mutate({
                includeSystemInfo: true,
                includeErrorLogs: true,
                includePerformanceMetrics: true,
              })
            }
            disabled={generateReportMutation.isPending}
            variant="outline"
          >
            <FileText className="w-4 h-4 mr-2" />
            Generate Report
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-3">Active Impersonation Sessions</h3>
            {sessions && sessions.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-2 scrollbar-modern">
                {sessions.map((session) => (
                  <div key={session.sessionId} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                    <p className="font-semibold">Target: {session.targetUserId || 'Unknown'}</p>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">{session.reason || 'No reason provided'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Started: {session.createdAt ? new Date(session.createdAt).toLocaleString() : 'Unknown'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No active sessions</p>
            )}
          </div>

          <div>
            <h3 className="font-semibold mb-3">Recent Error Contexts</h3>
            {errorContexts && errorContexts.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-2 scrollbar-modern">
                {errorContexts.slice(0, 10).map((context) => (
                  <div key={context.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                    <p className="font-semibold">{context.error?.name || 'Unknown Error'}</p>
                    <p className="text-gray-600 dark:text-gray-400 mt-1 truncate">{context.error?.message || 'No message'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {context.timestamp ? new Date(context.timestamp).toLocaleString() : 'Unknown time'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No error contexts found</p>
            )}
          </div>
        </div>

        {auditLogs && (
          <div className="mt-6">
            <h3 className="font-semibold mb-3">Audit Logs</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2 scrollbar-modern">
              {auditLogs.logs.map((log) => (
                <div key={log.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">{log.eventType || 'Unknown Event'}</span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Unknown time'}
                    </span>
                  </div>
                  {log.targetUserId && (
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Target: {log.targetUserId}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
