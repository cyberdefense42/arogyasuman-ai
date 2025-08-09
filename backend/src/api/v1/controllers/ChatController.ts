import { Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../../utils/logger';
import { AppError, asyncHandler } from '../../../middlewares/errorHandler';
import { AIService } from '../../../services/ai/AIService';
import { DatabaseService } from '../../../services/database/DatabaseService';

const chatMessageSchema = z.object({
  message: z.string().min(1).max(1000),
  sessionId: z.string().optional(),
  context: z.object({
    reportId: z.string().optional(),
    metrics: z.array(z.any()).optional()
  }).optional()
});

export class ChatController {
  static sendMessage = asyncHandler(async (req: Request, res: Response) => {
    const validation = chatMessageSchema.safeParse(req.body);
    if (!validation.success) {
      throw new AppError('Invalid message format', 400);
    }

    const { message, sessionId = uuidv4(), context } = validation.data;
    const userId = req.user?.id || 'demo-user';

    try {
      const aiService = AIService.getInstance();
      const dbService = DatabaseService.getInstance();
      const prisma = dbService.getClient();

      // Get user's health context
      let healthContext = '';
      if (context?.reportId) {
        const report = await prisma.report.findUnique({
          where: { id: context.reportId },
          include: { metrics: true, analysis: true }
        });
        
        if (report) {
          healthContext = `Current report shows: ${report.metrics.map(m => 
            `${m.metric}: ${m.value} ${m.unit}`).join(', ')}`;
        }
      }

      // Get chat history
      const chatHistory = await prisma.chatMessage.findMany({
        where: { sessionId, userId },
        orderBy: { createdAt: 'asc' },
        take: 10
      });

      // Build conversation context
      const conversationContext = chatHistory.map(msg => 
        `${msg.role}: ${msg.content}`
      ).join('\n');

      // Generate AI response
      const prompt = `You are a helpful health assistant for an Indian health app. 
        You help users understand their blood test results and provide health advice.
        
        Previous conversation:
        ${conversationContext}
        
        User's health context:
        ${healthContext}
        
        User message: ${message}
        
        Provide helpful, accurate health information. If discussing test results, 
        explain in simple terms. For serious concerns, recommend consulting a doctor.
        Keep responses concise and relevant to Indian dietary and lifestyle context.`;

      const aiResponse = await aiService.generateResponse(prompt);

      // Save messages to database
      await prisma.chatMessage.createMany({
        data: [
          {
            id: uuidv4(),
            sessionId,
            userId,
            role: 'user',
            content: message
          },
          {
            id: uuidv4(),
            sessionId,
            userId,
            role: 'assistant',
            content: aiResponse.response
          }
        ]
      });

      res.json({
        success: true,
        sessionId,
        response: aiResponse.response,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Chat error:', error);
      throw new AppError('Failed to process chat message', 500);
    }
  });

  static getChatHistory = asyncHandler(async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const userId = req.user?.id || 'demo-user';

    const dbService = DatabaseService.getInstance();
    const prisma = dbService.getClient();

    const messages = await prisma.chatMessage.findMany({
      where: { sessionId, userId },
      orderBy: { createdAt: 'asc' }
    });

    res.json({
      success: true,
      sessionId,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.createdAt
      }))
    });
  });

  static getHealthInsights = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id || 'demo-user';
    
    try {
      const dbService = DatabaseService.getInstance();
      const prisma = dbService.getClient();
      const aiService = AIService.getInstance();

      // Get latest reports
      const reports = await prisma.report.findMany({
        where: { userId },
        include: { metrics: true, analysis: true },
        orderBy: { uploadDate: 'desc' },
        take: 5
      });

      if (reports.length === 0) {
        return res.json({
          success: true,
          insights: {
            summary: "Upload your first blood report to get personalized health insights!",
            suggestions: []
          }
        });
      }

      // Analyze trends
      const metricsOverTime = reports.flatMap(r => r.metrics);
      const prompt = `Analyze these health metrics over time and provide insights:
        ${JSON.stringify(metricsOverTime)}
        
        Provide:
        1. Key health trends
        2. Areas of improvement
        3. Areas of concern
        4. Actionable recommendations
        
        Format as JSON with: summary, trends[], concerns[], recommendations[]`;

      const insights = await aiService.generateResponse(prompt);

      res.json({
        success: true,
        insights: JSON.parse(insights.response),
        reportCount: reports.length,
        latestReportDate: reports[0].uploadDate
      });

    } catch (error) {
      logger.error('Health insights error:', error);
      throw new AppError('Failed to generate health insights', 500);
    }
  });
}