/**
 * Content Simplification Service
 * Provides jargon replacement, sentence simplification, inline definitions,
 * and reading level targeting functionality
 * Requirements: 106
 */

import crypto from 'crypto';
import {
  ReadingLevel,
  SimplificationStrategy,
  JargonTerm,
  JargonReplacement,
  SentenceSimplification,
  InlineDefinition,
  ReadingLevelAnalysis,
  SimplificationRequest,
  SimplificationResult,
  SimplificationImprovement,
  JargonDetectionResult,
  DetectedJargon,
  SimplificationConfig,
  ReadingLevelRange,
} from './types';

/** Default configuration values */
const DEFAULT_TARGET_LEVEL: ReadingLevel = 'middle-school';
const DEFAULT_INTENSITY = 0.7;
const DEFAULT_DEFINITION_FORMAT: 'parenthetical' | 'appositive' | 'footnote' = 'parenthetical';
const MIN_TEXT_LENGTH = 10;
const MAX_TEXT_LENGTH = 100000;
const DEFAULT_TIMEOUT = 30000;

/** Reading level grade ranges */
const READING_LEVEL_RANGES: ReadingLevelRange[] = [
  { level: 'elementary', minGrade: 1, maxGrade: 5, targetFleschEase: 90, description: 'Easy to read for ages 6-11' },
  { level: 'middle-school', minGrade: 6, maxGrade: 8, targetFleschEase: 70, description: 'Suitable for ages 11-14' },
  { level: 'high-school', minGrade: 9, maxGrade: 12, targetFleschEase: 50, description: 'Suitable for ages 14-18' },
  { level: 'college', minGrade: 13, maxGrade: 16, targetFleschEase: 30, description: 'Undergraduate level' },
  { level: 'professional', minGrade: 17, maxGrade: 20, targetFleschEase: 10, description: 'Graduate/professional level' },
];


/** Jargon database organized by category */
const JARGON_DATABASE: JargonTerm[] = [
  // Technical/IT jargon
  { term: 'algorithm', simpleReplacement: 'step-by-step process', definition: 'A set of rules or steps used to solve a problem', category: 'technical', complexityLevel: 3 },
  { term: 'bandwidth', simpleReplacement: 'data capacity', definition: 'The amount of data that can be transmitted in a fixed time', category: 'technical', complexityLevel: 3 },
  { term: 'cache', simpleReplacement: 'temporary storage', definition: 'A place to store data temporarily for quick access', category: 'technical', complexityLevel: 3 },
  { term: 'deprecated', simpleReplacement: 'outdated', definition: 'No longer recommended for use', category: 'technical', complexityLevel: 4 },
  { term: 'encryption', simpleReplacement: 'data scrambling', definition: 'Converting data into a secret code', category: 'technical', complexityLevel: 3 },
  { term: 'infrastructure', simpleReplacement: 'basic systems', definition: 'The underlying foundation or framework', category: 'technical', complexityLevel: 3 },
  { term: 'latency', simpleReplacement: 'delay', definition: 'The time delay in a system', category: 'technical', complexityLevel: 4 },
  { term: 'scalability', simpleReplacement: 'growth ability', definition: 'The ability to handle increased demand', category: 'technical', complexityLevel: 4 },
  
  // Business jargon
  { term: 'synergy', simpleReplacement: 'combined effort', definition: 'The interaction of elements that produces a combined effect greater than the sum of their separate effects', category: 'business', complexityLevel: 3 },
  { term: 'leverage', simpleReplacement: 'use', definition: 'To use something to maximum advantage', category: 'business', complexityLevel: 2 },
  { term: 'paradigm', simpleReplacement: 'model', definition: 'A typical example or pattern', category: 'business', complexityLevel: 4 },
  { term: 'stakeholder', simpleReplacement: 'interested party', definition: 'A person with an interest in something', category: 'business', complexityLevel: 3 },
  { term: 'deliverable', simpleReplacement: 'result', definition: 'Something that must be provided', category: 'business', complexityLevel: 3 },
  { term: 'bandwidth', simpleReplacement: 'capacity', definition: 'Available time or resources', category: 'business', complexityLevel: 2 },
  { term: 'actionable', simpleReplacement: 'usable', definition: 'Able to be acted upon', category: 'business', complexityLevel: 2 },
  { term: 'optimize', simpleReplacement: 'improve', definition: 'To make the best use of', category: 'business', complexityLevel: 2 },
  { term: 'streamline', simpleReplacement: 'simplify', definition: 'To make more efficient', category: 'business', complexityLevel: 2 },
  { term: 'incentivize', simpleReplacement: 'encourage', definition: 'To motivate with rewards', category: 'business', complexityLevel: 3 },
  
  // Academic jargon
  { term: 'methodology', simpleReplacement: 'method', definition: 'A system of methods used in a particular area', category: 'academic', complexityLevel: 3 },
  { term: 'hypothesis', simpleReplacement: 'educated guess', definition: 'A proposed explanation for something', category: 'academic', complexityLevel: 3 },
  { term: 'empirical', simpleReplacement: 'based on observation', definition: 'Based on experience or observation', category: 'academic', complexityLevel: 4 },
  { term: 'qualitative', simpleReplacement: 'descriptive', definition: 'Relating to quality rather than quantity', category: 'academic', complexityLevel: 3 },
  { term: 'quantitative', simpleReplacement: 'numerical', definition: 'Relating to quantity or numbers', category: 'academic', complexityLevel: 3 },
  { term: 'paradigm shift', simpleReplacement: 'major change', definition: 'A fundamental change in approach', category: 'academic', complexityLevel: 4 },
  { term: 'dichotomy', simpleReplacement: 'division into two', definition: 'A division into two contrasting things', category: 'academic', complexityLevel: 4 },
  { term: 'juxtaposition', simpleReplacement: 'side-by-side comparison', definition: 'Placing things close together for comparison', category: 'academic', complexityLevel: 4 },
  
  // Medical jargon
  { term: 'prognosis', simpleReplacement: 'expected outcome', definition: 'The likely course of a medical condition', category: 'medical', complexityLevel: 3 },
  { term: 'chronic', simpleReplacement: 'long-lasting', definition: 'Persisting for a long time', category: 'medical', complexityLevel: 2 },
  { term: 'acute', simpleReplacement: 'sudden and severe', definition: 'Having a rapid onset and short course', category: 'medical', complexityLevel: 2 },
  { term: 'benign', simpleReplacement: 'harmless', definition: 'Not harmful or cancerous', category: 'medical', complexityLevel: 2 },
  { term: 'malignant', simpleReplacement: 'harmful', definition: 'Harmful or cancerous', category: 'medical', complexityLevel: 3 },
  { term: 'asymptomatic', simpleReplacement: 'without symptoms', definition: 'Showing no symptoms', category: 'medical', complexityLevel: 3 },
  
  // Legal jargon
  { term: 'jurisdiction', simpleReplacement: 'authority area', definition: 'The official power to make legal decisions', category: 'legal', complexityLevel: 3 },
  { term: 'litigation', simpleReplacement: 'lawsuit', definition: 'The process of taking legal action', category: 'legal', complexityLevel: 3 },
  { term: 'precedent', simpleReplacement: 'earlier example', definition: 'An earlier event used as a guide', category: 'legal', complexityLevel: 3 },
  { term: 'indemnify', simpleReplacement: 'protect from loss', definition: 'To compensate for harm or loss', category: 'legal', complexityLevel: 4 },
  { term: 'pursuant to', simpleReplacement: 'according to', definition: 'In accordance with', category: 'legal', complexityLevel: 3 },
];


/** Complex words that can be simplified */
const COMPLEX_WORD_REPLACEMENTS: Record<string, string> = {
  'utilize': 'use',
  'implement': 'do',
  'facilitate': 'help',
  'commence': 'start',
  'terminate': 'end',
  'endeavor': 'try',
  'ascertain': 'find out',
  'subsequent': 'later',
  'prior to': 'before',
  'in order to': 'to',
  'due to the fact that': 'because',
  'at this point in time': 'now',
  'in the event that': 'if',
  'with regard to': 'about',
  'in spite of the fact that': 'although',
  'for the purpose of': 'to',
  'in close proximity to': 'near',
  'a large number of': 'many',
  'the majority of': 'most',
  'in excess of': 'more than',
  'sufficient': 'enough',
  'approximately': 'about',
  'demonstrate': 'show',
  'indicate': 'show',
  'necessitate': 'need',
  'obtain': 'get',
  'purchase': 'buy',
  'regarding': 'about',
  'concerning': 'about',
  'consequently': 'so',
  'therefore': 'so',
  'nevertheless': 'but',
  'however': 'but',
  'furthermore': 'also',
  'additionally': 'also',
  'moreover': 'also',
  'notwithstanding': 'despite',
  'aforementioned': 'mentioned',
  'heretofore': 'until now',
  'henceforth': 'from now on',
  'whereby': 'by which',
  'wherein': 'in which',
  'thereof': 'of that',
  'therein': 'in that',
};

/**
 * Content Simplification Service class
 * Handles jargon replacement, sentence simplification, inline definitions,
 * and reading level targeting
 */
export class SimplificationService {
  private config: SimplificationConfig;

  constructor(serviceConfig?: Partial<SimplificationConfig>) {
    this.config = this.buildConfig(serviceConfig);
  }

  /**
   * Builds the service configuration
   */
  private buildConfig(overrides?: Partial<SimplificationConfig>): SimplificationConfig {
    return {
      defaultTargetLevel: overrides?.defaultTargetLevel ?? DEFAULT_TARGET_LEVEL,
      defaultIntensity: overrides?.defaultIntensity ?? DEFAULT_INTENSITY,
      defaultDefinitionFormat: overrides?.defaultDefinitionFormat ?? DEFAULT_DEFINITION_FORMAT,
      minTextLength: overrides?.minTextLength ?? MIN_TEXT_LENGTH,
      maxTextLength: overrides?.maxTextLength ?? MAX_TEXT_LENGTH,
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
   * Counts syllables in a word
   */
  private countSyllables(word: string): number {
    word = word.toLowerCase().trim();
    if (word.length <= 3) return 1;
    
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
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
   * Analyzes the reading level of text
   * @param text - Text to analyze
   * @returns Reading level analysis
   */
  analyzeReadingLevel(text: string): ReadingLevelAnalysis {
    const sentences = this.splitIntoSentences(text);
    const words = this.splitIntoWords(text);
    
    const sentenceCount = sentences.length || 1;
    const wordCount = words.length || 1;
    
    let totalSyllables = 0;
    let complexWordCount = 0;
    
    for (const word of words) {
      const syllables = this.countSyllables(word);
      totalSyllables += syllables;
      if (syllables >= 3) {
        complexWordCount++;
      }
    }
    
    const averageSentenceLength = wordCount / sentenceCount;
    const averageSyllablesPerWord = totalSyllables / wordCount;
    const complexWordPercentage = (complexWordCount / wordCount) * 100;
    
    // Flesch-Kincaid Grade Level
    const fleschKincaidGrade = 0.39 * averageSentenceLength + 11.8 * averageSyllablesPerWord - 15.59;
    
    // Flesch Reading Ease (0-100, higher is easier)
    const fleschReadingEase = 206.835 - 1.015 * averageSentenceLength - 84.6 * averageSyllablesPerWord;
    
    // Gunning Fog Index
    const gunningFogIndex = 0.4 * (averageSentenceLength + complexWordPercentage);
    
    // Determine reading level from grade
    const currentLevel = this.gradeToReadingLevel(fleschKincaidGrade);
    
    return {
      currentLevel,
      fleschKincaidGrade: Math.max(0, Math.round(fleschKincaidGrade * 10) / 10),
      fleschReadingEase: Math.max(0, Math.min(100, Math.round(fleschReadingEase * 10) / 10)),
      gunningFogIndex: Math.max(0, Math.round(gunningFogIndex * 10) / 10),
      averageSentenceLength: Math.round(averageSentenceLength * 10) / 10,
      averageSyllablesPerWord: Math.round(averageSyllablesPerWord * 100) / 100,
      complexWordPercentage: Math.round(complexWordPercentage * 10) / 10,
      wordCount,
      sentenceCount,
    };
  }

  /**
   * Converts grade level to reading level
   */
  private gradeToReadingLevel(grade: number): ReadingLevel {
    if (grade <= 5) return 'elementary';
    if (grade <= 8) return 'middle-school';
    if (grade <= 12) return 'high-school';
    if (grade <= 16) return 'college';
    return 'professional';
  }

  /**
   * Gets target grade range for a reading level
   */
  private getTargetGradeRange(level: ReadingLevel): ReadingLevelRange {
    return READING_LEVEL_RANGES.find(r => r.level === level) || READING_LEVEL_RANGES[1]!;
  }

  /**
   * Detects jargon in text
   * @param text - Text to analyze
   * @returns Jargon detection result
   */
  async detectJargon(text: string): Promise<JargonDetectionResult> {
    const startTime = Date.now();
    const id = this.generateId('jargon');
    const detectedTerms: DetectedJargon[] = [];
    const lowerText = text.toLowerCase();
    const words = this.splitIntoWords(text);
    const wordCount = words.length;
    
    for (const jargon of JARGON_DATABASE) {
      const pattern = new RegExp(`\\b${this.escapeRegex(jargon.term)}\\b`, 'gi');
      let match;
      
      while ((match = pattern.exec(text)) !== null) {
        detectedTerms.push({
          term: match[0],
          position: match.index,
          endPosition: match.index + match[0].length,
          category: jargon.category,
          complexityLevel: jargon.complexityLevel,
          suggestedReplacement: jargon.simpleReplacement,
          definition: jargon.definition,
          confidence: 0.9,
        });
      }
    }
    
    // Also detect complex words
    for (const [complex, simple] of Object.entries(COMPLEX_WORD_REPLACEMENTS)) {
      const pattern = new RegExp(`\\b${this.escapeRegex(complex)}\\b`, 'gi');
      let match;
      
      while ((match = pattern.exec(text)) !== null) {
        // Avoid duplicates
        if (!detectedTerms.some(t => t.position === match!.index)) {
          detectedTerms.push({
            term: match[0],
            position: match.index,
            endPosition: match.index + match[0].length,
            category: 'complex-word',
            complexityLevel: 2,
            suggestedReplacement: simple,
            definition: `A more complex way to say "${simple}"`,
            confidence: 0.85,
          });
        }
      }
    }
    
    // Sort by position
    detectedTerms.sort((a, b) => a.position - b.position);
    
    // Get unique categories
    const categories = [...new Set(detectedTerms.map(t => t.category))];
    
    return {
      id,
      text,
      detectedTerms,
      totalJargon: detectedTerms.length,
      jargonDensity: wordCount > 0 ? (detectedTerms.length / wordCount) * 100 : 0,
      categories,
      timestamp: new Date(),
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Escapes special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }


  /**
   * Simplifies text to target reading level
   * Requirement 106: Build content simplification
   * @param request - Simplification request
   * @returns Simplification result
   */
  async simplify(request: SimplificationRequest): Promise<SimplificationResult> {
    const startTime = Date.now();
    const id = this.generateId('simp');
    
    const {
      text,
      targetLevel,
      strategies = ['comprehensive'],
      addDefinitions = false,
      definitionFormat = this.config.defaultDefinitionFormat,
      intensity = this.config.defaultIntensity,
      preserveTerms = [],
      customReplacements = {},
    } = request;
    
    // Analyze original text
    const originalAnalysis = this.analyzeReadingLevel(text);
    
    let simplifiedText = text;
    const jargonReplacements: JargonReplacement[] = [];
    const sentenceSimplifications: SentenceSimplification[] = [];
    const inlineDefinitions: InlineDefinition[] = [];
    
    // Apply strategies based on request
    const applyAll = strategies.includes('comprehensive');
    
    // Step 1: Replace jargon
    if (applyAll || strategies.includes('jargon-replacement')) {
      simplifiedText = this.replaceJargon(
        simplifiedText,
        targetLevel,
        intensity,
        preserveTerms,
        customReplacements,
        jargonReplacements
      );
    }
    
    // Step 2: Simplify sentences
    if (applyAll || strategies.includes('sentence-simplification')) {
      simplifiedText = this.simplifySentences(
        simplifiedText,
        targetLevel,
        intensity,
        sentenceSimplifications
      );
    }
    
    // Step 3: Add inline definitions
    if (addDefinitions || strategies.includes('inline-definitions')) {
      simplifiedText = this.addInlineDefinitions(
        simplifiedText,
        targetLevel,
        definitionFormat,
        preserveTerms,
        inlineDefinitions
      );
    }
    
    // Analyze simplified text
    const newAnalysis = this.analyzeReadingLevel(simplifiedText);
    
    // Calculate improvement metrics
    const improvement = this.calculateImprovement(
      originalAnalysis,
      newAnalysis,
      targetLevel,
      jargonReplacements,
      sentenceSimplifications,
      inlineDefinitions,
      text,
      simplifiedText
    );
    
    return {
      id,
      originalText: text,
      simplifiedText,
      targetLevel,
      originalAnalysis,
      newAnalysis,
      jargonReplacements,
      sentenceSimplifications,
      inlineDefinitions,
      totalChanges: jargonReplacements.length + sentenceSimplifications.length + inlineDefinitions.length,
      improvement,
      timestamp: new Date(),
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Replaces jargon with simpler alternatives
   * Requirement 106: Implement jargon replacement
   */
  private replaceJargon(
    text: string,
    targetLevel: ReadingLevel,
    intensity: number,
    preserveTerms: string[],
    customReplacements: Record<string, string>,
    replacements: JargonReplacement[]
  ): string {
    let result = text;
    const targetRange = this.getTargetGradeRange(targetLevel);
    const preserveLower = preserveTerms.map(t => t.toLowerCase());
    
    // Apply custom replacements first
    for (const [term, replacement] of Object.entries(customReplacements)) {
      if (preserveLower.includes(term.toLowerCase())) continue;
      
      const pattern = new RegExp(`\\b${this.escapeRegex(term)}\\b`, 'gi');
      let match;
      let offset = 0;
      
      while ((match = pattern.exec(text)) !== null) {
        const position = match.index + offset;
        const original = match[0];
        const preserveCase = this.preserveCase(original, replacement);
        
        replacements.push({
          original,
          replacement: preserveCase,
          position,
          endPosition: position + original.length,
          definition: 'Custom replacement',
          category: 'custom',
        });
        
        result = result.substring(0, position) + preserveCase + result.substring(position + original.length);
        offset += preserveCase.length - original.length;
      }
    }
    
    // Apply jargon database replacements
    for (const jargon of JARGON_DATABASE) {
      if (preserveLower.includes(jargon.term.toLowerCase())) continue;
      
      // Only replace if complexity is above target level threshold
      const complexityThreshold = this.getComplexityThreshold(targetLevel);
      if (jargon.complexityLevel < complexityThreshold && intensity < 0.8) continue;
      
      const pattern = new RegExp(`\\b${this.escapeRegex(jargon.term)}\\b`, 'gi');
      let match;
      let offset = 0;
      const originalResult = result;
      
      while ((match = pattern.exec(originalResult)) !== null) {
        const position = match.index + offset;
        const original = match[0];
        const preserveCase = this.preserveCase(original, jargon.simpleReplacement);
        
        replacements.push({
          original,
          replacement: preserveCase,
          position,
          endPosition: position + original.length,
          definition: jargon.definition,
          category: jargon.category,
        });
        
        result = result.substring(0, position) + preserveCase + result.substring(position + original.length);
        offset += preserveCase.length - original.length;
      }
    }
    
    // Apply complex word replacements
    for (const [complex, simple] of Object.entries(COMPLEX_WORD_REPLACEMENTS)) {
      if (preserveLower.includes(complex.toLowerCase())) continue;
      
      const pattern = new RegExp(`\\b${this.escapeRegex(complex)}\\b`, 'gi');
      let match;
      let offset = 0;
      const originalResult = result;
      
      while ((match = pattern.exec(originalResult)) !== null) {
        const position = match.index + offset;
        const original = match[0];
        const preserveCase = this.preserveCase(original, simple);
        
        // Avoid duplicate replacements
        if (!replacements.some(r => r.position === position)) {
          replacements.push({
            original,
            replacement: preserveCase,
            position,
            endPosition: position + original.length,
            definition: `Simpler form of "${complex}"`,
            category: 'complex-word',
          });
          
          result = result.substring(0, position) + preserveCase + result.substring(position + original.length);
          offset += preserveCase.length - original.length;
        }
      }
    }
    
    return result;
  }


  /**
   * Gets complexity threshold for target level
   */
  private getComplexityThreshold(level: ReadingLevel): number {
    switch (level) {
      case 'elementary': return 1;
      case 'middle-school': return 2;
      case 'high-school': return 3;
      case 'college': return 4;
      case 'professional': return 5;
      default: return 2;
    }
  }

  /**
   * Preserves the case pattern of the original word
   */
  private preserveCase(original: string, replacement: string): string {
    if (!original || !replacement) return replacement;
    
    // All uppercase
    if (original === original.toUpperCase()) {
      return replacement.toUpperCase();
    }
    
    // Title case (first letter uppercase)
    if (original[0] === original[0]?.toUpperCase() && original.slice(1) === original.slice(1).toLowerCase()) {
      return replacement.charAt(0).toUpperCase() + replacement.slice(1).toLowerCase();
    }
    
    // Default: lowercase
    return replacement.toLowerCase();
  }

  /**
   * Simplifies sentences by breaking up long sentences and simplifying structure
   * Requirement 106: Create sentence simplification
   */
  private simplifySentences(
    text: string,
    targetLevel: ReadingLevel,
    intensity: number,
    simplifications: SentenceSimplification[]
  ): string {
    const sentences = this.splitIntoSentences(text);
    const targetRange = this.getTargetGradeRange(targetLevel);
    const maxSentenceLength = this.getMaxSentenceLength(targetLevel);
    
    let result = text;
    let offset = 0;
    
    for (const sentence of sentences) {
      const words = this.splitIntoWords(sentence);
      const wordCount = words.length;
      
      // Skip short sentences
      if (wordCount <= maxSentenceLength) continue;
      
      // Calculate sentence complexity
      const originalComplexity = this.calculateSentenceComplexity(sentence);
      
      // Only simplify if above threshold
      if (originalComplexity < 0.5 && intensity < 0.8) continue;
      
      // Find sentence position in result
      const position = result.indexOf(sentence, offset);
      if (position === -1) continue;
      
      // Simplify the sentence
      const simplified = this.simplifySentence(sentence, maxSentenceLength);
      const newComplexity = this.calculateSentenceComplexity(simplified);
      
      if (simplified !== sentence) {
        simplifications.push({
          original: sentence,
          simplified,
          position,
          endPosition: position + sentence.length,
          reason: wordCount > maxSentenceLength 
            ? `Sentence too long (${wordCount} words, target: ${maxSentenceLength})`
            : 'Complex sentence structure',
          originalComplexity,
          newComplexity,
        });
        
        result = result.substring(0, position) + simplified + result.substring(position + sentence.length);
        offset = position + simplified.length;
      } else {
        offset = position + sentence.length;
      }
    }
    
    return result;
  }

  /**
   * Gets maximum sentence length for target level
   */
  private getMaxSentenceLength(level: ReadingLevel): number {
    switch (level) {
      case 'elementary': return 12;
      case 'middle-school': return 18;
      case 'high-school': return 25;
      case 'college': return 30;
      case 'professional': return 35;
      default: return 18;
    }
  }

  /**
   * Calculates sentence complexity score (0-1)
   */
  private calculateSentenceComplexity(sentence: string): number {
    const words = this.splitIntoWords(sentence);
    const wordCount = words.length;
    
    if (wordCount === 0) return 0;
    
    // Factors: length, syllables, subordinate clauses
    const lengthScore = Math.min(1, wordCount / 40);
    
    let totalSyllables = 0;
    for (const word of words) {
      totalSyllables += this.countSyllables(word);
    }
    const avgSyllables = totalSyllables / wordCount;
    const syllableScore = Math.min(1, (avgSyllables - 1) / 2);
    
    // Count subordinate clause indicators
    const clauseIndicators = (sentence.match(/\b(which|that|who|whom|whose|where|when|while|although|because|since|if|unless|until)\b/gi) || []).length;
    const clauseScore = Math.min(1, clauseIndicators / 3);
    
    // Count commas (indicator of complexity)
    const commaCount = (sentence.match(/,/g) || []).length;
    const commaScore = Math.min(1, commaCount / 4);
    
    return (lengthScore * 0.3 + syllableScore * 0.3 + clauseScore * 0.2 + commaScore * 0.2);
  }

  /**
   * Simplifies a single sentence
   */
  private simplifySentence(sentence: string, maxLength: number): string {
    const words = this.splitIntoWords(sentence);
    
    // If sentence is too long, try to split it
    if (words.length > maxLength) {
      return this.splitLongSentence(sentence);
    }
    
    // Simplify complex structures
    let simplified = sentence;
    
    // Remove unnecessary phrases
    simplified = simplified.replace(/\b(in order to)\b/gi, 'to');
    simplified = simplified.replace(/\b(due to the fact that)\b/gi, 'because');
    simplified = simplified.replace(/\b(at this point in time)\b/gi, 'now');
    simplified = simplified.replace(/\b(in the event that)\b/gi, 'if');
    simplified = simplified.replace(/\b(with regard to)\b/gi, 'about');
    simplified = simplified.replace(/\b(for the purpose of)\b/gi, 'to');
    simplified = simplified.replace(/\b(in spite of the fact that)\b/gi, 'although');
    simplified = simplified.replace(/\b(in close proximity to)\b/gi, 'near');
    simplified = simplified.replace(/\b(a large number of)\b/gi, 'many');
    simplified = simplified.replace(/\b(the majority of)\b/gi, 'most');
    simplified = simplified.replace(/\b(in excess of)\b/gi, 'more than');
    
    return simplified;
  }

  /**
   * Splits a long sentence into shorter ones
   */
  private splitLongSentence(sentence: string): string {
    // Try to split at conjunctions
    const conjunctionPattern = /\b(,\s*and|,\s*but|,\s*or|;\s*however|;\s*therefore|;\s*moreover)\b/gi;
    
    let result = sentence;
    let match;
    
    while ((match = conjunctionPattern.exec(sentence)) !== null) {
      const conjunction = match[1] || '';
      const cleanConjunction = conjunction.replace(/^[,;]\s*/, '').trim();
      
      // Replace with period and capitalize
      const before = sentence.substring(0, match.index);
      const after = sentence.substring(match.index + conjunction.length);
      
      if (before.trim().length > 10 && after.trim().length > 10) {
        const capitalizedAfter = cleanConjunction.charAt(0).toUpperCase() + cleanConjunction.slice(1) + after;
        result = before.trim() + '. ' + capitalizedAfter.trim();
        break;
      }
    }
    
    // If no conjunction found, try splitting at "which" or "that" clauses
    if (result === sentence) {
      const clausePattern = /,\s*(which|that)\s+/gi;
      const clauseMatch = clausePattern.exec(sentence);
      
      if (clauseMatch && clauseMatch.index > 20) {
        const before = sentence.substring(0, clauseMatch.index);
        const after = sentence.substring(clauseMatch.index + (clauseMatch[0]?.length || 0));
        
        if (after.trim().length > 10) {
          result = before.trim() + '. This ' + after.trim();
        }
      }
    }
    
    return result;
  }


  /**
   * Adds inline definitions for complex terms
   * Requirement 106: Add inline definitions
   */
  private addInlineDefinitions(
    text: string,
    targetLevel: ReadingLevel,
    format: 'parenthetical' | 'appositive' | 'footnote',
    preserveTerms: string[],
    definitions: InlineDefinition[]
  ): string {
    let result = text;
    const preserveLower = preserveTerms.map(t => t.toLowerCase());
    const addedTerms = new Set<string>();
    const complexityThreshold = this.getComplexityThreshold(targetLevel);
    
    // Find terms that need definitions
    for (const jargon of JARGON_DATABASE) {
      if (preserveLower.includes(jargon.term.toLowerCase())) continue;
      if (jargon.complexityLevel < complexityThreshold) continue;
      if (addedTerms.has(jargon.term.toLowerCase())) continue;
      
      const pattern = new RegExp(`\\b${this.escapeRegex(jargon.term)}\\b`, 'gi');
      const match = pattern.exec(result);
      
      if (match) {
        const position = match.index + match[0].length;
        const definitionText = this.formatDefinition(jargon.definition, format);
        
        definitions.push({
          term: match[0],
          definition: jargon.definition,
          position,
          format,
        });
        
        result = result.substring(0, position) + definitionText + result.substring(position);
        addedTerms.add(jargon.term.toLowerCase());
      }
    }
    
    return result;
  }

  /**
   * Formats a definition based on the specified format
   */
  private formatDefinition(definition: string, format: 'parenthetical' | 'appositive' | 'footnote'): string {
    switch (format) {
      case 'parenthetical':
        return ` (${definition})`;
      case 'appositive':
        return `, ${definition.toLowerCase()},`;
      case 'footnote':
        return `*`;
      default:
        return ` (${definition})`;
    }
  }

  /**
   * Calculates improvement metrics
   */
  private calculateImprovement(
    original: ReadingLevelAnalysis,
    simplified: ReadingLevelAnalysis,
    targetLevel: ReadingLevel,
    jargonReplacements: JargonReplacement[],
    sentenceSimplifications: SentenceSimplification[],
    inlineDefinitions: InlineDefinition[],
    originalText: string,
    simplifiedText: string
  ): SimplificationImprovement {
    const targetRange = this.getTargetGradeRange(targetLevel);
    
    const gradeLevelReduction = original.fleschKincaidGrade - simplified.fleschKincaidGrade;
    const readingEaseImprovement = simplified.fleschReadingEase - original.fleschReadingEase;
    
    // Calculate percentage of text that was changed
    const originalWords = this.splitIntoWords(originalText);
    const simplifiedWords = this.splitIntoWords(simplifiedText);
    const changedWords = jargonReplacements.length + sentenceSimplifications.reduce((acc, s) => {
      return acc + this.splitIntoWords(s.original).length;
    }, 0);
    const percentageSimplified = originalWords.length > 0 
      ? (changedWords / originalWords.length) * 100 
      : 0;
    
    // Check if target was achieved
    const targetAchieved = simplified.fleschKincaidGrade <= targetRange.maxGrade;
    
    return {
      gradeLevelReduction: Math.round(gradeLevelReduction * 10) / 10,
      readingEaseImprovement: Math.round(readingEaseImprovement * 10) / 10,
      percentageSimplified: Math.round(percentageSimplified * 10) / 10,
      jargonTermsReplaced: jargonReplacements.length,
      sentencesSimplified: sentenceSimplifications.length,
      definitionsAdded: inlineDefinitions.length,
      targetAchieved,
    };
  }

  /**
   * Gets available reading levels
   */
  getAvailableReadingLevels(): ReadingLevelRange[] {
    return READING_LEVEL_RANGES;
  }

  /**
   * Gets jargon categories
   */
  getJargonCategories(): string[] {
    return [...new Set(JARGON_DATABASE.map(j => j.category))];
  }

  /**
   * Gets jargon terms by category
   */
  getJargonByCategory(category: string): JargonTerm[] {
    return JARGON_DATABASE.filter(j => j.category === category);
  }
}

// Export singleton instance
export const simplificationService = new SimplificationService();
