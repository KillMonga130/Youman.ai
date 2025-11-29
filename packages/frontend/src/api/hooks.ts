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
