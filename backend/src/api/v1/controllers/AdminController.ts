import { Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../../../utils/logger';
import { AppError, asyncHandler } from '../../../middlewares/errorHandler';
import { DatabaseService } from '../../../services/database/DatabaseService';

const getUsersSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20),
  role: z.enum(['user', 'admin', 'doctor']).optional(),
  search: z.string().optional()
});

const updateUserRoleSchema = z.object({
  role: z.enum(['user', 'admin', 'doctor'])
});

export class AdminController {
  // Get all users with their reports count
  static getAllUsers = asyncHandler(async (req: Request, res: Response) => {
    // Check if user is admin
    if (!req.user || req.user.role !== 'admin') {
      throw new AppError('Admin access required', 403);
    }
    
    const { page, limit, role, search } = getUsersSchema.parse(req.query);
    
    try {
      const prisma = DatabaseService.getInstance().getClient();
      const skip = (page - 1) * limit;
      
      const where: any = {};
      if (role) where.role = role;
      if (search) {
        where.OR = [
          { email: { contains: search } },
          { name: { contains: search } }
        ];
      }
      
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            provider: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                reports: true,
                familyMemberships: true
              }
            }
          }
        }),
        prisma.user.count({ where })
      ]);
      
      const totalPages = Math.ceil(total / limit);
      
      res.json({
        data: users,
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
      logger.error('Get all users error:', error);
      throw new AppError('Failed to fetch users', 500);
    }
  });
  
  // Get specific user details with all their data
  static getUserDetails = asyncHandler(async (req: Request, res: Response) => {
    // Check if user is admin
    if (!req.user || req.user.role !== 'admin') {
      throw new AppError('Admin access required', 403);
    }
    
    const { userId } = req.params;
    
    if (!userId) {
      throw new AppError('User ID required', 400);
    }
    
    try {
      const prisma = DatabaseService.getInstance().getClient();
      
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          reports: {
            orderBy: { uploadDate: 'desc' },
            take: 10,
            include: {
              analysis: {
                select: {
                  healthScore: true
                }
              },
              _count: {
                select: {
                  metrics: true
                }
              }
            }
          },
          familyMemberships: {
            include: {
              family: true
            }
          },
          healthProfile: true,
          chatMessages: {
            orderBy: { createdAt: 'desc' },
            take: 5
          }
        }
      });
      
      if (!user) {
        throw new AppError('User not found', 404);
      }
      
      res.json(user);
      
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get user details error:', error);
      throw new AppError('Failed to fetch user details', 500);
    }
  });
  
  // Get all reports across all users
  static getAllReports = asyncHandler(async (req: Request, res: Response) => {
    // Check if user is admin
    if (!req.user || req.user.role !== 'admin') {
      throw new AppError('Admin access required', 403);
    }
    
    const { page, limit, status } = getReportsSchema.parse(req.query);
    
    try {
      const prisma = DatabaseService.getInstance().getClient();
      const skip = (page - 1) * limit;
      
      const where: any = {};
      if (status) where.status = status;
      
      const [reports, total] = await Promise.all([
        prisma.report.findMany({
          where,
          skip,
          take: limit,
          orderBy: { uploadDate: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true
              }
            },
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
      logger.error('Get all reports error:', error);
      throw new AppError('Failed to fetch reports', 500);
    }
  });
  
  // Update user role
  static updateUserRole = asyncHandler(async (req: Request, res: Response) => {
    // Check if user is admin
    if (!req.user || req.user.role !== 'admin') {
      throw new AppError('Admin access required', 403);
    }
    
    const { userId } = req.params;
    const { role } = updateUserRoleSchema.parse(req.body);
    
    if (!userId) {
      throw new AppError('User ID required', 400);
    }
    
    // Prevent admin from changing their own role
    if (userId === req.user.id) {
      throw new AppError('Cannot change your own role', 400);
    }
    
    try {
      const prisma = DatabaseService.getInstance().getClient();
      
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { role },
        select: {
          id: true,
          email: true,
          name: true,
          role: true
        }
      });
      
      logger.info(`Admin ${req.user.id} updated user ${userId} role to ${role}`);
      
      res.json({
        success: true,
        message: `User role updated to ${role}`,
        user: updatedUser
      });
      
    } catch (error) {
      logger.error('Update user role error:', error);
      throw new AppError('Failed to update user role', 500);
    }
  });
  
  // Get system statistics
  static getSystemStats = asyncHandler(async (req: Request, res: Response) => {
    // Check if user is admin
    if (!req.user || req.user.role !== 'admin') {
      throw new AppError('Admin access required', 403);
    }
    
    try {
      const prisma = DatabaseService.getInstance().getClient();
      
      const [
        totalUsers,
        totalReports,
        totalAnalyses,
        recentUsers,
        recentReports,
        usersByRole
      ] = await Promise.all([
        prisma.user.count(),
        prisma.report.count(),
        prisma.analysis.count(),
        prisma.user.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
            }
          }
        }),
        prisma.report.count({
          where: {
            uploadDate: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
            }
          }
        }),
        prisma.user.groupBy({
          by: ['role'],
          _count: true
        })
      ]);
      
      // Get report status distribution
      const reportsByStatus = await prisma.report.groupBy({
        by: ['status'],
        _count: true
      });
      
      res.json({
        overview: {
          totalUsers,
          totalReports,
          totalAnalyses,
          recentUsers,
          recentReports
        },
        userDistribution: usersByRole.map(item => ({
          role: item.role,
          count: item._count
        })),
        reportDistribution: reportsByStatus.map(item => ({
          status: item.status,
          count: item._count
        }))
      });
      
    } catch (error) {
      logger.error('Get system stats error:', error);
      throw new AppError('Failed to fetch system statistics', 500);
    }
  });
  
  // Delete user and all their data
  static deleteUser = asyncHandler(async (req: Request, res: Response) => {
    // Check if user is admin
    if (!req.user || req.user.role !== 'admin') {
      throw new AppError('Admin access required', 403);
    }
    
    const { userId } = req.params;
    
    if (!userId) {
      throw new AppError('User ID required', 400);
    }
    
    // Prevent admin from deleting themselves
    if (userId === req.user.id) {
      throw new AppError('Cannot delete your own account', 400);
    }
    
    try {
      const prisma = DatabaseService.getInstance().getClient();
      
      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true }
      });
      
      if (!user) {
        throw new AppError('User not found', 404);
      }
      
      // Delete user (cascade will handle related records)
      await prisma.user.delete({
        where: { id: userId }
      });
      
      logger.warn(`Admin ${req.user.id} deleted user ${userId} (${user.email})`);
      
      res.json({
        success: true,
        message: 'User and all related data deleted successfully'
      });
      
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Delete user error:', error);
      throw new AppError('Failed to delete user', 500);
    }
  });
}

const getReportsSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 10),
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']).optional()
});