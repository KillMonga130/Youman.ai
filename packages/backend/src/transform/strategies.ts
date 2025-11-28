/**
 * Transformation Strategies
 * Implements casual, professional, and academic transformation strategies.
 * Each strategy applies different humanization patterns to text.
 * Requirements: 6
 */

import { TransformStrategy, ChunkContext, HumanizationLevel } from './types';
import { ContentType } from '../analysis/types';

/**
 * Transformation result from a strategy
 */
export interface StrategyTransformResult {
  /** Transformed text */
  text: string;
  /** Modifications made */
  modifications: StrategyModification[];
}

/**
 * A single modification made by a strategy
 */
export interface StrategyModification {
  /** Type of modification */
  type: 'contraction' | 'colloquialism' | 'structure' | 'hedging' | 'formality' | 'word_choice';
  /** Original text */
  original: string;
  /** Replacement text */
  replacement: string;
  /** Position in text */
  position: number;
}

/**
 * Base interface for transformation strategies
 */
export interface ITransformationStrategy {
  /** Strategy name */
  readonly name: TransformStrategy;
  
  /** Transform text using this strategy */
  transform(
    text: string,
    level: HumanizationLevel,
    context: ChunkContext
  ): StrategyTransformResult;
  
  /** Check if this strategy is appropriate for the given content type */
  isAppropriateFor(contentType: ContentType): boolean;
}

/**
 * Common contractions for casual transformation
 */
const CONTRACTIONS: Record<string, string> = {
  'cannot': "can't",
  'will not': "won't",
  'would not': "wouldn't",
  'could not': "couldn't",
  'should not': "shouldn't",
  'do not': "don't",
  'does not': "doesn't",
  'did not': "didn't",
  'is not': "isn't",
  'are not': "aren't",
  'was not': "wasn't",
  'were not': "weren't",
  'have not': "haven't",
  'has not': "hasn't",
  'had not': "hadn't",
  'I am': "I'm",
  'you are': "you're",
  'we are': "we're",
  'they are': "they're",
  'it is': "it's",
  'that is': "that's",
  'there is': "there's",
  'what is': "what's",
  'who is': "who's",
  'I will': "I'll",
  'you will': "you'll",
  'we will': "we'll",
  'they will': "they'll",
  'I would': "I'd",
  'you would': "you'd",
  'we would': "we'd",
  'they would': "they'd",
  'I have': "I've",
  'you have': "you've",
  'we have': "we've",
  'they have': "they've",
  'let us': "let's",
};

/**
 * Colloquial phrases for casual transformation
 */
const COLLOQUIALISMS: Record<string, string[]> = {
  'very': ['really', 'super', 'pretty'],
  'extremely': ['really', 'super', 'incredibly'],
  'however': ['but', 'though', 'still'],
  'therefore': ['so', 'that means', 'which means'],
  'additionally': ['also', 'plus', 'and'],
  'furthermore': ['also', 'plus', 'what\'s more'],
  'consequently': ['so', 'as a result', 'because of that'],
  'nevertheless': ['still', 'even so', 'but'],
  'subsequently': ['then', 'after that', 'later'],
  'approximately': ['about', 'around', 'roughly'],
  'immediately': ['right away', 'straight away', 'at once'],
  'frequently': ['often', 'a lot', 'regularly'],
  'occasionally': ['sometimes', 'now and then', 'once in a while'],
  'utilize': ['use', 'work with', 'make use of'],
  'implement': ['use', 'put in place', 'set up'],
  'demonstrate': ['show', 'prove', 'make clear'],
  'facilitate': ['help', 'make easier', 'support'],
  'commence': ['start', 'begin', 'kick off'],
  'terminate': ['end', 'stop', 'finish'],
  'obtain': ['get', 'grab', 'pick up'],
  'require': ['need', 'want', 'have to have'],
  'sufficient': ['enough', 'plenty', 'adequate'],
  'numerous': ['many', 'lots of', 'a bunch of'],
  'regarding': ['about', 'on', 'concerning'],
  'prior to': ['before', 'ahead of', 'earlier than'],
};

/**
 * Conversational phrases for casual transformation
 */
const CONVERSATIONAL_PHRASES: string[] = [
  'You know,',
  'Honestly,',
  'To be fair,',
  'The thing is,',
  'Here\'s the deal:',
  'Look,',
  'So basically,',
  'I mean,',
  'Truth be told,',
  'At the end of the day,',
];

/**
 * Academic hedging phrases
 */
const HEDGING_PHRASES: Record<string, string[]> = {
  'is': ['appears to be', 'seems to be', 'may be', 'could be'],
  'shows': ['suggests', 'indicates', 'appears to show', 'seems to demonstrate'],
  'proves': ['suggests', 'provides evidence for', 'supports the notion that'],
  'causes': ['may contribute to', 'appears to influence', 'seems to affect'],
  'will': ['may', 'might', 'could potentially', 'is likely to'],
  'always': ['typically', 'generally', 'in most cases', 'often'],
  'never': ['rarely', 'seldom', 'in few cases', 'infrequently'],
  'all': ['most', 'many', 'the majority of', 'a significant number of'],
  'none': ['few', 'very few', 'a limited number of', 'hardly any'],
};

/**
 * Academic citation patterns
 */
const CITATION_PATTERNS: string[] = [
  'According to recent research,',
  'Studies have shown that',
  'Research indicates that',
  'Evidence suggests that',
  'It has been observed that',
  'Scholars argue that',
  'The literature suggests that',
  'Previous work has demonstrated that',
];

/**
 * Professional word alternatives
 */
const PROFESSIONAL_ALTERNATIVES: Record<string, string[]> = {
  'good': ['effective', 'beneficial', 'advantageous', 'favorable'],
  'bad': ['unfavorable', 'suboptimal', 'challenging', 'problematic'],
  'big': ['significant', 'substantial', 'considerable', 'major'],
  'small': ['minor', 'modest', 'limited', 'minimal'],
  'important': ['critical', 'essential', 'vital', 'key'],
  'help': ['assist', 'support', 'facilitate', 'enable'],
  'use': ['utilize', 'employ', 'leverage', 'apply'],
  'make': ['create', 'develop', 'establish', 'generate'],
  'get': ['obtain', 'acquire', 'secure', 'receive'],
  'show': ['demonstrate', 'illustrate', 'indicate', 'reveal'],
  'think': ['believe', 'consider', 'assess', 'evaluate'],
  'need': ['require', 'necessitate', 'demand'],
  'want': ['seek', 'desire', 'aim for'],
  'try': ['attempt', 'endeavor', 'strive'],
  'start': ['initiate', 'commence', 'begin', 'launch'],
  'end': ['conclude', 'finalize', 'complete', 'terminate'],
};

/**
 * Casual Strategy Implementation
 * Introduces contractions, colloquialisms, and conversational phrases.
 * Requirements: 6.2
 */
export class CasualStrategy implements ITransformationStrategy {
  readonly name: TransformStrategy = 'casual';

  transform(
    text: string,
    level: HumanizationLevel,
    _context: ChunkContext
  ): StrategyTransformResult {
    const modifications: StrategyModification[] = [];
    let result = text;

    // Calculate transformation intensity based on level
    const intensity = this.calculateIntensity(level);

    // Apply contractions
    result = this.applyContractions(result, intensity, modifications);

    // Apply colloquialisms
    result = this.applyColloquialisms(result, intensity, modifications);

    // Add conversational phrases (at higher levels)
    if (level >= 3) {
      result = this.addConversationalPhrases(result, intensity, modifications);
    }

    // Vary sentence lengths for better burstiness (at all levels)
    result = this.varySentenceLengths(result, intensity, modifications);

    return { text: result, modifications };
  }

  isAppropriateFor(contentType: ContentType): boolean {
    return contentType === 'casual' || contentType === 'creative';
  }

  private calculateIntensity(level: HumanizationLevel): number {
    // Level 1: 20%, Level 5: 80%
    return 0.2 + (level - 1) * 0.15;
  }

  private applyContractions(
    text: string,
    intensity: number,
    modifications: StrategyModification[]
  ): string {
    let result = text;

    for (const [full, contracted] of Object.entries(CONTRACTIONS)) {
      const regex = new RegExp(`\\b${full}\\b`, 'gi');
      const matches = text.match(regex);
      
      if (matches) {
        const applyCount = Math.ceil(matches.length * intensity);
        let applied = 0;

        result = result.replace(regex, (match) => {
          if (applied < applyCount) {
            applied++;
            modifications.push({
              type: 'contraction',
              original: match,
              replacement: contracted,
              position: result.indexOf(match),
            });
            // Preserve original case for first letter
            if (match[0] === match[0]?.toUpperCase()) {
              return contracted.charAt(0).toUpperCase() + contracted.slice(1);
            }
            return contracted;
          }
          return match;
        });
      }
    }

    return result;
  }

  private applyColloquialisms(
    text: string,
    intensity: number,
    modifications: StrategyModification[]
  ): string {
    let result = text;

    for (const [formal, informal] of Object.entries(COLLOQUIALISMS)) {
      const regex = new RegExp(`\\b${formal}\\b`, 'gi');
      const matches = text.match(regex);
      
      if (matches) {
        const applyCount = Math.ceil(matches.length * intensity);
        let applied = 0;

        result = result.replace(regex, (match) => {
          if (applied < applyCount && informal.length > 0) {
            applied++;
            const replacement = informal[Math.floor(Math.random() * informal.length)] as string;
            modifications.push({
              type: 'colloquialism',
              original: match,
              replacement,
              position: result.indexOf(match),
            });
            // Preserve original case for first letter
            if (match[0] === match[0]?.toUpperCase()) {
              return replacement.charAt(0).toUpperCase() + replacement.slice(1);
            }
            return replacement;
          }
          return match;
        });
      }
    }

    return result;
  }

  private addConversationalPhrases(
    text: string,
    intensity: number,
    modifications: StrategyModification[]
  ): string {
    const sentences = text.split(/(?<=[.!?])\s+/);
    const phrasesToAdd = Math.ceil(sentences.length * intensity * 0.1);
    
    if (phrasesToAdd === 0 || sentences.length < 3) {
      return text;
    }

    // Select random sentences to add phrases to (not first or last)
    const eligibleIndices = sentences
      .map((_, i) => i)
      .filter(i => i > 0 && i < sentences.length - 1);
    
    const selectedIndices = new Set<number>();
    while (selectedIndices.size < Math.min(phrasesToAdd, eligibleIndices.length)) {
      const randomIndex = eligibleIndices[Math.floor(Math.random() * eligibleIndices.length)];
      if (randomIndex !== undefined) {
        selectedIndices.add(randomIndex);
      }
    }

    const result = sentences.map((sentence, index) => {
      if (selectedIndices.has(index)) {
        const phrase = CONVERSATIONAL_PHRASES[
          Math.floor(Math.random() * CONVERSATIONAL_PHRASES.length)
        ];
        if (phrase) {
          modifications.push({
            type: 'colloquialism',
            original: '',
            replacement: phrase,
            position: -1,
          });
          return `${phrase} ${sentence.charAt(0).toLowerCase()}${sentence.slice(1)}`;
        }
      }
      return sentence;
    });

    return result.join(' ');
  }

  /**
   * Varies sentence lengths to increase burstiness
   * Splits long sentences and combines short ones for more natural variation
   */
  private varySentenceLengths(
    text: string,
    intensity: number,
    modifications: StrategyModification[]
  ): string {
    const sentences = text.split(/(?<=[.!?])\s+/);
    if (sentences.length < 2) return text;

    const result: string[] = [];
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      if (!sentence) continue;
      
      const words = sentence.split(/\s+/);
      
      // Split very long sentences (>20 words) at natural break points
      if (words.length > 20 && Math.random() < intensity) {
        const breakPoints = [' and ', ' but ', ' which ', ' because ', ' although ', ' while '];
        let split = false;
        
        for (const bp of breakPoints) {
          if (sentence.includes(bp)) {
            const parts = sentence.split(bp);
            if (parts.length === 2 && parts[0] && parts[1]) {
              // Capitalize second part and add period to first
              const firstPart = parts[0].trim().replace(/[,;]$/, '') + '.';
              const secondPart = parts[1].trim().charAt(0).toUpperCase() + parts[1].trim().slice(1);
              result.push(firstPart);
              result.push(secondPart);
              modifications.push({
                type: 'structure',
                original: sentence,
                replacement: `${firstPart} ${secondPart}`,
                position: -1,
              });
              split = true;
              break;
            }
          }
        }
        
        if (!split) {
          result.push(sentence);
        }
      }
      // Combine very short sentences (< 5 words) with next sentence
      else if (words.length < 5 && i < sentences.length - 1 && Math.random() < intensity * 0.5) {
        const nextSentence = sentences[i + 1];
        if (nextSentence) {
          const combined = sentence.replace(/[.!?]$/, '') + ' — ' + nextSentence.charAt(0).toLowerCase() + nextSentence.slice(1);
          result.push(combined);
          modifications.push({
            type: 'structure',
            original: `${sentence} ${nextSentence}`,
            replacement: combined,
            position: -1,
          });
          i++; // Skip next sentence since we combined it
        } else {
          result.push(sentence);
        }
      }
      else {
        result.push(sentence);
      }
    }

    return result.join(' ');
  }
}


/**
 * Professional Strategy Implementation
 * Maintains formal tone while varying structure and word choice.
 * Requirements: 6.3
 */
export class ProfessionalStrategy implements ITransformationStrategy {
  readonly name: TransformStrategy = 'professional';

  transform(
    text: string,
    level: HumanizationLevel,
    _context: ChunkContext
  ): StrategyTransformResult {
    const modifications: StrategyModification[] = [];
    let result = text;

    // Calculate transformation intensity based on level
    const intensity = this.calculateIntensity(level);

    // Apply professional word alternatives
    result = this.applyProfessionalAlternatives(result, intensity, modifications);

    // Vary sentence structure
    result = this.varySentenceStructure(result, intensity, modifications);

    // Ensure formal tone is maintained
    result = this.ensureFormalTone(result, modifications);

    return { text: result, modifications };
  }

  isAppropriateFor(contentType: ContentType): boolean {
    return contentType === 'business' || contentType === 'technical';
  }

  private calculateIntensity(level: HumanizationLevel): number {
    // Level 1: 15%, Level 5: 70%
    return 0.15 + (level - 1) * 0.1375;
  }

  private applyProfessionalAlternatives(
    text: string,
    intensity: number,
    modifications: StrategyModification[]
  ): string {
    let result = text;

    for (const [simple, professional] of Object.entries(PROFESSIONAL_ALTERNATIVES)) {
      const regex = new RegExp(`\\b${simple}\\b`, 'gi');
      const matches = text.match(regex);
      
      if (matches) {
        const applyCount = Math.ceil(matches.length * intensity);
        let applied = 0;

        result = result.replace(regex, (match) => {
          if (applied < applyCount && professional.length > 0) {
            applied++;
            const replacement = professional[Math.floor(Math.random() * professional.length)] as string;
            modifications.push({
              type: 'word_choice',
              original: match,
              replacement,
              position: result.indexOf(match),
            });
            // Preserve original case for first letter
            if (match[0] === match[0]?.toUpperCase()) {
              return replacement.charAt(0).toUpperCase() + replacement.slice(1);
            }
            return replacement;
          }
          return match;
        });
      }
    }

    return result;
  }

  private varySentenceStructure(
    text: string,
    intensity: number,
    modifications: StrategyModification[]
  ): string {
    const sentences = text.split(/(?<=[.!?])\s+/);
    const sentencesToModify = Math.ceil(sentences.length * intensity * 0.3);
    
    if (sentencesToModify === 0) {
      return text;
    }

    // Select random sentences to restructure
    const eligibleIndices = sentences.map((_, i) => i);
    const selectedIndices = new Set<number>();
    
    while (selectedIndices.size < Math.min(sentencesToModify, eligibleIndices.length)) {
      const randomIndex = eligibleIndices[Math.floor(Math.random() * eligibleIndices.length)];
      if (randomIndex !== undefined) {
        selectedIndices.add(randomIndex);
      }
    }

    const result = sentences.map((sentence, index) => {
      if (selectedIndices.has(index)) {
        const restructured = this.restructureSentence(sentence);
        if (restructured !== sentence) {
          modifications.push({
            type: 'structure',
            original: sentence,
            replacement: restructured,
            position: -1,
          });
          return restructured;
        }
      }
      return sentence;
    });

    return result.join(' ');
  }

  private restructureSentence(sentence: string): string {
    // Simple restructuring: move adverbs or prepositional phrases
    const trimmed = sentence.trim();
    
    // Try to move "However," "Therefore," etc. to middle of sentence
    const starterWords = ['However,', 'Therefore,', 'Moreover,', 'Furthermore,', 'Additionally,'];
    for (const starter of starterWords) {
      if (trimmed.startsWith(starter)) {
        const rest = trimmed.slice(starter.length).trim();
        const words = rest.split(' ');
        if (words.length > 3) {
          // Move the connector word after the subject
          const subject = words.slice(0, 2).join(' ');
          const predicate = words.slice(2).join(' ');
          const connector = starter.replace(',', '').toLowerCase();
          return `${subject}, ${connector}, ${predicate}`;
        }
      }
    }

    return sentence;
  }

  private ensureFormalTone(
    text: string,
    modifications: StrategyModification[]
  ): string {
    let result = text;

    // Remove any contractions that might have slipped through
    for (const [full, contracted] of Object.entries(CONTRACTIONS)) {
      const regex = new RegExp(contracted.replace("'", "'"), 'gi');
      result = result.replace(regex, (match) => {
        modifications.push({
          type: 'formality',
          original: match,
          replacement: full,
          position: result.indexOf(match),
        });
        // Preserve original case for first letter
        if (match[0] === match[0]?.toUpperCase()) {
          return full.charAt(0).toUpperCase() + full.slice(1);
        }
        return full;
      });
    }

    return result;
  }
}

/**
 * Academic Strategy Implementation
 * Preserves scholarly language while introducing natural citation patterns and hedging language.
 * Requirements: 6.4
 */
export class AcademicStrategy implements ITransformationStrategy {
  readonly name: TransformStrategy = 'academic';

  transform(
    text: string,
    level: HumanizationLevel,
    _context: ChunkContext
  ): StrategyTransformResult {
    const modifications: StrategyModification[] = [];
    let result = text;

    // Calculate transformation intensity based on level
    const intensity = this.calculateIntensity(level);

    // Apply hedging language
    result = this.applyHedging(result, intensity, modifications);

    // Add citation patterns
    result = this.addCitationPatterns(result, intensity, modifications);

    // Ensure scholarly tone
    result = this.ensureScholarlyTone(result, intensity, modifications);

    return { text: result, modifications };
  }

  isAppropriateFor(contentType: ContentType): boolean {
    return contentType === 'academic';
  }

  private calculateIntensity(level: HumanizationLevel): number {
    // Level 1: 10%, Level 5: 60%
    return 0.1 + (level - 1) * 0.125;
  }

  private applyHedging(
    text: string,
    intensity: number,
    modifications: StrategyModification[]
  ): string {
    let result = text;

    for (const [absolute, hedged] of Object.entries(HEDGING_PHRASES)) {
      const regex = new RegExp(`\\b${absolute}\\b`, 'gi');
      const matches = text.match(regex);
      
      if (matches) {
        const applyCount = Math.ceil(matches.length * intensity);
        let applied = 0;

        result = result.replace(regex, (match) => {
          if (applied < applyCount && hedged.length > 0) {
            applied++;
            const replacement = hedged[Math.floor(Math.random() * hedged.length)] as string;
            modifications.push({
              type: 'hedging',
              original: match,
              replacement,
              position: result.indexOf(match),
            });
            // Preserve original case for first letter
            if (match[0] === match[0]?.toUpperCase()) {
              return replacement.charAt(0).toUpperCase() + replacement.slice(1);
            }
            return replacement;
          }
          return match;
        });
      }
    }

    return result;
  }

  private addCitationPatterns(
    text: string,
    intensity: number,
    modifications: StrategyModification[]
  ): string {
    const sentences = text.split(/(?<=[.!?])\s+/);
    const patternsToAdd = Math.ceil(sentences.length * intensity * 0.15);
    
    if (patternsToAdd === 0 || sentences.length < 4) {
      return text;
    }

    // Select random sentences to add citation patterns to
    const eligibleIndices = sentences
      .map((_, i) => i)
      .filter(i => i > 0 && i < sentences.length - 1);
    
    const selectedIndices = new Set<number>();
    while (selectedIndices.size < Math.min(patternsToAdd, eligibleIndices.length)) {
      const randomIndex = eligibleIndices[Math.floor(Math.random() * eligibleIndices.length)];
      if (randomIndex !== undefined) {
        selectedIndices.add(randomIndex);
      }
    }

    const result = sentences.map((sentence, index) => {
      if (selectedIndices.has(index)) {
        const pattern = CITATION_PATTERNS[
          Math.floor(Math.random() * CITATION_PATTERNS.length)
        ];
        if (pattern) {
          modifications.push({
            type: 'hedging',
            original: '',
            replacement: pattern,
            position: -1,
          });
          return `${pattern} ${sentence.charAt(0).toLowerCase()}${sentence.slice(1)}`;
        }
      }
      return sentence;
    });

    return result.join(' ');
  }

  private ensureScholarlyTone(
    text: string,
    intensity: number,
    modifications: StrategyModification[]
  ): string {
    let result = text;

    // Apply professional alternatives for scholarly tone
    for (const [simple, scholarly] of Object.entries(PROFESSIONAL_ALTERNATIVES)) {
      const regex = new RegExp(`\\b${simple}\\b`, 'gi');
      const matches = text.match(regex);
      
      if (matches) {
        const applyCount = Math.ceil(matches.length * intensity * 0.5);
        let applied = 0;

        result = result.replace(regex, (match) => {
          if (applied < applyCount && scholarly.length > 0) {
            applied++;
            const replacement = scholarly[Math.floor(Math.random() * scholarly.length)] as string;
            modifications.push({
              type: 'word_choice',
              original: match,
              replacement,
              position: result.indexOf(match),
            });
            // Preserve original case for first letter
            if (match[0] === match[0]?.toUpperCase()) {
              return replacement.charAt(0).toUpperCase() + replacement.slice(1);
            }
            return replacement;
          }
          return match;
        });
      }
    }

    return result;
  }
}

/**
 * Strategy Selector
 * Automatically selects the most appropriate strategy based on content type.
 * Requirements: 6.5
 */
export class StrategySelector {
  private strategies: Map<TransformStrategy, ITransformationStrategy>;

  constructor() {
    this.strategies = new Map();
    this.strategies.set('casual', new CasualStrategy());
    this.strategies.set('professional', new ProfessionalStrategy());
    this.strategies.set('academic', new AcademicStrategy());
  }

  /**
   * Get a strategy by name
   */
  getStrategy(name: TransformStrategy): ITransformationStrategy {
    if (name === 'auto') {
      throw new Error('Use selectStrategy() for automatic strategy selection');
    }
    
    const strategy = this.strategies.get(name);
    if (!strategy) {
      throw new Error(`Unknown strategy: ${name}`);
    }
    return strategy;
  }

  /**
   * Automatically select the most appropriate strategy based on content type
   * Requirements: 6.5
   */
  selectStrategy(contentType: ContentType): ITransformationStrategy {
    // Find the most appropriate strategy for the content type
    for (const strategy of this.strategies.values()) {
      if (strategy.isAppropriateFor(contentType)) {
        return strategy;
      }
    }

    // Default to professional strategy
    return this.strategies.get('professional') as ITransformationStrategy;
  }

  /**
   * Get all available strategies
   */
  getAvailableStrategies(): TransformStrategy[] {
    return Array.from(this.strategies.keys());
  }
}

/**
 * Create a new StrategySelector instance
 */
export function createStrategySelector(): StrategySelector {
  return new StrategySelector();
}

/**
 * Create a specific strategy by name
 */
export function createStrategy(name: TransformStrategy): ITransformationStrategy {
  switch (name) {
    case 'casual':
      return new CasualStrategy();
    case 'professional':
      return new ProfessionalStrategy();
    case 'academic':
      return new AcademicStrategy();
    case 'auto':
      throw new Error('Use createStrategySelector() for automatic strategy selection');
    default:
      throw new Error(`Unknown strategy: ${name}`);
  }
}
