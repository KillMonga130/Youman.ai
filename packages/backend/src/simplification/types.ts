/**
 * Content Simplification Service Types
 * Type definitions for content simplification including jargon replacement,
 * sentence simplification, inline definitions, and reading level targeting
 * Requirements: 106
 */

/**
 * Reading level targets based on grade levels
 */
export type ReadingLevel = 
  | 'elementary'    // Grades 1-5 (ages 6-11)
  | 'middle-school' // Grades 6-8 (ages 11-14)
  | 'high-school'   // Grades 9-12 (ages 14-18)
  | 'college'       // Undergraduate level
  | 'professional'; // Graduate/professional level

/**
 * Simplification strategy types
 */
export type SimplificationStrategy = 
  | 'jargon-replacement'
  | 'sentence-simplification'
  | 'inline-definitions'
  | 'comprehensive';

/**
 * Jargon term with replacement
 */
export interface JargonTerm {
  /** The jargon term */
  term: string;
  /** Simple replacement */
  simpleReplacement: string;
  /** Definition of the term */
  definition: string;
  /** Category/domain of the jargon */
  category: string;
  /** Complexity level (1-5) */
  complexityLevel: number;
}

/**
 * Jargon replacement result
 */
export interface JargonReplacement {
  /** Original jargon term */
  original: string;
  /** Simplified replacement */
  replacement: string;
  /** Position in text */
  position: number;
  /** End position in text */
  endPosition: number;
  /** Definition provided */
  definition: string;
  /** Category of jargon */
  category: string;
}

/**
 * Sentence simplification result
 */
export interface SentenceSimplification {
  /** Original sentence */
  original: string;
  /** Simplified sentence */
  simplified: string;
  /** Position in text */
  position: number;
  /** End position in text */
  endPosition: number;
  /** Reason for simplification */
  reason: string;
  /** Original complexity score */
  originalComplexity: number;
  /** New complexity score */
  newComplexity: number;
}

/**
 * Inline definition added to text
 */
export interface InlineDefinition {
  /** Term being defined */
  term: string;
  /** Definition text */
  definition: string;
  /** Position where definition was added */
  position: number;
  /** Format of the inline definition */
  format: 'parenthetical' | 'appositive' | 'footnote';
}

/**
 * Reading level analysis result
 */
export interface ReadingLevelAnalysis {
  /** Current reading level */
  currentLevel: ReadingLevel;
  /** Flesch-Kincaid grade level */
  fleschKincaidGrade: number;
  /** Flesch reading ease score (0-100) */
  fleschReadingEase: number;
  /** Gunning fog index */
  gunningFogIndex: number;
  /** Average sentence length */
  averageSentenceLength: number;
  /** Average syllables per word */
  averageSyllablesPerWord: number;
  /** Percentage of complex words */
  complexWordPercentage: number;
  /** Total word count */
  wordCount: number;
  /** Total sentence count */
  sentenceCount: number;
}

/**
 * Simplification request
 */
export interface SimplificationRequest {
  /** Text to simplify */
  text: string;
  /** Target reading level */
  targetLevel: ReadingLevel;
  /** Simplification strategies to apply */
  strategies?: SimplificationStrategy[];
  /** Whether to add inline definitions */
  addDefinitions?: boolean;
  /** Definition format preference */
  definitionFormat?: 'parenthetical' | 'appositive' | 'footnote';
  /** Maximum simplification intensity (0-1) */
  intensity?: number;
  /** Terms to preserve (not simplify) */
  preserveTerms?: string[];
  /** Custom jargon replacements */
  customReplacements?: Record<string, string>;
}

/**
 * Simplification result
 */
export interface SimplificationResult {
  /** Unique result identifier */
  id: string;
  /** Original text */
  originalText: string;
  /** Simplified text */
  simplifiedText: string;
  /** Target reading level */
  targetLevel: ReadingLevel;
  /** Original reading level analysis */
  originalAnalysis: ReadingLevelAnalysis;
  /** New reading level analysis */
  newAnalysis: ReadingLevelAnalysis;
  /** Jargon replacements made */
  jargonReplacements: JargonReplacement[];
  /** Sentence simplifications made */
  sentenceSimplifications: SentenceSimplification[];
  /** Inline definitions added */
  inlineDefinitions: InlineDefinition[];
  /** Total changes made */
  totalChanges: number;
  /** Improvement metrics */
  improvement: SimplificationImprovement;
  /** Processing timestamp */
  timestamp: Date;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Simplification improvement metrics
 */
export interface SimplificationImprovement {
  /** Grade level reduction */
  gradeLevelReduction: number;
  /** Reading ease improvement */
  readingEaseImprovement: number;
  /** Percentage of text simplified */
  percentageSimplified: number;
  /** Number of jargon terms replaced */
  jargonTermsReplaced: number;
  /** Number of sentences simplified */
  sentencesSimplified: number;
  /** Number of definitions added */
  definitionsAdded: number;
  /** Whether target level was achieved */
  targetAchieved: boolean;
}

/**
 * Jargon detection result
 */
export interface JargonDetectionResult {
  /** Unique result identifier */
  id: string;
  /** Original text */
  text: string;
  /** Detected jargon terms */
  detectedTerms: DetectedJargon[];
  /** Total jargon count */
  totalJargon: number;
  /** Jargon density (jargon per 100 words) */
  jargonDensity: number;
  /** Categories of jargon found */
  categories: string[];
  /** Processing timestamp */
  timestamp: Date;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Detected jargon term
 */
export interface DetectedJargon {
  /** The jargon term */
  term: string;
  /** Position in text */
  position: number;
  /** End position in text */
  endPosition: number;
  /** Category of jargon */
  category: string;
  /** Complexity level (1-5) */
  complexityLevel: number;
  /** Suggested replacement */
  suggestedReplacement: string;
  /** Definition */
  definition: string;
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Simplification service configuration
 */
export interface SimplificationConfig {
  /** Default target reading level */
  defaultTargetLevel: ReadingLevel;
  /** Default simplification intensity */
  defaultIntensity: number;
  /** Default definition format */
  defaultDefinitionFormat: 'parenthetical' | 'appositive' | 'footnote';
  /** Minimum text length for processing */
  minTextLength: number;
  /** Maximum text length for processing */
  maxTextLength: number;
  /** Processing timeout in milliseconds */
  timeout: number;
}

/**
 * Reading level grade ranges
 */
export interface ReadingLevelRange {
  /** Reading level name */
  level: ReadingLevel;
  /** Minimum grade level */
  minGrade: number;
  /** Maximum grade level */
  maxGrade: number;
  /** Target Flesch reading ease */
  targetFleschEase: number;
  /** Description */
  description: string;
}
