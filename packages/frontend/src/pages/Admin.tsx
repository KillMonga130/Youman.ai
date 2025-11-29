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
  Shield
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
  const alerts = alertsData?.data?.alerts || [];
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
  const recentAlerts = dashboard?.recentAlerts || [];

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
                      <Badge variant="info">Queue</Badge>
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
                                  {new Date(alert.createdAt).toLocaleString()}
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
                      <Badge variant={(systemMetrics.processingQueueLength ?? 0) > 100 ? 'error' : 'info'}>
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
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
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
                                  : 'info'
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
                              : log.createdAt
                              ? new Date(log.createdAt).toLocaleString()
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
                <div className="space-y-3">
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
                              : error.createdAt
                              ? new Date(error.createdAt).toLocaleString()
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
                <div className="space-y-3">
                  {alerts.map((alert, index) => (
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
                                  : 'info'
                              }
                            >
                              {alert.severity}
                            </Badge>
                            <Badge variant={alert.alertType === 'error' ? 'error' : 'info'}>
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
                          <p className="font-semibold">{config.alertType || config.type || 'Unknown'}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Threshold: {config.threshold ?? 0} • {config.enabled ? 'Enabled' : 'Disabled'}
                          </p>
                        </div>
                        <Badge variant={config.enabled ? 'success' : 'default'}>
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
      </Tabs>
    </div>
  );
}
