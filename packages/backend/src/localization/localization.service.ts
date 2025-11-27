/**
 * Content Localization Service
 * Provides idiom/metaphor adaptation, cultural reference localization,
 * unit/currency conversion, and cultural sensitivity checking
 * Requirements: 111
 */

import crypto from 'crypto';
import {
  TargetRegion,
  SensitivityLevel,
  RegionConfig,
  IdiomAdaptation,
  MetaphorAdaptation,
  CulturalReferenceAdaptation,
  UnitConversion,
  CurrencyConversion,
  DateFormatConversion,
  CulturalSensitivityFlag,
  LocalizationRequest,
  LocalizationResult,
  MultiRegionLocalizationRequest,
  MultiRegionLocalizationResult,
  SensitivityCheckRequest,
  SensitivityCheckResult,
  LocalizationConfig,
} from './types';

/** Default configuration values */
const DEFAULT_SOURCE_REGION: TargetRegion = 'us';
const DEFAULT_MIN_CONFIDENCE = 0.7;
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_MAX_CONTENT_LENGTH = 100000;

/** Region configurations */
const REGION_CONFIGS: Record<TargetRegion, RegionConfig> = {
  us: {
    region: 'us',
    name: 'United States',
    language: 'en-US',
    unitSystem: 'imperial',
    dateFormat: 'mdy',
    currency: { code: 'USD', symbol: '$', name: 'US Dollar', symbolPosition: 'before', decimalSeparator: '.', thousandsSeparator: ',' },
    culturalNotes: ['Direct communication style', 'Individualistic culture'],
  },
  uk: {
    region: 'uk',
    name: 'United Kingdom',
    language: 'en-GB',
    unitSystem: 'metric',
    dateFormat: 'dmy',
    currency: { code: 'GBP', symbol: '£', name: 'British Pound', symbolPosition: 'before', decimalSeparator: '.', thousandsSeparator: ',' },
    culturalNotes: ['Indirect communication', 'Understated humor'],
  },
  au: {
    region: 'au',
    name: 'Australia',
    language: 'en-AU',
    unitSystem: 'metric',
    dateFormat: 'dmy',
    currency: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', symbolPosition: 'before', decimalSeparator: '.', thousandsSeparator: ',' },
    culturalNotes: ['Casual communication', 'Self-deprecating humor'],
  },
  ca: {
    region: 'ca',
    name: 'Canada',
    language: 'en-CA',
    unitSystem: 'metric',
    dateFormat: 'dmy',
    currency: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', symbolPosition: 'before', decimalSeparator: '.', thousandsSeparator: ',' },
    culturalNotes: ['Polite communication', 'Multicultural awareness'],
  },
  de: {
    region: 'de',
    name: 'Germany',
    language: 'de-DE',
    unitSystem: 'metric',
    dateFormat: 'dmy',
    currency: { code: 'EUR', symbol: '€', name: 'Euro', symbolPosition: 'after', decimalSeparator: ',', thousandsSeparator: '.' },
    culturalNotes: ['Direct communication', 'Punctuality valued'],
  },
  fr: {
    region: 'fr',
    name: 'France',
    language: 'fr-FR',
    unitSystem: 'metric',
    dateFormat: 'dmy',
    currency: { code: 'EUR', symbol: '€', name: 'Euro', symbolPosition: 'after', decimalSeparator: ',', thousandsSeparator: ' ' },
    culturalNotes: ['Formal communication', 'Cultural pride'],
  },
  es: {
    region: 'es',
    name: 'Spain',
    language: 'es-ES',
    unitSystem: 'metric',
    dateFormat: 'dmy',
    currency: { code: 'EUR', symbol: '€', name: 'Euro', symbolPosition: 'after', decimalSeparator: ',', thousandsSeparator: '.' },
    culturalNotes: ['Warm communication', 'Family-oriented'],
  },
  mx: {
    region: 'mx',
    name: 'Mexico',
    language: 'es-MX',
    unitSystem: 'metric',
    dateFormat: 'dmy',
    currency: { code: 'MXN', symbol: '$', name: 'Mexican Peso', symbolPosition: 'before', decimalSeparator: '.', thousandsSeparator: ',' },
    culturalNotes: ['Warm communication', 'Respect for hierarchy'],
  },
  br: {
    region: 'br',
    name: 'Brazil',
    language: 'pt-BR',
    unitSystem: 'metric',
    dateFormat: 'dmy',
    currency: { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', symbolPosition: 'before', decimalSeparator: ',', thousandsSeparator: '.' },
    culturalNotes: ['Warm and expressive', 'Relationship-focused'],
  },
  jp: {
    region: 'jp',
    name: 'Japan',
    language: 'ja-JP',
    unitSystem: 'metric',
    dateFormat: 'ymd',
    currency: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', symbolPosition: 'before', decimalSeparator: '.', thousandsSeparator: ',' },
    culturalNotes: ['Indirect communication', 'Respect and harmony valued'],
  },
  cn: {
    region: 'cn',
    name: 'China',
    language: 'zh-CN',
    unitSystem: 'metric',
    dateFormat: 'ymd',
    currency: { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', symbolPosition: 'before', decimalSeparator: '.', thousandsSeparator: ',' },
    culturalNotes: ['Indirect communication', 'Face-saving important'],
  },
  in: {
    region: 'in',
    name: 'India',
    language: 'en-IN',
    unitSystem: 'metric',
    dateFormat: 'dmy',
    currency: { code: 'INR', symbol: '₹', name: 'Indian Rupee', symbolPosition: 'before', decimalSeparator: '.', thousandsSeparator: ',' },
    culturalNotes: ['Respectful communication', 'Hierarchical awareness'],
  },
  ae: {
    region: 'ae',
    name: 'United Arab Emirates',
    language: 'ar-AE',
    unitSystem: 'metric',
    dateFormat: 'dmy',
    currency: { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', symbolPosition: 'after', decimalSeparator: '.', thousandsSeparator: ',' },
    culturalNotes: ['Formal communication', 'Religious sensitivity important'],
  },
  za: {
    region: 'za',
    name: 'South Africa',
    language: 'en-ZA',
    unitSystem: 'metric',
    dateFormat: 'dmy',
    currency: { code: 'ZAR', symbol: 'R', name: 'South African Rand', symbolPosition: 'before', decimalSeparator: '.', thousandsSeparator: ',' },
    culturalNotes: ['Diverse cultural awareness', 'Ubuntu philosophy'],
  },
};

/** Idiom mappings by region */
const IDIOM_MAPPINGS: Record<string, Record<TargetRegion, string>> = {
  'piece of cake': {
    us: 'piece of cake', uk: 'piece of cake', au: 'easy as', ca: 'piece of cake',
    de: 'a walk in the park', fr: 'child\'s play', es: 'very easy', mx: 'very easy',
    br: 'very simple', jp: 'very simple', cn: 'very easy', in: 'piece of cake',
    ae: 'very simple', za: 'piece of cake',
  },
  'break a leg': {
    us: 'break a leg', uk: 'break a leg', au: 'good luck', ca: 'break a leg',
    de: 'good luck', fr: 'good luck', es: 'good luck', mx: 'good luck',
    br: 'good luck', jp: 'good luck', cn: 'good luck', in: 'all the best',
    ae: 'good luck', za: 'good luck',
  },
  'hit the nail on the head': {
    us: 'hit the nail on the head', uk: 'hit the nail on the head', au: 'spot on', ca: 'hit the nail on the head',
    de: 'exactly right', fr: 'exactly right', es: 'exactly right', mx: 'exactly right',
    br: 'exactly right', jp: 'precisely correct', cn: 'exactly right', in: 'hit the nail on the head',
    ae: 'exactly correct', za: 'spot on',
  },
  'cost an arm and a leg': {
    us: 'cost an arm and a leg', uk: 'cost a bomb', au: 'cost a fortune', ca: 'cost an arm and a leg',
    de: 'very expensive', fr: 'cost a fortune', es: 'very expensive', mx: 'very expensive',
    br: 'very expensive', jp: 'extremely expensive', cn: 'very costly', in: 'cost a fortune',
    ae: 'very expensive', za: 'cost a fortune',
  },
  'under the weather': {
    us: 'under the weather', uk: 'feeling poorly', au: 'feeling crook', ca: 'under the weather',
    de: 'feeling unwell', fr: 'feeling unwell', es: 'feeling unwell', mx: 'feeling unwell',
    br: 'feeling unwell', jp: 'not feeling well', cn: 'feeling unwell', in: 'under the weather',
    ae: 'feeling unwell', za: 'feeling under the weather',
  },
  'raining cats and dogs': {
    us: 'raining cats and dogs', uk: 'raining cats and dogs', au: 'bucketing down', ca: 'raining cats and dogs',
    de: 'raining heavily', fr: 'raining heavily', es: 'raining heavily', mx: 'raining heavily',
    br: 'raining heavily', jp: 'raining very hard', cn: 'raining heavily', in: 'raining cats and dogs',
    ae: 'raining heavily', za: 'raining cats and dogs',
  },
  'the ball is in your court': {
    us: 'the ball is in your court', uk: 'the ball is in your court', au: 'over to you', ca: 'the ball is in your court',
    de: 'it\'s your decision now', fr: 'it\'s your turn', es: 'it\'s your decision', mx: 'it\'s your decision',
    br: 'it\'s your turn', jp: 'the decision is yours', cn: 'it\'s your turn', in: 'the ball is in your court',
    ae: 'it\'s your decision', za: 'the ball is in your court',
  },
  'bite the bullet': {
    us: 'bite the bullet', uk: 'bite the bullet', au: 'just do it', ca: 'bite the bullet',
    de: 'face the challenge', fr: 'face the difficulty', es: 'face the challenge', mx: 'face the challenge',
    br: 'face the challenge', jp: 'endure the difficulty', cn: 'face the challenge', in: 'bite the bullet',
    ae: 'face the challenge', za: 'bite the bullet',
  },
};

/** Metaphor mappings */
const METAPHOR_MAPPINGS: Record<string, Record<TargetRegion, string>> = {
  'time is money': {
    us: 'time is money', uk: 'time is money', au: 'time is valuable', ca: 'time is money',
    de: 'time is valuable', fr: 'time is precious', es: 'time is gold', mx: 'time is gold',
    br: 'time is gold', jp: 'time is precious', cn: 'time is gold', in: 'time is money',
    ae: 'time is precious', za: 'time is money',
  },
  'life is a journey': {
    us: 'life is a journey', uk: 'life is a journey', au: 'life is a journey', ca: 'life is a journey',
    de: 'life is a path', fr: 'life is a voyage', es: 'life is a path', mx: 'life is a path',
    br: 'life is a journey', jp: 'life is a path', cn: 'life is a journey', in: 'life is a journey',
    ae: 'life is a journey', za: 'life is a journey',
  },
  'the world is your oyster': {
    us: 'the world is your oyster', uk: 'the world is your oyster', au: 'the world is yours', ca: 'the world is your oyster',
    de: 'the world is open to you', fr: 'the world is yours', es: 'the world is yours', mx: 'the world is yours',
    br: 'the world is yours', jp: 'opportunities await you', cn: 'the world is yours', in: 'the world is your oyster',
    ae: 'the world is open to you', za: 'the world is your oyster',
  },
};

/** Cultural references by region */
const CULTURAL_REFERENCES: Record<string, { type: string; adaptations: Record<TargetRegion, string> }> = {
  'Super Bowl': {
    type: 'sport',
    adaptations: {
      us: 'Super Bowl', uk: 'FA Cup Final', au: 'AFL Grand Final', ca: 'Grey Cup',
      de: 'DFB-Pokal Final', fr: 'Coupe de France Final', es: 'Copa del Rey Final', mx: 'Liga MX Final',
      br: 'Copa do Brasil Final', jp: 'major sports final', cn: 'major sports final', in: 'IPL Final',
      ae: 'major sports final', za: 'Rugby World Cup Final',
    },
  },
  'Thanksgiving': {
    type: 'event',
    adaptations: {
      us: 'Thanksgiving', uk: 'harvest festival', au: 'family gathering', ca: 'Thanksgiving',
      de: 'Erntedankfest', fr: 'family celebration', es: 'family celebration', mx: 'family celebration',
      br: 'family celebration', jp: 'family gathering', cn: 'family reunion', in: 'Diwali celebration',
      ae: 'Eid celebration', za: 'Heritage Day',
    },
  },
  'Fourth of July': {
    type: 'event',
    adaptations: {
      us: 'Fourth of July', uk: 'national celebration', au: 'Australia Day', ca: 'Canada Day',
      de: 'German Unity Day', fr: 'Bastille Day', es: 'National Day', mx: 'Independence Day',
      br: 'Independence Day', jp: 'national holiday', cn: 'National Day', in: 'Independence Day',
      ae: 'National Day', za: 'Freedom Day',
    },
  },
  'Walmart': {
    type: 'brand',
    adaptations: {
      us: 'Walmart', uk: 'Tesco', au: 'Woolworths', ca: 'Walmart',
      de: 'Aldi', fr: 'Carrefour', es: 'Mercadona', mx: 'Walmart',
      br: 'Carrefour', jp: 'Aeon', cn: 'Walmart', in: 'Big Bazaar',
      ae: 'Carrefour', za: 'Pick n Pay',
    },
  },
  'Hollywood': {
    type: 'location',
    adaptations: {
      us: 'Hollywood', uk: 'the film industry', au: 'the film industry', ca: 'Hollywood',
      de: 'the film industry', fr: 'the cinema world', es: 'the film industry', mx: 'the film industry',
      br: 'the film industry', jp: 'the entertainment industry', cn: 'the film industry', in: 'Bollywood',
      ae: 'the film industry', za: 'the film industry',
    },
  },
};

/** Sensitive terms by region */
const SENSITIVE_TERMS: Record<string, { level: SensitivityLevel; regions: TargetRegion[]; reason: string; suggestion?: string }> = {
  'pork': { level: 'high', regions: ['ae'], reason: 'Pork is not consumed in Islamic culture', suggestion: 'meat' },
  'alcohol': { level: 'medium', regions: ['ae'], reason: 'Alcohol references may be sensitive in Islamic regions', suggestion: 'beverages' },
  'beef': { level: 'high', regions: ['in'], reason: 'Beef is sacred in Hindu culture', suggestion: 'meat' },
  'gambling': { level: 'medium', regions: ['ae', 'jp'], reason: 'Gambling references may be culturally sensitive' },
  'lucky number 4': { level: 'medium', regions: ['cn', 'jp'], reason: 'Number 4 is considered unlucky in East Asian cultures' },
  'number 13': { level: 'low', regions: ['us', 'uk'], reason: 'Number 13 is considered unlucky in Western cultures' },
  'left hand': { level: 'medium', regions: ['ae', 'in'], reason: 'Left hand usage may be considered disrespectful' },
  'thumbs up': { level: 'medium', regions: ['ae'], reason: 'Thumbs up gesture may be offensive in some Middle Eastern cultures' },
};

/** Unit conversion factors */
const UNIT_CONVERSIONS: Record<string, { metric: string; imperial: string; toMetric: number }> = {
  'mile': { metric: 'kilometer', imperial: 'mile', toMetric: 1.60934 },
  'miles': { metric: 'kilometers', imperial: 'miles', toMetric: 1.60934 },
  'foot': { metric: 'meter', imperial: 'foot', toMetric: 0.3048 },
  'feet': { metric: 'meters', imperial: 'feet', toMetric: 0.3048 },
  'inch': { metric: 'centimeter', imperial: 'inch', toMetric: 2.54 },
  'inches': { metric: 'centimeters', imperial: 'inches', toMetric: 2.54 },
  'pound': { metric: 'kilogram', imperial: 'pound', toMetric: 0.453592 },
  'pounds': { metric: 'kilograms', imperial: 'pounds', toMetric: 0.453592 },
  'ounce': { metric: 'gram', imperial: 'ounce', toMetric: 28.3495 },
  'ounces': { metric: 'grams', imperial: 'ounces', toMetric: 28.3495 },
  'gallon': { metric: 'liter', imperial: 'gallon', toMetric: 3.78541 },
  'gallons': { metric: 'liters', imperial: 'gallons', toMetric: 3.78541 },
  'fahrenheit': { metric: 'celsius', imperial: 'fahrenheit', toMetric: 0 }, // Special handling
  '°F': { metric: '°C', imperial: '°F', toMetric: 0 }, // Special handling
};

/** Exchange rates (simplified - in production would use real-time API) */
const EXCHANGE_RATES: Record<string, number> = {
  'USD': 1.0,
  'GBP': 0.79,
  'EUR': 0.92,
  'AUD': 1.53,
  'CAD': 1.36,
  'JPY': 149.50,
  'CNY': 7.24,
  'INR': 83.12,
  'BRL': 4.97,
  'MXN': 17.15,
  'AED': 3.67,
  'ZAR': 18.65,
};


/**
 * Content Localization Service class
 * Handles idiom/metaphor adaptation, cultural reference localization,
 * unit/currency conversion, and cultural sensitivity checking
 */
export class LocalizationService {
  private config: LocalizationConfig;

  constructor(serviceConfig?: Partial<LocalizationConfig>) {
    this.config = this.buildConfig(serviceConfig);
  }

  /**
   * Builds the service configuration
   */
  private buildConfig(overrides?: Partial<LocalizationConfig>): LocalizationConfig {
    return {
      defaultSourceRegion: overrides?.defaultSourceRegion ?? DEFAULT_SOURCE_REGION,
      minConfidenceThreshold: overrides?.minConfidenceThreshold ?? DEFAULT_MIN_CONFIDENCE,
      timeout: overrides?.timeout ?? DEFAULT_TIMEOUT,
      maxContentLength: overrides?.maxContentLength ?? DEFAULT_MAX_CONTENT_LENGTH,
    };
  }

  /**
   * Generates a unique identifier
   */
  private generateId(prefix: string): string {
    return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Gets region configuration
   */
  getRegionConfig(region: TargetRegion): RegionConfig {
    return REGION_CONFIGS[region];
  }

  /**
   * Gets all supported regions
   */
  getAllRegions(): RegionConfig[] {
    return Object.values(REGION_CONFIGS);
  }

  /**
   * Detects the source region from content
   */
  detectSourceRegion(content: string): TargetRegion {
    const lowerContent = content.toLowerCase();
    
    // Check for region-specific patterns
    if (/\$\d/.test(content) && /\b(color|center|organize)\b/.test(lowerContent)) {
      return 'us';
    }
    if (/£\d/.test(content) || /\b(colour|centre|organise)\b/.test(lowerContent)) {
      return 'uk';
    }
    if (/A\$\d/.test(content) || /\b(arvo|brekkie|mate)\b/.test(lowerContent)) {
      return 'au';
    }
    if (/€\d/.test(content)) {
      if (/\b(bonjour|merci)\b/.test(lowerContent)) return 'fr';
      if (/\b(hallo|danke)\b/.test(lowerContent)) return 'de';
      return 'de';
    }
    if (/¥\d/.test(content)) {
      return 'jp';
    }
    if (/₹\d/.test(content)) {
      return 'in';
    }
    
    return this.config.defaultSourceRegion;
  }

  /**
   * Localizes content for a target region
   * Requirement 111: Content localization
   */
  async localize(request: LocalizationRequest): Promise<LocalizationResult> {
    const startTime = Date.now();
    const id = this.generateId('loc');

    const sourceRegion = request.sourceRegion ?? this.detectSourceRegion(request.content);
    let localizedContent = request.content;

    const idiomAdaptations: IdiomAdaptation[] = [];
    const metaphorAdaptations: MetaphorAdaptation[] = [];
    const culturalReferenceAdaptations: CulturalReferenceAdaptation[] = [];
    const unitConversions: UnitConversion[] = [];
    const currencyConversions: CurrencyConversion[] = [];
    const dateFormatConversions: DateFormatConversion[] = [];
    const sensitivityFlags: CulturalSensitivityFlag[] = [];

    // Step 1: Adapt idioms
    if (request.adaptIdioms) {
      const result = this.adaptIdioms(localizedContent, request.targetRegion, request.preserveTerms);
      localizedContent = result.content;
      idiomAdaptations.push(...result.adaptations);
    }

    // Step 2: Adapt metaphors
    if (request.adaptMetaphors) {
      const result = this.adaptMetaphors(localizedContent, request.targetRegion, request.preserveTerms);
      localizedContent = result.content;
      metaphorAdaptations.push(...result.adaptations);
    }

    // Step 3: Adapt cultural references
    if (request.adaptCulturalReferences) {
      const result = this.adaptCulturalReferences(localizedContent, request.targetRegion, request.preserveTerms);
      localizedContent = result.content;
      culturalReferenceAdaptations.push(...result.adaptations);
    }

    // Step 4: Convert units
    if (request.convertUnits) {
      const result = this.convertUnits(localizedContent, sourceRegion, request.targetRegion);
      localizedContent = result.content;
      unitConversions.push(...result.conversions);
    }

    // Step 5: Convert currency
    if (request.convertCurrency) {
      const result = this.convertCurrency(localizedContent, sourceRegion, request.targetRegion);
      localizedContent = result.content;
      currencyConversions.push(...result.conversions);
    }

    // Step 6: Convert date formats
    if (request.convertDateFormats) {
      const result = this.convertDateFormats(localizedContent, sourceRegion, request.targetRegion);
      localizedContent = result.content;
      dateFormatConversions.push(...result.conversions);
    }

    // Step 7: Check cultural sensitivity
    if (request.checkSensitivity) {
      const flags = this.checkCulturalSensitivity(localizedContent, [request.targetRegion]);
      sensitivityFlags.push(...flags);
    }

    // Calculate cultural appropriateness score
    const culturalAppropriatenessScore = this.calculateCulturalAppropriatenessScore(
      sensitivityFlags,
      idiomAdaptations.length + metaphorAdaptations.length + culturalReferenceAdaptations.length
    );

    const totalAdaptations = 
      idiomAdaptations.length +
      metaphorAdaptations.length +
      culturalReferenceAdaptations.length +
      unitConversions.length +
      currencyConversions.length +
      dateFormatConversions.length;

    return {
      id,
      originalContent: request.content,
      localizedContent,
      sourceRegion,
      targetRegion: request.targetRegion,
      idiomAdaptations,
      metaphorAdaptations,
      culturalReferenceAdaptations,
      unitConversions,
      currencyConversions,
      dateFormatConversions,
      sensitivityFlags,
      culturalAppropriatenessScore,
      totalAdaptations,
      timestamp: new Date(),
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Localizes content for multiple regions
   */
  async localizeMultiRegion(request: MultiRegionLocalizationRequest): Promise<MultiRegionLocalizationResult> {
    const startTime = Date.now();
    const id = this.generateId('multi_loc');
    const sourceRegion = request.sourceRegion ?? this.detectSourceRegion(request.content);

    const regionResults: Partial<Record<TargetRegion, LocalizationResult>> = {};

    for (const targetRegion of request.targetRegions) {
      const localizationRequest: LocalizationRequest = {
        content: request.content,
        sourceRegion,
        targetRegion,
        adaptIdioms: request.adaptIdioms,
        adaptMetaphors: request.adaptMetaphors,
        adaptCulturalReferences: request.adaptCulturalReferences,
        convertUnits: request.convertUnits,
        convertCurrency: request.convertCurrency,
        convertDateFormats: request.convertDateFormats,
        checkSensitivity: request.checkSensitivity,
      };
      if (request.preserveTerms) {
        localizationRequest.preserveTerms = request.preserveTerms;
      }
      const result = await this.localize(localizationRequest);
      regionResults[targetRegion] = result;
    }

    return {
      id,
      originalContent: request.content,
      sourceRegion,
      regionResults: regionResults as Record<TargetRegion, LocalizationResult>,
      totalRegions: request.targetRegions.length,
      timestamp: new Date(),
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Checks content for cultural sensitivity
   */
  checkSensitivityOnly(request: SensitivityCheckRequest): SensitivityCheckResult {
    const id = this.generateId('sens');
    const flags = this.checkCulturalSensitivity(request.content, request.targetRegions);
    
    const overallLevel = this.determineOverallSensitivityLevel(flags);
    const isSafeForAllRegions = flags.length === 0;

    return {
      id,
      content: request.content,
      flags,
      overallLevel,
      regionsChecked: request.targetRegions,
      isSafeForAllRegions,
      timestamp: new Date(),
    };
  }

  /**
   * Adapts idioms for target region
   * Requirement 111.1: Adapt idioms for target regions
   */
  private adaptIdioms(
    content: string,
    targetRegion: TargetRegion,
    preserveTerms?: string[]
  ): { content: string; adaptations: IdiomAdaptation[] } {
    let adaptedContent = content;
    const adaptations: IdiomAdaptation[] = [];

    for (const [idiom, regionMappings] of Object.entries(IDIOM_MAPPINGS)) {
      if (preserveTerms?.some(term => idiom.toLowerCase().includes(term.toLowerCase()))) {
        continue;
      }

      const pattern = new RegExp(`\\b${this.escapeRegex(idiom)}\\b`, 'gi');
      const matches = content.match(pattern);

      if (matches && regionMappings[targetRegion]) {
        const adapted = regionMappings[targetRegion];
        if (adapted !== idiom) {
          adaptedContent = adaptedContent.replace(pattern, adapted);
          adaptations.push({
            original: idiom,
            adapted,
            explanation: `Idiom adapted for ${REGION_CONFIGS[targetRegion].name}`,
            confidence: 0.85,
          });
        }
      }
    }

    return { content: adaptedContent, adaptations };
  }

  /**
   * Adapts metaphors for target region
   * Requirement 111.1: Adapt metaphors for target regions
   */
  private adaptMetaphors(
    content: string,
    targetRegion: TargetRegion,
    preserveTerms?: string[]
  ): { content: string; adaptations: MetaphorAdaptation[] } {
    let adaptedContent = content;
    const adaptations: MetaphorAdaptation[] = [];

    for (const [metaphor, regionMappings] of Object.entries(METAPHOR_MAPPINGS)) {
      if (preserveTerms?.some(term => metaphor.toLowerCase().includes(term.toLowerCase()))) {
        continue;
      }

      const pattern = new RegExp(`\\b${this.escapeRegex(metaphor)}\\b`, 'gi');
      const matches = content.match(pattern);

      if (matches && regionMappings[targetRegion]) {
        const adapted = regionMappings[targetRegion];
        if (adapted !== metaphor) {
          adaptedContent = adaptedContent.replace(pattern, adapted);
          adaptations.push({
            original: metaphor,
            adapted,
            culturalContext: `Metaphor adapted for cultural relevance in ${REGION_CONFIGS[targetRegion].name}`,
            confidence: 0.80,
          });
        }
      }
    }

    return { content: adaptedContent, adaptations };
  }

  /**
   * Adapts cultural references for target region
   * Requirement 111.1: Adapt cultural references for target regions
   */
  private adaptCulturalReferences(
    content: string,
    targetRegion: TargetRegion,
    preserveTerms?: string[]
  ): { content: string; adaptations: CulturalReferenceAdaptation[] } {
    let adaptedContent = content;
    const adaptations: CulturalReferenceAdaptation[] = [];

    for (const [reference, data] of Object.entries(CULTURAL_REFERENCES)) {
      if (preserveTerms?.some(term => reference.toLowerCase().includes(term.toLowerCase()))) {
        continue;
      }

      const pattern = new RegExp(`\\b${this.escapeRegex(reference)}\\b`, 'gi');
      const matches = content.match(pattern);

      if (matches && data.adaptations[targetRegion]) {
        const adapted = data.adaptations[targetRegion];
        if (adapted !== reference) {
          adaptedContent = adaptedContent.replace(pattern, adapted);
          adaptations.push({
            original: reference,
            adapted,
            referenceType: data.type as CulturalReferenceAdaptation['referenceType'],
            explanation: `Cultural reference adapted for ${REGION_CONFIGS[targetRegion].name}`,
            confidence: 0.75,
          });
        }
      }
    }

    return { content: adaptedContent, adaptations };
  }

  /**
   * Converts units between metric and imperial
   * Requirement 111.2: Adjust units of measurement
   */
  private convertUnits(
    content: string,
    sourceRegion: TargetRegion,
    targetRegion: TargetRegion
  ): { content: string; conversions: UnitConversion[] } {
    const sourceConfig = REGION_CONFIGS[sourceRegion];
    const targetConfig = REGION_CONFIGS[targetRegion];

    if (sourceConfig.unitSystem === targetConfig.unitSystem) {
      return { content, conversions: [] };
    }

    let convertedContent = content;
    const conversions: UnitConversion[] = [];

    // Pattern to match numbers followed by units
    const unitPattern = /(\d+(?:\.\d+)?)\s*(miles?|feet|foot|inch(?:es)?|pounds?|ounces?|gallons?|°F|fahrenheit)/gi;
    
    const matches = [...content.matchAll(unitPattern)];
    
    for (const match of matches) {
      const value = parseFloat(match[1]!);
      const unit = match[2]!.toLowerCase();
      const conversionData = UNIT_CONVERSIONS[unit];

      if (conversionData) {
        let convertedValue: number;
        let targetUnit: string;

        if (targetConfig.unitSystem === 'metric') {
          // Convert to metric
          if (unit === 'fahrenheit' || unit === '°f') {
            convertedValue = (value - 32) * 5 / 9;
            targetUnit = '°C';
          } else {
            convertedValue = value * conversionData.toMetric;
            targetUnit = conversionData.metric;
          }
        } else {
          // Convert to imperial
          if (unit === 'fahrenheit' || unit === '°f') {
            convertedValue = value;
            targetUnit = '°F';
          } else {
            convertedValue = value / conversionData.toMetric;
            targetUnit = conversionData.imperial;
          }
        }

        const roundedValue = Math.round(convertedValue * 100) / 100;
        const original = match[0];
        const converted = `${roundedValue} ${targetUnit}`;

        convertedContent = convertedContent.replace(original, converted);
        conversions.push({
          original,
          converted,
          originalValue: value,
          convertedValue: roundedValue,
          originalUnit: unit,
          targetUnit,
        });
      }
    }

    return { content: convertedContent, conversions };
  }

  /**
   * Converts currency values
   * Requirement 111.2: Adjust currency
   */
  private convertCurrency(
    content: string,
    sourceRegion: TargetRegion,
    targetRegion: TargetRegion
  ): { content: string; conversions: CurrencyConversion[] } {
    const sourceConfig = REGION_CONFIGS[sourceRegion];
    const targetConfig = REGION_CONFIGS[targetRegion];

    if (sourceConfig.currency.code === targetConfig.currency.code) {
      return { content, conversions: [] };
    }

    let convertedContent = content;
    const conversions: CurrencyConversion[] = [];

    // Pattern to match currency values
    const currencyPattern = /(\$|£|€|¥|₹|R\$|A\$|C\$)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/g;
    
    const matches = [...content.matchAll(currencyPattern)];
    
    for (const match of matches) {
      const symbol = match[1]!;
      const amountStr = match[2]!.replace(/,/g, '');
      const amount = parseFloat(amountStr);

      // Determine source currency from symbol
      let sourceCurrency = sourceConfig.currency.code;
      if (symbol === '$' && !symbol.startsWith('A') && !symbol.startsWith('C')) {
        sourceCurrency = 'USD';
      } else if (symbol === '£') {
        sourceCurrency = 'GBP';
      } else if (symbol === '€') {
        sourceCurrency = 'EUR';
      } else if (symbol === '¥') {
        sourceCurrency = 'JPY';
      } else if (symbol === '₹') {
        sourceCurrency = 'INR';
      } else if (symbol === 'R$') {
        sourceCurrency = 'BRL';
      } else if (symbol === 'A$') {
        sourceCurrency = 'AUD';
      } else if (symbol === 'C$') {
        sourceCurrency = 'CAD';
      }

      const targetCurrency = targetConfig.currency.code;
      const sourceRate = EXCHANGE_RATES[sourceCurrency] ?? 1;
      const targetRate = EXCHANGE_RATES[targetCurrency] ?? 1;
      const exchangeRate = targetRate / sourceRate;
      const convertedAmount = Math.round(amount * exchangeRate * 100) / 100;

      const original = match[0];
      const targetSymbol = targetConfig.currency.symbol;
      const converted = targetConfig.currency.symbolPosition === 'before'
        ? `${targetSymbol}${convertedAmount.toLocaleString()}`
        : `${convertedAmount.toLocaleString()} ${targetSymbol}`;

      convertedContent = convertedContent.replace(original, converted);
      conversions.push({
        original,
        converted,
        originalAmount: amount,
        convertedAmount,
        originalCurrency: sourceCurrency,
        targetCurrency,
        exchangeRate,
      });
    }

    return { content: convertedContent, conversions };
  }

  /**
   * Converts date formats
   * Requirement 111.2: Adjust date formats
   */
  private convertDateFormats(
    content: string,
    sourceRegion: TargetRegion,
    targetRegion: TargetRegion
  ): { content: string; conversions: DateFormatConversion[] } {
    const sourceConfig = REGION_CONFIGS[sourceRegion];
    const targetConfig = REGION_CONFIGS[targetRegion];

    if (sourceConfig.dateFormat === targetConfig.dateFormat) {
      return { content, conversions: [] };
    }

    let convertedContent = content;
    const conversions: DateFormatConversion[] = [];

    // Pattern for MM/DD/YYYY or MM-DD-YYYY (US format)
    const mdyPattern = /\b(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12]\d|3[01])[\/\-](\d{4})\b/g;
    // Pattern for DD/MM/YYYY or DD-MM-YYYY (UK/EU format)
    const dmyPattern = /\b(0?[1-9]|[12]\d|3[01])[\/\-](0?[1-9]|1[0-2])[\/\-](\d{4})\b/g;

    if (sourceConfig.dateFormat === 'mdy') {
      const matches = [...content.matchAll(mdyPattern)];
      for (const match of matches) {
        const month = match[1]!;
        const day = match[2]!;
        const year = match[3]!;
        const separator = match[0]!.includes('/') ? '/' : '-';

        let converted: string;
        if (targetConfig.dateFormat === 'dmy') {
          converted = `${day}${separator}${month}${separator}${year}`;
        } else { // ymd
          converted = `${year}${separator}${month}${separator}${day}`;
        }

        convertedContent = convertedContent.replace(match[0], converted);
        conversions.push({
          original: match[0],
          converted,
          originalFormat: 'mdy',
          targetFormat: targetConfig.dateFormat,
        });
      }
    } else if (sourceConfig.dateFormat === 'dmy') {
      const matches = [...content.matchAll(dmyPattern)];
      for (const match of matches) {
        const day = match[1]!;
        const month = match[2]!;
        const year = match[3]!;
        const separator = match[0]!.includes('/') ? '/' : '-';

        let converted: string;
        if (targetConfig.dateFormat === 'mdy') {
          converted = `${month}${separator}${day}${separator}${year}`;
        } else { // ymd
          converted = `${year}${separator}${month}${separator}${day}`;
        }

        convertedContent = convertedContent.replace(match[0], converted);
        conversions.push({
          original: match[0],
          converted,
          originalFormat: 'dmy',
          targetFormat: targetConfig.dateFormat,
        });
      }
    }

    return { content: convertedContent, conversions };
  }

  /**
   * Checks content for cultural sensitivity issues
   * Requirement 111.3: Flag potentially offensive content for specific cultures
   */
  private checkCulturalSensitivity(content: string, targetRegions: TargetRegion[]): CulturalSensitivityFlag[] {
    const flags: CulturalSensitivityFlag[] = [];
    const lowerContent = content.toLowerCase();

    for (const [term, data] of Object.entries(SENSITIVE_TERMS)) {
      const affectedRegions = targetRegions.filter(r => data.regions.includes(r));
      if (affectedRegions.length === 0) continue;

      const pattern = new RegExp(`\\b${this.escapeRegex(term)}\\b`, 'gi');
      let match;

      while ((match = pattern.exec(lowerContent)) !== null) {
        const flag: CulturalSensitivityFlag = {
          text: match[0],
          startPosition: match.index,
          endPosition: match.index + match[0].length,
          level: data.level,
          reason: data.reason,
          affectedRegions,
        };
        if (data.suggestion) {
          flag.suggestion = data.suggestion;
        }
        flags.push(flag);
      }
    }

    return flags;
  }

  /**
   * Determines overall sensitivity level from flags
   */
  private determineOverallSensitivityLevel(flags: CulturalSensitivityFlag[]): SensitivityLevel {
    if (flags.length === 0) return 'low';
    
    const levels: SensitivityLevel[] = ['low', 'medium', 'high', 'critical'];
    let maxLevel: SensitivityLevel = 'low';

    for (const flag of flags) {
      if (levels.indexOf(flag.level) > levels.indexOf(maxLevel)) {
        maxLevel = flag.level;
      }
    }

    return maxLevel;
  }

  /**
   * Calculates cultural appropriateness score
   * Requirement 111.5: Provide a cultural appropriateness score
   */
  private calculateCulturalAppropriatenessScore(
    sensitivityFlags: CulturalSensitivityFlag[],
    adaptationsCount: number
  ): number {
    let score = 100;

    // Deduct points for sensitivity flags
    for (const flag of sensitivityFlags) {
      switch (flag.level) {
        case 'critical':
          score -= 30;
          break;
        case 'high':
          score -= 20;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    }

    // Add points for successful adaptations (up to 10 points)
    score += Math.min(adaptationsCount * 2, 10);

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Escapes special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

/** Singleton instance */
export const localizationService = new LocalizationService();
