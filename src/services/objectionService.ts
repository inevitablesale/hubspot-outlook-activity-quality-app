import {
  ObjectionDetection,
  Objection,
  ObjectionType,
  SuggestedResponse,
} from '../types/analysis';

/**
 * Objection patterns for detection
 */
const OBJECTION_PATTERNS: Record<ObjectionType, string[]> = {
  price: [
    'too expensive',
    'out of budget',
    'can\'t afford',
    'cost too much',
    'price is high',
    'cheaper option',
    'budget constraints',
    'pricing concern',
    'reduce the price',
    'discount',
    'not in our budget',
    'over budget',
  ],
  timing: [
    'not the right time',
    'too busy',
    'maybe later',
    'next quarter',
    'not now',
    'bad timing',
    'revisit later',
    'in the future',
    'down the road',
    'not ready',
    'need more time',
    'too soon',
  ],
  competition: [
    'using competitor',
    'already have',
    'happy with current',
    'working with another',
    'signed with',
    'going with',
    'chose another',
    'different vendor',
    'other solution',
    'alternative',
  ],
  authority: [
    'need to check with',
    'not my decision',
    'boss needs to approve',
    'talk to my manager',
    'get approval',
    'committee decision',
    'need buy-in',
    'stakeholders',
    'not authorized',
    'leadership decision',
  ],
  need: [
    'don\'t need',
    'not a priority',
    'no use case',
    'not relevant',
    'doesn\'t apply',
    'not looking for',
    'satisfied with',
    'no pain point',
    'works fine',
  ],
  trust: [
    'not sure about',
    'concerned about',
    'worried about',
    'don\'t trust',
    'never heard of',
    'too new',
    'unproven',
    'references',
    'case studies',
    'testimonials',
  ],
  implementation: [
    'too complex',
    'integration issues',
    'hard to implement',
    'migration concerns',
    'downtime',
    'learning curve',
    'training required',
    'resources needed',
    'technical challenges',
  ],
  feature: [
    'missing feature',
    'doesn\'t have',
    'need it to do',
    'can\'t do',
    'functionality missing',
    'feature request',
    'not supported',
    'limitation',
  ],
  general: [
    'not interested',
    'pass on this',
    'decline',
    'no thanks',
    'not for us',
    'won\'t work',
  ],
};

/**
 * Suggested responses for each objection type
 */
const SUGGESTED_RESPONSES: Record<ObjectionType, string[]> = {
  price: [
    'Let\'s discuss the ROI and value this brings to your organization.',
    'We have flexible pricing options that might better fit your budget.',
    'Can we explore which features are most critical to your needs?',
  ],
  timing: [
    'What would need to change for the timing to be right?',
    'Let\'s schedule a follow-up for when it makes more sense.',
    'Is there a specific milestone or event we should align with?',
  ],
  competition: [
    'What aspects of your current solution work well for you?',
    'Many of our customers switched from that solution. Here\'s what they found...',
    'Would it be helpful to see a comparison?',
  ],
  authority: [
    'Would it help if I provided materials for your team?',
    'Can we schedule a call with the decision makers?',
    'What information would be most helpful for the approval process?',
  ],
  need: [
    'Can you tell me more about your current challenges?',
    'Many customers didn\'t realize the need until they saw the impact.',
    'What would success look like for your team?',
  ],
  trust: [
    'I\'d be happy to share case studies from similar companies.',
    'Would you like to speak with one of our existing customers?',
    'Let me show you the results others have achieved.',
  ],
  implementation: [
    'Our implementation team handles the heavy lifting.',
    'We provide comprehensive training and support.',
    'Let me show you how other companies made the transition.',
  ],
  feature: [
    'That\'s on our roadmap. Let me share our timeline.',
    'Here\'s how other customers work around that limitation.',
    'Can you tell me more about that specific use case?',
  ],
  general: [
    'What specific concerns can I address?',
    'Would it help to schedule a follow-up in a few months?',
    'Is there anything that would change your mind?',
  ],
};

/**
 * Objection Detection Service
 */
export class ObjectionDetectionService {
  /**
   * Detect objections in text
   */
  detect(text: string): ObjectionDetection {
    const normalizedText = text.toLowerCase();
    const objections: Objection[] = [];

    for (const [type, patterns] of Object.entries(OBJECTION_PATTERNS)) {
      for (const pattern of patterns) {
        const index = normalizedText.indexOf(pattern);
        if (index !== -1) {
          // Extract context around the objection
          const start = Math.max(0, index - 50);
          const end = Math.min(text.length, index + pattern.length + 50);
          const context = text.substring(start, end).trim();

          objections.push({
            type: type as ObjectionType,
            phrase: pattern,
            confidence: this.calculateConfidence(pattern, normalizedText),
            context,
          });
        }
      }
    }

    // Remove duplicate types, keeping highest confidence
    const uniqueObjections = this.deduplicateObjections(objections);
    
    const hasObjections = uniqueObjections.length > 0;
    const overallLevel = this.calculateOverallLevel(uniqueObjections);
    const suggestedResponses = this.getSuggestedResponses(uniqueObjections);

    return {
      hasObjections,
      objections: uniqueObjections,
      overallObjectionLevel: overallLevel,
      suggestedResponses,
    };
  }

  /**
   * Calculate confidence score for an objection
   */
  private calculateConfidence(pattern: string, text: string): number {
    // Base confidence
    let confidence = 0.7;

    // Higher confidence for longer, more specific patterns
    if (pattern.split(' ').length > 2) {
      confidence += 0.1;
    }

    // Higher confidence if pattern appears multiple times
    const occurrences = (text.match(new RegExp(pattern, 'gi')) || []).length;
    if (occurrences > 1) {
      confidence += 0.1;
    }

    // Check for negation before the pattern
    const patternIndex = text.indexOf(pattern);
    const precedingText = text.substring(Math.max(0, patternIndex - 20), patternIndex);
    if (precedingText.includes('not ') || precedingText.includes("n't ")) {
      confidence -= 0.3;
    }

    return Math.min(0.95, Math.max(0.3, confidence));
  }

  /**
   * Remove duplicate objections, keeping highest confidence for each type
   */
  private deduplicateObjections(objections: Objection[]): Objection[] {
    const byType = new Map<ObjectionType, Objection>();

    for (const objection of objections) {
      const existing = byType.get(objection.type);
      if (!existing || objection.confidence > existing.confidence) {
        byType.set(objection.type, objection);
      }
    }

    return Array.from(byType.values());
  }

  /**
   * Calculate overall objection level
   */
  private calculateOverallLevel(objections: Objection[]): 'none' | 'mild' | 'moderate' | 'strong' {
    if (objections.length === 0) return 'none';
    
    const avgConfidence = objections.reduce((sum, o) => sum + o.confidence, 0) / objections.length;
    
    if (objections.length >= 3 || avgConfidence > 0.8) return 'strong';
    if (objections.length >= 2 || avgConfidence > 0.6) return 'moderate';
    return 'mild';
  }

  /**
   * Get suggested responses for detected objections
   */
  private getSuggestedResponses(objections: Objection[]): SuggestedResponse[] {
    const responses: SuggestedResponse[] = [];

    for (const objection of objections) {
      const typeResponses = SUGGESTED_RESPONSES[objection.type];
      if (typeResponses && typeResponses.length > 0) {
        responses.push({
          objectionType: objection.type,
          response: typeResponses[0],
          confidence: objection.confidence,
        });
      }
    }

    return responses;
  }

  /**
   * Analyze multiple texts and aggregate objections
   */
  analyzeConversation(texts: string[]): ObjectionDetection {
    const allObjections: Objection[] = [];

    for (const text of texts) {
      const result = this.detect(text);
      allObjections.push(...result.objections);
    }

    const uniqueObjections = this.deduplicateObjections(allObjections);
    const hasObjections = uniqueObjections.length > 0;
    const overallLevel = this.calculateOverallLevel(uniqueObjections);
    const suggestedResponses = this.getSuggestedResponses(uniqueObjections);

    return {
      hasObjections,
      objections: uniqueObjections,
      overallObjectionLevel: overallLevel,
      suggestedResponses,
    };
  }
}

export const objectionService = new ObjectionDetectionService();
