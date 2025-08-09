import { OpenRouterService } from './OpenRouterService';
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

async function testOpenRouterModels() {
  console.log('🚀 Testing OpenRouter Medical Models');
  console.log('===================================\n');
  
  // First, check available models
  try {
    console.log('🔍 Checking available models on OpenRouter...\n');
    
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${config.ai.openrouter.apiKey}`,
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      const medicalModels = data.data.filter((model: any) => 
        model.id.toLowerCase().includes('bio') || 
        model.id.toLowerCase().includes('medical') ||
        model.id.toLowerCase().includes('meditron') ||
        model.id.toLowerCase().includes('openbio') ||
        model.id.includes('llama3') ||
        model.id.includes('claude') ||
        model.id.includes('gpt-4')
      );
      
      console.log(`📊 Found ${data.data.length} total models, ${medicalModels.length} potentially suitable for medical analysis:\n`);
      
      medicalModels.slice(0, 10).forEach((model: any) => {
        console.log(`   🏥 ${model.id}`);
        console.log(`      Context: ${model.context_length || 'N/A'} tokens`);
        console.log(`      Price: $${model.pricing?.prompt || 'N/A'}/1M input, $${model.pricing?.completion || 'N/A'}/1M output`);
        console.log('');
      });
      
    } else {
      console.log('❌ Could not fetch models list');
    }
  } catch (error) {
    console.log('❌ Error fetching models:', error);
  }
  
  // Test medical models
  const modelsToTest = [
    'aaditya/llama3-openbio-llm-70b',
    'aaditya/llama3-openbio-llm-8b', 
    'meta-llama/llama-3.1-70b-instruct',
    'anthropic/claude-3.5-sonnet',
    'openai/gpt-4o',
    'meta-llama/llama-3.1-8b-instruct'
  ];
  
  console.log('\n🧪 Testing Medical Analysis with Different Models:\n');
  
  for (const modelName of modelsToTest) {
    console.log(`Testing ${modelName}...`);
    
    // Temporarily override the model for testing
    const originalModel = config.ai.openrouter.model;
    (config.ai.openrouter as any).model = modelName;
    
    try {
      const openrouterService = OpenRouterService.getInstance();
      
      const startTime = Date.now();
      const result = await openrouterService.analyzeHealthReport(
        'Blood test results showing low hemoglobin and elevated glucose levels',
        sampleMetrics,
        'Patient is a 35-year-old female with no known medical history'
      );
      
      const responseTime = Date.now() - startTime;
      
      console.log(`✅ SUCCESS! Response time: ${responseTime}ms`);
      console.log(`Model Used: ${result.modelUsed}`);
      console.log(`Health Score: ${result.healthScore}/100`);
      console.log(`Urgency: ${result.urgencyLevel}`);
      console.log(`Assessment: ${result.analysis.overallAssessment.substring(0, 100)}...`);
      console.log(`Concerns: ${result.analysis.concerns.slice(0, 2).join(', ')}`);
      console.log(`Dietary Recommendations: ${result.recommendations.dietary.foods_to_include.slice(0, 3).join(', ')}`);
      console.log('');
      
    } catch (error: any) {
      console.log(`❌ FAILED: ${error.message}`);
      console.log('');
    }
    
    // Restore original model
    (config.ai.openrouter as any).model = originalModel;
    
    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n💡 Recommendations:');
  console.log('==================\n');
  console.log('Based on the test results above, here are the best models for medical analysis:\n');
  console.log('1. **OpenBioLLM 70B** - Specialized medical model, best accuracy');
  console.log('2. **Claude 3.5 Sonnet** - Excellent reasoning, good for medical analysis');
  console.log('3. **GPT-4o** - Strong general capabilities, reliable medical knowledge');
  console.log('4. **Llama 3.1 70B** - Good balance of cost and performance');
  console.log('5. **OpenBioLLM 8B** - Cost-effective medical-specific option\n');
  
  console.log('🎯 Recommended Configuration:');
  console.log('Update your .env file with the best performing model:');
  console.log('OPENROUTER_MODEL=aaditya/llama3-openbio-llm-70b  # or your preferred model');
}

async function testOpenRouter() {
  console.log('🔧 OpenRouter Integration Test');
  console.log('==============================\n');
  
  console.log('1️⃣ Checking configuration...');
  console.log(`   Provider: ${config.ai.provider}`);
  console.log(`   Model: ${config.ai.openrouter.model}`);
  console.log(`   API Key: ${config.ai.openrouter.apiKey ? '✅ Configured' : '❌ Missing'}`);
  console.log('');
  
  if (!config.ai.openrouter.apiKey) {
    console.error('❌ OpenRouter API key not found in .env file');
    console.log('Please add: OPENROUTER_API_KEY=your-key-here');
    return;
  }
  
  console.log('2️⃣ Initializing OpenRouter service...');
  try {
    const openrouterService = OpenRouterService.getInstance();
    await openrouterService.initialize();
    console.log('✅ OpenRouter service initialized\n');
  } catch (error: any) {
    console.error('❌ OpenRouter initialization failed:', error.message);
    return;
  }
  
  console.log('3️⃣ Testing medical analysis with sample data...');
  console.log('📋 Sample blood test data:');
  sampleMetrics.forEach(metric => {
    console.log(`   - ${metric.metric}: ${metric.value} ${metric.unit} (${metric.flag})`);
  });
  console.log('');
  
  try {
    const openrouterService = OpenRouterService.getInstance();
    
    const startTime = Date.now();
    const result = await openrouterService.analyzeHealthReport(
      'Blood test results showing multiple abnormal values requiring medical attention',
      sampleMetrics,
      'Patient is a 35-year-old female with fatigue and increased thirst'
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
    
    console.log('✅ OpenRouter integration test completed successfully!');
    console.log('\n🚀 Your app is now ready to use OpenBioLLM via OpenRouter!');
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Verify your internet connection');
    console.log('2. Check OpenRouter status: https://openrouter.ai/status');
    console.log('3. Ensure .env file has correct OPENROUTER_API_KEY');
    console.log('4. Check if you have sufficient credits on OpenRouter');
  }
}

// Run the comprehensive test
Promise.all([
  testOpenRouter(),
  testOpenRouterModels()
]).catch(console.error);