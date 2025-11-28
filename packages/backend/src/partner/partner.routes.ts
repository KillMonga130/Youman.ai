/**
 * Partner Integration Routes
 * REST API endpoints for partner OAuth, API keys, webhooks, and marketplace
 * Requirements: 98
 */

import { Router, Request, Response, NextFunction } from 'express';
import { partnerService } from './partner.service';
import { logger } from '../utils/logger';
import type {
  RegisterPartnerOptions,
  AuthorizationRequest,
  TokenRequest,
  CreateApiKeyOptions,
  CreateListingOptions,
  OAuthScope,
} from './types';

const router = Router();

// ============ Partner Registration ============

/**
 * POST /partners
 * Register a new partner application
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const options: RegisterPartnerOptions = {
      name: req.body.name,
      description: req.body.description,
      websiteUrl: req.body.websiteUrl,
      contactEmail: req.body.contactEmail,
      logoUrl: req.body.logoUrl,
      redirectUris: req.body.redirectUris,
      requestedScopes: req.body.requestedScopes,
      userId: req.body.userId || 'system',
    };

    const partner = await partnerService.registerPartner(options);

    res.status(201).json({
      success: true,
      data: {
        id: partner.id,
        name: partner.name,
        clientId: partner.clientId,
        clientSecret: partner.clientSecretHash, // Only shown once
        status: partner.status,
        tier: partner.tier,
        allowedScopes: partner.allowedScopes,
        redirectUris: partner.redirectUris,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /partners/:partnerId
 * Get partner details
 */
router.get('/:partnerId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const partner = await partnerService.getPartner(req.params.partnerId);

    if (!partner) {
      return res.status(404).json({
        success: false,
        error: 'Partner not found',
      });
    }

    res.json({
      success: true,
      data: {
        id: partner.id,
        name: partner.name,
        description: partner.description,
        websiteUrl: partner.websiteUrl,
        logoUrl: partner.logoUrl,
        status: partner.status,
        tier: partner.tier,
        certificationStatus: partner.certificationStatus,
        createdAt: partner.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /partners/:partnerId/status
 * Update partner status (admin only)
 */
router.patch('/:partnerId/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const partner = await partnerService.updatePartnerStatus(
      req.params.partnerId,
      req.body.status
    );

    res.json({
      success: true,
      data: { id: partner.id, status: partner.status },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /partners/:partnerId/tier
 * Update partner tier (admin only)
 */
router.patch('/:partnerId/tier', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const partner = await partnerService.updatePartnerTier(
      req.params.partnerId,
      req.body.tier
    );

    res.json({
      success: true,
      data: {
        id: partner.id,
        tier: partner.tier,
        rateLimitPerMinute: partner.rateLimitPerMinute,
        monthlyQuota: partner.monthlyQuota,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============ OAuth 2.0 Endpoints ============

/**
 * GET /partners/oauth/authorize
 * OAuth authorization endpoint
 */
router.get('/oauth/authorize', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const request: AuthorizationRequest = {
      responseType: req.query.response_type as 'code',
      clientId: req.query.client_id as string,
      redirectUri: req.query.redirect_uri as string,
      scope: req.query.scope as string,
      state: req.query.state as string,
      codeChallenge: req.query.code_challenge as string | undefined,
      codeChallengeMethod: req.query.code_challenge_method as 'S256' | 'plain' | undefined,
    };

    // In a real implementation, this would show a consent screen
    // For now, we'll auto-approve with a mock user ID
    const userId = req.query.user_id as string || 'mock_user';

    const result = await partnerService.createAuthorizationCode(request, userId);

    // Redirect back to client with code
    const redirectUrl = new URL(request.redirectUri);
    redirectUrl.searchParams.set('code', result.code);
    redirectUrl.searchParams.set('state', result.state);

    res.redirect(redirectUrl.toString());
  } catch (error) {
    // Redirect with error
    const redirectUri = req.query.redirect_uri as string;
    if (redirectUri) {
      const redirectUrl = new URL(redirectUri);
      redirectUrl.searchParams.set('error', 'access_denied');
      redirectUrl.searchParams.set('error_description', (error as Error).message);
      if (req.query.state) {
        redirectUrl.searchParams.set('state', req.query.state as string);
      }
      return res.redirect(redirectUrl.toString());
    }
    next(error);
  }
});

/**
 * POST /partners/oauth/token
 * OAuth token endpoint
 */
router.post('/oauth/token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const request: TokenRequest = {
      grantType: req.body.grant_type,
      clientId: req.body.client_id,
      clientSecret: req.body.client_secret,
      code: req.body.code,
      redirectUri: req.body.redirect_uri,
      codeVerifier: req.body.code_verifier,
      refreshToken: req.body.refresh_token,
      scope: req.body.scope,
    };

    let tokenResponse;

    switch (request.grantType) {
      case 'authorization_code':
        tokenResponse = await partnerService.exchangeCodeForTokens(request);
        break;
      case 'client_credentials':
        tokenResponse = await partnerService.clientCredentialsGrant(request);
        break;
      case 'refresh_token':
        tokenResponse = await partnerService.refreshAccessToken(request);
        break;
      default:
        return res.status(400).json({
          error: 'unsupported_grant_type',
          error_description: 'The grant type is not supported',
        });
    }

    res.json({
      access_token: tokenResponse.accessToken,
      token_type: tokenResponse.tokenType,
      expires_in: tokenResponse.expiresIn,
      refresh_token: tokenResponse.refreshToken,
      scope: tokenResponse.scope,
    });
  } catch (error) {
    res.status(400).json({
      error: 'invalid_request',
      error_description: (error as Error).message,
    });
  }
});

/**
 * POST /partners/oauth/revoke
 * Revoke a token
 */
router.post('/oauth/revoke', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await partnerService.revokeToken(req.body.token_id);
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ============ API Key Management ============

/**
 * POST /partners/:partnerId/api-keys
 * Create an API key
 */
router.post('/:partnerId/api-keys', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const options: CreateApiKeyOptions = {
      partnerId: req.params.partnerId,
      name: req.body.name,
      scopes: req.body.scopes,
      expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined,
      ipWhitelist: req.body.ipWhitelist,
    };

    const result = await partnerService.createApiKey(options);

    res.status(201).json({
      success: true,
      data: {
        id: result.id,
        apiKey: result.apiKey, // Only shown once
        keyPrefix: result.keyPrefix,
        name: result.name,
        scopes: result.scopes,
        expiresAt: result.expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /partners/:partnerId/api-keys
 * List API keys for a partner
 */
router.get('/:partnerId/api-keys', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const keys = partnerService.getApiKeysByPartner(req.params.partnerId);

    res.json({
      success: true,
      data: keys.map(k => ({
        id: k.id,
        name: k.name,
        keyPrefix: k.keyPrefix,
        status: k.status,
        scopes: k.scopes,
        lastUsedAt: k.lastUsedAt,
        expiresAt: k.expiresAt,
        createdAt: k.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /partners/:partnerId/api-keys/:keyId
 * Revoke an API key
 */
router.delete(
  '/:partnerId/api-keys/:keyId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await partnerService.revokeApiKey(req.params.keyId);
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

// ============ Partner Webhooks ============

/**
 * POST /partners/:partnerId/webhooks
 * Create a webhook
 */
router.post('/:partnerId/webhooks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const webhook = await partnerService.createPartnerWebhook(
      req.params.partnerId,
      req.body.url,
      req.body.events
    );

    res.status(201).json({
      success: true,
      data: webhook,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /partners/:partnerId/webhooks
 * List webhooks for a partner
 */
router.get('/:partnerId/webhooks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const webhooks = partnerService.getWebhooksByPartner(req.params.partnerId);

    res.json({
      success: true,
      data: webhooks,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /partners/:partnerId/webhooks/:webhookId
 * Delete a webhook
 */
router.delete(
  '/:partnerId/webhooks/:webhookId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await partnerService.deletePartnerWebhook(req.params.webhookId);
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);


// ============ Marketplace ============

/**
 * POST /partners/marketplace/listings
 * Create a marketplace listing
 */
router.post('/marketplace/listings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const options: CreateListingOptions = {
      partnerId: req.body.partnerId,
      title: req.body.title,
      shortDescription: req.body.shortDescription,
      fullDescription: req.body.fullDescription,
      category: req.body.category,
      tags: req.body.tags || [],
      iconUrl: req.body.iconUrl,
      screenshots: req.body.screenshots,
      pricingModel: req.body.pricingModel,
      priceInCents: req.body.priceInCents,
    };

    const listing = await partnerService.createListing(options);

    res.status(201).json({
      success: true,
      data: listing,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /partners/marketplace/listings
 * Get published marketplace listings
 */
router.get('/marketplace/listings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = req.query.category as string | undefined;
    const listings = await partnerService.getPublishedListings(category);

    res.json({
      success: true,
      data: listings,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /partners/marketplace/listings/:listingId
 * Get a specific listing
 */
router.get(
  '/marketplace/listings/:listingId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const listing = await partnerService.getListing(req.params.listingId);

      if (!listing) {
        return res.status(404).json({
          success: false,
          error: 'Listing not found',
        });
      }

      res.json({
        success: true,
        data: listing,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /partners/marketplace/listings/:listingId/submit
 * Submit listing for review
 */
router.post(
  '/marketplace/listings/:listingId/submit',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const listing = await partnerService.submitListingForReview(req.params.listingId);

      res.json({
        success: true,
        data: { id: listing.id, status: listing.status },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /partners/marketplace/listings/:listingId/approve
 * Approve a listing (admin only)
 */
router.post(
  '/marketplace/listings/:listingId/approve',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const listing = await partnerService.approveListing(req.params.listingId);

      res.json({
        success: true,
        data: { id: listing.id, status: listing.status, publishedAt: listing.publishedAt },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /partners/marketplace/listings/:listingId/install
 * Install a partner integration
 */
router.post(
  '/marketplace/listings/:listingId/install',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const listing = await partnerService.getListing(req.params.listingId);
      if (!listing) {
        return res.status(404).json({
          success: false,
          error: 'Listing not found',
        });
      }

      const installation = await partnerService.installPartner(
        listing.partnerId,
        req.body.userId,
        req.body.scopes as OAuthScope[]
      );

      res.status(201).json({
        success: true,
        data: installation,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /partners/marketplace/installations/:installationId
 * Uninstall a partner integration
 */
router.delete(
  '/marketplace/installations/:installationId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await partnerService.uninstallPartner(req.params.installationId);
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /partners/marketplace/listings/:listingId/reviews
 * Add a review to a listing
 */
router.post(
  '/marketplace/listings/:listingId/reviews',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const review = await partnerService.addReview(
        req.params.listingId,
        req.body.userId,
        req.body.rating,
        req.body.title,
        req.body.body
      );

      res.status(201).json({
        success: true,
        data: review,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============ Certification ============

/**
 * POST /partners/:partnerId/certification
 * Start certification process
 */
router.post(
  '/:partnerId/certification',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const certification = await partnerService.startCertification(req.params.partnerId);

      res.status(201).json({
        success: true,
        data: certification,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /partners/certification/:certificationId/run-tests
 * Run certification tests
 */
router.post(
  '/certification/:certificationId/run-tests',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tests = await partnerService.runCertificationTests(req.params.certificationId);

      res.json({
        success: true,
        data: tests,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============ Analytics ============

/**
 * GET /partners/:partnerId/analytics
 * Get partner analytics
 */
router.get('/:partnerId/analytics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

    const analytics = await partnerService.getPartnerAnalytics(
      req.params.partnerId,
      startDate,
      endDate
    );

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
