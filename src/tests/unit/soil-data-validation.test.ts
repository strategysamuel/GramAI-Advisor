// Soil Data Validation Service Tests
// Comprehensive unit tests for enhanced data validation and anomaly detection

import SoilDataValidationService, { ValidationOptions, ValidationResult } from '../../services/soil-analysis/services/SoilDataValidationService';
import {
  SoilParameter,
  SoilNutrients,
  Micronutrients,
  SoilAnomaly
} from '../../services/soil-analysis/types';

describe('SoilDataValidationService', () => {
  let validationService: SoilDataValidationService;
  let mockNutrients: SoilNutrients;
  let mockMicronutrients: Micronutrients;

  beforeEach(() => {
    validationService = new SoilDataValidationService();
    
    // Create mock soil parameters with normal values
    mockNutrients = {
      pH: createMockParameter('pH', 6.8, ''),
      nitrogen: createMockParameter('Nitrogen', 245, 'kg/ha'),
      phosphorus: createMockParameter('Phosphorus', 18, 'kg/ha'),
      potassium: createMockParameter('Potassium', 156, 'kg/ha'),
      organicCarbon: createMockParameter('Organic Carbon', 0.65, '%'),
      electricalConductivity: createMockParameter('Electrical Conductivity', 0.45, 'dS/m')
    };

    mockMicronutrients = {
      zinc: createMockParameter('Zinc', 0.8, 'ppm'),
      iron: createMockParameter('Iron', 12.5, 'ppm'),
      manganese: createMockParameter('Manganese', 8.2, 'ppm'),
      copper: createMockParameter('Copper', 1.2, 'ppm')
    };
  });

  function createMockParameter(name: string, value: number, unit: string): SoilParameter {
    return {
      name,
      value,
      unit,
      range: { min: 0, max: 100, optimal: { min: 10, max: 50 } },
      status: 'adequate',
      confidence: 0.8
    };
  }

  describe('validateSoilData', () => {
    it('should validate normal soil data successfully', async () => {
      const result = await validationService.validateSoilData(mockNutrients, mockMicronutrients);

      expect(result.valid).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(Array.isArray(result.issues)).toBe(true);
      expect(Array.isArray(result.anomalies)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should detect critical validation errors for impossible values', async () => {
      // Create nutrients with negative values
      const invalidNutrients = {
        ...mockNutrients,
        nitrogen: createMockParameter('Nitrogen', -50, 'kg/ha'),
        phosphorus: createMockParameter('Phosphorus', -10, 'kg/ha')
      };

      const result = await validationService.validateSoilData(invalidNutrients, mockMicronutrients);

      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      
      const criticalIssues = result.issues.filter(i => i.severity === 'critical');
      expect(criticalIssues.length).toBeGreaterThan(0);
      
      const nitrogenIssue = result.issues.find(i => i.parameter === 'Nitrogen');
      expect(nitrogenIssue).toBeDefined();
      expect(nitrogenIssue?.issue).toContain('Negative value detected');
    });

    it('should detect extreme pH values as anomalies', async () => {
      // Test extremely acidic pH
      const extremeAcidicNutrients = {
        ...mockNutrients,
        pH: createMockParameter('pH', 2.5, '')
      };

      const result = await validationService.validateSoilData(extremeAcidicNutrients, mockMicronutrients);

      expect(result.valid).toBe(false);
      expect(result.anomalies.length).toBeGreaterThan(0);
      
      const pHAnomaly = result.anomalies.find(a => a.parameter === 'pH');
      expect(pHAnomaly).toBeDefined();
      expect(pHAnomaly?.severity).toBe('high');
      expect(pHAnomaly?.description).toContain('extremely');
    });

    it('should detect unusual but possible values as warnings', async () => {
      // Test unusual but possible values
      const unusualNutrients = {
        ...mockNutrients,
        nitrogen: createMockParameter('Nitrogen', 450, 'kg/ha'), // High but possible
        phosphorus: createMockParameter('Phosphorus', 2, 'kg/ha') // Low but possible
      };

      const result = await validationService.validateSoilData(unusualNutrients, mockMicronutrients);

      expect(result.valid).toBe(true); // Should still be valid
      expect(result.issues.length).toBeGreaterThan(0);
      
      const warningIssues = result.issues.filter(i => i.severity === 'warning');
      expect(warningIssues.length).toBeGreaterThan(0);
    });

    it('should perform statistical analysis when enabled', async () => {
      const options: ValidationOptions = {
        enableStatisticalAnalysis: true,
        confidenceThreshold: 0.6
      };

      const result = await validationService.validateSoilData(mockNutrients, mockMicronutrients, options);

      expect(result.statisticalAnalysis).toBeDefined();
      expect(result.statisticalAnalysis?.outliers).toBeDefined();
      expect(result.statisticalAnalysis?.correlationIssues).toBeDefined();
      expect(result.statisticalAnalysis?.consistencyScore).toBeDefined();
      expect(result.statisticalAnalysis?.consistencyScore).toBeGreaterThanOrEqual(0);
      expect(result.statisticalAnalysis?.consistencyScore).toBeLessThanOrEqual(1);
    });

    it('should validate cross-parameter relationships', async () => {
      const options: ValidationOptions = {
        enableCrossParameterValidation: true
      };

      // Create imbalanced N:P ratio
      const imbalancedNutrients = {
        ...mockNutrients,
        nitrogen: createMockParameter('Nitrogen', 500, 'kg/ha'),
        phosphorus: createMockParameter('Phosphorus', 5, 'kg/ha') // Very low P relative to N
      };

      const result = await validationService.validateSoilData(imbalancedNutrients, mockMicronutrients, options);

      const ratioIssue = result.issues.find(i => i.parameter === 'N:P ratio');
      expect(ratioIssue).toBeDefined();
      expect(ratioIssue?.issue).toContain('Imbalanced nitrogen to phosphorus ratio');
    });

    it('should validate pH-nutrient relationships', async () => {
      const options: ValidationOptions = {
        enableCrossParameterValidation: true
      };

      // High pH with micronutrient deficiencies
      const highPHNutrients = {
        ...mockNutrients,
        pH: createMockParameter('pH', 8.5, '')
      };

      const deficientMicronutrients = {
        zinc: { ...createMockParameter('Zinc', 0.2, 'ppm'), status: 'deficient' as const },
        iron: { ...createMockParameter('Iron', 3.0, 'ppm'), status: 'deficient' as const }
      };

      const result = await validationService.validateSoilData(highPHNutrients, deficientMicronutrients, options);

      const pHMicroIssue = result.issues.find(i => i.parameter === 'pH-micronutrient relationship');
      expect(pHMicroIssue).toBeDefined();
      expect(pHMicroIssue?.issue).toContain('Micronutrient deficiencies at high pH');
    });

    it('should handle regional validation when location provided', async () => {
      const options: ValidationOptions = {
        location: {
          state: 'Rajasthan',
          district: 'Jaipur',
          soilType: 'Arid'
        }
      };

      // Acidic pH in arid region (unusual)
      const acidicNutrients = {
        ...mockNutrients,
        pH: createMockParameter('pH', 5.5, '')
      };

      const result = await validationService.validateSoilData(acidicNutrients, mockMicronutrients, options);

      // Should detect regional anomaly
      const regionalIssue = result.issues.find(i => 
        i.parameter === 'pH' && i.issue.includes('arid region')
      );
      expect(regionalIssue).toBeDefined();
    });

    it('should handle seasonal validation when season provided', async () => {
      const options: ValidationOptions = {
        season: 'post-harvest' as any
      };

      // High nitrogen post-harvest
      const highNNutrients = {
        ...mockNutrients,
        nitrogen: createMockParameter('Nitrogen', 350, 'kg/ha')
      };

      const result = await validationService.validateSoilData(highNNutrients, mockMicronutrients, options);

      // Should detect seasonal context issue
      const seasonalIssue = result.issues.find(i => 
        i.parameter === 'Nitrogen' && i.issue.includes('post-harvest')
      );
      expect(seasonalIssue).toBeDefined();
    });

    it('should handle crop-specific validation when crop type provided', async () => {
      const options: ValidationOptions = {
        cropType: 'rice'
      };

      // High pH for rice
      const highPHNutrients = {
        ...mockNutrients,
        pH: createMockParameter('pH', 8.2, '')
      };

      const result = await validationService.validateSoilData(highPHNutrients, mockMicronutrients, options);

      // Should detect crop-specific issue
      const cropIssue = result.issues.find(i => 
        i.parameter === 'pH' && i.issue.includes('rice cultivation')
      );
      expect(cropIssue).toBeDefined();
    });

    it('should work in strict mode with lower tolerance', async () => {
      const options: ValidationOptions = {
        strictMode: true,
        confidenceThreshold: 0.9
      };

      // Slightly unusual values that would pass in normal mode
      const slightlyUnusualNutrients = {
        ...mockNutrients,
        nitrogen: createMockParameter('Nitrogen', 380, 'kg/ha')
      };

      const result = await validationService.validateSoilData(slightlyUnusualNutrients, mockMicronutrients, options);

      // Strict mode should be more sensitive
      expect(result.confidence).toBeLessThan(1.0);
    });

    it('should generate appropriate recommendations based on findings', async () => {
      // Create data with multiple issues
      const problematicNutrients = {
        ...mockNutrients,
        pH: createMockParameter('pH', 3.0, ''), // Critical pH
        nitrogen: createMockParameter('Nitrogen', -10, 'kg/ha') // Impossible value
      };

      const result = await validationService.validateSoilData(problematicNutrients, mockMicronutrients);

      expect(result.recommendations.length).toBeGreaterThan(0);
      
      // Should recommend retesting for critical issues
      const retestRecommendation = result.recommendations.find(r => 
        r.includes('CRITICAL') || r.includes('Retest')
      );
      expect(retestRecommendation).toBeDefined();
    });

    it('should handle missing parameters gracefully', async () => {
      // Test with minimal parameters
      const minimalNutrients: SoilNutrients = {
        pH: createMockParameter('pH', 6.5, ''),
        nitrogen: createMockParameter('Nitrogen', 200, 'kg/ha'),
        phosphorus: createMockParameter('Phosphorus', 20, 'kg/ha'),
        potassium: createMockParameter('Potassium', 150, 'kg/ha')
      };

      const result = await validationService.validateSoilData(minimalNutrients, {});

      expect(result.valid).toBe(true);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should detect statistical outliers correctly', async () => {
      const options: ValidationOptions = {
        enableStatisticalAnalysis: true
      };

      // Create data with statistical outliers
      const outlierNutrients = {
        ...mockNutrients,
        nitrogen: createMockParameter('Nitrogen', 600, 'kg/ha'), // Very high
        phosphorus: createMockParameter('Phosphorus', 1, 'kg/ha')  // Very low
      };

      const result = await validationService.validateSoilData(outlierNutrients, mockMicronutrients, options);

      expect(result.statisticalAnalysis?.outliers.length).toBeGreaterThan(0);
      
      const nitrogenOutlier = result.statisticalAnalysis?.outliers.find(o => o.parameter === 'Nitrogen');
      expect(nitrogenOutlier).toBeDefined();
      expect(nitrogenOutlier?.deviationScore).toBeGreaterThan(2);
    });

    it('should calculate consistency scores appropriately', async () => {
      const options: ValidationOptions = {
        enableStatisticalAnalysis: true
      };

      // Test with consistent data
      const consistentResult = await validationService.validateSoilData(mockNutrients, mockMicronutrients, options);
      
      // Test with inconsistent data
      const inconsistentNutrients = {
        ...mockNutrients,
        nitrogen: createMockParameter('Nitrogen', 800, 'kg/ha'),
        phosphorus: createMockParameter('Phosphorus', 1, 'kg/ha'),
        potassium: createMockParameter('Potassium', 500, 'kg/ha')
      };
      
      const inconsistentResult = await validationService.validateSoilData(inconsistentNutrients, mockMicronutrients, options);

      expect(consistentResult.statisticalAnalysis?.consistencyScore).toBeGreaterThan(
        inconsistentResult.statisticalAnalysis?.consistencyScore || 0
      );
    });

    it('should provide detailed issue information', async () => {
      const problematicNutrients = {
        ...mockNutrients,
        pH: createMockParameter('pH', 2.0, '')
      };

      const result = await validationService.validateSoilData(problematicNutrients, mockMicronutrients);

      const pHIssue = result.issues.find(i => i.parameter === 'pH');
      expect(pHIssue).toBeDefined();
      expect(pHIssue?.parameter).toBe('pH');
      expect(pHIssue?.issue).toBeDefined();
      expect(pHIssue?.severity).toBeDefined();
      expect(pHIssue?.suggestion).toBeDefined();
      expect(pHIssue?.confidence).toBeGreaterThan(0);
      expect(Array.isArray(pHIssue?.possibleCauses)).toBe(true);
    });

    it('should provide detailed anomaly information', async () => {
      const extremeNutrients = {
        ...mockNutrients,
        nitrogen: createMockParameter('Nitrogen', 1200, 'kg/ha') // Extreme value
      };

      const result = await validationService.validateSoilData(extremeNutrients, mockMicronutrients);

      const nitrogenAnomaly = result.anomalies.find(a => a.parameter === 'Nitrogen');
      expect(nitrogenAnomaly).toBeDefined();
      expect(nitrogenAnomaly?.parameter).toBe('Nitrogen');
      expect(nitrogenAnomaly?.issue).toBeDefined();
      expect(nitrogenAnomaly?.severity).toMatch(/^(low|medium|high)$/);
      expect(nitrogenAnomaly?.description).toBeDefined();
      expect(Array.isArray(nitrogenAnomaly?.possibleCauses)).toBe(true);
      expect(nitrogenAnomaly?.recommendedAction).toBeDefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty nutrient data', async () => {
      const emptyNutrients: SoilNutrients = {
        pH: createMockParameter('pH', 7.0, ''),
        nitrogen: createMockParameter('Nitrogen', 200, 'kg/ha'),
        phosphorus: createMockParameter('Phosphorus', 20, 'kg/ha'),
        potassium: createMockParameter('Potassium', 150, 'kg/ha')
      };

      const result = await validationService.validateSoilData(emptyNutrients, {});

      expect(result).toBeDefined();
      expect(result.valid).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });

    it('should handle extreme confidence thresholds', async () => {
      const options: ValidationOptions = {
        confidenceThreshold: 0.99 // Very high threshold
      };

      const result = await validationService.validateSoilData(mockNutrients, mockMicronutrients, options);

      expect(result.valid).toBeDefined();
      expect(typeof result.valid).toBe('boolean');
    });

    it('should handle all validation options enabled', async () => {
      const options: ValidationOptions = {
        strictMode: true,
        confidenceThreshold: 0.8,
        enableStatisticalAnalysis: true,
        enableCrossParameterValidation: true,
        enableSeasonalValidation: true,
        location: {
          state: 'Punjab',
          district: 'Ludhiana',
          soilType: 'Alluvial'
        },
        cropType: 'wheat',
        season: 'rabi'
      };

      const result = await validationService.validateSoilData(mockNutrients, mockMicronutrients, options);

      expect(result).toBeDefined();
      expect(result.valid).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.statisticalAnalysis).toBeDefined();
    });
  });

  describe('Performance and Scalability', () => {
    it('should complete validation within reasonable time', async () => {
      const startTime = Date.now();
      
      await validationService.validateSoilData(mockNutrients, mockMicronutrients, {
        enableStatisticalAnalysis: true,
        enableCrossParameterValidation: true
      });
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      // Should complete within 1 second
      expect(executionTime).toBeLessThan(1000);
    });

    it('should handle large micronutrient datasets', async () => {
      const largeMicronutrients: Micronutrients = {
        zinc: createMockParameter('Zinc', 1.5, 'ppm'),
        iron: createMockParameter('Iron', 15.0, 'ppm'),
        manganese: createMockParameter('Manganese', 10.0, 'ppm'),
        copper: createMockParameter('Copper', 1.8, 'ppm'),
        boron: createMockParameter('Boron', 0.8, 'ppm'),
        sulfur: createMockParameter('Sulfur', 15.0, 'ppm')
      };

      const result = await validationService.validateSoilData(mockNutrients, largeMicronutrients);

      expect(result).toBeDefined();
      expect(result.valid).toBeDefined();
    });
  });
});

describe('Integration with SoilAnalysisService', () => {
  it('should integrate validation service properly', () => {
    const validationService = new SoilDataValidationService();
    expect(validationService).toBeDefined();
    expect(typeof validationService.validateSoilData).toBe('function');
  });
});