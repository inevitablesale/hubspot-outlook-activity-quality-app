/**
 * Sentiment Analysis Result
 */
export interface SentimentResult {
  score: number;           // -5 to +5 scale
  comparative: number;     // Score divided by number of words
  calculation: SentimentCalculation[];
  positive: string[];
  negative: string[];
  tokens: string[];
  words: string[];
}

export interface SentimentCalculation {
  word: string;
  score: number;
}

/**
 * Sentiment Insights derived from analysis
 */
export interface SentimentInsights {
  overallSentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number;
  confidence: number;
  emotionalTone: EmotionalTone;
  keyPhrases: KeyPhrase[];
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface EmotionalTone {
  primary: string;
  intensity: number;
  indicators: string[];
}

export interface KeyPhrase {
  phrase: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  relevance: number;
}

/**
 * Reply Depth Metrics
 */
export interface ReplyDepthMetrics {
  threadLength: number;
  averageResponseTime: number;    // in hours
  responseTimeVariance: number;
  longestGap: number;             // in hours
  shortestGap: number;            // in hours
  participantCount: number;
  initiator: string;
  engagementScore: number;        // 0-100
  conversationVelocity: 'slow' | 'moderate' | 'fast';
}

/**
 * Objection Detection Result
 */
export interface ObjectionDetection {
  hasObjections: boolean;
  objections: Objection[];
  overallObjectionLevel: 'none' | 'mild' | 'moderate' | 'strong';
  suggestedResponses: SuggestedResponse[];
}

export interface Objection {
  type: ObjectionType;
  phrase: string;
  confidence: number;
  context: string;
}

export type ObjectionType = 
  | 'price'
  | 'timing'
  | 'competition'
  | 'authority'
  | 'need'
  | 'trust'
  | 'implementation'
  | 'feature'
  | 'general';

export interface SuggestedResponse {
  objectionType: ObjectionType;
  response: string;
  confidence: number;
}

/**
 * Activity Quality Score
 */
export interface ActivityQualityScore {
  overallScore: number;           // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  breakdown: ScoreBreakdown;
  factors: QualityFactor[];
  trend: 'improving' | 'stable' | 'declining';
  recommendations: string[];
}

export interface ScoreBreakdown {
  engagementScore: number;        // 0-100
  sentimentScore: number;         // 0-100
  responsivenessScore: number;    // 0-100
  depthScore: number;             // 0-100
  qualityScore: number;           // 0-100
}

export interface QualityFactor {
  name: string;
  impact: 'positive' | 'neutral' | 'negative';
  weight: number;
  description: string;
}

/**
 * Next Step Recommendations
 */
export interface NextStepRecommendation {
  priority: 'low' | 'medium' | 'high' | 'critical';
  action: RecommendedAction;
  reasoning: string;
  suggestedTimeline: string;
  confidence: number;
}

export type RecommendedAction = 
  | 'follow_up_call'
  | 'send_email'
  | 'schedule_meeting'
  | 'send_proposal'
  | 'address_objection'
  | 'provide_demo'
  | 'share_case_study'
  | 'escalate'
  | 'nurture'
  | 'close_deal'
  | 're_engage';

/**
 * Complete Activity Analysis Result
 */
export interface ActivityAnalysisResult {
  id: string;
  analyzedAt: string;
  activityType: 'email' | 'meeting';
  qualityScore: ActivityQualityScore;
  sentiment: SentimentInsights;
  replyDepth?: ReplyDepthMetrics;
  objections: ObjectionDetection;
  nextSteps: NextStepRecommendation[];
  metadata: AnalysisMetadata;
}

export interface AnalysisMetadata {
  processingTime: number;
  modelVersion: string;
  confidence: number;
}
