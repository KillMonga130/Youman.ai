/**
 * Legal and Compliance Service Tests
 * Tests for terms of service, consent management, DMCA handling, and license validation
 * Requirements: 95 - Legal and compliance features
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Prisma - must be before imports that use it
vi.mock('../database/prisma', () => ({
  prisma: {
    legalDocument: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    termsAcceptance: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    userConsent: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    dMCARequest: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    dMCACounterNotice: {
      create: vi.fn(),
    },
    license: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    legalAuditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));


import { LegalService, LegalError } from './legal.service';
import type {
  AcceptTermsInput,
  ConsentInput,
  DMCARequestInput,
  LicenseValidationInput,
  ExportControlCheckInput,
} from './types';
import { prisma } from '../database/prisma';

// Get mocked prisma
const mockedPrisma = vi.mocked(prisma);

describe('LegalService', () => {
  let service: LegalService;
  const mockUserId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new LegalService();

    // Default mock for audit log creation
    mockedPrisma.legalAuditLog.create.mockResolvedValue({
      id: 'audit-123',
      userId: mockUserId,
      action: 'TOS_ACCEPTED',
      documentType: null,
      consentType: null,
      dmcaRequestId: null,
      licenseId: null,
      details: {},
      ipAddress: null,
      userAgent: null,
      createdAt: new Date(),
    } as never);
  });

  // ============================================
  // Terms of Service Tests
  // ============================================

  describe('Terms of Service', () => {
    const mockDocument = {
      id: 'doc-123',
      type: 'TERMS_OF_SERVICE',
      version: '1.0.0',
      title: 'Terms of Service',
      content: 'Terms content...',
      effectiveDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    };

    describe('getCurrentDocument', () => {
      it('should return current active document', async () => {
        mockedPrisma.legalDocument.findFirst.mockResolvedValue(mockDocument as never);

        const result = await service.getCurrentDocument('TERMS_OF_SERVICE');

        expect(result).toBeDefined();
        expect(result?.type).toBe('TERMS_OF_SERVICE');
        expect(result?.version).toBe('1.0.0');
      });

      it('should return null when no document exists', async () => {
        mockedPrisma.legalDocument.findFirst.mockResolvedValue(null as never);

        const result = await service.getCurrentDocument('TERMS_OF_SERVICE');

        expect(result).toBeNull();
      });
    });

    describe('acceptTerms', () => {
      const acceptInput: AcceptTermsInput = {
        documentType: 'TERMS_OF_SERVICE',
        version: '1.0.0',
      };

      it('should accept terms successfully', async () => {
        mockedPrisma.legalDocument.findFirst.mockResolvedValue(mockDocument as never);
        mockedPrisma.termsAcceptance.findFirst.mockResolvedValue(null as never);
        mockedPrisma.termsAcceptance.create.mockResolvedValue({
          id: 'acceptance-123',
          userId: mockUserId,
          documentType: 'TERMS_OF_SERVICE',
          documentVersion: '1.0.0',
          acceptedAt: new Date(),
          ipAddress: '127.0.0.1',
          userAgent: 'Test Agent',
        } as never);

        const result = await service.acceptTerms(mockUserId, acceptInput, {
          ipAddress: '127.0.0.1',
          userAgent: 'Test Agent',
        });

        expect(result.documentType).toBe('TERMS_OF_SERVICE');
        expect(result.documentVersion).toBe('1.0.0');
        expect(mockedPrisma.termsAcceptance.create).toHaveBeenCalled();
      });

      it('should return existing acceptance if already accepted', async () => {
        const existingAcceptance = {
          id: 'acceptance-123',
          userId: mockUserId,
          documentType: 'TERMS_OF_SERVICE',
          documentVersion: '1.0.0',
          acceptedAt: new Date(),
          ipAddress: null,
          userAgent: null,
        };

        mockedPrisma.legalDocument.findFirst.mockResolvedValue(mockDocument as never);
        mockedPrisma.termsAcceptance.findFirst.mockResolvedValue(existingAcceptance as never);

        const result = await service.acceptTerms(mockUserId, acceptInput);

        expect(result.id).toBe('acceptance-123');
        expect(mockedPrisma.termsAcceptance.create).not.toHaveBeenCalled();
      });

      it('should throw error for non-existent document', async () => {
        mockedPrisma.legalDocument.findFirst.mockResolvedValue(null as never);

        await expect(service.acceptTerms(mockUserId, acceptInput)).rejects.toThrow(LegalError);
      });
    });
  });


  // ============================================
  // Consent Management Tests
  // ============================================

  describe('Consent Management', () => {
    describe('updateConsent', () => {
      const consentInput: ConsentInput = {
        consentType: 'MARKETING_EMAILS',
        granted: true,
      };

      it('should create new consent when none exists', async () => {
        mockedPrisma.userConsent.findFirst.mockResolvedValue(null as never);
        mockedPrisma.userConsent.create.mockResolvedValue({
          id: 'consent-123',
          userId: mockUserId,
          consentType: 'MARKETING_EMAILS',
          granted: true,
          grantedAt: new Date(),
          revokedAt: null,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          ipAddress: null,
          userAgent: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as never);

        const result = await service.updateConsent(mockUserId, consentInput);

        expect(result.granted).toBe(true);
        expect(result.consentType).toBe('MARKETING_EMAILS');
        expect(mockedPrisma.userConsent.create).toHaveBeenCalled();
      });

      it('should update existing consent', async () => {
        const existingConsent = {
          id: 'consent-123',
          userId: mockUserId,
          consentType: 'MARKETING_EMAILS',
          granted: false,
          grantedAt: null,
          revokedAt: new Date(),
          expiresAt: null,
          ipAddress: null,
          userAgent: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockedPrisma.userConsent.findFirst.mockResolvedValue(existingConsent as never);
        mockedPrisma.userConsent.update.mockResolvedValue({
          ...existingConsent,
          granted: true,
          grantedAt: new Date(),
          revokedAt: null,
        } as never);

        const result = await service.updateConsent(mockUserId, consentInput);

        expect(result.granted).toBe(true);
        expect(mockedPrisma.userConsent.update).toHaveBeenCalled();
      });
    });

    describe('hasConsent', () => {
      it('should return true for valid granted consent', async () => {
        mockedPrisma.userConsent.findFirst.mockResolvedValue({
          id: 'consent-123',
          userId: mockUserId,
          consentType: 'MARKETING_EMAILS',
          granted: true,
          grantedAt: new Date(),
          revokedAt: null,
          expiresAt: new Date(Date.now() + 86400000),
          ipAddress: null,
          userAgent: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as never);

        const result = await service.hasConsent(mockUserId, 'MARKETING_EMAILS');

        expect(result).toBe(true);
      });

      it('should return false for expired consent', async () => {
        mockedPrisma.userConsent.findFirst.mockResolvedValue({
          id: 'consent-123',
          userId: mockUserId,
          consentType: 'MARKETING_EMAILS',
          granted: true,
          grantedAt: new Date(),
          revokedAt: null,
          expiresAt: new Date(Date.now() - 86400000),
          ipAddress: null,
          userAgent: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as never);

        const result = await service.hasConsent(mockUserId, 'MARKETING_EMAILS');

        expect(result).toBe(false);
      });

      it('should return false when no consent exists', async () => {
        mockedPrisma.userConsent.findFirst.mockResolvedValue(null as never);

        const result = await service.hasConsent(mockUserId, 'MARKETING_EMAILS');

        expect(result).toBe(false);
      });
    });

    describe('revokeAllConsents', () => {
      it('should revoke all consents for user', async () => {
        mockedPrisma.userConsent.updateMany.mockResolvedValue({ count: 5 } as never);

        const result = await service.revokeAllConsents(mockUserId);

        expect(result).toBe(5);
        expect(mockedPrisma.userConsent.updateMany).toHaveBeenCalledWith({
          where: { userId: mockUserId, granted: true },
          data: expect.objectContaining({ granted: false }),
        });
      });
    });
  });


  // ============================================
  // DMCA Tests
  // ============================================

  describe('DMCA Handling', () => {
    const dmcaInput: DMCARequestInput = {
      contentUrl: 'https://example.com/content/123',
      contentDescription: 'This is infringing content that copies my work',
      copyrightOwner: 'John Doe',
      copyrightWorkDescription: 'Original article published on my blog',
      contactEmail: 'john@example.com',
      contactAddress: '123 Main St, City, State 12345',
      goodFaithStatement: true,
      accuracyStatement: true,
      signature: 'John Doe',
    };

    describe('createDMCARequest', () => {
      it('should create DMCA request successfully', async () => {
        mockedPrisma.dMCARequest.create.mockResolvedValue({
          id: 'dmca-123',
          requesterId: mockUserId,
          contentUrl: dmcaInput.contentUrl,
          contentDescription: dmcaInput.contentDescription,
          copyrightOwner: dmcaInput.copyrightOwner,
          copyrightWorkDescription: dmcaInput.copyrightWorkDescription,
          contactEmail: dmcaInput.contactEmail,
          contactPhone: null,
          contactAddress: dmcaInput.contactAddress,
          status: 'PENDING',
          signature: dmcaInput.signature,
          createdAt: new Date(),
          updatedAt: new Date(),
          resolvedAt: null,
          resolutionNotes: null,
          affectedUserId: null,
          affectedProjectId: null,
        } as never);

        const result = await service.createDMCARequest(dmcaInput, mockUserId);

        expect(result.status).toBe('PENDING');
        expect(result.copyrightOwner).toBe('John Doe');
        expect(mockedPrisma.dMCARequest.create).toHaveBeenCalled();
      });

      it('should throw error when DMCA is disabled', async () => {
        const disabledService = new LegalService({ enableDMCA: false });

        await expect(disabledService.createDMCARequest(dmcaInput)).rejects.toThrow(LegalError);
      });
    });

    describe('updateDMCAStatus', () => {
      it('should update DMCA status successfully', async () => {
        const existingRequest = {
          id: 'dmca-123',
          requesterId: mockUserId,
          contentUrl: 'https://example.com/content',
          contentDescription: 'Description',
          copyrightOwner: 'Owner',
          copyrightWorkDescription: 'Work description',
          contactEmail: 'test@example.com',
          contactPhone: null,
          contactAddress: 'Address',
          status: 'PENDING',
          signature: 'Signature',
          createdAt: new Date(),
          updatedAt: new Date(),
          resolvedAt: null,
          resolutionNotes: null,
          affectedUserId: null,
          affectedProjectId: null,
        };

        mockedPrisma.dMCARequest.findUnique.mockResolvedValue(existingRequest as never);
        mockedPrisma.dMCARequest.update.mockResolvedValue({
          ...existingRequest,
          status: 'UNDER_REVIEW',
        } as never);

        const result = await service.updateDMCAStatus('dmca-123', 'UNDER_REVIEW');

        expect(result.status).toBe('UNDER_REVIEW');
      });

      it('should throw error for non-existent request', async () => {
        mockedPrisma.dMCARequest.findUnique.mockResolvedValue(null as never);

        await expect(service.updateDMCAStatus('invalid-id', 'UNDER_REVIEW')).rejects.toThrow(
          LegalError
        );
      });
    });
  });


  // ============================================
  // License Validation Tests
  // ============================================

  describe('License Validation', () => {
    const licenseInput: LicenseValidationInput = {
      licenseKey: 'ABCD-1234-EFGH-5678',
    };

    describe('validateLicense', () => {
      it('should validate active license successfully', async () => {
        mockedPrisma.license.findFirst.mockResolvedValue({
          id: 'license-123',
          userId: mockUserId,
          licenseKey: licenseInput.licenseKey,
          licenseType: 'PROFESSIONAL',
          productId: null,
          machineId: null,
          issuedAt: new Date(),
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          isActive: true,
          maxActivations: 5,
          currentActivations: 1,
          features: ['feature1', 'feature2'],
          metadata: {},
        } as never);

        const result = await service.validateLicense(mockUserId, licenseInput);

        expect(result.valid).toBe(true);
        expect(result.license?.licenseType).toBe('PROFESSIONAL');
        expect(result.features).toContain('feature1');
      });

      it('should return invalid for non-existent license', async () => {
        mockedPrisma.license.findFirst.mockResolvedValue(null as never);

        const result = await service.validateLicense(mockUserId, licenseInput);

        expect(result.valid).toBe(false);
        expect(result.reason).toBe('License key not found');
      });

      it('should return invalid for expired license', async () => {
        mockedPrisma.license.findFirst.mockResolvedValue({
          id: 'license-123',
          userId: mockUserId,
          licenseKey: licenseInput.licenseKey,
          licenseType: 'PROFESSIONAL',
          productId: null,
          machineId: null,
          issuedAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
          expiresAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
          isActive: true,
          maxActivations: 5,
          currentActivations: 1,
          features: [],
          metadata: {},
        } as never);

        const result = await service.validateLicense(mockUserId, licenseInput);

        expect(result.valid).toBe(false);
        expect(result.reason).toBe('License has expired');
      });

      it('should return invalid for deactivated license', async () => {
        mockedPrisma.license.findFirst.mockResolvedValue({
          id: 'license-123',
          userId: mockUserId,
          licenseKey: licenseInput.licenseKey,
          licenseType: 'PROFESSIONAL',
          productId: null,
          machineId: null,
          issuedAt: new Date(),
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          isActive: false,
          maxActivations: 5,
          currentActivations: 1,
          features: [],
          metadata: {},
        } as never);

        const result = await service.validateLicense(mockUserId, licenseInput);

        expect(result.valid).toBe(false);
        expect(result.reason).toBe('License is deactivated');
      });

      it('should skip validation when disabled', async () => {
        const disabledService = new LegalService({ enableLicenseValidation: false });

        const result = await disabledService.validateLicense(mockUserId, licenseInput);

        expect(result.valid).toBe(true);
        expect(result.reason).toBe('License validation disabled');
      });
    });
  });


  // ============================================
  // Export Control Tests
  // ============================================

  describe('Export Control', () => {
    describe('checkExportControl', () => {
      it('should allow access from unrestricted countries', async () => {
        const input: ExportControlCheckInput = {
          countryCode: 'US',
        };

        const result = await service.checkExportControl(input);

        expect(result.allowed).toBe(true);
        expect(result.region).toBe('UNRESTRICTED');
        expect(result.restrictions).toHaveLength(0);
      });

      it('should block access from embargoed countries', async () => {
        const input: ExportControlCheckInput = {
          countryCode: 'KP',
        };

        const result = await service.checkExportControl(input);

        expect(result.allowed).toBe(false);
        expect(result.region).toBe('EMBARGOED');
        expect(result.restrictions.length).toBeGreaterThan(0);
        expect(result.blockedFeatures).toContain('ALL');
      });

      it('should restrict access from restricted countries', async () => {
        const input: ExportControlCheckInput = {
          countryCode: 'BY',
        };

        const result = await service.checkExportControl(input);

        expect(result.allowed).toBe(true);
        expect(result.region).toBe('RESTRICTED');
        expect(result.restrictions.length).toBeGreaterThan(0);
        expect(result.blockedFeatures).toContain('ENTERPRISE_FEATURES');
      });

      it('should require license for government users in restricted countries', async () => {
        const input: ExportControlCheckInput = {
          countryCode: 'BY',
          endUserType: 'GOVERNMENT',
        };

        const result = await service.checkExportControl(input);

        expect(result.requiresLicense).toBe(true);
        expect(result.region).toBe('REQUIRES_LICENSE');
      });

      it('should skip export control when disabled', async () => {
        const disabledService = new LegalService({ enableExportControl: false });
        const input: ExportControlCheckInput = {
          countryCode: 'KP',
        };

        const result = await disabledService.checkExportControl(input);

        expect(result.allowed).toBe(true);
        expect(result.region).toBe('UNRESTRICTED');
      });
    });

    describe('canAccessService', () => {
      it('should allow access from allowed countries', async () => {
        const result = await service.canAccessService('US');

        expect(result.allowed).toBe(true);
      });

      it('should deny access from embargoed countries', async () => {
        const result = await service.canAccessService('IR');

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('export control restrictions');
      });
    });
  });

  // ============================================
  // Audit Log Tests
  // ============================================

  describe('Audit Logging', () => {
    describe('createAuditLog', () => {
      it('should create audit log entry', async () => {
        mockedPrisma.legalAuditLog.create.mockResolvedValue({
          id: 'audit-456',
          userId: mockUserId,
          action: 'TOS_ACCEPTED',
          documentType: 'TERMS_OF_SERVICE',
          consentType: null,
          dmcaRequestId: null,
          licenseId: null,
          details: { version: '1.0.0' },
          ipAddress: '127.0.0.1',
          userAgent: 'Test Agent',
          createdAt: new Date(),
        } as never);

        const result = await service.createAuditLog({
          userId: mockUserId,
          action: 'TOS_ACCEPTED',
          documentType: 'TERMS_OF_SERVICE',
          details: { version: '1.0.0' },
          ipAddress: '127.0.0.1',
          userAgent: 'Test Agent',
        });

        expect(result.action).toBe('TOS_ACCEPTED');
        expect(result.documentType).toBe('TERMS_OF_SERVICE');
      });
    });

    describe('getAuditLogs', () => {
      it('should retrieve audit logs with pagination', async () => {
        mockedPrisma.legalAuditLog.findMany.mockResolvedValue([
          {
            id: 'audit-1',
            userId: mockUserId,
            action: 'TOS_ACCEPTED',
            documentType: 'TERMS_OF_SERVICE',
            consentType: null,
            dmcaRequestId: null,
            licenseId: null,
            details: {},
            ipAddress: null,
            userAgent: null,
            createdAt: new Date(),
          },
        ] as never);
        mockedPrisma.legalAuditLog.count.mockResolvedValue(1 as never);

        const result = await service.getAuditLogs({
          userId: mockUserId,
          page: 1,
          limit: 10,
        });

        expect(result.logs).toHaveLength(1);
        expect(result.total).toBe(1);
      });
    });
  });
});
