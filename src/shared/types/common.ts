// Common type definitions

export type LanguageCode = 'hi' | 'ta' | 'te' | 'bn' | 'mr' | 'gu' | 'en';

export type RiskLevel = 'low' | 'medium' | 'high';

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}