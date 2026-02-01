// Intent Recognition and Entity Extraction Service
// Recognizes user intents and extracts entities from farmer queries

import { LanguageCode } from '../../../shared/types';

export interface Intent {
  type: IntentType;
  confidence: number;
  entities: Entity[];
  context: ConversationContext;
}

export interface Entity {
  type: EntityType;
  value: string;
  confidence: number;
  start: number;
  end: number;
  metadata?: Record<string, any>;
}

export interface ConversationContext {
  previousIntent?: IntentType;
  sessionId?: string;
  userId?: string;
  language: LanguageCode;
  timestamp: Date;
}

export type IntentType = 
  | 'crop_recommendation'
  | 'weather_query'
  | 'market_price'
  | 'soil_analysis'
  | 'pest_disease'
  | 'scheme_inquiry'
  | 'loan_application'
  | 'land_analysis'
  | 'farming_advice'
  | 'profile_update'
  | 'greeting'
  | 'help'
  | 'unknown';

export type EntityType =
  | 'crop_name'
  | 'location'
  | 'date'
  | 'area'
  | 'price'
  | 'disease_name'
  | 'pest_name'
  | 'soil_type'
  | 'season'
  | 'farming_method'
  | 'scheme_name'
  | 'loan_amount'
  | 'contact_info';

export interface IntentPattern {
  intent: IntentType;
  patterns: Array<{
    language: LanguageCode;
    keywords: string[];
    phrases: string[];
    regex?: RegExp[];
  }>;
  entities: EntityType[];
  confidence: number;
}

class IntentRecognitionService {
  private intentPatterns: IntentPattern[];
  private entityPatterns: Map<EntityType, RegExp[]>;

  constructor() {
    this.intentPatterns = this.initializeIntentPatterns();
    this.entityPatterns = this.initializeEntityPatterns();
  }

  private initializeIntentPatterns(): IntentPattern[] {
    return [
      {
        intent: 'crop_recommendation',
        patterns: [
          {
            language: 'hi',
            keywords: ['फसल', 'बीज', 'खेती', 'उगाना', 'बोना', 'सुझाव'],
            phrases: [
              'कौन सी फसल उगाऊं',
              'बेहतर फसल क्या है',
              'फसल की सिफारिश',
              'क्या बोना चाहिए'
            ]
          },
          {
            language: 'en',
            keywords: ['crop', 'seed', 'farming', 'grow', 'plant', 'recommend'],
            phrases: [
              'which crop to grow',
              'best crop for',
              'crop recommendation',
              'what should I plant'
            ]
          },
          {
            language: 'ta',
            keywords: ['பயிர்', 'விதை', 'விவசாயம்', 'வளர்க்க', 'பரிந்துரை'],
            phrases: [
              'எந்த பயிர் வளர்க்க வேண்டும்',
              'சிறந்த பயிர்',
              'பயிர் பரிந்துரை'
            ]
          }
        ],
        entities: ['crop_name', 'location', 'season', 'area'],
        confidence: 0.8
      },
      {
        intent: 'weather_query',
        patterns: [
          {
            language: 'hi',
            keywords: ['मौसम', 'बारिश', 'धूप', 'तापमान', 'हवा'],
            phrases: [
              'मौसम कैसा है',
              'बारिश कब होगी',
              'आज का मौसम'
            ]
          },
          {
            language: 'en',
            keywords: ['weather', 'rain', 'temperature', 'climate', 'forecast'],
            phrases: [
              'what is the weather',
              'will it rain',
              'weather forecast'
            ]
          }
        ],
        entities: ['location', 'date'],
        confidence: 0.9
      },
      {
        intent: 'market_price',
        patterns: [
          {
            language: 'hi',
            keywords: ['भाव', 'दाम', 'कीमत', 'मंडी', 'बाजार'],
            phrases: [
              'आज का भाव क्या है',
              'मंडी में दाम',
              'कीमत कितनी है'
            ]
          },
          {
            language: 'en',
            keywords: ['price', 'rate', 'market', 'cost', 'value'],
            phrases: [
              'what is the price',
              'market rate',
              'current price'
            ]
          }
        ],
        entities: ['crop_name', 'location', 'date'],
        confidence: 0.85
      },
      {
        intent: 'soil_analysis',
        patterns: [
          {
            language: 'hi',
            keywords: ['मिट्टी', 'जांच', 'परीक्षण', 'उर्वरता', 'पीएच'],
            phrases: [
              'मिट्टी की जांच',
              'मिट्टी कैसी है',
              'मिट्टी परीक्षण'
            ]
          },
          {
            language: 'en',
            keywords: ['soil', 'test', 'analysis', 'fertility', 'pH'],
            phrases: [
              'soil test',
              'soil analysis',
              'check soil quality'
            ]
          }
        ],
        entities: ['location', 'soil_type'],
        confidence: 0.8
      },
      {
        intent: 'pest_disease',
        patterns: [
          {
            language: 'hi',
            keywords: ['कीट', 'रोग', 'बीमारी', 'दवा', 'इलाज'],
            phrases: [
              'फसल में कीट',
              'पौधे की बीमारी',
              'कीट नियंत्रण'
            ]
          },
          {
            language: 'en',
            keywords: ['pest', 'disease', 'insect', 'treatment', 'control'],
            phrases: [
              'pest problem',
              'plant disease',
              'crop infection'
            ]
          }
        ],
        entities: ['crop_name', 'pest_name', 'disease_name'],
        confidence: 0.8
      },
      {
        intent: 'scheme_inquiry',
        patterns: [
          {
            language: 'hi',
            keywords: ['योजना', 'सब्सिडी', 'सहायता', 'लाभ', 'आवेदन'],
            phrases: [
              'सरकारी योजना',
              'सब्सिडी कैसे मिलेगी',
              'योजना का लाभ'
            ]
          },
          {
            language: 'en',
            keywords: ['scheme', 'subsidy', 'benefit', 'government', 'application'],
            phrases: [
              'government scheme',
              'subsidy available',
              'how to apply'
            ]
          }
        ],
        entities: ['scheme_name', 'location'],
        confidence: 0.8
      },
      {
        intent: 'loan_application',
        patterns: [
          {
            language: 'hi',
            keywords: ['लोन', 'ऋण', 'कर्ज', 'बैंक', 'आवेदन'],
            phrases: [
              'लोन कैसे मिलेगा',
              'कृषि ऋण',
              'बैंक से लोन'
            ]
          },
          {
            language: 'en',
            keywords: ['loan', 'credit', 'bank', 'finance', 'application'],
            phrases: [
              'how to get loan',
              'agriculture loan',
              'bank loan'
            ]
          }
        ],
        entities: ['loan_amount', 'location'],
        confidence: 0.8
      },
      {
        intent: 'greeting',
        patterns: [
          {
            language: 'hi',
            keywords: ['नमस्ते', 'हैलो', 'प्रणाम', 'आदाब'],
            phrases: ['नमस्ते', 'हैलो', 'कैसे हैं']
          },
          {
            language: 'en',
            keywords: ['hello', 'hi', 'good', 'morning', 'evening'],
            phrases: ['hello', 'hi there', 'good morning']
          }
        ],
        entities: [],
        confidence: 0.9
      }
    ];
  }

  private initializeEntityPatterns(): Map<EntityType, RegExp[]> {
    const patterns = new Map<EntityType, RegExp[]>();

    patterns.set('crop_name', [
      /\b(धान|चावल|गेहूं|मक्का|बाजरा|ज्वार|तिल|सरसों|सोयाबीन|चना|मटर|अरहर|उड़द|मूंग|मसूर|आलू|प्याज|टमाटर|बैंगन|भिंडी|गाजर|मूली|पत्तागोभी|फूलगोभी|हरी मिर्च|लहसुन|अदरक|हल्दी|धनिया|जीरा|मेथी|पालक|चुकंदर|ककड़ी|खीरा|लौकी|तोरी|करेला|कद्दू|तरबूज|खरबूजा|पपीता|केला|आम|अमरूद|नींबू|संतरा|अनार|अंगूर|सेब|नाशपाती|आड़ू|बेर|जामुन|लीची|रामफल|चीकू|कटहल|नारियल|खजूर|अंजीर|बादाम|अखरोट|काजू|पिस्ता|किशमिश|मुनक्का|खुबानी|छुहारा|इलायची|लौंग|दालचीनी|तेजपत्ता|कालीमिर्च|लालमिर्च|अजवाइन|सौंफ|कलौंजी|तिल|सूरजमुखी|कुसुम|अलसी|रेंड़ी|जैतून|नारियल|ताड़|खजूर|गन्ना|कपास|जूट|पटसन|रेशम|तम्बाकू|अफीम|भांग|चाय|कॉफी|रबर|सिनकोना|नील|हल्दी|अदरक|लहसुन|प्याज|आलू|शकरकंद|अरबी|जिमीकंद|कचालू|ओल|सूरन|कंद|मूली|गाजर|चुकंदर|शलजम|पार्सनिप|रुतबागा|कोहलराबी|ब्रोकली|फूलगोभी|पत्तागोभी|ब्रसेल्स स्प्राउट्स|केल|कोलार्ड|चार्ड|पालक|मेथी|बथुआ|चौलाई|सरसों|चना|धनिया|पुदीना|तुलसी|करी पत्ता|नीम|एलोवेरा|अश्वगंधा|ब्राह्मी|शंखपुष्पी|मंडूकपर्णी|गिलोय|तुलसी|नीम|करेला|जामुन|आंवला|हरड़|बहेड़ा|त्रिफला|च्यवनप्राश|अर्जुन|अशोक|शतावरी|विदारीकंद|सफेद मूसली|कौंच|गोखरू|पुनर्नवा|भूमि आंवला|कालमेघ|चिरायता|कुटकी|पित्तपापड़ा|भृंगराज|जटामांसी|वच|ब्राह्मी|मंडूकपर्णी|शंखpushpi)/gi,
      /\b(rice|wheat|corn|maize|millet|sorghum|sesame|mustard|soybean|chickpea|pea|pigeon pea|black gram|mung bean|lentil|potato|onion|tomato|eggplant|okra|carrot|radish|cabbage|cauliflower|green chili|garlic|ginger|turmeric|coriander|cumin|fenugreek|spinach|beetroot|cucumber|bottle gourd|ridge gourd|bitter gourd|pumpkin|watermelon|muskmelon|papaya|banana|mango|guava|lemon|orange|pomegranate|grapes|apple|pear|peach|jujube|jamun|litchi|custard apple|sapota|jackfruit|coconut|dates|fig|almond|walnut|cashew|pistachio|raisins|apricot|cardamom|cloves|cinnamon|bay leaf|black pepper|red chili|carom seeds|fennel|nigella|sunflower|safflower|flax|castor|olive|palm|sugarcane|cotton|jute|silk|tobacco|opium|hemp|tea|coffee|rubber)/gi
    ]);

    patterns.set('location', [
      /\b(दिल्ली|मुंबई|कोलकाता|चेन्नई|बेंगलुरु|हैदराबाद|अहमदाबाद|पुणे|सूरत|जयपुर|लखनऊ|कानपुर|नागपुर|इंदौर|ठाणे|भोपाल|विशाखापत्तनम|पटना|वडोदरा|लुधियाना|आगरा|नाशिक|फरीदाबाद|मेरठ|राजकोट|कल्याण|वासई|वारंगल|औरंगाबाद|नवी मुंबई|गुड़गांव|इलाहाबाद|अमृतसर|विजयवाड़ा|मदुरै|गाजियाबाद|धनबाद|हावड़ा|जबलपुर|कोयंबटूर|रांची|चंडीगढ़|जोधपुर|कोच्चि|देहरादून|त्रिवेंद्रम|जम्मू|मैसूर|गुवाहाटी|हुबली|तिरुचिरापल्ली|बरेली|मोरादाबाद|अलीगढ़|जालंधर|भुवनेश्वर|सेलम|मिजोरम|वारणसी|श्रीनगर|औरंगाबाद|धारवाड़|अंबाला|पानीपत|रोहतक|गुड़गांव|फरीदाबाद|सोनीपत|करनाल|यमुनानगर|कुरुक्षेत्र|कैथल|जींद|हिसार|सिरसा|फतेहाबाद|भिवानी|महेंद्रगढ़|रेवाड़ी|पलवल|नूंह|गुड़गांव|फरीदाबाद|सोनीपत|पानीपत|करनाल|कुरुक्षेत्र|कैथल|जींद|हिसार|सिरसा|फतेहाबाद|भिवानी|चरखी दादरी|महेंद्रगढ़|रेवाड़ी|पलवल|नूंह)/gi,
      /\b(delhi|mumbai|kolkata|chennai|bangalore|hyderabad|ahmedabad|pune|surat|jaipur|lucknow|kanpur|nagpur|indore|thane|bhopal|visakhapatnam|patna|vadodara|ludhiana|agra|nashik|faridabad|meerut|rajkot|kalyan|vasai|warangal|aurangabad|navi mumbai|gurgaon|allahabad|amritsar|vijayawada|madurai|ghaziabad|dhanbad|howrah|jabalpur|coimbatore|ranchi|chandigarh|jodhpur|kochi|dehradun|trivandrum|jammu|mysore|guwahati|hubli|tiruchirappalli|bareilly|moradabad|aligarh|jalandhar|bhubaneswar|salem|mizoram|varanasi|srinagar|aurangabad|dharwad|ambala|panipat|rohtak|gurgaon|faridabad|sonipat|karnal|yamunanagar|kurukshetra|kaithal|jind|hisar|sirsa|fatehabad|bhiwani|mahendragarh|rewari|palwal|nuh)/gi
    ]);

    patterns.set('date', [
      /\b(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})\b/g,
      /\b(आज|कल|परसों|अगले हफ्ते|अगले महीने|इस साल|अगले साल)\b/gi,
      /\b(today|tomorrow|yesterday|next week|next month|this year|next year)\b/gi,
      /\b(जनवरी|फरवरी|मार्च|अप्रैल|मई|जून|जुलाई|अगस्त|सितंबर|अक्टूबर|नवंबर|दिसंबर)\b/gi,
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/gi
    ]);

    patterns.set('area', [
      /\b(\d+(?:\.\d+)?)\s*(एकड़|बीघा|हेक्टेयर|वर्ग मीटर|वर्ग फुट)\b/gi,
      /\b(\d+(?:\.\d+)?)\s*(acre|bigha|hectare|square meter|square feet|sq ft|sq m)\b/gi
    ]);

    patterns.set('price', [
      /\b₹?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(रुपए|रुपये|पैसे)?\b/gi,
      /\b(rs\.?|inr|rupees?)\s*(\d+(?:,\d+)*(?:\.\d+)?)\b/gi
    ]);

    patterns.set('loan_amount', [
      /\b(\d+(?:,\d+)*(?:\.\d+)?)\s*(लाख|करोड़|हजार)?\s*(रुपए|रुपये)?\s*(लोन|ऋण|कर्ज)\b/gi,
      /\b(loan|credit)\s*(?:of|for)?\s*(?:rs\.?|inr|rupees?)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(lakh|crore|thousand)?\b/gi
    ]);

    return patterns;
  }

  // Main intent recognition method
  public recognizeIntent(text: string, context: ConversationContext): Intent {
    if (!text || text.trim().length === 0) {
      return {
        type: 'unknown',
        confidence: 0,
        entities: [],
        context
      };
    }

    const cleanText = text.trim().toLowerCase();
    const scores: Array<{ intent: IntentType; score: number }> = [];

    // Calculate scores for each intent
    for (const pattern of this.intentPatterns) {
      const score = this.calculateIntentScore(cleanText, pattern, context.language);
      scores.push({ intent: pattern.intent, score });
    }

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    const topIntent = scores[0];
    const confidence = Math.min(0.95, Math.max(0.1, topIntent.score));

    // Extract entities
    const entities = this.extractEntities(text, topIntent.intent);

    return {
      type: topIntent.intent,
      confidence,
      entities,
      context: {
        ...context,
        previousIntent: topIntent.intent,
        timestamp: new Date()
      }
    };
  }

  private calculateIntentScore(text: string, pattern: IntentPattern, language: LanguageCode): number {
    const languagePattern = pattern.patterns.find(p => p.language === language) || 
                           pattern.patterns.find(p => p.language === 'en');
    
    if (!languagePattern) return 0;

    let score = 0;
    let totalWords = text.split(/\s+/).length;

    // Keyword matching
    let keywordMatches = 0;
    for (const keyword of languagePattern.keywords) {
      if (text.includes(keyword.toLowerCase())) {
        keywordMatches++;
      }
    }
    score += (keywordMatches / languagePattern.keywords.length) * 0.6;

    // Phrase matching
    let phraseMatches = 0;
    for (const phrase of languagePattern.phrases) {
      if (text.includes(phrase.toLowerCase())) {
        phraseMatches += 2; // Phrases have higher weight
      }
    }
    score += (phraseMatches / languagePattern.phrases.length) * 0.4;

    // Regex matching if available
    if (languagePattern.regex) {
      let regexMatches = 0;
      for (const regex of languagePattern.regex) {
        if (regex.test(text)) {
          regexMatches++;
        }
      }
      score += (regexMatches / languagePattern.regex.length) * 0.2;
    }

    return Math.min(1, score);
  }

  private extractEntities(text: string, intent: IntentType): Entity[] {
    const entities: Entity[] = [];

    for (const [entityType, patterns] of this.entityPatterns.entries()) {
      for (const pattern of patterns) {
        const matches = Array.from(text.matchAll(pattern));
        
        for (const match of matches) {
          if (match.index !== undefined) {
            entities.push({
              type: entityType,
              value: match[0],
              confidence: 0.8,
              start: match.index,
              end: match.index + match[0].length,
              metadata: {
                pattern: pattern.source,
                fullMatch: match[0]
              }
            });
          }
        }
      }
    }

    // Remove duplicates and overlapping entities
    return this.removeDuplicateEntities(entities);
  }

  private removeDuplicateEntities(entities: Entity[]): Entity[] {
    // Sort by start position
    entities.sort((a, b) => a.start - b.start);

    const filtered: Entity[] = [];
    
    for (const entity of entities) {
      // Check for overlaps with existing entities
      const hasOverlap = filtered.some(existing => 
        (entity.start >= existing.start && entity.start < existing.end) ||
        (entity.end > existing.start && entity.end <= existing.end)
      );

      if (!hasOverlap) {
        filtered.push(entity);
      }
    }

    return filtered;
  }

  // Batch intent recognition
  public recognizeIntentBatch(texts: string[], context: ConversationContext): Intent[] {
    return texts.map(text => this.recognizeIntent(text, context));
  }

  // Get supported intents
  public getSupportedIntents(): IntentType[] {
    return this.intentPatterns.map(p => p.intent);
  }

  // Get intent description
  public getIntentDescription(intent: IntentType): string {
    const descriptions: Record<IntentType, string> = {
      'crop_recommendation': 'Crop selection and farming advice',
      'weather_query': 'Weather information and forecasts',
      'market_price': 'Market prices and trading information',
      'soil_analysis': 'Soil testing and analysis',
      'pest_disease': 'Pest and disease management',
      'scheme_inquiry': 'Government schemes and subsidies',
      'loan_application': 'Agricultural loans and financing',
      'land_analysis': 'Land assessment and planning',
      'farming_advice': 'General farming guidance',
      'profile_update': 'Profile and account management',
      'greeting': 'Greetings and pleasantries',
      'help': 'Help and support requests',
      'unknown': 'Unrecognized query'
    };

    return descriptions[intent] || 'Unknown intent';
  }
}

export default IntentRecognitionService;