// Profile-related type definitions
import { LanguageCode, RiskLevel, GeoCoordinates } from './common';

export interface FarmerProfile {
  id: string;
  personalInfo: PersonalInfo;
  location: LocationData;
  landDetails: LandDetails;
  financialProfile: FinancialProfile;
  preferences: FarmingPreferences;
  metadata: ProfileMetadata;
}

export interface PersonalInfo {
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  education: EducationLevel;
  experience: number; // years in farming
  primaryLanguage: LanguageCode;
  phoneNumber: string;
  alternateContact?: string;
}

export interface LocationData {
  state: string;
  district: string;
  block: string;
  village?: string;
  pincode: string;
  coordinates?: GeoCoordinates;
}

export interface LandDetails {
  totalArea: number; // in acres
  ownedArea: number;
  leasedArea: number;
  irrigatedArea: number;
  soilTypes: string[];
  waterSources: string[];
  currentCrops: string[];
  infrastructure: string[];
}

export interface FinancialProfile {
  annualIncomeRange: string; // e.g., '50000-100000'
  capitalAvailable: number;
  creditScore?: number;
  bankAccounts: BankAccount[];
  existingLoans: LoanInfo[];
}

export interface FarmingPreferences {
  cropsOfInterest: string[];
  farmingMethods: string[];
  integratedFarming: boolean;
  organicFarming: boolean;
  technologyAdoption: TechAdoptionLevel;
  marketPreferences: string[];
  riskTolerance: RiskLevel;
}

export interface ProfileMetadata {
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date;
  profileCompleteness: number; // percentage
  verificationStatus: VerificationStatus;
}

// Supporting types
export type EducationLevel = 'none' | 'primary' | 'secondary' | 'higher_secondary' | 'graduate' | 'postgraduate';
export type TechAdoptionLevel = 'low' | 'medium' | 'high';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';

export interface BankAccount {
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  accountType: 'savings' | 'current';
  isPrimary: boolean;
}

export interface LoanInfo {
  loanType: string;
  amount: number;
  outstandingAmount: number;
  institution: string;
  startDate: Date;
  endDate: Date;
  status: 'active' | 'closed' | 'defaulted';
}

// Profile creation and update DTOs
export interface CreateProfileRequest {
  personalInfo: Omit<PersonalInfo, 'phoneNumber'>; // phoneNumber comes from auth
  location: LocationData;
  landDetails: LandDetails;
  financialProfile?: Partial<FinancialProfile>;
  preferences?: Partial<FarmingPreferences>;
}

export interface UpdateProfileRequest {
  personalInfo?: Partial<PersonalInfo>;
  location?: Partial<LocationData>;
  landDetails?: Partial<LandDetails>;
  financialProfile?: Partial<FinancialProfile>;
  preferences?: Partial<FarmingPreferences>;
}

export interface ProfileResponse {
  profile: FarmerProfile;
  completenessScore: number;
  missingFields: string[];
  recommendations: string[];
}

// Privacy and data sharing
export interface PrivacySettings {
  shareLocationData: boolean;
  shareFinancialData: boolean;
  sharePersonalInfo: boolean;
  allowMarketingCommunication: boolean;
  dataRetentionPeriod: number; // in months
}

export interface DataSharingConsent {
  consentId: string;
  farmerId: string;
  consentType: 'data_collection' | 'data_processing' | 'data_sharing' | 'marketing';
  granted: boolean;
  grantedAt: Date;
  expiresAt?: Date;
  purpose: string;
  dataTypes: string[];
}

// Location validation
export interface LocationValidationResult {
  isValid: boolean;
  validatedLocation: LocationData;
  suggestions: LocationData[];
  errors: string[];
}

export interface AdministrativeBoundary {
  state: string;
  district: string;
  block: string;
  villages: string[];
  pincodes: string[];
}

// Profile completeness
export interface ProfileCompletenessResult {
  score: number; // 0-100
  completedSections: string[];
  missingSections: string[];
  recommendations: ProfileCompletionRecommendation[];
}

export interface ProfileCompletionRecommendation {
  section: string;
  priority: 'high' | 'medium' | 'low';
  description: string;
  estimatedTimeMinutes: number;
}

export default FarmerProfile;