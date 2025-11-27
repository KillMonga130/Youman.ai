/**
 * Content Expiration Module
 * Exports for content expiration functionality
 * Requirements: 75 - Content expiration with automatic deletion
 */

export * from './types';
export { ExpirationService, ExpirationError, expirationService } from './expiration.service';
export { default as expirationRoutes } from './expiration.routes';
