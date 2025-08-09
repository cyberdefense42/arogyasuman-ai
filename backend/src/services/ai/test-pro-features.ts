import { HfInference } from '@huggingface/inference';
import { config } from '../../config';

async function testProFeatures() {
  console.log('🎯 Testing HuggingFace PRO Features');
  console.log('===================================\n');
  
  const hf = new HfInference(config.ai.huggingface.apiToken);
  
  // Check account details
  try {
    const response = await fetch('https://huggingface.co/api/whoami-v2', {
      headers: {
        'Authorization': `Bearer ${config.ai.huggingface.apiToken}`,
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('👤 Account Details:');
      console.log(`   Username: ${data.name}`);
      console.log(`   Email: ${data.email || 'N/A'}`);
      console.log(`   Plan: ${data.plan || 'free'}`);
      console.log(`   Periodic Usage: ${JSON.stringify(data.periodicUsage || {})}`);
      console.log(`   Features: ${JSON.stringify(data.features || [])}\n`);
    }
  } catch (error) {
    console.log('Could not fetch account details');
  }
  
  // Test ServerlessInference API models
  console.log('🔍 Testing Serverless Inference API Models:\n');
  
  const proModels = [
    // Try some premium models
    {
      name: 'meta-llama/Meta-Llama-3-70B-Instruct',
      description: 'Llama 3 70B - Premium model'
    },
    {
      name: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
      description: 'Mixtral 8x7B - MoE model'
    },
    {
      name: 'meta-llama/Llama-2-70b-chat-hf',
      description: 'Llama 2 70B Chat'
    },
    {
      name: 'codellama/CodeLlama-34b-Instruct-hf',
      description: 'CodeLlama 34B'
    },
    {
      name: 'HuggingFaceH4/zephyr-7b-beta',
      description: 'Zephyr 7B Beta'
    }
  ];
  
  for (const model of proModels) {
    console.log(`Testing ${model.name}...`);
    console.log(`Description: ${model.description}`);
    
    try {
      const response = await hf.textGeneration({
        model: model.name,
        inputs: 'What is anemia? Explain briefly.',
        parameters: {
          max_new_tokens: 50,
          temperature: 0.7,
        }
      });
      
      console.log('✅ AVAILABLE with PRO!');
      console.log(`Response: ${response.generated_text.substring(0, 100)}...\n`);
    } catch (error: any) {
      console.log(`❌ ${error.message}\n`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n💡 PRO Subscription Benefits:');
  console.log('=============================\n');
  console.log('1. Inference Endpoints (Main Benefit):');
  console.log('   - Deploy ANY model as a dedicated endpoint');
  console.log('   - Including Meditron 70B, OpenBioLLM 70B');
  console.log('   - Pay per hour of usage\n');
  
  console.log('2. Serverless Inference API:');
  console.log('   - Higher rate limits');
  console.log('   - Priority queue');
  console.log('   - But same model availability\n');
  
  console.log('3. Other Benefits:');
  console.log('   - Private model hosting');
  console.log('   - Advanced compute features');
  console.log('   - Early access to new features\n');
  
  console.log('📝 To use Meditron 70B with PRO:');
  console.log('1. Go to: https://ui.endpoints.huggingface.co/');
  console.log('2. Click "New Endpoint"');
  console.log('3. Select model: epfl-llm/meditron-70b');
  console.log('4. Choose instance: GPU · 4x · Nvidia A100 · 320GB');
  console.log('5. Deploy (costs ~$4-8/hour while running)');
  console.log('6. Use the endpoint URL in your code');
}

testProFeatures().catch(console.error);