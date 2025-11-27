/**
 * Content Repurposing Service
 * Provides platform-specific formatting, length adjustment, tone adaptation,
 * and hashtag/formatting rule enforcement for social media platforms
 * Requirements: 109
 */

import crypto from 'crypto';
import {
  SocialPlatform,
  PlatformLimits,
  PlatformTone,
  HashtagConfig,
  FormattingOptions,
  RepurposingRequest,
  RepurposingResult,
  RepurposedPost,
  MultiPlatformRequest,
  MultiPlatformResult,
  ContentAnalysis,
  HashtagSuggestion,
  RepurposingConfig,
  PlatformFormattingRules,
} from './types';

/** Default configuration values */
const DEFAULT_MIN_CONTENT_LENGTH = 10;
const DEFAULT_MAX_CONTENT_LENGTH = 50000;
const DEFAULT_TIMEOUT = 30000;

/** Platform character limits and configurations */
const PLATFORM_LIMITS: Record<SocialPlatform, PlatformLimits> = {
  twitter: {
    platform: 'twitter',
    maxCharacters: 280,
    maxHashtags: 5,
    maxLinks: 1,
    supportsMarkdown: false,
    supportsLineBreaks: true,
    supportsEmojis: true,
    optimalLength: 240,
    description: 'Short-form microblogging platform',
  },
  linkedin: {
    platform: 'linkedin',
    maxCharacters: 3000,
    maxHashtags: 5,
    maxLinks: 3,
    supportsMarkdown: false,
    supportsLineBreaks: true,
    supportsEmojis: true,
    optimalLength: 1300,
    description: 'Professional networking platform',
  },
  facebook: {
    platform: 'facebook',
    maxCharacters: 63206,
    maxHashtags: 10,
    maxLinks: 5,
    supportsMarkdown: false,
    supportsLineBreaks: true,
    supportsEmojis: true,
    optimalLength: 500,
    description: 'Social networking platform',
  },
  medium: {
    platform: 'medium',
    maxCharacters: 100000,
    maxHashtags: 5,
    maxLinks: 10,
    supportsMarkdown: true,
    supportsLineBreaks: true,
    supportsEmojis: true,
    optimalLength: 7000,
    description: 'Long-form publishing platform',
  },
  instagram: {
    platform: 'instagram',
    maxCharacters: 2200,
    maxHashtags: 30,
    maxLinks: 0,
    supportsMarkdown: false,
    supportsLineBreaks: true,
    supportsEmojis: true,
    optimalLength: 1000,
    description: 'Visual-focused social platform',
  },
  threads: {
    platform: 'threads',
    maxCharacters: 500,
    maxHashtags: 5,
    maxLinks: 1,
    supportsMarkdown: false,
    supportsLineBreaks: true,
    supportsEmojis: true,
    optimalLength: 400,
    description: 'Text-based conversation platform',
  },
};

/** Platform formatting rules */
const PLATFORM_FORMATTING_RULES: Record<SocialPlatform, PlatformFormattingRules> = {
  twitter: {
    platform: 'twitter',
    preferredTone: 'conversational',
    hashtagRules: { maxCount: 3, position: 'end', caseStyle: 'camelCase' },
    emojiUsage: 'moderate',
    lineBreakStyle: 'single',
    ctaStyle: 'question',
  },
  linkedin: {
    platform: 'linkedin',
    preferredTone: 'professional',
    hashtagRules: { maxCount: 5, position: 'end', caseStyle: 'camelCase' },
    emojiUsage: 'minimal',
    lineBreakStyle: 'double',
    ctaStyle: 'soft',
  },
  facebook: {
    platform: 'facebook',
    preferredTone: 'engaging',
    hashtagRules: { maxCount: 5, position: 'end', caseStyle: 'lowercase' },
    emojiUsage: 'moderate',
    lineBreakStyle: 'double',
    ctaStyle: 'question',
  },
  medium: {
    platform: 'medium',
    preferredTone: 'informative',
    hashtagRules: { maxCount: 5, position: 'end', caseStyle: 'lowercase' },
    emojiUsage: 'none',
    lineBreakStyle: 'double',
    ctaStyle: 'none',
  },
  instagram: {
    platform: 'instagram',
    preferredTone: 'casual',
    hashtagRules: { maxCount: 20, position: 'end', caseStyle: 'lowercase' },
    emojiUsage: 'heavy',
    lineBreakStyle: 'double',
    ctaStyle: 'imperative',
  },
  threads: {
    platform: 'threads',
    preferredTone: 'conversational',
    hashtagRules: { maxCount: 3, position: 'end', caseStyle: 'camelCase' },
    emojiUsage: 'moderate',
    lineBreakStyle: 'single',
    ctaStyle: 'question',
  },
};

/** Tone-specific transformations */
const TONE_TRANSFORMATIONS: Record<PlatformTone, { phrases: Record<string, string>; style: string }> = {
  casual: {
    phrases: {
      'In conclusion': 'So basically',
      'Furthermore': 'Plus',
      'However': 'But',
      'Therefore': 'So',
      'Additionally': 'Also',
      'It is important to note': 'Just so you know',
      'In order to': 'To',
      'Due to the fact that': 'Because',
      'At this point in time': 'Right now',
      'In the event that': 'If',
    },
    style: 'relaxed and friendly',
  },
  professional: {
    phrases: {
      'gonna': 'going to',
      'wanna': 'want to',
      'gotta': 'have to',
      'kinda': 'somewhat',
      'sorta': 'sort of',
      'yeah': 'yes',
      'nope': 'no',
      'awesome': 'excellent',
      'cool': 'impressive',
    },
    style: 'formal and business-appropriate',
  },
  conversational: {
    phrases: {
      'One must consider': 'Think about',
      'It should be noted': 'Keep in mind',
      'The aforementioned': 'What I mentioned',
      'Subsequently': 'Then',
      'Consequently': 'So',
    },
    style: 'friendly and approachable',
  },
  formal: {
    phrases: {
      "don't": 'do not',
      "won't": 'will not',
      "can't": 'cannot',
      "shouldn't": 'should not',
      "wouldn't": 'would not',
      "couldn't": 'could not',
      "isn't": 'is not',
      "aren't": 'are not',
      "wasn't": 'was not',
      "weren't": 'were not',
    },
    style: 'structured and proper',
  },
  engaging: {
    phrases: {
      'This is': 'Here\'s',
      'There are': 'Check out these',
      'You should': 'You\'ll want to',
      'It is recommended': 'I recommend',
      'Consider': 'Try',
    },
    style: 'attention-grabbing and interactive',
  },
  informative: {
    phrases: {
      'I think': 'Research shows',
      'Maybe': 'Evidence suggests',
      'Probably': 'Studies indicate',
      'I believe': 'Data demonstrates',
    },
    style: 'educational and fact-based',
  },
};

/** Common topic keywords for hashtag generation */
const TOPIC_KEYWORDS: Record<string, string[]> = {
  technology: ['tech', 'software', 'digital', 'AI', 'innovation', 'coding', 'programming', 'app', 'startup'],
  business: ['business', 'entrepreneur', 'marketing', 'sales', 'growth', 'strategy', 'leadership', 'management'],
  health: ['health', 'wellness', 'fitness', 'nutrition', 'mental', 'exercise', 'diet', 'lifestyle'],
  education: ['learning', 'education', 'study', 'knowledge', 'skills', 'training', 'course', 'tutorial'],
  finance: ['finance', 'money', 'investment', 'crypto', 'stocks', 'trading', 'wealth', 'budget'],
  lifestyle: ['life', 'travel', 'food', 'fashion', 'home', 'family', 'relationships', 'personal'],
  creative: ['design', 'art', 'creative', 'writing', 'photography', 'video', 'content', 'media'],
};

/** CTA templates by style */
const CTA_TEMPLATES: Record<string, string[]> = {
  question: [
    'What do you think?',
    'Have you experienced this?',
    'What\'s your take?',
    'Agree or disagree?',
    'What would you add?',
  ],
  imperative: [
    'Share your thoughts below!',
    'Drop a comment!',
    'Let me know!',
    'Tag someone who needs this!',
    'Save this for later!',
  ],
  soft: [
    'I\'d love to hear your perspective.',
    'Feel free to share your experience.',
    'Your thoughts are welcome.',
    'Looking forward to the discussion.',
  ],
};

/** Emojis by category */
const EMOJIS: Record<string, string[]> = {
  positive: ['✨', '🎉', '💪', '🚀', '⭐', '💡', '🔥', '👏'],
  professional: ['📊', '💼', '📈', '🎯', '✅', '📌', '🔑', '💎'],
  casual: ['😊', '👋', '🙌', '❤️', '😄', '🤔', '👀', '💬'],
  informative: ['📚', '💡', '🔍', '📝', '🧠', '📖', '🎓', '💭'],
};


/**
 * Content Repurposing Service class
 * Handles platform-specific formatting, length adjustment, tone adaptation,
 * and hashtag/formatting rule enforcement
 */
export class RepurposingService {
  private config: RepurposingConfig;

  constructor(serviceConfig?: Partial<RepurposingConfig>) {
    this.config = this.buildConfig(serviceConfig);
  }

  /**
   * Builds the service configuration
   */
  private buildConfig(overrides?: Partial<RepurposingConfig>): RepurposingConfig {
    return {
      defaultHashtagConfig: overrides?.defaultHashtagConfig ?? {
        includeHashtags: true,
        maxHashtags: 5,
        autoGenerate: true,
        position: 'end',
      },
      defaultFormattingOptions: overrides?.defaultFormattingOptions ?? {
        includeEmojis: true,
        includeLineBreaks: true,
        includeCTA: true,
        includeLinks: true,
        shortenLinks: true,
        threadNumbering: true,
      },
      minContentLength: overrides?.minContentLength ?? DEFAULT_MIN_CONTENT_LENGTH,
      maxContentLength: overrides?.maxContentLength ?? DEFAULT_MAX_CONTENT_LENGTH,
      timeout: overrides?.timeout ?? DEFAULT_TIMEOUT,
    };
  }

  /**
   * Generates a unique identifier
   */
  private generateId(prefix: string): string {
    return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Gets platform limits
   */
  getPlatformLimits(platform: SocialPlatform): PlatformLimits {
    return PLATFORM_LIMITS[platform];
  }

  /**
   * Gets all platform limits
   */
  getAllPlatformLimits(): PlatformLimits[] {
    return Object.values(PLATFORM_LIMITS);
  }

  /**
   * Gets platform formatting rules
   */
  getPlatformFormattingRules(platform: SocialPlatform): PlatformFormattingRules {
    return PLATFORM_FORMATTING_RULES[platform];
  }

  /**
   * Analyzes content for repurposing
   */
  analyzeContent(content: string): ContentAnalysis {
    const words = this.splitIntoWords(content);
    const sentences = this.splitIntoSentences(content);
    const keyTopics = this.extractKeyTopics(content);
    const suggestedHashtags = this.generateHashtagSuggestions(content, keyTopics);
    const currentTone = this.detectTone(content);
    const readabilityScore = this.calculateReadability(content);
    const containsLinks = /https?:\/\/[^\s]+/.test(content);
    const containsMentions = /@\w+/.test(content);

    return {
      wordCount: words.length,
      characterCount: content.length,
      sentenceCount: sentences.length,
      keyTopics,
      suggestedHashtags,
      currentTone,
      readabilityScore,
      containsLinks,
      containsMentions,
    };
  }

  /**
   * Repurposes content for a specific platform
   * Requirement 109: Build content repurposing
   */
  async repurpose(request: RepurposingRequest): Promise<RepurposingResult> {
    const startTime = Date.now();
    const id = this.generateId('rep');

    const {
      content,
      targetPlatform,
      targetTone,
      hashtagConfig,
      formattingOptions,
      allowSplitting,
      maxPosts = 10,
      preserveKeywords = [],
      customLengthLimit,
    } = request;

    const platformLimits = this.getPlatformLimits(targetPlatform);
    const platformRules = this.getPlatformFormattingRules(targetPlatform);
    
    // Merge configurations
    const finalHashtagConfig = this.mergeHashtagConfig(hashtagConfig, platformRules);
    const finalFormattingOptions = this.mergeFormattingOptions(formattingOptions, platformRules);
    const finalTone = targetTone ?? platformRules.preferredTone;
    const maxLength = customLengthLimit ?? platformLimits.maxCharacters;

    // Step 1: Adapt tone
    let adaptedContent = this.adaptTone(content, finalTone);

    // Step 2: Apply platform-specific formatting
    adaptedContent = this.applyPlatformFormatting(adaptedContent, targetPlatform, finalFormattingOptions);

    // Step 3: Generate hashtags
    const hashtags = finalHashtagConfig.includeHashtags
      ? this.generateHashtags(adaptedContent, finalHashtagConfig, targetPlatform)
      : [];

    // Step 4: Add CTA if enabled
    if (finalFormattingOptions.includeCTA) {
      adaptedContent = this.addCTA(adaptedContent, platformRules.ctaStyle, finalFormattingOptions.ctaText);
    }

    // Step 5: Add emojis if enabled
    if (finalFormattingOptions.includeEmojis && platformLimits.supportsEmojis) {
      adaptedContent = this.addEmojis(adaptedContent, platformRules.emojiUsage, finalTone);
    }

    // Step 6: Split into posts if needed
    const posts = this.createPosts(
      adaptedContent,
      hashtags,
      maxLength,
      allowSplitting,
      maxPosts,
      finalFormattingOptions,
      platformLimits
    );

    const totalCharacters = posts.reduce((sum, post) => sum + post.characterCount, 0);
    const reductionPercentage = content.length > 0
      ? Math.round(((content.length - totalCharacters) / content.length) * 100)
      : 0;

    return {
      id,
      originalContent: content,
      targetPlatform,
      posts,
      totalCharacters,
      platformLimits,
      toneApplied: finalTone,
      formattingApplied: finalFormattingOptions,
      hashtagConfigUsed: finalHashtagConfig,
      reductionPercentage: Math.max(0, reductionPercentage),
      timestamp: new Date(),
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Repurposes content for multiple platforms
   */
  async repurposeMultiPlatform(request: MultiPlatformRequest): Promise<MultiPlatformResult> {
    const startTime = Date.now();
    const id = this.generateId('multi');

    const platformResults: Partial<Record<SocialPlatform, RepurposingResult>> = {};
    let totalPosts = 0;

    for (const platform of request.targetPlatforms) {
      const result = await this.repurpose({
        content: request.content,
        targetPlatform: platform,
        hashtagConfig: request.hashtagConfig,
        formattingOptions: request.formattingOptions,
        allowSplitting: request.allowSplitting,
        preserveKeywords: request.preserveKeywords,
      });

      platformResults[platform] = result;
      totalPosts += result.posts.length;
    }

    return {
      id,
      originalContent: request.content,
      platformResults: platformResults as Record<SocialPlatform, RepurposingResult>,
      totalPosts,
      timestamp: new Date(),
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Merges hashtag configuration with platform rules
   */
  private mergeHashtagConfig(
    userConfig: Partial<HashtagConfig> | undefined,
    platformRules: PlatformFormattingRules
  ): HashtagConfig {
    return {
      includeHashtags: userConfig?.includeHashtags ?? this.config.defaultHashtagConfig.includeHashtags,
      maxHashtags: Math.min(
        userConfig?.maxHashtags ?? this.config.defaultHashtagConfig.maxHashtags,
        platformRules.hashtagRules.maxCount
      ),
      requiredHashtags: userConfig?.requiredHashtags ?? [],
      excludedHashtags: userConfig?.excludedHashtags ?? [],
      autoGenerate: userConfig?.autoGenerate ?? this.config.defaultHashtagConfig.autoGenerate,
      position: userConfig?.position ?? platformRules.hashtagRules.position,
    };
  }

  /**
   * Merges formatting options with platform rules
   */
  private mergeFormattingOptions(
    userOptions: Partial<FormattingOptions> | undefined,
    platformRules: PlatformFormattingRules
  ): FormattingOptions {
    return {
      includeEmojis: userOptions?.includeEmojis ?? platformRules.emojiUsage !== 'none',
      includeLineBreaks: userOptions?.includeLineBreaks ?? platformRules.lineBreakStyle !== 'none',
      includeCTA: userOptions?.includeCTA ?? platformRules.ctaStyle !== 'none',
      ctaText: userOptions?.ctaText,
      includeLinks: userOptions?.includeLinks ?? this.config.defaultFormattingOptions.includeLinks,
      shortenLinks: userOptions?.shortenLinks ?? this.config.defaultFormattingOptions.shortenLinks,
      threadNumbering: userOptions?.threadNumbering ?? this.config.defaultFormattingOptions.threadNumbering,
    };
  }

  /**
   * Adapts content tone for target platform
   * Requirement 109: Build tone adaptation for different channels
   */
  private adaptTone(content: string, targetTone: PlatformTone): string {
    let adapted = content;
    const transformations = TONE_TRANSFORMATIONS[targetTone];

    if (transformations) {
      for (const [original, replacement] of Object.entries(transformations.phrases)) {
        const pattern = new RegExp(`\\b${this.escapeRegex(original)}\\b`, 'gi');
        adapted = adapted.replace(pattern, replacement);
      }
    }

    return adapted;
  }

  /**
   * Applies platform-specific formatting
   * Requirement 109: Implement platform-specific formatting
   */
  private applyPlatformFormatting(
    content: string,
    platform: SocialPlatform,
    options: FormattingOptions
  ): string {
    let formatted = content;
    const platformLimits = PLATFORM_LIMITS[platform];
    const platformRules = PLATFORM_FORMATTING_RULES[platform];

    // Handle line breaks
    if (options.includeLineBreaks && platformLimits.supportsLineBreaks) {
      if (platformRules.lineBreakStyle === 'double') {
        formatted = formatted.replace(/\n/g, '\n\n');
      }
    } else {
      formatted = formatted.replace(/\n+/g, ' ');
    }

    // Handle markdown for non-supporting platforms
    if (!platformLimits.supportsMarkdown) {
      formatted = this.stripMarkdown(formatted);
    }

    // Clean up extra whitespace
    formatted = formatted.replace(/\s+/g, ' ').trim();

    return formatted;
  }

  /**
   * Strips markdown formatting
   */
  private stripMarkdown(text: string): string {
    return text
      .replace(/\*\*(.+?)\*\*/g, '$1') // Bold
      .replace(/\*(.+?)\*/g, '$1') // Italic
      .replace(/__(.+?)__/g, '$1') // Bold
      .replace(/_(.+?)_/g, '$1') // Italic
      .replace(/~~(.+?)~~/g, '$1') // Strikethrough
      .replace(/`(.+?)`/g, '$1') // Code
      .replace(/#{1,6}\s+/g, '') // Headers
      .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Links
      .replace(/!\[.*?\]\(.+?\)/g, '') // Images
      .replace(/^\s*[-*+]\s+/gm, '• ') // Lists
      .replace(/^\s*\d+\.\s+/gm, ''); // Numbered lists
  }

  /**
   * Generates hashtags for content
   * Requirement 109: Add hashtag and formatting rule enforcement
   */
  private generateHashtags(
    content: string,
    config: HashtagConfig,
    platform: SocialPlatform
  ): string[] {
    const hashtags: string[] = [];
    const platformRules = PLATFORM_FORMATTING_RULES[platform];

    // Add required hashtags first
    if (config.requiredHashtags) {
      for (const tag of config.requiredHashtags) {
        const formatted = this.formatHashtag(tag, platformRules.hashtagRules.caseStyle);
        if (!hashtags.includes(formatted)) {
          hashtags.push(formatted);
        }
      }
    }

    // Auto-generate hashtags if enabled
    if (config.autoGenerate && hashtags.length < config.maxHashtags) {
      const keyTopics = this.extractKeyTopics(content);
      const suggestions = this.generateHashtagSuggestions(content, keyTopics);

      for (const suggestion of suggestions) {
        if (hashtags.length >= config.maxHashtags) break;
        
        const formatted = this.formatHashtag(suggestion.hashtag, platformRules.hashtagRules.caseStyle);
        
        // Skip excluded hashtags
        if (config.excludedHashtags?.some(ex => ex.toLowerCase() === suggestion.hashtag.toLowerCase())) {
          continue;
        }

        if (!hashtags.includes(formatted)) {
          hashtags.push(formatted);
        }
      }
    }

    return hashtags.slice(0, config.maxHashtags);
  }

  /**
   * Formats a hashtag according to case style
   */
  private formatHashtag(tag: string, caseStyle: 'lowercase' | 'camelCase' | 'PascalCase'): string {
    const cleanTag = tag.replace(/^#/, '').replace(/[^a-zA-Z0-9]/g, '');
    
    switch (caseStyle) {
      case 'lowercase':
        return `#${cleanTag.toLowerCase()}`;
      case 'camelCase':
        return `#${cleanTag.charAt(0).toLowerCase()}${cleanTag.slice(1)}`;
      case 'PascalCase':
        return `#${cleanTag.charAt(0).toUpperCase()}${cleanTag.slice(1)}`;
      default:
        return `#${cleanTag}`;
    }
  }

  /**
   * Adds a call-to-action to content
   */
  private addCTA(content: string, ctaStyle: string, customCTA?: string): string {
    if (ctaStyle === 'none') return content;

    const cta = customCTA ?? this.getRandomCTA(ctaStyle);
    return `${content}\n\n${cta}`;
  }

  /**
   * Gets a random CTA for the given style
   */
  private getRandomCTA(style: string): string {
    const templates = CTA_TEMPLATES[style] ?? CTA_TEMPLATES['question']!;
    return templates[Math.floor(Math.random() * templates.length)]!;
  }

  /**
   * Adds emojis to content based on usage level
   */
  private addEmojis(content: string, usage: string, tone: PlatformTone): string {
    if (usage === 'none') return content;

    const emojiCategory = this.getEmojiCategory(tone);
    const emojis = EMOJIS[emojiCategory] ?? EMOJIS['positive']!;
    
    let emojiCount: number;
    switch (usage) {
      case 'minimal':
        emojiCount = 1;
        break;
      case 'moderate':
        emojiCount = 2;
        break;
      case 'heavy':
        emojiCount = 4;
        break;
      default:
        emojiCount = 1;
    }

    // Add emoji at the start
    const startEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    let result = `${startEmoji} ${content}`;

    // Add more emojis for moderate/heavy usage
    if (emojiCount > 1) {
      const sentences = this.splitIntoSentences(result);
      if (sentences.length > 2) {
        const midIndex = Math.floor(sentences.length / 2);
        const midEmoji = emojis[Math.floor(Math.random() * emojis.length)];
        sentences[midIndex] = `${sentences[midIndex]} ${midEmoji}`;
        result = sentences.join(' ');
      }
    }

    return result;
  }

  /**
   * Gets emoji category based on tone
   */
  private getEmojiCategory(tone: PlatformTone): string {
    switch (tone) {
      case 'professional':
        return 'professional';
      case 'casual':
      case 'conversational':
        return 'casual';
      case 'informative':
        return 'informative';
      default:
        return 'positive';
    }
  }


  /**
   * Creates posts from content, splitting if necessary
   * Requirement 109: Create length adjustment for platform limits
   */
  private createPosts(
    content: string,
    hashtags: string[],
    maxLength: number,
    allowSplitting: boolean,
    maxPosts: number,
    options: FormattingOptions,
    platformLimits: PlatformLimits
  ): RepurposedPost[] {
    const hashtagString = hashtags.length > 0 ? '\n\n' + hashtags.join(' ') : '';
    const hashtagLength = hashtagString.length;
    const availableLength = maxLength - hashtagLength;

    // If content fits in one post
    if (content.length <= availableLength) {
      const finalContent = content + hashtagString;
      return [{
        content: finalContent,
        characterCount: finalContent.length,
        hashtags,
        links: this.extractLinks(finalContent),
        withinLimits: finalContent.length <= maxLength,
        postIndex: 1,
        totalPosts: 1,
        engagementScore: this.calculateEngagementScore(finalContent, platformLimits),
      }];
    }

    // If splitting is not allowed, truncate
    if (!allowSplitting) {
      const truncated = this.truncateContent(content, availableLength - 3) + '...';
      const finalContent = truncated + hashtagString;
      return [{
        content: finalContent,
        characterCount: finalContent.length,
        hashtags,
        links: this.extractLinks(finalContent),
        withinLimits: finalContent.length <= maxLength,
        postIndex: 1,
        totalPosts: 1,
        engagementScore: this.calculateEngagementScore(finalContent, platformLimits),
      }];
    }

    // Split into multiple posts
    const posts: RepurposedPost[] = [];
    const sentences = this.splitIntoSentences(content);
    let currentPost = '';
    let postIndex = 1;

    // Calculate space needed for thread numbering
    const threadNumberingLength = options.threadNumbering ? 10 : 0; // e.g., "(1/10) "
    const effectiveMaxLength = availableLength - threadNumberingLength;

    for (const sentence of sentences) {
      const testContent = currentPost ? `${currentPost} ${sentence}` : sentence;

      if (testContent.length <= effectiveMaxLength) {
        currentPost = testContent;
      } else {
        // Save current post and start new one
        if (currentPost) {
          posts.push(this.createSinglePost(
            currentPost,
            hashtags,
            postIndex,
            maxPosts,
            options,
            platformLimits,
            maxLength
          ));
          postIndex++;
        }

        // Start new post with current sentence
        if (sentence.length <= effectiveMaxLength) {
          currentPost = sentence;
        } else {
          // Sentence is too long, need to split it
          const chunks = this.splitLongText(sentence, effectiveMaxLength);
          for (const chunk of chunks) {
            if (posts.length >= maxPosts - 1) break;
            posts.push(this.createSinglePost(
              chunk,
              hashtags,
              postIndex,
              maxPosts,
              options,
              platformLimits,
              maxLength
            ));
            postIndex++;
          }
          currentPost = '';
        }
      }

      if (posts.length >= maxPosts) break;
    }

    // Add remaining content
    if (currentPost && posts.length < maxPosts) {
      posts.push(this.createSinglePost(
        currentPost,
        hashtags,
        postIndex,
        maxPosts,
        options,
        platformLimits,
        maxLength
      ));
    }

    // Update total posts count
    const totalPosts = posts.length;
    for (const post of posts) {
      post.totalPosts = totalPosts;
      
      // Add thread numbering if enabled
      if (options.threadNumbering && totalPosts > 1) {
        const numbering = `(${post.postIndex}/${totalPosts}) `;
        post.content = numbering + post.content;
        post.characterCount = post.content.length;
        post.withinLimits = post.characterCount <= maxLength;
      }
    }

    return posts;
  }

  /**
   * Creates a single post object
   */
  private createSinglePost(
    content: string,
    hashtags: string[],
    postIndex: number,
    maxPosts: number,
    options: FormattingOptions,
    platformLimits: PlatformLimits,
    maxLength: number
  ): RepurposedPost {
    // Only add hashtags to the last post in a thread
    const isLastPost = postIndex === maxPosts;
    const hashtagString = isLastPost && hashtags.length > 0 ? '\n\n' + hashtags.join(' ') : '';
    const finalContent = content + hashtagString;

    return {
      content: finalContent,
      characterCount: finalContent.length,
      hashtags: isLastPost ? hashtags : [],
      links: this.extractLinks(finalContent),
      withinLimits: finalContent.length <= maxLength,
      postIndex,
      totalPosts: maxPosts, // Will be updated later
      engagementScore: this.calculateEngagementScore(finalContent, platformLimits),
    };
  }

  /**
   * Truncates content to fit within limit
   */
  private truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) return content;

    // Try to truncate at word boundary
    const truncated = content.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > maxLength * 0.8) {
      return truncated.substring(0, lastSpace);
    }

    return truncated;
  }

  /**
   * Splits long text into chunks
   */
  private splitLongText(text: string, maxLength: number): string[] {
    const chunks: string[] = [];
    let remaining = text;

    while (remaining.length > maxLength) {
      const chunk = this.truncateContent(remaining, maxLength);
      chunks.push(chunk);
      remaining = remaining.substring(chunk.length).trim();
    }

    if (remaining) {
      chunks.push(remaining);
    }

    return chunks;
  }

  /**
   * Calculates engagement score for a post
   */
  private calculateEngagementScore(content: string, platformLimits: PlatformLimits): number {
    let score = 50; // Base score

    // Length optimization
    const lengthRatio = content.length / platformLimits.optimalLength;
    if (lengthRatio >= 0.8 && lengthRatio <= 1.2) {
      score += 15;
    } else if (lengthRatio >= 0.5 && lengthRatio <= 1.5) {
      score += 10;
    }

    // Has hashtags
    if (/#\w+/.test(content)) {
      score += 10;
    }

    // Has emojis
    if (/[\u{1F300}-\u{1F9FF}]/u.test(content)) {
      score += 5;
    }

    // Has question (engagement driver)
    if (/\?/.test(content)) {
      score += 10;
    }

    // Has call-to-action words
    if (/\b(share|comment|like|follow|subscribe|check out|learn more)\b/i.test(content)) {
      score += 10;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Extracts links from content
   */
  private extractLinks(content: string): string[] {
    const linkPattern = /https?:\/\/[^\s]+/g;
    return content.match(linkPattern) ?? [];
  }

  /**
   * Extracts key topics from content
   */
  private extractKeyTopics(content: string): string[] {
    const topics: string[] = [];
    const lowerContent = content.toLowerCase();

    for (const [category, keywords] of Object.entries(TOPIC_KEYWORDS)) {
      for (const keyword of keywords) {
        if (lowerContent.includes(keyword.toLowerCase())) {
          if (!topics.includes(category)) {
            topics.push(category);
          }
          break;
        }
      }
    }

    return topics;
  }

  /**
   * Generates hashtag suggestions based on content
   */
  private generateHashtagSuggestions(content: string, keyTopics: string[]): HashtagSuggestion[] {
    const suggestions: HashtagSuggestion[] = [];
    const words = this.splitIntoWords(content);
    const wordFrequency: Record<string, number> = {};

    // Count word frequency
    for (const word of words) {
      const lower = word.toLowerCase();
      if (lower.length >= 4 && !/^\d+$/.test(lower)) {
        wordFrequency[lower] = (wordFrequency[lower] ?? 0) + 1;
      }
    }

    // Add topic-based hashtags
    for (const topic of keyTopics) {
      suggestions.push({
        hashtag: topic,
        relevance: 0.9,
        popularity: 'high',
        category: 'topic',
      });
    }

    // Add frequency-based hashtags
    const sortedWords = Object.entries(wordFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    for (const [word, freq] of sortedWords) {
      if (!suggestions.some(s => s.hashtag.toLowerCase() === word)) {
        suggestions.push({
          hashtag: word,
          relevance: Math.min(0.8, freq / 5),
          popularity: freq > 3 ? 'high' : freq > 1 ? 'medium' : 'low',
          category: 'keyword',
        });
      }
    }

    return suggestions.sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * Detects the current tone of content
   */
  private detectTone(content: string): PlatformTone {
    const lowerContent = content.toLowerCase();

    // Check for formal indicators
    const formalIndicators = ['therefore', 'furthermore', 'consequently', 'moreover', 'hereby'];
    const casualIndicators = ['gonna', 'wanna', 'kinda', 'yeah', 'awesome', 'cool'];
    const professionalIndicators = ['strategy', 'implementation', 'stakeholder', 'deliverable', 'optimize'];

    let formalScore = 0;
    let casualScore = 0;
    let professionalScore = 0;

    for (const indicator of formalIndicators) {
      if (lowerContent.includes(indicator)) formalScore++;
    }

    for (const indicator of casualIndicators) {
      if (lowerContent.includes(indicator)) casualScore++;
    }

    for (const indicator of professionalIndicators) {
      if (lowerContent.includes(indicator)) professionalScore++;
    }

    if (casualScore > formalScore && casualScore > professionalScore) {
      return 'casual';
    }
    if (professionalScore > formalScore && professionalScore > casualScore) {
      return 'professional';
    }
    if (formalScore > 0) {
      return 'formal';
    }

    return 'conversational';
  }

  /**
   * Calculates readability score (0-100)
   */
  private calculateReadability(content: string): number {
    const sentences = this.splitIntoSentences(content);
    const words = this.splitIntoWords(content);
    
    if (sentences.length === 0 || words.length === 0) return 50;

    const avgSentenceLength = words.length / sentences.length;
    
    // Simple readability based on sentence length
    // Shorter sentences = higher readability
    if (avgSentenceLength <= 10) return 90;
    if (avgSentenceLength <= 15) return 80;
    if (avgSentenceLength <= 20) return 70;
    if (avgSentenceLength <= 25) return 60;
    if (avgSentenceLength <= 30) return 50;
    return 40;
  }

  /**
   * Splits text into sentences
   */
  private splitIntoSentences(text: string): string[] {
    return text
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  /**
   * Splits text into words
   */
  private splitIntoWords(text: string): string[] {
    return text
      .replace(/[^\w\s'-]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 0);
  }

  /**
   * Escapes special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

/** Singleton instance */
export const repurposingService = new RepurposingService();
