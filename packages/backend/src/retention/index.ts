/**
 * Data Retention Module
 * Exports for data retention policy management
 * Requirements: 63 - Data lifecycle and retention policies
 */

export { retentionService, RetentionService, RetentionError } from './retention.service';
export { default as retentionRoutes } from './retention.routes';
export * from './types';
