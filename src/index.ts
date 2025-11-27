import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import {
  oauthRouter,
  ingestRouter,
  crmCardRouter,
  analyzeRouter,
  timelineRouter,
  propertiesRouter,
  healthRouter,
} from './routes';

import {
  errorHandler,
  notFoundHandler,
  requestLogger,
  rateLimiter,
} from './middleware';

// Load environment variables
dotenv.config();

/**
 * Create and configure Express application
 */
export function createApp(): Application {
  const app = express();

  // Security middleware with custom CSP for HubSpot CRM card compatibility
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://app.hubspot.com", "https://*.hubspot.com"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        frameSrc: ["'self'", "https://app.hubspot.com", "https://*.hubspot.com"],
        frameAncestors: ["'self'", "https://app.hubspot.com", "https://*.hubspot.com"],
        connectSrc: ["'self'", "https://api.hubapi.com", "https://*.hubspot.com"],
      },
    },
  }));
  app.use(cors());

  // Request parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Logging
  app.use(requestLogger);

  // Rate limiting
  app.use(rateLimiter(100, 60000)); // 100 requests per minute

  // Routes
  app.use('/health', healthRouter);
  app.use('/oauth', oauthRouter);
  app.use('/ingest', ingestRouter);
  app.use('/crm-card', crmCardRouter);
  app.use('/analyze', analyzeRouter);
  app.use('/timeline', timelineRouter);
  app.use('/properties', propertiesRouter);

  // Root route
  app.get('/', (_req, res) => {
    res.json({
      name: 'HubSpot Outlook Activity Quality App',
      version: '1.0.0',
      description: 'Analyzes Outlook email and meeting activity to generate Activity Quality Scores, sentiment analysis, and recommendations.',
      endpoints: {
        health: '/health',
        oauth: '/oauth/authorize',
        ingest: '/ingest/email, /ingest/meeting, /ingest/batch',
        analyze: '/analyze/sentiment, /analyze/objections, /analyze/email, /analyze/meeting',
        crmCard: '/crm-card/activity-quality',
        timeline: '/timeline/event',
        properties: '/properties/update',
      },
    });
  });

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

/**
 * Start the server
 */
function startServer(): void {
  const app = createApp();
  const port = process.env.PORT || 3000;

  app.listen(port, () => {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║     HubSpot Outlook Activity Quality App                       ║
║     Server running on port ${port}                                ║
╚════════════════════════════════════════════════════════════════╝

Available endpoints:
  - GET  /                              API info
  - GET  /health                        Health check
  - GET  /oauth/authorize               Start OAuth flow
  - GET  /oauth/callback                OAuth callback
  - POST /ingest/email                  Ingest email
  - POST /ingest/meeting                Ingest meeting
  - POST /ingest/batch                  Batch ingest
  - POST /analyze/sentiment             Analyze sentiment
  - POST /analyze/objections            Detect objections
  - POST /analyze/email                 Analyze email
  - POST /analyze/meeting               Analyze meeting
  - GET  /crm-card/activity-quality     CRM card endpoint
  - POST /timeline/event                Create timeline event
  - POST /properties/update             Update properties

Environment: ${process.env.NODE_ENV || 'development'}
    `);
  });
}

// Start server if this is the main module
if (require.main === module) {
  startServer();
}

export default createApp;
