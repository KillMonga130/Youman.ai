/**
 * Redis Client for session management and caching
 */

import Redis from 'ioredis';
import { config } from '../config/env';
import { logger } from '../utils/logger';

// Declare global type for Redis client to prevent multiple instances in development
declare global {
  // eslint-disable-next-line no-var
  var redis: Redis | undefined;
}

// Create Redis client
const createRedisClient = (): Redis => {
  const client = new Redis(config.database.redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times: number) => {
      if (times > 3) {
        logger.error('Redis connection failed after 3 retries');
        return null;
      }
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
  });

  client.on('connect', () => {
    logger.info('Redis client connected');
  });

  client.on('error', (err) => {
    logger.error('Redis client error:', err);
  });

  client.on('close', () => {
    logger.warn('Redis connection closed');
  });

  return client;
};

// Use global instance in development to prevent hot-reload issues
export const redis = global.redis ?? createRedisClient();

if (config.isDevelopment) {
  global.redis = redis;
}


/**
 * Connect to Redis
 */
export async function connectRedis(): Promise<void> {
  try {
    await redis.connect();
    logger.info('Connected to Redis');
  } catch (error) {
    // If already connected, ignore the error
    if ((error as Error).message?.includes('already')) {
      logger.debug('Redis already connected');
      return;
    }
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
}

/**
 * Disconnect from Redis
 */
export async function disconnectRedis(): Promise<void> {
  try {
    await redis.quit();
    logger.info('Disconnected from Redis');
  } catch (error) {
    logger.error('Failed to disconnect from Redis:', error);
    throw error;
  }
}

/**
 * Health check for Redis connection
 */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const result = await redis.ping();
    return result === 'PONG';
  } catch {
    return false;
  }
}

// Session management helpers
const SESSION_PREFIX = 'session:';
const SESSION_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Store a session in Redis
 */
export async function storeSession(
  sessionId: string,
  userId: string,
  metadata: Record<string, string> = {}
): Promise<void> {
  const key = `${SESSION_PREFIX}${sessionId}`;
  const data = {
    userId,
    createdAt: new Date().toISOString(),
    ...metadata,
  };
  await redis.setex(key, SESSION_TTL, JSON.stringify(data));
}

/**
 * Get a session from Redis
 */
export async function getSession(sessionId: string): Promise<{
  userId: string;
  createdAt: string;
  [key: string]: string;
} | null> {
  const key = `${SESSION_PREFIX}${sessionId}`;
  const data = await redis.get(key);
  if (!data) return null;
  return JSON.parse(data);
}

/**
 * Delete a session from Redis
 */
export async function deleteSession(sessionId: string): Promise<void> {
  const key = `${SESSION_PREFIX}${sessionId}`;
  await redis.del(key);
}

/**
 * Delete all sessions for a user
 */
export async function deleteUserSessions(userId: string): Promise<void> {
  const keys = await redis.keys(`${SESSION_PREFIX}*`);
  for (const key of keys) {
    const data = await redis.get(key);
    if (data) {
      const session = JSON.parse(data);
      if (session.userId === userId) {
        await redis.del(key);
      }
    }
  }
}

/**
 * Refresh session TTL
 */
export async function refreshSession(sessionId: string): Promise<boolean> {
  const key = `${SESSION_PREFIX}${sessionId}`;
  const exists = await redis.exists(key);
  if (exists) {
    await redis.expire(key, SESSION_TTL);
    return true;
  }
  return false;
}
