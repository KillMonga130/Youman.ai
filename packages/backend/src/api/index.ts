/**
 * API Gateway Module
 * Central routing and middleware configuration for the AI Humanizer API
 */

export { createApiGateway, ApiError } from './gateway';
export { 
  createRateLimiter,
  standardRateLimiter, 
  strictRateLimiter, 
  relaxedRateLimiter,
  transformationRateLimiter,
  rateLimitConfigs,
} from './middleware/rate-limiter';
export type { RateLimitConfig } from './middleware/rate-limiter';
export { 
  requestLogger, 
  responseLogger, 
  combinedLogger, 
  errorLogger,
  redactHeaders,
} from './middleware/request-logger';
export { 
  createCorsMiddleware,
  createHelmetMiddleware,
  corsMiddleware, 
  helmetMiddleware, 
  additionalSecurityHeaders,
  validateApiKey,
  sanitizeRequest,
} from './middleware/security';
export { 
  errorHandler, 
  notFoundHandler,
  asyncHandler,
} from './middleware/error-handler';
