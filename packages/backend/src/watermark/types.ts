/**
 * Watermarking Service Types
 * Type definitions for invisible content watermarks
 * Requirements: 76 - Invisible watermarking system
 */

/**
 * Watermark metadata embedded in content
 * Requirement 76: Embed invisible watermarks with user/project info
 */
export interface WatermarkMetadata {
  /** User identifier who created the content */
  userId: string;
  /** Project identifier */
  projectId: string;
  /** Timestamp when watermark was created */
  timestamp: Date;
  /** Optional custom data */
  customData?: Record<string, any>;
}

/**
 * Watermark information extracted from content
 */
export interface WatermarkInfo {
  /** Whether a watermark was detected */
  detected: boolean;
  /** Extracted metadata (if detected) */
  metadata: WatermarkMetadata | null;
  /** Confidence score (0-1) */
  confidence: number;
  /** Watermark version */
  version: string;
}

/**
 * Watermark configuration for a user
 * Requirement 76: Configure watermark settings
 */
export interface WatermarkConfig {
  /** Whether watermarking is enabled */
  enabled: boolean;
  /** Include user ID in watermark */
  includeUserId: boolean;
  /** Include project ID in watermark */
  includeProjectId: boolean;
  /** Include timestamp in watermark */
  includeTimestamp: boolean;
  /** Custom fields to include */
  customFields: string[];
}

/**
 * Default watermark configuration
 */
export const DEFAULT_WATERMARK_CONFIG: WatermarkConfig = {
  enabled: true,
  includeUserId: true,
  includeProjectId: true,
  includeTimestamp: true,
  customFields: [],
};

/**
 * Watermark verification result
 */
export interface WatermarkVerificationResult {
  /** Whether verification passed */
  verified: boolean;
  /** Whether watermark was found */
  watermarkFound: boolean;
  /** Whether user ID matches expected */
  userIdMatch: boolean;
  /** Extracted watermark info */
  watermarkInfo: WatermarkInfo | null;
  /** Verification timestamp */
  verifiedAt: Date;
}

/**
 * Options for embedding watermark
 */
export interface EmbedWatermarkOptions {
  /** Text to watermark */
  text: string;
  /** Metadata to embed */
  metadata: WatermarkMetadata;
  /** User's watermark configuration */
  config?: Partial<WatermarkConfig>;
}

/**
 * Options for detecting watermark
 */
export interface DetectWatermarkOptions {
  /** Text to check for watermark */
  text: string;
}

/**
 * Options for verifying watermark
 */
export interface VerifyWatermarkOptions {
  /** Text to verify */
  text: string;
  /** Expected user ID */
  expectedUserId: string;
}

/**
 * Watermark encoding methods
 * Different techniques for embedding invisible watermarks
 */
export type WatermarkMethod = 
  | 'zero-width'      // Zero-width characters
  | 'homoglyph'       // Similar-looking characters
  | 'whitespace'      // Whitespace variations
  | 'combined';       // Combination of methods

/**
 * Watermark service configuration
 */
export interface WatermarkServiceConfig {
  /** Primary encoding method */
  method: WatermarkMethod;
  /** Watermark version identifier */
  version: string;
  /** Secret key for encoding (should be from env) */
  secretKey: string;
  /** Enable redundant encoding for robustness */
  redundantEncoding: boolean;
  /** Maximum watermark payload size in bytes */
  maxPayloadSize: number;
}

/**
 * Stored watermark configuration for a user
 */
export interface StoredWatermarkConfig {
  /** User ID */
  userId: string;
  /** Configuration */
  config: WatermarkConfig;
  /** Created timestamp */
  createdAt: Date;
  /** Updated timestamp */
  updatedAt: Date;
}

/**
 * Watermark embedding result
 */
export interface EmbedResult {
  /** Watermarked text */
  text: string;
  /** Whether embedding was successful */
  success: boolean;
  /** Watermark method used */
  method: WatermarkMethod;
  /** Payload size in bytes */
  payloadSize: number;
}

/**
 * Zero-width character set for encoding
 */
export const ZERO_WIDTH_CHARS = {
  ZERO: '\u200B',      // Zero-width space (represents 0)
  ONE: '\u200C',       // Zero-width non-joiner (represents 1)
  SEPARATOR: '\u200D', // Zero-width joiner (separator)
  MARKER: '\uFEFF',    // Byte order mark (start/end marker)
} as const;
