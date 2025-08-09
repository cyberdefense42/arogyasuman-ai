# HuggingFace Integration Setup

## Configuration

Add your HuggingFace API token to the `.env` file:

```env
AI_PROVIDER=huggingface
HUGGINGFACE_API_TOKEN=your_token_here
HUGGINGFACE_MODEL=epfl-llm/meditron-70b
```

## Getting Your Token

1. Go to https://huggingface.co/settings/tokens
2. Create a new token with read permissions
3. Copy the token and add it to your `.env` file

## Testing

```bash
# Test HuggingFace integration
npm run test:huggingface

# Start development server
npm run dev
```

## Security Notes

- Never commit your API token to version control
- Use environment variables for all secrets
- Rotate tokens periodically for security