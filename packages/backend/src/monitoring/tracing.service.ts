/**
 * Distributed Tracing Service
 * Jaeger-compatible tracing implementation
 */

import { v4 as uuidv4 } from 'uuid';
import { TraceContext, Span, SpanLog } from './types';
import { structuredLogger } from './structured-logger';

/**
 * Generate a random trace ID (128-bit as hex string)
 */
function generateTraceId(): string {
  return uuidv4().replace(/-/g, '');
}

/**
 * Generate a random span ID (64-bit as hex string)
 */
function generateSpanId(): string {
  return uuidv4().replace(/-/g, '').substring(0, 16);
}

/**
 * Span implementation for distributed tracing
 */
export class TracingSpan implements Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  serviceName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'ok' | 'error' | 'unset' = 'unset';
  tags: Record<string, string | number | boolean> = {};
  logs: SpanLog[] = [];

  constructor(
    operationName: string,
    serviceName: string,
    parentContext?: TraceContext
  ) {
    this.operationName = operationName;
    this.serviceName = serviceName;
    this.startTime = Date.now();

    if (parentContext) {
      this.traceId = parentContext.traceId;
      this.parentSpanId = parentContext.spanId;
    } else {
      this.traceId = generateTraceId();
    }
    this.spanId = generateSpanId();
  }

  /**
   * Set a tag on the span
   */
  setTag(key: string, value: string | number | boolean): TracingSpan {
    this.tags[key] = value;
    return this;
  }

  /**
   * Add a log entry to the span
   */
  log(fields: Record<string, unknown>): TracingSpan {
    this.logs.push({
      timestamp: Date.now(),
      fields,
    });
    return this;
  }

  /**
   * Set span status to OK
   */
  setOk(): TracingSpan {
    this.status = 'ok';
    return this;
  }

  /**
   * Set span status to error
   */
  setError(error?: Error): TracingSpan {
    this.status = 'error';
    if (error) {
      this.setTag('error', true);
      this.setTag('error.message', error.message);
      if (error.stack) {
        this.setTag('error.stack', error.stack);
      }
    }
    return this;
  }

  /**
   * Finish the span
   */
  finish(): void {
    this.endTime = Date.now();
    this.duration = this.endTime - this.startTime;
    
    // Log span completion for Jaeger collection
    structuredLogger.info('Span completed', {
      traceId: this.traceId,
      spanId: this.spanId,
      parentSpanId: this.parentSpanId,
      operationName: this.operationName,
      serviceName: this.serviceName,
      duration: this.duration,
      status: this.status,
      tags: this.tags,
    });
  }

  /**
   * Get trace context for propagation
   */
  getContext(): TraceContext {
    return {
      traceId: this.traceId,
      spanId: this.spanId,
      parentSpanId: this.parentSpanId,
      sampled: true,
    };
  }
}

/**
 * Tracing Service for distributed tracing
 */
export class TracingService {
  private serviceName: string;
  private activeSpans: Map<string, TracingSpan> = new Map();
  private samplingRate: number;

  constructor(serviceName: string = 'ai-humanizer-backend', samplingRate: number = 1.0) {
    this.serviceName = serviceName;
    this.samplingRate = samplingRate;
  }

  /**
   * Start a new span
   */
  startSpan(operationName: string, parentContext?: TraceContext): TracingSpan {
    // Apply sampling
    if (Math.random() > this.samplingRate) {
      // Return a no-op span for non-sampled traces
      const noopSpan = new TracingSpan(operationName, this.serviceName, parentContext);
      return noopSpan;
    }

    const span = new TracingSpan(operationName, this.serviceName, parentContext);
    this.activeSpans.set(span.spanId, span);
    
    structuredLogger.debug('Span started', {
      traceId: span.traceId,
      spanId: span.spanId,
      operationName,
    });

    return span;
  }

  /**
   * Extract trace context from HTTP headers
   */
  extractContext(headers: Record<string, string | string[] | undefined>): TraceContext | undefined {
    // Support Jaeger format (uber-trace-id)
    const jaegerHeader = headers['uber-trace-id'];
    if (jaegerHeader) {
      const headerValue = Array.isArray(jaegerHeader) ? jaegerHeader[0] : jaegerHeader;
      const parts = headerValue.split(':');
      if (parts.length >= 4) {
        return {
          traceId: parts[0],
          spanId: parts[1],
          parentSpanId: parts[2] !== '0' ? parts[2] : undefined,
          sampled: parts[3] === '1',
        };
      }
    }

    // Support W3C Trace Context format
    const traceparent = headers['traceparent'];
    if (traceparent) {
      const headerValue = Array.isArray(traceparent) ? traceparent[0] : traceparent;
      const parts = headerValue.split('-');
      if (parts.length >= 4) {
        return {
          traceId: parts[1],
          spanId: parts[2],
          sampled: (parseInt(parts[3], 16) & 1) === 1,
        };
      }
    }

    return undefined;
  }

  /**
   * Inject trace context into HTTP headers
   */
  injectContext(context: TraceContext, headers: Record<string, string>): void {
    // Jaeger format
    headers['uber-trace-id'] = `${context.traceId}:${context.spanId}:${context.parentSpanId || '0'}:${context.sampled ? '1' : '0'}`;
    
    // W3C Trace Context format
    const flags = context.sampled ? '01' : '00';
    headers['traceparent'] = `00-${context.traceId}-${context.spanId}-${flags}`;
  }

  /**
   * Create a child span
   */
  createChildSpan(operationName: string, parentSpan: TracingSpan): TracingSpan {
    return this.startSpan(operationName, parentSpan.getContext());
  }

  /**
   * Get active span by ID
   */
  getSpan(spanId: string): TracingSpan | undefined {
    return this.activeSpans.get(spanId);
  }

  /**
   * Finish and remove span
   */
  finishSpan(spanId: string): void {
    const span = this.activeSpans.get(spanId);
    if (span) {
      span.finish();
      this.activeSpans.delete(spanId);
    }
  }

  /**
   * Get all active spans (for debugging)
   */
  getActiveSpans(): TracingSpan[] {
    return Array.from(this.activeSpans.values());
  }

  /**
   * Clear all active spans
   */
  clearSpans(): void {
    this.activeSpans.clear();
  }
}

// Singleton instance
export const tracingService = new TracingService();
