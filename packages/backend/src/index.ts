/**
 * AI Humanizer Backend Server
 * Main entry point for the Express.js API server
 */

import express, { Express } from 'express';
import { config } from './config/env';
import { logger } from './utils/logger';
import { initializeDatabases } from './database';
import { createApiGateway } from './api';

const app: Express = express();

// Configure API Gateway with all middleware and routes
createApiGateway(app);

const PORT = config.port;

// Initialize databases and start server
async function startServer(): Promise<void> {
  try {
    // Initialize database connections
    await initializeDatabases();
    
    // Start the server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`, {
        environment: config.nodeEnv,
        apiVersion: 'v1',
      });
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

void startServer();

export { app };
