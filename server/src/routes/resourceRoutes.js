import { Router } from 'express';
import { z } from 'zod';
import { resourceService } from '../services/resourceService.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const progressSchema = z.object({
  status: z.enum(['not_started', 'in_progress', 'completed']),
});

router.get('/', (req, res, next) => {
  try {
    const { domain, skill, isFree, search, bookmarkedOnly } = req.query;
    const userId = req.user?.id || null;

    const resources = resourceService.listResources({
      domain: domain ? String(domain) : null,
      skill: skill ? String(skill) : null,
      isFree: isFree !== undefined ? isFree : null,
      search: search ? String(search) : '',
      bookmarkedOnly: bookmarkedOnly === 'true' || bookmarkedOnly === '1',
      userId,
    });

    res.json({
      success: true,
      data: resources,
      totalCount: resources.length,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/bookmark', requireAuth, (req, res, next) => {
  try {
    const { id } = req.params;
    const result = resourceService.toggleBookmark(req.user.id, id);
    res.json({
      success: true,
      data: result,
      message: result.bookmarked ? 'Resource bookmarked' : 'Bookmark removed',
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/progress', requireAuth, validateBody(progressSchema), (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const result = resourceService.updateProgress(req.user.id, id, status);
    res.json({
      success: true,
      data: result,
      message: `Progress updated to ${status}`,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
