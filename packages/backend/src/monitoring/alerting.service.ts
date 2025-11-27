/**
 * Alerting Service
 * Multi-channel alerting via email, Slack, PagerDuty, and webhooks
 */

import axios from 'axios';
import nodemailer from 'nodemailer';
import {
  AlertConfig,
  AlertEvent,
  AlertChannel,
  AlertSeverity,
  EmailAlertConfig,
  SlackAlertConfig,
  PagerDutyAlertConfig,
  WebhookAlertConfig,
} from './types';
import { structuredLogger } from './structured-logger';

export class AlertingService {
  private alerts: Map<string, AlertConfig> = new Map();
  private alertHistory: AlertEvent[] = [];
  private emailTransporter: nodemailer.Transporter | null = null;

  constructor() {
    // Initialize email transporter if configured
    if (process.env.SMTP_HOST) {
      this.emailTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
  }

  /**
   * Register a new alert configuration
   */
  registerAlert(config: AlertConfig): void {
    this.alerts.set(config.id, config);
    structuredLogger.info('Alert registered', { alertId: config.id, name: config.name });
  }

  /**
   * Remove an alert configuration
   */
  removeAlert(alertId: string): void {
    this.alerts.delete(alertId);
    structuredLogger.info('Alert removed', { alertId });
  }

  /**
   * Get all registered alerts
   */
  getAlerts(): AlertConfig[] {
    return Array.from(this.alerts.values());
  }

  /**
   * Check if an alert should be triggered based on metric value
   */
  async checkAlert(alertId: string, currentValue: number): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert || !alert.enabled) {
      return false;
    }

    const { condition, cooldownMinutes, lastTriggered } = alert;
    
    // Check cooldown
    if (lastTriggered) {
      const cooldownMs = cooldownMinutes * 60 * 1000;
      if (Date.now() - lastTriggered.getTime() < cooldownMs) {
        return false;
      }
    }

    // Evaluate condition
    const shouldTrigger = this.evaluateCondition(currentValue, condition.operator, condition.threshold);
    
    if (shouldTrigger) {
      await this.triggerAlert(alert, currentValue);
      alert.lastTriggered = new Date();
      return true;
    }

    return false;
  }

  /**
   * Evaluate alert condition
   */
  private evaluateCondition(
    value: number,
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte',
    threshold: number
  ): boolean {
    switch (operator) {
      case 'gt': return value > threshold;
      case 'lt': return value < threshold;
      case 'eq': return value === threshold;
      case 'gte': return value >= threshold;
      case 'lte': return value <= threshold;
      default: return false;
    }
  }

  /**
   * Trigger an alert and send notifications
   */
  async triggerAlert(alert: AlertConfig, currentValue: number): Promise<void> {
    const event: AlertEvent = {
      alertId: alert.id,
      alertName: alert.name,
      severity: alert.severity,
      message: `Alert: ${alert.name} - ${alert.description}`,
      metric: alert.condition.metric,
      currentValue,
      threshold: alert.condition.threshold,
      timestamp: new Date(),
      resolved: false,
    };

    this.alertHistory.push(event);
    structuredLogger.warn('Alert triggered', {
      alertId: alert.id,
      alertName: alert.name,
      severity: alert.severity,
      currentValue,
      threshold: alert.condition.threshold,
    });

    // Send notifications to all configured channels
    const notifications = alert.channels.map((channel) =>
      this.sendNotification(channel, event)
    );

    await Promise.allSettled(notifications);
  }

  /**
   * Send notification to a specific channel
   */
  private async sendNotification(channel: AlertChannel, event: AlertEvent): Promise<void> {
    try {
      switch (channel.type) {
        case 'email':
          await this.sendEmailAlert(channel.config as EmailAlertConfig, event);
          break;
        case 'slack':
          await this.sendSlackAlert(channel.config as SlackAlertConfig, event);
          break;
        case 'pagerduty':
          await this.sendPagerDutyAlert(channel.config as PagerDutyAlertConfig, event);
          break;
        case 'webhook':
          await this.sendWebhookAlert(channel.config as WebhookAlertConfig, event);
          break;
      }
    } catch (error) {
      structuredLogger.error('Failed to send alert notification', error as Error, {
        channelType: channel.type,
        alertId: event.alertId,
      });
    }
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(config: EmailAlertConfig, event: AlertEvent): Promise<void> {
    if (!this.emailTransporter) {
      structuredLogger.warn('Email transporter not configured, skipping email alert');
      return;
    }

    const subject = config.subject || `[${event.severity.toUpperCase()}] ${event.alertName}`;
    const html = this.formatEmailBody(event);

    await this.emailTransporter.sendMail({
      from: process.env.SMTP_FROM || 'alerts@ai-humanizer.com',
      to: config.recipients.join(', '),
      subject,
      html,
    });

    structuredLogger.info('Email alert sent', {
      alertId: event.alertId,
      recipients: config.recipients,
    });
  }

  /**
   * Format email body
   */
  private formatEmailBody(event: AlertEvent): string {
    const severityColor = {
      info: '#2196F3',
      warning: '#FF9800',
      critical: '#F44336',
    }[event.severity];

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: ${severityColor}; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">${event.severity.toUpperCase()} Alert</h1>
        </div>
        <div style="padding: 20px; background-color: #f5f5f5;">
          <h2 style="color: #333;">${event.alertName}</h2>
          <p style="color: #666;">${event.message}</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Metric:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${event.metric}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Current Value:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${event.currentValue}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Threshold:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${event.threshold}</td>
            </tr>
            <tr>
              <td style="padding: 10px;"><strong>Time:</strong></td>
              <td style="padding: 10px;">${event.timestamp.toISOString()}</td>
            </tr>
          </table>
        </div>
        <div style="padding: 10px; text-align: center; color: #999; font-size: 12px;">
          AI Humanizer Monitoring System
        </div>
      </div>
    `;
  }

  /**
   * Send Slack alert
   */
  private async sendSlackAlert(config: SlackAlertConfig, event: AlertEvent): Promise<void> {
    const color = {
      info: '#2196F3',
      warning: '#FF9800',
      critical: '#F44336',
    }[event.severity];

    const payload = {
      username: config.username || 'AI Humanizer Alerts',
      channel: config.channel,
      attachments: [
        {
          color,
          title: `${event.severity.toUpperCase()}: ${event.alertName}`,
          text: event.message,
          fields: [
            { title: 'Metric', value: event.metric, short: true },
            { title: 'Current Value', value: String(event.currentValue), short: true },
            { title: 'Threshold', value: String(event.threshold), short: true },
            { title: 'Time', value: event.timestamp.toISOString(), short: true },
          ],
          footer: 'AI Humanizer Monitoring',
          ts: Math.floor(event.timestamp.getTime() / 1000),
        },
      ],
    };

    await axios.post(config.webhookUrl, payload);
    structuredLogger.info('Slack alert sent', { alertId: event.alertId });
  }

  /**
   * Send PagerDuty alert
   */
  private async sendPagerDutyAlert(config: PagerDutyAlertConfig, event: AlertEvent): Promise<void> {
    const severity = config.severity || this.mapSeverityToPagerDuty(event.severity);

    const payload = {
      routing_key: config.routingKey,
      event_action: 'trigger',
      dedup_key: `${event.alertId}-${event.metric}`,
      payload: {
        summary: `${event.alertName}: ${event.message}`,
        severity,
        source: 'ai-humanizer-backend',
        timestamp: event.timestamp.toISOString(),
        custom_details: {
          metric: event.metric,
          current_value: event.currentValue,
          threshold: event.threshold,
        },
      },
    };

    await axios.post('https://events.pagerduty.com/v2/enqueue', payload);
    structuredLogger.info('PagerDuty alert sent', { alertId: event.alertId });
  }

  /**
   * Map internal severity to PagerDuty severity
   */
  private mapSeverityToPagerDuty(severity: AlertSeverity): string {
    const mapping: Record<AlertSeverity, string> = {
      info: 'info',
      warning: 'warning',
      critical: 'critical',
    };
    return mapping[severity];
  }

  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(config: WebhookAlertConfig, event: AlertEvent): Promise<void> {
    const method = config.method || 'POST';
    const headers = {
      'Content-Type': 'application/json',
      ...config.headers,
    };

    await axios({
      method,
      url: config.url,
      headers,
      data: event,
    });

    structuredLogger.info('Webhook alert sent', { alertId: event.alertId, url: config.url });
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string): Promise<void> {
    const recentEvent = this.alertHistory
      .filter((e) => e.alertId === alertId && !e.resolved)
      .pop();

    if (recentEvent) {
      recentEvent.resolved = true;
      structuredLogger.info('Alert resolved', { alertId });
    }
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit: number = 100): AlertEvent[] {
    return this.alertHistory.slice(-limit);
  }

  /**
   * Clear alert history
   */
  clearHistory(): void {
    this.alertHistory = [];
  }
}

// Singleton instance
export const alertingService = new AlertingService();
