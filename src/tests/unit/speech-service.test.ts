import SpeechService, { 
  LanguageCode, 
  TranscriptionResult, 
  QualityMetrics, 
  VoiceConfig,
  VoiceCommand,
  VoiceCommandResult,
  AudioConversionOptions,
  AudioOptimizationResult,
  AudioFormat
} from '../../services/speech';

describe('SpeechService', () => {
  let speechService: SpeechService;
  let mockAudioData: Buffer;

  beforeEach(() => {
    speechService = new SpeechService();
    // Create mock audio data (simulating 1 second of audio at 16kHz)
    mockAudioData = Buffer.alloc(16000 * 2); // 16kHz * 2 bytes per sample
  });

  describe('speechToText', () => {
    it('should successfully transcribe audio for supported languages', async () => {
      const supportedLanguages: LanguageCode[] = ['hi', 'ta', 'te', 'bn', 'mr', 'gu', 'en'];
      
      for (const language of supportedLanguages) {
        const result = await speechService.speechToText(mockAudioData, language);
        
        expect(result).toBeDefined();
        expect(result.text).toBeTruthy();
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
        expect(result.language).toBe(language);
        expect(typeof result.text).toBe('string');
        expect(result.text.length).toBeGreaterThan(0);
      }
    });

    it('should throw error for empty audio data', async () => {
      const emptyBuffer = Buffer.alloc(0);
      
      await expect(speechService.speechToText(emptyBuffer, 'en'))
        .rejects.toThrow('Audio data is required');
    });

    it('should throw error for unsupported language', async () => {
      await expect(speechService.speechToText(mockAudioData, 'fr' as LanguageCode))
        .rejects.toThrow('Language fr is not supported');
    });
  });

  describe('textToSpeech', () => {
    it('should successfully convert text to speech for supported languages', async () => {
      const supportedLanguages: LanguageCode[] = ['hi', 'ta', 'te', 'bn', 'mr', 'gu', 'en'];
      const testText = 'Hello, this is a test message';
      
      for (const language of supportedLanguages) {
        const result = await speechService.textToSpeech(testText, language);
        
        expect(result).toBeDefined();
        expect(result.data).toBeInstanceOf(Buffer);
        expect(result.data.length).toBeGreaterThan(0);
        expect(result.format).toBe('wav');
        expect(result.sampleRate).toBe(22050);
        expect(result.channels).toBe(1);
      }
    });

    it('should throw error for empty text', async () => {
      await expect(speechService.textToSpeech('', 'en'))
        .rejects.toThrow('Text is required for speech synthesis');
    });
  });

  describe('processVoiceCommand', () => {
    it('should successfully process voice commands in supported languages', async () => {
      const supportedLanguages: LanguageCode[] = ['hi', 'ta', 'te', 'bn', 'mr', 'gu', 'en'];
      
      for (const language of supportedLanguages) {
        const result = await speechService.processVoiceCommand(mockAudioData, language);
        
        expect(result).toBeDefined();
        expect(typeof result.success).toBe('boolean');
        expect(result.command).toBeDefined();
        expect(result.response).toBeTruthy();
        expect(result.command.language).toBe(language);
      }
    });

    it('should return successful result for high confidence transcription', async () => {
      const result = await speechService.processVoiceCommand(mockAudioData, 'en');
      
      expect(result.success).toBe(true);
      expect(result.command.confidence).toBeGreaterThanOrEqual(0.5);
      expect(result.audioResponse).toBeDefined();
      expect(result.audioResponse!.data).toBeInstanceOf(Buffer);
    });

    it('should handle voice command processing errors', async () => {
      const invalidAudioData = Buffer.alloc(0);
      
      const result = await speechService.processVoiceCommand(invalidAudioData, 'en');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.response).toContain('error processing');
    });
  });

  describe('convertAudioFormat', () => {
    it('should convert audio between supported formats', async () => {
      const conversionOptions: AudioConversionOptions = {
        targetFormat: 'mp3',
        targetSampleRate: 16000,
        targetChannels: 1,
        quality: 'medium'
      };
      
      const result = await speechService.convertAudioFormat(mockAudioData, 'wav', conversionOptions);
      
      expect(result).toBeDefined();
      expect(result.data).toBeInstanceOf(Buffer);
      expect(result.format).toBe('mp3');
      expect(result.sampleRate).toBe(16000);
      expect(result.channels).toBe(1);
    });

    it('should handle empty audio data', async () => {
      const conversionOptions: AudioConversionOptions = {
        targetFormat: 'mp3'
      };
      
      await expect(speechService.convertAudioFormat(Buffer.alloc(0), 'wav', conversionOptions))
        .rejects.toThrow('Audio data is required for format conversion');
    });
  });

  describe('optimizeAudio', () => {
    it('should optimize audio and return optimization metrics', async () => {
      const result = await speechService.optimizeAudio(mockAudioData, 'wav');
      
      expect(result).toBeDefined();
      expect(result.originalSize).toBe(mockAudioData.length);
      expect(result.optimizedSize).toBeLessThanOrEqual(result.originalSize);
      expect(result.compressionRatio).toBeGreaterThanOrEqual(1);
      expect(result.qualityScore).toBeGreaterThanOrEqual(0);
      expect(result.qualityScore).toBeLessThanOrEqual(100);
      expect(result.optimizedAudio.data).toBeInstanceOf(Buffer);
    });
  });

  describe('getOptimalAudioFormat', () => {
    it('should return optimal format for speech recognition', () => {
      const options = speechService.getOptimalAudioFormat('speech_recognition');
      
      expect(options.targetFormat).toBe('wav');
      expect(options.targetSampleRate).toBe(16000);
      expect(options.targetChannels).toBe(1);
      expect(options.quality).toBe('high');
      expect(options.compression).toBe(false);
    });
  });

  describe('detectAudioQuality', () => {
    it('should return quality metrics for audio data', async () => {
      const metrics = await speechService.detectAudioQuality(mockAudioData);
      
      expect(metrics).toBeDefined();
      expect(typeof metrics.signalToNoiseRatio).toBe('number');
      expect(typeof metrics.clarity).toBe('number');
      expect(typeof metrics.volume).toBe('number');
      expect(typeof metrics.isAcceptable).toBe('boolean');
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return array of supported languages', () => {
      const languages = speechService.getSupportedLanguages();
      
      expect(Array.isArray(languages)).toBe(true);
      expect(languages).toContain('hi');
      expect(languages).toContain('ta');
      expect(languages).toContain('te');
      expect(languages).toContain('bn');
      expect(languages).toContain('mr');
      expect(languages).toContain('gu');
      expect(languages).toContain('en');
      expect(languages.length).toBe(7);
    });
  });
});