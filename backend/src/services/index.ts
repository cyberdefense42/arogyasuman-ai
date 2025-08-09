import { logger } from '../utils/logger';
import { DatabaseService } from './database/DatabaseService';
import { LocalOCRService } from './ocr/LocalOCRService';
import { AIService } from './ai/AIService';
import { StorageService } from './storage/StorageService';

export async function initializeServices() {
  logger.info('🔧 Initializing services...');
  
  try {
    // Initialize services in parallel for better performance
    const [dbResult, storageResult, ocrResult, aiResult] = await Promise.allSettled([
      DatabaseService.getInstance().connect(),
      StorageService.getInstance().initialize(),
      LocalOCRService.getInstance().initialize(),
      AIService.getInstance().initialize()
    ]);

    // Check for any failed initializations
    const failures = [];
    if (dbResult.status === 'rejected') failures.push(`Database: ${dbResult.reason}`);
    if (storageResult.status === 'rejected') failures.push(`Storage: ${storageResult.reason}`);
    if (ocrResult.status === 'rejected') failures.push(`OCR: ${ocrResult.reason}`);
    if (aiResult.status === 'rejected') failures.push(`AI: ${aiResult.reason}`);

    if (failures.length > 0) {
      logger.warn('Some services failed to initialize:', failures);
      // Don't fail startup for non-critical services
      if (dbResult.status === 'rejected') {
        throw new Error('Database initialization failed - this is critical');
      }
    }

    logger.info('✅ Services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    throw error;
  }
}

export {
  DatabaseService,
  LocalOCRService,
  AIService,
  StorageService
};