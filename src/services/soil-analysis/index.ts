// Soil Analysis Service - Main service for processing soil reports
// Integrates OCR processing, data extraction, validation, and recommendations

import OCRProcessingService from './services/OCRProcessingService';
import SoilParameterExplanationService, { ParameterExplanation, SoilHealthExplanation } from './services/SoilParameterExplanationService';
import SoilDeficiencyService, { SoilDeficiency, RemediationPlan } from './services/SoilDeficiencyService';
import SoilDataValidationService, { ValidationOptions, ValidationResult } from './services/SoilDataValidationService';
// import SoilDataExtractionService from './services/SoilDataExtractionService';
import {
  SoilReportMetadata,
  SoilAnalysisResult,
  SoilReportUploadOptions,
  SoilParameter,
  SoilNutrients,
  Micronutrients,
  SoilRecommendation,
  SoilAnomaly,
  SoilDataValidation,
  OCRResult,
  CropRecommendation,
  CropRecommendationOptions,
  CropSuitabilityAnalysis
} from './types';

export class SoilAnalysisService {
  private ocrService: OCRProcessingService;
  private explanationService: SoilParameterExplanationService;
  private deficiencyService: SoilDeficiencyService;
  private validationService: SoilDataValidationService;
  // private dataExtractionService: SoilDataExtractionService;

  constructor() {
    this.ocrService = new OCRProcessingService();
    this.explanationService = new SoilParameterExplanationService();
    this.deficiencyService = new SoilDeficiencyService();
    this.validationService = new SoilDataValidationService();
    // this.dataExtractionService = new SoilDataExtractionService();
    console.log('Soil Analysis Service initialized with OCR processing, enhanced data extraction, farmer-friendly explanations, deficiency identification, and comprehensive validation');
  }

  /**
   * Upload and process soil report
   */
  public async uploadAndProcessSoilReport(
    documentBuffer: Buffer,
    metadata: SoilReportMetadata,
    options: SoilReportUploadOptions = {}
  ): Promise<SoilAnalysisResult> {
    try {
      console.log(`Processing soil report for farmer: ${metadata.farmerId}`);

      // Set default options
      const processingOptions = {
        enableOCR: true,
        language: 'en',
        expectedFormat: 'standard',
        validateData: true,
        generateRecommendations: true,
        ...options
      };

      // Step 1: OCR Processing
      let ocrResult: OCRResult | null = null;
      if (processingOptions.enableOCR) {
        ocrResult = await this.ocrService.processDocument(documentBuffer, metadata, {
          language: processingOptions.language,
          expectedFormat: processingOptions.expectedFormat as 'standard' | 'government' | 'private_lab' | 'university',
          enhanceImage: true
        });
      }

      // Step 2: Extract soil parameters using enhanced extraction (simplified for now)
      if (!ocrResult) {
        throw new Error('OCR processing failed - no result available');
      }

      const extractedData = {
        nutrients: await this.extractSoilParametersEnhanced(ocrResult),
        micronutrients: await this.extractMicronutrientsEnhanced(ocrResult),
        soilTexture: this.extractSoilTexture(ocrResult.extractedText),
        soilType: this.extractSoilType(ocrResult.extractedText)
      };

      // Enhanced extraction metadata
      const extractionMetadata = {
        totalParametersFound: this.countExtractedParameters(extractedData),
        confidenceScore: this.calculateExtractionConfidence(extractedData),
        extractionMethod: 'enhanced_pattern_matching',
        processingTime: Date.now() - Date.now(),
        warnings: this.generateExtractionWarnings(extractedData)
      };

      // Step 3: Use enhanced validation with comprehensive anomaly detection
      const validation = await this.validateSoilDataComprehensive(
        extractedData, 
        {
          strictMode: processingOptions.validateData,
          enableStatisticalAnalysis: true,
          enableCrossParameterValidation: true,
          confidenceThreshold: 0.7
        }
      );

      // Step 4: Generate interpretation
      const interpretation = await this.interpretSoilData(extractedData);

      // Step 5: Generate farmer-friendly explanation
      const farmerFriendlyExplanation = await this.generateFarmerFriendlyExplanation(
        extractedData,
        interpretation,
        processingOptions.language || 'en'
      );

      // Step 6: Enhanced anomaly detection with comprehensive analysis
      const anomalies = await this.detectAnomaliesComprehensive(extractedData, validation);

      // Step 7: Generate recommendations
      const recommendations = processingOptions.generateRecommendations
        ? await this.generateRecommendations(extractedData, interpretation)
        : [];

      const result: SoilAnalysisResult = {
        reportId: `SR_${Date.now()}_${metadata.farmerId}`,
        metadata,
        extractedData,
        interpretation: {
          ...interpretation,
          recommendations
        },
        farmerFriendlyExplanation,
        confidence: Math.min(ocrResult?.confidence || 0.8, validation.confidence),
        processingDate: new Date(),
        anomalies
      };

      console.log(`Soil analysis completed for report: ${result.reportId}`);
      return result;

    } catch (error) {
      console.error('Soil report processing failed:', error);
      throw new Error(`Soil report processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Enhanced soil data extraction with multiple methods and validation
   */
  public async extractSoilDataEnhanced(
    ocrResult: OCRResult,
    options: {
      strictMode?: boolean;
      confidenceThreshold?: number;
      enableFuzzyMatching?: boolean;
      normalizeUnits?: boolean;
      validateRanges?: boolean;
    } = {}
  ) {
    console.log('Performing enhanced soil data extraction');
    
    // Simplified enhanced extraction for now
    const nutrients = await this.extractSoilParametersEnhanced(ocrResult);
    const micronutrients = await this.extractMicronutrientsEnhanced(ocrResult);
    
    const extractionMetadata = {
      totalParametersFound: this.countExtractedParameters({ nutrients, micronutrients }),
      confidenceScore: this.calculateExtractionConfidence({ nutrients, micronutrients }),
      extractionMethod: 'enhanced_pattern_matching',
      processingTime: 100,
      warnings: this.generateExtractionWarnings({ nutrients, micronutrients })
    };
    
    const validation = await this.validateSoilDataComprehensive({ nutrients, micronutrients }, {
      strictMode: options.strictMode,
      confidenceThreshold: options.confidenceThreshold,
      enableStatisticalAnalysis: true,
      enableCrossParameterValidation: true
    });
    
    return {
      nutrients,
      micronutrients,
      extractionMetadata,
      validation
    };
  }

  /**
   * Get detailed extraction statistics
   */
  public async getExtractionStatistics(ocrResult: OCRResult) {
    const extractionResult = await this.extractSoilDataEnhanced(ocrResult);
    
    return {
      totalParametersFound: extractionResult.extractionMetadata.totalParametersFound,
      confidenceScore: extractionResult.extractionMetadata.confidenceScore,
      extractionMethod: extractionResult.extractionMetadata.extractionMethod,
      processingTime: extractionResult.extractionMetadata.processingTime,
      warnings: extractionResult.extractionMetadata.warnings,
      validationIssues: extractionResult.validation.issues.length,
      validationConfidence: extractionResult.validation.confidence
    };
  }

  /**
   * Enhanced soil parameter extraction
   */
  private async extractSoilParametersEnhanced(ocrResult: OCRResult): Promise<SoilNutrients> {
    const parameters = ocrResult.structuredData?.parameters || [];
    
    // Helper function to create soil parameter
    const createSoilParameter = (
      name: string,
      value: number,
      unit: string,
      confidence: number = 0.8
    ): SoilParameter => {
      const ranges = this.getParameterRanges(name);
      const status = this.determineParameterStatus(value, ranges);
      
      return {
        name,
        value,
        unit,
        range: ranges,
        status,
        confidence
      };
    };

    // Enhanced parameter extraction with pattern matching
    const extractedParams = this.extractParametersWithPatterns(ocrResult.extractedText);
    
    // Merge structured data with pattern-matched data
    const allParams = [...parameters, ...extractedParams];

    // Extract nutrients with enhanced logic
    const nutrients: SoilNutrients = {
      pH: createSoilParameter('pH', this.findBestParameterValue(allParams, 'pH') || 7.0, ''),
      nitrogen: createSoilParameter('Nitrogen', this.findBestParameterValue(allParams, 'Nitrogen') || 200, 'kg/ha'),
      phosphorus: createSoilParameter('Phosphorus', this.findBestParameterValue(allParams, 'Phosphorus') || 15, 'kg/ha'),
      potassium: createSoilParameter('Potassium', this.findBestParameterValue(allParams, 'Potassium') || 120, 'kg/ha')
    };

    // Add optional nutrients if available
    const organicCarbon = this.findBestParameterValue(allParams, 'Organic Carbon');
    if (organicCarbon !== null) {
      nutrients.organicCarbon = createSoilParameter('Organic Carbon', organicCarbon, '%');
    }

    const ec = this.findBestParameterValue(allParams, 'Electrical Conductivity');
    if (ec !== null) {
      nutrients.electricalConductivity = createSoilParameter('Electrical Conductivity', ec, 'dS/m');
    }

    return nutrients;
  }

  /**
   * Enhanced micronutrient extraction
   */
  private async extractMicronutrientsEnhanced(ocrResult: OCRResult): Promise<Micronutrients> {
    const parameters = ocrResult.structuredData?.parameters || [];
    const extractedParams = this.extractParametersWithPatterns(ocrResult.extractedText);
    const allParams = [...parameters, ...extractedParams];

    const createSoilParameter = (
      name: string,
      value: number,
      unit: string,
      confidence: number = 0.8
    ): SoilParameter => {
      const ranges = this.getParameterRanges(name);
      const status = this.determineParameterStatus(value, ranges);
      
      return {
        name,
        value,
        unit,
        range: ranges,
        status,
        confidence
      };
    };

    const micronutrients: Micronutrients = {};
    
    const micronutrientNames = ['Zinc', 'Iron', 'Manganese', 'Copper', 'Boron', 'Sulfur'];
    for (const nutrient of micronutrientNames) {
      const value = this.findBestParameterValue(allParams, nutrient);
      if (value !== null) {
        micronutrients[nutrient.toLowerCase() as keyof Micronutrients] = 
          createSoilParameter(nutrient, value, 'ppm');
      }
    }

    return micronutrients;
  }

  /**
   * Extract parameters using enhanced pattern matching
   */
  private extractParametersWithPatterns(text: string): Array<{ name: string; value: string; confidence: number }> {
    const patterns = [
      { name: 'pH', pattern: /\bpH[:\s]*(\d+\.?\d*)/gi },
      { name: 'Nitrogen', pattern: /(?:available\s+n|nitrogen|available\s+nitrogen)[:\s]*(\d+\.?\d*)/gi },
      { name: 'Phosphorus', pattern: /(?:p2o5|available\s+p|phosphorus|phosphorous|available\s+phosphorus)[:\s]*(\d+\.?\d*)/gi },
      { name: 'Potassium', pattern: /(?:k2o|available\s+k|potassium|available\s+potassium)[:\s]*(\d+\.?\d*)/gi },
      { name: 'Organic Carbon', pattern: /(?:organic carbon|oc)[:\s]*(\d+\.?\d*)/gi },
      { name: 'Electrical Conductivity', pattern: /(?:electrical conductivity|ec)[:\s]*(\d+\.?\d*)/gi },
      { name: 'Zinc', pattern: /(?:zinc|zn)[:\s]*(\d+\.?\d*)/gi },
      { name: 'Iron', pattern: /(?:iron|fe)[:\s]*(\d+\.?\d*)/gi },
      { name: 'Manganese', pattern: /(?:manganese|mn)[:\s]*(\d+\.?\d*)/gi },
      { name: 'Copper', pattern: /(?:copper|cu)[:\s]*(\d+\.?\d*)/gi },
      { name: 'Boron', pattern: /(?:boron|b)[:\s]*(\d+\.?\d*)/gi },
      { name: 'Sulfur', pattern: /(?:sulfur|sulphur|s)[:\s]*(\d+\.?\d*)/gi }
    ];

    const extracted: Array<{ name: string; value: string; confidence: number }> = [];

    for (const { name, pattern } of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          extracted.push({
            name,
            value: match[1],
            confidence: 0.7 // Pattern matching confidence
          });
        }
      }
    }

    return extracted;
  }

  /**
   * Find best parameter value from multiple sources
   */
  private findBestParameterValue(
    parameters: Array<{ name: string; value: string; confidence?: number }>, 
    parameterName: string
  ): number | null {
    // Create variations of the parameter name to match
    const variations = this.getParameterVariations(parameterName);
    
    const matches = parameters.filter(p => 
      variations.some(variation => 
        p.name.toLowerCase().includes(variation.toLowerCase()) ||
        variation.toLowerCase().includes(p.name.toLowerCase())
      )
    );
    
    if (matches.length === 0) return null;
    
    // Use the match with highest confidence, or first match if no confidence
    const bestMatch = matches.reduce((best, current) => {
      const bestConf = best.confidence || 0.5;
      const currentConf = current.confidence || 0.5;
      return currentConf > bestConf ? current : best;
    });
    
    const numericValue = parseFloat(bestMatch.value);
    return isNaN(numericValue) ? null : numericValue;
  }

  /**
   * Get parameter name variations for better matching
   */
  private getParameterVariations(parameterName: string): string[] {
    const variations: Record<string, string[]> = {
      'pH': ['pH', 'ph', 'acidity'],
      'Nitrogen': ['nitrogen', 'n', 'available n', 'available nitrogen'],
      'Phosphorus': ['phosphorus', 'phosphorous', 'p', 'p2o5', 'available p', 'available phosphorus'],
      'Potassium': ['potassium', 'k', 'k2o', 'available k', 'available potassium'],
      'Organic Carbon': ['organic carbon', 'oc', 'organic matter', 'om'],
      'Electrical Conductivity': ['electrical conductivity', 'ec', 'conductivity'],
      'Zinc': ['zinc', 'zn'],
      'Iron': ['iron', 'fe'],
      'Manganese': ['manganese', 'mn'],
      'Copper': ['copper', 'cu'],
      'Boron': ['boron', 'b'],
      'Sulfur': ['sulfur', 'sulphur', 's']
    };

    return variations[parameterName] || [parameterName.toLowerCase()];
  }

  /**
   * Count extracted parameters
   */
  private countExtractedParameters(data: { nutrients: SoilNutrients; micronutrients: Micronutrients }): number {
    let count = 0;
    
    // Count main nutrients
    if (data.nutrients.pH) count++;
    if (data.nutrients.nitrogen) count++;
    if (data.nutrients.phosphorus) count++;
    if (data.nutrients.potassium) count++;
    if (data.nutrients.organicCarbon) count++;
    if (data.nutrients.electricalConductivity) count++;
    
    // Count micronutrients
    count += Object.keys(data.micronutrients).length;
    
    return count;
  }

  /**
   * Calculate extraction confidence
   */
  private calculateExtractionConfidence(data: { nutrients: SoilNutrients; micronutrients: Micronutrients }): number {
    const allParams = [
      data.nutrients.pH,
      data.nutrients.nitrogen,
      data.nutrients.phosphorus,
      data.nutrients.potassium,
      data.nutrients.organicCarbon,
      data.nutrients.electricalConductivity,
      ...Object.values(data.micronutrients)
    ].filter(Boolean);

    if (allParams.length === 0) return 0;
    
    const totalConfidence = allParams.reduce((sum, param) => sum + (param?.confidence || 0), 0);
    return totalConfidence / allParams.length;
  }

  /**
   * Generate extraction warnings
   */
  private generateExtractionWarnings(data: { nutrients: SoilNutrients; micronutrients: Micronutrients }): string[] {
    const warnings: string[] = [];
    
    const allParams = [
      data.nutrients.pH,
      data.nutrients.nitrogen,
      data.nutrients.phosphorus,
      data.nutrients.potassium,
      data.nutrients.organicCarbon,
      data.nutrients.electricalConductivity,
      ...Object.values(data.micronutrients)
    ].filter(Boolean);

    const lowConfidenceParams = allParams.filter(p => p && p.confidence < 0.6);
    if (lowConfidenceParams.length > 0) {
      warnings.push(`${lowConfidenceParams.length} parameters extracted with low confidence`);
    }

    const missingMainParams = [];
    if (!data.nutrients.pH) missingMainParams.push('pH');
    if (!data.nutrients.nitrogen) missingMainParams.push('Nitrogen');
    if (!data.nutrients.phosphorus) missingMainParams.push('Phosphorus');
    if (!data.nutrients.potassium) missingMainParams.push('Potassium');

    if (missingMainParams.length > 0) {
      warnings.push(`Missing main parameters: ${missingMainParams.join(', ')}`);
    }

    return warnings;
  }

  /**
   * Comprehensive soil data validation with enhanced anomaly detection
   */
  public async validateSoilDataComprehensive(
    extractedData: { nutrients: SoilNutrients; micronutrients: Micronutrients },
    options: ValidationOptions = {}
  ): Promise<ValidationResult> {
    console.log('Performing comprehensive soil data validation and anomaly detection');
    
    return await this.validationService.validateSoilData(
      extractedData.nutrients,
      extractedData.micronutrients,
      options
    );
  }

  /**
   * Enhanced anomaly detection with comprehensive analysis
   */
  private async detectAnomaliesComprehensive(
    extractedData: any,
    validationResult: ValidationResult
  ): Promise<SoilAnomaly[]> {
    console.log('Performing comprehensive anomaly detection');
    
    const anomalies: SoilAnomaly[] = [];

    // Include anomalies from validation service
    anomalies.push(...validationResult.anomalies);

    // Add legacy anomaly detection for backward compatibility
    const legacyAnomalies = await this.detectAnomalies(extractedData);
    
    // Merge and deduplicate anomalies
    const mergedAnomalies = this.mergeAnomalies(anomalies, legacyAnomalies);
    
    console.log(`Detected ${mergedAnomalies.length} total anomalies`);
    return mergedAnomalies;
  }

  /**
   * Merge and deduplicate anomalies from different detection methods
   */
  private mergeAnomalies(primary: SoilAnomaly[], secondary: SoilAnomaly[]): SoilAnomaly[] {
    const merged = [...primary];
    
    for (const secondaryAnomaly of secondary) {
      // Check if similar anomaly already exists
      const exists = primary.some(primaryAnomaly => 
        primaryAnomaly.parameter === secondaryAnomaly.parameter &&
        primaryAnomaly.issue.toLowerCase().includes(secondaryAnomaly.issue.toLowerCase().split(' ')[0])
      );
      
      if (!exists) {
        merged.push(secondaryAnomaly);
      }
    }
    
    return merged;
  }

  /**
   * Get comprehensive validation report
   */
  public async getValidationReport(
    nutrients: SoilNutrients,
    micronutrients: Micronutrients,
    options: ValidationOptions = {}
  ): Promise<{
    validationResult: ValidationResult;
    summary: {
      overallStatus: 'VALID' | 'WARNING' | 'ERROR' | 'CRITICAL';
      confidence: number;
      issueCount: number;
      anomalyCount: number;
      criticalIssues: number;
    };
    recommendations: string[];
  }> {
    const validationResult = await this.validationService.validateSoilData(nutrients, micronutrients, options);
    
    const criticalIssues = validationResult.issues.filter(i => i.severity === 'critical').length;
    const errorIssues = validationResult.issues.filter(i => i.severity === 'error').length;
    const warningIssues = validationResult.issues.filter(i => i.severity === 'warning').length;
    
    let overallStatus: 'VALID' | 'WARNING' | 'ERROR' | 'CRITICAL';
    if (criticalIssues > 0) {
      overallStatus = 'CRITICAL';
    } else if (errorIssues > 0) {
      overallStatus = 'ERROR';
    } else if (warningIssues > 0) {
      overallStatus = 'WARNING';
    } else {
      overallStatus = 'VALID';
    }
    
    return {
      validationResult,
      summary: {
        overallStatus,
        confidence: validationResult.confidence,
        issueCount: validationResult.issues.length,
        anomalyCount: validationResult.anomalies.length,
        criticalIssues
      },
      recommendations: validationResult.recommendations
    };
  }

  /**
   * Enhanced soil data validation
   */
  private async validateSoilDataEnhanced(data: { nutrients: SoilNutrients; micronutrients: Micronutrients }): Promise<SoilDataValidation> {
    const issues: SoilDataValidation['issues'] = [];
    let confidence = 1.0;

    // Validate pH range
    if (data.nutrients.pH) {
      const pH = data.nutrients.pH.value;
      if (pH < 3.0 || pH > 11.0) {
        issues.push({
          parameter: 'pH',
          issue: 'pH value outside possible soil range',
          severity: 'error',
          suggestion: 'Verify pH measurement - soil pH typically ranges from 3.0 to 11.0'
        });
        confidence -= 0.3;
      } else if (pH < 4.0 || pH > 9.5) {
        issues.push({
          parameter: 'pH',
          issue: 'pH value outside typical soil range',
          severity: 'warning',
          suggestion: 'Unusual pH value - please verify measurement'
        });
        confidence -= 0.1;
      }
    }

    // Validate nutrient values
    const nutrients = ['nitrogen', 'phosphorus', 'potassium'];
    for (const nutrient of nutrients) {
      const param = data.nutrients[nutrient as keyof SoilNutrients];
      if (param && param.value < 0) {
        issues.push({
          parameter: nutrient,
          issue: 'Negative nutrient value detected',
          severity: 'error',
          suggestion: `${nutrient} cannot be negative - please check the report`
        });
        confidence -= 0.15;
      }
    }

    // Check for missing critical parameters
    if (!data.nutrients.pH || !data.nutrients.nitrogen || 
        !data.nutrients.phosphorus || !data.nutrients.potassium) {
      issues.push({
        parameter: 'general',
        issue: 'Missing critical soil parameters',
        severity: 'warning',
        suggestion: 'Some essential parameters (pH, N, P, K) are missing from the report'
      });
      confidence -= 0.1;
    }

    return {
      valid: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      confidence: Math.max(0, confidence)
    };
  }
  private async extractSoilParameters(ocrResult: OCRResult | null): Promise<{
    nutrients: SoilNutrients;
    micronutrients: Micronutrients;
    soilTexture?: string;
    soilType?: string;
    organicMatter?: SoilParameter;
  }> {
    try {
      if (!ocrResult?.structuredData?.parameters) {
        throw new Error('No structured data available from OCR');
      }

      const parameters = ocrResult.structuredData.parameters;

      // Helper function to create soil parameter
      const createSoilParameter = (
        name: string,
        value: number,
        unit: string
      ): SoilParameter => {
        const ranges = this.getParameterRanges(name);
        const status = this.determineParameterStatus(value, ranges);
        
        return {
          name,
          value,
          unit,
          range: ranges,
          status,
          confidence: 0.8
        };
      };

      // Extract nutrients
      const nutrients: SoilNutrients = {
        pH: createSoilParameter('pH', this.findParameterValue(parameters, 'pH') || 7.0, ''),
        nitrogen: createSoilParameter('Nitrogen', this.findParameterValue(parameters, 'Nitrogen') || 200, 'kg/ha'),
        phosphorus: createSoilParameter('Phosphorus', this.findParameterValue(parameters, 'Phosphorus') || 15, 'kg/ha'),
        potassium: createSoilParameter('Potassium', this.findParameterValue(parameters, 'Potassium') || 120, 'kg/ha')
      };

      // Add optional nutrients if available
      const organicCarbon = this.findParameterValue(parameters, 'Organic Carbon');
      if (organicCarbon !== null) {
        nutrients.organicCarbon = createSoilParameter('Organic Carbon', organicCarbon, '%');
      }

      const ec = this.findParameterValue(parameters, 'Electrical Conductivity');
      if (ec !== null) {
        nutrients.electricalConductivity = createSoilParameter('Electrical Conductivity', ec, 'dS/m');
      }

      // Extract micronutrients
      const micronutrients: Micronutrients = {};
      
      const micronutrientNames = ['Zinc', 'Iron', 'Manganese', 'Copper', 'Boron', 'Sulfur'];
      for (const nutrient of micronutrientNames) {
        const value = this.findParameterValue(parameters, nutrient);
        if (value !== null) {
          micronutrients[nutrient.toLowerCase() as keyof Micronutrients] = 
            createSoilParameter(nutrient, value, 'ppm');
        }
      }

      return {
        nutrients,
        micronutrients,
        soilTexture: this.extractSoilTexture(ocrResult.extractedText),
        soilType: this.extractSoilType(ocrResult.extractedText)
      };

    } catch (error) {
      console.error('Parameter extraction failed:', error);
      throw error;
    }
  }

  /**
   * Find parameter value from OCR results
   */
  private findParameterValue(parameters: Array<{ name: string; value: string; confidence: number }>, parameterName: string): number | null {
    const param = parameters.find(p => 
      p.name.toLowerCase().includes(parameterName.toLowerCase())
    );
    
    if (param) {
      const numericValue = parseFloat(param.value);
      return isNaN(numericValue) ? null : numericValue;
    }
    
    return null;
  }

  /**
   * Get parameter ranges for validation
   */
  private getParameterRanges(parameterName: string): SoilParameter['range'] {
    const ranges: Record<string, SoilParameter['range']> = {
      'pH': { min: 4.0, max: 9.0, optimal: { min: 6.0, max: 7.5 } },
      'Nitrogen': { min: 0, max: 500, optimal: { min: 200, max: 300 } },
      'Phosphorus': { min: 0, max: 100, optimal: { min: 20, max: 40 } },
      'Potassium': { min: 0, max: 400, optimal: { min: 120, max: 200 } },
      'Organic Carbon': { min: 0, max: 3.0, optimal: { min: 0.5, max: 1.5 } },
      'Electrical Conductivity': { min: 0, max: 4.0, optimal: { min: 0.2, max: 0.8 } },
      'Zinc': { min: 0, max: 10, optimal: { min: 1.0, max: 3.0 } },
      'Iron': { min: 0, max: 50, optimal: { min: 10, max: 25 } },
      'Manganese': { min: 0, max: 30, optimal: { min: 5, max: 15 } },
      'Copper': { min: 0, max: 5, optimal: { min: 0.5, max: 2.0 } },
      'Boron': { min: 0, max: 2, optimal: { min: 0.5, max: 1.0 } },
      'Sulfur': { min: 0, max: 50, optimal: { min: 10, max: 20 } }
    };

    return ranges[parameterName] || { min: 0, max: 100 };
  }

  /**
   * Determine parameter status based on value and ranges
   */
  private determineParameterStatus(value: number, range: SoilParameter['range']): SoilParameter['status'] {
    if (range.optimal) {
      if (value >= range.optimal.min && value <= range.optimal.max) {
        return 'optimal';
      }
    }

    if (value < range.min * 0.7) {
      return 'deficient';
    } else if (value > range.max * 1.3) {
      return 'excessive';
    } else {
      return 'adequate';
    }
  }

  /**
   * Extract soil texture from OCR text
   */
  private extractSoilTexture(text: string): string | undefined {
    const texturePatterns = [
      /Texture[:\s]*(Sandy|Clay|Loamy|Silty|Sandy Loam|Clay Loam|Silt Loam)/i,
      /Soil Texture[:\s]*(Sandy|Clay|Loamy|Silty|Sandy Loam|Clay Loam|Silt Loam)/i
    ];

    for (const pattern of texturePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return undefined;
  }

  /**
   * Extract soil type from OCR text
   */
  private extractSoilType(text: string): string | undefined {
    const typePatterns = [
      /Soil Type[:\s]*(Alluvial|Black|Red|Laterite|Desert|Mountain)/i,
      /Type[:\s]*(Alluvial|Black|Red|Laterite|Desert|Mountain)/i
    ];

    for (const pattern of typePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return undefined;
  }

  /**
   * Validate soil data
   */
  private async validateSoilData(extractedData: any): Promise<SoilDataValidation> {
    const issues: SoilDataValidation['issues'] = [];
    let confidence = 1.0;

    // Validate pH range
    if (extractedData.nutrients.pH) {
      const pH = extractedData.nutrients.pH.value;
      if (pH < 3.0 || pH > 10.0) {
        issues.push({
          parameter: 'pH',
          issue: 'pH value outside normal soil range',
          severity: 'error',
          suggestion: 'Please verify pH measurement - typical soil pH ranges from 4.0 to 9.0'
        });
        confidence -= 0.2;
      }
    }

    // Validate nutrient values
    const nutrients = ['nitrogen', 'phosphorus', 'potassium'];
    for (const nutrient of nutrients) {
      const param = extractedData.nutrients[nutrient];
      if (param && param.value < 0) {
        issues.push({
          parameter: nutrient,
          issue: 'Negative nutrient value detected',
          severity: 'error',
          suggestion: `${nutrient} cannot be negative - please check the report`
        });
        confidence -= 0.15;
      }
    }

    // Check for missing critical parameters
    if (!extractedData.nutrients.pH || !extractedData.nutrients.nitrogen || 
        !extractedData.nutrients.phosphorus || !extractedData.nutrients.potassium) {
      issues.push({
        parameter: 'general',
        issue: 'Missing critical soil parameters',
        severity: 'warning',
        suggestion: 'Some essential parameters (pH, N, P, K) are missing from the report'
      });
      confidence -= 0.1;
    }

    return {
      valid: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      confidence: Math.max(0, confidence)
    };
  }

  /**
   * Interpret soil data
   */
  private async interpretSoilData(extractedData: any): Promise<{
    overallHealth: 'poor' | 'fair' | 'good' | 'excellent';
    healthScore: number;
    primaryConcerns: string[];
    strengths: string[];
  }> {
    const concerns: string[] = [];
    const strengths: string[] = [];
    let healthScore = 100;

    // Analyze pH
    const pH = extractedData.nutrients.pH?.value;
    if (pH) {
      if (pH < 5.5 || pH > 8.0) {
        concerns.push('Soil pH is outside optimal range for most crops');
        healthScore -= 15;
      } else if (pH >= 6.0 && pH <= 7.5) {
        strengths.push('Soil pH is in optimal range for crop growth');
      }
    }

    // Analyze nutrients
    const nutrients = extractedData.nutrients;
    
    if (nutrients.nitrogen?.status === 'deficient') {
      concerns.push('Nitrogen levels are below optimal - may affect plant growth');
      healthScore -= 20;
    } else if (nutrients.nitrogen?.status === 'optimal') {
      strengths.push('Nitrogen levels are adequate for healthy plant growth');
    }

    if (nutrients.phosphorus?.status === 'deficient') {
      concerns.push('Phosphorus deficiency detected - important for root development');
      healthScore -= 15;
    } else if (nutrients.phosphorus?.status === 'optimal') {
      strengths.push('Phosphorus levels support good root development');
    }

    if (nutrients.potassium?.status === 'deficient') {
      concerns.push('Potassium levels are low - affects disease resistance');
      healthScore -= 15;
    } else if (nutrients.potassium?.status === 'optimal') {
      strengths.push('Potassium levels support plant disease resistance');
    }

    // Analyze micronutrients
    const micronutrients = extractedData.micronutrients;
    const deficientMicros = Object.entries(micronutrients)
      .filter(([_, param]: [string, any]) => param?.status === 'deficient')
      .map(([name, _]) => name);

    if (deficientMicros.length > 0) {
      concerns.push(`Micronutrient deficiencies detected: ${deficientMicros.join(', ')}`);
      healthScore -= deficientMicros.length * 5;
    }

    // Determine overall health
    let overallHealth: 'poor' | 'fair' | 'good' | 'excellent';
    if (healthScore >= 85) {
      overallHealth = 'excellent';
    } else if (healthScore >= 70) {
      overallHealth = 'good';
    } else if (healthScore >= 50) {
      overallHealth = 'fair';
    } else {
      overallHealth = 'poor';
    }

    return {
      overallHealth,
      healthScore: Math.max(0, healthScore),
      primaryConcerns: concerns,
      strengths
    };
  }

  /**
   * Generate farmer-friendly explanation (enhanced version)
   */
  private async generateFarmerFriendlyExplanation(
    extractedData: any,
    interpretation: any,
    language: string
  ): Promise<{
    summary: string;
    keyFindings: string[];
    actionItems: string[];
    language: string;
  }> {
    // Use the new explanation service for better farmer-friendly explanations
    const healthExplanation = this.explanationService.getSoilHealthExplanation(
      extractedData.nutrients,
      extractedData.micronutrients,
      interpretation.overallHealth,
      interpretation.healthScore,
      language
    );

    return {
      summary: healthExplanation.overallMessage,
      keyFindings: healthExplanation.keyPoints,
      actionItems: healthExplanation.immediateActions,
      language
    };
  }

  /**
   * Detect anomalies in soil data
   */
  private async detectAnomalies(extractedData: any): Promise<SoilAnomaly[]> {
    const anomalies: SoilAnomaly[] = [];

    // Check for extreme pH values
    const pH = extractedData.nutrients.pH?.value;
    if (pH && (pH < 4.0 || pH > 9.0)) {
      anomalies.push({
        parameter: 'pH',
        issue: 'Extreme pH value detected',
        severity: 'high',
        description: `pH value of ${pH} is extremely ${pH < 4.0 ? 'acidic' : 'alkaline'}`,
        possibleCauses: [
          pH < 4.0 ? 'Excessive use of acidic fertilizers' : 'High lime content',
          pH < 4.0 ? 'Acid rain effects' : 'Alkaline irrigation water',
          'Measurement error'
        ],
        recommendedAction: pH < 4.0 
          ? 'Apply lime to neutralize acidity and retest'
          : 'Add organic matter and sulfur to reduce alkalinity'
      });
    }

    // Check for nutrient imbalances
    const n = extractedData.nutrients.nitrogen?.value;
    const p = extractedData.nutrients.phosphorus?.value;
    const k = extractedData.nutrients.potassium?.value;

    if (n && p && (n / p > 20 || p / n > 0.2)) {
      anomalies.push({
        parameter: 'N:P ratio',
        issue: 'Nitrogen to Phosphorus ratio imbalance',
        severity: 'medium',
        description: `N:P ratio is ${(n/p).toFixed(1)}:1, which may indicate imbalanced fertilization`,
        possibleCauses: [
          'Excessive nitrogen fertilizer application',
          'Phosphorus fixation in soil',
          'Unbalanced fertilizer program'
        ],
        recommendedAction: 'Balance fertilizer application based on soil test recommendations'
      });
    }

    return anomalies;
  }

  /**
   * Generate recommendations based on soil analysis
   */
  private async generateRecommendations(extractedData: any, interpretation: any): Promise<SoilRecommendation[]> {
    const recommendations: SoilRecommendation[] = [];

    // pH correction recommendations
    const pH = extractedData.nutrients.pH?.value;
    if (pH && pH < 6.0) {
      recommendations.push({
        id: 'lime_application',
        type: 'amendment',
        priority: 'high',
        title: 'Apply Lime to Correct Soil Acidity',
        description: 'Your soil is acidic and needs lime application to improve nutrient availability',
        specificActions: [
          'Apply agricultural lime at 500-1000 kg per hectare',
          'Mix lime into top 15-20 cm of soil',
          'Wait 2-3 months before retesting pH'
        ],
        expectedOutcome: 'Improved nutrient availability and better crop growth',
        timeframe: '2-3 months to see pH improvement',
        cost: { min: 2000, max: 4000, currency: 'INR' },
        seasonality: ['Pre-monsoon', 'Post-harvest']
      });
    }

    // Nutrient-specific recommendations
    const nutrients = extractedData.nutrients;
    
    if (nutrients.nitrogen?.status === 'deficient') {
      recommendations.push({
        id: 'nitrogen_fertilizer',
        type: 'fertilizer',
        priority: 'high',
        title: 'Apply Nitrogen Fertilizer',
        description: 'Nitrogen levels are below optimal for healthy plant growth',
        specificActions: [
          'Apply 120-150 kg urea per hectare',
          'Split application: 50% at sowing, 25% at tillering, 25% at flowering',
          'Consider organic sources like FYM or compost'
        ],
        expectedOutcome: 'Improved plant growth and green leaf development',
        timeframe: '2-4 weeks to see visible improvement',
        cost: { min: 3000, max: 5000, currency: 'INR' },
        seasonality: ['Kharif', 'Rabi']
      });
    }

    if (nutrients.phosphorus?.status === 'deficient') {
      recommendations.push({
        id: 'phosphorus_fertilizer',
        type: 'fertilizer',
        priority: 'medium',
        title: 'Apply Phosphorus Fertilizer',
        description: 'Phosphorus deficiency can limit root development and crop yield',
        specificActions: [
          'Apply 60-80 kg DAP per hectare at sowing',
          'Consider rock phosphate for long-term phosphorus supply',
          'Apply near root zone for better uptake'
        ],
        expectedOutcome: 'Better root development and improved flowering',
        timeframe: '4-6 weeks for root development improvement',
        cost: { min: 2500, max: 4000, currency: 'INR' },
        seasonality: ['At sowing time']
      });
    }

    // Organic matter recommendation
    if (!extractedData.nutrients.organicCarbon || extractedData.nutrients.organicCarbon.value < 0.5) {
      recommendations.push({
        id: 'organic_matter',
        type: 'amendment',
        priority: 'medium',
        title: 'Increase Organic Matter Content',
        description: 'Low organic matter affects soil structure and nutrient retention',
        specificActions: [
          'Apply 5-10 tons of well-decomposed FYM per hectare',
          'Practice crop residue incorporation',
          'Consider green manuring with leguminous crops'
        ],
        expectedOutcome: 'Improved soil structure, water retention, and nutrient availability',
        timeframe: '6-12 months for significant improvement',
        cost: { min: 5000, max: 10000, currency: 'INR' },
        seasonality: ['Pre-monsoon', 'Post-harvest']
      });
    }

    return recommendations;
  }

  /**
   * Get soil analysis summary
   */
  public async getSoilAnalysisSummary(reportId: string): Promise<{
    reportId: string;
    overallHealth: string;
    healthScore: number;
    criticalIssues: number;
    recommendationsCount: number;
    lastUpdated: Date;
  }> {
    // In a real implementation, this would fetch from database
    // For now, return mock summary
    return {
      reportId,
      overallHealth: 'good',
      healthScore: 75,
      criticalIssues: 2,
      recommendationsCount: 4,
      lastUpdated: new Date()
    };
  }

  /**
   * Get farmer-friendly explanation for a specific soil parameter
   */
  public getParameterExplanation(
    parameter: SoilParameter,
    language: string = 'en',
    literacyLevel: 'basic' | 'intermediate' | 'advanced' = 'intermediate'
  ): ParameterExplanation {
    return this.explanationService.getExplanationByLiteracyLevel(parameter, literacyLevel, language);
  }

  /**
   * Get comprehensive soil health explanation in farmer-friendly language
   */
  public getSoilHealthExplanation(
    nutrients: SoilNutrients,
    micronutrients: Micronutrients,
    overallHealth: 'poor' | 'fair' | 'good' | 'excellent',
    healthScore: number,
    language: string = 'en'
  ): SoilHealthExplanation {
    return this.explanationService.getSoilHealthExplanation(
      nutrients,
      micronutrients,
      overallHealth,
      healthScore,
      language
    );
  }

  /**
   * Get explanations for all soil parameters
   */
  public getAllParameterExplanations(
    nutrients: SoilNutrients,
    micronutrients: Micronutrients,
    language: string = 'en',
    literacyLevel: 'basic' | 'intermediate' | 'advanced' = 'intermediate'
  ): ParameterExplanation[] {
    const explanations: ParameterExplanation[] = [];

    // Explain main nutrients
    if (nutrients.pH) {
      explanations.push(this.explanationService.getExplanationByLiteracyLevel(nutrients.pH, literacyLevel, language));
    }
    if (nutrients.nitrogen) {
      explanations.push(this.explanationService.getExplanationByLiteracyLevel(nutrients.nitrogen, literacyLevel, language));
    }
    if (nutrients.phosphorus) {
      explanations.push(this.explanationService.getExplanationByLiteracyLevel(nutrients.phosphorus, literacyLevel, language));
    }
    if (nutrients.potassium) {
      explanations.push(this.explanationService.getExplanationByLiteracyLevel(nutrients.potassium, literacyLevel, language));
    }
    if (nutrients.organicCarbon) {
      explanations.push(this.explanationService.getExplanationByLiteracyLevel(nutrients.organicCarbon, literacyLevel, language));
    }
    if (nutrients.electricalConductivity) {
      explanations.push(this.explanationService.getExplanationByLiteracyLevel(nutrients.electricalConductivity, literacyLevel, language));
    }

    // Explain micronutrients
    Object.values(micronutrients).forEach(param => {
      if (param) {
        explanations.push(this.explanationService.getExplanationByLiteracyLevel(param, literacyLevel, language));
      }
    });

    return explanations;
  }

  /**
   * Get simple soil report summary for farmers
   */
  public getSimpleSoilReportSummary(
    analysisResult: SoilAnalysisResult,
    language: string = 'en',
    literacyLevel: 'basic' | 'intermediate' | 'advanced' = 'intermediate'
  ): {
    overallMessage: string;
    mainIssues: string[];
    quickActions: string[];
    detailedExplanations: ParameterExplanation[];
    healthExplanation: SoilHealthExplanation;
  } {
    const { extractedData, interpretation } = analysisResult;
    
    // Get health explanation
    const healthExplanation = this.getSoilHealthExplanation(
      extractedData.nutrients,
      extractedData.micronutrients,
      interpretation.overallHealth,
      interpretation.healthScore,
      language
    );

    // Get detailed explanations for all parameters
    const detailedExplanations = this.getAllParameterExplanations(
      extractedData.nutrients,
      extractedData.micronutrients,
      language,
      literacyLevel
    );

    // Extract main issues and quick actions
    const mainIssues = interpretation.primaryConcerns.slice(0, 3); // Top 3 issues
    const quickActions = healthExplanation.immediateActions.slice(0, 3); // Top 3 actions

    return {
      overallMessage: healthExplanation.overallMessage,
      mainIssues,
      quickActions,
      detailedExplanations,
      healthExplanation
    };
  }

  /**
   * Get voice-friendly explanation (simplified for audio output)
   */
  public getVoiceFriendlyExplanation(
    analysisResult: SoilAnalysisResult,
    language: string = 'en'
  ): {
    shortSummary: string;
    keyPoints: string[];
    actionItems: string[];
  } {
    const { extractedData, interpretation } = analysisResult;
    
    const healthExplanation = this.getSoilHealthExplanation(
      extractedData.nutrients,
      extractedData.micronutrients,
      interpretation.overallHealth,
      interpretation.healthScore,
      language
    );

    // Create short summary for voice
    const shortSummary = language === 'hi' 
      ? `आपकी मिट्टी का स्वास्थ्य स्कोर ${interpretation.healthScore} है। ${interpretation.overallHealth === 'good' ? 'यह अच्छी स्थिति में है।' : 'इसमें सुधार की जरूरत है।'}`
      : `Your soil health score is ${interpretation.healthScore}. It is in ${interpretation.overallHealth} condition.`;

    return {
      shortSummary,
      keyPoints: healthExplanation.keyPoints.slice(0, 3), // Top 3 for voice
      actionItems: healthExplanation.immediateActions.slice(0, 3) // Top 3 for voice
    };
  }

  /**
   * Compare soil parameters and explain changes
   */
  public explainSoilChanges(
    previousResult: SoilAnalysisResult,
    currentResult: SoilAnalysisResult,
    language: string = 'en'
  ): {
    overallChange: string;
    parameterChanges: Array<{
      parameter: string;
      change: 'improved' | 'declined' | 'stable';
      explanation: string;
      recommendation: string;
    }>;
    nextSteps: string[];
  } {
    const changes: Array<{
      parameter: string;
      change: 'improved' | 'declined' | 'stable';
      explanation: string;
      recommendation: string;
    }> = [];

    // Compare main nutrients
    const compareParameter = (
      name: string,
      prev: SoilParameter | undefined,
      curr: SoilParameter | undefined
    ) => {
      if (!prev || !curr) return;

      const changePercent = ((curr.value - prev.value) / prev.value) * 100;
      let change: 'improved' | 'declined' | 'stable';
      let explanation: string;
      let recommendation: string;

      if (Math.abs(changePercent) < 5) {
        change = 'stable';
        explanation = language === 'hi' 
          ? `${name} का स्तर स्थिर है (${changePercent.toFixed(1)}% परिवर्तन)`
          : `${name} level is stable (${changePercent.toFixed(1)}% change)`;
        recommendation = language === 'hi'
          ? 'वर्तमान प्रबंधन जारी रखें'
          : 'Continue current management';
      } else if (changePercent > 5) {
        change = 'improved';
        explanation = language === 'hi'
          ? `${name} में ${changePercent.toFixed(1)}% सुधार हुआ है`
          : `${name} has improved by ${changePercent.toFixed(1)}%`;
        recommendation = language === 'hi'
          ? 'अच्छा काम! वर्तमान प्रथाओं को जारी रखें'
          : 'Good work! Continue current practices';
      } else {
        change = 'declined';
        explanation = language === 'hi'
          ? `${name} में ${Math.abs(changePercent).toFixed(1)}% कमी आई है`
          : `${name} has declined by ${Math.abs(changePercent).toFixed(1)}%`;
        recommendation = language === 'hi'
          ? 'इस पोषक तत्व पर ध्यान देने की जरूरत है'
          : 'This nutrient needs attention';
      }

      changes.push({ parameter: name, change, explanation, recommendation });
    };

    // Compare all parameters
    compareParameter('pH', previousResult.extractedData.nutrients.pH, currentResult.extractedData.nutrients.pH);
    compareParameter('Nitrogen', previousResult.extractedData.nutrients.nitrogen, currentResult.extractedData.nutrients.nitrogen);
    compareParameter('Phosphorus', previousResult.extractedData.nutrients.phosphorus, currentResult.extractedData.nutrients.phosphorus);
    compareParameter('Potassium', previousResult.extractedData.nutrients.potassium, currentResult.extractedData.nutrients.potassium);

    // Overall change assessment
    const healthScoreChange = currentResult.interpretation.healthScore - previousResult.interpretation.healthScore;
    const overallChange = language === 'hi'
      ? `आपकी मिट्टी का स्वास्थ्य स्कोर ${healthScoreChange > 0 ? 'बढ़कर' : 'घटकर'} ${currentResult.interpretation.healthScore} हो गया है (${healthScoreChange > 0 ? '+' : ''}${healthScoreChange.toFixed(1)} अंक)`
      : `Your soil health score has ${healthScoreChange > 0 ? 'improved to' : 'declined to'} ${currentResult.interpretation.healthScore} (${healthScoreChange > 0 ? '+' : ''}${healthScoreChange.toFixed(1)} points)`;

    // Next steps
    const nextSteps = language === 'hi'
      ? [
          'अगली मिट्टी जांच 6 महीने बाद कराएं',
          'सुधार के लिए दी गई सलाह का पालन करें',
          'नियमित रूप से जैविक पदार्थ डालते रहें'
        ]
      : [
          'Schedule next soil test in 6 months',
          'Follow the improvement recommendations given',
          'Continue regular organic matter application'
        ];

    return {
      overallChange,
      parameterChanges: changes,
      nextSteps
    };
  }

  /**
   * Compare soil reports over time
   */
  public async compareSoilReports(reportIds: string[]): Promise<{
    trends: Array<{
      parameter: string;
      trend: 'improving' | 'stable' | 'declining';
      changePercent: number;
    }>;
    recommendations: string[];
  }> {
    // Mock implementation for trend analysis
    return {
      trends: [
        { parameter: 'pH', trend: 'stable', changePercent: 2 },
        { parameter: 'Nitrogen', trend: 'improving', changePercent: 15 },
        { parameter: 'Phosphorus', trend: 'declining', changePercent: -8 }
      ],
      recommendations: [
        'Continue current nitrogen management practices',
        'Increase phosphorus application in next season',
        'Monitor pH levels regularly'
      ]
    };
  }

  /**
   * Identify soil deficiencies and generate remediation suggestions
   */
  public identifySoilDeficiencies(
    nutrients: SoilNutrients,
    micronutrients: Micronutrients,
    soilType?: string,
    cropType?: string
  ): SoilDeficiency[] {
    return this.deficiencyService.identifyDeficiencies(nutrients, micronutrients, soilType, cropType);
  }

  /**
   * Generate comprehensive remediation plan for soil deficiencies
   */
  public generateDeficiencyRemediationPlan(
    deficiencies: SoilDeficiency[],
    farmSize: number = 1,
    budget?: { min: number; max: number },
    preferences?: {
      organic?: boolean;
      quickResults?: boolean;
      sustainableFocus?: boolean;
    }
  ): RemediationPlan[] {
    return this.deficiencyService.generateRemediationPlan(deficiencies, farmSize, budget, preferences);
  }

  /**
   * Get integrated remediation strategy for multiple deficiencies
   */
  public getIntegratedRemediationStrategy(
    deficiencies: SoilDeficiency[],
    farmSize: number = 1,
    budget?: { min: number; max: number }
  ) {
    return this.deficiencyService.getIntegratedRemediationStrategy(deficiencies, farmSize, budget);
  }

  /**
   * Analyze soil analysis result and provide complete deficiency assessment
   */
  public async analyzeDeficienciesFromResult(
    analysisResult: SoilAnalysisResult,
    farmSize: number = 1,
    preferences?: {
      organic?: boolean;
      quickResults?: boolean;
      sustainableFocus?: boolean;
    }
  ): Promise<{
    deficiencies: SoilDeficiency[];
    remediationPlans: RemediationPlan[];
    integratedStrategy: any;
    priorityActions: string[];
    estimatedCost: { min: number; max: number; currency: string };
    expectedBenefits: string[];
  }> {
    const { extractedData } = analysisResult;
    
    // Identify deficiencies
    const deficiencies = this.identifySoilDeficiencies(
      extractedData.nutrients,
      extractedData.micronutrients
    );

    if (deficiencies.length === 0) {
      return {
        deficiencies: [],
        remediationPlans: [],
        integratedStrategy: null,
        priorityActions: ['Maintain current soil management practices'],
        estimatedCost: { min: 0, max: 0, currency: 'INR' },
        expectedBenefits: ['Soil is in good condition']
      };
    }

    // Generate remediation plans
    const remediationPlans = this.generateDeficiencyRemediationPlan(
      deficiencies,
      farmSize,
      undefined,
      preferences
    );

    // Get integrated strategy
    const integratedStrategy = this.getIntegratedRemediationStrategy(
      deficiencies,
      farmSize
    );

    // Extract priority actions
    const priorityActions = integratedStrategy.prioritizedActions
      .slice(0, 3)
      .map((action: any) => action.action);

    // Calculate total estimated cost
    const totalCost = integratedStrategy.totalCost;

    // Extract expected benefits
    const expectedBenefits = [
      ...new Set(
        remediationPlans.flatMap(plan => 
          plan.expectedResults.sustainabilityBenefits.slice(0, 2)
        )
      )
    ].slice(0, 5);

    return {
      deficiencies,
      remediationPlans,
      integratedStrategy,
      priorityActions,
      estimatedCost: {
        min: totalCost.totalPerHectare.min,
        max: totalCost.totalPerHectare.max,
        currency: totalCost.totalPerHectare.currency
      },
      expectedBenefits
    };
  }

  /**
   * Get farmer-friendly deficiency explanation
   */
  public getFarmerFriendlyDeficiencyExplanation(
    deficiencies: SoilDeficiency[],
    language: string = 'en'
  ): {
    summary: string;
    mainProblems: string[];
    quickSolutions: string[];
    whyItMatters: string[];
  } {
    if (deficiencies.length === 0) {
      return {
        summary: language === 'hi' 
          ? 'आपकी मिट्टी अच्छी स्थिति में है। कोई बड़ी कमी नहीं मिली।'
          : 'Your soil is in good condition. No major deficiencies found.',
        mainProblems: [],
        quickSolutions: [
          language === 'hi' 
            ? 'वर्तमान मिट्टी प्रबंधन जारी रखें'
            : 'Continue current soil management practices'
        ],
        whyItMatters: [
          language === 'hi'
            ? 'स्वस्थ मिट्टी बेहतर फसल देती है'
            : 'Healthy soil produces better crops'
        ]
      };
    }

    const severeCounts = deficiencies.filter(d => d.deficiencyType === 'severe').length;
    const moderateCounts = deficiencies.filter(d => d.deficiencyType === 'moderate').length;

    const summary = language === 'hi'
      ? `आपकी मिट्टी में ${deficiencies.length} पोषक तत्वों की कमी मिली है। ${severeCounts > 0 ? `${severeCounts} गंभीर` : ''} ${moderateCounts > 0 ? `${moderateCounts} मध्यम` : ''} समस्याएं हैं।`
      : `Your soil has ${deficiencies.length} nutrient deficiencies. ${severeCounts > 0 ? `${severeCounts} severe` : ''} ${moderateCounts > 0 ? `${moderateCounts} moderate` : ''} issues found.`;

    const mainProblems = deficiencies.slice(0, 3).map(d => 
      language === 'hi'
        ? `${d.parameter} की कमी - ${d.impactOnCrops[0]}`
        : `${d.parameter} deficiency - ${d.impactOnCrops[0]}`
    );

    const quickSolutions = language === 'hi'
      ? [
          'तुरंत मिट्टी जांच की पुष्टि करें',
          'उर्वरक या जैविक खाद का प्रयोग करें',
          'विशेषज्ञ की सलाह लें'
        ]
      : [
          'Confirm soil test results',
          'Apply appropriate fertilizers or organic amendments',
          'Consult with agricultural expert'
        ];

    const whyItMatters = language === 'hi'
      ? [
          'पोषक तत्वों की कमी से फसल की पैदावार घटती है',
          'पौधों की रोग प्रतिरोधक क्षमता कम हो जाती है',
          'समय पर इलाज से अच्छी फसल मिल सकती है'
        ]
      : [
          'Nutrient deficiencies reduce crop yields',
          'Plants become more susceptible to diseases',
          'Timely treatment can significantly improve harvests'
        ];

    return {
      summary,
      mainProblems,
      quickSolutions,
      whyItMatters
    };
  }

  // ==================== CROP RECOMMENDATION INTEGRATION ====================

  /**
   * Get crop recommendations based on soil analysis results
   */
  public async getCropRecommendationsFromSoilData(
    analysisResult: SoilAnalysisResult,
    options: CropRecommendationOptions = {}
  ): Promise<CropSuitabilityAnalysis> {
    console.log('Generating crop recommendations based on soil analysis');

    const { extractedData } = analysisResult;
    const { nutrients, micronutrients } = extractedData;

    // Set default options
    const recommendationOptions = {
      season: 'all' as const,
      farmSize: 1,
      riskTolerance: 'medium' as const,
      marketFocus: 'local' as const,
      organicPreference: false,
      experienceLevel: 'intermediate' as const,
      irrigationAvailable: true,
      maxRecommendations: 10,
      ...options
    };

    // Analyze soil suitability for different crops
    const cropDatabase = this.getCropDatabase();
    const suitabilityResults: CropRecommendation[] = [];

    for (const crop of cropDatabase) {
      // Skip if season filter is applied and crop doesn't match
      if (recommendationOptions.season !== 'all' && crop.season !== recommendationOptions.season) {
        continue;
      }

      const suitability = this.analyzeCropSuitability(crop, nutrients, micronutrients);
      
      if (suitability.suitabilityScore >= 40) { // Only include crops with reasonable suitability
        const recommendation = this.buildCropRecommendation(
          crop,
          suitability,
          nutrients,
          micronutrients,
          recommendationOptions
        );
        suitabilityResults.push(recommendation);
      }
    }

    // Sort by suitability score
    suitabilityResults.sort((a, b) => b.suitabilityScore - a.suitabilityScore);

    // Limit results
    const topRecommendations = suitabilityResults.slice(0, recommendationOptions.maxRecommendations);

    // Analyze soil limitations
    const soilLimitations = this.analyzeSoilLimitations(nutrients, micronutrients);

    // Group by season
    const seasonalRecommendations = {
      kharif: suitabilityResults.filter(r => r.season === 'kharif').slice(0, 5),
      rabi: suitabilityResults.filter(r => r.season === 'rabi').slice(0, 5),
      zaid: suitabilityResults.filter(r => r.season === 'zaid').slice(0, 3),
      perennial: suitabilityResults.filter(r => r.season === 'perennial').slice(0, 3)
    };

    return {
      totalCropsAnalyzed: cropDatabase.length,
      suitableCrops: suitabilityResults.filter(r => r.suitabilityScore >= 70).length,
      marginallySuitableCrops: suitabilityResults.filter(r => r.suitabilityScore >= 50 && r.suitabilityScore < 70).length,
      unsuitableCrops: cropDatabase.length - suitabilityResults.length,
      topRecommendations,
      soilLimitations,
      seasonalRecommendations
    };
  }

  /**
   * Get crop recommendations for specific season
   */
  public async getSeasonalCropRecommendations(
    analysisResult: SoilAnalysisResult,
    season: 'kharif' | 'rabi' | 'zaid',
    options: Omit<CropRecommendationOptions, 'season'> = {}
  ): Promise<CropRecommendation[]> {
    const suitabilityAnalysis = await this.getCropRecommendationsFromSoilData(
      analysisResult,
      { ...options, season }
    );

    return suitabilityAnalysis.topRecommendations;
  }

  /**
   * Get best crop recommendations with soil improvement plan
   */
  public async getCropRecommendationsWithSoilImprovement(
    analysisResult: SoilAnalysisResult,
    targetCrops?: string[],
    options: CropRecommendationOptions = {}
  ): Promise<{
    currentSuitability: CropRecommendation[];
    withImprovements: CropRecommendation[];
    improvementPlan: {
      amendments: Array<{
        amendment: string;
        quantity: string;
        cost: { min: number; max: number };
        expectedImprovement: string;
      }>;
      timeline: string;
      totalCost: { min: number; max: number; currency: string };
      expectedBenefits: string[];
    };
  }> {
    console.log('Generating crop recommendations with soil improvement plan');

    // Get current recommendations
    const currentSuitability = await this.getCropRecommendationsFromSoilData(analysisResult, options);

    // Simulate improved soil conditions
    const improvedSoilData = this.simulateImprovedSoilConditions(analysisResult.extractedData);
    const improvedAnalysisResult = {
      ...analysisResult,
      extractedData: improvedSoilData
    };

    // Get recommendations with improved soil
    const withImprovements = await this.getCropRecommendationsFromSoilData(improvedAnalysisResult, options);

    // Generate improvement plan
    const improvementPlan = this.generateSoilImprovementPlan(
      analysisResult.extractedData,
      targetCrops || currentSuitability.topRecommendations.slice(0, 3).map(r => r.cropName)
    );

    return {
      currentSuitability: currentSuitability.topRecommendations,
      withImprovements: withImprovements.topRecommendations,
      improvementPlan
    };
  }

  /**
   * Compare crop suitability before and after soil improvements
   */
  public async compareCropSuitabilityWithImprovements(
    analysisResult: SoilAnalysisResult,
    cropName: string
  ): Promise<{
    current: CropRecommendation | null;
    improved: CropRecommendation | null;
    improvementBenefits: {
      suitabilityIncrease: number;
      yieldIncrease: { min: number; max: number };
      profitabilityIncrease: number;
      riskReduction: string[];
    };
  }> {
    // Get current crop suitability
    const currentAnalysis = await this.getCropRecommendationsFromSoilData(analysisResult);
    const currentCrop = currentAnalysis.topRecommendations.find(r => 
      r.cropName.toLowerCase() === cropName.toLowerCase()
    ) || null;

    // Simulate improved conditions
    const improvedSoilData = this.simulateImprovedSoilConditions(analysisResult.extractedData);
    const improvedAnalysisResult = {
      ...analysisResult,
      extractedData: improvedSoilData
    };

    const improvedAnalysis = await this.getCropRecommendationsFromSoilData(improvedAnalysisResult);
    const improvedCrop = improvedAnalysis.topRecommendations.find(r => 
      r.cropName.toLowerCase() === cropName.toLowerCase()
    ) || null;

    // Calculate improvement benefits
    const improvementBenefits = {
      suitabilityIncrease: (improvedCrop?.suitabilityScore || 0) - (currentCrop?.suitabilityScore || 0),
      yieldIncrease: {
        min: (improvedCrop?.projections.expectedYield.min || 0) - (currentCrop?.projections.expectedYield.min || 0),
        max: (improvedCrop?.projections.expectedYield.max || 0) - (currentCrop?.projections.expectedYield.max || 0)
      },
      profitabilityIncrease: (improvedCrop?.projections.profitability.roi || 0) - (currentCrop?.projections.profitability.roi || 0),
      riskReduction: this.calculateRiskReduction(currentCrop, improvedCrop)
    };

    return {
      current: currentCrop,
      improved: improvedCrop,
      improvementBenefits
    };
  }

  /**
   * Get farmer-friendly crop recommendation explanation
   */
  public getFarmerFriendlyCropRecommendations(
    recommendations: CropRecommendation[],
    language: string = 'en'
  ): {
    summary: string;
    topCrops: Array<{
      name: string;
      whyGood: string;
      expectedIncome: string;
      mainRequirements: string[];
      riskLevel: string;
    }>;
    soilPreparation: string[];
    seasonalAdvice: string;
  } {
    if (recommendations.length === 0) {
      return {
        summary: language === 'hi' 
          ? 'वर्तमान मिट्टी की स्थिति के लिए उपयुक्त फसल नहीं मिली। मिट्टी सुधार की जरूरत है।'
          : 'No suitable crops found for current soil conditions. Soil improvement needed.',
        topCrops: [],
        soilPreparation: [
          language === 'hi' ? 'मिट्टी जांच कराएं' : 'Get soil tested',
          language === 'hi' ? 'जैविक खाद डालें' : 'Add organic matter'
        ],
        seasonalAdvice: language === 'hi' 
          ? 'मिट्टी सुधार के बाद फसल चुनें'
          : 'Choose crops after soil improvement'
      };
    }

    const topCrops = recommendations.slice(0, 3).map(crop => ({
      name: language === 'hi' ? crop.localName : crop.cropName,
      whyGood: language === 'hi' 
        ? `${crop.suitabilityScore}% उपयुक्त - ${crop.soilCompatibility.limitingFactors.length === 0 ? 'मिट्टी के लिए अच्छी' : 'कुछ सुधार के साथ अच्छी'}`
        : `${crop.suitabilityScore}% suitable - ${crop.soilCompatibility.limitingFactors.length === 0 ? 'Good match for your soil' : 'Good with some improvements'}`,
      expectedIncome: language === 'hi'
        ? `₹${crop.projections.profitability.netProfit.min.toLocaleString()} - ₹${crop.projections.profitability.netProfit.max.toLocaleString()} प्रति हेक्टेयर`
        : `₹${crop.projections.profitability.netProfit.min.toLocaleString()} - ₹${crop.projections.profitability.netProfit.max.toLocaleString()} per hectare`,
      mainRequirements: crop.soilImprovements.requiredAmendments.slice(0, 2).map(a => 
        language === 'hi' ? `${a.amendment} - ${a.purpose}` : `${a.amendment} - ${a.purpose}`
      ),
      riskLevel: language === 'hi' 
        ? crop.projections.riskFactors.length <= 2 ? 'कम जोखिम' : crop.projections.riskFactors.length <= 4 ? 'मध्यम जोखिम' : 'अधिक जोखिम'
        : crop.projections.riskFactors.length <= 2 ? 'Low risk' : crop.projections.riskFactors.length <= 4 ? 'Medium risk' : 'High risk'
    }));

    const summary = language === 'hi'
      ? `आपकी मिट्टी के लिए ${recommendations.length} फसलें उपयुक्त मिलीं। सबसे अच्छी ${topCrops[0].name} है जो ${recommendations[0].suitabilityScore}% उपयुक्त है।`
      : `Found ${recommendations.length} suitable crops for your soil. Best option is ${topCrops[0].name} with ${recommendations[0].suitabilityScore}% suitability.`;

    const soilPreparation = language === 'hi'
      ? [
          'बुवाई से 2-3 सप्ताह पहले खेत तैयार करें',
          'जैविक खाद या कंपोस्ट डालें',
          'मिट्टी की नमी बनाए रखें'
        ]
      : [
          'Prepare field 2-3 weeks before sowing',
          'Add organic manure or compost',
          'Maintain soil moisture'
        ];

    const currentSeason = this.getCurrentSeason();
    const seasonalAdvice = language === 'hi'
      ? `${currentSeason} सीजन के लिए ${topCrops.filter(c => recommendations.find(r => (r.localName === c.name || r.cropName === c.name) && r.season === currentSeason.toLowerCase())).length} फसलें उपयुक्त हैं।`
      : `${topCrops.filter(c => recommendations.find(r => (r.localName === c.name || r.cropName === c.name) && r.season === currentSeason.toLowerCase())).length} crops are suitable for ${currentSeason} season.`;

    return {
      summary,
      topCrops,
      soilPreparation,
      seasonalAdvice
    };
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Get crop database with soil requirements
   */
  private getCropDatabase(): Array<{
    cropId: string;
    cropName: string;
    localName: string;
    season: 'kharif' | 'rabi' | 'zaid' | 'perennial';
    requirements: {
      optimalPH: { min: number; max: number };
      nitrogenRequirement: { min: number; max: number };
      phosphorusRequirement: { min: number; max: number };
      potassiumRequirement: { min: number; max: number };
      waterRequirement: 'low' | 'medium' | 'high';
      soilType: string[];
    };
    expectedYield: { min: number; max: number; unit: string };
    marketPrice: { min: number; max: number };
    inputCosts: { min: number; max: number };
    duration: number;
    riskFactors: string[];
  }> {
    return [
      // Kharif crops
      {
        cropId: 'rice_001',
        cropName: 'Rice',
        localName: 'धान',
        season: 'kharif',
        requirements: {
          optimalPH: { min: 5.5, max: 7.0 },
          nitrogenRequirement: { min: 120, max: 150 },
          phosphorusRequirement: { min: 40, max: 60 },
          potassiumRequirement: { min: 40, max: 60 },
          waterRequirement: 'high',
          soilType: ['Clay', 'Clay Loam', 'Silty Clay']
        },
        expectedYield: { min: 4000, max: 6000, unit: 'kg/ha' },
        marketPrice: { min: 20, max: 25 },
        inputCosts: { min: 25000, max: 35000 },
        duration: 120,
        riskFactors: ['Water dependency', 'Pest attacks', 'Weather sensitivity']
      },
      {
        cropId: 'cotton_001',
        cropName: 'Cotton',
        localName: 'कपास',
        season: 'kharif',
        requirements: {
          optimalPH: { min: 6.0, max: 8.0 },
          nitrogenRequirement: { min: 100, max: 120 },
          phosphorusRequirement: { min: 50, max: 70 },
          potassiumRequirement: { min: 50, max: 70 },
          waterRequirement: 'medium',
          soilType: ['Black', 'Alluvial', 'Red']
        },
        expectedYield: { min: 1500, max: 2500, unit: 'kg/ha' },
        marketPrice: { min: 50, max: 70 },
        inputCosts: { min: 30000, max: 45000 },
        duration: 180,
        riskFactors: ['Bollworm attacks', 'Price volatility', 'Water stress']
      },
      {
        cropId: 'sugarcane_001',
        cropName: 'Sugarcane',
        localName: 'गन्ना',
        season: 'kharif',
        requirements: {
          optimalPH: { min: 6.0, max: 7.5 },
          nitrogenRequirement: { min: 200, max: 250 },
          phosphorusRequirement: { min: 80, max: 100 },
          potassiumRequirement: { min: 150, max: 200 },
          waterRequirement: 'high',
          soilType: ['Alluvial', 'Black', 'Red']
        },
        expectedYield: { min: 60000, max: 80000, unit: 'kg/ha' },
        marketPrice: { min: 3, max: 4 },
        inputCosts: { min: 50000, max: 70000 },
        duration: 365,
        riskFactors: ['High water requirement', 'Long duration', 'Processing dependency']
      },
      {
        cropId: 'maize_001',
        cropName: 'Maize',
        localName: 'मक्का',
        season: 'kharif',
        requirements: {
          optimalPH: { min: 6.0, max: 7.5 },
          nitrogenRequirement: { min: 120, max: 150 },
          phosphorusRequirement: { min: 60, max: 80 },
          potassiumRequirement: { min: 40, max: 60 },
          waterRequirement: 'medium',
          soilType: ['Alluvial', 'Black', 'Red', 'Sandy Loam']
        },
        expectedYield: { min: 5000, max: 7000, unit: 'kg/ha' },
        marketPrice: { min: 18, max: 22 },
        inputCosts: { min: 20000, max: 30000 },
        duration: 100,
        riskFactors: ['Pest attacks', 'Weather dependency', 'Storage issues']
      },

      // Rabi crops
      {
        cropId: 'wheat_001',
        cropName: 'Wheat',
        localName: 'गेहूं',
        season: 'rabi',
        requirements: {
          optimalPH: { min: 6.0, max: 7.5 },
          nitrogenRequirement: { min: 120, max: 150 },
          phosphorusRequirement: { min: 60, max: 80 },
          potassiumRequirement: { min: 40, max: 60 },
          waterRequirement: 'medium',
          soilType: ['Alluvial', 'Black', 'Red']
        },
        expectedYield: { min: 4000, max: 5500, unit: 'kg/ha' },
        marketPrice: { min: 20, max: 25 },
        inputCosts: { min: 25000, max: 35000 },
        duration: 120,
        riskFactors: ['Late sowing risk', 'Rust diseases', 'Heat stress']
      },
      {
        cropId: 'mustard_001',
        cropName: 'Mustard',
        localName: 'सरसों',
        season: 'rabi',
        requirements: {
          optimalPH: { min: 6.0, max: 7.5 },
          nitrogenRequirement: { min: 80, max: 100 },
          phosphorusRequirement: { min: 40, max: 60 },
          potassiumRequirement: { min: 30, max: 50 },
          waterRequirement: 'low',
          soilType: ['Alluvial', 'Sandy Loam', 'Clay Loam']
        },
        expectedYield: { min: 1200, max: 1800, unit: 'kg/ha' },
        marketPrice: { min: 45, max: 60 },
        inputCosts: { min: 15000, max: 25000 },
        duration: 120,
        riskFactors: ['Aphid attacks', 'Price fluctuation', 'Weather sensitivity']
      },
      {
        cropId: 'chickpea_001',
        cropName: 'Chickpea',
        localName: 'चना',
        season: 'rabi',
        requirements: {
          optimalPH: { min: 6.0, max: 7.5 },
          nitrogenRequirement: { min: 20, max: 40 }, // Legume - fixes nitrogen
          phosphorusRequirement: { min: 60, max: 80 },
          potassiumRequirement: { min: 30, max: 50 },
          waterRequirement: 'low',
          soilType: ['Black', 'Alluvial', 'Red']
        },
        expectedYield: { min: 1500, max: 2200, unit: 'kg/ha' },
        marketPrice: { min: 50, max: 70 },
        inputCosts: { min: 20000, max: 30000 },
        duration: 120,
        riskFactors: ['Wilt disease', 'Pod borer', 'Moisture stress']
      },

      // Zaid crops
      {
        cropId: 'watermelon_001',
        cropName: 'Watermelon',
        localName: 'तरबूज',
        season: 'zaid',
        requirements: {
          optimalPH: { min: 6.0, max: 7.0 },
          nitrogenRequirement: { min: 100, max: 120 },
          phosphorusRequirement: { min: 50, max: 70 },
          potassiumRequirement: { min: 150, max: 200 },
          waterRequirement: 'high',
          soilType: ['Sandy Loam', 'Alluvial']
        },
        expectedYield: { min: 25000, max: 35000, unit: 'kg/ha' },
        marketPrice: { min: 8, max: 15 },
        inputCosts: { min: 30000, max: 45000 },
        duration: 90,
        riskFactors: ['High water requirement', 'Market glut', 'Pest attacks']
      },
      {
        cropId: 'fodder_maize_001',
        cropName: 'Fodder Maize',
        localName: 'चारा मक्का',
        season: 'zaid',
        requirements: {
          optimalPH: { min: 6.0, max: 7.5 },
          nitrogenRequirement: { min: 150, max: 180 },
          phosphorusRequirement: { min: 60, max: 80 },
          potassiumRequirement: { min: 40, max: 60 },
          waterRequirement: 'high',
          soilType: ['Alluvial', 'Sandy Loam']
        },
        expectedYield: { min: 40000, max: 60000, unit: 'kg/ha' },
        marketPrice: { min: 2, max: 3 },
        inputCosts: { min: 25000, max: 35000 },
        duration: 70,
        riskFactors: ['Water dependency', 'Limited market', 'Storage issues']
      },

      // Perennial crops
      {
        cropId: 'mango_001',
        cropName: 'Mango',
        localName: 'आम',
        season: 'perennial',
        requirements: {
          optimalPH: { min: 5.5, max: 7.5 },
          nitrogenRequirement: { min: 500, max: 800 }, // Per tree per year
          phosphorusRequirement: { min: 250, max: 400 },
          potassiumRequirement: { min: 750, max: 1200 },
          waterRequirement: 'medium',
          soilType: ['Alluvial', 'Red', 'Laterite']
        },
        expectedYield: { min: 8000, max: 15000, unit: 'kg/ha' },
        marketPrice: { min: 30, max: 80 },
        inputCosts: { min: 40000, max: 60000 },
        duration: 365,
        riskFactors: ['Long gestation period', 'Weather dependency', 'Pest diseases']
      }
    ];
  }

  /**
   * Analyze crop suitability based on soil parameters
   */
  private analyzeCropSuitability(
    crop: any,
    nutrients: SoilNutrients,
    micronutrients: Micronutrients
  ): {
    suitabilityScore: number;
    pHSuitability: number;
    nutrientSuitability: number;
    overallSoilMatch: number;
    limitingFactors: string[];
  } {
    const limitingFactors: string[] = [];
    let totalScore = 0;
    let factorCount = 0;

    // pH suitability (25% weight)
    const pHValue = nutrients.pH?.value || 7.0;
    const pHSuitability = this.calculateParameterSuitability(
      pHValue,
      crop.requirements.optimalPH.min,
      crop.requirements.optimalPH.max
    );
    
    if (pHSuitability < 60) {
      limitingFactors.push(`pH ${pHValue < crop.requirements.optimalPH.min ? 'too acidic' : 'too alkaline'}`);
    }
    
    totalScore += pHSuitability * 0.25;
    factorCount++;

    // Nitrogen suitability (25% weight)
    const nValue = nutrients.nitrogen?.value || 0;
    const nSuitability = this.calculateParameterSuitability(
      nValue,
      crop.requirements.nitrogenRequirement.min,
      crop.requirements.nitrogenRequirement.max
    );
    
    if (nSuitability < 60) {
      limitingFactors.push(`Nitrogen ${nValue < crop.requirements.nitrogenRequirement.min ? 'deficiency' : 'excess'}`);
    }
    
    totalScore += nSuitability * 0.25;
    factorCount++;

    // Phosphorus suitability (25% weight)
    const pValue = nutrients.phosphorus?.value || 0;
    const pSuitability = this.calculateParameterSuitability(
      pValue,
      crop.requirements.phosphorusRequirement.min,
      crop.requirements.phosphorusRequirement.max
    );
    
    if (pSuitability < 60) {
      limitingFactors.push(`Phosphorus ${pValue < crop.requirements.phosphorusRequirement.min ? 'deficiency' : 'excess'}`);
    }
    
    totalScore += pSuitability * 0.25;
    factorCount++;

    // Potassium suitability (25% weight)
    const kValue = nutrients.potassium?.value || 0;
    const kSuitability = this.calculateParameterSuitability(
      kValue,
      crop.requirements.potassiumRequirement.min,
      crop.requirements.potassiumRequirement.max
    );
    
    if (kSuitability < 60) {
      limitingFactors.push(`Potassium ${kValue < crop.requirements.potassiumRequirement.min ? 'deficiency' : 'excess'}`);
    }
    
    totalScore += kSuitability * 0.25;
    factorCount++;

    const suitabilityScore = Math.round(totalScore);
    
    return {
      suitabilityScore,
      pHSuitability: Math.round(pHSuitability),
      nutrientSuitability: Math.round((nSuitability + pSuitability + kSuitability) / 3),
      overallSoilMatch: suitabilityScore,
      limitingFactors
    };
  }

  /**
   * Calculate parameter suitability score (0-100)
   */
  private calculateParameterSuitability(value: number, minOptimal: number, maxOptimal: number): number {
    if (value >= minOptimal && value <= maxOptimal) {
      return 100; // Perfect match
    }
    
    const range = maxOptimal - minOptimal;
    const tolerance = range * 0.5; // 50% tolerance outside optimal range
    
    if (value < minOptimal) {
      const deficit = minOptimal - value;
      const score = Math.max(0, 100 - (deficit / tolerance) * 60);
      return Math.round(score);
    } else {
      const excess = value - maxOptimal;
      const score = Math.max(0, 100 - (excess / tolerance) * 60);
      return Math.round(score);
    }
  }

  /**
   * Build complete crop recommendation
   */
  private buildCropRecommendation(
    crop: any,
    suitability: any,
    nutrients: SoilNutrients,
    micronutrients: Micronutrients,
    options: CropRecommendationOptions
  ): CropRecommendation {
    // Calculate profitability
    const expectedYield = {
      min: crop.expectedYield.min * (suitability.suitabilityScore / 100),
      max: crop.expectedYield.max * (suitability.suitabilityScore / 100)
    };

    const grossIncome = {
      min: expectedYield.min * crop.marketPrice.min,
      max: expectedYield.max * crop.marketPrice.max
    };

    const inputCosts = {
      min: crop.inputCosts.min,
      max: crop.inputCosts.max
    };

    const netProfit = {
      min: grossIncome.min - inputCosts.max,
      max: grossIncome.max - inputCosts.min
    };

    const roi = ((netProfit.min + netProfit.max) / 2) / ((inputCosts.min + inputCosts.max) / 2) * 100;

    // Generate soil improvements needed
    const requiredAmendments = this.generateRequiredAmendments(nutrients, micronutrients, crop);
    const fertilizationPlan = this.generateFertilizationPlan(nutrients, crop);

    return {
      cropId: crop.cropId,
      cropName: crop.cropName,
      localName: crop.localName,
      variety: undefined,
      suitabilityScore: suitability.suitabilityScore,
      confidence: 0.8,
      season: crop.season,
      soilCompatibility: {
        pHSuitability: suitability.pHSuitability,
        nutrientSuitability: suitability.nutrientSuitability,
        overallSoilMatch: suitability.overallSoilMatch,
        limitingFactors: suitability.limitingFactors
      },
      requirements: crop.requirements,
      projections: {
        expectedYield: {
          min: Math.round(expectedYield.min),
          max: Math.round(expectedYield.max),
          unit: crop.expectedYield.unit
        },
        marketPrice: {
          min: crop.marketPrice.min,
          max: crop.marketPrice.max,
          currency: 'INR'
        },
        profitability: {
          grossIncome: {
            min: Math.round(grossIncome.min),
            max: Math.round(grossIncome.max)
          },
          inputCosts: inputCosts,
          netProfit: {
            min: Math.round(netProfit.min),
            max: Math.round(netProfit.max)
          },
          roi: Math.round(roi)
        },
        riskFactors: crop.riskFactors.map((factor: string) => ({
          factor,
          severity: 'medium' as const,
          mitigation: this.getRiskMitigation(factor)
        }))
      },
      cultivation: {
        sowingTime: this.getSowingTime(crop.season),
        harvestTime: this.getHarvestTime(crop.season, crop.duration),
        duration: crop.duration,
        keyPractices: this.getKeyPractices(crop.cropName),
        commonChallenges: crop.riskFactors,
        expertTips: this.getExpertTips(crop.cropName)
      },
      soilImprovements: {
        requiredAmendments,
        fertilizationPlan,
        estimatedCost: {
          min: requiredAmendments.reduce((sum, a) => sum + 1000, 0),
          max: requiredAmendments.reduce((sum, a) => sum + 2000, 0),
          currency: 'INR'
        }
      }
    };
  }

  /**
   * Analyze soil limitations for crop production
   */
  private analyzeSoilLimitations(
    nutrients: SoilNutrients,
    micronutrients: Micronutrients
  ): Array<{
    parameter: string;
    currentValue: number;
    optimalRange: { min: number; max: number };
    impact: string;
    improvementSuggestions: string[];
  }> {
    const limitations: Array<{
      parameter: string;
      currentValue: number;
      optimalRange: { min: number; max: number };
      impact: string;
      improvementSuggestions: string[];
    }> = [];

    // Check pH limitations
    if (nutrients.pH) {
      const pH = nutrients.pH.value;
      if (pH < 6.0 || pH > 7.5) {
        limitations.push({
          parameter: 'pH',
          currentValue: pH,
          optimalRange: { min: 6.0, max: 7.5 },
          impact: pH < 6.0 
            ? 'Acidic soil reduces nutrient availability and limits crop choices'
            : 'Alkaline soil causes nutrient deficiencies and poor crop growth',
          improvementSuggestions: pH < 6.0
            ? ['Apply agricultural lime', 'Add organic matter', 'Use acid-tolerant varieties']
            : ['Add sulfur or gypsum', 'Increase organic matter', 'Improve drainage']
        });
      }
    }

    // Check nutrient limitations
    if (nutrients.nitrogen && nutrients.nitrogen.status === 'deficient') {
      limitations.push({
        parameter: 'Nitrogen',
        currentValue: nutrients.nitrogen.value,
        optimalRange: { min: 200, max: 300 },
        impact: 'Low nitrogen limits plant growth and reduces yield potential',
        improvementSuggestions: [
          'Apply nitrogen fertilizers (urea, ammonium sulfate)',
          'Use organic sources (FYM, compost)',
          'Grow leguminous crops for nitrogen fixation'
        ]
      });
    }

    if (nutrients.phosphorus && nutrients.phosphorus.status === 'deficient') {
      limitations.push({
        parameter: 'Phosphorus',
        currentValue: nutrients.phosphorus.value,
        optimalRange: { min: 20, max: 40 },
        impact: 'Phosphorus deficiency affects root development and flowering',
        improvementSuggestions: [
          'Apply phosphatic fertilizers (DAP, SSP)',
          'Use rock phosphate for long-term supply',
          'Apply near root zone for better uptake'
        ]
      });
    }

    if (nutrients.potassium && nutrients.potassium.status === 'deficient') {
      limitations.push({
        parameter: 'Potassium',
        currentValue: nutrients.potassium.value,
        optimalRange: { min: 120, max: 200 },
        impact: 'Potassium deficiency reduces disease resistance and fruit quality',
        improvementSuggestions: [
          'Apply potassic fertilizers (MOP, SOP)',
          'Use wood ash or banana peels',
          'Apply during fruit development stage'
        ]
      });
    }

    return limitations;
  }

  /**
   * Simulate improved soil conditions after amendments
   */
  private simulateImprovedSoilConditions(extractedData: any): any {
    const improved = JSON.parse(JSON.stringify(extractedData)); // Deep copy

    // Simulate pH correction
    if (improved.nutrients.pH) {
      const currentPH = improved.nutrients.pH.value;
      if (currentPH < 6.0) {
        improved.nutrients.pH.value = Math.min(6.5, currentPH + 1.0);
        improved.nutrients.pH.status = 'optimal';
      } else if (currentPH > 7.5) {
        improved.nutrients.pH.value = Math.max(7.0, currentPH - 0.8);
        improved.nutrients.pH.status = 'optimal';
      }
    }

    // Simulate nutrient improvements
    if (improved.nutrients.nitrogen && improved.nutrients.nitrogen.status === 'deficient') {
      improved.nutrients.nitrogen.value = Math.min(250, improved.nutrients.nitrogen.value + 100);
      improved.nutrients.nitrogen.status = 'optimal';
    }

    if (improved.nutrients.phosphorus && improved.nutrients.phosphorus.status === 'deficient') {
      improved.nutrients.phosphorus.value = Math.min(35, improved.nutrients.phosphorus.value + 20);
      improved.nutrients.phosphorus.status = 'optimal';
    }

    if (improved.nutrients.potassium && improved.nutrients.potassium.status === 'deficient') {
      improved.nutrients.potassium.value = Math.min(180, improved.nutrients.potassium.value + 60);
      improved.nutrients.potassium.status = 'optimal';
    }

    return improved;
  }

  /**
   * Generate soil improvement plan
   */
  private generateSoilImprovementPlan(
    extractedData: any,
    targetCrops: string[]
  ): {
    amendments: Array<{
      amendment: string;
      quantity: string;
      cost: { min: number; max: number };
      expectedImprovement: string;
    }>;
    timeline: string;
    totalCost: { min: number; max: number; currency: string };
    expectedBenefits: string[];
  } {
    const amendments: Array<{
      amendment: string;
      quantity: string;
      cost: { min: number; max: number };
      expectedImprovement: string;
    }> = [];

    const { nutrients } = extractedData;

    // pH correction
    if (nutrients.pH && nutrients.pH.value < 6.0) {
      amendments.push({
        amendment: 'Agricultural Lime',
        quantity: '500-1000 kg per hectare',
        cost: { min: 2000, max: 4000 },
        expectedImprovement: 'Increase pH to optimal range (6.0-7.5)'
      });
    } else if (nutrients.pH && nutrients.pH.value > 7.5) {
      amendments.push({
        amendment: 'Sulfur',
        quantity: '200-400 kg per hectare',
        cost: { min: 1500, max: 3000 },
        expectedImprovement: 'Reduce pH to optimal range (6.0-7.5)'
      });
    }

    // Nutrient amendments
    if (nutrients.nitrogen && nutrients.nitrogen.status === 'deficient') {
      amendments.push({
        amendment: 'Farmyard Manure',
        quantity: '10-15 tons per hectare',
        cost: { min: 5000, max: 8000 },
        expectedImprovement: 'Increase nitrogen and organic matter content'
      });
    }

    if (nutrients.phosphorus && nutrients.phosphorus.status === 'deficient') {
      amendments.push({
        amendment: 'Rock Phosphate',
        quantity: '300-500 kg per hectare',
        cost: { min: 3000, max: 5000 },
        expectedImprovement: 'Long-term phosphorus supply'
      });
    }

    if (nutrients.potassium && nutrients.potassium.status === 'deficient') {
      amendments.push({
        amendment: 'Muriate of Potash',
        quantity: '100-150 kg per hectare',
        cost: { min: 2000, max: 3500 },
        expectedImprovement: 'Improve potassium levels and plant health'
      });
    }

    // Always recommend organic matter
    amendments.push({
      amendment: 'Compost',
      quantity: '5-8 tons per hectare',
      cost: { min: 3000, max: 5000 },
      expectedImprovement: 'Improve soil structure and nutrient retention'
    });

    const totalCost = {
      min: amendments.reduce((sum, a) => sum + a.cost.min, 0),
      max: amendments.reduce((sum, a) => sum + a.cost.max, 0),
      currency: 'INR'
    };

    const expectedBenefits = [
      'Improved crop suitability scores',
      'Higher expected yields',
      'Better nutrient availability',
      'Enhanced soil structure',
      'Reduced production risks',
      'Long-term soil health improvement'
    ];

    return {
      amendments,
      timeline: '3-6 months for visible improvements',
      totalCost,
      expectedBenefits
    };
  }

  /**
   * Calculate risk reduction from soil improvements
   */
  private calculateRiskReduction(
    currentCrop: CropRecommendation | null,
    improvedCrop: CropRecommendation | null
  ): string[] {
    if (!currentCrop || !improvedCrop) return [];

    const riskReductions: string[] = [];

    if (improvedCrop.soilCompatibility.limitingFactors.length < currentCrop.soilCompatibility.limitingFactors.length) {
      riskReductions.push('Reduced soil-related production risks');
    }

    if (improvedCrop.projections.profitability.roi > currentCrop.projections.profitability.roi) {
      riskReductions.push('Improved financial returns and stability');
    }

    if (improvedCrop.suitabilityScore > currentCrop.suitabilityScore + 10) {
      riskReductions.push('Better crop-soil compatibility reduces failure risk');
    }

    return riskReductions;
  }

  /**
   * Generate required amendments for specific crop
   */
  private generateRequiredAmendments(
    nutrients: SoilNutrients,
    micronutrients: Micronutrients,
    crop: any
  ): Array<{
    amendment: string;
    quantity: string;
    purpose: string;
    timing: string;
  }> {
    const amendments: Array<{
      amendment: string;
      quantity: string;
      purpose: string;
      timing: string;
    }> = [];

    // pH adjustment
    if (nutrients.pH) {
      const pH = nutrients.pH.value;
      const optimalPH = crop.requirements.optimalPH;
      
      if (pH < optimalPH.min) {
        amendments.push({
          amendment: 'Agricultural Lime',
          quantity: `${Math.round((optimalPH.min - pH) * 500)} kg/ha`,
          purpose: 'Correct soil acidity',
          timing: '2-3 weeks before sowing'
        });
      } else if (pH > optimalPH.max) {
        amendments.push({
          amendment: 'Sulfur',
          quantity: `${Math.round((pH - optimalPH.max) * 200)} kg/ha`,
          purpose: 'Reduce soil alkalinity',
          timing: '4-6 weeks before sowing'
        });
      }
    }

    // Nutrient-specific amendments
    if (nutrients.nitrogen && nutrients.nitrogen.value < crop.requirements.nitrogenRequirement.min) {
      amendments.push({
        amendment: 'Farmyard Manure',
        quantity: '10-12 tons/ha',
        purpose: 'Increase nitrogen and organic matter',
        timing: '3-4 weeks before sowing'
      });
    }

    if (nutrients.phosphorus && nutrients.phosphorus.value < crop.requirements.phosphorusRequirement.min) {
      amendments.push({
        amendment: 'Single Super Phosphate',
        quantity: '200-300 kg/ha',
        purpose: 'Improve phosphorus availability',
        timing: 'At sowing time'
      });
    }

    return amendments;
  }

  /**
   * Generate fertilization plan for specific crop
   */
  private generateFertilizationPlan(
    nutrients: SoilNutrients,
    crop: any
  ): Array<{
    fertilizer: string;
    quantity: string;
    timing: string;
    method: string;
  }> {
    const plan: Array<{
      fertilizer: string;
      quantity: string;
      timing: string;
      method: string;
    }> = [];

    // Base fertilizer recommendation
    plan.push({
      fertilizer: 'NPK Complex (12:32:16)',
      quantity: '150-200 kg/ha',
      timing: 'At sowing',
      method: 'Broadcast and incorporate'
    });

    // Top dressing based on crop requirements
    if (crop.requirements.nitrogenRequirement.min > 100) {
      plan.push({
        fertilizer: 'Urea',
        quantity: '100-150 kg/ha',
        timing: '30-45 days after sowing',
        method: 'Side dressing'
      });
    }

    return plan;
  }

  /**
   * Get current season based on date
   */
  private getCurrentSeason(): string {
    const month = new Date().getMonth() + 1; // 1-12
    
    if (month >= 6 && month <= 10) {
      return 'Kharif';
    } else if (month >= 11 || month <= 3) {
      return 'Rabi';
    } else {
      return 'Zaid';
    }
  }

  /**
   * Get risk mitigation strategy
   */
  private getRiskMitigation(riskFactor: string): string {
    const mitigations: Record<string, string> = {
      'Water dependency': 'Install drip irrigation or rainwater harvesting',
      'Pest attacks': 'Use integrated pest management and resistant varieties',
      'Weather sensitivity': 'Choose appropriate sowing time and use weather forecasts',
      'Price volatility': 'Diversify crops and use contract farming',
      'Market glut': 'Plan harvest timing and explore value addition',
      'Storage issues': 'Improve storage facilities and use proper drying',
      'High water requirement': 'Ensure adequate irrigation and water conservation',
      'Long duration': 'Plan crop rotation and intercropping carefully'
    };

    return mitigations[riskFactor] || 'Consult agricultural experts for specific guidance';
  }

  /**
   * Get sowing time for season
   */
  private getSowingTime(season: string): string {
    const sowingTimes: Record<string, string> = {
      'kharif': 'June-July (with monsoon onset)',
      'rabi': 'October-December (post-monsoon)',
      'zaid': 'March-April (summer season)',
      'perennial': 'Monsoon season for planting'
    };

    return sowingTimes[season] || 'Consult local agricultural calendar';
  }

  /**
   * Get harvest time
   */
  private getHarvestTime(season: string, duration: number): string {
    const harvestTimes: Record<string, string> = {
      'kharif': 'October-December',
      'rabi': 'March-May',
      'zaid': 'June-July',
      'perennial': 'Season-specific harvesting'
    };

    return harvestTimes[season] || `${duration} days after sowing`;
  }

  /**
   * Get key practices for crop
   */
  private getKeyPractices(cropName: string): string[] {
    const practices: Record<string, string[]> = {
      'Rice': ['Proper water management', 'Timely transplanting', 'Weed control', 'Balanced fertilization'],
      'Wheat': ['Timely sowing', 'Proper seed rate', 'Irrigation scheduling', 'Disease monitoring'],
      'Cotton': ['Pest monitoring', 'Proper spacing', 'Timely picking', 'Water management'],
      'Maize': ['Proper plant population', 'Weed management', 'Balanced nutrition', 'Pest control'],
      'Sugarcane': ['Quality seed selection', 'Proper planting depth', 'Irrigation management', 'Ratoon management']
    };

    return practices[cropName] || ['Follow recommended practices', 'Monitor crop regularly', 'Maintain proper nutrition'];
  }

  /**
   * Get expert tips for crop
   */
  private getExpertTips(cropName: string): string[] {
    const tips: Record<string, string[]> = {
      'Rice': ['Use certified seeds', 'Maintain 2-3 cm water level', 'Apply silicon for pest resistance'],
      'Wheat': ['Avoid late sowing', 'Use disease-resistant varieties', 'Apply zinc if deficient'],
      'Cotton': ['Monitor for bollworm weekly', 'Use pheromone traps', 'Maintain plant health'],
      'Maize': ['Use hybrid varieties', 'Apply boron for better cob filling', 'Harvest at proper moisture'],
      'Sugarcane': ['Use disease-free setts', 'Apply micronutrients', 'Proper trash management']
    };

    return tips[cropName] || ['Use quality inputs', 'Follow scientific practices', 'Seek expert advice when needed'];
  }
}

export default SoilAnalysisService;