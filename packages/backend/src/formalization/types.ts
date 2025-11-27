/**
 * Content Formalization Service Types
 * Type definitions for content formalization including contraction expansion,
 * slang replacement, sentence restructuring, and hedging language
 * Requirements: 107
 */

/**
 * Formalization level targets
 */
export type FormalizationLevel =
  | 'casual'       // Minimal formalization
  | 'standard'     // Moderate formalization
  | 'professional' // Business/professional level
  | 'academic'     // Academic/scholarly level
  | 'legal';       // Legal/formal documents

/**
 * Formalization strategy types
 */
export type FormalizationStrategy =
  | 'contraction-expansion'
  | 'slang-replacement'
  | 'sentence-restructuring'
  | 'hedging-language'
  | 'comprehensive';

/**
 * Contraction with its expanded form
 */
export interface ContractionMapping {
  /** The contracted form */
  contraction: string;
  /** The expanded form */
  expansion: string;
  /** Whether it's commonly used */
  common: boolean;
}

/**
 * Contraction expansion result
 */
export interface ContractionExpansion {
  /** Original contraction */
  original: string;
  /** Expanded form */
  expanded: string;
  /** Position in text */
  position: number;
  /** End position in text */
  endPosition: number;
}

/**
 * Slang term with formal replacement
 */
export interface SlangTerm {
  /** The slang term */
  term: string;
  /** Formal replacement */
  formalReplacement: string;
  /** Category of slang */
  category: string;
  /** Informality level (1-5) */
  informalityLevel: number;
}

/**
 * Slang replacement result
 */
export interface SlangReplacement {
  /** Original slang term */
  original: string;
  /** Formal replacement */
  replacement: string;
  /** Position in text */
  position: number;
  /** End position in text */
  endPosition: number;
  /** Category of slang */
  category: string;
}

/**
 * Sentence restructuring result
 */
export interface SentenceRestructuring {
  /** Original sentence */
  original: string;
  /** Restructured sentence */
  restructured: string;
  /** Position in text */
  position: number;
  /** End position in text */
  endPosition: number;
  /** Reason for restructuring */
  reason: string;
  /** Original sophistication score */
  originalSophistication: number;
  /** New sophistication score */
  newSophistication: number;
}

/**
 * Hedging phrase addition
 */
export interface HedgingAddition {
  /** Original phrase/sentence */
  original: string;
  /** Modified phrase with hedging */
  hedged: string;
  /** Position in text */
  position: number;
  /** End position in text */
  endPosition: number;
  /** Type of hedging applied */
  hedgingType: HedgingType;
  /** Hedging phrase used */
  hedgingPhrase: string;
}

/**
 * Types of hedging language
 */
export type HedgingType =
  | 'epistemic'     // Expressing uncertainty (may, might, could)
  | 'evidential'    // Citing evidence (according to, research suggests)
  | 'approximator'  // Softening claims (approximately, roughly)
  | 'shield'        // Distancing (it appears, it seems)
  | 'attribution';  // Attributing to sources (studies indicate)

/**
 * Formalization analysis result
 */
export interface FormalizationAnalysis {
  /** Current formality level */
  currentLevel: FormalizationLevel;
  /** Formality score (0-100) */
  formalityScore: number;
  /** Number of contractions found */
  contractionCount: number;
  /** Number of slang terms found */
  slangCount: number;
  /** Number of informal phrases found */
  informalPhraseCount: number;
  /** Sentence sophistication score (0-100) */
  sophisticationScore: number;
  /** Academic hedging score (0-100) */
  hedgingScore: number;
  /** Word count */
  wordCount: number;
  /** Sentence count */
  sentenceCount: number;
}

/**
 * Formalization request
 */
export interface FormalizationRequest {
  /** Text to formalize */
  text: string;
  /** Target formalization level */
  targetLevel: FormalizationLevel;
  /** Formalization strategies to apply */
  strategies?: FormalizationStrategy[];
  /** Whether to add hedging language */
  addHedging?: boolean;
  /** Hedging intensity (0-1) */
  hedgingIntensity?: number;
  /** Maximum formalization intensity (0-1) */
  intensity?: number;
  /** Terms to preserve (not formalize) */
  preserveTerms?: string[];
  /** Custom slang replacements */
  customReplacements?: Record<string, string>;
}

/**
 * Formalization result
 */
export interface FormalizationResult {
  /** Unique result identifier */
  id: string;
  /** Original text */
  originalText: string;
  /** Formalized text */
  formalizedText: string;
  /** Target formalization level */
  targetLevel: FormalizationLevel;
  /** Original formalization analysis */
  originalAnalysis: FormalizationAnalysis;
  /** New formalization analysis */
  newAnalysis: FormalizationAnalysis;
  /** Contraction expansions made */
  contractionExpansions: ContractionExpansion[];
  /** Slang replacements made */
  slangReplacements: SlangReplacement[];
  /** Sentence restructurings made */
  sentenceRestructurings: SentenceRestructuring[];
  /** Hedging additions made */
  hedgingAdditions: HedgingAddition[];
  /** Total changes made */
  totalChanges: number;
  /** Improvement metrics */
  improvement: FormalizationImprovement;
  /** Processing timestamp */
  timestamp: Date;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Formalization improvement metrics
 */
export interface FormalizationImprovement {
  /** Formality score improvement */
  formalityScoreImprovement: number;
  /** Sophistication score improvement */
  sophisticationScoreImprovement: number;
  /** Percentage of text formalized */
  percentageFormalized: number;
  /** Number of contractions expanded */
  contractionsExpanded: number;
  /** Number of slang terms replaced */
  slangTermsReplaced: number;
  /** Number of sentences restructured */
  sentencesRestructured: number;
  /** Number of hedging phrases added */
  hedgingPhrasesAdded: number;
  /** Whether target level was achieved */
  targetAchieved: boolean;
}

/**
 * Slang detection result
 */
export interface SlangDetectionResult {
  /** Unique result identifier */
  id: string;
  /** Original text */
  text: string;
  /** Detected slang terms */
  detectedTerms: DetectedSlang[];
  /** Total slang count */
  totalSlang: number;
  /** Slang density (slang per 100 words) */
  slangDensity: number;
  /** Categories of slang found */
  categories: string[];
  /** Processing timestamp */
  timestamp: Date;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Detected slang term
 */
export interface DetectedSlang {
  /** The slang term */
  term: string;
  /** Position in text */
  position: number;
  /** End position in text */
  endPosition: number;
  /** Category of slang */
  category: string;
  /** Informality level (1-5) */
  informalityLevel: number;
  /** Suggested formal replacement */
  suggestedReplacement: string;
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Formalization service configuration
 */
export interface FormalizationConfig {
  /** Default target formalization level */
  defaultTargetLevel: FormalizationLevel;
  /** Default formalization intensity */
  defaultIntensity: number;
  /** Default hedging intensity */
  defaultHedgingIntensity: number;
  /** Minimum text length for processing */
  minTextLength: number;
  /** Maximum text length for processing */
  maxTextLength: number;
  /** Processing timeout in milliseconds */
  timeout: number;
}

/**
 * Formalization level configuration
 */
export interface FormalizationLevelConfig {
  /** Formalization level name */
  level: FormalizationLevel;
  /** Minimum formality score */
  minFormalityScore: number;
  /** Target formality score */
  targetFormalityScore: number;
  /** Description */
  description: string;
  /** Whether to expand contractions */
  expandContractions: boolean;
  /** Whether to replace slang */
  replaceSlang: boolean;
  /** Whether to add hedging */
  addHedging: boolean;
}
