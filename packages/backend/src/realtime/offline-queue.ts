/**
 * Offline Queue Manager
 * Requirements: 21.3 - Handle offline mode with local queuing
 * Task 20: Handle offline mode with local queuing
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import {
  type DocumentOperation,
  type TextOperation,
  ConnectionState,
} from './types';
import { composeOperations, transformOperations } from './operational-transform';

// ============================================
// Offline Queue Error
// ============================================

export class OfflineQueueError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'OfflineQueueError';
    this.code = code;
  }
}

// ============================================
// Queue Entry
// ============================================

interface QueueEntry {
  operation: DocumentOperation;
  addedAt: Date;
  retryCount: number;
  lastRetryAt: Date | null;
}

// ============================================
// Offline Queue Manager
// ============================================

/**
 * Manages offline operations queue for a client
 * Handles queuing, merging, and flushing of operations when reconnecting
 */
export class OfflineQueueManager {
  private queue: QueueEntry[] = [];
  private projectId: string;
  private userId: string;
  private baseVersion: number;
  private maxQueueSize: number;
  private maxRetries: number;

  constructor(
    projectId: string,
    userId: string,
    baseVersion: number,
    options: { maxQueueSize?: number; maxRetries?: number } = {}
  ) {
    this.projectId = projectId;
    this.userId = userId;
    this.baseVersion = baseVersion;
    this.maxQueueSize = options.maxQueueSize || 1000;
    this.maxRetries = options.maxRetries || 3;
  }

  /**
   * Add an operation to the queue
   */
  enqueue(operation: DocumentOperation): void {
    if (this.queue.length >= this.maxQueueSize) {
      throw new OfflineQueueError(
        'Offline queue is full. Please reconnect to sync changes.',
        'QUEUE_FULL'
      );
    }

    // Validate operation belongs to this project/user
    if (operation.projectId !== this.projectId) {
      throw new OfflineQueueError(
        'Operation project ID does not match queue project',
        'PROJECT_MISMATCH'
      );
    }

    if (operation.userId !== this.userId) {
      throw new OfflineQueueError(
        'Operation user ID does not match queue user',
        'USER_MISMATCH'
      );
    }

    this.queue.push({
      operation,
      addedAt: new Date(),
      retryCount: 0,
      lastRetryAt: null,
    });

    logger.debug('Operation queued for offline sync', {
      operationId: operation.id,
      projectId: this.projectId,
      queueSize: this.queue.length,
    });
  }

  /**
   * Get all queued operations
   */
  getQueue(): DocumentOperation[] {
    return this.queue.map((entry) => entry.operation);
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * Clear the queue
   */
  clear(): void {
    this.queue = [];
  }

  /**
   * Remove an operation from the queue by ID
   */
  remove(operationId: string): boolean {
    const index = this.queue.findIndex((entry) => entry.operation.id === operationId);
    if (index !== -1) {
      this.queue.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Merge consecutive operations to reduce queue size
   * This optimizes the queue by combining operations that can be composed
   */
  optimize(): void {
    if (this.queue.length < 2) return;

    const optimized: QueueEntry[] = [];
    let current = this.queue[0];

    for (let i = 1; i < this.queue.length; i++) {
      const next = this.queue[i];

      // Try to compose operations
      try {
        const composedOps = composeOperations(
          current.operation.operations,
          next.operation.operations
        );

        // Create merged operation
        current = {
          operation: {
            id: uuidv4(),
            projectId: this.projectId,
            userId: this.userId,
            version: current.operation.version,
            operations: composedOps,
            timestamp: Date.now(),
          },
          addedAt: current.addedAt,
          retryCount: Math.max(current.retryCount, next.retryCount),
          lastRetryAt: null,
        };
      } catch {
        // Cannot compose, keep separate
        optimized.push(current);
        current = next;
      }
    }

    optimized.push(current);
    this.queue = optimized;

    logger.debug('Offline queue optimized', {
      projectId: this.projectId,
      originalSize: this.queue.length,
      optimizedSize: optimized.length,
    });
  }

  /**
   * Transform queued operations against server operations
   * Used when reconnecting and server has newer operations
   */
  transformAgainst(serverOperations: DocumentOperation[]): void {
    if (serverOperations.length === 0 || this.queue.length === 0) return;

    for (const serverOp of serverOperations) {
      for (let i = 0; i < this.queue.length; i++) {
        const entry = this.queue[i];
        const result = transformOperations(
          entry.operation.operations,
          serverOp.operations
        );

        entry.operation = {
          ...entry.operation,
          operations: result.operation1,
        };
      }
    }

    // Update base version
    const maxServerVersion = Math.max(...serverOperations.map((op) => op.version));
    this.baseVersion = maxServerVersion;

    logger.debug('Offline queue transformed against server operations', {
      projectId: this.projectId,
      serverOpsCount: serverOperations.length,
      newBaseVersion: this.baseVersion,
    });
  }

  /**
   * Prepare operations for flushing to server
   * Returns operations with updated versions
   */
  prepareForFlush(currentServerVersion: number): DocumentOperation[] {
    const operations: DocumentOperation[] = [];
    let version = currentServerVersion;

    for (const entry of this.queue) {
      version++;
      operations.push({
        ...entry.operation,
        version,
        timestamp: Date.now(),
      });
    }

    return operations;
  }

  /**
   * Mark an operation as successfully synced
   */
  markSynced(operationId: string): void {
    this.remove(operationId);
  }

  /**
   * Mark an operation as failed and increment retry count
   */
  markFailed(operationId: string): boolean {
    const entry = this.queue.find((e) => e.operation.id === operationId);
    if (!entry) return false;

    entry.retryCount++;
    entry.lastRetryAt = new Date();

    if (entry.retryCount >= this.maxRetries) {
      logger.warn('Operation exceeded max retries, removing from queue', {
        operationId,
        projectId: this.projectId,
        retryCount: entry.retryCount,
      });
      this.remove(operationId);
      return false;
    }

    return true;
  }

  /**
   * Get operations that are ready for retry
   */
  getRetryableOperations(minDelayMs = 1000): DocumentOperation[] {
    const now = Date.now();
    return this.queue
      .filter((entry) => {
        if (entry.retryCount === 0) return true;
        if (!entry.lastRetryAt) return true;
        return now - entry.lastRetryAt.getTime() >= minDelayMs * entry.retryCount;
      })
      .map((entry) => entry.operation);
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    size: number;
    oldestEntry: Date | null;
    totalRetries: number;
    failedOperations: number;
  } {
    const totalRetries = this.queue.reduce((sum, entry) => sum + entry.retryCount, 0);
    const failedOperations = this.queue.filter(
      (entry) => entry.retryCount >= this.maxRetries
    ).length;

    return {
      size: this.queue.length,
      oldestEntry: this.queue.length > 0 ? this.queue[0].addedAt : null,
      totalRetries,
      failedOperations,
    };
  }
}

// ============================================
// Client-side Offline Manager
// ============================================

/**
 * Client-side manager for handling offline state
 * This would typically run in the browser/client
 */
export class OfflineManager {
  private queues: Map<string, OfflineQueueManager> = new Map();
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private onReconnect: ((projectId: string, operations: DocumentOperation[]) => Promise<void>) | null = null;

  /**
   * Set connection state
   */
  setConnectionState(state: ConnectionState): void {
    const wasOffline = this.connectionState === ConnectionState.DISCONNECTED;
    this.connectionState = state;

    // If reconnecting, flush queues
    if (wasOffline && state === ConnectionState.CONNECTED) {
      void this.flushAllQueues();
    }
  }

  /**
   * Get connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Check if currently offline
   */
  isOffline(): boolean {
    return this.connectionState === ConnectionState.DISCONNECTED;
  }

  /**
   * Get or create queue for a project
   */
  getQueue(projectId: string, userId: string, baseVersion: number): OfflineQueueManager {
    let queue = this.queues.get(projectId);
    if (!queue) {
      queue = new OfflineQueueManager(projectId, userId, baseVersion);
      this.queues.set(projectId, queue);
    }
    return queue;
  }

  /**
   * Queue an operation for offline sync
   */
  queueOperation(operation: DocumentOperation): void {
    const queue = this.queues.get(operation.projectId);
    if (queue) {
      queue.enqueue(operation);
    } else {
      // Create new queue
      const newQueue = new OfflineQueueManager(
        operation.projectId,
        operation.userId,
        operation.version - 1
      );
      newQueue.enqueue(operation);
      this.queues.set(operation.projectId, newQueue);
    }
  }

  /**
   * Set reconnect handler
   */
  setReconnectHandler(
    handler: (projectId: string, operations: DocumentOperation[]) => Promise<void>
  ): void {
    this.onReconnect = handler;
  }

  /**
   * Flush all queues on reconnect
   */
  private async flushAllQueues(): Promise<void> {
    if (!this.onReconnect) return;

    for (const [projectId, queue] of this.queues) {
      if (queue.isEmpty()) continue;

      try {
        // Optimize queue before flushing
        queue.optimize();

        const operations = queue.getQueue();
        await this.onReconnect(projectId, operations);

        // Clear queue on success
        queue.clear();

        logger.info('Offline queue flushed successfully', {
          projectId,
          operationCount: operations.length,
        });
      } catch (error) {
        logger.error('Failed to flush offline queue', {
          projectId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  /**
   * Clear queue for a project
   */
  clearQueue(projectId: string): void {
    this.queues.delete(projectId);
  }

  /**
   * Clear all queues
   */
  clearAllQueues(): void {
    this.queues.clear();
  }

  /**
   * Get total queued operations count
   */
  getTotalQueuedCount(): number {
    let total = 0;
    for (const queue of this.queues.values()) {
      total += queue.size();
    }
    return total;
  }
}

// ============================================
// Singleton Instance
// ============================================

let offlineManager: OfflineManager | null = null;

/**
 * Get the offline manager instance
 */
export function getOfflineManager(): OfflineManager {
  if (!offlineManager) {
    offlineManager = new OfflineManager();
  }
  return offlineManager;
}
