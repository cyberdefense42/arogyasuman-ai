import { logger } from '../../utils/logger';
import { config } from '../../config';
import { AppError } from '../../middlewares/errorHandler';
import { HealthMetric } from '../ocr/OCRService';
import { AnalysisResult } from './AIService';

export class OpenRouterService {
  private static instance: OpenRouterService;
  private apiKey: string;
  private baseUrl = 'https://openrouter.ai/api/v1';
  
  private constructor() {
    if (!config.ai.openrouter.apiKey) {
      throw new AppError('OpenRouter API key not configured', 500);
    }
    
    this.apiKey = config.ai.openrouter.apiKey;
  }
  
  static getInstance(): OpenRouterService {
    if (!OpenRouterService.instance) {
      OpenRouterService.instance = new OpenRouterService();
    }
    return OpenRouterService.instance;
  }
  
  async initialize(): Promise<void> {
    try {
      // Test OpenRouter connection
      logger.info('🔄 Testing OpenRouter connection...');
      
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      logger.info(`✅ OpenRouter AI service initialized - ${data.data?.length || 0} models available`);
      
    } catch (error: any) {
      logger.error('❌ OpenRouter AI service initialization failed:', error);
      
      if (error.message?.includes('401')) {
        throw new AppError('Invalid OpenRouter API key', 401);
      }
      
      throw new AppError('OpenRouter AI service unavailable', 503);
    }
  }
  
  async analyzeHealthReport(
    extractedText: string,
    metrics: HealthMetric[],
    contextualInfo: string = ''
  ): Promise<AnalysisResult> {
    const startTime = Date.now();
    
    try {
      logger.info(`🤖 Analyzing ${metrics.length} health metrics with ${config.ai.openrouter.model}...`);
      
      const prompt = this.buildMedicalPrompt(metrics, contextualInfo);
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('AI analysis timeout')), config.ai.openrouter.timeout);
      });
      
      const analysisPromise = fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://healthscan-ai.com',
          'X-Title': 'HealthScan AI Medical Analysis',
        },
        body: JSON.stringify({
          model: config.ai.openrouter.model,
          messages: [
            {
              role: 'system',
              content: 'You are OpenBioLLM, an expert medical AI assistant with extensive healthcare and biomedical knowledge. You were developed by Saama AI Labs. Provide accurate, evidence-based medical analysis while being accessible to patients. Use precise medical terminology while making explanations clear.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3, // Lower temperature for medical accuracy
          max_tokens: 1000,
          top_p: 0.95,
        })
      });
      
      const response = await Promise.race([analysisPromise, timeoutPromise]);
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${errorData}`);
      }
      
      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from OpenRouter');
      }
      
      const generatedText = data.choices[0].message.content;
      
      logger.info(`✅ ${config.ai.openrouter.model} analysis completed`);
      
      const parsedResult = this.parseAIResponse(generatedText, metrics);
      parsedResult.processingTime = Date.now() - startTime;
      parsedResult.modelUsed = `${config.ai.openrouter.model} (OpenRouter)`;
      
      return parsedResult;
      
    } catch (error: any) {
      logger.error('OpenRouter analysis error:', error);
      
      if (error.message?.includes('timeout')) {
        logger.warn('⚠️ OpenRouter timeout, returning fallback analysis');
        return this.getFallbackAnalysis(metrics, Date.now() - startTime);
      }
      
      if (error.message?.includes('Rate limit') || error.message?.includes('429')) {
        throw new AppError('API rate limit exceeded. Please try again later.', 429);
      }
      
      if (error.message?.includes('401') || error.message?.includes('403')) {
        throw new AppError('OpenRouter API authentication failed', 401);
      }
      
      throw new AppError('OpenRouter AI analysis failed', 500);
    }
  }
  
  private buildMedicalPrompt(metrics: HealthMetric[], contextualInfo: string): string {
    return `MEDICAL LABORATORY ANALYSIS

PATIENT LABORATORY RESULTS:
${metrics.map(m => `${m.metric}: ${m.value} ${m.unit} (${m.flag})`).join('\n')}

${contextualInfo ? `\nPATIENT CONTEXT:\n${contextualInfo}\n` : ''}

As a medical expert, please provide a comprehensive analysis following this EXACT format:

ASSESSMENT: [Provide a detailed clinical assessment (2-3 sentences) of the patient's health based on these lab results, including medical significance of any abnormal values]

CONCERNS: [List specific medical concerns or conditions indicated by abnormal values. If all values are normal, state "All parameters within normal ranges"]

DIETARY: [List 5 specific foods to include for this condition, separated by commas - prefer Indian cuisine where appropriate]

AVOID: [List 3-4 foods to avoid based on these results, separated by commas]

EXERCISE: [List 3 specific exercises with duration and frequency, separated by commas]

SCORE: [Calculate overall health score from 0-100 based on the lab values]

Please ensure your response follows this exact format for proper parsing.`;
  }
  
  private parseAIResponse(content: string, metrics: HealthMetric[]): AnalysisResult {
    logger.info('🔍 Parsing OpenRouter AI response...');
    
    const sections = content.split('\n\n');
    const result: any = {
      assessment: "Your blood test results have been analyzed by OpenBioLLM.",
      concerns: [],
      dietary: [],
      avoid: [],
      exercise: [],
      score: this.calculateHealthScore(metrics),
      urgencyLevel: 'routine' as const
    };
    
    for (const section of sections) {
      const lines = section.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.startsWith('ASSESSMENT:')) {
          result.assessment = line.replace('ASSESSMENT:', '').trim();
          while (i + 1 < lines.length && !lines[i + 1].includes(':')) {
            result.assessment += ' ' + lines[++i];
          }
        } else if (line.startsWith('CONCERNS:')) {
          const concernText = line.replace('CONCERNS:', '').trim();
          if (concernText.toLowerCase().includes('normal range') || concernText.toLowerCase().includes('normal parameter')) {
            result.concerns = ["All laboratory parameters are within normal reference ranges"];
            result.urgencyLevel = 'routine';
          } else {
            result.concerns = [concernText];
            while (i + 1 < lines.length && !lines[i + 1].includes(':')) {
              result.concerns.push(lines[++i]);
            }
            result.concerns = result.concerns.filter(c => c.length > 0);
            
            // Determine urgency based on concerns
            const concernsText = result.concerns.join(' ').toLowerCase();
            if (concernsText.includes('critical') || concernsText.includes('urgent') || concernsText.includes('immediate')) {
              result.urgencyLevel = 'urgent';
            } else if (concernsText.includes('elevated') || concernsText.includes('abnormal') || concernsText.includes('monitor')) {
              result.urgencyLevel = 'moderate';
            }
          }
        } else if (line.startsWith('DIETARY:')) {
          const foodText = line.replace('DIETARY:', '').trim();
          result.dietary = foodText.split(',').map(f => f.trim().replace(/["']/g, '')).filter(f => f.length > 0);
        } else if (line.startsWith('AVOID:')) {
          const avoidText = line.replace('AVOID:', '').trim();
          result.avoid = avoidText.split(',').map(f => f.trim().replace(/["']/g, '')).filter(f => f.length > 0);
        } else if (line.startsWith('EXERCISE:')) {
          const exerciseText = line.replace('EXERCISE:', '').trim();
          result.exercise = exerciseText.split(',').map(e => e.trim().replace(/["']/g, '')).filter(e => e.length > 0);
        } else if (line.startsWith('SCORE:')) {
          const scoreMatch = line.match(/\d+/);
          if (scoreMatch) {
            const parsedScore = parseInt(scoreMatch[0]);
            if (!isNaN(parsedScore) && parsedScore >= 0 && parsedScore <= 100) {
              result.score = parsedScore;
            }
          }
        }
      }
    }
    
    // Enhanced fallbacks with medical-grade recommendations
    if (result.dietary.length === 0) {
      result.dietary = [
        "Iron-rich spinach dal with tomatoes",
        "Vitamin C-rich amla juice twice daily", 
        "Folate-rich methi paratha with minimal oil",
        "Protein-rich moong sprouts salad",
        "Calcium-rich sesame seed laddu (small portion)"
      ];
    }
    if (result.avoid.length === 0) {
      result.avoid = [
        "High-sodium processed and packaged foods",
        "Trans fat-rich deep fried snacks and bakery items", 
        "High glycemic index sweets and refined sugars",
        "Excessive caffeine and alcohol"
      ];
    }
    if (result.exercise.length === 0) {
      result.exercise = [
        "Brisk walking 30-45 minutes daily",
        "Yoga asanas and stretching 20 minutes morning",
        "Pranayama breathing exercises 15 minutes twice daily"
      ];
    }
    if (result.concerns.length === 0) {
      result.concerns = this.extractConcerns(metrics);
    }
    
    return {
      analysis: {
        overallAssessment: result.assessment,
        concerns: result.concerns,
        specialists: this.suggestSpecialists(metrics),
        followUpTests: this.suggestFollowUpTests(metrics),
        clinicalInterpretation: `Analysis performed by ${config.ai.openrouter.model} - Advanced medical language model specialized in healthcare.`,
        riskFactors: this.identifyRiskFactors(metrics)
      },
      recommendations: {
        dietary: {
          foods_to_include: result.dietary,
          foods_to_avoid: result.avoid,
          meal_plan_suggestions: "Follow a balanced Indian diet with the recommended foods, focusing on whole grains, lean proteins, and fresh vegetables.",
          nutritionalFocus: this.getNutritionalFocus(metrics)
        },
        lifestyle: {
          exercise: result.exercise,
          daily_routine: [
            "Maintain consistent sleep schedule (7-8 hours)",
            "Stay adequately hydrated (8-10 glasses water daily)",
            "Practice stress management techniques"
          ],
          stress_management: [
            "Deep breathing exercises",
            "Meditation or mindfulness practice",
            "Regular social interactions"
          ],
          preventiveMeasures: this.getPreventiveMeasures(metrics)
        },
        ayurvedic: "Consider consultation with qualified Ayurvedic practitioner for holistic approach complementing modern medicine.",
        supplements: this.suggestSupplements(metrics)
      },
      healthScore: result.score,
      urgencyLevel: result.urgencyLevel,
      processingTime: 0
    };
  }
  
  // Helper methods (reuse from HuggingFaceService)
  private calculateHealthScore(metrics: HealthMetric[]): number {
    if (metrics.length === 0) return 75;
    
    const weights = { NORMAL: 100, LOW: 65, HIGH: 65, CRITICAL: 25 };
    const totalScore = metrics.reduce((sum, metric) => sum + (weights[metric.flag] || 75), 0);
    
    return Math.round(totalScore / metrics.length);
  }
  
  private extractConcerns(metrics: HealthMetric[]): string[] {
    const concerns: string[] = [];
    
    metrics.forEach(metric => {
      if (metric.flag === 'HIGH' || metric.flag === 'LOW' || metric.flag === 'CRITICAL') {
        concerns.push(`${metric.metric} is ${metric.flag.toLowerCase()} at ${metric.value} ${metric.unit}`);
      }
    });
    
    return concerns.length > 0 ? concerns : ["All analyzed parameters are within acceptable ranges"];
  }
  
  private suggestSpecialists(metrics: HealthMetric[]): string[] {
    const specialists: string[] = [];
    
    metrics.forEach(metric => {
      if (metric.flag === 'CRITICAL' || metric.flag === 'HIGH' || metric.flag === 'LOW') {
        const metricName = metric.metric.toLowerCase();
        
        if (metricName.includes('glucose') || metricName.includes('hba1c')) {
          specialists.push('Endocrinologist');
        }
        if (metricName.includes('cholesterol') || metricName.includes('triglyceride')) {
          specialists.push('Cardiologist');
        }
        if (metricName.includes('creatinine') || metricName.includes('urea')) {
          specialists.push('Nephrologist');
        }
        if (metricName.includes('liver') || metricName.includes('alt') || metricName.includes('ast')) {
          specialists.push('Gastroenterologist');
        }
      }
    });
    
    return [...new Set(specialists)];
  }
  
  private suggestFollowUpTests(metrics: HealthMetric[]): string[] {
    const tests: string[] = [];
    
    metrics.forEach(metric => {
      if (metric.flag === 'CRITICAL' || metric.flag === 'HIGH' || metric.flag === 'LOW') {
        const metricName = metric.metric.toLowerCase();
        
        if (metricName.includes('glucose')) {
          tests.push('HbA1c test', 'Oral glucose tolerance test');
        }
        if (metricName.includes('cholesterol')) {
          tests.push('Lipid profile repeat in 3 months', 'Cardiac risk assessment');
        }
        if (metricName.includes('hemoglobin')) {
          tests.push('Iron studies', 'Vitamin B12 and folate levels');
        }
      }
    });
    
    return [...new Set(tests)];
  }
  
  private identifyRiskFactors(metrics: HealthMetric[]): string[] {
    const riskFactors: string[] = [];
    
    metrics.forEach(metric => {
      const metricName = metric.metric.toLowerCase();
      
      if ((metricName.includes('glucose') || metricName.includes('hba1c')) && 
          (metric.flag === 'HIGH' || metric.flag === 'CRITICAL')) {
        riskFactors.push('Diabetes risk', 'Cardiovascular disease risk');
      }
      
      if (metricName.includes('cholesterol') && metric.flag === 'HIGH') {
        riskFactors.push('Heart disease risk', 'Stroke risk');
      }
      
      if (metricName.includes('blood pressure') && metric.flag === 'HIGH') {
        riskFactors.push('Hypertension complications', 'Kidney disease risk');
      }
    });
    
    return [...new Set(riskFactors)];
  }
  
  private getNutritionalFocus(metrics: HealthMetric[]): string[] {
    const focus: string[] = [];
    
    metrics.forEach(metric => {
      const metricName = metric.metric.toLowerCase();
      
      if (metricName.includes('hemoglobin') && metric.flag === 'LOW') {
        focus.push('Iron', 'Vitamin C', 'Folate', 'Vitamin B12');
      }
      
      if (metricName.includes('glucose') && metric.flag === 'HIGH') {
        focus.push('Complex carbohydrates', 'Fiber', 'Lean protein');
      }
      
      if (metricName.includes('cholesterol') && metric.flag === 'HIGH') {
        focus.push('Omega-3 fatty acids', 'Soluble fiber', 'Plant sterols');
      }
    });
    
    return [...new Set(focus)];
  }
  
  private getPreventiveMeasures(metrics: HealthMetric[]): string[] {
    const measures: string[] = [
      'Regular health check-ups every 6 months',
      'Maintain healthy weight (BMI 18.5-24.9)',
      'Monitor blood pressure regularly'
    ];
    
    metrics.forEach(metric => {
      if (metric.flag === 'HIGH' || metric.flag === 'CRITICAL') {
        const metricName = metric.metric.toLowerCase();
        
        if (metricName.includes('glucose')) {
          measures.push('Blood sugar monitoring', 'Diabetes screening annually');
        }
        
        if (metricName.includes('cholesterol')) {
          measures.push('Lipid profile monitoring', 'Heart health screening');
        }
      }
    });
    
    return [...new Set(measures)];
  }
  
  private suggestSupplements(metrics: HealthMetric[]): string[] {
    const supplements: string[] = [];
    
    metrics.forEach(metric => {
      const metricName = metric.metric.toLowerCase();
      
      if (metricName.includes('hemoglobin') && metric.flag === 'LOW') {
        supplements.push('Iron supplement (consult doctor)', 'Vitamin C for iron absorption');
      }
      
      if (metricName.includes('vitamin d') && metric.flag === 'LOW') {
        supplements.push('Vitamin D3 supplement', 'Calcium supplement');
      }
      
      if (metricName.includes('b12') && metric.flag === 'LOW') {
        supplements.push('Vitamin B12 supplement', 'B-complex vitamins');
      }
    });
    
    // Add note about doctor consultation
    if (supplements.length > 0) {
      supplements.push('Note: Consult healthcare provider before starting any supplements');
    }
    
    return [...new Set(supplements)];
  }
  
  private getFallbackAnalysis(metrics: HealthMetric[], processingTime: number): AnalysisResult {
    return {
      analysis: {
        overallAssessment: "Analysis completed using OpenRouter backup system. Your laboratory results have been processed with medical-grade AI.",
        concerns: this.extractConcerns(metrics),
        specialists: this.suggestSpecialists(metrics),
        followUpTests: this.suggestFollowUpTests(metrics),
        clinicalInterpretation: "Fallback analysis - please retry for full OpenRouter analysis.",
        riskFactors: this.identifyRiskFactors(metrics)
      },
      recommendations: {
        dietary: {
          foods_to_include: [
            "Iron-rich spinach dal with tomatoes",
            "Vitamin C-rich amla juice",
            "Folate-rich methi paratha",
            "Protein-rich moong sprouts",
            "Calcium-rich sesame seeds"
          ],
          foods_to_avoid: [
            "High-sodium processed foods",
            "Trans fat-rich fried items",
            "High glycemic index sweets",
            "Excessive caffeine"
          ],
          meal_plan_suggestions: "Follow balanced Indian diet emphasizing whole foods and traditional cooking methods.",
          nutritionalFocus: this.getNutritionalFocus(metrics)
        },
        lifestyle: {
          exercise: [
            "Brisk walking 30-45 minutes daily",
            "Yoga and stretching 20 minutes",
            "Pranayama breathing exercises 15 minutes"
          ],
          daily_routine: [
            "Consistent sleep schedule (7-8 hours)",
            "Adequate hydration throughout day",
            "Regular meal timings"
          ],
          stress_management: [
            "Daily meditation practice",
            "Deep breathing exercises",
            "Regular social connections"
          ],
          preventiveMeasures: this.getPreventiveMeasures(metrics)
        },
        ayurvedic: "Consider Ayurvedic consultation for personalized dosha-based recommendations complementing modern medicine.",
        supplements: this.suggestSupplements(metrics)
      },
      healthScore: this.calculateHealthScore(metrics),
      urgencyLevel: 'routine',
      processingTime,
      modelUsed: `${config.ai.openrouter.model} (OpenRouter Fallback)`
    };
  }
  
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}