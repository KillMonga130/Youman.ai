/**
 * Prisma Client singleton for PostgreSQL database access
 */

import { PrismaClient } from '../generated/prisma';
import { config } from '../config/env';
import { logger } from '../utils/logger';

// Declare global type for PrismaClient to prevent multiple instances in development
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Create Prisma client with logging configuration
const createPrismaClient = (): PrismaClient => {
  return new PrismaClient({
    log: config.isDevelopment
      ? [
          { emit: 'event', level: 'query' },
          { emit: 'event', level: 'error' },
          { emit: 'event', level: 'warn' },
        ]
      : [{ emit: 'event', level: 'error' }],
  });
};

// Use global instance in development to prevent hot-reload issues
export const prisma = global.prisma ?? createPrismaClient();

if (config.isDevelopment) {
  global.prisma = prisma;
}

// Set up event listeners for logging
prisma.$on('error' as never, (e: { message: string }) => {
  logger.error('Prisma error:', { message: e.message });
});

if (config.isDevelopment) {
  prisma.$on('query' as never, (e: { query: string; duration: number }) => {
    logger.debug('Prisma query:', { query: e.query, duration: `${e.duration}ms` });
  });
}

/**
 * Connect to the PostgreSQL database
 */
export async function connectPostgres(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('Connected to PostgreSQL database');
  } catch (error) {
    logger.error('Failed to connect to PostgreSQL:', error);
    throw error;
  }
}

/**
 * Disconnect from the PostgreSQL database
 */
export async function disconnectPostgres(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('Disconnected from PostgreSQL database');
  } catch (error) {
    logger.error('Failed to disconnect from PostgreSQL:', error);
    throw error;
  }
}

/**
 * Health check for PostgreSQL connection
 */
export async function checkPostgresHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
