// Visual Analysis Engine Types

export interface ImageMetadata {
  filename: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
  farmerId: string;
  location?: {
    latitude?: number;
    longitude?: number;
  };
  deviceInfo?: {
    make?: string;
    model?: string;
    orientation?: number;
  };
}

export interface ReferenceObject {
  type: 'person' | 'vehicle' | 'building' | 'tree' | 'pole';
  knownSize: number; // in meters
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface LandZone {
  id: string;
  type: 'cultivable' | 'water_body' | 'residential' | 'forest' | 'barren';
  area: number; // in square meters
  boundingPolygon: Array<{ x: number; y: number }>;
  characteristics: string[];
  suitability: {
    crops: string[];
    score: number;
    limitations: string[];
  };
}

export interface SoilIndicator {
  type: 'color' | 'texture' | 'moisture' | 'erosion';
  value: string;
  confidence: number;
  implications: string[];
}

export interface VegetationAnalysis {
  coveragePercentage: number;
  vegetationType: 'crops' | 'weeds' | 'trees' | 'grass' | 'mixed';
  healthScore: number;
  seasonalIndicators: string[];
}

export interface TerrainType {
  primary: 'flat' | 'hilly' | 'mountainous' | 'valley' | 'plateau';
  slope: number; // in degrees
  drainage: 'excellent' | 'good' | 'moderate' | 'poor';
  accessibility: 'easy' | 'moderate' | 'difficult';
}

export interface AreaEstimate {
  totalArea: number; // in square meters
  confidence: number; // 0-1
  method: 'reference_object' | 'gps_boundary' | 'visual_estimation';
  breakdown: {
    cultivableArea: number;
    nonCultivableArea: number;
    waterBodies: number;
    infrastructure: number;
  };
}

export interface TerrainClassification {
  terrainType: TerrainType;
  zones: LandZone[];
  waterSources: Array<{
    type: 'well' | 'pond' | 'river' | 'canal' | 'borewell';
    location: { x: number; y: number };
    accessibility: 'direct' | 'nearby' | 'distant';
  }>;
  infrastructure: Array<{
    type: 'road' | 'building' | 'fence' | 'irrigation';
    condition: 'good' | 'fair' | 'poor';
    location: { x: number; y: number };
  }>;
}

export interface QualityAssessment {
  overallScore: number; // 0-1
  issues: Array<{
    type: 'blur' | 'lighting' | 'angle' | 'obstruction' | 'resolution' | 'exposure' | 'noise' | 'color_balance';
    severity: 'low' | 'medium' | 'high';
    description: string;
    suggestion: string;
    confidence: number; // 0-1
  }>;
  usableForAnalysis: boolean;
  recommendedActions: string[];
  detailedMetrics: {
    sharpness: { score: number; status: 'excellent' | 'good' | 'fair' | 'poor'; feedback: string };
    brightness: { score: number; status: 'excellent' | 'good' | 'fair' | 'poor'; feedback: string };
    contrast: { score: number; status: 'excellent' | 'good' | 'fair' | 'poor'; feedback: string };
    resolution: { score: number; status: 'excellent' | 'good' | 'fair' | 'poor'; feedback: string };
    colorBalance: { score: number; status: 'excellent' | 'good' | 'fair' | 'poor'; feedback: string };
    noise: { score: number; status: 'excellent' | 'good' | 'fair' | 'poor'; feedback: string };
  };
  improvementSuggestions: {
    immediate: string[]; // Actions user can take right now
    technical: string[]; // Camera/phone settings adjustments
    environmental: string[]; // Lighting, positioning, timing suggestions
  };
}

export interface LandAnalysis {
  estimatedArea: AreaEstimate;
  terrainType: TerrainType;
  zones: LandZone[];
  soilVisualIndicators: SoilIndicator[];
  vegetationCover: VegetationAnalysis;
  recommendations: string[];
  confidence: number;
  analysisDate: Date;
}

export interface ImageProcessingOptions {
  enhanceContrast?: boolean;
  correctOrientation?: boolean;
  resizeForAnalysis?: boolean;
  targetWidth?: number;
  targetHeight?: number;
  compressionQuality?: number;
}

export interface ProcessedImage {
  originalBuffer: Buffer;
  processedBuffer: Buffer;
  metadata: ImageMetadata;
  processingApplied: string[];
  qualityMetrics: {
    sharpness: number;
    brightness: number;
    contrast: number;
    colorfulness: number;
  };
}

// Land Segmentation Types
export interface SegmentationSuggestion {
  id: string;
  name: string;
  description: string;
  zones: SegmentationZone[];
  benefits: string[];
  considerations: string[];
  estimatedROI: {
    low: number;
    high: number;
    timeframe: string;
  };
  implementationSteps: string[];
  seasonalPlan: SeasonalPlan[];
  confidence: number;
}

export interface SegmentationZone {
  id: string;
  name: string;
  type: 'crop_production' | 'livestock' | 'aquaculture' | 'agroforestry' | 'infrastructure' | 'conservation';
  area: number; // in square meters
  percentage: number; // percentage of total land
  boundingPolygon: Array<{ x: number; y: number }>;
  recommendedUse: string[];
  expectedYield: {
    crop?: string;
    quantity: number;
    unit: string;
    season: string;
  }[];
  requiredInputs: {
    seeds?: string[];
    fertilizers?: string[];
    equipment?: string[];
    labor?: string;
    water?: string;
  };
  estimatedCost: number;
  estimatedRevenue: number;
}

export interface SeasonalPlan {
  season: 'kharif' | 'rabi' | 'zaid' | 'year_round';
  months: string[];
  activities: Array<{
    zone: string;
    activity: string;
    timing: string;
    resources: string[];
  }>;
}

export interface SegmentationOptions {
  farmingExperience?: 'beginner' | 'intermediate' | 'advanced';
  availableCapital?: 'low' | 'medium' | 'high';
  riskTolerance?: 'low' | 'medium' | 'high';
  marketAccess?: 'local' | 'regional' | 'national';
  waterAvailability?: 'limited' | 'moderate' | 'abundant';
  laborAvailability?: 'family' | 'hired' | 'mechanized';
  preferredCrops?: string[];
  integratedFarming?: boolean;
  organicFarming?: boolean;
}

// Sketch and Hand-drawn Map Types
export interface SketchElement {
  id: string;
  type: 'boundary' | 'water_source' | 'building' | 'road' | 'tree' | 'crop_area' | 'annotation';
  coordinates: Array<{ x: number; y: number }>;
  label?: string;
  properties?: {
    size?: string;
    color?: string;
    notes?: string;
  };
}

export interface SketchAnalysis {
  elements: SketchElement[];
  estimatedScale?: {
    pixelsPerMeter: number;
    confidence: number;
    referenceElement?: string;
  };
  interpretedLayout: {
    totalArea?: number;
    zones: Array<{
      type: string;
      area: number;
      description: string;
    }>;
  };
  confidence: number;
  suggestions: string[];
}

export interface HandDrawnMapMetadata {
  drawingStyle: 'sketch' | 'technical' | 'freehand';
  hasScale?: boolean;
  hasLabels?: boolean;
  hasLegend?: boolean;
  clarity: 'high' | 'medium' | 'low';
  completeness: 'complete' | 'partial' | 'minimal';
}

export interface SketchProcessingOptions {
  enableTextRecognition?: boolean;
  enableShapeDetection?: boolean;
  enableScaleEstimation?: boolean;
  minimumElementSize?: number;
  confidenceThreshold?: number;
  enhanceContrast?: boolean;
}