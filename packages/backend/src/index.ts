/**
 * AI Humanizer Backend Server
 * Main entry point for the Express.js API server
 * 
 * @copyright 2024 Mubvafhi Mueletshedzi Moses
 * @author Mubvafhi Mueletshedzi Moses <mubvafhimoses813@gmail.com>
 * @license MIT
 * @version 1.0.0
 * 
 * Software ID: AIH-2024-MMM-001
 * Requirements: 21.3 - Real-time collaboration with WebSocket support
 */

import express, { Express } from 'express';
import { createServer, Server as HttpServer } from 'http';
import { config } from './config/env';
import { logger } from './utils/logger';
import { initializeDatabases } from './database';
import { createApiGateway } from './api';
import { initializeRealtimeServer, RealtimeServer } from './realtime';
import { validateOwnership, getOwnershipSignature } from './ownership/ownership';

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
    // Verify software ownership
    if (!validateOwnership()) {
      logger.error('Software ownership verification failed');
      process.exit(1);
    }
    logger.info(getOwnershipSignature());
    
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
        corsOrigins: config.corsOrigins.length > 0 
          ? config.corsOrigins.join(', ') 
          : 'none configured',
        corsOriginsCount: config.corsOrigins.length,
      });
      
      // Warn if CORS origins are not configured properly in production
      if (config.isProduction && config.corsOrigins.length === 0) {
        logger.warn('⚠️  CORS_ORIGINS is empty in production! API requests may be blocked.');
      } else if (config.isProduction && config.corsOrigins.length === 1 && config.corsOrigins[0].includes('localhost')) {
        logger.warn('⚠️  CORS_ORIGINS only includes localhost in production! Add your production frontend URL.');
      }
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
