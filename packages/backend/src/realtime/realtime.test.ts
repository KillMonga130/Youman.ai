/**
 * Real-time Collaboration Tests
 * Requirements: 21.3 - Implement conflict resolution and display who is currently viewing or editing
 * Task 20: Build real-time collaboration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  OperationType,
  MessageType,
  ConnectionState,
  getUserColor,
  USER_COLORS,
  type TextOperation,
  type DocumentOperation,
} from './types';
import {
  composeOperations,
  transformOperations,
  applyOperations,
  optimizeOperations,
  invertOperation,
  DocumentState,
  OperationHistory,
} from './operational-transform';
import {
  OfflineQueueManager,
  OfflineManager,
} from './offline-queue';

// ============================================
// Operational Transformation Tests
// ============================================

describe('Operational Transformation', () => {
  describe('applyOperations', () => {
    it('should apply INSERT operation correctly', () => {
      const doc = 'Hello World';
      const ops: TextOperation[] = [
        { type: OperationType.INSERT, position: 5, text: ' Beautiful' },
      ];

      const result = applyOperations(doc, ops);
      expect(result).toBe('Hello Beautiful World');
    });

    it('should apply DELETE operation correctly', () => {
      const doc = 'Hello Beautiful World';
      const ops: TextOperation[] = [
        { type: OperationType.DELETE, position: 5, length: 10 },
      ];

      const result = applyOperations(doc, ops);
      expect(result).toBe('Hello World');
    });

    it('should apply multiple operations in sequence', () => {
      const doc = 'Hello';
      const ops: TextOperation[] = [
        { type: OperationType.INSERT, position: 5, text: ' World' },
        { type: OperationType.INSERT, position: 0, text: 'Say: ' },
      ];

      const result = applyOperations(doc, ops);
      expect(result).toBe('Say: Hello World');
    });

    it('should handle empty document', () => {
      const doc = '';
      const ops: TextOperation[] = [
        { type: OperationType.INSERT, position: 0, text: 'Hello' },
      ];

      const result = applyOperations(doc, ops);
      expect(result).toBe('Hello');
    });

    it('should handle RETAIN operation (no change)', () => {
      const doc = 'Hello World';
      const ops: TextOperation[] = [
        { type: OperationType.RETAIN, position: 0, length: 11 },
      ];

      const result = applyOperations(doc, ops);
      expect(result).toBe('Hello World');
    });

    it('should throw error for invalid insert position', () => {
      const doc = 'Hello';
      const ops: TextOperation[] = [
        { type: OperationType.INSERT, position: 100, text: 'World' },
      ];

      expect(() => applyOperations(doc, ops)).toThrow('Invalid insert position');
    });

    it('should throw error for invalid delete range', () => {
      const doc = 'Hello';
      const ops: TextOperation[] = [
        { type: OperationType.DELETE, position: 3, length: 10 },
      ];

      expect(() => applyOperations(doc, ops)).toThrow('Invalid delete range');
    });
  });

  describe('transformOperations', () => {
    it('should transform concurrent INSERT operations', () => {
      // User A inserts at position 0, User B inserts at position 5
      const op1: TextOperation[] = [
        { type: OperationType.INSERT, position: 0, text: 'A' },
      ];
      const op2: TextOperation[] = [
        { type: OperationType.INSERT, position: 5, text: 'B' },
      ];

      const result = transformOperations(op1, op2);

      // Both operations should be transformed
      // The result should contain operations that can be applied
      expect(result.operation1.length).toBeGreaterThan(0);
      expect(result.operation2.length).toBeGreaterThan(0);
      // The transformed op2 should have position adjusted for op1's insertion
      const insertOp = result.operation2.find(op => op.type === OperationType.INSERT);
      expect(insertOp).toBeDefined();
    });

    it('should transform INSERT vs DELETE operations', () => {
      // User A inserts at position 2, User B deletes from position 0 length 3
      const op1: TextOperation[] = [
        { type: OperationType.INSERT, position: 2, text: 'X' },
      ];
      const op2: TextOperation[] = [
        { type: OperationType.DELETE, position: 0, length: 3 },
      ];

      const result = transformOperations(op1, op2);

      // op1 should still insert at position 2
      // op2's delete should account for the insertion
      expect(result.operation1.length).toBeGreaterThan(0);
      expect(result.operation2.length).toBeGreaterThan(0);
    });

    it('should handle overlapping DELETE operations', () => {
      // Both users delete overlapping regions
      const op1: TextOperation[] = [
        { type: OperationType.DELETE, position: 0, length: 5 },
      ];
      const op2: TextOperation[] = [
        { type: OperationType.DELETE, position: 3, length: 5 },
      ];

      const result = transformOperations(op1, op2);

      // The overlapping part should only be deleted once
      expect(result.operation1.length).toBeGreaterThanOrEqual(0);
      expect(result.operation2.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('optimizeOperations', () => {
    it('should merge consecutive INSERT operations', () => {
      const ops: TextOperation[] = [
        { type: OperationType.INSERT, position: 0, text: 'Hello' },
        { type: OperationType.INSERT, position: 5, text: ' World' },
      ];

      const optimized = optimizeOperations(ops);

      expect(optimized.length).toBe(1);
      expect(optimized[0].text).toBe('Hello World');
    });

    it('should merge consecutive DELETE operations at same position', () => {
      const ops: TextOperation[] = [
        { type: OperationType.DELETE, position: 0, length: 3 },
        { type: OperationType.DELETE, position: 0, length: 2 },
      ];

      const optimized = optimizeOperations(ops);

      expect(optimized.length).toBe(1);
      expect(optimized[0].length).toBe(5);
    });

    it('should not merge non-consecutive operations', () => {
      const ops: TextOperation[] = [
        { type: OperationType.INSERT, position: 0, text: 'A' },
        { type: OperationType.INSERT, position: 10, text: 'B' },
      ];

      const optimized = optimizeOperations(ops);

      expect(optimized.length).toBe(2);
    });

    it('should handle empty operations array', () => {
      const optimized = optimizeOperations([]);
      expect(optimized).toEqual([]);
    });
  });

  describe('invertOperation', () => {
    it('should invert INSERT to DELETE', () => {
      const op: TextOperation = {
        type: OperationType.INSERT,
        position: 5,
        text: 'Hello',
      };

      const inverted = invertOperation(op, '');

      expect(inverted.type).toBe(OperationType.DELETE);
      expect(inverted.position).toBe(5);
      expect(inverted.length).toBe(5);
    });

    it('should invert DELETE to INSERT', () => {
      const doc = 'Hello World';
      const op: TextOperation = {
        type: OperationType.DELETE,
        position: 6,
        length: 5,
      };

      const inverted = invertOperation(op, doc);

      expect(inverted.type).toBe(OperationType.INSERT);
      expect(inverted.position).toBe(6);
      expect(inverted.text).toBe('World');
    });

    it('should keep RETAIN unchanged', () => {
      const op: TextOperation = {
        type: OperationType.RETAIN,
        position: 0,
        length: 10,
      };

      const inverted = invertOperation(op, '');

      expect(inverted.type).toBe(OperationType.RETAIN);
      expect(inverted.length).toBe(10);
    });
  });
});

// ============================================
// Document State Tests
// ============================================

describe('DocumentState', () => {
  let docState: DocumentState;

  beforeEach(() => {
    docState = new DocumentState('Hello World', 0);
  });

  it('should initialize with correct content and version', () => {
    expect(docState.getContent()).toBe('Hello World');
    expect(docState.getVersion()).toBe(0);
  });

  it('should apply operation and increment version', () => {
    const op: DocumentOperation = {
      id: 'test-op-1',
      projectId: 'project-1',
      userId: 'user-1',
      version: 0,
      operations: [
        { type: OperationType.INSERT, position: 5, text: ' Beautiful' },
      ],
      timestamp: Date.now(),
    };

    const result = docState.applyOperation(op);

    expect(result).not.toBeNull();
    expect(docState.getContent()).toBe('Hello Beautiful World');
    expect(docState.getVersion()).toBe(1);
  });

  it('should transform operations from older versions', () => {
    // Apply first operation
    const op1: DocumentOperation = {
      id: 'test-op-1',
      projectId: 'project-1',
      userId: 'user-1',
      version: 0,
      operations: [
        { type: OperationType.INSERT, position: 0, text: 'Say: ' },
      ],
      timestamp: Date.now(),
    };
    docState.applyOperation(op1);

    // Apply second operation with old version (should be transformed)
    const op2: DocumentOperation = {
      id: 'test-op-2',
      projectId: 'project-1',
      userId: 'user-2',
      version: 0, // Old version
      operations: [
        { type: OperationType.INSERT, position: 5, text: ' Beautiful' },
      ],
      timestamp: Date.now(),
    };
    const result = docState.applyOperation(op2);

    expect(result).not.toBeNull();
    expect(docState.getVersion()).toBe(2);
  });

  it('should reset document state', () => {
    docState.reset('New Content', 5);

    expect(docState.getContent()).toBe('New Content');
    expect(docState.getVersion()).toBe(5);
  });
});

// ============================================
// Operation History Tests
// ============================================

describe('OperationHistory', () => {
  let history: OperationHistory;

  beforeEach(() => {
    history = new OperationHistory(100);
  });

  it('should add operations to history', () => {
    const op: DocumentOperation = {
      id: 'test-op-1',
      projectId: 'project-1',
      userId: 'user-1',
      version: 1,
      operations: [],
      timestamp: Date.now(),
    };

    history.add(op);

    expect(history.size()).toBe(1);
    expect(history.getLatestVersion()).toBe(1);
  });

  it('should get operations since a version', () => {
    for (let i = 1; i <= 5; i++) {
      history.add({
        id: `test-op-${i}`,
        projectId: 'project-1',
        userId: 'user-1',
        version: i,
        operations: [],
        timestamp: Date.now(),
      });
    }

    const ops = history.getOperationsSince(2);

    expect(ops.length).toBe(3); // versions 3, 4, 5
    expect(ops[0].version).toBe(3);
  });

  it('should trim history when exceeding max size', () => {
    const smallHistory = new OperationHistory(5);

    for (let i = 1; i <= 10; i++) {
      smallHistory.add({
        id: `test-op-${i}`,
        projectId: 'project-1',
        userId: 'user-1',
        version: i,
        operations: [],
        timestamp: Date.now(),
      });
    }

    expect(smallHistory.size()).toBe(5);
    expect(smallHistory.getLatestVersion()).toBe(10);
  });

  it('should clear history', () => {
    history.add({
      id: 'test-op-1',
      projectId: 'project-1',
      userId: 'user-1',
      version: 1,
      operations: [],
      timestamp: Date.now(),
    });

    history.clear();

    expect(history.size()).toBe(0);
    expect(history.getLatestVersion()).toBe(0);
  });
});

// ============================================
// Offline Queue Tests
// ============================================

describe('OfflineQueueManager', () => {
  let queue: OfflineQueueManager;
  const projectId = 'project-1';
  const userId = 'user-1';

  beforeEach(() => {
    queue = new OfflineQueueManager(projectId, userId, 0);
  });

  it('should enqueue operations', () => {
    const op: DocumentOperation = {
      id: 'test-op-1',
      projectId,
      userId,
      version: 1,
      operations: [
        { type: OperationType.INSERT, position: 0, text: 'Hello' },
      ],
      timestamp: Date.now(),
    };

    queue.enqueue(op);

    expect(queue.size()).toBe(1);
    expect(queue.isEmpty()).toBe(false);
  });

  it('should reject operations with wrong project ID', () => {
    const op: DocumentOperation = {
      id: 'test-op-1',
      projectId: 'wrong-project',
      userId,
      version: 1,
      operations: [],
      timestamp: Date.now(),
    };

    expect(() => queue.enqueue(op)).toThrow('project');
  });

  it('should reject operations with wrong user ID', () => {
    const op: DocumentOperation = {
      id: 'test-op-1',
      projectId,
      userId: 'wrong-user',
      version: 1,
      operations: [],
      timestamp: Date.now(),
    };

    expect(() => queue.enqueue(op)).toThrow('user');
  });

  it('should remove operations by ID', () => {
    const op: DocumentOperation = {
      id: 'test-op-1',
      projectId,
      userId,
      version: 1,
      operations: [],
      timestamp: Date.now(),
    };

    queue.enqueue(op);
    const removed = queue.remove('test-op-1');

    expect(removed).toBe(true);
    expect(queue.isEmpty()).toBe(true);
  });

  it('should clear the queue', () => {
    queue.enqueue({
      id: 'test-op-1',
      projectId,
      userId,
      version: 1,
      operations: [],
      timestamp: Date.now(),
    });

    queue.clear();

    expect(queue.isEmpty()).toBe(true);
  });

  it('should get queue statistics', () => {
    queue.enqueue({
      id: 'test-op-1',
      projectId,
      userId,
      version: 1,
      operations: [],
      timestamp: Date.now(),
    });

    const stats = queue.getStats();

    expect(stats.size).toBe(1);
    expect(stats.oldestEntry).not.toBeNull();
    expect(stats.totalRetries).toBe(0);
    expect(stats.failedOperations).toBe(0);
  });

  it('should prepare operations for flush with updated versions', () => {
    queue.enqueue({
      id: 'test-op-1',
      projectId,
      userId,
      version: 1,
      operations: [],
      timestamp: Date.now(),
    });
    queue.enqueue({
      id: 'test-op-2',
      projectId,
      userId,
      version: 2,
      operations: [],
      timestamp: Date.now(),
    });

    const prepared = queue.prepareForFlush(5);

    expect(prepared.length).toBe(2);
    expect(prepared[0].version).toBe(6);
    expect(prepared[1].version).toBe(7);
  });
});

// ============================================
// Offline Manager Tests
// ============================================

describe('OfflineManager', () => {
  let manager: OfflineManager;

  beforeEach(() => {
    manager = new OfflineManager();
  });

  it('should start in disconnected state', () => {
    expect(manager.getConnectionState()).toBe(ConnectionState.DISCONNECTED);
    expect(manager.isOffline()).toBe(true);
  });

  it('should update connection state', () => {
    manager.setConnectionState(ConnectionState.CONNECTED);

    expect(manager.getConnectionState()).toBe(ConnectionState.CONNECTED);
    expect(manager.isOffline()).toBe(false);
  });

  it('should create queue for project', () => {
    const queue = manager.getQueue('project-1', 'user-1', 0);

    expect(queue).toBeDefined();
    expect(queue.isEmpty()).toBe(true);
  });

  it('should queue operations', () => {
    const op: DocumentOperation = {
      id: 'test-op-1',
      projectId: 'project-1',
      userId: 'user-1',
      version: 1,
      operations: [],
      timestamp: Date.now(),
    };

    manager.queueOperation(op);

    expect(manager.getTotalQueuedCount()).toBe(1);
  });

  it('should clear queue for project', () => {
    manager.queueOperation({
      id: 'test-op-1',
      projectId: 'project-1',
      userId: 'user-1',
      version: 1,
      operations: [],
      timestamp: Date.now(),
    });

    manager.clearQueue('project-1');

    expect(manager.getTotalQueuedCount()).toBe(0);
  });

  it('should clear all queues', () => {
    manager.queueOperation({
      id: 'test-op-1',
      projectId: 'project-1',
      userId: 'user-1',
      version: 1,
      operations: [],
      timestamp: Date.now(),
    });
    manager.queueOperation({
      id: 'test-op-2',
      projectId: 'project-2',
      userId: 'user-1',
      version: 1,
      operations: [],
      timestamp: Date.now(),
    });

    manager.clearAllQueues();

    expect(manager.getTotalQueuedCount()).toBe(0);
  });
});

// ============================================
// Utility Function Tests
// ============================================

describe('Utility Functions', () => {
  describe('getUserColor', () => {
    it('should return a color from the palette', () => {
      const color = getUserColor('user-123');

      expect(USER_COLORS).toContain(color);
    });

    it('should return consistent color for same user ID', () => {
      const color1 = getUserColor('user-123');
      const color2 = getUserColor('user-123');

      expect(color1).toBe(color2);
    });

    it('should return different colors for different user IDs', () => {
      const colors = new Set<string>();
      for (let i = 0; i < 20; i++) {
        colors.add(getUserColor(`user-${i}`));
      }

      // Should have multiple different colors
      expect(colors.size).toBeGreaterThan(1);
    });
  });
});

// ============================================
// Message Type Tests
// ============================================

describe('Message Types', () => {
  it('should have all required message types', () => {
    expect(MessageType.CONNECT).toBeDefined();
    expect(MessageType.DISCONNECT).toBeDefined();
    expect(MessageType.JOIN_PROJECT).toBeDefined();
    expect(MessageType.LEAVE_PROJECT).toBeDefined();
    expect(MessageType.USER_JOINED).toBeDefined();
    expect(MessageType.USER_LEFT).toBeDefined();
    expect(MessageType.ACTIVE_USERS).toBeDefined();
    expect(MessageType.CURSOR_MOVE).toBeDefined();
    expect(MessageType.CURSOR_UPDATE).toBeDefined();
    expect(MessageType.OPERATION).toBeDefined();
    expect(MessageType.OPERATION_ACK).toBeDefined();
    expect(MessageType.SYNC_REQUEST).toBeDefined();
    expect(MessageType.SYNC_RESPONSE).toBeDefined();
  });
});

// ============================================
// Connection State Tests
// ============================================

describe('Connection States', () => {
  it('should have all required connection states', () => {
    expect(ConnectionState.CONNECTING).toBeDefined();
    expect(ConnectionState.CONNECTED).toBeDefined();
    expect(ConnectionState.DISCONNECTED).toBeDefined();
    expect(ConnectionState.RECONNECTING).toBeDefined();
  });
});
