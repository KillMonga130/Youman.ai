/**
 * Cost Management Service
 * Tracks costs by service, generates reports, forecasts, and optimization recommendations
 * 
 * Requirements: 99 - Cost tracking and optimization
 */

import { logger } from '../utils/logger';
import {
  CostCategory,
  ServiceType,
  TimePeriod,
  AlertSeverity,
  type TrackCostInput,
  type SetBudgetInput,
  type GetCostReportInput,
  type ForecastCostInput,
  type CostRecord,
  type CostAllocation,
  type CostForecast,
  type CostOptimization,
  type Budget,
  type BudgetAlert,
  type CostBenchmark,
  type CostReport,
  type CostSummary,
  type UnderutilizedResource,
} from './types';

// ============================================
// In-Memory Storage (Replace with database in production)
// ============================================

const costRecords: CostRecord[] = [];
const budgets: Map<string, Budget> = new Map();
const budgetAlerts: BudgetAlert[] = [];
let recordIdCounter = 1;
let budgetIdCounter = 1;
let alertIdCounter = 1;

// ============================================
// Error Classes
// ============================================

export class CostManagementError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'CostManagementError';
    this.code = code;
  }
}

// ============================================
// Helper Functions
// ============================================

function generateId(prefix: string, counter: number): string {
  return `${prefix}_${Date.now()}_${counter}`;
}


function getPeriodDates(period: TimePeriod): { start: Date; end: Date } {
  const now = new Date();
  let start: Date;
  let end: Date;

  switch (period) {
    case TimePeriod.DAILY:
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      break;
    case TimePeriod.WEEKLY:
      const dayOfWeek = now.getDay();
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 - dayOfWeek), 23, 59, 59, 999);
      break;
    case TimePeriod.MONTHLY:
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    case TimePeriod.QUARTERLY:
      const quarter = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), quarter * 3, 1);
      end = new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59, 999);
      break;
    case TimePeriod.YEARLY:
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;
  }

  return { start, end };
}

function getPreviousPeriodDates(period: TimePeriod): { start: Date; end: Date } {
  const current = getPeriodDates(period);
  const duration = current.end.getTime() - current.start.getTime();
  
  return {
    start: new Date(current.start.getTime() - duration - 1),
    end: new Date(current.start.getTime() - 1),
  };
}

function calculateTrend(current: number, previous: number): 'up' | 'down' | 'stable' {
  if (previous === 0) return current > 0 ? 'up' : 'stable';
  const changePercent = ((current - previous) / previous) * 100;
  if (changePercent > 5) return 'up';
  if (changePercent < -5) return 'down';
  return 'stable';
}

function calculateChangePercent(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100 * 100) / 100;
}

// ============================================
// Cost Tracking
// ============================================

/**
 * Track a cost event
 * Requirements: 99.1 - Track costs by service, feature, and customer
 */
export async function trackCost(
  input: TrackCostInput,
  customerId?: string
): Promise<CostRecord> {
  const record: CostRecord = {
    id: generateId('cost', recordIdCounter++),
    serviceId: input.serviceId,
    category: input.category,
    amount: input.amount,
    currency: input.currency || 'USD',
    createdAt: new Date(),
  };

  if (customerId) {
    record.customerId = customerId;
  }
  if (input.metadata) {
    record.metadata = input.metadata;
  }

  costRecords.push(record);

  logger.debug('Cost tracked', {
    id: record.id,
    serviceId: record.serviceId,
    category: record.category,
    amount: record.amount,
  });

  // Check budget alerts
  await checkBudgetAlerts();

  return record;
}

/**
 * Track costs for a specific service
 */
export async function trackServiceCost(
  serviceType: ServiceType,
  category: CostCategory,
  amount: number,
  customerId?: string,
  metadata?: Record<string, unknown>
): Promise<CostRecord> {
  return trackCost(
    {
      serviceId: serviceType,
      category,
      amount,
      currency: 'USD',
      metadata,
    },
    customerId
  );
}


// ============================================
// Cost Allocation
// ============================================

/**
 * Allocate costs to a customer
 * Requirements: 99.2 - Provide cost allocation reports
 */
export async function allocateCosts(
  customerId: string,
  startDate?: Date,
  endDate?: Date
): Promise<CostAllocation> {
  const start = startDate || getPeriodDates(TimePeriod.MONTHLY).start;
  const end = endDate || getPeriodDates(TimePeriod.MONTHLY).end;

  const customerRecords = costRecords.filter(
    (r) =>
      r.customerId === customerId &&
      r.createdAt >= start &&
      r.createdAt <= end
  );

  const breakdown = {
    compute: 0,
    storage: 0,
    network: 0,
    thirdParty: 0,
    aiModels: 0,
    database: 0,
  };

  const byService: Record<string, number> = {};

  for (const record of customerRecords) {
    // Aggregate by category
    switch (record.category) {
      case CostCategory.COMPUTE:
        breakdown.compute += record.amount;
        break;
      case CostCategory.STORAGE:
        breakdown.storage += record.amount;
        break;
      case CostCategory.NETWORK:
        breakdown.network += record.amount;
        break;
      case CostCategory.THIRD_PARTY:
        breakdown.thirdParty += record.amount;
        break;
      case CostCategory.AI_MODELS:
        breakdown.aiModels += record.amount;
        break;
      case CostCategory.DATABASE:
        breakdown.database += record.amount;
        break;
    }

    // Aggregate by service
    byService[record.serviceId] = (byService[record.serviceId] || 0) + record.amount;
  }

  const totalCost = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

  return {
    customerId,
    totalCost,
    currency: 'USD',
    period: { start, end },
    breakdown,
    byService,
  };
}

// ============================================
// Cost Forecasting
// ============================================

/**
 * Forecast future costs based on historical data
 * Requirements: 99.4 - Project future costs based on usage trends
 */
export async function forecastCosts(
  input: ForecastCostInput
): Promise<CostForecast> {
  const { period, includeOptimizations } = input;
  const currentPeriod = getPeriodDates(TimePeriod.MONTHLY);
  const previousPeriod = getPreviousPeriodDates(TimePeriod.MONTHLY);

  // Get current and previous period costs by category
  const currentCosts = getCostsByCategory(currentPeriod.start, currentPeriod.end);
  const previousCosts = getCostsByCategory(previousPeriod.start, previousPeriod.end);

  const breakdown: CostForecast['breakdown'] = [];
  let totalProjected = 0;

  for (const category of Object.values(CostCategory)) {
    const current = currentCosts[category] || 0;
    const previous = previousCosts[category] || 0;
    const trend = calculateTrend(current, previous);
    const changePercent = calculateChangePercent(current, previous);

    // Simple linear projection
    let projected = current;
    if (trend === 'up') {
      projected = current * (1 + Math.abs(changePercent) / 100);
    } else if (trend === 'down') {
      projected = current * (1 - Math.abs(changePercent) / 100 * 0.5); // Conservative estimate
    }

    // Apply period multiplier
    const periodMultiplier = getPeriodMultiplier(period);
    projected *= periodMultiplier;

    // Apply optimization savings if requested
    if (includeOptimizations) {
      const optimizations = await identifyOptimizations();
      const categorySavings = optimizations
        .filter((o) => o.category === category)
        .reduce((sum, o) => sum + o.potentialSavings, 0);
      projected = Math.max(0, projected - categorySavings * periodMultiplier);
    }

    breakdown.push({
      category,
      projected: Math.round(projected * 100) / 100,
      trend,
      changePercent,
    });

    totalProjected += projected;
  }

  return {
    period,
    projectedCost: Math.round(totalProjected * 100) / 100,
    currency: 'USD',
    confidence: calculateForecastConfidence(costRecords.length),
    breakdown,
    assumptions: [
      'Based on historical usage patterns',
      'Assumes consistent growth rate',
      includeOptimizations ? 'Includes potential optimization savings' : 'Does not include optimization savings',
    ],
    generatedAt: new Date(),
  };
}

function getCostsByCategory(start: Date, end: Date): Record<CostCategory, number> {
  const result: Record<string, number> = {};
  
  for (const category of Object.values(CostCategory)) {
    result[category] = 0;
  }

  const periodRecords = costRecords.filter(
    (r) => r.createdAt >= start && r.createdAt <= end
  );

  for (const record of periodRecords) {
    result[record.category] = (result[record.category] || 0) + record.amount;
  }

  return result as Record<CostCategory, number>;
}

function getPeriodMultiplier(period: TimePeriod): number {
  switch (period) {
    case TimePeriod.DAILY:
      return 1 / 30;
    case TimePeriod.WEEKLY:
      return 7 / 30;
    case TimePeriod.MONTHLY:
      return 1;
    case TimePeriod.QUARTERLY:
      return 3;
    case TimePeriod.YEARLY:
      return 12;
  }
}

function calculateForecastConfidence(dataPoints: number): number {
  // More data points = higher confidence
  if (dataPoints < 10) return 0.5;
  if (dataPoints < 50) return 0.65;
  if (dataPoints < 100) return 0.75;
  if (dataPoints < 500) return 0.85;
  return 0.9;
}


// ============================================
// Cost Optimization
// ============================================

/**
 * Identify cost optimization opportunities
 * Requirements: 99.3 - Identify underutilized resources and recommend cost-saving measures
 */
export async function identifyOptimizations(): Promise<CostOptimization[]> {
  const optimizations: CostOptimization[] = [];
  const { start, end } = getPeriodDates(TimePeriod.MONTHLY);

  // Analyze costs by category
  const categoryCosts = getCostsByCategory(start, end);
  const totalCost = Object.values(categoryCosts).reduce((sum, val) => sum + val, 0);

  // Check for high compute costs
  if (categoryCosts[CostCategory.COMPUTE] > totalCost * 0.4) {
    optimizations.push({
      id: generateId('opt', optimizations.length + 1),
      title: 'High Compute Costs',
      description: 'Compute costs represent over 40% of total spending',
      category: CostCategory.COMPUTE,
      potentialSavings: categoryCosts[CostCategory.COMPUTE] * 0.15,
      currency: 'USD',
      effort: 'medium',
      impact: 'high',
      recommendation: 'Consider using reserved instances or spot instances for non-critical workloads',
      createdAt: new Date(),
    });
  }

  // Check for high storage costs
  if (categoryCosts[CostCategory.STORAGE] > totalCost * 0.25) {
    optimizations.push({
      id: generateId('opt', optimizations.length + 1),
      title: 'High Storage Costs',
      description: 'Storage costs are above optimal threshold',
      category: CostCategory.STORAGE,
      potentialSavings: categoryCosts[CostCategory.STORAGE] * 0.2,
      currency: 'USD',
      effort: 'low',
      impact: 'medium',
      recommendation: 'Implement data lifecycle policies to archive or delete old data',
      createdAt: new Date(),
    });
  }

  // Check for high third-party API costs
  if (categoryCosts[CostCategory.THIRD_PARTY] > totalCost * 0.3) {
    optimizations.push({
      id: generateId('opt', optimizations.length + 1),
      title: 'High Third-Party API Costs',
      description: 'Third-party API costs are significant',
      category: CostCategory.THIRD_PARTY,
      potentialSavings: categoryCosts[CostCategory.THIRD_PARTY] * 0.1,
      currency: 'USD',
      effort: 'high',
      impact: 'medium',
      recommendation: 'Consider caching API responses or negotiating volume discounts',
      createdAt: new Date(),
    });
  }

  // Check for high AI model costs
  if (categoryCosts[CostCategory.AI_MODELS] > totalCost * 0.35) {
    optimizations.push({
      id: generateId('opt', optimizations.length + 1),
      title: 'High AI Model Costs',
      description: 'AI model inference costs are above optimal threshold',
      category: CostCategory.AI_MODELS,
      potentialSavings: categoryCosts[CostCategory.AI_MODELS] * 0.2,
      currency: 'USD',
      effort: 'medium',
      impact: 'high',
      recommendation: 'Consider using smaller models for simple tasks or implementing request batching',
      createdAt: new Date(),
    });
  }

  // General optimization: Right-sizing
  optimizations.push({
    id: generateId('opt', optimizations.length + 1),
    title: 'Resource Right-Sizing',
    description: 'Review and optimize resource allocation based on actual usage',
    category: CostCategory.COMPUTE,
    potentialSavings: totalCost * 0.05,
    currency: 'USD',
    effort: 'low',
    impact: 'medium',
    recommendation: 'Analyze resource utilization and downsize over-provisioned instances',
    createdAt: new Date(),
  });

  return optimizations;
}

/**
 * Get underutilized resources
 * Requirements: 99.3 - Identify underutilized resources
 */
export async function getUnderutilizedResources(): Promise<UnderutilizedResource[]> {
  // In production, this would query actual resource utilization metrics
  // For now, return simulated data
  return [
    {
      resourceId: 'instance-001',
      resourceType: 'compute',
      name: 'Worker Instance 1',
      utilizationPercent: 15,
      monthlyCost: 150,
      recommendation: 'Consider downsizing to a smaller instance type',
      potentialSavings: 75,
    },
    {
      resourceId: 'storage-001',
      resourceType: 'storage',
      name: 'Archive Storage',
      utilizationPercent: 25,
      monthlyCost: 200,
      recommendation: 'Move infrequently accessed data to cold storage',
      potentialSavings: 120,
    },
  ];
}


// ============================================
// Budget Management
// ============================================

/**
 * Set a budget with alert thresholds
 * Requirements: 99.5 - Enforce spending limits and alert when thresholds are exceeded
 */
export async function setBudget(input: SetBudgetInput): Promise<Budget> {
  const { start, end } = getPeriodDates(input.period);
  
  // Calculate current spend for this budget scope
  let currentSpend = 0;
  const periodRecords = costRecords.filter(
    (r) => r.createdAt >= start && r.createdAt <= end
  );

  for (const record of periodRecords) {
    const categoryMatch = !input.categories || input.categories.includes(record.category);
    const serviceMatch = !input.services || input.services.includes(record.serviceId as ServiceType);
    
    if (categoryMatch && serviceMatch) {
      currentSpend += record.amount;
    }
  }

  const budget: Budget = {
    id: generateId('budget', budgetIdCounter++),
    name: input.name,
    amount: input.amount,
    currency: 'USD',
    period: input.period,
    alertThresholds: input.alertThresholds || [50, 75, 90, 100],
    currentSpend,
    percentUsed: input.amount > 0 ? (currentSpend / input.amount) * 100 : 0,
    periodStart: start,
    periodEnd: end,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  if (input.categories) {
    budget.categories = input.categories;
  }
  if (input.services) {
    budget.services = input.services;
  }

  budgets.set(budget.id, budget);

  logger.info('Budget created', {
    id: budget.id,
    name: budget.name,
    amount: budget.amount,
    period: budget.period,
  });

  // Check if any thresholds are already exceeded
  await checkBudgetThresholds(budget);

  return budget;
}

/**
 * Get all budgets
 */
export async function getBudgets(): Promise<Budget[]> {
  return Array.from(budgets.values());
}

/**
 * Get a specific budget by ID
 */
export async function getBudget(budgetId: string): Promise<Budget | null> {
  return budgets.get(budgetId) || null;
}

/**
 * Update budget current spend
 */
async function updateBudgetSpend(budget: Budget): Promise<void> {
  const periodRecords = costRecords.filter(
    (r) => r.createdAt >= budget.periodStart && r.createdAt <= budget.periodEnd
  );

  let currentSpend = 0;
  for (const record of periodRecords) {
    const categoryMatch = !budget.categories || budget.categories.includes(record.category);
    const serviceMatch = !budget.services || budget.services.includes(record.serviceId as ServiceType);
    
    if (categoryMatch && serviceMatch) {
      currentSpend += record.amount;
    }
  }

  budget.currentSpend = currentSpend;
  budget.percentUsed = budget.amount > 0 ? (currentSpend / budget.amount) * 100 : 0;
  budget.updatedAt = new Date();
}

/**
 * Check budget thresholds and create alerts
 */
async function checkBudgetThresholds(budget: Budget): Promise<void> {
  for (const threshold of budget.alertThresholds) {
    if (budget.percentUsed >= threshold) {
      // Check if alert already exists for this threshold
      const existingAlert = budgetAlerts.find(
        (a) => a.budgetId === budget.id && a.threshold === threshold && !a.acknowledged
      );

      if (!existingAlert) {
        const severity = threshold >= 100 ? AlertSeverity.CRITICAL :
                        threshold >= 90 ? AlertSeverity.WARNING :
                        AlertSeverity.INFO;

        const alert: BudgetAlert = {
          id: generateId('alert', alertIdCounter++),
          budgetId: budget.id,
          budgetName: budget.name,
          threshold,
          currentSpend: budget.currentSpend,
          budgetAmount: budget.amount,
          percentUsed: budget.percentUsed,
          severity,
          message: `Budget "${budget.name}" has reached ${Math.round(budget.percentUsed)}% of the ${budget.amount} USD limit`,
          acknowledged: false,
          createdAt: new Date(),
        };

        budgetAlerts.push(alert);

        logger.warn('Budget alert triggered', {
          budgetId: budget.id,
          threshold,
          percentUsed: budget.percentUsed,
          severity,
        });
      }
    }
  }
}

/**
 * Check all budgets for alerts
 */
async function checkBudgetAlerts(): Promise<void> {
  for (const budget of budgets.values()) {
    await updateBudgetSpend(budget);
    await checkBudgetThresholds(budget);
  }
}

/**
 * Get active budget alerts
 */
export async function getBudgetAlerts(acknowledged?: boolean): Promise<BudgetAlert[]> {
  if (acknowledged === undefined) {
    return [...budgetAlerts];
  }
  return budgetAlerts.filter((a) => a.acknowledged === acknowledged);
}

/**
 * Acknowledge a budget alert
 */
export async function acknowledgeBudgetAlert(alertId: string): Promise<void> {
  const alert = budgetAlerts.find((a) => a.id === alertId);
  if (alert) {
    alert.acknowledged = true;
  }
}


// ============================================
// Cost Reporting
// ============================================

/**
 * Generate a cost report
 * Requirements: 99.2 - Provide cost allocation reports
 */
export async function getCostReport(input: GetCostReportInput): Promise<CostReport> {
  const { start, end } = input.startDate && input.endDate
    ? { start: new Date(input.startDate), end: new Date(input.endDate) }
    : getPeriodDates(TimePeriod.MONTHLY);

  const previousPeriod = getPreviousPeriodDates(TimePeriod.MONTHLY);

  // Filter records by period and optionally by customer
  let periodRecords = costRecords.filter(
    (r) => r.createdAt >= start && r.createdAt <= end
  );

  if (input.customerId) {
    periodRecords = periodRecords.filter((r) => r.customerId === input.customerId);
  }

  // Calculate totals by category
  const byCategory: Record<CostCategory, number> = {} as Record<CostCategory, number>;
  for (const category of Object.values(CostCategory)) {
    byCategory[category] = 0;
  }

  // Calculate totals by service
  const byService: Record<string, number> = {};

  // Calculate totals by customer
  const byCustomer: Record<string, number> = {};

  // Calculate daily breakdown
  const dailyMap = new Map<string, number>();

  for (const record of periodRecords) {
    byCategory[record.category] = (byCategory[record.category] || 0) + record.amount;
    byService[record.serviceId] = (byService[record.serviceId] || 0) + record.amount;
    
    if (record.customerId) {
      byCustomer[record.customerId] = (byCustomer[record.customerId] || 0) + record.amount;
    }

    const dateParts = record.createdAt.toISOString().split('T');
    const dateKey = dateParts[0] || record.createdAt.toISOString().substring(0, 10);
    dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + record.amount);
  }

  const totalCost = Object.values(byCategory).reduce((sum, val) => sum + val, 0);

  // Calculate daily breakdown array
  const dailyBreakdown = Array.from(dailyMap.entries())
    .map(([date, cost]) => ({ date: new Date(date), cost }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  // Calculate trends
  const previousCosts = getCostsByCategory(previousPeriod.start, previousPeriod.end);
  const trends = Object.values(CostCategory).map((category) => {
    const currentPeriodCost = byCategory[category] || 0;
    const previousPeriodCost = previousCosts[category] || 0;
    return {
      category,
      currentPeriod: currentPeriodCost,
      previousPeriod: previousPeriodCost,
      changePercent: calculateChangePercent(currentPeriodCost, previousPeriodCost),
      trend: calculateTrend(currentPeriodCost, previousPeriodCost),
    };
  });

  // Calculate top cost drivers
  const topCostDrivers = Object.entries(byService)
    .map(([name, cost]) => ({
      name,
      cost,
      percentOfTotal: totalCost > 0 ? (cost / totalCost) * 100 : 0,
    }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 5);

  const report: CostReport = {
    period: { start, end },
    totalCost,
    currency: 'USD',
    byCategory,
    byService,
    dailyBreakdown,
    trends,
    topCostDrivers,
  };

  if (Object.keys(byCustomer).length > 0) {
    report.byCustomer = byCustomer;
  }

  return report;
}

// ============================================
// Cost Benchmarking
// ============================================

/**
 * Benchmark costs against industry standards
 * Requirements: 99.6 - Benchmark infrastructure costs against industry standards
 */
export async function benchmarkCosts(industry: string): Promise<CostBenchmark[]> {
  const { start, end } = getPeriodDates(TimePeriod.MONTHLY);
  const currentCosts = getCostsByCategory(start, end);
  const totalCost = Object.values(currentCosts).reduce((sum, val) => sum + val, 0);

  // Industry benchmarks (simulated - in production, these would come from a database)
  const saasBenchmarks: Record<CostCategory, number> = {
    [CostCategory.COMPUTE]: 0.35,
    [CostCategory.STORAGE]: 0.15,
    [CostCategory.NETWORK]: 0.10,
    [CostCategory.THIRD_PARTY]: 0.15,
    [CostCategory.AI_MODELS]: 0.15,
    [CostCategory.DATABASE]: 0.10,
  };

  const enterpriseBenchmarks: Record<CostCategory, number> = {
    [CostCategory.COMPUTE]: 0.40,
    [CostCategory.STORAGE]: 0.20,
    [CostCategory.NETWORK]: 0.10,
    [CostCategory.THIRD_PARTY]: 0.10,
    [CostCategory.AI_MODELS]: 0.10,
    [CostCategory.DATABASE]: 0.10,
  };

  const startupBenchmarks: Record<CostCategory, number> = {
    [CostCategory.COMPUTE]: 0.30,
    [CostCategory.STORAGE]: 0.10,
    [CostCategory.NETWORK]: 0.05,
    [CostCategory.THIRD_PARTY]: 0.25,
    [CostCategory.AI_MODELS]: 0.20,
    [CostCategory.DATABASE]: 0.10,
  };

  const industryKey = industry.toLowerCase();
  let benchmarks: Record<CostCategory, number>;
  switch (industryKey) {
    case 'enterprise':
      benchmarks = enterpriseBenchmarks;
      break;
    case 'startup':
      benchmarks = startupBenchmarks;
      break;
    default:
      benchmarks = saasBenchmarks;
  }
  const results: CostBenchmark[] = [];

  for (const category of Object.values(CostCategory)) {
    const yourCost = currentCosts[category] || 0;
    const yourPercent = totalCost > 0 ? yourCost / totalCost : 0;
    const averagePercent = benchmarks[category] || 0;
    const averageCost = totalCost * averagePercent;

    let comparison: 'below' | 'average' | 'above';
    let percentile: number;

    if (yourPercent < averagePercent * 0.8) {
      comparison = 'below';
      percentile = 25;
    } else if (yourPercent > averagePercent * 1.2) {
      comparison = 'above';
      percentile = 75;
    } else {
      comparison = 'average';
      percentile = 50;
    }

    const recommendations: string[] = [];
    if (comparison === 'above') {
      recommendations.push(`Your ${category} costs are above industry average. Consider optimization.`);
    } else if (comparison === 'below') {
      recommendations.push(`Your ${category} costs are below industry average. Good job!`);
    }

    results.push({
      industry,
      category,
      averageCost: Math.round(averageCost * 100) / 100,
      yourCost: Math.round(yourCost * 100) / 100,
      percentile,
      comparison,
      recommendations,
    });
  }

  return results;
}


// ============================================
// Cost Summary
// ============================================

/**
 * Get a comprehensive cost summary
 */
export async function getCostSummary(): Promise<CostSummary> {
  const currentPeriod = getPeriodDates(TimePeriod.MONTHLY);
  const previousPeriod = getPreviousPeriodDates(TimePeriod.MONTHLY);

  const currentCosts = getCostsByCategory(currentPeriod.start, currentPeriod.end);
  const previousCosts = getCostsByCategory(previousPeriod.start, previousPeriod.end);

  const currentTotal = Object.values(currentCosts).reduce((sum, val) => sum + val, 0);
  const previousTotal = Object.values(previousCosts).reduce((sum, val) => sum + val, 0);

  // Calculate year-to-date
  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const yearCosts = getCostsByCategory(yearStart, new Date());
  const yearToDate = Object.values(yearCosts).reduce((sum, val) => sum + val, 0);

  // Get budget status
  const allBudgets = await getBudgets();
  const budgetStatus = allBudgets.map((b) => ({
    budgetId: b.id,
    name: b.name,
    percentUsed: b.percentUsed,
    remaining: Math.max(0, b.amount - b.currentSpend),
  }));

  // Get active alerts
  const activeAlerts = await getBudgetAlerts(false);

  // Get optimizations
  const optimizations = await identifyOptimizations();

  return {
    currentMonth: {
      total: currentTotal,
      byCategory: currentCosts,
    },
    previousMonth: {
      total: previousTotal,
      byCategory: previousCosts,
    },
    monthOverMonthChange: calculateChangePercent(currentTotal, previousTotal),
    yearToDate,
    budgetStatus,
    activeAlerts,
    optimizations,
  };
}

// ============================================
// Utility Functions for Testing
// ============================================

/**
 * Clear all cost data (for testing)
 */
export function clearCostData(): void {
  costRecords.length = 0;
  budgets.clear();
  budgetAlerts.length = 0;
  recordIdCounter = 1;
  budgetIdCounter = 1;
  alertIdCounter = 1;
}

/**
 * Get all cost records (for testing)
 */
export function getCostRecords(): CostRecord[] {
  return [...costRecords];
}
