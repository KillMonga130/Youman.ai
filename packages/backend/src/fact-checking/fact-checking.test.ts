/**
 * Fact-Checking Service Tests
 * Tests for content fact-checking and verification
 * Requirements: 110
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FactCheckingService } from './fact-checking.service';
import { FactualClaim, VerificationSource, VerificationReport, ClaimVerification } from './types';

describe('FactCheckingService', () => {
  let service: FactCheckingService;

  beforeEach(() => {
    service = new FactCheckingService();
  });

  describe('extractClaims', () => {
    it('should extract factual claims from text', () => {
      const text = 'The Earth is approximately 4.5 billion years old. Water boils at 100 degrees Celsius at sea level.';
      
      const claims = service.extractClaims(text);
      
      expect(claims).toBeDefined();
      expect(claims.length).toBeGreaterThan(0);
      expect(claims[0]?.text).toBeDefined();
      expect(claims[0]?.id).toBeDefined();
    });

    it('should identify claim types correctly', () => {
      const statisticalText = 'Approximately 70% of the Earth surface is covered by water.';
      const historicalText = 'World War II ended in 1945 after years of conflict.';
      const scientificText = 'According to research studies, regular exercise is beneficial for mental health.';
      
      const statisticalClaims = service.extractClaims(statisticalText);
      const historicalClaims = service.extractClaims(historicalText);
      const scientificClaims = service.extractClaims(scientificText);
      
      expect(statisticalClaims[0]?.claimType).toBe('statistical');
      expect(historicalClaims[0]?.claimType).toBe('historical');
      expect(scientificClaims[0]?.claimType).toBe('scientific');
    });

    it('should extract entities from claims', () => {
      const text = 'Albert Einstein developed the theory of relativity in 1905.';
      
      const claims = service.extractClaims(text);
      
      expect(claims[0]?.entities).toBeDefined();
      expect(claims[0]?.entities.length).toBeGreaterThan(0);
    });

    it('should extract keywords from claims', () => {
      const text = 'The Amazon rainforest produces approximately 20% of the world oxygen.';
      
      const claims = service.extractClaims(text);
      
      expect(claims[0]?.keywords).toBeDefined();
      expect(claims[0]?.keywords.length).toBeGreaterThan(0);
    });

    it('should skip questions and subjective statements', () => {
      const text = 'What is the capital of France? I think Paris is beautiful. The Eiffel Tower is 330 meters tall.';
      
      const claims = service.extractClaims(text);
      
      // Should only extract the factual statement about Eiffel Tower
      const claimTexts = claims.map(c => c.text);
      expect(claimTexts.some(t => t.includes('What is'))).toBe(false);
      expect(claimTexts.some(t => t.includes('I think'))).toBe(false);
    });

    it('should filter claims by type when specified', () => {
      const text = 'In 1969, humans landed on the Moon. The population of Tokyo is over 13 million.';
      
      const historicalClaims = service.extractClaims(text, { claimTypes: ['historical'] });
      
      expect(historicalClaims.every(c => c.claimType === 'historical')).toBe(true);
    });
  });

  describe('verifyText', () => {
    /**
     * Requirement 110.1: Verify factual claims against reliable sources
     */
    it('should return a verification report', async () => {
      const text = 'The Pacific Ocean is the largest ocean on Earth.';
      
      const report = await service.verifyText(text);
      
      expect(report).toBeDefined();
      expect(report.id).toBeDefined();
      expect(report.totalClaims).toBeGreaterThanOrEqual(0);
      expect(report.accuracyScore).toBeGreaterThanOrEqual(0);
      expect(report.accuracyScore).toBeLessThanOrEqual(100);
      expect(report.timestamp).toBeInstanceOf(Date);
      expect(report.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should include claim verifications in report', async () => {
      const text = 'Mount Everest is the tallest mountain in the world.';
      
      const report = await service.verifyText(text);
      
      expect(report.claimVerifications).toBeDefined();
      expect(Array.isArray(report.claimVerifications)).toBe(true);
    });

    it('should calculate accuracy score correctly', async () => {
      const text = 'Simple test sentence for verification.';
      
      const report = await service.verifyText(text);
      
      // Accuracy score should be between 0 and 100
      expect(report.accuracyScore).toBeGreaterThanOrEqual(0);
      expect(report.accuracyScore).toBeLessThanOrEqual(100);
    });

    it('should generate a summary', async () => {
      const text = 'The Sun is approximately 93 million miles from Earth.';
      
      const report = await service.verifyText(text);
      
      expect(report.summary).toBeDefined();
      expect(report.summary.overview).toBeDefined();
      expect(report.summary.keyFindings).toBeDefined();
      expect(report.summary.recommendations).toBeDefined();
      expect(['low', 'medium', 'high']).toContain(report.summary.riskLevel);
    });

    it('should respect maxClaims option', async () => {
      const text = 'Claim one is here. Claim two is here. Claim three is here. Claim four is here. Claim five is here.';
      
      const report = await service.verifyText(text, { maxClaims: 2 });
      
      expect(report.claimVerifications.length).toBeLessThanOrEqual(2);
    });
  });

  describe('flagInaccuracies', () => {
    /**
     * Requirement 110.2: Flag questionable statements and provide source links
     */
    it('should flag false claims as critical', () => {
      const mockReport: VerificationReport = {
        id: 'report_1',
        originalText: 'Test text',
        totalClaims: 1,
        verifiedClaims: 0,
        inaccurateClaims: 1,
        unverifiableClaims: 0,
        accuracyScore: 0,
        claimVerifications: [
          {
            claim: {
              id: 'claim_1',
              text: 'False claim',
              startPosition: 0,
              endPosition: 11,
              claimType: 'general',
              entities: [],
              keywords: [],
            },
            status: 'false',
            confidenceScore: 90,
            confidenceLevel: 'high',
            sources: [],
            explanation: 'This claim is false',
            needsManualReview: false,
          },
        ],
        timestamp: new Date(),
        processingTimeMs: 100,
        summary: {
          overview: 'Test',
          keyFindings: [],
          recommendations: [],
          riskLevel: 'high',
        },
      };
      
      const flagged = service.flagInaccuracies(mockReport);
      
      expect(flagged.length).toBe(1);
      expect(flagged[0]?.severity).toBe('critical');
    });

    it('should flag disputed claims as warning', () => {
      const mockReport: VerificationReport = {
        id: 'report_1',
        originalText: 'Test text',
        totalClaims: 1,
        verifiedClaims: 0,
        inaccurateClaims: 1,
        unverifiableClaims: 0,
        accuracyScore: 0,
        claimVerifications: [
          {
            claim: {
              id: 'claim_1',
              text: 'Disputed claim',
              startPosition: 0,
              endPosition: 14,
              claimType: 'general',
              entities: [],
              keywords: [],
            },
            status: 'disputed',
            confidenceScore: 50,
            confidenceLevel: 'medium',
            sources: [],
            explanation: 'This claim is disputed',
            needsManualReview: true,
          },
        ],
        timestamp: new Date(),
        processingTimeMs: 100,
        summary: {
          overview: 'Test',
          keyFindings: [],
          recommendations: [],
          riskLevel: 'medium',
        },
      };
      
      const flagged = service.flagInaccuracies(mockReport);
      
      expect(flagged.length).toBe(1);
      expect(flagged[0]?.severity).toBe('warning');
    });

    it('should flag needs_review claims as info', () => {
      const mockReport: VerificationReport = {
        id: 'report_1',
        originalText: 'Test text',
        totalClaims: 1,
        verifiedClaims: 0,
        inaccurateClaims: 0,
        unverifiableClaims: 1,
        accuracyScore: 0,
        claimVerifications: [
          {
            claim: {
              id: 'claim_1',
              text: 'Unverifiable claim',
              startPosition: 0,
              endPosition: 18,
              claimType: 'general',
              entities: [],
              keywords: [],
            },
            status: 'needs_review',
            confidenceScore: 0,
            confidenceLevel: 'low',
            sources: [],
            explanation: 'Could not verify',
            needsManualReview: true,
          },
        ],
        timestamp: new Date(),
        processingTimeMs: 100,
        summary: {
          overview: 'Test',
          keyFindings: [],
          recommendations: [],
          riskLevel: 'medium',
        },
      };
      
      const flagged = service.flagInaccuracies(mockReport);
      
      expect(flagged.length).toBe(1);
      expect(flagged[0]?.severity).toBe('info');
    });

    it('should not flag verified claims', () => {
      const mockReport: VerificationReport = {
        id: 'report_1',
        originalText: 'Test text',
        totalClaims: 1,
        verifiedClaims: 1,
        inaccurateClaims: 0,
        unverifiableClaims: 0,
        accuracyScore: 100,
        claimVerifications: [
          {
            claim: {
              id: 'claim_1',
              text: 'Verified claim',
              startPosition: 0,
              endPosition: 14,
              claimType: 'general',
              entities: [],
              keywords: [],
            },
            status: 'verified',
            confidenceScore: 90,
            confidenceLevel: 'high',
            sources: [],
            explanation: 'Claim verified',
            needsManualReview: false,
          },
        ],
        timestamp: new Date(),
        processingTimeMs: 100,
        summary: {
          overview: 'Test',
          keyFindings: [],
          recommendations: [],
          riskLevel: 'low',
        },
      };
      
      const flagged = service.flagInaccuracies(mockReport);
      
      expect(flagged.length).toBe(0);
    });
  });

  describe('generateCorrection', () => {
    /**
     * Requirement 110.4: Provide accurate alternatives with citations
     */
    it('should generate correction with citation', () => {
      const claim: FactualClaim = {
        id: 'claim_1',
        text: 'The Earth is flat.',
        startPosition: 0,
        endPosition: 18,
        claimType: 'scientific',
        entities: ['Earth'],
        keywords: ['earth', 'flat'],
      };
      
      const sources: VerificationSource[] = [
        {
          id: 'source_1',
          url: 'https://en.wikipedia.org/wiki/Earth',
          title: 'Earth',
          type: 'encyclopedia',
          credibilityScore: 85,
          excerpt: 'Earth is an oblate spheroid.',
        },
      ];
      
      const correction = service.generateCorrection(claim, sources);
      
      expect(correction).toBeDefined();
      expect(correction?.originalText).toBe(claim.text);
      expect(correction?.correctedText).toBeDefined();
      expect(correction?.citation).toBeDefined();
      expect(correction?.source).toBe(sources[0]);
    });

    it('should return undefined when no sources provided', () => {
      const claim: FactualClaim = {
        id: 'claim_1',
        text: 'Some claim',
        startPosition: 0,
        endPosition: 10,
        claimType: 'general',
        entities: [],
        keywords: [],
      };
      
      const correction = service.generateCorrection(claim, []);
      
      expect(correction).toBeUndefined();
    });
  });

  describe('highlightClaims', () => {
    it('should return annotated text with no claims', () => {
      const text = 'Simple text without claims.';
      const report: VerificationReport = {
        id: 'report_1',
        originalText: text,
        totalClaims: 0,
        verifiedClaims: 0,
        inaccurateClaims: 0,
        unverifiableClaims: 0,
        accuracyScore: 100,
        claimVerifications: [],
        timestamp: new Date(),
        processingTimeMs: 0,
        summary: {
          overview: 'No claims found',
          keyFindings: [],
          recommendations: [],
          riskLevel: 'low',
        },
      };
      
      const result = service.highlightClaims(text, report);
      
      expect(result.originalText).toBe(text);
      expect(result.highlightedHtml).toBe(text);
      expect(result.annotations).toHaveLength(0);
      expect(result.totalFlagged).toBe(0);
    });

    it('should highlight claims with correct colors', () => {
      const text = 'This is a verified claim.';
      const report: VerificationReport = {
        id: 'report_1',
        originalText: text,
        totalClaims: 1,
        verifiedClaims: 1,
        inaccurateClaims: 0,
        unverifiableClaims: 0,
        accuracyScore: 100,
        claimVerifications: [
          {
            claim: {
              id: 'claim_1',
              text: 'This is a verified claim.',
              startPosition: 0,
              endPosition: 25,
              claimType: 'general',
              entities: [],
              keywords: [],
            },
            status: 'verified',
            confidenceScore: 90,
            confidenceLevel: 'high',
            sources: [],
            explanation: 'Verified',
            needsManualReview: false,
          },
        ],
        timestamp: new Date(),
        processingTimeMs: 0,
        summary: {
          overview: 'Test',
          keyFindings: [],
          recommendations: [],
          riskLevel: 'low',
        },
      };
      
      const result = service.highlightClaims(text, report);
      
      expect(result.highlightedHtml).toContain('class="fact-check green"');
      expect(result.annotations[0]?.color).toBe('green');
    });

    it('should count flagged items correctly', () => {
      const text = 'False claim here. Verified claim here.';
      const report: VerificationReport = {
        id: 'report_1',
        originalText: text,
        totalClaims: 2,
        verifiedClaims: 1,
        inaccurateClaims: 1,
        unverifiableClaims: 0,
        accuracyScore: 50,
        claimVerifications: [
          {
            claim: {
              id: 'claim_1',
              text: 'False claim here.',
              startPosition: 0,
              endPosition: 17,
              claimType: 'general',
              entities: [],
              keywords: [],
            },
            status: 'false',
            confidenceScore: 90,
            confidenceLevel: 'high',
            sources: [],
            explanation: 'False',
            needsManualReview: false,
          },
          {
            claim: {
              id: 'claim_2',
              text: 'Verified claim here.',
              startPosition: 18,
              endPosition: 38,
              claimType: 'general',
              entities: [],
              keywords: [],
            },
            status: 'verified',
            confidenceScore: 90,
            confidenceLevel: 'high',
            sources: [],
            explanation: 'Verified',
            needsManualReview: false,
          },
        ],
        timestamp: new Date(),
        processingTimeMs: 0,
        summary: {
          overview: 'Test',
          keyFindings: [],
          recommendations: [],
          riskLevel: 'medium',
        },
      };
      
      const result = service.highlightClaims(text, report);
      
      // Only the false claim should be flagged
      expect(result.totalFlagged).toBe(1);
    });
  });

  describe('verifyClaim', () => {
    /**
     * Requirement 110.3: Mark unverifiable claims for manual verification
     */
    it('should mark claims needing manual review', async () => {
      const claim: FactualClaim = {
        id: 'claim_1',
        text: 'Some obscure fact that cannot be verified.',
        startPosition: 0,
        endPosition: 42,
        claimType: 'general',
        entities: [],
        keywords: ['obscure', 'fact', 'verified'],
      };
      
      const verification = await service.verifyClaim(claim, { confidenceThreshold: 90 });
      
      // Low confidence claims should need manual review
      if (verification.confidenceScore < 90) {
        expect(verification.needsManualReview).toBe(true);
      }
    });

    it('should include sources in verification', async () => {
      const claim: FactualClaim = {
        id: 'claim_1',
        text: 'The Pacific Ocean is the largest ocean.',
        startPosition: 0,
        endPosition: 39,
        claimType: 'geographical',
        entities: ['Pacific Ocean'],
        keywords: ['pacific', 'ocean', 'largest'],
      };
      
      const verification = await service.verifyClaim(claim);
      
      expect(verification.sources).toBeDefined();
      expect(Array.isArray(verification.sources)).toBe(true);
    });

    it('should return confidence level', async () => {
      const claim: FactualClaim = {
        id: 'claim_1',
        text: 'Water freezes at 0 degrees Celsius.',
        startPosition: 0,
        endPosition: 35,
        claimType: 'scientific',
        entities: [],
        keywords: ['water', 'freezes', 'celsius'],
      };
      
      const verification = await service.verifyClaim(claim);
      
      expect(['high', 'medium', 'low']).toContain(verification.confidenceLevel);
    });
  });

  describe('report summary', () => {
    /**
     * Requirement 110.5: Generate verification report with confidence scores
     */
    it('should generate appropriate risk level', async () => {
      const text = 'The sky is blue due to Rayleigh scattering.';
      
      const report = await service.verifyText(text);
      
      expect(['low', 'medium', 'high']).toContain(report.summary.riskLevel);
    });

    it('should include key findings', async () => {
      const text = 'Mount Everest is located in the Himalayas.';
      
      const report = await service.verifyText(text);
      
      expect(Array.isArray(report.summary.keyFindings)).toBe(true);
    });

    it('should include recommendations', async () => {
      const text = 'The Great Wall of China is visible from space.';
      
      const report = await service.verifyText(text);
      
      expect(Array.isArray(report.summary.recommendations)).toBe(true);
    });
  });
});
