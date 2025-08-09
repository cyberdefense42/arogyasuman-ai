import { Ollama } from 'ollama';
import { config } from '../../config';

// Test script to verify Meditron integration
async function testMeditron() {
  console.log('🏥 Testing Meditron 7B Integration...\n');
  
  const ollama = new Ollama({
    host: config.ai.ollama.apiUrl,
  });
  
  try {
    // Check if Ollama is running
    console.log('1️⃣ Checking Ollama connection...');
    const models = await ollama.list();
    console.log('✅ Ollama is running');
    
    // Check if Meditron is installed
    console.log('\n2️⃣ Checking for Meditron model...');
    const hasMetitron = models.models.some(m => m.name.includes('meditron'));
    
    if (!hasMetitron) {
      console.log('❌ Meditron not found. Please run: ollama pull meditron:7b');
      process.exit(1);
    }
    
    console.log('✅ Meditron 7B is installed');
    
    // Test medical query
    console.log('\n3️⃣ Testing medical analysis...');
    console.log('📋 Sample blood test data:');
    console.log('   - Hemoglobin: 11.5 g/dL (LOW)');
    console.log('   - WBC: 12,000 /μL (HIGH)');
    console.log('   - Platelets: 150,000 /μL (NORMAL)\n');
    
    const response = await ollama.chat({
      model: 'meditron:7b',
      messages: [
        {
          role: 'system',
          content: 'You are Meditron, a medical AI assistant. Analyze the following blood test results.'
        },
        {
          role: 'user',
          content: `Analyze these blood test results:
- Hemoglobin: 11.5 g/dL (LOW - Normal: 13.5-17.5)
- WBC: 12,000 /μL (HIGH - Normal: 4,500-11,000)
- Platelets: 150,000 /μL (NORMAL - Normal: 150,000-450,000)

Provide a brief assessment and one dietary recommendation.`
        }
      ],
      options: {
        temperature: 0.1,
        num_predict: 200,
      }
    });
    
    console.log('🤖 Meditron Analysis:');
    console.log('─'.repeat(50));
    console.log(response.message.content);
    console.log('─'.repeat(50));
    
    console.log('\n✅ Meditron integration test completed successfully!');
    console.log('📌 Model: ' + config.ai.ollama.model);
    console.log('📌 API URL: ' + config.ai.ollama.apiUrl);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Ensure Ollama is running: ollama serve');
    console.log('2. Pull Meditron model: ollama pull meditron:7b');
    console.log('3. Check API URL in .env file');
    process.exit(1);
  }
}

// Run the test
testMeditron().catch(console.error);