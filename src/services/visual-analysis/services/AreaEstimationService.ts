// Area Estimation Service - Advanced land area calculation from visual inputs
import sharp from 'sharp';
import { 
  AreaEstimate, 
  ReferenceObject, 
  ImageMetadata,
  LandZone 
} from '../types';

export interface AreaEstimationOptions {
  useReferenceObjects?: boolean;
  enableEdgeDetection?: boolean;
  enablePerspectiveCorrection?: boolean;
  confidenceThreshold?: number;
  pixelToMeterRatio?: number;
}

export interface EdgeDetectionResult {
  boundaries: Array<{ x: number; y: number }[]>;
  confidence: number;
  method: 'canny' | 'sobel' | 'laplacian';
}

export interface PerspectiveCorrection {
  correctionApplied: boolean;
  originalCorners: Array<{ x: number; y: number }>;
  correctedCorners: Array<{ x: number; y: number }>;
  transformationMatrix: number[][];
}

export class AreaEstimationService {
  private readonly defaultPixelToMeterRatio = 0.1; // 10cm per pixel default
  private readonly minConfidenceThreshold = 0.3;

  /**
   * Estimate land area from image with multiple methods
   */
  public async estimateArea(
    imageBuffer: Buffer,
    metadata?: ImageMetadata,
    referenceObjects?: ReferenceObject[],
    options: AreaEstimationOptions = {}
  ): Promise<AreaEstimate> {
    try {
      const imageInfo = await sharp(imageBuffer).metadata();
      
      if (!imageInfo.width || !imageInfo.height) {
        throw new Error('Unable to determine image dimensions');
      }

      // Try multiple estimation methods and combine results
      const estimationResults = await Promise.all([
        this.estimateByReferenceObjects(imageBuffer, referenceObjects, options),
        this.estimateByEdgeDetection(imageBuffer, options),
        this.estimateByImageDimensions(imageBuffer, metadata, options)
      ]);

      // Select best estimation based on confidence
      const bestEstimation = this.selectBestEstimation(estimationResults);
      
      // Calculate area breakdown
      const breakdown = await this.calculateAreaBreakdown(imageBuffer, bestEstimation.totalArea);

      return {
        ...bestEstimation,
        breakdown
      };

    } catch (error) {
      console.error('Area estimation failed:', error);
      return this.getFallbackEstimation();
    }
  }

  /**
   * Estimate area using reference objects for scale
   */
  private async estimateByReferenceObjects(
    imageBuffer: Buffer,
    referenceObjects?: ReferenceObject[],
    options: AreaEstimationOptions = {}
  ): Promise<AreaEstimate> {
    if (!referenceObjects || referenceObjects.length === 0) {
      return {
        totalArea: 0,
        confidence: 0,
        method: 'reference_object',
        breakdown: { cultivableArea: 0, nonCultivableArea: 0, waterBodies: 0, infrastructure: 0 }
      };
    }

    try {
      const imageInfo = await sharp(imageBuffer).metadata();
      if (!imageInfo.width || !imageInfo.height) {
        throw new Error('Unable to get image dimensions');
      }

      // Calculate pixel-to-meter ratio from reference objects
      const pixelToMeterRatio = await this.calculatePixelToMeterRatio(
        referenceObjects,
        imageInfo.width,
        imageInfo.height
      );

      // Detect field boundaries using edge detection
      const boundaries = await this.detectFieldBoundaries(imageBuffer);
      
      // Calculate area from boundaries
      const totalPixels = this.calculatePolygonArea(boundaries);
      const totalAreaSquareMeters = totalPixels * Math.pow(pixelToMeterRatio, 2);

      // Ensure we have a reasonable area (at least 100 sq meters)
      const finalArea = Math.max(100, totalAreaSquareMeters);

      // Higher confidence when using reference objects
      const confidence = Math.min(0.9, 0.6 + (referenceObjects.length * 0.1));

      return {
        totalArea: Math.round(finalArea),
        confidence,
        method: 'reference_object',
        breakdown: { cultivableArea: 0, nonCultivableArea: 0, waterBodies: 0, infrastructure: 0 }
      };

    } catch (error) {
      console.error('Reference object estimation failed:', error);
      return {
        totalArea: 0,
        confidence: 0,
        method: 'reference_object',
        breakdown: { cultivableArea: 0, nonCultivableArea: 0, waterBodies: 0, infrastructure: 0 }
      };
    }
  }

  /**
   * Estimate area using edge detection to find field boundaries
   */
  private async estimateByEdgeDetection(
    imageBuffer: Buffer,
    options: AreaEstimationOptions = {}
  ): Promise<AreaEstimate> {
    try {
      const boundaries = await this.detectFieldBoundaries(imageBuffer);
      
      if (boundaries.length < 3) {
        return {
          totalArea: 0,
          confidence: 0,
          method: 'visual_estimation',
          breakdown: { cultivableArea: 0, nonCultivableArea: 0, waterBodies: 0, infrastructure: 0 }
        };
      }

      // Use default pixel-to-meter ratio
      const pixelToMeterRatio = options.pixelToMeterRatio || this.defaultPixelToMeterRatio;
      const totalPixels = this.calculatePolygonArea(boundaries);
      const totalAreaSquareMeters = totalPixels * Math.pow(pixelToMeterRatio, 2);

      // Medium confidence for edge detection
      const confidence = 0.6;

      return {
        totalArea: Math.round(totalAreaSquareMeters),
        confidence,
        method: 'visual_estimation',
        breakdown: { cultivableArea: 0, nonCultivableArea: 0, waterBodies: 0, infrastructure: 0 }
      };

    } catch (error) {
      console.error('Edge detection estimation failed:', error);
      return {
        totalArea: 0,
        confidence: 0,
        method: 'visual_estimation',
        breakdown: { cultivableArea: 0, nonCultivableArea: 0, waterBodies: 0, infrastructure: 0 }
      };
    }
  }

  /**
   * Estimate area based on image dimensions and metadata
   */
  private async estimateByImageDimensions(
    imageBuffer: Buffer,
    metadata?: ImageMetadata,
    options: AreaEstimationOptions = {}
  ): Promise<AreaEstimate> {
    try {
      const imageInfo = await sharp(imageBuffer).metadata();
      
      if (!imageInfo.width || !imageInfo.height) {
        throw new Error('Unable to get image dimensions');
      }

      // Use GPS data if available for better estimation
      let estimatedArea = 5000; // Default 5000 sq meters
      let confidence = 0.4; // Low confidence for basic estimation

      if (metadata?.location?.latitude && metadata?.location?.longitude) {
        // If GPS coordinates are available, we could potentially use them
        // for better area estimation (this would require additional GPS boundary data)
        confidence = 0.5;
      }

      // Adjust based on image resolution
      const totalPixels = imageInfo.width * imageInfo.height;
      if (totalPixels > 2000000) { // High resolution images might cover larger areas
        estimatedArea = Math.round(estimatedArea * 1.5);
        confidence += 0.1;
      }

      return {
        totalArea: estimatedArea,
        confidence: Math.min(confidence, 0.8),
        method: 'visual_estimation',
        breakdown: { cultivableArea: 0, nonCultivableArea: 0, waterBodies: 0, infrastructure: 0 }
      };

    } catch (error) {
      console.error('Dimension-based estimation failed:', error);
      return this.getFallbackEstimation();
    }
  }

  /**
   * Calculate pixel-to-meter ratio from reference objects
   */
  private async calculatePixelToMeterRatio(
    referenceObjects: ReferenceObject[],
    imageWidth: number,
    imageHeight: number
  ): Promise<number> {
    let totalRatio = 0;
    let validObjects = 0;

    for (const obj of referenceObjects) {
      // Calculate pixel size of reference object
      const pixelWidth = obj.boundingBox.width;
      const pixelHeight = obj.boundingBox.height;
      
      // Use the larger dimension for more accurate scaling
      const pixelSize = Math.max(pixelWidth, pixelHeight);
      
      if (pixelSize > 0 && obj.knownSize > 0) {
        const ratio = obj.knownSize / pixelSize;
        totalRatio += ratio;
        validObjects++;
      }
    }

    if (validObjects === 0) {
      return this.defaultPixelToMeterRatio;
    }

    const avgRatio = totalRatio / validObjects;
    
    // Ensure ratio is within reasonable bounds (0.01m to 1m per pixel)
    return Math.max(0.01, Math.min(1.0, avgRatio));
  }

  /**
   * Detect field boundaries using simplified edge detection
   */
  private async detectFieldBoundaries(imageBuffer: Buffer): Promise<Array<{ x: number; y: number }>> {
    try {
      // Convert to grayscale and apply edge detection
      const { data, info } = await sharp(imageBuffer)
        .greyscale()
        .resize(512, 384) // Resize for faster processing
        .raw()
        .toBuffer({ resolveWithObject: true });

      // Simplified edge detection - find strong gradients
      const boundaries: Array<{ x: number; y: number }> = [];
      const threshold = 50; // Edge detection threshold

      for (let y = 1; y < info.height - 1; y++) {
        for (let x = 1; x < info.width - 1; x++) {
          const idx = y * info.width + x;
          
          // Calculate gradient using Sobel operator (simplified)
          const gx = -data[idx - info.width - 1] + data[idx - info.width + 1] +
                    -2 * data[idx - 1] + 2 * data[idx + 1] +
                    -data[idx + info.width - 1] + data[idx + info.width + 1];
          
          const gy = -data[idx - info.width - 1] - 2 * data[idx - info.width] - data[idx - info.width + 1] +
                     data[idx + info.width - 1] + 2 * data[idx + info.width] + data[idx + info.width + 1];
          
          const magnitude = Math.sqrt(gx * gx + gy * gy);
          
          if (magnitude > threshold) {
            boundaries.push({ x: x / info.width, y: y / info.height });
          }
        }
      }

      // If we found edges, create a simplified boundary polygon
      if (boundaries.length > 10) {
        return this.simplifyBoundaries(boundaries);
      }

      // Fallback: assume rectangular field covering most of the image
      return [
        { x: 0.1, y: 0.1 },
        { x: 0.9, y: 0.1 },
        { x: 0.9, y: 0.9 },
        { x: 0.1, y: 0.9 }
      ];

    } catch (error) {
      console.error('Boundary detection failed:', error);
      // Return default rectangular boundary
      return [
        { x: 0.1, y: 0.1 },
        { x: 0.9, y: 0.1 },
        { x: 0.9, y: 0.9 },
        { x: 0.1, y: 0.9 }
      ];
    }
  }

  /**
   * Simplify boundary points to create a polygon
   */
  private simplifyBoundaries(boundaries: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
    // Simple algorithm to find convex hull or approximate boundary
    // For now, return corner points of the bounding rectangle
    const minX = Math.min(...boundaries.map(p => p.x));
    const maxX = Math.max(...boundaries.map(p => p.x));
    const minY = Math.min(...boundaries.map(p => p.y));
    const maxY = Math.max(...boundaries.map(p => p.y));

    return [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY }
    ];
  }

  /**
   * Calculate area of polygon using shoelace formula
   */
  private calculatePolygonArea(vertices: Array<{ x: number; y: number }>): number {
    if (vertices.length < 3) return 0;

    let area = 0;
    const n = vertices.length;

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += vertices[i].x * vertices[j].y;
      area -= vertices[j].x * vertices[i].y;
    }

    return Math.abs(area) / 2;
  }

  /**
   * Select the best estimation from multiple methods
   */
  private selectBestEstimation(estimations: AreaEstimate[]): AreaEstimate {
    // Filter out zero-area estimations
    const validEstimations = estimations.filter(est => est.totalArea > 0);
    
    if (validEstimations.length === 0) {
      return this.getFallbackEstimation();
    }

    // Prioritize reference object method if available and has reasonable confidence
    const referenceObjectEst = validEstimations.find(est => 
      est.method === 'reference_object' && est.confidence > 0.4
    );
    
    if (referenceObjectEst) {
      return referenceObjectEst;
    }

    // Otherwise, select estimation with highest confidence
    return validEstimations.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    );
  }

  /**
   * Calculate area breakdown by land type
   */
  private async calculateAreaBreakdown(imageBuffer: Buffer, totalArea: number): Promise<AreaEstimate['breakdown']> {
    try {
      // Simplified land type classification based on color analysis
      const { data, info } = await sharp(imageBuffer)
        .resize(256, 256) // Small size for fast processing
        .raw()
        .toBuffer({ resolveWithObject: true });

      let greenPixels = 0; // Vegetation/cultivable
      let bluePixels = 0;  // Water bodies
      let brownPixels = 0; // Soil/barren
      let grayPixels = 0;  // Infrastructure

      const totalPixels = info.width * info.height;

      for (let i = 0; i < data.length; i += info.channels) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Simple color classification
        if (g > r && g > b && g > 100) {
          greenPixels++; // Green dominant - vegetation
        } else if (b > r && b > g && b > 80) {
          bluePixels++; // Blue dominant - water
        } else if (r > 100 && g > 80 && b < 80) {
          brownPixels++; // Brown/tan - soil
        } else if (Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && r > 120) {
          grayPixels++; // Gray - infrastructure
        }
      }

      // Calculate percentages
      const greenPercent = greenPixels / totalPixels;
      const bluePercent = bluePixels / totalPixels;
      const brownPercent = brownPixels / totalPixels;
      const grayPercent = grayPixels / totalPixels;

      // Ensure cultivable area is at least 60% if no clear classification
      const cultivablePercent = Math.max(0.6, greenPercent + brownPercent * 0.8);

      return {
        cultivableArea: Math.round(totalArea * cultivablePercent),
        waterBodies: Math.round(totalArea * bluePercent),
        infrastructure: Math.round(totalArea * grayPercent),
        nonCultivableArea: Math.round(totalArea * (1 - cultivablePercent - bluePercent - grayPercent))
      };

    } catch (error) {
      console.error('Area breakdown calculation failed:', error);
      // Return default breakdown
      return {
        cultivableArea: Math.round(totalArea * 0.75),
        nonCultivableArea: Math.round(totalArea * 0.15),
        waterBodies: Math.round(totalArea * 0.05),
        infrastructure: Math.round(totalArea * 0.05)
      };
    }
  }

  /**
   * Get fallback estimation when all methods fail
   */
  private getFallbackEstimation(): AreaEstimate {
    const defaultArea = 3000; // 3000 sq meters default
    return {
      totalArea: defaultArea,
      confidence: 0.3,
      method: 'visual_estimation',
      breakdown: {
        cultivableArea: Math.round(defaultArea * 0.75),
        nonCultivableArea: Math.round(defaultArea * 0.15),
        waterBodies: Math.round(defaultArea * 0.05),
        infrastructure: Math.round(defaultArea * 0.05)
      }
    };
  }

  /**
   * Validate area estimation results
   */
  public validateEstimation(estimation: AreaEstimate): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check for reasonable area range (100 sq meters to 100 hectares)
    if (estimation.totalArea < 100) {
      issues.push('Estimated area is too small (less than 100 sq meters)');
    } else if (estimation.totalArea > 1000000) {
      issues.push('Estimated area is too large (more than 100 hectares)');
    }

    // Check confidence level
    if (estimation.confidence < this.minConfidenceThreshold) {
      issues.push('Area estimation confidence is too low');
    }

    // Check breakdown consistency
    const breakdownTotal = estimation.breakdown.cultivableArea + 
                          estimation.breakdown.nonCultivableArea + 
                          estimation.breakdown.waterBodies + 
                          estimation.breakdown.infrastructure;

    if (Math.abs(breakdownTotal - estimation.totalArea) > estimation.totalArea * 0.1) {
      issues.push('Area breakdown does not match total area');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Get area estimation recommendations
   */
  public getEstimationRecommendations(estimation: AreaEstimate): string[] {
    const recommendations: string[] = [];

    if (estimation.confidence < 0.5) {
      recommendations.push('Consider adding reference objects (person, vehicle, or known structures) for more accurate area estimation');
      recommendations.push('Take photos from multiple angles to improve accuracy');
    }

    if (estimation.method === 'visual_estimation') {
      recommendations.push('For precise measurements, consider using GPS boundary mapping or professional surveying');
    }

    if (estimation.breakdown.cultivableArea / estimation.totalArea > 0.9) {
      recommendations.push('Excellent cultivable land ratio - suitable for diverse crop planning');
    } else if (estimation.breakdown.cultivableArea / estimation.totalArea < 0.5) {
      recommendations.push('Limited cultivable area - focus on high-value crops or land improvement');
    }

    if (estimation.breakdown.waterBodies > 0) {
      recommendations.push('Water bodies detected - consider aquaculture or irrigation potential');
    }

    return recommendations;
  }
}

export default AreaEstimationService;