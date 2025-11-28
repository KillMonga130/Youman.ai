/**
 * White-Label Service
 * Implements branding customization, custom domains, and branded reports
 * Requirements: 60
 */

import crypto from 'crypto';
import { logger } from '../utils/logger';
import {
  BrandingConfig,
  CustomDomain,
  BrandedReport,
  BrandedAssets,
  CreateBrandingOptions,
  UpdateBrandingOptions,
  SetupDomainOptions,
  DomainVerificationResult,
  GenerateReportOptions,
  WhiteLabelServiceConfig,
  FontFamily,
} from './types';

/** Default service configuration */
const DEFAULT_CONFIG: WhiteLabelServiceConfig = {
  maxDomainsPerUser: 5,
  verificationTimeoutHours: 72,
  sslRenewalDays: 30,
  defaultPrimaryColor: '#3B82F6',
  defaultSecondaryColor: '#1E40AF',
};

/**
 * White-Label Service
 * Handles branding customization, custom domains, and branded reports
 */
export class WhiteLabelService {
  private config: WhiteLabelServiceConfig;
  private brandingConfigs: Map<string, BrandingConfig>;
  private customDomains: Map<string, CustomDomain>;
  private brandedReports: Map<string, BrandedReport>;
  private userToBranding: Map<string, string>;

  constructor(serviceConfig?: Partial<WhiteLabelServiceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...serviceConfig };
    this.brandingConfigs = new Map();
    this.customDomains = new Map();
    this.brandedReports = new Map();
    this.userToBranding = new Map();
  }

  // ============ Branding Configuration ============

  /**
   * Creates a new branding configuration
   * Requirement 60: Create branding customization
   */
  async configureBranding(options: CreateBrandingOptions): Promise<BrandingConfig> {
    // Validate colors
    this.validateColor(options.primaryColor, 'primaryColor');
    this.validateColor(options.secondaryColor, 'secondaryColor');
    if (options.accentColor) {
      this.validateColor(options.accentColor, 'accentColor');
    }

    const id = this.generateId('brand');
    const now = new Date();

    const branding: BrandingConfig = {
      id,
      userId: options.userId,
      companyName: options.companyName,
      logoUrl: options.logoUrl,
      logoDarkUrl: options.logoDarkUrl,
      faviconUrl: options.faviconUrl,
      primaryColor: options.primaryColor,
      secondaryColor: options.secondaryColor,
      accentColor: options.accentColor,
      fontFamily: options.fontFamily || 'Inter',
      customFontUrl: options.customFontUrl,
      removeDefaultBranding: options.removeDefaultBranding || false,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };

    this.brandingConfigs.set(id, branding);
    this.userToBranding.set(options.userId, id);

    logger.info(`Branding configuration created: ${id}`, { 
      userId: options.userId, 
      companyName: options.companyName 
    });

    return branding;
  }

  /**
   * Gets branding configuration by ID
   */
  async getBranding(brandingId: string): Promise<BrandingConfig | null> {
    return Promise.resolve(this.brandingConfigs.get(brandingId) || null);
  }

  /**
   * Gets branding configuration by user ID
   */
  async getBrandingByUser(userId: string): Promise<BrandingConfig | null> {
    const brandingId = this.userToBranding.get(userId);
    if (!brandingId) return Promise.resolve(null);
    return Promise.resolve(this.brandingConfigs.get(brandingId) || null);
  }

  /**
   * Updates branding configuration
   * Requirement 60: Add logo and color customization
   */
  async updateBranding(
    brandingId: string,
    options: UpdateBrandingOptions
  ): Promise<BrandingConfig> {
    const branding = this.brandingConfigs.get(brandingId);
    if (!branding) {
      throw new Error(`Branding configuration not found: ${brandingId}`);
    }

    // Validate colors if provided
    if (options.primaryColor) {
      this.validateColor(options.primaryColor, 'primaryColor');
    }
    if (options.secondaryColor) {
      this.validateColor(options.secondaryColor, 'secondaryColor');
    }
    if (options.accentColor) {
      this.validateColor(options.accentColor, 'accentColor');
    }
    if (options.backgroundColor) {
      this.validateColor(options.backgroundColor, 'backgroundColor');
    }
    if (options.textColor) {
      this.validateColor(options.textColor, 'textColor');
    }

    // Update fields
    if (options.companyName !== undefined) branding.companyName = options.companyName;
    if (options.logoUrl !== undefined) branding.logoUrl = options.logoUrl;
    if (options.logoDarkUrl !== undefined) branding.logoDarkUrl = options.logoDarkUrl;
    if (options.faviconUrl !== undefined) branding.faviconUrl = options.faviconUrl;
    if (options.primaryColor !== undefined) branding.primaryColor = options.primaryColor;
    if (options.secondaryColor !== undefined) branding.secondaryColor = options.secondaryColor;
    if (options.accentColor !== undefined) branding.accentColor = options.accentColor;
    if (options.backgroundColor !== undefined) branding.backgroundColor = options.backgroundColor;
    if (options.textColor !== undefined) branding.textColor = options.textColor;
    if (options.fontFamily !== undefined) branding.fontFamily = options.fontFamily;
    if (options.customFontUrl !== undefined) branding.customFontUrl = options.customFontUrl;
    if (options.customCss !== undefined) branding.customCss = options.customCss;
    if (options.emailFooter !== undefined) branding.emailFooter = options.emailFooter;
    if (options.supportEmail !== undefined) branding.supportEmail = options.supportEmail;
    if (options.supportUrl !== undefined) branding.supportUrl = options.supportUrl;
    if (options.termsUrl !== undefined) branding.termsUrl = options.termsUrl;
    if (options.privacyUrl !== undefined) branding.privacyUrl = options.privacyUrl;
    if (options.removeDefaultBranding !== undefined) {
      branding.removeDefaultBranding = options.removeDefaultBranding;
    }

    branding.updatedAt = new Date();

    logger.info(`Branding configuration updated: ${brandingId}`);

    return branding;
  }

  /**
   * Activates branding configuration
   */
  async activateBranding(brandingId: string): Promise<BrandingConfig> {
    const branding = this.brandingConfigs.get(brandingId);
    if (!branding) {
      throw new Error(`Branding configuration not found: ${brandingId}`);
    }

    branding.status = 'active';
    branding.updatedAt = new Date();

    logger.info(`Branding configuration activated: ${brandingId}`);

    return branding;
  }

  /**
   * Deactivates branding configuration
   */
  async deactivateBranding(brandingId: string): Promise<BrandingConfig> {
    const branding = this.brandingConfigs.get(brandingId);
    if (!branding) {
      throw new Error(`Branding configuration not found: ${brandingId}`);
    }

    branding.status = 'suspended';
    branding.updatedAt = new Date();

    logger.info(`Branding configuration deactivated: ${brandingId}`);

    return branding;
  }

  /**
   * Deletes branding configuration
   */
  async deleteBranding(brandingId: string): Promise<void> {
    const branding = this.brandingConfigs.get(brandingId);
    if (!branding) {
      throw new Error(`Branding configuration not found: ${brandingId}`);
    }

    // Delete associated domains
    for (const [domainId, domain] of this.customDomains.entries()) {
      if (domain.brandingId === brandingId) {
        this.customDomains.delete(domainId);
      }
    }

    // Remove user mapping
    this.userToBranding.delete(branding.userId);

    // Delete branding
    this.brandingConfigs.delete(brandingId);

    logger.info(`Branding configuration deleted: ${brandingId}`);
  }

  // ============ Branded Assets ============

  /**
   * Applies branding and generates compiled assets
   * Requirement 60: Remove default branding
   */
  async applyBranding(userId: string): Promise<BrandedAssets> {
    const branding = await this.getBrandingByUser(userId);
    if (!branding) {
      throw new Error(`No branding configuration found for user: ${userId}`);
    }

    if (branding.status !== 'active') {
      throw new Error('Branding configuration is not active');
    }

    // Generate CSS variables
    const cssVariables: Record<string, string> = {
      '--primary-color': branding.primaryColor,
      '--secondary-color': branding.secondaryColor,
      '--accent-color': branding.accentColor || branding.primaryColor,
      '--background-color': branding.backgroundColor || '#ffffff',
      '--text-color': branding.textColor || '#1f2937',
      '--font-family': this.getFontFamilyValue(branding.fontFamily, branding.customFontUrl),
    };

    // Generate compiled CSS
    const compiledCss = this.generateCompiledCss(branding, cssVariables);

    // Generate email variables
    const emailVariables: Record<string, string> = {
      companyName: branding.companyName,
      primaryColor: branding.primaryColor,
      logoUrl: branding.logoUrl || '',
      footer: branding.emailFooter || `© ${new Date().getFullYear()} ${branding.companyName}`,
      supportEmail: branding.supportEmail || '',
    };

    const assets: BrandedAssets = {
      cssVariables,
      compiledCss,
      logos: {
        light: branding.logoUrl,
        dark: branding.logoDarkUrl,
        favicon: branding.faviconUrl,
      },
      company: {
        name: branding.companyName,
        supportEmail: branding.supportEmail,
        supportUrl: branding.supportUrl,
        termsUrl: branding.termsUrl,
        privacyUrl: branding.privacyUrl,
      },
      emailVariables,
    };

    logger.info(`Branding assets generated for user: ${userId}`);

    return assets;
  }

  // ============ Custom Domain ============

  /**
   * Sets up a custom domain
   * Requirement 60: Build custom domain support
   */
  async setupCustomDomain(options: SetupDomainOptions): Promise<CustomDomain> {
    const branding = this.brandingConfigs.get(options.brandingId);
    if (!branding) {
      throw new Error(`Branding configuration not found: ${options.brandingId}`);
    }

    if (branding.userId !== options.userId) {
      throw new Error('Branding configuration does not belong to user');
    }

    // Check domain limit
    const existingDomains = this.getDomainsByUser(options.userId);
    if (existingDomains.length >= this.config.maxDomainsPerUser) {
      throw new Error(`Maximum domains (${this.config.maxDomainsPerUser}) exceeded`);
    }

    // Validate domain format
    this.validateDomain(options.domain);

    // Check if domain already exists
    for (const domain of this.customDomains.values()) {
      if (domain.domain === options.domain) {
        throw new Error(`Domain already registered: ${options.domain}`);
      }
    }

    const id = this.generateId('domain');
    const verificationToken = this.generateVerificationToken();
    const hostname = options.subdomain 
      ? `${options.subdomain}.${options.domain}` 
      : options.domain;

    const customDomain: CustomDomain = {
      id,
      userId: options.userId,
      brandingId: options.brandingId,
      domain: options.domain,
      subdomain: options.subdomain,
      hostname,
      status: 'pending',
      verificationToken,
      txtRecordName: `_aihumanizer-verify.${hostname}`,
      txtRecordValue: verificationToken,
      sslStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.customDomains.set(id, customDomain);

    logger.info(`Custom domain setup initiated: ${hostname}`, { userId: options.userId });

    return customDomain;
  }

  /**
   * Verifies a custom domain
   */
  async verifyDomain(domainId: string): Promise<DomainVerificationResult> {
    const domain = this.customDomains.get(domainId);
    if (!domain) {
      throw new Error(`Domain not found: ${domainId}`);
    }

    domain.lastVerificationAt = new Date();

    // In a real implementation, this would check DNS records
    // For now, we'll simulate verification
    const verified = await this.checkDnsRecords(domain);

    if (verified) {
      domain.status = 'verified';
      domain.sslStatus = 'active';
      domain.sslExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
      domain.verificationError = undefined;

      logger.info(`Domain verified: ${domain.hostname}`);

      return {
        verified: true,
        status: 'verified',
      };
    } else {
      domain.status = 'failed';
      domain.verificationError = 'DNS TXT record not found or incorrect';

      logger.warn(`Domain verification failed: ${domain.hostname}`);

      return {
        verified: false,
        status: 'failed',
        error: domain.verificationError,
        dnsRecords: [
          {
            type: 'TXT',
            name: domain.txtRecordName,
            value: domain.txtRecordValue,
          },
          {
            type: 'CNAME',
            name: domain.hostname,
            value: 'app.aihumanizer.com',
          },
        ],
      };
    }
  }

  /**
   * Gets custom domain by ID
   */
  async getDomain(domainId: string): Promise<CustomDomain | null> {
    return Promise.resolve(this.customDomains.get(domainId) || null);
  }

  /**
   * Gets domains by user
   */
  getDomainsByUser(userId: string): CustomDomain[] {
    return Array.from(this.customDomains.values()).filter(d => d.userId === userId);
  }

  /**
   * Gets domain by hostname
   */
  async getDomainByHostname(hostname: string): Promise<CustomDomain | null> {
    for (const domain of this.customDomains.values()) {
      if (domain.hostname === hostname && domain.status === 'verified') {
        return Promise.resolve(domain);
      }
    }
    return Promise.resolve(null);
  }

  /**
   * Deletes a custom domain
   */
  async deleteDomain(domainId: string): Promise<void> {
    const domain = this.customDomains.get(domainId);
    if (!domain) {
      throw new Error(`Domain not found: ${domainId}`);
    }

    this.customDomains.delete(domainId);

    logger.info(`Custom domain deleted: ${domain.hostname}`);
  }

  // ============ Branded Reports ============

  /**
   * Generates a branded report
   * Requirement 60: Implement branded reports
   */
  async generateBrandedReport(options: GenerateReportOptions): Promise<BrandedReport> {
    const branding = this.brandingConfigs.get(options.brandingId);
    if (!branding) {
      throw new Error(`Branding configuration not found: ${options.brandingId}`);
    }

    const id = this.generateId('report');

    // Generate HTML content
    const htmlContent = this.generateReportHtml(branding, options);

    // Generate PDF URL (in real implementation, this would create actual PDF)
    const pdfUrl = options.format !== 'html' 
      ? `/reports/${id}.pdf` 
      : undefined;

    const report: BrandedReport = {
      id,
      userId: options.userId,
      brandingId: options.brandingId,
      reportType: options.reportType,
      title: options.title,
      data: options.data,
      pdfUrl,
      htmlContent: options.format !== 'pdf' ? htmlContent : undefined,
      createdAt: new Date(),
    };

    this.brandedReports.set(id, report);

    logger.info(`Branded report generated: ${id}`, { 
      reportType: options.reportType,
      userId: options.userId 
    });

    return report;
  }

  /**
   * Gets a branded report by ID
   */
  async getReport(reportId: string): Promise<BrandedReport | null> {
    return Promise.resolve(this.brandedReports.get(reportId) || null);
  }

  /**
   * Gets reports by user
   */
  getReportsByUser(userId: string): BrandedReport[] {
    return Array.from(this.brandedReports.values())
      .filter(r => r.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // ============ Helper Methods ============

  /**
   * Generates a unique ID
   */
  private generateId(prefix: string): string {
    return `${prefix}_${crypto.randomBytes(12).toString('hex')}`;
  }

  /**
   * Generates a verification token
   */
  private generateVerificationToken(): string {
    return `aihumanizer-verify-${crypto.randomBytes(16).toString('hex')}`;
  }

  /**
   * Validates a hex color
   */
  private validateColor(color: string, fieldName: string): void {
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!hexColorRegex.test(color)) {
      throw new Error(`Invalid ${fieldName}: must be a valid hex color (e.g., #3B82F6)`);
    }
  }

  /**
   * Validates a domain name
   */
  private validateDomain(domain: string): void {
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      throw new Error(`Invalid domain: ${domain}`);
    }
  }

  /**
   * Gets font family CSS value
   */
  private getFontFamilyValue(fontFamily: FontFamily, customFontUrl?: string): string {
    if (fontFamily === 'custom' && customFontUrl) {
      return `'CustomFont', sans-serif`;
    }
    return `'${fontFamily}', sans-serif`;
  }

  /**
   * Generates compiled CSS from branding config
   */
  private generateCompiledCss(
    branding: BrandingConfig,
    cssVariables: Record<string, string>
  ): string {
    let css = ':root {\n';
    for (const [key, value] of Object.entries(cssVariables)) {
      css += `  ${key}: ${value};\n`;
    }
    css += '}\n\n';

    // Add font import if custom
    if (branding.fontFamily === 'custom' && branding.customFontUrl) {
      css += `@font-face {\n`;
      css += `  font-family: 'CustomFont';\n`;
      css += `  src: url('${branding.customFontUrl}');\n`;
      css += `}\n\n`;
    } else if (branding.fontFamily !== 'Inter') {
      // Add Google Fonts import for non-default fonts
      const fontName = branding.fontFamily.replace(/ /g, '+');
      css += `@import url('https://fonts.googleapis.com/css2?family=${fontName}:wght@400;500;600;700&display=swap');\n\n`;
    }

    // Add base styles
    css += `body {\n`;
    css += `  font-family: var(--font-family);\n`;
    css += `  background-color: var(--background-color);\n`;
    css += `  color: var(--text-color);\n`;
    css += `}\n\n`;

    css += `.btn-primary {\n`;
    css += `  background-color: var(--primary-color);\n`;
    css += `}\n\n`;

    css += `.btn-secondary {\n`;
    css += `  background-color: var(--secondary-color);\n`;
    css += `}\n`;

    // Add custom CSS if provided
    if (branding.customCss) {
      css += `\n/* Custom CSS */\n${branding.customCss}\n`;
    }

    // Remove default branding styles if requested
    if (branding.removeDefaultBranding) {
      css += `\n/* Default branding removed */\n`;
      css += `.default-branding { display: none !important; }\n`;
      css += `.powered-by { display: none !important; }\n`;
    }

    return css;
  }

  /**
   * Checks DNS records for domain verification
   * In real implementation, this would query DNS servers
   */
  private async checkDnsRecords(domain: CustomDomain): Promise<boolean> {
    // Simulate DNS check - in production, use dns.resolveTxt()
    // For testing purposes, we'll verify based on a pattern
    return Promise.resolve(domain.verificationToken.startsWith('aihumanizer-verify-'));
  }

  /**
   * Generates HTML content for a branded report
   */
  private generateReportHtml(
    branding: BrandingConfig,
    options: GenerateReportOptions
  ): string {
    const { title, reportType, data } = options;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - ${branding.companyName}</title>
  <style>
    :root {
      --primary-color: ${branding.primaryColor};
      --secondary-color: ${branding.secondaryColor};
      --font-family: '${branding.fontFamily}', sans-serif;
    }
    body {
      font-family: var(--font-family);
      margin: 0;
      padding: 20px;
      color: #1f2937;
    }
    .header {
      display: flex;
      align-items: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid var(--primary-color);
    }
    .logo {
      max-height: 50px;
      margin-right: 20px;
    }
    .company-name {
      font-size: 24px;
      font-weight: 600;
      color: var(--primary-color);
    }
    .report-title {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 10px;
    }
    .report-type {
      font-size: 14px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .report-content {
      margin-top: 30px;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #6b7280;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    ${branding.logoUrl ? `<img src="${branding.logoUrl}" alt="${branding.companyName}" class="logo">` : ''}
    <span class="company-name">${branding.companyName}</span>
  </div>
  
  <div class="report-type">${reportType} Report</div>
  <h1 class="report-title">${title}</h1>
  
  <div class="report-content">
    <pre>${JSON.stringify(data, null, 2)}</pre>
  </div>
  
  <div class="footer">
    ${branding.emailFooter || `© ${new Date().getFullYear()} ${branding.companyName}. All rights reserved.`}
    ${branding.supportEmail ? `<br>Support: ${branding.supportEmail}` : ''}
  </div>
</body>
</html>`;
  }
}

/** Singleton instance */
export const whiteLabelService = new WhiteLabelService();
