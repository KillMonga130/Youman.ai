/**
 * MongoDB Chunk Schema
 * Stores document chunks for large document processing
 * Supports streaming processing and resumable transformations
 */

import mongoose, { Schema, Document as MongoDocument } from 'mongoose';

/**
 * Chunk context for maintaining consistency across chunks
 */
export interface IChunkContext {
  previousSentences: string[];
  characterVoices?: Record<string, string>;
  narratorVoice?: string;
  themes: string[];
  keyTerms: string[];
}

/**
 * Chunk processing status
 */
export type ChunkStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Chunk interface
 */
export interface IChunk extends MongoDocument {
  documentId: string;
  transformationId?: string;
  index: number;
  totalChunks: number;
  content: string;
  transformedContent?: string;
  contentHash: string;
  wordCount: number;
  characterCount: number;
  startOffset: number;
  endOffset: number;
  chapterIndex?: number;
  status: ChunkStatus;
  context: IChunkContext;
  processingTimeMs?: number;
  errorMessage?: string;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ChunkContextSchema = new Schema<IChunkContext>(
  {
    previousSentences: [{ type: String }],
    characterVoices: { type: Map, of: String },
    narratorVoice: { type: String },
    themes: [{ type: String }],
    keyTerms: [{ type: String }],
  },
  { _id: false }
);

const ChunkSchema = new Schema<IChunk>(
  {
    documentId: {
      type: String,
      required: true,
      index: true,
    },
    transformationId: {
      type: String,
      index: true,
    },
    index: {
      type: Number,
      required: true,
    },
    totalChunks: {
      type: Number,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    transformedContent: {
      type: String,
    },
    contentHash: {
      type: String,
      required: true,
    },
    wordCount: {
      type: Number,
      required: true,
      default: 0,
    },
    characterCount: {
      type: Number,
      required: true,
      default: 0,
    },
    startOffset: {
      type: Number,
      required: true,
    },
    endOffset: {
      type: Number,
      required: true,
    },
    chapterIndex: {
      type: Number,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    context: {
      type: ChunkContextSchema,
      default: (): IChunkContext => ({
        previousSentences: [],
        themes: [],
        keyTerms: [],
      }),
    },
    processingTimeMs: {
      type: Number,
    },
    errorMessage: {
      type: String,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: 'chunks',
  }
);

// Compound indexes for efficient querying
ChunkSchema.index({ documentId: 1, index: 1 }, { unique: true });
ChunkSchema.index({ documentId: 1, status: 1 });
ChunkSchema.index({ transformationId: 1, index: 1 });
ChunkSchema.index({ transformationId: 1, status: 1 });
ChunkSchema.index({ status: 1, createdAt: 1 });

export const ChunkModel = mongoose.model<IChunk>('Chunk', ChunkSchema);
