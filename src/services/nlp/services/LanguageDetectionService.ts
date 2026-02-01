// Language Detection Service
// Detects language from text input for supported Indian languages

import { LanguageCode } from '../../../shared/types';

export interface LanguageDetectionResult {
  language: LanguageCode;
  confidence: number;
  alternatives?: Array<{
    language: LanguageCode;
    confidence: number;
  }>;
}

export interface LanguagePattern {
  language: LanguageCode;
  patterns: RegExp[];
  commonWords: string[];
  unicodeRanges: Array<[number, number]>;
}

class LanguageDetectionService {
  private languagePatterns: LanguagePattern[];
  private supportedLanguages: LanguageCode[] = ['hi', 'ta', 'te', 'bn', 'mr', 'gu', 'en'];

  constructor() {
    this.languagePatterns = this.initializeLanguagePatterns();
  }

  private initializeLanguagePatterns(): LanguagePattern[] {
    return [
      {
        language: 'hi',
        patterns: [
          /[\u0900-\u097F]/g, // Devanagari script
        ],
        commonWords: [
          'और', 'का', 'के', 'की', 'में', 'से', 'को', 'है', 'हैं', 'था', 'थे', 'थी',
          'यह', 'वह', 'जो', 'कि', 'पर', 'लिए', 'साथ', 'बाद', 'तक', 'द्वारा',
          'किसान', 'खेत', 'फसल', 'बीज', 'पानी', 'मिट्टी', 'खाद', 'दवा'
        ],
        unicodeRanges: [[0x0900, 0x097F]]
      },
      {
        language: 'ta',
        patterns: [
          /[\u0B80-\u0BFF]/g, // Tamil script
        ],
        commonWords: [
          'மற்றும்', 'இன்', 'ஒரு', 'இல்', 'அல்லது', 'என்று', 'இருந்து', 'வரை',
          'விவசாயி', 'நிலம்', 'பயிர்', 'விதை', 'நீர்', 'மண்', 'உரம்', 'மருந்து'
        ],
        unicodeRanges: [[0x0B80, 0x0BFF]]
      },
      {
        language: 'te',
        patterns: [
          /[\u0C00-\u0C7F]/g, // Telugu script
        ],
        commonWords: [
          'మరియు', 'యొక్క', 'ఒక', 'లో', 'లేదా', 'అని', 'నుండి', 'వరకు',
          'రైతు', 'భూమి', 'పంట', 'విత్తనం', 'నీరు', 'మట్టి', 'ఎరువు', 'మందు'
        ],
        unicodeRanges: [[0x0C00, 0x0C7F]]
      },
      {
        language: 'bn',
        patterns: [
          /[\u0980-\u09FF]/g, // Bengali script
        ],
        commonWords: [
          'এবং', 'এর', 'একটি', 'মধ্যে', 'বা', 'যে', 'থেকে', 'পর্যন্ত',
          'কৃষক', 'জমি', 'ফসল', 'বীজ', 'পানি', 'মাটি', 'সার', 'ওষুধ'
        ],
        unicodeRanges: [[0x0980, 0x09FF]]
      },
      {
        language: 'mr',
        patterns: [
          /[\u0900-\u097F]/g, // Devanagari script (shared with Hindi)
        ],
        commonWords: [
          'आणि', 'चा', 'चे', 'ची', 'मध्ये', 'पासून', 'ला', 'आहे', 'होते', 'होता',
          'शेतकरी', 'जमीन', 'पीक', 'बियाणे', 'पाणी', 'माती', 'खत', 'औषध'
        ],
        unicodeRanges: [[0x0900, 0x097F]]
      },
      {
        language: 'gu',
        patterns: [
          /[\u0A80-\u0AFF]/g, // Gujarati script
        ],
        commonWords: [
          'અને', 'ના', 'એક', 'માં', 'અથવા', 'કે', 'થી', 'સુધી',
          'ખેડૂત', 'જમીન', 'પાક', 'બીજ', 'પાણી', 'માટી', 'ખાતર', 'દવા'
        ],
        unicodeRanges: [[0x0A80, 0x0AFF]]
      },
      {
        language: 'en',
        patterns: [
          /[a-zA-Z]/g, // Latin script
        ],
        commonWords: [
          'and', 'the', 'of', 'in', 'to', 'a', 'is', 'that', 'for', 'with',
          'farmer', 'land', 'crop', 'seed', 'water', 'soil', 'fertilizer', 'medicine'
        ],
        unicodeRanges: [[0x0041, 0x005A], [0x0061, 0x007A]]
      }
    ];
  }

  // Main language detection method
  public detectLanguage(text: string): LanguageDetectionResult {
    if (!text || text.trim().length === 0) {
      return {
        language: 'en',
        confidence: 0.1
      };
    }

    const cleanText = text.trim().toLowerCase();
    const scores: Array<{ language: LanguageCode; score: number }> = [];

    // Calculate scores for each language
    for (const pattern of this.languagePatterns) {
      const score = this.calculateLanguageScore(cleanText, pattern);
      scores.push({ language: pattern.language, score });
    }

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    // Calculate confidence based on score difference
    const topScore = scores[0].score;
    const secondScore = scores[1]?.score || 0;
    const confidence = Math.min(0.95, Math.max(0.1, topScore / (topScore + secondScore + 0.1)));

    // Prepare alternatives
    const alternatives = scores.slice(1, 4).map(s => ({
      language: s.language,
      confidence: Math.max(0.05, s.score / (topScore + 0.1))
    }));

    return {
      language: scores[0].language,
      confidence,
      alternatives: alternatives.length > 0 ? alternatives : undefined
    };
  }

  private calculateLanguageScore(text: string, pattern: LanguagePattern): number {
    let score = 0;

    // Unicode range matching
    score += this.calculateUnicodeScore(text, pattern.unicodeRanges) * 0.6;

    // Common words matching
    score += this.calculateWordScore(text, pattern.commonWords) * 0.3;

    // Pattern matching
    score += this.calculatePatternScore(text, pattern.patterns) * 0.1;

    return score;
  }

  private calculateUnicodeScore(text: string, ranges: Array<[number, number]>): number {
    let matches = 0;
    let total = 0;

    for (const char of text) {
      const code = char.charCodeAt(0);
      total++;

      for (const [start, end] of ranges) {
        if (code >= start && code <= end) {
          matches++;
          break;
        }
      }
    }

    return total > 0 ? matches / total : 0;
  }

  private calculateWordScore(text: string, commonWords: string[]): number {
    const words = text.split(/\s+/);
    let matches = 0;

    for (const word of words) {
      if (commonWords.includes(word)) {
        matches++;
      }
    }

    return words.length > 0 ? matches / words.length : 0;
  }

  private calculatePatternScore(text: string, patterns: RegExp[]): number {
    let totalMatches = 0;

    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        totalMatches += matches.length;
      }
    }

    return Math.min(1, totalMatches / text.length);
  }

  // Batch detection for multiple texts
  public detectLanguageBatch(texts: string[]): LanguageDetectionResult[] {
    return texts.map(text => this.detectLanguage(text));
  }

  // Get supported languages
  public getSupportedLanguages(): LanguageCode[] {
    return [...this.supportedLanguages];
  }

  // Check if language is supported
  public isLanguageSupported(language: string): boolean {
    return this.supportedLanguages.includes(language as LanguageCode);
  }

  // Get language name in English
  public getLanguageName(language: LanguageCode): string {
    const names: Record<LanguageCode, string> = {
      'hi': 'Hindi',
      'ta': 'Tamil',
      'te': 'Telugu',
      'bn': 'Bengali',
      'mr': 'Marathi',
      'gu': 'Gujarati',
      'en': 'English'
    };

    return names[language] || 'Unknown';
  }

  // Get language name in native script
  public getLanguageNativeName(language: LanguageCode): string {
    const nativeNames: Record<LanguageCode, string> = {
      'hi': 'हिन्दी',
      'ta': 'தமிழ்',
      'te': 'తెలుగు',
      'bn': 'বাংলা',
      'mr': 'मराठी',
      'gu': 'ગુજરાતી',
      'en': 'English'
    };

    return nativeNames[language] || 'Unknown';
  }
}

export default LanguageDetectionService;