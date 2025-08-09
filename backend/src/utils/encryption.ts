import crypto from 'crypto';
import { logger } from './logger';

export class EncryptionService {
  private static instance: EncryptionService;
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly tagLength = 16; // 128 bits
  private encryptionKey: Buffer;

  private constructor() {
    const keyString = process.env.ENCRYPTION_KEY;
    if (!keyString) {
      logger.warn('⚠️ ENCRYPTION_KEY not set, generating random key');
      this.encryptionKey = crypto.randomBytes(this.keyLength);
    } else {
      this.encryptionKey = Buffer.from(keyString, 'hex');
    }

    if (this.encryptionKey.length !== this.keyLength) {
      throw new Error(`Encryption key must be ${this.keyLength} bytes (${this.keyLength * 2} hex characters)`);
    }
  }

  static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  // Encrypt sensitive data
  encrypt(text: string): string {
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipher(this.algorithm, this.encryptionKey);
      cipher.setAAD(Buffer.from('healthscan-ai', 'utf8'));

      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      // Combine IV + encrypted + tag
      return iv.toString('hex') + ':' + encrypted + ':' + tag.toString('hex');
    } catch (error) {
      logger.error('Encryption failed:', error);
      throw new Error('Encryption failed');
    }
  }

  // Decrypt sensitive data
  decrypt(encryptedData: string): string {
    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const encryptedText = parts[1];
      const tag = Buffer.from(parts[2], 'hex');

      const decipher = crypto.createDecipher(this.algorithm, this.encryptionKey);
      decipher.setAAD(Buffer.from('healthscan-ai', 'utf8'));
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      logger.error('Decryption failed:', error);
      throw new Error('Decryption failed');
    }
  }

  // Hash sensitive data (one-way)
  hash(data: string, salt?: string): string {
    const saltBuffer = salt ? Buffer.from(salt, 'hex') : crypto.randomBytes(16);
    const hash = crypto.pbkdf2Sync(data, saltBuffer, 100000, 64, 'sha512');
    return saltBuffer.toString('hex') + ':' + hash.toString('hex');
  }

  // Verify hashed data
  verifyHash(data: string, hashedData: string): boolean {
    try {
      const [salt, hash] = hashedData.split(':');
      const computedHash = crypto.pbkdf2Sync(data, Buffer.from(salt, 'hex'), 100000, 64, 'sha512');
      return hash === computedHash.toString('hex');
    } catch (error) {
      logger.error('Hash verification failed:', error);
      return false;
    }
  }

  // Generate secure random tokens
  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  // Generate API keys
  generateAPIKey(): string {
    const prefix = 'hsa_';
    const keyPart = crypto.randomBytes(24).toString('base64url');
    return prefix + keyPart;
  }

  // Mask sensitive data for logging
  maskSensitiveData(data: any): any {
    if (typeof data === 'string') {
      // Email masking
      if (data.includes('@')) {
        const [username, domain] = data.split('@');
        return username.substring(0, 2) + '*'.repeat(username.length - 2) + '@' + domain;
      }
      
      // Phone number masking
      if (/^\+?[\d\s\-\(\)]{10,15}$/.test(data)) {
        return data.substring(0, 3) + '*'.repeat(data.length - 6) + data.substring(data.length - 3);
      }
      
      // General string masking for potential PII
      if (data.length > 4) {
        return data.substring(0, 2) + '*'.repeat(data.length - 4) + data.substring(data.length - 2);
      }
      
      return data;
    }

    if (typeof data === 'object' && data !== null) {
      const masked: any = Array.isArray(data) ? [] : {};
      
      for (const [key, value] of Object.entries(data)) {
        // Sensitive field detection
        const sensitiveFields = [
          'password', 'token', 'secret', 'key', 'ssn', 'social',
          'credit', 'card', 'cvv', 'pin', 'medical', 'health',
          'diagnosis', 'medication', 'allergy'
        ];
        
        const isSensitive = sensitiveFields.some(field => 
          key.toLowerCase().includes(field)
        );
        
        if (isSensitive && typeof value === 'string') {
          masked[key] = '[REDACTED]';
        } else {
          masked[key] = this.maskSensitiveData(value);
        }
      }
      
      return masked;
    }

    return data;
  }

  // HIPAA-compliant data anonymization
  anonymizeHealthData(data: any): any {
    const anonymized = { ...data };
    const fieldsToAnonymize = [
      'name', 'email', 'phone', 'address', 'ssn', 'medicalRecordNumber',
      'patientId', 'dateOfBirth', 'emergencyContact'
    ];

    fieldsToAnonymize.forEach(field => {
      if (anonymized[field]) {
        anonymized[field] = this.generateAnonymousId();
      }
    });

    // Preserve age ranges instead of exact dates
    if (anonymized.dateOfBirth) {
      const age = this.calculateAge(anonymized.dateOfBirth);
      anonymized.ageRange = this.getAgeRange(age);
      delete anonymized.dateOfBirth;
    }

    return anonymized;
  }

  private generateAnonymousId(): string {
    return 'anon_' + crypto.randomBytes(8).toString('hex');
  }

  private calculateAge(dateOfBirth: string): number {
    const birth = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  }

  private getAgeRange(age: number): string {
    if (age < 18) return '0-17';
    if (age < 30) return '18-29';
    if (age < 40) return '30-39';
    if (age < 50) return '40-49';
    if (age < 60) return '50-59';
    if (age < 70) return '60-69';
    return '70+';
  }
}

// PII Detection and Protection
export class PIIProtection {
  private static readonly PII_PATTERNS = {
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    phone: /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g,
    ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
    creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    indianPhone: /(\+91|91)?[\s-]?[6-9]\d{9}/g,
    indianAadhar: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    panCard: /[A-Z]{5}[0-9]{4}[A-Z]{1}/g
  };

  static detectPII(text: string): Array<{ type: string; value: string; start: number; end: number }> {
    const detections: Array<{ type: string; value: string; start: number; end: number }> = [];

    Object.entries(this.PII_PATTERNS).forEach(([type, pattern]) => {
      let match;
      pattern.lastIndex = 0; // Reset regex state
      
      while ((match = pattern.exec(text)) !== null) {
        detections.push({
          type,
          value: match[0],
          start: match.index,
          end: match.index + match[0].length
        });
      }
    });

    return detections;
  }

  static sanitizeText(text: string): string {
    let sanitized = text;
    
    Object.entries(this.PII_PATTERNS).forEach(([type, pattern]) => {
      sanitized = sanitized.replace(pattern, (match) => {
        switch (type) {
          case 'email':
            return '[EMAIL_REDACTED]';
          case 'phone':
          case 'indianPhone':
            return '[PHONE_REDACTED]';
          case 'ssn':
            return '[SSN_REDACTED]';
          case 'creditCard':
            return '[CARD_REDACTED]';
          case 'indianAadhar':
            return '[AADHAR_REDACTED]';
          case 'panCard':
            return '[PAN_REDACTED]';
          default:
            return '[PII_REDACTED]';
        }
      });
    });

    return sanitized;
  }

  static isTextSafe(text: string): boolean {
    return this.detectPII(text).length === 0;
  }
}

// Secure file handling
export class SecureFileHandler {
  private static readonly ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/bmp',
    'image/tiff'
  ];

  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  static validateFile(file: Express.Multer.File): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      errors.push('File size exceeds 10MB limit');
    }

    // Check MIME type
    if (!this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      errors.push('File type not allowed');
    }

    // Check for suspicious file signatures
    const signatures = this.getFileSignature(file.buffer);
    if (!this.isSignatureValid(signatures, file.mimetype)) {
      errors.push('File signature does not match declared type');
    }

    // Scan for malicious content
    if (this.containsMaliciousContent(file.buffer)) {
      errors.push('File contains potentially malicious content');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private static getFileSignature(buffer: Buffer): string {
    return buffer.slice(0, 8).toString('hex').toLowerCase();
  }

  private static isSignatureValid(signature: string, mimeType: string): boolean {
    const validSignatures: { [key: string]: string[] } = {
      'application/pdf': ['25504446'],
      'image/jpeg': ['ffd8ffe0', 'ffd8ffe1', 'ffd8ffe2', 'ffd8ffe3', 'ffd8ffe8', 'ffd8ffdb'],
      'image/png': ['89504e47'],
      'image/gif': ['47494638'],
      'image/bmp': ['424d'],
      'image/tiff': ['49492a00', '4d4d002a']
    };

    const allowedSignatures = validSignatures[mimeType];
    if (!allowedSignatures) return false;

    return allowedSignatures.some(sig => signature.startsWith(sig));
  }

  private static containsMaliciousContent(buffer: Buffer): boolean {
    const content = buffer.toString('binary', 0, Math.min(buffer.length, 1024));
    const maliciousPatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /on\w+\s*=/i,
      /%3Cscript/i,
      /eval\s*\(/i,
      /expression\s*\(/i
    ];

    return maliciousPatterns.some(pattern => pattern.test(content));
  }

  static generateSecureFilename(originalName: string): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    const extension = originalName.split('.').pop()?.toLowerCase() || '';
    const safeName = originalName
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .substring(0, 50);
    
    return `${timestamp}_${random}_${safeName}.${extension}`;
  }
}