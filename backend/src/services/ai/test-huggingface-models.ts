import { HfInference } from '@huggingface/inference';
import { config } from '../../config';

const hf = new HfInference(config.ai.huggingface.apiToken);

// List of models to test
const modelsToTest = [
  // Models known to work with free HF Inference API
  {
    name: 'gpt2',
    task: 'text-generation',
    description: 'GPT-2 - Basic but reliable'
  },
  {
    name: 'distilgpt2',
    task: 'text-generation',
    description: 'DistilGPT2 - Smaller, faster GPT-2'
  },
  {
    name: 'EleutherAI/gpt-neo-125M',
    task: 'text-generation',
    description: 'GPT-Neo 125M - Small but capable'
  },
  {
    name: 'microsoft/DialoGPT-small',
    task: 'text-generation',
    description: 'DialoGPT Small - Conversational'
  },
  {
    name: 'google/flan-t5-base',
    task: 'text-generation',
    description: 'Flan-T5 Base - Good for instructions'
  },
  
  // Medical/Scientific models
  {
    name: 'microsoft/BioGPT',
    task: 'text-generation',
    description: 'Biomedical text generation model'
  },
  {
    name: 'dmis-lab/biobert-v1.1',
    task: 'text-generation',
    description: 'BioBERT - Biomedical BERT'
  },
  
  // Larger models that might work
  {
    name: 'mistralai/Mistral-7B-Instruct-v0.2',
    task: 'text-generation',
    description: 'Mistral 7B Instruct - Fast and efficient'
  },
  {
    name: 'meta-llama/Llama-2-7b-chat-hf',
    task: 'text-generation',
    description: 'Llama 2 7B Chat'
  },
  {
    name: 'tiiuae/falcon-7b-instruct',
    task: 'text-generation',
    description: 'Falcon 7B Instruct'
  },
  {
    name: 'bigscience/bloom-560m',
    task: 'text-generation',
    description: 'BLOOM 560M - Smaller BLOOM'
  },
  {
    name: 'EleutherAI/gpt-j-6B',
    task: 'text-generation',
    description: 'GPT-J 6B - Powerful open model'
  }
];

async function testModel(model: typeof modelsToTest[0]) {
  console.log(`\n🧪 Testing ${model.name}...`);
  console.log(`   Description: ${model.description}`);
  console.log(`   Task: ${model.task}`);
  
  try {
    const startTime = Date.now();
    let response;
    
    if (model.task === 'text-generation') {
      response = await hf.textGeneration({
        model: model.name,
        inputs: 'Analyze this blood test result: Hemoglobin: 12.5 g/dL (LOW). Provide a brief medical assessment.',
        parameters: {
          max_new_tokens: 100,
          temperature: 0.7,
          top_p: 0.95,
          do_sample: true,
        }
      });
      
      console.log(`   ✅ SUCCESS! Response time: ${Date.now() - startTime}ms`);
      console.log(`   Sample output: ${response.generated_text.substring(0, 150)}...`);
      
    } else if (model.task === 'text2text-generation') {
      response = await hf.textGeneration({
        model: model.name,
        inputs: 'Summarize: Patient has low hemoglobin at 12.5 g/dL. Normal range is 13.5-17.5 g/dL for men.',
        parameters: {
          max_new_tokens: 100,
        }
      });
      
      console.log(`   ✅ SUCCESS! Response time: ${Date.now() - startTime}ms`);
      console.log(`   Sample output: ${response.generated_text.substring(0, 150)}...`);
      
    } else if (model.task === 'conversational') {
      // Try as text generation since conversational might need different handling
      response = await hf.textGeneration({
        model: model.name,
        inputs: 'What does low hemoglobin mean in a blood test?',
        parameters: {
          max_new_tokens: 100,
          temperature: 0.7,
        }
      });
      
      console.log(`   ✅ SUCCESS! Response time: ${Date.now() - startTime}ms`);
      console.log(`   Sample output: ${response.generated_text.substring(0, 150)}...`);
    }
    
    return { model: model.name, status: 'success', responseTime: Date.now() - startTime };
    
  } catch (error: any) {
    console.log(`   ❌ FAILED: ${error.message}`);
    return { model: model.name, status: 'failed', error: error.message };
  }
}

async function testHuggingFaceModels() {
  console.log('🤗 Testing HuggingFace Models for Medical Analysis');
  console.log('================================================');
  console.log(`API Token: ${config.ai.huggingface.apiToken ? '✅ Configured' : '❌ Missing'}`);
  
  if (!config.ai.huggingface.apiToken) {
    console.error('❌ No HuggingFace API token found in .env file');
    return;
  }
  
  const results = [];
  
  // Test each model
  for (const model of modelsToTest) {
    const result = await testModel(model);
    results.push(result);
    
    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n📊 Summary');
  console.log('==========');
  
  const successful = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status === 'failed');
  
  console.log(`\n✅ Successful models (${successful.length}):`);
  successful.forEach(r => {
    console.log(`   - ${r.model} (${r.responseTime}ms)`);
  });
  
  console.log(`\n❌ Failed models (${failed.length}):`);
  failed.forEach(r => {
    console.log(`   - ${r.model}: ${r.error}`);
  });
  
  if (successful.length > 0) {
    console.log('\n💡 Recommendation:');
    console.log(`   Use one of the successful models above in your .env file:`);
    console.log(`   HUGGINGFACE_MODEL=${successful[0].model}`);
  }
}

// Run the tests
testHuggingFaceModels().catch(console.error);