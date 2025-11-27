/**
 * SEO Service
 * Manages SEO keyword preservation and metadata
 * Requirements: 27
 */

import {
  Keyword,
  KeywordImportance,
  KeywordDensityResult,
  DensityReport,
  MetaTag,
  MetaTagType,
  MetaTags,
  HeadingElement,
  HeadingLevel,
  HeadingStructure,
  LinkElement,
  LinkMap,
  AltTextElement,
  SEOAnalysisResult,
  SEOPreservationOptions,
  SEOPreservationResult,
  SEODocument,
} from './types';

/** Default maximum density deviation (0.5%) */
const DEFAULT_MAX_DENSITY_DEVIATION = 0.5;

/** Default minimum keyword frequency */
const DEFAULT_MIN_KEYWORD_FREQUENCY = 2;

/** Default maximum keywords to extract */
const DEFAULT_MAX_KEYWORDS = 20;

/** Common stop words to exclude from keyword extraction */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he',
  'she', 'we', 'they', 'what', 'which', 'who', 'whom', 'whose', 'where',
  'when', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more',
  'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
  'same', 'so', 'than', 'too', 'very', 'just', 'also', 'now', 'here',
]);


/**
 * SEO Service class
 * Handles keyword extraction, density validation, and SEO element preservation
 */
export class SEOService {
  private maxDensityDeviation: number;
  private minKeywordFrequency: number;
  private maxKeywords: number;

  constructor(options?: Partial<SEOPreservationOptions>) {
    this.maxDensityDeviation = options?.maxDensityDeviation ?? DEFAULT_MAX_DENSITY_DEVIATION;
    this.minKeywordFrequency = options?.minKeywordFrequency ?? DEFAULT_MIN_KEYWORD_FREQUENCY;
    this.maxKeywords = options?.maxKeywords ?? DEFAULT_MAX_KEYWORDS;
  }

  /**
   * Extracts keywords from text
   * Requirement 27.1: Maintain keyword density
   * @param text - Text to extract keywords from
   * @param options - Extraction options
   * @returns Array of extracted keywords
   */
  extractKeywords(text: string, options?: SEOPreservationOptions): Keyword[] {
    const words = this.tokenize(text);
    const totalWords = words.length;

    if (totalWords === 0) {
      return [];
    }

    // Count word frequencies
    const wordFrequency = new Map<string, number>();
    for (const word of words) {
      const lower = word.toLowerCase();
      if (!STOP_WORDS.has(lower) && lower.length > 2) {
        wordFrequency.set(lower, (wordFrequency.get(lower) || 0) + 1);
      }
    }

    // Extract bi-grams (two-word phrases)
    const bigramFrequency = new Map<string, number>();
    for (let i = 0; i < words.length - 1; i++) {
      const w1 = words[i]?.toLowerCase() ?? '';
      const w2 = words[i + 1]?.toLowerCase() ?? '';
      if (!STOP_WORDS.has(w1) && !STOP_WORDS.has(w2) && w1.length > 2 && w2.length > 2) {
        const bigram = `${w1} ${w2}`;
        bigramFrequency.set(bigram, (bigramFrequency.get(bigram) || 0) + 1);
      }
    }

    const minFreq = options?.minKeywordFrequency ?? this.minKeywordFrequency;
    const maxKw = options?.maxKeywords ?? this.maxKeywords;
    const importanceMap = options?.keywordImportance ?? {};

    // Combine single words and bi-grams
    const keywords: Keyword[] = [];

    // Add single-word keywords
    for (const [term, count] of wordFrequency) {
      if (count >= minFreq) {
        const density = (count / totalWords) * 100;
        keywords.push({
          term,
          originalDensity: Math.round(density * 1000) / 1000,
          targetDensity: Math.round(density * 1000) / 1000,
          importance: importanceMap[term] ?? this.calculateImportance(count, totalWords),
          originalCount: count,
          wordCount: 1,
        });
      }
    }

    // Add bi-gram keywords
    for (const [term, count] of bigramFrequency) {
      if (count >= minFreq) {
        const density = (count * 2 / totalWords) * 100; // bi-grams count as 2 words
        keywords.push({
          term,
          originalDensity: Math.round(density * 1000) / 1000,
          targetDensity: Math.round(density * 1000) / 1000,
          importance: importanceMap[term] ?? this.calculateImportance(count, totalWords),
          originalCount: count,
          wordCount: 2,
        });
      }
    }

    // Sort by importance and frequency, then limit
    keywords.sort((a, b) => {
      const importanceOrder = { high: 0, medium: 1, low: 2 };
      const impDiff = importanceOrder[a.importance] - importanceOrder[b.importance];
      if (impDiff !== 0) return impDiff;
      return b.originalCount - a.originalCount;
    });

    return keywords.slice(0, maxKw);
  }


  /**
   * Validates keyword density between original and transformed text
   * Requirement 27.1: Maintain keyword density within 0.5% of original
   * @param original - Original text
   * @param transformed - Transformed text
   * @param keywords - Keywords to validate
   * @returns Density report
   */
  validateKeywordDensity(
    original: string,
    transformed: string,
    keywords: Keyword[]
  ): DensityReport {
    const originalWords = this.tokenize(original);
    const transformedWords = this.tokenize(transformed);
    const originalTotal = originalWords.length;
    const transformedTotal = transformedWords.length;

    const results: KeywordDensityResult[] = [];
    const keywordsNeedingAdjustment: string[] = [];

    for (const keyword of keywords) {
      const originalCount = this.countKeywordOccurrences(originalWords, keyword.term);
      const transformedCount = this.countKeywordOccurrences(transformedWords, keyword.term);

      const originalDensity = originalTotal > 0 
        ? (originalCount * keyword.wordCount / originalTotal) * 100 
        : 0;
      const transformedDensity = transformedTotal > 0 
        ? (transformedCount * keyword.wordCount / transformedTotal) * 100 
        : 0;

      const densityDifference = Math.abs(transformedDensity - originalDensity);
      const isWithinRange = densityDifference <= this.maxDensityDeviation;

      if (!isWithinRange) {
        keywordsNeedingAdjustment.push(keyword.term);
      }

      results.push({
        keyword: keyword.term,
        originalDensity: Math.round(originalDensity * 1000) / 1000,
        transformedDensity: Math.round(transformedDensity * 1000) / 1000,
        densityDifference: Math.round(densityDifference * 1000) / 1000,
        isWithinRange,
        originalCount,
        transformedCount,
      });
    }

    const validCount = results.filter(r => r.isWithinRange).length;
    const invalidCount = results.length - validCount;

    return {
      results,
      overallValid: invalidCount === 0,
      validCount,
      invalidCount,
      totalKeywords: results.length,
      keywordsNeedingAdjustment,
      timestamp: new Date(),
    };
  }

  /**
   * Preserves meta tags from document
   * Requirement 27.2: Preserve or enhance meta tags while humanizing
   * @param document - Document with meta tags
   * @returns Preserved meta tags
   */
  preserveMetaTags(document: SEODocument): MetaTags {
    const metaTags: MetaTags = {
      openGraph: [],
      twitter: [],
      other: [],
      all: [],
    };

    // If meta tags are already parsed, use them
    if (typeof document.metaTags === 'object' && document.metaTags !== null) {
      return document.metaTags;
    }

    // Parse meta tags from content if it's HTML
    const content = document.content;
    
    // Extract title tag
    const titleMatch = content.match(/<title[^>]*>([^<]*)<\/title>/i);
    if (titleMatch?.[1]) {
      const titleTag: MetaTag = {
        type: 'title',
        name: 'title',
        content: titleMatch[1].trim(),
        humanized: false,
      };
      metaTags.title = titleTag;
      metaTags.all.push(titleTag);
    }

    // Extract meta tags
    const metaRegex = /<meta\s+([^>]*)>/gi;
    let match;
    while ((match = metaRegex.exec(content)) !== null) {
      const attrs = match[1] ?? '';
      const tag = this.parseMetaTag(attrs);
      if (tag) {
        this.categorizeMetaTag(tag, metaTags);
        metaTags.all.push(tag);
      }
    }

    return metaTags;
  }


  /**
   * Maintains heading hierarchy in document
   * Requirement 27.3: Maintain H1-H6 hierarchy and keyword placement
   * @param document - Document to analyze
   * @param keywords - Keywords to track in headings
   * @returns Heading structure
   */
  maintainHeadingHierarchy(document: SEODocument, keywords?: Keyword[]): HeadingStructure {
    const content = document.content;
    const headings: HeadingElement[] = [];
    const levelCounts: Record<HeadingLevel, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const hierarchyErrors: string[] = [];
    const preservedKeywords: string[] = [];

    // Extract headings from HTML
    const headingRegex = /<h([1-6])[^>]*>([^<]*)<\/h\1>/gi;
    let match;
    let lastLevel = 0;
    let index = 0;

    while ((match = headingRegex.exec(content)) !== null) {
      const level = parseInt(match[1] ?? '1', 10) as HeadingLevel;
      const text = (match[2] ?? '').trim();
      const position = match.index;

      // Check hierarchy validity
      if (lastLevel > 0 && level > lastLevel + 1) {
        hierarchyErrors.push(
          `Heading level skipped: H${lastLevel} to H${level} at position ${position}`
        );
      }

      // Find keywords in heading
      const headingKeywords: string[] = [];
      if (keywords) {
        for (const kw of keywords) {
          if (text.toLowerCase().includes(kw.term.toLowerCase())) {
            headingKeywords.push(kw.term);
            if (!preservedKeywords.includes(kw.term)) {
              preservedKeywords.push(kw.term);
            }
          }
        }
      }

      headings.push({
        level,
        text,
        keywords: headingKeywords,
        position,
        humanized: false,
        id: `heading-${index++}`,
      });

      levelCounts[level]++;
      lastLevel = level;
    }

    // Also check for markdown headings
    const mdHeadingRegex = /^(#{1,6})\s+(.+)$/gm;
    while ((match = mdHeadingRegex.exec(content)) !== null) {
      const level = (match[1]?.length ?? 1) as HeadingLevel;
      const text = (match[2] ?? '').trim();
      const position = match.index;

      // Find keywords in heading
      const headingKeywords: string[] = [];
      if (keywords) {
        for (const kw of keywords) {
          if (text.toLowerCase().includes(kw.term.toLowerCase())) {
            headingKeywords.push(kw.term);
            if (!preservedKeywords.includes(kw.term)) {
              preservedKeywords.push(kw.term);
            }
          }
        }
      }

      headings.push({
        level,
        text,
        keywords: headingKeywords,
        position,
        humanized: false,
        id: `heading-${index++}`,
      });

      levelCounts[level]++;
    }

    // Sort headings by position
    headings.sort((a, b) => a.position - b.position);

    return {
      headings,
      hierarchyValid: hierarchyErrors.length === 0,
      hierarchyErrors,
      levelCounts,
      totalHeadings: headings.length,
      preservedKeywords,
    };
  }

  /**
   * Preserves link structure in document
   * Requirement 27.5: Preserve all anchor text and link structures
   * @param document - Document to analyze
   * @returns Link map
   */
  preserveLinkStructure(document: SEODocument): LinkMap {
    const content = document.content;
    const links: LinkElement[] = [];
    const brokenLinks: string[] = [];
    const baseUrl = document.baseUrl ?? '';

    // Extract HTML links
    const linkRegex = /<a\s+([^>]*)>([^<]*)<\/a>/gi;
    let match;
    let index = 0;

    while ((match = linkRegex.exec(content)) !== null) {
      const attrs = match[1] ?? '';
      const anchorText = (match[2] ?? '').trim();
      const position = match.index;

      const href = this.extractAttribute(attrs, 'href');
      const title = this.extractAttribute(attrs, 'title');
      const rel = this.extractAttribute(attrs, 'rel');

      if (href) {
        const isInternal = this.isInternalLink(href, baseUrl);

        const linkElement: LinkElement = {
          href,
          anchorText,
          isInternal,
          humanized: false,
          position,
          id: `link-${index++}`,
        };
        if (title) linkElement.title = title;
        if (rel) linkElement.rel = rel;
        links.push(linkElement);
      }
    }

    // Extract markdown links
    const mdLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    while ((match = mdLinkRegex.exec(content)) !== null) {
      const anchorText = (match[1] ?? '').trim();
      const href = (match[2] ?? '').trim();
      const position = match.index;

      if (href) {
        const isInternal = this.isInternalLink(href, baseUrl);

        links.push({
          href,
          anchorText,
          isInternal,
          humanized: false,
          position,
          id: `link-${index++}`,
        });
      }
    }

    // Sort links by position
    links.sort((a, b) => a.position - b.position);

    const internalLinks = links.filter(l => l.isInternal);
    const externalLinks = links.filter(l => !l.isInternal);

    return {
      links,
      internalLinks,
      externalLinks,
      totalLinks: links.length,
      internalCount: internalLinks.length,
      externalCount: externalLinks.length,
      brokenLinks,
    };
  }


  /**
   * Extracts and preserves alt text from images
   * Requirement 27.4: Humanize alt text while preserving descriptive keywords
   * @param document - Document to analyze
   * @param keywords - Keywords to preserve in alt text
   * @returns Array of alt text elements
   */
  extractAltTexts(document: SEODocument, keywords?: Keyword[]): AltTextElement[] {
    const content = document.content;
    const altTexts: AltTextElement[] = [];

    // Extract HTML images
    const imgRegex = /<img\s+([^>]*)>/gi;
    let match;
    let index = 0;

    while ((match = imgRegex.exec(content)) !== null) {
      const attrs = match[1] ?? '';
      const position = match.index;

      const src = this.extractAttribute(attrs, 'src');
      const alt = this.extractAttribute(attrs, 'alt');

      if (src) {
        // Find keywords in alt text
        const altKeywords: string[] = [];
        if (keywords && alt) {
          for (const kw of keywords) {
            if (alt.toLowerCase().includes(kw.term.toLowerCase())) {
              altKeywords.push(kw.term);
            }
          }
        }

        altTexts.push({
          src,
          altText: alt || '',
          keywords: altKeywords,
          humanized: false,
          position,
          id: `alt-${index++}`,
        });
      }
    }

    // Extract markdown images
    const mdImgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    while ((match = mdImgRegex.exec(content)) !== null) {
      const alt = (match[1] ?? '').trim();
      const src = (match[2] ?? '').trim();
      const position = match.index;

      if (src) {
        // Find keywords in alt text
        const altKeywords: string[] = [];
        if (keywords && alt) {
          for (const kw of keywords) {
            if (alt.toLowerCase().includes(kw.term.toLowerCase())) {
              altKeywords.push(kw.term);
            }
          }
        }

        altTexts.push({
          src,
          altText: alt,
          keywords: altKeywords,
          humanized: false,
          position,
          id: `alt-${index++}`,
        });
      }
    }

    // Sort by position
    altTexts.sort((a, b) => a.position - b.position);

    return altTexts;
  }

  /**
   * Performs full SEO analysis on document
   * @param document - Document to analyze
   * @param options - Analysis options
   * @returns SEO analysis result
   */
  analyzeDocument(document: SEODocument, options?: SEOPreservationOptions): SEOAnalysisResult {
    const keywords = options?.keywords 
      ? options.keywords.map(term => ({
          term,
          originalDensity: 0,
          targetDensity: 0,
          importance: (options.keywordImportance?.[term] ?? 'medium') as KeywordImportance,
          originalCount: 0,
          wordCount: term.split(/\s+/).length,
        }))
      : this.extractKeywords(document.content, options);

    const metaTags = this.preserveMetaTags(document);
    const headingStructure = this.maintainHeadingHierarchy(document, keywords);
    const linkMap = this.preserveLinkStructure(document);
    const altTexts = this.extractAltTexts(document, keywords);

    // Calculate SEO score
    const seoScore = this.calculateSEOScore(
      keywords,
      metaTags,
      headingStructure,
      linkMap,
      altTexts
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      keywords,
      metaTags,
      headingStructure,
      linkMap,
      altTexts
    );

    return {
      keywords,
      metaTags,
      headingStructure,
      linkMap,
      altTexts,
      seoScore,
      recommendations,
      timestamp: new Date(),
    };
  }

  /**
   * Validates SEO preservation after transformation
   * @param original - Original document
   * @param transformed - Transformed document
   * @param options - Preservation options
   * @returns SEO preservation result
   */
  validatePreservation(
    original: SEODocument,
    transformed: SEODocument,
    options?: SEOPreservationOptions
  ): SEOPreservationResult {
    const issues: string[] = [];

    // Extract keywords from original
    const keywords = options?.keywords
      ? options.keywords.map(term => ({
          term,
          originalDensity: 0,
          targetDensity: 0,
          importance: (options.keywordImportance?.[term] ?? 'medium') as KeywordImportance,
          originalCount: 0,
          wordCount: term.split(/\s+/).length,
        }))
      : this.extractKeywords(original.content, options);

    // Validate keyword density
    const densityReport = this.validateKeywordDensity(
      original.content,
      transformed.content,
      keywords
    );

    if (!densityReport.overallValid) {
      issues.push(
        `Keyword density deviation detected for: ${densityReport.keywordsNeedingAdjustment.join(', ')}`
      );
    }

    // Preserve meta tags
    const metaTags = this.preserveMetaTags(transformed);

    // Validate heading structure
    const headingStructure = this.maintainHeadingHierarchy(transformed, keywords);
    if (!headingStructure.hierarchyValid) {
      issues.push(...headingStructure.hierarchyErrors);
    }

    // Preserve link structure
    const linkMap = this.preserveLinkStructure(transformed);

    // Preserve alt texts
    const altTexts = this.extractAltTexts(transformed, keywords);

    const allPreserved = issues.length === 0 && densityReport.overallValid;

    return {
      densityReport,
      metaTags,
      headingStructure,
      linkMap,
      altTexts,
      allPreserved,
      issues,
      timestamp: new Date(),
    };
  }


  // ============ Private Helper Methods ============

  /**
   * Tokenizes text into words
   */
  private tokenize(text: string): string[] {
    // Remove HTML tags
    const cleanText = text.replace(/<[^>]*>/g, ' ');
    // Split on whitespace and punctuation
    return cleanText
      .split(/[\s\n\r\t]+/)
      .map(w => w.replace(/[^\w'-]/g, '').toLowerCase())
      .filter(w => w.length > 0);
  }

  /**
   * Counts keyword occurrences in word array
   */
  private countKeywordOccurrences(words: string[], keyword: string): number {
    const keywordParts = keyword.toLowerCase().split(/\s+/);
    
    if (keywordParts.length === 1) {
      // Single word keyword
      return words.filter(w => w === keywordParts[0]).length;
    }

    // Multi-word keyword (phrase)
    let count = 0;
    for (let i = 0; i <= words.length - keywordParts.length; i++) {
      let match = true;
      for (let j = 0; j < keywordParts.length; j++) {
        if (words[i + j] !== keywordParts[j]) {
          match = false;
          break;
        }
      }
      if (match) count++;
    }
    return count;
  }

  /**
   * Calculates keyword importance based on frequency
   */
  private calculateImportance(count: number, totalWords: number): KeywordImportance {
    const density = (count / totalWords) * 100;
    if (density >= 2) return 'high';
    if (density >= 1) return 'medium';
    return 'low';
  }

  /**
   * Parses a meta tag from attribute string
   */
  private parseMetaTag(attrs: string): MetaTag | null {
    const name = this.extractAttribute(attrs, 'name') || 
                 this.extractAttribute(attrs, 'property') ||
                 this.extractAttribute(attrs, 'http-equiv');
    const content = this.extractAttribute(attrs, 'content');

    if (!name || !content) return null;

    const type = this.getMetaTagType(name);

    return {
      type,
      name,
      content,
      humanized: false,
    };
  }

  /**
   * Categorizes a meta tag into the appropriate collection
   */
  private categorizeMetaTag(tag: MetaTag, metaTags: MetaTags): void {
    if (tag.name === 'description') {
      metaTags.description = tag;
    } else if (tag.name === 'keywords') {
      metaTags.keywords = tag;
    } else if (tag.name.startsWith('og:')) {
      metaTags.openGraph.push(tag);
    } else if (tag.name.startsWith('twitter:')) {
      metaTags.twitter.push(tag);
    } else {
      metaTags.other.push(tag);
    }
  }

  /**
   * Gets the meta tag type from name
   */
  private getMetaTagType(name: string): MetaTagType {
    const typeMap: Record<string, MetaTagType> = {
      'title': 'title',
      'description': 'description',
      'keywords': 'keywords',
      'author': 'author',
      'robots': 'robots',
      'og:title': 'og:title',
      'og:description': 'og:description',
      'og:image': 'og:image',
      'twitter:title': 'twitter:title',
      'twitter:description': 'twitter:description',
      'twitter:image': 'twitter:image',
      'canonical': 'canonical',
    };
    return typeMap[name] ?? 'custom';
  }

  /**
   * Extracts an attribute value from attribute string
   */
  private extractAttribute(attrs: string, name: string): string | null {
    const regex = new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i');
    const match = attrs.match(regex);
    return match?.[1] ?? null;
  }

  /**
   * Determines if a link is internal
   */
  private isInternalLink(href: string, baseUrl: string): boolean {
    if (!href) return false;
    
    // Relative links are internal
    if (href.startsWith('/') || href.startsWith('#') || href.startsWith('./') || href.startsWith('../')) {
      return true;
    }

    // Check if href starts with base URL
    if (baseUrl && href.startsWith(baseUrl)) {
      return true;
    }

    // Check for same domain
    try {
      const linkUrl = new URL(href);
      if (baseUrl) {
        const base = new URL(baseUrl);
        return linkUrl.hostname === base.hostname;
      }
    } catch {
      // Invalid URL, treat as internal
      return true;
    }

    return false;
  }

  /**
   * Calculates overall SEO score
   */
  private calculateSEOScore(
    keywords: Keyword[],
    metaTags: MetaTags,
    headingStructure: HeadingStructure,
    linkMap: LinkMap,
    altTexts: AltTextElement[]
  ): number {
    let score = 0;
    let maxScore = 0;

    // Keywords (20 points)
    maxScore += 20;
    if (keywords.length > 0) {
      score += Math.min(20, keywords.length * 2);
    }

    // Meta tags (25 points)
    maxScore += 25;
    if (metaTags.title) score += 10;
    if (metaTags.description) score += 10;
    if (metaTags.openGraph.length > 0) score += 5;

    // Heading structure (25 points)
    maxScore += 25;
    if (headingStructure.levelCounts[1] === 1) score += 10; // Single H1
    if (headingStructure.hierarchyValid) score += 10;
    if (headingStructure.preservedKeywords.length > 0) score += 5;

    // Links (15 points)
    maxScore += 15;
    if (linkMap.internalCount > 0) score += 10;
    if (linkMap.externalCount > 0) score += 5;

    // Alt texts (15 points)
    maxScore += 15;
    const imagesWithAlt = altTexts.filter(a => a.altText.length > 0).length;
    if (altTexts.length > 0) {
      score += Math.round((imagesWithAlt / altTexts.length) * 15);
    } else {
      score += 15; // No images, full score
    }

    return Math.round((score / maxScore) * 100);
  }

  /**
   * Generates SEO recommendations
   */
  private generateRecommendations(
    keywords: Keyword[],
    metaTags: MetaTags,
    headingStructure: HeadingStructure,
    linkMap: LinkMap,
    altTexts: AltTextElement[]
  ): string[] {
    const recommendations: string[] = [];

    // Keyword recommendations
    if (keywords.length === 0) {
      recommendations.push('Add target keywords to improve SEO');
    }

    // Meta tag recommendations
    if (!metaTags.title) {
      recommendations.push('Add a title tag');
    }
    if (!metaTags.description) {
      recommendations.push('Add a meta description');
    }
    if (metaTags.openGraph.length === 0) {
      recommendations.push('Add Open Graph tags for better social sharing');
    }

    // Heading recommendations
    if (headingStructure.levelCounts[1] === 0) {
      recommendations.push('Add an H1 heading');
    } else if (headingStructure.levelCounts[1] > 1) {
      recommendations.push('Use only one H1 heading per page');
    }
    if (!headingStructure.hierarchyValid) {
      recommendations.push('Fix heading hierarchy - avoid skipping levels');
    }

    // Link recommendations
    if (linkMap.internalCount === 0) {
      recommendations.push('Add internal links to improve site navigation');
    }

    // Alt text recommendations
    const missingAlt = altTexts.filter(a => !a.altText).length;
    if (missingAlt > 0) {
      recommendations.push(`Add alt text to ${missingAlt} image(s)`);
    }

    return recommendations;
  }
}

// Export singleton instance
export const seoService = new SEOService();
