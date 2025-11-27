/**
 * CDN and Caching Routes
 * API endpoints for CDN management, caching, and geo-routing
 * Requirements: 90 - CDN and global content delivery
 */

import { Router, Request, Response } from 'express';
import { cdnService } from './cdn.service';
import { CacheAssetRequest, PurgeCacheRequest, ConfigureGeoRoutingRequest } from './types';

const router = Router();

// Distribution endpoints
router.post('/distributions', async (req: Request, res: Response): Promise<void> => {
  try {
    const distribution = await cdnService.createDistribution(req.body);
    res.status(201).json(distribution);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.get('/distributions', async (_req: Request, res: Response): Promise<void> => {
  try {
    const distributions = await cdnService.listDistributions();
    res.json(distributions);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/distributions/:id', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const distribution = await cdnService.getDistribution(req.params.id);
    if (!distribution) {
      res.status(404).json({ error: 'Distribution not found' });
      return;
    }
    res.json(distribution);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.put('/distributions/:id', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const distribution = await cdnService.updateDistribution(req.params.id, req.body);
    res.json(distribution);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});


router.delete('/distributions/:id', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    await cdnService.deleteDistribution(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Cache endpoints
router.post('/cache', async (req: Request, res: Response): Promise<void> => {
  try {
    const { url, ttl, headers } = req.body as CacheAssetRequest;
    if (!url) {
      res.status(400).json({ error: 'URL is required' });
      return;
    }
    const content = req.body.content || '';
    const entry = await cdnService.cacheAsset(url, content, ttl || 3600, headers);
    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/cache', async (req: Request, res: Response): Promise<void> => {
  try {
    const url = req.query.url as string;
    if (!url) {
      res.status(400).json({ error: 'URL query parameter is required' });
      return;
    }
    const entry = await cdnService.getFromCache(url);
    if (!entry) {
      res.status(404).json({ error: 'Cache entry not found' });
      return;
    }
    res.json(entry);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/cache/stats', async (_req: Request, res: Response): Promise<void> => {
  try {
    const stats = await cdnService.getCacheStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/cache/invalidate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { patterns, purgeAll } = req.body as PurgeCacheRequest;
    
    let request;
    if (purgeAll) {
      request = await cdnService.purgeAllCache();
    } else if (patterns && patterns.length > 0) {
      request = await cdnService.invalidateCache(patterns);
    } else {
      res.status(400).json({ error: 'Either patterns or purgeAll is required' });
      return;
    }
    
    res.json(request);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/cache/invalidations/:id', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const request = await cdnService.getInvalidationRequest(req.params.id);
    if (!request) {
      res.status(404).json({ error: 'Invalidation request not found' });
      return;
    }
    res.json(request);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Geo-routing endpoints
router.post('/geo-routing', async (req: Request, res: Response): Promise<void> => {
  try {
    const config = req.body as ConfigureGeoRoutingRequest;
    if (!config.name || !config.endpoints || !config.routingPolicy) {
      res.status(400).json({ error: 'name, endpoints, and routingPolicy are required' });
      return;
    }
    
    // Add healthy status to endpoints
    const endpointsWithHealth = config.endpoints.map(e => ({ ...e, healthy: true }));
    
    const result = await cdnService.configureGeoRouting({
      ...config,
      endpoints: endpointsWithHealth,
      healthCheckPath: config.healthCheckPath || '/health',
      healthCheckInterval: 30000,
    });
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.post('/geo-routing/route', async (req: Request, res: Response): Promise<void> => {
  try {
    const { clientRegion, clientCountry } = req.body;
    if (!clientRegion || !clientCountry) {
      res.status(400).json({ error: 'clientRegion and clientCountry are required' });
      return;
    }
    const decision = await cdnService.routeToNearestEndpoint(clientRegion, clientCountry);
    res.json(decision);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.put('/geo-routing/:configId/endpoints/:region/health', async (req: Request<{ configId: string; region: string }>, res: Response): Promise<void> => {
  try {
    const { healthy } = req.body;
    if (typeof healthy !== 'boolean') {
      res.status(400).json({ error: 'healthy (boolean) is required' });
      return;
    }
    await cdnService.updateEndpointHealth(req.params.configId, req.params.region, healthy);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Latency endpoints
router.post('/latency/:region/measure', async (req: Request<{ region: string }>, res: Response): Promise<void> => {
  try {
    const metrics = await cdnService.measureLatency(req.params.region);
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/latency/:region/history', async (req: Request<{ region: string }>, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const history = await cdnService.getLatencyHistory(req.params.region, limit);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Caching strategy endpoints
router.post('/strategies', async (req: Request, res: Response): Promise<void> => {
  try {
    const strategy = await cdnService.configureCachingStrategy(req.body);
    res.status(201).json(strategy);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.get('/strategies', async (_req: Request, res: Response): Promise<void> => {
  try {
    const strategies = await cdnService.listCachingStrategies();
    res.json(strategies);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/strategies/:id', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const strategy = await cdnService.getCachingStrategy(req.params.id);
    if (!strategy) {
      res.status(404).json({ error: 'Caching strategy not found' });
      return;
    }
    res.json(strategy);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// TTL configuration
router.post('/distributions/:id/ttl', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { pathPattern, ttl } = req.body;
    if (!pathPattern || !ttl) {
      res.status(400).json({ error: 'pathPattern and ttl are required' });
      return;
    }
    const behavior = await cdnService.configureTTL(pathPattern, req.params.id, ttl);
    res.status(201).json(behavior);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

export default router;
