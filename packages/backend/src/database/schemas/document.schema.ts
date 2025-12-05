/**
 * MongoDB Document Schema
 * Stores the actual text content for projects and versions
 */

import mongoose, { Schema, Document as MongoDocument } from 'mongoose';

/**
 * Document metadata interface
 */
export interface IDocumentMetadata {
  title?: string;
  author?: string;
  language: string;
  format: 'plain' | 'markdown' | 'html' | 'docx' | 'pdf' | 'epub';
  encoding: string;
  originalFilename?: string;
  mimeType?: string;
}

/**
 * Chapter structure for book-length documents
 */
export interface IChapter {
  index: number;
  title: string;
  startOffset: number;
  endOffset: number;
  wordCount: number;
}

/**
 * Document structure analysis
 */
export interface IDocumentStructure {
  chapters: IChapter[];
  paragraphCount: number;
  sentenceCount: number;
  headings: Array<{
    level: number;
    text: string;
    offset: number;
  }>;
}

/**
 * Document interface
 */
export interface IDocument extends MongoDocument {
  projectId: string;
  versionId?: string;
  type: 'original' | 'transformed' | 'draft';
  content: string;
  humanizedContent?: string;
  contentHash: string;
  wordCount: number;
  characterCount: number;
  metadata: IDocumentMetadata;
  structure?: IDocumentStructure;
  isChunked: boolean;
  chunkIds?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const DocumentMetadataSchema = new Schema<IDocumentMetadata>(
  {
    title: { type: String },
    author: { type: String },
    language: { type: String, required: true, default: 'en' },
    format: {
      type: String,
      enum: ['plain', 'markdown', 'html', 'docx', 'pdf', 'epub'],
      default: 'plain',
    },
    encoding: { type: String, default: 'utf-8' },
    originalFilename: { type: String },
    mimeType: { type: String },
  },
  { _id: false }
);

const ChapterSchema = new Schema<IChapter>(
  {
    index: { type: Number, required: true },
    title: { type: String, required: true },
    startOffset: { type: Number, required: true },
    endOffset: { type: Number, required: true },
    wordCount: { type: Number, required: true },
  },
  { _id: false }
);

const DocumentStructureSchema = new Schema<IDocumentStructure>(
  {
    chapters: [ChapterSchema],
    paragraphCount: { type: Number, default: 0 },
    sentenceCount: { type: Number, default: 0 },
    headings: [
      {
        level: { type: Number, required: true },
        text: { type: String, required: true },
        offset: { type: Number, required: true },
      },
    ],
  },
  { _id: false }
);

const DocumentSchema = new Schema<IDocument>(
  {
    projectId: {
      type: String,
      required: true,
      index: true,
    },
    versionId: {
      type: String,
      index: true,
    },
    type: {
      type: String,
      enum: ['original', 'transformed', 'draft'],
      required: true,
      default: 'original',
    },
    content: {
      type: String,
      required: true,
    },
    humanizedContent: {
      type: String,
      required: false,
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
    metadata: {
      type: DocumentMetadataSchema,
      required: true,
    },
    structure: DocumentStructureSchema,
    isChunked: {
      type: Boolean,
      default: false,
    },
    chunkIds: [{ type: String }],
  },
  {
    timestamps: true,
    collection: 'documents',
  }
);

// Indexes for performance
DocumentSchema.index({ projectId: 1, type: 1 });
DocumentSchema.index({ projectId: 1, versionId: 1 });
DocumentSchema.index({ createdAt: -1 });
DocumentSchema.index({ contentHash: 1 });

// Text index for full-text search
DocumentSchema.index({ content: 'text', 'metadata.title': 'text' });

export const DocumentModel = mongoose.model<IDocument>('Document', DocumentSchema);
