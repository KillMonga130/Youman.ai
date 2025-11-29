// Use environment variable for API URL, fallback to relative path for production
const API_BASE_URL = (import.meta.env?.VITE_API_URL as string | undefined) || '/api/v1';

interface ApiError {
  message: string;
  code: string;
  status: number;
  details?: Record<string, string[]>;
  error?: string;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    // Load token from localStorage on initialization
    const savedToken = localStorage.getItem('auth_token');
    if (savedToken) {
      this.token = savedToken;
    }
  }

  setToken(token: string | null): void {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  private async decodeToken(token: string): Promise<{ exp?: number } | null> {
    try {
      const payload = token.split('.')[1];
      if (!payload) return null;
      return JSON.parse(atob(payload));
    } catch {
      return null;
    }
  }

  private async shouldRefreshToken(token: string): Promise<boolean> {
    const decoded = await this.decodeToken(token);
    if (!decoded || !decoded.exp) return false;
    
    // Refresh if token expires in less than 5 minutes
    const expiresIn = decoded.exp * 1000 - Date.now();
    return expiresIn < 5 * 60 * 1000; // 5 minutes
  }

  private async attemptTokenRefresh(): Promise<boolean> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return false;

    try {
      const tokens = await this.refreshToken(refreshToken);
      return !!tokens.accessToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Clear tokens on refresh failure
      this.setToken(null);
      localStorage.removeItem('refresh_token');
      return false;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryOn401 = true
  ): Promise<T> {
    // Don't set Content-Type for FormData - browser will set it with boundary
    const isFormData = options.body instanceof FormData;
    const headers: HeadersInit = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    };

    let token = this.getToken();
    
    // Auto-refresh token if it's about to expire
    if (token) {
      const needsRefresh = await this.shouldRefreshToken(token);
      if (needsRefresh) {
        const refreshed = await this.attemptTokenRefresh();
        if (refreshed) {
          token = this.getToken();
        }
      }
    }

    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    // Handle 401 - try to refresh token once if we have a token
    if (response.status === 401 && retryOn401) {
      if (token) {
        // Try to refresh the token
        const refreshed = await this.attemptTokenRefresh();
        if (refreshed) {
          // Retry the request with new token
          const newToken = this.getToken();
          if (newToken) {
            (headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`;
            const retryController = new AbortController();
            const retryTimeoutId = setTimeout(() => retryController.abort(), 30000);
            
            const retryResponse = await fetch(`${this.baseUrl}${endpoint}`, {
              ...options,
              headers,
              signal: retryController.signal,
            });
            
            clearTimeout(retryTimeoutId);
            
            if (!retryResponse.ok) {
              // If retry still fails, handle error normally
              return this.handleErrorResponse<T>(retryResponse);
            }
            
            return retryResponse.json();
          }
        }
        
        // Refresh failed - logout user
        this.setToken(null);
        localStorage.removeItem('refresh_token');
      } else {
        // No token at all - user needs to login
        // Don't redirect here, let the ProtectedRoute handle it
        // Just throw a clear error
      }
      
      // Only redirect if we're not already on the login page
      if (!window.location.pathname.includes('/login')) {
        // Use a small delay to avoid race conditions
        setTimeout(() => {
          window.location.href = '/login';
        }, 100);
      }
      
      throw new Error(JSON.stringify({
        message: token ? 'Session expired. Please login again.' : 'Authentication required. Please login.',
        code: token ? 'SESSION_EXPIRED' : 'NO_TOKEN',
        status: 401,
      }));
    }

    if (!response.ok) {
      return this.handleErrorResponse<T>(response);
    }

    return response.json();
  }

  private async handleErrorResponse<T>(response: Response): Promise<T> {
    const errorData: ApiError = await response.json().catch(() => ({
      message: 'An error occurred',
      code: 'UNKNOWN_ERROR',
      status: response.status,
    }));
    
    // Format validation errors with details
    let errorMessage = errorData.error || errorData.message || 'An error occurred';
    if (errorData.details) {
      const details = Object.entries(errorData.details)
        .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
        .join('; ');
      errorMessage = details || errorMessage;
    }
    
    const error: ApiError = {
      ...errorData,
      message: errorMessage,
      status: response.status,
    };
    
    throw new Error(JSON.stringify(error));
  }

  // Auth
  async login(email: string, password: string): Promise<{ token: string; user: { id: string; email: string; name: string } }> {
    const response = await this.request<{ 
      message: string;
      user: { 
        id: string; 
        email: string; 
        firstName: string | null;
        lastName: string | null;
      };
      tokens: {
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
      };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    // Store tokens
    this.setToken(response.tokens.accessToken);
    localStorage.setItem('refresh_token', response.tokens.refreshToken);
    
    // Transform response to match expected format
    return {
      token: response.tokens.accessToken,
      user: {
        id: response.user.id,
        email: response.user.email,
        name: [response.user.firstName, response.user.lastName].filter(Boolean).join(' ') || email,
      },
    };
  }

  async register(email: string, password: string, name: string): Promise<{ token: string; user: { id: string; email: string; name: string } }> {
    // Split name into firstName and lastName
    const trimmedName = name.trim();
    const nameParts = trimmedName.split(/\s+/).filter(part => part.length > 0);
    const firstName = nameParts[0] || undefined;
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined;
    
    // Build payload - only include fields that have values
    const payload: { email: string; password: string; firstName?: string; lastName?: string } = {
      email,
      password,
    };
    
    if (firstName) {
      payload.firstName = firstName;
    }
    
    if (lastName) {
      payload.lastName = lastName;
    }
    
    const response = await this.request<{ 
      message: string;
      user: { 
        id: string; 
        email: string; 
        firstName: string | null;
        lastName: string | null;
      };
      tokens: {
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
      };
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    
    // Store tokens
    this.setToken(response.tokens.accessToken);
    localStorage.setItem('refresh_token', response.tokens.refreshToken);
    
    // Transform response to match expected format
    return {
      token: response.tokens.accessToken,
      user: {
        id: response.user.id,
        email: response.user.email,
        name: [response.user.firstName, response.user.lastName].filter(Boolean).join(' ') || email,
      },
    };
  }

  async logout(): Promise<void> {
    this.setToken(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    // IMPORTANT: Use fetch directly to avoid infinite loop in request() method
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error('Token refresh failed');
      }
      
      const data = await response.json();
      
      // Store new tokens
      this.setToken(data.tokens.accessToken);
      localStorage.setItem('refresh_token', data.tokens.refreshToken);
      
      return data.tokens;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async updateUser(data: { firstName?: string; lastName?: string; email?: string }): Promise<{ user: { id: string; email: string; name: string } }> {
    const response = await this.request<{
      user: {
        id: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
      };
    }>('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    
    return {
      user: {
        id: response.user.id,
        email: response.user.email,
        name: [response.user.firstName, response.user.lastName].filter(Boolean).join(' ') || response.user.email,
      },
    };
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  async getSubscription(): Promise<{
    subscription: {
      id: string;
      tier: string;
      status: string;
      monthlyWordLimit: number;
      monthlyApiCallLimit: number;
      storageLimit: number;
      currentPeriodStart: string;
      currentPeriodEnd: string;
    };
  }> {
    try {
      const response = await this.request<{ success: boolean; data: any }>('/subscription');
      const data = response.data || {};
      return {
        subscription: {
          id: data.id || '',
          tier: data.tier || 'FREE',
          status: data.status || 'ACTIVE',
          monthlyWordLimit: data.monthlyWordLimit || 10000,
          monthlyApiCallLimit: data.monthlyApiCallLimit || 100,
          storageLimit: Number(data.storageLimit) || 104857600,
          currentPeriodStart: data.currentPeriodStart || new Date().toISOString(),
          currentPeriodEnd: data.currentPeriodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
      };
    } catch (error) {
      // Return default free tier subscription on error
      console.error('Failed to fetch subscription, using defaults:', error);
      return {
        subscription: {
          id: 'default',
          tier: 'FREE',
          status: 'ACTIVE',
          monthlyWordLimit: 10000,
          monthlyApiCallLimit: 100,
          storageLimit: 104857600,
          currentPeriodStart: new Date().toISOString(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
      };
    }
  }

  async getCurrentUser(): Promise<{ user: { id: string; email: string; name: string } }> {
    const response = await this.request<{ 
      user: { 
        id: string; 
        email: string; 
        firstName: string | null;
        lastName: string | null;
      };
    }>('/auth/me');
    
    // Transform response to match expected format
    return {
      user: {
        id: response.user.id,
        email: response.user.email,
        name: [response.user.firstName, response.user.lastName].filter(Boolean).join(' ') || response.user.email,
      },
    };
  }

  // Projects
  async getProjects(params?: { page?: number; limit?: number; status?: string; search?: string; sortBy?: string; sortOrder?: string }): Promise<{ 
    projects: Array<{ 
      id: string; 
      name: string; 
      description: string | null;
      createdAt: string; 
      updatedAt: string; 
      wordCount: number; 
      status: string;
      detectionScore?: number; // Detection score from latest transformation (0-100)
    }>; 
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasMore: boolean;
    };
  }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    const query = queryParams.toString();
    return this.request(`/projects${query ? `?${query}` : ''}`);
  }

  async getProject(id: string): Promise<{ project: { id: string; name: string; description: string | null; createdAt: string; updatedAt: string; wordCount: number; status: string } }> {
    return this.request(`/projects/${id}`);
  }

  async createProject(data: { name: string; description?: string; settings?: Record<string, unknown> }): Promise<{ project: { id: string; name: string; description: string | null; createdAt: string; updatedAt: string; wordCount: number; status: string } }> {
    return this.request('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProject(id: string, data: { name?: string; description?: string; settings?: Record<string, unknown> }): Promise<{ project: { id: string; name: string } }> {
    return this.request(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProject(id: string): Promise<void> {
    return this.request(`/projects/${id}`, { method: 'DELETE' });
  }

  // Transformation
  async humanize(
    text: string,
    options: { level?: number; strategy?: string; protectedSegments?: string[]; mlModelId?: string }
  ): Promise<{ 
    id: string;
    humanizedText: string; 
    metrics: { 
      detectionScore: number; 
      perplexity: number; 
      burstiness: number; 
      modificationPercentage: number;
      sentencesModified?: number;
      totalSentences?: number;
    };
    processingTime: number;
    strategyUsed: string;
    levelApplied: number;
  }> {
    return this.request('/transformations/humanize', {
      method: 'POST',
      body: JSON.stringify({ text, level: options.level, strategy: options.strategy, protectedSegments: options.protectedSegments, mlModelId: options.mlModelId }),
    });
  }

  // Detection
  async detectAI(text: string, providers?: string[]): Promise<{
    results: Array<{
      provider: string;
      score: number;
      passed: boolean;
      confidence: number;
    }>;
    averageScore: number;
    overallPassed: boolean;
  }> {
    return this.request('/detection/analyze', {
      method: 'POST',
      body: JSON.stringify({ text, providers }),
    });
  }

  // Get transformation status
  async getTransformationStatus(jobId: string): Promise<{
    status: string;
    progress: number;
    chunksProcessed: number;
    estimatedTimeRemaining?: number;
  }> {
    return this.request(`/transformations/status/${jobId}`);
  }

  // Cancel transformation
  async cancelTransformation(jobId: string): Promise<{ message: string }> {
    return this.request(`/transformations/cancel/${jobId}`, {
      method: 'POST',
    });
  }

  // Usage
  async getUsage(): Promise<{ 
    usage: { 
      wordsProcessed: number; 
      limit: number; 
      resetDate: string;
      tier: string;
      remaining: number;
    } 
  }> {
    try {
      // Use subscription/usage endpoint and transform response
      const response = await this.request<{ success: boolean; data: { words: { used: number; limit: number; periodEnd: string }; tier: string } }>('/subscription/usage');
      const data = response.data || { words: { used: 0, limit: 10000, periodEnd: new Date().toISOString() }, tier: 'FREE' };
      return {
        usage: {
          wordsProcessed: data.words?.used || 0,
          limit: data.words?.limit || 10000,
          resetDate: data.words?.periodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          tier: data.tier || 'FREE',
          remaining: (data.words?.limit || 10000) - (data.words?.used || 0),
        }
      };
    } catch (error) {
      console.error('Failed to fetch usage:', error);
      return {
        usage: {
          wordsProcessed: 0,
          limit: 10000,
          resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          tier: 'FREE',
          remaining: 10000,
        }
      };
    }
  }

  async getUsageHistory(days?: number): Promise<{
    data: {
      userId: string;
      entries: Array<{
        date: string;
        words: number;
        apiCalls: number;
        storage: number;
      }>;
      totals: {
        words: number;
        apiCalls: number;
        storage: number;
      };
    };
  }> {
    const query = days ? `?days=${days}` : '';
    return this.request(`/usage/history${query}`);
  }

  async getUsageTrends(): Promise<{
    data: Array<{
      resourceType: string;
      currentPeriod: number;
      previousPeriod: number;
      changePercent: number;
      trend: 'up' | 'down' | 'stable';
    }>;
  }> {
    return this.request('/usage/trends');
  }

  async getUsageStatistics(): Promise<{
    data: {
      userId: string;
      period: { start: string; end: string };
      words: {
        resourceType: string;
        used: number;
        limit: number;
        remaining: number;
        percentUsed: number;
      };
      apiCalls: {
        resourceType: string;
        used: number;
        limit: number;
        remaining: number;
        percentUsed: number;
      };
      storage: {
        resourceType: string;
        used: number;
        limit: number;
        remaining: number;
        percentUsed: number;
      };
      tier: string;
    };
  }> {
    return this.request('/usage/statistics');
  }

  // Versions
  async getProjectVersions(projectId: string): Promise<{
    versions: Array<{
      id: string;
      versionNumber: number;
      content: string;
      humanizedContent: string | null;
      createdAt: string;
      createdBy: string;
    }>;
  }> {
    return this.request(`/versions/project/${projectId}`);
  }

  async getVersion(versionId: string): Promise<{
    version: {
      id: string;
      versionNumber: number;
      content: string;
      humanizedContent: string | null;
      createdAt: string;
    };
  }> {
    return this.request(`/versions/${versionId}`);
  }

  async getLatestVersion(projectId: string): Promise<{
    id: string;
    versionNumber: number;
    content: string;
    humanizedContent: string | null;
    createdAt: string;
  } | null> {
    try {
      // Use the dedicated endpoint for getting the latest version
      const response = await this.request(`/versions/latest/${projectId}`);
      if (response && response.id) {
        return {
          id: response.id,
          versionNumber: response.versionNumber,
          content: response.content || '',
          humanizedContent: response.humanizedContent || null,
          createdAt: response.createdAt,
        };
      }
      return null;
    } catch (error: unknown) {
      // Check if this is a "no versions" error (valid case for new projects)
      let errorMessage = '';
      let errorCode = '';
      if (error instanceof Error) {
        try {
          const parsedError = JSON.parse(error.message);
          errorCode = parsedError.code || '';
          errorMessage = parsedError.message || '';
        } catch {
          // Not JSON, check message directly
          errorMessage = error.message;
        }
      }

      // If it's a "NO_VERSIONS" error, this is expected for new projects - just return null
      if (errorCode === 'NO_VERSIONS' || errorMessage.includes('No versions found')) {
        return null;
      }

      // For other errors, log and try fallback
      console.error('Failed to get latest version:', error);
      
      // Fallback: try getting all versions and return the first one
      try {
        const versionsResponse = await this.getProjectVersions(projectId);
        if (versionsResponse.versions && versionsResponse.versions.length > 0) {
          const latest = versionsResponse.versions[0];
          return {
            id: latest.id,
            versionNumber: latest.versionNumber,
            content: latest.content || '',
            humanizedContent: latest.humanizedContent || null,
            createdAt: latest.createdAt,
          };
        }
      } catch (fallbackError) {
        // Only log if it's not a "no versions" type error
        const isNoVersionsError = fallbackError instanceof Error && 
          (fallbackError.message.includes('NOT_FOUND') || 
           fallbackError.message.includes('No versions'));
        if (!isNoVersionsError) {
          console.error('Fallback also failed:', fallbackError);
        }
      }
      return null;
    }
  }

  async compareVersions(versionId1: string, versionId2: string): Promise<{
    version1: {
      id: string;
      versionNumber: number;
      content: string;
      createdAt: string;
    };
    version2: {
      id: string;
      versionNumber: number;
      content: string;
      createdAt: string;
    };
    wordCountDiff: number;
    changes: Array<{
      type: 'add' | 'remove' | 'unchanged';
      value: string;
      lineNumber?: number;
    }>;
    addedLines: number;
    removedLines: number;
    unchangedLines: number;
    similarityPercentage: number;
  }> {
    // Backend returns comparison directly, not wrapped
    const response = await this.request('/versions/compare', {
      method: 'POST',
      body: JSON.stringify({ versionId1, versionId2 }),
    });
    return response as any; // Backend returns the comparison directly
  }

  async createVersion(projectId: string, data: { content: string; humanizedContent?: string }): Promise<{
    version: {
      id: string;
      versionNumber: number;
      content: string;
      humanizedContent: string | null;
    };
  }> {
    return this.request(`/versions`, {
      method: 'POST',
      body: JSON.stringify({ projectId, ...data }),
    });
  }

  // Search
  async searchProjects(params: {
    query: string;
    filters?: Record<string, unknown>;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<{
    results: Array<{
      id: string;
      name: string;
      description: string | null;
      status: string;
      wordCount: number;
      createdAt: string;
      updatedAt: string;
      highlights: Array<{ field: string; snippet: string; matchedTerms: string[] }>;
      score: number;
    }>;
    pagination: { page: number; limit: number; total: number; totalPages: number; hasMore: boolean };
    query: string;
    filters: Record<string, unknown>;
    executionTimeMs: number;
  }> {
    return this.request('/search', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getSavedSearches(): Promise<{
    savedSearches: Array<{
      id: string;
      name: string;
      query: string | null;
      filters: Record<string, unknown>;
      useCount: number;
      lastUsedAt: string | null;
      createdAt: string;
    }>;
    total: number;
  }> {
    return this.request('/search/saved');
  }

  async saveSearch(params: {
    name: string;
    query?: string;
    filters: Record<string, unknown>;
  }): Promise<{
    savedSearch: {
      id: string;
      name: string;
      query: string | null;
      filters: Record<string, unknown>;
      useCount: number;
      lastUsedAt: string | null;
      createdAt: string;
    };
  }> {
    return this.request('/search/saved', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async deleteSavedSearch(id: string): Promise<{ message: string }> {
    return this.request(`/search/saved/${id}`, { method: 'DELETE' });
  }

  async updateSavedSearch(id: string, params: { name?: string }): Promise<{
    savedSearch: {
      id: string;
      name: string;
      query: string | null;
      filters: Record<string, unknown>;
    };
  }> {
    return this.request(`/search/saved/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(params),
    });
  }

  async executeSavedSearch(id: string, params?: { page?: number; limit?: number }): Promise<{
    results: Array<{
      id: string;
      name: string;
      description: string | null;
      status: string;
      wordCount: number;
      createdAt: string;
      updatedAt: string;
      highlights: Array<{ field: string; snippet: string; matchedTerms: string[] }>;
      score: number;
    }>;
    pagination: { page: number; limit: number; total: number; totalPages: number; hasMore: boolean };
    query: string;
    filters: Record<string, unknown>;
    executionTimeMs: number;
  }> {
    return this.request(`/search/saved/${id}/execute`, {
      method: 'POST',
      body: JSON.stringify(params || {}),
    });
  }

  // Bulk Operations
  async bulkDeleteProjects(ids: string[]): Promise<{ deleted: number; failed: string[] }> {
    return this.request('/projects/bulk/delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  }

  async bulkArchiveProjects(ids: string[]): Promise<{ archived: number; failed: string[] }> {
    return this.request('/projects/bulk/archive', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  }

  async bulkReprocessProjects(
    ids: string[],
    options?: { level?: number; strategy?: string }
  ): Promise<{ processed: number; failed: string[] }> {
    return this.request('/projects/bulk/reprocess', {
      method: 'POST',
      body: JSON.stringify({ ids, ...options }),
    });
  }

  // Templates
  async getTemplates(): Promise<{
    templates: Array<{
      id: string;
      name: string;
      description: string;
      category: string;
      level: number;
      strategy: string;
      isPublic: boolean;
      useCount: number;
    }>;
  }> {
    try {
      const response = await this.request<{ success: boolean; data: { templates: any[] } }>('/templates');
      // Transform backend response to match frontend expectations
      const templates = (response.data?.templates ?? []).map(t => ({
        id: t.id,
        name: t.name,
        description: t.description || '',
        category: t.category || 'custom',
        level: t.settings?.level || t.level || 3,
        strategy: t.settings?.strategy || t.strategy || 'auto',
        isPublic: t.visibility === 'public' || t.isPublic || false,
        useCount: t.usageCount || t.useCount || 0,
      }));
      return { templates };
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      return { templates: [] };
    }
  }

  async getTemplate(id: string): Promise<{
    template: {
      id: string;
      name: string;
      description: string;
      category: string;
      level: number;
      strategy: string;
      settings: Record<string, unknown>;
    };
  }> {
    return this.request(`/templates/${id}`);
  }

  async createTemplate(data: {
    name: string;
    description?: string;
    category: string;
    level: number;
    strategy: string;
    settings?: Record<string, unknown>;
  }): Promise<{ template: { id: string; name: string } }> {
    return this.request('/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteTemplate(id: string): Promise<{ message: string }> {
    return this.request(`/templates/${id}`, { method: 'DELETE' });
  }

  // Plagiarism - matches backend /plagiarism/check
  async checkPlagiarism(text: string): Promise<{
    success: boolean;
    data: {
      id: string;
      originalityScore: number;
      overallSimilarity: number;
      isOriginal: boolean;
      matches: Array<{
        id: string;
        matchedText: string;
        startPosition: number;
        endPosition: number;
        similarity: number;
        source: { title: string; url?: string; type: string };
        severity: string;
      }>;
      wordCount: number;
      timestamp: string;
    };
  }> {
    return this.request('/plagiarism/check', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  // SEO Analysis - matches backend /seo/analyze (expects document object)
  async analyzeSEO(text: string, keywords?: string[]): Promise<{
    success: boolean;
    analysis: {
      keywords: Array<{
        term: string;
        originalDensity: number;
        targetDensity: number;
        importance: string;
        originalCount: number;
        wordCount: number;
      }>;
      readabilityScore: number;
      wordCount: number;
      headingStructure?: Array<{ level: number; text: string; hasKeyword: boolean }>;
    };
  }> {
    // Backend expects document object with content
    return this.request('/seo/analyze', {
      method: 'POST',
      body: JSON.stringify({
        document: { content: text, title: '', url: '' },
        options: keywords ? { targetKeywords: keywords } : undefined,
      }),
    });
  }

  // SEO Extract Keywords - matches backend /seo/extract-keywords
  async extractSEOKeywords(text: string): Promise<{
    success: boolean;
    keywords: Array<{
      term: string;
      originalDensity: number;
      targetDensity: number;
      importance: string;
      originalCount: number;
      wordCount: number;
    }>;
    count: number;
  }> {
    return this.request('/seo/extract-keywords', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  // Citation - matches backend /citation/extract
  async extractCitations(text: string): Promise<{
    success: boolean;
    data: {
      citations: Array<{
        text: string;
        format: string;
        type: string;
        position: { start: number; end: number };
      }>;
      formatDetection: {
        primaryFormat: string;
        confidence: number;
        hasMixedFormats: boolean;
      };
      digitalIdentifiers: Array<{ type: string; value: string }>;
    };
  }> {
    return this.request('/citation/extract', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  // Citation format detection - matches backend /citation/detect-format
  async detectCitationFormat(text: string): Promise<{
    success: boolean;
    data: {
      primaryFormat: string;
      confidence: number;
      hasMixedFormats: boolean;
      formatBreakdown: Record<string, number>;
    };
  }> {
    return this.request('/citation/detect-format', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  // Citation standardize - matches backend /citation/standardize
  async standardizeCitations(text: string, targetFormat: 'APA' | 'MLA' | 'Chicago' | 'Harvard'): Promise<{
    success: boolean;
    data: {
      standardizedText: string;
      citationsConverted: number;
      success: boolean;
    };
  }> {
    return this.request('/citation/standardize', {
      method: 'POST',
      body: JSON.stringify({ text, targetFormat }),
    });
  }

  // Tone Analysis - matches backend /tone/analyze
  async analyzeTone(text: string): Promise<{
    success: boolean;
    data: {
      overallSentiment: string;
      sentimentScore: number;
      confidence: number;
      emotions: Record<string, number>;
      formality: number;
      subjectivity: number;
    };
  }> {
    return this.request('/tone/analyze', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  // Tone Emotions - matches backend /tone/emotions
  async detectEmotions(text: string): Promise<{
    success: boolean;
    data: {
      emotions: Record<string, number>;
      dominantEmotion: string;
      emotionalIntensity: number;
    };
  }> {
    return this.request('/tone/emotions', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  // ============================================
  // Cloud Storage
  // ============================================

  async getCloudConnections(): Promise<{ connections: Array<{ provider: string; email: string; connectedAt: string }> }> {
    try {
      const response = await this.request<{ connections: any[] }>('/cloud-storage/connections');
      return { connections: response.connections || [] };
    } catch (error) {
      console.error('Failed to fetch cloud connections:', error);
      return { connections: [] };
    }
  }

  async getCloudOAuthUrl(provider: string, redirectUri: string): Promise<{ url: string; state: string }> {
    return this.request(`/cloud-storage/oauth/${provider}?redirectUri=${encodeURIComponent(redirectUri)}`);
  }

  async connectCloudProvider(data: { provider: string; code: string; redirectUri: string }): Promise<{ provider: string; email: string }> {
    // Backend expects uppercase provider name
    const backendData = {
      ...data,
      provider: data.provider.toUpperCase(),
    };
    const response = await this.request<{ provider: string; email: string }>('/cloud-storage/connect', { 
      method: 'POST', 
      body: JSON.stringify(backendData) 
    });
    return response;
  }

  async disconnectCloudProvider(provider: string): Promise<void> {
    // Backend route expects lowercase in path, then converts to uppercase
    return this.request(`/cloud-storage/disconnect/${provider.toLowerCase()}`, { method: 'DELETE' });
  }

  async listCloudFiles(provider: string, folderId?: string): Promise<{
    files: Array<{ id: string; name: string; type: 'file' | 'folder'; size?: number; modifiedAt?: string }>;
    nextPageToken?: string;
  }> {
    const query = folderId ? `?folderId=${encodeURIComponent(folderId)}` : '';
    return this.request(`/cloud-storage/files/${provider}${query}`);
  }

  async importCloudFile(data: { provider: string; fileId: string; projectId?: string }): Promise<{
    content: string;
    fileName: string;
    projectId?: string;
  }> {
    return this.request('/cloud-storage/import', { method: 'POST', body: JSON.stringify(data) });
  }

  async exportToCloud(data: { provider: string; content: string; fileName: string; folderId?: string }): Promise<{
    fileId: string;
    url: string;
  }> {
    return this.request('/cloud-storage/export', { method: 'POST', body: JSON.stringify(data) });
  }

  // ============================================
  // A/B Testing
  // ============================================

  async generateVariations(text: string, count: number, parameters?: { strategies?: string[]; levels?: number[] }): Promise<{
    success: boolean;
    data: { variations: Array<{ id: string; text: string; strategy: string; level: number; detectionScore: number }>; count: number };
  }> {
    return this.request('/ab-testing/variations', { method: 'POST', body: JSON.stringify({ text, count, parameters }) });
  }

  async compareVariations(variations: Array<{ id: string; text: string; strategy: string; level: number; detectionScore: number; differences: string[]; wordCount: number; createdAt: string; isOriginal: boolean }>): Promise<{
    success: boolean;
    data: {
      id: string;
      testId: string;
      variations: Array<{ id: string; text: string; strategy: string; level: number; detectionScore: number; differences: string[]; wordCount: number; createdAt: string; isOriginal: boolean }>;
      sideBySide: Array<{
        segmentIndex: number;
        original: string;
        variations: Array<{
          variationId: string;
          text: string;
          changeType: 'unchanged' | 'modified' | 'added' | 'removed';
        }>;
      }>;
      statistics: {
        bestVariationId: string;
        confidenceLevel: number;
        isStatisticallySignificant: boolean;
        pValue: number;
        sampleSize: number;
        minimumDetectableEffect: number;
        rankings: Array<{
          variationId: string;
          rank: number;
          score: number;
          metricScores: {
            detectionScore: number;
            engagementScore: number;
            qualityScore: number;
          };
        }>;
      };
      recommendations: string[];
      generatedAt: string;
      processingTimeMs: number;
    };
  }> {
    const response = await this.request<{ success: boolean; data: any }>('/ab-testing/compare', { method: 'POST', body: JSON.stringify({ variations }) });
    return response;
  }

  async createABTest(data: { name: string; originalText: string; variationCount: number; userId: string }): Promise<{
    success: boolean;
    data: { id: string; name: string; status: string; variationCount: number; createdAt: string };
  }> {
    return this.request('/ab-testing/tests', { method: 'POST', body: JSON.stringify(data) });
  }

  async getABTest(testId: string): Promise<{ success: boolean; data: { id: string; name: string; status: string; variations: Array<{ id: string; text: string }> } }> {
    return this.request(`/ab-testing/tests/${testId}`);
  }

  async selectABTestWinner(testId: string): Promise<{ success: boolean; data: { winnerId: string; strategy: string; level: number; detectionScore: number } }> {
    return this.request(`/ab-testing/tests/${testId}/winner`, { method: 'POST' });
  }

  // ============================================
  // Scheduling
  // ============================================

  async getScheduledJobs(userId: string): Promise<{
    success: boolean;
    data: { jobs: Array<{ id: string; name: string; status: string; nextExecutionAt: string; enabled: boolean }>; count: number };
  }> {
    try {
      const response = await this.request<{ success: boolean; data: any }>(`/scheduling/jobs?userId=${encodeURIComponent(userId)}`);
      return {
        success: response.success ?? true,
        data: {
          jobs: response.data?.jobs ?? [],
          count: response.data?.count ?? 0,
        },
      };
    } catch (error) {
      console.error('Failed to fetch scheduled jobs:', error);
      return { success: false, data: { jobs: [], count: 0 } };
    }
  }

  async createScheduledJob(data: {
    name: string;
    userId: string;
    schedule: { frequency: 'once' | 'daily' | 'weekly' | 'monthly'; time: string; dayOfWeek?: number; dayOfMonth?: number };
    source: { type: 'text' | 'project' | 'url'; content?: string; projectId?: string; url?: string };
    settings: { level: number; strategy: string };
    notificationEmail: string;
  }): Promise<{ success: boolean; data: { id: string; name: string; status: string; nextExecutionAt: string } }> {
    return this.request('/scheduling/jobs', { method: 'POST', body: JSON.stringify(data) });
  }

  async deleteScheduledJob(jobId: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/scheduling/jobs/${jobId}`, { method: 'DELETE' });
  }

  async pauseScheduledJob(jobId: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/scheduling/jobs/${jobId}/pause`, { method: 'POST' });
  }

  async resumeScheduledJob(jobId: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/scheduling/jobs/${jobId}/resume`, { method: 'POST' });
  }

  async triggerScheduledJob(jobId: string): Promise<{ success: boolean; data: { status: string; result?: string } }> {
    return this.request(`/scheduling/jobs/${jobId}/execute`, { method: 'POST' });
  }

  // ============================================
  // Collaboration
  // ============================================

  async getMyInvitations(): Promise<{ invitations: Array<{ id: string; projectId: string; projectName: string; inviterEmail: string; role: string; expiresAt: string }> }> {
    try {
      const response = await this.request<{ invitations: any[] }>('/collaboration/invitations');
      const invitations = (response.invitations || []).map((inv: any) => ({
        id: inv.id || '',
        projectId: inv.projectId || '',
        projectName: inv.projectName || 'Unknown Project',
        inviterEmail: inv.invitedByName || inv.inviterEmail || 'Unknown',
        role: inv.role || 'viewer',
        expiresAt: inv.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }));
      return { invitations };
    } catch (error) {
      console.error('Failed to fetch invitations:', error);
      return { invitations: [] };
    }
  }

  async acceptInvitation(token: string): Promise<{ message: string; projectId: string; role: string }> {
    return this.request('/collaboration/invitations/accept', { method: 'POST', body: JSON.stringify({ token }) });
  }

  async declineInvitation(token: string): Promise<{ message: string }> {
    return this.request('/collaboration/invitations/decline', { method: 'POST', body: JSON.stringify({ token }) });
  }

  async inviteCollaborator(projectId: string, data: { email: string; role: 'viewer' | 'editor' | 'admin'; message?: string }): Promise<{
    message: string;
    invitation: { id: string; email: string; role: string; expiresAt: string };
  }> {
    return this.request(`/collaboration/projects/${projectId}/invite`, { method: 'POST', body: JSON.stringify(data) });
  }

  async getProjectCollaborators(projectId: string): Promise<{
    collaborators: Array<{ userId: string; email: string; name: string; role: string; joinedAt: string }>;
    total: number;
  }> {
    return this.request(`/collaboration/projects/${projectId}/collaborators`);
  }

  async updateCollaboratorRole(projectId: string, userId: string, role: 'viewer' | 'editor' | 'admin'): Promise<{ message: string }> {
    return this.request(`/collaboration/projects/${projectId}/collaborators/${userId}`, { method: 'PATCH', body: JSON.stringify({ role }) });
  }

  async removeCollaborator(projectId: string, userId: string): Promise<{ message: string }> {
    return this.request(`/collaboration/projects/${projectId}/collaborators/${userId}`, { method: 'DELETE' });
  }

  async getProjectActivity(projectId: string, options?: { page?: number; limit?: number; action?: string; userId?: string; startDate?: string; endDate?: string }): Promise<{
    success: boolean;
    activities: Array<{
      id: string;
      projectId: string;
      userId: string;
      userEmail: string;
      userName: string | null;
      action: string;
      details: Record<string, unknown> | null;
      ipAddress: string | null;
      createdAt: string;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasMore: boolean;
    };
  }> {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.action) params.append('action', options.action);
    if (options?.userId) params.append('userId', options.userId);
    if (options?.startDate) params.append('startDate', options.startDate);
    if (options?.endDate) params.append('endDate', options.endDate);
    const query = params.toString();
    return this.request(`/collaboration/projects/${projectId}/activity${query ? `?${query}` : ''}`);
  }

  // ============================================
  // Invoices
  // ============================================

  async getInvoices(): Promise<{
    invoices: Array<{ id: string; number: string; amount: number; currency: string; status: string; dueDate: string; paidAt?: string; createdAt: string }>;
  }> {
    try {
      const response = await this.request<{ invoices: any[]; count: number }>('/invoices');
      const invoices = (response.invoices || []).map((inv: any) => ({
        id: inv.id || '',
        number: inv.invoiceNumber || inv.number || '',
        amount: inv.amount || 0,
        currency: inv.currency || 'USD',
        status: inv.status || 'pending',
        dueDate: inv.dueDate || new Date().toISOString(),
        paidAt: inv.paidAt,
        createdAt: inv.createdAt || new Date().toISOString(),
      }));
      return { invoices };
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
      return { invoices: [] };
    }
  }

  async getInvoice(invoiceId: string): Promise<{
    invoice: { id: string; number: string; amount: number; currency: string; status: string; items: Array<{ description: string; quantity: number; unitPrice: number; total: number }>; dueDate: string; paidAt?: string };
  }> {
    return this.request(`/invoices/${invoiceId}`);
  }

  async downloadInvoice(invoiceId: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/invoices/${invoiceId}/download`, {
      headers: { Authorization: `Bearer ${this.getToken()}` },
    });
    return response.blob();
  }

  // ============================================
  // MFA
  // ============================================

  async getMFAStatus(): Promise<{ enabled: boolean; methods: Array<{ type: string; enabled: boolean; verifiedAt?: string }> }> {
    try {
      const response = await this.request<{ success: boolean; data: { enabled: boolean; deviceCount: number; backupCodesRemaining: number } }>('/mfa/status');
      // Transform backend response to expected format
      const data = response.data || { enabled: false, deviceCount: 0 };
      return {
        enabled: data.enabled || false,
        methods: [
          { type: 'totp', enabled: data.deviceCount > 0 },
          { type: 'sms', enabled: false },
        ],
      };
    } catch (error) {
      console.error('Failed to fetch MFA status:', error);
      return { enabled: false, methods: [{ type: 'totp', enabled: false }, { type: 'sms', enabled: false }] };
    }
  }

  async setupMFA(method: 'totp' | 'sms', name: string, phoneNumber?: string): Promise<{ 
    deviceId: string;
    method: string;
    secret?: string;
    qrCodeUrl?: string;
    phoneNumber?: string;
    verificationRequired: boolean;
  }> {
    // Convert frontend method names to backend format
    const backendMethod = method === 'totp' ? 'AUTHENTICATOR' : 'SMS';
    const response = await this.request<{ success: boolean; data: any }>('/mfa/enable', { 
      method: 'POST', 
      body: JSON.stringify({ 
        method: backendMethod,
        name,
        ...(phoneNumber && { phoneNumber })
      }) 
    });
    // Backend returns { success: true, data: {...} }
    return response.data || response;
  }

  async verifyMFASetup(deviceId: string, code: string): Promise<{ success: boolean; backupCodes?: string[] }> {
    const response = await this.request<{ success: boolean; data: any }>('/mfa/verify-setup', { 
      method: 'POST', 
      body: JSON.stringify({ deviceId, code }) 
    });
    // Backend returns { success: true, data: {...} }
    return response.data || response;
  }

  async disableMFA(deviceId: string, code: string): Promise<{ success: boolean }> {
    // Backend doesn't have a disable endpoint, we need to remove the device instead
    await this.request(`/mfa/devices/${deviceId}`, { method: 'DELETE' });
    return { success: true };
  }

  // ============================================
  // Localization
  // ============================================

  async localizeContent(data: { text: string; sourceLocale: string; targetLocale: string; options?: { preserveTone?: boolean; adaptCulturally?: boolean } }): Promise<{
    success: boolean;
    data: { localizedText: string; sourceLocale: string; targetLocale: string; adaptations: string[] };
  }> {
    try {
      const response = await this.request<{ success: boolean; data: any }>('/localization/localize', { method: 'POST', body: JSON.stringify(data) });
      return {
        success: response.success ?? true,
        data: {
          localizedText: response.data?.localizedText ?? data.text,
          sourceLocale: response.data?.sourceLocale ?? data.sourceLocale,
          targetLocale: response.data?.targetLocale ?? data.targetLocale,
          adaptations: response.data?.adaptations ?? [],
        },
      };
    } catch (error) {
      console.error('Failed to localize content:', error);
      throw error;
    }
  }

  async getSupportedLocales(): Promise<{ locales: Array<{ code: string; name: string; nativeName: string }> }> {
    return this.request('/localization/locales');
  }

  // ============================================
  // Repurposing
  // ============================================

  async repurposeContent(data: { text: string; targetPlatform: 'twitter' | 'linkedin' | 'instagram' | 'facebook' | 'medium' | 'threads'; options?: { tone?: string; maxLength?: number } }): Promise<{
    success: boolean;
    data: { repurposedContent: string; platform: string; characterCount: number; suggestions: string[] };
  }> {
    try {
      // Transform frontend format to backend format
      const requestBody = {
        content: data.text,
        targetPlatform: data.targetPlatform,
        allowSplitting: true,
        ...(data.options?.tone && { targetTone: data.options.tone }),
        ...(data.options?.maxLength && { customLengthLimit: data.options.maxLength }),
      };
      
      const response = await this.request<{
        id: string;
        originalContent: string;
        targetPlatform: string;
        posts: Array<{ content: string; characterCount: number }>;
        totalCharacters: number;
      }>('/repurposing/repurpose', { method: 'POST', body: JSON.stringify(requestBody) });
      
      // Transform backend response to frontend format
      // Get the first post's content (or combine all posts if multiple)
      const repurposedContent = response.posts && response.posts.length > 0
        ? response.posts.map(post => post.content).join('\n\n')
        : data.text;
      
      const characterCount = response.totalCharacters ?? repurposedContent.length;
      
      return {
        success: true,
        data: {
          repurposedContent,
          platform: response.targetPlatform ?? data.targetPlatform,
          characterCount,
          suggestions: [],
        },
      };
    } catch (error) {
      console.error('Failed to repurpose content:', error);
      throw error;
    }
  }

  async getSupportedPlatforms(): Promise<{ platforms: Array<{ id: string; name: string; maxLength: number; features: string[] }> }> {
    return this.request('/repurposing/platforms');
  }

  // ============================================
  // Webhooks
  // ============================================

  async getWebhooks(userId: string): Promise<{
    success: boolean;
    data: {
      webhooks: Array<{
        id: string;
        name: string;
        url: string;
        events: string[];
        status: string;
        enabled: boolean;
        deliveryCount: number;
        failedCount: number;
        successRate: number;
      }>;
      count: number;
    };
  }> {
    try {
      const response = await this.request<{ success: boolean; data: any }>(`/webhooks?userId=${encodeURIComponent(userId)}`);
      return {
        success: response.success ?? true,
        data: {
          webhooks: response.data?.webhooks ?? [],
          count: response.data?.count ?? 0,
        },
      };
    } catch (error) {
      console.error('Failed to fetch webhooks:', error);
      return { success: false, data: { webhooks: [], count: 0 } };
    }
  }

  async createWebhook(data: {
    userId: string;
    name: string;
    url: string;
    events: string[];
    headers?: Record<string, string>;
  }): Promise<{
    success: boolean;
    data: { id: string; name: string; url: string; events: string[]; secret: string; enabled: boolean };
  }> {
    return this.request('/webhooks', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateWebhook(webhookId: string, data: { name?: string; url?: string; events?: string[]; enabled?: boolean }): Promise<{
    success: boolean;
    data: { id: string; name: string; url: string; events: string[]; enabled: boolean };
  }> {
    return this.request(`/webhooks/${webhookId}`, { method: 'PATCH', body: JSON.stringify(data) });
  }

  async deleteWebhook(webhookId: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/webhooks/${webhookId}`, { method: 'DELETE' });
  }

  async testWebhook(webhookId: string): Promise<{
    success: boolean;
    data: { deliveryId: string; statusCode: number; durationMs: number; error?: string };
  }> {
    return this.request(`/webhooks/${webhookId}/test`, { method: 'POST' });
  }

  async getWebhookEventTypes(): Promise<{ success: boolean; data: { eventTypes: string[] } }> {
    return this.request('/webhooks/events/types');
  }

  // ============================================
  // Branches (Version Control)
  // ============================================

  async getProjectBranches(projectId: string): Promise<{
    branches: Array<{ id: string; name: string; isDefault: boolean; createdAt: string; lastCommitAt: string }>;
  }> {
    return this.request(`/branches/project/${projectId}`);
  }

  async createBranch(data: { projectId: string; name: string; sourceBranchId?: string }): Promise<{
    branch: { id: string; name: string; isDefault: boolean };
  }> {
    return this.request('/branches', { method: 'POST', body: JSON.stringify(data) });
  }

  async mergeBranch(branchId: string, targetBranchId: string): Promise<{
    success: boolean;
    mergedVersion: { id: string; versionNumber: number };
  }> {
    return this.request(`/branches/${branchId}/merge`, { method: 'POST', body: JSON.stringify({ targetBranchId }) });
  }

  async deleteBranch(branchId: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/branches/${branchId}`, { method: 'DELETE' });
  }

  async getBranch(branchId: string): Promise<{
    branch: {
      id: string;
      name: string;
      isDefault: boolean;
      createdAt: string;
      lastCommitAt: string;
    };
  }> {
    return this.request(`/branches/${branchId}`);
  }

  async switchBranch(branchId: string): Promise<{ success: boolean; message: string }> {
    return this.request('/branches/switch', {
      method: 'POST',
      body: JSON.stringify({ branchId }),
    });
  }

  async setDefaultBranch(branchId: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/branches/${branchId}/default`, {
      method: 'PUT',
    });
  }

  async renameBranch(branchId: string, name: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/branches/${branchId}/rename`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
  }

  async compareBranches(branchId1: string, branchId2: string): Promise<{
    differences: Array<{
      type: 'add' | 'remove' | 'modify';
      path: string;
      content: string;
    }>;
    similarity: number;
  }> {
    return this.request('/branches/compare', {
      method: 'POST',
      body: JSON.stringify({ branchId1, branchId2 }),
    });
  }

  async getBranchTree(projectId: string): Promise<{
    tree: Array<{
      branch: {
        id: string;
        projectId: string;
        name: string;
        parentBranchId: string | null;
        baseVersionId: string | null;
        isDefault: boolean;
        createdAt: string;
        createdBy: string | null;
        mergedAt: string | null;
        mergedInto: string | null;
      };
      children: Array<any>;
      depth: number;
    }>;
  }> {
    return this.request(`/branches/tree/${projectId}`);
  }

  async getDefaultBranch(projectId: string): Promise<{
    branch: {
      id: string;
      name: string;
      isDefault: boolean;
    };
  }> {
    return this.request(`/branches/default/${projectId}`);
  }

  // ============================================
  // Template Advanced Features
  // ============================================

  async getTemplateCategories(): Promise<{
    categories: Array<{ id: string; name: string; description: string }>;
  }> {
    try {
      const response = await this.request<{ success: boolean; data: { categories: string[] } }>('/templates/categories');
      const categoryStrings = response.data?.categories ?? [];
      const categoryMap: Record<string, { name: string; description: string }> = {
        'blog-posts': { name: 'Blog Posts', description: 'Templates for blog posts' },
        'academic-papers': { name: 'Academic Papers', description: 'Templates for academic papers' },
        'creative-writing': { name: 'Creative Writing', description: 'Templates for creative writing' },
        'business-content': { name: 'Business Content', description: 'Templates for business content' },
        'technical-docs': { name: 'Technical Docs', description: 'Templates for technical documentation' },
        'social-media': { name: 'Social Media', description: 'Templates for social media' },
        'marketing': { name: 'Marketing', description: 'Templates for marketing' },
        'custom': { name: 'Custom', description: 'Custom templates' },
      };
      return {
        categories: categoryStrings.map(cat => ({
          id: cat,
          name: categoryMap[cat]?.name || cat,
          description: categoryMap[cat]?.description || `Templates for ${cat}`,
        })),
      };
    } catch (error) {
      console.error('Failed to fetch template categories:', error);
      return { categories: [] };
    }
  }

  async applyTemplate(templateId: string, projectId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.request(`/templates/${templateId}/apply`, {
      method: 'POST',
      body: JSON.stringify({ projectId }),
    });
  }

  async exportTemplate(templateId: string): Promise<{
    template: {
      id: string;
      name: string;
      description: string;
      category: string;
      level: number;
      strategy: string;
      settings: Record<string, unknown>;
    };
  }> {
    return this.request(`/templates/${templateId}/export`);
  }

  async importTemplate(data: {
    template: {
      name: string;
      description: string;
      category: string;
      level: number;
      strategy: string;
      settings: Record<string, unknown>;
    };
  }): Promise<{
    template: {
      id: string;
      name: string;
    };
  }> {
    return this.request('/templates/import', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async shareTemplate(templateId: string, userId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.request(`/templates/${templateId}/share`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  async unshareTemplate(shareId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.request(`/templates/shares/${shareId}`, {
      method: 'DELETE',
    });
  }

  async getTemplateShares(templateId: string): Promise<{
    shares: Array<{
      id: string;
      userId: string;
      userName: string;
      sharedAt: string;
    }>;
  }> {
    return this.request(`/templates/${templateId}/shares`);
  }

  async rateTemplate(templateId: string, rating: number): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.request(`/templates/${templateId}/rate`, {
      method: 'POST',
      body: JSON.stringify({ rating }),
    });
  }

  async duplicateTemplate(templateId: string): Promise<{
    template: {
      id: string;
      name: string;
    };
  }> {
    return this.request(`/templates/${templateId}/duplicate`, {
      method: 'POST',
    });
  }

  async updateTemplate(id: string, data: {
    name?: string;
    description?: string;
    category?: string;
    level?: number;
    strategy?: string;
    settings?: Record<string, unknown>;
  }): Promise<{ template: { id: string; name: string } }> {
    return this.request(`/templates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // ============================================
  // Subscription Management
  // ============================================

  async updateSubscription(tier: string): Promise<{
    subscription: {
      id: string;
      tier: string;
      status: string;
    };
  }> {
    return this.request('/subscription', {
      method: 'PUT',
      body: JSON.stringify({ tier }),
    });
  }

  async cancelSubscription(): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.request('/subscription', {
      method: 'DELETE',
    });
  }

  async getSubscriptionTiers(): Promise<{
    success: boolean;
    data: Array<{
      tier: string;
      limits: {
        monthlyWordLimit: number;
        monthlyApiCallLimit: number;
        storageLimit: string;
        maxConcurrentProjects: number | string;
        priorityProcessing: boolean;
        customAiModels: boolean;
        advancedAnalytics: boolean;
        teamCollaboration: boolean;
        apiAccess: boolean;
      };
    }>;
  }> {
    const result = await this.request<{ success: boolean; data: any[] }>('/subscription/tiers');
    return result;
  }

  async getUpgradePreview(tier: string): Promise<{
    preview: {
      currentTier: string;
      newTier: string;
      priceDifference: number;
      newLimits: {
        monthlyWordLimit: number;
        monthlyApiCallLimit: number;
        storageLimit: number;
      };
    };
  }> {
    const response = await this.request<{ success: boolean; data: {
      currentTier: string;
      newTier: string;
      priceDifference: number;
      newLimits: {
        monthlyWordLimit: number;
        monthlyApiCallLimit: number;
        storageLimit: number;
      };
    } }>(`/subscription/upgrade-preview?tier=${encodeURIComponent(tier)}`);
    return { preview: response.data };
  }

  async checkQuota(resourceType: 'words' | 'api_calls' | 'storage', amount: number): Promise<{
    allowed: boolean;
    remaining: number;
    upgradeRequired: boolean;
    message?: string;
  }> {
    try {
      const response = await this.request<{ success: boolean; data: { allowed: boolean; remaining: number; upgradeRequired: boolean; message?: string } }>(
        `/subscription/quota/check?resourceType=${resourceType}&amount=${amount}`
      );
      return response.data;
    } catch (err: unknown) {
      // Handle 402 Payment Required (quota exceeded)
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      try {
        const errorData = JSON.parse(errorMessage);
        if (errorData.status === 402 || errorData.code === 'QUOTA_EXCEEDED') {
          return {
            allowed: false,
            remaining: errorData.remaining || 0,
            upgradeRequired: errorData.upgradeRequired !== false,
            message: errorData.message || errorData.error || 'Quota exceeded',
          };
        }
      } catch {
        // If parsing fails, rethrow original error
      }
      throw err;
    }
  }

  async getBillingDashboard(): Promise<{
    success: boolean;
    data: {
      subscription: any;
      usage: {
        words: {
          used: number;
          limit: number;
          remaining: number;
          percentUsed: number;
          periodStart: string;
          periodEnd: string;
        };
        apiCalls: {
          used: number;
          limit: number;
          remaining: number;
          percentUsed: number;
          periodStart: string;
          periodEnd: string;
        };
        storage: {
          used: number;
          limit: number;
          remaining: number;
          percentUsed: number;
          periodStart: string;
          periodEnd: string;
        };
      };
      invoices: Array<{
        id: string;
        amount: number;
        currency: string;
        status: string;
        periodStart: string | Date;
        periodEnd: string | Date;
        paidAt: string | Date | null;
        invoiceUrl: string | null;
      }>;
      paymentMethods: Array<{
        id: string;
        type: string;
        brand: string | null;
        last4: string | null;
        expiryMonth: number | null;
        expiryYear: number | null;
        isDefault: boolean;
      }>;
    };
  }> {
    return this.request('/subscription/billing');
  }

  // ============================================
  // A/B Testing Advanced Features
  // ============================================

  async updateABTestStatus(testId: string, status: 'draft' | 'running' | 'paused' | 'completed'): Promise<{
    success: boolean;
    data: { id: string; status: string };
  }> {
    return this.request(`/ab-testing/tests/${testId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async deleteABTest(testId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.request(`/ab-testing/tests/${testId}`, {
      method: 'DELETE',
    });
  }

  async trackPerformance(variationId: string, metrics: {
    views?: number;
    clicks?: number;
    conversions?: number;
  }): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.request('/ab-testing/track', {
      method: 'POST',
      body: JSON.stringify({ variationId, metrics }),
    });
  }

  async getPerformanceMetrics(variationId: string): Promise<{
    success: boolean;
    data: {
      variationId: string;
      views: number;
      clicks: number;
      conversions: number;
      conversionRate: number;
      clickThroughRate: number;
    };
  }> {
    return this.request(`/ab-testing/metrics/${variationId}`);
  }

  async selectWinner(testId: string, variationId: string): Promise<{
    success: boolean;
    data: {
      winnerId: string;
      strategy: string;
      level: number;
      detectionScore: number;
    };
  }> {
    return this.request(`/ab-testing/tests/${testId}/winner`, {
      method: 'POST',
      body: JSON.stringify({ variationId }),
    });
  }

  async generateTestReport(testId: string): Promise<{
    success: boolean;
    data: {
      testId: string;
      report: {
        summary: string;
        winner: string;
        metrics: Record<string, number>;
      };
    };
  }> {
    return this.request(`/ab-testing/tests/${testId}/report`);
  }

  // ============================================
  // Scheduled Jobs Update
  // ============================================

  async updateScheduledJob(jobId: string, data: {
    name?: string;
    schedule?: {
      frequency: 'once' | 'daily' | 'weekly' | 'monthly';
      time?: string;
      dayOfWeek?: number;
      dayOfMonth?: number;
    };
    settings?: {
      level?: number;
      strategy?: string;
    };
    enabled?: boolean;
  }): Promise<{
    success: boolean;
    data: { id: string; name: string; status: string };
  }> {
    return this.request(`/scheduling/jobs/${jobId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // ============================================
  // Collaboration Advanced Features
  // ============================================

  async getProjectInvitations(projectId: string): Promise<{
    invitations: Array<{
      id: string;
      email: string;
      role: string;
      status: string;
      expiresAt: string;
      createdAt: string;
    }>;
  }> {
    return this.request(`/collaboration/projects/${projectId}/invitations`);
  }

  async revokeInvitation(projectId: string, invitationId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.request(`/collaboration/projects/${projectId}/invitations/${invitationId}`, {
      method: 'DELETE',
    });
  }

  // ============================================
  // Tone Analysis Advanced Features
  // ============================================

  async adjustTone(text: string, targetTone: {
    sentiment?: 'positive' | 'neutral' | 'negative';
    formality?: number;
    emotion?: string;
  }): Promise<{
    success: boolean;
    data: {
      adjustedText: string;
      changes: string[];
    };
  }> {
    return this.request('/tone/adjust', {
      method: 'POST',
      body: JSON.stringify({ text, targetTone }),
    });
  }

  async checkToneConsistency(texts: string[]): Promise<{
    success: boolean;
    data: {
      consistencyScore: number;
      inconsistencies: Array<{
        textIndex: number;
        issue: string;
      }>;
    };
  }> {
    return this.request('/tone/consistency', {
      method: 'POST',
      body: JSON.stringify({ texts }),
    });
  }

  async targetTone(text: string, targetTone: {
    sentiment: 'positive' | 'neutral' | 'negative';
    formality: number;
    emotion: string;
  }): Promise<{
    success: boolean;
    data: {
      targetedText: string;
      adjustments: string[];
    };
  }> {
    return this.request('/tone/target', {
      method: 'POST',
      body: JSON.stringify({ text, targetTone }),
    });
  }

  // ML Model Management
  async createModelVersion(data: {
    modelId: string;
    version: string;
    description?: string;
    artifactPath: string;
    config: Record<string, unknown>;
    trainingMetrics?: Record<string, unknown>;
    tags?: string[];
  }): Promise<{
    id: string;
    modelId: string;
    version: string;
    status: string;
    createdAt: string;
  }> {
    return this.request('/ml-models/versions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getModelVersions(modelId: string): Promise<Array<{
    id: string;
    modelId: string;
    version: string;
    status: string;
    createdAt: string;
    description?: string;
  }>> {
    return this.request(`/ml-models/${modelId}/versions`);
  }

  async deployModel(data: {
    modelId: string;
    version: string;
    deploymentType?: 'blue-green' | 'canary' | 'rolling';
    environment?: string;
    replicas?: number;
    canaryPercentage?: number;
    autoRollback?: boolean;
  }): Promise<{
    id: string;
    modelId: string;
    version: string;
    status: string;
    deployedAt: string;
  }> {
    return this.request('/ml-models/deployments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getModelMetrics(modelId: string): Promise<{
    modelId: string;
    version: string;
    accuracy: number;
    latency: number;
    throughput: number;
    detectionEvasionRate: number;
    errorRate: number;
    totalRequests: number;
  }> {
    return this.request(`/ml-models/${modelId}/metrics`);
  }

  async detectModelDrift(modelId: string): Promise<{
    modelId: string;
    driftDetected: boolean;
    severity: string;
    driftScore: number;
    recommendations: string[];
  }> {
    return this.request(`/ml-models/${modelId}/drift`);
  }

  async getAvailableModels(): Promise<{
    models: Array<{
      id: string;
      name: string;
      type: 'llm' | 'custom';
      provider?: string;
      available: boolean;
    }>;
  }> {
    return this.request('/ml-models/available');
  }

  async compareModels(modelIds: string[]): Promise<{
    models: Array<{
      modelId: string;
      version: string;
      metrics: {
        accuracy: number;
        latency: number;
        detectionEvasionRate: number;
      };
    }>;
    winner?: string;
    isStatisticallySignificant: boolean;
    recommendations: string[];
  }> {
    return this.request('/ml-models/compare', {
      method: 'POST',
      body: JSON.stringify({ modelIds }),
    });
  }

  // ============================================
  // Admin Panel
  // ============================================

  async getAdminDashboard(): Promise<{
    success: boolean;
    data: {
      systemMetrics: {
        timestamp: string;
        activeUsers: number;
        totalUsers: number;
        processingQueueLength: number;
        resourceUtilization: {
          cpuUsage: number;
          memoryUsage: number;
          memoryUsedMB: number;
          memoryTotalMB: number;
          diskUsage: number;
          diskUsedGB: number;
          diskTotalGB: number;
        };
        performance: {
          averageProcessingTimePer1000Words: number;
          requestsPerMinute: number;
          averageResponseTime: number;
          errorRate: number;
          successRate: number;
        };
      };
      userActivity: {
        totalTransformations: number;
        totalWordsProcessed: number;
        totalApiCalls: number;
        totalErrors: number;
        activeUsersToday: number;
        activeUsersThisWeek: number;
        activeUsersThisMonth: number;
        newUsersToday: number;
        newUsersThisWeek: number;
        newUsersThisMonth: number;
      };
      errorSummary: {
        totalErrors: number;
        errorsToday: number;
        errorsThisWeek: number;
        errorsByType: Record<string, number>;
        topErrors: Array<{
          errorCode: string;
          count: number;
          lastOccurrence: string;
        }>;
      };
      recentAlerts: Array<{
        id: string;
        alertType: string;
        severity: string;
        message: string;
        currentValue: number;
        threshold: number;
        triggeredAt: string;
        acknowledged: boolean;
        acknowledgedAt?: string;
        acknowledgedBy?: string;
      }>;
      performanceHistory: Array<{
        timestamp: string;
        processingTime: number;
        requestCount: number;
        errorCount: number;
        averageResponseTime: number;
      }>;
    };
  }> {
    return this.request('/admin/dashboard');
  }

  async getSystemMetrics(): Promise<{
    success: boolean;
    data: {
      timestamp: string;
      activeUsers: number;
      totalUsers: number;
      processingQueueLength: number;
      resourceUtilization: {
        cpuUsage: number;
        memoryUsage: number;
        memoryUsedMB: number;
        memoryTotalMB: number;
        diskUsage: number;
        diskUsedGB: number;
        diskTotalGB: number;
      };
      performance: {
        averageProcessingTimePer1000Words: number;
        requestsPerMinute: number;
        averageResponseTime: number;
        errorRate: number;
        successRate: number;
      };
    };
  }> {
    return this.request('/admin/metrics');
  }

  async getPerformanceHistory(params: {
    startDate?: string;
    endDate?: string;
    interval?: 'hour' | 'day' | 'week' | 'month';
  }): Promise<{
    success: boolean;
    data: Array<{
      timestamp: string;
      averageProcessingTime: number;
      requestsPerInterval: number;
    }>;
  }> {
    const query = new URLSearchParams();
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
    if (params.interval) query.append('interval', params.interval);
    return this.request(`/admin/metrics/performance?${query.toString()}`);
  }

  async getUserActivitySummary(): Promise<{
    success: boolean;
    data: {
      totalTransformations: number;
      totalWordsProcessed: number;
      totalApiCalls: number;
      totalErrors: number;
      activeUsersToday: number;
      activeUsersThisWeek: number;
      activeUsersThisMonth: number;
      newUsersToday: number;
      newUsersThisWeek: number;
      newUsersThisMonth: number;
    };
  }> {
    return this.request('/admin/activity');
  }

  async getUserActivityList(limit = 50, offset = 0): Promise<{
    success: boolean;
    data: Array<{
      userId: string;
      email: string;
      lastActive: string;
      transformationsCount: number;
      wordsProcessed: number;
      apiCallsCount: number;
      errorsCount: number;
      subscriptionTier: string;
    }>;
  }> {
    return this.request(`/admin/activity/users?limit=${limit}&offset=${offset}`);
  }

  async getLogs(params: {
    level?: string;
    startDate?: string;
    endDate?: string;
    userId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    success: boolean;
    data: {
      logs: Array<{
        id: string;
        level: string;
        message: string;
        userId?: string;
        endpoint?: string;
        timestamp: string;
      }>;
      total: number;
    };
  }> {
    const query = new URLSearchParams();
    if (params.level) query.append('level', params.level);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
    if (params.userId) query.append('userId', params.userId);
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.offset) query.append('offset', params.offset.toString());
    return this.request(`/admin/logs?${query.toString()}`);
  }

  async getErrorSummary(): Promise<{
    success: boolean;
    data: {
      totalErrors: number;
      errorsToday: number;
      errorsThisWeek: number;
      errorsByType: Record<string, number>;
      topErrors: Array<{
        errorCode: string;
        count: number;
        lastOccurrence: string;
      }>;
    };
  }> {
    return this.request('/admin/errors');
  }

  async getErrorLogs(limit = 100, offset = 0, filters?: {
    errorCode?: string;
    userId?: string;
    resolved?: boolean;
  }): Promise<{
    success: boolean;
    data: {
      logs: Array<{
        id: string;
        timestamp: string;
        errorCode: string;
        message: string;
        userId?: string;
        endpoint?: string;
        stackTrace?: string;
        metadata?: Record<string, unknown>;
        resolved: boolean;
      }>;
      total: number;
    };
  }> {
    const query = new URLSearchParams();
    query.append('limit', limit.toString());
    query.append('offset', offset.toString());
    if (filters?.errorCode) query.append('errorCode', filters.errorCode);
    if (filters?.userId) query.append('userId', filters.userId);
    if (filters?.resolved !== undefined) query.append('resolved', filters.resolved.toString());
    return this.request(`/admin/errors/logs?${query.toString()}`);
  }

  async resolveError(errorId: string): Promise<{
    success: boolean;
    data: {
      id: string;
      resolved: boolean;
      resolvedAt: string;
    };
  }> {
    return this.request(`/admin/errors/${errorId}/resolve`, { method: 'POST' });
  }

  async getAlertConfigs(): Promise<{
    success: boolean;
    data: Array<{
      id: string;
      type: string;
      threshold: number;
      enabled: boolean;
    }>;
  }> {
    return this.request('/admin/alerts/config');
  }

  async configureAlert(config: {
    type: string;
    threshold: number;
    enabled: boolean;
  }): Promise<{
    success: boolean;
    data: {
      id: string;
      type: string;
      threshold: number;
      enabled: boolean;
    };
  }> {
    return this.request('/admin/alerts/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  async getAlerts(acknowledged?: boolean): Promise<{
    success: boolean;
    data: Array<{
      id: string;
      type: string;
      severity: string;
      message: string;
      createdAt: string;
      acknowledged: boolean;
      acknowledgedAt?: string;
      acknowledgedBy?: string;
    }>;
  }> {
    const query = acknowledged !== undefined ? `?acknowledged=${acknowledged}` : '';
    return this.request(`/admin/alerts${query}`);
  }

  async acknowledgeAlert(alertId: string): Promise<{
    success: boolean;
    data: {
      id: string;
      acknowledged: boolean;
      acknowledgedAt: string;
    };
  }> {
    return this.request(`/admin/alerts/${alertId}/acknowledge`, { method: 'POST' });
  }

  // ============================================
  // ML Model Management (Additional)
  // ============================================

  async getLatestModelVersion(modelId: string): Promise<{
    id: string;
    modelId: string;
    version: string;
    status: string;
    createdAt: string;
  }> {
    return this.request(`/ml-models/${modelId}/versions/latest`);
  }

  async getModelVersion(versionId: string): Promise<{
    id: string;
    modelId: string;
    version: string;
    status: string;
    createdAt: string;
    description?: string;
    config?: Record<string, unknown>;
    trainingMetrics?: Record<string, unknown>;
  }> {
    return this.request(`/ml-models/versions/${versionId}`);
  }

  async updateModelVersionStatus(versionId: string, status: string): Promise<{
    success: boolean;
    versionId: string;
    status: string;
  }> {
    return this.request(`/ml-models/versions/${versionId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // ============================================
  // DevOps Features - Auto-Scaling
  // ============================================

  async getAutoScalingStatus(serviceId: string): Promise<{
    serviceId: string;
    currentInstances: number;
    minInstances: number;
    maxInstances: number;
    targetInstances: number;
    status: string;
  }> {
    return this.request(`/auto-scaling/${serviceId}/status`);
  }

  async getAutoScalingMetrics(serviceId: string): Promise<{
    serviceId: string;
    cpuUsage: number;
    memoryUsage: number;
    queueDepth: number;
    requestRate: number;
    timestamp: string;
  }> {
    return this.request(`/auto-scaling/${serviceId}/metrics`);
  }

  async getScalingPolicy(serviceId: string): Promise<{
    serviceId: string;
    minInstances: number;
    maxInstances: number;
    targetCpuUtilization: number;
    scaleUpThreshold: number;
    scaleDownThreshold: number;
    cooldownPeriod: number;
  }> {
    return this.request(`/auto-scaling/${serviceId}/policy`);
  }

  async configureScalingPolicy(serviceId: string, policy: {
    minInstances: number;
    maxInstances: number;
    targetCpuUtilization?: number;
    scaleUpThreshold?: number;
    scaleDownThreshold?: number;
    cooldownPeriod?: number;
  }): Promise<{ success: boolean; policy: unknown }> {
    return this.request(`/auto-scaling/${serviceId}/policy`, {
      method: 'POST',
      body: JSON.stringify({ policy }),
    });
  }

  async scaleUp(serviceId: string, reason?: string): Promise<{
    serviceId: string;
    eventId: string;
    previousInstances: number;
    newInstances: number;
    reason: string;
    timestamp: string;
  }> {
    return this.request(`/auto-scaling/${serviceId}/scale-up`, {
      method: 'POST',
      body: JSON.stringify({ reason: reason || 'Manual scale up' }),
    });
  }

  async scaleDown(serviceId: string): Promise<{
    serviceId: string;
    eventId: string;
    previousInstances: number;
    newInstances: number;
    reason: string;
    timestamp: string;
  }> {
    return this.request(`/auto-scaling/${serviceId}/scale-down`, {
      method: 'POST',
    });
  }

  async getLoadPrediction(serviceId: string, hoursAhead = 24): Promise<{
    serviceId: string;
    predictedLoad: number;
    confidence: number;
    hoursAhead: number;
    timestamp: string;
  }> {
    return this.request(`/auto-scaling/${serviceId}/prediction?hoursAhead=${hoursAhead}`);
  }

  async getCostOptimization(serviceId: string): Promise<{
    serviceId: string;
    recommendations: Array<{
      type: string;
      description: string;
      estimatedSavings: number;
      priority: string;
    }>;
    currentCost: number;
    projectedCost: number;
  }> {
    return this.request(`/auto-scaling/${serviceId}/cost-optimization`);
  }

  async getScalingEvents(serviceId: string, limit = 100): Promise<Array<{
    id: string;
    serviceId: string;
    type: 'scale_up' | 'scale_down';
    previousInstances: number;
    newInstances: number;
    reason: string;
    timestamp: string;
  }>> {
    return this.request(`/auto-scaling/${serviceId}/events?limit=${limit}`);
  }

  async registerService(serviceId: string, config: {
    minInstances: number;
    maxInstances: number;
    initialInstances?: number;
  }): Promise<{ success: boolean; serviceId: string }> {
    return this.request(`/auto-scaling/${serviceId}/register`, {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  // ============================================
  // DevOps Features - Disaster Recovery
  // ============================================

  async getDisasterRecoveryStatus(): Promise<{
    status: string;
    lastBackup: string;
    replicationStatus: string;
    failoverReady: boolean;
  }> {
    return this.request('/disaster-recovery/status');
  }

  async createBackup(type: 'full' | 'incremental' | 'differential', description?: string): Promise<{
    id: string;
    type: string;
    status: string;
    createdAt: string;
    description?: string;
  }> {
    return this.request('/disaster-recovery/backups', {
      method: 'POST',
      body: JSON.stringify({ type, description }),
    });
  }

  async listBackups(limit = 100): Promise<Array<{
    id: string;
    type: string;
    status: string;
    size: number;
    createdAt: string;
    description?: string;
  }>> {
    return this.request(`/disaster-recovery/backups?limit=${limit}`);
  }

  async getBackup(backupId: string): Promise<{
    id: string;
    type: string;
    status: string;
    size: number;
    createdAt: string;
    description?: string;
  }> {
    return this.request(`/disaster-recovery/backups/${backupId}`);
  }

  async verifyBackup(backupId: string): Promise<{
    backupId: string;
    verified: boolean;
    integrity: string;
    timestamp: string;
  }> {
    return this.request(`/disaster-recovery/backups/${backupId}/verify`, {
      method: 'POST',
    });
  }

  async deleteBackup(backupId: string): Promise<{ success: boolean }> {
    return this.request(`/disaster-recovery/backups/${backupId}`, {
      method: 'DELETE',
    });
  }

  async getRecoveryPoints(startTime?: string, endTime?: string): Promise<Array<{
    id: string;
    timestamp: string;
    type: string;
    status: string;
  }>> {
    const query = new URLSearchParams();
    if (startTime) query.append('startTime', startTime);
    if (endTime) query.append('endTime', endTime);
    return this.request(`/disaster-recovery/recovery-points?${query.toString()}`);
  }

  async restoreFromBackup(backupId: string, validateOnly = false): Promise<{
    id: string;
    backupId: string;
    status: string;
    validateOnly: boolean;
    createdAt: string;
  }> {
    return this.request('/disaster-recovery/restore', {
      method: 'POST',
      body: JSON.stringify({ backupId, validateOnly }),
    });
  }

  async restoreToPointInTime(pointInTime: string, validateOnly = false): Promise<{
    id: string;
    pointInTime: string;
    status: string;
    validateOnly: boolean;
    createdAt: string;
  }> {
    return this.request('/disaster-recovery/restore', {
      method: 'POST',
      body: JSON.stringify({ pointInTime, validateOnly }),
    });
  }

  async getReplicationStatus(configId?: string): Promise<Array<{
    configId: string;
    sourceRegion: string;
    targetRegion: string;
    status: string;
    lagMs: number;
    lastSyncTime: string;
  }>> {
    const query = configId ? `?configId=${configId}` : '';
    return this.request(`/disaster-recovery/replication/status${query}`);
  }

  async configureReplication(config: {
    sourceRegion: string;
    targetRegions: string[];
    mode: string;
    enabled?: boolean;
  }): Promise<{
    configId: string;
    sourceRegion: string;
    targetRegions: string[];
    mode: string;
    enabled: boolean;
  }> {
    return this.request('/disaster-recovery/replication', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async initiateFailover(configId: string, targetRegion: string, reason: string, force = false): Promise<{
    eventId: string;
    configId: string;
    targetRegion: string;
    status: string;
    reason: string;
    timestamp: string;
  }> {
    return this.request(`/disaster-recovery/failover/${configId}/initiate`, {
      method: 'POST',
      body: JSON.stringify({ targetRegion, reason, force }),
    });
  }

  async getFailoverEvents(configId: string, limit = 100): Promise<Array<{
    id: string;
    configId: string;
    targetRegion: string;
    status: string;
    reason: string;
    timestamp: string;
  }>> {
    return this.request(`/disaster-recovery/failover/${configId}/events?limit=${limit}`);
  }

  async scheduleRecoveryTest(type: 'backup_restore' | 'failover' | 'replication', scheduledTime?: string): Promise<{
    id: string;
    type: string;
    status: string;
    scheduledTime: string;
  }> {
    return this.request('/disaster-recovery/tests', {
      method: 'POST',
      body: JSON.stringify({ type, scheduledTime }),
    });
  }

  async runRecoveryTest(testId: string): Promise<{
    id: string;
    type: string;
    status: string;
    result: string;
    completedAt: string;
  }> {
    return this.request(`/disaster-recovery/tests/${testId}/run`, {
      method: 'POST',
    });
  }

  async listRecoveryTests(limit = 100): Promise<Array<{
    id: string;
    type: string;
    status: string;
    scheduledTime: string;
    completedAt?: string;
  }>> {
    return this.request(`/disaster-recovery/tests?limit=${limit}`);
  }

  // ============================================
  // DevOps Features - CDN & Caching
  // ============================================

  async createCDNDistribution(config: {
    name: string;
    origin: string;
    enabled?: boolean;
  }): Promise<{
    id: string;
    name: string;
    origin: string;
    status: string;
    createdAt: string;
  }> {
    return this.request('/cdn/distributions', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async listCDNDistributions(): Promise<Array<{
    id: string;
    name: string;
    origin: string;
    status: string;
    createdAt: string;
  }>> {
    return this.request('/cdn/distributions');
  }

  async getCDNDistribution(id: string): Promise<{
    id: string;
    name: string;
    origin: string;
    status: string;
    createdAt: string;
  }> {
    return this.request(`/cdn/distributions/${id}`);
  }

  async updateCDNDistribution(id: string, config: {
    name?: string;
    origin?: string;
    enabled?: boolean;
  }): Promise<{
    id: string;
    name: string;
    origin: string;
    status: string;
  }> {
    return this.request(`/cdn/distributions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  async deleteCDNDistribution(id: string): Promise<{ success: boolean }> {
    return this.request(`/cdn/distributions/${id}`, {
      method: 'DELETE',
    });
  }

  async getCacheStats(): Promise<{
    hitRate: number;
    missRate: number;
    totalRequests: number;
    cacheSize: number;
    entriesCount: number;
  }> {
    return this.request('/cdn/cache/stats');
  }

  async invalidateCache(patterns: string[]): Promise<{
    id: string;
    patterns: string[];
    status: string;
    createdAt: string;
  }> {
    return this.request('/cdn/cache/invalidate', {
      method: 'POST',
      body: JSON.stringify({ patterns }),
    });
  }

  async purgeAllCache(): Promise<{
    id: string;
    status: string;
    createdAt: string;
  }> {
    return this.request('/cdn/cache/invalidate', {
      method: 'POST',
      body: JSON.stringify({ purgeAll: true }),
    });
  }

  // ============================================
  // DevOps Features - Performance Optimization
  // ============================================

  async getPerformanceMetrics(): Promise<{
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    requestsPerSecond: number;
    errorRate: number;
    cacheHitRate: number;
  }> {
    return this.request('/performance/metrics');
  }

  async generatePerformanceReport(startDate: string, endDate: string): Promise<{
    startDate: string;
    endDate: string;
    metrics: {
      averageResponseTime: number;
      totalRequests: number;
      errorRate: number;
      cacheHitRate: number;
    };
    recommendations: Array<{
      type: string;
      description: string;
      impact: string;
    }>;
  }> {
    return this.request('/performance/report', {
      method: 'POST',
      body: JSON.stringify({ startDate, endDate }),
    });
  }

  async getSlowQueries(limit = 100): Promise<Array<{
    query: string;
    duration: number;
    timestamp: string;
  }>> {
    return this.request(`/performance/query/slow?limit=${limit}`);
  }

  async getConnectionPoolStats(): Promise<{
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    waitingRequests: number;
  }> {
    return this.request('/performance/connection-pool/stats');
  }

  async getPerformanceAlerts(): Promise<Array<{
    id: string;
    type: string;
    message: string;
    severity: string;
    timestamp: string;
  }>> {
    return this.request('/performance/alerts');
  }

  // ============================================
  // DevOps Features - Cost Management
  // ============================================

  async getCostSummary(): Promise<{
    totalCost: number;
    costByService: Record<string, number>;
    costByFeature: Record<string, number>;
    period: string;
  }> {
    return this.request('/cost-management/summary');
  }

  async getCostReport(params: {
    startDate?: string;
    endDate?: string;
    groupBy?: 'service' | 'feature' | 'customer';
  }): Promise<{
    startDate: string;
    endDate: string;
    totalCost: number;
    breakdown: Array<{
      category: string;
      cost: number;
      percentage: number;
    }>;
  }> {
    const query = new URLSearchParams();
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
    if (params.groupBy) query.append('groupBy', params.groupBy);
    return this.request(`/cost-management/report?${query.toString()}`);
  }

  async forecastCosts(params: {
    period: 'week' | 'month' | 'quarter' | 'year';
    includeOptimizations?: boolean;
  }): Promise<{
    period: string;
    forecastedCost: number;
    confidence: number;
    breakdown: Array<{
      category: string;
      cost: number;
    }>;
  }> {
    return this.request('/cost-management/forecast', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getCostOptimizations(): Promise<Array<{
    type: string;
    description: string;
    estimatedSavings: number;
    priority: 'high' | 'medium' | 'low';
  }>> {
    return this.request('/cost-management/optimizations');
  }

  async getUnderutilizedResources(): Promise<Array<{
    resourceId: string;
    resourceType: string;
    utilization: number;
    estimatedSavings: number;
  }>> {
    return this.request('/cost-management/underutilized');
  }

  async createBudget(budget: {
    name: string;
    amount: number;
    period: 'week' | 'month' | 'quarter' | 'year';
    alertThresholds: number[];
  }): Promise<{
    id: string;
    name: string;
    amount: number;
    period: string;
    alertThresholds: number[];
  }> {
    return this.request('/cost-management/budgets', {
      method: 'POST',
      body: JSON.stringify(budget),
    });
  }

  async listBudgets(): Promise<Array<{
    id: string;
    name: string;
    amount: number;
    period: string;
    currentSpend: number;
    alertThresholds: number[];
  }>> {
    return this.request('/cost-management/budgets');
  }

  async getBudgetAlerts(acknowledged?: boolean): Promise<Array<{
    id: string;
    budgetId: string;
    message: string;
    threshold: number;
    currentSpend: number;
    acknowledged: boolean;
    createdAt: string;
  }>> {
    const query = acknowledged !== undefined ? `?acknowledged=${acknowledged}` : '';
    return this.request(`/cost-management/alerts${query}`);
  }

  // ============================================
  // DevOps Features - Support & Diagnostics
  // ============================================

  async startImpersonation(targetUserId: string, reason: string): Promise<{
    sessionId: string;
    adminUserId: string;
    targetUserId: string;
    token: string;
    createdAt: string;
  }> {
    return this.request('/support/impersonation/start', {
      method: 'POST',
      body: JSON.stringify({ targetUserId, reason }),
    });
  }

  async endImpersonation(sessionId: string): Promise<{
    sessionId: string;
    endedAt: string;
  }> {
    return this.request('/support/impersonation/end', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    });
  }

  async getActiveImpersonationSessions(): Promise<Array<{
    sessionId: string;
    adminUserId: string;
    targetUserId: string;
    reason: string;
    createdAt: string;
  }>> {
    return this.request('/support/impersonation/sessions');
  }

  async getErrorContexts(limit = 50, filters?: {
    userId?: string;
    errorCode?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Array<{
    id: string;
    error: {
      name: string;
      message: string;
      stack?: string;
    };
    request?: unknown;
    response?: unknown;
    timestamp: string;
  }>> {
    const query = new URLSearchParams();
    query.append('limit', limit.toString());
    if (filters?.userId) query.append('userId', filters.userId);
    if (filters?.errorCode) query.append('errorCode', filters.errorCode);
    if (filters?.startDate) query.append('startDate', filters.startDate);
    if (filters?.endDate) query.append('endDate', filters.endDate);
    return this.request(`/support/errors?${query.toString()}`);
  }

  async getRequestInspections(limit = 50, filters?: {
    userId?: string;
    method?: string;
    statusCode?: number;
  }): Promise<Array<{
    id: string;
    requestId: string;
    method: string;
    url: string;
    statusCode: number;
    duration: number;
    timestamp: string;
  }>> {
    const query = new URLSearchParams();
    query.append('limit', limit.toString());
    if (filters?.userId) query.append('userId', filters.userId);
    if (filters?.method) query.append('method', filters.method);
    if (filters?.statusCode) query.append('statusCode', filters.statusCode.toString());
    return this.request(`/support/requests?${query.toString()}`);
  }

  async retryOperation(operationId: string, input?: unknown): Promise<{
    operationId: string;
    status: string;
    result: unknown;
  }> {
    return this.request(`/support/operations/${operationId}/retry`, {
      method: 'POST',
      body: JSON.stringify({ input }),
    });
  }

  async generateDiagnosticReport(params: {
    includeSystemInfo?: boolean;
    includeErrorLogs?: boolean;
    includePerformanceMetrics?: boolean;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    id: string;
    generatedAt: string;
    report: unknown;
  }> {
    return this.request('/support/diagnostics/report', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getAuditLogs(params: {
    limit?: number;
    offset?: number;
    eventType?: string;
    adminUserId?: string;
    targetUserId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    logs: Array<{
      id: string;
      eventType: string;
      adminUserId: string;
      targetUserId?: string;
      details: unknown;
      timestamp: string;
    }>;
    total: number;
  }> {
    const query = new URLSearchParams();
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.offset) query.append('offset', params.offset.toString());
    if (params.eventType) query.append('eventType', params.eventType);
    if (params.adminUserId) query.append('adminUserId', params.adminUserId);
    if (params.targetUserId) query.append('targetUserId', params.targetUserId);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
    return this.request(`/support/audit-logs?${query.toString()}`);
  }

  async getDeploymentHistory(modelId: string): Promise<Array<{
    id: string;
    modelId: string;
    version: string;
    status: string;
    deploymentType: string;
    environment: string;
    deployedAt: string;
  }>> {
    return this.request(`/ml-models/${modelId}/deployments`);
  }

  async getActiveDeployment(modelId: string): Promise<{
    id: string;
    modelId: string;
    version: string;
    status: string;
    deploymentType: string;
    environment: string;
    deployedAt: string;
  }> {
    return this.request(`/ml-models/${modelId}/deployments/active`);
  }

  async getDeployment(deploymentId: string): Promise<{
    id: string;
    modelId: string;
    version: string;
    status: string;
    deploymentType: string;
    environment: string;
    deployedAt: string;
  }> {
    return this.request(`/ml-models/deployments/${deploymentId}`);
  }

  async rollbackModel(modelId: string, previousVersion: string): Promise<{
    success: boolean;
    modelId: string;
    rolledBackTo: string;
  }> {
    return this.request(`/ml-models/${modelId}/rollback`, {
      method: 'POST',
      body: JSON.stringify({ previousVersion }),
    });
  }

  async getMetricsHistory(modelId: string, limit?: number): Promise<Array<{
    timestamp: string;
    accuracy: number;
    latency: number;
    throughput: number;
    errorRate: number;
  }>> {
    const query = limit ? `?limit=${limit}` : '';
    return this.request(`/ml-models/${modelId}/metrics/history${query}`);
  }

  async recordPrediction(modelId: string, data: {
    prediction?: unknown;
    groundTruth?: unknown;
    latencyMs: number;
    success: boolean;
    detectionScore?: number;
    features?: Record<string, unknown>;
    errorMessage?: string;
  }): Promise<{ success: boolean }> {
    return this.request(`/ml-models/${modelId}/predictions`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getABTests(status?: string): Promise<Array<{
    id: string;
    name: string;
    status: string;
    modelIds: string[];
    trafficAllocation: Record<string, number>;
    createdAt: string;
  }>> {
    const query = status ? `?status=${status}` : '';
    return this.request(`/ml-models/ab-tests${query}`);
  }

  async getABTest(testId: string): Promise<{
    id: string;
    name: string;
    status: string;
    modelIds: string[];
    trafficAllocation: Record<string, number>;
    createdAt: string;
    results?: Record<string, unknown>;
  }> {
    return this.request(`/ml-models/ab-tests/${testId}`);
  }

  async createABTest(data: {
    name: string;
    modelIds: string[];
    trafficAllocation: Record<string, number>;
    minSampleSize?: number;
    primaryMetric?: string;
    autoStart?: boolean;
  }): Promise<{
    id: string;
    name: string;
    status: string;
    modelIds: string[];
    trafficAllocation: Record<string, number>;
    createdAt: string;
  }> {
    return this.request('/ml-models/ab-tests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async startABTest(testId: string): Promise<{
    success: boolean;
    testId: string;
    status: string;
  }> {
    return this.request(`/ml-models/ab-tests/${testId}/start`, { method: 'POST' });
  }

  async stopABTest(testId: string): Promise<{
    success: boolean;
    testId: string;
    status: string;
  }> {
    return this.request(`/ml-models/ab-tests/${testId}/stop`, { method: 'POST' });
  }

  // File Extraction
  async extractFile(file: File): Promise<{
    success: boolean;
    data: {
      content: string;
      wordCount: number;
      characterCount: number;
      format: 'docx' | 'pdf' | 'txt' | 'epub';
      metadata?: {
        title?: string;
        author?: string;
        pages?: number;
      };
    };
  }> {
    const formData = new FormData();
    formData.append('file', file);

    return this.request('/storage/files/extract', {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header, let browser set it with boundary
      headers: {},
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
