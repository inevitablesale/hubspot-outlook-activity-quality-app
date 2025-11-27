import { Router, Request, Response } from 'express';
import { hubspotService } from '../services/hubspotService';
import { asyncHandler } from '../middleware/errorHandler';
import { CRMCardRequest } from '../types/hubspot';
import { ActivityAnalysisResult } from '../types/analysis';

const router = Router();

/**
 * In-memory analysis cache (shared with ingest routes in production)
 */
const analysisCache = new Map<string, ActivityAnalysisResult>();

/**
 * Get analysis from cache or return null
 */
function getCachedAnalysis(portalId: string, objectType: string, objectId: string): ActivityAnalysisResult | null {
  const cacheKey = `${portalId}:${objectType.toLowerCase()}:${objectId}`;
  return analysisCache.get(cacheKey) || null;
}

/**
 * Store analysis in cache
 */
export function setCachedAnalysis(portalId: string, objectType: string, objectId: string, analysis: ActivityAnalysisResult): void {
  const cacheKey = `${portalId}:${objectType.toLowerCase()}:${objectId}`;
  analysisCache.set(cacheKey, analysis);
}

/**
 * GET /crm-card/activity-quality
 * HubSpot CRM Card endpoint for Activity Quality Score
 * 
 * This endpoint is called by HubSpot when viewing a contact/company/deal
 * to display the Activity Quality card in the sidebar.
 */
router.get('/activity-quality', asyncHandler(async (req: Request, res: Response) => {
  // Parse HubSpot request parameters
  const request: CRMCardRequest = {
    portalId: req.query.portalId as string,
    associatedObjectId: req.query.associatedObjectId as string,
    associatedObjectType: req.query.associatedObjectType as 'CONTACT' | 'COMPANY' | 'DEAL',
    userId: req.query.userId as string,
    userEmail: req.query.userEmail as string,
  };

  // Get cached analysis for this object
  const analysis = getCachedAnalysis(
    request.portalId,
    request.associatedObjectType,
    request.associatedObjectId
  );

  // Build CRM card response
  const cardResponse = hubspotService.buildCRMCardResponse(request, analysis);

  res.json(cardResponse);
}));

/**
 * GET /crm-card/sentiment-details
 * HubSpot CRM Card endpoint for detailed sentiment analysis
 */
router.get('/sentiment-details', asyncHandler(async (req: Request, res: Response) => {
  const request: CRMCardRequest = {
    portalId: req.query.portalId as string,
    associatedObjectId: req.query.associatedObjectId as string,
    associatedObjectType: req.query.associatedObjectType as 'CONTACT' | 'COMPANY' | 'DEAL',
  };

  const analysis = getCachedAnalysis(
    request.portalId,
    request.associatedObjectType,
    request.associatedObjectId
  );

  if (!analysis) {
    res.json({
      results: [{
        objectId: parseInt(request.associatedObjectId),
        title: 'Sentiment Analysis',
        properties: [
          {
            label: 'Status',
            dataType: 'STRING',
            value: 'No sentiment data available',
          },
        ],
      }],
    });
    return;
  }

  res.json({
    results: [{
      objectId: parseInt(request.associatedObjectId),
      title: `Sentiment: ${analysis.sentiment.overallSentiment.toUpperCase()}`,
      properties: [
        {
          label: 'Score',
          dataType: 'NUMBER',
          value: analysis.sentiment.sentimentScore,
        },
        {
          label: 'Confidence',
          dataType: 'NUMBER',
          value: Math.round(analysis.sentiment.confidence * 100),
        },
        {
          label: 'Emotional Tone',
          dataType: 'STRING',
          value: analysis.sentiment.emotionalTone.primary,
        },
        {
          label: 'Tone Intensity',
          dataType: 'NUMBER',
          value: Math.round(analysis.sentiment.emotionalTone.intensity * 100),
        },
        {
          label: 'Urgency',
          dataType: 'STATUS',
          value: formatUrgency(analysis.sentiment.urgencyLevel),
        },
        {
          label: 'Key Phrases',
          dataType: 'STRING',
          value: analysis.sentiment.keyPhrases
            .slice(0, 3)
            .map(kp => kp.phrase)
            .join(', ') || 'None identified',
        },
      ],
    }],
  });
}));

/**
 * GET /crm-card/objections
 * HubSpot CRM Card endpoint for objection details
 */
router.get('/objections', asyncHandler(async (req: Request, res: Response) => {
  const request: CRMCardRequest = {
    portalId: req.query.portalId as string,
    associatedObjectId: req.query.associatedObjectId as string,
    associatedObjectType: req.query.associatedObjectType as 'CONTACT' | 'COMPANY' | 'DEAL',
  };

  const analysis = getCachedAnalysis(
    request.portalId,
    request.associatedObjectType,
    request.associatedObjectId
  );

  if (!analysis || !analysis.objections.hasObjections) {
    res.json({
      results: [{
        objectId: parseInt(request.associatedObjectId),
        title: 'Objection Detection',
        properties: [
          {
            label: 'Status',
            dataType: 'STRING',
            value: '✅ No objections detected',
          },
        ],
      }],
    });
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const properties: any[] = [
    {
      label: 'Overall Level',
      dataType: 'STATUS',
      value: formatObjectionLevel(analysis.objections.overallObjectionLevel),
    },
    {
      label: 'Count',
      dataType: 'NUMBER',
      value: analysis.objections.objections.length,
    },
  ];

  // Add each objection
  analysis.objections.objections.forEach((obj, index) => {
    properties.push({
      label: `Objection ${index + 1}`,
      dataType: 'STRING',
      value: `${obj.type}: "${obj.phrase}" (${Math.round(obj.confidence * 100)}% confidence)`,
    });
  });

  // Add suggested responses
  if (analysis.objections.suggestedResponses.length > 0) {
    properties.push({
      label: 'Suggested Response',
      dataType: 'STRING',
      value: analysis.objections.suggestedResponses[0].response,
    });
  }

  res.json({
    results: [{
      objectId: parseInt(request.associatedObjectId),
      title: `⚠️ ${analysis.objections.objections.length} Objection(s) Detected`,
      properties,
    }],
  });
}));

/**
 * GET /crm-card/next-steps
 * HubSpot CRM Card endpoint for recommended next steps
 */
router.get('/next-steps', asyncHandler(async (req: Request, res: Response) => {
  const request: CRMCardRequest = {
    portalId: req.query.portalId as string,
    associatedObjectId: req.query.associatedObjectId as string,
    associatedObjectType: req.query.associatedObjectType as 'CONTACT' | 'COMPANY' | 'DEAL',
  };

  const analysis = getCachedAnalysis(
    request.portalId,
    request.associatedObjectType,
    request.associatedObjectId
  );

  if (!analysis || analysis.nextSteps.length === 0) {
    res.json({
      results: [{
        objectId: parseInt(request.associatedObjectId),
        title: 'Recommended Next Steps',
        properties: [
          {
            label: 'Status',
            dataType: 'STRING',
            value: 'Analyze activities to get recommendations',
          },
        ],
      }],
    });
    return;
  }

  const properties = analysis.nextSteps.map((step, index) => ({
    label: `Step ${index + 1} (${step.priority})`,
    dataType: 'STRING',
    value: `${formatAction(step.action)} - ${step.reasoning} (${step.suggestedTimeline})`,
  }));

  res.json({
    results: [{
      objectId: parseInt(request.associatedObjectId),
      title: 'Recommended Next Steps',
      properties,
    }],
  });
}));

/**
 * Format urgency level for display
 */
function formatUrgency(level: string): string {
  const formats: Record<string, string> = {
    low: '🟢 Low',
    medium: '🟡 Medium',
    high: '🟠 High',
    critical: '🔴 Critical',
  };
  return formats[level] || level;
}

/**
 * Format objection level for display
 */
function formatObjectionLevel(level: string): string {
  const formats: Record<string, string> = {
    none: '✅ None',
    mild: '🟡 Mild',
    moderate: '🟠 Moderate',
    strong: '🔴 Strong',
  };
  return formats[level] || level;
}

/**
 * Format action for display
 */
function formatAction(action: string): string {
  const formats: Record<string, string> = {
    follow_up_call: '📞 Follow-up Call',
    send_email: '📧 Send Email',
    schedule_meeting: '📅 Schedule Meeting',
    send_proposal: '📄 Send Proposal',
    address_objection: '💬 Address Objection',
    provide_demo: '🖥️ Provide Demo',
    share_case_study: '📊 Share Case Study',
    escalate: '⬆️ Escalate',
    nurture: '🌱 Nurture',
    close_deal: '🎯 Close Deal',
    re_engage: '🔄 Re-engage',
  };
  return formats[action] || action;
}

export default router;
