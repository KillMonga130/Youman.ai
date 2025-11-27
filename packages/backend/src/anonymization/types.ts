/**
 * Content Anonymization Types
 * Type definitions for PII detection and content anonymization
 * Requirements: 104
 */

/**
 * Types of PII that can be detected
 */
export type PIIType =
  | 'name'
  | 'email'
  | 'phone'
  | 'address'
  | 'ssn'
  | 'credit_card'
  | 'date_of_birth'
  | 'medical_record_number'
  | 'health_plan_id'
  | 'account_number'
  | 'license_number'
  | 'ip_address'
  | 'url'
  | 'custom';

/**
 * Detected PII entity
 */
export interface PIIEntity {
  /** Type of PII detected */
  type: PIIType;
  /** Original value found in text */
  value: string;
  /** Start position in original text */
  startPosition: number;
  /** End position in original text */
  endPosition: number;
  /** Confidence score (0-1) */
  confidence: number;
  /** Context around the entity */
  context?: string;
}

/**
 * Replacement mapping for de-anonymization
 */
export interface ReplacementMapping {
  /** Unique identifier for this mapping */
  id: string;
  /** Original PII value */
  original: string;
  /** Replacement value used */
  replacement: string;
  /** Type of PII */
  type: PIIType;
  /** Hash of original for verification */
  originalHash: string;
}

/**
 * De-anonymization map for reversing anonymization
 */
export interface DeAnonymizationMap {
  /** Unique identifier */
  id: string;
  /** Document or text identifier */
  documentId: string;
  /** User who created the anonymization */
  userId: string;
  /** All replacement mappings */
  mappings: ReplacementMapping[];
  /** Created timestamp */
  createdAt: Date;
  /** Expiration timestamp (for security) */
  expiresAt?: Date;
  /** Whether the map is encrypted */
  isEncrypted: boolean;
}

/**
 * Anonymization configuration
 */
export interface AnonymizationConfig {
  /** PII types to detect and anonymize */
  piiTypes: PIIType[];
  /** Whether to generate realistic replacements */
  useRealisticReplacements: boolean;
  /** Whether to preserve format (e.g., phone number format) */
  preserveFormat: boolean;
  /** Whether to create de-anonymization mapping */
  createMapping: boolean;
  /** Custom patterns to detect */
  customPatterns?: CustomPattern[];
  /** HIPAA compliance mode */
  hipaaCompliant: boolean;
  /** Minimum confidence threshold for detection */
  confidenceThreshold: number;
}

/**
 * Custom pattern for PII detection
 */
export interface CustomPattern {
  /** Pattern name */
  name: string;
  /** Regex pattern */
  pattern: RegExp;
  /** Replacement generator function name */
  replacementType: 'random' | 'sequential' | 'hash' | 'custom';
  /** Custom replacement value (if replacementType is 'custom') */
  customReplacement?: string;
}

/**
 * Anonymization result
 */
export interface AnonymizationResult {
  /** Whether anonymization was successful */
  success: boolean;
  /** Original text */
  originalText: string;
  /** Anonymized text */
  anonymizedText: string;
  /** Detected PII entities */
  detectedEntities: PIIEntity[];
  /** Number of entities anonymized */
  entitiesAnonymized: number;
  /** De-anonymization map (if created) */
  deAnonymizationMap?: DeAnonymizationMap;
  /** Processing time in milliseconds */
  processingTimeMs: number;
  /** Error message if failed */
  error?: string;
  /** HIPAA compliance status */
  hipaaCompliant: boolean;
}

/**
 * De-anonymization result
 */
export interface DeAnonymizationResult {
  /** Whether de-anonymization was successful */
  success: boolean;
  /** Anonymized text input */
  anonymizedText: string;
  /** De-anonymized text output */
  deAnonymizedText: string;
  /** Number of entities restored */
  entitiesRestored: number;
  /** Processing time in milliseconds */
  processingTimeMs: number;
  /** Error message if failed */
  error?: string;
}

/**
 * PII detection result
 */
export interface PIIDetectionResult {
  /** Whether detection was successful */
  success: boolean;
  /** Text that was analyzed */
  text: string;
  /** Detected PII entities */
  entities: PIIEntity[];
  /** Total count of PII found */
  totalCount: number;
  /** Count by PII type */
  countByType: Record<PIIType, number>;
  /** Processing time in milliseconds */
  processingTimeMs: number;
  /** Risk level assessment */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  /** Error message if failed */
  error?: string;
}

/**
 * HIPAA-specific entity types (18 identifiers)
 */
export type HIPAAIdentifier =
  | 'name'
  | 'geographic_data'
  | 'dates'
  | 'phone_number'
  | 'fax_number'
  | 'email'
  | 'ssn'
  | 'medical_record_number'
  | 'health_plan_id'
  | 'account_number'
  | 'certificate_license_number'
  | 'vehicle_identifier'
  | 'device_identifier'
  | 'web_url'
  | 'ip_address'
  | 'biometric_identifier'
  | 'photo'
  | 'unique_identifier';

/**
 * HIPAA compliance report
 */
export interface HIPAAComplianceReport {
  /** Whether text is HIPAA compliant after anonymization */
  isCompliant: boolean;
  /** Identifiers found */
  identifiersFound: HIPAAIdentifier[];
  /** Identifiers removed */
  identifiersRemoved: HIPAAIdentifier[];
  /** Remaining identifiers (if any) */
  remainingIdentifiers: HIPAAIdentifier[];
  /** Compliance percentage */
  compliancePercentage: number;
  /** Recommendations */
  recommendations: string[];
}

/**
 * Anonymization service configuration
 */
export interface AnonymizationServiceConfig {
  /** Default PII types to detect */
  defaultPIITypes: PIIType[];
  /** Default confidence threshold */
  defaultConfidenceThreshold: number;
  /** Maximum text length for processing */
  maxTextLength: number;
  /** Processing timeout in milliseconds */
  timeout: number;
  /** Whether to enable HIPAA mode by default */
  defaultHIPAAMode: boolean;
  /** Encryption key for de-anonymization maps */
  encryptionKey?: string;
}

/**
 * Realistic name data for replacements
 */
export interface NameData {
  firstName: string;
  lastName: string;
  fullName: string;
  gender: 'male' | 'female' | 'neutral';
}

/**
 * Realistic address data for replacements
 */
export interface AddressData {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  fullAddress: string;
}
