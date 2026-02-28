const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

class ImageService {
  constructor() {
    this.s3Client = new S3Client({ region: process.env.REGION || 'ap-south-1' });
    this.bedrockClient = new BedrockRuntimeClient({ region: process.env.REGION || 'ap-south-1' });
    this.bucketName = process.env.BUCKET_NAME || 'gramai-storage-prod';
    this.modelId = 'anthropic.claude-3-haiku-20240307-v1:0';
  }

  async analyzeImage(imageBase64, farmerId, requestId) {
    try {
      // Save image to S3
      const imageKey = `images/${farmerId}/${requestId}.jpg`;
      await this.saveImageToS3(imageBase64, imageKey);

      // Analyze image using Bedrock multimodal
      const analysis = await this.analyzeWithBedrock(imageBase64);

      return {
        imageKey,
        summary: analysis.summary,
        symptoms: analysis.symptoms,
        confidence: analysis.confidence
      };
    } catch (error) {
      console.error('Image analysis error:', error);
      return {
        imageKey: null,
        summary: 'Image analysis unavailable',
        symptoms: [],
        confidence: 0
      };
    }
  }

  async saveImageToS3(imageBase64, key) {
    try {
      const imageBuffer = Buffer.from(imageBase64, 'base64');

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: imageBuffer,
        ContentType: 'image/jpeg',
        ServerSideEncryption: 'AES256'
      });

      await this.s3Client.send(command);
      console.log(`Image saved to S3: ${key}`);
    } catch (error) {
      console.error('S3 upload error:', error);
      throw error;
    }
  }

  async analyzeWithBedrock(imageBase64) {
    try {
      const prompt = `Analyze this agricultural image and provide:
1. A brief summary of what you see
2. Any visible symptoms or issues with the crop/plant
3. Your confidence level in the analysis (0-100)

Respond in JSON format:
{
  "summary": "Brief description",
  "symptoms": ["symptom1", "symptom2"],
  "confidence": 85
}`;

      const payload = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: imageBase64
                }
              },
              {
                type: 'text',
                text: prompt
              }
            ]
          }
        ]
      };

      const command = new InvokeModelCommand({
        modelId: this.modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(payload)
      });

      const response = await this.bedrockClient.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      
      const content = responseBody.content[0].text;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return {
        summary: content,
        symptoms: [],
        confidence: 50
      };
    } catch (error) {
      console.error('Bedrock image analysis error:', error);
      return {
        summary: 'Unable to analyze image',
        symptoms: [],
        confidence: 0
      };
    }
  }
}

module.exports = { ImageService };
