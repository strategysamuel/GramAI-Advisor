// Response Generation Service
// Generates farmer-friendly responses in multiple languages

import { LanguageCode } from '../../../shared/types';
import { Intent, IntentType, Entity } from './IntentRecognitionService';
import TranslationService from './TranslationService';

export interface ResponseContext {
  intent: Intent;
  userProfile?: {
    name?: string;
    location?: string;
    preferredLanguage: LanguageCode;
    farmingExperience?: 'beginner' | 'intermediate' | 'expert';
  };
  sessionData?: Record<string, any>;
  timestamp: Date;
}

export interface GeneratedResponse {
  text: string;
  language: LanguageCode;
  tone: 'formal' | 'friendly' | 'instructional' | 'supportive';
  followUpQuestions?: string[];
  actionItems?: string[];
  confidence: number;
}

export interface ResponseTemplate {
  intent: IntentType;
  templates: Array<{
    language: LanguageCode;
    patterns: string[];
    tone: 'formal' | 'friendly' | 'instructional' | 'supportive';
    followUps?: string[];
  }>;
}

class ResponseGenerationService {
  private translationService: TranslationService;
  private responseTemplates: ResponseTemplate[];

  constructor() {
    this.translationService = new TranslationService();
    this.responseTemplates = this.initializeResponseTemplates();
  }

  private initializeResponseTemplates(): ResponseTemplate[] {
    return [
      {
        intent: 'greeting',
        templates: [
          {
            language: 'hi',
            patterns: [
              'नमस्ते {name}! मैं आपका कृषि सलाहकार हूं। आज मैं आपकी कैसे मदद कर सकता हूं?',
              'आपका स्वागत है! मैं यहां आपकी खेती से जुड़ी समस्याओं का समाधान करने के लिए हूं।',
              'नमस्कार किसान भाई! आज आप क्या जानना चाहते हैं?'
            ],
            tone: 'friendly',
            followUps: [
              'फसल की सिफारिश चाहिए?',
              'मौसम की जानकारी चाहिए?',
              'बाजार के भाव जानना चाहते हैं?'
            ]
          },
          {
            language: 'en',
            patterns: [
              'Hello {name}! I am your agricultural advisor. How can I help you today?',
              'Welcome! I am here to help you with your farming needs.',
              'Greetings farmer! What would you like to know today?'
            ],
            tone: 'friendly',
            followUps: [
              'Need crop recommendations?',
              'Want weather information?',
              'Looking for market prices?'
            ]
          }
        ]
      },
      {
        intent: 'crop_recommendation',
        templates: [
          {
            language: 'hi',
            patterns: [
              'आपकी {location} की मिट्टी और मौसम के अनुसार, मैं {crop} की खेती की सलाह देता हूं।',
              '{season} के मौसम में {location} में {crop} अच्छी फसल देती है।',
              'आपके {area} एकड़ जमीन के लिए {crop} सबसे उपयुक्त होगी।'
            ],
            tone: 'instructional',
            followUps: [
              'इस फसल की बुवाई कब करनी चाहिए?',
              'कौन सा बीज इस्तेमाल करें?',
              'खाद और पानी की जरूरत कितनी होगी?'
            ]
          },
          {
            language: 'en',
            patterns: [
              'Based on your {location} soil and weather, I recommend growing {crop}.',
              'For the {season} season in {location}, {crop} would be a good choice.',
              'For your {area} acres of land, {crop} would be most suitable.'
            ],
            tone: 'instructional',
            followUps: [
              'When should I sow this crop?',
              'Which seeds should I use?',
              'How much fertilizer and water is needed?'
            ]
          }
        ]
      },
      {
        intent: 'weather_query',
        templates: [
          {
            language: 'hi',
            patterns: [
              '{location} में आज मौसम {weather} रहेगा। तापमान {temperature} डिग्री होगा।',
              'अगले {days} दिनों में {location} में {rainfall} बारिश की संभावना है।',
              'मौसम विभाग के अनुसार {location} में {condition} रहेगा।'
            ],
            tone: 'formal',
            followUps: [
              'क्या खेत में काम करना सुरक्षित है?',
              'फसल की सुरक्षा के लिए क्या करना चाहिए?',
              'सिंचाई की जरूरत है या नहीं?'
            ]
          },
          {
            language: 'en',
            patterns: [
              'Today in {location}, the weather will be {weather} with temperature around {temperature} degrees.',
              'In the next {days} days, {location} is expected to have {rainfall} rainfall.',
              'According to the weather department, {location} will have {condition}.'
            ],
            tone: 'formal',
            followUps: [
              'Is it safe to work in the fields?',
              'What should I do to protect my crops?',
              'Do I need to irrigate?'
            ]
          }
        ]
      },
      {
        intent: 'market_price',
        templates: [
          {
            language: 'hi',
            patterns: [
              '{location} की मंडी में आज {crop} का भाव ₹{price} प्रति क्विंटल है।',
              '{crop} की कीमत पिछले हफ्ते से {change} है। आज का रेट ₹{price} है।',
              '{location} में {crop} के लिए अच्छी मांग है। वर्तमान भाव ₹{price} प्रति क्विंटल।'
            ],
            tone: 'formal',
            followUps: [
              'कीमत बढ़ने की उम्मीद है?',
              'कहां बेचना बेहतर होगा?',
              'परिवहन की लागत कितनी आएगी?'
            ]
          },
          {
            language: 'en',
            patterns: [
              'Today in {location} market, {crop} is priced at ₹{price} per quintal.',
              '{crop} price has {change} from last week. Current rate is ₹{price}.',
              'There is good demand for {crop} in {location}. Current price is ₹{price} per quintal.'
            ],
            tone: 'formal',
            followUps: [
              'Is the price expected to rise?',
              'Where would be better to sell?',
              'What will be the transportation cost?'
            ]
          }
        ]
      },
      {
        intent: 'pest_disease',
        templates: [
          {
            language: 'hi',
            patterns: [
              'आपकी {crop} में {pest} का प्रकोप लग रहा है। तुरंत {treatment} का छिड़काव करें।',
              '{disease} की बीमारी के लिए {medicine} का इस्तेमाल करें। {dosage} की मात्रा में दें।',
              'यह {pest} की समस्या है। रोकथाम के लिए {prevention} करना जरूरी है।'
            ],
            tone: 'instructional',
            followUps: [
              'दवा कहां से मिलेगी?',
              'कितने दिन बाद दोबारा छिड़काव करना है?',
              'क्या यह दवा सुरक्षित है?'
            ]
          },
          {
            language: 'en',
            patterns: [
              'Your {crop} seems to have {pest} infestation. Apply {treatment} immediately.',
              'For {disease}, use {medicine} at {dosage} dosage.',
              'This is a {pest} problem. Prevention requires {prevention}.'
            ],
            tone: 'instructional',
            followUps: [
              'Where can I get this medicine?',
              'When should I spray again?',
              'Is this medicine safe?'
            ]
          }
        ]
      },
      {
        intent: 'scheme_inquiry',
        templates: [
          {
            language: 'hi',
            patterns: [
              '{scheme} योजना के तहत आप {benefit} का लाभ उठा सकते हैं।',
              'आपके लिए {scheme} योजना उपलब्ध है। आवेदन {deadline} तक करना है।',
              '{location} के किसानों के लिए {scheme} योजना चल रही है।'
            ],
            tone: 'supportive',
            followUps: [
              'आवेदन कैसे करना है?',
              'कौन से दस्तावेज चाहिए?',
              'कितना समय लगेगा?'
            ]
          },
          {
            language: 'en',
            patterns: [
              'Under {scheme}, you can avail {benefit}.',
              '{scheme} is available for you. Apply before {deadline}.',
              '{scheme} is running for farmers in {location}.'
            ],
            tone: 'supportive',
            followUps: [
              'How to apply?',
              'What documents are needed?',
              'How long will it take?'
            ]
          }
        ]
      },
      {
        intent: 'loan_application',
        templates: [
          {
            language: 'hi',
            patterns: [
              'कृषि ऋण के लिए आप {bank} में आवेदन कर सकते हैं। {amount} तक का लोन मिल सकता है।',
              '{scheme} के तहत {interest}% ब्याज दर पर लोन उपलब्ध है।',
              'आपकी जमीन के आधार पर {amount} रुपए तक का ऋण मिल सकता है।'
            ],
            tone: 'supportive',
            followUps: [
              'कौन से कागजात चाहिए?',
              'कितने दिन में लोन मिलेगा?',
              'EMI कितनी होगी?'
            ]
          },
          {
            language: 'en',
            patterns: [
              'For agricultural loan, you can apply at {bank}. Up to {amount} loan is available.',
              'Under {scheme}, loan is available at {interest}% interest rate.',
              'Based on your land, you can get loan up to {amount} rupees.'
            ],
            tone: 'supportive',
            followUps: [
              'What documents are required?',
              'How many days to get the loan?',
              'What will be the EMI?'
            ]
          }
        ]
      },
      {
        intent: 'help',
        templates: [
          {
            language: 'hi',
            patterns: [
              'मैं आपकी निम्नलिखित चीजों में मदद कर सकता हूं: फसल की सलाह, मौसम की जानकारी, बाजार के भाव, सरकारी योजनाएं।',
              'आप मुझसे खेती, मौसम, बाजार, योजनाओं के बारे में पूछ सकते हैं।',
              'मैं कृषि सलाहकार हूं। खेती से जुड़ी कोई भी समस्या हो तो पूछिए।'
            ],
            tone: 'supportive',
            followUps: [
              'फसल की सिफारिश चाहिए?',
              'मौसम जानना चाहते हैं?',
              'योजनाओं की जानकारी चाहिए?'
            ]
          },
          {
            language: 'en',
            patterns: [
              'I can help you with: crop advice, weather information, market prices, government schemes.',
              'You can ask me about farming, weather, markets, and schemes.',
              'I am an agricultural advisor. Ask me any farming-related questions.'
            ],
            tone: 'supportive',
            followUps: [
              'Need crop recommendations?',
              'Want weather information?',
              'Looking for scheme information?'
            ]
          }
        ]
      },
      {
        intent: 'unknown',
        templates: [
          {
            language: 'hi',
            patterns: [
              'मुझे खुशी होगी अगर आप अपना सवाल दूसरे तरीके से पूछें।',
              'मैं आपकी बात समझ नहीं पाया। कृपया स्पष्ट रूप से बताएं।',
              'क्या आप अपना सवाल फिर से पूछ सकते हैं? मैं खेती से जुड़े सवालों का जवाब दे सकता हूं।'
            ],
            tone: 'supportive',
            followUps: [
              'फसल के बारे में पूछना चाहते हैं?',
              'मौसम की जानकारी चाहिए?',
              'बाजार के भाव जानना चाहते हैं?'
            ]
          },
          {
            language: 'en',
            patterns: [
              'I would be happy if you could rephrase your question.',
              'I did not understand your question. Please be more specific.',
              'Could you ask your question again? I can answer farming-related questions.'
            ],
            tone: 'supportive',
            followUps: [
              'Want to ask about crops?',
              'Need weather information?',
              'Looking for market prices?'
            ]
          }
        ]
      }
    ];
  }

  // Main response generation method
  public async generateResponse(context: ResponseContext): Promise<GeneratedResponse> {
    const { intent, userProfile } = context;
    const targetLanguage = userProfile?.preferredLanguage || 'en';
    
    // Find appropriate template
    const template = this.findTemplate(intent.type, targetLanguage);
    if (!template) {
      return this.generateFallbackResponse(targetLanguage);
    }

    // Select pattern based on user experience level
    const pattern = this.selectPattern(template, userProfile?.farmingExperience);
    
    // Fill in placeholders with entity values
    const responseText = this.fillPlaceholders(pattern, intent.entities, userProfile);
    
    // Generate follow-up questions
    const followUpQuestions = await this.generateFollowUps(template, targetLanguage);
    
    // Generate action items if applicable
    const actionItems = this.generateActionItems(intent.type, intent.entities, targetLanguage);

    return {
      text: responseText,
      language: targetLanguage,
      tone: template.tone,
      followUpQuestions,
      actionItems,
      confidence: Math.min(0.9, intent.confidence + 0.1)
    };
  }

  private findTemplate(intentType: IntentType, language: LanguageCode): ResponseTemplate['templates'][0] | null {
    const responseTemplate = this.responseTemplates.find(t => t.intent === intentType);
    if (!responseTemplate) return null;

    // Try to find template for the specific language
    let template = responseTemplate.templates.find(t => t.language === language);
    
    // Fallback to English if specific language not found
    if (!template) {
      template = responseTemplate.templates.find(t => t.language === 'en');
    }

    return template || null;
  }

  private selectPattern(template: ResponseTemplate['templates'][0], experience?: string): string {
    const patterns = template.patterns;
    
    // Select pattern based on experience level
    if (experience === 'beginner' && patterns.length > 1) {
      // Use more detailed, explanatory patterns for beginners
      return patterns[patterns.length - 1];
    } else if (experience === 'expert' && patterns.length > 0) {
      // Use concise patterns for experts
      return patterns[0];
    }
    
    // Default: random selection
    return patterns[Math.floor(Math.random() * patterns.length)];
  }

  private fillPlaceholders(pattern: string, entities: Entity[], userProfile?: ResponseContext['userProfile']): string {
    let filledText = pattern;

    // Fill user profile placeholders
    if (userProfile) {
      filledText = filledText.replace(/{name}/g, userProfile.name || 'किसान भाई');
      filledText = filledText.replace(/{location}/g, userProfile.location || 'आपके क्षेत्र');
    }

    // Fill entity placeholders
    for (const entity of entities) {
      const placeholder = `{${entity.type}}`;
      if (filledText.includes(placeholder)) {
        filledText = filledText.replace(new RegExp(placeholder, 'g'), entity.value);
      }
    }

    // Fill remaining placeholders with defaults
    const defaultValues: Record<string, string> = {
      '{weather}': 'साफ',
      '{temperature}': '25',
      '{crop}': 'गेहूं',
      '{price}': '2000',
      '{days}': '3',
      '{area}': '2',
      '{season}': 'रबी',
      '{change}': 'स्थिर',
      '{benefit}': 'सब्सिडी',
      '{scheme}': 'PM-KISAN',
      '{bank}': 'SBI',
      '{amount}': '1 लाख',
      '{interest}': '7'
    };

    for (const [placeholder, defaultValue] of Object.entries(defaultValues)) {
      filledText = filledText.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), defaultValue);
    }

    return filledText;
  }

  private async generateFollowUps(template: ResponseTemplate['templates'][0], language: LanguageCode): Promise<string[]> {
    if (!template.followUps) return [];

    // If template is not in target language, translate follow-ups
    if (template.language !== language) {
      const translatedFollowUps: string[] = [];
      for (const followUp of template.followUps) {
        const result = await this.translationService.translateText({
          text: followUp,
          sourceLanguage: template.language,
          targetLanguage: language
        });
        translatedFollowUps.push(result.translatedText);
      }
      return translatedFollowUps;
    }

    return template.followUps;
  }

  private generateActionItems(intentType: IntentType, entities: Entity[], language: LanguageCode): string[] {
    const actionItems: string[] = [];

    switch (intentType) {
      case 'crop_recommendation':
        if (language === 'hi') {
          actionItems.push('बीज की गुणवत्ता जांच लें');
          actionItems.push('मिट्टी की जांच कराएं');
          actionItems.push('मौसम का पूर्वानुमान देखें');
        } else {
          actionItems.push('Check seed quality');
          actionItems.push('Get soil tested');
          actionItems.push('Check weather forecast');
        }
        break;

      case 'pest_disease':
        if (language === 'hi') {
          actionItems.push('तुरंत दवा का छिड़काव करें');
          actionItems.push('प्रभावित पौधों को अलग करें');
          actionItems.push('कृषि विशेषज्ञ से सलाह लें');
        } else {
          actionItems.push('Apply treatment immediately');
          actionItems.push('Isolate affected plants');
          actionItems.push('Consult agricultural expert');
        }
        break;

      case 'scheme_inquiry':
        if (language === 'hi') {
          actionItems.push('आवश्यक दस्तावेज तैयार करें');
          actionItems.push('नजदीकी कार्यालय में जाएं');
          actionItems.push('आवेदन की अंतिम तारीख जांचें');
        } else {
          actionItems.push('Prepare required documents');
          actionItems.push('Visit nearest office');
          actionItems.push('Check application deadline');
        }
        break;
    }

    return actionItems;
  }

  private generateFallbackResponse(language: LanguageCode): GeneratedResponse {
    const fallbackTexts: Record<LanguageCode, string> = {
      'hi': 'मुझे खुशी होगी अगर आप अपना सवाल दूसरे तरीके से पूछें। मैं खेती से जुड़े सवालों का जवाब दे सकता हूं।',
      'en': 'I would be happy if you could rephrase your question. I can answer farming-related questions.',
      'ta': 'உங்கள் கேள்வியை வேறு வழியில் கேட்டால் நான் மகிழ்ச்சியடைவேன்।',
      'te': 'మీ ప్రశ్నను వేరే విధంగా అడిగితే నేను సంతోషిస్తాను।',
      'bn': 'আপনি যদি আপনার প্রশ্নটি অন্যভাবে জিজ্ঞাসা করেন তাহলে আমি খুশি হব।',
      'mr': 'तुम्ही तुमचा प्रश्न दुसऱ्या पद्धतीने विचारल्यास मला आनंद होईल।',
      'gu': 'જો તમે તમારો પ્રશ્ન બીજી રીતે પૂછો તો મને ખુશી થશે।'
    };

    return {
      text: fallbackTexts[language] || fallbackTexts['en'],
      language,
      tone: 'supportive',
      followUpQuestions: [],
      actionItems: [],
      confidence: 0.3
    };
  }

  // Generate contextual responses based on conversation history
  public async generateContextualResponse(
    context: ResponseContext,
    conversationHistory: Intent[]
  ): Promise<GeneratedResponse> {
    // Analyze conversation pattern
    const recentIntents = conversationHistory.slice(-3).map(h => h.type);
    
    // Adjust response based on conversation flow
    if (recentIntents.includes('greeting') && context.intent.type === 'crop_recommendation') {
      // User just greeted and now asking for crop recommendation
      context.sessionData = { ...context.sessionData, isNewConversation: true };
    }

    return this.generateResponse(context);
  }

  // Get response templates for a specific intent
  public getResponseTemplates(intent: IntentType): ResponseTemplate | null {
    return this.responseTemplates.find(t => t.intent === intent) || null;
  }

  // Add custom response template
  public addCustomTemplate(template: ResponseTemplate): void {
    const existingIndex = this.responseTemplates.findIndex(t => t.intent === template.intent);
    if (existingIndex >= 0) {
      this.responseTemplates[existingIndex] = template;
    } else {
      this.responseTemplates.push(template);
    }
  }
}

export default ResponseGenerationService;