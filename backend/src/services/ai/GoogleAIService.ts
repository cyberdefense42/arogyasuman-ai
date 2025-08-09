import { logger } from '../../utils/logger';
import { config } from '../../config';
import { AppError } from '../../middlewares/errorHandler';
import { HealthMetric } from '../ocr/OCRService';
import { AnalysisResult } from './AIService';

export class GoogleAIService {
  private static instance: GoogleAIService;
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  
  private constructor() {
    if (!config.ai.google.apiKey) {
      throw new AppError('Google AI API key not configured', 500);
    }
    
    this.apiKey = config.ai.google.apiKey;
  }
  
  static getInstance(): GoogleAIService {
    if (!GoogleAIService.instance) {
      GoogleAIService.instance = new GoogleAIService();
    }
    return GoogleAIService.instance;
  }
  
  async initialize(): Promise<void> {
    try {
      // Test Google AI connection
      logger.info('🤖 Testing Google AI Studio connection...');
      
      const response = await fetch(`${this.baseUrl}/models?key=${this.apiKey}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      logger.info(`✅ Google AI Studio service initialized - ${data.models?.length || 0} models available`);
      
    } catch (error: any) {
      logger.error('❌ Google AI Studio service initialization failed:', error);
      
      if (error.message?.includes('401') || error.message?.includes('403')) {
        throw new AppError('Invalid Google AI API key', 401);
      }
      
      throw new AppError('Google AI Studio service unavailable', 503);
    }
  }
  
  async analyzeHealthReport(
    extractedText: string,
    metrics: HealthMetric[],
    contextualInfo: string = ''
  ): Promise<AnalysisResult> {
    const startTime = Date.now();
    
    try {
      logger.info(`🤖 Analyzing ${metrics.length} health metrics with ${config.ai.google.model}...`);
      
      const prompt = this.buildMedicalPrompt(metrics, contextualInfo);
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('AI analysis timeout')), config.ai.google.timeout);
      });
      
      const analysisPromise = fetch(`${this.baseUrl}/models/${config.ai.google.model}:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.3, // Lower temperature for medical accuracy
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 1000,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_ONLY_HIGH"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_ONLY_HIGH"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_ONLY_HIGH"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT", 
              threshold: "BLOCK_NONE"
            }
          ]
        })
      });
      
      const response = await Promise.race([analysisPromise, timeoutPromise]);
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Google AI API error: ${response.status} - ${errorData}`);
      }
      
      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts) {
        throw new Error('Invalid response format from Google AI');
      }
      
      const generatedText = data.candidates[0].content.parts[0].text;
      
      logger.info(`✅ ${config.ai.google.model} analysis completed`);
      
      const parsedResult = this.parseAIResponse(generatedText, metrics);
      parsedResult.processingTime = Date.now() - startTime;
      parsedResult.modelUsed = `${config.ai.google.model} (Google AI Studio)`;
      
      return parsedResult;
      
    } catch (error: any) {
      logger.error('Google AI analysis error:', error);
      
      if (error.message?.includes('timeout')) {
        logger.warn('⚠️ Google AI timeout, returning fallback analysis');
        return this.getFallbackAnalysis(metrics, Date.now() - startTime);
      }
      
      if (error.message?.includes('quota') || error.message?.includes('429')) {
        throw new AppError('API rate limit exceeded. Please try again later.', 429);
      }
      
      if (error.message?.includes('401') || error.message?.includes('403')) {
        throw new AppError('Google AI API authentication failed', 401);
      }
      
      throw new AppError('Google AI analysis failed', 500);
    }
  }
  
  private buildMedicalPrompt(metrics: HealthMetric[], contextualInfo: string): string {
    return `You are a senior medical AI assistant specializing in comprehensive laboratory result analysis. Provide detailed, evidence-based medical analysis and actionable recommendations for patients.

PATIENT LABORATORY RESULTS:
${metrics.map(m => `${m.metric}: ${m.value} ${m.unit} (Reference: Normal, Current Status: ${m.flag})`).join('\n')}

${contextualInfo ? `\nPATIENT CONTEXT:\n${contextualInfo}\n` : ''}

Provide a COMPLETE medical analysis following this EXACT format:

ASSESSMENT: [Provide a comprehensive clinical assessment (3-4 sentences) explaining the overall health status, medical significance of each abnormal value, potential underlying conditions, and immediate health implications. Be specific about which parameters are concerning and why.]

CONCERNS: [List specific medical concerns, conditions, or diseases indicated by abnormal values. For each concern, briefly explain the connection to the lab values. If all values are normal, state "All laboratory parameters are within normal reference ranges - indicating good baseline health status."]

CONDITION_SPECIFIC_ADVICE: [For each identified health issue, provide specific medical advice including: what the condition means, immediate steps to take, when to see a doctor, and potential complications if left untreated. Format as: "Issue: [condition] - Advice: [specific guidance]"]

DIETARY: [List 7-8 specific foods to include for the identified conditions, with brief reasoning. Prefer Indian cuisine and format as: "Food item (reason for recommendation)". Separate with commas.]

AVOID: [List 5-6 foods to strictly avoid based on these results, with brief reasoning. Format as: "Food item (reason to avoid)". Separate with commas.]

EXERCISE: [List 4-5 specific exercises with exact duration, frequency, and intensity based on the health conditions. Format as: "Exercise type - Duration - Frequency - Benefits". Separate with commas.]

LIFESTYLE_MODIFICATIONS: [Provide 4-5 specific lifestyle changes beyond diet and exercise, such as sleep patterns, stress management, hydration, etc. Be specific and actionable.]

MONITORING: [Specify which parameters need regular monitoring, how often, and what values to watch for. Include warning signs that require immediate medical attention.]

SUPPLEMENTS: [Recommend specific supplements with dosages if deficiencies are detected. Always mention "consult doctor before starting".]

SCORE: [Calculate overall health score from 0-100 based on lab values, with brief explanation of the scoring rationale]

URGENCY: [Classify as ROUTINE (normal/mild abnormalities), MODERATE (significant abnormalities requiring attention), or URGENT (critical values requiring immediate medical care)]

Ensure your response follows this exact format for proper parsing. Focus on evidence-based recommendations appropriate for the Indian population and healthcare system.`;
  }
  
  private parseAIResponse(content: string, metrics: HealthMetric[]): AnalysisResult {
    logger.info('🔍 Parsing comprehensive Google AI response...');
    
    const sections = content.split('\n\n');
    const result: any = {
      assessment: "Your blood test results have been analyzed by Google AI.",
      concerns: [],
      conditionSpecificAdvice: [],
      dietary: [],
      avoid: [],
      exercise: [],
      lifestyleModifications: [],
      monitoring: [],
      supplements: [],
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
        } else if (line.startsWith('CONDITION_SPECIFIC_ADVICE:')) {
          const adviceText = line.replace('CONDITION_SPECIFIC_ADVICE:', '').trim();
          result.conditionSpecificAdvice = [adviceText];
          while (i + 1 < lines.length && !lines[i + 1].includes(':')) {
            result.conditionSpecificAdvice.push(lines[++i]);
          }
          result.conditionSpecificAdvice = result.conditionSpecificAdvice.filter(a => a.length > 0);
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
        conditionSpecificAdvice: result.conditionSpecificAdvice || [],
        specialists: this.suggestSpecialists(metrics),
        followUpTests: this.suggestFollowUpTests(metrics),
        clinicalInterpretation: `Comprehensive analysis performed by ${config.ai.google.model} - Advanced AI with specialized medical knowledge for laboratory result interpretation.`,
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
            "Maintain consistent sleep schedule (7-8 hours)",
            "Stay adequately hydrated (8-10 glasses water daily)",
            "Practice stress management techniques",
            "Regular meal timings with balanced portions"
          ],
          stress_management: [
            "Deep breathing exercises",
            "Meditation or mindfulness practice",
            "Regular social interactions",
            "Adequate rest and relaxation"
          ],
          preventiveMeasures: this.getPreventiveMeasures(metrics)
        },
        ayurvedic: "Consider consultation with qualified Ayurvedic practitioner for personalized dosha-based recommendations complementing modern medicine.",
        supplements: result.supplements.length > 0 ? result.supplements : this.suggestSupplements(metrics)
      },
      summary: {
        keyFindings: this.generateKeyFindings(metrics, result),
        criticalValues: this.identifyCriticalValues(metrics),
        normalValues: this.identifyNormalValues(metrics),
        actionRequired: this.generateActionItems(metrics, result.urgencyLevel),
        timelineForImprovement: this.generateTimeline(metrics, result.urgencyLevel)
      },
      healthScore: result.score,
      urgencyLevel: result.urgencyLevel,
      processingTime: 0
    };
  }
  
  // Helper methods (same as other services)
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
  
  private generateKeyFindings(metrics: HealthMetric[], result: any): string[] {
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
  
  private generateActionItems(metrics: HealthMetric[], urgencyLevel: string): string[] {
    const actions: string[] = [];
    
    if (urgencyLevel === 'urgent') {
      actions.push("Consult doctor immediately for critical values");
    } else if (urgencyLevel === 'moderate') {
      actions.push("Schedule follow-up appointment within 1-2 weeks");
    }
    
    const abnormalCount = metrics.filter(m => m.flag !== 'NORMAL').length;
    if (abnormalCount > 0) {
      actions.push("Begin dietary and lifestyle modifications as recommended");
      actions.push("Follow recommended dietary guidelines daily");
      actions.push("Implement suggested exercise routine gradually");
      actions.push("Monitor symptoms and maintain health diary");
      actions.push("Schedule repeat testing in 4-6 weeks to monitor progress");
    } else {
      actions.push("Continue current healthy lifestyle practices");
      actions.push("Maintain preventive health measures");
    }
    
    return actions;
  }
  
  private generateTimeline(metrics: HealthMetric[], urgencyLevel: string): string {
    const criticalCount = metrics.filter(m => m.flag === 'CRITICAL').length;
    const abnormalCount = metrics.filter(m => m.flag !== 'NORMAL').length;
    
    if (criticalCount > 0) {
      return "Immediate medical attention required. Follow-up within 24-48 hours. Expect initial improvements within 1-2 weeks with proper treatment.";
    } else if (urgencyLevel === 'moderate' || abnormalCount > 2) {
      return "Begin recommendations immediately. Expect noticeable improvements within 2-4 weeks. Schedule follow-up testing in 6-8 weeks to assess progress.";
    } else if (abnormalCount > 0) {
      return "Follow recommendations consistently for 4-6 weeks. Gradual improvements expected within 3-4 weeks. Follow-up testing recommended in 8-12 weeks.";
    } else {
      return "Continue preventive measures. Maintain current healthy practices. Routine health check-up recommended in 6-12 months.";
    }
  }

  private getFallbackAnalysis(metrics: HealthMetric[], processingTime: number): AnalysisResult {
    const urgencyLevel = this.determineUrgencyLevel(metrics);
    
    return {
      analysis: {
        overallAssessment: "Analysis completed using Google AI backup system with personalized recommendations. Your laboratory results have been processed with comprehensive health insights.",
        concerns: this.extractConcerns(metrics),
        conditionSpecificAdvice: this.generateConditionAdvice(metrics),
        specialists: this.suggestSpecialists(metrics),
        followUpTests: this.suggestFollowUpTests(metrics),
        clinicalInterpretation: "Fallback analysis - please retry for full Google AI analysis with enhanced personalization.",
        riskFactors: this.identifyRiskFactors(metrics),
        monitoring: this.generateMonitoringPlan(metrics)
      },
      recommendations: {
        dietary: {
          foods_to_include: [
            "Iron-rich spinach dal with tomatoes (supports blood health)",
            "Vitamin C-rich amla juice (enhances iron absorption)",
            "Folate-rich methi paratha (supports cell formation)",
            "Protein-rich moong sprouts (muscle maintenance)",
            "Calcium-rich sesame seeds (bone health)",
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
            "Yoga and stretching - 20 minutes morning - Flexibility and stress reduction",
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
        keyFindings: this.generateKeyFindings(metrics, {}),
        criticalValues: this.identifyCriticalValues(metrics),
        normalValues: this.identifyNormalValues(metrics),
        actionRequired: this.generateActionItems(metrics, urgencyLevel),
        timelineForImprovement: this.generateTimeline(metrics, urgencyLevel)
      },
      healthScore: this.calculateHealthScore(metrics),
      urgencyLevel: urgencyLevel,
      processingTime,
      modelUsed: `${config.ai.google.model} (Google AI Studio Fallback)`
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
  
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models?key=${this.apiKey}`);
      return response.ok;
    } catch {
      return false;
    }
  }
}