// Soil Analysis Service Types

export interface SoilReportMetadata {
  filename: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
  farmerId: string;
  location?: {
    latitude?: number;
    longitude?: number;
  };
  reportDate?: Date;
  laboratoryName?: string;
  sampleId?: string;
}

export interface SoilParameter {
  name: string;
  value: number;
  unit: string;
  range: {
    min: number;
    max: number;
    optimal?: {
      min: number;
      max: number;
    };
  };
  status: 'deficient' | 'adequate' | 'excessive' | 'optimal';
  confidence: number; // 0-1
}

export interface SoilNutrients {
  pH: SoilParameter;
  nitrogen: SoilParameter;
  phosphorus: SoilParameter;
  potassium: SoilParameter;
  organicCarbon?: SoilParameter;
  electricalConductivity?: SoilParameter;
}

export interface Micronutrients {
  zinc?: SoilParameter;
  iron?: SoilParameter;
  manganese?: SoilParameter;
  copper?: SoilParameter;
  boron?: SoilParameter;
  sulfur?: SoilParameter;
}

export interface SoilAnalysisResult {
  reportId: string;
  metadata: SoilReportMetadata;
  extractedData: {
    nutrients: SoilNutrients;
    micronutrients: Micronutrients;
    soilTexture?: string;
    soilType?: string;
    organicMatter?: SoilParameter;
  };
  interpretation: {
    overallHealth: 'poor' | 'fair' | 'good' | 'excellent';
    healthScore: number; // 0-100
    primaryConcerns: string[];
    strengths: string[];
    recommendations: SoilRecommendation[];
  };
  farmerFriendlyExplanation: {
    summary: string;
    keyFindings: string[];
    actionItems: string[];
    language: string;
  };
  confidence: number; // 0-1
  processingDate: Date;
  anomalies: SoilAnomaly[];
}

export interface SoilRecommendation {
  id: string;
  type: 'fertilizer' | 'amendment' | 'practice' | 'crop_selection';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  specificActions: string[];
  expectedOutcome: string;
  timeframe: string;
  cost?: {
    min: number;
    max: number;
    currency: string;
  };
  seasonality?: string[];
}

export interface SoilAnomaly {
  parameter: string;
  issue: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  possibleCauses: string[];
  recommendedAction: string;
}

export interface OCRResult {
  extractedText: string;
  confidence: number;
  language: string;
  structuredData?: {
    parameters: Array<{
      name: string;
      value: string;
      unit?: string;
      confidence: number;
    }>;
    metadata?: {
      laboratoryName?: string;
      reportDate?: string;
      sampleId?: string;
      farmerName?: string;
    };
  };
  processingTime: number;
}

export interface SoilReportUploadOptions {
  enableOCR?: boolean;
  language?: string;
  expectedFormat?: 'standard' | 'government' | 'private_lab' | 'university';
  validateData?: boolean;
  generateRecommendations?: boolean;
}

export interface SoilDataValidation {
  valid: boolean;
  issues: Array<{
    parameter: string;
    issue: string;
    severity: 'warning' | 'error';
    suggestion: string;
  }>;
  confidence: number;
}

export interface CropSuitability {
  cropName: string;
  suitabilityScore: number; // 0-100
  limitingFactors: string[];
  recommendations: string[];
  expectedYield?: {
    min: number;
    max: number;
    unit: string;
  };
}

export interface SoilHealthTrend {
  parameter: string;
  trend: 'improving' | 'stable' | 'declining';
  changeRate: number;
  timeframe: string;
  recommendations: string[];
}

// Crop Recommendation Types
export interface CropRecommendation {
  cropId: string;
  cropName: string;
  localName: string;
  variety?: string;
  suitabilityScore: number; // 0-100
  confidence: number; // 0-1
  season: 'kharif' | 'rabi' | 'zaid' | 'perennial';
  soilCompatibility: {
    pHSuitability: number; // 0-100
    nutrientSuitability: number; // 0-100
    overallSoilMatch: number; // 0-100
    limitingFactors: string[];
  };
  requirements: {
    optimalPH: { min: number; max: number };
    nitrogenRequirement: { min: number; max: number; unit: string };
    phosphorusRequirement: { min: number; max: number; unit: string };
    potassiumRequirement: { min: number; max: number; unit: string };
    waterRequirement: 'low' | 'medium' | 'high';
    soilType: string[];
  };
  projections: {
    expectedYield: { min: number; max: number; unit: string };
    marketPrice: { min: number; max: number; currency: string };
    profitability: {
      grossIncome: { min: number; max: number };
      inputCosts: { min: number; max: number };
      netProfit: { min: number; max: number };
      roi: number; // percentage
    };
    riskFactors: Array<{
      factor: string;
      severity: 'low' | 'medium' | 'high';
      mitigation: string;
    }>;
  };
  cultivation: {
    sowingTime: string;
    harvestTime: string;
    duration: number; // days
    keyPractices: string[];
    commonChallenges: string[];
    expertTips: string[];
  };
  soilImprovements: {
    requiredAmendments: Array<{
      amendment: string;
      quantity: string;
      purpose: string;
      timing: string;
    }>;
    fertilizationPlan: Array<{
      fertilizer: string;
      quantity: string;
      timing: string;
      method: string;
    }>;
    estimatedCost: { min: number; max: number; currency: string };
  };
}

export interface CropRecommendationOptions {
  season?: 'kharif' | 'rabi' | 'zaid' | 'all';
  farmSize?: number; // hectares
  budget?: { min: number; max: number };
  riskTolerance?: 'low' | 'medium' | 'high';
  marketFocus?: 'local' | 'regional' | 'export';
  organicPreference?: boolean;
  experienceLevel?: 'beginner' | 'intermediate' | 'expert';
  irrigationAvailable?: boolean;
  maxRecommendations?: number;
}

export interface CropSuitabilityAnalysis {
  totalCropsAnalyzed: number;
  suitableCrops: number;
  marginallySuitableCrops: number;
  unsuitableCrops: number;
  topRecommendations: CropRecommendation[];
  soilLimitations: Array<{
    parameter: string;
    currentValue: number;
    optimalRange: { min: number; max: number };
    impact: string;
    improvementSuggestions: string[];
  }>;
  seasonalRecommendations: {
    kharif: CropRecommendation[];
    rabi: CropRecommendation[];
    zaid: CropRecommendation[];
    perennial: CropRecommendation[];
  };
}