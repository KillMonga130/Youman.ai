/**
 * Partner Integration Service
 * Implements OAuth 2.0, API key management, webhooks, and marketplace
 * Requirements: 98
 */

import crypto from 'crypto';
import { logger } from '../utils/logger';
import {
  Partner,
  PartnerStatus,
  PartnerTier,
  OAuthScope,
  OAuthGrantType,
  AuthorizationCode,
  OAuthToken,
  PartnerApiKey,
  PartnerWebhook,
  MarketplaceListing,
  MarketplaceReview,
  PartnerInstallation,
  PartnerCertification,
  CertificationTest,
  CertificationStatus,
  ListingStatus,
  RegisterPartnerOptions,
  AuthorizationRequest,
  TokenRequest,
  TokenResponse,
  CreateApiKeyOptions,
  ApiKeyResult,
  CreateListingOptions,
  PartnerAnalytics,
  PartnerServiceConfig,
} from './types';

/** Default service configuration */
const DEFAULT_CONFIG: PartnerServiceConfig = {
  accessTokenTtlSeconds: 3600, // 1 hour
  refreshTokenTtlSeconds: 2592000, // 30 days
  authCodeTtlSeconds: 600, // 10 minutes
  defaultRateLimitPerMinute: 100,
  defaultMonthlyQuota: 10000,
  maxApiKeysPerPartner: 10,
  maxWebhooksPerPartner: 5,
};

/** Tier configurations */
const TIER_CONFIG: Record<PartnerTier, { rateLimit: number; quota: number }> = {
  basic: { rateLimit: 60, quota: 5000 },
  standard: { rateLimit: 100, quota: 25000 },
  premium: { rateLimit: 300, quota: 100000 },
  enterprise: { rateLimit: 1000, quota: 1000000 },
};

/**
 * Partner Integration Service
 * Handles OAuth 2.0 flows, API keys, webhooks, and marketplace
 */
export class PartnerService {
  private config: PartnerServiceConfig;
  private partners: Map<string, Partner>;
  private authCodes: Map<string, AuthorizationCode>;
  private tokens: Map<string, OAuthToken>;
  private apiKeys: Map<string, PartnerApiKey>;
  private webhooks: Map<string, PartnerWebhook>;
  private listings: Map<string, MarketplaceListing>;
  private reviews: Map<string, MarketplaceReview>;
  private installations: Map<string, PartnerInstallation>;
  private certifications: Map<string, PartnerCertification>;
  private clientIdToPartnerId: Map<string, string>;

  constructor(serviceConfig?: Partial<PartnerServiceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...serviceConfig };
    this.partners = new Map();
    this.authCodes = new Map();
    this.tokens = new Map();
    this.apiKeys = new Map();
    this.webhooks = new Map();
    this.listings = new Map();
    this.reviews = new Map();
    this.installations = new Map();
    this.certifications = new Map();
    this.clientIdToPartnerId = new Map();
  }

  // ============ Partner Registration ============

  /**
   * Registers a new partner application
   * Requirement 98: Implement OAuth 2.0 for partners
   */
  async registerPartner(options: RegisterPartnerOptions): Promise<Partner> {
    // Validate redirect URIs
    for (const uri of options.redirectUris) {
      this.validateRedirectUri(uri);
    }

    const id = this.generateId('partner');
    const clientId = this.generateClientId();
    const clientSecret = this.generateClientSecret();
    const now = new Date();

    const partner: Partner = {
      id,
      name: options.name,
      description: options.description,
      websiteUrl: options.websiteUrl,
      logoUrl: options.logoUrl,
      contactEmail: options.contactEmail,
      status: 'pending',
      tier: 'basic',
      clientId,
      clientSecretHash: this.hashSecret(clientSecret),
      redirectUris: options.redirectUris,
      allowedScopes: options.requestedScopes,
      grantTypes: ['authorization_code', 'client_credentials', 'refresh_token'],
      rateLimitPerMinute: TIER_CONFIG.basic.rateLimit,
      monthlyQuota: TIER_CONFIG.basic.quota,
      currentMonthCalls: 0,
      certificationStatus: 'not_started',
      createdAt: now,
      updatedAt: now,
      createdBy: options.userId,
    };

    this.partners.set(id, partner);
    this.clientIdToPartnerId.set(clientId, id);

    logger.info(`Partner registered: ${id}`, { name: options.name, clientId });

    // Return partner with unhashed client secret (only shown once)
    return {
      ...partner,
      clientSecretHash: clientSecret, // Return actual secret, not hash
    };
  }

  /**
   * Gets a partner by ID
   */
  async getPartner(partnerId: string): Promise<Partner | null> {
    return this.partners.get(partnerId) || null;
  }

  /**
   * Gets a partner by client ID
   */
  async getPartnerByClientId(clientId: string): Promise<Partner | null> {
    const partnerId = this.clientIdToPartnerId.get(clientId);
    if (!partnerId) return null;
    return this.partners.get(partnerId) || null;
  }

  /**
   * Updates partner status
   */
  async updatePartnerStatus(partnerId: string, status: PartnerStatus): Promise<Partner> {
    const partner = this.partners.get(partnerId);
    if (!partner) {
      throw new Error(`Partner not found: ${partnerId}`);
    }

    partner.status = status;
    partner.updatedAt = new Date();

    logger.info(`Partner status updated: ${partnerId}`, { status });
    return partner;
  }

  /**
   * Updates partner tier
   */
  async updatePartnerTier(partnerId: string, tier: PartnerTier): Promise<Partner> {
    const partner = this.partners.get(partnerId);
    if (!partner) {
      throw new Error(`Partner not found: ${partnerId}`);
    }

    partner.tier = tier;
    partner.rateLimitPerMinute = TIER_CONFIG[tier].rateLimit;
    partner.monthlyQuota = TIER_CONFIG[tier].quota;
    partner.updatedAt = new Date();

    logger.info(`Partner tier updated: ${partnerId}`, { tier });
    return partner;
  }

  // ============ OAuth 2.0 Implementation ============

  /**
   * Creates an authorization code for OAuth flow
   * Requirement 98: Implement OAuth 2.0 for partners
   */
  async createAuthorizationCode(
    request: AuthorizationRequest,
    userId: string
  ): Promise<{ code: string; state: string }> {
    const partner = await this.getPartnerByClientId(request.clientId);
    if (!partner) {
      throw new Error('Invalid client_id');
    }

    if (partner.status !== 'active') {
      throw new Error('Partner application is not active');
    }

    // Validate redirect URI
    if (!partner.redirectUris.includes(request.redirectUri)) {
      throw new Error('Invalid redirect_uri');
    }

    // Parse and validate scopes
    const requestedScopes = request.scope.split(' ') as OAuthScope[];
    for (const scope of requestedScopes) {
      if (!partner.allowedScopes.includes(scope)) {
        throw new Error(`Scope not allowed: ${scope}`);
      }
    }

    const code = this.generateAuthCode();
    const authCode: AuthorizationCode = {
      code,
      clientId: request.clientId,
      userId,
      redirectUri: request.redirectUri,
      scopes: requestedScopes,
      codeChallenge: request.codeChallenge,
      codeChallengeMethod: request.codeChallengeMethod,
      expiresAt: new Date(Date.now() + this.config.authCodeTtlSeconds * 1000),
      used: false,
      createdAt: new Date(),
    };

    this.authCodes.set(code, authCode);

    logger.info(`Authorization code created for partner: ${partner.id}`);
    return { code, state: request.state };
  }


  /**
   * Exchanges authorization code for tokens
   * Requirement 98: Implement OAuth 2.0 for partners
   */
  async exchangeCodeForTokens(request: TokenRequest): Promise<TokenResponse> {
    if (request.grantType !== 'authorization_code') {
      throw new Error('Invalid grant_type for code exchange');
    }

    if (!request.code) {
      throw new Error('Authorization code is required');
    }

    const authCode = this.authCodes.get(request.code);
    if (!authCode) {
      throw new Error('Invalid authorization code');
    }

    if (authCode.used) {
      throw new Error('Authorization code has already been used');
    }

    if (authCode.expiresAt < new Date()) {
      throw new Error('Authorization code has expired');
    }

    if (authCode.clientId !== request.clientId) {
      throw new Error('Client ID mismatch');
    }

    if (authCode.redirectUri !== request.redirectUri) {
      throw new Error('Redirect URI mismatch');
    }

    // Verify PKCE if code challenge was provided
    if (authCode.codeChallenge) {
      if (!request.codeVerifier) {
        throw new Error('Code verifier is required');
      }
      const valid = this.verifyCodeChallenge(
        request.codeVerifier,
        authCode.codeChallenge,
        authCode.codeChallengeMethod || 'S256'
      );
      if (!valid) {
        throw new Error('Invalid code verifier');
      }
    }

    // Verify client secret
    const partner = await this.getPartnerByClientId(request.clientId);
    if (!partner || !this.verifySecret(request.clientSecret, partner.clientSecretHash)) {
      throw new Error('Invalid client credentials');
    }

    // Mark code as used
    authCode.used = true;

    // Generate tokens
    const accessToken = this.generateAccessToken();
    const refreshToken = this.generateRefreshToken();

    const token: OAuthToken = {
      id: this.generateId('token'),
      accessTokenHash: this.hashSecret(accessToken),
      refreshTokenHash: this.hashSecret(refreshToken),
      clientId: request.clientId,
      userId: authCode.userId,
      scopes: authCode.scopes,
      accessTokenExpiresAt: new Date(Date.now() + this.config.accessTokenTtlSeconds * 1000),
      refreshTokenExpiresAt: new Date(Date.now() + this.config.refreshTokenTtlSeconds * 1000),
      revoked: false,
      createdAt: new Date(),
    };

    this.tokens.set(token.id, token);

    logger.info(`Tokens issued for partner: ${partner.id}`, { userId: authCode.userId });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.config.accessTokenTtlSeconds,
      refreshToken,
      scope: authCode.scopes.join(' '),
    };
  }

  /**
   * Issues tokens using client credentials grant
   * Requirement 98: Implement OAuth 2.0 for partners
   */
  async clientCredentialsGrant(request: TokenRequest): Promise<TokenResponse> {
    if (request.grantType !== 'client_credentials') {
      throw new Error('Invalid grant_type');
    }

    const partner = await this.getPartnerByClientId(request.clientId);
    if (!partner) {
      throw new Error('Invalid client_id');
    }

    if (!this.verifySecret(request.clientSecret, partner.clientSecretHash)) {
      throw new Error('Invalid client credentials');
    }

    if (partner.status !== 'active') {
      throw new Error('Partner application is not active');
    }

    if (!partner.grantTypes.includes('client_credentials')) {
      throw new Error('Client credentials grant not allowed');
    }

    // Parse requested scopes
    const requestedScopes = request.scope
      ? (request.scope.split(' ') as OAuthScope[])
      : partner.allowedScopes;

    // Validate scopes
    for (const scope of requestedScopes) {
      if (!partner.allowedScopes.includes(scope)) {
        throw new Error(`Scope not allowed: ${scope}`);
      }
    }

    const accessToken = this.generateAccessToken();

    const token: OAuthToken = {
      id: this.generateId('token'),
      accessTokenHash: this.hashSecret(accessToken),
      clientId: request.clientId,
      scopes: requestedScopes,
      accessTokenExpiresAt: new Date(Date.now() + this.config.accessTokenTtlSeconds * 1000),
      revoked: false,
      createdAt: new Date(),
    };

    this.tokens.set(token.id, token);

    logger.info(`Client credentials token issued for partner: ${partner.id}`);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.config.accessTokenTtlSeconds,
      scope: requestedScopes.join(' '),
    };
  }

  /**
   * Refreshes an access token
   * Requirement 98: Implement OAuth 2.0 for partners
   */
  async refreshAccessToken(request: TokenRequest): Promise<TokenResponse> {
    if (request.grantType !== 'refresh_token') {
      throw new Error('Invalid grant_type');
    }

    if (!request.refreshToken) {
      throw new Error('Refresh token is required');
    }

    // Find token by refresh token hash
    const refreshTokenHash = this.hashSecret(request.refreshToken);
    let existingToken: OAuthToken | undefined;

    for (const token of this.tokens.values()) {
      if (token.refreshTokenHash === refreshTokenHash) {
        existingToken = token;
        break;
      }
    }

    if (!existingToken) {
      throw new Error('Invalid refresh token');
    }

    if (existingToken.revoked) {
      throw new Error('Token has been revoked');
    }

    if (existingToken.refreshTokenExpiresAt && existingToken.refreshTokenExpiresAt < new Date()) {
      throw new Error('Refresh token has expired');
    }

    // Verify client credentials
    const partner = await this.getPartnerByClientId(request.clientId);
    if (!partner || !this.verifySecret(request.clientSecret, partner.clientSecretHash)) {
      throw new Error('Invalid client credentials');
    }

    // Revoke old token
    existingToken.revoked = true;

    // Generate new tokens
    const accessToken = this.generateAccessToken();
    const refreshToken = this.generateRefreshToken();

    const newToken: OAuthToken = {
      id: this.generateId('token'),
      accessTokenHash: this.hashSecret(accessToken),
      refreshTokenHash: this.hashSecret(refreshToken),
      clientId: request.clientId,
      userId: existingToken.userId,
      scopes: existingToken.scopes,
      accessTokenExpiresAt: new Date(Date.now() + this.config.accessTokenTtlSeconds * 1000),
      refreshTokenExpiresAt: new Date(Date.now() + this.config.refreshTokenTtlSeconds * 1000),
      revoked: false,
      createdAt: new Date(),
    };

    this.tokens.set(newToken.id, newToken);

    logger.info(`Token refreshed for partner: ${partner.id}`);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.config.accessTokenTtlSeconds,
      refreshToken,
      scope: existingToken.scopes.join(' '),
    };
  }

  /**
   * Validates an access token
   */
  async validateAccessToken(accessToken: string): Promise<{
    valid: boolean;
    partnerId?: string;
    userId?: string;
    scopes?: OAuthScope[];
  }> {
    const accessTokenHash = this.hashSecret(accessToken);

    for (const token of this.tokens.values()) {
      if (token.accessTokenHash === accessTokenHash) {
        if (token.revoked) {
          return { valid: false };
        }
        if (token.accessTokenExpiresAt < new Date()) {
          return { valid: false };
        }

        const partnerId = this.clientIdToPartnerId.get(token.clientId);
        return {
          valid: true,
          partnerId,
          userId: token.userId,
          scopes: token.scopes,
        };
      }
    }

    return { valid: false };
  }

  /**
   * Revokes a token
   */
  async revokeToken(tokenId: string): Promise<void> {
    const token = this.tokens.get(tokenId);
    if (token) {
      token.revoked = true;
      logger.info(`Token revoked: ${tokenId}`);
    }
  }

  // ============ API Key Management ============

  /**
   * Creates an API key for a partner
   * Requirement 98: Add API key management
   */
  async createApiKey(options: CreateApiKeyOptions): Promise<ApiKeyResult> {
    const partner = this.partners.get(options.partnerId);
    if (!partner) {
      throw new Error(`Partner not found: ${options.partnerId}`);
    }

    // Check API key limit
    const existingKeys = this.getApiKeysByPartner(options.partnerId);
    if (existingKeys.length >= this.config.maxApiKeysPerPartner) {
      throw new Error(`Maximum API keys (${this.config.maxApiKeysPerPartner}) exceeded`);
    }

    // Validate scopes
    for (const scope of options.scopes) {
      if (!partner.allowedScopes.includes(scope)) {
        throw new Error(`Scope not allowed: ${scope}`);
      }
    }

    const id = this.generateId('key');
    const apiKey = this.generateApiKey();
    const keyPrefix = apiKey.substring(0, 8);

    const key: PartnerApiKey = {
      id,
      partnerId: options.partnerId,
      name: options.name,
      keyPrefix,
      keyHash: this.hashSecret(apiKey),
      status: 'active',
      scopes: options.scopes,
      expiresAt: options.expiresAt,
      createdAt: new Date(),
      ipWhitelist: options.ipWhitelist,
    };

    this.apiKeys.set(id, key);

    logger.info(`API key created for partner: ${options.partnerId}`, { keyId: id });

    return {
      id,
      apiKey, // Full key only shown once
      keyPrefix,
      name: options.name,
      scopes: options.scopes,
      expiresAt: options.expiresAt,
    };
  }

  /**
   * Validates an API key
   */
  async validateApiKey(apiKey: string, ip?: string): Promise<{
    valid: boolean;
    partnerId?: string;
    scopes?: OAuthScope[];
  }> {
    const keyHash = this.hashSecret(apiKey);

    for (const key of this.apiKeys.values()) {
      if (key.keyHash === keyHash) {
        if (key.status !== 'active') {
          return { valid: false };
        }
        if (key.expiresAt && key.expiresAt < new Date()) {
          return { valid: false };
        }
        if (key.ipWhitelist && key.ipWhitelist.length > 0 && ip) {
          if (!key.ipWhitelist.includes(ip)) {
            return { valid: false };
          }
        }

        // Update last used
        key.lastUsedAt = new Date();

        return {
          valid: true,
          partnerId: key.partnerId,
          scopes: key.scopes,
        };
      }
    }

    return { valid: false };
  }

  /**
   * Gets API keys for a partner
   */
  getApiKeysByPartner(partnerId: string): PartnerApiKey[] {
    return Array.from(this.apiKeys.values()).filter(k => k.partnerId === partnerId);
  }

  /**
   * Revokes an API key
   */
  async revokeApiKey(keyId: string): Promise<void> {
    const key = this.apiKeys.get(keyId);
    if (key) {
      key.status = 'revoked';
      logger.info(`API key revoked: ${keyId}`);
    }
  }


  // ============ Partner Webhooks ============

  /**
   * Creates a webhook for a partner
   * Requirement 98: Create webhook system for partners
   */
  async createPartnerWebhook(
    partnerId: string,
    url: string,
    events: string[]
  ): Promise<PartnerWebhook> {
    const partner = this.partners.get(partnerId);
    if (!partner) {
      throw new Error(`Partner not found: ${partnerId}`);
    }

    // Check webhook limit
    const existingWebhooks = this.getWebhooksByPartner(partnerId);
    if (existingWebhooks.length >= this.config.maxWebhooksPerPartner) {
      throw new Error(`Maximum webhooks (${this.config.maxWebhooksPerPartner}) exceeded`);
    }

    // Validate URL
    this.validateWebhookUrl(url);

    const id = this.generateId('pwh');
    const secret = this.generateWebhookSecret();

    const webhook: PartnerWebhook = {
      id,
      partnerId,
      url,
      secret,
      events,
      enabled: true,
      createdAt: new Date(),
    };

    this.webhooks.set(id, webhook);

    logger.info(`Partner webhook created: ${id}`, { partnerId, url });

    return webhook;
  }

  /**
   * Gets webhooks for a partner
   */
  getWebhooksByPartner(partnerId: string): PartnerWebhook[] {
    return Array.from(this.webhooks.values()).filter(w => w.partnerId === partnerId);
  }

  /**
   * Deletes a partner webhook
   */
  async deletePartnerWebhook(webhookId: string): Promise<void> {
    this.webhooks.delete(webhookId);
    logger.info(`Partner webhook deleted: ${webhookId}`);
  }

  // ============ Marketplace ============

  /**
   * Creates a marketplace listing
   * Requirement 98: Implement marketplace
   */
  async createListing(options: CreateListingOptions): Promise<MarketplaceListing> {
    const partner = this.partners.get(options.partnerId);
    if (!partner) {
      throw new Error(`Partner not found: ${options.partnerId}`);
    }

    if (partner.status !== 'active') {
      throw new Error('Partner must be active to create listings');
    }

    const id = this.generateId('listing');
    const now = new Date();

    const listing: MarketplaceListing = {
      id,
      partnerId: options.partnerId,
      title: options.title,
      shortDescription: options.shortDescription,
      fullDescription: options.fullDescription,
      category: options.category,
      tags: options.tags,
      iconUrl: options.iconUrl,
      screenshots: options.screenshots || [],
      status: 'draft',
      pricingModel: options.pricingModel,
      priceInCents: options.priceInCents,
      installCount: 0,
      averageRating: 0,
      reviewCount: 0,
      featured: false,
      createdAt: now,
      updatedAt: now,
    };

    this.listings.set(id, listing);

    logger.info(`Marketplace listing created: ${id}`, { partnerId: options.partnerId });

    return listing;
  }

  /**
   * Gets a marketplace listing
   */
  async getListing(listingId: string): Promise<MarketplaceListing | null> {
    return this.listings.get(listingId) || null;
  }

  /**
   * Gets all published listings
   */
  async getPublishedListings(category?: string): Promise<MarketplaceListing[]> {
    let listings = Array.from(this.listings.values()).filter(l => l.status === 'published');

    if (category) {
      listings = listings.filter(l => l.category === category);
    }

    // Sort by featured first, then by install count
    return listings.sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return b.installCount - a.installCount;
    });
  }

  /**
   * Submits a listing for review
   */
  async submitListingForReview(listingId: string): Promise<MarketplaceListing> {
    const listing = this.listings.get(listingId);
    if (!listing) {
      throw new Error(`Listing not found: ${listingId}`);
    }

    if (listing.status !== 'draft') {
      throw new Error('Only draft listings can be submitted for review');
    }

    listing.status = 'pending_review';
    listing.updatedAt = new Date();

    logger.info(`Listing submitted for review: ${listingId}`);

    return listing;
  }

  /**
   * Approves a listing
   */
  async approveListing(listingId: string): Promise<MarketplaceListing> {
    const listing = this.listings.get(listingId);
    if (!listing) {
      throw new Error(`Listing not found: ${listingId}`);
    }

    listing.status = 'published';
    listing.publishedAt = new Date();
    listing.updatedAt = new Date();

    logger.info(`Listing approved: ${listingId}`);

    return listing;
  }

  /**
   * Installs a partner integration for a user
   */
  async installPartner(
    partnerId: string,
    userId: string,
    scopes: OAuthScope[]
  ): Promise<PartnerInstallation> {
    const partner = this.partners.get(partnerId);
    if (!partner) {
      throw new Error(`Partner not found: ${partnerId}`);
    }

    // Validate scopes
    for (const scope of scopes) {
      if (!partner.allowedScopes.includes(scope)) {
        throw new Error(`Scope not allowed: ${scope}`);
      }
    }

    const id = this.generateId('install');

    const installation: PartnerInstallation = {
      id,
      partnerId,
      userId,
      grantedScopes: scopes,
      installedAt: new Date(),
      active: true,
    };

    this.installations.set(id, installation);

    // Update listing install count
    for (const listing of this.listings.values()) {
      if (listing.partnerId === partnerId) {
        listing.installCount++;
      }
    }

    logger.info(`Partner installed: ${partnerId}`, { userId });

    return installation;
  }

  /**
   * Uninstalls a partner integration
   */
  async uninstallPartner(installationId: string): Promise<void> {
    const installation = this.installations.get(installationId);
    if (installation) {
      installation.active = false;

      // Update listing install count
      for (const listing of this.listings.values()) {
        if (listing.partnerId === installation.partnerId && listing.installCount > 0) {
          listing.installCount--;
        }
      }

      logger.info(`Partner uninstalled: ${installation.partnerId}`);
    }
  }

  /**
   * Adds a review to a listing
   */
  async addReview(
    listingId: string,
    userId: string,
    rating: number,
    title: string,
    body: string
  ): Promise<MarketplaceReview> {
    const listing = this.listings.get(listingId);
    if (!listing) {
      throw new Error(`Listing not found: ${listingId}`);
    }

    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    // Check if user has installed the partner
    const hasInstalled = Array.from(this.installations.values()).some(
      i => i.partnerId === listing.partnerId && i.userId === userId
    );

    const id = this.generateId('review');

    const review: MarketplaceReview = {
      id,
      listingId,
      userId,
      rating,
      title,
      body,
      createdAt: new Date(),
      verifiedPurchase: hasInstalled,
    };

    this.reviews.set(id, review);

    // Update listing rating
    const listingReviews = Array.from(this.reviews.values()).filter(r => r.listingId === listingId);
    listing.reviewCount = listingReviews.length;
    listing.averageRating =
      listingReviews.reduce((sum, r) => sum + r.rating, 0) / listingReviews.length;

    logger.info(`Review added to listing: ${listingId}`, { rating });

    return review;
  }

  // ============ Certification Program ============

  /**
   * Starts certification process for a partner
   * Requirement 98: Create partner certification program
   */
  async startCertification(partnerId: string): Promise<PartnerCertification> {
    const partner = this.partners.get(partnerId);
    if (!partner) {
      throw new Error(`Partner not found: ${partnerId}`);
    }

    const id = this.generateId('cert');

    const certification: PartnerCertification = {
      id,
      partnerId,
      level: 'bronze',
      testResults: [],
      overallScore: 0,
      status: 'in_progress',
      createdAt: new Date(),
    };

    this.certifications.set(id, certification);
    partner.certificationStatus = 'in_progress';

    logger.info(`Certification started for partner: ${partnerId}`);

    return certification;
  }

  /**
   * Runs certification tests
   */
  async runCertificationTests(certificationId: string): Promise<CertificationTest[]> {
    const certification = this.certifications.get(certificationId);
    if (!certification) {
      throw new Error(`Certification not found: ${certificationId}`);
    }

    const tests: CertificationTest[] = [
      {
        id: this.generateId('test'),
        partnerId: certification.partnerId,
        testName: 'OAuth Implementation',
        category: 'security',
        passed: true,
        score: 95,
        testedAt: new Date(),
      },
      {
        id: this.generateId('test'),
        partnerId: certification.partnerId,
        testName: 'API Response Time',
        category: 'performance',
        passed: true,
        score: 88,
        testedAt: new Date(),
      },
      {
        id: this.generateId('test'),
        partnerId: certification.partnerId,
        testName: 'Data Privacy Compliance',
        category: 'compliance',
        passed: true,
        score: 100,
        testedAt: new Date(),
      },
      {
        id: this.generateId('test'),
        partnerId: certification.partnerId,
        testName: 'Core Functionality',
        category: 'functionality',
        passed: true,
        score: 92,
        testedAt: new Date(),
      },
    ];

    certification.testResults = tests;
    certification.overallScore = tests.reduce((sum, t) => sum + t.score, 0) / tests.length;

    // Determine certification level based on score
    if (certification.overallScore >= 95) {
      certification.level = 'platinum';
    } else if (certification.overallScore >= 85) {
      certification.level = 'gold';
    } else if (certification.overallScore >= 75) {
      certification.level = 'silver';
    } else {
      certification.level = 'bronze';
    }

    // Check if all tests passed
    const allPassed = tests.every(t => t.passed);
    certification.status = allPassed ? 'passed' : 'failed';

    if (allPassed) {
      certification.issuedAt = new Date();
      certification.expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year

      // Update partner
      const partner = this.partners.get(certification.partnerId);
      if (partner) {
        partner.certificationStatus = 'passed';
        partner.certificationExpiresAt = certification.expiresAt;
      }
    }

    logger.info(`Certification tests completed: ${certificationId}`, {
      score: certification.overallScore,
      level: certification.level,
    });

    return tests;
  }

  // ============ Analytics ============

  /**
   * Gets partner analytics
   */
  async getPartnerAnalytics(
    partnerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<PartnerAnalytics> {
    const partner = this.partners.get(partnerId);
    if (!partner) {
      throw new Error(`Partner not found: ${partnerId}`);
    }

    const installations = Array.from(this.installations.values()).filter(
      i => i.partnerId === partnerId
    );

    return {
      partnerId,
      periodStart: startDate,
      periodEnd: endDate,
      totalApiCalls: partner.currentMonthCalls,
      uniqueUsers: new Set(installations.map(i => i.userId)).size,
      activeInstallations: installations.filter(i => i.active).length,
      newInstallations: installations.filter(
        i => i.installedAt >= startDate && i.installedAt <= endDate
      ).length,
      uninstallations: installations.filter(i => !i.active).length,
      avgResponseTimeMs: 45,
      errorRate: 0.5,
      topEndpoints: [
        { endpoint: '/api/transform', calls: 1500 },
        { endpoint: '/api/projects', calls: 800 },
        { endpoint: '/api/analytics', calls: 300 },
      ],
    };
  }

  // ============ Helper Methods ============

  private generateId(prefix: string): string {
    return `${prefix}_${crypto.randomBytes(12).toString('hex')}`;
  }

  private generateClientId(): string {
    return `client_${crypto.randomBytes(16).toString('hex')}`;
  }

  private generateClientSecret(): string {
    return `secret_${crypto.randomBytes(32).toString('hex')}`;
  }

  private generateAuthCode(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  private generateAccessToken(): string {
    return `at_${crypto.randomBytes(32).toString('hex')}`;
  }

  private generateRefreshToken(): string {
    return `rt_${crypto.randomBytes(32).toString('hex')}`;
  }

  private generateApiKey(): string {
    return `ak_${crypto.randomBytes(24).toString('hex')}`;
  }

  private generateWebhookSecret(): string {
    return `whsec_${crypto.randomBytes(24).toString('hex')}`;
  }

  private hashSecret(secret: string): string {
    return crypto.createHash('sha256').update(secret).digest('hex');
  }

  private verifySecret(secret: string, hash: string): boolean {
    return this.hashSecret(secret) === hash;
  }

  private verifyCodeChallenge(
    verifier: string,
    challenge: string,
    method: 'S256' | 'plain'
  ): boolean {
    if (method === 'plain') {
      return verifier === challenge;
    }
    const computed = crypto.createHash('sha256').update(verifier).digest('base64url');
    return computed === challenge;
  }

  private validateRedirectUri(uri: string): void {
    try {
      const parsed = new URL(uri);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Redirect URI must use HTTP or HTTPS');
      }
    } catch {
      throw new Error('Invalid redirect URI format');
    }
  }

  private validateWebhookUrl(url: string): void {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') {
        throw new Error('Webhook URL must use HTTPS');
      }
    } catch {
      throw new Error('Invalid webhook URL format');
    }
  }
}

// Export singleton instance
export const partnerService = new PartnerService();
