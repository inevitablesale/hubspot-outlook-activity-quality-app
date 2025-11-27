# HubSpot Outlook Activity Quality App

HubSpot app that analyzes Outlook email and meeting activity to generate Activity Quality Scores, sentiment analysis, reply-depth insights, objection detection, and recommended next steps. Replaces raw activity logs with meaningful relationship intelligence.

## Features

- **Activity Quality Scores** - Calculate comprehensive quality scores (0-100) with letter grades for email and meeting activities
- **Sentiment Analysis** - Analyze sentiment of communications to understand emotional tone and engagement levels
- **Reply-Depth Metrics** - Track conversation depth, response times, and engagement velocity
- **Objection Detection** - Automatically identify sales objections (price, timing, competition, authority, need, trust, implementation, feature)
- **Next-Step Recommendations** - AI-powered recommendations for follow-up actions
- **HubSpot CRM Cards** - Display activity insights directly in HubSpot contact/company/deal records
- **OAuth Integration** - Secure HubSpot OAuth 2.0 authentication flow
- **Timeline Events** - Create custom timeline events for significant activity analysis results
- **Property Updates** - Automatically update HubSpot contact properties with quality metrics

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- HubSpot Developer Account
- HubSpot App with OAuth credentials

### Installation

```bash
# Clone the repository
git clone https://github.com/inevitablesale/hubspot-outlook-activity-quality-app.git

# Navigate to the project directory
cd hubspot-outlook-activity-quality-app

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your HubSpot credentials
```

### Configuration

Edit the `.env` file with your HubSpot app credentials:

```env
# HubSpot OAuth Configuration
HUBSPOT_CLIENT_ID=your_client_id_here
HUBSPOT_CLIENT_SECRET=your_client_secret_here
HUBSPOT_REDIRECT_URI=http://localhost:3000/oauth/callback
HUBSPOT_SCOPES=crm.objects.contacts.read crm.objects.contacts.write timeline

# App Configuration
PORT=3000
NODE_ENV=development
APP_SECRET=your_app_secret_here
```

### Running the App

```bash
# Development mode with hot reload
npm run dev

# Production build
npm run build
npm start
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage
```

## API Endpoints

### Health Check
- `GET /health` - Health status
- `GET /health/ready` - Readiness check
- `GET /health/live` - Liveness check

### OAuth
- `GET /oauth/authorize` - Start OAuth flow
- `GET /oauth/callback` - OAuth callback handler
- `GET /oauth/status?portalId=<id>` - Check connection status
- `POST /oauth/disconnect` - Disconnect portal

### Activity Ingestion
- `POST /ingest/email` - Ingest and analyze a single email
- `POST /ingest/meeting` - Ingest and analyze a single meeting
- `POST /ingest/batch` - Batch ingest multiple activities
- `GET /ingest/analysis/:objectType/:objectId` - Get cached analysis

### Analysis
- `POST /analyze/sentiment` - Analyze text sentiment
- `POST /analyze/sentiment/raw` - Get raw sentiment scores
- `POST /analyze/sentiment/compare` - Compare sentiment between texts
- `POST /analyze/objections` - Detect objections in text
- `POST /analyze/objections/conversation` - Analyze objections across conversation
- `POST /analyze/email` - Full email analysis
- `POST /analyze/meeting` - Full meeting analysis

### HubSpot CRM Cards
- `GET /crm-card/activity-quality` - Activity Quality Score card
- `GET /crm-card/sentiment-details` - Sentiment analysis details card
- `GET /crm-card/objections` - Objection detection card
- `GET /crm-card/next-steps` - Recommended next steps card

### Timeline Events
- `POST /timeline/event` - Create timeline event
- `POST /timeline/activity-analyzed` - Create activity analyzed event
- `POST /timeline/objection-detected` - Create objection detected event
- `POST /timeline/sentiment-change` - Create sentiment change event

### Properties
- `POST /properties/update` - Update HubSpot properties
- `POST /properties/batch` - Batch update properties
- `POST /properties/setup` - Create custom Activity Quality properties
- `POST /properties/sync-quality-scores` - Sync quality scores to HubSpot

## Example Usage

### Analyzing an Email

```bash
curl -X POST http://localhost:3000/analyze/email \
  -H "Content-Type: application/json" \
  -d '{
    "email": {
      "id": "email-123",
      "subject": "Follow-up on our discussion",
      "body": "I am excited about the opportunity to work together...",
      "from": {
        "emailAddress": {
          "name": "John Doe",
          "address": "john@example.com"
        }
      },
      "toRecipients": [{
        "emailAddress": {
          "name": "Jane Smith",
          "address": "jane@example.com"
        }
      }],
      "sentDateTime": "2024-01-15T10:30:00Z",
      "hasAttachments": false,
      "importance": "normal"
    }
  }'
```

### Detecting Objections

```bash
curl -X POST http://localhost:3000/analyze/objections \
  -H "Content-Type: application/json" \
  -d '{
    "text": "This solution is too expensive for our budget right now."
  }'
```

### Analyzing Sentiment

```bash
curl -X POST http://localhost:3000/analyze/sentiment \
  -H "Content-Type: application/json" \
  -d '{
    "text": "We are thrilled with the progress and looking forward to next steps!"
  }'
```

## Activity Quality Score Breakdown

The Activity Quality Score (0-100) is calculated based on:

| Component | Weight | Description |
|-----------|--------|-------------|
| Engagement | 25% | Email importance, attachments, conversation depth |
| Sentiment | 20% | Positive/negative/neutral tone analysis |
| Responsiveness | 20% | Average response time, conversation velocity |
| Depth | 15% | Thread length, participant count |
| Quality | 20% | Objection level, content quality indicators |

### Grades
- **A** (90-100): Excellent engagement and sentiment
- **B** (80-89): Good activity quality
- **C** (70-79): Average engagement
- **D** (60-69): Below average
- **F** (0-59): Poor activity quality

## Objection Types

The system detects the following objection types:
- **Price** - Budget and cost concerns
- **Timing** - Not the right time
- **Competition** - Using competitor solutions
- **Authority** - Need approval from others
- **Need** - Don't see the value/need
- **Trust** - Concerns about the company/product
- **Implementation** - Technical complexity concerns
- **Feature** - Missing functionality

## Project Structure

```
├── src/
│   ├── index.ts            # Application entry point
│   ├── routes/             # API route handlers
│   │   ├── oauth.ts        # HubSpot OAuth routes
│   │   ├── ingest.ts       # Activity ingestion routes
│   │   ├── analyze.ts      # Analysis routes
│   │   ├── crmCard.ts      # CRM card endpoints
│   │   ├── timeline.ts     # Timeline event routes
│   │   ├── properties.ts   # Property update routes
│   │   └── health.ts       # Health check routes
│   ├── services/           # Business logic
│   │   ├── sentimentService.ts    # Sentiment analysis
│   │   ├── objectionService.ts    # Objection detection
│   │   ├── activityQualityService.ts  # Quality scoring
│   │   └── hubspotService.ts      # HubSpot API integration
│   ├── middleware/         # Express middleware
│   │   ├── errorHandler.ts # Error handling
│   │   └── auth.ts         # Authentication
│   └── types/              # TypeScript type definitions
│       ├── outlook.ts      # Outlook activity types
│       ├── analysis.ts     # Analysis result types
│       └── hubspot.ts      # HubSpot API types
├── tests/                  # Test files
├── dist/                   # Compiled JavaScript
└── config/                 # Configuration files
```

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.