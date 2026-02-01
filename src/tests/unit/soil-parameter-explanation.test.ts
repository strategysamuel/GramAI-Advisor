// Unit Tests for Soil Parameter Explanation Service
// Tests farmer-friendly explanations and multilingual support

import SoilParameterExplanationService from '../../services/soil-analysis/services/SoilParameterExplanationService';
import { SoilParameter, SoilNutrients, Micronutrients } from '../../services/soil-analysis/types';

describe('SoilParameterExplanationService', () => {
  let explanationService: SoilParameterExplanationService;

  beforeEach(() => {
    explanationService = new SoilParameterExplanationService();
  });

  // Helper function to create mock soil parameters
  const createMockParameter = (
    name: string, 
    value: number, 
    unit: string, 
    status: 'deficient' | 'adequate' | 'excessive' | 'optimal' = 'adequate'
  ): SoilParameter => ({
    name,
    value,
    unit,
    range: { min: 0, max: 100, optimal: { min: 20, max: 80 } },
    status,
    confidence: 0.8
  });

  describe('Parameter Explanations', () => {
    it('should provide basic parameter explanations in English', () => {
      const pHParameter = createMockParameter('pH', 6.8, '');
      const explanation = explanationService.getParameterExplanation(pHParameter, 'en');

      expect(explanation.parameter).toBe('pH');
      expect(explanation.simpleExplanation).toBeDefined();
      expect(explanation.whatItMeans).toBeDefined();
      expect(explanation.whyItMatters).toBeDefined();
      expect(explanation.actionNeeded).toBeDefined();
      expect(explanation.language).toBe('en');
      
      // Should contain the parameter value
      expect(explanation.simpleExplanation).toContain('6.8');
    });

    it('should provide parameter explanations in Hindi', () => {
      const nitrogenParameter = createMockParameter('Nitrogen', 245, 'kg/ha');
      const explanation = explanationService.getParameterExplanation(nitrogenParameter, 'hi');

      expect(explanation.language).toBe('hi');
      expect(explanation.simpleExplanation).toContain('नाइट्रोजन');
      expect(explanation.simpleExplanation).toContain('245');
      expect(explanation.simpleExplanation).toContain('kg/ha');
    });

    it('should handle different parameter statuses correctly', () => {
      const deficientParam = createMockParameter('Nitrogen', 100, 'kg/ha', 'deficient');
      const optimalParam = createMockParameter('Nitrogen', 250, 'kg/ha', 'optimal');
      const excessiveParam = createMockParameter('Nitrogen', 400, 'kg/ha', 'excessive');

      const deficientExplanation = explanationService.getParameterExplanation(deficientParam, 'en');
      const optimalExplanation = explanationService.getParameterExplanation(optimalParam, 'en');
      const excessiveExplanation = explanationService.getParameterExplanation(excessiveParam, 'en');

      expect(deficientExplanation.actionNeeded).toContain('needs more');
      expect(optimalExplanation.actionNeeded).toContain('perfect level');
      expect(excessiveExplanation.actionNeeded).toContain('too high');
    });

    it('should provide explanations for all major nutrients', () => {
      const nutrients = ['pH', 'Nitrogen', 'Phosphorus', 'Potassium', 'Organic Carbon'];
      
      nutrients.forEach(nutrient => {
        const parameter = createMockParameter(nutrient, 100, nutrient === 'pH' ? '' : 'kg/ha');
        const explanation = explanationService.getParameterExplanation(parameter, 'en');
        
        expect(explanation.parameter).toBe(nutrient);
        expect(explanation.simpleExplanation).toBeDefined();
        expect(explanation.whatItMeans).toBeDefined();
        expect(explanation.whyItMatters).toBeDefined();
      });
    });

    it('should provide explanations for micronutrients', () => {
      const micronutrients = ['Zinc', 'Iron', 'Manganese', 'Copper'];
      
      micronutrients.forEach(micro => {
        const parameter = createMockParameter(micro, 5.0, 'ppm');
        const explanation = explanationService.getParameterExplanation(parameter, 'en');
        
        expect(explanation.parameter).toBe(micro);
        expect(explanation.simpleExplanation).toBeDefined();
        expect(explanation.whyItMatters).toBeDefined();
      });
    });

    it('should handle unknown parameters with default explanations', () => {
      const unknownParameter = createMockParameter('Unknown Nutrient', 50, 'units');
      const explanation = explanationService.getParameterExplanation(unknownParameter, 'en');

      expect(explanation.parameter).toBe('Unknown Nutrient');
      expect(explanation.simpleExplanation).toContain('Unknown Nutrient');
      expect(explanation.simpleExplanation).toContain('50');
      expect(explanation.simpleExplanation).toContain('units');
    });
  });

  describe('Literacy Level Adaptations', () => {
    it('should provide basic literacy level explanations', () => {
      const parameter = createMockParameter('pH', 6.8, '');
      const basicExplanation = explanationService.getExplanationByLiteracyLevel(parameter, 'basic', 'en');

      expect(basicExplanation.simpleExplanation).toBeDefined();
      // Basic explanations should use simpler language
      expect(basicExplanation.simpleExplanation).not.toContain('acidic or alkaline');
      expect(basicExplanation.simpleExplanation).toContain('sour or bitter');
    });

    it('should provide intermediate literacy level explanations', () => {
      const parameter = createMockParameter('Nitrogen', 245, 'kg/ha');
      const intermediateExplanation = explanationService.getExplanationByLiteracyLevel(parameter, 'intermediate', 'en');

      expect(intermediateExplanation.simpleExplanation).toBeDefined();
      expect(intermediateExplanation.whatItMeans).toBeDefined();
    });

    it('should provide advanced literacy level explanations', () => {
      const parameter = createMockParameter('Phosphorus', 18, 'kg/ha');
      const advancedExplanation = explanationService.getExplanationByLiteracyLevel(parameter, 'advanced', 'en');

      expect(advancedExplanation.simpleExplanation).toBeDefined();
      // Advanced explanations should include technical details
      expect(advancedExplanation.simpleExplanation).toContain('18 kg/ha');
      expect(advancedExplanation.simpleExplanation).toContain('Optimal range');
    });

    it('should show increasing detail from basic to advanced', () => {
      const parameter = createMockParameter('Potassium', 156, 'kg/ha');
      
      const basicExplanation = explanationService.getExplanationByLiteracyLevel(parameter, 'basic', 'en');
      const intermediateExplanation = explanationService.getExplanationByLiteracyLevel(parameter, 'intermediate', 'en');
      const advancedExplanation = explanationService.getExplanationByLiteracyLevel(parameter, 'advanced', 'en');

      expect(basicExplanation.simpleExplanation.length).toBeLessThan(intermediateExplanation.simpleExplanation.length);
      expect(intermediateExplanation.simpleExplanation.length).toBeLessThan(advancedExplanation.simpleExplanation.length);
    });
  });

  describe('Soil Health Explanations', () => {
    let mockNutrients: SoilNutrients;
    let mockMicronutrients: Micronutrients;

    beforeEach(() => {
      mockNutrients = {
        pH: createMockParameter('pH', 6.8, ''),
        nitrogen: createMockParameter('Nitrogen', 245, 'kg/ha'),
        phosphorus: createMockParameter('Phosphorus', 18, 'kg/ha'),
        potassium: createMockParameter('Potassium', 156, 'kg/ha')
      };

      mockMicronutrients = {
        zinc: createMockParameter('Zinc', 0.8, 'ppm'),
        iron: createMockParameter('Iron', 12.5, 'ppm')
      };
    });

    it('should provide comprehensive soil health explanations', () => {
      const healthExplanation = explanationService.getSoilHealthExplanation(
        mockNutrients,
        mockMicronutrients,
        'good',
        75,
        'en'
      );

      expect(healthExplanation.overallMessage).toBeDefined();
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
      expect(excellentHealth.overallMessage).toContain('95');
      expect(poorHealth.overallMessage).toContain('poor');
      expect(poorHealth.overallMessage).toContain('35');
      
      // Poor health should have more immediate actions
      expect(poorHealth.immediateActions.length).toBeGreaterThanOrEqual(excellentHealth.immediateActions.length);
    });

    it('should provide health explanations in Hindi', () => {
      const healthExplanation = explanationService.getSoilHealthExplanation(
        mockNutrients,
        mockMicronutrients,
        'good',
        75,
        'hi'
      );

      expect(healthExplanation.language).toBe('hi');
      expect(healthExplanation.overallMessage).toContain('स्वास्थ्य स्कोर');
      expect(healthExplanation.overallMessage).toContain('75');
    });

    it('should identify key points based on soil condition', () => {
      // Test with acidic soil
      const acidicNutrients = {
        ...mockNutrients,
        pH: createMockParameter('pH', 5.2, '')
      };

      const acidicExplanation = explanationService.getSoilHealthExplanation(
        acidicNutrients,
        mockMicronutrients,
        'fair',
        60,
        'en'
      );

      expect(acidicExplanation.keyPoints.some(point => point.includes('acidic'))).toBe(true);

      // Test with alkaline soil
      const alkalineNutrients = {
        ...mockNutrients,
        pH: createMockParameter('pH', 8.2, '')
      };

      const alkalineExplanation = explanationService.getSoilHealthExplanation(
        alkalineNutrients,
        mockMicronutrients,
        'fair',
        60,
        'en'
      );

      expect(alkalineExplanation.keyPoints.some(point => point.includes('alkaline'))).toBe(true);
    });

    it('should provide appropriate immediate actions', () => {
      // Test with deficient nutrients
      const deficientNutrients = {
        ...mockNutrients,
        nitrogen: createMockParameter('Nitrogen', 100, 'kg/ha', 'deficient'),
        phosphorus: createMockParameter('Phosphorus', 8, 'kg/ha', 'deficient')
      };

      const explanation = explanationService.getSoilHealthExplanation(
        deficientNutrients,
        mockMicronutrients,
        'poor',
        45,
        'en'
      );

      expect(explanation.immediateActions.length).toBeGreaterThan(0);
      expect(explanation.immediateActions.some(action => action.includes('nitrogen') || action.includes('Nitrogen'))).toBe(true);
      expect(explanation.immediateActions.some(action => action.includes('phosphorus') || action.includes('Phosphorus'))).toBe(true);
    });

    it('should provide seasonal advice', () => {
      const explanation = explanationService.getSoilHealthExplanation(
        mockNutrients,
        mockMicronutrients,
        'good',
        75,
        'en'
      );

      expect(explanation.seasonalAdvice.length).toBeGreaterThan(0);
      expect(explanation.seasonalAdvice.some(advice => 
        advice.includes('Kharif') || advice.includes('Rabi') || advice.includes('season')
      )).toBe(true);
    });
  });

  describe('Multiple Parameter Explanations', () => {
    it('should provide explanations for multiple parameters', () => {
      const nutrients: SoilNutrients = {
        pH: createMockParameter('pH', 6.8, ''),
        nitrogen: createMockParameter('Nitrogen', 245, 'kg/ha'),
        phosphorus: createMockParameter('Phosphorus', 18, 'kg/ha'),
        potassium: createMockParameter('Potassium', 156, 'kg/ha')
      };

      const micronutrients: Micronutrients = {
        zinc: createMockParameter('Zinc', 0.8, 'ppm'),
        iron: createMockParameter('Iron', 12.5, 'ppm')
      };

      const explanations = explanationService.getMultipleParameterExplanations(nutrients, micronutrients, 'en');

      expect(Array.isArray(explanations)).toBe(true);
      expect(explanations.length).toBe(6); // 4 nutrients + 2 micronutrients
      
      explanations.forEach(explanation => {
        expect(explanation.parameter).toBeDefined();
        expect(explanation.simpleExplanation).toBeDefined();
        expect(explanation.language).toBe('en');
      });
    });

    it('should handle empty micronutrients', () => {
      const nutrients: SoilNutrients = {
        pH: createMockParameter('pH', 6.8, ''),
        nitrogen: createMockParameter('Nitrogen', 245, 'kg/ha'),
        phosphorus: createMockParameter('Phosphorus', 18, 'kg/ha'),
        potassium: createMockParameter('Potassium', 156, 'kg/ha')
      };

      const explanations = explanationService.getMultipleParameterExplanations(nutrients, {}, 'en');

      expect(explanations.length).toBe(4); // Only nutrients
      expect(explanations.every(exp => exp.language === 'en')).toBe(true);
    });
  });

  describe('Language Support', () => {
    it('should fallback to English for unsupported languages', () => {
      const parameter = createMockParameter('pH', 6.8, '');
      const explanation = explanationService.getParameterExplanation(parameter, 'unsupported_lang');

      expect(explanation.language).toBe('unsupported_lang');
      // Should still provide explanation (fallback to English templates)
      expect(explanation.simpleExplanation).toBeDefined();
    });

    it('should handle empty or null language gracefully', () => {
      const parameter = createMockParameter('pH', 6.8, '');
      const explanation = explanationService.getParameterExplanation(parameter, '');

      expect(explanation.language).toBe('');
      expect(explanation.simpleExplanation).toBeDefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle parameters with zero values', () => {
      const zeroParameter = createMockParameter('Nitrogen', 0, 'kg/ha', 'deficient');
      const explanation = explanationService.getParameterExplanation(zeroParameter, 'en');

      expect(explanation.simpleExplanation).toContain('0');
      expect(explanation.actionNeeded).toContain('needs more');
    });

    it('should handle parameters with very high values', () => {
      const highParameter = createMockParameter('Nitrogen', 1000, 'kg/ha', 'excessive');
      const explanation = explanationService.getParameterExplanation(highParameter, 'en');

      expect(explanation.simpleExplanation).toContain('1000');
      expect(explanation.actionNeeded).toContain('too high');
    });

    it('should handle parameters with decimal values', () => {
      const decimalParameter = createMockParameter('pH', 6.75, '');
      const explanation = explanationService.getParameterExplanation(decimalParameter, 'en');

      expect(explanation.simpleExplanation).toContain('6.75');
    });

    it('should handle missing optional nutrients gracefully', () => {
      const minimalNutrients: SoilNutrients = {
        pH: createMockParameter('pH', 6.8, ''),
        nitrogen: createMockParameter('Nitrogen', 245, 'kg/ha'),
        phosphorus: createMockParameter('Phosphorus', 18, 'kg/ha'),
        potassium: createMockParameter('Potassium', 156, 'kg/ha')
        // Missing organicCarbon and electricalConductivity
      };

      const explanations = explanationService.getMultipleParameterExplanations(minimalNutrients, {}, 'en');

      expect(explanations.length).toBe(4);
      expect(explanations.every(exp => exp.simpleExplanation.length > 0)).toBe(true);
    });
  });

  describe('Template Formatting', () => {
    it('should properly format templates with parameter values', () => {
      const parameter = createMockParameter('Nitrogen', 245.5, 'kg/ha');
      const explanation = explanationService.getParameterExplanation(parameter, 'en');

      expect(explanation.simpleExplanation).toContain('245.5');
      expect(explanation.simpleExplanation).toContain('kg/ha');
      expect(explanation.simpleExplanation).toContain('Nitrogen');
    });

    it('should handle parameters with empty units', () => {
      const parameter = createMockParameter('pH', 6.8, '');
      const explanation = explanationService.getParameterExplanation(parameter, 'en');

      expect(explanation.simpleExplanation).toContain('6.8');
      expect(explanation.simpleExplanation).toContain('pH');
      // Should not have empty unit placeholders
      expect(explanation.simpleExplanation).not.toContain('{}');
    });
  });
});