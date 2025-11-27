/**
 * Legal and Compliance Service
 * Manages terms of service, consent, DMCA handling, license validation, and export control
 * Requirements: 95 - Legal and compliance features
 */

import crypto from 'crypto';
import { prisma } from '../database/prisma';
import { Prisma } from '../generated/prisma';
import { logger } from '../utils/logger';
import type {
  LegalDocument,
  LegalDocumentType,
  TermsAcceptance,
  AcceptTermsInput,
  UserConsent,
  ConsentInput,
  ConsentType,
  ConsentStatusSummary,
  TermsAcceptanceStatus,
  DMCARequest,
  DMCARequestInput,
  DMCACounterNotice,
  DMCACounterNoticeInput,
  DMCAStatus,
  License,
  LicenseValidationInput,
  LicenseValidationResult,
  LicenseType,
  ExportControlCheckInput,
  ExportControlResult,
  ExportControlRegion,
  LegalAuditLogEntry,
  LegalAuditAction,
  CreateLegalAuditLogOptions,
  LegalServiceConfig,
} from './types';
import {
  EMBARGOED_COUNTRIES,
  RESTRICTED_COUNTRIES,
  COUNTRY_NAMES,
} from './types';

/** Default configuration */
const DEFAULT_CONFIG: LegalServiceConfig = {
  enableExportControl: true,
  enableDMCA: true,
  enableLicenseValidation: true,
  defaultConsentExpireDays: 365,
  dmcaResponseDays: 14,
  counterNoticeDays: 10,
};

/**
 * Custom error class for legal-related errors
 */
export class LegalError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'LegalError';
    this.code = code;
  }
}


/**
 * Legal and Compliance Service class
 * Handles terms acceptance, consent management, DMCA, licensing, and export control
 */
export class LegalService {
  private config: LegalServiceConfig;

  constructor(serviceConfig?: Partial<LegalServiceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...serviceConfig };
  }

  // ============================================
  // Terms of Service Management
  // ============================================

  /**
   * Get the current version of a legal document
   */
  async getCurrentDocument(type: LegalDocumentType): Promise<LegalDocument | null> {
    const doc = await prisma.legalDocument.findFirst({
      where: { type, isActive: true },
      orderBy: { effectiveDate: 'desc' },
    });

    return doc ? this.toLegalDocument(doc) : null;
  }

  /**
   * Get all versions of a legal document
   */
  async getDocumentVersions(type: LegalDocumentType): Promise<LegalDocument[]> {
    const docs = await prisma.legalDocument.findMany({
      where: { type },
      orderBy: { effectiveDate: 'desc' },
    });

    return docs.map((d) => this.toLegalDocument(d));
  }

  /**
   * Accept terms of service
   * Requirement 95: Create terms of service acceptance tracking
   */
  async acceptTerms(
    userId: string,
    input: AcceptTermsInput,
    requestInfo?: { ipAddress?: string; userAgent?: string }
  ): Promise<TermsAcceptance> {
    // Verify document exists
    const doc = await prisma.legalDocument.findFirst({
      where: {
        type: input.documentType,
        version: input.version,
        isActive: true,
      },
    });

    if (!doc) {
      throw new LegalError('Document version not found or inactive', 'DOCUMENT_NOT_FOUND');
    }

    // Check if already accepted
    const existing = await prisma.termsAcceptance.findFirst({
      where: {
        userId,
        documentType: input.documentType,
        documentVersion: input.version,
      },
    });

    if (existing) {
      return this.toTermsAcceptance(existing);
    }

    // Create acceptance record
    const acceptance = await prisma.termsAcceptance.create({
      data: {
        userId,
        documentType: input.documentType,
        documentVersion: input.version,
        acceptedAt: input.acceptedAt ?? new Date(),
        ipAddress: requestInfo?.ipAddress ?? null,
        userAgent: requestInfo?.userAgent ?? null,
      },
    });

    // Create audit log
    await this.createAuditLog({
      userId,
      action: 'TOS_ACCEPTED',
      documentType: input.documentType,
      details: { version: input.version },
      ipAddress: requestInfo?.ipAddress,
      userAgent: requestInfo?.userAgent,
    });

    logger.info('Terms accepted', { userId, documentType: input.documentType, version: input.version });

    return this.toTermsAcceptance(acceptance);
  }

  /**
   * Get terms acceptance status for a user
   */
  async getTermsAcceptanceStatus(userId: string): Promise<TermsAcceptanceStatus> {
    // Get all current active documents
    const currentDocs = await prisma.legalDocument.findMany({
      where: { isActive: true },
      orderBy: { effectiveDate: 'desc' },
      distinct: ['type'],
    });

    // Get user's acceptances
    const acceptances = await prisma.termsAcceptance.findMany({
      where: { userId },
      orderBy: { acceptedAt: 'desc' },
    });

    const acceptedDocuments: TermsAcceptanceStatus['acceptedDocuments'] = [];
    const pendingDocuments: TermsAcceptanceStatus['pendingDocuments'] = [];

    for (const doc of currentDocs) {
      const acceptance = acceptances.find(
        (a) => a.documentType === doc.type && a.documentVersion === doc.version
      );

      if (acceptance) {
        acceptedDocuments.push({
          type: doc.type as LegalDocumentType,
          version: doc.version,
          acceptedAt: acceptance.acceptedAt,
          isCurrentVersion: true,
        });
      } else {
        // Check if user accepted an older version
        const olderAcceptance = acceptances.find((a) => a.documentType === doc.type);
        if (olderAcceptance) {
          acceptedDocuments.push({
            type: doc.type as LegalDocumentType,
            version: olderAcceptance.documentVersion,
            acceptedAt: olderAcceptance.acceptedAt,
            isCurrentVersion: false,
          });
        }
        pendingDocuments.push({
          type: doc.type as LegalDocumentType,
          currentVersion: doc.version,
          effectiveDate: doc.effectiveDate,
        });
      }
    }

    return {
      userId,
      acceptedDocuments,
      pendingDocuments,
      allAccepted: pendingDocuments.length === 0,
    };
  }

  /**
   * Check if user has accepted required terms
   */
  async hasAcceptedRequiredTerms(userId: string): Promise<boolean> {
    const status = await this.getTermsAcceptanceStatus(userId);
    return status.allAccepted;
  }


  // ============================================
  // Consent Management
  // ============================================

  /**
   * Update user consent
   * Requirement 95: Build consent management
   */
  async updateConsent(
    userId: string,
    input: ConsentInput,
    requestInfo?: { ipAddress?: string; userAgent?: string }
  ): Promise<UserConsent> {
    const now = new Date();
    const expiresAt = input.expiresAt ?? (input.granted
      ? new Date(now.getTime() + this.config.defaultConsentExpireDays * 24 * 60 * 60 * 1000)
      : null);

    // Check for existing consent
    const existing = await prisma.userConsent.findFirst({
      where: { userId, consentType: input.consentType },
    });

    let consent;
    if (existing) {
      consent = await prisma.userConsent.update({
        where: { id: existing.id },
        data: {
          granted: input.granted,
          grantedAt: input.granted ? now : null,
          revokedAt: input.granted ? null : now,
          expiresAt,
          ipAddress: requestInfo?.ipAddress ?? null,
          userAgent: requestInfo?.userAgent ?? null,
        },
      });
    } else {
      consent = await prisma.userConsent.create({
        data: {
          userId,
          consentType: input.consentType,
          granted: input.granted,
          grantedAt: input.granted ? now : null,
          revokedAt: input.granted ? null : now,
          expiresAt,
          ipAddress: requestInfo?.ipAddress ?? null,
          userAgent: requestInfo?.userAgent ?? null,
        },
      });
    }

    // Create audit log
    await this.createAuditLog({
      userId,
      action: input.granted ? 'CONSENT_GRANTED' : 'CONSENT_REVOKED',
      consentType: input.consentType,
      details: { expiresAt: expiresAt?.toISOString() },
      ipAddress: requestInfo?.ipAddress,
      userAgent: requestInfo?.userAgent,
    });

    logger.info('Consent updated', {
      userId,
      consentType: input.consentType,
      granted: input.granted,
    });

    return this.toUserConsent(consent);
  }

  /**
   * Get consent status summary for a user
   */
  async getConsentStatus(userId: string): Promise<ConsentStatusSummary> {
    const consents = await prisma.userConsent.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });

    const consentTypes: ConsentType[] = [
      'MARKETING_EMAILS',
      'ANALYTICS_TRACKING',
      'THIRD_PARTY_SHARING',
      'DATA_PROCESSING',
      'COOKIE_ESSENTIAL',
      'COOKIE_ANALYTICS',
      'COOKIE_MARKETING',
    ];

    const consentMap = new Map(consents.map((c) => [c.consentType, c]));
    const now = new Date();

    return {
      userId,
      consents: consentTypes.map((type) => {
        const consent = consentMap.get(type);
        const isExpired = consent?.expiresAt && consent.expiresAt < now;
        return {
          type,
          granted: consent ? (consent.granted && !isExpired) : false,
          grantedAt: consent?.grantedAt ?? null,
          expiresAt: consent?.expiresAt ?? null,
        };
      }),
      lastUpdated: consents[0]?.updatedAt ?? new Date(),
    };
  }

  /**
   * Check if user has granted specific consent
   */
  async hasConsent(userId: string, consentType: ConsentType): Promise<boolean> {
    const consent = await prisma.userConsent.findFirst({
      where: { userId, consentType },
    });

    if (!consent || !consent.granted) return false;
    if (consent.expiresAt && consent.expiresAt < new Date()) return false;

    return true;
  }

  /**
   * Revoke all consents for a user
   */
  async revokeAllConsents(
    userId: string,
    requestInfo?: { ipAddress?: string; userAgent?: string }
  ): Promise<number> {
    const now = new Date();

    const result = await prisma.userConsent.updateMany({
      where: { userId, granted: true },
      data: {
        granted: false,
        revokedAt: now,
      },
    });

    // Create audit log
    await this.createAuditLog({
      userId,
      action: 'CONSENT_REVOKED',
      details: { revokedAll: true, count: result.count },
      ipAddress: requestInfo?.ipAddress,
      userAgent: requestInfo?.userAgent,
    });

    logger.info('All consents revoked', { userId, count: result.count });

    return result.count;
  }


  // ============================================
  // DMCA Request Handling
  // ============================================

  /**
   * Create a DMCA takedown request
   * Requirement 95: Implement DMCA request handling
   */
  async createDMCARequest(
    input: DMCARequestInput,
    requesterId?: string,
    requestInfo?: { ipAddress?: string; userAgent?: string }
  ): Promise<DMCARequest> {
    if (!this.config.enableDMCA) {
      throw new LegalError('DMCA handling is disabled', 'DMCA_DISABLED');
    }

    // Create DMCA request
    const request = await prisma.dMCARequest.create({
      data: {
        requesterId: requesterId ?? null,
        contentUrl: input.contentUrl,
        contentDescription: input.contentDescription,
        copyrightOwner: input.copyrightOwner,
        copyrightWorkDescription: input.copyrightWorkDescription,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone ?? null,
        contactAddress: input.contactAddress,
        status: 'PENDING',
        signature: input.signature,
      },
    });

    // Create audit log
    await this.createAuditLog({
      userId: requesterId,
      action: 'DMCA_REQUEST_CREATED',
      dmcaRequestId: request.id,
      details: {
        contentUrl: input.contentUrl,
        copyrightOwner: input.copyrightOwner,
      },
      ipAddress: requestInfo?.ipAddress,
      userAgent: requestInfo?.userAgent,
    });

    logger.info('DMCA request created', {
      requestId: request.id,
      contentUrl: input.contentUrl,
    });

    return this.toDMCARequest(request);
  }

  /**
   * Get DMCA request by ID
   */
  async getDMCARequest(requestId: string): Promise<DMCARequest | null> {
    const request = await prisma.dMCARequest.findUnique({
      where: { id: requestId },
    });

    return request ? this.toDMCARequest(request) : null;
  }

  /**
   * Update DMCA request status
   */
  async updateDMCAStatus(
    requestId: string,
    status: DMCAStatus,
    resolutionNotes?: string,
    requestInfo?: { ipAddress?: string; userAgent?: string }
  ): Promise<DMCARequest> {
    const request = await prisma.dMCARequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new LegalError('DMCA request not found', 'DMCA_NOT_FOUND');
    }

    const updateData: Prisma.DMCARequestUpdateInput = {
      status,
      resolutionNotes: resolutionNotes ?? request.resolutionNotes,
    };

    if (status === 'RESOLVED' || status === 'REJECTED' || status === 'RESTORED') {
      updateData.resolvedAt = new Date();
    }

    const updated = await prisma.dMCARequest.update({
      where: { id: requestId },
      data: updateData,
    });

    // Create audit log
    await this.createAuditLog({
      action: 'DMCA_STATUS_UPDATED',
      dmcaRequestId: requestId,
      details: { previousStatus: request.status, newStatus: status, resolutionNotes },
      ipAddress: requestInfo?.ipAddress,
      userAgent: requestInfo?.userAgent,
    });

    logger.info('DMCA status updated', { requestId, status });

    return this.toDMCARequest(updated);
  }

  /**
   * File a counter notice for a DMCA request
   */
  async fileDMCACounterNotice(
    userId: string,
    input: DMCACounterNoticeInput,
    requestInfo?: { ipAddress?: string; userAgent?: string }
  ): Promise<DMCACounterNotice> {
    // Verify DMCA request exists
    const dmcaRequest = await prisma.dMCARequest.findUnique({
      where: { id: input.dmcaRequestId },
    });

    if (!dmcaRequest) {
      throw new LegalError('DMCA request not found', 'DMCA_NOT_FOUND');
    }

    if (dmcaRequest.status !== 'CONTENT_REMOVED') {
      throw new LegalError(
        'Counter notice can only be filed for removed content',
        'INVALID_DMCA_STATUS'
      );
    }

    // Create counter notice
    const counterNotice = await prisma.dMCACounterNotice.create({
      data: {
        dmcaRequestId: input.dmcaRequestId,
        responderId: userId,
        counterStatement: input.counterStatement,
        contactEmail: input.contactEmail,
        contactAddress: input.contactAddress,
        signature: input.signature,
        status: 'PENDING',
      },
    });

    // Update DMCA request status
    await prisma.dMCARequest.update({
      where: { id: input.dmcaRequestId },
      data: { status: 'COUNTER_NOTICE_FILED' },
    });

    // Create audit log
    await this.createAuditLog({
      userId,
      action: 'DMCA_STATUS_UPDATED',
      dmcaRequestId: input.dmcaRequestId,
      details: { counterNoticeId: counterNotice.id, action: 'counter_notice_filed' },
      ipAddress: requestInfo?.ipAddress,
      userAgent: requestInfo?.userAgent,
    });

    logger.info('DMCA counter notice filed', {
      dmcaRequestId: input.dmcaRequestId,
      counterNoticeId: counterNotice.id,
    });

    return this.toDMCACounterNotice(counterNotice);
  }

  /**
   * Get pending DMCA requests (admin)
   */
  async getPendingDMCARequests(): Promise<DMCARequest[]> {
    const requests = await prisma.dMCARequest.findMany({
      where: {
        status: { in: ['PENDING', 'UNDER_REVIEW', 'COUNTER_NOTICE_FILED'] },
      },
      orderBy: { createdAt: 'asc' },
    });

    return requests.map((r) => this.toDMCARequest(r));
  }


  // ============================================
  // License Validation
  // ============================================

  /**
   * Validate a license key
   * Requirement 95: Add license validation
   */
  async validateLicense(
    userId: string,
    input: LicenseValidationInput,
    requestInfo?: { ipAddress?: string; userAgent?: string }
  ): Promise<LicenseValidationResult> {
    if (!this.config.enableLicenseValidation) {
      return {
        valid: true,
        license: null,
        reason: 'License validation disabled',
        features: [],
        expiresAt: null,
        daysRemaining: null,
      };
    }

    // Find license by key
    const license = await prisma.license.findFirst({
      where: { licenseKey: input.licenseKey },
    });

    if (!license) {
      await this.createAuditLog({
        userId,
        action: 'LICENSE_VALIDATED',
        details: { valid: false, reason: 'License not found' },
        ipAddress: requestInfo?.ipAddress,
        userAgent: requestInfo?.userAgent,
      });

      return {
        valid: false,
        license: null,
        reason: 'License key not found',
        features: [],
        expiresAt: null,
        daysRemaining: null,
      };
    }

    // Check if license is active
    if (!license.isActive) {
      return {
        valid: false,
        license: this.toLicense(license),
        reason: 'License is deactivated',
        features: [],
        expiresAt: license.expiresAt,
        daysRemaining: null,
      };
    }

    // Check expiration
    const now = new Date();
    if (license.expiresAt && license.expiresAt < now) {
      await this.createAuditLog({
        userId,
        action: 'LICENSE_EXPIRED',
        licenseId: license.id,
        details: { expiredAt: license.expiresAt.toISOString() },
        ipAddress: requestInfo?.ipAddress,
        userAgent: requestInfo?.userAgent,
      });

      return {
        valid: false,
        license: this.toLicense(license),
        reason: 'License has expired',
        features: [],
        expiresAt: license.expiresAt,
        daysRemaining: 0,
      };
    }

    // Check product ID if specified
    if (input.productId && license.productId && license.productId !== input.productId) {
      return {
        valid: false,
        license: this.toLicense(license),
        reason: 'License is not valid for this product',
        features: [],
        expiresAt: license.expiresAt,
        daysRemaining: this.calculateDaysRemaining(license.expiresAt),
      };
    }

    // Check machine ID if specified
    if (input.machineId && license.machineId && license.machineId !== input.machineId) {
      // Check if we can add another activation
      if (license.currentActivations >= license.maxActivations) {
        return {
          valid: false,
          license: this.toLicense(license),
          reason: 'Maximum activations reached',
          features: [],
          expiresAt: license.expiresAt,
          daysRemaining: this.calculateDaysRemaining(license.expiresAt),
        };
      }
    }

    // License is valid
    await this.createAuditLog({
      userId,
      action: 'LICENSE_VALIDATED',
      licenseId: license.id,
      details: { valid: true, machineId: input.machineId },
      ipAddress: requestInfo?.ipAddress,
      userAgent: requestInfo?.userAgent,
    });

    const features = Array.isArray(license.features) ? license.features as string[] : [];

    return {
      valid: true,
      license: this.toLicense(license),
      reason: null,
      features,
      expiresAt: license.expiresAt,
      daysRemaining: this.calculateDaysRemaining(license.expiresAt),
    };
  }

  /**
   * Get user's licenses
   */
  async getUserLicenses(userId: string): Promise<License[]> {
    const licenses = await prisma.license.findMany({
      where: { userId },
      orderBy: { issuedAt: 'desc' },
    });

    return licenses.map((l) => this.toLicense(l));
  }

  /**
   * Create a new license
   */
  async createLicense(
    userId: string,
    licenseType: LicenseType,
    options?: {
      productId?: string;
      expiresAt?: Date;
      maxActivations?: number;
      features?: string[];
    }
  ): Promise<License> {
    const licenseKey = this.generateLicenseKey();

    const license = await prisma.license.create({
      data: {
        userId,
        licenseKey,
        licenseType,
        productId: options?.productId ?? null,
        expiresAt: options?.expiresAt ?? null,
        maxActivations: options?.maxActivations ?? 1,
        currentActivations: 0,
        features: options?.features ?? [],
        isActive: true,
        metadata: {},
      },
    });

    logger.info('License created', { userId, licenseType, licenseId: license.id });

    return this.toLicense(license);
  }


  // ============================================
  // Export Control
  // ============================================

  /**
   * Check export control restrictions
   * Requirement 95: Create export control enforcement
   */
  async checkExportControl(
    input: ExportControlCheckInput,
    userId?: string,
    requestInfo?: { ipAddress?: string; userAgent?: string }
  ): Promise<ExportControlResult> {
    if (!this.config.enableExportControl) {
      return {
        allowed: true,
        region: 'UNRESTRICTED',
        countryCode: input.countryCode,
        countryName: COUNTRY_NAMES[input.countryCode] ?? input.countryCode,
        restrictions: [],
        requiresLicense: false,
        blockedFeatures: [],
      };
    }

    const countryCode = input.countryCode.toUpperCase();
    const countryName = COUNTRY_NAMES[countryCode] ?? countryCode;

    let region: ExportControlRegion = 'UNRESTRICTED';
    let allowed = true;
    const restrictions: string[] = [];
    const blockedFeatures: string[] = [];
    let requiresLicense = false;

    // Check embargoed countries
    if (EMBARGOED_COUNTRIES.includes(countryCode as typeof EMBARGOED_COUNTRIES[number])) {
      region = 'EMBARGOED';
      allowed = false;
      restrictions.push('Country is under comprehensive trade embargo');
      restrictions.push('All services are prohibited');
      blockedFeatures.push('ALL');
    }
    // Check restricted countries
    else if (RESTRICTED_COUNTRIES.includes(countryCode as typeof RESTRICTED_COUNTRIES[number])) {
      region = 'RESTRICTED';
      restrictions.push('Country has partial trade restrictions');
      restrictions.push('Some features may be limited');
      blockedFeatures.push('ENTERPRISE_FEATURES');
      blockedFeatures.push('BULK_PROCESSING');

      // Government end users in restricted countries need license
      if (input.endUserType === 'GOVERNMENT') {
        requiresLicense = true;
        region = 'REQUIRES_LICENSE';
        restrictions.push('Government end users require export license');
      }
    }

    // Create audit log
    await this.createAuditLog({
      userId,
      action: allowed ? 'EXPORT_CONTROL_CHECK' : 'EXPORT_CONTROL_BLOCKED',
      details: {
        countryCode,
        region,
        allowed,
        endUserType: input.endUserType,
        productType: input.productType,
      },
      ipAddress: requestInfo?.ipAddress,
      userAgent: requestInfo?.userAgent,
    });

    if (!allowed) {
      logger.warn('Export control blocked', { countryCode, region, userId });
    }

    return {
      allowed,
      region,
      countryCode,
      countryName,
      restrictions,
      requiresLicense,
      blockedFeatures,
    };
  }

  /**
   * Check if a user can access the service based on their location
   */
  async canAccessService(
    countryCode: string,
    userId?: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    const result = await this.checkExportControl({ countryCode }, userId);

    if (!result.allowed) {
      return {
        allowed: false,
        reason: `Service not available in ${result.countryName} due to export control restrictions`,
      };
    }

    if (result.requiresLicense) {
      return {
        allowed: false,
        reason: `Access from ${result.countryName} requires an export license`,
      };
    }

    return { allowed: true };
  }

  // ============================================
  // Audit Logging
  // ============================================

  /**
   * Create audit log entry
   */
  async createAuditLog(options: CreateLegalAuditLogOptions): Promise<LegalAuditLogEntry> {
    const log = await prisma.legalAuditLog.create({
      data: {
        userId: options.userId ?? null,
        action: options.action,
        documentType: options.documentType ?? null,
        consentType: options.consentType ?? null,
        dmcaRequestId: options.dmcaRequestId ?? null,
        licenseId: options.licenseId ?? null,
        details: (options.details as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        ipAddress: options.ipAddress ?? null,
        userAgent: options.userAgent ?? null,
      },
    });

    return this.toLegalAuditLogEntry(log);
  }

  /**
   * Get audit logs with filtering
   */
  async getAuditLogs(options: {
    userId?: string;
    action?: LegalAuditAction;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ logs: LegalAuditLogEntry[]; total: number }> {
    const { userId, action, startDate, endDate, page = 1, limit = 50 } = options;
    const skip = (page - 1) * limit;

    const whereClause: Prisma.LegalAuditLogWhereInput = {};
    if (userId) whereClause.userId = userId;
    if (action) whereClause.action = action;
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = startDate;
      if (endDate) whereClause.createdAt.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.legalAuditLog.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.legalAuditLog.count({ where: whereClause }),
    ]);

    return {
      logs: logs.map((l) => this.toLegalAuditLogEntry(l)),
      total,
    };
  }


  // ============================================
  // Private Helper Methods
  // ============================================

  /**
   * Generate a unique license key
   */
  private generateLicenseKey(): string {
    const segments = [];
    for (let i = 0; i < 4; i++) {
      segments.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return segments.join('-');
  }

  /**
   * Calculate days remaining until a date
   */
  private calculateDaysRemaining(date: Date | null): number | null {
    if (!date) return null;
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  /**
   * Convert database legal document to response type
   */
  private toLegalDocument(doc: {
    id: string;
    type: string;
    version: string;
    title: string;
    content: string;
    effectiveDate: Date;
    createdAt: Date;
    isActive: boolean;
  }): LegalDocument {
    return {
      id: doc.id,
      type: doc.type as LegalDocumentType,
      version: doc.version,
      title: doc.title,
      content: doc.content,
      effectiveDate: doc.effectiveDate,
      createdAt: doc.createdAt,
      isActive: doc.isActive,
    };
  }

  /**
   * Convert database terms acceptance to response type
   */
  private toTermsAcceptance(acceptance: {
    id: string;
    userId: string;
    documentType: string;
    documentVersion: string;
    acceptedAt: Date;
    ipAddress: string | null;
    userAgent: string | null;
  }): TermsAcceptance {
    return {
      id: acceptance.id,
      userId: acceptance.userId,
      documentType: acceptance.documentType as LegalDocumentType,
      documentVersion: acceptance.documentVersion,
      acceptedAt: acceptance.acceptedAt,
      ipAddress: acceptance.ipAddress,
      userAgent: acceptance.userAgent,
    };
  }

  /**
   * Convert database user consent to response type
   */
  private toUserConsent(consent: {
    id: string;
    userId: string;
    consentType: string;
    granted: boolean;
    grantedAt: Date | null;
    revokedAt: Date | null;
    expiresAt: Date | null;
    ipAddress: string | null;
    userAgent: string | null;
  }): UserConsent {
    return {
      id: consent.id,
      userId: consent.userId,
      consentType: consent.consentType as ConsentType,
      granted: consent.granted,
      grantedAt: consent.grantedAt,
      revokedAt: consent.revokedAt,
      expiresAt: consent.expiresAt,
      ipAddress: consent.ipAddress,
      userAgent: consent.userAgent,
    };
  }

  /**
   * Convert database DMCA request to response type
   */
  private toDMCARequest(request: {
    id: string;
    requesterId: string | null;
    contentUrl: string;
    contentDescription: string;
    copyrightOwner: string;
    copyrightWorkDescription: string;
    contactEmail: string;
    contactPhone: string | null;
    contactAddress: string;
    status: string;
    signature: string;
    createdAt: Date;
    updatedAt: Date;
    resolvedAt: Date | null;
    resolutionNotes: string | null;
    affectedUserId: string | null;
    affectedProjectId: string | null;
  }): DMCARequest {
    return {
      id: request.id,
      requesterId: request.requesterId,
      contentUrl: request.contentUrl,
      contentDescription: request.contentDescription,
      copyrightOwner: request.copyrightOwner,
      copyrightWorkDescription: request.copyrightWorkDescription,
      contactEmail: request.contactEmail,
      contactPhone: request.contactPhone,
      contactAddress: request.contactAddress,
      status: request.status as DMCAStatus,
      signature: request.signature,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      resolvedAt: request.resolvedAt,
      resolutionNotes: request.resolutionNotes,
      affectedUserId: request.affectedUserId,
      affectedProjectId: request.affectedProjectId,
    };
  }

  /**
   * Convert database DMCA counter notice to response type
   */
  private toDMCACounterNotice(notice: {
    id: string;
    dmcaRequestId: string;
    responderId: string;
    counterStatement: string;
    contactEmail: string;
    contactAddress: string;
    signature: string;
    createdAt: Date;
    status: string;
  }): DMCACounterNotice {
    return {
      id: notice.id,
      dmcaRequestId: notice.dmcaRequestId,
      responderId: notice.responderId,
      counterStatement: notice.counterStatement,
      contactEmail: notice.contactEmail,
      contactAddress: notice.contactAddress,
      signature: notice.signature,
      createdAt: notice.createdAt,
      status: notice.status as 'PENDING' | 'ACCEPTED' | 'REJECTED',
    };
  }

  /**
   * Convert database license to response type
   */
  private toLicense(license: {
    id: string;
    userId: string;
    licenseKey: string;
    licenseType: string;
    productId: string | null;
    machineId: string | null;
    issuedAt: Date;
    expiresAt: Date | null;
    isActive: boolean;
    maxActivations: number;
    currentActivations: number;
    features: unknown;
    metadata: unknown;
  }): License {
    return {
      id: license.id,
      userId: license.userId,
      licenseKey: license.licenseKey,
      licenseType: license.licenseType as LicenseType,
      productId: license.productId,
      machineId: license.machineId,
      issuedAt: license.issuedAt,
      expiresAt: license.expiresAt,
      isActive: license.isActive,
      maxActivations: license.maxActivations,
      currentActivations: license.currentActivations,
      features: Array.isArray(license.features) ? license.features as string[] : [],
      metadata: (license.metadata as Record<string, unknown>) ?? {},
    };
  }

  /**
   * Convert database audit log to response type
   */
  private toLegalAuditLogEntry(log: {
    id: string;
    userId: string | null;
    action: string;
    documentType: string | null;
    consentType: string | null;
    dmcaRequestId: string | null;
    licenseId: string | null;
    details: unknown;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: Date;
  }): LegalAuditLogEntry {
    return {
      id: log.id,
      userId: log.userId,
      action: log.action as LegalAuditAction,
      documentType: log.documentType as LegalDocumentType | null,
      consentType: log.consentType as ConsentType | null,
      dmcaRequestId: log.dmcaRequestId,
      licenseId: log.licenseId,
      details: (log.details as Record<string, unknown>) ?? {},
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt,
    };
  }
}

// Export singleton instance
export const legalService = new LegalService();
