/**
 * Real-time Collaboration Module
 * Exports WebSocket server, OT, and offline queue functionality
 * 
 * Requirements: 21.3 - Implement conflict resolution and display who is currently viewing or editing
 * Task 20: Build real-time collaboration
 */

// Types
export * from './types';

// Operational Transformation
export {
  OTError,
  composeOperations,
  transformOperations,
  applyOperations,
  optimizeOperations,
  invertOperation,
  invertDocumentOperation,
  OperationHistory,
  DocumentState,
} from './operational-transform';

// WebSocket Server
export {
  RealtimeServer,
  getRealtimeServer,
  initializeRealtimeServer,
} from './websocket-server';

// Offline Queue
export {
  OfflineQueueError,
  OfflineQueueManager,
  OfflineManager,
  getOfflineManager,
} from './offline-queue';
