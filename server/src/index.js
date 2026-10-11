import express from 'express';
import { app as appConfig, corsOrigins, validateConfig } from './config/index.js';
import { runMigrations } from './data/migrate.mjs';
import { authenticate } from './middleware/authMiddleware.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/authRoutes.js';
import taxonomyRoutes from './routes/taxonomyRoutes.js';
import jobRoutes from './routes/jobRoutes.js';
import candidateRoutes from './routes/candidateRoutes.js';
import verificationRoutes from './routes/verificationRoutes.js';
import assessmentRoutes from './routes/assessmentRoutes.js';
import pipelineRoutes from './routes/pipelineRoutes.js';
import interviewRoutes from './routes/interviewRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import organizationRoutes from './routes/organizationRoutes.js';

// Validate configuration on startup
validateConfig();

// Run database migrations on start
try {
  runMigrations();
} catch (err) {
  console.error('Migration error at startup:', err);
}

const app = express();

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
app.use('/api/pipeline', pipelineRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/organization', organizationRoutes);

import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

// Error handling middleware
app.use(errorHandler);

let server = null;
const isDirectRun = Boolean(process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url));
const isTest = Boolean(process.env.NODE_TEST_CONTEXT || process.env.NODE_ENV === 'test' || process.argv.some(a => a.includes('--test')));

if (isDirectRun || !isTest) {
  server = app.listen(appConfig.port, appConfig.host, () => {
    console.log(`SARATHI Recruiter API listening at http://${appConfig.host}:${appConfig.port}`);
  });
}

export { server };
export default app;
