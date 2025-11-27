/**
 * Content Formalization Service
 * Provides contraction expansion, slang replacement, sentence restructuring,
 * and hedging language functionality for academic writing
 * Requirements: 107
 */

import crypto from 'crypto';
import {
  FormalizationLevel,
  ContractionMapping,
  ContractionExpansion,
  SlangTerm,
  SlangReplacement,
  SentenceRestructuring,
  HedgingAddition,
  HedgingType,
  FormalizationAnalysis,
  FormalizationRequest,
  FormalizationResult,
  FormalizationImprovement,
  SlangDetectionResult,
  DetectedSlang,
  FormalizationConfig,
  FormalizationLevelConfig,
} from './types';

/** Default configuration values */
const DEFAULT_TARGET_LEVEL: FormalizationLevel = 'professional';
const DEFAULT_INTENSITY = 0.7;
const DEFAULT_HEDGING_INTENSITY = 0.5;
const MIN_TEXT_LENGTH = 10;
const MAX_TEXT_LENGTH = 100000;
const DEFAULT_TIMEOUT = 30000;

/** Formalization level configurations */
const FORMALIZATION_LEVEL_CONFIGS: FormalizationLevelConfig[] = [
  { level: 'casual', minFormalityScore: 0, targetFormalityScore: 30, description: 'Casual, conversational tone', expandContractions: false, replaceSlang: false, addHedging: false },
  { level: 'standard', minFormalityScore: 30, targetFormalityScore: 50, description: 'Standard, everyday writing', expandContractions: true, replaceSlang: false, addHedging: false },
  { level: 'professional', minFormalityScore: 50, targetFormalityScore: 70, description: 'Business and professional writing', expandContractions: true, replaceSlang: true, addHedging: false },
  { level: 'academic', minFormalityScore: 70, targetFormalityScore: 85, description: 'Academic and scholarly writing', expandContractions: true, replaceSlang: true, addHedging: true },
  { level: 'legal', minFormalityScore: 85, targetFormalityScore: 100, description: 'Legal and formal documents', expandContractions: true, replaceSlang: true, addHedging: true },
];

/** Common contractions and their expansions */
const CONTRACTION_DATABASE: ContractionMapping[] = [
  // Common contractions
  { contraction: "can't", expansion: 'cannot', common: true },
  { contraction: "won't", expansion: 'will not', common: true },
  { contraction: "don't", expansion: 'do not', common: true },
  { contraction: "doesn't", expansion: 'does not', common: true },
  { contraction: "didn't", expansion: 'did not', common: true },
  { contraction: "isn't", expansion: 'is not', common: true },
  { contraction: "aren't", expansion: 'are not', common: true },
  { contraction: "wasn't", expansion: 'was not', common: true },
  { contraction: "weren't", expansion: 'were not', common: true },
  { contraction: "hasn't", expansion: 'has not', common: true },
  { contraction: "haven't", expansion: 'have not', common: true },
  { contraction: "hadn't", expansion: 'had not', common: true },
  { contraction: "wouldn't", expansion: 'would not', common: true },
  { contraction: "couldn't", expansion: 'could not', common: true },
  { contraction: "shouldn't", expansion: 'should not', common: true },
  { contraction: "mightn't", expansion: 'might not', common: false },
  { contraction: "mustn't", expansion: 'must not', common: false },
  { contraction: "needn't", expansion: 'need not', common: false },
  
  // Pronoun contractions
  { contraction: "I'm", expansion: 'I am', common: true },
  { contraction: "I've", expansion: 'I have', common: true },
  { contraction: "I'll", expansion: 'I will', common: true },
  { contraction: "I'd", expansion: 'I would', common: true },
  { contraction: "you're", expansion: 'you are', common: true },
  { contraction: "you've", expansion: 'you have', common: true },
  { contraction: "you'll", expansion: 'you will', common: true },
  { contraction: "you'd", expansion: 'you would', common: true },
  { contraction: "he's", expansion: 'he is', common: true },
  { contraction: "he'll", expansion: 'he will', common: true },
  { contraction: "he'd", expansion: 'he would', common: true },
  { contraction: "she's", expansion: 'she is', common: true },
  { contraction: "she'll", expansion: 'she will', common: true },
  { contraction: "she'd", expansion: 'she would', common: true },
  { contraction: "it's", expansion: 'it is', common: true },
  { contraction: "it'll", expansion: 'it will', common: true },
  { contraction: "we're", expansion: 'we are', common: true },
  { contraction: "we've", expansion: 'we have', common: true },
  { contraction: "we'll", expansion: 'we will', common: true },
  { contraction: "we'd", expansion: 'we would', common: true },
  { contraction: "they're", expansion: 'they are', common: true },
  { contraction: "they've", expansion: 'they have', common: true },
  { contraction: "they'll", expansion: 'they will', common: true },
  { contraction: "they'd", expansion: 'they would', common: true },
  
  // Other common contractions
  { contraction: "that's", expansion: 'that is', common: true },
  { contraction: "there's", expansion: 'there is', common: true },
  { contraction: "here's", expansion: 'here is', common: true },
  { contraction: "what's", expansion: 'what is', common: true },
  { contraction: "who's", expansion: 'who is', common: true },
  { contraction: "where's", expansion: 'where is', common: true },
  { contraction: "when's", expansion: 'when is', common: false },
  { contraction: "why's", expansion: 'why is', common: false },
  { contraction: "how's", expansion: 'how is', common: true },
  { contraction: "let's", expansion: 'let us', common: true },
];


/** Slang database organized by category */
const SLANG_DATABASE: SlangTerm[] = [
  // Internet/Social media slang
  { term: 'gonna', formalReplacement: 'going to', category: 'colloquial', informalityLevel: 3 },
  { term: 'wanna', formalReplacement: 'want to', category: 'colloquial', informalityLevel: 3 },
  { term: 'gotta', formalReplacement: 'have to', category: 'colloquial', informalityLevel: 3 },
  { term: 'kinda', formalReplacement: 'kind of', category: 'colloquial', informalityLevel: 3 },
  { term: 'sorta', formalReplacement: 'sort of', category: 'colloquial', informalityLevel: 3 },
  { term: 'dunno', formalReplacement: 'do not know', category: 'colloquial', informalityLevel: 4 },
  { term: 'lemme', formalReplacement: 'let me', category: 'colloquial', informalityLevel: 4 },
  { term: 'gimme', formalReplacement: 'give me', category: 'colloquial', informalityLevel: 4 },
  { term: 'gotcha', formalReplacement: 'understood', category: 'colloquial', informalityLevel: 4 },
  { term: 'yeah', formalReplacement: 'yes', category: 'colloquial', informalityLevel: 2 },
  { term: 'yep', formalReplacement: 'yes', category: 'colloquial', informalityLevel: 3 },
  { term: 'nope', formalReplacement: 'no', category: 'colloquial', informalityLevel: 3 },
  { term: 'nah', formalReplacement: 'no', category: 'colloquial', informalityLevel: 4 },
  { term: 'ok', formalReplacement: 'acceptable', category: 'colloquial', informalityLevel: 2 },
  { term: 'okay', formalReplacement: 'acceptable', category: 'colloquial', informalityLevel: 2 },
  
  // Casual expressions
  { term: 'awesome', formalReplacement: 'excellent', category: 'casual', informalityLevel: 2 },
  { term: 'cool', formalReplacement: 'acceptable', category: 'casual', informalityLevel: 2 },
  { term: 'great', formalReplacement: 'excellent', category: 'casual', informalityLevel: 1 },
  { term: 'amazing', formalReplacement: 'remarkable', category: 'casual', informalityLevel: 1 },
  { term: 'huge', formalReplacement: 'significant', category: 'casual', informalityLevel: 1 },
  { term: 'tons of', formalReplacement: 'numerous', category: 'casual', informalityLevel: 3 },
  { term: 'lots of', formalReplacement: 'many', category: 'casual', informalityLevel: 2 },
  { term: 'a lot of', formalReplacement: 'many', category: 'casual', informalityLevel: 2 },
  { term: 'bunch of', formalReplacement: 'several', category: 'casual', informalityLevel: 3 },
  { term: 'stuff', formalReplacement: 'materials', category: 'casual', informalityLevel: 3 },
  { term: 'things', formalReplacement: 'items', category: 'casual', informalityLevel: 1 },
  { term: 'get', formalReplacement: 'obtain', category: 'casual', informalityLevel: 1 },
  { term: 'got', formalReplacement: 'obtained', category: 'casual', informalityLevel: 1 },
  { term: 'big', formalReplacement: 'substantial', category: 'casual', informalityLevel: 1 },
  { term: 'little', formalReplacement: 'minor', category: 'casual', informalityLevel: 1 },
  { term: 'pretty', formalReplacement: 'fairly', category: 'casual', informalityLevel: 2 },
  { term: 'really', formalReplacement: 'significantly', category: 'casual', informalityLevel: 2 },
  { term: 'very', formalReplacement: 'highly', category: 'casual', informalityLevel: 1 },
  { term: 'super', formalReplacement: 'extremely', category: 'casual', informalityLevel: 3 },
  { term: 'totally', formalReplacement: 'completely', category: 'casual', informalityLevel: 3 },
  { term: 'basically', formalReplacement: 'fundamentally', category: 'casual', informalityLevel: 2 },
  { term: 'actually', formalReplacement: 'in fact', category: 'casual', informalityLevel: 1 },
  { term: 'kind of', formalReplacement: 'somewhat', category: 'casual', informalityLevel: 2 },
  { term: 'sort of', formalReplacement: 'somewhat', category: 'casual', informalityLevel: 2 },
  
  // Informal verbs
  { term: 'fix', formalReplacement: 'repair', category: 'informal-verb', informalityLevel: 1 },
  { term: 'check out', formalReplacement: 'examine', category: 'informal-verb', informalityLevel: 2 },
  { term: 'figure out', formalReplacement: 'determine', category: 'informal-verb', informalityLevel: 2 },
  { term: 'find out', formalReplacement: 'discover', category: 'informal-verb', informalityLevel: 1 },
  { term: 'look into', formalReplacement: 'investigate', category: 'informal-verb', informalityLevel: 2 },
  { term: 'come up with', formalReplacement: 'develop', category: 'informal-verb', informalityLevel: 2 },
  { term: 'put together', formalReplacement: 'assemble', category: 'informal-verb', informalityLevel: 2 },
  { term: 'set up', formalReplacement: 'establish', category: 'informal-verb', informalityLevel: 2 },
  { term: 'show up', formalReplacement: 'appear', category: 'informal-verb', informalityLevel: 2 },
  { term: 'turn out', formalReplacement: 'result', category: 'informal-verb', informalityLevel: 2 },
  { term: 'work out', formalReplacement: 'resolve', category: 'informal-verb', informalityLevel: 2 },
  { term: 'point out', formalReplacement: 'indicate', category: 'informal-verb', informalityLevel: 1 },
  { term: 'bring up', formalReplacement: 'mention', category: 'informal-verb', informalityLevel: 2 },
  { term: 'go through', formalReplacement: 'review', category: 'informal-verb', informalityLevel: 2 },
  { term: 'deal with', formalReplacement: 'address', category: 'informal-verb', informalityLevel: 2 },
  
  // Informal connectors
  { term: 'plus', formalReplacement: 'additionally', category: 'connector', informalityLevel: 2 },
  { term: 'so', formalReplacement: 'therefore', category: 'connector', informalityLevel: 1 },
  { term: 'but', formalReplacement: 'however', category: 'connector', informalityLevel: 1 },
  { term: 'and', formalReplacement: 'furthermore', category: 'connector', informalityLevel: 1 },
  { term: 'also', formalReplacement: 'additionally', category: 'connector', informalityLevel: 1 },
];

/** Hedging phrases by type */
const HEDGING_PHRASES: Record<HedgingType, string[]> = {
  epistemic: [
    'may', 'might', 'could', 'possibly', 'perhaps', 'probably',
    'it is possible that', 'it is likely that', 'there is a possibility that',
  ],
  evidential: [
    'according to', 'research suggests', 'studies indicate', 'evidence suggests',
    'the data indicates', 'findings suggest', 'as demonstrated by',
  ],
  approximator: [
    'approximately', 'roughly', 'about', 'around', 'nearly', 'almost',
    'to some extent', 'in some cases', 'to a certain degree',
  ],
  shield: [
    'it appears that', 'it seems that', 'it would seem', 'apparently',
    'presumably', 'arguably', 'one might argue that',
  ],
  attribution: [
    'according to researchers', 'scholars suggest', 'experts argue',
    'it has been proposed that', 'it has been suggested that',
  ],
};

/** Sentence starters for sophistication */
const SOPHISTICATED_STARTERS: string[] = [
  'Furthermore,', 'Moreover,', 'Additionally,', 'Consequently,',
  'Nevertheless,', 'Nonetheless,', 'Subsequently,', 'Accordingly,',
  'In contrast,', 'Conversely,', 'Similarly,', 'Likewise,',
  'Specifically,', 'Notably,', 'Significantly,', 'Importantly,',
];

/** Informal sentence starters to replace */
const INFORMAL_STARTERS: Record<string, string> = {
  'So,': 'Therefore,',
  'But,': 'However,',
  'And,': 'Furthermore,',
  'Also,': 'Additionally,',
  'Plus,': 'Moreover,',
  'Well,': 'Indeed,',
  'Like,': 'For instance,',
  'Anyway,': 'Nevertheless,',
  'Basically,': 'Fundamentally,',
  'Actually,': 'In fact,',
};


/**
 * Content Formalization Service class
 * Handles contraction expansion, slang replacement, sentence restructuring,
 * and hedging language for academic writing
 */
export class FormalizationService {
  private config: FormalizationConfig;

  constructor(serviceConfig?: Partial<FormalizationConfig>) {
    this.config = this.buildConfig(serviceConfig);
  }

  /**
   * Builds the service configuration
   */
  private buildConfig(overrides?: Partial<FormalizationConfig>): FormalizationConfig {
    return {
      defaultTargetLevel: overrides?.defaultTargetLevel ?? DEFAULT_TARGET_LEVEL,
      defaultIntensity: overrides?.defaultIntensity ?? DEFAULT_INTENSITY,
      defaultHedgingIntensity: overrides?.defaultHedgingIntensity ?? DEFAULT_HEDGING_INTENSITY,
      minTextLength: overrides?.minTextLength ?? MIN_TEXT_LENGTH,
      maxTextLength: overrides?.maxTextLength ?? MAX_TEXT_LENGTH,
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
      .replace(/[^\w\s'-]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 0);
  }

  /**
   * Escapes special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Preserves the case pattern of the original word
   */
  private preserveCase(original: string, replacement: string): string {
    if (!original || !replacement) return replacement;
    
    // All uppercase
    if (original === original.toUpperCase()) {
      return replacement.toUpperCase();
    }
    
    // Title case (first letter uppercase)
    if (original[0] === original[0]?.toUpperCase() && original.slice(1) === original.slice(1).toLowerCase()) {
      return replacement.charAt(0).toUpperCase() + replacement.slice(1).toLowerCase();
    }
    
    // Default: lowercase
    return replacement.toLowerCase();
  }

  /**
   * Counts contractions in text
   */
  private countContractions(text: string): number {
    let count = 0;
    const lowerText = text.toLowerCase();
    
    for (const mapping of CONTRACTION_DATABASE) {
      const pattern = new RegExp(`\\b${this.escapeRegex(mapping.contraction)}\\b`, 'gi');
      const matches = lowerText.match(pattern);
      if (matches) {
        count += matches.length;
      }
    }
    
    return count;
  }

  /**
   * Counts slang terms in text
   */
  private countSlang(text: string): number {
    let count = 0;
    
    for (const slang of SLANG_DATABASE) {
      const pattern = new RegExp(`\\b${this.escapeRegex(slang.term)}\\b`, 'gi');
      const matches = text.match(pattern);
      if (matches) {
        count += matches.length;
      }
    }
    
    return count;
  }

  /**
   * Counts informal phrases in text
   */
  private countInformalPhrases(text: string): number {
    let count = 0;
    
    for (const starter of Object.keys(INFORMAL_STARTERS)) {
      const pattern = new RegExp(`^${this.escapeRegex(starter)}`, 'gim');
      const matches = text.match(pattern);
      if (matches) {
        count += matches.length;
      }
    }
    
    return count;
  }

  /**
   * Calculates sophistication score based on vocabulary and structure
   */
  private calculateSophisticationScore(text: string): number {
    const words = this.splitIntoWords(text);
    const sentences = this.splitIntoSentences(text);
    
    if (words.length === 0) return 0;
    
    // Factor 1: Average word length (longer words = more sophisticated)
    const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;
    const wordLengthScore = Math.min(100, (avgWordLength - 3) * 20);
    
    // Factor 2: Sentence complexity (longer sentences = more sophisticated)
    const avgSentenceLength = words.length / Math.max(1, sentences.length);
    const sentenceLengthScore = Math.min(100, avgSentenceLength * 4);
    
    // Factor 3: Use of sophisticated starters
    let sophisticatedStarterCount = 0;
    for (const starter of SOPHISTICATED_STARTERS) {
      const pattern = new RegExp(`^${this.escapeRegex(starter)}`, 'gim');
      const matches = text.match(pattern);
      if (matches) {
        sophisticatedStarterCount += matches.length;
      }
    }
    const starterScore = Math.min(100, (sophisticatedStarterCount / Math.max(1, sentences.length)) * 200);
    
    // Factor 4: Absence of informal elements
    const contractionPenalty = this.countContractions(text) * 5;
    const slangPenalty = this.countSlang(text) * 10;
    const informalPenalty = Math.min(50, contractionPenalty + slangPenalty);
    
    return Math.max(0, Math.min(100, 
      (wordLengthScore * 0.25 + sentenceLengthScore * 0.25 + starterScore * 0.25 + (100 - informalPenalty) * 0.25)
    ));
  }

  /**
   * Calculates hedging score based on presence of hedging language
   */
  private calculateHedgingScore(text: string): number {
    const sentences = this.splitIntoSentences(text);
    if (sentences.length === 0) return 0;
    
    let hedgingCount = 0;
    const lowerText = text.toLowerCase();
    
    for (const phrases of Object.values(HEDGING_PHRASES)) {
      for (const phrase of phrases) {
        const pattern = new RegExp(`\\b${this.escapeRegex(phrase)}\\b`, 'gi');
        const matches = lowerText.match(pattern);
        if (matches) {
          hedgingCount += matches.length;
        }
      }
    }
    
    // Score based on hedging density
    return Math.min(100, (hedgingCount / sentences.length) * 50);
  }

  /**
   * Determines formality level from score
   */
  private scoreToFormalizationLevel(score: number): FormalizationLevel {
    if (score >= 85) return 'legal';
    if (score >= 70) return 'academic';
    if (score >= 50) return 'professional';
    if (score >= 30) return 'standard';
    return 'casual';
  }

  /**
   * Analyzes the formalization level of text
   * @param text - Text to analyze
   * @returns Formalization analysis
   */
  analyzeFormalization(text: string): FormalizationAnalysis {
    const words = this.splitIntoWords(text);
    const sentences = this.splitIntoSentences(text);
    
    const contractionCount = this.countContractions(text);
    const slangCount = this.countSlang(text);
    const informalPhraseCount = this.countInformalPhrases(text);
    const sophisticationScore = this.calculateSophisticationScore(text);
    const hedgingScore = this.calculateHedgingScore(text);
    
    // Calculate overall formality score
    const wordCount = words.length;
    const contractionPenalty = wordCount > 0 ? (contractionCount / wordCount) * 100 : 0;
    const slangPenalty = wordCount > 0 ? (slangCount / wordCount) * 150 : 0;
    const informalPenalty = wordCount > 0 ? (informalPhraseCount / Math.max(1, sentences.length)) * 50 : 0;
    
    const formalityScore = Math.max(0, Math.min(100,
      sophisticationScore - contractionPenalty - slangPenalty - informalPenalty + (hedgingScore * 0.2)
    ));
    
    return {
      currentLevel: this.scoreToFormalizationLevel(formalityScore),
      formalityScore: Math.round(formalityScore * 10) / 10,
      contractionCount,
      slangCount,
      informalPhraseCount,
      sophisticationScore: Math.round(sophisticationScore * 10) / 10,
      hedgingScore: Math.round(hedgingScore * 10) / 10,
      wordCount,
      sentenceCount: sentences.length,
    };
  }


  /**
   * Detects slang in text
   * @param text - Text to analyze
   * @returns Slang detection result
   */
  async detectSlang(text: string): Promise<SlangDetectionResult> {
    const startTime = Date.now();
    const id = this.generateId('slang');
    const detectedTerms: DetectedSlang[] = [];
    const words = this.splitIntoWords(text);
    const wordCount = words.length;
    
    for (const slang of SLANG_DATABASE) {
      const pattern = new RegExp(`\\b${this.escapeRegex(slang.term)}\\b`, 'gi');
      let match;
      
      while ((match = pattern.exec(text)) !== null) {
        detectedTerms.push({
          term: match[0],
          position: match.index,
          endPosition: match.index + match[0].length,
          category: slang.category,
          informalityLevel: slang.informalityLevel,
          suggestedReplacement: slang.formalReplacement,
          confidence: 0.9,
        });
      }
    }
    
    // Sort by position
    detectedTerms.sort((a, b) => a.position - b.position);
    
    // Get unique categories
    const categories = [...new Set(detectedTerms.map(t => t.category))];
    
    return {
      id,
      text,
      detectedTerms,
      totalSlang: detectedTerms.length,
      slangDensity: wordCount > 0 ? (detectedTerms.length / wordCount) * 100 : 0,
      categories,
      timestamp: new Date(),
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Formalizes text to target level
   * Requirement 107: Build content formalization
   * @param request - Formalization request
   * @returns Formalization result
   */
  async formalize(request: FormalizationRequest): Promise<FormalizationResult> {
    const startTime = Date.now();
    const id = this.generateId('form');
    
    const {
      text,
      targetLevel,
      strategies = ['comprehensive'],
      addHedging = false,
      hedgingIntensity = this.config.defaultHedgingIntensity,
      intensity = this.config.defaultIntensity,
      preserveTerms = [],
      customReplacements = {},
    } = request;
    
    // Analyze original text
    const originalAnalysis = this.analyzeFormalization(text);
    
    let formalizedText = text;
    const contractionExpansions: ContractionExpansion[] = [];
    const slangReplacements: SlangReplacement[] = [];
    const sentenceRestructurings: SentenceRestructuring[] = [];
    const hedgingAdditions: HedgingAddition[] = [];
    
    // Get target level config
    const targetConfig = FORMALIZATION_LEVEL_CONFIGS.find(c => c.level === targetLevel) 
      || FORMALIZATION_LEVEL_CONFIGS[2]!;
    
    // Apply strategies based on request
    const applyAll = strategies.includes('comprehensive');
    
    // Step 1: Expand contractions
    if ((applyAll || strategies.includes('contraction-expansion')) && targetConfig.expandContractions) {
      formalizedText = this.expandContractions(
        formalizedText,
        intensity,
        preserveTerms,
        contractionExpansions
      );
    }
    
    // Step 2: Replace slang
    if ((applyAll || strategies.includes('slang-replacement')) && targetConfig.replaceSlang) {
      formalizedText = this.replaceSlang(
        formalizedText,
        targetLevel,
        intensity,
        preserveTerms,
        customReplacements,
        slangReplacements
      );
    }
    
    // Step 3: Restructure sentences for sophistication
    if (applyAll || strategies.includes('sentence-restructuring')) {
      formalizedText = this.restructureSentences(
        formalizedText,
        targetLevel,
        intensity,
        sentenceRestructurings
      );
    }
    
    // Step 4: Add hedging language (for academic level)
    if ((addHedging || strategies.includes('hedging-language')) && 
        (targetLevel === 'academic' || targetLevel === 'legal' || targetConfig.addHedging)) {
      formalizedText = this.addHedgingLanguage(
        formalizedText,
        hedgingIntensity,
        hedgingAdditions
      );
    }
    
    // Analyze formalized text
    const newAnalysis = this.analyzeFormalization(formalizedText);
    
    // Calculate improvement metrics
    const improvement = this.calculateImprovement(
      originalAnalysis,
      newAnalysis,
      targetLevel,
      contractionExpansions,
      slangReplacements,
      sentenceRestructurings,
      hedgingAdditions,
      text,
      formalizedText
    );
    
    return {
      id,
      originalText: text,
      formalizedText,
      targetLevel,
      originalAnalysis,
      newAnalysis,
      contractionExpansions,
      slangReplacements,
      sentenceRestructurings,
      hedgingAdditions,
      totalChanges: contractionExpansions.length + slangReplacements.length + 
                    sentenceRestructurings.length + hedgingAdditions.length,
      improvement,
      timestamp: new Date(),
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Expands contractions to their full forms
   * Requirement 107: Create contraction expansion
   */
  private expandContractions(
    text: string,
    intensity: number,
    preserveTerms: string[],
    expansions: ContractionExpansion[]
  ): string {
    let result = text;
    const preserveLower = preserveTerms.map(t => t.toLowerCase());
    
    // Sort contractions by length (longest first) to avoid partial matches
    const sortedContractions = [...CONTRACTION_DATABASE].sort(
      (a, b) => b.contraction.length - a.contraction.length
    );
    
    for (const mapping of sortedContractions) {
      if (preserveLower.includes(mapping.contraction.toLowerCase())) continue;
      
      // Skip uncommon contractions at lower intensity
      if (!mapping.common && intensity < 0.8) continue;
      
      const pattern = new RegExp(`\\b${this.escapeRegex(mapping.contraction)}\\b`, 'gi');
      let match;
      let offset = 0;
      const originalResult = result;
      
      while ((match = pattern.exec(originalResult)) !== null) {
        const position = match.index + offset;
        const original = match[0];
        const expanded = this.preserveCase(original, mapping.expansion);
        
        expansions.push({
          original,
          expanded,
          position,
          endPosition: position + original.length,
        });
        
        result = result.substring(0, position) + expanded + result.substring(position + original.length);
        offset += expanded.length - original.length;
      }
    }
    
    return result;
  }

  /**
   * Replaces slang with formal alternatives
   * Requirement 107: Build slang replacement
   */
  private replaceSlang(
    text: string,
    targetLevel: FormalizationLevel,
    intensity: number,
    preserveTerms: string[],
    customReplacements: Record<string, string>,
    replacements: SlangReplacement[]
  ): string {
    let result = text;
    const preserveLower = preserveTerms.map(t => t.toLowerCase());
    
    // Get informality threshold based on target level
    const informalityThreshold = this.getInformalityThreshold(targetLevel);
    
    // Apply custom replacements first
    for (const [term, replacement] of Object.entries(customReplacements)) {
      if (preserveLower.includes(term.toLowerCase())) continue;
      
      const pattern = new RegExp(`\\b${this.escapeRegex(term)}\\b`, 'gi');
      let match;
      let offset = 0;
      const originalResult = result;
      
      while ((match = pattern.exec(originalResult)) !== null) {
        const position = match.index + offset;
        const original = match[0];
        const formal = this.preserveCase(original, replacement);
        
        replacements.push({
          original,
          replacement: formal,
          position,
          endPosition: position + original.length,
          category: 'custom',
        });
        
        result = result.substring(0, position) + formal + result.substring(position + original.length);
        offset += formal.length - original.length;
      }
    }
    
    // Sort slang by length (longest first) to handle multi-word phrases
    const sortedSlang = [...SLANG_DATABASE].sort(
      (a, b) => b.term.length - a.term.length
    );
    
    // Apply slang database replacements
    for (const slang of sortedSlang) {
      if (preserveLower.includes(slang.term.toLowerCase())) continue;
      
      // Only replace if informality is above threshold
      if (slang.informalityLevel < informalityThreshold && intensity < 0.8) continue;
      
      const pattern = new RegExp(`\\b${this.escapeRegex(slang.term)}\\b`, 'gi');
      let match;
      let offset = 0;
      const originalResult = result;
      
      while ((match = pattern.exec(originalResult)) !== null) {
        const position = match.index + offset;
        const original = match[0];
        
        // Avoid duplicate replacements
        if (replacements.some(r => r.position === position)) continue;
        
        const formal = this.preserveCase(original, slang.formalReplacement);
        
        replacements.push({
          original,
          replacement: formal,
          position,
          endPosition: position + original.length,
          category: slang.category,
        });
        
        result = result.substring(0, position) + formal + result.substring(position + original.length);
        offset += formal.length - original.length;
      }
    }
    
    return result;
  }

  /**
   * Gets informality threshold for target level
   */
  private getInformalityThreshold(level: FormalizationLevel): number {
    switch (level) {
      case 'casual': return 5;
      case 'standard': return 4;
      case 'professional': return 3;
      case 'academic': return 2;
      case 'legal': return 1;
      default: return 3;
    }
  }


  /**
   * Restructures sentences for sophistication
   * Requirement 107: Implement sentence restructuring for sophistication
   */
  private restructureSentences(
    text: string,
    targetLevel: FormalizationLevel,
    intensity: number,
    restructurings: SentenceRestructuring[]
  ): string {
    let result = text;
    
    // Replace informal sentence starters (at start of text or after sentence-ending punctuation)
    for (const [informal, formal] of Object.entries(INFORMAL_STARTERS)) {
      // Match at start of text or after sentence-ending punctuation followed by space
      const pattern = new RegExp(`(^|(?<=[.!?]\\s))${this.escapeRegex(informal)}`, 'gi');
      let match;
      let offset = 0;
      const originalResult = result;
      
      while ((match = pattern.exec(originalResult)) !== null) {
        const position = match.index + offset;
        const original = match[0];
        const sophisticated = this.preserveCase(original, formal);
        
        // Find the full sentence for the restructuring record
        const sentenceEnd = originalResult.indexOf('.', match.index);
        const fullSentence = sentenceEnd > 0 
          ? originalResult.substring(match.index, sentenceEnd + 1)
          : originalResult.substring(match.index);
        
        const originalSophistication = this.calculateSentenceSophistication(fullSentence);
        const newSentence = sophisticated + fullSentence.substring(original.length);
        const newSophistication = this.calculateSentenceSophistication(newSentence);
        
        restructurings.push({
          original: fullSentence,
          restructured: newSentence,
          position,
          endPosition: position + fullSentence.length,
          reason: `Replaced informal starter "${informal}" with "${formal}"`,
          originalSophistication,
          newSophistication,
        });
        
        result = result.substring(0, position) + sophisticated + result.substring(position + original.length);
        offset += sophisticated.length - original.length;
      }
    }
    
    // For academic/legal levels, add sophisticated transitions where appropriate
    if ((targetLevel === 'academic' || targetLevel === 'legal') && intensity >= 0.7) {
      result = this.addSophisticatedTransitions(result, restructurings);
    }
    
    return result;
  }

  /**
   * Calculates sophistication score for a single sentence
   */
  private calculateSentenceSophistication(sentence: string): number {
    const words = this.splitIntoWords(sentence);
    if (words.length === 0) return 0;
    
    // Average word length
    const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;
    const wordLengthScore = Math.min(100, (avgWordLength - 3) * 25);
    
    // Check for sophisticated starters
    let starterBonus = 0;
    for (const starter of SOPHISTICATED_STARTERS) {
      if (sentence.startsWith(starter)) {
        starterBonus = 30;
        break;
      }
    }
    
    // Check for informal elements (penalty)
    let informalPenalty = 0;
    for (const mapping of CONTRACTION_DATABASE) {
      if (sentence.toLowerCase().includes(mapping.contraction.toLowerCase())) {
        informalPenalty += 10;
      }
    }
    
    return Math.max(0, Math.min(100, wordLengthScore + starterBonus - informalPenalty));
  }

  /**
   * Adds sophisticated transitions between sentences
   */
  private addSophisticatedTransitions(
    text: string,
    restructurings: SentenceRestructuring[]
  ): string {
    const sentences = this.splitIntoSentences(text);
    if (sentences.length < 2) return text;
    
    let result = text;
    let offset = 0;
    
    // Look for sentences that could benefit from transitions
    for (let i = 1; i < sentences.length; i++) {
      const sentence = sentences[i]!;
      const prevSentence = sentences[i - 1]!;
      
      // Skip if sentence already has a sophisticated starter
      const hasSophisticatedStarter = SOPHISTICATED_STARTERS.some(s => 
        sentence.startsWith(s)
      );
      if (hasSophisticatedStarter) continue;
      
      // Skip if sentence starts with a capital letter that's not the first word
      // (likely a proper noun or acronym)
      const firstWord = sentence.split(/\s+/)[0] || '';
      if (firstWord.length > 1 && firstWord === firstWord.toUpperCase()) continue;
      
      // Determine appropriate transition based on content
      const transition = this.selectAppropriateTransition(prevSentence, sentence);
      if (!transition) continue;
      
      // Find position in result
      const position = result.indexOf(sentence, offset);
      if (position === -1) continue;
      
      const originalSophistication = this.calculateSentenceSophistication(sentence);
      const newSentence = transition + ' ' + sentence.charAt(0).toLowerCase() + sentence.slice(1);
      const newSophistication = this.calculateSentenceSophistication(newSentence);
      
      // Only add if it improves sophistication
      if (newSophistication > originalSophistication) {
        restructurings.push({
          original: sentence,
          restructured: newSentence,
          position,
          endPosition: position + sentence.length,
          reason: `Added sophisticated transition "${transition}"`,
          originalSophistication,
          newSophistication,
        });
        
        result = result.substring(0, position) + newSentence + result.substring(position + sentence.length);
        offset = position + newSentence.length;
      } else {
        offset = position + sentence.length;
      }
    }
    
    return result;
  }

  /**
   * Selects an appropriate transition based on sentence content
   */
  private selectAppropriateTransition(prevSentence: string, currentSentence: string): string | null {
    const prevLower = prevSentence.toLowerCase();
    const currLower = currentSentence.toLowerCase();
    
    // Contrast indicators
    if (currLower.includes('but') || currLower.includes('however') || 
        currLower.includes('although') || currLower.includes('despite')) {
      return null; // Already has contrast
    }
    
    // Addition/continuation
    if (currLower.includes('also') || currLower.includes('additionally') ||
        currLower.includes('furthermore') || currLower.includes('moreover')) {
      return null; // Already has addition marker
    }
    
    // Check for contrast between sentences
    const contrastWords = ['not', 'no', 'never', 'without', 'lack', 'fail'];
    const prevHasNegative = contrastWords.some(w => prevLower.includes(w));
    const currHasNegative = contrastWords.some(w => currLower.includes(w));
    
    if (prevHasNegative !== currHasNegative) {
      return 'In contrast,';
    }
    
    // Check for cause-effect
    if (currLower.includes('result') || currLower.includes('therefore') ||
        currLower.includes('thus') || currLower.includes('hence')) {
      return null; // Already has cause-effect
    }
    
    // Default to addition transition (but only sometimes to avoid overuse)
    if (Math.random() < 0.3) {
      const additionTransitions = ['Furthermore,', 'Moreover,', 'Additionally,'];
      return additionTransitions[Math.floor(Math.random() * additionTransitions.length)] || 'Furthermore,';
    }
    
    return null;
  }

  /**
   * Adds hedging language for academic writing
   * Requirement 107: Add hedging language for academic writing
   */
  private addHedgingLanguage(
    text: string,
    intensity: number,
    additions: HedgingAddition[]
  ): string {
    let result = text;
    const sentences = this.splitIntoSentences(text);
    
    // Identify sentences that make strong claims
    const strongClaimPatterns = [
      { pattern: /\b(is|are|was|were)\s+(the\s+)?(best|worst|only|always|never|definitely|certainly|absolutely)\b/gi, type: 'epistemic' as HedgingType },
      { pattern: /\b(proves?|shows?|demonstrates?|confirms?)\s+that\b/gi, type: 'evidential' as HedgingType },
      { pattern: /\b(all|every|none|no one|everyone|always|never)\b/gi, type: 'approximator' as HedgingType },
      { pattern: /\b(must|will|shall)\s+(be|have|do)\b/gi, type: 'epistemic' as HedgingType },
    ];
    
    let offset = 0;
    
    for (const sentence of sentences) {
      // Skip short sentences
      if (sentence.split(/\s+/).length < 5) continue;
      
      // Check if sentence already has hedging
      const hasHedging = Object.values(HEDGING_PHRASES).flat().some(phrase =>
        sentence.toLowerCase().includes(phrase.toLowerCase())
      );
      if (hasHedging) continue;
      
      // Check for strong claims
      for (const { pattern, type } of strongClaimPatterns) {
        pattern.lastIndex = 0;
        const match = pattern.exec(sentence);
        
        if (match && Math.random() < intensity) {
          const position = result.indexOf(sentence, offset);
          if (position === -1) continue;
          
          const hedgedSentence = this.applyHedging(sentence, type, match);
          if (hedgedSentence !== sentence) {
            const hedgingPhrase = this.getHedgingPhraseUsed(sentence, hedgedSentence);
            
            additions.push({
              original: sentence,
              hedged: hedgedSentence,
              position,
              endPosition: position + sentence.length,
              hedgingType: type,
              hedgingPhrase,
            });
            
            result = result.substring(0, position) + hedgedSentence + result.substring(position + sentence.length);
            offset = position + hedgedSentence.length;
            break; // Only one hedging per sentence
          }
        }
      }
    }
    
    return result;
  }

  /**
   * Applies hedging to a sentence
   */
  private applyHedging(sentence: string, type: HedgingType, _match: RegExpExecArray): string {
    const phrases = HEDGING_PHRASES[type];
    if (!phrases || phrases.length === 0) return sentence;
    
    switch (type) {
      case 'epistemic':
        // Replace strong modals with hedged versions
        return sentence
          .replace(/\bmust\b/gi, 'may')
          .replace(/\bwill\b/gi, 'might')
          .replace(/\bdefinitely\b/gi, 'possibly')
          .replace(/\bcertainly\b/gi, 'likely')
          .replace(/\babsolutely\b/gi, 'probably');
      
      case 'evidential':
        // Add evidential phrase at the beginning
        if (!sentence.toLowerCase().startsWith('according') && 
            !sentence.toLowerCase().startsWith('research') &&
            !sentence.toLowerCase().startsWith('studies')) {
          return `Research suggests that ${sentence.charAt(0).toLowerCase()}${sentence.slice(1)}`;
        }
        return sentence;
      
      case 'approximator':
        // Replace absolutes with approximators
        return sentence
          .replace(/\ball\b/gi, 'most')
          .replace(/\bevery\b/gi, 'nearly every')
          .replace(/\bnone\b/gi, 'few')
          .replace(/\balways\b/gi, 'typically')
          .replace(/\bnever\b/gi, 'rarely');
      
      case 'shield':
        // Add shield phrase at the beginning
        if (!sentence.toLowerCase().startsWith('it appears') &&
            !sentence.toLowerCase().startsWith('it seems')) {
          return `It appears that ${sentence.charAt(0).toLowerCase()}${sentence.slice(1)}`;
        }
        return sentence;
      
      case 'attribution':
        // Add attribution phrase
        if (!sentence.toLowerCase().includes('according to') &&
            !sentence.toLowerCase().includes('scholars')) {
          return `Scholars suggest that ${sentence.charAt(0).toLowerCase()}${sentence.slice(1)}`;
        }
        return sentence;
      
      default:
        return sentence;
    }
  }

  /**
   * Gets the hedging phrase that was used
   */
  private getHedgingPhraseUsed(original: string, hedged: string): string {
    // Find what was added
    if (hedged.startsWith('Research suggests that')) return 'Research suggests that';
    if (hedged.startsWith('It appears that')) return 'It appears that';
    if (hedged.startsWith('Scholars suggest that')) return 'Scholars suggest that';
    
    // Check for word replacements
    if (original.includes('must') && hedged.includes('may')) return 'may (replacing must)';
    if (original.includes('will') && hedged.includes('might')) return 'might (replacing will)';
    if (original.includes('all') && hedged.includes('most')) return 'most (replacing all)';
    if (original.includes('always') && hedged.includes('typically')) return 'typically (replacing always)';
    if (original.includes('never') && hedged.includes('rarely')) return 'rarely (replacing never)';
    
    return 'hedging applied';
  }


  /**
   * Calculates improvement metrics
   */
  private calculateImprovement(
    originalAnalysis: FormalizationAnalysis,
    newAnalysis: FormalizationAnalysis,
    targetLevel: FormalizationLevel,
    contractionExpansions: ContractionExpansion[],
    slangReplacements: SlangReplacement[],
    sentenceRestructurings: SentenceRestructuring[],
    hedgingAdditions: HedgingAddition[],
    originalText: string,
    _formalizedText: string
  ): FormalizationImprovement {
    const targetConfig = FORMALIZATION_LEVEL_CONFIGS.find(c => c.level === targetLevel)
      || FORMALIZATION_LEVEL_CONFIGS[2]!;
    
    // Calculate percentage of text that was changed
    const originalWords = this.splitIntoWords(originalText);
    const changedWords = contractionExpansions.length + slangReplacements.length;
    const percentageFormalized = originalWords.length > 0 
      ? (changedWords / originalWords.length) * 100 
      : 0;
    
    return {
      formalityScoreImprovement: newAnalysis.formalityScore - originalAnalysis.formalityScore,
      sophisticationScoreImprovement: newAnalysis.sophisticationScore - originalAnalysis.sophisticationScore,
      percentageFormalized: Math.round(percentageFormalized * 10) / 10,
      contractionsExpanded: contractionExpansions.length,
      slangTermsReplaced: slangReplacements.length,
      sentencesRestructured: sentenceRestructurings.length,
      hedgingPhrasesAdded: hedgingAdditions.length,
      targetAchieved: newAnalysis.formalityScore >= targetConfig.targetFormalityScore,
    };
  }

  /**
   * Gets available formalization levels
   */
  getAvailableFormalizationLevels(): FormalizationLevelConfig[] {
    return [...FORMALIZATION_LEVEL_CONFIGS];
  }

  /**
   * Gets slang categories
   */
  getSlangCategories(): string[] {
    return [...new Set(SLANG_DATABASE.map(s => s.category))];
  }

  /**
   * Gets slang terms by category
   */
  getSlangByCategory(category: string): SlangTerm[] {
    return SLANG_DATABASE.filter(s => s.category === category);
  }

  /**
   * Gets all contractions
   */
  getContractions(): ContractionMapping[] {
    return [...CONTRACTION_DATABASE];
  }

  /**
   * Gets hedging phrases by type
   */
  getHedgingPhrases(type?: HedgingType): string[] {
    if (type) {
      return [...(HEDGING_PHRASES[type] || [])];
    }
    return Object.values(HEDGING_PHRASES).flat();
  }
}

/** Singleton instance */
export const formalizationService = new FormalizationService();
