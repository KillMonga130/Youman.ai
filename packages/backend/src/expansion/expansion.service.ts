/**
 * Expansion Service
 * Provides content expansion from outlines and bullet points with coherence maintenance
 * Requirements: 79
 */

import crypto from 'crypto';
import {
  ExpansionLevel,
  ExpansionStyle,
  OutlineItem,
  ParsedOutline,
  ExpandedSection,
  OutlineExpansionRequest,
  OutlineExpansionResult,
  BulletPointExpansionRequest,
  ExpandedBullet,
  BulletPointExpansionResult,
  CoherenceRequest,
  CoherenceResult,
  ExpansionConfig,
  LevelConfig,
} from './types';

/** Default configuration values */
const DEFAULT_EXPANSION_LEVEL: ExpansionLevel = 3;
const DEFAULT_STYLE: ExpansionStyle = 'formal';
const MIN_INPUT_LENGTH = 10;
const MAX_INPUT_LENGTH = 100000;
const DEFAULT_TARGET_WORDS_PER_SECTION = 100;
const DEFAULT_TIMEOUT = 60000;

/** Level configurations for expansion */
const LEVEL_CONFIGS: LevelConfig[] = [
  { level: 1, multiplier: 2, minSentences: 1, maxSentences: 2, description: 'Minimal expansion (2x)' },
  { level: 2, multiplier: 3, minSentences: 2, maxSentences: 4, description: 'Light expansion (3x)' },
  { level: 3, multiplier: 5, minSentences: 3, maxSentences: 6, description: 'Moderate expansion (5x)' },
  { level: 4, multiplier: 8, minSentences: 4, maxSentences: 8, description: 'Detailed expansion (8x)' },
  { level: 5, multiplier: 12, minSentences: 6, maxSentences: 12, description: 'Maximum expansion (12x)' },
];

/** Transition phrases for coherence */
const TRANSITION_PHRASES = {
  addition: ['Furthermore,', 'Additionally,', 'Moreover,', 'In addition,', 'Also,'],
  contrast: ['However,', 'On the other hand,', 'Nevertheless,', 'Conversely,', 'In contrast,'],
  sequence: ['First,', 'Next,', 'Then,', 'Subsequently,', 'Finally,'],
  conclusion: ['Therefore,', 'Thus,', 'Consequently,', 'As a result,', 'In conclusion,'],
  example: ['For example,', 'For instance,', 'To illustrate,', 'Specifically,', 'In particular,'],
  emphasis: ['Indeed,', 'In fact,', 'Notably,', 'Importantly,', 'Significantly,'],
};

/** Elaboration templates by style */
const ELABORATION_TEMPLATES: Record<ExpansionStyle, string[]> = {
  formal: [
    'This concept encompasses {topic}, which involves {elaboration}.',
    'The significance of {topic} lies in its ability to {elaboration}.',
    '{topic} represents a fundamental aspect that {elaboration}.',
    'Understanding {topic} requires consideration of {elaboration}.',
    'The implementation of {topic} necessitates {elaboration}.',
  ],
  casual: [
    'Basically, {topic} is all about {elaboration}.',
    'When we talk about {topic}, we mean {elaboration}.',
    '{topic} is pretty important because {elaboration}.',
    'Think of {topic} as {elaboration}.',
    'The cool thing about {topic} is that {elaboration}.',
  ],
  technical: [
    'The technical implementation of {topic} involves {elaboration}.',
    '{topic} is characterized by {elaboration}.',
    'From a technical perspective, {topic} requires {elaboration}.',
    'The architecture of {topic} consists of {elaboration}.',
    '{topic} operates through {elaboration}.',
  ],
  academic: [
    'Scholarly analysis of {topic} reveals that {elaboration}.',
    'Research indicates that {topic} is associated with {elaboration}.',
    'The theoretical framework of {topic} suggests {elaboration}.',
    'Academic discourse on {topic} emphasizes {elaboration}.',
    'Empirical evidence supports that {topic} involves {elaboration}.',
  ],
};

/** Example phrases by style */
const EXAMPLE_PHRASES: Record<ExpansionStyle, string[]> = {
  formal: [
    'A notable example of this is',
    'This can be observed in',
    'Consider the case of',
    'This is exemplified by',
  ],
  casual: [
    'Like when',
    'For example, think about',
    'You can see this in',
    'A good example is',
  ],
  technical: [
    'A practical implementation includes',
    'This is demonstrated in',
    'Technical examples include',
    'In practice, this manifests as',
  ],
  academic: [
    'Empirical examples include',
    'This phenomenon is observed in',
    'Case studies demonstrate',
    'Research examples include',
  ],
};

/**
 * Expansion Service class
 * Handles outline expansion, bullet point elaboration, and coherence maintenance
 */
export class ExpansionService {
  private config: ExpansionConfig;

  constructor(serviceConfig?: Partial<ExpansionConfig>) {
    this.config = this.buildConfig(serviceConfig);
  }

  /**
   * Builds the service configuration
   */
  private buildConfig(overrides?: Partial<ExpansionConfig>): ExpansionConfig {
    return {
      defaultExpansionLevel: overrides?.defaultExpansionLevel ?? DEFAULT_EXPANSION_LEVEL,
      defaultStyle: overrides?.defaultStyle ?? DEFAULT_STYLE,
      minInputLength: overrides?.minInputLength ?? MIN_INPUT_LENGTH,
      maxInputLength: overrides?.maxInputLength ?? MAX_INPUT_LENGTH,
      defaultTargetWordsPerSection: overrides?.defaultTargetWordsPerSection ?? DEFAULT_TARGET_WORDS_PER_SECTION,
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
   * Counts words in text
   */
  private countWords(text: string): number {
    return text
      .trim()
      .split(/\s+/)
      .filter(w => w.length > 0).length;
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
   * Parses outline text into structured format
   */
  private parseOutline(outlineText: string): ParsedOutline {
    const lines = outlineText.split('\n').filter(line => line.trim().length > 0);
    const items: OutlineItem[] = [];
    let title: string | undefined;
    let maxDepth = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const trimmed = line.trim();
      
      // Check for title (first line without bullet/number)
      if (i === 0 && !this.isListItem(trimmed)) {
        title = trimmed;
        continue;
      }

      const { text, level } = this.parseListItem(line);
      if (text) {
        items.push({ text, level, children: [] });
        maxDepth = Math.max(maxDepth, level);
      }
    }

    // Build hierarchy
    const rootItems = this.buildHierarchy(items);

    return {
      title,
      items: rootItems,
      totalItems: items.length,
      maxDepth,
    };
  }

  /**
   * Checks if a line is a list item
   */
  private isListItem(line: string): boolean {
    return /^[-*•]\s|^\d+[.)]\s|^[a-zA-Z][.)]\s|^#{1,6}\s/.test(line.trim());
  }

  /**
   * Parses a list item to extract text and level
   */
  private parseListItem(line: string): { text: string; level: number } {
    // Calculate indentation level
    const leadingSpaces = line.match(/^(\s*)/)?.[1]?.length || 0;
    const level = Math.floor(leadingSpaces / 2);

    // Remove bullet/number markers
    let text = line.trim()
      .replace(/^[-*•]\s+/, '')
      .replace(/^\d+[.)]\s+/, '')
      .replace(/^[a-zA-Z][.)]\s+/, '')
      .replace(/^#{1,6}\s+/, '')
      .trim();

    return { text, level };
  }

  /**
   * Builds hierarchy from flat list of items
   */
  private buildHierarchy(items: OutlineItem[]): OutlineItem[] {
    const root: OutlineItem[] = [];
    const stack: OutlineItem[] = [];

    for (const item of items) {
      while (stack.length > 0 && stack[stack.length - 1]!.level >= item.level) {
        stack.pop();
      }

      if (stack.length === 0) {
        root.push(item);
      } else {
        const parent = stack[stack.length - 1]!;
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(item);
      }

      stack.push(item);
    }

    return root;
  }

  /**
   * Expands an outline into full content
   * Requirement 79: Create outline expansion system
   */
  async expandOutline(request: OutlineExpansionRequest): Promise<OutlineExpansionResult> {
    const startTime = Date.now();
    const id = this.generateId('exp');

    const {
      outline,
      expansionLevel,
      style = this.config.defaultStyle,
      includeTransitions = true,
      preserveHeadings = true,
      targetWordsPerSection = this.config.defaultTargetWordsPerSection,
    } = request;

    const parsedOutline = this.parseOutline(outline);
    const levelConfig = LEVEL_CONFIGS.find(c => c.level === expansionLevel) || LEVEL_CONFIGS[2]!;
    
    const sections: ExpandedSection[] = [];
    let sectionIndex = 0;

    // Expand each item recursively
    const expandItem = (item: OutlineItem, depth: number): string => {
      const expandedContent = this.expandSingleItem(
        item.text,
        levelConfig,
        style,
        targetWordsPerSection
      );

      sections.push({
        originalText: item.text,
        expandedContent,
        wordCount: this.countWords(expandedContent),
        level: item.level,
        index: sectionIndex++,
      });

      let result = '';
      
      if (preserveHeadings) {
        const headingLevel = Math.min(depth + 1, 6);
        result += `${'#'.repeat(headingLevel)} ${item.text}\n\n`;
      }
      
      result += expandedContent + '\n\n';

      // Expand children
      if (item.children && item.children.length > 0) {
        for (let i = 0; i < item.children.length; i++) {
          if (includeTransitions && i > 0) {
            result += this.getTransition('sequence', i) + ' ';
          }
          result += expandItem(item.children[i]!, depth + 1);
        }
      }

      return result;
    };

    // Build expanded content
    let expandedContent = '';
    
    if (parsedOutline.title) {
      expandedContent += `# ${parsedOutline.title}\n\n`;
    }

    for (let i = 0; i < parsedOutline.items.length; i++) {
      if (includeTransitions && i > 0) {
        expandedContent += this.getTransition('addition', i) + ' ';
      }
      expandedContent += expandItem(parsedOutline.items[i]!, 1);
    }

    const originalWordCount = this.countWords(outline);
    const expandedWordCount = this.countWords(expandedContent);

    return {
      id,
      originalOutline: outline,
      parsedOutline,
      expandedContent: expandedContent.trim(),
      sections,
      expansionLevel,
      style,
      originalWordCount,
      expandedWordCount,
      expansionRatio: expandedWordCount / Math.max(originalWordCount, 1),
      timestamp: new Date(),
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Expands a single outline item
   */
  private expandSingleItem(
    text: string,
    levelConfig: LevelConfig,
    style: ExpansionStyle,
    targetWords: number
  ): string {
    const templates = ELABORATION_TEMPLATES[style];
    const targetSentences = Math.min(
      levelConfig.maxSentences,
      Math.max(levelConfig.minSentences, Math.ceil(targetWords / 15))
    );

    const sentences: string[] = [];
    
    // Opening sentence
    sentences.push(this.createOpeningSentence(text, style));

    // Elaboration sentences
    for (let i = 1; i < targetSentences; i++) {
      const template = templates[i % templates.length]!;
      const elaboration = this.generateElaboration(text, i, style);
      const sentence = template
        .replace('{topic}', this.extractTopic(text))
        .replace('{elaboration}', elaboration);
      sentences.push(sentence);
    }

    return sentences.join(' ');
  }

  /**
   * Creates an opening sentence for a topic
   */
  private createOpeningSentence(text: string, style: ExpansionStyle): string {
    const topic = this.extractTopic(text);
    
    switch (style) {
      case 'casual':
        return `Let's talk about ${text.toLowerCase()}.`;
      case 'technical':
        return `${text} is a critical component that requires detailed examination.`;
      case 'academic':
        return `The concept of ${topic} warrants thorough scholarly analysis.`;
      default:
        return `${text} represents an important consideration in this context.`;
    }
  }

  /**
   * Extracts the main topic from text
   */
  private extractTopic(text: string): string {
    // Remove common prefixes and get core topic
    return text
      .replace(/^(the|a|an)\s+/i, '')
      .replace(/^(introduction to|overview of|understanding)\s+/i, '')
      .toLowerCase();
  }

  /**
   * Generates elaboration content
   */
  private generateElaboration(text: string, index: number, style: ExpansionStyle): string {
    const elaborations: Record<ExpansionStyle, string[]> = {
      formal: [
        'careful consideration of multiple factors',
        'systematic analysis and evaluation',
        'comprehensive understanding of the underlying principles',
        'strategic implementation approaches',
        'thorough examination of relevant aspects',
      ],
      casual: [
        'looking at things from different angles',
        'understanding how everything connects',
        'figuring out what works best',
        'exploring various possibilities',
        'getting a better grasp of the basics',
      ],
      technical: [
        'implementation of specific algorithms and data structures',
        'optimization of performance metrics',
        'integration with existing system components',
        'adherence to established technical standards',
        'consideration of scalability requirements',
      ],
      academic: [
        'examination of theoretical frameworks',
        'analysis of empirical evidence',
        'consideration of methodological approaches',
        'synthesis of existing literature',
        'evaluation of research findings',
      ],
    };

    const options = elaborations[style];
    return options[index % options.length]!;
  }

  /**
   * Gets a transition phrase
   */
  private getTransition(type: keyof typeof TRANSITION_PHRASES, index: number): string {
    const phrases = TRANSITION_PHRASES[type];
    return phrases[index % phrases.length]!;
  }

  /**
   * Expands bullet points into detailed content
   * Requirement 79: Build bullet point elaboration
   */
  async expandBulletPoints(request: BulletPointExpansionRequest): Promise<BulletPointExpansionResult> {
    const startTime = Date.now();
    const id = this.generateId('blt');

    const {
      bullets,
      detailLevel,
      style = this.config.defaultStyle,
      includeExamples = false,
      includeExplanations = true,
      targetWordsPerBullet = 50,
    } = request;

    const levelConfig = LEVEL_CONFIGS.find(c => c.level === detailLevel) || LEVEL_CONFIGS[2]!;
    const expandedBullets: ExpandedBullet[] = [];

    for (let i = 0; i < bullets.length; i++) {
      const bullet = bullets[i]!;
      const expanded = this.expandBullet(
        bullet,
        levelConfig,
        style,
        targetWordsPerBullet,
        includeExamples,
        includeExplanations
      );

      expandedBullets.push({
        originalBullet: bullet,
        expandedContent: expanded.content,
        wordCount: this.countWords(expanded.content),
        index: i,
        examples: expanded.examples,
      });
    }

    // Combine with transitions
    const combinedContent = expandedBullets
      .map((eb, i) => {
        let content = eb.expandedContent;
        if (i > 0) {
          content = this.getTransition('addition', i) + ' ' + content.charAt(0).toLowerCase() + content.slice(1);
        }
        return content;
      })
      .join('\n\n');

    const originalWordCount = bullets.reduce((sum, b) => sum + this.countWords(b), 0);
    const expandedWordCount = this.countWords(combinedContent);

    return {
      id,
      originalBullets: bullets,
      expandedBullets,
      combinedContent,
      detailLevel,
      style,
      originalWordCount,
      expandedWordCount,
      expansionRatio: expandedWordCount / Math.max(originalWordCount, 1),
      timestamp: new Date(),
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Expands a single bullet point
   */
  private expandBullet(
    bullet: string,
    levelConfig: LevelConfig,
    style: ExpansionStyle,
    targetWords: number,
    includeExamples: boolean,
    includeExplanations: boolean
  ): { content: string; examples?: string[] } {
    const sentences: string[] = [];
    const examples: string[] = [];

    // Main expansion
    sentences.push(this.createOpeningSentence(bullet, style));

    if (includeExplanations) {
      const explanation = this.generateExplanation(bullet, style);
      sentences.push(explanation);
    }

    // Add more sentences based on level
    const additionalSentences = Math.max(0, levelConfig.minSentences - sentences.length);
    for (let i = 0; i < additionalSentences; i++) {
      const elaboration = this.generateElaboration(bullet, i, style);
      sentences.push(`This involves ${elaboration}.`);
    }

    // Add examples if requested
    if (includeExamples) {
      const examplePhrase = EXAMPLE_PHRASES[style][0]!;
      const example = this.generateExample(bullet, style);
      sentences.push(`${examplePhrase} ${example}.`);
      examples.push(example);
    }

    return {
      content: sentences.join(' '),
      examples: examples.length > 0 ? examples : undefined,
    };
  }

  /**
   * Generates an explanation for a bullet point
   */
  private generateExplanation(bullet: string, style: ExpansionStyle): string {
    const topic = this.extractTopic(bullet);
    
    switch (style) {
      case 'casual':
        return `This basically means that ${topic} helps us understand and work with the subject more effectively.`;
      case 'technical':
        return `The technical implementation of ${topic} requires specific methodologies and best practices.`;
      case 'academic':
        return `Scholarly examination of ${topic} reveals significant implications for the broader field of study.`;
      default:
        return `Understanding ${topic} is essential for achieving the desired outcomes in this context.`;
    }
  }

  /**
   * Generates an example for a bullet point
   */
  private generateExample(bullet: string, style: ExpansionStyle): string {
    const topic = this.extractTopic(bullet);
    
    switch (style) {
      case 'casual':
        return `how ${topic} works in everyday situations`;
      case 'technical':
        return `the implementation of ${topic} in production systems`;
      case 'academic':
        return `empirical studies examining ${topic} in controlled settings`;
      default:
        return `practical applications of ${topic} in professional contexts`;
    }
  }

  /**
   * Maintains coherence across expanded sections
   * Requirement 79: Implement coherence maintenance
   */
  async maintainCoherence(request: CoherenceRequest): Promise<CoherenceResult> {
    const startTime = Date.now();
    const id = this.generateId('coh');

    const {
      expandedSections,
      addTransitions = true,
      ensureConsistentTone = true,
      targetStyle = this.config.defaultStyle,
    } = request;

    let transitionsAdded = 0;
    let toneAdjustments = 0;
    const processedSections: string[] = [];

    for (let i = 0; i < expandedSections.length; i++) {
      let section = expandedSections[i]!;

      // Ensure consistent tone
      if (ensureConsistentTone) {
        const { text, adjustments } = this.adjustTone(section, targetStyle);
        section = text;
        toneAdjustments += adjustments;
      }

      // Add transitions
      if (addTransitions && i > 0) {
        const transitionType = this.determineTransitionType(
          expandedSections[i - 1]!,
          section
        );
        const transition = this.getTransition(transitionType, i);
        section = `${transition} ${section.charAt(0).toLowerCase()}${section.slice(1)}`;
        transitionsAdded++;
      }

      processedSections.push(section);
    }

    const coherentContent = processedSections.join('\n\n');

    return {
      id,
      originalSections: expandedSections,
      coherentContent,
      transitionsAdded,
      toneAdjustments,
      wordCount: this.countWords(coherentContent),
      timestamp: new Date(),
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Adjusts tone of text to match target style
   */
  private adjustTone(text: string, targetStyle: ExpansionStyle): { text: string; adjustments: number } {
    let result = text;
    let adjustments = 0;

    if (targetStyle === 'formal') {
      // Remove casual language
      const casualReplacements: [RegExp, string][] = [
        [/\bbasically\b/gi, 'fundamentally'],
        [/\bkinda\b/gi, 'somewhat'],
        [/\bgonna\b/gi, 'going to'],
        [/\bwanna\b/gi, 'want to'],
        [/\bgotta\b/gi, 'have to'],
        [/\bcool\b/gi, 'notable'],
        [/\bawesome\b/gi, 'excellent'],
      ];

      for (const [pattern, replacement] of casualReplacements) {
        if (pattern.test(result)) {
          result = result.replace(pattern, replacement);
          adjustments++;
        }
      }
    } else if (targetStyle === 'casual') {
      // Make formal language more casual
      const formalReplacements: [RegExp, string][] = [
        [/\bfurthermore\b/gi, 'also'],
        [/\bnevertheless\b/gi, 'still'],
        [/\bconsequently\b/gi, 'so'],
        [/\btherefore\b/gi, 'so'],
        [/\bhowever\b/gi, 'but'],
      ];

      for (const [pattern, replacement] of formalReplacements) {
        if (pattern.test(result)) {
          result = result.replace(pattern, replacement);
          adjustments++;
        }
      }
    }

    return { text: result, adjustments };
  }

  /**
   * Determines the appropriate transition type between sections
   */
  private determineTransitionType(
    previousSection: string,
    currentSection: string
  ): keyof typeof TRANSITION_PHRASES {
    const prevLower = previousSection.toLowerCase();
    const currLower = currentSection.toLowerCase();

    // Check for contrast indicators
    if (currLower.includes('however') || currLower.includes('but') || currLower.includes('although')) {
      return 'contrast';
    }

    // Check for conclusion indicators
    if (currLower.includes('conclusion') || currLower.includes('summary') || currLower.includes('finally')) {
      return 'conclusion';
    }

    // Check for example indicators
    if (currLower.includes('example') || currLower.includes('instance') || currLower.includes('such as')) {
      return 'example';
    }

    // Default to addition
    return 'addition';
  }

  /**
   * Gets available expansion levels
   */
  getAvailableLevels(): LevelConfig[] {
    return LEVEL_CONFIGS;
  }

  /**
   * Gets available styles
   */
  getAvailableStyles(): ExpansionStyle[] {
    return ['formal', 'casual', 'technical', 'academic'];
  }

  /**
   * Validates outline text
   */
  validateOutline(outline: string): { valid: boolean; error?: string } {
    if (!outline || typeof outline !== 'string') {
      return { valid: false, error: 'Outline is required and must be a string' };
    }

    const trimmed = outline.trim();
    if (trimmed.length === 0) {
      return { valid: false, error: 'Outline cannot be empty' };
    }

    if (trimmed.length < this.config.minInputLength) {
      return { valid: false, error: `Outline must be at least ${this.config.minInputLength} characters` };
    }

    if (trimmed.length > this.config.maxInputLength) {
      return { valid: false, error: `Outline cannot exceed ${this.config.maxInputLength} characters` };
    }

    return { valid: true };
  }

  /**
   * Validates bullet points
   */
  validateBullets(bullets: string[]): { valid: boolean; error?: string } {
    if (!bullets || !Array.isArray(bullets)) {
      return { valid: false, error: 'Bullets must be an array' };
    }

    if (bullets.length === 0) {
      return { valid: false, error: 'At least one bullet point is required' };
    }

    if (bullets.length > 100) {
      return { valid: false, error: 'Cannot process more than 100 bullet points' };
    }

    for (let i = 0; i < bullets.length; i++) {
      if (!bullets[i] || typeof bullets[i] !== 'string' || bullets[i]!.trim().length === 0) {
        return { valid: false, error: `Bullet point at index ${i} is invalid` };
      }
    }

    return { valid: true };
  }

  /**
   * Validates expansion level
   */
  validateLevel(level: number): { valid: boolean; error?: string } {
    if (typeof level !== 'number' || level < 1 || level > 5 || !Number.isInteger(level)) {
      return { valid: false, error: 'Expansion level must be an integer between 1 and 5' };
    }
    return { valid: true };
  }
}

/** Singleton instance */
export const expansionService = new ExpansionService();
