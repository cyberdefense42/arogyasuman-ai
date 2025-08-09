import express from 'express';
import https from 'https';
import fs from 'fs';
import dotenv from 'dotenv';
import cors from 'cors';
import { createServer } from 'http';

import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler } from './middlewares/errorHandler';
import { apiRouter } from './api/v1/routes';
import { initializeServices } from './services';
import { 
  securityHeaders, 
  corsOptions, 
  compressionConfig,
  requestTimeout,
  hideServerInfo,
  securityLogger,
  enforceHTTPS,
  detectAutomation
} from './middlewares/security';
import {
  AuthMiddleware,
  generalRateLimit
} from './middlewares/auth';
import {
  preventSQLInjection,
  preventXSS,
  limitRequestSize
} from './middlewares/validation';
import { DatabaseService } from './services/database/DatabaseService';

// Load environment variables
dotenv.config();

const app = express();
let server: any;

// Security: Hide server information
app.use(hideServerInfo);

// Security: Request logging
app.use(securityLogger);

// Security: HTTPS enforcement (production)
if (process.env.NODE_ENV === 'production') {
  app.use(enforceHTTPS);
}

// Security: Headers
app.use(securityHeaders);

// Security: CORS with strict configuration
app.use(cors(corsOptions));

// Security: Compression
app.use(compressionConfig);

// Security: Request timeout
app.use(requestTimeout(30000));

// Security: Rate limiting
app.use(generalRateLimit);

// Security: Request size limiting
app.use(limitRequestSize(10 * 1024 * 1024)); // 10MB

// Security: SQL injection prevention
app.use(preventSQLInjection);

// Security: XSS prevention
app.use(preventXSS);

// Security: Anti-automation detection
app.use(detectAutomation);

// Body parsing with security limits
app.use(express.json({ 
  limit: '10mb',
  strict: true,
  type: ['application/json']
}));

app.use(express.urlencoded({ 
  extended: false, 
  limit: '10mb',
  parameterLimit: 100
}));

// Health check endpoint with performance metrics
app.get('/health', (req, res) => {
  const memUsage = process.memoryUsage();
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    memory: {
      used: Math.round(memUsage.heapUsed / 1024 / 1024),
      total: Math.round(memUsage.heapTotal / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024)
    }
  });
});

// API routes
app.use('/api/v1', apiRouter);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Server initialization will be handled below

// Graceful shutdown handling
const gracefulShutdown = (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully...`);
  
  server.close(async () => {
    try {
      // Close database connections
      const dbService = DatabaseService.getInstance();
      await dbService.disconnect();
      
      // Clean up auth sessions
      const authService = AuthMiddleware.getInstance();
      authService.cleanExpiredSessions();
      
      logger.info('Application shut down gracefully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Error event handlers
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Promise Rejection:', {
    reason: reason?.message || reason,
    stack: reason?.stack,
    promise: promise.toString()
  });
  process.exit(1);
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', {
    message: error.message,
    stack: error.stack
  });
  process.exit(1);
});

// Graceful shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Enhanced server startup function
async function startServer() {
  try {
    logger.info('🚀 Starting HealthScan AI Backend...');
    
    const port = config.server.port;
    
    // Start server immediately for faster response
    if (process.env.NODE_ENV === 'production' && process.env.SSL_CERT_PATH && process.env.SSL_KEY_PATH) {
      // HTTPS server for production
      const httpsOptions = {
        cert: fs.readFileSync(process.env.SSL_CERT_PATH),
        key: fs.readFileSync(process.env.SSL_KEY_PATH)
      };
      
      server = https.createServer(httpsOptions, app);
      server.listen(443, () => {
        logger.info('🔒 HTTPS Server running on port 443');
        logger.info('🛡️ Production security enabled');
      });
      
      // Redirect HTTP to HTTPS
      const httpApp = express();
      httpApp.use('*', (req, res) => {
        res.redirect(301, `https://${req.get('Host')}${req.url}`);
      });
      httpApp.listen(port, () => {
        logger.info(`🔄 HTTP redirect server running on port ${port}`);
      });
      
    } else {
      // HTTP server for development
      server = createServer(app);
      server.listen(port, '0.0.0.0', () => {
        logger.info(`✅ Server running on port ${port}`);
        logger.info(`📍 Environment: ${config.server.env}`);
        logger.info(`🌐 Server accessible at: http://localhost:${port}`);
        logger.info(`📊 Health check: http://localhost:${port}/health`);
        logger.info(`📡 API: http://localhost:${port}/api/v1`);
        
        if (process.env.NODE_ENV !== 'production') {
          logger.warn('⚠️ Running in development mode - security features may be reduced');
        }
      });
    }

    // Initialize services in background for better performance
    initializeServices().catch(error => {
      logger.error('Service initialization failed, but server is running:', error);
    }).then(() => {
      logger.info('🎉 All systems ready - HealthScan AI Backend fully operational');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

// Export for testing
export { app, server };