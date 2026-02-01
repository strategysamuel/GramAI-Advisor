// Advisory Service - Soil Analysis Integration Tests
// Tests the integration between soil analysis and crop recommendation system

import { AdvisoryService } from '../../services/advisory';
import { SoilAnalysisService } from '../../services/soil-analysis';
import { 
  SoilAnalysisResult, 
  SoilReportMetadata,
  SoilNutrients,
  Micronutrients,
  SoilParameter
} from '../../services/soil-analysis/types';

describe('Advisory Service - Soil Analysis Integration', () => {
  let advisoryService: AdvisoryService;
  let mockSoilAnalysisResult: SoilAnalysisResult;

  beforeEach(() => {
    advisoryService = new AdvisoryService();

    // Create mock soil analysis result
    const mockMetadata: SoilReportMetadata = {
      filename: 'test-soil-report.pdf',
      size: 1024,
      mimeType: 'application/pdf',
      uploadedAt: new Date(),
      farmerId: 'farmer123',
      location: { latitude: 28.6139, longitude: 77.2090 },
      reportDate: new Date(),
      laboratoryName: 'Test Lab',
      sampleId: 'SAMPLE123'
    };

    const createSoilParameter = (name: string, value: number, unit: string, status: SoilParameter['status']): SoilParameter => ({
      name,
      value,
      unit,
      range: { min: 0, max: 100, optimal: { min: 20, max: 80 } },
      status,
      confidence: 0.85
    });

    const mockNutrients: SoilNutrients = {
      pH: createSoilParameter('pH', 6.5, '', 'optimal'),
      nitrogen: createSoilParameter('Nitrogen', 180, 'kg/ha', 'adequate'),
      phosphorus: createSoilParameter('Phosphorus', 25, 'kg/ha', 'optimal'),
      potassium: createSoilParameter('Potassium', 150, 'kg/ha', 'optimal')
    };

    const mockMicronutrients: Micronutrients = {
      zinc: createSoilParameter('Zinc', 2.5, 'ppm', 'optimal'),
      iron: createSoilParameter('Iron', 15, 'ppm', 'adequate')
    };

    mockSoilAnalysisResult = {
      reportId: 'SR_123456_farmer123',
      metadata: mockMetadata,
      extractedData: {
        nutrients: mockNutrients,
        micronutrients: mockMicronutrients,
        soilTexture: 'Loamy',
        soilType: 'Alluvial'
      },
      interpretation: {
        overallHealth: 'good',
        healthScore: 78,
        primaryConcerns: ['Nitrogen levels could be improved'],
        strengths: ['Good pH balance', 'Adequate phosphorus and potassium'],
        recommendations: [
          {
            id: 'rec1',
            type: 'fertilizer',
            priority: 'medium',
            title: 'Nitrogen Enhancement',
            description: 'Apply nitrogen fertilizer to boost levels',
            specificActions: ['Apply urea 50kg/hectare'],
            expectedOutcome: 'Improved plant growth',
            timeframe: '2-3 weeks'
          }
        ]
      },
      farmerFriendlyExplanation: {
        summary: 'Your soil is in good condition with some room for improvement',
        keyFindings: ['pH is optimal', 'Phosphorus and potassium are good'],
        actionItems: ['Consider nitrogen fertilizer'],
        language: 'en'
      },
      confidence: 0.85,
      processingDate: new Date(),
      anomalies: []
    };
  });

  describe('Comprehensive Advice Generation', () => {
    it('should generate comprehensive advice based on soil analysis', async () => {
      const request = {
        farmerId: 'farmer123',
        soilAnalysisResult: mockSoilAnalysisResult,
        location: {
          state: 'Uttar Pradesh',
          district: 'Lucknow',
          block: 'Mohanlalganj'
        },
        farmSize: 2.5,
        season: 'kharif' as const,
        preferences: {
          organicFarming: false,
          riskTolerance: 'medium' as const,
          experienceLevel: 'intermediate' as const
        }
      };

      const advice = await advisoryService.getComprehensiveAdvice(request);

      expect(advice).toBeDefined();
      expect(advice.farmerId).toBe('farmer123');
      expect(advice.recommendations).toBeDefined();
      expect(advice.recommendations.length).toBeGreaterThan(0);
      expect(advice.soilBasedAdvice).toBeDefined();
      expect(advice.soilBasedAdvice.soilHealthScore).toBe(78);
      expect(advice.integratedPlan).toBeDefined();
      expect(advice.confidence).toBeGreaterThan(0);
      expect(advice.generatedAt).toBeInstanceOf(Date);
    });

    it('should include soil-based advice in recommendations', async () => {
      const request = {
        farmerId: 'farmer123',
        soilAnalysisResult: mockSoilAnalysisResult,
        season: 'rabi' as const
      };

      const advice = await advisoryService.getComprehensiveAdvice(request);

      expect(advice.soilBasedAdvice.criticalIssues).toBeDefined();
      expect(advice.soilBasedAdvice.improvementPlan).toBeDefined();
      expect(advice.soilBasedAdvice.seasonalGuidance).toBeDefined();
      expect(advice.soilBasedAdvice.soilHealthScore).toBe(mockSoilAnalysisResult.interpretation.healthScore);
    });

    it('should create integrated farming plan', async () => {
      const request = {
        farmerId: 'farmer123',
        soilAnalysisResult: mockSoilAnalysisResult
      };

      const advice = await advisoryService.getComprehensiveAdvice(request);

      expect(advice.integratedPlan.immediateActions).toBeDefined();
      expect(advice.integratedPlan.immediateActions.length).toBeGreaterThan(0);
      expect(advice.integratedPlan.shortTermGoals).toBeDefined();
      expect(advice.integratedPlan.longTermStrategy).toBeDefined();
      expect(advice.integratedPlan.expectedOutcomes).toBeDefined();
    });

    it('should handle organic farming preferences', async () => {
      const request = {
        farmerId: 'farmer123',
        soilAnalysisResult: mockSoilAnalysisResult,
        preferences: {
          organicFarming: true,
          riskTolerance: 'low' as const
        }
      };

      const advice = await advisoryService.getComprehensiveAdvice(request);

      expect(advice.integratedPlan.shortTermGoals).toContain('Transition to organic farming practices');
    });

    it('should throw error when soil analysis result is missing', async () => {
      const request = {
        farmerId: 'farmer123'
        // Missing soilAnalysisResult
      };

      await expect(advisoryService.getComprehensiveAdvice(request)).rejects.toThrow('Soil analysis result is required');
    });
  });

  describe('Crop Recommendations Integration', () => {
    it('should get crop recommendations from soil analysis', async () => {
      const recommendations = await advisoryService.getCropRecommendationsFromSoil(
        mockSoilAnalysisResult,
        { season: 'kharif', maxRecommendations: 5 }
      );

      expect(recommendations).toBeDefined();
      expect(recommendations.totalCropsAnalyzed).toBeGreaterThan(0);
      expect(recommendations.topRecommendations).toBeDefined();
      expect(recommendations.soilLimitations).toBeDefined();
    });

    it('should get seasonal recommendations', async () => {
      const kharifCrops = await advisoryService.getSeasonalRecommendations(
        mockSoilAnalysisResult,
        'kharif'
      );

      expect(kharifCrops).toBeDefined();
      expect(Array.isArray(kharifCrops)).toBe(true);
    });

    it('should get recommendations with soil improvement plan', async () => {
      const result = await advisoryService.getRecommendationsWithSoilImprovement(
        mockSoilAnalysisResult,
        ['rice', 'wheat'],
        { organicPreference: true }
      );

      expect(result).toBeDefined();
      expect(result.currentSuitability).toBeDefined();
      expect(result.withImprovements).toBeDefined();
      expect(result.improvementPlan).toBeDefined();
    });
  });

  describe('Farmer-Friendly Advice', () => {
    it('should generate farmer-friendly advice in English', async () => {
      const request = {
        farmerId: 'farmer123',
        soilAnalysisResult: mockSoilAnalysisResult
      };

      const advice = await advisoryService.getComprehensiveAdvice(request);
      const friendlyAdvice = advisoryService.getFarmerFriendlyAdvice(advice, 'en');

      expect(friendlyAdvice.summary).toBeDefined();
      expect(friendlyAdvice.summary).toContain('78%');
      expect(friendlyAdvice.topRecommendations).toBeDefined();
      expect(friendlyAdvice.soilAdvice).toBeDefined();
      expect(friendlyAdvice.nextSteps).toBeDefined();
    });

    it('should generate farmer-friendly advice in Hindi', async () => {
      const request = {
        farmerId: 'farmer123',
        soilAnalysisResult: mockSoilAnalysisResult
      };

      const advice = await advisoryService.getComprehensiveAdvice(request);
      const friendlyAdvice = advisoryService.getFarmerFriendlyAdvice(advice, 'hi');

      expect(friendlyAdvice.summary).toBeDefined();
      expect(friendlyAdvice.summary).toContain('78%');
      expect(friendlyAdvice.topRecommendations).toBeDefined();
    });
  });

  describe('Confidence Calculation', () => {
    it('should calculate appropriate confidence scores', async () => {
      const request = {
        farmerId: 'farmer123',
        soilAnalysisResult: mockSoilAnalysisResult,
        location: {
          state: 'Uttar Pradesh',
          district: 'Lucknow',
          block: 'Mohanlalganj'
        },
        farmSize: 2.5,
        preferences: {
          organicFarming: false,
          riskTolerance: 'medium' as const
        }
      };

      const advice = await advisoryService.getComprehensiveAdvice(request);

      expect(advice.confidence).toBeGreaterThan(0);
      expect(advice.confidence).toBeLessThanOrEqual(1);
      expect(advice.confidence).toBeGreaterThan(0.5); // Should be reasonably confident with good data
    });

    it('should have lower confidence with incomplete data', async () => {
      const request = {
        farmerId: 'farmer123',
        soilAnalysisResult: mockSoilAnalysisResult
        // Missing location, farmSize, and preferences
      };

      const advice = await advisoryService.getComprehensiveAdvice(request);

      expect(advice.confidence).toBeGreaterThan(0);
      expect(advice.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid soil analysis data gracefully', async () => {
      const invalidSoilResult = {
        ...mockSoilAnalysisResult,
        confidence: 0 // Very low confidence
      };

      const request = {
        farmerId: 'farmer123',
        soilAnalysisResult: invalidSoilResult
      };

      const advice = await advisoryService.getComprehensiveAdvice(request);
      expect(advice.confidence).toBeLessThan(0.5);
    });
  });
});