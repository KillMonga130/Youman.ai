/**
 * Partner Integration Framework Types
 * Type definitions for partner OAuth, API keys, webhooks, and marketplace
 * Requirements: 98
 */

/**
 * Partner status
 */
export type PartnerStatus = 'pending' | 'active' | 'suspended' | 'revoked';

/**
 * Partner tier levels
 */
export type PartnerTier = 'basic' | 'standard' | 'premium' | 'enterprise';

/**
 * API key status
 */
export type ApiKeyStatus = 'active' | 'revoked' | 'expired';

/**
 * OAuth grant types supported
 */
export type OAuthGrantType = 'authorization_code' | 'client_credentials' | 'refresh_token';

/**
 * OAuth scope definitions
 */
export type OAuthScope =
  | 'read:projects'
  | 'write:projects'
  | 'read:transformations'
  | 'write:transformations'
  | 'read:analytics'
  | 'read:user'
  | 'write:user'
  | 'admin';

/**
 * Certification status for partners
 */
export type CertificationStatus = 'not_started' | 'in_progress' | 'passed' | 'failed' | 'expired';

/**
 * Marketplace listing status
 */
export type ListingStatus = 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived';

/**
 * Partner application/organization
 */
export interface Partner {
  /** Unique partner identifier */
  id: string;
  /** Partner organization name */
  name: string;
  /** Partner description */
  description: string;
  /** Partner website URL */
  websiteUrl: string;
  /** Partner logo URL */
  logoUrl?: string;
  /** Contact email */
  contactEmail: string;
  /** Partner status */
  status: PartnerStatus;
  /** Partner tier */
  tier: PartnerTier;
  /** OAuth client ID */
  clientId: string;
  /** OAuth client secret (hashed) */
  clientSecretHash: string;
  /** Allowed redirect URIs */
  redirectUris: string[];
  /** Allowed OAuth scopes */
  allowedScopes: OAuthScope[];
  /** Allowed grant types */
  grantTypes: OAuthGrantType[];
  /** Rate limit per minute */
  rateLimitPerMinute: number;
  /** Monthly API call quota */
  monthlyQuota: number;
  /** Current month API calls */
  currentMonthCalls: number;
  /** Certification status */
  certificationStatus: CertificationStatus;
  /** Certification expiry date */
  certificationExpiresAt?: Date;
  /** Creation timestamp */
  createdAt: Date;
  /** Last updated timestamp */
  updatedAt: Date;
  /** User ID who created this partner */
  createdBy: string;
}

/**
 * OAuth authorization code
 */
export interface AuthorizationCode {
  /** Authorization code */
  code: string;
  /** Partner client ID */
  clientId: string;
  /** User ID who authorized */
  userId: string;
  /** Redirect URI used */
  redirectUri: string;
  /** Granted scopes */
  scopes: OAuthScope[];
  /** Code challenge for PKCE */
  codeChallenge?: string;
  /** Code challenge method */
  codeChallengeMethod?: 'S256' | 'plain';
  /** Expiration timestamp */
  expiresAt: Date;
  /** Whether code has been used */
  used: boolean;
  /** Creation timestamp */
  createdAt: Date;
}

/**
 * OAuth access token
 */
export interface OAuthToken {
  /** Token identifier */
  id: string;
  /** Access token (hashed) */
  accessTokenHash: string;
  /** Refresh token (hashed) */
  refreshTokenHash?: string;
  /** Partner client ID */
  clientId: string;
  /** User ID (for authorization_code grant) */
  userId?: string;
  /** Granted scopes */
  scopes: OAuthScope[];
  /** Access token expiration */
  accessTokenExpiresAt: Date;
  /** Refresh token expiration */
  refreshTokenExpiresAt?: Date;
  /** Whether token is revoked */
  revoked: boolean;
  /** Creation timestamp */
  createdAt: Date;
}


/**
 * Partner API key
 */
export interface PartnerApiKey {
  /** Key identifier */
  id: string;
  /** Partner ID */
  partnerId: string;
  /** API key name/label */
  name: string;
  /** API key prefix (visible part) */
  keyPrefix: string;
  /** API key hash */
  keyHash: string;
  /** Key status */
  status: ApiKeyStatus;
  /** Allowed scopes */
  scopes: OAuthScope[];
  /** Last used timestamp */
  lastUsedAt?: Date;
  /** Expiration date */
  expiresAt?: Date;
  /** Creation timestamp */
  createdAt: Date;
  /** IP whitelist (optional) */
  ipWhitelist?: string[];
}

/**
 * Partner webhook subscription
 */
export interface PartnerWebhook {
  /** Webhook identifier */
  id: string;
  /** Partner ID */
  partnerId: string;
  /** Webhook URL */
  url: string;
  /** Webhook secret for signing */
  secret: string;
  /** Subscribed events */
  events: string[];
  /** Whether webhook is enabled */
  enabled: boolean;
  /** Creation timestamp */
  createdAt: Date;
  /** Last delivery timestamp */
  lastDeliveryAt?: Date;
}

/**
 * Marketplace listing
 */
export interface MarketplaceListing {
  /** Listing identifier */
  id: string;
  /** Partner ID */
  partnerId: string;
  /** Listing title */
  title: string;
  /** Short description */
  shortDescription: string;
  /** Full description (markdown) */
  fullDescription: string;
  /** Category */
  category: string;
  /** Tags */
  tags: string[];
  /** Icon URL */
  iconUrl?: string;
  /** Screenshot URLs */
  screenshots: string[];
  /** Listing status */
  status: ListingStatus;
  /** Pricing model */
  pricingModel: 'free' | 'paid' | 'freemium';
  /** Price in cents (if paid) */
  priceInCents?: number;
  /** Installation count */
  installCount: number;
  /** Average rating (1-5) */
  averageRating: number;
  /** Review count */
  reviewCount: number;
  /** Featured flag */
  featured: boolean;
  /** Creation timestamp */
  createdAt: Date;
  /** Last updated timestamp */
  updatedAt: Date;
  /** Published timestamp */
  publishedAt?: Date;
}

/**
 * Marketplace review
 */
export interface MarketplaceReview {
  /** Review identifier */
  id: string;
  /** Listing ID */
  listingId: string;
  /** User ID who wrote review */
  userId: string;
  /** Rating (1-5) */
  rating: number;
  /** Review title */
  title: string;
  /** Review body */
  body: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Whether review is verified purchase */
  verifiedPurchase: boolean;
}

/**
 * Partner installation by user
 */
export interface PartnerInstallation {
  /** Installation identifier */
  id: string;
  /** Partner ID */
  partnerId: string;
  /** User ID who installed */
  userId: string;
  /** Granted scopes */
  grantedScopes: OAuthScope[];
  /** Installation timestamp */
  installedAt: Date;
  /** Last used timestamp */
  lastUsedAt?: Date;
  /** Whether installation is active */
  active: boolean;
}

/**
 * Certification test result
 */
export interface CertificationTest {
  /** Test identifier */
  id: string;
  /** Partner ID */
  partnerId: string;
  /** Test name */
  testName: string;
  /** Test category */
  category: 'security' | 'performance' | 'compliance' | 'functionality';
  /** Whether test passed */
  passed: boolean;
  /** Test score (0-100) */
  score: number;
  /** Error message if failed */
  errorMessage?: string;
  /** Test timestamp */
  testedAt: Date;
}

/**
 * Partner certification
 */
export interface PartnerCertification {
  /** Certification identifier */
  id: string;
  /** Partner ID */
  partnerId: string;
  /** Certification level */
  level: 'bronze' | 'silver' | 'gold' | 'platinum';
  /** Test results */
  testResults: CertificationTest[];
  /** Overall score */
  overallScore: number;
  /** Status */
  status: CertificationStatus;
  /** Issue date */
  issuedAt?: Date;
  /** Expiry date */
  expiresAt?: Date;
  /** Creation timestamp */
  createdAt: Date;
}

// ============ Request/Response Types ============

/**
 * Options for registering a partner
 */
export interface RegisterPartnerOptions {
  /** Partner name */
  name: string;
  /** Description */
  description: string;
  /** Website URL */
  websiteUrl: string;
  /** Contact email */
  contactEmail: string;
  /** Logo URL */
  logoUrl?: string;
  /** Redirect URIs */
  redirectUris: string[];
  /** Requested scopes */
  requestedScopes: OAuthScope[];
  /** User ID creating the partner */
  userId: string;
}

/**
 * OAuth authorization request
 */
export interface AuthorizationRequest {
  /** Response type (must be 'code') */
  responseType: 'code';
  /** Client ID */
  clientId: string;
  /** Redirect URI */
  redirectUri: string;
  /** Requested scopes */
  scope: string;
  /** State parameter */
  state: string;
  /** PKCE code challenge */
  codeChallenge?: string;
  /** PKCE code challenge method */
  codeChallengeMethod?: 'S256' | 'plain';
}

/**
 * OAuth token request
 */
export interface TokenRequest {
  /** Grant type */
  grantType: OAuthGrantType;
  /** Client ID */
  clientId: string;
  /** Client secret */
  clientSecret: string;
  /** Authorization code (for authorization_code grant) */
  code?: string;
  /** Redirect URI (for authorization_code grant) */
  redirectUri?: string;
  /** PKCE code verifier */
  codeVerifier?: string;
  /** Refresh token (for refresh_token grant) */
  refreshToken?: string;
  /** Requested scopes (for client_credentials grant) */
  scope?: string;
}

/**
 * OAuth token response
 */
export interface TokenResponse {
  /** Access token */
  accessToken: string;
  /** Token type */
  tokenType: 'Bearer';
  /** Expires in seconds */
  expiresIn: number;
  /** Refresh token */
  refreshToken?: string;
  /** Granted scopes */
  scope: string;
}

/**
 * Create API key options
 */
export interface CreateApiKeyOptions {
  /** Partner ID */
  partnerId: string;
  /** Key name */
  name: string;
  /** Scopes */
  scopes: OAuthScope[];
  /** Expiration date */
  expiresAt?: Date;
  /** IP whitelist */
  ipWhitelist?: string[];
}

/**
 * API key creation result
 */
export interface ApiKeyResult {
  /** Key ID */
  id: string;
  /** Full API key (only shown once) */
  apiKey: string;
  /** Key prefix */
  keyPrefix: string;
  /** Key name */
  name: string;
  /** Scopes */
  scopes: OAuthScope[];
  /** Expiration date */
  expiresAt?: Date;
}

/**
 * Create marketplace listing options
 */
export interface CreateListingOptions {
  /** Partner ID */
  partnerId: string;
  /** Title */
  title: string;
  /** Short description */
  shortDescription: string;
  /** Full description */
  fullDescription: string;
  /** Category */
  category: string;
  /** Tags */
  tags: string[];
  /** Icon URL */
  iconUrl?: string;
  /** Screenshots */
  screenshots?: string[];
  /** Pricing model */
  pricingModel: 'free' | 'paid' | 'freemium';
  /** Price in cents */
  priceInCents?: number;
}

/**
 * GraphQL context for partner requests
 */
export interface PartnerGraphQLContext {
  /** Partner ID */
  partnerId?: string;
  /** User ID */
  userId?: string;
  /** Granted scopes */
  scopes: OAuthScope[];
  /** Request IP */
  ip: string;
}

/**
 * Partner analytics
 */
export interface PartnerAnalytics {
  /** Partner ID */
  partnerId: string;
  /** Period start */
  periodStart: Date;
  /** Period end */
  periodEnd: Date;
  /** Total API calls */
  totalApiCalls: number;
  /** Unique users */
  uniqueUsers: number;
  /** Active installations */
  activeInstallations: number;
  /** New installations */
  newInstallations: number;
  /** Uninstallations */
  uninstallations: number;
  /** Average response time ms */
  avgResponseTimeMs: number;
  /** Error rate percentage */
  errorRate: number;
  /** Top endpoints */
  topEndpoints: { endpoint: string; calls: number }[];
}

/**
 * Partner service configuration
 */
export interface PartnerServiceConfig {
  /** Access token TTL in seconds */
  accessTokenTtlSeconds: number;
  /** Refresh token TTL in seconds */
  refreshTokenTtlSeconds: number;
  /** Authorization code TTL in seconds */
  authCodeTtlSeconds: number;
  /** Default rate limit per minute */
  defaultRateLimitPerMinute: number;
  /** Default monthly quota */
  defaultMonthlyQuota: number;
  /** Max API keys per partner */
  maxApiKeysPerPartner: number;
  /** Max webhooks per partner */
  maxWebhooksPerPartner: number;
}
