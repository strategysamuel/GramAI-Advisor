const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

class SchemeService {
  constructor() {
    this.s3Client = new S3Client({ region: process.env.REGION || 'ap-south-1' });
    this.bucketName = process.env.BUCKET_NAME || 'gramai-storage-prod';
  }

  async getRelevantSchemes(state, landSize) {
    try {
      // Fetch schemes from S3
      const schemes = await this.fetchSchemesFromS3();

      // Filter based on state and land size
      const relevantSchemes = this.filterSchemes(schemes, state, landSize);

      return relevantSchemes;
    } catch (error) {
      console.error('Scheme fetch error:', error);
      return this.getDefaultSchemes(state);
    }
  }

  async fetchSchemesFromS3() {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: 'scheme-data/schemes.json'
      });

      const response = await this.s3Client.send(command);
      const data = await this.streamToString(response.Body);
      return JSON.parse(data);
    } catch (error) {
      console.error('S3 scheme fetch error:', error);
      return this.getDefaultSchemeSet();
    }
  }

  filterSchemes(schemes, state, landSize) {
    return schemes
      .filter(scheme => {
        // Filter by state (if applicable)
        if (scheme.applicableStates && scheme.applicableStates.length > 0) {
          if (!scheme.applicableStates.includes(state) && !scheme.applicableStates.includes('All')) {
            return false;
          }
        }

        // Filter by land size
        if (scheme.minLandSize && landSize < scheme.minLandSize) {
          return false;
        }
        if (scheme.maxLandSize && landSize > scheme.maxLandSize) {
          return false;
        }

        return true;
      })
      .sort((a, b) => (b.priority || 0) - (a.priority || 0))
      .slice(0, 5); // Return top 5 schemes
  }

  getDefaultSchemes(state) {
    const schemes = this.getDefaultSchemeSet();
    return this.filterSchemes(schemes, state, 2);
  }

  getDefaultSchemeSet() {
    return [
      {
        id: 'PM-KISAN',
        name: 'PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)',
        category: 'Income Support',
        level: 'Central',
        description: 'Direct income support of ₹6000 per year to all farmer families',
        benefits: [
          {
            type: 'Financial',
            amount: 6000,
            description: '₹2000 per installment, 3 times a year'
          }
        ],
        eligibility: {
          criteria: ['All farmer families', 'Land ownership proof required'],
          documents: ['Aadhaar', 'Bank account', 'Land records']
        },
        applicableStates: ['All'],
        minLandSize: 0,
        maxLandSize: null,
        priority: 10,
        website: 'https://pmkisan.gov.in'
      },
      {
        id: 'PMFBY',
        name: 'Pradhan Mantri Fasal Bima Yojana',
        category: 'Crop Insurance',
        level: 'Central',
        description: 'Comprehensive crop insurance scheme for all farmers',
        benefits: [
          {
            type: 'Insurance',
            description: 'Coverage against crop loss due to natural calamities'
          }
        ],
        eligibility: {
          criteria: ['All farmers', 'Enrolled for the season'],
          documents: ['Aadhaar', 'Bank account', 'Land records', 'Crop details']
        },
        applicableStates: ['All'],
        minLandSize: 0,
        maxLandSize: null,
        priority: 9,
        website: 'https://pmfby.gov.in'
      },
      {
        id: 'KCC',
        name: 'Kisan Credit Card',
        category: 'Credit',
        level: 'Central',
        description: 'Credit facility for farmers to meet agricultural expenses',
        benefits: [
          {
            type: 'Credit',
            description: 'Low-interest credit up to ₹3 lakhs'
          }
        ],
        eligibility: {
          criteria: ['Farmers with land ownership', 'Good credit history'],
          documents: ['Aadhaar', 'PAN', 'Land records', 'Bank account']
        },
        applicableStates: ['All'],
        minLandSize: 0.5,
        maxLandSize: null,
        priority: 8,
        website: 'https://www.nabard.org/kcc.aspx'
      },
      {
        id: 'SOIL-HEALTH',
        name: 'Soil Health Card Scheme',
        category: 'Soil Management',
        level: 'Central',
        description: 'Free soil testing and health card for farmers',
        benefits: [
          {
            type: 'Service',
            description: 'Free soil testing and nutrient recommendations'
          }
        ],
        eligibility: {
          criteria: ['All farmers'],
          documents: ['Aadhaar', 'Land records']
        },
        applicableStates: ['All'],
        minLandSize: 0,
        maxLandSize: null,
        priority: 7,
        website: 'https://soilhealth.dac.gov.in'
      },
      {
        id: 'PMKSY',
        name: 'Pradhan Mantri Krishi Sinchayee Yojana',
        category: 'Irrigation',
        level: 'Central',
        description: 'Subsidy for micro-irrigation systems',
        benefits: [
          {
            type: 'Subsidy',
            percentage: 55,
            description: '55% subsidy on drip/sprinkler irrigation'
          }
        ],
        eligibility: {
          criteria: ['Farmers with irrigation needs', 'Land ownership'],
          documents: ['Aadhaar', 'Land records', 'Bank account']
        },
        applicableStates: ['All'],
        minLandSize: 0.5,
        maxLandSize: null,
        priority: 6,
        website: 'https://pmksy.gov.in'
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

module.exports = { SchemeService };
