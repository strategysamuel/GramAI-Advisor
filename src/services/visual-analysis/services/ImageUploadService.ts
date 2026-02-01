// Image Upload Service - handles file upload, storage, and management
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ImageMetadata, ProcessedImage } from '../types';
import ImagePreprocessingService from './ImagePreprocessingService';

export interface UploadResult {
  success: boolean;
  imageId: string;
  metadata: ImageMetadata;
  storagePath: string;
  thumbnailPath?: string;
  errors?: string[];
}

export interface StorageConfig {
  uploadDir: string;
  thumbnailDir: string;
  maxStorageSize: number; // in bytes
  retentionDays: number;
}

export class ImageUploadService {
  private preprocessingService: ImagePreprocessingService;
  private storageConfig: StorageConfig;

  constructor(storageConfig?: Partial<StorageConfig>) {
    this.preprocessingService = new ImagePreprocessingService();
    this.storageConfig = {
      uploadDir: storageConfig?.uploadDir || './uploads/land-images',
      thumbnailDir: storageConfig?.thumbnailDir || './uploads/thumbnails',
      maxStorageSize: storageConfig?.maxStorageSize || 100 * 1024 * 1024, // 100MB default
      retentionDays: storageConfig?.retentionDays || 30
    };
    
    this.initializeStorage();
  }

  /**
   * Initialize storage directories
   */
  private async initializeStorage(): Promise<void> {
    try {
      await fs.mkdir(this.storageConfig.uploadDir, { recursive: true });
      await fs.mkdir(this.storageConfig.thumbnailDir, { recursive: true });
    } catch (error) {
      console.error('Failed to initialize storage directories:', error);
    }
  }

  /**
   * Upload and process land image
   */
  public async uploadLandImage(
    buffer: Buffer,
    uploadMetadata: Partial<ImageMetadata>
  ): Promise<UploadResult> {
    try {
      // Validate image
      const validation = await this.preprocessingService.validateImage(buffer, uploadMetadata);
      if (!validation.valid) {
        return {
          success: false,
          imageId: '',
          metadata: {} as ImageMetadata,
          storagePath: '',
          errors: validation.errors
        };
      }

      // Extract metadata
      const metadata = await this.preprocessingService.extractMetadata(buffer, uploadMetadata);
      
      // Generate unique image ID
      const imageId = this.generateImageId(metadata);
      
      // Preprocess image
      const processedImage = await this.preprocessingService.preprocessImage(buffer, metadata, {
        correctOrientation: true,
        resizeForAnalysis: true,
        targetWidth: 1024,
        targetHeight: 768,
        enhanceContrast: false
      });

      // Store original and processed images
      const storagePath = await this.storeImage(imageId, processedImage.processedBuffer, 'processed');
      const originalPath = await this.storeImage(imageId, processedImage.originalBuffer, 'original');
      
      // Generate and store thumbnail
      const thumbnail = await this.preprocessingService.generateThumbnail(processedImage.processedBuffer);
      const thumbnailPath = await this.storeThumbnail(imageId, thumbnail);

      // Store metadata
      await this.storeMetadata(imageId, {
        ...metadata,
        processingApplied: processedImage.processingApplied,
        qualityMetrics: processedImage.qualityMetrics,
        storagePaths: {
          original: originalPath,
          processed: storagePath,
          thumbnail: thumbnailPath
        }
      });

      return {
        success: true,
        imageId,
        metadata,
        storagePath,
        thumbnailPath
      };

    } catch (error) {
      console.error('Image upload failed:', error);
      return {
        success: false,
        imageId: '',
        metadata: {} as ImageMetadata,
        storagePath: '',
        errors: [`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Retrieve uploaded image
   */
  public async getImage(imageId: string, type: 'original' | 'processed' | 'thumbnail' = 'processed'): Promise<Buffer | null> {
    try {
      const metadata = await this.getImageMetadata(imageId);
      if (!metadata || !metadata.storagePaths) {
        return null;
      }

      const filePath = metadata.storagePaths[type];
      if (!filePath) {
        return null;
      }

      return await fs.readFile(filePath);
    } catch (error) {
      console.error(`Failed to retrieve image ${imageId}:`, error);
      return null;
    }
  }

  /**
   * Get image metadata
   */
  public async getImageMetadata(imageId: string): Promise<(ImageMetadata & { storagePaths?: any; processingApplied?: string[]; qualityMetrics?: any }) | null> {
    try {
      const metadataPath = path.join(this.storageConfig.uploadDir, `${imageId}.metadata.json`);
      const metadataContent = await fs.readFile(metadataPath, 'utf-8');
      return JSON.parse(metadataContent);
    } catch (error) {
      return null;
    }
  }

  /**
   * List images for a farmer
   */
  public async listFarmerImages(farmerId: string): Promise<Array<{ imageId: string; metadata: ImageMetadata }>> {
    try {
      const files = await fs.readdir(this.storageConfig.uploadDir);
      const metadataFiles = files.filter(file => file.endsWith('.metadata.json'));
      
      const farmerImages = [];
      
      for (const metadataFile of metadataFiles) {
        const imageId = metadataFile.replace('.metadata.json', '');
        const metadata = await this.getImageMetadata(imageId);
        
        if (metadata && metadata.farmerId === farmerId) {
          farmerImages.push({ imageId, metadata });
        }
      }

      // Sort by upload date (newest first)
      return farmerImages.sort((a, b) => 
        new Date(b.metadata.uploadedAt).getTime() - new Date(a.metadata.uploadedAt).getTime()
      );
    } catch (error) {
      console.error('Failed to list farmer images:', error);
      return [];
    }
  }

  /**
   * Delete image and associated files
   */
  public async deleteImage(imageId: string): Promise<boolean> {
    try {
      const metadata = await this.getImageMetadata(imageId);
      if (!metadata) {
        return false;
      }

      // Delete image files
      if (metadata.storagePaths) {
        for (const filePath of Object.values(metadata.storagePaths)) {
          try {
            await fs.unlink(filePath as string);
          } catch (error) {
            console.warn(`Failed to delete file ${filePath}:`, error);
          }
        }
      }

      // Delete metadata file
      const metadataPath = path.join(this.storageConfig.uploadDir, `${imageId}.metadata.json`);
      await fs.unlink(metadataPath);

      return true;
    } catch (error) {
      console.error(`Failed to delete image ${imageId}:`, error);
      return false;
    }
  }

  /**
   * Clean up old images based on retention policy
   */
  public async cleanupOldImages(): Promise<{ deleted: number; errors: string[] }> {
    const errors: string[] = [];
    let deleted = 0;

    try {
      const files = await fs.readdir(this.storageConfig.uploadDir);
      const metadataFiles = files.filter(file => file.endsWith('.metadata.json'));
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.storageConfig.retentionDays);

      for (const metadataFile of metadataFiles) {
        const imageId = metadataFile.replace('.metadata.json', '');
        const metadata = await this.getImageMetadata(imageId);
        
        if (metadata && new Date(metadata.uploadedAt) < cutoffDate) {
          const success = await this.deleteImage(imageId);
          if (success) {
            deleted++;
          } else {
            errors.push(`Failed to delete expired image: ${imageId}`);
          }
        }
      }
    } catch (error) {
      errors.push(`Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { deleted, errors };
  }

  /**
   * Get storage statistics
   */
  public async getStorageStats(): Promise<{
    totalImages: number;
    totalSize: number;
    availableSpace: number;
    oldestImage: Date | null;
    newestImage: Date | null;
  }> {
    try {
      const files = await fs.readdir(this.storageConfig.uploadDir);
      const imageFiles = files.filter(file => !file.endsWith('.metadata.json'));
      
      let totalSize = 0;
      let oldestDate: Date | null = null;
      let newestDate: Date | null = null;

      for (const file of files) {
        const filePath = path.join(this.storageConfig.uploadDir, file);
        const stats = await fs.stat(filePath);
        totalSize += stats.size;

        if (file.endsWith('.metadata.json')) {
          const imageId = file.replace('.metadata.json', '');
          const metadata = await this.getImageMetadata(imageId);
          if (metadata) {
            const uploadDate = new Date(metadata.uploadedAt);
            if (!oldestDate || uploadDate < oldestDate) {
              oldestDate = uploadDate;
            }
            if (!newestDate || uploadDate > newestDate) {
              newestDate = uploadDate;
            }
          }
        }
      }

      return {
        totalImages: imageFiles.length,
        totalSize,
        availableSpace: this.storageConfig.maxStorageSize - totalSize,
        oldestImage: oldestDate,
        newestImage: newestDate
      };
    } catch (error) {
      return {
        totalImages: 0,
        totalSize: 0,
        availableSpace: this.storageConfig.maxStorageSize,
        oldestImage: null,
        newestImage: null
      };
    }
  }

  /**
   * Generate unique image ID
   */
  private generateImageId(metadata: ImageMetadata): string {
    const timestamp = Date.now().toString();
    const farmerHash = crypto.createHash('md5').update(metadata.farmerId).digest('hex').substring(0, 8);
    const randomBytes = crypto.randomBytes(4).toString('hex');
    return `land_${timestamp}_${farmerHash}_${randomBytes}`;
  }

  /**
   * Store image file
   */
  private async storeImage(imageId: string, buffer: Buffer, type: string): Promise<string> {
    const filename = `${imageId}_${type}.jpg`;
    const filePath = path.join(this.storageConfig.uploadDir, filename);
    await fs.writeFile(filePath, buffer);
    return filePath;
  }

  /**
   * Store thumbnail
   */
  private async storeThumbnail(imageId: string, buffer: Buffer): Promise<string> {
    const filename = `${imageId}_thumb.jpg`;
    const filePath = path.join(this.storageConfig.thumbnailDir, filename);
    await fs.writeFile(filePath, buffer);
    return filePath;
  }

  /**
   * Store metadata
   */
  private async storeMetadata(imageId: string, metadata: any): Promise<void> {
    const filename = `${imageId}.metadata.json`;
    const filePath = path.join(this.storageConfig.uploadDir, filename);
    await fs.writeFile(filePath, JSON.stringify(metadata, null, 2));
  }
}

export default ImageUploadService;