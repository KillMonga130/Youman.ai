/**
 * Bulk Operations Service
 * Handles bulk actions on projects including delete, export, archive, and re-process
 */

import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type {
  BulkActionType,
  BulkOperationProgress,
  BulkOperationResult,
  BulkExportOptions,
  ProjectForBulk,
} from '../types/bulk-operations';
import { apiClient } from '../api/client';

export type ProgressCallback = (progress: BulkOperationProgress) => void;

/**
 * Execute bulk delete operation
 */
export async function bulkDelete(
  projectIds: string[],
  onProgress?: ProgressCallback
): Promise<BulkOperationResult> {
  const progress: BulkOperationProgress = {
    total: projectIds.length,
    completed: 0,
    failed: 0,
    inProgress: true,
    errors: [],
  };

  for (const id of projectIds) {
    progress.currentItem = id;
    onProgress?.(progress);

    try {
      await apiClient.deleteProject(id);
      progress.completed++;
    } catch (error) {
      progress.failed++;
      progress.errors.push({
        id,
        name: id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    onProgress?.(progress);
  }

  progress.inProgress = false;
  onProgress?.(progress);

  return {
    success: progress.failed === 0,
    totalProcessed: projectIds.length,
    successCount: progress.completed,
    failedCount: progress.failed,
    errors: progress.errors,
  };
}


/**
 * Execute bulk export operation - generates ZIP archive
 */
export async function bulkExport(
  projects: ProjectForBulk[],
  options: BulkExportOptions,
  onProgress?: ProgressCallback
): Promise<BulkOperationResult> {
  const progress: BulkOperationProgress = {
    total: projects.length,
    completed: 0,
    failed: 0,
    inProgress: true,
    errors: [],
  };

  const zip = new JSZip();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const folderName = `ai-humanizer-export-${timestamp}`;
  const folder = zip.folder(folderName);

  if (!folder) {
    return {
      success: false,
      totalProcessed: 0,
      successCount: 0,
      failedCount: projects.length,
      errors: [{ id: 'zip', name: 'ZIP Creation', error: 'Failed to create ZIP folder' }],
    };
  }

  for (const project of projects) {
    progress.currentItem = project.name;
    onProgress?.(progress);

    try {
      // Create project folder
      const projectFolder = folder.folder(sanitizeFilename(project.name));
      if (!projectFolder) {
        throw new Error('Failed to create project folder');
      }

      // Add metadata if requested
      if (options.includeMetadata) {
        const metadata = {
          id: project.id,
          name: project.name,
          status: project.status,
          wordCount: project.wordCount,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          exportedAt: new Date().toISOString(),
        };
        projectFolder.file('metadata.json', JSON.stringify(metadata, null, 2));
      }

      // Fetch project content from latest version
      let content = '';
      let humanizedContent = '';

      try {
        // Get latest version to fetch content
        const versions = await apiClient.getProjectVersions(project.id);
        if (versions.versions && versions.versions.length > 0) {
          const latestVersion = versions.versions[0]; // Versions are sorted by version number desc
          if (latestVersion) {
            content = latestVersion.content || '';
            humanizedContent = latestVersion.humanizedContent || '';
          }
        }
      } catch {
        // Use empty strings if fetch fails
        content = '';
        humanizedContent = '';
      }

      // Add content based on format
      if (options.format === 'json') {
        const jsonContent: Record<string, unknown> = {};
        if (options.includeOriginal) jsonContent.original = content;
        if (options.includeHumanized) jsonContent.humanized = humanizedContent;
        projectFolder.file('content.json', JSON.stringify(jsonContent, null, 2));
      } else {
        // txt or docx format
        const ext = options.format === 'docx' ? 'txt' : options.format; // Use txt for now
        if (options.includeOriginal && content) {
          projectFolder.file(`original.${ext}`, content);
        }
        if (options.includeHumanized && humanizedContent) {
          projectFolder.file(`humanized.${ext}`, humanizedContent);
        }
      }

      progress.completed++;
    } catch (error) {
      progress.failed++;
      progress.errors.push({
        id: project.id,
        name: project.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    onProgress?.(progress);
  }

  // Generate and download ZIP
  try {
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, `${folderName}.zip`);
  } catch (error) {
    progress.errors.push({
      id: 'zip-generate',
      name: 'ZIP Generation',
      error: error instanceof Error ? error.message : 'Failed to generate ZIP',
    });
  }

  progress.inProgress = false;
  onProgress?.(progress);

  return {
    success: progress.failed === 0,
    totalProcessed: projects.length,
    successCount: progress.completed,
    failedCount: progress.failed,
    errors: progress.errors,
  };
}

/**
 * Execute bulk archive operation
 */
export async function bulkArchive(
  projectIds: string[],
  onProgress?: ProgressCallback
): Promise<BulkOperationResult> {
  const progress: BulkOperationProgress = {
    total: projectIds.length,
    completed: 0,
    failed: 0,
    inProgress: true,
    errors: [],
  };

  for (const id of projectIds) {
    progress.currentItem = id;
    onProgress?.(progress);

    try {
      // Archive by updating project status (simulated - would need backend support)
      await apiClient.updateProject(id, { name: `[Archived] ${id}` });
      progress.completed++;
    } catch (error) {
      progress.failed++;
      progress.errors.push({
        id,
        name: id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    onProgress?.(progress);
  }

  progress.inProgress = false;
  onProgress?.(progress);

  return {
    success: progress.failed === 0,
    totalProcessed: projectIds.length,
    successCount: progress.completed,
    failedCount: progress.failed,
    errors: progress.errors,
  };
}

/**
 * Execute bulk re-process operation
 */
export async function bulkReprocess(
  projectIds: string[],
  options: { level?: number; strategy?: string },
  onProgress?: ProgressCallback
): Promise<BulkOperationResult> {
  const progress: BulkOperationProgress = {
    total: projectIds.length,
    completed: 0,
    failed: 0,
    inProgress: true,
    errors: [],
  };

  for (const id of projectIds) {
    progress.currentItem = id;
    onProgress?.(progress);

    try {
      // Fetch project to verify it exists
      const { project } = await apiClient.getProject(id);
      
      // Get latest version to fetch content
      const versions = await apiClient.getProjectVersions(id);
      if (!versions.versions || versions.versions.length === 0) {
        throw new Error('No versions found for this project');
      }
      
      const latestVersion = versions.versions[0]; // Versions are sorted by version number desc
      if (!latestVersion) {
        throw new Error('No versions found for this project');
      }
      const content = latestVersion.content || '';
      
      if (!content) {
        throw new Error('No content found in latest version');
      }
      
      // Re-humanize the content
      const result = await apiClient.humanize(content, options);
      
      // Create a new version with the re-humanized content
      await apiClient.createVersion(id, {
        content: content,
        humanizedContent: result.humanizedText,
      });
      
      progress.completed++;
    } catch (error) {
      progress.failed++;
      progress.errors.push({
        id,
        name: id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    onProgress?.(progress);
  }

  progress.inProgress = false;
  onProgress?.(progress);

  return {
    success: progress.failed === 0,
    totalProcessed: projectIds.length,
    successCount: progress.completed,
    failedCount: progress.failed,
    errors: progress.errors,
  };
}

/**
 * Execute bulk operation based on action type
 */
export async function executeBulkOperation(
  action: BulkActionType,
  projects: ProjectForBulk[],
  options?: {
    exportOptions?: BulkExportOptions;
    reprocessOptions?: { level?: number; strategy?: string };
  },
  onProgress?: ProgressCallback
): Promise<BulkOperationResult> {
  const projectIds = projects.map((p) => p.id);

  switch (action) {
    case 'delete':
      return bulkDelete(projectIds, onProgress);
    case 'export':
      return bulkExport(
        projects,
        options?.exportOptions || {
          format: 'json',
          includeMetadata: true,
          includeHumanized: true,
          includeOriginal: true,
        },
        onProgress
      );
    case 'archive':
      return bulkArchive(projectIds, onProgress);
    case 'reprocess':
      return bulkReprocess(projectIds, options?.reprocessOptions || {}, onProgress);
    default:
      return {
        success: false,
        totalProcessed: 0,
        successCount: 0,
        failedCount: 0,
        errors: [{ id: 'unknown', name: 'Unknown Action', error: `Unknown action: ${action}` }],
      };
  }
}

/**
 * Generate summary report for bulk operation
 */
export function generateSummaryReport(result: BulkOperationResult, action: BulkActionType): string {
  const lines: string[] = [
    '# Bulk Operation Summary Report',
    '',
    `**Action:** ${action.charAt(0).toUpperCase() + action.slice(1)}`,
    `**Date:** ${new Date().toLocaleString()}`,
    '',
    '## Results',
    '',
    `- Total Processed: ${result.totalProcessed}`,
    `- Successful: ${result.successCount}`,
    `- Failed: ${result.failedCount}`,
    `- Success Rate: ${((result.successCount / result.totalProcessed) * 100).toFixed(1)}%`,
    '',
  ];

  if (result.errors.length > 0) {
    lines.push('## Errors', '');
    result.errors.forEach((error) => {
      lines.push(`- **${error.name}** (${error.id}): ${error.error}`);
    });
  }

  return lines.join('\n');
}

/**
 * Sanitize filename for ZIP export
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 100);
}
