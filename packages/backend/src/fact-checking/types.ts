/**
 * Fact-Checking Service Types
 * Type definitions for content fact-checking and verification
 * Requirements: 110
 */

/**
 * Verification status for a claim
 */
export type VerificationStatus = 'verified' | 'unverified' | 'disputed' | 'false' | 'needs_review';

/**
 * Confidence level for verification
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * Source type for fact verification
 */
export type FactSourceType = 'academic' | 'news' | 'government' | 'encyclopedia' | 'database' | 'unknown';

/**
 * A factual claim extracted from text
 * Requirement 110.1: Verify factual claims against reliable sources
 */
export interface FactualClaim {
  /** Unique claim identifier */
  id: string;
  /** The claim text */
  text: string;
  /** Start position in original text */
  startPosition: number;
  /** End position in original text */
  endPosition: number;
  /** Type of claim (statistical, historical, scientific, etc.) */
  claimType: ClaimType;
  /** Entities mentioned in the claim */
  entities: string[];
  /** Keywords extracted from the claim */
  keywords: string[];
}

/**
 * Type of factual claim
 */
export type ClaimType = 'statistical' | 'historical' | 'scientific' | 'geographical' | 'biographical' | 'general';

/**
 * Source used for fact verification
 * Requirement 110.2: Provide source links for flagged statements
 */
export interface VerificationSource {
  /** Unique source identifier */
  id: string;
  /** Source URL */
  url?: string;
  /** Source title */
  title: string;
  /** Source author (if available) */
  author?: string;
  /** Publication date */
  publishedDate?: Date;
  /** Source type */
  type: FactSourceType;
  /** Credibility score (0-100) */
  credibilityScore: number;
  /** Relevant excerpt from source */
  excerpt?: string;
}

/**
 * Result of verifying a single claim
 * Requirement 110.2: Flag questionable statements and provide source links
 */
export interface ClaimVerification {
  /** Claim being verified */
  claim: FactualClaim;
  /** Verification status */
  status: VerificationStatus;
  /** Confidence score (0-100) */
  confidenceScore: number;
  /** Confidence level */
  confidenceLevel: ConfidenceLevel;
  /** Sources used for verification */
  sources: VerificationSource[];
  /** Explanation of verification result */
  explanation: string;
  /** Suggested correction if claim is false */
  suggestedCorrection?: CorrectionSuggestion;
  /** Whether manual review is recommended */
  needsManualReview: boolean;
}

/**
 * Correction suggestion for inaccurate claims
 * Requirement 110.4: Provide accurate alternatives with citations
 */
export interface CorrectionSuggestion {
  /** Original claim text */
  originalText: string;
  /** Suggested corrected text */
  correctedText: string;
  /** Citation for the correction */
  citation: string;
  /** Source for the correction */
  source: VerificationSource;
  /** Confidence in the correction */
  confidence: number;
}

/**
 * Verification report for entire document
 * Requirement 110.5: Generate verification report with confidence scores
 */
export interface VerificationReport {
  /** Unique report identifier */
  id: string;
  /** Original text analyzed */
  originalText: string;
  /** Total claims found */
  totalClaims: number;
  /** Claims verified as accurate */
  verifiedClaims: number;
  /** Claims flagged as inaccurate */
  inaccurateClaims: number;
  /** Claims needing manual review */
  unverifiableClaims: number;
  /** Overall accuracy score (0-100) */
  accuracyScore: number;
  /** Individual claim verifications */
  claimVerifications: ClaimVerification[];
  /** Report generation timestamp */
  timestamp: Date;
  /** Processing time in milliseconds */
  processingTimeMs: number;
  /** Summary of findings */
  summary: ReportSummary;
}

/**
 * Summary of verification findings
 */
export interface ReportSummary {
  /** Brief overview */
  overview: string;
  /** Key findings */
  keyFindings: string[];
  /** Recommendations */
  recommendations: string[];
  /** Risk level */
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * Flagged statement in text
 * Requirement 110.2: Flag questionable statements
 */
export interface FlaggedStatement {
  /** Claim verification details */
  verification: ClaimVerification;
  /** Severity of the issue */
  severity: 'critical' | 'warning' | 'info';
  /** Action required */
  actionRequired: string;
}

/**
 * Annotated text with fact-check highlights
 */
export interface AnnotatedFactCheckText {
  /** Original text */
  originalText: string;
  /** HTML with highlighted claims */
  highlightedHtml: string;
  /** Markdown with highlighted claims */
  highlightedMarkdown: string;
  /** Annotations for each claim */
  annotations: FactCheckAnnotation[];
  /** Total flagged items */
  totalFlagged: number;
}

/**
 * Annotation for fact-check highlighting
 */
export interface FactCheckAnnotation {
  /** Claim ID */
  claimId: string;
  /** Start position */
  start: number;
  /** End position */
  end: number;
  /** Color based on verification status */
  color: 'green' | 'yellow' | 'red' | 'gray';
  /** Tooltip text */
  tooltip: string;
  /** Verification status */
  status: VerificationStatus;
}

/**
 * Options for fact-checking
 */
export interface FactCheckOptions {
  /** Whether to check against academic sources */
  checkAcademic?: boolean;
  /** Whether to check against news sources */
  checkNews?: boolean;
  /** Whether to check against government sources */
  checkGovernment?: boolean;
  /** Minimum confidence threshold for verification (0-100) */
  confidenceThreshold?: number;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Whether to generate correction suggestions */
  generateCorrections?: boolean;
  /** Specific claim types to check */
  claimTypes?: ClaimType[];
  /** Maximum number of claims to verify */
  maxClaims?: number;
}

/**
 * Provider configuration for fact-checking
 */
export interface FactCheckProviderConfig {
  /** API key */
  apiKey?: string;
  /** Base URL */
  baseUrl: string;
  /** Whether enabled */
  enabled: boolean;
  /** Timeout in milliseconds */
  timeout: number;
}

/**
 * Service configuration
 */
export interface FactCheckServiceConfig {
  /** Default confidence threshold */
  defaultConfidenceThreshold: number;
  /** Default timeout */
  defaultTimeout: number;
  /** Maximum claims per request */
  maxClaimsPerRequest: number;
  /** Provider configurations */
  providers: {
    wikipedia: FactCheckProviderConfig;
    googleFactCheck: FactCheckProviderConfig;
  };
}

/**
 * External API response types
 */
export interface WikipediaSearchResponse {
  query: {
    search: Array<{
      title: string;
      snippet: string;
      pageid: number;
    }>;
  };
}

export interface GoogleFactCheckResponse {
  claims: Array<{
    text: string;
    claimant: string;
    claimReview: Array<{
      publisher: { name: string; site: string };
      url: string;
      title: string;
      textualRating: string;
    }>;
  }>;
}
