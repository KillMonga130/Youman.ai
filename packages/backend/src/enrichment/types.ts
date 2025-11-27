/**
 * Content Enrichment Service Types
 * Type definitions for content enrichment including opportunity identification,
 * citation addition, statistics insertion, and content marking for review
 * Requirements: 105
 */

/**
 * Types of enrichment opportunities
 */
export type EnrichmentOpportunityType =
  | 'example'
  | 'statistic'
  | 'citation'
  | 'definition'
  | 'case-study'
  | 'data-point'
  | 'quote'
  | 'comparison';

/**
 * Priority level for enrichment opportunities
 */
export type EnrichmentPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Status of enrichment items
 */
export type EnrichmentStatus = 'pending' | 'approved' | 'rejected' | 'applied';

/**
 * Citation format types
 */
export type CitationFormat = 'APA' | 'MLA' | 'Chicago' | 'Harvard' | 'IEEE' | 'Vancouver';

/**
 * Enrichment opportunity identified in text
 */
export interface EnrichmentOpportunity {
  /** Unique identifier */
  id: string;
  /** Type of enrichment opportunity */
  type: EnrichmentOpportunityType;
  /** Position in text (character index) */
  position: number;
  /** End position in text */
  endPosition: number;
  /** Text segment where opportunity was identified */
  segment: string;
  /** Context around the segment */
  context: string;
  /** Reason why this is an opportunity */
  reason: string;
  /** Priority level */
  priority: EnrichmentPriority;
  /** Confidence score (0-1) */
  confidence: number;
  /** Suggested enrichment content */
  suggestion: string;
  /** Keywords related to this opportunity */
  keywords: string[];
}

/**
 * Citation to be added to content
 */
export interface Citation {
  /** Unique identifier */
  id: string;
  /** Citation text in specified format */
  formattedCitation: string;
  /** Citation format used */
  format: CitationFormat;
  /** Source title */
  title: string;
  /** Author(s) */
  authors: string[];
  /** Publication year */
  year: number;
  /** Source URL (if available) */
  url?: string | undefined;
  /** DOI (if available) */
  doi?: string | undefined;
  /** Publisher */
  publisher?: string | undefined;
  /** Journal/Publication name */
  publication?: string | undefined;
  /** Page numbers */
  pages?: string | undefined;
  /** Volume number */
  volume?: string | undefined;
  /** Issue number */
  issue?: string | undefined;
  /** Access date for web sources */
  accessDate?: Date | undefined;
  /** Relevance score (0-1) */
  relevance: number;
  /** Whether citation is verified */
  verified: boolean;
}

/**
 * Statistic to be inserted
 */
export interface Statistic {
  /** Unique identifier */
  id: string;
  /** The statistic value */
  value: string;
  /** Description of what the statistic represents */
  description: string;
  /** Source of the statistic */
  source: string;
  /** Year the statistic was published */
  year: number;
  /** Whether the statistic has been verified */
  verified: boolean;
  /** Verification source/method */
  verificationSource?: string;
  /** Confidence in accuracy (0-1) */
  confidence: number;
  /** Category of statistic */
  category: string;
  /** Related keywords */
  keywords: string[];
  /** Formatted citation for the statistic */
  citation?: Citation;
}

/**
 * Content marked for user review
 */
export interface MarkedContent {
  /** Unique identifier */
  id: string;
  /** Position in text (character index) */
  position: number;
  /** End position in text */
  endPosition: number;
  /** Original text segment */
  originalText: string;
  /** Suggested enriched text */
  enrichedText: string;
  /** Type of enrichment applied */
  enrichmentType: EnrichmentOpportunityType;
  /** Status of the marked content */
  status: EnrichmentStatus;
  /** Reason for the enrichment */
  reason: string;
  /** User notes (if any) */
  notes?: string | undefined;
  /** Timestamp when marked */
  markedAt: Date;
  /** Timestamp when reviewed (if reviewed) */
  reviewedAt?: Date | undefined;
}

/**
 * Result of opportunity identification
 */
export interface OpportunityIdentificationResult {
  /** Unique result identifier */
  id: string;
  /** Original text analyzed */
  originalText: string;
  /** Word count of original text */
  wordCount: number;
  /** Identified opportunities */
  opportunities: EnrichmentOpportunity[];
  /** Total opportunities found */
  totalOpportunities: number;
  /** Opportunities by type */
  opportunitiesByType: Record<EnrichmentOpportunityType, number>;
  /** Opportunities by priority */
  opportunitiesByPriority: Record<EnrichmentPriority, number>;
  /** Overall enrichment potential score (0-100) */
  enrichmentPotential: number;
  /** Recommendations for enrichment */
  recommendations: string[];
  /** Analysis timestamp */
  timestamp: Date;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Citation addition request
 */
export interface CitationAdditionRequest {
  /** Text to add citations to */
  text: string;
  /** Preferred citation format */
  format: CitationFormat;
  /** Topic/subject for citation search */
  topic?: string | undefined;
  /** Maximum number of citations to add */
  maxCitations?: number | undefined;
  /** Minimum relevance score (0-1) */
  minRelevance?: number | undefined;
  /** Whether to verify citations */
  verifyCitations?: boolean | undefined;
}

/**
 * Result of citation addition
 */
export interface CitationAdditionResult {
  /** Unique result identifier */
  id: string;
  /** Original text */
  originalText: string;
  /** Text with citations added */
  enrichedText: string;
  /** Citations added */
  citations: Citation[];
  /** Positions where citations were added */
  citationPositions: CitationPosition[];
  /** Total citations added */
  totalCitationsAdded: number;
  /** Bibliography/References section */
  bibliography: string;
  /** Analysis timestamp */
  timestamp: Date;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Position of a citation in text
 */
export interface CitationPosition {
  /** Citation ID */
  citationId: string;
  /** Position in enriched text */
  position: number;
  /** In-text citation format */
  inTextCitation: string;
  /** Sentence where citation was added */
  sentence: string;
}

/**
 * Statistics insertion request
 */
export interface StatisticsInsertionRequest {
  /** Text to add statistics to */
  text: string;
  /** Topic for statistics search */
  topic?: string | undefined;
  /** Maximum number of statistics to add */
  maxStatistics?: number | undefined;
  /** Whether to verify statistics */
  verifyStatistics?: boolean | undefined;
  /** Minimum confidence score (0-1) */
  minConfidence?: number | undefined;
  /** Categories of statistics to include */
  categories?: string[] | undefined;
}

/**
 * Result of statistics insertion
 */
export interface StatisticsInsertionResult {
  /** Unique result identifier */
  id: string;
  /** Original text */
  originalText: string;
  /** Text with statistics inserted */
  enrichedText: string;
  /** Statistics inserted */
  statistics: Statistic[];
  /** Positions where statistics were inserted */
  statisticPositions: StatisticPosition[];
  /** Total statistics inserted */
  totalStatisticsInserted: number;
  /** Verification summary */
  verificationSummary: VerificationSummary;
  /** Analysis timestamp */
  timestamp: Date;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Position of a statistic in text
 */
export interface StatisticPosition {
  /** Statistic ID */
  statisticId: string;
  /** Position in enriched text */
  position: number;
  /** Formatted statistic text */
  formattedStatistic: string;
  /** Context where statistic was inserted */
  context: string;
}

/**
 * Verification summary for statistics
 */
export interface VerificationSummary {
  /** Total statistics checked */
  totalChecked: number;
  /** Statistics verified successfully */
  verified: number;
  /** Statistics that could not be verified */
  unverified: number;
  /** Statistics with verification issues */
  issues: VerificationIssue[];
}

/**
 * Verification issue for a statistic
 */
export interface VerificationIssue {
  /** Statistic ID */
  statisticId: string;
  /** Issue description */
  issue: string;
  /** Severity of the issue */
  severity: 'warning' | 'error';
  /** Suggestion for resolution */
  suggestion: string;
}

/**
 * Content marking request
 */
export interface ContentMarkingRequest {
  /** Text to mark for review */
  text: string;
  /** Enrichment opportunities to apply */
  opportunities: EnrichmentOpportunity[];
  /** Whether to auto-apply low-risk enrichments */
  autoApplyLowRisk?: boolean;
}

/**
 * Result of content marking
 */
export interface ContentMarkingResult {
  /** Unique result identifier */
  id: string;
  /** Original text */
  originalText: string;
  /** Text with enrichments applied (pending review) */
  markedText: string;
  /** Marked content items for review */
  markedItems: MarkedContent[];
  /** Total items marked */
  totalMarked: number;
  /** Items auto-applied */
  autoApplied: number;
  /** Items pending review */
  pendingReview: number;
  /** Analysis timestamp */
  timestamp: Date;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Review decision for marked content
 */
export interface ReviewDecision {
  /** Marked content ID */
  markedContentId: string;
  /** Decision (approve or reject) */
  decision: 'approve' | 'reject';
  /** User notes */
  notes?: string | undefined;
  /** Modified enriched text (if user edited) */
  modifiedText?: string | undefined;
}

/**
 * Result of applying review decisions
 */
export interface ReviewApplicationResult {
  /** Unique result identifier */
  id: string;
  /** Final text after applying decisions */
  finalText: string;
  /** Decisions applied */
  decisionsApplied: number;
  /** Items approved */
  approved: number;
  /** Items rejected */
  rejected: number;
  /** Items modified */
  modified: number;
  /** Timestamp */
  timestamp: Date;
}

/**
 * Comprehensive enrichment request
 */
export interface ComprehensiveEnrichmentRequest {
  /** Text to enrich */
  text: string;
  /** Topic for enrichment */
  topic?: string;
  /** Citation format */
  citationFormat?: CitationFormat;
  /** Maximum enrichments to apply */
  maxEnrichments?: number;
  /** Types of enrichment to include */
  enrichmentTypes?: EnrichmentOpportunityType[];
  /** Whether to verify all additions */
  verify?: boolean;
  /** Whether to mark for review (vs auto-apply) */
  markForReview?: boolean;
}

/**
 * Comprehensive enrichment result
 */
export interface ComprehensiveEnrichmentResult {
  /** Unique result identifier */
  id: string;
  /** Original text */
  originalText: string;
  /** Enriched text */
  enrichedText: string;
  /** Opportunity identification result */
  opportunityResult: OpportunityIdentificationResult;
  /** Citation addition result (if applicable) */
  citationResult?: CitationAdditionResult | undefined;
  /** Statistics insertion result (if applicable) */
  statisticsResult?: StatisticsInsertionResult | undefined;
  /** Content marking result (if marking for review) */
  markingResult?: ContentMarkingResult | undefined;
  /** Overall enrichment score (0-100) */
  enrichmentScore: number;
  /** Summary of enrichments */
  summary: EnrichmentSummary;
  /** Timestamp */
  timestamp: Date;
  /** Total processing time in milliseconds */
  totalProcessingTimeMs: number;
}

/**
 * Summary of enrichments applied
 */
export interface EnrichmentSummary {
  /** Total enrichments applied */
  totalEnrichments: number;
  /** Enrichments by type */
  byType: Record<EnrichmentOpportunityType, number>;
  /** Citations added */
  citationsAdded: number;
  /** Statistics added */
  statisticsAdded: number;
  /** Examples added */
  examplesAdded: number;
  /** Word count change */
  wordCountChange: number;
  /** Percentage increase in content */
  percentageIncrease: number;
}

/**
 * Content enrichment service configuration
 */
export interface EnrichmentConfig {
  /** Default citation format */
  defaultCitationFormat: CitationFormat;
  /** Default maximum enrichments */
  defaultMaxEnrichments: number;
  /** Default minimum relevance score */
  defaultMinRelevance: number;
  /** Default minimum confidence score */
  defaultMinConfidence: number;
  /** Whether to verify by default */
  defaultVerify: boolean;
  /** Minimum text length for enrichment (words) */
  minTextLength: number;
  /** Maximum text length for enrichment (words) */
  maxTextLength: number;
  /** Timeout in milliseconds */
  timeout: number;
}
