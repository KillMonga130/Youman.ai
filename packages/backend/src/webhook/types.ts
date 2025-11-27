/**
 * Webhook Service Types
 * Type definitions for webhook notifications and delivery
 * Requirements: 51
 */

/**
 * Webhook status
 */
export type WebhookStatus = 'active' | 'inactive' | 'suspended';

/**
 * Delivery status for webhook attempts
 */
export type DeliveryStatus = 'pending' | 'success' | 'failed' | 'retrying';

/**
 * Supported webhook event types
 * Requirement 51: Support event filtering to send only specified event types
 */
export type WebhookEventType =
  | 'project.created'
  | 'project.updated'
  | 'project.deleted'
  | 'transformation.started'
  | 'transformation.completed'
  | 'transformation.failed'
  | 'detection.completed'
  | 'batch.started'
  | 'batch.completed'
  | 'batch.failed'
  | 'version.created'
  | 'collaboration.invited'
  | 'collaboration.joined';

/**
 * Webhook configuration
 * Requirement 51: Support HTTP POST notifications to user-specified endpoints
 */
export interface Webhook {
  /** Unique webhook identifier */
  id: string;
  /** User ID who owns this webhook */
  userId: string;
  /** Webhook name for identification */
  name: string;
  /** Target URL for webhook delivery */
  url: string;
  /** Secret key for HMAC signature verification */
  secret: string;
  /** Event types to subscribe to */
  events: WebhookEventType[];
  /** Webhook status */
  status: WebhookStatus;
  /** Whether the webhook is enabled */
  enabled: boolean;
  /** Custom headers to include in requests */
  headers?: Record<string, string>;
  /** Creation timestamp */
  createdAt: Date;
  /** Last updated timestamp */
  updatedAt: Date;
  /** Last successful delivery timestamp */
  lastDeliveryAt?: Date;
  /** Total delivery count */
  deliveryCount: number;
  /** Failed delivery count */
  failedCount: number;
  /** Success rate percentage */
  successRate: number;
}

/**
 * Webhook event payload
 * Requirement 51: Send webhook payloads containing event type, project ID, and relevant metadata
 */
export interface WebhookEvent {
  /** Unique event identifier */
  id: string;
  /** Event type */
  type: WebhookEventType;
  /** Timestamp when event occurred */
  timestamp: Date;
  /** Project ID related to the event */
  projectId?: string;
  /** User ID who triggered the event */
  userId: string;
  /** Event-specific data */
  data: Record<string, unknown>;
  /** API version */
  apiVersion: string;
}

/**
 * Webhook delivery attempt
 */
export interface WebhookDelivery {
  /** Unique delivery identifier */
  id: string;
  /** Webhook identifier */
  webhookId: string;
  /** Event that triggered this delivery */
  event: WebhookEvent;
  /** Delivery status */
  status: DeliveryStatus;
  /** HTTP status code from response */
  statusCode?: number;
  /** Response body (truncated) */
  responseBody?: string;
  /** Request headers sent */
  requestHeaders: Record<string, string>;
  /** Response headers received */
  responseHeaders?: Record<string, string>;
  /** Delivery attempt number */
  attemptNumber: number;
  /** Time taken for request in milliseconds */
  durationMs?: number;
  /** Error message if failed */
  error?: string;
  /** Timestamp when delivery was attempted */
  attemptedAt: Date;
  /** Next retry timestamp (if retrying) */
  nextRetryAt?: Date;
}

/**
 * Delivery result returned after attempting delivery
 */
export interface DeliveryResult {
  /** Delivery identifier */
  deliveryId: string;
  /** Whether delivery was successful */
  success: boolean;
  /** HTTP status code */
  statusCode?: number;
  /** Error message if failed */
  error?: string;
  /** Duration in milliseconds */
  durationMs: number;
  /** Whether retry is scheduled */
  willRetry: boolean;
  /** Next retry timestamp */
  nextRetryAt?: Date;
}

/**
 * Webhook log entry for monitoring
 * Requirement 51: Create webhook logs and monitoring
 */
export interface WebhookLog {
  /** Log entry identifier */
  id: string;
  /** Webhook identifier */
  webhookId: string;
  /** Event type */
  eventType: WebhookEventType;
  /** Delivery status */
  status: DeliveryStatus;
  /** HTTP status code */
  statusCode?: number;
  /** Duration in milliseconds */
  durationMs?: number;
  /** Error message */
  error?: string;
  /** Attempt number */
  attemptNumber: number;
  /** Timestamp */
  timestamp: Date;
  /** Request URL */
  url: string;
  /** Event ID */
  eventId: string;
}

/**
 * Options for registering a webhook
 */
export interface RegisterWebhookOptions {
  /** User ID */
  userId: string;
  /** Webhook name */
  name: string;
  /** Target URL */
  url: string;
  /** Event types to subscribe to */
  events: WebhookEventType[];
  /** Secret for HMAC signing (optional, will be generated if not provided) */
  secret?: string;
  /** Custom headers */
  headers?: Record<string, string>;
}

/**
 * Options for updating a webhook
 */
export interface UpdateWebhookOptions {
  /** Webhook name */
  name?: string;
  /** Target URL */
  url?: string;
  /** Event types to subscribe to */
  events?: WebhookEventType[];
  /** Secret for HMAC signing */
  secret?: string;
  /** Custom headers */
  headers?: Record<string, string>;
  /** Enable/disable webhook */
  enabled?: boolean;
}

/**
 * Retry configuration for webhook delivery
 * Requirement 51: Retry up to 5 times with exponential backoff
 */
export interface WebhookRetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Initial delay in milliseconds */
  initialDelayMs: number;
  /** Maximum delay in milliseconds */
  maxDelayMs: number;
  /** Backoff multiplier */
  backoffMultiplier: number;
}

/**
 * Webhook service configuration
 */
export interface WebhookServiceConfig {
  /** Retry configuration */
  retryConfig: WebhookRetryConfig;
  /** Request timeout in milliseconds */
  requestTimeoutMs: number;
  /** Maximum webhooks per user */
  maxWebhooksPerUser: number;
  /** Maximum payload size in bytes */
  maxPayloadSize: number;
  /** API version for events */
  apiVersion: string;
  /** Whether to verify SSL certificates */
  verifySsl: boolean;
}

/**
 * HMAC signature for webhook verification
 * Requirement 51: Sign payloads with HMAC signatures for verification
 */
export interface WebhookSignature {
  /** Signature algorithm */
  algorithm: 'sha256';
  /** Signature header name */
  header: string;
  /** Computed signature */
  signature: string;
  /** Timestamp used in signature */
  timestamp: number;
}

/**
 * Webhook statistics for monitoring
 */
export interface WebhookStats {
  /** Total deliveries */
  totalDeliveries: number;
  /** Successful deliveries */
  successfulDeliveries: number;
  /** Failed deliveries */
  failedDeliveries: number;
  /** Average response time in ms */
  avgResponseTimeMs: number;
  /** Success rate percentage */
  successRate: number;
  /** Last 24 hours stats */
  last24Hours: {
    deliveries: number;
    successes: number;
    failures: number;
  };
}

/**
 * Filter options for webhook logs
 */
export interface WebhookLogFilter {
  /** Filter by event type */
  eventType?: WebhookEventType;
  /** Filter by status */
  status?: DeliveryStatus;
  /** Filter by date range start */
  startDate?: Date;
  /** Filter by date range end */
  endDate?: Date;
  /** Maximum number of results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}
