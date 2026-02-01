// Technical Term Explanation Service
// Provides farmer-friendly explanations of agricultural and technical terms

import { LanguageCode } from '../../../shared/types';
import TranslationService from './TranslationService';

export interface TermExplanation {
  term: string;
  language: LanguageCode;
  definition: string;
  simpleExplanation: string;
  examples: string[];
  relatedTerms: string[];
  category: TermCategory;
  difficulty: 'basic' | 'intermediate' | 'advanced';
  visualAids?: {
    imageUrl?: string;
    videoUrl?: string;
    diagramUrl?: string;
  };
}

export interface TermSearchResult {
  term: string;
  explanation: TermExplanation;
  confidence: number;
  alternativeTerms?: string[];
}

export type TermCategory = 
  | 'crops'
  | 'soil'
  | 'fertilizers'
  | 'pesticides'
  | 'irrigation'
  | 'machinery'
  | 'weather'
  | 'market'
  | 'finance'
  | 'government_schemes'
  | 'organic_farming'
  | 'technology'
  | 'general';

class TechnicalTermExplanationService {
  private translationService: TranslationService;
  private termDatabase: Map<string, TermExplanation>;
  private termAliases: Map<string, string>; // Maps alternative names to main terms

  constructor() {
    this.translationService = new TranslationService();
    this.termDatabase = new Map();
    this.termAliases = new Map();
    this.initializeTermDatabase();
  }

  private initializeTermDatabase(): void {
    const terms: TermExplanation[] = [
      // Soil Terms
      {
        term: 'pH',
        language: 'hi',
        definition: 'मिट्टी की अम्लता या क्षारीयता को मापने का पैमाना',
        simpleExplanation: 'यह बताता है कि आपकी मिट्टी खट्टी है या मीठी। 7 से कम खट्टी, 7 से ज्यादा मीठी होती है।',
        examples: [
          'धान के लिए 5.5-6.5 pH अच्छी होती है',
          'गेहूं के लिए 6.0-7.5 pH उपयुक्त है',
          'नींबू की खेती के लिए 5.5-6.5 pH चाहिए'
        ],
        relatedTerms: ['अम्लता', 'क्षारीयता', 'मिट्टी परीक्षण'],
        category: 'soil',
        difficulty: 'intermediate'
      },
      {
        term: 'NPK',
        language: 'hi',
        definition: 'नाइट्रोजन (N), फास्फोरस (P), और पोटाश (K) - तीन मुख्य पोषक तत्व',
        simpleExplanation: 'यह तीन मुख्य खाद हैं जो पौधों को चाहिए। N पत्तियों के लिए, P जड़ों के लिए, K फलों के लिए।',
        examples: [
          '10:26:26 का मतलब 10% नाइट्रोजन, 26% फास्फोरस, 26% पोटाश',
          'धान के लिए 120:60:40 NPK की जरूरत होती है',
          'सब्जियों के लिए 100:50:50 NPK उपयुक्त है'
        ],
        relatedTerms: ['यूरिया', 'DAP', 'MOP', 'उर्वरक'],
        category: 'fertilizers',
        difficulty: 'basic'
      },
      {
        term: 'ड्रिप इरिगेशन',
        language: 'hi',
        definition: 'बूंद-बूंद करके पानी देने की तकनीक',
        simpleExplanation: 'यह एक पाइप सिस्टम है जो पौधों की जड़ों में धीरे-धीरे पानी देता है। पानी की बचत होती है।',
        examples: [
          'टमाटर की खेती में 40% पानी की बचत',
          'अंगूर के बागों में बहुत उपयोगी',
          'सब्जियों की खेती के लिए बेहतरीन'
        ],
        relatedTerms: ['स्प्रिंकलर', 'सिंचाई', 'जल संरक्षण'],
        category: 'irrigation',
        difficulty: 'intermediate'
      },
      {
        term: 'IPM',
        language: 'hi',
        definition: 'एकीकृत कीट प्रबंधन - कीटों को नियंत्रित करने का संयुक्त तरीका',
        simpleExplanation: 'यह कीटों से बचने के लिए कई तरीकों का इस्तेमाल करता है - जैविक, रासायनिक, और प्राकृतिक।',
        examples: [
          'नीम का तेल + फेरोमोन ट्रैप + लाभकारी कीट',
          'फसल चक्र + साफ-सफाई + जैविक कीटनाशक',
          'प्रकाश जाल + चिपचिपे जाल + प्राकृतिक शत्रु'
        ],
        relatedTerms: ['जैविक नियंत्रण', 'फेरोमोन ट्रैप', 'प्राकृतिक कीटनाशक'],
        category: 'pesticides',
        difficulty: 'advanced'
      },
      {
        term: 'वर्मी कम्पोस्ट',
        language: 'hi',
        definition: 'केंचुओं की मदद से बनाई गई जैविक खाद',
        simpleExplanation: 'यह केंचुए के द्वारा गोबर और कचरे को खाद में बदलने की प्रक्रिया है। बहुत अच्छी खाद मिलती है।',
        examples: [
          'गाय के गोबर + केंचुए = वर्मी कम्पोस्ट',
          'सब्जी के छिलके भी इस्तेमाल कर सकते हैं',
          '3 महीने में तैयार हो जाती है'
        ],
        relatedTerms: ['जैविक खाद', 'केंचुआ', 'कम्पोस्ट'],
        category: 'organic_farming',
        difficulty: 'basic'
      },
      {
        term: 'हाइब्रिड बीज',
        language: 'hi',
        definition: 'दो अलग किस्मों को मिलाकर बनाया गया बीज',
        simpleExplanation: 'यह दो अच्छी किस्मों के गुणों को मिलाकर बनाया जाता है। ज्यादा उत्पादन देता है लेकिन अगली बार नया बीज खरीदना पड़ता है।',
        examples: [
          'हाइब्रिड मक्का से 20% ज्यादा उत्पादन',
          'हाइब्रिड टमाटर रोग प्रतिरोधी होते हैं',
          'हाइब्रिड धान कम पानी में उगती है'
        ],
        relatedTerms: ['देसी बीज', 'जेनेटिक', 'उत्पादन'],
        category: 'crops',
        difficulty: 'intermediate'
      },
      {
        term: 'MSP',
        language: 'hi',
        definition: 'न्यूनतम समर्थन मूल्य - सरकार द्वारा तय की गई न्यूनतम कीमत',
        simpleExplanation: 'यह वह कम से कम कीमत है जो सरकार आपकी फसल के लिए देने का वादा करती है। इससे कम में नहीं बेचना पड़ता।',
        examples: [
          'गेहूं का MSP 2023 में ₹2125 प्रति क्विंटल',
          'धान का MSP ₹2040 प्रति क्विंटल',
          'सरकारी मंडी में MSP पर बिकती है फसल'
        ],
        relatedTerms: ['मंडी', 'सरकारी खरीद', 'कीमत'],
        category: 'market',
        difficulty: 'basic'
      },
      {
        term: 'KCC',
        language: 'hi',
        definition: 'किसान क्रेडिट कार्ड - किसानों के लिए विशेष लोन कार्ड',
        simpleExplanation: 'यह एक कार्ड है जिससे आप खेती के लिए आसानी से लोन ले सकते हैं। कम ब्याज दर पर मिलता है।',
        examples: [
          '3 लाख तक का लोन बिना गारंटी',
          '7% ब्याज दर (सब्सिडी के साथ 4%)',
          'बीज, खाद, दवा खरीदने के लिए इस्तेमाल करें'
        ],
        relatedTerms: ['कृषि लोन', 'बैंक', 'ब्याज दर'],
        category: 'finance',
        difficulty: 'basic'
      },
      {
        term: 'जैविक खेती',
        language: 'hi',
        definition: 'रासायनिक खाद और दवा के बिना खेती करना',
        simpleExplanation: 'यह प्राकृतिक तरीकों से खेती करने का तरीका है। केवल गोबर की खाद, नीम, और प्राकृतिक चीजों का इस्तेमाल।',
        examples: [
          'गोबर की खाद + नीम का तेल + जैविक बीज',
          'जैविक सब्जियों की अच्छी कीमत मिलती है',
          'मिट्टी की सेहत अच्छी रहती है'
        ],
        relatedTerms: ['प्राकृतिक खेती', 'वर्मी कम्पोस्ट', 'नीम'],
        category: 'organic_farming',
        difficulty: 'intermediate'
      },
      {
        term: 'फसल बीमा',
        language: 'hi',
        definition: 'फसल के नुकसान की भरपाई के लिए बीमा',
        simpleExplanation: 'यह एक सुरक्षा है। अगर मौसम खराब होने से फसल खराब हो जाए तो बीमा कंपनी पैसा देती है।',
        examples: [
          'PMFBY योजना के तहत 2% प्रीमियम',
          'ओलावृष्टि से नुकसान की भरपाई',
          'सूखे से फसल खराब होने पर मुआवजा'
        ],
        relatedTerms: ['PMFBY', 'प्रीमियम', 'मुआवजा'],
        category: 'government_schemes',
        difficulty: 'intermediate'
      }
    ];

    // Add terms to database
    for (const term of terms) {
      this.termDatabase.set(term.term.toLowerCase(), term);
      
      // Add related terms as aliases
      for (const relatedTerm of term.relatedTerms) {
        this.termAliases.set(relatedTerm.toLowerCase(), term.term.toLowerCase());
      }
    }

    // Add common aliases
    this.termAliases.set('पीएच', 'ph');
    this.termAliases.set('एनपीके', 'npk');
    this.termAliases.set('ड्रिप', 'ड्रिप इरिगेशन');
    this.termAliases.set('आईपीएम', 'ipm');
    this.termAliases.set('केसीसी', 'kcc');
    this.termAliases.set('एमएसपी', 'msp');
  }

  // Main method to explain a technical term
  public async explainTerm(term: string, language: LanguageCode = 'hi'): Promise<TermSearchResult | null> {
    const normalizedTerm = term.toLowerCase().trim();
    
    // Direct lookup
    let explanation = this.termDatabase.get(normalizedTerm);
    
    // Try aliases if direct lookup fails
    if (!explanation) {
      const mainTerm = this.termAliases.get(normalizedTerm);
      if (mainTerm) {
        explanation = this.termDatabase.get(mainTerm);
      }
    }

    // Fuzzy search if still not found
    if (!explanation) {
      const fuzzyResult = this.fuzzySearch(normalizedTerm);
      if (fuzzyResult) {
        explanation = fuzzyResult.explanation;
        return {
          term: fuzzyResult.term,
          explanation,
          confidence: fuzzyResult.confidence,
          alternativeTerms: fuzzyResult.alternativeTerms
        };
      }
    }

    if (!explanation) {
      return null;
    }

    // Translate if needed
    if (explanation.language !== language) {
      explanation = await this.translateExplanation(explanation, language);
    }

    return {
      term: explanation.term,
      explanation,
      confidence: 0.9,
      alternativeTerms: explanation.relatedTerms
    };
  }

  // Fuzzy search for similar terms
  private fuzzySearch(searchTerm: string): { term: string; explanation: TermExplanation; confidence: number; alternativeTerms?: string[] } | null {
    const allTerms = Array.from(this.termDatabase.keys());
    const matches: Array<{ term: string; score: number }> = [];

    for (const term of allTerms) {
      const score = this.calculateSimilarity(searchTerm, term);
      if (score > 0.6) {
        matches.push({ term, score });
      }
    }

    if (matches.length === 0) {
      return null;
    }

    // Sort by score and get the best match
    matches.sort((a, b) => b.score - a.score);
    const bestMatch = matches[0];
    const explanation = this.termDatabase.get(bestMatch.term);

    if (!explanation) {
      return null;
    }

    return {
      term: bestMatch.term,
      explanation,
      confidence: bestMatch.score,
      alternativeTerms: matches.slice(1, 4).map(m => m.term)
    };
  }

  // Calculate string similarity using Levenshtein distance
  private calculateSimilarity(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix: number[][] = [];

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (str1.charAt(i - 1) === str2.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    const maxLen = Math.max(len1, len2);
    return maxLen === 0 ? 1 : (maxLen - matrix[len1][len2]) / maxLen;
  }

  // Translate explanation to target language
  private async translateExplanation(explanation: TermExplanation, targetLanguage: LanguageCode): Promise<TermExplanation> {
    if (explanation.language === targetLanguage) {
      return explanation;
    }

    const translatedDefinition = await this.translationService.translateText({
      text: explanation.definition,
      sourceLanguage: explanation.language,
      targetLanguage
    });

    const translatedSimpleExplanation = await this.translationService.translateText({
      text: explanation.simpleExplanation,
      sourceLanguage: explanation.language,
      targetLanguage
    });

    const translatedExamples: string[] = [];
    for (const example of explanation.examples) {
      const result = await this.translationService.translateText({
        text: example,
        sourceLanguage: explanation.language,
        targetLanguage
      });
      translatedExamples.push(result.translatedText);
    }

    const translatedRelatedTerms: string[] = [];
    for (const relatedTerm of explanation.relatedTerms) {
      const result = await this.translationService.translateText({
        text: relatedTerm,
        sourceLanguage: explanation.language,
        targetLanguage
      });
      translatedRelatedTerms.push(result.translatedText);
    }

    return {
      ...explanation,
      language: targetLanguage,
      definition: translatedDefinition.translatedText,
      simpleExplanation: translatedSimpleExplanation.translatedText,
      examples: translatedExamples,
      relatedTerms: translatedRelatedTerms
    };
  }

  // Get terms by category
  public getTermsByCategory(category: TermCategory, language: LanguageCode = 'hi'): TermExplanation[] {
    const terms: TermExplanation[] = [];
    
    for (const explanation of this.termDatabase.values()) {
      if (explanation.category === category) {
        terms.push(explanation);
      }
    }

    return terms;
  }

  // Get terms by difficulty level
  public getTermsByDifficulty(difficulty: 'basic' | 'intermediate' | 'advanced', language: LanguageCode = 'hi'): TermExplanation[] {
    const terms: TermExplanation[] = [];
    
    for (const explanation of this.termDatabase.values()) {
      if (explanation.difficulty === difficulty) {
        terms.push(explanation);
      }
    }

    return terms;
  }

  // Search terms by text content
  public searchTerms(query: string, language: LanguageCode = 'hi'): TermSearchResult[] {
    const results: TermSearchResult[] = [];
    const normalizedQuery = query.toLowerCase();

    for (const [term, explanation] of this.termDatabase.entries()) {
      let score = 0;

      // Check term name
      if (term.includes(normalizedQuery)) {
        score += 1.0;
      }

      // Check definition
      if (explanation.definition.toLowerCase().includes(normalizedQuery)) {
        score += 0.8;
      }

      // Check simple explanation
      if (explanation.simpleExplanation.toLowerCase().includes(normalizedQuery)) {
        score += 0.6;
      }

      // Check examples
      for (const example of explanation.examples) {
        if (example.toLowerCase().includes(normalizedQuery)) {
          score += 0.4;
          break;
        }
      }

      // Check related terms
      for (const relatedTerm of explanation.relatedTerms) {
        if (relatedTerm.toLowerCase().includes(normalizedQuery)) {
          score += 0.3;
          break;
        }
      }

      if (score > 0) {
        results.push({
          term,
          explanation,
          confidence: Math.min(0.95, score),
          alternativeTerms: explanation.relatedTerms
        });
      }
    }

    // Sort by confidence
    results.sort((a, b) => b.confidence - a.confidence);
    
    return results.slice(0, 10); // Return top 10 results
  }

  // Add new term explanation
  public addTermExplanation(explanation: TermExplanation): void {
    const normalizedTerm = explanation.term.toLowerCase();
    this.termDatabase.set(normalizedTerm, explanation);

    // Add related terms as aliases
    for (const relatedTerm of explanation.relatedTerms) {
      this.termAliases.set(relatedTerm.toLowerCase(), normalizedTerm);
    }
  }

  // Get all available categories
  public getAvailableCategories(): TermCategory[] {
    const categories = new Set<TermCategory>();
    
    for (const explanation of this.termDatabase.values()) {
      categories.add(explanation.category);
    }

    return Array.from(categories);
  }

  // Get term count by category
  public getTermCountByCategory(): Record<TermCategory, number> {
    const counts: Partial<Record<TermCategory, number>> = {};
    
    for (const explanation of this.termDatabase.values()) {
      counts[explanation.category] = (counts[explanation.category] || 0) + 1;
    }

    return counts as Record<TermCategory, number>;
  }

  // Generate contextual explanation based on user profile
  public async generateContextualExplanation(
    term: string,
    userProfile: {
      experience: 'beginner' | 'intermediate' | 'expert';
      language: LanguageCode;
      interests: TermCategory[];
    }
  ): Promise<TermSearchResult | null> {
    const result = await this.explainTerm(term, userProfile.language);
    
    if (!result) {
      return null;
    }

    // Adjust explanation based on user experience
    if (userProfile.experience === 'beginner') {
      // Provide more detailed, simple explanation
      result.explanation.simpleExplanation = this.simplifyExplanation(result.explanation.simpleExplanation);
    } else if (userProfile.experience === 'expert') {
      // Provide more technical details
      result.explanation.definition = this.enhanceExplanation(result.explanation.definition);
    }

    return result;
  }

  private simplifyExplanation(explanation: string): string {
    // Add more simple language and examples
    return explanation + ' (यह बहुत आसान है और धीरे-धीरे सीख सकते हैं)';
  }

  private enhanceExplanation(explanation: string): string {
    // Add more technical details for experts
    return explanation + ' (तकनीकी विवरण और उन्नत उपयोग के लिए विशेषज्ञ से सलाह लें)';
  }
}

export default TechnicalTermExplanationService;