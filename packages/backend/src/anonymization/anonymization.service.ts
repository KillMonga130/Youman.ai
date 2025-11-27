/**
 * Content Anonymization Service
 * Provides PII detection, anonymization, and de-anonymization capabilities
 * with HIPAA compliance support
 * Requirements: 104
 */

import crypto from 'crypto';
import { logger } from '../utils/logger';
import {
  PIIType,
  PIIEntity,
  ReplacementMapping,
  DeAnonymizationMap,
  AnonymizationConfig,
  AnonymizationResult,
  DeAnonymizationResult,
  PIIDetectionResult,
  HIPAAComplianceReport,
  HIPAAIdentifier,
  AnonymizationServiceConfig,
  NameData,
  AddressData,
} from './types';

/** Default timeout for processing (30 seconds) */
const DEFAULT_TIMEOUT = 30000;

/** Maximum text length for processing */
const MAX_TEXT_LENGTH = 1000000;

/** Default confidence threshold */
const DEFAULT_CONFIDENCE_THRESHOLD = 0.7;


/**
 * PII detection patterns
 */
const PII_PATTERNS: Record<PIIType, RegExp> = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g,
  ssn: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
  credit_card: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  ip_address: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  url: /\bhttps?:\/\/[^\s<>"{}|\\^`[\]]+/gi,
  date_of_birth: /\b(?:0?[1-9]|1[0-2])[-/](?:0?[1-9]|[12]\d|3[01])[-/](?:19|20)\d{2}\b/g,
  medical_record_number: /\b(?:MRN|MR#?|Medical Record)[-:\s]?\d{6,12}\b/gi,
  health_plan_id: /\b(?:HP|Health Plan|Member)[-:\s#]?\d{8,12}\b/gi,
  account_number: /\b(?:Account|Acct)[-:\s#]?\d{8,16}\b/gi,
  license_number: /\b[A-Z]{1,2}\d{6,8}\b/g,
  name: /\b(?:[A-Z][a-z]+\s+){1,2}[A-Z][a-z]+\b/g,
  address: /\b\d{1,5}\s+(?:[A-Za-z]+\s+){1,4}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Way|Place|Pl)\.?\b/gi,
  custom: /(?:)/g, // Placeholder for custom patterns
};

/**
 * HIPAA identifier mapping to PII types
 */
const HIPAA_TO_PII_MAP: Record<HIPAAIdentifier, PIIType[]> = {
  name: ['name'],
  geographic_data: ['address'],
  dates: ['date_of_birth'],
  phone_number: ['phone'],
  fax_number: ['phone'],
  email: ['email'],
  ssn: ['ssn'],
  medical_record_number: ['medical_record_number'],
  health_plan_id: ['health_plan_id'],
  account_number: ['account_number'],
  certificate_license_number: ['license_number'],
  vehicle_identifier: ['custom'],
  device_identifier: ['custom'],
  web_url: ['url'],
  ip_address: ['ip_address'],
  biometric_identifier: ['custom'],
  photo: ['custom'],
  unique_identifier: ['custom'],
};


/**
 * Realistic first names for replacement generation
 */
const FIRST_NAMES: NameData[] = [
  { firstName: 'James', lastName: 'Smith', fullName: 'James Smith', gender: 'male' },
  { firstName: 'Mary', lastName: 'Johnson', fullName: 'Mary Johnson', gender: 'female' },
  { firstName: 'Robert', lastName: 'Williams', fullName: 'Robert Williams', gender: 'male' },
  { firstName: 'Patricia', lastName: 'Brown', fullName: 'Patricia Brown', gender: 'female' },
  { firstName: 'John', lastName: 'Jones', fullName: 'John Jones', gender: 'male' },
  { firstName: 'Jennifer', lastName: 'Garcia', fullName: 'Jennifer Garcia', gender: 'female' },
  { firstName: 'Michael', lastName: 'Miller', fullName: 'Michael Miller', gender: 'male' },
  { firstName: 'Linda', lastName: 'Davis', fullName: 'Linda Davis', gender: 'female' },
  { firstName: 'David', lastName: 'Rodriguez', fullName: 'David Rodriguez', gender: 'male' },
  { firstName: 'Elizabeth', lastName: 'Martinez', fullName: 'Elizabeth Martinez', gender: 'female' },
  { firstName: 'Alex', lastName: 'Taylor', fullName: 'Alex Taylor', gender: 'neutral' },
  { firstName: 'Jordan', lastName: 'Anderson', fullName: 'Jordan Anderson', gender: 'neutral' },
];

/**
 * Realistic addresses for replacement generation
 */
const ADDRESSES: AddressData[] = [
  { street: '123 Main Street', city: 'Springfield', state: 'IL', zipCode: '62701', country: 'USA', fullAddress: '123 Main Street, Springfield, IL 62701' },
  { street: '456 Oak Avenue', city: 'Riverside', state: 'CA', zipCode: '92501', country: 'USA', fullAddress: '456 Oak Avenue, Riverside, CA 92501' },
  { street: '789 Pine Road', city: 'Madison', state: 'WI', zipCode: '53703', country: 'USA', fullAddress: '789 Pine Road, Madison, WI 53703' },
  { street: '321 Elm Boulevard', city: 'Portland', state: 'OR', zipCode: '97201', country: 'USA', fullAddress: '321 Elm Boulevard, Portland, OR 97201' },
  { street: '654 Maple Drive', city: 'Austin', state: 'TX', zipCode: '78701', country: 'USA', fullAddress: '654 Maple Drive, Austin, TX 78701' },
];

/**
 * In-memory storage for de-anonymization maps
 */
const deAnonymizationMaps = new Map<string, DeAnonymizationMap>();


/**
 * Anonymization Service class
 * Handles PII detection, anonymization, and de-anonymization
 */
export class AnonymizationService {
  private config: AnonymizationServiceConfig;
  private replacementCounter: Map<PIIType, number> = new Map();

  constructor(serviceConfig?: Partial<AnonymizationServiceConfig>) {
    this.config = this.buildConfig(serviceConfig);
  }

  /**
   * Builds the service configuration
   */
  private buildConfig(overrides?: Partial<AnonymizationServiceConfig>): AnonymizationServiceConfig {
    return {
      defaultPIITypes: overrides?.defaultPIITypes ?? ['name', 'email', 'phone', 'address', 'ssn'],
      defaultConfidenceThreshold: overrides?.defaultConfidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD,
      maxTextLength: overrides?.maxTextLength ?? MAX_TEXT_LENGTH,
      timeout: overrides?.timeout ?? DEFAULT_TIMEOUT,
      defaultHIPAAMode: overrides?.defaultHIPAAMode ?? false,
      encryptionKey: overrides?.encryptionKey,
    };
  }

  /**
   * Detects PII in text
   * @param text - Text to analyze
   * @param piiTypes - Types of PII to detect
   * @param confidenceThreshold - Minimum confidence threshold
   * @returns Detection result
   */
  async detectPII(
    text: string,
    piiTypes: PIIType[] = this.config.defaultPIITypes,
    confidenceThreshold: number = this.config.defaultConfidenceThreshold
  ): Promise<PIIDetectionResult> {
    const startTime = Date.now();
    const entities: PIIEntity[] = [];
    const countByType: Record<PIIType, number> = {} as Record<PIIType, number>;

    try {
      if (text.length > this.config.maxTextLength) {
        return {
          success: false,
          text,
          entities: [],
          totalCount: 0,
          countByType: {} as Record<PIIType, number>,
          processingTimeMs: Date.now() - startTime,
          riskLevel: 'low',
          error: `Text exceeds maximum length of ${this.config.maxTextLength} characters`,
        };
      }

      // Initialize counts
      for (const type of piiTypes) {
        countByType[type] = 0;
      }


      // Detect each PII type
      for (const type of piiTypes) {
        const pattern = PII_PATTERNS[type];
        if (!pattern || type === 'custom') continue;

        const matches = text.matchAll(new RegExp(pattern.source, pattern.flags));
        for (const match of matches) {
          const confidence = this.calculateConfidence(type, match[0], text);
          if (confidence >= confidenceThreshold) {
            entities.push({
              type,
              value: match[0],
              startPosition: match.index ?? 0,
              endPosition: (match.index ?? 0) + match[0].length,
              confidence,
              context: this.extractContext(text, match.index ?? 0, match[0].length),
            });
            countByType[type] = (countByType[type] ?? 0) + 1;
          }
        }
      }

      // Sort entities by position
      entities.sort((a, b) => a.startPosition - b.startPosition);

      const totalCount = entities.length;
      const riskLevel = this.assessRiskLevel(entities);

      return {
        success: true,
        text,
        entities,
        totalCount,
        countByType,
        processingTimeMs: Date.now() - startTime,
        riskLevel,
      };
    } catch (error) {
      logger.error('Error detecting PII:', error);
      return {
        success: false,
        text,
        entities: [],
        totalCount: 0,
        countByType: {} as Record<PIIType, number>,
        processingTimeMs: Date.now() - startTime,
        riskLevel: 'low',
        error: (error as Error).message,
      };
    }
  }


  /**
   * Anonymizes text by replacing PII with realistic replacements
   * @param text - Text to anonymize
   * @param config - Anonymization configuration
   * @returns Anonymization result
   */
  async anonymize(
    text: string,
    config: Partial<AnonymizationConfig> = {}
  ): Promise<AnonymizationResult> {
    const startTime = Date.now();
    const fullConfig: AnonymizationConfig = {
      piiTypes: config.piiTypes ?? this.config.defaultPIITypes,
      useRealisticReplacements: config.useRealisticReplacements ?? true,
      preserveFormat: config.preserveFormat ?? true,
      createMapping: config.createMapping ?? true,
      customPatterns: config.customPatterns ?? [],
      hipaaCompliant: config.hipaaCompliant ?? this.config.defaultHIPAAMode,
      confidenceThreshold: config.confidenceThreshold ?? this.config.defaultConfidenceThreshold,
    };

    try {
      // If HIPAA compliant, ensure all HIPAA identifiers are included
      if (fullConfig.hipaaCompliant) {
        fullConfig.piiTypes = this.getHIPAAPIITypes();
      }

      // Detect PII
      const detection = await this.detectPII(
        text,
        fullConfig.piiTypes,
        fullConfig.confidenceThreshold
      );

      if (!detection.success) {
        return {
          success: false,
          originalText: text,
          anonymizedText: text,
          detectedEntities: [],
          entitiesAnonymized: 0,
          processingTimeMs: Date.now() - startTime,
          error: detection.error,
          hipaaCompliant: false,
        };
      }

      // Generate replacements and anonymize
      const mappings: ReplacementMapping[] = [];
      let anonymizedText = text;
      const replacementCache = new Map<string, string>();

      // Process entities in reverse order to maintain positions
      const sortedEntities = [...detection.entities].sort(
        (a, b) => b.startPosition - a.startPosition
      );


      for (const entity of sortedEntities) {
        // Check if we already have a replacement for this value
        let replacement = replacementCache.get(entity.value);
        
        if (!replacement) {
          replacement = fullConfig.useRealisticReplacements
            ? this.generateRealisticReplacement(entity.type, entity.value, fullConfig.preserveFormat)
            : this.generateGenericReplacement(entity.type);
          replacementCache.set(entity.value, replacement);
        }

        // Create mapping
        if (fullConfig.createMapping) {
          mappings.push({
            id: this.generateId('map'),
            original: entity.value,
            replacement,
            type: entity.type,
            originalHash: this.hashValue(entity.value),
          });
        }

        // Replace in text
        anonymizedText =
          anonymizedText.substring(0, entity.startPosition) +
          replacement +
          anonymizedText.substring(entity.endPosition);
      }

      // Create de-anonymization map if requested
      let deAnonymizationMap: DeAnonymizationMap | undefined;
      if (fullConfig.createMapping && mappings.length > 0) {
        deAnonymizationMap = {
          id: this.generateId('deanon'),
          documentId: this.generateId('doc'),
          userId: 'system',
          mappings: mappings.reverse(), // Restore original order
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          isEncrypted: false,
        };
        deAnonymizationMaps.set(deAnonymizationMap.id, deAnonymizationMap);
      }

      return {
        success: true,
        originalText: text,
        anonymizedText,
        detectedEntities: detection.entities,
        entitiesAnonymized: sortedEntities.length,
        deAnonymizationMap,
        processingTimeMs: Date.now() - startTime,
        hipaaCompliant: fullConfig.hipaaCompliant,
      };
    } catch (error) {
      logger.error('Error anonymizing text:', error);
      return {
        success: false,
        originalText: text,
        anonymizedText: text,
        detectedEntities: [],
        entitiesAnonymized: 0,
        processingTimeMs: Date.now() - startTime,
        error: (error as Error).message,
        hipaaCompliant: false,
      };
    }
  }


  /**
   * De-anonymizes text using a de-anonymization map
   * @param anonymizedText - Text to de-anonymize
   * @param mapId - ID of the de-anonymization map
   * @returns De-anonymization result
   */
  async deAnonymize(
    anonymizedText: string,
    mapId: string
  ): Promise<DeAnonymizationResult> {
    const startTime = Date.now();

    try {
      const map = deAnonymizationMaps.get(mapId);
      if (!map) {
        return {
          success: false,
          anonymizedText,
          deAnonymizedText: anonymizedText,
          entitiesRestored: 0,
          processingTimeMs: Date.now() - startTime,
          error: 'De-anonymization map not found',
        };
      }

      // Check expiration
      if (map.expiresAt && new Date() > map.expiresAt) {
        return {
          success: false,
          anonymizedText,
          deAnonymizedText: anonymizedText,
          entitiesRestored: 0,
          processingTimeMs: Date.now() - startTime,
          error: 'De-anonymization map has expired',
        };
      }

      let deAnonymizedText = anonymizedText;
      let entitiesRestored = 0;

      // Replace all anonymized values with originals
      for (const mapping of map.mappings) {
        const regex = new RegExp(this.escapeRegex(mapping.replacement), 'g');
        const newText = deAnonymizedText.replace(regex, mapping.original);
        if (newText !== deAnonymizedText) {
          entitiesRestored++;
          deAnonymizedText = newText;
        }
      }

      return {
        success: true,
        anonymizedText,
        deAnonymizedText,
        entitiesRestored,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      logger.error('Error de-anonymizing text:', error);
      return {
        success: false,
        anonymizedText,
        deAnonymizedText: anonymizedText,
        entitiesRestored: 0,
        processingTimeMs: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }


  /**
   * Generates HIPAA compliance report for text
   * @param text - Text to analyze
   * @returns HIPAA compliance report
   */
  async generateHIPAAReport(text: string): Promise<HIPAAComplianceReport> {
    const hipaaTypes = this.getHIPAAPIITypes();
    const detection = await this.detectPII(text, hipaaTypes, 0.5);

    const identifiersFound: HIPAAIdentifier[] = [];
    const identifiersRemoved: HIPAAIdentifier[] = [];
    const remainingIdentifiers: HIPAAIdentifier[] = [];

    // Map detected PII types to HIPAA identifiers
    for (const entity of detection.entities) {
      const hipaaId = this.piiTypeToHIPAAIdentifier(entity.type);
      if (hipaaId && !identifiersFound.includes(hipaaId)) {
        identifiersFound.push(hipaaId);
        remainingIdentifiers.push(hipaaId);
      }
    }

    const allHIPAAIdentifiers: HIPAAIdentifier[] = [
      'name', 'geographic_data', 'dates', 'phone_number', 'fax_number',
      'email', 'ssn', 'medical_record_number', 'health_plan_id',
      'account_number', 'certificate_license_number', 'vehicle_identifier',
      'device_identifier', 'web_url', 'ip_address', 'biometric_identifier',
      'photo', 'unique_identifier',
    ];

    const compliancePercentage = identifiersFound.length === 0
      ? 100
      : ((allHIPAAIdentifiers.length - identifiersFound.length) / allHIPAAIdentifiers.length) * 100;

    const recommendations: string[] = [];
    if (identifiersFound.includes('name')) {
      recommendations.push('Remove or replace all patient names with pseudonyms');
    }
    if (identifiersFound.includes('ssn')) {
      recommendations.push('Remove all Social Security Numbers immediately');
    }
    if (identifiersFound.includes('medical_record_number')) {
      recommendations.push('Replace medical record numbers with anonymized identifiers');
    }
    if (identifiersFound.includes('email')) {
      recommendations.push('Remove or anonymize email addresses');
    }
    if (identifiersFound.includes('phone_number')) {
      recommendations.push('Remove or anonymize phone numbers');
    }

    return {
      isCompliant: identifiersFound.length === 0,
      identifiersFound,
      identifiersRemoved,
      remainingIdentifiers,
      compliancePercentage,
      recommendations,
    };
  }


  /**
   * Gets a de-anonymization map by ID
   * @param mapId - Map ID
   * @returns De-anonymization map or null
   */
  getDeAnonymizationMap(mapId: string): DeAnonymizationMap | null {
    return deAnonymizationMaps.get(mapId) ?? null;
  }

  /**
   * Deletes a de-anonymization map
   * @param mapId - Map ID
   * @returns Whether deletion was successful
   */
  deleteDeAnonymizationMap(mapId: string): boolean {
    return deAnonymizationMaps.delete(mapId);
  }

  /**
   * Calculates confidence score for a PII match
   */
  private calculateConfidence(type: PIIType, value: string, context: string): number {
    let confidence = 0.7; // Base confidence

    switch (type) {
      case 'email':
        // Higher confidence for valid email format
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          confidence = 0.95;
        }
        break;
      case 'phone':
        // Higher confidence for standard phone formats
        if (/^\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/.test(value)) {
          confidence = 0.9;
        }
        break;
      case 'ssn':
        // High confidence for SSN format
        if (/^\d{3}-\d{2}-\d{4}$/.test(value)) {
          confidence = 0.95;
        }
        break;
      case 'name':
        // Check for common name patterns
        const words = value.split(/\s+/);
        if (words.length >= 2 && words.length <= 4) {
          confidence = 0.75;
        }
        // Lower confidence if it looks like a title or heading
        if (/^(The|A|An|Chapter|Section)\s/i.test(value)) {
          confidence = 0.3;
        }
        break;
      case 'address':
        // Higher confidence for complete addresses
        if (/\d+\s+\w+\s+(Street|St|Avenue|Ave|Road|Rd)/i.test(value)) {
          confidence = 0.85;
        }
        break;
      case 'credit_card':
        // Validate with Luhn algorithm
        if (this.validateLuhn(value.replace(/[-\s]/g, ''))) {
          confidence = 0.95;
        }
        break;
      case 'ip_address':
        // Validate IP address range
        const parts = value.split('.');
        if (parts.every(p => parseInt(p) >= 0 && parseInt(p) <= 255)) {
          confidence = 0.9;
        }
        break;
      default:
        confidence = 0.7;
    }

    return confidence;
  }


  /**
   * Generates a realistic replacement for PII
   */
  private generateRealisticReplacement(
    type: PIIType,
    originalValue: string,
    preserveFormat: boolean
  ): string {
    const counter = (this.replacementCounter.get(type) ?? 0) + 1;
    this.replacementCounter.set(type, counter);

    switch (type) {
      case 'name':
        const nameData = FIRST_NAMES[counter % FIRST_NAMES.length];
        return nameData?.fullName ?? `Person ${counter}`;

      case 'email':
        const emailName = FIRST_NAMES[counter % FIRST_NAMES.length];
        const firstName = emailName?.firstName.toLowerCase() ?? 'user';
        return `${firstName}${counter}@example.com`;

      case 'phone':
        if (preserveFormat) {
          // Preserve the format of the original phone number
          return originalValue.replace(/\d/g, () => 
            Math.floor(Math.random() * 10).toString()
          );
        }
        return `(555) 555-${String(1000 + counter).slice(-4)}`;

      case 'address':
        const addressData = ADDRESSES[counter % ADDRESSES.length];
        return addressData?.fullAddress ?? `${counter} Example Street, City, ST 00000`;

      case 'ssn':
        if (preserveFormat) {
          return `XXX-XX-${String(1000 + counter).slice(-4)}`;
        }
        return `[SSN-${counter}]`;

      case 'credit_card':
        if (preserveFormat) {
          return `XXXX-XXXX-XXXX-${String(1000 + counter).slice(-4)}`;
        }
        return `[CARD-${counter}]`;

      case 'date_of_birth':
        // Generate a random date in the past
        const year = 1950 + (counter % 50);
        const month = String((counter % 12) + 1).padStart(2, '0');
        const day = String((counter % 28) + 1).padStart(2, '0');
        return `${month}/${day}/${year}`;

      case 'medical_record_number':
        return `MRN-${String(100000 + counter).slice(-6)}`;

      case 'health_plan_id':
        return `HP-${String(10000000 + counter).slice(-8)}`;

      case 'account_number':
        return `ACCT-${String(10000000 + counter).slice(-8)}`;

      case 'license_number':
        return `LIC-${String(100000 + counter).slice(-6)}`;

      case 'ip_address':
        return `192.168.${counter % 256}.${(counter * 7) % 256}`;

      case 'url':
        return `https://example.com/page${counter}`;

      default:
        return `[REDACTED-${counter}]`;
    }
  }


  /**
   * Generates a generic replacement for PII
   */
  private generateGenericReplacement(type: PIIType): string {
    const counter = (this.replacementCounter.get(type) ?? 0) + 1;
    this.replacementCounter.set(type, counter);
    return `[${type.toUpperCase()}_${counter}]`;
  }

  /**
   * Extracts context around a match
   */
  private extractContext(text: string, position: number, length: number): string {
    const contextLength = 50;
    const start = Math.max(0, position - contextLength);
    const end = Math.min(text.length, position + length + contextLength);
    return text.substring(start, end);
  }

  /**
   * Assesses risk level based on detected entities
   */
  private assessRiskLevel(entities: PIIEntity[]): 'low' | 'medium' | 'high' | 'critical' {
    if (entities.length === 0) return 'low';

    const hasSensitive = entities.some(e => 
      ['ssn', 'credit_card', 'medical_record_number', 'health_plan_id'].includes(e.type)
    );
    const hasHighCount = entities.length > 10;
    const hasMultipleTypes = new Set(entities.map(e => e.type)).size > 3;

    if (hasSensitive && hasHighCount) return 'critical';
    if (hasSensitive) return 'high';
    if (hasHighCount || hasMultipleTypes) return 'medium';
    return 'low';
  }

  /**
   * Gets all PII types required for HIPAA compliance
   */
  private getHIPAAPIITypes(): PIIType[] {
    const types = new Set<PIIType>();
    for (const piiTypes of Object.values(HIPAA_TO_PII_MAP)) {
      for (const type of piiTypes) {
        types.add(type);
      }
    }
    return Array.from(types);
  }

  /**
   * Maps PII type to HIPAA identifier
   */
  private piiTypeToHIPAAIdentifier(type: PIIType): HIPAAIdentifier | null {
    for (const [hipaaId, piiTypes] of Object.entries(HIPAA_TO_PII_MAP)) {
      if (piiTypes.includes(type)) {
        return hipaaId as HIPAAIdentifier;
      }
    }
    return null;
  }

  /**
   * Validates credit card number using Luhn algorithm
   */
  private validateLuhn(number: string): boolean {
    let sum = 0;
    let isEven = false;
    
    for (let i = number.length - 1; i >= 0; i--) {
      let digit = parseInt(number[i] ?? '0', 10);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  }

  /**
   * Hashes a value for secure storage
   */
  private hashValue(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  /**
   * Escapes special regex characters
   */
  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Generates a unique ID
   */
  private generateId(prefix: string): string {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  /**
   * Resets the replacement counter (useful for testing)
   */
  resetCounters(): void {
    this.replacementCounter.clear();
  }
}

// Export singleton instance
export const anonymizationService = new AnonymizationService();
