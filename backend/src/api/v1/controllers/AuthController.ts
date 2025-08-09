import { Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../../../utils/logger';
import { AppError, asyncHandler } from '../../../middlewares/errorHandler';
import { DatabaseService } from '../../../services/database/DatabaseService';

const syncUserSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  provider: z.string().optional()
});

export class AuthController {
  // Sync Firebase user with database
  static syncUser = asyncHandler(async (req: Request, res: Response) => {
    const { uid, email, name, provider } = syncUserSchema.parse(req.body);
    
    try {
      const prisma = DatabaseService.getInstance().getClient();
      
      // Upsert user - create if doesn't exist, update if exists
      const user = await prisma.user.upsert({
        where: { id: uid },
        update: {
          email,
          name: name || undefined,
          provider: provider || undefined
        },
        create: {
          id: uid,
          email,
          name: name || null,
          provider: provider || 'firebase',
          role: 'user' // Default role for new users
        }
      });
      
      logger.info(`User synced: ${user.id} (${user.email})`);
      
      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });
      
    } catch (error) {
      logger.error('Sync user error:', error);
      throw new AppError('Failed to sync user', 500);
    }
  });
  
  // Get current user profile
  static getProfile = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }
    
    try {
      const prisma = DatabaseService.getInstance().getClient();
      
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: {
          healthProfile: true,
          _count: {
            select: {
              reports: true,
              familyMemberships: true
            }
          }
        }
      });
      
      if (!user) {
        throw new AppError('User not found', 404);
      }
      
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        bloodGroup: user.bloodGroup,
        healthProfile: user.healthProfile,
        stats: {
          totalReports: user._count.reports,
          familyMembers: user._count.familyMemberships
        }
      });
      
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get profile error:', error);
      throw new AppError('Failed to fetch profile', 500);
    }
  });
  
  // Update user profile
  static updateProfile = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }
    
    const updateSchema = z.object({
      name: z.string().optional(),
      dateOfBirth: z.string().optional(),
      gender: z.string().optional(),
      bloodGroup: z.string().optional()
    });
    
    const data = updateSchema.parse(req.body);
    
    try {
      const prisma = DatabaseService.getInstance().getClient();
      
      const updatedUser = await prisma.user.update({
        where: { id: req.user.id },
        data: {
          ...data,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined
        }
      });
      
      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          role: updatedUser.role,
          dateOfBirth: updatedUser.dateOfBirth,
          gender: updatedUser.gender,
          bloodGroup: updatedUser.bloodGroup
        }
      });
      
    } catch (error) {
      logger.error('Update profile error:', error);
      throw new AppError('Failed to update profile', 500);
    }
  });
}