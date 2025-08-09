import tesseract from 'node-tesseract-ocr';
import * as pdfjs from 'pdfjs-dist';
import sharp from 'sharp';
import path from 'path';
import { logger } from '../../utils/logger';
import { AppError } from '../../middlewares/errorHandler';

// Cloud OCR providers
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { ComputerVisionClient } from '@azure/cognitiveservices-computervision';
import { ApiKeyCredentials } from '@azure/ms-rest-js';

// Configure PDF.js worker
const pdfjsWorkerPath = path.join(require.resolve('pdfjs-dist'), '../pdf.worker.min.mjs');
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorkerPath;

export interface EnhancedProcessingResult {
  text: string;
  confidence: number;
  pageCount: number;
  processingMethod: 'google-vision' | 'azure-vision' | 'tesseract' | 'pdf-text' | 'combined';
  processingTime: number;
  boundingBoxes?: BoundingBox[];
  language?: string;
  orientation?: number;
  provider?: string;
}

export interface BoundingBox {
  text: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HealthMetric {
  category: string;
  metric: string;
  value: number;
  unit: string;
  flag: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  normalRange?: number[];
  confidence: number;
  position?: { x: number; y: number };
}

export class EnhancedOCRService {
  private static instance: EnhancedOCRService;
  private googleVisionClient?: ImageAnnotatorClient;
  private azureVisionClient?: ComputerVisionClient;
  
  private tesseractConfig = {
    lang: 'eng+chi_sim+fra+deu+spa', // Multi-language support
    oem: 1, // LSTM OCR Engine Mode
    psm: 6, // Uniform block of text
    tessdataDir: process.platform === 'darwin' 
      ? '/opt/homebrew/share/tessdata' 
      : '/usr/share/tesseract-ocr/4.00/tessdata',
  };
  
  private constructor() {
    this.initializeCloudServices();
  }
  
  static getInstance(): EnhancedOCRService {
    if (!EnhancedOCRService.instance) {
      EnhancedOCRService.instance = new EnhancedOCRService();
    }
    return EnhancedOCRService.instance;
  }
  
  private initializeCloudServices(): void {
    // Initialize Google Vision API if credentials available
    try {
      if (process.env.GOOGLE_CLOUD_PROJECT && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        this.googleVisionClient = new ImageAnnotatorClient();
        logger.info('✅ Google Vision API initialized');
      }
    } catch (error) {
      logger.warn('⚠️ Google Vision API not available:', error);
    }
    
    // Initialize Azure Computer Vision if credentials available
    try {
      if (process.env.AZURE_COMPUTER_VISION_KEY && process.env.AZURE_COMPUTER_VISION_ENDPOINT) {
        const cognitiveServiceCredentials = new ApiKeyCredentials({
          inHeader: { 'Ocp-Apim-Subscription-Key': process.env.AZURE_COMPUTER_VISION_KEY }
        });
        this.azureVisionClient = new ComputerVisionClient(
          cognitiveServiceCredentials,
          process.env.AZURE_COMPUTER_VISION_ENDPOINT
        );
        logger.info('✅ Azure Computer Vision initialized');
      }
    } catch (error) {
      logger.warn('⚠️ Azure Computer Vision not available:', error);
    }
  }
  
  async initialize(): Promise<void> {
    try {
      // Test Tesseract availability with better configuration
      await tesseract.recognize(
        Buffer.from('test'),
        { ...this.tesseractConfig, psm: 8 }
      ).catch(() => {});
      
      logger.info('✅ Enhanced OCR service initialized');
      logger.info(`📊 Available OCR providers: ${this.getAvailableProviders().join(', ')}`);
    } catch (error) {
      logger.warn('⚠️ OCR service initialization warning:', error);
    }
  }
  
  private getAvailableProviders(): string[] {
    const providers = ['tesseract'];
    if (this.googleVisionClient) providers.push('google-vision');
    if (this.azureVisionClient) providers.push('azure-vision');
    return providers;
  }
  
  async processDocument(
    buffer: Buffer,
    mimeType: string,
    preferredProvider?: string
  ): Promise<EnhancedProcessingResult> {
    const startTime = Date.now();
    logger.info(`📄 Processing document of type: ${mimeType} with ${preferredProvider || 'auto'} provider`);
    
    try {
      let result: EnhancedProcessingResult;
      
      if (mimeType === 'application/pdf') {
        result = await this.processPDF(buffer);
      } else if (mimeType.startsWith('image/')) {
        result = await this.processImageWithBestProvider(buffer, preferredProvider);
      } else {
        throw new AppError(`Unsupported file type: ${mimeType}`, 400);
      }
      
      result.processingTime = Date.now() - startTime;
      logger.info(`✅ Document processed in ${result.processingTime}ms with ${result.confidence.toFixed(1)}% confidence`);
      
      return result;
    } catch (error) {
      logger.error('Document processing error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to process document', 500);
    }
  }
  
  private async processImageWithBestProvider(
    buffer: Buffer,
    preferredProvider?: string
  ): Promise<EnhancedProcessingResult> {
    const providers = preferredProvider ? [preferredProvider] : ['google-vision', 'azure-vision', 'tesseract'];
    
    for (const provider of providers) {
      try {
        let result: EnhancedProcessingResult;
        
        switch (provider) {
          case 'google-vision':
            if (this.googleVisionClient) {
              result = await this.processWithGoogleVision(buffer);
              if (result.confidence > 70) return result;
            }
            break;
            
          case 'azure-vision':
            if (this.azureVisionClient) {
              result = await this.processWithAzureVision(buffer);
              if (result.confidence > 70) return result;
            }
            break;
            
          case 'tesseract':
            result = await this.processWithTesseract(buffer);
            if (result.confidence > 60) return result;
            break;
        }
      } catch (error) {
        logger.warn(`Provider ${provider} failed:`, error);
        continue;
      }
    }
    
    // Fallback to Tesseract if all providers fail
    return await this.processWithTesseract(buffer);
  }
  
  private async processWithGoogleVision(buffer: Buffer): Promise<EnhancedProcessingResult> {
    if (!this.googleVisionClient) {
      throw new Error('Google Vision API not available');
    }
    
    logger.info('🔍 Processing with Google Vision API...');
    
    // Preprocess image for better OCR
    const preprocessedBuffer = await this.preprocessImage(buffer, 'medical');
    
    const [result] = await this.googleVisionClient.textDetection({
      image: { content: preprocessedBuffer }
    });
    
    const detections = result.textAnnotations || [];
    const fullText = detections[0]?.description || '';
    
    // Calculate confidence based on detection confidence scores
    const avgConfidence = detections.slice(1).reduce((sum, detection) => {
      return sum + (detection.confidence || 0);
    }, 0) / Math.max(1, detections.length - 1) * 100;
    
    // Extract bounding boxes for structured data extraction
    const boundingBoxes: BoundingBox[] = detections.slice(1).map(detection => ({
      text: detection.description || '',
      confidence: (detection.confidence || 0) * 100,
      x: detection.boundingPoly?.vertices?.[0]?.x || 0,
      y: detection.boundingPoly?.vertices?.[0]?.y || 0,
      width: Math.abs((detection.boundingPoly?.vertices?.[2]?.x || 0) - (detection.boundingPoly?.vertices?.[0]?.x || 0)),
      height: Math.abs((detection.boundingPoly?.vertices?.[2]?.y || 0) - (detection.boundingPoly?.vertices?.[0]?.y || 0))
    }));
    
    return {
      text: fullText,
      confidence: Math.max(avgConfidence, this.estimateConfidence(fullText)),
      pageCount: 1,
      processingMethod: 'google-vision',
      processingTime: 0,
      boundingBoxes,
      provider: 'Google Vision API'
    };
  }
  
  private async processWithAzureVision(buffer: Buffer): Promise<EnhancedProcessingResult> {
    if (!this.azureVisionClient) {
      throw new Error('Azure Computer Vision not available');
    }
    
    logger.info('🔍 Processing with Azure Computer Vision...');
    
    // Preprocess image for better OCR
    const preprocessedBuffer = await this.preprocessImage(buffer, 'medical');
    
    const result = await this.azureVisionClient.readInStream(preprocessedBuffer);
    const operationLocation = result.operationLocation;
    
    if (!operationLocation) {
      throw new Error('Failed to start Azure OCR operation');
    }
    
    // Extract operation ID from the operation location URL
    const operationId = operationLocation.split('/').pop();
    if (!operationId) {
      throw new Error('Could not extract operation ID from Azure response');
    }
    
    // Poll for results
    let readResult = await this.azureVisionClient.getReadResult(operationId);
    while (readResult.status === 'notStarted' || readResult.status === 'running') {
      await new Promise(resolve => setTimeout(resolve, 100));
      readResult = await this.azureVisionClient.getReadResult(operationId);
    }
    
    if (readResult.status !== 'succeeded') {
      throw new Error('Azure OCR operation failed');
    }
    
    let fullText = '';
    let totalConfidence = 0;
    let wordCount = 0;
    const boundingBoxes: BoundingBox[] = [];
    
    readResult.analyzeResult?.readResults?.forEach(page => {
      page.lines?.forEach(line => {
        fullText += line.text + '\n';
        line.words?.forEach(word => {
          totalConfidence += word.confidence || 0;
          wordCount++;
          boundingBoxes.push({
            text: word.text || '',
            confidence: (word.confidence || 0) * 100,
            x: word.boundingBox?.[0] || 0,
            y: word.boundingBox?.[1] || 0,
            width: Math.abs((word.boundingBox?.[4] || 0) - (word.boundingBox?.[0] || 0)),
            height: Math.abs((word.boundingBox?.[5] || 0) - (word.boundingBox?.[1] || 0))
          });
        });
      });
    });
    
    const avgConfidence = wordCount > 0 ? (totalConfidence / wordCount) * 100 : 0;
    
    return {
      text: fullText.trim(),
      confidence: Math.max(avgConfidence, this.estimateConfidence(fullText)),
      pageCount: 1,
      processingMethod: 'azure-vision',
      processingTime: 0,
      boundingBoxes,
      provider: 'Azure Computer Vision'
    };
  }
  
  private async processWithTesseract(buffer: Buffer): Promise<EnhancedProcessingResult> {
    logger.info('🖼️ Processing with Enhanced Tesseract OCR...');
    
    // Apply multiple preprocessing techniques
    const preprocessingResults = await Promise.all([
      this.preprocessImage(buffer, 'medical'),
      this.preprocessImage(buffer, 'document'),
      this.preprocessImage(buffer, 'high-contrast')
    ]);
    
    // Try different PSM modes for better accuracy
    const psmModes = [6, 3, 4, 8, 13]; // Different page segmentation modes
    
    let bestResult = { text: '', confidence: 0 };
    
    for (const preprocessedBuffer of preprocessingResults) {
      for (const psm of psmModes) {
        try {
          const text = await tesseract.recognize(preprocessedBuffer, {
            ...this.tesseractConfig,
            psm
          });
          
          const confidence = this.estimateConfidence(text);
          
          if (confidence > bestResult.confidence) {
            bestResult = { text: text.trim(), confidence };
          }
        } catch (error) {
          logger.debug(`PSM ${psm} failed:`, error);
        }
      }
    }
    
    return {
      text: bestResult.text,
      confidence: bestResult.confidence,
      pageCount: 1,
      processingMethod: 'tesseract',
      processingTime: 0,
      provider: 'Tesseract OCR'
    };
  }
  
  private async preprocessImage(buffer: Buffer, mode: 'medical' | 'document' | 'high-contrast'): Promise<Buffer> {
    const sharpImage = sharp(buffer);
    
    switch (mode) {
      case 'medical':
        // Optimized for medical documents with tables and small text
        return await sharpImage
          .greyscale()
          .resize({ width: 3000, height: 3000, fit: 'inside', withoutEnlargement: true })
          .normalize()
          .sharpen({ sigma: 0.5, flat: 1, jagged: 2 })
          .gamma(0.8)
          .linear(1.2, -(128 * 1.2) + 128)
          .threshold(140)
          .median(1)
          .png({ quality: 100, compressionLevel: 0 })
          .toBuffer();
          
      case 'document':
        // General document processing
        return await sharpImage
          .greyscale()
          .resize({ width: 2400, withoutEnlargement: true })
          .normalize()
          .sharpen()
          .threshold(160)
          .png({ quality: 95 })
          .toBuffer();
          
      case 'high-contrast':
        // High contrast for difficult text
        return await sharpImage
          .greyscale()
          .resize({ width: 2800, withoutEnlargement: true })
          .normalize()
          .modulate({ brightness: 1.1, contrast: 1.3 })
          .sharpen({ sigma: 1.0, flat: 1, jagged: 2 })
          .threshold(120)
          .negate()
          .negate() // Double negate to clean up artifacts
          .png({ quality: 100 })
          .toBuffer();
          
      default:
        return buffer;
    }
  }
  
  private async processPDF(buffer: Buffer): Promise<EnhancedProcessingResult> {
    logger.info('📑 Processing PDF document...');
    
    const pdf = await pdfjs.getDocument({ data: buffer }).promise;
    const pageCount = pdf.numPages;
    logger.info(`📄 PDF has ${pageCount} pages`);
    
    let allText = '';
    let hasExtractableText = false;
    
    // Try to extract text directly
    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
        .trim();
      
      if (pageText.length > 0) {
        hasExtractableText = true;
        allText += pageText + '\n\n';
      }
    }
    
    if (hasExtractableText && allText.length > 100) {
      logger.info('✅ Extracted text directly from PDF');
      return {
        text: allText.trim(),
        confidence: 98,
        pageCount,
        processingMethod: 'pdf-text',
        processingTime: 0,
        provider: 'PDF.js Direct Text Extraction'
      };
    }
    
    // PDF has no extractable text - would need image rendering
    logger.warn('⚠️ PDF contains scanned images - would require PDF-to-image conversion for OCR');
    logger.info('💡 Consider uploading individual pages as images for better OCR results');
    
    return {
      text: allText.trim() || 'This PDF contains scanned images. Please upload individual pages as images (PNG/JPG) for OCR processing.',
      confidence: 20,
      pageCount,
      processingMethod: 'pdf-text',
      processingTime: 0,
      provider: 'PDF.js (Limited)'
    };
  }
  
  private estimateConfidence(text: string): number {
    if (!text || text.length === 0) return 0;
    
    let score = 50; // Base score
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;
    
    if (wordCount === 0) return 0;
    
    // Word length distribution
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / wordCount;
    if (avgWordLength >= 3 && avgWordLength <= 12) score += 15;
    
    // Medical/health terminology presence
    const medicalTerms = [
      'hemoglobin', 'glucose', 'cholesterol', 'blood', 'test', 'report', 'patient',
      'result', 'normal', 'abnormal', 'high', 'low', 'range', 'lab', 'laboratory',
      'serum', 'plasma', 'urine', 'creatinine', 'bilirubin', 'protein', 'albumin',
      'triglyceride', 'hdl', 'ldl', 'thyroid', 'tsh', 'vitamin', 'iron', 'calcium'
    ];
    
    const lowerText = text.toLowerCase();
    const foundMedicalTerms = medicalTerms.filter(term => lowerText.includes(term)).length;
    score += Math.min(foundMedicalTerms * 3, 20);
    
    // Numerical data presence (important for lab reports)
    const numbers = text.match(/\d+\.?\d*/g);
    const numberCount = numbers ? numbers.length : 0;
    if (numberCount > 5) score += 10;
    if (numberCount > 10) score += 5;
    
    // Units and ranges (medical context)
    const units = ['mg/dl', 'g/dl', 'mmol/l', 'u/l', '/ul', '%', 'mg/l'];
    const foundUnits = units.filter(unit => lowerText.includes(unit)).length;
    score += Math.min(foundUnits * 4, 15);
    
    // Proper capitalization
    const capitalizedWords = words.filter(w => w.length > 0 && w[0] === w[0].toUpperCase()).length;
    const capitalizationRatio = capitalizedWords / wordCount;
    if (capitalizationRatio >= 0.1 && capitalizationRatio <= 0.5) score += 8;
    
    // Text structure (lines, paragraphs)
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    if (lines.length > 5) score += 5;
    
    // Special characters that suggest structured data
    const structuralChars = ['-', ':', '(', ')', '[', ']', '|', '/'];
    const structuralCharCount = structuralChars.reduce((count, char) => 
      count + (text.match(new RegExp(`\\${char}`, 'g')) || []).length, 0
    );
    if (structuralCharCount > wordCount * 0.1) score += 8;
    
    return Math.min(Math.max(score, 0), 95);
  }
  
  extractHealthMetrics(text: string, boundingBoxes?: BoundingBox[]): HealthMetric[] {
    const metrics: HealthMetric[] = [];
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Enhanced patterns for different formats
    const patterns = [
      // Standard format: "Parameter 12.5 mg/dL (10.0-15.0)"
      /^([\w\s-]+?)\s+([\d.]+)\s*([a-zA-Z/%μµ°]+)\s*[\[(]?(?:[\d.-]+\s*[-–~]\s*)?([\d.-]+)[\])]?/,
      // Colon format: "Parameter: 12.5 mg/dL"
      /^([\w\s-]+?):\s*([\d.]+)\s*([a-zA-Z/%μµ°]+)/,
      // Dash format: "Parameter - 12.5 mg/dL"
      /^([\w\s-]+?)\s*[-–]\s*([\d.]+)\s*([a-zA-Z/%μµ°]+)/,
      // Range in brackets: "Parameter: 12.5 mg/dL [Normal: 10.0-15.0]"
      /^([\w\s-]+?):\s*([\d.]+)\s*([a-zA-Z/%μµ°]+)\s*\[(?:Normal|Ref|Reference):\s*([\d.-]+)\s*[-–~]\s*([\d.-]+)\]/i,
      // Table format with multiple spaces/tabs
      /^([\w\s-]+?)\s{2,}([\d.]+)\s+([a-zA-Z/%μµ°]+)/,
    ];
    
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          const [, name, valueStr, unit, ...ranges] = match;
          const value = parseFloat(valueStr);
          
          if (!isNaN(value) && name && unit) {
            const cleanName = name.trim().replace(/[^\w\s-]/g, '');
            const normalRange = ranges.filter(r => r && !isNaN(parseFloat(r))).map(r => parseFloat(r));
            
            // Find position from bounding boxes if available
            let position: { x: number; y: number } | undefined;
            if (boundingBoxes) {
              const relatedBox = boundingBoxes.find(box => 
                box.text.toLowerCase().includes(cleanName.toLowerCase()) ||
                box.text.includes(valueStr)
              );
              if (relatedBox) {
                position = { x: relatedBox.x, y: relatedBox.y };
              }
            }
            
            const metric: HealthMetric = {
              category: this.categorizeMetric(cleanName),
              metric: cleanName,
              value,
              unit: this.normalizeUnit(unit.trim()),
              flag: 'NORMAL',
              normalRange: normalRange.length >= 2 ? normalRange : undefined,
              confidence: this.calculateMetricConfidence(cleanName, value, unit),
              position
            };
            
            metric.flag = this.determineFlag(metric.metric.toLowerCase(), value, metric.normalRange);
            
            // Only add if confidence is reasonable and not duplicate
            if (metric.confidence > 40 && !metrics.some(m => 
              m.metric === metric.metric && Math.abs(m.value - metric.value) < 0.01
            )) {
              metrics.push(metric);
            }
            break;
          }
        }
      }
    }
    
    // Sort by confidence and return top results
    const sortedMetrics = metrics
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 50); // Limit to prevent overwhelming results
    
    logger.info(`📊 Extracted ${sortedMetrics.length} health metrics with enhanced parsing`);
    return sortedMetrics;
  }
  
  private calculateMetricConfidence(name: string, value: number, unit: string): number {
    let confidence = 70; // Base confidence
    
    // Check if name looks like a valid medical parameter
    const medicalPattern = /^[A-Za-z][A-Za-z0-9\s-]*$/;
    if (!medicalPattern.test(name)) confidence -= 20;
    
    // Check value reasonableness
    if (value <= 0 || value > 10000000) confidence -= 30;
    
    // Check unit validity
    const validUnits = ['mg/dl', 'g/dl', 'mmol/l', 'u/l', '/ul', '%', 'mg/l', 'ng/ml', 'pg/ml', 'iu/ml'];
    const unitValid = validUnits.some(validUnit => 
      unit.toLowerCase().includes(validUnit) || validUnit.includes(unit.toLowerCase())
    );
    if (!unitValid) confidence -= 15;
    
    // Known medical parameters boost confidence
    const knownParams = [
      'hemoglobin', 'glucose', 'cholesterol', 'creatinine', 'bilirubin',
      'protein', 'albumin', 'triglyceride', 'hdl', 'ldl', 'tsh', 'vitamin'
    ];
    const isKnown = knownParams.some(param => name.toLowerCase().includes(param));
    if (isKnown) confidence += 20;
    
    return Math.max(Math.min(confidence, 95), 0);
  }
  
  private normalizeUnit(unit: string): string {
    const unitMap: { [key: string]: string } = {
      'mg/dl': 'mg/dL',
      'g/dl': 'g/dL',
      'u/l': 'U/L',
      'iu/l': 'IU/L',
      '/ul': '/μL',
      '/μl': '/μL',
      'mmol/l': 'mmol/L',
      'ng/ml': 'ng/mL',
      'pg/ml': 'pg/mL',
      'mg/l': 'mg/L',
      'μg/l': 'μg/L',
      'copies/ml': 'copies/mL',
    };
    
    const normalized = unitMap[unit.toLowerCase()];
    return normalized || unit;
  }
  
  private categorizeMetric(metricName: string): string {
    const name = metricName.toLowerCase();
    
    const categories = {
      'Blood Count': ['hemoglobin', 'hb', 'hematocrit', 'hct', 'wbc', 'white blood', 'rbc', 'red blood', 'platelet', 'mcv', 'mch', 'mchc'],
      'Metabolism': ['glucose', 'sugar', 'hba1c', 'fasting', 'random', 'pp', 'insulin'],
      'Lipid Profile': ['cholesterol', 'hdl', 'ldl', 'triglyceride', 'vldl', 'lipid'],
      'Kidney Function': ['creatinine', 'urea', 'bun', 'egfr', 'microalbumin', 'protein/creatinine'],
      'Liver Function': ['alt', 'ast', 'sgpt', 'sgot', 'bilirubin', 'alkaline', 'phosphatase', 'ggt', 'alp'],
      'Thyroid': ['thyroid', 'tsh', 't3', 't4', 'ft3', 'ft4', 'anti-tpo', 'thyroglobulin'],
      'Vitamins & Minerals': ['vitamin', 'b12', 'd3', 'd2', 'folate', 'iron', 'ferritin', 'calcium', 'magnesium', 'phosphorus', 'zinc'],
      'Cardiac Markers': ['troponin', 'ck-mb', 'bnp', 'nt-probnp', 'myoglobin'],
      'Hormones': ['testosterone', 'estradiol', 'cortisol', 'prolactin', 'lh', 'fsh'],
      'Inflammatory': ['esr', 'crp', 'c-reactive', 'sed rate', 'rheumatoid', 'ana'],
      'Infectious Disease': ['hiv', 'hepatitis', 'hbsag', 'anti-hcv', 'vdrl', 'rpr'],
      'Tumor Markers': ['psa', 'cea', 'afp', 'ca-125', 'ca 19-9', 'ca 15-3']
    };
    
    for (const [category, terms] of Object.entries(categories)) {
      if (terms.some(term => name.includes(term))) {
        return category;
      }
    }
    
    return 'General';
  }
  
  private determineFlag(
    metricName: string, 
    value: number, 
    normalRange?: number[]
  ): 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL' {
    // Use provided normal range if available
    if (normalRange && normalRange.length >= 2) {
      const [min, max] = normalRange.sort((a, b) => a - b);
      if (value < min) return value < min * 0.7 ? 'CRITICAL' : 'LOW';
      if (value > max) return value > max * 1.5 ? 'CRITICAL' : 'HIGH';
      return 'NORMAL';
    }
    
    // Comprehensive reference ranges for common parameters
    const ranges: { [key: string]: { 
      min: number; 
      max: number; 
      critical?: { low: number; high: number };
      unit?: string;
    } } = {
      // Blood Count
      'hemoglobin': { min: 12.0, max: 16.0, critical: { low: 7.0, high: 20.0 } },
      'hematocrit': { min: 36.0, max: 48.0, critical: { low: 20.0, high: 60.0 } },
      'wbc': { min: 4000, max: 11000, critical: { low: 2000, high: 30000 } },
      'platelet': { min: 150000, max: 450000, critical: { low: 50000, high: 1000000 } },
      
      // Metabolism
      'glucose': { min: 70, max: 100, critical: { low: 40, high: 400 } },
      'hba1c': { min: 4.0, max: 5.6, critical: { low: 0, high: 15.0 } },
      
      // Lipids
      'cholesterol': { min: 0, max: 200, critical: { low: 0, high: 400 } },
      'hdl': { min: 40, max: 100, critical: { low: 20, high: 150 } },
      'ldl': { min: 0, max: 130, critical: { low: 0, high: 300 } },
      'triglyceride': { min: 0, max: 150, critical: { low: 0, high: 1000 } },
      
      // Kidney
      'creatinine': { min: 0.6, max: 1.2, critical: { low: 0.2, high: 10.0 } },
      'urea': { min: 7, max: 25, critical: { low: 0, high: 100 } },
      'bun': { min: 7, max: 25, critical: { low: 0, high: 100 } },
      
      // Liver
      'bilirubin': { min: 0.2, max: 1.2, critical: { low: 0, high: 20.0 } },
      'alt': { min: 7, max: 56, critical: { low: 0, high: 500 } },
      'ast': { min: 10, max: 40, critical: { low: 0, high: 500 } },
      
      // Thyroid
      'tsh': { min: 0.4, max: 4.0, critical: { low: 0, high: 100 } },
      
      // Vitamins
      'vitamin d': { min: 30, max: 100, critical: { low: 10, high: 150 } },
      'b12': { min: 200, max: 900, critical: { low: 100, high: 2000 } }
    };
    
    for (const [key, range] of Object.entries(ranges)) {
      if (metricName.includes(key)) {
        if (range.critical) {
          if (value < range.critical.low || value > range.critical.high) return 'CRITICAL';
        }
        if (value < range.min) return 'LOW';
        if (value > range.max) return 'HIGH';
        return 'NORMAL';
      }
    }
    
    return 'NORMAL';
  }
}