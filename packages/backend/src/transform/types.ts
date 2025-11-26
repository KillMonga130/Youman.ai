/**
 * Type definitions for the transformation pipeline
 * Requirements: 1, 11, 12, 57
 */

import { TextMetrics, ProtectedSegment, ContentType } from '../analysis/types';

/** Transformation strategy types */
export type TransformStrategy = 'casual' | 'professional' | 'academic' | 'auto';

/** Humanization level (1-5) */
export type HumanizationLevel = 1 | 2 | 3 | 4 | 5;

/** Transformation job status */
export type TransformStatus = 
  | 'pending'
  | 'analyzing'
  | 'chunking'
  | 'processing'
  | 'assembling'
  | 'completed'
  | 'failed'
  | 'paused'
  | 'cancelled';

/** Custom transformation settings */
export interface CustomSettings {
  /** Preserve specific formatting */
  preserveFormatting?: boolean;
  /** Custom vocabulary preferences */
  vocabularyPreferences?: {
    preferred: string[];
    avoided: string[];
  };
  /** Tone preferences */
  tonePreferences?: {
    formality: number; // 0-100
    enthusiasm: number; // 0-100
  };
  /** SEO keywords to preserve */
  seoKeywords?: string[];
}

/** Transform request input */
export interface TransformRequest {
  /** Unique identifier for the transformation job */
  id?: string;
  /** The text to transform */
  text: string;
  /** Humanization level (1-5, default: 3) */
  level?: HumanizationLevel;
  /** Transformation strategy */
  strategy?: TransformStrategy;
  /** Protected segment delimiters */
  protectedDelimiters?: Array<{ open: string; close: string }>;
  /** Language code (auto-detected if not provided) */
  language?: string;
  /** Custom transformation settings */
  customSettings?: CustomSettings;
  /** Project ID for tracking */
  projectId?: string;
  /** User ID for tracking */
  userId?: string;
  /** Whether to enable resumable processing */
  resumable?: boolean;
}

/** Detection scores from various AI detectors */
export interface DetectionScores {
  /** GPTZero detection score (0-100) */
  gptZero?: number;
  /** Originality.ai detection score (0-100) */
  originality?: number;
  /** Turnitin detection score (0-100) */
  turnitin?: number;
  /** Internal detection model score (0-100) */
  internal?: number;
  /** Aggregated average score */
  average: number;
}

/** Transformation metrics */
export interface TransformMetrics {
  /** Before transformation metrics */
  before: TextMetrics;
  /** After transformation metrics */
  after: TextMetrics;
  /** Percentage of text modified */
  modificationPercentage: number;
  /** Number of sentences modified */
  sentencesModified: number;
  /** Total sentences */
  totalSentences: number;
}

/** Transform result output */
export interface TransformResult {
  /** Unique identifier for the transformation */
  id: string;
  /** The humanized text */
  humanizedText: string;
  /** Transformation metrics */
  metrics: TransformMetrics;
  /** Detection scores (if tested) */
  detectionScores?: DetectionScores;
  /** Total processing time in milliseconds */
  processingTime: number;
  /** Number of chunks processed */
  chunksProcessed: number;
  /** Total chunks */
  totalChunks: number;
  /** Strategy used */
  strategyUsed: TransformStrategy;
  /** Level applied */
  levelApplied: HumanizationLevel;
  /** Protected segments preserved */
  protectedSegmentsPreserved: number;
  /** Detected content type */
  contentType: ContentType;
  /** Detected language */
  language: string;
}

/** Chunk for processing */
export interface TransformChunk {
  /** Chunk index (0-based) */
  index: number;
  /** Total number of chunks */
  totalChunks: number;
  /** Chunk content */
  content: string;
  /** Transformed content (after processing) */
  transformedContent?: string | undefined;
  /** Start offset in original text */
  startOffset: number;
  /** End offset in original text */
  endOffset: number;
  /** Word count */
  wordCount: number;
  /** Chapter index (if applicable) */
  chapterIndex?: number | undefined;
  /** Processing status */
  status: 'pending' | 'processing' | 'completed' | 'failed';
  /** Context for this chunk */
  context: ChunkContext;
  /** Processing time in ms */
  processingTimeMs?: number | undefined;
  /** Error message if failed */
  errorMessage?: string | undefined;
}

/** Context preserved across chunks */
export interface ChunkContext {
  /** Previous sentences for context continuity */
  previousSentences: string[];
  /** Character voices for fiction (character name -> voice description) */
  characterVoices?: Record<string, string> | undefined;
  /** Narrator voice description */
  narratorVoice?: string | undefined;
  /** Identified themes */
  themes: string[];
  /** Key terms to maintain consistency */
  keyTerms: string[];
  /** Style profile reference */
  styleProfile?: StyleProfile | undefined;
  /** Protected segments in this chunk */
  protectedSegments: ProtectedSegment[];
}

/** Style profile for consistency */
export interface StyleProfile {
  /** Formality level (0-100) */
  formality: number;
  /** Vocabulary complexity (0-100) */
  vocabularyComplexity: number;
  /** Average sentence length */
  averageSentenceLength: number;
  /** Sentence length variation */
  sentenceLengthVariation: number;
  /** Common phrases used */
  commonPhrases: string[];
  /** Tone characteristics */
  tone: 'neutral' | 'positive' | 'negative' | 'formal' | 'casual';
}

/** Progress update event */
export interface ProgressUpdate {
  /** Transformation job ID */
  jobId: string;
  /** Current status */
  status: TransformStatus;
  /** Progress percentage (0-100) */
  progress: number;
  /** Current chunk being processed */
  currentChunk: number;
  /** Total chunks */
  totalChunks: number;
  /** Words processed so far */
  wordsProcessed: number;
  /** Total words */
  totalWords: number;
  /** Estimated time remaining in ms */
  estimatedTimeRemaining?: number | undefined;
  /** Current phase description */
  phase: string;
  /** Timestamp */
  timestamp: Date;
}

/** Progress callback function type */
export type ProgressCallback = (update: ProgressUpdate) => void;

/** Transformation pipeline options */
export interface TransformPipelineOptions {
  /** Maximum chunk size in words (default: 10000) */
  maxChunkSize?: number;
  /** Overlap between chunks in sentences (default: 3) */
  chunkOverlap?: number;
  /** Progress update interval in words (default: 10000) */
  progressUpdateInterval?: number;
  /** Enable parallel chunk processing */
  parallelProcessing?: boolean;
  /** Maximum parallel chunks */
  maxParallelChunks?: number;
  /** Memory limit percentage (0-100, default: 80) */
  memoryLimitPercent?: number;
  /** Enable auto-save for resumable processing */
  enableAutoSave?: boolean;
  /** Auto-save interval in chunks */
  autoSaveInterval?: number;
}

/** Resumable job state */
export interface ResumableJobState {
  /** Job ID */
  jobId: string;
  /** Original request */
  request: TransformRequest;
  /** Processed chunks */
  processedChunks: TransformChunk[];
  /** Pending chunks */
  pendingChunks: TransformChunk[];
  /** Current context */
  currentContext: ChunkContext;
  /** Last checkpoint timestamp */
  lastCheckpoint: Date;
  /** Total processing time so far */
  totalProcessingTime: number;
}

/** Transformation pipeline interface */
export interface ITransformationPipeline {
  /** Transform text with the given request */
  transform(request: TransformRequest, onProgress?: ProgressCallback): Promise<TransformResult>;
  
  /** Pause a running transformation */
  pause(jobId: string): Promise<void>;
  
  /** Resume a paused transformation */
  resume(jobId: string, onProgress?: ProgressCallback): Promise<TransformResult>;
  
  /** Cancel a transformation */
  cancel(jobId: string): Promise<void>;
  
  /** Get the status of a transformation */
  getStatus(jobId: string): Promise<ProgressUpdate | null>;
  
  /** Get resumable job state */
  getJobState(jobId: string): Promise<ResumableJobState | null>;
}
