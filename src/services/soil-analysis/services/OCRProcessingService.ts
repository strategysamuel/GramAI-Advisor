// OCR Processing Service for Soil Reports
// Extracts text and structured data from soil report images and PDFs
// Enhanced with regional language support for Indian languages

import { OCRResult, SoilReportMetadata } from '../types';

// Regional language mappings for soil parameters
interface RegionalLanguageMapping {
  [language: string]: {
    [parameter: string]: string[];
  };
}

// Regional language patterns for soil parameters
interface RegionalLanguagePatterns {
  [language: string]: {
    [parameter: string]: RegExp[];
  };
}

export default class OCRProcessingService {
  private readonly regionalLanguageMappings: RegionalLanguageMapping;
  private readonly regionalPatterns: RegionalLanguagePatterns;
  private readonly supportedLanguages: string[];

  constructor() {
    this.supportedLanguages = ['en', 'hi', 'ta', 'te', 'bn', 'mr', 'gu'];
    this.regionalLanguageMappings = this.initializeRegionalMappings();
    this.regionalPatterns = this.initializeRegionalPatterns();
  }
  
  /**
   * Process soil report document using OCR with regional language support
   */
  public async processDocument(
    documentBuffer: Buffer,
    metadata: SoilReportMetadata,
    options: {
      language?: string;
      expectedFormat?: 'standard' | 'government' | 'private_lab' | 'university';
      enhanceImage?: boolean;
      enableRegionalLanguageProcessing?: boolean;
    } = {}
  ): Promise<OCRResult> {
    try {
      const startTime = Date.now();
      
      // Set default options
      const processingOptions = {
        language: 'en',
        expectedFormat: 'standard',
        enhanceImage: true,
        enableRegionalLanguageProcessing: true,
        ...options
      };

      // Detect language if not specified
      if (!processingOptions.language || processingOptions.language === 'auto') {
        processingOptions.language = await this.detectDocumentLanguage(documentBuffer);
      }

      console.log(`Processing document in language: ${processingOptions.language}`);

      // Preprocess image if needed
      const processedBuffer = processingOptions.enhanceImage 
        ? await this.enhanceDocumentImage(documentBuffer)
        : documentBuffer;

      // Perform OCR based on document type and language
      const ocrResult = await this.performOCR(processedBuffer, processingOptions);
      
      // Extract structured data from OCR text with regional language support
      const structuredData = await this.extractStructuredData(
        ocrResult.text, 
        processingOptions.expectedFormat,
        processingOptions.language,
        processingOptions.enableRegionalLanguageProcessing
      );

      const processingTime = Date.now() - startTime;

      return {
        extractedText: ocrResult.text,
        confidence: ocrResult.confidence,
        language: ocrResult.language || processingOptions.language,
        structuredData,
        processingTime
      };

    } catch (error) {
      console.error('OCR processing failed:', error);
      throw new Error(`OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Detect document language from buffer content
   */
  private async detectDocumentLanguage(buffer: Buffer): Promise<string> {
    try {
      // In a real implementation, this would use language detection libraries
      // or analyze character patterns to detect Indian languages
      
      const bufferSize = buffer.length;
      console.log(`Detecting language for document of size: ${bufferSize} bytes`);
      
      // Simulate language detection based on buffer characteristics
      // In practice, this would analyze Unicode ranges, script detection, etc.
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // For simulation, randomly select a supported language
      // In real implementation, this would be based on actual text analysis
      const detectedLanguages = ['en', 'hi', 'ta', 'te', 'bn', 'mr', 'gu'];
      const randomIndex = Math.floor(Math.random() * detectedLanguages.length);
      const detectedLanguage = detectedLanguages[randomIndex];
      
      console.log(`Detected language: ${detectedLanguage}`);
      return detectedLanguage;
    } catch (error) {
      console.error('Language detection failed:', error);
      return 'en'; // Default to English
    }
  }
  private async enhanceDocumentImage(buffer: Buffer): Promise<Buffer> {
    try {
      // In a real implementation, this would use image processing libraries
      // to enhance contrast, remove noise, correct skew, etc.
      // For now, we'll simulate the enhancement based on buffer size
      
      const bufferSize = buffer.length;
      console.log(`Enhancing image of size: ${bufferSize} bytes`);
      
      // Simulate image enhancement processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return buffer; // Return enhanced buffer
    } catch (error) {
      console.error('Image enhancement failed:', error);
      return buffer; // Return original if enhancement fails
    }
  }

  /**
   * Perform OCR on the document with regional language support
   */
  private async performOCR(
    buffer: Buffer, 
    options: { language: string; expectedFormat: string }
  ): Promise<{ text: string; confidence: number; language?: string }> {
    try {
      // In a real implementation, this would use OCR libraries like Tesseract.js
      // with language packs for Indian languages, or cloud OCR services
      
      const bufferSize = buffer.length;
      console.log(`Processing OCR for ${options.expectedFormat} format in ${options.language}, buffer size: ${bufferSize} bytes`);
      
      // Simulate OCR processing with language-specific handling
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Generate mock OCR result based on expected format and language
      const mockText = this.generateMockOCRText(options.expectedFormat, options.language);
      
      // Adjust confidence based on language - regional languages might have lower confidence
      let confidence = 0.85;
      if (options.language !== 'en') {
        confidence = 0.75; // Slightly lower confidence for regional languages
      }
      
      return {
        text: mockText,
        confidence,
        language: options.language
      };
    } catch (error) {
      console.error('OCR processing failed:', error);
      throw new Error(`OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate mock OCR text for testing with regional language support
   */
  private generateMockOCRText(format: string, language: string = 'en'): string {
    console.log(`Generating mock OCR text for format: ${format}, language: ${language}`);
    
    if (language !== 'en') {
      return this.generateRegionalLanguageText(format, language);
    }
    
    switch (format) {
      case 'government':
        return `
SOIL HEALTH CARD
Government of India
Ministry of Agriculture & Farmers Welfare

Farmer Name: Test Farmer
Village: Test Village
District: Test District
State: Test State

Sample ID: SHC/2024/001
Date of Collection: 15/01/2024
Date of Analysis: 20/01/2024

SOIL ANALYSIS RESULTS:

pH: 6.8
Electrical Conductivity: 0.45 dS/m
Organic Carbon: 0.65%

AVAILABLE NUTRIENTS:
Nitrogen (N): 245 kg/ha
Phosphorus (P2O5): 18 kg/ha
Potassium (K2O): 156 kg/ha

MICRONUTRIENTS:
Zinc: 0.8 ppm
Iron: 12.5 ppm
Manganese: 8.2 ppm
Copper: 1.2 ppm

RECOMMENDATIONS:
Apply 120 kg Urea, 50 kg DAP, 25 kg MOP per hectare
        `;
        
      case 'private_lab':
        return `
ADVANCED SOIL TESTING LABORATORY
Comprehensive Soil Analysis Report

Lab ID: AST-2024-0156
Sample Received: 18/01/2024
Report Date: 22/01/2024

CLIENT INFORMATION:
Name: Test Farmer
Location: Test Farm, Test District

PHYSICAL PROPERTIES:
Soil Texture: Loamy
Bulk Density: 1.35 g/cm³
Water Holding Capacity: 42%

CHEMICAL ANALYSIS:
pH (1:2.5 H2O): 6.8 ± 0.1
EC (dS/m): 0.45
Organic Matter: 1.12%
CEC: 18.5 cmol/kg

NUTRIENT ANALYSIS:
Available N: 245 kg/ha (Medium)
Available P: 18 kg/ha (Low)
Available K: 156 kg/ha (Medium)

MICRONUTRIENTS:
Zn: 0.8 ppm (Deficient)
Fe: 12.5 ppm (Adequate)
Mn: 8.2 ppm (Adequate)
Cu: 1.2 ppm (Adequate)
B: 0.45 ppm (Low)
S: 8.5 ppm (Low)
        `;
        
      case 'university':
        return `
UNIVERSITY AGRICULTURAL RESEARCH CENTER
Soil Testing Laboratory

Report No: UARC/ST/2024/089
Analysis Date: 25/01/2024

SAMPLE DETAILS:
Farmer: Test Farmer
Field: Block A, Test Farm
Crop: Rice-Wheat System
Depth: 0-15 cm

SOIL PROPERTIES:
Texture Class: Sandy Loam
pH: 6.8 (Slightly Acidic)
EC: 0.45 dS/m (Normal)
Organic Carbon: 0.65% (Medium)

MACRONUTRIENTS:
Available Nitrogen: 245 kg/ha
Available Phosphorus: 18 kg/ha
Available Potassium: 156 kg/ha

SECONDARY NUTRIENTS:
Calcium: 2.8 meq/100g
Magnesium: 1.2 meq/100g
Sulfur: 8.5 ppm

MICRONUTRIENTS:
Zinc: 0.8 ppm
Iron: 12.5 ppm
Manganese: 8.2 ppm
Copper: 1.2 ppm
Boron: 0.45 ppm

INTERPRETATION:
Soil is moderately fertile with medium organic matter content.
Phosphorus and Zinc levels are below optimal ranges.
        `;
        
      default: // standard
        return `
SOIL TEST REPORT

Sample ID: ST-2024-001
Date: 20/01/2024
Farmer: Test Farmer

pH: 6.8
EC: 0.45 dS/m
Organic Carbon: 0.65%

Nitrogen: 245 kg/ha
Phosphorus: 18 kg/ha
Potassium: 156 kg/ha

Zinc: 0.8 ppm
Iron: 12.5 ppm
        `;
    }
  }

  /**
   * Generate mock OCR text in regional languages
   */
  private generateRegionalLanguageText(format: string, language: string): string {
    console.log(`Generating regional language text for ${language}`);
    
    // Sample text in different Indian languages (transliterated for demonstration)
    // In real implementation, these would be actual Unicode text in respective scripts
    
    const regionalTexts: { [key: string]: { [key: string]: string } } = {
      'hi': { // Hindi
        'government': `
मृदा स्वास्थ्य कार्ड
भारत सरकार
कृषि एवं किसान कल्याण मंत्रालय

किसान का नाम: परीक्षण किसान
गांव: परीक्षण गांव
जिला: परीक्षण जिला
राज्य: परीक्षण राज्य

नमूना संख्या: SHC/2024/001
संग्रह दिनांक: 15/01/2024
विश्लेषण दिनांक: 20/01/2024

मृदा विश्लेषण परिणाम:

पीएच: 6.8
विद्युत चालकता: 0.45 dS/m
कार्बनिक कार्बन: 0.65%

उपलब्ध पोषक तत्व:
नाइट्रोजन (N): 245 kg/ha
फास्फोरस (P2O5): 18 kg/ha
पोटाशियम (K2O): 156 kg/ha

सूक्ष्म पोषक तत्व:
जिंक: 0.8 ppm
आयरन: 12.5 ppm
मैंगनीज: 8.2 ppm
कॉपर: 1.2 ppm
        `,
        'standard': `
मृदा परीक्षण रिपोर्ट

नमूना संख्या: ST-2024-001
दिनांक: 20/01/2024
किसान: परीक्षण किसान

पीएच: 6.8
ईसी: 0.45 dS/m
कार्बनिक कार्बन: 0.65%

नाइट्रोजन: 245 kg/ha
फास्फोरस: 18 kg/ha
पोटाशियम: 156 kg/ha

जिंक: 0.8 ppm
आयरन: 12.5 ppm
        `
      },
      'ta': { // Tamil
        'government': `
மண் ஆரோக்கிய அட்டை
இந்திய அரசு
வேளாண்மை மற்றும் விவசாயிகள் நல அமைச்சகம்

விவசாயி பெயர்: சோதனை விவசாயி
கிராமம்: சோதனை கிராமம்
மாவட்டம்: சோதனை மாவட்டம்
மாநிலம்: சோதனை மாநிலம்

மாதிரி எண்: SHC/2024/001
சேகரிப்பு தேதி: 15/01/2024
பகுப்பாய்வு தேதி: 20/01/2024

மண் பகுப்பாய்வு முடிவுகள்:

பிஎச்: 6.8
மின் கடத்துத்திறன்: 0.45 dS/m
கரிம கார்பன்: 0.65%

கிடைக்கும் ஊட்டச்சத்துக்கள்:
நைட்ரஜன் (N): 245 kg/ha
பாஸ்பரஸ் (P2O5): 18 kg/ha
பொட்டாசியம் (K2O): 156 kg/ha

நுண் ஊட்டச்சத்துக்கள்:
துத்தநாகம்: 0.8 ppm
இரும்பு: 12.5 ppm
மாங்கனீசு: 8.2 ppm
செம்பு: 1.2 ppm
        `,
        'standard': `
மண் சோதனை அறிக்கை

மாதிரி எண்: ST-2024-001
தேதி: 20/01/2024
விவசாயி: சோதனை விவசாயி

பிஎச்: 6.8
ஈசி: 0.45 dS/m
கரிம கார்பன்: 0.65%

நைட்ரஜன்: 245 kg/ha
பாஸ்பரஸ்: 18 kg/ha
பொட்டாசியம்: 156 kg/ha

துத்தநாகம்: 0.8 ppm
இரும்பு: 12.5 ppm
        `
      },
      'te': { // Telugu
        'government': `
మట్టి ఆరోగ్య కార్డు
భారత ప్రభుత్వం
వ్యవసాయం మరియు రైతు సంక్షేమ మంత్రిత్వ శాఖ

రైతు పేరు: పరీక్ష రైతు
గ్రామం: పరీక్ష గ్రామం
జిల్లా: పరీక్ష జిల్లా
రాష్ట్రం: పరీక్ష రాష్ట్రం

నమూనా సంఖ్య: SHC/2024/001
సేకరణ తేదీ: 15/01/2024
విశ్లేషణ తేదీ: 20/01/2024

మట్టి విశ్లేషణ ఫలితాలు:

పిహెచ్: 6.8
విద్యుత్ వాహకత: 0.45 dS/m
కార్బనిక కార్బన్: 0.65%

అందుబాటులో ఉన్న పోషకాలు:
నైట్రోజన్ (N): 245 kg/ha
ఫాస్పరస్ (P2O5): 18 kg/ha
పొటాషియం (K2O): 156 kg/ha

సూక్ష్మ పోషకాలు:
జింక్: 0.8 ppm
ఐరన్: 12.5 ppm
మాంగనీస్: 8.2 ppm
కాపర్: 1.2 ppm
        `,
        'standard': `
మట్టి పరీక్ష నివేదిక

నమూనా సంఖ్య: ST-2024-001
తేదీ: 20/01/2024
రైతు: పరీక్ష రైతు

పిహెచ్: 6.8
ఈసి: 0.45 dS/m
కార్బనిక కార్బన్: 0.65%

నైట్రోజన్: 245 kg/ha
ఫాస్పరస్: 18 kg/ha
పొటాషియం: 156 kg/ha

జింక్: 0.8 ppm
ఐరన్: 12.5 ppm
        `
      }
    };

    const languageTexts = regionalTexts[language];
    if (!languageTexts) {
      // Fallback to English if language not supported
      return this.generateMockOCRText(format, 'en');
    }

    return languageTexts[format] || languageTexts['standard'] || this.generateMockOCRText(format, 'en');
  }
  /**
   * Extract structured data from OCR text with regional language support
   */
  private async extractStructuredData(
    text: string, 
    format: string,
    language: string = 'en',
    enableRegionalProcessing: boolean = true
  ): Promise<OCRResult['structuredData']> {
    try {
      const parameters: Array<{
        name: string;
        value: string;
        unit?: string;
        confidence: number;
      }> = [];

      const metadata: {
        laboratoryName?: string;
        reportDate?: string;
        sampleId?: string;
        farmerName?: string;
      } = {};

      // Use regional patterns if enabled and language is supported
      let parameterPatterns: Array<{ name: string; pattern: RegExp; unit: string }>;
      
      if (enableRegionalProcessing && language !== 'en' && this.regionalPatterns[language]) {
        parameterPatterns = this.getRegionalParameterPatterns(language);
        console.log(`Using regional patterns for language: ${language}`);
      } else {
        parameterPatterns = this.getEnglishParameterPatterns();
        console.log(`Using English patterns for language: ${language}`);
      }

      // Extract parameters using appropriate patterns
      for (const pattern of parameterPatterns) {
        const match = text.match(pattern.pattern);
        if (match && match[1]) {
          parameters.push({
            name: pattern.name,
            value: match[1],
            unit: pattern.unit,
            confidence: language === 'en' ? 0.8 : 0.7 // Slightly lower confidence for regional languages
          });
        }
      }

      // Extract metadata using regional patterns if available
      const metadataPatterns = this.getMetadataPatterns(language);
      for (const pattern of metadataPatterns) {
        const match = text.match(pattern.pattern);
        if (match && match[1]) {
          metadata[pattern.key as keyof typeof metadata] = match[1].trim();
        }
      }

      console.log(`Extracted ${parameters.length} parameters in ${language}`);

      return {
        parameters,
        metadata
      };

    } catch (error) {
      console.error('Structured data extraction failed:', error);
      return undefined;
    }
  }

  /**
   * Validate OCR results
   */
  public validateOCRResult(result: OCRResult): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!result.extractedText || result.extractedText.trim().length === 0) {
      issues.push('No text extracted from document');
    }

    if (result.confidence < 0.5) {
      issues.push('OCR confidence is very low - document may be unclear');
    }

    if (!result.structuredData || !result.structuredData.parameters || result.structuredData.parameters.length === 0) {
      issues.push('No structured data could be extracted');
    }

    if (result.structuredData?.parameters) {
      const lowConfidenceParams = result.structuredData.parameters.filter(p => p.confidence < 0.6);
      if (lowConfidenceParams.length > 0) {
        issues.push(`Low confidence in extracting: ${lowConfidenceParams.map(p => p.name).join(', ')}`);
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Get OCR processing recommendations
   */
  public getOCRRecommendations(result: OCRResult): string[] {
    const recommendations: string[] = [];

    if (result.confidence < 0.7) {
      recommendations.push('Consider retaking the photo with better lighting and focus');
      recommendations.push('Ensure the document is flat and all text is clearly visible');
    }

    if (result.processingTime > 5000) {
      recommendations.push('Large document detected - consider splitting into smaller sections for faster processing');
    }

    if (!result.structuredData?.parameters || result.structuredData.parameters.length < 3) {
      recommendations.push('Few parameters detected - ensure the soil report contains standard test results');
    }

    if (result.language !== 'en' && result.confidence < 0.8) {
      recommendations.push('Regional language document detected - OCR accuracy may be lower');
    }

    return recommendations;
  }

  /**
   * Support multiple document formats
   */
  public async processMultiplePages(
    documentBuffers: Buffer[],
    metadata: SoilReportMetadata,
    options: {
      language?: string;
      expectedFormat?: 'standard' | 'government' | 'private_lab' | 'university';
      combineResults?: boolean;
    } = {}
  ): Promise<OCRResult[]> {
    try {
      const results: OCRResult[] = [];
      
      console.log(`Processing ${documentBuffers.length} pages for farmer: ${metadata.farmerId}`);

      for (let i = 0; i < documentBuffers.length; i++) {
        const pageResult = await this.processDocument(documentBuffers[i], metadata, options);
        results.push(pageResult);
      }

      return results;
    } catch (error) {
      console.error('Multi-page OCR processing failed:', error);
      throw error;
    }
  }

  /**
   * Initialize regional language mappings for soil parameters
   */
  private initializeRegionalMappings(): RegionalLanguageMapping {
    return {
      'hi': { // Hindi
        'pH': ['पीएच', 'ph', 'अम्लता'],
        'nitrogen': ['नाइट्रोजन', 'नत्रजन', 'N'],
        'phosphorus': ['फास्फोरस', 'स्फुर', 'P', 'P2O5'],
        'potassium': ['पोटाशियम', 'पोटाश', 'K', 'K2O'],
        'zinc': ['जिंक', 'जस्ता', 'Zn'],
        'iron': ['आयरन', 'लोहा', 'Fe'],
        'manganese': ['मैंगनीज', 'Mn'],
        'copper': ['कॉपर', 'तांबा', 'Cu']
      },
      'ta': { // Tamil
        'pH': ['பிஎச்', 'ph', 'அமிலத்தன்மை'],
        'nitrogen': ['நைட்ரஜன்', 'N'],
        'phosphorus': ['பாஸ்பரஸ்', 'P', 'P2O5'],
        'potassium': ['பொட்டாசியம்', 'K', 'K2O'],
        'zinc': ['துத்தநாகம்', 'Zn'],
        'iron': ['இரும்பு', 'Fe'],
        'manganese': ['மாங்கனீசு', 'Mn'],
        'copper': ['செம்பு', 'Cu']
      },
      'te': { // Telugu
        'pH': ['పిహెచ్', 'ph', 'ఆమ్లత్వం'],
        'nitrogen': ['నైట్రోజన్', 'N'],
        'phosphorus': ['ఫాస్పరస్', 'P', 'P2O5'],
        'potassium': ['పొటాషియం', 'K', 'K2O'],
        'zinc': ['జింక్', 'Zn'],
        'iron': ['ఐరన్', 'Fe'],
        'manganese': ['మాంగనీస్', 'Mn'],
        'copper': ['కాపర్', 'Cu']
      },
      'bn': { // Bengali
        'pH': ['পিএইচ', 'ph', 'অম্লতা'],
        'nitrogen': ['নাইট্রোজেন', 'N'],
        'phosphorus': ['ফসফরাস', 'P', 'P2O5'],
        'potassium': ['পটাশিয়াম', 'K', 'K2O'],
        'zinc': ['জিঙ্ক', 'Zn'],
        'iron': ['আয়রন', 'Fe'],
        'manganese': ['ম্যাঙ্গানিজ', 'Mn'],
        'copper': ['কপার', 'Cu']
      },
      'mr': { // Marathi
        'pH': ['पीएच', 'ph', 'आम्लता'],
        'nitrogen': ['नायट्रोजन', 'N'],
        'phosphorus': ['फॉस्फरस', 'P', 'P2O5'],
        'potassium': ['पोटॅशियम', 'K', 'K2O'],
        'zinc': ['झिंक', 'Zn'],
        'iron': ['आयर्न', 'Fe'],
        'manganese': ['मॅंगनीज', 'Mn'],
        'copper': ['कॉपर', 'Cu']
      },
      'gu': { // Gujarati
        'pH': ['પીએચ', 'ph', 'અમ્લતા'],
        'nitrogen': ['નાઇટ્રોજન', 'N'],
        'phosphorus': ['ફોસ્ફરસ', 'P', 'P2O5'],
        'potassium': ['પોટેશિયમ', 'K', 'K2O'],
        'zinc': ['ઝિંક', 'Zn'],
        'iron': ['આયર્ન', 'Fe'],
        'manganese': ['મેંગેનીઝ', 'Mn'],
        'copper': ['કોપર', 'Cu']
      }
    };
  }

  /**
   * Initialize regional language patterns for parameter extraction
   */
  private initializeRegionalPatterns(): RegionalLanguagePatterns {
    const patterns: RegionalLanguagePatterns = {};
    
    for (const [language, mappings] of Object.entries(this.regionalLanguageMappings)) {
      patterns[language] = {};
      
      for (const [parameter, terms] of Object.entries(mappings)) {
        patterns[language][parameter] = terms.map(term => 
          new RegExp(`${this.escapeRegExp(term)}[:\\s]*([\\d\\.]+)`, 'gi')
        );
      }
    }
    
    return patterns;
  }

  /**
   * Get regional parameter patterns for a specific language
   */
  private getRegionalParameterPatterns(language: string): Array<{ name: string; pattern: RegExp; unit: string }> {
    const patterns: Array<{ name: string; pattern: RegExp; unit: string }> = [];
    const languagePatterns = this.regionalPatterns[language];
    
    if (!languagePatterns) {
      return this.getEnglishParameterPatterns();
    }

    // Map regional patterns to standard parameter names with units
    const parameterUnits: { [key: string]: string } = {
      'pH': '',
      'nitrogen': 'kg/ha',
      'phosphorus': 'kg/ha',
      'potassium': 'kg/ha',
      'zinc': 'ppm',
      'iron': 'ppm',
      'manganese': 'ppm',
      'copper': 'ppm'
    };

    for (const [parameter, regexList] of Object.entries(languagePatterns)) {
      for (const regex of regexList) {
        patterns.push({
          name: this.capitalizeFirst(parameter),
          pattern: regex,
          unit: parameterUnits[parameter] || ''
        });
      }
    }

    return patterns;
  }

  /**
   * Get English parameter patterns (fallback)
   */
  private getEnglishParameterPatterns(): Array<{ name: string; pattern: RegExp; unit: string }> {
    return [
      { name: 'pH', pattern: /pH[:\s]*(\d+\.?\d*)/i, unit: '' },
      { name: 'Electrical Conductivity', pattern: /EC[:\s]*(\d+\.?\d*)\s*(dS\/m|ds\/m)?/i, unit: 'dS/m' },
      { name: 'Organic Carbon', pattern: /Organic Carbon[:\s]*(\d+\.?\d*)\s*%?/i, unit: '%' },
      { name: 'Nitrogen', pattern: /(?:Available\s+)?Nitrogen[:\s]*(\d+\.?\d*)\s*(?:kg\/ha)?/i, unit: 'kg/ha' },
      { name: 'Phosphorus', pattern: /(?:Available\s+)?Phosphorus[:\s]*(\d+\.?\d*)\s*(?:kg\/ha)?/i, unit: 'kg/ha' },
      { name: 'Potassium', pattern: /(?:Available\s+)?Potassium[:\s]*(\d+\.?\d*)\s*(?:kg\/ha)?/i, unit: 'kg/ha' },
      { name: 'Zinc', pattern: /Zinc[:\s]*(\d+\.?\d*)\s*(?:ppm)?/i, unit: 'ppm' },
      { name: 'Iron', pattern: /Iron[:\s]*(\d+\.?\d*)\s*(?:ppm)?/i, unit: 'ppm' },
      { name: 'Manganese', pattern: /Manganese[:\s]*(\d+\.?\d*)\s*(?:ppm)?/i, unit: 'ppm' },
      { name: 'Copper', pattern: /Copper[:\s]*(\d+\.?\d*)\s*(?:ppm)?/i, unit: 'ppm' },
      { name: 'Boron', pattern: /Boron[:\s]*(\d+\.?\d*)\s*(?:ppm)?/i, unit: 'ppm' },
      { name: 'Sulfur', pattern: /Sulfur[:\s]*(\d+\.?\d*)\s*(?:ppm)?/i, unit: 'ppm' }
    ];
  }

  /**
   * Get metadata extraction patterns for different languages
   */
  private getMetadataPatterns(language: string): Array<{ key: string; pattern: RegExp }> {
    const englishPatterns = [
      { key: 'sampleId', pattern: /(?:Sample ID|Lab ID|Report No)[:\s]*([A-Z0-9\/\-]+)/i },
      { key: 'reportDate', pattern: /(?:Date|Report Date|Analysis Date)[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i },
      { key: 'farmerName', pattern: /(?:Farmer|Name)[:\s]*([A-Za-z\s]+)/i },
      { key: 'laboratoryName', pattern: /(SOIL HEALTH CARD|ADVANCED SOIL TESTING|UNIVERSITY AGRICULTURAL)/i }
    ];

    // Regional language metadata patterns
    const regionalPatterns: { [key: string]: Array<{ key: string; pattern: RegExp }> } = {
      'hi': [
        { key: 'sampleId', pattern: /(?:नमूना संख्या|लैब आईडी)[:\s]*([A-Z0-9\/\-]+)/i },
        { key: 'reportDate', pattern: /(?:दिनांक|विश्लेषण दिनांक)[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i },
        { key: 'farmerName', pattern: /(?:किसान का नाम|नाम)[:\s]*([A-Za-z\s]+)/i },
        { key: 'laboratoryName', pattern: /(मृदा स्वास्थ्य कार्ड|उन्नत मृदा परीक्षण)/i }
      ],
      'ta': [
        { key: 'sampleId', pattern: /(?:மாதிரி எண்|ஆய்வக ஐடி)[:\s]*([A-Z0-9\/\-]+)/i },
        { key: 'reportDate', pattern: /(?:தேதி|பகுப்பாய்வு தேதி)[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i },
        { key: 'farmerName', pattern: /(?:விவசாயி பெயர்|பெயர்)[:\s]*([A-Za-z\s]+)/i },
        { key: 'laboratoryName', pattern: /(மண் ஆரோக்கிய அட்டை|மேம்பட்ட மண் சோதனை)/i }
      ],
      'te': [
        { key: 'sampleId', pattern: /(?:నమూనా సంఖ్య|ల్యాబ్ ఐడి)[:\s]*([A-Z0-9\/\-]+)/i },
        { key: 'reportDate', pattern: /(?:తేదీ|విశ్లేషణ తేదీ)[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i },
        { key: 'farmerName', pattern: /(?:రైతు పేరు|పేరు)[:\s]*([A-Za-z\s]+)/i },
        { key: 'laboratoryName', pattern: /(మట్టి ఆరోగ్య కార్డు|అధునాతన మట్టి పరీక్ష)/i }
      ]
    };

    return regionalPatterns[language] || englishPatterns;
  }

  /**
   * Helper method to escape special regex characters
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Helper method to capitalize first letter
   */
  private capitalizeFirst(string: string): string {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
}