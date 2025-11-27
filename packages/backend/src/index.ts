/**
 * AI Humanizer Backend Server
 * Main entry point for the Express.js API server
 * 
 * Requirements: 21.3 - Real-time collaboration with WebSocket support
 */

import express, { Express } from 'express';
import { createServer, Server as HttpServer } from 'http';
import { config } from './config/env';
import { logger } from './utils/logger';
import { initializeDatabases } from './database';
import { createApiGateway } from './api';
import { initializeRealtimeServer, RealtimeServer } from './realtime';

const app: Express = express();

// Create HTTP server to support both Express and WebSocket
const httpServer: HttpServer = createServer(app);

// Configure API Gateway with all middleware and routes
createApiGateway(app);

const PORT = config.port;

// WebSocket server instance
let realtimeServer: RealtimeServer | null = null;

// Initialize databases and start server
async function startServer(): Promise<void> {
  try {
    // Initialize database connections
    await initializeDatabases();
    
    // Initialize WebSocket server for real-time collaboration
    realtimeServer = initializeRealtimeServer(httpServer, {
      path: '/ws',
      pingInterval: 30000,
      pingTimeout: 10000,
      syncThreshold: 200, // 200ms sync requirement
    });
    
    // Start the HTTP server (supports both REST and WebSocket)
    httpServer.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`, {
        environment: config.nodeEnv,
        apiVersion: 'v1',
        websocket: 'enabled',
        wsPath: '/ws',
      });
    });

    // Graceful shutdown handling
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown handler
 */
function gracefulShutdown(): void {
  logger.info('Received shutdown signal, closing connections...');
  
  // Shutdown WebSocket server
  if (realtimeServer) {
    realtimeServer.shutdown();
  }
  
  // Close HTTP server
  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  
  // Force exit after timeout
  setTimeout(() => {
    logger.warn('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

void startServer();

export { app, httpServer, realtimeServer };
