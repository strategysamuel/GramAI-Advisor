// Privacy Control Service - manages data privacy and sharing preferences
import { FarmerProfile, PrivacySettings, DataSharingConsent } from '../../../shared/types/profile';
import { db } from '../../../shared/database/connection';

export class PrivacyControlService {
  /**
   * Get privacy settings for a farmer
   */
  public async getPrivacySettings(farmerId: string): Promise<PrivacySettings> {
    const result = await db.query(`
      SELECT 
        share_location_data,
        share_financial_data,
        share_personal_info,
        allow_marketing_communication,
        data_retention_period
      FROM profiles.privacy_settings 
      WHERE farmer_id = $1
    `, [farmerId]);

    if (result.rows.length === 0) {
      // Return default privacy settings
      return {
        shareLocationData: false,
        shareFinancialData: false,
        sharePersonalInfo: false,
        allowMarketingCommunication: false,
        dataRetentionPeriod: 24 // 2 years default
      };
    }

    const row = result.rows[0];
    return {
      shareLocationData: row.share_location_data,
      shareFinancialData: row.share_financial_data,
      sharePersonalInfo: row.share_personal_info,
      allowMarketingCommunication: row.allow_marketing_communication,
      dataRetentionPeriod: row.data_retention_period
    };
  }

  /**
   * Update privacy settings for a farmer
   */
  public async updatePrivacySettings(farmerId: string, settings: Partial<PrivacySettings>): Promise<PrivacySettings> {
    const client = await db.getPool().connect();
    
    try {
      await client.query('BEGIN');

      // Check if privacy settings exist
      const existingResult = await client.query(
        'SELECT farmer_id FROM profiles.privacy_settings WHERE farmer_id = $1',
        [farmerId]
      );

      if (existingResult.rows.length === 0) {
        // Insert new privacy settings
        await client.query(`
          INSERT INTO profiles.privacy_settings (
            farmer_id, share_location_data, share_financial_data, 
            share_personal_info, allow_marketing_communication, data_retention_period
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          farmerId,
          settings.shareLocationData ?? false,
          settings.shareFinancialData ?? false,
          settings.sharePersonalInfo ?? false,
          settings.allowMarketingCommunication ?? false,
          settings.dataRetentionPeriod ?? 24
        ]);
      } else {
        // Update existing privacy settings
        const updateFields = [];
        const updateValues = [];
        let paramCount = 1;

        if (settings.shareLocationData !== undefined) {
          updateFields.push(`share_location_data = $${paramCount}`);
          updateValues.push(settings.shareLocationData);
          paramCount++;
        }
        if (settings.shareFinancialData !== undefined) {
          updateFields.push(`share_financial_data = $${paramCount}`);
          updateValues.push(settings.shareFinancialData);
          paramCount++;
        }
        if (settings.sharePersonalInfo !== undefined) {
          updateFields.push(`share_personal_info = $${paramCount}`);
          updateValues.push(settings.sharePersonalInfo);
          paramCount++;
        }
        if (settings.allowMarketingCommunication !== undefined) {
          updateFields.push(`allow_marketing_communication = $${paramCount}`);
          updateValues.push(settings.allowMarketingCommunication);
          paramCount++;
        }
        if (settings.dataRetentionPeriod !== undefined) {
          updateFields.push(`data_retention_period = $${paramCount}`);
          updateValues.push(settings.dataRetentionPeriod);
          paramCount++;
        }

        if (updateFields.length > 0) {
          updateValues.push(farmerId);
          await client.query(`
            UPDATE profiles.privacy_settings 
            SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE farmer_id = $${paramCount}
          `, updateValues);
        }
      }

      await client.query('COMMIT');
      
      // Return updated settings
      return await this.getPrivacySettings(farmerId);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Record data sharing consent
   */
  public async recordConsent(consent: Omit<DataSharingConsent, 'consentId'>): Promise<DataSharingConsent> {
    const result = await db.query(`
      INSERT INTO profiles.data_sharing_consents (
        farmer_id, consent_type, granted, granted_at, expires_at, purpose, data_types
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, granted_at
    `, [
      consent.farmerId,
      consent.consentType,
      consent.granted,
      consent.grantedAt,
      consent.expiresAt,
      consent.purpose,
      JSON.stringify(consent.dataTypes)
    ]);

    return {
      consentId: result.rows[0].id,
      ...consent,
      grantedAt: result.rows[0].granted_at
    };
  }

  /**
   * Get all consents for a farmer
   */
  public async getConsents(farmerId: string): Promise<DataSharingConsent[]> {
    const result = await db.query(`
      SELECT 
        id as consent_id,
        farmer_id,
        consent_type,
        granted,
        granted_at,
        expires_at,
        purpose,
        data_types
      FROM profiles.data_sharing_consents 
      WHERE farmer_id = $1
      ORDER BY granted_at DESC
    `, [farmerId]);

    return result.rows.map((row: any) => ({
      consentId: row.consent_id,
      farmerId: row.farmer_id,
      consentType: row.consent_type,
      granted: row.granted,
      grantedAt: new Date(row.granted_at),
      expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
      purpose: row.purpose,
      dataTypes: JSON.parse(row.data_types)
    }));
  }

  /**
   * Revoke a specific consent
   */
  public async revokeConsent(consentId: string, farmerId: string): Promise<void> {
    await db.query(`
      UPDATE profiles.data_sharing_consents 
      SET granted = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND farmer_id = $2
    `, [consentId, farmerId]);
  }

  /**
   * Check if a specific consent is granted and valid
   */
  public async hasValidConsent(farmerId: string, consentType: string, purpose?: string): Promise<boolean> {
    let query = `
      SELECT granted, expires_at 
      FROM profiles.data_sharing_consents 
      WHERE farmer_id = $1 AND consent_type = $2 AND granted = true
    `;
    const params = [farmerId, consentType];

    if (purpose) {
      query += ' AND purpose = $3';
      params.push(purpose);
    }

    query += ' ORDER BY granted_at DESC LIMIT 1';

    const result = await db.query(query, params);

    if (result.rows.length === 0) {
      return false;
    }

    const consent = result.rows[0];
    
    // Check if consent has expired
    if (consent.expires_at && new Date(consent.expires_at) < new Date()) {
      return false;
    }

    return consent.granted;
  }

  /**
   * Filter profile data based on privacy settings and consents
   */
  public async filterProfileData(profile: FarmerProfile, requesterId: string): Promise<FarmerProfile> {
    // If the requester is the profile owner, return full profile
    if (requesterId === profile.id) {
      return profile;
    }

    const privacySettings = await this.getPrivacySettings(profile.id);
    const filteredProfile = { ...profile };

    // Filter personal information
    if (!privacySettings.sharePersonalInfo) {
      filteredProfile.personalInfo = {
        ...filteredProfile.personalInfo,
        name: this.maskName(filteredProfile.personalInfo.name),
        age: 0,
        alternateContact: undefined
      };
    }

    // Filter location data
    if (!privacySettings.shareLocationData) {
      filteredProfile.location = {
        state: filteredProfile.location.state,
        district: filteredProfile.location.district,
        block: '', // Hide specific block
        village: undefined,
        pincode: this.maskPincode(filteredProfile.location.pincode),
        coordinates: undefined
      };
    }

    // Filter financial data
    if (!privacySettings.shareFinancialData) {
      filteredProfile.financialProfile = {
        annualIncomeRange: 'Not disclosed',
        capitalAvailable: 0,
        creditScore: undefined,
        bankAccounts: [],
        existingLoans: []
      };
    }

    return filteredProfile;
  }

  /**
   * Check if profile can be deleted (considering legal requirements)
   */
  public async canDeleteProfile(farmerId: string): Promise<boolean> {
    // Check for active loan applications or legal obligations
    const activeLoansResult = await db.query(`
      SELECT COUNT(*) as count 
      FROM finance.loan_applications 
      WHERE farmer_id = $1 AND application_status IN ('pending', 'approved', 'disbursed')
    `, [farmerId]);

    const activeLoans = parseInt(activeLoansResult.rows[0].count);
    
    // Check for active scheme applications
    const activeSchemesResult = await db.query(`
      SELECT COUNT(*) as count 
      FROM schemes.scheme_applications 
      WHERE farmer_id = $1 AND application_status IN ('pending', 'approved')
    `, [farmerId]);

    const activeSchemes = parseInt(activeSchemesResult.rows[0].count);

    // Profile cannot be deleted if there are active financial or legal obligations
    return activeLoans === 0 && activeSchemes === 0;
  }

  /**
   * Get data retention policy for a farmer
   */
  public async getDataRetentionPolicy(farmerId: string): Promise<{ retentionPeriodMonths: number; nextReviewDate: Date }> {
    const privacySettings = await this.getPrivacySettings(farmerId);
    
    // Get profile creation date
    const profileResult = await db.query(
      'SELECT created_at FROM profiles.farmers WHERE id = $1',
      [farmerId]
    );

    if (profileResult.rows.length === 0) {
      throw new Error('Profile not found');
    }

    const createdAt = new Date(profileResult.rows[0].created_at);
    const nextReviewDate = new Date(createdAt);
    nextReviewDate.setMonth(nextReviewDate.getMonth() + privacySettings.dataRetentionPeriod);

    return {
      retentionPeriodMonths: privacySettings.dataRetentionPeriod,
      nextReviewDate
    };
  }

  /**
   * Export user data for portability (GDPR-like compliance)
   */
  public async exportUserData(farmerId: string): Promise<any> {
    const profile = await db.query(`
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
    `, [farmerId]);

    const privacySettings = await this.getPrivacySettings(farmerId);
    const consents = await this.getConsents(farmerId);

    return {
      profile: profile.rows[0],
      privacySettings,
      consents,
      exportedAt: new Date().toISOString(),
      dataRetentionPolicy: await this.getDataRetentionPolicy(farmerId)
    };
  }

  // Helper methods
  private maskName(name: string): string {
    if (name.length <= 2) return name;
    return name.charAt(0) + '*'.repeat(name.length - 2) + name.charAt(name.length - 1);
  }

  private maskPincode(pincode: string): string {
    if (pincode.length !== 6) return pincode;
    return pincode.substring(0, 3) + '***';
  }
}

export default PrivacyControlService;