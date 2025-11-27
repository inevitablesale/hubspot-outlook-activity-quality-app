import { Router, Request, Response } from 'express';

const router = Router();

/**
 * GET /health
 * Health check endpoint
 */
router.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

/**
 * GET /health/ready
 * Readiness check endpoint
 */
router.get('/ready', (_req: Request, res: Response) => {
  // Add checks for external dependencies here
  const checks = {
    hubspotApi: true, // Would check HubSpot API connectivity in production
    database: true,   // Would check database connectivity in production
  };

  const isReady = Object.values(checks).every(v => v);

  res.status(isReady ? 200 : 503).json({
    ready: isReady,
    checks,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /health/live
 * Liveness check endpoint
 */
router.get('/live', (_req: Request, res: Response) => {
  res.json({
    live: true,
    timestamp: new Date().toISOString(),
  });
});

export default router;
