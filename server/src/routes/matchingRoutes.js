import { Router } from 'express';
import { z } from 'zod';
import { matchingService } from '../services/matchingService.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();
const RECRUITER_ROLES = ['platform_admin', 'org_owner', 'recruiter', 'hiring_manager'];

const shortlistSchema = z.object({
  applicationId: z.string().min(1, 'Application ID is required'),
  candidateId: z.string().min(1, 'Candidate ID is required'),
  jobId: z.string().min(1, 'Job ID is required'),
  reason: z.string().min(3, 'Shortlisting reason must be at least 3 characters'),
  note: z.string().optional().nullable(),
  shortlistId: z.string().optional().nullable(),
});

const compareSchema = z.object({
  jobId: z.string().min(1, 'Job ID is required'),
  candidateIds: z.array(z.string()).min(2, 'At least 2 candidates required').max(4, 'Maximum 4 candidates can be compared'),
});

const evaluateSchema = z.object({
  candidateId: z.string().optional().nullable(),
  forceRefresh: z.boolean().optional(),
});

/**
 * GET /api/matching/jobs/:jobId/candidates
 * Retrieve job-specific candidate applicants with explainable match breakdown,
 * skills coverage, experience alignment, and AI synthesis.
 */
router.get('/jobs/:jobId/candidates', requireAuth, requireRole(RECRUITER_ROLES), async (req, res, next) => {
  try {
    const orgId = req.user?.orgId || req.orgId;
    if (!orgId) {
      return res.status(403).json({ error: 'Organization context required' });
    }

    const { jobId } = req.params;
    const {
      minScore,
      stage,
      search,
      requiredSkill,
      sortBy,
      sortOrder,
      forceRefresh,
    } = req.query;

    const result = await matchingService.getJobCandidateMatches(orgId, jobId, {
      minScore: minScore ? Number(minScore) : 0,
      stage: stage ? String(stage) : 'all',
      search: search ? String(search) : '',
      requiredSkill: requiredSkill ? String(requiredSkill) : '',
      sortBy: sortBy ? String(sortBy) : 'match_score',
      sortOrder: sortOrder === 'asc' ? 'asc' : 'desc',
      forceRefresh: forceRefresh === 'true',
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    if (err.message && err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
});

/**
 * POST /api/matching/jobs/:jobId/evaluate
 * Force re-evaluation or calculate fresh AI insights for candidate(s).
 */
router.post('/jobs/:jobId/evaluate', requireAuth, requireRole(RECRUITER_ROLES), validateBody(evaluateSchema), async (req, res, next) => {
  try {
    const orgId = req.user?.orgId || req.orgId;
    if (!orgId) {
      return res.status(403).json({ error: 'Organization context required' });
    }

    const { jobId } = req.params;
    const { candidateId, forceRefresh = true } = req.body;

    if (candidateId) {
      const match = await matchingService.getOrComputeJobMatch(jobId, candidateId, { forceRefresh: true });
      return res.json({
        success: true,
        data: match,
      });
    }

    // Refresh all candidates on this job
    const result = await matchingService.getJobCandidateMatches(orgId, jobId, { forceRefresh: true });
    res.json({
      success: true,
      data: result,
      message: 'All candidates re-evaluated with fresh intelligence',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/matching/shortlist
 * Actionable shortlisting: moves application stage, logs recruiter note & decision reason,
 * and adds candidate to target/default shortlist.
 */
router.post('/shortlist', requireAuth, requireRole(RECRUITER_ROLES), validateBody(shortlistSchema), async (req, res, next) => {
  try {
    const orgId = req.user?.orgId || req.orgId;
    if (!orgId) {
      return res.status(403).json({ error: 'Organization context required' });
    }

    const { applicationId, candidateId, jobId, reason, note, shortlistId } = req.body;

    const result = await matchingService.shortlistCandidate(orgId, req.user.id, {
      applicationId,
      candidateId,
      jobId,
      reason,
      note: note || '',
      shortlistId: shortlistId || null,
    });

    res.json({
      success: true,
      data: result,
      message: 'Candidate shortlisted successfully',
    });
  } catch (err) {
    if (err.message && err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
});

/**
 * POST /api/matching/compare
 * Side-by-side comparison of 2-4 candidates for a specific job.
 */
router.post('/compare', requireAuth, requireRole(RECRUITER_ROLES), validateBody(compareSchema), async (req, res, next) => {
  try {
    const orgId = req.user?.orgId || req.orgId;
    if (!orgId) {
      return res.status(403).json({ error: 'Organization context required' });
    }

    const { jobId, candidateIds } = req.body;
    const result = await matchingService.compareJobCandidates(orgId, jobId, candidateIds);

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    if (err.message && err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
});

/**
 * GET /api/matching/jobs/:jobId/shortlisted
 * Review all candidates shortlisted for a specific job.
 */
router.get('/jobs/:jobId/shortlisted', requireAuth, requireRole(RECRUITER_ROLES), (req, res, next) => {
  try {
    const orgId = req.user?.orgId || req.orgId;
    if (!orgId) {
      return res.status(403).json({ error: 'Organization context required' });
    }

    const { jobId } = req.params;
    const list = matchingService.getShortlistedCandidatesForJob(orgId, jobId);

    res.json({
      success: true,
      data: list,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
