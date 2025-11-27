import { Router, Response } from 'express';
import { hubspotService } from '../services/hubspotService';
import { asyncHandler, ApiError } from '../middleware/errorHandler';
import { validatePortalAuth, AuthenticatedRequest } from '../middleware/auth';
import { PropertyUpdate } from '../types/hubspot';

const router = Router();

/**
 * POST /properties/update
 * Update properties on a HubSpot object
 */
router.post('/update',
  validatePortalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const portalId = req.portalId!;
    const update: PropertyUpdate = req.body;

    if (!update.objectType || !update.objectId || !update.properties) {
      throw new ApiError(400, 'objectType, objectId, and properties are required');
    }

    if (!['contacts', 'companies', 'deals'].includes(update.objectType)) {
      throw new ApiError(400, 'objectType must be one of: contacts, companies, deals');
    }

    await hubspotService.updateProperties(portalId, update);

    res.json({
      success: true,
      message: 'Properties updated successfully',
    });
  })
);

/**
 * POST /properties/batch
 * Update properties on multiple HubSpot objects
 */
router.post('/batch',
  validatePortalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const portalId = req.portalId!;
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      throw new ApiError(400, 'updates must be a non-empty array');
    }

    const results = await Promise.allSettled(
      updates.map((update: PropertyUpdate) =>
        hubspotService.updateProperties(portalId, update)
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    res.json({
      success: true,
      data: {
        total: updates.length,
        successful,
        failed,
        results: results.map((r, i) => ({
          index: i,
          success: r.status === 'fulfilled',
          error: r.status === 'rejected' ? (r.reason as Error).message : undefined,
        })),
      },
    });
  })
);

/**
 * POST /properties/setup
 * Create custom Activity Quality properties in HubSpot
 */
router.post('/setup',
  validatePortalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const portalId = req.portalId!;

    await hubspotService.createActivityQualityProperties(portalId);

    res.json({
      success: true,
      message: 'Activity Quality properties created successfully',
    });
  })
);

/**
 * POST /properties/sync-quality-scores
 * Sync quality scores to HubSpot properties for a specific object
 */
router.post('/sync-quality-scores',
  validatePortalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const portalId = req.portalId!;
    const {
      objectType,
      objectId,
      qualityScore,
      sentimentScore,
      sentimentTrend,
      engagementLevel,
      objectionCount,
      recommendedAction,
      averageResponseTime,
    } = req.body;

    if (!objectType || !objectId) {
      throw new ApiError(400, 'objectType and objectId are required');
    }

    const properties: Record<string, string | number | boolean> = {};

    if (qualityScore !== undefined) {
      properties.activity_quality_score = qualityScore;
    }
    if (sentimentScore !== undefined) {
      properties.last_sentiment_score = sentimentScore;
    }
    if (sentimentTrend) {
      properties.sentiment_trend = sentimentTrend;
    }
    if (engagementLevel) {
      properties.engagement_level = engagementLevel;
    }
    if (objectionCount !== undefined) {
      properties.objection_count = objectionCount;
    }
    if (recommendedAction) {
      properties.recommended_action = recommendedAction;
    }
    if (averageResponseTime !== undefined) {
      properties.average_response_time_hours = averageResponseTime;
    }

    // Always update last analyzed timestamp
    properties.last_activity_analyzed = new Date().toISOString();

    await hubspotService.updateProperties(portalId, {
      objectType,
      objectId,
      properties,
    });

    res.json({
      success: true,
      message: 'Quality scores synced to HubSpot',
    });
  })
);

export default router;
