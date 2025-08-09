import tesseract from 'node-tesseract-ocr';
import * as pdfjs from 'pdfjs-dist';
import sharp from 'sharp';
import path from 'path';
import { logger } from '../../utils/logger';
import { AppError } from '../../middlewares/errorHandler';

// Configure PDF.js worker
const pdfjsWorkerPath = path.join(require.resolve('pdfjs-dist'), '../pdf.worker.min.mjs');
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorkerPath;

export interface ProcessingResult {
  text: string;
  confidence: number;
  pageCount: number;
  processingMethod: 'tesseract' | 'pdf-text' | 'combined';
  processingTime: number;
}

export interface HealthMetric {
  category: string;
  metric: string;
  value: number;
  unit: string;
  flag: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  normalRange?: number[];
}

export class OCRService {
  private static instance: OCRService;
  private tesseractConfig = {
    lang: 'eng',
    oem: 1,
    psm: 3,
    tessdataDir: process.platform === 'darwin' 
      ? '/opt/homebrew/share/tessdata' 
      : '/usr/share/tesseract-ocr/4.00/tessdata',
  };
  
  private constructor() {}
  
  static getInstance(): OCRService {
    if (!OCRService.instance) {
      OCRService.instance = new OCRService();
    }
    return OCRService.instance;
  }
  
  async initialize(): Promise<void> {
    try {
      // Test Tesseract availability
      await tesseract.recognize(
        Buffer.from('test'),
        { ...this.tesseractConfig, psm: 8 }
      ).catch(() => {});
      
      logger.info('✅ OCR service initialized');
    } catch (error) {
      logger.warn('⚠️ OCR service initialization warning:', error);
    }
  }
  
  async processDocument(
    buffer: Buffer,
    mimeType: string
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    logger.info(`📄 Processing document of type: ${mimeType}`);
    
    try {
      let result: ProcessingResult;
      
      if (mimeType === 'application/pdf') {
        result = await this.processPDF(buffer);
      } else if (mimeType.startsWith('image/')) {
        result = await this.processImage(buffer);
      } else {
        throw new AppError(`Unsupported file type: ${mimeType}`, 400);
      }
      
      result.processingTime = Date.now() - startTime;
      logger.info(`✅ Document processed in ${result.processingTime}ms`);
      
      return result;
    } catch (error) {
      logger.error('Document processing error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to process document', 500);
    }
  }
  
  private async processPDF(buffer: Buffer): Promise<ProcessingResult> {
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
        confidence: 95,
        pageCount,
        processingMethod: 'pdf-text',
        processingTime: 0
      };
    }
    
    // PDF has no extractable text - return partial result
    logger.warn('⚠️ PDF has no extractable text, OCR would require canvas dependency');
    logger.info('💡 Consider uploading images instead of scanned PDFs for OCR processing');
    
    return {
      text: allText.trim() || 'No text could be extracted from this PDF. Please try uploading individual pages as images.',
      confidence: 30,
      pageCount,
      processingMethod: 'pdf-text',
      processingTime: 0
    };
  }
  
  private async processImage(buffer: Buffer): Promise<ProcessingResult> {
    logger.info('🖼️ Processing image with OCR...');
    
    // Preprocess for better OCR
    const processedImage = await sharp(buffer)
      .greyscale()
      .normalize()
      .resize({ width: 2000, withoutEnlargement: true })
      .sharpen()
      .threshold(180)
      .png()
      .toBuffer();
    
    const text = await tesseract.recognize(processedImage, this.tesseractConfig);
    const confidence = this.estimateConfidence(text);
    
    logger.info(`✅ OCR completed with ${confidence.toFixed(1)}% confidence`);
    
    return {
      text: text.trim(),
      confidence,
      pageCount: 1,
      processingMethod: 'tesseract',
      processingTime: 0
    };
  }
  
  private estimateConfidence(text: string): number {
    if (!text || text.length === 0) return 0;
    
    let score = 70;
    const words = text.split(/\s+/);
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    
    if (avgWordLength >= 3 && avgWordLength <= 10) score += 10;
    
    const medicalTerms = ['hemoglobin', 'glucose', 'cholesterol', 'blood', 'test', 'report'];
    const foundTerms = medicalTerms.filter(term => text.toLowerCase().includes(term)).length;
    score += Math.min(foundTerms * 2, 10);
    
    const numbers = text.match(/\d+\.?\d*/g);
    if (numbers && numbers.length > 5) score += 5;
    
    const capitalizedWords = words.filter(w => w.length > 0 && w[0] === w[0].toUpperCase()).length;
    if (capitalizedWords / words.length > 0.1) score += 5;
    
    return Math.min(score, 95);
  }
  
  extractHealthMetrics(text: string): HealthMetric[] {
    const metrics: HealthMetric[] = [];
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    const patterns = [
      /^([\w\s]+?)\s+([\d.]+)\s*([a-zA-Z/%μµ]+)(?:\s*[\[(](?:[\d.-]+\s*[-–]\s*)?([\d.-]+)[\])])?/,
      /^([\w\s]+?):\s*([\d.]+)\s*([a-zA-Z/%μµ]+)/,
      /^([\w\s]+?)\s*[-–]\s*([\d.]+)\s*([a-zA-Z/%μµ]+)/,
      /^([\w\s]+?):\s*([\d.]+)\s*([a-zA-Z/%μµ]+)\s*\[Normal:\s*([\d.-]+)\s*[-–]\s*([\d.-]+)\]/i,
    ];
    
    for (const line of lines) {
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          const [, name, valueStr, unit, ...ranges] = match;
          const value = parseFloat(valueStr);
          
          if (!isNaN(value) && name && unit) {
            const metric: HealthMetric = {
              category: this.categorizeMetric(name),
              metric: name.trim(),
              value,
              unit: this.normalizeUnit(unit.trim()),
              flag: 'NORMAL',
              normalRange: ranges.filter(r => r).map(r => parseFloat(r)).filter(n => !isNaN(n))
            };
            
            metric.flag = this.determineFlag(metric.metric.toLowerCase(), value, metric.normalRange);
            metrics.push(metric);
            break;
          }
        }
      }
    }
    
    const uniqueMetrics = metrics.filter((metric, index, self) => 
      index === self.findIndex(m => m.metric === metric.metric && m.value === metric.value)
    );
    
    logger.info(`📊 Extracted ${uniqueMetrics.length} health metrics`);
    return uniqueMetrics;
  }
  
  private normalizeUnit(unit: string): string {
    const unitMap: { [key: string]: string } = {
      'mg/dl': 'mg/dL',
      'g/dl': 'g/dL',
      'u/l': 'U/L',
      '/ul': '/μL',
      '/μl': '/μL',
      'mmol/l': 'mmol/L',
    };
    
    return unitMap[unit.toLowerCase()] || unit;
  }
  
  private categorizeMetric(metricName: string): string {
    const name = metricName.toLowerCase();
    
    const categories = {
      'Blood Count': ['hemoglobin', 'hb', 'hematocrit', 'wbc', 'white blood', 'rbc', 'red blood', 'platelet'],
      'Metabolism': ['glucose', 'sugar', 'hba1c'],
      'Lipid Profile': ['cholesterol', 'hdl', 'ldl', 'triglyceride'],
      'Kidney Function': ['creatinine', 'urea', 'bun', 'egfr'],
      'Liver Function': ['alt', 'ast', 'sgpt', 'sgot', 'bilirubin', 'alkaline'],
      'Thyroid': ['thyroid', 'tsh', 't3', 't4'],
      'Vitamins': ['vitamin', 'b12', 'd3', 'folate'],
      'Iron Studies': ['iron', 'ferritin', 'tibc']
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
    if (normalRange && normalRange.length >= 2) {
      const [min, max] = normalRange;
      if (value < min) return value < min * 0.8 ? 'CRITICAL' : 'LOW';
      if (value > max) return value > max * 1.2 ? 'CRITICAL' : 'HIGH';
      return 'NORMAL';
    }
    
    const ranges: { [key: string]: { min: number; max: number; critical?: { low: number; high: number } } } = {
      'hemoglobin': { min: 12, max: 16, critical: { low: 8, high: 20 } },
      'glucose': { min: 70, max: 100, critical: { low: 50, high: 300 } },
      'cholesterol': { min: 0, max: 200, critical: { low: 0, high: 300 } },
      'creatinine': { min: 0.6, max: 1.2, critical: { low: 0.3, high: 3.0 } },
      'wbc': { min: 4000, max: 11000, critical: { low: 2000, high: 20000 } },
      'platelet': { min: 150000, max: 450000, critical: { low: 50000, high: 800000 } }
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