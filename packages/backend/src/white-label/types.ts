/**
 * White-Label Service Types
 * Type definitions for branding customization, custom domains, and branded reports
 * Requirements: 60
 */

/**
 * White-label configuration status
 */
export type WhiteLabelStatus = 'draft' | 'active' | 'suspended';

/**
 * Domain verification status
 */
export type DomainStatus = 'pending' | 'verified' | 'failed' | 'expired';

/**
 * Report type for branded reports
 */
export type ReportType = 
  | 'transformation'
  | 'analytics'
  | 'detection'
  | 'plagiarism'
  | 'usage'
  | 'invoice';

/**
 * Font family options
 */
export type FontFamily = 
  | 'Inter'
  | 'Roboto'
  | 'Open Sans'
  | 'Lato'
  | 'Montserrat'
  | 'Poppins'
  | 'Source Sans Pro'
  | 'custom';

/**
 * Branding configuration
 */
export interface BrandingConfig {
  /** Unique branding configuration ID */
  id: string;
  /** User ID who owns this configuration */
  userId: string;
  /** Organization/company name */
  companyName: string;
  /** Logo URL (light mode) */
  logoUrl?: string;
  /** Logo URL (dark mode) */
  logoDarkUrl?: string;
  /** Favicon URL */
  faviconUrl?: string;
  /** Primary brand color (hex) */
  primaryColor: string;
  /** Secondary brand color (hex) */
  secondaryColor: string;
  /** Accent color (hex) */
  accentColor?: string;
  /** Background color (hex) */
  backgroundColor?: string;
  /** Text color (hex) */
  textColor?: string;
  /** Font family */
  fontFamily: FontFamily;
  /** Custom font URL (if fontFamily is 'custom') */
  customFontUrl?: string;
  /** Custom CSS overrides */
  customCss?: string;
  /** Email footer text */
  emailFooter?: string;
  /** Support email */
  supportEmail?: string;
  /** Support URL */
  supportUrl?: string;
  /** Terms of service URL */
  termsUrl?: string;
  /** Privacy policy URL */
  privacyUrl?: string;
  /** Remove default branding */
  removeDefaultBranding: boolean;
  /** Configuration status */
  status: WhiteLabelStatus;
  /** Creation timestamp */
  createdAt: Date;
  /** Last updated timestamp */
  updatedAt: Date;
}

/**
 * Custom domain configuration
 */
export interface CustomDomain {
  /** Unique domain ID */
  id: string;
  /** User ID who owns this domain */
  userId: string;
  /** Branding config ID */
  brandingId: string;
  /** Domain name */
  domain: string;
  /** Subdomain (if applicable) */
  subdomain?: string;
  /** Full hostname */
  hostname: string;
  /** Domain verification status */
  status: DomainStatus;
  /** DNS verification token */
  verificationToken: string;
  /** DNS TXT record name */
  txtRecordName: string;
  /** DNS TXT record value */
  txtRecordValue: string;
  /** SSL certificate status */
  sslStatus: 'pending' | 'active' | 'expired' | 'failed';
  /** SSL certificate expiry */
  sslExpiresAt?: Date;
  /** Last verification attempt */
  lastVerificationAt?: Date;
  /** Verification error message */
  verificationError?: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Last updated timestamp */
  updatedAt: Date;
}

/**
 * Branded report configuration
 */
export interface BrandedReport {
  /** Unique report ID */
  id: string;
  /** User ID who generated this report */
  userId: string;
  /** Branding config ID */
  brandingId: string;
  /** Report type */
  reportType: ReportType;
  /** Report title */
  title: string;
  /** Report data (JSON) */
  data: Record<string, unknown>;
  /** Generated PDF URL */
  pdfUrl?: string;
  /** Generated HTML content */
  htmlContent?: string;
  /** Creation timestamp */
  createdAt: Date;
}

/**
 * Branded assets (compiled from branding config)
 */
export interface BrandedAssets {
  /** CSS variables for theming */
  cssVariables: Record<string, string>;
  /** Compiled CSS */
  compiledCss: string;
  /** Logo URLs */
  logos: {
    light?: string;
    dark?: string;
    favicon?: string;
  };
  /** Company info */
  company: {
    name: string;
    supportEmail?: string;
    supportUrl?: string;
    termsUrl?: string;
    privacyUrl?: string;
  };
  /** Email template variables */
  emailVariables: Record<string, string>;
}

// ============ Request/Response Types ============

/**
 * Options for creating branding configuration
 */
export interface CreateBrandingOptions {
  /** User ID */
  userId: string;
  /** Company name */
  companyName: string;
  /** Logo URL */
  logoUrl?: string;
  /** Logo URL (dark mode) */
  logoDarkUrl?: string;
  /** Favicon URL */
  faviconUrl?: string;
  /** Primary color */
  primaryColor: string;
  /** Secondary color */
  secondaryColor: string;
  /** Accent color */
  accentColor?: string;
  /** Font family */
  fontFamily?: FontFamily;
  /** Custom font URL */
  customFontUrl?: string;
  /** Remove default branding */
  removeDefaultBranding?: boolean;
}

/**
 * Options for updating branding configuration
 */
export interface UpdateBrandingOptions {
  /** Company name */
  companyName?: string;
  /** Logo URL */
  logoUrl?: string;
  /** Logo URL (dark mode) */
  logoDarkUrl?: string;
  /** Favicon URL */
  faviconUrl?: string;
  /** Primary color */
  primaryColor?: string;
  /** Secondary color */
  secondaryColor?: string;
  /** Accent color */
  accentColor?: string;
  /** Background color */
  backgroundColor?: string;
  /** Text color */
  textColor?: string;
  /** Font family */
  fontFamily?: FontFamily;
  /** Custom font URL */
  customFontUrl?: string;
  /** Custom CSS */
  customCss?: string;
  /** Email footer */
  emailFooter?: string;
  /** Support email */
  supportEmail?: string;
  /** Support URL */
  supportUrl?: string;
  /** Terms URL */
  termsUrl?: string;
  /** Privacy URL */
  privacyUrl?: string;
  /** Remove default branding */
  removeDefaultBranding?: boolean;
}

/**
 * Options for setting up custom domain
 */
export interface SetupDomainOptions {
  /** User ID */
  userId: string;
  /** Branding config ID */
  brandingId: string;
  /** Domain name */
  domain: string;
  /** Subdomain (optional) */
  subdomain?: string;
}

/**
 * Domain verification result
 */
export interface DomainVerificationResult {
  /** Whether verification succeeded */
  verified: boolean;
  /** Domain status */
  status: DomainStatus;
  /** Error message if failed */
  error?: string;
  /** DNS records to configure */
  dnsRecords?: {
    type: string;
    name: string;
    value: string;
  }[];
}

/**
 * Options for generating branded report
 */
export interface GenerateReportOptions {
  /** User ID */
  userId: string;
  /** Branding config ID */
  brandingId: string;
  /** Report type */
  reportType: ReportType;
  /** Report title */
  title: string;
  /** Report data */
  data: Record<string, unknown>;
  /** Output format */
  format: 'pdf' | 'html' | 'both';
}

/**
 * White-label service configuration
 */
export interface WhiteLabelServiceConfig {
  /** Maximum custom domains per user */
  maxDomainsPerUser: number;
  /** Domain verification timeout in hours */
  verificationTimeoutHours: number;
  /** SSL certificate renewal days before expiry */
  sslRenewalDays: number;
  /** Default primary color */
  defaultPrimaryColor: string;
  /** Default secondary color */
  defaultSecondaryColor: string;
}
