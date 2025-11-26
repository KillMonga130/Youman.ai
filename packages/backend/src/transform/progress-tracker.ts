/**
 * Progress Tracker
 * Tracks and reports transformation progress for large documents.
 * Provides progress updates every 10,000 words as per requirements.
 * Requirements: 1.3, 12.2
 */

import { EventEmitter } from 'events';
import {
  ProgressUpdate,
  ProgressCallback,
  TransformStatus,
  TransformChunk,
  TransformPipelineOptions,
} from './types';

/** Default progress update interval in words */
const DEFAULT_PROGRESS_INTERVAL = 10000;

/** Progress event name */
const PROGRESS_EVENT = 'progress';

/**
 * Progress tracker for transformation jobs
 */
export class ProgressTracker extends EventEmitter {
  private jobId: string;
  private status: TransformStatus = 'pending';
  private totalWords: number = 0;
  private wordsProcessed: number = 0;
  private totalChunks: number = 0;
  private chunksProcessed: number = 0;
  private startTime: number = 0;
  private chunkStartTimes: Map<number, number> = new Map();
  private chunkProcessingTimes: number[] = [];
  private progressInterval: number;
  private lastProgressUpdate: number = 0;
  private callbacks: Set<ProgressCallback> = new Set();

  constructor(jobId: string, options?: TransformPipelineOptions) {
    super();
    this.jobId = jobId;
    this.progressInterval = options?.progressUpdateInterval ?? DEFAULT_PROGRESS_INTERVAL;
  }

  /**
   * Initializes the tracker with job details
   * @param totalWords - Total words to process
   * @param totalChunks - Total chunks to process
   */
  initialize(totalWords: number, totalChunks: number): void {
    this.totalWords = totalWords;
    this.totalChunks = totalChunks;
    this.wordsProcessed = 0;
    this.chunksProcessed = 0;
    this.startTime = Date.now();
    this.chunkProcessingTimes = [];
    this.lastProgressUpdate = 0;
  }

  /**
   * Registers a progress callback
   * @param callback - Callback function to receive progress updates
   */
  onProgress(callback: ProgressCallback): void {
    this.callbacks.add(callback);
    this.on(PROGRESS_EVENT, callback);
  }

  /**
   * Removes a progress callback
   * @param callback - Callback function to remove
   */
  offProgress(callback: ProgressCallback): void {
    this.callbacks.delete(callback);
    this.off(PROGRESS_EVENT, callback);
  }

  /**
   * Updates the transformation status
   * @param status - New status
   * @param phase - Optional phase description
   */
  updateStatus(status: TransformStatus, phase?: string): void {
    this.status = status;
    this.emitProgress(phase ?? this.getPhaseDescription(status));
  }

  /**
   * Marks a chunk as started
   * @param chunkIndex - Index of the chunk
   */
  startChunk(chunkIndex: number): void {
    this.chunkStartTimes.set(chunkIndex, Date.now());
  }

  /**
   * Marks a chunk as completed
   * @param chunk - The completed chunk
   */
  completeChunk(chunk: TransformChunk): void {
    const startTime = this.chunkStartTimes.get(chunk.index);
    if (startTime) {
      const processingTime = Date.now() - startTime;
      this.chunkProcessingTimes.push(processingTime);
      this.chunkStartTimes.delete(chunk.index);
    }

    this.chunksProcessed++;
    this.wordsProcessed += chunk.wordCount;

    // Check if we should emit a progress update
    if (this.shouldEmitProgress()) {
      this.emitProgress(`Processing chunk ${this.chunksProcessed} of ${this.totalChunks}`);
      this.lastProgressUpdate = this.wordsProcessed;
    }
  }

  /**
   * Marks a chunk as failed
   * @param chunk - The failed chunk
   * @param error - Error message
   */
  failChunk(chunk: TransformChunk, error: string): void {
    this.chunkStartTimes.delete(chunk.index);
    this.emitProgress(`Chunk ${chunk.index} failed: ${error}`);
  }

  /**
   * Checks if a progress update should be emitted
   */
  private shouldEmitProgress(): boolean {
    return this.wordsProcessed - this.lastProgressUpdate >= this.progressInterval;
  }

  /**
   * Emits a progress update
   * @param phase - Current phase description
   */
  private emitProgress(phase: string): void {
    const update = this.getProgressUpdate(phase);
    this.emit(PROGRESS_EVENT, update);
  }

  /**
   * Gets the current progress update
   * @param phase - Current phase description
   * @returns Progress update object
   */
  getProgressUpdate(phase?: string): ProgressUpdate {
    const progress = this.totalWords > 0
      ? Math.round((this.wordsProcessed / this.totalWords) * 100)
      : 0;

    return {
      jobId: this.jobId,
      status: this.status,
      progress,
      currentChunk: this.chunksProcessed,
      totalChunks: this.totalChunks,
      wordsProcessed: this.wordsProcessed,
      totalWords: this.totalWords,
      estimatedTimeRemaining: this.estimateTimeRemaining(),
      phase: phase ?? this.getPhaseDescription(this.status),
      timestamp: new Date(),
    };
  }

  /**
   * Estimates remaining processing time
   * @returns Estimated time in milliseconds
   */
  private estimateTimeRemaining(): number | undefined {
    if (this.chunkProcessingTimes.length === 0 || this.chunksProcessed === 0) {
      return undefined;
    }

    // Calculate average processing time per chunk
    const avgTimePerChunk = this.chunkProcessingTimes.reduce((a, b) => a + b, 0) 
      / this.chunkProcessingTimes.length;

    // Estimate remaining time
    const remainingChunks = this.totalChunks - this.chunksProcessed;
    return Math.round(avgTimePerChunk * remainingChunks);
  }

  /**
   * Gets a human-readable phase description
   * @param status - Current status
   * @returns Phase description
   */
  private getPhaseDescription(status: TransformStatus): string {
    switch (status) {
      case 'pending':
        return 'Waiting to start';
      case 'analyzing':
        return 'Analyzing document structure';
      case 'chunking':
        return 'Splitting document into chunks';
      case 'processing':
        return `Processing chunks (${this.chunksProcessed}/${this.totalChunks})`;
      case 'assembling':
        return 'Assembling final document';
      case 'completed':
        return 'Transformation complete';
      case 'failed':
        return 'Transformation failed';
      case 'paused':
        return 'Transformation paused';
      case 'cancelled':
        return 'Transformation cancelled';
      default:
        return 'Unknown status';
    }
  }

  /**
   * Gets the current status
   */
  getStatus(): TransformStatus {
    return this.status;
  }

  /**
   * Gets the job ID
   */
  getJobId(): string {
    return this.jobId;
  }

  /**
   * Gets total processing time so far
   */
  getTotalProcessingTime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Gets the number of chunks processed
   */
  getChunksProcessed(): number {
    return this.chunksProcessed;
  }

  /**
   * Gets the number of words processed
   */
  getWordsProcessed(): number {
    return this.wordsProcessed;
  }

  /**
   * Checks if the job is complete
   */
  isComplete(): boolean {
    return this.status === 'completed' || this.status === 'failed' || this.status === 'cancelled';
  }

  /**
   * Resets the tracker for reuse
   */
  reset(): void {
    this.status = 'pending';
    this.totalWords = 0;
    this.wordsProcessed = 0;
    this.totalChunks = 0;
    this.chunksProcessed = 0;
    this.startTime = 0;
    this.chunkStartTimes.clear();
    this.chunkProcessingTimes = [];
    this.lastProgressUpdate = 0;
  }

  /**
   * Cleans up resources
   */
  dispose(): void {
    this.removeAllListeners();
    this.callbacks.clear();
    this.chunkStartTimes.clear();
  }
}

/**
 * Creates a new ProgressTracker instance
 * @param jobId - Unique job identifier
 * @param options - Pipeline options
 * @returns ProgressTracker instance
 */
export function createProgressTracker(
  jobId: string,
  options?: TransformPipelineOptions
): ProgressTracker {
  return new ProgressTracker(jobId, options);
}
