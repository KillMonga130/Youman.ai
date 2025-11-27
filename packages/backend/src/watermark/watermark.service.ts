/**
 * Watermarking Service
 * Manages invisible content watermarks for tracking and verification
 * Requirements: 76 - Invisible watermarking system
 */

import crypto from 'crypto';
import { logger } from '../utils/logger';
import {
  WatermarkMetadata,
  WatermarkInfo,
  WatermarkConfig,
  WatermarkVerificationResult,
  WatermarkServiceConfig,
  DEFAULT_WATERMARK_CONFIG,
  ZERO_WIDTH_CHARS,
  StoredWatermarkConfig,
} from './types';

/** Current watermark version */
const WATERMARK_VERSION = '1.0';

/** Default service configuration */
const DEFAULT_SERVICE_CONFIG: WatermarkServiceConfig = {
  method: 'zero-width',
  version: WATERMARK_VERSION,
  secretKey: process.env.WATERMARK_SECRET_KEY || 'default-watermark-key',
  redundantEncoding: true,
  maxPayloadSize: 1024, // 1KB max payload
};

/**
 * Custom error class for watermark-related errors
 */
export class WatermarkError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'WatermarkError';
    this.code = code;
  }
}

/**
 * Watermarking Service class
 * Handles embedding, detection, and verification of invisible watermarks
 */
export class WatermarkService {
  private config: WatermarkServiceConfig;
  private userConfigs: Map<string, StoredWatermarkConfig> = new Map();

  constructor(serviceConfig?: Partial<WatermarkServiceConfig>) {
    this.config = { ...DEFAULT_SERVICE_CONFIG, ...serviceConfig };
  }

  /**
   * Embeds an invisible watermark into text
   * Requirement 76: Implement invisible watermark embedding
   * @param text - Text to watermark
   * @param metadata - Metadata to embed
   * @returns Watermarked text
   */
  async embedWatermark(text: string, metadata: WatermarkMetadata): Promise<string> {
    if (!text || text.trim().length === 0) {
      throw new WatermarkError('Text cannot be empty', 'EMPTY_TEXT');
    }

    // Get user config or use defaults
    const userConfig = this.getUserConfig(metadata.userId);
    
    if (!userConfig.enabled) {
      return text; // Return original text if watermarking disabled
    }

    // Build payload based on config
    const payload = this.buildPayload(metadata, userConfig);
    
    // Encode payload to binary
    const encodedPayload = this.encodePayload(payload);
    
    // Convert to zero-width characters
    const watermark = this.binaryToZeroWidth(encodedPayload);
    
    // Embed watermark in text
    const watermarkedText = this.embedInText(text, watermark);

    logger.debug('Watermark embedded', {
      userId: metadata.userId,
      projectId: metadata.projectId,
      payloadSize: encodedPayload.length,
    });

    return watermarkedText;
  }

  /**
   * Detects and extracts watermark from text
   * Requirement 76: Create watermark detection tool
   * @param text - Text to check for watermark
   * @returns Watermark info if found, null otherwise
   */
  async detectWatermark(text: string): Promise<WatermarkInfo | null> {
    if (!text || text.trim().length === 0) {
      return null;
    }

    try {
      // Extract zero-width characters
      const watermark = this.extractZeroWidthChars(text);
      
      if (!watermark || watermark.length === 0) {
        return {
          detected: false,
          metadata: null,
          confidence: 0,
          version: this.config.version,
        };
      }

      // Convert zero-width to binary
      const binary = this.zeroWidthToBinary(watermark);
      
      if (!binary) {
        return {
          detected: false,
          metadata: null,
          confidence: 0,
          version: this.config.version,
        };
      }

      // Decode payload
      const payload = this.decodePayload(binary);
      
      if (!payload) {
        return {
          detected: false,
          metadata: null,
          confidence: 0.3, // Some zero-width chars found but couldn't decode
          version: this.config.version,
        };
      }

      // Parse metadata from payload
      const metadata = this.parsePayload(payload);
      
      if (!metadata) {
        return {
          detected: false,
          metadata: null,
          confidence: 0.5, // Decoded but couldn't parse
          version: this.config.version,
        };
      }

      logger.debug('Watermark detected', {
        userId: metadata.userId,
        projectId: metadata.projectId,
      });

      return {
        detected: true,
        metadata,
        confidence: 1.0,
        version: this.config.version,
      };
    } catch (error) {
      logger.error('Error detecting watermark:', error);
      return null;
    }
  }

  /**
   * Configures watermark settings for a user
   * Requirement 76: Add watermark configuration
   * @param userId - User identifier
   * @param config - Watermark configuration
   */
  async configureWatermark(userId: string, config: Partial<WatermarkConfig>): Promise<void> {
    if (!userId) {
      throw new WatermarkError('User ID is required', 'INVALID_USER_ID');
    }

    const existingConfig = this.userConfigs.get(userId);
    const now = new Date();

    const storedConfig: StoredWatermarkConfig = {
      userId,
      config: {
        ...DEFAULT_WATERMARK_CONFIG,
        ...(existingConfig?.config || {}),
        ...config,
      },
      createdAt: existingConfig?.createdAt || now,
      updatedAt: now,
    };

    this.userConfigs.set(userId, storedConfig);

    logger.info('Watermark configuration updated', {
      userId,
      enabled: storedConfig.config.enabled,
    });
  }

  /**
   * Gets watermark configuration for a user
   * @param userId - User identifier
   * @returns User's watermark configuration
   */
  getWatermarkConfig(userId: string): WatermarkConfig {
    return this.getUserConfig(userId);
  }

  /**
   * Verifies watermark matches expected user
   * Requirement 76: Build watermark verification
   * @param text - Text to verify
   * @param expectedUserId - Expected user ID
   * @returns Verification result
   */
  async verifyWatermark(text: string, expectedUserId: string): Promise<boolean> {
    if (!text || !expectedUserId) {
      return false;
    }

    const watermarkInfo = await this.detectWatermark(text);

    if (!watermarkInfo || !watermarkInfo.detected || !watermarkInfo.metadata) {
      return false;
    }

    return watermarkInfo.metadata.userId === expectedUserId;
  }

  /**
   * Gets detailed verification result
   * @param text - Text to verify
   * @param expectedUserId - Expected user ID
   * @returns Detailed verification result
   */
  async getVerificationResult(
    text: string,
    expectedUserId: string
  ): Promise<WatermarkVerificationResult> {
    const watermarkInfo = await this.detectWatermark(text);
    const now = new Date();

    if (!watermarkInfo || !watermarkInfo.detected) {
      return {
        verified: false,
        watermarkFound: false,
        userIdMatch: false,
        watermarkInfo: null,
        verifiedAt: now,
      };
    }

    const userIdMatch = watermarkInfo.metadata?.userId === expectedUserId;

    return {
      verified: userIdMatch,
      watermarkFound: true,
      userIdMatch,
      watermarkInfo,
      verifiedAt: now,
    };
  }

  /**
   * Removes watermark from text
   * @param text - Text with watermark
   * @returns Text without watermark
   */
  removeWatermark(text: string): string {
    if (!text) {
      return text;
    }

    // Remove all zero-width characters
    return text.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');
  }

  /**
   * Checks if text contains a watermark
   * @param text - Text to check
   * @returns True if watermark is present
   */
  hasWatermark(text: string): boolean {
    if (!text) {
      return false;
    }

    const zeroWidthPattern = /[\u200B\u200C\u200D\uFEFF]/;
    return zeroWidthPattern.test(text);
  }

  // ============ Private Helper Methods ============

  /**
   * Gets user configuration or defaults
   */
  private getUserConfig(userId: string): WatermarkConfig {
    const stored = this.userConfigs.get(userId);
    return stored?.config || DEFAULT_WATERMARK_CONFIG;
  }

  /**
   * Builds payload from metadata based on config
   */
  private buildPayload(metadata: WatermarkMetadata, config: WatermarkConfig): string {
    const payload: Record<string, any> = {
      v: this.config.version,
    };

    if (config.includeUserId) {
      payload.u = metadata.userId;
    }

    if (config.includeProjectId) {
      payload.p = metadata.projectId;
    }

    if (config.includeTimestamp) {
      payload.t = metadata.timestamp.getTime();
    }

    if (metadata.customData && config.customFields.length > 0) {
      const customPayload: Record<string, any> = {};
      for (const field of config.customFields) {
        if (metadata.customData[field] !== undefined) {
          customPayload[field] = metadata.customData[field];
        }
      }
      if (Object.keys(customPayload).length > 0) {
        payload.c = customPayload;
      }
    }

    return JSON.stringify(payload);
  }

  /**
   * Encodes payload with checksum for integrity
   */
  private encodePayload(payload: string): string {
    // Create checksum
    const checksum = this.createChecksum(payload);
    
    // Combine payload with checksum
    const combined = `${payload}|${checksum}`;
    
    // Encode to base64 for compact binary representation
    const encoded = Buffer.from(combined).toString('base64');
    
    // Convert to binary string
    let binary = '';
    for (const char of encoded) {
      binary += char.charCodeAt(0).toString(2).padStart(8, '0');
    }
    
    return binary;
  }

  /**
   * Decodes payload and verifies checksum
   */
  private decodePayload(binary: string): string | null {
    try {
      // Convert binary to base64
      let base64 = '';
      for (let i = 0; i < binary.length; i += 8) {
        const byte = binary.slice(i, i + 8);
        if (byte.length === 8) {
          base64 += String.fromCharCode(parseInt(byte, 2));
        }
      }
      
      // Decode from base64
      const combined = Buffer.from(base64, 'base64').toString('utf-8');
      
      // Split payload and checksum
      const lastPipe = combined.lastIndexOf('|');
      if (lastPipe === -1) {
        return null;
      }
      
      const payload = combined.slice(0, lastPipe);
      const checksum = combined.slice(lastPipe + 1);
      
      // Verify checksum
      const expectedChecksum = this.createChecksum(payload);
      if (checksum !== expectedChecksum) {
        return null;
      }
      
      return payload;
    } catch {
      return null;
    }
  }

  /**
   * Parses payload JSON to metadata
   */
  private parsePayload(payload: string): WatermarkMetadata | null {
    try {
      const data = JSON.parse(payload);
      
      return {
        userId: data.u || '',
        projectId: data.p || '',
        timestamp: data.t ? new Date(data.t) : new Date(),
        customData: data.c,
      };
    } catch {
      return null;
    }
  }

  /**
   * Creates checksum for payload integrity
   */
  private createChecksum(data: string): string {
    return crypto
      .createHmac('sha256', this.config.secretKey)
      .update(data)
      .digest('hex')
      .slice(0, 8); // Use first 8 chars for compact checksum
  }

  /**
   * Converts binary string to zero-width characters
   */
  private binaryToZeroWidth(binary: string): string {
    let result = ZERO_WIDTH_CHARS.MARKER; // Start marker
    
    for (const bit of binary) {
      result += bit === '0' ? ZERO_WIDTH_CHARS.ZERO : ZERO_WIDTH_CHARS.ONE;
    }
    
    result += ZERO_WIDTH_CHARS.MARKER; // End marker
    
    return result;
  }

  /**
   * Converts zero-width characters back to binary
   */
  private zeroWidthToBinary(watermark: string): string | null {
    // Find content between markers
    const markerChar = ZERO_WIDTH_CHARS.MARKER;
    const startIdx = watermark.indexOf(markerChar);
    const endIdx = watermark.lastIndexOf(markerChar);
    
    if (startIdx === -1 || endIdx === -1 || startIdx === endIdx) {
      return null;
    }
    
    const content = watermark.slice(startIdx + 1, endIdx);
    
    let binary = '';
    for (const char of content) {
      if (char === ZERO_WIDTH_CHARS.ZERO) {
        binary += '0';
      } else if (char === ZERO_WIDTH_CHARS.ONE) {
        binary += '1';
      }
      // Ignore other characters
    }
    
    return binary;
  }

  /**
   * Extracts zero-width characters from text
   */
  private extractZeroWidthChars(text: string): string {
    const zeroWidthPattern = /[\u200B\u200C\u200D\uFEFF]/g;
    const matches = text.match(zeroWidthPattern);
    return matches ? matches.join('') : '';
  }

  /**
   * Embeds watermark into text at strategic positions
   * Requirement 76: Ensure watermarks don't affect detection scores
   */
  private embedInText(text: string, watermark: string): string {
    // Split watermark into chunks for distribution
    const chunkSize = Math.ceil(watermark.length / 3);
    const chunks = [
      watermark.slice(0, chunkSize),
      watermark.slice(chunkSize, chunkSize * 2),
      watermark.slice(chunkSize * 2),
    ];

    // Find natural break points (after sentences or paragraphs)
    const sentences = text.split(/(?<=[.!?])\s+/);
    
    if (sentences.length < 3) {
      // Short text: embed at beginning
      return watermark + text;
    }

    // Distribute watermark chunks throughout text
    const insertPoints = [
      0,
      Math.floor(sentences.length / 2),
      sentences.length - 1,
    ];

    let result = '';
    for (let i = 0; i < sentences.length; i++) {
      result += sentences[i];
      
      const chunkIndex = insertPoints.indexOf(i);
      if (chunkIndex !== -1 && chunks[chunkIndex]) {
        result += chunks[chunkIndex];
      }
      
      if (i < sentences.length - 1) {
        result += ' ';
      }
    }

    return result;
  }
}

// Export singleton instance
export const watermarkService = new WatermarkService();
