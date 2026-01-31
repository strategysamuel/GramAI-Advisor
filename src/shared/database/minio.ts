// MinIO object storage management
import * as Minio from 'minio';
import { appConfig } from '../config';

class MinIOConnection {
  private static instance: MinIOConnection;
  private client: Minio.Client | null = null;

  private constructor() {}

  public static getInstance(): MinIOConnection {
    if (!MinIOConnection.instance) {
      MinIOConnection.instance = new MinIOConnection();
    }
    return MinIOConnection.instance;
  }

  public async connect(): Promise<Minio.Client> {
    if (!this.client) {
      this.client = new Minio.Client({
        endPoint: appConfig.storage.minio.endpoint,
        port: appConfig.storage.minio.port,
        useSSL: false, // Set to true in production with HTTPS
        accessKey: appConfig.storage.minio.accessKey,
        secretKey: appConfig.storage.minio.secretKey,
      });

      // Test connection and create bucket if it doesn't exist
      await this.ensureBucketExists(appConfig.storage.minio.bucketName);
      
      console.log('MinIO connected successfully');
    }
    
    return this.client;
  }

  public getClient(): Minio.Client {
    if (!this.client) {
      throw new Error('MinIO not connected. Call connect() first.');
    }
    return this.client;
  }

  // Bucket operations
  public async ensureBucketExists(bucketName: string): Promise<void> {
    const client = this.getClient();
    
    const exists = await client.bucketExists(bucketName);
    if (!exists) {
      await client.makeBucket(bucketName, 'us-east-1');
      console.log(`MinIO bucket '${bucketName}' created`);
    }
  }

  public async listBuckets(): Promise<Minio.BucketItem[]> {
    const client = this.getClient();
    return await client.listBuckets();
  }

  // Object operations
  public async uploadFile(
    bucketName: string,
    objectName: string,
    filePath: string,
    metaData?: Minio.ItemBucketMetadata
  ): Promise<Minio.UploadedObjectInfo> {
    const client = this.getClient();
    return await client.fPutObject(bucketName, objectName, filePath, metaData);
  }

  public async uploadBuffer(
    bucketName: string,
    objectName: string,
    buffer: Buffer,
    metaData?: Minio.ItemBucketMetadata
  ): Promise<Minio.UploadedObjectInfo> {
    const client = this.getClient();
    return await client.putObject(bucketName, objectName, buffer, metaData);
  }

  public async downloadFile(
    bucketName: string,
    objectName: string,
    filePath: string
  ): Promise<void> {
    const client = this.getClient();
    await client.fGetObject(bucketName, objectName, filePath);
  }

  public async getObject(bucketName: string, objectName: string): Promise<Buffer> {
    const client = this.getClient();
    const stream = await client.getObject(bucketName, objectName);
    
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  public async deleteObject(bucketName: string, objectName: string): Promise<void> {
    const client = this.getClient();
    await client.removeObject(bucketName, objectName);
  }

  public async listObjects(
    bucketName: string,
    prefix?: string,
    recursive: boolean = false
  ): Promise<Minio.BucketItem[]> {
    const client = this.getClient();
    const objects: Minio.BucketItem[] = [];
    
    return new Promise((resolve, reject) => {
      const stream = client.listObjects(bucketName, prefix, recursive);
      stream.on('data', (obj) => objects.push(obj));
      stream.on('end', () => resolve(objects));
      stream.on('error', reject);
    });
  }

  // Presigned URL operations
  public async getPresignedUrl(
    bucketName: string,
    objectName: string,
    expiry: number = 24 * 60 * 60 // 24 hours
  ): Promise<string> {
    const client = this.getClient();
    return await client.presignedGetObject(bucketName, objectName, expiry);
  }

  public async getPresignedUploadUrl(
    bucketName: string,
    objectName: string,
    expiry: number = 24 * 60 * 60 // 24 hours
  ): Promise<string> {
    const client = this.getClient();
    return await client.presignedPutObject(bucketName, objectName, expiry);
  }

  // Object metadata
  public async getObjectStat(bucketName: string, objectName: string): Promise<Minio.BucketItemStat> {
    const client = this.getClient();
    return await client.statObject(bucketName, objectName);
  }

  public async copyObject(
    sourceBucket: string,
    sourceObject: string,
    destBucket: string,
    destObject: string
  ): Promise<Minio.BucketItemCopy> {
    const client = this.getClient();
    const conds = new Minio.CopyConditions();
    return await client.copyObject(destBucket, destObject, `/${sourceBucket}/${sourceObject}`, conds);
  }
}

export const minio = MinIOConnection.getInstance();
export default minio;