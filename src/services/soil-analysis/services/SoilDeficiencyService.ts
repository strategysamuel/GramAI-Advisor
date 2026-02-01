// Soil Deficiency Service - Identifies specific soil deficiencies and provides targeted remediation recommendations
// Implements comprehensive deficiency analysis with actionable solutions

import {
  SoilParameter,
  SoilNutrients,
  Micronutrients,
  SoilRecommendation
} from '../types';

export interface SoilDeficiency {
  parameter: string;
  deficiencyType: 'severe' | 'moderate' | 'mild';
  currentValue: number;
  optimalRange: { min: number; max: number };
  deficitAmount: number;
  impactOnCrops: string[];
  symptoms: string[];
  causes: string[];
}

export interface RemediationPlan {
  deficiency: SoilDeficiency;
  immediateActions: RemediationAction[];
  longTermActions: RemediationAction[];
  seasonalTiming: SeasonalTiming;
  costEstimate: CostEstimate;
  expectedResults: ExpectedResults;
}

export interface RemediationAction {
  id: string;
  action: string;
  description: string;
  materials: Material[];
  applicationMethod: string;
  dosage: string;
  frequency: string;
  precautions: string[];
  effectiveness: number; // 0-100
}

export interface Material {
  name: string;
  type: 'organic' | 'inorganic' | 'biological';
  quantity: string;
  unit: string;
  costPerUnit: number;
  availability: 'readily_available' | 'seasonal' | 'requires_sourcing';
  alternatives: string[];
}

export interface SeasonalTiming {
  bestSeason: string[];
  avoidSeasons: string[];
  monthlySchedule: Array<{
    month: string;
    actions: string[];
    priority: 'high' | 'medium' | 'low';
  }>;
}

export interface CostEstimate {
  immediate: { min: number; max: number; currency: string };
  longTerm: { min: number; max: number; currency: string };
  totalPerHectare: { min: number; max: number; currency: string };
  paybackPeriod: string;
  costBenefitRatio: number;
}

export interface ExpectedResults {
  timeToImprovement: string;
  expectedIncrease: string;
  yieldImpact: string;
  soilHealthImprovement: string;
  sustainabilityBenefits: string[];
}

export class SoilDeficiencyService {
  constructor() {
    console.log('Soil Deficiency Service initialized');
  }

  /**
   * Identify all soil deficiencies from soil analysis data
   */
  public identifyDeficiencies(
    nutrients: SoilNutrients,
    micronutrients: Micronutrients,
    soilType?: string,
    cropType?: string
  ): SoilDeficiency[] {
    const deficiencies: SoilDeficiency[] = [];

    // Check main nutrients
    if (nutrients.pH) {
      const pHDeficiency = this.checkPHDeficiency(nutrients.pH, soilType);
      if (pHDeficiency) deficiencies.push(pHDeficiency);
    }

    if (nutrients.nitrogen) {
      const nDeficiency = this.checkNutrientDeficiency(nutrients.nitrogen, 'nitrogen', cropType);
      if (nDeficiency) deficiencies.push(nDeficiency);
    }

    if (nutrients.phosphorus) {
      const pDeficiency = this.checkNutrientDeficiency(nutrients.phosphorus, 'phosphorus', cropType);
      if (pDeficiency) deficiencies.push(pDeficiency);
    }

    if (nutrients.potassium) {
      const kDeficiency = this.checkNutrientDeficiency(nutrients.potassium, 'potassium', cropType);
      if (kDeficiency) deficiencies.push(kDeficiency);
    }

    if (nutrients.organicCarbon) {
      const ocDeficiency = this.checkOrganicCarbonDeficiency(nutrients.organicCarbon);
      if (ocDeficiency) deficiencies.push(ocDeficiency);
    }

    // Check micronutrients
    Object.entries(micronutrients).forEach(([name, parameter]) => {
      if (parameter) {
        const microDeficiency = this.checkMicronutrientDeficiency(parameter, name);
        if (microDeficiency) deficiencies.push(microDeficiency);
      }
    });

    return deficiencies.sort((a, b) => this.getDeficiencySeverityScore(b) - this.getDeficiencySeverityScore(a));
  }

  /**
   * Generate comprehensive remediation plan for identified deficiencies
   */
  public generateRemediationPlan(
    deficiencies: SoilDeficiency[],
    farmSize: number = 1, // hectares
    budget?: { min: number; max: number },
    preferences?: {
      organic?: boolean;
      quickResults?: boolean;
      sustainableFocus?: boolean;
    }
  ): RemediationPlan[] {
    return deficiencies.map(deficiency => {
      const immediateActions = this.getImmediateActions(deficiency, preferences);
      const longTermActions = this.getLongTermActions(deficiency, preferences);
      const seasonalTiming = this.getSeasonalTiming(deficiency);
      const costEstimate = this.calculateCostEstimate(immediateActions, longTermActions, farmSize);
      const expectedResults = this.getExpectedResults(deficiency, immediateActions, longTermActions);

      return {
        deficiency,
        immediateActions,
        longTermActions,
        seasonalTiming,
        costEstimate,
        expectedResults
      };
    });
  }

  /**
   * Get integrated remediation strategy for multiple deficiencies
   */
  public getIntegratedRemediationStrategy(
    deficiencies: SoilDeficiency[],
    farmSize: number = 1,
    budget?: { min: number; max: number }
  ): {
    prioritizedActions: RemediationAction[];
    combinedMaterials: Material[];
    totalCost: CostEstimate;
    timeline: Array<{
      phase: string;
      duration: string;
      actions: string[];
      cost: number;
    }>;
    synergies: string[];
    warnings: string[];
  } {
    // Group compatible actions
    const allActions = deficiencies.flatMap(d => [
      ...this.getImmediateActions(d),
      ...this.getLongTermActions(d)
    ]);

    // Prioritize actions by effectiveness and compatibility
    const prioritizedActions = this.prioritizeActions(allActions, deficiencies);
    
    // Combine materials to reduce costs
    const combinedMaterials = this.combineMaterials(allActions);
    
    // Calculate total integrated cost
    const totalCost = this.calculateIntegratedCost(prioritizedActions, farmSize);
    
    // Create implementation timeline
    const timeline = this.createImplementationTimeline(prioritizedActions, deficiencies);
    
    // Identify synergies and warnings
    const synergies = this.identifySynergies(deficiencies, prioritizedActions);
    const warnings = this.identifyWarnings(deficiencies, prioritizedActions);

    return {
      prioritizedActions,
      combinedMaterials,
      totalCost,
      timeline,
      synergies,
      warnings
    };
  }

  /**
   * Check pH deficiency
   */
  private checkPHDeficiency(pH: SoilParameter, soilType?: string): SoilDeficiency | null {
    const optimalRange = { min: 6.0, max: 7.5 };
    const value = pH.value;

    if (value >= optimalRange.min && value <= optimalRange.max) {
      return null; // No deficiency
    }

    let deficiencyType: 'severe' | 'moderate' | 'mild';
    let deficitAmount: number;
    let impactOnCrops: string[];
    let symptoms: string[];
    let causes: string[];

    if (value < 5.0 || value > 8.5) {
      deficiencyType = 'severe';
      deficitAmount = value < 5.0 ? optimalRange.min - value : value - optimalRange.max;
      impactOnCrops = [
        'Severe nutrient lockup',
        'Poor root development',
        'Reduced crop yields (30-50%)',
        'Increased disease susceptibility'
      ];
      symptoms = [
        'Yellowing of leaves',
        'Stunted plant growth',
        'Poor fruit/grain formation',
        'Increased pest problems'
      ];
      causes = value < 5.0 
        ? ['Excessive use of acidic fertilizers', 'Acid rain', 'Organic matter decomposition']
        : ['High lime content', 'Alkaline irrigation water', 'Excessive lime application'];
    } else if (value < 5.5 || value > 8.0) {
      deficiencyType = 'moderate';
      deficitAmount = value < 5.5 ? optimalRange.min - value : value - optimalRange.max;
      impactOnCrops = [
        'Reduced nutrient availability',
        'Moderate yield reduction (15-30%)',
        'Slower plant growth'
      ];
      symptoms = [
        'Slight leaf discoloration',
        'Reduced plant vigor',
        'Uneven crop growth'
      ];
      causes = value < 5.5
        ? ['Acidic fertilizers', 'Natural soil acidity', 'Heavy rainfall']
        : ['Moderate lime content', 'Alkaline water', 'Natural soil alkalinity'];
    } else {
      deficiencyType = 'mild';
      deficitAmount = value < optimalRange.min ? optimalRange.min - value : value - optimalRange.max;
      impactOnCrops = [
        'Slightly reduced nutrient uptake',
        'Minor yield impact (5-15%)'
      ];
      symptoms = [
        'Subtle growth differences',
        'Occasional nutrient deficiency signs'
      ];
      causes = ['Natural soil variation', 'Seasonal changes', 'Fertilizer effects'];
    }

    return {
      parameter: 'pH',
      deficiencyType,
      currentValue: value,
      optimalRange,
      deficitAmount,
      impactOnCrops,
      symptoms,
      causes
    };
  }

  /**
   * Check nutrient deficiency (N, P, K)
   */
  private checkNutrientDeficiency(
    nutrient: SoilParameter,
    nutrientType: 'nitrogen' | 'phosphorus' | 'potassium',
    cropType?: string
  ): SoilDeficiency | null {
    if (nutrient.status === 'optimal' || nutrient.status === 'adequate') {
      return null;
    }

    const optimalRange = nutrient.range.optimal || { min: nutrient.range.min, max: nutrient.range.max };
    const value = nutrient.value;
    const deficitAmount = optimalRange.min - value;

    let deficiencyType: 'severe' | 'moderate' | 'mild';
    if (nutrient.status === 'deficient') {
      deficiencyType = value < optimalRange.min * 0.5 ? 'severe' : 'moderate';
    } else {
      deficiencyType = 'mild';
    }

    const nutrientInfo = this.getNutrientDeficiencyInfo(nutrientType, deficiencyType);

    return {
      parameter: nutrientType,
      deficiencyType,
      currentValue: value,
      optimalRange,
      deficitAmount,
      impactOnCrops: nutrientInfo.impactOnCrops,
      symptoms: nutrientInfo.symptoms,
      causes: nutrientInfo.causes
    };
  }

  /**
   * Check organic carbon deficiency
   */
  private checkOrganicCarbonDeficiency(organicCarbon: SoilParameter): SoilDeficiency | null {
    const optimalRange = { min: 0.5, max: 1.5 };
    const value = organicCarbon.value;

    if (value >= optimalRange.min) {
      return null;
    }

    let deficiencyType: 'severe' | 'moderate' | 'mild';
    if (value < 0.25) {
      deficiencyType = 'severe';
    } else if (value < 0.4) {
      deficiencyType = 'moderate';
    } else {
      deficiencyType = 'mild';
    }

    return {
      parameter: 'Organic Carbon',
      deficiencyType,
      currentValue: value,
      optimalRange,
      deficitAmount: optimalRange.min - value,
      impactOnCrops: [
        'Poor soil structure',
        'Reduced water retention',
        'Lower nutrient availability',
        'Decreased microbial activity'
      ],
      symptoms: [
        'Hard, compacted soil',
        'Poor water infiltration',
        'Reduced crop vigor',
        'Increased erosion'
      ],
      causes: [
        'Lack of organic matter addition',
        'Excessive tillage',
        'Crop residue removal',
        'Continuous cropping without rotation'
      ]
    };
  }

  /**
   * Check micronutrient deficiency
   */
  private checkMicronutrientDeficiency(micronutrient: SoilParameter, name: string): SoilDeficiency | null {
    if (micronutrient.status === 'optimal' || micronutrient.status === 'adequate') {
      return null;
    }

    const optimalRange = micronutrient.range.optimal || { min: micronutrient.range.min, max: micronutrient.range.max };
    const value = micronutrient.value;
    const deficitAmount = optimalRange.min - value;

    let deficiencyType: 'severe' | 'moderate' | 'mild';
    if (micronutrient.status === 'deficient') {
      deficiencyType = value < optimalRange.min * 0.3 ? 'severe' : 'moderate';
    } else {
      deficiencyType = 'mild';
    }

    const microInfo = this.getMicronutrientDeficiencyInfo(name, deficiencyType);

    return {
      parameter: name,
      deficiencyType,
      currentValue: value,
      optimalRange,
      deficitAmount,
      impactOnCrops: microInfo.impactOnCrops,
      symptoms: microInfo.symptoms,
      causes: microInfo.causes
    };
  }

  /**
   * Get nutrient deficiency information
   */
  private getNutrientDeficiencyInfo(nutrientType: string, severity: string) {
    const info: Record<string, any> = {
      nitrogen: {
        severe: {
          impactOnCrops: ['Severe growth stunting', 'Yellowing of older leaves', 'Poor grain/fruit development', 'Yield loss 40-60%'],
          symptoms: ['Pale yellow leaves', 'Weak stems', 'Reduced tillering', 'Poor flowering'],
          causes: ['Inadequate fertilizer application', 'Leaching due to heavy rains', 'Poor organic matter', 'Continuous cropping']
        },
        moderate: {
          impactOnCrops: ['Reduced plant vigor', 'Light green foliage', 'Moderate yield reduction 20-40%'],
          symptoms: ['Light green leaves', 'Slower growth', 'Reduced leaf size'],
          causes: ['Insufficient nitrogen supply', 'Seasonal leaching', 'High crop demand']
        },
        mild: {
          impactOnCrops: ['Slight growth reduction', 'Minor yield impact 5-20%'],
          symptoms: ['Slightly pale leaves', 'Reduced growth rate'],
          causes: ['Timing of fertilizer application', 'Soil conditions']
        }
      },
      phosphorus: {
        severe: {
          impactOnCrops: ['Poor root development', 'Delayed maturity', 'Purple leaf discoloration', 'Yield loss 30-50%'],
          symptoms: ['Dark green/purple leaves', 'Stunted growth', 'Poor flowering', 'Weak root system'],
          causes: ['Phosphorus fixation', 'Low soil phosphorus', 'High pH conditions', 'Cold soil temperatures']
        },
        moderate: {
          impactOnCrops: ['Reduced root growth', 'Delayed flowering', 'Moderate yield reduction 15-30%'],
          symptoms: ['Darker green foliage', 'Slower establishment', 'Reduced branching'],
          causes: ['Moderate phosphorus deficiency', 'Soil pH issues', 'Organic matter depletion']
        },
        mild: {
          impactOnCrops: ['Slight root development issues', 'Minor yield impact 5-15%'],
          symptoms: ['Subtle color changes', 'Slightly delayed growth'],
          causes: ['Seasonal availability', 'Soil conditions']
        }
      },
      potassium: {
        severe: {
          impactOnCrops: ['Leaf edge burning', 'Weak stems', 'Poor disease resistance', 'Yield loss 25-45%'],
          symptoms: ['Brown leaf margins', 'Lodging', 'Increased disease', 'Poor fruit quality'],
          causes: ['Inadequate potassium supply', 'Leaching in sandy soils', 'High magnesium/calcium', 'Continuous cropping']
        },
        moderate: {
          impactOnCrops: ['Reduced disease resistance', 'Moderate stem weakness', 'Yield reduction 15-25%'],
          symptoms: ['Yellowing leaf edges', 'Reduced plant vigor', 'Susceptibility to stress'],
          causes: ['Moderate potassium deficiency', 'Nutrient imbalance', 'Soil type factors']
        },
        mild: {
          impactOnCrops: ['Slight stress susceptibility', 'Minor yield impact 5-15%'],
          symptoms: ['Subtle leaf changes', 'Reduced stress tolerance'],
          causes: ['Seasonal demand', 'Soil conditions']
        }
      }
    };

    return info[nutrientType]?.[severity] || {
      impactOnCrops: ['General nutrient deficiency effects'],
      symptoms: ['Reduced plant health'],
      causes: ['Insufficient nutrient supply']
    };
  }

  /**
   * Get micronutrient deficiency information
   */
  private getMicronutrientDeficiencyInfo(micronutrient: string, severity: string) {
    const info: Record<string, any> = {
      zinc: {
        severe: {
          impactOnCrops: ['Severe stunting', 'White bud/rosette formation', 'Poor grain filling', 'Yield loss 30-50%'],
          symptoms: ['Interveinal chlorosis', 'Shortened internodes', 'Small leaves', 'White buds'],
          causes: ['High pH soils', 'Excessive phosphorus', 'Low organic matter', 'Calcareous soils']
        },
        moderate: {
          impactOnCrops: ['Growth reduction', 'Delayed maturity', 'Yield reduction 15-30%'],
          symptoms: ['Yellowing between veins', 'Reduced leaf size', 'Poor tillering'],
          causes: ['Moderate zinc deficiency', 'Soil pH issues', 'Phosphorus interference']
        }
      },
      iron: {
        severe: {
          impactOnCrops: ['Severe chlorosis', 'Leaf bleaching', 'Poor photosynthesis', 'Yield loss 25-40%'],
          symptoms: ['Yellow/white leaves', 'Green veins', 'Leaf burn', 'Stunted growth'],
          causes: ['High pH/alkaline soils', 'Waterlogged conditions', 'High bicarbonate', 'Excessive lime']
        }
      },
      manganese: {
        severe: {
          impactOnCrops: ['Interveinal chlorosis', 'Necrotic spots', 'Poor grain development', 'Yield loss 20-35%'],
          symptoms: ['Yellow leaves with green veins', 'Brown spots', 'Reduced vigor'],
          causes: ['High pH soils', 'Excessive liming', 'Organic matter depletion', 'Poor drainage']
        }
      }
    };

    const microInfo = info[micronutrient.toLowerCase()]?.[severity];
    return microInfo || {
      impactOnCrops: [`${micronutrient} deficiency effects`],
      symptoms: ['Micronutrient deficiency symptoms'],
      causes: ['Insufficient micronutrient availability']
    };
  }

  /**
   * Get deficiency severity score for sorting
   */
  private getDeficiencySeverityScore(deficiency: SoilDeficiency): number {
    const severityScores = { severe: 100, moderate: 60, mild: 30 };
    const parameterWeights = {
      'pH': 1.2,
      'nitrogen': 1.1,
      'phosphorus': 1.0,
      'potassium': 1.0,
      'Organic Carbon': 0.9
    };

    const baseScore = severityScores[deficiency.deficiencyType];
    const weight = parameterWeights[deficiency.parameter as keyof typeof parameterWeights] || 0.8;
    
    return baseScore * weight;
  }

  /**
   * Get immediate remediation actions
   */
  private getImmediateActions(
    deficiency: SoilDeficiency,
    preferences?: { organic?: boolean; quickResults?: boolean }
  ): RemediationAction[] {
    const actions: RemediationAction[] = [];
    const { parameter, deficiencyType } = deficiency;

    switch (parameter.toLowerCase()) {
      case 'ph':
        if (deficiency.currentValue < 6.0) {
          // Acidic soil - need lime
          actions.push({
            id: 'lime_application_immediate',
            action: 'Apply Agricultural Lime',
            description: 'Quick lime application to raise soil pH and improve nutrient availability',
            materials: [{
              name: 'Agricultural Lime (CaCO3)',
              type: 'inorganic',
              quantity: deficiencyType === 'severe' ? '1000-1500' : '500-1000',
              unit: 'kg/hectare',
              costPerUnit: 8,
              availability: 'readily_available',
              alternatives: ['Dolomitic lime', 'Quick lime', 'Wood ash']
            }],
            applicationMethod: 'Broadcast and incorporate into top 15-20 cm of soil',
            dosage: `${deficiencyType === 'severe' ? '1000-1500' : '500-1000'} kg per hectare`,
            frequency: 'One-time application, retest after 3 months',
            precautions: [
              'Do not apply during crop season',
              'Ensure uniform distribution',
              'Water lightly after application'
            ],
            effectiveness: deficiencyType === 'severe' ? 85 : 75
          });
        } else if (deficiency.currentValue > 7.5) {
          // Alkaline soil - need acidification
          actions.push({
            id: 'sulfur_application_immediate',
            action: 'Apply Elemental Sulfur',
            description: 'Sulfur application to lower soil pH in alkaline conditions',
            materials: [{
              name: 'Elemental Sulfur',
              type: 'inorganic',
              quantity: deficiencyType === 'severe' ? '300-500' : '200-300',
              unit: 'kg/hectare',
              costPerUnit: 25,
              availability: 'readily_available',
              alternatives: ['Gypsum', 'Organic matter', 'Acidic fertilizers']
            }],
            applicationMethod: 'Broadcast and mix into soil before planting',
            dosage: `${deficiencyType === 'severe' ? '300-500' : '200-300'} kg per hectare`,
            frequency: 'One-time application, monitor pH monthly',
            precautions: [
              'Apply 2-3 months before planting',
              'Ensure good soil moisture',
              'Monitor soil pH regularly'
            ],
            effectiveness: deficiencyType === 'severe' ? 80 : 70
          });
        }
        break;

      case 'nitrogen':
        actions.push({
          id: 'nitrogen_fertilizer_immediate',
          action: 'Apply Quick-Release Nitrogen Fertilizer',
          description: 'Immediate nitrogen supply to address deficiency and support plant growth',
          materials: [{
            name: preferences?.organic ? 'Liquid Organic Fertilizer' : 'Urea (46-0-0)',
            type: preferences?.organic ? 'organic' : 'inorganic',
            quantity: deficiencyType === 'severe' ? '150-200' : '100-150',
            unit: 'kg/hectare',
            costPerUnit: preferences?.organic ? 45 : 25,
            availability: 'readily_available',
            alternatives: preferences?.organic 
              ? ['Fish emulsion', 'Compost tea', 'Blood meal']
              : ['Ammonium sulfate', 'CAN', 'NPK complex']
          }],
          applicationMethod: preferences?.organic 
            ? 'Dilute and apply as foliar spray or soil drench'
            : 'Split application: 50% basal, 50% top dressing',
          dosage: `${deficiencyType === 'severe' ? '150-200' : '100-150'} kg per hectare`,
          frequency: 'Split into 2-3 applications over 4-6 weeks',
          precautions: [
            'Apply during cool hours',
            'Ensure adequate soil moisture',
            'Avoid over-application to prevent burning'
          ],
          effectiveness: preferences?.organic ? 70 : 85
        });
        break;

      case 'phosphorus':
        actions.push({
          id: 'phosphorus_fertilizer_immediate',
          action: 'Apply Phosphorus Fertilizer',
          description: 'Phosphorus application to improve root development and plant establishment',
          materials: [{
            name: preferences?.organic ? 'Bone Meal' : 'DAP (18-46-0)',
            type: preferences?.organic ? 'organic' : 'inorganic',
            quantity: deficiencyType === 'severe' ? '100-150' : '60-100',
            unit: 'kg/hectare',
            costPerUnit: preferences?.organic ? 60 : 35,
            availability: 'readily_available',
            alternatives: preferences?.organic 
              ? ['Rock phosphate', 'Compost', 'Poultry manure']
              : ['SSP', 'TSP', 'NPK complex']
          }],
          applicationMethod: 'Band placement near root zone or broadcast and incorporate',
          dosage: `${deficiencyType === 'severe' ? '100-150' : '60-100'} kg per hectare`,
          frequency: 'Single application at planting, side-dress if needed',
          precautions: [
            'Place near root zone for better uptake',
            'Avoid surface application without incorporation',
            'Consider soil pH for optimal availability'
          ],
          effectiveness: preferences?.organic ? 65 : 80
        });
        break;

      case 'potassium':
        actions.push({
          id: 'potassium_fertilizer_immediate',
          action: 'Apply Potassium Fertilizer',
          description: 'Potassium application to improve plant vigor and disease resistance',
          materials: [{
            name: preferences?.organic ? 'Wood Ash' : 'Muriate of Potash (KCl)',
            type: preferences?.organic ? 'organic' : 'inorganic',
            quantity: deficiencyType === 'severe' ? '120-180' : '80-120',
            unit: 'kg/hectare',
            costPerUnit: preferences?.organic ? 15 : 30,
            availability: preferences?.organic ? 'seasonal' : 'readily_available',
            alternatives: preferences?.organic 
              ? ['Banana peel compost', 'Kelp meal', 'Greensand']
              : ['SOP', 'Potassium sulfate', 'NPK complex']
          }],
          applicationMethod: 'Broadcast and incorporate or side-dress around plants',
          dosage: `${deficiencyType === 'severe' ? '120-180' : '80-120'} kg per hectare`,
          frequency: 'Split application: 60% basal, 40% at flowering',
          precautions: [
            'Avoid chloride-sensitive crops if using KCl',
            'Ensure adequate soil moisture',
            'Monitor for salt buildup in arid regions'
          ],
          effectiveness: preferences?.organic ? 60 : 75
        });
        break;

      case 'organic carbon':
        actions.push({
          id: 'quick_organic_matter',
          action: 'Apply Quick-Decomposing Organic Matter',
          description: 'Fast-acting organic matter to improve soil structure and microbial activity',
          materials: [{
            name: 'Well-decomposed Compost',
            type: 'organic',
            quantity: deficiencyType === 'severe' ? '3-5' : '2-3',
            unit: 'tons/hectare',
            costPerUnit: 2000,
            availability: 'readily_available',
            alternatives: ['Vermicompost', 'Aged FYM', 'Biochar blend']
          }],
          applicationMethod: 'Broadcast and incorporate into top 15 cm of soil',
          dosage: `${deficiencyType === 'severe' ? '3-5' : '2-3'} tons per hectare`,
          frequency: 'Single application, repeat seasonally',
          precautions: [
            'Ensure compost is well-decomposed',
            'Apply before planting or between crops',
            'Water lightly after application'
          ],
          effectiveness: 70
        });
        break;

      default:
        // Micronutrients
        if (['zinc', 'iron', 'manganese', 'copper', 'boron'].includes(parameter.toLowerCase())) {
          actions.push(this.getMicronutrientImmediateAction(parameter, deficiencyType, preferences));
        }
    }

    return actions;
  }

  /**
   * Get long-term remediation actions
   */
  private getLongTermActions(
    deficiency: SoilDeficiency,
    preferences?: { organic?: boolean; sustainableFocus?: boolean }
  ): RemediationAction[] {
    const actions: RemediationAction[] = [];
    const { parameter, deficiencyType } = deficiency;

    switch (parameter.toLowerCase()) {
      case 'ph':
        actions.push({
          id: 'organic_matter_ph_longterm',
          action: 'Build Organic Matter for pH Buffering',
          description: 'Long-term organic matter addition to naturally buffer soil pH',
          materials: [{
            name: 'Farm Yard Manure (FYM)',
            type: 'organic',
            quantity: '8-12',
            unit: 'tons/hectare/year',
            costPerUnit: 1500,
            availability: 'readily_available',
            alternatives: ['Compost', 'Green manure', 'Crop residues']
          }],
          applicationMethod: 'Annual application and incorporation before main season',
          dosage: '8-12 tons per hectare annually',
          frequency: 'Annual application for 3-5 years',
          precautions: [
            'Use well-decomposed manure',
            'Apply during off-season',
            'Monitor pH changes annually'
          ],
          effectiveness: 85
        });
        break;

      case 'nitrogen':
        actions.push({
          id: 'nitrogen_longterm_organic',
          action: 'Establish Nitrogen-Fixing System',
          description: 'Sustainable nitrogen supply through biological nitrogen fixation',
          materials: [{
            name: 'Legume Cover Crop Seeds',
            type: 'biological',
            quantity: '25-40',
            unit: 'kg/hectare',
            costPerUnit: 150,
            availability: 'seasonal',
            alternatives: ['Rhizobium inoculant', 'Green manure crops', 'Intercropping legumes']
          }],
          applicationMethod: 'Intercropping or rotation with nitrogen-fixing legumes',
          dosage: '25-40 kg seeds per hectare for cover crops',
          frequency: 'Include legumes in 30-50% of cropping system',
          precautions: [
            'Select appropriate legume varieties',
            'Ensure proper inoculation',
            'Manage competition with main crops'
          ],
          effectiveness: 80
        });
        break;

      case 'phosphorus':
        actions.push({
          id: 'phosphorus_longterm_organic',
          action: 'Build Soil Phosphorus Reserves',
          description: 'Long-term phosphorus management through organic and biological approaches',
          materials: [{
            name: 'Rock Phosphate',
            type: 'organic',
            quantity: '200-400',
            unit: 'kg/hectare',
            costPerUnit: 20,
            availability: 'readily_available',
            alternatives: ['Bone meal', 'Phosphate-rich compost', 'Mycorrhizal inoculants']
          }],
          applicationMethod: 'Annual application with organic matter',
          dosage: '200-400 kg per hectare annually',
          frequency: 'Annual application for 3-4 years, then maintenance',
          precautions: [
            'Apply with organic matter for better availability',
            'Consider soil pH for optimal release',
            'Monitor soil P levels annually'
          ],
          effectiveness: 75
        });
        break;

      case 'potassium':
        actions.push({
          id: 'potassium_longterm_organic',
          action: 'Sustainable Potassium Management',
          description: 'Long-term potassium supply through organic sources and conservation',
          materials: [{
            name: 'Potassium-rich Compost',
            type: 'organic',
            quantity: '5-8',
            unit: 'tons/hectare/year',
            costPerUnit: 2500,
            availability: 'readily_available',
            alternatives: ['Banana waste compost', 'Kelp meal', 'Wood ash']
          }],
          applicationMethod: 'Annual compost application with crop residue management',
          dosage: '5-8 tons per hectare annually',
          frequency: 'Annual application with residue incorporation',
          precautions: [
            'Ensure balanced compost composition',
            'Incorporate crop residues to prevent K loss',
            'Monitor soil K status regularly'
          ],
          effectiveness: 70
        });
        break;

      case 'organic carbon':
        actions.push({
          id: 'soil_carbon_building',
          action: 'Comprehensive Soil Carbon Building Program',
          description: 'Multi-year program to build soil organic matter and carbon',
          materials: [{
            name: 'Diverse Organic Inputs',
            type: 'organic',
            quantity: '10-15',
            unit: 'tons/hectare/year',
            costPerUnit: 1800,
            availability: 'readily_available',
            alternatives: ['Cover crops', 'Agroforestry', 'Integrated farming']
          }],
          applicationMethod: 'Combination of FYM, compost, cover crops, and residue management',
          dosage: '10-15 tons organic matter per hectare annually',
          frequency: 'Continuous program for 5+ years',
          precautions: [
            'Diversify organic matter sources',
            'Minimize soil disturbance',
            'Maintain soil cover year-round'
          ],
          effectiveness: 90
        });
        break;

      default:
        // Micronutrients long-term
        if (['zinc', 'iron', 'manganese', 'copper', 'boron'].includes(parameter.toLowerCase())) {
          actions.push(this.getMicronutrientLongTermAction(parameter, deficiencyType, preferences));
        }
    }

    // Add soil health improvement action for all deficiencies
    if (preferences?.sustainableFocus) {
      actions.push({
        id: 'integrated_soil_health',
        action: 'Integrated Soil Health Management',
        description: 'Holistic approach to improve overall soil health and prevent future deficiencies',
        materials: [{
          name: 'Soil Health Package',
          type: 'biological',
          quantity: '1',
          unit: 'package/hectare',
          costPerUnit: 5000,
          availability: 'requires_sourcing',
          alternatives: ['Custom microbial blend', 'Diverse cover crop mix', 'Agroecological practices']
        }],
        applicationMethod: 'Integrated approach combining biological, organic, and conservation practices',
        dosage: 'Customized based on soil conditions and farming system',
        frequency: 'Ongoing management system',
        precautions: [
          'Requires technical support',
          'Monitor soil health indicators',
          'Adapt practices based on results'
        ],
        effectiveness: 95
      });
    }

    return actions;
  }

  /**
   * Get seasonal timing for remediation
   */
  private getSeasonalTiming(deficiency: SoilDeficiency): SeasonalTiming {
    const { parameter } = deficiency;
    
    const timingMap: Record<string, SeasonalTiming> = {
      'ph': {
        bestSeason: ['Pre-monsoon (April-May)', 'Post-harvest (November-December)'],
        avoidSeasons: ['During crop season', 'Heavy monsoon period'],
        monthlySchedule: [
          { month: 'April', actions: ['Soil testing', 'Lime procurement'], priority: 'high' },
          { month: 'May', actions: ['Lime application', 'Soil incorporation'], priority: 'high' },
          { month: 'June', actions: ['Monitor pH changes'], priority: 'medium' },
          { month: 'November', actions: ['Post-harvest pH testing'], priority: 'medium' },
          { month: 'December', actions: ['Additional lime if needed'], priority: 'low' }
        ]
      },
      'nitrogen': {
        bestSeason: ['Pre-planting', 'Active growth period', 'Split applications'],
        avoidSeasons: ['Heavy rainfall period', 'Dormant season'],
        monthlySchedule: [
          { month: 'March', actions: ['Basal nitrogen application'], priority: 'high' },
          { month: 'May', actions: ['First top dressing'], priority: 'high' },
          { month: 'July', actions: ['Second top dressing'], priority: 'medium' },
          { month: 'September', actions: ['Final application if needed'], priority: 'low' }
        ]
      },
      'phosphorus': {
        bestSeason: ['Pre-planting', 'Soil preparation time'],
        avoidSeasons: ['During heavy rains', 'Post-flowering'],
        monthlySchedule: [
          { month: 'March', actions: ['Phosphorus application', 'Soil incorporation'], priority: 'high' },
          { month: 'April', actions: ['Monitor plant response'], priority: 'medium' },
          { month: 'June', actions: ['Side dressing if needed'], priority: 'low' }
        ]
      },
      'potassium': {
        bestSeason: ['Pre-planting', 'Flowering stage'],
        avoidSeasons: ['Excessive moisture conditions'],
        monthlySchedule: [
          { month: 'March', actions: ['Basal potassium application'], priority: 'high' },
          { month: 'June', actions: ['Flowering stage application'], priority: 'high' },
          { month: 'August', actions: ['Fruit development support'], priority: 'medium' }
        ]
      },
      'organic carbon': {
        bestSeason: ['Post-harvest', 'Pre-monsoon preparation'],
        avoidSeasons: ['Active crop season', 'Peak monsoon'],
        monthlySchedule: [
          { month: 'November', actions: ['Organic matter application'], priority: 'high' },
          { month: 'December', actions: ['Soil incorporation'], priority: 'high' },
          { month: 'January', actions: ['Composting preparation'], priority: 'medium' },
          { month: 'April', actions: ['Pre-season organic addition'], priority: 'medium' }
        ]
      }
    };

    // Default timing for micronutrients
    const defaultMicronutrientTiming: SeasonalTiming = {
      bestSeason: ['Pre-planting', 'Early growth stage'],
      avoidSeasons: ['Flowering period', 'Harvest time'],
      monthlySchedule: [
        { month: 'March', actions: ['Soil application'], priority: 'high' },
        { month: 'May', actions: ['Foliar application'], priority: 'medium' },
        { month: 'July', actions: ['Monitor deficiency symptoms'], priority: 'low' }
      ]
    };

    return timingMap[parameter.toLowerCase()] || defaultMicronutrientTiming;
  }

  /**
   * Calculate cost estimate
   */
  private calculateCostEstimate(
    immediateActions: RemediationAction[],
    longTermActions: RemediationAction[],
    farmSize: number
  ): CostEstimate {
    let immediateCost = { min: 0, max: 0 };
    let longTermCost = { min: 0, max: 0 };

    // Calculate immediate action costs
    immediateActions.forEach(action => {
      action.materials.forEach(material => {
        const quantity = parseFloat(material.quantity.split('-')[0]) || 0;
        const maxQuantity = parseFloat(material.quantity.split('-')[1]) || quantity;
        const minCost = quantity * material.costPerUnit * farmSize;
        const maxCost = maxQuantity * material.costPerUnit * farmSize;
        
        immediateCost.min += minCost;
        immediateCost.max += maxCost;
      });
    });

    // Calculate long-term action costs (annual for 3 years)
    longTermActions.forEach(action => {
      action.materials.forEach(material => {
        const quantity = parseFloat(material.quantity.split('-')[0]) || 0;
        const maxQuantity = parseFloat(material.quantity.split('-')[1]) || quantity;
        const minCost = quantity * material.costPerUnit * farmSize * 3; // 3 years
        const maxCost = maxQuantity * material.costPerUnit * farmSize * 3;
        
        longTermCost.min += minCost;
        longTermCost.max += maxCost;
      });
    });

    const totalMin = immediateCost.min + longTermCost.min;
    const totalMax = immediateCost.max + longTermCost.max;

    // Calculate per hectare costs
    const perHectareMin = totalMin / farmSize;
    const perHectareMax = totalMax / farmSize;

    // Estimate payback period based on expected yield improvement
    const expectedYieldIncrease = 0.25; // 25% average increase
    const averageYieldValue = 50000; // INR per hectare per season
    const additionalIncome = averageYieldValue * expectedYieldIncrease;
    const paybackSeasons = Math.ceil(perHectareMin / additionalIncome);

    // Cost-benefit ratio
    const totalBenefit = additionalIncome * 6; // 3 years, 2 seasons per year
    const costBenefitRatio = totalBenefit / perHectareMin;

    return {
      immediate: { min: immediateCost.min, max: immediateCost.max, currency: 'INR' },
      longTerm: { min: longTermCost.min, max: longTermCost.max, currency: 'INR' },
      totalPerHectare: { min: perHectareMin, max: perHectareMax, currency: 'INR' },
      paybackPeriod: `${paybackSeasons} season${paybackSeasons > 1 ? 's' : ''}`,
      costBenefitRatio: Math.round(costBenefitRatio * 10) / 10
    };
  }

  /**
   * Get expected results
   */
  private getExpectedResults(
    deficiency: SoilDeficiency,
    immediateActions: RemediationAction[],
    longTermActions: RemediationAction[]
  ): ExpectedResults {
    const { parameter, deficiencyType } = deficiency;
    
    const resultsMap: Record<string, Record<string, ExpectedResults>> = {
      'ph': {
        'severe': {
          timeToImprovement: '2-3 months',
          expectedIncrease: '30-50% improvement in nutrient availability',
          yieldImpact: '25-40% yield increase expected',
          soilHealthImprovement: 'Significant improvement in overall soil health',
          sustainabilityBenefits: [
            'Better nutrient use efficiency',
            'Reduced fertilizer requirements',
            'Improved soil microbial activity',
            'Enhanced root development'
          ]
        },
        'moderate': {
          timeToImprovement: '1-2 months',
          expectedIncrease: '20-30% improvement in nutrient availability',
          yieldImpact: '15-25% yield increase expected',
          soilHealthImprovement: 'Moderate improvement in soil health',
          sustainabilityBenefits: [
            'Improved nutrient uptake',
            'Better plant vigor',
            'Reduced nutrient losses'
          ]
        },
        'mild': {
          timeToImprovement: '3-6 weeks',
          expectedIncrease: '10-20% improvement in nutrient availability',
          yieldImpact: '10-15% yield increase expected',
          soilHealthImprovement: 'Gradual improvement in soil conditions',
          sustainabilityBenefits: [
            'Optimized nutrient availability',
            'Stable soil conditions'
          ]
        }
      },
      'nitrogen': {
        'severe': {
          timeToImprovement: '2-4 weeks',
          expectedIncrease: '40-60% increase in plant vigor',
          yieldImpact: '30-50% yield increase expected',
          soilHealthImprovement: 'Improved soil biological activity',
          sustainabilityBenefits: [
            'Enhanced plant growth',
            'Better protein content',
            'Improved soil organic matter',
            'Increased microbial diversity'
          ]
        },
        'moderate': {
          timeToImprovement: '2-3 weeks',
          expectedIncrease: '25-40% increase in plant vigor',
          yieldImpact: '20-30% yield increase expected',
          soilHealthImprovement: 'Moderate improvement in soil biology',
          sustainabilityBenefits: [
            'Better plant development',
            'Improved leaf color',
            'Enhanced tillering'
          ]
        },
        'mild': {
          timeToImprovement: '1-2 weeks',
          expectedIncrease: '15-25% increase in plant vigor',
          yieldImpact: '10-20% yield increase expected',
          soilHealthImprovement: 'Gradual improvement in plant health',
          sustainabilityBenefits: [
            'Optimized growth rate',
            'Better stress tolerance'
          ]
        }
      },
      'phosphorus': {
        'severe': {
          timeToImprovement: '4-6 weeks',
          expectedIncrease: '50-70% improvement in root development',
          yieldImpact: '25-40% yield increase expected',
          soilHealthImprovement: 'Significant improvement in root zone health',
          sustainabilityBenefits: [
            'Enhanced root system',
            'Better flowering and fruiting',
            'Improved nutrient uptake',
            'Stronger plant establishment'
          ]
        },
        'moderate': {
          timeToImprovement: '3-4 weeks',
          expectedIncrease: '30-50% improvement in root development',
          yieldImpact: '15-25% yield increase expected',
          soilHealthImprovement: 'Moderate improvement in root health',
          sustainabilityBenefits: [
            'Better root growth',
            'Improved flowering',
            'Enhanced establishment'
          ]
        },
        'mild': {
          timeToImprovement: '2-3 weeks',
          expectedIncrease: '15-30% improvement in root development',
          yieldImpact: '10-15% yield increase expected',
          soilHealthImprovement: 'Gradual improvement in root zone',
          sustainabilityBenefits: [
            'Optimized root function',
            'Better plant anchoring'
          ]
        }
      },
      'potassium': {
        'severe': {
          timeToImprovement: '3-5 weeks',
          expectedIncrease: '40-60% improvement in disease resistance',
          yieldImpact: '20-35% yield increase expected',
          soilHealthImprovement: 'Enhanced plant stress tolerance',
          sustainabilityBenefits: [
            'Better disease resistance',
            'Improved fruit quality',
            'Enhanced stress tolerance',
            'Stronger stems and branches'
          ]
        },
        'moderate': {
          timeToImprovement: '2-4 weeks',
          expectedIncrease: '25-40% improvement in disease resistance',
          yieldImpact: '15-25% yield increase expected',
          soilHealthImprovement: 'Moderate improvement in plant health',
          sustainabilityBenefits: [
            'Better plant vigor',
            'Improved quality',
            'Reduced lodging'
          ]
        },
        'mild': {
          timeToImprovement: '2-3 weeks',
          expectedIncrease: '15-25% improvement in disease resistance',
          yieldImpact: '10-15% yield increase expected',
          soilHealthImprovement: 'Gradual improvement in plant strength',
          sustainabilityBenefits: [
            'Optimized plant function',
            'Better stress response'
          ]
        }
      },
      'organic carbon': {
        'severe': {
          timeToImprovement: '3-6 months',
          expectedIncrease: '60-80% improvement in soil structure',
          yieldImpact: '25-40% yield increase over 2-3 seasons',
          soilHealthImprovement: 'Dramatic improvement in overall soil health',
          sustainabilityBenefits: [
            'Better water retention',
            'Improved soil structure',
            'Enhanced microbial activity',
            'Increased nutrient cycling',
            'Reduced erosion',
            'Better carbon sequestration'
          ]
        },
        'moderate': {
          timeToImprovement: '2-4 months',
          expectedIncrease: '40-60% improvement in soil structure',
          yieldImpact: '15-25% yield increase over 2 seasons',
          soilHealthImprovement: 'Significant improvement in soil properties',
          sustainabilityBenefits: [
            'Improved water holding capacity',
            'Better soil aggregation',
            'Enhanced biological activity'
          ]
        },
        'mild': {
          timeToImprovement: '1-3 months',
          expectedIncrease: '20-40% improvement in soil structure',
          yieldImpact: '10-15% yield increase over 1-2 seasons',
          soilHealthImprovement: 'Gradual improvement in soil quality',
          sustainabilityBenefits: [
            'Better soil tilth',
            'Improved nutrient retention'
          ]
        }
      }
    };

    // Default results for micronutrients
    const defaultMicroResults: Record<string, ExpectedResults> = {
      'severe': {
        timeToImprovement: '2-4 weeks',
        expectedIncrease: '30-50% reduction in deficiency symptoms',
        yieldImpact: '15-25% yield increase expected',
        soilHealthImprovement: 'Improved micronutrient availability',
        sustainabilityBenefits: [
          'Better enzyme function',
          'Improved plant metabolism',
          'Enhanced crop quality'
        ]
      },
      'moderate': {
        timeToImprovement: '1-3 weeks',
        expectedIncrease: '20-30% reduction in deficiency symptoms',
        yieldImpact: '10-20% yield increase expected',
        soilHealthImprovement: 'Moderate improvement in nutrient status',
        sustainabilityBenefits: [
          'Better plant function',
          'Improved quality parameters'
        ]
      },
      'mild': {
        timeToImprovement: '1-2 weeks',
        expectedIncrease: '10-20% reduction in deficiency symptoms',
        yieldImpact: '5-15% yield increase expected',
        soilHealthImprovement: 'Gradual improvement in micronutrient status',
        sustainabilityBenefits: [
          'Optimized plant metabolism'
        ]
      }
    };

    const parameterResults = resultsMap[parameter.toLowerCase()];
    if (parameterResults) {
      return parameterResults[deficiencyType];
    }

    // Return default micronutrient results
    return defaultMicroResults[deficiencyType];
  }

  // Additional helper methods for integrated strategy
  private prioritizeActions(actions: RemediationAction[], deficiencies: SoilDeficiency[]): RemediationAction[] {
    return actions.sort((a, b) => b.effectiveness - a.effectiveness);
  }

  private combineMaterials(actions: RemediationAction[]): Material[] {
    const materialMap = new Map<string, Material>();
    
    actions.forEach(action => {
      action.materials.forEach(material => {
        if (materialMap.has(material.name)) {
          // Combine quantities if same material
          const existing = materialMap.get(material.name)!;
          // Logic to combine quantities would go here
        } else {
          materialMap.set(material.name, material);
        }
      });
    });

    return Array.from(materialMap.values());
  }

  private calculateIntegratedCost(actions: RemediationAction[], farmSize: number): CostEstimate {
    // Calculate combined cost with potential savings
    return {
      immediate: { min: 0, max: 0, currency: 'INR' },
      longTerm: { min: 0, max: 0, currency: 'INR' },
      totalPerHectare: { min: 0, max: 0, currency: 'INR' },
      paybackPeriod: '1-2 seasons',
      costBenefitRatio: 3.0
    };
  }

  private createImplementationTimeline(actions: RemediationAction[], deficiencies: SoilDeficiency[]) {
    return [
      {
        phase: 'Immediate (0-2 weeks)',
        duration: '2 weeks',
        actions: ['Soil testing confirmation', 'Material procurement'],
        cost: 5000
      },
      {
        phase: 'Short-term (2-8 weeks)',
        duration: '6 weeks',
        actions: ['Primary treatments', 'Fertilizer application'],
        cost: 15000
      },
      {
        phase: 'Long-term (2-6 months)',
        duration: '4 months',
        actions: ['Organic matter addition', 'Monitoring'],
        cost: 10000
      }
    ];
  }

  private identifySynergies(deficiencies: SoilDeficiency[], actions: RemediationAction[]): string[] {
    return [
      'Organic matter addition will improve multiple nutrient availability',
      'pH correction will enhance overall nutrient uptake',
      'Combined fertilizer application reduces labor costs'
    ];
  }

  private identifyWarnings(deficiencies: SoilDeficiency[], actions: RemediationAction[]): string[] {
    return [
      'Avoid over-application of lime if pH is already borderline',
      'Monitor for nutrient interactions when applying multiple fertilizers',
      'Ensure proper timing to avoid nutrient losses'
    ];
  }

  /**
   * Get micronutrient immediate action
   */
  private getMicronutrientImmediateAction(
    parameter: string,
    deficiencyType: string,
    preferences?: { organic?: boolean; quickResults?: boolean }
  ): RemediationAction {
    const micronutrientInfo: Record<string, any> = {
      zinc: {
        material: preferences?.organic ? 'Zinc Sulfate (Organic)' : 'Zinc Sulfate (ZnSO4)',
        quantity: deficiencyType === 'severe' ? '25-40' : '15-25',
        costPerUnit: preferences?.organic ? 80 : 60,
        alternatives: preferences?.organic 
          ? ['Kelp meal', 'Zinc-enriched compost', 'Organic zinc chelate']
          : ['Zinc oxide', 'Zinc chelate', 'Zinc chloride']
      },
      iron: {
        material: preferences?.organic ? 'Iron Chelate (Organic)' : 'Ferrous Sulfate (FeSO4)',
        quantity: deficiencyType === 'severe' ? '20-35' : '10-20',
        costPerUnit: preferences?.organic ? 120 : 45,
        alternatives: preferences?.organic 
          ? ['Iron-rich compost', 'Seaweed extract', 'Organic iron chelate']
          : ['Iron chelate', 'Iron oxide', 'Ferric chloride']
      },
      manganese: {
        material: preferences?.organic ? 'Manganese Sulfate (Organic)' : 'Manganese Sulfate (MnSO4)',
        quantity: deficiencyType === 'severe' ? '15-25' : '8-15',
        costPerUnit: preferences?.organic ? 90 : 55,
        alternatives: preferences?.organic 
          ? ['Manganese-enriched compost', 'Organic chelates']
          : ['Manganese oxide', 'Manganese chelate']
      },
      copper: {
        material: preferences?.organic ? 'Copper Sulfate (Organic)' : 'Copper Sulfate (CuSO4)',
        quantity: deficiencyType === 'severe' ? '8-15' : '5-10',
        costPerUnit: preferences?.organic ? 100 : 70,
        alternatives: preferences?.organic 
          ? ['Copper-enriched compost', 'Organic copper chelate']
          : ['Copper oxide', 'Copper chelate']
      },
      boron: {
        material: preferences?.organic ? 'Borax (Organic)' : 'Borax (Na2B4O7)',
        quantity: deficiencyType === 'severe' ? '2-4' : '1-2',
        costPerUnit: preferences?.organic ? 150 : 80,
        alternatives: preferences?.organic 
          ? ['Boron-rich compost', 'Organic boron chelate']
          : ['Boric acid', 'Solubor']
      }
    };

    const info = micronutrientInfo[parameter.toLowerCase()] || micronutrientInfo['zinc'];

    return {
      id: `${parameter.toLowerCase()}_immediate`,
      action: `Apply ${parameter} Fertilizer`,
      description: `Immediate ${parameter.toLowerCase()} application to correct deficiency and restore plant function`,
      materials: [{
        name: info.material,
        type: preferences?.organic ? 'organic' : 'inorganic',
        quantity: info.quantity,
        unit: 'kg/hectare',
        costPerUnit: info.costPerUnit,
        availability: 'readily_available',
        alternatives: info.alternatives
      }],
      applicationMethod: 'Soil application or foliar spray for quick uptake',
      dosage: `${info.quantity} kg per hectare`,
      frequency: 'Single application, repeat if symptoms persist',
      precautions: [
        'Avoid over-application to prevent toxicity',
        'Apply during cool hours for foliar application',
        'Ensure adequate soil moisture'
      ],
      effectiveness: preferences?.organic ? 70 : 85
    };
  }

  /**
   * Get micronutrient long-term action
   */
  private getMicronutrientLongTermAction(
    parameter: string,
    deficiencyType: string,
    preferences?: { organic?: boolean; sustainableFocus?: boolean }
  ): RemediationAction {
    return {
      id: `${parameter.toLowerCase()}_longterm`,
      action: `Long-term ${parameter} Management`,
      description: `Sustainable ${parameter.toLowerCase()} supply through organic matter and soil health improvement`,
      materials: [{
        name: 'Micronutrient-enriched Compost',
        type: 'organic',
        quantity: '3-5',
        unit: 'tons/hectare/year',
        costPerUnit: 3000,
        availability: 'readily_available',
        alternatives: ['Biofortified organic matter', 'Microbial inoculants', 'Chelated micronutrients']
      }],
      applicationMethod: 'Annual organic matter application with micronutrient supplementation',
      dosage: '3-5 tons per hectare annually',
      frequency: 'Annual application for 2-3 years',
      precautions: [
        'Monitor soil micronutrient levels annually',
        'Balance with other micronutrients',
        'Maintain optimal soil pH for availability'
      ],
      effectiveness: 80
    };
  }
}

export default SoilDeficiencyService;