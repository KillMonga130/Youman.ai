/**
 * Operational Transformation (OT) for Conflict Resolution
 * Requirements: 21.3 - Implement conflict resolution
 * Task 20: Create operational transformation for conflict resolution
 */

import { v4 as uuidv4 } from 'uuid';
import {
  OperationType,
  type TextOperation,
  type DocumentOperation,
  type TransformResult,
  type OperationHistoryEntry,
} from './types';

// ============================================
// OT Error Class
// ============================================

export class OTError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'OTError';
    this.code = code;
  }
}

// ============================================
// Operation Composition
// ============================================

/**
 * Compose two operations into a single operation
 * The result is equivalent to applying op1 then op2
 */
export function composeOperations(
  op1: TextOperation[],
  op2: TextOperation[]
): TextOperation[] {
  const result: TextOperation[] = [];
  let i1 = 0;
  let i2 = 0;
  let o1 = op1[i1];
  let o2 = op2[i2];

  while (o1 || o2) {
    // If op1 is INSERT, add it to result
    if (o1 && o1.type === OperationType.INSERT) {
      result.push({ ...o1 });
      i1++;
      o1 = op1[i1];
      continue;
    }

    // If op2 is DELETE, add it to result
    if (o2 && o2.type === OperationType.DELETE) {
      result.push({ ...o2 });
      i2++;
      o2 = op2[i2];
      continue;
    }

    // Both operations must be RETAIN or one is DELETE
    if (!o1 || !o2) {
      throw new OTError('Operations cannot be composed - length mismatch', 'COMPOSE_LENGTH_MISMATCH');
    }

    if (o1.type === OperationType.RETAIN && o2.type === OperationType.RETAIN) {
      const len1 = o1.length || 0;
      const len2 = o2.length || 0;
      const minLen = Math.min(len1, len2);

      result.push({ type: OperationType.RETAIN, position: o1.position, length: minLen });

      if (len1 > len2) {
        o1 = { ...o1, length: len1 - len2, position: o1.position + len2 };
        i2++;
        o2 = op2[i2];
      } else if (len1 < len2) {
        i1++;
        o1 = op1[i1];
        o2 = { ...o2, length: len2 - len1, position: o2.position + len1 };
      } else {
        i1++;
        i2++;
        o1 = op1[i1];
        o2 = op2[i2];
      }
    } else if (o1.type === OperationType.DELETE && o2.type === OperationType.RETAIN) {
      const len1 = o1.length || 0;
      const len2 = o2.length || 0;
      const minLen = Math.min(len1, len2);

      result.push({ type: OperationType.DELETE, position: o1.position, length: minLen });

      if (len1 > len2) {
        o1 = { ...o1, length: len1 - len2 };
        i2++;
        o2 = op2[i2];
      } else if (len1 < len2) {
        i1++;
        o1 = op1[i1];
        o2 = { ...o2, length: len2 - len1 };
      } else {
        i1++;
        i2++;
        o1 = op1[i1];
        o2 = op2[i2];
      }
    } else if (o1.type === OperationType.RETAIN && o2.type === OperationType.INSERT) {
      result.push({ ...o2 });
      i2++;
      o2 = op2[i2];
    } else {
      throw new OTError('Invalid operation composition', 'INVALID_COMPOSE');
    }
  }

  return optimizeOperations(result);
}

// ============================================
// Operation Transformation
// ============================================

/**
 * Transform two concurrent operations
 * Returns transformed versions where:
 * - apply(apply(doc, op1), transform(op2, op1)) = apply(apply(doc, op2), transform(op1, op2))
 */
export function transformOperations(
  op1: TextOperation[],
  op2: TextOperation[]
): TransformResult {
  const result1: TextOperation[] = [];
  const result2: TextOperation[] = [];

  let i1 = 0;
  let i2 = 0;
  let offset1 = 0;
  let offset2 = 0;

  while (i1 < op1.length || i2 < op2.length) {
    const o1 = op1[i1];
    const o2 = op2[i2];

    // Handle INSERT operations - they take priority
    if (o1 && o1.type === OperationType.INSERT) {
      const insertLen = o1.text?.length || 0;
      result1.push({ ...o1, position: o1.position + offset2 });
      result2.push({ type: OperationType.RETAIN, position: o1.position + offset2, length: insertLen });
      offset1 += insertLen;
      i1++;
      continue;
    }

    if (o2 && o2.type === OperationType.INSERT) {
      const insertLen = o2.text?.length || 0;
      result2.push({ ...o2, position: o2.position + offset1 });
      result1.push({ type: OperationType.RETAIN, position: o2.position + offset1, length: insertLen });
      offset2 += insertLen;
      i2++;
      continue;
    }

    // Both are RETAIN or DELETE
    if (!o1 && !o2) break;

    if (!o1) {
      // Only op2 remaining
      result2.push({ ...o2, position: o2.position + offset1 });
      i2++;
      continue;
    }

    if (!o2) {
      // Only op1 remaining
      result1.push({ ...o1, position: o1.position + offset2 });
      i1++;
      continue;
    }

    // Both operations exist
    const len1 = o1.length || 0;
    const len2 = o2.length || 0;

    if (o1.type === OperationType.RETAIN && o2.type === OperationType.RETAIN) {
      const minLen = Math.min(len1, len2);
      result1.push({ type: OperationType.RETAIN, position: o1.position + offset2, length: minLen });
      result2.push({ type: OperationType.RETAIN, position: o2.position + offset1, length: minLen });

      if (len1 > len2) {
        op1[i1] = { ...o1, length: len1 - len2, position: o1.position + len2 };
        i2++;
      } else if (len1 < len2) {
        op2[i2] = { ...o2, length: len2 - len1, position: o2.position + len1 };
        i1++;
      } else {
        i1++;
        i2++;
      }
    } else if (o1.type === OperationType.DELETE && o2.type === OperationType.DELETE) {
      // Both delete - the intersection is already deleted
      const minLen = Math.min(len1, len2);
      offset1 -= minLen;
      offset2 -= minLen;

      if (len1 > len2) {
        op1[i1] = { ...o1, length: len1 - len2 };
        i2++;
      } else if (len1 < len2) {
        op2[i2] = { ...o2, length: len2 - len1 };
        i1++;
      } else {
        i1++;
        i2++;
      }
    } else if (o1.type === OperationType.DELETE && o2.type === OperationType.RETAIN) {
      const minLen = Math.min(len1, len2);
      result1.push({ type: OperationType.DELETE, position: o1.position + offset2, length: minLen });
      offset1 -= minLen;

      if (len1 > len2) {
        op1[i1] = { ...o1, length: len1 - len2 };
        i2++;
      } else if (len1 < len2) {
        op2[i2] = { ...o2, length: len2 - len1 };
        i1++;
      } else {
        i1++;
        i2++;
      }
    } else if (o1.type === OperationType.RETAIN && o2.type === OperationType.DELETE) {
      const minLen = Math.min(len1, len2);
      result2.push({ type: OperationType.DELETE, position: o2.position + offset1, length: minLen });
      offset2 -= minLen;

      if (len1 > len2) {
        op1[i1] = { ...o1, length: len1 - len2 };
        i2++;
      } else if (len1 < len2) {
        op2[i2] = { ...o2, length: len2 - len1 };
        i1++;
      } else {
        i1++;
        i2++;
      }
    }
  }

  return {
    operation1: optimizeOperations(result1),
    operation2: optimizeOperations(result2),
  };
}

// ============================================
// Operation Application
// ============================================

/**
 * Apply operations to a document string
 */
export function applyOperations(document: string, operations: TextOperation[]): string {
  let result = document;
  let offset = 0;

  // Sort operations by position for consistent application
  const sortedOps = [...operations].sort((a, b) => a.position - b.position);

  for (const op of sortedOps) {
    const adjustedPosition = op.position + offset;

    switch (op.type) {
      case OperationType.INSERT:
        if (adjustedPosition < 0 || adjustedPosition > result.length) {
          throw new OTError(
            `Invalid insert position: ${adjustedPosition} (document length: ${result.length})`,
            'INVALID_POSITION'
          );
        }
        const insertText = op.text || '';
        result = result.slice(0, adjustedPosition) + insertText + result.slice(adjustedPosition);
        offset += insertText.length;
        break;

      case OperationType.DELETE:
        const deleteLen = op.length || 0;
        if (adjustedPosition < 0 || adjustedPosition + deleteLen > result.length) {
          throw new OTError(
            `Invalid delete range: ${adjustedPosition} to ${adjustedPosition + deleteLen} (document length: ${result.length})`,
            'INVALID_RANGE'
          );
        }
        result = result.slice(0, adjustedPosition) + result.slice(adjustedPosition + deleteLen);
        offset -= deleteLen;
        break;

      case OperationType.RETAIN:
        // RETAIN doesn't modify the document
        break;
    }
  }

  return result;
}

// ============================================
// Operation Optimization
// ============================================

/**
 * Optimize operations by merging consecutive operations of the same type
 */
export function optimizeOperations(operations: TextOperation[]): TextOperation[] {
  if (operations.length === 0) return [];

  const result: TextOperation[] = [];
  let current = { ...operations[0] };

  for (let i = 1; i < operations.length; i++) {
    const op = operations[i];

    // Try to merge with current operation
    if (current.type === op.type) {
      if (current.type === OperationType.INSERT) {
        // Merge consecutive inserts at the same position
        if (current.position + (current.text?.length || 0) === op.position) {
          current.text = (current.text || '') + (op.text || '');
          continue;
        }
      } else if (current.type === OperationType.DELETE) {
        // Merge consecutive deletes
        if (current.position === op.position) {
          current.length = (current.length || 0) + (op.length || 0);
          continue;
        }
      } else if (current.type === OperationType.RETAIN) {
        // Merge consecutive retains
        if (current.position + (current.length || 0) === op.position) {
          current.length = (current.length || 0) + (op.length || 0);
          continue;
        }
      }
    }

    // Cannot merge, push current and start new
    result.push(current);
    current = { ...op };
  }

  result.push(current);
  return result;
}

// ============================================
// Operation Inversion
// ============================================

/**
 * Create an inverse operation that undoes the given operation
 */
export function invertOperation(
  operation: TextOperation,
  document: string
): TextOperation {
  switch (operation.type) {
    case OperationType.INSERT:
      return {
        type: OperationType.DELETE,
        position: operation.position,
        length: operation.text?.length || 0,
      };

    case OperationType.DELETE:
      const deletedText = document.slice(
        operation.position,
        operation.position + (operation.length || 0)
      );
      return {
        type: OperationType.INSERT,
        position: operation.position,
        text: deletedText,
      };

    case OperationType.RETAIN:
      return { ...operation };

    default:
      throw new OTError('Unknown operation type', 'UNKNOWN_OPERATION');
  }
}

/**
 * Create inverse operations for a document operation
 */
export function invertDocumentOperation(
  docOp: DocumentOperation,
  document: string
): DocumentOperation {
  const invertedOps = docOp.operations.map((op) => invertOperation(op, document)).reverse();

  return {
    id: uuidv4(),
    projectId: docOp.projectId,
    userId: docOp.userId,
    version: docOp.version + 1,
    operations: invertedOps,
    timestamp: Date.now(),
  };
}

// ============================================
// Operation History Management
// ============================================

/**
 * Operation history manager for a document
 */
export class OperationHistory {
  private history: OperationHistoryEntry[] = [];
  private maxSize: number;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
  }

  /**
   * Add an operation to history
   */
  add(operation: DocumentOperation, transformedFrom?: string): void {
    this.history.push({
      operation,
      appliedAt: new Date(),
      transformedFrom,
    });

    // Trim history if it exceeds max size
    if (this.history.length > this.maxSize) {
      this.history = this.history.slice(-this.maxSize);
    }
  }

  /**
   * Get operations since a specific version
   */
  getOperationsSince(version: number): DocumentOperation[] {
    return this.history
      .filter((entry) => entry.operation.version > version)
      .map((entry) => entry.operation);
  }

  /**
   * Get the latest version number
   */
  getLatestVersion(): number {
    if (this.history.length === 0) return 0;
    return Math.max(...this.history.map((entry) => entry.operation.version));
  }

  /**
   * Clear history
   */
  clear(): void {
    this.history = [];
  }

  /**
   * Get history size
   */
  size(): number {
    return this.history.length;
  }
}

// ============================================
// Document State Manager
// ============================================

/**
 * Manages document state with OT support
 */
export class DocumentState {
  private content: string;
  private version: number;
  private history: OperationHistory;
  private pendingOperations: Map<string, DocumentOperation>;

  constructor(initialContent = '', initialVersion = 0) {
    this.content = initialContent;
    this.version = initialVersion;
    this.history = new OperationHistory();
    this.pendingOperations = new Map();
  }

  /**
   * Get current document content
   */
  getContent(): string {
    return this.content;
  }

  /**
   * Get current version
   */
  getVersion(): number {
    return this.version;
  }

  /**
   * Apply a document operation
   * Returns the transformed operation if successful
   */
  applyOperation(docOp: DocumentOperation): DocumentOperation | null {
    // Check if operation is for the correct version
    if (docOp.version < this.version) {
      // Need to transform against operations that happened since
      const missedOps = this.history.getOperationsSince(docOp.version);
      let transformedOps = docOp.operations;

      for (const missedOp of missedOps) {
        const result = transformOperations(transformedOps, missedOp.operations);
        transformedOps = result.operation1;
      }

      docOp = {
        ...docOp,
        operations: transformedOps,
        version: this.version,
      };
    }

    try {
      // Apply the operation
      this.content = applyOperations(this.content, docOp.operations);
      this.version++;

      // Update operation version and add to history
      const appliedOp: DocumentOperation = {
        ...docOp,
        version: this.version,
      };
      this.history.add(appliedOp);

      return appliedOp;
    } catch (error) {
      // Operation failed
      return null;
    }
  }

  /**
   * Get operations since a version for syncing
   */
  getOperationsSince(version: number): DocumentOperation[] {
    return this.history.getOperationsSince(version);
  }

  /**
   * Reset document state
   */
  reset(content: string, version: number): void {
    this.content = content;
    this.version = version;
    this.history.clear();
    this.pendingOperations.clear();
  }
}
