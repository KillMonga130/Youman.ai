import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

// Helper to check if user is authenticated
function hasAuthToken(): boolean {
  return !!localStorage.getItem('auth_token');
}

// Projects
export function useProjects(params?: { page?: number; limit?: number; status?: string; search?: string; sortBy?: string; sortOrder?: string }) {
  return useQuery({
    queryKey: ['projects', params],
    queryFn: () => apiClient.getProjects(params),
    enabled: hasAuthToken(),
  });
}

export function useProject(id: string | null) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => (id ? apiClient.getProject(id) : null),
    enabled: !!id && hasAuthToken(),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; settings?: Record<string, unknown> }) =>
      apiClient.createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; description?: string; settings?: Record<string, unknown> } }) =>
      apiClient.updateProject(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', variables.id] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

// Transformation
export function useHumanize() {
  return useMutation({
    mutationFn: ({
      text,
      options,
    }: {
      text: string;
      options?: { level?: number; strategy?: string; protectedSegments?: string[]; mlModelId?: string };
    }) => apiClient.humanize(text, options || {}),
  });
}

// ML Models
export function useAvailableModels() {
  return useQuery({
    queryKey: ['availableModels'],
    queryFn: () => apiClient.getAvailableModels(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: hasAuthToken(),
  });
}

export function useModelMetrics(modelId: string | null) {
  return useQuery({
    queryKey: ['modelMetrics', modelId],
    queryFn: () => apiClient.getModelMetrics(modelId!),
    enabled: !!modelId && hasAuthToken(),
    staleTime: 1 * 60 * 1000, // 1 minute
    retry: (failureCount, error: any) => {
      // Don't retry on 500s too aggressively
      if (error?.message?.includes('500') || error?.message?.includes('Internal Server Error')) {
        return failureCount < 1;
      }
      return failureCount < 2;
    },
  });
}

// Detection
export function useDetectAI() {
  return useMutation({
    mutationFn: ({ text, providers }: { text: string; providers?: string[] }) => 
      apiClient.detectAI(text, providers),
  });
}

// Usage
export function useUsage() {
  return useQuery({
    queryKey: ['usage'],
    queryFn: () => apiClient.getUsage(),
    enabled: hasAuthToken(),
  });
}

export function useUsageHistory(days?: number) {
  return useQuery({
    queryKey: ['usageHistory', days],
    queryFn: () => apiClient.getUsageHistory(days),
    enabled: hasAuthToken(),
  });
}

export function useUsageTrends() {
  return useQuery({
    queryKey: ['usageTrends'],
    queryFn: () => apiClient.getUsageTrends(),
    enabled: hasAuthToken(),
  });
}

export function useUsageStatistics() {
  return useQuery({
    queryKey: ['usageStatistics'],
    queryFn: () => apiClient.getUsageStatistics(),
    enabled: hasAuthToken(),
  });
}

// Versions
export function useProjectVersions(projectId: string | null) {
  return useQuery({
    queryKey: ['versions', projectId],
    queryFn: () => (projectId ? apiClient.getProjectVersions(projectId) : null),
    enabled: !!projectId && hasAuthToken(),
  });
}

export function useVersion(versionId: string | null) {
  return useQuery({
    queryKey: ['version', versionId],
    queryFn: () => (versionId ? apiClient.getVersion(versionId) : null),
    enabled: !!versionId && hasAuthToken(),
  });
}

export function useCreateVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { projectId: string; content: string; humanizedContent?: string }) =>
      apiClient.createVersion(data.projectId, { content: data.content, humanizedContent: data.humanizedContent }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['versions', variables.projectId] });
    },
  });
}

export function useCompareVersions() {
  return useMutation({
    mutationFn: ({ versionId1, versionId2 }: { versionId1: string; versionId2: string }) =>
      apiClient.compareVersions(versionId1, versionId2),
  });
}

// Auth
export function useLogin() {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      apiClient.login(email, password),
    onSuccess: (data) => {
      apiClient.setToken(data.token);
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: ({ email, password, name }: { email: string; password: string; name: string }) =>
      apiClient.register(email, password, name),
    onSuccess: (data) => {
      apiClient.setToken(data.token);
    },
  });
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: () => apiClient.getCurrentUser(),
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    enabled: hasAuthToken(), // Only fetch if authenticated
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: () => apiClient.logout(),
  });
}

export function useRefreshToken() {
  return useMutation({
    mutationFn: (refreshToken: string) => apiClient.refreshToken(refreshToken),
    onSuccess: (data) => {
      apiClient.setToken(data.accessToken);
      localStorage.setItem('refresh_token', data.refreshToken);
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { firstName?: string; lastName?: string; email?: string }) =>
      apiClient.updateUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      apiClient.changePassword(currentPassword, newPassword),
  });
}

export function useSubscription() {
  return useQuery({
    queryKey: ['subscription'],
    queryFn: () => apiClient.getSubscription(),
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    enabled: hasAuthToken(),
  });
}

// Bulk Operations
export function useBulkDeleteProjects() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => apiClient.bulkDeleteProjects(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useBulkArchiveProjects() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => apiClient.bulkArchiveProjects(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useBulkReprocessProjects() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      ids,
      options,
    }: {
      ids: string[];
      options?: { level?: number; strategy?: string };
    }) => apiClient.bulkReprocessProjects(ids, options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

// ============================================
// Admin Panel Hooks
// ============================================

export function useAdminDashboard() {
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => apiClient.getAdminDashboard(),
    enabled: hasAuthToken(),
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useSystemMetrics() {
  return useQuery({
    queryKey: ['admin', 'metrics'],
    queryFn: () => apiClient.getSystemMetrics(),
    enabled: hasAuthToken(),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

export function usePerformanceHistory(params?: {
  startDate?: string;
  endDate?: string;
  interval?: 'hour' | 'day' | 'week' | 'month';
}) {
  return useQuery({
    queryKey: ['admin', 'performance', params],
    queryFn: () => apiClient.getPerformanceHistory(params || {}),
    enabled: hasAuthToken(),
  });
}

export function useUserActivitySummary() {
  return useQuery({
    queryKey: ['admin', 'activity', 'summary'],
    queryFn: () => apiClient.getUserActivitySummary(),
    enabled: hasAuthToken(),
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useUserActivityList(limit = 50, offset = 0) {
  return useQuery({
    queryKey: ['admin', 'activity', 'list', limit, offset],
    queryFn: () => apiClient.getUserActivityList(limit, offset),
    enabled: hasAuthToken(),
  });
}

export function useAdminLogs(params?: {
  level?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ['admin', 'logs', params],
    queryFn: () => apiClient.getLogs(params || {}),
    enabled: hasAuthToken(),
  });
}

export function useErrorSummary() {
  return useQuery({
    queryKey: ['admin', 'errors', 'summary'],
    queryFn: () => apiClient.getErrorSummary(),
    enabled: hasAuthToken(),
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useErrorLogs(limit = 100, offset = 0, filters?: {
  errorCode?: string;
  userId?: string;
  resolved?: boolean;
}) {
  return useQuery({
    queryKey: ['admin', 'errors', 'logs', limit, offset, filters],
    queryFn: () => apiClient.getErrorLogs(limit, offset, filters),
    enabled: hasAuthToken(),
  });
}

export function useResolveError() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (errorId: string) => apiClient.resolveError(errorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'errors'] });
    },
  });
}

export function useAlertConfigs() {
  return useQuery({
    queryKey: ['admin', 'alerts', 'config'],
    queryFn: () => apiClient.getAlertConfigs(),
    enabled: hasAuthToken(),
  });
}

export function useConfigureAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (config: { type: string; threshold: number; enabled: boolean }) =>
      apiClient.configureAlert(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'alerts', 'config'] });
    },
  });
}

export function useAlerts(acknowledged?: boolean) {
  return useQuery({
    queryKey: ['admin', 'alerts', acknowledged],
    queryFn: () => apiClient.getAlerts(acknowledged),
    enabled: hasAuthToken(),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (alertId: string) => apiClient.acknowledgeAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'alerts'] });
    },
  });
}

/**
 * Check if current user has admin access
 * Uses a lightweight check by attempting to fetch admin dashboard
 */
export function useIsAdmin() {
  return useQuery({
    queryKey: ['admin', 'check'],
    queryFn: async () => {
      try {
        await apiClient.getSystemMetrics();
        return true;
      } catch (error) {
        // Check if error is 403 Forbidden
        if (error instanceof Error) {
          try {
            const errorData = JSON.parse(error.message);
            if (errorData.status === 403 || errorData.code === 'FORBIDDEN') {
              return false;
            }
          } catch {
            // If parsing fails, assume not admin if message contains 403
            if (error.message.includes('403') || error.message.includes('FORBIDDEN')) {
              return false;
            }
          }
        }
        // For other errors, assume not admin to be safe
        return false;
      }
    },
    enabled: hasAuthToken(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: false, // Don't retry on failure
  });
}

// ============================================
// ML Model Management Hooks
// ============================================

export function useModelVersions(modelId: string | null) {
  return useQuery({
    queryKey: ['ml-models', 'versions', modelId],
    queryFn: () => apiClient.getModelVersions(modelId!),
    enabled: !!modelId && hasAuthToken(),
  });
}

export function useLatestModelVersion(modelId: string | null) {
  return useQuery({
    queryKey: ['ml-models', 'versions', 'latest', modelId],
    queryFn: () => apiClient.getLatestModelVersion(modelId!),
    enabled: !!modelId && hasAuthToken(),
    retry: (failureCount, error: any) => {
      // Don't retry on 404s (expected when no versions exist)
      if (error?.message?.includes('404') || error?.message?.includes('Not Found')) {
        return false;
      }
      return failureCount < 2;
    },
    retryOnMount: false,
  });
}

export function useModelVersion(versionId: string | null) {
  return useQuery({
    queryKey: ['ml-models', 'version', versionId],
    queryFn: () => apiClient.getModelVersion(versionId!),
    enabled: !!versionId && hasAuthToken(),
  });
}

export function useCreateModelVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      modelId: string;
      version: string;
      description?: string;
      artifactPath: string;
      config: Record<string, unknown>;
      trainingMetrics?: Record<string, unknown>;
      tags?: string[];
    }) => apiClient.createModelVersion(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ml-models', 'versions', variables.modelId] });
    },
  });
}

export function useUpdateModelVersionStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ versionId, status }: { versionId: string; status: string }) =>
      apiClient.updateModelVersionStatus(versionId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ml-models', 'versions'] });
    },
  });
}

export function useDeploymentHistory(modelId: string | null) {
  return useQuery({
    queryKey: ['ml-models', 'deployments', modelId],
    queryFn: () => apiClient.getDeploymentHistory(modelId!),
    enabled: !!modelId && hasAuthToken(),
  });
}

export function useActiveDeployment(modelId: string | null) {
  return useQuery({
    queryKey: ['ml-models', 'deployment', 'active', modelId],
    queryFn: () => apiClient.getActiveDeployment(modelId!),
    enabled: !!modelId && hasAuthToken(),
    retry: (failureCount, error: any) => {
      // Don't retry on 404s (expected when no deployment exists)
      if (error?.message?.includes('404') || error?.message?.includes('Not Found')) {
        return false;
      }
      return failureCount < 2;
    },
    retryOnMount: false,
  });
}

export function useDeployModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      modelId: string;
      version: string;
      deploymentType?: 'blue-green' | 'canary' | 'rolling';
      environment?: string;
      replicas?: number;
      canaryPercentage?: number;
      autoRollback?: boolean;
    }) => apiClient.deployModel(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ml-models', 'deployments', variables.modelId] });
      queryClient.invalidateQueries({ queryKey: ['ml-models', 'deployment', 'active', variables.modelId] });
    },
  });
}

export function useRollbackModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ modelId, previousVersion }: { modelId: string; previousVersion: string }) =>
      apiClient.rollbackModel(modelId, previousVersion),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ml-models', 'deployments', variables.modelId] });
    },
  });
}

export function useMetricsHistory(modelId: string | null, limit?: number) {
  return useQuery({
    queryKey: ['ml-models', 'metrics', 'history', modelId, limit],
    queryFn: () => apiClient.getMetricsHistory(modelId!, limit),
    enabled: !!modelId && hasAuthToken(),
  });
}

export function useModelDrift(modelId: string | null) {
  return useQuery({
    queryKey: ['ml-models', 'drift', modelId],
    queryFn: () => apiClient.detectModelDrift(modelId!),
    enabled: !!modelId && hasAuthToken(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on 500s too aggressively (drift detection may fail if no data)
      if (error?.message?.includes('500') || error?.message?.includes('Internal Server Error')) {
        return failureCount < 1;
      }
      return failureCount < 2;
    },
  });
}

export function useABTests(status?: string) {
  return useQuery({
    queryKey: ['ml-models', 'ab-tests', status],
    queryFn: () => apiClient.getABTests(status),
    enabled: hasAuthToken(),
  });
}

export function useABTest(testId: string | null) {
  return useQuery({
    queryKey: ['ml-models', 'ab-test', testId],
    queryFn: () => apiClient.getABTest(testId!),
    enabled: !!testId && hasAuthToken(),
  });
}

export function useCreateABTest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      modelIds: string[];
      trafficAllocation: Record<string, number>;
      minSampleSize?: number;
      primaryMetric?: string;
      autoStart?: boolean;
    }) => apiClient.createABTest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ml-models', 'ab-tests'] });
    },
  });
}

export function useStartABTest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (testId: string) => apiClient.startABTest(testId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ml-models', 'ab-tests'] });
    },
  });
}

export function useStopABTest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (testId: string) => apiClient.stopABTest(testId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ml-models', 'ab-tests'] });
    },
  });
}

// ============================================
// DevOps Hooks - Auto-Scaling
// ============================================

export function useAutoScalingStatus(serviceId: string) {
  return useQuery({
    queryKey: ['auto-scaling', serviceId, 'status'],
    queryFn: async () => {
      try {
        return await apiClient.getAutoScalingStatus(serviceId);
      } catch (error) {
        // Silently handle 404 - service not registered
        if (getErrorStatus(error) === 404) {
          throw error; // Re-throw to let React Query handle it
        }
        throw error;
      }
    },
    enabled: hasAuthToken() && !!serviceId,
    refetchInterval: (query) => {
      // Don't refetch if we got a 404
      if (query.state.error && getErrorStatus(query.state.error) === 404) {
        return false;
      }
      return 30 * 1000; // Refetch every 30 seconds
    },
    retry: (failureCount, error) => {
      // Don't retry on 404 errors (service not registered)
      if (getErrorStatus(error) === 404) return false;
      return failureCount < 3;
    },
  });
}

export function useAutoScalingMetrics(serviceId: string) {
  return useQuery({
    queryKey: ['auto-scaling', serviceId, 'metrics'],
    queryFn: async () => {
      try {
        return await apiClient.getAutoScalingMetrics(serviceId);
      } catch (error) {
        // Silently handle 404 - service not registered
        if (getErrorStatus(error) === 404) {
          throw error; // Re-throw to let React Query handle it
        }
        throw error;
      }
    },
    enabled: hasAuthToken() && !!serviceId,
    refetchInterval: (query) => {
      // Don't refetch if we got a 404
      if (query.state.error && getErrorStatus(query.state.error) === 404) {
        return false;
      }
      return 10 * 1000; // Refetch every 10 seconds
    },
    retry: (failureCount, error) => {
      // Don't retry on 404 errors (service not registered)
      if (getErrorStatus(error) === 404) return false;
      return failureCount < 3;
    },
  });
}

// Helper to extract status from error
function getErrorStatus(error: unknown): number | undefined {
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
    // Error message is not JSON
  }
  return undefined;
}

export function useScalingPolicy(serviceId: string) {
  return useQuery({
    queryKey: ['auto-scaling', serviceId, 'policy'],
    queryFn: async () => {
      try {
        return await apiClient.getScalingPolicy(serviceId);
      } catch (error) {
        // Silently handle 404 - service not registered
        if (getErrorStatus(error) === 404) {
          throw error; // Re-throw to let React Query handle it, but don't log
        }
        throw error;
      }
    },
    enabled: hasAuthToken() && !!serviceId,
    retry: (failureCount, error) => {
      // Don't retry on 404 errors (service not registered)
      if (getErrorStatus(error) === 404) return false;
      return failureCount < 3;
    },
  });
}

export function useConfigureScalingPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ serviceId, policy }: { serviceId: string; policy: unknown }) =>
      apiClient.configureScalingPolicy(serviceId, policy as any),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['auto-scaling', variables.serviceId] });
    },
  });
}

export function useScaleUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ serviceId, reason }: { serviceId: string; reason?: string }) =>
      apiClient.scaleUp(serviceId, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['auto-scaling', variables.serviceId] });
    },
  });
}

export function useScaleDown() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (serviceId: string) => apiClient.scaleDown(serviceId),
    onSuccess: (_, serviceId) => {
      queryClient.invalidateQueries({ queryKey: ['auto-scaling', serviceId] });
    },
  });
}

export function useScalingEvents(serviceId: string, limit = 100) {
  return useQuery({
    queryKey: ['auto-scaling', serviceId, 'events', limit],
    queryFn: () => apiClient.getScalingEvents(serviceId, limit),
    enabled: hasAuthToken() && !!serviceId,
  });
}

export function useRegisterService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ serviceId, config }: { serviceId: string; config: { minInstances: number; maxInstances: number; initialInstances?: number } }) =>
      apiClient.registerService(serviceId, config),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['auto-scaling', variables.serviceId] });
    },
  });
}

// ============================================
// DevOps Hooks - Disaster Recovery
// ============================================

export function useDisasterRecoveryStatus() {
  return useQuery({
    queryKey: ['disaster-recovery', 'status'],
    queryFn: () => apiClient.getDisasterRecoveryStatus(),
    enabled: hasAuthToken(),
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

export function useBackups(limit = 100) {
  return useQuery({
    queryKey: ['disaster-recovery', 'backups', limit],
    queryFn: () => apiClient.listBackups(limit),
    enabled: hasAuthToken(),
  });
}

export function useCreateBackup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ type, description }: { type: 'full' | 'incremental' | 'differential'; description?: string }) =>
      apiClient.createBackup(type, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disaster-recovery', 'backups'] });
    },
  });
}

export function useRecoveryPoints(startTime?: string, endTime?: string) {
  return useQuery({
    queryKey: ['disaster-recovery', 'recovery-points', startTime, endTime],
    queryFn: () => apiClient.getRecoveryPoints(startTime, endTime),
    enabled: hasAuthToken(),
  });
}

export function useReplicationStatus(configId?: string) {
  return useQuery({
    queryKey: ['disaster-recovery', 'replication', configId],
    queryFn: () => apiClient.getReplicationStatus(configId),
    enabled: hasAuthToken(),
  });
}

export function useFailoverEvents(configId: string, limit = 100) {
  return useQuery({
    queryKey: ['disaster-recovery', 'failover', configId, 'events', limit],
    queryFn: () => apiClient.getFailoverEvents(configId, limit),
    enabled: hasAuthToken() && !!configId,
  });
}

export function useRecoveryTests(limit = 100) {
  return useQuery({
    queryKey: ['disaster-recovery', 'tests', limit],
    queryFn: () => apiClient.listRecoveryTests(limit),
    enabled: hasAuthToken(),
  });
}

// ============================================
// DevOps Hooks - CDN & Caching
// ============================================

export function useCDNDistributions() {
  return useQuery({
    queryKey: ['cdn', 'distributions'],
    queryFn: () => apiClient.listCDNDistributions(),
    enabled: hasAuthToken(),
  });
}

export function useCacheStats() {
  return useQuery({
    queryKey: ['cdn', 'cache', 'stats'],
    queryFn: () => apiClient.getCacheStats(),
    enabled: hasAuthToken(),
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  });
}

export function useCreateCDNDistribution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (config: { name: string; origin: string; enabled?: boolean }) =>
      apiClient.createCDNDistribution(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cdn', 'distributions'] });
    },
  });
}

export function useInvalidateCache() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patterns: string[]) => apiClient.invalidateCache(patterns),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cdn', 'cache'] });
    },
  });
}

// ============================================
// DevOps Hooks - Performance
// ============================================

export function usePerformanceMetrics() {
  return useQuery({
    queryKey: ['performance', 'metrics'],
    queryFn: () => apiClient.getPerformanceMetrics(),
    enabled: hasAuthToken(),
    refetchInterval: 15 * 1000, // Refetch every 15 seconds
  });
}

export function useSlowQueries(limit = 100) {
  return useQuery({
    queryKey: ['performance', 'slow-queries', limit],
    queryFn: () => apiClient.getSlowQueries(limit),
    enabled: hasAuthToken(),
  });
}

export function useConnectionPoolStats() {
  return useQuery({
    queryKey: ['performance', 'connection-pool', 'stats'],
    queryFn: () => apiClient.getConnectionPoolStats(),
    enabled: hasAuthToken(),
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  });
}

export function usePerformanceAlerts() {
  return useQuery({
    queryKey: ['performance', 'alerts'],
    queryFn: () => apiClient.getPerformanceAlerts(),
    enabled: hasAuthToken(),
  });
}

// ============================================
// DevOps Hooks - Cost Management
// ============================================

export function useCostSummary() {
  return useQuery({
    queryKey: ['cost-management', 'summary'],
    queryFn: () => apiClient.getCostSummary(),
    enabled: hasAuthToken(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCostReport(params?: {
  startDate?: string;
  endDate?: string;
  groupBy?: 'service' | 'feature' | 'customer';
}) {
  return useQuery({
    queryKey: ['cost-management', 'report', params],
    queryFn: () => apiClient.getCostReport(params || {}),
    enabled: hasAuthToken(),
  });
}

export function useCostForecast() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { period: 'week' | 'month' | 'quarter' | 'year'; includeOptimizations?: boolean }) =>
      apiClient.forecastCosts(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-management'] });
    },
  });
}

export function useCostOptimizations() {
  return useQuery({
    queryKey: ['cost-management', 'optimizations'],
    queryFn: () => apiClient.getCostOptimizations(),
    enabled: hasAuthToken(),
  });
}

export function useBudgets() {
  return useQuery({
    queryKey: ['cost-management', 'budgets'],
    queryFn: () => apiClient.listBudgets(),
    enabled: hasAuthToken(),
  });
}

export function useBudgetAlerts(acknowledged?: boolean) {
  return useQuery({
    queryKey: ['cost-management', 'budget-alerts', acknowledged],
    queryFn: () => apiClient.getBudgetAlerts(acknowledged),
    enabled: hasAuthToken(),
  });
}

// ============================================
// DevOps Hooks - Support & Diagnostics
// ============================================

export function useActiveImpersonationSessions() {
  return useQuery({
    queryKey: ['support', 'impersonation', 'sessions'],
    queryFn: () => apiClient.getActiveImpersonationSessions(),
    enabled: hasAuthToken(),
  });
}

export function useErrorContexts(limit = 50, filters?: {
  userId?: string;
  errorCode?: string;
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: ['support', 'error-contexts', limit, filters],
    queryFn: () => apiClient.getErrorContexts(limit, filters),
    enabled: hasAuthToken(),
  });
}

export function useRequestInspections(limit = 50, filters?: {
  userId?: string;
  method?: string;
  statusCode?: number;
}) {
  return useQuery({
    queryKey: ['support', 'request-inspections', limit, filters],
    queryFn: () => apiClient.getRequestInspections(limit, filters),
    enabled: hasAuthToken(),
  });
}

export function useAuditLogs(params?: {
  limit?: number;
  offset?: number;
  eventType?: string;
  adminUserId?: string;
  targetUserId?: string;
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: ['support', 'audit-logs', params],
    queryFn: () => apiClient.getAuditLogs(params || {}),
    enabled: hasAuthToken(),
  });
}

export function useGenerateDiagnosticReport() {
  return useMutation({
    mutationFn: (params: {
      includeSystemInfo?: boolean;
      includeErrorLogs?: boolean;
      includePerformanceMetrics?: boolean;
      startDate?: string;
      endDate?: string;
    }) => apiClient.generateDiagnosticReport(params),
  });
}