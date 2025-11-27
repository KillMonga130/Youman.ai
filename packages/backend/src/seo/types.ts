/**
 * SEO Service Types
 * Type definitions for SEO keyword preservation and metadata management
 * Requirements: 27
 */

/**
 * Keyword importance level
 */
export type KeywordImportance = 'high' | 'medium' | 'low';

/**
 * Keyword extracted from text
 * Requirement 27.1: Maintain keyword density within 0.5% of original
 */
export interface Keyword {
  /** The keyword term */
  term: string;
  /** Original density in the text (percentage) */
  originalDensity: number;
  /** Target density to maintain (percentage) */
  targetDensity: number;
  /** Importance level of the keyword */
  importance: KeywordImportance;
  /** Number of occurrences in original text */
  originalCount: number;
  /** Word count of the keyword (for multi-word keywords) */
  wordCount: number;
}

/**
 * Keyword density validation result
 * Requirement 27.1: Maintain keyword density within 0.5% of original
 */
export interface KeywordDensityResult {
  /** The keyword being validated */
  keyword: string;
  /** Original density (percentage) */
  originalDensity: number;
  /** Transformed density (percentage) */
  transformedDensity: number;
  /** Difference in density (percentage points) */
  densityDifference: number;
  /** Whether the density is within acceptable range (0.5%) */
  isWithinRange: boolean;
  /** Original count */
  originalCount: number;
  /** Transformed count */
  transformedCount: number;
}

/**
 * Density report for all keywords
 * Requirement 27.1: Maintain keyword density within 0.5% of original
 */
export interface DensityReport {
  /** Individual keyword results */
  results: KeywordDensityResult[];
  /** Overall validation status */
  overallValid: boolean;
  /** Number of keywords within acceptable range */
  validCount: number;
  /** Number of keywords outside acceptable range */
  invalidCount: number;
  /** Total keywords analyzed */
  totalKeywords: number;
  /** Keywords that need adjustment */
  keywordsNeedingAdjustment: string[];
  /** Timestamp of the report */
  timestamp: Date;
}

/**
 * Meta tag types
 */
export type MetaTagType = 
  | 'title'
  | 'description'
  | 'keywords'
  | 'author'
  | 'robots'
  | 'og:title'
  | 'og:description'
  | 'og:image'
  | 'twitter:title'
  | 'twitter:description'
  | 'twitter:image'
  | 'canonical'
  | 'custom';

/**
 * Meta tag structure
 * Requirement 27.2: Preserve or enhance meta tags while humanizing
 */
export interface MetaTag {
  /** Type of meta tag */
  type: MetaTagType;
  /** Tag name/property */
  name: string;
  /** Tag content */
  content: string;
  /** Whether this tag was humanized */
  humanized: boolean;
  /** Original content (if humanized) */
  originalContent?: string;
}

/**
 * Meta tags collection
 * Requirement 27.2: Preserve or enhance meta tags while humanizing
 */
export interface MetaTags {
  /** Title tag */
  title?: MetaTag;
  /** Description meta tag */
  description?: MetaTag;
  /** Keywords meta tag */
  keywords?: MetaTag;
  /** Open Graph tags */
  openGraph: MetaTag[];
  /** Twitter Card tags */
  twitter: MetaTag[];
  /** Other meta tags */
  other: MetaTag[];
  /** All tags as array */
  all: MetaTag[];
}

/**
 * Heading level (H1-H6)
 */
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Heading structure element
 * Requirement 27.3: Maintain H1-H6 hierarchy and keyword placement
 */
export interface HeadingElement {
  /** Heading level (1-6) */
  level: HeadingLevel;
  /** Heading text content */
  text: string;
  /** Keywords found in heading */
  keywords: string[];
  /** Position in document (character index) */
  position: number;
  /** Whether heading was humanized */
  humanized: boolean;
  /** Original text (if humanized) */
  originalText?: string;
  /** Unique identifier */
  id: string;
}

/**
 * Heading hierarchy structure
 * Requirement 27.3: Maintain H1-H6 hierarchy and keyword placement
 */
export interface HeadingStructure {
  /** All headings in document order */
  headings: HeadingElement[];
  /** Whether hierarchy is valid (no skipped levels) */
  hierarchyValid: boolean;
  /** Hierarchy validation errors */
  hierarchyErrors: string[];
  /** Count of headings by level */
  levelCounts: Record<HeadingLevel, number>;
  /** Total heading count */
  totalHeadings: number;
  /** Keywords preserved in headings */
  preservedKeywords: string[];
}

/**
 * Link structure element
 * Requirement 27.5: Preserve all anchor text and link structures
 */
export interface LinkElement {
  /** Link URL/href */
  href: string;
  /** Anchor text */
  anchorText: string;
  /** Whether this is an internal link */
  isInternal: boolean;
  /** Whether anchor text was humanized */
  humanized: boolean;
  /** Original anchor text (if humanized) */
  originalAnchorText?: string;
  /** Position in document (character index) */
  position: number;
  /** Link title attribute */
  title?: string;
  /** Link rel attribute */
  rel?: string;
  /** Unique identifier */
  id: string;
}

/**
 * Link map for document
 * Requirement 27.5: Preserve all anchor text and link structures
 */
export interface LinkMap {
  /** All links in document */
  links: LinkElement[];
  /** Internal links */
  internalLinks: LinkElement[];
  /** External links */
  externalLinks: LinkElement[];
  /** Total link count */
  totalLinks: number;
  /** Internal link count */
  internalCount: number;
  /** External link count */
  externalCount: number;
  /** Broken links detected */
  brokenLinks: string[];
}

/**
 * Alt text element for images
 * Requirement 27.4: Humanize alt text while preserving descriptive keywords
 */
export interface AltTextElement {
  /** Image source URL */
  src: string;
  /** Alt text content */
  altText: string;
  /** Keywords in alt text */
  keywords: string[];
  /** Whether alt text was humanized */
  humanized: boolean;
  /** Original alt text (if humanized) */
  originalAltText?: string;
  /** Position in document */
  position: number;
  /** Unique identifier */
  id: string;
}

/**
 * SEO analysis result
 */
export interface SEOAnalysisResult {
  /** Extracted keywords */
  keywords: Keyword[];
  /** Meta tags */
  metaTags: MetaTags;
  /** Heading structure */
  headingStructure: HeadingStructure;
  /** Link map */
  linkMap: LinkMap;
  /** Alt text elements */
  altTexts: AltTextElement[];
  /** Overall SEO score (0-100) */
  seoScore: number;
  /** SEO recommendations */
  recommendations: string[];
  /** Timestamp */
  timestamp: Date;
}

/**
 * SEO preservation options
 */
export interface SEOPreservationOptions {
  /** Keywords to preserve (if not auto-extracted) */
  keywords?: string[];
  /** Keyword importance mapping */
  keywordImportance?: Record<string, KeywordImportance>;
  /** Maximum density deviation allowed (default: 0.5%) */
  maxDensityDeviation?: number;
  /** Whether to humanize meta descriptions */
  humanizeMetaDescriptions?: boolean;
  /** Whether to humanize headings */
  humanizeHeadings?: boolean;
  /** Whether to humanize alt text */
  humanizeAltText?: boolean;
  /** Whether to humanize anchor text */
  humanizeAnchorText?: boolean;
  /** Minimum keyword frequency to extract */
  minKeywordFrequency?: number;
  /** Maximum keywords to extract */
  maxKeywords?: number;
}

/**
 * SEO preservation result
 */
export interface SEOPreservationResult {
  /** Density report */
  densityReport: DensityReport;
  /** Preserved meta tags */
  metaTags: MetaTags;
  /** Preserved heading structure */
  headingStructure: HeadingStructure;
  /** Preserved link map */
  linkMap: LinkMap;
  /** Preserved alt texts */
  altTexts: AltTextElement[];
  /** Whether all SEO elements were preserved */
  allPreserved: boolean;
  /** Issues found during preservation */
  issues: string[];
  /** Timestamp */
  timestamp: Date;
}

/**
 * Document with SEO elements
 */
export interface SEODocument {
  /** Document content */
  content: string;
  /** Document URL (for internal link detection) */
  url?: string;
  /** Base URL for the site */
  baseUrl?: string;
  /** Document title */
  title?: string;
  /** Document meta tags (raw HTML or parsed) */
  metaTags?: string | MetaTags;
}
