import fs from 'fs';
import path from 'path';

const routeFiles = [
  { prefix: '/api/auth', file: 'server/src/routes/authRoutes.js' },
  { prefix: '/api/taxonomy', file: 'server/src/routes/taxonomyRoutes.js' },
  { prefix: '/api/jobs', file: 'server/src/routes/jobRoutes.js' },
  { prefix: '/api/candidates', file: 'server/src/routes/candidateRoutes.js' },
  { prefix: '/api/verifications', file: 'server/src/routes/verificationRoutes.js' },
  { prefix: '/api/assessments', file: 'server/src/routes/assessmentRoutes.js' },
  { prefix: '/api/assessments/v2', file: 'server/src/routes/assessmentV2Routes.js' },
  { prefix: '/api/pipeline', file: 'server/src/routes/pipelineRoutes.js' },
  { prefix: '/api/interviews', file: 'server/src/routes/interviewRoutes.js' },
  { prefix: '/api/analytics', file: 'server/src/routes/analyticsRoutes.js' },
  { prefix: '/api/college', file: 'server/src/routes/collegeRoutes.js' },
  { prefix: '/api/organization', file: 'server/src/routes/organizationRoutes.js' },
  { prefix: '/api/chat', file: 'server/src/routes/chatRoutes.js' },
  { prefix: '/api/roadmap', file: 'server/src/routes/roadmapRoutes.js' },
  { prefix: '/api/settings', file: 'server/src/routes/settingsRoutes.js' },
  { prefix: '/api/resources', file: 'server/src/routes/resourceRoutes.js' },
  { prefix: '/api/notifications', file: 'server/src/routes/notificationRoutes.js' },
  { prefix: '/api/feedback', file: 'server/src/routes/feedbackRoutes.js' },
  { prefix: '/api/passport', file: 'server/src/routes/passportShareRoutes.js' },
  { prefix: '/api/resumes', file: 'server/src/routes/resumeRoutes.js' },
  { prefix: '/api/skills', file: 'server/src/routes/skillEngineRoutes.js' },
  { prefix: '/api/support', file: 'server/src/routes/supportRoutes.js' },
  { prefix: '/api/announcements', file: 'server/src/routes/announcementRoutes.js' },
  { prefix: '/api/admin', file: 'server/src/routes/admin/adminRoutes.js' },
  { prefix: '/api/admin/content', file: 'server/src/routes/admin/adminContentRoutes.js' },
  { prefix: '/api/admin/copilot', file: 'server/src/routes/admin/adminCopilotRoutes.js' },
  { prefix: '/api/admin/insights', file: 'server/src/routes/admin/adminInsightsRoutes.js' },
  { prefix: '/api/admin/support', file: 'server/src/routes/admin/adminSupportRoutes.js' },
  { prefix: '/api/admin/system', file: 'server/src/routes/admin/adminSystemRoutes.js' }
];

const routes = [];

for (const { prefix, file } of routeFiles) {
  if (!fs.existsSync(file)) continue;
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/router\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/i);
    if (match) {
      const method = match[1].toUpperCase();
      const sub = match[2];
      const fullPath = (prefix + (sub === '/' ? '' : sub)).replace(/\/+/g, '/');
      
      // Look for auth requirements in line or previous/surrounding lines
      const context = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 3)).join(' ');
      const requiresAuth = context.includes('requireAuth') || context.includes('authenticate') || context.includes('requireRole') || context.includes('requireAdmin');
      
      let roles = 'Any Authenticated';
      if (context.includes("requireRole('recruiter')") || context.includes('recruiter')) roles = 'recruiter, hiring_manager';
      if (context.includes("requireRole('candidate')") || context.includes('candidate')) roles = 'candidate';
      if (context.includes("requireRole('college')") || context.includes('college')) roles = 'college, placement_officer';
      if (context.includes('requireAdmin') || context.includes('platform_admin')) roles = 'platform_admin';
      if (fullPath.includes('/public') || fullPath.includes('/login') || fullPath.includes('/register') || fullPath.includes('/mode') || fullPath.includes('/google') || fullPath.includes('/passport/p/') || fullPath.includes('/health')) {
        roles = 'Public / Unauthenticated';
      }

      routes.push({ method, path: fullPath, file: path.basename(file), roles, line: i + 1 });
    }
  }
}

console.log(`Extracted ${routes.length} routes.`);
fs.writeFileSync('scratch/extracted_routes.json', JSON.stringify(routes, null, 2));
