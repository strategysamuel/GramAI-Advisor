// Property-Based Tests for Soil Data Validation Service
// Tests universal properties that should hold across all valid inputs

import fc from 'fast-check';
import SoilDataValidationService from '../../services/soil-analysis/services/SoilDataValidationService';
import { SoilParameter, SoilNutrients, Micronutrients } from '../../services/soil-analysis/types';

describe('SoilDataValidationService - Property-Based Tests', () => {
  let validationService: SoilDataValidationService;

  beforeEach(() => {
    validationService = new SoilDataValidationService();
  });

  // Generators for property-based testing
  const validPHGenerator = fc.float({ min: 3.0, max: 11.0 });
  const validNutrientGenerator = fc.float({ min: 0, max: 1000 });
  const validMicronutrientGenerator = fc.float({ min: 0, max: 50 });
  const confidenceGenerator = fc.float({ min: 0.1, max: 1.0 });

  const soilParameterGenerator = (name: string, valueGen: fc.Arbitrary<number>, unit: string) =>
    fc.record({
      name: fc.constant(name),
      value: valueGen,
      unit: fc.constant(unit),
      range: fc.constant({ min: 0, max: 100, optimal: { min: 10, max: 50 } }),
      status: fc.constantFrom('deficient', 'adequate', 'excessive', 'optimal'),
      confidence: confidenceGenerator
    });

  const nutrientsGenerator = fc.record({
    pH: soilParameterGenerator('pH', validPHGenerator, ''),
    nitrogen: soilParameterGenerator('Nitrogen', validNutrientGenerator, 'kg/ha'),
    phosphorus: soilParameterGenerator('Phosphorus', validNutrientGenerator, 'kg/ha'),
    potassium: soilParameterGenerator('Potassium', validNutrientGenerator, 'kg/ha'),
    organicCarbon: fc.option(soilParameterGenerator('Organic Carbon', fc.float({ min: 0, max: 5 }), '%')),
    electricalConductivity: fc.option(soilParameterGenerator('Electrical Conductivity', fc.float({ min: 0, max: 10 }), 'dS/m'))
  });

  const micronutrientsGenerator = fc.record({
    zinc: fc.option(soilParameterGenerator('Zinc', validMicronutrientGenerator, 'ppm')),
    iron: fc.option(soilParameterGenerator('Iron', validMicronutrientGenerator, 'ppm')),
    manganese: fc.option(soilParameterGenerator('Manganese', validMicronutrientGenerator, 'ppm')),
    copper: fc.option(soilParameterGenerator('Copper', validMicronutrientGenerator, 'ppm')),
    boron: fc.option(soilParameterGenerator('Boron', validMicronutrientGenerator, 'ppm')),
    sulfur: fc.option(soilParameterGenerator('Sulfur', validMicronutrientGenerator, 'ppm'))
  });

  /**
   * **Validates: Requirements 4.6**
   * Property: Validation service should always return a valid ValidationResult structure
   */
  it('should always return valid ValidationResult structure for any soil data', async () => {
    await fc.assert(
      fc.asyncProperty(
        nutrientsGenerator,
        micronutrientsGenerator,
        async (nutrients, micronutrients) => {
          const result = await validationService.validateSoilData(nutrients, micronutrients);

          // ValidationResult structure properties
          expect(typeof result.valid).toBe('boolean');
          expect(typeof result.confidence).toBe('number');
          expect(result.confidence).toBeGreaterThanOrEqual(0);
          expect(result.confidence).toBeLessThanOrEqual(1);
          expect(Array.isArray(result.issues)).toBe(true);
          expect(Array.isArray(result.anomalies)).toBe(true);
          expect(Array.isArray(result.recommendations)).toBe(true);

          // Each issue should have required properties
          result.issues.forEach(issue => {
            expect(typeof issue.parameter).toBe('string');
            expect(typeof issue.issue).toBe('string');
            expect(['info', 'warning', 'error', 'critical']).toContain(issue.severity);
            expect(typeof issue.suggestion).toBe('string');
            expect(typeof issue.confidence).toBe('number');
            expect(issue.confidence).toBeGreaterThan(0);
            expect(issue.confidence).toBeLessThanOrEqual(1);
          });

          // Each anomaly should have required properties
          result.anomalies.forEach(anomaly => {
            expect(typeof anomaly.parameter).toBe('string');
            expect(typeof anomaly.issue).toBe('string');
            expect(['low', 'medium', 'high']).toContain(anomaly.severity);
            expect(typeof anomaly.description).toBe('string');
            expect(Array.isArray(anomaly.possibleCauses)).toBe(true);
            expect(typeof anomaly.recommendedAction).toBe('string');
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * **Validates: Requirements 4.6**
   * Property: Negative nutrient values should always be flagged as critical errors
   */
  it('should always flag negative nutrient values as critical errors', async () => {
    const negativeNutrientGenerator = fc.record({
      pH: soilParameterGenerator('pH', validPHGenerator, ''),
      nitrogen: soilParameterGenerator('Nitrogen', fc.float({ min: -100, max: -0.1 }), 'kg/ha'),
      phosphorus: soilParameterGenerator('Phosphorus', fc.float({ min: -50, max: -0.1 }), 'kg/ha'),
      potassium: soilParameterGenerator('Potassium', fc.float({ min: -200, max: -0.1 }), 'kg/ha')
    });

    await fc.assert(
      fc.asyncProperty(
        negativeNutrientGenerator,
        micronutrientsGenerator,
        async (nutrients, micronutrients) => {
          const result = await validationService.validateSoilData(nutrients, micronutrients);

          // Should not be valid due to negative values
          expect(result.valid).toBe(false);

          // Should have critical issues for negative values
          const criticalIssues = result.issues.filter(i => i.severity === 'critical');
          expect(criticalIssues.length).toBeGreaterThan(0);

          // Check that negative nutrient parameters are flagged
          const negativeParams = ['Nitrogen', 'Phosphorus', 'Potassium'].filter(param => {
            const paramValue = (nutrients as any)[param.toLowerCase()]?.value;
            return paramValue < 0;
          });

          negativeParams.forEach(param => {
            const issue = result.issues.find(i => i.parameter === param && i.severity === 'critical');
            expect(issue).toBeDefined();
            expect(issue?.issue).toContain('Negative value detected');
          });
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * **Validates: Requirements 4.6**
   * Property: Extreme pH values should always be detected as anomalies
   */
  it('should always detect extreme pH values as anomalies', async () => {
    const extremePHGenerator = fc.oneof(
      fc.float({ min: 0.1, max: 3.5 }), // Extremely acidic
      fc.float({ min: 10.5, max: 14.0 }) // Extremely alkaline
    );

    const extremePHNutrientsGenerator = fc.record({
      pH: soilParameterGenerator('pH', extremePHGenerator, ''),
      nitrogen: soilParameterGenerator('Nitrogen', validNutrientGenerator, 'kg/ha'),
      phosphorus: soilParameterGenerator('Phosphorus', validNutrientGenerator, 'kg/ha'),
      potassium: soilParameterGenerator('Potassium', validNutrientGenerator, 'kg/ha')
    });

    await fc.assert(
      fc.asyncProperty(
        extremePHNutrientsGenerator,
        micronutrientsGenerator,
        async (nutrients, micronutrients) => {
          const result = await validationService.validateSoilData(nutrients, micronutrients);

          // Should have pH-related issues or anomalies
          const pHIssues = result.issues.filter(i => i.parameter === 'pH');
          const pHAnomalies = result.anomalies.filter(a => a.parameter === 'pH');

          expect(pHIssues.length + pHAnomalies.length).toBeGreaterThan(0);

          // If pH is extremely out of range, should be flagged as error or critical
          const pHValue = nutrients.pH.value;
          if (pHValue < 3.0 || pHValue > 11.0) {
            const severePHIssue = pHIssues.find(i => i.severity === 'error' || i.severity === 'critical');
            expect(severePHIssue).toBeDefined();
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * **Validates: Requirements 4.6**
   * Property: Confidence should decrease with more validation issues
   */
  it('should have lower confidence when more validation issues are present', async () => {
    // Generate problematic data with multiple issues
    const problematicNutrientsGenerator = fc.record({
      pH: soilParameterGenerator('pH', fc.oneof(
        fc.float({ min: 1.0, max: 3.0 }), // Too acidic
        fc.float({ min: 10.0, max: 12.0 }) // Too alkaline
      ), ''),
      nitrogen: soilParameterGenerator('Nitrogen', fc.oneof(
        fc.float({ min: -50, max: -1 }), // Negative
        fc.float({ min: 800, max: 1200 }) // Extremely high
      ), 'kg/ha'),
      phosphorus: soilParameterGenerator('Phosphorus', fc.oneof(
        fc.float({ min: -20, max: -1 }), // Negative
        fc.float({ min: 150, max: 300 }) // Extremely high
      ), 'kg/ha'),
      potassium: soilParameterGenerator('Potassium', validNutrientGenerator, 'kg/ha')
    });

    await fc.assert(
      fc.asyncProperty(
        problematicNutrientsGenerator,
        micronutrientsGenerator,
        nutrientsGenerator,
        micronutrientsGenerator,
        async (problematicNutrients, problematicMicros, normalNutrients, normalMicros) => {
          const problematicResult = await validationService.validateSoilData(problematicNutrients, problematicMicros);
          const normalResult = await validationService.validateSoilData(normalNutrients, normalMicros);

          // Problematic data should have more issues
          const problematicIssueCount = problematicResult.issues.filter(i => 
            i.severity === 'error' || i.severity === 'critical'
          ).length;
          
          const normalIssueCount = normalResult.issues.filter(i => 
            i.severity === 'error' || i.severity === 'critical'
          ).length;

          // If problematic data has more severe issues, confidence should be lower
          if (problematicIssueCount > normalIssueCount) {
            expect(problematicResult.confidence).toBeLessThanOrEqual(normalResult.confidence);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * **Validates: Requirements 4.6**
   * Property: Statistical analysis should identify outliers consistently
   */
  it('should consistently identify statistical outliers when enabled', async () => {
    const outlierNutrientsGenerator = fc.record({
      pH: soilParameterGenerator('pH', validPHGenerator, ''),
      nitrogen: soilParameterGenerator('Nitrogen', fc.oneof(
        fc.float({ min: 0, max: 50 }), // Very low
        fc.float({ min: 600, max: 1000 }) // Very high
      ), 'kg/ha'),
      phosphorus: soilParameterGenerator('Phosphorus', fc.oneof(
        fc.float({ min: 0, max: 5 }), // Very low
        fc.float({ min: 80, max: 150 }) // Very high
      ), 'kg/ha'),
      potassium: soilParameterGenerator('Potassium', validNutrientGenerator, 'kg/ha')
    });

    await fc.assert(
      fc.asyncProperty(
        outlierNutrientsGenerator,
        micronutrientsGenerator,
        async (nutrients, micronutrients) => {
          const result = await validationService.validateSoilData(nutrients, micronutrients, {
            enableStatisticalAnalysis: true
          });

          expect(result.statisticalAnalysis).toBeDefined();
          expect(Array.isArray(result.statisticalAnalysis?.outliers)).toBe(true);
          expect(typeof result.statisticalAnalysis?.consistencyScore).toBe('number');
          expect(result.statisticalAnalysis?.consistencyScore).toBeGreaterThanOrEqual(0);
          expect(result.statisticalAnalysis?.consistencyScore).toBeLessThanOrEqual(1);

          // Outliers should have valid structure
          result.statisticalAnalysis?.outliers.forEach(outlier => {
            expect(typeof outlier.parameter).toBe('string');
            expect(typeof outlier.value).toBe('number');
            expect(typeof outlier.expectedRange.min).toBe('number');
            expect(typeof outlier.expectedRange.max).toBe('number');
            expect(typeof outlier.deviationScore).toBe('number');
            expect(outlier.deviationScore).toBeGreaterThan(0);
          });
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * **Validates: Requirements 4.6**
   * Property: Cross-parameter validation should detect N:P ratio imbalances
   */
  it('should detect N:P ratio imbalances when cross-parameter validation is enabled', async () => {
    const imbalancedRatioGenerator = fc.record({
      pH: soilParameterGenerator('pH', validPHGenerator, ''),
      nitrogen: soilParameterGenerator('Nitrogen', fc.float({ min: 400, max: 800 }), 'kg/ha'), // High N
      phosphorus: soilParameterGenerator('Phosphorus', fc.float({ min: 1, max: 10 }), 'kg/ha'), // Low P
      potassium: soilParameterGenerator('Potassium', validNutrientGenerator, 'kg/ha')
    });

    await fc.assert(
      fc.asyncProperty(
        imbalancedRatioGenerator,
        micronutrientsGenerator,
        async (nutrients, micronutrients) => {
          const result = await validationService.validateSoilData(nutrients, micronutrients, {
            enableCrossParameterValidation: true
          });

          const nValue = nutrients.nitrogen.value;
          const pValue = nutrients.phosphorus.value;
          const npRatio = nValue / pValue;

          // If N:P ratio is severely imbalanced, should be detected
          if (npRatio > 25 || npRatio < 5) {
            const ratioIssue = result.issues.find(i => i.parameter === 'N:P ratio');
            const ratioAnomaly = result.anomalies.find(a => a.parameter === 'N:P ratio');
            
            expect(ratioIssue || ratioAnomaly).toBeDefined();
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * **Validates: Requirements 4.6**
   * Property: Validation should be deterministic for identical inputs
   */
  it('should produce identical results for identical soil data inputs', async () => {
    await fc.assert(
      fc.asyncProperty(
        nutrientsGenerator,
        micronutrientsGenerator,
        async (nutrients, micronutrients) => {
          const result1 = await validationService.validateSoilData(nutrients, micronutrients);
          const result2 = await validationService.validateSoilData(nutrients, micronutrients);

          // Results should be identical
          expect(result1.valid).toBe(result2.valid);
          expect(result1.confidence).toBeCloseTo(result2.confidence, 5);
          expect(result1.issues.length).toBe(result2.issues.length);
          expect(result1.anomalies.length).toBe(result2.anomalies.length);
          expect(result1.recommendations.length).toBe(result2.recommendations.length);
        }
      ),
      { numRuns: 15 }
    );
  });

  /**
   * **Validates: Requirements 4.6**
   * Property: Validation should handle edge cases gracefully
   */
  it('should handle edge cases without throwing errors', async () => {
    const edgeCaseGenerator = fc.oneof(
      // Minimal nutrients
      fc.record({
        pH: soilParameterGenerator('pH', validPHGenerator, ''),
        nitrogen: soilParameterGenerator('Nitrogen', validNutrientGenerator, 'kg/ha'),
        phosphorus: soilParameterGenerator('Phosphorus', validNutrientGenerator, 'kg/ha'),
        potassium: soilParameterGenerator('Potassium', validNutrientGenerator, 'kg/ha')
      }),
      // Boundary values
      fc.record({
        pH: soilParameterGenerator('pH', fc.constantFrom(3.0, 11.0, 7.0), ''),
        nitrogen: soilParameterGenerator('Nitrogen', fc.constantFrom(0, 1000, 500), 'kg/ha'),
        phosphorus: soilParameterGenerator('Phosphorus', fc.constantFrom(0, 200, 100), 'kg/ha'),
        potassium: soilParameterGenerator('Potassium', fc.constantFrom(0, 800, 400), 'kg/ha')
      })
    );

    await fc.assert(
      fc.asyncProperty(
        edgeCaseGenerator,
        fc.record({}), // Empty micronutrients
        async (nutrients, micronutrients) => {
          // Should not throw any errors
          const result = await validationService.validateSoilData(nutrients, micronutrients);
          
          expect(result).toBeDefined();
          expect(typeof result.valid).toBe('boolean');
          expect(typeof result.confidence).toBe('number');
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * **Validates: Requirements 4.6**
   * Property: Recommendations should always be provided when issues are detected
   */
  it('should always provide recommendations when validation issues are detected', async () => {
    const problematicDataGenerator = fc.record({
      pH: soilParameterGenerator('pH', fc.oneof(
        fc.float({ min: 1.0, max: 3.5 }),
        fc.float({ min: 9.5, max: 12.0 })
      ), ''),
      nitrogen: soilParameterGenerator('Nitrogen', fc.oneof(
        fc.float({ min: -100, max: -1 }),
        fc.float({ min: 700, max: 1000 })
      ), 'kg/ha'),
      phosphorus: soilParameterGenerator('Phosphorus', validNutrientGenerator, 'kg/ha'),
      potassium: soilParameterGenerator('Potassium', validNutrientGenerator, 'kg/ha')
    });

    await fc.assert(
      fc.asyncProperty(
        problematicDataGenerator,
        micronutrientsGenerator,
        async (nutrients, micronutrients) => {
          const result = await validationService.validateSoilData(nutrients, micronutrients);

          const severeIssues = result.issues.filter(i => 
            i.severity === 'error' || i.severity === 'critical'
          );

          // If there are severe issues, there should be recommendations
          if (severeIssues.length > 0) {
            expect(result.recommendations.length).toBeGreaterThan(0);
            
            // Recommendations should be meaningful strings
            result.recommendations.forEach(rec => {
              expect(typeof rec).toBe('string');
              expect(rec.length).toBeGreaterThan(10); // Should be descriptive
            });
          }
        }
      ),
      { numRuns: 25 }
    );
  });
});