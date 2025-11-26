/**
 * Text Analysis Module Tests
 * Tests for language detection, document parsing, metrics calculation,
 * and protected segment identification.
 */

import { describe, it, expect } from 'vitest';
import { TextAnalyzer, analyzeText } from './text-analyzer';
import { detectLanguage, isLanguageSupported, getSupportedLanguages } from './language-detector';
import { parseDocument, extractSentences, countWords } from './document-parser';
import {
  calculateMetrics,
  calculateBurstiness,
  calculateLexicalDiversity,
} from './metrics-calculator';
import {
  parseProtectedSegments,
  extractWithPlaceholders,
  restoreProtectedSegments,
  validateProtectedSegments,
} from './protected-segment-parser';

describe('Language Detection', () => {
  it('should detect English text', () => {
    const text = 'This is a sample English text that should be detected correctly by the language detector.';
    const result = detectLanguage(text);
    
    expect(result.language).toBe('en');
    expect(result.isSupported).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('should detect Spanish text', () => {
    const text = 'Este es un texto de ejemplo en español que debería ser detectado correctamente.';
    const result = detectLanguage(text);
    
    expect(result.language).toBe('es');
    expect(result.isSupported).toBe(true);
  });

  it('should return unknown for very short text', () => {
    const text = 'Hi';
    const result = detectLanguage(text);
    
    expect(result.language).toBe('unknown');
    expect(result.confidence).toBe(0);
  });

  it('should return supported languages list for unsupported language', () => {
    // Japanese text
    const text = 'これは日本語のテキストです。言語検出のテストに使用されます。';
    const result = detectLanguage(text);
    
    expect(result.isSupported).toBe(false);
    expect(result.supportedLanguages).toBeDefined();
    expect(result.supportedLanguages).toContain('en');
  });


  it('should check if language is supported', () => {
    expect(isLanguageSupported('en')).toBe(true);
    expect(isLanguageSupported('es')).toBe(true);
    expect(isLanguageSupported('fr')).toBe(true);
    expect(isLanguageSupported('de')).toBe(true);
    expect(isLanguageSupported('pt')).toBe(true);
    expect(isLanguageSupported('ja')).toBe(false);
    expect(isLanguageSupported('zh')).toBe(false);
  });

  it('should return list of supported languages', () => {
    const languages = getSupportedLanguages();
    
    expect(languages).toHaveLength(5);
    expect(languages.map(l => l.code)).toContain('en');
    expect(languages.find(l => l.code === 'en')?.name).toBe('English');
  });
});

describe('Document Parsing', () => {
  it('should count words correctly', () => {
    expect(countWords('Hello world')).toBe(2);
    expect(countWords('This is a test sentence.')).toBe(5);
    expect(countWords('')).toBe(0);
    expect(countWords('   ')).toBe(0);
  });

  it('should extract sentences correctly', () => {
    const text = 'This is the first sentence. This is the second sentence. And this is the third.';
    const sentences = extractSentences(text);
    
    expect(sentences.length).toBe(3);
    expect(sentences[0]).toContain('first sentence');
  });

  it('should parse plain text document structure', () => {
    const text = `Chapter 1: Introduction

This is the first paragraph with some content.

This is the second paragraph with more content.`;

    const structure = parseDocument(text);
    
    expect(structure.format).toBe('plain');
    expect(structure.paragraphCount).toBeGreaterThan(0);
    expect(structure.wordCount).toBeGreaterThan(0);
  });

  it('should detect markdown format', () => {
    const text = `# Heading 1

This is a paragraph with **bold** text.

## Heading 2

Another paragraph here.`;

    const structure = parseDocument(text);
    
    expect(structure.format).toBe('markdown');
  });

  it('should detect HTML format', () => {
    const text = `<h1>Title</h1>
<p>This is a paragraph.</p>
<p>Another paragraph.</p>`;

    const structure = parseDocument(text);
    
    expect(structure.format).toBe('html');
  });

  it('should detect chapter boundaries', () => {
    const text = `Chapter 1: The Beginning

Some content here.

Chapter 2: The Middle

More content here.`;

    const structure = parseDocument(text);
    
    expect(structure.chapterCount).toBe(2);
  });
});

describe('Metrics Calculation', () => {
  it('should calculate burstiness score', () => {
    // Varied sentence lengths should have higher burstiness
    const variedLengths = [5, 15, 3, 20, 8, 25, 4, 18];
    const uniformLengths = [10, 10, 10, 10, 10, 10, 10, 10];
    
    const variedBurstiness = calculateBurstiness(variedLengths);
    const uniformBurstiness = calculateBurstiness(uniformLengths);
    
    expect(variedBurstiness).toBeGreaterThan(uniformBurstiness);
    expect(variedBurstiness).toBeGreaterThanOrEqual(0);
    expect(variedBurstiness).toBeLessThanOrEqual(1);
  });

  it('should calculate lexical diversity', () => {
    // Text with more unique words should have higher diversity
    const diverseText = 'The quick brown fox jumps over the lazy dog near the river bank.';
    const repetitiveText = 'The the the the the the the the the the the the.';
    
    const diverseScore = calculateLexicalDiversity(diverseText);
    const repetitiveScore = calculateLexicalDiversity(repetitiveText);
    
    expect(diverseScore).toBeGreaterThan(repetitiveScore);
    expect(diverseScore).toBeGreaterThan(0);
    expect(diverseScore).toBeLessThanOrEqual(1);
  });

  it('should calculate complete metrics', () => {
    const text = `This is a short sentence. This is a much longer sentence with many more words in it. 
    Short again. Here we have another sentence that varies in length from the others.
    And finally, one more sentence to round things out nicely.`;
    
    const metrics = calculateMetrics(text);
    
    expect(metrics.perplexity).toBeGreaterThan(0);
    expect(metrics.burstiness).toBeGreaterThanOrEqual(0);
    expect(metrics.lexicalDiversity).toBeGreaterThan(0);
    expect(metrics.averageSentenceLength).toBeGreaterThan(0);
    expect(metrics.sentenceLengths.length).toBeGreaterThan(0);
  });

  it('should handle empty text', () => {
    const metrics = calculateMetrics('');
    
    expect(metrics.perplexity).toBe(0);
    expect(metrics.burstiness).toBe(0);
    expect(metrics.lexicalDiversity).toBe(0);
  });
});


describe('Protected Segment Parsing', () => {
  it('should parse protected segments with double brackets', () => {
    const text = 'This is normal text [[protected content]] and more normal text.';
    const segments = parseProtectedSegments(text);
    
    expect(segments).toHaveLength(1);
    expect(segments[0].content).toBe('protected content');
    expect(segments[0].openDelimiter).toBe('[[');
    expect(segments[0].closeDelimiter).toBe(']]');
  });

  it('should parse protected segments with curly braces', () => {
    const text = 'Normal text {{protected}} more text.';
    const segments = parseProtectedSegments(text);
    
    expect(segments).toHaveLength(1);
    expect(segments[0].content).toBe('protected');
  });

  it('should parse multiple protected segments', () => {
    const text = 'Text [[first]] middle {{second}} end.';
    const segments = parseProtectedSegments(text);
    
    expect(segments).toHaveLength(2);
    expect(segments[0].content).toBe('first');
    expect(segments[1].content).toBe('second');
  });

  it('should extract text with placeholders', () => {
    const text = 'Normal [[protected]] text.';
    const segments = parseProtectedSegments(text);
    const { processedText, placeholderMap } = extractWithPlaceholders(text, segments);
    
    expect(processedText).toContain('__PROTECTED_0__');
    expect(processedText).not.toContain('[[protected]]');
    expect(placeholderMap.size).toBe(1);
  });

  it('should restore protected segments from placeholders', () => {
    const text = 'Normal [[protected]] text.';
    const segments = parseProtectedSegments(text);
    const { processedText, placeholderMap } = extractWithPlaceholders(text, segments);
    const restored = restoreProtectedSegments(processedText, placeholderMap);
    
    expect(restored).toContain('protected');
  });

  it('should validate mismatched delimiters', () => {
    const text = 'Text [[unclosed segment here.';
    const validation = validateProtectedSegments(text);
    
    expect(validation.isValid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  it('should handle text with no protected segments', () => {
    const text = 'This is just normal text without any protected segments.';
    const segments = parseProtectedSegments(text);
    
    expect(segments).toHaveLength(0);
  });
});

describe('TextAnalyzer', () => {
  it('should perform complete analysis', () => {
    const analyzer = new TextAnalyzer();
    const text = `This is a sample text for analysis. It contains multiple sentences with varying lengths.
    Some sentences are short. Others are much longer and contain more words to create variation.
    The analyzer should detect the language, parse the structure, and calculate metrics.`;
    
    const result = analyzer.analyze(text);
    
    expect(result.isValid).toBe(true);
    expect(result.language.language).toBe('en');
    expect(result.language.isSupported).toBe(true);
    expect(result.structure.wordCount).toBeGreaterThan(0);
    expect(result.structure.sentenceCount).toBeGreaterThan(0);
    expect(result.metrics.perplexity).toBeGreaterThan(0);
    expect(result.validationErrors).toHaveLength(0);
  });

  it('should reject empty input', () => {
    const analyzer = new TextAnalyzer();
    const result = analyzer.analyze('');
    
    expect(result.isValid).toBe(false);
    expect(result.validationErrors.length).toBeGreaterThan(0);
  });

  it('should reject whitespace-only input', () => {
    const analyzer = new TextAnalyzer();
    const result = analyzer.analyze('   \n\t   ');
    
    expect(result.isValid).toBe(false);
    expect(result.validationErrors).toContain('Input text cannot be empty or whitespace-only');
  });

  it('should detect content type', () => {
    const analyzer = new TextAnalyzer();
    
    // Academic text
    const academicText = `The hypothesis was tested using empirical methods. 
    According to Smith et al. (2020), the results support the theoretical framework.
    The methodology section describes the analysis in detail.`;
    const academicResult = analyzer.analyze(academicText);
    expect(academicResult.contentType).toBe('academic');
    
    // Technical text
    const technicalText = `The API endpoint accepts JSON payloads. 
    The function implementation uses async/await patterns.
    Configure the module parameters in the configuration file.`;
    const technicalResult = analyzer.analyze(technicalText);
    expect(technicalResult.contentType).toBe('technical');
  });

  it('should use analyzeText convenience function', () => {
    const text = 'This is a simple test text for the convenience function to analyze.';
    const result = analyzeText(text);
    
    expect(result.isValid).toBe(true);
    expect(result.language.language).toBe('en');
  });

  it('should respect maxWordCount option', () => {
    const analyzer = new TextAnalyzer({ maxWordCount: 10 });
    const text = 'This is a text with more than ten words in it for testing purposes.';
    const result = analyzer.analyze(text);
    
    expect(result.isValid).toBe(false);
    expect(result.validationErrors.some(e => e.includes('exceeds maximum word count'))).toBe(true);
  });

  it('should skip metrics when option is set', () => {
    const analyzer = new TextAnalyzer({ skipMetrics: true });
    const text = 'This is a test text for skipping metrics calculation.';
    const result = analyzer.analyze(text);
    
    expect(result.metrics.perplexity).toBe(0);
    expect(result.metrics.burstiness).toBe(0);
  });

  it('should identify protected segments in analysis', () => {
    const analyzer = new TextAnalyzer();
    const text = 'Normal text [[protected term]] and more text {{another protected}}.';
    const result = analyzer.analyze(text);
    
    expect(result.protectedSegments).toHaveLength(2);
    expect(result.protectedSegments[0].content).toBe('protected term');
  });
});
