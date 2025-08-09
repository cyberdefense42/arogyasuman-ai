import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';

export class DatabaseService {
  private static instance: DatabaseService;
  private prisma: PrismaClient;
  
  private constructor() {
    this.prisma = new PrismaClient({
      log: [
        {
          emit: 'event',
          level: 'query',
        },
        {
          emit: 'event',
          level: 'error',
        },
        {
          emit: 'event',
          level: 'info',
        },
        {
          emit: 'event',
          level: 'warn',
        },
      ],
    });
    
    // Log database events in development
    if (process.env.NODE_ENV === 'development') {
      this.prisma.$on('query', (e) => {
        logger.debug(`Query: ${e.query} - Params: ${e.params} - Duration: ${e.duration}ms`);
      });
    }
    
    this.prisma.$on('error', (e) => {
      logger.error('Database error:', e);
    });
  }
  
  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }
  
  async connect(): Promise<void> {
    try {
      await this.prisma.$connect();
      await this.prisma.$queryRaw`SELECT 1`;
      logger.info('✅ Database connected successfully');
    } catch (error) {
      logger.error('❌ Database connection failed:', error);
      throw error;
    }
  }
  
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
    logger.info('Database disconnected');
  }
  
  getClient(): PrismaClient {
    return this.prisma;
  }
  
  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}