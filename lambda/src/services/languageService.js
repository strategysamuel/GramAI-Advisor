const { TranslateClient, TranslateTextCommand } = require('@aws-sdk/client-translate');

class LanguageService {
  constructor() {
    this.translateClient = new TranslateClient({ region: process.env.REGION || 'ap-south-1' });
    
    // Language code mapping
    this.languageMap = {
      'hi': 'Hindi',
      'ta': 'Tamil',
      'te': 'Telugu',
      'bn': 'Bengali',
      'mr': 'Marathi',
      'gu': 'Gujarati',
      'en': 'English'
    };
  }

  async detectLanguage(text) {
    try {
      // Simple heuristic detection based on character sets
      // For production, use AWS Comprehend or Translate's auto-detect
      if (/[\u0900-\u097F]/.test(text)) return 'hi'; // Devanagari (Hindi/Marathi)
      if (/[\u0B80-\u0BFF]/.test(text)) return 'ta'; // Tamil
      if (/[\u0C00-\u0C7F]/.test(text)) return 'te'; // Telugu
      if (/[\u0980-\u09FF]/.test(text)) return 'bn'; // Bengali
      if (/[\u0A80-\u0AFF]/.test(text)) return 'gu'; // Gujarati
      
      return 'en'; // Default to English
    } catch (error) {
      console.error('Language detection error:', error);
      return 'en';
    }
  }

  async translateToEnglish(text, sourceLanguage) {
    try {
      if (sourceLanguage === 'en') return text;

      const command = new TranslateTextCommand({
        Text: text,
        SourceLanguageCode: sourceLanguage,
        TargetLanguageCode: 'en'
      });

      const response = await this.translateClient.send(command);
      return response.TranslatedText;
    } catch (error) {
      console.error('Translation to English error:', error);
      return text; // Return original if translation fails
    }
  }

  async translateResponse(advisory, targetLanguage) {
    try {
      if (targetLanguage === 'en') return advisory;

      const translatedAdvisory = { ...advisory };

      // Translate key fields
      if (advisory.diagnosis) {
        translatedAdvisory.diagnosis = await this.translateText(advisory.diagnosis, targetLanguage);
      }
      
      if (advisory.treatment) {
        translatedAdvisory.treatment = await this.translateText(advisory.treatment, targetLanguage);
      }
      
      if (advisory.explanation) {
        translatedAdvisory.explanation = await this.translateText(advisory.explanation, targetLanguage);
      }
      
      if (advisory.marketInsight) {
        translatedAdvisory.marketInsight = await this.translateText(advisory.marketInsight, targetLanguage);
      }
      
      if (advisory.schemeSuggestion) {
        translatedAdvisory.schemeSuggestion = await this.translateText(advisory.schemeSuggestion, targetLanguage);
      }

      return translatedAdvisory;
    } catch (error) {
      console.error('Response translation error:', error);
      return advisory;
    }
  }

  async translateText(text, targetLanguage) {
    try {
      const command = new TranslateTextCommand({
        Text: text,
        SourceLanguageCode: 'en',
        TargetLanguageCode: targetLanguage
      });

      const response = await this.translateClient.send(command);
      return response.TranslatedText;
    } catch (error) {
      console.error('Text translation error:', error);
      return text;
    }
  }
}

module.exports = { LanguageService };
