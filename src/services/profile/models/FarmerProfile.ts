// FarmerProfile database model
import { db } from '../../../shared/database/connection';
import { 
  FarmerProfile, 
  CreateProfileRequest, 
  UpdateProfileRequest,
  PersonalInfo,
  LocationData,
  LandDetails,
  FinancialProfile,
  FarmingPreferences,
  ProfileMetadata
} from '../../../shared/types/profile';

export class FarmerProfileModel {
  // Create a new farmer profile
  public async create(phoneNumber: string, profileData: CreateProfileRequest): Promise<FarmerProfile> {
    const client = await db.getPool().connect();
    
    try {
      await client.query('BEGIN');
      
      // Insert farmer basic info
      const farmerResult = await client.query(`
        INSERT INTO profiles.farmers (
          name, age, gender, education, experience, primary_language, 
          phone_number, alternate_contact
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, created_at, updated_at
      `, [
        profileData.personalInfo.name,
        profileData.personalInfo.age,
        profileData.personalInfo.gender,
        profileData.personalInfo.education,
        profileData.personalInfo.experience,
        profileData.personalInfo.primaryLanguage,
        phoneNumber,
        profileData.personalInfo.alternateContact
      ]);
      
      const farmerId = farmerResult.rows[0].id;
      
      // Insert location data
      await client.query(`
        INSERT INTO profiles.locations (
          farmer_id, state, district, block, village, pincode, latitude, longitude
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        farmerId,
        profileData.location.state,
        profileData.location.district,
        profileData.location.block,
        profileData.location.village,
        profileData.location.pincode,
        profileData.location.coordinates?.latitude,
        profileData.location.coordinates?.longitude
      ]);
      
      // Insert land details
      await client.query(`
        INSERT INTO profiles.land_details (
          farmer_id, total_area, owned_area, leased_area, irrigated_area,
          soil_types, water_sources, current_crops, infrastructure
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        farmerId,
        profileData.landDetails.totalArea,
        profileData.landDetails.ownedArea,
        profileData.landDetails.leasedArea,
        profileData.landDetails.irrigatedArea,
        profileData.landDetails.soilTypes,
        profileData.landDetails.waterSources,
        profileData.landDetails.currentCrops,
        profileData.landDetails.infrastructure
      ]);
      
      // Insert financial profile if provided
      if (profileData.financialProfile) {
        await client.query(`
          INSERT INTO profiles.financial_profiles (
            farmer_id, annual_income_range, capital_available, credit_score,
            bank_accounts, existing_loans
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          farmerId,
          profileData.financialProfile.annualIncomeRange,
          profileData.financialProfile.capitalAvailable || 0,
          profileData.financialProfile.creditScore,
          JSON.stringify(profileData.financialProfile.bankAccounts || []),
          JSON.stringify(profileData.financialProfile.existingLoans || [])
        ]);
      }
      
      // Insert farming preferences if provided
      if (profileData.preferences) {
        await client.query(`
          INSERT INTO profiles.farming_preferences (
            farmer_id, crops_of_interest, farming_methods, integrated_farming,
            organic_farming, technology_adoption, market_preferences, risk_tolerance
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          farmerId,
          profileData.preferences.cropsOfInterest || [],
          profileData.preferences.farmingMethods || [],
          profileData.preferences.integratedFarming || false,
          profileData.preferences.organicFarming || false,
          profileData.preferences.technologyAdoption || 'low',
          profileData.preferences.marketPreferences || [],
          profileData.preferences.riskTolerance || 'medium'
        ]);
      }
      
      await client.query('COMMIT');
      
      // Return the created profile
      return await this.findById(farmerId);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  // Find profile by ID
  public async findById(id: string): Promise<FarmerProfile> {
    const result = await db.query(`
      SELECT 
        f.*,
        l.state, l.district, l.block, l.village, l.pincode, l.latitude, l.longitude,
        ld.total_area, ld.owned_area, ld.leased_area, ld.irrigated_area,
        ld.soil_types, ld.water_sources, ld.current_crops, ld.infrastructure,
        fp.annual_income_range, fp.capital_available, fp.credit_score,
        fp.bank_accounts, fp.existing_loans,
        pr.crops_of_interest, pr.farming_methods, pr.integrated_farming,
        pr.organic_farming, pr.technology_adoption, pr.market_preferences, pr.risk_tolerance
      FROM profiles.farmers f
      LEFT JOIN profiles.locations l ON f.id = l.farmer_id
      LEFT JOIN profiles.land_details ld ON f.id = ld.farmer_id
      LEFT JOIN profiles.financial_profiles fp ON f.id = fp.farmer_id
      LEFT JOIN profiles.farming_preferences pr ON f.id = pr.farmer_id
      WHERE f.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      throw new Error('Profile not found');
    }
    
    return this.mapRowToProfile(result.rows[0]);
  }
  
  // Find profile by phone number
  public async findByPhoneNumber(phoneNumber: string): Promise<FarmerProfile | null> {
    const result = await db.query(`
      SELECT 
        f.*,
        l.state, l.district, l.block, l.village, l.pincode, l.latitude, l.longitude,
        ld.total_area, ld.owned_area, ld.leased_area, ld.irrigated_area,
        ld.soil_types, ld.water_sources, ld.current_crops, ld.infrastructure,
        fp.annual_income_range, fp.capital_available, fp.credit_score,
        fp.bank_accounts, fp.existing_loans,
        pr.crops_of_interest, pr.farming_methods, pr.integrated_farming,
        pr.organic_farming, pr.technology_adoption, pr.market_preferences, pr.risk_tolerance
      FROM profiles.farmers f
      LEFT JOIN profiles.locations l ON f.id = l.farmer_id
      LEFT JOIN profiles.land_details ld ON f.id = ld.farmer_id
      LEFT JOIN profiles.financial_profiles fp ON f.id = fp.farmer_id
      LEFT JOIN profiles.farming_preferences pr ON f.id = pr.farmer_id
      WHERE f.phone_number = $1
    `, [phoneNumber]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToProfile(result.rows[0]);
  }
  
  // Update profile
  public async update(id: string, updateData: UpdateProfileRequest): Promise<FarmerProfile> {
    const client = await db.getPool().connect();
    
    try {
      await client.query('BEGIN');
      
      // Update personal info if provided
      if (updateData.personalInfo) {
        const fields = [];
        const values = [];
        let paramCount = 1;
        
        Object.entries(updateData.personalInfo).forEach(([key, value]) => {
          if (value !== undefined) {
            const dbField = this.camelToSnake(key);
            fields.push(`${dbField} = $${paramCount}`);
            values.push(value);
            paramCount++;
          }
        });
        
        if (fields.length > 0) {
          values.push(id);
          await client.query(`
            UPDATE profiles.farmers 
            SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${paramCount}
          `, values);
        }
      }
      
      // Update location if provided
      if (updateData.location) {
        const fields = [];
        const values = [];
        let paramCount = 1;
        
        Object.entries(updateData.location).forEach(([key, value]) => {
          if (value !== undefined) {
            if (key === 'coordinates') {
              if (value.latitude !== undefined) {
                fields.push(`latitude = $${paramCount}`);
                values.push(value.latitude);
                paramCount++;
              }
              if (value.longitude !== undefined) {
                fields.push(`longitude = $${paramCount}`);
                values.push(value.longitude);
                paramCount++;
              }
            } else {
              fields.push(`${key} = $${paramCount}`);
              values.push(value);
              paramCount++;
            }
          }
        });
        
        if (fields.length > 0) {
          values.push(id);
          await client.query(`
            UPDATE profiles.locations 
            SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE farmer_id = $${paramCount}
          `, values);
        }
      }
      
      // Update land details if provided
      if (updateData.landDetails) {
        const fields = [];
        const values = [];
        let paramCount = 1;
        
        Object.entries(updateData.landDetails).forEach(([key, value]) => {
          if (value !== undefined) {
            const dbField = this.camelToSnake(key);
            fields.push(`${dbField} = $${paramCount}`);
            values.push(value);
            paramCount++;
          }
        });
        
        if (fields.length > 0) {
          values.push(id);
          await client.query(`
            UPDATE profiles.land_details 
            SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE farmer_id = $${paramCount}
          `, values);
        }
      }
      
      // Update financial profile if provided
      if (updateData.financialProfile) {
        const fields = [];
        const values = [];
        let paramCount = 1;
        
        Object.entries(updateData.financialProfile).forEach(([key, value]) => {
          if (value !== undefined) {
            const dbField = this.camelToSnake(key);
            if (key === 'bankAccounts' || key === 'existingLoans') {
              fields.push(`${dbField} = $${paramCount}`);
              values.push(JSON.stringify(value));
            } else {
              fields.push(`${dbField} = $${paramCount}`);
              values.push(value);
            }
            paramCount++;
          }
        });
        
        if (fields.length > 0) {
          values.push(id);
          await client.query(`
            UPDATE profiles.financial_profiles 
            SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE farmer_id = $${paramCount}
          `, values);
        }
      }
      
      // Update preferences if provided
      if (updateData.preferences) {
        const fields = [];
        const values = [];
        let paramCount = 1;
        
        Object.entries(updateData.preferences).forEach(([key, value]) => {
          if (value !== undefined) {
            const dbField = this.camelToSnake(key);
            fields.push(`${dbField} = $${paramCount}`);
            values.push(value);
            paramCount++;
          }
        });
        
        if (fields.length > 0) {
          values.push(id);
          await client.query(`
            UPDATE profiles.farming_preferences 
            SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE farmer_id = $${paramCount}
          `, values);
        }
      }
      
      await client.query('COMMIT');
      
      // Return updated profile
      return await this.findById(id);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  // Delete profile
  public async delete(id: string): Promise<void> {
    await db.query('DELETE FROM profiles.farmers WHERE id = $1', [id]);
  }
  
  // Helper method to map database row to profile object
  private mapRowToProfile(row: any): FarmerProfile {
    return {
      id: row.id,
      personalInfo: {
        name: row.name,
        age: row.age,
        gender: row.gender,
        education: row.education,
        experience: row.experience,
        primaryLanguage: row.primary_language,
        phoneNumber: row.phone_number,
        alternateContact: row.alternate_contact
      },
      location: {
        state: row.state,
        district: row.district,
        block: row.block,
        village: row.village,
        pincode: row.pincode,
        coordinates: row.latitude && row.longitude ? {
          latitude: parseFloat(row.latitude),
          longitude: parseFloat(row.longitude)
        } : undefined
      },
      landDetails: {
        totalArea: parseFloat(row.total_area),
        ownedArea: parseFloat(row.owned_area),
        leasedArea: parseFloat(row.leased_area),
        irrigatedArea: parseFloat(row.irrigated_area),
        soilTypes: row.soil_types || [],
        waterSources: row.water_sources || [],
        currentCrops: row.current_crops || [],
        infrastructure: row.infrastructure || []
      },
      financialProfile: {
        annualIncomeRange: row.annual_income_range,
        capitalAvailable: parseFloat(row.capital_available || 0),
        creditScore: row.credit_score,
        bankAccounts: row.bank_accounts ? JSON.parse(row.bank_accounts) : [],
        existingLoans: row.existing_loans ? JSON.parse(row.existing_loans) : []
      },
      preferences: {
        cropsOfInterest: row.crops_of_interest || [],
        farmingMethods: row.farming_methods || [],
        integratedFarming: row.integrated_farming || false,
        organicFarming: row.organic_farming || false,
        technologyAdoption: row.technology_adoption || 'low',
        marketPreferences: row.market_preferences || [],
        riskTolerance: row.risk_tolerance || 'medium'
      },
      metadata: {
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        lastActiveAt: new Date(row.last_active_at),
        profileCompleteness: row.profile_completeness || 0,
        verificationStatus: row.verification_status || 'pending'
      }
    };
  }
  
  // Helper method to convert camelCase to snake_case
  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}

export default FarmerProfileModel;