// Advisory Engine Service
// Provides crop recommendations and farming advice integrated with soil analysis

import { SoilAnalysisService } from '../soil-analysis';
import { 
  SoilAnalysisResult, 
  CropRecommendation, 
  CropRecommendationOptions,
  CropSuitabilityAnalysis 
} from '../soil-analysis/types';

export interface AdvisoryRequest {
  farmerId: string;
  soilAnalysisResult?: SoilAnalysisResult;
  location?: {
    state: string;
    district: string;
    block: string;
  };
  farmSize?: number;
  season?: 'kharif' | 'rabi' | 'zaid' | 'all';
  preferences?: {
    organicFarming?: boolean;
    riskTolerance?: 'low' | 'medium' | 'high';
    budget?: { min: number; max: number };
    experienceLevel?: 'beginner' | 'intermediate' | 'expert';
  };
}

export interface AdvisoryResponse {
  farmerId: string;
  recommendations: CropRecommendation[];
  soilBasedAdvice: {
    soilHealthScore: number;
    criticalIssues: string[];
    improvementPlan: string[];
    seasonalGuidance: string[];
  };
  integratedPlan: {
    immediateActions: string[];
    shortTermGoals: string[];
    longTermStrategy: string[];
    expectedOutcomes: string[];
  };
  confidence: number;
  generatedAt: Date;
}

export class AdvisoryService {
  private soilAnalysisService: SoilAnalysisService;

  constructor() {
    this.soilAnalysisService = new SoilAnalysisService();
    console.log('Advisory Service initialized with soil analysis integration');
  }

  /**
   * Get comprehensive farming advice based on soil analysis and farmer preferences
   */
  public async getComprehensiveAdvice(request: AdvisoryRequest): Promise<AdvisoryResponse> {
    console.log(`Generating comprehensive advice for farmer: ${request.farmerId}`);

    try {
      // Validate input
      if (!request.soilAnalysisResult) {
        throw new Error('Soil analysis result is required for comprehensive advice');
      }

      // Get soil-based crop recommendations
      const cropRecommendations = await this.getCropRecommendationsFromSoil(
        request.soilAnalysisResult,
        {
          season: request.season || 'all',
          farmSize: request.farmSize,
          budget: request.preferences?.budget,
          riskTolerance: request.preferences?.riskTolerance || 'medium',
          organicPreference: request.preferences?.organicFarming || false,
          experienceLevel: request.preferences?.experienceLevel || 'intermediate',
          maxRecommendations: 5
        }
      );

      // Generate soil-based advice
      const soilBasedAdvice = this.generateSoilBasedAdvice(request.soilAnalysisResult);

      // Create integrated farming plan
      const integratedPlan = this.createIntegratedFarmingPlan(
        request.soilAnalysisResult,
        cropRecommendations.topRecommendations,
        request.preferences
      );

      // Calculate overall confidence
      const confidence = this.calculateAdviceConfidence(
        request.soilAnalysisResult,
        cropRecommendations,
        request
      );

      return {
        farmerId: request.farmerId,
        recommendations: cropRecommendations.topRecommendations,
        soilBasedAdvice,
        integratedPlan,
        confidence,
        generatedAt: new Date()
      };

    } catch (error) {
      console.error('Failed to generate comprehensive advice:', error);
      throw new Error(`Advisory generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get crop recommendations specifically based on soil analysis
   */
  public async getCropRecommendationsFromSoil(
    soilAnalysisResult: SoilAnalysisResult,
    options: CropRecommendationOptions = {}
  ): Promise<CropSuitabilityAnalysis> {
    console.log('Getting crop recommendations based on soil analysis');
    
    return await this.soilAnalysisService.getCropRecommendationsFromSoilData(
      soilAnalysisResult,
      options
    );
  }

  /**
   * Get seasonal crop recommendations with soil considerations
   */
  public async getSeasonalRecommendations(
    soilAnalysisResult: SoilAnalysisResult,
    season: 'kharif' | 'rabi' | 'zaid',
    options: Omit<CropRecommendationOptions, 'season'> = {}
  ): Promise<CropRecommendation[]> {
    console.log(`Getting ${season} season recommendations based on soil analysis`);
    
    return await this.soilAnalysisService.getSeasonalCropRecommendations(
      soilAnalysisResult,
      season,
      options
    );
  }

  /**
   * Get crop recommendations with soil improvement plan
   */
  public async getRecommendationsWithSoilImprovement(
    soilAnalysisResult: SoilAnalysisResult,
    targetCrops?: string[],
    options: CropRecommendationOptions = {}
  ) {
    console.log('Getting crop recommendations with soil improvement plan');
    
    return await this.soilAnalysisService.getCropRecommendationsWithSoilImprovement(
      soilAnalysisResult,
      targetCrops,
      options
    );
  }

  /**
   * Generate soil-based farming advice
   */
  private generateSoilBasedAdvice(soilAnalysisResult: SoilAnalysisResult) {
    const { interpretation, extractedData } = soilAnalysisResult;
    
    const criticalIssues: string[] = [];
    const improvementPlan: string[] = [];
    const seasonalGuidance: string[] = [];

    // Analyze critical soil issues
    if (interpretation.overallHealth === 'poor') {
      criticalIssues.push('Soil health requires immediate attention');
    }

    interpretation.primaryConcerns.forEach(concern => {
      criticalIssues.push(concern);
    });

    // Generate improvement plan based on soil deficiencies
    const nutrients = extractedData.nutrients;
    
    if (nutrients.pH.status === 'deficient' || nutrients.pH.status === 'excessive') {
      improvementPlan.push(`Correct soil pH (current: ${nutrients.pH.value}) to optimal range (6.0-7.5)`);
    }

    if (nutrients.nitrogen.status === 'deficient') {
      improvementPlan.push('Apply nitrogen fertilizer to address deficiency');
    }

    if (nutrients.phosphorus.status === 'deficient') {
      improvementPlan.push('Increase phosphorus levels for better root development');
    }

    if (nutrients.potassium.status === 'deficient') {
      improvementPlan.push('Apply potassium fertilizer to improve disease resistance');
    }

    // Add organic matter recommendation if needed
    if (extractedData.organicMatter && extractedData.organicMatter.status === 'deficient') {
      improvementPlan.push('Increase organic matter content through compost or FYM application');
    }

    // Generate seasonal guidance
    const currentSeason = this.getCurrentSeason();
    seasonalGuidance.push(`Current season (${currentSeason}) considerations for your soil type`);
    
    if (nutrients.pH.value < 6.0) {
      seasonalGuidance.push('Apply lime during dry season for better pH correction');
    }

    if (interpretation.overallHealth === 'good' || interpretation.overallHealth === 'excellent') {
      seasonalGuidance.push('Soil conditions are favorable for diverse crop cultivation');
    }

    return {
      soilHealthScore: interpretation.healthScore,
      criticalIssues,
      improvementPlan,
      seasonalGuidance
    };
  }

  /**
   * Create integrated farming plan combining soil analysis and crop recommendations
   */
  private createIntegratedFarmingPlan(
    soilAnalysisResult: SoilAnalysisResult,
    cropRecommendations: CropRecommendation[],
    preferences?: AdvisoryRequest['preferences']
  ) {
    const immediateActions: string[] = [];
    const shortTermGoals: string[] = [];
    const longTermStrategy: string[] = [];
    const expectedOutcomes: string[] = [];

    // Immediate actions based on soil analysis
    soilAnalysisResult.interpretation.recommendations.forEach(rec => {
      if (rec.priority === 'high') {
        immediateActions.push(rec.title + ': ' + rec.description);
      }
    });

    // Add crop-specific immediate actions
    if (cropRecommendations.length > 0) {
      const topCrop = cropRecommendations[0];
      immediateActions.push(`Prepare land for ${topCrop.cropName} cultivation`);
      
      if (topCrop.soilImprovements.requiredAmendments.length > 0) {
        topCrop.soilImprovements.requiredAmendments.forEach(amendment => {
          immediateActions.push(`Apply ${amendment.amendment} (${amendment.quantity}) - ${amendment.purpose}`);
        });
      }
    }

    // Short-term goals (1-2 seasons)
    shortTermGoals.push('Implement soil improvement measures');
    shortTermGoals.push('Establish recommended crop rotation');
    
    if (preferences?.organicFarming) {
      shortTermGoals.push('Transition to organic farming practices');
    }

    cropRecommendations.slice(0, 3).forEach(crop => {
      shortTermGoals.push(`Achieve optimal yield for ${crop.cropName} (${crop.projections.expectedYield.min}-${crop.projections.expectedYield.max} ${crop.projections.expectedYield.unit})`);
    });

    // Long-term strategy (3+ years)
    longTermStrategy.push('Build sustainable soil health through organic matter management');
    longTermStrategy.push('Establish diversified cropping system');
    longTermStrategy.push('Implement integrated pest and nutrient management');
    
    if (soilAnalysisResult.interpretation.overallHealth === 'poor' || soilAnalysisResult.interpretation.overallHealth === 'fair') {
      longTermStrategy.push('Achieve excellent soil health status');
    }

    // Expected outcomes
    expectedOutcomes.push(`Improve soil health score from ${soilAnalysisResult.interpretation.healthScore} to 85+`);
    
    if (cropRecommendations.length > 0) {
      const avgROI = cropRecommendations.reduce((sum, crop) => sum + crop.projections.profitability.roi, 0) / cropRecommendations.length;
      expectedOutcomes.push(`Achieve average ROI of ${avgROI.toFixed(1)}% from recommended crops`);
    }

    expectedOutcomes.push('Establish sustainable and profitable farming system');
    expectedOutcomes.push('Reduce input costs through improved soil health');

    return {
      immediateActions,
      shortTermGoals,
      longTermStrategy,
      expectedOutcomes
    };
  }

  /**
   * Calculate confidence score for the advice
   */
  private calculateAdviceConfidence(
    soilAnalysisResult: SoilAnalysisResult,
    cropRecommendations: CropSuitabilityAnalysis,
    request: AdvisoryRequest
  ): number {
    let confidence = 0.8; // Base confidence

    // Adjust based on soil analysis confidence
    confidence *= soilAnalysisResult.confidence;

    // Adjust based on crop recommendation quality
    if (cropRecommendations.topRecommendations.length > 0) {
      const avgCropConfidence = cropRecommendations.topRecommendations
        .reduce((sum, crop) => sum + crop.confidence, 0) / cropRecommendations.topRecommendations.length;
      confidence *= avgCropConfidence;
    } else {
      confidence *= 0.6; // Lower confidence if no good crop recommendations
    }

    // Adjust based on data completeness
    if (request.location && request.farmSize) {
      confidence *= 1.1; // Boost for complete data
    }

    if (!request.preferences) {
      confidence *= 0.9; // Slight reduction for missing preferences
    }

    return Math.min(1.0, Math.max(0.1, confidence));
  }

  /**
   * Get current season based on month
   */
  private getCurrentSeason(): string {
    const month = new Date().getMonth() + 1; // 1-12
    
    if (month >= 6 && month <= 10) {
      return 'Kharif';
    } else if (month >= 11 || month <= 2) {
      return 'Rabi';
    } else {
      return 'Zaid';
    }
  }

  /**
   * Get farmer-friendly explanation of soil-based recommendations
   */
  public getFarmerFriendlyAdvice(
    advisoryResponse: AdvisoryResponse,
    language: string = 'en'
  ): {
    summary: string;
    topRecommendations: string[];
    soilAdvice: string[];
    nextSteps: string[];
  } {
    const { recommendations, soilBasedAdvice, integratedPlan } = advisoryResponse;
    
    // Use the soil analysis service's farmer-friendly explanation capability
    const cropExplanation = this.soilAnalysisService.getFarmerFriendlyCropRecommendations(
      recommendations,
      language
    );

    const summary = language === 'hi' 
      ? `आपकी मिट्टी का स्वास्थ्य स्कोर ${soilBasedAdvice.soilHealthScore}% है। ${recommendations.length} फसलों की सिफारिश की गई है।`
      : `Your soil health score is ${soilBasedAdvice.soilHealthScore}%. ${recommendations.length} crops are recommended.`;

    const topRecommendations = recommendations.slice(0, 3).map(crop => 
      language === 'hi' 
        ? `${crop.localName} - ${crop.suitabilityScore}% उपयुक्त`
        : `${crop.cropName} - ${crop.suitabilityScore}% suitable`
    );

    const soilAdvice = soilBasedAdvice.improvementPlan.slice(0, 3);

    const nextSteps = integratedPlan.immediateActions.slice(0, 3);

    return {
      summary,
      topRecommendations,
      soilAdvice,
      nextSteps
    };
  }
}

export default AdvisoryService;