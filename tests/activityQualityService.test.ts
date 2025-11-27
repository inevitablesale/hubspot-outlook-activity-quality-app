import { ActivityQualityService, activityQualityService } from '../src/services/activityQualityService';
import { OutlookEmail, OutlookMeeting } from '../src/types/outlook';

describe('ActivityQualityService', () => {
  let service: ActivityQualityService;

  beforeEach(() => {
    service = new ActivityQualityService();
  });

  const createMockEmail = (overrides?: Partial<OutlookEmail>): OutlookEmail => ({
    id: 'email-123',
    subject: 'Test Email Subject',
    body: 'This is a test email body with some content.',
    from: {
      emailAddress: {
        name: 'John Doe',
        address: 'john@example.com',
      },
    },
    toRecipients: [
      {
        emailAddress: {
          name: 'Jane Smith',
          address: 'jane@example.com',
        },
      },
    ],
    sentDateTime: new Date().toISOString(),
    hasAttachments: false,
    importance: 'normal',
    ...overrides,
  });

  const createMockMeeting = (overrides?: Partial<OutlookMeeting>): OutlookMeeting => ({
    id: 'meeting-123',
    subject: 'Test Meeting',
    body: 'Meeting agenda and discussion points.',
    start: {
      dateTime: new Date().toISOString(),
      timeZone: 'UTC',
    },
    end: {
      dateTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour later
      timeZone: 'UTC',
    },
    organizer: {
      emailAddress: {
        name: 'John Doe',
        address: 'john@example.com',
      },
    },
    attendees: [
      {
        emailAddress: {
          name: 'Jane Smith',
          address: 'jane@example.com',
        },
        type: 'required',
        status: {
          response: 'accepted',
        },
      },
    ],
    isOnlineMeeting: true,
    isCancelled: false,
    createdDateTime: new Date().toISOString(),
    lastModifiedDateTime: new Date().toISOString(),
    ...overrides,
  });

  describe('calculateEmailScore', () => {
    it('should return a valid analysis result', () => {
      const email = createMockEmail();
      const result = service.calculateEmailScore(email);

      expect(result.id).toBeDefined();
      expect(result.activityType).toBe('email');
      expect(result.qualityScore).toBeDefined();
      expect(result.sentiment).toBeDefined();
      expect(result.objections).toBeDefined();
      expect(result.nextSteps).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it('should calculate quality score between 0 and 100', () => {
      const email = createMockEmail();
      const result = service.calculateEmailScore(email);

      expect(result.qualityScore.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.qualityScore.overallScore).toBeLessThanOrEqual(100);
    });

    it('should assign valid grade', () => {
      const email = createMockEmail();
      const result = service.calculateEmailScore(email);

      expect(['A', 'B', 'C', 'D', 'F']).toContain(result.qualityScore.grade);
    });

    it('should detect positive sentiment in positive email', () => {
      const email = createMockEmail({
        subject: 'Great news!',
        body: 'I am very excited about this opportunity! This is fantastic and amazing!',
      });
      const result = service.calculateEmailScore(email);

      expect(result.sentiment.overallSentiment).toBe('positive');
    });

    it('should detect objections in email with objections', () => {
      const email = createMockEmail({
        body: 'This is too expensive for our budget and we don\'t need it right now.',
      });
      const result = service.calculateEmailScore(email);

      expect(result.objections.hasObjections).toBe(true);
      expect(result.objections.objections.length).toBeGreaterThan(0);
    });

    it('should calculate higher engagement score for high importance emails', () => {
      const normalEmail = createMockEmail({ importance: 'normal' });
      const highEmail = createMockEmail({ importance: 'high' });

      const normalResult = service.calculateEmailScore(normalEmail);
      const highResult = service.calculateEmailScore(highEmail);

      expect(highResult.qualityScore.breakdown.engagementScore)
        .toBeGreaterThanOrEqual(normalResult.qualityScore.breakdown.engagementScore);
    });

    it('should provide next step recommendations', () => {
      const email = createMockEmail();
      const result = service.calculateEmailScore(email);

      expect(result.nextSteps.length).toBeGreaterThan(0);
      expect(result.nextSteps[0].action).toBeDefined();
      expect(result.nextSteps[0].reasoning).toBeDefined();
    });

    it('should calculate reply depth metrics with conversation history', () => {
      const email1 = createMockEmail({
        id: 'email-1',
        sentDateTime: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        conversationId: 'conv-123',
      });
      const email2 = createMockEmail({
        id: 'email-2',
        sentDateTime: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        conversationId: 'conv-123',
      });
      const email3 = createMockEmail({
        id: 'email-3',
        sentDateTime: new Date().toISOString(),
        conversationId: 'conv-123',
      });

      const result = service.calculateEmailScore(email3, [email1, email2, email3]);

      expect(result.replyDepth).toBeDefined();
      expect(result.replyDepth?.threadLength).toBe(3);
      expect(result.replyDepth?.averageResponseTime).toBeGreaterThan(0);
    });
  });

  describe('calculateMeetingScore', () => {
    it('should return a valid analysis result', () => {
      const meeting = createMockMeeting();
      const result = service.calculateMeetingScore(meeting);

      expect(result.id).toBeDefined();
      expect(result.activityType).toBe('meeting');
      expect(result.qualityScore).toBeDefined();
      expect(result.sentiment).toBeDefined();
      expect(result.objections).toBeDefined();
      expect(result.nextSteps).toBeDefined();
    });

    it('should calculate quality score between 0 and 100', () => {
      const meeting = createMockMeeting();
      const result = service.calculateMeetingScore(meeting);

      expect(result.qualityScore.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.qualityScore.overallScore).toBeLessThanOrEqual(100);
    });

    it('should reflect cancelled status in quality score', () => {
      const activeMeeting = createMockMeeting({ isCancelled: false });
      const cancelledMeeting = createMockMeeting({ isCancelled: true });

      const activeResult = service.calculateMeetingScore(activeMeeting);
      const cancelledResult = service.calculateMeetingScore(cancelledMeeting);

      expect(cancelledResult.qualityScore.overallScore)
        .toBeLessThan(activeResult.qualityScore.overallScore);
    });

    it('should account for attendee count in engagement score', () => {
      const fewAttendeeMeeting = createMockMeeting({
        attendees: [
          { emailAddress: { address: 'a@test.com' }, type: 'required', status: { response: 'accepted' } },
        ],
      });
      const manyAttendeeMeeting = createMockMeeting({
        attendees: [
          { emailAddress: { address: 'a@test.com' }, type: 'required', status: { response: 'accepted' } },
          { emailAddress: { address: 'b@test.com' }, type: 'required', status: { response: 'accepted' } },
          { emailAddress: { address: 'c@test.com' }, type: 'required', status: { response: 'accepted' } },
        ],
      });

      const fewResult = service.calculateMeetingScore(fewAttendeeMeeting);
      const manyResult = service.calculateMeetingScore(manyAttendeeMeeting);

      expect(manyResult.qualityScore.breakdown.engagementScore)
        .toBeGreaterThan(fewResult.qualityScore.breakdown.engagementScore);
    });
  });

  describe('metadata', () => {
    it('should include processing time', () => {
      const email = createMockEmail();
      const result = service.calculateEmailScore(email);

      expect(result.metadata.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should include model version', () => {
      const email = createMockEmail();
      const result = service.calculateEmailScore(email);

      expect(result.metadata.modelVersion).toBeDefined();
    });

    it('should include confidence score', () => {
      const email = createMockEmail();
      const result = service.calculateEmailScore(email);

      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0);
      expect(result.metadata.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(activityQualityService).toBeDefined();
      expect(activityQualityService).toBeInstanceOf(ActivityQualityService);
    });
  });
});
