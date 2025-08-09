# HealthScan AI Backend API Documentation

## Overview

The HealthScan AI Backend is an enterprise-grade REST API for processing medical reports using OCR and AI analysis. It provides endpoints for file upload, report management, and health monitoring.

## Base URL

```
http://localhost:8080/api/v1
```

## Authentication

Currently, the API operates in demo mode without authentication. All endpoints are publicly accessible.

## Rate Limiting

- **Window**: 15 minutes
- **Limit**: 100 requests per IP
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Endpoints

### Health Check

#### GET /health
Basic health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-07-27T15:30:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "development"
}
```

#### GET /health/detailed
Comprehensive health check with all services.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-07-27T15:30:00.000Z",
  "uptime": 3600,
  "responseTime": "45ms",
  "version": "1.0.0",
  "environment": "development",
  "services": {
    "database": {
      "status": "ok",
      "message": "Database connection healthy",
      "stats": {
        "totalReports": 42
      }
    },
    "ai": {
      "status": "ok",
      "message": "AI service (Ollama) is responsive",
      "model": "llama3.2:latest"
    },
    "storage": {
      "status": "ok",
      "message": "Storage service is functional",
      "uploadPath": "/path/to/uploads"
    }
  },
  "system": {
    "memory": {
      "used": 128,
      "total": 256,
      "external": 32
    },
    "cpu": {
      "user": 1234567,
      "system": 567890
    },
    "platform": "darwin",
    "nodeVersion": "v18.17.0"
  }
}
```

### File Upload

#### POST /upload
Upload and process a medical report file.

**Content-Type:** `multipart/form-data`

**Parameters:**
- `file` (required): Medical report file (PDF, PNG, JPG, JPEG)
- Maximum file size: 10MB

**Example Request:**
```bash
curl -X POST \
  http://localhost:5000/api/v1/upload \
  -F "file=@blood_report.pdf"
```

**Response:**
```json
{
  "success": true,
  "requestId": "abc123-def456-ghi789",
  "report": {
    "id": "report-uuid",
    "fileName": "blood_report.pdf",
    "fileType": "application/pdf",
    "fileUrl": "/uploads/reports/demo/file.pdf",
    "status": "COMPLETED"
  },
  "ocr": {
    "confidence": 87.5,
    "method": "pdf-text",
    "pageCount": 2,
    "processingTime": 1250
  },
  "metrics": {
    "count": 12,
    "categories": ["Blood Count", "Metabolism", "Liver Function"]
  },
  "analysis": {
    "healthScore": 85,
    "overallAssessment": "Your blood test results show generally healthy parameters...",
    "concernsCount": 2,
    "processingTime": 3400
  },
  "meta": {
    "totalProcessingTime": 5200,
    "timestamp": "2025-07-27T15:30:00.000Z"
  }
}
```

#### GET /upload/status/:reportId
Get the processing status of an uploaded report.

**Parameters:**
- `reportId` (path): Report UUID

**Response:**
```json
{
  "id": "report-uuid",
  "status": "COMPLETED",
  "fileName": "blood_report.pdf",
  "uploadDate": "2025-07-27T15:25:00.000Z",
  "ocrConfidence": 87.5,
  "metricsCount": 12,
  "hasAnalysis": true,
  "healthScore": 85
}
```

### Reports Management

#### GET /reports
Get paginated list of reports.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 50)
- `status` (optional): Filter by status (PENDING, PROCESSING, COMPLETED, FAILED)
- `userId` (optional): Filter by user ID

**Example Request:**
```bash
curl "http://localhost:5000/api/v1/reports?page=1&limit=10&status=COMPLETED"
```

**Response:**
```json
{
  "data": [
    {
      "id": "report-uuid",
      "userId": "demo-user",
      "fileName": "blood_report.pdf",
      "fileUrl": "/uploads/reports/demo/file.pdf",
      "fileType": "application/pdf",
      "status": "COMPLETED",
      "uploadDate": "2025-07-27T15:25:00.000Z",
      "ocrConfidence": 87.5,
      "analysis": {
        "healthScore": 85,
        "createdAt": "2025-07-27T15:26:00.000Z"
      },
      "_count": {
        "metrics": 12
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

#### GET /reports/:id
Get specific report with complete analysis.

**Parameters:**
- `id` (path): Report UUID

**Response:**
```json
{
  "id": "report-uuid",
  "userId": "demo-user",
  "fileName": "blood_report.pdf",
  "fileUrl": "/uploads/reports/demo/file.pdf",
  "fileType": "application/pdf",
  "status": "COMPLETED",
  "uploadDate": "2025-07-27T15:25:00.000Z",
  "extractedText": "BLOOD TEST REPORT\\n...",
  "ocrConfidence": 87.5,
  "analysis": {
    "id": "analysis-uuid",
    "reportId": "report-uuid",
    "healthScore": 85,
    "aiAnalysis": {
      "overallAssessment": "Your blood test results show...",
      "concerns": ["Cholesterol slightly elevated"],
      "specialists": [],
      "followUpTests": []
    },
    "recommendations": {
      "dietary": {
        "foods_to_include": ["Spinach dal", "Amla juice"],
        "foods_to_avoid": ["Deep fried foods"],
        "meal_plan_suggestions": "Include balanced meals..."
      },
      "lifestyle": {
        "exercise": ["Morning walk 30 minutes"],
        "daily_routine": ["Regular sleep schedule"],
        "stress_management": ["Meditation"]
      },
      "ayurvedic": "Consider Ayurvedic consultation..."
    }
  },
  "metrics": [
    {
      "id": "metric-uuid",
      "category": "Blood Count",
      "metric": "Hemoglobin",
      "value": 13.5,
      "unit": "g/dL",
      "flag": "NORMAL"
    }
  ]
}
```

#### DELETE /reports/:id
Delete a report and all associated data.

**Parameters:**
- `id` (path): Report UUID

**Response:**
```json
{
  "message": "Report deleted successfully",
  "id": "report-uuid"
}
```

#### GET /reports/:id/metrics
Get health metrics for a specific report.

**Parameters:**
- `id` (path): Report UUID

**Response:**
```json
{
  "reportId": "report-uuid",
  "totalMetrics": 12,
  "categories": ["Blood Count", "Metabolism", "Liver Function"],
  "metrics": {
    "Blood Count": [
      {
        "id": "metric-uuid",
        "category": "Blood Count",
        "metric": "Hemoglobin",
        "value": 13.5,
        "unit": "g/dL",
        "flag": "NORMAL"
      }
    ],
    "Metabolism": [
      {
        "id": "metric-uuid-2",
        "category": "Metabolism",
        "metric": "Glucose",
        "value": 95,
        "unit": "mg/dL",
        "flag": "NORMAL"
      }
    ]
  }
}
```

#### GET /reports/:id/analysis
Get AI analysis for a specific report.

**Parameters:**
- `id` (path): Report UUID

**Response:**
```json
{
  "id": "analysis-uuid",
  "reportId": "report-uuid",
  "healthScore": 85,
  "aiAnalysis": {
    "overallAssessment": "Your blood test results show generally healthy parameters...",
    "concerns": ["Cholesterol slightly elevated"],
    "specialists": [],
    "followUpTests": []
  },
  "recommendations": {
    "dietary": {
      "foods_to_include": ["Spinach dal", "Amla juice", "Methi paratha"],
      "foods_to_avoid": ["Deep fried foods", "Excessive sugar"],
      "meal_plan_suggestions": "Include balanced meals with dal, vegetables, and whole grains."
    },
    "lifestyle": {
      "exercise": ["Morning walk 30 minutes", "Yoga asanas"],
      "daily_routine": ["Regular sleep schedule", "Adequate hydration"],
      "stress_management": ["Meditation", "Deep breathing"]
    },
    "ayurvedic": "Consider incorporating Ayurvedic principles for holistic health."
  },
  "createdAt": "2025-07-27T15:26:00.000Z",
  "updatedAt": "2025-07-27T15:26:00.000Z",
  "report": {
    "fileName": "blood_report.pdf",
    "uploadDate": "2025-07-27T15:25:00.000Z",
    "status": "COMPLETED"
  }
}
```

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message",
  "details": [
    {
      "field": "fieldName",
      "message": "Validation error message"
    }
  ]
}
```

### HTTP Status Codes

- **200**: Success
- **400**: Bad Request (validation errors, invalid file type)
- **404**: Not Found (report not found)
- **409**: Conflict (duplicate entries)
- **413**: Payload Too Large (file size exceeded)
- **429**: Too Many Requests (rate limit exceeded)
- **500**: Internal Server Error
- **503**: Service Unavailable (AI service down)

## Supported File Types

- **Images**: PNG, JPG, JPEG
- **Documents**: PDF
- **Maximum Size**: 10MB

## Processing Flow

1. **Upload**: File is validated and stored
2. **OCR**: Text extraction using Tesseract or PDF parsing
3. **Metrics Extraction**: Health metrics are identified and categorized
4. **AI Analysis**: Ollama analyzes metrics and provides recommendations
5. **Storage**: Results are saved to database

## Configuration

### Environment Variables

```bash
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://user:pass@localhost:5432/db
FRONTEND_URL=http://localhost:3000
OLLAMA_API_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:latest
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
API_RATE_LIMIT=100
API_RATE_WINDOW=900000
LOG_LEVEL=info
```

## Logging

All API requests and errors are logged using Winston:

- **Console**: Colored output for development
- **Files**: 
  - `logs/combined.log`: All logs
  - `logs/error.log`: Error logs only
- **Rotation**: 5MB max file size, 5 files retained

## Development

### Running the Backend

```bash
cd backend
npm install
npm run dev
```

### Testing API Endpoints

```bash
# Health check
curl http://localhost:5000/api/v1/health

# Upload file
curl -X POST \
  http://localhost:5000/api/v1/upload \
  -F "file=@sample_report.pdf"

# Get reports
curl http://localhost:5000/api/v1/reports
```

### Building for Production

```bash
npm run build
npm start
```