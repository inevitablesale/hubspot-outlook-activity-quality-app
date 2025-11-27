import { Router, Response } from 'express';
import { sentimentService } from '../services/sentimentService';
import { objectionService } from '../services/objectionService';
import { activityQualityService } from '../services/activityQualityService';
import { asyncHandler, ApiError } from '../middleware/errorHandler';
import { validateBody } from '../middleware/auth';
import { OutlookEmail, OutlookMeeting } from '../types/outlook';
import { Request } from 'express';

const router = Router();

/**
 * POST /analyze/sentiment
 * Analyze sentiment of provided text
 */
router.post('/sentiment',
  validateBody(['text']),
  asyncHandler(async (req: Request, res: Response) => {
    const { text } = req.body;

    if (typeof text !== 'string' || text.trim().length === 0) {
      throw new ApiError(400, 'Text must be a non-empty string');
    }

    const analysis = sentimentService.analyze(text);

    res.json({
      success: true,
      data: analysis,
    });
  })
);

/**
 * POST /analyze/sentiment/raw
 * Get raw sentiment scores
 */
router.post('/sentiment/raw',
  validateBody(['text']),
  asyncHandler(async (req: Request, res: Response) => {
    const { text } = req.body;

    if (typeof text !== 'string' || text.trim().length === 0) {
      throw new ApiError(400, 'Text must be a non-empty string');
    }

    const analysis = sentimentService.analyzeRaw(text);

    res.json({
      success: true,
      data: analysis,
    });
  })
);

/**
 * POST /analyze/sentiment/compare
 * Compare sentiment between two texts
 */
router.post('/sentiment/compare',
  validateBody(['text1', 'text2']),
  asyncHandler(async (req: Request, res: Response) => {
    const { text1, text2 } = req.body;

    if (typeof text1 !== 'string' || typeof text2 !== 'string') {
      throw new ApiError(400, 'Both text1 and text2 must be strings');
    }

    const comparison = sentimentService.compareSentiment(text1, text2);

    res.json({
      success: true,
      data: comparison,
    });
  })
);

/**
 * POST /analyze/objections
 * Detect objections in provided text
 */
router.post('/objections',
  validateBody(['text']),
  asyncHandler(async (req: Request, res: Response) => {
    const { text } = req.body;

    if (typeof text !== 'string' || text.trim().length === 0) {
      throw new ApiError(400, 'Text must be a non-empty string');
    }

    const objections = objectionService.detect(text);

    res.json({
      success: true,
      data: objections,
    });
  })
);

/**
 * POST /analyze/objections/conversation
 * Analyze objections across multiple conversation messages
 */
router.post('/objections/conversation',
  validateBody(['messages']),
  asyncHandler(async (req: Request, res: Response) => {
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      throw new ApiError(400, 'Messages must be a non-empty array of strings');
    }

    const objections = objectionService.analyzeConversation(messages);

    res.json({
      success: true,
      data: objections,
    });
  })
);

/**
 * POST /analyze/email
 * Full analysis of an email
 */
router.post('/email',
  validateBody(['email']),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, conversationHistory: history } = req.body;

    // Validate email structure
    if (!email || !email.id || !email.subject || !email.from) {
      throw new ApiError(400, 'Invalid email structure. Required: id, subject, from');
    }

    const analysis = activityQualityService.calculateEmailScore(
      email as OutlookEmail,
      history as OutlookEmail[] | undefined
    );

    res.json({
      success: true,
      data: analysis,
    });
  })
);

/**
 * POST /analyze/meeting
 * Full analysis of a meeting
 */
router.post('/meeting',
  validateBody(['meeting']),
  asyncHandler(async (req: Request, res: Response) => {
    const { meeting } = req.body;

    // Validate meeting structure
    if (!meeting || !meeting.id || !meeting.subject || !meeting.start || !meeting.end) {
      throw new ApiError(400, 'Invalid meeting structure. Required: id, subject, start, end');
    }

    const analysis = activityQualityService.calculateMeetingScore(
      meeting as OutlookMeeting
    );

    res.json({
      success: true,
      data: analysis,
    });
  })
);

/**
 * POST /analyze/batch
 * Batch analysis of multiple texts
 */
router.post('/batch',
  validateBody(['items']),
  asyncHandler(async (req: Request, res: Response) => {
    const { items, type } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      throw new ApiError(400, 'Items must be a non-empty array');
    }

    const results = items.map((item, index) => {
      try {
        if (type === 'sentiment') {
          return {
            index,
            success: true,
            data: sentimentService.analyze(item),
          };
        } else if (type === 'objections') {
          return {
            index,
            success: true,
            data: objectionService.detect(item),
          };
        } else {
          // Default to sentiment
          return {
            index,
            success: true,
            data: sentimentService.analyze(item),
          };
        }
      } catch (error) {
        return {
          index,
          success: false,
          error: error instanceof Error ? error.message : 'Analysis failed',
        };
      }
    });

    res.json({
      success: true,
      data: {
        total: items.length,
        successful: results.filter(r => r.success).length,
        results,
      },
    });
  })
);

export default router;
