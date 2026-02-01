// Profile Controller - handles HTTP requests for profile operations
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { FarmerProfileModel } from '../models/FarmerProfile';
import { AuthenticatedRequest } from '../../../shared/middleware/auth';
import { ApiResponse } from '../../../shared/types';
import { CreateProfileRequest, UpdateProfileRequest, ProfileResponse } from '../../../shared/types/profile';
import { ProfileCompletenessService } from '../services/ProfileCompletenessService';
import { LocationValidationService } from '../services/LocationValidationService';
import { PrivacyControlService } from '../services/PrivacyControlService';

export class ProfileController {
  private profileModel: FarmerProfileModel;
  private completenessService: ProfileCompletenessService;
  private locationService: LocationValidationService;
  private privacyService: PrivacyControlService;

  constructor() {
    this.profileModel = new FarmerProfileModel();
    this.completenessService = new ProfileCompletenessService();
    this.locationService = new LocationValidationService();
    this.privacyService = new PrivacyControlService();
  }

  // Validation schemas
  private createProfileSchema = Joi.object({
    personalInfo: Joi.object({
      name: Joi.string().min(2).max(100).required(),
      age: Joi.number().integer().min(18).max(100).required(),
      gender: Joi.string().valid('male', 'female', 'other').required(),
      education: Joi.string().valid('none', 'primary', 'secondary', 'higher_secondary', 'graduate', 'postgraduate').required(),
      experience: Joi.number().integer().min(0).max(80).required(),
      primaryLanguage: Joi.string().valid('hi', 'ta', 'te', 'bn', 'mr', 'gu', 'en').required(),
      alternateContact: Joi.string().pattern(/^[+]?[1-9][\d\s\-\(\)]{7,15}$/).optional()
    }).required(),
    location: Joi.object({
      state: Joi.string().min(2).max(50).required(),
      district: Joi.string().min(2).max(50).required(),
      block: Joi.string().min(2).max(50).required(),
      village: Joi.string().min(2).max(50).optional(),
      pincode: Joi.string().pattern(/^[0-9]{6}$/).required(),
      coordinates: Joi.object({
        latitude: Joi.number().min(-90).max(90).required(),
        longitude: Joi.number().min(-180).max(180).required()
      }).optional()
    }).required(),
    landDetails: Joi.object({
      totalArea: Joi.number().positive().required(),
      ownedArea: Joi.number().min(0).required(),
      leasedArea: Joi.number().min(0).required(),
      irrigatedArea: Joi.number().min(0).required(),
      soilTypes: Joi.array().items(Joi.string()).min(1).required(),
      waterSources: Joi.array().items(Joi.string()).min(1).required(),
      currentCrops: Joi.array().items(Joi.string()).default([]),
      infrastructure: Joi.array().items(Joi.string()).default([])
    }).required(),
    financialProfile: Joi.object({
      annualIncomeRange: Joi.string().optional(),
      capitalAvailable: Joi.number().min(0).optional(),
      creditScore: Joi.number().integer().min(300).max(850).optional(),
      bankAccounts: Joi.array().items(Joi.object({
        bankName: Joi.string().required(),
        accountNumber: Joi.string().required(),
        ifscCode: Joi.string().pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/).required(),
        accountType: Joi.string().valid('savings', 'current').required(),
        isPrimary: Joi.boolean().required()
      })).optional(),
      existingLoans: Joi.array().items(Joi.object({
        loanType: Joi.string().required(),
        amount: Joi.number().positive().required(),
        outstandingAmount: Joi.number().min(0).required(),
        institution: Joi.string().required(),
        startDate: Joi.date().required(),
        endDate: Joi.date().greater(Joi.ref('startDate')).required(),
        status: Joi.string().valid('active', 'closed', 'defaulted').required()
      })).optional()
    }).optional(),
    preferences: Joi.object({
      cropsOfInterest: Joi.array().items(Joi.string()).optional(),
      farmingMethods: Joi.array().items(Joi.string()).optional(),
      integratedFarming: Joi.boolean().optional(),
      organicFarming: Joi.boolean().optional(),
      technologyAdoption: Joi.string().valid('low', 'medium', 'high').optional(),
      marketPreferences: Joi.array().items(Joi.string()).optional(),
      riskTolerance: Joi.string().valid('low', 'medium', 'high').optional()
    }).optional()
  });

  private updateProfileSchema = Joi.object({
    personalInfo: Joi.object({
      name: Joi.string().min(2).max(100).optional(),
      age: Joi.number().integer().min(18).max(100).optional(),
      gender: Joi.string().valid('male', 'female', 'other').optional(),
      education: Joi.string().valid('none', 'primary', 'secondary', 'higher_secondary', 'graduate', 'postgraduate').optional(),
      experience: Joi.number().integer().min(0).max(80).optional(),
      primaryLanguage: Joi.string().valid('hi', 'ta', 'te', 'bn', 'mr', 'gu', 'en').optional(),
      alternateContact: Joi.string().pattern(/^[+]?[1-9][\d\s\-\(\)]{7,15}$/).optional()
    }).optional(),
    location: Joi.object({
      state: Joi.string().min(2).max(50).optional(),
      district: Joi.string().min(2).max(50).optional(),
      block: Joi.string().min(2).max(50).optional(),
      village: Joi.string().min(2).max(50).optional(),
      pincode: Joi.string().pattern(/^[0-9]{6}$/).optional(),
      coordinates: Joi.object({
        latitude: Joi.number().min(-90).max(90).required(),
        longitude: Joi.number().min(-180).max(180).required()
      }).optional()
    }).optional(),
    landDetails: Joi.object({
      totalArea: Joi.number().positive().optional(),
      ownedArea: Joi.number().min(0).optional(),
      leasedArea: Joi.number().min(0).optional(),
      irrigatedArea: Joi.number().min(0).optional(),
      soilTypes: Joi.array().items(Joi.string()).min(1).optional(),
      waterSources: Joi.array().items(Joi.string()).min(1).optional(),
      currentCrops: Joi.array().items(Joi.string()).optional(),
      infrastructure: Joi.array().items(Joi.string()).optional()
    }).optional(),
    financialProfile: Joi.object({
      annualIncomeRange: Joi.string().optional(),
      capitalAvailable: Joi.number().min(0).optional(),
      creditScore: Joi.number().integer().min(300).max(850).optional(),
      bankAccounts: Joi.array().items(Joi.object({
        bankName: Joi.string().required(),
        accountNumber: Joi.string().required(),
        ifscCode: Joi.string().pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/).required(),
        accountType: Joi.string().valid('savings', 'current').required(),
        isPrimary: Joi.boolean().required()
      })).optional(),
      existingLoans: Joi.array().items(Joi.object({
        loanType: Joi.string().required(),
        amount: Joi.number().positive().required(),
        outstandingAmount: Joi.number().min(0).required(),
        institution: Joi.string().required(),
        startDate: Joi.date().required(),
        endDate: Joi.date().greater(Joi.ref('startDate')).required(),
        status: Joi.string().valid('active', 'closed', 'defaulted').required()
      })).optional()
    }).optional(),
    preferences: Joi.object({
      cropsOfInterest: Joi.array().items(Joi.string()).optional(),
      farmingMethods: Joi.array().items(Joi.string()).optional(),
      integratedFarming: Joi.boolean().optional(),
      organicFarming: Joi.boolean().optional(),
      technologyAdoption: Joi.string().valid('low', 'medium', 'high').optional(),
      marketPreferences: Joi.array().items(Joi.string()).optional(),
      riskTolerance: Joi.string().valid('low', 'medium', 'high').optional()
    }).optional()
  });

  /**
   * Create a new farmer profile
   */
  public createProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request body
      const { error, value } = this.createProfileSchema.validate(req.body);
      if (error) {
        const response: ApiResponse = {
          success: false,
          message: 'Validation failed',
          error: error.details.map(d => d.message).join(', ')
        };
        res.status(400).json(response);
        return;
      }

      const profileData: CreateProfileRequest = value;
      const phoneNumber = req.user!.phoneNumber;

      // Check if profile already exists
      const existingProfile = await this.profileModel.findByPhoneNumber(phoneNumber);
      if (existingProfile) {
        const response: ApiResponse = {
          success: false,
          message: 'Profile already exists',
          error: 'A profile is already associated with this phone number'
        };
        res.status(409).json(response);
        return;
      }

      // Validate location data
      const locationValidation = await this.locationService.validateLocation(profileData.location);
      if (!locationValidation.isValid) {
        const response: ApiResponse = {
          success: false,
          message: 'Location validation failed',
          error: locationValidation.errors.join(', '),
          data: {
            suggestions: locationValidation.suggestions
          }
        };
        res.status(400).json(response);
        return;
      }

      // Use validated location data
      profileData.location = locationValidation.validatedLocation;

      // Create profile
      const profile = await this.profileModel.create(phoneNumber, profileData);

      // Calculate completeness score
      const completenessResult = await this.completenessService.calculateCompleteness(profile);

      // Prepare response
      const profileResponse: ProfileResponse = {
        profile,
        completenessScore: completenessResult.score,
        missingFields: completenessResult.missingSections,
        recommendations: completenessResult.recommendations.map(r => r.description)
      };

      const response: ApiResponse<ProfileResponse> = {
        success: true,
        message: 'Profile created successfully',
        data: profileResponse
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get current user's profile
   */
  public getProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const phoneNumber = req.user!.phoneNumber;
      
      const profile = await this.profileModel.findByPhoneNumber(phoneNumber);
      if (!profile) {
        const response: ApiResponse = {
          success: false,
          message: 'Profile not found',
          error: 'No profile found for this user'
        };
        res.status(404).json(response);
        return;
      }

      // Calculate completeness score
      const completenessResult = await this.completenessService.calculateCompleteness(profile);

      // Apply privacy controls
      const filteredProfile = await this.privacyService.filterProfileData(profile, req.user!.id);

      const profileResponse: ProfileResponse = {
        profile: filteredProfile,
        completenessScore: completenessResult.score,
        missingFields: completenessResult.missingSections,
        recommendations: completenessResult.recommendations.map(r => r.description)
      };

      const response: ApiResponse<ProfileResponse> = {
        success: true,
        message: 'Profile retrieved successfully',
        data: profileResponse
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update current user's profile
   */
  public updateProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request body
      const { error, value } = this.updateProfileSchema.validate(req.body);
      if (error) {
        const response: ApiResponse = {
          success: false,
          message: 'Validation failed',
          error: error.details.map(d => d.message).join(', ')
        };
        res.status(400).json(response);
        return;
      }

      const updateData: UpdateProfileRequest = value;
      const phoneNumber = req.user!.phoneNumber;

      // Find existing profile
      const existingProfile = await this.profileModel.findByPhoneNumber(phoneNumber);
      if (!existingProfile) {
        const response: ApiResponse = {
          success: false,
          message: 'Profile not found',
          error: 'No profile found for this user'
        };
        res.status(404).json(response);
        return;
      }

      // Validate location data if provided
      if (updateData.location) {
        const locationValidation = await this.locationService.validateLocation(updateData.location);
        if (!locationValidation.isValid) {
          const response: ApiResponse = {
            success: false,
            message: 'Location validation failed',
            error: locationValidation.errors.join(', '),
            data: {
              suggestions: locationValidation.suggestions
            }
          };
          res.status(400).json(response);
          return;
        }
        updateData.location = locationValidation.validatedLocation;
      }

      // Update profile
      const updatedProfile = await this.profileModel.update(existingProfile.id, updateData);

      // Calculate completeness score
      const completenessResult = await this.completenessService.calculateCompleteness(updatedProfile);

      const profileResponse: ProfileResponse = {
        profile: updatedProfile,
        completenessScore: completenessResult.score,
        missingFields: completenessResult.missingSections,
        recommendations: completenessResult.recommendations.map(r => r.description)
      };

      const response: ApiResponse<ProfileResponse> = {
        success: true,
        message: 'Profile updated successfully',
        data: profileResponse
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete current user's profile
   */
  public deleteProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const phoneNumber = req.user!.phoneNumber;
      
      const profile = await this.profileModel.findByPhoneNumber(phoneNumber);
      if (!profile) {
        const response: ApiResponse = {
          success: false,
          message: 'Profile not found',
          error: 'No profile found for this user'
        };
        res.status(404).json(response);
        return;
      }

      // Check if user has consented to data deletion
      const canDelete = await this.privacyService.canDeleteProfile(profile.id);
      if (!canDelete) {
        const response: ApiResponse = {
          success: false,
          message: 'Profile deletion not allowed',
          error: 'Profile cannot be deleted due to active consents or legal requirements'
        };
        res.status(403).json(response);
        return;
      }

      await this.profileModel.delete(profile.id);

      const response: ApiResponse = {
        success: true,
        message: 'Profile deleted successfully'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get profile completeness details
   */
  public getProfileCompleteness = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const phoneNumber = req.user!.phoneNumber;
      
      const profile = await this.profileModel.findByPhoneNumber(phoneNumber);
      if (!profile) {
        const response: ApiResponse = {
          success: false,
          message: 'Profile not found',
          error: 'No profile found for this user'
        };
        res.status(404).json(response);
        return;
      }

      const completenessResult = await this.completenessService.calculateCompleteness(profile);

      const response: ApiResponse = {
        success: true,
        message: 'Profile completeness retrieved successfully',
        data: completenessResult
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };
}

export default ProfileController;