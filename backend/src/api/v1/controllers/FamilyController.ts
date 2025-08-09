import { Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../../utils/logger';
import { AppError, asyncHandler } from '../../../middlewares/errorHandler';
import { DatabaseService } from '../../../services/database/DatabaseService';

const familyMemberSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  relationship: z.enum(['spouse', 'child', 'parent', 'sibling', 'other']),
  dateOfBirth: z.string(),
  gender: z.enum(['male', 'female', 'other']),
  bloodGroup: z.string().optional(),
  allergies: z.array(z.string()).optional(),
  chronicConditions: z.array(z.string()).optional()
});

export class FamilyController {
  static createFamily = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id || 'demo-user';
    const { name, description } = req.body;

    try {
      const dbService = DatabaseService.getInstance();
      const prisma = dbService.getClient();

      // Check if user already has a family
      const existingFamily = await prisma.family.findFirst({
        where: {
          members: {
            some: { userId }
          }
        }
      });

      if (existingFamily) {
        throw new AppError('You are already part of a family', 400);
      }

      // Create family
      const family = await prisma.family.create({
        data: {
          id: uuidv4(),
          name: name || `${req.user?.name || 'User'}'s Family`,
          description,
          ownerId: userId,
          members: {
            create: {
              userId,
              role: 'owner',
              relationship: 'self'
            }
          }
        },
        include: {
          members: true
        }
      });

      res.json({
        success: true,
        family: {
          id: family.id,
          name: family.name,
          memberCount: family.members.length,
          createdAt: family.createdAt
        }
      });

    } catch (error) {
      logger.error('Create family error:', error);
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to create family', 500);
    }
  });

  static addFamilyMember = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id || 'demo-user';
    const validation = familyMemberSchema.safeParse(req.body);
    
    if (!validation.success) {
      throw new AppError('Invalid member data', 400);
    }

    try {
      const dbService = DatabaseService.getInstance();
      const prisma = dbService.getClient();

      // Get user's family
      const userFamily = await prisma.familyMember.findFirst({
        where: { userId },
        include: { family: true }
      });

      if (!userFamily) {
        throw new AppError('You must create a family first', 400);
      }

      if (userFamily.role !== 'owner' && userFamily.role !== 'admin') {
        throw new AppError('Only family owners and admins can add members', 403);
      }

      // Create new user for family member
      const memberUserId = uuidv4();
      const memberData = validation.data;

      // Create user profile
      await prisma.user.create({
        data: {
          id: memberUserId,
          email: memberData.email || `${memberUserId}@family.local`,
          name: memberData.name,
          dateOfBirth: new Date(memberData.dateOfBirth),
          gender: memberData.gender,
          bloodGroup: memberData.bloodGroup,
          isDependent: true
        }
      });

      // Add to family
      const familyMember = await prisma.familyMember.create({
        data: {
          familyId: userFamily.familyId,
          userId: memberUserId,
          addedBy: userId,
          relationship: memberData.relationship,
          role: 'member'
        }
      });

      // Save health info
      if (memberData.allergies || memberData.chronicConditions) {
        await prisma.healthProfile.create({
          data: {
            userId: memberUserId,
            allergies: memberData.allergies || [],
            chronicConditions: memberData.chronicConditions || [],
            medications: []
          }
        });
      }

      res.json({
        success: true,
        member: {
          id: memberUserId,
          name: memberData.name,
          relationship: memberData.relationship,
          age: calculateAge(memberData.dateOfBirth)
        }
      });

    } catch (error) {
      logger.error('Add family member error:', error);
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to add family member', 500);
    }
  });

  static getFamilyMembers = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id || 'demo-user';

    try {
      const dbService = DatabaseService.getInstance();
      const prisma = dbService.getClient();

      // Get user's family
      const userFamily = await prisma.familyMember.findFirst({
        where: { userId },
        include: {
          family: {
            include: {
              members: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      dateOfBirth: true,
                      gender: true,
                      bloodGroup: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!userFamily) {
        return res.json({
          success: true,
          family: null,
          members: []
        });
      }

      // Get latest report for each member
      const memberIds = userFamily.family.members.map(m => m.userId);
      const latestReports = await prisma.report.findMany({
        where: {
          userId: { in: memberIds }
        },
        distinct: ['userId'],
        orderBy: { uploadDate: 'desc' },
        include: {
          analysis: {
            select: { healthScore: true }
          }
        }
      });

      const reportMap = new Map(latestReports.map(r => [r.userId, r]));

      const members = userFamily.family.members.map(member => ({
        id: member.user.id,
        name: member.user.name,
        relationship: member.relationship,
        role: member.role,
        age: calculateAge(member.user.dateOfBirth.toISOString()),
        gender: member.user.gender,
        bloodGroup: member.user.bloodGroup,
        lastReport: reportMap.get(member.userId) ? {
          date: reportMap.get(member.userId)!.uploadDate,
          healthScore: reportMap.get(member.userId)!.analysis?.healthScore
        } : null
      }));

      res.json({
        success: true,
        family: {
          id: userFamily.family.id,
          name: userFamily.family.name,
          ownerId: userFamily.family.ownerId
        },
        members,
        stats: {
          totalMembers: members.length,
          reportsThisMonth: latestReports.filter(r => 
            r.uploadDate > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          ).length
        }
      });

    } catch (error) {
      logger.error('Get family members error:', error);
      throw new AppError('Failed to get family members', 500);
    }
  });

  static switchMember = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id || 'demo-user';
    const { memberId } = req.params;

    if (!memberId) {
      throw new AppError('Member ID required', 400);
    }

    try {
      const dbService = DatabaseService.getInstance();
      const prisma = dbService.getClient();

      // Verify access
      const userFamily = await prisma.familyMember.findFirst({
        where: { userId },
        include: {
          family: {
            include: {
              members: {
                where: { userId: memberId }
              }
            }
          }
        }
      });

      if (!userFamily || userFamily.family.members.length === 0) {
        throw new AppError('You do not have access to this member', 403);
      }

      // Get member details
      const member = await prisma.user.findUnique({
        where: { id: memberId },
        include: {
          reports: {
            orderBy: { uploadDate: 'desc' },
            take: 1,
            include: {
              metrics: true,
              analysis: true
            }
          },
          healthProfile: true
        }
      });

      if (!member) {
        throw new AppError('Member not found', 404);
      }

      res.json({
        success: true,
        member: {
          id: member.id,
          name: member.name,
          age: calculateAge(member.dateOfBirth.toISOString()),
          bloodGroup: member.bloodGroup,
          latestReport: member.reports[0] || null,
          healthProfile: member.healthProfile,
          isDependent: member.isDependent
        }
      });

    } catch (error) {
      logger.error('Switch member error:', error);
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to switch member', 500);
    }
  });

  static updateMemberProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id || 'demo-user';
    const { memberId } = req.params;
    const updates = req.body;

    try {
      const dbService = DatabaseService.getInstance();
      const prisma = dbService.getClient();

      // Verify access
      const hasAccess = await verifyFamilyAccess(prisma, userId, memberId);
      if (!hasAccess) {
        throw new AppError('You do not have access to update this member', 403);
      }

      // Update user profile
      if (updates.name || updates.dateOfBirth || updates.gender || updates.bloodGroup) {
        await prisma.user.update({
          where: { id: memberId },
          data: {
            name: updates.name,
            dateOfBirth: updates.dateOfBirth ? new Date(updates.dateOfBirth) : undefined,
            gender: updates.gender,
            bloodGroup: updates.bloodGroup
          }
        });
      }

      // Update health profile
      if (updates.allergies || updates.chronicConditions || updates.medications) {
        await prisma.healthProfile.upsert({
          where: { userId: memberId },
          create: {
            userId: memberId,
            allergies: updates.allergies || [],
            chronicConditions: updates.chronicConditions || [],
            medications: updates.medications || []
          },
          update: {
            allergies: updates.allergies,
            chronicConditions: updates.chronicConditions,
            medications: updates.medications
          }
        });
      }

      res.json({
        success: true,
        message: 'Member profile updated successfully'
      });

    } catch (error) {
      logger.error('Update member profile error:', error);
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to update member profile', 500);
    }
  });

  static getFamilyHealthSummary = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id || 'demo-user';

    try {
      const dbService = DatabaseService.getInstance();
      const prisma = dbService.getClient();

      // Get family members
      const userFamily = await prisma.familyMember.findFirst({
        where: { userId },
        include: {
          family: {
            include: {
              members: {
                include: { user: true }
              }
            }
          }
        }
      });

      if (!userFamily) {
        throw new AppError('No family found', 404);
      }

      const memberIds = userFamily.family.members.map(m => m.userId);

      // Get health summary for all members
      const recentReports = await prisma.report.findMany({
        where: {
          userId: { in: memberIds },
          uploadDate: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } // Last 90 days
        },
        include: {
          metrics: true,
          analysis: true,
          user: true
        },
        orderBy: { uploadDate: 'desc' }
      });

      // Group by member
      const memberHealthMap = new Map();
      recentReports.forEach(report => {
        if (!memberHealthMap.has(report.userId)) {
          memberHealthMap.set(report.userId, []);
        }
        memberHealthMap.get(report.userId).push(report);
      });

      // Calculate family health metrics
      const familyHealthSummary = {
        averageHealthScore: calculateFamilyAverageScore(recentReports),
        membersNeedingAttention: identifyMembersNeedingAttention(memberHealthMap),
        upcomingCheckups: calculateUpcomingCheckups(memberHealthMap),
        commonHealthIssues: identifyCommonIssues(recentReports),
        familyHealthTrends: calculateFamilyTrends(recentReports)
      };

      res.json({
        success: true,
        summary: familyHealthSummary,
        memberCount: userFamily.family.members.length,
        reportsAnalyzed: recentReports.length
      });

    } catch (error) {
      logger.error('Family health summary error:', error);
      throw new AppError('Failed to get family health summary', 500);
    }
  });
}

// Helper functions
function calculateAge(dateOfBirth: string): number {
  const birth = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

async function verifyFamilyAccess(prisma: any, userId: string, targetMemberId: string): Promise<boolean> {
  const familyMember = await prisma.familyMember.findFirst({
    where: { userId },
    include: {
      family: {
        include: {
          members: {
            where: { userId: targetMemberId }
          }
        }
      }
    }
  });

  return familyMember && familyMember.family.members.length > 0;
}

function calculateFamilyAverageScore(reports: any[]): number {
  const scores = reports
    .filter(r => r.analysis?.healthScore)
    .map(r => r.analysis.healthScore);
    
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((a, b) => a + b) / scores.length);
}

function identifyMembersNeedingAttention(memberHealthMap: Map<string, any[]>): any[] {
  const membersNeedingAttention = [];
  
  for (const [memberId, reports] of memberHealthMap.entries()) {
    const latestReport = reports[0];
    if (latestReport && latestReport.analysis?.healthScore < 70) {
      membersNeedingAttention.push({
        memberId,
        memberName: latestReport.user.name,
        healthScore: latestReport.analysis.healthScore,
        concerns: latestReport.metrics.filter((m: any) => m.flag === 'critical' || m.flag === 'high').length
      });
    }
  }
  
  return membersNeedingAttention;
}

function calculateUpcomingCheckups(memberHealthMap: Map<string, any[]>): any[] {
  const checkups = [];
  const today = new Date();
  
  for (const [memberId, reports] of memberHealthMap.entries()) {
    if (reports.length > 0) {
      const lastReport = reports[0];
      const daysSinceLastReport = (today.getTime() - new Date(lastReport.uploadDate).getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceLastReport > 60) { // Suggest checkup if no report in 60 days
        checkups.push({
          memberId,
          memberName: lastReport.user.name,
          lastReportDate: lastReport.uploadDate,
          daysOverdue: Math.round(daysSinceLastReport - 60)
        });
      }
    }
  }
  
  return checkups;
}

function identifyCommonIssues(reports: any[]): any[] {
  const issueCount: { [key: string]: number } = {};
  
  reports.forEach(report => {
    report.metrics.forEach((metric: any) => {
      if (metric.flag === 'high' || metric.flag === 'low' || metric.flag === 'critical') {
        const issue = `${metric.metric}_${metric.flag}`;
        issueCount[issue] = (issueCount[issue] || 0) + 1;
      }
    });
  });
  
  return Object.entries(issueCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([issue, count]) => {
      const [metric, flag] = issue.split('_');
      return { metric, flag, affectedMembers: count };
    });
}

function calculateFamilyTrends(reports: any[]): any {
  const monthlyScores: { [key: string]: number[] } = {};
  
  reports.forEach(report => {
    if (report.analysis?.healthScore) {
      const month = new Date(report.uploadDate).toISOString().slice(0, 7);
      if (!monthlyScores[month]) monthlyScores[month] = [];
      monthlyScores[month].push(report.analysis.healthScore);
    }
  });
  
  const trends = Object.entries(monthlyScores).map(([month, scores]) => ({
    month,
    averageScore: Math.round(scores.reduce((a, b) => a + b) / scores.length)
  }));
  
  return trends.sort((a, b) => a.month.localeCompare(b.month));
}