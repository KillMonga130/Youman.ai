/**
 * Webhook Service
 * Manages webhook notifications for external integrations
 * Requirements: 51
 */

import crypto from 'crypto';
import { logger } from '../utils/logger';
import {
  Webhook,
  WebhookEvent,
  WebhookDelivery,
  DeliveryResult,
  WebhookLog,
  RegisterWebhookOptions,
  UpdateWebhookOptions,
  WebhookServiceConfig,
  WebhookRetryConfig,
  WebhookStats,
  WebhookLogFilter,
} from './types';

/** Default retry configuration - 5 retries with exponential backoff */
const DEFAULT_RETRY_CONFIG: WebhookRetryConfig = {
  maxRetries: 5,
  initialDelayMs: 1000, // 1 second
  maxDelayMs: 3600000, // 1 hour
  backoffMultiplier: 2,
};

/** Default service configuration */
const DEFAULT_CONFIG: WebhookServiceConfig = {
  retryConfig: DEFAULT_RETRY_CONFIG,
  requestTimeoutMs: 30000, // 30 seconds
  maxWebhooksPerUser: 20,
  maxPayloadSize: 65536, // 64KB
  apiVersion: '2024-01-01',
  verifySsl: true,
};

/**
 * Webhook Service class
 * Handles webhook registration, delivery, and monitoring
 */
export class WebhookService {
  private config: WebhookServiceConfig;
  private webhooks: Map<string, Webhook>;
  private deliveries: Map<string, WebhookDelivery>;
  private logs: Map<string, WebhookLog[]>;
  private pendingRetries: Map<string, NodeJS.Timeout>;

  constructor(serviceConfig?: Partial<WebhookServiceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...serviceConfig };
    this.webhooks = new Map();
    this.deliveries = new Map();
    this.logs = new Map();
    this.pendingRetries = new Map();
  }

  /**
   * Registers a new webhook
   * Requirement 51: Support HTTP POST notifications to user-specified endpoints
   * @param options - Webhook registration options
   * @returns Created webhook
   */
  async registerWebhook(options: RegisterWebhookOptions): Promise<Webhook> {
    // Validate user webhook limit
    const userWebhooks = this.getWebhooksByUser(options.userId);
    if (userWebhooks.length >= this.config.maxWebhooksPerUser) {
      throw new Error(`Maximum webhooks per user (${this.config.maxWebhooksPerUser}) exceeded`);
    }

    // Validate URL
    this.validateUrl(options.url);

    // Validate events
    if (!options.events || options.events.length === 0) {
      throw new Error('At least one event type must be specified');
    }

    // Generate secret if not provided
    const secret = options.secret || this.generateSecret();

    const id = this.generateId('wh');
    const now = new Date();

    const webhook: Webhook = {
      id,
      userId: options.userId,
      name: options.name,
      url: options.url,
      secret,
      events: options.events,
      status: 'active',
      enabled: true,
      headers: options.headers || {},
      createdAt: now,
      updatedAt: now,
      deliveryCount: 0,
      failedCount: 0,
      successRate: 100,
    };

    this.webhooks.set(id, webhook);
    this.logs.set(id, []);

    logger.info(`Registered webhook: ${id}`, {
      userId: options.userId,
      url: options.url,
      events: options.events,
    });

    return webhook;
  }

  /**
   * Delivers a webhook event
   * Requirement 51: Send webhook payloads containing event type, project ID, and relevant metadata
   * @param webhookId - Webhook identifier
   * @param event - Event to deliver
   * @returns Delivery result
   */
  async deliverWebhook(webhookId: string, event: WebhookEvent): Promise<DeliveryResult> {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      throw new Error(`Webhook not found: ${webhookId}`);
    }

    if (!webhook.enabled || webhook.status !== 'active') {
      throw new Error(`Webhook is not active: ${webhookId}`);
    }

    // Check if webhook subscribes to this event type
    if (!webhook.events.includes(event.type)) {
      return {
        deliveryId: '',
        success: true,
        durationMs: 0,
        willRetry: false,
      };
    }

    const deliveryId = this.generateId('del');

    // Create delivery record
    const delivery: WebhookDelivery = {
      id: deliveryId,
      webhookId,
      event,
      status: 'pending',
      attemptNumber: 1,
      requestHeaders: this.buildRequestHeaders(webhook, event),
      attemptedAt: new Date(),
    };

    this.deliveries.set(deliveryId, delivery);

    // Attempt delivery
    const result = await this.attemptDelivery(webhook, delivery, event);

    return result;
  }

  /**
   * Retries a failed webhook delivery
   * Requirement 51: Retry up to 5 times with exponential backoff
   * @param deliveryId - Delivery identifier
   */
  async retryFailedWebhook(deliveryId: string): Promise<void> {
    const delivery = this.deliveries.get(deliveryId);
    if (!delivery) {
      throw new Error(`Delivery not found: ${deliveryId}`);
    }

    if (delivery.status !== 'failed' && delivery.status !== 'retrying') {
      throw new Error(`Delivery is not in a retryable state: ${delivery.status}`);
    }

    const webhook = this.webhooks.get(delivery.webhookId);
    if (!webhook) {
      throw new Error(`Webhook not found: ${delivery.webhookId}`);
    }

    // Increment attempt number
    delivery.attemptNumber++;
    delivery.status = 'retrying';
    delivery.attemptedAt = new Date();

    await this.attemptDelivery(webhook, delivery, delivery.event);
  }

  /**
   * Gets webhook logs for monitoring
   * Requirement 51: Create webhook logs and monitoring
   * @param webhookId - Webhook identifier
   * @param filter - Optional filter options
   * @returns Array of webhook logs
   */
  async getWebhookLogs(webhookId: string, filter?: WebhookLogFilter): Promise<WebhookLog[]> {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      throw new Error(`Webhook not found: ${webhookId}`);
    }

    let logs = this.logs.get(webhookId) || [];

    // Apply filters
    if (filter) {
      if (filter.eventType) {
        logs = logs.filter(log => log.eventType === filter.eventType);
      }
      if (filter.status) {
        logs = logs.filter(log => log.status === filter.status);
      }
      if (filter.startDate) {
        logs = logs.filter(log => log.timestamp >= filter.startDate!);
      }
      if (filter.endDate) {
        logs = logs.filter(log => log.timestamp <= filter.endDate!);
      }
    }

    // Sort by timestamp descending
    logs = logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    const offset = filter?.offset || 0;
    const limit = filter?.limit || 100;
    logs = logs.slice(offset, offset + limit);

    return logs;
  }

  /**
   * Gets a webhook by ID
   * @param webhookId - Webhook identifier
   * @returns Webhook or null
   */
  async getWebhook(webhookId: string): Promise<Webhook | null> {
    return Promise.resolve(this.webhooks.get(webhookId) || null);
  }

  /**
   * Gets all webhooks for a user
   * @param userId - User identifier
   * @returns Array of webhooks
   */
  getWebhooksByUser(userId: string): Webhook[] {
    return Array.from(this.webhooks.values()).filter(wh => wh.userId === userId);
  }

  /**
   * Updates a webhook
   * @param webhookId - Webhook identifier
   * @param options - Update options
   * @returns Updated webhook
   */
  async updateWebhook(webhookId: string, options: UpdateWebhookOptions): Promise<Webhook> {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      throw new Error(`Webhook not found: ${webhookId}`);
    }

    if (options.url !== undefined) {
      this.validateUrl(options.url);
      webhook.url = options.url;
    }
    if (options.name !== undefined) webhook.name = options.name;
    if (options.events !== undefined) {
      if (options.events.length === 0) {
        throw new Error('At least one event type must be specified');
      }
      webhook.events = options.events;
    }
    if (options.secret !== undefined) webhook.secret = options.secret;
    if (options.headers !== undefined) webhook.headers = options.headers;
    if (options.enabled !== undefined) webhook.enabled = options.enabled;

    webhook.updatedAt = new Date();

    logger.info(`Updated webhook: ${webhookId}`);
    return webhook;
  }

  /**
   * Deletes a webhook
   * @param webhookId - Webhook identifier
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      throw new Error(`Webhook not found: ${webhookId}`);
    }

    // Cancel any pending retries
    const retryTimeout = this.pendingRetries.get(webhookId);
    if (retryTimeout) {
      clearTimeout(retryTimeout);
      this.pendingRetries.delete(webhookId);
    }

    this.webhooks.delete(webhookId);
    this.logs.delete(webhookId);

    logger.info(`Deleted webhook: ${webhookId}`);
  }

  /**
   * Gets webhook statistics
   * @param webhookId - Webhook identifier
   * @returns Webhook statistics
   */
  async getWebhookStats(webhookId: string): Promise<WebhookStats> {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      throw new Error(`Webhook not found: ${webhookId}`);
    }

    const logs = this.logs.get(webhookId) || [];
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    const last24HoursLogs = logs.filter(log => log.timestamp.getTime() >= oneDayAgo);

    const totalDeliveries = logs.length;
    const successfulDeliveries = logs.filter(log => log.status === 'success').length;
    const failedDeliveries = logs.filter(log => log.status === 'failed').length;

    const responseTimes = logs
      .filter(log => log.durationMs !== undefined)
      .map(log => log.durationMs!);
    const avgResponseTimeMs = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    return {
      totalDeliveries,
      successfulDeliveries,
      failedDeliveries,
      avgResponseTimeMs: Math.round(avgResponseTimeMs),
      successRate: totalDeliveries > 0 ? (successfulDeliveries / totalDeliveries) * 100 : 100,
      last24Hours: {
        deliveries: last24HoursLogs.length,
        successes: last24HoursLogs.filter(log => log.status === 'success').length,
        failures: last24HoursLogs.filter(log => log.status === 'failed').length,
      },
    };
  }

  /**
   * Triggers an event to all subscribed webhooks
   * @param event - Event to trigger
   * @returns Array of delivery results
   */
  async triggerEvent(event: WebhookEvent): Promise<DeliveryResult[]> {
    const results: DeliveryResult[] = [];

    // Find all webhooks subscribed to this event type
    const subscribedWebhooks = Array.from(this.webhooks.values()).filter(
      wh => wh.enabled && wh.status === 'active' && wh.events.includes(event.type)
    );

    for (const webhook of subscribedWebhooks) {
      try {
        const result = await this.deliverWebhook(webhook.id, event);
        results.push(result);
      } catch (error) {
        logger.error(`Failed to deliver webhook ${webhook.id}:`, error);
        results.push({
          deliveryId: '',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          durationMs: 0,
          willRetry: false,
        });
      }
    }

    return results;
  }

  /**
   * Verifies a webhook signature
   * Requirement 51: Sign payloads with HMAC signatures for verification
   * @param payload - Request payload
   * @param signature - Signature from header
   * @param secret - Webhook secret
   * @param timestamp - Timestamp from header
   * @returns Whether signature is valid
   */
  verifySignature(payload: string, signature: string, secret: string, timestamp: number): boolean {
    // Check timestamp is within 5 minutes
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > 300) {
      return false;
    }

    const expectedSignature = this.computeSignature(payload, secret, timestamp);
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    
    // Signatures must be same length for timing-safe comparison
    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  }

  /**
   * Shuts down the webhook service
   */
  shutdown(): void {
    // Cancel all pending retries
    for (const [, timeout] of this.pendingRetries) {
      clearTimeout(timeout);
    }
    this.pendingRetries.clear();
    logger.info('Webhook service shut down');
  }

  // ============ Private Helper Methods ============

  /**
   * Generates a unique identifier
   */
  private generateId(prefix: string): string {
    return `${prefix}_${crypto.randomBytes(12).toString('hex')}`;
  }

  /**
   * Generates a secure secret key
   */
  private generateSecret(): string {
    return `whsec_${crypto.randomBytes(24).toString('hex')}`;
  }

  /**
   * Validates a webhook URL
   */
  private validateUrl(url: string): void {
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('URL must use HTTP or HTTPS protocol');
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('protocol')) {
        throw error;
      }
      throw new Error('Invalid URL format');
    }
  }

  /**
   * Builds request headers for webhook delivery
   */
  private buildRequestHeaders(webhook: Webhook, event: WebhookEvent): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = JSON.stringify(event);
    const signature = this.computeSignature(payload, webhook.secret, timestamp);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'AI-Humanizer-Webhook/1.0',
      'X-Webhook-ID': webhook.id,
      'X-Webhook-Timestamp': timestamp.toString(),
      'X-Webhook-Signature': signature,
      ...webhook.headers,
    };

    return headers;
  }

  /**
   * Computes HMAC signature for payload
   * Requirement 51: Sign payloads with HMAC signatures for verification
   */
  private computeSignature(payload: string, secret: string, timestamp: number): string {
    const signedPayload = `${timestamp}.${payload}`;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(signedPayload);
    return `sha256=${hmac.digest('hex')}`;
  }

  /**
   * Attempts to deliver a webhook
   */
  private async attemptDelivery(
    webhook: Webhook,
    delivery: WebhookDelivery,
    event: WebhookEvent
  ): Promise<DeliveryResult> {
    const startTime = Date.now();
    let result: DeliveryResult;

    try {
      // Simulate HTTP request (in production, use fetch or axios)
      const response = await this.sendHttpRequest(webhook.url, event, delivery.requestHeaders);

      const durationMs = Date.now() - startTime;

      delivery.status = response.ok ? 'success' : 'failed';
      delivery.statusCode = response.status;
      if (response.body) {
        delivery.responseBody = response.body.substring(0, 1000); // Truncate response
      }
      if (response.headers) {
        delivery.responseHeaders = response.headers;
      }
      delivery.durationMs = durationMs;

      if (response.ok) {
        // Success
        webhook.deliveryCount++;
        webhook.lastDeliveryAt = new Date();
        this.updateSuccessRate(webhook);

        result = {
          deliveryId: delivery.id,
          success: true,
          statusCode: response.status,
          durationMs,
          willRetry: false,
        };

        this.addLog(webhook.id, delivery, event);
      } else {
        // HTTP error
        delivery.error = `HTTP ${response.status}: ${response.statusText}`;
        result = await this.handleDeliveryFailure(webhook, delivery, event, durationMs);
      }
    } catch (error) {
      const durationMs = Date.now() - startTime;
      delivery.status = 'failed';
      delivery.error = error instanceof Error ? error.message : 'Unknown error';
      delivery.durationMs = durationMs;

      result = await this.handleDeliveryFailure(webhook, delivery, event, durationMs);
    }

    return result;
  }

  /**
   * Handles delivery failure with retry logic
   * Requirement 51: Retry up to 5 times with exponential backoff
   */
  private async handleDeliveryFailure(
    webhook: Webhook,
    delivery: WebhookDelivery,
    event: WebhookEvent,
    durationMs: number
  ): Promise<DeliveryResult> {
    webhook.failedCount++;
    this.updateSuccessRate(webhook);
    this.addLog(webhook.id, delivery, event);

    const { maxRetries, initialDelayMs, maxDelayMs, backoffMultiplier } = this.config.retryConfig;

    if (delivery.attemptNumber < maxRetries) {
      // Schedule retry with exponential backoff
      const delay = Math.min(
        initialDelayMs * Math.pow(backoffMultiplier, delivery.attemptNumber - 1),
        maxDelayMs
      );

      delivery.status = 'retrying';
      delivery.nextRetryAt = new Date(Date.now() + delay);

      // Schedule the retry
      const timeout = setTimeout(async () => {
        this.pendingRetries.delete(delivery.id);
        try {
          await this.retryFailedWebhook(delivery.id);
        } catch (error) {
          logger.error(`Retry failed for delivery ${delivery.id}:`, error);
        }
      }, delay);

      this.pendingRetries.set(delivery.id, timeout);

      logger.info(`Scheduled retry for delivery ${delivery.id} in ${delay}ms (attempt ${delivery.attemptNumber + 1})`);

      const retryResult: DeliveryResult = {
        deliveryId: delivery.id,
        success: false,
        durationMs,
        willRetry: true,
        nextRetryAt: delivery.nextRetryAt,
      };
      if (delivery.statusCode !== undefined) {
        retryResult.statusCode = delivery.statusCode;
      }
      if (delivery.error !== undefined) {
        retryResult.error = delivery.error;
      }
      return retryResult;
    } else {
      // Max retries exceeded
      delivery.status = 'failed';

      // Suspend webhook if too many failures
      if (webhook.failedCount > 10 && webhook.successRate < 50) {
        webhook.status = 'suspended';
        logger.warn(`Webhook ${webhook.id} suspended due to high failure rate`);
      }

      logger.error(`Delivery ${delivery.id} failed after ${maxRetries} attempts`);

      const failedResult: DeliveryResult = {
        deliveryId: delivery.id,
        success: false,
        durationMs,
        willRetry: false,
      };
      if (delivery.statusCode !== undefined) {
        failedResult.statusCode = delivery.statusCode;
      }
      if (delivery.error !== undefined) {
        failedResult.error = delivery.error;
      }
      return failedResult;
    }
  }

  /**
   * Updates webhook success rate
   */
  private updateSuccessRate(webhook: Webhook): void {
    const total = webhook.deliveryCount + webhook.failedCount;
    webhook.successRate = total > 0 ? (webhook.deliveryCount / total) * 100 : 100;
  }

  /**
   * Adds a log entry
   */
  private addLog(webhookId: string, delivery: WebhookDelivery, event: WebhookEvent): void {
    const logs = this.logs.get(webhookId) || [];
    const webhook = this.webhooks.get(webhookId);

    const log: WebhookLog = {
      id: this.generateId('log'),
      webhookId,
      eventType: event.type,
      status: delivery.status,
      attemptNumber: delivery.attemptNumber,
      timestamp: new Date(),
      url: webhook?.url || '',
      eventId: event.id,
    };
    if (delivery.statusCode !== undefined) {
      log.statusCode = delivery.statusCode;
    }
    if (delivery.durationMs !== undefined) {
      log.durationMs = delivery.durationMs;
    }
    if (delivery.error !== undefined) {
      log.error = delivery.error;
    }

    logs.push(log);

    // Keep only last 1000 entries
    if (logs.length > 1000) {
      logs.shift();
    }

    this.logs.set(webhookId, logs);
  }

  /**
   * Simulates HTTP request (placeholder for actual implementation)
   * In production, use fetch or axios
   */
  private async sendHttpRequest(
    url: string,
    event: WebhookEvent,
    _headers: Record<string, string>
  ): Promise<{ ok: boolean; status: number; statusText: string; body?: string; headers?: Record<string, string> }> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 50));

    // For testing purposes, simulate success for valid URLs
    // In production, this would make an actual HTTP request
    logger.debug(`Sending webhook to ${url}`, { eventType: event.type });

    // Simulate successful delivery
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      body: JSON.stringify({ received: true }),
      headers: { 'content-type': 'application/json' },
    };
  }
}

// Export singleton instance
export const webhookService = new WebhookService();
