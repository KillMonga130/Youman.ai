/**
 * CDN and Caching Types
 * Type definitions for CDN configuration, caching, and geo-routing
 * Requirements: 90 - CDN and global content delivery
 */

// CDN Distribution configuration
export interface CDNDistribution {
  id: string;
  name: string;
  domain: string;
  origins: CDNOrigin[];
  cacheBehaviors: CacheBehavior[];
  geoRestrictions: GeoRestriction[];
  enabled: boolean;
  status: 'deployed' | 'deploying' | 'disabled' | 'error';
  createdAt: Date;
  updatedAt: Date;
}

export interface CDNOrigin {
  id: string;
  domain: string;
  path: string;
  protocol: 'http' | 'https' | 'match-viewer';
  port: number;
  connectionTimeout: number;
  readTimeout: number;
  keepAliveTimeout: number;
  customHeaders: Record<string, string>;
}

export interface CacheBehavior {
  id: string;
  pathPattern: string;
  originId: string;
  viewerProtocolPolicy: 'allow-all' | 'https-only' | 'redirect-to-https';
  allowedMethods: string[];
  cachedMethods: string[];
  ttl: CacheTTL;
  compress: boolean;
  queryStringCaching: 'none' | 'whitelist' | 'all';
  queryStringWhitelist?: string[];
  headersCaching: 'none' | 'whitelist' | 'all';
  headersWhitelist?: string[];
}

export interface CacheTTL {
  default: number; // seconds
  min: number;
  max: number;
}

export interface GeoRestriction {
  type: 'whitelist' | 'blacklist';
  countries: string[]; // ISO 3166-1 alpha-2 codes
}

// Cache entry
export interface CacheEntry {
  key: string;
  value: string | Buffer;
  contentType: string;
  size: number;
  ttl: number;
  createdAt: Date;
  expiresAt: Date;
  hits: number;
  lastAccessed: Date;
  etag: string;
  headers: Record<string, string>;
}

// Cache statistics
export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
  avgTTL: number;
  topKeys: CacheKeyStats[];
}

export interface CacheKeyStats {
  key: string;
  hits: number;
  size: number;
  lastAccessed: Date;
}

// Cache invalidation
export interface InvalidationRequest {
  id: string;
  paths: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  invalidatedCount: number;
  error?: string;
}

// Geo-routing
export interface GeoEndpoint {
  region: string;
  endpoint: string;
  latency: number;
  healthy: boolean;
  weight: number;
}

export interface GeoRoutingConfig {
  id: string;
  name: string;
  endpoints: GeoEndpoint[];
  routingPolicy: 'latency' | 'geoproximity' | 'weighted' | 'failover';
  healthCheckPath: string;
  healthCheckInterval?: number;
  enabled: boolean;
}

export interface GeoRoutingDecision {
  clientRegion: string;
  clientCountry: string;
  selectedEndpoint: GeoEndpoint;
  alternativeEndpoints: GeoEndpoint[];
  latencyMs: number;
  reason: string;
}

// Multi-level caching
export interface CacheLevel {
  name: string;
  type: 'memory' | 'redis' | 'cdn';
  priority: number;
  maxSize: number;
  defaultTTL: number;
  enabled: boolean;
}

export interface CachingStrategy {
  id: string;
  name: string;
  levels: CacheLevel[];
  writePolicy: 'write-through' | 'write-back' | 'write-around';
  readPolicy: 'read-through' | 'cache-aside';
  evictionPolicy: 'lru' | 'lfu' | 'fifo' | 'ttl';
}

// Latency metrics
export interface LatencyMetrics {
  region: string;
  p50: number;
  p90: number;
  p99: number;
  avg: number;
  min: number;
  max: number;
  sampleCount: number;
  timestamp: Date;
}

// API Request/Response types
export interface CacheAssetRequest {
  url: string;
  ttl?: number;
  headers?: Record<string, string>;
}

export interface PurgeCacheRequest {
  patterns: string[];
  purgeAll?: boolean;
}

export interface ConfigureGeoRoutingRequest {
  name: string;
  endpoints: Omit<GeoEndpoint, 'healthy'>[];
  routingPolicy: GeoRoutingConfig['routingPolicy'];
  healthCheckPath?: string;
}
