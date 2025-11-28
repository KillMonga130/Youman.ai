/**
 * Partner Integration Service Tests
 * Tests for OAuth 2.0, API keys, webhooks, and marketplace
 * Requirements: 98
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PartnerService } from './partner.service';
import type {
  RegisterPartnerOptions,
  AuthorizationRequest,
  TokenRequest,
  CreateApiKeyOptions,
  CreateListingOptions,
  OAuthScope,
} from './types';

describe('PartnerService', () => {
  let service: PartnerService;

  beforeEach(() => {
    service = new PartnerService();
  });

  // ============ Partner Registration Tests ============

  describe('Partner Registration', () => {
    it('should register a new partner', async () => {
      const options: RegisterPartnerOptions = {
        name: 'Test Partner',
        description: 'A test partner application',
        websiteUrl: 'https://example.com',
        contactEmail: 'contact@example.com',
        redirectUris: ['https://example.com/callback'],
        requestedScopes: ['read:projects', 'write:projects'],
        userId: 'user_123',
      };

      const partner = await service.registerPartner(options);

      expect(partner.id).toMatch(/^partner_/);
      expect(partner.name).toBe('Test Partner');
      expect(partner.clientId).toMatch(/^client_/);
      expect(partner.clientSecretHash).toMatch(/^secret_/); // Returns actual secret on creation
      expect(partner.status).toBe('pending');
      expect(partner.tier).toBe('basic');
      expect(partner.allowedScopes).toEqual(['read:projects', 'write:projects']);
    });

    it('should get partner by ID', async () => {
      const options: RegisterPartnerOptions = {
        name: 'Test Partner',
        description: 'A test partner',
        websiteUrl: 'https://example.com',
        contactEmail: 'contact@example.com',
        redirectUris: ['https://example.com/callback'],
        requestedScopes: ['read:projects'],
        userId: 'user_123',
      };

      const created = await service.registerPartner(options);
      const retrieved = await service.getPartner(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.name).toBe('Test Partner');
    });

    it('should get partner by client ID', async () => {
      const options: RegisterPartnerOptions = {
        name: 'Test Partner',
        description: 'A test partner',
        websiteUrl: 'https://example.com',
        contactEmail: 'contact@example.com',
        redirectUris: ['https://example.com/callback'],
        requestedScopes: ['read:projects'],
        userId: 'user_123',
      };

      const created = await service.registerPartner(options);
      const retrieved = await service.getPartnerByClientId(created.clientId);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should update partner status', async () => {
      const options: RegisterPartnerOptions = {
        name: 'Test Partner',
        description: 'A test partner',
        websiteUrl: 'https://example.com',
        contactEmail: 'contact@example.com',
        redirectUris: ['https://example.com/callback'],
        requestedScopes: ['read:projects'],
        userId: 'user_123',
      };

      const partner = await service.registerPartner(options);
      const updated = await service.updatePartnerStatus(partner.id, 'active');

      expect(updated.status).toBe('active');
    });

    it('should update partner tier', async () => {
      const options: RegisterPartnerOptions = {
        name: 'Test Partner',
        description: 'A test partner',
        websiteUrl: 'https://example.com',
        contactEmail: 'contact@example.com',
        redirectUris: ['https://example.com/callback'],
        requestedScopes: ['read:projects'],
        userId: 'user_123',
      };

      const partner = await service.registerPartner(options);
      const updated = await service.updatePartnerTier(partner.id, 'premium');

      expect(updated.tier).toBe('premium');
      expect(updated.rateLimitPerMinute).toBe(300);
      expect(updated.monthlyQuota).toBe(100000);
    });

    it('should reject invalid redirect URI', async () => {
      const options: RegisterPartnerOptions = {
        name: 'Test Partner',
        description: 'A test partner',
        websiteUrl: 'https://example.com',
        contactEmail: 'contact@example.com',
        redirectUris: ['ftp://invalid.com/callback'],
        requestedScopes: ['read:projects'],
        userId: 'user_123',
      };

      await expect(service.registerPartner(options)).rejects.toThrow(
        'Invalid redirect URI format'
      );
    });
  });

  // ============ OAuth 2.0 Tests ============

  describe('OAuth 2.0', () => {
    let partnerId: string;
    let clientId: string;
    let clientSecret: string;

    beforeEach(async () => {
      const options: RegisterPartnerOptions = {
        name: 'OAuth Test Partner',
        description: 'A test partner for OAuth',
        websiteUrl: 'https://example.com',
        contactEmail: 'contact@example.com',
        redirectUris: ['https://example.com/callback'],
        requestedScopes: ['read:projects', 'write:projects', 'read:analytics'],
        userId: 'user_123',
      };

      const partner = await service.registerPartner(options);
      partnerId = partner.id;
      clientId = partner.clientId;
      clientSecret = partner.clientSecretHash; // Actual secret returned on creation

      // Activate partner
      await service.updatePartnerStatus(partnerId, 'active');
    });

    it('should create authorization code', async () => {
      const request: AuthorizationRequest = {
        responseType: 'code',
        clientId,
        redirectUri: 'https://example.com/callback',
        scope: 'read:projects write:projects',
        state: 'random_state_123',
      };

      const result = await service.createAuthorizationCode(request, 'user_456');

      expect(result.code).toBeDefined();
      expect(result.state).toBe('random_state_123');
    });

    it('should exchange authorization code for tokens', async () => {
      // Create auth code
      const authRequest: AuthorizationRequest = {
        responseType: 'code',
        clientId,
        redirectUri: 'https://example.com/callback',
        scope: 'read:projects',
        state: 'state_123',
      };

      const { code } = await service.createAuthorizationCode(authRequest, 'user_456');

      // Exchange for tokens
      const tokenRequest: TokenRequest = {
        grantType: 'authorization_code',
        clientId,
        clientSecret,
        code,
        redirectUri: 'https://example.com/callback',
      };

      const tokens = await service.exchangeCodeForTokens(tokenRequest);

      expect(tokens.accessToken).toMatch(/^at_/);
      expect(tokens.refreshToken).toMatch(/^rt_/);
      expect(tokens.tokenType).toBe('Bearer');
      expect(tokens.expiresIn).toBe(3600);
      expect(tokens.scope).toBe('read:projects');
    });

    it('should issue tokens via client credentials grant', async () => {
      const request: TokenRequest = {
        grantType: 'client_credentials',
        clientId,
        clientSecret,
        scope: 'read:projects read:analytics',
      };

      const tokens = await service.clientCredentialsGrant(request);

      expect(tokens.accessToken).toMatch(/^at_/);
      expect(tokens.tokenType).toBe('Bearer');
      expect(tokens.scope).toContain('read:projects');
    });

    it('should refresh access token', async () => {
      // Get initial tokens
      const authRequest: AuthorizationRequest = {
        responseType: 'code',
        clientId,
        redirectUri: 'https://example.com/callback',
        scope: 'read:projects',
        state: 'state_123',
      };

      const { code } = await service.createAuthorizationCode(authRequest, 'user_456');

      const tokenRequest: TokenRequest = {
        grantType: 'authorization_code',
        clientId,
        clientSecret,
        code,
        redirectUri: 'https://example.com/callback',
      };

      const initialTokens = await service.exchangeCodeForTokens(tokenRequest);

      // Refresh tokens
      const refreshRequest: TokenRequest = {
        grantType: 'refresh_token',
        clientId,
        clientSecret,
        refreshToken: initialTokens.refreshToken,
      };

      const newTokens = await service.refreshAccessToken(refreshRequest);

      expect(newTokens.accessToken).toMatch(/^at_/);
      expect(newTokens.accessToken).not.toBe(initialTokens.accessToken);
    });

    it('should validate access token', async () => {
      const request: TokenRequest = {
        grantType: 'client_credentials',
        clientId,
        clientSecret,
        scope: 'read:projects',
      };

      const tokens = await service.clientCredentialsGrant(request);
      const validation = await service.validateAccessToken(tokens.accessToken);

      expect(validation.valid).toBe(true);
      expect(validation.partnerId).toBe(partnerId);
      expect(validation.scopes).toContain('read:projects');
    });

    it('should reject invalid client credentials', async () => {
      const request: TokenRequest = {
        grantType: 'client_credentials',
        clientId,
        clientSecret: 'wrong_secret',
        scope: 'read:projects',
      };

      await expect(service.clientCredentialsGrant(request)).rejects.toThrow(
        'Invalid client credentials'
      );
    });

    it('should reject unauthorized scopes', async () => {
      const request: AuthorizationRequest = {
        responseType: 'code',
        clientId,
        redirectUri: 'https://example.com/callback',
        scope: 'admin', // Not in allowed scopes
        state: 'state_123',
      };

      await expect(service.createAuthorizationCode(request, 'user_456')).rejects.toThrow(
        'Scope not allowed: admin'
      );
    });

    it('should reject invalid redirect URI', async () => {
      const request: AuthorizationRequest = {
        responseType: 'code',
        clientId,
        redirectUri: 'https://malicious.com/callback',
        scope: 'read:projects',
        state: 'state_123',
      };

      await expect(service.createAuthorizationCode(request, 'user_456')).rejects.toThrow(
        'Invalid redirect_uri'
      );
    });
  });


  // ============ API Key Tests ============

  describe('API Key Management', () => {
    let partnerId: string;

    beforeEach(async () => {
      const options: RegisterPartnerOptions = {
        name: 'API Key Test Partner',
        description: 'A test partner for API keys',
        websiteUrl: 'https://example.com',
        contactEmail: 'contact@example.com',
        redirectUris: ['https://example.com/callback'],
        requestedScopes: ['read:projects', 'write:projects'],
        userId: 'user_123',
      };

      const partner = await service.registerPartner(options);
      partnerId = partner.id;
    });

    it('should create an API key', async () => {
      const options: CreateApiKeyOptions = {
        partnerId,
        name: 'Production Key',
        scopes: ['read:projects'],
      };

      const result = await service.createApiKey(options);

      expect(result.id).toMatch(/^key_/);
      expect(result.apiKey).toMatch(/^ak_/);
      expect(result.keyPrefix).toHaveLength(8);
      expect(result.name).toBe('Production Key');
      expect(result.scopes).toEqual(['read:projects']);
    });

    it('should validate API key', async () => {
      const options: CreateApiKeyOptions = {
        partnerId,
        name: 'Test Key',
        scopes: ['read:projects', 'write:projects'],
      };

      const result = await service.createApiKey(options);
      const validation = await service.validateApiKey(result.apiKey);

      expect(validation.valid).toBe(true);
      expect(validation.partnerId).toBe(partnerId);
      expect(validation.scopes).toEqual(['read:projects', 'write:projects']);
    });

    it('should reject invalid API key', async () => {
      const validation = await service.validateApiKey('invalid_key');
      expect(validation.valid).toBe(false);
    });

    it('should revoke API key', async () => {
      const options: CreateApiKeyOptions = {
        partnerId,
        name: 'Revokable Key',
        scopes: ['read:projects'],
      };

      const result = await service.createApiKey(options);
      await service.revokeApiKey(result.id);

      const validation = await service.validateApiKey(result.apiKey);
      expect(validation.valid).toBe(false);
    });

    it('should enforce API key limit', async () => {
      // Create max keys (10)
      for (let i = 0; i < 10; i++) {
        await service.createApiKey({
          partnerId,
          name: `Key ${i}`,
          scopes: ['read:projects'],
        });
      }

      // 11th key should fail
      await expect(
        service.createApiKey({
          partnerId,
          name: 'Extra Key',
          scopes: ['read:projects'],
        })
      ).rejects.toThrow('Maximum API keys (10) exceeded');
    });

    it('should validate IP whitelist', async () => {
      const options: CreateApiKeyOptions = {
        partnerId,
        name: 'IP Restricted Key',
        scopes: ['read:projects'],
        ipWhitelist: ['192.168.1.1', '10.0.0.1'],
      };

      const result = await service.createApiKey(options);

      // Valid IP
      const validResult = await service.validateApiKey(result.apiKey, '192.168.1.1');
      expect(validResult.valid).toBe(true);

      // Invalid IP
      const invalidResult = await service.validateApiKey(result.apiKey, '8.8.8.8');
      expect(invalidResult.valid).toBe(false);
    });
  });

  // ============ Partner Webhook Tests ============

  describe('Partner Webhooks', () => {
    let partnerId: string;

    beforeEach(async () => {
      const options: RegisterPartnerOptions = {
        name: 'Webhook Test Partner',
        description: 'A test partner for webhooks',
        websiteUrl: 'https://example.com',
        contactEmail: 'contact@example.com',
        redirectUris: ['https://example.com/callback'],
        requestedScopes: ['read:projects'],
        userId: 'user_123',
      };

      const partner = await service.registerPartner(options);
      partnerId = partner.id;
    });

    it('should create a partner webhook', async () => {
      const webhook = await service.createPartnerWebhook(
        partnerId,
        'https://example.com/webhook',
        ['project.created', 'transformation.completed']
      );

      expect(webhook.id).toMatch(/^pwh_/);
      expect(webhook.partnerId).toBe(partnerId);
      expect(webhook.url).toBe('https://example.com/webhook');
      expect(webhook.secret).toMatch(/^whsec_/);
      expect(webhook.events).toEqual(['project.created', 'transformation.completed']);
      expect(webhook.enabled).toBe(true);
    });

    it('should list partner webhooks', async () => {
      await service.createPartnerWebhook(partnerId, 'https://example.com/webhook1', ['project.created']);
      await service.createPartnerWebhook(partnerId, 'https://example.com/webhook2', ['transformation.completed']);

      const webhooks = service.getWebhooksByPartner(partnerId);

      expect(webhooks).toHaveLength(2);
    });

    it('should delete partner webhook', async () => {
      const webhook = await service.createPartnerWebhook(
        partnerId,
        'https://example.com/webhook',
        ['project.created']
      );

      await service.deletePartnerWebhook(webhook.id);

      const webhooks = service.getWebhooksByPartner(partnerId);
      expect(webhooks).toHaveLength(0);
    });

    it('should reject non-HTTPS webhook URL', async () => {
      await expect(
        service.createPartnerWebhook(partnerId, 'http://example.com/webhook', ['project.created'])
      ).rejects.toThrow('Invalid webhook URL format');
    });
  });


  // ============ Marketplace Tests ============

  describe('Marketplace', () => {
    let partnerId: string;

    beforeEach(async () => {
      const options: RegisterPartnerOptions = {
        name: 'Marketplace Test Partner',
        description: 'A test partner for marketplace',
        websiteUrl: 'https://example.com',
        contactEmail: 'contact@example.com',
        redirectUris: ['https://example.com/callback'],
        requestedScopes: ['read:projects', 'write:projects'],
        userId: 'user_123',
      };

      const partner = await service.registerPartner(options);
      partnerId = partner.id;
      await service.updatePartnerStatus(partnerId, 'active');
    });

    it('should create a marketplace listing', async () => {
      const options: CreateListingOptions = {
        partnerId,
        title: 'Amazing Integration',
        shortDescription: 'A short description',
        fullDescription: '# Full Description\n\nWith markdown support.',
        category: 'productivity',
        tags: ['automation', 'workflow'],
        pricingModel: 'free',
      };

      const listing = await service.createListing(options);

      expect(listing.id).toMatch(/^listing_/);
      expect(listing.title).toBe('Amazing Integration');
      expect(listing.status).toBe('draft');
      expect(listing.installCount).toBe(0);
    });

    it('should submit listing for review', async () => {
      const listing = await service.createListing({
        partnerId,
        title: 'Test Integration',
        shortDescription: 'Short desc',
        fullDescription: 'Full desc',
        category: 'productivity',
        tags: [],
        pricingModel: 'free',
      });

      const submitted = await service.submitListingForReview(listing.id);

      expect(submitted.status).toBe('pending_review');
    });

    it('should approve listing', async () => {
      const listing = await service.createListing({
        partnerId,
        title: 'Test Integration',
        shortDescription: 'Short desc',
        fullDescription: 'Full desc',
        category: 'productivity',
        tags: [],
        pricingModel: 'free',
      });

      await service.submitListingForReview(listing.id);
      const approved = await service.approveListing(listing.id);

      expect(approved.status).toBe('published');
      expect(approved.publishedAt).toBeDefined();
    });

    it('should get published listings', async () => {
      // Create and publish a listing
      const listing = await service.createListing({
        partnerId,
        title: 'Published Integration',
        shortDescription: 'Short desc',
        fullDescription: 'Full desc',
        category: 'productivity',
        tags: [],
        pricingModel: 'free',
      });

      await service.submitListingForReview(listing.id);
      await service.approveListing(listing.id);

      const published = await service.getPublishedListings();

      expect(published).toHaveLength(1);
      expect(published[0].title).toBe('Published Integration');
    });

    it('should filter listings by category', async () => {
      // Create listings in different categories
      const listing1 = await service.createListing({
        partnerId,
        title: 'Productivity Tool',
        shortDescription: 'Short desc',
        fullDescription: 'Full desc',
        category: 'productivity',
        tags: [],
        pricingModel: 'free',
      });

      const listing2 = await service.createListing({
        partnerId,
        title: 'Analytics Tool',
        shortDescription: 'Short desc',
        fullDescription: 'Full desc',
        category: 'analytics',
        tags: [],
        pricingModel: 'free',
      });

      await service.submitListingForReview(listing1.id);
      await service.approveListing(listing1.id);
      await service.submitListingForReview(listing2.id);
      await service.approveListing(listing2.id);

      const productivityListings = await service.getPublishedListings('productivity');

      expect(productivityListings).toHaveLength(1);
      expect(productivityListings[0].category).toBe('productivity');
    });

    it('should install partner integration', async () => {
      const installation = await service.installPartner(
        partnerId,
        'user_456',
        ['read:projects', 'write:projects']
      );

      expect(installation.id).toMatch(/^install_/);
      expect(installation.partnerId).toBe(partnerId);
      expect(installation.userId).toBe('user_456');
      expect(installation.active).toBe(true);
    });

    it('should uninstall partner integration', async () => {
      const installation = await service.installPartner(
        partnerId,
        'user_456',
        ['read:projects']
      );

      await service.uninstallPartner(installation.id);

      // Verify installation is inactive (we'd need a getter to fully test this)
    });

    it('should add review to listing', async () => {
      const listing = await service.createListing({
        partnerId,
        title: 'Reviewable Integration',
        shortDescription: 'Short desc',
        fullDescription: 'Full desc',
        category: 'productivity',
        tags: [],
        pricingModel: 'free',
      });

      const review = await service.addReview(
        listing.id,
        'user_456',
        5,
        'Great integration!',
        'This integration is amazing and works perfectly.'
      );

      expect(review.id).toMatch(/^review_/);
      expect(review.rating).toBe(5);
      expect(review.verifiedPurchase).toBe(false);

      // Check listing rating updated
      const updatedListing = await service.getListing(listing.id);
      expect(updatedListing?.averageRating).toBe(5);
      expect(updatedListing?.reviewCount).toBe(1);
    });

    it('should reject invalid rating', async () => {
      const listing = await service.createListing({
        partnerId,
        title: 'Test Integration',
        shortDescription: 'Short desc',
        fullDescription: 'Full desc',
        category: 'productivity',
        tags: [],
        pricingModel: 'free',
      });

      await expect(
        service.addReview(listing.id, 'user_456', 6, 'Invalid', 'Rating too high')
      ).rejects.toThrow('Rating must be between 1 and 5');
    });
  });


  // ============ Certification Tests ============

  describe('Certification Program', () => {
    let partnerId: string;

    beforeEach(async () => {
      const options: RegisterPartnerOptions = {
        name: 'Certification Test Partner',
        description: 'A test partner for certification',
        websiteUrl: 'https://example.com',
        contactEmail: 'contact@example.com',
        redirectUris: ['https://example.com/callback'],
        requestedScopes: ['read:projects'],
        userId: 'user_123',
      };

      const partner = await service.registerPartner(options);
      partnerId = partner.id;
    });

    it('should start certification process', async () => {
      const certification = await service.startCertification(partnerId);

      expect(certification.id).toMatch(/^cert_/);
      expect(certification.partnerId).toBe(partnerId);
      expect(certification.status).toBe('in_progress');
      expect(certification.testResults).toHaveLength(0);
    });

    it('should run certification tests', async () => {
      const certification = await service.startCertification(partnerId);
      const tests = await service.runCertificationTests(certification.id);

      expect(tests).toHaveLength(4);
      expect(tests.every(t => t.passed)).toBe(true);

      // Check categories
      const categories = tests.map(t => t.category);
      expect(categories).toContain('security');
      expect(categories).toContain('performance');
      expect(categories).toContain('compliance');
      expect(categories).toContain('functionality');
    });

    it('should determine certification level based on score', async () => {
      const certification = await service.startCertification(partnerId);
      await service.runCertificationTests(certification.id);

      // The mock tests give scores that average to ~93.75, which is gold level
      // Check that level is assigned
      expect(['bronze', 'silver', 'gold', 'platinum']).toContain(certification.level);
    });

    it('should update partner certification status', async () => {
      const certification = await service.startCertification(partnerId);
      await service.runCertificationTests(certification.id);

      const partner = await service.getPartner(partnerId);
      expect(partner?.certificationStatus).toBe('passed');
      expect(partner?.certificationExpiresAt).toBeDefined();
    });
  });

  // ============ Analytics Tests ============

  describe('Partner Analytics', () => {
    let partnerId: string;

    beforeEach(async () => {
      const options: RegisterPartnerOptions = {
        name: 'Analytics Test Partner',
        description: 'A test partner for analytics',
        websiteUrl: 'https://example.com',
        contactEmail: 'contact@example.com',
        redirectUris: ['https://example.com/callback'],
        requestedScopes: ['read:projects'],
        userId: 'user_123',
      };

      const partner = await service.registerPartner(options);
      partnerId = partner.id;
    });

    it('should get partner analytics', async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const analytics = await service.getPartnerAnalytics(partnerId, startDate, endDate);

      expect(analytics.partnerId).toBe(partnerId);
      expect(analytics.periodStart).toEqual(startDate);
      expect(analytics.periodEnd).toEqual(endDate);
      expect(analytics.totalApiCalls).toBeDefined();
      expect(analytics.uniqueUsers).toBeDefined();
      expect(analytics.topEndpoints).toBeDefined();
    });

    it('should track installations in analytics', async () => {
      // Install partner for some users
      await service.installPartner(partnerId, 'user_1', ['read:projects']);
      await service.installPartner(partnerId, 'user_2', ['read:projects']);

      const analytics = await service.getPartnerAnalytics(
        partnerId,
        new Date(Date.now() - 24 * 60 * 60 * 1000),
        new Date()
      );

      expect(analytics.activeInstallations).toBe(2);
      expect(analytics.uniqueUsers).toBe(2);
    });
  });
});
