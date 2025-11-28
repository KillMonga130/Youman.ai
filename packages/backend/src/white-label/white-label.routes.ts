/**
 * White-Label Routes
 * REST API endpoints for branding customization, custom domains, and branded reports
 * Requirements: 60
 */

import { Router, Request, Response, NextFunction } from 'express';
import { whiteLabelService } from './white-label.service';
import type {
  CreateBrandingOptions,
  UpdateBrandingOptions,
  SetupDomainOptions,
  GenerateReportOptions,
} from './types';

const router = Router();

// ============ Branding Configuration ============

/**
 * POST /white-label/branding
 * Create a new branding configuration
 */
router.post('/branding', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const options: CreateBrandingOptions = {
      userId: req.body.userId,
      companyName: req.body.companyName,
      logoUrl: req.body.logoUrl,
      logoDarkUrl: req.body.logoDarkUrl,
      faviconUrl: req.body.faviconUrl,
      primaryColor: req.body.primaryColor,
      secondaryColor: req.body.secondaryColor,
      accentColor: req.body.accentColor,
      fontFamily: req.body.fontFamily,
      customFontUrl: req.body.customFontUrl,
      removeDefaultBranding: req.body.removeDefaultBranding,
    };

    const branding = await whiteLabelService.configureBranding(options);

    res.status(201).json({
      success: true,
      data: branding,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /white-label/branding/:brandingId
 * Get branding configuration by ID
 */
router.get('/branding/:brandingId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const brandingId = req.params.brandingId as string;
    const branding = await whiteLabelService.getBranding(brandingId);

    if (!branding) {
      res.status(404).json({
        success: false,
        error: 'Branding configuration not found',
      });
      return;
    }

    res.json({
      success: true,
      data: branding,
    });
  } catch (error) {
    next(error);
  }
});


/**
 * GET /white-label/branding/user/:userId
 * Get branding configuration by user ID
 */
router.get('/branding/user/:userId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.params.userId as string;
    const branding = await whiteLabelService.getBrandingByUser(userId);

    if (!branding) {
      res.status(404).json({
        success: false,
        error: 'No branding configuration found for user',
      });
      return;
    }

    res.json({
      success: true,
      data: branding,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /white-label/branding/:brandingId
 * Update branding configuration
 */
router.patch('/branding/:brandingId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const brandingId = req.params.brandingId as string;
    const options: UpdateBrandingOptions = {
      companyName: req.body.companyName,
      logoUrl: req.body.logoUrl,
      logoDarkUrl: req.body.logoDarkUrl,
      faviconUrl: req.body.faviconUrl,
      primaryColor: req.body.primaryColor,
      secondaryColor: req.body.secondaryColor,
      accentColor: req.body.accentColor,
      backgroundColor: req.body.backgroundColor,
      textColor: req.body.textColor,
      fontFamily: req.body.fontFamily,
      customFontUrl: req.body.customFontUrl,
      customCss: req.body.customCss,
      emailFooter: req.body.emailFooter,
      supportEmail: req.body.supportEmail,
      supportUrl: req.body.supportUrl,
      termsUrl: req.body.termsUrl,
      privacyUrl: req.body.privacyUrl,
      removeDefaultBranding: req.body.removeDefaultBranding,
    };

    const branding = await whiteLabelService.updateBranding(brandingId, options);

    res.json({
      success: true,
      data: branding,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /white-label/branding/:brandingId/activate
 * Activate branding configuration
 */
router.post(
  '/branding/:brandingId/activate',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const brandingId = req.params.brandingId as string;
      const branding = await whiteLabelService.activateBranding(brandingId);

      res.json({
        success: true,
        data: { id: branding.id, status: branding.status },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /white-label/branding/:brandingId/deactivate
 * Deactivate branding configuration
 */
router.post(
  '/branding/:brandingId/deactivate',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const brandingId = req.params.brandingId as string;
      const branding = await whiteLabelService.deactivateBranding(brandingId);

      res.json({
        success: true,
        data: { id: branding.id, status: branding.status },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /white-label/branding/:brandingId
 * Delete branding configuration
 */
router.delete(
  '/branding/:brandingId',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const brandingId = req.params.brandingId as string;
      await whiteLabelService.deleteBranding(brandingId);

      res.json({
        success: true,
        message: 'Branding configuration deleted',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /white-label/branding/:userId/assets
 * Get compiled branding assets for a user
 */
router.get(
  '/branding/:userId/assets',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.params.userId as string;
      const assets = await whiteLabelService.applyBranding(userId);

      res.json({
        success: true,
        data: assets,
      });
    } catch (error) {
      next(error);
    }
  }
);


// ============ Custom Domains ============

/**
 * POST /white-label/domains
 * Set up a custom domain
 */
router.post('/domains', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const options: SetupDomainOptions = {
      userId: req.body.userId,
      brandingId: req.body.brandingId,
      domain: req.body.domain,
      subdomain: req.body.subdomain,
    };

    const domain = await whiteLabelService.setupCustomDomain(options);

    res.status(201).json({
      success: true,
      data: {
        id: domain.id,
        hostname: domain.hostname,
        status: domain.status,
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
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /white-label/domains/:domainId
 * Get custom domain by ID
 */
router.get('/domains/:domainId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const domainId = req.params.domainId as string;
    const domain = await whiteLabelService.getDomain(domainId);

    if (!domain) {
      res.status(404).json({
        success: false,
        error: 'Domain not found',
      });
      return;
    }

    res.json({
      success: true,
      data: domain,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /white-label/domains/user/:userId
 * Get domains by user ID
 */
router.get('/domains/user/:userId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.params.userId as string;
    const domains = whiteLabelService.getDomainsByUser(userId);

    res.json({
      success: true,
      data: domains,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /white-label/domains/:domainId/verify
 * Verify a custom domain
 */
router.post(
  '/domains/:domainId/verify',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const domainId = req.params.domainId as string;
      const result = await whiteLabelService.verifyDomain(domainId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /white-label/domains/lookup/:hostname
 * Look up domain by hostname
 */
router.get(
  '/domains/lookup/:hostname',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const hostname = req.params.hostname as string;
      const domain = await whiteLabelService.getDomainByHostname(hostname);

      if (!domain) {
        res.status(404).json({
          success: false,
          error: 'Domain not found or not verified',
        });
        return;
      }

      res.json({
        success: true,
        data: {
          id: domain.id,
          brandingId: domain.brandingId,
          hostname: domain.hostname,
          status: domain.status,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /white-label/domains/:domainId
 * Delete a custom domain
 */
router.delete('/domains/:domainId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const domainId = req.params.domainId as string;
    await whiteLabelService.deleteDomain(domainId);

    res.json({
      success: true,
      message: 'Domain deleted',
    });
  } catch (error) {
    next(error);
  }
});


// ============ Branded Reports ============

/**
 * POST /white-label/reports
 * Generate a branded report
 */
router.post('/reports', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const options: GenerateReportOptions = {
      userId: req.body.userId,
      brandingId: req.body.brandingId,
      reportType: req.body.reportType,
      title: req.body.title,
      data: req.body.data,
      format: req.body.format || 'both',
    };

    const report = await whiteLabelService.generateBrandedReport(options);

    res.status(201).json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /white-label/reports/:reportId
 * Get a branded report by ID
 */
router.get('/reports/:reportId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const reportId = req.params.reportId as string;
    const report = await whiteLabelService.getReport(reportId);

    if (!report) {
      res.status(404).json({
        success: false,
        error: 'Report not found',
      });
      return;
    }

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /white-label/reports/user/:userId
 * Get reports by user ID
 */
router.get('/reports/user/:userId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.params.userId as string;
    const reports = whiteLabelService.getReportsByUser(userId);

    res.json({
      success: true,
      data: reports,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
