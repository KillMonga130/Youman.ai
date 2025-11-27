/**
 * Webhook Service Tests
 * Tests for webhook registration, delivery, and monitoring
 * Requirements: 51
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebhookService } from './webhook.service';
import { RegisterWebhookOptions, WebhookEventType, WebhookEvent } from './types';

describe('WebhookService', () => {
  let service: WebhookService;

  beforeEach(() => {
    service = new WebhookService();
  });

  afterEach(() => {
    service.shutdown();
  });

  describe('registerWebhook', () => {
    it('should register a webhook with valid options', async () => {
      const options: RegisterWebhookOptions = {
        userId: 'user_123',
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['project.created', 'transformation.completed'],
      };

      const webhook = await service.registerWebhook(options);

      expect(webhook.id).toBeDefined();
      expect(webhook.id).toMatch(/^wh_/);
      expect(webhook.userId).toBe(options.userId);
      expect(webhook.name).toBe(options.name);
      expect(webhook.url).toBe(options.url);
      expect(webhook.events).toEqual(options.events);
      expect(webhook.status).toBe('active');
      expect(webhook.enabled).toBe(true);
      expect(webhook.secret).toBeDefined();
      expect(webhook.secret).toMatch(/^whsec_/);
    });

    it('should generate a secret if not provided', async () => {
      const options: RegisterWebhookOptions = {
        userId: 'user_123',
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['project.created'],
      };

      const webhook = await service.registerWebhook(options);
      expect(webhook.secret).toBeDefined();
      expect(webhook.secret.length).toBeGreaterThan(20);
    });

    it('should reject invalid URL', async () => {
      const options: RegisterWebhookOptions = {
        userId: 'user_123',
        name: 'Test Webhook',
        url: 'not-a-valid-url',
        events: ['project.created'],
      };

      await expect(service.registerWebhook(options)).rejects.toThrow('Invalid URL format');
    });

    it('should reject empty events array', async () => {
      const options: RegisterWebhookOptions = {
        userId: 'user_123',
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: [],
      };

      await expect(service.registerWebhook(options)).rejects.toThrow('At least one event type must be specified');
    });
  });

  describe('deliverWebhook', () => {
    it('should deliver webhook event successfully', async () => {
      const webhook = await service.registerWebhook({
        userId: 'user_123',
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['project.created'],
      });

      const event: WebhookEvent = {
        id: 'evt_123',
        type: 'project.created',
        timestamp: new Date(),
        userId: 'user_123',
        projectId: 'proj_123',
        data: { name: 'Test Project' },
        apiVersion: '2024-01-01',
      };

      const result = await service.deliverWebhook(webhook.id, event);

      expect(result.success).toBe(true);
      expect(result.deliveryId).toBeDefined();
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should throw error for non-existent webhook', async () => {
      const event: WebhookEvent = {
        id: 'evt_123',
        type: 'project.created',
        timestamp: new Date(),
        userId: 'user_123',
        data: {},
        apiVersion: '2024-01-01',
      };

      await expect(service.deliverWebhook('wh_nonexistent', event)).rejects.toThrow('Webhook not found');
    });
  });

  describe('verifySignature', () => {
    it('should verify valid signature', async () => {
      const webhook = await service.registerWebhook({
        userId: 'user_123',
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['project.created'],
      });

      const payload = JSON.stringify({ test: 'data' });
      const timestamp = Math.floor(Date.now() / 1000);

      const crypto = await import('crypto');
      const signedPayload = timestamp + '.' + payload;
      const hmac = crypto.createHmac('sha256', webhook.secret);
      hmac.update(signedPayload);
      const expectedSignature = 'sha256=' + hmac.digest('hex');

      const isValid = service.verifySignature(payload, expectedSignature, webhook.secret, timestamp);
      expect(isValid).toBe(true);
    });

    it('should reject expired timestamp', async () => {
      const webhook = await service.registerWebhook({
        userId: 'user_123',
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['project.created'],
      });

      const payload = JSON.stringify({ test: 'data' });
      const oldTimestamp = Math.floor(Date.now() / 1000) - 600;

      const crypto = await import('crypto');
      const signedPayload = oldTimestamp + '.' + payload;
      const hmac = crypto.createHmac('sha256', webhook.secret);
      hmac.update(signedPayload);
      const signature = 'sha256=' + hmac.digest('hex');

      const isValid = service.verifySignature(payload, signature, webhook.secret, oldTimestamp);
      expect(isValid).toBe(false);
    });
  });

  describe('getWebhookLogs', () => {
    it('should return logs for a webhook', async () => {
      const webhook = await service.registerWebhook({
        userId: 'user_123',
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['project.created'],
      });

      const event: WebhookEvent = {
        id: 'evt_123',
        type: 'project.created',
        timestamp: new Date(),
        userId: 'user_123',
        data: {},
        apiVersion: '2024-01-01',
      };

      await service.deliverWebhook(webhook.id, event);
      const logs = await service.getWebhookLogs(webhook.id);

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].webhookId).toBe(webhook.id);
    });
  });

  describe('updateWebhook', () => {
    it('should update webhook properties', async () => {
      const webhook = await service.registerWebhook({
        userId: 'user_123',
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['project.created'],
      });

      const updated = await service.updateWebhook(webhook.id, {
        name: 'Updated Webhook',
        enabled: false,
      });

      expect(updated.name).toBe('Updated Webhook');
      expect(updated.enabled).toBe(false);
    });
  });

  describe('deleteWebhook', () => {
    it('should delete a webhook', async () => {
      const webhook = await service.registerWebhook({
        userId: 'user_123',
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['project.created'],
      });

      await service.deleteWebhook(webhook.id);
      const deleted = await service.getWebhook(webhook.id);
      expect(deleted).toBeNull();
    });
  });

  describe('getWebhookStats', () => {
    it('should return webhook statistics', async () => {
      const webhook = await service.registerWebhook({
        userId: 'user_123',
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['project.created'],
      });

      const stats = await service.getWebhookStats(webhook.id);

      expect(stats.totalDeliveries).toBeDefined();
      expect(stats.successRate).toBeDefined();
    });
  });

  describe('triggerEvent', () => {
    it('should trigger event to all subscribed webhooks', async () => {
      await service.registerWebhook({
        userId: 'user_1',
        name: 'Webhook 1',
        url: 'https://example1.com/webhook',
        events: ['project.created'],
      });

      await service.registerWebhook({
        userId: 'user_2',
        name: 'Webhook 2',
        url: 'https://example2.com/webhook',
        events: ['project.created'],
      });

      const event: WebhookEvent = {
        id: 'evt_123',
        type: 'project.created',
        timestamp: new Date(),
        userId: 'user_1',
        data: {},
        apiVersion: '2024-01-01',
      };

      const results = await service.triggerEvent(event);

      expect(results.length).toBe(2);
      expect(results.every(r => r.success)).toBe(true);
    });
  });

  describe('getWebhooksByUser', () => {
    it('should return all webhooks for a user', async () => {
      await service.registerWebhook({
        userId: 'user_123',
        name: 'Webhook 1',
        url: 'https://example1.com/webhook',
        events: ['project.created'],
      });

      await service.registerWebhook({
        userId: 'user_123',
        name: 'Webhook 2',
        url: 'https://example2.com/webhook',
        events: ['transformation.completed'],
      });

      const webhooks = service.getWebhooksByUser('user_123');

      expect(webhooks.length).toBe(2);
      expect(webhooks.every(wh => wh.userId === 'user_123')).toBe(true);
    });
  });
});
