/**
 * WebSocket Server for Real-time Collaboration
 * Requirements: 21.3 - Implement conflict resolution and display who is currently viewing or editing
 * Task 20: Implement WebSocket server for real-time updates
 */

import { WebSocketServer, WebSocket, RawData } from 'ws';
import { Server as HttpServer } from 'http';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { verifyToken } from '../auth/auth.service';
import { checkCollaboratorPermission } from '../collaboration/collaboration.service';
import { DocumentState } from './operational-transform';
import {
  MessageType,
  ConnectionState,
  DEFAULT_WS_CONFIG,
  getUserColor,
  type WebSocketMessage,
  type WebSocketConfig,
  type ActiveUser,
  type ProjectRoom,
  type ClientConnection,
  type DocumentOperation,
  type CursorPosition,
  type UserJoinedPayload,
  type UserLeftPayload,
  type ActiveUsersPayload,
  type CursorUpdatePayload,
  type OperationAck,
  type SyncResponse,
  type ErrorPayload,
  joinProjectSchema,
  cursorMoveSchema,
  documentOperationSchema,
} from './types';

// ============================================
// Extended WebSocket Type
// ============================================

interface ExtendedWebSocket extends WebSocket {
  id: string;
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  projectId: string | null;
  isAlive: boolean;
  connectionState: ConnectionState;
  offlineQueue: DocumentOperation[];
}

// ============================================
// WebSocket Server Class
// ============================================

export class RealtimeServer {
  private wss: WebSocketServer | null = null;
  private config: WebSocketConfig;
  private clients: Map<string, ExtendedWebSocket> = new Map();
  private rooms: Map<string, ProjectRoom> = new Map();
  private documentStates: Map<string, DocumentState> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<WebSocketConfig> = {}) {
    this.config = { ...DEFAULT_WS_CONFIG, ...config };
  }

  /**
   * Initialize WebSocket server attached to HTTP server
   */
  initialize(server: HttpServer): void {
    this.wss = new WebSocketServer({
      server,
      path: this.config.path,
      maxPayload: this.config.maxPayloadSize,
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    this.wss.on('error', this.handleServerError.bind(this));

    // Start ping interval for connection health checks
    this.startPingInterval();

    logger.info('WebSocket server initialized', {
      path: this.config.path,
      maxPayload: this.config.maxPayloadSize,
    });
  }

  /**
   * Handle new WebSocket connection
   */
  private async handleConnection(ws: WebSocket, request: { url?: string }): Promise<void> {
    const extWs = ws as ExtendedWebSocket;
    extWs.id = uuidv4();
    extWs.isAlive = true;
    extWs.connectionState = ConnectionState.CONNECTING;
    extWs.offlineQueue = [];
    extWs.projectId = null;

    // Extract token from query string
    const url = new URL(request.url || '', 'ws://localhost');
    const token = url.searchParams.get('token');

    if (!token) {
      this.sendError(extWs, 'AUTH_REQUIRED', 'Authentication token required');
      extWs.close(4001, 'Authentication required');
      return;
    }

    try {
      // Verify JWT token
      const payload = await verifyToken(token);
      if (!payload || !payload.userId) {
        this.sendError(extWs, 'INVALID_TOKEN', 'Invalid authentication token');
        extWs.close(4001, 'Invalid token');
        return;
      }

      extWs.userId = payload.userId;
      extWs.email = payload.email || '';
      extWs.firstName = payload.firstName || null;
      extWs.lastName = payload.lastName || null;
      extWs.connectionState = ConnectionState.CONNECTED;

      // Store client connection
      this.clients.set(extWs.id, extWs);

      // Set up event handlers
      extWs.on('message', (data) => this.handleMessage(extWs, data));
      extWs.on('close', () => this.handleDisconnect(extWs));
      extWs.on('error', (error) => this.handleClientError(extWs, error));
      extWs.on('pong', () => {
        extWs.isAlive = true;
      });

      // Send connection confirmation
      this.sendMessage(extWs, {
        type: MessageType.CONNECT,
        payload: {
          connectionId: extWs.id,
          userId: extWs.userId,
        },
        timestamp: Date.now(),
      });

      logger.info('WebSocket client connected', {
        connectionId: extWs.id,
        userId: extWs.userId,
      });
    } catch (error) {
      logger.error('WebSocket authentication failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      this.sendError(extWs, 'AUTH_FAILED', 'Authentication failed');
      extWs.close(4001, 'Authentication failed');
    }
  }

  /**
   * Handle incoming WebSocket message
   */
  private async handleMessage(ws: ExtendedWebSocket, data: RawData): Promise<void> {
    try {
      const message: WebSocketMessage = JSON.parse(data.toString());

      switch (message.type) {
        case MessageType.PING:
          this.sendMessage(ws, { type: MessageType.PONG, timestamp: Date.now() });
          break;

        case MessageType.JOIN_PROJECT:
          await this.handleJoinProject(ws, message.payload);
          break;

        case MessageType.LEAVE_PROJECT:
          await this.handleLeaveProject(ws);
          break;

        case MessageType.CURSOR_MOVE:
          await this.handleCursorMove(ws, message.payload);
          break;

        case MessageType.OPERATION:
          await this.handleOperation(ws, message.payload);
          break;

        case MessageType.SYNC_REQUEST:
          await this.handleSyncRequest(ws, message.payload);
          break;

        case MessageType.FLUSH_QUEUE:
          await this.handleFlushQueue(ws);
          break;

        default:
          this.sendError(ws, 'UNKNOWN_MESSAGE', `Unknown message type: ${message.type}`);
      }
    } catch (error) {
      logger.error('Error handling WebSocket message', {
        connectionId: ws.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      this.sendError(ws, 'MESSAGE_ERROR', 'Failed to process message');
    }
  }

  /**
   * Handle join project request
   */
  private async handleJoinProject(ws: ExtendedWebSocket, payload: unknown): Promise<void> {
    const parseResult = joinProjectSchema.safeParse(payload);
    if (!parseResult.success) {
      this.sendError(ws, 'INVALID_PAYLOAD', 'Invalid join project payload');
      return;
    }

    const { projectId, documentVersion } = parseResult.data;

    // Check user permission
    const permission = await checkCollaboratorPermission(projectId, ws.userId);
    if (!permission.hasAccess) {
      this.sendError(ws, 'ACCESS_DENIED', 'You do not have access to this project');
      return;
    }

    // Leave current project if any
    if (ws.projectId) {
      await this.handleLeaveProject(ws);
    }

    // Get or create room
    let room = this.rooms.get(projectId);
    if (!room) {
      room = {
        projectId,
        users: new Map(),
        documentVersion: documentVersion || 0,
        pendingOperations: [],
        lastActivity: new Date(),
      };
      this.rooms.set(projectId, room);
    }

    // Get or create document state
    if (!this.documentStates.has(projectId)) {
      this.documentStates.set(projectId, new DocumentState('', room.documentVersion));
    }

    // Create active user entry
    const activeUser: ActiveUser = {
      userId: ws.userId,
      email: ws.email,
      firstName: ws.firstName,
      lastName: ws.lastName,
      cursor: null,
      selection: null,
      lastActivity: new Date(),
      color: getUserColor(ws.userId),
    };

    // Add user to room
    room.users.set(ws.userId, activeUser);
    ws.projectId = projectId;

    // Notify other users in the room
    this.broadcastToRoom(projectId, {
      type: MessageType.USER_JOINED,
      payload: {
        user: activeUser,
        projectId,
      } as UserJoinedPayload,
      timestamp: Date.now(),
    }, ws.userId);

    // Send current active users to the joining user
    const activeUsers = Array.from(room.users.values());
    this.sendMessage(ws, {
      type: MessageType.ACTIVE_USERS,
      payload: {
        projectId,
        users: activeUsers,
      } as ActiveUsersPayload,
      timestamp: Date.now(),
    });

    // If client has a different version, send sync response
    const docState = this.documentStates.get(projectId);
    if (docState && documentVersion !== undefined && documentVersion < docState.getVersion()) {
      const missedOps = docState.getOperationsSince(documentVersion);
      this.sendMessage(ws, {
        type: MessageType.SYNC_RESPONSE,
        payload: {
          projectId,
          documentVersion: docState.getVersion(),
          content: docState.getContent(),
          pendingOperations: missedOps,
        } as SyncResponse,
        timestamp: Date.now(),
      });
    }

    logger.info('User joined project', {
      connectionId: ws.id,
      userId: ws.userId,
      projectId,
    });
  }

  /**
   * Handle leave project request
   */
  private async handleLeaveProject(ws: ExtendedWebSocket): Promise<void> {
    if (!ws.projectId) return;

    const projectId = ws.projectId;
    const room = this.rooms.get(projectId);

    if (room) {
      room.users.delete(ws.userId);

      // Notify other users
      this.broadcastToRoom(projectId, {
        type: MessageType.USER_LEFT,
        payload: {
          userId: ws.userId,
          projectId,
        } as UserLeftPayload,
        timestamp: Date.now(),
      }, ws.userId);

      // Clean up empty rooms
      if (room.users.size === 0) {
        this.rooms.delete(projectId);
        // Keep document state for a while in case users rejoin
      }
    }

    ws.projectId = null;

    logger.info('User left project', {
      connectionId: ws.id,
      userId: ws.userId,
      projectId,
    });
  }

  /**
   * Handle cursor move
   */
  private async handleCursorMove(ws: ExtendedWebSocket, payload: unknown): Promise<void> {
    const parseResult = cursorMoveSchema.safeParse(payload);
    if (!parseResult.success) {
      return; // Silently ignore invalid cursor updates
    }

    const { projectId, cursor, selection } = parseResult.data;

    if (ws.projectId !== projectId) {
      return;
    }

    const room = this.rooms.get(projectId);
    if (!room) return;

    const user = room.users.get(ws.userId);
    if (user) {
      user.cursor = cursor;
      user.selection = selection || null;
      user.lastActivity = new Date();
    }

    // Broadcast cursor update to other users
    this.broadcastToRoom(projectId, {
      type: MessageType.CURSOR_UPDATE,
      payload: {
        projectId,
        userId: ws.userId,
        cursor,
        selection: selection || null,
      } as CursorUpdatePayload,
      timestamp: Date.now(),
    }, ws.userId);
  }

  /**
   * Handle document operation
   * Implements change synchronization within 200ms requirement
   */
  private async handleOperation(ws: ExtendedWebSocket, payload: unknown): Promise<void> {
    const startTime = Date.now();

    const parseResult = documentOperationSchema.safeParse(payload);
    if (!parseResult.success) {
      this.sendError(ws, 'INVALID_OPERATION', 'Invalid operation payload');
      return;
    }

    const operation = parseResult.data;

    if (ws.projectId !== operation.projectId) {
      this.sendError(ws, 'PROJECT_MISMATCH', 'Operation project does not match current project');
      return;
    }

    const docState = this.documentStates.get(operation.projectId);
    if (!docState) {
      this.sendError(ws, 'NO_DOCUMENT', 'Document state not found');
      return;
    }

    // Apply operation with OT
    const appliedOp = docState.applyOperation(operation);

    if (!appliedOp) {
      this.sendError(ws, 'OPERATION_FAILED', 'Failed to apply operation');
      return;
    }

    // Update room version
    const room = this.rooms.get(operation.projectId);
    if (room) {
      room.documentVersion = docState.getVersion();
      room.lastActivity = new Date();
    }

    // Send acknowledgment to sender
    this.sendMessage(ws, {
      type: MessageType.OPERATION_ACK,
      payload: {
        operationId: operation.id,
        version: appliedOp.version,
        success: true,
      } as OperationAck,
      timestamp: Date.now(),
    });

    // Broadcast operation to other users in the room
    this.broadcastToRoom(operation.projectId, {
      type: MessageType.OPERATION,
      payload: appliedOp,
      timestamp: Date.now(),
    }, ws.userId);

    const syncTime = Date.now() - startTime;
    if (syncTime > this.config.syncThreshold) {
      logger.warn('Operation sync exceeded threshold', {
        syncTime,
        threshold: this.config.syncThreshold,
        projectId: operation.projectId,
      });
    }

    logger.debug('Operation applied', {
      operationId: operation.id,
      projectId: operation.projectId,
      version: appliedOp.version,
      syncTime,
    });
  }

  /**
   * Handle sync request
   */
  private async handleSyncRequest(ws: ExtendedWebSocket, payload: unknown): Promise<void> {
    const { projectId, version } = payload as { projectId: string; version: number };

    if (!projectId) {
      this.sendError(ws, 'INVALID_SYNC', 'Project ID required for sync');
      return;
    }

    const docState = this.documentStates.get(projectId);
    if (!docState) {
      this.sendError(ws, 'NO_DOCUMENT', 'Document state not found');
      return;
    }

    const missedOps = docState.getOperationsSince(version || 0);

    this.sendMessage(ws, {
      type: MessageType.SYNC_RESPONSE,
      payload: {
        projectId,
        documentVersion: docState.getVersion(),
        content: docState.getContent(),
        pendingOperations: missedOps,
      } as SyncResponse,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle flush queue (offline operations)
   */
  private async handleFlushQueue(ws: ExtendedWebSocket): Promise<void> {
    if (ws.offlineQueue.length === 0) return;

    for (const operation of ws.offlineQueue) {
      await this.handleOperation(ws, operation);
    }

    ws.offlineQueue = [];
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(ws: ExtendedWebSocket): void {
    // Leave project if in one
    if (ws.projectId) {
      void this.handleLeaveProject(ws);
    }

    // Remove from clients
    this.clients.delete(ws.id);

    logger.info('WebSocket client disconnected', {
      connectionId: ws.id,
      userId: ws.userId,
    });
  }

  /**
   * Handle client error
   */
  private handleClientError(ws: ExtendedWebSocket, error: Error): void {
    logger.error('WebSocket client error', {
      connectionId: ws.id,
      userId: ws.userId,
      error: error.message,
    });
  }

  /**
   * Handle server error
   */
  private handleServerError(error: Error): void {
    logger.error('WebSocket server error', {
      error: error.message,
    });
  }

  /**
   * Send message to a client
   */
  private sendMessage(ws: ExtendedWebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Send error message to a client
   */
  private sendError(ws: ExtendedWebSocket, code: string, message: string): void {
    this.sendMessage(ws, {
      type: MessageType.ERROR,
      payload: { code, message } as ErrorPayload,
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcast message to all users in a room
   */
  private broadcastToRoom(
    projectId: string,
    message: WebSocketMessage,
    excludeUserId?: string
  ): void {
    for (const [, client] of this.clients) {
      if (client.projectId === projectId && client.userId !== excludeUserId) {
        this.sendMessage(client, message);
      }
    }
  }

  /**
   * Start ping interval for connection health checks
   */
  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      for (const [id, client] of this.clients) {
        if (!client.isAlive) {
          logger.info('Terminating inactive WebSocket connection', {
            connectionId: id,
            userId: client.userId,
          });
          client.terminate();
          this.clients.delete(id);
          continue;
        }

        client.isAlive = false;
        client.ping();
      }
    }, this.config.pingInterval);
  }

  /**
   * Get active users in a project
   */
  getActiveUsers(projectId: string): ActiveUser[] {
    const room = this.rooms.get(projectId);
    if (!room) return [];
    return Array.from(room.users.values());
  }

  /**
   * Get document state for a project
   */
  getDocumentState(projectId: string): DocumentState | undefined {
    return this.documentStates.get(projectId);
  }

  /**
   * Initialize document state for a project
   */
  initializeDocument(projectId: string, content: string, version: number): void {
    const docState = new DocumentState(content, version);
    this.documentStates.set(projectId, docState);
  }

  /**
   * Shutdown the WebSocket server
   */
  shutdown(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    // Close all client connections
    for (const [, client] of this.clients) {
      client.close(1001, 'Server shutting down');
    }
    this.clients.clear();
    this.rooms.clear();

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    logger.info('WebSocket server shut down');
  }
}

// ============================================
// Singleton Instance
// ============================================

let realtimeServer: RealtimeServer | null = null;

/**
 * Get or create the realtime server instance
 */
export function getRealtimeServer(config?: Partial<WebSocketConfig>): RealtimeServer {
  if (!realtimeServer) {
    realtimeServer = new RealtimeServer(config);
  }
  return realtimeServer;
}

/**
 * Initialize the realtime server with an HTTP server
 */
export function initializeRealtimeServer(
  server: HttpServer,
  config?: Partial<WebSocketConfig>
): RealtimeServer {
  const rtServer = getRealtimeServer(config);
  rtServer.initialize(server);
  return rtServer;
}
