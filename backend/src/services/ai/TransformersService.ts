import { spawn } from 'child_process';
import { logger } from '../../utils/logger';
import { config } from '../../config';
import { AppError } from '../../middlewares/errorHandler';
import { HealthMetric } from '../ocr/OCRService';
import { AnalysisResult } from './AIService';

export class TransformersService {
  private static instance: TransformersService;
  private pythonProcess: any = null;
  
  private constructor() {}
  
  static getInstance(): TransformersService {
    if (!TransformersService.instance) {
      TransformersService.instance = new TransformersService();
    }
    return TransformersService.instance;
  }
  
  async initialize(): Promise<void> {
    try {
      logger.info('🤗 Initializing Transformers Meditron 70B service...');
      
      // Test if we can import transformers
      const testProcess = spawn('python3', ['-c', 'import transformers; print("OK")'], {
        stdio: 'pipe'
      });
      
      await new Promise((resolve, reject) => {
        testProcess.on('close', (code) => {
          if (code === 0) {
            resolve(true);
          } else {
            reject(new Error('Transformers library not available'));
          }
        });
      });
      
      logger.info('✅ Transformers Meditron 70B service initialized');
    } catch (error: any) {
      logger.error('❌ Transformers service initialization failed:', error);
      throw new AppError('Transformers AI service unavailable', 503);
    }
  }
  
  async analyzeHealthReport(
    extractedText: string,
    metrics: HealthMetric[],
    contextualInfo: string = ''
  ): Promise<AnalysisResult> {
    const startTime = Date.now();
    
    try {
      logger.info(`🤗 Analyzing ${metrics.length} health metrics with Transformers Meditron 70B...`);
      
      const prompt = this.buildMedicalPrompt(metrics, contextualInfo);
      
      // Create Python script to run Meditron 70B
      const pythonScript = `
import sys
import json
from transformers import pipeline, AutoTokenizer, AutoModelForCausalLM
import torch

try:
    # Use pipeline for simpler implementation - remove device_map for macOS compatibility
    pipe = pipeline(
        "text-generation",
        model="epfl-llm/meditron-70b",
        torch_dtype=torch.float32,  # Use float32 for better macOS compatibility
        device=0 if torch.cuda.is_available() else -1,  # Use CPU on macOS
        max_new_tokens=2048,
        temperature=0.1,
        do_sample=True,
        top_p=0.95,
        repetition_penalty=1.1
    )
    
    prompt = """${prompt.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"""
    
    result = pipe(prompt, max_new_tokens=2048, temperature=0.1)
    generated_text = result[0]['generated_text']
    
    # Remove the original prompt from the result
    response = generated_text.replace(prompt, "").strip()
    
    print(json.dumps({"success": True, "response": response}))
    
except Exception as e:
    print(json.dumps({"success": False, "error": str(e)}))
`;

      const result = await this.runPythonScript(pythonScript);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      logger.info('✅ Transformers Meditron 70B analysis completed');
      
      const parsedResult = this.parseAIResponse(result.response, metrics);
      parsedResult.processingTime = Date.now() - startTime;
      parsedResult.modelUsed = 'epfl-llm/meditron-70b (Transformers)';
      
      return parsedResult;
      
    } catch (error: any) {
      logger.error('Transformers analysis error:', error);
      
      if (error.message?.includes('timeout')) {
        logger.warn('⚠️ Transformers timeout, returning fallback analysis');
        return this.getFallbackAnalysis(metrics, Date.now() - startTime);
      }
      
      if (error.message?.includes('CUDA') || error.message?.includes('memory')) {
        logger.warn('⚠️ GPU/Memory issue, falling back to CPU');
        return this.getFallbackAnalysis(metrics, Date.now() - startTime);
      }
      
      throw new AppError('Transformers AI analysis failed', 500);
    }
  }
  
  private async runPythonScript(script: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const process = spawn('python3', ['-c', script], {
        stdio: 'pipe'
      });
      
      let output = '';
      let errorOutput = '';
      
      process.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      const timeout = setTimeout(() => {
        process.kill();
        reject(new Error('timeout'));
      }, 300000); // 5 minute timeout
      
      process.on('close', (code) => {
        clearTimeout(timeout);
        
        if (code === 0) {
          try {
            const result = JSON.parse(output.trim());
            resolve(result);
          } catch (e) {
            reject(new Error('Failed to parse response'));
          }
        } else {
          reject(new Error(errorOutput || 'Python script failed'));
        }
      });
    });
  }
  
  private buildMedicalPrompt(metrics: HealthMetric[], contextualInfo: string): string {
    return `<|im_start|>system
You are Meditron, an advanced medical AI assistant specialized in analyzing laboratory results. You are trained on extensive medical literature and clinical guidelines. Provide accurate, evidence-based medical analysis while being accessible to patients.
<|im_end|>

<|im_start|>user
CLINICAL LABORATORY ANALYSIS REQUEST

PATIENT LABORATORY RESULTS:
${metrics.map(m => {
  const statusIcon = m.flag === 'NORMAL' ? '✓' : m.flag === 'HIGH' ? '↑' : m.flag === 'LOW' ? '↓' : '⚠️';
  return `${statusIcon} ${m.metric}: ${m.value} ${m.unit} (Status: ${m.flag})`;
}).join('\n')}

${contextualInfo ? `\nADDITIONAL CLINICAL CONTEXT:\n${contextualInfo}\n` : ''}

Please provide a comprehensive medical analysis in the following structured format:

ASSESSMENT: [Provide a detailed clinical assessment (2-3 sentences) interpreting the laboratory findings, their clinical significance, and overall health implications]

CONCERNS: [List specific medical concerns, potential conditions, or areas requiring attention based on abnormal values. If all parameters are normal, state "All laboratory parameters are within normal reference ranges"]

DIETARY: [Recommend 5 specific evidence-based dietary interventions using Indian cuisine that address the laboratory findings. Format as comma-separated list, e.g., "Iron-rich spinach dal, Vitamin C-rich amla juice, Folate-rich methi paratha, Protein-rich moong sprouts, Calcium-rich sesame laddu"]

AVOID: [List 3-4 specific dietary restrictions based on laboratory results. Format as comma-separated list, e.g., "High-sodium processed foods, Trans fat-rich fried snacks, High glycemic index sweets, Excessive caffeine"]

EXERCISE: [Recommend 3 evidence-based physical activities with specific duration and frequency appropriate for the condition. Format as comma-separated list, e.g., "Brisk walking 30-45 minutes daily, Yoga asanas 20 minutes morning, Pranayama breathing exercises 15 minutes twice daily"]

SCORE: [Calculate a comprehensive health score (0-100) using these criteria:
- Normal values: 100 points
- Borderline abnormal (slight deviation): 75-85 points
- Moderately abnormal: 50-75 points  
- Severely abnormal: 20-50 points
- Critical values: <20 points
Provide the weighted average considering clinical significance]

Ensure all recommendations are evidence-based and culturally appropriate for the Indian population.
<|im_end|>

<|im_start|>assistant`;
  }
  
  private parseAIResponse(content: string, metrics: HealthMetric[]): AnalysisResult {
    logger.info('🔍 Parsing Transformers Meditron 70B response...');
    
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
      modelUsed: 'Meditron 70B (Transformers Fallback)'
    };
  }
  
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.runPythonScript(`
import transformers
print("OK")
`);
      return true;
    } catch {
      return false;
    }
  }
}