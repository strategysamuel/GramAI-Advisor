// NLP Services Unit Tests
import LanguageDetectionService from '../../services/nlp/services/LanguageDetectionService';
import TranslationService from '../../services/nlp/services/TranslationService';
import IntentRecognitionService from '../../services/nlp/services/IntentRecognitionService';
import ResponseGenerationService from '../../services/nlp/services/ResponseGenerationService';
import TechnicalTermExplanationService from '../../services/nlp/services/TechnicalTermExplanationService';

// Mock Redis for translation service
jest.mock('../../shared/database/redis', () => ({
  redis: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    getClient: jest.fn().mockReturnValue({
      keys: jest.fn().mockResolvedValue([]),
      del: jest.fn().mockResolvedValue(1)
    })
  }
}));

describe('NLP Services', () => {
  describe('LanguageDetectionService', () => {
    let languageDetectionService: LanguageDetectionService;

    beforeEach(() => {
      languageDetectionService = new LanguageDetectionService();
    });

    test('should detect Hindi language correctly', () => {
      const hindiText = 'नमस्ते, मैं एक किसान हूं और फसल की सलाह चाहिए';
      const result = languageDetectionService.detectLanguage(hindiText);
      
      expect(result.language).toBe('hi');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test('should detect English language correctly', () => {
      const englishText = 'Hello, I am a farmer and need crop advice';
      const result = languageDetectionService.detectLanguage(englishText);
      
      expect(result.language).toBe('en');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test('should handle empty text gracefully', () => {
      const result = languageDetectionService.detectLanguage('');
      
      expect(result.language).toBe('en');
      expect(result.confidence).toBeLessThan(0.5);
    });

    test('should return supported languages', () => {
      const languages = languageDetectionService.getSupportedLanguages();
      
      expect(languages).toContain('hi');
      expect(languages).toContain('en');
      expect(languages).toContain('ta');
    });
  });

  describe('TranslationService', () => {
    let translationService: TranslationService;

    beforeEach(() => {
      translationService = new TranslationService();
    });

    test('should translate agricultural terms from English to Hindi', async () => {
      const result = await translationService.translateText({
        text: 'farmer needs good soil for crop',
        sourceLanguage: 'en',
        targetLanguage: 'hi'
      });

      expect(result.translatedText).toContain('किसान');
      expect(result.targetLanguage).toBe('hi');
    });

    test('should return original text for same language translation', async () => {
      const originalText = 'Hello farmer';
      const result = await translationService.translateText({
        text: originalText,
        sourceLanguage: 'en',
        targetLanguage: 'en'
      });

      expect(result.translatedText).toBe(originalText);
      expect(result.confidence).toBe(1.0);
    });
  });

  describe('IntentRecognitionService', () => {
    let intentService: IntentRecognitionService;

    beforeEach(() => {
      intentService = new IntentRecognitionService();
    });

    test('should recognize crop recommendation intent in Hindi', () => {
      const context = {
        language: 'hi' as const,
        timestamp: new Date()
      };
      
      const result = intentService.recognizeIntent('कौन सी फसल उगाऊं', context);
      
      expect(result.type).toBe('crop_recommendation');
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    test('should recognize greeting intent', () => {
      const context = {
        language: 'hi' as const,
        timestamp: new Date()
      };
      
      const result = intentService.recognizeIntent('नमस्ते', context);
      
      expect(result.type).toBe('greeting');
      expect(result.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('ResponseGenerationService', () => {
    let responseService: ResponseGenerationService;

    beforeEach(() => {
      responseService = new ResponseGenerationService();
    });

    test('should generate greeting response in Hindi', async () => {
      const context = {
        intent: {
          type: 'greeting' as const,
          confidence: 0.9,
          entities: [],
          context: {
            language: 'hi' as const,
            timestamp: new Date()
          }
        },
        userProfile: {
          name: 'राम',
          preferredLanguage: 'hi' as const
        },
        timestamp: new Date()
      };

      const response = await responseService.generateResponse(context);

      expect(response.text).toContain('नमस्ते');
      expect(response.language).toBe('hi');
    });
  });

  describe('TechnicalTermExplanationService', () => {
    let termService: TechnicalTermExplanationService;

    beforeEach(() => {
      termService = new TechnicalTermExplanationService();
    });

    test('should explain pH term in Hindi', async () => {
      const result = await termService.explainTerm('pH', 'hi');
      
      expect(result).toBeDefined();
      expect(result!.term).toBe('pH');
      expect(result!.explanation.definition).toContain('अम्लता');
    });

    test('should return null for unknown terms', async () => {
      const result = await termService.explainTerm('unknownterm123', 'hi');
      
      expect(result).toBeNull();
    });
  });
});