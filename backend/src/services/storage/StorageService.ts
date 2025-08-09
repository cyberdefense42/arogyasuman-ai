import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger';
import { config } from '../../config';
import { AppError } from '../../middlewares/errorHandler';

export interface StorageResult {
  fileName: string;
  filePath: string;
  url: string;
  size: number;
}

export class StorageService {
  private static instance: StorageService;
  private uploadDir: string;
  
  private constructor() {
    this.uploadDir = path.resolve(config.upload.uploadDir);
  }
  
  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }
  
  async initialize(): Promise<void> {
    try {
      // Create upload directory if it doesn't exist
      await fs.mkdir(this.uploadDir, { recursive: true });
      
      // Create subdirectories
      await fs.mkdir(path.join(this.uploadDir, 'reports'), { recursive: true });
      await fs.mkdir(path.join(this.uploadDir, 'temp'), { recursive: true });
      
      logger.info(`✅ Storage service initialized at: ${this.uploadDir}`);
    } catch (error) {
      logger.error('Failed to initialize storage service:', error);
      throw error;
    }
  }
  
  async saveFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    userId?: string
  ): Promise<StorageResult> {
    try {
      // Validate file type
      if (!config.upload.allowedMimeTypes.includes(mimeType)) {
        throw new AppError(`Unsupported file type: ${mimeType}`, 400);
      }
      
      // Validate file size
      if (buffer.length > config.upload.maxFileSize) {
        throw new AppError('File size exceeds maximum allowed size', 400);
      }
      
      // Generate unique filename
      const extension = this.getFileExtension(originalName, mimeType);
      const fileName = `${uuidv4()}${extension}`;
      
      // Determine storage path
      const subDir = userId ? `reports/${userId}` : 'reports/demo';
      const storageDir = path.join(this.uploadDir, subDir);
      
      // Create directory if it doesn't exist
      await fs.mkdir(storageDir, { recursive: true });
      
      // Save file
      const filePath = path.join(storageDir, fileName);
      await fs.writeFile(filePath, buffer);
      
      // Generate URL
      const url = `/uploads/${subDir}/${fileName}`;
      
      logger.info(`💾 File saved: ${fileName} (${buffer.length} bytes)`);
      
      return {
        fileName,
        filePath,
        url,
        size: buffer.length
      };
      
    } catch (error) {
      logger.error('File save error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to save file', 500);
    }
  }
  
  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
      logger.info(`🗑️ File deleted: ${filePath}`);
    } catch (error) {
      logger.error(`Failed to delete file ${filePath}:`, error);
      throw new AppError('Failed to delete file', 500);
    }
  }
  
  async getFile(filePath: string): Promise<Buffer> {
    try {
      const buffer = await fs.readFile(filePath);
      return buffer;
    } catch (error) {
      logger.error(`Failed to read file ${filePath}:`, error);
      throw new AppError('File not found', 404);
    }
  }
  
  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
  
  async getFileStats(filePath: string): Promise<{ size: number; createdAt: Date; modifiedAt: Date }> {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime
      };
    } catch (error) {
      throw new AppError('File not found', 404);
    }
  }
  
  async cleanupTempFiles(olderThanHours: number = 24): Promise<void> {
    try {
      const tempDir = path.join(this.uploadDir, 'temp');
      const files = await fs.readdir(tempDir);
      
      const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);
      let deletedCount = 0;
      
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime.getTime() < cutoffTime) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }
      
      if (deletedCount > 0) {
        logger.info(`🧹 Cleaned up ${deletedCount} temporary files`);
      }
    } catch (error) {
      logger.error('Temp file cleanup error:', error);
    }
  }
  
  private getFileExtension(originalName: string, mimeType: string): string {
    const nameExtension = path.extname(originalName);
    if (nameExtension) return nameExtension;
    
    const mimeExtensions: { [key: string]: string } = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'application/pdf': '.pdf'
    };
    
    return mimeExtensions[mimeType] || '';
  }
  
  getUploadPath(): string {
    return this.uploadDir;
  }
}