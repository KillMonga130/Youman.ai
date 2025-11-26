/**
 * MongoDB connection and configuration
 */

import mongoose from 'mongoose';
import { config } from '../config/env';
import { logger } from '../utils/logger';

// Connection options
const mongooseOptions: mongoose.ConnectOptions = {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

/**
 * Connect to MongoDB database
 */
export async function connectMongoDB(): Promise<typeof mongoose> {
  try {
    mongoose.set('strictQuery', true);
    
    const connection = await mongoose.connect(config.database.mongoUri, mongooseOptions);
    
    logger.info('Connected to MongoDB database');
    
    // Set up connection event handlers
    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    return connection;
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

/**
 * Disconnect from MongoDB database
 */
export async function disconnectMongoDB(): Promise<void> {
  try {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB database');
  } catch (error) {
    logger.error('Failed to disconnect from MongoDB:', error);
    throw error;
  }
}

/**
 * Health check for MongoDB connection
 */
export async function checkMongoDBHealth(): Promise<boolean> {
  try {
    // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    const readyState = mongoose.connection.readyState as number;
    if (readyState !== 1) {
      return false;
    }
    await mongoose.connection.db?.admin().ping();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get MongoDB connection state
 */
export function getMongoDBState(): string {
  const states: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return states[mongoose.connection.readyState] || 'unknown';
}

export { mongoose };
