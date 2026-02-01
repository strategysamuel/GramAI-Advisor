// Enhanced Soil Data Validation and Anomaly Detection Service
// Implements comprehensive validation and anomaly detection for soil report parameters
// Validates pH, NPK, micronutrients and detects unusual or potentially incorrect values

import { 
  SoilParameter, 
  SoilNutrients, 
  Micronutrients, 
  SoilAnomaly, 
  SoilDataValidation 
} from '../types/index';

export interface ValidationOptions {
  strictMode?: boolean;
  confidenceThreshold?: number;
  enableStatisticalAnalysis?: boolean;
  enableCrossParameterValidation?: boolean;
  enableSeasonalValidation?: boolean;
  location?: {
    state: string;
    district: string;
    soilType?: string;
  };
  cropType?: string;
  season?: 'kharif' | 'rabi' | 'zaid';
}

export interface ValidationResult {
  valid: boolean;
  confidence: number;
  issues: ValidationIssue[];
  anomalies: SoilAnomaly[];
  recommendations: string[];
  statisticalAnalysis?: StatisticalAnalysis;
}

export interface ValidationIssue {
  parameter: string;
  issue: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  suggestion: string;
  confidence: number;
  possibleCauses?: string[];
}

export interface StatisticalAnalysis {
  outliers: Array<{
    parameter: string;
    value: number;
    expectedRange: { min: number; max: number };
    deviationScore: number;
  }>;
  correlationIssues: Array<{
    parameters: string[];
    issue: string;
    expectedCorrelation: string;
  }>;
  consistencyScore: number;
}

export class SoilDataValidationService {
  private readonly parameterRanges: Map<string, ParameterRange>;
  private readonly regionalRanges: Map<string, Map<string, ParameterRange>>;
  private readonly correlationRules: CorrelationRule[];
  private readonly seasonalAdjustments: Map<string, SeasonalAdjustment>;

  constructor() {
    this.parameterRanges = this.initializeParameterRanges();
    this.regionalRanges = this.initializeRegionalRanges();
    this.correlationRules = this.initializeCorrelationRules();
    this.seasonalAdjustments = this.initializeSeasonalAdjustments();
  }

  /**
   * Comprehensive validation of soil data with anomaly detection
   */
  public async validateSoilData(
    nutrients: SoilNutrients,
    micronutrients: Micronutrients,
    options: ValidationOptions = {}
  ): Promise<ValidationResult> {
    console.log('Starting comprehensive soil data validation and anomaly detection');

    const validationOptions = {
      strictMode: false,
      confidenceThreshold: 0.7,
      enableStatisticalAnalysis: true,
      enableCrossParameterValidation: true,
      enableSeasonalValidation: false,
      ...options
    };

    const issues: ValidationIssue[] = [];
    const anomalies: SoilAnomaly[] = [];
    const recommendations: string[] = [];
    let confidence = 1.0;

    // Step 1: Basic range validation
    const rangeValidation = await this.validateParameterRanges(
      nutrients, 
      micronutrients, 
      validationOptions
    );
    issues.push(...rangeValidation.issues);
    anomalies.push(...rangeValidation.anomalies);
    confidence = Math.min(confidence, rangeValidation.confidence);

    // Step 2: Statistical analysis and outlier detection
    let statisticalAnalysis: StatisticalAnalysis | undefined;
    if (validationOptions.enableStatisticalAnalysis) {
      statisticalAnalysis = await this.performStatisticalAnalysis(
        nutrients, 
        micronutrients, 
        validationOptions
      );
      
      // Convert statistical outliers to validation issues
      const statisticalIssues = this.convertStatisticalToValidationIssues(statisticalAnalysis);
      issues.push(...statisticalIssues.issues);
      anomalies.push(...statisticalIssues.anomalies);
      confidence = Math.min(confidence, statisticalAnalysis.consistencyScore);
    }

    // Step 3: Cross-parameter validation
    if (validationOptions.enableCrossParameterValidation) {
      const crossValidation = await this.validateCrossParameterRelationships(
        nutrients, 
        micronutrients, 
        validationOptions
      );
      issues.push(...crossValidation.issues);
      anomalies.push(...crossValidation.anomalies);
      confidence = Math.min(confidence, crossValidation.confidence);
    }

    // Step 4: Regional and seasonal validation
    if (validationOptions.location || validationOptions.season) {
      const contextualValidation = await this.validateContextualFactors(
        nutrients, 
        micronutrients, 
        validationOptions
      );
      issues.push(...contextualValidation.issues);
      anomalies.push(...contextualValidation.anomalies);
      confidence = Math.min(confidence, contextualValidation.confidence);
    }

    // Step 5: Generate recommendations based on findings
    recommendations.push(...this.generateValidationRecommendations(issues, anomalies, validationOptions));

    // Step 6: Determine overall validity
    const criticalIssues = issues.filter(i => i.severity === 'critical' || i.severity === 'error');
    const valid = criticalIssues.length === 0 && confidence >= validationOptions.confidenceThreshold;

    console.log(`Validation completed: ${valid ? 'VALID' : 'INVALID'}, confidence: ${confidence.toFixed(2)}`);
    console.log(`Found ${issues.length} issues, ${anomalies.length} anomalies`);

    return {
      valid,
      confidence: Math.max(0, confidence),
      issues,
      anomalies,
      recommendations,
      statisticalAnalysis
    };
  }

  /**
   * Validate parameter ranges against expected values
   */
  private async validateParameterRanges(
    nutrients: SoilNutrients,
    micronutrients: Micronutrients,
    options: ValidationOptions
  ): Promise<{
    issues: ValidationIssue[];
    anomalies: SoilAnomaly[];
    confidence: number;
  }> {
    const issues: ValidationIssue[] = [];
    const anomalies: SoilAnomaly[] = [];
    let confidence = 1.0;

    // Validate pH
    if (nutrients.pH) {
      const pHValidation = this.validateSingleParameter(nutrients.pH, 'pH', options);
      if (pHValidation.issue) {
        issues.push(pHValidation.issue);
        confidence -= 0.2;
      }
      if (pHValidation.anomaly) {
        anomalies.push(pHValidation.anomaly);
      }
    }

    // Validate main nutrients
    const mainNutrients = [
      { param: nutrients.nitrogen, name: 'Nitrogen' },
      { param: nutrients.phosphorus, name: 'Phosphorus' },
      { param: nutrients.potassium, name: 'Potassium' }
    ];

    for (const { param, name } of mainNutrients) {
      if (param) {
        const validation = this.validateSingleParameter(param, name, options);
        if (validation.issue) {
          issues.push(validation.issue);
          confidence -= 0.15;
        }
        if (validation.anomaly) {
          anomalies.push(validation.anomaly);
        }
      }
    }

    // Validate optional nutrients
    const optionalNutrients = [
      { param: nutrients.organicCarbon, name: 'Organic Carbon' },
      { param: nutrients.electricalConductivity, name: 'Electrical Conductivity' }
    ];

    for (const { param, name } of optionalNutrients) {
      if (param) {
        const validation = this.validateSingleParameter(param, name, options);
        if (validation.issue) {
          issues.push(validation.issue);
          confidence -= 0.05;
        }
        if (validation.anomaly) {
          anomalies.push(validation.anomaly);
        }
      }
    }

    // Validate micronutrients
    Object.entries(micronutrients).forEach(([key, param]) => {
      if (param) {
        const name = key.charAt(0).toUpperCase() + key.slice(1);
        const validation = this.validateSingleParameter(param, name, options);
        if (validation.issue) {
          issues.push(validation.issue);
          confidence -= 0.05;
        }
        if (validation.anomaly) {
          anomalies.push(validation.anomaly);
        }
      }
    });

    return { issues, anomalies, confidence: Math.max(0, confidence) };
  }

  /**
   * Validate a single parameter against expected ranges
   */
  private validateSingleParameter(
    parameter: SoilParameter,
    parameterName: string,
    options: ValidationOptions
  ): {
    issue?: ValidationIssue;
    anomaly?: SoilAnomaly;
  } {
    const ranges = this.getParameterRanges(parameterName, options);
    const value = parameter.value;

    // Check for impossible values
    if (value < 0 && parameterName !== 'pH') {
      return {
        issue: {
          parameter: parameterName,
          issue: 'Negative value detected',
          severity: 'critical',
          suggestion: `${parameterName} cannot be negative - check measurement accuracy`,
          confidence: 0.95,
          possibleCauses: ['Measurement error', 'Data entry mistake', 'Equipment malfunction']
        },
        anomaly: {
          parameter: parameterName,
          issue: 'Impossible negative value',
          severity: 'high',
          description: `${parameterName} value of ${value} is physically impossible`,
          possibleCauses: ['Measurement error', 'Data entry mistake'],
          recommendedAction: 'Retest the soil sample and verify measurement procedures'
        }
      };
    }

    // Check for extreme values
    if (value < ranges.absolute.min || value > ranges.absolute.max) {
      const severity = options.strictMode ? 'critical' : 'error';
      return {
        issue: {
          parameter: parameterName,
          issue: 'Value outside possible range',
          severity,
          suggestion: `${parameterName} value ${value} is outside possible range (${ranges.absolute.min}-${ranges.absolute.max})`,
          confidence: 0.9,
          possibleCauses: ['Measurement error', 'Extreme soil conditions', 'Equipment calibration issue']
        },
        anomaly: {
          parameter: parameterName,
          issue: 'Extreme value detected',
          severity: 'high',
          description: `${parameterName} value of ${value} is extremely ${value < ranges.absolute.min ? 'low' : 'high'}`,
          possibleCauses: [
            value < ranges.absolute.min ? 'Severe deficiency' : 'Excessive application',
            'Measurement error',
            'Unusual soil conditions'
          ],
          recommendedAction: 'Verify measurement and consider retesting'
        }
      };
    }

    // Check for unusual but possible values
    if (value < ranges.typical.min || value > ranges.typical.max) {
      return {
        issue: {
          parameter: parameterName,
          issue: 'Unusual value detected',
          severity: 'warning',
          suggestion: `${parameterName} value ${value} is outside typical range (${ranges.typical.min}-${ranges.typical.max})`,
          confidence: 0.7,
          possibleCauses: ['Unusual soil conditions', 'Recent fertilizer application', 'Natural variation']
        },
        anomaly: {
          parameter: parameterName,
          issue: 'Atypical value',
          severity: 'medium',
          description: `${parameterName} value of ${value} is unusual for typical soils`,
          possibleCauses: [
            'Natural soil variation',
            'Recent agricultural practices',
            'Specific soil type characteristics'
          ],
          recommendedAction: 'Monitor parameter and consider soil management adjustments'
        }
      };
    }

    return {};
  }

  /**
   * Perform statistical analysis to detect outliers and inconsistencies
   */
  private async performStatisticalAnalysis(
    nutrients: SoilNutrients,
    micronutrients: Micronutrients,
    options: ValidationOptions
  ): Promise<StatisticalAnalysis> {
    const outliers: StatisticalAnalysis['outliers'] = [];
    const correlationIssues: StatisticalAnalysis['correlationIssues'] = [];

    // Collect all parameter values
    const allParameters = this.collectAllParameters(nutrients, micronutrients);

    // Detect statistical outliers using Z-score method
    for (const param of allParameters) {
      const expectedRange = this.getParameterRanges(param.name, options);
      const mean = (expectedRange.typical.min + expectedRange.typical.max) / 2;
      const stdDev = (expectedRange.typical.max - expectedRange.typical.min) / 4; // Approximate std dev
      
      const zScore = Math.abs((param.value - mean) / stdDev);
      
      if (zScore > 2.5) { // More than 2.5 standard deviations
        outliers.push({
          parameter: param.name,
          value: param.value,
          expectedRange: expectedRange.typical,
          deviationScore: zScore
        });
      }
    }

    // Check parameter correlations
    correlationIssues.push(...this.checkParameterCorrelations(nutrients, micronutrients));

    // Calculate consistency score
    const consistencyScore = this.calculateConsistencyScore(outliers, correlationIssues, allParameters.length);

    return {
      outliers,
      correlationIssues,
      consistencyScore
    };
  }

  /**
   * Validate cross-parameter relationships and ratios
   */
  private async validateCrossParameterRelationships(
    nutrients: SoilNutrients,
    micronutrients: Micronutrients,
    options: ValidationOptions
  ): Promise<{
    issues: ValidationIssue[];
    anomalies: SoilAnomaly[];
    confidence: number;
  }> {
    const issues: ValidationIssue[] = [];
    const anomalies: SoilAnomaly[] = [];
    let confidence = 1.0;

    // Check N:P:K ratios
    if (nutrients.nitrogen && nutrients.phosphorus && nutrients.potassium) {
      const n = nutrients.nitrogen.value;
      const p = nutrients.phosphorus.value;
      const k = nutrients.potassium.value;

      // Check N:P ratio
      if (p > 0) {
        const npRatio = n / p;
        if (npRatio > 25 || npRatio < 5) {
          issues.push({
            parameter: 'N:P ratio',
            issue: 'Imbalanced nitrogen to phosphorus ratio',
            severity: 'warning',
            suggestion: `N:P ratio of ${npRatio.toFixed(1)}:1 indicates ${npRatio > 25 ? 'excess nitrogen or phosphorus deficiency' : 'nitrogen deficiency or excess phosphorus'}`,
            confidence: 0.8,
            possibleCauses: [
              npRatio > 25 ? 'Excessive nitrogen fertilization' : 'Insufficient nitrogen application',
              npRatio > 25 ? 'Phosphorus fixation' : 'Excessive phosphorus application',
              'Imbalanced fertilizer program'
            ]
          });

          anomalies.push({
            parameter: 'N:P ratio',
            issue: 'Nutrient ratio imbalance',
            severity: npRatio > 30 || npRatio < 3 ? 'high' : 'medium',
            description: `N:P ratio of ${npRatio.toFixed(1)}:1 suggests imbalanced fertilization`,
            possibleCauses: [
              'Unbalanced fertilizer application',
              'Nutrient fixation in soil',
              'Crop-specific nutrient uptake patterns'
            ],
            recommendedAction: 'Adjust fertilizer program to balance N:P ratio'
          });

          confidence -= 0.1;
        }
      }

      // Check K levels relative to N and P
      const avgNP = (n + p) / 2;
      if (k < avgNP * 0.5 || k > avgNP * 3) {
        issues.push({
          parameter: 'K balance',
          issue: 'Potassium imbalance relative to N and P',
          severity: 'warning',
          suggestion: `Potassium level ${k < avgNP * 0.5 ? 'too low' : 'too high'} compared to nitrogen and phosphorus`,
          confidence: 0.7,
          possibleCauses: [
            k < avgNP * 0.5 ? 'Insufficient potassium application' : 'Excessive potassium fertilization',
            'Soil type-specific nutrient dynamics',
            'Crop removal patterns'
          ]
        });
        confidence -= 0.05;
      }
    }

    // Check pH-nutrient availability relationships
    if (nutrients.pH) {
      const pH = nutrients.pH.value;
      
      // Check phosphorus availability at different pH levels
      if (nutrients.phosphorus && (pH < 5.5 || pH > 8.0)) {
        const pValue = nutrients.phosphorus.value;
        const expectedP = this.getExpectedPhosphorusAtPH(pH);
        
        if (pValue > expectedP * 1.5) {
          issues.push({
            parameter: 'pH-P relationship',
            issue: 'High phosphorus despite unfavorable pH',
            severity: 'info',
            suggestion: `Phosphorus level ${pValue} is higher than expected at pH ${pH}`,
            confidence: 0.6,
            possibleCauses: [
              'Recent phosphorus fertilizer application',
              'Organic matter contribution',
              'Measurement timing effects'
            ]
          });
        }
      }

      // Check micronutrient availability at high pH
      if (pH > 7.5) {
        const microDeficiencies = Object.entries(micronutrients)
          .filter(([_, param]) => param && param.status === 'deficient')
          .map(([name, _]) => name);

        if (microDeficiencies.length > 0) {
          issues.push({
            parameter: 'pH-micronutrient relationship',
            issue: 'Micronutrient deficiencies at high pH',
            severity: 'warning',
            suggestion: `High pH (${pH}) may be causing micronutrient deficiencies: ${microDeficiencies.join(', ')}`,
            confidence: 0.8,
            possibleCauses: [
              'Alkaline pH reducing micronutrient availability',
              'Nutrient precipitation at high pH',
              'Soil chemistry interactions'
            ]
          });
          confidence -= 0.1;
        }
      }
    }

    return { issues, anomalies, confidence: Math.max(0, confidence) };
  }

  /**
   * Validate contextual factors (regional, seasonal, crop-specific)
   */
  private async validateContextualFactors(
    nutrients: SoilNutrients,
    micronutrients: Micronutrients,
    options: ValidationOptions
  ): Promise<{
    issues: ValidationIssue[];
    anomalies: SoilAnomaly[];
    confidence: number;
  }> {
    const issues: ValidationIssue[] = [];
    const anomalies: SoilAnomaly[] = [];
    let confidence = 1.0;

    // Regional validation
    if (options.location) {
      const regionalValidation = this.validateRegionalContext(nutrients, micronutrients, options.location);
      issues.push(...regionalValidation.issues);
      anomalies.push(...regionalValidation.anomalies);
      confidence = Math.min(confidence, regionalValidation.confidence);
    }

    // Seasonal validation
    if (options.season) {
      const seasonalValidation = this.validateSeasonalContext(nutrients, micronutrients, options.season);
      issues.push(...seasonalValidation.issues);
      confidence = Math.min(confidence, seasonalValidation.confidence);
    }

    // Crop-specific validation
    if (options.cropType) {
      const cropValidation = this.validateCropSpecificContext(nutrients, micronutrients, options.cropType);
      issues.push(...cropValidation.issues);
      confidence = Math.min(confidence, cropValidation.confidence);
    }

    return { issues, anomalies, confidence };
  }

  /**
   * Convert statistical analysis results to validation issues
   */
  private convertStatisticalToValidationIssues(
    analysis: StatisticalAnalysis
  ): {
    issues: ValidationIssue[];
    anomalies: SoilAnomaly[];
  } {
    const issues: ValidationIssue[] = [];
    const anomalies: SoilAnomaly[] = [];

    // Convert outliers to issues
    for (const outlier of analysis.outliers) {
      issues.push({
        parameter: outlier.parameter,
        issue: 'Statistical outlier detected',
        severity: outlier.deviationScore > 3 ? 'warning' : 'info',
        suggestion: `${outlier.parameter} value ${outlier.value} deviates significantly from expected range`,
        confidence: Math.min(0.9, 1 - (outlier.deviationScore - 2) * 0.1),
        possibleCauses: [
          'Natural soil variation',
          'Recent agricultural practices',
          'Measurement uncertainty'
        ]
      });

      if (outlier.deviationScore > 3) {
        anomalies.push({
          parameter: outlier.parameter,
          issue: 'Significant statistical deviation',
          severity: 'medium',
          description: `${outlier.parameter} shows significant deviation from typical values`,
          possibleCauses: [
            'Unusual soil conditions',
            'Recent management practices',
            'Natural soil variability'
          ],
          recommendedAction: 'Consider retesting or investigate recent soil management'
        });
      }
    }

    // Convert correlation issues
    for (const correlation of analysis.correlationIssues) {
      issues.push({
        parameter: correlation.parameters.join('-'),
        issue: 'Parameter correlation anomaly',
        severity: 'info',
        suggestion: correlation.issue,
        confidence: 0.6,
        possibleCauses: [
          'Independent nutrient applications',
          'Soil-specific characteristics',
          'Temporal variation in measurements'
        ]
      });
    }

    return { issues, anomalies };
  }

  /**
   * Generate validation recommendations based on findings
   */
  private generateValidationRecommendations(
    issues: ValidationIssue[],
    anomalies: SoilAnomaly[],
    options: ValidationOptions
  ): string[] {
    const recommendations: string[] = [];

    const criticalIssues = issues.filter(i => i.severity === 'critical');
    const errorIssues = issues.filter(i => i.severity === 'error');
    const warningIssues = issues.filter(i => i.severity === 'warning');
    const highSeverityAnomalies = anomalies.filter(a => a.severity === 'high');

    if (criticalIssues.length > 0) {
      recommendations.push('CRITICAL: Retest soil sample immediately - critical validation errors detected');
      recommendations.push('Verify laboratory procedures and equipment calibration');
    }

    if (errorIssues.length > 0) {
      recommendations.push('Verify measurement accuracy for parameters with validation errors');
      recommendations.push('Consider retesting soil sample to confirm unusual values');
    }

    if (warningIssues.length > 2) {
      recommendations.push('Multiple validation warnings detected - review soil management practices');
    }

    if (highSeverityAnomalies.length > 0) {
      recommendations.push('Investigate causes of detected soil anomalies');
      recommendations.push('Consider consulting with soil science expert for unusual conditions');
    }

    // Add specific recommendations based on parameter types
    const pHIssues = issues.filter(i => i.parameter === 'pH');
    if (pHIssues.length > 0) {
      recommendations.push('pH validation issues detected - verify pH meter calibration');
    }

    const nutrientIssues = issues.filter(i => ['Nitrogen', 'Phosphorus', 'Potassium'].includes(i.parameter));
    if (nutrientIssues.length > 1) {
      recommendations.push('Multiple nutrient validation issues - review fertilizer application records');
    }

    if (recommendations.length === 0) {
      recommendations.push('Soil data validation passed - values appear reasonable and consistent');
    }

    return recommendations;
  }

  /**
   * Helper methods for validation
   */
  private collectAllParameters(nutrients: SoilNutrients, micronutrients: Micronutrients): Array<{ name: string; value: number }> {
    const parameters: Array<{ name: string; value: number }> = [];

    // Add main nutrients
    if (nutrients.pH) parameters.push({ name: 'pH', value: nutrients.pH.value });
    if (nutrients.nitrogen) parameters.push({ name: 'Nitrogen', value: nutrients.nitrogen.value });
    if (nutrients.phosphorus) parameters.push({ name: 'Phosphorus', value: nutrients.phosphorus.value });
    if (nutrients.potassium) parameters.push({ name: 'Potassium', value: nutrients.potassium.value });
    if (nutrients.organicCarbon) parameters.push({ name: 'Organic Carbon', value: nutrients.organicCarbon.value });
    if (nutrients.electricalConductivity) parameters.push({ name: 'Electrical Conductivity', value: nutrients.electricalConductivity.value });

    // Add micronutrients
    Object.entries(micronutrients).forEach(([key, param]) => {
      if (param) {
        const name = key.charAt(0).toUpperCase() + key.slice(1);
        parameters.push({ name, value: param.value });
      }
    });

    return parameters;
  }

  private checkParameterCorrelations(nutrients: SoilNutrients, micronutrients: Micronutrients): StatisticalAnalysis['correlationIssues'] {
    const issues: StatisticalAnalysis['correlationIssues'] = [];

    // Check organic carbon correlation with nutrients
    if (nutrients.organicCarbon && nutrients.nitrogen) {
      const oc = nutrients.organicCarbon.value;
      const n = nutrients.nitrogen.value;
      
      // Organic carbon should correlate with nitrogen
      const expectedN = oc * 20; // Rough correlation factor
      if (Math.abs(n - expectedN) > expectedN * 0.5) {
        issues.push({
          parameters: ['Organic Carbon', 'Nitrogen'],
          issue: 'Unexpected organic carbon to nitrogen relationship',
          expectedCorrelation: 'Organic carbon should correlate with nitrogen availability'
        });
      }
    }

    return issues;
  }

  private calculateConsistencyScore(outliers: any[], correlationIssues: any[], totalParameters: number): number {
    if (totalParameters === 0) return 1.0;

    const outlierPenalty = (outliers.length / totalParameters) * 0.3;
    const correlationPenalty = (correlationIssues.length / Math.max(1, totalParameters / 2)) * 0.2;
    
    return Math.max(0, 1 - outlierPenalty - correlationPenalty);
  }

  private validateRegionalContext(
    nutrients: SoilNutrients,
    micronutrients: Micronutrients,
    location: { state: string; district: string; soilType?: string }
  ): { issues: ValidationIssue[]; anomalies: SoilAnomaly[]; confidence: number } {
    // Simplified regional validation - in real implementation, this would use regional soil databases
    const issues: ValidationIssue[] = [];
    const anomalies: SoilAnomaly[] = [];
    let confidence = 1.0;

    // Example: Check for region-specific issues
    if (location.state === 'Rajasthan' && nutrients.pH && nutrients.pH.value < 6.0) {
      issues.push({
        parameter: 'pH',
        issue: 'Unusually acidic soil for arid region',
        severity: 'warning',
        suggestion: 'Acidic pH is uncommon in Rajasthan - verify measurement',
        confidence: 0.7,
        possibleCauses: ['Measurement error', 'Localized soil conditions', 'Recent amendments']
      });
      confidence -= 0.1;
    }

    return { issues, anomalies, confidence };
  }

  private validateSeasonalContext(
    nutrients: SoilNutrients,
    micronutrients: Micronutrients,
    season: string
  ): { issues: ValidationIssue[]; confidence: number } {
    const issues: ValidationIssue[] = [];
    let confidence = 1.0;

    // Example seasonal validation
    if (season === 'post-harvest' && nutrients.nitrogen && nutrients.nitrogen.value > 300) {
      issues.push({
        parameter: 'Nitrogen',
        issue: 'High nitrogen levels post-harvest',
        severity: 'info',
        suggestion: 'High nitrogen after harvest may indicate excess fertilization',
        confidence: 0.6,
        possibleCauses: ['Excess fertilizer application', 'Crop residue decomposition', 'Reduced uptake']
      });
    }

    return { issues, confidence };
  }

  private validateCropSpecificContext(
    nutrients: SoilNutrients,
    micronutrients: Micronutrients,
    cropType: string
  ): { issues: ValidationIssue[]; confidence: number } {
    const issues: ValidationIssue[] = [];
    let confidence = 1.0;

    // Example crop-specific validation
    if (cropType === 'rice' && nutrients.pH && nutrients.pH.value > 8.0) {
      issues.push({
        parameter: 'pH',
        issue: 'High pH for rice cultivation',
        severity: 'warning',
        suggestion: 'pH above 8.0 may affect rice growth and nutrient availability',
        confidence: 0.8,
        possibleCauses: ['Alkaline soil conditions', 'Lime application', 'Irrigation water quality']
      });
      confidence -= 0.1;
    }

    return { issues, confidence };
  }

  private getExpectedPhosphorusAtPH(pH: number): number {
    // Simplified relationship - phosphorus availability decreases at extreme pH
    if (pH < 5.5 || pH > 8.0) {
      return 10; // Lower expected availability
    }
    return 20; // Normal expected availability
  }

  /**
   * Initialize parameter ranges for validation
   */
  private initializeParameterRanges(): Map<string, ParameterRange> {
    const ranges = new Map<string, ParameterRange>();

    ranges.set('pH', {
      absolute: { min: 3.0, max: 11.0 },
      typical: { min: 4.5, max: 8.5 },
      optimal: { min: 6.0, max: 7.5 }
    });

    ranges.set('Nitrogen', {
      absolute: { min: 0, max: 1000 },
      typical: { min: 50, max: 500 },
      optimal: { min: 200, max: 300 }
    });

    ranges.set('Phosphorus', {
      absolute: { min: 0, max: 200 },
      typical: { min: 5, max: 100 },
      optimal: { min: 20, max: 40 }
    });

    ranges.set('Potassium', {
      absolute: { min: 0, max: 800 },
      typical: { min: 50, max: 400 },
      optimal: { min: 120, max: 200 }
    });

    ranges.set('Organic Carbon', {
      absolute: { min: 0, max: 5.0 },
      typical: { min: 0.2, max: 2.0 },
      optimal: { min: 0.5, max: 1.5 }
    });

    ranges.set('Electrical Conductivity', {
      absolute: { min: 0, max: 10.0 },
      typical: { min: 0.1, max: 4.0 },
      optimal: { min: 0.2, max: 0.8 }
    });

    // Micronutrients
    ranges.set('Zinc', {
      absolute: { min: 0, max: 20 },
      typical: { min: 0.2, max: 10 },
      optimal: { min: 1.0, max: 3.0 }
    });

    ranges.set('Iron', {
      absolute: { min: 0, max: 100 },
      typical: { min: 2, max: 50 },
      optimal: { min: 10, max: 25 }
    });

    ranges.set('Manganese', {
      absolute: { min: 0, max: 50 },
      typical: { min: 1, max: 30 },
      optimal: { min: 5, max: 15 }
    });

    ranges.set('Copper', {
      absolute: { min: 0, max: 10 },
      typical: { min: 0.1, max: 5 },
      optimal: { min: 0.5, max: 2.0 }
    });

    ranges.set('Boron', {
      absolute: { min: 0, max: 5 },
      typical: { min: 0.1, max: 2 },
      optimal: { min: 0.5, max: 1.0 }
    });

    ranges.set('Sulfur', {
      absolute: { min: 0, max: 100 },
      typical: { min: 2, max: 50 },
      optimal: { min: 10, max: 20 }
    });

    return ranges;
  }

  private initializeRegionalRanges(): Map<string, Map<string, ParameterRange>> {
    // Simplified - in real implementation, this would contain extensive regional data
    return new Map();
  }

  private initializeCorrelationRules(): CorrelationRule[] {
    return [
      {
        parameters: ['Organic Carbon', 'Nitrogen'],
        expectedCorrelation: 'positive',
        strength: 'moderate',
        description: 'Organic carbon should correlate with nitrogen availability'
      },
      {
        parameters: ['pH', 'Phosphorus'],
        expectedCorrelation: 'optimal_range',
        strength: 'moderate',
        description: 'Phosphorus availability is optimal at pH 6.0-7.5'
      }
    ];
  }

  private initializeSeasonalAdjustments(): Map<string, SeasonalAdjustment> {
    return new Map();
  }

  private getParameterRanges(parameterName: string, options: ValidationOptions): ParameterRange {
    // Check for regional adjustments first
    if (options.location) {
      const regionalRanges = this.regionalRanges.get(options.location.state);
      if (regionalRanges?.has(parameterName)) {
        return regionalRanges.get(parameterName)!;
      }
    }

    // Return default ranges
    return this.parameterRanges.get(parameterName) || {
      absolute: { min: 0, max: 1000 },
      typical: { min: 0, max: 100 },
      optimal: { min: 10, max: 50 }
    };
  }
}

// Supporting interfaces
interface ParameterRange {
  absolute: { min: number; max: number };
  typical: { min: number; max: number };
  optimal: { min: number; max: number };
}

interface CorrelationRule {
  parameters: string[];
  expectedCorrelation: 'positive' | 'negative' | 'optimal_range';
  strength: 'weak' | 'moderate' | 'strong';
  description: string;
}

interface SeasonalAdjustment {
  parameter: string;
  season: string;
  adjustmentFactor: number;
  description: string;
}

export default SoilDataValidationService;