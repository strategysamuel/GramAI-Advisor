// Soil Parameter Explanation Service - Provides farmer-friendly explanations of soil parameters
// Implements multilingual support for explaining soil test results in simple language

import { SoilParameter, SoilNutrients, Micronutrients } from '../types';

export interface ParameterExplanation {
  parameter: string;
  simpleExplanation: string;
  whatItMeans: string;
  whyItMatters: string;
  actionNeeded: string;
  language: string;
}

export interface SoilHealthExplanation {
  overallMessage: string;
  keyPoints: string[];
  immediateActions: string[];
  seasonalAdvice: string[];
  language: string;
}

export class SoilParameterExplanationService {
  private explanationTemplates: Record<string, Record<string, any>>;

  constructor() {
    this.explanationTemplates = this.initializeExplanationTemplates();
    console.log('Soil Parameter Explanation Service initialized with multilingual support');
  }

  /**
   * Get farmer-friendly explanation for a specific soil parameter
   */
  public getParameterExplanation(
    parameter: SoilParameter,
    language: string = 'en'
  ): ParameterExplanation {
    const templates = this.explanationTemplates[language] || this.explanationTemplates['en'];
    const paramTemplate = templates[parameter.name.toLowerCase()] || templates['default'];

    const statusMessages = this.getStatusMessages(parameter.status, language);
    
    return {
      parameter: parameter.name,
      simpleExplanation: this.formatTemplate(paramTemplate.simple, parameter),
      whatItMeans: this.formatTemplate(paramTemplate.meaning, parameter),
      whyItMatters: this.formatTemplate(paramTemplate.importance, parameter),
      actionNeeded: this.formatTemplate(statusMessages.action, parameter),
      language
    };
  }

  /**
   * Get comprehensive soil health explanation
   */
  public getSoilHealthExplanation(
    nutrients: SoilNutrients,
    micronutrients: Micronutrients,
    overallHealth: string,
    healthScore: number,
    language: string = 'en'
  ): SoilHealthExplanation {
    const templates = this.explanationTemplates[language] || this.explanationTemplates['en'];
    
    // Generate overall message
    const overallMessage = this.generateOverallMessage(overallHealth, healthScore, language);
    
    // Generate key points
    const keyPoints = this.generateKeyPoints(nutrients, micronutrients, language);
    
    // Generate immediate actions
    const immediateActions = this.generateImmediateActions(nutrients, micronutrients, language);
    
    // Generate seasonal advice
    const seasonalAdvice = this.generateSeasonalAdvice(nutrients, language);

    return {
      overallMessage,
      keyPoints,
      immediateActions,
      seasonalAdvice,
      language
    };
  }

  /**
   * Get simple explanation for multiple parameters
   */
  public getMultipleParameterExplanations(
    nutrients: SoilNutrients,
    micronutrients: Micronutrients,
    language: string = 'en'
  ): ParameterExplanation[] {
    const explanations: ParameterExplanation[] = [];

    // Explain main nutrients
    if (nutrients.pH) explanations.push(this.getParameterExplanation(nutrients.pH, language));
    if (nutrients.nitrogen) explanations.push(this.getParameterExplanation(nutrients.nitrogen, language));
    if (nutrients.phosphorus) explanations.push(this.getParameterExplanation(nutrients.phosphorus, language));
    if (nutrients.potassium) explanations.push(this.getParameterExplanation(nutrients.potassium, language));
    if (nutrients.organicCarbon) explanations.push(this.getParameterExplanation(nutrients.organicCarbon, language));

    // Explain micronutrients
    Object.values(micronutrients).forEach(param => {
      if (param) explanations.push(this.getParameterExplanation(param, language));
    });

    return explanations;
  }

  /**
   * Get explanation for farmers with different literacy levels
   */
  public getExplanationByLiteracyLevel(
    parameter: SoilParameter,
    literacyLevel: 'basic' | 'intermediate' | 'advanced',
    language: string = 'en'
  ): ParameterExplanation {
    const baseExplanation = this.getParameterExplanation(parameter, language);
    
    switch (literacyLevel) {
      case 'basic':
        return {
          ...baseExplanation,
          simpleExplanation: this.simplifyForBasicLiteracy(baseExplanation.simpleExplanation),
          whatItMeans: this.simplifyForBasicLiteracy(baseExplanation.whatItMeans),
          whyItMatters: this.simplifyForBasicLiteracy(baseExplanation.whyItMatters),
          actionNeeded: this.simplifyForBasicLiteracy(baseExplanation.actionNeeded)
        };
      case 'intermediate':
        return baseExplanation;
      case 'advanced':
        return {
          ...baseExplanation,
          simpleExplanation: this.enhanceForAdvancedLiteracy(baseExplanation.simpleExplanation, parameter),
          whatItMeans: this.enhanceForAdvancedLiteracy(baseExplanation.whatItMeans, parameter),
          whyItMatters: this.enhanceForAdvancedLiteracy(baseExplanation.whyItMatters, parameter)
        };
      default:
        return baseExplanation;
    }
  }

  /**
   * Initialize explanation templates for different languages
   */
  private initializeExplanationTemplates(): Record<string, Record<string, any>> {
    return {
      'en': {
        'ph': {
          simple: 'pH measures how acidic or alkaline your soil is. Your soil pH is {value}.',
          meaning: 'pH affects how well plants can absorb food for plants from the soil.',
          importance: 'Wrong pH can make food for plants unavailable to plants, reducing crop yield.'
        },
        'nitrogen': {
          simple: 'Nitrogen helps plants grow green and healthy. Your soil has {value} {unit} of nitrogen.',
          meaning: 'Nitrogen is like protein for plants - it helps them grow strong leaves and stems.',
          importance: 'Without enough nitrogen, plants turn yellow and grow slowly.'
        },
        'phosphorus': {
          simple: 'Phosphorus helps roots grow strong and plants flower well. Your soil has {value} {unit}.',
          meaning: 'Phosphorus is essential for root development and seed formation.',
          importance: 'Low phosphorus means weak roots and poor flowering in crops.'
        },
        'potassium': {
          simple: 'Potassium helps plants fight diseases and use water efficiently. Your soil has {value} {unit}.',
          meaning: 'Potassium strengthens plant immunity and helps them survive stress.',
          importance: 'Plants without enough potassium get sick easily and waste water.'
        },
        'organic carbon': {
          simple: 'Organic carbon shows how much organic matter is in your soil. Your soil has {value}%.',
          meaning: 'Organic matter improves soil structure and holds nutrients and water.',
          importance: 'More organic matter means better soil health and higher yields.'
        },
        'zinc': {
          simple: 'Zinc is a micronutrient that helps plants grow properly. Your soil has {value} ppm.',
          meaning: 'Zinc helps plants make proteins and grow new tissues.',
          importance: 'Zinc deficiency causes stunted growth and poor grain formation.'
        },
        'iron': {
          simple: 'Iron helps plants make chlorophyll for photosynthesis. Your soil has {value} ppm.',
          meaning: 'Iron is needed for plants to make food from sunlight.',
          importance: 'Iron deficiency causes yellowing of young leaves.'
        },
        'default': {
          simple: 'This parameter measures {parameter} in your soil. Current value is {value} {unit}.',
          meaning: 'This nutrient affects plant growth and development.',
          importance: 'Proper levels are important for healthy crop production.'
        }
      },
      'hi': {
        'ph': {
          simple: 'pH मापता है कि आपकी मिट्टी कितनी अम्लीय या क्षारीय है। आपकी मिट्टी का pH {value} है।',
          meaning: 'pH प्रभावित करता है कि पौधे मिट्टी से पोषक तत्वों को कितनी अच्छी तरह अवशोषित कर सकते हैं।',
          importance: 'गलत pH पोषक तत्वों को पौधों के लिए अनुपलब्ध बना सकता है, जिससे फसल की पैदावार कम हो जाती है।'
        },
        'nitrogen': {
          simple: 'नाइट्रोजन पौधों को हरा और स्वस्थ बनाने में मदद करता है। आपकी मिट्टी में {value} {unit} नाइट्रोजन है।',
          meaning: 'नाइट्रोजन पौधों के लिए प्रोटीन की तरह है - यह उन्हें मजबूत पत्ते और तने बनाने में मदद करता है।',
          importance: 'पर्याप्त नाइट्रोजन के बिना, पौधे पीले हो जाते हैं और धीरे-धीरे बढ़ते हैं।'
        },
        'phosphorus': {
          simple: 'फास्फोरस जड़ों को मजबूत बनाने और पौधों को अच्छी तरह फूलने में मदद करता है। आपकी मिट्टी में {value} {unit} है।',
          meaning: 'फास्फोरस जड़ों के विकास और बीज निर्माण के लिए आवश्यक है।',
          importance: 'कम फास्फोरस का मतलब कमजोर जड़ें और फसलों में खराब फूल आना है।'
        },
        'potassium': {
          simple: 'पोटेशियम पौधों को बीमारियों से लड़ने और पानी का कुशलता से उपयोग करने में मदद करता है। आपकी मिट्टी में {value} {unit} है।',
          meaning: 'पोटेशियम पौधों की प्रतिरक्षा को मजबूत बनाता है और उन्हें तनाव से बचने में मदद करता है।',
          importance: 'पर्याप्त पोटेशियम के बिना पौधे आसानी से बीमार हो जाते हैं और पानी बर्बाद करते हैं।'
        },
        'default': {
          simple: 'यह पैरामीटर आपकी मिट्टी में {parameter} को मापता है। वर्तमान मान {value} {unit} है।',
          meaning: 'यह पोषक तत्व पौधों की वृद्धि और विकास को प्रभावित करता है।',
          importance: 'स्वस्थ फसल उत्पादन के लिए उचित स्तर महत्वपूर्ण हैं।'
        }
      }
    };
  }

  /**
   * Get status-specific messages
   */
  private getStatusMessages(status: string, language: string): { action: string } {
    const statusMessages: Record<string, Record<string, string>> = {
      'en': {
        'deficient': 'Your soil needs more of this nutrient. Consider applying fertilizer or organic matter.',
        'adequate': 'This nutrient level is acceptable. Continue current management practices.',
        'optimal': 'Excellent! This nutrient is at the perfect level for plant growth.',
        'excessive': 'This nutrient level is too high. Reduce fertilizer application and test again.'
      },
      'hi': {
        'deficient': 'आपकी मिट्टी में इस पोषक तत्व की कमी है। खाद या जैविक पदार्थ डालने पर विचार करें।',
        'adequate': 'यह पोषक तत्व का स्तर स्वीकार्य है। वर्तमान प्रबंधन प्रथाओं को जारी रखें।',
        'optimal': 'बहुत बढ़िया! यह पोषक तत्व पौधों की वृद्धि के लिए सही स्तर पर है।',
        'excessive': 'यह पोषक तत्व का स्तर बहुत अधिक है। उर्वरक का उपयोग कम करें और फिर से जांच कराएं।'
      }
    };

    const langMessages = statusMessages[language] || statusMessages['en'];
    return { action: langMessages[status] || langMessages['adequate'] };
  }

  /**
   * Format template with parameter values
   */
  private formatTemplate(template: string, parameter: SoilParameter): string {
    return template
      .replace('{value}', parameter.value.toString())
      .replace('{unit}', parameter.unit)
      .replace('{parameter}', parameter.name);
  }

  /**
   * Generate overall health message
   */
  private generateOverallMessage(overallHealth: string, healthScore: number, language: string): string {
    const messages: Record<string, Record<string, string>> = {
      'en': {
        'excellent': `Your soil is in excellent condition with a health score of ${healthScore}/100. Keep up the good work!`,
        'good': `Your soil is in good condition with a health score of ${healthScore}/100. Minor improvements can make it even better.`,
        'fair': `Your soil needs some attention with a health score of ${healthScore}/100. Following our recommendations will improve it.`,
        'poor': `Your soil needs significant improvement with a health score of ${healthScore}/100. Don't worry - we'll help you fix it step by step.`
      },
      'hi': {
        'excellent': `आपकी मिट्टी उत्कृष्ट स्थिति में है, स्वास्थ्य स्कोर ${healthScore}/100 है। अच्छा काम जारी रखें!`,
        'good': `आपकी मिट्टी अच्छी स्थिति में है, स्वास्थ्य स्कोर ${healthScore}/100 है। छोटे सुधार इसे और भी बेहतर बना सकते हैं।`,
        'fair': `आपकी मिट्टी को कुछ ध्यान की जरूरत है, स्वास्थ्य स्कोर ${healthScore}/100 है। हमारी सिफारिशों का पालन करने से यह सुधरेगी।`,
        'poor': `आपकी मिट्टी को महत्वपूर्ण सुधार की जरूरत है, स्वास्थ्य स्कोर ${healthScore}/100 है। चिंता न करें - हम आपको कदम दर कदम ठीक करने में मदद करेंगे।`
      }
    };

    const langMessages = messages[language] || messages['en'];
    return langMessages[overallHealth] || langMessages['fair'];
  }

  /**
   * Generate key points about soil condition
   */
  private generateKeyPoints(nutrients: SoilNutrients, micronutrients: Micronutrients, language: string): string[] {
    const keyPoints: string[] = [];
    
    // Check pH
    if (nutrients.pH) {
      const pH = nutrients.pH.value;
      if (language === 'hi') {
        if (pH < 6.0) {
          keyPoints.push('आपकी मिट्टी अम्लीय है - इससे पोषक तत्वों की उपलब्धता सीमित हो सकती है');
        } else if (pH > 7.5) {
          keyPoints.push('आपकी मिट्टी क्षारीय है - कुछ पोषक तत्व कम उपलब्ध हो सकते हैं');
        } else {
          keyPoints.push('आपकी मिट्टी का pH अधिकांश फसलों के लिए अच्छा है');
        }
      } else {
        if (pH < 6.0) {
          keyPoints.push('Your soil is acidic - this may limit nutrient availability');
        } else if (pH > 7.5) {
          keyPoints.push('Your soil is alkaline - some nutrients may become less available');
        } else {
          keyPoints.push('Your soil pH is good for most crops');
        }
      }
    }

    // Check main nutrients
    const deficientNutrients = [];
    if (nutrients.nitrogen?.status === 'deficient') deficientNutrients.push(language === 'hi' ? 'नाइट्रोजन' : 'Nitrogen');
    if (nutrients.phosphorus?.status === 'deficient') deficientNutrients.push(language === 'hi' ? 'फास्फोरस' : 'Phosphorus');
    if (nutrients.potassium?.status === 'deficient') deficientNutrients.push(language === 'hi' ? 'पोटेशियम' : 'Potassium');

    if (deficientNutrients.length > 0) {
      const message = language === 'hi' 
        ? `मुख्य पोषक तत्वों की कमी: ${deficientNutrients.join(', ')}`
        : `Main nutrient deficiencies: ${deficientNutrients.join(', ')}`;
      keyPoints.push(message);
    }

    return keyPoints;
  }

  /**
   * Generate immediate actions needed
   */
  private generateImmediateActions(nutrients: SoilNutrients, micronutrients: Micronutrients, language: string): string[] {
    const actions: string[] = [];

    // pH correction
    if (nutrients.pH) {
      const pH = nutrients.pH.value;
      if (pH < 6.0) {
        actions.push(language === 'hi' 
          ? 'मिट्टी की अम्लता कम करने के लिए चूना डालें'
          : 'Apply lime to reduce soil acidity');
      } else if (pH > 7.5) {
        actions.push(language === 'hi'
          ? 'क्षारीयता कम करने के लिए जैविक पदार्थ या गंधक डालें'
          : 'Add organic matter or sulfur to reduce alkalinity');
      }
    }

    // Nutrient-specific actions
    if (nutrients.nitrogen?.status === 'deficient') {
      actions.push(language === 'hi'
        ? 'नाइट्रोजन युक्त उर्वरक जैसे यूरिया या कंपोस्ट डालें'
        : 'Apply nitrogen-rich fertilizers like urea or compost');
    }

    if (nutrients.phosphorus?.status === 'deficient') {
      actions.push(language === 'hi'
        ? 'फास्फोरस उर्वरक जैसे DAP या हड्डी का चूर्ण डालें'
        : 'Use phosphorus fertilizers like DAP or bone meal');
    }

    if (nutrients.potassium?.status === 'deficient') {
      actions.push(language === 'hi'
        ? 'पोटेशियम उर्वरक जैसे MOP या लकड़ी की राख डालें'
        : 'Apply potassium fertilizers like MOP or wood ash');
    }

    return actions;
  }

  /**
   * Generate seasonal advice
   */
  private generateSeasonalAdvice(nutrients: SoilNutrients, language: string): string[] {
    const advice: string[] = [];

    if (language === 'hi') {
      advice.push('खरीफ सीजन से पहले मिट्टी की तैयारी करें');
      advice.push('रबी की बुवाई से पहले उर्वरक डालें');
      advice.push('हर 2-3 साल में मिट्टी की जांच कराएं');
    } else {
      advice.push('Prepare soil before Kharif season');
      advice.push('Apply fertilizers before Rabi sowing');
      advice.push('Test soil every 2-3 years for monitoring');
    }

    return advice;
  }

  /**
   * Simplify explanation for basic literacy
   */
  private simplifyForBasicLiteracy(text: string): string {
    // Remove complex words and use simpler alternatives
    return text
      .replace(/nutrients?/gi, 'food for plants')
      .replace(/absorption?/gi, 'taking in')
      .replace(/deficiency/gi, 'not enough')
      .replace(/excessive/gi, 'too much')
      .replace(/optimal/gi, 'perfect')
      .replace(/adequate/gi, 'enough')
      .replace(/acidic or alkaline/gi, 'sour or bitter');
  }

  /**
   * Enhance explanation for advanced literacy
   */
  private enhanceForAdvancedLiteracy(text: string, parameter: SoilParameter): string {
    // Add technical details for advanced users
    const technicalInfo = ` (Current: ${parameter.value} ${parameter.unit}, Optimal range: ${parameter.range.optimal?.min || parameter.range.min}-${parameter.range.optimal?.max || parameter.range.max} ${parameter.unit})`;
    return text + technicalInfo;
  }
}

export default SoilParameterExplanationService;