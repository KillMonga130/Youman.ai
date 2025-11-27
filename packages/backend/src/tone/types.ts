/**
 * Tone and Sentiment Analysis Service Types
 * Type definitions for sentiment analysis, tone adjustment, and emotional detection
 * Requirements: 32, 47, 108, 116
 */

/**
 * Overall sentiment classification
 */
export type SentimentType = 'positive' | 'negative' | 'neutral';

/**
 * Tone categories for text classification
 */
export type ToneCategory = 
  | 'formal'
  | 'informal'
  | 'professional'
  | 'casual'
  | 'academic'
  | 'conversational'
  | 'persuasive'
  | 'informative'
  | 'enthusiastic'
  | 'neutral';

/**
 * Emotional dimensions detected in text
 */
export interface EmotionScores {
  /** Joy/happiness level (0-1) */
  joy: number;
  /** Sadness level (0-1) */
  sadness: number;
  /** Anger level (0-1) */
  anger: number;
  /** Fear/anxiety level (0-1) */
  fear: number;
  /** Surprise level (0-1) */
  surprise: number;
  /** Trust/confidence level (0-1) */
  trust: number;
  /** Anticipation/expectation level (0-1) */
  anticipation: number;
  /** Disgust level (0-1) */
  disgust: number;
}

/**
 * Sentiment analysis result
 * Requirement 32: Tone adjustment capabilities
 */
export interface SentimentAnalysis {
  /** Unique analysis identifier */
  id: string;
  /** Overall sentiment classification */
  overall: SentimentType;
  /** Emotional dimension scores */
  emotions: EmotionScores;
  /** Overall intensity of sentiment (0-1) */
  intensity: number;
  /** Confidence score for the analysis (0-1) */
  confidence: number;
  /** Detected tone category */
  tone: ToneCategory;
  /** Analysis timestamp */
  timestamp: Date;
  /** Word count of analyzed text */
  wordCount: number;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Tone adjustment configuration
 * Requirement 32: Shift emotional tone of content
 */
export interface ToneAdjustment {
  /** Source tone to transform from */
  from: ToneCategory;
  /** Target tone to transform to */
  to: ToneCategory;
  /** Adjustment intensity (0-100) */
  intensity: number;
  /** Whether to preserve key phrases */
  preserveKeyPhrases?: boolean;
  /** Specific emotions to enhance */
  enhanceEmotions?: (keyof EmotionScores)[];
  /** Specific emotions to reduce */
  reduceEmotions?: (keyof EmotionScores)[];
}

/**
 * Tone adjustment result
 */
export interface ToneAdjustmentResult {
  /** Whether adjustment was successful */
  success: boolean;
  /** Original text */
  originalText: string;
  /** Adjusted text */
  adjustedText: string;
  /** Original sentiment analysis */
  originalSentiment: SentimentAnalysis;
  /** New sentiment analysis after adjustment */
  newSentiment: SentimentAnalysis;
  /** Changes made during adjustment */
  changes: ToneChange[];
  /** Processing time in milliseconds */
  processingTimeMs: number;
  /** Error message if failed */
  error?: string;
}

/**
 * Individual tone change made during adjustment
 */
export interface ToneChange {
  /** Original phrase */
  original: string;
  /** Replacement phrase */
  replacement: string;
  /** Start position in original text */
  startPosition: number;
  /** End position in original text */
  endPosition: number;
  /** Reason for the change */
  reason: string;
}

/**
 * Emotional profile of text
 * Requirement 108: Emotional dimension detection
 */
export interface EmotionalProfile {
  /** Unique profile identifier */
  id: string;
  /** Primary emotion detected */
  primaryEmotion: keyof EmotionScores;
  /** Secondary emotion detected */
  secondaryEmotion: keyof EmotionScores | null;
  /** All emotion scores */
  emotions: EmotionScores;
  /** Emotional arc throughout the text (for longer texts) */
  emotionalArc: EmotionalArcPoint[];
  /** Overall emotional intensity (0-1) */
  overallIntensity: number;
  /** Emotional stability score (0-1, higher = more consistent) */
  stability: number;
  /** Dominant emotional valence */
  valence: 'positive' | 'negative' | 'mixed' | 'neutral';
  /** Analysis timestamp */
  timestamp: Date;
}

/**
 * Point in the emotional arc of a text
 */
export interface EmotionalArcPoint {
  /** Position in text (0-1, representing percentage through text) */
  position: number;
  /** Emotion scores at this point */
  emotions: EmotionScores;
  /** Dominant emotion at this point */
  dominantEmotion: keyof EmotionScores;
  /** Sentence or paragraph index */
  segmentIndex: number;
}

/**
 * Tone consistency report
 * Requirement 116: Tone consistency validation
 */
export interface ConsistencyReport {
  /** Unique report identifier */
  id: string;
  /** Whether the tone is consistent throughout */
  isConsistent: boolean;
  /** Overall consistency score (0-1) */
  consistencyScore: number;
  /** Detected tone shifts */
  toneShifts: ToneShift[];
  /** Recommendations for improving consistency */
  recommendations: string[];
  /** Segments with inconsistent tone */
  inconsistentSegments: InconsistentSegment[];
  /** Analysis timestamp */
  timestamp: Date;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Detected tone shift in text
 */
export interface ToneShift {
  /** Position where shift occurs (character index) */
  position: number;
  /** Tone before the shift */
  fromTone: ToneCategory;
  /** Tone after the shift */
  toTone: ToneCategory;
  /** Severity of the shift (0-1) */
  severity: number;
  /** Text segment where shift occurs */
  segment: string;
  /** Segment index */
  segmentIndex: number;
}

/**
 * Segment with inconsistent tone
 */
export interface InconsistentSegment {
  /** Segment text */
  text: string;
  /** Start position */
  startPosition: number;
  /** End position */
  endPosition: number;
  /** Expected tone based on context */
  expectedTone: ToneCategory;
  /** Actual detected tone */
  actualTone: ToneCategory;
  /** Suggestion for fixing */
  suggestion: string;
}

/**
 * Sentiment targeting controls
 * Requirement 47: Sentiment targeting
 */
export interface SentimentTarget {
  /** Target sentiment type */
  targetSentiment: SentimentType;
  /** Target emotion profile */
  targetEmotions?: Partial<EmotionScores>;
  /** Target intensity (0-1) */
  targetIntensity: number;
  /** Allowed deviation from target (0-1) */
  tolerance: number;
}

/**
 * Sentiment targeting result
 */
export interface SentimentTargetResult {
  /** Whether targeting was successful */
  success: boolean;
  /** Original text */
  originalText: string;
  /** Transformed text */
  transformedText: string;
  /** Target that was aimed for */
  target: SentimentTarget;
  /** Achieved sentiment analysis */
  achievedSentiment: SentimentAnalysis;
  /** How close we got to the target (0-1) */
  targetAccuracy: number;
  /** Processing time in milliseconds */
  processingTimeMs: number;
  /** Error message if failed */
  error?: string;
}

/**
 * Tone analysis options
 */
export interface ToneAnalysisOptions {
  /** Whether to include emotional arc analysis */
  includeEmotionalArc?: boolean;
  /** Number of segments for arc analysis */
  arcSegments?: number;
  /** Whether to include detailed emotion breakdown */
  detailedEmotions?: boolean;
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Tone adjustment options
 */
export interface ToneAdjustmentOptions {
  /** Maximum percentage of text to modify (0-100) */
  maxModificationPercent?: number;
  /** Whether to preserve sentence structure */
  preserveStructure?: boolean;
  /** Whether to preserve technical terms */
  preserveTechnicalTerms?: boolean;
  /** Custom word replacements */
  customReplacements?: Record<string, string>;
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Tone service configuration
 */
export interface ToneServiceConfig {
  /** Default timeout in milliseconds */
  defaultTimeout: number;
  /** Default arc segments for emotional arc analysis */
  defaultArcSegments: number;
  /** Minimum text length for analysis (in words) */
  minTextLength: number;
  /** Maximum text length for single analysis (in words) */
  maxTextLength: number;
  /** Consistency threshold (0-1) */
  consistencyThreshold: number;
}

/**
 * Lexicon entry for sentiment analysis
 */
export interface LexiconEntry {
  /** Word or phrase */
  term: string;
  /** Sentiment score (-1 to 1) */
  sentiment: number;
  /** Emotion associations */
  emotions: Partial<EmotionScores>;
  /** Intensity modifier */
  intensity: number;
}

/**
 * Tone transformation rule
 */
export interface ToneTransformationRule {
  /** Pattern to match */
  pattern: RegExp;
  /** Replacement function or string */
  replacement: string | ((match: string) => string);
  /** Source tones this rule applies to */
  fromTones: ToneCategory[];
  /** Target tones this rule produces */
  toTones: ToneCategory[];
  /** Priority (higher = applied first) */
  priority: number;
}
