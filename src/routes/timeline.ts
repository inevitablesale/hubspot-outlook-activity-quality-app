import { Router, Response } from 'express';
import { hubspotService } from '../services/hubspotService';
import { asyncHandler, ApiError } from '../middleware/errorHandler';
import { validatePortalAuth, AuthenticatedRequest } from '../middleware/auth';
import { TimelineEvent } from '../types/hubspot';

const router = Router();

/**
 * POST /timeline/event
 * Create a timeline event in HubSpot
 */
router.post('/event',
  validatePortalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const portalId = req.portalId!;
    const event: TimelineEvent = req.body;

    if (!event.eventTemplateId) {
      throw new ApiError(400, 'Event template ID is required');
    }

    if (!event.objectId && !event.email) {
      throw new ApiError(400, 'Either objectId or email is required');
    }

    await hubspotService.createTimelineEvent(portalId, event);

    res.json({
      success: true,
      message: 'Timeline event created successfully',
    });
  })
);

/**
 * POST /timeline/activity-analyzed
 * Create a timeline event for activity analysis
 * This is a convenience endpoint that creates a properly formatted timeline event
 */
router.post('/activity-analyzed',
  validatePortalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const portalId = req.portalId!;
    const {
      eventTemplateId,
      objectId,
      email,
      activityType,
      qualityScore,
      grade,
      sentiment,
      sentimentScore,
      objectionCount,
      nextStep,
    } = req.body;

    if (!eventTemplateId) {
      throw new ApiError(400, 'Event template ID is required');
    }

    const tokens: Record<string, string | number | boolean> = {
      activityType: activityType || 'unknown',
      qualityScore: qualityScore || 0,
      grade: grade || 'N/A',
      sentiment: sentiment || 'neutral',
      sentimentScore: sentimentScore || 50,
      objectionCount: objectionCount || 0,
      nextStep: nextStep || 'nurture',
    };

    const event: TimelineEvent = {
      eventTemplateId,
      objectId,
      email,
      tokens,
      timestamp: new Date().toISOString(),
    };

    await hubspotService.createTimelineEvent(portalId, event);

    res.json({
      success: true,
      message: 'Activity analyzed timeline event created',
    });
  })
);

/**
 * POST /timeline/objection-detected
 * Create a timeline event when an objection is detected
 */
router.post('/objection-detected',
  validatePortalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const portalId = req.portalId!;
    const {
      eventTemplateId,
      objectId,
      email,
      objectionType,
      objectionPhrase,
      suggestedResponse,
      confidence,
    } = req.body;

    if (!eventTemplateId) {
      throw new ApiError(400, 'Event template ID is required');
    }

    const tokens: Record<string, string | number | boolean> = {
      objectionType: objectionType || 'general',
      objectionPhrase: objectionPhrase || '',
      suggestedResponse: suggestedResponse || '',
      confidence: confidence || 0,
    };

    const event: TimelineEvent = {
      eventTemplateId,
      objectId,
      email,
      tokens,
      timestamp: new Date().toISOString(),
    };

    await hubspotService.createTimelineEvent(portalId, event);

    res.json({
      success: true,
      message: 'Objection detected timeline event created',
    });
  })
);

/**
 * POST /timeline/sentiment-change
 * Create a timeline event when sentiment significantly changes
 */
router.post('/sentiment-change',
  validatePortalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const portalId = req.portalId!;
    const {
      eventTemplateId,
      objectId,
      email,
      previousSentiment,
      currentSentiment,
      previousScore,
      currentScore,
      trend,
    } = req.body;

    if (!eventTemplateId) {
      throw new ApiError(400, 'Event template ID is required');
    }

    const tokens: Record<string, string | number | boolean> = {
      previousSentiment: previousSentiment || 'neutral',
      currentSentiment: currentSentiment || 'neutral',
      previousScore: previousScore || 50,
      currentScore: currentScore || 50,
      trend: trend || 'stable',
      changeAmount: Math.abs((currentScore || 50) - (previousScore || 50)),
    };

    const event: TimelineEvent = {
      eventTemplateId,
      objectId,
      email,
      tokens,
      timestamp: new Date().toISOString(),
    };

    await hubspotService.createTimelineEvent(portalId, event);

    res.json({
      success: true,
      message: 'Sentiment change timeline event created',
    });
  })
);

export default router;
