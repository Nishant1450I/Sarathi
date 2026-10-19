import express from 'express';
import helmet from 'helmet';
import { app as appConfig, corsOrigins, validateConfig, assessmentV2 } from './config/index.js';
import { runMigrations } from './data/migrate.mjs';
import { authenticate } from './middleware/authMiddleware.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/authRoutes.js';
import taxonomyRoutes from './routes/taxonomyRoutes.js';
import jobRoutes from './routes/jobRoutes.js';
import candidateRoutes from './routes/candidateRoutes.js';
import verificationRoutes from './routes/verificationRoutes.js';
import assessmentRoutes from './routes/assessmentRoutes.js';
import assessmentV2Routes from './routes/assessmentV2Routes.js';
import pipelineRoutes from './routes/pipelineRoutes.js';
import interviewRoutes from './routes/interviewRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import organizationRoutes from './routes/organizationRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import roadmapRoutes from './routes/roadmapRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import resourceRoutes from './routes/resourceRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import feedbackRoutes from './routes/feedbackRoutes.js';
import passportShareRoutes from './routes/passportShareRoutes.js';
import resumeRoutes from './routes/resumeRoutes.js';
import skillEngineRoutes from './routes/skillEngineRoutes.js';
import recruiterVerificationRoutes from './routes/recruiterVerificationRoutes.js';

// Validate configuration on startup
validateConfig();

// Run database migrations on start
try {
  runMigrations();
} catch (err) {
  console.error('Migration error at startup:', err);
}

const app = express();

// Security headers
const isProduction = appConfig.env === 'production' && appConfig.mode !== 'demo';
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: isProduction ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://www.youtube.com', 'https://s.ytimg.com'],
      frameSrc: ["'self'", 'https://www.youtube.com', 'https://www.youtube-nocookie.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'https://i.ytimg.com'],
      connectSrc: ["'self'", 'https://www.youtube.com'],
      styleSrc: ["'self'", "'unsafe-inline'"],
    }
  } : false,
}));

// CORS middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const isDevOrDemo = appConfig.env !== 'production' || appConfig.mode === 'demo';
  if (!origin || corsOrigins.includes(origin) || corsOrigins.includes('*') || isDevOrDemo) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-org-id');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json({ limit: '5mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'sarathi-recruiter-api', timestamp: new Date().toISOString() });
});

// Global authentication & tenant context resolution
app.use(authenticate);

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/taxonomy', taxonomyRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/verifications', verificationRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/assessments/v2', (req, res, next) => {
  if (!assessmentV2.enabled && process.env.ASSESSMENT_V2_ENABLED !== 'true') {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'V2 Assessment Engine is disabled' } });
  }
  return assessmentV2Routes(req, res, next);
});
app.use('/api/pipeline', pipelineRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/organization', organizationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/roadmap', roadmapRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/passport', passportShareRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/skills', skillEngineRoutes);
app.use('/api/recruiter/verify', recruiterVerificationRoutes);

import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

// Error handling middleware
app.use(errorHandler);

let server = null;
const isDirectRun = Boolean(process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url));
const isTest = Boolean(process.env.NODE_TEST_CONTEXT || process.env.NODE_ENV === 'test' || process.argv.some(a => a.includes('--test')));

if (isDirectRun || !isTest) {
  server = app.listen(appConfig.port, appConfig.host, async () => {
    console.log(`SARATHI Recruiter API listening at http://${appConfig.host}:${appConfig.port}`);
    try {
      const { detectPythonExecutable } = await import('./services/runner/pythonDriver.js');
      const pyPath = await detectPythonExecutable();
      if (pyPath) {
        console.log(`[Assessment Runner] Python 3 runtime detected: ${pyPath}`);
      } else {
        console.warn(`[Assessment Runner] Python 3 runtime NOT detected on server.`);
      }
    } catch {}
  });
}

export { server };
export default app;
