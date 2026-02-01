// Area Estimation Service Tests
import AreaEstimationService from '../../services/visual-analysis/services/AreaEstimationService';
import { ReferenceObject, ImageMetadata } from '../../services/visual-analysis/types';

// Mock sharp for testing
jest.mock('sharp', () => {
  return jest.fn().mockImplementation((buffer: Buffer) => {
    const isValidImage = buffer.toString().includes('mock-image-data');
    
    if (!isValidImage) {
      throw new Error('Invalid image file');
    }

    return {
      metadata: jest.fn().mockResolvedValue({
        width: 1024,
        height: 768,
        format: 'jpeg',
        channels: 3
      }),
      resize: jest.fn().mockReturnThis(),
      greyscale: jest.fn().mockReturnThis(),
      raw: jest.fn().mockReturnThis(),
      toBuffer: jest.fn().mockImplementation((options?: any) => {
        // Mock image data for color analysis
        const mockData = Buffer.alloc(256 * 256 * 3);
        
        // Fill with different colors to simulate land types
        for (let i = 0; i < mockData.length; i += 3) {
          if (i < mockData.length * 0.6) {
            // Green pixels (vegetation)
            mockData[i] = 50;     // R
            mockData[i + 1] = 150; // G
            mockData[i + 2] = 50;  // B
          } else if (i < mockData.length * 0.7) {
            // Blue pixels (water)
            mockData[i] = 30;     // R
            mockData[i + 1] = 50; // G
            mockData[i + 2] = 120; // B
          } else if (i < mockData.length * 0.85) {
            // Brown pixels (soil)
            mockData[i] = 120;    // R
            mockData[i + 1] = 90; // G
            mockData[i + 2] = 60; // B
          } else {
            // Gray pixels (infrastructure)
            mockData[i] = 130;     // R
            mockData[i + 1] = 130; // G
            mockData[i + 2] = 130; // B
          }
        }

        if (options?.resolveWithObject) {
          return Promise.resolve({
            data: mockData,
            info: { width: 256, height: 256, channels: 3 }
          });
        }
        return Promise.resolve(mockData);
      })
    };
  });
});

describe('Area Estimation Service', () => {
  let areaEstimationService: AreaEstimationService;
  let mockImageBuffer: Buffer;
  let mockMetadata: ImageMetadata;

  beforeEach(() => {
    areaEstimationService = new AreaEstimationService();
    mockImageBuffer = Buffer.from('mock-image-data');
    mockMetadata = {
      filename: 'test-land.jpg',
      size: mockImageBuffer.length,
      mimeType: 'image/jpeg',
      uploadedAt: new Date(),
      farmerId: 'farmer123',
      location: {
        latitude: 12.9716,
        longitude: 77.5946
      }
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Area Estimation', () => {
    test('should estimate area without reference objects', async () => {
      const result = await areaEstimationService.estimateArea(mockImageBuffer);
      
      expect(result).toBeDefined();
      expect(result.totalArea).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(['reference_object', 'visual_estimation', 'gps_boundary']).toContain(result.method);
      expect(result.breakdown).toBeDefined();
      expect(result.breakdown.cultivableArea).toBeGreaterThanOrEqual(0);
      expect(result.breakdown.nonCultivableArea).toBeGreaterThanOrEqual(0);
      expect(result.breakdown.waterBodies).toBeGreaterThanOrEqual(0);
      expect(result.breakdown.infrastructure).toBeGreaterThanOrEqual(0);
    });

    test('should estimate area with reference objects', async () => {
      const referenceObjects: ReferenceObject[] = [
        {
          type: 'person',
          knownSize: 1.7, // 1.7 meters tall
          boundingBox: { x: 100, y: 200, width: 50, height: 150 }
        },
        {
          type: 'vehicle',
          knownSize: 4.5, // 4.5 meters long
          boundingBox: { x: 300, y: 400, width: 120, height: 60 }
        }
      ];

      const result = await areaEstimationService.estimateArea(
        mockImageBuffer,
        mockMetadata,
        referenceObjects
      );
      
      expect(result).toBeDefined();
      expect(result.totalArea).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0.5); // Should have higher confidence with reference objects
      expect(result.method).toBe('reference_object');
    });

    test('should estimate area with options', async () => {
      const options = {
        useReferenceObjects: true,
        enableEdgeDetection: true,
        enablePerspectiveCorrection: false,
        confidenceThreshold: 0.4
      };

      const result = await areaEstimationService.estimateArea(
        mockImageBuffer,
        mockMetadata,
        undefined,
        options
      );
      
      expect(result).toBeDefined();
      expect(result.totalArea).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Area Breakdown Analysis', () => {
    test('should provide detailed area breakdown', async () => {
      const result = await areaEstimationService.estimateArea(mockImageBuffer);
      
      const totalBreakdown = result.breakdown.cultivableArea + 
                           result.breakdown.nonCultivableArea + 
                           result.breakdown.waterBodies + 
                           result.breakdown.infrastructure;
      
      // Total breakdown should approximately equal total area (within 10% tolerance)
      expect(Math.abs(totalBreakdown - result.totalArea)).toBeLessThanOrEqual(result.totalArea * 0.1);
      
      // Cultivable area should be the largest component in most cases
      expect(result.breakdown.cultivableArea).toBeGreaterThanOrEqual(0);
    });

    test('should detect different land types in breakdown', async () => {
      const result = await areaEstimationService.estimateArea(mockImageBuffer);
      
      // Based on our mock data, we should detect:
      // - Significant cultivable area (green pixels)
      // - Some water bodies (blue pixels)
      // - Some infrastructure (gray pixels)
      expect(result.breakdown.cultivableArea).toBeGreaterThan(0);
      expect(result.breakdown.waterBodies).toBeGreaterThanOrEqual(0);
      expect(result.breakdown.infrastructure).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Validation and Recommendations', () => {
    test('should validate area estimation results', async () => {
      const result = await areaEstimationService.estimateArea(mockImageBuffer);
      const validation = areaEstimationService.validateEstimation(result);
      
      expect(validation).toBeDefined();
      expect(typeof validation.valid).toBe('boolean');
      expect(Array.isArray(validation.issues)).toBe(true);
      
      // For reasonable area estimates, validation should pass
      if (result.totalArea >= 100 && result.totalArea <= 1000000 && result.confidence >= 0.3) {
        expect(validation.valid).toBe(true);
      }
    });

    test('should provide area estimation recommendations', async () => {
      const result = await areaEstimationService.estimateArea(mockImageBuffer);
      const recommendations = areaEstimationService.getEstimationRecommendations(result);
      
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
      
      // Recommendations should be strings
      recommendations.forEach(rec => {
        expect(typeof rec).toBe('string');
        expect(rec.length).toBeGreaterThan(0);
      });
    });

    test('should flag invalid area estimates', () => {
      const invalidEstimate = {
        totalArea: 50, // Too small
        confidence: 0.1, // Too low confidence
        method: 'visual_estimation' as const,
        breakdown: {
          cultivableArea: 40,
          nonCultivableArea: 5,
          waterBodies: 3,
          infrastructure: 2
        }
      };

      const validation = areaEstimationService.validateEstimation(invalidEstimate);
      expect(validation.valid).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
    });

    test('should provide specific recommendations based on area size', async () => {
      // Test with different mock scenarios
      const smallAreaResult = await areaEstimationService.estimateArea(mockImageBuffer);
      const recommendations = areaEstimationService.getEstimationRecommendations(smallAreaResult);
      
      expect(recommendations.some(rec => 
        rec.includes('reference objects') || 
        rec.includes('GPS') || 
        rec.includes('cultivable')
      )).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid image data gracefully', async () => {
      const invalidBuffer = Buffer.from('not-an-image');
      
      const result = await areaEstimationService.estimateArea(invalidBuffer);
      
      // Should return fallback estimation
      expect(result).toBeDefined();
      expect(result.totalArea).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.method).toBe('visual_estimation');
    });

    test('should handle empty reference objects array', async () => {
      const result = await areaEstimationService.estimateArea(
        mockImageBuffer,
        mockMetadata,
        [] // Empty reference objects
      );
      
      expect(result).toBeDefined();
      expect(result.totalArea).toBeGreaterThan(0);
    });

    test('should handle missing metadata', async () => {
      const result = await areaEstimationService.estimateArea(
        mockImageBuffer,
        undefined, // No metadata
        undefined
      );
      
      expect(result).toBeDefined();
      expect(result.totalArea).toBeGreaterThan(0);
    });
  });

  describe('Reference Object Processing', () => {
    test('should handle single reference object', async () => {
      const referenceObjects: ReferenceObject[] = [
        {
          type: 'person',
          knownSize: 1.7,
          boundingBox: { x: 100, y: 200, width: 50, height: 150 }
        }
      ];

      const result = await areaEstimationService.estimateArea(
        mockImageBuffer,
        mockMetadata,
        referenceObjects
      );
      
      expect(result.method).toBe('reference_object');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test('should handle multiple reference objects', async () => {
      const referenceObjects: ReferenceObject[] = [
        {
          type: 'person',
          knownSize: 1.7,
          boundingBox: { x: 100, y: 200, width: 50, height: 150 }
        },
        {
          type: 'vehicle',
          knownSize: 4.5,
          boundingBox: { x: 300, y: 400, width: 120, height: 60 }
        },
        {
          type: 'building',
          knownSize: 10.0,
          boundingBox: { x: 500, y: 100, width: 200, height: 180 }
        }
      ];

      const result = await areaEstimationService.estimateArea(
        mockImageBuffer,
        mockMetadata,
        referenceObjects
      );
      
      expect(result.method).toBe('reference_object');
      expect(result.confidence).toBeGreaterThan(0.7); // Higher confidence with more reference objects
    });

    test('should handle invalid reference objects', async () => {
      const invalidReferenceObjects: ReferenceObject[] = [
        {
          type: 'person',
          knownSize: 0, // Invalid size
          boundingBox: { x: 100, y: 200, width: 0, height: 0 } // Invalid bounding box
        }
      ];

      const result = await areaEstimationService.estimateArea(
        mockImageBuffer,
        mockMetadata,
        invalidReferenceObjects
      );
      
      // Should fallback to other estimation methods
      expect(result).toBeDefined();
      expect(result.totalArea).toBeGreaterThan(0);
    });
  });
});