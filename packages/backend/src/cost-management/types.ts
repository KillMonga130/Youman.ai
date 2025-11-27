/**
 * Cost Management Types
 * Requirements: 99 - Cost tracking and optimization
 */

import { z } from 'zod';

// ============================================
// Enums
// ============================================

export enum CostCategory {
  COMPUTE = 'compute',
  STORAGE = 'storage',
  NETWORK = 'network',
  THIRD_PARTY = 'third_party',
  AI_MODELS = 'ai_models',
  DATABASE = 'database',
}

export enum ServiceType {
  TRANSFORMATION = 'transformation',
  DETECTION = 'detection',
  STORAGE = 'storage',
  API_GATEWAY = 'api_gateway',
  ANALYTICS = 'analytics',
  COLLABORATION = 'collaboration',
}

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

export enum TimePeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
}

// ============================================
// Validation Schemas
// ============================================

export const trackCostSchema = z.object({
  serviceId: z.string().min(1),
  category: z.nativeEnum(CostCategory),
  amount: z.number().positive(),
  currency: z.string().default('USD'),
  metadata: z.record(z.unknown()).optional(),
});

export const setBudgetSchema = z.object({
  name: z.string().min(1),
  amount: z.number().positive(),
  period: z.nativeEnum(TimePeriod),
  alertThresholds: z.array(z.number().min(0).max(100)).default([50, 75, 90, 100]),
  categories: z.array(z.nativeEnum(CostCategory)).optional(),
  services: z.array(z.nativeEnum(ServiceType)).optional(),
});

export const getCostReportSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  groupBy: z.enum(['service', 'category', 'customer', 'day', 'week', 'month']).optional(),
  customerId: z.string().optional(),
});

export const forecastCostSchema = z.object({
  period: z.nativeEnum(TimePeriod),
  includeOptimizations: z.boolean().default(false),
});

// ============================================
// Input Types
// ============================================

export type TrackCostInput = z.infer<typeof trackCostSchema>;
export type SetBudgetInput = z.infer<typeof setBudgetSchema>;
export type GetCostReportInput = z.infer<typeof getCostReportSchema>;
export type ForecastCostInput = z.infer<typeof forecastCostSchema>;


// ============================================
// Response Types
// ============================================

export interface CostRecord {
  id: string;
  serviceId: string;
  category: CostCategory;
  amount: number;
  currency: string;
  customerId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface CostAllocation {
  customerId: string;
  totalCost: number;
  currency: string;
  period: {
    start: Date;
    end: Date;
  };
  breakdown: {
    compute: number;
    storage: number;
    network: number;
    thirdParty: number;
    aiModels: number;
    database: number;
  };
  byService: Record<string, number>;
}

export interface CostForecast {
  period: TimePeriod;
  projectedCost: number;
  currency: string;
  confidence: number;
  breakdown: {
    category: CostCategory;
    projected: number;
    trend: 'up' | 'down' | 'stable';
    changePercent: number;
  }[];
  assumptions: string[];
  generatedAt: Date;
}

export interface CostOptimization {
  id: string;
  title: string;
  description: string;
  category: CostCategory;
  potentialSavings: number;
  currency: string;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  recommendation: string;
  resourceId?: string;
  createdAt: Date;
}

export interface Budget {
  id: string;
  name: string;
  amount: number;
  currency: string;
  period: TimePeriod;
  alertThresholds: number[];
  categories?: CostCategory[];
  services?: ServiceType[];
  currentSpend: number;
  percentUsed: number;
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetAlert {
  id: string;
  budgetId: string;
  budgetName: string;
  threshold: number;
  currentSpend: number;
  budgetAmount: number;
  percentUsed: number;
  severity: AlertSeverity;
  message: string;
  acknowledged: boolean;
  createdAt: Date;
}

export interface CostBenchmark {
  industry: string;
  category: CostCategory;
  averageCost: number;
  yourCost: number;
  percentile: number;
  comparison: 'below' | 'average' | 'above';
  recommendations: string[];
}

export interface CostReport {
  period: {
    start: Date;
    end: Date;
  };
  totalCost: number;
  currency: string;
  byCategory: Record<CostCategory, number>;
  byService: Record<string, number>;
  byCustomer?: Record<string, number>;
  dailyBreakdown: {
    date: Date;
    cost: number;
  }[];
  trends: {
    category: CostCategory;
    currentPeriod: number;
    previousPeriod: number;
    changePercent: number;
    trend: 'up' | 'down' | 'stable';
  }[];
  topCostDrivers: {
    name: string;
    cost: number;
    percentOfTotal: number;
  }[];
}

export interface CostSummary {
  currentMonth: {
    total: number;
    byCategory: Record<CostCategory, number>;
  };
  previousMonth: {
    total: number;
    byCategory: Record<CostCategory, number>;
  };
  monthOverMonthChange: number;
  yearToDate: number;
  budgetStatus: {
    budgetId: string;
    name: string;
    percentUsed: number;
    remaining: number;
  }[];
  activeAlerts: BudgetAlert[];
  optimizations: CostOptimization[];
}

export interface UnderutilizedResource {
  resourceId: string;
  resourceType: string;
  name: string;
  utilizationPercent: number;
  monthlyCost: number;
  recommendation: string;
  potentialSavings: number;
}
