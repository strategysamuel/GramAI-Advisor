// Terrain Classification Service Tests
import TerrainClassificationService from '../../services/visual-analysis/services/TerrainClassificationService';
import { ImageMetadata } from '../../services/visual-analysis/types';

// Mock sharp for testing
jest.mock('sharp', () => {
  return jest.fn().mockImplementation((buffer: Buffer) => {
    const isValidImage = buffer.toString().includes('mock-image-data');
    
    if (!isValidImage) {
      throw new Error('Invalid image file');
    }

    return {
      metadata: jest.fn().mockResolvedValue({
        width: 256,
        height: 256,
        format: 'jpeg',
        channels: 3
      }),
      resize: jest.fn().mockReturnThis(),
      greyscale: jest.fn().mockReturnThis(),
      raw: jest.fn().mockReturnThis(),
      toBuffer: jest.fn().mockImplementation((options?: any) => {
        // Mock different types of terrain data
        const mockData = Buffer.alloc(256 * 256 * 3);
        
        // Create a mixed terrain with different zones
        for (let i = 0; i < mockData.length; i += 3) {
          const pixelIndex = Math.floor(i / 3);
          const x = pixelIndex % 256;
          const y = Math.floor(pixelIndex / 256);
          
          // Create different zones based on position
          if (y < 100) {
            // Top area - vegetation (green)
            mockData[i] = 60;     // R
            mockData[i + 1] = 140; // G
            mockData[i + 2] = 70;  // B
          } else if (y < 150 && x < 100) {
            // Middle-left - water (blue)
            mockData[i] = 40;     // R
            mockData[i + 1] = 80; // G
            mockData[i + 2] = 150; // B
          } else if (y < 150 && x >= 100) {
            // Middle-right - soil (brown)
            mockData[i] = 120;    // R
            mockData[i + 1] = 90; // G
            mockData[i + 2] = 60; // B
          } else if (x > 200) {
            // Right side - infrastructure (gray)
            mockData[i] = 120;     // R
            mockData[i + 1] = 120; // G
            mockData[i + 2] = 120; // B
          } else {
            // Bottom area - mixed soil/rock
            mockData[i] = 100;    // R
            mockData[i + 1] = 80; // G
            mockData[i + 2] = 70; // B
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

describe('Terrain Classification Service', () => {
  let terrainClassificationService: TerrainClassificationService;
  let mockImageBuffer: Buffer;
  let mockMetadata: ImageMetadata;

  beforeEach(() => {
    terrainClassificationService = new TerrainClassificationService();
    mockImageBuffer = Buffer.from('mock-image-data');
    mockMetadata = {
      filename: 'test-terrain.jpg',
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

  describe('Basic Terrain Classification', () => {
    test('should classify terrain and identify zones', async () => {
      const result = await terrainClassificationService.classifyTerrain(mockImageBuffer);
      
      expect(result).toBeDefined();
      expect(result.terrainType).toBeDefined();
      expect(['flat', 'hilly', 'mountainous', 'valley', 'plateau']).toContain(result.terrainType.primary);
      expect(result.terrainType.slope).toBeGreaterThanOrEqual(0);
      expect(['excellent', 'good', 'moderate', 'poor']).toContain(result.terrainType.drainage);
      expect(['easy', 'moderate', 'difficult']).toContain(result.terrainType.accessibility);
      
      expect(Array.isArray(result.zones)).toBe(true);
      expect(Array.isArray(result.waterSources)).toBe(true);
      expect(Array.isArray(result.infrastructure)).toBe(true);
    });

    test('should classify terrain with metadata', async () => {
      const result = await terrainClassificationService.classifyTerrain(
        mockImageBuffer,
        mockMetadata
      );
      
      expect(result).toBeDefined();
      expect(result.terrainType).toBeDefined();
      expect(result.zones.length).toBeGreaterThan(0);
    });

    test('should classify terrain with custom options', async () => {
      const options = {
        enableSlopeAnalysis: true,
        enableDrainageAnalysis: true,
        enableVegetationAnalysis: true,
        enableWaterDetection: true,
        enableInfrastructureDetection: true,
        zoneMinSize: 50,
        confidenceThreshold: 0.5
      };

      const result = await terrainClassificationService.classifyTerrain(
        mockImageBuffer,
        mockMetadata,
        options
      );
      
      expect(result).toBeDefined();
      expect(result.terrainType).toBeDefined();
      expect(result.zones.length).toBeGreaterThan(0);
    });
  });

  describe('Zone Identification', () => {
    test('should identify different types of zones', async () => {
      const result = await terrainClassificationService.classifyTerrain(mockImageBuffer);
      
      expect(result.zones.length).toBeGreaterThan(0);
      
      result.zones.forEach(zone => {
        expect(zone.id).toBeDefined();
        expect(['cultivable', 'water_body', 'residential', 'forest', 'barren']).toContain(zone.type);
        expect(zone.area).toBeGreaterThan(0);
        expect(Array.isArray(zone.boundingPolygon)).toBe(true);
        expect(zone.boundingPolygon.length).toBeGreaterThanOrEqual(3);
        expect(Array.isArray(zone.characteristics)).toBe(true);
        expect(zone.suitability).toBeDefined();
        expect(Array.isArray(zone.suitability.crops)).toBe(true);
        expect(zone.suitability.score).toBeGreaterThanOrEqual(0);
        expect(zone.suitability.score).toBeLessThanOrEqual(1);
        expect(Array.isArray(zone.suitability.limitations)).toBe(true);
      });
    });

    test('should identify cultivable zones with appropriate crops', async () => {
      const result = await terrainClassificationService.classifyTerrain(mockImageBuffer);
      
      const cultivableZones = result.zones.filter(zone => zone.type === 'cultivable');
      
      if (cultivableZones.length > 0) {
        cultivableZones.forEach(zone => {
          expect(zone.suitability.crops.length).toBeGreaterThan(0);
          expect(zone.suitability.score).toBeGreaterThan(0.3);
        });
      }
    });

    test('should identify water zones when present', async () => {
      const result = await terrainClassificationService.classifyTerrain(mockImageBuffer);
      
      const waterZones = result.zones.filter(zone => zone.type === 'water_body');
      
      if (waterZones.length > 0) {
        waterZones.forEach(zone => {
          expect(zone.characteristics).toContain('permanent_water');
          expect(zone.suitability.crops).toContain('fish_farming');
        });
      }
    });
  });

  describe('Water Source Detection', () => {
    test('should detect water sources when present', async () => {
      const result = await terrainClassificationService.classifyTerrain(mockImageBuffer);
      
      result.waterSources.forEach(source => {
        expect(['well', 'pond', 'river', 'canal', 'borewell']).toContain(source.type);
        expect(source.location).toBeDefined();
        expect(source.location.x).toBeGreaterThanOrEqual(0);
        expect(source.location.x).toBeLessThanOrEqual(1);
        expect(source.location.y).toBeGreaterThanOrEqual(0);
        expect(source.location.y).toBeLessThanOrEqual(1);
        expect(['direct', 'nearby', 'distant']).toContain(source.accessibility);
      });
    });
  });

  describe('Infrastructure Detection', () => {
    test('should detect infrastructure when present', async () => {
      const result = await terrainClassificationService.classifyTerrain(mockImageBuffer);
      
      result.infrastructure.forEach(infra => {
        expect(['road', 'building', 'fence', 'irrigation']).toContain(infra.type);
        expect(['good', 'fair', 'poor']).toContain(infra.condition);
        expect(infra.location).toBeDefined();
        expect(infra.location.x).toBeGreaterThanOrEqual(0);
        expect(infra.location.x).toBeLessThanOrEqual(1);
        expect(infra.location.y).toBeGreaterThanOrEqual(0);
        expect(infra.location.y).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Terrain Type Classification', () => {
    test('should classify terrain type correctly', async () => {
      const result = await terrainClassificationService.classifyTerrain(mockImageBuffer);
      
      expect(result.terrainType.primary).toBeDefined();
      expect(result.terrainType.slope).toBeGreaterThanOrEqual(0);
      expect(result.terrainType.slope).toBeLessThanOrEqual(90);
      expect(result.terrainType.drainage).toBeDefined();
      expect(result.terrainType.accessibility).toBeDefined();
    });

    test('should provide appropriate drainage classification', async () => {
      const result = await terrainClassificationService.classifyTerrain(mockImageBuffer);
      
      // Based on our mock data with water zones, drainage should be reasonable
      expect(['excellent', 'good', 'moderate', 'poor']).toContain(result.terrainType.drainage);
    });

    test('should provide appropriate accessibility classification', async () => {
      const result = await terrainClassificationService.classifyTerrain(mockImageBuffer);
      
      expect(['easy', 'moderate', 'difficult']).toContain(result.terrainType.accessibility);
    });
  });

  describe('Recommendations', () => {
    test('should provide terrain-based recommendations', async () => {
      const result = await terrainClassificationService.classifyTerrain(mockImageBuffer);
      const recommendations = terrainClassificationService.getTerrainRecommendations(result);
      
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
      
      recommendations.forEach(rec => {
        expect(typeof rec).toBe('string');
        expect(rec.length).toBeGreaterThan(0);
      });
    });

    test('should provide slope-specific recommendations for steep terrain', () => {
      const steepTerrain = {
        terrainType: {
          primary: 'hilly' as const,
          slope: 15,
          drainage: 'good' as const,
          accessibility: 'moderate' as const
        },
        zones: [],
        waterSources: [],
        infrastructure: []
      };

      const recommendations = terrainClassificationService.getTerrainRecommendations(steepTerrain);
      
      expect(recommendations.some(rec => 
        rec.includes('contour farming') || rec.includes('terracing')
      )).toBe(true);
    });

    test('should provide drainage-specific recommendations', () => {
      const poorDrainageTerrain = {
        terrainType: {
          primary: 'flat' as const,
          slope: 1,
          drainage: 'poor' as const,
          accessibility: 'easy' as const
        },
        zones: [],
        waterSources: [],
        infrastructure: []
      };

      const recommendations = terrainClassificationService.getTerrainRecommendations(poorDrainageTerrain);
      
      expect(recommendations.some(rec => 
        rec.includes('drainage systems') || rec.includes('waterlogging')
      )).toBe(true);
    });

    test('should provide water source recommendations', () => {
      const terrainWithWater = {
        terrainType: {
          primary: 'flat' as const,
          slope: 2,
          drainage: 'moderate' as const,
          accessibility: 'easy' as const
        },
        zones: [],
        waterSources: [
          {
            type: 'pond' as const,
            location: { x: 0.5, y: 0.5 },
            accessibility: 'direct' as const
          }
        ],
        infrastructure: []
      };

      const recommendations = terrainClassificationService.getTerrainRecommendations(terrainWithWater);
      
      expect(recommendations.some(rec => 
        rec.includes('water sources') || rec.includes('fish farming')
      )).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid image data gracefully', async () => {
      const invalidBuffer = Buffer.from('not-an-image');
      
      const result = await terrainClassificationService.classifyTerrain(invalidBuffer);
      
      // Should return fallback classification
      expect(result).toBeDefined();
      expect(result.terrainType).toBeDefined();
      expect(result.terrainType.primary).toBe('flat');
      expect(Array.isArray(result.zones)).toBe(true);
    });

    test('should handle missing metadata', async () => {
      const result = await terrainClassificationService.classifyTerrain(
        mockImageBuffer,
        undefined // No metadata
      );
      
      expect(result).toBeDefined();
      expect(result.terrainType).toBeDefined();
    });

    test('should handle disabled analysis options', async () => {
      const options = {
        enableSlopeAnalysis: false,
        enableDrainageAnalysis: false,
        enableVegetationAnalysis: false,
        enableWaterDetection: false,
        enableInfrastructureDetection: false
      };

      const result = await terrainClassificationService.classifyTerrain(
        mockImageBuffer,
        mockMetadata,
        options
      );
      
      expect(result).toBeDefined();
      expect(result.terrainType).toBeDefined();
      // Should still have basic classification even with disabled options
    });
  });

  describe('Zone Characteristics', () => {
    test('should provide meaningful zone characteristics', async () => {
      const result = await terrainClassificationService.classifyTerrain(mockImageBuffer);
      
      result.zones.forEach(zone => {
        expect(zone.characteristics.length).toBeGreaterThan(0);
        zone.characteristics.forEach(characteristic => {
          expect(typeof characteristic).toBe('string');
          expect(characteristic.length).toBeGreaterThan(0);
        });
      });
    });

    test('should provide zone suitability scores within valid range', async () => {
      const result = await terrainClassificationService.classifyTerrain(mockImageBuffer);
      
      result.zones.forEach(zone => {
        expect(zone.suitability.score).toBeGreaterThanOrEqual(0);
        expect(zone.suitability.score).toBeLessThanOrEqual(1);
      });
    });

    test('should provide appropriate crop recommendations for zones', async () => {
      const result = await terrainClassificationService.classifyTerrain(mockImageBuffer);
      
      const cultivableZones = result.zones.filter(zone => zone.type === 'cultivable');
      
      cultivableZones.forEach(zone => {
        expect(zone.suitability.crops.length).toBeGreaterThan(0);
        zone.suitability.crops.forEach(crop => {
          expect(typeof crop).toBe('string');
          expect(crop.length).toBeGreaterThan(0);
        });
      });
    });
  });
});