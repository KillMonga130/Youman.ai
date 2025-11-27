/**
 * Content Repurposing Service Types
 * Type definitions for content repurposing including platform-specific formatting,
 * length adjustment, tone adaptation, and hashtag/formatting rule enforcement
 * Requirements: 109
 */

/**
 * Supported social media platforms
 */
export type SocialPlatform = 
  | 'twitter'
  | 'linkedin'
  | 'facebook'
  | 'medium'
  | 'instagram'
  | 'threads';

/**
 * Platform-specific character limits
 */
export interface PlatformLimits {
  /** Platform name */
  platform: SocialPlatform;
  /** Maximum character count */
  maxCharacters: number;
  /** Maximum hashtag count */
  maxHashtags: number;
  /** Maximum link count */
  maxLinks: number;
  /** Whether platform supports markdown */
  supportsMarkdown: boolean;
  /** Whether platform supports line breaks */
  supportsLineBreaks: boolean;
  /** Whether platform supports emojis */
  supportsEmojis: boolean;
  /** Optimal post length for engagement */
  optimalLength: number;
  /** Description of the platform */
  description: string;
}

/**
 * Platform tone characteristics
 */
export type PlatformTone = 
  | 'casual'
  | 'professional'
  | 'conversational'
  | 'formal'
  | 'engaging'
  | 'informative';

/**
 * Hashtag configuration
 */
export interface HashtagConfig {
  /** Whether to include hashtags */
  includeHashtags: boolean;
  /** Maximum number of hashtags */
  maxHashtags: number;
  /** Hashtags to always include */
  requiredHashtags?: string[];
  /** Hashtags to never include */
  excludedHashtags?: string[];
  /** Whether to generate hashtags from content */
  autoGenerate: boolean;
  /** Position of hashtags in post */
  position: 'inline' | 'end' | 'start';
}

/**
 * Formatting options for repurposed content
 */
export interface FormattingOptions {
  /** Whether to include emojis */
  includeEmojis: boolean;
  /** Whether to include line breaks */
  includeLineBreaks: boolean;
  /** Whether to include call-to-action */
  includeCTA: boolean;
  /** Custom call-to-action text */
  ctaText?: string;
  /** Whether to include links */
  includeLinks: boolean;
  /** Whether to shorten links */
  shortenLinks: boolean;
  /** Whether to add thread numbering (for Twitter threads) */
  threadNumbering: boolean;
}

/**
 * Content repurposing request
 */
export interface RepurposingRequest {
  /** Original content to repurpose */
  content: string;
  /** Target platform */
  targetPlatform: SocialPlatform;
  /** Target tone for the platform */
  targetTone?: PlatformTone;
  /** Hashtag configuration */
  hashtagConfig?: Partial<HashtagConfig>;
  /** Formatting options */
  formattingOptions?: Partial<FormattingOptions>;
  /** Whether to split into multiple posts if needed */
  allowSplitting: boolean;
  /** Maximum number of posts to generate */
  maxPosts?: number;
  /** Keywords to preserve */
  preserveKeywords?: string[];
  /** Custom length limit (overrides platform default) */
  customLengthLimit?: number;
}

/**
 * Single repurposed post
 */
export interface RepurposedPost {
  /** Post content */
  content: string;
  /** Character count */
  characterCount: number;
  /** Hashtags included */
  hashtags: string[];
  /** Links included */
  links: string[];
  /** Whether post is within platform limits */
  withinLimits: boolean;
  /** Post index (for threads/series) */
  postIndex: number;
  /** Total posts in series */
  totalPosts: number;
  /** Estimated engagement score (0-100) */
  engagementScore: number;
}

/**
 * Content repurposing result
 */
export interface RepurposingResult {
  /** Unique result identifier */
  id: string;
  /** Original content */
  originalContent: string;
  /** Target platform */
  targetPlatform: SocialPlatform;
  /** Repurposed posts */
  posts: RepurposedPost[];
  /** Total character count across all posts */
  totalCharacters: number;
  /** Platform limits used */
  platformLimits: PlatformLimits;
  /** Tone applied */
  toneApplied: PlatformTone;
  /** Formatting applied */
  formattingApplied: FormattingOptions;
  /** Hashtag configuration used */
  hashtagConfigUsed: HashtagConfig;
  /** Content reduction percentage */
  reductionPercentage: number;
  /** Processing timestamp */
  timestamp: Date;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Multi-platform repurposing request
 */
export interface MultiPlatformRequest {
  /** Original content to repurpose */
  content: string;
  /** Target platforms */
  targetPlatforms: SocialPlatform[];
  /** Common hashtag configuration */
  hashtagConfig?: Partial<HashtagConfig>;
  /** Common formatting options */
  formattingOptions?: Partial<FormattingOptions>;
  /** Whether to allow splitting */
  allowSplitting: boolean;
  /** Keywords to preserve */
  preserveKeywords?: string[];
}

/**
 * Multi-platform repurposing result
 */
export interface MultiPlatformResult {
  /** Unique result identifier */
  id: string;
  /** Original content */
  originalContent: string;
  /** Results per platform */
  platformResults: Record<SocialPlatform, RepurposingResult>;
  /** Total posts generated */
  totalPosts: number;
  /** Processing timestamp */
  timestamp: Date;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Hashtag suggestion
 */
export interface HashtagSuggestion {
  /** Hashtag text (without #) */
  hashtag: string;
  /** Relevance score (0-1) */
  relevance: number;
  /** Estimated popularity */
  popularity: 'low' | 'medium' | 'high';
  /** Category */
  category: string;
}

/**
 * Content analysis for repurposing
 */
export interface ContentAnalysis {
  /** Word count */
  wordCount: number;
  /** Character count */
  characterCount: number;
  /** Sentence count */
  sentenceCount: number;
  /** Key topics extracted */
  keyTopics: string[];
  /** Suggested hashtags */
  suggestedHashtags: HashtagSuggestion[];
  /** Current tone */
  currentTone: PlatformTone;
  /** Readability score */
  readabilityScore: number;
  /** Contains links */
  containsLinks: boolean;
  /** Contains mentions */
  containsMentions: boolean;
}

/**
 * Repurposing service configuration
 */
export interface RepurposingConfig {
  /** Default hashtag configuration */
  defaultHashtagConfig: HashtagConfig;
  /** Default formatting options */
  defaultFormattingOptions: FormattingOptions;
  /** Minimum content length */
  minContentLength: number;
  /** Maximum content length */
  maxContentLength: number;
  /** Processing timeout in milliseconds */
  timeout: number;
}

/**
 * Platform formatting rules
 */
export interface PlatformFormattingRules {
  /** Platform name */
  platform: SocialPlatform;
  /** Preferred tone */
  preferredTone: PlatformTone;
  /** Hashtag rules */
  hashtagRules: {
    maxCount: number;
    position: 'inline' | 'end' | 'start';
    caseStyle: 'lowercase' | 'camelCase' | 'PascalCase';
  };
  /** Emoji usage */
  emojiUsage: 'none' | 'minimal' | 'moderate' | 'heavy';
  /** Line break style */
  lineBreakStyle: 'none' | 'single' | 'double';
  /** CTA style */
  ctaStyle: 'question' | 'imperative' | 'soft' | 'none';
}
