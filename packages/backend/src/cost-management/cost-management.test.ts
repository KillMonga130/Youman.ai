/**
 * Cost Management Tests
 * Requirements: 99 - Cost tracking and optimization
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  trackCost,
  trackServiceCost,
  allocateCosts,
  forecastCosts,
  identifyOptimizations,
  getUnderutilizedResources,
  setBudget,
  getBudgets,
  getBudget,
  getBudgetAlerts,
  acknowledgeBudgetAlert,
  getCostReport,
  benchmarkCosts,
  getCostSummary,
  clearCostData,
  getCostRecords,
} from './cost-management.service';
import {
  CostCategory,
  ServiceType,
  TimePeriod,
  AlertSeverity,
} from './types';

describe('Cost Management Service', () => {
  beforeEach(() => {
    clearCostData();
  });

  describe('Cost Tracking', () => {
    it('should track a cost event', async () => {
      const record = await trackCost({
        serviceId: ServiceType.TRANSFORMATION,
        category: CostCategory.COMPUTE,
        amount: 100,
        currency: 'USD',
      });

      expect(record).toBeDefined();
      expect(record.id).toBeDefined();
      expect(record.serviceId).toBe(ServiceType.TRANSFORMATION);
      expect(record.category).toBe(CostCategory.COMPUTE);
      expect(record.amount).toBe(100);
      expect(record.currency).toBe('USD');
    });

    it('should track cost with customer ID', async () => {
      const record = await trackCost(
        {
          serviceId: ServiceType.STORAGE,
          category: CostCategory.STORAGE,
          amount: 50,
        },
        'customer-123'
      );

      expect(record.customerId).toBe('customer-123');
    });

    it('should track service cost using helper function', async () => {
      const record = await trackServiceCost(
        ServiceType.DETECTION,
        CostCategory.AI_MODELS,
        75,
        'customer-456'
      );

      expect(record.serviceId).toBe(ServiceType.DETECTION);
      expect(record.category).toBe(CostCategory.AI_MODELS);
      expect(record.amount).toBe(75);
      expect(record.customerId).toBe('customer-456');
    });

    it('should store multiple cost records', async () => {
      await trackCost({ serviceId: 'svc1', category: CostCategory.COMPUTE, amount: 100 });
      await trackCost({ serviceId: 'svc2', category: CostCategory.STORAGE, amount: 50 });
      await trackCost({ serviceId: 'svc3', category: CostCategory.NETWORK, amount: 25 });

      const records = getCostRecords();
      expect(records).toHaveLength(3);
    });
  });


  describe('Cost Allocation', () => {
    it('should allocate costs to a customer', async () => {
      const customerId = 'customer-123';
      
      await trackCost({ serviceId: 'svc1', category: CostCategory.COMPUTE, amount: 100 }, customerId);
      await trackCost({ serviceId: 'svc2', category: CostCategory.STORAGE, amount: 50 }, customerId);
      await trackCost({ serviceId: 'svc1', category: CostCategory.NETWORK, amount: 25 }, customerId);

      const allocation = await allocateCosts(customerId);

      expect(allocation.customerId).toBe(customerId);
      expect(allocation.totalCost).toBe(175);
      expect(allocation.breakdown.compute).toBe(100);
      expect(allocation.breakdown.storage).toBe(50);
      expect(allocation.breakdown.network).toBe(25);
      expect(allocation.byService['svc1']).toBe(125);
      expect(allocation.byService['svc2']).toBe(50);
    });

    it('should return zero allocation for customer with no costs', async () => {
      const allocation = await allocateCosts('unknown-customer');

      expect(allocation.totalCost).toBe(0);
      expect(allocation.breakdown.compute).toBe(0);
    });
  });

  describe('Cost Forecasting', () => {
    it('should forecast costs for a period', async () => {
      // Add some historical data
      await trackCost({ serviceId: 'svc1', category: CostCategory.COMPUTE, amount: 100 });
      await trackCost({ serviceId: 'svc2', category: CostCategory.STORAGE, amount: 50 });

      const forecast = await forecastCosts({
        period: TimePeriod.MONTHLY,
        includeOptimizations: false,
      });

      expect(forecast).toBeDefined();
      expect(forecast.period).toBe(TimePeriod.MONTHLY);
      expect(forecast.projectedCost).toBeGreaterThanOrEqual(0);
      expect(forecast.currency).toBe('USD');
      expect(forecast.confidence).toBeGreaterThan(0);
      expect(forecast.breakdown).toBeDefined();
      expect(forecast.assumptions).toBeInstanceOf(Array);
    });

    it('should include optimization savings when requested', async () => {
      await trackCost({ serviceId: 'svc1', category: CostCategory.COMPUTE, amount: 1000 });

      const forecastWithout = await forecastCosts({
        period: TimePeriod.MONTHLY,
        includeOptimizations: false,
      });

      const forecastWith = await forecastCosts({
        period: TimePeriod.MONTHLY,
        includeOptimizations: true,
      });

      // Forecast with optimizations should be lower or equal
      expect(forecastWith.projectedCost).toBeLessThanOrEqual(forecastWithout.projectedCost);
    });
  });

  describe('Cost Optimization', () => {
    it('should identify optimization opportunities', async () => {
      // Add costs that trigger optimization recommendations
      await trackCost({ serviceId: 'svc1', category: CostCategory.COMPUTE, amount: 500 });
      await trackCost({ serviceId: 'svc2', category: CostCategory.STORAGE, amount: 100 });

      const optimizations = await identifyOptimizations();

      expect(optimizations).toBeInstanceOf(Array);
      expect(optimizations.length).toBeGreaterThan(0);
      
      const optimization = optimizations[0];
      expect(optimization.id).toBeDefined();
      expect(optimization.title).toBeDefined();
      expect(optimization.description).toBeDefined();
      expect(optimization.potentialSavings).toBeGreaterThanOrEqual(0);
      expect(optimization.recommendation).toBeDefined();
    });

    it('should get underutilized resources', async () => {
      const resources = await getUnderutilizedResources();

      expect(resources).toBeInstanceOf(Array);
      expect(resources.length).toBeGreaterThan(0);
      
      const resource = resources[0];
      expect(resource.resourceId).toBeDefined();
      expect(resource.resourceType).toBeDefined();
      expect(resource.utilizationPercent).toBeLessThan(100);
      expect(resource.potentialSavings).toBeGreaterThan(0);
    });
  });


  describe('Budget Management', () => {
    it('should create a budget', async () => {
      const budget = await setBudget({
        name: 'Monthly Infrastructure',
        amount: 1000,
        period: TimePeriod.MONTHLY,
        alertThresholds: [50, 75, 90, 100],
      });

      expect(budget).toBeDefined();
      expect(budget.id).toBeDefined();
      expect(budget.name).toBe('Monthly Infrastructure');
      expect(budget.amount).toBe(1000);
      expect(budget.period).toBe(TimePeriod.MONTHLY);
      expect(budget.alertThresholds).toEqual([50, 75, 90, 100]);
      expect(budget.currentSpend).toBe(0);
      expect(budget.percentUsed).toBe(0);
    });

    it('should create a budget with category filters', async () => {
      const budget = await setBudget({
        name: 'Compute Budget',
        amount: 500,
        period: TimePeriod.MONTHLY,
        categories: [CostCategory.COMPUTE],
      });

      expect(budget.categories).toEqual([CostCategory.COMPUTE]);
    });

    it('should get all budgets', async () => {
      await setBudget({ name: 'Budget 1', amount: 100, period: TimePeriod.MONTHLY });
      await setBudget({ name: 'Budget 2', amount: 200, period: TimePeriod.WEEKLY });

      const budgetList = await getBudgets();

      expect(budgetList).toHaveLength(2);
    });

    it('should get a specific budget by ID', async () => {
      const created = await setBudget({
        name: 'Test Budget',
        amount: 500,
        period: TimePeriod.MONTHLY,
      });

      const retrieved = await getBudget(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.name).toBe('Test Budget');
    });

    it('should return null for non-existent budget', async () => {
      const budget = await getBudget('non-existent-id');
      expect(budget).toBeNull();
    });
  });

  describe('Budget Alerts', () => {
    it('should trigger alert when budget threshold is exceeded', async () => {
      // Create a small budget
      await setBudget({
        name: 'Small Budget',
        amount: 100,
        period: TimePeriod.MONTHLY,
        alertThresholds: [50, 75, 100],
      });

      // Add costs that exceed 50% threshold
      await trackCost({ serviceId: 'svc1', category: CostCategory.COMPUTE, amount: 60 });

      const alerts = await getBudgetAlerts(false);

      expect(alerts.length).toBeGreaterThan(0);
      const alert = alerts[0];
      expect(alert.budgetName).toBe('Small Budget');
      expect(alert.threshold).toBe(50);
      expect(alert.acknowledged).toBe(false);
    });

    it('should acknowledge an alert', async () => {
      await setBudget({
        name: 'Test Budget',
        amount: 100,
        period: TimePeriod.MONTHLY,
        alertThresholds: [50],
      });

      await trackCost({ serviceId: 'svc1', category: CostCategory.COMPUTE, amount: 60 });

      const alertsBefore = await getBudgetAlerts(false);
      expect(alertsBefore.length).toBeGreaterThan(0);

      await acknowledgeBudgetAlert(alertsBefore[0].id);

      const alertsAfter = await getBudgetAlerts(false);
      expect(alertsAfter.length).toBe(alertsBefore.length - 1);
    });

    it('should filter alerts by acknowledged status', async () => {
      await setBudget({
        name: 'Test Budget',
        amount: 100,
        period: TimePeriod.MONTHLY,
        alertThresholds: [50],
      });

      await trackCost({ serviceId: 'svc1', category: CostCategory.COMPUTE, amount: 60 });

      const unacknowledged = await getBudgetAlerts(false);
      const acknowledged = await getBudgetAlerts(true);

      expect(unacknowledged.length).toBeGreaterThan(0);
      expect(acknowledged.length).toBe(0);
    });
  });


  describe('Cost Reporting', () => {
    it('should generate a cost report', async () => {
      await trackCost({ serviceId: 'svc1', category: CostCategory.COMPUTE, amount: 100 });
      await trackCost({ serviceId: 'svc2', category: CostCategory.STORAGE, amount: 50 });
      await trackCost({ serviceId: 'svc1', category: CostCategory.NETWORK, amount: 25 });

      const report = await getCostReport({});

      expect(report).toBeDefined();
      expect(report.totalCost).toBe(175);
      expect(report.currency).toBe('USD');
      expect(report.byCategory[CostCategory.COMPUTE]).toBe(100);
      expect(report.byCategory[CostCategory.STORAGE]).toBe(50);
      expect(report.byCategory[CostCategory.NETWORK]).toBe(25);
      expect(report.byService['svc1']).toBe(125);
      expect(report.byService['svc2']).toBe(50);
    });

    it('should filter report by customer', async () => {
      await trackCost({ serviceId: 'svc1', category: CostCategory.COMPUTE, amount: 100 }, 'customer-1');
      await trackCost({ serviceId: 'svc2', category: CostCategory.STORAGE, amount: 50 }, 'customer-2');

      const report = await getCostReport({ customerId: 'customer-1' });

      expect(report.totalCost).toBe(100);
    });

    it('should include top cost drivers', async () => {
      await trackCost({ serviceId: 'expensive-svc', category: CostCategory.COMPUTE, amount: 500 });
      await trackCost({ serviceId: 'cheap-svc', category: CostCategory.STORAGE, amount: 50 });

      const report = await getCostReport({});

      expect(report.topCostDrivers).toBeDefined();
      expect(report.topCostDrivers.length).toBeGreaterThan(0);
      expect(report.topCostDrivers[0].name).toBe('expensive-svc');
      expect(report.topCostDrivers[0].cost).toBe(500);
    });

    it('should include trends in report', async () => {
      await trackCost({ serviceId: 'svc1', category: CostCategory.COMPUTE, amount: 100 });

      const report = await getCostReport({});

      expect(report.trends).toBeDefined();
      expect(report.trends.length).toBeGreaterThan(0);
      
      const computeTrend = report.trends.find(t => t.category === CostCategory.COMPUTE);
      expect(computeTrend).toBeDefined();
      expect(computeTrend?.currentPeriod).toBe(100);
    });
  });

  describe('Cost Benchmarking', () => {
    it('should benchmark costs against industry standards', async () => {
      await trackCost({ serviceId: 'svc1', category: CostCategory.COMPUTE, amount: 400 });
      await trackCost({ serviceId: 'svc2', category: CostCategory.STORAGE, amount: 100 });

      const benchmarks = await benchmarkCosts('saas');

      expect(benchmarks).toBeInstanceOf(Array);
      expect(benchmarks.length).toBe(Object.values(CostCategory).length);

      const computeBenchmark = benchmarks.find(b => b.category === CostCategory.COMPUTE);
      expect(computeBenchmark).toBeDefined();
      expect(computeBenchmark?.industry).toBe('saas');
      expect(computeBenchmark?.yourCost).toBeDefined();
      expect(computeBenchmark?.averageCost).toBeDefined();
      expect(['below', 'average', 'above']).toContain(computeBenchmark?.comparison);
    });

    it('should support different industries', async () => {
      await trackCost({ serviceId: 'svc1', category: CostCategory.COMPUTE, amount: 100 });

      const saasBenchmarks = await benchmarkCosts('saas');
      const enterpriseBenchmarks = await benchmarkCosts('enterprise');
      const startupBenchmarks = await benchmarkCosts('startup');

      expect(saasBenchmarks[0].industry).toBe('saas');
      expect(enterpriseBenchmarks[0].industry).toBe('enterprise');
      expect(startupBenchmarks[0].industry).toBe('startup');
    });
  });

  describe('Cost Summary', () => {
    it('should generate a comprehensive cost summary', async () => {
      await trackCost({ serviceId: 'svc1', category: CostCategory.COMPUTE, amount: 100 });
      await trackCost({ serviceId: 'svc2', category: CostCategory.STORAGE, amount: 50 });

      await setBudget({
        name: 'Test Budget',
        amount: 500,
        period: TimePeriod.MONTHLY,
        alertThresholds: [50, 75, 100],
      });

      const summary = await getCostSummary();

      expect(summary).toBeDefined();
      expect(summary.currentMonth.total).toBe(150);
      expect(summary.currentMonth.byCategory[CostCategory.COMPUTE]).toBe(100);
      expect(summary.currentMonth.byCategory[CostCategory.STORAGE]).toBe(50);
      expect(summary.yearToDate).toBeGreaterThanOrEqual(150);
      expect(summary.budgetStatus).toBeInstanceOf(Array);
      expect(summary.optimizations).toBeInstanceOf(Array);
    });

    it('should include month-over-month change', async () => {
      await trackCost({ serviceId: 'svc1', category: CostCategory.COMPUTE, amount: 100 });

      const summary = await getCostSummary();

      expect(summary.monthOverMonthChange).toBeDefined();
      expect(typeof summary.monthOverMonthChange).toBe('number');
    });
  });
});
