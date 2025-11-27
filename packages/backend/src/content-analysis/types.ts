/**
 * Content Analysis Service Types
 * Type definitions for writing style analysis, gap analysis, audience analysis,
 * competitive analysis, performance prediction, credibility assessment,
 * controversy detection, and freshness optimization
 * Requirements: 54, 62, 122-130
 */

/**
 * Writing style categories
 */
export type StyleCategory =
  | 'technical'
  | 'creative'
  | 'persuasive'
  | 'informative'
  | 'conversational'
  | 'academic'
  | 'journalistic'
  | 'marketing';

/**
 * Voice type in writing
 */
export type VoiceType = 'active' | 'passive' | 'mixed';

/**
 * Style inconsistency found in text
 */
export interface Inconsistency {
  /** Type of inconsistency */
  type: 'tone' | 'formality' | 'vocabulary' | 'structure' | 'voice';
  /** Description of the inconsistency */
  description: string;
  /** Position in text (character index) */
  position: number;
  /** Text segment with inconsistency */
  segment: string;
  /** Severity (0-1) */
  severity: number;
  /** Suggestion for fixing */
  suggestion: string;
}

/**
 * Writing style analysis result
 * Requirement 54: Writing style analysis
 */
export interface StyleAnalysis {
  /** Unique analysis identifier */
  id: string;
  /** Formality level (0-100, higher = more formal) */
  formality: number;
  /** Complexity level (0-100, higher = more complex) */
  complexity: number;
  /** Dominant voice type */
  voice: VoiceType;
  /** Style category */
  category: StyleCategory;
  /** Detected inconsistencies */
  inconsistencies: Inconsistency[];
  /** Average sentence length */
  avgSentenceLength: number;
  /** Vocabulary richness (unique words / total words) */
  vocabularyRichness: number;
  /** Readability score (Flesch-Kincaid grade level) */
  readabilityScore: number;
  /** Passive voice percentage */
  passiveVoicePercent: number;
  /** Analysis timestamp */
  timestamp: Date;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}


/**
 * Gap analysis result
 * Requirement 62: Gap analysis system
 */
export interface GapAnalysis {
  /** Unique analysis identifier */
  id: string;
  /** Missing main topics */
  missingTopics: string[];
  /** Missing subtopics */
  missingSubtopics: string[];
  /** Completeness score (0-100) */
  completenessScore: number;
  /** Recommendations for improvement */
  recommendations: string[];
  /** Topics that are well covered */
  coveredTopics: string[];
  /** Topic coverage breakdown */
  topicCoverage: TopicCoverage[];
  /** Analysis timestamp */
  timestamp: Date;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Topic coverage detail
 */
export interface TopicCoverage {
  /** Topic name */
  topic: string;
  /** Coverage percentage (0-100) */
  coverage: number;
  /** Depth of coverage (shallow, moderate, deep) */
  depth: 'shallow' | 'moderate' | 'deep';
  /** Related subtopics covered */
  subtopicsCovered: string[];
  /** Related subtopics missing */
  subtopicsMissing: string[];
}

/**
 * Audience type
 */
export type AudienceType =
  | 'general'
  | 'technical'
  | 'academic'
  | 'business'
  | 'youth'
  | 'professional'
  | 'casual';

/**
 * Audience profile result
 * Requirement 122: Audience analysis
 */
export interface AudienceProfile {
  /** Unique profile identifier */
  id: string;
  /** Primary target audience */
  primaryAudience: AudienceType;
  /** Secondary audiences */
  secondaryAudiences: AudienceType[];
  /** Estimated reading level (grade level) */
  readingLevel: number;
  /** Technical expertise required (0-100) */
  technicalLevel: number;
  /** Age group suitability */
  ageGroup: 'children' | 'teens' | 'adults' | 'all';
  /** Industry relevance */
  industries: string[];
  /** Audience engagement indicators */
  engagementIndicators: EngagementIndicator[];
  /** Recommendations for audience targeting */
  recommendations: string[];
  /** Analysis timestamp */
  timestamp: Date;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Engagement indicator
 */
export interface EngagementIndicator {
  /** Indicator type */
  type: 'call-to-action' | 'question' | 'story' | 'statistic' | 'example';
  /** Count in text */
  count: number;
  /** Effectiveness score (0-1) */
  effectiveness: number;
  /** Positions in text */
  positions: number[];
}

/**
 * Competitive analysis result
 * Requirement 123: Competitive analysis
 */
export interface CompetitiveAnalysis {
  /** Unique analysis identifier */
  id: string;
  /** Overall competitive score (0-100) */
  competitiveScore: number;
  /** Strengths compared to competitors */
  strengths: string[];
  /** Weaknesses compared to competitors */
  weaknesses: string[];
  /** Opportunities for improvement */
  opportunities: string[];
  /** Unique value propositions */
  uniqueElements: string[];
  /** Competitor comparison details */
  comparisons: CompetitorComparison[];
  /** Recommendations */
  recommendations: string[];
  /** Analysis timestamp */
  timestamp: Date;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Competitor comparison detail
 */
export interface CompetitorComparison {
  /** Competitor identifier/name */
  competitor: string;
  /** Similarity score (0-100) */
  similarity: number;
  /** Areas where we're better */
  advantages: string[];
  /** Areas where competitor is better */
  disadvantages: string[];
  /** Key differentiators */
  differentiators: string[];
}

/**
 * Performance prediction result
 * Requirement 124: Performance prediction
 */
export interface PerformancePrediction {
  /** Unique prediction identifier */
  id: string;
  /** Overall predicted performance score (0-100) */
  overallScore: number;
  /** Predicted engagement rate (0-100) */
  engagementRate: number;
  /** Predicted readability score (0-100) */
  readabilityScore: number;
  /** Predicted shareability (0-100) */
  shareability: number;
  /** Predicted SEO performance (0-100) */
  seoPerformance: number;
  /** Predicted conversion potential (0-100) */
  conversionPotential: number;
  /** Confidence level (0-1) */
  confidence: number;
  /** Factors affecting performance */
  factors: PerformanceFactor[];
  /** Recommendations for improvement */
  recommendations: string[];
  /** Analysis timestamp */
  timestamp: Date;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Performance factor
 */
export interface PerformanceFactor {
  /** Factor name */
  name: string;
  /** Impact on performance (-1 to 1, negative = hurts, positive = helps) */
  impact: number;
  /** Current score (0-100) */
  score: number;
  /** Suggestion for improvement */
  suggestion: string;
}


/**
 * Credibility assessment result
 * Requirement 125: Credibility assessment
 */
export interface CredibilityScore {
  /** Unique assessment identifier */
  id: string;
  /** Overall credibility score (0-100) */
  overallScore: number;
  /** Source citation score (0-100) */
  sourceCitationScore: number;
  /** Factual accuracy indicators (0-100) */
  factualIndicators: number;
  /** Authority signals (0-100) */
  authoritySignals: number;
  /** Bias detection score (0-100, higher = less biased) */
  biasScore: number;
  /** Transparency score (0-100) */
  transparencyScore: number;
  /** Credibility factors */
  factors: CredibilityFactor[];
  /** Issues found */
  issues: CredibilityIssue[];
  /** Recommendations */
  recommendations: string[];
  /** Analysis timestamp */
  timestamp: Date;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Credibility factor
 */
export interface CredibilityFactor {
  /** Factor name */
  name: string;
  /** Score (0-100) */
  score: number;
  /** Weight in overall calculation */
  weight: number;
  /** Description */
  description: string;
}

/**
 * Credibility issue
 */
export interface CredibilityIssue {
  /** Issue type */
  type: 'unsupported-claim' | 'bias' | 'missing-source' | 'outdated' | 'sensationalism';
  /** Description */
  description: string;
  /** Position in text */
  position: number;
  /** Text segment */
  segment: string;
  /** Severity (0-1) */
  severity: number;
  /** Suggestion for fixing */
  suggestion: string;
}

/**
 * Controversy detection result
 * Requirement 126: Controversy detection
 */
export interface ControversyReport {
  /** Unique report identifier */
  id: string;
  /** Overall controversy level (0-100) */
  controversyLevel: number;
  /** Whether content is controversial */
  isControversial: boolean;
  /** Controversial topics detected */
  controversialTopics: ControversialTopic[];
  /** Sensitive language detected */
  sensitiveLanguage: SensitiveLanguage[];
  /** Polarizing statements */
  polarizingStatements: PolarizingStatement[];
  /** Risk assessment */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  /** Recommendations */
  recommendations: string[];
  /** Analysis timestamp */
  timestamp: Date;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Controversial topic
 */
export interface ControversialTopic {
  /** Topic name */
  topic: string;
  /** Controversy score (0-100) */
  score: number;
  /** Context in text */
  context: string;
  /** Position in text */
  position: number;
  /** Suggested handling */
  suggestion: string;
}

/**
 * Sensitive language detection
 */
export interface SensitiveLanguage {
  /** The sensitive term or phrase */
  term: string;
  /** Category of sensitivity */
  category: 'political' | 'religious' | 'cultural' | 'social' | 'health' | 'legal';
  /** Severity (0-1) */
  severity: number;
  /** Position in text */
  position: number;
  /** Alternative suggestion */
  alternative: string;
}

/**
 * Polarizing statement
 */
export interface PolarizingStatement {
  /** The statement */
  statement: string;
  /** Position in text */
  position: number;
  /** Polarization score (0-100) */
  score: number;
  /** Suggested neutral alternative */
  neutralAlternative: string;
}

/**
 * Freshness score result
 * Requirement 127: Freshness optimization
 */
export interface FreshnessScore {
  /** Unique score identifier */
  id: string;
  /** Overall freshness score (0-100) */
  overallScore: number;
  /** Content age indicators */
  ageIndicators: AgeIndicator[];
  /** Outdated references */
  outdatedReferences: OutdatedReference[];
  /** Trending topic alignment (0-100) */
  trendingAlignment: number;
  /** Evergreen content score (0-100) */
  evergreenScore: number;
  /** Time-sensitive elements */
  timeSensitiveElements: TimeSensitiveElement[];
  /** Recommendations for freshening */
  recommendations: string[];
  /** Analysis timestamp */
  timestamp: Date;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Age indicator in content
 */
export interface AgeIndicator {
  /** Type of indicator */
  type: 'date' | 'reference' | 'technology' | 'event' | 'statistic';
  /** The indicator text */
  text: string;
  /** Estimated age (in days, negative = future) */
  estimatedAge: number;
  /** Position in text */
  position: number;
  /** Impact on freshness (0-1) */
  impact: number;
}

/**
 * Outdated reference
 */
export interface OutdatedReference {
  /** The reference text */
  reference: string;
  /** Why it's outdated */
  reason: string;
  /** Position in text */
  position: number;
  /** Suggested update */
  suggestedUpdate: string;
}

/**
 * Time-sensitive element
 */
export interface TimeSensitiveElement {
  /** Element text */
  text: string;
  /** Type of time sensitivity */
  type: 'date' | 'event' | 'deadline' | 'seasonal';
  /** Position in text */
  position: number;
  /** Expiration estimate (days from now, null if unknown) */
  expiresIn: number | null;
  /** Recommendation */
  recommendation: string;
}


/**
 * Content analysis options
 */
export interface ContentAnalysisOptions {
  /** Topic for gap analysis */
  topic?: string;
  /** Competitor texts for competitive analysis */
  competitors?: string[];
  /** Whether to include detailed breakdowns */
  detailed?: boolean;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Language of the content */
  language?: string;
}

/**
 * Comprehensive content analysis result
 */
export interface ComprehensiveAnalysis {
  /** Style analysis */
  styleAnalysis: StyleAnalysis;
  /** Gap analysis (if topic provided) */
  gapAnalysis?: GapAnalysis;
  /** Audience profile */
  audienceProfile: AudienceProfile;
  /** Competitive analysis (if competitors provided) */
  competitiveAnalysis?: CompetitiveAnalysis;
  /** Performance prediction */
  performancePrediction: PerformancePrediction;
  /** Credibility score */
  credibilityScore: CredibilityScore;
  /** Controversy report */
  controversyReport: ControversyReport;
  /** Freshness score */
  freshnessScore: FreshnessScore;
  /** Overall content quality score (0-100) */
  overallQualityScore: number;
  /** Top recommendations */
  topRecommendations: string[];
  /** Analysis timestamp */
  timestamp: Date;
  /** Total processing time in milliseconds */
  totalProcessingTimeMs: number;
}

/**
 * Content analysis service configuration
 */
export interface ContentAnalysisConfig {
  /** Default timeout in milliseconds */
  defaultTimeout: number;
  /** Minimum text length for analysis (in words) */
  minTextLength: number;
  /** Maximum text length for single analysis (in words) */
  maxTextLength: number;
  /** Controversy threshold (0-100) */
  controversyThreshold: number;
  /** Credibility threshold (0-100) */
  credibilityThreshold: number;
  /** Freshness threshold (0-100) */
  freshnessThreshold: number;
}
