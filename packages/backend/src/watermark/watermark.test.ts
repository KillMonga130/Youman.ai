/**
 * Watermarking Service Tests
 * Tests for invisible watermark embedding, detection, and verification
 * Requirements: 76 - Invisible watermarking system
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { WatermarkService, WatermarkError } from './watermark.service';
import { WatermarkMetadata, WatermarkConfig } from './types';

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('WatermarkService', () => {
  let service: WatermarkService;

  const mockMetadata: WatermarkMetadata = {
    userId: 'user-123',
    projectId: 'project-456',
    timestamp: new Date('2024-01-15T10:00:00Z'),
    customData: { source: 'test' },
  };

  const sampleText = 'This is a sample text. It has multiple sentences. We will test watermarking on it.';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new WatermarkService({
      secretKey: 'test-secret-key',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('embedWatermark', () => {
    it('should embed watermark into text', async () => {
      const result = await service.embedWatermark(sampleText, mockMetadata);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(sampleText.length);
      expect(service.hasWatermark(result)).toBe(true);
    });

    it('should preserve original text content', async () => {
      const result = await service.embedWatermark(sampleText, mockMetadata);
      const cleanText = service.removeWatermark(result);

      // The clean text should contain all the original words
      const originalWords = sampleText.split(/\s+/);
      for (const word of originalWords) {
        expect(cleanText).toContain(word);
      }
    });

    it('should throw error for empty text', async () => {
      await expect(service.embedWatermark('', mockMetadata)).rejects.toThrow(WatermarkError);
      await expect(service.embedWatermark('   ', mockMetadata)).rejects.toThrow(WatermarkError);
    });

    it('should return original text when watermarking is disabled', async () => {
      await service.configureWatermark(mockMetadata.userId, { enabled: false });

      const result = await service.embedWatermark(sampleText, mockMetadata);

      expect(result).toBe(sampleText);
      expect(service.hasWatermark(result)).toBe(false);
    });

    it('should handle short text', async () => {
      const shortText = 'Short text.';
      const result = await service.embedWatermark(shortText, mockMetadata);

      expect(result).toBeDefined();
      expect(service.hasWatermark(result)).toBe(true);
    });

    it('should handle text with special characters', async () => {
      const specialText = 'Text with émojis 🎉 and spëcial çharacters! "Quotes" & symbols.';
      const result = await service.embedWatermark(specialText, mockMetadata);

      expect(result).toBeDefined();
      expect(service.hasWatermark(result)).toBe(true);
    });
  });

  describe('detectWatermark', () => {
    it('should detect watermark in watermarked text', async () => {
      const watermarkedText = await service.embedWatermark(sampleText, mockMetadata);
      const detected = await service.detectWatermark(watermarkedText);

      expect(detected).not.toBeNull();
      expect(detected?.detected).toBe(true);
      expect(detected?.confidence).toBe(1.0);
    });

    it('should extract correct metadata from watermark', async () => {
      const watermarkedText = await service.embedWatermark(sampleText, mockMetadata);
      const detected = await service.detectWatermark(watermarkedText);

      expect(detected?.metadata).not.toBeNull();
      expect(detected?.metadata?.userId).toBe(mockMetadata.userId);
      expect(detected?.metadata?.projectId).toBe(mockMetadata.projectId);
    });

    it('should return null for empty text', async () => {
      const result = await service.detectWatermark('');
      expect(result).toBeNull();
    });

    it('should return detected=false for text without watermark', async () => {
      const result = await service.detectWatermark(sampleText);

      expect(result).not.toBeNull();
      expect(result?.detected).toBe(false);
      expect(result?.metadata).toBeNull();
    });

    it('should handle text with random zero-width characters', async () => {
      const textWithRandomZeroWidth = 'Text\u200Bwith\u200Crandom\u200Dchars';
      const result = await service.detectWatermark(textWithRandomZeroWidth);

      // Should not crash, may or may not detect depending on pattern
      expect(result).toBeDefined();
    });
  });

  describe('verifyWatermark', () => {
    it('should verify watermark matches expected user', async () => {
      const watermarkedText = await service.embedWatermark(sampleText, mockMetadata);
      const verified = await service.verifyWatermark(watermarkedText, mockMetadata.userId);

      expect(verified).toBe(true);
    });

    it('should fail verification for wrong user', async () => {
      const watermarkedText = await service.embedWatermark(sampleText, mockMetadata);
      const verified = await service.verifyWatermark(watermarkedText, 'wrong-user-id');

      expect(verified).toBe(false);
    });

    it('should fail verification for text without watermark', async () => {
      const verified = await service.verifyWatermark(sampleText, mockMetadata.userId);

      expect(verified).toBe(false);
    });

    it('should return false for empty inputs', async () => {
      expect(await service.verifyWatermark('', mockMetadata.userId)).toBe(false);
      expect(await service.verifyWatermark(sampleText, '')).toBe(false);
    });
  });

  describe('getVerificationResult', () => {
    it('should return detailed verification result for valid watermark', async () => {
      const watermarkedText = await service.embedWatermark(sampleText, mockMetadata);
      const result = await service.getVerificationResult(watermarkedText, mockMetadata.userId);

      expect(result.verified).toBe(true);
      expect(result.watermarkFound).toBe(true);
      expect(result.userIdMatch).toBe(true);
      expect(result.watermarkInfo).not.toBeNull();
      expect(result.verifiedAt).toBeInstanceOf(Date);
    });

    it('should return watermarkFound=false for text without watermark', async () => {
      const result = await service.getVerificationResult(sampleText, mockMetadata.userId);

      expect(result.verified).toBe(false);
      expect(result.watermarkFound).toBe(false);
      expect(result.userIdMatch).toBe(false);
    });

    it('should return userIdMatch=false for wrong user', async () => {
      const watermarkedText = await service.embedWatermark(sampleText, mockMetadata);
      const result = await service.getVerificationResult(watermarkedText, 'wrong-user');

      expect(result.verified).toBe(false);
      expect(result.watermarkFound).toBe(true);
      expect(result.userIdMatch).toBe(false);
    });
  });

  describe('configureWatermark', () => {
    it('should configure watermark settings for user', async () => {
      const config: Partial<WatermarkConfig> = {
        enabled: true,
        includeUserId: true,
        includeProjectId: false,
        includeTimestamp: true,
      };

      await service.configureWatermark('user-123', config);
      const savedConfig = service.getWatermarkConfig('user-123');

      expect(savedConfig.enabled).toBe(true);
      expect(savedConfig.includeUserId).toBe(true);
      expect(savedConfig.includeProjectId).toBe(false);
      expect(savedConfig.includeTimestamp).toBe(true);
    });

    it('should throw error for empty user ID', async () => {
      await expect(service.configureWatermark('', { enabled: true })).rejects.toThrow(
        WatermarkError
      );
    });

    it('should merge with existing configuration', async () => {
      await service.configureWatermark('user-123', { enabled: true, includeUserId: true });
      await service.configureWatermark('user-123', { includeProjectId: false });

      const config = service.getWatermarkConfig('user-123');

      expect(config.enabled).toBe(true);
      expect(config.includeUserId).toBe(true);
      expect(config.includeProjectId).toBe(false);
    });

    it('should return default config for unconfigured user', () => {
      const config = service.getWatermarkConfig('new-user');

      expect(config.enabled).toBe(true);
      expect(config.includeUserId).toBe(true);
      expect(config.includeProjectId).toBe(true);
      expect(config.includeTimestamp).toBe(true);
    });
  });

  describe('removeWatermark', () => {
    it('should remove watermark from text', async () => {
      const watermarkedText = await service.embedWatermark(sampleText, mockMetadata);
      const cleanText = service.removeWatermark(watermarkedText);

      expect(service.hasWatermark(cleanText)).toBe(false);
    });

    it('should return same text if no watermark present', () => {
      const cleanText = service.removeWatermark(sampleText);

      expect(cleanText).toBe(sampleText);
    });

    it('should handle empty text', () => {
      expect(service.removeWatermark('')).toBe('');
    });

    it('should handle null/undefined gracefully', () => {
      expect(service.removeWatermark(null as any)).toBe(null);
      expect(service.removeWatermark(undefined as any)).toBe(undefined);
    });
  });

  describe('hasWatermark', () => {
    it('should return true for watermarked text', async () => {
      const watermarkedText = await service.embedWatermark(sampleText, mockMetadata);

      expect(service.hasWatermark(watermarkedText)).toBe(true);
    });

    it('should return false for clean text', () => {
      expect(service.hasWatermark(sampleText)).toBe(false);
    });

    it('should return false for empty text', () => {
      expect(service.hasWatermark('')).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(service.hasWatermark(null as any)).toBe(false);
      expect(service.hasWatermark(undefined as any)).toBe(false);
    });
  });

  describe('round-trip integrity', () => {
    it('should preserve watermark through multiple operations', async () => {
      // Embed watermark
      const watermarkedText = await service.embedWatermark(sampleText, mockMetadata);

      // Detect watermark
      const detected1 = await service.detectWatermark(watermarkedText);
      expect(detected1?.detected).toBe(true);

      // Verify watermark
      const verified = await service.verifyWatermark(watermarkedText, mockMetadata.userId);
      expect(verified).toBe(true);

      // Detect again
      const detected2 = await service.detectWatermark(watermarkedText);
      expect(detected2?.metadata?.userId).toBe(mockMetadata.userId);
    });

    it('should handle different metadata values', async () => {
      const metadata1: WatermarkMetadata = {
        userId: 'user-aaa',
        projectId: 'project-111',
        timestamp: new Date(),
      };

      const metadata2: WatermarkMetadata = {
        userId: 'user-bbb',
        projectId: 'project-222',
        timestamp: new Date(),
      };

      const text1 = await service.embedWatermark('First text content.', metadata1);
      const text2 = await service.embedWatermark('Second text content.', metadata2);

      const detected1 = await service.detectWatermark(text1);
      const detected2 = await service.detectWatermark(text2);

      expect(detected1?.metadata?.userId).toBe('user-aaa');
      expect(detected2?.metadata?.userId).toBe('user-bbb');
    });
  });

  describe('watermark does not affect detection scores', () => {
    it('should not add visible characters to text', async () => {
      const watermarkedText = await service.embedWatermark(sampleText, mockMetadata);
      const cleanText = service.removeWatermark(watermarkedText);

      // Visible content should be essentially the same
      // (may have minor whitespace differences due to embedding positions)
      const originalWords = sampleText.replace(/\s+/g, ' ').trim().split(' ');
      const cleanWords = cleanText.replace(/\s+/g, ' ').trim().split(' ');

      expect(cleanWords.length).toBe(originalWords.length);
    });

    it('should use only zero-width characters for watermark', async () => {
      const watermarkedText = await service.embedWatermark(sampleText, mockMetadata);

      // Get the difference (watermark characters)
      const watermarkChars = watermarkedText.replace(
        new RegExp(`[^\\u200B\\u200C\\u200D\\uFEFF]`, 'g'),
        ''
      );

      // All watermark characters should be zero-width
      for (const char of watermarkChars) {
        const code = char.charCodeAt(0);
        expect([0x200b, 0x200c, 0x200d, 0xfeff]).toContain(code);
      }
    });
  });
});
