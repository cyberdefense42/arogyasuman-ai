#!/bin/bash

echo "🩺 HealthScan AI Enterprise Backend Startup"
echo "==========================================="

# Check prerequisites
echo "🔍 Checking prerequisites..."

# Check if PostgreSQL is running
if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
    echo "❌ PostgreSQL is not running!"
    echo "💡 Start it with: brew services start postgresql@14"
    exit 1
fi
echo "✅ PostgreSQL is running"

# Check if Ollama is running
if ! curl -s http://localhost:11434/api/version >/dev/null 2>&1; then
    echo "❌ Ollama is not running!"
    echo "💡 Start it with: ollama serve"
    exit 1
fi
echo "✅ Ollama is running"

# Check if Tesseract is installed
if ! command -v tesseract &> /dev/null; then
    echo "❌ Tesseract is not installed!"
    echo "💡 Install it with: brew install tesseract"
    exit 1
fi
echo "✅ Tesseract is installed"

echo ""
echo "🚀 Starting HealthScan AI Backend..."
echo "📍 Backend will be available at: http://localhost:8080"
echo "📍 API endpoints at: http://localhost:8080/api/v1/"
echo ""

# Navigate to backend directory and start
cd backend && npm run dev