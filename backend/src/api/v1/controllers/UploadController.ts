import { Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../../utils/logger';
import { AppError, asyncHandler } from '../../../middlewares/errorHandler';
import { LocalOCRService } from '../../../services/ocr/LocalOCRService';
import { AIService } from '../../../services/ai/AIService';
import { StorageService } from '../../../services/storage/StorageService';
import { DatabaseService } from '../../../services/database/DatabaseService';

const uploadSchema = z.object({
  file: z.object({
    buffer: z.instanceof(Buffer),
    originalname: z.string(),
    mimetype: z.string(),
    size: z.number()
  })
});

export class UploadController {
  static uploadMultipleFiles = asyncHandler(async (req: Request, res: Response) => {
    const requestId = uuidv4();
    logger.info(`📤 [${requestId}] Starting multiple files upload process`);
    
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      throw new AppError('No files provided', 400);
    }
    
    logger.info(`📁 [${requestId}] Received ${files.length} files for processing`);
    
    const results = [];
    let combinedText = '';
    const allMetrics: any[] = [];
    
    // Process each file
    for (const file of files) {
      const { buffer, originalname, mimetype, size } = file;
      logger.info(`📁 [${requestId}] Processing file: ${originalname} (${mimetype}, ${size} bytes)`);
      
      try {
        // Services
        const storageService = StorageService.getInstance();
        const ocrService = LocalOCRService.getInstance();
        
        // Save file
        const storageResult = await storageService.saveFile(buffer, originalname, mimetype);
        
        // Process document with Enhanced OCR
        const ocrResult = await ocrService.processDocument(buffer, mimetype, {
          preferredEngine: 'ensemble',
          enhancedPreprocessing: true
        });
        combinedText += `\n\n--- File: ${originalname} ---\n${ocrResult.text}`;
        
        // Extract health metrics
        const metrics = ocrService.extractHealthMetrics(ocrResult.text);
        allMetrics.push(...metrics);
        
        results.push({
          fileName: originalname,
          fileType: mimetype,
          fileUrl: storageResult.url,
          ocrConfidence: ocrResult.confidence,
          extractedText: ocrResult.text,
          metricsCount: metrics.length
        });
      } catch (error) {
        logger.error(`❌ [${requestId}] Failed to process file ${originalname}:`, error);
        results.push({
          fileName: originalname,
          fileType: mimetype,
          error: error instanceof Error ? error.message : 'Processing failed'
        });
      }
    }
    
    // Analyze combined results with AI
    let analysis = null;
    try {
      const aiService = AIService.getInstance();
      logger.info(`🤖 [${requestId}] Starting AI analysis for combined reports...`);
      analysis = await aiService.analyzeHealthReport(combinedText, allMetrics);
      logger.info(`✅ [${requestId}] AI analysis completed`);
    } catch (aiError) {
      logger.warn(`⚠️ [${requestId}] AI analysis failed:`, aiError);
    }
    
    res.json({
      success: true,
      requestId,
      filesProcessed: files.length,
      files: results,
      extractedText: combinedText,
      totalMetrics: allMetrics.length,
      analysis: analysis ? {
        healthScore: analysis.healthScore,
        overallAssessment: analysis.analysis.overallAssessment,
        concernsCount: analysis.analysis.concerns.length,
        urgencyLevel: analysis.urgencyLevel,
        processingTime: analysis.processingTime,
        summary: {
          keyFindings: analysis.summary?.keyFindings || [],
          criticalValues: analysis.summary?.criticalValues || [],
          normalValues: analysis.summary?.normalValues || [],
          actionRequired: analysis.summary?.actionRequired || [],
          timelineForImprovement: analysis.summary?.timelineForImprovement || "Follow recommendations consistently"
        }
      } : null,
      meta: {
        timestamp: new Date().toISOString()
      }
    });
    
    logger.info(`✅ [${requestId}] Multiple files upload process completed successfully`);
  });

  static uploadFile = asyncHandler(async (req: Request, res: Response) => {
    const requestId = uuidv4();
    logger.info(`📤 [${requestId}] Starting file upload process`);
    
    if (!req.file) {
      throw new AppError('No file provided', 400);
    }
    
    const { buffer, originalname, mimetype, size } = req.file;
    logger.info(`📁 [${requestId}] File: ${originalname} (${mimetype}, ${size} bytes)`);
    
    // Validate file
    const validation = uploadSchema.safeParse({ file: req.file });
    if (!validation.success) {
      throw new AppError('Invalid file data', 400);
    }
    
    try {
      // Services
      const storageService = StorageService.getInstance();
      const ocrService = LocalOCRService.getInstance();
      const aiService = AIService.getInstance();
      const dbService = DatabaseService.getInstance();
      
      // Save file
      logger.info(`💾 [${requestId}] Saving file to storage...`);
      const storageResult = await storageService.saveFile(buffer, originalname, mimetype);
      
      // Create report record
      let reportId = uuidv4();
      try {
        const prisma = dbService.getClient();
        
        // Use authenticated user's ID or create demo user for non-authenticated uploads
        let userId = req.user?.id || 'demo-user';
        
        // Only create demo user if not authenticated
        if (!req.user) {
          try {
            await prisma.user.upsert({
              where: { id: 'demo-user' },
              update: {},
              create: {
                id: 'demo-user',
                email: 'demo@healthscan.ai',
                name: 'Demo User'
              }
            });
          } catch (userError) {
            logger.warn('Could not create demo user:', userError);
          }
        }

        const report = await prisma.report.create({
          data: {
            id: reportId,
            userId: userId,
            fileName: originalname,
            fileUrl: storageResult.url,
            fileType: mimetype,
            status: 'PROCESSING'
          }
        });
        reportId = report.id;
        logger.info(`📄 [${requestId}] Report record created: ${reportId}`);
      } catch (dbError) {
        logger.warn(`⚠️ [${requestId}] Database unavailable, using generated ID`);
      }
      
      // Process document with Enhanced OCR
      logger.info(`🔍 [${requestId}] Starting Enhanced OCR processing...`);
      const ocrResult = await ocrService.processDocument(buffer, mimetype, {
        preferredEngine: 'ensemble',
        enhancedPreprocessing: true
      });
      
      // Extract health metrics
      const metrics = ocrService.extractHealthMetrics(ocrResult.text);
      logger.info(`📊 [${requestId}] Extracted ${metrics.length} health metrics`);
      
      // Analyze with AI
      let analysis = null;
      try {
        logger.info(`🤖 [${requestId}] Starting AI analysis...`);
        analysis = await aiService.analyzeHealthReport(ocrResult.text, metrics);
        logger.info(`✅ [${requestId}] AI analysis completed in ${analysis.processingTime}ms`);
      } catch (aiError) {
        logger.warn(`⚠️ [${requestId}] AI analysis failed:`, aiError);
      }
      
      // Save results to database
      try {
        const prisma = dbService.getClient();
        
        // Update report
        await prisma.report.update({
          where: { id: reportId },
          data: {
            extractedText: ocrResult.text,
            ocrConfidence: ocrResult.confidence,
            status: 'COMPLETED'
          }
        });
        
        // Save metrics
        for (const metric of metrics) {
          await prisma.healthMetric.create({
            data: {
              reportId,
              category: metric.category,
              metric: metric.metric,
              value: String(metric.value), // Convert to string to match schema
              unit: metric.unit,
              flag: metric.flag
            }
          });
        }
        
        // Save analysis if available
        if (analysis) {
          await prisma.analysis.create({
            data: {
              reportId,
              aiAnalysis: JSON.stringify(analysis.analysis),
              recommendations: JSON.stringify(analysis.recommendations),
              healthScore: analysis.healthScore
            }
          });
        }
        
        logger.info(`💾 [${requestId}] Results saved to database`);
      } catch (dbError) {
        logger.warn(`⚠️ [${requestId}] Database save failed:`, dbError);
      }
      
      // Return response
      const processingTime = Date.now() - parseInt(requestId.split('-')[0], 16);
      
      res.json({
        success: true,
        requestId,
        report: {
          id: reportId,
          fileName: originalname,
          fileType: mimetype,
          fileUrl: storageResult.url,
          status: 'COMPLETED'
        },
        ocr: {
          confidence: ocrResult.confidence,
          method: ocrResult.processingMethod,
          pageCount: ocrResult.pageCount,
          processingTime: ocrResult.processingTime
        },
        metrics: {
          count: metrics.length,
          categories: [...new Set(metrics.map(m => m.category))]
        },
        analysis: analysis ? {
          healthScore: analysis.healthScore,
          overallAssessment: analysis.analysis.overallAssessment,
          concernsCount: analysis.analysis.concerns.length,
          urgencyLevel: analysis.urgencyLevel,
          processingTime: analysis.processingTime,
          summary: {
            keyFindings: analysis.summary?.keyFindings || [],
            criticalValues: analysis.summary?.criticalValues || [],
            normalValues: analysis.summary?.normalValues || [],
            actionRequired: analysis.summary?.actionRequired || [],
            timelineForImprovement: analysis.summary?.timelineForImprovement || "Follow recommendations consistently"
          }
        } : null,
        meta: {
          totalProcessingTime: processingTime,
          timestamp: new Date().toISOString()
        }
      });
      
      logger.info(`✅ [${requestId}] Upload process completed successfully`);
      
    } catch (error) {
      logger.error(`❌ [${requestId}] Upload process failed:`, error);
      throw error;
    }
  });
  
  static getUploadStatus = asyncHandler(async (req: Request, res: Response) => {
    const { reportId } = req.params;
    
    if (!reportId) {
      throw new AppError('Report ID required', 400);
    }
    
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }
    
    try {
      const prisma = DatabaseService.getInstance().getClient();
      const report = await prisma.report.findUnique({
        where: { id: reportId },
        include: {
          analysis: true,
          metrics: true
        }
      });
      
      if (!report) {
        throw new AppError('Report not found', 404);
      }
      
      // Check user access
      if (req.user.role !== 'admin' && report.userId !== req.user.id) {
        throw new AppError('Access denied', 403);
      }
      
      res.json({
        id: report.id,
        status: report.status,
        fileName: report.fileName,
        uploadDate: report.uploadDate,
        ocrConfidence: report.ocrConfidence,
        metricsCount: report.metrics.length,
        hasAnalysis: !!report.analysis,
        healthScore: report.analysis?.healthScore
      });
      
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get upload status', 500);
    }
  });

  static getFormattedAnalysis = asyncHandler(async (req: Request, res: Response) => {
    const { reportId } = req.params;
    
    if (!reportId) {
      throw new AppError('Report ID required', 400);
    }
    
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }
    
    try {
      const prisma = DatabaseService.getInstance().getClient();
      const report = await prisma.report.findUnique({
        where: { id: reportId },
        include: {
          analysis: true,
          metrics: true
        }
      });
      
      if (!report) {
        throw new AppError('Report not found', 404);
      }
      
      // Check user access
      if (req.user.role !== 'admin' && report.userId !== req.user.id) {
        throw new AppError('Access denied', 403);
      }
      
      if (!report.analysis) {
        throw new AppError('Analysis not available for this report', 404);
      }
      
      const analysisData = JSON.parse(report.analysis.aiAnalysis);
      const recommendationsData = JSON.parse(report.analysis.recommendations);
      
      // Format the response in a user-friendly structure
      const formattedAnalysis = {
        reportInfo: {
          fileName: report.fileName,
          uploadDate: report.uploadDate,
          ocrConfidence: `${Math.round(report.ocrConfidence || 0)}%`,
          totalMetrics: report.metrics.length
        },
        
        healthOverview: {
          healthScore: {
            score: report.analysis.healthScore || 0,
            rating: this.getHealthRating(report.analysis.healthScore || 0),
            description: this.getScoreDescription(report.analysis.healthScore || 0)
          },
          urgencyLevel: {
            level: analysisData.urgencyLevel || 'routine',
            badge: this.getUrgencyBadge(analysisData.urgencyLevel || 'routine'),
            meaning: this.getUrgencyMeaning(analysisData.urgencyLevel || 'routine')
          }
        },
        
        clinicalSummary: {
          overallAssessment: analysisData.overallAssessment || 'Assessment not available',
          keyFindings: analysisData.summary?.keyFindings || [],
          criticalValues: analysisData.summary?.criticalValues || [],
          normalValues: analysisData.summary?.normalValues || []
        },
        
        healthConcerns: {
          primaryConcerns: analysisData.concerns || [],
          riskFactors: analysisData.riskFactors || [],
          specialistRecommendations: analysisData.specialists || []
        },
        
        actionPlan: {
          immediateActions: analysisData.summary?.actionRequired || [],
          followUpTests: analysisData.followUpTests || [],
          monitoring: analysisData.monitoring || [],
          timeline: analysisData.summary?.timelineForImprovement || 'Follow recommendations consistently'
        },
        
        lifestyle: {
          dietary: {
            title: "🍽️ Dietary Recommendations",
            goodFoods: {
              title: "✅ Foods to Include",
              items: recommendationsData.dietary?.foods_to_include || []
            },
            avoidFoods: {
              title: "❌ Foods to Avoid", 
              items: recommendationsData.dietary?.foods_to_avoid || []
            },
            mealPlan: recommendationsData.dietary?.meal_plan_suggestions || '',
            nutritionalFocus: recommendationsData.dietary?.nutritionalFocus || []
          },
          
          exercise: {
            title: "🏃‍♂️ Exercise & Activity",
            workouts: recommendationsData.lifestyle?.exercise || [],
            dailyRoutine: recommendationsData.lifestyle?.daily_routine || [],
            stressManagement: recommendationsData.lifestyle?.stress_management || []
          },
          
          supplements: {
            title: "💊 Supplements & Medicine",
            recommendations: recommendationsData.supplements || [],
            note: "Always consult your healthcare provider before starting any supplements"
          },
          
          ayurvedic: {
            title: "🌿 Holistic Wellness",
            recommendation: recommendationsData.ayurvedic || '',
            preventiveMeasures: recommendationsData.lifestyle?.preventiveMeasures || []
          }
        },
        
        labResults: {
          title: "📊 Laboratory Results Detail",
          metrics: report.metrics.map(metric => ({
            name: metric.metric,
            value: `${metric.value} ${metric.unit}`,
            status: metric.flag,
            category: metric.category,
            statusIcon: this.getStatusIcon(metric.flag),
            statusColor: this.getStatusColor(metric.flag)
          }))
        },
        
        metadata: {
          analysisDate: report.analysis.createdAt,
          modelUsed: "Google AI (Gemini 1.5 Flash)",
          confidence: "High",
          reportId: report.id
        }
      };
      
      res.json({
        success: true,
        analysis: formattedAnalysis
      });
      
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to get formatted analysis:', error);
      throw new AppError('Failed to get formatted analysis', 500);
    }
  });
  
  private static getHealthRating(score: number): string {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Very Good';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Fair';
    if (score >= 50) return 'Poor';
    return 'Critical';
  }
  
  private static getScoreDescription(score: number): string {
    if (score >= 90) return 'Your health parameters are in excellent condition. Keep up the great work!';
    if (score >= 80) return 'Your health parameters are very good with minor areas for improvement.';
    if (score >= 70) return 'Your health parameters are good but could benefit from some lifestyle modifications.';
    if (score >= 60) return 'Your health parameters need attention. Follow the recommendations closely.';
    if (score >= 50) return 'Your health parameters require immediate attention and lifestyle changes.';
    return 'Your health parameters require urgent medical attention. Consult a doctor immediately.';
  }
  
  private static getUrgencyBadge(level: string): string {
    switch (level) {
      case 'urgent': return '🚨 URGENT';
      case 'moderate': return '⚠️ MODERATE';
      default: return '✅ ROUTINE';
    }
  }
  
  private static getUrgencyMeaning(level: string): string {
    switch (level) {
      case 'urgent': return 'Requires immediate medical attention';
      case 'moderate': return 'Schedule medical consultation within 1-2 weeks';
      default: return 'Regular monitoring and lifestyle maintenance';
    }
  }
  
  private static getStatusIcon(flag: string): string {
    switch (flag) {
      case 'CRITICAL': return '🔴';
      case 'HIGH': return '🟡';
      case 'LOW': return '🟡';
      default: return '🟢';
    }
  }
  
  private static getStatusColor(flag: string): string {
    switch (flag) {
      case 'CRITICAL': return '#dc2626';
      case 'HIGH': return '#f59e0b';
      case 'LOW': return '#f59e0b';
      default: return '#10b981';
    }
  }

  static getReportParameters = asyncHandler(async (req: Request, res: Response) => {
    const { reportId } = req.params;
    
    if (!reportId) {
      throw new AppError('Report ID required', 400);
    }
    
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }
    
    try {
      const prisma = DatabaseService.getInstance().getClient();
      const report = await prisma.report.findUnique({
        where: { id: reportId },
        include: {
          analysis: true,
          metrics: {
            orderBy: {
              category: 'asc'
            }
          }
        }
      });
      
      if (!report) {
        throw new AppError('Report not found', 404);
      }
      
      // Check user access
      if (req.user.role !== 'admin' && report.userId !== req.user.id) {
        throw new AppError('Access denied', 403);
      }
      
      // Group metrics by category for better organization
      const categorizedMetrics = report.metrics.reduce((acc, metric) => {
        const category = metric.category || 'General';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push({
          name: metric.metric,
          value: metric.value,
          unit: metric.unit,
          status: metric.flag,
          statusIcon: this.getStatusIcon(metric.flag),
          statusColor: this.getStatusColor(metric.flag),
          normalMin: metric.normalMin,
          normalMax: metric.normalMax,
          id: metric.id
        });
        return acc;
      }, {} as Record<string, any[]>);
      
      const formattedResponse = {
        reportInfo: {
          id: report.id,
          fileName: report.fileName,
          uploadDate: report.uploadDate,
          fileType: report.fileType,
          status: report.status,
          ocrConfidence: report.ocrConfidence ? `${Math.round(report.ocrConfidence)}%` : 'N/A'
        },
        
        healthScore: report.analysis?.healthScore || null,
        
        totalParameters: report.metrics.length,
        
        parametersByCategory: categorizedMetrics,
        
        allParameters: report.metrics.map(metric => ({
          id: metric.id,
          category: metric.category || 'General',
          parameter: metric.metric,
          value: metric.value,
          unit: metric.unit,
          status: metric.flag,
          statusIcon: this.getStatusIcon(metric.flag),
          statusColor: this.getStatusColor(metric.flag),
          normalRange: metric.normalMin && metric.normalMax ? 
            `${metric.normalMin} - ${metric.normalMax}` : 'Not specified',
          createdAt: metric.createdAt
        })),
        
        summary: report.analysis ? {
          overallAssessment: JSON.parse(report.analysis.aiAnalysis).overallAssessment,
          healthScore: report.analysis.healthScore,
          urgencyLevel: JSON.parse(report.analysis.aiAnalysis).urgencyLevel || 'routine'
        } : null
      };
      
      res.json({
        success: true,
        data: formattedResponse
      });
      
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to get report parameters:', error);
      throw new AppError('Failed to get report parameters', 500);
    }
  });

  static getAllReportsWithParameters = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }
    
    try {
      const prisma = DatabaseService.getInstance().getClient();
      
      // Filter by user unless admin
      const where = req.user.role === 'admin' ? {} : { userId: req.user.id };
      
      const reports = await prisma.report.findMany({
        where,
        include: {
          analysis: true,
          metrics: {
            orderBy: {
              category: 'asc'
            }
          }
        },
        orderBy: {
          uploadDate: 'desc'
        }
      });
      
      const formattedReports = reports.map(report => ({
        id: report.id,
        fileName: report.fileName,
        uploadDate: report.uploadDate,
        fileType: report.fileType,
        status: report.status,
        ocrConfidence: report.ocrConfidence ? `${Math.round(report.ocrConfidence)}%` : 'N/A',
        healthScore: report.analysis?.healthScore || null,
        totalParameters: report.metrics.length,
        
        parameters: report.metrics.map(metric => ({
          id: metric.id,
          category: metric.category || 'General',
          parameter: metric.metric,
          value: metric.value,
          unit: metric.unit,
          status: metric.flag,
          statusIcon: this.getStatusIcon(metric.flag),
          statusColor: this.getStatusColor(metric.flag),
          normalRange: metric.normalMin && metric.normalMax ? 
            `${metric.normalMin} - ${metric.normalMax}` : 'Not specified'
        })),
        
        summary: report.analysis ? {
          overallAssessment: JSON.parse(report.analysis.aiAnalysis).overallAssessment,
          healthScore: report.analysis.healthScore,
          urgencyLevel: JSON.parse(report.analysis.aiAnalysis).urgencyLevel || 'routine'
        } : null
      }));
      
      res.json({
        success: true,
        data: {
          totalReports: reports.length,
          reports: formattedReports
        }
      });
      
    } catch (error) {
      logger.error('Failed to get all reports with parameters:', error);
      throw new AppError('Failed to get reports with parameters', 500);
    }
  });
}