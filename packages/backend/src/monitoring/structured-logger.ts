/**
 * Structured Logger for ELK Stack
 * Enhanced logging with structured JSON output for Elasticsearch/Logstash/Kibana
 */

import winston from 'winston';
import { config } from '../config/env';
import { StructuredLogEntry, LogLevel, TraceContext } from './types';

// Custom format for ELK-compatible JSON output
const elkFormat = winston.format.printf((info) => {
  const entry: StructuredLogEntry = {
    timestamp: info.timestamp as string,
    level: info.level as LogLevel,
    message: String(info.message),
    service: 'ai-humanizer-backend',
    environment: config.nodeEnv,
  };

  // Add optional fields if present
  if (typeof info.traceId === 'string') entry.traceId = info.traceId;
  if (typeof info.spanId === 'string') entry.spanId = info.spanId;
  if (typeof info.userId === 'string') entry.userId = info.userId;
  if (typeof info.requestId === 'string') entry.requestId = info.requestId;
  if (typeof info.duration === 'number') entry.duration = info.duration;
  if (typeof info.statusCode === 'number') entry.statusCode = info.statusCode;
  if (typeof info.method === 'string') entry.method = info.method;
  if (typeof info.path === 'string') entry.path = info.path;
  
  if (info.error && typeof info.error === 'object') {
    const err = info.error as Error;
    entry.error = {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
    if (typeof info.errorCode === 'string') {
      entry.error.code = info.errorCode;
    }
  }

  // Add any additional metadata
  const excludeKeys = [
    'timestamp', 'level', 'message', 'traceId', 'spanId', 'userId',
    'requestId', 'duration', 'statusCode', 'method', 'path', 'error', 'errorCode'
  ];
  
  const metadata: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(info)) {
    if (!excludeKeys.includes(key)) {
      metadata[key] = value;
    }
  }
  
  if (Object.keys(metadata).length > 0) {
    entry.metadata = metadata;
  }

  return JSON.stringify(entry);
});

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.printf((info) => {
    const { level, message, timestamp, traceId, ...meta } = info;
    let log = `${String(timestamp)} [${level}]`;
    if (traceId) {
      log += ` [${String(traceId).substring(0, 8)}]`;
    }
    log += `: ${String(message)}`;
    
    const metaKeys = Object.keys(meta);
    if (metaKeys.length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    return log;
  })
);

// Create the structured logger
const createStructuredLogger = () => {
  const transports: winston.transport[] = [];

  // Console transport
  transports.push(
    new winston.transports.Console({
      format: config.isProduction
        ? winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
            elkFormat
          )
        : winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            consoleFormat
          ),
    })
  );

  // File transports for production
  if (config.isProduction) {
    // All logs in JSON format for ELK
    transports.push(
      new winston.transports.File({
        filename: 'logs/app.log',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
          elkFormat
        ),
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 10,
      })
    );

    // Error logs separately
    transports.push(
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
          elkFormat
        ),
        maxsize: 10 * 1024 * 1024,
        maxFiles: 5,
      })
    );
  }

  return winston.createLogger({
    level: config.isDevelopment ? 'debug' : 'info',
    transports,
  });
};

export const structuredLogger = createStructuredLogger();

/**
 * Logger class with trace context support
 */
export class ContextualLogger {
  private context: Partial<TraceContext> = {};
  private userId?: string;
  private requestId?: string;

  constructor(context?: Partial<TraceContext>) {
    if (context) {
      this.context = context;
    }
  }

  setTraceContext(context: Partial<TraceContext>): void {
    this.context = { ...this.context, ...context };
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  setRequestId(requestId: string): void {
    this.requestId = requestId;
  }

  private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    structuredLogger.log({
      level,
      message,
      traceId: this.context.traceId,
      spanId: this.context.spanId,
      userId: this.userId,
      requestId: this.requestId,
      ...meta,
    });
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.log('debug', message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log('warn', message, meta);
  }

  error(message: string, error?: Error, meta?: Record<string, unknown>): void {
    this.log('error', message, {
      ...meta,
      ...(error && { error, errorCode: (error as Error & { code?: string }).code }),
    });
  }

  fatal(message: string, error?: Error, meta?: Record<string, unknown>): void {
    this.log('fatal', message, {
      ...meta,
      ...(error && { error, errorCode: (error as Error & { code?: string }).code }),
    });
  }

  /**
   * Log HTTP request
   */
  httpRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    meta?: Record<string, unknown>
  ): void {
    const level: LogLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    this.log(level, `${method} ${path} ${statusCode}`, {
      method,
      path,
      statusCode,
      duration,
      ...meta,
    });
  }

  /**
   * Create child logger with additional context
   */
  child(additionalContext: Record<string, unknown>): ContextualLogger {
    const childLogger = new ContextualLogger(this.context);
    childLogger.userId = this.userId;
    childLogger.requestId = this.requestId;
    return childLogger;
  }
}

// Default logger instance
export const logger = new ContextualLogger();
