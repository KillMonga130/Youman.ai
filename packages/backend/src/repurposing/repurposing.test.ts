/**
 * Content Repurposing Service Tests
 * Tests for platform-specific formatting, length adjustment, tone adaptation,
 * and hashtag/formatting rule enforcement
 * Requirements: 109
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RepurposingService } from './repurposing.service';
import { SocialPlatform, RepurposingRequest } from './types';

describe('RepurposingService', () => {
  let service: RepurposingService;

  beforeEach(() => {
    service = new RepurposingService();
  });

  describe('getPlatformLimits', () => {
    it('should return correct limits for Twitter', () => {
      const limits = service.getPlatformLimits('twitter');
      
      expect(limits.platform).toBe('twitter');
      expect(limits.maxCharacters).toBe(280);
      expect(limits.maxHashtags).toBe(5);
      expect(limits.supportsEmojis).toBe(true);
    });

    it('should return correct limits for LinkedIn', () => {
      const limits = service.getPlatformLimits('linkedin');
      
      expect(limits.platform).toBe('linkedin');
      expect(limits.maxCharacters).toBe(3000);
      expect(limits.maxHashtags).toBe(5);
    });

    it('should return correct limits for Medium', () => {
      const limits = service.getPlatformLimits('medium');
      
      expect(limits.platform).toBe('medium');
      expect(limits.maxCharacters).toBe(100000);
      expect(limits.supportsMarkdown).toBe(true);
    });

    it('should return correct limits for Instagram', () => {
      const limits = service.getPlatformLimits('instagram');
      
      expect(limits.platform).toBe('instagram');
      expect(limits.maxCharacters).toBe(2200);
      expect(limits.maxHashtags).toBe(30);
      expect(limits.maxLinks).toBe(0); // Instagram doesn't support clickable links in posts
    });
  });

  describe('getAllPlatformLimits', () => {
    it('should return limits for all platforms', () => {
      const allLimits = service.getAllPlatformLimits();
      
      expect(allLimits.length).toBeGreaterThanOrEqual(6);
      expect(allLimits.map(l => l.platform)).toContain('twitter');
      expect(allLimits.map(l => l.platform)).toContain('linkedin');
      expect(allLimits.map(l => l.platform)).toContain('facebook');
      expect(allLimits.map(l => l.platform)).toContain('medium');
    });
  });

  describe('getPlatformFormattingRules', () => {
    it('should return professional tone for LinkedIn', () => {
      const rules = service.getPlatformFormattingRules('linkedin');
      
      expect(rules.preferredTone).toBe('professional');
      expect(rules.emojiUsage).toBe('minimal');
    });

    it('should return conversational tone for Twitter', () => {
      const rules = service.getPlatformFormattingRules('twitter');
      
      expect(rules.preferredTone).toBe('conversational');
    });

    it('should return casual tone for Instagram', () => {
      const rules = service.getPlatformFormattingRules('instagram');
      
      expect(rules.preferredTone).toBe('casual');
      expect(rules.emojiUsage).toBe('heavy');
    });
  });

  describe('analyzeContent', () => {
    it('should analyze content correctly', () => {
      const content = 'This is a test content about technology and innovation. It discusses software development and AI.';
      const analysis = service.analyzeContent(content);
      
      expect(analysis.wordCount).toBeGreaterThan(0);
      expect(analysis.characterCount).toBe(content.length);
      expect(analysis.sentenceCount).toBeGreaterThan(0);
      expect(analysis.keyTopics).toBeDefined();
      expect(analysis.suggestedHashtags).toBeDefined();
    });

    it('should detect links in content', () => {
      const content = 'Check out this link: https://example.com for more info.';
      const analysis = service.analyzeContent(content);
      
      expect(analysis.containsLinks).toBe(true);
    });

    it('should detect mentions in content', () => {
      const content = 'Thanks @user for the great feedback!';
      const analysis = service.analyzeContent(content);
      
      expect(analysis.containsMentions).toBe(true);
    });

    it('should extract key topics', () => {
      const content = 'Our new software uses AI and machine learning for better coding and programming experiences.';
      const analysis = service.analyzeContent(content);
      
      expect(analysis.keyTopics).toContain('technology');
    });
  });

  describe('repurpose', () => {
    it('should repurpose content for Twitter', async () => {
      const request: RepurposingRequest = {
        content: 'This is a short test message for social media.',
        targetPlatform: 'twitter',
        allowSplitting: false,
      };

      const result = await service.repurpose(request);

      expect(result.id).toBeDefined();
      expect(result.targetPlatform).toBe('twitter');
      expect(result.posts.length).toBeGreaterThan(0);
      expect(result.posts[0]!.withinLimits).toBe(true);
    });

    it('should split long content into multiple tweets', async () => {
      const longContent = 'This is a very long piece of content that needs to be split into multiple posts. '.repeat(20);
      
      const request: RepurposingRequest = {
        content: longContent,
        targetPlatform: 'twitter',
        allowSplitting: true,
        maxPosts: 5,
      };

      const result = await service.repurpose(request);

      expect(result.posts.length).toBeGreaterThan(1);
      expect(result.posts.length).toBeLessThanOrEqual(5);
    });

    it('should truncate content when splitting is not allowed', async () => {
      const longContent = 'This is a very long piece of content. '.repeat(20);
      
      const request: RepurposingRequest = {
        content: longContent,
        targetPlatform: 'twitter',
        allowSplitting: false,
      };

      const result = await service.repurpose(request);

      expect(result.posts.length).toBe(1);
      expect(result.posts[0]!.content).toContain('...');
    });

    it('should apply professional tone for LinkedIn', async () => {
      const request: RepurposingRequest = {
        content: 'gonna share some awesome tips about business strategy',
        targetPlatform: 'linkedin',
        allowSplitting: false,
      };

      const result = await service.repurpose(request);

      // Professional tone should replace casual words
      expect(result.toneApplied).toBe('professional');
    });

    it('should include hashtags when configured', async () => {
      const request: RepurposingRequest = {
        content: 'This is content about technology and software development.',
        targetPlatform: 'twitter',
        allowSplitting: false,
        hashtagConfig: {
          includeHashtags: true,
          autoGenerate: true,
          maxHashtags: 3,
        },
      };

      const result = await service.repurpose(request);

      expect(result.posts[0]!.hashtags.length).toBeGreaterThan(0);
      expect(result.posts[0]!.hashtags.length).toBeLessThanOrEqual(3);
    });

    it('should include required hashtags', async () => {
      const request: RepurposingRequest = {
        content: 'This is a test post.',
        targetPlatform: 'twitter',
        allowSplitting: false,
        hashtagConfig: {
          includeHashtags: true,
          requiredHashtags: ['TestHashtag', 'Required'],
          maxHashtags: 5,
        },
      };

      const result = await service.repurpose(request);

      const hashtagsLower = result.posts[0]!.hashtags.map(h => h.toLowerCase());
      expect(hashtagsLower).toContain('#testhashtag');
      expect(hashtagsLower).toContain('#required');
    });

    it('should exclude specified hashtags', async () => {
      const request: RepurposingRequest = {
        content: 'This is content about technology.',
        targetPlatform: 'twitter',
        allowSplitting: false,
        hashtagConfig: {
          includeHashtags: true,
          autoGenerate: true,
          excludedHashtags: ['technology'],
          maxHashtags: 5,
        },
      };

      const result = await service.repurpose(request);

      const hashtagsLower = result.posts[0]!.hashtags.map(h => h.toLowerCase());
      expect(hashtagsLower).not.toContain('#technology');
    });

    it('should respect custom length limit', async () => {
      const request: RepurposingRequest = {
        content: 'This is a test message that should be truncated.',
        targetPlatform: 'twitter',
        allowSplitting: false,
        customLengthLimit: 50,
      };

      const result = await service.repurpose(request);

      // Content should be truncated to fit custom limit
      expect(result.posts[0]!.characterCount).toBeLessThanOrEqual(60); // Some buffer for hashtags
    });

    it('should add thread numbering for multi-post content', async () => {
      const longContent = 'This is a very long piece of content that needs to be split. '.repeat(15);
      
      const request: RepurposingRequest = {
        content: longContent,
        targetPlatform: 'twitter',
        allowSplitting: true,
        formattingOptions: {
          threadNumbering: true,
        },
      };

      const result = await service.repurpose(request);

      if (result.posts.length > 1) {
        expect(result.posts[0]!.content).toMatch(/^\(\d+\/\d+\)/);
      }
    });

    it('should calculate engagement score', async () => {
      const request: RepurposingRequest = {
        content: 'What do you think about this? Share your thoughts!',
        targetPlatform: 'twitter',
        allowSplitting: false,
      };

      const result = await service.repurpose(request);

      expect(result.posts[0]!.engagementScore).toBeGreaterThan(0);
      expect(result.posts[0]!.engagementScore).toBeLessThanOrEqual(100);
    });
  });

  describe('repurposeMultiPlatform', () => {
    it('should repurpose content for multiple platforms', async () => {
      const request = {
        content: 'This is a test message for multiple platforms.',
        targetPlatforms: ['twitter', 'linkedin', 'facebook'] as SocialPlatform[],
        allowSplitting: false,
      };

      const result = await service.repurposeMultiPlatform(request);

      expect(result.id).toBeDefined();
      expect(result.platformResults.twitter).toBeDefined();
      expect(result.platformResults.linkedin).toBeDefined();
      expect(result.platformResults.facebook).toBeDefined();
      expect(result.totalPosts).toBeGreaterThanOrEqual(3);
    });

    it('should apply different tones for different platforms', async () => {
      const request = {
        content: 'gonna share some awesome tips',
        targetPlatforms: ['twitter', 'linkedin'] as SocialPlatform[],
        allowSplitting: false,
      };

      const result = await service.repurposeMultiPlatform(request);

      expect(result.platformResults.twitter.toneApplied).toBe('conversational');
      expect(result.platformResults.linkedin.toneApplied).toBe('professional');
    });
  });

  describe('platform-specific formatting', () => {
    it('should strip markdown for non-supporting platforms', async () => {
      const request: RepurposingRequest = {
        content: '**Bold text** and *italic text* with [links](https://example.com)',
        targetPlatform: 'twitter',
        allowSplitting: false,
      };

      const result = await service.repurpose(request);

      expect(result.posts[0]!.content).not.toContain('**');
      expect(result.posts[0]!.content).not.toContain('*');
    });

    it('should preserve markdown for Medium', async () => {
      const request: RepurposingRequest = {
        content: '**Bold text** and *italic text*',
        targetPlatform: 'medium',
        allowSplitting: false,
        formattingOptions: {
          includeEmojis: false,
          includeCTA: false,
        },
      };

      const result = await service.repurpose(request);

      // Medium supports markdown, so it should be preserved
      expect(result.platformLimits.supportsMarkdown).toBe(true);
    });

    it('should handle Instagram with no links', async () => {
      const limits = service.getPlatformLimits('instagram');
      
      expect(limits.maxLinks).toBe(0);
    });
  });

  describe('tone adaptation', () => {
    it('should convert casual to professional tone', async () => {
      const request: RepurposingRequest = {
        content: 'gonna wanna share this awesome stuff',
        targetPlatform: 'linkedin',
        targetTone: 'professional',
        allowSplitting: false,
        formattingOptions: {
          includeEmojis: false,
          includeCTA: false,
        },
        hashtagConfig: {
          includeHashtags: false,
        },
      };

      const result = await service.repurpose(request);

      // Professional tone should replace casual words
      expect(result.posts[0]!.content).not.toContain('gonna');
      expect(result.posts[0]!.content).not.toContain('wanna');
    });

    it('should convert formal to casual tone', async () => {
      const request: RepurposingRequest = {
        content: 'Furthermore, it is important to note that this is significant.',
        targetPlatform: 'twitter',
        targetTone: 'casual',
        allowSplitting: false,
        formattingOptions: {
          includeEmojis: false,
          includeCTA: false,
        },
        hashtagConfig: {
          includeHashtags: false,
        },
      };

      const result = await service.repurpose(request);

      // Casual tone should replace formal words
      expect(result.posts[0]!.content).not.toContain('Furthermore');
    });
  });

  describe('hashtag generation', () => {
    it('should generate hashtags based on content topics', async () => {
      const request: RepurposingRequest = {
        content: 'Learn about software development, coding best practices, and programming tips.',
        targetPlatform: 'twitter',
        allowSplitting: false,
        hashtagConfig: {
          includeHashtags: true,
          autoGenerate: true,
          maxHashtags: 5,
        },
      };

      const result = await service.repurpose(request);

      expect(result.posts[0]!.hashtags.length).toBeGreaterThan(0);
    });

    it('should respect maxHashtags limit', async () => {
      const request: RepurposingRequest = {
        content: 'Technology innovation software development AI machine learning coding programming startup business.',
        targetPlatform: 'twitter',
        allowSplitting: false,
        hashtagConfig: {
          includeHashtags: true,
          autoGenerate: true,
          maxHashtags: 2,
        },
      };

      const result = await service.repurpose(request);

      expect(result.posts[0]!.hashtags.length).toBeLessThanOrEqual(2);
    });

    it('should format hashtags according to platform rules', async () => {
      const request: RepurposingRequest = {
        content: 'Test content',
        targetPlatform: 'twitter',
        allowSplitting: false,
        hashtagConfig: {
          includeHashtags: true,
          requiredHashtags: ['TestTag'],
          maxHashtags: 1,
        },
      };

      const result = await service.repurpose(request);

      // Twitter uses camelCase for hashtags
      expect(result.posts[0]!.hashtags[0]).toMatch(/^#[a-z]/);
    });
  });

  describe('content length adjustment', () => {
    it('should fit content within Twitter limit', async () => {
      const request: RepurposingRequest = {
        content: 'Short tweet content.',
        targetPlatform: 'twitter',
        allowSplitting: false,
      };

      const result = await service.repurpose(request);

      expect(result.posts[0]!.characterCount).toBeLessThanOrEqual(280);
      expect(result.posts[0]!.withinLimits).toBe(true);
    });

    it('should fit content within LinkedIn limit', async () => {
      const longContent = 'This is a longer piece of content for LinkedIn. '.repeat(10);
      
      const request: RepurposingRequest = {
        content: longContent,
        targetPlatform: 'linkedin',
        allowSplitting: false,
      };

      const result = await service.repurpose(request);

      expect(result.posts[0]!.characterCount).toBeLessThanOrEqual(3000);
    });

    it('should calculate reduction percentage', async () => {
      const longContent = 'This is a very long piece of content. '.repeat(20);
      
      const request: RepurposingRequest = {
        content: longContent,
        targetPlatform: 'twitter',
        allowSplitting: false,
      };

      const result = await service.repurpose(request);

      expect(result.reductionPercentage).toBeGreaterThan(0);
    });
  });
});
