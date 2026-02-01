// Soil Analysis Service Tests
// Comprehensive unit tests for soil report processing and OCR functionality

import SoilAnalysisService from '../../services/soil-analysis';
import SoilParameterExplanationService from '../../services/soil-analysis/services/SoilParameterExplanationService';
import SoilDeficiencyService from '../../services/soil-analysis/services/SoilDeficiencyService';
import OCRProcessingService from '../../services/soil-analysis/services/OCRProcessingService';
// import SoilDataExtractionService from '../../services/soil-analysis/services/SoilDataExtractionService';
import {
  SoilReportMetadata,
  SoilReportUploadOptions,
  SoilParameter,
  SoilNutrients,
  Micronutrients,
  SoilAnalysisResult,
  OCRResult
} from '../../services/soil-analysis/types';

describe('SoilAnalysisService', () => {
  let soilAnalysisService: SoilAnalysisService;
  let mockDocumentBuffer: Buffer;
  let mockMetadata: SoilReportMetadata;

  beforeEach(() => {
    soilAnalysisService = new SoilAnalysisService();
    mockDocumentBuffer = Buffer.from('mock soil report content');
    mockMetadata = {
      filename: 'soil_report.pdf',
      size: 1024,
      mimeType: 'application/pdf',
      uploadedAt: new Date(),
      farmerId: 'farmer_123',
      location: {
        latitude: 28.6139,
        longitude: 77.2090
      },
      reportDate: new Date('2024-01-20'),
      laboratoryName: 'Test Lab',
      sampleId: 'SMP_001'
    };
  });

  describe('uploadAndProcessSoilReport', () => {
    it('should successfully process a soil report with default options', async () => {
      const result = await soilAnalysisService.uploadAndProcessSoilReport(
        mockDocumentBuffer,
        mockMetadata
      );

      expect(result).toBeDefined();
      expect(result.reportId).toMatch(/^SR_\d+_farmer_123$/);
      expect(result.metadata).toEqual(mockMetadata);
      expect(result.extractedData).toBeDefined();
      expect(result.interpretation).toBeDefined();
      expect(result.farmerFriendlyExplanation).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.processingDate).toBeInstanceOf(Date);
      expect(Array.isArray(result.anomalies)).toBe(true);
    });

    it('should process soil report with custom options', async () => {
      const options: SoilReportUploadOptions = {
        enableOCR: true,
        language: 'hi',
        expectedFormat: 'government',
        validateData: true,
        generateRecommendations: true
      };

      const result = await soilAnalysisService.uploadAndProcessSoilReport(
        mockDocumentBuffer,
        mockMetadata,
        options
      );

      expect(result).toBeDefined();
      expect(result.farmerFriendlyExplanation.language).toBe('hi');
      expect(result.interpretation.recommendations).toBeDefined();
      expect(Array.isArray(result.interpretation.recommendations)).toBe(true);
    });

    it('should handle OCR processing errors gracefully', async () => {
      // Create a service with mocked OCR that throws an error
      const mockOCRService = {
        processDocument: jest.fn().mockRejectedValue(new Error('OCR failed'))
      };
      
      // Replace the OCR service
      (soilAnalysisService as any).ocrService = mockOCRService;

      await expect(
        soilAnalysisService.uploadAndProcessSoilReport(mockDocumentBuffer, mockMetadata)
      ).rejects.toThrow('Soil report processing failed');
    });

    it('should process report without OCR when disabled', async () => {
      const options: SoilReportUploadOptions = {
        enableOCR: false,
        generateRecommendations: false
      };

      await expect(
        soilAnalysisService.uploadAndProcessSoilReport(mockDocumentBuffer, mockMetadata, options)
      ).rejects.toThrow('OCR processing failed - no result available');
    });

    it('should validate extracted soil data', async () => {
      const result = await soilAnalysisService.uploadAndProcessSoilReport(
        mockDocumentBuffer,
        mockMetadata,
        { validateData: true }
      );

      expect(result.extractedData.nutrients).toBeDefined();
      expect(result.extractedData.nutrients.pH).toBeDefined();
      expect(result.extractedData.nutrients.nitrogen).toBeDefined();
      expect(result.extractedData.nutrients.phosphorus).toBeDefined();
      expect(result.extractedData.nutrients.potassium).toBeDefined();
    });

    it('should generate appropriate recommendations based on soil deficiencies', async () => {
      const result = await soilAnalysisService.uploadAndProcessSoilReport(
        mockDocumentBuffer,
        mockMetadata,
        { generateRecommendations: true }
      );

      expect(result.interpretation.recommendations).toBeDefined();
      expect(Array.isArray(result.interpretation.recommendations)).toBe(true);
      
      // Check if recommendations have required properties
      if (result.interpretation.recommendations.length > 0) {
        const recommendation = result.interpretation.recommendations[0];
        expect(recommendation.id).toBeDefined();
        expect(recommendation.type).toBeDefined();
        expect(recommendation.priority).toBeDefined();
        expect(recommendation.title).toBeDefined();
        expect(recommendation.description).toBeDefined();
        expect(Array.isArray(recommendation.specificActions)).toBe(true);
      }
    });

    it('should detect soil anomalies correctly', async () => {
      const result = await soilAnalysisService.uploadAndProcessSoilReport(
        mockDocumentBuffer,
        mockMetadata
      );

      expect(Array.isArray(result.anomalies)).toBe(true);
      
      // Check anomaly structure if any exist
      if (result.anomalies.length > 0) {
        const anomaly = result.anomalies[0];
        expect(anomaly.parameter).toBeDefined();
        expect(anomaly.issue).toBeDefined();
        expect(anomaly.severity).toMatch(/^(low|medium|high)$/);
        expect(anomaly.description).toBeDefined();
        expect(Array.isArray(anomaly.possibleCauses)).toBe(true);
        expect(anomaly.recommendedAction).toBeDefined();
      }
    });

    it('should generate farmer-friendly explanations', async () => {
      const result = await soilAnalysisService.uploadAndProcessSoilReport(
        mockDocumentBuffer,
        mockMetadata
      );

      const explanation = result.farmerFriendlyExplanation;
      expect(explanation.summary).toBeDefined();
      expect(typeof explanation.summary).toBe('string');
      expect(Array.isArray(explanation.keyFindings)).toBe(true);
      expect(Array.isArray(explanation.actionItems)).toBe(true);
      expect(explanation.language).toBeDefined();
    });

    it('should calculate soil health score correctly', async () => {
      const result = await soilAnalysisService.uploadAndProcessSoilReport(
        mockDocumentBuffer,
        mockMetadata
      );

      const interpretation = result.interpretation;
      expect(interpretation.healthScore).toBeGreaterThanOrEqual(0);
      expect(interpretation.healthScore).toBeLessThanOrEqual(100);
      expect(interpretation.overallHealth).toMatch(/^(poor|fair|good|excellent)$/);
      expect(Array.isArray(interpretation.primaryConcerns)).toBe(true);
      expect(Array.isArray(interpretation.strengths)).toBe(true);
    });

    it('should perform enhanced soil data extraction', async () => {
      // Create a mock OCR result
      const mockOCRResult: OCRResult = {
        extractedText: 'pH: 6.8\nNitrogen: 245 kg/ha\nPhosphorus: 18 kg/ha\nPotassium: 156 kg/ha\nZinc: 0.8 ppm',
        confidence: 0.85,
        language: 'en',
        processingTime: 300,
        structuredData: {
          parameters: [
            { name: 'pH', value: '6.8', unit: '', confidence: 0.9 },
            { name: 'Nitrogen', value: '245', unit: 'kg/ha', confidence: 0.8 },
            { name: 'Phosphorus', value: '18', unit: 'kg/ha', confidence: 0.8 },
            { name: 'Potassium', value: '156', unit: 'kg/ha', confidence: 0.8 },
            { name: 'Zinc', value: '0.8', unit: 'ppm', confidence: 0.7 }
          ]
        }
      };

      const extractionResult = await soilAnalysisService.extractSoilDataEnhanced(mockOCRResult, {
        enableFuzzyMatching: true,
        normalizeUnits: true,
        validateRanges: true
      });

      expect(extractionResult.nutrients).toBeDefined();
      expect(extractionResult.micronutrients).toBeDefined();
      expect(extractionResult.extractionMetadata).toBeDefined();
      expect(extractionResult.validation).toBeDefined();
      
      expect(extractionResult.extractionMetadata.totalParametersFound).toBeGreaterThan(0);
      expect(extractionResult.extractionMetadata.confidenceScore).toBeGreaterThan(0);
      expect(extractionResult.extractionMetadata.processingTime).toBeGreaterThan(0);
    });

    it('should provide extraction statistics', async () => {
      const mockOCRResult: OCRResult = {
        extractedText: 'pH: 6.8\nNitrogen: 245 kg/ha\nPhosphorus: 18 kg/ha',
        confidence: 0.85,
        language: 'en',
        processingTime: 300
      };

      const stats = await soilAnalysisService.getExtractionStatistics(mockOCRResult);

      expect(stats.totalParametersFound).toBeGreaterThanOrEqual(0);
      expect(stats.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(stats.confidenceScore).toBeLessThanOrEqual(1);
      expect(stats.extractionMethod).toBeDefined();
      expect(stats.processingTime).toBeGreaterThan(0);
      expect(Array.isArray(stats.warnings)).toBe(true);
      expect(stats.validationIssues).toBeGreaterThanOrEqual(0);
      expect(stats.validationConfidence).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getSoilAnalysisSummary', () => {
    it('should return soil analysis summary', async () => {
      const reportId = 'SR_123456_farmer_123';
      const summary = await soilAnalysisService.getSoilAnalysisSummary(reportId);

      expect(summary.reportId).toBe(reportId);
      expect(summary.overallHealth).toBeDefined();
      expect(summary.healthScore).toBeGreaterThanOrEqual(0);
      expect(summary.healthScore).toBeLessThanOrEqual(100);
      expect(summary.criticalIssues).toBeGreaterThanOrEqual(0);
      expect(summary.recommendationsCount).toBeGreaterThanOrEqual(0);
      expect(summary.lastUpdated).toBeInstanceOf(Date);
    });
  });

  describe('compareSoilReports', () => {
    it('should compare multiple soil reports and show trends', async () => {
      const reportIds = ['SR_123_farmer_123', 'SR_124_farmer_123', 'SR_125_farmer_123'];
      const comparison = await soilAnalysisService.compareSoilReports(reportIds);

      expect(comparison.trends).toBeDefined();
      expect(Array.isArray(comparison.trends)).toBe(true);
      expect(Array.isArray(comparison.recommendations)).toBe(true);

      if (comparison.trends.length > 0) {
        const trend = comparison.trends[0];
        expect(trend.parameter).toBeDefined();
        expect(trend.trend).toMatch(/^(improving|stable|declining)$/);
        expect(typeof trend.changePercent).toBe('number');
      }
    });
  });
});

describe('OCRProcessingService', () => {
  let ocrService: OCRProcessingService;
  let mockDocumentBuffer: Buffer;
  let mockMetadata: SoilReportMetadata;

  beforeEach(() => {
    ocrService = new OCRProcessingService();
    mockDocumentBuffer = Buffer.from('mock document content');
    mockMetadata = {
      filename: 'soil_report.jpg',
      size: 2048,
      mimeType: 'image/jpeg',
      uploadedAt: new Date(),
      farmerId: 'farmer_456',
      sampleId: 'SMP_002'
    };
  });

  describe('processDocument', () => {
    it('should process document with default options', async () => {
      const result = await ocrService.processDocument(mockDocumentBuffer, mockMetadata);

      expect(result).toBeDefined();
      expect(result.extractedText).toBeDefined();
      expect(typeof result.extractedText).toBe('string');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.language).toBeDefined();
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should process document with custom options', async () => {
      const options = {
        language: 'hi',
        expectedFormat: 'government' as const,
        enhanceImage: true
      };

      const result = await ocrService.processDocument(mockDocumentBuffer, mockMetadata, options);

      expect(result.language).toBe('hi');
      expect(result.extractedText).toContain('SOIL HEALTH CARD');
    });

    it('should extract structured data from government format', async () => {
      const options = {
        expectedFormat: 'government' as const
      };

      const result = await ocrService.processDocument(mockDocumentBuffer, mockMetadata, options);

      expect(result.structuredData).toBeDefined();
      expect(result.structuredData?.parameters).toBeDefined();
      expect(Array.isArray(result.structuredData?.parameters)).toBe(true);
      
      if (result.structuredData?.parameters && result.structuredData.parameters.length > 0) {
        const param = result.structuredData.parameters[0];
        expect(param.name).toBeDefined();
        expect(param.value).toBeDefined();
        expect(param.confidence).toBeGreaterThan(0);
      }
    });

    it('should extract structured data from private lab format', async () => {
      const options = {
        expectedFormat: 'private_lab' as const
      };

      const result = await ocrService.processDocument(mockDocumentBuffer, mockMetadata, options);

      expect(result.extractedText).toContain('ADVANCED SOIL TESTING LABORATORY');
      expect(result.structuredData?.parameters).toBeDefined();
    });

    it('should extract structured data from university format', async () => {
      const options = {
        expectedFormat: 'university' as const
      };

      const result = await ocrService.processDocument(mockDocumentBuffer, mockMetadata, options);

      expect(result.extractedText).toContain('UNIVERSITY AGRICULTURAL RESEARCH CENTER');
      expect(result.structuredData?.parameters).toBeDefined();
    });

    it('should extract metadata from OCR text', async () => {
      const result = await ocrService.processDocument(mockDocumentBuffer, mockMetadata);

      if (result.structuredData?.metadata) {
        const metadata = result.structuredData.metadata;
        expect(metadata.sampleId || metadata.laboratoryName || metadata.reportDate || metadata.farmerName).toBeDefined();
      }
    });

    it('should handle OCR processing errors', async () => {
      // Test error handling by mocking the internal method to throw an error
      const mockOCRService = new OCRProcessingService();
      
      // Mock the performOCR method to throw an error
      (mockOCRService as any).performOCR = jest.fn().mockRejectedValue(new Error('OCR processing failed'));

      await expect(
        mockOCRService.processDocument(mockDocumentBuffer, mockMetadata)
      ).rejects.toThrow('OCR processing failed');
    });
  });

  describe('validateOCRResult', () => {
    it('should validate good OCR results', async () => {
      const result = await ocrService.processDocument(mockDocumentBuffer, mockMetadata);
      const validation = ocrService.validateOCRResult(result);

      expect(validation.valid).toBeDefined();
      expect(Array.isArray(validation.issues)).toBe(true);
    });

    it('should detect issues in poor OCR results', () => {
      const poorResult: OCRResult = {
        extractedText: '',
        confidence: 0.3,
        language: 'en',
        processingTime: 1000
      };

      const validation = ocrService.validateOCRResult(poorResult);

      expect(validation.valid).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
      expect(validation.issues.some(issue => issue.includes('No text extracted'))).toBe(true);
      expect(validation.issues.some(issue => issue.includes('confidence is very low'))).toBe(true);
    });

    it('should detect missing structured data', () => {
      const resultWithoutStructuredData: OCRResult = {
        extractedText: 'Some text',
        confidence: 0.8,
        language: 'en',
        processingTime: 1000
      };

      const validation = ocrService.validateOCRResult(resultWithoutStructuredData);

      expect(validation.valid).toBe(false);
      expect(validation.issues.some(issue => issue.includes('No structured data'))).toBe(true);
    });
  });

  describe('getOCRRecommendations', () => {
    it('should provide recommendations for low confidence results', async () => {
      const result = await ocrService.processDocument(mockDocumentBuffer, mockMetadata);
      // Simulate low confidence
      result.confidence = 0.5;

      const recommendations = ocrService.getOCRRecommendations(result);

      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.some(rec => rec.includes('better lighting'))).toBe(true);
    });

    it('should provide recommendations for slow processing', async () => {
      const result = await ocrService.processDocument(mockDocumentBuffer, mockMetadata);
      // Simulate slow processing
      result.processingTime = 6000;

      const recommendations = ocrService.getOCRRecommendations(result);

      expect(recommendations.some(rec => rec.includes('Large document'))).toBe(true);
    });

    it('should provide recommendations for few parameters detected', async () => {
      const result = await ocrService.processDocument(mockDocumentBuffer, mockMetadata);
      // Simulate few parameters
      if (result.structuredData?.parameters) {
        result.structuredData.parameters = result.structuredData.parameters.slice(0, 2);
      }

      const recommendations = ocrService.getOCRRecommendations(result);

      expect(recommendations.some(rec => rec.includes('Few parameters detected'))).toBe(true);
    });

    it('should provide recommendations for regional language documents', async () => {
      const result = await ocrService.processDocument(mockDocumentBuffer, mockMetadata, { language: 'hi' });
      // Simulate lower confidence for regional language
      result.confidence = 0.7;

      const recommendations = ocrService.getOCRRecommendations(result);

      expect(recommendations.some(rec => rec.includes('Regional language'))).toBe(true);
    });
  });

  describe('processMultiplePages', () => {
    it('should process multiple document pages', async () => {
      const documentBuffers = [
        Buffer.from('page 1 content'),
        Buffer.from('page 2 content'),
        Buffer.from('page 3 content')
      ];

      const results = await ocrService.processMultiplePages(documentBuffers, mockMetadata);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(3);
      
      results.forEach(result => {
        expect(result.extractedText).toBeDefined();
        expect(result.confidence).toBeGreaterThan(0);
        expect(result.processingTime).toBeGreaterThan(0);
      });
    });

    it('should handle multi-page processing with custom options', async () => {
      const documentBuffers = [Buffer.from('page 1'), Buffer.from('page 2')];
      const options = {
        language: 'en',
        expectedFormat: 'private_lab' as const,
        combineResults: true
      };

      const results = await ocrService.processMultiplePages(documentBuffers, mockMetadata, options);

      expect(results.length).toBe(2);
      results.forEach(result => {
        expect(result.language).toBe('en');
        expect(result.extractedText).toContain('ADVANCED SOIL TESTING LABORATORY');
      });
    });

    it('should handle errors in multi-page processing', async () => {
      // Test error handling by mocking the processDocument method to throw an error
      const mockOCRService = new OCRProcessingService();
      
      // Mock the processDocument method to throw an error
      mockOCRService.processDocument = jest.fn().mockRejectedValue(new Error('Document processing failed'));

      const documentBuffers = [Buffer.from('test')];

      await expect(
        mockOCRService.processMultiplePages(documentBuffers, mockMetadata)
      ).rejects.toThrow('Document processing failed');
    });
  });

  describe('Parameter Extraction', () => {
    it('should extract pH values correctly', async () => {
      const result = await ocrService.processDocument(mockDocumentBuffer, mockMetadata);
      
      if (result.structuredData?.parameters) {
        const pHParam = result.structuredData.parameters.find(p => p.name === 'pH');
        if (pHParam) {
          expect(parseFloat(pHParam.value)).toBeGreaterThan(0);
          expect(parseFloat(pHParam.value)).toBeLessThan(14);
        }
      }
    });

    it('should extract nutrient values with correct units', async () => {
      const result = await ocrService.processDocument(mockDocumentBuffer, mockMetadata);
      
      if (result.structuredData?.parameters) {
        const nitrogenParam = result.structuredData.parameters.find(p => p.name === 'Nitrogen');
        if (nitrogenParam) {
          expect(nitrogenParam.unit).toBe('kg/ha');
          expect(parseFloat(nitrogenParam.value)).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('should extract micronutrient values', async () => {
      const result = await ocrService.processDocument(mockDocumentBuffer, mockMetadata);
      
      if (result.structuredData?.parameters) {
        const micronutrients = ['Zinc', 'Iron', 'Manganese', 'Copper'];
        const extractedMicronutrients = result.structuredData.parameters.filter(p => 
          micronutrients.includes(p.name)
        );
        
        extractedMicronutrients.forEach(param => {
          expect(param.unit).toBe('ppm');
          expect(parseFloat(param.value)).toBeGreaterThanOrEqual(0);
        });
      }
    });
  });
});

describe('SoilDataExtractionService', () => {
  let soilAnalysisService: SoilAnalysisService;
  let mockOCRResult: OCRResult;

  beforeEach(() => {
    soilAnalysisService = new SoilAnalysisService();
    mockOCRResult = {
      extractedText: `
        SOIL TEST REPORT
        pH: 6.8
        Electrical Conductivity: 0.45 dS/m
        Organic Carbon: 0.65%
        Available Nitrogen: 245 kg/ha
        Available Phosphorus: 18 kg/ha
        Available Potassium: 156 kg/ha
        Zinc: 0.8 ppm
        Iron: 12.5 ppm
        Manganese: 8.2 ppm
        Copper: 1.2 ppm
      `,
      confidence: 0.85,
      language: 'en',
      processingTime: 300,
      structuredData: {
        parameters: [
          { name: 'pH', value: '6.8', unit: '', confidence: 0.9 },
          { name: 'Nitrogen', value: '245', unit: 'kg/ha', confidence: 0.8 },
          { name: 'Phosphorus', value: '18', unit: 'kg/ha', confidence: 0.8 },
          { name: 'Potassium', value: '156', unit: 'kg/ha', confidence: 0.8 }
        ]
      }
    };
  });

  describe('extractSoilDataEnhanced', () => {
    it('should extract soil data with default options', async () => {
      const result = await soilAnalysisService.extractSoilDataEnhanced(mockOCRResult);

      expect(result.nutrients).toBeDefined();
      expect(result.micronutrients).toBeDefined();
      expect(result.extractionMetadata).toBeDefined();
      expect(result.validation).toBeDefined();

      // Check nutrients
      expect(result.nutrients.pH).toBeDefined();
      expect(result.nutrients.nitrogen).toBeDefined();
      expect(result.nutrients.phosphorus).toBeDefined();
      expect(result.nutrients.potassium).toBeDefined();

      // Check extraction metadata
      expect(result.extractionMetadata.totalParametersFound).toBeGreaterThan(0);
      expect(result.extractionMetadata.confidenceScore).toBeGreaterThan(0);
      expect(result.extractionMetadata.processingTime).toBeGreaterThan(0);
      expect(Array.isArray(result.extractionMetadata.warnings)).toBe(true);
    });

    it('should extract data with fuzzy matching enabled', async () => {
      const result = await soilAnalysisService.extractSoilDataEnhanced(mockOCRResult, {
        enableFuzzyMatching: true,
        confidenceThreshold: 0.5
      });

      expect(result.extractionMetadata.totalParametersFound).toBeGreaterThan(0);
      expect(result.nutrients.pH.value).toBe(6.8);
      expect(result.nutrients.nitrogen.value).toBe(245);
    });

    it('should validate ranges when enabled', async () => {
      const ocrWithInvalidValues: OCRResult = {
        ...mockOCRResult,
        extractedText: 'pH: 15.0\nNitrogen: -50 kg/ha',
        structuredData: {
          parameters: [
            { name: 'pH', value: '15.0', unit: '', confidence: 0.8 },
            { name: 'Nitrogen', value: '-50', unit: 'kg/ha', confidence: 0.8 }
          ]
        }
      };

      const result = await soilAnalysisService.extractSoilDataEnhanced(ocrWithInvalidValues, {
        validateRanges: true
      });

      expect(result.validation.valid).toBe(false);
      expect(result.validation.issues.length).toBeGreaterThan(0);
      expect(result.validation.issues.some((issue: any) => issue.parameter === 'pH')).toBe(true);
    });

    it('should handle missing structured data gracefully', async () => {
      const ocrWithoutStructuredData: OCRResult = {
        extractedText: 'pH: 6.8\nNitrogen: 245 kg/ha\nPhosphorus: 18 kg/ha',
        confidence: 0.85,
        language: 'en',
        processingTime: 300
      };

      const result = await soilAnalysisService.extractSoilDataEnhanced(ocrWithoutStructuredData, {
        enableFuzzyMatching: true
      });

      expect(result.nutrients).toBeDefined();
      expect(result.extractionMetadata.totalParametersFound).toBeGreaterThan(0);
    });

    it('should extract micronutrients correctly', async () => {
      const result = await soilAnalysisService.extractSoilDataEnhanced(mockOCRResult);

      // Check if micronutrients were extracted from the text
      const extractedMicronutrients = Object.keys(result.micronutrients);
      
      // At least some micronutrients should be extracted
      expect(extractedMicronutrients.length).toBeGreaterThan(0);
      
      // Check structure of extracted micronutrients
      Object.values(result.micronutrients).forEach((micronutrient: any) => {
        if (micronutrient) {
          expect(micronutrient.name).toBeDefined();
          expect(micronutrient.value).toBeGreaterThanOrEqual(0);
          expect(micronutrient.unit).toBeDefined();
          expect(micronutrient.confidence).toBeGreaterThan(0);
          expect(micronutrient.status).toMatch(/^(deficient|adequate|excessive|optimal)$/);
        }
      });
    });

    it('should handle different parameter name variations', async () => {
      const ocrWithVariations: OCRResult = {
        extractedText: `
          pH: 6.8
          Available N: 245 kg/ha
          P2O5: 18 kg/ha
          K2O: 156 kg/ha
          Zn: 0.8 ppm
          Fe: 12.5 ppm
        `,
        confidence: 0.85,
        language: 'en',
        processingTime: 300
      };

      const result = await soilAnalysisService.extractSoilDataEnhanced(ocrWithVariations, {
        enableFuzzyMatching: true
      });

      expect(result.nutrients.pH.value).toBe(6.8);
      expect(result.nutrients.nitrogen.value).toBe(245);
      // P2O5 should be extracted as phosphorus
      expect(result.nutrients.phosphorus.value).toBeGreaterThan(0); // Should find P2O5: 18
      expect(result.nutrients.potassium.value).toBe(156);
    });

    it('should calculate confidence scores correctly', async () => {
      const result = await soilAnalysisService.extractSoilDataEnhanced(mockOCRResult);

      expect(result.extractionMetadata.confidenceScore).toBeGreaterThan(0);
      expect(result.extractionMetadata.confidenceScore).toBeLessThanOrEqual(1);
      expect(result.validation.confidence).toBeGreaterThan(0);
      expect(result.validation.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('getExtractionStatistics', () => {
    it('should provide extraction statistics', async () => {
      const stats = await soilAnalysisService.getExtractionStatistics(mockOCRResult);

      expect(stats.totalParametersFound).toBeGreaterThanOrEqual(0);
      expect(stats.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(stats.confidenceScore).toBeLessThanOrEqual(1);
      expect(stats.extractionMethod).toBeDefined();
      expect(stats.processingTime).toBeGreaterThan(0);
      expect(Array.isArray(stats.warnings)).toBe(true);
      expect(stats.validationIssues).toBeGreaterThanOrEqual(0);
      expect(stats.validationConfidence).toBeGreaterThanOrEqual(0);
    });
  });
});

// Farmer-Friendly Explanation Tests
describe('SoilParameterExplanationService', () => {
  let explanationService: SoilParameterExplanationService;
  let soilAnalysisService: SoilAnalysisService;
  let mockSoilParameter: SoilParameter;
  let mockNutrients: SoilNutrients;
  let mockMicronutrients: Micronutrients;

  beforeEach(() => {
    explanationService = new SoilParameterExplanationService();
    soilAnalysisService = new SoilAnalysisService();
    
    mockSoilParameter = {
      name: 'pH',
      value: 6.8,
      unit: '',
      range: { min: 4.0, max: 9.0, optimal: { min: 6.0, max: 7.5 } },
      status: 'optimal',
      confidence: 0.9
    };

    mockNutrients = {
      pH: mockSoilParameter,
      nitrogen: {
        name: 'Nitrogen',
        value: 180,
        unit: 'kg/ha',
        range: { min: 0, max: 500, optimal: { min: 200, max: 300 } },
        status: 'deficient',
        confidence: 0.8
      },
      phosphorus: {
        name: 'Phosphorus',
        value: 25,
        unit: 'kg/ha',
        range: { min: 0, max: 100, optimal: { min: 20, max: 40 } },
        status: 'optimal',
        confidence: 0.8
      },
      potassium: {
        name: 'Potassium',
        value: 150,
        unit: 'kg/ha',
        range: { min: 0, max: 400, optimal: { min: 120, max: 200 } },
        status: 'optimal',
        confidence: 0.8
      }
    };

    mockMicronutrients = {
      zinc: {
        name: 'Zinc',
        value: 0.5,
        unit: 'ppm',
        range: { min: 0, max: 10, optimal: { min: 1.0, max: 3.0 } },
        status: 'deficient',
        confidence: 0.7
      },
      iron: {
        name: 'Iron',
        value: 15,
        unit: 'ppm',
        range: { min: 0, max: 50, optimal: { min: 10, max: 25 } },
        status: 'optimal',
        confidence: 0.7
      }
    };
  });

  describe('getParameterExplanation', () => {
    it('should provide farmer-friendly explanation in English', () => {
      const explanation = explanationService.getParameterExplanation(mockSoilParameter, 'en');

      expect(explanation.parameter).toBe('pH');
      expect(explanation.simpleExplanation).toContain('6.8');
      expect(explanation.whatItMeans).toBeDefined();
      expect(explanation.whyItMatters).toBeDefined();
      expect(explanation.actionNeeded).toBeDefined();
      expect(explanation.language).toBe('en');
    });

    it('should provide farmer-friendly explanation in Hindi', () => {
      const explanation = explanationService.getParameterExplanation(mockSoilParameter, 'hi');

      expect(explanation.parameter).toBe('pH');
      expect(explanation.simpleExplanation).toContain('6.8');
      expect(explanation.language).toBe('hi');
      expect(explanation.simpleExplanation).toContain('मिट्टी');
    });

    it('should provide different explanations for different nutrient statuses', () => {
      const deficientParam = { ...mockSoilParameter, status: 'deficient' as const };
      const excessiveParam = { ...mockSoilParameter, status: 'excessive' as const };

      const deficientExplanation = explanationService.getParameterExplanation(deficientParam, 'en');
      const excessiveExplanation = explanationService.getParameterExplanation(excessiveParam, 'en');

      expect(deficientExplanation.actionNeeded).toContain('needs more');
      expect(excessiveExplanation.actionNeeded).toContain('too high');
    });

    it('should handle different parameter types correctly', () => {
      const nitrogenParam = mockNutrients.nitrogen;
      const explanation = explanationService.getParameterExplanation(nitrogenParam, 'en');

      expect(explanation.parameter).toBe('Nitrogen');
      expect(explanation.simpleExplanation).toContain('green and healthy');
      expect(explanation.whyItMatters).toContain('yellow');
    });
  });

  describe('getSoilHealthExplanation', () => {
    it('should provide comprehensive soil health explanation', () => {
      const healthExplanation = explanationService.getSoilHealthExplanation(
        mockNutrients,
        mockMicronutrients,
        'good',
        75,
        'en'
      );

      expect(healthExplanation.overallMessage).toContain('75');
      expect(healthExplanation.overallMessage).toContain('good');
      expect(Array.isArray(healthExplanation.keyPoints)).toBe(true);
      expect(Array.isArray(healthExplanation.immediateActions)).toBe(true);
      expect(Array.isArray(healthExplanation.seasonalAdvice)).toBe(true);
      expect(healthExplanation.language).toBe('en');
    });

    it('should provide different messages for different health levels', () => {
      const excellentHealth = explanationService.getSoilHealthExplanation(
        mockNutrients, mockMicronutrients, 'excellent', 95, 'en'
      );
      const poorHealth = explanationService.getSoilHealthExplanation(
        mockNutrients, mockMicronutrients, 'poor', 35, 'en'
      );

      expect(excellentHealth.overallMessage).toContain('excellent');
      expect(poorHealth.overallMessage).toContain('significant improvement');
    });

    it('should identify deficient nutrients in key points', () => {
      const healthExplanation = explanationService.getSoilHealthExplanation(
        mockNutrients,
        mockMicronutrients,
        'fair',
        60,
        'en'
      );

      expect(healthExplanation.keyPoints.some(point => 
        point.toLowerCase().includes('nitrogen')
      )).toBe(true);
    });

    it('should provide appropriate immediate actions', () => {
      const healthExplanation = explanationService.getSoilHealthExplanation(
        mockNutrients,
        mockMicronutrients,
        'fair',
        60,
        'en'
      );

      expect(healthExplanation.immediateActions.some(action => 
        action.toLowerCase().includes('nitrogen') || action.toLowerCase().includes('urea')
      )).toBe(true);
    });
  });

  describe('getExplanationByLiteracyLevel', () => {
    it('should simplify explanation for basic literacy', () => {
      const basicExplanation = explanationService.getExplanationByLiteracyLevel(
        mockSoilParameter, 'basic', 'en'
      );

      expect(basicExplanation.simpleExplanation).toContain('food for plants');
      expect(basicExplanation.actionNeeded).toContain('perfect');
    });

    it('should provide standard explanation for intermediate literacy', () => {
      const intermediateExplanation = explanationService.getExplanationByLiteracyLevel(
        mockSoilParameter, 'intermediate', 'en'
      );

      expect(intermediateExplanation.simpleExplanation).toContain('nutrients');
    });

    it('should enhance explanation for advanced literacy', () => {
      const advancedExplanation = explanationService.getExplanationByLiteracyLevel(
        mockSoilParameter, 'advanced', 'en'
      );

      expect(advancedExplanation.simpleExplanation).toContain('6.8');
      expect(advancedExplanation.simpleExplanation).toContain('6-7.5');
    });
  });

  describe('getMultipleParameterExplanations', () => {
    it('should provide explanations for all parameters', () => {
      const explanations = explanationService.getMultipleParameterExplanations(
        mockNutrients,
        mockMicronutrients,
        'en'
      );

      expect(explanations.length).toBeGreaterThan(0);
      expect(explanations.some(exp => exp.parameter === 'pH')).toBe(true);
      expect(explanations.some(exp => exp.parameter === 'Nitrogen')).toBe(true);
      expect(explanations.some(exp => exp.parameter === 'Zinc')).toBe(true);
    });

    it('should handle empty micronutrients gracefully', () => {
      const explanations = explanationService.getMultipleParameterExplanations(
        mockNutrients,
        {},
        'en'
      );

      expect(explanations.length).toBe(4); // Only main nutrients
      expect(explanations.every(exp => exp.language === 'en')).toBe(true);
    });
  });
});

describe('Soil Analysis Service - Farmer-Friendly Features', () => {
  let soilAnalysisService: SoilAnalysisService;
  let mockAnalysisResult: SoilAnalysisResult;

  beforeEach(() => {
    soilAnalysisService = new SoilAnalysisService();
    
    mockAnalysisResult = {
      reportId: 'SR_123456_farmer_123',
      metadata: {
        filename: 'soil_report.pdf',
        size: 1024,
        mimeType: 'application/pdf',
        uploadedAt: new Date(),
        farmerId: 'farmer_123'
      },
      extractedData: {
        nutrients: {
          pH: {
            name: 'pH',
            value: 6.8,
            unit: '',
            range: { min: 4.0, max: 9.0, optimal: { min: 6.0, max: 7.5 } },
            status: 'optimal',
            confidence: 0.9
          },
          nitrogen: {
            name: 'Nitrogen',
            value: 180,
            unit: 'kg/ha',
            range: { min: 0, max: 500, optimal: { min: 200, max: 300 } },
            status: 'deficient',
            confidence: 0.8
          },
          phosphorus: {
            name: 'Phosphorus',
            value: 25,
            unit: 'kg/ha',
            range: { min: 0, max: 100, optimal: { min: 20, max: 40 } },
            status: 'optimal',
            confidence: 0.8
          },
          potassium: {
            name: 'Potassium',
            value: 150,
            unit: 'kg/ha',
            range: { min: 0, max: 400, optimal: { min: 120, max: 200 } },
            status: 'optimal',
            confidence: 0.8
          }
        },
        micronutrients: {
          zinc: {
            name: 'Zinc',
            value: 0.5,
            unit: 'ppm',
            range: { min: 0, max: 10, optimal: { min: 1.0, max: 3.0 } },
            status: 'deficient',
            confidence: 0.7
          }
        }
      },
      interpretation: {
        overallHealth: 'good',
        healthScore: 75,
        primaryConcerns: ['Nitrogen levels are below optimal', 'Zinc deficiency detected'],
        strengths: ['pH is in optimal range', 'Phosphorus levels are adequate'],
        recommendations: []
      },
      farmerFriendlyExplanation: {
        summary: 'Your soil health score is 75/100 (good).',
        keyFindings: ['Your soil pH is good for most crops'],
        actionItems: ['Apply nitrogen-rich fertilizers'],
        language: 'en'
      },
      confidence: 0.8,
      processingDate: new Date(),
      anomalies: []
    };
  });

  describe('getParameterExplanation', () => {
    it('should get explanation for individual parameter', () => {
      const explanation = soilAnalysisService.getParameterExplanation(
        mockAnalysisResult.extractedData.nutrients.pH,
        'en',
        'intermediate'
      );

      expect(explanation.parameter).toBe('pH');
      expect(explanation.language).toBe('en');
      expect(explanation.simpleExplanation).toBeDefined();
      expect(explanation.actionNeeded).toBeDefined();
    });

    it('should get explanation in different languages', () => {
      const englishExplanation = soilAnalysisService.getParameterExplanation(
        mockAnalysisResult.extractedData.nutrients.nitrogen,
        'en'
      );
      const hindiExplanation = soilAnalysisService.getParameterExplanation(
        mockAnalysisResult.extractedData.nutrients.nitrogen,
        'hi'
      );

      expect(englishExplanation.language).toBe('en');
      expect(hindiExplanation.language).toBe('hi');
      expect(hindiExplanation.simpleExplanation).toContain('नाइट्रोजन');
    });
  });

  describe('getSoilHealthExplanation', () => {
    it('should get comprehensive health explanation', () => {
      const healthExplanation = soilAnalysisService.getSoilHealthExplanation(
        mockAnalysisResult.extractedData.nutrients,
        mockAnalysisResult.extractedData.micronutrients,
        mockAnalysisResult.interpretation.overallHealth,
        mockAnalysisResult.interpretation.healthScore,
        'en'
      );

      expect(healthExplanation.overallMessage).toContain('75');
      expect(healthExplanation.keyPoints.length).toBeGreaterThan(0);
      expect(healthExplanation.immediateActions.length).toBeGreaterThan(0);
      expect(healthExplanation.seasonalAdvice.length).toBeGreaterThan(0);
    });
  });

  describe('getAllParameterExplanations', () => {
    it('should get explanations for all parameters', () => {
      const explanations = soilAnalysisService.getAllParameterExplanations(
        mockAnalysisResult.extractedData.nutrients,
        mockAnalysisResult.extractedData.micronutrients,
        'en',
        'intermediate'
      );

      expect(explanations.length).toBeGreaterThan(0);
      expect(explanations.some(exp => exp.parameter === 'pH')).toBe(true);
      expect(explanations.some(exp => exp.parameter === 'Nitrogen')).toBe(true);
      expect(explanations.some(exp => exp.parameter === 'Zinc')).toBe(true);
    });

    it('should adapt explanations for different literacy levels', () => {
      const basicExplanations = soilAnalysisService.getAllParameterExplanations(
        mockAnalysisResult.extractedData.nutrients,
        mockAnalysisResult.extractedData.micronutrients,
        'en',
        'basic'
      );

      const advancedExplanations = soilAnalysisService.getAllParameterExplanations(
        mockAnalysisResult.extractedData.nutrients,
        mockAnalysisResult.extractedData.micronutrients,
        'en',
        'advanced'
      );

      expect(basicExplanations[0].simpleExplanation).toContain('food for plants');
      expect(advancedExplanations[0].simpleExplanation).toContain('6.8');
    });
  });

  describe('getSimpleSoilReportSummary', () => {
    it('should provide simple summary for farmers', () => {
      const summary = soilAnalysisService.getSimpleSoilReportSummary(
        mockAnalysisResult,
        'en',
        'intermediate'
      );

      expect(summary.overallMessage).toBeDefined();
      expect(Array.isArray(summary.mainIssues)).toBe(true);
      expect(Array.isArray(summary.quickActions)).toBe(true);
      expect(Array.isArray(summary.detailedExplanations)).toBe(true);
      expect(summary.healthExplanation).toBeDefined();
    });

    it('should limit issues and actions to top 3', () => {
      const summary = soilAnalysisService.getSimpleSoilReportSummary(
        mockAnalysisResult,
        'en'
      );

      expect(summary.mainIssues.length).toBeLessThanOrEqual(3);
      expect(summary.quickActions.length).toBeLessThanOrEqual(3);
    });
  });

  describe('getVoiceFriendlyExplanation', () => {
    it('should provide voice-friendly explanation in English', () => {
      const voiceExplanation = soilAnalysisService.getVoiceFriendlyExplanation(
        mockAnalysisResult,
        'en'
      );

      expect(voiceExplanation.shortSummary).toContain('75');
      expect(voiceExplanation.shortSummary).toContain('good');
      expect(voiceExplanation.keyPoints.length).toBeLessThanOrEqual(3);
      expect(voiceExplanation.actionItems.length).toBeLessThanOrEqual(3);
    });

    it('should provide voice-friendly explanation in Hindi', () => {
      const voiceExplanation = soilAnalysisService.getVoiceFriendlyExplanation(
        mockAnalysisResult,
        'hi'
      );

      expect(voiceExplanation.shortSummary).toContain('स्वास्थ्य स्कोर');
      expect(voiceExplanation.shortSummary).toContain('75');
    });
  });

  describe('explainSoilChanges', () => {
    it('should explain changes between soil reports', () => {
      const previousResult = { ...mockAnalysisResult };
      previousResult.interpretation.healthScore = 65;
      previousResult.extractedData.nutrients.nitrogen.value = 150;

      const currentResult = { ...mockAnalysisResult };
      currentResult.interpretation.healthScore = 75;
      currentResult.extractedData.nutrients.nitrogen.value = 180;

      const changeExplanation = soilAnalysisService.explainSoilChanges(
        previousResult,
        currentResult,
        'en'
      );

      expect(changeExplanation.overallChange).toContain('improved to 75');
      expect(changeExplanation.parameterChanges.length).toBeGreaterThan(0);
      expect(changeExplanation.nextSteps.length).toBeGreaterThan(0);

      const nitrogenChange = changeExplanation.parameterChanges.find(
        change => change.parameter === 'Nitrogen'
      );
      expect(nitrogenChange?.change).toBe('improved');
    });

    it('should detect declining parameters', () => {
      const previousResult = { ...mockAnalysisResult };
      previousResult.extractedData.nutrients.phosphorus.value = 30;

      const currentResult = { ...mockAnalysisResult };
      currentResult.extractedData.nutrients.phosphorus.value = 20;

      const changeExplanation = soilAnalysisService.explainSoilChanges(
        previousResult,
        currentResult,
        'en'
      );

      const phosphorusChange = changeExplanation.parameterChanges.find(
        change => change.parameter === 'Phosphorus'
      );
      expect(phosphorusChange?.change).toBe('declined');
    });

    it('should provide explanations in Hindi', () => {
      const previousResult = { ...mockAnalysisResult };
      const currentResult = { ...mockAnalysisResult };

      const changeExplanation = soilAnalysisService.explainSoilChanges(
        previousResult,
        currentResult,
        'hi'
      );

      expect(changeExplanation.overallChange).toContain('स्वास्थ्य स्कोर');
      expect(changeExplanation.nextSteps.some(step => step.includes('मिट्टी'))).toBe(true);
    });
  });

  describe('Integration with existing methods', () => {
    it('should use enhanced explanation in uploadAndProcessSoilReport', async () => {
      const mockDocumentBuffer = Buffer.from('mock soil report content');
      const mockMetadata = {
        filename: 'soil_report.pdf',
        size: 1024,
        mimeType: 'application/pdf',
        uploadedAt: new Date(),
        farmerId: 'farmer_123'
      };

      const result = await soilAnalysisService.uploadAndProcessSoilReport(
        mockDocumentBuffer,
        mockMetadata,
        { language: 'hi' }
      );

      // The farmer-friendly explanation should be enhanced
      expect(result.farmerFriendlyExplanation).toBeDefined();
      expect(result.farmerFriendlyExplanation.summary).toBeDefined();
      expect(result.farmerFriendlyExplanation.keyFindings).toBeDefined();
      expect(result.farmerFriendlyExplanation.actionItems).toBeDefined();
    });
  });
});

describe('SoilDeficiencyService', () => {
  let deficiencyService: SoilDeficiencyService;
  let mockNutrients: SoilNutrients;
  let mockMicronutrients: Micronutrients;

  beforeEach(() => {
    deficiencyService = new SoilDeficiencyService();
    
    // Mock nutrients with deficiencies
    mockNutrients = {
      pH: {
        name: 'pH',
        value: 5.2, // Acidic - deficient
        unit: '',
        range: { min: 4.0, max: 9.0, optimal: { min: 6.0, max: 7.5 } },
        status: 'deficient',
        confidence: 0.9
      },
      nitrogen: {
        name: 'Nitrogen',
        value: 150, // Low nitrogen
        unit: 'kg/ha',
        range: { min: 0, max: 500, optimal: { min: 200, max: 300 } },
        status: 'deficient',
        confidence: 0.85
      },
      phosphorus: {
        name: 'Phosphorus',
        value: 25, // Adequate phosphorus
        unit: 'kg/ha',
        range: { min: 0, max: 100, optimal: { min: 20, max: 40 } },
        status: 'optimal',
        confidence: 0.8
      },
      potassium: {
        name: 'Potassium',
        value: 80, // Low potassium
        unit: 'kg/ha',
        range: { min: 0, max: 400, optimal: { min: 120, max: 200 } },
        status: 'deficient',
        confidence: 0.9
      }
    };

    mockMicronutrients = {
      zinc: {
        name: 'Zinc',
        value: 0.5, // Low zinc
        unit: 'ppm',
        range: { min: 0, max: 10, optimal: { min: 1.0, max: 3.0 } },
        status: 'deficient',
        confidence: 0.8
      },
      iron: {
        name: 'Iron',
        value: 15, // Adequate iron
        unit: 'ppm',
        range: { min: 0, max: 50, optimal: { min: 10, max: 25 } },
        status: 'optimal',
        confidence: 0.85
      }
    };
  });

  describe('identifyDeficiencies', () => {
    it('should identify pH deficiency correctly', () => {
      const deficiencies = deficiencyService.identifyDeficiencies(mockNutrients, mockMicronutrients);
      
      const pHDeficiency = deficiencies.find(d => d.parameter === 'pH');
      expect(pHDeficiency).toBeDefined();
      expect(pHDeficiency?.deficiencyType).toBe('moderate');
      expect(pHDeficiency?.currentValue).toBe(5.2);
      expect(pHDeficiency?.impactOnCrops).toContain('Reduced nutrient availability');
    });

    it('should identify nitrogen deficiency correctly', () => {
      const deficiencies = deficiencyService.identifyDeficiencies(mockNutrients, mockMicronutrients);
      
      const nDeficiency = deficiencies.find(d => d.parameter === 'nitrogen');
      expect(nDeficiency).toBeDefined();
      expect(nDeficiency?.deficiencyType).toBe('moderate');
      expect(nDeficiency?.currentValue).toBe(150);
      expect(nDeficiency?.deficitAmount).toBeGreaterThan(0);
    });

    it('should identify potassium deficiency correctly', () => {
      const deficiencies = deficiencyService.identifyDeficiencies(mockNutrients, mockMicronutrients);
      
      const kDeficiency = deficiencies.find(d => d.parameter === 'potassium');
      expect(kDeficiency).toBeDefined();
      expect(kDeficiency?.deficiencyType).toBe('moderate');
      expect(kDeficiency?.currentValue).toBe(80);
    });

    it('should identify zinc deficiency correctly', () => {
      const deficiencies = deficiencyService.identifyDeficiencies(mockNutrients, mockMicronutrients);
      
      const zincDeficiency = deficiencies.find(d => d.parameter === 'zinc');
      expect(zincDeficiency).toBeDefined();
      expect(zincDeficiency?.deficiencyType).toBe('moderate');
      expect(zincDeficiency?.currentValue).toBe(0.5);
    });

    it('should not identify deficiencies for optimal nutrients', () => {
      const deficiencies = deficiencyService.identifyDeficiencies(mockNutrients, mockMicronutrients);
      
      const pDeficiency = deficiencies.find(d => d.parameter === 'phosphorus');
      const feDeficiency = deficiencies.find(d => d.parameter === 'iron');
      
      expect(pDeficiency).toBeUndefined();
      expect(feDeficiency).toBeUndefined();
    });

    it('should sort deficiencies by severity', () => {
      // Create severe pH deficiency
      mockNutrients.pH.value = 4.5;
      
      const deficiencies = deficiencyService.identifyDeficiencies(mockNutrients, mockMicronutrients);
      
      expect(deficiencies.length).toBeGreaterThan(0);
      // pH should be first due to high severity and importance
      expect(deficiencies[0].parameter).toBe('pH');
    });

    it('should handle empty nutrients gracefully', () => {
      const emptyNutrients: SoilNutrients = {
        pH: mockNutrients.pH,
        nitrogen: mockNutrients.nitrogen,
        phosphorus: mockNutrients.phosphorus,
        potassium: mockNutrients.potassium
      };
      const emptyMicronutrients: Micronutrients = {};
      
      const deficiencies = deficiencyService.identifyDeficiencies(emptyNutrients, emptyMicronutrients);
      
      expect(Array.isArray(deficiencies)).toBe(true);
      expect(deficiencies.length).toBeGreaterThan(0); // Should still find main nutrient deficiencies
    });
  });

  describe('generateRemediationPlan', () => {
    it('should generate remediation plan for identified deficiencies', () => {
      const deficiencies = deficiencyService.identifyDeficiencies(mockNutrients, mockMicronutrients);
      const plans = deficiencyService.generateRemediationPlan(deficiencies, 1);
      
      expect(plans).toBeDefined();
      expect(plans.length).toBe(deficiencies.length);
      
      plans.forEach(plan => {
        expect(plan.deficiency).toBeDefined();
        expect(plan.immediateActions).toBeDefined();
        expect(plan.longTermActions).toBeDefined();
        expect(plan.seasonalTiming).toBeDefined();
        expect(plan.costEstimate).toBeDefined();
        expect(plan.expectedResults).toBeDefined();
      });
    });

    it('should generate different plans for organic preferences', () => {
      const deficiencies = deficiencyService.identifyDeficiencies(mockNutrients, mockMicronutrients);
      const organicPlans = deficiencyService.generateRemediationPlan(deficiencies, 1, undefined, { organic: true });
      const conventionalPlans = deficiencyService.generateRemediationPlan(deficiencies, 1, undefined, { organic: false });
      
      expect(organicPlans.length).toBe(conventionalPlans.length);
      
      // Check that organic plans have different materials
      const organicNPlan = organicPlans.find(p => p.deficiency.parameter === 'nitrogen');
      const conventionalNPlan = conventionalPlans.find(p => p.deficiency.parameter === 'nitrogen');
      
      if (organicNPlan && conventionalNPlan) {
        const organicMaterial = organicNPlan.immediateActions[0]?.materials[0]?.name;
        const conventionalMaterial = conventionalNPlan.immediateActions[0]?.materials[0]?.name;
        
        expect(organicMaterial).not.toBe(conventionalMaterial);
      }
    });

    it('should calculate cost estimates correctly', () => {
      const deficiencies = deficiencyService.identifyDeficiencies(mockNutrients, mockMicronutrients);
      const plans = deficiencyService.generateRemediationPlan(deficiencies, 2); // 2 hectares
      
      plans.forEach(plan => {
        expect(plan.costEstimate.immediate.min).toBeGreaterThanOrEqual(0);
        expect(plan.costEstimate.immediate.max).toBeGreaterThanOrEqual(plan.costEstimate.immediate.min);
        expect(plan.costEstimate.longTerm.min).toBeGreaterThanOrEqual(0);
        expect(plan.costEstimate.totalPerHectare.min).toBeGreaterThanOrEqual(0);
        expect(plan.costEstimate.paybackPeriod).toBeDefined();
        expect(plan.costEstimate.costBenefitRatio).toBeGreaterThan(0);
      });
    });

    it('should provide seasonal timing information', () => {
      const deficiencies = deficiencyService.identifyDeficiencies(mockNutrients, mockMicronutrients);
      const plans = deficiencyService.generateRemediationPlan(deficiencies, 1);
      
      plans.forEach(plan => {
        expect(plan.seasonalTiming.bestSeason).toBeDefined();
        expect(Array.isArray(plan.seasonalTiming.bestSeason)).toBe(true);
        expect(plan.seasonalTiming.avoidSeasons).toBeDefined();
        expect(Array.isArray(plan.seasonalTiming.monthlySchedule)).toBe(true);
      });
    });

    it('should provide expected results for each deficiency', () => {
      const deficiencies = deficiencyService.identifyDeficiencies(mockNutrients, mockMicronutrients);
      const plans = deficiencyService.generateRemediationPlan(deficiencies, 1);
      
      plans.forEach(plan => {
        expect(plan.expectedResults.timeToImprovement).toBeDefined();
        expect(plan.expectedResults.expectedIncrease).toBeDefined();
        expect(plan.expectedResults.yieldImpact).toBeDefined();
        expect(plan.expectedResults.soilHealthImprovement).toBeDefined();
        expect(Array.isArray(plan.expectedResults.sustainabilityBenefits)).toBe(true);
      });
    });
  });

  describe('getIntegratedRemediationStrategy', () => {
    it('should create integrated strategy for multiple deficiencies', () => {
      const deficiencies = deficiencyService.identifyDeficiencies(mockNutrients, mockMicronutrients);
      const strategy = deficiencyService.getIntegratedRemediationStrategy(deficiencies, 1);
      
      expect(strategy).toBeDefined();
      expect(strategy.prioritizedActions).toBeDefined();
      expect(Array.isArray(strategy.prioritizedActions)).toBe(true);
      expect(strategy.combinedMaterials).toBeDefined();
      expect(strategy.totalCost).toBeDefined();
      expect(strategy.timeline).toBeDefined();
      expect(Array.isArray(strategy.timeline)).toBe(true);
      expect(strategy.synergies).toBeDefined();
      expect(Array.isArray(strategy.synergies)).toBe(true);
      expect(strategy.warnings).toBeDefined();
      expect(Array.isArray(strategy.warnings)).toBe(true);
    });

    it('should prioritize actions by effectiveness', () => {
      const deficiencies = deficiencyService.identifyDeficiencies(mockNutrients, mockMicronutrients);
      const strategy = deficiencyService.getIntegratedRemediationStrategy(deficiencies, 1);
      
      // Actions should be sorted by effectiveness (descending)
      for (let i = 1; i < strategy.prioritizedActions.length; i++) {
        expect(strategy.prioritizedActions[i-1].effectiveness)
          .toBeGreaterThanOrEqual(strategy.prioritizedActions[i].effectiveness);
      }
    });

    it('should provide implementation timeline', () => {
      const deficiencies = deficiencyService.identifyDeficiencies(mockNutrients, mockMicronutrients);
      const strategy = deficiencyService.getIntegratedRemediationStrategy(deficiencies, 1);
      
      expect(strategy.timeline.length).toBeGreaterThan(0);
      strategy.timeline.forEach(phase => {
        expect(phase.phase).toBeDefined();
        expect(phase.duration).toBeDefined();
        expect(Array.isArray(phase.actions)).toBe(true);
        expect(typeof phase.cost).toBe('number');
      });
    });

    it('should identify synergies between treatments', () => {
      const deficiencies = deficiencyService.identifyDeficiencies(mockNutrients, mockMicronutrients);
      const strategy = deficiencyService.getIntegratedRemediationStrategy(deficiencies, 1);
      
      expect(strategy.synergies.length).toBeGreaterThan(0);
      strategy.synergies.forEach(synergy => {
        expect(typeof synergy).toBe('string');
        expect(synergy.length).toBeGreaterThan(0);
      });
    });

    it('should provide warnings for potential issues', () => {
      const deficiencies = deficiencyService.identifyDeficiencies(mockNutrients, mockMicronutrients);
      const strategy = deficiencyService.getIntegratedRemediationStrategy(deficiencies, 1);
      
      expect(strategy.warnings.length).toBeGreaterThan(0);
      strategy.warnings.forEach(warning => {
        expect(typeof warning).toBe('string');
        expect(warning.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Severe Deficiency Scenarios', () => {
    beforeEach(() => {
      // Create severe deficiencies
      mockNutrients.pH.value = 4.2; // Severe acidity
      mockNutrients.nitrogen.value = 80; // Severe nitrogen deficiency
      mockNutrients.potassium.value = 40; // Severe potassium deficiency
      mockMicronutrients.zinc!.value = 0.2; // Severe zinc deficiency
    });

    it('should identify severe deficiencies correctly', () => {
      const deficiencies = deficiencyService.identifyDeficiencies(mockNutrients, mockMicronutrients);
      
      const severeDeficiencies = deficiencies.filter(d => d.deficiencyType === 'severe');
      expect(severeDeficiencies.length).toBeGreaterThan(0);
      
      const pHDeficiency = deficiencies.find(d => d.parameter === 'pH');
      expect(pHDeficiency?.deficiencyType).toBe('severe');
    });

    it('should provide more intensive remediation for severe deficiencies', () => {
      const deficiencies = deficiencyService.identifyDeficiencies(mockNutrients, mockMicronutrients);
      const plans = deficiencyService.generateRemediationPlan(deficiencies, 1);
      
      const severePlans = plans.filter(p => p.deficiency.deficiencyType === 'severe');
      
      severePlans.forEach(plan => {
        // Severe deficiencies should have higher material quantities
        plan.immediateActions.forEach(action => {
          action.materials.forEach(material => {
            const quantity = parseFloat(material.quantity.split('-')[0]);
            expect(quantity).toBeGreaterThan(0);
          });
        });
      });
    });

    it('should have higher effectiveness ratings for severe deficiency treatments', () => {
      const deficiencies = deficiencyService.identifyDeficiencies(mockNutrients, mockMicronutrients);
      const plans = deficiencyService.generateRemediationPlan(deficiencies, 1);
      
      const severePlans = plans.filter(p => p.deficiency.deficiencyType === 'severe');
      
      severePlans.forEach(plan => {
        plan.immediateActions.forEach(action => {
          expect(action.effectiveness).toBeGreaterThan(70); // High effectiveness for severe cases
        });
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle nutrients with missing optimal ranges', () => {
      const nutrientsWithoutOptimal: SoilNutrients = {
        pH: {
          name: 'pH',
          value: 5.0,
          unit: '',
          range: { min: 4.0, max: 9.0 }, // No optimal range
          status: 'deficient',
          confidence: 0.8
        },
        nitrogen: mockNutrients.nitrogen,
        phosphorus: mockNutrients.phosphorus,
        potassium: mockNutrients.potassium
      };

      const deficiencies = deficiencyService.identifyDeficiencies(nutrientsWithoutOptimal, {});
      
      expect(Array.isArray(deficiencies)).toBe(true);
      // Should still identify deficiency even without optimal range
      const pHDeficiency = deficiencies.find(d => d.parameter === 'pH');
      expect(pHDeficiency).toBeDefined();
    });

    it('should handle extreme pH values correctly', () => {
      mockNutrients.pH.value = 3.5; // Extremely acidic
      
      const deficiencies = deficiencyService.identifyDeficiencies(mockNutrients, mockMicronutrients);
      const pHDeficiency = deficiencies.find(d => d.parameter === 'pH');
      
      expect(pHDeficiency?.deficiencyType).toBe('severe');
      expect(pHDeficiency?.impactOnCrops).toContain('Severe nutrient lockup');
    });

    it('should handle alkaline soil conditions', () => {
      mockNutrients.pH.value = 8.8; // Highly alkaline
      
      const deficiencies = deficiencyService.identifyDeficiencies(mockNutrients, mockMicronutrients);
      const pHDeficiency = deficiencies.find(d => d.parameter === 'pH');
      
      expect(pHDeficiency?.deficiencyType).toBe('severe');
      expect(pHDeficiency?.causes).toContain('High lime content');
    });

    it('should handle zero or negative nutrient values', () => {
      mockNutrients.nitrogen.value = 0;
      mockNutrients.potassium.value = -5; // Invalid negative value
      
      const deficiencies = deficiencyService.identifyDeficiencies(mockNutrients, mockMicronutrients);
      
      const nDeficiency = deficiencies.find(d => d.parameter === 'nitrogen');
      const kDeficiency = deficiencies.find(d => d.parameter === 'potassium');
      
      expect(nDeficiency?.deficiencyType).toBe('severe');
      expect(kDeficiency?.deficiencyType).toBe('severe');
    });
  });
});

describe('SoilAnalysisService - Deficiency Integration', () => {
  let soilAnalysisService: SoilAnalysisService;
  let mockAnalysisResult: SoilAnalysisResult;

  beforeEach(() => {
    soilAnalysisService = new SoilAnalysisService();
    
    mockAnalysisResult = {
      reportId: 'SR_123_farmer_456',
      metadata: {
        filename: 'test_report.pdf',
        size: 1024,
        mimeType: 'application/pdf',
        uploadedAt: new Date(),
        farmerId: 'farmer_456'
      },
      extractedData: {
        nutrients: {
          pH: {
            name: 'pH',
            value: 5.5, // Slightly acidic
            unit: '',
            range: { min: 4.0, max: 9.0, optimal: { min: 6.0, max: 7.5 } },
            status: 'deficient',
            confidence: 0.9
          },
          nitrogen: {
            name: 'Nitrogen',
            value: 180,
            unit: 'kg/ha',
            range: { min: 0, max: 500, optimal: { min: 200, max: 300 } },
            status: 'deficient',
            confidence: 0.85
          },
          phosphorus: {
            name: 'Phosphorus',
            value: 30,
            unit: 'kg/ha',
            range: { min: 0, max: 100, optimal: { min: 20, max: 40 } },
            status: 'optimal',
            confidence: 0.8
          },
          potassium: {
            name: 'Potassium',
            value: 100,
            unit: 'kg/ha',
            range: { min: 0, max: 400, optimal: { min: 120, max: 200 } },
            status: 'deficient',
            confidence: 0.9
          }
        },
        micronutrients: {
          zinc: {
            name: 'Zinc',
            value: 0.8,
            unit: 'ppm',
            range: { min: 0, max: 10, optimal: { min: 1.0, max: 3.0 } },
            status: 'deficient',
            confidence: 0.8
          }
        }
      },
      interpretation: {
        overallHealth: 'fair',
        healthScore: 65,
        primaryConcerns: ['pH imbalance', 'Nitrogen deficiency'],
        strengths: ['Adequate phosphorus'],
        recommendations: []
      },
      farmerFriendlyExplanation: {
        summary: 'Your soil needs some improvements',
        keyFindings: ['pH is slightly acidic', 'Nitrogen levels are low'],
        actionItems: ['Apply lime', 'Add nitrogen fertilizer'],
        language: 'en'
      },
      confidence: 0.85,
      processingDate: new Date(),
      anomalies: []
    };
  });

  describe('identifySoilDeficiencies', () => {
    it('should identify deficiencies from nutrients and micronutrients', () => {
      const deficiencies = soilAnalysisService.identifySoilDeficiencies(
        mockAnalysisResult.extractedData.nutrients,
        mockAnalysisResult.extractedData.micronutrients
      );
      
      expect(Array.isArray(deficiencies)).toBe(true);
      expect(deficiencies.length).toBeGreaterThan(0);
      
      // Should find pH, nitrogen, potassium, and zinc deficiencies
      const deficientParameters = deficiencies.map(d => d.parameter);
      expect(deficientParameters).toContain('pH');
      expect(deficientParameters).toContain('nitrogen');
      expect(deficientParameters).toContain('potassium');
      expect(deficientParameters).toContain('zinc');
    });

    it('should not identify deficiencies for optimal nutrients', () => {
      const deficiencies = soilAnalysisService.identifySoilDeficiencies(
        mockAnalysisResult.extractedData.nutrients,
        mockAnalysisResult.extractedData.micronutrients
      );
      
      const deficientParameters = deficiencies.map(d => d.parameter);
      expect(deficientParameters).not.toContain('phosphorus'); // Phosphorus is optimal
    });
  });

  describe('generateDeficiencyRemediationPlan', () => {
    it('should generate remediation plans for identified deficiencies', () => {
      const deficiencies = soilAnalysisService.identifySoilDeficiencies(
        mockAnalysisResult.extractedData.nutrients,
        mockAnalysisResult.extractedData.micronutrients
      );
      
      const plans = soilAnalysisService.generateDeficiencyRemediationPlan(deficiencies, 1);
      
      expect(plans.length).toBe(deficiencies.length);
      plans.forEach(plan => {
        expect(plan.deficiency).toBeDefined();
        expect(plan.immediateActions.length).toBeGreaterThan(0);
        expect(plan.longTermActions.length).toBeGreaterThan(0);
      });
    });

    it('should respect organic preferences in remediation plans', () => {
      const deficiencies = soilAnalysisService.identifySoilDeficiencies(
        mockAnalysisResult.extractedData.nutrients,
        mockAnalysisResult.extractedData.micronutrients
      );
      
      const organicPlans = soilAnalysisService.generateDeficiencyRemediationPlan(
        deficiencies, 
        1, 
        undefined, 
        { organic: true }
      );
      
      // Check that organic materials are used
      organicPlans.forEach(plan => {
        plan.immediateActions.forEach(action => {
          action.materials.forEach(material => {
            expect(['organic', 'biological']).toContain(material.type);
          });
        });
      });
    });
  });

  describe('analyzeDeficienciesFromResult', () => {
    it('should provide complete deficiency analysis from soil analysis result', async () => {
      const analysis = await soilAnalysisService.analyzeDeficienciesFromResult(
        mockAnalysisResult,
        1,
        { organic: false, quickResults: true }
      );
      
      expect(analysis).toBeDefined();
      expect(analysis.deficiencies.length).toBeGreaterThan(0);
      expect(analysis.remediationPlans.length).toBe(analysis.deficiencies.length);
      expect(analysis.integratedStrategy).toBeDefined();
      expect(Array.isArray(analysis.priorityActions)).toBe(true);
      expect(analysis.estimatedCost).toBeDefined();
      expect(analysis.estimatedCost.currency).toBe('INR');
      expect(Array.isArray(analysis.expectedBenefits)).toBe(true);
    });

    it('should handle soil with no deficiencies', async () => {
      // Create result with optimal nutrients
      const optimalResult = { ...mockAnalysisResult };
      optimalResult.extractedData.nutrients.pH.status = 'optimal';
      optimalResult.extractedData.nutrients.nitrogen.status = 'optimal';
      optimalResult.extractedData.nutrients.potassium.status = 'optimal';
      optimalResult.extractedData.micronutrients.zinc!.status = 'optimal';
      
      const analysis = await soilAnalysisService.analyzeDeficienciesFromResult(optimalResult, 1);
      
      expect(analysis.deficiencies.length).toBe(0);
      expect(analysis.remediationPlans.length).toBe(0);
      expect(analysis.priorityActions).toContain('Maintain current soil management practices');
      expect(analysis.estimatedCost.min).toBe(0);
      expect(analysis.estimatedCost.max).toBe(0);
    });

    it('should scale costs appropriately for farm size', async () => {
      const smallFarmAnalysis = await soilAnalysisService.analyzeDeficienciesFromResult(mockAnalysisResult, 1);
      const largeFarmAnalysis = await soilAnalysisService.analyzeDeficienciesFromResult(mockAnalysisResult, 5);
      
      // Per hectare costs should be similar
      expect(smallFarmAnalysis.estimatedCost.min).toBeCloseTo(largeFarmAnalysis.estimatedCost.min, -2);
      expect(smallFarmAnalysis.estimatedCost.max).toBeCloseTo(largeFarmAnalysis.estimatedCost.max, -2);
    });
  });

  describe('getFarmerFriendlyDeficiencyExplanation', () => {
    it('should provide farmer-friendly explanation in English', () => {
      const deficiencies = soilAnalysisService.identifySoilDeficiencies(
        mockAnalysisResult.extractedData.nutrients,
        mockAnalysisResult.extractedData.micronutrients
      );
      
      const explanation = soilAnalysisService.getFarmerFriendlyDeficiencyExplanation(deficiencies, 'en');
      
      expect(explanation.summary).toBeDefined();
      expect(explanation.summary.length).toBeGreaterThan(0);
      expect(Array.isArray(explanation.mainProblems)).toBe(true);
      expect(Array.isArray(explanation.quickSolutions)).toBe(true);
      expect(Array.isArray(explanation.whyItMatters)).toBe(true);
      
      expect(explanation.mainProblems.length).toBeGreaterThan(0);
      expect(explanation.quickSolutions.length).toBeGreaterThan(0);
      expect(explanation.whyItMatters.length).toBeGreaterThan(0);
    });

    it('should provide farmer-friendly explanation in Hindi', () => {
      const deficiencies = soilAnalysisService.identifySoilDeficiencies(
        mockAnalysisResult.extractedData.nutrients,
        mockAnalysisResult.extractedData.micronutrients
      );
      
      const explanation = soilAnalysisService.getFarmerFriendlyDeficiencyExplanation(deficiencies, 'hi');
      
      expect(explanation.summary).toContain('मिट्टी'); // Should contain Hindi text
      expect(explanation.quickSolutions[0]).toContain('मिट्टी'); // Should contain Hindi text
    });

    it('should handle case with no deficiencies', () => {
      const explanation = soilAnalysisService.getFarmerFriendlyDeficiencyExplanation([], 'en');
      
      expect(explanation.summary).toContain('good condition');
      expect(explanation.mainProblems.length).toBe(0);
      expect(explanation.quickSolutions.length).toBeGreaterThan(0);
      expect(explanation.quickSolutions[0]).toContain('Continue current');
    });

    it('should limit number of problems and solutions for clarity', () => {
      const deficiencies = soilAnalysisService.identifySoilDeficiencies(
        mockAnalysisResult.extractedData.nutrients,
        mockAnalysisResult.extractedData.micronutrients
      );
      
      const explanation = soilAnalysisService.getFarmerFriendlyDeficiencyExplanation(deficiencies, 'en');
      
      expect(explanation.mainProblems.length).toBeLessThanOrEqual(3);
      expect(explanation.quickSolutions.length).toBeLessThanOrEqual(3);
      expect(explanation.whyItMatters.length).toBeLessThanOrEqual(3);
    });
  });
});

// ==================== CROP RECOMMENDATION INTEGRATION TESTS ====================

describe('SoilAnalysisService - Crop Recommendation Integration', () => {
  let soilService: SoilAnalysisService;
  let mockSoilAnalysisResult: SoilAnalysisResult;

  beforeEach(() => {
    soilService = new SoilAnalysisService();
    
    // Create mock soil analysis result for testing
    mockSoilAnalysisResult = {
      reportId: 'SR_TEST_001',
      metadata: {
        filename: 'test-soil-report.pdf',
        size: 1024,
        mimeType: 'application/pdf',
        uploadedAt: new Date(),
        farmerId: 'FARMER_001'
      },
      extractedData: {
        nutrients: {
          pH: { name: 'pH', value: 6.5, unit: '', range: { min: 4.0, max: 9.0, optimal: { min: 6.0, max: 7.5 } }, status: 'optimal' as const, confidence: 0.9 },
          nitrogen: { name: 'Nitrogen', value: 220, unit: 'kg/ha', range: { min: 0, max: 500, optimal: { min: 200, max: 300 } }, status: 'optimal' as const, confidence: 0.8 },
          phosphorus: { name: 'Phosphorus', value: 25, unit: 'kg/ha', range: { min: 0, max: 100, optimal: { min: 20, max: 40 } }, status: 'optimal' as const, confidence: 0.8 },
          potassium: { name: 'Potassium', value: 150, unit: 'kg/ha', range: { min: 0, max: 400, optimal: { min: 120, max: 200 } }, status: 'optimal' as const, confidence: 0.8 }
        },
        micronutrients: {
          zinc: { name: 'Zinc', value: 2.0, unit: 'ppm', range: { min: 0, max: 10, optimal: { min: 1.0, max: 3.0 } }, status: 'optimal' as const, confidence: 0.7 }
        }
      },
      interpretation: {
        overallHealth: 'good',
        healthScore: 85,
        primaryConcerns: [],
        strengths: ['Good pH balance', 'Adequate nutrient levels'],
        recommendations: []
      },
      farmerFriendlyExplanation: {
        summary: 'Your soil is in good condition',
        keyFindings: ['pH is optimal', 'Nutrients are adequate'],
        actionItems: ['Continue current practices'],
        language: 'en'
      },
      confidence: 0.85,
      processingDate: new Date(),
      anomalies: []
    };
  });

  describe('getCropRecommendationsFromSoilData', () => {
    it('should generate crop recommendations based on soil analysis', async () => {
      const result = await soilService.getCropRecommendationsFromSoilData(mockSoilAnalysisResult);

      expect(result).toBeDefined();
      expect(result.totalCropsAnalyzed).toBeGreaterThan(0);
      expect(result.topRecommendations).toBeInstanceOf(Array);
      expect(result.soilLimitations).toBeInstanceOf(Array);
      expect(result.seasonalRecommendations).toBeDefined();
      expect(result.seasonalRecommendations.kharif).toBeInstanceOf(Array);
      expect(result.seasonalRecommendations.rabi).toBeInstanceOf(Array);
    });

    it('should return suitable crops with high suitability scores', async () => {
      const result = await soilService.getCropRecommendationsFromSoilData(mockSoilAnalysisResult);

      expect(result.suitableCrops).toBeGreaterThan(0);
      result.topRecommendations.forEach(crop => {
        expect(crop.suitabilityScore).toBeGreaterThanOrEqual(40);
        expect(crop.cropName).toBeDefined();
        expect(crop.localName).toBeDefined();
        expect(crop.season).toMatch(/^(kharif|rabi|zaid|perennial)$/);
      });
    });

    it('should include soil compatibility analysis', async () => {
      const result = await soilService.getCropRecommendationsFromSoilData(mockSoilAnalysisResult);

      result.topRecommendations.forEach(crop => {
        expect(crop.soilCompatibility).toBeDefined();
        expect(crop.soilCompatibility.pHSuitability).toBeGreaterThanOrEqual(0);
        expect(crop.soilCompatibility.pHSuitability).toBeLessThanOrEqual(100);
        expect(crop.soilCompatibility.nutrientSuitability).toBeGreaterThanOrEqual(0);
        expect(crop.soilCompatibility.overallSoilMatch).toBeGreaterThanOrEqual(0);
        expect(crop.soilCompatibility.limitingFactors).toBeInstanceOf(Array);
      });
    });

    it('should provide profitability projections', async () => {
      const result = await soilService.getCropRecommendationsFromSoilData(mockSoilAnalysisResult);

      result.topRecommendations.forEach(crop => {
        expect(crop.projections).toBeDefined();
        expect(crop.projections.expectedYield).toBeDefined();
        expect(crop.projections.marketPrice).toBeDefined();
        expect(crop.projections.profitability).toBeDefined();
        expect(crop.projections.profitability.roi).toBeGreaterThanOrEqual(-100);
        expect(crop.projections.riskFactors).toBeInstanceOf(Array);
      });
    });

    it('should include soil improvement recommendations', async () => {
      const result = await soilService.getCropRecommendationsFromSoilData(mockSoilAnalysisResult);

      result.topRecommendations.forEach(crop => {
        expect(crop.soilImprovements).toBeDefined();
        expect(crop.soilImprovements.requiredAmendments).toBeInstanceOf(Array);
        expect(crop.soilImprovements.fertilizationPlan).toBeInstanceOf(Array);
        expect(crop.soilImprovements.estimatedCost).toBeDefined();
      });
    });

    it('should filter crops by season when specified', async () => {
      const kharifResult = await soilService.getCropRecommendationsFromSoilData(
        mockSoilAnalysisResult,
        { season: 'kharif' }
      );

      kharifResult.topRecommendations.forEach(crop => {
        expect(crop.season).toBe('kharif');
      });

      const rabiResult = await soilService.getCropRecommendationsFromSoilData(
        mockSoilAnalysisResult,
        { season: 'rabi' }
      );

      rabiResult.topRecommendations.forEach(crop => {
        expect(crop.season).toBe('rabi');
      });
    });

    it('should limit results based on maxRecommendations option', async () => {
      const result = await soilService.getCropRecommendationsFromSoilData(
        mockSoilAnalysisResult,
        { maxRecommendations: 3 }
      );

      expect(result.topRecommendations.length).toBeLessThanOrEqual(3);
    });
  });

  describe('getSeasonalCropRecommendations', () => {
    it('should return crops for specific season', async () => {
      const kharifCrops = await soilService.getSeasonalCropRecommendations(
        mockSoilAnalysisResult,
        'kharif'
      );

      expect(kharifCrops).toBeInstanceOf(Array);
      kharifCrops.forEach(crop => {
        expect(crop.season).toBe('kharif');
      });

      const rabiCrops = await soilService.getSeasonalCropRecommendations(
        mockSoilAnalysisResult,
        'rabi'
      );

      expect(rabiCrops).toBeInstanceOf(Array);
      rabiCrops.forEach(crop => {
        expect(crop.season).toBe('rabi');
      });
    });
  });

  describe('getCropRecommendationsWithSoilImprovement', () => {
    it('should provide current and improved recommendations', async () => {
      const result = await soilService.getCropRecommendationsWithSoilImprovement(mockSoilAnalysisResult);

      expect(result.currentSuitability).toBeInstanceOf(Array);
      expect(result.withImprovements).toBeInstanceOf(Array);
      expect(result.improvementPlan).toBeDefined();
      expect(result.improvementPlan.amendments).toBeInstanceOf(Array);
      expect(result.improvementPlan.totalCost).toBeDefined();
      expect(result.improvementPlan.expectedBenefits).toBeInstanceOf(Array);
    });

    it('should show improvement in suitability scores', async () => {
      // Create deficient soil for better testing
      const deficientSoilResult = {
        ...mockSoilAnalysisResult,
        extractedData: {
          ...mockSoilAnalysisResult.extractedData,
          nutrients: {
            ...mockSoilAnalysisResult.extractedData.nutrients,
            pH: { name: 'pH', value: 5.0, unit: '', range: { min: 4.0, max: 9.0 }, status: 'deficient' as const, confidence: 0.9 },
            nitrogen: { name: 'Nitrogen', value: 80, unit: 'kg/ha', range: { min: 0, max: 500 }, status: 'deficient' as const, confidence: 0.8 }
          }
        }
      };

      const result = await soilService.getCropRecommendationsWithSoilImprovement(deficientSoilResult);

      // Compare same crops in both lists
      const currentCrop = result.currentSuitability[0];
      const improvedCrop = result.withImprovements.find(c => c.cropName === currentCrop?.cropName);

      if (currentCrop && improvedCrop) {
        expect(improvedCrop.suitabilityScore).toBeGreaterThanOrEqual(currentCrop.suitabilityScore);
      }
    });

    it('should include realistic improvement plan', async () => {
      const result = await soilService.getCropRecommendationsWithSoilImprovement(mockSoilAnalysisResult);

      expect(result.improvementPlan.timeline).toBeDefined();
      expect(result.improvementPlan.totalCost.min).toBeGreaterThan(0);
      expect(result.improvementPlan.totalCost.max).toBeGreaterThan(result.improvementPlan.totalCost.min);
      expect(result.improvementPlan.totalCost.currency).toBe('INR');
    });
  });

  describe('compareCropSuitabilityWithImprovements', () => {
    it('should compare specific crop before and after improvements', async () => {
      const result = await soilService.compareCropSuitabilityWithImprovements(
        mockSoilAnalysisResult,
        'Rice'
      );

      expect(result.current).toBeDefined();
      expect(result.improved).toBeDefined();
      expect(result.improvementBenefits).toBeDefined();
      expect(result.improvementBenefits.suitabilityIncrease).toBeGreaterThanOrEqual(0);
      expect(result.improvementBenefits.yieldIncrease).toBeDefined();
      expect(result.improvementBenefits.profitabilityIncrease).toBeGreaterThanOrEqual(0);
    });

    it('should handle crop not found gracefully', async () => {
      const result = await soilService.compareCropSuitabilityWithImprovements(
        mockSoilAnalysisResult,
        'NonExistentCrop'
      );

      expect(result.current).toBeNull();
      expect(result.improved).toBeNull();
      expect(result.improvementBenefits.suitabilityIncrease).toBe(0);
    });
  });

  describe('getFarmerFriendlyCropRecommendations', () => {
    it('should provide farmer-friendly explanations in English', async () => {
      const recommendations = await soilService.getCropRecommendationsFromSoilData(mockSoilAnalysisResult);
      const friendlyExplanation = soilService.getFarmerFriendlyCropRecommendations(
        recommendations.topRecommendations,
        'en'
      );

      expect(friendlyExplanation.summary).toBeDefined();
      expect(friendlyExplanation.topCrops).toBeInstanceOf(Array);
      expect(friendlyExplanation.soilPreparation).toBeInstanceOf(Array);
      expect(friendlyExplanation.seasonalAdvice).toBeDefined();

      friendlyExplanation.topCrops.forEach(crop => {
        expect(crop.name).toBeDefined();
        expect(crop.whyGood).toBeDefined();
        expect(crop.expectedIncome).toBeDefined();
        expect(crop.mainRequirements).toBeInstanceOf(Array);
        expect(crop.riskLevel).toMatch(/^(Low risk|Medium risk|High risk)$/);
      });
    });

    it('should provide farmer-friendly explanations in Hindi', async () => {
      const recommendations = await soilService.getCropRecommendationsFromSoilData(mockSoilAnalysisResult);
      const friendlyExplanation = soilService.getFarmerFriendlyCropRecommendations(
        recommendations.topRecommendations,
        'hi'
      );

      expect(friendlyExplanation.summary).toContain('मिट्टी');
      expect(friendlyExplanation.topCrops).toBeInstanceOf(Array);
      expect(friendlyExplanation.soilPreparation).toBeInstanceOf(Array);
      expect(friendlyExplanation.seasonalAdvice).toBeDefined();

      friendlyExplanation.topCrops.forEach(crop => {
        expect(crop.riskLevel).toMatch(/^(कम जोखिम|मध्यम जोखिम|अधिक जोखिम)$/);
      });
    });

    it('should handle empty recommendations gracefully', () => {
      const friendlyExplanation = soilService.getFarmerFriendlyCropRecommendations([], 'en');

      expect(friendlyExplanation.summary).toContain('No suitable crops');
      expect(friendlyExplanation.topCrops).toHaveLength(0);
      expect(friendlyExplanation.soilPreparation).toBeInstanceOf(Array);
      expect(friendlyExplanation.soilPreparation.length).toBeGreaterThan(0);
    });
  });

  describe('Crop Database and Suitability Analysis', () => {
    it('should have comprehensive crop database', async () => {
      const result = await soilService.getCropRecommendationsFromSoilData(mockSoilAnalysisResult);

      expect(result.totalCropsAnalyzed).toBeGreaterThan(5);
      expect(result.seasonalRecommendations.kharif.length).toBeGreaterThan(0);
      expect(result.seasonalRecommendations.rabi.length).toBeGreaterThan(0);
    });

    it('should calculate suitability scores correctly', async () => {
      const result = await soilService.getCropRecommendationsFromSoilData(mockSoilAnalysisResult);

      result.topRecommendations.forEach(crop => {
        expect(crop.suitabilityScore).toBeGreaterThanOrEqual(0);
        expect(crop.suitabilityScore).toBeLessThanOrEqual(100);
        expect(crop.confidence).toBeGreaterThan(0);
        expect(crop.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should identify soil limitations correctly', async () => {
      // Test with deficient soil
      const deficientSoilResult = {
        ...mockSoilAnalysisResult,
        extractedData: {
          ...mockSoilAnalysisResult.extractedData,
          nutrients: {
            ...mockSoilAnalysisResult.extractedData.nutrients,
            pH: { name: 'pH', value: 4.5, unit: '', range: { min: 4.0, max: 9.0 }, status: 'deficient' as const, confidence: 0.9 },
            nitrogen: { name: 'Nitrogen', value: 50, unit: 'kg/ha', range: { min: 0, max: 500 }, status: 'deficient' as const, confidence: 0.8 },
            phosphorus: { name: 'Phosphorus', value: 8, unit: 'kg/ha', range: { min: 0, max: 100 }, status: 'deficient' as const, confidence: 0.8 }
          }
        }
      };

      const result = await soilService.getCropRecommendationsFromSoilData(deficientSoilResult);

      expect(result.soilLimitations.length).toBeGreaterThan(0);
      result.soilLimitations.forEach(limitation => {
        expect(limitation.parameter).toBeDefined();
        expect(limitation.currentValue).toBeDefined();
        expect(limitation.optimalRange).toBeDefined();
        expect(limitation.impact).toBeDefined();
        expect(limitation.improvementSuggestions).toBeInstanceOf(Array);
        expect(limitation.improvementSuggestions.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Integration with Existing Soil Analysis', () => {
    it('should work with complete soil analysis workflow', async () => {
      // Test integration with existing soil analysis methods
      const mockOCRResult = {
        extractedText: 'pH: 6.5, Nitrogen: 220 kg/ha, Phosphorus: 25 kg/ha, Potassium: 150 kg/ha',
        confidence: 0.85,
        language: 'en',
        structuredData: {
          parameters: [
            { name: 'pH', value: '6.5', confidence: 0.9 },
            { name: 'Nitrogen', value: '220', confidence: 0.8 },
            { name: 'Phosphorus', value: '25', confidence: 0.8 },
            { name: 'Potassium', value: '150', confidence: 0.8 }
          ]
        },
        processingTime: 1500
      };

      const mockBuffer = Buffer.from('mock soil report content');
      const mockMetadata = {
        filename: 'soil-report.pdf',
        size: 1024,
        mimeType: 'application/pdf',
        uploadedAt: new Date(),
        farmerId: 'FARMER_001'
      };

      // Mock OCR service
      jest.spyOn(soilService['ocrService'], 'processDocument').mockResolvedValue(mockOCRResult);

      const analysisResult = await soilService.uploadAndProcessSoilReport(mockBuffer, mockMetadata);
      const cropRecommendations = await soilService.getCropRecommendationsFromSoilData(analysisResult);

      expect(analysisResult).toBeDefined();
      expect(cropRecommendations).toBeDefined();
      expect(cropRecommendations.topRecommendations.length).toBeGreaterThan(0);
    });

    it('should provide comprehensive analysis combining soil health and crop recommendations', async () => {
      const deficiencies = soilService.identifySoilDeficiencies(
        mockSoilAnalysisResult.extractedData.nutrients,
        mockSoilAnalysisResult.extractedData.micronutrients
      );

      const cropRecommendations = await soilService.getCropRecommendationsFromSoilData(mockSoilAnalysisResult);

      const deficiencyAnalysis = await soilService.analyzeDeficienciesFromResult(
        mockSoilAnalysisResult,
        1.0 // 1 hectare
      );

      expect(deficiencies).toBeInstanceOf(Array);
      expect(cropRecommendations.topRecommendations).toBeInstanceOf(Array);
      expect(deficiencyAnalysis.deficiencies).toBeInstanceOf(Array);
      expect(deficiencyAnalysis.priorityActions).toBeInstanceOf(Array);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing soil parameters gracefully', async () => {
      const incompleteSoilResult = {
        ...mockSoilAnalysisResult,
        extractedData: {
          nutrients: {
            pH: { name: 'pH', value: 6.5, unit: '', range: { min: 4.0, max: 9.0 }, status: 'optimal' as const, confidence: 0.9 },
            nitrogen: { name: 'Nitrogen', value: 220, unit: 'kg/ha', range: { min: 0, max: 500 }, status: 'optimal' as const, confidence: 0.8 },
            phosphorus: { name: 'Phosphorus', value: 25, unit: 'kg/ha', range: { min: 0, max: 100 }, status: 'optimal' as const, confidence: 0.8 },
            potassium: { name: 'Potassium', value: 150, unit: 'kg/ha', range: { min: 0, max: 400 }, status: 'optimal' as const, confidence: 0.8 }
          },
          micronutrients: {}
        }
      };

      const result = await soilService.getCropRecommendationsFromSoilData(incompleteSoilResult);

      expect(result).toBeDefined();
      expect(result.topRecommendations).toBeInstanceOf(Array);
      // Should still provide some recommendations even with incomplete data
    });

    it('should handle extreme soil values', async () => {
      const extremeSoilResult = {
        ...mockSoilAnalysisResult,
        extractedData: {
          ...mockSoilAnalysisResult.extractedData,
          nutrients: {
            ...mockSoilAnalysisResult.extractedData.nutrients,
            pH: { name: 'pH', value: 3.0, unit: '', range: { min: 4.0, max: 9.0 }, status: 'deficient' as const, confidence: 0.9 },
            nitrogen: { name: 'Nitrogen', value: 0, unit: 'kg/ha', range: { min: 0, max: 500 }, status: 'deficient' as const, confidence: 0.8 }
          }
        }
      };

      const result = await soilService.getCropRecommendationsFromSoilData(extremeSoilResult);

      expect(result).toBeDefined();
      expect(result.soilLimitations.length).toBeGreaterThan(0);
      // Should identify multiple limitations
    });

    it('should validate crop recommendation options', async () => {
      const invalidOptions = {
        season: 'invalid_season' as any,
        maxRecommendations: -1,
        farmSize: -5
      };

      // Should handle invalid options gracefully
      const result = await soilService.getCropRecommendationsFromSoilData(
        mockSoilAnalysisResult,
        invalidOptions
      );

      expect(result).toBeDefined();
      expect(result.topRecommendations).toBeInstanceOf(Array);
    });
  });
});