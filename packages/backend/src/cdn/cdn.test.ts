/**
 * CDN and Caching Service Tests
 * Tests for CDN distribution, caching, cache invalidation, and geo-routing
 * Requirements: 90 - CDN and global content delivery
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CDNService } from './cdn.service';

describe('CDNService', () => {
  let service: CDNService;

  beforeEach(() => {
    service = new CDNService();
  });

  describe('CDN Distribution Management', () => {
    it('should create a distribution', async () => {
      const distribution = await service.createDistribution({
        name: 'Test Distribution',
        domain: 'cdn.example.com',
        origins: [{
          id: 'origin-1',
          domain: 'origin.example.com',
          path: '/',
          protocol: 'https',
          port: 443,
          connectionTimeout: 10,
          readTimeout: 30,
          keepAliveTimeout: 5,
          customHeaders: {},
        }],
        cacheBehaviors: [],
        geoRestrictions: [],
        enabled: true,
      });

      expect(distribution.id).toBeDefined();
      expect(distribution.name).toBe('Test Distribution');
      expect(distribution.domain).toBe('cdn.example.com');
      expect(distribution.status).toBe('deploying');
      expect(distribution.origins).toHaveLength(1);
    });

    it('should reject distribution without domain', async () => {
      await expect(service.createDistribution({
        name: 'Test',
        domain: '',
        origins: [{ id: 'o1', domain: 'origin.com', path: '/', protocol: 'https', port: 443, connectionTimeout: 10, readTimeout: 30, keepAliveTimeout: 5, customHeaders: {} }],
        cacheBehaviors: [],
        geoRestrictions: [],
        enabled: true,
      })).rejects.toThrow('Domain is required');
    });

    it('should reject distribution without origins', async () => {
      await expect(service.createDistribution({
        name: 'Test',
        domain: 'cdn.example.com',
        origins: [],
        cacheBehaviors: [],
        geoRestrictions: [],
        enabled: true,
      })).rejects.toThrow('At least one origin is required');
    });


    it('should list distributions', async () => {
      await service.createDistribution({
        name: 'Distribution 1',
        domain: 'cdn1.example.com',
        origins: [{ id: 'o1', domain: 'origin1.com', path: '/', protocol: 'https', port: 443, connectionTimeout: 10, readTimeout: 30, keepAliveTimeout: 5, customHeaders: {} }],
        cacheBehaviors: [],
        geoRestrictions: [],
        enabled: true,
      });
      await service.createDistribution({
        name: 'Distribution 2',
        domain: 'cdn2.example.com',
        origins: [{ id: 'o2', domain: 'origin2.com', path: '/', protocol: 'https', port: 443, connectionTimeout: 10, readTimeout: 30, keepAliveTimeout: 5, customHeaders: {} }],
        cacheBehaviors: [],
        geoRestrictions: [],
        enabled: true,
      });

      const distributions = await service.listDistributions();

      expect(distributions).toHaveLength(2);
    });

    it('should get a specific distribution', async () => {
      const created = await service.createDistribution({
        name: 'Test Distribution',
        domain: 'cdn.example.com',
        origins: [{ id: 'o1', domain: 'origin.com', path: '/', protocol: 'https', port: 443, connectionTimeout: 10, readTimeout: 30, keepAliveTimeout: 5, customHeaders: {} }],
        cacheBehaviors: [],
        geoRestrictions: [],
        enabled: true,
      });

      const distribution = await service.getDistribution(created.id);

      expect(distribution).toBeDefined();
      expect(distribution?.id).toBe(created.id);
    });

    it('should return undefined for non-existent distribution', async () => {
      const distribution = await service.getDistribution('non-existent');
      expect(distribution).toBeUndefined();
    });

    it('should update a distribution', async () => {
      const created = await service.createDistribution({
        name: 'Test Distribution',
        domain: 'cdn.example.com',
        origins: [{ id: 'o1', domain: 'origin.com', path: '/', protocol: 'https', port: 443, connectionTimeout: 10, readTimeout: 30, keepAliveTimeout: 5, customHeaders: {} }],
        cacheBehaviors: [],
        geoRestrictions: [],
        enabled: true,
      });

      const updated = await service.updateDistribution(created.id, { name: 'Updated Distribution' });

      expect(updated.name).toBe('Updated Distribution');
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime());
    });

    it('should throw error when updating non-existent distribution', async () => {
      await expect(service.updateDistribution('non-existent', { name: 'Test' }))
        .rejects.toThrow('Distribution not found');
    });

    it('should delete a distribution', async () => {
      const created = await service.createDistribution({
        name: 'Test Distribution',
        domain: 'cdn.example.com',
        origins: [{ id: 'o1', domain: 'origin.com', path: '/', protocol: 'https', port: 443, connectionTimeout: 10, readTimeout: 30, keepAliveTimeout: 5, customHeaders: {} }],
        cacheBehaviors: [],
        geoRestrictions: [],
        enabled: true,
      });

      await service.deleteDistribution(created.id);

      const deleted = await service.getDistribution(created.id);
      expect(deleted).toBeUndefined();
    });

    it('should throw error when deleting non-existent distribution', async () => {
      await expect(service.deleteDistribution('non-existent'))
        .rejects.toThrow('Distribution not found');
    });
  });

  describe('Cache Management', () => {
    it('should cache an asset', async () => {
      const entry = await service.cacheAsset(
        'https://example.com/image.png',
        'image-content',
        3600,
        { 'content-type': 'image/png' }
      );

      expect(entry.key).toBeDefined();
      expect(entry.ttl).toBe(3600);
      expect(entry.contentType).toBe('image/png');
      expect(entry.etag).toBeDefined();
      expect(entry.hits).toBe(0);
    });

    it('should retrieve cached asset', async () => {
      await service.cacheAsset('https://example.com/file.txt', 'file-content', 3600);

      const entry = await service.getFromCache('https://example.com/file.txt');

      expect(entry).not.toBeNull();
      expect(entry?.value).toBe('file-content');
      expect(entry?.hits).toBe(1);
    });

    it('should return null for non-cached asset', async () => {
      const entry = await service.getFromCache('https://example.com/not-cached.txt');
      expect(entry).toBeNull();
    });

    it('should increment hit count on cache access', async () => {
      await service.cacheAsset('https://example.com/file.txt', 'content', 3600);

      await service.getFromCache('https://example.com/file.txt');
      await service.getFromCache('https://example.com/file.txt');
      const entry = await service.getFromCache('https://example.com/file.txt');

      expect(entry?.hits).toBe(3);
    });

    it('should track cache statistics', async () => {
      await service.cacheAsset('https://example.com/file1.txt', 'content1', 3600);
      await service.cacheAsset('https://example.com/file2.txt', 'content2', 7200);
      await service.getFromCache('https://example.com/file1.txt');
      await service.getFromCache('https://example.com/file1.txt');
      await service.getFromCache('https://example.com/not-exists.txt');

      const stats = await service.getCacheStats();

      expect(stats.totalEntries).toBe(2);
      expect(stats.hitRate).toBeGreaterThan(0);
      expect(stats.missRate).toBeGreaterThan(0);
      expect(stats.topKeys).toHaveLength(2);
    });
  });


  describe('Cache Invalidation', () => {
    it('should invalidate cache by pattern', async () => {
      await service.cacheAsset('https://example.com/images/img1.png', 'img1', 3600);
      await service.cacheAsset('https://example.com/images/img2.png', 'img2', 3600);
      await service.cacheAsset('https://example.com/css/style.css', 'css', 3600);

      const request = await service.invalidateCache(['*images*']);

      expect(request.status).toBe('completed');
      expect(request.invalidatedCount).toBe(2);

      const img1 = await service.getFromCache('https://example.com/images/img1.png');
      const css = await service.getFromCache('https://example.com/css/style.css');

      expect(img1).toBeNull();
      expect(css).not.toBeNull();
    });

    it('should purge all cache', async () => {
      await service.cacheAsset('https://example.com/file1.txt', 'content1', 3600);
      await service.cacheAsset('https://example.com/file2.txt', 'content2', 3600);

      const request = await service.purgeAllCache();

      expect(request.status).toBe('completed');
      expect(request.invalidatedCount).toBe(2);
      expect(request.paths).toContain('/*');

      const stats = await service.getCacheStats();
      expect(stats.totalEntries).toBe(0);
    });

    it('should get invalidation request status', async () => {
      await service.cacheAsset('https://example.com/file.txt', 'content', 3600);
      const request = await service.invalidateCache(['*file*']);

      const retrieved = await service.getInvalidationRequest(request.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(request.id);
      expect(retrieved?.status).toBe('completed');
    });

    it('should return undefined for non-existent invalidation request', async () => {
      const request = await service.getInvalidationRequest('non-existent');
      expect(request).toBeUndefined();
    });

    it('should track eviction count in stats', async () => {
      await service.cacheAsset('https://example.com/file1.txt', 'content1', 3600);
      await service.cacheAsset('https://example.com/file2.txt', 'content2', 3600);
      await service.invalidateCache(['*']);

      const stats = await service.getCacheStats();
      expect(stats.evictionCount).toBe(2);
    });
  });

  describe('Geo-Routing', () => {
    it('should configure geo-routing', async () => {
      const config = await service.configureGeoRouting({
        name: 'Global Routing',
        endpoints: [
          { region: 'us-east-1', endpoint: 'https://us-east.example.com', latency: 50, healthy: true, weight: 100 },
          { region: 'eu-west-1', endpoint: 'https://eu-west.example.com', latency: 100, healthy: true, weight: 80 },
        ],
        routingPolicy: 'latency',
        healthCheckPath: '/health',
      });

      expect(config.id).toBeDefined();
      expect(config.name).toBe('Global Routing');
      expect(config.endpoints).toHaveLength(2);
      expect(config.enabled).toBe(true);
    });

    it('should reject geo-routing without endpoints', async () => {
      await expect(service.configureGeoRouting({
        name: 'Empty Routing',
        endpoints: [],
        routingPolicy: 'latency',
        healthCheckPath: '/health',
      })).rejects.toThrow('At least one endpoint is required');
    });

    it('should route to nearest endpoint by latency', async () => {
      await service.configureGeoRouting({
        name: 'Latency Routing',
        endpoints: [
          { region: 'us-east-1', endpoint: 'https://us-east.example.com', latency: 150, healthy: true, weight: 100 },
          { region: 'eu-west-1', endpoint: 'https://eu-west.example.com', latency: 50, healthy: true, weight: 100 },
        ],
        routingPolicy: 'latency',
        healthCheckPath: '/health',
      });

      const decision = await service.routeToNearestEndpoint('us-east-1', 'US');

      expect(decision.selectedEndpoint.region).toBe('eu-west-1');
      expect(decision.reason).toContain('Lowest latency');
    });

    it('should route by geoproximity', async () => {
      await service.configureGeoRouting({
        name: 'Geo Routing',
        endpoints: [
          { region: 'us-east-1', endpoint: 'https://us-east.example.com', latency: 100, healthy: true, weight: 100 },
          { region: 'eu-west-1', endpoint: 'https://eu-west.example.com', latency: 50, healthy: true, weight: 100 },
        ],
        routingPolicy: 'geoproximity',
        healthCheckPath: '/health',
      });

      const decision = await service.routeToNearestEndpoint('us-east-1', 'US');

      expect(decision.selectedEndpoint.region).toBe('us-east-1');
      expect(decision.reason).toContain('Geographically closest');
    });

    it('should route by failover policy', async () => {
      await service.configureGeoRouting({
        name: 'Failover Routing',
        endpoints: [
          { region: 'us-east-1', endpoint: 'https://us-east.example.com', latency: 100, healthy: true, weight: 100 },
          { region: 'eu-west-1', endpoint: 'https://eu-west.example.com', latency: 50, healthy: true, weight: 50 },
        ],
        routingPolicy: 'failover',
        healthCheckPath: '/health',
      });

      const decision = await service.routeToNearestEndpoint('eu-west-1', 'DE');

      expect(decision.selectedEndpoint.region).toBe('us-east-1');
      expect(decision.reason).toContain('Primary endpoint');
    });

    it('should throw error when no geo-routing configured', async () => {
      await expect(service.routeToNearestEndpoint('us-east-1', 'US'))
        .rejects.toThrow('No geo-routing configurations available');
    });

    it('should update endpoint health', async () => {
      const config = await service.configureGeoRouting({
        name: 'Health Test',
        endpoints: [
          { region: 'us-east-1', endpoint: 'https://us-east.example.com', latency: 50, healthy: true, weight: 100 },
          { region: 'eu-west-1', endpoint: 'https://eu-west.example.com', latency: 100, healthy: true, weight: 100 },
        ],
        routingPolicy: 'latency',
        healthCheckPath: '/health',
      });

      await service.updateEndpointHealth(config.id, 'us-east-1', false);

      const decision = await service.routeToNearestEndpoint('us-east-1', 'US');
      expect(decision.selectedEndpoint.region).toBe('eu-west-1');
    });

    it('should throw error when no healthy endpoints available', async () => {
      const config = await service.configureGeoRouting({
        name: 'Unhealthy Test',
        endpoints: [
          { region: 'us-east-1', endpoint: 'https://us-east.example.com', latency: 50, healthy: true, weight: 100 },
        ],
        routingPolicy: 'latency',
        healthCheckPath: '/health',
      });

      await service.updateEndpointHealth(config.id, 'us-east-1', false);

      await expect(service.routeToNearestEndpoint('us-east-1', 'US'))
        .rejects.toThrow('No healthy endpoints available');
    });
  });


  describe('Latency Measurement', () => {
    it('should measure latency for a region', async () => {
      const metrics = await service.measureLatency('us-east-1');

      expect(metrics.region).toBe('us-east-1');
      expect(metrics.p50).toBeGreaterThan(0);
      expect(metrics.p90).toBeGreaterThan(0);
      expect(metrics.p99).toBeGreaterThan(0);
      expect(metrics.avg).toBeGreaterThan(0);
      expect(metrics.min).toBeGreaterThan(0);
      expect(metrics.max).toBeGreaterThan(0);
      expect(metrics.sampleCount).toBe(100);
      expect(metrics.timestamp).toBeInstanceOf(Date);
    });

    it('should store latency history', async () => {
      await service.measureLatency('us-east-1');
      await service.measureLatency('us-east-1');
      await service.measureLatency('us-east-1');

      const history = await service.getLatencyHistory('us-east-1');

      expect(history).toHaveLength(3);
      expect(history[0].timestamp.getTime()).toBeGreaterThanOrEqual(history[1].timestamp.getTime());
    });

    it('should limit latency history results', async () => {
      await service.measureLatency('us-east-1');
      await service.measureLatency('us-east-1');
      await service.measureLatency('us-east-1');

      const history = await service.getLatencyHistory('us-east-1', 2);

      expect(history).toHaveLength(2);
    });

    it('should return empty array for region with no history', async () => {
      const history = await service.getLatencyHistory('ap-southeast-1');
      expect(history).toHaveLength(0);
    });
  });

  describe('Caching Strategy', () => {
    it('should configure a caching strategy', async () => {
      const strategy = await service.configureCachingStrategy({
        name: 'Multi-Level Cache',
        levels: [
          { name: 'L1 Memory', type: 'memory', priority: 1, maxSize: 1024 * 1024, defaultTTL: 60, enabled: true },
          { name: 'L2 Redis', type: 'redis', priority: 2, maxSize: 1024 * 1024 * 100, defaultTTL: 300, enabled: true },
          { name: 'L3 CDN', type: 'cdn', priority: 3, maxSize: 1024 * 1024 * 1024, defaultTTL: 3600, enabled: true },
        ],
        writePolicy: 'write-through',
        readPolicy: 'read-through',
        evictionPolicy: 'lru',
      });

      expect(strategy.id).toBeDefined();
      expect(strategy.name).toBe('Multi-Level Cache');
      expect(strategy.levels).toHaveLength(3);
      expect(strategy.writePolicy).toBe('write-through');
    });

    it('should reject strategy without cache levels', async () => {
      await expect(service.configureCachingStrategy({
        name: 'Empty Strategy',
        levels: [],
        writePolicy: 'write-through',
        readPolicy: 'read-through',
        evictionPolicy: 'lru',
      })).rejects.toThrow('At least one cache level is required');
    });

    it('should list caching strategies', async () => {
      await service.configureCachingStrategy({
        name: 'Strategy 1',
        levels: [{ name: 'L1', type: 'memory', priority: 1, maxSize: 1024, defaultTTL: 60, enabled: true }],
        writePolicy: 'write-through',
        readPolicy: 'read-through',
        evictionPolicy: 'lru',
      });
      await service.configureCachingStrategy({
        name: 'Strategy 2',
        levels: [{ name: 'L1', type: 'redis', priority: 1, maxSize: 1024, defaultTTL: 60, enabled: true }],
        writePolicy: 'write-back',
        readPolicy: 'cache-aside',
        evictionPolicy: 'lfu',
      });

      const strategies = await service.listCachingStrategies();

      expect(strategies).toHaveLength(2);
    });

    it('should get a specific caching strategy', async () => {
      const created = await service.configureCachingStrategy({
        name: 'Test Strategy',
        levels: [{ name: 'L1', type: 'memory', priority: 1, maxSize: 1024, defaultTTL: 60, enabled: true }],
        writePolicy: 'write-through',
        readPolicy: 'read-through',
        evictionPolicy: 'lru',
      });

      const strategy = await service.getCachingStrategy(created.id);

      expect(strategy).toBeDefined();
      expect(strategy?.id).toBe(created.id);
    });

    it('should return undefined for non-existent strategy', async () => {
      const strategy = await service.getCachingStrategy('non-existent');
      expect(strategy).toBeUndefined();
    });
  });

  describe('TTL Configuration', () => {
    it('should configure TTL for a path pattern', async () => {
      const distribution = await service.createDistribution({
        name: 'TTL Test',
        domain: 'cdn.example.com',
        origins: [{ id: 'o1', domain: 'origin.com', path: '/', protocol: 'https', port: 443, connectionTimeout: 10, readTimeout: 30, keepAliveTimeout: 5, customHeaders: {} }],
        cacheBehaviors: [],
        geoRestrictions: [],
        enabled: true,
      });

      const behavior = await service.configureTTL('/images/*', distribution.id, {
        default: 86400,
        min: 3600,
        max: 604800,
      });

      expect(behavior.id).toBeDefined();
      expect(behavior.pathPattern).toBe('/images/*');
      expect(behavior.ttl.default).toBe(86400);
      expect(behavior.ttl.min).toBe(3600);
      expect(behavior.ttl.max).toBe(604800);
    });

    it('should throw error for non-existent distribution', async () => {
      await expect(service.configureTTL('/images/*', 'non-existent', {
        default: 86400,
        min: 3600,
        max: 604800,
      })).rejects.toThrow('Distribution not found');
    });

    it('should add cache behavior to distribution', async () => {
      const distribution = await service.createDistribution({
        name: 'TTL Test',
        domain: 'cdn.example.com',
        origins: [{ id: 'o1', domain: 'origin.com', path: '/', protocol: 'https', port: 443, connectionTimeout: 10, readTimeout: 30, keepAliveTimeout: 5, customHeaders: {} }],
        cacheBehaviors: [],
        geoRestrictions: [],
        enabled: true,
      });

      await service.configureTTL('/images/*', distribution.id, { default: 86400, min: 3600, max: 604800 });
      await service.configureTTL('/api/*', distribution.id, { default: 0, min: 0, max: 60 });

      const updated = await service.getDistribution(distribution.id);
      expect(updated?.cacheBehaviors).toHaveLength(2);
    });
  });

  describe('Weighted Routing', () => {
    it('should route using weighted policy', async () => {
      await service.configureGeoRouting({
        name: 'Weighted Routing',
        endpoints: [
          { region: 'us-east-1', endpoint: 'https://us-east.example.com', latency: 100, healthy: true, weight: 70 },
          { region: 'eu-west-1', endpoint: 'https://eu-west.example.com', latency: 100, healthy: true, weight: 30 },
        ],
        routingPolicy: 'weighted',
        healthCheckPath: '/health',
      });

      // Run multiple times to verify weighted distribution
      const results: Record<string, number> = { 'us-east-1': 0, 'eu-west-1': 0 };
      for (let i = 0; i < 100; i++) {
        const decision = await service.routeToNearestEndpoint('any', 'ANY');
        results[decision.selectedEndpoint.region]++;
      }

      // With 70/30 weights, us-east-1 should be selected more often
      expect(results['us-east-1']).toBeGreaterThan(results['eu-west-1']);
    });
  });

  describe('Cache Stats Reset', () => {
    it('should reset cache statistics', async () => {
      await service.cacheAsset('https://example.com/file.txt', 'content', 3600);
      await service.getFromCache('https://example.com/file.txt');
      await service.getFromCache('https://example.com/not-exists.txt');

      service.resetStats();

      const stats = await service.getCacheStats();
      expect(stats.hitRate).toBe(0);
      expect(stats.missRate).toBe(0);
    });
  });
});
