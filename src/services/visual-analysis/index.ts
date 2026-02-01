// Visual Analysis Engine Service
// Processes land photos and provides visual-based recommendations

import ImageUploadService from './services/ImageUploadService';
import ImagePreprocessingService from './services/ImagePreprocessingService';
import AreaEstimationService from './services/AreaEstimationService';
import TerrainClassificationService from './services/TerrainClassificationService';
import LandSegmentationService from './services/LandSegmentationService';
import SketchProcessingService from './services/SketchProcessingService';
import { 
  ImageMetadata, 
  LandAnalysis, 
  AreaEstimate, 
  TerrainClassification, 
  QualityAssessment,
  ReferenceObject,
  ProcessedImage,
  SegmentationSuggestion,
  SketchAnalysis,
  SketchProcessingOptions
} from './types';

export interface VisualAnalysisEngine {
  analyzeLandPhoto(imageData: Buffer, metadata: ImageMetadata): Promise<LandAnalysis>;
  estimateArea(imageData: Buffer, referenceObjects?: ReferenceObject[]): Promise<AreaEstimate>;
  classifyTerrain(imageData: Buffer): Promise<TerrainClassification>;
  assessImageQuality(imageData: Buffer): Promise<QualityAssessment>;
  processSketch(imageData: Buffer, metadata?: ImageMetadata, options?: SketchProcessingOptions): Promise<SketchAnalysis>;
}

export class VisualAnalysisService implements VisualAnalysisEngine {
  private uploadService: ImageUploadService;
  private preprocessingService: ImagePreprocessingService;
  private areaEstimationService: AreaEstimationService;
  private terrainClassificationService: TerrainClassificationService;
  private landSegmentationService: LandSegmentationService;
  private sketchProcessingService: SketchProcessingService;

  constructor() {
    console.log('Visual Analysis Service initialized');
    this.uploadService = new ImageUploadService({
      uploadDir: './uploads/land-images',
      thumbnailDir: './uploads/thumbnails',
      maxStorageSize: 500 * 1024 * 1024, // 500MB
      retentionDays: 90 // Keep images for 90 days
    });
    this.preprocessingService = new ImagePreprocessingService();
    this.areaEstimationService = new AreaEstimationService();
    this.terrainClassificationService = new TerrainClassificationService();
    this.landSegmentationService = new LandSegmentationService();
    this.sketchProcessingService = new SketchProcessingService();
  }

  /**
   * Upload and preprocess land image
   */
  public async uploadLandImage(
    buffer: Buffer, 
    uploadMetadata: Partial<ImageMetadata>
  ): Promise<{ success: boolean; imageId?: string; errors?: string[] }> {
    try {
      const result = await this.uploadService.uploadLandImage(buffer, uploadMetadata);
      
      if (result.success) {
        return {
          success: true,
          imageId: result.imageId
        };
      } else {
        return {
          success: false,
          errors: result.errors
        };
      }
    } catch (error) {
      return {
        success: false,
        errors: [`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Analyze land photo and provide comprehensive analysis
   */
  public async analyzeLandPhoto(imageData: Buffer, metadata: ImageMetadata): Promise<LandAnalysis> {
    try {
      // First assess image quality
      const qualityAssessment = await this.assessImageQuality(imageData);
      
      if (!qualityAssessment.usableForAnalysis) {
        throw new Error(`Image quality insufficient for analysis: ${qualityAssessment.issues.map(i => i.description).join(', ')}`);
      }

      // Preprocess image for analysis
      const processedImage = await this.preprocessingService.preprocessImage(imageData, metadata, {
        correctOrientation: true,
        resizeForAnalysis: true,
        targetWidth: 1024,
        targetHeight: 768,
        enhanceContrast: true
      });

      // Perform individual analyses
      const [areaEstimate, terrainClassification] = await Promise.all([
        this.estimateArea(processedImage.processedBuffer),
        this.classifyTerrain(processedImage.processedBuffer)
      ]);

      // Generate recommendations based on analysis
      const recommendations = this.generateRecommendations(areaEstimate, terrainClassification, qualityAssessment);

      return {
        estimatedArea: areaEstimate,
        terrainType: terrainClassification.terrainType,
        zones: terrainClassification.zones,
        soilVisualIndicators: this.extractSoilIndicators(processedImage.processedBuffer),
        vegetationCover: this.analyzeVegetation(processedImage.processedBuffer),
        recommendations,
        confidence: this.calculateOverallConfidence(qualityAssessment, areaEstimate, terrainClassification),
        analysisDate: new Date()
      };

    } catch (error) {
      throw new Error(`Land analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Estimate land area from visual inputs
   */
  public async estimateArea(imageData: Buffer, referenceObjects?: ReferenceObject[]): Promise<AreaEstimate> {
    try {
      // Use the enhanced area estimation service
      return await this.areaEstimationService.estimateArea(
        imageData,
        undefined, // metadata not required for basic estimation
        referenceObjects,
        {
          useReferenceObjects: referenceObjects && referenceObjects.length > 0,
          enableEdgeDetection: true,
          enablePerspectiveCorrection: false, // Can be enabled for advanced use cases
          confidenceThreshold: 0.3
        }
      );
    } catch (error) {
      console.error('Area estimation failed:', error);
      // Return fallback estimation
      return {
        totalArea: 2000,
        confidence: 0.3,
        method: 'visual_estimation',
        breakdown: {
          cultivableArea: 1500,
          nonCultivableArea: 300,
          waterBodies: 100,
          infrastructure: 100
        }
      };
    }
  }

  /**
   * Classify terrain and identify zones
   */
  public async classifyTerrain(imageData: Buffer): Promise<TerrainClassification> {
    try {
      // Use the enhanced terrain classification service
      return await this.terrainClassificationService.classifyTerrain(imageData, undefined, {
        enableSlopeAnalysis: true,
        enableDrainageAnalysis: true,
        enableVegetationAnalysis: true,
        enableWaterDetection: true,
        enableInfrastructureDetection: true,
        zoneMinSize: 100,
        confidenceThreshold: 0.6
      });
    } catch (error) {
      console.error('Terrain classification failed:', error);
      // Return fallback classification
      return {
        terrainType: {
          primary: 'flat',
          slope: 0,
          drainage: 'moderate',
          accessibility: 'moderate'
        },
        zones: [],
        waterSources: [],
        infrastructure: []
      };
    }
  }

  /**
   * Assess image quality for analysis suitability
   */
  public async assessImageQuality(imageData: Buffer): Promise<QualityAssessment> {
    return this.preprocessingService.assessImageQuality(imageData);
  }

  /**
   * Get uploaded image
   */
  public async getImage(imageId: string, type: 'original' | 'processed' | 'thumbnail' = 'processed'): Promise<Buffer | null> {
    return this.uploadService.getImage(imageId, type);
  }

  /**
   * List images for a farmer
   */
  public async listFarmerImages(farmerId: string): Promise<Array<{ imageId: string; metadata: ImageMetadata }>> {
    return this.uploadService.listFarmerImages(farmerId);
  }

  /**
   * Delete image
   */
  public async deleteImage(imageId: string): Promise<boolean> {
    return this.uploadService.deleteImage(imageId);
  }

  /**
   * Validate area estimation results
   */
  public validateAreaEstimation(estimation: AreaEstimate): { valid: boolean; issues: string[] } {
    return this.areaEstimationService.validateEstimation(estimation);
  }

  /**
   * Get area estimation recommendations
   */
  public getAreaEstimationRecommendations(estimation: AreaEstimate): string[] {
    return this.areaEstimationService.getEstimationRecommendations(estimation);
  }

  /**
   * Estimate area with detailed options
   */
  public async estimateAreaWithOptions(
    imageData: Buffer,
    metadata?: ImageMetadata,
    referenceObjects?: ReferenceObject[],
    options?: {
      useReferenceObjects?: boolean;
      enableEdgeDetection?: boolean;
      enablePerspectiveCorrection?: boolean;
      confidenceThreshold?: number;
    }
  ): Promise<AreaEstimate> {
    return this.areaEstimationService.estimateArea(imageData, metadata, referenceObjects, options);
  }

  /**
   * Classify terrain with detailed options
   */
  public async classifyTerrainWithOptions(
    imageData: Buffer,
    metadata?: ImageMetadata,
    options?: {
      enableSlopeAnalysis?: boolean;
      enableDrainageAnalysis?: boolean;
      enableVegetationAnalysis?: boolean;
      enableWaterDetection?: boolean;
      enableInfrastructureDetection?: boolean;
      zoneMinSize?: number;
      confidenceThreshold?: number;
    }
  ): Promise<TerrainClassification> {
    return this.terrainClassificationService.classifyTerrain(imageData, metadata, options);
  }

  /**
   * Get terrain classification recommendations
   */
  public getTerrainRecommendations(classification: TerrainClassification): string[] {
    return this.terrainClassificationService.getTerrainRecommendations(classification);
  }

  /**
   * Generate land segmentation suggestions
   */
  public async generateLandSegmentationSuggestions(
    imageData: Buffer,
    metadata?: ImageMetadata,
    options?: {
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
  ): Promise<SegmentationSuggestion[]> {
    try {
      // First, perform area estimation and terrain classification
      const [areaEstimate, terrainClassification] = await Promise.all([
        this.estimateArea(imageData),
        this.classifyTerrain(imageData)
      ]);

      // Generate segmentation suggestions based on analysis
      return await this.landSegmentationService.generateSegmentationSuggestions(
        areaEstimate,
        terrainClassification,
        metadata,
        options || {}
      );
    } catch (error) {
      console.error('Land segmentation suggestion generation failed:', error);
      return [];
    }
  }

  /**
   * Get comprehensive land analysis with segmentation suggestions
   */
  public async getComprehensiveLandAnalysis(
    imageData: Buffer,
    metadata: ImageMetadata,
    options?: {
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
  ): Promise<{
    landAnalysis: LandAnalysis;
    segmentationSuggestions: SegmentationSuggestion[];
  }> {
    try {
      // Perform comprehensive land analysis
      const landAnalysis = await this.analyzeLandPhoto(imageData, metadata);
      
      // Generate segmentation suggestions
      const segmentationSuggestions = await this.generateLandSegmentationSuggestions(
        imageData,
        metadata,
        options
      );

      return {
        landAnalysis,
        segmentationSuggestions
      };
    } catch (error) {
      console.error('Comprehensive land analysis failed:', error);
      throw error;
    }
  }

  /**
   * Process hand-drawn sketches and maps
   */
  public async processSketch(
    imageData: Buffer, 
    metadata?: ImageMetadata, 
    options?: SketchProcessingOptions
  ): Promise<SketchAnalysis> {
    try {
      return await this.sketchProcessingService.processSketch(imageData, metadata, options);
    } catch (error) {
      console.error('Sketch processing failed:', error);
      throw new Error(`Sketch processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate sketch analysis results
   */
  public validateSketchAnalysis(analysis: SketchAnalysis): { valid: boolean; issues: string[] } {
    return this.sketchProcessingService.validateSketchAnalysis(analysis);
  }

  /**
   * Analyze land using sketch input
   */
  public async analyzeLandFromSketch(
    imageData: Buffer,
    metadata?: ImageMetadata,
    options?: SketchProcessingOptions
  ): Promise<{
    sketchAnalysis: SketchAnalysis;
    landRecommendations: string[];
    estimatedMetrics: {
      totalArea?: number;
      cultivableArea?: number;
      zones: Array<{ type: string; area: number; description: string }>;
    };
  }> {
    try {
      // Process the sketch
      const sketchAnalysis = await this.processSketch(imageData, metadata, options);
      
      // Generate land-specific recommendations based on sketch
      const landRecommendations = this.generateLandRecommendationsFromSketch(sketchAnalysis);
      
      // Extract metrics for land planning
      const estimatedMetrics = this.extractLandMetricsFromSketch(sketchAnalysis);
      
      return {
        sketchAnalysis,
        landRecommendations,
        estimatedMetrics
      };
    } catch (error) {
      console.error('Land analysis from sketch failed:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive analysis combining photo and sketch
   */
  public async analyzeWithPhotoAndSketch(
    photoData: Buffer,
    sketchData: Buffer,
    metadata: ImageMetadata,
    sketchOptions?: SketchProcessingOptions
  ): Promise<{
    photoAnalysis: LandAnalysis;
    sketchAnalysis: SketchAnalysis;
    combinedRecommendations: string[];
    consistencyCheck: {
      consistent: boolean;
      discrepancies: string[];
      confidence: number;
    };
  }> {
    try {
      // Analyze both inputs
      const [photoAnalysis, sketchAnalysis] = await Promise.all([
        this.analyzeLandPhoto(photoData, metadata),
        this.processSketch(sketchData, metadata, sketchOptions)
      ]);
      
      // Check consistency between photo and sketch
      const consistencyCheck = this.checkPhotoSketchConsistency(photoAnalysis, sketchAnalysis);
      
      // Generate combined recommendations
      const combinedRecommendations = this.generateCombinedRecommendations(
        photoAnalysis, 
        sketchAnalysis, 
        consistencyCheck
      );
      
      return {
        photoAnalysis,
        sketchAnalysis,
        combinedRecommendations,
        consistencyCheck
      };
    } catch (error) {
      console.error('Combined photo and sketch analysis failed:', error);
      throw error;
    }
  }

  /**
   * Generate land recommendations from sketch analysis
   */
  private generateLandRecommendationsFromSketch(sketchAnalysis: SketchAnalysis): string[] {
    const recommendations: string[] = [];
    
    // Add sketch-specific recommendations
    recommendations.push(...sketchAnalysis.suggestions);
    
    // Analyze zones for recommendations
    const zones = sketchAnalysis.interpretedLayout.zones;
    const cultivationZones = zones.filter(z => z.type === 'cultivation');
    const waterZones = zones.filter(z => z.type === 'water');
    const infrastructureZones = zones.filter(z => z.type === 'infrastructure');
    
    if (cultivationZones.length > 0) {
      const totalCultivationArea = cultivationZones.reduce((sum, z) => sum + z.area, 0);
      if (totalCultivationArea > 5000) {
        recommendations.push('Large cultivation area detected - consider crop diversification');
      } else if (totalCultivationArea < 1000) {
        recommendations.push('Small cultivation area - focus on high-value crops');
      }
    }
    
    if (waterZones.length === 0) {
      recommendations.push('No water sources marked - consider water availability for crop planning');
    } else if (waterZones.length > 1) {
      recommendations.push('Multiple water sources available - good for irrigation planning');
    }
    
    if (infrastructureZones.length > 0) {
      recommendations.push('Existing infrastructure noted - factor into development planning');
    }
    
    // Area-based recommendations
    if (sketchAnalysis.interpretedLayout.totalArea) {
      const totalArea = sketchAnalysis.interpretedLayout.totalArea;
      if (totalArea > 10000) {
        recommendations.push('Large land area - consider mechanized farming and zone-based planning');
      } else if (totalArea < 2000) {
        recommendations.push('Compact land area - intensive farming methods recommended');
      }
    }
    
    return recommendations;
  }

  /**
   * Extract land metrics from sketch analysis
   */
  private extractLandMetricsFromSketch(sketchAnalysis: SketchAnalysis): {
    totalArea?: number;
    cultivableArea?: number;
    zones: Array<{ type: string; area: number; description: string }>;
  } {
    const zones = sketchAnalysis.interpretedLayout.zones;
    const cultivableZones = zones.filter(z => z.type === 'cultivation');
    const cultivableArea = cultivableZones.reduce((sum, z) => sum + z.area, 0);
    
    return {
      totalArea: sketchAnalysis.interpretedLayout.totalArea,
      cultivableArea: cultivableArea > 0 ? cultivableArea : undefined,
      zones: zones
    };
  }

  /**
   * Check consistency between photo and sketch analysis
   */
  private checkPhotoSketchConsistency(
    photoAnalysis: LandAnalysis,
    sketchAnalysis: SketchAnalysis
  ): { consistent: boolean; discrepancies: string[]; confidence: number } {
    const discrepancies: string[] = [];
    
    // Compare areas if both are available
    if (photoAnalysis.estimatedArea.totalArea && sketchAnalysis.interpretedLayout.totalArea) {
      const photoArea = photoAnalysis.estimatedArea.totalArea;
      const sketchArea = sketchAnalysis.interpretedLayout.totalArea;
      const areaDifference = Math.abs(photoArea - sketchArea) / Math.max(photoArea, sketchArea);
      
      if (areaDifference > 0.5) {
        discrepancies.push(`Significant area difference: Photo ${photoArea.toFixed(0)}m² vs Sketch ${sketchArea.toFixed(0)}m²`);
      }
    }
    
    // Compare water sources
    const photoWaterSources = photoAnalysis.terrainType ? 1 : 0; // Simplified
    const sketchWaterSources = sketchAnalysis.elements.filter(e => e.type === 'water_source').length;
    
    if (Math.abs(photoWaterSources - sketchWaterSources) > 1) {
      discrepancies.push(`Water source count mismatch: Photo ${photoWaterSources} vs Sketch ${sketchWaterSources}`);
    }
    
    // Compare terrain characteristics
    const photoTerrain = photoAnalysis.terrainType?.primary || 'unknown';
    const sketchHasComplexTerrain = sketchAnalysis.elements.length > 3;
    
    if (photoTerrain === 'hilly' && !sketchHasComplexTerrain) {
      discrepancies.push('Photo shows hilly terrain but sketch appears simple');
    }
    
    // Calculate consistency confidence
    const maxDiscrepancies = 5;
    const consistencyScore = Math.max(0, (maxDiscrepancies - discrepancies.length) / maxDiscrepancies);
    const overallConfidence = (photoAnalysis.confidence + sketchAnalysis.confidence) / 2;
    const confidence = (consistencyScore + overallConfidence) / 2;
    
    return {
      consistent: discrepancies.length <= 1,
      discrepancies,
      confidence
    };
  }

  /**
   * Generate combined recommendations from photo and sketch analysis
   */
  private generateCombinedRecommendations(
    photoAnalysis: LandAnalysis,
    sketchAnalysis: SketchAnalysis,
    consistencyCheck: { consistent: boolean; discrepancies: string[]; confidence: number }
  ): string[] {
    const recommendations: string[] = [];
    
    if (consistencyCheck.consistent) {
      recommendations.push('Photo and sketch analysis are consistent - high confidence in recommendations');
    } else {
      recommendations.push('Some discrepancies found between photo and sketch - verify key details');
      recommendations.push(...consistencyCheck.discrepancies.map(d => `Discrepancy: ${d}`));
    }
    
    // Combine unique recommendations from both analyses
    const photoRecs = photoAnalysis.recommendations || [];
    const sketchRecs = this.generateLandRecommendationsFromSketch(sketchAnalysis);
    const allRecs = [...photoRecs, ...sketchRecs];
    const uniqueRecs = [...new Set(allRecs)];
    
    recommendations.push(...uniqueRecs);
    
    // Add confidence-based recommendations
    if (consistencyCheck.confidence > 0.8) {
      recommendations.push('High confidence analysis - proceed with detailed planning');
    } else if (consistencyCheck.confidence > 0.6) {
      recommendations.push('Moderate confidence - consider additional verification');
    } else {
      recommendations.push('Low confidence - recommend site visit or additional documentation');
    }
    
    return recommendations;
  }

  /**
   * Extract soil visual indicators from image
   */
  private extractSoilIndicators(imageData: Buffer) {
    // Simplified soil indicator extraction
    return [
      {
        type: 'color' as const,
        value: 'dark_brown',
        confidence: 0.7,
        implications: ['good_organic_content', 'fertile_soil']
      },
      {
        type: 'texture' as const,
        value: 'loamy',
        confidence: 0.6,
        implications: ['good_water_retention', 'suitable_for_most_crops']
      }
    ];
  }

  /**
   * Analyze vegetation cover
   */
  private analyzeVegetation(imageData: Buffer) {
    // Simplified vegetation analysis
    return {
      coveragePercentage: 45,
      vegetationType: 'mixed' as const,
      healthScore: 0.7,
      seasonalIndicators: ['growing_season', 'adequate_moisture']
    };
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(
    areaEstimate: AreaEstimate,
    terrainClassification: TerrainClassification,
    qualityAssessment: QualityAssessment
  ): string[] {
    const recommendations: string[] = [];

    // Get area-specific recommendations
    const areaRecommendations = this.getAreaEstimationRecommendations(areaEstimate);
    recommendations.push(...areaRecommendations);

    // Get terrain-specific recommendations
    const terrainRecommendations = this.getTerrainRecommendations(terrainClassification);
    recommendations.push(...terrainRecommendations);

    // Area-based recommendations
    if (areaEstimate.totalArea > 10000) {
      recommendations.push('Consider crop diversification across different zones');
      recommendations.push('Implement mechanized farming for better efficiency');
    } else if (areaEstimate.totalArea < 2000) {
      recommendations.push('Focus on high-value crops for maximum returns');
      recommendations.push('Consider intensive farming methods');
    }

    // Quality-based recommendations
    if (qualityAssessment.overallScore < 0.7) {
      recommendations.push('Retake photos in better lighting for more accurate analysis');
    }

    // Remove duplicates
    return [...new Set(recommendations)];
  }

  /**
   * Calculate overall confidence score
   */
  private calculateOverallConfidence(
    qualityAssessment: QualityAssessment,
    areaEstimate: AreaEstimate,
    terrainClassification: TerrainClassification
  ): number {
    const qualityWeight = 0.4;
    const areaWeight = 0.3;
    const terrainWeight = 0.3;

    const terrainConfidence = 0.7; // Default terrain classification confidence

    return (
      qualityAssessment.overallScore * qualityWeight +
      areaEstimate.confidence * areaWeight +
      terrainConfidence * terrainWeight
    );
  }

  /**
   * Get sketch processing recommendations
   */
  public getSketchProcessingRecommendations(analysis: SketchAnalysis): string[] {
    return this.sketchProcessingService.getSketchProcessingRecommendations(analysis);
  }
}

export default VisualAnalysisService;