declare module 'sentiment' {
  interface SentimentResult {
    score: number;
    comparative: number;
    calculation?: Array<{ [word: string]: number }>;
    positive: string[];
    negative: string[];
    tokens: string[];
    words: string[];
  }

  interface SentimentOptions {
    extras?: { [word: string]: number };
    language?: string;
  }

  class Sentiment {
    constructor();
    analyze(phrase: string, options?: SentimentOptions): SentimentResult;
    registerLanguage(languageCode: string, language: object): void;
  }

  export = Sentiment;
}
