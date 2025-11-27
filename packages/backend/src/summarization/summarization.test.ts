/**
 * Summarization Service Tests
 * Tests for extractive, abstractive summarization and humanization
 * Requirements: 78
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SummarizationService } from './summarization.service';

describe('SummarizationService', () => {
  let service: SummarizationService;

  // Sample texts for testing
  const sampleText = `
    Artificial intelligence has transformed the way we interact with technology. 
    Machine learning algorithms can now recognize patterns in data that humans might miss. 
    Natural language processing enables computers to understand and generate human language. 
    Deep learning networks have achieved remarkable results in image recognition tasks. 
    The field continues to evolve rapidly with new breakthroughs announced regularly. 
    Researchers are working on making AI systems more transparent and explainable. 
    Ethical considerations around AI deployment are becoming increasingly important. 
    Companies are investing billions of dollars in AI research and development. 
    The impact of AI on employment and society is a topic of ongoing debate. 
    Future applications of AI could revolutionize healthcare, transportation, and education.
  `.trim();

  const longText = `
    The history of computing spans several decades of remarkable innovation and progress. 
    Early computers were massive machines that filled entire rooms and required specialized operators. 
    The invention of the transistor in 1947 marked a turning point in computing history. 
    Transistors replaced vacuum tubes, making computers smaller, faster, and more reliable. 
    The development of integrated circuits further miniaturized computing components. 
    Personal computers emerged in the 1970s, bringing computing power to homes and offices. 
    The graphical user interface made computers accessible to non-technical users. 
    The internet connected computers worldwide, enabling unprecedented information sharing. 
    Mobile computing put powerful devices in everyone's pockets. 
    Cloud computing shifted processing and storage to remote data centers. 
    Quantum computing promises to solve problems beyond classical computer capabilities. 
    The evolution of computing continues to accelerate with each passing year. 
    New paradigms like edge computing are emerging to meet modern demands. 
    Artificial intelligence is becoming increasingly integrated into computing systems. 
    The future of computing holds exciting possibilities we can only begin to imagine.
  `.trim();

  beforeEach(() => {
    service = new SummarizationService();
  });

  describe('summarize', () => {
    it('should summarize text with short length', async () => {
      const result = await service.summarize({
        text: sampleText,
        length: 'short',
      });

      expect(result.id).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.length).toBeGreaterThan(0);
      expect(result.summaryWordCount).toBeLessThan(result.originalWordCount);
      expect(result.compressionRatio).toBeLessThan(0.3);
      expect(result.length).toBe('short');
    });

    it('should summarize text with medium length', async () => {
      const result = await service.summarize({
        text: sampleText,
        length: 'medium',
      });

      expect(result.summary).toBeDefined();
      expect(result.compressionRatio).toBeLessThan(0.5);
      expect(result.length).toBe('medium');
    });

    it('should summarize text with long length', async () => {
      const result = await service.summarize({
        text: longText,
        length: 'long',
      });

      expect(result.summary).toBeDefined();
      expect(result.compressionRatio).toBeLessThan(0.6);
      expect(result.length).toBe('long');
    });

    it('should use extractive method when specified', async () => {
      const result = await service.summarize({
        text: sampleText,
        length: 'medium',
        method: 'extractive',
      });

      expect(result.method).toBe('extractive');
      expect(result.summary).toBeDefined();
    });

    it('should use abstractive method when specified', async () => {
      const result = await service.summarize({
        text: sampleText,
        length: 'medium',
        method: 'abstractive',
      });

      expect(result.method).toBe('abstractive');
      expect(result.summary).toBeDefined();
    });

    it('should use hybrid method by default', async () => {
      const result = await service.summarize({
        text: sampleText,
        length: 'medium',
      });

      expect(result.method).toBe('hybrid');
    });

    it('should humanize summary when requested', async () => {
      const result = await service.summarize({
        text: sampleText,
        length: 'medium',
        humanize: true,
        humanizationLevel: 3,
      });

      expect(result.wasHumanized).toBe(true);
      expect(result.humanizedSummary).toBeDefined();
    });

    it('should extract key points', async () => {
      const result = await service.summarize({
        text: sampleText,
        length: 'medium',
      });

      expect(result.keyPoints).toBeDefined();
      expect(Array.isArray(result.keyPoints)).toBe(true);
    });

    it('should include processing time', async () => {
      const result = await service.summarize({
        text: sampleText,
        length: 'medium',
      });

      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('extractiveSummarize', () => {
    it('should select specified number of sentences', async () => {
      const result = await service.extractiveSummarize({
        text: sampleText,
        sentenceCount: 3,
      });

      expect(result.sentencesIncluded).toBeLessThanOrEqual(3);
      expect(result.selectedSentences.length).toBeLessThanOrEqual(3);
    });

    it('should preserve sentence order by default', async () => {
      const result = await service.extractiveSummarize({
        text: sampleText,
        sentenceCount: 5,
        preserveOrder: true,
      });

      const positions = result.selectedSentences.map(s => s.position);
      const sortedPositions = [...positions].sort((a, b) => a - b);
      expect(positions).toEqual(sortedPositions);
    });

    it('should score sentences', async () => {
      const result = await service.extractiveSummarize({
        text: sampleText,
        sentenceCount: 3,
      });

      for (const sentence of result.selectedSentences) {
        expect(sentence.score).toBeGreaterThanOrEqual(0);
        expect(sentence.score).toBeLessThanOrEqual(1);
        expect(sentence.selected).toBe(true);
      }
    });

    it('should calculate compression ratio', async () => {
      const result = await service.extractiveSummarize({
        text: sampleText,
        sentenceCount: 3,
      });

      expect(result.compressionRatio).toBeGreaterThan(0);
      expect(result.compressionRatio).toBeLessThan(1);
      expect(result.summaryWordCount).toBeLessThan(result.originalWordCount);
    });

    it('should respect minimum sentence length', async () => {
      const result = await service.extractiveSummarize({
        text: sampleText,
        sentenceCount: 5,
        minSentenceLength: 10,
      });

      for (const sentence of result.selectedSentences) {
        expect(sentence.wordCount).toBeGreaterThanOrEqual(10);
      }
    });
  });

  describe('abstractiveSummarize', () => {
    it('should generate summary with target word count', async () => {
      const targetWords = 50;
      const result = await service.abstractiveSummarize({
        text: sampleText,
        wordCount: targetWords,
      });

      // Allow some flexibility in word count
      expect(result.actualWordCount).toBeLessThanOrEqual(targetWords * 1.5);
    });

    it('should extract key concepts', async () => {
      const result = await service.abstractiveSummarize({
        text: sampleText,
        wordCount: 50,
        includeKeyConcepts: true,
      });

      expect(result.keyConcepts).toBeDefined();
      expect(Array.isArray(result.keyConcepts)).toBe(true);
      expect(result.keyConcepts.length).toBeGreaterThan(0);
    });

    it('should identify themes', async () => {
      const result = await service.abstractiveSummarize({
        text: longText,
        wordCount: 100,
      });

      expect(result.themes).toBeDefined();
      expect(Array.isArray(result.themes)).toBe(true);
    });

    it('should apply formal style', async () => {
      const result = await service.abstractiveSummarize({
        text: sampleText,
        wordCount: 50,
        style: 'formal',
      });

      expect(result.summary).toBeDefined();
    });

    it('should apply casual style', async () => {
      const result = await service.abstractiveSummarize({
        text: sampleText,
        wordCount: 50,
        style: 'casual',
      });

      expect(result.summary).toBeDefined();
    });
  });

  describe('humanizeSummary', () => {
    const testSummary = 'Artificial intelligence has transformed technology. Machine learning can recognize patterns. Natural language processing enables computers to understand language.';

    it('should humanize summary at level 1', async () => {
      const result = await service.humanizeSummary({
        summary: testSummary,
        level: 1,
      });

      expect(result.humanizedSummary).toBeDefined();
      expect(result.levelApplied).toBe(1);
    });

    it('should humanize summary at level 3', async () => {
      const result = await service.humanizeSummary({
        summary: testSummary,
        level: 3,
      });

      expect(result.humanizedSummary).toBeDefined();
      expect(result.levelApplied).toBe(3);
    });

    it('should humanize summary at level 5', async () => {
      const result = await service.humanizeSummary({
        summary: testSummary,
        level: 5,
      });

      expect(result.humanizedSummary).toBeDefined();
      expect(result.levelApplied).toBe(5);
    });

    it('should apply contractions at higher levels', async () => {
      const summaryWithExpansions = 'It is important to note that we have made progress. They are working on new solutions.';
      
      const result = await service.humanizeSummary({
        summary: summaryWithExpansions,
        level: 3,
      });

      // Check that some contractions were applied
      expect(result.humanizedSummary).toMatch(/it's|they're|we've|don't|doesn't/i);
    });

    it('should track modifications count', async () => {
      const result = await service.humanizeSummary({
        summary: 'It is a fact that we have not seen this before. They are not ready.',
        level: 4,
      });

      expect(result.modificationsCount).toBeGreaterThanOrEqual(0);
    });

    it('should apply professional tone', async () => {
      const result = await service.humanizeSummary({
        summary: testSummary,
        level: 3,
        tone: 'professional',
      });

      expect(result.toneApplied).toBe('professional');
    });

    it('should apply casual tone', async () => {
      const result = await service.humanizeSummary({
        summary: testSummary,
        level: 3,
        tone: 'casual',
      });

      expect(result.toneApplied).toBe('casual');
    });
  });

  describe('validation', () => {
    it('should reject empty text', () => {
      const result = service.validateText('');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject whitespace-only text', () => {
      const result = service.validateText('   \n\t  ');
      expect(result.valid).toBe(false);
    });

    it('should reject text that is too short', () => {
      const result = service.validateText('Short');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least');
    });

    it('should accept valid text', () => {
      const result = service.validateText(sampleText);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('utility methods', () => {
    it('should return available lengths', () => {
      const lengths = service.getAvailableLengths();
      
      expect(lengths).toBeDefined();
      expect(Array.isArray(lengths)).toBe(true);
      expect(lengths.length).toBe(3);
      expect(lengths.map(l => l.length)).toContain('short');
      expect(lengths.map(l => l.length)).toContain('medium');
      expect(lengths.map(l => l.length)).toContain('long');
    });

    it('should return available methods', () => {
      const methods = service.getAvailableMethods();
      
      expect(methods).toBeDefined();
      expect(Array.isArray(methods)).toBe(true);
      expect(methods).toContain('extractive');
      expect(methods).toContain('abstractive');
      expect(methods).toContain('hybrid');
    });
  });

  describe('compression ratios', () => {
    it('should produce smaller summary than original', async () => {
      const result = await service.summarize({
        text: longText,
        length: 'medium',
      });

      expect(result.summaryWordCount).toBeLessThan(result.originalWordCount);
    });

    it('should have compression ratio less than 1', async () => {
      const result = await service.summarize({
        text: longText,
        length: 'short',
      });

      expect(result.compressionRatio).toBeLessThan(1);
      expect(result.compressionRatio).toBeGreaterThan(0);
    });

    it('should have lower compression ratio for short summaries', async () => {
      const shortResult = await service.summarize({
        text: longText,
        length: 'short',
      });

      const longResult = await service.summarize({
        text: longText,
        length: 'long',
      });

      expect(shortResult.compressionRatio).toBeLessThan(longResult.compressionRatio);
    });
  });
});
