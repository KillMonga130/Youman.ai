/**
 * Test infrastructure verification tests
 * These tests verify that the testing infrastructure is set up correctly
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { server } from './mocks/server';
import { http, HttpResponse } from 'msw';
import {
  createMockUser,
  createMockProject,
  createMockProjectList,
  createMockUsage,
  resetFactoryCounters,
} from './factories';
import {
  userArb,
  projectArb,
  metricsArb,
  nonEmptyTextArb,
} from './generators';

describe('Test Infrastructure', () => {
  describe('Fast-check setup', () => {
    it('should run property-based tests with fast-check', () => {
      fc.assert(
        fc.property(fc.integer(), fc.integer(), (a, b) => {
          return a + b === b + a; // Commutative property
        }),
        { numRuns: 100 }
      );
    });

    it('should generate valid user data', () => {
      fc.assert(
        fc.property(userArb, (user) => {
          expect(user.id).toBeDefined();
          expect(user.email).toContain('@');
          expect(user.name.length).toBeGreaterThan(0);
          return true;
        }),
        { numRuns: 50 }
      );
    });

    it('should generate valid project data', () => {
      fc.assert(
        fc.property(projectArb, (project) => {
          expect(project.id).toBeDefined();
          expect(project.name).toBeDefined();
          expect(['draft', 'processing', 'completed']).toContain(project.status);
          expect(project.wordCount).toBeGreaterThanOrEqual(0);
          return true;
        }),
        { numRuns: 50 }
      );
    });

    it('should generate valid metrics data', () => {
      fc.assert(
        fc.property(metricsArb, (metrics) => {
          expect(metrics.detectionScore).toBeGreaterThanOrEqual(0);
          expect(metrics.detectionScore).toBeLessThanOrEqual(100);
          expect(metrics.perplexity).toBeGreaterThanOrEqual(0);
          expect(metrics.perplexity).toBeLessThanOrEqual(200);
          expect(metrics.burstiness).toBeGreaterThanOrEqual(0);
          expect(metrics.burstiness).toBeLessThanOrEqual(1);
          expect(metrics.modificationPercentage).toBeGreaterThanOrEqual(0);
          expect(metrics.modificationPercentage).toBeLessThanOrEqual(100);
          return true;
        }),
        { numRuns: 50 }
      );
    });

    it('should generate non-empty text', () => {
      fc.assert(
        fc.property(nonEmptyTextArb, (text) => {
          expect(text.length).toBeGreaterThan(0);
          return true;
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('MSW setup', () => {
    it('should intercept API requests', async () => {
      const response = await fetch('/api/v1/auth/me');
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe('test@example.com');
    });

    it('should handle custom handlers', async () => {
      server.use(
        http.get('/api/v1/custom-endpoint', () => {
          return HttpResponse.json({ custom: 'response' });
        })
      );

      const response = await fetch('/api/v1/custom-endpoint');
      const data = await response.json();
      
      expect(data.custom).toBe('response');
    });

    it('should mock login endpoint', async () => {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
      });
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      expect(data.tokens).toBeDefined();
      expect(data.user).toBeDefined();
    });

    it('should mock projects endpoint', async () => {
      const response = await fetch('/api/v1/projects');
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      expect(data.projects).toBeDefined();
      expect(Array.isArray(data.projects)).toBe(true);
      expect(data.pagination).toBeDefined();
    });

    it('should mock humanization endpoint', async () => {
      const response = await fetch('/api/v1/transformations/humanize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Test text to humanize' }),
      });
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      expect(data.humanizedText).toBeDefined();
      expect(data.metrics).toBeDefined();
    });
  });

  describe('Factory functions', () => {
    beforeEach(() => {
      resetFactoryCounters();
    });

    it('should create mock users with unique IDs', () => {
      const user1 = createMockUser();
      const user2 = createMockUser();
      
      expect(user1.id).not.toBe(user2.id);
      expect(user1.email).not.toBe(user2.email);
    });

    it('should create mock users with overrides', () => {
      const user = createMockUser({ name: 'Custom Name', email: 'custom@example.com' });
      
      expect(user.name).toBe('Custom Name');
      expect(user.email).toBe('custom@example.com');
    });

    it('should create mock projects', () => {
      const project = createMockProject();
      
      expect(project.id).toBeDefined();
      expect(project.name).toBeDefined();
      expect(project.status).toBe('draft');
    });

    it('should create mock project lists', () => {
      const projects = createMockProjectList(5);
      
      expect(projects).toHaveLength(5);
      projects.forEach((project) => {
        expect(project.id).toBeDefined();
      });
    });

    it('should create mock usage data', () => {
      const usage = createMockUsage({ wordsProcessed: 1000, limit: 5000 });
      
      expect(usage.wordsProcessed).toBe(1000);
      expect(usage.limit).toBe(5000);
      expect(usage.remaining).toBe(4000);
    });
  });
});
