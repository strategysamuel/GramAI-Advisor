const { LanguageService } = require('./services/languageService');
const { ProfileService } = require('./services/profileService');
const { ImageService } = require('./services/imageService');
const { MarketService } = require('./services/marketService');
const { SchemeService } = require('./services/schemeService');
const { AdvisoryService } = require('./services/advisoryService');
const { StorageService } = require('./services/storageService');

const languageService = new LanguageService();
const profileService = new ProfileService();
const imageService = new ImageService();
const marketService = new MarketService();
const schemeService = new SchemeService();
const advisoryService = new AdvisoryService();
const storageService = new StorageService();

exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  try {
    // Parse request body
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    
    const {
      farmerId,
      query,
      state,
      district,
      crop,
      season,
      imageBase64,
      language = 'en'
    } = body;

    // Validate required fields
    if (!farmerId || !query) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Missing required fields: farmerId and query are required'
        })
      };
    }

    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log(`Processing request ${requestId} for farmer ${farmerId}`);

    // Step 1: Language Detection and Translation
    console.log('Step 1: Language processing');
    const detectedLanguage = await languageService.detectLanguage(query);
    const translatedQuery = detectedLanguage !== 'en' 
      ? await languageService.translateToEnglish(query, detectedLanguage)
      : query;

    // Step 2: Fetch Farmer Profile
    console.log('Step 2: Fetching farmer profile');
    const farmerProfile = await profileService.getProfile(farmerId);

    // Step 3: Process Image if provided
    let imageAnalysis = null;
    if (imageBase64) {
      console.log('Step 3: Processing image');
      imageAnalysis = await imageService.analyzeImage(
        imageBase64,
        farmerId,
        requestId
      );
    }

    // Step 4: Fetch Market Data
    console.log('Step 4: Fetching market data');
    const marketData = await marketService.getMarketData(crop, state, district);

    // Step 5: Fetch Relevant Schemes
    console.log('Step 5: Fetching government schemes');
    const schemes = await schemeService.getRelevantSchemes(
      state,
      farmerProfile?.landDetails?.totalArea || 0
    );

    // Step 6: Generate AI Advisory
    console.log('Step 6: Generating AI advisory');
    const advisory = await advisoryService.generateAdvisory({
      query: translatedQuery,
      farmerId,
      state,
      district,
      crop,
      season,
      farmerProfile,
      imageAnalysis,
      marketData,
      schemes
    });

    // Step 7: Translate Response if needed
    console.log('Step 7: Translating response');
    const translatedAdvisory = language !== 'en'
      ? await languageService.translateResponse(advisory, language)
      : advisory;

    // Step 8: Store Results
    console.log('Step 8: Storing results');
    await storageService.saveAdvisory(farmerId, requestId, {
      query,
      detectedLanguage,
      translatedQuery,
      advisory: translatedAdvisory,
      imageAnalysis,
      marketData,
      schemes,
      timestamp: new Date().toISOString()
    });

    // Return response
    const response = {
      requestId,
      farmerId,
      detectedLanguage,
      advisory: translatedAdvisory,
      marketInsights: marketData,
      relevantSchemes: schemes.slice(0, 3), // Top 3 schemes
      imageAnalysis: imageAnalysis ? {
        summary: imageAnalysis.summary,
        confidence: imageAnalysis.confidence
      } : null,
      timestamp: new Date().toISOString()
    };

    console.log('Request processed successfully');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('Error processing request:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        requestId: `error-${Date.now()}`
      })
    };
  }
};
