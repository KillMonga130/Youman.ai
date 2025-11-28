/**
 * MSW handlers for mocking API endpoints in tests
 * These handlers intercept API requests and return mock responses
 */
import { http, HttpResponse, delay } from 'msw';

const API_BASE = '/api/v1';

// Default mock data
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
};

const mockTokens = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  expiresIn: 3600,
};

const mockProjects = [
  {
    id: 'project-1',
    name: 'Test Project 1',
    description: 'A test project',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    wordCount: 1500,
    status: 'completed',
  },
  {
    id: 'project-2',
    name: 'Test Project 2',
    description: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    wordCount: 500,
    status: 'draft',
  },
];

const mockUsage = {
  words: { used: 5000, limit: 50000, periodEnd: new Date().toISOString() },
  tier: 'pro',
};

// Auth handlers
export const authHandlers = [
  http.post(`${API_BASE}/auth/login`, async ({ request }) => {
    const body = await request.json() as { email: string; password: string };
    
    if (body.email === 'invalid@example.com') {
      return HttpResponse.json(
        { message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' },
        { status: 401 }
      );
    }
    
    return HttpResponse.json({
      message: 'Login successful',
      user: mockUser,
      tokens: mockTokens,
    });
  }),

  http.post(`${API_BASE}/auth/register`, async ({ request }) => {
    const body = await request.json() as { email: string; password: string };
    
    if (body.email === 'existing@example.com') {
      return HttpResponse.json(
        { message: 'Email already exists', code: 'EMAIL_EXISTS' },
        { status: 400 }
      );
    }
    
    return HttpResponse.json({
      message: 'Registration successful',
      user: mockUser,
      tokens: mockTokens,
    });
  }),

  http.post(`${API_BASE}/auth/refresh`, async () => {
    return HttpResponse.json({ tokens: mockTokens });
  }),

  http.get(`${API_BASE}/auth/me`, async () => {
    return HttpResponse.json({ user: mockUser });
  }),
];


// Project handlers
export const projectHandlers = [
  http.get(`${API_BASE}/projects`, async ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    
    return HttpResponse.json({
      projects: mockProjects,
      pagination: {
        page,
        limit,
        total: mockProjects.length,
        totalPages: 1,
        hasMore: false,
      },
    });
  }),

  http.get(`${API_BASE}/projects/:id`, async ({ params }) => {
    const project = mockProjects.find((p) => p.id === params.id);
    
    if (!project) {
      return HttpResponse.json(
        { message: 'Project not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }
    
    return HttpResponse.json({ project });
  }),

  http.post(`${API_BASE}/projects`, async ({ request }) => {
    const body = await request.json() as { name: string; description?: string };
    
    const newProject = {
      id: `project-${Date.now()}`,
      name: body.name,
      description: body.description || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      wordCount: 0,
      status: 'draft',
    };
    
    return HttpResponse.json({ project: newProject }, { status: 201 });
  }),

  http.put(`${API_BASE}/projects/:id`, async ({ params, request }) => {
    const body = await request.json() as { name?: string; description?: string };
    
    return HttpResponse.json({
      project: {
        id: params.id,
        name: body.name || 'Updated Project',
      },
    });
  }),

  http.delete(`${API_BASE}/projects/:id`, async () => {
    return new HttpResponse(null, { status: 204 });
  }),
];

// Transformation handlers
export const transformationHandlers = [
  http.post(`${API_BASE}/transformations/humanize`, async ({ request }) => {
    await delay(100); // Simulate processing time
    const body = await request.json() as { text: string };
    
    if (!body.text || body.text.trim() === '') {
      return HttpResponse.json(
        { message: 'Text is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    
    return HttpResponse.json({
      id: `transform-${Date.now()}`,
      humanizedText: `Humanized: ${body.text}`,
      metrics: {
        detectionScore: 15.5,
        perplexity: 85.2,
        burstiness: 0.65,
        modificationPercentage: 35.8,
      },
      processingTime: 1250,
      strategyUsed: 'standard',
      levelApplied: 3,
    });
  }),

  http.post(`${API_BASE}/detection/analyze`, async ({ request }) => {
    const body = await request.json() as { text: string };
    
    return HttpResponse.json({
      results: [
        { provider: 'internal', score: 25.5, passed: true, confidence: 0.85 },
      ],
      averageScore: 25.5,
      overallPassed: true,
    });
  }),
];

// Usage handlers
export const usageHandlers = [
  http.get(`${API_BASE}/subscription/usage`, async () => {
    return HttpResponse.json({
      success: true,
      data: mockUsage,
    });
  }),

  http.get(`${API_BASE}/usage/history`, async () => {
    return HttpResponse.json({
      data: {
        userId: 'user-123',
        entries: [
          { date: '2024-01-01', words: 1000, apiCalls: 10, storage: 5000 },
          { date: '2024-01-02', words: 1500, apiCalls: 15, storage: 7500 },
        ],
        totals: { words: 2500, apiCalls: 25, storage: 12500 },
      },
    });
  }),

  http.get(`${API_BASE}/usage/trends`, async () => {
    return HttpResponse.json({
      data: [
        { resourceType: 'words', currentPeriod: 5000, previousPeriod: 4000, changePercent: 25, trend: 'up' },
      ],
    });
  }),

  http.get(`${API_BASE}/usage/statistics`, async () => {
    return HttpResponse.json({
      data: {
        userId: 'user-123',
        period: { start: '2024-01-01', end: '2024-01-31' },
        words: { resourceType: 'words', used: 5000, limit: 50000, remaining: 45000, percentUsed: 10 },
        apiCalls: { resourceType: 'apiCalls', used: 100, limit: 1000, remaining: 900, percentUsed: 10 },
        storage: { resourceType: 'storage', used: 10000, limit: 1000000, remaining: 990000, percentUsed: 1 },
        tier: 'pro',
      },
    });
  }),
];


// Version handlers
export const versionHandlers = [
  http.get(`${API_BASE}/versions/project/:projectId`, async () => {
    return HttpResponse.json({
      versions: [
        {
          id: 'version-1',
          versionNumber: 1,
          content: 'Original content',
          humanizedContent: null,
          createdAt: new Date().toISOString(),
          createdBy: 'user-123',
        },
        {
          id: 'version-2',
          versionNumber: 2,
          content: 'Updated content',
          humanizedContent: 'Humanized updated content',
          createdAt: new Date().toISOString(),
          createdBy: 'user-123',
        },
      ],
    });
  }),

  http.get(`${API_BASE}/versions/:id`, async ({ params }) => {
    return HttpResponse.json({
      version: {
        id: params.id,
        versionNumber: 1,
        content: 'Version content',
        humanizedContent: null,
        createdAt: new Date().toISOString(),
      },
    });
  }),

  http.post(`${API_BASE}/versions/compare`, async () => {
    return HttpResponse.json({
      version1: {
        id: 'version-1',
        versionNumber: 1,
        content: 'Original content',
        createdAt: new Date().toISOString(),
      },
      version2: {
        id: 'version-2',
        versionNumber: 2,
        content: 'Updated content',
        createdAt: new Date().toISOString(),
      },
      wordCountDiff: 1,
      changes: [
        { type: 'remove', value: 'Original' },
        { type: 'add', value: 'Updated' },
        { type: 'unchanged', value: ' content' },
      ],
      addedLines: 1,
      removedLines: 1,
      unchangedLines: 1,
      similarityPercentage: 50,
    });
  }),

  http.post(`${API_BASE}/versions`, async ({ request }) => {
    const body = await request.json() as { projectId: string; content: string };
    
    return HttpResponse.json({
      version: {
        id: `version-${Date.now()}`,
        versionNumber: 3,
        content: body.content,
        humanizedContent: null,
      },
    });
  }),
];

// Search handlers
export const searchHandlers = [
  http.post(`${API_BASE}/search`, async ({ request }) => {
    const body = await request.json() as { query: string };
    
    if (!body.query || body.query.trim() === '') {
      return HttpResponse.json({
        results: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0, hasMore: false },
        query: '',
        filters: {},
        executionTimeMs: 5,
      });
    }
    
    return HttpResponse.json({
      results: [
        {
          id: 'project-1',
          name: 'Test Project 1',
          description: 'A test project',
          status: 'completed',
          wordCount: 1500,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          highlights: [
            { field: 'name', snippet: 'Test <mark>Project</mark> 1', matchedTerms: ['project'] },
          ],
          score: 0.95,
        },
      ],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasMore: false },
      query: body.query,
      filters: {},
      executionTimeMs: 25,
    });
  }),

  http.get(`${API_BASE}/search/saved`, async () => {
    return HttpResponse.json({
      savedSearches: [
        {
          id: 'saved-1',
          name: 'My Saved Search',
          query: 'test',
          filters: {},
          useCount: 5,
          lastUsedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
      total: 1,
    });
  }),

  http.post(`${API_BASE}/search/saved`, async ({ request }) => {
    const body = await request.json() as { name: string; query?: string };
    
    return HttpResponse.json({
      savedSearch: {
        id: `saved-${Date.now()}`,
        name: body.name,
        query: body.query || null,
        filters: {},
        useCount: 0,
        lastUsedAt: null,
        createdAt: new Date().toISOString(),
      },
    });
  }),

  http.delete(`${API_BASE}/search/saved/:id`, async () => {
    return HttpResponse.json({ message: 'Saved search deleted' });
  }),

  http.post(`${API_BASE}/search/saved/:id/execute`, async () => {
    return HttpResponse.json({
      results: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0, hasMore: false },
      query: 'test',
      filters: {},
      executionTimeMs: 10,
    });
  }),
];

// Subscription handlers
export const subscriptionHandlers = [
  http.get(`${API_BASE}/subscription`, async () => {
    return HttpResponse.json({
      success: true,
      data: {
        id: 'sub-123',
        tier: 'pro',
        status: 'active',
        monthlyWordLimit: 50000,
        monthlyApiCallLimit: 1000,
        storageLimit: 1000000,
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    });
  }),
];

// Error simulation handlers (for testing error handling)
export const errorHandlers = {
  networkError: http.get(`${API_BASE}/error/network`, async () => {
    throw new Error('Network error');
  }),
  
  serverError: http.get(`${API_BASE}/error/server`, async () => {
    return HttpResponse.json(
      { message: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }),
  
  validationError: http.post(`${API_BASE}/error/validation`, async () => {
    return HttpResponse.json(
      {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: { email: ['Invalid email format'], password: ['Password too short'] },
      },
      { status: 400 }
    );
  }),
  
  rateLimitError: http.get(`${API_BASE}/error/rate-limit`, async () => {
    return HttpResponse.json(
      { message: 'Too many requests', code: 'RATE_LIMITED' },
      { status: 429 }
    );
  }),
};

// Combine all handlers
export const handlers = [
  ...authHandlers,
  ...projectHandlers,
  ...transformationHandlers,
  ...usageHandlers,
  ...versionHandlers,
  ...searchHandlers,
  ...subscriptionHandlers,
];
