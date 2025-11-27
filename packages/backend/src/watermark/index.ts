/**
 * Watermarking Module
 * Exports for invisible watermarking functionality
 * Requirements: 76 - Invisible watermarking system
 */

export * from './types';
export { WatermarkService, WatermarkError, watermarkService } from './watermark.service';
export { default as watermarkRoutes } from './watermark.routes';
