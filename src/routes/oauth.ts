import { Router, Request, Response } from 'express';
import { hubspotService } from '../services/hubspotService';
import { asyncHandler, ApiError } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * GET /oauth/authorize
 * Redirect to HubSpot OAuth authorization page
 */
router.get('/authorize', (_req: Request, res: Response) => {
  const state = uuidv4();
  
  // In production, store state in session for validation
  const authUrl = hubspotService.getAuthorizationUrl(state);
  
  res.redirect(authUrl);
});

/**
 * GET /oauth/callback
 * Handle OAuth callback from HubSpot
 */
router.get('/callback', asyncHandler(async (req: Request, res: Response) => {
  const { code, state } = req.query;

  if (!code || typeof code !== 'string') {
    throw new ApiError(400, 'Authorization code is required');
  }

  // In production, validate state parameter
  console.log('OAuth callback received with state:', state);

  try {
    const tokens = await hubspotService.exchangeCodeForTokens(code);
    
    // In production, redirect to app with success message
    res.json({
      success: true,
      message: 'Successfully connected to HubSpot',
      portalId: tokens.portalId,
    });
  } catch (error) {
    console.error('OAuth error:', error);
    throw new ApiError(500, 'Failed to complete OAuth flow');
  }
}));

/**
 * GET /oauth/status
 * Check connection status for a portal
 */
router.get('/status', (req: Request, res: Response) => {
  const portalId = req.query.portalId as string;

  if (!portalId) {
    throw new ApiError(400, 'Portal ID is required');
  }

  const isConnected = hubspotService.isConnected(portalId);

  res.json({
    success: true,
    connected: isConnected,
    portalId,
  });
});

/**
 * POST /oauth/disconnect
 * Disconnect a portal
 */
router.post('/disconnect', (req: Request, res: Response) => {
  const { portalId } = req.body;

  if (!portalId) {
    throw new ApiError(400, 'Portal ID is required');
  }

  hubspotService.disconnect(portalId);

  res.json({
    success: true,
    message: 'Successfully disconnected from HubSpot',
  });
});

/**
 * POST /oauth/refresh
 * Manually refresh access token
 */
router.post('/refresh', asyncHandler(async (req: Request, res: Response) => {
  const { portalId } = req.body;

  if (!portalId) {
    throw new ApiError(400, 'Portal ID is required');
  }

  try {
    await hubspotService.refreshAccessToken(portalId);
    
    res.json({
      success: true,
      message: 'Token refreshed successfully',
    });
  } catch {
    throw new ApiError(401, 'Failed to refresh token. Please re-authenticate.');
  }
}));

export default router;
