// Enhanced Image Quality Assessment Tests
import ImagePreprocessingService from '../../services/visual-analysis/services/ImagePreprocessingService';
import { QualityAssessment } from '../../services/visual-analysis/types';

describe('Enhanced Image Quality Assessment', () => {
  let imagePreprocessingService: ImagePreprocessingService;
  let mockImageBuffer: Buffer;

  beforeEach(() => {
    imagePreprocessingService = new ImagePreprocessingService();
    
    // Create a mock image buffer (1x1 pixel PNG)
    mockImageBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
      0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x0F, 0x00, 0x00,
      0x01, 0x00, 0x01, 0x5C, 0xC2, 0x8A, 0xBC, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
  });

  describe('Enhanced Quality Assessment Structure', () => {
    test('should return enhanced quality assessment structure', async () => {
      const assessment = await imagePreprocessingService.assessImageQuality(mockImageBuffer);
      
      expect(assessment).toBeDefined();
      expect(typeof assessment.overallScore).toBe('number');
      expect(assessment.overallScore).toBeGreaterThanOrEqual(0);
      expect(assessment.overallScore).toBeLessThanOrEqual(1);
      
      expect(Array.isArray(assessment.issues)).toBe(true);
      expect(typeof assessment.usableForAnalysis).toBe('boolean');
      expect(Array.isArray(assessment.recommendedActions)).toBe(true);
      
      // Check enhanced structure
      expect(assessment.detailedMetrics).toBeDefined();
      expect(assessment.improvementSuggestions).toBeDefined();
    });

    test('should have detailed metrics for all quality aspects', async () => {
      const assessment = await imagePreprocessingService.assessImageQuality(mockImageBuffer);
      
      const metrics = assessment.detailedMetrics;
      expect(metrics.sharpness).toBeDefined();
      expect(metrics.brightness).toBeDefined();
      expect(metrics.contrast).toBeDefined();
      expect(metrics.resolution).toBeDefined();
      expect(metrics.colorBalance).toBeDefined();
      expect(metrics.noise).toBeDefined();
      
      // Each metric should have score, status, and feedback
      Object.values(metrics).forEach(metric => {
        expect(typeof metric.score).toBe('number');
        expect(['excellent', 'good', 'fair', 'poor']).toContain(metric.status);
        expect(typeof metric.feedback).toBe('string');
        expect(metric.feedback.length).toBeGreaterThan(0);
      });
    });

    test('should have improvement suggestions in three categories', async () => {
      const assessment = await imagePreprocessingService.assessImageQuality(mockImageBuffer);
      
      const suggestions = assessment.improvementSuggestions;
      expect(Array.isArray(suggestions.immediate)).toBe(true);
      expect(Array.isArray(suggestions.technical)).toBe(true);
      expect(Array.isArray(suggestions.environmental)).toBe(true);
      
      // Should have at least some suggestions
      const totalSuggestions = suggestions.immediate.length + suggestions.technical.length + suggestions.environmental.length;
      expect(totalSuggestions).toBeGreaterThan(0);
    });

    test('should include confidence in issues', async () => {
      const assessment = await imagePreprocessingService.assessImageQuality(mockImageBuffer);
      
      assessment.issues.forEach(issue => {
        expect(typeof issue.confidence).toBe('number');
        expect(issue.confidence).toBeGreaterThanOrEqual(0);
        expect(issue.confidence).toBeLessThanOrEqual(1);
        expect(['blur', 'lighting', 'angle', 'obstruction', 'resolution', 'exposure', 'noise', 'color_balance']).toContain(issue.type);
      });
    });
  });

  describe('Quality Assessment Logic', () => {
    test('should identify low resolution as an issue', async () => {
      const assessment = await imagePreprocessingService.assessImageQuality(mockImageBuffer);
      
      // 1x1 pixel image should be flagged as low resolution
      expect(assessment.detailedMetrics.resolution.status).toBe('poor');
      expect(assessment.issues.some(issue => issue.type === 'resolution')).toBe(true);
    });

    test('should provide appropriate feedback for poor quality image', async () => {
      const assessment = await imagePreprocessingService.assessImageQuality(mockImageBuffer);
      
      // Should not be usable for analysis due to low quality
      expect(assessment.usableForAnalysis).toBe(false);
      expect(assessment.overallScore).toBeLessThan(0.5);
      
      // Should have recommendations
      expect(assessment.recommendedActions.length).toBeGreaterThan(0);
      expect(assessment.improvementSuggestions.immediate.length).toBeGreaterThan(0);
    });

    test('should handle invalid image gracefully', async () => {
      const invalidBuffer = Buffer.from('invalid image data');
      const assessment = await imagePreprocessingService.assessImageQuality(invalidBuffer);
      
      expect(assessment.overallScore).toBe(0);
      expect(assessment.usableForAnalysis).toBe(false);
      expect(assessment.issues.length).toBeGreaterThan(0);
      expect(assessment.issues[0].type).toBe('resolution');
      expect(assessment.detailedMetrics.resolution.status).toBe('poor');
    });
  });

  describe('Improvement Suggestions Logic', () => {
    test('should provide relevant suggestions based on quality issues', async () => {
      const assessment = await imagePreprocessingService.assessImageQuality(mockImageBuffer);
      
      // For a low-quality image, should have some improvement suggestions
      const totalSuggestions = assessment.improvementSuggestions.immediate.length + 
                              assessment.improvementSuggestions.technical.length + 
                              assessment.improvementSuggestions.environmental.length;
      
      expect(totalSuggestions).toBeGreaterThan(0);
      
      // Should have at least one suggestion about image quality
      const allSuggestions = [
        ...assessment.improvementSuggestions.immediate,
        ...assessment.improvementSuggestions.technical,
        ...assessment.improvementSuggestions.environmental
      ].join(' ').toLowerCase();
      
      expect(allSuggestions.length).toBeGreaterThan(0);
    });

    test('should categorize suggestions appropriately', async () => {
      const assessment = await imagePreprocessingService.assessImageQuality(mockImageBuffer);
      
      const { immediate, technical, environmental } = assessment.improvementSuggestions;
      
      // Immediate suggestions should be actionable right now
      immediate.forEach(suggestion => {
        expect(typeof suggestion).toBe('string');
        expect(suggestion.length).toBeGreaterThan(0);
      });
      
      // Technical suggestions should be about camera settings
      technical.forEach(suggestion => {
        expect(typeof suggestion).toBe('string');
        expect(suggestion.length).toBeGreaterThan(0);
      });
      
      // Environmental suggestions should be about conditions
      environmental.forEach(suggestion => {
        expect(typeof suggestion).toBe('string');
        expect(suggestion.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Quality Metrics Calculation', () => {
    test('should calculate resolution score correctly', async () => {
      const assessment = await imagePreprocessingService.assessImageQuality(mockImageBuffer);
      
      // Mock image should have very low resolution score
      expect(assessment.detailedMetrics.resolution.score).toBeLessThan(0.5);
      expect(assessment.detailedMetrics.resolution.status).toBe('poor');
      // For invalid/very small images, feedback might indicate file issues
      expect(assessment.detailedMetrics.resolution.feedback.length).toBeGreaterThan(0);
    });

    test('should provide meaningful feedback for each metric', async () => {
      const assessment = await imagePreprocessingService.assessImageQuality(mockImageBuffer);
      
      Object.entries(assessment.detailedMetrics).forEach(([metricName, metric]) => {
        expect(metric.feedback).toBeDefined();
        expect(typeof metric.feedback).toBe('string');
        expect(metric.feedback.length).toBeGreaterThan(5); // Should be descriptive
        
        // All feedback should be meaningful strings
        expect(metric.feedback.trim().length).toBeGreaterThan(0);
      });
    });
  });

  describe('Overall Score Calculation', () => {
    test('should calculate overall score as average of individual metrics', async () => {
      const assessment = await imagePreprocessingService.assessImageQuality(mockImageBuffer);
      
      const metrics = assessment.detailedMetrics;
      const scores = [
        metrics.sharpness.score,
        metrics.brightness.score,
        metrics.contrast.score,
        metrics.resolution.score,
        metrics.colorBalance.score,
        metrics.noise.score
      ];
      
      const expectedAverage = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      
      // Should be close to the calculated average (allowing for small rounding differences)
      expect(Math.abs(assessment.overallScore - expectedAverage)).toBeLessThan(0.01);
    });

    test('should determine usability based on overall score and critical metrics', async () => {
      const assessment = await imagePreprocessingService.assessImageQuality(mockImageBuffer);
      
      // Low quality image should not be usable
      if (assessment.overallScore < 0.4 || 
          assessment.detailedMetrics.sharpness.score < 0.3 || 
          assessment.detailedMetrics.resolution.score < 0.4) {
        expect(assessment.usableForAnalysis).toBe(false);
      }
    });
  });
});