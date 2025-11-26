/**
 * Context Preserver
 * Maintains contextual consistency across chunks during transformation.
 * Handles character voices, themes, key terms, and style profiles.
 * Requirements: 1.6, 11.2, 11.3, 11.4, 13
 */

import { ChunkContext, StyleProfile, TransformChunk } from './types';
import { extractSentences, countWords } from '../analysis/document-parser';

/** Number of sentences to preserve for context */
const CONTEXT_SENTENCE_COUNT = 5;

/** Maximum key terms to track */
const MAX_KEY_TERMS = 50;

/** Maximum themes to track */
const MAX_THEMES = 20;

/** Character voice detection patterns */
const DIALOGUE_PATTERNS = [
  /"([^"]+)"\s+(said|asked|replied|whispered|shouted|exclaimed|muttered)\s+(\w+)/gi,
  /'([^']+)'\s+(said|asked|replied|whispered|shouted|exclaimed|muttered)\s+(\w+)/gi,
  /(\w+)\s+(said|asked|replied|whispered|shouted|exclaimed|muttered),?\s*"([^"]+)"/gi,
];

/** Theme detection keywords */
const THEME_KEYWORDS: Record<string, string[]> = {
  love: ['love', 'heart', 'romance', 'passion', 'affection', 'devotion'],
  conflict: ['war', 'battle', 'fight', 'struggle', 'conflict', 'enemy'],
  growth: ['learn', 'grow', 'change', 'develop', 'evolve', 'transform'],
  loss: ['loss', 'grief', 'death', 'mourn', 'sorrow', 'farewell'],
  hope: ['hope', 'dream', 'aspire', 'wish', 'believe', 'faith'],
  fear: ['fear', 'terror', 'dread', 'anxiety', 'panic', 'horror'],
  justice: ['justice', 'fair', 'right', 'wrong', 'moral', 'ethics'],
  identity: ['identity', 'self', 'who', 'belong', 'purpose', 'meaning'],
  power: ['power', 'control', 'authority', 'dominance', 'influence'],
  freedom: ['freedom', 'liberty', 'escape', 'free', 'independence'],
};

/**
 * Context preserver for maintaining consistency across chunks
 */
export class ContextPreserver {
  private globalContext: ChunkContext;
  private styleProfile: StyleProfile | null = null;

  constructor() {
    this.globalContext = {
      previousSentences: [],
      characterVoices: {},
      themes: [],
      keyTerms: [],
      protectedSegments: [],
    };
  }

  /**
   * Analyzes text to build initial style profile
   * @param text - Full text to analyze
   * @returns Style profile
   */
  buildStyleProfile(text: string): StyleProfile {
    const sentences = extractSentences(text);
    const sentenceLengths = sentences.map(s => countWords(s));
    
    // Calculate average sentence length
    const avgLength = sentenceLengths.length > 0
      ? sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length
      : 0;

    // Calculate sentence length variation (standard deviation)
    const variance = sentenceLengths.length > 0
      ? sentenceLengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / sentenceLengths.length
      : 0;
    const stdDev = Math.sqrt(variance);

    // Analyze formality
    const formality = this.analyzeFormality(text);

    // Analyze vocabulary complexity
    const vocabularyComplexity = this.analyzeVocabularyComplexity(text);

    // Extract common phrases
    const commonPhrases = this.extractCommonPhrases(text);

    // Determine tone
    const tone = this.analyzeTone(text);

    this.styleProfile = {
      formality,
      vocabularyComplexity,
      averageSentenceLength: avgLength,
      sentenceLengthVariation: stdDev,
      commonPhrases,
      tone,
    };

    return this.styleProfile;
  }

  /**
   * Analyzes text formality level
   */
  private analyzeFormality(text: string): number {
    const lowerText = text.toLowerCase();
    
    // Informal indicators
    const informalPatterns = [
      /\b(gonna|wanna|gotta|kinda|sorta)\b/g,
      /\b(yeah|yep|nope|ok|okay)\b/g,
      /!{2,}/g,
      /\b(lol|omg|btw|imo)\b/g,
    ];

    // Formal indicators
    const formalPatterns = [
      /\b(therefore|furthermore|moreover|consequently)\b/g,
      /\b(hereby|whereas|notwithstanding)\b/g,
      /\b(shall|must|ought)\b/g,
      /\b(pursuant|accordance|herein)\b/g,
    ];

    let informalCount = 0;
    let formalCount = 0;

    for (const pattern of informalPatterns) {
      const matches = lowerText.match(pattern);
      informalCount += matches?.length ?? 0;
    }

    for (const pattern of formalPatterns) {
      const matches = lowerText.match(pattern);
      formalCount += matches?.length ?? 0;
    }

    const total = informalCount + formalCount;
    if (total === 0) return 50; // Neutral

    return Math.round((formalCount / total) * 100);
  }

  /**
   * Analyzes vocabulary complexity
   */
  private analyzeVocabularyComplexity(text: string): number {
    const words = text.toLowerCase().match(/\b[a-z]+\b/g) ?? [];
    if (words.length === 0) return 50;

    // Calculate average word length
    const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;

    // Count complex words (3+ syllables)
    const complexWords = words.filter(w => this.countSyllables(w) >= 3);
    const complexRatio = complexWords.length / words.length;

    // Combine metrics (normalized to 0-100)
    const lengthScore = Math.min((avgWordLength - 3) * 20, 50);
    const complexScore = complexRatio * 100;

    return Math.round((lengthScore + complexScore) / 2);
  }

  /**
   * Counts syllables in a word (approximate)
   */
  private countSyllables(word: string): number {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;

    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches?.length ?? 1;
  }

  /**
   * Extracts common phrases from text
   */
  private extractCommonPhrases(text: string): string[] {
    const phrases: Map<string, number> = new Map();
    const words = text.toLowerCase().split(/\s+/);

    // Extract 2-3 word phrases
    for (let i = 0; i < words.length - 1; i++) {
      const twoWord = `${words[i]} ${words[i + 1]}`;
      phrases.set(twoWord, (phrases.get(twoWord) ?? 0) + 1);

      if (i < words.length - 2) {
        const threeWord = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
        phrases.set(threeWord, (phrases.get(threeWord) ?? 0) + 1);
      }
    }

    // Return phrases that appear more than once
    return Array.from(phrases.entries())
      .filter(([_, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([phrase]) => phrase);
  }

  /**
   * Analyzes overall tone of text
   */
  private analyzeTone(text: string): StyleProfile['tone'] {
    const lowerText = text.toLowerCase();

    const toneIndicators = {
      positive: ['happy', 'joy', 'love', 'great', 'wonderful', 'excellent', 'amazing'],
      negative: ['sad', 'angry', 'hate', 'terrible', 'awful', 'horrible', 'bad'],
      formal: ['therefore', 'furthermore', 'consequently', 'hereby', 'pursuant'],
      casual: ['hey', 'cool', 'awesome', 'gonna', 'wanna', 'yeah'],
    };

    const scores: Record<string, number> = {
      positive: 0,
      negative: 0,
      formal: 0,
      casual: 0,
    };

    for (const [tone, words] of Object.entries(toneIndicators)) {
      for (const word of words) {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        const matches = lowerText.match(regex);
        const currentScore = scores[tone] ?? 0;
        scores[tone] = currentScore + (matches?.length ?? 0);
      }
    }

    const maxTone = Object.entries(scores).reduce((a, b) => (b[1] > a[1] ? b : a));
    
    if (maxTone[1] === 0) return 'neutral';
    return maxTone[0] as StyleProfile['tone'];
  }

  /**
   * Extracts context from a chunk for the next chunk
   * @param chunk - The processed chunk
   * @returns Updated context
   */
  extractContext(chunk: TransformChunk): ChunkContext {
    const content = chunk.transformedContent ?? chunk.content;
    const sentences = extractSentences(content);

    // Update previous sentences
    const previousSentences = sentences.slice(-CONTEXT_SENTENCE_COUNT);

    // Detect character voices (for fiction)
    const characterVoices = this.detectCharacterVoices(content);

    // Detect narrator voice
    const narratorVoice = this.detectNarratorVoice(content);

    // Extract themes
    const themes = this.detectThemes(content);

    // Extract key terms
    const keyTerms = this.extractKeyTerms(content);

    // Merge with global context
    const mergedCharacterVoices = { ...this.globalContext.characterVoices, ...characterVoices };
    const mergedNarratorVoice = narratorVoice ?? this.globalContext.narratorVoice;
    
    this.globalContext = {
      previousSentences,
      characterVoices: Object.keys(mergedCharacterVoices).length > 0 ? mergedCharacterVoices : undefined,
      narratorVoice: mergedNarratorVoice,
      themes: this.mergeArrays(this.globalContext.themes, themes, MAX_THEMES),
      keyTerms: this.mergeArrays(this.globalContext.keyTerms, keyTerms, MAX_KEY_TERMS),
      protectedSegments: chunk.context.protectedSegments,
      styleProfile: this.styleProfile ?? undefined,
    };

    return { ...this.globalContext };
  }

  /**
   * Prepares context for a chunk before processing
   * @param chunk - The chunk to prepare
   * @param previousChunk - The previous chunk (if any)
   * @returns Chunk with updated context
   */
  prepareChunkContext(chunk: TransformChunk, previousChunk?: TransformChunk): TransformChunk {
    if (previousChunk) {
      const extractedContext = this.extractContext(previousChunk);
      chunk.context = {
        previousSentences: extractedContext.previousSentences,
        characterVoices: extractedContext.characterVoices,
        narratorVoice: extractedContext.narratorVoice,
        themes: extractedContext.themes,
        keyTerms: extractedContext.keyTerms,
        styleProfile: this.styleProfile ?? undefined,
        protectedSegments: chunk.context.protectedSegments,
      };
    } else {
      chunk.context = {
        ...chunk.context,
        styleProfile: this.styleProfile ?? undefined,
      };
    }

    return chunk;
  }

  /**
   * Detects character voices from dialogue
   */
  private detectCharacterVoices(text: string): Record<string, string> {
    const voices: Record<string, string[]> = {};

    for (const pattern of DIALOGUE_PATTERNS) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      
      while ((match = regex.exec(text)) !== null) {
        // Extract character name and dialogue
        const characterName = match[3] || match[1];
        const dialogue = match[1] || match[3];
        
        if (characterName && dialogue) {
          const name = characterName.toLowerCase();
          if (!voices[name]) {
            voices[name] = [];
          }
          voices[name].push(dialogue);
        }
      }
    }

    // Summarize voice characteristics
    const characterVoices: Record<string, string> = {};
    for (const [name, dialogues] of Object.entries(voices)) {
      if (dialogues.length > 0) {
        const avgLength = dialogues.reduce((sum, d) => sum + d.length, 0) / dialogues.length;
        const hasQuestions = dialogues.some(d => d.includes('?'));
        const hasExclamations = dialogues.some(d => d.includes('!'));
        
        const traits: string[] = [];
        if (avgLength < 20) traits.push('brief');
        if (avgLength > 50) traits.push('verbose');
        if (hasQuestions) traits.push('inquisitive');
        if (hasExclamations) traits.push('expressive');
        
        characterVoices[name] = traits.join(', ') || 'neutral';
      }
    }

    return characterVoices;
  }

  /**
   * Detects narrator voice characteristics
   */
  private detectNarratorVoice(text: string): string | undefined {
    // Remove dialogue to analyze narrator voice
    const narratorText = text.replace(/"[^"]+"/g, '').replace(/'[^']+'/g, '');
    
    if (narratorText.length < 100) return undefined;

    const traits: string[] = [];

    // Check for first person
    if (/\b(I|me|my|mine|myself)\b/i.test(narratorText)) {
      traits.push('first-person');
    }

    // Check for third person
    if (/\b(he|she|they|him|her|them)\b/i.test(narratorText)) {
      traits.push('third-person');
    }

    // Check for omniscient (internal thoughts)
    if (/\b(thought|felt|wondered|knew|realized)\b/i.test(narratorText)) {
      traits.push('omniscient');
    }

    // Check for descriptive style
    const adjectives = narratorText.match(/\b\w+ly\b/gi);
    if (adjectives && adjectives.length > 5) {
      traits.push('descriptive');
    }

    return traits.length > 0 ? traits.join(', ') : undefined;
  }

  /**
   * Detects themes in text
   */
  private detectThemes(text: string): string[] {
    const lowerText = text.toLowerCase();
    const detectedThemes: string[] = [];

    for (const [theme, keywords] of Object.entries(THEME_KEYWORDS)) {
      const count = keywords.reduce((sum, keyword) => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = lowerText.match(regex);
        return sum + (matches?.length ?? 0);
      }, 0);

      if (count >= 2) {
        detectedThemes.push(theme);
      }
    }

    return detectedThemes;
  }

  /**
   * Extracts key terms from text
   */
  private extractKeyTerms(text: string): string[] {
    // Extract capitalized terms (proper nouns, important concepts)
    const capitalizedTerms = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) ?? [];
    
    // Count occurrences
    const termCounts = new Map<string, number>();
    for (const term of capitalizedTerms) {
      const normalized = term.toLowerCase();
      termCounts.set(normalized, (termCounts.get(normalized) ?? 0) + 1);
    }

    // Return terms that appear multiple times
    return Array.from(termCounts.entries())
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_KEY_TERMS)
      .map(([term]) => term);
  }

  /**
   * Merges arrays with deduplication and limit
   */
  private mergeArrays(existing: string[], newItems: string[], limit: number): string[] {
    const merged = [...new Set([...existing, ...newItems])];
    return merged.slice(0, limit);
  }

  /**
   * Gets the current global context
   */
  getGlobalContext(): ChunkContext {
    return { ...this.globalContext };
  }

  /**
   * Gets the style profile
   */
  getStyleProfile(): StyleProfile | null {
    return this.styleProfile;
  }

  /**
   * Resets the context preserver
   */
  reset(): void {
    this.globalContext = {
      previousSentences: [],
      characterVoices: {},
      themes: [],
      keyTerms: [],
      protectedSegments: [],
    };
    this.styleProfile = null;
  }
}

/**
 * Creates a new ContextPreserver instance
 */
export function createContextPreserver(): ContextPreserver {
  return new ContextPreserver();
}
