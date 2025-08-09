#!/bin/bash

echo "🧪 HealthScan AI API Testing Script"
echo "===================================="

API_BASE="http://localhost:8080/api/v1"

echo ""
echo "1. 🏥 Testing Health Check..."
curl -s "$API_BASE/health" | jq . 2>/dev/null || curl -s "$API_BASE/health"

echo ""
echo ""
echo "2. 🔍 Testing Detailed Health Check..."
curl -s "$API_BASE/health/detailed" | jq . 2>/dev/null || curl -s "$API_BASE/health/detailed"

echo ""
echo ""
echo "3. 📊 Testing Reports List..."
curl -s "$API_BASE/reports" | jq . 2>/dev/null || curl -s "$API_BASE/reports"

echo ""
echo ""
echo "4. 📤 Testing File Upload..."
echo "To test file upload, run:"
echo "curl -X POST $API_BASE/upload -F \"file=@/path/to/your/blood_report.pdf\""

echo ""
echo "✅ API testing complete!"
echo "📍 Backend running at: $API_BASE"