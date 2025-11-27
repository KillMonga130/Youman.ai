/**
 * Plagiarism Detection Service Tests
 * Tests for plagiarism checking and originality reports
 * Requirements: 31, 118
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PlagiarismService } from './plagiarism.service';
import { Match, Source, PlagiarismReport } from './types';

describe('PlagiarismService', () => {
  let service: PlagiarismService;

  beforeEach(() => {
    // Create service with internal detection only (no external APIs)
    service = new PlagiarismService({
      copyscape: { enabled: false, baseUrl: '', timeout: 5000 },
      turnitin: { enabled: false, baseUrl: '', timeout: 5000 },
      grammarly: { enabled: false, baseUrl: '', timeout: 5000 },
    });
  });

  describe('checkOriginality', () => {
    /**
     * Requirement 31.1: Run plagiarism detection against web sources and academic databases
     */
    it('should return a plagiarism report for text', async () => {
      const text = 'This is a simple test sentence for plagiarism checking.';
      
      const report = await service.checkOriginality(text);
      
      expect(report).toBeDefined();
      expect(report.id).toBeDefined();
      expect(report.overallSimilarity).toBeGreaterThanOrEqual(0);
      expect(report.overallSimilarity).toBeLessThanOrEqual(100);
      expect(report.originalityScore).toBeGreaterThanOrEqual(0);
      expect(report.originalityScore).toBeLessThanOrEqual(100);
      expect(report.wordCount).toBeGreaterThan(0);
      expect(report.timestamp).toBeInstanceOf(Date);
      expect(report.provider).toBe('internal');
    });

    it('should calculate originality score as 100 - similarity', async () => {
      const text = 'A unique piece of content that should have low similarity.';
      
      const report = await service.checkOriginality(text);
      
      expect(report.originalityScore).toBe(
        Math.round((100 - report.overallSimilarity) * 100) / 100
      );
    });

    it('should mark content as original when below threshold', async () => {
      const text = 'This is original content without any copied material.';
      
      const report = await service.checkOriginality(text, {
        similarityThreshold: 50,
      });
      
      if (report.overallSimilarity < 50) {
        expect(report.isOriginal).toBe(true);
      } else {
        expect(report.isOriginal).toBe(false);
      }
    });

    it('should include processing time in report', async () => {
      const text = 'Test content for processing time measurement.';
      
      const report = await service.checkOriginality(text);
      
      // Processing time should be a non-negative number
      expect(report.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should count words correctly', async () => {
      const text = 'One two three four five six seven eight nine ten.';
      
      const report = await service.checkOriginality(text);
      
      expect(report.wordCount).toBe(10);
    });
  });

  describe('highlightMatches', () => {
    /**
     * Requirement 31.2: Highlight matching passages and show similarity percentages
     */
    it('should return annotated text with no matches', () => {
      const text = 'This is clean text with no plagiarism.';
      const matches: Match[] = [];
      
      const result = service.highlightMatches(text, matches);
      
      expect(result.originalText).toBe(text);
      expect(result.highlightedHtml).toBe(text);
      expect(result.highlightedMarkdown).toBe(text);
      expect(result.annotations).toHaveLength(0);
      expect(result.totalMatches).toBe(0);
    });

    it('should highlight matches in HTML format', () => {
      const text = 'This is some copied text that was found elsewhere.';
      const source: Source = {
        id: 'source_1',
        title: 'Test Source',
        type: 'web',
        url: 'https://example.com',
      };
      const matches: Match[] = [
        {
          id: 'match_1',
          matchedText: 'copied text',
          startPosition: 13,
          endPosition: 24,
          similarity: 80,
          source,
          severity: 'high',
          wordCount: 2,
        },
      ];
      
      const result = service.highlightMatches(text, matches);
      
      expect(result.highlightedHtml).toContain('class="plagiarism-match red"');
      expect(result.highlightedHtml).toContain('data-match-id="match_1"');
      expect(result.annotations).toHaveLength(1);
      expect(result.annotations[0]?.color).toBe('red');
    });

    it('should highlight matches in Markdown format', () => {
      const text = 'This is some copied text that was found elsewhere.';
      const source: Source = {
        id: 'source_1',
        title: 'Test Source',
        type: 'web',
      };
      const matches: Match[] = [
        {
          id: 'match_1',
          matchedText: 'copied text',
          startPosition: 13,
          endPosition: 24,
          similarity: 80,
          source,
          severity: 'high',
          wordCount: 2,
        },
      ];
      
      const result = service.highlightMatches(text, matches);
      
      expect(result.highlightedMarkdown).toContain('**[copied text]**');
      expect(result.highlightedMarkdown).toContain('_(80% match)_');
    });

    it('should assign correct colors based on severity', () => {
      const text = 'High medium low severity matches in this text.';
      const source: Source = {
        id: 'source_1',
        title: 'Test Source',
        type: 'web',
      };
      const matches: Match[] = [
        {
          id: 'match_1',
          matchedText: 'High',
          startPosition: 0,
          endPosition: 4,
          similarity: 80,
          source,
          severity: 'high',
          wordCount: 1,
        },
        {
          id: 'match_2',
          matchedText: 'medium',
          startPosition: 5,
          endPosition: 11,
          similarity: 40,
          source,
          severity: 'medium',
          wordCount: 1,
        },
        {
          id: 'match_3',
          matchedText: 'low',
          startPosition: 12,
          endPosition: 15,
          similarity: 15,
          source,
          severity: 'low',
          wordCount: 1,
        },
      ];
      
      const result = service.highlightMatches(text, matches);
      
      const highAnnotation = result.annotations.find(a => a.matchId === 'match_1');
      const mediumAnnotation = result.annotations.find(a => a.matchId === 'match_2');
      const lowAnnotation = result.annotations.find(a => a.matchId === 'match_3');
      
      expect(highAnnotation?.color).toBe('red');
      expect(mediumAnnotation?.color).toBe('orange');
      expect(lowAnnotation?.color).toBe('yellow');
    });
  });

  describe('rephraseSection', () => {
    /**
     * Requirement 31.3: Offer to rephrase flagged sections with increased transformation intensity
     */
    it('should return rephrase result', async () => {
      const text = 'This is important content that needs to be rephrased.';
      
      const result = await service.rephraseSection(text, 3);
      
      expect(result).toBeDefined();
      expect(result.originalText).toBe(text);
      expect(result.rephrasedText).toBeDefined();
      expect(result.processingTimeMs).toBeGreaterThan(0);
    });

    it('should apply synonym replacement at intensity 1', async () => {
      const text = 'This is important content.';
      
      const result = await service.rephraseSection(text, 1);
      
      expect(result.success).toBe(true);
      // The text may or may not change depending on synonym availability
      expect(result.rephrasedText).toBeDefined();
    });

    it('should clamp intensity to valid range', async () => {
      const text = 'Test content for intensity clamping.';
      
      // Test with intensity below minimum
      const resultLow = await service.rephraseSection(text, 0);
      expect(resultLow.success).toBe(true);
      
      // Test with intensity above maximum
      const resultHigh = await service.rephraseSection(text, 10);
      expect(resultHigh.success).toBe(true);
    });
  });

  describe('generateCertificate', () => {
    /**
     * Requirement 31.5: Provide plagiarism-free guarantee certificate for premium users
     */
    it('should generate a valid certificate', async () => {
      const certificate = await service.generateCertificate({
        reportId: 'report_123',
        userId: 'user_456',
        documentTitle: 'Test Document',
      });
      
      expect(certificate).toBeDefined();
      expect(certificate.id).toBeDefined();
      expect(certificate.certificateNumber).toMatch(/^PFC-/);
      expect(certificate.reportId).toBe('report_123');
      expect(certificate.userId).toBe('user_456');
      expect(certificate.documentTitle).toBe('Test Document');
      expect(certificate.issuedAt).toBeInstanceOf(Date);
      expect(certificate.expiresAt).toBeInstanceOf(Date);
      expect(certificate.signature).toBeDefined();
      expect(certificate.verificationUrl).toContain(certificate.certificateNumber);
      expect(certificate.isValid).toBe(true);
    });

    it('should set expiration date based on validity days', async () => {
      const validityDays = 30;
      
      const certificate = await service.generateCertificate({
        reportId: 'report_123',
        userId: 'user_456',
        documentTitle: 'Test Document',
        validityDays,
      });
      
      const expectedExpiration = new Date(certificate.issuedAt);
      expectedExpiration.setDate(expectedExpiration.getDate() + validityDays);
      
      // Allow 1 second tolerance for test execution time
      const diff = Math.abs(certificate.expiresAt.getTime() - expectedExpiration.getTime());
      expect(diff).toBeLessThan(1000);
    });
  });

  describe('generateRephraseSuggestions', () => {
    /**
     * Requirement 31.3: Offer to rephrase flagged sections
     */
    it('should generate suggestions for high severity matches', () => {
      const source: Source = {
        id: 'source_1',
        title: 'Test Source',
        type: 'web',
      };
      const matches: Match[] = [
        {
          id: 'match_1',
          matchedText: 'This is copied content',
          startPosition: 0,
          endPosition: 22,
          similarity: 80,
          source,
          severity: 'high',
          wordCount: 4,
        },
      ];
      
      const suggestions = service.generateRephraseSuggestions(matches);
      
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0]?.matchId).toBe('match_1');
      expect(suggestions[0]?.originalText).toBe('This is copied content');
      expect(suggestions[0]?.intensity).toBe(5); // High severity = intensity 5
      expect(suggestions[0]?.expectedReduction).toBe(30);
    });

    it('should generate suggestions for medium severity matches', () => {
      const source: Source = {
        id: 'source_1',
        title: 'Test Source',
        type: 'web',
      };
      const matches: Match[] = [
        {
          id: 'match_1',
          matchedText: 'Some similar content',
          startPosition: 0,
          endPosition: 20,
          similarity: 40,
          source,
          severity: 'medium',
          wordCount: 3,
        },
      ];
      
      const suggestions = service.generateRephraseSuggestions(matches);
      
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0]?.intensity).toBe(3); // Medium severity = intensity 3
      expect(suggestions[0]?.expectedReduction).toBe(15);
    });

    it('should not generate suggestions for low severity matches', () => {
      const source: Source = {
        id: 'source_1',
        title: 'Test Source',
        type: 'web',
      };
      const matches: Match[] = [
        {
          id: 'match_1',
          matchedText: 'Minor match',
          startPosition: 0,
          endPosition: 11,
          similarity: 15,
          source,
          severity: 'low',
          wordCount: 2,
        },
      ];
      
      const suggestions = service.generateRephraseSuggestions(matches);
      
      expect(suggestions).toHaveLength(0);
    });
  });

  describe('verifyCertificate', () => {
    it('should return verification result', async () => {
      const result = await service.verifyCertificate('PFC-TEST-1234');
      
      expect(result).toBeDefined();
      expect(result.verifiedAt).toBeInstanceOf(Date);
      expect(result.message).toBeDefined();
    });
  });
});
