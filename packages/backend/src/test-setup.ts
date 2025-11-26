/**
 * Vitest test setup - mocks database connections to prevent hanging tests
 */

import { vi } from 'vitest';

// Mock config first (before any other imports use it)
vi.mock('./config/env', () => ({
  config: {
    nodeEnv: 'test',
    port: 3001,
    isProduction: false,
    isDevelopment: false,
    isTest: true,
    database: {
      url: 'postgresql://test:test@localhost:5432/test',
      mongoUri: 'mongodb://localhost:27017/test',
      redisUrl: 'redis://localhost:6379',
    },
    jwt: {
      secret: 'test-secret-key-for-testing-only',
      expiresIn: '7d',
    },
    corsOrigins: ['http://localhost:3000'],
    externalApis: {},
    storage: {},
    stripe: {},
  },
}));

// Mock logger to prevent console spam during tests
vi.mock('./utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock Redis
vi.mock('./database/redis', () => ({
  redis: {
    connect: vi.fn().mockResolvedValue(undefined),
    quit: vi.fn().mockResolvedValue(undefined),
    ping: vi.fn().mockResolvedValue('PONG'),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    setex: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    keys: vi.fn().mockResolvedValue([]),
    exists: vi.fn().mockResolvedValue(0),
    expire: vi.fn().mockResolvedValue(1),
    on: vi.fn(),
  },
  connectRedis: vi.fn().mockResolvedValue(undefined),
  disconnectRedis: vi.fn().mockResolvedValue(undefined),
  checkRedisHealth: vi.fn().mockResolvedValue(true),
  storeSession: vi.fn().mockResolvedValue(undefined),
  getSession: vi.fn().mockResolvedValue(null),
  deleteSession: vi.fn().mockResolvedValue(undefined),
  deleteUserSessions: vi.fn().mockResolvedValue(undefined),
  refreshSession: vi.fn().mockResolvedValue(true),
}));

// Mock MongoDB
vi.mock('./database/mongodb', () => ({
  mongoose: {
    connection: {
      readyState: 1,
      db: {
        admin: () => ({
          ping: vi.fn().mockResolvedValue({ ok: 1 }),
        }),
      },
    },
    connect: vi.fn().mockResolvedValue({}),
    disconnect: vi.fn().mockResolvedValue(undefined),
    set: vi.fn(),
  },
  connectMongoDB: vi.fn().mockResolvedValue({}),
  disconnectMongoDB: vi.fn().mockResolvedValue(undefined),
  checkMongoDBHealth: vi.fn().mockResolvedValue(true),
  getMongoDBState: vi.fn().mockReturnValue('connected'),
}));

// Mock Prisma
vi.mock('./database/prisma', () => ({
  prisma: {
    $connect: vi.fn().mockResolvedValue(undefined),
    $disconnect: vi.fn().mockResolvedValue(undefined),
    $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    $on: vi.fn(),
    user: {
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    },
  },
  connectPostgres: vi.fn().mockResolvedValue(undefined),
  disconnectPostgres: vi.fn().mockResolvedValue(undefined),
  checkPostgresHealth: vi.fn().mockResolvedValue(true),
}));

// Suppress console output during tests
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'info').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});
