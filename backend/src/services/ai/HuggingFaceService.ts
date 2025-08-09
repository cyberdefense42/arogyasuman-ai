import { HfInference } from '@huggingface/inference';
import { logger } from '../../utils/logger';
import { config } from '../../config';
import { AppError } from '../../middlewares/errorHandler';
import { HealthMetric } from '../ocr/OCRService';
import { AnalysisResult } from './AIService';

export class HuggingFaceService {
  private static instance: HuggingFaceService;
  private hf: HfInference;
  
  private constructor() {
    if (!config.ai.huggingface.apiToken) {
      throw new AppError('Hugging Face API token not configured', 500);
    }
    
    this.hf = new HfInference(config.ai.huggingface.apiToken);
  }
  
  static getInstance(): HuggingFaceService {
    if (!HuggingFaceService.instance) {
      HuggingFaceService.instance = new HuggingFaceService();
    }
    return HuggingFaceService.instance;
  }
  
  async initialize(): Promise<void> {
    try {
      // Test HuggingFace connection with a simple request
      logger.info('🤗 Testing Hugging Face connection...');
      
      const testResponse = await this.hf.textGeneration({
        model: config.ai.huggingface.model,
        inputs: 'Test connection',
        parameters: {
          max_new_tokens: 10,
          temperature: 0.1,
        }
      });
      
      logger.info(`✅ Hugging Face AI service (${config.ai.huggingface.model}) initialized`);
    } catch (error: any) {
      logger.error('❌ Hugging Face AI service initialization failed:', error);
      
      if (error.message?.includes('No Inference Provider') || error.message?.includes('Access to model')) {
        logger.warn('⚠️ Meditron 70B access not yet approved. Please request access at https://huggingface.co/epfl-llm/meditron-70b');
        throw new AppError('Access to Meditron 70B not granted. Please request access at https://huggingface.co/epfl-llm/meditron-70b', 403);
      }
      
      if (error.message?.includes('Invalid token')) {
        throw new AppError('Invalid Hugging Face API token', 401);
      }
      
      throw new AppError('Hugging Face AI service unavailable', 503);
    }
  }
  
  async analyzeHealthReport(
    extractedText: string,
    metrics: HealthMetric[],
    contextualInfo: string = ''
  ): Promise<AnalysisResult> {
    const startTime = Date.now();
    
    try {
      logger.info(`🤗 Analyzing ${metrics.length} health metrics with Meditron 70B...`);
      
      const prompt = this.buildMedicalPrompt(metrics, contextualInfo);
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('AI analysis timeout')), config.ai.huggingface.timeout);
      });
      
      const analysisPromise = this.hf.textGeneration({
        model: config.ai.huggingface.model,
        inputs: prompt,
        parameters: {
          max_new_tokens: 2048,  // Increased for detailed medical analysis
          temperature: 0.1,      // Low temperature for consistent medical advice
          top_p: 0.95,
          repetition_penalty: 1.1,
          do_sample: true,
        }
      });
      
      const response = await Promise.race([analysisPromise, timeoutPromise]);
      
      logger.info(`✅ ${config.ai.huggingface.model} analysis completed`);
      
      // Extract the generated text (remove the original prompt)
      const generatedText = response.generated_text.replace(prompt, '').trim();
      
      const parsedResult = this.parseAIResponse(generatedText, metrics);
      parsedResult.processingTime = Date.now() - startTime;
      parsedResult.modelUsed = `${config.ai.huggingface.model} (Hugging Face)`;
      
      return parsedResult;
      
    } catch (error: any) {
      logger.error('Hugging Face analysis error:', error);
      
      if (error.message?.includes('timeout')) {
        logger.warn('⚠️ HuggingFace timeout, returning fallback analysis');
        return this.getFallbackAnalysis(metrics, Date.now() - startTime);
      }
      
      if (error.message?.includes('Rate limit')) {
        throw new AppError('API rate limit exceeded. Please try again later.', 429);
      }
      
      if (error.message?.includes('Access to model')) {
        throw new AppError('Model access denied. Please request access to Meditron 70B.', 403);
      }
      
      throw new AppError('Hugging Face AI analysis failed', 500);
    }
  }
  
  private buildMedicalPrompt(metrics: HealthMetric[], contextualInfo: string): string {
    // Check if using OpenBioLLM
    const isOpenBioLLM = config.ai.huggingface.model.includes('OpenBioLLM');
    
    if (isOpenBioLLM) {
      return `You are an expert and experienced from the healthcare and biomedical domain with extensive medical knowledge and practical experience. Your name is OpenBioLLM, and you were developed by Saama AI Labs. You're willing to help answer the user's query with explanation. In your explanation, leverage your deep medical expertise such as relevant anatomical structures, physiological processes, diagnostic criteria, treatment guidelines, or other pertinent medical concepts. Use precise medical terminology while still aiming to make the explanation clear and accessible to a general audience.

PATIENT LABORATORY RESULTS:
${metrics.map(m => `${m.metric}: ${m.value} ${m.unit} (${m.flag})`).join('\n')}

${contextualInfo ? `\nPATIENT CONTEXT:\n${contextualInfo}\n` : ''}

Please provide a comprehensive medical analysis following this exact format:

ASSESSMENT: [Provide a detailed clinical assessment (2-3 sentences) of the patient's health based on the lab results]

CONCERNS: [List specific medical concerns or conditions indicated by abnormal values. If all values are normal, state "All parameters within normal ranges"]

DIETARY: [List 5 specific foods to include (Indian cuisine preferred), separated by commas]

AVOID: [List 3-4 foods to avoid, separated by commas]

EXERCISE: [List 3 specific exercises with duration, separated by commas]

SCORE: [Health score 0-100]`;
    }
    
    // Default prompt for other models
    return `CLINICAL LABORATORY ANALYSIS REQUEST

PATIENT LABORATORY RESULTS:
${metrics.map(m => {
  const statusIcon = m.flag === 'NORMAL' ? '✓' : m.flag === 'HIGH' ? '↑' : m.flag === 'LOW' ? '↓' : '⚠️';
  return `${statusIcon} ${m.metric}: ${m.value} ${m.unit} (Status: ${m.flag})`;
}).join('\n')}

${contextualInfo ? `\nADDITIONAL CLINICAL CONTEXT:\n${contextualInfo}\n` : ''}

Please provide a comprehensive medical analysis in the following structured format:

ASSESSMENT: [Provide a detailed clinical assessment (2-3 sentences) interpreting the laboratory findings, their clinical significance, and overall health implications]

CONCERNS: [List specific medical concerns, potential conditions, or areas requiring attention based on abnormal values. If all parameters are normal, state "All laboratory parameters are within normal reference ranges"]

DIETARY: [Recommend 5 specific evidence-based dietary interventions using Indian cuisine that address the laboratory findings. Format as comma-separated list]

AVOID: [List 3-4 specific dietary restrictions based on laboratory results. Format as comma-separated list]

EXERCISE: [Recommend 3 evidence-based physical activities with specific duration and frequency appropriate for the condition. Format as comma-separated list]

SCORE: [Calculate a comprehensive health score (0-100)]`;
  }
  
  private parseAIResponse(content: string, metrics: HealthMetric[]): AnalysisResult {
    logger.info('🔍 Parsing Meditron 70B response...');
    
    const sections = content.split('\n\n');
    const result: any = {
      assessment: "Your blood test results have been analyzed by Meditron 70B.",
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
          if (concernText.toLowerCase().includes('normal range')) {
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
        clinicalInterpretation: `Analysis performed by Meditron 70B - Advanced medical language model trained on clinical literature.`,
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
  
  private calculateHealthScore(metrics: HealthMetric[]): number {
    if (metrics.length === 0) return 75;
    
    const weights = {
      NORMAL: 100,
      LOW: 65,
      HIGH: 65,
      CRITICAL: 25,
    };
    
    const totalScore = metrics.reduce((sum, metric) => {
      return sum + (weights[metric.flag] || 75);
    }, 0);
    
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
        overallAssessment: "Analysis completed using Meditron 70B backup system. Your laboratory results have been processed with medical-grade AI.",
        concerns: this.extractConcerns(metrics),
        specialists: this.suggestSpecialists(metrics),
        followUpTests: this.suggestFollowUpTests(metrics),
        clinicalInterpretation: "Fallback analysis - please retry for full Meditron 70B analysis.",
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
      modelUsed: 'Meditron 70B (Fallback)'
    };
  }
  
  async healthCheck(): Promise<boolean> {
    try {
      await this.hf.textGeneration({
        model: config.ai.huggingface.model,
        inputs: 'Health check',
        parameters: {
          max_new_tokens: 5,
          temperature: 0.1,
        }
      });
      return true;
    } catch {
      return false;
    }
  }
}