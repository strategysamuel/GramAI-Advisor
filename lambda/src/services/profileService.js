const { DynamoDBClient, GetItemCommand } = require('@aws-sdk/client-dynamodb');
const { unmarshall } = require('@aws-sdk/util-dynamodb');

class ProfileService {
  constructor() {
    this.dynamoClient = new DynamoDBClient({ region: process.env.REGION || 'ap-south-1' });
    this.tableName = process.env.TABLE_NAME || 'gramai-farmers';
  }

  async getProfile(farmerId) {
    try {
      const command = new GetItemCommand({
        TableName: this.tableName,
        Key: {
          farmerId: { S: farmerId },
          requestId: { S: 'profile' }
        }
      });

      const response = await this.dynamoClient.send(command);
      
      if (!response.Item) {
        console.log(`No profile found for farmer ${farmerId}, using defaults`);
        return this.getDefaultProfile(farmerId);
      }

      return unmarshall(response.Item);
    } catch (error) {
      console.error('Error fetching profile:', error);
      return this.getDefaultProfile(farmerId);
    }
  }

  getDefaultProfile(farmerId) {
    return {
      farmerId,
      personalInfo: {
        name: 'Farmer',
        experience: 5
      },
      landDetails: {
        totalArea: 2,
        irrigatedArea: 1,
        soilType: 'Loamy'
      },
      preferences: {
        organicFarming: false,
        cropsOfInterest: []
      }
    };
  }
}

module.exports = { ProfileService };
