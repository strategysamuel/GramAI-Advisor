const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

class MarketService {
  constructor() {
    this.s3Client = new S3Client({ region: process.env.REGION || 'ap-south-1' });
    this.bucketName = process.env.BUCKET_NAME || 'gramai-storage-prod';
  }

  async getMarketData(crop, state, district) {
    try {
      // Fetch market data from S3
      const marketData = await this.fetchMarketDataFromS3();

      // Filter and calculate for specific crop and location
      const relevantData = this.filterMarketData(marketData, crop, state, district);

      return relevantData;
    } catch (error) {
      console.error('Market data fetch error:', error);
      return this.getDefaultMarketData(crop);
    }
  }

  async fetchMarketDataFromS3() {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: 'market-data/prices.json'
      });

      const response = await this.s3Client.send(command);
      const data = await this.streamToString(response.Body);
      return JSON.parse(data);
    } catch (error) {
      console.error('S3 market data fetch error:', error);
      return this.getDefaultMarketDataSet();
    }
  }

  filterMarketData(marketData, crop, state, district) {
    const cropData = marketData.find(m => 
      m.crop.toLowerCase() === (crop || '').toLowerCase()
    );

    if (!cropData) {
      return this.getDefaultMarketData(crop);
    }

    // Calculate transport costs and net price
    const basePrice = cropData.price;
    const transportCost = this.calculateTransportCost(district);
    const marketFees = basePrice * 0.02; // 2% market fees
    const netPrice = basePrice - transportCost - marketFees;

    return {
      crop: cropData.crop,
      currentPrice: basePrice,
      unit: cropData.unit,
      market: cropData.market,
      state: state || cropData.state,
      district: district || cropData.district,
      transportCost,
      marketFees,
      netPrice,
      priceRange: cropData.priceRange,
      demand: cropData.demand,
      trend: cropData.trend,
      lastUpdated: cropData.lastUpdated || new Date().toISOString()
    };
  }

  calculateTransportCost(district) {
    // Simple transport cost calculation
    // In production, use actual distance and rates
    const baseCost = 50; // Base cost in INR per quintal
    const districtFactor = (district || '').length % 3 + 1; // Simple heuristic
    return baseCost * districtFactor;
  }

  getDefaultMarketData(crop) {
    return {
      crop: crop || 'Paddy',
      currentPrice: 2000,
      unit: 'per quintal',
      market: 'Local Mandi',
      state: 'Tamil Nadu',
      district: 'Thanjavur',
      transportCost: 100,
      marketFees: 40,
      netPrice: 1860,
      priceRange: { min: 1800, max: 2200 },
      demand: 'High',
      trend: 'Stable',
      lastUpdated: new Date().toISOString()
    };
  }

  getDefaultMarketDataSet() {
    return [
      {
        crop: 'Paddy',
        price: 2000,
        unit: 'per quintal',
        market: 'Thanjavur Mandi',
        state: 'Tamil Nadu',
        district: 'Thanjavur',
        priceRange: { min: 1800, max: 2200 },
        demand: 'High',
        trend: 'Stable'
      },
      {
        crop: 'Wheat',
        price: 2100,
        unit: 'per quintal',
        market: 'Delhi Mandi',
        state: 'Delhi',
        district: 'Central',
        priceRange: { min: 1900, max: 2300 },
        demand: 'Moderate',
        trend: 'Rising'
      },
      {
        crop: 'Cotton',
        price: 6500,
        unit: 'per quintal',
        market: 'Gujarat Mandi',
        state: 'Gujarat',
        district: 'Ahmedabad',
        priceRange: { min: 6000, max: 7000 },
        demand: 'High',
        trend: 'Rising'
      }
    ];
  }

  async streamToString(stream) {
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString('utf-8');
  }
}

module.exports = { MarketService };
