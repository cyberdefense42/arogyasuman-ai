import { Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../../../utils/logger';
import { AppError, asyncHandler } from '../../../middlewares/errorHandler';
import { DatabaseService } from '../../../services/database/DatabaseService';
import { AIService } from '../../../services/ai/AIService';

const timelineQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  metrics: z.array(z.string()).optional(),
  groupBy: z.enum(['day', 'week', 'month', 'quarter']).optional()
});

export class TimelineController {
  static getHealthTimeline = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id || 'demo-user';
    const validation = timelineQuerySchema.safeParse(req.query);
    
    if (!validation.success) {
      throw new AppError('Invalid query parameters', 400);
    }

    const { startDate, endDate, metrics: filterMetrics, groupBy = 'month' } = validation.data;

    try {
      const dbService = DatabaseService.getInstance();
      const prisma = dbService.getClient();

      // Get reports within date range
      const reports = await prisma.report.findMany({
        where: {
          userId,
          uploadDate: {
            gte: startDate ? new Date(startDate) : undefined,
            lte: endDate ? new Date(endDate) : undefined
          }
        },
        include: {
          metrics: filterMetrics ? {
            where: {
              metric: { in: filterMetrics }
            }
          } : true,
          analysis: true
        },
        orderBy: { uploadDate: 'asc' }
      });

      // Process timeline data
      const timeline = processTimelineData(reports, groupBy);

      res.json({
        success: true,
        timeline,
        summary: {
          totalReports: reports.length,
          dateRange: {
            start: reports[0]?.uploadDate || null,
            end: reports[reports.length - 1]?.uploadDate || null
          },
          metricsTracked: [...new Set(reports.flatMap(r => r.metrics.map(m => m.metric)))]
        }
      });

    } catch (error) {
      logger.error('Timeline error:', error);
      throw new AppError('Failed to get health timeline', 500);
    }
  });

  static getMetricTrends = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id || 'demo-user';
    const { metric } = req.params;

    if (!metric) {
      throw new AppError('Metric name required', 400);
    }

    try {
      const dbService = DatabaseService.getInstance();
      const prisma = dbService.getClient();
      const aiService = AIService.getInstance();

      // Get all values for this metric
      const metricData = await prisma.healthMetric.findMany({
        where: {
          metric,
          report: { userId }
        },
        include: {
          report: {
            select: { uploadDate: true }
          }
        },
        orderBy: { report: { uploadDate: 'asc' } }
      });

      if (metricData.length < 2) {
        return res.json({
          success: true,
          trend: 'insufficient_data',
          message: 'Need at least 2 data points to show trends'
        });
      }

      // Calculate trend statistics
      const values = metricData.map(m => parseFloat(m.value));
      const dates = metricData.map(m => m.report.uploadDate);
      
      const trend = calculateTrend(values);
      const statistics = {
        current: values[values.length - 1],
        previous: values[values.length - 2],
        change: ((values[values.length - 1] - values[values.length - 2]) / values[values.length - 2] * 100).toFixed(2),
        average: (values.reduce((a, b) => a + b) / values.length).toFixed(2),
        min: Math.min(...values),
        max: Math.max(...values),
        trend: trend
      };

      // Get AI interpretation
      const prompt = `Analyze this health metric trend:
        Metric: ${metric}
        Values over time: ${JSON.stringify(metricData.map(m => ({
          date: m.report.uploadDate,
          value: m.value,
          unit: m.unit,
          flag: m.flag
        })))}
        
        Provide a brief interpretation of the trend and what it means for the patient's health.`;

      const interpretation = await aiService.generateResponse(prompt);

      res.json({
        success: true,
        metric,
        dataPoints: metricData.map(m => ({
          date: m.report.uploadDate,
          value: parseFloat(m.value),
          unit: m.unit,
          flag: m.flag
        })),
        statistics,
        interpretation: interpretation.response
      });

    } catch (error) {
      logger.error('Metric trends error:', error);
      throw new AppError('Failed to get metric trends', 500);
    }
  });

  static getHealthScore = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id || 'demo-user';

    try {
      const dbService = DatabaseService.getInstance();
      const prisma = dbService.getClient();
      const aiService = AIService.getInstance();

      // Get latest report with all metrics
      const latestReport = await prisma.report.findFirst({
        where: { userId },
        include: { metrics: true, analysis: true },
        orderBy: { uploadDate: 'desc' }
      });

      if (!latestReport) {
        return res.json({
          success: true,
          healthScore: null,
          message: 'No reports found to calculate health score'
        });
      }

      // Calculate health score based on metrics
      const healthScore = calculateHealthScore(latestReport.metrics);

      // Get historical scores for trend
      const historicalReports = await prisma.report.findMany({
        where: { userId },
        include: { analysis: true },
        orderBy: { uploadDate: 'desc' },
        take: 10
      });

      const scoreHistory = historicalReports
        .filter(r => r.analysis?.healthScore)
        .map(r => ({
          date: r.uploadDate,
          score: r.analysis!.healthScore
        }));

      res.json({
        success: true,
        currentScore: healthScore,
        scoreBreakdown: {
          cardiovascular: calculateCategoryScore(latestReport.metrics, 'cardiovascular'),
          metabolic: calculateCategoryScore(latestReport.metrics, 'metabolic'),
          liver: calculateCategoryScore(latestReport.metrics, 'liver'),
          kidney: calculateCategoryScore(latestReport.metrics, 'kidney'),
          blood: calculateCategoryScore(latestReport.metrics, 'blood')
        },
        history: scoreHistory,
        recommendations: generateHealthRecommendations(healthScore, latestReport.metrics)
      });

    } catch (error) {
      logger.error('Health score error:', error);
      throw new AppError('Failed to calculate health score', 500);
    }
  });
}

// Helper functions
function processTimelineData(reports: any[], groupBy: string) {
  const grouped: { [key: string]: any[] } = {};
  
  reports.forEach(report => {
    const date = new Date(report.uploadDate);
    let key: string;
    
    switch (groupBy) {
      case 'day':
        key = date.toISOString().split('T')[0];
        break;
      case 'week':
        const week = getWeek(date);
        key = `${date.getFullYear()}-W${week}`;
        break;
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'quarter':
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        key = `${date.getFullYear()}-Q${quarter}`;
        break;
      default:
        key = date.toISOString().split('T')[0];
    }
    
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(report);
  });

  return Object.entries(grouped).map(([period, reports]) => ({
    period,
    reportCount: reports.length,
    metrics: aggregateMetrics(reports),
    averageHealthScore: calculateAverageHealthScore(reports)
  }));
}

function aggregateMetrics(reports: any[]) {
  const metrics: { [key: string]: any } = {};
  
  reports.forEach(report => {
    report.metrics.forEach((metric: any) => {
      if (!metrics[metric.metric]) {
        metrics[metric.metric] = {
          values: [],
          unit: metric.unit
        };
      }
      metrics[metric.metric].values.push(parseFloat(metric.value));
    });
  });

  return Object.entries(metrics).map(([name, data]: [string, any]) => ({
    metric: name,
    average: (data.values.reduce((a: number, b: number) => a + b) / data.values.length).toFixed(2),
    min: Math.min(...data.values),
    max: Math.max(...data.values),
    unit: data.unit
  }));
}

function calculateTrend(values: number[]): string {
  if (values.length < 2) return 'stable';
  
  const recentChange = values[values.length - 1] - values[values.length - 2];
  const percentChange = (recentChange / values[values.length - 2]) * 100;
  
  if (Math.abs(percentChange) < 5) return 'stable';
  if (percentChange > 15) return 'increasing_fast';
  if (percentChange > 5) return 'increasing';
  if (percentChange < -15) return 'decreasing_fast';
  return 'decreasing';
}

function calculateHealthScore(metrics: any[]): number {
  let score = 100;
  
  metrics.forEach(metric => {
    if (metric.flag === 'high' || metric.flag === 'low') {
      score -= 5;
    }
    if (metric.flag === 'critical') {
      score -= 15;
    }
  });
  
  return Math.max(0, Math.min(100, score));
}

function calculateCategoryScore(metrics: any[], category: string): number {
  const categoryMetrics = metrics.filter(m => getCategoryForMetric(m.metric) === category);
  if (categoryMetrics.length === 0) return 100;
  
  return calculateHealthScore(categoryMetrics);
}

function getCategoryForMetric(metric: string): string {
  const categories: { [key: string]: string[] } = {
    cardiovascular: ['cholesterol', 'ldl', 'hdl', 'triglycerides'],
    metabolic: ['glucose', 'hba1c', 'insulin'],
    liver: ['sgot', 'sgpt', 'bilirubin', 'albumin'],
    kidney: ['creatinine', 'urea', 'uric acid'],
    blood: ['hemoglobin', 'rbc', 'wbc', 'platelet']
  };
  
  for (const [cat, metrics] of Object.entries(categories)) {
    if (metrics.some(m => metric.toLowerCase().includes(m))) {
      return cat;
    }
  }
  return 'other';
}

function calculateAverageHealthScore(reports: any[]): number {
  const scores = reports
    .filter(r => r.analysis?.healthScore)
    .map(r => r.analysis.healthScore);
    
  if (scores.length === 0) return 0;
  return scores.reduce((a, b) => a + b) / scores.length;
}

function generateHealthRecommendations(score: number, metrics: any[]): string[] {
  const recommendations = [];
  
  if (score < 60) {
    recommendations.push("Schedule a consultation with your doctor for a comprehensive health review");
  }
  
  if (score < 80) {
    recommendations.push("Focus on improving diet and increasing physical activity");
  }
  
  const highMetrics = metrics.filter(m => m.flag === 'high');
  if (highMetrics.length > 0) {
    recommendations.push(`Work on reducing: ${highMetrics.map(m => m.metric).join(', ')}`);
  }
  
  const lowMetrics = metrics.filter(m => m.flag === 'low');
  if (lowMetrics.length > 0) {
    recommendations.push(`Focus on improving: ${lowMetrics.map(m => m.metric).join(', ')}`);
  }
  
  return recommendations;
}

function getWeek(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}