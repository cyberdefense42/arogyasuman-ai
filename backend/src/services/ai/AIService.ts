import { Ollama } from 'ollama';
import { logger } from '../../utils/logger';
import { config } from '../../config';
import { AppError } from '../../middlewares/errorHandler';
import { HealthMetric } from '../ocr/OCRService';
import { GoogleAIService } from './GoogleAIService';

export interface AnalysisResult {
  analysis: {
    overallAssessment: string;
    concerns: string[];
    conditionSpecificAdvice?: string[];  // New: Condition-specific medical advice
    specialists: string[];
    followUpTests: string[];
    clinicalInterpretation?: string;     // New: Detailed medical interpretation
    riskFactors?: string[];              // New: Identified risk factors
    monitoring?: string[];               // New: Monitoring recommendations
  };
  recommendations: {
    dietary: {
      foods_to_include: string[];
      foods_to_avoid: string[];
      meal_plan_suggestions: string;
      nutritionalFocus?: string[];       // New: Key nutrients to focus on
    };
    lifestyle: {
      exercise: string[];
      daily_routine: string[];
      stress_management: string[];
      preventiveMeasures?: string[];     // New: Preventive health measures
    };
    ayurvedic: string;
    supplements?: string[];              // New: Recommended supplements
  };
  summary: {                             // New: Comprehensive report summary
    keyFindings: string[];
    criticalValues: string[];
    normalValues: string[];
    actionRequired: string[];
    timelineForImprovement: string;
  };
  healthScore: number;
  urgencyLevel?: 'routine' | 'moderate' | 'urgent';  // New: Medical urgency
  processingTime: number;
  modelUsed?: string;                    // New: Track which model was used
}

export class AIService {
  private static instance: AIService;
  private ollama: Ollama;
  private googleAIService: GoogleAIService;
  
  private constructor() {
    this.ollama = new Ollama({
      host: config.ai.ollama.apiUrl,
    });
    
    try {
      this.googleAIService = GoogleAIService.getInstance();
    } catch (error) {
      logger.warn('Google AI service not available:', error);
    }
  }
  
  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  async generateResponse(prompt: string): Promise<{ response: string; processingTime: number }> {
    const startTime = Date.now();
    
    try {
      logger.info('🤖 Generating AI response for chat...');
      
      const response = await this.ollama.chat({
        model: config.ai.ollama.model,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          num_predict: 300,
          num_ctx: 1024
        }
      });
      
      const processingTime = Date.now() - startTime;
      logger.info(`✅ AI response generated in ${processingTime}ms`);
      
      return {
        response: response.message.content,
        processingTime
      };
      
    } catch (error) {
      logger.error('AI response generation error:', error);
      
      // Fallback response
      return {
        response: "I'm having trouble processing your request right now. Please try asking about your health metrics or upload a new report for analysis.",
        processingTime: Date.now() - startTime
      };
    }
  }
  
  async initialize(): Promise<void> {
    try {
      if (config.ai.provider === 'google') {
        if (!this.googleAIService) {
          logger.warn('⚠️ Google AI service not configured - falling back to local mode');
          return;
        }
        
        try {
          await this.googleAIService.initialize();
          logger.info(`✅ AI service (Google AI Studio - ${config.ai.google.model}) initialized`);
        } catch (error: any) {
          if (error.message?.includes('401') || error.message?.includes('Invalid')) {
            logger.warn('⚠️ Google AI API key invalid. Please check your API key.');
            logger.warn('🔄 Update GOOGLE_AI_API_KEY in .env file');
            return; // Don't fail, just warn and continue
          }
          throw error; // Re-throw other errors
        }
      } else {
        // Test Ollama connection
        await this.ollama.list();
        logger.info('✅ AI service (Ollama - Meditron 7B) initialized');
      }
    } catch (error) {
      logger.error('❌ AI service initialization failed:', error);
      logger.warn('⚠️ Starting server in limited mode - AI analysis will not be available');
      // Don't throw error to allow server to start
    }
  }
  
  async analyzeHealthReport(
    extractedText: string,
    metrics: HealthMetric[],
    contextualInfo: string = ''
  ): Promise<AnalysisResult> {
    try {
      // Route to appropriate AI service based on configuration
      if (config.ai.provider === 'google') {
        if (!this.googleAIService) {
          logger.warn('⚠️ Google AI service not available, falling back to Ollama');
          return await this.analyzeWithOllama(extractedText, metrics, contextualInfo);
        }
        try {
          return await this.googleAIService.analyzeHealthReport(extractedText, metrics, contextualInfo);
        } catch (error) {
          logger.warn('⚠️ Google AI analysis failed, falling back to Ollama');
          return await this.analyzeWithOllama(extractedText, metrics, contextualInfo);
        }
      } else {
        return await this.analyzeWithOllama(extractedText, metrics, contextualInfo);
      }
    } catch (error) {
      logger.error('AI analysis routing error:', error);
      throw error;
    }
  }
  
  private async analyzeWithOllama(
    extractedText: string,
    metrics: HealthMetric[],
    contextualInfo: string = ''
  ): Promise<AnalysisResult> {
    const startTime = Date.now();
    
    try {
      logger.info(`🤖 Analyzing ${metrics.length} health metrics with Ollama Meditron...`);
      
      const prompt = this.buildMedicalPrompt(metrics, contextualInfo);
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('AI analysis timeout')), config.ai.ollama.timeout);
      });
      
      const analysisPromise = this.ollama.chat({
        model: config.ai.ollama.model,
        messages: [
          { 
            role: 'system', 
            content: 'You are Meditron, a specialized medical AI assistant trained to analyze blood test results and provide evidence-based health recommendations. Provide accurate, professional medical analysis while being accessible to patients.'
          },
          { role: 'user', content: prompt }
        ],
        options: {
          temperature: 0.1,  // Lower temperature for more consistent medical advice
          top_p: 0.95,
          top_k: 40,
          repeat_penalty: 1.1,
          num_predict: 512,  // Reduced for faster responses
          num_ctx: 2048,     // Context window
          num_batch: 512,    // Batch size for faster processing
          num_thread: 8      // Use multiple threads
        }
      });
      
      const response = await Promise.race([analysisPromise, timeoutPromise]);
      
      logger.info('✅ Ollama AI analysis completed');
      
      const parsedResult = this.parseAIResponse(response.message.content, metrics);
      parsedResult.processingTime = Date.now() - startTime;
      parsedResult.modelUsed = `${config.ai.ollama.model} (Ollama)`;
      
      return parsedResult;
      
    } catch (error) {
      logger.error('Ollama analysis error:', error);
      
      if (error instanceof Error && error.message.includes('timeout')) {
        logger.warn('⚠️ AI timeout, returning fallback analysis');
        return this.getFallbackAnalysis(metrics, Date.now() - startTime);
      }
      
      throw new AppError('Ollama AI analysis failed', 500);
    }
  }
  
  private buildMedicalPrompt(metrics: HealthMetric[], contextualInfo: string): string {
    return `You are a senior medical AI assistant specializing in personalized laboratory result analysis. Provide comprehensive, evidence-based medical analysis with personalized recommendations.

PATIENT LABORATORY RESULTS:
${metrics.map(m => `${m.metric}: ${m.value} ${m.unit} (Reference: Normal, Current Status: ${m.flag})`).join('\n')}

${contextualInfo ? `\nPATIENT CONTEXT:\n${contextualInfo}\n` : ''}

Provide a COMPLETE personalized medical analysis following this EXACT format:

ASSESSMENT: [Provide a comprehensive clinical assessment (3-4 sentences) explaining the overall health status, medical significance of each abnormal value, potential underlying conditions, and immediate health implications. Be specific about which parameters are concerning and why.]

CONCERNS: [List specific medical concerns, conditions, or diseases indicated by abnormal values. For each concern, briefly explain the connection to the lab values. If all values are normal, state "All laboratory parameters are within normal reference ranges - indicating good baseline health status."]

CONDITION_SPECIFIC_ADVICE: [For each identified health issue, provide specific medical advice including: what the condition means, immediate steps to take, when to see a doctor, and potential complications if left untreated. Format as: "Issue: [condition] - Advice: [specific guidance]"]

DIETARY: [List 7-8 specific foods to include for the identified conditions, with brief reasoning. Prefer Indian cuisine and format as: "Food item (reason for recommendation)". Separate with commas.]

AVOID: [List 5-6 foods to strictly avoid based on these results, with brief reasoning. Format as: "Food item (reason to avoid)". Separate with commas.]

EXERCISE: [List 4-5 specific exercises with exact duration, frequency, and intensity based on the health conditions. Format as: "Exercise type - Duration - Frequency - Benefits". Separate with commas.]

LIFESTYLE_MODIFICATIONS: [Provide 4-5 specific lifestyle changes beyond diet and exercise, such as sleep patterns, stress management, hydration, etc. Be specific and actionable.]

MONITORING: [Specify which parameters need regular monitoring, how often, and what values to watch for. Include warning signs that require immediate medical attention.]

SUPPLEMENTS: [Recommend specific supplements with dosages if deficiencies are detected. Always mention "consult doctor before starting".]

KEY_FINDINGS: [List 4-5 most important findings from the lab results. Format as bullet points with clinical significance.]

CRITICAL_VALUES: [List any values that are critically abnormal and require immediate attention. If none, state "No critical values detected".]

NORMAL_VALUES: [List values that are within normal range to reassure the patient.]

ACTION_REQUIRED: [List immediate actions the patient should take, prioritized by urgency.]

TIMELINE: [Provide realistic timeline for improvement if recommendations are followed. Include when to expect changes and follow-up testing schedule.]

SCORE: [Calculate overall health score from 0-100 based on lab values, with brief explanation of the scoring rationale]

URGENCY: [Classify as ROUTINE (normal/mild abnormalities), MODERATE (significant abnormalities requiring attention), or URGENT (critical values requiring immediate medical care)]

Ensure your response follows this exact format for proper parsing. Focus on evidence-based, personalized recommendations appropriate for the Indian population and healthcare system.`;
  }
  
  private parseAIResponse(content: string, metrics: HealthMetric[]): AnalysisResult {
    logger.info('🔍 Parsing comprehensive AI response...');
    
    const sections = content.split('\n\n');
    const result: any = {
      assessment: "Your blood test results have been analyzed with personalized recommendations.",
      concerns: [],
      conditionSpecificAdvice: [],
      dietary: [],
      avoid: [],
      exercise: [],
      lifestyleModifications: [],
      monitoring: [],
      supplements: [],
      keyFindings: [],
      criticalValues: [],
      normalValues: [],
      actionRequired: [],
      timelineForImprovement: "Follow recommendations for 4-6 weeks and monitor progress with follow-up testing.",
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
        } else if (line.startsWith('CONDITION_SPECIFIC_ADVICE:')) {
          const adviceText = line.replace('CONDITION_SPECIFIC_ADVICE:', '').trim();
          result.conditionSpecificAdvice = [adviceText];
          while (i + 1 < lines.length && !lines[i + 1].includes(':')) {
            result.conditionSpecificAdvice.push(lines[++i]);
          }
          result.conditionSpecificAdvice = result.conditionSpecificAdvice.filter(a => a.length > 0);
        } else if (line.startsWith('DIETARY:')) {
          const foodText = line.replace('DIETARY:', '').trim();
          result.dietary = foodText.split(',').map(f => f.trim().replace(/["']/g, '')).filter(f => f.length > 0);
        } else if (line.startsWith('AVOID:')) {
          const avoidText = line.replace('AVOID:', '').trim();
          result.avoid = avoidText.split(',').map(f => f.trim().replace(/["']/g, '')).filter(f => f.length > 0);
        } else if (line.startsWith('EXERCISE:')) {
          const exerciseText = line.replace('EXERCISE:', '').trim();
          result.exercise = exerciseText.split(',').map(e => e.trim().replace(/["']/g, '')).filter(e => e.length > 0);
        } else if (line.startsWith('LIFESTYLE_MODIFICATIONS:')) {
          const lifestyleText = line.replace('LIFESTYLE_MODIFICATIONS:', '').trim();
          result.lifestyleModifications = lifestyleText.split(',').map(l => l.trim().replace(/["']/g, '')).filter(l => l.length > 0);
        } else if (line.startsWith('MONITORING:')) {
          const monitoringText = line.replace('MONITORING:', '').trim();
          result.monitoring = [monitoringText];
          while (i + 1 < lines.length && !lines[i + 1].includes(':')) {
            result.monitoring.push(lines[++i]);
          }
          result.monitoring = result.monitoring.filter(m => m.length > 0);
        } else if (line.startsWith('SUPPLEMENTS:')) {
          const supplementText = line.replace('SUPPLEMENTS:', '').trim();
          result.supplements = supplementText.split(',').map(s => s.trim().replace(/["']/g, '')).filter(s => s.length > 0);
        } else if (line.startsWith('KEY_FINDINGS:')) {
          const findingsText = line.replace('KEY_FINDINGS:', '').trim();
          result.keyFindings = findingsText.split('•').map(f => f.trim()).filter(f => f.length > 0);
          while (i + 1 < lines.length && !lines[i + 1].includes(':')) {
            const nextLine = lines[++i];
            if (nextLine.includes('•')) {
              result.keyFindings.push(...nextLine.split('•').map(f => f.trim()).filter(f => f.length > 0));
            } else {
              result.keyFindings.push(nextLine);
            }
          }
        } else if (line.startsWith('CRITICAL_VALUES:')) {
          const criticalText = line.replace('CRITICAL_VALUES:', '').trim();
          if (criticalText.toLowerCase().includes('no critical') || criticalText.toLowerCase().includes('none detected')) {
            result.criticalValues = ["No critical values detected"];
          } else {
            result.criticalValues = [criticalText];
            while (i + 1 < lines.length && !lines[i + 1].includes(':')) {
              result.criticalValues.push(lines[++i]);
            }
            result.criticalValues = result.criticalValues.filter(c => c.length > 0);
          }
        } else if (line.startsWith('NORMAL_VALUES:')) {
          const normalText = line.replace('NORMAL_VALUES:', '').trim();
          result.normalValues = normalText.split(',').map(n => n.trim()).filter(n => n.length > 0);
        } else if (line.startsWith('ACTION_REQUIRED:')) {
          const actionText = line.replace('ACTION_REQUIRED:', '').trim();
          result.actionRequired = actionText.split(',').map(a => a.trim()).filter(a => a.length > 0);
        } else if (line.startsWith('TIMELINE:')) {
          result.timelineForImprovement = line.replace('TIMELINE:', '').trim();
          while (i + 1 < lines.length && !lines[i + 1].includes(':')) {
            result.timelineForImprovement += ' ' + lines[++i];
          }
        } else if (line.startsWith('SCORE:')) {
          const scoreMatch = line.match(/\d+/);
          if (scoreMatch) {
            const parsedScore = parseInt(scoreMatch[0]);
            if (!isNaN(parsedScore) && parsedScore >= 0 && parsedScore <= 100) {
              result.score = parsedScore;
            }
          }
        } else if (line.startsWith('URGENCY:')) {
          const urgencyText = line.replace('URGENCY:', '').trim().toLowerCase();
          if (urgencyText.includes('urgent')) {
            result.urgencyLevel = 'urgent';
          } else if (urgencyText.includes('moderate')) {
            result.urgencyLevel = 'moderate';
          } else {
            result.urgencyLevel = 'routine';
          }
        }
      }
    }
    
    // Enhanced fallbacks with personalized recommendations
    if (result.dietary.length === 0) {
      result.dietary = [
        "Iron-rich palak dal with jeera (supports blood health)",
        "Vitamin C-rich amla juice twice daily (enhances iron absorption)", 
        "Folate-rich methi paratha with minimal oil (supports cell formation)",
        "Protein-rich moong sprouts chaat (muscle maintenance)",
        "Calcium-rich til laddu in moderation (bone health)",
        "Antioxidant-rich green tea (cellular protection)",
        "Fiber-rich oats upma with vegetables (digestive health)"
      ];
    }
    if (result.avoid.length === 0) {
      result.avoid = [
        "High-sodium processed foods and packaged snacks (affects blood pressure)",
        "Trans fat-rich deep fried items like samosas (cardiovascular risk)", 
        "High glycemic index sweets and refined sugars (blood sugar spikes)",
        "Excessive caffeine and alcohol (dehydration and nutrient depletion)",
        "Red meat in excess (high saturated fat content)"
      ];
    }
    if (result.exercise.length === 0) {
      result.exercise = [
        "Brisk walking - 30-45 minutes - Daily - Improves cardiovascular health",
        "Yoga asanas and stretching - 20 minutes - Morning - Enhances flexibility and reduces stress",
        "Pranayama breathing exercises - 15 minutes - Twice daily - Reduces stress and improves oxygen delivery",
        "Light strength training - 20 minutes - 3 times per week - Maintains muscle mass and bone density"
      ];
    }
    if (result.concerns.length === 0) {
      result.concerns = this.extractConcerns(metrics);
    }
    if (result.keyFindings.length === 0) {
      result.keyFindings = this.generateKeyFindings(metrics);
    }
    if (result.criticalValues.length === 0) {
      result.criticalValues = this.identifyCriticalValues(metrics);
    }
    if (result.normalValues.length === 0) {
      result.normalValues = this.identifyNormalValues(metrics);
    }
    if (result.actionRequired.length === 0) {
      result.actionRequired = this.generateActionItems(metrics);
    }
    
    return {
      analysis: {
        overallAssessment: result.assessment,
        concerns: result.concerns,
        conditionSpecificAdvice: result.conditionSpecificAdvice || [],
        specialists: this.suggestSpecialists(metrics),
        followUpTests: this.suggestFollowUpTests(metrics),
        clinicalInterpretation: `Comprehensive personalized analysis performed by ${config.ai.ollama.model} - Specialized medical AI for laboratory result interpretation with evidence-based recommendations.`,
        riskFactors: this.identifyRiskFactors(metrics),
        monitoring: result.monitoring || []
      },
      recommendations: {
        dietary: {
          foods_to_include: result.dietary,
          foods_to_avoid: result.avoid,
          meal_plan_suggestions: "Follow a balanced Indian diet with the recommended foods, focusing on whole grains, lean proteins, and fresh vegetables tailored to your specific health conditions.",
          nutritionalFocus: this.getNutritionalFocus(metrics)
        },
        lifestyle: {
          exercise: result.exercise,
          daily_routine: result.lifestyleModifications.length > 0 ? result.lifestyleModifications : [
            "Maintain consistent sleep schedule (7-8 hours nightly)",
            "Stay adequately hydrated (8-10 glasses water daily)",
            "Practice stress management through meditation or hobbies",
            "Follow regular meal timings with balanced portions"
          ],
          stress_management: [
            "Deep breathing exercises (5 minutes, 3 times daily)",
            "Meditation or mindfulness practice (15 minutes daily)",
            "Regular social interactions and family time",
            "Adequate rest and relaxation activities"
          ],
          preventiveMeasures: this.getPreventiveMeasures(metrics)
        },
        ayurvedic: "Consider consultation with qualified Ayurvedic practitioner for personalized dosha-based recommendations complementing modern medicine.",
        supplements: result.supplements.length > 0 ? result.supplements : this.suggestSupplements(metrics)
      },
      summary: {
        keyFindings: result.keyFindings,
        criticalValues: result.criticalValues,
        normalValues: result.normalValues,
        actionRequired: result.actionRequired,
        timelineForImprovement: result.timelineForImprovement
      },
      healthScore: result.score,
      urgencyLevel: result.urgencyLevel,
      processingTime: 0
    };
  }
  
  private getFallbackAnalysis(metrics: HealthMetric[], processingTime: number): AnalysisResult {
    return {
      analysis: {
        overallAssessment: "Analysis completed using backup system with personalized recommendations. Your laboratory results have been processed with comprehensive health insights.",
        concerns: this.extractConcerns(metrics),
        conditionSpecificAdvice: this.generateConditionAdvice(metrics),
        specialists: this.suggestSpecialists(metrics),
        followUpTests: this.suggestFollowUpTests(metrics),
        clinicalInterpretation: "Fallback analysis - please retry for full AI-powered personalized analysis.",
        riskFactors: this.identifyRiskFactors(metrics),
        monitoring: this.generateMonitoringPlan(metrics)
      },
      recommendations: {
        dietary: {
          foods_to_include: [
            "Iron-rich palak dal with jeera (supports blood health)",
            "Vitamin C-rich amla juice (enhances iron absorption)",
            "Folate-rich methi paratha (supports cell formation)",
            "Protein-rich moong sprouts (muscle maintenance)",
            "Calcium-rich til seeds (bone health)",
            "Antioxidant-rich green tea (cellular protection)"
          ],
          foods_to_avoid: [
            "High-sodium processed foods (affects blood pressure)",
            "Trans fat-rich fried items (cardiovascular risk)",
            "High glycemic index sweets (blood sugar spikes)",
            "Excessive caffeine (dehydration and nutrient depletion)"
          ],
          meal_plan_suggestions: "Follow balanced Indian diet emphasizing whole foods, traditional cooking methods, and foods tailored to your specific health parameters.",
          nutritionalFocus: this.getNutritionalFocus(metrics)
        },
        lifestyle: {
          exercise: [
            "Brisk walking - 30-45 minutes daily - Cardiovascular health",
            "Yoga asanas and stretching - 20 minutes morning - Flexibility and stress reduction",
            "Pranayama breathing exercises - 15 minutes twice daily - Stress management"
          ],
          daily_routine: [
            "Consistent sleep schedule (7-8 hours nightly)",
            "Adequate hydration throughout day (8-10 glasses)",
            "Regular meal timings with balanced portions",
            "Stress management through relaxation techniques"
          ],
          stress_management: [
            "Daily meditation practice (15 minutes)",
            "Deep breathing exercises (5 minutes, 3 times daily)",
            "Regular social connections and family time",
            "Engage in relaxing hobbies and activities"
          ],
          preventiveMeasures: this.getPreventiveMeasures(metrics)
        },
        ayurvedic: "Consider Ayurvedic consultation for personalized dosha-based recommendations complementing modern medicine and your specific health profile.",
        supplements: this.suggestSupplements(metrics)
      },
      summary: {
        keyFindings: this.generateKeyFindings(metrics),
        criticalValues: this.identifyCriticalValues(metrics),
        normalValues: this.identifyNormalValues(metrics),
        actionRequired: this.generateActionItems(metrics),
        timelineForImprovement: "Follow personalized recommendations for 4-6 weeks, monitor progress, and schedule follow-up testing as advised."
      },
      healthScore: this.calculateHealthScore(metrics),
      urgencyLevel: this.determineUrgencyLevel(metrics),
      processingTime,
      modelUsed: `${config.ai.ollama.model} (Ollama Fallback)`
    };
  }
  
  private generateConditionAdvice(metrics: HealthMetric[]): string[] {
    const advice: string[] = [];
    
    metrics.forEach(metric => {
      const metricName = metric.metric.toLowerCase();
      
      if (metric.flag === 'HIGH') {
        if (metricName.includes('glucose')) {
          advice.push("High Blood Sugar: Monitor carbohydrate intake, eat smaller frequent meals, increase physical activity, and consult doctor for diabetes management plan.");
        }
        if (metricName.includes('cholesterol')) {
          advice.push("High Cholesterol: Reduce saturated fats, increase fiber intake, exercise regularly, and consider medication as prescribed by doctor.");
        }
      }
      
      if (metric.flag === 'LOW') {
        if (metricName.includes('hemoglobin')) {
          advice.push("Low Hemoglobin: Increase iron-rich foods, combine with vitamin C, avoid tea/coffee with meals, and investigate underlying causes with doctor.");
        }
      }
    });
    
    return advice;
  }
  
  private generateMonitoringPlan(metrics: HealthMetric[]): string[] {
    const monitoring: string[] = [];
    
    const abnormalMetrics = metrics.filter(m => m.flag !== 'NORMAL');
    
    if (abnormalMetrics.length > 0) {
      monitoring.push("Monitor specific abnormal parameters weekly through symptoms diary");
      monitoring.push("Schedule follow-up blood tests in 4-6 weeks to assess improvement");
      monitoring.push("Track dietary compliance and exercise routine daily");
    }
    
    monitoring.push("Regular health check-ups every 6 months for preventive care");
    monitoring.push("Contact healthcare provider if symptoms worsen or new symptoms appear");
    
    return monitoring;
  }
  
  private determineUrgencyLevel(metrics: HealthMetric[]): 'routine' | 'moderate' | 'urgent' {
    const critical = metrics.filter(m => m.flag === 'CRITICAL');
    const high = metrics.filter(m => m.flag === 'HIGH');
    const low = metrics.filter(m => m.flag === 'LOW');
    
    if (critical.length > 0) return 'urgent';
    if (high.length > 2 || low.length > 2) return 'moderate';
    if (high.length > 0 || low.length > 0) return 'moderate';
    
    return 'routine';
  }
  
  private calculateHealthScore(metrics: HealthMetric[]): number {
    if (metrics.length === 0) return 75;
    
    const weights = {
      NORMAL: 100,
      LOW: 70,
      HIGH: 70,
      CRITICAL: 40,
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
        concerns.push(`${metric.metric} is ${metric.flag.toLowerCase()} (${metric.value} ${metric.unit})`);
      }
    });
    
    return concerns.length > 0 ? concerns : ["No significant concerns detected in the analyzed metrics"];
  }
  
  private generateKeyFindings(metrics: HealthMetric[]): string[] {
    const findings: string[] = [];
    
    metrics.forEach(metric => {
      if (metric.flag === 'CRITICAL') {
        findings.push(`Critical: ${metric.metric} at ${metric.value} ${metric.unit} requires immediate medical attention`);
      } else if (metric.flag === 'HIGH') {
        findings.push(`Elevated: ${metric.metric} (${metric.value} ${metric.unit}) indicates potential health concern`);
      } else if (metric.flag === 'LOW') {
        findings.push(`Low: ${metric.metric} (${metric.value} ${metric.unit}) may indicate deficiency or underlying condition`);
      }
    });
    
    const normalCount = metrics.filter(m => m.flag === 'NORMAL').length;
    if (normalCount > 0) {
      findings.push(`${normalCount} parameters are within normal range, indicating good baseline health`);
    }
    
    return findings.length > 0 ? findings : ["All analyzed parameters show normal patterns"];
  }
  
  private identifyCriticalValues(metrics: HealthMetric[]): string[] {
    const critical = metrics.filter(m => m.flag === 'CRITICAL')
      .map(m => `${m.metric}: ${m.value} ${m.unit} (requires immediate medical consultation)`);
    
    return critical.length > 0 ? critical : ["No critical values detected"];
  }
  
  private identifyNormalValues(metrics: HealthMetric[]): string[] {
    const normal = metrics.filter(m => m.flag === 'NORMAL')
      .map(m => `${m.metric}: ${m.value} ${m.unit}`);
    
    return normal.length > 0 ? normal : ["Please refer to individual parameter analysis"];
  }
  
  private generateActionItems(metrics: HealthMetric[]): string[] {
    const actions: string[] = [];
    
    const critical = metrics.filter(m => m.flag === 'CRITICAL');
    const high = metrics.filter(m => m.flag === 'HIGH');
    const low = metrics.filter(m => m.flag === 'LOW');
    
    if (critical.length > 0) {
      actions.push("Consult doctor immediately for critical values");
    }
    
    if (high.length > 0 || low.length > 0) {
      actions.push("Schedule follow-up appointment within 1-2 weeks");
      actions.push("Begin dietary and lifestyle modifications as recommended");
    }
    
    actions.push("Follow recommended dietary guidelines daily");
    actions.push("Implement suggested exercise routine gradually");
    actions.push("Monitor symptoms and maintain health diary");
    
    if (metrics.some(m => m.flag !== 'NORMAL')) {
      actions.push("Schedule repeat testing in 4-6 weeks to monitor progress");
    }
    
    return actions;
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
        if (metricName.includes('hemoglobin') || metricName.includes('iron')) {
          specialists.push('Hematologist');
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
        if (metricName.includes('creatinine')) {
          tests.push('Kidney function panel', 'Urine analysis');
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
      
      if (metricName.includes('hemoglobin') && metric.flag === 'LOW') {
        riskFactors.push('Anemia complications', 'Fatigue and weakness');
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
      
      if (metricName.includes('calcium') && metric.flag === 'LOW') {
        focus.push('Calcium', 'Vitamin D', 'Magnesium');
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
        
        if (metricName.includes('liver')) {
          measures.push('Liver function monitoring', 'Avoid alcohol excess');
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
        supplements.push('Iron supplement (consult doctor for dosage)', 'Vitamin C for iron absorption');
      }
      
      if (metricName.includes('vitamin d') && metric.flag === 'LOW') {
        supplements.push('Vitamin D3 supplement', 'Calcium supplement');
      }
      
      if (metricName.includes('b12') && metric.flag === 'LOW') {
        supplements.push('Vitamin B12 supplement', 'B-complex vitamins');
      }
      
      if (metricName.includes('calcium') && metric.flag === 'LOW') {
        supplements.push('Calcium with Vitamin D3', 'Magnesium supplement');
      }
    });
    
    // Add general recommendations if no specific deficiencies
    if (supplements.length === 0) {
      supplements.push('Multivitamin (consult doctor)', 'Omega-3 fatty acids');
    }
    
    // Always add disclaimer
    supplements.push('Note: Consult healthcare provider before starting any supplements');
    
    return [...new Set(supplements)];
  }
  
  async healthCheck(): Promise<boolean> {
    try {
      if (config.ai.provider === 'google') {
        return this.googleAIService ? await this.googleAIService.healthCheck() : false;
      } else {
        await this.ollama.list();
        return true;
      }
    } catch {
      return false;
    }
  }
}