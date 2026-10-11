import { Router } from 'express';
import { analyticsService } from '../services/analyticsService.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

const ANALYTICS_VIEW_ROLES = ['platform_admin', 'org_owner', 'recruiter', 'hiring_manager'];

router.get('/dashboard', requireAuth, requireRole(ANALYTICS_VIEW_ROLES), (req, res, next) => {
  try {
    if (!req.orgId) {
      return res.status(403).json({ error: 'Organization context required' });
    }
    const data = analyticsService.getDashboardMetrics(req.orgId);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
