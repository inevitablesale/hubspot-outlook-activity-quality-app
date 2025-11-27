import Sentiment = require('sentiment');
import natural from 'natural';
import {
  SentimentResult,
  SentimentInsights,
  SentimentCalculation,
  EmotionalTone,
  KeyPhrase,
} from '../types/analysis';

const sentiment = new Sentiment();
const TfIdf = natural.TfIdf;

/**
 * Urgency indicators for email/meeting content
 */
const URGENCY_INDICATORS = {
  critical: ['urgent', 'emergency', 'immediately', 'asap', 'critical', 'deadline today'],
  high: ['soon', 'priority', 'important', 'deadline', 'time-sensitive', 'pressing'],
  medium: ['when you can', 'follow up', 'reminder', 'checking in'],
  low: ['no rush', 'whenever', 'at your convenience', 'fyi'],
};

/**
 * Emotional tone indicators
 */
const EMOTIONAL_TONES = {
  enthusiastic: ['excited', 'thrilled', 'amazing', 'fantastic', 'love', 'great news'],
  frustrated: ['frustrated', 'disappointed', 'annoyed', 'upset', 'concerned', 'issue'],
  confident: ['certain', 'confident', 'sure', 'definitely', 'absolutely'],
  hesitant: ['maybe', 'perhaps', 'unsure', 'not sure', 'might', 'possibly'],
  appreciative: ['thank', 'grateful', 'appreciate', 'thanks'],
  formal: ['regards', 'sincerely', 'respectfully', 'cordially'],
};

/**
 * Sentiment Analysis Service
 */
export class SentimentAnalysisService {
  /**
   * Analyze text and return raw sentiment result
   */
  analyzeRaw(text: string): SentimentResult {
    const result = sentiment.analyze(text);
    
    // Convert calculation format from sentiment library to our format
    const calculation: SentimentCalculation[] = (result.calculation || []).map(
      (item: { [word: string]: number }) => {
        const word = Object.keys(item)[0] || '';
        const score = item[word] || 0;
        return { word, score };
      }
    );
    
    return {
      score: result.score,
      comparative: result.comparative,
      calculation,
      positive: result.positive || [],
      negative: result.negative || [],
      tokens: result.tokens || [],
      words: result.words || [],
    };
  }

  /**
   * Analyze text and return comprehensive sentiment insights
   */
  analyze(text: string): SentimentInsights {
    const rawResult = this.analyzeRaw(text);
    const normalizedText = text.toLowerCase();

    const overallSentiment = this.categorizeScore(rawResult.comparative);
    const emotionalTone = this.detectEmotionalTone(normalizedText);
    const keyPhrases = this.extractKeyPhrases(text);
    const urgencyLevel = this.detectUrgency(normalizedText);

    // Calculate confidence based on the number of sentiment words found
    const totalWords = rawResult.tokens.length;
    const sentimentWords = rawResult.positive.length + rawResult.negative.length;
    const confidence = totalWords > 0 
      ? Math.min(0.95, 0.5 + (sentimentWords / totalWords) * 2)
      : 0.5;

    return {
      overallSentiment,
      sentimentScore: this.normalizeScore(rawResult.comparative),
      confidence,
      emotionalTone,
      keyPhrases,
      urgencyLevel,
    };
  }

  /**
   * Categorize sentiment score into positive/neutral/negative
   */
  private categorizeScore(comparative: number): 'positive' | 'neutral' | 'negative' {
    if (comparative > 0.1) return 'positive';
    if (comparative < -0.1) return 'negative';
    return 'neutral';
  }

  /**
   * Normalize comparative score to 0-100 scale
   */
  private normalizeScore(comparative: number): number {
    // Comparative typically ranges from -5 to +5
    // Normalize to 0-100 where 50 is neutral
    const normalized = ((comparative + 5) / 10) * 100;
    return Math.max(0, Math.min(100, Math.round(normalized)));
  }

  /**
   * Detect emotional tone from text
   */
  private detectEmotionalTone(text: string): EmotionalTone {
    const toneScores: Record<string, number> = {};
    const foundIndicators: string[] = [];

    for (const [tone, indicators] of Object.entries(EMOTIONAL_TONES)) {
      let score = 0;
      for (const indicator of indicators) {
        if (text.includes(indicator)) {
          score++;
          foundIndicators.push(indicator);
        }
      }
      if (score > 0) {
        toneScores[tone] = score;
      }
    }

    // Find primary tone
    let primaryTone = 'neutral';
    let maxScore = 0;
    for (const [tone, score] of Object.entries(toneScores)) {
      if (score > maxScore) {
        maxScore = score;
        primaryTone = tone;
      }
    }

    return {
      primary: primaryTone,
      intensity: Math.min(1, maxScore / 3),
      indicators: foundIndicators,
    };
  }

  /**
   * Extract key phrases using TF-IDF
   */
  private extractKeyPhrases(text: string): KeyPhrase[] {
    const tfidf = new TfIdf();
    tfidf.addDocument(text);

    const phrases: KeyPhrase[] = [];

    // Get top terms by TF-IDF score
    const termScores: Array<{ term: string; score: number }> = [];
    tfidf.listTerms(0).forEach((item: { term: string; tfidf: number }) => {
      if (item.term.length > 2) {
        termScores.push({ term: item.term, score: item.tfidf });
      }
    });

    // Take top 5 terms
    termScores.slice(0, 5).forEach(({ term, score }) => {
      const termSentiment = sentiment.analyze(term);
      let sentimentCategory: 'positive' | 'neutral' | 'negative' = 'neutral';
      if (termSentiment.score > 0) sentimentCategory = 'positive';
      if (termSentiment.score < 0) sentimentCategory = 'negative';

      phrases.push({
        phrase: term,
        sentiment: sentimentCategory,
        relevance: Math.min(1, score / 10),
      });
    });

    return phrases;
  }

  /**
   * Detect urgency level from text
   */
  private detectUrgency(text: string): 'low' | 'medium' | 'high' | 'critical' {
    for (const indicator of URGENCY_INDICATORS.critical) {
      if (text.includes(indicator)) return 'critical';
    }
    for (const indicator of URGENCY_INDICATORS.high) {
      if (text.includes(indicator)) return 'high';
    }
    for (const indicator of URGENCY_INDICATORS.medium) {
      if (text.includes(indicator)) return 'medium';
    }
    return 'low';
  }

  /**
   * Compare sentiment between two pieces of text
   */
  compareSentiment(text1: string, text2: string): {
    text1Score: number;
    text2Score: number;
    difference: number;
    trend: 'improving' | 'declining' | 'stable';
  } {
    const result1 = this.analyzeRaw(text1);
    const result2 = this.analyzeRaw(text2);
    
    const score1 = this.normalizeScore(result1.comparative);
    const score2 = this.normalizeScore(result2.comparative);
    const difference = score2 - score1;

    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (difference > 5) trend = 'improving';
    if (difference < -5) trend = 'declining';

    return {
      text1Score: score1,
      text2Score: score2,
      difference,
      trend,
    };
  }
}

export const sentimentService = new SentimentAnalysisService();
