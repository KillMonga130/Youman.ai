/**
 * Real-time Collaboration Types
 * Requirements: 21.3 - Implement conflict resolution and display who is currently viewing or editing
 * Task 20: Build real-time collaboration
 */

import { z } from 'zod';

// ============================================
// Enums
// ============================================

/**
 * WebSocket message types for real-time communication
 */
export enum MessageType {
  // Connection management
  CONNECT = 'CONNECT',
  DISCONNECT = 'DISCONNECT',
  PING = 'PING',
  PONG = 'PONG',
  ERROR = 'ERROR',

  // Presence
  JOIN_PROJECT = 'JOIN_PROJECT',
  LEAVE_PROJECT = 'LEAVE_PROJECT',
  USER_JOINED = 'USER_JOINED',
  USER_LEFT = 'USER_LEFT',
  ACTIVE_USERS = 'ACTIVE_USERS',

  // Cursor tracking
  CURSOR_MOVE = 'CURSOR_MOVE',
  CURSOR_UPDATE = 'CURSOR_UPDATE',

  // Document operations
  OPERATION = 'OPERATION',
  OPERATION_ACK = 'OPERATION_ACK',
  SYNC_REQUEST = 'SYNC_REQUEST',
  SYNC_RESPONSE = 'SYNC_RESPONSE',

  // Offline support
  QUEUE_OPERATION = 'QUEUE_OPERATION',
  FLUSH_QUEUE = 'FLUSH_QUEUE',
}

/**
 * Operation types for Operational Transformation
 */
export enum OperationType {
  INSERT = 'INSERT',
  DELETE = 'DELETE',
  RETAIN = 'RETAIN',
}

/**
 * Connection state
 */
export enum ConnectionState {
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  RECONNECTING = 'RECONNECTING',
}

// ============================================
// Validation Schemas
// ============================================

/**
 * Schema for cursor position
 */
export const cursorPositionSchema = z.object({
  line: z.number().min(0),
  column: z.number().min(0),
  offset: z.number().min(0).optional(),
});

/**
 * Schema for text operation
 */
export const textOperationSchema = z.object({
  type: z.nativeEnum(OperationType),
  position: z.number().min(0),
  text: z.string().optional(), // For INSERT
  length: z.number().min(0).optional(), // For DELETE or RETAIN
});

/**
 * Schema for document operation
 */
export const documentOperationSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
  version: z.number().min(0),
  operations: z.array(textOperationSchema),
  timestamp: z.number(),
});

/**
 * Schema for join project message
 */
export const joinProjectSchema = z.object({
  projectId: z.string().uuid(),
  documentVersion: z.number().min(0).optional(),
});

/**
 * Schema for cursor move message
 */
export const cursorMoveSchema = z.object({
  projectId: z.string().uuid(),
  cursor: cursorPositionSchema,
  selection: z
    .object({
      start: cursorPositionSchema,
      end: cursorPositionSchema,
    })
    .optional(),
});

// ============================================
// Types derived from schemas
// ============================================

export type CursorPosition = z.infer<typeof cursorPositionSchema>;
export type TextOperation = z.infer<typeof textOperationSchema>;
export type DocumentOperation = z.infer<typeof documentOperationSchema>;
export type JoinProjectInput = z.infer<typeof joinProjectSchema>;
export type CursorMoveInput = z.infer<typeof cursorMoveSchema>;

// ============================================
// Message Types
// ============================================

/**
 * Base WebSocket message structure
 */
export interface WebSocketMessage<T = unknown> {
  type: MessageType;
  payload?: T;
  timestamp: number;
  messageId?: string;
}

/**
 * Active user information
 */
export interface ActiveUser {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  cursor: CursorPosition | null;
  selection: { start: CursorPosition; end: CursorPosition } | null;
  lastActivity: Date;
  color: string; // Unique color for cursor display
}

/**
 * Project room state
 */
export interface ProjectRoom {
  projectId: string;
  users: Map<string, ActiveUser>;
  documentVersion: number;
  pendingOperations: DocumentOperation[];
  lastActivity: Date;
}

/**
 * Client connection state
 */
export interface ClientConnection {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  projectId: string | null;
  connectionState: ConnectionState;
  lastPing: Date;
  offlineQueue: DocumentOperation[];
}

/**
 * Operation acknowledgment
 */
export interface OperationAck {
  operationId: string;
  version: number;
  success: boolean;
  error?: string;
}

/**
 * Sync response payload
 */
export interface SyncResponse {
  projectId: string;
  documentVersion: number;
  content: string;
  pendingOperations: DocumentOperation[];
}

/**
 * Error payload
 */
export interface ErrorPayload {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================
// Operational Transformation Types
// ============================================

/**
 * Transformed operation result
 */
export interface TransformResult {
  operation1: TextOperation[];
  operation2: TextOperation[];
}

/**
 * Operation history entry
 */
export interface OperationHistoryEntry {
  operation: DocumentOperation;
  appliedAt: Date;
  transformedFrom?: string; // Original operation ID if transformed
}

// ============================================
// Event Types
// ============================================

/**
 * User joined event payload
 */
export interface UserJoinedPayload {
  user: ActiveUser;
  projectId: string;
}

/**
 * User left event payload
 */
export interface UserLeftPayload {
  userId: string;
  projectId: string;
}

/**
 * Active users payload
 */
export interface ActiveUsersPayload {
  projectId: string;
  users: ActiveUser[];
}

/**
 * Cursor update payload
 */
export interface CursorUpdatePayload {
  projectId: string;
  userId: string;
  cursor: CursorPosition;
  selection: { start: CursorPosition; end: CursorPosition } | null;
}

// ============================================
// Configuration
// ============================================

/**
 * WebSocket server configuration
 */
export interface WebSocketConfig {
  port: number;
  path: string;
  pingInterval: number; // ms
  pingTimeout: number; // ms
  maxPayloadSize: number; // bytes
  syncThreshold: number; // ms - max time for change synchronization
}

/**
 * Default WebSocket configuration
 */
export const DEFAULT_WS_CONFIG: WebSocketConfig = {
  port: 3001,
  path: '/ws',
  pingInterval: 30000, // 30 seconds
  pingTimeout: 10000, // 10 seconds
  maxPayloadSize: 1024 * 1024, // 1MB
  syncThreshold: 200, // 200ms as per requirements
};

// ============================================
// Utility Types
// ============================================

/**
 * User color palette for cursor display
 */
export const USER_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFEAA7', // Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
  '#F7DC6F', // Gold
  '#BB8FCE', // Purple
  '#85C1E9', // Light Blue
];

/**
 * Get a consistent color for a user based on their ID
 */
export function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash = hash & hash;
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}
