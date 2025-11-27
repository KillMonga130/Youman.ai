/**
 * Content Anonymization Tests
 * Tests for PII detection and content anonymization
 * Requirements: 104
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AnonymizationService } from './anonymization.service';

describe('AnonymizationService', () => {
  let service: AnonymizationService;

  beforeEach(() => {
    service = new AnonymizationService();
    service.resetCounters();
  });

  describe('detectPII', () => {
    it('should detect email addresses', async () => {
      const text = 'Contact me at john.doe@example.com for more info.';
      const result = await service.detectPII(text, ['email']);

      expect(result.success).toBe(true);
      expect(result.entities.length).toBe(1);
      expect(result.entities[0]?.type).toBe('email');
      expect(result.entities[0]?.value).toBe('john.doe@example.com');
    });

    it('should detect phone numbers', async () => {
      const text = 'Call me at (555) 123-4567 or 555-987-6543.';
      const result = await service.detectPII(text, ['phone']);

      expect(result.success).toBe(true);
      expect(result.entities.length).toBeGreaterThanOrEqual(1);
      expect(result.entities[0]?.type).toBe('phone');
    });

    it('should detect SSN', async () => {
      const text = 'My SSN is 123-45-6789.';
      const result = await service.detectPII(text, ['ssn']);

      expect(result.success).toBe(true);
      expect(result.entities.length).toBe(1);
      expect(result.entities[0]?.type).toBe('ssn');
      expect(result.entities[0]?.value).toBe('123-45-6789');
    });


    it('should detect addresses', async () => {
      const text = 'I live at 123 Main Street in the city.';
      const result = await service.detectPII(text, ['address']);

      expect(result.success).toBe(true);
      expect(result.entities.length).toBe(1);
      expect(result.entities[0]?.type).toBe('address');
    });

    it('should detect IP addresses', async () => {
      const text = 'The server IP is 192.168.1.100.';
      const result = await service.detectPII(text, ['ip_address']);

      expect(result.success).toBe(true);
      expect(result.entities.length).toBe(1);
      expect(result.entities[0]?.type).toBe('ip_address');
      expect(result.entities[0]?.value).toBe('192.168.1.100');
    });

    it('should detect multiple PII types', async () => {
      const text = 'Contact John Smith at john@example.com or call 555-123-4567.';
      const result = await service.detectPII(text, ['name', 'email', 'phone']);

      expect(result.success).toBe(true);
      expect(result.entities.length).toBeGreaterThanOrEqual(2);
    });

    it('should return empty entities for text without PII', async () => {
      const text = 'This is a simple text without any personal information.';
      const result = await service.detectPII(text, ['email', 'phone', 'ssn']);

      expect(result.success).toBe(true);
      expect(result.entities.length).toBe(0);
      expect(result.riskLevel).toBe('low');
    });

    it('should assess risk level correctly', async () => {
      const text = 'SSN: 123-45-6789, Card: 4111-1111-1111-1111';
      const result = await service.detectPII(text, ['ssn', 'credit_card']);

      expect(result.success).toBe(true);
      expect(['high', 'critical']).toContain(result.riskLevel);
    });
  });

  describe('anonymize', () => {
    it('should anonymize email addresses', async () => {
      const text = 'Contact me at john.doe@example.com for more info.';
      const result = await service.anonymize(text, { piiTypes: ['email'] });

      expect(result.success).toBe(true);
      expect(result.anonymizedText).not.toContain('john.doe@example.com');
      expect(result.entitiesAnonymized).toBe(1);
    });

    it('should anonymize phone numbers', async () => {
      const text = 'Call me at (555) 123-4567.';
      const result = await service.anonymize(text, { piiTypes: ['phone'] });

      expect(result.success).toBe(true);
      expect(result.anonymizedText).not.toContain('(555) 123-4567');
      expect(result.entitiesAnonymized).toBeGreaterThanOrEqual(1);
    });

    it('should create de-anonymization mapping', async () => {
      const text = 'Contact john@example.com for details.';
      const result = await service.anonymize(text, {
        piiTypes: ['email'],
        createMapping: true,
      });

      expect(result.success).toBe(true);
      expect(result.deAnonymizationMap).toBeDefined();
      expect(result.deAnonymizationMap?.mappings.length).toBe(1);
    });

    it('should use consistent replacements for same values', async () => {
      const text = 'Email john@example.com or john@example.com again.';
      const result = await service.anonymize(text, { piiTypes: ['email'] });

      expect(result.success).toBe(true);
      // The same email should be replaced with the same value
      const matches = result.anonymizedText.match(/\w+\d+@example\.com/g);
      if (matches && matches.length >= 2) {
        expect(matches[0]).toBe(matches[1]);
      }
    });

    it('should preserve format when configured', async () => {
      const text = 'SSN: 123-45-6789';
      const result = await service.anonymize(text, {
        piiTypes: ['ssn'],
        preserveFormat: true,
      });

      expect(result.success).toBe(true);
      // Should have XXX-XX-XXXX format
      expect(result.anonymizedText).toMatch(/XXX-XX-\d{4}/);
    });
  });


  describe('deAnonymize', () => {
    it('should restore original values using mapping', async () => {
      const originalText = 'Contact john@example.com for details.';
      const anonymizeResult = await service.anonymize(originalText, {
        piiTypes: ['email'],
        createMapping: true,
      });

      expect(anonymizeResult.success).toBe(true);
      expect(anonymizeResult.deAnonymizationMap).toBeDefined();

      const deAnonymizeResult = await service.deAnonymize(
        anonymizeResult.anonymizedText,
        anonymizeResult.deAnonymizationMap!.id
      );

      expect(deAnonymizeResult.success).toBe(true);
      expect(deAnonymizeResult.deAnonymizedText).toContain('john@example.com');
      expect(deAnonymizeResult.entitiesRestored).toBe(1);
    });

    it('should fail with invalid map ID', async () => {
      const result = await service.deAnonymize('Some text', 'invalid-map-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('generateHIPAAReport', () => {
    it('should identify HIPAA violations', async () => {
      const text = 'Patient John Smith, SSN 123-45-6789, email john@hospital.com';
      const report = await service.generateHIPAAReport(text);

      expect(report.isCompliant).toBe(false);
      expect(report.identifiersFound.length).toBeGreaterThan(0);
      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    it('should report compliant for clean text', async () => {
      const text = 'This is a general medical article about health.';
      const report = await service.generateHIPAAReport(text);

      expect(report.isCompliant).toBe(true);
      expect(report.identifiersFound.length).toBe(0);
      expect(report.compliancePercentage).toBe(100);
    });
  });

  describe('realistic replacements', () => {
    it('should generate realistic name replacements', async () => {
      const text = 'Contact John Smith for more information.';
      const result = await service.anonymize(text, {
        piiTypes: ['name'],
        useRealisticReplacements: true,
      });

      expect(result.success).toBe(true);
      // Should contain a realistic name, not [NAME_1]
      expect(result.anonymizedText).not.toContain('[NAME');
    });

    it('should generate realistic email replacements', async () => {
      const text = 'Email: test@company.com';
      const result = await service.anonymize(text, {
        piiTypes: ['email'],
        useRealisticReplacements: true,
      });

      expect(result.success).toBe(true);
      expect(result.anonymizedText).toContain('@example.com');
    });

    it('should generate generic replacements when configured', async () => {
      const text = 'Email: test@company.com';
      const result = await service.anonymize(text, {
        piiTypes: ['email'],
        useRealisticReplacements: false,
      });

      expect(result.success).toBe(true);
      expect(result.anonymizedText).toContain('[EMAIL_');
    });
  });

  describe('HIPAA compliance mode', () => {
    it('should detect all HIPAA identifiers when enabled', async () => {
      const text = `
        Patient: John Smith
        SSN: 123-45-6789
        Email: john@hospital.com
        Phone: (555) 123-4567
        MRN: MRN-123456
        Address: 123 Main Street
      `;
      const result = await service.anonymize(text, {
        hipaaCompliant: true,
      });

      expect(result.success).toBe(true);
      expect(result.hipaaCompliant).toBe(true);
      expect(result.entitiesAnonymized).toBeGreaterThan(0);
    });
  });

  describe('de-anonymization map management', () => {
    it('should retrieve stored map', async () => {
      const text = 'Contact john@example.com';
      const result = await service.anonymize(text, {
        piiTypes: ['email'],
        createMapping: true,
      });

      const map = service.getDeAnonymizationMap(result.deAnonymizationMap!.id);
      expect(map).toBeDefined();
      expect(map?.mappings.length).toBe(1);
    });

    it('should delete map', async () => {
      const text = 'Contact john@example.com';
      const result = await service.anonymize(text, {
        piiTypes: ['email'],
        createMapping: true,
      });

      const deleted = service.deleteDeAnonymizationMap(result.deAnonymizationMap!.id);
      expect(deleted).toBe(true);

      const map = service.getDeAnonymizationMap(result.deAnonymizationMap!.id);
      expect(map).toBeNull();
    });
  });
});
