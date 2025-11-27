import { v4 as uuidv4 } from 'uuid';
import {
  ScoreBreakdown,
  QualityFactor,
  SentimentInsights,
  ReplyDepthMetrics,
  ObjectionDetection,
  NextStepRecommendation,
  RecommendedAction,
  ActivityAnalysisResult,
} from '../types/analysis';
import { OutlookEmail, OutlookMeeting } from '../types/outlook';
import { sentimentService } from './sentimentService';
import { objectionService } from './objectionService';

/**
 * Activity Quality Score Calculator
 */
export class ActivityQualityService {
  private readonly MODEL_VERSION = '1.0.0';

  /**
   * Calculate activity quality score for an email
   */
  calculateEmailScore(
    email: OutlookEmail,
    conversationHistory?: OutlookEmail[]
  ): ActivityAnalysisResult {
    const startTime = Date.now();

    // Extract text content for analysis
    const textContent = this.extractEmailText(email);
    
    // Perform sentiment analysis
    const sentiment = sentimentService.analyze(textContent);
    
    // Detect objections
    const objections = objectionService.detect(textContent);
    
    // Calculate reply depth metrics if conversation history available
    const replyDepth = conversationHistory 
      ? this.calculateReplyDepthMetrics(conversationHistory)
      : undefined;

    // Calculate score breakdown
    const breakdown = this.calculateEmailBreakdown(email, sentiment, replyDepth, objections);
    
    // Calculate overall score
    const overallScore = this.calculateOverallScore(breakdown);
    
    // Determine grade
    const grade = this.determineGrade(overallScore);
    
    // Identify quality factors
    const factors = this.identifyQualityFactors(email, sentiment, replyDepth, objections);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(sentiment, objections, replyDepth);
    
    // Determine trend
    const trend = this.determineTrend(conversationHistory);
    
    // Generate next steps
    const nextSteps = this.generateNextSteps(sentiment, objections, replyDepth);

    const processingTime = Date.now() - startTime;

    return {
      id: uuidv4(),
      analyzedAt: new Date().toISOString(),
      activityType: 'email',
      qualityScore: {
        overallScore,
        grade,
        breakdown,
        factors,
        trend,
        recommendations,
      },
      sentiment,
      replyDepth,
      objections,
      nextSteps,
      metadata: {
        processingTime,
        modelVersion: this.MODEL_VERSION,
        confidence: this.calculateConfidence(sentiment, objections),
      },
    };
  }

  /**
   * Calculate activity quality score for a meeting
   */
  calculateMeetingScore(meeting: OutlookMeeting): ActivityAnalysisResult {
    const startTime = Date.now();

    // Extract text content for analysis
    const textContent = this.extractMeetingText(meeting);
    
    // Perform sentiment analysis
    const sentiment = sentimentService.analyze(textContent);
    
    // Detect objections
    const objections = objectionService.detect(textContent);
    
    // Calculate score breakdown
    const breakdown = this.calculateMeetingBreakdown(meeting, sentiment, objections);
    
    // Calculate overall score
    const overallScore = this.calculateOverallScore(breakdown);
    
    // Determine grade
    const grade = this.determineGrade(overallScore);
    
    // Identify quality factors
    const factors = this.identifyMeetingQualityFactors(meeting, sentiment, objections);
    
    // Generate recommendations
    const recommendations = this.generateMeetingRecommendations(meeting, sentiment, objections);
    
    // Generate next steps
    const nextSteps = this.generateNextSteps(sentiment, objections, undefined);

    const processingTime = Date.now() - startTime;

    return {
      id: uuidv4(),
      analyzedAt: new Date().toISOString(),
      activityType: 'meeting',
      qualityScore: {
        overallScore,
        grade,
        breakdown,
        factors,
        trend: 'stable',
        recommendations,
      },
      sentiment,
      objections,
      nextSteps,
      metadata: {
        processingTime,
        modelVersion: this.MODEL_VERSION,
        confidence: this.calculateConfidence(sentiment, objections),
      },
    };
  }

  /**
   * Extract text content from email
   */
  private extractEmailText(email: OutlookEmail): string {
    const parts = [
      email.subject,
      email.body || email.bodyPreview || '',
    ];
    return parts.filter(Boolean).join(' ');
  }

  /**
   * Extract text content from meeting
   */
  private extractMeetingText(meeting: OutlookMeeting): string {
    const parts = [
      meeting.subject,
      meeting.body || meeting.bodyPreview || '',
    ];
    return parts.filter(Boolean).join(' ');
  }

  /**
   * Calculate reply depth metrics
   */
  private calculateReplyDepthMetrics(emails: OutlookEmail[]): ReplyDepthMetrics {
    if (emails.length === 0) {
      return {
        threadLength: 0,
        averageResponseTime: 0,
        responseTimeVariance: 0,
        longestGap: 0,
        shortestGap: 0,
        participantCount: 0,
        initiator: '',
        engagementScore: 0,
        conversationVelocity: 'slow',
      };
    }

    // Sort emails by date
    const sortedEmails = [...emails].sort(
      (a, b) => new Date(a.sentDateTime).getTime() - new Date(b.sentDateTime).getTime()
    );

    // Calculate response times
    const responseTimes: number[] = [];
    for (let i = 1; i < sortedEmails.length; i++) {
      const prevTime = new Date(sortedEmails[i - 1].sentDateTime).getTime();
      const currTime = new Date(sortedEmails[i].sentDateTime).getTime();
      const diffHours = (currTime - prevTime) / (1000 * 60 * 60);
      responseTimes.push(diffHours);
    }

    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length
      : 0;

    const variance = responseTimes.length > 0
      ? responseTimes.reduce((sum, t) => sum + Math.pow(t - avgResponseTime, 2), 0) / responseTimes.length
      : 0;

    const longestGap = responseTimes.length > 0 ? Math.max(...responseTimes) : 0;
    const shortestGap = responseTimes.length > 0 ? Math.min(...responseTimes) : 0;

    // Get unique participants
    const participants = new Set<string>();
    sortedEmails.forEach(email => {
      participants.add(email.from.emailAddress.address);
      email.toRecipients.forEach(r => participants.add(r.emailAddress.address));
    });

    // Calculate engagement score
    const engagementScore = this.calculateEngagementScore(
      sortedEmails.length,
      participants.size,
      avgResponseTime
    );

    // Determine conversation velocity
    let velocity: 'slow' | 'moderate' | 'fast' = 'moderate';
    if (avgResponseTime < 2) velocity = 'fast';
    else if (avgResponseTime > 24) velocity = 'slow';

    return {
      threadLength: sortedEmails.length,
      averageResponseTime: Math.round(avgResponseTime * 10) / 10,
      responseTimeVariance: Math.round(variance * 10) / 10,
      longestGap: Math.round(longestGap * 10) / 10,
      shortestGap: Math.round(shortestGap * 10) / 10,
      participantCount: participants.size,
      initiator: sortedEmails[0]?.from.emailAddress.address || '',
      engagementScore,
      conversationVelocity: velocity,
    };
  }

  /**
   * Calculate engagement score
   */
  private calculateEngagementScore(
    threadLength: number,
    participants: number,
    avgResponseTime: number
  ): number {
    let score = 50;

    // Thread length contribution (max 20 points)
    score += Math.min(20, threadLength * 4);

    // Participant contribution (max 15 points)
    score += Math.min(15, (participants - 1) * 5);

    // Response time contribution (max 15 points)
    if (avgResponseTime < 1) score += 15;
    else if (avgResponseTime < 4) score += 12;
    else if (avgResponseTime < 12) score += 8;
    else if (avgResponseTime < 24) score += 4;

    return Math.min(100, Math.max(0, Math.round(score)));
  }

  /**
   * Calculate email score breakdown
   */
  private calculateEmailBreakdown(
    email: OutlookEmail,
    sentiment: SentimentInsights,
    replyDepth: ReplyDepthMetrics | undefined,
    objections: ObjectionDetection
  ): ScoreBreakdown {
    // Engagement score based on email properties
    let engagementScore = 60;
    if (email.importance === 'high') engagementScore += 10;
    if (email.hasAttachments) engagementScore += 5;
    if (replyDepth) {
      engagementScore = Math.round((engagementScore + replyDepth.engagementScore) / 2);
    }

    // Sentiment score
    const sentimentScore = sentiment.sentimentScore;

    // Responsiveness score
    let responsivenessScore = 70;
    if (replyDepth) {
      if (replyDepth.averageResponseTime < 2) responsivenessScore = 95;
      else if (replyDepth.averageResponseTime < 8) responsivenessScore = 80;
      else if (replyDepth.averageResponseTime < 24) responsivenessScore = 65;
      else responsivenessScore = 50;
    }

    // Depth score
    let depthScore = 50;
    if (replyDepth) {
      depthScore = Math.min(100, 40 + replyDepth.threadLength * 10);
    }

    // Quality score (inversely affected by objections)
    let qualityScore = 80;
    if (objections.overallObjectionLevel === 'strong') qualityScore = 40;
    else if (objections.overallObjectionLevel === 'moderate') qualityScore = 55;
    else if (objections.overallObjectionLevel === 'mild') qualityScore = 70;

    return {
      engagementScore: Math.round(engagementScore),
      sentimentScore: Math.round(sentimentScore),
      responsivenessScore: Math.round(responsivenessScore),
      depthScore: Math.round(depthScore),
      qualityScore: Math.round(qualityScore),
    };
  }

  /**
   * Calculate meeting score breakdown
   */
  private calculateMeetingBreakdown(
    meeting: OutlookMeeting,
    sentiment: SentimentInsights,
    objections: ObjectionDetection
  ): ScoreBreakdown {
    // Engagement score based on meeting properties
    let engagementScore = 70;
    const attendeeCount = meeting.attendees.length;
    engagementScore += Math.min(20, attendeeCount * 5);

    // Count accepted attendees
    const acceptedCount = meeting.attendees.filter(
      a => a.status?.response === 'accepted'
    ).length;
    if (attendeeCount > 0) {
      engagementScore = Math.round(engagementScore * (acceptedCount / attendeeCount));
    }

    // Sentiment score
    const sentimentScore = sentiment.sentimentScore;

    // Responsiveness score based on response status
    let responsivenessScore = 60;
    const responseRate = attendeeCount > 0
      ? meeting.attendees.filter(a => a.status?.response !== 'notResponded').length / attendeeCount
      : 0;
    responsivenessScore = Math.round(60 + responseRate * 40);

    // Depth score based on meeting duration
    const startTime = new Date(meeting.start.dateTime).getTime();
    const endTime = new Date(meeting.end.dateTime).getTime();
    const durationMinutes = (endTime - startTime) / (1000 * 60);
    let depthScore = 50;
    if (durationMinutes >= 30 && durationMinutes <= 60) depthScore = 80;
    else if (durationMinutes > 60) depthScore = 70;

    // Quality score
    let qualityScore = 75;
    if (meeting.isCancelled) qualityScore = 20;
    if (objections.overallObjectionLevel === 'strong') qualityScore -= 30;
    else if (objections.overallObjectionLevel === 'moderate') qualityScore -= 15;

    return {
      engagementScore: Math.max(0, Math.min(100, Math.round(engagementScore))),
      sentimentScore: Math.round(sentimentScore),
      responsivenessScore: Math.max(0, Math.min(100, Math.round(responsivenessScore))),
      depthScore: Math.max(0, Math.min(100, Math.round(depthScore))),
      qualityScore: Math.max(0, Math.min(100, Math.round(qualityScore))),
    };
  }

  /**
   * Calculate overall score from breakdown
   */
  private calculateOverallScore(breakdown: ScoreBreakdown): number {
    const weights = {
      engagement: 0.25,
      sentiment: 0.20,
      responsiveness: 0.20,
      depth: 0.15,
      quality: 0.20,
    };

    const score =
      breakdown.engagementScore * weights.engagement +
      breakdown.sentimentScore * weights.sentiment +
      breakdown.responsivenessScore * weights.responsiveness +
      breakdown.depthScore * weights.depth +
      breakdown.qualityScore * weights.quality;

    return Math.round(score);
  }

  /**
   * Determine letter grade from score
   */
  private determineGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Identify quality factors for email
   */
  private identifyQualityFactors(
    email: OutlookEmail,
    sentiment: SentimentInsights,
    replyDepth: ReplyDepthMetrics | undefined,
    objections: ObjectionDetection
  ): QualityFactor[] {
    const factors: QualityFactor[] = [];

    // Sentiment factor
    factors.push({
      name: 'Sentiment',
      impact: sentiment.overallSentiment === 'positive' ? 'positive' : 
              sentiment.overallSentiment === 'negative' ? 'negative' : 'neutral',
      weight: 0.20,
      description: `Overall sentiment is ${sentiment.overallSentiment}`,
    });

    // Urgency factor
    if (sentiment.urgencyLevel !== 'low') {
      factors.push({
        name: 'Urgency',
        impact: sentiment.urgencyLevel === 'critical' ? 'negative' : 'neutral',
        weight: 0.10,
        description: `Urgency level: ${sentiment.urgencyLevel}`,
      });
    }

    // Reply depth factor
    if (replyDepth && replyDepth.threadLength > 1) {
      factors.push({
        name: 'Conversation Depth',
        impact: replyDepth.threadLength > 3 ? 'positive' : 'neutral',
        weight: 0.15,
        description: `Thread contains ${replyDepth.threadLength} messages`,
      });
    }

    // Objection factor
    if (objections.hasObjections) {
      factors.push({
        name: 'Objections',
        impact: 'negative',
        weight: 0.20,
        description: `${objections.objections.length} objection(s) detected`,
      });
    }

    // Email importance
    if (email.importance === 'high') {
      factors.push({
        name: 'High Priority',
        impact: 'positive',
        weight: 0.05,
        description: 'Email marked as high importance',
      });
    }

    return factors;
  }

  /**
   * Identify quality factors for meeting
   */
  private identifyMeetingQualityFactors(
    meeting: OutlookMeeting,
    sentiment: SentimentInsights,
    _objections: ObjectionDetection
  ): QualityFactor[] {
    const factors: QualityFactor[] = [];

    // Attendance factor
    const acceptedCount = meeting.attendees.filter(
      a => a.status?.response === 'accepted'
    ).length;
    factors.push({
      name: 'Attendance',
      impact: acceptedCount > meeting.attendees.length / 2 ? 'positive' : 'negative',
      weight: 0.25,
      description: `${acceptedCount}/${meeting.attendees.length} attendees accepted`,
    });

    // Online meeting factor
    if (meeting.isOnlineMeeting) {
      factors.push({
        name: 'Virtual Meeting',
        impact: 'neutral',
        weight: 0.05,
        description: 'Meeting has online option',
      });
    }

    // Cancellation factor
    if (meeting.isCancelled) {
      factors.push({
        name: 'Cancelled',
        impact: 'negative',
        weight: 0.30,
        description: 'Meeting was cancelled',
      });
    }

    // Sentiment factor
    factors.push({
      name: 'Sentiment',
      impact: sentiment.overallSentiment === 'positive' ? 'positive' : 
              sentiment.overallSentiment === 'negative' ? 'negative' : 'neutral',
      weight: 0.15,
      description: `Overall sentiment is ${sentiment.overallSentiment}`,
    });

    return factors;
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(
    sentiment: SentimentInsights,
    objections: ObjectionDetection,
    replyDepth: ReplyDepthMetrics | undefined
  ): string[] {
    const recommendations: string[] = [];

    // Sentiment-based recommendations
    if (sentiment.overallSentiment === 'negative') {
      recommendations.push('Address negative sentiment by acknowledging concerns');
    }

    // Objection-based recommendations
    if (objections.hasObjections) {
      recommendations.push('Prepare responses to detected objections');
      objections.suggestedResponses.forEach(sr => {
        recommendations.push(`For ${sr.objectionType} objection: ${sr.response}`);
      });
    }

    // Reply depth recommendations
    if (replyDepth) {
      if (replyDepth.averageResponseTime > 24) {
        recommendations.push('Improve response time to maintain engagement');
      }
      if (replyDepth.conversationVelocity === 'slow') {
        recommendations.push('Increase conversation frequency to build momentum');
      }
    }

    // Urgency recommendations
    if (sentiment.urgencyLevel === 'critical') {
      recommendations.push('Prioritize immediate response due to high urgency');
    }

    return recommendations.slice(0, 5); // Limit to 5 recommendations
  }

  /**
   * Generate meeting-specific recommendations
   */
  private generateMeetingRecommendations(
    meeting: OutlookMeeting,
    sentiment: SentimentInsights,
    objections: ObjectionDetection
  ): string[] {
    const recommendations: string[] = [];

    // Attendance recommendations
    const declinedCount = meeting.attendees.filter(
      a => a.status?.response === 'declined'
    ).length;
    if (declinedCount > 0) {
      recommendations.push(`Follow up with ${declinedCount} declined attendee(s)`);
    }

    // No response recommendations
    const noResponseCount = meeting.attendees.filter(
      a => a.status?.response === 'notResponded'
    ).length;
    if (noResponseCount > 0) {
      recommendations.push(`Send reminder to ${noResponseCount} attendee(s) who haven't responded`);
    }

    // Sentiment recommendations
    if (sentiment.overallSentiment === 'negative') {
      recommendations.push('Review meeting agenda to address concerns');
    }

    // Objection recommendations
    if (objections.hasObjections) {
      recommendations.push('Prepare to address objections during the meeting');
    }

    return recommendations.slice(0, 5);
  }

  /**
   * Determine sentiment trend over conversation
   */
  private determineTrend(emails?: OutlookEmail[]): 'improving' | 'stable' | 'declining' {
    if (!emails || emails.length < 2) return 'stable';

    // Sort by date
    const sorted = [...emails].sort(
      (a, b) => new Date(a.sentDateTime).getTime() - new Date(b.sentDateTime).getTime()
    );

    // Get sentiment for first and last messages
    const firstText = this.extractEmailText(sorted[0]);
    const lastText = this.extractEmailText(sorted[sorted.length - 1]);

    const comparison = sentimentService.compareSentiment(firstText, lastText);
    return comparison.trend;
  }

  /**
   * Generate next step recommendations
   */
  private generateNextSteps(
    sentiment: SentimentInsights,
    objections: ObjectionDetection,
    replyDepth: ReplyDepthMetrics | undefined
  ): NextStepRecommendation[] {
    const nextSteps: NextStepRecommendation[] = [];

    // Critical urgency - immediate action
    if (sentiment.urgencyLevel === 'critical') {
      nextSteps.push({
        priority: 'critical',
        action: 'follow_up_call',
        reasoning: 'High urgency detected - immediate contact recommended',
        suggestedTimeline: 'Within 2 hours',
        confidence: 0.9,
      });
    }

    // Strong objections - address them
    if (objections.overallObjectionLevel === 'strong') {
      const primaryObjection = objections.objections[0];
      let action: RecommendedAction = 'address_objection';
      
      if (primaryObjection?.type === 'price') {
        action = 'send_proposal';
      } else if (primaryObjection?.type === 'trust') {
        action = 'share_case_study';
      }

      nextSteps.push({
        priority: 'high',
        action,
        reasoning: `Strong ${primaryObjection?.type || 'general'} objection detected`,
        suggestedTimeline: 'Within 24 hours',
        confidence: 0.8,
      });
    }

    // Positive sentiment - move forward
    if (sentiment.overallSentiment === 'positive' && !objections.hasObjections) {
      nextSteps.push({
        priority: 'medium',
        action: 'schedule_meeting',
        reasoning: 'Positive engagement - good time to advance the relationship',
        suggestedTimeline: 'Within 3 days',
        confidence: 0.7,
      });
    }

    // Slow conversation - re-engage
    if (replyDepth && replyDepth.conversationVelocity === 'slow') {
      nextSteps.push({
        priority: 'medium',
        action: 're_engage',
        reasoning: 'Conversation momentum has slowed',
        suggestedTimeline: 'Within 1 week',
        confidence: 0.6,
      });
    }

    // Default nurture if no other actions
    if (nextSteps.length === 0) {
      nextSteps.push({
        priority: 'low',
        action: 'nurture',
        reasoning: 'Maintain regular engagement',
        suggestedTimeline: 'Within 2 weeks',
        confidence: 0.5,
      });
    }

    return nextSteps;
  }

  /**
   * Calculate overall confidence
   */
  private calculateConfidence(
    sentiment: SentimentInsights,
    objections: ObjectionDetection
  ): number {
    const sentimentConfidence = sentiment.confidence;
    const objectionConfidence = objections.objections.length > 0
      ? objections.objections.reduce((sum, o) => sum + o.confidence, 0) / objections.objections.length
      : 0.7;

    return Math.round((sentimentConfidence * 0.6 + objectionConfidence * 0.4) * 100) / 100;
  }
}

export const activityQualityService = new ActivityQualityService();
