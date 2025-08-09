import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

// Environment variable schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('8080'),
  DATABASE_URL: z.string().url(),
  
  // CORS
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  
  // File upload
  MAX_FILE_SIZE: z.string().default('10485760'), // 10MB in bytes
  UPLOAD_DIR: z.string().default('./uploads'),
  
  // AI Services
  OLLAMA_API_URL: z.string().url().default('http://localhost:11434'),
  OLLAMA_MODEL: z.string().default('meditron:7b'),
  
  // Google AI Studio Configuration
  GOOGLE_AI_API_KEY: z.string().optional(),
  GOOGLE_AI_MODEL: z.string().default('gemini-1.5-pro'),
  
  AI_PROVIDER: z.enum(['ollama', 'google']).default('ollama'),
  
  // Security
  API_RATE_LIMIT: z.string().default('100'),
  API_RATE_WINDOW: z.string().default('900000'), // 15 minutes in ms
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

// Parse and validate environment variables
const env = envSchema.parse(process.env);

export const config = {
  server: {
    env: env.NODE_ENV,
    port: parseInt(env.PORT, 10),
    isProduction: env.NODE_ENV === 'production',
    isDevelopment: env.NODE_ENV === 'development',
    isTest: env.NODE_ENV === 'test',
  },
  
  database: {
    url: env.DATABASE_URL,
  },
  
  cors: {
    origin: env.NODE_ENV === 'development' ? true : env.FRONTEND_URL,
    credentials: true,
    optionsSuccessStatus: 200,
  },
  
  upload: {
    maxFileSize: parseInt(env.MAX_FILE_SIZE, 10),
    uploadDir: env.UPLOAD_DIR,
    allowedMimeTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/pdf'
    ],
  },
  
  ai: {
    provider: env.AI_PROVIDER,
    ollama: {
      apiUrl: env.OLLAMA_API_URL,
      model: env.OLLAMA_MODEL,
      timeout: 30000, // 30 seconds
    },
    google: {
      apiKey: env.GOOGLE_AI_API_KEY,
      model: env.GOOGLE_AI_MODEL,
      timeout: 30000, // 30 seconds
    },
  },
  
  security: {
    rateLimit: {
      max: parseInt(env.API_RATE_LIMIT, 10),
      windowMs: parseInt(env.API_RATE_WINDOW, 10),
    },
  },
  
  logging: {
    level: env.LOG_LEVEL,
  },
};

export type Config = typeof config;