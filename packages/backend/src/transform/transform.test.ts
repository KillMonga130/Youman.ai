/**
 * Transformation Pipeline Property Tests
 * Tests for input validation, transformation processing, and correctness properties.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { createTransformationPipeline } from './transformation-pipeline';
import { TransformRequest, ProgressUpdate } from './types';
import { countWords } from '../analysis/document-parser';

/**
 * Property-Based Tests for Input Length Validation
 * **Feature: ai-humanizer, Property 1: Input length validation**
 * **Validates: Requirements 1.1, 1.4**
 *
 * Property: For any text input, the system should accept inputs from 1 to 500,000 words
 * and reject inputs of 0 words or more than 500,000 words with appropriate error messages.
 */
describe('Input Length Validation Property Tests', () => {
  // Maximum word count as per requirements (500,000 words)
  const MAX_WORD_COUNT = 500000;

  // Helper to generate text with approximately N words
  const generateTextWithWordCount = (targetWords: number): string => {
    if (targetWords <= 0) return '';
    
    // Use a mix of common words to generate realistic text
    const words = [
      'the', 'quick', 'brown', 'fox', 'jumps', 'over', 'lazy', 'dog',
      'and', 'then', 'runs', 'away', 'into', 'forest', 'where', 'it',
      'finds', 'a', 'stream', 'of', 'clear', 'water', 'flowing', 'gently',
      'through', 'trees', 'birds', 'sing', 'in', 'branches', 'above',
    ];
    
    const result: string[] = [];
    for (let i = 0; i < targetWords; i++) {
      result.push(words[i % words.length] as string);
    }
    return result.join(' ');
  };

  // Arbitrary for valid word counts (1 to a reasonable test size)
  // Note: We use smaller sizes for testing to keep tests fast
  const validWordCountArb = fc.integer({ min: 1, max: 1000 });

  // Arbitrary for empty/whitespace-only inputs
  const emptyInputArb = fc.constantFrom(
    '',
    ' ',
    '  ',
    '\t',
    '\n',
    '\r\n',
    '   \t   \n   ',
    '\t\t\t',
    '\n\n\n',
  );

  // Arbitrary for whitespace-only strings of varying lengths
  const whitespaceOnlyArb = fc.array(
    fc.constantFrom(' ', '\t', '\n', '\r'),
    { minLength: 1, maxLength: 100 }
  ).map(arr => arr.join(''));

  it('should accept valid text inputs with 1 or more words (Property 1 - valid inputs)', async () => {
    /**
     * **Feature: ai-humanizer, Property 1: Input length validation**
     * **Validates: Requirements 1.1**
     *
     * For any text with word count between 1 and 500,000 (inclusive),
     * the transformation pipeline should accept the input without throwing an error.
     */
    const pipeline = createTransformationPipeline();

    await fc.assert(
      fc.asyncProperty(validWordCountArb, async (wordCount) => {
        const text = generateTextWithWordCount(wordCount);
        const actualWordCount = countWords(text);
        
        // Ensure we generated valid text
        expect(actualWordCount).toBeGreaterThanOrEqual(1);
        expect(actualWordCount).toBeLessThanOrEqual(MAX_WORD_COUNT);

        const request: TransformRequest = {
          text,
          level: 3,
          strategy: 'professional',
        };

        // Should not throw for valid input
        const result = await pipeline.transform(request);
        
        // Verify the transformation completed successfully
        expect(result).toBeDefined();
        expect(result.humanizedText).toBeDefined();
        expect(result.humanizedText.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  it('should reject empty text inputs (Property 1 - empty rejection)', async () => {
    /**
     * **Feature: ai-humanizer, Property 1: Input length validation**
     * **Validates: Requirements 1.4**
     *
     * For any empty string input (0 words), the transformation pipeline
     * should reject the input with an appropriate error message.
     */
    const pipeline = createTransformationPipeline();

    await fc.assert(
      fc.asyncProperty(emptyInputArb, async (emptyText) => {
        const request: TransformRequest = {
          text: emptyText,
          level: 3,
          strategy: 'professional',
        };

        // Should throw an error for empty input
        await expect(pipeline.transform(request)).rejects.toThrow();
      }),
      { numRuns: 100 }
    );
  });

  it('should reject whitespace-only inputs (Property 1 - whitespace rejection)', async () => {
    /**
     * **Feature: ai-humanizer, Property 1: Input length validation**
     * **Validates: Requirements 1.4**
     *
     * For any whitespace-only string input (0 actual words),
     * the transformation pipeline should reject the input with an appropriate error message.
     */
    const pipeline = createTransformationPipeline();

    await fc.assert(
      fc.asyncProperty(whitespaceOnlyArb, async (whitespaceText) => {
        // Verify this is indeed whitespace-only
        const wordCount = countWords(whitespaceText);
        expect(wordCount).toBe(0);

        const request: TransformRequest = {
          text: whitespaceText,
          level: 3,
          strategy: 'professional',
        };

        // Should throw an error for whitespace-only input
        await expect(pipeline.transform(request)).rejects.toThrow();
      }),
      { numRuns: 100 }
    );
  });

  it('should provide clear error message for empty input (Property 1 - error message)', async () => {
    /**
     * **Feature: ai-humanizer, Property 1: Input length validation**
     * **Validates: Requirements 1.4**
     *
     * When rejecting empty or whitespace-only input, the system should
     * provide a clear, descriptive error message.
     */
    const pipeline = createTransformationPipeline();

    await fc.assert(
      fc.asyncProperty(emptyInputArb, async (emptyText) => {
        const request: TransformRequest = {
          text: emptyText,
          level: 3,
          strategy: 'professional',
        };

        try {
          await pipeline.transform(request);
          // Should not reach here
          expect.fail('Expected transform to throw an error');
        } catch (error) {
          // Error message should be descriptive
          expect(error).toBeInstanceOf(Error);
          const errorMessage = (error as Error).message.toLowerCase();
          
          // Error message should mention empty, whitespace, or invalid input
          const hasDescriptiveMessage = 
            errorMessage.includes('empty') ||
            errorMessage.includes('whitespace') ||
            errorMessage.includes('invalid') ||
            errorMessage.includes('cannot be');
          
          expect(hasDescriptiveMessage).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should correctly count words for validation (Property 1 - word counting)', () => {
    /**
     * **Feature: ai-humanizer, Property 1: Input length validation**
     * **Validates: Requirements 1.1, 1.4**
     *
     * The word counting function should correctly identify the number of words
     * in any given text, which is essential for input validation.
     */
    fc.assert(
      fc.property(validWordCountArb, (targetWordCount) => {
        const text = generateTextWithWordCount(targetWordCount);
        const actualWordCount = countWords(text);
        
        // Word count should be approximately equal to target
        // (may vary slightly due to word generation)
        expect(actualWordCount).toBeGreaterThanOrEqual(1);
        expect(actualWordCount).toBeLessThanOrEqual(targetWordCount + 1);
      }),
      { numRuns: 100 }
    );
  });

  it('should handle boundary case of exactly 1 word (Property 1 - minimum boundary)', async () => {
    /**
     * **Feature: ai-humanizer, Property 1: Input length validation**
     * **Validates: Requirements 1.1**
     *
     * The minimum valid input is 1 word. The system should accept
     * single-word inputs.
     */
    const pipeline = createTransformationPipeline();
    
    // Generate various single-word inputs
    const singleWordArb = fc.constantFrom(
      'Hello',
      'World',
      'Test',
      'Word',
      'Input',
      'Transformation',
      'Pipeline',
      'Validation',
    );

    await fc.assert(
      fc.asyncProperty(singleWordArb, async (word) => {
        const wordCount = countWords(word);
        expect(wordCount).toBe(1);

        const request: TransformRequest = {
          text: word,
          level: 3,
          strategy: 'professional',
        };

        // Should accept single word input
        const result = await pipeline.transform(request);
        expect(result).toBeDefined();
        expect(result.humanizedText).toBeDefined();
      }),
      { numRuns: 100 }
    );
  });

  it('should validate word count is within acceptable range (Property 1 - range validation)', () => {
    /**
     * **Feature: ai-humanizer, Property 1: Input length validation**
     * **Validates: Requirements 1.1**
     *
     * For any generated text, the word count should be correctly calculated
     * and fall within the expected range.
     */
    // Generate texts of various sizes
    const textSizeArb = fc.integer({ min: 1, max: 500 });

    fc.assert(
      fc.property(textSizeArb, (size) => {
        const text = generateTextWithWordCount(size);
        const wordCount = countWords(text);
        
        // Word count should be positive and within max limit
        expect(wordCount).toBeGreaterThanOrEqual(1);
        expect(wordCount).toBeLessThanOrEqual(MAX_WORD_COUNT);
        
        // Word count should be approximately what we requested
        expect(wordCount).toBeGreaterThanOrEqual(Math.floor(size * 0.9));
        expect(wordCount).toBeLessThanOrEqual(Math.ceil(size * 1.1));
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Property-Based Tests for Format Preservation
 * **Feature: ai-humanizer, Property 4: Format preservation**
 * **Validates: Requirements 1.5**
 *
 * Property: For any input text with a specific format (plain text, markdown, html),
 * the transformation should preserve that format in the output.
 */
describe('Format Preservation Property Tests', () => {
  // Helper to detect format (mirrors the implementation in document-parser.ts)
  const detectFormat = (text: string): 'plain' | 'markdown' | 'html' => {
    // Check for HTML tags
    if (/<[a-z][\s\S]*>/i.test(text)) {
      return 'html';
    }

    // Check for markdown patterns
    const markdownPatterns = [
      /^#{1,6}\s+/m, // Headers
      /\*\*[^*]+\*\*/, // Bold
      /\*[^*]+\*/, // Italic
      /\[[^\]]+\]\([^)]+\)/, // Links
      /```[\s\S]*```/, // Code blocks
    ];

    for (const pattern of markdownPatterns) {
      if (pattern.test(text)) {
        return 'markdown';
      }
    }

    return 'plain';
  };

  // Helper to check if markdown formatting elements are preserved
  const hasMarkdownFormatting = (text: string): { headers: boolean; bold: boolean; italic: boolean; links: boolean; codeBlocks: boolean } => {
    return {
      headers: /^#{1,6}\s+/m.test(text),
      bold: /\*\*[^*]+\*\*/.test(text),
      italic: /(?<!\*)\*[^*]+\*(?!\*)/.test(text),
      links: /\[[^\]]+\]\([^)]+\)/.test(text),
      codeBlocks: /```[\s\S]*```/.test(text),
    };
  };

  // Helper to check if HTML formatting elements are preserved
  const hasHtmlFormatting = (text: string): { tags: boolean; headings: boolean; paragraphs: boolean } => {
    return {
      tags: /<[a-z][\s\S]*>/i.test(text),
      headings: /<h[1-6][^>]*>[\s\S]*<\/h[1-6]>/i.test(text),
      paragraphs: /<p[^>]*>[\s\S]*<\/p>/i.test(text),
    };
  };

  // Arbitrary for plain text content (no special formatting)
  const plainTextArb = fc.array(
    fc.constantFrom(
      'The quick brown fox jumps over the lazy dog.',
      'This is a simple sentence without any special formatting.',
      'Plain text content is easy to read and understand.',
      'No markdown or HTML tags are present in this text.',
      'Just regular words and punctuation marks here.',
      'Another plain sentence for testing purposes.',
      'The transformation should preserve this format.',
      'Simple text without any special characters or markup.',
    ),
    { minLength: 2, maxLength: 5 }
  ).map(sentences => sentences.join(' '));

  // Arbitrary for markdown formatted text
  const markdownTextArb = fc.tuple(
    fc.constantFrom(
      '# Main Heading',
      '## Section Title',
      '### Subsection',
    ),
    fc.array(
      fc.constantFrom(
        'This is **bold text** in a paragraph.',
        'Here is *italic text* for emphasis.',
        'Check out [this link](https://example.com) for more info.',
        'Regular paragraph without special formatting.',
        'Another **important** point to consider.',
        'Some *emphasized* content here.',
      ),
      { minLength: 2, maxLength: 4 }
    )
  ).map(([heading, paragraphs]) => `${heading}\n\n${paragraphs.join('\n\n')}`);

  // Arbitrary for markdown with code blocks
  const markdownWithCodeArb = fc.tuple(
    fc.constantFrom('# Code Example', '## Implementation', '### Usage'),
    fc.constantFrom(
      '```javascript\nconst x = 1;\n```',
      '```typescript\nfunction test(): void {}\n```',
      '```python\ndef hello():\n    pass\n```',
    ),
    fc.constantFrom(
      'This code demonstrates the concept.',
      'The above snippet shows the implementation.',
      'Use this pattern in your projects.',
    )
  ).map(([heading, code, description]) => `${heading}\n\n${description}\n\n${code}\n\n${description}`);

  // Arbitrary for HTML formatted text
  const htmlTextArb = fc.tuple(
    fc.constantFrom(
      '<h1>Main Title</h1>',
      '<h2>Section Header</h2>',
      '<h3>Subsection</h3>',
    ),
    fc.array(
      fc.constantFrom(
        '<p>This is a paragraph with some content.</p>',
        '<p>Another paragraph for testing purposes.</p>',
        '<p>HTML formatting should be preserved.</p>',
        '<p>The transformation maintains structure.</p>',
      ),
      { minLength: 2, maxLength: 4 }
    )
  ).map(([heading, paragraphs]) => `${heading}\n${paragraphs.join('\n')}`);

  it('should preserve plain text format after transformation (Property 4)', async () => {
    /**
     * **Feature: ai-humanizer, Property 4: Format preservation**
     * **Validates: Requirements 1.5**
     *
     * For any plain text input, the transformation should output plain text
     * without introducing markdown or HTML formatting.
     */
    const pipeline = createTransformationPipeline();

    await fc.assert(
      fc.asyncProperty(plainTextArb, async (plainText) => {
        // Verify input is plain text
        const inputFormat = detectFormat(plainText);
        expect(inputFormat).toBe('plain');

        const request: TransformRequest = {
          text: plainText,
          level: 3,
          strategy: 'professional',
        };

        const result = await pipeline.transform(request);

        // Verify output format matches input format
        const outputFormat = detectFormat(result.humanizedText);
        expect(outputFormat).toBe('plain');

        // Verify no markdown or HTML was introduced
        const htmlCheck = hasHtmlFormatting(result.humanizedText);
        expect(htmlCheck.tags).toBe(false);

        // Plain text should not have markdown headers introduced
        expect(/^#{1,6}\s+/m.test(result.humanizedText)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve markdown format after transformation (Property 4)', async () => {
    /**
     * **Feature: ai-humanizer, Property 4: Format preservation**
     * **Validates: Requirements 1.5**
     *
     * For any markdown formatted input, the transformation should preserve
     * markdown formatting elements (headers, bold, italic, links).
     */
    const pipeline = createTransformationPipeline();

    await fc.assert(
      fc.asyncProperty(markdownTextArb, async (markdownText) => {
        // Verify input is markdown
        const inputFormat = detectFormat(markdownText);
        expect(inputFormat).toBe('markdown');

        // Check which markdown elements are present in input
        const inputFormatting = hasMarkdownFormatting(markdownText);

        const request: TransformRequest = {
          text: markdownText,
          level: 3,
          strategy: 'professional',
        };

        const result = await pipeline.transform(request);

        // Verify output format is still markdown
        const outputFormat = detectFormat(result.humanizedText);
        expect(outputFormat).toBe('markdown');

        // Verify markdown formatting elements are preserved
        const outputFormatting = hasMarkdownFormatting(result.humanizedText);

        // If input had headers, output should have headers
        if (inputFormatting.headers) {
          expect(outputFormatting.headers).toBe(true);
        }

        // If input had bold text, output should have bold text
        if (inputFormatting.bold) {
          expect(outputFormatting.bold).toBe(true);
        }

        // If input had italic text, output should have italic text
        if (inputFormatting.italic) {
          expect(outputFormatting.italic).toBe(true);
        }

        // If input had links, output should have links
        if (inputFormatting.links) {
          expect(outputFormatting.links).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve markdown code blocks after transformation (Property 4)', async () => {
    /**
     * **Feature: ai-humanizer, Property 4: Format preservation**
     * **Validates: Requirements 1.5**
     *
     * For any markdown input with code blocks, the transformation should
     * preserve code block formatting.
     */
    const pipeline = createTransformationPipeline();

    await fc.assert(
      fc.asyncProperty(markdownWithCodeArb, async (markdownText) => {
        // Verify input has code blocks
        const inputFormatting = hasMarkdownFormatting(markdownText);
        expect(inputFormatting.codeBlocks).toBe(true);

        const request: TransformRequest = {
          text: markdownText,
          level: 3,
          strategy: 'professional',
        };

        const result = await pipeline.transform(request);

        // Verify code blocks are preserved
        const outputFormatting = hasMarkdownFormatting(result.humanizedText);
        expect(outputFormatting.codeBlocks).toBe(true);

        // Verify the output is still detected as markdown
        const outputFormat = detectFormat(result.humanizedText);
        expect(outputFormat).toBe('markdown');
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve HTML format after transformation (Property 4)', async () => {
    /**
     * **Feature: ai-humanizer, Property 4: Format preservation**
     * **Validates: Requirements 1.5**
     *
     * For any HTML formatted input, the transformation should preserve
     * HTML structure (tags, headings, paragraphs).
     */
    const pipeline = createTransformationPipeline();

    await fc.assert(
      fc.asyncProperty(htmlTextArb, async (htmlText) => {
        // Verify input is HTML
        const inputFormat = detectFormat(htmlText);
        expect(inputFormat).toBe('html');

        // Check which HTML elements are present in input
        const inputFormatting = hasHtmlFormatting(htmlText);

        const request: TransformRequest = {
          text: htmlText,
          level: 3,
          strategy: 'professional',
        };

        const result = await pipeline.transform(request);

        // Verify output format is still HTML
        const outputFormat = detectFormat(result.humanizedText);
        expect(outputFormat).toBe('html');

        // Verify HTML formatting elements are preserved
        const outputFormatting = hasHtmlFormatting(result.humanizedText);

        // If input had HTML tags, output should have HTML tags
        if (inputFormatting.tags) {
          expect(outputFormatting.tags).toBe(true);
        }

        // If input had headings, output should have headings
        if (inputFormatting.headings) {
          expect(outputFormatting.headings).toBe(true);
        }

        // If input had paragraphs, output should have paragraphs
        if (inputFormatting.paragraphs) {
          expect(outputFormatting.paragraphs).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should not convert between formats during transformation (Property 4)', async () => {
    /**
     * **Feature: ai-humanizer, Property 4: Format preservation**
     * **Validates: Requirements 1.5**
     *
     * The transformation should never convert text from one format to another.
     * Plain text should not become markdown or HTML, and vice versa.
     */
    const pipeline = createTransformationPipeline();

    // Combined arbitrary for all format types
    const anyFormatTextArb = fc.oneof(
      plainTextArb.map(text => ({ text, expectedFormat: 'plain' as const })),
      markdownTextArb.map(text => ({ text, expectedFormat: 'markdown' as const })),
      htmlTextArb.map(text => ({ text, expectedFormat: 'html' as const })),
    );

    await fc.assert(
      fc.asyncProperty(anyFormatTextArb, async ({ text, expectedFormat }) => {
        // Verify input format matches expected
        const inputFormat = detectFormat(text);
        expect(inputFormat).toBe(expectedFormat);

        const request: TransformRequest = {
          text,
          level: 3,
          strategy: 'professional',
        };

        const result = await pipeline.transform(request);

        // Verify output format matches input format exactly
        const outputFormat = detectFormat(result.humanizedText);
        expect(outputFormat).toBe(expectedFormat);
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve format regardless of humanization level (Property 4)', async () => {
    /**
     * **Feature: ai-humanizer, Property 4: Format preservation**
     * **Validates: Requirements 1.5**
     *
     * Format preservation should work consistently across all humanization levels (1-5).
     */
    const pipeline = createTransformationPipeline();

    // Arbitrary for humanization levels
    const levelArb = fc.constantFrom(1, 2, 3, 4, 5) as fc.Arbitrary<1 | 2 | 3 | 4 | 5>;

    await fc.assert(
      fc.asyncProperty(markdownTextArb, levelArb, async (markdownText, level) => {
        const inputFormat = detectFormat(markdownText);
        expect(inputFormat).toBe('markdown');

        const request: TransformRequest = {
          text: markdownText,
          level,
          strategy: 'professional',
        };

        const result = await pipeline.transform(request);

        // Format should be preserved regardless of level
        const outputFormat = detectFormat(result.humanizedText);
        expect(outputFormat).toBe('markdown');
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve format regardless of transformation strategy (Property 4)', async () => {
    /**
     * **Feature: ai-humanizer, Property 4: Format preservation**
     * **Validates: Requirements 1.5**
     *
     * Format preservation should work consistently across all transformation strategies.
     */
    const pipeline = createTransformationPipeline();

    // Arbitrary for strategies
    const strategyArb = fc.constantFrom('casual', 'professional', 'academic') as fc.Arbitrary<'casual' | 'professional' | 'academic'>;

    await fc.assert(
      fc.asyncProperty(markdownTextArb, strategyArb, async (markdownText, strategy) => {
        const inputFormat = detectFormat(markdownText);
        expect(inputFormat).toBe('markdown');

        const request: TransformRequest = {
          text: markdownText,
          level: 3,
          strategy,
        };

        const result = await pipeline.transform(request);

        // Format should be preserved regardless of strategy
        const outputFormat = detectFormat(result.humanizedText);
        expect(outputFormat).toBe('markdown');
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Property-Based Tests for Progress Reporting
 * **Feature: ai-humanizer, Property 3: Progress reporting for large documents**
 * **Validates: Requirements 1.3**
 *
 * Property: For any document with more than 10,000 words, the system should
 * provide progress updates at least every 10,000 words during processing.
 */
describe('Progress Reporting Property Tests', () => {
  /** Progress update interval in words (as per requirements) */
  const PROGRESS_UPDATE_INTERVAL = 10000;

  // Helper to generate text with approximately N words
  const generateTextWithWordCount = (targetWords: number): string => {
    if (targetWords <= 0) return '';
    
    const words = [
      'the', 'quick', 'brown', 'fox', 'jumps', 'over', 'lazy', 'dog',
      'and', 'then', 'runs', 'away', 'into', 'forest', 'where', 'it',
      'finds', 'a', 'stream', 'of', 'clear', 'water', 'flowing', 'gently',
      'through', 'trees', 'birds', 'sing', 'in', 'branches', 'above',
    ];
    
    const result: string[] = [];
    for (let i = 0; i < targetWords; i++) {
      result.push(words[i % words.length] as string);
    }
    return result.join(' ');
  };

  // Arbitrary for word counts that should trigger progress updates (> 10,000 words)
  // Using smaller sizes for testing to keep tests fast, but still > progress interval
  const largeDocumentWordCountArb = fc.integer({ min: 10001, max: 35000 });

  it('should emit progress updates for documents larger than 10,000 words (Property 3)', async () => {
    /**
     * **Feature: ai-humanizer, Property 3: Progress reporting for large documents**
     * **Validates: Requirements 1.3**
     *
     * For any document with more than 10,000 words, the transformation pipeline
     * should provide progress updates at least every 10,000 words.
     */
    const pipeline = createTransformationPipeline({
      progressUpdateInterval: PROGRESS_UPDATE_INTERVAL,
      maxChunkSize: 5000, // Smaller chunks to ensure multiple progress updates
    });

    await fc.assert(
      fc.asyncProperty(largeDocumentWordCountArb, async (wordCount) => {
        const text = generateTextWithWordCount(wordCount);
        const actualWordCount = countWords(text);
        
        // Ensure we have a large enough document
        expect(actualWordCount).toBeGreaterThan(PROGRESS_UPDATE_INTERVAL);

        // Collect progress updates
        const progressUpdates: ProgressUpdate[] = [];
        const onProgress = (update: ProgressUpdate) => {
          progressUpdates.push(update);
        };

        const request: TransformRequest = {
          text,
          level: 3,
          strategy: 'professional',
        };

        // Transform with progress callback
        await pipeline.transform(request, onProgress);

        // Verify progress updates were emitted
        expect(progressUpdates.length).toBeGreaterThan(0);

        // Calculate expected minimum number of progress updates
        // For a document with N words, we expect at least floor(N / 10000) - 1 updates
        // (minus 1 because the last chunk might not trigger an update if it's smaller than interval)
        const expectedMinUpdates = Math.max(1, Math.floor(actualWordCount / PROGRESS_UPDATE_INTERVAL) - 1);
        
        // Count progress updates that occurred during processing phase
        const processingUpdates = progressUpdates.filter(
          update => update.status === 'processing' || update.wordsProcessed > 0
        );

        // Verify we got enough progress updates
        expect(processingUpdates.length).toBeGreaterThanOrEqual(expectedMinUpdates);
      }),
      { numRuns: 20 } // Fewer runs due to large document processing time
    );
  });

  it('should report monotonically increasing progress (Property 3 - monotonicity)', async () => {
    /**
     * **Feature: ai-humanizer, Property 3: Progress reporting for large documents**
     * **Validates: Requirements 1.3**
     *
     * Progress updates should show monotonically increasing progress values.
     * Words processed should never decrease during transformation.
     */
    const pipeline = createTransformationPipeline({
      progressUpdateInterval: PROGRESS_UPDATE_INTERVAL,
      maxChunkSize: 5000,
    });

    await fc.assert(
      fc.asyncProperty(largeDocumentWordCountArb, async (wordCount) => {
        const text = generateTextWithWordCount(wordCount);
        
        const progressUpdates: ProgressUpdate[] = [];
        const onProgress = (update: ProgressUpdate) => {
          progressUpdates.push(update);
        };

        const request: TransformRequest = {
          text,
          level: 3,
          strategy: 'professional',
        };

        await pipeline.transform(request, onProgress);

        // Verify monotonically increasing progress
        for (let i = 1; i < progressUpdates.length; i++) {
          const prev = progressUpdates[i - 1];
          const curr = progressUpdates[i];
          
          if (prev && curr) {
            // Words processed should never decrease
            expect(curr.wordsProcessed).toBeGreaterThanOrEqual(prev.wordsProcessed);
            
            // Progress percentage should never decrease
            expect(curr.progress).toBeGreaterThanOrEqual(prev.progress);
            
            // Current chunk should never decrease
            expect(curr.currentChunk).toBeGreaterThanOrEqual(prev.currentChunk);
          }
        }
      }),
      { numRuns: 20 }
    );
  });

  it('should include required fields in progress updates (Property 3 - completeness)', async () => {
    /**
     * **Feature: ai-humanizer, Property 3: Progress reporting for large documents**
     * **Validates: Requirements 1.3**
     *
     * Each progress update should contain all required fields:
     * jobId, status, progress, currentChunk, totalChunks, wordsProcessed, totalWords, phase, timestamp
     */
    const pipeline = createTransformationPipeline({
      progressUpdateInterval: PROGRESS_UPDATE_INTERVAL,
      maxChunkSize: 5000,
    });

    await fc.assert(
      fc.asyncProperty(largeDocumentWordCountArb, async (wordCount) => {
        const text = generateTextWithWordCount(wordCount);
        
        const progressUpdates: ProgressUpdate[] = [];
        const onProgress = (update: ProgressUpdate) => {
          progressUpdates.push(update);
        };

        const request: TransformRequest = {
          text,
          level: 3,
          strategy: 'professional',
        };

        await pipeline.transform(request, onProgress);

        // Verify each progress update has all required fields
        for (const update of progressUpdates) {
          expect(update.jobId).toBeDefined();
          expect(typeof update.jobId).toBe('string');
          
          expect(update.status).toBeDefined();
          expect(['pending', 'analyzing', 'chunking', 'processing', 'assembling', 'completed', 'failed', 'paused', 'cancelled']).toContain(update.status);
          
          expect(update.progress).toBeDefined();
          expect(typeof update.progress).toBe('number');
          expect(update.progress).toBeGreaterThanOrEqual(0);
          expect(update.progress).toBeLessThanOrEqual(100);
          
          expect(update.currentChunk).toBeDefined();
          expect(typeof update.currentChunk).toBe('number');
          expect(update.currentChunk).toBeGreaterThanOrEqual(0);
          
          expect(update.totalChunks).toBeDefined();
          expect(typeof update.totalChunks).toBe('number');
          expect(update.totalChunks).toBeGreaterThan(0);
          
          expect(update.wordsProcessed).toBeDefined();
          expect(typeof update.wordsProcessed).toBe('number');
          expect(update.wordsProcessed).toBeGreaterThanOrEqual(0);
          
          expect(update.totalWords).toBeDefined();
          expect(typeof update.totalWords).toBe('number');
          expect(update.totalWords).toBeGreaterThan(0);
          
          expect(update.phase).toBeDefined();
          expect(typeof update.phase).toBe('string');
          
          expect(update.timestamp).toBeDefined();
          expect(update.timestamp).toBeInstanceOf(Date);
        }
      }),
      { numRuns: 20 }
    );
  });

  it('should report final progress as 100% on completion (Property 3 - completion)', async () => {
    /**
     * **Feature: ai-humanizer, Property 3: Progress reporting for large documents**
     * **Validates: Requirements 1.3**
     *
     * When transformation completes successfully, the final progress update
     * should indicate 100% completion with status 'completed'.
     */
    const pipeline = createTransformationPipeline({
      progressUpdateInterval: PROGRESS_UPDATE_INTERVAL,
      maxChunkSize: 5000,
    });

    await fc.assert(
      fc.asyncProperty(largeDocumentWordCountArb, async (wordCount) => {
        const text = generateTextWithWordCount(wordCount);
        
        const progressUpdates: ProgressUpdate[] = [];
        const onProgress = (update: ProgressUpdate) => {
          progressUpdates.push(update);
        };

        const request: TransformRequest = {
          text,
          level: 3,
          strategy: 'professional',
        };

        await pipeline.transform(request, onProgress);

        // Find the final progress update
        const finalUpdate = progressUpdates[progressUpdates.length - 1];
        
        expect(finalUpdate).toBeDefined();
        expect(finalUpdate?.status).toBe('completed');
        expect(finalUpdate?.progress).toBe(100);
        expect(finalUpdate?.wordsProcessed).toBe(finalUpdate?.totalWords);
        expect(finalUpdate?.currentChunk).toBe(finalUpdate?.totalChunks);
      }),
      { numRuns: 20 }
    );
  });
});
