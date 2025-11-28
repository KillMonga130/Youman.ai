/**
 * Content Moderation Service
 * Manages content scanning, flagging, review workflow, policy enforcement, and abuse detection
 * Requirements: 97 - Content moderation features
 */

import { prisma } from '../database/prisma';
import { Prisma } from '../generated/prisma';
import { logger } from '../utils/logger';
import type {
  ContentScanResult,
  ContentFlag,
  ModerationStatus,
  FlagType,
  FlagSeverity,
  PolicyViolation,
  ModerationPolicy,
  PolicyRule,
  PolicyType,
  PolicyAction,
  Appeal,
  AppealStatus,
  AbuseReport,
  AbuseDetectionResult,
  AbusePatternType,
  DetectedPattern,
  ModerationQueueItem,
  ModerationStats,
  UserModerationHistory,
  ModerationAuditLogEntry,
  ModerationAuditAction,
  ContentModerationConfig,
  ScanContentInput,
  FlagContentInput,
  ReviewContentInput,
  SubmitAppealInput,
  ReviewAppealInput,
  CreatePolicyInput,
  ReportAbuseInput,
} from './types';
import {
  DEFAULT_MODERATION_CONFIG,
  HARMFUL_PATTERNS,
  SEVERITY_WEIGHTS,
} from './types';

/**
 * Custom error class for content moderation errors
 */
export class ContentModerationError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'ContentModerationError';
    this.code = code;
  }
}

/**
 * Content Moderation Service class
 * Handles content scanning, flagging, review, policy enforcement, and abuse detection
 */
export class ContentModerationService {
  private config: ContentModerationConfig;

  constructor(serviceConfig?: Partial<ContentModerationConfig>) {
    this.config = { ...DEFAULT_MODERATION_CONFIG, ...serviceConfig };
  }


  // ============================================
  // Content Scanning
  // ============================================

  /**
   * Scan content for policy violations
   * Requirement 97: Create content scanning system
   */
  async scanContent(userId: string, input: ScanContentInput): Promise<ContentScanResult> {
    const startTime = Date.now();

    // Generate content ID if not provided
    const contentId = input.projectId ?? this.generateContentId();

    // Get active policies
    const policies = await this.getActivePolicies();

    // Scan content against policies
    const violations: PolicyViolation[] = [];
    const flags: ContentFlag[] = [];

    for (const policy of policies) {
      const policyViolations = this.checkPolicyViolations(input.content, policy);
      violations.push(...policyViolations);
    }

    // Check for harmful patterns
    const patternFlags = this.detectHarmfulPatterns(input.content);
    
    // Calculate risk score
    const riskScore = this.calculateRiskScore(violations, patternFlags);

    // Determine status based on risk score
    let status: ModerationStatus = 'APPROVED';
    if (riskScore >= this.config.autoRejectThreshold) {
      status = 'REJECTED';
    } else if (violations.length > 0 || patternFlags.length > 0) {
      status = this.config.flagReviewRequired ? 'FLAGGED' : 'APPROVED';
    }

    // Create flags for detected issues
    for (const patternFlag of patternFlags) {
      const flag = await this.createFlag({
        contentId,
        flagType: patternFlag.type,
        severity: patternFlag.severity,
        reason: patternFlag.reason,
        evidence: patternFlag.evidence,
        reportedBy: null,
        status,
      });
      flags.push(flag);
    }

    // Store scan result
    const scanResult = await prisma.contentScanResult.create({
      data: {
        contentId,
        userId,
        status,
        riskScore,
        contentType: input.contentType,
        processingTimeMs: Date.now() - startTime,
        violations: violations as unknown as Prisma.InputJsonValue,
        metadata: (input.metadata as Prisma.InputJsonValue) ?? {},
      },
    });

    // Log audit entry
    await this.createAuditLog({
      action: 'CONTENT_SCANNED',
      actorId: userId,
      contentId,
      details: { riskScore, status, violationCount: violations.length },
    });

    logger.info('Content scanned', { contentId, riskScore, status, userId });

    return {
      id: scanResult.id,
      contentId,
      status,
      flags,
      riskScore,
      scannedAt: scanResult.createdAt,
      processingTimeMs: Date.now() - startTime,
      policyViolations: violations,
      recommendations: this.generateRecommendations(violations, patternFlags),
    };
  }

  /**
   * Check content against a policy
   */
  private checkPolicyViolations(content: string, policy: ModerationPolicy): PolicyViolation[] {
    const violations: PolicyViolation[] = [];

    for (const rule of policy.rules) {
      try {
        const regex = new RegExp(rule.pattern, 'gi');
        const matches = content.match(regex);

        if (matches && matches.length > 0) {
          for (const match of matches) {
            const position = content.indexOf(match);
            violations.push({
              policyId: policy.id,
              policyName: policy.name,
              policyType: policy.type,
              ruleMatched: rule.pattern,
              severity: rule.severity,
              action: rule.action,
              matchedContent: match.substring(0, 100),
              position: { start: position, end: position + match.length },
            });
          }
        }
      } catch {
        // Invalid regex pattern, skip
        logger.warn('Invalid policy rule pattern', { policyId: policy.id, pattern: rule.pattern });
      }
    }

    return violations;
  }

  /**
   * Detect harmful patterns in content
   */
  private detectHarmfulPatterns(content: string): Array<{
    type: FlagType;
    severity: FlagSeverity;
    reason: string;
    evidence: string;
  }> {
    const detected: Array<{
      type: FlagType;
      severity: FlagSeverity;
      reason: string;
      evidence: string;
    }> = [];

    for (const [flagType, patterns] of Object.entries(HARMFUL_PATTERNS)) {
      for (const pattern of patterns) {
        const matches = content.match(pattern);
        if (matches && matches.length > 0) {
          detected.push({
            type: flagType as FlagType,
            severity: this.determineSeverity(flagType as FlagType, matches.length),
            reason: `Detected ${flagType.toLowerCase().replace('_', ' ')} pattern`,
            evidence: matches.slice(0, 3).join(', '),
          });
        }
      }
    }

    return detected;
  }

  /**
   * Determine severity based on flag type and match count
   */
  private determineSeverity(flagType: FlagType, matchCount: number): FlagSeverity {
    const highSeverityTypes: FlagType[] = ['HATE_SPEECH', 'VIOLENCE', 'MALWARE', 'PHISHING'];
    const criticalTypes: FlagType[] = ['PERSONAL_INFO'];

    if (criticalTypes.includes(flagType)) return 'CRITICAL';
    if (highSeverityTypes.includes(flagType)) return matchCount > 2 ? 'CRITICAL' : 'HIGH';
    if (matchCount > 5) return 'HIGH';
    if (matchCount > 2) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Calculate risk score from violations and flags
   */
  private calculateRiskScore(
    violations: PolicyViolation[],
    flags: Array<{ severity: FlagSeverity }>
  ): number {
    let score = 0;

    for (const violation of violations) {
      score += SEVERITY_WEIGHTS[violation.severity];
    }

    for (const flag of flags) {
      score += SEVERITY_WEIGHTS[flag.severity];
    }

    return Math.min(100, score);
  }

  /**
   * Generate recommendations based on violations
   */
  private generateRecommendations(
    violations: PolicyViolation[],
    flags: Array<{ type: FlagType }>
  ): string[] {
    const recommendations: string[] = [];

    if (violations.length === 0 && flags.length === 0) {
      recommendations.push('Content appears to comply with all policies');
      return recommendations;
    }

    const flagTypes = new Set(flags.map(f => f.type));
    const violationTypes = new Set(violations.map(v => v.policyType));

    if (flagTypes.has('SPAM')) {
      recommendations.push('Remove promotional language and excessive links');
    }
    if (flagTypes.has('PERSONAL_INFO')) {
      recommendations.push('Remove or redact personal identifiable information');
    }
    if (flagTypes.has('HATE_SPEECH') || flagTypes.has('HARASSMENT')) {
      recommendations.push('Review and remove offensive or harmful language');
    }
    if (violationTypes.has('COPYRIGHT')) {
      recommendations.push('Ensure all content is original or properly licensed');
    }

    return recommendations;
  }

  // ============================================
  // Content Flagging
  // ============================================

  /**
   * Flag content for review
   * Requirement 97: Build flagging and review workflow
   */
  async flagContent(userId: string, input: FlagContentInput): Promise<ContentFlag> {
    const flag = await this.createFlag({
      contentId: input.contentId,
      flagType: input.flagType,
      severity: input.severity,
      reason: input.reason,
      evidence: input.evidence ?? null,
      reportedBy: userId,
      status: 'FLAGGED',
    });

    // Log audit entry
    await this.createAuditLog({
      action: 'CONTENT_FLAGGED',
      actorId: userId,
      contentId: input.contentId,
      flagId: flag.id,
      details: { flagType: input.flagType, severity: input.severity },
    });

    logger.info('Content flagged', { contentId: input.contentId, flagType: input.flagType, userId });

    return flag;
  }

  /**
   * Create a content flag
   */
  private async createFlag(data: {
    contentId: string;
    flagType: FlagType;
    severity: FlagSeverity;
    reason: string;
    evidence: string | null;
    reportedBy: string | null;
    status: ModerationStatus;
  }): Promise<ContentFlag> {
    const flag = await prisma.contentFlag.create({
      data: {
        contentId: data.contentId,
        flagType: data.flagType,
        severity: data.severity,
        reason: data.reason,
        evidence: data.evidence,
        reportedBy: data.reportedBy,
        status: data.status,
      },
    });

    return this.toContentFlag(flag);
  }

  /**
   * Get flags for content
   */
  async getContentFlags(contentId: string): Promise<ContentFlag[]> {
    const flags = await prisma.contentFlag.findMany({
      where: { contentId },
      orderBy: { createdAt: 'desc' },
    });

    return flags.map(f => this.toContentFlag(f));
  }


  // ============================================
  // Review Workflow
  // ============================================

  /**
   * Review flagged content
   * Requirement 97: Build flagging and review workflow
   */
  async reviewContent(reviewerId: string, input: ReviewContentInput): Promise<ContentFlag> {
    const flag = await prisma.contentFlag.findUnique({
      where: { id: input.flagId },
    });

    if (!flag) {
      throw new ContentModerationError('Flag not found', 'FLAG_NOT_FOUND');
    }

    let newStatus: ModerationStatus;
    switch (input.decision) {
      case 'APPROVE':
        newStatus = 'APPROVED';
        break;
      case 'REJECT':
        newStatus = 'REJECTED';
        break;
      case 'ESCALATE':
        newStatus = 'UNDER_REVIEW';
        break;
    }

    const updatedFlag = await prisma.contentFlag.update({
      where: { id: input.flagId },
      data: {
        status: newStatus,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewNotes: input.notes ?? null,
      },
    });

    // Apply action if specified
    if (input.actionTaken) {
      await this.applyPolicyAction(flag.contentId, input.actionTaken, reviewerId);
    }

    // Log audit entry
    await this.createAuditLog({
      action: 'REVIEW_COMPLETED',
      actorId: reviewerId,
      contentId: flag.contentId,
      flagId: input.flagId,
      details: { decision: input.decision, actionTaken: input.actionTaken },
    });

    logger.info('Content reviewed', { flagId: input.flagId, decision: input.decision, reviewerId });

    return this.toContentFlag(updatedFlag);
  }

  /**
   * Get moderation queue
   */
  async getModerationQueue(options?: {
    status?: ModerationStatus;
    severity?: FlagSeverity;
    assignedTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<ModerationQueueItem[]> {
    const where: Prisma.ContentFlagWhereInput = {};

    if (options?.status) {
      where.status = options.status;
    } else {
      where.status = { in: ['FLAGGED', 'UNDER_REVIEW'] };
    }

    if (options?.severity) {
      where.severity = options.severity;
    }

    if (options?.assignedTo) {
      where.assignedTo = options.assignedTo;
    }

    const flags = await prisma.contentFlag.findMany({
      where,
      orderBy: [
        { severity: 'desc' },
        { createdAt: 'asc' },
      ],
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    });

    return flags.map(f => ({
      id: f.id,
      contentId: f.contentId,
      contentPreview: f.reason.substring(0, 200),
      flagType: f.flagType as FlagType,
      severity: f.severity as FlagSeverity,
      reportedBy: f.reportedBy,
      reportedAt: f.createdAt,
      assignedTo: f.assignedTo,
      priority: this.calculatePriority(f.severity as FlagSeverity, f.createdAt),
      status: f.status as ModerationStatus,
    }));
  }

  /**
   * Assign flag to reviewer
   */
  async assignToReviewer(flagId: string, reviewerId: string): Promise<ContentFlag> {
    const flag = await prisma.contentFlag.update({
      where: { id: flagId },
      data: {
        assignedTo: reviewerId,
        status: 'UNDER_REVIEW',
      },
    });

    await this.createAuditLog({
      action: 'REVIEW_STARTED',
      actorId: reviewerId,
      flagId,
      details: { assignedTo: reviewerId },
    });

    return this.toContentFlag(flag);
  }

  /**
   * Calculate priority score for queue ordering
   */
  private calculatePriority(severity: FlagSeverity, createdAt: Date): number {
    const severityScore = SEVERITY_WEIGHTS[severity];
    const ageHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
    const ageBonus = Math.min(50, ageHours * 2); // Older items get higher priority
    return severityScore + ageBonus;
  }

  // ============================================
  // Policy Enforcement
  // ============================================

  /**
   * Create a moderation policy
   * Requirement 97: Implement policy enforcement
   */
  async createPolicy(userId: string, input: CreatePolicyInput): Promise<ModerationPolicy> {
    const policy = await prisma.moderationPolicy.create({
      data: {
        name: input.name,
        type: input.type,
        description: input.description,
        rules: input.rules as unknown as Prisma.InputJsonValue,
        isActive: input.isActive,
        createdBy: userId,
      },
    });

    logger.info('Moderation policy created', { policyId: policy.id, name: input.name });

    return this.toModerationPolicy(policy);
  }

  /**
   * Get active policies
   */
  async getActivePolicies(): Promise<ModerationPolicy[]> {
    const policies = await prisma.moderationPolicy.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    return policies.map(p => this.toModerationPolicy(p));
  }

  /**
   * Update policy
   */
  async updatePolicy(
    policyId: string,
    updates: Partial<CreatePolicyInput>
  ): Promise<ModerationPolicy> {
    const policy = await prisma.moderationPolicy.update({
      where: { id: policyId },
      data: {
        name: updates.name,
        type: updates.type,
        description: updates.description,
        rules: updates.rules ? (updates.rules as unknown as Prisma.InputJsonValue) : undefined,
        isActive: updates.isActive,
      },
    });

    return this.toModerationPolicy(policy);
  }

  /**
   * Apply policy action
   */
  private async applyPolicyAction(
    contentId: string,
    action: PolicyAction,
    actorId: string
  ): Promise<void> {
    // Get content owner
    const scanResult = await prisma.contentScanResult.findFirst({
      where: { contentId },
    });

    if (!scanResult) return;

    const targetUserId = scanResult.userId;

    switch (action) {
      case 'WARN':
        await this.warnUser(targetUserId, contentId, actorId);
        break;
      case 'QUARANTINE':
        await this.quarantineContent(contentId, actorId);
        break;
      case 'SUSPEND_USER':
        await this.suspendUser(targetUserId, actorId);
        break;
      case 'BAN_USER':
        await this.banUser(targetUserId, actorId);
        break;
      case 'NOTIFY_USER':
        await this.notifyUser(targetUserId, contentId);
        break;
    }

    await this.createAuditLog({
      action: 'POLICY_ENFORCED',
      actorId,
      targetUserId,
      contentId,
      details: { action },
    });
  }

  /**
   * Warn user about content violation
   */
  private async warnUser(userId: string, contentId: string, actorId: string): Promise<void> {
    await prisma.userWarning.create({
      data: {
        userId,
        contentId,
        issuedBy: actorId,
        reason: 'Content policy violation',
      },
    });

    await this.createAuditLog({
      action: 'USER_WARNED',
      actorId,
      targetUserId: userId,
      contentId,
      details: { reason: 'Content policy violation' },
    });

    logger.info('User warned', { userId, contentId });
  }

  /**
   * Quarantine content
   */
  private async quarantineContent(contentId: string, actorId: string): Promise<void> {
    await prisma.contentScanResult.updateMany({
      where: { contentId },
      data: { status: 'REJECTED' },
    });

    logger.info('Content quarantined', { contentId, actorId });
  }

  /**
   * Suspend user
   */
  private async suspendUser(userId: string, actorId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { status: 'SUSPENDED' },
    });

    await this.createAuditLog({
      action: 'USER_SUSPENDED',
      actorId,
      targetUserId: userId,
      details: { reason: 'Multiple content policy violations' },
    });

    logger.info('User suspended', { userId, actorId });
  }

  /**
   * Ban user
   */
  private async banUser(userId: string, actorId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { status: 'BANNED' },
    });

    logger.info('User banned', { userId, actorId });
  }

  /**
   * Notify user about content issue
   */
  private async notifyUser(userId: string, contentId: string): Promise<void> {
    // In a real implementation, this would send an email or in-app notification
    logger.info('User notified about content issue', { userId, contentId });
  }


  // ============================================
  // Appeal Handling
  // ============================================

  /**
   * Submit an appeal for flagged content
   * Requirement 97: Add appeal handling
   */
  async submitAppeal(userId: string, input: SubmitAppealInput): Promise<Appeal> {
    // Check if flag exists
    const flag = await prisma.contentFlag.findUnique({
      where: { id: input.flagId },
    });

    if (!flag) {
      throw new ContentModerationError('Flag not found', 'FLAG_NOT_FOUND');
    }

    // Check if flag is appealable
    if (!['FLAGGED', 'REJECTED'].includes(flag.status)) {
      throw new ContentModerationError('This flag cannot be appealed', 'NOT_APPEALABLE');
    }

    // Check appeal limit
    const existingAppeals = await prisma.appeal.count({
      where: { userId, flagId: input.flagId },
    });

    if (existingAppeals >= this.config.maxAppealsPerUser) {
      throw new ContentModerationError('Maximum appeals reached', 'MAX_APPEALS_REACHED');
    }

    // Check appeal window
    const flagAge = Date.now() - flag.createdAt.getTime();
    const appealWindowMs = this.config.appealWindowDays * 24 * 60 * 60 * 1000;

    if (flagAge > appealWindowMs) {
      throw new ContentModerationError('Appeal window has expired', 'APPEAL_WINDOW_EXPIRED');
    }

    const appeal = await prisma.appeal.create({
      data: {
        flagId: input.flagId,
        userId,
        reason: input.reason,
        additionalEvidence: input.additionalEvidence ?? null,
        status: 'PENDING',
      },
    });

    // Update flag status
    await prisma.contentFlag.update({
      where: { id: input.flagId },
      data: { status: 'APPEALED' },
    });

    await this.createAuditLog({
      action: 'APPEAL_SUBMITTED',
      actorId: userId,
      flagId: input.flagId,
      appealId: appeal.id,
      details: { reason: input.reason },
    });

    logger.info('Appeal submitted', { appealId: appeal.id, flagId: input.flagId, userId });

    return this.toAppeal(appeal);
  }

  /**
   * Review an appeal
   */
  async reviewAppeal(reviewerId: string, input: ReviewAppealInput): Promise<Appeal> {
    const appeal = await prisma.appeal.findUnique({
      where: { id: input.appealId },
    });

    if (!appeal) {
      throw new ContentModerationError('Appeal not found', 'APPEAL_NOT_FOUND');
    }

    const newStatus: AppealStatus = input.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    const updatedAppeal = await prisma.appeal.update({
      where: { id: input.appealId },
      data: {
        status: newStatus,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewNotes: input.notes ?? null,
      },
    });

    // Update flag status based on appeal decision
    const newFlagStatus: ModerationStatus = input.decision === 'APPROVE' 
      ? 'APPEAL_APPROVED' 
      : 'APPEAL_REJECTED';

    await prisma.contentFlag.update({
      where: { id: appeal.flagId },
      data: { status: newFlagStatus },
    });

    await this.createAuditLog({
      action: 'APPEAL_REVIEWED',
      actorId: reviewerId,
      flagId: appeal.flagId,
      appealId: input.appealId,
      details: { decision: input.decision },
    });

    logger.info('Appeal reviewed', { appealId: input.appealId, decision: input.decision });

    return this.toAppeal(updatedAppeal);
  }

  /**
   * Get pending appeals
   */
  async getPendingAppeals(limit?: number): Promise<Appeal[]> {
    const appeals = await prisma.appeal.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take: limit ?? 50,
    });

    return appeals.map(a => this.toAppeal(a));
  }

  // ============================================
  // Abuse Detection
  // ============================================

  /**
   * Detect coordinated abuse patterns
   * Requirement 97: Create coordinated abuse detection
   */
  async detectAbuse(userId: string): Promise<AbuseDetectionResult> {
    if (!this.config.enableAbuseDetection) {
      return {
        userId,
        detected: false,
        patterns: [],
        riskScore: 0,
        recommendedAction: null,
        detectedAt: new Date(),
      };
    }

    const patterns: DetectedPattern[] = [];
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Check rate abuse
    const rateAbusePattern = await this.checkRateAbuse(userId, oneHourAgo, now);
    if (rateAbusePattern) patterns.push(rateAbusePattern);

    // Check content flooding
    const floodingPattern = await this.checkContentFlooding(userId, oneHourAgo, now);
    if (floodingPattern) patterns.push(floodingPattern);

    // Check bot activity
    const botPattern = await this.checkBotActivity(userId, oneDayAgo, now);
    if (botPattern) patterns.push(botPattern);

    // Check evasion attempts
    const evasionPattern = await this.checkEvasionAttempts(userId, oneDayAgo, now);
    if (evasionPattern) patterns.push(evasionPattern);

    const detected = patterns.length > 0;
    const riskScore = this.calculateAbuseRiskScore(patterns);
    const recommendedAction = this.getRecommendedAction(riskScore);

    if (detected) {
      await this.createAuditLog({
        action: 'ABUSE_DETECTED',
        targetUserId: userId,
        details: { patterns: patterns.map(p => p.type), riskScore },
      });

      logger.warn('Abuse detected', { userId, patterns: patterns.map(p => p.type), riskScore });
    }

    return {
      userId,
      detected,
      patterns,
      riskScore,
      recommendedAction,
      detectedAt: now,
    };
  }

  /**
   * Check for rate abuse
   */
  private async checkRateAbuse(
    userId: string,
    start: Date,
    end: Date
  ): Promise<DetectedPattern | null> {
    const scanCount = await prisma.contentScanResult.count({
      where: {
        userId,
        createdAt: { gte: start, lte: end },
      },
    });

    const threshold = 100; // Max 100 scans per hour
    if (scanCount > threshold) {
      return {
        type: 'RATE_ABUSE',
        confidence: Math.min(100, (scanCount / threshold) * 50),
        indicators: [`${scanCount} content scans in 1 hour (threshold: ${threshold})`],
        timeWindow: { start, end },
        eventCount: scanCount,
      };
    }

    return null;
  }

  /**
   * Check for content flooding
   */
  private async checkContentFlooding(
    userId: string,
    start: Date,
    end: Date
  ): Promise<DetectedPattern | null> {
    const flagCount = await prisma.contentFlag.count({
      where: {
        reportedBy: userId,
        createdAt: { gte: start, lte: end },
      },
    });

    const threshold = 50; // Max 50 flags per hour
    if (flagCount > threshold) {
      return {
        type: 'CONTENT_FLOODING',
        confidence: Math.min(100, (flagCount / threshold) * 50),
        indicators: [`${flagCount} content flags in 1 hour (threshold: ${threshold})`],
        timeWindow: { start, end },
        eventCount: flagCount,
      };
    }

    return null;
  }

  /**
   * Check for bot activity
   */
  private async checkBotActivity(
    userId: string,
    start: Date,
    end: Date
  ): Promise<DetectedPattern | null> {
    const activities = await prisma.contentScanResult.findMany({
      where: {
        userId,
        createdAt: { gte: start, lte: end },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    if (activities.length < 10) return null;

    // Check for suspiciously regular intervals
    const intervals: number[] = [];
    for (let i = 1; i < activities.length; i++) {
      intervals.push(
        activities[i].createdAt.getTime() - activities[i - 1].createdAt.getTime()
      );
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);

    // Very low variance suggests automated behavior
    if (stdDev < 1000 && avgInterval < 5000) { // Less than 1 second variance, less than 5 second intervals
      return {
        type: 'BOT_ACTIVITY',
        confidence: Math.min(100, 100 - (stdDev / 10)),
        indicators: [
          `Suspiciously regular activity intervals (stdDev: ${stdDev.toFixed(0)}ms)`,
          `Average interval: ${avgInterval.toFixed(0)}ms`,
        ],
        timeWindow: { start, end },
        eventCount: activities.length,
      };
    }

    return null;
  }

  /**
   * Check for evasion attempts
   */
  private async checkEvasionAttempts(
    userId: string,
    start: Date,
    end: Date
  ): Promise<DetectedPattern | null> {
    // Check for repeated similar content after rejections
    const rejectedScans = await prisma.contentScanResult.findMany({
      where: {
        userId,
        status: 'REJECTED',
        createdAt: { gte: start, lte: end },
      },
    });

    if (rejectedScans.length >= 5) {
      return {
        type: 'EVASION_ATTEMPT',
        confidence: Math.min(100, rejectedScans.length * 15),
        indicators: [`${rejectedScans.length} rejected content submissions in 24 hours`],
        timeWindow: { start, end },
        eventCount: rejectedScans.length,
      };
    }

    return null;
  }

  /**
   * Calculate abuse risk score
   */
  private calculateAbuseRiskScore(patterns: DetectedPattern[]): number {
    if (patterns.length === 0) return 0;

    const totalConfidence = patterns.reduce((sum, p) => sum + p.confidence, 0);
    const avgConfidence = totalConfidence / patterns.length;
    const patternBonus = patterns.length * 10;

    return Math.min(100, avgConfidence + patternBonus);
  }

  /**
   * Get recommended action based on risk score
   */
  private getRecommendedAction(riskScore: number): PolicyAction | null {
    if (riskScore >= 90) return 'BAN_USER';
    if (riskScore >= 70) return 'SUSPEND_USER';
    if (riskScore >= 50) return 'WARN';
    if (riskScore >= 30) return 'FLAG_FOR_REVIEW';
    return null;
  }

  /**
   * Report abuse
   */
  async reportAbuse(reporterId: string | null, input: ReportAbuseInput): Promise<AbuseReport> {
    const report = await prisma.abuseReport.create({
      data: {
        reporterId,
        targetUserId: input.targetUserId,
        patternType: input.patternType,
        description: input.description,
        evidence: input.evidence ?? [],
        status: 'PENDING',
      },
    });

    logger.info('Abuse reported', { reportId: report.id, targetUserId: input.targetUserId });

    return this.toAbuseReport(report);
  }


  // ============================================
  // Statistics & History
  // ============================================

  /**
   * Get moderation statistics
   */
  async getModerationStats(startDate: Date, endDate: Date): Promise<ModerationStats> {
    const [
      totalScanned,
      totalFlagged,
      totalApproved,
      totalRejected,
      pendingReview,
      pendingAppeals,
      flagsByType,
      flagsBySeverity,
      reviewTimes,
    ] = await Promise.all([
      prisma.contentScanResult.count({
        where: { createdAt: { gte: startDate, lte: endDate } },
      }),
      prisma.contentFlag.count({
        where: { createdAt: { gte: startDate, lte: endDate } },
      }),
      prisma.contentFlag.count({
        where: { status: 'APPROVED', createdAt: { gte: startDate, lte: endDate } },
      }),
      prisma.contentFlag.count({
        where: { status: 'REJECTED', createdAt: { gte: startDate, lte: endDate } },
      }),
      prisma.contentFlag.count({
        where: { status: { in: ['FLAGGED', 'UNDER_REVIEW'] } },
      }),
      prisma.appeal.count({
        where: { status: 'PENDING' },
      }),
      prisma.contentFlag.groupBy({
        by: ['flagType'],
        _count: true,
        where: { createdAt: { gte: startDate, lte: endDate } },
      }),
      prisma.contentFlag.groupBy({
        by: ['severity'],
        _count: true,
        where: { createdAt: { gte: startDate, lte: endDate } },
      }),
      prisma.contentFlag.findMany({
        where: {
          reviewedAt: { not: null },
          createdAt: { gte: startDate, lte: endDate },
        },
        select: { createdAt: true, reviewedAt: true },
      }),
    ]);

    // Calculate average review time
    let averageReviewTimeMs = 0;
    if (reviewTimes.length > 0) {
      const totalReviewTime = reviewTimes.reduce((sum, r) => {
        return sum + (r.reviewedAt!.getTime() - r.createdAt.getTime());
      }, 0);
      averageReviewTimeMs = totalReviewTime / reviewTimes.length;
    }

    // Convert grouped results to records
    const flagsByTypeRecord: Record<FlagType, number> = {
      SPAM: 0, HATE_SPEECH: 0, HARASSMENT: 0, VIOLENCE: 0, ADULT_CONTENT: 0,
      MISINFORMATION: 0, COPYRIGHT: 0, PERSONAL_INFO: 0, MALWARE: 0, PHISHING: 0, OTHER: 0,
    };
    for (const item of flagsByType) {
      flagsByTypeRecord[item.flagType as FlagType] = item._count;
    }

    const flagsBySeverityRecord: Record<FlagSeverity, number> = {
      LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0,
    };
    for (const item of flagsBySeverity) {
      flagsBySeverityRecord[item.severity as FlagSeverity] = item._count;
    }

    return {
      totalScanned,
      totalFlagged,
      totalApproved,
      totalRejected,
      pendingReview,
      pendingAppeals,
      averageReviewTimeMs,
      flagsByType: flagsByTypeRecord,
      flagsBySeverity: flagsBySeverityRecord,
      periodStart: startDate,
      periodEnd: endDate,
    };
  }

  /**
   * Get user moderation history
   */
  async getUserModerationHistory(userId: string): Promise<UserModerationHistory> {
    // Get content IDs for this user's scan results
    const userScanResults = await prisma.contentScanResult.findMany({
      where: { userId },
      select: { contentId: true },
    });
    const userContentIds = userScanResults.map(r => r.contentId);

    const [flags, appeals, warnings, user] = await Promise.all([
      prisma.contentFlag.findMany({
        where: {
          OR: [
            { reportedBy: userId },
            { contentId: { in: userContentIds } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.appeal.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.userWarning.count({
        where: { userId },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { status: true },
      }),
    ]);

    const totalViolations = flags.filter(f => 
      ['REJECTED', 'APPEAL_REJECTED'].includes(f.status)
    ).length;

    const suspensionCount = await prisma.moderationAuditLog.count({
      where: { targetUserId: userId, action: 'USER_SUSPENDED' },
    });

    const lastViolation = flags.find(f => 
      ['REJECTED', 'APPEAL_REJECTED'].includes(f.status)
    );

    let currentStatus: UserModerationHistory['currentStatus'] = 'GOOD_STANDING';
    if (user?.status === 'BANNED') currentStatus = 'BANNED';
    else if (user?.status === 'SUSPENDED') currentStatus = 'SUSPENDED';
    else if (warnings > 0) currentStatus = 'WARNING';

    return {
      userId,
      totalFlags: flags.length,
      totalViolations,
      totalWarnings: warnings,
      suspensionCount,
      currentStatus,
      lastViolationAt: lastViolation?.createdAt ?? null,
      flags: flags.map(f => this.toContentFlag(f)),
      appeals: appeals.map(a => this.toAppeal(a)),
    };
  }

  // ============================================
  // Audit Logging
  // ============================================

  /**
   * Create audit log entry
   */
  private async createAuditLog(options: {
    action: ModerationAuditAction;
    actorId?: string;
    targetUserId?: string;
    contentId?: string;
    flagId?: string;
    appealId?: string;
    policyId?: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
  }): Promise<ModerationAuditLogEntry> {
    const entry = await prisma.moderationAuditLog.create({
      data: {
        action: options.action,
        actorId: options.actorId ?? null,
        targetUserId: options.targetUserId ?? null,
        contentId: options.contentId ?? null,
        flagId: options.flagId ?? null,
        appealId: options.appealId ?? null,
        policyId: options.policyId ?? null,
        details: (options.details as Prisma.InputJsonValue) ?? {},
        ipAddress: options.ipAddress ?? null,
      },
    });

    return {
      id: entry.id,
      action: entry.action as ModerationAuditAction,
      actorId: entry.actorId,
      targetUserId: entry.targetUserId,
      contentId: entry.contentId,
      flagId: entry.flagId,
      appealId: entry.appealId,
      policyId: entry.policyId,
      details: entry.details as Record<string, unknown>,
      ipAddress: entry.ipAddress,
      createdAt: entry.createdAt,
    };
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(options?: {
    action?: ModerationAuditAction;
    actorId?: string;
    targetUserId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<ModerationAuditLogEntry[]> {
    const where: Prisma.ModerationAuditLogWhereInput = {};

    if (options?.action) where.action = options.action;
    if (options?.actorId) where.actorId = options.actorId;
    if (options?.targetUserId) where.targetUserId = options.targetUserId;
    if (options?.startDate || options?.endDate) {
      where.createdAt = {};
      if (options.startDate) where.createdAt.gte = options.startDate;
      if (options.endDate) where.createdAt.lte = options.endDate;
    }

    const logs = await prisma.moderationAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 100,
    });

    return logs.map(l => ({
      id: l.id,
      action: l.action as ModerationAuditAction,
      actorId: l.actorId,
      targetUserId: l.targetUserId,
      contentId: l.contentId,
      flagId: l.flagId,
      appealId: l.appealId,
      policyId: l.policyId,
      details: l.details as Record<string, unknown>,
      ipAddress: l.ipAddress,
      createdAt: l.createdAt,
    }));
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Generate content ID
   */
  private generateContentId(): string {
    return `content_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Convert database flag to ContentFlag type
   */
  private toContentFlag(flag: {
    id: string;
    contentId: string;
    flagType: string;
    severity: string;
    reason: string;
    evidence: string | null;
    reportedBy: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    reviewedBy: string | null;
    reviewedAt: Date | null;
    reviewNotes: string | null;
  }): ContentFlag {
    return {
      id: flag.id,
      contentId: flag.contentId,
      flagType: flag.flagType as FlagType,
      severity: flag.severity as FlagSeverity,
      reason: flag.reason,
      evidence: flag.evidence,
      reportedBy: flag.reportedBy,
      status: flag.status as ModerationStatus,
      createdAt: flag.createdAt,
      updatedAt: flag.updatedAt,
      reviewedBy: flag.reviewedBy,
      reviewedAt: flag.reviewedAt,
      reviewNotes: flag.reviewNotes,
    };
  }

  /**
   * Convert database policy to ModerationPolicy type
   */
  private toModerationPolicy(policy: {
    id: string;
    name: string;
    type: string;
    description: string;
    rules: Prisma.JsonValue;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
  }): ModerationPolicy {
    return {
      id: policy.id,
      name: policy.name,
      type: policy.type as PolicyType,
      description: policy.description,
      rules: (Array.isArray(policy.rules) ? policy.rules : []) as unknown as PolicyRule[],
      isActive: policy.isActive,
      createdAt: policy.createdAt,
      updatedAt: policy.updatedAt,
      createdBy: policy.createdBy,
    };
  }

  /**
   * Convert database appeal to Appeal type
   */
  private toAppeal(appeal: {
    id: string;
    flagId: string;
    userId: string;
    reason: string;
    additionalEvidence: string | null;
    status: string;
    createdAt: Date;
    reviewedBy: string | null;
    reviewedAt: Date | null;
    reviewNotes: string | null;
  }): Appeal {
    return {
      id: appeal.id,
      flagId: appeal.flagId,
      userId: appeal.userId,
      reason: appeal.reason,
      additionalEvidence: appeal.additionalEvidence,
      status: appeal.status as AppealStatus,
      createdAt: appeal.createdAt,
      reviewedBy: appeal.reviewedBy,
      reviewedAt: appeal.reviewedAt,
      reviewNotes: appeal.reviewNotes,
    };
  }

  /**
   * Convert database abuse report to AbuseReport type
   */
  private toAbuseReport(report: {
    id: string;
    reporterId: string | null;
    targetUserId: string;
    patternType: string;
    description: string;
    evidence: string[];
    status: string;
    createdAt: Date;
    investigatedBy: string | null;
    investigatedAt: Date | null;
    actionTaken: string | null;
  }): AbuseReport {
    return {
      id: report.id,
      reporterId: report.reporterId,
      targetUserId: report.targetUserId,
      patternType: report.patternType as AbusePatternType,
      description: report.description,
      evidence: report.evidence,
      status: report.status as AbuseReport['status'],
      createdAt: report.createdAt,
      investigatedBy: report.investigatedBy,
      investigatedAt: report.investigatedAt,
      actionTaken: report.actionTaken as PolicyAction | null,
    };
  }
}

// Export singleton instance
export const contentModerationService = new ContentModerationService();
