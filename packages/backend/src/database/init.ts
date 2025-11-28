/**
 * Database initialization and health check utilities
 */

import { connectPostgres, disconnectPostgres, checkPostgresHealth } from './prisma';
import { connectMongoDB, disconnectMongoDB, checkMongoDBHealth, getMongoDBState } from './mongodb';
import { connectRedis, disconnectRedis, checkRedisHealth } from './redis';
import { logger } from '../utils/logger';

export interface DatabaseHealth {
  postgres: boolean;
  mongodb: boolean;
  redis: boolean;
  overall: boolean;
}

/**
 * Initialize all database connections
 */
export async function initializeDatabases(): Promise<void> {
  logger.info('Initializing database connections...');

  try {
    // Connect to PostgreSQL and MongoDB (required)
    await Promise.all([
      connectPostgres(),
      connectMongoDB(),
    ]);

    // Redis is optional - try to connect but don't fail if unavailable
    try {
      await connectRedis();
    } catch (redisError) {
      logger.warn('Redis connection failed - continuing without Redis cache', {
        error: redisError instanceof Error ? redisError.message : 'Unknown error',
      });
      logger.warn('Some features requiring Redis (caching, sessions) may not work');
    }

    logger.info('Database connections established successfully');
  } catch (error) {
    logger.error('Failed to initialize databases:', error);
    throw error;
  }
}

/**
 * Gracefully shutdown all database connections
 */
export async function shutdownDatabases(): Promise<void> {
  logger.info('Shutting down database connections...');

  try {
    await Promise.all([
      disconnectPostgres(),
      disconnectMongoDB(),
      disconnectRedis(),
    ]);

    logger.info('All database connections closed successfully');
  } catch (error) {
    logger.error('Error during database shutdown:', error);
    throw error;
  }
}

/**
 * Check health of all database connections
 */
export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  const [postgresHealth, mongodbHealth, redisHealth] = await Promise.all([
    checkPostgresHealth(),
    checkMongoDBHealth(),
    checkRedisHealth(),
  ]);

  return {
    postgres: postgresHealth,
    mongodb: mongodbHealth,
    redis: redisHealth,
    overall: postgresHealth && mongodbHealth, // Redis is optional
  };
}

/**
 * Get detailed database status
 */
export async function getDatabaseStatus(): Promise<{
  postgres: { connected: boolean; latency: number | null };
  mongodb: { connected: boolean; state: string; latency: number | null };
  redis: { connected: boolean; latency: number | null };
}> {
  // Check PostgreSQL
  const pgStart = Date.now();
  const pgConnected = await checkPostgresHealth();
  const pgLatency = Date.now() - pgStart;

  // Check MongoDB
  const mongoStart = Date.now();
  const mongoConnected = await checkMongoDBHealth();
  const mongoLatency = Date.now() - mongoStart;

  // Check Redis
  const redisStart = Date.now();
  const redisConnected = await checkRedisHealth();
  const redisLatency = Date.now() - redisStart;

  return {
    postgres: {
      connected: pgConnected,
      latency: pgConnected ? pgLatency : null,
    },
    mongodb: {
      connected: mongoConnected,
      state: getMongoDBState(),
      latency: mongoConnected ? mongoLatency : null,
    },
    redis: {
      connected: redisConnected,
      latency: redisConnected ? redisLatency : null,
    },
  };
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down databases...');
  void shutdownDatabases().then(() => process.exit(0));
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down databases...');
  void shutdownDatabases().then(() => process.exit(0));
});
