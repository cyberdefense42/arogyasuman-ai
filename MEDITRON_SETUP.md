# Meditron 7B Integration Guide

## Overview

The HealthScan AI app now uses **Meditron 7B**, a specialized medical large language model, for analyzing blood test results. Meditron is specifically trained on medical literature and clinical data, making it more accurate for healthcare applications.

## Prerequisites

1. **Ollama** must be installed and running
2. At least 8GB of RAM (16GB recommended)
3. ~4GB of disk space for the model

## Setup Instructions

### 1. Install Ollama (if not already installed)

```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Start Ollama service
ollama serve
```

### 2. Pull Meditron 7B Model

```bash
# Pull the Meditron 7B model
ollama pull meditron:7b

# Verify the model is installed
ollama list
```

### 3. Configure Backend

Create a `.env` file in the backend directory:

```bash
cd backend
cp .env.example .env
```

Ensure these settings in your `.env`:
```
OLLAMA_API_URL=http://localhost:11434
OLLAMA_MODEL=meditron:7b
```

### 4. Test the Integration

```bash
# Test if Meditron is responding
curl http://localhost:11434/api/generate -d '{
  "model": "meditron:7b",
  "prompt": "What are normal hemoglobin levels?",
  "stream": false
}'
```

## Model Optimization

The AI service has been optimized for Meditron with:

1. **Lower temperature (0.1)**: For consistent medical advice
2. **System prompt**: Identifies as Meditron medical AI
3. **Increased token limit**: For detailed analysis
4. **Medical-specific prompting**: Uses clinical terminology

## Key Improvements with Meditron

1. **Medical Accuracy**: Trained specifically on medical data
2. **Clinical Terminology**: Better understanding of lab values
3. **Evidence-Based**: Recommendations based on medical literature
4. **Indian Context**: Prompts adapted for Indian dietary and lifestyle recommendations

## Customization Options

### Adjust Model Parameters

In `AIService.ts`, you can modify:

```typescript
options: {
  temperature: 0.1,      // 0.0-1.0 (lower = more consistent)
  top_p: 0.95,          // Nucleus sampling
  top_k: 40,            // Top-k sampling
  repeat_penalty: 1.1,   // Prevent repetition
  num_predict: 1024,    // Max tokens in response
}
```

### Modify System Prompt

The system prompt in `AIService.ts` can be customized:

```typescript
role: 'system',
content: 'You are Meditron, a specialized medical AI assistant...'
```

## Troubleshooting

### Model Not Found
```bash
# Ensure model is downloaded
ollama list

# Re-pull if needed
ollama pull meditron:7b
```

### Slow Response Times
- Increase timeout in `config/index.ts`
- Check system resources with `top` or Activity Monitor
- Consider using GPU acceleration if available

### Ollama Connection Issues
```bash
# Check if Ollama is running
curl http://localhost:11434

# Restart Ollama
ollama serve
```

## Performance Tips

1. **Run on GPU**: If available, Ollama will automatically use GPU
2. **Increase Memory**: Allocate more RAM to Ollama for better performance
3. **Batch Processing**: Process multiple reports sequentially to maintain model in memory

## Alternative Medical Models

If Meditron doesn't meet your needs, consider:

1. **medllama2**: Another medical-focused model
2. **biomistral**: Biomedical variant of Mistral
3. **clinicalbert**: For clinical text analysis

To switch models, simply update `OLLAMA_MODEL` in your `.env` file.

## Security Considerations

1. **Local Processing**: All AI processing happens locally
2. **No Data Leakage**: Patient data never leaves your server
3. **HIPAA Compliance**: Suitable for healthcare applications
4. **Audit Trail**: All AI interactions are logged

## Next Steps

1. Test with sample blood reports
2. Fine-tune prompts for your specific use cases
3. Monitor response quality and adjust parameters
4. Consider implementing feedback loop for continuous improvement