import { SentimentAnalysisService, sentimentService } from '../src/services/sentimentService';

describe('SentimentAnalysisService', () => {
  let service: SentimentAnalysisService;

  beforeEach(() => {
    service = new SentimentAnalysisService();
  });

  describe('analyzeRaw', () => {
    it('should return positive score for positive text', () => {
      const result = service.analyzeRaw('I love this product! It is amazing and fantastic!');
      expect(result.score).toBeGreaterThan(0);
      expect(result.positive.length).toBeGreaterThan(0);
    });

    it('should return negative score for negative text', () => {
      const result = service.analyzeRaw('This is terrible and awful. I hate it.');
      expect(result.score).toBeLessThan(0);
      expect(result.negative.length).toBeGreaterThan(0);
    });

    it('should return near-zero score for neutral text', () => {
      const result = service.analyzeRaw('The meeting is scheduled for tomorrow at 3pm.');
      expect(Math.abs(result.score)).toBeLessThan(3);
    });
  });

  describe('analyze', () => {
    it('should categorize positive sentiment correctly', () => {
      const result = service.analyze('This is wonderful! I am so excited about this opportunity!');
      expect(result.overallSentiment).toBe('positive');
      expect(result.sentimentScore).toBeGreaterThan(50);
    });

    it('should categorize negative sentiment correctly', () => {
      const result = service.analyze('I am very disappointed and frustrated with this situation.');
      expect(result.overallSentiment).toBe('negative');
      expect(result.sentimentScore).toBeLessThan(50);
    });

    it('should detect urgency levels', () => {
      const criticalResult = service.analyze('This is urgent! We need this done immediately!');
      expect(criticalResult.urgencyLevel).toBe('critical');

      const lowResult = service.analyze('No rush on this, whenever you get a chance.');
      expect(lowResult.urgencyLevel).toBe('low');
    });

    it('should detect emotional tones', () => {
      const enthusiasticResult = service.analyze('I am so excited and thrilled about this!');
      expect(enthusiasticResult.emotionalTone.primary).toBe('enthusiastic');

      const frustratedResult = service.analyze('I am very frustrated and disappointed.');
      expect(frustratedResult.emotionalTone.primary).toBe('frustrated');
    });

    it('should extract key phrases', () => {
      const result = service.analyze('The customer engagement strategy is showing great improvement in sales metrics.');
      expect(result.keyPhrases.length).toBeGreaterThan(0);
    });

    it('should have confidence score between 0 and 1', () => {
      const result = service.analyze('Some text to analyze');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('compareSentiment', () => {
    it('should detect improving trend', () => {
      const result = service.compareSentiment(
        'I am unhappy with the current situation.',
        'Things have improved dramatically! I am very happy now.'
      );
      expect(result.trend).toBe('improving');
      expect(result.difference).toBeGreaterThan(0);
    });

    it('should detect declining trend', () => {
      const result = service.compareSentiment(
        'Everything is wonderful and amazing!',
        'This is terrible and I am very disappointed.'
      );
      expect(result.trend).toBe('declining');
      expect(result.difference).toBeLessThan(0);
    });

    it('should detect stable trend for similar sentiment', () => {
      const result = service.compareSentiment(
        'The meeting went okay.',
        'The presentation was fine.'
      );
      expect(result.trend).toBe('stable');
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(sentimentService).toBeDefined();
      expect(sentimentService).toBeInstanceOf(SentimentAnalysisService);
    });
  });
});
