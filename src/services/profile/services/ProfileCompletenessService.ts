// Profile Completeness Service - calculates profile completeness score and recommendations
import { FarmerProfile, ProfileCompletenessResult, ProfileCompletionRecommendation } from '../../../shared/types/profile';

export class ProfileCompletenessService {
  // Weights for different profile sections (total should be 100)
  private sectionWeights = {
    personalInfo: 25,
    location: 20,
    landDetails: 25,
    financialProfile: 15,
    preferences: 15
  };

  // Field weights within each section
  private fieldWeights = {
    personalInfo: {
      name: 20,
      age: 15,
      gender: 10,
      education: 15,
      experience: 15,
      primaryLanguage: 10,
      phoneNumber: 10, // Always present from auth
      alternateContact: 5
    },
    location: {
      state: 25,
      district: 25,
      block: 25,
      village: 10,
      pincode: 15,
      coordinates: 0 // Optional
    },
    landDetails: {
      totalArea: 25,
      ownedArea: 20,
      leasedArea: 15,
      irrigatedArea: 15,
      soilTypes: 10,
      waterSources: 10,
      currentCrops: 3,
      infrastructure: 2
    },
    financialProfile: {
      annualIncomeRange: 30,
      capitalAvailable: 25,
      creditScore: 15,
      bankAccounts: 20,
      existingLoans: 10
    },
    preferences: {
      cropsOfInterest: 25,
      farmingMethods: 20,
      integratedFarming: 10,
      organicFarming: 10,
      technologyAdoption: 15,
      marketPreferences: 15,
      riskTolerance: 5
    }
  };

  /**
   * Calculate profile completeness score and provide recommendations
   */
  public async calculateCompleteness(profile: FarmerProfile): Promise<ProfileCompletenessResult> {
    const completedSections: string[] = [];
    const missingSections: string[] = [];
    const recommendations: ProfileCompletionRecommendation[] = [];

    // Calculate score for each section
    const personalInfoScore = this.calculatePersonalInfoScore(profile.personalInfo);
    const locationScore = this.calculateLocationScore(profile.location);
    const landDetailsScore = this.calculateLandDetailsScore(profile.landDetails);
    const financialProfileScore = this.calculateFinancialProfileScore(profile.financialProfile);
    const preferencesScore = this.calculatePreferencesScore(profile.preferences);

    // Calculate weighted total score
    const totalScore = Math.round(
      (personalInfoScore * this.sectionWeights.personalInfo +
       locationScore * this.sectionWeights.location +
       landDetailsScore * this.sectionWeights.landDetails +
       financialProfileScore * this.sectionWeights.financialProfile +
       preferencesScore * this.sectionWeights.preferences) / 100
    );

    // Determine completed and missing sections
    if (personalInfoScore >= 80) {
      completedSections.push('Personal Information');
    } else {
      missingSections.push('Personal Information');
      recommendations.push(...this.getPersonalInfoRecommendations(profile.personalInfo));
    }

    if (locationScore >= 80) {
      completedSections.push('Location Details');
    } else {
      missingSections.push('Location Details');
      recommendations.push(...this.getLocationRecommendations(profile.location));
    }

    if (landDetailsScore >= 80) {
      completedSections.push('Land Details');
    } else {
      missingSections.push('Land Details');
      recommendations.push(...this.getLandDetailsRecommendations(profile.landDetails));
    }

    if (financialProfileScore >= 60) { // Lower threshold for financial info
      completedSections.push('Financial Profile');
    } else {
      missingSections.push('Financial Profile');
      recommendations.push(...this.getFinancialProfileRecommendations(profile.financialProfile));
    }

    if (preferencesScore >= 70) { // Lower threshold for preferences
      completedSections.push('Farming Preferences');
    } else {
      missingSections.push('Farming Preferences');
      recommendations.push(...this.getPreferencesRecommendations(profile.preferences));
    }

    // Sort recommendations by priority
    recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    return {
      score: totalScore,
      completedSections,
      missingSections,
      recommendations: recommendations.slice(0, 10) // Limit to top 10 recommendations
    };
  }

  /**
   * Get missing fields for a specific section
   */
  public getMissingFields(profile: FarmerProfile, section: string): string[] {
    switch (section.toLowerCase()) {
      case 'personalinfo':
      case 'personal information':
        return this.getMissingPersonalInfoFields(profile.personalInfo);
      case 'location':
      case 'location details':
        return this.getMissingLocationFields(profile.location);
      case 'landdetails':
      case 'land details':
        return this.getMissingLandDetailsFields(profile.landDetails);
      case 'financialprofile':
      case 'financial profile':
        return this.getMissingFinancialProfileFields(profile.financialProfile);
      case 'preferences':
      case 'farming preferences':
        return this.getMissingPreferencesFields(profile.preferences);
      default:
        return [];
    }
  }

  // Private methods for calculating section scores
  private calculatePersonalInfoScore(personalInfo: any): number {
    let score = 0;
    const weights = this.fieldWeights.personalInfo;

    if (personalInfo.name && personalInfo.name.trim().length >= 2) {
      score += weights.name;
    }
    if (personalInfo.age && personalInfo.age >= 18 && personalInfo.age <= 100) {
      score += weights.age;
    }
    if (personalInfo.gender) {
      score += weights.gender;
    }
    if (personalInfo.education) {
      score += weights.education;
    }
    if (personalInfo.experience !== undefined && personalInfo.experience >= 0) {
      score += weights.experience;
    }
    if (personalInfo.primaryLanguage) {
      score += weights.primaryLanguage;
    }
    if (personalInfo.phoneNumber) {
      score += weights.phoneNumber;
    }
    if (personalInfo.alternateContact && personalInfo.alternateContact.trim().length > 0) {
      score += weights.alternateContact;
    }

    return score;
  }

  private calculateLocationScore(location: any): number {
    let score = 0;
    const weights = this.fieldWeights.location;

    if (location.state && location.state.trim().length >= 2) {
      score += weights.state;
    }
    if (location.district && location.district.trim().length >= 2) {
      score += weights.district;
    }
    if (location.block && location.block.trim().length >= 2) {
      score += weights.block;
    }
    if (location.village && location.village.trim().length >= 2) {
      score += weights.village;
    }
    if (location.pincode && /^[0-9]{6}$/.test(location.pincode)) {
      score += weights.pincode;
    }
    if (location.coordinates && location.coordinates.latitude && location.coordinates.longitude) {
      score += weights.coordinates;
    }

    return score;
  }

  private calculateLandDetailsScore(landDetails: any): number {
    let score = 0;
    const weights = this.fieldWeights.landDetails;

    if (landDetails.totalArea && landDetails.totalArea > 0) {
      score += weights.totalArea;
    }
    if (landDetails.ownedArea !== undefined && landDetails.ownedArea >= 0) {
      score += weights.ownedArea;
    }
    if (landDetails.leasedArea !== undefined && landDetails.leasedArea >= 0) {
      score += weights.leasedArea;
    }
    if (landDetails.irrigatedArea !== undefined && landDetails.irrigatedArea >= 0) {
      score += weights.irrigatedArea;
    }
    if (landDetails.soilTypes && Array.isArray(landDetails.soilTypes) && landDetails.soilTypes.length > 0) {
      score += weights.soilTypes;
    }
    if (landDetails.waterSources && Array.isArray(landDetails.waterSources) && landDetails.waterSources.length > 0) {
      score += weights.waterSources;
    }
    if (landDetails.currentCrops && Array.isArray(landDetails.currentCrops)) {
      score += weights.currentCrops;
    }
    if (landDetails.infrastructure && Array.isArray(landDetails.infrastructure)) {
      score += weights.infrastructure;
    }

    return score;
  }

  private calculateFinancialProfileScore(financialProfile: any): number {
    let score = 0;
    const weights = this.fieldWeights.financialProfile;

    if (financialProfile.annualIncomeRange && financialProfile.annualIncomeRange.trim().length > 0) {
      score += weights.annualIncomeRange;
    }
    if (financialProfile.capitalAvailable !== undefined && financialProfile.capitalAvailable >= 0) {
      score += weights.capitalAvailable;
    }
    if (financialProfile.creditScore && financialProfile.creditScore >= 300 && financialProfile.creditScore <= 850) {
      score += weights.creditScore;
    }
    if (financialProfile.bankAccounts && Array.isArray(financialProfile.bankAccounts) && financialProfile.bankAccounts.length > 0) {
      score += weights.bankAccounts;
    }
    if (financialProfile.existingLoans && Array.isArray(financialProfile.existingLoans)) {
      score += weights.existingLoans;
    }

    return score;
  }

  private calculatePreferencesScore(preferences: any): number {
    let score = 0;
    const weights = this.fieldWeights.preferences;

    if (preferences.cropsOfInterest && Array.isArray(preferences.cropsOfInterest) && preferences.cropsOfInterest.length > 0) {
      score += weights.cropsOfInterest;
    }
    if (preferences.farmingMethods && Array.isArray(preferences.farmingMethods) && preferences.farmingMethods.length > 0) {
      score += weights.farmingMethods;
    }
    if (preferences.integratedFarming !== undefined) {
      score += weights.integratedFarming;
    }
    if (preferences.organicFarming !== undefined) {
      score += weights.organicFarming;
    }
    if (preferences.technologyAdoption) {
      score += weights.technologyAdoption;
    }
    if (preferences.marketPreferences && Array.isArray(preferences.marketPreferences) && preferences.marketPreferences.length > 0) {
      score += weights.marketPreferences;
    }
    if (preferences.riskTolerance) {
      score += weights.riskTolerance;
    }

    return score;
  }

  // Methods for generating recommendations
  private getPersonalInfoRecommendations(personalInfo: any): ProfileCompletionRecommendation[] {
    const recommendations: ProfileCompletionRecommendation[] = [];

    if (!personalInfo.alternateContact) {
      recommendations.push({
        section: 'Personal Information',
        priority: 'medium',
        description: 'Add an alternate contact number for better communication',
        estimatedTimeMinutes: 2
      });
    }

    if (!personalInfo.education || personalInfo.education === 'none') {
      recommendations.push({
        section: 'Personal Information',
        priority: 'low',
        description: 'Update your education level to get better recommendations',
        estimatedTimeMinutes: 1
      });
    }

    return recommendations;
  }

  private getLocationRecommendations(location: any): ProfileCompletionRecommendation[] {
    const recommendations: ProfileCompletionRecommendation[] = [];

    if (!location.village) {
      recommendations.push({
        section: 'Location Details',
        priority: 'medium',
        description: 'Add your village name for more accurate local recommendations',
        estimatedTimeMinutes: 1
      });
    }

    if (!location.coordinates) {
      recommendations.push({
        section: 'Location Details',
        priority: 'low',
        description: 'Add GPS coordinates for precise location-based services',
        estimatedTimeMinutes: 3
      });
    }

    return recommendations;
  }

  private getLandDetailsRecommendations(landDetails: any): ProfileCompletionRecommendation[] {
    const recommendations: ProfileCompletionRecommendation[] = [];

    if (!landDetails.currentCrops || landDetails.currentCrops.length === 0) {
      recommendations.push({
        section: 'Land Details',
        priority: 'high',
        description: 'Add information about your current crops for better advisory',
        estimatedTimeMinutes: 3
      });
    }

    if (!landDetails.infrastructure || landDetails.infrastructure.length === 0) {
      recommendations.push({
        section: 'Land Details',
        priority: 'medium',
        description: 'List your farm infrastructure to get relevant recommendations',
        estimatedTimeMinutes: 5
      });
    }

    return recommendations;
  }

  private getFinancialProfileRecommendations(financialProfile: any): ProfileCompletionRecommendation[] {
    const recommendations: ProfileCompletionRecommendation[] = [];

    if (!financialProfile.annualIncomeRange) {
      recommendations.push({
        section: 'Financial Profile',
        priority: 'high',
        description: 'Add your annual income range to access financial services',
        estimatedTimeMinutes: 2
      });
    }

    if (!financialProfile.bankAccounts || financialProfile.bankAccounts.length === 0) {
      recommendations.push({
        section: 'Financial Profile',
        priority: 'high',
        description: 'Add bank account details for loan and subsidy applications',
        estimatedTimeMinutes: 5
      });
    }

    return recommendations;
  }

  private getPreferencesRecommendations(preferences: any): ProfileCompletionRecommendation[] {
    const recommendations: ProfileCompletionRecommendation[] = [];

    if (!preferences.cropsOfInterest || preferences.cropsOfInterest.length === 0) {
      recommendations.push({
        section: 'Farming Preferences',
        priority: 'high',
        description: 'Select crops you are interested in growing for personalized advice',
        estimatedTimeMinutes: 3
      });
    }

    if (!preferences.farmingMethods || preferences.farmingMethods.length === 0) {
      recommendations.push({
        section: 'Farming Preferences',
        priority: 'medium',
        description: 'Choose your preferred farming methods for relevant guidance',
        estimatedTimeMinutes: 2
      });
    }

    return recommendations;
  }

  // Methods for getting missing fields
  private getMissingPersonalInfoFields(personalInfo: any): string[] {
    const missing: string[] = [];
    
    if (!personalInfo.alternateContact) missing.push('alternateContact');
    
    return missing;
  }

  private getMissingLocationFields(location: any): string[] {
    const missing: string[] = [];
    
    if (!location.village) missing.push('village');
    if (!location.coordinates) missing.push('coordinates');
    
    return missing;
  }

  private getMissingLandDetailsFields(landDetails: any): string[] {
    const missing: string[] = [];
    
    if (!landDetails.currentCrops || landDetails.currentCrops.length === 0) missing.push('currentCrops');
    if (!landDetails.infrastructure || landDetails.infrastructure.length === 0) missing.push('infrastructure');
    
    return missing;
  }

  private getMissingFinancialProfileFields(financialProfile: any): string[] {
    const missing: string[] = [];
    
    if (!financialProfile.annualIncomeRange) missing.push('annualIncomeRange');
    if (!financialProfile.bankAccounts || financialProfile.bankAccounts.length === 0) missing.push('bankAccounts');
    if (!financialProfile.creditScore) missing.push('creditScore');
    
    return missing;
  }

  private getMissingPreferencesFields(preferences: any): string[] {
    const missing: string[] = [];
    
    if (!preferences.cropsOfInterest || preferences.cropsOfInterest.length === 0) missing.push('cropsOfInterest');
    if (!preferences.farmingMethods || preferences.farmingMethods.length === 0) missing.push('farmingMethods');
    if (!preferences.marketPreferences || preferences.marketPreferences.length === 0) missing.push('marketPreferences');
    
    return missing;
  }
}

export default ProfileCompletenessService;