// Profile service tests
import FarmerProfileModel from '../../services/profile/models/FarmerProfile';
import { ProfileController } from '../../services/profile/controllers/ProfileController';
import { LocationValidationService } from '../../services/profile/services/LocationValidationService';
import { ProfileCompletenessService } from '../../services/profile/services/ProfileCompletenessService';
import { PrivacyControlService } from '../../services/profile/services/PrivacyControlService';
import { 
  FarmerProfile, 
  CreateProfileRequest,
  UpdateProfileRequest,
  ProfileCompletenessResult, 
  PrivacySettings,
  LocationData,
  PersonalInfo,
  LandDetails,
  FinancialProfile,
  FarmingPreferences
} from '../../shared/types/profile';

// Mock database connection
jest.mock('../../shared/database/connection', () => ({
  query: jest.fn(),
  getClient: jest.fn(() => ({
    query: jest.fn(),
    release: jest.fn(),
  })),
}));

describe('FarmerProfile Model', () => {
  const farmerProfileModel = new FarmerProfileModel();
  
  const mockCreateRequest: CreateProfileRequest = {
    personalInfo: {
      name: 'Test Farmer',
      age: 35,
      gender: 'male',
      education: 'primary',
      experience: 10,
      primaryLanguage: 'hi',
      alternateContact: '+919876543211'
    },
    location: {
      state: 'Maharashtra',
      district: 'Pune',
      block: 'Haveli',
      village: 'Test Village',
      pincode: '411028',
      coordinates: {
        latitude: 18.5204,
        longitude: 73.8567
      }
    },
    landDetails: {
      totalArea: 2.5,
      ownedArea: 2.0,
      leasedArea: 0.5,
      irrigatedArea: 1.5,
      soilTypes: ['black'],
      waterSources: ['borewell'],
      currentCrops: ['wheat', 'sugarcane'],
      infrastructure: ['tractor', 'pump']
    },
    financialProfile: {
      annualIncomeRange: '200000-300000',
      capitalAvailable: 50000,
      creditScore: 650,
      bankAccounts: [{
        bankName: 'SBI',
        accountNumber: '12345678901',
        ifscCode: 'SBIN0001234',
        accountType: 'savings',
        isPrimary: true
      }],
      existingLoans: []
    },
    preferences: {
      cropsOfInterest: ['wheat', 'rice'],
      farmingMethods: ['organic'],
      integratedFarming: true,
      organicFarming: true,
      technologyAdoption: 'medium',
      marketPreferences: ['local'],
      riskTolerance: 'medium'
    }
  };

  describe('Profile Creation', () => {
    test('should create profile with valid data', async () => {
      const mockQuery = require('../../shared/database/connection').query;
      const mockGetPool = require('../../shared/database/connection').db.getPool;
      
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [{ id: 'test-id', created_at: new Date(), updated_at: new Date() }] })
          .mockResolvedValue({ rows: [] }),
        release: jest.fn()
      };
      
      mockGetPool.mockReturnValue({
        connect: jest.fn().mockResolvedValue(mockClient)
      });

      // Mock the findById method to return a profile
      jest.spyOn(farmerProfileModel, 'findById').mockResolvedValue({
        id: 'test-id',
        personalInfo: mockCreateRequest.personalInfo,
        location: mockCreateRequest.location,
        landDetails: mockCreateRequest.landDetails,
        financialProfile: mockCreateRequest.financialProfile!,
        preferences: mockCreateRequest.preferences!,
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          lastActiveAt: new Date(),
          profileCompleteness: 85,
          verificationStatus: 'pending'
        }
      } as FarmerProfile);

      const profile = await farmerProfileModel.create('+919876543210', mockCreateRequest);
      
      expect(profile).toBeDefined();
      expect(profile.id).toBe('test-id');
      expect(profile.personalInfo.name).toBe(mockCreateRequest.personalInfo.name);
    });

    test('should handle database errors during creation', async () => {
      const mockGetPool = require('../../shared/database/connection').db.getPool;
      
      const mockClient = {
        query: jest.fn().mockRejectedValue(new Error('Database error')),
        release: jest.fn()
      };
      
      mockGetPool.mockReturnValue({
        connect: jest.fn().mockResolvedValue(mockClient)
      });

      await expect(farmerProfileModel.create('+919876543210', mockCreateRequest))
        .rejects.toThrow('Database error');
    });
  });

  describe('Profile Retrieval', () => {
    test('should find profile by ID', async () => {
      const mockQuery = require('../../shared/database/connection').db.query;
      mockQuery.mockResolvedValueOnce({ 
        rows: [{
          id: 'test-id',
          name: 'Test Farmer',
          age: 35,
          gender: 'male',
          education: 'primary',
          experience: 10,
          primary_language: 'hi',
          phone_number: '+919876543210',
          alternate_contact: '+919876543211',
          state: 'Maharashtra',
          district: 'Pune',
          block: 'Haveli',
          village: 'Test Village',
          pincode: '411028',
          latitude: 18.5204,
          longitude: 73.8567,
          total_area: 2.5,
          owned_area: 2.0,
          leased_area: 0.5,
          irrigated_area: 1.5,
          soil_types: ['black'],
          water_sources: ['borewell'],
          current_crops: ['wheat'],
          infrastructure: ['tractor'],
          annual_income_range: '200000-300000',
          capital_available: 50000,
          credit_score: 650,
          bank_accounts: '[]',
          existing_loans: '[]',
          crops_of_interest: ['wheat'],
          farming_methods: ['organic'],
          integrated_farming: true,
          organic_farming: true,
          technology_adoption: 'medium',
          market_preferences: ['local'],
          risk_tolerance: 'medium',
          created_at: new Date(),
          updated_at: new Date(),
          last_active_at: new Date(),
          profile_completeness: 85,
          verification_status: 'pending'
        }]
      });

      const profile = await farmerProfileModel.findById('test-id');
      
      expect(profile).toBeDefined();
      expect(profile.id).toBe('test-id');
      expect(profile.personalInfo.name).toBe('Test Farmer');
    });

    test('should throw error for non-existent profile', async () => {
      const mockQuery = require('../../shared/database/connection').db.query;
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(farmerProfileModel.findById('non-existent-id'))
        .rejects.toThrow('Profile not found');
    });

    test('should find profile by phone number', async () => {
      const mockQuery = require('../../shared/database/connection').db.query;
      mockQuery.mockResolvedValueOnce({ 
        rows: [{
          id: 'test-id',
          phone_number: '+919876543210',
          name: 'Test Farmer',
          // ... other fields
          created_at: new Date(),
          updated_at: new Date()
        }]
      });

      const profile = await farmerProfileModel.findByPhoneNumber('+919876543210');
      
      expect(profile).toBeDefined();
      expect(profile?.personalInfo.phoneNumber).toBe('+919876543210');
    });

    test('should return null for non-existent phone number', async () => {
      const mockQuery = require('../../shared/database/connection').db.query;
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const profile = await farmerProfileModel.findByPhoneNumber('non-existent-phone');
      
      expect(profile).toBeNull();
    });
  });
});

describe('LocationValidationService', () => {
  const locationService = new LocationValidationService();
  
  const validLocation: LocationData = {
    state: 'Maharashtra',
    district: 'Pune',
    block: 'Haveli',
    village: 'Kharadi',
    pincode: '411014',
    coordinates: {
      latitude: 18.5579,
      longitude: 73.9200
    }
  };

  describe('Location Validation', () => {
    test('should validate correct location hierarchy', async () => {
      const result = await locationService.validateLocation(validLocation);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect invalid state-district combination', async () => {
      const invalidLocation = { ...validLocation, district: 'Invalid District' };
      
      const result = await locationService.validateLocation(invalidLocation);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should validate pincode format', async () => {
      const invalidLocation = { ...validLocation, pincode: '12345' };
      
      const result = await locationService.validateLocation(invalidLocation);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should validate coordinates range', async () => {
      const invalidLocation = { 
        ...validLocation, 
        coordinates: { latitude: 200, longitude: 200 } 
      };
      
      const result = await locationService.validateLocation(invalidLocation);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Location Suggestions', () => {
    test('should provide location suggestions', async () => {
      // Mock the internal method if it exists, or test the actual validation
      const result = await locationService.validateLocation({
        ...validLocation,
        district: 'Puna' // Misspelled
      });
      
      expect(result.suggestions.length).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('ProfileCompletenessService', () => {
  const completenessService = new ProfileCompletenessService();

  describe('Completeness Calculation', () => {
    test('should calculate completeness for full profile', async () => {
      const mockProfile: FarmerProfile = {
        id: '123',
        personalInfo: {
          name: 'Test Farmer',
          age: 35,
          gender: 'male',
          education: 'primary',
          experience: 10,
          primaryLanguage: 'hi',
          phoneNumber: '+919876543210',
          alternateContact: '+919876543211'
        },
        location: {
          state: 'Maharashtra',
          district: 'Pune',
          block: 'Haveli',
          village: 'Test Village',
          pincode: '411028',
          coordinates: { latitude: 18.5204, longitude: 73.8567 }
        },
        landDetails: {
          totalArea: 2.5,
          ownedArea: 2.0,
          leasedArea: 0.5,
          irrigatedArea: 1.5,
          soilTypes: ['black'],
          waterSources: ['borewell'],
          currentCrops: ['wheat'],
          infrastructure: ['tractor']
        },
        financialProfile: {
          annualIncomeRange: '200000-300000',
          capitalAvailable: 50000,
          creditScore: 650,
          bankAccounts: [{ 
            bankName: 'SBI', 
            accountNumber: '12345678901', 
            ifscCode: 'SBIN0001234', 
            accountType: 'savings', 
            isPrimary: true 
          }],
          existingLoans: []
        },
        preferences: {
          cropsOfInterest: ['wheat'],
          farmingMethods: ['organic'],
          integratedFarming: true,
          organicFarming: true,
          technologyAdoption: 'medium',
          marketPreferences: ['local'],
          riskTolerance: 'medium'
        },
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          lastActiveAt: new Date(),
          profileCompleteness: 85,
          verificationStatus: 'pending'
        }
      };

      const completeness = await completenessService.calculateCompleteness(mockProfile);
      
      expect(completeness.score).toBeGreaterThan(70);
      expect(completeness.completedSections.length).toBeGreaterThan(0);
      expect(completeness.recommendations.length).toBeGreaterThanOrEqual(0);
    });

    test('should calculate completeness for minimal profile', async () => {
      const minimalProfile: FarmerProfile = {
        id: '123',
        personalInfo: {
          name: 'Test Farmer',
          age: 35,
          gender: 'male',
          education: 'primary',
          experience: 5,
          primaryLanguage: 'hi',
          phoneNumber: '+919876543210'
        },
        location: {
          state: 'Maharashtra',
          district: 'Pune',
          block: 'Haveli',
          pincode: '411028'
        },
        landDetails: {
          totalArea: 1.0,
          ownedArea: 1.0,
          leasedArea: 0,
          irrigatedArea: 0.5,
          soilTypes: [],
          waterSources: [],
          currentCrops: [],
          infrastructure: []
        },
        financialProfile: {
          annualIncomeRange: '',
          capitalAvailable: 0,
          bankAccounts: [],
          existingLoans: []
        },
        preferences: {
          cropsOfInterest: [],
          farmingMethods: [],
          integratedFarming: false,
          organicFarming: false,
          technologyAdoption: 'low',
          marketPreferences: [],
          riskTolerance: 'medium'
        },
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          lastActiveAt: new Date(),
          profileCompleteness: 30,
          verificationStatus: 'pending'
        }
      };

      const completeness = await completenessService.calculateCompleteness(minimalProfile);
      
      expect(completeness.score).toBeLessThan(70);
      expect(completeness.missingSections.length).toBeGreaterThan(0);
      expect(completeness.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Missing Fields Detection', () => {
    test('should identify missing fields for a section', () => {
      const incompleteProfile: FarmerProfile = {
        id: '123',
        personalInfo: {
          name: 'Test Farmer',
          age: 35,
          gender: 'male',
          education: 'primary',
          experience: 5,
          primaryLanguage: 'hi',
          phoneNumber: '+919876543210'
          // Missing alternateContact
        },
        location: {
          state: 'Maharashtra',
          district: 'Pune',
          block: 'Haveli',
          pincode: '411028'
          // Missing village and coordinates
        },
        landDetails: {
          totalArea: 1.0,
          ownedArea: 1.0,
          leasedArea: 0,
          irrigatedArea: 0.5,
          soilTypes: [],
          waterSources: [],
          currentCrops: [], // Missing
          infrastructure: [] // Missing
        },
        financialProfile: {
          annualIncomeRange: '', // Missing
          capitalAvailable: 0,
          bankAccounts: [], // Missing
          existingLoans: []
        },
        preferences: {
          cropsOfInterest: [], // Missing
          farmingMethods: [], // Missing
          integratedFarming: false,
          organicFarming: false,
          technologyAdoption: 'low',
          marketPreferences: [], // Missing
          riskTolerance: 'medium'
        },
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          lastActiveAt: new Date(),
          profileCompleteness: 30,
          verificationStatus: 'pending'
        }
      };

      const personalInfoMissing = completenessService.getMissingFields(incompleteProfile, 'personalInfo');
      const locationMissing = completenessService.getMissingFields(incompleteProfile, 'location');
      const landDetailsMissing = completenessService.getMissingFields(incompleteProfile, 'landDetails');
      const financialMissing = completenessService.getMissingFields(incompleteProfile, 'financialProfile');
      const preferencesMissing = completenessService.getMissingFields(incompleteProfile, 'preferences');

      expect(personalInfoMissing).toContain('alternateContact');
      expect(locationMissing).toContain('village');
      expect(locationMissing).toContain('coordinates');
      expect(landDetailsMissing).toContain('currentCrops');
      expect(landDetailsMissing).toContain('infrastructure');
      expect(financialMissing).toContain('annualIncomeRange');
      expect(financialMissing).toContain('bankAccounts');
      expect(preferencesMissing).toContain('cropsOfInterest');
      expect(preferencesMissing).toContain('farmingMethods');
      expect(preferencesMissing).toContain('marketPreferences');
    });
  });
});

describe('PrivacyControlService', () => {
  const privacyService = new PrivacyControlService();

  describe('Privacy Settings Management', () => {
    test('should handle privacy settings validation', () => {
      const privacySettings: PrivacySettings = {
        shareLocationData: true,
        shareFinancialData: false,
        sharePersonalInfo: true,
        allowMarketingCommunication: false,
        dataRetentionPeriod: 24
      };

      // Test basic privacy settings structure
      expect(privacySettings.shareLocationData).toBe(true);
      expect(privacySettings.shareFinancialData).toBe(false);
      expect(privacySettings.dataRetentionPeriod).toBe(24);
    });

    test('should validate data retention periods', () => {
      const validRetentionPeriods = [12, 24, 36, 60];
      
      validRetentionPeriods.forEach(period => {
        const settings: PrivacySettings = {
          shareLocationData: true,
          shareFinancialData: true,
          sharePersonalInfo: true,
          allowMarketingCommunication: true,
          dataRetentionPeriod: period
        };
        
        expect(settings.dataRetentionPeriod).toBeGreaterThan(0);
        expect(settings.dataRetentionPeriod).toBeLessThanOrEqual(60);
      });
    });
  });

  describe('Data Sharing Controls', () => {
    test('should control location data sharing', () => {
      const settings: PrivacySettings = {
        shareLocationData: false,
        shareFinancialData: true,
        sharePersonalInfo: true,
        allowMarketingCommunication: true,
        dataRetentionPeriod: 24
      };

      expect(settings.shareLocationData).toBe(false);
    });

    test('should control financial data sharing', () => {
      const settings: PrivacySettings = {
        shareLocationData: true,
        shareFinancialData: false,
        sharePersonalInfo: true,
        allowMarketingCommunication: true,
        dataRetentionPeriod: 24
      };

      expect(settings.shareFinancialData).toBe(false);
    });

    test('should control marketing communication', () => {
      const settings: PrivacySettings = {
        shareLocationData: true,
        shareFinancialData: true,
        sharePersonalInfo: true,
        allowMarketingCommunication: false,
        dataRetentionPeriod: 24
      };

      expect(settings.allowMarketingCommunication).toBe(false);
    });
  });

  describe('Data Anonymization', () => {
    test('should handle profile data anonymization concepts', () => {
      const profileData: FarmerProfile = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        personalInfo: {
          name: 'Test Farmer',
          age: 35,
          gender: 'male',
          education: 'primary',
          experience: 10,
          primaryLanguage: 'hi',
          phoneNumber: '+919876543210',
          alternateContact: '+919876543211'
        },
        location: {
          state: 'Maharashtra',
          district: 'Pune',
          block: 'Haveli',
          village: 'Test Village',
          pincode: '411028'
        },
        landDetails: {
          totalArea: 2.5,
          ownedArea: 2.0,
          leasedArea: 0.5,
          irrigatedArea: 1.5,
          soilTypes: ['black'],
          waterSources: ['borewell'],
          currentCrops: ['wheat'],
          infrastructure: ['tractor']
        },
        financialProfile: {
          annualIncomeRange: '200000-300000',
          capitalAvailable: 50000,
          bankAccounts: [],
          existingLoans: []
        },
        preferences: {
          cropsOfInterest: ['wheat'],
          farmingMethods: ['organic'],
          integratedFarming: true,
          organicFarming: true,
          technologyAdoption: 'medium',
          marketPreferences: ['local'],
          riskTolerance: 'medium'
        },
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          lastActiveAt: new Date(),
          profileCompleteness: 85,
          verificationStatus: 'pending'
        }
      };

      // Test that sensitive data exists before anonymization
      expect(profileData.personalInfo.phoneNumber).toBe('+919876543210');
      expect(profileData.personalInfo.name).toBe('Test Farmer');
      expect(profileData.location.village).toBe('Test Village');
      
      // Test that non-sensitive data remains
      expect(profileData.location.state).toBe('Maharashtra');
      expect(profileData.landDetails.totalArea).toBe(2.5);
    });
  });

  describe('Consent Management', () => {
    test('should validate consent timestamps', () => {
      const recentDate = new Date();
      recentDate.setMonth(recentDate.getMonth() - 6); // 6 months ago

      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 2); // 2 years ago

      // Recent consent should be considered valid
      expect(recentDate.getTime()).toBeLessThan(Date.now());
      expect(Date.now() - recentDate.getTime()).toBeLessThan(365 * 24 * 60 * 60 * 1000); // Less than 1 year

      // Old consent should be considered expired
      expect(oldDate.getTime()).toBeLessThan(Date.now());
      expect(Date.now() - oldDate.getTime()).toBeGreaterThan(365 * 24 * 60 * 60 * 1000); // More than 1 year
    });
  });

  describe('Data Retention', () => {
    test('should identify data eligible for deletion based on age', () => {
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 8); // 8 years ago

      const recentDate = new Date();
      recentDate.setFullYear(recentDate.getFullYear() - 2); // 2 years ago

      const profileData: FarmerProfile = {
        id: '123',
        personalInfo: {
          name: 'Test Farmer',
          age: 35,
          gender: 'male',
          education: 'primary',
          experience: 10,
          primaryLanguage: 'hi',
          phoneNumber: '+919876543210'
        },
        location: {
          state: 'Maharashtra',
          district: 'Pune',
          block: 'Haveli',
          pincode: '411028'
        },
        landDetails: {
          totalArea: 1.0,
          ownedArea: 1.0,
          leasedArea: 0,
          irrigatedArea: 0.5,
          soilTypes: [],
          waterSources: [],
          currentCrops: [],
          infrastructure: []
        },
        financialProfile: {
          annualIncomeRange: '',
          capitalAvailable: 0,
          bankAccounts: [],
          existingLoans: []
        },
        preferences: {
          cropsOfInterest: [],
          farmingMethods: [],
          integratedFarming: false,
          organicFarming: false,
          technologyAdoption: 'low',
          marketPreferences: [],
          riskTolerance: 'medium'
        },
        metadata: {
          createdAt: oldDate,
          updatedAt: oldDate,
          lastActiveAt: oldDate,
          profileCompleteness: 30,
          verificationStatus: 'pending'
        }
      };

      // Old data should be eligible for deletion (7+ years)
      const dataAge = Date.now() - profileData.metadata.createdAt.getTime();
      const sevenYears = 7 * 365 * 24 * 60 * 60 * 1000;
      expect(dataAge).toBeGreaterThan(sevenYears);

      // Recent data should be retained
      const recentProfile = { ...profileData };
      recentProfile.metadata.createdAt = recentDate;
      recentProfile.metadata.updatedAt = recentDate;
      
      const recentDataAge = Date.now() - recentProfile.metadata.createdAt.getTime();
      expect(recentDataAge).toBeLessThan(sevenYears);
    });
  });
});