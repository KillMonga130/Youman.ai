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
import { transformRouter } from '../transform/transform.routes';
import { toneRoutes } from '../tone';
import { detectionRouter } from '../detection';
import { templateRoutes } from '../template';
import { 
  standardRateLimiter, 
  strictRateLimiter,
  relaxedRateLimiter,
} from './middleware/rate-limiter';
import { requireSubscription } from '../subscription/subscription.middleware';
import { authenticate } from '../auth/auth.middleware';
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
import { disasterRecoveryRoutes } from '../disaster-recovery';
import { cdnRoutes } from '../cdn';
import { performanceRoutes } from '../performance';
import { customerSuccessRoutes } from '../customer-success';
import { mlModelRoutes, trainingDataRoutes, trainingJobRoutes } from '../ml-model';
import { whiteLabelRoutes } from '../white-label';
import { partnerRoutes } from '../partner';
import { contentModerationRoutes } from '../content-moderation';
import { legalRoutes } from '../legal';
import { costManagementRoutes } from '../cost-management';
import { dataPipelineRoutes } from '../data-pipeline';
import { featureFlagRoutes } from '../feature-flags';
import { expansionRoutes } from '../expansion';
import { summarizationRoutes } from '../summarization';
import { translationRoutes } from '../translation';
import { factCheckingRoutes } from '../fact-checking';
import { formalizationRoutes } from '../formalization';
import { simplificationRoutes } from '../simplification';
import { enrichmentRoutes } from '../enrichment';
import { anonymizationRoutes } from '../anonymization';
import { grammarRoutes } from '../grammar';
import { retentionRoutes } from '../retention';
import { watermarkRoutes } from '../watermark';
import { expirationRoutes } from '../expiration';
import { contentAnalysisRoutes } from '../content-analysis';
import { learningProfileRoutes } from '../learning-profile';
import { setupSwagger } from '../docs';

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
  
  // Setup Swagger API documentation
  // Requirements: 23 - Comprehensive API documentation
  setupSwagger(app);
  
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

  // Projects routes (standard rate limiting + auth + subscription required)
  apiRouter.use('/projects', standardRateLimiter, authenticate, requireSubscription, projectRouter);
  
  // Version control routes (standard rate limiting + auth + subscription required)
  // Requirements: 16 - Save drafts and revisions with version history
  apiRouter.use('/versions', standardRateLimiter, authenticate, requireSubscription, versionRouter);
  
  // Branch routes (standard rate limiting + auth + subscription required)
  // Requirements: 56 - Branching system with merge conflict resolution
  apiRouter.use('/branches', standardRateLimiter, authenticate, requireSubscription, branchRouter);
  
  // Storage routes (standard rate limiting + auth + subscription required)
  // Requirements: 12, 15, 63 - Document storage with S3 and MongoDB
  apiRouter.use('/storage', standardRateLimiter, authenticate, requireSubscription, storageRouter);
  
  // Collaboration routes (standard rate limiting + auth + subscription required)
  // Requirements: 21 - Collaborate with team members on projects
  apiRouter.use('/collaboration', standardRateLimiter, authenticate, requireSubscription, collaborationRouter);
  
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
  
  // Tone analysis routes (standard rate limiting)
  // Requirements: 32, 47, 108, 116 - Tone adjustment and sentiment analysis
  apiRouter.use('/tone', standardRateLimiter, toneRoutes);
  
  // Admin routes (standard rate limiting)
  // Requirements: 19 - Monitor system performance and user activity
  apiRouter.use('/admin', standardRateLimiter, adminRoutes);
  
  // Support and diagnostics routes (strict rate limiting - admin only)
  // Requirements: 94 - Support and diagnostics tools
  apiRouter.use('/support', strictRateLimiter, supportRoutes);
  
  // Auto-scaling routes (strict rate limiting - admin only)
  // Requirements: 91 - Auto-scaling and resource optimization
  apiRouter.use('/auto-scaling', strictRateLimiter, autoScalingRoutes);
  
  // Disaster recovery routes (strict rate limiting - admin only)
  // Requirements: 92 - Disaster recovery and business continuity
  apiRouter.use('/disaster-recovery', strictRateLimiter, disasterRecoveryRoutes);
  
  // CDN and caching routes (strict rate limiting - admin only)
  // Requirements: 90 - CDN and global content delivery
  apiRouter.use('/cdn', strictRateLimiter, cdnRoutes);
  
  // Performance optimization routes (strict rate limiting - admin only)
  // Requirements: 70 - Performance optimization
  apiRouter.use('/performance', strictRateLimiter, performanceRoutes);
  
  // Customer Success routes (standard rate limiting)
  // Requirements: 96 - Customer success tools (onboarding, engagement, NPS, milestones)
  apiRouter.use('/customer-success', standardRateLimiter, customerSuccessRoutes);
  
  // ML Model Management routes (standard rate limiting)
  // Requirements: 88 - Model versioning, blue-green deployment, performance tracking, drift detection
  apiRouter.use('/ml-models', standardRateLimiter, mlModelRoutes);
  
  // Training Data routes (standard rate limiting)
  // Phase 2: Training data collection and management
  apiRouter.use('/training-data', standardRateLimiter, trainingDataRoutes);
  
  // Training Job routes (standard rate limiting)
  // Phase 2: Training job management and orchestration
  apiRouter.use('/training-jobs', standardRateLimiter, trainingJobRoutes);

  // White-Label routes (standard rate limiting)
  // Requirements: 60 - Branding customization, custom domains, branded reports
  apiRouter.use('/white-label', standardRateLimiter, whiteLabelRoutes);

  // Partner Integration routes (standard rate limiting)
  // Requirements: 98 - Partner OAuth, API keys, webhooks, marketplace
  apiRouter.use('/partners', standardRateLimiter, partnerRoutes);

  // Content Moderation routes (standard rate limiting)
  // Requirements: 97 - Content scanning, flagging, review workflow, policy enforcement
  apiRouter.use('/content-moderation', standardRateLimiter, contentModerationRoutes);

  // Legal and Compliance routes (standard rate limiting)
  // Requirements: 95 - Legal compliance, terms of service, consent, DMCA, licensing
  apiRouter.use('/legal', standardRateLimiter, legalRoutes);

  // Cost Management routes (standard rate limiting)
  // Requirements: 99 - Cost tracking and optimization
  apiRouter.use('/cost-management', standardRateLimiter, costManagementRoutes);

  // Data Pipeline routes (standard rate limiting)
  // Requirements: 89 - ETL pipeline, data quality validation, batch processing
  apiRouter.use('/data-pipeline', standardRateLimiter, dataPipelineRoutes);

  // Feature Flags routes (standard rate limiting)
  // Requirements: 87 - Experiment management, user bucketing, feature rollouts
  apiRouter.use('/feature-flags', standardRateLimiter, featureFlagRoutes);

  // Content Transformation routes (standard rate limiting)
  // Expansion routes - Requirements: 79
  apiRouter.use('/expansion', standardRateLimiter, expansionRoutes);

  // Summarization routes - Requirements: 78
  apiRouter.use('/summarization', standardRateLimiter, summarizationRoutes);

  // Translation routes - Requirements: 77
  apiRouter.use('/translation', standardRateLimiter, translationRoutes);

  // Fact-Checking routes - Requirements: 110
  apiRouter.use('/fact-checking', standardRateLimiter, factCheckingRoutes);

  // Formalization routes - Requirements: 107
  apiRouter.use('/formalization', standardRateLimiter, formalizationRoutes);

  // Simplification routes - Requirements: 106
  apiRouter.use('/simplification', standardRateLimiter, simplificationRoutes);

  // Enrichment routes - Requirements: 105
  apiRouter.use('/enrichment', standardRateLimiter, enrichmentRoutes);

  // Anonymization routes - Requirements: 104
  apiRouter.use('/anonymization', standardRateLimiter, anonymizationRoutes);

  // Grammar routes - Requirements: 103
  apiRouter.use('/grammar', standardRateLimiter, grammarRoutes);

  // Data Retention routes (standard rate limiting)
  // Requirements: 63 - Data lifecycle and retention policies
  apiRouter.use('/retention', standardRateLimiter, retentionRoutes);

  // Watermarking routes (standard rate limiting)
  // Requirements: 76 - Invisible watermarking system
  apiRouter.use('/watermark', standardRateLimiter, watermarkRoutes);

  // Content Expiration routes (standard rate limiting)
  // Requirements: 75 - Content expiration with automatic deletion
  apiRouter.use('/expiration', standardRateLimiter, expirationRoutes);

  // Content Analysis routes (standard rate limiting)
  // Requirements: 54, 62, 122-130 - Content analysis features
  apiRouter.use('/content-analysis', standardRateLimiter, contentAnalysisRoutes);

  // Learning Profile routes (standard rate limiting)
  // Requirements: 28 - User-specific learning and adaptation
  apiRouter.use('/learning-profile', standardRateLimiter, learningProfileRoutes);

  // Transformations routes (standard rate limiting)
  // Requirements: 2.1, 2.2, 2.3, 2.4 - Text humanization API
  apiRouter.use('/transformations', standardRateLimiter, authenticate, requireSubscription, transformRouter);
  
  // Placeholder routes for future services
  // These will be implemented in subsequent tasks
  
  // Analytics routes (relaxed rate limiting - read-heavy)
  apiRouter.use('/analytics', relaxedRateLimiter, createPlaceholderRouter('analytics'));
  
  // Detection routes (standard rate limiting + subscription required)
  // Requirements: 26 - Real-time AI detection testing
  apiRouter.use('/detection', standardRateLimiter, authenticate, requireSubscription, detectionRouter);
  
  // Users routes (standard rate limiting)
  apiRouter.use('/users', standardRateLimiter, createPlaceholderRouter('users'));
  
  // Templates routes (relaxed rate limiting + subscription required)
  // Requirements: 25 - Template system with presets and custom templates
  apiRouter.use('/templates', relaxedRateLimiter, authenticate, requireSubscription, templateRoutes);

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
        tone: `${API_PREFIX}/tone`,
        admin: `${API_PREFIX}/admin`,
        support: `${API_PREFIX}/support`,
        autoScaling: `${API_PREFIX}/auto-scaling`,
        disasterRecovery: `${API_PREFIX}/disaster-recovery`,
        cdn: `${API_PREFIX}/cdn`,
        performance: `${API_PREFIX}/performance`,
        customerSuccess: `${API_PREFIX}/customer-success`,
        mlModels: `${API_PREFIX}/ml-models`,
        whiteLabel: `${API_PREFIX}/white-label`,
        partners: `${API_PREFIX}/partners`,
        contentModeration: `${API_PREFIX}/content-moderation`,
        legal: `${API_PREFIX}/legal`,
        costManagement: `${API_PREFIX}/cost-management`,
        dataPipeline: `${API_PREFIX}/data-pipeline`,
        featureFlags: `${API_PREFIX}/feature-flags`,
        expansion: `${API_PREFIX}/expansion`,
        summarization: `${API_PREFIX}/summarization`,
        translation: `${API_PREFIX}/translation`,
        factChecking: `${API_PREFIX}/fact-checking`,
        formalization: `${API_PREFIX}/formalization`,
        simplification: `${API_PREFIX}/simplification`,
        enrichment: `${API_PREFIX}/enrichment`,
        anonymization: `${API_PREFIX}/anonymization`,
        grammar: `${API_PREFIX}/grammar`,
        retention: `${API_PREFIX}/retention`,
        watermark: `${API_PREFIX}/watermark`,
        expiration: `${API_PREFIX}/expiration`,
        contentAnalysis: `${API_PREFIX}/content-analysis`,
        learningProfile: `${API_PREFIX}/learning-profile`,
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
