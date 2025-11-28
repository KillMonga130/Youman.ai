/**
 * Content Moderation Service Types
 * Type definitions for content scanning, flagging, review workflow, policy enforcement, and abuse detection
 * Requirements: 97 - Content moderation features
 */

import { z } from 'zod';

// ============================================
// Enums
// ============================================

/**
 * Content moderation status
 */
export type ModerationStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'FLAGGED'
  | 'REJECTED'
  | 'UNDER_REVIEW'
  | 'APPEALED'
  | 'APPEAL_APPROVED'
  | 'APPEAL_REJECTED';

/**
 * Content flag types
 */
export type FlagType =
  | 'SPAM'
  | 'HATE_SPEECH'
  | 'HARASSMENT'
  | 'VIOLENCE'
  | 'ADULT_CONTENT'
  | 'MISINFORMATION'
  | 'COPYRIGHT'
  | 'PERSONAL_INFO'
  | 'MALWARE'
  | 'PHISHING'
  | 'OTHER';

/**
 * Flag severity levels
 */
export type FlagSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * Policy types
 */
export type PolicyType =
  | 'CONTENT_GUIDELINES'
  | 'ACCEPTABLE_USE'
  | 'COPYRIGHT'
  | 'PRIVACY'
  | 'SPAM_PREVENTION'
  | 'HATE_SPEECH'
  | 'VIOLENCE'
  | 'ADULT_CONTENT';

/**
 * Policy action types
 */
export type PolicyAction =
  | 'WARN'
  | 'FLAG_FOR_REVIEW'
  | 'AUTO_REJECT'
  | 'QUARANTINE'
  | 'NOTIFY_USER'
  | 'SUSPEND_USER'
  | 'BAN_USER';

/**
 * Appeal status
 */
export type AppealStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';

/**
 * Abuse pattern types
 */
export type AbusePatternType =
  | 'RATE_ABUSE'
  | 'CONTENT_FLOODING'
  | 'COORDINATED_ATTACK'
  | 'BOT_ACTIVITY'
  | 'ACCOUNT_FARMING'
  | 'EVASION_ATTEMPT';

/**
 * Moderation audit action types
 */
export type ModerationAuditAction =
  | 'CONTENT_SCANNED'
  | 'CONTENT_FLAGGED'
  | 'CONTENT_APPROVED'
  | 'CONTENT_REJECTED'
  | 'REVIEW_STARTED'
  | 'REVIEW_COMPLETED'
  | 'APPEAL_SUBMITTED'
  | 'APPEAL_REVIEWED'
  | 'POLICY_ENFORCED'
  | 'ABUSE_DETECTED'
  | 'USER_WARNED'
  | 'USER_SUSPENDED';

// ============================================
// Validation Schemas
// ============================================

/**
 * Schema for scanning content
 */
export const scanContentSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  contentType: z.enum(['TEXT', 'DOCUMENT', 'PROJECT']).default('TEXT'),
  projectId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Schema for flagging content
 */
export const flagContentSchema = z.object({
  contentId: z.string().uuid('Invalid content ID'),
  flagType: z.enum([
    'SPAM',
    'HATE_SPEECH',
    'HARASSMENT',
    'VIOLENCE',
    'ADULT_CONTENT',
    'MISINFORMATION',
    'COPYRIGHT',
    'PERSONAL_INFO',
    'MALWARE',
    'PHISHING',
    'OTHER',
  ]),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
  evidence: z.string().optional(),
});

/**
 * Schema for reviewing flagged content
 */
export const reviewContentSchema = z.object({
  flagId: z.string().uuid('Invalid flag ID'),
  decision: z.enum(['APPROVE', 'REJECT', 'ESCALATE']),
  notes: z.string().max(2000).optional(),
  actionTaken: z.enum([
    'WARN',
    'FLAG_FOR_REVIEW',
    'AUTO_REJECT',
    'QUARANTINE',
    'NOTIFY_USER',
    'SUSPEND_USER',
    'BAN_USER',
  ]).optional(),
});

/**
 * Schema for submitting an appeal
 */
export const submitAppealSchema = z.object({
  flagId: z.string().uuid('Invalid flag ID'),
  reason: z.string().min(20, 'Appeal reason must be at least 20 characters'),
  additionalEvidence: z.string().optional(),
});

/**
 * Schema for reviewing an appeal
 */
export const reviewAppealSchema = z.object({
  appealId: z.string().uuid('Invalid appeal ID'),
  decision: z.enum(['APPROVE', 'REJECT']),
  notes: z.string().max(2000).optional(),
});

/**
 * Schema for creating a policy
 */
export const createPolicySchema = z.object({
  name: z.string().min(3, 'Policy name must be at least 3 characters'),
  type: z.enum([
    'CONTENT_GUIDELINES',
    'ACCEPTABLE_USE',
    'COPYRIGHT',
    'PRIVACY',
    'SPAM_PREVENTION',
    'HATE_SPEECH',
    'VIOLENCE',
    'ADULT_CONTENT',
  ]),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  rules: z.array(z.object({
    pattern: z.string(),
    action: z.enum([
      'WARN',
      'FLAG_FOR_REVIEW',
      'AUTO_REJECT',
      'QUARANTINE',
      'NOTIFY_USER',
      'SUSPEND_USER',
      'BAN_USER',
    ]),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  })),
  isActive: z.boolean().default(true),
});

/**
 * Schema for reporting abuse
 */
export const reportAbuseSchema = z.object({
  targetUserId: z.string().uuid('Invalid user ID'),
  patternType: z.enum([
    'RATE_ABUSE',
    'CONTENT_FLOODING',
    'COORDINATED_ATTACK',
    'BOT_ACTIVITY',
    'ACCOUNT_FARMING',
    'EVASION_ATTEMPT',
  ]),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  evidence: z.array(z.string()).optional(),
});

// ============================================
// Types derived from schemas
// ============================================

export type ScanContentInput = z.infer<typeof scanContentSchema>;
export type FlagContentInput = z.infer<typeof flagContentSchema>;
export type ReviewContentInput = z.infer<typeof reviewContentSchema>;
export type SubmitAppealInput = z.infer<typeof submitAppealSchema>;
export type ReviewAppealInput = z.infer<typeof reviewAppealSchema>;
export type CreatePolicyInput = z.infer<typeof createPolicySchema>;
export type ReportAbuseInput = z.infer<typeof reportAbuseSchema>;

// ============================================
// Response Types
// ============================================

/**
 * Content scan result
 */
export interface ContentScanResult {
  id: string;
  contentId: string;
  status: ModerationStatus;
  flags: ContentFlag[];
  riskScore: number; // 0-100
  scannedAt: Date;
  processingTimeMs: number;
  policyViolations: PolicyViolation[];
  recommendations: string[];
}

/**
 * Content flag record
 */
export interface ContentFlag {
  id: string;
  contentId: string;
  flagType: FlagType;
  severity: FlagSeverity;
  reason: string;
  evidence: string | null;
  reportedBy: string | null;
  status: ModerationStatus;
  createdAt: Date;
  updatedAt: Date;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  reviewNotes: string | null;
}

/**
 * Policy violation record
 */
export interface PolicyViolation {
  policyId: string;
  policyName: string;
  policyType: PolicyType;
  ruleMatched: string;
  severity: FlagSeverity;
  action: PolicyAction;
  matchedContent: string;
  position: { start: number; end: number } | null;
}

/**
 * Moderation policy
 */
export interface ModerationPolicy {
  id: string;
  name: string;
  type: PolicyType;
  description: string;
  rules: PolicyRule[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * Policy rule
 */
export interface PolicyRule {
  id: string;
  pattern: string;
  action: PolicyAction;
  severity: FlagSeverity;
  matchCount: number;
  lastMatchedAt: Date | null;
}

/**
 * Appeal record
 */
export interface Appeal {
  id: string;
  flagId: string;
  userId: string;
  reason: string;
  additionalEvidence: string | null;
  status: AppealStatus;
  createdAt: Date;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  reviewNotes: string | null;
}

/**
 * Abuse report record
 */
export interface AbuseReport {
  id: string;
  reporterId: string | null;
  targetUserId: string;
  patternType: AbusePatternType;
  description: string;
  evidence: string[];
  status: 'PENDING' | 'INVESTIGATING' | 'CONFIRMED' | 'DISMISSED';
  createdAt: Date;
  investigatedBy: string | null;
  investigatedAt: Date | null;
  actionTaken: PolicyAction | null;
}

/**
 * Abuse detection result
 */
export interface AbuseDetectionResult {
  userId: string;
  detected: boolean;
  patterns: DetectedPattern[];
  riskScore: number; // 0-100
  recommendedAction: PolicyAction | null;
  detectedAt: Date;
}

/**
 * Detected abuse pattern
 */
export interface DetectedPattern {
  type: AbusePatternType;
  confidence: number; // 0-100
  indicators: string[];
  timeWindow: { start: Date; end: Date };
  eventCount: number;
}

/**
 * Moderation queue item
 */
export interface ModerationQueueItem {
  id: string;
  contentId: string;
  contentPreview: string;
  flagType: FlagType;
  severity: FlagSeverity;
  reportedBy: string | null;
  reportedAt: Date;
  assignedTo: string | null;
  priority: number;
  status: ModerationStatus;
}

/**
 * Moderation statistics
 */
export interface ModerationStats {
  totalScanned: number;
  totalFlagged: number;
  totalApproved: number;
  totalRejected: number;
  pendingReview: number;
  pendingAppeals: number;
  averageReviewTimeMs: number;
  flagsByType: Record<FlagType, number>;
  flagsBySeverity: Record<FlagSeverity, number>;
  periodStart: Date;
  periodEnd: Date;
}

/**
 * User moderation history
 */
export interface UserModerationHistory {
  userId: string;
  totalFlags: number;
  totalViolations: number;
  totalWarnings: number;
  suspensionCount: number;
  currentStatus: 'GOOD_STANDING' | 'WARNING' | 'SUSPENDED' | 'BANNED';
  lastViolationAt: Date | null;
  flags: ContentFlag[];
  appeals: Appeal[];
}

/**
 * Moderation audit log entry
 */
export interface ModerationAuditLogEntry {
  id: string;
  action: ModerationAuditAction;
  actorId: string | null;
  targetUserId: string | null;
  contentId: string | null;
  flagId: string | null;
  appealId: string | null;
  policyId: string | null;
  details: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: Date;
}

/**
 * Service configuration
 */
export interface ContentModerationConfig {
  enableAutoScan: boolean;
  enableAbuseDetection: boolean;
  autoRejectThreshold: number; // Risk score threshold for auto-rejection
  flagReviewRequired: boolean;
  maxAppealsPerUser: number;
  appealWindowDays: number;
  suspensionThresholdViolations: number;
  banThresholdViolations: number;
}

/**
 * Default configuration
 */
export const DEFAULT_MODERATION_CONFIG: ContentModerationConfig = {
  enableAutoScan: true,
  enableAbuseDetection: true,
  autoRejectThreshold: 90,
  flagReviewRequired: true,
  maxAppealsPerUser: 3,
  appealWindowDays: 14,
  suspensionThresholdViolations: 3,
  banThresholdViolations: 5,
};

/**
 * Harmful content patterns for detection
 */
export const HARMFUL_PATTERNS: Record<FlagType, RegExp[]> = {
  SPAM: [
    /\b(buy now|click here|limited offer|act now|free money)\b/gi,
    /(.)\1{10,}/g, // Repeated characters
    /(https?:\/\/[^\s]+){5,}/g, // Multiple URLs
  ],
  HATE_SPEECH: [
    // Placeholder patterns - real implementation would use ML models
    /\b(hate|kill all|exterminate)\s+(group|people|race)\b/gi,
  ],
  HARASSMENT: [
    /\b(threat|kill you|hurt you|find you)\b/gi,
  ],
  VIOLENCE: [
    /\b(bomb|attack|murder|assassinate)\s+(plan|how to|instructions)\b/gi,
  ],
  ADULT_CONTENT: [
    // Placeholder - real implementation would use content classification
  ],
  MISINFORMATION: [
    // Placeholder - real implementation would use fact-checking APIs
  ],
  COPYRIGHT: [
    /\b(pirated|cracked|keygen|serial key)\b/gi,
  ],
  PERSONAL_INFO: [
    /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g, // SSN pattern
    /\b\d{16}\b/g, // Credit card pattern
  ],
  MALWARE: [
    /\b(virus|trojan|ransomware|keylogger)\s+(download|install)\b/gi,
  ],
  PHISHING: [
    /\b(verify your account|confirm your identity|update payment)\b/gi,
    /\b(password|login|credentials)\s+(expired|required|needed)\b/gi,
  ],
  OTHER: [],
};

/**
 * Severity weights for risk calculation
 */
export const SEVERITY_WEIGHTS: Record<FlagSeverity, number> = {
  LOW: 10,
  MEDIUM: 30,
  HIGH: 60,
  CRITICAL: 100,
};
