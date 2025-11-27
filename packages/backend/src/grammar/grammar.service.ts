/**
 * Grammar Style Preferences Service
 * Provides grammar style configuration including Oxford comma, quote styles,
 * date/number formats, and regional variant support
 * Requirements: 103
 */

import crypto from 'crypto';
import { logger } from '../utils/logger';
import {
  RegionalVariant,
  QuoteStyle,
  DateFormat,
  NumberFormat,
  GrammarStylePreferences,
  CreateGrammarStyleInput,
  UpdateGrammarStyleInput,
  RegionalConfig,
  SpellingRule,
  GrammarTransformResult,
  GrammarChange,
  GrammarServiceConfig,
  GrammarAnalysisResult,
  GrammarIssue,
} from './types';

/** Default timeout for processing (10 seconds) */
const DEFAULT_TIMEOUT = 10000;

/** Maximum text length for processing */
const MAX_TEXT_LENGTH = 500000;

/**
 * Spelling rules for regional variants
 * Maps US spellings to UK spellings
 */
const SPELLING_RULES: SpellingRule[] = [
  // -ize vs -ise
  { us: 'organize', uk: 'organise', pattern: /\borganiz(e|ed|es|ing|ation)\b/gi, category: 'ize_ise' },
  { us: 'realize', uk: 'realise', pattern: /\breali(z|s)(e|ed|es|ing|ation)\b/gi, category: 'ize_ise' },
  { us: 'recognize', uk: 'recognise', pattern: /\brecogni(z|s)(e|ed|es|ing|tion)\b/gi, category: 'ize_ise' },
  { us: 'analyze', uk: 'analyse', pattern: /\banaly(z|s)(e|ed|es|ing|is)\b/gi, category: 'ize_ise' },
  { us: 'customize', uk: 'customise', pattern: /\bcustomi(z|s)(e|ed|es|ing|ation)\b/gi, category: 'ize_ise' },
  { us: 'optimize', uk: 'optimise', pattern: /\boptimi(z|s)(e|ed|es|ing|ation)\b/gi, category: 'ize_ise' },
  { us: 'prioritize', uk: 'prioritise', pattern: /\bprioritiz(e|ed|es|ing|ation)\b/gi, category: 'ize_ise' },
  { us: 'summarize', uk: 'summarise', pattern: /\bsummari(z|s)(e|ed|es|ing)\b/gi, category: 'ize_ise' },
  { us: 'apologize', uk: 'apologise', pattern: /\bapologi(z|s)(e|ed|es|ing)\b/gi, category: 'ize_ise' },
  { us: 'authorize', uk: 'authorise', pattern: /\bauthori(z|s)(e|ed|es|ing|ation)\b/gi, category: 'ize_ise' },
  
  // -or vs -our
  { us: 'color', uk: 'colour', pattern: /\bcolo(u)?r(s|ed|ing|ful|less)?\b/gi, category: 'or_our' },
  { us: 'favor', uk: 'favour', pattern: /\bfavo(u)?r(s|ed|ing|ite|able)?\b/gi, category: 'or_our' },
  { us: 'honor', uk: 'honour', pattern: /\bhono(u)?r(s|ed|ing|able)?\b/gi, category: 'or_our' },
  { us: 'labor', uk: 'labour', pattern: /\blabo(u)?r(s|ed|ing|er)?\b/gi, category: 'or_our' },
  { us: 'neighbor', uk: 'neighbour', pattern: /\bneighbo(u)?r(s|hood|ing|ly)?\b/gi, category: 'or_our' },
  { us: 'behavior', uk: 'behaviour', pattern: /\bbehavio(u)?r(s|al|ist)?\b/gi, category: 'or_our' },
  { us: 'humor', uk: 'humour', pattern: /\bhumo(u)?r(s|ed|ous|ist)?\b/gi, category: 'or_our' },
  { us: 'flavor', uk: 'flavour', pattern: /\bflavo(u)?r(s|ed|ing|ful|less)?\b/gi, category: 'or_our' },
  
  // -er vs -re
  { us: 'center', uk: 'centre', pattern: /\bcent(er|re)(s|ed|ing)?\b/gi, category: 'er_re' },
  { us: 'theater', uk: 'theatre', pattern: /\btheat(er|re)(s)?\b/gi, category: 'er_re' },
  { us: 'meter', uk: 'metre', pattern: /\bmet(er|re)(s)?\b/gi, category: 'er_re' },
  { us: 'fiber', uk: 'fibre', pattern: /\bfib(er|re)(s)?\b/gi, category: 'er_re' },
  { us: 'liter', uk: 'litre', pattern: /\blit(er|re)(s)?\b/gi, category: 'er_re' },
  
  // -og vs -ogue
  { us: 'catalog', uk: 'catalogue', pattern: /\bcatalog(ue)?(s|ed|ing)?\b/gi, category: 'og_ogue' },
  { us: 'dialog', uk: 'dialogue', pattern: /\bdialog(ue)?(s)?\b/gi, category: 'og_ogue' },
  { us: 'analog', uk: 'analogue', pattern: /\banalog(ue)?(s)?\b/gi, category: 'og_ogue' },
  
  // -l vs -ll (doubling)
  { us: 'traveled', uk: 'travelled', pattern: /\btravel(l)?(ed|ing|er)\b/gi, category: 'l_ll' },
  { us: 'canceled', uk: 'cancelled', pattern: /\bcancel(l)?(ed|ing|ation)\b/gi, category: 'l_ll' },
  { us: 'labeled', uk: 'labelled', pattern: /\blabel(l)?(ed|ing)\b/gi, category: 'l_ll' },
  { us: 'modeled', uk: 'modelled', pattern: /\bmodel(l)?(ed|ing)\b/gi, category: 'l_ll' },
  
  // Other common differences
  { us: 'gray', uk: 'grey', pattern: /\bgr(a|e)y(s|er|est|ish)?\b/gi, category: 'other' },
  { us: 'defense', uk: 'defence', pattern: /\bdefen(s|c)e(s|less)?\b/gi, category: 'other' },
  { us: 'offense', uk: 'offence', pattern: /\boffen(s|c)e(s|less)?\b/gi, category: 'other' },
  { us: 'license', uk: 'licence', pattern: /\blicen(s|c)e(s|d)?\b/gi, category: 'other' },
  { us: 'practice', uk: 'practise', pattern: /\bpracti(c|s)e(s|d)?\b/gi, category: 'other' },
  { us: 'check', uk: 'cheque', pattern: /\bche(ck|que)(s)?\b/gi, category: 'other' },
  { us: 'program', uk: 'programme', pattern: /\bprogram(me)?(s|ed|ing)?\b/gi, category: 'other' },
  { us: 'jewelry', uk: 'jewellery', pattern: /\bjewel(le)?ry\b/gi, category: 'other' },
  { us: 'airplane', uk: 'aeroplane', pattern: /\b(air|aero)plane(s)?\b/gi, category: 'other' },
];


/**
 * Regional configurations for each variant
 */
const REGIONAL_CONFIGS: Record<RegionalVariant, RegionalConfig> = {
  US: {
    variant: 'US',
    defaultDateFormat: 'MM/DD/YYYY',
    defaultNumberFormat: {
      decimalSeparator: '.',
      thousandsSeparator: ',',
      currencyPosition: 'before',
      currencySymbol: '$',
    },
    defaultQuoteStyle: 'double',
    defaultOxfordComma: true,
    spellingRules: SPELLING_RULES,
    grammarRules: [],
  },
  UK: {
    variant: 'UK',
    defaultDateFormat: 'DD/MM/YYYY',
    defaultNumberFormat: {
      decimalSeparator: '.',
      thousandsSeparator: ',',
      currencyPosition: 'before',
      currencySymbol: '£',
    },
    defaultQuoteStyle: 'single',
    defaultOxfordComma: false,
    spellingRules: SPELLING_RULES,
    grammarRules: [],
  },
  CA: {
    variant: 'CA',
    defaultDateFormat: 'YYYY-MM-DD',
    defaultNumberFormat: {
      decimalSeparator: '.',
      thousandsSeparator: ',',
      currencyPosition: 'before',
      currencySymbol: '$',
    },
    defaultQuoteStyle: 'double',
    defaultOxfordComma: true,
    spellingRules: SPELLING_RULES,
    grammarRules: [],
  },
  AU: {
    variant: 'AU',
    defaultDateFormat: 'DD/MM/YYYY',
    defaultNumberFormat: {
      decimalSeparator: '.',
      thousandsSeparator: ',',
      currencyPosition: 'before',
      currencySymbol: '$',
    },
    defaultQuoteStyle: 'single',
    defaultOxfordComma: false,
    spellingRules: SPELLING_RULES,
    grammarRules: [],
  },
};

/**
 * In-memory storage for grammar preferences (would be database in production)
 */
const preferencesStore = new Map<string, GrammarStylePreferences>();

/**
 * Grammar Style Preferences Service class
 * Handles grammar style configuration and text transformation
 */
export class GrammarService {
  private config: GrammarServiceConfig;

  constructor(serviceConfig?: Partial<GrammarServiceConfig>) {
    this.config = this.buildConfig(serviceConfig);
  }

  /**
   * Builds the service configuration
   */
  private buildConfig(overrides?: Partial<GrammarServiceConfig>): GrammarServiceConfig {
    return {
      defaultRegionalVariant: overrides?.defaultRegionalVariant ?? 'US',
      defaultOxfordComma: overrides?.defaultOxfordComma ?? true,
      defaultQuoteStyle: overrides?.defaultQuoteStyle ?? 'double',
      defaultDateFormat: overrides?.defaultDateFormat ?? 'MM/DD/YYYY',
      maxTextLength: overrides?.maxTextLength ?? MAX_TEXT_LENGTH,
      timeout: overrides?.timeout ?? DEFAULT_TIMEOUT,
    };
  }

  /**
   * Creates grammar style preferences for a user
   * @param input - Creation input
   * @returns Created preferences
   */
  async createPreferences(input: CreateGrammarStyleInput): Promise<GrammarStylePreferences> {
    const id = this.generateId('grammar');
    const regionalConfig = REGIONAL_CONFIGS[input.regionalVariant ?? this.config.defaultRegionalVariant];
    const now = new Date();

    const preferences: GrammarStylePreferences = {
      id,
      userId: input.userId,
      useOxfordComma: input.useOxfordComma ?? regionalConfig.defaultOxfordComma,
      quoteStyle: input.quoteStyle ?? regionalConfig.defaultQuoteStyle,
      dateFormat: input.dateFormat ?? regionalConfig.defaultDateFormat,
      numberFormat: {
        ...regionalConfig.defaultNumberFormat,
        ...input.numberFormat,
      },
      regionalVariant: input.regionalVariant ?? this.config.defaultRegionalVariant,
      createdAt: now,
      updatedAt: now,
    };

    preferencesStore.set(input.userId, preferences);
    logger.info(`Created grammar preferences for user ${input.userId}`);

    return preferences;
  }

  /**
   * Gets grammar style preferences for a user
   * @param userId - User ID
   * @returns Preferences or null if not found
   */
  async getPreferences(userId: string): Promise<GrammarStylePreferences | null> {
    return preferencesStore.get(userId) ?? null;
  }

  /**
   * Updates grammar style preferences for a user
   * @param userId - User ID
   * @param input - Update input
   * @returns Updated preferences
   */
  async updatePreferences(
    userId: string,
    input: UpdateGrammarStyleInput
  ): Promise<GrammarStylePreferences | null> {
    const existing = preferencesStore.get(userId);
    if (!existing) {
      return null;
    }

    const updated: GrammarStylePreferences = {
      ...existing,
      useOxfordComma: input.useOxfordComma ?? existing.useOxfordComma,
      quoteStyle: input.quoteStyle ?? existing.quoteStyle,
      dateFormat: input.dateFormat ?? existing.dateFormat,
      numberFormat: input.numberFormat
        ? { ...existing.numberFormat, ...input.numberFormat }
        : existing.numberFormat,
      regionalVariant: input.regionalVariant ?? existing.regionalVariant,
      updatedAt: new Date(),
    };

    preferencesStore.set(userId, updated);
    logger.info(`Updated grammar preferences for user ${userId}`);

    return updated;
  }

  /**
   * Deletes grammar style preferences for a user
   * @param userId - User ID
   * @returns Whether deletion was successful
   */
  async deletePreferences(userId: string): Promise<boolean> {
    const deleted = preferencesStore.delete(userId);
    if (deleted) {
      logger.info(`Deleted grammar preferences for user ${userId}`);
    }
    return deleted;
  }

  /**
   * Gets default preferences for a regional variant
   * @param variant - Regional variant
   * @returns Default preferences for the variant
   */
  getDefaultPreferences(variant: RegionalVariant): Omit<GrammarStylePreferences, 'id' | 'userId' | 'createdAt' | 'updatedAt'> {
    const config = REGIONAL_CONFIGS[variant];
    return {
      useOxfordComma: config.defaultOxfordComma,
      quoteStyle: config.defaultQuoteStyle,
      dateFormat: config.defaultDateFormat,
      numberFormat: config.defaultNumberFormat,
      regionalVariant: variant,
    };
  }

  /**
   * Applies grammar style preferences to text
   * @param text - Text to transform
   * @param preferences - Grammar preferences to apply
   * @returns Transformation result
   */
  async applyPreferences(
    text: string,
    preferences: GrammarStylePreferences
  ): Promise<GrammarTransformResult> {
    const startTime = Date.now();
    const changes: GrammarChange[] = [];

    try {
      if (text.length > this.config.maxTextLength) {
        return {
          success: false,
          originalText: text,
          transformedText: text,
          changes: [],
          processingTimeMs: Date.now() - startTime,
          error: `Text exceeds maximum length of ${this.config.maxTextLength} characters`,
        };
      }

      let transformedText = text;

      // Apply Oxford comma transformation
      transformedText = this.applyOxfordComma(
        transformedText,
        preferences.useOxfordComma,
        changes
      );

      // Apply quote style transformation
      transformedText = this.applyQuoteStyle(
        transformedText,
        preferences.quoteStyle,
        changes
      );

      // Apply regional spelling
      transformedText = this.applyRegionalSpelling(
        transformedText,
        preferences.regionalVariant,
        changes
      );

      return {
        success: true,
        originalText: text,
        transformedText,
        changes,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      logger.error('Error applying grammar preferences:', error);
      return {
        success: false,
        originalText: text,
        transformedText: text,
        changes: [],
        processingTimeMs: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }


  /**
   * Applies Oxford comma transformation
   * @param text - Text to transform
   * @param useOxfordComma - Whether to use Oxford comma
   * @param changes - Array to record changes
   * @returns Transformed text
   */
  private applyOxfordComma(
    text: string,
    useOxfordComma: boolean,
    changes: GrammarChange[]
  ): string {
    let result = text;

    if (useOxfordComma) {
      // Add Oxford comma where missing: "a, b and c" -> "a, b, and c"
      const addPattern = /(\w+),\s+(\w+)\s+(and|or)\s+(\w+)/gi;
      result = result.replace(addPattern, (match, first, second, conjunction, third, offset) => {
        // Check if there's already a comma before the conjunction
        if (!match.includes(`, ${conjunction}`)) {
          const replacement = `${first}, ${second}, ${conjunction} ${third}`;
          changes.push({
            type: 'oxford_comma',
            original: match,
            replacement,
            startPosition: offset,
            endPosition: offset + match.length,
            reason: 'Added Oxford comma before conjunction',
          });
          return replacement;
        }
        return match;
      });
    } else {
      // Remove Oxford comma: "a, b, and c" -> "a, b and c"
      const removePattern = /(\w+),\s+(\w+),\s+(and|or)\s+(\w+)/gi;
      result = result.replace(removePattern, (match, first, second, conjunction, third, offset) => {
        const replacement = `${first}, ${second} ${conjunction} ${third}`;
        changes.push({
          type: 'oxford_comma',
          original: match,
          replacement,
          startPosition: offset,
          endPosition: offset + match.length,
          reason: 'Removed Oxford comma before conjunction',
        });
        return replacement;
      });
    }

    return result;
  }

  /**
   * Applies quote style transformation
   * @param text - Text to transform
   * @param quoteStyle - Target quote style
   * @param changes - Array to record changes
   * @returns Transformed text
   */
  private applyQuoteStyle(
    text: string,
    quoteStyle: QuoteStyle,
    changes: GrammarChange[]
  ): string {
    let result = text;

    if (quoteStyle === 'single') {
      // Convert double quotes to single quotes
      const doubleQuotePattern = /"([^"]+)"/g;
      result = result.replace(doubleQuotePattern, (match, content, offset) => {
        const replacement = `'${content}'`;
        changes.push({
          type: 'quote_style',
          original: match,
          replacement,
          startPosition: offset,
          endPosition: offset + match.length,
          reason: 'Converted double quotes to single quotes',
        });
        return replacement;
      });
    } else {
      // Convert single quotes to double quotes (being careful with apostrophes)
      // Only convert quotes that appear to be quotation marks, not apostrophes
      const singleQuotePattern = /'([^']+)'/g;
      result = result.replace(singleQuotePattern, (match, content, offset) => {
        // Skip if it looks like an apostrophe (e.g., "don't", "it's")
        if (content.length <= 2 || /^\w+$/.test(content)) {
          return match;
        }
        const replacement = `"${content}"`;
        changes.push({
          type: 'quote_style',
          original: match,
          replacement,
          startPosition: offset,
          endPosition: offset + match.length,
          reason: 'Converted single quotes to double quotes',
        });
        return replacement;
      });
    }

    return result;
  }

  /**
   * Applies regional spelling transformation
   * @param text - Text to transform
   * @param variant - Target regional variant
   * @param changes - Array to record changes
   * @returns Transformed text
   */
  private applyRegionalSpelling(
    text: string,
    variant: RegionalVariant,
    changes: GrammarChange[]
  ): string {
    let result = text;
    const useUKSpelling = variant === 'UK' || variant === 'AU';

    for (const rule of SPELLING_RULES) {
      // Create a pattern that matches the source spelling
      result = result.replace(rule.pattern, (match, ...args) => {
        const offset = args[args.length - 2] as number;
        
        // Determine if this is a US or UK spelling
        const isUSSpelling = match.toLowerCase().includes(rule.us.toLowerCase().slice(0, -1));
        const isUKSpelling = match.toLowerCase().includes(rule.uk.toLowerCase().slice(0, -1));

        // Only transform if we need to change the spelling
        if ((useUKSpelling && isUSSpelling) || (!useUKSpelling && isUKSpelling)) {
          const replacement = this.transformSpelling(match, rule, useUKSpelling);
          if (replacement !== match) {
            changes.push({
              type: 'spelling',
              original: match,
              replacement,
              startPosition: offset,
              endPosition: offset + match.length,
              reason: `Changed to ${variant} spelling`,
            });
            return replacement;
          }
        }
        return match;
      });
    }

    return result;
  }

  /**
   * Transforms a word according to spelling rule
   */
  private transformSpelling(word: string, rule: SpellingRule, toUK: boolean): string {
    if (!word || word.length === 0) return word;
    const firstChar = word[0] ?? '';
    const isUpperCase = firstChar === firstChar.toUpperCase();
    const target = toUK ? rule.uk : rule.us;
    const source = toUK ? rule.us : rule.uk;

    // Handle different suffixes
    let result = word;
    
    switch (rule.category) {
      case 'ize_ise':
        result = toUK
          ? word.replace(/iz/gi, 'is')
          : word.replace(/is(?=e|ed|es|ing|ation)/gi, 'iz');
        break;
      case 'or_our':
        result = toUK
          ? word.replace(/or\b/gi, 'our').replace(/or(?=s|ed|ing|ful|less)/gi, 'our')
          : word.replace(/our\b/gi, 'or').replace(/our(?=s|ed|ing|ful|less)/gi, 'or');
        break;
      case 'er_re':
        result = toUK
          ? word.replace(/er\b/gi, 're').replace(/er(?=s|ed|ing)/gi, 're')
          : word.replace(/re\b/gi, 'er').replace(/re(?=s|ed|ing)/gi, 'er');
        break;
      case 'og_ogue':
        result = toUK
          ? word.replace(/og\b/gi, 'ogue').replace(/og(?=s|ed|ing)/gi, 'ogue')
          : word.replace(/ogue\b/gi, 'og').replace(/ogue(?=s|ed|ing)/gi, 'og');
        break;
      case 'l_ll':
        result = toUK
          ? word.replace(/l(?=ed|ing|er)/gi, 'll')
          : word.replace(/ll(?=ed|ing|er)/gi, 'l');
        break;
      default:
        // For 'other' category, do direct replacement
        const lowerWord = word.toLowerCase();
        const lowerSource = source.toLowerCase();
        if (lowerWord.startsWith(lowerSource)) {
          result = target + word.slice(source.length);
        }
    }

    // Preserve original case
    if (isUpperCase && result.length > 0) {
      const firstResultChar = result[0];
      if (firstResultChar) {
        result = firstResultChar.toUpperCase() + result.slice(1);
      }
    }

    return result;
  }

  /**
   * Formats a date according to preferences
   * @param date - Date to format
   * @param format - Target date format
   * @returns Formatted date string
   */
  formatDate(date: Date, format: DateFormat): string {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const pad = (n: number): string => n.toString().padStart(2, '0');

    switch (format) {
      case 'MM/DD/YYYY':
        return `${pad(month)}/${pad(day)}/${year}`;
      case 'DD/MM/YYYY':
        return `${pad(day)}/${pad(month)}/${year}`;
      case 'YYYY-MM-DD':
        return `${year}-${pad(month)}-${pad(day)}`;
      case 'DD-MM-YYYY':
        return `${pad(day)}-${pad(month)}-${year}`;
      case 'MMMM D, YYYY':
        return `${monthNames[month - 1]} ${day}, ${year}`;
      case 'D MMMM YYYY':
        return `${day} ${monthNames[month - 1]} ${year}`;
      default:
        return `${pad(month)}/${pad(day)}/${year}`;
    }
  }

  /**
   * Formats a number according to preferences
   * @param value - Number to format
   * @param format - Number format configuration
   * @returns Formatted number string
   */
  formatNumber(value: number, format: NumberFormat): string {
    const parts = value.toFixed(2).split('.');
    const integerPart = parts[0] ?? '0';
    const decimalPart = parts[1] ?? '00';

    // Add thousands separators
    let formattedInteger = '';
    for (let i = 0; i < integerPart.length; i++) {
      if (i > 0 && (integerPart.length - i) % 3 === 0) {
        formattedInteger += format.thousandsSeparator;
      }
      formattedInteger += integerPart[i];
    }

    return `${formattedInteger}${format.decimalSeparator}${decimalPart}`;
  }

  /**
   * Formats a currency value according to preferences
   * @param value - Currency value
   * @param format - Number format configuration
   * @returns Formatted currency string
   */
  formatCurrency(value: number, format: NumberFormat): string {
    const formattedNumber = this.formatNumber(value, format);
    
    if (format.currencyPosition === 'before') {
      return `${format.currencySymbol}${formattedNumber}`;
    } else {
      return `${formattedNumber}${format.currencySymbol}`;
    }
  }

  /**
   * Analyzes text for grammar style patterns
   * @param text - Text to analyze
   * @returns Analysis result
   */
  async analyzeText(text: string): Promise<GrammarAnalysisResult> {
    const startTime = Date.now();
    const issues: GrammarIssue[] = [];

    // Detect regional variant
    const { variant: detectedVariant, confidence } = this.detectRegionalVariant(text);

    // Detect quote style
    const detectedQuoteStyle = this.detectQuoteStyle(text);

    // Detect Oxford comma usage
    const usesOxfordComma = this.detectOxfordCommaUsage(text);

    // Detect date formats
    const detectedDateFormats = this.detectDateFormats(text);

    // Find inconsistencies
    this.findInconsistencies(text, issues);

    return {
      detectedVariant,
      confidence,
      detectedQuoteStyle,
      usesOxfordComma,
      detectedDateFormats,
      issues,
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Detects the regional variant used in text
   */
  private detectRegionalVariant(text: string): { variant: RegionalVariant | null; confidence: number } {
    let usScore = 0;
    let ukScore = 0;
    const lowerText = text.toLowerCase();

    for (const rule of SPELLING_RULES) {
      // Check for specific US and UK patterns based on category
      switch (rule.category) {
        case 'ize_ise':
          // Check for -ize (US) vs -ise (UK)
          if (new RegExp(`\\b\\w+ize[ds]?\\b`, 'gi').test(text)) usScore++;
          if (new RegExp(`\\b\\w+ise[ds]?\\b`, 'gi').test(text)) ukScore++;
          break;
        case 'or_our':
          // Check for -or (US) vs -our (UK)
          if (lowerText.includes(rule.us.toLowerCase())) usScore++;
          if (lowerText.includes(rule.uk.toLowerCase())) ukScore++;
          break;
        case 'er_re':
          // Check for -er (US) vs -re (UK) endings
          if (lowerText.includes(rule.us.toLowerCase())) usScore++;
          if (lowerText.includes(rule.uk.toLowerCase())) ukScore++;
          break;
        case 'og_ogue':
          // Check for -og (US) vs -ogue (UK)
          if (lowerText.includes(rule.us.toLowerCase())) usScore++;
          if (lowerText.includes(rule.uk.toLowerCase())) ukScore++;
          break;
        case 'l_ll':
          // Check for single l (US) vs double ll (UK)
          if (new RegExp(`\\b${rule.us}`, 'gi').test(text)) usScore++;
          if (new RegExp(`\\b${rule.uk}`, 'gi').test(text)) ukScore++;
          break;
        case 'other':
          // Direct word matching
          if (lowerText.includes(rule.us.toLowerCase())) usScore++;
          if (lowerText.includes(rule.uk.toLowerCase())) ukScore++;
          break;
      }
    }

    const total = usScore + ukScore;
    if (total === 0) {
      return { variant: null, confidence: 0 };
    }

    if (usScore > ukScore) {
      return { variant: 'US', confidence: usScore / total };
    } else if (ukScore > usScore) {
      return { variant: 'UK', confidence: ukScore / total };
    }

    return { variant: null, confidence: 0.5 };
  }

  /**
   * Detects the quote style used in text
   */
  private detectQuoteStyle(text: string): QuoteStyle | null {
    // Account for apostrophes by looking for quote pairs
    const doubleQuotePairs = (text.match(/"[^"]+"/g) || []).length;
    const singleQuotePairs = (text.match(/'[^']+'/g) || []).length;

    if (doubleQuotePairs > singleQuotePairs) {
      return 'double';
    } else if (singleQuotePairs > doubleQuotePairs) {
      return 'single';
    }

    return null;
  }

  /**
   * Detects Oxford comma usage in text
   */
  private detectOxfordCommaUsage(text: string): boolean | null {
    const withOxfordComma = (text.match(/\w+,\s+\w+,\s+(and|or)\s+\w+/gi) || []).length;
    const withoutOxfordComma = (text.match(/\w+,\s+\w+\s+(and|or)\s+\w+/gi) || []).length - withOxfordComma;

    if (withOxfordComma > withoutOxfordComma) {
      return true;
    } else if (withoutOxfordComma > withOxfordComma) {
      return false;
    }

    return null;
  }

  /**
   * Detects date formats used in text
   */
  private detectDateFormats(text: string): DateFormat[] {
    const formats: DateFormat[] = [];

    // MM/DD/YYYY pattern
    if (/\b(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/\d{4}\b/.test(text)) {
      formats.push('MM/DD/YYYY');
    }

    // DD/MM/YYYY pattern
    if (/\b(0?[1-9]|[12]\d|3[01])\/(0?[1-9]|1[0-2])\/\d{4}\b/.test(text)) {
      formats.push('DD/MM/YYYY');
    }

    // YYYY-MM-DD pattern (ISO)
    if (/\b\d{4}-(0?[1-9]|1[0-2])-(0?[1-9]|[12]\d|3[01])\b/.test(text)) {
      formats.push('YYYY-MM-DD');
    }

    return formats;
  }

  /**
   * Finds grammar inconsistencies in text
   */
  private findInconsistencies(text: string, issues: GrammarIssue[]): void {
    // Check for mixed quote styles
    const doubleQuotePairs = (text.match(/"[^"]+"/g) || []).length;
    const singleQuotePairs = (text.match(/'[^']+'/g) || []).length;

    if (doubleQuotePairs > 0 && singleQuotePairs > 0) {
      issues.push({
        type: 'inconsistent_quotes',
        description: 'Mixed quote styles detected',
        position: 0,
        segment: text.substring(0, 100),
        suggestion: 'Use consistent quote style throughout the document',
      });
    }

    // Check for mixed spelling variants
    let hasUSSpelling = false;
    let hasUKSpelling = false;

    for (const rule of SPELLING_RULES) {
      const matches = text.match(rule.pattern);
      if (matches) {
        for (const match of matches) {
          const lowerMatch = match.toLowerCase();
          if (lowerMatch.includes(rule.us.toLowerCase().slice(0, -1))) {
            hasUSSpelling = true;
          } else if (lowerMatch.includes(rule.uk.toLowerCase().slice(0, -1))) {
            hasUKSpelling = true;
          }
        }
      }
    }

    if (hasUSSpelling && hasUKSpelling) {
      issues.push({
        type: 'inconsistent_spelling',
        description: 'Mixed US and UK spellings detected',
        position: 0,
        segment: text.substring(0, 100),
        suggestion: 'Use consistent regional spelling throughout the document',
      });
    }
  }

  /**
   * Gets available regional variants
   */
  getAvailableVariants(): RegionalVariant[] {
    return ['US', 'UK', 'CA', 'AU'];
  }

  /**
   * Gets regional configuration
   */
  getRegionalConfig(variant: RegionalVariant): RegionalConfig {
    return REGIONAL_CONFIGS[variant];
  }

  /**
   * Generates a unique ID
   */
  private generateId(prefix: string): string {
    return `${prefix}_${crypto.randomUUID()}`;
  }
}

// Export singleton instance
export const grammarService = new GrammarService();
