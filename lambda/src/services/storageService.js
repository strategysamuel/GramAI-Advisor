const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { marshall } = require('@aws-sdk/util-dynamodb');

class StorageService {
  constructor() {
    this.dynamoClient = new DynamoDBClient({ region: process.env.REGION || 'ap-south-1' });
    this.s3Client = new S3Client({ region: process.env.REGION || 'ap-south-1' });
    this.tableName = process.env.TABLE_NAME || 'gramai-farmers';
    this.bucketName = process.env.BUCKET_NAME || 'gramai-storage-prod';
  }

  async saveAdvisory(farmerId, requestId, data) {
    try {
      // Save to DynamoDB
      await this.saveToDynamoDB(farmerId, requestId, data);

      // Save detailed report to S3
      await this.saveToS3(farmerId, requestId, data);

      console.log(`Advisory saved successfully for ${farmerId}/${requestId}`);
    } catch (error) {
      console.error('Storage error:', error);
      throw error;
    }
  }

  async saveToDynamoDB(farmerId, requestId, data) {
    try {
      const item = {
        farmerId,
        requestId,
        requestType: 'advisory',
        query: data.query,
        detectedLanguage: data.detectedLanguage,
        diagnosis: data.advisory.diagnosis,
        riskLevel: data.advisory.riskLevel,
        confidence: data.advisory.confidence,
        timestamp: data.timestamp,
        ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90 days TTL
      };

      const command = new PutItemCommand({
        TableName: this.tableName,
        Item: marshall(item, { removeUndefinedValues: true })
      });

      await this.dynamoClient.send(command);
      console.log('Saved to DynamoDB');
    } catch (error) {
      console.error('DynamoDB save error:', error);
      throw error;
    }
  }

  async saveToS3(farmerId, requestId, data) {
    try {
      const key = `reports/${farmerId}/${requestId}.json`;
      
      const reportData = {
        farmerId,
        requestId,
        ...data,
        metadata: {
          savedAt: new Date().toISOString(),
          version: '1.0'
        }
      };

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: JSON.stringify(reportData, null, 2),
        ContentType: 'application/json',
        ServerSideEncryption: 'AES256'
      });

      await this.s3Client.send(command);
      console.log(`Saved to S3: ${key}`);
    } catch (error) {
      console.error('S3 save error:', error);
      throw error;
    }
  }
}

module.exports = { StorageService };
