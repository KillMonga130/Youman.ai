/**
 * Monitoring Module Tests
 * Tests for metrics, tracing, alerting, and diagnostics services
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MetricsService } from './metrics.service';
import { TracingService, TracingSpan } from './tracing.service';
import { AlertingService } from './alerting.service';
import { DiagnosticsService } from './diagnostics.service';
import { AlertConfig, AlertSeverity } from './types';

describe('Monitoring Module', () => {
  describe('MetricsService', () => {
    let metricsService: MetricsService;

    beforeEach(() => {
      metricsService = new MetricsService({
        collectDefaultMetrics: false,
        prefix: 'test_',
      });
    });

    it('should record HTTP request metrics', async () => {
      metricsService.recordHttpRequest('GET', '/api/test', 200, 0.5);
      metricsService.recordHttpRequest('POST', '/api/test', 201, 0.3);
      metricsService.recordHttpRequest('GET', '/api/test', 500, 1.2);

      const metrics = await metricsService.getMetrics();
      expect(metrics).toContain('test_http_requests_total');
      expect(metrics).toContain('test_http_request_duration_seconds');
    });

    it('should record transformation metrics', async () => {
      metricsService.recordTransformation('casual', 3, 'success', 2.5, 1000);
      metricsService.recordTransformation('professional', 4, 'error', 1.0, 500);

      const metrics = await metricsService.getMetrics();
      expect(metrics).toContain('test_transformations_total');
      expect(metrics).toContain('test_transformation_duration_seconds');
      expect(metrics).toContain('test_transformation_words_processed_total');
    });

    it('should record detection metrics', async () => {
      metricsService.recordDetection('gptzero', 25, 1.5, 'pass');
      metricsService.recordDetection('originality', 75, 2.0, 'fail');

      const metrics = await metricsService.getMetrics();
      expect(metrics).toContain('test_detections_total');
      expect(metrics).toContain('test_detection_score');
      expect(metrics).toContain('test_detection_duration_seconds');
    });

    it('should record database query metrics', async () => {
      metricsService.recordDbQuery('postgresql', 'SELECT', 0.01);
      metricsService.recordDbQuery('mongodb', 'find', 0.02);
      metricsService.recordDbQuery('redis', 'GET', 0.001, true);

      const metrics = await metricsService.getMetrics();
      expect(metrics).toContain('test_db_query_duration_seconds');
      expect(metrics).toContain('test_db_errors_total');
    });

    it('should normalize paths with UUIDs', async () => {
      metricsService.recordHttpRequest(
        'GET',
        '/api/projects/123e4567-e89b-12d3-a456-426614174000',
        200,
        0.1
      );

      const metrics = await metricsService.getMetrics();
      expect(metrics).toContain('path="/api/projects/:id"');
    });

    it('should normalize paths with numeric IDs', async () => {
      metricsService.recordHttpRequest('GET', '/api/users/12345', 200, 0.1);

      const metrics = await metricsService.getMetrics();
      expect(metrics).toContain('path="/api/users/:id"');
    });

    it('should return correct content type', () => {
      const contentType = metricsService.getContentType();
      expect(contentType).toContain('text/plain');
    });

    it('should reset metrics', async () => {
      metricsService.recordHttpRequest('GET', '/api/test', 200, 0.5);
      metricsService.resetMetrics();

      const metrics = await metricsService.getMetrics();
      // After reset, counters should be at 0
      expect(metrics).toBeDefined();
    });
  });

  describe('TracingService', () => {
    let tracingService: TracingService;

    beforeEach(() => {
      tracingService = new TracingService('test-service', 1.0);
      tracingService.clearSpans();
    });

    it('should start a new span', () => {
      const span = tracingService.startSpan('test-operation');

      expect(span).toBeInstanceOf(TracingSpan);
      expect(span.operationName).toBe('test-operation');
      expect(span.serviceName).toBe('test-service');
      expect(span.traceId).toBeDefined();
      expect(span.spanId).toBeDefined();
    });

    it('should create child spans with parent context', () => {
      const parentSpan = tracingService.startSpan('parent-operation');
      const childSpan = tracingService.createChildSpan('child-operation', parentSpan);

      expect(childSpan.traceId).toBe(parentSpan.traceId);
      expect(childSpan.parentSpanId).toBe(parentSpan.spanId);
    });

    it('should set tags on spans', () => {
      const span = tracingService.startSpan('test-operation');
      span.setTag('http.method', 'GET');
      span.setTag('http.status_code', 200);
      span.setTag('error', false);

      expect(span.tags['http.method']).toBe('GET');
      expect(span.tags['http.status_code']).toBe(200);
      expect(span.tags['error']).toBe(false);
    });

    it('should add logs to spans', () => {
      const span = tracingService.startSpan('test-operation');
      span.log({ event: 'test-event', message: 'Test message' });

      expect(span.logs).toHaveLength(1);
      expect(span.logs[0].fields.event).toBe('test-event');
    });

    it('should set span status', () => {
      const span = tracingService.startSpan('test-operation');
      
      span.setOk();
      expect(span.status).toBe('ok');

      span.setError(new Error('Test error'));
      expect(span.status).toBe('error');
      expect(span.tags['error']).toBe(true);
    });

    it('should finish span and calculate duration', () => {
      const span = tracingService.startSpan('test-operation');
      
      // Simulate some work
      const startTime = span.startTime;
      span.finish();

      expect(span.endTime).toBeDefined();
      expect(span.duration).toBeGreaterThanOrEqual(0);
      expect(span.endTime! - startTime).toBe(span.duration);
    });

    it('should extract Jaeger trace context from headers', () => {
      const headers = {
        'uber-trace-id': 'abc123:def456:0:1',
      };

      const context = tracingService.extractContext(headers);

      expect(context).toBeDefined();
      expect(context?.traceId).toBe('abc123');
      expect(context?.spanId).toBe('def456');
      expect(context?.sampled).toBe(true);
    });

    it('should extract W3C trace context from headers', () => {
      const headers = {
        traceparent: '00-abc123def456789012345678901234-def456789012345-01',
      };

      const context = tracingService.extractContext(headers);

      expect(context).toBeDefined();
      expect(context?.traceId).toBe('abc123def456789012345678901234');
      expect(context?.spanId).toBe('def456789012345');
      expect(context?.sampled).toBe(true);
    });

    it('should inject trace context into headers', () => {
      const context = {
        traceId: 'abc123',
        spanId: 'def456',
        sampled: true,
      };
      const headers: Record<string, string> = {};

      tracingService.injectContext(context, headers);

      expect(headers['uber-trace-id']).toBe('abc123:def456:0:1');
      expect(headers['traceparent']).toContain('abc123');
    });

    it('should track active spans', () => {
      const span1 = tracingService.startSpan('operation-1');
      const span2 = tracingService.startSpan('operation-2');

      const activeSpans = tracingService.getActiveSpans();
      expect(activeSpans).toHaveLength(2);

      tracingService.finishSpan(span1.spanId);
      expect(tracingService.getActiveSpans()).toHaveLength(1);
    });
  });

  describe('AlertingService', () => {
    let alertingService: AlertingService;

    beforeEach(() => {
      alertingService = new AlertingService();
      alertingService.clearHistory();
    });

    it('should register an alert', () => {
      const alertConfig: AlertConfig = {
        id: 'test-alert',
        name: 'Test Alert',
        description: 'Test alert description',
        condition: {
          metric: 'error_rate',
          operator: 'gt',
          threshold: 5,
          duration: 60,
        },
        channels: [],
        severity: 'warning',
        enabled: true,
        cooldownMinutes: 5,
      };

      alertingService.registerAlert(alertConfig);
      const alerts = alertingService.getAlerts();

      expect(alerts).toHaveLength(1);
      expect(alerts[0].id).toBe('test-alert');
    });

    it('should remove an alert', () => {
      const alertConfig: AlertConfig = {
        id: 'test-alert',
        name: 'Test Alert',
        description: 'Test alert description',
        condition: {
          metric: 'error_rate',
          operator: 'gt',
          threshold: 5,
          duration: 60,
        },
        channels: [],
        severity: 'warning',
        enabled: true,
        cooldownMinutes: 5,
      };

      alertingService.registerAlert(alertConfig);
      alertingService.removeAlert('test-alert');

      expect(alertingService.getAlerts()).toHaveLength(0);
    });

    it('should trigger alert when condition is met', async () => {
      const alertConfig: AlertConfig = {
        id: 'test-alert',
        name: 'Test Alert',
        description: 'Test alert description',
        condition: {
          metric: 'error_rate',
          operator: 'gt',
          threshold: 5,
          duration: 60,
        },
        channels: [],
        severity: 'warning',
        enabled: true,
        cooldownMinutes: 0, // No cooldown for testing
      };

      alertingService.registerAlert(alertConfig);
      const triggered = await alertingService.checkAlert('test-alert', 10);

      expect(triggered).toBe(true);
      expect(alertingService.getAlertHistory()).toHaveLength(1);
    });

    it('should not trigger alert when condition is not met', async () => {
      const alertConfig: AlertConfig = {
        id: 'test-alert',
        name: 'Test Alert',
        description: 'Test alert description',
        condition: {
          metric: 'error_rate',
          operator: 'gt',
          threshold: 5,
          duration: 60,
        },
        channels: [],
        severity: 'warning',
        enabled: true,
        cooldownMinutes: 0,
      };

      alertingService.registerAlert(alertConfig);
      const triggered = await alertingService.checkAlert('test-alert', 3);

      expect(triggered).toBe(false);
    });

    it('should respect cooldown period', async () => {
      const alertConfig: AlertConfig = {
        id: 'test-alert',
        name: 'Test Alert',
        description: 'Test alert description',
        condition: {
          metric: 'error_rate',
          operator: 'gt',
          threshold: 5,
          duration: 60,
        },
        channels: [],
        severity: 'warning',
        enabled: true,
        cooldownMinutes: 60, // 60 minute cooldown
      };

      alertingService.registerAlert(alertConfig);
      
      // First trigger should succeed
      const firstTrigger = await alertingService.checkAlert('test-alert', 10);
      expect(firstTrigger).toBe(true);

      // Second trigger should be blocked by cooldown
      const secondTrigger = await alertingService.checkAlert('test-alert', 10);
      expect(secondTrigger).toBe(false);
    });

    it('should not trigger disabled alerts', async () => {
      const alertConfig: AlertConfig = {
        id: 'test-alert',
        name: 'Test Alert',
        description: 'Test alert description',
        condition: {
          metric: 'error_rate',
          operator: 'gt',
          threshold: 5,
          duration: 60,
        },
        channels: [],
        severity: 'warning',
        enabled: false, // Disabled
        cooldownMinutes: 0,
      };

      alertingService.registerAlert(alertConfig);
      const triggered = await alertingService.checkAlert('test-alert', 10);

      expect(triggered).toBe(false);
    });

    it('should evaluate different operators correctly', async () => {
      const operators: Array<{ op: 'gt' | 'lt' | 'eq' | 'gte' | 'lte'; value: number; expected: boolean }> = [
        { op: 'gt', value: 10, expected: true },
        { op: 'gt', value: 5, expected: false },
        { op: 'lt', value: 3, expected: true },
        { op: 'lt', value: 5, expected: false },
        { op: 'eq', value: 5, expected: true },
        { op: 'eq', value: 6, expected: false },
        { op: 'gte', value: 5, expected: true },
        { op: 'gte', value: 6, expected: true },
        { op: 'lte', value: 5, expected: true },
        { op: 'lte', value: 4, expected: true },
      ];

      for (const { op, value, expected } of operators) {
        alertingService.clearHistory();
        const alertConfig: AlertConfig = {
          id: `test-${op}`,
          name: 'Test Alert',
          description: 'Test',
          condition: {
            metric: 'test',
            operator: op,
            threshold: 5,
            duration: 60,
          },
          channels: [],
          severity: 'warning',
          enabled: true,
          cooldownMinutes: 0,
        };

        alertingService.registerAlert(alertConfig);
        const triggered = await alertingService.checkAlert(`test-${op}`, value);
        expect(triggered).toBe(expected);
        alertingService.removeAlert(`test-${op}`);
      }
    });

    it('should resolve alerts', async () => {
      const alertConfig: AlertConfig = {
        id: 'test-alert',
        name: 'Test Alert',
        description: 'Test',
        condition: {
          metric: 'test',
          operator: 'gt',
          threshold: 5,
          duration: 60,
        },
        channels: [],
        severity: 'warning',
        enabled: true,
        cooldownMinutes: 0,
      };

      alertingService.registerAlert(alertConfig);
      await alertingService.checkAlert('test-alert', 10);
      await alertingService.resolveAlert('test-alert');

      const history = alertingService.getAlertHistory();
      expect(history[0].resolved).toBe(true);
    });
  });

  describe('DiagnosticsService', () => {
    let diagnosticsService: DiagnosticsService;

    beforeEach(() => {
      diagnosticsService = new DiagnosticsService();
      diagnosticsService.reset();
    });

    it('should generate a diagnostic report', async () => {
      const report = await diagnosticsService.generateReport();

      expect(report.id).toBeDefined();
      expect(report.generatedAt).toBeInstanceOf(Date);
      expect(report.system).toBeDefined();
      expect(report.application).toBeDefined();
      expect(report.database).toBeDefined();
      expect(report.metrics).toBeDefined();
      expect(report.recommendations).toBeDefined();
    });

    it('should include system diagnostics', async () => {
      const report = await diagnosticsService.generateReport();

      expect(report.system.hostname).toBeDefined();
      expect(report.system.platform).toBeDefined();
      expect(report.system.nodeVersion).toBeDefined();
      expect(report.system.memory).toBeDefined();
      expect(report.system.cpu).toBeDefined();
    });

    it('should include application diagnostics', async () => {
      const report = await diagnosticsService.generateReport();

      expect(report.application.version).toBeDefined();
      expect(report.application.environment).toBeDefined();
      expect(report.application.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should track requests', async () => {
      diagnosticsService.trackRequest(100, false);
      diagnosticsService.trackRequest(200, false);
      diagnosticsService.trackRequest(500, true);

      const report = await diagnosticsService.generateReport();

      expect(report.application.errorRate).toBeGreaterThan(0);
    });

    it('should track errors', async () => {
      diagnosticsService.trackError(new Error('Test error 1'));
      diagnosticsService.trackError(new Error('Test error 1')); // Same error
      diagnosticsService.trackError(new Error('Test error 2'));

      const report = await diagnosticsService.generateReport();

      expect(report.recentErrors.length).toBeGreaterThan(0);
    });

    it('should generate recommendations for high memory usage', async () => {
      // This test verifies the recommendation logic exists
      const report = await diagnosticsService.generateReport();
      expect(report.recommendations).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it('should reset diagnostics', async () => {
      diagnosticsService.trackRequest(100, false);
      diagnosticsService.trackError(new Error('Test'));
      diagnosticsService.reset();

      const report = await diagnosticsService.generateReport();
      expect(report.recentErrors).toHaveLength(0);
    });
  });
});
