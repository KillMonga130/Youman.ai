/**
 * Expansion Service Types
 * Type definitions for content expansion from outlines and bullet points
 * Requirements: 79
 */

/**
 * Expansion level options (1-5)
 * 1 = minimal expansion, 5 = maximum expansion
 */
export type ExpansionLevel = 1 | 2 | 3 | 4 | 5;

/**
 * Content style for expansion
 */
export type ExpansionStyle = 'formal' | 'casual' | 'technical' | 'academic';

/**
 * Outline item structure
 */
export interface OutlineItem {
  /** Item text/title */
  text: string;
  /** Nesting level (0 = top level) */
  level: number;
  /** Child items */
  children?: OutlineItem[];
}

/**
 * Parsed outline structure
 */
export interface ParsedOutline {
  /** Title of the outline (if present) */
  title?: string;
  /** Root level items */
  items: OutlineItem[];
  /** Total item count */
  totalItems: number;
  /** Maximum nesting depth */
  maxDepth: number;
}

/**
 * Expanded section result
 */
export interface ExpandedSection {
  /** Original outline item text */
  originalText: string;
  /** Expanded content */
  expandedContent: string;
  /** Word count of expanded content */
  wordCount: number;
  /** Nesting level */
  level: number;
  /** Section index */
  index: number;
}

/**
 * Outline expansion request
 */
export interface OutlineExpansionRequest {
  /** Outline text to expand */
  outline: string;
  /** Expansion level (1-5) */
  expansionLevel: ExpansionLevel;
  /** Target style */
  style?: ExpansionStyle;
  /** Include transitions between sections */
  includeTransitions?: boolean;
  /** Preserve original headings */
  preserveHeadings?: boolean;
  /** Target word count per section (approximate) */
  targetWordsPerSection?: number;
}

/**
 * Outline expansion result
 */
export interface OutlineExpansionResult {
  /** Unique result identifier */
  id: string;
  /** Original outline */
  originalOutline: string;
  /** Parsed outline structure */
  parsedOutline: ParsedOutline;
  /** Fully expanded content */
  expandedContent: string;
  /** Individual expanded sections */
  sections: ExpandedSection[];
  /** Expansion level applied */
  expansionLevel: ExpansionLevel;
  /** Style applied */
  style: ExpansionStyle;
  /** Original word count */
  originalWordCount: number;
  /** Expanded word count */
  expandedWordCount: number;
  /** Expansion ratio (expanded / original) */
  expansionRatio: number;
  /** Processing timestamp */
  timestamp: Date;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Bullet point expansion request
 */
export interface BulletPointExpansionRequest {
  /** Array of bullet points to expand */
  bullets: string[];
  /** Detail level (1-5) */
  detailLevel: ExpansionLevel;
  /** Target style */
  style?: ExpansionStyle;
  /** Include examples in expansion */
  includeExamples?: boolean;
  /** Include explanations */
  includeExplanations?: boolean;
  /** Target words per bullet */
  targetWordsPerBullet?: number;
}

/**
 * Expanded bullet point
 */
export interface ExpandedBullet {
  /** Original bullet text */
  originalBullet: string;
  /** Expanded content */
  expandedContent: string;
  /** Word count */
  wordCount: number;
  /** Index in original array */
  index: number;
  /** Examples added (if requested) */
  examples?: string[];
}

/**
 * Bullet point expansion result
 */
export interface BulletPointExpansionResult {
  /** Unique result identifier */
  id: string;
  /** Original bullets */
  originalBullets: string[];
  /** Expanded bullets */
  expandedBullets: ExpandedBullet[];
  /** Combined expanded content */
  combinedContent: string;
  /** Detail level applied */
  detailLevel: ExpansionLevel;
  /** Style applied */
  style: ExpansionStyle;
  /** Original total word count */
  originalWordCount: number;
  /** Expanded total word count */
  expandedWordCount: number;
  /** Expansion ratio */
  expansionRatio: number;
  /** Processing timestamp */
  timestamp: Date;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Coherence maintenance request
 */
export interface CoherenceRequest {
  /** Array of expanded sections to make coherent */
  expandedSections: string[];
  /** Add transitions between sections */
  addTransitions?: boolean;
  /** Ensure consistent tone */
  ensureConsistentTone?: boolean;
  /** Target style for consistency */
  targetStyle?: ExpansionStyle;
}

/**
 * Coherence result
 */
export interface CoherenceResult {
  /** Unique result identifier */
  id: string;
  /** Original sections */
  originalSections: string[];
  /** Coherent combined content */
  coherentContent: string;
  /** Transitions added */
  transitionsAdded: number;
  /** Tone adjustments made */
  toneAdjustments: number;
  /** Word count */
  wordCount: number;
  /** Processing timestamp */
  timestamp: Date;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Expansion service configuration
 */
export interface ExpansionConfig {
  /** Default expansion level */
  defaultExpansionLevel: ExpansionLevel;
  /** Default style */
  defaultStyle: ExpansionStyle;
  /** Minimum input length */
  minInputLength: number;
  /** Maximum input length */
  maxInputLength: number;
  /** Default target words per section */
  defaultTargetWordsPerSection: number;
  /** Processing timeout in milliseconds */
  timeout: number;
}

/**
 * Level configuration for expansion targets
 */
export interface LevelConfig {
  /** Expansion level */
  level: ExpansionLevel;
  /** Target expansion multiplier */
  multiplier: number;
  /** Minimum sentences per section */
  minSentences: number;
  /** Maximum sentences per section */
  maxSentences: number;
  /** Description */
  description: string;
}
