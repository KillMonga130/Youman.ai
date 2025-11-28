/**
 * Factory functions for creating mock test data
 * These provide consistent, customizable mock objects for tests
 */

// User factories
export interface MockUser {
  id: string;
  email: string;
  name: string;
}

let userIdCounter = 1;

export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  const id = userIdCounter++;
  return {
    id: `user-${id}`,
    email: `user${id}@example.com`,
    name: `Test User ${id}`,
    ...overrides,
  };
}

// Project factories
export interface MockProject {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  wordCount: number;
  status: 'draft' | 'processing' | 'completed';
}

let projectIdCounter = 1;

export function createMockProject(overrides: Partial<MockProject> = {}): MockProject {
  const id = projectIdCounter++;
  const now = new Date().toISOString();
  return {
    id: `project-${id}`,
    name: `Test Project ${id}`,
    description: `Description for project ${id}`,
    createdAt: now,
    updatedAt: now,
    wordCount: Math.floor(Math.random() * 5000),
    status: 'draft',
    ...overrides,
  };
}

export function createMockProjectList(count: number, overrides: Partial<MockProject> = {}): MockProject[] {
  return Array.from({ length: count }, () => createMockProject(overrides));
}

// Pagination factory
export interface MockPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export function createMockPagination(overrides: Partial<MockPagination> = {}): MockPagination {
  const page = overrides.page ?? 1;
  const limit = overrides.limit ?? 10;
  const total = overrides.total ?? 0;
  const totalPages = Math.ceil(total / limit) || 1;
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasMore: page < totalPages,
    ...overrides,
  };
}


// Humanization response factory
export interface MockHumanizeMetrics {
  detectionScore: number;
  perplexity: number;
  burstiness: number;
  modificationPercentage: number;
}

export interface MockHumanizeResponse {
  id: string;
  humanizedText: string;
  metrics: MockHumanizeMetrics;
  processingTime: number;
  strategyUsed: string;
  levelApplied: number;
}

let humanizeIdCounter = 1;

export function createMockHumanizeResponse(
  originalText: string,
  overrides: Partial<MockHumanizeResponse> = {}
): MockHumanizeResponse {
  const id = humanizeIdCounter++;
  return {
    id: `humanize-${id}`,
    humanizedText: `Humanized: ${originalText}`,
    metrics: {
      detectionScore: 15.5,
      perplexity: 85.2,
      burstiness: 0.65,
      modificationPercentage: 35.8,
      ...overrides.metrics,
    },
    processingTime: 1250,
    strategyUsed: 'standard',
    levelApplied: 3,
    ...overrides,
  };
}

// Usage factory
export interface MockUsage {
  wordsProcessed: number;
  limit: number;
  resetDate: string;
  tier: string;
  remaining: number;
}

export function createMockUsage(overrides: Partial<MockUsage> = {}): MockUsage {
  const limit = overrides.limit ?? 50000;
  const wordsProcessed = overrides.wordsProcessed ?? 5000;
  
  return {
    wordsProcessed,
    limit,
    resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    tier: 'pro',
    remaining: limit - wordsProcessed,
    ...overrides,
  };
}

// Version factory
export interface MockVersion {
  id: string;
  versionNumber: number;
  content: string;
  humanizedContent: string | null;
  createdAt: string;
  createdBy: string;
}

let versionIdCounter = 1;

export function createMockVersion(overrides: Partial<MockVersion> = {}): MockVersion {
  const id = versionIdCounter++;
  return {
    id: `version-${id}`,
    versionNumber: id,
    content: `Content for version ${id}`,
    humanizedContent: null,
    createdAt: new Date().toISOString(),
    createdBy: 'user-1',
    ...overrides,
  };
}

export function createMockVersionList(count: number, overrides: Partial<MockVersion> = {}): MockVersion[] {
  return Array.from({ length: count }, (_, i) =>
    createMockVersion({ versionNumber: i + 1, ...overrides })
  );
}

// Search result factory
export interface MockSearchHighlight {
  field: string;
  snippet: string;
  matchedTerms: string[];
}

export interface MockSearchResult {
  id: string;
  name: string;
  description: string | null;
  status: string;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
  highlights: MockSearchHighlight[];
  score: number;
}

let searchResultIdCounter = 1;

export function createMockSearchResult(overrides: Partial<MockSearchResult> = {}): MockSearchResult {
  const id = searchResultIdCounter++;
  const now = new Date().toISOString();
  return {
    id: `result-${id}`,
    name: `Search Result ${id}`,
    description: `Description for result ${id}`,
    status: 'completed',
    wordCount: Math.floor(Math.random() * 5000),
    createdAt: now,
    updatedAt: now,
    highlights: [
      {
        field: 'name',
        snippet: `Search <mark>Result</mark> ${id}`,
        matchedTerms: ['result'],
      },
    ],
    score: 0.85 + Math.random() * 0.15,
    ...overrides,
  };
}

// Saved search factory
export interface MockSavedSearch {
  id: string;
  name: string;
  query: string | null;
  filters: Record<string, unknown>;
  useCount: number;
  lastUsedAt: string | null;
  createdAt: string;
}

let savedSearchIdCounter = 1;

export function createMockSavedSearch(overrides: Partial<MockSavedSearch> = {}): MockSavedSearch {
  const id = savedSearchIdCounter++;
  return {
    id: `saved-${id}`,
    name: `Saved Search ${id}`,
    query: 'test query',
    filters: {},
    useCount: Math.floor(Math.random() * 10),
    lastUsedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// API Error factory
export interface MockApiError {
  message: string;
  code: string;
  status: number;
  details?: Record<string, string[]>;
}

export function createMockApiError(overrides: Partial<MockApiError> = {}): MockApiError {
  return {
    message: 'An error occurred',
    code: 'UNKNOWN_ERROR',
    status: 500,
    ...overrides,
  };
}

export function createMockValidationError(
  fields: Record<string, string[]>
): MockApiError {
  return {
    message: 'Validation failed',
    code: 'VALIDATION_ERROR',
    status: 400,
    details: fields,
  };
}

// Auth response factories
export interface MockAuthResponse {
  token: string;
  user: MockUser;
}

export function createMockAuthResponse(overrides: Partial<MockAuthResponse> = {}): MockAuthResponse {
  return {
    token: 'mock-jwt-token-' + Date.now(),
    user: createMockUser(),
    ...overrides,
  };
}

// Reset counters (useful for test isolation)
export function resetFactoryCounters(): void {
  userIdCounter = 1;
  projectIdCounter = 1;
  humanizeIdCounter = 1;
  versionIdCounter = 1;
  searchResultIdCounter = 1;
  savedSearchIdCounter = 1;
}
