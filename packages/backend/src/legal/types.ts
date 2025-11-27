/**
 * Legal and Compliance Service Types
 * Type definitions for terms of service, consent management, DMCA handling, and license validation
 * Requirements: 95 - Legal and compliance features
 */

import { z } from 'zod';

// ============================================
// Enums
// ============================================

/**
 * Types of legal documents
 */
export type LegalDocumentType =
  | 'TERMS_OF_SERVICE'
  | 'PRIVACY_POLICY'
  | 'ACCEPTABLE_USE_POLICY'
  | 'DATA_PROCESSING_AGREEMENT'
  | 'COOKIE_POLICY';

/**
 * Consent types for tracking user consent
 */
export type ConsentType =
  | 'MARKETING_EMAILS'
  | 'ANALYTICS_TRACKING'
  | 'THIRD_PARTY_SHARING'
  | 'DATA_PROCESSING'
  | 'COOKIE_ESSENTIAL'
  | 'COOKIE_ANALYTICS'
  | 'COOKIE_MARKETING';

/**
 * DMCA request status
 */
export type DMCAStatus =
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'CONTENT_REMOVED'
  | 'COUNTER_NOTICE_FILED'
  | 'RESTORED'
  | 'REJECTED'
  | 'RESOLVED';

/**
 * License types
 */
export type LicenseType =
  | 'FREE'
  | 'PROFESSIONAL'
  | 'ENTERPRISE'
  | 'ACADEMIC'
  | 'TRIAL';

/**
 * Export control regions
 */
export type ExportControlRegion =
  | 'UNRESTRICTED'
  | 'EMBARGOED'
  | 'RESTRICTED'
  | 'REQUIRES_LICENSE';

/**
 * Audit action types
 */
export type LegalAuditAction =
  | 'TOS_ACCEPTED'
  | 'TOS_VERSION_UPDATED'
  | 'CONSENT_GRANTED'
  | 'CONSENT_REVOKED'
  | 'DMCA_REQUEST_CREATED'
  | 'DMCA_STATUS_UPDATED'
  | 'LICENSE_VALIDATED'
  | 'LICENSE_EXPIRED'
  | 'EXPORT_CONTROL_CHECK'
  | 'EXPORT_CONTROL_BLOCKED';

// ============================================
// Validation Schemas
// ============================================

/**
 * Schema for accepting terms of service
 */
export const acceptTermsSchema = z.object({
  documentType: z.enum([
    'TERMS_OF_SERVICE',
    'PRIVACY_POLICY',
    'ACCEPTABLE_USE_POLICY',
    'DATA_PROCESSING_AGREEMENT',
    'COOKIE_POLICY',
  ]),
  version: z.string().min(1, 'Version is required'),
  acceptedAt: z.coerce.date().optional(),
});

/**
 * Schema for managing consent
 */
export const consentSchema = z.object({
  consentType: z.enum([
    'MARKETING_EMAILS',
    'ANALYTICS_TRACKING',
    'THIRD_PARTY_SHARING',
    'DATA_PROCESSING',
    'COOKIE_ESSENTIAL',
    'COOKIE_ANALYTICS',
    'COOKIE_MARKETING',
  ]),
  granted: z.boolean(),
  expiresAt: z.coerce.date().optional(),
});

/**
 * Schema for DMCA request
 */
export const dmcaRequestSchema = z.object({
  contentUrl: z.string().url('Invalid content URL'),
  contentDescription: z.string().min(10, 'Description must be at least 10 characters'),
  copyrightOwner: z.string().min(1, 'Copyright owner is required'),
  copyrightWorkDescription: z.string().min(10, 'Copyright work description is required'),
  contactEmail: z.string().email('Invalid email address'),
  contactPhone: z.string().optional(),
  contactAddress: z.string().min(10, 'Contact address is required'),
  goodFaithStatement: z.boolean().refine((val) => val === true, {
    message: 'Good faith statement must be acknowledged',
  }),
  accuracyStatement: z.boolean().refine((val) => val === true, {
    message: 'Accuracy statement must be acknowledged',
  }),
  signature: z.string().min(1, 'Digital signature is required'),
});

/**
 * Schema for DMCA counter notice
 */
export const dmcaCounterNoticeSchema = z.object({
  dmcaRequestId: z.string().uuid('Invalid DMCA request ID'),
  counterStatement: z.string().min(50, 'Counter statement must be at least 50 characters'),
  contactEmail: z.string().email('Invalid email address'),
  contactAddress: z.string().min(10, 'Contact address is required'),
  consentToJurisdiction: z.boolean().refine((val) => val === true, {
    message: 'Consent to jurisdiction must be acknowledged',
  }),
  perjuryStatement: z.boolean().refine((val) => val === true, {
    message: 'Perjury statement must be acknowledged',
  }),
  signature: z.string().min(1, 'Digital signature is required'),
});

/**
 * Schema for license validation
 */
export const licenseValidationSchema = z.object({
  licenseKey: z.string().min(16, 'Invalid license key format'),
  productId: z.string().optional(),
  machineId: z.string().optional(),
});

/**
 * Schema for export control check
 */
export const exportControlCheckSchema = z.object({
  countryCode: z.string().length(2, 'Country code must be 2 characters'),
  productType: z.string().optional(),
  endUserType: z.enum(['INDIVIDUAL', 'BUSINESS', 'GOVERNMENT', 'EDUCATIONAL']).optional(),
});

// ============================================
// Types derived from schemas
// ============================================

export type AcceptTermsInput = z.infer<typeof acceptTermsSchema>;
export type ConsentInput = z.infer<typeof consentSchema>;
export type DMCARequestInput = z.infer<typeof dmcaRequestSchema>;
export type DMCACounterNoticeInput = z.infer<typeof dmcaCounterNoticeSchema>;
export type LicenseValidationInput = z.infer<typeof licenseValidationSchema>;
export type ExportControlCheckInput = z.infer<typeof exportControlCheckSchema>;

// ============================================
// Response Types
// ============================================

/**
 * Legal document version
 */
export interface LegalDocument {
  id: string;
  type: LegalDocumentType;
  version: string;
  title: string;
  content: string;
  effectiveDate: Date;
  createdAt: Date;
  isActive: boolean;
}

/**
 * Terms acceptance record
 */
export interface TermsAcceptance {
  id: string;
  userId: string;
  documentType: LegalDocumentType;
  documentVersion: string;
  acceptedAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
}

/**
 * User consent record
 */
export interface UserConsent {
  id: string;
  userId: string;
  consentType: ConsentType;
  granted: boolean;
  grantedAt: Date | null;
  revokedAt: Date | null;
  expiresAt: Date | null;
  ipAddress: string | null;
  userAgent: string | null;
}

/**
 * DMCA request record
 */
export interface DMCARequest {
  id: string;
  requesterId: string | null;
  contentUrl: string;
  contentDescription: string;
  copyrightOwner: string;
  copyrightWorkDescription: string;
  contactEmail: string;
  contactPhone: string | null;
  contactAddress: string;
  status: DMCAStatus;
  signature: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  resolutionNotes: string | null;
  affectedUserId: string | null;
  affectedProjectId: string | null;
}

/**
 * DMCA counter notice record
 */
export interface DMCACounterNotice {
  id: string;
  dmcaRequestId: string;
  responderId: string;
  counterStatement: string;
  contactEmail: string;
  contactAddress: string;
  signature: string;
  createdAt: Date;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
}

/**
 * License record
 */
export interface License {
  id: string;
  userId: string;
  licenseKey: string;
  licenseType: LicenseType;
  productId: string | null;
  machineId: string | null;
  issuedAt: Date;
  expiresAt: Date | null;
  isActive: boolean;
  maxActivations: number;
  currentActivations: number;
  features: string[];
  metadata: Record<string, unknown>;
}

/**
 * License validation result
 */
export interface LicenseValidationResult {
  valid: boolean;
  license: License | null;
  reason: string | null;
  features: string[];
  expiresAt: Date | null;
  daysRemaining: number | null;
}

/**
 * Export control check result
 */
export interface ExportControlResult {
  allowed: boolean;
  region: ExportControlRegion;
  countryCode: string;
  countryName: string;
  restrictions: string[];
  requiresLicense: boolean;
  blockedFeatures: string[];
}

/**
 * Legal audit log entry
 */
export interface LegalAuditLogEntry {
  id: string;
  userId: string | null;
  action: LegalAuditAction;
  documentType: LegalDocumentType | null;
  consentType: ConsentType | null;
  dmcaRequestId: string | null;
  licenseId: string | null;
  details: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

/**
 * Consent status summary
 */
export interface ConsentStatusSummary {
  userId: string;
  consents: {
    type: ConsentType;
    granted: boolean;
    grantedAt: Date | null;
    expiresAt: Date | null;
  }[];
  lastUpdated: Date;
}

/**
 * Terms acceptance status
 */
export interface TermsAcceptanceStatus {
  userId: string;
  acceptedDocuments: {
    type: LegalDocumentType;
    version: string;
    acceptedAt: Date;
    isCurrentVersion: boolean;
  }[];
  pendingDocuments: {
    type: LegalDocumentType;
    currentVersion: string;
    effectiveDate: Date;
  }[];
  allAccepted: boolean;
}

/**
 * Service configuration
 */
export interface LegalServiceConfig {
  enableExportControl: boolean;
  enableDMCA: boolean;
  enableLicenseValidation: boolean;
  defaultConsentExpireDays: number;
  dmcaResponseDays: number;
  counterNoticeDays: number;
}

/**
 * Create audit log options
 */
export interface CreateLegalAuditLogOptions {
  userId?: string;
  action: LegalAuditAction;
  documentType?: LegalDocumentType;
  consentType?: ConsentType;
  dmcaRequestId?: string;
  licenseId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Embargoed countries list
 */
export const EMBARGOED_COUNTRIES = [
  'CU', // Cuba
  'IR', // Iran
  'KP', // North Korea
  'SY', // Syria
  'RU', // Russia (partial)
] as const;

/**
 * Restricted countries list
 */
export const RESTRICTED_COUNTRIES = [
  'BY', // Belarus
  'VE', // Venezuela
  'MM', // Myanmar
  'ZW', // Zimbabwe
] as const;

/**
 * Country names mapping
 */
export const COUNTRY_NAMES: Record<string, string> = {
  CU: 'Cuba',
  IR: 'Iran',
  KP: 'North Korea',
  SY: 'Syria',
  RU: 'Russia',
  BY: 'Belarus',
  VE: 'Venezuela',
  MM: 'Myanmar',
  ZW: 'Zimbabwe',
  US: 'United States',
  GB: 'United Kingdom',
  DE: 'Germany',
  FR: 'France',
  CA: 'Canada',
  AU: 'Australia',
  JP: 'Japan',
  // Add more as needed
};
