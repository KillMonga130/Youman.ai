/**
 * White-Label Service Tests
 * Tests for branding customization, custom domains, and branded reports
 * Requirements: 60
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WhiteLabelService } from './white-label.service';
import type {
  CreateBrandingOptions,
  UpdateBrandingOptions,
  SetupDomainOptions,
  GenerateReportOptions,
} from './types';

describe('WhiteLabelService', () => {
  let service: WhiteLabelService;

  beforeEach(() => {
    service = new WhiteLabelService();
  });

  // ============ Branding Configuration Tests ============

  describe('Branding Configuration', () => {
    const validBrandingOptions: CreateBrandingOptions = {
      userId: 'user_123',
      companyName: 'Acme Corp',
      logoUrl: 'https://example.com/logo.png',
      primaryColor: '#3B82F6',
      secondaryColor: '#1E40AF',
    };

    it('should create a branding configuration', async () => {
      const branding = await service.configureBranding(validBrandingOptions);

      expect(branding).toBeDefined();
      expect(branding.id).toMatch(/^brand_/);
      expect(branding.userId).toBe('user_123');
      expect(branding.companyName).toBe('Acme Corp');
      expect(branding.primaryColor).toBe('#3B82F6');
      expect(branding.secondaryColor).toBe('#1E40AF');
      expect(branding.status).toBe('draft');
      expect(branding.fontFamily).toBe('Inter');
      expect(branding.removeDefaultBranding).toBe(false);
    });

    it('should get branding by ID', async () => {
      const created = await service.configureBranding(validBrandingOptions);
      const retrieved = await service.getBranding(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should get branding by user ID', async () => {
      await service.configureBranding(validBrandingOptions);
      const retrieved = await service.getBrandingByUser('user_123');

      expect(retrieved).toBeDefined();
      expect(retrieved?.userId).toBe('user_123');
    });

    it('should return null for non-existent branding', async () => {
      const result = await service.getBranding('non_existent');
      expect(result).toBeNull();
    });

    it('should update branding configuration', async () => {
      const created = await service.configureBranding(validBrandingOptions);

      const updateOptions: UpdateBrandingOptions = {
        companyName: 'Updated Corp',
        primaryColor: '#10B981',
        supportEmail: 'support@example.com',
      };

      const updated = await service.updateBranding(created.id, updateOptions);

      expect(updated.companyName).toBe('Updated Corp');
      expect(updated.primaryColor).toBe('#10B981');
      expect(updated.supportEmail).toBe('support@example.com');
      expect(updated.secondaryColor).toBe('#1E40AF'); // Unchanged
    });

    it('should activate branding configuration', async () => {
      const created = await service.configureBranding(validBrandingOptions);
      const activated = await service.activateBranding(created.id);

      expect(activated.status).toBe('active');
    });

    it('should deactivate branding configuration', async () => {
      const created = await service.configureBranding(validBrandingOptions);
      await service.activateBranding(created.id);
      const deactivated = await service.deactivateBranding(created.id);

      expect(deactivated.status).toBe('suspended');
    });

    it('should delete branding configuration', async () => {
      const created = await service.configureBranding(validBrandingOptions);
      await service.deleteBranding(created.id);

      const result = await service.getBranding(created.id);
      expect(result).toBeNull();
    });

    it('should reject invalid hex colors', async () => {
      const invalidOptions = {
        ...validBrandingOptions,
        primaryColor: 'not-a-color',
      };

      await expect(service.configureBranding(invalidOptions)).rejects.toThrow(
        'Invalid primaryColor'
      );
    });

    it('should accept 3-digit hex colors', async () => {
      const options = {
        ...validBrandingOptions,
        primaryColor: '#F00',
      };

      const branding = await service.configureBranding(options);
      expect(branding.primaryColor).toBe('#F00');
    });

    it('should support custom font family', async () => {
      const options = {
        ...validBrandingOptions,
        fontFamily: 'Roboto' as const,
      };

      const branding = await service.configureBranding(options);
      expect(branding.fontFamily).toBe('Roboto');
    });

    it('should support removing default branding', async () => {
      const options = {
        ...validBrandingOptions,
        removeDefaultBranding: true,
      };

      const branding = await service.configureBranding(options);
      expect(branding.removeDefaultBranding).toBe(true);
    });
  });

  // ============ Branded Assets Tests ============

  describe('Branded Assets', () => {
    it('should generate branded assets', async () => {
      const branding = await service.configureBranding({
        userId: 'user_assets',
        companyName: 'Assets Corp',
        primaryColor: '#3B82F6',
        secondaryColor: '#1E40AF',
        logoUrl: 'https://example.com/logo.png',
      });

      await service.activateBranding(branding.id);

      const assets = await service.applyBranding('user_assets');

      expect(assets).toBeDefined();
      expect(assets.cssVariables['--primary-color']).toBe('#3B82F6');
      expect(assets.cssVariables['--secondary-color']).toBe('#1E40AF');
      expect(assets.compiledCss).toContain(':root');
      expect(assets.logos.light).toBe('https://example.com/logo.png');
      expect(assets.company.name).toBe('Assets Corp');
    });

    it('should fail for inactive branding', async () => {
      await service.configureBranding({
        userId: 'user_inactive',
        companyName: 'Inactive Corp',
        primaryColor: '#3B82F6',
        secondaryColor: '#1E40AF',
      });

      await expect(service.applyBranding('user_inactive')).rejects.toThrow(
        'Branding configuration is not active'
      );
    });

    it('should fail for non-existent user', async () => {
      await expect(service.applyBranding('non_existent_user')).rejects.toThrow(
        'No branding configuration found'
      );
    });

    it('should include custom CSS in compiled assets', async () => {
      const branding = await service.configureBranding({
        userId: 'user_custom_css',
        companyName: 'Custom CSS Corp',
        primaryColor: '#3B82F6',
        secondaryColor: '#1E40AF',
      });

      await service.updateBranding(branding.id, {
        customCss: '.custom-class { color: red; }',
      });

      await service.activateBranding(branding.id);

      const assets = await service.applyBranding('user_custom_css');

      expect(assets.compiledCss).toContain('.custom-class { color: red; }');
    });

    it('should include default branding removal styles', async () => {
      const branding = await service.configureBranding({
        userId: 'user_no_default',
        companyName: 'No Default Corp',
        primaryColor: '#3B82F6',
        secondaryColor: '#1E40AF',
        removeDefaultBranding: true,
      });

      await service.activateBranding(branding.id);

      const assets = await service.applyBranding('user_no_default');

      expect(assets.compiledCss).toContain('.default-branding { display: none !important; }');
      expect(assets.compiledCss).toContain('.powered-by { display: none !important; }');
    });
  });

  // ============ Custom Domain Tests ============

  describe('Custom Domains', () => {
    let brandingId: string;

    beforeEach(async () => {
      const branding = await service.configureBranding({
        userId: 'user_domain',
        companyName: 'Domain Corp',
        primaryColor: '#3B82F6',
        secondaryColor: '#1E40AF',
      });
      brandingId = branding.id;
    });

    it('should set up a custom domain', async () => {
      const options: SetupDomainOptions = {
        userId: 'user_domain',
        brandingId,
        domain: 'example.com',
      };

      const domain = await service.setupCustomDomain(options);

      expect(domain).toBeDefined();
      expect(domain.id).toMatch(/^domain_/);
      expect(domain.domain).toBe('example.com');
      expect(domain.hostname).toBe('example.com');
      expect(domain.status).toBe('pending');
      expect(domain.verificationToken).toMatch(/^aihumanizer-verify-/);
      expect(domain.txtRecordName).toBe('_aihumanizer-verify.example.com');
    });

    it('should set up a subdomain', async () => {
      const options: SetupDomainOptions = {
        userId: 'user_domain',
        brandingId,
        domain: 'example.com',
        subdomain: 'app',
      };

      const domain = await service.setupCustomDomain(options);

      expect(domain.hostname).toBe('app.example.com');
      expect(domain.subdomain).toBe('app');
    });

    it('should verify a domain', async () => {
      const domain = await service.setupCustomDomain({
        userId: 'user_domain',
        brandingId,
        domain: 'verify-test.com',
      });

      const result = await service.verifyDomain(domain.id);

      expect(result.verified).toBe(true);
      expect(result.status).toBe('verified');

      const updated = await service.getDomain(domain.id);
      expect(updated?.status).toBe('verified');
      expect(updated?.sslStatus).toBe('active');
    });

    it('should get domain by ID', async () => {
      const created = await service.setupCustomDomain({
        userId: 'user_domain',
        brandingId,
        domain: 'get-test.com',
      });

      const retrieved = await service.getDomain(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should get domains by user', async () => {
      await service.setupCustomDomain({
        userId: 'user_domain',
        brandingId,
        domain: 'domain1.com',
      });

      await service.setupCustomDomain({
        userId: 'user_domain',
        brandingId,
        domain: 'domain2.com',
      });

      const domains = service.getDomainsByUser('user_domain');

      expect(domains).toHaveLength(2);
    });

    it('should get domain by hostname', async () => {
      const domain = await service.setupCustomDomain({
        userId: 'user_domain',
        brandingId,
        domain: 'hostname-test.com',
      });

      await service.verifyDomain(domain.id);

      const found = await service.getDomainByHostname('hostname-test.com');

      expect(found).toBeDefined();
      expect(found?.hostname).toBe('hostname-test.com');
    });

    it('should not find unverified domain by hostname', async () => {
      await service.setupCustomDomain({
        userId: 'user_domain',
        brandingId,
        domain: 'unverified.com',
      });

      const found = await service.getDomainByHostname('unverified.com');

      expect(found).toBeNull();
    });

    it('should delete a domain', async () => {
      const domain = await service.setupCustomDomain({
        userId: 'user_domain',
        brandingId,
        domain: 'delete-test.com',
      });

      await service.deleteDomain(domain.id);

      const result = await service.getDomain(domain.id);
      expect(result).toBeNull();
    });

    it('should reject invalid domain format', async () => {
      await expect(
        service.setupCustomDomain({
          userId: 'user_domain',
          brandingId,
          domain: 'invalid',
        })
      ).rejects.toThrow('Invalid domain');
    });

    it('should reject duplicate domains', async () => {
      await service.setupCustomDomain({
        userId: 'user_domain',
        brandingId,
        domain: 'duplicate.com',
      });

      await expect(
        service.setupCustomDomain({
          userId: 'user_domain',
          brandingId,
          domain: 'duplicate.com',
        })
      ).rejects.toThrow('Domain already registered');
    });

    it('should enforce domain limit', async () => {
      const limitedService = new WhiteLabelService({ maxDomainsPerUser: 2 });

      const branding = await limitedService.configureBranding({
        userId: 'user_limited',
        companyName: 'Limited Corp',
        primaryColor: '#3B82F6',
        secondaryColor: '#1E40AF',
      });

      await limitedService.setupCustomDomain({
        userId: 'user_limited',
        brandingId: branding.id,
        domain: 'domain1.com',
      });

      await limitedService.setupCustomDomain({
        userId: 'user_limited',
        brandingId: branding.id,
        domain: 'domain2.com',
      });

      await expect(
        limitedService.setupCustomDomain({
          userId: 'user_limited',
          brandingId: branding.id,
          domain: 'domain3.com',
        })
      ).rejects.toThrow('Maximum domains (2) exceeded');
    });
  });

  // ============ Branded Reports Tests ============

  describe('Branded Reports', () => {
    let brandingId: string;

    beforeEach(async () => {
      const branding = await service.configureBranding({
        userId: 'user_reports',
        companyName: 'Reports Corp',
        primaryColor: '#3B82F6',
        secondaryColor: '#1E40AF',
        logoUrl: 'https://example.com/logo.png',
      });
      brandingId = branding.id;
    });

    it('should generate a branded report', async () => {
      const options: GenerateReportOptions = {
        userId: 'user_reports',
        brandingId,
        reportType: 'transformation',
        title: 'Transformation Report',
        data: { wordsProcessed: 1000, detectionScore: 15 },
        format: 'both',
      };

      const report = await service.generateBrandedReport(options);

      expect(report).toBeDefined();
      expect(report.id).toMatch(/^report_/);
      expect(report.reportType).toBe('transformation');
      expect(report.title).toBe('Transformation Report');
      expect(report.pdfUrl).toMatch(/\.pdf$/);
      expect(report.htmlContent).toContain('Reports Corp');
      expect(report.htmlContent).toContain('Transformation Report');
    });

    it('should generate HTML-only report', async () => {
      const report = await service.generateBrandedReport({
        userId: 'user_reports',
        brandingId,
        reportType: 'analytics',
        title: 'Analytics Report',
        data: { views: 500 },
        format: 'html',
      });

      expect(report.htmlContent).toBeDefined();
      expect(report.pdfUrl).toBeUndefined();
    });

    it('should generate PDF-only report', async () => {
      const report = await service.generateBrandedReport({
        userId: 'user_reports',
        brandingId,
        reportType: 'usage',
        title: 'Usage Report',
        data: { apiCalls: 1000 },
        format: 'pdf',
      });

      expect(report.pdfUrl).toBeDefined();
      expect(report.htmlContent).toBeUndefined();
    });

    it('should get report by ID', async () => {
      const created = await service.generateBrandedReport({
        userId: 'user_reports',
        brandingId,
        reportType: 'detection',
        title: 'Detection Report',
        data: { score: 10 },
        format: 'both',
      });

      const retrieved = await service.getReport(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should get reports by user', async () => {
      await service.generateBrandedReport({
        userId: 'user_reports',
        brandingId,
        reportType: 'transformation',
        title: 'Report 1',
        data: {},
        format: 'html',
      });

      await service.generateBrandedReport({
        userId: 'user_reports',
        brandingId,
        reportType: 'analytics',
        title: 'Report 2',
        data: {},
        format: 'html',
      });

      const reports = service.getReportsByUser('user_reports');

      expect(reports).toHaveLength(2);
      // Verify both reports are present
      const titles = reports.map(r => r.title);
      expect(titles).toContain('Report 1');
      expect(titles).toContain('Report 2');
    });

    it('should include branding in report HTML', async () => {
      const report = await service.generateBrandedReport({
        userId: 'user_reports',
        brandingId,
        reportType: 'invoice',
        title: 'Invoice #123',
        data: { amount: 99.99 },
        format: 'html',
      });

      expect(report.htmlContent).toContain('#3B82F6'); // Primary color
      expect(report.htmlContent).toContain('Reports Corp'); // Company name
      expect(report.htmlContent).toContain('https://example.com/logo.png'); // Logo
    });

    it('should support all report types', async () => {
      const reportTypes = [
        'transformation',
        'analytics',
        'detection',
        'plagiarism',
        'usage',
        'invoice',
      ] as const;

      for (const reportType of reportTypes) {
        const report = await service.generateBrandedReport({
          userId: 'user_reports',
          brandingId,
          reportType,
          title: `${reportType} Report`,
          data: {},
          format: 'html',
        });

        expect(report.reportType).toBe(reportType);
        expect(report.htmlContent).toContain(`${reportType} Report`);
      }
    });
  });

  // ============ Integration Tests ============

  describe('Integration', () => {
    it('should delete domains when branding is deleted', async () => {
      const branding = await service.configureBranding({
        userId: 'user_integration',
        companyName: 'Integration Corp',
        primaryColor: '#3B82F6',
        secondaryColor: '#1E40AF',
      });

      await service.setupCustomDomain({
        userId: 'user_integration',
        brandingId: branding.id,
        domain: 'integration.com',
      });

      const domainsBefore = service.getDomainsByUser('user_integration');
      expect(domainsBefore).toHaveLength(1);

      await service.deleteBranding(branding.id);

      const domainsAfter = service.getDomainsByUser('user_integration');
      expect(domainsAfter).toHaveLength(0);
    });

    it('should reject domain setup for wrong user', async () => {
      const branding = await service.configureBranding({
        userId: 'user_owner',
        companyName: 'Owner Corp',
        primaryColor: '#3B82F6',
        secondaryColor: '#1E40AF',
      });

      await expect(
        service.setupCustomDomain({
          userId: 'user_other',
          brandingId: branding.id,
          domain: 'wrong-user.com',
        })
      ).rejects.toThrow('Branding configuration does not belong to user');
    });
  });
});
