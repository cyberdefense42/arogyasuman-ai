# HealthScan AI - Enterprise Medical Report Analysis 🏥

An enterprise-grade health analysis platform that uses OCR and AI to analyze medical reports, extract health metrics, and provide personalized recommendations. Built with modern microservices architecture for scalability and maintainability.

![HealthScan AI](https://img.shields.io/badge/Status-Enterprise%20Ready-brightgreen)
![Backend](https://img.shields.io/badge/Backend-Express.js-black)
![Frontend](https://img.shields.io/badge/Frontend-Next.js%2015-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![Database](https://img.shields.io/badge/Database-PostgreSQL-336791)
![AI](https://img.shields.io/badge/AI-Ollama%20Llama%203.2-orange)

## 🌟 Enterprise Features

### Core Capabilities
- **🔍 Native OCR Processing**: Tesseract OCR with PDF.js for high-accuracy text extraction
- **🤖 Local AI Analysis**: Ollama integration with Llama 3.2 for medical report analysis
- **📊 Automated Health Metrics**: Smart extraction and categorization of blood test values
- **🍛 Indian-Specific Recommendations**: Culturally relevant dietary and lifestyle advice
- **📈 Microservices Architecture**: Scalable backend with separate API and frontend

### Enterprise Features
- **🏗️ Separation of Concerns**: Clean backend API with frontend client architecture
- **🔐 Enterprise Security**: Rate limiting, input validation, comprehensive error handling
- **📝 Professional Logging**: Winston-based structured logging with rotation
- **⚡ High Performance**: Async processing, efficient file handling, database optimization
- **🔧 Configuration Management**: Environment-based configuration with validation
- **📡 RESTful API**: Comprehensive REST API with detailed documentation
- **🛡️ Production Ready**: Health checks, monitoring, and error recovery

### Technical Capabilities
- **Multi-format Support**: PDF, PNG, JPG, JPEG (up to 10MB)
- **Intelligent Processing**: Hybrid OCR with fallback mechanisms
- **Real-time Analysis**: Live processing status and progress tracking
- **Scalable Storage**: Local storage with cloud-ready architecture

## 🏗️ Enterprise Architecture

### Project Structure

```
healthscan-ai/
├── backend/                    # Express.js API Server
│   ├── src/
│   │   ├── api/v1/            # API Routes & Controllers
│   │   │   ├── controllers/   # Business logic controllers
│   │   │   ├── routes/        # Express route definitions
│   │   │   └── middlewares/   # Custom middleware
│   │   ├── services/          # Business logic services
│   │   │   ├── ocr/          # OCR processing service
│   │   │   ├── ai/           # AI analysis service
│   │   │   ├── storage/      # File storage service
│   │   │   └── database/     # Database service
│   │   ├── config/           # Configuration management
│   │   ├── utils/            # Utilities & helpers
│   │   └── types/            # Shared TypeScript types
│   ├── prisma/               # Database schema & migrations
│   ├── docs/                 # API documentation
│   ├── logs/                 # Application logs
│   └── uploads/              # File storage directory
└── frontend/                   # Next.js Frontend (planned)
    └── src/
        ├── components/       # React components by feature
        │   ├── common/       # Shared components
        │   ├── features/     # Feature-specific components
        │   └── layouts/      # Layout components
        ├── hooks/            # Custom React hooks
        ├── services/         # API client services
        ├── store/            # State management
        ├── types/            # Frontend type definitions
        └── utils/            # Frontend utilities
```

### Service Architecture

```mermaid
graph TB
    Client[Frontend Client] --> API[Express.js API]
    API --> Auth[Auth Service]
    API --> Upload[Upload Controller]
    API --> Reports[Reports Controller]
    
    Upload --> OCR[OCR Service]
    Upload --> AI[AI Service]
    Upload --> Storage[Storage Service]
    Upload --> DB[Database Service]
    
    OCR --> Tesseract[Native Tesseract]
    OCR --> PDF[PDF.js Parser]
    
    AI --> Ollama[Ollama AI]
    
    Storage --> FS[File System]
    DB --> PostgreSQL[PostgreSQL]
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Native Tesseract OCR
- Ollama with Llama 3.2 model installed

### Installation

1. **Download the project**
   ```bash
   # Extract the project files to your desired directory
   cd healthscan-ai
   ```

2. **Install system dependencies (macOS)**
   ```bash
   # Install Homebrew (if not installed)
   # Visit https://brew.sh for installation instructions
   
   # Install PostgreSQL
   brew install postgresql@14
   brew services start postgresql@14
   
   # Install Tesseract OCR
   brew install tesseract
   
   # Install Ollama
   brew install ollama
   ollama serve  # In a separate terminal
   ollama pull llama3.2:latest
   ```

3. **Setup database**
   ```bash
   # Create database and user
   psql postgres
   CREATE DATABASE healthscan_db;
   CREATE USER healthscan_user WITH PASSWORD 'healthscan_password';
   GRANT ALL PRIVILEGES ON DATABASE healthscan_db TO healthscan_user;
   \q
   ```

4. **Setup and start the backend API**
   ```bash
   cd backend
   npm install
   cp .env.example .env  # Configure backend environment
   npx prisma generate
   npx prisma migrate dev
   mkdir -p logs
   npm run dev
   ```

5. **Test the API**
   ```bash
   # Health check
   curl http://localhost:5000/api/v1/health
   
   # Upload a test file
   curl -X POST \
     http://localhost:5000/api/v1/upload \
     -F "file=@sample_report.pdf"
   ```

The backend API will be available at [http://localhost:8080](http://localhost:8080)

## 🏗️ Enterprise Tech Stack

### Backend API (Express.js)
- **Express.js** - Web application framework
- **TypeScript** - Type safety and better DX
- **Winston** - Professional logging with rotation
- **Helmet** - Security middleware
- **CORS** - Cross-origin resource sharing
- **Multer** - File upload handling
- **Rate Limiting** - API protection

### Database & ORM
- **PostgreSQL** - Primary database
- **Prisma** - Modern database ORM
- **Connection Pooling** - Optimized database connections
- **Migration System** - Database version control

### AI & Processing
- **Native Tesseract** - System-level OCR with high accuracy
- **PDF.js** - PDF text extraction and rendering
- **Sharp** - High-performance image processing
- **Ollama** - Local LLM inference (Llama 3.2)
- **Canvas** - Server-side image rendering

### Frontend (Planned)
- **Next.js 15** - React framework with App Router
- **TypeScript** - Full type safety
- **Tailwind CSS** - Utility-first styling
- **React Query** - Server state management
- **Zustand** - Client state management

### Infrastructure & DevOps
- **Node.js 18+** - Runtime environment
- **Docker** - Containerization support
- **Health Checks** - System monitoring
- **Error Tracking** - Comprehensive error handling
- **API Documentation** - OpenAPI/Swagger ready

## 📡 API Usage

### Upload and Analyze Report

```bash
curl -X POST \
  http://localhost:8080/api/v1/upload \
  -F "file=@blood_report.pdf"
```

### Get Report Analysis

```bash
curl http://localhost:8080/api/v1/reports/{report-id}
```

### Health Check

```bash
curl http://localhost:8080/api/v1/health/detailed
```

See [API Documentation](backend/docs/API.md) for complete endpoint reference.

## 🛡️ Security

### Implemented Security Measures

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **File Validation**: Type and size restrictions
- **Input Sanitization**: Zod schema validation
- **Error Handling**: Structured error responses
- **CORS**: Configured for frontend domain
- **Security Headers**: Helmet.js integration

### Future Security Enhancements

- Authentication & Authorization (JWT)
- API key management
- File encryption at rest
- Audit logging
- Role-based access control

## 📈 Performance Optimization

### Current Optimizations

- **Async Processing**: Non-blocking OCR and AI operations
- **File Streaming**: Memory-efficient file handling
- **Database Indexing**: Optimized queries
- **Caching**: In-memory caching for frequent queries

### Scaling Considerations

- **Database**: Read replicas, connection pooling
- **Storage**: Migrate to S3/cloud storage
- **AI Processing**: Queue-based processing
- **Load Balancing**: Multiple backend instances

## 🔧 Configuration

### Backend Environment Variables

Create `backend/.env`:

```env
NODE_ENV=development
PORT=5000
DATABASE_URL="postgresql://healthscan_user:healthscan_password@localhost:5432/healthscan_db"
FRONTEND_URL=http://localhost:3000
OLLAMA_API_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:latest
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
API_RATE_LIMIT=100
API_RATE_WINDOW=900000
LOG_LEVEL=info
```

## 🧪 Testing

### Manual Testing

1. **Health Check**: `curl http://localhost:5000/api/v1/health`
2. **Upload File**: Use curl to upload a medical report
3. **Check Analysis**: Verify OCR extraction and AI analysis results
4. **Monitor Logs**: Check `backend/logs/` for processing details

### Sample Test Files

Create test files in `test-data/`:
- `sample_blood_report.pdf`
- `sample_report_image.png`

## 🔍 Monitoring & Observability

### Logging

- **Location**: `backend/logs/`
- **Files**: `combined.log`, `error.log`
- **Format**: Structured JSON with timestamps
- **Rotation**: 5MB files, 5 file retention

### Health Checks

- **Basic**: `GET /api/v1/health`
- **Detailed**: `GET /api/v1/health/detailed`
- **Services**: `GET /api/v1/health/services`

### Metrics

Monitor these key metrics:
- API response times
- OCR processing duration
- AI analysis completion rates
- File upload success rates
- Database connection health

## 🔄 Development Workflow

### Adding New Features

1. **Backend**: Add service → controller → route → tests
2. **Frontend**: Add component → hook → service integration
3. **Database**: Create migration → update types
4. **Documentation**: Update API docs and README

### Code Quality

```bash
# Backend
npm run lint
npm run format
npm run type-check
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Database Connection Error
```bash
# Check PostgreSQL status
brew services list | grep postgresql

# Restart if needed
brew services restart postgresql@14
```

#### 2. Ollama Service Unavailable
```bash
# Check if Ollama is running
curl http://localhost:11434/api/version

# Start Ollama
ollama serve
```

#### 3. Tesseract OCR Errors
```bash
# Verify installation
tesseract --version

# Check permissions
ls -la /opt/homebrew/share/tessdata
```

#### 4. File Upload Failures
- Check file size limits (10MB max)
- Verify file type (PDF, PNG, JPG only)
- Check upload directory permissions

### Debug Mode

Enable debug logging:

```env
LOG_LEVEL=debug
NODE_ENV=development
```

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please follow these steps:
1. Create a feature branch
2. Make your changes
3. Add tests
4. Submit your changes for review

## 📞 Support

For support and questions:
- **Documentation**: [API Docs](backend/docs/API.md)
- **Email**: support@healthscan.ai

---

**HealthScan AI** - Transforming healthcare through intelligent document analysis.