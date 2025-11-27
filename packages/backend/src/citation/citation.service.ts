/**
 * Citation and Reference Management Service
 * Provides citation detection, preservation, validation, and standardization
 * Requirements: 33
 */

import crypto from 'crypto';
import { logger } from '../utils/logger';
import {
  CitationFormat,
  CitationType,
  Citation,
  CitationComponents,
  ProtectedCitationSegment,
  BibliographyEntry,
  DigitalIdentifier,
  FormatDetectionResult,
  FormatInconsistency,
  BibliographyReport,
  BibliographyError,
  MissingFieldReport,
  DuplicateEntry,
  CitationPreservationResult,
  StandardizationResult,
  CitationConversion,
  CitationServiceConfig,
  CitationAnalysisOptions,
  CitationExtractionResult,
} from './types';

/** Default timeout (10 seconds) */
const DEFAULT_TIMEOUT = 10000;

/** Minimum text length for analysis */
const MIN_TEXT_LENGTH = 10;

/** Maximum text length for analysis */
const MAX_TEXT_LENGTH = 500000;

/** Confidence threshold for format detection */
const CONFIDENCE_THRESHOLD = 0.6;

/**
 * Citation format patterns
 * Requirement 33.1: Detect APA, MLA, Chicago, and Harvard citation formats
 */
const CITATION_PATTERNS: Record<CitationFormat, { inText: RegExp[]; reference: RegExp[] }> = {
  APA: {
    inText: [
      // (Author, Year) - parenthetical
      /\(([A-Z][a-zA-Z'-]+(?:\s+(?:&|and)\s+[A-Z][a-zA-Z'-]+)*(?:\s+et\s+al\.)?),?\s*(\d{4}[a-z]?)\)/g,
      // Author (Year) - narrative
      /([A-Z][a-zA-Z'-]+(?:\s+(?:&|and)\s+[A-Z][a-zA-Z'-]+)*(?:\s+et\s+al\.)?)\s*\((\d{4}[a-z]?)\)/g,
      // (Author, Year, p. X)
      /\(([A-Z][a-zA-Z'-]+(?:\s+(?:&|and)\s+[A-Z][a-zA-Z'-]+)*),?\s*(\d{4}[a-z]?),?\s*p{1,2}\.\s*\d+(?:-\d+)?\)/g,
    ],
    reference: [
      // Author, A. A. (Year). Title. Source.
      /^[A-Z][a-zA-Z'-]+,\s*[A-Z]\.\s*(?:[A-Z]\.\s*)?(?:,\s*(?:&\s*)?[A-Z][a-zA-Z'-]+,\s*[A-Z]\.\s*(?:[A-Z]\.\s*)?)*\(\d{4}[a-z]?\)\.\s*.+/gm,
    ],
  },
  MLA: {
    inText: [
      // (Author Page) - no comma, no year
      /\(([A-Z][a-zA-Z'-]+(?:\s+(?:and)\s+[A-Z][a-zA-Z'-]+)*)\s+(\d+(?:-\d+)?)\)/g,
      // (Author)
      /\(([A-Z][a-zA-Z'-]+(?:\s+(?:and)\s+[A-Z][a-zA-Z'-]+)*)\)/g,
    ],
    reference: [
      // Author. "Title." Source, vol. X, no. X, Year, pp. X-X.
      /^[A-Z][a-zA-Z'-]+,\s*[A-Za-z]+(?:\s+[A-Za-z]+)*\.\s*".+"\s*.+,\s*(?:vol\.\s*\d+,?\s*)?(?:no\.\s*\d+,?\s*)?\d{4}/gm,
    ],
  },
  Chicago: {
    inText: [
      // Footnote markers
      /\[\d+\]/g,
      // Superscript numbers (represented as ^n)
      /\^(\d+)/g,
    ],
    reference: [
      // Author. Title. Place: Publisher, Year.
      /^[A-Z][a-zA-Z'-]+,\s*[A-Za-z]+(?:\s+[A-Za-z]+)*\.\s*.+\.\s*[A-Za-z]+:\s*[A-Za-z\s]+,\s*\d{4}\./gm,
    ],
  },
  Harvard: {
    inText: [
      // (Author Year) - no comma
      /\(([A-Z][a-zA-Z'-]+(?:\s+(?:&|and)\s+[A-Z][a-zA-Z'-]+)*(?:\s+et\s+al\.)?)\s+(\d{4}[a-z]?)\)/g,
      // Author (Year)
      /([A-Z][a-zA-Z'-]+(?:\s+(?:&|and)\s+[A-Z][a-zA-Z'-]+)*(?:\s+et\s+al\.)?)\s*\((\d{4}[a-z]?)\)/g,
    ],
    reference: [
      // Author, A. Year. Title. Source.
      /^[A-Z][a-zA-Z'-]+,\s*[A-Z]\.\s*(?:(?:&\s*)?[A-Z][a-zA-Z'-]+,\s*[A-Z]\.\s*)*\d{4}[a-z]?\.\s*.+/gm,
    ],
  },
  Unknown: {
    inText: [],
    reference: [],
  },
};

/**
 * Digital identifier patterns
 * Requirement 33.4: Maintain all digital identifiers unchanged
 */
const IDENTIFIER_PATTERNS: Record<string, RegExp> = {
  DOI: /\b(?:doi:\s*|https?:\/\/(?:dx\.)?doi\.org\/)?10\.\d{4,}(?:\.\d+)*\/[^\s]+/gi,
  URL: /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi,
  ISBN: /\bISBN[-:\s]?(?:97[89][-\s]?)?(?:\d[-\s]?){9}[\dXx]\b/gi,
  ISSN: /\bISSN[-:\s]?\d{4}[-\s]?\d{3}[\dXx]\b/gi,
  PMID: /\bPMID[-:\s]?\d+\b/gi,
  arXiv: /\barXiv:\d{4}\.\d{4,5}(?:v\d+)?\b/gi,
};

/**
 * Bibliography section markers
 */
const BIBLIOGRAPHY_MARKERS = [
  /^references?\s*$/im,
  /^bibliography\s*$/im,
  /^works?\s+cited\s*$/im,
  /^literature\s+cited\s*$/im,
  /^sources?\s*$/im,
];


/**
 * Citation and Reference Management Service
 * Handles citation detection, preservation, validation, and standardization
 */
export class CitationService {
  private config: CitationServiceConfig;

  constructor(serviceConfig?: Partial<CitationServiceConfig>) {
    this.config = this.buildConfig(serviceConfig);
  }

  /**
   * Builds service configuration
   */
  private buildConfig(overrides?: Partial<CitationServiceConfig>): CitationServiceConfig {
    return {
      defaultTimeout: overrides?.defaultTimeout ?? DEFAULT_TIMEOUT,
      minTextLength: overrides?.minTextLength ?? MIN_TEXT_LENGTH,
      maxTextLength: overrides?.maxTextLength ?? MAX_TEXT_LENGTH,
      confidenceThreshold: overrides?.confidenceThreshold ?? CONFIDENCE_THRESHOLD,
    };
  }

  /**
   * Generates unique identifier
   */
  private generateId(prefix: string): string {
    return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Detects citation format in text
   * Requirement 33.1: Detect and preserve APA, MLA, Chicago, and Harvard citation formats
   * @param text - Text to analyze
   * @returns Format detection result
   */
  async detectCitationFormat(text: string): Promise<FormatDetectionResult> {
    const startTime = Date.now();

    if (!text || text.length < this.config.minTextLength) {
      return this.createEmptyFormatResult();
    }

    const formatScores: Record<CitationFormat, number> = {
      APA: 0,
      MLA: 0,
      Chicago: 0,
      Harvard: 0,
      Unknown: 0,
    };

    const sampleCitations: Citation[] = [];
    const allCitations: Citation[] = [];

    // Analyze each format
    for (const format of ['APA', 'MLA', 'Chicago', 'Harvard'] as CitationFormat[]) {
      const patterns = CITATION_PATTERNS[format];
      
      // Check in-text citations
      for (const pattern of patterns.inText) {
        const matches = text.matchAll(new RegExp(pattern.source, pattern.flags));
        for (const match of matches) {
          formatScores[format] += 1;
          const citation = this.createCitation(match, format, 'in-text', text);
          allCitations.push(citation);
          if (sampleCitations.length < 5) {
            sampleCitations.push(citation);
          }
        }
      }

      // Check reference patterns
      for (const pattern of patterns.reference) {
        const matches = text.matchAll(new RegExp(pattern.source, pattern.flags));
        for (const match of matches) {
          formatScores[format] += 2; // Weight reference patterns higher
        }
      }
    }

    // Normalize scores
    const totalScore = Object.values(formatScores).reduce((a, b) => a + b, 0);
    if (totalScore > 0) {
      for (const format of Object.keys(formatScores) as CitationFormat[]) {
        formatScores[format] = formatScores[format] / totalScore;
      }
    }

    // Determine primary format
    let primaryFormat: CitationFormat = 'Unknown';
    let maxScore = 0;
    for (const [format, score] of Object.entries(formatScores)) {
      if (score > maxScore && format !== 'Unknown') {
        maxScore = score;
        primaryFormat = format as CitationFormat;
      }
    }

    // Check for mixed formats
    const significantFormats = Object.entries(formatScores)
      .filter(([f, s]) => f !== 'Unknown' && s > 0.2)
      .length;
    const hasMixedFormats = significantFormats > 1;

    // Find inconsistencies
    const inconsistencies = this.findFormatInconsistencies(allCitations, primaryFormat);

    const confidence = maxScore > 0 ? Math.min(1, maxScore * 1.5) : 0;

    logger.debug('Citation format detection complete', {
      primaryFormat,
      confidence,
      hasMixedFormats,
      citationsFound: allCitations.length,
    });

    return {
      primaryFormat: confidence >= this.config.confidenceThreshold ? primaryFormat : 'Unknown',
      confidence,
      formatScores,
      sampleCitations,
      hasMixedFormats,
      inconsistencies,
    };
  }

  /**
   * Preserves citations in text for transformation
   * Requirement 33.2: Maintain in-text citations and reference list integrity
   * @param text - Text to analyze
   * @returns Protected citation segments
   */
  async preserveCitations(text: string): Promise<CitationPreservationResult> {
    const startTime = Date.now();
    const protectedSegments: ProtectedCitationSegment[] = [];
    const digitalIdentifiers: DigitalIdentifier[] = [];

    if (!text || text.length < this.config.minTextLength) {
      return {
        protectedSegments: [],
        digitalIdentifiers: [],
        totalCitations: 0,
        totalReferences: 0,
        timestamp: new Date(),
      };
    }

    // Extract all citations
    const citations = this.extractAllCitations(text);
    
    // Create protected segments for each citation
    for (const citation of citations) {
      protectedSegments.push({
        id: this.generateId('seg'),
        text: citation.raw,
        startPosition: citation.startPosition,
        endPosition: citation.endPosition,
        citation,
        isReferenceEntry: citation.type === 'bibliography',
      });
    }

    // Extract digital identifiers
    const identifiers = this.extractDigitalIdentifiers(text);
    digitalIdentifiers.push(...identifiers);

    // Count reference entries
    const totalReferences = protectedSegments.filter(s => s.isReferenceEntry).length;

    logger.debug('Citation preservation complete', {
      totalCitations: citations.length,
      totalReferences,
      digitalIdentifiers: digitalIdentifiers.length,
    });

    return {
      protectedSegments,
      digitalIdentifiers,
      totalCitations: citations.length,
      totalReferences,
      timestamp: new Date(),
    };
  }

  /**
   * Validates bibliography entries
   * Requirement 33.3: Preserve all bibliographic information exactly
   * @param text - Text containing bibliography
   * @returns Bibliography validation report
   */
  async validateBibliography(text: string): Promise<BibliographyReport> {
    const startTime = Date.now();
    const id = this.generateId('bib');

    if (!text || text.length < this.config.minTextLength) {
      return this.createEmptyBibliographyReport(id, startTime);
    }

    // Find bibliography section
    const bibliographySection = this.extractBibliographySection(text);
    if (!bibliographySection) {
      return this.createEmptyBibliographyReport(id, startTime);
    }

    // Detect format
    const formatResult = await this.detectCitationFormat(bibliographySection);
    const format = formatResult.primaryFormat;

    // Parse entries
    const entries = this.parseBibliographyEntries(bibliographySection, format);
    
    // Validate entries
    const errors: BibliographyError[] = [];
    const missingFields: MissingFieldReport[] = [];
    let validCount = 0;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (!entry) continue;

      const entryErrors = this.validateBibliographyEntry(entry, format, i);
      errors.push(...entryErrors);

      const missing = this.checkMissingFields(entry, format, i);
      missingFields.push(...missing);

      if (entryErrors.length === 0) {
        validCount++;
        entry.isValid = true;
      } else {
        entry.isValid = false;
        entry.errors = entryErrors.map(e => e.message);
      }
    }

    // Find duplicates
    const duplicates = this.findDuplicateEntries(entries);

    logger.debug('Bibliography validation complete', {
      totalEntries: entries.length,
      validEntries: validCount,
      errors: errors.length,
    });

    return {
      id,
      totalEntries: entries.length,
      validEntries: validCount,
      invalidEntries: entries.length - validCount,
      format,
      entries,
      errors,
      missingFields,
      duplicates,
      timestamp: new Date(),
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Standardizes citation format
   * Requirement 33.5: Detect inconsistencies and offer to standardize formatting
   * @param text - Text to standardize
   * @param targetFormat - Target citation format
   * @returns Standardization result
   */
  async standardizeFormat(text: string, targetFormat: CitationFormat): Promise<StandardizationResult> {
    const startTime = Date.now();

    if (!text || text.length < this.config.minTextLength) {
      return {
        success: false,
        originalText: text,
        standardizedText: text,
        targetFormat,
        citationsConverted: 0,
        conversions: [],
        errors: ['Text too short for standardization'],
        processingTimeMs: Date.now() - startTime,
      };
    }

    if (targetFormat === 'Unknown') {
      return {
        success: false,
        originalText: text,
        standardizedText: text,
        targetFormat,
        citationsConverted: 0,
        conversions: [],
        errors: ['Invalid target format'],
        processingTimeMs: Date.now() - startTime,
      };
    }

    const conversions: CitationConversion[] = [];
    const errors: string[] = [];
    let standardizedText = text;

    // Extract all citations
    const citations = this.extractAllCitations(text);

    // Sort by position descending to replace from end to start
    citations.sort((a, b) => b.startPosition - a.startPosition);

    for (const citation of citations) {
      if (citation.format === targetFormat || citation.format === 'Unknown') {
        continue;
      }

      try {
        const converted = this.convertCitation(citation, targetFormat);
        if (converted && converted !== citation.raw) {
          // Replace in text
          standardizedText = 
            standardizedText.substring(0, citation.startPosition) +
            converted +
            standardizedText.substring(citation.endPosition);

          conversions.push({
            original: citation.raw,
            converted,
            sourceFormat: citation.format,
            targetFormat,
            position: citation.startPosition,
          });
        }
      } catch (error) {
        errors.push(`Failed to convert citation at position ${citation.startPosition}: ${(error as Error).message}`);
      }
    }

    logger.debug('Citation standardization complete', {
      targetFormat,
      citationsConverted: conversions.length,
      errors: errors.length,
    });

    return {
      success: errors.length === 0,
      originalText: text,
      standardizedText,
      targetFormat,
      citationsConverted: conversions.length,
      conversions,
      errors,
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Extracts all citations and analyzes text
   * @param text - Text to analyze
   * @param options - Analysis options
   * @returns Citation extraction result
   */
  async extractCitations(text: string, options?: CitationAnalysisOptions): Promise<CitationExtractionResult> {
    const startTime = Date.now();

    const citations = this.extractAllCitations(text);
    const formatDetection = await this.detectCitationFormat(text);
    const digitalIdentifiers = options?.extractIdentifiers !== false 
      ? this.extractDigitalIdentifiers(text) 
      : [];

    let bibliography: BibliographyReport | undefined;
    if (options?.validateBibliography !== false) {
      bibliography = await this.validateBibliography(text);
    }

    return {
      citations,
      formatDetection,
      digitalIdentifiers,
      bibliography,
      processingTimeMs: Date.now() - startTime,
    };
  }


  // ============ Helper Methods ============

  /**
   * Creates a citation object from a regex match
   */
  private createCitation(
    match: RegExpMatchArray,
    format: CitationFormat,
    type: CitationType,
    fullText: string
  ): Citation {
    const raw = match[0];
    const startPosition = match.index ?? 0;
    const endPosition = startPosition + raw.length;

    const components = this.parseCitationComponents(raw, format);

    return {
      id: this.generateId('cit'),
      raw,
      format,
      type,
      startPosition,
      endPosition,
      components,
      confidence: this.calculateCitationConfidence(raw, format),
    };
  }

  /**
   * Parses citation components from raw text
   */
  private parseCitationComponents(raw: string, format: CitationFormat): CitationComponents {
    const components: CitationComponents = {};

    // Extract authors
    const authorPatterns = [
      /^([A-Z][a-zA-Z'-]+(?:\s+(?:&|and)\s+[A-Z][a-zA-Z'-]+)*)/,
      /\(([A-Z][a-zA-Z'-]+(?:\s+(?:&|and)\s+[A-Z][a-zA-Z'-]+)*)/,
    ];
    for (const pattern of authorPatterns) {
      const match = raw.match(pattern);
      if (match && match[1]) {
        components.authors = match[1].split(/\s+(?:&|and)\s+/).map(a => a.trim());
        break;
      }
    }

    // Extract year
    const yearMatch = raw.match(/\b((?:19|20)\d{2}[a-z]?)\b/);
    if (yearMatch) {
      components.year = yearMatch[1];
    }

    // Extract pages
    const pageMatch = raw.match(/p{1,2}\.\s*(\d+(?:\s*-\s*\d+)?)/i);
    if (pageMatch) {
      components.pages = pageMatch[1];
    }

    // Extract DOI
    const doiMatch = raw.match(/10\.\d{4,}(?:\.\d+)*\/[^\s]+/);
    if (doiMatch) {
      components.doi = doiMatch[0];
    }

    // Extract URL
    const urlMatch = raw.match(/https?:\/\/[^\s<>"{}|\\^`\[\]]+/);
    if (urlMatch) {
      components.url = urlMatch[0];
    }

    return components;
  }

  /**
   * Calculates confidence score for a citation
   */
  private calculateCitationConfidence(raw: string, format: CitationFormat): number {
    let confidence = 0.5;

    // Check for year
    if (/\b(?:19|20)\d{2}\b/.test(raw)) {
      confidence += 0.2;
    }

    // Check for author pattern
    if (/[A-Z][a-zA-Z'-]+/.test(raw)) {
      confidence += 0.15;
    }

    // Check for format-specific patterns
    const patterns = CITATION_PATTERNS[format];
    for (const pattern of patterns.inText) {
      if (new RegExp(pattern.source, pattern.flags).test(raw)) {
        confidence += 0.15;
        break;
      }
    }

    return Math.min(1, confidence);
  }

  /**
   * Extracts all citations from text
   */
  private extractAllCitations(text: string): Citation[] {
    const citations: Citation[] = [];
    const seen = new Set<string>();

    for (const format of ['APA', 'MLA', 'Chicago', 'Harvard'] as CitationFormat[]) {
      const patterns = CITATION_PATTERNS[format];

      for (const pattern of patterns.inText) {
        const regex = new RegExp(pattern.source, pattern.flags);
        const matches = text.matchAll(regex);
        
        for (const match of matches) {
          const key = `${match.index}-${match[0]}`;
          if (!seen.has(key)) {
            seen.add(key);
            citations.push(this.createCitation(match, format, 'in-text', text));
          }
        }
      }
    }

    // Sort by position
    citations.sort((a, b) => a.startPosition - b.startPosition);

    return citations;
  }

  /**
   * Extracts digital identifiers from text
   * Requirement 33.4: Maintain all digital identifiers unchanged
   */
  private extractDigitalIdentifiers(text: string): DigitalIdentifier[] {
    const identifiers: DigitalIdentifier[] = [];
    const seen = new Set<string>();

    for (const [type, pattern] of Object.entries(IDENTIFIER_PATTERNS)) {
      const regex = new RegExp(pattern.source, pattern.flags);
      const matches = text.matchAll(regex);

      for (const match of matches) {
        const value = match[0];
        const key = `${type}-${value}`;
        
        if (!seen.has(key)) {
          seen.add(key);
          identifiers.push({
            type: type as DigitalIdentifier['type'],
            value,
            startPosition: match.index ?? 0,
            endPosition: (match.index ?? 0) + value.length,
            isValid: this.validateIdentifier(type, value),
          });
        }
      }
    }

    return identifiers;
  }

  /**
   * Validates a digital identifier
   */
  private validateIdentifier(type: string, value: string): boolean {
    switch (type) {
      case 'DOI':
        return /^10\.\d{4,}/.test(value.replace(/^(?:doi:\s*|https?:\/\/(?:dx\.)?doi\.org\/)/, ''));
      case 'ISBN':
        return this.validateISBN(value);
      case 'URL':
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      default:
        return true;
    }
  }

  /**
   * Validates ISBN checksum
   */
  private validateISBN(isbn: string): boolean {
    const digits = isbn.replace(/[^0-9Xx]/g, '');
    
    if (digits.length === 10) {
      let sum = 0;
      for (let i = 0; i < 9; i++) {
        sum += parseInt(digits[i] ?? '0', 10) * (10 - i);
      }
      const check = digits[9]?.toUpperCase() === 'X' ? 10 : parseInt(digits[9] ?? '0', 10);
      return (sum + check) % 11 === 0;
    }
    
    if (digits.length === 13) {
      let sum = 0;
      for (let i = 0; i < 12; i++) {
        sum += parseInt(digits[i] ?? '0', 10) * (i % 2 === 0 ? 1 : 3);
      }
      const check = (10 - (sum % 10)) % 10;
      return check === parseInt(digits[12] ?? '0', 10);
    }
    
    return false;
  }

  /**
   * Finds format inconsistencies in citations
   * Requirement 33.5: Detect inconsistencies
   */
  private findFormatInconsistencies(
    citations: Citation[],
    expectedFormat: CitationFormat
  ): FormatInconsistency[] {
    const inconsistencies: FormatInconsistency[] = [];

    for (const citation of citations) {
      if (citation.format !== expectedFormat && citation.format !== 'Unknown') {
        inconsistencies.push({
          citation,
          expectedFormat,
          actualFormat: citation.format,
          suggestion: `Convert from ${citation.format} to ${expectedFormat} format`,
        });
      }
    }

    return inconsistencies;
  }

  /**
   * Extracts bibliography section from text
   */
  private extractBibliographySection(text: string): string | null {
    for (const marker of BIBLIOGRAPHY_MARKERS) {
      const match = text.match(marker);
      if (match && match.index !== undefined) {
        // Return everything after the marker
        return text.substring(match.index + match[0].length).trim();
      }
    }
    return null;
  }

  /**
   * Parses bibliography entries
   */
  private parseBibliographyEntries(section: string, format: CitationFormat): BibliographyEntry[] {
    const entries: BibliographyEntry[] = [];
    
    // Split by double newlines or numbered entries
    const lines = section.split(/\n\n+|\n(?=\d+\.\s)/).filter(l => l.trim().length > 0);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      const raw = line.trim();
      if (raw.length < 10) continue; // Skip very short lines

      const components = this.parseBibliographyComponents(raw, format);

      entries.push({
        id: this.generateId('bib_entry'),
        raw,
        format,
        components,
        lineNumber: i + 1,
        isValid: true,
        errors: [],
      });
    }

    return entries;
  }

  /**
   * Parses bibliography entry components
   */
  private parseBibliographyComponents(raw: string, format: CitationFormat): CitationComponents {
    const components: CitationComponents = {};

    // Extract authors (at the beginning)
    const authorMatch = raw.match(/^([A-Z][a-zA-Z'-]+(?:,\s*[A-Z]\.?\s*(?:[A-Z]\.?\s*)?)?(?:(?:,\s*(?:&\s*)?|,\s*and\s+)[A-Z][a-zA-Z'-]+(?:,\s*[A-Z]\.?\s*(?:[A-Z]\.?\s*)?)?)*)/);
    if (authorMatch) {
      components.authors = [authorMatch[1]];
    }

    // Extract year
    const yearMatch = raw.match(/\(?((?:19|20)\d{2}[a-z]?)\)?/);
    if (yearMatch) {
      components.year = yearMatch[1];
    }

    // Extract title (usually in quotes or italics)
    const titleMatch = raw.match(/"([^"]+)"|_([^_]+)_|\*([^*]+)\*/);
    if (titleMatch) {
      components.title = titleMatch[1] || titleMatch[2] || titleMatch[3];
    }

    // Extract DOI
    const doiMatch = raw.match(/(?:doi:\s*|https?:\/\/(?:dx\.)?doi\.org\/)?10\.\d{4,}(?:\.\d+)*\/[^\s]+/i);
    if (doiMatch) {
      components.doi = doiMatch[0];
    }

    // Extract URL
    const urlMatch = raw.match(/https?:\/\/[^\s<>"{}|\\^`\[\]]+/);
    if (urlMatch && !urlMatch[0].includes('doi.org')) {
      components.url = urlMatch[0];
    }

    // Extract volume
    const volMatch = raw.match(/vol(?:ume)?\.?\s*(\d+)/i);
    if (volMatch) {
      components.volume = volMatch[1];
    }

    // Extract issue
    const issueMatch = raw.match(/(?:no|issue)\.?\s*(\d+)/i);
    if (issueMatch) {
      components.issue = issueMatch[1];
    }

    // Extract pages
    const pageMatch = raw.match(/p{1,2}\.?\s*(\d+(?:\s*[-–]\s*\d+)?)/i);
    if (pageMatch) {
      components.pages = pageMatch[1];
    }

    return components;
  }

  /**
   * Validates a bibliography entry
   */
  private validateBibliographyEntry(
    entry: BibliographyEntry,
    format: CitationFormat,
    index: number
  ): BibliographyError[] {
    const errors: BibliographyError[] = [];

    // Check for author
    if (!entry.components.authors || entry.components.authors.length === 0) {
      errors.push({
        entryIndex: index,
        entryText: entry.raw.substring(0, 50),
        errorType: 'missing_field',
        message: 'Missing author information',
        suggestion: 'Add author name(s) at the beginning of the entry',
      });
    }

    // Check for year
    if (!entry.components.year) {
      errors.push({
        entryIndex: index,
        entryText: entry.raw.substring(0, 50),
        errorType: 'missing_field',
        message: 'Missing publication year',
        suggestion: 'Add publication year in the appropriate format',
      });
    }

    // Validate year format
    if (entry.components.year && !/^(19|20)\d{2}[a-z]?$/.test(entry.components.year)) {
      errors.push({
        entryIndex: index,
        entryText: entry.raw.substring(0, 50),
        errorType: 'invalid_field',
        message: 'Invalid year format',
        suggestion: 'Year should be a 4-digit number (e.g., 2023)',
      });
    }

    return errors;
  }

  /**
   * Checks for missing required fields
   */
  private checkMissingFields(
    entry: BibliographyEntry,
    format: CitationFormat,
    index: number
  ): MissingFieldReport[] {
    const missing: MissingFieldReport[] = [];
    const requiredFields = ['authors', 'year'];
    const optionalFields = ['title', 'source', 'pages', 'doi', 'url'];

    for (const field of requiredFields) {
      if (!entry.components[field as keyof CitationComponents]) {
        missing.push({
          entryIndex: index,
          fieldName: field,
          isRequired: true,
        });
      }
    }

    for (const field of optionalFields) {
      if (!entry.components[field as keyof CitationComponents]) {
        missing.push({
          entryIndex: index,
          fieldName: field,
          isRequired: false,
        });
      }
    }

    return missing;
  }

  /**
   * Finds duplicate bibliography entries
   */
  private findDuplicateEntries(entries: BibliographyEntry[]): DuplicateEntry[] {
    const duplicates: DuplicateEntry[] = [];

    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const entry1 = entries[i];
        const entry2 = entries[j];
        if (!entry1 || !entry2) continue;

        const similarity = this.calculateEntrySimilarity(entry1, entry2);
        if (similarity > 0.8) {
          duplicates.push({
            firstIndex: i,
            duplicateIndex: j,
            similarity,
          });
        }
      }
    }

    return duplicates;
  }

  /**
   * Calculates similarity between two bibliography entries
   */
  private calculateEntrySimilarity(entry1: BibliographyEntry, entry2: BibliographyEntry): number {
    let matches = 0;
    let total = 0;

    // Compare authors
    if (entry1.components.authors && entry2.components.authors) {
      total++;
      if (entry1.components.authors.join(',') === entry2.components.authors.join(',')) {
        matches++;
      }
    }

    // Compare year
    if (entry1.components.year && entry2.components.year) {
      total++;
      if (entry1.components.year === entry2.components.year) {
        matches++;
      }
    }

    // Compare title
    if (entry1.components.title && entry2.components.title) {
      total++;
      if (entry1.components.title.toLowerCase() === entry2.components.title.toLowerCase()) {
        matches++;
      }
    }

    // Compare DOI (exact match)
    if (entry1.components.doi && entry2.components.doi) {
      total++;
      if (entry1.components.doi === entry2.components.doi) {
        matches += 2; // DOI match is strong indicator
        total++;
      }
    }

    return total > 0 ? matches / total : 0;
  }

  /**
   * Converts a citation to target format
   */
  private convertCitation(citation: Citation, targetFormat: CitationFormat): string {
    const { components } = citation;
    
    if (!components.authors || components.authors.length === 0) {
      return citation.raw; // Can't convert without author
    }

    const author = components.authors[0] ?? '';
    const year = components.year ?? '';
    const pages = components.pages ?? '';

    switch (targetFormat) {
      case 'APA':
        // (Author, Year) or (Author, Year, p. X)
        if (pages) {
          return `(${author}, ${year}, p. ${pages})`;
        }
        return `(${author}, ${year})`;

      case 'MLA':
        // (Author Page)
        if (pages) {
          return `(${author} ${pages})`;
        }
        return `(${author})`;

      case 'Harvard':
        // (Author Year) - no comma
        if (pages) {
          return `(${author} ${year}, p. ${pages})`;
        }
        return `(${author} ${year})`;

      case 'Chicago':
        // Footnote style - return as is for now
        return citation.raw;

      default:
        return citation.raw;
    }
  }

  /**
   * Creates empty format detection result
   */
  private createEmptyFormatResult(): FormatDetectionResult {
    return {
      primaryFormat: 'Unknown',
      confidence: 0,
      formatScores: {
        APA: 0,
        MLA: 0,
        Chicago: 0,
        Harvard: 0,
        Unknown: 0,
      },
      sampleCitations: [],
      hasMixedFormats: false,
      inconsistencies: [],
    };
  }

  /**
   * Creates empty bibliography report
   */
  private createEmptyBibliographyReport(id: string, startTime: number): BibliographyReport {
    return {
      id,
      totalEntries: 0,
      validEntries: 0,
      invalidEntries: 0,
      format: 'Unknown',
      entries: [],
      errors: [],
      missingFields: [],
      duplicates: [],
      timestamp: new Date(),
      processingTimeMs: Date.now() - startTime,
    };
  }
}

/** Singleton instance */
let citationServiceInstance: CitationService | null = null;

/**
 * Gets or creates the citation service instance
 */
export function getCitationService(config?: Partial<CitationServiceConfig>): CitationService {
  if (!citationServiceInstance) {
    citationServiceInstance = new CitationService(config);
  }
  return citationServiceInstance;
}

/**
 * Resets the citation service instance (for testing)
 */
export function resetCitationService(): void {
  citationServiceInstance = null;
}
