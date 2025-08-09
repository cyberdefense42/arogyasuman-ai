import { GoogleAIService } from './GoogleAIService';
import { config } from '../../config';

// Sample medical data for testing
const sampleMetrics = [
  { 
    id: '1',
    reportId: 'test-report',
    category: 'Blood',
    metric: 'Hemoglobin',
    value: 10.2,
    unit: 'g/dL',
    normalMin: 12.0,
    normalMax: 16.0,
    flag: 'LOW' as const,
    createdAt: new Date()
  },
  {
    id: '2', 
    reportId: 'test-report',
    category: 'Blood',
    metric: 'Glucose',
    value: 145,
    unit: 'mg/dL',
    normalMin: 70,
    normalMax: 100,
    flag: 'HIGH' as const,
    createdAt: new Date()
  },
  {
    id: '3',
    reportId: 'test-report', 
    category: 'Cholesterol',
    metric: 'Total Cholesterol',
    value: 210,
    unit: 'mg/dL',
    normalMin: 0,
    normalMax: 200,
    flag: 'HIGH' as const,
    createdAt: new Date()
  },
  {
    id: '4',
    reportId: 'test-report',
    category: 'Blood',
    metric: 'WBC Count',
    value: 8500,
    unit: '/μL',
    normalMin: 4000,
    normalMax: 11000,
    flag: 'NORMAL' as const,
    createdAt: new Date()
  }
];

async function testGoogleAI() {
  console.log('🤖 Google AI Studio Integration Test');
  console.log('===================================\n');
  
  console.log('1️⃣ Checking configuration...');
  console.log(`   Provider: ${config.ai.provider}`);
  console.log(`   Model: ${config.ai.google.model}`);
  console.log(`   API Key: ${config.ai.google.apiKey ? '✅ Configured' : '❌ Missing'}`);
  console.log('');
  
  if (!config.ai.google.apiKey) {
    console.error('❌ Google AI API key not found in .env file');
    console.log('Please add: GOOGLE_AI_API_KEY=your-key-here');
    return;
  }
  
  console.log('2️⃣ Initializing Google AI service...');
  try {
    const googleAIService = GoogleAIService.getInstance();
    await googleAIService.initialize();
    console.log('✅ Google AI service initialized\n');
  } catch (error: any) {
    console.error('❌ Google AI initialization failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Verify your Google AI Studio API key');
    console.log('2. Check if you have access to Gemini API');
    console.log('3. Ensure you have sufficient quota');
    return;
  }
  
  console.log('3️⃣ Testing medical analysis with sample data...');
  console.log('📋 Sample blood test data:');
  sampleMetrics.forEach(metric => {
    console.log(`   - ${metric.metric}: ${metric.value} ${metric.unit} (${metric.flag})`);
  });
  console.log('');
  
  try {
    const googleAIService = GoogleAIService.getInstance();
    
    const startTime = Date.now();
    const result = await googleAIService.analyzeHealthReport(
      'Blood test results showing multiple abnormal values requiring medical attention',
      sampleMetrics,
      'Patient is a 35-year-old female with fatigue, increased thirst, and pale appearance'
    );
    
    const totalTime = Date.now() - startTime;
    
    console.log('✅ Analysis completed successfully!\n');
    console.log('📊 Results Summary:');
    console.log('==================');
    console.log(`Processing Time: ${result.processingTime}ms (Total: ${totalTime}ms)`);
    console.log(`Model Used: ${result.modelUsed}`);
    console.log(`Health Score: ${result.healthScore}/100`);
    console.log(`Urgency Level: ${result.urgencyLevel}`);
    console.log('');
    
    console.log('🏥 Medical Assessment:');
    console.log(`"${result.analysis.overallAssessment}"`);
    console.log('');
    
    if (result.analysis.concerns.length > 0) {
      console.log('⚠️ Medical Concerns:');
      result.analysis.concerns.forEach(concern => console.log(`   - ${concern}`));
      console.log('');
    }
    
    if (result.recommendations.dietary.foods_to_include.length > 0) {
      console.log('🥗 Dietary Recommendations:');
      console.log('   Include:', result.recommendations.dietary.foods_to_include.slice(0, 3).join(', '));
      console.log('   Avoid:', result.recommendations.dietary.foods_to_avoid.slice(0, 3).join(', '));
      console.log('');
    }
    
    if (result.recommendations.lifestyle.exercise.length > 0) {
      console.log('🏃 Exercise Recommendations:');
      result.recommendations.lifestyle.exercise.slice(0, 3).forEach(exercise => {
        console.log(`   - ${exercise}`);
      });
      console.log('');
    }
    
    if (result.analysis.specialists.length > 0) {
      console.log('👨‍⚕️ Specialist Consultations:');
      result.analysis.specialists.forEach(specialist => console.log(`   - ${specialist}`));
      console.log('');
    }
    
    if (result.analysis.riskFactors && result.analysis.riskFactors.length > 0) {
      console.log('⚠️ Risk Factors:');
      result.analysis.riskFactors.forEach(risk => console.log(`   - ${risk}`));
      console.log('');
    }
    
    if (result.analysis.followUpTests && result.analysis.followUpTests.length > 0) {
      console.log('🔬 Follow-up Tests:');
      result.analysis.followUpTests.forEach(test => console.log(`   - ${test}`));
      console.log('');
    }
    
    console.log('✅ Google AI Studio integration test completed successfully!');
    console.log('\n🚀 Your app is now ready to use Gemini for medical analysis!');
    
    console.log('\n💡 Benefits of Google AI Studio:');
    console.log('================================');
    console.log('✅ No model downloads required');
    console.log('✅ Fast response times');
    console.log('✅ Strong medical knowledge (Gemini 1.5 Pro)');
    console.log('✅ Reliable API with good uptime');
    console.log('✅ Cost-effective for medical analysis');
    console.log('✅ Built-in safety filters');
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Verify your internet connection');
    console.log('2. Check Google AI Studio status');
    console.log('3. Ensure .env file has correct GOOGLE_AI_API_KEY');
    console.log('4. Check if you have sufficient API quota');
    console.log('5. Verify the model name is correct');
    
    if (error.message?.includes('403')) {
      console.log('\n⚠️ API Key Issues:');
      console.log('- Make sure your API key is valid');
      console.log('- Check if your API key has Gemini API access');
      console.log('- Verify your Google Cloud project has the API enabled');
    }
    
    if (error.message?.includes('429')) {
      console.log('\n⚠️ Rate Limit Issues:');
      console.log('- You may have exceeded your API quota');
      console.log('- Wait a few minutes and try again');
      console.log('- Consider upgrading your Google AI Studio plan');
    }
  }
}

async function testDifferentModels() {
  console.log('\n🧪 Testing Different Gemini Models');
  console.log('===================================\n');
  
  const modelsToTest = [
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-pro'
  ];
  
  for (const modelName of modelsToTest) {
    console.log(`Testing ${modelName}...`);
    
    // Temporarily override the model for testing
    const originalModel = config.ai.google.model;
    (config.ai.google as any).model = modelName;
    
    try {
      const googleAIService = GoogleAIService.getInstance();
      
      const startTime = Date.now();
      const result = await googleAIService.analyzeHealthReport(
        'Quick analysis test',
        sampleMetrics.slice(0, 2), // Use fewer metrics for speed
        ''
      );
      
      const responseTime = Date.now() - startTime;
      
      console.log(`✅ SUCCESS! Response time: ${responseTime}ms`);
      console.log(`Health Score: ${result.healthScore}/100`);
      console.log(`Assessment: ${result.analysis.overallAssessment.substring(0, 80)}...`);
      console.log('');
      
    } catch (error: any) {
      console.log(`❌ FAILED: ${error.message}`);
      console.log('');
    }
    
    // Restore original model
    (config.ai.google as any).model = originalModel;
    
    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('💡 Model Recommendations:');
  console.log('========================');
  console.log('• gemini-1.5-pro: Best for complex medical analysis, higher accuracy');
  console.log('• gemini-1.5-flash: Faster responses, good for simple cases');
  console.log('• gemini-pro: Balanced option, good general performance');
}

// Run the comprehensive test
Promise.all([
  testGoogleAI(),
  testDifferentModels()
]).catch(console.error);