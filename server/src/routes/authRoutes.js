import { Router } from 'express';
import { authService } from '../services/authService.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { auth as authConfig, app as appConfig } from '../config/index.js';

const router = Router();

router.get('/mode', (req, res) => {
  res.json({
    mode: appConfig.mode,
    demoAuthEnabled: authConfig.enableDemoAuth,
    environment: appConfig.env,
    activeDatabase: 'sqlite'
  });
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password, orgId } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const result = await authService.login(email, password, orgId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/register', async (req, res, next) => {
  try {
    const { email, password, fullName, role } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const result = await authService.register({ email, password, fullName, role });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/google', async (req, res, next) => {
  try {
    const { email, fullName, avatarUrl, role } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: 'Google email is required' });
    }
    const result = await authService.getOrCreateGoogleSession({
      email,
      fullName,
      avatarUrl,
      role: role || 'student'
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});


router.post('/student-session', async (req, res, next) => {
  try {
    if (!authConfig.enableDemoAuth || appConfig.env === 'production') {
      return res.status(403).json({
        error: 'Demo session generation is disabled. Please authenticate using verified credentials.'
      });
    }

    const { id, email, fullName, institution, targetRole, bio } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanId = id || `usr-student-${cleanEmail.replace(/[^a-z0-9]/g, '-')}`;

    // Security check: Never issue a demo session for an account with verified password credentials in production
    const DEMO_STUDENT_EMAIL = 'student@sarathi.ai';
    const DEMO_STUDENT_ID = 'usr-student-demo';

    const existingUser = authService.findUserByEmailOrId(cleanEmail, cleanId);
    if (existingUser && existingUser.email !== DEMO_STUDENT_EMAIL && existingUser.id !== DEMO_STUDENT_ID) {
      return res.status(403).json({
        error: 'Cannot generate a demo session for an existing user account. Please authenticate with verified credentials.'
      });
    }

    const result = await authService.getOrCreateStudentSession({
      id: cleanId,
      email: cleanEmail,
      fullName,
      institution,
      targetRole,
      bio
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/recruiter-session', async (req, res, next) => {
  try {
    if (!authConfig.enableDemoAuth || appConfig.env === 'production') {
      return res.status(403).json({
        error: 'Demo session generation is disabled. Please authenticate using verified credentials.'
      });
    }

    const { email, orgId } = req.body || {};
    const DEMO_RECRUITER_EMAIL = 'recruiter@sarathi.ai';
    const DEMO_ORG_ID = 'org-demo-1';

    // Security check: Only the designated demo recruiter and demo organization are permitted
    if (email && email.toLowerCase().trim() !== DEMO_RECRUITER_EMAIL && email.toLowerCase().trim() !== 'recruiter@sarathi.local') {
      return res.status(403).json({
        error: 'Demo recruiter sessions can only be issued for the designated demo recruiter account.'
      });
    }

    if (orgId && orgId !== DEMO_ORG_ID) {
      return res.status(403).json({
        error: 'Demo recruiter sessions are restricted to the default demo organization.'
      });
    }

    const result = await authService.getOrCreateRecruiterSession({
      email: DEMO_RECRUITER_EMAIL,
      orgId: DEMO_ORG_ID
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await authService.getUserById(req.user.id);
    const orgs = await authService.getUserOrganizations(req.user.id);
    res.json({
      user,
      activeOrgId: req.orgId,
      organizations: orgs,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
