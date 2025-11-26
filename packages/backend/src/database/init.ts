/**
 * Database initialization and health check utilities
 */

import { connectPostgres, disconnectPostgres, checkPostgresHealth } from './prisma';
import { connectMongoDB, disconnectMongoDB, checkMongoDBHealth, getMongoDBState } from './mongodb';
import { logger } from '../utils/logger';

export interface DatabaseHealth {
  postgres: boolean;
  mongodb: boolean;
  overall: boolean;
}

/**
 * Initialize all database connections
 */
export async function initializeDatabases(): Promise<void> {
  logger.info('Initializing database connections...');

  try {
    // Connect to both databases in parallel
    await Promise.all([
      connectPostgres(),
      connectMongoDB(),
    ]);

    logger.info('All database connections established successfully');
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
  const [postgresHealth, mongodbHealth] = await Promise.all([
    checkPostgresHealth(),
    checkMongoDBHealth(),
  ]);

  return {
    postgres: postgresHealth,
    mongodb: mongodbHealth,
    overall: postgresHealth && mongodbHealth,
  };
}

/**
 * Get detailed database status
 */
export async function getDatabaseStatus(): Promise<{
  postgres: { connected: boolean; latency: number | null };
  mongodb: { connected: boolean; state: string; latency: number | null };
}> {
  // Check PostgreSQL
  const pgStart = Date.now();
  const pgConnected = await checkPostgresHealth();
  const pgLatency = Date.now() - pgStart;

  // Check MongoDB
  const mongoStart = Date.now();
  const mongoConnected = await checkMongoDBHealth();
  const mongoLatency = Date.now() - mongoStart;

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
