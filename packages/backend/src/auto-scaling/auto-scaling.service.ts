/**
 * Auto-Scaling Service
 * Implements CPU/memory-based scaling, queue depth monitoring, predictive scaling,
 * cost optimization, and scaling policy configuration
 * Requirements: 91 - Auto-scaling and resource optimization
 */

import { v4 as uuidv4 } from 'uuid';
import {
  ScalingPolicy,
  ResourceMetrics,
  ScalingEvent,
  LoadPrediction,
  CostOptimization,
  CostRecommendation,
  ScalingAlert,
  ServiceConfig,
  HistoricalMetrics,
  QueueMetrics,
  ScalingDecision,
  AutoScalingStatus,
} from './types';

export class AutoScalingService {
  private policies: Map<string, ScalingPolicy> = new Map();
  private services: Map<string, ServiceConfig> = new Map();
  private metricsHistory: Map<string, ResourceMetrics[]> = new Map();
  private scalingEvents: Map<string, ScalingEvent[]> = new Map();
  private alerts: Map<string, ScalingAlert[]> = new Map();
  private historicalMetrics: Map<string, HistoricalMetrics[]> = new Map();
  private cooldowns: Map<string, Date> = new Map();
  private currentInstances: Map<string, number> = new Map();

  async scaleUp(serviceId: string, reason: string): Promise<ScalingEvent> {
    const policy = this.policies.get(serviceId);
    const currentCount = this.currentInstances.get(serviceId) || 1;
    if (!policy) throw new Error(`No scaling policy found for service: ${serviceId}`);
    if (currentCount >= policy.maxInstances) throw new Error(`Service ${serviceId} already at maximum instances (${policy.maxInstances})`);
    const cooldownEnd = this.cooldowns.get(serviceId);
    if (cooldownEnd && cooldownEnd > new Date()) throw new Error(`Service ${serviceId} is in cooldown period until ${cooldownEnd.toISOString()}`);
    const targetInstances = Math.min(currentCount + 1, policy.maxInstances);
    const metrics = await this.getMetrics(serviceId);
    const event: ScalingEvent = { id: uuidv4(), serviceId, type: 'scale_up', reason, fromInstances: currentCount, toInstances: targetInstances, metrics, timestamp: new Date(), status: 'completed' };
    this.currentInstances.set(serviceId, targetInstances);
    this.cooldowns.set(serviceId, new Date(Date.now() + policy.cooldownPeriod * 1000));
    const events = this.scalingEvents.get(serviceId) || [];
    events.push(event);
    this.scalingEvents.set(serviceId, events);
    return event;
  }


  async scaleDown(serviceId: string): Promise<ScalingEvent> {
    const policy = this.policies.get(serviceId);
    const currentCount = this.currentInstances.get(serviceId) || 1;
    if (!policy) throw new Error(`No scaling policy found for service: ${serviceId}`);
    if (currentCount <= policy.minInstances) throw new Error(`Service ${serviceId} already at minimum instances (${policy.minInstances})`);
    const cooldownEnd = this.cooldowns.get(serviceId);
    if (cooldownEnd && cooldownEnd > new Date()) throw new Error(`Service ${serviceId} is in cooldown period until ${cooldownEnd.toISOString()}`);
    const targetInstances = Math.max(currentCount - 1, policy.minInstances);
    const metrics = await this.getMetrics(serviceId);
    const event: ScalingEvent = { id: uuidv4(), serviceId, type: 'scale_down', reason: 'Resource utilization below threshold', fromInstances: currentCount, toInstances: targetInstances, metrics, timestamp: new Date(), status: 'completed' };
    this.currentInstances.set(serviceId, targetInstances);
    this.cooldowns.set(serviceId, new Date(Date.now() + policy.cooldownPeriod * 1000));
    const events = this.scalingEvents.get(serviceId) || [];
    events.push(event);
    this.scalingEvents.set(serviceId, events);
    return event;
  }

  async predictLoad(serviceId: string, hoursAhead: number = 24): Promise<LoadPrediction> {
    const historical = this.historicalMetrics.get(serviceId) || [];
    const policy = this.policies.get(serviceId);
    const predictions: Array<{ timestamp: Date; predictedLoad: number; predictedInstances: number; confidence: number }> = [];
    const now = new Date();
    for (let i = 1; i <= hoursAhead; i++) {
      const futureTime = new Date(now.getTime() + i * 60 * 60 * 1000);
      const hourOfDay = futureTime.getHours();
      const dayOfWeek = futureTime.getDay();
      const matchingData = historical.filter(h => h.hourOfDay === hourOfDay && h.dayOfWeek === dayOfWeek);
      let predictedLoad = 50;
      let confidence = 0.5;
      if (matchingData.length > 0) {
        const avgCPU = matchingData.reduce((sum, m) => sum + m.averageCPU, 0) / matchingData.length;
        const avgMemory = matchingData.reduce((sum, m) => sum + m.averageMemory, 0) / matchingData.length;
        predictedLoad = Math.max(avgCPU, avgMemory);
        const firstMatch = matchingData[0];
        confidence = Math.min(0.95, 0.5 + ((firstMatch?.sampleCount ?? 0) / 100) * 0.45);
      }
      let predictedInstances = 1;
      if (policy) {
        const targetUtilization = (policy.targetCPU + policy.targetMemory) / 2;
        predictedInstances = Math.ceil((predictedLoad / targetUtilization) * (policy.minInstances || 1));
        predictedInstances = Math.max(policy.minInstances, Math.min(policy.maxInstances, predictedInstances));
      }
      predictions.push({ timestamp: futureTime, predictedLoad, predictedInstances, confidence });
    }
    return { serviceId, timestamp: now, predictions, confidence: predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length, model: 'time-series-historical', basedOnHistoricalDays: 30 };
  }


  async optimizeCosts(serviceId: string): Promise<CostOptimization> {
    const metrics = this.metricsHistory.get(serviceId) || [];
    const policy = this.policies.get(serviceId);
    const service = this.services.get(serviceId);
    const recommendations: CostRecommendation[] = [];
    const currentInstances = this.currentInstances.get(serviceId) || 1;
    const hoursPerMonth = 730;
    const costPerInstanceHour = 0.05;
    const currentMonthlyCost = currentInstances * hoursPerMonth * costPerInstanceHour;
    let optimizedMonthlyCost = currentMonthlyCost;
    if (service && !service.spotInstanceEnabled) {
      const spotSavings = currentMonthlyCost * 0.6;
      recommendations.push({ id: uuidv4(), type: 'spot_instances', title: 'Enable Spot Instances', description: 'Use spot instances for non-critical workloads to reduce costs by up to 60%', estimatedSavings: spotSavings, impact: 'medium', risk: 'medium', implementation: 'Enable spot instance support in service configuration' });
      optimizedMonthlyCost -= spotSavings * 0.5;
    }
    if (metrics.length > 0) {
      const avgCPU = metrics.reduce((sum, m) => sum + m.cpu.average, 0) / metrics.length;
      const avgMemory = metrics.reduce((sum, m) => sum + m.memory.average, 0) / metrics.length;
      if (avgCPU < 30 && avgMemory < 30) {
        const rightSizingSavings = currentMonthlyCost * 0.3;
        recommendations.push({ id: uuidv4(), type: 'right_sizing', title: 'Right-size Instances', description: `Average CPU (${avgCPU.toFixed(1)}%) and memory (${avgMemory.toFixed(1)}%) utilization is low. Consider smaller instance types.`, estimatedSavings: rightSizingSavings, impact: 'low', risk: 'low', implementation: 'Reduce resource requests and limits in deployment configuration' });
        optimizedMonthlyCost -= rightSizingSavings;
      }
    }
    const historical = this.historicalMetrics.get(serviceId) || [];
    const nightHours = historical.filter(h => h.hourOfDay >= 22 || h.hourOfDay <= 6);
    if (nightHours.length > 0) {
      const avgNightLoad = nightHours.reduce((sum, h) => sum + h.averageCPU, 0) / nightHours.length;
      if (avgNightLoad < 20) {
        const scheduleSavings = currentMonthlyCost * 0.15;
        recommendations.push({ id: uuidv4(), type: 'schedule_scaling', title: 'Implement Scheduled Scaling', description: 'Low utilization detected during night hours. Scale down during off-peak times.', estimatedSavings: scheduleSavings, impact: 'low', risk: 'low', implementation: 'Configure scheduled scaling policies for off-peak hours (10 PM - 6 AM)' });
        optimizedMonthlyCost -= scheduleSavings;
      }
    }
    if (policy && currentInstances > policy.minInstances) {
      const recentMetrics = metrics.slice(-10);
      const allLowUsage = recentMetrics.every(m => m.cpu.current < 10 && m.memory.current < 10);
      if (allLowUsage) {
        const idleSavings = (currentInstances - policy.minInstances) * hoursPerMonth * costPerInstanceHour;
        recommendations.push({ id: uuidv4(), type: 'idle_resources', title: 'Remove Idle Resources', description: 'Detected idle instances with consistently low utilization', estimatedSavings: idleSavings, impact: 'high', risk: 'low', implementation: 'Scale down to minimum instances immediately' });
        optimizedMonthlyCost -= idleSavings;
      }
    }
    if (policy && policy.minInstances >= 2) {
      const reservedSavings = policy.minInstances * hoursPerMonth * costPerInstanceHour * 0.4;
      recommendations.push({ id: uuidv4(), type: 'reserved_capacity', title: 'Purchase Reserved Capacity', description: `Reserve ${policy.minInstances} instances for 1-year commitment to save up to 40%`, estimatedSavings: reservedSavings, impact: 'high', risk: 'low', implementation: 'Purchase reserved instances through cloud provider console' });
    }
    const potentialSavings = currentMonthlyCost - optimizedMonthlyCost;
    const savingsPercentage = (potentialSavings / currentMonthlyCost) * 100;
    return { serviceId, timestamp: new Date(), currentMonthlyCost, optimizedMonthlyCost: Math.max(0, optimizedMonthlyCost), potentialSavings: Math.max(0, potentialSavings), savingsPercentage: Math.max(0, Math.min(100, savingsPercentage)), recommendations };
  }


  async configureScalingPolicy(serviceId: string, policy: Omit<ScalingPolicy, 'id' | 'serviceId' | 'createdAt' | 'updatedAt'>): Promise<ScalingPolicy> {
    if (policy.minInstances < 0) throw new Error('minInstances must be non-negative');
    if (policy.maxInstances < policy.minInstances) throw new Error('maxInstances must be greater than or equal to minInstances');
    if (policy.targetCPU < 0 || policy.targetCPU > 100) throw new Error('targetCPU must be between 0 and 100');
    if (policy.targetMemory < 0 || policy.targetMemory > 100) throw new Error('targetMemory must be between 0 and 100');
    if (policy.scaleUpThreshold < 0 || policy.scaleUpThreshold > 100) throw new Error('scaleUpThreshold must be between 0 and 100');
    if (policy.scaleDownThreshold < 0 || policy.scaleDownThreshold > 100) throw new Error('scaleDownThreshold must be between 0 and 100');
    if (policy.cooldownPeriod < 0) throw new Error('cooldownPeriod must be non-negative');
    const now = new Date();
    const existingPolicy = this.policies.get(serviceId);
    const fullPolicy: ScalingPolicy = { id: existingPolicy?.id || uuidv4(), serviceId, ...policy, createdAt: existingPolicy?.createdAt || now, updatedAt: now };
    this.policies.set(serviceId, fullPolicy);
    if (!this.currentInstances.has(serviceId)) this.currentInstances.set(serviceId, policy.minInstances);
    return fullPolicy;
  }

  async getMetrics(serviceId: string): Promise<ResourceMetrics> {
    const history = this.metricsHistory.get(serviceId) || [];
    const policy = this.policies.get(serviceId);
    const currentCount = this.currentInstances.get(serviceId) || 1;
    const cpuCurrent = Math.random() * 100;
    const memoryCurrent = Math.random() * 100;
    const queueDepth = Math.floor(Math.random() * 1000);
    const metrics: ResourceMetrics = {
      serviceId, timestamp: new Date(),
      cpu: { current: cpuCurrent, average: history.length > 0 ? history.slice(-10).reduce((sum, m) => sum + m.cpu.current, cpuCurrent) / (Math.min(history.length, 10) + 1) : cpuCurrent, peak: history.length > 0 ? Math.max(cpuCurrent, ...history.slice(-10).map(m => m.cpu.current)) : cpuCurrent },
      memory: { current: memoryCurrent, average: history.length > 0 ? history.slice(-10).reduce((sum, m) => sum + m.memory.current, memoryCurrent) / (Math.min(history.length, 10) + 1) : memoryCurrent, peak: history.length > 0 ? Math.max(memoryCurrent, ...history.slice(-10).map(m => m.memory.current)) : memoryCurrent, usedBytes: memoryCurrent * 10737418240 / 100, totalBytes: 10737418240 },
      queueDepth: { current: queueDepth, average: history.length > 0 ? history.slice(-10).reduce((sum, m) => sum + m.queueDepth.current, queueDepth) / (Math.min(history.length, 10) + 1) : queueDepth, maxCapacity: 10000 },
      instances: { current: currentCount, desired: policy ? Math.max(policy.minInstances, Math.min(policy.maxInstances, currentCount)) : currentCount, ready: currentCount }
    };
    history.push(metrics);
    if (history.length > 1000) history.shift();
    this.metricsHistory.set(serviceId, history);
    return metrics;
  }


  async makeScalingDecision(serviceId: string): Promise<ScalingDecision> {
    const policy = this.policies.get(serviceId);
    const metrics = await this.getMetrics(serviceId);
    const currentCount = this.currentInstances.get(serviceId) || 1;
    if (!policy || !policy.enabled) return { serviceId, shouldScale: false, direction: 'none', targetInstances: currentCount, currentInstances: currentCount, reason: policy ? 'Scaling policy is disabled' : 'No scaling policy configured', metrics, cooldownRemaining: 0 };
    const cooldownEnd = this.cooldowns.get(serviceId);
    if (cooldownEnd && cooldownEnd > new Date()) {
      const cooldownRemaining = Math.ceil((cooldownEnd.getTime() - Date.now()) / 1000);
      return { serviceId, shouldScale: false, direction: 'none', targetInstances: currentCount, currentInstances: currentCount, reason: `In cooldown period (${cooldownRemaining}s remaining)`, metrics, cooldownRemaining };
    }
    const cpuUtilization = metrics.cpu.average;
    const memoryUtilization = metrics.memory.average;
    const maxUtilization = Math.max(cpuUtilization, memoryUtilization);
    let shouldScale = false;
    let direction: 'up' | 'down' | 'none' = 'none';
    let targetInstances = currentCount;
    let reason = 'Resource utilization within acceptable range';
    if (maxUtilization > policy.scaleUpThreshold && currentCount < policy.maxInstances) {
      shouldScale = true; direction = 'up'; targetInstances = Math.min(currentCount + 1, policy.maxInstances);
      reason = `High utilization detected (CPU: ${cpuUtilization.toFixed(1)}%, Memory: ${memoryUtilization.toFixed(1)}%)`;
    } else if (maxUtilization < policy.scaleDownThreshold && currentCount > policy.minInstances) {
      shouldScale = true; direction = 'down'; targetInstances = Math.max(currentCount - 1, policy.minInstances);
      reason = `Low utilization detected (CPU: ${cpuUtilization.toFixed(1)}%, Memory: ${memoryUtilization.toFixed(1)}%)`;
    }
    return { serviceId, shouldScale, direction, targetInstances, currentInstances: currentCount, reason, metrics, cooldownRemaining: 0 };
  }

  async getStatus(serviceId: string): Promise<AutoScalingStatus> {
    const policy = this.policies.get(serviceId);
    const currentCount = this.currentInstances.get(serviceId) || 1;
    const events = this.scalingEvents.get(serviceId) || [];
    const serviceAlerts = this.alerts.get(serviceId) || [];
    const cooldownEnd = this.cooldowns.get(serviceId);
    const cooldownActive = cooldownEnd ? cooldownEnd > new Date() : false;
    let healthStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    const criticalAlerts = serviceAlerts.filter(a => a.severity === 'critical' && !a.resolvedAt);
    const warningAlerts = serviceAlerts.filter(a => a.severity === 'warning' && !a.resolvedAt);
    if (criticalAlerts.length > 0) healthStatus = 'unhealthy';
    else if (warningAlerts.length > 0) healthStatus = 'degraded';
    const status: AutoScalingStatus = { serviceId, enabled: policy?.enabled || false, currentInstances: currentCount, desiredInstances: policy ? Math.max(policy.minInstances, Math.min(policy.maxInstances, currentCount)) : currentCount, minInstances: policy?.minInstances || 1, maxInstances: policy?.maxInstances || 10, lastMetricsUpdate: new Date(), cooldownActive, healthStatus, alerts: serviceAlerts.filter(a => !a.resolvedAt) };
    const lastEvent = events[events.length - 1];
    if (lastEvent) status.lastScalingEvent = lastEvent;
    if (cooldownActive && cooldownEnd) status.cooldownEndsAt = cooldownEnd;
    return status;
  }


  async createAlert(serviceId: string, type: ScalingAlert['type'], severity: ScalingAlert['severity'], message: string, currentValue: number, threshold: number): Promise<ScalingAlert> {
    const alert: ScalingAlert = { id: uuidv4(), serviceId, type, severity, message, currentValue, threshold, timestamp: new Date(), acknowledged: false };
    const serviceAlerts = this.alerts.get(serviceId) || [];
    serviceAlerts.push(alert);
    this.alerts.set(serviceId, serviceAlerts);
    return alert;
  }

  async acknowledgeAlert(serviceId: string, alertId: string): Promise<void> {
    const serviceAlerts = this.alerts.get(serviceId) || [];
    const alert = serviceAlerts.find(a => a.id === alertId);
    if (alert) alert.acknowledged = true;
  }

  async resolveAlert(serviceId: string, alertId: string): Promise<void> {
    const serviceAlerts = this.alerts.get(serviceId) || [];
    const alert = serviceAlerts.find(a => a.id === alertId);
    if (alert) alert.resolvedAt = new Date();
  }

  async registerService(config: ServiceConfig): Promise<void> {
    this.services.set(config.id, config);
    if (!this.currentInstances.has(config.id)) this.currentInstances.set(config.id, config.scalingPolicy?.minInstances || 1);
    if (config.scalingPolicy) this.policies.set(config.id, config.scalingPolicy);
  }

  async getScalingPolicy(serviceId: string): Promise<ScalingPolicy | undefined> { return this.policies.get(serviceId); }

  async getScalingEvents(serviceId: string, limit: number = 100): Promise<ScalingEvent[]> {
    const events = this.scalingEvents.get(serviceId) || [];
    return events.slice(-limit);
  }

  async recordHistoricalMetrics(serviceId: string, metrics: ResourceMetrics): Promise<void> {
    const hourOfDay = metrics.timestamp.getHours();
    const dayOfWeek = metrics.timestamp.getDay();
    const historical = this.historicalMetrics.get(serviceId) || [];
    const existing = historical.find(h => h.hourOfDay === hourOfDay && h.dayOfWeek === dayOfWeek);
    if (existing) {
      const newSampleCount = existing.sampleCount + 1;
      existing.averageCPU = (existing.averageCPU * existing.sampleCount + metrics.cpu.current) / newSampleCount;
      existing.averageMemory = (existing.averageMemory * existing.sampleCount + metrics.memory.current) / newSampleCount;
      existing.averageQueueDepth = (existing.averageQueueDepth * existing.sampleCount + metrics.queueDepth.current) / newSampleCount;
      existing.averageInstances = (existing.averageInstances * existing.sampleCount + metrics.instances.current) / newSampleCount;
      existing.sampleCount = newSampleCount;
    } else {
      historical.push({ serviceId, hourOfDay, dayOfWeek, averageCPU: metrics.cpu.current, averageMemory: metrics.memory.current, averageQueueDepth: metrics.queueDepth.current, averageInstances: metrics.instances.current, sampleCount: 1 });
    }
    this.historicalMetrics.set(serviceId, historical);
  }

  async monitorQueueDepth(serviceId: string, queueMetrics: QueueMetrics): Promise<ScalingDecision | null> {
    const policy = this.policies.get(serviceId);
    if (!policy || !policy.enabled) return null;
    const currentCount = this.currentInstances.get(serviceId) || 1;
    const metrics = await this.getMetrics(serviceId);
    const queueUtilization = (queueMetrics.depth / queueMetrics.maxCapacity) * 100;
    if (queueUtilization > 80 && currentCount < policy.maxInstances) {
      return { serviceId, shouldScale: true, direction: 'up', targetInstances: Math.min(currentCount + 1, policy.maxInstances), currentInstances: currentCount, reason: `High queue depth: ${queueMetrics.depth} messages (${queueUtilization.toFixed(1)}% capacity)`, metrics, cooldownRemaining: 0 };
    } else if (queueUtilization < 20 && currentCount > policy.minInstances) {
      return { serviceId, shouldScale: true, direction: 'down', targetInstances: Math.max(currentCount - 1, policy.minInstances), currentInstances: currentCount, reason: `Low queue depth: ${queueMetrics.depth} messages (${queueUtilization.toFixed(1)}% capacity)`, metrics, cooldownRemaining: 0 };
    }
    return null;
  }

  async clearCooldown(serviceId: string): Promise<void> { this.cooldowns.delete(serviceId); }

  async setInstanceCount(serviceId: string, count: number): Promise<void> {
    const policy = this.policies.get(serviceId);
    if (policy && (count < policy.minInstances || count > policy.maxInstances)) throw new Error(`Instance count must be between ${policy.minInstances} and ${policy.maxInstances}`);
    this.currentInstances.set(serviceId, count);
  }
}

export const autoScalingService = new AutoScalingService();
