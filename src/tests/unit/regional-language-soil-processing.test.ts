// Regional Language Soil Processing Tests
// Tests for OCR processing and data extraction in Indian regional languages

import OCRProcessingService from '../../services/soil-analysis/services/OCRProcessingService';
import { SoilDataExtractionService } from '../../services/soil-analysis/services/SoilDataExtractionService';
import SoilParameterExplanationService from '../../services/soil-analysis/services/SoilParameterExplanationService';
import { SoilReportMetadata } from '../../services/soil-analysis/types';

describe('Regional Language Soil Processing', () => {
  let ocrService: OCRProcessingService;
  let extractionService: SoilDataExtractionService;
  let explanationService: SoilParameterExplanationService;

  beforeEach(() => {
    ocrService = new OCRProcessingService();
    extractionService = new SoilDataExtractionService();
    explanationService = new SoilParameterExplanationService();
  });

  describe('OCR Processing Service', () => {
    it('should detect and process Hindi soil reports', async () => {
      const mockBuffer = Buffer.from('mock soil report data');
      const metadata: SoilReportMetadata = {
        filename: 'hindi-soil-report.jpg',
        size: 1024,
        mimeType: 'image/jpeg',
        uploadedAt: new Date(),
        farmerId: 'farmer123'
      };

      const result = await ocrService.processDocument(mockBuffer, metadata, {
        language: 'hi',
        expectedFormat: 'government',
        enableRegionalLanguageProcessing: true
      });

      expect(result).toBeDefined();
      expect(result.language).toBe('hi');
      expect(result.extractedText).toContain('मृदा स्वास्थ्य कार्ड');
      expect(result.structuredData?.parameters).toBeDefined();
      expect(result.structuredData?.parameters.length).toBeGreaterThan(0);
    });

    it('should detect and process Tamil soil reports', async () => {
      const mockBuffer = Buffer.from('mock soil report data');
      const metadata: SoilReportMetadata = {
        filename: 'tamil-soil-report.jpg',
        size: 1024,
        mimeType: 'image/jpeg',
        uploadedAt: new Date(),
        farmerId: 'farmer456'
      };

      const result = await ocrService.processDocument(mockBuffer, metadata, {
        language: 'ta',
        expectedFormat: 'government',
        enableRegionalLanguageProcessing: true
      });

      expect(result).toBeDefined();
      expect(result.language).toBe('ta');
      expect(result.extractedText).toContain('மண் ஆரோக்கிய அட்டை');
      expect(result.structuredData?.parameters).toBeDefined();
    });

    it('should detect and process Telugu soil reports', async () => {
      const mockBuffer = Buffer.from('mock soil report data');
      const metadata: SoilReportMetadata = {
        filename: 'telugu-soil-report.jpg',
        size: 1024,
        mimeType: 'image/jpeg',
        uploadedAt: new Date(),
        farmerId: 'farmer789'
      };

      const result = await ocrService.processDocument(mockBuffer, metadata, {
        language: 'te',
        expectedFormat: 'government',
        enableRegionalLanguageProcessing: true
      });

      expect(result).toBeDefined();
      expect(result.language).toBe('te');
      expect(result.extractedText).toContain('మట్టి ఆరోగ్య కార్డు');
      expect(result.structuredData?.parameters).toBeDefined();
    });

    it('should auto-detect language when not specified', async () => {
      const mockBuffer = Buffer.from('mock soil report data');
      const metadata: SoilReportMetadata = {
        filename: 'unknown-language-report.jpg',
        size: 1024,
        mimeType: 'image/jpeg',
        uploadedAt: new Date(),
        farmerId: 'farmer999'
      };

      const result = await ocrService.processDocument(mockBuffer, metadata, {
        language: 'auto',
        enableRegionalLanguageProcessing: true
      });

      expect(result).toBeDefined();
      expect(result.language).toBeDefined();
      expect(['en', 'hi', 'ta', 'te', 'bn', 'mr', 'gu']).toContain(result.language);
    });

    it('should validate OCR results for regional languages', () => {
      const mockOCRResult = {
        extractedText: 'मृदा परीक्षण रिपोर्ट\nपीएच: 6.8\nनाइट्रोजन: 245 kg/ha',
        confidence: 0.75,
        language: 'hi',
        structuredData: {
          parameters: [
            { name: 'pH', value: '6.8', unit: '', confidence: 0.8 },
            { name: 'Nitrogen', value: '245', unit: 'kg/ha', confidence: 0.7 }
          ]
        },
        processingTime: 500
      };

      const validation = ocrService.validateOCRResult(mockOCRResult);
      expect(validation.valid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should provide recommendations for regional language processing', () => {
      const mockOCRResult = {
        extractedText: 'மண் சோதனை அறிக்கை',
        confidence: 0.65,
        language: 'ta',
        structuredData: {
          parameters: [
            { name: 'pH', value: '6.5', unit: '', confidence: 0.6 }
          ]
        },
        processingTime: 1200
      };

      const recommendations = ocrService.getOCRRecommendations(mockOCRResult);
      expect(recommendations).toContain('Regional language document detected - OCR accuracy may be lower');
    });
  });

  describe('Soil Data Extraction Service', () => {
    it('should extract soil data from Hindi OCR results', async () => {
      const mockOCRResult = {
        extractedText: `
मृदा परीक्षण रिपोर्ट
पीएच: 6.8
नाइट्रोजन: 245 kg/ha
फास्फोरस: 18 kg/ha
पोटाशियम: 156 kg/ha
जिंक: 0.8 ppm
        `,
        confidence: 0.8,
        language: 'hi',
        structuredData: {
          parameters: [
            { name: 'pH', value: '6.8', unit: '', confidence: 0.8 },
            { name: 'Nitrogen', value: '245', unit: 'kg/ha', confidence: 0.8 },
            { name: 'Phosphorus', value: '18', unit: 'kg/ha', confidence: 0.7 },
            { name: 'Potassium', value: '156', unit: 'kg/ha', confidence: 0.8 },
            { name: 'Zinc', value: '0.8', unit: 'ppm', confidence: 0.7 }
          ]
        },
        processingTime: 300
      };

      const result = await extractionService.extractSoilData(mockOCRResult, {
        language: 'hi',
        enableRegionalLanguageProcessing: true
      });

      expect(result).toBeDefined();
      expect(result.nutrients.pH).toBeDefined();
      expect(result.nutrients.nitrogen).toBeDefined();
      expect(result.nutrients.phosphorus).toBeDefined();
      expect(result.nutrients.potassium).toBeDefined();
      expect(result.micronutrients.zinc).toBeDefined();
      expect(result.extractionMetadata.totalParametersFound).toBeGreaterThan(0);
    });

    it('should handle mixed language content', async () => {
      const mockOCRResult = {
        extractedText: `
Soil Test Report / मृदा परीक्षण रिपोर्ट
pH: 6.8
Nitrogen / नाइट्रोजन: 245 kg/ha
Phosphorus / फास्फोरस: 18 kg/ha
        `,
        confidence: 0.75,
        language: 'hi',
        structuredData: {
          parameters: [
            { name: 'pH', value: '6.8', unit: '', confidence: 0.8 },
            { name: 'Nitrogen', value: '245', unit: 'kg/ha', confidence: 0.7 }
          ]
        },
        processingTime: 400
      };

      const result = await extractionService.extractSoilData(mockOCRResult, {
        language: 'hi',
        enableRegionalLanguageProcessing: true,
        enableFuzzyMatching: true
      });

      expect(result).toBeDefined();
      expect(result.nutrients.pH?.value).toBe(6.8);
      expect(result.nutrients.nitrogen?.value).toBe(245);
    });
  });

  describe('Soil Parameter Explanation Service', () => {
    it('should provide explanations in Hindi', () => {
      const mockParameter = {
        name: 'pH',
        value: 6.8,
        unit: '',
        range: { min: 4.0, max: 9.0, optimal: { min: 6.0, max: 7.5 } },
        status: 'optimal' as const,
        confidence: 0.8
      };

      const explanation = explanationService.getParameterExplanation(mockParameter, 'hi');

      expect(explanation.language).toBe('hi');
      expect(explanation.simpleExplanation).toContain('pH मापता है');
      expect(explanation.whatItMeans).toContain('प्रभावित करता है');
      expect(explanation.whyItMatters).toContain('पैदावार');
      expect(explanation.actionNeeded).toContain('बहुत बढ़िया');
    });

    it('should provide soil health explanation in Hindi', () => {
      const mockNutrients = {
        pH: { name: 'pH', value: 6.8, unit: '', range: { min: 4.0, max: 9.0 }, status: 'optimal' as const, confidence: 0.8 },
        nitrogen: { name: 'Nitrogen', value: 245, unit: 'kg/ha', range: { min: 0, max: 500 }, status: 'adequate' as const, confidence: 0.8 },
        phosphorus: { name: 'Phosphorus', value: 18, unit: 'kg/ha', range: { min: 0, max: 100 }, status: 'deficient' as const, confidence: 0.7 },
        potassium: { name: 'Potassium', value: 156, unit: 'kg/ha', range: { min: 0, max: 400 }, status: 'adequate' as const, confidence: 0.8 }
      };

      const mockMicronutrients = {
        zinc: { name: 'Zinc', value: 0.8, unit: 'ppm', range: { min: 0, max: 10 }, status: 'deficient' as const, confidence: 0.7 }
      };

      const healthExplanation = explanationService.getSoilHealthExplanation(
        mockNutrients,
        mockMicronutrients,
        'good',
        75,
        'hi'
      );

      expect(healthExplanation.language).toBe('hi');
      expect(healthExplanation.overallMessage).toContain('अच्छी स्थिति');
      expect(healthExplanation.keyPoints.length).toBeGreaterThan(0);
      expect(healthExplanation.immediateActions.length).toBeGreaterThan(0);
      expect(healthExplanation.seasonalAdvice.length).toBeGreaterThan(0);
    });

    it('should adapt explanations for different literacy levels', () => {
      const mockParameter = {
        name: 'Nitrogen',
        value: 245,
        unit: 'kg/ha',
        range: { min: 0, max: 500, optimal: { min: 200, max: 300 } },
        status: 'adequate' as const,
        confidence: 0.8
      };

      const basicExplanation = explanationService.getExplanationByLiteracyLevel(mockParameter, 'basic', 'en');
      const advancedExplanation = explanationService.getExplanationByLiteracyLevel(mockParameter, 'advanced', 'en');

      expect(basicExplanation.simpleExplanation).toContain('food for plants');
      expect(advancedExplanation.simpleExplanation).toContain('245 kg/ha');
      expect(advancedExplanation.simpleExplanation).toContain('200-300 kg/ha');
    });
  });

  describe('Integration Tests', () => {
    it('should process complete regional language workflow', async () => {
      // Step 1: OCR Processing
      const mockBuffer = Buffer.from('mock hindi soil report');
      const metadata: SoilReportMetadata = {
        filename: 'hindi-report.jpg',
        size: 2048,
        mimeType: 'image/jpeg',
        uploadedAt: new Date(),
        farmerId: 'farmer123'
      };

      const ocrResult = await ocrService.processDocument(mockBuffer, metadata, {
        language: 'hi',
        expectedFormat: 'government',
        enableRegionalLanguageProcessing: true
      });

      // Step 2: Data Extraction
      const extractionResult = await extractionService.extractSoilData(ocrResult, {
        language: 'hi',
        enableRegionalLanguageProcessing: true
      });

      // Step 3: Generate Explanations
      const explanations = explanationService.getMultipleParameterExplanations(
        extractionResult.nutrients,
        extractionResult.micronutrients,
        'hi'
      );

      // Verify complete workflow
      expect(ocrResult.language).toBe('hi');
      expect(extractionResult.nutrients).toBeDefined();
      expect(explanations.length).toBeGreaterThan(0);
      expect(explanations[0].language).toBe('hi');
    });

    it('should handle errors gracefully in regional language processing', async () => {
      const mockBuffer = Buffer.from('corrupted data');
      const metadata: SoilReportMetadata = {
        filename: 'corrupted.jpg',
        size: 100,
        mimeType: 'image/jpeg',
        uploadedAt: new Date(),
        farmerId: 'farmer999'
      };

      // Should not throw error, but handle gracefully
      const result = await ocrService.processDocument(mockBuffer, metadata, {
        language: 'hi',
        enableRegionalLanguageProcessing: true
      });

      expect(result).toBeDefined();
      // Even with corrupted data, should return some result
    });
  });
});