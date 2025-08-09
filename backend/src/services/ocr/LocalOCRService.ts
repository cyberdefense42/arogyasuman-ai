import tesseract from 'node-tesseract-ocr';
import sharp from 'sharp';
// import * as pdfjs from 'pdfjs-dist/legacy/build/pdf';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';
import { logger } from '../../utils/logger';

const execPromise = promisify(exec);

// Enhanced result types
export interface HealthMetric {
  category: string;
  metric: string;
  value: number;
  unit: string;
  flag: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  normalRange?: number[];
  confidence: number;
  extractionMethod?: string;
}

export interface LocalProcessingResult {
  text: string;
  confidence: number;
  pageCount: number;
  processingMethod: string;
  processingTime: number;
  provider: string;
  healthMetrics?: HealthMetric[];
  structuredData?: any;
  preprocessingUsed?: string[];
  alternativeResults?: AlternativeResult[];
}

interface AlternativeResult {
  text: string;
  confidence: number;
  method: string;
  processingTime: number;
}

interface PreprocessingConfig {
  resize?: {
    width?: number;
    height?: number;
    fit?: 'inside' | 'outside' | 'cover' | 'contain' | 'fill';
    withoutEnlargement?: boolean;
  };
  greyscale?: boolean;
  normalize?: boolean;
  sharpen?: boolean | { sigma?: number; flat?: number; jagged?: number };
  gamma?: number;
  linear?: { a: number; b: number };
  threshold?: number;
  median?: number;
  modulate?: { brightness?: number; contrast?: number; saturation?: number; hue?: number };
  negate?: boolean;
  morphology?: { operation: string; kernel: string; size: number };
}

/**
 * LocalOCRService - Comprehensive local OCR processing with multiple engines
 * 
 * Features:
 * - Tesseract OCR with advanced preprocessing
 * - EasyOCR integration (if available)
 * - PaddleOCR integration (if available)
 * - Ensemble mode for best accuracy
 * - Medical document optimization
 * - PDF text extraction and OCR
 * - Structured health data extraction
 */
export class LocalOCRService {
  private static instance: LocalOCRService;
  
  private tesseractConfig = {
    lang: 'eng',
    oem: 1,
    psm: 6,
  };

  private easyOCRAvailable = false;
  private paddleOCRAvailable = false;

  constructor() {
    this.checkAvailableEngines();
  }

  static getInstance(): LocalOCRService {
    if (!LocalOCRService.instance) {
      LocalOCRService.instance = new LocalOCRService();
    }
    return LocalOCRService.instance;
  }

  async initialize(): Promise<void> {
    logger.info('🔧 Initializing LocalOCRService...');
    await this.checkAvailableEngines();
    logger.info('✅ LocalOCRService initialized');
  }

  private async checkAvailableEngines() {
    // Check EasyOCR availability
    try {
      await execPromise('python3 -c "import easyocr; print(\'EasyOCR available\')"');
      this.easyOCRAvailable = true;
      logger.info('✅ EasyOCR is available');
    } catch (error) {
      logger.info('ℹ️ EasyOCR not available - install with: pip install easyocr');
    }

    // Check PaddleOCR availability
    try {
      await execPromise('python3 -c "import paddleocr; print(\'PaddleOCR available\')"');
      this.paddleOCRAvailable = true;
      logger.info('✅ PaddleOCR is available');
    } catch (error) {
      logger.info('ℹ️ PaddleOCR not available - install with: pip install paddleocr');
    }

    if (!this.easyOCRAvailable && !this.paddleOCRAvailable) {
      logger.info('ℹ️ Using Tesseract OCR only. For better accuracy, install EasyOCR or PaddleOCR:');
      logger.info('   pip install easyocr');
      logger.info('   pip install paddleocr');
    }
  }

  async processDocument(buffer: Buffer, options?: {
    preferredEngine?: 'tesseract' | 'easyocr' | 'paddleocr' | 'ensemble';
    enhancedPreprocessing?: boolean;
    extractHealthMetrics?: boolean;
  }): Promise<LocalProcessingResult> {
    const startTime = Date.now();

    try {
      // Detect if it's a PDF - temporarily disabled
      // const isPDF = buffer.slice(0, 4).toString() === '%PDF';
      
      let result: LocalProcessingResult;

      // Temporarily disable PDF processing due to library issues
      // if (isPDF) {
      //   result = await this.processPDF(buffer);
      // } else {
        result = await this.processImageWithBestEngine(buffer, options);
      // }

      // Extract health metrics if requested
      if (options?.extractHealthMetrics && result.text.length > 50) {
        try {
          result.healthMetrics = this.extractHealthMetrics(result.text);
          logger.info(`📊 Extracted ${result.healthMetrics.length} health metrics`);
        } catch (error) {
          logger.warn('Failed to extract health metrics:', error);
        }
      }

      const totalTime = Date.now() - startTime;
      logger.info(`✅ Document processed in ${totalTime}ms using ${result.provider}`);
      
      return {
        ...result,
        processingTime: totalTime
      };

    } catch (error) {
      logger.error('❌ Document processing failed:', error);
      throw new Error(`OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async processImageWithBestEngine(
    buffer: Buffer,
    options?: {
      preferredEngine?: 'tesseract' | 'easyocr' | 'paddleocr' | 'ensemble';
      enhancedPreprocessing?: boolean;
    }
  ): Promise<LocalProcessingResult> {
    const startTime = Date.now();
    const preferredEngine = options?.preferredEngine || 'ensemble';
    const useEnhancedPreprocessing = options?.enhancedPreprocessing !== false;
    
    const results: AlternativeResult[] = [];
    
    // If ensemble mode, try all available engines
    if (preferredEngine === 'ensemble') {
      // Enhanced Tesseract
      try {
        const tesseractResult = await this.processWithEnhancedTesseract(buffer, useEnhancedPreprocessing);
        results.push({
          text: tesseractResult.text,
          confidence: tesseractResult.confidence,
          method: 'tesseract-enhanced',
          processingTime: tesseractResult.processingTime
        });
      } catch (error) {
        logger.warn('Enhanced Tesseract failed:', error);
      }
      
      // EasyOCR if available
      if (this.easyOCRAvailable) {
        try {
          const easyResult = await this.processWithEasyOCR(buffer);
          results.push({
            text: easyResult.text,
            confidence: easyResult.confidence,
            method: 'easyocr',
            processingTime: easyResult.processingTime
          });
        } catch (error) {
          logger.warn('EasyOCR failed:', error);
        }
      }
      
      // PaddleOCR if available
      if (this.paddleOCRAvailable) {
        try {
          const paddleResult = await this.processWithPaddleOCR(buffer);
          results.push({
            text: paddleResult.text,
            confidence: paddleResult.confidence,
            method: 'paddleocr',
            processingTime: paddleResult.processingTime
          });
        } catch (error) {
          logger.warn('PaddleOCR failed:', error);
        }
      }
      
      // Select best result
      if (results.length === 0) {
        throw new Error('All OCR engines failed');
      }
      
      const bestResult = results.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      );
      
      return {
        text: bestResult.text,
        confidence: bestResult.confidence,
        pageCount: 1,
        processingMethod: 'ensemble',
        processingTime: Date.now() - startTime,
        provider: `Best of ${results.length} engines`,
        alternativeResults: results.filter(r => r !== bestResult)
      };
    } else {
      // Single engine mode
      switch (preferredEngine) {
        case 'easyocr':
          if (this.easyOCRAvailable) {
            return await this.processWithEasyOCR(buffer);
          }
          logger.warn('EasyOCR not available, falling back to Tesseract');
          return await this.processWithEnhancedTesseract(buffer, useEnhancedPreprocessing);
        case 'paddleocr':
          if (this.paddleOCRAvailable) {
            return await this.processWithPaddleOCR(buffer);
          }
          logger.warn('PaddleOCR not available, falling back to Tesseract');
          return await this.processWithEnhancedTesseract(buffer, useEnhancedPreprocessing);
        case 'tesseract':
        default:
          return await this.processWithEnhancedTesseract(buffer, useEnhancedPreprocessing);
      }
    }
  }
  
  private async processWithEnhancedTesseract(
    buffer: Buffer,
    useEnhancedPreprocessing: boolean = true
  ): Promise<LocalProcessingResult> {
    logger.info('🖼️ Processing with Enhanced Tesseract OCR...');
    const startTime = Date.now();
    
    let bestResult = { text: '', confidence: 0, preprocessing: '' };
    const preprocessingMethods: string[] = [];
    
    if (useEnhancedPreprocessing) {
      // Try different preprocessing approaches
      const preprocessingConfigs = [
        { name: 'medical-optimized', config: this.getMedicalPreprocessing() },
        { name: 'high-contrast', config: this.getHighContrastPreprocessing() },
        { name: 'table-optimized', config: this.getTablePreprocessing() },
        { name: 'clean-document', config: this.getCleanDocumentPreprocessing() }
      ];
      
      for (const { name, config } of preprocessingConfigs) {
        try {
          const preprocessedBuffer = await this.applyPreprocessing(buffer, config);
          preprocessingMethods.push(name);
          
          // Try different PSM modes with this preprocessing
          const psmModes = [6, 3, 4, 8, 13]; // Different page segmentation modes
          
          for (const psm of psmModes) {
            try {
              const text = await tesseract.recognize(preprocessedBuffer, {
                ...this.tesseractConfig,
                psm,
                // Additional Tesseract parameters for better accuracy
                c: {
                  tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,():/%- ',
                  preserve_interword_spaces: '1'
                }
              });
              
              const confidence = this.estimateConfidence(text);
              
              if (confidence > bestResult.confidence) {
                bestResult = { 
                  text: text.trim(), 
                  confidence, 
                  preprocessing: `${name}-psm${psm}` 
                };
              }
            } catch (error) {
              logger.debug(`PSM ${psm} with ${name} failed:`, error);
            }
          }
        } catch (error) {
          logger.debug(`Preprocessing ${name} failed:`, error);
        }
      }
    } else {
      // Basic processing without intensive preprocessing
      const text = await tesseract.recognize(buffer, this.tesseractConfig);
      bestResult = {
        text: text.trim(),
        confidence: this.estimateConfidence(text),
        preprocessing: 'basic'
      };
    }
    
    return {
      text: bestResult.text,
      confidence: bestResult.confidence,
      pageCount: 1,
      processingMethod: 'tesseract-enhanced',
      processingTime: Date.now() - startTime,
      provider: 'Enhanced Tesseract OCR',
      preprocessingUsed: preprocessingMethods
    };
  }
  
  private async processWithEasyOCR(buffer: Buffer): Promise<LocalProcessingResult> {
    if (!this.easyOCRAvailable) {
      throw new Error('EasyOCR not available');
    }
    
    logger.info('🔍 Processing with EasyOCR...');
    const startTime = Date.now();
    
    // Save buffer to temporary file
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `ocr-temp-${Date.now()}.png`);
    
    try {
      // Preprocess image for EasyOCR
      const processedBuffer = await this.applyPreprocessing(buffer, this.getMedicalPreprocessing());
      await fs.writeFile(tempFile, processedBuffer);
      
      // Create Python script for EasyOCR
      const pythonScript = `
import easyocr
import json
import sys

try:
    reader = easyocr.Reader(['en'], gpu=False)  # CPU only for compatibility
    results = reader.readtext('${tempFile}')
    
    # Extract text and confidence
    text_parts = []
    confidences = []
    
    for (bbox, text, confidence) in results:
        text_parts.append(text)
        confidences.append(confidence)
    
    full_text = ' '.join(text_parts)
    avg_confidence = sum(confidences) / len(confidences) if confidences else 0
    
    output = {
        'text': full_text,
        'confidence': avg_confidence * 100
    }
    
    print(json.dumps(output))
except Exception as e:
    print(json.dumps({'error': str(e)}), file=sys.stderr)
    sys.exit(1)
`;
      
      const { stdout } = await execPromise(`python3 -c "${pythonScript}"`);
      const result = JSON.parse(stdout.trim());
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      return {
        text: result.text,
        confidence: Math.max(result.confidence, this.estimateConfidence(result.text)),
        pageCount: 1,
        processingMethod: 'easyocr',
        processingTime: Date.now() - startTime,
        provider: 'EasyOCR'
      };
    } finally {
      // Clean up temp file
      try {
        await fs.unlink(tempFile);
      } catch (error) {
        logger.debug('Failed to clean up temp file:', error);
      }
    }
  }
  
  private async processWithPaddleOCR(buffer: Buffer): Promise<LocalProcessingResult> {
    if (!this.paddleOCRAvailable) {
      throw new Error('PaddleOCR not available');
    }
    
    logger.info('🔍 Processing with PaddleOCR...');
    const startTime = Date.now();
    
    // Save buffer to temporary file
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `ocr-temp-${Date.now()}.png`);
    
    try {
      // Preprocess image for PaddleOCR
      const processedBuffer = await this.applyPreprocessing(buffer, this.getMedicalPreprocessing());
      await fs.writeFile(tempFile, processedBuffer);
      
      // Create Python script for PaddleOCR
      const pythonScript = `
from paddleocr import PaddleOCR
import json
import sys

try:
    ocr = PaddleOCR(use_angle_cls=True, lang='en', use_gpu=False)
    results = ocr.ocr('${tempFile}', cls=True)
    
    # Extract text and confidence
    text_parts = []
    confidences = []
    
    for line in results:
        for word_info in line:
            text = word_info[1][0]
            confidence = word_info[1][1]
            text_parts.append(text)
            confidences.append(confidence)
    
    full_text = ' '.join(text_parts)
    avg_confidence = sum(confidences) / len(confidences) if confidences else 0
    
    output = {
        'text': full_text,
        'confidence': avg_confidence * 100
    }
    
    print(json.dumps(output))
except Exception as e:
    print(json.dumps({'error': str(e)}), file=sys.stderr)
    sys.exit(1)
`;
      
      const { stdout } = await execPromise(`python3 -c "${pythonScript}"`);
      const result = JSON.parse(stdout.trim());
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      return {
        text: result.text,
        confidence: Math.max(result.confidence, this.estimateConfidence(result.text)),
        pageCount: 1,
        processingMethod: 'paddleocr',
        processingTime: Date.now() - startTime,
        provider: 'PaddleOCR'
      };
    } finally {
      // Clean up temp file
      try {
        await fs.unlink(tempFile);
      } catch (error) {
        logger.debug('Failed to clean up temp file:', error);
      }
    }
  }
  
  private getMedicalPreprocessing(): PreprocessingConfig {
    return {
      resize: { width: 3000, height: 3000, fit: 'inside' as const, withoutEnlargement: true },
      greyscale: true,
      normalize: true,
      sharpen: { sigma: 0.5, flat: 1, jagged: 2 },
      gamma: 0.8,
      linear: { a: 1.2, b: -(128 * 1.2) + 128 },
      threshold: 140,
      median: 1
    };
  }
  
  private getHighContrastPreprocessing(): PreprocessingConfig {
    return {
      resize: { width: 2800, withoutEnlargement: true },
      greyscale: true,
      normalize: true,
      modulate: { brightness: 1.2, contrast: 1.4 },
      sharpen: { sigma: 1.0, flat: 1, jagged: 2 },
      threshold: 120
    };
  }
  
  private getTablePreprocessing(): PreprocessingConfig {
    return {
      resize: { width: 3500, height: 3500, fit: 'inside' as const, withoutEnlargement: true },
      greyscale: true,
      normalize: true,
      sharpen: { sigma: 0.3, flat: 1, jagged: 1.5 },
      threshold: 160,
      morphology: { operation: 'open', kernel: 'square', size: 1 }
    };
  }
  
  private getCleanDocumentPreprocessing(): PreprocessingConfig {
    return {
      resize: { width: 2400, withoutEnlargement: true },
      greyscale: true,
      normalize: true,
      sharpen: true,
      threshold: 180
    };
  }
  
  private async applyPreprocessing(buffer: Buffer, config: PreprocessingConfig): Promise<Buffer> {
    let sharpImage = sharp(buffer);
    
    if (config.resize) {
      sharpImage = sharpImage.resize(config.resize);
    }
    
    if (config.greyscale) {
      sharpImage = sharpImage.greyscale();
    }
    
    if (config.normalize) {
      sharpImage = sharpImage.normalize();
    }
    
    if (config.modulate) {
      sharpImage = sharpImage.modulate(config.modulate);
    }
    
    if (config.sharpen) {
      if (typeof config.sharpen === 'object') {
        sharpImage = sharpImage.sharpen(config.sharpen.sigma, config.sharpen.flat, config.sharpen.jagged);
      } else {
        sharpImage = sharpImage.sharpen();
      }
    }
    
    if (config.gamma) {
      sharpImage = sharpImage.gamma(config.gamma);
    }
    
    if (config.linear) {
      sharpImage = sharpImage.linear(config.linear.a, config.linear.b);
    }
    
    if (config.threshold) {
      sharpImage = sharpImage.threshold(config.threshold);
    }
    
    if (config.median) {
      sharpImage = sharpImage.median(config.median);
    }
    
    if (config.negate) {
      sharpImage = sharpImage.negate();
    }
    
    return await sharpImage.png({ quality: 100, compressionLevel: 0 }).toBuffer();
  }
  
  private async processPDF(buffer: Buffer): Promise<LocalProcessingResult> {
    logger.info('📑 Processing PDF document...');
    logger.warn('⚠️ PDF processing temporarily disabled - please convert to images');
    
    return {
      text: 'PDF processing is temporarily disabled due to library compatibility issues. Please convert your PDF pages to individual images (PNG/JPG) and upload them for OCR processing.',
      confidence: 0,
      pageCount: 1,
      processingMethod: 'pdf-disabled',
      processingTime: 0,
      provider: 'PDF Processing Disabled'
    };
  }
  
  private estimateConfidence(text: string): number {
    if (!text || text.length === 0) return 0;
    
    let score = 40; // Lower base score for more conservative estimates
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;
    
    if (wordCount === 0) return 0;

    // Word count and length analysis
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / wordCount;
    if (avgWordLength >= 3 && avgWordLength <= 12) score += 15;
    if (wordCount > 10) score += 10;
    if (wordCount > 50) score += 5;
    
    // Medical/health terminology presence (critical for medical documents)
    const medicalTerms = [
      'hemoglobin', 'glucose', 'cholesterol', 'blood', 'test', 'report', 'patient',
      'result', 'normal', 'abnormal', 'high', 'low', 'range', 'lab', 'laboratory',
      'serum', 'plasma', 'urine', 'creatinine', 'bilirubin', 'protein', 'albumin',
      'triglyceride', 'hdl', 'ldl', 'thyroid', 'tsh', 'vitamin', 'iron', 'calcium',
      'mg/dl', 'g/dl', 'mmol/l', 'u/l', 'reference', 'value', 'level'
    ];
    
    const lowerText = text.toLowerCase();
    const foundMedicalTerms = medicalTerms.filter(term => lowerText.includes(term)).length;
    score += Math.min(foundMedicalTerms * 4, 25);
    
    // Numerical data presence (crucial for lab reports)
    const numbers = text.match(/\d+\.?\d*/g);
    const numberCount = numbers ? numbers.length : 0;
    if (numberCount > 3) score += 8;
    if (numberCount > 8) score += 7;
    if (numberCount > 15) score += 5;
    
    // Units and measurements
    const units = ['mg/dl', 'g/dl', 'mmol/l', 'u/l', '/ul', '%', 'mg/l', 'ng/ml', 'pg/ml', 'iu/ml', 'miu/ml'];
    const foundUnits = units.filter(unit => lowerText.includes(unit)).length;
    score += Math.min(foundUnits * 5, 20);
    
    // Structural elements (colons, parentheses, ranges)
    const structuralChars = ['-', ':', '(', ')', '[', ']', '|', '/'];
    const structuralCharCount = structuralChars.reduce((count, char) => 
      count + (text.match(new RegExp(`\\${char}`, 'g')) || []).length, 0
    );
    if (structuralCharCount > wordCount * 0.05) score += 8;
    
    // Proper capitalization patterns
    const capitalizedWords = words.filter(w => w.length > 0 && w[0] === w[0].toUpperCase()).length;
    const capitalizationRatio = capitalizedWords / wordCount;
    if (capitalizationRatio >= 0.1 && capitalizationRatio <= 0.6) score += 6;
    
    // Sentence structure
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    if (sentences.length > 2) score += 5;
    
    // Penalize obviously corrupted text
    const corruptionIndicators = ['###', '|||', '???', 'xxx', '***'];
    const corruptionCount = corruptionIndicators.reduce((count, indicator) => 
      count + (lowerText.includes(indicator) ? 1 : 0), 0
    );
    score -= corruptionCount * 10;
    
    // Penalize excessive special characters
    const specialCharRatio = (text.match(/[^a-zA-Z0-9\s.,():/%\-]/g) || []).length / text.length;
    if (specialCharRatio > 0.1) score -= 15;
    
    return Math.max(Math.min(score, 95), 0);
  }
  
  // Enhanced health metrics extraction with multiple parsing strategies
  extractHealthMetrics(text: string): HealthMetric[] {
    const metrics: HealthMetric[] = [];
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Multiple parsing patterns for different document formats
    const patterns = [
      // Standard: "Hemoglobin 12.5 g/dL (12.0-15.0)"
      {
        regex: /^([A-Za-z][\w\s-]+?)\s+(\d+\.?\d*)\s*([a-zA-Z/%μµ°]+)\s*[\[(]?(?:[\d.-]+\s*[-–~]\s*)?(\d+\.?\d*)\s*[-–~]\s*(\d+\.?\d*)[\])]?/,
        method: 'standard-with-range'
      },
      // Colon format: "Glucose: 85 mg/dL"
      {
        regex: /^([A-Za-z][\w\s-]+?):\s*(\d+\.?\d*)\s*([a-zA-Z/%μµ°]+)/,
        method: 'colon-format'
      },
      // Table format: "Parameter    Value    Unit    Reference"
      {
        regex: /^([A-Za-z][\w\s-]+?)\s{2,}(\d+\.?\d*)\s+([a-zA-Z/%μµ°]+)\s+([\d.-]+)\s*[-–~]\s*([\d.-]+)/,
        method: 'table-format'
      },
      // Range in brackets: "Creatinine: 0.9 mg/dL [0.6-1.2]"
      {
        regex: /^([A-Za-z][\w\s-]+?):\s*(\d+\.?\d*)\s*([a-zA-Z/%μµ°]+)\s*\[([\d.-]+)\s*[-–~]\s*([\d.-]+)\]/,
        method: 'bracketed-range'
      },
      // Simple value: "Total Cholesterol 195"
      {
        regex: /^([A-Za-z][\w\s-]+?)\s+(\d+\.?\d*)(?:\s*([a-zA-Z/%μµ°]+))?/,
        method: 'simple-value'
      }
    ];
    
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      
      for (const { regex, method } of patterns) {
        const match = line.match(regex);
        if (match) {
          const extractedMetric = this.parseMetricMatch(match, method);
          if (extractedMetric) {
            // Avoid duplicates
            const isDuplicate = metrics.some(m => 
              m.metric.toLowerCase() === extractedMetric.metric.toLowerCase() &&
              Math.abs(m.value - extractedMetric.value) < 0.01
            );
            
            if (!isDuplicate && extractedMetric.confidence > 50) {
              metrics.push(extractedMetric);
              break; // Found a match, try next line
            }
          }
        }
      }
    }
    
    // Sort by confidence and limit results
    const sortedMetrics = metrics
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 100); // Reasonable limit
    
    logger.info(`📊 Extracted ${sortedMetrics.length} health metrics using enhanced parsing`);
    return sortedMetrics;
  }
  
  private parseMetricMatch(match: RegExpMatchArray, method: string): HealthMetric | null {
    try {
      const [, name, valueStr, unit, ...ranges] = match;
      const value = parseFloat(valueStr);
      
      if (isNaN(value) || !name || value <= 0) {
        return null;
      }
      
      const cleanName = name.trim().replace(/[^\w\s-]/g, '');
      const cleanUnit = unit ? this.normalizeUnit(unit.trim()) : '';
      
      // Parse normal range if available
      let normalRange: number[] | undefined;
      const numericRanges = ranges.filter(r => r && !isNaN(parseFloat(r))).map(r => parseFloat(r));
      if (numericRanges.length >= 2) {
        normalRange = [Math.min(...numericRanges), Math.max(...numericRanges)];
      }
      
      const metric: HealthMetric = {
        category: this.categorizeMetric(cleanName),
        metric: cleanName,
        value,
        unit: cleanUnit,
        flag: 'NORMAL',
        normalRange,
        confidence: this.calculateMetricConfidence(cleanName, value, cleanUnit, method),
        extractionMethod: method
      };
      
      metric.flag = this.determineFlag(metric.metric.toLowerCase(), value, normalRange);
      
      return metric;
    } catch (error) {
      logger.debug('Failed to parse metric match:', error);
      return null;
    }
  }
  
  private calculateMetricConfidence(
    name: string, 
    value: number, 
    unit: string, 
    method: string
  ): number {
    let confidence = 60; // Base confidence
    
    // Method-based confidence adjustment
    const methodConfidence = {
      'standard-with-range': 90,
      'table-format': 85,
      'bracketed-range': 88,
      'colon-format': 75,
      'simple-value': 60
    };
    confidence = methodConfidence[method as keyof typeof methodConfidence] || 60;
    
    // Name validation
    if (!/^[A-Za-z][A-Za-z0-9\s-]*$/.test(name)) confidence -= 25;
    if (name.length < 3 || name.length > 30) confidence -= 10;
    
    // Value reasonableness
    if (value > 0 && value < 1000000) confidence += 5;
    if (value <= 0 || value > 10000000) confidence -= 30;
    
    // Unit validation
    if (unit) {
      const validUnits = [
        'mg/dl', 'g/dl', 'mmol/l', 'u/l', 'iu/l', '/ul', '%', 'mg/l', 
        'ng/ml', 'pg/ml', 'mg', 'g', 'ml', 'l', 'cells', 'count'
      ];
      const hasValidUnit = validUnits.some(validUnit => 
        unit.toLowerCase().includes(validUnit) || validUnit.includes(unit.toLowerCase())
      );
      if (hasValidUnit) confidence += 10;
      else confidence -= 15;
    } else {
      confidence -= 10; // Missing unit
    }
    
    // Known medical parameters get confidence boost
    const knownParams = [
      'hemoglobin', 'glucose', 'cholesterol', 'creatinine', 'bilirubin',
      'protein', 'albumin', 'triglyceride', 'hdl', 'ldl', 'tsh', 'alt', 'ast',
      'platelet', 'wbc', 'rbc', 'hematocrit', 'iron', 'ferritin', 'vitamin'
    ];
    const isKnown = knownParams.some(param => name.toLowerCase().includes(param));
    if (isKnown) confidence += 15;
    
    return Math.max(Math.min(confidence, 95), 0);
  }
  
  private normalizeUnit(unit: string): string {
    const unitMap: { [key: string]: string } = {
      'mg/dl': 'mg/dL',
      'g/dl': 'g/dL',
      'u/l': 'U/L',
      'iu/l': 'IU/L',
      'miu/l': 'mIU/L',
      '/ul': '/μL',
      '/μl': '/μL',
      'mmol/l': 'mmol/L',
      'ng/ml': 'ng/mL',
      'pg/ml': 'pg/mL',
      'mg/l': 'mg/L',
      'μg/l': 'μg/L',
      'copies/ml': 'copies/mL',
      'cells/μl': 'cells/μL'
    };
    
    return unitMap[unit.toLowerCase()] || unit;
  }
  
  private categorizeMetric(metricName: string): string {
    const name = metricName.toLowerCase();
    
    const categories = {
      'Complete Blood Count': [
        'hemoglobin', 'hb', 'hematocrit', 'hct', 'wbc', 'white blood', 'rbc', 
        'red blood', 'platelet', 'mcv', 'mch', 'mchc', 'rdw', 'mpv'
      ],
      'Blood Sugar': [
        'glucose', 'sugar', 'hba1c', 'fasting', 'random', 'pp', 'insulin',
        'c-peptide', 'fructosamine'
      ],
      'Lipid Profile': [
        'cholesterol', 'hdl', 'ldl', 'triglyceride', 'vldl', 'lipid', 
        'apolipoprotein', 'lipoprotein'
      ],
      'Kidney Function': [
        'creatinine', 'urea', 'bun', 'egfr', 'microalbumin', 'protein/creatinine',
        'albumin/creatinine', 'cystatin'
      ],
      'Liver Function': [
        'alt', 'ast', 'sgpt', 'sgot', 'bilirubin', 'alkaline', 'phosphatase', 
        'ggt', 'alp', 'ldh', 'albumin', 'globulin'
      ],
      'Thyroid Function': [
        'thyroid', 'tsh', 't3', 't4', 'ft3', 'ft4', 'anti-tpo', 'thyroglobulin',
        'reverse t3', 'rt3'
      ],
      'Vitamins & Minerals': [
        'vitamin', 'b12', 'd3', 'd2', 'd', 'folate', 'iron', 'ferritin', 'tibc',
        'calcium', 'magnesium', 'phosphorus', 'zinc', 'copper', 'selenium'
      ],
      'Cardiac Markers': [
        'troponin', 'ck-mb', 'bnp', 'nt-probnp', 'myoglobin', 'homocysteine'
      ],
      'Hormones': [
        'testosterone', 'estradiol', 'cortisol', 'prolactin', 'lh', 'fsh',
        'progesterone', 'dhea', 'growth hormone'
      ],
      'Inflammatory Markers': [
        'esr', 'crp', 'c-reactive', 'sed rate', 'rheumatoid', 'ana',
        'complement', 'procalcitonin'
      ],
      'Coagulation': [
        'pt', 'ptt', 'inr', 'aptt', 'fibrinogen', 'd-dimer'
      ],
      'Electrolytes': [
        'sodium', 'potassium', 'chloride', 'co2', 'bicarbonate', 'anion gap'
      ],
      'Tumor Markers': [
        'psa', 'cea', 'afp', 'ca-125', 'ca 19-9', 'ca 15-3', 'beta-hcg'
      ]
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
      if (value < min) return value < min * 0.6 ? 'CRITICAL' : 'LOW';
      if (value > max) return value > max * 1.8 ? 'CRITICAL' : 'HIGH';
      return 'NORMAL';
    }
    
    // Comprehensive reference ranges (these are typical adult reference ranges)
    const ranges: { [key: string]: { 
      min: number; 
      max: number; 
      critical?: { low: number; high: number };
    } } = {
      // Blood Count
      'hemoglobin': { min: 12.0, max: 16.0, critical: { low: 6.0, high: 20.0 } },
      'hematocrit': { min: 36.0, max: 48.0, critical: { low: 18.0, high: 60.0 } },
      'wbc': { min: 4000, max: 11000, critical: { low: 1000, high: 50000 } },
      'rbc': { min: 4.2, max: 5.8, critical: { low: 2.0, high: 8.0 } },
      'platelet': { min: 150000, max: 450000, critical: { low: 20000, high: 1000000 } },
      
      // Blood Sugar
      'glucose': { min: 70, max: 100, critical: { low: 30, high: 500 } },
      'hba1c': { min: 4.0, max: 5.6, critical: { low: 0, high: 18.0 } },
      
      // Lipids
      'cholesterol': { min: 100, max: 200, critical: { low: 50, high: 500 } },
      'hdl': { min: 40, max: 100, critical: { low: 15, high: 150 } },
      'ldl': { min: 50, max: 130, critical: { low: 20, high: 400 } },
      'triglyceride': { min: 50, max: 150, critical: { low: 20, high: 2000 } },
      
      // Kidney Function
      'creatinine': { min: 0.6, max: 1.3, critical: { low: 0.2, high: 15.0 } },
      'urea': { min: 7, max: 25, critical: { low: 0, high: 150 } },
      'bun': { min: 7, max: 25, critical: { low: 0, high: 150 } },
      
      // Liver Function
      'bilirubin': { min: 0.2, max: 1.2, critical: { low: 0, high: 25.0 } },
      'alt': { min: 7, max: 56, critical: { low: 0, high: 1000 } },
      'ast': { min: 10, max: 40, critical: { low: 0, high: 1000 } },
      'albumin': { min: 3.5, max: 5.0, critical: { low: 1.5, high: 7.0 } },
      
      // Thyroid
      'tsh': { min: 0.4, max: 4.5, critical: { low: 0, high: 50.0 } },
      't4': { min: 4.5, max: 12.0, critical: { low: 1.0, high: 25.0 } },
      't3': { min: 80, max: 200, critical: { low: 30, high: 500 } },
      
      // Vitamins
      'vitamin d': { min: 30, max: 100, critical: { low: 5, high: 200 } },
      'b12': { min: 200, max: 900, critical: { low: 50, high: 2000 } },
      'folate': { min: 2.7, max: 17.0, critical: { low: 1.0, high: 50.0 } },
      
      // Minerals
      'iron': { min: 60, max: 170, critical: { low: 20, high: 500 } },
      'ferritin': { min: 12, max: 300, critical: { low: 5, high: 2000 } },
      'calcium': { min: 8.5, max: 10.5, critical: { low: 6.0, high: 15.0 } }
    };
    
    for (const [key, range] of Object.entries(ranges)) {
      if (metricName.includes(key)) {
        if (range.critical) {
          if (value < range.critical.low || value > range.critical.high) {
            return 'CRITICAL';
          }
        }
        if (value < range.min) return 'LOW';
        if (value > range.max) return 'HIGH';
        return 'NORMAL';
      }
    }
    
    return 'NORMAL';
  }
}