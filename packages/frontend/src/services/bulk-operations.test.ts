/**
 * Bulk Operations Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateSummaryReport,
} from './bulk-operations';
import type { BulkOperationResult, BulkActionType } from '../types/bulk-operations';

describe('Bulk Operations Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateSummaryReport', () => {
    it('should generate a summary report for successful operation', () => {
      const result: BulkOperationResult = {
        success: true,
        totalProcessed: 5,
        successCount: 5,
        failedCount: 0,
        errors: [],
      };

      const report = generateSummaryReport(result, 'delete');

      expect(report).toContain('# Bulk Operation Summary Report');
      expect(report).toContain('**Action:** Delete');
      expect(report).toContain('Total Processed: 5');
      expect(report).toContain('Successful: 5');
      expect(report).toContain('Failed: 0');
      expect(report).toContain('Success Rate: 100.0%');
      expect(report).not.toContain('## Errors');
    });

    it('should include errors in report when operation has failures', () => {
      const result: BulkOperationResult = {
        success: false,
        totalProcessed: 3,
        successCount: 1,
        failedCount: 2,
        errors: [
          { id: '1', name: 'Project 1', error: 'Network error' },
          { id: '2', name: 'Project 2', error: 'Permission denied' },
        ],
      };

      const report = generateSummaryReport(result, 'export');

      expect(report).toContain('**Action:** Export');
      expect(report).toContain('Total Processed: 3');
      expect(report).toContain('Successful: 1');
      expect(report).toContain('Failed: 2');
      expect(report).toContain('## Errors');
      expect(report).toContain('**Project 1** (1): Network error');
      expect(report).toContain('**Project 2** (2): Permission denied');
    });

    it('should calculate correct success rate', () => {
      const result: BulkOperationResult = {
        success: false,
        totalProcessed: 10,
        successCount: 7,
        failedCount: 3,
        errors: [],
      };

      const report = generateSummaryReport(result, 'archive');

      expect(report).toContain('Success Rate: 70.0%');
    });

    it('should handle different action types', () => {
      const actions: BulkActionType[] = ['delete', 'export', 'archive', 'reprocess'];
      const result: BulkOperationResult = {
        success: true,
        totalProcessed: 1,
        successCount: 1,
        failedCount: 0,
        errors: [],
      };

      actions.forEach((action) => {
        const report = generateSummaryReport(result, action);
        const capitalizedAction = action.charAt(0).toUpperCase() + action.slice(1);
        expect(report).toContain(`**Action:** ${capitalizedAction}`);
      });
    });
  });
});
