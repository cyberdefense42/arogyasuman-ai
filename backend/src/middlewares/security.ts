import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { logger } from '../utils/logger';

// Security headers configuration
export const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.openai.com", "https://api.anthropic.com"],
      mediaSrc: ["'self'"],
      objectSrc: ["'none'"],
      childSrc: ["'none'"],
      workerSrc: ["'none'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      ...(process.env.NODE_ENV === 'production' && { upgradeInsecureRequests: [] })
    }
  },
  
  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  
  // X-Frame-Options
  frameguard: {
    action: 'deny'
  },
  
  // X-Content-Type-Options
  noSniff: true,
  
  // X-XSS-Protection
  xssFilter: true,
  
  // Referrer Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },
  
  // Permissions Policy
  permissionsPolicy: {
    features: {
      camera: ['none'],
      microphone: ['none'],
      geolocation: ['none'],
      notifications: ['none'],
      push: ['none']
    }
  }
});

// CORS configuration
export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'https://your-domain.com',
      'https://www.your-domain.com'
    ];

    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-CSRF-Token'
  ],
  exposedHeaders: ['X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400 // 24 hours
};

// Compression configuration
export const compressionConfig = compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
});

// Security middleware for sensitive endpoints
export function sensitiveEndpointSecurity(req: Request, res: Response, next: NextFunction) {
  // Add additional security headers for sensitive endpoints
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  
  next();
}

// Request timeout middleware
export function requestTimeout(timeout: number = 30000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        logger.warn(`Request timeout: ${req.method} ${req.path}`, {
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        
        res.status(408).json({
          success: false,
          error: 'Request timeout'
        });
      }
    }, timeout);

    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));
    
    next();
  };
}

// Hide server information
export function hideServerInfo(req: Request, res: Response, next: NextFunction) {
  res.removeHeader('X-Powered-By');
  res.setHeader('Server', 'HealthScan-API');
  next();
}

// IP allowlist/blocklist middleware
export class IPFilter {
  private allowlist: Set<string> = new Set();
  private blocklist: Set<string> = new Set();

  addToAllowlist(ips: string[]) {
    ips.forEach(ip => this.allowlist.add(ip));
  }

  addToBlocklist(ips: string[]) {
    ips.forEach(ip => this.blocklist.add(ip));
  }

  middleware = (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress || '';
    
    // Check blocklist first
    if (this.blocklist.has(clientIP)) {
      logger.warn(`Blocked IP attempted access: ${clientIP}`);
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // If allowlist is configured, check it
    if (this.allowlist.size > 0 && !this.allowlist.has(clientIP)) {
      logger.warn(`Non-allowlisted IP attempted access: ${clientIP}`);
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    next();
  };
}

// Optimized request logging middleware - only log in development or errors
export function securityLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  
  // Only log in development mode or for health checks
  const shouldLogVerbose = process.env.NODE_ENV === 'development' || req.path.includes('/health');
  
  if (shouldLogVerbose) {
    logger.info('Request received', {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent')?.substring(0, 100), // Truncate long user agents
      userId: req.user?.id
    });
  }

  // Log response - only errors and slow requests
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Only log errors, slow requests (>2s), or in development
    if (res.statusCode >= 400 || duration > 2000 || shouldLogVerbose) {
      const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
      
      logger[logLevel]('Request completed', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        ip: req.ip,
        userId: req.user?.id
      });
    }
  });

  next();
}

// Optimized anti-automation detection - skip for health checks
export function detectAutomation(req: Request, res: Response, next: NextFunction) {
  // Skip automation detection for health checks and static assets
  if (req.path.includes('/health') || req.path.includes('/favicon')) {
    return next();
  }

  const userAgent = req.get('User-Agent') || '';
  
  // Quick regex test - more efficient than array iteration
  const suspiciousPattern = /\b(curl|wget|python|bot|crawler|spider|scraper)\b/i;
  
  if (suspiciousPattern.test(userAgent)) {
    logger.warn('Automation detected', {
      ip: req.ip,
      userAgent: userAgent.substring(0, 100),
      path: req.path
    });

    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded'
    });
  }

  next();
}

// HTTPS enforcement
export function enforceHTTPS(req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV === 'production' && !req.secure && req.get('X-Forwarded-Proto') !== 'https') {
    logger.info('Redirecting HTTP to HTTPS', { ip: req.ip, path: req.path });
    return res.redirect(301, `https://${req.get('Host')}${req.url}`);
  }
  next();
}

// Content type validation
export function validateContentType(allowedTypes: string[] = ['application/json']) {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentType = req.get('Content-Type');
    
    if (req.method === 'POST' || req.method === 'PUT') {
      if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
        return res.status(415).json({
          success: false,
          error: 'Unsupported Media Type'
        });
      }
    }

    next();
  };
}