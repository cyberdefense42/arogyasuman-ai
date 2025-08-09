import { Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../../../utils/logger';
import { AppError, asyncHandler } from '../../../middlewares/errorHandler';
import { DatabaseService } from '../../../services/database/DatabaseService';
import { StorageService } from '../../../services/storage/StorageService';

const getReportsSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 10),
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']).optional(),
  userId: z.string().optional()
});

export class ReportsController {
  static getReports = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, status } = getReportsSchema.parse(req.query);
    
    try {
      const prisma = DatabaseService.getInstance().getClient();
      const skip = (page - 1) * limit;
      
      // Filter by authenticated user's ID, unless user is admin
      const where: any = {};
      if (req.user) {
        // For admin users, optionally filter by userId from query
        if (req.user.role === 'admin') {
          const { userId } = req.query as any;
          if (userId) where.userId = userId;
        } else {
          // Regular users can only see their own reports
          where.userId = req.user.id;
        }
      } else {
        // If no authentication, return empty results
        return res.json({
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
          }
        });
      }
      if (status) where.status = status;
      
      const [reports, total] = await Promise.all([
        prisma.report.findMany({
          where,
          skip,
          take: limit,
          orderBy: { uploadDate: 'desc' },
          include: {
            analysis: {
              select: {
                healthScore: true,
                createdAt: true
              }
            },
            _count: {
              select: {
                metrics: true
              }
            }
          }
        }),
        prisma.report.count({ where })
      ]);
      
      const totalPages = Math.ceil(total / limit);
      
      res.json({
        data: reports,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
      
    } catch (error) {
      logger.error('Get reports error:', error);
      throw new AppError('Failed to fetch reports', 500);
    }
  });
  
  static getReportById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    if (!id) {
      throw new AppError('Report ID required', 400);
    }
    
    try {
      const prisma = DatabaseService.getInstance().getClient();
      const report = await prisma.report.findUnique({
        where: { id },
        include: {
          analysis: true,
          metrics: {
            orderBy: [{ category: 'asc' }, { metric: 'asc' }]
          }
        }
      });
      
      if (!report) {
        throw new AppError('Report not found', 404);
      }
      
      // Check if user has access to this report
      if (req.user) {
        if (req.user.role !== 'admin' && report.userId !== req.user.id) {
          throw new AppError('Access denied', 403);
        }
      } else {
        throw new AppError('Authentication required', 401);
      }
      
      res.json(report);
      
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get report by ID error:', error);
      throw new AppError('Failed to fetch report', 500);
    }
  });
  
  static deleteReport = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    if (!id) {
      throw new AppError('Report ID required', 400);
    }
    
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }
    
    try {
      const prisma = DatabaseService.getInstance().getClient();
      const storageService = StorageService.getInstance();
      
      // Get report to find file path
      const report = await prisma.report.findUnique({
        where: { id }
      });
      
      if (!report) {
        throw new AppError('Report not found', 404);
      }
      
      // Check if user has permission to delete this report
      if (req.user.role !== 'admin' && report.userId !== req.user.id) {
        throw new AppError('Access denied', 403);
      }
      
      // Delete from database (cascade will handle related records)
      await prisma.report.delete({
        where: { id }
      });
      
      // Delete file from storage
      try {
        const filePath = report.fileUrl.replace('/uploads/', '');
        const fullPath = `${storageService.getUploadPath()}/${filePath}`;
        await storageService.deleteFile(fullPath);
      } catch (fileError) {
        logger.warn('Failed to delete file from storage:', fileError);
      }
      
      logger.info(`🗑️ Report deleted: ${id}`);
      
      res.json({
        message: 'Report deleted successfully',
        id
      });
      
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Delete report error:', error);
      throw new AppError('Failed to delete report', 500);
    }
  });
  
  static getReportMetrics = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    if (!id) {
      throw new AppError('Report ID required', 400);
    }
    
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }
    
    try {
      const prisma = DatabaseService.getInstance().getClient();
      
      // First check if user has access to this report
      const report = await prisma.report.findUnique({
        where: { id },
        select: { userId: true }
      });
      
      if (!report) {
        throw new AppError('Report not found', 404);
      }
      
      if (req.user.role !== 'admin' && report.userId !== req.user.id) {
        throw new AppError('Access denied', 403);
      }
      
      const metrics = await prisma.healthMetric.findMany({
        where: { reportId: id },
        orderBy: [{ category: 'asc' }, { metric: 'asc' }]
      });
      
      if (metrics.length === 0) {
        throw new AppError('No metrics found for this report', 404);
      }
      
      // Group by category
      const groupedMetrics = metrics.reduce((acc, metric) => {
        if (!acc[metric.category]) {
          acc[metric.category] = [];
        }
        acc[metric.category].push(metric);
        return acc;
      }, {} as Record<string, typeof metrics>);
      
      res.json({
        reportId: id,
        totalMetrics: metrics.length,
        categories: Object.keys(groupedMetrics),
        metrics: groupedMetrics
      });
      
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get report metrics error:', error);
      throw new AppError('Failed to fetch report metrics', 500);
    }
  });
  
  static getReportAnalysis = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    if (!id) {
      throw new AppError('Report ID required', 400);
    }
    
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }
    
    try {
      const prisma = DatabaseService.getInstance().getClient();
      const analysis = await prisma.analysis.findUnique({
        where: { reportId: id },
        include: {
          report: {
            select: {
              fileName: true,
              uploadDate: true,
              status: true,
              userId: true
            }
          }
        }
      });
      
      if (!analysis) {
        throw new AppError('Analysis not found for this report', 404);
      }
      
      // Check if user has access to this analysis
      if (req.user.role !== 'admin' && analysis.report.userId !== req.user.id) {
        throw new AppError('Access denied', 403);
      }
      
      // Remove userId from response if not admin
      if (req.user.role !== 'admin') {
        delete (analysis.report as any).userId;
      }
      
      res.json(analysis);
      
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get report analysis error:', error);
      throw new AppError('Failed to fetch report analysis', 500);
    }
  });
}