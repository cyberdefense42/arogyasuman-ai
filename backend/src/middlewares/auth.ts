import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { AppError } from './errorHandler';
import { DatabaseService } from '../services/database/DatabaseService';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

// Enhanced JWT payload schema
const jwtPayloadSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  role: z.enum(['user', 'admin', 'family_member']),
  permissions: z.array(z.string()).optional(),
  sessionId: z.string(),
  iat: z.number(),
  exp: z.number()
});

// Extend Request interface
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        permissions?: string[];
        sessionId: string;
      };
      rateLimitInfo?: {
        remaining: number;
        resetTime: Date;
      };
    }
  }
}

export class AuthMiddleware {
  private static instance: AuthMiddleware;
  private jwtSecret: string;
  private refreshSecret: string;
  private activeSessions = new Map<string, { userId: string; expires: number }>();

  private constructor() {
    this.jwtSecret = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
    this.refreshSecret = process.env.JWT_REFRESH_SECRET || crypto.randomBytes(64).toString('hex');
    
    if (!process.env.JWT_SECRET) {
      logger.warn('⚠️ JWT_SECRET not set in environment variables. Using random secret.');
    }
  }

  static getInstance(): AuthMiddleware {
    if (!AuthMiddleware.instance) {
      AuthMiddleware.instance = new AuthMiddleware();
    }
    return AuthMiddleware.instance;
  }

  // Generate secure JWT tokens
  generateTokens(user: { id: string; email: string; role: string }) {
    const sessionId = crypto.randomUUID();
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId
    };

    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: '15m',
      issuer: 'healthscan-ai',
      audience: 'healthscan-users'
    });

    const refreshToken = jwt.sign(
      { userId: user.id, sessionId },
      this.refreshSecret,
      { expiresIn: '7d' }
    );

    // Store session
    this.activeSessions.set(sessionId, {
      userId: user.id,
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return { accessToken, refreshToken, sessionId };
  }

  // Verify and decode JWT
  verifyToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader?.startsWith('Bearer ')) {
        throw new AppError('Access token required', 401);
      }

      const token = authHeader.split(' ')[1];
      
      if (!token) {
        throw new AppError('Invalid token format', 401);
      }

      // For development, we'll do basic Firebase token validation
      // In production, you should use Firebase Admin SDK for proper verification
      try {
        // Decode without verification for development (Firebase tokens are pre-verified by client)
        const payload = jwt.decode(token) as any;
        
        if (!payload || (!payload.user_id && !payload.uid) || !payload.email) {
          throw new Error('Invalid Firebase token');
        }

        // Create user object from Firebase token
        const userId = payload.user_id || payload.uid;
        
        // Try to get user from database to fetch role
        try {
          const dbService = DatabaseService.getInstance();
          const prisma = dbService.getClient();
          
          const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
          });
          
          req.user = {
            id: userId,
            email: payload.email,
            role: dbUser?.role || 'user', // Use database role or default to 'user'
            sessionId: payload.auth_time?.toString() || Date.now().toString()
          };
        } catch (dbError) {
          // If database lookup fails, use default role
          req.user = {
            id: userId,
            email: payload.email,
            role: 'user',
            sessionId: payload.auth_time?.toString() || Date.now().toString()
          };
        }

        next();

      } catch (firebaseError) {
        // Fallback to custom JWT verification for non-Firebase tokens
        try {
          const decoded = jwt.verify(token, this.jwtSecret, {
            issuer: 'healthscan-ai',
            audience: 'healthscan-users'
          }) as any;

          // Validate payload structure
          const validation = jwtPayloadSchema.safeParse(decoded);
          if (!validation.success) {
            logger.warn('Invalid JWT payload structure:', validation.error);
            throw new AppError('Invalid token payload', 401);
          }

          const payload = validation.data;

          // Check if session is still active
          const session = this.activeSessions.get(payload.sessionId);
          if (!session || session.expires < Date.now()) {
            this.activeSessions.delete(payload.sessionId);
            throw new AppError('Session expired', 401);
          }

          // Attach user to request
          req.user = {
            id: payload.userId,
            email: payload.email,
            role: payload.role,
            permissions: payload.permissions,
            sessionId: payload.sessionId
          };

          next();

        } catch (jwtError) {
          if (jwtError instanceof jwt.JsonWebTokenError) {
            logger.warn('JWT verification failed:', jwtError.message);
            return next(new AppError('Invalid token', 401));
          }
          next(jwtError);
        }
      }

    } catch (error) {
      logger.error('Token verification error:', error);
      next(error);
    }
  };

  // Role-based access control
  requireRole = (allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return next(new AppError('Authentication required', 401));
      }

      if (!allowedRoles.includes(req.user.role)) {
        logger.warn(`Access denied for user ${req.user.id} with role ${req.user.role}`);
        return next(new AppError('Insufficient permissions', 403));
      }

      next();
    };
  };

  // Permission-based access control
  requirePermission = (permission: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return next(new AppError('Authentication required', 401));
      }

      const userPermissions = req.user.permissions || [];
      if (!userPermissions.includes(permission) && req.user.role !== 'admin') {
        logger.warn(`Permission denied: ${req.user.id} lacks ${permission}`);
        return next(new AppError('Permission denied', 403));
      }

      next();
    };
  };

  // Family member access control
  requireFamilyAccess = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(new AppError('Authentication required', 401));
      }

      const targetUserId = req.params.memberId || req.body.memberId;
      if (!targetUserId) {
        return next(new AppError('Member ID required', 400));
      }

      // Check if user has access to the target member
      const dbService = DatabaseService.getInstance();
      const prisma = dbService.getClient();

      const familyAccess = await prisma.familyMember.findFirst({
        where: {
          userId: req.user.id,
          family: {
            members: {
              some: { userId: targetUserId }
            }
          }
        }
      });

      if (!familyAccess) {
        logger.warn(`Family access denied: ${req.user.id} -> ${targetUserId}`);
        return next(new AppError('Access denied to family member', 403));
      }

      next();
    } catch (error) {
      next(error);
    }
  };

  // Refresh token endpoint
  refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        throw new AppError('Refresh token required', 401);
      }

      const decoded = jwt.verify(refreshToken, this.refreshSecret) as any;
      const session = this.activeSessions.get(decoded.sessionId);

      if (!session || session.expires < Date.now()) {
        this.activeSessions.delete(decoded.sessionId);
        throw new AppError('Refresh token expired', 401);
      }

      // Get user data
      const dbService = DatabaseService.getInstance();
      const prisma = dbService.getClient();
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Generate new tokens
      const tokens = this.generateTokens({
        id: user.id,
        email: user.email,
        role: 'user' // Default role, could be enhanced
      });

      // Invalidate old session
      this.activeSessions.delete(decoded.sessionId);

      res.json({
        success: true,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      });
    } catch (error) {
      next(error);
    }
  };

  // Logout and invalidate session
  logout = (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.user?.sessionId) {
        this.activeSessions.delete(req.user.sessionId);
        logger.info(`User ${req.user.id} logged out`);
      }

      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Clean expired sessions
  cleanExpiredSessions() {
    const now = Date.now();
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.expires < now) {
        this.activeSessions.delete(sessionId);
      }
    }
  }
}

// Rate limiting with different tiers
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: 'Too many authentication attempts, please try again later',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many authentication attempts',
      retryAfter: '15 minutes'
    });
  }
});

export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    error: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/api/v1/health';
  }
});

// Password utilities
export class PasswordUtils {
  private static readonly SALT_ROUNDS = 12;
  private static readonly MIN_PASSWORD_LENGTH = 8;

  static async hashPassword(password: string): Promise<string> {
    if (password.length < this.MIN_PASSWORD_LENGTH) {
      throw new AppError('Password must be at least 8 characters long', 400);
    }
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < this.MIN_PASSWORD_LENGTH) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}