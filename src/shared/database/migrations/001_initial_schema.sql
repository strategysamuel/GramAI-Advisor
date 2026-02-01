-- Initial database schema for GramAI Advisor
-- Migration: 001_initial_schema
-- Created: 2026-01-31

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');
CREATE TYPE education_level AS ENUM ('none', 'primary', 'secondary', 'higher_secondary', 'graduate', 'postgraduate');
CREATE TYPE language_code AS ENUM ('hi', 'ta', 'te', 'bn', 'mr', 'gu', 'en');
CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high');
CREATE TYPE tech_adoption_level AS ENUM ('low', 'medium', 'high');
CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected');

-- Profiles schema tables
CREATE TABLE profiles.farmers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    age INTEGER CHECK (age > 0 AND age < 150),
    gender gender_type NOT NULL,
    education education_level NOT NULL DEFAULT 'none',
    experience INTEGER DEFAULT 0 CHECK (experience >= 0),
    primary_language language_code NOT NULL DEFAULT 'hi',
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    alternate_contact VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    profile_completeness INTEGER DEFAULT 0 CHECK (profile_completeness >= 0 AND profile_completeness <= 100),
    verification_status verification_status DEFAULT 'pending'
);

CREATE TABLE profiles.locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id UUID NOT NULL REFERENCES profiles.farmers(id) ON DELETE CASCADE,
    state VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    block VARCHAR(100) NOT NULL,
    village VARCHAR(100),
    pincode VARCHAR(10) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE profiles.land_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id UUID NOT NULL REFERENCES profiles.farmers(id) ON DELETE CASCADE,
    total_area DECIMAL(10, 2) NOT NULL CHECK (total_area > 0),
    owned_area DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (owned_area >= 0),
    leased_area DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (leased_area >= 0),
    irrigated_area DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (irrigated_area >= 0),
    soil_types TEXT[], -- Array of soil types
    water_sources TEXT[], -- Array of water sources
    current_crops TEXT[], -- Array of current crops
    infrastructure TEXT[], -- Array of infrastructure items
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_area_consistency CHECK (owned_area + leased_area = total_area),
    CONSTRAINT check_irrigated_area CHECK (irrigated_area <= total_area)
);

CREATE TABLE profiles.farming_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id UUID NOT NULL REFERENCES profiles.farmers(id) ON DELETE CASCADE,
    crops_of_interest TEXT[], -- Array of crop names
    farming_methods TEXT[], -- Array of farming methods
    integrated_farming BOOLEAN DEFAULT false,
    organic_farming BOOLEAN DEFAULT false,
    technology_adoption tech_adoption_level DEFAULT 'low',
    market_preferences TEXT[], -- Array of market preferences
    risk_tolerance risk_level DEFAULT 'medium',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE profiles.financial_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id UUID NOT NULL REFERENCES profiles.farmers(id) ON DELETE CASCADE,
    annual_income_range VARCHAR(50), -- e.g., '50000-100000'
    capital_available DECIMAL(12, 2) DEFAULT 0,
    credit_score INTEGER CHECK (credit_score >= 300 AND credit_score <= 850),
    bank_accounts JSONB DEFAULT '[]'::jsonb, -- Array of bank account details
    existing_loans JSONB DEFAULT '[]'::jsonb, -- Array of existing loan details
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Advisory schema tables
CREATE TABLE advisory.crops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    local_names JSONB DEFAULT '{}'::jsonb, -- Language-specific names
    category VARCHAR(100) NOT NULL, -- cereals, pulses, vegetables, etc.
    season VARCHAR(50) NOT NULL, -- kharif, rabi, zaid
    duration_days INTEGER NOT NULL CHECK (duration_days > 0),
    water_requirement VARCHAR(50) NOT NULL, -- low, medium, high
    soil_types TEXT[] NOT NULL,
    climate_conditions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE advisory.crop_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id UUID NOT NULL REFERENCES profiles.farmers(id) ON DELETE CASCADE,
    crop_id UUID NOT NULL REFERENCES advisory.crops(id) ON DELETE CASCADE,
    suitability_score INTEGER NOT NULL CHECK (suitability_score >= 0 AND suitability_score <= 100),
    expected_yield_min DECIMAL(10, 2),
    expected_yield_max DECIMAL(10, 2),
    input_costs JSONB DEFAULT '{}'::jsonb,
    market_demand_score INTEGER CHECK (market_demand_score >= 0 AND market_demand_score <= 100),
    risk_factors TEXT[],
    explanation TEXT,
    recommended_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Market schema tables
CREATE TABLE market.price_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    commodity VARCHAR(255) NOT NULL,
    market_name VARCHAR(255) NOT NULL,
    market_location JSONB NOT NULL, -- Location details
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    unit VARCHAR(20) NOT NULL,
    quality_grade VARCHAR(50),
    volume DECIMAL(10, 2),
    price_date DATE NOT NULL,
    source VARCHAR(100) NOT NULL, -- e-NAM, AGMARKNET, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE market.transport_costs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    origin_location JSONB NOT NULL,
    destination_location JSONB NOT NULL,
    distance_km DECIMAL(8, 2) NOT NULL CHECK (distance_km > 0),
    cost_per_kg DECIMAL(8, 4) NOT NULL CHECK (cost_per_kg >= 0),
    transport_mode VARCHAR(50) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Finance schema tables
CREATE TABLE finance.loan_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id UUID NOT NULL REFERENCES profiles.farmers(id) ON DELETE CASCADE,
    loan_amount DECIMAL(12, 2) NOT NULL CHECK (loan_amount > 0),
    loan_purpose TEXT NOT NULL,
    institution_type VARCHAR(100) NOT NULL, -- bank, cooperative, NBFC, etc.
    institution_name VARCHAR(255),
    application_status VARCHAR(50) DEFAULT 'draft',
    project_report JSONB,
    documents JSONB DEFAULT '[]'::jsonb,
    applied_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    disbursed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Documents schema tables
CREATE TABLE documents.uploaded_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id UUID NOT NULL REFERENCES profiles.farmers(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size INTEGER NOT NULL CHECK (file_size > 0),
    mime_type VARCHAR(100) NOT NULL,
    storage_path TEXT NOT NULL,
    document_type VARCHAR(100) NOT NULL, -- soil_report, land_photo, kyc_document, etc.
    extracted_data JSONB,
    validation_status VARCHAR(50) DEFAULT 'pending',
    validation_results JSONB,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Schemes schema tables
CREATE TABLE schemes.government_schemes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    local_names JSONB DEFAULT '{}'::jsonb,
    category VARCHAR(100) NOT NULL,
    government_level VARCHAR(50) NOT NULL, -- central, state, district
    state VARCHAR(100), -- NULL for central schemes
    description TEXT NOT NULL,
    objectives TEXT[],
    benefits JSONB NOT NULL,
    eligibility_criteria JSONB NOT NULL,
    required_documents TEXT[],
    application_process JSONB,
    nodal_agency VARCHAR(255),
    contact_details JSONB,
    website_url TEXT,
    status VARCHAR(50) DEFAULT 'active',
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE schemes.scheme_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id UUID NOT NULL REFERENCES profiles.farmers(id) ON DELETE CASCADE,
    scheme_id UUID NOT NULL REFERENCES schemes.government_schemes(id) ON DELETE CASCADE,
    application_status VARCHAR(50) DEFAULT 'draft',
    eligibility_score INTEGER CHECK (eligibility_score >= 0 AND eligibility_score <= 100),
    submitted_documents JSONB DEFAULT '[]'::jsonb,
    application_data JSONB,
    applied_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_farmers_phone ON profiles.farmers(phone_number);
CREATE INDEX idx_farmers_verification ON profiles.farmers(verification_status);
CREATE INDEX idx_locations_farmer ON profiles.locations(farmer_id);
CREATE INDEX idx_locations_state_district ON profiles.locations(state, district);
CREATE INDEX idx_land_details_farmer ON profiles.land_details(farmer_id);
CREATE INDEX idx_preferences_farmer ON profiles.farming_preferences(farmer_id);
CREATE INDEX idx_financial_farmer ON profiles.financial_profiles(farmer_id);

CREATE INDEX idx_crops_category ON advisory.crops(category);
CREATE INDEX idx_crops_season ON advisory.crops(season);
CREATE INDEX idx_recommendations_farmer ON advisory.crop_recommendations(farmer_id);
CREATE INDEX idx_recommendations_crop ON advisory.crop_recommendations(crop_id);
CREATE INDEX idx_recommendations_date ON advisory.crop_recommendations(recommended_at);

CREATE INDEX idx_price_data_commodity ON market.price_data(commodity);
CREATE INDEX idx_price_data_date ON market.price_data(price_date);
CREATE INDEX idx_price_data_market ON market.price_data(market_name);

CREATE INDEX idx_loan_applications_farmer ON finance.loan_applications(farmer_id);
CREATE INDEX idx_loan_applications_status ON finance.loan_applications(application_status);

CREATE INDEX idx_uploaded_files_farmer ON documents.uploaded_files(farmer_id);
CREATE INDEX idx_uploaded_files_type ON documents.uploaded_files(document_type);
CREATE INDEX idx_uploaded_files_status ON documents.uploaded_files(validation_status);

CREATE INDEX idx_schemes_category ON schemes.government_schemes(category);
CREATE INDEX idx_schemes_level ON schemes.government_schemes(government_level);
CREATE INDEX idx_schemes_state ON schemes.government_schemes(state);
CREATE INDEX idx_schemes_status ON schemes.government_schemes(status);
CREATE INDEX idx_scheme_applications_farmer ON schemes.scheme_applications(farmer_id);
CREATE INDEX idx_scheme_applications_scheme ON schemes.scheme_applications(scheme_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TABLE profiles.privacy_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id UUID NOT NULL REFERENCES profiles.farmers(id) ON DELETE CASCADE,
    share_location_data BOOLEAN DEFAULT false,
    share_financial_data BOOLEAN DEFAULT false,
    share_personal_info BOOLEAN DEFAULT false,
    allow_marketing_communication BOOLEAN DEFAULT false,
    data_retention_period INTEGER DEFAULT 24, -- months
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE profiles.data_sharing_consents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id UUID NOT NULL REFERENCES profiles.farmers(id) ON DELETE CASCADE,
    consent_type VARCHAR(50) NOT NULL, -- data_collection, data_processing, data_sharing, marketing
    granted BOOLEAN NOT NULL,
    granted_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    purpose TEXT NOT NULL,
    data_types JSONB NOT NULL, -- Array of data types
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for privacy tables
CREATE INDEX idx_privacy_settings_farmer ON profiles.privacy_settings(farmer_id);
CREATE INDEX idx_data_sharing_consents_farmer ON profiles.data_sharing_consents(farmer_id);
CREATE INDEX idx_data_sharing_consents_type ON profiles.data_sharing_consents(consent_type);
CREATE INDEX idx_data_sharing_consents_granted ON profiles.data_sharing_consents(granted);

-- Apply updated_at triggers to privacy tables
CREATE TRIGGER update_privacy_settings_updated_at BEFORE UPDATE ON profiles.privacy_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_data_sharing_consents_updated_at BEFORE UPDATE ON profiles.data_sharing_consents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_farmers_updated_at BEFORE UPDATE ON profiles.farmers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON profiles.locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_land_details_updated_at BEFORE UPDATE ON profiles.land_details FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_preferences_updated_at BEFORE UPDATE ON profiles.farming_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_financial_updated_at BEFORE UPDATE ON profiles.financial_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_crops_updated_at BEFORE UPDATE ON advisory.crops FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_loan_applications_updated_at BEFORE UPDATE ON finance.loan_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_schemes_updated_at BEFORE UPDATE ON schemes.government_schemes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_scheme_applications_updated_at BEFORE UPDATE ON schemes.scheme_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();