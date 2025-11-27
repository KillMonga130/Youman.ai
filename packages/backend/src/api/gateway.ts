/**
 * API Gateway
 * Central routing and middleware configuration for the AI Humanizer API
 * 
 * Requirements: 7 - API integration
 * Requirements: 81 - System architecture
 * Requirements: 84 - Security
 */

import { Router, Express, Request, Response } from 'express';
import compression from 'compression';
import express from 'express';
import { authRouter } from '../auth';
import { projectRouter } from '../project';
import { versionRouter, branchRouter } from '../version';
import { storageRouter } from '../storage';
import { collaborationRouter } from '../collaboration';
import { subscriptionRoutes } from '../subscription';
import { usageRoutes } from '../usage';
import { invoiceRoutes } from '../invoice';
import { seoRoutes } from '../seo';
import { plagiarismRoutes } from '../plagiarism';
import { citationRoutes } from '../citation';
import { abTestingRoutes } from '../ab-testing';
import { schedulingRoutes } from '../scheduling';
import { cloudStorageRouter } from '../cloud-storage';
import { webhookRoutes } from '../webhook';
import { mfaRoutes } from '../mfa';
import { repurposingRoutes } from '../repurposing';
import { localizationRoutes } from '../localization';
import { searchRouter } from '../search';
import { adminRoutes } from '../admin';
import { 
  standardRateLimiter, 
  strictRateLimiter,
  relaxedRateLimiter,
} from './middleware/rate-limiter';
import { 
  combinedLogger, 
  errorLogger 
} from './middleware/request-logger';
import { 
  corsMiddleware, 
  helmetMiddleware, 
  additionalSecurityHeaders,
  validateApiKey,
  sanitizeRequest,
} from './middleware/security';
import { 
  errorHandler, 
  notFoundHandler,
  ApiError,
} from './middleware/error-handler';
import { checkDatabaseHealth } from '../database';
import { logger } from '../utils/logger';
import { config } from '../config/env';
import { 
  monitoringRoutes,
  monitoringMiddleware,
  errorTrackingMiddleware,
} from '../monitoring';
import { supportRoutes } from '../support';
import { autoScalingRoutes } from '../auto-scaling';

/**
 * API version prefix
 */
const API_VERSION = 'v1';
const API_PREFIX = `/api/${API_VERSION}`;

/**
 * Create and configure the API gateway
 */
export function createApiGateway(app: Express): void {
  // Apply global middleware in order
  
  // 1. Security headers (Helmet)
  app.use(helmetMiddleware);
  
  // 2. CORS
  app.use(corsMiddleware);
  
  // 3. Additional security headers
  app.use(additionalSecurityHeaders);
  
  // 4. Compression
  app.use(compression());
  
  // 5. Request/Response logging
  app.use(combinedLogger);
  
  // 6. Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  // 7. Request sanitization
  app.use(sanitizeRequest);
  
  // 8. API key validation (optional)
  app.use(validateApiKey);
  
  // 9. Monitoring middleware (request tracking, tracing, metrics)
  // Requirements: 82 - Logging and monitoring with ELK and Prometheus
  app.use(monitoringMiddleware());

  // Health check endpoint (no rate limiting)
  app.get('/health', createHealthCheckHandler());
  
  // Monitoring endpoints (metrics, diagnostics, alerts)
  // Requirements: 82 - Prometheus metrics and diagnostic reports
  app.use('/monitoring', monitoringRoutes);
  
  // API version info endpoint
  app.get(API_PREFIX, relaxedRateLimiter, createVersionHandler());

  // Mount API routes
  mountApiRoutes(app);

  // Error logging middleware
  app.use(errorLogger);
  
  // Error tracking for diagnostics
  // Requirements: 82 - Error tracking and diagnostic reports
  app.use(errorTrackingMiddleware);
  
  // 404 handler
  app.use(notFoundHandler);
  
  // Global error handler
  app.use(errorHandler);

  logger.info('API Gateway configured', {
    apiVersion: API_VERSION,
    apiPrefix: API_PREFIX,
  });
}

/**
 * Mount all API routes
 */
function mountApiRoutes(app: Express): void {
  const apiRouter = Router();

  // Authentication routes (strict rate limiting)
  apiRouter.use('/auth', strictRateLimiter, authRouter);
  
  // MFA routes (strict rate limiting)
  // Requirements: 74 - Multi-factor authentication with SMS, authenticator app, hardware keys
  apiRouter.use('/mfa', strictRateLimiter, mfaRoutes);

  // Health check for API
  apiRouter.get('/health', relaxedRateLimiter, createHealthCheckHandler());

  // Projects routes (standard rate limiting)
  apiRouter.use('/projects', standardRateLimiter, projectRouter);
  
  // Version control routes (standard rate limiting)
  // Requirements: 16 - Save drafts and revisions with version history
  apiRouter.use('/versions', standardRateLimiter, versionRouter);
  
  // Branch routes (standard rate limiting)
  // Requirements: 56 - Branching system with merge conflict resolution
  apiRouter.use('/branches', standardRateLimiter, branchRouter);
  
  // Storage routes (standard rate limiting)
  // Requirements: 12, 15, 63 - Document storage with S3 and MongoDB
  apiRouter.use('/storage', standardRateLimiter, storageRouter);
  
  // Collaboration routes (standard rate limiting)
  // Requirements: 21 - Collaborate with team members on projects
  apiRouter.use('/collaboration', standardRateLimiter, collaborationRouter);
  
  // Subscription routes (standard rate limiting)
  // Requirements: 20 - Subscription tiers with different capabilities
  // Requirements: 86 - Billing and invoice management
  apiRouter.use('/subscription', standardRateLimiter, subscriptionRoutes);
  
  // Usage metering routes (standard rate limiting)
  // Requirements: 20 - Track usage against tier limits
  // Requirements: 66 - Usage analytics and benchmarking
  // Requirements: 80 - API rate limits with transparency
  apiRouter.use('/usage', standardRateLimiter, usageRoutes);
  
  // Invoice routes (standard rate limiting)
  // Requirements: 86 - Billing and invoice management
  apiRouter.use('/invoices', standardRateLimiter, invoiceRoutes);
  
  // SEO routes (standard rate limiting)
  // Requirements: 27 - SEO keyword preservation and metadata management
  apiRouter.use('/seo', standardRateLimiter, seoRoutes);
  
  // Plagiarism detection routes (standard rate limiting)
  // Requirements: 31 - Plagiarism checking integrated with humanization
  // Requirements: 118 - Plagiarism-free certificates for premium users
  apiRouter.use('/plagiarism', standardRateLimiter, plagiarismRoutes);
  
  // Citation management routes (standard rate limiting)
  // Requirements: 33 - Citation and reference management
  apiRouter.use('/citation', standardRateLimiter, citationRoutes);
  
  // A/B Testing routes (standard rate limiting)
  // Requirements: 34 - A/B testing for content variations
  // Requirements: 121 - Performance tracking and winner selection
  apiRouter.use('/ab-testing', standardRateLimiter, abTestingRoutes);
  
  // Scheduling routes (standard rate limiting)
  // Requirements: 35 - Scheduling and automation with cron jobs
  apiRouter.use('/scheduling', standardRateLimiter, schedulingRoutes);
  
  // Cloud Storage routes (standard rate limiting)
  // Requirements: 22 - Integrate with cloud storage services (Google Drive, Dropbox, OneDrive)
  apiRouter.use('/cloud-storage', standardRateLimiter, cloudStorageRouter);
  
  // Webhook routes (standard rate limiting)
  // Requirements: 51 - Webhook system with HMAC verification
  apiRouter.use('/webhooks', standardRateLimiter, webhookRoutes);
  
  // Repurposing routes (standard rate limiting)
  // Requirements: 109 - Content repurposing for social platforms
  apiRouter.use('/repurposing', standardRateLimiter, repurposingRoutes);
  
  // Localization routes (standard rate limiting)
  // Requirements: 111 - Content localization with cultural adaptation
  apiRouter.use('/localization', standardRateLimiter, localizationRoutes);
  
  // Search routes (standard rate limiting)
  // Requirements: 61 - Advanced search and filtering
  apiRouter.use('/search', standardRateLimiter, searchRouter);
  
  // Admin routes (standard rate limiting)
  // Requirements: 19 - Monitor system performance and user activity
  apiRouter.use('/admin', standardRateLimiter, adminRoutes);
  
  // Support and diagnostics routes (strict rate limiting - admin only)
  // Requirements: 94 - Support and diagnostics tools
  apiRouter.use('/support', strictRateLimiter, supportRoutes);
  
  // Auto-scaling routes (strict rate limiting - admin only)
  // Requirements: 91 - Auto-scaling and resource optimization
  apiRouter.use('/auto-scaling', strictRateLimiter, autoScalingRoutes);
  
  // Placeholder routes for future services
  // These will be implemented in subsequent tasks
  
  // Transformations routes (standard rate limiting)
  apiRouter.use('/transformations', standardRateLimiter, createPlaceholderRouter('transformations'));
  
  // Analytics routes (relaxed rate limiting - read-heavy)
  apiRouter.use('/analytics', relaxedRateLimiter, createPlaceholderRouter('analytics'));
  
  // Detection routes (standard rate limiting)
  apiRouter.use('/detection', standardRateLimiter, createPlaceholderRouter('detection'));
  
  // Users routes (standard rate limiting)
  apiRouter.use('/users', standardRateLimiter, createPlaceholderRouter('users'));
  
  // Templates routes (relaxed rate limiting)
  apiRouter.use('/templates', relaxedRateLimiter, createPlaceholderRouter('templates'));

  // Mount API router
  app.use(API_PREFIX, apiRouter);
}

/**
 * Create health check handler
 */
function createHealthCheckHandler(): express.RequestHandler {
  return ((_req: Request, res: Response) => {
    checkDatabaseHealth()
      .then((dbHealth) => {
        const status = dbHealth.overall ? 'healthy' : 'degraded';
        const statusCode = dbHealth.overall ? 200 : 503;
        
        res.status(statusCode).json({
          status,
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          environment: config.nodeEnv,
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
          version: '1.0.0',
          environment: config.nodeEnv,
        });
      });
  }) as express.RequestHandler;
}

/**
 * Create API version handler
 */
function createVersionHandler(): express.RequestHandler {
  return ((_req: Request, res: Response) => {
    res.json({
      name: 'AI Humanizer API',
      version: '1.0.0',
      apiVersion: API_VERSION,
      documentation: '/api/v1/docs',
      endpoints: {
        auth: `${API_PREFIX}/auth`,
        mfa: `${API_PREFIX}/mfa`,
        projects: `${API_PREFIX}/projects`,
        versions: `${API_PREFIX}/versions`,
        branches: `${API_PREFIX}/branches`,
        storage: `${API_PREFIX}/storage`,
        collaboration: `${API_PREFIX}/collaboration`,
        subscription: `${API_PREFIX}/subscription`,
        usage: `${API_PREFIX}/usage`,
        invoices: `${API_PREFIX}/invoices`,
        seo: `${API_PREFIX}/seo`,
        plagiarism: `${API_PREFIX}/plagiarism`,
        citation: `${API_PREFIX}/citation`,
        abTesting: `${API_PREFIX}/ab-testing`,
        scheduling: `${API_PREFIX}/scheduling`,
        cloudStorage: `${API_PREFIX}/cloud-storage`,
        webhooks: `${API_PREFIX}/webhooks`,
        repurposing: `${API_PREFIX}/repurposing`,
        localization: `${API_PREFIX}/localization`,
        search: `${API_PREFIX}/search`,
        admin: `${API_PREFIX}/admin`,
        support: `${API_PREFIX}/support`,
        autoScaling: `${API_PREFIX}/auto-scaling`,
        monitoring: '/monitoring',
        transformations: `${API_PREFIX}/transformations`,
        analytics: `${API_PREFIX}/analytics`,
        detection: `${API_PREFIX}/detection`,
        users: `${API_PREFIX}/users`,
        templates: `${API_PREFIX}/templates`,
      },
    });
  }) as express.RequestHandler;
}

/**
 * Create placeholder router for services not yet implemented
 */
function createPlaceholderRouter(serviceName: string): Router {
  const router = Router();

  router.all('*', ((req: Request, res: Response) => {
    res.status(501).json({
      error: 'NOT_IMPLEMENTED',
      code: 'NOT_IMPLEMENTED',
      message: `The ${serviceName} service is not yet implemented`,
      path: req.path,
      timestamp: new Date().toISOString(),
    });
  }) as express.RequestHandler);

  return router;
}

/**
 * Export API error class for use in routes
 */
export { ApiError };
