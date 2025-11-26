/**
 * Chunk Processor
 * Handles splitting large documents into manageable chunks for processing
 * and reassembling them after transformation.
 * Requirements: 1.1, 1.3, 11, 12
 */

import crypto from 'crypto';
import { TransformChunk, TransformPipelineOptions } from './types';
import { ProtectedSegment } from '../analysis/types';
import { extractSentences, countWords } from '../analysis/document-parser';

/** Default chunk size in words */
const DEFAULT_CHUNK_SIZE = 10000;

/** Default overlap in sentences */
const DEFAULT_OVERLAP = 3;

/** Minimum chunk size to avoid tiny chunks */
const MIN_CHUNK_SIZE = 100;

/** Chapter detection patterns */
const CHAPTER_PATTERNS = [
  /^chapter\s+\d+/im,
  /^chapter\s+[ivxlcdm]+/im,
  /^part\s+\d+/im,
  /^section\s+\d+/im,
  /^#{1,2}\s+chapter/im,
  /^#{1,2}\s+part/im,
];

/**
 * Chunk processor for handling large documents
 */
export class ChunkProcessor {
  private maxChunkSize: number;
  private chunkOverlap: number;

  constructor(options?: TransformPipelineOptions) {
    this.maxChunkSize = options?.maxChunkSize ?? DEFAULT_CHUNK_SIZE;
    this.chunkOverlap = options?.chunkOverlap ?? DEFAULT_OVERLAP;
  }

  /**
   * Splits text into chunks for processing
   * @param text - The text to split
   * @param protectedSegments - Protected segments to preserve
   * @returns Array of chunks
   */
  splitIntoChunks(text: string, protectedSegments: ProtectedSegment[] = []): TransformChunk[] {
    const wordCount = countWords(text);
    
    // If text is small enough, return as single chunk
    if (wordCount <= this.maxChunkSize) {
      return [this.createChunk(text, 0, 1, 0, text.length, protectedSegments)];
    }

    // Detect chapter boundaries for book-length documents
    const chapterBoundaries = this.detectChapterBoundaries(text);
    
    // Split by chapters if detected, otherwise by word count
    if (chapterBoundaries.length > 1) {
      return this.splitByChapters(text, chapterBoundaries, protectedSegments);
    }

    return this.splitByWordCount(text, protectedSegments);
  }

  /**
   * Detects chapter boundaries in text
   * @param text - The text to analyze
   * @returns Array of chapter start offsets
   */
  private detectChapterBoundaries(text: string): number[] {
    const boundaries: number[] = [0];
    
    for (const pattern of CHAPTER_PATTERNS) {
      const regex = new RegExp(pattern, 'gim');
      let match;
      
      while ((match = regex.exec(text)) !== null) {
        // Avoid duplicate boundaries
        if (!boundaries.includes(match.index) && match.index > 0) {
          boundaries.push(match.index);
        }
      }
    }

    // Sort boundaries
    boundaries.sort((a, b) => a - b);
    
    return boundaries;
  }

  /**
   * Splits text by chapter boundaries
   * @param text - The text to split
   * @param boundaries - Chapter boundary offsets
   * @param protectedSegments - Protected segments
   * @returns Array of chunks
   */
  private splitByChapters(
    text: string,
    boundaries: number[],
    protectedSegments: ProtectedSegment[]
  ): TransformChunk[] {
    const chunks: TransformChunk[] = [];
    
    for (let i = 0; i < boundaries.length; i++) {
      const startOffset = boundaries[i] ?? 0;
      const endOffset = i < boundaries.length - 1 ? (boundaries[i + 1] ?? text.length) : text.length;
      const chapterContent = text.slice(startOffset, endOffset);
      const chapterWordCount = countWords(chapterContent);

      // If chapter is too large, split it further
      if (chapterWordCount > this.maxChunkSize) {
        const subChunks = this.splitByWordCount(
          chapterContent,
          this.filterProtectedSegments(protectedSegments, startOffset, endOffset),
          startOffset,
          i
        );
        
        // Adjust indices for sub-chunks
        for (const subChunk of subChunks) {
          subChunk.chapterIndex = i;
          chunks.push(subChunk);
        }
      } else {
        const chunk = this.createChunk(
          chapterContent,
          chunks.length,
          0, // Will be updated after all chunks are created
          startOffset,
          endOffset,
          this.filterProtectedSegments(protectedSegments, startOffset, endOffset),
          i
        );
        chunks.push(chunk);
      }
    }

    // Update total chunks count
    for (const chunk of chunks) {
      chunk.totalChunks = chunks.length;
    }

    return chunks;
  }

  /**
   * Splits text by word count with sentence boundary awareness
   * @param text - The text to split
   * @param protectedSegments - Protected segments
   * @param baseOffset - Base offset for nested splitting
   * @param chapterIndex - Chapter index if applicable
   * @returns Array of chunks
   */
  private splitByWordCount(
    text: string,
    protectedSegments: ProtectedSegment[],
    baseOffset: number = 0,
    chapterIndex?: number
  ): TransformChunk[] {
    const chunks: TransformChunk[] = [];
    const sentences = extractSentences(text);
    
    let currentChunkSentences: string[] = [];
    let currentWordCount = 0;
    let currentStartOffset = 0;
    let sentenceStartOffset = 0;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i] ?? '';
      if (!sentence) continue;
      
      const sentenceWordCount = countWords(sentence);
      
      // Check if adding this sentence would exceed chunk size
      if (currentWordCount + sentenceWordCount > this.maxChunkSize && currentChunkSentences.length > 0) {
        // Create chunk from accumulated sentences
        const chunkContent = currentChunkSentences.join(' ');
        const endOffset = sentenceStartOffset;
        
        chunks.push(this.createChunk(
          chunkContent,
          chunks.length,
          0, // Will be updated
          baseOffset + currentStartOffset,
          baseOffset + endOffset,
          this.filterProtectedSegments(protectedSegments, currentStartOffset, endOffset),
          chapterIndex
        ));

        // Start new chunk with overlap
        const overlapSentences = currentChunkSentences.slice(-this.chunkOverlap);
        currentChunkSentences = [...overlapSentences, sentence];
        currentWordCount = overlapSentences.reduce((sum, s) => sum + countWords(s), 0) + sentenceWordCount;
        currentStartOffset = sentenceStartOffset - overlapSentences.join(' ').length;
      } else {
        currentChunkSentences.push(sentence);
        currentWordCount += sentenceWordCount;
      }

      // Track sentence position
      sentenceStartOffset = text.indexOf(sentence, sentenceStartOffset) + sentence.length;
    }

    // Add remaining sentences as final chunk
    if (currentChunkSentences.length > 0) {
      const chunkContent = currentChunkSentences.join(' ');
      chunks.push(this.createChunk(
        chunkContent,
        chunks.length,
        0,
        baseOffset + currentStartOffset,
        baseOffset + text.length,
        this.filterProtectedSegments(protectedSegments, currentStartOffset, text.length),
        chapterIndex
      ));
    }

    // Update total chunks count
    for (const chunk of chunks) {
      chunk.totalChunks = chunks.length;
    }

    return chunks;
  }

  /**
   * Creates a chunk object
   */
  private createChunk(
    content: string,
    index: number,
    totalChunks: number,
    startOffset: number,
    endOffset: number,
    protectedSegments: ProtectedSegment[],
    chapterIndex?: number
  ): TransformChunk {
    return {
      index,
      totalChunks,
      content,
      startOffset,
      endOffset,
      wordCount: countWords(content),
      chapterIndex,
      status: 'pending',
      context: {
        previousSentences: [],
        themes: [],
        keyTerms: [],
        protectedSegments,
      },
    };
  }

  /**
   * Filters protected segments to those within a range
   */
  private filterProtectedSegments(
    segments: ProtectedSegment[],
    startOffset: number,
    endOffset: number
  ): ProtectedSegment[] {
    return segments.filter(
      seg => seg.startIndex >= startOffset && seg.endIndex <= endOffset
    ).map(seg => ({
      ...seg,
      startIndex: seg.startIndex - startOffset,
      endIndex: seg.endIndex - startOffset,
    }));
  }

  /**
   * Reassembles chunks into final text
   * @param chunks - Processed chunks
   * @returns Assembled text
   */
  assembleChunks(chunks: TransformChunk[]): string {
    // Sort chunks by index
    const sortedChunks = [...chunks].sort((a, b) => a.index - b.index);
    
    // Handle overlap removal
    const assembledParts: string[] = [];
    
    for (let i = 0; i < sortedChunks.length; i++) {
      const chunk = sortedChunks[i];
      if (!chunk) continue;
      
      const content = chunk.transformedContent ?? chunk.content;
      
      if (i === 0) {
        assembledParts.push(content);
      } else {
        // Remove overlap from the beginning of this chunk
        const previousPart = assembledParts[assembledParts.length - 1];
        if (previousPart) {
          const overlapRemoved = this.removeOverlap(previousPart, content);
          assembledParts.push(overlapRemoved);
        } else {
          assembledParts.push(content);
        }
      }
    }

    return assembledParts.join('');
  }

  /**
   * Removes overlapping content between chunks
   */
  private removeOverlap(previousContent: string, currentContent: string): string {
    // Get last few sentences of previous content
    const prevSentences = extractSentences(previousContent);
    const overlapSentences = prevSentences.slice(-this.chunkOverlap);
    
    if (overlapSentences.length === 0) {
      return currentContent;
    }

    // Find where the overlap ends in current content
    const currentSentences = extractSentences(currentContent);
    let overlapEndIndex = 0;
    
    for (let i = 0; i < Math.min(this.chunkOverlap, currentSentences.length); i++) {
      // Check if this sentence is part of the overlap
      const currentSentence = currentSentences[i]?.trim() ?? '';
      if (!currentSentence) continue;
      
      const isOverlap = overlapSentences.some(
        os => this.sentenceSimilarity(os.trim(), currentSentence) > 0.8
      );
      
      if (isOverlap) {
        overlapEndIndex = i + 1;
      } else {
        break;
      }
    }

    // Return content after overlap
    if (overlapEndIndex > 0) {
      const remainingSentences = currentSentences.slice(overlapEndIndex);
      return ' ' + remainingSentences.join(' ');
    }

    return ' ' + currentContent;
  }

  /**
   * Calculates similarity between two sentences
   */
  private sentenceSimilarity(s1: string, s2: string): number {
    const words1 = new Set(s1.toLowerCase().split(/\s+/));
    const words2 = new Set(s2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Generates a content hash for deduplication
   */
  generateContentHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Estimates the number of chunks for a given text
   */
  estimateChunkCount(text: string): number {
    const wordCount = countWords(text);
    if (wordCount <= this.maxChunkSize) {
      return 1;
    }
    return Math.ceil(wordCount / (this.maxChunkSize - MIN_CHUNK_SIZE));
  }
}

/**
 * Creates a new ChunkProcessor instance
 */
export function createChunkProcessor(options?: TransformPipelineOptions): ChunkProcessor {
  return new ChunkProcessor(options);
}
