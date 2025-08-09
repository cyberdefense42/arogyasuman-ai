import { HfInference } from '@huggingface/inference';
import { config } from '../../config';

const hf = new HfInference(config.ai.huggingface.apiToken);

// Medical and biomedical models to test
const medicalModels = [
  // OpenBioLLM models
  {
    name: 'aaditya/Llama3-OpenBioLLM-70B',
    description: 'Llama3 OpenBioLLM 70B - Medical LLM',
    task: 'text-generation'
  },
  {
    name: 'aaditya/Llama3-OpenBioLLM-8B',
    description: 'Llama3 OpenBioLLM 8B - Smaller medical LLM',
    task: 'text-generation'
  },
  
  // Other medical models
  {
    name: 'microsoft/BiomedNLP-PubMedBERT-base-uncased-abstract-fulltext',
    description: 'PubMedBERT - Biomedical text',
    task: 'text-generation'
  },
  {
    name: 'epfl-llm/meditron-7b',
    description: 'Meditron 7B - Medical assistant',
    task: 'text-generation'
  },
  {
    name: 'epfl-llm/meditron-70b',
    description: 'Meditron 70B - Advanced medical assistant',
    task: 'text-generation'
  },
  
  // Models that might work via Inference API
  {
    name: 'google/flan-t5-small',
    description: 'Flan-T5 Small - Can be fine-tuned for medical',
    task: 'text-generation'
  },
  {
    name: 'facebook/bart-base',
    description: 'BART Base - Good for medical summaries',
    task: 'text-generation'
  }
];

async function testMedicalModel(model: typeof medicalModels[0]) {
  console.log(`\n🏥 Testing ${model.name}`);
  console.log(`   ${model.description}`);
  
  try {
    const medicalPrompt = `Medical Analysis: A patient presents with hemoglobin level of 10.5 g/dL (normal range: 12-16 g/dL for women). This indicates`;
    
    const startTime = Date.now();
    const response = await hf.textGeneration({
      model: model.name,
      inputs: medicalPrompt,
      parameters: {
        max_new_tokens: 100,
        temperature: 0.3, // Lower temperature for medical accuracy
        return_full_text: false,
      }
    });
    
    const responseTime = Date.now() - startTime;
    console.log(`   ✅ AVAILABLE! Response time: ${responseTime}ms`);
    console.log(`   Response: "${response.generated_text.substring(0, 150)}..."`);
    
    return { 
      model: model.name, 
      status: 'available', 
      responseTime,
      canUseRemotely: true 
    };
    
  } catch (error: any) {
    if (error.message?.includes('currently loading')) {
      console.log('   ⏳ Model is loading... (may take 20-30 seconds)');
      return { model: model.name, status: 'loading', canUseRemotely: 'maybe' };
    } else if (error.message?.includes('No Inference Provider')) {
      console.log('   ❌ Not available via free Inference API');
      console.log('   💡 Requires: Inference Endpoints (paid) or local deployment');
    } else if (error.message?.includes('Supported task:')) {
      const task = error.message.match(/Supported task: (\w+)/)?.[1];
      console.log(`   ❌ Wrong task type. Model supports: ${task}`);
    } else {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    return { 
      model: model.name, 
      status: 'unavailable', 
      error: error.message,
      canUseRemotely: false 
    };
  }
}

async function checkInferenceProviders() {
  console.log('\n🔍 Checking Inference Providers...\n');
  
  // Test with a simple model to see available providers
  try {
    const providers = [
      'hf-inference',
      'aws-sagemaker', 
      'together-ai',
      'replicate',
      'huggingface-inference-endpoints'
    ];
    
    console.log('Common inference providers:');
    providers.forEach(p => console.log(`   - ${p}`));
    
  } catch (error) {
    console.log('Could not fetch provider info');
  }
}

async function testMedicalModelsRemote() {
  console.log('🏥 Medical Models Remote Availability Test');
  console.log('==========================================\n');
  
  console.log('This test checks which medical models can be used REMOTELY');
  console.log('(without downloading them to your machine)\n');
  
  await checkInferenceProviders();
  
  console.log('\n📊 Testing Medical Models:');
  
  const results = [];
  
  for (const model of medicalModels) {
    const result = await testMedicalModel(model);
    results.push(result);
    
    // Delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Summary
  console.log('\n\n📋 SUMMARY - Remote Medical Models');
  console.log('===================================\n');
  
  const available = results.filter(r => r.canUseRemotely === true);
  const maybeAvailable = results.filter(r => r.canUseRemotely === 'maybe');
  const notAvailable = results.filter(r => r.canUseRemotely === false);
  
  if (available.length > 0) {
    console.log('✅ Available for Remote Use:');
    available.forEach(r => {
      console.log(`   - ${r.model} (${r.responseTime}ms)`);
    });
  } else {
    console.log('❌ No medical models available via free Inference API');
  }
  
  if (maybeAvailable.length > 0) {
    console.log('\n⏳ Currently Loading (try again):');
    maybeAvailable.forEach(r => {
      console.log(`   - ${r.model}`);
    });
  }
  
  console.log(`\n📍 Not Available on Free Tier: ${notAvailable.length} models`);
  
  console.log('\n\n💡 OPTIONS FOR REMOTE MEDICAL AI:');
  console.log('==================================\n');
  
  console.log('1. HuggingFace Inference Endpoints (Recommended):');
  console.log('   - Deploy any model (including Meditron 70B, OpenBioLLM)');
  console.log('   - Cost: $4-8/hour for large models');
  console.log('   - URL: https://ui.endpoints.huggingface.co/\n');
  
  console.log('2. Third-Party API Providers:');
  console.log('   - Together AI: Has Llama-3 models, might have medical variants');
  console.log('   - Replicate: Can run any public model');
  console.log('   - Anyscale: Supports various open models');
  console.log('   - OpenRouter: Aggregates multiple model providers\n');
  
  console.log('3. Medical-Capable General APIs:');
  console.log('   - OpenAI GPT-4: Excellent for medical analysis with proper prompts');
  console.log('   - Anthropic Claude: Strong medical knowledge');
  console.log('   - Google Gemini: Good for medical queries\n');
  
  console.log('4. Current Setup (Ollama):');
  console.log('   - Continue using Meditron 7B locally');
  console.log('   - Already optimized for speed');
  console.log('   - No API costs\n');
  
  if (available.length > 0) {
    console.log('📝 To use an available model:');
    console.log(`   1. Update .env: HUGGINGFACE_MODEL=${available[0].model}`);
    console.log('   2. Update .env: AI_PROVIDER=huggingface');
    console.log('   3. Restart your backend server');
  }
}

// Run the test
testMedicalModelsRemote().catch(console.error);