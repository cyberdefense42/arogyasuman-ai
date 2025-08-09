#!/usr/bin/env ts-node

import sharp from 'sharp';
import { LocalOCRService } from '../src/services/ocr/LocalOCRService';
import { logger } from '../src/utils/logger';

async function testEnhancedOCR() {
  console.log('🧪 Testing Enhanced OCR Service...\n');
  
  try {
    // Initialize the OCR service
    const ocrService = LocalOCRService.getInstance();
    await ocrService.initialize();
    
    // Create a simple test image with medical text
    const testImageBuffer = await createTestMedicalReport();
    
    console.log('📄 Processing test medical report...');
    
    // Test with different engines
    const engines = ['tesseract', 'ensemble'] as const;
    
    for (const engine of engines) {
      console.log(`\n🔍 Testing with ${engine} engine...`);
      
      try {
        const startTime = Date.now();
        const result = await ocrService.processDocument(
          testImageBuffer, 
          'image/png',
          { 
            preferredEngine: engine, 
            enhancedPreprocessing: true 
          }
        );
        
        console.log(`✅ ${engine.toUpperCase()} Results:`);
        console.log(`   Processing Time: ${Date.now() - startTime}ms`);
        console.log(`   Confidence: ${result.confidence.toFixed(1)}%`);
        console.log(`   Method: ${result.processingMethod}`);
        console.log(`   Provider: ${result.provider || 'N/A'}`);
        console.log(`   Text Length: ${result.text.length} characters`);
        
        // Extract health metrics from the result
        const metrics = ocrService.extractHealthMetrics(result.text);
        console.log(`   Health Metrics Extracted: ${metrics.length}`);
        
        if (metrics.length > 0) {
          console.log('   Sample Metrics:');
          metrics.slice(0, 3).forEach(metric => {
            console.log(`     • ${metric.metric}: ${metric.value} ${metric.unit} (${metric.flag})`);
          });
        }
        
        // Show a preview of extracted text
        const preview = result.text.substring(0, 200).replace(/\n/g, ' ');
        console.log(`   Text Preview: "${preview}${result.text.length > 200 ? '...' : ''}"`);
        
      } catch (error) {
        console.log(`❌ ${engine.toUpperCase()} failed:`, error instanceof Error ? error.message : error);
      }
    }
    
    console.log('\n🎉 Enhanced OCR testing completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

async function createTestMedicalReport(): Promise<Buffer> {
  // Create a simple medical report image for testing
  const width = 800;
  const height = 600;
  
  // Create SVG content simulating a medical report
  const svgContent = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="white"/>
      
      <!-- Header -->
      <text x="50" y="40" font-family="Arial" font-size="24" font-weight="bold" fill="black">
        LABORATORY REPORT
      </text>
      <text x="50" y="65" font-family="Arial" font-size="14" fill="black">
        Patient: John Doe | DOB: 01/01/1980 | Date: ${new Date().toLocaleDateString()}
      </text>
      
      <!-- Test Results -->
      <text x="50" y="120" font-family="Arial" font-size="16" font-weight="bold" fill="black">
        BLOOD CHEMISTRY PANEL
      </text>
      
      <!-- Table-like layout -->
      <text x="50" y="160" font-family="Arial" font-size="12" font-weight="bold" fill="black">
        Parameter                Value    Unit     Reference Range
      </text>
      <line x1="50" y1="170" x2="750" y2="170" stroke="black" stroke-width="1"/>
      
      <text x="50" y="195" font-family="Arial" font-size="12" fill="black">
        Glucose                  85       mg/dL    70-100
      </text>
      <text x="50" y="220" font-family="Arial" font-size="12" fill="black">
        Hemoglobin              14.2      g/dL     12.0-16.0
      </text>
      <text x="50" y="245" font-family="Arial" font-size="12" fill="black">
        Total Cholesterol       195       mg/dL    &lt;200
      </text>
      <text x="50" y="270" font-family="Arial" font-size="12" fill="black">
        HDL Cholesterol         55        mg/dL    &gt;40
      </text>
      <text x="50" y="295" font-family="Arial" font-size="12" fill="black">
        LDL Cholesterol         125       mg/dL    &lt;130
      </text>
      <text x="50" y="320" font-family="Arial" font-size="12" fill="black">
        Triglycerides           110       mg/dL    &lt;150
      </text>
      <text x="50" y="345" font-family="Arial" font-size="12" fill="black">
        Creatinine              0.9       mg/dL    0.6-1.2
      </text>
      
      <!-- Alternative format section -->
      <text x="50" y="400" font-family="Arial" font-size="16" font-weight="bold" fill="black">
        ADDITIONAL TESTS
      </text>
      
      <text x="50" y="430" font-family="Arial" font-size="12" fill="black">
        TSH: 2.1 mIU/L [0.4-4.0]
      </text>
      <text x="50" y="450" font-family="Arial" font-size="12" fill="black">
        Vitamin D: 32 ng/mL (Normal: 30-100)
      </text>
      <text x="50" y="470" font-family="Arial" font-size="12" fill="black">
        Iron - 95 μg/dL
      </text>
      
      <!-- Footer -->
      <text x="50" y="530" font-family="Arial" font-size="10" fill="black">
        * Values outside reference ranges are flagged
      </text>
      <text x="50" y="550" font-family="Arial" font-size="10" fill="black">
        Lab certified by CAP and CLIA | Report generated: ${new Date().toISOString()}
      </text>
    </svg>
  `;
  
  // Convert SVG to PNG buffer
  const pngBuffer = await sharp(Buffer.from(svgContent))
    .png()
    .toBuffer();
    
  return pngBuffer;
}

// Run the test
if (require.main === module) {
  testEnhancedOCR().catch(console.error);
}