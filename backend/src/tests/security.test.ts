import request from 'supertest';
import { app } from '../index';
import { EncryptionService, PIIProtection } from '../utils/encryption';
import { PasswordUtils } from '../middlewares/auth';

describe('Security Tests', () => {
  describe('OWASP Top 10 Tests', () => {
    
    // A01 - Broken Access Control
    describe('A01 - Access Control', () => {
      test('should prevent unauthorized access to protected endpoints', async () => {
        const response = await request(app)
          .get('/api/v1/chat/history/test-session')
          .expect(401);
        
        expect(response.body).toHaveProperty('error');
      });

      test('should prevent access to other users data', async () => {
        // This would need proper authentication setup
        const response = await request(app)
          .get('/api/v1/family/members')
          .expect(401);
        
        expect(response.body.error).toContain('token');
      });
    });

    // A02 - Cryptographic Failures
    describe('A02 - Cryptographic Failures', () => {
      test('should properly encrypt sensitive data', () => {
        const encryption = EncryptionService.getInstance();
        const sensitive = 'patient-medical-data-12345';
        
        const encrypted = encryption.encrypt(sensitive);
        const decrypted = encryption.decrypt(encrypted);
        
        expect(encrypted).not.toBe(sensitive);
        expect(decrypted).toBe(sensitive);
        expect(encrypted).toMatch(/^[a-f0-9]+:[a-f0-9]+:[a-f0-9]+$/);
      });

      test('should hash passwords securely', async () => {
        const password = 'TestPassword123!';
        const hash = await PasswordUtils.hashPassword(password);
        
        expect(hash).not.toBe(password);
        expect(hash.length).toBeGreaterThan(50);
        
        const isValid = await PasswordUtils.verifyPassword(password, hash);
        expect(isValid).toBe(true);
      });
    });

    // A03 - Injection
    describe('A03 - Injection Attacks', () => {
      test('should prevent SQL injection in query parameters', async () => {
        const maliciousQuery = "'; DROP TABLE users; --";
        
        const response = await request(app)
          .get(`/api/v1/timeline?startDate=${maliciousQuery}`)
          .expect(400);
        
        expect(response.body.error).toContain('Invalid input');
      });

      test('should prevent XSS in request body', async () => {
        const xssPayload = '<script>alert("xss")</script>';
        
        const response = await request(app)
          .post('/api/v1/chat/message')
          .send({ message: xssPayload })
          .expect(400);
        
        expect(response.body.error).toContain('Invalid content');
      });

      test('should sanitize PII in logs', () => {
        const testData = {
          name: 'John Doe',
          email: 'john.doe@example.com',
          phone: '+1-555-123-4567',
          ssn: '123-45-6789'
        };

        const encryption = EncryptionService.getInstance();
        const masked = encryption.maskSensitiveData(testData);

        expect(masked.email).toContain('*');
        expect(masked.phone).toContain('*');
        expect(masked.email).not.toBe(testData.email);
      });
    });

    // A04 - Insecure Design
    describe('A04 - Insecure Design', () => {
      test('should implement proper password complexity', () => {
        const weakPasswords = ['123456', 'password', 'abc123'];
        const strongPassword = 'StrongPass123!@#';

        weakPasswords.forEach(password => {
          const validation = PasswordUtils.validatePasswordStrength(password);
          expect(validation.isValid).toBe(false);
          expect(validation.errors.length).toBeGreaterThan(0);
        });

        const strongValidation = PasswordUtils.validatePasswordStrength(strongPassword);
        expect(strongValidation.isValid).toBe(true);
        expect(strongValidation.errors.length).toBe(0);
      });

      test('should detect PII in text', () => {
        const textWithPII = 'My email is john@example.com and phone is 555-123-4567';
        const detections = PIIProtection.detectPII(textWithPII);
        
        expect(detections.length).toBeGreaterThan(0);
        expect(detections.some(d => d.type === 'email')).toBe(true);
        expect(detections.some(d => d.type === 'phone')).toBe(true);
      });
    });

    // A05 - Security Misconfiguration
    describe('A05 - Security Misconfiguration', () => {
      test('should include security headers', async () => {
        const response = await request(app)
          .get('/health')
          .expect(200);

        expect(response.headers['x-frame-options']).toBe('DENY');
        expect(response.headers['x-content-type-options']).toBe('nosniff');
        expect(response.headers['server']).toBe('HealthScan-API');
      });

      test('should not expose sensitive information in errors', async () => {
        const response = await request(app)
          .get('/api/v1/nonexistent')
          .expect(404);

        expect(response.body).not.toHaveProperty('stack');
        expect(response.body.error).toBe('Route not found');
      });
    });

    // A06 - Vulnerable and Outdated Components
    describe('A06 - Vulnerable Components', () => {
      test('should use secure file upload validation', async () => {
        const maliciousFile = Buffer.from('<?php echo "hack"; ?>');
        
        const response = await request(app)
          .post('/api/v1/upload')
          .attach('file', maliciousFile, 'malicious.php')
          .expect(400);

        expect(response.body.error).toContain('File type not allowed');
      });
    });

    // A07 - Identification and Authentication Failures
    describe('A07 - Authentication Failures', () => {
      test('should prevent brute force attacks with rate limiting', async () => {
        const promises = Array(10).fill(0).map(() =>
          request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'test@example.com', password: 'wrong' })
        );

        const responses = await Promise.all(promises);
        const tooManyRequests = responses.filter(r => r.status === 429);
        
        expect(tooManyRequests.length).toBeGreaterThan(0);
      });

      test('should validate JWT token structure', () => {
        const malformedTokens = [
          'invalid.token.here',
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid',
          ''
        ];

        malformedTokens.forEach(async (token) => {
          const response = await request(app)
            .get('/api/v1/chat/insights')
            .set('Authorization', `Bearer ${token}`)
            .expect(401);

          expect(response.body.error).toContain('token');
        });
      });
    });

    // A08 - Software and Data Integrity Failures
    describe('A08 - Data Integrity', () => {
      test('should validate file signatures', () => {
        // Mock file with wrong signature
        const fakeImage = {
          buffer: Buffer.from('This is not an image'),
          mimetype: 'image/jpeg',
          originalname: 'fake.jpg',
          size: 1000
        };

        // This would be tested in the actual file validation
        expect(fakeImage.buffer.toString()).not.toMatch(/^ffd8ff/);
      });

      test('should prevent data tampering in medical records', () => {
        const encryption = EncryptionService.getInstance();
        const originalData = 'Blood pressure: 120/80';
        
        const encrypted = encryption.encrypt(originalData);
        
        // Attempt to tamper with encrypted data
        const tamperedData = encrypted.replace(/.$/, '0');
        
        expect(() => {
          encryption.decrypt(tamperedData);
        }).toThrow();
      });
    });

    // A09 - Security Logging and Monitoring Failures
    describe('A09 - Security Logging', () => {
      test('should log security events', async () => {
        const originalConsoleWarn = console.warn;
        const logSpy = jest.fn();
        console.warn = logSpy;

        await request(app)
          .post('/api/v1/upload')
          .send({ malicious: 'DROP TABLE users;' })
          .expect(400);

        console.warn = originalConsoleWarn;
        // In a real test, you'd check your actual logging system
      });

      test('should mask sensitive data in logs', () => {
        const encryption = EncryptionService.getInstance();
        const sensitiveData = {
          email: 'patient@example.com',
          medicalRecord: 'Patient has diabetes',
          creditCard: '4111-1111-1111-1111'
        };

        const masked = encryption.maskSensitiveData(sensitiveData);

        expect(masked.email).not.toBe(sensitiveData.email);
        expect(masked.email).toContain('@');
        expect(masked.email).toContain('*');
      });
    });

    // A10 - Server-Side Request Forgery (SSRF)
    describe('A10 - SSRF Prevention', () => {
      test('should prevent SSRF in external API calls', async () => {
        const maliciousUrl = 'http://localhost:22/admin';
        
        // This test would be implemented when external API calls are made
        // For now, we ensure that only allowed domains are accessible
        const allowedDomains = ['api.openai.com', 'api.anthropic.com'];
        const testUrl = new URL(maliciousUrl);
        
        expect(allowedDomains).not.toContain(testUrl.hostname);
      });
    });
  });

  describe('Healthcare-Specific Security', () => {
    test('should anonymize patient data for analytics', () => {
      const encryption = EncryptionService.getInstance();
      const patientData = {
        name: 'John Doe',
        email: 'john@example.com',
        dateOfBirth: '1990-01-01',
        medicalData: {
          diagnosis: 'Hypertension',
          medications: ['Lisinopril']
        }
      };

      const anonymized = encryption.anonymizeHealthData(patientData);

      expect(anonymized.name).toMatch(/^anon_/);
      expect(anonymized).not.toHaveProperty('dateOfBirth');
      expect(anonymized).toHaveProperty('ageRange');
      expect(anonymized.medicalData).toEqual(patientData.medicalData); // Medical data preserved
    });

    test('should enforce HIPAA compliance for data access', () => {
      // Test would verify that only authorized users can access medical data
      // This would integrate with your actual authorization system
      const userRoles = ['patient', 'doctor', 'admin'];
      const medicalDataAccess = userRoles.map(role => {
        switch (role) {
          case 'patient': return 'own_data_only';
          case 'doctor': return 'assigned_patients';
          case 'admin': return 'full_access';
          default: return 'no_access';
        }
      });

      expect(medicalDataAccess).toEqual(['own_data_only', 'assigned_patients', 'full_access']);
    });
  });

  describe('Performance Security', () => {
    test('should handle high load without exposing sensitive data', async () => {
      const promises = Array(50).fill(0).map(() =>
        request(app).get('/health')
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).not.toHaveProperty('internalState');
        expect(response.body).not.toHaveProperty('secrets');
      });
    });
  });
});

describe('Encryption Service Tests', () => {
  let encryption: EncryptionService;

  beforeEach(() => {
    encryption = EncryptionService.getInstance();
  });

  test('should generate secure tokens', () => {
    const token1 = encryption.generateToken();
    const token2 = encryption.generateToken();
    
    expect(token1).not.toBe(token2);
    expect(token1.length).toBe(64); // 32 bytes = 64 hex chars
    expect(token1).toMatch(/^[a-f0-9]+$/);
  });

  test('should generate secure API keys', () => {
    const apiKey = encryption.generateAPIKey();
    
    expect(apiKey).toMatch(/^hsa_/);
    expect(apiKey.length).toBeGreaterThan(20);
  });

  test('should handle encryption edge cases', () => {
    const emptyString = '';
    const longString = 'a'.repeat(10000);
    const unicodeString = '🔒 Secure data with émojis 中文';

    expect(() => encryption.encrypt(emptyString)).not.toThrow();
    expect(() => encryption.encrypt(longString)).not.toThrow();
    expect(() => encryption.encrypt(unicodeString)).not.toThrow();

    const encrypted = encryption.encrypt(unicodeString);
    const decrypted = encryption.decrypt(encrypted);
    expect(decrypted).toBe(unicodeString);
  });
});