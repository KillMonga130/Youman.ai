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