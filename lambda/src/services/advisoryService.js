const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

class AdvisoryService {
  constructor() {
    this.bedrockClient = new BedrockRuntimeClient({ region: process.env.REGION || 'ap-south-1' });
    this.modelId = 'anthropic.claude-3-haiku-20240307-v1:0';
  }

  async generateAdvisory(context) {
    try {
      const prompt = this.buildPrompt(context);
      const advisory = await this.callBedrock(prompt);
      return advisory;
    } catch (error) {
      console.error('Advisory generation error:', error);
      return this.getDefaultAdvisory(context);
    }
  }

  buildPrompt(context) {
    const {
      query,
      state,
      district,
      crop,
      season,
      farmerProfile,
      imageAnalysis,
      marketData,
      schemes
    } = context;

    return `You are an expert agricultural advisor for Indian farmers. Provide comprehensive advice based on the following information:

FARMER QUERY: ${query}

LOCATION:
- State: ${state || 'Not specified'}
- District: ${district || 'Not specified'}

CROP INFORMATION:
- Crop: ${crop || 'Not specified'}
- Season: ${season || 'Not specified'}

FARMER PROFILE:
- Land Size: ${farmerProfile?.landDetails?.totalArea || 'Not specified'} acres
- Irrigated Area: ${farmerProfile?.landDetails?.irrigatedArea || 'Not specified'} acres
- Soil Type: ${farmerProfile?.landDetails?.soilType || 'Not specified'}
- Farming Experience: ${farmerProfile?.personalInfo?.experience || 'Not specified'} years
- Organic Farming: ${farmerProfile?.preferences?.organicFarming ? 'Yes' : 'No'}

${imageAnalysis ? `IMAGE ANALYSIS:
- Summary: ${imageAnalysis.summary}
- Symptoms: ${imageAnalysis.symptoms.join(', ')}
- Confidence: ${imageAnalysis.confidence}%
` : ''}

MARKET DATA:
- Current Price: ₹${marketData?.currentPrice || 'N/A'} ${marketData?.unit || ''}
- Price Range: ₹${marketData?.priceRange?.min || 'N/A'} - ₹${marketData?.priceRange?.max || 'N/A'}
- Market Demand: ${marketData?.demand || 'N/A'}
- Price Trend: ${marketData?.trend || 'N/A'}
- Net Price (after costs): ₹${marketData?.netPrice || 'N/A'}

RELEVANT GOVERNMENT SCHEMES:
${schemes.slice(0, 3).map(s => `- ${s.name}: ${s.description}`).join('\n')}

Please provide a comprehensive advisory in the following JSON format:
{
  "diagnosis": "Clear diagnosis of the issue or situation",
  "treatment": "Detailed treatment or action plan with specific steps",
  "riskLevel": "Low|Medium|High",
  "marketInsight": "Market-related advice and selling recommendations",
  "schemeSuggestion": "Relevant government scheme recommendations",
  "explanation": "Detailed explanation in simple, farmer-friendly language",
  "confidence": 85
}

IMPORTANT GUIDELINES:
1. Use simple, practical language suitable for Indian farmers
2. Provide specific, actionable recommendations
3. Consider local agricultural practices and climate
4. Include timing and resource requirements
5. Mention safety precautions if using chemicals
6. Suggest organic alternatives when possible
7. Be realistic about expected outcomes
8. Include cost estimates where relevant

Provide your response in valid JSON format only.`;
  }

  async callBedrock(prompt) {
    try {
      const payload = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 2000,
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
      
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback: create structured response from text
      return {
        diagnosis: 'Analysis based on provided information',
        treatment: content,
        riskLevel: 'Medium',
        marketInsight: 'Consult local market for current prices',
        schemeSuggestion: 'Check eligibility for government schemes',
        explanation: content,
        confidence: 70
      };
    } catch (error) {
      console.error('Bedrock call error:', error);
      throw error;
    }
  }

  getDefaultAdvisory(context) {
    return {
      diagnosis: `Analysis for ${context.crop || 'crop'} in ${context.state || 'your region'}`,
      treatment: 'Please consult with a local agricultural expert for specific recommendations based on your situation.',
      riskLevel: 'Medium',
      marketInsight: context.marketData 
        ? `Current market price is ₹${context.marketData.currentPrice} ${context.marketData.unit}. Demand is ${context.marketData.demand}.`
        : 'Check local market prices before selling.',
      schemeSuggestion: context.schemes && context.schemes.length > 0
        ? `Consider applying for: ${context.schemes[0].name}`
        : 'Check PM-KISAN and other central schemes for support.',
      explanation: 'This is a general advisory. For specific recommendations, please provide more details about your situation.',
      confidence: 50
    };
  }
}

module.exports = { AdvisoryService };
