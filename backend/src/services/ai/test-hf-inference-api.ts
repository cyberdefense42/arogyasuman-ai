import { HfInference } from '@huggingface/inference';
import { config } from '../../config';

async function testHuggingFaceInferenceAPI() {
  console.log('🤗 HuggingFace Inference API Test');
  console.log('=================================\n');
  
  const hf = new HfInference(config.ai.huggingface.apiToken);
  
  console.log('📝 Important Information:');
  console.log('------------------------');
  console.log('1. The free HuggingFace Inference API has limited model availability');
  console.log('2. Most models require either:');
  console.log('   - Dedicated Inference Endpoints (paid)');
  console.log('   - Local deployment using transformers library');
  console.log('   - Third-party inference providers\n');
  
  console.log('🔍 Testing available inference providers...\n');
  
  // Test with a model that should work on free tier
  try {
    console.log('Testing with a simple prompt...');
    
    // Try the Inference API directly
    const response = await fetch('https://api-inference.huggingface.co/models/gpt2', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.ai.huggingface.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: 'The patient has low hemoglobin which indicates',
        parameters: {
          max_new_tokens: 50,
          temperature: 0.7,
        }
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Direct API call successful!');
      console.log('Response:', JSON.stringify(data, null, 2));
    } else {
      const error = await response.text();
      console.log('❌ Direct API call failed:', error);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  console.log('\n💡 Recommendations for Meditron 70B:');
  console.log('=====================================\n');
  
  console.log('Option 1: HuggingFace Inference Endpoints (Recommended for production)');
  console.log('---------------------------------------------------------------');
  console.log('1. Go to: https://ui.endpoints.huggingface.co/');
  console.log('2. Create a new endpoint with epfl-llm/meditron-70b');
  console.log('3. Choose GPU: A100 (80GB) x2 or similar');
  console.log('4. Cost: ~$4-8/hour depending on hardware');
  console.log('5. Update your code to use the endpoint URL\n');
  
  console.log('Option 2: Local Deployment (For development/testing)');
  console.log('--------------------------------------------');
  console.log('Requirements:');
  console.log('- GPU with 140GB+ VRAM (2x A100 80GB)');
  console.log('- Or use quantization (4-bit) to run on ~35GB VRAM');
  console.log(`
Example code for local deployment:

from transformers import AutoTokenizer, AutoModelForCausalLM
import torch

# Load model (requires ~140GB VRAM)
tokenizer = AutoTokenizer.from_pretrained("epfl-llm/meditron-70b")
model = AutoModelForCausalLM.from_pretrained(
    "epfl-llm/meditron-70b",
    torch_dtype=torch.float16,
    device_map="auto"
)

# Or use 4-bit quantization for smaller GPUs
from transformers import BitsAndBytesConfig

quantization_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_compute_dtype=torch.float16
)

model = AutoModelForCausalLM.from_pretrained(
    "epfl-llm/meditron-70b",
    quantization_config=quantization_config,
    device_map="auto"
)
`);
  
  console.log('\nOption 3: Third-party Services');
  console.log('------------------------------');
  console.log('Check if these services host Meditron 70B:');
  console.log('- Replicate.com');
  console.log('- Together.ai');
  console.log('- Anyscale');
  console.log('- RunPod\n');
  
  console.log('Option 4: Use Smaller Medical Models');
  console.log('------------------------------------');
  console.log('- BioGPT (Microsoft)');
  console.log('- BioBERT');
  console.log('- ClinicalBERT');
  console.log('- Or continue with Meditron 7B via Ollama\n');
}

// Run the test
testHuggingFaceInferenceAPI().catch(console.error);