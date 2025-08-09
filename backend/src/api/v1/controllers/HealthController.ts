import { Request, Response } from 'express';
import { logger } from '../../../utils/logger';
import { asyncHandler } from '../../../middlewares/errorHandler';
import { DatabaseService } from '../../../services/database/DatabaseService';
import { AIService } from '../../../services/ai/AIService';
import { StorageService } from '../../../services/storage/StorageService';

export class HealthController {
  static healthCheck = asyncHandler(async (req: Request, res: Response) => {
    const timestamp = new Date().toISOString();
    
    res.json({
      status: 'ok',
      timestamp,
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    });
  });
  
  static detailedHealthCheck = asyncHandler(async (req: Request, res: Response) => {
    const timestamp = new Date().toISOString();
    const startTime = Date.now();
    
    // Check all services
    const services = await Promise.allSettled([
      HealthController.checkDatabase(),
      HealthController.checkAIService(),
      HealthController.checkStorage()
    ]);
    
    const [database, ai, storage] = services;
    
    const overallHealth = services.every(service => 
      service.status === 'fulfilled' && service.value.status === 'ok'
    ) ? 'ok' : 'degraded';
    
    const responseTime = Date.now() - startTime;
    
    res.json({
      status: overallHealth,
      timestamp,
      uptime: process.uptime(),
      responseTime: `${responseTime}ms`,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: database.status === 'fulfilled' ? database.value : { status: 'error', error: 'Service check failed' },
        ai: ai.status === 'fulfilled' ? ai.value : { status: 'error', error: 'Service check failed' },
        storage: storage.status === 'fulfilled' ? storage.value : { status: 'error', error: 'Service check failed' }
      },
      system: {
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024)
        },
        cpu: process.cpuUsage(),
        platform: process.platform,
        nodeVersion: process.version
      }
    });
  });
  
  static servicesHealthCheck = asyncHandler(async (req: Request, res: Response) => {
    const services = await Promise.allSettled([
      HealthController.checkDatabase(),
      HealthController.checkAIService(),
      HealthController.checkStorage()
    ]);
    
    const [database, ai, storage] = services;
    
    res.json({
      database: database.status === 'fulfilled' ? database.value : { status: 'error', error: 'Service unavailable' },
      ai: ai.status === 'fulfilled' ? ai.value : { status: 'error', error: 'Service unavailable' },
      storage: storage.status === 'fulfilled' ? storage.value : { status: 'error', error: 'Service unavailable' }
    });
  });
  
  private static async checkDatabase() {
    try {
      const dbService = DatabaseService.getInstance();
      const isHealthy = await dbService.healthCheck();
      
      if (isHealthy) {
        // Get some basic stats
        const prisma = dbService.getClient();
        const reportCount = await prisma.report.count();
        
        return {
          status: 'ok',
          message: 'Database connection healthy',
          stats: {
            totalReports: reportCount
          }
        };
      } else {
        return {
          status: 'error',
          message: 'Database connection failed'
        };
      }
    } catch (error) {
      logger.error('Database health check error:', error);
      return {
        status: 'error',
        message: 'Database health check failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  private static async checkAIService() {
    try {
      const aiService = AIService.getInstance();
      const isHealthy = await aiService.healthCheck();
      
      if (isHealthy) {
        return {
          status: 'ok',
          message: 'AI service (Ollama) is responsive',
          model: process.env.OLLAMA_MODEL || 'llama3.2:latest'
        };
      } else {
        return {
          status: 'error',
          message: 'AI service not responding'
        };
      }
    } catch (error) {
      logger.error('AI service health check error:', error);
      return {
        status: 'error',
        message: 'AI service health check failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  private static async checkStorage() {
    try {
      const storageService = StorageService.getInstance();
      const uploadPath = storageService.getUploadPath();
      
      // Try to check if upload directory exists and is writable
      const testFile = `${uploadPath}/health-check-${Date.now()}.txt`;
      await storageService.saveFile(Buffer.from('health check'), 'health-check.txt', 'text/plain');
      
      return {
        status: 'ok',
        message: 'Storage service is functional',
        uploadPath
      };
    } catch (error) {
      logger.error('Storage health check error:', error);
      return {
        status: 'error',
        message: 'Storage service health check failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}