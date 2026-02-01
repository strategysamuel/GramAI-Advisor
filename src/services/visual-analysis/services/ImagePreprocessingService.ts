// Image Preprocessing Service - handles image upload, validation, and preprocessing
import sharp from 'sharp';
import { ImageMetadata, ProcessedImage, ImageProcessingOptions, QualityAssessment } from '../types';

export class ImagePreprocessingService {
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB
  private readonly supportedFormats = ['jpeg', 'jpg', 'png', 'webp', 'tiff'];
  private readonly minResolution = { width: 640, height: 480 };
  private readonly maxResolution = { width: 4096, height: 4096 };

  /**
   * Validate uploaded image file
   */
  public async validateImage(buffer: Buffer, metadata: Partial<ImageMetadata>): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check file size
    if (buffer.length > this.maxFileSize) {
      errors.push(`File size ${(buffer.length / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of ${this.maxFileSize / 1024 / 1024}MB`);
    }

    // Check if buffer is valid image
    try {
      const imageInfo = await sharp(buffer).metadata();
      
      // Check format
      if (!imageInfo.format || !this.supportedFormats.includes(imageInfo.format)) {
        errors.push(`Unsupported image format: ${imageInfo.format}. Supported formats: ${this.supportedFormats.join(', ')}`);
      }

      // Check resolution
      if (imageInfo.width && imageInfo.height) {
        if (imageInfo.width < this.minResolution.width || imageInfo.height < this.minResolution.height) {
          errors.push(`Image resolution ${imageInfo.width}x${imageInfo.height} is too low. Minimum required: ${this.minResolution.width}x${this.minResolution.height}`);
        }
        
        if (imageInfo.width > this.maxResolution.width || imageInfo.height > this.maxResolution.height) {
          errors.push(`Image resolution ${imageInfo.width}x${imageInfo.height} is too high. Maximum allowed: ${this.maxResolution.width}x${this.maxResolution.height}`);
        }
      }

      // Check if image has valid content
      if (imageInfo.channels && imageInfo.channels < 1) {
        errors.push('Invalid image: no color channels detected');
      }

    } catch (error) {
      errors.push('Invalid image file: unable to process image data');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Extract comprehensive metadata from image
   */
  public async extractMetadata(buffer: Buffer, uploadMetadata: Partial<ImageMetadata>): Promise<ImageMetadata> {
    const imageInfo = await sharp(buffer).metadata();
    
    return {
      filename: uploadMetadata.filename || 'unknown.jpg',
      size: buffer.length,
      mimeType: uploadMetadata.mimeType || `image/${imageInfo.format}`,
      uploadedAt: new Date(),
      farmerId: uploadMetadata.farmerId || '',
      location: uploadMetadata.location,
      deviceInfo: {
        ...uploadMetadata.deviceInfo,
        orientation: imageInfo.orientation || 1
      }
    };
  }

  /**
   * Preprocess image for analysis
   */
  public async preprocessImage(
    buffer: Buffer, 
    metadata: ImageMetadata, 
    options: ImageProcessingOptions = {}
  ): Promise<ProcessedImage> {
    let processedBuffer = buffer;
    const processingApplied: string[] = [];
    
    let sharpInstance = sharp(buffer);

    // Correct orientation if needed
    if (options.correctOrientation !== false && metadata.deviceInfo?.orientation) {
      sharpInstance = sharpInstance.rotate();
      processingApplied.push('orientation_correction');
    }

    // Resize if needed
    if (options.resizeForAnalysis && (options.targetWidth || options.targetHeight)) {
      const targetWidth = options.targetWidth || 1024;
      const targetHeight = options.targetHeight || 768;
      
      sharpInstance = sharpInstance.resize(targetWidth, targetHeight, {
        fit: 'inside',
        withoutEnlargement: true
      });
      processingApplied.push('resize');
    }

    // Enhance contrast if requested
    if (options.enhanceContrast) {
      sharpInstance = sharpInstance.normalize();
      processingApplied.push('contrast_enhancement');
    }

    // Apply compression if specified
    if (options.compressionQuality && options.compressionQuality < 100) {
      sharpInstance = sharpInstance.jpeg({ quality: options.compressionQuality });
      processingApplied.push('compression');
    }

    processedBuffer = await sharpInstance.toBuffer();

    // Calculate quality metrics
    const qualityMetrics = await this.calculateQualityMetrics(processedBuffer);

    return {
      originalBuffer: buffer,
      processedBuffer,
      metadata,
      processingApplied,
      qualityMetrics
    };
  }

  /**
   * Assess image quality for analysis suitability with detailed feedback
   */
  public async assessImageQuality(buffer: Buffer): Promise<QualityAssessment> {
    try {
      const metadata = await sharp(buffer).metadata();
      const stats = await sharp(buffer).stats();
      
      // Calculate detailed metrics
      const sharpness = await this.calculateSharpness(buffer);
      const brightness = this.calculateBrightness(stats);
      const contrast = this.calculateContrast(stats);
      const colorBalance = this.calculateColorBalance(stats);
      const noise = await this.calculateNoise(buffer);
      const resolution = this.calculateResolution(metadata);

      // Assess each metric
      const sharpnessAssessment = this.assessSharpness(sharpness);
      const brightnessAssessment = this.assessBrightness(brightness);
      const contrastAssessment = this.assessContrast(contrast);
      const resolutionAssessment = this.assessResolution(resolution, metadata);
      const colorBalanceAssessment = this.assessColorBalance(colorBalance);
      const noiseAssessment = this.assessNoise(noise);

      // Collect issues
      const issues: QualityAssessment['issues'] = [];
      
      if (sharpnessAssessment.status === 'poor') {
        issues.push({
          type: 'blur',
          severity: 'high',
          description: 'Image appears blurry or out of focus',
          suggestion: 'Hold camera steady and ensure proper focus on the land area',
          confidence: 0.9
        });
      } else if (sharpnessAssessment.status === 'fair') {
        issues.push({
          type: 'blur',
          severity: 'medium',
          description: 'Image could be sharper for better analysis',
          suggestion: 'Try to hold camera more steady or use autofocus',
          confidence: 0.7
        });
      }

      if (brightnessAssessment.status === 'poor') {
        issues.push({
          type: brightness < 0.3 ? 'lighting' : 'exposure',
          severity: 'high',
          description: brightness < 0.3 ? 'Image is too dark' : 'Image is overexposed',
          suggestion: brightness < 0.3 ? 
            'Take photo in better lighting or adjust camera exposure' : 
            'Reduce exposure or avoid direct sunlight',
          confidence: 0.8
        });
      }

      if (contrastAssessment.status === 'poor') {
        issues.push({
          type: 'lighting',
          severity: 'medium',
          description: 'Image has poor contrast, making details hard to distinguish',
          suggestion: 'Take photo during golden hour (early morning/late afternoon) for better contrast',
          confidence: 0.7
        });
      }

      if (resolutionAssessment.status === 'poor') {
        issues.push({
          type: 'resolution',
          severity: 'high',
          description: 'Image resolution is too low for detailed analysis',
          suggestion: 'Use higher camera resolution settings or get closer to the land area',
          confidence: 0.9
        });
      }

      if (colorBalanceAssessment.status === 'poor') {
        issues.push({
          type: 'color_balance',
          severity: 'medium',
          description: 'Image has poor color balance affecting land feature identification',
          suggestion: 'Adjust white balance settings or take photo in natural daylight',
          confidence: 0.6
        });
      }

      if (noiseAssessment.status === 'poor') {
        issues.push({
          type: 'noise',
          severity: 'medium',
          description: 'Image has significant noise affecting clarity',
          suggestion: 'Use lower ISO settings or take photo in better lighting',
          confidence: 0.7
        });
      }

      // Calculate overall score
      const scores = [
        sharpnessAssessment.score,
        brightnessAssessment.score,
        contrastAssessment.score,
        resolutionAssessment.score,
        colorBalanceAssessment.score,
        noiseAssessment.score
      ];
      const overallScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

      // Determine if usable for analysis
      const usableForAnalysis = overallScore >= 0.4 && 
                               sharpnessAssessment.score >= 0.3 && 
                               resolutionAssessment.score >= 0.4;

      // Generate improvement suggestions
      const improvementSuggestions = this.generateImprovementSuggestions(
        sharpnessAssessment,
        brightnessAssessment,
        contrastAssessment,
        resolutionAssessment,
        colorBalanceAssessment,
        noiseAssessment
      );

      // Generate recommended actions
      const recommendedActions: string[] = [];
      if (!usableForAnalysis) {
        recommendedActions.push('Retake photo with better quality for accurate analysis');
      }
      if (issues.some(issue => issue.type === 'blur')) {
        recommendedActions.push('Hold camera steady and ensure proper focus');
      }
      if (issues.some(issue => issue.type === 'lighting')) {
        recommendedActions.push('Take photo in better lighting conditions');
      }
      if (issues.some(issue => issue.type === 'resolution')) {
        recommendedActions.push('Use higher resolution camera settings');
      }

      return {
        overallScore,
        issues,
        usableForAnalysis,
        recommendedActions,
        detailedMetrics: {
          sharpness: sharpnessAssessment,
          brightness: brightnessAssessment,
          contrast: contrastAssessment,
          resolution: resolutionAssessment,
          colorBalance: colorBalanceAssessment,
          noise: noiseAssessment
        },
        improvementSuggestions
      };

    } catch (error) {
      return {
        overallScore: 0,
        issues: [{
          type: 'resolution',
          severity: 'high',
          description: 'Unable to analyze image quality',
          suggestion: 'Please upload a valid image file',
          confidence: 1.0
        }],
        usableForAnalysis: false,
        recommendedActions: ['Upload a valid image file in supported format (JPEG, PNG, WebP, TIFF)'],
        detailedMetrics: {
          sharpness: { score: 0, status: 'poor', feedback: 'Cannot assess sharpness' },
          brightness: { score: 0, status: 'poor', feedback: 'Cannot assess brightness' },
          contrast: { score: 0, status: 'poor', feedback: 'Cannot assess contrast' },
          resolution: { score: 0, status: 'poor', feedback: 'Invalid image file' },
          colorBalance: { score: 0, status: 'poor', feedback: 'Cannot assess color balance' },
          noise: { score: 0, status: 'poor', feedback: 'Cannot assess noise levels' }
        },
        improvementSuggestions: {
          immediate: ['Upload a valid image file'],
          technical: ['Check camera settings and file format'],
          environmental: ['Ensure proper lighting and positioning']
        }
      };
    }
  }

  /**
   * Calculate quality metrics for processed image
   */
  private async calculateQualityMetrics(buffer: Buffer): Promise<ProcessedImage['qualityMetrics']> {
    try {
      const stats = await sharp(buffer).stats();
      const sharpness = await this.calculateSharpness(buffer);
      
      let brightness = 0;
      let contrast = 0;
      let colorfulness = 0;

      if (stats.channels && stats.channels.length > 0) {
        brightness = stats.channels.reduce((sum, channel) => sum + channel.mean, 0) / stats.channels.length / 255;
        
        // Calculate contrast as standard deviation
        contrast = stats.channels.reduce((sum, channel) => sum + channel.stdev, 0) / stats.channels.length / 255;
        
        // Calculate colorfulness (simplified)
        if (stats.channels.length >= 3) {
          const rg = Math.abs(stats.channels[0].mean - stats.channels[1].mean);
          const yb = Math.abs((stats.channels[0].mean + stats.channels[1].mean) / 2 - stats.channels[2].mean);
          colorfulness = Math.sqrt(rg * rg + yb * yb) / 255;
        }
      }

      return {
        sharpness,
        brightness,
        contrast,
        colorfulness
      };
    } catch (error) {
      return {
        sharpness: 0,
        brightness: 0,
        contrast: 0,
        colorfulness: 0
      };
    }
  }

  /**
   * Calculate image sharpness using Laplacian variance
   */
  private async calculateSharpness(buffer: Buffer): Promise<number> {
    try {
      // Convert to grayscale and apply Laplacian filter
      const { data, info } = await sharp(buffer)
        .greyscale()
        .raw()
        .toBuffer({ resolveWithObject: true });

      // Simple sharpness calculation using variance of pixel differences
      let sum = 0;
      let sumSquares = 0;
      let count = 0;

      for (let i = 0; i < data.length - info.width; i++) {
        if (i % info.width < info.width - 1) {
          const diff = Math.abs(data[i] - data[i + 1]) + Math.abs(data[i] - data[i + info.width]);
          sum += diff;
          sumSquares += diff * diff;
          count++;
        }
      }

      if (count === 0) return 0;

      const mean = sum / count;
      const variance = (sumSquares / count) - (mean * mean);
      
      // Normalize to 0-1 range
      return Math.min(1, variance / 10000);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Generate thumbnail for image preview
   */
  public async generateThumbnail(buffer: Buffer, size: number = 200): Promise<Buffer> {
    return sharp(buffer)
      .resize(size, size, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 80 })
      .toBuffer();
  }

  /**
   * Extract EXIF data if available
   */
  public async extractExifData(buffer: Buffer): Promise<any> {
    try {
      const metadata = await sharp(buffer).metadata();
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        space: metadata.space,
        channels: metadata.channels,
        depth: metadata.depth,
        density: metadata.density,
        hasProfile: metadata.hasProfile,
        hasAlpha: metadata.hasAlpha,
        orientation: metadata.orientation,
        exif: metadata.exif,
        icc: metadata.icc
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Calculate brightness from image statistics
   */
  private calculateBrightness(stats: any): number {
    if (!stats.channels || stats.channels.length === 0) return 0;
    const avgBrightness = stats.channels.reduce((sum: number, channel: any) => sum + channel.mean, 0) / stats.channels.length;
    return avgBrightness / 255; // Normalize to 0-1
  }

  /**
   * Calculate contrast from image statistics
   */
  private calculateContrast(stats: any): number {
    if (!stats.channels || stats.channels.length === 0) return 0;
    const avgStdev = stats.channels.reduce((sum: number, channel: any) => sum + channel.stdev, 0) / stats.channels.length;
    return Math.min(1, avgStdev / 128); // Normalize to 0-1
  }

  /**
   * Calculate color balance from image statistics
   */
  private calculateColorBalance(stats: any): number {
    if (!stats.channels || stats.channels.length < 3) return 0.5; // Default for grayscale
    
    const [r, g, b] = stats.channels.slice(0, 3);
    const avgMean = (r.mean + g.mean + b.mean) / 3;
    
    // Calculate deviation from neutral gray
    const rDev = Math.abs(r.mean - avgMean);
    const gDev = Math.abs(g.mean - avgMean);
    const bDev = Math.abs(b.mean - avgMean);
    
    const totalDeviation = (rDev + gDev + bDev) / 3;
    return Math.max(0, 1 - (totalDeviation / 128)); // Normalize to 0-1
  }

  /**
   * Calculate noise level in image
   */
  private async calculateNoise(buffer: Buffer): Promise<number> {
    try {
      // Apply a small blur and compare with original to estimate noise
      const original = await sharp(buffer).greyscale().raw().toBuffer({ resolveWithObject: true });
      const blurred = await sharp(buffer).greyscale().blur(0.5).raw().toBuffer({ resolveWithObject: true });
      
      let totalDiff = 0;
      const pixelCount = original.data.length;
      
      for (let i = 0; i < pixelCount; i++) {
        totalDiff += Math.abs(original.data[i] - blurred.data[i]);
      }
      
      const avgNoise = totalDiff / pixelCount;
      return Math.max(0, 1 - (avgNoise / 50)); // Normalize to 0-1 (higher is better)
    } catch (error) {
      return 0.5; // Default moderate noise level
    }
  }

  /**
   * Calculate resolution score
   */
  private calculateResolution(metadata: any): number {
    if (!metadata.width || !metadata.height) return 0;
    
    const totalPixels = metadata.width * metadata.height;
    
    // Score based on pixel count
    if (totalPixels >= 8000000) return 1.0; // 8MP+
    if (totalPixels >= 5000000) return 0.9; // 5MP+
    if (totalPixels >= 3000000) return 0.8; // 3MP+
    if (totalPixels >= 2000000) return 0.7; // 2MP+
    if (totalPixels >= 1000000) return 0.6; // 1MP+
    if (totalPixels >= 500000) return 0.4;  // 0.5MP+
    return 0.2; // Below 0.5MP
  }

  /**
   * Assess sharpness score
   */
  private assessSharpness(score: number): { score: number; status: 'excellent' | 'good' | 'fair' | 'poor'; feedback: string } {
    if (score >= 0.8) return { score, status: 'excellent', feedback: 'Image is very sharp and clear' };
    if (score >= 0.6) return { score, status: 'good', feedback: 'Image has good sharpness' };
    if (score >= 0.4) return { score, status: 'fair', feedback: 'Image sharpness is acceptable but could be improved' };
    return { score, status: 'poor', feedback: 'Image is blurry and may affect analysis accuracy' };
  }

  /**
   * Assess brightness score
   */
  private assessBrightness(score: number): { score: number; status: 'excellent' | 'good' | 'fair' | 'poor'; feedback: string } {
    if (score >= 0.4 && score <= 0.7) return { score, status: 'excellent', feedback: 'Image has optimal brightness' };
    if (score >= 0.3 && score <= 0.8) return { score, status: 'good', feedback: 'Image brightness is good' };
    if (score >= 0.2 && score <= 0.9) return { score, status: 'fair', feedback: 'Image brightness is acceptable' };
    return { score, status: 'poor', feedback: score < 0.3 ? 'Image is too dark' : 'Image is too bright' };
  }

  /**
   * Assess contrast score
   */
  private assessContrast(score: number): { score: number; status: 'excellent' | 'good' | 'fair' | 'poor'; feedback: string } {
    if (score >= 0.7) return { score, status: 'excellent', feedback: 'Image has excellent contrast' };
    if (score >= 0.5) return { score, status: 'good', feedback: 'Image has good contrast' };
    if (score >= 0.3) return { score, status: 'fair', feedback: 'Image contrast is acceptable' };
    return { score, status: 'poor', feedback: 'Image has poor contrast, details may be hard to distinguish' };
  }

  /**
   * Assess resolution score
   */
  private assessResolution(score: number, metadata: any): { score: number; status: 'excellent' | 'good' | 'fair' | 'poor'; feedback: string } {
    const dimensions = metadata.width && metadata.height ? `${metadata.width}x${metadata.height}` : 'unknown';
    
    if (score >= 0.9) return { score, status: 'excellent', feedback: `High resolution (${dimensions}) perfect for detailed analysis` };
    if (score >= 0.7) return { score, status: 'good', feedback: `Good resolution (${dimensions}) suitable for analysis` };
    if (score >= 0.5) return { score, status: 'fair', feedback: `Moderate resolution (${dimensions}) may limit analysis detail` };
    return { score, status: 'poor', feedback: `Low resolution (${dimensions}) may significantly affect analysis accuracy` };
  }

  /**
   * Assess color balance score
   */
  private assessColorBalance(score: number): { score: number; status: 'excellent' | 'good' | 'fair' | 'poor'; feedback: string } {
    if (score >= 0.8) return { score, status: 'excellent', feedback: 'Image has excellent color balance' };
    if (score >= 0.6) return { score, status: 'good', feedback: 'Image has good color balance' };
    if (score >= 0.4) return { score, status: 'fair', feedback: 'Image color balance is acceptable' };
    return { score, status: 'poor', feedback: 'Image has poor color balance, may affect land feature identification' };
  }

  /**
   * Assess noise score
   */
  private assessNoise(score: number): { score: number; status: 'excellent' | 'good' | 'fair' | 'poor'; feedback: string } {
    if (score >= 0.8) return { score, status: 'excellent', feedback: 'Image has minimal noise' };
    if (score >= 0.6) return { score, status: 'good', feedback: 'Image has low noise levels' };
    if (score >= 0.4) return { score, status: 'fair', feedback: 'Image has moderate noise levels' };
    return { score, status: 'poor', feedback: 'Image has high noise levels that may affect analysis' };
  }

  /**
   * Generate improvement suggestions based on assessments
   */
  private generateImprovementSuggestions(
    sharpness: any,
    brightness: any,
    contrast: any,
    resolution: any,
    colorBalance: any,
    noise: any
  ): { immediate: string[]; technical: string[]; environmental: string[] } {
    const immediate: string[] = [];
    const technical: string[] = [];
    const environmental: string[] = [];

    // Sharpness improvements
    if (sharpness.status === 'poor' || sharpness.status === 'fair') {
      immediate.push('Hold camera with both hands and brace against your body');
      immediate.push('Take multiple shots and select the sharpest one');
      technical.push('Use autofocus or manual focus to ensure land area is in focus');
      technical.push('Use faster shutter speed to reduce motion blur');
    }

    // Brightness improvements
    if (brightness.status === 'poor') {
      if (brightness.score < 0.3) {
        immediate.push('Move to a brighter location or wait for better lighting');
        technical.push('Increase ISO or use exposure compensation');
        environmental.push('Take photos during daylight hours (10 AM - 4 PM)');
      } else {
        immediate.push('Move to shade or wait for softer lighting');
        technical.push('Reduce exposure or use exposure compensation');
        environmental.push('Avoid taking photos in direct harsh sunlight');
      }
    }

    // Contrast improvements
    if (contrast.status === 'poor' || contrast.status === 'fair') {
      environmental.push('Take photos during golden hour (early morning or late afternoon)');
      environmental.push('Avoid overcast conditions when possible');
      technical.push('Adjust contrast settings in camera if available');
    }

    // Resolution improvements
    if (resolution.status === 'poor' || resolution.status === 'fair') {
      immediate.push('Get closer to the land area while keeping entire area in frame');
      technical.push('Use highest resolution setting on your camera/phone');
      technical.push('Ensure camera lens is clean');
    }

    // Color balance improvements
    if (colorBalance.status === 'poor' || colorBalance.status === 'fair') {
      technical.push('Adjust white balance setting to match lighting conditions');
      environmental.push('Take photos in natural daylight when possible');
      environmental.push('Avoid mixed lighting sources (indoor + outdoor)');
    }

    // Noise improvements
    if (noise.status === 'poor' || noise.status === 'fair') {
      technical.push('Use lower ISO settings');
      technical.push('Ensure adequate lighting to avoid high ISO');
      environmental.push('Take photos in well-lit conditions');
    }

    // General improvements
    if (immediate.length === 0) {
      immediate.push('Image quality is good - continue with current technique');
    }

    return { immediate, technical, environmental };
  }
}

export default ImagePreprocessingService;