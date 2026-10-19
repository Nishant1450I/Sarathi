import { Router } from 'express';
import { z } from 'zod';
import { resourceService } from '../services/resourceService.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const progressSchema = z.object({
  status: z.enum(['not_started', 'in_progress', 'completed']),
  percentComplete: z.number().min(0).max(100).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

const bookmarkSchema = z.object({
  collectionName: z.string().max(50).optional().default('my_list'),
});

router.get('/', (req, res, next) => {
  try {
    const { domain, skill, isFree, level, status, collection, search, bookmarkedOnly } = req.query;
    const userId = req.user?.id || null;

    const resources = resourceService.listResources({
      domain: domain ? String(domain) : null,
      skill: skill ? String(skill) : null,
      isFree: isFree !== undefined ? isFree : null,
      level: level ? String(level) : null,
      status: status ? String(status) : null,
      collection: collection ? String(collection) : null,
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

router.get('/recommendations', requireAuth, (req, res, next) => {
  try {
    const { targetRole, domainId } = req.query;
    const recommendations = resourceService.getRecommendations(req.user.id, {
      targetRole: targetRole ? String(targetRole) : '',
      domainId: domainId ? String(domainId) : '',
    });

    res.json({
      success: true,
      data: recommendations,
      totalCount: recommendations.length,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/bookmark', requireAuth, (req, res, next) => {
  try {
    const { id } = req.params;
    const collectionName = req.body?.collectionName || 'my_list';
    const result = resourceService.toggleBookmark(req.user.id, id, collectionName);
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
    const { status, percentComplete, notes } = req.body;
    const result = resourceService.updateProgress(req.user.id, id, {
      status,
      percentComplete,
      notes,
    });
    res.json({
      success: true,
      data: result,
      message: `Progress updated to ${status}`,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/add-to-passport', requireAuth, (req, res, next) => {
  try {
    const { id } = req.params;
    const result = resourceService.addLearningEvidenceToPassport(req.user.id, id);
    res.json({
      success: true,
      data: result,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
