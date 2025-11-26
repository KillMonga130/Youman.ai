import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from './config/env';
import { logger } from './utils/logger';
import { initializeDatabases, checkDatabaseHealth } from './database';
import { authRouter, handleAuthError } from './auth';

const app: Express = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigins,
    credentials: true,
  })
);
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// Health check endpoint
app.get('/health', ((_req: Request, res: Response) => {
  checkDatabaseHealth()
    .then((dbHealth) => {
      const status = dbHealth.overall ? 'healthy' : 'degraded';
      const statusCode = dbHealth.overall ? 200 : 503;
      
      res.status(statusCode).json({
        status,
        timestamp: new Date().toISOString(),
        databases: {
          postgres: dbHealth.postgres ? 'connected' : 'disconnected',
          mongodb: dbHealth.mongodb ? 'connected' : 'disconnected',
          redis: dbHealth.redis ? 'connected' : 'disconnected',
        },
      });
    })
    .catch(() => {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
      });
    });
}) as express.RequestHandler);

// API routes placeholder
app.get('/api/v1', (_req: Request, res: Response) => {
  res.json({ message: 'AI Humanizer API v1', version: '1.0.0' });
});

// Authentication routes
app.use('/api/v1/auth', authRouter);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Auth error handler
app.use(handleAuthError);

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = config.port;

// Initialize databases and start server
async function startServer(): Promise<void> {
  try {
    // Initialize database connections
    await initializeDatabases();
    
    // Start the server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

void startServer();

export { app };
