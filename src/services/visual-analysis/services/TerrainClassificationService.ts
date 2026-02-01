// Terrain Classification Service - Advanced terrain analysis and zone identification
import sharp from 'sharp';
import { 
  TerrainClassification, 
  TerrainType, 
  LandZone, 
  ImageMetadata 
} from '../types';

export interface TerrainAnalysisOptions {
  enableSlopeAnalysis?: boolean;
  enableDrainageAnalysis?: boolean;
  enableVegetationAnalysis?: boolean;
  enableWaterDetection?: boolean;
  enableInfrastructureDetection?: boolean;
  zoneMinSize?: number; // Minimum zone size in pixels
  confidenceThreshold?: number;
}

export interface ColorAnalysisResult {
  dominantColors: Array<{
    color: { r: number; g: number; b: number };
    percentage: number;
    landType: 'vegetation' | 'soil' | 'water' | 'infrastructure' | 'rock' | 'sand';
  }>;
  colorDistribution: {
    vegetation: number;
    soil: number;
    water: number;
    infrastructure: number;
    rock: number;
    sand: number;
  };
}

export interface TextureAnalysisResult {
  roughness: number; // 0-1, higher = more rough/textured
  uniformity: number; // 0-1, higher = more uniform
  patterns: Array<{
    type: 'linear' | 'circular' | 'grid' | 'random';
    strength: number;
    direction?: number; // in degrees
  }>;
}

export interface SlopeAnalysisResult {
  averageSlope: number; // in degrees
  slopeVariation: number; // standard deviation
  slopeMap: number[][]; // 2D array of slope values
  drainageDirection: 'north' | 'south' | 'east' | 'west' | 'northeast' | 'northwest' | 'southeast' | 'southwest' | 'flat';
}

export class TerrainClassificationService {
  private readonly defaultOptions: TerrainAnalysisOptions = {
    enableSlopeAnalysis: true,
    enableDrainageAnalysis: true,
    enableVegetationAnalysis: true,
    enableWaterDetection: true,
    enableInfrastructureDetection: true,
    zoneMinSize: 100, // 100 pixels minimum
    confidenceThreshold: 0.6
  };

  /**
   * Classify terrain and identify zones from image
   */
  public async classifyTerrain(
    imageBuffer: Buffer,
    metadata?: ImageMetadata,
    options: TerrainAnalysisOptions = {}
  ): Promise<TerrainClassification> {
    const opts = { ...this.defaultOptions, ...options };

    try {
      const imageInfo = await sharp(imageBuffer).metadata();
      
      if (!imageInfo.width || !imageInfo.height) {
        throw new Error('Unable to determine image dimensions');
      }

      // Perform various analyses
      const [colorAnalysis, textureAnalysis, slopeAnalysis] = await Promise.all([
        this.analyzeColors(imageBuffer),
        this.analyzeTexture(imageBuffer),
        opts.enableSlopeAnalysis ? this.analyzeSlopeAndDrainage(imageBuffer) : null
      ]);

      // Classify overall terrain type
      const terrainType = this.classifyTerrainType(colorAnalysis, textureAnalysis, slopeAnalysis);

      // Identify distinct zones
      const zones = await this.identifyZones(imageBuffer, colorAnalysis, textureAnalysis, opts);

      // Detect water sources
      const waterSources = opts.enableWaterDetection ? 
        await this.detectWaterSources(imageBuffer, colorAnalysis) : [];

      // Detect infrastructure
      const infrastructure = opts.enableInfrastructureDetection ? 
        await this.detectInfrastructure(imageBuffer, colorAnalysis, textureAnalysis) : [];

      return {
        terrainType,
        zones,
        waterSources,
        infrastructure
      };

    } catch (error) {
      console.error('Terrain classification failed:', error);
      return this.getFallbackClassification();
    }
  }

  /**
   * Analyze color distribution in the image
   */
  private async analyzeColors(imageBuffer: Buffer): Promise<ColorAnalysisResult> {
    try {
      const { data, info } = await sharp(imageBuffer)
        .resize(256, 256) // Resize for faster processing
        .raw()
        .toBuffer({ resolveWithObject: true });

      const colorCounts = new Map<string, number>();
      const totalPixels = info.width * info.height;

      // Count color occurrences
      for (let i = 0; i < data.length; i += info.channels) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Quantize colors to reduce noise
        const quantizedR = Math.floor(r / 32) * 32;
        const quantizedG = Math.floor(g / 32) * 32;
        const quantizedB = Math.floor(b / 32) * 32;
        
        const colorKey = `${quantizedR},${quantizedG},${quantizedB}`;
        colorCounts.set(colorKey, (colorCounts.get(colorKey) || 0) + 1);
      }

      // Classify colors and calculate distribution
      let vegetationPixels = 0;
      let soilPixels = 0;
      let waterPixels = 0;
      let infrastructurePixels = 0;
      let rockPixels = 0;
      let sandPixels = 0;

      const dominantColors: ColorAnalysisResult['dominantColors'] = [];

      for (const [colorKey, count] of colorCounts.entries()) {
        const [r, g, b] = colorKey.split(',').map(Number);
        const percentage = count / totalPixels;

        if (percentage > 0.01) { // Only consider colors that make up more than 1%
          const landType = this.classifyColorToLandType(r, g, b);
          dominantColors.push({
            color: { r, g, b },
            percentage,
            landType
          });

          // Update distribution counters
          switch (landType) {
            case 'vegetation': vegetationPixels += count; break;
            case 'soil': soilPixels += count; break;
            case 'water': waterPixels += count; break;
            case 'infrastructure': infrastructurePixels += count; break;
            case 'rock': rockPixels += count; break;
            case 'sand': sandPixels += count; break;
          }
        }
      }

      // Sort by percentage
      dominantColors.sort((a, b) => b.percentage - a.percentage);

      return {
        dominantColors: dominantColors.slice(0, 10), // Top 10 colors
        colorDistribution: {
          vegetation: vegetationPixels / totalPixels,
          soil: soilPixels / totalPixels,
          water: waterPixels / totalPixels,
          infrastructure: infrastructurePixels / totalPixels,
          rock: rockPixels / totalPixels,
          sand: sandPixels / totalPixels
        }
      };

    } catch (error) {
      console.error('Color analysis failed:', error);
      return this.getFallbackColorAnalysis();
    }
  }

  /**
   * Classify RGB color to land type
   */
  private classifyColorToLandType(r: number, g: number, b: number): ColorAnalysisResult['dominantColors'][0]['landType'] {
    // Green dominant - vegetation
    if (g > r && g > b && g > 80) {
      return 'vegetation';
    }
    
    // Blue dominant - water
    if (b > r && b > g && b > 60) {
      return 'water';
    }
    
    // Brown/tan - soil
    if (r > 80 && g > 60 && b < 80 && r > b) {
      return 'soil';
    }
    
    // Gray - infrastructure/concrete
    if (Math.abs(r - g) < 30 && Math.abs(g - b) < 30 && r > 100) {
      return 'infrastructure';
    }
    
    // Light colors - sand
    if (r > 150 && g > 140 && b > 100 && r + g + b > 450) {
      return 'sand';
    }
    
    // Dark colors - rock
    if (r < 80 && g < 80 && b < 80) {
      return 'rock';
    }
    
    // Default to soil
    return 'soil';
  }

  /**
   * Analyze texture patterns in the image
   */
  private async analyzeTexture(imageBuffer: Buffer): Promise<TextureAnalysisResult> {
    try {
      const { data, info } = await sharp(imageBuffer)
        .greyscale()
        .resize(128, 128) // Smaller size for texture analysis
        .raw()
        .toBuffer({ resolveWithObject: true });

      // Calculate texture metrics using Local Binary Pattern-like approach
      let roughnessSum = 0;
      let uniformitySum = 0;
      let validPixels = 0;

      for (let y = 1; y < info.height - 1; y++) {
        for (let x = 1; x < info.width - 1; x++) {
          const centerIdx = y * info.width + x;
          const centerValue = data[centerIdx];

          // Calculate local variation (roughness)
          let variation = 0;
          const neighbors = [
            data[(y-1) * info.width + (x-1)], // top-left
            data[(y-1) * info.width + x],     // top
            data[(y-1) * info.width + (x+1)], // top-right
            data[y * info.width + (x+1)],     // right
            data[(y+1) * info.width + (x+1)], // bottom-right
            data[(y+1) * info.width + x],     // bottom
            data[(y+1) * info.width + (x-1)], // bottom-left
            data[y * info.width + (x-1)]      // left
          ];

          for (const neighbor of neighbors) {
            variation += Math.abs(neighbor - centerValue);
          }

          roughnessSum += variation / 8; // Average variation
          uniformitySum += 255 - variation / 8; // Inverse of variation
          validPixels++;
        }
      }

      const roughness = Math.min(1, roughnessSum / validPixels / 255);
      const uniformity = Math.min(1, uniformitySum / validPixels / 255);

      // Detect basic patterns (simplified)
      const patterns = this.detectBasicPatterns(data, info.width, info.height);

      return {
        roughness,
        uniformity,
        patterns
      };

    } catch (error) {
      console.error('Texture analysis failed:', error);
      return {
        roughness: 0.5,
        uniformity: 0.5,
        patterns: []
      };
    }
  }

  /**
   * Detect basic patterns in the image
   */
  private detectBasicPatterns(data: Buffer, width: number, height: number): TextureAnalysisResult['patterns'] {
    const patterns: TextureAnalysisResult['patterns'] = [];

    // Simple pattern detection using edge analysis
    let horizontalEdges = 0;
    let verticalEdges = 0;
    let totalEdges = 0;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        
        // Horizontal gradient
        const hGrad = Math.abs(data[idx - 1] - data[idx + 1]);
        // Vertical gradient
        const vGrad = Math.abs(data[idx - width] - data[idx + width]);

        if (hGrad > 30) horizontalEdges++;
        if (vGrad > 30) verticalEdges++;
        if (hGrad > 30 || vGrad > 30) totalEdges++;
      }
    }

    if (totalEdges > 0) {
      const hRatio = horizontalEdges / totalEdges;
      const vRatio = verticalEdges / totalEdges;

      if (hRatio > 0.6) {
        patterns.push({ type: 'linear', strength: hRatio, direction: 0 }); // Horizontal
      }
      if (vRatio > 0.6) {
        patterns.push({ type: 'linear', strength: vRatio, direction: 90 }); // Vertical
      }
      if (hRatio < 0.4 && vRatio < 0.4) {
        patterns.push({ type: 'random', strength: 1 - Math.max(hRatio, vRatio) });
      }
    }

    return patterns;
  }

  /**
   * Analyze slope and drainage patterns
   */
  private async analyzeSlopeAndDrainage(imageBuffer: Buffer): Promise<SlopeAnalysisResult> {
    try {
      const { data, info } = await sharp(imageBuffer)
        .greyscale()
        .resize(64, 64) // Small size for slope analysis
        .raw()
        .toBuffer({ resolveWithObject: true });

      const slopeMap: number[][] = [];
      let totalSlope = 0;
      let slopeCount = 0;
      const slopes: number[] = [];

      // Calculate slope for each pixel using gradient
      for (let y = 1; y < info.height - 1; y++) {
        slopeMap[y] = [];
        for (let x = 1; x < info.width - 1; x++) {
          const idx = y * info.width + x;
          
          // Calculate gradients
          const gx = data[idx + 1] - data[idx - 1];
          const gy = data[idx + info.width] - data[idx - info.width];
          
          // Calculate slope magnitude
          const slope = Math.sqrt(gx * gx + gy * gy) / 255;
          slopeMap[y][x] = slope;
          
          totalSlope += slope;
          slopes.push(slope);
          slopeCount++;
        }
      }

      const averageSlope = totalSlope / slopeCount;
      
      // Calculate slope variation (standard deviation)
      const variance = slopes.reduce((sum, slope) => sum + Math.pow(slope - averageSlope, 2), 0) / slopes.length;
      const slopeVariation = Math.sqrt(variance);

      // Determine drainage direction (simplified)
      const drainageDirection = this.determineDrainageDirection(slopeMap, info.width, info.height);

      return {
        averageSlope: averageSlope * 45, // Convert to approximate degrees
        slopeVariation,
        slopeMap,
        drainageDirection
      };

    } catch (error) {
      console.error('Slope analysis failed:', error);
      return {
        averageSlope: 2,
        slopeVariation: 0.1,
        slopeMap: [],
        drainageDirection: 'flat'
      };
    }
  }

  /**
   * Determine primary drainage direction
   */
  private determineDrainageDirection(slopeMap: number[][], width: number, height: number): SlopeAnalysisResult['drainageDirection'] {
    let northFlow = 0, southFlow = 0, eastFlow = 0, westFlow = 0;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const current = slopeMap[y][x];
        
        // Check flow directions based on slope
        if (y > 0 && slopeMap[y-1][x] > current) northFlow++;
        if (y < height-1 && slopeMap[y+1][x] > current) southFlow++;
        if (x < width-1 && slopeMap[y][x+1] > current) eastFlow++;
        if (x > 0 && slopeMap[y][x-1] > current) westFlow++;
      }
    }

    const maxFlow = Math.max(northFlow, southFlow, eastFlow, westFlow);
    
    if (maxFlow < 10) return 'flat';
    
    if (maxFlow === northFlow) return 'north';
    if (maxFlow === southFlow) return 'south';
    if (maxFlow === eastFlow) return 'east';
    if (maxFlow === westFlow) return 'west';
    
    return 'flat';
  }

  /**
   * Classify overall terrain type based on analyses
   */
  private classifyTerrainType(
    colorAnalysis: ColorAnalysisResult,
    textureAnalysis: TextureAnalysisResult,
    slopeAnalysis: SlopeAnalysisResult | null
  ): TerrainType {
    let primary: TerrainType['primary'] = 'flat';
    let slope = 0;
    let drainage: TerrainType['drainage'] = 'moderate';
    let accessibility: TerrainType['accessibility'] = 'easy';

    // Determine primary terrain type
    if (slopeAnalysis) {
      slope = slopeAnalysis.averageSlope;
      
      if (slope < 2) primary = 'flat';
      else if (slope < 8) primary = 'valley';
      else if (slope < 15) primary = 'hilly';
      else if (slope < 30) primary = 'mountainous';
      else primary = 'mountainous';
    }

    // Determine drainage
    const waterPercentage = colorAnalysis.colorDistribution.water;
    if (waterPercentage > 0.1) {
      drainage = 'poor'; // High water content suggests poor drainage
    } else if (waterPercentage > 0.05) {
      drainage = 'moderate';
    } else if (slope > 5) {
      drainage = 'good'; // Sloped terrain usually drains well
    } else {
      drainage = 'moderate';
    }

    // Determine accessibility
    if (slope < 3 && textureAnalysis.uniformity > 0.6) {
      accessibility = 'easy';
    } else if (slope < 10 && textureAnalysis.roughness < 0.7) {
      accessibility = 'moderate';
    } else {
      accessibility = 'difficult';
    }

    return {
      primary,
      slope,
      drainage,
      accessibility
    };
  }

  /**
   * Identify distinct zones in the land
   */
  private async identifyZones(
    imageBuffer: Buffer,
    colorAnalysis: ColorAnalysisResult,
    textureAnalysis: TextureAnalysisResult,
    options: TerrainAnalysisOptions
  ): Promise<LandZone[]> {
    try {
      const zones: LandZone[] = [];

      // Create zones based on dominant land types
      const { colorDistribution } = colorAnalysis;

      let zoneId = 1;

      // Vegetation zone
      if (colorDistribution.vegetation > 0.2) {
        zones.push({
          id: `zone_${zoneId++}`,
          type: 'cultivable',
          area: colorDistribution.vegetation * 10000, // Assume 1 hectare base
          boundingPolygon: this.generateZonePolygon(0.1, 0.1, 0.8, 0.6),
          characteristics: ['fertile_soil', 'good_vegetation_cover', 'suitable_for_crops'],
          suitability: {
            crops: this.recommendCropsForVegetationZone(colorDistribution.vegetation),
            score: Math.min(0.9, colorDistribution.vegetation * 2),
            limitations: colorDistribution.water > 0.1 ? ['seasonal_flooding_risk'] : []
          }
        });
      }

      // Water zone
      if (colorDistribution.water > 0.03) {
        zones.push({
          id: `zone_${zoneId++}`,
          type: 'water_body',
          area: colorDistribution.water * 10000,
          boundingPolygon: this.generateZonePolygon(0.1, 0.7, 0.4, 0.9),
          characteristics: ['permanent_water', 'irrigation_source'],
          suitability: {
            crops: ['fish_farming', 'lotus', 'water_chestnuts'],
            score: 0.9,
            limitations: []
          }
        });
      }

      // Infrastructure zone
      if (colorDistribution.infrastructure > 0.05) {
        zones.push({
          id: `zone_${zoneId++}`,
          type: 'residential',
          area: colorDistribution.infrastructure * 10000,
          boundingPolygon: this.generateZonePolygon(0.6, 0.1, 0.9, 0.3),
          characteristics: ['built_structures', 'access_roads'],
          suitability: {
            crops: [],
            score: 0.1,
            limitations: ['built_area', 'not_suitable_for_cultivation']
          }
        });
      }

      // Barren/rocky zone
      if (colorDistribution.rock > 0.1 || colorDistribution.sand > 0.1) {
        zones.push({
          id: `zone_${zoneId++}`,
          type: 'barren',
          area: (colorDistribution.rock + colorDistribution.sand) * 10000,
          boundingPolygon: this.generateZonePolygon(0.5, 0.5, 0.9, 0.9),
          characteristics: ['rocky_terrain', 'poor_soil', 'low_fertility'],
          suitability: {
            crops: ['drought_resistant_crops', 'medicinal_plants'],
            score: 0.3,
            limitations: ['poor_soil_quality', 'water_scarcity', 'difficult_cultivation']
          }
        });
      }

      return zones;

    } catch (error) {
      console.error('Zone identification failed:', error);
      return this.getFallbackZones();
    }
  }

  /**
   * Generate polygon coordinates for a zone
   */
  private generateZonePolygon(x1: number, y1: number, x2: number, y2: number): Array<{ x: number; y: number }> {
    return [
      { x: x1, y: y1 },
      { x: x2, y: y1 },
      { x: x2, y: y2 },
      { x: x1, y: y2 }
    ];
  }

  /**
   * Recommend crops for vegetation zone
   */
  private recommendCropsForVegetationZone(vegetationPercentage: number): string[] {
    const crops = ['rice', 'wheat', 'vegetables'];
    
    if (vegetationPercentage > 0.6) {
      crops.push('sugarcane', 'cotton', 'pulses');
    }
    
    if (vegetationPercentage > 0.8) {
      crops.push('fruit_trees', 'cash_crops');
    }
    
    return crops;
  }

  /**
   * Detect water sources in the image
   */
  private async detectWaterSources(
    imageBuffer: Buffer,
    colorAnalysis: ColorAnalysisResult
  ): Promise<TerrainClassification['waterSources']> {
    const waterSources: TerrainClassification['waterSources'] = [];

    if (colorAnalysis.colorDistribution.water > 0.02) {
      // Determine water source type based on distribution and location
      if (colorAnalysis.colorDistribution.water > 0.1) {
        waterSources.push({
          type: 'pond',
          location: { x: 0.3, y: 0.7 },
          accessibility: 'direct'
        });
      } else if (colorAnalysis.colorDistribution.water > 0.05) {
        waterSources.push({
          type: 'well',
          location: { x: 0.5, y: 0.5 },
          accessibility: 'direct'
        });
      } else {
        waterSources.push({
          type: 'canal',
          location: { x: 0.8, y: 0.2 },
          accessibility: 'nearby'
        });
      }
    }

    return waterSources;
  }

  /**
   * Detect infrastructure in the image
   */
  private async detectInfrastructure(
    imageBuffer: Buffer,
    colorAnalysis: ColorAnalysisResult,
    textureAnalysis: TextureAnalysisResult
  ): Promise<TerrainClassification['infrastructure']> {
    const infrastructure: TerrainClassification['infrastructure'] = [];

    // Detect roads based on linear patterns and gray colors
    const hasLinearPatterns = textureAnalysis.patterns.some(p => p.type === 'linear' && p.strength > 0.5);
    const hasInfrastructureColors = colorAnalysis.colorDistribution.infrastructure > 0.03;

    if (hasLinearPatterns && hasInfrastructureColors) {
      infrastructure.push({
        type: 'road',
        condition: 'fair',
        location: { x: 0.0, y: 0.5 }
      });
    }

    // Detect buildings based on infrastructure colors and uniform patterns
    if (colorAnalysis.colorDistribution.infrastructure > 0.08 && textureAnalysis.uniformity > 0.6) {
      infrastructure.push({
        type: 'building',
        condition: 'good',
        location: { x: 0.7, y: 0.2 }
      });
    }

    return infrastructure;
  }

  /**
   * Get fallback classification when analysis fails
   */
  private getFallbackClassification(): TerrainClassification {
    return {
      terrainType: {
        primary: 'flat',
        slope: 2,
        drainage: 'moderate',
        accessibility: 'moderate'
      },
      zones: this.getFallbackZones(),
      waterSources: [],
      infrastructure: []
    };
  }

  /**
   * Get fallback zones
   */
  private getFallbackZones(): LandZone[] {
    return [
      {
        id: 'zone_1',
        type: 'cultivable',
        area: 7500,
        boundingPolygon: [
          { x: 0.1, y: 0.1 },
          { x: 0.9, y: 0.1 },
          { x: 0.9, y: 0.8 },
          { x: 0.1, y: 0.8 }
        ],
        characteristics: ['mixed_terrain', 'moderate_fertility'],
        suitability: {
          crops: ['rice', 'wheat', 'vegetables'],
          score: 0.6,
          limitations: ['requires_soil_testing']
        }
      }
    ];
  }

  /**
   * Get fallback color analysis
   */
  private getFallbackColorAnalysis(): ColorAnalysisResult {
    return {
      dominantColors: [
        { color: { r: 100, g: 150, b: 80 }, percentage: 0.4, landType: 'vegetation' },
        { color: { r: 120, g: 90, b: 60 }, percentage: 0.3, landType: 'soil' },
        { color: { r: 80, g: 100, b: 140 }, percentage: 0.1, landType: 'water' }
      ],
      colorDistribution: {
        vegetation: 0.4,
        soil: 0.3,
        water: 0.1,
        infrastructure: 0.1,
        rock: 0.05,
        sand: 0.05
      }
    };
  }

  /**
   * Get terrain classification recommendations
   */
  public getTerrainRecommendations(classification: TerrainClassification): string[] {
    const recommendations: string[] = [];

    // Terrain-based recommendations
    if (classification.terrainType.slope > 10) {
      recommendations.push('Consider contour farming to prevent soil erosion');
      recommendations.push('Install terracing for steep slopes');
    }

    if (classification.terrainType.drainage === 'poor') {
      recommendations.push('Install drainage systems before monsoon season');
      recommendations.push('Consider crops that tolerate waterlogging');
    } else if (classification.terrainType.drainage === 'excellent') {
      recommendations.push('Implement water conservation measures');
      recommendations.push('Consider drip irrigation systems');
    }

    // Zone-based recommendations
    const cultivableZones = classification.zones.filter(z => z.type === 'cultivable');
    if (cultivableZones.length > 1) {
      recommendations.push('Plan crop rotation across different zones');
      recommendations.push('Consider zone-specific fertilization strategies');
    }

    // Water source recommendations
    if (classification.waterSources.length > 0) {
      recommendations.push('Utilize available water sources for irrigation');
      if (classification.waterSources.some(w => w.type === 'pond')) {
        recommendations.push('Consider fish farming in pond areas');
      }
    } else {
      recommendations.push('Consider rainwater harvesting systems');
      recommendations.push('Explore groundwater potential for irrigation');
    }

    // Infrastructure recommendations
    if (classification.infrastructure.length === 0) {
      recommendations.push('Plan access roads for better connectivity');
    }

    return recommendations;
  }
}

export default TerrainClassificationService;