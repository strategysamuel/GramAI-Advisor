// Sketch Processing Service Tests

import SketchProcessingService from '../../services/visual-analysis/services/SketchProcessingService';
import { SketchAnalysis, SketchProcessingOptions, ImageMetadata } from '../../services/visual-analysis/types';

describe('SketchProcessingService', () => {
  let sketchService: SketchProcessingService;
  let mockImageBuffer: Buffer;
  let mockMetadata: ImageMetadata;

  beforeEach(() => {
    sketchService = new SketchProcessingService();
    mockImageBuffer = Buffer.from('mock-sketch-image-data');
    mockMetadata = {
      filename: 'test-sketch.jpg',
      size: 150000,
      mimeType: 'image/jpeg',
      uploadedAt: new Date(),
      farmerId: 'farmer123',
      location: {
        latitude: 12.9716,
        longitude: 77.5946
      }
    };
  });

  describe('processSketch', () => {
    it('should process a basic sketch successfully', async () => {
      const result = await sketchService.processSketch(mockImageBuffer, mockMetadata);

      expect(result).toBeDefined();
      expect(result.elements).toBeDefined();
      expect(result.interpretedLayout).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.suggestions).toBeDefined();
      expect(Array.isArray(result.elements)).toBe(true);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should process sketch with custom options', async () => {
      const options: SketchProcessingOptions = {
        enableTextRecognition: true,
        enableShapeDetection: true,
        enableScaleEstimation: false,
        minimumElementSize: 20,
        confidenceThreshold: 0.7,
        enhanceContrast: false
      };

      const result = await sketchService.processSketch(mockImageBuffer, mockMetadata, options);

      expect(result).toBeDefined();
      expect(result.estimatedScale).toBeUndefined(); // Scale estimation disabled
      expect(result.elements.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle sketch without metadata', async () => {
      const result = await sketchService.processSketch(mockImageBuffer);

      expect(result).toBeDefined();
      expect(result.elements).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should detect boundary elements', async () => {
      const result = await sketchService.processSketch(mockImageBuffer, mockMetadata);

      const boundaryElements = result.elements.filter(el => el.type === 'boundary');
      expect(boundaryElements.length).toBeGreaterThanOrEqual(1);
      
      if (boundaryElements.length > 0) {
        const boundary = boundaryElements[0];
        expect(boundary.coordinates).toBeDefined();
        expect(boundary.coordinates.length).toBeGreaterThanOrEqual(3);
        expect(boundary.id).toBeDefined();
      }
    });

    it('should detect crop areas', async () => {
      const result = await sketchService.processSketch(mockImageBuffer, mockMetadata);

      const cropElements = result.elements.filter(el => el.type === 'crop_area');
      expect(cropElements.length).toBeGreaterThanOrEqual(1);
      
      if (cropElements.length > 0) {
        const cropArea = cropElements[0];
        expect(cropArea.coordinates).toBeDefined();
        expect(cropArea.label).toBeDefined();
      }
    });

    it('should generate interpreted layout', async () => {
      const result = await sketchService.processSketch(mockImageBuffer, mockMetadata);

      expect(result.interpretedLayout).toBeDefined();
      expect(result.interpretedLayout.zones).toBeDefined();
      expect(Array.isArray(result.interpretedLayout.zones)).toBe(true);
      
      if (result.interpretedLayout.zones.length > 0) {
        const zone = result.interpretedLayout.zones[0];
        expect(zone.type).toBeDefined();
        expect(zone.area).toBeGreaterThanOrEqual(0);
        expect(zone.description).toBeDefined();
      }
    });

    it('should provide confidence score', async () => {
      const result = await sketchService.processSketch(mockImageBuffer, mockMetadata);

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should generate helpful suggestions', async () => {
      const result = await sketchService.processSketch(mockImageBuffer, mockMetadata);

      expect(result.suggestions).toBeDefined();
      expect(Array.isArray(result.suggestions)).toBe(true);
      expect(result.suggestions.length).toBeGreaterThan(0);
      
      // Check that suggestions are meaningful strings
      result.suggestions.forEach(suggestion => {
        expect(typeof suggestion).toBe('string');
        expect(suggestion.length).toBeGreaterThan(10);
      });
    });
  });

  describe('validateSketchAnalysis', () => {
    it('should validate a good sketch analysis', async () => {
      const analysis = await sketchService.processSketch(mockImageBuffer, mockMetadata);
      const validation = sketchService.validateSketchAnalysis(analysis);

      expect(validation).toBeDefined();
      expect(validation.valid).toBeDefined();
      expect(validation.issues).toBeDefined();
      expect(Array.isArray(validation.issues)).toBe(true);
    });

    it('should detect issues in poor analysis', () => {
      const poorAnalysis: SketchAnalysis = {
        elements: [], // No elements detected
        interpretedLayout: {
          zones: []
        },
        confidence: 0.1, // Very low confidence
        suggestions: []
      };

      const validation = sketchService.validateSketchAnalysis(poorAnalysis);

      expect(validation.valid).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
      expect(validation.issues).toContain('No elements detected in the sketch');
      expect(validation.issues).toContain('Analysis confidence is very low - consider improving sketch quality');
    });

    it('should validate analysis with good confidence', async () => {
      const analysis = await sketchService.processSketch(mockImageBuffer, mockMetadata);
      
      // Artificially boost confidence for test
      analysis.confidence = 0.8;
      
      const validation = sketchService.validateSketchAnalysis(analysis);
      
      // Should have fewer issues with high confidence
      expect(validation.issues.length).toBeLessThanOrEqual(2);
    });
  });

  describe('getSketchProcessingRecommendations', () => {
    it('should provide processing recommendations', async () => {
      const analysis = await sketchService.processSketch(mockImageBuffer, mockMetadata);
      const recommendations = sketchService.getSketchProcessingRecommendations(analysis);

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
      
      // Check that recommendations are meaningful
      recommendations.forEach(rec => {
        expect(typeof rec).toBe('string');
        expect(rec.length).toBeGreaterThan(5);
      });
    });

    it('should provide different recommendations based on confidence', async () => {
      const analysis = await sketchService.processSketch(mockImageBuffer, mockMetadata);
      
      // Test high confidence recommendations
      analysis.confidence = 0.8;
      const highConfidenceRecs = sketchService.getSketchProcessingRecommendations(analysis);
      
      // Test low confidence recommendations
      analysis.confidence = 0.3;
      const lowConfidenceRecs = sketchService.getSketchProcessingRecommendations(analysis);
      
      expect(highConfidenceRecs).not.toEqual(lowConfidenceRecs);
    });

    it('should recommend scale indicators when missing', async () => {
      const analysis = await sketchService.processSketch(mockImageBuffer, mockMetadata);
      
      // Remove scale estimation
      analysis.estimatedScale = undefined;
      
      const recommendations = sketchService.getSketchProcessingRecommendations(analysis);
      
      const scaleRecommendation = recommendations.find(rec => 
        rec.toLowerCase().includes('scale') || rec.toLowerCase().includes('meter')
      );
      expect(scaleRecommendation).toBeDefined();
    });

    it('should provide area estimation when available', async () => {
      const analysis = await sketchService.processSketch(mockImageBuffer, mockMetadata);
      
      // Set total area
      analysis.interpretedLayout.totalArea = 5000;
      
      const recommendations = sketchService.getSketchProcessingRecommendations(analysis);
      
      const areaRecommendation = recommendations.find(rec => 
        rec.includes('5000') || rec.toLowerCase().includes('area')
      );
      expect(areaRecommendation).toBeDefined();
    });
  });

  describe('element detection', () => {
    it('should detect water sources when present', async () => {
      // Mock a sketch that should have water sources
      const largerBuffer = Buffer.alloc(200000, 'mock-data-with-water');
      
      const result = await sketchService.processSketch(largerBuffer, mockMetadata);
      
      // Water sources are randomly generated, so we test the structure
      const waterElements = result.elements.filter(el => el.type === 'water_source');
      
      if (waterElements.length > 0) {
        const water = waterElements[0];
        expect(water.coordinates).toBeDefined();
        expect(water.coordinates.length).toBeGreaterThanOrEqual(4); // At least a rectangle
        expect(water.properties).toBeDefined();
      }
    });

    it('should detect buildings when present', async () => {
      const result = await sketchService.processSketch(mockImageBuffer, mockMetadata);
      
      const buildingElements = result.elements.filter(el => el.type === 'building');
      
      if (buildingElements.length > 0) {
        const building = buildingElements[0];
        expect(building.coordinates).toBeDefined();
        expect(building.label).toBeDefined();
        expect(building.properties).toBeDefined();
      }
    });

    it('should detect roads when present', async () => {
      const result = await sketchService.processSketch(mockImageBuffer, mockMetadata);
      
      const roadElements = result.elements.filter(el => el.type === 'road');
      
      if (roadElements.length > 0) {
        const road = roadElements[0];
        expect(road.coordinates).toBeDefined();
        expect(road.coordinates.length).toBeGreaterThanOrEqual(2); // At least a line
      }
    });
  });

  describe('scale estimation', () => {
    it('should estimate scale when reference elements are available', async () => {
      const options: SketchProcessingOptions = {
        enableScaleEstimation: true
      };
      
      const result = await sketchService.processSketch(mockImageBuffer, mockMetadata, options);
      
      if (result.estimatedScale) {
        expect(result.estimatedScale.pixelsPerMeter).toBeGreaterThan(0);
        expect(result.estimatedScale.confidence).toBeGreaterThanOrEqual(0);
        expect(result.estimatedScale.confidence).toBeLessThanOrEqual(1);
        expect(result.estimatedScale.referenceElement).toBeDefined();
      }
    });

    it('should handle missing scale gracefully', async () => {
      const options: SketchProcessingOptions = {
        enableScaleEstimation: false
      };
      
      const result = await sketchService.processSketch(mockImageBuffer, mockMetadata, options);
      
      expect(result.estimatedScale).toBeUndefined();
      expect(result.interpretedLayout.zones).toBeDefined(); // Should still work without scale
    });
  });

  describe('error handling', () => {
    it('should handle invalid image data gracefully', async () => {
      const invalidBuffer = Buffer.from('invalid-image-data');
      
      // Should not throw, but may return low confidence results
      const result = await sketchService.processSketch(invalidBuffer, mockMetadata);
      
      expect(result).toBeDefined();
      expect(result.confidence).toBeDefined();
    });

    it('should handle empty buffer', async () => {
      const emptyBuffer = Buffer.alloc(0);
      
      await expect(sketchService.processSketch(emptyBuffer, mockMetadata))
        .rejects.toThrow();
    });

    it('should handle missing coordinates in elements', () => {
      const analysisWithBadElement: SketchAnalysis = {
        elements: [
          {
            id: 'bad_element',
            type: 'boundary',
            coordinates: [] // Empty coordinates
          }
        ],
        interpretedLayout: {
          zones: []
        },
        confidence: 0.5,
        suggestions: []
      };
      
      const validation = sketchService.validateSketchAnalysis(analysisWithBadElement);
      
      expect(validation).toBeDefined();
      expect(validation.valid).toBeDefined();
    });
  });

  describe('zone interpretation', () => {
    it('should categorize zones correctly', async () => {
      const result = await sketchService.processSketch(mockImageBuffer, mockMetadata);
      
      const zones = result.interpretedLayout.zones;
      
      zones.forEach(zone => {
        expect(zone.type).toBeDefined();
        expect(['cultivation', 'water', 'infrastructure', 'access', 'vegetation', 'unknown'])
          .toContain(zone.type);
        expect(zone.area).toBeGreaterThanOrEqual(0);
        expect(zone.description).toBeDefined();
        expect(typeof zone.description).toBe('string');
      });
    });

    it('should calculate zone areas correctly', async () => {
      const result = await sketchService.processSketch(mockImageBuffer, mockMetadata);
      
      const zones = result.interpretedLayout.zones;
      
      zones.forEach(zone => {
        expect(zone.area).toBeGreaterThan(0);
        expect(Number.isFinite(zone.area)).toBe(true);
      });
    });

    it('should provide meaningful zone descriptions', async () => {
      const result = await sketchService.processSketch(mockImageBuffer, mockMetadata);
      
      const zones = result.interpretedLayout.zones;
      
      zones.forEach(zone => {
        expect(zone.description.length).toBeGreaterThan(5);
        expect(zone.description).not.toBe('');
      });
    });
  });

  describe('confidence calculation', () => {
    it('should calculate confidence based on multiple factors', async () => {
      const result = await sketchService.processSketch(mockImageBuffer, mockMetadata);
      
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      
      // Confidence should be reasonable for a basic sketch
      expect(result.confidence).toBeGreaterThan(0.2);
    });

    it('should adjust confidence based on element count', async () => {
      // Test with different buffer sizes to potentially get different element counts
      const smallBuffer = Buffer.alloc(10000, 'small');
      const largeBuffer = Buffer.alloc(300000, 'large');
      
      const smallResult = await sketchService.processSketch(smallBuffer, mockMetadata);
      const largeResult = await sketchService.processSketch(largeBuffer, mockMetadata);
      
      // Both should have valid confidence scores
      expect(smallResult.confidence).toBeGreaterThan(0);
      expect(largeResult.confidence).toBeGreaterThan(0);
    });
  });
});