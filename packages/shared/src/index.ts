// Core types for AI Humanizer

export type HumanizationLevel = 1 | 2 | 3 | 4 | 5;

export type TransformationStrategy = 'casual' | 'professional' | 'academic';

export interface TransformSettings {
  level: HumanizationLevel;
  strategy: TransformationStrategy;
  protectedSegments?: string[];
  preserveFormatting?: boolean;
}

export interface TransformResult {
  originalText: string;
  humanizedText: string;
  metrics: TransformMetrics;
}

export interface TransformMetrics {
  perplexity: number;
  burstiness: number;
  sentenceLengthVariation: number;
  modificationPercentage: number;
  detectionScores: DetectionScores;
}

export interface DetectionScores {
  gptZero?: number;
  originality?: number;
  turnitin?: number;
  internal: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  subscriptionTier: SubscriptionTier;
  createdAt: Date;
  updatedAt: Date;
}

export type SubscriptionTier = 'free' | 'basic' | 'premium' | 'enterprise';

export interface Project {
  id: string;
  userId: string;
  name: string;
  description?: string;
  wordCount: number;
  status: ProjectStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type ProjectStatus = 'draft' | 'processing' | 'completed' | 'failed';

export interface Version {
  id: string;
  projectId: string;
  versionNumber: number;
  content: string;
  settings: TransformSettings;
  metrics?: TransformMetrics;
  createdAt: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
