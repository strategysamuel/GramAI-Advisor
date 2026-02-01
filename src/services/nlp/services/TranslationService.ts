// Translation Service for Indian languages
import { LanguageCode } from '../../../shared/types';
import { redis } from '../../../shared/database/redis';

export interface TranslationRequest {
  text: string;
  sourceLanguage?: LanguageCode;
  targetLanguage: LanguageCode;
}

export interface TranslationResult {
  translatedText: string;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  confidence: number;
  cached: boolean;
}

// Language mappings for common agricultural terms
const AGRICULTURAL_TERMS: Record<string, Record<LanguageCode, string>> = {
  'farmer': {
    'hi': 'किसान',
    'ta': 'விவசாயி',
    'te': 'రైతు',
    'bn': 'কৃষক',
    'mr': 'शेतकरी',
    'gu': 'ખેડૂત',
    'en': 'farmer'
  },
  'crop': {
    'hi': 'फसल',
    'ta': 'பயிர்',
    'te': 'పంట',
    'bn': 'ফসল',
    'mr': 'पीक',
    'gu': 'પાક',
    'en': 'crop'
  },
  'soil': {
    'hi': 'मिट्टी',
    'ta': 'மண்',
    'te': 'మట్టి',
    'bn': 'মাটি',
    'mr': 'माती',
    'gu': 'માટી',
    'en': 'soil'
  },
  'water': {
    'hi': 'पानी',
    'ta': 'நீர்',
    'te': 'నీరు',
    'bn': 'পানি',
    'mr': 'पाणी',
    'gu': 'પાણી',
    'en': 'water'
  },
  'seed': {
    'hi': 'बीज',
    'ta': 'விதை',
    'te': 'విత్తనం',
    'bn': 'বীজ',
    'mr': 'बियाणे',
    'gu': 'બીજ',
    'en': 'seed'
  },
  'fertilizer': {
    'hi': 'उर्वरक',
    'ta': 'உரம்',
    'te': 'ఎరువు',
    'bn': 'সার',
    'mr': 'खत',
    'gu': 'ખાતર',
    'en': 'fertilizer'
  },
  'harvest': {
    'hi': 'फसल काटना',
    'ta': 'அறுவடை',
    'te': 'కోత',
    'bn': 'ফসল কাটা',
    'mr': 'कापणी',
    'gu': 'લણણી',
    'en': 'harvest'
  },
  'irrigation': {
    'hi': 'सिंचाई',
    'ta': 'நீர்ப்பாசனம்',
    'te': 'నీటిపారుదల',
    'bn': 'সেচ',
    'mr': 'सिंचन',
    'gu': 'સિંચાઈ',
    'en': 'irrigation'
  },
  'market': {
    'hi': 'बाजार',
    'ta': 'சந்தை',
    'te': 'మార్కెట్',
    'bn': 'বাজার',
    'mr': 'बाजार',
    'gu': 'બજાર',
    'en': 'market'
  },
  'price': {
    'hi': 'कीमत',
    'ta': 'விலை',
    'te': 'ధర',
    'bn': 'দাম',
    'mr': 'किंमत',
    'gu': 'કિંમત',
    'en': 'price'
  }
};

// Common phrases for agricultural context
const COMMON_PHRASES: Record<string, Record<LanguageCode, string>> = {
  'good_morning': {
    'hi': 'सुप्रभात',
    'ta': 'காலை வணக்கம்',
    'te': 'శుభోదయం',
    'bn': 'সুপ্রভাত',
    'mr': 'सुप्रभात',
    'gu': 'સુપ્રભાત',
    'en': 'good morning'
  },
  'how_can_help': {
    'hi': 'मैं आपकी कैसे मदद कर सकता हूं?',
    'ta': 'நான் உங்களுக்கு எப்படி உதவ முடியும்?',
    'te': 'నేను మీకు ఎలా సహాయం చేయగలను?',
    'bn': 'আমি আপনাকে কিভাবে সাহায্য করতে পারি?',
    'mr': 'मी तुमची कशी मदत करू शकतो?',
    'gu': 'હું તમારી કેવી રીતે મદદ કરી શકું?',
    'en': 'How can I help you?'
  },
  'crop_recommendation': {
    'hi': 'फसल की सिफारिश',
    'ta': 'பயிர் பரிந்துரை',
    'te': 'పంట సిఫార్సు',
    'bn': 'ফসলের সুপারিশ',
    'mr': 'पिकाची शिफारस',
    'gu': 'પાકની ભલામણ',
    'en': 'crop recommendation'
  },
  'weather_forecast': {
    'hi': 'मौसम का पूर्वानुमान',
    'ta': 'வானிலை முன்னறிவிப்பு',
    'te': 'వాతావరణ సూచన',
    'bn': 'আবহাওয়ার পূর্বাভাস',
    'mr': 'हवामान अंदाज',
    'gu': 'હવામાન આગાહી',
    'en': 'weather forecast'
  },
  'market_price': {
    'hi': 'बाजार की कीमत',
    'ta': 'சந்தை விலை',
    'te': 'మార్కెట్ ధర',
    'bn': 'বাজার দর',
    'mr': 'बाजार किंमत',
    'gu': 'બજાર ભાવ',
    'en': 'market price'
  }
};

export class TranslationService {
  private cachePrefix = 'translation:';
  private cacheTTL = 24 * 60 * 60; // 24 hours

  // Generate cache key for translation
  private getCacheKey(text: string, sourceLanguage: LanguageCode, targetLanguage: LanguageCode): string {
    const normalizedText = text.toLowerCase().trim();
    return `${this.cachePrefix}${sourceLanguage}:${targetLanguage}:${Buffer.from(normalizedText).toString('base64')}`;
  }

  // Check if translation exists in cache
  private async getCachedTranslation(
    text: string, 
    sourceLanguage: LanguageCode, 
    targetLanguage: LanguageCode
  ): Promise<TranslationResult | null> {
    try {
      const cacheKey = this.getCacheKey(text, sourceLanguage, targetLanguage);
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        const result = JSON.parse(cached) as TranslationResult;
        return { ...result, cached: true };
      }
    } catch (error) {
      console.warn('Cache retrieval failed:', error);
    }
    
    return null;
  }

  // Cache translation result
  private async cacheTranslation(
    text: string,
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode,
    result: TranslationResult
  ): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(text, sourceLanguage, targetLanguage);
      await redis.set(cacheKey, JSON.stringify(result), this.cacheTTL);
    } catch (error) {
      console.warn('Cache storage failed:', error);
    }
  }

  // Translate agricultural terms using dictionary
  private translateAgriculturalTerms(text: string, targetLanguage: LanguageCode): string {
    let translatedText = text;
    
    // Replace agricultural terms
    Object.entries(AGRICULTURAL_TERMS).forEach(([englishTerm, translations]) => {
      const regex = new RegExp(`\\b${englishTerm}\\b`, 'gi');
      if (translations[targetLanguage]) {
        translatedText = translatedText.replace(regex, translations[targetLanguage]);
      }
    });
    
    // Replace common phrases
    Object.entries(COMMON_PHRASES).forEach(([phraseKey, translations]) => {
      const englishPhrase = translations['en'];
      const regex = new RegExp(englishPhrase, 'gi');
      if (translations[targetLanguage]) {
        translatedText = translatedText.replace(regex, translations[targetLanguage]);
      }
    });
    
    return translatedText;
  }

  // Simple rule-based translation for basic agricultural content
  private performBasicTranslation(text: string, targetLanguage: LanguageCode): TranslationResult {
    // If target is English, return as-is
    if (targetLanguage === 'en') {
      return {
        translatedText: text,
        sourceLanguage: 'en',
        targetLanguage: 'en',
        confidence: 1.0,
        cached: false
      };
    }

    // Translate using dictionary
    const translatedText = this.translateAgriculturalTerms(text, targetLanguage);
    
    // Calculate confidence based on how much was translated
    const originalWords = text.split(/\s+/).length;
    const changedWords = translatedText !== text ? Math.min(originalWords, 5) : 0;
    const confidence = changedWords > 0 ? Math.min(0.8, 0.4 + (changedWords / originalWords) * 0.4) : 0.3;

    return {
      translatedText,
      sourceLanguage: 'en',
      targetLanguage,
      confidence,
      cached: false
    };
  }

  // Main translation method
  public async translateText(request: TranslationRequest): Promise<TranslationResult> {
    const { text, sourceLanguage = 'en', targetLanguage } = request;

    // Return original if same language
    if (sourceLanguage === targetLanguage) {
      return {
        translatedText: text,
        sourceLanguage,
        targetLanguage,
        confidence: 1.0,
        cached: false
      };
    }

    // Check cache first
    const cached = await this.getCachedTranslation(text, sourceLanguage, targetLanguage);
    if (cached) {
      return cached;
    }

    // Perform translation
    const result = this.performBasicTranslation(text, targetLanguage);

    // Cache the result
    await this.cacheTranslation(text, sourceLanguage, targetLanguage, result);

    return result;
  }

  // Batch translation for multiple texts
  public async translateBatch(
    texts: string[],
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode
  ): Promise<TranslationResult[]> {
    const results: TranslationResult[] = [];
    
    for (const text of texts) {
      const result = await this.translateText({
        text,
        sourceLanguage,
        targetLanguage
      });
      results.push(result);
    }
    
    return results;
  }

  // Get supported languages
  public getSupportedLanguages(): LanguageCode[] {
    return ['hi', 'ta', 'te', 'bn', 'mr', 'gu', 'en'];
  }

  // Check if language is supported
  public isLanguageSupported(language: LanguageCode): boolean {
    return this.getSupportedLanguages().includes(language);
  }

  // Get agricultural terms dictionary
  public getAgriculturalTerms(): Record<string, Record<LanguageCode, string>> {
    return AGRICULTURAL_TERMS;
  }

  // Get common phrases dictionary
  public getCommonPhrases(): Record<string, Record<LanguageCode, string>> {
    return COMMON_PHRASES;
  }

  // Add custom translation to cache
  public async addCustomTranslation(
    text: string,
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode,
    translation: string
  ): Promise<void> {
    const result: TranslationResult = {
      translatedText: translation,
      sourceLanguage,
      targetLanguage,
      confidence: 1.0,
      cached: false
    };

    await this.cacheTranslation(text, sourceLanguage, targetLanguage, result);
  }

  // Clear translation cache
  public async clearCache(): Promise<void> {
    try {
      const client = redis.getClient();
      const keys = await client.keys(`${this.cachePrefix}*`);
      
      if (keys.length > 0) {
        await client.del(keys);
      }
    } catch (error) {
      console.error('Failed to clear translation cache:', error);
    }
  }
}

export default TranslationService;