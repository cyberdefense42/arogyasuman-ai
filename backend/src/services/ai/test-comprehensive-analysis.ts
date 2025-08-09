import { GoogleAIService } from './GoogleAIService';
import { config } from '../../config';

// Comprehensive medical test data representing various health conditions
const comprehensiveTestMetrics = [
  // Anemia markers
  { 
    id: '1',
    reportId: 'comprehensive-test',
    category: 'Blood',
    metric: 'Hemoglobin',
    value: 9.5,
    unit: 'g/dL',
    normalMin: 12.0,
    normalMax: 16.0,
    flag: 'LOW' as const,
    createdAt: new Date()
  },
  // Diabetes markers
  {
    id: '2', 
    reportId: 'comprehensive-test',
    category: 'Blood Sugar',
    metric: 'Fasting Glucose',
    value: 165,
    unit: 'mg/dL',
    normalMin: 70,
    normalMax: 100,
    flag: 'HIGH' as const,
    createdAt: new Date()
  },
  {
    id: '3',
    reportId: 'comprehensive-test',
    category: 'Blood Sugar',
    metric: 'HbA1c',
    value: 8.2,
    unit: '%',
    normalMin: 4.0,
    normalMax: 5.6,
    flag: 'HIGH' as const,
    createdAt: new Date()
  },
  // Cardiovascular risk markers
  {
    id: '4',
    reportId: 'comprehensive-test', 
    category: 'Cholesterol',
    metric: 'Total Cholesterol',
    value: 285,
    unit: 'mg/dL',
    normalMin: 0,
    normalMax: 200,
    flag: 'HIGH' as const,
    createdAt: new Date()
  },
  {
    id: '5',
    reportId: 'comprehensive-test',
    category: 'Cholesterol',
    metric: 'LDL Cholesterol',
    value: 185,
    unit: 'mg/dL',
    normalMin: 0,
    normalMax: 100,
    flag: 'HIGH' as const,
    createdAt: new Date()
  },
  {
    id: '6',
    reportId: 'comprehensive-test',
    category: 'Cholesterol',
    metric: 'HDL Cholesterol',
    value: 32,
    unit: 'mg/dL',
    normalMin: 40,
    normalMax: 100,
    flag: 'LOW' as const,
    createdAt: new Date()
  },
  {
    id: '7',
    reportId: 'comprehensive-test',
    category: 'Cholesterol',
    metric: 'Triglycerides',
    value: 420,
    unit: 'mg/dL',
    normalMin: 0,
    normalMax: 150,
    flag: 'HIGH' as const,
    createdAt: new Date()
  },
  // Kidney function
  {
    id: '8',
    reportId: 'comprehensive-test',
    category: 'Kidney',
    metric: 'Creatinine',
    value: 1.8,
    unit: 'mg/dL',
    normalMin: 0.6,
    normalMax: 1.2,
    flag: 'HIGH' as const,
    createdAt: new Date()
  },
  // Liver function
  {
    id: '9',
    reportId: 'comprehensive-test',
    category: 'Liver',
    metric: 'ALT',
    value: 75,
    unit: 'U/L',
    normalMin: 7,
    normalMax: 35,
    flag: 'HIGH' as const,
    createdAt: new Date()
  },
  // Vitamin deficiency
  {
    id: '10',
    reportId: 'comprehensive-test',
    category: 'Vitamins',
    metric: 'Vitamin D',
    value: 18,
    unit: 'ng/mL',
    normalMin: 30,
    normalMax: 100,
    flag: 'LOW' as const,
    createdAt: new Date()
  },
  {
    id: '11',
    reportId: 'comprehensive-test',
    category: 'Vitamins',
    metric: 'Vitamin B12',
    value: 185,
    unit: 'pg/mL',
    normalMin: 200,
    normalMax: 900,
    flag: 'LOW' as const,
    createdAt: new Date()
  }
];

async function testComprehensiveAnalysis() {
  console.log('🩺 COMPREHENSIVE BLOOD REPORT ANALYSIS TEST');
  console.log('==========================================\\n');
  
  console.log('📋 Patient Profile:');
  console.log('   - Age: 45 years, Female');
  console.log('   - Symptoms: Fatigue, frequent urination, blurred vision, chest discomfort');
  console.log('   - Family History: Diabetes, heart disease');
  console.log('   - Lifestyle: Sedentary work, irregular meals, high stress\\n');
  
  console.log('🔬 Laboratory Results Summary:');
  console.log('   Critical Parameters Found:');
  comprehensiveTestMetrics.forEach(metric => {
    const status = metric.flag === 'HIGH' ? '⬆️' : metric.flag === 'LOW' ? '⬇️' : '✅';
    console.log(`   ${status} ${metric.metric}: ${metric.value} ${metric.unit} (${metric.flag})`);
  });
  console.log('');
  
  if (!config.ai.google.apiKey) {
    console.error('❌ Google AI API key not configured');
    return;
  }
  
  try {
    const googleAIService = GoogleAIService.getInstance();
    await googleAIService.initialize();
    
    console.log('🤖 Generating comprehensive medical analysis...\\n');
    
    const startTime = Date.now();
    const result = await googleAIService.analyzeHealthReport(
      'Comprehensive blood panel showing multiple abnormalities across different organ systems',
      comprehensiveTestMetrics,
      'Patient is a 45-year-old female presenting with fatigue, frequent urination, blurred vision, and chest discomfort. Family history significant for diabetes and cardiovascular disease. Currently leads sedentary lifestyle with irregular eating patterns and high occupational stress.'
    );
    
    const totalTime = Date.now() - startTime;
    
    console.log('✅ COMPREHENSIVE ANALYSIS COMPLETED\\n');
    console.log('📊 DETAILED MEDICAL REPORT');
    console.log('=========================\\n');
    
    // Overall Assessment
    console.log('🏥 CLINICAL ASSESSMENT:');
    console.log(`"${result.analysis.overallAssessment}"\\n`);
    
    // Medical Concerns
    if (result.analysis.concerns.length > 0) {
      console.log('⚠️ PRIMARY MEDICAL CONCERNS:');
      result.analysis.concerns.forEach((concern, index) => {
        console.log(`   ${index + 1}. ${concern}`);
      });
      console.log('');
    }
    
    // Condition-Specific Advice
    if (result.analysis.conditionSpecificAdvice && result.analysis.conditionSpecificAdvice.length > 0) {
      console.log('👨‍⚕️ CONDITION-SPECIFIC MEDICAL ADVICE:');
      result.analysis.conditionSpecificAdvice.forEach((advice, index) => {
        console.log(`   ${index + 1}. ${advice}`);
      });
      console.log('');
    }
    
    // Risk Factors
    if (result.analysis.riskFactors && result.analysis.riskFactors.length > 0) {
      console.log('⚠️ IDENTIFIED RISK FACTORS:');
      result.analysis.riskFactors.forEach((risk, index) => {
        console.log(`   ${index + 1}. ${risk}`);
      });
      console.log('');
    }
    
    // Monitoring Recommendations
    if (result.analysis.monitoring && result.analysis.monitoring.length > 0) {
      console.log('📋 MONITORING & FOLLOW-UP:');
      result.analysis.monitoring.forEach((monitor, index) => {
        console.log(`   ${index + 1}. ${monitor}`);
      });
      console.log('');
    }
    
    // Urgency Level
    const urgencyEmoji = result.urgencyLevel === 'urgent' ? '🚨' : 
                        result.urgencyLevel === 'moderate' ? '⚠️' : '📋';
    console.log(`${urgencyEmoji} URGENCY LEVEL: ${result.urgencyLevel?.toUpperCase()}`);
    console.log(`🎯 HEALTH SCORE: ${result.healthScore}/100\\n`);
    
    // Dietary Recommendations
    console.log('🥗 COMPREHENSIVE DIETARY PLAN:');
    console.log('   Foods to Include:');
    result.recommendations.dietary.foods_to_include.forEach((food, index) => {
      console.log(`      ${index + 1}. ${food}`);
    });
    console.log('\\n   Foods to Avoid:');
    result.recommendations.dietary.foods_to_avoid.forEach((food, index) => {
      console.log(`      ${index + 1}. ${food}`);
    });
    console.log('');
    
    // Exercise Recommendations
    console.log('🏃 PERSONALIZED EXERCISE PROGRAM:');
    result.recommendations.lifestyle.exercise.forEach((exercise, index) => {
      console.log(`   ${index + 1}. ${exercise}`);
    });
    console.log('');
    
    // Lifestyle Modifications
    console.log('🔄 LIFESTYLE MODIFICATIONS:');
    result.recommendations.lifestyle.daily_routine.forEach((routine, index) => {
      console.log(`   ${index + 1}. ${routine}`);
    });
    console.log('');
    
    // Supplement Recommendations
    if (result.recommendations.supplements && result.recommendations.supplements.length > 0) {
      console.log('💊 SUPPLEMENT RECOMMENDATIONS:');
      result.recommendations.supplements.forEach((supplement, index) => {
        console.log(`   ${index + 1}. ${supplement}`);
      });
      console.log('');
    }
    
    // Specialist Consultations
    if (result.analysis.specialists.length > 0) {
      console.log('👨‍⚕️ RECOMMENDED SPECIALIST CONSULTATIONS:');
      result.analysis.specialists.forEach((specialist, index) => {
        console.log(`   ${index + 1}. ${specialist}`);
      });
      console.log('');
    }
    
    // Follow-up Tests
    if (result.analysis.followUpTests && result.analysis.followUpTests.length > 0) {
      console.log('🔬 RECOMMENDED FOLLOW-UP TESTS:');
      result.analysis.followUpTests.forEach((test, index) => {
        console.log(`   ${index + 1}. ${test}`);
      });
      console.log('');
    }
    
    console.log('📈 PERFORMANCE METRICS:');
    console.log(`   Processing Time: ${result.processingTime}ms`);
    console.log(`   Total Time: ${totalTime}ms`);
    console.log(`   Model Used: ${result.modelUsed}`);
    console.log(`   Clinical Interpretation: ${result.analysis.clinicalInterpretation}\\n`);
    
    console.log('✅ COMPREHENSIVE ANALYSIS COMPLETE!');
    console.log('\\n💡 BENEFITS OF ENHANCED ANALYSIS:');
    console.log('=====================================');
    console.log('✅ Detailed clinical assessment with medical reasoning');
    console.log('✅ Condition-specific medical advice for each health issue');
    console.log('✅ Comprehensive dietary recommendations with rationale');
    console.log('✅ Personalized exercise programs based on conditions');
    console.log('✅ Specific monitoring and follow-up guidance');
    console.log('✅ Urgency classification for medical prioritization');
    console.log('✅ Supplement recommendations for deficiencies');
    console.log('✅ Risk factor identification and management');
    console.log('✅ Evidence-based recommendations for Indian population');
    
  } catch (error: any) {
    console.error('❌ Comprehensive analysis failed:', error.message);
    
    if (error.message?.includes('429')) {
      console.log('\\n⏰ RATE LIMIT REACHED - This is expected behavior');
      console.log('📝 The enhanced prompt requires more tokens due to comprehensive analysis');
      console.log('💡 Consider using gemini-1.5-flash model for faster, cost-effective analysis');
      console.log('🔄 In production, the system will automatically fallback to Ollama');
    }
    
    console.log('\\n🎯 EXPECTED OUTPUT STRUCTURE:');
    console.log('==============================');
    console.log('• Comprehensive Clinical Assessment (3-4 sentences)');
    console.log('• Detailed Medical Concerns with explanations');
    console.log('• Condition-Specific Advice for each health issue');
    console.log('• 7-8 Indian foods to include with medical reasoning');
    console.log('• 5-6 foods to avoid with specific reasons');
    console.log('• 4-5 targeted exercises with duration and benefits');
    console.log('• Lifestyle modifications beyond diet and exercise');
    console.log('• Monitoring schedule and warning signs');
    console.log('• Supplement recommendations with dosages');
    console.log('• Health score with detailed rationale');
    console.log('• Urgency classification (ROUTINE/MODERATE/URGENT)');
  }
}

// Run the comprehensive test
testComprehensiveAnalysis().catch(console.error);