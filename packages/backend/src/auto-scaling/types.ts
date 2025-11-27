/**
 * Auto-Scaling Types
 * Type definitions for auto-scaling, resource management, and cost optimization
 * Requirements: 91 - Auto-scaling and resource optimization
 */

// Scaling policy configuration
export interface ScalingPolicy {
  id: string;
  serviceId: string;
  name: string;
  minInstances: number;
  maxInstances: number;
  targetCPU: number;
  targetMemory: number;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
  cooldownPeriod: number; // seconds
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Resource metrics for scaling decisions
export interface ResourceMetrics {
  serviceId: string;
  timestamp: Date;
  cpu: {
    current: number; // percentage 0-100
    average: number;
    peak: number;
  };
  memory: {
    current: number; // percentage 0-100
    average: number;
    peak: number;
    usedBytes: number;
    totalBytes: number;
  };
  queueDepth: {
    current: number;
    average: number;
    maxCapacity: number;
  };
  instances: {
    current: number;
    desired: number;
    ready: number;
  };
}

// Scaling event for audit logging
export interface ScalingEvent {
  id: string;
  serviceId: string;
  type: 'scale_up' | 'scale_down' | 'scale_out' | 'scale_in';
  reason: string;
  fromInstances: number;
  toInstances: number;
  metrics: ResourceMetrics;
  timestamp: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  error?: string;
}

// Load prediction for predictive scaling
export interface LoadPrediction {
  serviceId: string;
  timestamp: Date;
  predictions: PredictionPoint[];
  confidence: number; // 0-1
  model: string;
  basedOnHistoricalDays: number;
}

export interface PredictionPoint {
  timestamp: Date;
  predictedLoad: number; // percentage 0-100
  predictedInstances: number;
  confidence: number;
}

// Cost optimization recommendations
export interface CostOptimization {
  serviceId: string;
  timestamp: Date;
  currentMonthlyCost: number;
  optimizedMonthlyCost: number;
  potentialSavings: number;
  savingsPercentage: number;
  recommendations: CostRecommendation[];
}

export interface CostRecommendation {
  id: string;
  type: 'spot_instances' | 'reserved_capacity' | 'right_sizing' | 'schedule_scaling' | 'idle_resources';
  title: string;
  description: string;
  estimatedSavings: number;
  impact: 'low' | 'medium' | 'high';
  risk: 'low' | 'medium' | 'high';
  implementation: string;
}

// Alert for resource limits
export interface ScalingAlert {
  id: string;
  serviceId: string;
  type: 'cpu_high' | 'memory_high' | 'queue_depth_high' | 'approaching_limit' | 'scaling_failed';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  currentValue: number;
  threshold: number;
  timestamp: Date;
  acknowledged: boolean;
  resolvedAt?: Date;
}

// Service configuration for auto-scaling
export interface ServiceConfig {
  id: string;
  name: string;
  namespace: string;
  deploymentName: string;
  containerName: string;
  resourceRequests: {
    cpu: string;
    memory: string;
  };
  resourceLimits: {
    cpu: string;
    memory: string;
  };
  scalingPolicy?: ScalingPolicy;
  spotInstanceEnabled: boolean;
  reservedCapacity: number;
}

// Historical metrics for predictive scaling
export interface HistoricalMetrics {
  serviceId: string;
  hourOfDay: number;
  dayOfWeek: number;
  averageCPU: number;
  averageMemory: number;
  averageQueueDepth: number;
  averageInstances: number;
  sampleCount: number;
}

// Queue metrics for queue-depth based scaling
export interface QueueMetrics {
  queueName: string;
  depth: number;
  oldestMessageAge: number; // seconds
  messagesPerSecond: number;
  processingRate: number;
  backlogTime: number; // estimated time to clear backlog
  maxCapacity: number; // maximum queue capacity
}

// Scaling decision result
export interface ScalingDecision {
  serviceId: string;
  shouldScale: boolean;
  direction: 'up' | 'down' | 'none';
  targetInstances: number;
  currentInstances: number;
  reason: string;
  metrics: ResourceMetrics;
  cooldownRemaining: number; // seconds
}

// Auto-scaling status
export interface AutoScalingStatus {
  serviceId: string;
  enabled: boolean;
  currentInstances: number;
  desiredInstances: number;
  minInstances: number;
  maxInstances: number;
  lastScalingEvent?: ScalingEvent;
  lastMetricsUpdate: Date;
  cooldownActive: boolean;
  cooldownEndsAt?: Date;
  healthStatus: 'healthy' | 'degraded' | 'unhealthy';
  alerts: ScalingAlert[];
}

// Request/Response types for API
export interface ConfigureScalingPolicyRequest {
  serviceId: string;
  policy: Omit<ScalingPolicy, 'id' | 'serviceId' | 'createdAt' | 'updatedAt'>;
}

export interface ScaleRequest {
  serviceId: string;
  targetInstances?: number;
  reason: string;
}

export interface GetMetricsRequest {
  serviceId: string;
  startTime?: Date;
  endTime?: Date;
  interval?: 'minute' | 'hour' | 'day';
}

export interface GetPredictionRequest {
  serviceId: string;
  hoursAhead?: number;
}
