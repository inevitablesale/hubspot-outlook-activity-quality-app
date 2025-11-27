import request from 'supertest';
import { createApp } from '../src/index';
import { Application } from 'express';

describe('API Endpoints', () => {
  let app: Application;

  beforeAll(() => {
    app = createApp();
  });

  describe('GET /', () => {
    it('should return API info', async () => {
      const response = await request(app).get('/');
      
      expect(response.status).toBe(200);
      expect(response.body.name).toBe('HubSpot Outlook Activity Quality App');
      expect(response.body.endpoints).toBeDefined();
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('GET /health/ready', () => {
    it('should return readiness status', async () => {
      const response = await request(app).get('/health/ready');
      
      expect(response.status).toBe(200);
      expect(response.body.ready).toBeDefined();
    });
  });

  describe('GET /health/live', () => {
    it('should return liveness status', async () => {
      const response = await request(app).get('/health/live');
      
      expect(response.status).toBe(200);
      expect(response.body.live).toBe(true);
    });
  });

  describe('POST /analyze/sentiment', () => {
    it('should analyze sentiment of text', async () => {
      const response = await request(app)
        .post('/analyze/sentiment')
        .send({ text: 'I love this product! It is amazing!' });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.overallSentiment).toBe('positive');
    });

    it('should return error for missing text', async () => {
      const response = await request(app)
        .post('/analyze/sentiment')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /analyze/objections', () => {
    it('should detect objections in text', async () => {
      const response = await request(app)
        .post('/analyze/objections')
        .send({ text: 'This is too expensive for our budget.' });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.hasObjections).toBe(true);
    });

    it('should return no objections for positive text', async () => {
      const response = await request(app)
        .post('/analyze/objections')
        .send({ text: 'This looks great! We want to move forward.' });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.hasObjections).toBe(false);
    });
  });

  describe('POST /analyze/email', () => {
    it('should analyze email', async () => {
      const email = {
        id: 'test-email',
        subject: 'Test Subject',
        body: 'This is a great opportunity!',
        from: {
          emailAddress: {
            name: 'Test User',
            address: 'test@example.com',
          },
        },
        toRecipients: [
          {
            emailAddress: {
              name: 'Recipient',
              address: 'recipient@example.com',
            },
          },
        ],
        sentDateTime: new Date().toISOString(),
        hasAttachments: false,
        importance: 'normal',
      };

      const response = await request(app)
        .post('/analyze/email')
        .send({ email });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.activityType).toBe('email');
      expect(response.body.data.qualityScore).toBeDefined();
    });

    it('should return error for invalid email structure', async () => {
      const response = await request(app)
        .post('/analyze/email')
        .send({ email: { invalid: 'data' } });
      
      expect(response.status).toBe(400);
    });
  });

  describe('POST /analyze/meeting', () => {
    it('should analyze meeting', async () => {
      const meeting = {
        id: 'test-meeting',
        subject: 'Test Meeting',
        body: 'Discussing project progress.',
        start: {
          dateTime: new Date().toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: new Date(Date.now() + 3600000).toISOString(),
          timeZone: 'UTC',
        },
        organizer: {
          emailAddress: {
            name: 'Organizer',
            address: 'organizer@example.com',
          },
        },
        attendees: [
          {
            emailAddress: {
              name: 'Attendee',
              address: 'attendee@example.com',
            },
            type: 'required',
            status: { response: 'accepted' },
          },
        ],
        isOnlineMeeting: true,
        isCancelled: false,
        createdDateTime: new Date().toISOString(),
        lastModifiedDateTime: new Date().toISOString(),
      };

      const response = await request(app)
        .post('/analyze/meeting')
        .send({ meeting });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.activityType).toBe('meeting');
    });
  });

  describe('GET /crm-card/activity-quality', () => {
    it('should return CRM card response', async () => {
      const response = await request(app)
        .get('/crm-card/activity-quality')
        .query({
          portalId: '12345',
          associatedObjectId: '67890',
          associatedObjectType: 'CONTACT',
        });
      
      expect(response.status).toBe(200);
      expect(response.body.results).toBeDefined();
      expect(Array.isArray(response.body.results)).toBe(true);
    });
  });

  describe('GET /oauth/status', () => {
    it('should return disconnected status for unknown portal', async () => {
      const response = await request(app)
        .get('/oauth/status')
        .query({ portalId: 'unknown-portal' });
      
      expect(response.status).toBe(200);
      expect(response.body.connected).toBe(false);
    });

    it('should return error when portalId is missing', async () => {
      const response = await request(app).get('/oauth/status');
      
      expect(response.status).toBe(400);
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/unknown-route');
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
});
