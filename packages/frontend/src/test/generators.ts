/**
 * Fast-check generators for property-based testing
 * These generators create valid test data for all domain models
 */
import * as fc from 'fast-check';

// User generators
export const userArb = fc.record({
  id: fc.uuid(),
  email: fc.emailAddress(),
  name: fc.string({ minLength: 1, maxLength: 100 }),
});

export const validEmailArb = fc.emailAddress();

export const validPasswordArb = fc.string({ minLength: 8, maxLength: 100 }).filter(
  (s) => /[A-Z]/.test(s) && /[a-z]/.test(s) && /[0-9]/.test(s)
);

export const invalidPasswordArb = fc.oneof(
  fc.string({ maxLength: 7 }), // Too short
  fc.constant(''), // Empty
);

// Project generators
export const projectStatusArb = fc.constantFrom('draft', 'processing', 'completed');

export const projectArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 200 }),
  description: fc.option(fc.string({ maxLength: 1000 }), { nil: null }),
  createdAt: fc.date().map((d) => d.toISOString()),
  updatedAt: fc.date().map((d) => d.toISOString()),
  wordCount: fc.nat({ max: 100000 }),
  status: projectStatusArb,
});

export const projectListArb = fc.array(projectArb, { minLength: 0, maxLength: 20 });

export const paginationArb = fc.record({
  page: fc.integer({ min: 1, max: 100 }),
  limit: fc.integer({ min: 1, max: 100 }),
  total: fc.nat({ max: 10000 }),
  totalPages: fc.integer({ min: 1, max: 100 }),
  hasMore: fc.boolean(),
});

// Humanization/Transformation generators
export const metricsArb = fc.record({
  detectionScore: fc.float({ min: 0, max: 100, noNaN: true }),
  perplexity: fc.float({ min: 0, max: 200, noNaN: true }),
  burstiness: fc.float({ min: 0, max: 1, noNaN: true }),
  modificationPercentage: fc.float({ min: 0, max: 100, noNaN: true }),
});

export const humanizeResponseArb = fc.record({
  id: fc.uuid(),
  humanizedText: fc.string({ minLength: 1, maxLength: 10000 }),
  metrics: metricsArb,
  processingTime: fc.nat({ max: 30000 }),
  strategyUsed: fc.constantFrom('standard', 'aggressive', 'conservative'),
  levelApplied: fc.integer({ min: 1, max: 5 }),
});

export const nonEmptyTextArb = fc.string({ minLength: 1, maxLength: 5000 });

// Usage generators
export const usageArb = fc.record({
  wordsProcessed: fc.nat({ max: 1000000 }),
  limit: fc.nat({ max: 1000000 }),
  resetDate: fc.date().map((d) => d.toISOString()),
  tier: fc.constantFrom('free', 'basic', 'pro', 'enterprise'),
  remaining: fc.nat({ max: 1000000 }),
});


// Usage history generators
export const usageHistoryEntryArb = fc.record({
  date: fc.date().map((d) => d.toISOString().split('T')[0]),
  words: fc.nat({ max: 100000 }),
  apiCalls: fc.nat({ max: 10000 }),
  storage: fc.nat({ max: 1000000000 }),
});

export const usageHistoryArb = fc.record({
  userId: fc.uuid(),
  entries: fc.array(usageHistoryEntryArb, { minLength: 0, maxLength: 30 }),
  totals: fc.record({
    words: fc.nat({ max: 1000000 }),
    apiCalls: fc.nat({ max: 100000 }),
    storage: fc.nat({ max: 10000000000 }),
  }),
});

// Version generators
export const versionArb = fc.record({
  id: fc.uuid(),
  versionNumber: fc.integer({ min: 1, max: 1000 }),
  content: fc.string({ minLength: 0, maxLength: 10000 }),
  humanizedContent: fc.option(fc.string({ maxLength: 10000 }), { nil: null }),
  createdAt: fc.date().map((d) => d.toISOString()),
  createdBy: fc.uuid(),
});

export const versionListArb = fc.array(versionArb, { minLength: 0, maxLength: 50 });

export const versionComparisonArb = fc.record({
  version1: fc.record({
    id: fc.uuid(),
    versionNumber: fc.integer({ min: 1, max: 1000 }),
    content: fc.string({ maxLength: 10000 }),
    createdAt: fc.date().map((d) => d.toISOString()),
  }),
  version2: fc.record({
    id: fc.uuid(),
    versionNumber: fc.integer({ min: 1, max: 1000 }),
    content: fc.string({ maxLength: 10000 }),
    createdAt: fc.date().map((d) => d.toISOString()),
  }),
  wordCountDiff: fc.integer({ min: -10000, max: 10000 }),
  changes: fc.array(
    fc.record({
      type: fc.constantFrom('add', 'remove', 'unchanged'),
      value: fc.string({ maxLength: 1000 }),
      lineNumber: fc.option(fc.nat({ max: 10000 })),
    }),
    { maxLength: 100 }
  ),
  addedLines: fc.nat({ max: 1000 }),
  removedLines: fc.nat({ max: 1000 }),
  unchangedLines: fc.nat({ max: 1000 }),
  similarityPercentage: fc.float({ min: 0, max: 100, noNaN: true }),
});

// Search generators
export const searchHighlightArb = fc.record({
  field: fc.constantFrom('name', 'description', 'content'),
  snippet: fc.string({ maxLength: 500 }),
  matchedTerms: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 10 }),
});

export const searchResultArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 200 }),
  description: fc.option(fc.string({ maxLength: 1000 }), { nil: null }),
  status: projectStatusArb,
  wordCount: fc.nat({ max: 100000 }),
  createdAt: fc.date().map((d) => d.toISOString()),
  updatedAt: fc.date().map((d) => d.toISOString()),
  highlights: fc.array(searchHighlightArb, { maxLength: 5 }),
  score: fc.float({ min: 0, max: 1, noNaN: true }),
});

export const searchResultsArb = fc.record({
  results: fc.array(searchResultArb, { maxLength: 20 }),
  pagination: paginationArb,
  query: fc.string({ maxLength: 200 }),
  filters: fc.constant({}),
  executionTimeMs: fc.nat({ max: 5000 }),
});

export const savedSearchArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  query: fc.option(fc.string({ maxLength: 200 }), { nil: null }),
  filters: fc.constant({}),
  useCount: fc.nat({ max: 1000 }),
  lastUsedAt: fc.option(fc.date().map((d) => d.toISOString()), { nil: null }),
  createdAt: fc.date().map((d) => d.toISOString()),
});

// API Error generators
export const apiErrorArb = fc.record({
  message: fc.string({ minLength: 1, maxLength: 500 }),
  code: fc.constantFrom(
    'VALIDATION_ERROR',
    'UNAUTHORIZED',
    'FORBIDDEN',
    'NOT_FOUND',
    'RATE_LIMITED',
    'SERVER_ERROR',
    'NETWORK_ERROR'
  ),
  status: fc.constantFrom(400, 401, 403, 404, 429, 500),
  details: fc.option(
    fc.dictionary(fc.string({ minLength: 1, maxLength: 50 }), fc.array(fc.string({ maxLength: 200 }))),
    { nil: undefined }
  ),
});

// Auth response generators
export const loginResponseArb = fc.record({
  token: fc.string({ minLength: 100, maxLength: 500 }),
  user: userArb,
});

export const registerResponseArb = loginResponseArb;

// Token generators
export const tokensArb = fc.record({
  accessToken: fc.string({ minLength: 100, maxLength: 500 }),
  refreshToken: fc.string({ minLength: 100, maxLength: 500 }),
  expiresIn: fc.integer({ min: 300, max: 86400 }),
});
