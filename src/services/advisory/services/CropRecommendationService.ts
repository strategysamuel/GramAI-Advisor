import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBClient, PutItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { TranslateClient, TranslateTextCommand } from '@aws-sdk/client-translate';

interface FarmerProfile {
  farmerId: string;
  location: {
    state: string;
    district: string;
    block: string;
  };
  landDetails: {
    totalArea: number;
    irrigatedArea: number;
    soilType?: string;
  };
  preferences: {
    cropsOfInterest: string[];
    organicFarming: boolean;
  };
}

interface CropRecommendation {
  cropName: string;
  localName: string;
  suitabilityScore: number;
  expectedYield: {
    min: number;
    max: number;
    unit: string;
  };
  inputRequirements: {
    seeds: string;
    fertilizers: string;
    water: string;
    labor: string;
  };
  marketDemand: string;
  riskFactors: string[];
  explanation: string;
}

interface Season {
  name: string;
  startMonth: number;
  endMonth: number;
}

export class CropRecommendationService {
  private bedrockClient: BedrockRuntimeClient;
  private dynamoClient: DynamoDBClient;
  private translateClient: TranslateClient;
  private readonly tableName = 'gramai-farmers';
  private readonly modelId = 'anthropic.claude-3-haiku-20240307-v1:0';

  constructor() {
    this.bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });
    this.dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
    this.translateClient = new TranslateClient({ region: process.env.AWS_REGION || 'us-east-1' });
  }

  async getCropRecommendations(
    profile: FarmerProfile,
    season: Season,
    language: string = 'en'
  ): Promise<CropRecommendation[]> {
    try {
      // Build the prompt for Bedrock
      const prompt = this.buildCropRecommendationPrompt(profile, season);

      // Call Bedrock for AI-powered recommendations
      const recommendations = await this.getBedrockRecommendations(prompt);

      // Translate if needed
      const translatedRecommendations = language !== 'en'
        ? await this.translateRecommendations(recommendations, language)
        : recommendations;

      // Store in DynamoDB
      await this.storeRecommendations(profile.farmerId, translatedRecommendations);

      return translatedRecommendations;
    } catch (error) {
      console.error('Error getting crop recommendations:', error);
      throw new Error('Failed to generate crop recommendations');
    }
  }

  private buildCropRecommendationPrompt(profile: FarmerProfile, season: Season): string {
    return `You are an expert agricultural advisor for Indian farmers. Provide crop recommendations based on the following farmer profile:

Location: ${profile.location.state}, ${profile.location.district}, ${profile.location.block}
Total Land Area: ${profile.landDetails.totalArea} acres
Irrigated Area: ${profile.landDetails.irrigatedArea} acres
Soil Type: ${profile.landDetails.soilType || 'Not specified'}
Season: ${season.name} (Months ${season.startMonth}-${season.endMonth})
Organic Farming Preference: ${profile.preferences.organicFarming ? 'Yes' : 'No'}
Crops of Interest: ${profile.preferences.cropsOfInterest.join(', ')}

Please provide 5 crop recommendations in JSON format with the following structure:
[
  {
    "cropName": "Crop name in English",
    "localName": "Crop name in local language",
    "suitabilityScore": 85,
    "expectedYield": {
      "min": 20,
      "max": 25,
      "unit": "quintals per acre"
    },
    "inputRequirements": {
      "seeds": "Seed requirements",
      "fertilizers": "Fertilizer requirements",
      "water": "Water requirements",
      "labor": "Labor requirements"
    },
    "marketDemand": "Current market demand status",
    "riskFactors": ["Risk factor 1", "Risk factor 2"],
    "explanation": "Detailed explanation of why this crop is suitable"
  }
]

Consider:
1. Climate suitability for the region and season
2. Soil type compatibility
3. Water availability (irrigated vs rainfed)
4. Market demand and profitability
5. Risk factors (pests, diseases, market volatility)
6. Sustainable farming practices
7. Local agricultural patterns

Provide practical, actionable recommendations suitable for Indian farmers.`;
  }

  private async getBedrockRecommendations(prompt: string): Promise<CropRecommendation[]> {
    const payload = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      top_p: 0.9
    };

    const command = new InvokeModelCommand({
      modelId: this.modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload)
    });

    const response = await this.bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    // Extract JSON from the response
    const content = responseBody.content[0].text;
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    
    if (!jsonMatch) {
      throw new Error('Failed to parse recommendations from Bedrock response');
    }

    return JSON.parse(jsonMatch[0]);
  }

  private async translateRecommendations(
    recommendations: CropRecommendation[],
    targetLanguage: string
  ): Promise<CropRecommendation[]> {
    const translatedRecommendations = await Promise.all(
      recommendations.map(async (rec) => {
        const translatedExplanation = await this.translateText(rec.explanation, targetLanguage);
        const translatedMarketDemand = await this.translateText(rec.marketDemand, targetLanguage);
        
        return {
          ...rec,
          explanation: translatedExplanation,
          marketDemand: translatedMarketDemand
        };
      })
    );

    return translatedRecommendations;
  }

  private async translateText(text: string, targetLanguage: string): Promise<string> {
    try {
      const command = new TranslateTextCommand({
        Text: text,
        SourceLanguageCode: 'en',
        TargetLanguageCode: targetLanguage
      });

      const response = await this.translateClient.send(command);
      return response.TranslatedText || text;
    } catch (error) {
      console.error('Translation error:', error);
      return text; // Return original text if translation fails
    }
  }

  private async storeRecommendations(
    farmerId: string,
    recommendations: CropRecommendation[]
  ): Promise<void> {
    const requestId = `crop-rec-${Date.now()}`;
    
    const command = new PutItemCommand({
      TableName: this.tableName,
      Item: {
        farmerId: { S: farmerId },
        requestId: { S: requestId },
        requestType: { S: 'crop_recommendation' },
        timestamp: { N: Date.now().toString() },
        recommendations: { S: JSON.stringify(recommendations) },
        ttl: { N: Math.floor(Date.now() / 1000 + 30 * 24 * 60 * 60).toString() } // 30 days TTL
      }
    });

    await this.dynamoClient.send(command);
  }

  async getHistoricalRecommendations(farmerId: string, limit: number = 10): Promise<any[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'farmerId = :farmerId AND begins_with(requestId, :prefix)',
      ExpressionAttributeValues: {
        ':farmerId': { S: farmerId },
        ':prefix': { S: 'crop-rec-' }
      },
      ScanIndexForward: false,
      Limit: limit
    });

    const response = await this.dynamoClient.send(command);
    return response.Items?.map(item => ({
      requestId: item.requestId.S,
      timestamp: parseInt(item.timestamp.N || '0'),
      recommendations: JSON.parse(item.recommendations.S || '[]')
    })) || [];
  }
}
