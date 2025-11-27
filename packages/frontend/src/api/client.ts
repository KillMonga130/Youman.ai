const API_BASE_URL = '/api';

interface ApiError {
  message: string;
  code: string;
  status: number;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string | null): void {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        message: 'An error occurred',
        code: 'UNKNOWN_ERROR',
        status: response.status,
      }));
      throw error;
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string): Promise<{ token: string; user: { id: string; email: string; name: string } }> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(email: string, password: string, name: string): Promise<{ token: string; user: { id: string; email: string; name: string } }> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  // Projects
  async getProjects(): Promise<{ projects: Array<{ id: string; name: string; createdAt: string; updatedAt: string; wordCount: number; status: string }> }> {
    return this.request('/projects');
  }

  async getProject(id: string): Promise<{ project: { id: string; name: string; content: string; humanizedContent: string } }> {
    return this.request(`/projects/${id}`);
  }

  async createProject(name: string, content: string): Promise<{ project: { id: string; name: string } }> {
    return this.request('/projects', {
      method: 'POST',
      body: JSON.stringify({ name, content }),
    });
  }

  async updateProject(id: string, data: { name?: string; content?: string }): Promise<{ project: { id: string } }> {
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
    options: { level?: number; strategy?: string; protectedSegments?: string[] }
  ): Promise<{ humanizedText: string; metrics: { detectionScore: number; perplexity: number; burstiness: number; modificationPercentage: number } }> {
    return this.request('/transform/humanize', {
      method: 'POST',
      body: JSON.stringify({ text, ...options }),
    });
  }

  // Detection
  async detectAI(text: string): Promise<{ scores: { overall: number; gptZero: number; originality: number } }> {
    return this.request('/detection/analyze', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  // Usage
  async getUsage(): Promise<{ usage: { wordsProcessed: number; limit: number; resetDate: string } }> {
    return this.request('/usage');
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
