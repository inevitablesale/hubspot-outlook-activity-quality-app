import { Router, Response } from 'express';
import { activityQualityService } from '../services/activityQualityService';
import { hubspotService } from '../services/hubspotService';
import { asyncHandler, ApiError } from '../middleware/errorHandler';
import { validatePortalAuth, validateBody, AuthenticatedRequest } from '../middleware/auth';
import { OutlookEmail, OutlookMeeting, ActivityIngestionPayload, BatchIngestionPayload } from '../types/outlook';
import { ActivityAnalysisResult } from '../types/analysis';

const router = Router();

/**
 * In-memory storage for analyzed activities (replace with database in production)
 */
const analysisCache = new Map<string, ActivityAnalysisResult>();
const conversationHistory = new Map<string, OutlookEmail[]>();

/**
 * POST /ingest/email
 * Ingest and analyze a single email
 */
router.post('/email',
  validatePortalAuth,
  validateBody(['activity']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const payload: ActivityIngestionPayload = req.body;
    const portalId = req.portalId!;

    if (payload.activityType !== 'email') {
      throw new ApiError(400, 'Invalid activity type. Expected "email"');
    }

    const email = payload.activity as OutlookEmail;

    // Store in conversation history if conversationId exists
    if (email.conversationId) {
      const history = conversationHistory.get(email.conversationId) || [];
      history.push(email);
      conversationHistory.set(email.conversationId, history);
    }

    // Get conversation history for this email
    const history = email.conversationId
      ? conversationHistory.get(email.conversationId)
      : undefined;

    // Analyze the email
    const analysis = activityQualityService.calculateEmailScore(email, history);

    // Cache the analysis
    const cacheKey = `${portalId}:${payload.objectType}:${payload.objectId}`;
    analysisCache.set(cacheKey, analysis);

    // Update HubSpot properties if connected
    if (payload.objectType === 'contact' && hubspotService.isConnected(portalId)) {
      try {
        await hubspotService.updateActivityQualityProperties(
          portalId,
          payload.objectId,
          analysis
        );
      } catch (error) {
        console.error('Failed to update HubSpot properties:', error);
        // Don't fail the request if property update fails
      }
    }

    res.json({
      success: true,
      data: {
        analysisId: analysis.id,
        qualityScore: analysis.qualityScore.overallScore,
        grade: analysis.qualityScore.grade,
        sentiment: analysis.sentiment.overallSentiment,
        sentimentScore: analysis.sentiment.sentimentScore,
        objections: analysis.objections.hasObjections 
          ? analysis.objections.objections.length 
          : 0,
        nextStep: analysis.nextSteps[0]?.action,
        fullAnalysis: analysis,
      },
    });
  })
);

/**
 * POST /ingest/meeting
 * Ingest and analyze a single meeting
 */
router.post('/meeting',
  validatePortalAuth,
  validateBody(['activity']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const payload: ActivityIngestionPayload = req.body;
    const portalId = req.portalId!;

    if (payload.activityType !== 'meeting') {
      throw new ApiError(400, 'Invalid activity type. Expected "meeting"');
    }

    const meeting = payload.activity as OutlookMeeting;

    // Analyze the meeting
    const analysis = activityQualityService.calculateMeetingScore(meeting);

    // Cache the analysis
    const cacheKey = `${portalId}:${payload.objectType}:${payload.objectId}`;
    analysisCache.set(cacheKey, analysis);

    // Update HubSpot properties if connected
    if (payload.objectType === 'contact' && hubspotService.isConnected(portalId)) {
      try {
        await hubspotService.updateActivityQualityProperties(
          portalId,
          payload.objectId,
          analysis
        );
      } catch (error) {
        console.error('Failed to update HubSpot properties:', error);
      }
    }

    res.json({
      success: true,
      data: {
        analysisId: analysis.id,
        qualityScore: analysis.qualityScore.overallScore,
        grade: analysis.qualityScore.grade,
        sentiment: analysis.sentiment.overallSentiment,
        sentimentScore: analysis.sentiment.sentimentScore,
        attendeeCount: meeting.attendees.length,
        isCancelled: meeting.isCancelled,
        fullAnalysis: analysis,
      },
    });
  })
);

/**
 * POST /ingest/batch
 * Ingest and analyze multiple activities
 */
router.post('/batch',
  validatePortalAuth,
  validateBody(['activities']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const payload: BatchIngestionPayload = req.body;
    const portalId = req.portalId!;

    const results: Array<{
      objectId: string;
      objectType: string;
      activityType: string;
      success: boolean;
      analysisId?: string;
      qualityScore?: number;
      error?: string;
    }> = [];

    for (const activity of payload.activities) {
      try {
        let analysis: ActivityAnalysisResult;

        if (activity.activityType === 'email') {
          const email = activity.activity as OutlookEmail;
          
          // Store in conversation history
          if (email.conversationId) {
            const history = conversationHistory.get(email.conversationId) || [];
            history.push(email);
            conversationHistory.set(email.conversationId, history);
          }

          const history = email.conversationId
            ? conversationHistory.get(email.conversationId)
            : undefined;

          analysis = activityQualityService.calculateEmailScore(email, history);
        } else {
          const meeting = activity.activity as OutlookMeeting;
          analysis = activityQualityService.calculateMeetingScore(meeting);
        }

        // Cache the analysis
        const cacheKey = `${portalId}:${activity.objectType}:${activity.objectId}`;
        analysisCache.set(cacheKey, analysis);

        results.push({
          objectId: activity.objectId,
          objectType: activity.objectType,
          activityType: activity.activityType,
          success: true,
          analysisId: analysis.id,
          qualityScore: analysis.qualityScore.overallScore,
        });
      } catch (error) {
        results.push({
          objectId: activity.objectId,
          objectType: activity.objectType,
          activityType: activity.activityType,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    res.json({
      success: true,
      data: {
        total: payload.activities.length,
        successful: successCount,
        failed: payload.activities.length - successCount,
        results,
      },
    });
  })
);

/**
 * GET /ingest/analysis/:objectType/:objectId
 * Get cached analysis for an object
 */
router.get('/analysis/:objectType/:objectId',
  validatePortalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { objectType, objectId } = req.params;
    const portalId = req.portalId!;

    const cacheKey = `${portalId}:${objectType}:${objectId}`;
    const analysis = analysisCache.get(cacheKey);

    if (!analysis) {
      throw new ApiError(404, 'No analysis found for this object');
    }

    res.json({
      success: true,
      data: analysis,
    });
  })
);

export default router;
