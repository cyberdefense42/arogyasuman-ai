// Shared types for HealthScan AI Application
// These types are used across frontend and backend

export interface HealthMetric {
  id?: string;
  reportId?: string;
  category: string;
  metric: string;
  value: number;
  unit: string;
  flag: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  normalRange?: number[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Report {
  id: string;
  userId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  uploadDate: Date;
  extractedText?: string | null;
  ocrConfidence?: number | null;
  createdAt: Date;
  updatedAt: Date;
  analysis?: Analysis | null;
  metrics?: HealthMetric[];
  _count?: {
    metrics: number;
  };
}

export interface Analysis {
  id: string;
  reportId: string;
  healthScore: number;
  aiAnalysis: {
    overallAssessment: string;
    concerns: string[];
    specialists: string[];
    followUpTests: string[];
  };
  recommendations: {
    dietary: {
      foods_to_include: string[];
      foods_to_avoid: string[];
      meal_plan_suggestions: string;
    };
    lifestyle: {
      exercise: string[];
      daily_routine: string[];
      stress_management: string[];
    };
    ayurvedic: string;
  };
  createdAt: Date;
  updatedAt: Date;
  report?: Report;
}

export interface User {
  id: string;
  email: string;
  name: string;
  provider: string;
  createdAt: Date;
  updatedAt: Date;
  reports?: Report[];
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    timestamp: string;
    requestId?: string;
    processingTime?: number;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Upload Types
export interface UploadResponse {
  success: boolean;
  requestId: string;
  report: {
    id: string;
    fileName: string;
    fileType: string;
    fileUrl: string;
    status: string;
  };
  ocr: {
    confidence: number;
    method: 'tesseract' | 'pdf-text' | 'combined';
    pageCount: number;
    processingTime: number;
  };
  metrics: {
    count: number;
    categories: string[];
  };
  analysis?: {
    healthScore: number;
    overallAssessment: string;
    concernsCount: number;
    processingTime: number;
  } | null;
  meta: {
    totalProcessingTime: number;
    timestamp: string;
  };
}

// Health Check Types
export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  responseTime?: string;
  services?: {
    database: ServiceHealth;
    ai: ServiceHealth;
    storage: ServiceHealth;
  };
  system?: {
    memory: {
      used: number;
      total: number;
      external: number;
    };
    cpu: NodeJS.CpuUsage;
    platform: string;
    nodeVersion: string;
  };
}

export interface ServiceHealth {
  status: 'ok' | 'error';
  message: string;
  error?: string;
  stats?: Record<string, any>;
  model?: string;
  uploadPath?: string;
}

// Error Types
export interface ErrorResponse {
  error: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
  field?: string;
  stack?: string;
}

// Configuration Types
export interface AppConfig {
  server: {
    env: string;
    port: number;
    isProduction: boolean;
    isDevelopment: boolean;
    isTest: boolean;
  };
  database: {
    url: string;
  };
  cors: {
    origin: string;
    credentials: boolean;
    optionsSuccessStatus: number;
  };
  upload: {
    maxFileSize: number;
    uploadDir: string;
    allowedMimeTypes: string[];
  };
  ai: {
    ollama: {
      apiUrl: string;
      model: string;
      timeout: number;
    };
  };
  security: {
    rateLimit: {
      max: number;
      windowMs: number;
    };
  };
  logging: {
    level: string;
  };
}

// Analysis Request/Response Types
export interface AnalysisRequest {
  extractedText: string;
  metrics: HealthMetric[];
  contextualInfo?: string;
}

export interface AnalysisResponse {
  analysis: {
    overallAssessment: string;
    concerns: string[];
    specialists: string[];
    followUpTests: string[];
  };
  recommendations: {
    dietary: {
      foods_to_include: string[];
      foods_to_avoid: string[];
      meal_plan_suggestions: string;
    };
    lifestyle: {
      exercise: string[];
      daily_routine: string[];
      stress_management: string[];
    };
    ayurvedic: string;
  };
  healthScore: number;
  processingTime: number;
}

// OCR Types
export interface OCRResult {
  text: string;
  confidence: number;
  pageCount: number;
  processingMethod: 'tesseract' | 'pdf-text' | 'combined';
  processingTime: number;
}

// Storage Types
export interface StorageResult {
  fileName: string;
  filePath: string;
  url: string;
  size: number;
}

// Dashboard Types
export interface DashboardStats {
  totalReports: number;
  completedAnalyses: number;
  averageHealthScore: number;
  recentReports: Report[];
  healthTrends: {
    metric: string;
    data: Array<{
      date: string;
      value: number;
      flag: string;
    }>;
  }[];
}