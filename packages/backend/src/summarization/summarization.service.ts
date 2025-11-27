/**
 * Summarization Service
 * Provides extractive and abstractive summarization with humanization support
 * Requirements: 78
 */

import crypto from 'crypto';
import {
  SummaryLength,
  SummarizationMethod,
  ScoredSentence,
  ExtractiveSummaryResult,
  AbstractiveSummaryResult,
  SummarizationRequest,
  SummarizationResult,
  ExtractiveSummarizationRequest,
  AbstractiveSummarizationRequest,
  HumanizeSummaryRequest,
  HumanizeSummaryResult,
  SummarizationConfig,
  LengthConfig,
} from './types';

/** Default configuration values */
const DEFAULT_LENGTH: SummaryLength = 'medium';
const DEFAULT_METHOD: SummarizationMethod = 'hybrid';
const DEFAULT_HUMANIZATION_LEVEL = 3;
const MIN_TEXT_LENGTH = 50;
const MAX_TEXT_LENGTH = 500000;
const DEFAULT_TIMEOUT = 60000;

/** Length configurations */
const LENGTH_CONFIGS: LengthConfig[] = [
  { length: 'short', targetRatio: 0.1, minSentences: 1, maxSentences: 3, description: 'Brief overview (10% of original)' },
  { length: 'medium', targetRatio: 0.25, minSentences: 3, maxSentences: 10, description: 'Balanced summary (25% of original)' },
  { length: 'long', targetRatio: 0.4, minSentences: 5, maxSentences: 20, description: 'Detailed summary (40% of original)' },
];

/** Stop words to exclude from scoring */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
  'shall', 'can', 'need', 'dare', 'ought', 'used', 'it', 'its', 'this', 'that',
  'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they', 'what', 'which', 'who',
  'whom', 'whose', 'where', 'when', 'why', 'how', 'all', 'each', 'every', 'both',
  'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
  'same', 'so', 'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there', 'then',
]);

/** Transition phrases for abstractive summarization */
const TRANSITION_PHRASES = [
  'Additionally,', 'Furthermore,', 'Moreover,', 'In addition,',
  'Also,', 'Besides,', 'Consequently,', 'Therefore,',
  'As a result,', 'Thus,', 'Hence,', 'Accordingly,',
];

/** Humanization patterns for different levels */
const HUMANIZATION_PATTERNS: Record<number, { contractions: boolean; fillers: boolean; variations: boolean }> = {
  1: { contractions: false, fillers: false, variations: false },
  2: { contractions: true, fillers: false, variations: false },
  3: { contractions: true, fillers: true, variations: false },
  4: { contractions: true, fillers: true, variations: true },
  5: { contractions: true, fillers: true, variations: true },
};

/**
 * Summarization Service class
 * Handles extractive, abstractive, and hybrid summarization with humanization
 */
export class SummarizationService {
  private config: SummarizationConfig;

  constructor(serviceConfig?: Partial<SummarizationConfig>) {
    this.config = this.buildConfig(serviceConfig);
  }

  /**
   * Builds the service configuration
   */
  private buildConfig(overrides?: Partial<SummarizationConfig>): SummarizationConfig {
    return {
      defaultLength: overrides?.defaultLength ?? DEFAULT_LENGTH,
      defaultMethod: overrides?.defaultMethod ?? DEFAULT_METHOD,
      minTextLength: overrides?.minTextLength ?? MIN_TEXT_LENGTH,
      maxTextLength: overrides?.maxTextLength ?? MAX_TEXT_LENGTH,
      defaultHumanizationLevel: overrides?.defaultHumanizationLevel ?? DEFAULT_HUMANIZATION_LEVEL,
      timeout: overrides?.timeout ?? DEFAULT_TIMEOUT,
    };
  }

  /**
   * Generates a unique identifier
   */
  private generateId(prefix: string): string {
    return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Splits text into sentences
   */
  private splitIntoSentences(text: string): string[] {
    return text
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  /**
   * Splits text into words
   */
  private splitIntoWords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s'-]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 0);
  }

  /**
   * Counts words in text
   */
  private countWords(text: string): number {
    return this.splitIntoWords(text).length;
  }

  /**
   * Calculates word frequency in text
   */
  private calculateWordFrequency(text: string): Map<string, number> {
    const words = this.splitIntoWords(text);
    const frequency = new Map<string, number>();
    
    for (const word of words) {
      if (!STOP_WORDS.has(word) && word.length > 2) {
        frequency.set(word, (frequency.get(word) || 0) + 1);
      }
    }
    
    return frequency;
  }

  /**
   * Scores a sentence based on word frequency and position
   */
  private scoreSentence(
    sentence: string,
    position: number,
    totalSentences: number,
    wordFrequency: Map<string, number>,
    maxFrequency: number
  ): number {
    const words = this.splitIntoWords(sentence);
    
    if (words.length === 0) return 0;
    
    // Word frequency score
    let frequencyScore = 0;
    for (const word of words) {
      const freq = wordFrequency.get(word) || 0;
      frequencyScore += freq / maxFrequency;
    }
    frequencyScore = frequencyScore / words.length;
    
    // Position score (first and last sentences are often important)
    let positionScore = 0;
    if (position === 0) {
      positionScore = 1.0; // First sentence
    } else if (position === totalSentences - 1) {
      positionScore = 0.8; // Last sentence
    } else if (position < totalSentences * 0.2) {
      positionScore = 0.6; // Early sentences
    } else if (position > totalSentences * 0.8) {
      positionScore = 0.5; // Late sentences
    } else {
      positionScore = 0.3; // Middle sentences
    }
    
    // Length score (prefer medium-length sentences)
    const idealLength = 20;
    const lengthDiff = Math.abs(words.length - idealLength);
    const lengthScore = Math.max(0, 1 - lengthDiff / idealLength);
    
    // Combine scores with weights
    return frequencyScore * 0.5 + positionScore * 0.3 + lengthScore * 0.2;
  }

  /**
   * General summarization with length control
   * Requirement 78: Add length control (short, medium, long)
   */
  async summarize(request: SummarizationRequest): Promise<SummarizationResult> {
    const startTime = Date.now();
    const id = this.generateId('sum');
    
    const {
      text,
      length = this.config.defaultLength,
      method = this.config.defaultMethod,
      humanize = false,
      humanizationLevel = this.config.defaultHumanizationLevel,
      preserveTerms = [],
      focusTopics = [],
    } = request;
    
    const originalWordCount = this.countWords(text);
    const lengthConfig = LENGTH_CONFIGS.find(c => c.length === length) || LENGTH_CONFIGS[1]!;
    
    let summary: string;
    let keyPoints: string[] = [];
    
    // Choose summarization method
    if (method === 'extractive') {
      const targetSentences = Math.max(
        lengthConfig.minSentences,
        Math.min(lengthConfig.maxSentences, Math.ceil(this.splitIntoSentences(text).length * lengthConfig.targetRatio))
      );
      const result = await this.extractiveSummarize({ text, sentenceCount: targetSentences });
      summary = result.summary;
      keyPoints = result.selectedSentences.slice(0, 5).map(s => s.text);
    } else if (method === 'abstractive') {
      const targetWords = Math.ceil(originalWordCount * lengthConfig.targetRatio);
      const result = await this.abstractiveSummarize({ text, wordCount: targetWords });
      summary = result.summary;
      keyPoints = result.keyConcepts;
    } else {
      // Hybrid: combine extractive and abstractive
      const targetSentences = Math.max(
        lengthConfig.minSentences,
        Math.min(lengthConfig.maxSentences, Math.ceil(this.splitIntoSentences(text).length * lengthConfig.targetRatio))
      );
      const extractiveResult = await this.extractiveSummarize({ text, sentenceCount: targetSentences });
      
      // Refine with abstractive techniques
      summary = this.refineExtractedSummary(extractiveResult.summary, focusTopics);
      keyPoints = this.extractKeyPoints(text, 5);
    }
    
    // Apply humanization if requested
    let humanizedSummary: string | undefined;
    if (humanize) {
      const humanizeResult = await this.humanizeSummary({ summary, level: humanizationLevel });
      humanizedSummary = humanizeResult.humanizedSummary;
    }
    
    const summaryWordCount = this.countWords(humanizedSummary || summary);
    
    return {
      id,
      originalText: text,
      summary,
      humanizedSummary,
      length,
      method,
      keyPoints,
      compressionRatio: summaryWordCount / originalWordCount,
      originalWordCount,
      summaryWordCount,
      wasHumanized: humanize,
      timestamp: new Date(),
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Extractive summarization - selects most important sentences
   * Requirement 78: Implement extractive summarization
   */
  async extractiveSummarize(request: ExtractiveSummarizationRequest): Promise<ExtractiveSummaryResult> {
    const startTime = Date.now();
    const id = this.generateId('ext');
    
    const {
      text,
      sentenceCount,
      preserveOrder = true,
      minSentenceLength = 5,
    } = request;
    
    const sentences = this.splitIntoSentences(text);
    const wordFrequency = this.calculateWordFrequency(text);
    const maxFrequency = Math.max(...wordFrequency.values(), 1);
    
    // Score all sentences
    const scoredSentences: ScoredSentence[] = sentences.map((sentence, index) => ({
      text: sentence,
      position: index,
      score: this.scoreSentence(sentence, index, sentences.length, wordFrequency, maxFrequency),
      wordCount: this.countWords(sentence),
      selected: false,
    }));
    
    // Filter by minimum length and sort by score
    const eligibleSentences = scoredSentences
      .filter(s => s.wordCount >= minSentenceLength)
      .sort((a, b) => b.score - a.score);
    
    // Select top sentences
    const targetCount = Math.min(sentenceCount, eligibleSentences.length);
    const selectedIndices = new Set<number>();
    
    for (let i = 0; i < targetCount && i < eligibleSentences.length; i++) {
      const sentence = eligibleSentences[i]!;
      sentence.selected = true;
      selectedIndices.add(sentence.position);
    }
    
    // Build summary (preserve order if requested)
    let selectedSentences: ScoredSentence[];
    if (preserveOrder) {
      selectedSentences = scoredSentences.filter(s => s.selected).sort((a, b) => a.position - b.position);
    } else {
      selectedSentences = scoredSentences.filter(s => s.selected).sort((a, b) => b.score - a.score);
    }
    
    const summary = selectedSentences.map(s => s.text).join(' ');
    const originalWordCount = this.countWords(text);
    const summaryWordCount = this.countWords(summary);
    
    return {
      id,
      originalText: text,
      summary,
      selectedSentences,
      totalSentences: sentences.length,
      sentencesIncluded: selectedSentences.length,
      compressionRatio: summaryWordCount / originalWordCount,
      originalWordCount,
      summaryWordCount,
      timestamp: new Date(),
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Abstractive summarization - generates new summary text
   * Requirement 78: Create abstractive summarization
   */
  async abstractiveSummarize(request: AbstractiveSummarizationRequest): Promise<AbstractiveSummaryResult> {
    const startTime = Date.now();
    const id = this.generateId('abs');
    
    const {
      text,
      wordCount: targetWordCount,
      style = 'formal',
      includeKeyConcepts = true,
    } = request;
    
    // Extract key concepts and themes
    const keyConcepts = this.extractKeyConcepts(text);
    const themes = this.identifyThemes(text);
    
    // Generate abstractive summary
    const summary = this.generateAbstractiveSummary(text, targetWordCount, keyConcepts, themes, style);
    
    const originalWordCount = this.countWords(text);
    const actualWordCount = this.countWords(summary);
    
    return {
      id,
      originalText: text,
      summary,
      keyConcepts: includeKeyConcepts ? keyConcepts : [],
      themes,
      targetWordCount,
      actualWordCount,
      compressionRatio: actualWordCount / originalWordCount,
      originalWordCount,
      timestamp: new Date(),
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Humanizes a summary to make it sound more natural
   * Requirement 78: Build humanization for summaries
   */
  async humanizeSummary(request: HumanizeSummaryRequest): Promise<HumanizeSummaryResult> {
    const startTime = Date.now();
    const id = this.generateId('hum');
    
    const {
      summary,
      level = this.config.defaultHumanizationLevel,
      tone = 'professional',
    } = request;
    
    const patterns = HUMANIZATION_PATTERNS[level] || HUMANIZATION_PATTERNS[3]!;
    let humanized = summary;
    let modificationsCount = 0;
    
    // Apply contractions
    if (patterns.contractions) {
      const contractionResult = this.applyContractions(humanized);
      humanized = contractionResult.text;
      modificationsCount += contractionResult.count;
    }
    
    // Add natural fillers and transitions
    if (patterns.fillers) {
      const fillerResult = this.addNaturalFillers(humanized, tone);
      humanized = fillerResult.text;
      modificationsCount += fillerResult.count;
    }
    
    // Apply sentence variations
    if (patterns.variations) {
      const variationResult = this.applySentenceVariations(humanized, level);
      humanized = variationResult.text;
      modificationsCount += variationResult.count;
    }
    
    return {
      id,
      originalSummary: summary,
      humanizedSummary: humanized,
      levelApplied: level,
      toneApplied: tone,
      modificationsCount,
      timestamp: new Date(),
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Extracts key concepts from text
   */
  private extractKeyConcepts(text: string): string[] {
    const wordFrequency = this.calculateWordFrequency(text);
    const sortedWords = [...wordFrequency.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
    
    return sortedWords;
  }

  /**
   * Identifies themes in text
   */
  private identifyThemes(text: string): string[] {
    const sentences = this.splitIntoSentences(text);
    const themes: string[] = [];
    
    // Look for topic sentences (often first sentences of paragraphs)
    const paragraphs = text.split(/\n\n+/);
    for (const para of paragraphs) {
      const firstSentence = this.splitIntoSentences(para)[0];
      if (firstSentence && firstSentence.length > 20) {
        // Extract main subject
        const words = this.splitIntoWords(firstSentence);
        const significantWords = words.filter(w => !STOP_WORDS.has(w) && w.length > 3);
        if (significantWords.length > 0) {
          themes.push(significantWords.slice(0, 3).join(' '));
        }
      }
    }
    
    return [...new Set(themes)].slice(0, 5);
  }

  /**
   * Generates an abstractive summary
   */
  private generateAbstractiveSummary(
    text: string,
    targetWordCount: number,
    keyConcepts: string[],
    themes: string[],
    style: 'formal' | 'casual' | 'technical'
  ): string {
    const sentences = this.splitIntoSentences(text);
    const wordFrequency = this.calculateWordFrequency(text);
    const maxFrequency = Math.max(...wordFrequency.values(), 1);
    
    // Score and select key sentences
    const scoredSentences = sentences.map((sentence, index) => ({
      text: sentence,
      score: this.scoreSentence(sentence, index, sentences.length, wordFrequency, maxFrequency),
      position: index,
    }));
    
    // Sort by score and select top sentences
    const topSentences = scoredSentences
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.ceil(sentences.length * 0.3));
    
    // Reorder by position for coherence
    topSentences.sort((a, b) => a.position - b.position);
    
    // Build summary with paraphrasing
    let summary = '';
    let currentWordCount = 0;
    
    for (const sentence of topSentences) {
      if (currentWordCount >= targetWordCount) break;
      
      // Paraphrase the sentence
      const paraphrased = this.paraphraseSentence(sentence.text, style);
      const sentenceWords = this.countWords(paraphrased);
      
      if (currentWordCount + sentenceWords <= targetWordCount * 1.2) {
        if (summary.length > 0) {
          summary += ' ';
        }
        summary += paraphrased;
        currentWordCount += sentenceWords;
      }
    }
    
    return summary;
  }

  /**
   * Paraphrases a sentence based on style
   */
  private paraphraseSentence(sentence: string, style: 'formal' | 'casual' | 'technical'): string {
    let result = sentence;
    
    // Apply style-specific transformations
    if (style === 'casual') {
      result = result.replace(/\bHowever\b/g, 'But');
      result = result.replace(/\bTherefore\b/g, 'So');
      result = result.replace(/\bFurthermore\b/g, 'Also');
      result = result.replace(/\bConsequently\b/g, 'As a result');
    } else if (style === 'formal') {
      result = result.replace(/\bBut\b/g, 'However');
      result = result.replace(/\bSo\b/g, 'Therefore');
      result = result.replace(/\bAlso\b/g, 'Additionally');
    }
    
    return result;
  }

  /**
   * Refines an extracted summary with abstractive techniques
   */
  private refineExtractedSummary(summary: string, focusTopics: string[]): string {
    let refined = summary;
    
    // Add transitions between sentences if needed
    const sentences = this.splitIntoSentences(refined);
    if (sentences.length > 1) {
      const refinedSentences: string[] = [sentences[0]!];
      
      for (let i = 1; i < sentences.length; i++) {
        const sentence = sentences[i]!;
        // Add transition if sentences seem disconnected
        if (!this.hasTransition(sentence)) {
          const transition = TRANSITION_PHRASES[i % TRANSITION_PHRASES.length];
          refinedSentences.push(`${transition} ${sentence.charAt(0).toLowerCase()}${sentence.slice(1)}`);
        } else {
          refinedSentences.push(sentence);
        }
      }
      
      refined = refinedSentences.join(' ');
    }
    
    return refined;
  }

  /**
   * Checks if a sentence starts with a transition
   */
  private hasTransition(sentence: string): boolean {
    const lowerSentence = sentence.toLowerCase();
    const transitions = ['however', 'therefore', 'furthermore', 'additionally', 'moreover', 
                        'consequently', 'thus', 'hence', 'also', 'besides', 'meanwhile'];
    return transitions.some(t => lowerSentence.startsWith(t));
  }

  /**
   * Extracts key points from text
   */
  private extractKeyPoints(text: string, count: number): string[] {
    const sentences = this.splitIntoSentences(text);
    const wordFrequency = this.calculateWordFrequency(text);
    const maxFrequency = Math.max(...wordFrequency.values(), 1);
    
    const scored = sentences.map((sentence, index) => ({
      text: sentence,
      score: this.scoreSentence(sentence, index, sentences.length, wordFrequency, maxFrequency),
    }));
    
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, count)
      .map(s => s.text);
  }

  /**
   * Applies contractions to text
   */
  private applyContractions(text: string): { text: string; count: number } {
    const contractions: [RegExp, string][] = [
      [/\bI am\b/g, "I'm"],
      [/\bI have\b/g, "I've"],
      [/\bI will\b/g, "I'll"],
      [/\bI would\b/g, "I'd"],
      [/\byou are\b/gi, "you're"],
      [/\byou have\b/gi, "you've"],
      [/\byou will\b/gi, "you'll"],
      [/\bwe are\b/gi, "we're"],
      [/\bwe have\b/gi, "we've"],
      [/\bthey are\b/gi, "they're"],
      [/\bthey have\b/gi, "they've"],
      [/\bit is\b/gi, "it's"],
      [/\bthat is\b/gi, "that's"],
      [/\bwhat is\b/gi, "what's"],
      [/\bdo not\b/gi, "don't"],
      [/\bdoes not\b/gi, "doesn't"],
      [/\bdid not\b/gi, "didn't"],
      [/\bwill not\b/gi, "won't"],
      [/\bwould not\b/gi, "wouldn't"],
      [/\bcould not\b/gi, "couldn't"],
      [/\bshould not\b/gi, "shouldn't"],
      [/\bcan not\b/gi, "can't"],
      [/\bcannot\b/gi, "can't"],
      [/\bis not\b/gi, "isn't"],
      [/\bare not\b/gi, "aren't"],
      [/\bwas not\b/gi, "wasn't"],
      [/\bwere not\b/gi, "weren't"],
      [/\bhas not\b/gi, "hasn't"],
      [/\bhave not\b/gi, "haven't"],
      [/\bhad not\b/gi, "hadn't"],
    ];
    
    let result = text;
    let count = 0;
    
    for (const [pattern, replacement] of contractions) {
      const matches = result.match(pattern);
      if (matches) {
        count += matches.length;
        result = result.replace(pattern, replacement);
      }
    }
    
    return { text: result, count };
  }

  /**
   * Adds natural fillers and transitions
   */
  private addNaturalFillers(text: string, tone: string): { text: string; count: number } {
    const sentences = this.splitIntoSentences(text);
    let count = 0;
    
    const fillers = tone === 'casual' 
      ? ['Actually,', 'Basically,', 'Essentially,', 'In fact,']
      : ['Notably,', 'Importantly,', 'Significantly,', 'In essence,'];
    
    const result = sentences.map((sentence, index) => {
      // Add filler to some sentences (not the first one)
      if (index > 0 && index % 3 === 0 && !this.hasTransition(sentence)) {
        const filler = fillers[index % fillers.length];
        count++;
        return `${filler} ${sentence.charAt(0).toLowerCase()}${sentence.slice(1)}`;
      }
      return sentence;
    });
    
    return { text: result.join(' '), count };
  }

  /**
   * Applies sentence variations for more natural flow
   */
  private applySentenceVariations(text: string, level: number): { text: string; count: number } {
    let result = text;
    let count = 0;
    
    // Vary sentence starters
    const variations: [RegExp, string[]][] = [
      [/^The /gm, ['This ', 'That ', 'The ']],
      [/^It /gm, ['This ', 'That ', 'It ']],
    ];
    
    for (const [pattern, replacements] of variations) {
      if (level >= 4 && Math.random() > 0.5) {
        const replacement = replacements[Math.floor(Math.random() * replacements.length)];
        if (result.match(pattern)) {
          result = result.replace(pattern, replacement!);
          count++;
        }
      }
    }
    
    return { text: result, count };
  }

  /**
   * Gets available length configurations
   */
  getAvailableLengths(): LengthConfig[] {
    return LENGTH_CONFIGS;
  }

  /**
   * Gets available summarization methods
   */
  getAvailableMethods(): SummarizationMethod[] {
    return ['extractive', 'abstractive', 'hybrid'];
  }

  /**
   * Validates text for summarization
   */
  validateText(text: string): { valid: boolean; error?: string } {
    if (!text || typeof text !== 'string') {
      return { valid: false, error: 'Text is required and must be a string' };
    }
    
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      return { valid: false, error: 'Text cannot be empty' };
    }
    
    if (trimmed.length < this.config.minTextLength) {
      return { valid: false, error: `Text must be at least ${this.config.minTextLength} characters` };
    }
    
    if (trimmed.length > this.config.maxTextLength) {
      return { valid: false, error: `Text cannot exceed ${this.config.maxTextLength} characters` };
    }
    
    return { valid: true };
  }
}

/** Singleton instance */
export const summarizationService = new SummarizationService();
