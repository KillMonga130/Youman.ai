/**
 * CDN and Caching Service
 * Implements CDN configuration, multi-level caching, cache invalidation, and geo-routing
 * Requirements: 90 - CDN and global content delivery
 */

import { v4 as uuidv4 } from 'uuid';
import {
  CDNDistribution,
  CDNOrigin,
  CacheBehavior,
  CacheEntry,
  CacheStats,
  CacheKeyStats,
  InvalidationRequest,
  GeoEndpoint,
  GeoRoutingConfig,
  GeoRoutingDecision,
  CacheLevel,
  CachingStrategy,
  LatencyMetrics,
} from './types';

export class CDNService {
  private distributions: Map<string, CDNDistribution> = new Map();
  private cache: Map<string, CacheEntry> = new Map();
  private invalidationRequests: Map<string, InvalidationRequest> = new Map();
  private geoRoutingConfigs: Map<string, GeoRoutingConfig> = new Map();
  private cachingStrategies: Map<string, CachingStrategy> = new Map();
  private latencyMetrics: Map<string, LatencyMetrics[]> = new Map();
  private cacheHits = 0;
  private cacheMisses = 0;
  private evictionCount = 0;

  // CDN Distribution Management
  async createDistribution(config: Omit<CDNDistribution, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<CDNDistribution> {
    if (!config.domain) {
      throw new Error('Domain is required');
    }
    if (!config.origins || config.origins.length === 0) {
      throw new Error('At least one origin is required');
    }

    const distribution: CDNDistribution = {
      id: uuidv4(),
      ...config,
      status: 'deploying',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.distributions.set(distribution.id, distribution);

    // Simulate deployment
    setTimeout(() => {
      distribution.status = 'deployed';
      distribution.updatedAt = new Date();
    }, 100);

    return distribution;
  }

  async getDistribution(distributionId: string): Promise<CDNDistribution | undefined> {
    return this.distributions.get(distributionId);
  }

  async listDistributions(): Promise<CDNDistribution[]> {
    return Array.from(this.distributions.values());
  }

  async updateDistribution(distributionId: string, updates: Partial<CDNDistribution>): Promise<CDNDistribution> {
    const distribution = this.distributions.get(distributionId);
    if (!distribution) {
      throw new Error('Distribution not found');
    }

    Object.assign(distribution, updates, { updatedAt: new Date() });
    return distribution;
  }

  async deleteDistribution(distributionId: string): Promise<void> {
    if (!this.distributions.has(distributionId)) {
      throw new Error('Distribution not found');
    }
    this.distributions.delete(distributionId);
  }

  // Cache Management
  async cacheAsset(url: string, content: string | Buffer, ttl: number, headers?: Record<string, string>): Promise<CacheEntry> {
    const key = this.generateCacheKey(url);
    const now = new Date();
    const contentStr = typeof content === 'string' ? content : content.toString('base64');

    const entry: CacheEntry = {
      key,
      value: contentStr,
      contentType: headers?.['content-type'] || 'application/octet-stream',
      size: typeof content === 'string' ? content.length : content.length,
      ttl,
      createdAt: now,
      expiresAt: new Date(now.getTime() + ttl * 1000),
      hits: 0,
      lastAccessed: now,
      etag: this.generateEtag(contentStr),
      headers: headers || {},
    };

    this.cache.set(key, entry);
    return entry;
  }

  async getFromCache(url: string): Promise<CacheEntry | null> {
    const key = this.generateCacheKey(url);
    const entry = this.cache.get(key);

    if (!entry) {
      this.cacheMisses++;
      return null;
    }

    // Check if expired
    if (entry.expiresAt < new Date()) {
      this.cache.delete(key);
      this.cacheMisses++;
      return null;
    }

    entry.hits++;
    entry.lastAccessed = new Date();
    this.cacheHits++;
    return entry;
  }

  async invalidateCache(patterns: string[]): Promise<InvalidationRequest> {
    const request: InvalidationRequest = {
      id: uuidv4(),
      paths: patterns,
      status: 'in_progress',
      createdAt: new Date(),
      invalidatedCount: 0,
    };

    this.invalidationRequests.set(request.id, request);

    // Process invalidation
    let invalidatedCount = 0;
    for (const pattern of patterns) {
      const regex = this.patternToRegex(pattern);
      for (const [key] of this.cache) {
        if (regex.test(key)) {
          this.cache.delete(key);
          invalidatedCount++;
          this.evictionCount++;
        }
      }
    }

    request.invalidatedCount = invalidatedCount;
    request.status = 'completed';
    request.completedAt = new Date();

    return request;
  }

  async purgeAllCache(): Promise<InvalidationRequest> {
    const count = this.cache.size;
    this.cache.clear();
    this.evictionCount += count;

    const request: InvalidationRequest = {
      id: uuidv4(),
      paths: ['/*'],
      status: 'completed',
      createdAt: new Date(),
      completedAt: new Date(),
      invalidatedCount: count,
    };

    this.invalidationRequests.set(request.id, request);
    return request;
  }

  async getInvalidationRequest(requestId: string): Promise<InvalidationRequest | undefined> {
    return this.invalidationRequests.get(requestId);
  }

  async getCacheStats(): Promise<CacheStats> {
    const entries = Array.from(this.cache.values());
    const totalSize = entries.reduce((sum, e) => sum + e.size, 0);
    const totalHits = this.cacheHits;
    const totalRequests = this.cacheHits + this.cacheMisses;
    const avgTTL = entries.length > 0 
      ? entries.reduce((sum, e) => sum + e.ttl, 0) / entries.length 
      : 0;

    const topKeys: CacheKeyStats[] = entries
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 10)
      .map(e => ({
        key: e.key,
        hits: e.hits,
        size: e.size,
        lastAccessed: e.lastAccessed,
      }));

    return {
      totalEntries: this.cache.size,
      totalSize,
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
      missRate: totalRequests > 0 ? this.cacheMisses / totalRequests : 0,
      evictionCount: this.evictionCount,
      avgTTL,
      topKeys,
    };
  }

  // Geo-Routing
  async configureGeoRouting(config: Omit<GeoRoutingConfig, 'id' | 'enabled'>): Promise<GeoRoutingConfig> {
    if (!config.endpoints || config.endpoints.length === 0) {
      throw new Error('At least one endpoint is required');
    }

    const fullConfig: GeoRoutingConfig = {
      id: uuidv4(),
      ...config,
      healthCheckInterval: config.healthCheckInterval || 30000,
      enabled: true,
    };

    this.geoRoutingConfigs.set(fullConfig.id, fullConfig);
    return fullConfig;
  }

  async routeToNearestEndpoint(clientRegion: string, clientCountry: string): Promise<GeoRoutingDecision> {
    const configs = Array.from(this.geoRoutingConfigs.values()).filter(c => c.enabled);
    
    if (configs.length === 0) {
      throw new Error('No geo-routing configurations available');
    }

    const config = configs[0];
    const healthyEndpoints = config.endpoints.filter(e => e.healthy);

    if (healthyEndpoints.length === 0) {
      throw new Error('No healthy endpoints available');
    }

    let selectedEndpoint: GeoEndpoint;
    let reason: string;

    switch (config.routingPolicy) {
      case 'latency':
        selectedEndpoint = healthyEndpoints.reduce((min, e) => e.latency < min.latency ? e : min);
        reason = `Lowest latency endpoint (${selectedEndpoint.latency}ms)`;
        break;
      case 'geoproximity':
        selectedEndpoint = this.findClosestEndpoint(clientRegion, healthyEndpoints);
        reason = `Geographically closest endpoint to ${clientRegion}`;
        break;
      case 'weighted':
        selectedEndpoint = this.selectWeightedEndpoint(healthyEndpoints);
        reason = `Weighted selection (weight: ${selectedEndpoint.weight})`;
        break;
      case 'failover':
        selectedEndpoint = healthyEndpoints.sort((a, b) => b.weight - a.weight)[0];
        reason = 'Primary endpoint (failover policy)';
        break;
      default:
        selectedEndpoint = healthyEndpoints[0];
        reason = 'Default selection';
    }

    return {
      clientRegion,
      clientCountry,
      selectedEndpoint,
      alternativeEndpoints: healthyEndpoints.filter(e => e !== selectedEndpoint),
      latencyMs: selectedEndpoint.latency,
      reason,
    };
  }

  private findClosestEndpoint(clientRegion: string, endpoints: GeoEndpoint[]): GeoEndpoint {
    // Simple region matching - in production would use actual geo-distance
    const regionMatch = endpoints.find(e => e.region === clientRegion);
    if (regionMatch) return regionMatch;

    // Fall back to lowest latency
    return endpoints.reduce((min, e) => e.latency < min.latency ? e : min);
  }

  private selectWeightedEndpoint(endpoints: GeoEndpoint[]): GeoEndpoint {
    const totalWeight = endpoints.reduce((sum, e) => sum + e.weight, 0);
    let random = Math.random() * totalWeight;

    for (const endpoint of endpoints) {
      random -= endpoint.weight;
      if (random <= 0) return endpoint;
    }

    return endpoints[0];
  }

  async updateEndpointHealth(configId: string, region: string, healthy: boolean): Promise<void> {
    const config = this.geoRoutingConfigs.get(configId);
    if (!config) {
      throw new Error('Geo-routing config not found');
    }

    const endpoint = config.endpoints.find(e => e.region === region);
    if (endpoint) {
      endpoint.healthy = healthy;
    }
  }

  async measureLatency(region: string): Promise<LatencyMetrics> {
    // Simulate latency measurement
    const samples = Array.from({ length: 100 }, () => Math.floor(Math.random() * 200) + 10);
    samples.sort((a, b) => a - b);

    const metrics: LatencyMetrics = {
      region,
      p50: samples[49],
      p90: samples[89],
      p99: samples[98],
      avg: samples.reduce((sum, s) => sum + s, 0) / samples.length,
      min: samples[0],
      max: samples[99],
      sampleCount: samples.length,
      timestamp: new Date(),
    };

    const regionMetrics = this.latencyMetrics.get(region) || [];
    regionMetrics.push(metrics);
    if (regionMetrics.length > 1000) regionMetrics.shift();
    this.latencyMetrics.set(region, regionMetrics);

    return metrics;
  }

  async getLatencyHistory(region: string, limit: number = 100): Promise<LatencyMetrics[]> {
    return (this.latencyMetrics.get(region) || [])
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // Caching Strategy
  async configureCachingStrategy(strategy: Omit<CachingStrategy, 'id'>): Promise<CachingStrategy> {
    if (!strategy.levels || strategy.levels.length === 0) {
      throw new Error('At least one cache level is required');
    }

    const fullStrategy: CachingStrategy = {
      id: uuidv4(),
      ...strategy,
    };

    this.cachingStrategies.set(fullStrategy.id, fullStrategy);
    return fullStrategy;
  }

  async getCachingStrategy(strategyId: string): Promise<CachingStrategy | undefined> {
    return this.cachingStrategies.get(strategyId);
  }

  async listCachingStrategies(): Promise<CachingStrategy[]> {
    return Array.from(this.cachingStrategies.values());
  }

  // TTL Configuration
  async configureTTL(pathPattern: string, distributionId: string, ttl: { default: number; min: number; max: number }): Promise<CacheBehavior> {
    const distribution = this.distributions.get(distributionId);
    if (!distribution) {
      throw new Error('Distribution not found');
    }

    const behavior: CacheBehavior = {
      id: uuidv4(),
      pathPattern,
      originId: distribution.origins[0]?.id || 'default',
      viewerProtocolPolicy: 'redirect-to-https',
      allowedMethods: ['GET', 'HEAD', 'OPTIONS'],
      cachedMethods: ['GET', 'HEAD'],
      ttl,
      compress: true,
      queryStringCaching: 'none',
      headersCaching: 'none',
    };

    distribution.cacheBehaviors.push(behavior);
    distribution.updatedAt = new Date();

    return behavior;
  }

  // Helper methods
  private generateCacheKey(url: string): string {
    return url.replace(/[^a-zA-Z0-9]/g, '_');
  }

  private generateEtag(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `"${Math.abs(hash).toString(16)}"`;
  }

  private patternToRegex(pattern: string): RegExp {
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    return new RegExp(`^${escaped}$`);
  }

  // Reset stats (for testing)
  resetStats(): void {
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.evictionCount = 0;
  }
}

export const cdnService = new CDNService();
