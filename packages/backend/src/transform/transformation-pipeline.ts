/**
 * Transformation Pipeline
 * Core transformation engine that orchestrates the humanization process.
 * Handles chunk processing, context preservation, and progress tracking.
 * Requirements: 1, 11, 12, 57
 */

import { v4 as uuidv4 } from 'uuid';
import {
  ITransformationPipeline,
  TransformRequest,
  TransformResult,
  TransformChunk,
  TransformPipelineOptions,
  ProgressCallback,
  ProgressUpdate,
  ResumableJobState,
  TransformStatus,
  TransformMetrics,
  HumanizationLevel,
  TransformStrategy,
  ChunkContext,
} from './types';
import { ChunkProcessor, createChunkProcessor } from './chunk-processor';
import { ContextPreserver, createContextPreserver } from './context-preserver';
import { ProgressTracker, createProgressTracker } from './progress-tracker';
import { TextAnalyzer, createTextAnalyzer } from '../analysis/text-analyzer';
import { calculateMetrics } from '../analysis/metrics-calculator';
import { parseProtectedSegments } from '../analysis/protected-segment-parser';
import { countWords } from '../analysis/document-parser';
import { TextMetrics } from '../analysis/types';

/** Default humanization level */
const DEFAULT_LEVEL: HumanizationLevel = 3;

/** Memory check interval in chunks */
const MEMORY_CHECK_INTERVAL = 5;

/**
 * Active job tracking
 */
interface ActiveJob {
  id: string;
  request: TransformRequest;
  tracker: ProgressTracker;
  contextPreserver: ContextPreserver;
  chunks: TransformChunk[];
  processedChunks: TransformChunk[];
  status: TransformStatus;
  startTime: number;
  abortController?: AbortController;
}

/**
 * Transformation Pipeline implementation
 */
export class TransformationPipeline implements ITransformationPipeline {
  private options: Required<TransformPipelineOptions>;
  private chunkProcessor: ChunkProcessor;
  private textAnalyzer: TextAnalyzer;
  private activeJobs: Map<string, ActiveJob> = new Map();
  private pausedJobs: Map<string, ResumableJobState> = new Map();

  constructor(options?: TransformPipelineOptions) {
    this.options = {
      maxChunkSize: options?.maxChunkSize ?? 10000,
      chunkOverlap: options?.chunkOverlap ?? 3,
      progressUpdateInterval: options?.progressUpdateInterval ?? 10000,
      parallelProcessing: options?.parallelProcessing ?? false,
      maxParallelChunks: options?.maxParallelChunks ?? 3,
      memoryLimitPercent: options?.memoryLimitPercent ?? 80,
      enableAutoSave: options?.enableAutoSave ?? true,
      autoSaveInterval: options?.autoSaveInterval ?? 10,
    };

    this.chunkProcessor = createChunkProcessor(this.options);
    this.textAnalyzer = createTextAnalyzer();
  }

  /**
   * Transforms text with the given request
   * @param request - Transform request
   * @param onProgress - Optional progress callback
   * @returns Transform result
   */
  async transform(
    request: TransformRequest,
    onProgress?: ProgressCallback
  ): Promise<TransformResult> {
    const jobId = request.id ?? uuidv4();
    const startTime = Date.now();

    // Create progress tracker
    const tracker = createProgressTracker(jobId, this.options);
    if (onProgress) {
      tracker.onProgress(onProgress);
    }

    // Create context preserver
    const contextPreserver = createContextPreserver();

    // Create abort controller for cancellation
    const abortController = new AbortController();

    try {
      // Validate input
      tracker.updateStatus('analyzing', 'Validating input');
      this.validateRequest(request);

      // Analyze text
      tracker.updateStatus('analyzing', 'Analyzing document');
      const analysis = this.textAnalyzer.analyze(request.text);

      if (!analysis.isValid) {
        throw new Error(`Invalid input: ${analysis.validationErrors.join(', ')}`);
      }

      // Determine strategy
      const strategy = this.determineStrategy(request, analysis.contentType);
      const level = request.level ?? DEFAULT_LEVEL;

      // Build style profile for consistency
      contextPreserver.buildStyleProfile(request.text);

      // Parse protected segments
      const protectedSegments = parseProtectedSegments(
        request.text,
        request.protectedDelimiters ? { delimiters: request.protectedDelimiters } : undefined
      );

      // Split into chunks
      tracker.updateStatus('chunking', 'Splitting document into chunks');
      const chunks = this.chunkProcessor.splitIntoChunks(request.text, protectedSegments);

      // Initialize progress tracking
      const totalWords = countWords(request.text);
      tracker.initialize(totalWords, chunks.length);

      // Store active job
      const activeJob: ActiveJob = {
        id: jobId,
        request,
        tracker,
        contextPreserver,
        chunks,
        processedChunks: [],
        status: 'processing',
        startTime,
        abortController,
      };
      this.activeJobs.set(jobId, activeJob);

      // Process chunks
      tracker.updateStatus('processing', 'Processing chunks');
      const processedChunks = await this.processChunks(
        activeJob,
        strategy,
        level,
        abortController.signal
      );

      // Check if cancelled
      if (abortController.signal.aborted) {
        throw new Error('Transformation cancelled');
      }

      // Assemble final text
      tracker.updateStatus('assembling', 'Assembling final document');
      const humanizedText = this.chunkProcessor.assembleChunks(processedChunks);

      // Calculate final metrics
      const afterMetrics = calculateMetrics(humanizedText);
      const metrics = this.calculateTransformMetrics(
        analysis.metrics,
        afterMetrics,
        request.text,
        humanizedText
      );

      // Mark complete
      tracker.updateStatus('completed', 'Transformation complete');

      // Clean up
      this.activeJobs.delete(jobId);
      tracker.dispose();

      return {
        id: jobId,
        humanizedText,
        metrics,
        processingTime: Date.now() - startTime,
        chunksProcessed: processedChunks.length,
        totalChunks: chunks.length,
        strategyUsed: strategy,
        levelApplied: level,
        protectedSegmentsPreserved: protectedSegments.length,
        contentType: analysis.contentType,
        language: analysis.language.language,
      };
    } catch (error) {
      tracker.updateStatus('failed', `Error: ${(error as Error).message}`);
      this.activeJobs.delete(jobId);
      tracker.dispose();
      throw error;
    }
  }

  /**
   * Processes chunks sequentially or in parallel
   */
  private async processChunks(
    job: ActiveJob,
    strategy: TransformStrategy,
    level: HumanizationLevel,
    signal: AbortSignal
  ): Promise<TransformChunk[]> {
    const { chunks, tracker, contextPreserver } = job;
    const processedChunks: TransformChunk[] = [];

    if (this.options.parallelProcessing) {
      // Process in parallel batches
      for (let i = 0; i < chunks.length; i += this.options.maxParallelChunks) {
        if (signal.aborted) break;

        const batch = chunks.slice(i, i + this.options.maxParallelChunks);
        const batchResults = await Promise.all(
          batch.map((chunk, batchIndex) => {
            if (!chunk) return Promise.resolve(null);
            const previousChunk = i + batchIndex > 0 
              ? processedChunks[processedChunks.length - 1] 
              : undefined;
            return this.processChunk(chunk, strategy, level, contextPreserver, previousChunk, tracker);
          })
        );
        processedChunks.push(...batchResults.filter((c): c is TransformChunk => c !== null));

        // Check memory usage
        if ((i / this.options.maxParallelChunks) % MEMORY_CHECK_INTERVAL === 0) {
          await this.checkMemoryUsage(job);
        }
      }
    } else {
      // Process sequentially
      for (let i = 0; i < chunks.length; i++) {
        if (signal.aborted) break;

        const chunk = chunks[i];
        if (!chunk) continue;
        
        const previousChunk = i > 0 ? processedChunks[i - 1] : undefined;
        
        const processedChunk = await this.processChunk(
          chunk,
          strategy,
          level,
          contextPreserver,
          previousChunk,
          tracker
        );
        processedChunks.push(processedChunk);

        // Auto-save checkpoint
        if (this.options.enableAutoSave && i % this.options.autoSaveInterval === 0) {
          this.saveCheckpoint(job, processedChunks);
        }

        // Check memory usage periodically
        if (i % MEMORY_CHECK_INTERVAL === 0) {
          await this.checkMemoryUsage(job);
        }
      }
    }

    job.processedChunks = processedChunks;
    return processedChunks;
  }

  /**
   * Processes a single chunk
   */
  private async processChunk(
    chunk: TransformChunk,
    strategy: TransformStrategy,
    level: HumanizationLevel,
    contextPreserver: ContextPreserver,
    previousChunk: TransformChunk | undefined,
    tracker: ProgressTracker
  ): Promise<TransformChunk> {
    tracker.startChunk(chunk.index);
    chunk.status = 'processing';

    try {
      // Prepare context from previous chunk
      const preparedChunk = contextPreserver.prepareChunkContext(chunk, previousChunk);

      // Apply transformation (placeholder - actual transformation logic would go here)
      const transformedContent = this.applyTransformation(
        preparedChunk.content,
        strategy,
        level,
        preparedChunk.context
      );

      preparedChunk.transformedContent = transformedContent;
      preparedChunk.status = 'completed';
      preparedChunk.processingTimeMs = Date.now();

      tracker.completeChunk(preparedChunk);
      return preparedChunk;
    } catch (error) {
      chunk.status = 'failed';
      chunk.errorMessage = (error as Error).message;
      tracker.failChunk(chunk, chunk.errorMessage);
      throw error;
    }
  }

  /**
   * Applies transformation to text
   * This is a placeholder - actual transformation logic would be implemented here
   */
  private applyTransformation(
    text: string,
    _strategy: TransformStrategy,
    _level: HumanizationLevel,
    _context: ChunkContext
  ): string {
    // Placeholder transformation - in a real implementation, this would:
    // 1. Apply strategy-specific transformations
    // 2. Adjust intensity based on level
    // 3. Preserve protected segments
    // 4. Maintain context consistency
    
    // For now, return the original text
    // The actual transformation logic will be implemented in task 7 (transformation strategies)
    return text;
  }

  /**
   * Determines the transformation strategy
   */
  private determineStrategy(
    request: TransformRequest,
    detectedContentType: string
  ): TransformStrategy {
    if (request.strategy && request.strategy !== 'auto') {
      return request.strategy;
    }

    // Auto-detect based on content type
    switch (detectedContentType) {
      case 'academic':
        return 'academic';
      case 'business':
      case 'technical':
        return 'professional';
      case 'casual':
      case 'creative':
        return 'casual';
      default:
        return 'professional';
    }
  }

  /**
   * Validates the transform request
   */
  private validateRequest(request: TransformRequest): void {
    if (!request.text || request.text.trim().length === 0) {
      throw new Error('Input text cannot be empty');
    }

    if (request.level !== undefined && (request.level < 1 || request.level > 5)) {
      throw new Error('Humanization level must be between 1 and 5');
    }

    const validStrategies: TransformStrategy[] = ['casual', 'professional', 'academic', 'auto'];
    if (request.strategy && !validStrategies.includes(request.strategy)) {
      throw new Error(`Invalid strategy: ${request.strategy}`);
    }
  }

  /**
   * Calculates transformation metrics
   */
  private calculateTransformMetrics(
    before: TextMetrics,
    after: TextMetrics,
    originalText: string,
    transformedText: string
  ): TransformMetrics {
    // Calculate modification percentage
    const originalWords = originalText.toLowerCase().split(/\s+/);
    const transformedWords = transformedText.toLowerCase().split(/\s+/);
    
    let modifiedCount = 0;
    const minLength = Math.min(originalWords.length, transformedWords.length);
    
    for (let i = 0; i < minLength; i++) {
      if (originalWords[i] !== transformedWords[i]) {
        modifiedCount++;
      }
    }
    
    // Add difference in length
    modifiedCount += Math.abs(originalWords.length - transformedWords.length);
    
    const modificationPercentage = (modifiedCount / originalWords.length) * 100;

    // Calculate sentences modified
    const originalSentences = before.sentenceLengths.length;
    const transformedSentences = after.sentenceLengths.length;
    const sentencesModified = Math.abs(originalSentences - transformedSentences) +
      Math.round(modificationPercentage / 100 * originalSentences);

    return {
      before,
      after,
      modificationPercentage: Math.round(modificationPercentage * 100) / 100,
      sentencesModified: Math.min(sentencesModified, originalSentences),
      totalSentences: originalSentences,
    };
  }

  /**
   * Checks memory usage and adjusts if needed
   */
  private async checkMemoryUsage(_job: ActiveJob): Promise<void> {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      const heapUsedPercent = (usage.heapUsed / usage.heapTotal) * 100;

      if (heapUsedPercent > this.options.memoryLimitPercent) {
        // Trigger garbage collection if available
        if (global.gc) {
          global.gc();
        }

        // Reduce chunk size for remaining chunks
        this.options.maxChunkSize = Math.max(
          1000,
          Math.floor(this.options.maxChunkSize * 0.8)
        );
      }
    }
  }

  /**
   * Saves a checkpoint for resumable processing
   */
  private saveCheckpoint(job: ActiveJob, processedChunks: TransformChunk[]): void {
    const state: ResumableJobState = {
      jobId: job.id,
      request: job.request,
      processedChunks: [...processedChunks],
      pendingChunks: job.chunks.slice(processedChunks.length),
      currentContext: job.contextPreserver.getGlobalContext(),
      lastCheckpoint: new Date(),
      totalProcessingTime: Date.now() - job.startTime,
    };

    this.pausedJobs.set(job.id, state);
  }

  /**
   * Pauses a running transformation
   */
  async pause(jobId: string): Promise<void> {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    job.abortController?.abort();
    job.status = 'paused';
    job.tracker.updateStatus('paused', 'Transformation paused');

    // Save state for resumption
    this.saveCheckpoint(job, job.processedChunks);
    this.activeJobs.delete(jobId);
  }

  /**
   * Resumes a paused transformation
   */
  async resume(jobId: string, onProgress?: ProgressCallback): Promise<TransformResult> {
    const state = this.pausedJobs.get(jobId);
    if (!state) {
      throw new Error(`No paused job found with ID ${jobId}`);
    }

    // Remove from paused jobs
    this.pausedJobs.delete(jobId);

    // Create new request with remaining text
    const remainingText = state.pendingChunks.map(c => c.content).join('');
    const resumeRequest: TransformRequest = {
      ...state.request,
      id: jobId,
      text: remainingText,
    };

    // Transform remaining content
    const result = await this.transform(resumeRequest, onProgress);

    // Combine with previously processed content
    const previousText = this.chunkProcessor.assembleChunks(state.processedChunks);
    result.humanizedText = previousText + result.humanizedText;
    result.processingTime += state.totalProcessingTime;
    result.chunksProcessed += state.processedChunks.length;
    result.totalChunks += state.processedChunks.length;

    return result;
  }

  /**
   * Cancels a transformation
   */
  async cancel(jobId: string): Promise<void> {
    const job = this.activeJobs.get(jobId);
    if (job) {
      job.abortController?.abort();
      job.status = 'cancelled';
      job.tracker.updateStatus('cancelled', 'Transformation cancelled');
      job.tracker.dispose();
      this.activeJobs.delete(jobId);
    }

    // Also remove from paused jobs if present
    this.pausedJobs.delete(jobId);
  }

  /**
   * Gets the status of a transformation
   */
  async getStatus(jobId: string): Promise<ProgressUpdate | null> {
    const job = this.activeJobs.get(jobId);
    if (job) {
      return job.tracker.getProgressUpdate();
    }

    const pausedJob = this.pausedJobs.get(jobId);
    if (pausedJob) {
      return {
        jobId,
        status: 'paused',
        progress: Math.round(
          (pausedJob.processedChunks.length / 
            (pausedJob.processedChunks.length + pausedJob.pendingChunks.length)) * 100
        ),
        currentChunk: pausedJob.processedChunks.length,
        totalChunks: pausedJob.processedChunks.length + pausedJob.pendingChunks.length,
        wordsProcessed: pausedJob.processedChunks.reduce((sum, c) => sum + c.wordCount, 0),
        totalWords: pausedJob.processedChunks.reduce((sum, c) => sum + c.wordCount, 0) +
          pausedJob.pendingChunks.reduce((sum, c) => sum + c.wordCount, 0),
        phase: 'Paused',
        timestamp: pausedJob.lastCheckpoint,
      };
    }

    return null;
  }

  /**
   * Gets resumable job state
   */
  async getJobState(jobId: string): Promise<ResumableJobState | null> {
    return this.pausedJobs.get(jobId) ?? null;
  }
}

/**
 * Creates a new TransformationPipeline instance
 */
export function createTransformationPipeline(
  options?: TransformPipelineOptions
): TransformationPipeline {
  return new TransformationPipeline(options);
}
