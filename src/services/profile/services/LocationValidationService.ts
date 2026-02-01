// Location Validation Service - validates location data against administrative boundaries
import { LocationData, LocationValidationResult, AdministrativeBoundary } from '../../../shared/types/profile';
import { redis } from '../../../shared/database/redis';

export class LocationValidationService {
  private cachePrefix = 'location_validation:';
  private cacheTTL = 24 * 60 * 60; // 24 hours

  // Administrative boundaries data (in production, this would come from a government API)
  private administrativeBoundaries: AdministrativeBoundary[] = [
    {
      state: 'Uttar Pradesh',
      district: 'Lucknow',
      block: 'Mohanlalganj',
      villages: ['Mohanlalganj', 'Gosainganj', 'Malihabad'],
      pincodes: ['226301', '226302', '226303']
    },
    {
      state: 'Maharashtra',
      district: 'Pune',
      block: 'Haveli',
      villages: ['Pashan', 'Baner', 'Balewadi'],
      pincodes: ['411008', '411045', '411057']
    },
    {
      state: 'Tamil Nadu',
      district: 'Chennai',
      block: 'Tambaram',
      villages: ['Tambaram', 'Chrompet', 'Pallavaram'],
      pincodes: ['600045', '600044', '600043']
    },
    {
      state: 'Karnataka',
      district: 'Bangalore Rural',
      block: 'Devanahalli',
      villages: ['Devanahalli', 'Nandi', 'Jadigenahalli'],
      pincodes: ['562110', '562111', '562112']
    },
    {
      state: 'Gujarat',
      district: 'Ahmedabad',
      block: 'Daskroi',
      villages: ['Sarkhej', 'Juhapura', 'Bopal'],
      pincodes: ['380055', '380058', '380059']
    },
    {
      state: 'West Bengal',
      district: 'Kolkata',
      block: 'Baruipur',
      villages: ['Baruipur', 'Canning', 'Sonarpur'],
      pincodes: ['700144', '700145', '700146']
    },
    {
      state: 'Telangana',
      district: 'Hyderabad',
      block: 'Serilingampally',
      villages: ['Gachibowli', 'Kondapur', 'Manikonda'],
      pincodes: ['500032', '500084', '500089']
    }
  ];

  /**
   * Validate location data against administrative boundaries
   */
  public async validateLocation(location: Partial<LocationData>): Promise<LocationValidationResult> {
    try {
      // Check cache first
      const cacheKey = `${this.cachePrefix}${JSON.stringify(location)}`;
      const cachedResult = await redis.getJson<LocationValidationResult>(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }

      const errors: string[] = [];
      const suggestions: LocationData[] = [];
      let validatedLocation: LocationData = { ...location } as LocationData;

      // Validate state
      if (!location.state) {
        errors.push('State is required');
      } else {
        const stateMatch = this.findStateMatch(location.state);
        if (!stateMatch) {
          errors.push(`Invalid state: ${location.state}`);
          const stateSuggestions = this.getStateSuggestions(location.state);
          suggestions.push(...stateSuggestions);
        } else {
          validatedLocation.state = stateMatch.state;
        }
      }

      // Validate district
      if (!location.district) {
        errors.push('District is required');
      } else if (validatedLocation.state) {
        const districtMatch = this.findDistrictMatch(validatedLocation.state, location.district);
        if (!districtMatch) {
          errors.push(`Invalid district: ${location.district} in state: ${validatedLocation.state}`);
          const districtSuggestions = this.getDistrictSuggestions(validatedLocation.state, location.district);
          suggestions.push(...districtSuggestions);
        } else {
          validatedLocation.district = districtMatch.district;
        }
      }

      // Validate block
      if (!location.block) {
        errors.push('Block is required');
      } else if (validatedLocation.state && validatedLocation.district) {
        const blockMatch = this.findBlockMatch(validatedLocation.state, validatedLocation.district, location.block);
        if (!blockMatch) {
          errors.push(`Invalid block: ${location.block} in district: ${validatedLocation.district}`);
          const blockSuggestions = this.getBlockSuggestions(validatedLocation.state, validatedLocation.district, location.block);
          suggestions.push(...blockSuggestions);
        } else {
          validatedLocation.block = blockMatch.block;
        }
      }

      // Validate village (optional)
      if (location.village && validatedLocation.state && validatedLocation.district && validatedLocation.block) {
        const villageMatch = this.findVillageMatch(
          validatedLocation.state, 
          validatedLocation.district, 
          validatedLocation.block, 
          location.village
        );
        if (!villageMatch) {
          errors.push(`Invalid village: ${location.village} in block: ${validatedLocation.block}`);
          const villageSuggestions = this.getVillageSuggestions(
            validatedLocation.state, 
            validatedLocation.district, 
            validatedLocation.block, 
            location.village
          );
          suggestions.push(...villageSuggestions);
        } else {
          validatedLocation.village = villageMatch;
        }
      }

      // Validate pincode
      if (!location.pincode) {
        errors.push('Pincode is required');
      } else {
        const pincodeMatch = this.findPincodeMatch(location.pincode);
        if (!pincodeMatch) {
          errors.push(`Invalid pincode: ${location.pincode}`);
          const pincodeSuggestions = this.getPincodeSuggestions(location.pincode);
          suggestions.push(...pincodeSuggestions);
        } else {
          // Cross-validate pincode with location
          if (validatedLocation.state && validatedLocation.district && validatedLocation.block) {
            const isPincodeValid = this.validatePincodeForLocation(
              validatedLocation.state,
              validatedLocation.district,
              validatedLocation.block,
              location.pincode
            );
            if (!isPincodeValid) {
              errors.push(`Pincode ${location.pincode} does not match the specified location`);
            }
          }
        }
      }

      // Validate coordinates (optional)
      if (location.coordinates) {
        const coordValidation = this.validateCoordinates(location.coordinates);
        if (!coordValidation.isValid) {
          errors.push(...coordValidation.errors);
        }
      }

      const result: LocationValidationResult = {
        isValid: errors.length === 0,
        validatedLocation,
        suggestions: suggestions.slice(0, 5), // Limit to 5 suggestions
        errors
      };

      // Cache the result
      await redis.setJson(cacheKey, result, this.cacheTTL);

      return result;
    } catch (error) {
      console.error('Location validation error:', error);
      return {
        isValid: false,
        validatedLocation: location as LocationData,
        suggestions: [],
        errors: ['Location validation service temporarily unavailable']
      };
    }
  }

  /**
   * Get location suggestions based on partial input
   */
  public async getLocationSuggestions(partialLocation: Partial<LocationData>): Promise<LocationData[]> {
    const suggestions: LocationData[] = [];

    for (const boundary of this.administrativeBoundaries) {
      let matches = true;

      if (partialLocation.state && !this.fuzzyMatch(boundary.state, partialLocation.state)) {
        matches = false;
      }
      if (partialLocation.district && !this.fuzzyMatch(boundary.district, partialLocation.district)) {
        matches = false;
      }
      if (partialLocation.block && !this.fuzzyMatch(boundary.block, partialLocation.block)) {
        matches = false;
      }

      if (matches) {
        // Add suggestions for each village in this boundary
        for (const village of boundary.villages) {
          for (const pincode of boundary.pincodes) {
            suggestions.push({
              state: boundary.state,
              district: boundary.district,
              block: boundary.block,
              village,
              pincode
            });
          }
        }
      }
    }

    return suggestions.slice(0, 10); // Limit to 10 suggestions
  }

  // Private helper methods
  private findStateMatch(state: string): AdministrativeBoundary | null {
    return this.administrativeBoundaries.find(b => 
      this.fuzzyMatch(b.state, state)
    ) || null;
  }

  private findDistrictMatch(state: string, district: string): AdministrativeBoundary | null {
    return this.administrativeBoundaries.find(b => 
      this.fuzzyMatch(b.state, state) && this.fuzzyMatch(b.district, district)
    ) || null;
  }

  private findBlockMatch(state: string, district: string, block: string): AdministrativeBoundary | null {
    return this.administrativeBoundaries.find(b => 
      this.fuzzyMatch(b.state, state) && 
      this.fuzzyMatch(b.district, district) && 
      this.fuzzyMatch(b.block, block)
    ) || null;
  }

  private findVillageMatch(state: string, district: string, block: string, village: string): string | null {
    const boundary = this.administrativeBoundaries.find(b => 
      this.fuzzyMatch(b.state, state) && 
      this.fuzzyMatch(b.district, district) && 
      this.fuzzyMatch(b.block, block)
    );

    if (!boundary) return null;

    return boundary.villages.find(v => this.fuzzyMatch(v, village)) || null;
  }

  private findPincodeMatch(pincode: string): boolean {
    return this.administrativeBoundaries.some(b => 
      b.pincodes.includes(pincode)
    );
  }

  private validatePincodeForLocation(state: string, district: string, block: string, pincode: string): boolean {
    const boundary = this.administrativeBoundaries.find(b => 
      this.fuzzyMatch(b.state, state) && 
      this.fuzzyMatch(b.district, district) && 
      this.fuzzyMatch(b.block, block)
    );

    return boundary ? boundary.pincodes.includes(pincode) : false;
  }

  private validateCoordinates(coordinates: { latitude: number; longitude: number }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (coordinates.latitude < -90 || coordinates.latitude > 90) {
      errors.push('Latitude must be between -90 and 90 degrees');
    }

    if (coordinates.longitude < -180 || coordinates.longitude > 180) {
      errors.push('Longitude must be between -180 and 180 degrees');
    }

    // Check if coordinates are within India's approximate bounds
    const indiaBounds = {
      north: 37.6,
      south: 6.4,
      east: 97.25,
      west: 68.7
    };

    if (coordinates.latitude < indiaBounds.south || coordinates.latitude > indiaBounds.north ||
        coordinates.longitude < indiaBounds.west || coordinates.longitude > indiaBounds.east) {
      errors.push('Coordinates appear to be outside India');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private getStateSuggestions(state: string): LocationData[] {
    const suggestions: LocationData[] = [];
    const matches = this.administrativeBoundaries.filter(b => 
      this.fuzzyMatch(b.state, state, 0.5)
    );

    for (const match of matches.slice(0, 3)) {
      suggestions.push({
        state: match.state,
        district: match.district,
        block: match.block,
        village: match.villages[0],
        pincode: match.pincodes[0]
      });
    }

    return suggestions;
  }

  private getDistrictSuggestions(state: string, district: string): LocationData[] {
    const suggestions: LocationData[] = [];
    const matches = this.administrativeBoundaries.filter(b => 
      this.fuzzyMatch(b.state, state) && this.fuzzyMatch(b.district, district, 0.5)
    );

    for (const match of matches.slice(0, 3)) {
      suggestions.push({
        state: match.state,
        district: match.district,
        block: match.block,
        village: match.villages[0],
        pincode: match.pincodes[0]
      });
    }

    return suggestions;
  }

  private getBlockSuggestions(state: string, district: string, block: string): LocationData[] {
    const suggestions: LocationData[] = [];
    const matches = this.administrativeBoundaries.filter(b => 
      this.fuzzyMatch(b.state, state) && 
      this.fuzzyMatch(b.district, district) && 
      this.fuzzyMatch(b.block, block, 0.5)
    );

    for (const match of matches.slice(0, 3)) {
      suggestions.push({
        state: match.state,
        district: match.district,
        block: match.block,
        village: match.villages[0],
        pincode: match.pincodes[0]
      });
    }

    return suggestions;
  }

  private getVillageSuggestions(state: string, district: string, block: string, village: string): LocationData[] {
    const suggestions: LocationData[] = [];
    const boundary = this.administrativeBoundaries.find(b => 
      this.fuzzyMatch(b.state, state) && 
      this.fuzzyMatch(b.district, district) && 
      this.fuzzyMatch(b.block, block)
    );

    if (boundary) {
      const matchingVillages = boundary.villages.filter(v => 
        this.fuzzyMatch(v, village, 0.5)
      );

      for (const matchingVillage of matchingVillages.slice(0, 3)) {
        suggestions.push({
          state: boundary.state,
          district: boundary.district,
          block: boundary.block,
          village: matchingVillage,
          pincode: boundary.pincodes[0]
        });
      }
    }

    return suggestions;
  }

  private getPincodeSuggestions(pincode: string): LocationData[] {
    const suggestions: LocationData[] = [];
    
    // Find pincodes that start with the same digits
    const prefix = pincode.substring(0, 3);
    
    for (const boundary of this.administrativeBoundaries) {
      const matchingPincodes = boundary.pincodes.filter(p => p.startsWith(prefix));
      
      for (const matchingPincode of matchingPincodes.slice(0, 2)) {
        suggestions.push({
          state: boundary.state,
          district: boundary.district,
          block: boundary.block,
          village: boundary.villages[0],
          pincode: matchingPincode
        });
      }
    }

    return suggestions.slice(0, 5);
  }

  /**
   * Fuzzy string matching using Levenshtein distance
   */
  private fuzzyMatch(str1: string, str2: string, threshold: number = 0.8): boolean {
    const distance = this.levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
    const maxLength = Math.max(str1.length, str2.length);
    const similarity = 1 - (distance / maxLength);
    return similarity >= threshold;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }
}

export default LocationValidationService;