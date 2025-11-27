/**
 * Diagnostics Service
 * Automatic diagnostic report generation
 */

import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import {
  DiagnosticReport,
  SystemDiagnostics,
  ApplicationDiagnostics,
  DatabaseDiagnostics,
  MetricsSummary,
  ErrorSummary,
} from './types';
import { metricsService } from './metrics.service';
import { structuredLogger } from './structured-logger';
import { config } from '../config/env';

// Track application start time
const appStartTime = new Date();

// Error tracking
const errorTracker: Map<string, { count: number; lastOccurrence: Date; stack?: string }> = new Map();

export class DiagnosticsService {
  private requestCount = 0;
  private totalResponseTime = 0;
  private errorCount = 0;
  private activeConnections = 0;

  /**
   * Track a request for diagnostics
   */
  trackRequest(responseTime: number, isError: boolean): void {
    this.requestCount++;
    this.totalResponseTime += responseTime;
    if (isError) {
      this.errorCount++;
    }
  }

  /**
   * Track an error for diagnostics
   */
  trackError(error: Error): void {
    const key = error.message;
    const existing = errorTracker.get(key);
    
    if (existing) {
      existing.count++;
      existing.lastOccurrence = new Date();
    } else {
      errorTracker.set(key, {
        count: 1,
        lastOccurrence: new Date(),
        stack: error.stack,
      });
    }
  }

  /**
   * Update active connections count
   */
  setActiveConnections(count: number): void {
    this.activeConnections = count;
  }

  /**
   * Generate a comprehensive diagnostic report
   */
  async generateReport(): Promise<DiagnosticReport> {
    structuredLogger.info('Generating diagnostic report');

    const [system, application, database, metrics] = await Promise.all([
      this.getSystemDiagnostics(),
      this.getApplicationDiagnostics(),
      this.getDatabaseDiagnostics(),
      this.getMetricsSummary(),
    ]);

    const recentErrors = this.getRecentErrors();
    const recommendations = this.generateRecommendations(system, application, database, metrics);

    const report: DiagnosticReport = {
      id: uuidv4(),
      generatedAt: new Date(),
      system,
      application,
      database,
      metrics,
      recentErrors,
      recommendations,
    };

    structuredLogger.info('Diagnostic report generated', { reportId: report.id });
    return report;
  }

  /**
   * Get system diagnostics
   */
  private async getSystemDiagnostics(): Promise<SystemDiagnostics> {
    const cpus = os.cpus();
    const memInfo = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();

    // Calculate CPU usage (simplified)
    const cpuUsage = cpus.reduce((acc, cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      const idle = cpu.times.idle;
      return acc + ((total - idle) / total) * 100;
    }, 0) / cpus.length;

    return {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      uptime: os.uptime(),
      memory: {
        total: totalMem,
        used: totalMem - freeMem,
        free: freeMem,
        heapTotal: memInfo.heapTotal,
        heapUsed: memInfo.heapUsed,
        external: memInfo.external,
      },
      cpu: {
        cores: cpus.length,
        model: cpus[0]?.model || 'Unknown',
        usage: Math.round(cpuUsage * 100) / 100,
      },
    };
  }

  /**
   * Get application diagnostics
   */
  private async getApplicationDiagnostics(): Promise<ApplicationDiagnostics> {
    const uptime = Date.now() - appStartTime.getTime();
    const uptimeMinutes = uptime / 60000;
    const requestsPerMinute = uptimeMinutes > 0 ? this.requestCount / uptimeMinutes : 0;
    const averageResponseTime = this.requestCount > 0 ? this.totalResponseTime / this.requestCount : 0;
    const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;

    return {
      version: process.env.npm_package_version || '1.0.0',
      environment: config.nodeEnv,
      startTime: appStartTime,
      uptime: Math.floor(uptime / 1000),
      activeConnections: this.activeConnections,
      requestsPerMinute: Math.round(requestsPerMinute * 100) / 100,
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
    };
  }

  /**
   * Get database diagnostics
   */
  private async getDatabaseDiagnostics(): Promise<DatabaseDiagnostics> {
    // These would be populated by actual database health checks
    // For now, return placeholder values that can be updated by actual checks
    return {
      postgresql: {
        connected: true,
        latency: 0,
        activeConnections: 0,
        poolSize: 10,
      },
      mongodb: {
        connected: true,
        latency: 0,
        collections: 0,
      },
      redis: {
        connected: true,
        latency: 0,
        memoryUsage: 0,
        connectedClients: 0,
      },
    };
  }

  /**
   * Get metrics summary
   */
  private async getMetricsSummary(): Promise<MetricsSummary> {
    // These would be populated from actual Prometheus metrics
    return {
      httpRequests: {
        total: this.requestCount,
        byStatus: {},
        byMethod: {},
      },
      transformations: {
        total: 0,
        successful: 0,
        failed: 0,
        averageDuration: 0,
      },
      detections: {
        total: 0,
        averageScore: 0,
      },
    };
  }

  /**
   * Get recent errors
   */
  private getRecentErrors(): ErrorSummary[] {
    const errors: ErrorSummary[] = [];
    
    errorTracker.forEach((value, key) => {
      errors.push({
        timestamp: value.lastOccurrence,
        message: key,
        count: value.count,
        lastOccurrence: value.lastOccurrence,
        stack: value.stack,
      });
    });

    // Sort by count descending and take top 10
    return errors
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * Generate recommendations based on diagnostics
   */
  private generateRecommendations(
    system: SystemDiagnostics,
    application: ApplicationDiagnostics,
    database: DatabaseDiagnostics,
    metrics: MetricsSummary
  ): string[] {
    const recommendations: string[] = [];

    // Memory recommendations
    const memoryUsagePercent = (system.memory.used / system.memory.total) * 100;
    if (memoryUsagePercent > 80) {
      recommendations.push(
        `High memory usage detected (${memoryUsagePercent.toFixed(1)}%). Consider scaling up or optimizing memory usage.`
      );
    }

    const heapUsagePercent = (system.memory.heapUsed / system.memory.heapTotal) * 100;
    if (heapUsagePercent > 85) {
      recommendations.push(
        `High heap usage detected (${heapUsagePercent.toFixed(1)}%). Consider increasing Node.js heap size or investigating memory leaks.`
      );
    }

    // CPU recommendations
    if (system.cpu.usage > 80) {
      recommendations.push(
        `High CPU usage detected (${system.cpu.usage.toFixed(1)}%). Consider scaling horizontally or optimizing CPU-intensive operations.`
      );
    }

    // Response time recommendations
    if (application.averageResponseTime > 1000) {
      recommendations.push(
        `High average response time (${application.averageResponseTime.toFixed(0)}ms). Consider optimizing slow endpoints or adding caching.`
      );
    }

    // Error rate recommendations
    if (application.errorRate > 5) {
      recommendations.push(
        `High error rate detected (${application.errorRate.toFixed(1)}%). Investigate recent errors and implement fixes.`
      );
    }

    // Database recommendations
    if (!database.postgresql.connected) {
      recommendations.push('PostgreSQL connection is down. Check database server status and connection settings.');
    }
    if (!database.mongodb.connected) {
      recommendations.push('MongoDB connection is down. Check database server status and connection settings.');
    }
    if (!database.redis.connected) {
      recommendations.push('Redis connection is down. Check Redis server status and connection settings.');
    }

    if (recommendations.length === 0) {
      recommendations.push('All systems operating within normal parameters.');
    }

    return recommendations;
  }

  /**
   * Reset diagnostics counters
   */
  reset(): void {
    this.requestCount = 0;
    this.totalResponseTime = 0;
    this.errorCount = 0;
    errorTracker.clear();
  }
}

// Singleton instance
export const diagnosticsService = new DiagnosticsService();
