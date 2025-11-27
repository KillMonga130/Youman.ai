/**
 * Bulk Operations Types
 * Types for multi-select and bulk actions on projects
 */

export type BulkActionType = 'delete' | 'export' | 'archive' | 'reprocess';

export interface BulkOperationProgress {
  total: number;
  completed: number;
  failed: number;
  inProgress: boolean;
  currentItem?: string;
  errors: Array<{ id: string; name: string; error: string }>;
}

export interface BulkOperationResult {
  success: boolean;
  totalProcessed: number;
  successCount: number;
  failedCount: number;
  errors: Array<{ id: string; name: string; error: string }>;
  downloadUrl?: string;
}

export interface BulkExportOptions {
  format: 'json' | 'txt' | 'docx';
  includeMetadata: boolean;
  includeHumanized: boolean;
  includeOriginal: boolean;
}

export interface ProjectForBulk {
  id: string;
  name: string;
  status: 'draft' | 'processing' | 'completed';
  wordCount: number;
  createdAt: string;
  updatedAt: string;
  content?: string;
  humanizedContent?: string;
}

export interface BulkSelectionState {
  selectedIds: Set<string>;
  isAllSelected: boolean;
  isIndeterminate: boolean;
}
