import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBClient, PutItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';

interface SustainablePractice {
  id: string;
  name: string;
  category: 'soil_health' | 'water_conservation' | 'pest_management' | 'biodiversity' | 'energy_efficiency';
  description: string;
  benefits: string[];
  implementation: {
    steps: string[];
    resources: string[];
    timeline: string;
    cost: string;
  };
  suitability: {
    cropTypes: string[];
    landSize: string;
    climateZones: string[];
  };
  impact: {
    environmental: string;
    economic: string;
    social: string;
  };
}

interface IPMRecommendation {
  pestOrDisease: string;
  identification: string;
  preventiveMeasures: string[];
  organicTreatments: string[];
  chemicalTreatments?: string[];
  monitoringSchedule: string;
  safetyPrecautions: string[];
}

export class SustainableFarmingService {
  private bedrockClient: BedrockRuntimeClient;
  private dynamoClient: DynamoDBClient;
  private readonly tableName = 'gramai-farmers';
  private readonly modelId = 'anthropic.claude-3-haiku-20240307-v1:0';

  constructor() {
    this.bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });
    this.dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
  }

  async getSustainablePractices(
    cropType: string,
    landSize: number,
    location: { state: string; district: string }
  ): Promise<SustainablePractice[]> {
    try {
      const prompt = `You are an expert in sustainable agriculture for India. Provide sustainable farming practices for:

Crop Type: ${cropType}
Land Size: ${landSize} acres
Location: ${location.state}, ${location.district}

Provide 5 sustainable farming practices in JSON format:
[
  {
    "id": "practice-1",
    "name": "Practice name",
    "category": "soil_health|water_conservation|pest_management|biodiversity|energy_efficiency",
    "description": "Detailed description",
    "benefits": ["Benefit 1", "Benefit 2"],
    "implementation": {
      "steps": ["Step 1", "Step 2"],
      "resources": ["Resource 1", "Resource 2"],
      "timeline": "Implementation timeline",
      "cost": "Estimated cost range"
    },
    "suitability": {
      "cropTypes": ["Crop 1", "Crop 2"],
      "landSize": "Suitable land size",
      "climateZones": ["Zone 1", "Zone 2"]
    },
    "impact": {
      "environmental": "Environmental impact",
      "economic": "Economic impact",
      "social": "Social impact"
    }
  }
]

Focus on:
1. Organic farming methods
2. Water conservation techniques
3. Soil health improvement
4. Integrated pest management
5. Biodiversity enhancement
6. Energy-efficient practices
7. Climate-smart agriculture

Provide practical, cost-effective solutions suitable for Indian farmers.`;

      const practices = await this.getBedrockResponse<SustainablePractice[]>(prompt);
      
      // Store in DynamoDB for future reference
      await this.storePractices(cropType, location, practices);
      
      return practices;
    } catch (error) {
      console.error('Error getting sustainable practices:', error);
      throw new Error('Failed to generate sustainable farming practices');
    }
  }

  async getIPMRecommendations(
    symptoms: string[],
    cropType: string,
    organicOnly: boolean = false
  ): Promise<IPMRecommendation[]> {
    try {
      const prompt = `You are an expert in Integrated Pest Management (IPM) for Indian agriculture. Analyze the following:

Crop Type: ${cropType}
Symptoms: ${symptoms.join(', ')}
Organic Only: ${organicOnly ? 'Yes' : 'No'}

Provide IPM recommendations in JSON format:
[
  {
    "pestOrDisease": "Name of pest or disease",
    "identification": "How to identify this pest/disease",
    "preventiveMeasures": ["Prevention 1", "Prevention 2"],
    "organicTreatments": ["Organic treatment 1", "Organic treatment 2"],
    ${!organicOnly ? '"chemicalTreatments": ["Chemical treatment 1", "Chemical treatment 2"],' : ''}
    "monitoringSchedule": "How often to monitor",
    "safetyPrecautions": ["Safety 1", "Safety 2"]
  }
]

Focus on:
1. Accurate pest/disease identification
2. Preventive measures (cultural, biological, mechanical)
3. Organic treatment options (neem, bio-pesticides, etc.)
${!organicOnly ? '4. Chemical treatments as last resort with safety guidelines' : ''}
5. Monitoring and early detection
6. Farmer safety and environmental protection

Provide practical, safe, and effective IPM strategies.`;

      const recommendations = await this.getBedrockResponse<IPMRecommendation[]>(prompt);
      
      return recommendations;
    } catch (error) {
      console.error('Error getting IPM recommendations:', error);
      throw new Error('Failed to generate IPM recommendations');
    }
  }

  async getSoilHealthPractices(
    currentSoilCondition: {
      ph?: number;
      organicMatter?: number;
      nitrogen?: number;
      phosphorus?: number;
      potassium?: number;
    }
  ): Promise<SustainablePractice[]> {
    try {
      const prompt = `You are a soil health expert for Indian agriculture. Based on the following soil condition, recommend practices to improve soil health:

Current Soil Condition:
- pH: ${currentSoilCondition.ph || 'Not available'}
- Organic Matter: ${currentSoilCondition.organicMatter || 'Not available'}%
- Nitrogen (N): ${currentSoilCondition.nitrogen || 'Not available'} kg/ha
- Phosphorus (P): ${currentSoilCondition.phosphorus || 'Not available'} kg/ha
- Potassium (K): ${currentSoilCondition.potassium || 'Not available'} kg/ha

Provide soil health improvement practices in the same JSON format as sustainable practices, focusing on:
1. Organic matter enhancement (composting, green manure, crop residue management)
2. pH correction methods
3. Nutrient management (organic fertilizers, bio-fertilizers)
4. Soil structure improvement
5. Microbial activity enhancement
6. Erosion control
7. Water retention improvement

Provide 5 specific, actionable practices.`;

      const practices = await this.getBedrockResponse<SustainablePractice[]>(prompt);
      
      return practices;
    } catch (error) {
      console.error('Error getting soil health practices:', error);
      throw new Error('Failed to generate soil health practices');
    }
  }

  async getWaterConservationTechniques(
    landSize: number,
    waterAvailability: 'abundant' | 'moderate' | 'scarce',
    cropType: string
  ): Promise<SustainablePractice[]> {
    try {
      const prompt = `You are a water management expert for Indian agriculture. Recommend water conservation techniques for:

Land Size: ${landSize} acres
Water Availability: ${waterAvailability}
Crop Type: ${cropType}

Provide water conservation practices focusing on:
1. Drip irrigation systems
2. Sprinkler irrigation
3. Rainwater harvesting
4. Mulching techniques
5. Soil moisture conservation
6. Efficient irrigation scheduling
7. Drought-resistant crop varieties

Provide 5 practical water conservation techniques in the standard JSON format.`;

      const practices = await this.getBedrockResponse<SustainablePractice[]>(prompt);
      
      return practices;
    } catch (error) {
      console.error('Error getting water conservation techniques:', error);
      throw new Error('Failed to generate water conservation techniques');
    }
  }

  private async getBedrockResponse<T>(prompt: string): Promise<T> {
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
    
    const content = responseBody.content[0].text;
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    
    if (!jsonMatch) {
      throw new Error('Failed to parse response from Bedrock');
    }

    return JSON.parse(jsonMatch[0]);
  }

  private async storePractices(
    cropType: string,
    location: { state: string; district: string },
    practices: SustainablePractice[]
  ): Promise<void> {
    const requestId = `sustainable-${cropType}-${Date.now()}`;
    
    const command = new PutItemCommand({
      TableName: this.tableName,
      Item: {
        farmerId: { S: 'system' },
        requestId: { S: requestId },
        requestType: { S: 'sustainable_practices' },
        cropType: { S: cropType },
        location: { S: JSON.stringify(location) },
        timestamp: { N: Date.now().toString() },
        practices: { S: JSON.stringify(practices) },
        ttl: { N: Math.floor(Date.now() / 1000 + 90 * 24 * 60 * 60).toString() } // 90 days TTL
      }
    });

    await this.dynamoClient.send(command);
  }
}
