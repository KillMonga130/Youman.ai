/**
 * MongoDB Style Profile Schema
 * Stores style analysis for book-length documents to maintain consistency
 */

import mongoose, { Schema, Document as MongoDocument } from 'mongoose';

/**
 * Vocabulary analysis
 */
export interface IVocabularyAnalysis {
  averageWordLength: number;
  uniqueWordRatio: number;
  commonWords: string[];
  rareWords: string[];
  technicalTerms: string[];
  preferredSynonyms: Record<string, string>;
}

/**
 * Sentence analysis
 */
export interface ISentenceAnalysis {
  averageLength: number;
  lengthStdDev: number;
  complexSentenceRatio: number;
  questionRatio: number;
  exclamationRatio: number;
}

/**
 * Tone analysis
 */
export interface IToneAnalysis {
  formality: number; // 0-100
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  emotionalIntensity: number; // 0-100
  objectivity: number; // 0-100
}

/**
 * Character voice profile for fiction
 */
export interface ICharacterVoice {
  name: string;
  speechPatterns: string[];
  vocabularyLevel: 'simple' | 'moderate' | 'complex';
  dialectMarkers: string[];
  catchPhrases: string[];
}

/**
 * Style profile interface
 */
export interface IStyleProfile extends MongoDocument {
  projectId: string;
  documentId: string;
  vocabulary: IVocabularyAnalysis;
  sentences: ISentenceAnalysis;
  tone: IToneAnalysis;
  characterVoices: ICharacterVoice[];
  narratorVoice?: {
    perspective: 'first' | 'second' | 'third-limited' | 'third-omniscient';
    tense: 'past' | 'present' | 'mixed';
    style: string;
  };
  recurringThemes: string[];
  writingPatterns: {
    paragraphLength: number;
    dialogueRatio: number;
    descriptionRatio: number;
    actionRatio: number;
  };
  perplexityBaseline: number;
  burstinessBaseline: number;
  isApproved: boolean;
  userAdjustments?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const VocabularyAnalysisSchema = new Schema<IVocabularyAnalysis>(
  {
    averageWordLength: { type: Number, required: true },
    uniqueWordRatio: { type: Number, required: true },
    commonWords: [{ type: String }],
    rareWords: [{ type: String }],
    technicalTerms: [{ type: String }],
    preferredSynonyms: { type: Map, of: String },
  },
  { _id: false }
);

const SentenceAnalysisSchema = new Schema<ISentenceAnalysis>(
  {
    averageLength: { type: Number, required: true },
    lengthStdDev: { type: Number, required: true },
    complexSentenceRatio: { type: Number, required: true },
    questionRatio: { type: Number, required: true },
    exclamationRatio: { type: Number, required: true },
  },
  { _id: false }
);

const ToneAnalysisSchema = new Schema<IToneAnalysis>(
  {
    formality: { type: Number, required: true, min: 0, max: 100 },
    sentiment: {
      type: String,
      enum: ['positive', 'negative', 'neutral', 'mixed'],
      required: true,
    },
    emotionalIntensity: { type: Number, required: true, min: 0, max: 100 },
    objectivity: { type: Number, required: true, min: 0, max: 100 },
  },
  { _id: false }
);

const CharacterVoiceSchema = new Schema<ICharacterVoice>(
  {
    name: { type: String, required: true },
    speechPatterns: [{ type: String }],
    vocabularyLevel: {
      type: String,
      enum: ['simple', 'moderate', 'complex'],
      default: 'moderate',
    },
    dialectMarkers: [{ type: String }],
    catchPhrases: [{ type: String }],
  },
  { _id: false }
);

const StyleProfileSchema = new Schema<IStyleProfile>(
  {
    projectId: {
      type: String,
      required: true,
      index: true,
    },
    documentId: {
      type: String,
      required: true,
      index: true,
    },
    vocabulary: {
      type: VocabularyAnalysisSchema,
      required: true,
    },
    sentences: {
      type: SentenceAnalysisSchema,
      required: true,
    },
    tone: {
      type: ToneAnalysisSchema,
      required: true,
    },
    characterVoices: [CharacterVoiceSchema],
    narratorVoice: {
      perspective: {
        type: String,
        enum: ['first', 'second', 'third-limited', 'third-omniscient'],
      },
      tense: {
        type: String,
        enum: ['past', 'present', 'mixed'],
      },
      style: { type: String },
    },
    recurringThemes: [{ type: String }],
    writingPatterns: {
      paragraphLength: { type: Number, default: 0 },
      dialogueRatio: { type: Number, default: 0 },
      descriptionRatio: { type: Number, default: 0 },
      actionRatio: { type: Number, default: 0 },
    },
    perplexityBaseline: {
      type: Number,
      required: true,
    },
    burstinessBaseline: {
      type: Number,
      required: true,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    userAdjustments: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    collection: 'style_profiles',
  }
);

// Indexes
StyleProfileSchema.index({ projectId: 1, documentId: 1 }, { unique: true });

export const StyleProfileModel = mongoose.model<IStyleProfile>('StyleProfile', StyleProfileSchema);
