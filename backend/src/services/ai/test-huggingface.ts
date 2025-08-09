import { HuggingFaceService } from './HuggingFaceService';
import { config } from '../../config';

// Test script to verify Hugging Face Meditron 70B integration
async function testHuggingFace() {
  console.log('🤗 Testing Hugging Face Meditron 70B Integration...\n');
  
  try {
    // Check configuration
    console.log('1️⃣ Checking configuration...');
    console.log(`   Provider: ${config.ai.provider}`);
    console.log(`   Model: ${config.ai.huggingface.model}`);
    console.log(`   Token: ${config.ai.huggingface.apiToken ? '✅ Configured' : '❌ Missing'}`);
    
    if (!config.ai.huggingface.apiToken) {
      console.log('❌ Hugging Face API token not found in environment variables');
      console.log('💡 Please set HUGGINGFACE_API_TOKEN in your .env file');
      process.exit(1);
    }
    
    // Initialize service
    console.log('\n2️⃣ Initializing Hugging Face service...');
    const hfService = HuggingFaceService.getInstance();
    await hfService.initialize();
    console.log('✅ Hugging Face service initialized');
    
    // Test medical analysis
    console.log('\n3️⃣ Testing medical analysis with sample data...');
    console.log('📋 Sample blood test data:');
    console.log('   - Hemoglobin: 10.2 g/dL (LOW)');
    console.log('   - Glucose: 145 mg/dL (HIGH)');
    console.log('   - Cholesterol: 210 mg/dL (HIGH)');
    console.log('   - WBC: 8,500 /μL (NORMAL)\n');
    
    const sampleMetrics = [
      { metric: 'Hemoglobin', value: '10.2', unit: 'g/dL', flag: 'LOW' as const },
      { metric: 'Glucose', value: '145', unit: 'mg/dL', flag: 'HIGH' as const },
      { metric: 'Total Cholesterol', value: '210', unit: 'mg/dL', flag: 'HIGH' as const },
      { metric: 'WBC Count', value: '8500', unit: '/μL', flag: 'NORMAL' as const }
    ];
    
    const startTime = Date.now();
    const analysis = await hfService.analyzeHealthReport('Sample report text', sampleMetrics, 'Patient reports fatigue and occasional chest discomfort');
    const endTime = Date.now();
    
    console.log('🤖 Meditron 70B Analysis Results:');
    console.log('═'.repeat(60));
    console.log(`📊 Health Score: ${analysis.healthScore}/100`);
    console.log(`⚡ Processing Time: ${analysis.processingTime}ms`);
    console.log(`🏥 Model Used: ${analysis.modelUsed}`);
    console.log(`🚨 Urgency Level: ${analysis.urgencyLevel}`);
    
    console.log('\n📝 Assessment:');
    console.log(`   ${analysis.analysis.overallAssessment}`);
    
    console.log('\n⚠️ Concerns:');
    analysis.analysis.concerns.forEach((concern, i) => {
      console.log(`   ${i + 1}. ${concern}`);
    });
    
    console.log('\n🥗 Dietary Recommendations:');
    analysis.recommendations.dietary.foods_to_include.slice(0, 3).forEach((food, i) => {
      console.log(`   ✅ ${food}`);
    });
    
    console.log('\n🚫 Foods to Avoid:');
    analysis.recommendations.dietary.foods_to_avoid.slice(0, 3).forEach((food, i) => {
      console.log(`   ❌ ${food}`);
    });
    
    console.log('\n💪 Exercise Recommendations:');
    analysis.recommendations.lifestyle.exercise.slice(0, 3).forEach((exercise, i) => {
      console.log(`   🏃 ${exercise}`);
    });
    
    if (analysis.recommendations.supplements && analysis.recommendations.supplements.length > 0) {
      console.log('\n💊 Supplement Suggestions:');
      analysis.recommendations.supplements.slice(0, 3).forEach((supplement, i) => {
        console.log(`   💊 ${supplement}`);
      });
    }
    
    if (analysis.analysis.specialists && analysis.analysis.specialists.length > 0) {
      console.log('\n👨‍⚕️ Specialist Recommendations:');
      analysis.analysis.specialists.forEach((specialist, i) => {
        console.log(`   🩺 ${specialist}`);
      });
    }
    
    console.log('\n═'.repeat(60));
    console.log('✅ Hugging Face Meditron 70B integration test completed successfully!');
    console.log(`📈 Analysis Quality: Medical-grade with 70B parameter model`);
    console.log(`🔒 Privacy: Data processed via Hugging Face Inference API`);
    console.log(`💰 Cost: ~$0.002 per analysis (estimated)`);
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.message?.includes('Access to model')) {
      console.log('\n🔐 Model Access Required:');
      console.log('1. Visit: https://huggingface.co/epfl-llm/meditron-70b');
      console.log('2. Click "Request Access"');
      console.log('3. Fill out the access form');
      console.log('4. Wait for approval (usually 1-2 hours)');
    } else if (error.message?.includes('Invalid token')) {
      console.log('\n🔑 Token Issues:');
      console.log('1. Check your token in .env file');
      console.log('2. Ensure token has "Read" permissions');
      console.log('3. Verify token is not expired');
    } else if (error.message?.includes('Rate limit')) {
      console.log('\n⏰ Rate Limit:');
      console.log('1. Wait a few minutes and try again');
      console.log('2. Consider upgrading to Pro account for higher limits');
    }
    
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Verify your internet connection');
    console.log('2. Check Hugging Face status: https://status.huggingface.co');
    console.log('3. Ensure .env file has correct HUGGINGFACE_API_TOKEN');
    
    process.exit(1);
  }
}

// Run the test
testHuggingFace().catch(console.error);