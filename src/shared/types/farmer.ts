// Farmer-related type definitions
import { LanguageCode, RiskLevel, GeoCoordinates } from './common';

export interface FarmerProfile {
  id: string;
  personalInfo: PersonalInfo;
  location: LocationData;
  landDetails: LandDetails;
  preferences: FarmingPreferences;
  riskTolerance: RiskLevel;
  createdAt: Date;
  updatedAt: Date;
}

export interface PersonalInfo {
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  education: 'none' | 'primary' | 'secondary' | 'higher_secondary' | 'graduate' | 'postgraduate';
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

export interface FarmingPreferences {
  cropsOfInterest: string[];
  farmingMethods: string[];
  integratedFarming: boolean;
  organicFarming: boolean;
  technologyAdoption: 'low' | 'medium' | 'high';
  marketPreferences: string[];
}