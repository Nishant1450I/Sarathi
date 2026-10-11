import { Router } from 'express';
import { candidateService } from '../services/candidateService.js';
import { matchingService } from '../services/matchingService.js';
import { skillGapService } from '../services/skillGapService.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

const CANDIDATE_VIEW_ROLES = ['platform_admin', 'org_owner', 'recruiter', 'hiring_manager', 'assessor'];

router.get('/', requireAuth, requireRole(CANDIDATE_VIEW_ROLES), (req, res, next) => {
  try {
    const {
      query,
      domainId,
      skillId,
      minProficiency,
      verificationStatus,
      minExperience,
      workPreference,
      jobId,
      sortBy,
      sortOrder,
      limit,
      offset,
    } = req.query;

    const result = candidateService.searchCandidates({
      query,
      domainId,
      skillId,
      minProficiency,
      verificationStatus,
      minExperience,
      workPreference,
      jobId,
      sortBy,
      sortOrder,
      limit,
      offset,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Authenticated candidate routes mounted before /:id parameter to prevent collision
router.get('/my-passport', requireAuth, (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (req.user.globalRole !== 'candidate') {
      return res.status(403).json({ error: 'Only candidates can access their personal passport' });
    }
    const { jobId } = req.query;
    const passport = candidateService.getCandidatePassport(req.user.id, jobId);
    if (!passport) {
      return res.status(404).json({ error: 'Candidate passport not found' });
    }
    res.json({
      success: true,
      data: passport
    });
  } catch (err) {
    next(err);
  }
});

router.post('/evidence', requireAuth, (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (req.user.globalRole !== 'candidate') {
      return res.status(403).json({ error: 'Only candidates can submit project evidence' });
    }
    const {
      title,
      description,
      repositoryUrl,
      liveDemoUrl,
      skillsDemonstrated,
      technologies,
      domainId
    } = req.body;

    const result = candidateService.submitCandidateEvidence({
      candidateId: req.user.id,
      title,
      description,
      repositoryUrl,
      liveDemoUrl,
      skillsDemonstrated,
      technologies,
      domainId
    });

    res.status(201).json({
      success: true,
      data: result,
      message: result.message
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/passport', requireAuth, requireRole(CANDIDATE_VIEW_ROLES), (req, res, next) => {
  try {
    const { jobId } = req.query;
    const passport = candidateService.getCandidatePassport(req.params.id, jobId);
    if (!passport) {
      return res.status(404).json({ error: 'Candidate profile not found' });
    }
    res.json(passport);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/match', requireAuth, requireRole(CANDIDATE_VIEW_ROLES), (req, res, next) => {
  try {
    const { jobId } = req.body;
    if (!jobId) {
      return res.status(400).json({ error: 'jobId is required in request body' });
    }
    const match = matchingService.calculateJobMatch(req.params.id, jobId);
    res.json(match);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/gap-analysis', requireAuth, requireRole(CANDIDATE_VIEW_ROLES), (req, res, next) => {
  try {
    const { jobId } = req.body;
    if (!jobId) {
      return res.status(400).json({ error: 'jobId is required in request body' });
    }
    const analysis = skillGapService.analyzeSkillGap(req.params.id, jobId);
    res.json(analysis);
  } catch (err) {
    next(err);
  }
});

router.post('/compare', requireAuth, requireRole(CANDIDATE_VIEW_ROLES), (req, res, next) => {
  try {
    const { candidateIds, jobId } = req.body;
    if (!Array.isArray(candidateIds) || candidateIds.length < 2 || candidateIds.length > 4) {
      return res.status(400).json({ error: 'Please provide between 2 and 4 candidateIds for comparison' });
    }

    const profiles = candidateIds.map(id => candidateService.getCandidatePassport(id, jobId));
    res.json({
      jobId: jobId || null,
      candidates: profiles.filter(Boolean),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
