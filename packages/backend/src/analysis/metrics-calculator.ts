/**
 * Metrics Calculator
 * Calculates text metrics including perplexity, burstiness, and lexical diversity.
 * Requirements: 2.1, 2.3, 2.4, 5.1-5.5
 */

import { TextMetrics } from './types';
import { extractSentences, countWords } from './document-parser';

/**
 * Calculates comprehensive text metrics
 * @param text - The text to analyze
 * @returns Text metrics including perplexity, burstiness, and lexical diversity
 */
export function calculateMetrics(text: string): TextMetrics {
  const sentences = extractSentences(text);
  const sentenceLengths = sentences.map((s) => countWords(s));

  const averageSentenceLength = calculateAverage(sentenceLengths);
  const sentenceLengthStdDev = calculateStandardDeviation(sentenceLengths);
  const burstiness = calculateBurstiness(sentenceLengths);
  const lexicalDiversity = calculateLexicalDiversity(text);
  const perplexity = calculatePerplexity(text, sentenceLengths);

  return {
    perplexity,
    burstiness,
    lexicalDiversity,
    averageSentenceLength,
    sentenceLengthStdDev,
    sentenceLengths,
  };
}

/**
 * Calculates burstiness score based on sentence length variation
 * Burstiness measures how "bursty" the sentence lengths are - 
 * higher values indicate more variation (more human-like)
 * @param sentenceLengths - Array of sentence lengths
 * @returns Burstiness score (0-1, >0.6 is good for human-like text)
 */
export function calculateBurstiness(sentenceLengths: number[]): number {
  if (sentenceLengths.length < 2) {
    return 0;
  }

  const mean = calculateAverage(sentenceLengths);
  const stdDev = calculateStandardDeviation(sentenceLengths);

  if (mean === 0) {
    return 0;
  }

  // Burstiness formula: (σ - μ) / (σ + μ)
  // Normalized to 0-1 range
  const rawBurstiness = (stdDev - mean) / (stdDev + mean);

  // Normalize to 0-1 range (raw burstiness is typically -1 to 1)
  return (rawBurstiness + 1) / 2;
}


/**
 * Calculates lexical diversity (type-token ratio)
 * Higher values indicate more varied vocabulary (more human-like)
 * @param text - The text to analyze
 * @returns Lexical diversity score (0-1)
 */
export function calculateLexicalDiversity(text: string): number {
  if (!text || text.trim().length === 0) {
    return 0;
  }

  // Extract words and normalize
  const words = text
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => /^[a-z]+$/i.test(word));

  if (words.length === 0) {
    return 0;
  }

  const uniqueWords = new Set(words);

  // Type-token ratio
  return uniqueWords.size / words.length;
}

/**
 * Calculates an approximation of perplexity based on text characteristics
 * Real perplexity requires a language model, so this is a heuristic approximation
 * Natural human text typically has perplexity between 40-120
 * @param text - The text to analyze
 * @param sentenceLengths - Pre-calculated sentence lengths
 * @returns Approximate perplexity score
 */
export function calculatePerplexity(text: string, sentenceLengths: number[]): number {
  if (!text || text.trim().length === 0) {
    return 0;
  }

  // Factors that contribute to perplexity approximation:
  // 1. Vocabulary diversity
  // 2. Sentence structure variation
  // 3. Word length variation
  // 4. Punctuation variety

  const lexicalDiversity = calculateLexicalDiversity(text);
  const sentenceVariation = calculateStandardDeviation(sentenceLengths);
  const wordLengthVariation = calculateWordLengthVariation(text);
  const punctuationDiversity = calculatePunctuationDiversity(text);

  // Combine factors into a perplexity-like score
  // Base perplexity around 60 (middle of natural range)
  let perplexity = 60;

  // Adjust based on lexical diversity (higher diversity = higher perplexity)
  perplexity += (lexicalDiversity - 0.5) * 40;

  // Adjust based on sentence variation
  perplexity += Math.min(sentenceVariation, 10) * 2;

  // Adjust based on word length variation
  perplexity += wordLengthVariation * 5;

  // Adjust based on punctuation diversity
  perplexity += punctuationDiversity * 10;

  // Clamp to reasonable range (20-150)
  return Math.max(20, Math.min(150, perplexity));
}

/**
 * Calculates word length variation
 * @param text - The text to analyze
 * @returns Standard deviation of word lengths
 */
function calculateWordLengthVariation(text: string): number {
  const words = text.split(/\s+/).filter((w) => /\w/.test(w));
  const wordLengths = words.map((w) => w.length);
  return calculateStandardDeviation(wordLengths);
}

/**
 * Calculates punctuation diversity score
 * @param text - The text to analyze
 * @returns Diversity score (0-1)
 */
function calculatePunctuationDiversity(text: string): number {
  const punctuationTypes = ['.', ',', '!', '?', ';', ':', '-', '—', '(', ')', '"', "'"];
  const foundTypes = punctuationTypes.filter((p) => text.includes(p));
  return foundTypes.length / punctuationTypes.length;
}

/**
 * Calculates the average of an array of numbers
 * @param values - Array of numbers
 * @returns Average value
 */
export function calculateAverage(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Calculates the standard deviation of an array of numbers
 * @param values - Array of numbers
 * @returns Standard deviation
 */
export function calculateStandardDeviation(values: number[]): number {
  if (values.length < 2) {
    return 0;
  }

  const mean = calculateAverage(values);
  const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
  const avgSquaredDiff = calculateAverage(squaredDiffs);

  return Math.sqrt(avgSquaredDiff);
}

/**
 * Validates that metrics meet humanization requirements
 * @param metrics - The calculated metrics
 * @returns Validation result with any issues
 */
export function validateMetrics(metrics: TextMetrics): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check burstiness (Requirement 2.1: >0.6)
  if (metrics.burstiness < 0.6) {
    issues.push(`Burstiness score (${metrics.burstiness.toFixed(2)}) is below 0.6 threshold`);
  }

  // Check sentence length std dev (Requirement 2.3: at least 8 words)
  if (metrics.sentenceLengthStdDev < 8) {
    issues.push(
      `Sentence length variation (${metrics.sentenceLengthStdDev.toFixed(2)}) is below 8 words`
    );
  }

  // Check perplexity (Requirement 2.4: 40-120)
  if (metrics.perplexity < 40 || metrics.perplexity > 120) {
    issues.push(`Perplexity (${metrics.perplexity.toFixed(2)}) is outside 40-120 range`);
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}
