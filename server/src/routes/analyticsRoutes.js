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

router.get('/student', requireAuth, async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const { StudentAnalyticsService } = await import('../services/studentAnalyticsService.js');
    const data = await StudentAnalyticsService.getStudentAnalytics(req.user.id);
    res.json({
      success: true,
      data
    });
  } catch (err) {
    next(err);
  }
});

// College Portal institution-scoped analytics (role-protected)
router.get('/college', requireAuth, requireRole(['college', 'platform_admin']), async (req, res, next) => {
  try {
    const { collegeAnalyticsService } = await import('../services/collegeAnalyticsService.js');
    const instId = req.user.institution_id || req.query.institutionId;
    const instName = req.user.institution || req.query.institutionName || 'National Institute of Technology';
    
    const data = collegeAnalyticsService.getCollegeAnalytics(instId, instName);
    res.json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
});

// Link student to college institution
router.post('/college/link', requireAuth, async (req, res, next) => {
  try {
    const { collegeAnalyticsService } = await import('../services/collegeAnalyticsService.js');
    const { studentId, institutionId } = req.body || {};
    const targetUserId = req.user.role === 'candidate' ? req.user.id : studentId;
    const targetInstId = institutionId || req.user.institution_id;

    if (!targetUserId || !targetInstId) {
      return res.status(400).json({ error: 'studentId and institutionId are required' });
    }

    const result = collegeAnalyticsService.linkStudentToInstitution(targetUserId, targetInstId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
