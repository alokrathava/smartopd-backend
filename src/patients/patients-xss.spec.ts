/**
 * XSS Vulnerability Test
 *
 * Verifies that patient API sanitizes HTML input to prevent stored XSS attacks
 */

import { CreatePatientDto } from './dto/create-patient.dto';
import { plainToInstance } from 'class-transformer';

describe('Patients XSS Protection', () => {
  describe('CreatePatientDto sanitization', () => {
    it('should escape HTML special characters in firstName', async () => {
      const payload = {
        firstName: '<img src=x onerror="alert(1)">',
        lastName: 'Test',
        dateOfBirth: '1990-01-01',
        gender: 'MALE',
        phone: '+916123456789',
        consentGiven: true,
      };

      const dto = plainToInstance(CreatePatientDto, payload);

      // firstName should have critical HTML characters escaped
      // Most important: < > " are escaped to prevent XSS
      expect(dto.firstName).toBe(
        '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;',
      );
      expect(dto.firstName).not.toContain('<');
      expect(dto.firstName).not.toContain('>');
    });

    it('should escape HTML in address field', async () => {
      const payload = {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        gender: 'MALE',
        phone: '+916123456789',
        address: '<script>alert("XSS")</script>',
        consentGiven: true,
      };

      const dto = plainToInstance(CreatePatientDto, payload);

      expect(dto.address).not.toContain('<script>');
      expect(dto.address).toContain('&lt;script&gt;');
    });

    it('should escape HTML in emergencyContactName', async () => {
      const payload = {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        gender: 'MALE',
        phone: '+916123456789',
        emergencyContactName: '"><svg onload=alert(1)>',
        consentGiven: true,
      };

      const dto = plainToInstance(CreatePatientDto, payload);

      expect(dto.emergencyContactName).not.toContain('<svg');
      expect(dto.emergencyContactName).toContain('&quot;&gt;&lt;svg');
    });

    it('should escape HTML in JSON fields (allergies, chronicConditions, insuranceInfo)', async () => {
      const payload = {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        gender: 'MALE',
        phone: '+916123456789',
        allergies: '["<iframe src=evil.com>", "Penicillin"]',
        chronicConditions: '{"disease": "<img src=x>"}',
        insuranceInfo: '{"provider": "<script>alert(1)</script>"}',
        consentGiven: true,
      };

      const dto = plainToInstance(CreatePatientDto, payload);

      // All should be escaped
      expect(dto.allergies).not.toContain('<iframe');
      expect(dto.chronicConditions).not.toContain('<img');
      expect(dto.insuranceInfo).not.toContain('<script>');
    });

    it('should escape HTML in email field', async () => {
      const payload = {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        gender: 'MALE',
        phone: '+916123456789',
        email: 'test+<img onerror=alert(1)>@example.com',
        consentGiven: true,
      };

      const dto = plainToInstance(CreatePatientDto, payload);

      expect(dto.email).not.toContain('<img');
      expect(dto.email).toContain('&lt;img');
    });

    it('should escape multiple HTML entities', async () => {
      const payload = {
        firstName: 'John & <test> "quotes" \'apostrophe\'',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        gender: 'MALE',
        phone: '+916123456789',
        consentGiven: true,
      };

      const dto = plainToInstance(CreatePatientDto, payload);

      expect(dto.firstName).toBe(
        'John &amp; &lt;test&gt; &quot;quotes&quot; &#39;apostrophe&#39;',
      );
    });

    it('should allow null/undefined values', async () => {
      const payload = {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        gender: 'MALE',
        phone: '+916123456789',
        address: undefined,
        emergencyContactName: null,
        consentGiven: true,
      };

      const dto = plainToInstance(CreatePatientDto, payload);

      // Should not crash, values should be empty strings or original
      expect(dto.address).toBeUndefined();
      expect(dto.emergencyContactName).toBeNull();
    });
  });
});
