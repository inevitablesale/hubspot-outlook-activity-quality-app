import { Request, Response, NextFunction } from 'express';
import { hubspotService } from '../services/hubspotService';
import { ApiError } from './errorHandler';

/**
 * Extended Request interface with portal ID
 */
export interface AuthenticatedRequest extends Request {
  portalId?: string;
}

/**
 * Validate HubSpot portal authentication
 */
export function validatePortalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  const portalId = req.headers['x-hubspot-portal-id'] as string || req.query.portalId as string;

  if (!portalId) {
    return next(new ApiError(400, 'Portal ID is required'));
  }

  if (!hubspotService.isConnected(portalId)) {
    return next(new ApiError(401, 'Portal not authenticated. Please complete OAuth flow first.'));
  }

  req.portalId = portalId;
  next();
}

/**
 * Validate request body for required fields
 */
export function validateBody(requiredFields: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const missingFields = requiredFields.filter(field => {
      const value = getNestedValue(req.body, field);
      return value === undefined || value === null || value === '';
    });

    if (missingFields.length > 0) {
      return next(new ApiError(400, `Missing required fields: ${missingFields.join(', ')}`));
    }

    next();
  };
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current: unknown, key) => {
    if (current && typeof current === 'object') {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/**
 * Rate limiting middleware (simple in-memory implementation)
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function rateLimiter(
  maxRequests: number = 100,
  windowMs: number = 60000
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const key = req.ip || 'unknown';
    const now = Date.now();

    const record = requestCounts.get(key);

    if (!record || now > record.resetTime) {
      requestCounts.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (record.count >= maxRequests) {
      return next(new ApiError(429, 'Too many requests. Please try again later.'));
    }

    record.count++;
    next();
  };
}

/**
 * Request logging middleware
 */
export function requestLogger(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
}
