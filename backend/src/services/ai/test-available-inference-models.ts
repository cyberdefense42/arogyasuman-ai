import { HfInference } from '@huggingface/inference';
import { config } from '../../config';

const hf = new HfInference(config.ai.huggingface.apiToken);

// Test models that are typically available on HuggingFace Inference API
const inferenceAPIModels = [
  // Models hosted by HuggingFace (usually work)
  {
    name: 'HuggingFaceH4/zephyr-7b-beta',
    description: 'Zephyr 7B - Good for conversations',
    provider: 'huggingface'
  },
  {
    name: 'mistralai/Mistral-7B-Instruct-v0.1',
    description: 'Mistral 7B v0.1 - Fast and efficient',
    provider: 'huggingface'
  },
  {
    name: 'microsoft/Phi-3-mini-4k-instruct',
    description: 'Phi-3 Mini - Small but capable',
    provider: 'huggingface'
  },
  {
    name: 'google/flan-t5-xxl',
    description: 'Flan-T5 XXL - Good for tasks',
    provider: 'huggingface'
  },
  {
    name: 'bigcode/starcoder',
    description: 'StarCoder - Code generation',
    provider: 'huggingface'
  },
  {
    name: 'tiiuae/falcon-7b-instruct',
    description: 'Falcon 7B - Open source',
    provider: 'huggingface'
  },
  
  // Medical/Scientific models
  {
    name: 'medicalai/ClinicalBERT',
    description: 'Clinical BERT - Medical NLP',
    provider: 'huggingface'
  },
  {
    name: 'emilyalsentzer/Bio_ClinicalBERT',
    description: 'BioClinical BERT',
    provider: 'huggingface'
  },
  {
    name: 'allenai/scibert_scivocab_uncased',
    description: 'SciBERT - Scientific text',
    provider: 'huggingface'
  },
  
  // Smaller models that often work
  {
    name: 'gpt2',
    description: 'GPT-2 - Classic model',
    provider: 'huggingface'
  },
  {
    name: 'distilbert-base-uncased',
    description: 'DistilBERT - Fast BERT',
    provider: 'huggingface'
  },
  {
    name: 'facebook/bart-large-mnli',
    description: 'BART - Zero-shot classification',
    provider: 'huggingface'
  }
];

async function checkInferenceEndpoints() {
  console.log('🔍 Checking HuggingFace Inference Endpoints...\n');
  
  try {
    // Check if user has any inference endpoints
    const response = await fetch('https://api.endpoints.huggingface.cloud/v2/endpoint', {
      headers: {
        'Authorization': `Bearer ${config.ai.huggingface.apiToken}`,
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('📊 Your Inference Endpoints:');
      if (data.items && data.items.length > 0) {
        data.items.forEach((endpoint: any) => {
          console.log(`   - ${endpoint.name}: ${endpoint.model.repository} (${endpoint.status.state})`);
        });
      } else {
        console.log('   No active inference endpoints found.');
      }
    }
  } catch (error) {
    console.log('   Could not fetch inference endpoints.');
  }
  console.log('');
}

async function testModel(modelName: string, description: string) {
  console.log(`Testing ${modelName}...`);
  console.log(`Description: ${description}`);
  
  try {
    const startTime = Date.now();
    
    // Try text generation
    const response = await hf.textGeneration({
      model: modelName,
      inputs: 'Patient presents with hemoglobin level of 12.5 g/dL. This indicates',
      parameters: {
        max_new_tokens: 50,
        temperature: 0.7,
        return_full_text: false,
      }
    });
    
    const responseTime = Date.now() - startTime;
    console.log(`✅ SUCCESS! Response time: ${responseTime}ms`);
    console.log(`Sample: ${response.generated_text.substring(0, 100)}...`);
    console.log('');
    
    return { model: modelName, status: 'available', responseTime };
    
  } catch (error: any) {
    // Check if it's a task mismatch error
    if (error.message?.includes('Supported task:')) {
      const supportedTask = error.message.match(/Supported task: (\w+)/)?.[1];
      console.log(`❌ Model requires different task: ${supportedTask}`);
    } else if (error.message?.includes('currently loading')) {
      console.log('⏳ Model is loading, try again in a few seconds...');
      return { model: modelName, status: 'loading' };
    } else if (error.message?.includes('No Inference Provider')) {
      console.log('❌ Not available on free Inference API');
    } else {
      console.log(`❌ Error: ${error.message}`);
    }
    console.log('');
    
    return { model: modelName, status: 'unavailable', error: error.message };
  }
}

async function checkAvailableModels() {
  console.log('🤗 HuggingFace Remote Model Availability Test');
  console.log('============================================\n');
  
  console.log('📝 Note: This tests models available through the FREE Inference API.');
  console.log('   For more models, you need Inference Endpoints (paid) or external providers.\n');
  
  // Check inference endpoints first
  await checkInferenceEndpoints();
  
  console.log('🧪 Testing Free Inference API Models:\n');
  
  const results = [];
  
  for (const model of inferenceAPIModels) {
    const result = await testModel(model.name, model.description);
    results.push(result);
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  
  // Summary
  console.log('\n📊 SUMMARY');
  console.log('==========\n');
  
  const available = results.filter(r => r.status === 'available');
  const loading = results.filter(r => r.status === 'loading');
  const unavailable = results.filter(r => r.status === 'unavailable');
  
  if (available.length > 0) {
    console.log(`✅ Available Models (${available.length}):`);
    available.forEach(r => {
      console.log(`   - ${r.model} (${r.responseTime}ms)`);
    });
    console.log('');
  }
  
  if (loading.length > 0) {
    console.log(`⏳ Loading Models (${loading.length}) - Try again later:`);
    loading.forEach(r => {
      console.log(`   - ${r.model}`);
    });
    console.log('');
  }
  
  console.log(`❌ Unavailable on Free API (${unavailable.length} models)\n`);
  
  console.log('💡 RECOMMENDATIONS:');
  console.log('==================\n');
  
  if (available.length > 0) {
    console.log('1. For immediate use with HuggingFace:');
    console.log(`   Update .env: HUGGINGFACE_MODEL=${available[0].model}`);
    console.log(`   Update .env: AI_PROVIDER=huggingface\n`);
  }
  
  console.log('2. For Meditron 70B access:');
  console.log('   Option A: Deploy on HuggingFace Inference Endpoints (~$4-8/hour)');
  console.log('   Option B: Use providers like Together AI, Replicate, or Anyscale');
  console.log('   Option C: Continue with local Ollama + Meditron 7B\n');
  
  console.log('3. For medical-specific models:');
  console.log('   - Try OpenAI API with medical prompts');
  console.log('   - Use Anthropic Claude API');
  console.log('   - Deploy BioBERT/ClinicalBERT on Inference Endpoints\n');
  
  console.log('📚 More info: https://huggingface.co/docs/inference-endpoints/');
}

// Run the test
checkAvailableModels().catch(console.error);