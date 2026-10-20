import { Router } from 'express';
import { pipelineService } from '../services/pipelineService.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import { repository } from '../data/repository.js';

const router = Router();

const RECRUITER_ROLES = ['platform_admin', 'org_owner', 'recruiter', 'hiring_manager'];

// Student-facing application submission (server-derived candidate identity)
router.post('/apply', requireAuth, (req, res, next) => {
  try {
    const { jobId, coverNote } = req.body;
    if (!jobId) {
      return res.status(400).json({ error: 'jobId is required' });
    }

    if (req.user.globalRole !== 'candidate' && req.user.globalRole !== 'student') {
      return res.status(403).json({ error: 'Only student candidates can submit job applications' });
    }

    // Applicant identity strictly derived from validated token
    const candidateId = req.user.id;

    // Verify job exists, is published, and not deleted
    const job = repository.queryOne(
      'SELECT id, org_id, status FROM jobs WHERE id = ? AND deleted_at IS NULL;',
      [jobId]
    );

    if (!job) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    if (job.status !== 'published') {
      return res.status(400).json({ error: 'This opportunity is not currently open for applications' });
    }

    // Prevent duplicate application
    const existing = repository.queryOne(
      'SELECT id, applied_at, stage FROM applications WHERE job_id = ? AND candidate_id = ?;',
      [jobId, candidateId]
    );
    if (existing) {
      return res.status(409).json({
        error: 'You have already submitted an application for this position',
        applicationId: existing.id,
        appliedAt: existing.applied_at,
        stage: existing.stage
      });
    }

    const app = pipelineService.createApplication(job.org_id, jobId, candidateId, coverNote || '');
    res.status(201).json({
      success: true,
      message: 'Application submitted successfully to hiring team',
      data: app,
      application: app
    });
  } catch (err) {
    if (err.message && err.message.includes('already applied')) {
      return res.status(409).json({ error: 'You have already submitted an application for this position' });
    }
    next(err);
  }
});

// Student-facing list of their submitted applications with live stages and history
router.get('/my-applications', requireAuth, (req, res, next) => {
  try {
    if (req.user.globalRole !== 'candidate' && req.user.globalRole !== 'student') {
      return res.status(403).json({ error: 'Only student candidates can view student applications' });
    }
    const apps = repository.query(
      `SELECT a.*,
              j.title as job_title, j.location, j.work_arrangement, j.employment_type as job_type,
              j.experience_level, j.salary_min, j.salary_max, j.currency,
              o.name as company_name
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       JOIN organisations o ON o.id = a.org_id
       WHERE a.candidate_id = ?
       ORDER BY a.applied_at DESC;`,
      [req.user.id]
    );

    // Attach stage timeline history for each application
    const enrichedApps = apps.map((app) => {
      const stageHistory = repository.query(
        `SELECT ash.id, ash.from_stage, ash.to_stage, ash.reason, ash.created_at
         FROM application_stage_history ash
         WHERE ash.application_id = ?
         ORDER BY ash.created_at ASC;`,
        [app.id]
      );
      return {
        ...app,
        stageHistory
      };
    });

    res.json({
      success: true,
      data: enrichedApps
    });
  } catch (err) {
    next(err);
  }
});

// Recruiter: get all applications for active organization with rich search, filters, and sort
router.get('/applications', requireAuth, requireRole(RECRUITER_ROLES), (req, res, next) => {
  try {
    const orgId = req.user.orgId || req.orgId;
    const {
      jobId, stage, search, skills, verifiedOnly,
      cgpaMin, cgpaMax, gradYear, college, location,
      minScore, maxScore, tags, sortBy, sortOrder,
      limit, offset
    } = req.query;

    const apps = pipelineService.getApplications(orgId, {
      jobId,
      stage,
      search,
      skills,
      verifiedOnly: verifiedOnly === 'true' || verifiedOnly === true,
      cgpaMin,
      cgpaMax,
      gradYear,
      college,
      location,
      minScore,
      maxScore,
      tags,
      sortBy,
      sortOrder,
      limit,
      offset
    });
    res.json(apps);
  } catch (err) {
    next(err);
  }
});

// Recruiter: bulk stage transitions with audit tracking
router.patch('/applications/bulk-stage', requireAuth, requireRole(RECRUITER_ROLES), (req, res, next) => {
  try {
    const orgId = req.user.orgId || req.orgId;
    const { applicationIds, targetStage, reason, actorType } = req.body;
    if (!applicationIds || !targetStage) {
      return res.status(400).json({ error: 'applicationIds and targetStage are required' });
    }

    const result = pipelineService.bulkUpdateStage(
      orgId,
      applicationIds,
      targetStage,
      req.user.id,
      reason || '',
      actorType || 'human'
    );
    res.json(result);
  } catch (err) {
    if (err.message && err.message.includes('Invalid target stage')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

// Recruiter: bulk tag applications (add or remove)
router.post('/applications/bulk-tag', requireAuth, requireRole(RECRUITER_ROLES), (req, res, next) => {
  try {
    const orgId = req.user.orgId || req.orgId;
    const { applicationIds, tags, action } = req.body;
    if (!applicationIds || !tags) {
      return res.status(400).json({ error: 'applicationIds and tags are required' });
    }

    const result = pipelineService.bulkTagApplications(
      orgId,
      applicationIds,
      tags,
      action || 'add'
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Recruiter: compare 2 to 4 candidates side-by-side
router.post('/applications/compare', requireAuth, requireRole(RECRUITER_ROLES), (req, res, next) => {
  try {
    const orgId = req.user.orgId || req.orgId;
    const { applicationIds } = req.body;
    if (!applicationIds || !Array.isArray(applicationIds)) {
      return res.status(400).json({ error: 'applicationIds array is required' });
    }

    const result = pipelineService.compareApplications(orgId, applicationIds);
    res.json(result);
  } catch (err) {
    if (err.message && err.message.includes('Compare requires')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

// Recruiter: get 5-factor match score breakdown
router.get('/applications/:id/match-breakdown', requireAuth, requireRole(RECRUITER_ROLES), (req, res, next) => {
  try {
    const orgId = req.user.orgId || req.orgId;
    const breakdown = pipelineService.getMatchBreakdown(orgId, req.params.id);
    if (!breakdown) return res.status(404).json({ error: 'Application not found' });
    res.json(breakdown);
  } catch (err) {
    next(err);
  }
});

// Recruiter: get stage audit history
router.get('/applications/:id/audit', requireAuth, requireRole(RECRUITER_ROLES), (req, res, next) => {
  try {
    const orgId = req.user.orgId || req.orgId;
    const audit = pipelineService.getApplicationAudit(orgId, req.params.id);
    if (!audit) return res.status(404).json({ error: 'Application not found' });
    res.json(audit);
  } catch (err) {
    next(err);
  }
});

// Recruiter: get single application details
router.get('/applications/:id', requireAuth, requireRole(RECRUITER_ROLES), (req, res, next) => {
  try {
    const orgId = req.user.orgId || req.orgId;
    const app = pipelineService.getApplicationById(orgId, req.params.id);
    if (!app) return res.status(404).json({ error: 'Application not found in current organization' });
    res.json(app);
  } catch (err) {
    next(err);
  }
});

// Recruiter: manually record/create an application
router.post('/applications', requireAuth, requireRole(RECRUITER_ROLES), (req, res, next) => {
  try {
    const orgId = req.user.orgId || req.orgId;
    const { jobId, candidateId, coverNote } = req.body;
    if (!jobId || !candidateId) {
      return res.status(400).json({ error: 'jobId and candidateId are required' });
    }
    const app = pipelineService.createApplication(orgId, jobId, candidateId, coverNote || '');
    res.status(201).json(app);
  } catch (err) {
    if (err.message && err.message.includes('already applied')) {
      return res.status(409).json({ error: err.message });
    }
    next(err);
  }
});

// Recruiter: advance or update single application stage
router.patch('/applications/:id/stage', requireAuth, requireRole(RECRUITER_ROLES), (req, res, next) => {
  try {
    const orgId = req.user.orgId || req.orgId;
    const { stage, reason } = req.body;
    if (!stage) {
      return res.status(400).json({ error: 'Target stage is required' });
    }

    const app = pipelineService.updateStage(orgId, req.params.id, stage, req.user.id, reason || '');
    res.json(app);
  } catch (err) {
    if (err.message && (err.message.includes('Invalid stage transition') || err.message.includes('Invalid pipeline stage'))) {
      return res.status(400).json({ error: err.message });
    }
    if (err.message && err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
});

// Recruiter: saved views
router.get('/saved-views', requireAuth, requireRole(RECRUITER_ROLES), (req, res, next) => {
  try {
    const orgId = req.user.orgId || req.orgId;
    const views = pipelineService.getSavedViews(orgId, req.user.id);
    res.json(views);
  } catch (err) {
    next(err);
  }
});

router.post('/saved-views', requireAuth, requireRole(RECRUITER_ROLES), (req, res, next) => {
  try {
    const orgId = req.user.orgId || req.orgId;
    const view = pipelineService.createSavedView(orgId, req.user.id, req.body);
    res.status(201).json(view);
  } catch (err) {
    next(err);
  }
});

router.delete('/saved-views/:id', requireAuth, requireRole(RECRUITER_ROLES), (req, res, next) => {
  try {
    const orgId = req.user.orgId || req.orgId;
    const result = pipelineService.deleteSavedView(orgId, req.user.id, req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Recruiter: add internal candidate note
router.post('/notes', requireAuth, requireRole(RECRUITER_ROLES), (req, res, next) => {
  try {
    const orgId = req.user.orgId || req.orgId;
    const { candidateId, note, jobId, isPrivate } = req.body;
    const result = pipelineService.addRecruiterNote(orgId, candidateId, req.user.id, note, jobId, isPrivate);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// Recruiter: view shortlists
router.get('/shortlists', requireAuth, requireRole(RECRUITER_ROLES), (req, res, next) => {
  try {
    const orgId = req.user.orgId || req.orgId;
    const lists = pipelineService.getShortlists(orgId);
    res.json(lists);
  } catch (err) {
    next(err);
  }
});

router.get('/shortlists/:id/members', requireAuth, requireRole(RECRUITER_ROLES), (req, res, next) => {
  try {
    const orgId = req.user?.orgId;
    if (!orgId) {
      return res.status(403).json({ error: 'Organization context required' });
    }
    const members = pipelineService.getShortlistMembers(req.params.id, orgId);
    if (members === null) {
      return res.status(404).json({ error: 'Shortlist not found' });
    }
    res.json(members);
  } catch (err) {
    next(err);
  }
});

router.post('/shortlists', requireAuth, requireRole(RECRUITER_ROLES), (req, res, next) => {
  try {
    const orgId = req.user?.orgId || req.orgId;
    const list = pipelineService.createShortlist(orgId, req.user.id, req.body);
    res.status(201).json(list);
  } catch (err) {
    next(err);
  }
});

router.post('/shortlists/:id/members', requireAuth, requireRole(RECRUITER_ROLES), (req, res, next) => {
  try {
    const orgId = req.user?.orgId;
    if (!orgId) {
      return res.status(403).json({ error: 'Organization context required' });
    }
    const { candidateId, notes } = req.body;
    const result = pipelineService.toggleShortlistMember(req.params.id, orgId, candidateId, req.user.id, notes);
    if (result === null) {
      return res.status(404).json({ error: 'Shortlist not found' });
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
