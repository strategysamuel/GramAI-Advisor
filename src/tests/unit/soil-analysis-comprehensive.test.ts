// Comprehensive Unit Tests for Soil Analysis Functionality
// Tests all soil analysis service components with extensive coverage

import SoilAnalysisService from '../../services/soil-analysis';
import OCRProcessingService from '../../services/soil-analysis/services/OCRProcessingService';
import SoilParameterExplanationService from '../../services/soil-analysis/services/SoilParameterExplanationService';
import SoilDeficiencyService from '../../services/soil-analysis/services/SoilDeficiencyService';
import SoilDataValidationService from '../../services/soil-analysis/services/SoilDataValidationService';
import {
  SoilReportMetadata,
  SoilReportUploadOptions,
  SoilParameter,
  SoilNutrients,
  Micronutrients,
  SoilAnalysisResult,
  OCRResult,
  SoilAnomaly,
  SoilRecommendation
} from '../../services/soil-analysis/types';

describe('Comprehensive Soil Analysis Tests', () => {
  let soilAnalysisService: SoilAnalysisService;
  let ocrService: OCRProcessingService;
  let explanationService: SoilParameterExplanationService;
  let deficiencyService: SoilDeficiencyService;
  let validationService: SoilDataValidationService;

  beforeEach(() => {
    soilAnalysisService = new SoilAnalysisService();
    ocrService = new OCRProcessingService();
    explanationService = new SoilParameterExplanationService();
    deficiencyService = new SoilDeficiencyService();
    validationService = new SoilDataValidationService();
  });

  // Helper function to create mock soil parameters
  const createMockParameter = (name: string, value: number, unit: string, status: 'deficient' | 'adequate' | 'excessive' | 'optimal' = 'adequate'): SoilParameter => ({
    name,
    value,
    unit,
    range: { min: 0, max: 100, optimal: { min: 20, max: 80 } },
    status,
    confidence: 0.8
  });

  // Helper function to create mock nutrients
  const createMockNutrients = (): SoilNutrients => ({
    pH: createMockParameter('pH', 6.8, ''),
    nitrogen: createMockParameter('Nitrogen', 245, 'kg/ha'),
    phosphorus: createMockParameter('Phosphorus', 18, 'kg/ha'),
    potassium: createMockParameter('Potassium', 156, 'kg/ha'),
    organicCarbon: createMockParameter('Organic Carbon', 0.65, '%'),
    electricalConductivity: createMockParameter('Electrical Conductivity', 0.45, 'dS/m')
  });

  // Helper function to create mock micronutrients
  const createMockMicronutrients = (): Micronutrients => ({
    zinc: createMockParameter('Zinc', 0.8, 'ppm'),
    iron: createMockParameter('Iron', 12.5, 'ppm'),
    manganese: createMockParameter('Manganese', 8.2, 'ppm'),
    copper: createMockParameter('Copper', 1.2, 'ppm')
  });

  describe('SoilAnalysisService - Core Functionality', () => {
    let mockDocumentBuffer: Buffer;
    let mockMetadata: SoilReportMetadata;

    beforeEach(() => {
      mockDocumentBuffer = Buffer.from('mock soil report content');
      mockMetadata = {
        filename: 'soil_report.pdf',
        size: 1024,
        mimeType: 'application/pdf',
        uploadedAt: new Date(),
        farmerId: 'farmer_123',
        location: { latitude: 28.6139, longitude: 77.2090 },
        reportDate: new Date('2024-01-20'),
        laboratoryName: 'Test Lab',
        sampleId: 'SMP_001'
      };
    });

    describe('Enhanced Data Extraction', () => {
      it('should extract soil parameters with enhanced pattern matching', async () => {
        const mockOCRResult: OCRResult = {
          extractedText: 'pH: 6.8\nAvailable N: 245 kg/ha\nP2O5: 18 kg/ha\nK2O: 156 kg/ha\nZn: 0.8 ppm',
          confidence: 0.85,
          language: 'en',
          processingTime: 300,
          structuredData: {
            parameters: [
              { name: 'pH', value: '6.8', confidence: 0.9 },
              { name: 'Nitrogen', value: '245', unit: 'kg/ha', confidence: 0.8 }
            ]
          }
        };

        const result = await soilAnalysisService.extractSoilDataEnhanced(mockOCRResult, {
          enableFuzzyMatching: true,
          normalizeUnits: true,
          validateRanges: true
        });

        expect(result.nutrients).toBeDefined();
        expect(result.micronutrients).toBeDefined();
        expect(result.extractionMetadata.totalParametersFound).toBeGreaterThan(0);
        expect(result.extractionMetadata.confidenceScore).toBeGreaterThan(0);
        expect(result.validation).toBeDefined();
      });

      it('should handle parameter name variations correctly', async () => {
        const mockOCRResult: OCRResult = {
          extractedText: 'Available Nitrogen: 245\nP2O5: 18\nK2O: 156\nZinc: 0.8',
          confidence: 0.85,
          language: 'en',
          processingTime: 300
        };

        const result = await soilAnalysisService.extractSoilDataEnhanced(mockOCRResult);

        expect(result.nutrients.nitrogen?.value).toBe(245);
        expect(result.nutrients.phosphorus?.value).toBeGreaterThan(0);
        expect(result.nutrients.potassium?.value).toBe(156);
      });

      it('should provide detailed extraction statistics', async () => {
        const mockOCRResult: OCRResult = {
          extractedText: 'pH: 6.8\nNitrogen: 245 kg/ha\nPhosphorus: 18 kg/ha',
          confidence: 0.85,
          language: 'en',
          processingTime: 300
        };

        const stats = await soilAnalysisService.getExtractionStatistics(mockOCRResult);

        expect(stats.totalParametersFound).toBeGreaterThanOrEqual(0);
        expect(stats.confidenceScore).toBeGreaterThanOrEqual(0);
        expect(stats.extractionMethod).toBe('enhanced_pattern_matching');
        expect(stats.processingTime).toBeGreaterThan(0);
        expect(Array.isArray(stats.warnings)).toBe(true);
        expect(stats.validationIssues).toBeGreaterThanOrEqual(0);
      });

      it('should generate appropriate extraction warnings', async () => {
        const mockOCRResult: OCRResult = {
          extractedText: 'pH: 6.8',
          confidence: 0.5, // Low confidence
          language: 'en',
          processingTime: 300,
          structuredData: {
            parameters: [
              { name: 'pH', value: '6.8', confidence: 0.5 } // Low confidence parameter
            ]
          }
        };

        const result = await soilAnalysisService.extractSoilDataEnhanced(mockOCRResult);

        expect(result.extractionMetadata.warnings.length).toBeGreaterThan(0);
        expect(result.extractionMetadata.warnings.some(w => w.includes('low confidence'))).toBe(true);
      });
    });

    describe('Comprehensive Validation', () => {
      it('should perform comprehensive soil data validation', async () => {
        const nutrients = createMockNutrients();
        const micronutrients = createMockMicronutrients();

        const validationReport = await soilAnalysisService.getValidationReport(nutrients, micronutrients, {
          strictMode: true,
          enableStatisticalAnalysis: true,
          enableCrossParameterValidation: true
        });

        expect(validationReport.validationResult).toBeDefined();
        expect(validationReport.summary).toBeDefined();
        expect(validationReport.summary.overallStatus).toMatch(/^(VALID|WARNING|ERROR|CRITICAL)$/);
        expect(validationReport.summary.confidence).toBeGreaterThanOrEqual(0);
        expect(validationReport.summary.issueCount).toBeGreaterThanOrEqual(0);
        expect(Array.isArray(validationReport.recommendations)).toBe(true);
      });

      it('should detect anomalies comprehensively', async () => {
        const result = await soilAnalysisService.uploadAndProcessSoilReport(
          mockDocumentBuffer,
          mockMetadata
        );

        expect(Array.isArray(result.anomalies)).toBe(true);
        
        result.anomalies.forEach(anomaly => {
          expect(anomaly.parameter).toBeDefined();
          expect(anomaly.issue).toBeDefined();
          expect(['low', 'medium', 'high']).toContain(anomaly.severity);
          expect(anomaly.description).toBeDefined();
          expect(Array.isArray(anomaly.possibleCauses)).toBe(true);
          expect(anomaly.recommendedAction).toBeDefined();
        });
      });

      it('should validate with different options', async () => {
        const nutrients = createMockNutrients();
        const micronutrients = createMockMicronutrients();

        const strictValidation = await validationService.validateSoilData(nutrients, micronutrients, {
          strictMode: true,
          confidenceThreshold: 0.9
        });

        const normalValidation = await validationService.validateSoilData(nutrients, micronutrients, {
          strictMode: false,
          confidenceThreshold: 0.7
        });

        expect(strictValidation.confidence).toBeLessThanOrEqual(normalValidation.confidence);
      });
    });

    describe('Farmer-Friendly Explanations', () => {
      it('should generate explanations for different literacy levels', () => {
        const mockParameter = createMockParameter('pH', 6.8, '');

        const basicExplanation = soilAnalysisService.getParameterExplanation(mockParameter, 'en', 'basic');
        const advancedExplanation = soilAnalysisService.getParameterExplanation(mockParameter, 'en', 'advanced');

        expect(basicExplanation.simpleExplanation).toBeDefined();
        expect(advancedExplanation.simpleExplanation).toBeDefined();
        expect(advancedExplanation.simpleExplanation.length).toBeGreaterThan(basicExplanation.simpleExplanation.length);
      });

      it('should provide comprehensive soil health explanations', () => {
        const nutrients = createMockNutrients();
        const micronutrients = createMockMicronutrients();

        const healthExplanation = soilAnalysisService.getSoilHealthExplanation(
          nutrients,
          micronutrients,
          'good',
          75,
          'en'
        );

        expect(healthExplanation.overallMessage).toBeDefined();
        expect(Array.isArray(healthExplanation.keyPoints)).toBe(true);
        expect(Array.isArray(healthExplanation.immediateActions)).toBe(true);
        expect(Array.isArray(healthExplanation.seasonalAdvice)).toBe(true);
        expect(healthExplanation.language).toBe('en');
      });

      it('should generate voice-friendly explanations', () => {
        const mockResult: SoilAnalysisResult = {
          reportId: 'SR_123',
          metadata: mockMetadata,
          extractedData: {
            nutrients: createMockNutrients(),
            micronutrients: createMockMicronutrients()
          },
          interpretation: {
            overallHealth: 'good',
            healthScore: 75,
            primaryConcerns: ['Low phosphorus'],
            strengths: ['Good pH level'],
            recommendations: []
          },
          farmerFriendlyExplanation: {
            summary: 'Your soil is in good condition',
            keyFindings: ['pH is optimal'],
            actionItems: ['Apply phosphorus fertilizer'],
            language: 'en'
          },
          confidence: 0.8,
          processingDate: new Date(),
          anomalies: []
        };

        const voiceExplanation = soilAnalysisService.getVoiceFriendlyExplanation(mockResult, 'en');

        expect(voiceExplanation.shortSummary).toBeDefined();
        expect(Array.isArray(voiceExplanation.keyPoints)).toBe(true);
        expect(Array.isArray(voiceExplanation.actionItems)).toBe(true);
        expect(voiceExplanation.keyPoints.length).toBeLessThanOrEqual(3); // Limited for voice
      });

      it('should explain soil changes between reports', () => {
        const previousResult: SoilAnalysisResult = {
          reportId: 'SR_122',
          metadata: mockMetadata,
          extractedData: {
            nutrients: {
              ...createMockNutrients(),
              nitrogen: createMockParameter('Nitrogen', 200, 'kg/ha')
            },
            micronutrients: createMockMicronutrients()
          },
          interpretation: {
            overallHealth: 'fair',
            healthScore: 65,
            primaryConcerns: [],
            strengths: [],
            recommendations: []
          },
          farmerFriendlyExplanation: {
            summary: '',
            keyFindings: [],
            actionItems: [],
            language: 'en'
          },
          confidence: 0.8,
          processingDate: new Date(),
          anomalies: []
        };

        const currentResult: SoilAnalysisResult = {
          ...previousResult,
          reportId: 'SR_123',
          extractedData: {
            nutrients: {
              ...createMockNutrients(),
              nitrogen: createMockParameter('Nitrogen', 245, 'kg/ha')
            },
            micronutrients: createMockMicronutrients()
          },
          interpretation: {
            overallHealth: 'good',
            healthScore: 75,
            primaryConcerns: [],
            strengths: [],
            recommendations: []
          }
        };

        const changes = soilAnalysisService.explainSoilChanges(previousResult, currentResult, 'en');

        expect(changes.overallChange).toBeDefined();
        expect(Array.isArray(changes.parameterChanges)).toBe(true);
        expect(Array.isArray(changes.nextSteps)).toBe(true);

        const nitrogenChange = changes.parameterChanges.find(c => c.parameter === 'Nitrogen');
        expect(nitrogenChange).toBeDefined();
        expect(['improved', 'declined', 'stable']).toContain(nitrogenChange?.change);
      });
    });

    describe('Deficiency Analysis', () => {
      it('should identify soil deficiencies correctly', () => {
        const deficientNutrients: SoilNutrients = {
          pH: createMockParameter('pH', 5.2, '', 'deficient'),
          nitrogen: createMockParameter('Nitrogen', 120, 'kg/ha', 'deficient'),
          phosphorus: createMockParameter('Phosphorus', 8, 'kg/ha', 'deficient'),
          potassium: createMockParameter('Potassium', 80, 'kg/ha', 'deficient')
        };

        const deficientMicronutrients: Micronutrients = {
          zinc: createMockParameter('Zinc', 0.3, 'ppm', 'deficient'),
          iron: createMockParameter('Iron', 5.0, 'ppm', 'deficient')
        };

        const deficiencies = soilAnalysisService.identifySoilDeficiencies(
          deficientNutrients,
          deficientMicronutrients
        );

        expect(deficiencies.length).toBeGreaterThan(0);
        
        deficiencies.forEach(deficiency => {
          expect(deficiency.parameter).toBeDefined();
          expect(['severe', 'moderate', 'mild']).toContain(deficiency.deficiencyType);
          expect(deficiency.currentValue).toBeGreaterThanOrEqual(0);
          expect(deficiency.optimalRange).toBeDefined();
          expect(Array.isArray(deficiency.impactOnCrops)).toBe(true);
          expect(Array.isArray(deficiency.symptoms)).toBe(true);
          expect(Array.isArray(deficiency.causes)).toBe(true);
        });
      });

      it('should generate comprehensive remediation plans', () => {
        const deficientNutrients: SoilNutrients = {
          pH: createMockParameter('pH', 5.2, '', 'deficient'),
          nitrogen: createMockParameter('Nitrogen', 120, 'kg/ha', 'deficient'),
          phosphorus: createMockParameter('Phosphorus', 8, 'kg/ha', 'deficient'),
          potassium: createMockParameter('Potassium', 80, 'kg/ha', 'deficient')
        };

        const deficiencies = soilAnalysisService.identifySoilDeficiencies(deficientNutrients, {});
        const remediationPlans = soilAnalysisService.generateDeficiencyRemediationPlan(
          deficiencies,
          2, // 2 hectares
          { min: 10000, max: 50000 },
          { organic: true, quickResults: false, sustainableFocus: true }
        );

        expect(remediationPlans.length).toBeGreaterThan(0);
        
        remediationPlans.forEach(plan => {
          expect(plan.deficiency).toBeDefined();
          expect(Array.isArray(plan.immediateActions)).toBe(true);
          expect(Array.isArray(plan.longTermActions)).toBe(true);
          expect(plan.seasonalTiming).toBeDefined();
          expect(plan.costEstimate).toBeDefined();
          expect(plan.expectedResults).toBeDefined();
        });
      });

      it('should provide integrated remediation strategy', () => {
        const deficientNutrients: SoilNutrients = {
          pH: createMockParameter('pH', 5.2, '', 'deficient'),
          nitrogen: createMockParameter('Nitrogen', 120, 'kg/ha', 'deficient'),
          phosphorus: createMockParameter('Phosphorus', 8, 'kg/ha', 'deficient'),
          potassium: createMockParameter('Potassium', 80, 'kg/ha', 'deficient')
        };

        const deficiencies = soilAnalysisService.identifySoilDeficiencies(deficientNutrients, {});
        const strategy = soilAnalysisService.getIntegratedRemediationStrategy(deficiencies, 1);

        expect(Array.isArray(strategy.prioritizedActions)).toBe(true);
        expect(Array.isArray(strategy.combinedMaterials)).toBe(true);
        expect(strategy.totalCost).toBeDefined();
        expect(Array.isArray(strategy.timeline)).toBe(true);
        expect(Array.isArray(strategy.synergies)).toBe(true);
        expect(Array.isArray(strategy.warnings)).toBe(true);
      });

      it('should analyze deficiencies from soil analysis result', async () => {
        const mockResult: SoilAnalysisResult = {
          reportId: 'SR_123',
          metadata: mockMetadata,
          extractedData: {
            nutrients: {
              pH: createMockParameter('pH', 5.2, '', 'deficient'),
              nitrogen: createMockParameter('Nitrogen', 120, 'kg/ha', 'deficient'),
              phosphorus: createMockParameter('Phosphorus', 8, 'kg/ha', 'deficient'),
              potassium: createMockParameter('Potassium', 80, 'kg/ha', 'deficient')
            },
            micronutrients: {
              zinc: createMockParameter('Zinc', 0.3, 'ppm', 'deficient')
            }
          },
          interpretation: {
            overallHealth: 'poor',
            healthScore: 45,
            primaryConcerns: [],
            strengths: [],
            recommendations: []
          },
          farmerFriendlyExplanation: {
            summary: '',
            keyFindings: [],
            actionItems: [],
            language: 'en'
          },
          confidence: 0.8,
          processingDate: new Date(),
          anomalies: []
        };

        const analysis = await soilAnalysisService.analyzeDeficienciesFromResult(mockResult, 1, {
          organic: true,
          sustainableFocus: true
        });

        expect(analysis.deficiencies.length).toBeGreaterThan(0);
        expect(analysis.remediationPlans.length).toBeGreaterThan(0);
        expect(analysis.integratedStrategy).toBeDefined();
        expect(Array.isArray(analysis.priorityActions)).toBe(true);
        expect(analysis.estimatedCost).toBeDefined();
        expect(Array.isArray(analysis.expectedBenefits)).toBe(true);
      });

      it('should provide farmer-friendly deficiency explanations', () => {
        const deficientNutrients: SoilNutrients = {
          pH: createMockParameter('pH', 5.2, '', 'deficient'),
          nitrogen: createMockParameter('Nitrogen', 120, 'kg/ha', 'deficient'),
          phosphorus: createMockParameter('Phosphorus', 15, 'kg/ha', 'adequate'),
          potassium: createMockParameter('Potassium', 100, 'kg/ha', 'adequate')
        };

        const deficiencies = soilAnalysisService.identifySoilDeficiencies(deficientNutrients, {});
        const explanation = soilAnalysisService.getFarmerFriendlyDeficiencyExplanation(deficiencies, 'en');

        expect(explanation.summary).toBeDefined();
        expect(Array.isArray(explanation.mainProblems)).toBe(true);
        expect(Array.isArray(explanation.quickSolutions)).toBe(true);
        expect(Array.isArray(explanation.whyItMatters)).toBe(true);
      });
    });

    describe('Crop Recommendations', () => {
      it('should generate crop recommendations from soil data', async () => {
        const mockResult: SoilAnalysisResult = {
          reportId: 'SR_123',
          metadata: mockMetadata,
          extractedData: {
            nutrients: createMockNutrients(),
            micronutrients: createMockMicronutrients()
          },
          interpretation: {
            overallHealth: 'good',
            healthScore: 75,
            primaryConcerns: [],
            strengths: [],
            recommendations: []
          },
          farmerFriendlyExplanation: {
            summary: '',
            keyFindings: [],
            actionItems: [],
            language: 'en'
          },
          confidence: 0.8,
          processingDate: new Date(),
          anomalies: []
        };

        const cropRecommendations = await soilAnalysisService.getCropRecommendationsFromSoilData(mockResult, {
          season: 'kharif',
          farmSize: 2,
          riskTolerance: 'medium',
          maxRecommendations: 5
        });

        expect(cropRecommendations.totalCropsAnalyzed).toBeGreaterThan(0);
        expect(cropRecommendations.suitableCrops).toBeGreaterThanOrEqual(0);
        expect(Array.isArray(cropRecommendations.topRecommendations)).toBe(true);
        expect(Array.isArray(cropRecommendations.soilLimitations)).toBe(true);
        expect(cropRecommendations.seasonalRecommendations).toBeDefined();
      });

      it('should provide seasonal crop recommendations', async () => {
        const mockResult: SoilAnalysisResult = {
          reportId: 'SR_123',
          metadata: mockMetadata,
          extractedData: {
            nutrients: createMockNutrients(),
            micronutrients: createMockMicronutrients()
          },
          interpretation: {
            overallHealth: 'good',
            healthScore: 75,
            primaryConcerns: [],
            strengths: [],
            recommendations: []
          },
          farmerFriendlyExplanation: {
            summary: '',
            keyFindings: [],
            actionItems: [],
            language: 'en'
          },
          confidence: 0.8,
          processingDate: new Date(),
          anomalies: []
        };

        const seasonalRecs = await soilAnalysisService.getSeasonalCropRecommendations(mockResult, 'rabi', {
          farmSize: 1,
          irrigationAvailable: true
        });

        expect(Array.isArray(seasonalRecs)).toBe(true);
        
        seasonalRecs.forEach(rec => {
          expect(rec.season).toBe('rabi');
          expect(rec.suitabilityScore).toBeGreaterThanOrEqual(0);
          expect(rec.suitabilityScore).toBeLessThanOrEqual(100);
        });
      });

      it('should provide farmer-friendly crop recommendations', async () => {
        const mockResult: SoilAnalysisResult = {
          reportId: 'SR_123',
          metadata: mockMetadata,
          extractedData: {
            nutrients: createMockNutrients(),
            micronutrients: createMockMicronutrients()
          },
          interpretation: {
            overallHealth: 'good',
            healthScore: 75,
            primaryConcerns: [],
            strengths: [],
            recommendations: []
          },
          farmerFriendlyExplanation: {
            summary: '',
            keyFindings: [],
            actionItems: [],
            language: 'en'
          },
          confidence: 0.8,
          processingDate: new Date(),
          anomalies: []
        };

        const cropRecommendations = await soilAnalysisService.getCropRecommendationsFromSoilData(mockResult);
        const farmerFriendly = soilAnalysisService.getFarmerFriendlyCropRecommendations(
          cropRecommendations.topRecommendations,
          'en'
        );

        expect(farmerFriendly.summary).toBeDefined();
        expect(Array.isArray(farmerFriendly.topCrops)).toBe(true);
        expect(Array.isArray(farmerFriendly.soilPreparation)).toBe(true);
        expect(farmerFriendly.seasonalAdvice).toBeDefined();
      });
    });
  });

  describe('OCRProcessingService - Enhanced Testing', () => {
    let mockDocumentBuffer: Buffer;
    let mockMetadata: SoilReportMetadata;

    beforeEach(() => {
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

    describe('Regional Language Processing', () => {
      it('should process Hindi soil reports correctly', async () => {
        const result = await ocrService.processDocument(mockDocumentBuffer, mockMetadata, {
          language: 'hi',
          expectedFormat: 'government'
        });

        expect(result.language).toBe('hi');
        expect(result.extractedText).toContain('मृदा स्वास्थ्य कार्ड');
        expect(result.structuredData?.parameters).toBeDefined();
      });

      it('should process Tamil soil reports correctly', async () => {
        const result = await ocrService.processDocument(mockDocumentBuffer, mockMetadata, {
          language: 'ta',
          expectedFormat: 'government'
        });

        expect(result.language).toBe('ta');
        expect(result.extractedText).toContain('மண் ஆரோக்கிய அட்டை');
      });

      it('should process Telugu soil reports correctly', async () => {
        const result = await ocrService.processDocument(mockDocumentBuffer, mockMetadata, {
          language: 'te',
          expectedFormat: 'government'
        });

        expect(result.language).toBe('te');
        expect(result.extractedText).toContain('మట్టి ఆరోగ్య కార్డు');
      });

      it('should auto-detect document language', async () => {
        const result = await ocrService.processDocument(mockDocumentBuffer, mockMetadata, {
          language: 'auto'
        });

        expect(result.language).toBeDefined();
        expect(['en', 'hi', 'ta', 'te', 'bn', 'mr', 'gu']).toContain(result.language);
      });
    });

    describe('Document Format Processing', () => {
      it('should process government format documents', async () => {
        const result = await ocrService.processDocument(mockDocumentBuffer, mockMetadata, {
          expectedFormat: 'government'
        });

        expect(result.extractedText).toContain('SOIL HEALTH CARD');
        expect(result.extractedText).toContain('Government of India');
      });

      it('should process private lab format documents', async () => {
        const result = await ocrService.processDocument(mockDocumentBuffer, mockMetadata, {
          expectedFormat: 'private_lab'
        });

        expect(result.extractedText).toContain('ADVANCED SOIL TESTING LABORATORY');
      });

      it('should process university format documents', async () => {
        const result = await ocrService.processDocument(mockDocumentBuffer, mockMetadata, {
          expectedFormat: 'university'
        });

        expect(result.extractedText).toContain('UNIVERSITY AGRICULTURAL RESEARCH CENTER');
      });
    });

    describe('Parameter Extraction', () => {
      it('should extract parameters with different naming conventions', async () => {
        const result = await ocrService.processDocument(mockDocumentBuffer, mockMetadata);

        if (result.structuredData?.parameters) {
          const paramNames = result.structuredData.parameters.map(p => p.name);
          
          // Should handle various parameter names
          const expectedParams = ['pH', 'Nitrogen', 'Phosphorus', 'Potassium'];
          const foundParams = expectedParams.filter(param => 
            paramNames.some(name => name.includes(param))
          );
          
          expect(foundParams.length).toBeGreaterThan(0);
        }
      });

      it('should extract micronutrients correctly', async () => {
        const result = await ocrService.processDocument(mockDocumentBuffer, mockMetadata);

        if (result.structuredData?.parameters) {
          const micronutrients = result.structuredData.parameters.filter(p => 
            ['Zinc', 'Iron', 'Manganese', 'Copper'].includes(p.name)
          );
          
          micronutrients.forEach(micro => {
            expect(micro.unit).toBe('ppm');
            expect(parseFloat(micro.value)).toBeGreaterThanOrEqual(0);
          });
        }
      });
    });

    describe('Quality Assessment', () => {
      it('should validate OCR results comprehensively', async () => {
        const result = await ocrService.processDocument(mockDocumentBuffer, mockMetadata);
        const validation = ocrService.validateOCRResult(result);

        expect(validation.valid).toBeDefined();
        expect(Array.isArray(validation.issues)).toBe(true);
      });

      it('should provide OCR recommendations', async () => {
        const result = await ocrService.processDocument(mockDocumentBuffer, mockMetadata);
        const recommendations = ocrService.getOCRRecommendations(result);

        expect(Array.isArray(recommendations)).toBe(true);
      });
    });

    describe('Multi-page Processing', () => {
      it('should process multiple document pages', async () => {
        const documentBuffers = [
          Buffer.from('page 1 content'),
          Buffer.from('page 2 content')
        ];

        const results = await ocrService.processMultiplePages(documentBuffers, mockMetadata);

        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBe(2);
        
        results.forEach(result => {
          expect(result.extractedText).toBeDefined();
          expect(result.confidence).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty or invalid input gracefully', async () => {
      const emptyBuffer = Buffer.alloc(0);
      
      await expect(
        soilAnalysisService.uploadAndProcessSoilReport(emptyBuffer, {
          filename: 'empty.pdf',
          size: 0,
          mimeType: 'application/pdf',
          uploadedAt: new Date(),
          farmerId: 'test'
        })
      ).rejects.toThrow();
    });

    it('should handle missing parameters gracefully', () => {
      const incompleteNutrients: SoilNutrients = {
        pH: createMockParameter('pH', 6.8, ''),
        nitrogen: createMockParameter('Nitrogen', 245, 'kg/ha'),
        phosphorus: createMockParameter('Phosphorus', 18, 'kg/ha'),
        potassium: createMockParameter('Potassium', 156, 'kg/ha')
      };

      const explanations = soilAnalysisService.getAllParameterExplanations(
        incompleteNutrients,
        {},
        'en'
      );

      expect(Array.isArray(explanations)).toBe(true);
      expect(explanations.length).toBeGreaterThan(0);
    });

    it('should handle extreme values appropriately', async () => {
      const extremeNutrients: SoilNutrients = {
        pH: createMockParameter('pH', 15.0, ''), // Impossible pH
        nitrogen: createMockParameter('Nitrogen', -50, 'kg/ha'), // Negative nitrogen
        phosphorus: createMockParameter('Phosphorus', 1000, 'kg/ha'), // Extremely high P
        potassium: createMockParameter('Potassium', 156, 'kg/ha')
      };

      const validation = await validationService.validateSoilData(extremeNutrients, {});

      expect(validation.valid).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
      expect(validation.anomalies.length).toBeGreaterThan(0);
    });

    it('should handle unsupported languages gracefully', async () => {
      const result = await ocrService.processDocument(Buffer.from('test'), {
        filename: 'test.pdf',
        size: 100,
        mimeType: 'application/pdf',
        uploadedAt: new Date(),
        farmerId: 'test'
      }, {
        language: 'unsupported_lang' as any
      });

      // Should fallback to English
      expect(result.language).toBeDefined();
    });
  });

  describe('Performance and Integration', () => {
    it('should complete soil analysis within reasonable time', async () => {
      const startTime = Date.now();
      
      await soilAnalysisService.uploadAndProcessSoilReport(
        Buffer.from('test soil report'),
        {
          filename: 'test.pdf',
          size: 100,
          mimeType: 'application/pdf',
          uploadedAt: new Date(),
          farmerId: 'test'
        }
      );
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      // Should complete within 5 seconds
      expect(executionTime).toBeLessThan(5000);
    });

    it('should integrate all services correctly', () => {
      // Test that all services are properly initialized
      expect(soilAnalysisService).toBeDefined();
      expect(typeof soilAnalysisService.uploadAndProcessSoilReport).toBe('function');
      expect(typeof soilAnalysisService.extractSoilDataEnhanced).toBe('function');
      expect(typeof soilAnalysisService.getValidationReport).toBe('function');
      expect(typeof soilAnalysisService.identifySoilDeficiencies).toBe('function');
      expect(typeof soilAnalysisService.getCropRecommendationsFromSoilData).toBe('function');
    });
  });
});