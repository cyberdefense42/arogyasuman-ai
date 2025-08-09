import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';
import { logger } from '../utils/logger';
import { AppError } from './errorHandler';

// Common validation schemas
export const commonSchemas = {
  uuid: z.string().uuid('Invalid UUID format'),
  email: z.string().email('Invalid email format').max(320),
  phone: z.string().regex(/^\+?[\d\s\-\(\)]{10,15}$/, 'Invalid phone number'),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100).regex(/^[a-zA-Z\s'-]+$/, 'Invalid name format'),
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
  gender: z.enum(['male', 'female', 'other']),
  relationship: z.enum(['self', 'spouse', 'child', 'parent', 'sibling', 'other']),
  dateString: z.string().datetime().or(z.string().date()),
  positiveNumber: z.number().positive(),
  safeString: z.string().max(1000),
  htmlContent: z.string().max(10000)
};

// Sanitization functions
function sanitizeInput(input: string): string {
  // Remove null bytes and control characters
  let sanitized = input.replace(/\0/g, '').replace(/[\x00-\x1F\x7F]/g, '');
  
  // Escape SQL injection patterns
  sanitized = validator.escape(sanitized);
  
  // Remove potential script injections
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  return sanitized.trim();
}

function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: []
  });
}

// Validation schemas for different endpoints
export const validationSchemas = {
  // User registration/update
  userRegistration: z.object({
    name: commonSchemas.name,
    email: commonSchemas.email,
    password: commonSchemas.password.refine(
      (password) => {
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        return hasUpper && hasLower && hasNumber && hasSpecial;
      },
      'Password must contain uppercase, lowercase, number, and special character'
    ),
    phone: commonSchemas.phone.optional(),
    dateOfBirth: commonSchemas.dateString.optional(),
    gender: commonSchemas.gender.optional(),
    bloodGroup: commonSchemas.bloodGroup.optional()
  }),

  // User login
  userLogin: z.object({
    email: commonSchemas.email,
    password: z.string().min(1, 'Password required')
  }),

  // File upload
  fileUpload: z.object({
    file: z.object({
      originalname: z.string().max(255),
      mimetype: z.enum([
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/bmp',
        'image/tiff'
      ]),
      size: z.number().max(10 * 1024 * 1024, 'File size must be less than 10MB'),
      buffer: z.instanceof(Buffer)
    })
  }),

  // Chat message
  chatMessage: z.object({
    message: commonSchemas.safeString.min(1).max(1000),
    sessionId: commonSchemas.uuid.optional(),
    context: z.object({
      reportId: commonSchemas.uuid.optional(),
      metrics: z.array(z.any()).optional()
    }).optional()
  }),

  // Family member
  familyMember: z.object({
    name: commonSchemas.name,
    email: commonSchemas.email.optional(),
    phone: commonSchemas.phone.optional(),
    relationship: commonSchemas.relationship,
    dateOfBirth: commonSchemas.dateString,
    gender: commonSchemas.gender,
    bloodGroup: commonSchemas.bloodGroup.optional(),
    allergies: z.array(commonSchemas.safeString).max(20).optional(),
    chronicConditions: z.array(commonSchemas.safeString).max(20).optional()
  }),

  // Timeline query
  timelineQuery: z.object({
    startDate: commonSchemas.dateString.optional(),
    endDate: commonSchemas.dateString.optional(),
    metrics: z.array(commonSchemas.safeString).max(50).optional(),
    groupBy: z.enum(['day', 'week', 'month', 'quarter']).optional()
  }),

  // Health metric
  healthMetric: z.object({
    category: commonSchemas.safeString.min(1).max(50),
    metric: commonSchemas.safeString.min(1).max(100),
    value: z.string().max(50), // Allow string values for non-numeric metrics
    unit: commonSchemas.safeString.max(20),
    flag: z.enum(['normal', 'low', 'high', 'critical']).optional()
  }),

  // Report ID params
  reportParams: z.object({
    reportId: commonSchemas.uuid
  }),

  // Family member ID params
  memberParams: z.object({
    memberId: commonSchemas.uuid
  }),

  // Pagination
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z.string().max(50).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional()
  })
};

// Validation middleware factory
export function validateSchema(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[source];
      const validation = schema.safeParse(data);
      
      if (!validation.success) {
        const errors = validation.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));
        
        logger.warn('Validation failed:', {
          path: req.path,
          errors,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors
        });
      }
      
      // Replace original data with validated/sanitized data
      req[source] = validation.data;
      next();
    } catch (error) {
      logger.error('Validation middleware error:', error);
      next(new AppError('Validation error', 500));
    }
  };
}

// SQL injection prevention
export function preventSQLInjection(req: Request, res: Response, next: NextFunction) {
  const suspiciousPatterns = [
    /\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b/gi,
    /('|\\')|(--)|(\+)|(\*)|(%)|(_)|(;)|(\|)|(\?)|(<)|(>)/gi,
    /((%3D)|(=))[^\n]*((%27)|(\')|(\-\-)|(%3B)|(;))/gi,
    /\w*((%27)|(\'))((%6F)|o|(%4F))((%72)|r|(%52))/gi
  ];

  const checkForInjection = (value: any): boolean => {
    if (typeof value === 'string') {
      return suspiciousPatterns.some(pattern => pattern.test(value));
    }
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(checkForInjection);
    }
    return false;
  };

  const hasInjection = [req.body, req.query, req.params].some(checkForInjection);
  
  if (hasInjection) {
    logger.warn('Potential SQL injection attempt detected:', {
      ip: req.ip,
      path: req.path,
      userAgent: req.get('User-Agent'),
      body: req.body,
      query: req.query
    });
    
    return res.status(400).json({
      success: false,
      error: 'Invalid input detected'
    });
  }

  next();
}

// XSS prevention
export function preventXSS(req: Request, res: Response, next: NextFunction) {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /<link/gi,
    /<meta/gi
  ];

  const checkForXSS = (value: any): boolean => {
    if (typeof value === 'string') {
      return xssPatterns.some(pattern => pattern.test(value));
    }
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(checkForXSS);
    }
    return false;
  };

  const hasXSS = [req.body, req.query].some(checkForXSS);
  
  if (hasXSS) {
    logger.warn('Potential XSS attempt detected:', {
      ip: req.ip,
      path: req.path,
      userAgent: req.get('User-Agent')
    });
    
    return res.status(400).json({
      success: false,
      error: 'Invalid content detected'
    });
  }

  next();
}

// File validation for uploads
export function validateFileUpload(req: Request, res: Response, next: NextFunction) {
  if (!req.file) {
    return next();
  }

  const file = req.file;
  
  // Check file size
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return res.status(400).json({
      success: false,
      error: 'File size exceeds 10MB limit'
    });
  }

  // Check file type
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/bmp',
    'image/tiff'
  ];

  if (!allowedTypes.includes(file.mimetype)) {
    return res.status(400).json({
      success: false,
      error: 'File type not allowed'
    });
  }

  // Check for malicious content in filename
  const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com'];
  const hasExtension = suspiciousExtensions.some(ext => 
    file.originalname.toLowerCase().endsWith(ext)
  );

  if (hasExtension) {
    return res.status(400).json({
      success: false,
      error: 'File type not allowed'
    });
  }

  // Sanitize filename
  file.originalname = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');

  next();
}

// Request size limit
export function limitRequestSize(maxSize: number = 1024 * 1024) { // 1MB default
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.get('content-length') || '0');
    
    if (contentLength > maxSize) {
      logger.warn(`Request size limit exceeded: ${contentLength} > ${maxSize}`, {
        ip: req.ip,
        path: req.path
      });
      
      return res.status(413).json({
        success: false,
        error: 'Request entity too large'
      });
    }

    next();
  };
}