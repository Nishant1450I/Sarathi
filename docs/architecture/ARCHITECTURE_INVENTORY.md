# SARATHI — Skill Intelligence & Recruitment Platform
## Comprehensive Code-Verified System Architecture Inventory

**Document Type:** Technical Architecture Audit & System Inventory  
**Target Path:** `docs/architecture/ARCHITECTURE_INVENTORY.md`  
**Authoritative Evidence Baseline:** SARATHI Repository Source Code, SQLite Schemas, Migration Logs, Test Suites, and Dependency Manifests  
**Status Taxonomy:**
- `[BUILT]` — Implementation exists, is actively registered, and is functional in the repository.
- `[PARTIAL]` — Implementation exists but is incomplete, optional, conditionally connected, mocked, or not operational in all environments.
- `[PLANNED]` — Explicitly planned or configured as future work in documentation/configuration, but not implemented.
- `NOT FOUND IN REPOSITORY` — Component or capability requested or implied does not exist anywhere in the repository.

---

## SECTION 1 — PORTALS AND USERS

SARATHI implements four distinct user portals plus a public-facing domain. Each portal is served as a Single Page Application (SPA) view tree mounted on dedicated route trees within `src/App.tsx`.

### 1.1 Portal Implementation Matrix

| Portal Name | Implementation Status | Base Route Prefix | Shell / Layout File | URL Routes (App.tsx) | Page Files in Repo | Roles Permitted | Frontend Route Guard File | Backend Authorization Mechanism | Backend Connection Status |
| :--- | :---: | :--- | :--- | :---: | :---: | :--- | :--- | :--- | :--- |
| **Public Domain** | `[BUILT]` | `/` | [`src/layouts/PublicLayout.tsx`](file:///C:/Users/Nishant/Documents/SARATHI/src/layouts/PublicLayout.tsx) | 8 | 7 | Public / Unauthenticated | None (Unprotected routes) | None (Public endpoints) / Optional Bearer | Real backend connection for auth, public passport, health, and metadata |
| **Student Portal** | `[BUILT]` | `/student` | [`src/layouts/StudentLayout.tsx`](file:///C:/Users/Nishant/Documents/SARATHI/src/layouts/StudentLayout.tsx) | 12 | 13 | `candidate` (`student`) | [`src/layouts/StudentLayout.tsx:L41-46`](file:///C:/Users/Nishant/Documents/SARATHI/src/layouts/StudentLayout.tsx#L41-L46) | `authenticate` + `requireAuth` (`candidate`) | Real backend (profiles, roadmaps, assessments, resume, evidence ledger) |
| **Recruiter Portal** | `[BUILT]` | `/recruiter` | [`src/layouts/RecruiterLayout.tsx`](file:///C:/Users/Nishant/Documents/SARATHI/src/layouts/RecruiterLayout.tsx) | 14 | 13 | `recruiter`, `org_owner`, `hiring_manager` | [`src/layouts/RecruiterLayout.tsx:L122-127`](file:///C:/Users/Nishant/Documents/SARATHI/src/layouts/RecruiterLayout.tsx#L122-L127) | `authenticate` + `requireAuth` + `requireRole(['recruiter', ...])` + Org scoping (`x-org-id`) | Real backend (jobs, candidate pipeline, scoring engine, verifications) |
| **College Portal** | `[BUILT]` | `/college` | [`src/layouts/CollegeLayout.tsx`](file:///C:/Users/Nishant/Documents/SARATHI/src/layouts/CollegeLayout.tsx) | 5 | 4 | `college`, `placement_officer`, `hod` | [`src/layouts/CollegeLayout.tsx:L84-89`](file:///C:/Users/Nishant/Documents/SARATHI/src/layouts/CollegeLayout.tsx#L84-L89) | `authenticate` + `requireAuth` + `requireRole(['college', ...])` + Institution scoping | Real backend (D-09 cohort analytics, drives, at-risk students, settings) |
| **Platform Admin** | `[BUILT]` | `/admin` | [`src/layouts/AdminLayout.tsx`](file:///C:/Users/Nishant/Documents/SARATHI/src/layouts/AdminLayout.tsx) | 12 | 12 | `platform_admin` | [`src/components/admin/RequireRole.tsx:L16-53`](file:///C:/Users/Nishant/Documents/SARATHI/src/components/admin/RequireRole.tsx#L16-L53) | `authenticate` + `requireAuth` + `requireRole(['platform_admin'])` + `adminLimiter` | Real backend (user controls, verification SLA, anti-cheat, system health, audit log) |
| **Reviewer Queue** *(Shared Sub-portal)* | `[BUILT]` | Embedded in `/recruiter` and `/college` | Shell inherited from parent layout | 2 | 1 | `recruiter`, `college`, `platform_admin` | Route-level mounting in `App.tsx` + Parent Layout guards | `authenticate` + `requireAuth` + Role check in `assessmentV2/reviewService.js` | Real backend (`/api/assessments/v2/review/queue` and `/review/decision`) |

### 1.2 Five Most Important Pages per Portal

1. **Student Portal (`/student`):**
   - **Dashboard:** `/student/dashboard` — [`src/pages/student/StudentDashboard.tsx`](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/student/StudentDashboard.tsx)
   - **Assessment Terminal:** `/student/assessment` — [`src/pages/student/AssessmentPage.tsx`](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/student/AssessmentPage.tsx)
   - **Skill Passport:** `/student/skill-passport` — [`src/pages/student/SkillPassportPage.tsx`](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/student/SkillPassportPage.tsx)
   - **Career Roadmap:** `/student/roadmap` — [`src/pages/student/RoadmapPage.tsx`](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/student/RoadmapPage.tsx)
   - **Project Evidence Manager:** `/student/projects` — [`src/pages/student/ProjectsPage.tsx`](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/student/ProjectsPage.tsx)

2. **Recruiter Portal (`/recruiter`):**
   - **Talent Overview Dashboard:** `/recruiter/dashboard` — [`src/pages/recruiter/RecruiterDashboard.tsx`](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/recruiter/RecruiterDashboard.tsx)
   - **Candidate Sourcing & Discovery:** `/recruiter/candidates` — [`src/pages/recruiter/RecruiterCandidatesPage.tsx`](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/recruiter/RecruiterCandidatesPage.tsx)
   - **Job Postings & Requirements:** `/recruiter/jobs` — [`src/pages/recruiter/RecruiterJobsPage.tsx`](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/recruiter/RecruiterJobsPage.tsx)
   - **Recruitment Pipeline Kanban:** `/recruiter/pipeline` — [`src/pages/recruiter/RecruiterPipelinePage.tsx`](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/recruiter/RecruiterPipelinePage.tsx)
   - **Skill Verification Review Desk:** `/recruiter/verifications` — [`src/pages/recruiter/RecruiterVerificationsPage.tsx`](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/recruiter/RecruiterVerificationsPage.tsx)

3. **College Portal (`/college`):**
   - **Placement Readiness Dashboard:** `/college/dashboard` — [`src/pages/college/CollegeDashboard.tsx`](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/college/CollegeDashboard.tsx)
   - **Campus Placement Drives:** `/college/drives` — [`src/pages/college/CollegeDrivesPage.tsx`](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/college/CollegeDrivesPage.tsx)
   - **At-Risk Cohort Interventions:** `/college/at-risk` — [`src/pages/college/CollegeAtRiskPage.tsx`](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/college/CollegeAtRiskPage.tsx)
   - **Institutional Configuration:** `/college/settings` — [`src/pages/college/CollegeSettingsPage.tsx`](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/college/CollegeSettingsPage.tsx)
   - **Proctored Assessment Queue:** `/college/assessments/queue` — [`src/pages/reviewer/ReviewerAssessmentQueuePage.tsx`](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/reviewer/ReviewerAssessmentQueuePage.tsx)

4. **Platform Admin Portal (`/admin`):**
   - **Executive System Dashboard:** `/admin` — [`src/pages/admin/AdminDashboardPage.tsx`](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/admin/AdminDashboardPage.tsx)
   - **Business Verification Approvals:** `/admin/approvals` — [`src/pages/admin/approvals/AdminApprovalsPage.tsx`](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/admin/approvals/AdminApprovalsPage.tsx)
   - **Anti-Cheat Integrity Console:** `/admin/integrity` — [`src/pages/admin/integrity/AdminIntegrityPage.tsx`](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/admin/integrity/AdminIntegrityPage.tsx)
   - **User Identity & Staff Administration:** `/admin/users` — [`src/pages/admin/users/AdminUsersPage.tsx`](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/admin/users/AdminUsersPage.tsx)
   - **Tamper-Evident SHA-256 Audit Trail:** `/admin/audit` — [`src/pages/admin/system/AdminAuditPage.tsx`](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/admin/system/AdminAuditPage.tsx)

5. **Public Pages:**
   - **Home / Landing Page:** `/` — [`src/pages/public/LandingPage.tsx`](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/public/LandingPage.tsx)
   - **Unified Authentication:** `/login` — [`src/pages/public/LoginPage.tsx`](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/public/LoginPage.tsx)
   - **New User Registration:** `/signup` — [`src/pages/public/SignupPage.tsx`](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/public/SignupPage.tsx)
   - **Dedicated Admin Authentication:** `/admin/login` — [`src/pages/public/AdminLoginPage.tsx`](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/public/AdminLoginPage.tsx)
   - **Public Verifiable Skill Passport:** `/passport/:publicId` — [`src/pages/public/PublicPassportPage.tsx`](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/public/PublicPassportPage.tsx)

### 1.3 Portal Page & Route Counting Methodology

To prevent ambiguity between file structure and browser navigation paths, counts are computed according to strict definitions:
1. **Registered Route Entries in [`src/App.tsx`](file:///C:/Users/Nishant/Documents/SARATHI/src/App.tsx):** 50 total `<Route>` elements.
   - 45 page-rendering routes.
   - 5 redirect/alias routes (`/student/analytics -> /student/dashboard`, `/recruiter/overview -> /recruiter/dashboard`, `/admin-login -> /admin/login`, and index redirects for `/student`, `/recruiter`, `/college`).
2. **Authoritative Page Components:** 48 unique top-level page components mounted by React Router.
3. **Subcomponent and Drawer Files inside `src/pages/`:** 38 non-page auxiliary UI files (e.g., [`ApprovalDrawer.tsx`](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/admin/approvals/ApprovalDrawer.tsx), [`CodeDiffViewer.tsx`](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/admin/integrity/CodeDiffViewer.tsx), [`ProjectFormModal.tsx`](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/student/ProjectFormModal.tsx)).
4. **Total Files under `src/pages/`:** 86 physical source files.
5. **Reviewer Role Separation:** The "Reviewer" role is not a distinct top-level portal; instead, the assessment review queue component [`ReviewerAssessmentQueuePage.tsx`](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/reviewer/ReviewerAssessmentQueuePage.tsx) is cross-mounted into both the Recruiter portal (`/recruiter/assessments/queue`) and College portal (`/college/assessments/queue`), while high-level integrity proctoring oversight is managed by `platform_admin` users in [`AdminIntegrityPage.tsx`](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/admin/integrity/AdminIntegrityPage.tsx).

---

## SECTION 2 — FRONTEND ARCHITECTURE

```
[Status Legend: [BUILT] (Operational in code) | [PARTIAL] (Partially connected or mocked) | [PLANNED] (Configured but pending)]
```

### 2.1 Core Framework & Toolchain `[BUILT]`
- **Framework:** React 19 (`react: ^19.2.8`, `react-dom: ^19.2.8`) — [`package.json:L29-30`](file:///C:/Users/Nishant/Documents/SARATHI/package.json#L29-L30)
- **Language:** TypeScript 6 (`typescript: ~6.0.2`, `tsconfig.json`, `tsconfig.app.json`)
- **Build Tool:** Vite 8 (`vite: ^8.3.0`, `@vitejs/plugin-react: ^6.1.1`) — [`vite.config.ts:L1-33`](file:///C:/Users/Nishant/Documents/SARATHI/vite.config.ts#L1-L33)
- **Linter & Formatter:** Oxlint (`oxlint: ^1.81.0`, `.oxlintrc.json`) + custom line length scripts
- **Package Manager:** npm (manifest lockfile `package-lock.json`)

### 2.2 Entry Points & Bootstrap `[BUILT]`
- **HTML Entry:** [`index.html`](file:///C:/Users/Nishant/Documents/SARATHI/index.html) (mounts `<div id="root"></div>`)
- **Client Bootstrap:** [`src/main.tsx`](file:///C:/Users/Nishant/Documents/SARATHI/src/main.tsx) (uses `createRoot` inside `StrictMode`)
- **Root Router & Layout Tree:** [`src/App.tsx`](file:///C:/Users/Nishant/Documents/SARATHI/src/App.tsx)

### 2.3 Routing & Navigation `[BUILT]`
- **Routing Library:** `react-router-dom` v7 (`react-router-dom: ^7.18.4`)
- **Router Type:** Client-side HTML5 History API (`<BrowserRouter>`)
- **Route Guards:**
  - Layout-level enforcement in `StudentLayout.tsx`, `RecruiterLayout.tsx`, `CollegeLayout.tsx` checking `user.role` and `user.roles`.
  - Component-level route guard [`src/components/admin/RequireRole.tsx`](file:///C:/Users/Nishant/Documents/SARATHI/src/components/admin/RequireRole.tsx) wrapping `/admin` with `allowedRoles={['platform_admin']}`.

### 2.4 State Management & Context Architecture `[BUILT]`
- **Global Auth Context:** [`src/context/AuthContext.tsx`](file:///C:/Users/Nishant/Documents/SARATHI/src/context/AuthContext.tsx) (session, credentials, portal switching, Google SSO).
- **Student Data Context:** [`src/context/StudentContext.tsx`](file:///C:/Users/Nishant/Documents/SARATHI/src/context/StudentContext.tsx) (benchmarks, skill evidence, career roadmaps).
- **Recruiter Tenant Context:** [`src/context/RecruiterContext.tsx`](file:///C:/Users/Nishant/Documents/SARATHI/src/context/RecruiterContext.tsx) (active organization scoping, tenant switcher, pipeline caching).
- **Custom React Hooks:** 8 dedicated hooks in `src/hooks/` (e.g., [`useAuth.ts`](file:///C:/Users/Nishant/Documents/SARATHI/src/hooks/useAuth.ts), [`useDashboardData.ts`](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/student/useDashboardData.ts)).

### 2.5 Browser Storage & Session Persistence `[BUILT]`
- **Storage Strategy:** Handled in [`src/context/AuthContext.tsx:L37-67`](file:///C:/Users/Nishant/Documents/SARATHI/src/context/AuthContext.tsx#L37-L67).
- **Persistent Session (`rememberMe = true`):**
  - `localStorage.setItem('sarathi_auth_token', token)`
  - `localStorage.setItem('sarathi_auth_user', JSON.stringify(profile))`
  - `localStorage.setItem('sarathi_remember_me', 'true')`
- **Tab-Scoped Session (`rememberMe = false`):**
  - `sessionStorage.setItem('sarathi_auth_token', token)`
  - `sessionStorage.setItem('sarathi_auth_user', JSON.stringify(profile))`
- **Cookie Usage:** No cookies are used for authentication tokens; tokens are stored in Web Storage and transmitted via HTTP headers.

### 2.6 API Client & Interceptors `[BUILT]`
- **Primary API Client:** [`src/services/apiClient.ts`](file:///C:/Users/Nishant/Documents/SARATHI/src/services/apiClient.ts)
- **Base URL:** Relative prefix `/api` routed via Vite development proxy (`http://127.0.0.1:4000`) or production reverse proxy.
- **Header Injection:** Automatically injects `Authorization: Bearer <token>` from Web Storage on authenticated requests.
- **Error Normalization & Interceptors:**
  - Emits custom DOM event `window.dispatchEvent(new CustomEvent('sarathi:unauthorized'))` on HTTP 401.
  - Automatically purges expired auth tokens from storage upon 401.
  - Automatic exponential retry on idempotent GET requests for transient HTTP 503 and 504 errors.
  - Formats errors into custom `ApiError` instances with status, code, and validation details.

### 2.7 UI Styling & Component Libraries `[BUILT]`
- **CSS Architecture:** Tailwind CSS v4 via `@tailwindcss/vite` (`^4.3.3`) — [`src/index.css`](file:///C:/Users/Nishant/Documents/SARATHI/src/index.css)
- **Class Merging:** `clsx: ^2.1.1` and `tailwind-merge: ^3.7.0`
- **Icon System:** Lucide React (`lucide-react: ^1.55.0`)
- **Code Editor:** Monaco Editor React (`@monaco-editor/react: ^4.7.0`) — [`src/components/assessment/CodeEditor.tsx`](file:///C:/Users/Nishant/Documents/SARATHI/src/components/assessment/CodeEditor.tsx)
- **Data Visualization & Charts:** Recharts (`recharts: ^3.10.1`) for radar charts, skill gap bars, pipeline funnels, and test activity graphs.

### 2.8 Lazy Loading & Code Splitting `[BUILT]`
- Dynamic imports (`React.lazy()`) with `<React.Suspense>` boundaries are implemented for all 12 Platform Admin sub-pages in [`src/App.tsx:L58-69`](file:///C:/Users/Nishant/Documents/SARATHI/src/App.tsx#L58-L69) to reduce initial bundle size.

### 2.9 Frontend Environment Variables `[BUILT]`
- `VITE_APP_MODE`: Controls execution environment (`demo` vs `production`).
- `VITE_API_URL`: Backend API server base URL.
- `VITE_ASSESSMENT_V2`: Feature flag enabling the V2 coding sandbox and proctoring interface.
- `VITE_GOOGLE_CLIENT_ID`: Google Cloud OAuth 2.0 Web Client ID.

---

## SECTION 3 — BACKEND ARCHITECTURE

```
[Status Legend: [BUILT] (Operational in code) | [PARTIAL] (Partially connected or mocked) | [PLANNED] (Configured but pending)]
```

### 3.1 Runtime & Framework Constraints `[BUILT]`
- **Runtime:** Node.js v20+ constraint (`engines: { "node": ">=20.0.0" }` in [`server/package.json`](file:///C:/Users/Nishant/Documents/SARATHI/server/package.json)). Running on Node.js v24.20.0 in local environment.
- **Module System:** Native ECMAScript Modules (`"type": "module"`).
- **Web Framework:** Express 5 (`express: ^5.1.0` in `server/package.json`, `express: ^5.3.0` in root).
- **Backend Entry Point:** [`server/src/index.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/index.js).

### 3.2 Server Bootstrap & Middleware Pipeline `[BUILT]`
The server pipeline executes in strict chronological registration order:

```
[Process Start]
  │
  ├── 1. validateConfig() [server/src/config/index.js]
  │      Fails startup if demo auth or insecure JWT secrets are active in production.
  │
  ├── 2. runMigrations() [server/src/data/migrate.mjs]
  │      Applies SQLite DDL to Schema Version 16 idempotently.
  │
  ├── 3. Demo Account Auto-Activation [server/src/index.js:L47-68]
  │      Ensures core demo accounts are active on startup in non-production modes.
  │
  ├── 4. helmet() Security Headers [server/src/index.js:L74-87]
  │      Configures Cross-Origin Resource Policy and Content Security Policy (in production).
  │
  ├── 5. CORS Middleware [server/src/index.js:L90-105]
  │      Validates origin, handles OPTIONS preflight with HTTP 204, allows credentials.
  │
  ├── 6. express.json({ limit: '5mb' }) [server/src/index.js:L107]
  │      Parses JSON payloads up to 5 MB for code and document submission.
  │
  ├── 7. requestMetricsMiddleware [server/src/middleware/requestMetricsMiddleware.js]
  │      Captures latency, method, path, and HTTP status codes for system telemetry.
  │
  ├── 8. Operational Health Check Route [server/src/index.js:L111-113]
  │      GET /api/health -> { status: 'ok', service: 'sarathi-recruiter-api' }
  │
  ├── 9. Global authenticate Middleware [server/src/middleware/authMiddleware.js]
  │      Verifies Bearer JWT, validates account status, binds req.user, req.token, req.orgId.
  │
  ├── 10. maintenanceMiddleware [server/src/middleware/maintenanceMiddleware.js]
  │       Enforces platform maintenance locks when feature flag is enabled.
  │
  ├── 11. Domain API Routers (25 mounted router instances)
  │
  └── 12. Global errorHandler [server/src/middleware/errorHandler.js]
          Catches unhandled errors, formats JSON response, masks internals in production.
```

### 3.3 Route Modules by Domain & Endpoint Counts

SARATHI registers **237 explicit endpoints** across 29 mounted route files plus 1 operational health check.

| Domain | Route Files | Registered Endpoints | Authoritative File Paths |
| :--- | :---: | :---: | :--- |
| **Authentication & Identity** | 1 | 14 | [`server/src/routes/authRoutes.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/routes/authRoutes.js) |
| **Student & Candidate Profile** | 3 | 18 | [`server/src/routes/candidateRoutes.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/routes/candidateRoutes.js) (10), [`server/src/routes/resumeRoutes.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/routes/resumeRoutes.js) (6), [`server/src/routes/settingsRoutes.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/routes/settingsRoutes.js) (2) |
| **Recruiter & Organization** | 2 | 8 | [`server/src/routes/organizationRoutes.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/routes/organizationRoutes.js) (5), [`server/src/routes/verificationRoutes.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/routes/verificationRoutes.js) (3) |
| **College & Institutional Placement** | 1 | 13 | [`server/src/routes/collegeRoutes.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/routes/collegeRoutes.js) |
| **Jobs, Recruitment & Pipeline** | 3 | 23 | [`server/src/routes/jobRoutes.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/routes/jobRoutes.js) (7), [`server/src/routes/pipelineRoutes.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/routes/pipelineRoutes.js) (11), [`server/src/routes/interviewRoutes.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/routes/interviewRoutes.js) (5) |
| **Assessments & Code Sandbox** | 2 | 22 | [`server/src/routes/assessmentRoutes.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/routes/assessmentRoutes.js) (6), [`server/src/routes/assessmentV2Routes.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/routes/assessmentV2Routes.js) (16) |
| **Skills, Evidence & Passport** | 3 | 26 | [`server/src/routes/taxonomyRoutes.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/routes/taxonomyRoutes.js) (3), [`server/src/routes/skillEngineRoutes.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/routes/skillEngineRoutes.js) (18), [`server/src/routes/passportShareRoutes.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/routes/passportShareRoutes.js) (5) |
| **Learning & Career Roadmaps** | 2 | 11 | [`server/src/routes/roadmapRoutes.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/routes/roadmapRoutes.js) (4), [`server/src/routes/resourceRoutes.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/routes/resourceRoutes.js) (7) |
| **Platform Admin & Governance** | 6 | 83 | [`server/src/routes/admin/adminRoutes.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/routes/admin/adminRoutes.js) (23), [`adminContentRoutes.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/routes/admin/adminContentRoutes.js) (24), [`adminSupportRoutes.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/routes/admin/adminSupportRoutes.js) (12), [`adminInsightsRoutes.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/routes/admin/adminInsightsRoutes.js) (7), [`adminCopilotRoutes.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/routes/admin/adminCopilotRoutes.js) (6), [`adminSystemRoutes.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/routes/admin/adminSystemRoutes.js) (11) |
| **AI Copilot & Chatbot** | 1 | 3 | [`server/src/routes/chatRoutes.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/routes/chatRoutes.js) |
| **Notifications & System Support** | 3 | 10 | [`server/src/routes/notificationRoutes.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/routes/notificationRoutes.js) (3), [`server/src/routes/announcementRoutes.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/routes/announcementRoutes.js) (2), [`server/src/routes/supportRoutes.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/routes/supportRoutes.js) (5) |
| **Analytics & Operational Health** | 2 | 5 | [`server/src/routes/analyticsRoutes.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/routes/analyticsRoutes.js) (4), [`server/src/routes/feedbackRoutes.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/routes/feedbackRoutes.js) (1), Health Check in [`index.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/index.js) (1) |
| **Unmounted Route File (Discrepancy)** | 1 | 1 | [`server/src/routes/studentAnalyticsRoutes.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/routes/studentAnalyticsRoutes.js) (Contains 1 route `GET /student`; superseded by `analyticsRoutes.js:L21`) |

*Endpoint Counting Convention:* Each registered HTTP method invocation on an Express Router (`router.get`, `router.post`, `router.put`, `router.patch`, `router.delete`) is counted once. Subrouter mounts inside parent routers (such as `adminRoutes.js` mounting `adminContentRoutes.js`) are tracked without double-counting.

### 3.4 Service Layer Inventory (64 Modules)

The backend business logic is factored across 64 dedicated service files in `server/src/services/`:

| Service Name | Primary Architectural Responsibility | Status | Main Callers | Source Path |
| :--- | :--- | :---: | :--- | :--- |
| `authService` | User authentication, password hashing (bcrypt), JWT issuance & verification | `[BUILT]` | `authRoutes.js`, `adminRoutes.js` | [`server/src/services/authService.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/authService.js) |
| `googleAuthService` | Cryptographic Google ID token verification & replay-proof single-use nonce consumption | `[BUILT]` | `authRoutes.js` | [`server/src/services/googleAuthService.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/googleAuthService.js) |
| `roleResolver` | Resolves role mappings and links Google accounts to database identities | `[BUILT]` | `googleAuthService.js` | [`server/src/services/roleResolver.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/roleResolver.js) |
| `skillEvidenceEngine` | Core competency ledger, SHA-256 evidence deduplication, capping rules, canonical profile sync | `[BUILT]` | `skillEngineRoutes.js`, `assessmentV2` | [`server/src/services/skillEvidenceEngine.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/skillEvidenceEngine.js) |
| `matchingService` | Deterministic job-candidate fit scoring (70/20/10 formula) and uncertainty calculation | `[BUILT]` | `candidateRoutes.js`, `jobRoutes.js` | [`server/src/services/matchingService.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/matchingService.js) |
| `dependencyGraphService` | Skill dependency DAG building, cycle detection, and topological prerequisite ordering | `[BUILT]` | `skillEvidenceEngine.js`, `roadmapService.js` | [`server/src/services/dependencyGraphService.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/dependencyGraphService.js) |
| `runnerDriver` | Unified code execution factory selecting sandbox driver by language & runtime flag | `[BUILT]` | `assessmentV2/sessionService.js` | [`server/src/services/runner/runnerDriver.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/runner/runnerDriver.js) |
| `isolatedVmDriver` | V8 Isolate child process execution driver for JavaScript with memory limits & watchdogs | `[BUILT]` | `runnerDriver.js` | [`server/src/services/runner/isolatedVmDriver.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/runner/isolatedVmDriver.js) |
| `isolatedVmWorker` | Worker script executing candidate JS inside isolated V8 context without Node host access | `[BUILT]` | `isolatedVmDriver.js` | [`server/src/services/runner/isolatedVmWorker.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/runner/isolatedVmWorker.js) |
| `pythonDriver` | Spawns host Python 3 child process with isolated temp directory and stdin/stdout execution | `[BUILT]` | `runnerDriver.js` | [`server/src/services/runner/pythonDriver.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/runner/pythonDriver.js) |
| `sqlDriver` | AST-like comment stripping, single-query check, mutating keyword ban, and in-memory SQLite sandbox | `[BUILT]` | `runnerDriver.js` | [`server/src/services/runner/sqlDriver.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/runner/sqlDriver.js) |
| `judge0Driver` | Remote containerized code runner communicating with self-hosted Judge0 CE via batch REST API | `[PARTIAL]` | `runnerDriver.js` | [`server/src/services/runner/judge0Driver.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/runner/judge0Driver.js) |
| `localDevDriver` | Non-production fallback runner (strictly blocked in production mode) | `[BUILT]` | `runnerDriver.js` | [`server/src/services/runner/localDevDriver.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/runner/localDevDriver.js) |
| `integrityRiskService` | Computes 8-feature logistic regression anti-cheat risk score and token shingle diff | `[BUILT]` | `adminIntegrityService.js`, `assessmentV2` | [`server/src/services/admin/integrityRiskService.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/admin/integrityRiskService.js) |
| `adminAuditService` | Tamper-evident admin audit logging with SHA-256 hash chaining and verifyAuditChain tool | `[BUILT]` | `adminRoutes.js`, `adminApprovalService.js` | [`server/src/services/admin/adminAuditService.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/admin/adminAuditService.js) |
| `adminApprovalService` | Business verification workflow, document validation, SLA tracking, and audit logging | `[BUILT]` | `adminRoutes.js` | [`server/src/services/admin/adminApprovalService.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/admin/adminApprovalService.js) |
| `approvalHintEngine` | Generates advisory hints for recruiter business verification (domain checks, tax ID) | `[BUILT]` | `adminApprovalService.js` | [`server/src/services/admin/approvalHintEngine.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/admin/approvalHintEngine.js) |
| `collegeAnalyticsService` | Computes placement readiness, skill radar, and enforces D-09 minimum cohort size (N≥3) | `[BUILT]` | `collegeRoutes.js`, `analyticsRoutes.js` | [`server/src/services/collegeAnalyticsService.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/collegeAnalyticsService.js) |
| `collegeAtRiskService` | Analyzes student cohort scores and flags students needing academic intervention | `[BUILT]` | `collegeRoutes.js` | [`server/src/services/collegeAtRiskService.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/collegeAtRiskService.js) |
| `githubService` | Imports public GitHub repos, parses README & package.json, infers technologies & skills | `[BUILT]` | `candidateRoutes.js` | [`server/src/services/githubService.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/githubService.js) |
| `aiChatService` | Manages AI provider fallback chain (Gemini -> OpenAI -> local rule-based student copilot) | `[BUILT]` | `chatRoutes.js` | [`server/src/services/aiChatService.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/aiChatService.js) |
| `studentCopilot*` (7 modules) | Rule-based local career copilot engines handling roadmap, jobs, intent, and helper logic | `[BUILT]` | `aiChatService.js` | [`server/src/services/studentCopilotEngine.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/studentCopilotEngine.js) |
| `featureFlagService` | Database-backed feature flags (`feature_flags` table) with cached lookups | `[BUILT]` | `adminSystemRoutes.js`, middleware | [`server/src/services/admin/featureFlagService.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/admin/featureFlagService.js) |
| `notificationService` | In-app notification creation, retrieval, and unread count tracking via SQLite | `[BUILT]` | `notificationRoutes.js`, `adminApprovalService.js` | [`server/src/services/notificationService.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/notificationService.js) |
| `adminSystemService` | Manages operational system probes, database binary backups, and table statistics | `[BUILT]` | `adminSystemRoutes.js` | [`server/src/services/admin/adminSystemService.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/admin/adminSystemService.js) |

### 3.5 Architectural Layer Separation
The codebase implements a direct 3-tier backend architecture:
- **Routes / Controllers:** Express route handlers in `server/src/routes/` parsing parameters, validating payloads using Zod schemas, checking permissions, and calling services.
- **Service Layer:** 64 business logic modules in `server/src/services/` encapsulating algorithms, state machines, and scoring models.
- **Data Access Layer:** Direct parameterized SQL execution via [`server/src/data/repository.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/data/repository.js) or `getDb()` from [`server/src/config/db.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/config/db.js).
- *Observation on ORM:* No heavyweight ORM (e.g., Prisma, TypeORM, Sequelize) is used on the backend. Data access is implemented through direct parameterized SQL prepared statements using Node.js's built-in `node:sqlite` engine.

---

## SECTION 4 — DATA LAYER AND DATABASE INVENTORY

```
[Status Legend: [BUILT] (Operational in code) | [PARTIAL] (Partially connected or mocked) | [PLANNED] (Configured but pending)]
```

### 4.1 Database Engine & Operational Parameters `[BUILT]`
- **Engine:** Built-in `node:sqlite` (`DatabaseSync` class).
- **Operating Mode:** Embedded, synchronous, single-process file database with Write-Ahead Logging.
- **Connection Configuration:** Configured in [`server/src/config/db.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/config/db.js):
  - `PRAGMA busy_timeout = 5000;` (Prevents immediate lock errors under concurrent read/write).
  - `PRAGMA foreign_keys = ON;` (Strictly enforces referential integrity on all operations).
  - `PRAGMA journal_mode = WAL;` (Enables concurrent reads alongside active writes).
- **Physical File Path:** Resolved to `server/data/database.db` via `paths.dbFile` in [`server/src/config/index.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/config/index.js). Supports `:memory:` mode for unit testing.
- **Migration & Schema Versioning:** Handled by [`server/src/data/migrate.mjs`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/data/migrate.mjs) tracking current schema state in `schema_migrations`.
- **Current Canonical Schema Version:** `SCHEMA_VERSION = 16` in [`server/src/data/schema.js:L10`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/data/schema.js#L10).
- **Verified Database Totals:**
  - **Tables:** 76 total (75 operational tables + 1 `schema_migrations` tracking table).
  - **Indexes:** 64 explicit indexes.
  - **Foreign Key Constraints:** 119 foreign key definitions enforced at runtime.

### 4.2 Grouping of Database Tables by Logical Domain

All 76 tables present in the canonical SQLite schema are listed below:

#### Domain 1: Identity, Authentication, and Access Control (7 tables)
- `users`: Core user accounts (email, password hash, global role, status, institution link).
- `auth_identities`: Federated third-party OAuth links (Google SSO subject identifier, provider).
- `auth_nonces`: Single-use replay protection nonces for authentication handshakes.
- `password_resets`: Secure password recovery tokens, expiry timestamps, and consumption tracking.
- `account_invitations`: Team invitations for organizations and institutions with expiry tracking.
- `organisation_memberships`: Many-to-many user-organization links with tenant-level RBAC roles.
- `user_settings`: User-level preferences (dark mode, notification toggles, locale settings).

#### Domain 2: Student and User Profiles (5 tables)
- `candidate_profiles`: Student profiles (headline, degree, branch, graduation year, target role, bio).
- `candidate_skills`: Candidate-reported and verified competencies with proficiency ratings (1–5).
- `canonical_skill_profiles`: Aggregated provenance competency profiles with confidence ratings (`LOW`, `MEDIUM`, `HIGH`).
- `student_resumes`: Stored candidate resume profiles, parsed sections, and generated artifacts.
- `passport_shares`: Public share tokens for Skill Passports with configurable section visibility toggles.

#### Domain 3: Recruiter, Organizations, and Business Verification (6 tables)
- `organisations`: Employer business entities (name, slug, verification status, tenant settings).
- `recruiter_profiles`: Recruiter professional metadata and organizational affiliations.
- `business_verifications`: KYC registration documents, tax identifiers, upload hashes, and review records.
- `recruiter_notes`: Private candidate evaluations and internal recruiter collaborative feedback.
- `shortlists`: Named candidate pools created by recruiters for specific sourcing campaigns.
- `shortlist_members`: Junction table linking candidates to recruiter candidate shortlists.

#### Domain 4: Jobs, Applications, and Recruitment Pipeline (7 tables)
- `jobs`: Job requisitions (title, department, employment type, location, status).
- `job_skill_requirements`: Weighted skill prerequisites (required vs preferred, target proficiency, weights).
- `applications`: Candidate job applications tracking current hiring pipeline stage.
- `application_stage_history`: Immutable audit trail of candidate progression through recruitment stages.
- `interviews`: Scheduled candidate interview sessions, video links, and status.
- `interview_participants`: Assigned interviewers and candidates for specific interview sessions.
- `interview_feedback`: Structured rubric evaluations and scorecard notes from interviewers.

#### Domain 5: Skills, Evidence, and Skill Passport (6 tables)
- `domains`: Top-level industry engineering disciplines (e.g., Frontend, Backend, AI/ML, DevOps).
- `skills`: Master competency catalog with accepted evidence types and proficiency scales.
- `skill_aliases`: Alternative naming mappings to normalize scraped or imported skill names.
- `skill_evidence`: Legacy evidence records linking candidates, skills, and verification statuses.
- `skill_evidence_ledger`: Tamper-evident ledger recording all validated skill evidence with SHA-256 deduplication.
- `verification_reviews`: Official human verification records approving or rejecting student evidence.

#### Domain 6: Assessments, Submissions, and Grading (14 tables)
- `assessment_templates`: Assessment definitions, time limits, domain associations, and difficulty.
- `assessment_assignments`: Tests assigned to specific candidates or job applicants.
- `assessment_attempts`: Candidate test sittings tracking score, start/end timestamps, and status.
- `assessment_sessions`: V2 stateful assessment sessions tracking autosaves, save version, and deadlines.
- `assessment_questions`: Coding, MCQ, and subjective questions assigned to assessment sessions.
- `code_tests`: Visible and hidden unit test cases for coding challenges.
- `run_results`: Real-time execution outputs from test runs during active coding assessments.
- `explanation_answers`: Student subjective rationale text accompanying coding submissions.
- `submission_snapshots`: Code snapshots captured at submission or timeout events.
- `session_scores`: Computed category and overall score breakdowns for completed assessments.
- `assessment_results`: Final graded assessment outcome records linked to recruitment applications.
- `practical_challenges`: Sandboxed coding challenges for hands-on technical evaluation.
- `practical_challenge_submissions`: Student code submissions evaluated against practical challenges.
- `project_rubrics`: Evaluation criteria for structured capstone project assessment.

#### Domain 7: Integrity and Risk Events (3 tables)
- `integrity_events`: Client-side telemetry events (tab blurs, paste events, full-screen exits, camera losses).
- `integrity_risk_scores`: 8-feature logistic regression risk scores (0–100), risk tiers, and factor contributions.
- `integrity_reviews`: Human reviewer decisions, overrides, and notes on flagged assessment attempts.

#### Domain 8: Learning, Courses, and Roadmaps (10 tables)
- `student_roadmaps`: Personalized milestone learning roadmaps generated for target roles.
- `skill_gap_analyses`: Gap analyses comparing candidate skills against role requirements.
- `skill_gap_items`: Granular skill deficit records identifying specific unmet prerequisites.
- `role_benchmarks`: Standardized industry role competency benchmarks (e.g., Junior Full-Stack Developer).
- `role_benchmark_skills`: Required skill targets and proficiency expectations for specific role benchmarks.
- `learning_resources`: Curated educational resources (videos, docs, tutorials) with verified URLs.
- `resource_bookmarks`: Student-saved learning resources for quick reference.
- `resource_progress`: Module completion tracking and timestamps for enrolled students.
- `resource_playlist_items`: Ordered curriculum modules belonging to structured learning courses.
- `remediation_assignments`: Tailored learning modules assigned to candidates to bridge specific gaps.

#### Domain 9: AI Conversations and Requests (2 tables)
- `admin_chat_sessions`: Persistent conversation threads between platform admins and the Admin Copilot.
- `admin_chat_messages`: Individual prompt and response messages with token metadata and provider tracking.

#### Domain 10: Notifications and Messaging (4 tables)
- `notifications`: User-specific in-app notifications with read/unread flags and target route links.
- `announcements`: Broadcast administrative announcements targeted by user role.
- `announcement_dismissals`: Records of users who have read and dismissed specific system announcements.
- `feedback`: User satisfaction ratings, bug reports, and feedback submissions.

#### Domain 11: College and Institutional Placement (5 tables)
- `institutions`: Academic colleges and universities registered on the platform.
- `college_settings`: Institutional configuration (allowed branches, cohort suppression thresholds).
- `placement_drives`: Campus placement drives conducted by visiting employers.
- `drive_applications`: Student applications submitted to specific campus placement drives.
- `curriculum_recommendations`: Placement readiness recommendations for institutional department heads.

#### Domain 12: Support Tickets and Operations (3 tables)
- `support_tickets`: Helpdesk support inquiries with severity, status, and assigned admin.
- `support_messages`: Conversation messages exchanged between users and support staff.
- `support_canned_responses`: Pre-approved administrative message templates for standard support workflows.

#### Domain 13: Admin, Audit, and System Configuration (4 tables)
- `admin_audit_log`: Cryptographic SHA-256 hash-chained immutable log of administrative mutations.
- `audit_events`: General operational audit events recording system state changes.
- `feature_flags`: Dynamic feature flags controlling platform behavior at runtime.
- `schema_migrations`: Internal schema migration tracking table recording applied version numbers and timestamps.

### 4.3 Twelve Most Important Foreign-Key Relationships

The following 12 foreign keys represent the architectural backbone of SARATHI's multi-tenant isolation, provenance ledger, and integrity pipeline:

1. `organisations.id <- organisation_memberships.org_id` (`ON DELETE CASCADE`)  
   *Enforces strict multi-tenant boundary: deleting an organization purges all member associations.*
2. `users.id <- candidate_profiles.id` (`ON DELETE CASCADE`)  
   *Binds student resume, career target, and academic details directly to the primary user identity.*
3. `organisations.id <- jobs.org_id` (`ON DELETE CASCADE`)  
   *Ensures all job requisitions and candidate requisitions remain isolated to the owning enterprise.*
4. `jobs.id <- applications.job_id` (`ON DELETE CASCADE`)  
   *Links candidate applications to specific job requisitions; cascade deletes when a job is removed.*
5. `users.id <- applications.candidate_id` (`ON DELETE CASCADE`)  
   *Maintains candidate ownership of job applications across the recruitment pipeline.*
6. `applications.id <- application_stage_history.application_id` (`ON DELETE CASCADE`)  
   *Guarantees a permanent historical audit trail of recruitment funnel transitions.*
7. `users.id <- skill_evidence_ledger.candidate_id` (`ON DELETE CASCADE`)  
   *Ties every verified competency proof directly to the candidate's immutable provenance ledger.*
8. `skills.id <- canonical_skill_profiles.skill_id` (`ON DELETE CASCADE`)  
   *Connects canonical aggregated candidate proficiencies to the master platform skill catalog.*
9. `users.id <- assessment_sessions.user_id` (`ON DELETE CASCADE`)  
   *Binds live coding assessment attempts and stateful test environments to authenticated candidates.*
10. `assessment_sessions.id <- integrity_risk_scores.session_id` (`ON DELETE CASCADE`)  
    *Links the 8-feature logistic anti-cheat score directly to the specific proctored test session.*
11. `organisations.id <- business_verifications.org_id` (`ON DELETE CASCADE`)  
    *Attaches KYC registration documents and tax identifiers to the employer organization entity.*
12. `users.id <- admin_audit_log.admin_id` (`ON DELETE NO ACTION`)  
    *Preserves the integrity of the administrative SHA-256 audit log; historical audit records cannot be orphaned.*

---

## SECTION 5 — CORE DATA FLOWS

```
[Status Legend: [BUILT] (Operational in code) | [PARTIAL] (Partially connected or mocked) | [PLANNED] (Configured but pending)]
```

### Flow A: Login & Token Issuance Flow `[BUILT]`

#### 1. Email/Password Authentication Flow
```
User (Browser)
  │  Submits email + password
  ▼
[LoginPage.tsx / AdminLoginPage.tsx]
  │  Calls login() via AuthContext
  ▼
[apiClient.ts]
  │  POST /api/auth/login
  ▼
[authRoutes.js:L58-85]
  │  Validates body via Zod schema
  ▼
[authService.login()]
  │  1. Queries users table: SELECT * FROM users WHERE email = ? AND deleted_at IS NULL
  │  2. Checks status: If status === 'suspended', throws ACCOUNT_SUSPENDED
  │  3. Compares password: bcrypt.compare(password, user.password_hash)
  │  4. Resolves tenant scope: Looks up organisation_memberships for recruiter
  │  5. Issues JWT: jwt.sign(payload, authConfig.secret, { algorithm: 'HS256', expiresIn: '7d' })
  ▼
Browser (AuthContext.tsx)
  │  Stores JWT token in localStorage (if rememberMe) or sessionStorage
  │  Updates user state; redirects to portal home (/student, /recruiter, /admin, /college)
```

#### 2. Google Single Sign-On (SSO) Flow
```
User (Browser)
  │  Clicks "Sign in with Google" (Google One Tap / Identity Services button)
  ▼
[AuthContext.loginWithGoogle()]
  │  1. Requests single-use nonce: GET /api/auth/google/nonce
  │  2. Browser receives nonce: { nonce, expiresAt } (Stored in auth_nonces table)
  │  3. Google SDK completes sign-in; returns JWT credential (ID Token)
  │  4. POST /api/auth/google with { credential, nonce, portalHint }
  ▼
[googleAuthService.verifyIdToken()]
  │  1. Validates & consumes nonce: UPDATE auth_nonces SET used_at = now WHERE nonce = ?
  │     (Throws GOOGLE_TOKEN_INVALID if missing, expired, or replayed)
  │  2. Cryptographically verifies ID token using OAuth2Client (google-auth-library)
  │  3. Validates audience (clientId) and issuer (accounts.google.com)
  │  4. Extracts claims: sub, email, name, picture, hd (hosted domain)
  ▼
[roleResolver.resolveGoogleUser()]
  │  1. Checks auth_identities table for existing (provider, provider_subject)
  │  2. If missing, checks users table by email
  │  3. If new user, creates user record, assigns role based on portalHint, links auth_identities
  │  4. Updates last_login_at timestamp
  ▼
[authService.generateToken()]
  │  Issues standard Sarathi Bearer JWT token with user's resolved role and tenant scope
  ▼
Browser (AuthContext.tsx)
  │  Saves token; initializes session; navigates to role-authorized portal
```

### Flow B: Student Assessment to Skill Passport `[BUILT]`

```
AssessmentPage.tsx
  │  Student starts test: POST /api/assessments/v2/session/start
  ▼
assessmentV2Routes.js -> sessionService.js
  │  1. Creates stateful assessment_sessions record with deadline_at
  │  2. Samples questions without revealing answers or hidden test cases
  ▼
Client Code Editor (Monaco)
  │  - Autosave interval: POST /api/assessments/v2/session/save (version-conflict protected)
  │  - Telemetry capture: POST /api/assessments/v2/integrity/events (blurs, pastes, key rates)
  │  - Test execution: POST /api/assessments/v2/session/run-tests
  ▼
runnerDriver.js
  │  Invokes sandboxed driver based on language (IsolatedVmDriver, PythonDriver, or SqlDriver)
  │  Executes visible test cases; persists outputs in run_results
  ▼
Final Submission: POST /api/assessments/v2/session/submit
  │
  ▼
gradingService.js
  │  1. Executes both visible and hidden unit tests against sandboxed runner
  │  2. Computes test score: (tests_passed / total_tests) * 100
  │  3. Evaluates MCQ questions: answers compared server-side against key
  │  4. Computes practical weight: 40% Knowledge (MCQ) + 60% Practical (Coding)
  │  5. Determines pass status: final_score >= ASSESSMENT_PASS_THRESHOLD (60%)
  │  6. Records result in assessment_attempts and assessment_results
  ▼
skillEvidenceEngine.recordEvidence()
  │  1. Ingests result into skill_evidence_ledger with SHA-256 deduplication
  │  2. Triggers aggregateStudentProfile(candidateId)
  │  3. Applies anti-inflation capping policy:
  │     - 1 evidence item  -> Caps demonstrated level at Level 2 (Confidence: LOW)
  │     - 2 evidence items -> Caps demonstrated level at Level 3 (Confidence: MEDIUM)
  │     - 3+ evidence items -> Unlocks Levels 4-5 (Confidence: HIGH)
  │  4. Runs staleness & variance checks:
  │     - If score variance > 35 pts across 90 days -> marks CONFLICTING
  │     - If newest evidence > 180 days -> marks OUTDATED
  │  5. Atomically upserts canonical_skill_profiles and updates legacy candidate_skills
  ▼
SkillPassportPage.tsx
  │  Renders updated verified badge, confidence level, and provenance audit ledger
```

### Flow C: GitHub Project Import to Skill Evidence `[BUILT]`

```
Student (ProjectsPage.tsx)
  │  Opens ProjectFormModal.tsx; enters GitHub repository URL (e.g. github.com/owner/repo)
  ▼
[apiClient.ts]
  │  POST /api/candidates/github/import with { repoUrl }
  ▼
[candidateRoutes.js:L68-84]
  │  Validates input using githubImportSchema (Zod)
  ▼
[GitHubService.importRepo()]
  │  1. Validates repository format; checks in-memory cache (30-min TTL)
  │  2. Calls GitHub REST API: GET https://api.github.com/repos/{owner}/{repo} (Timeout: 4000ms)
  │  3. Calls GitHub Languages API: GET https://api.github.com/repos/{owner}/{repo}/languages
  │  4. Calls GitHub Readme API: GET https://api.github.com/repos/{owner}/{repo}/readme
  │  5. Fetches package.json: inspects dependencies against PACKAGE_TECH_MAP
  │  6. Extracts key feature bullets, screenshot URL, and live demo link from README
  │  7. Infers demonstrated skills (e.g., React + Node -> "Full-Stack Web Development")
  │  8. Returns structured analysis payload to client
  ▼
ProjectFormModal.tsx (Frontend)
  │  Auto-populates project title, description, architecture, technologies, and skills
  │  Student reviews and confirms submission
  ▼
POST /api/skills/evidence (or Project Save)
  │  Records project evidence in skill_evidence_ledger as project_repo
  │  Updates student Skill Passport and profile competency radar
```

### Flow D: Skill Gap Analysis to Roadmap & Learning Resources `[BUILT]`

```
Student / Recruiter
  │  Triggers gap analysis for a target job: GET /api/roadmap/gap-analysis or /api/jobs/:id/match
  ▼
[skillGapService.analyzeSkillGap(candidateId, jobId)]
  │  1. Retrieves job_skill_requirements (required vs preferred, target proficiency, weights)
  │  2. Retrieves candidate's current candidate_skills and canonical_skill_profiles
  │  3. Computes deficits:
  │     - Missing competencies (proficiency = 0)
  │     - Below-target competencies (candidateProficiency < targetProficiency)
  │     - Unverified claims (evidence is self-reported only)
  ▼
[dependencyGraphService.validateAcyclic()]
  │  1. Constructs topological prerequisite DAG of required competencies
  │  2. Identifies foundational blocker skills (prerequisites that must be mastered first)
  │  3. Recommends foundational milestones before advanced specializations
  ▼
[resourceService.getResources()]
  │  Queries learning_resources table filtered by deficient skill IDs and difficulty level
  ▼
RoadmapPage.tsx (Frontend)
  │  Renders interactive milestone track, prerequisite blocker alerts, and direct resource links
```

### Flow E: Recruiter Job Posting to Candidate Matching Pipeline `[BUILT]`

```
Recruiter (RecruiterJobsPage.tsx)
  │  Creates job with required/preferred skills: POST /api/jobs
  ▼
[jobService.createJob()]
  │  Inserts into jobs and job_skill_requirements within active tenant organization scope
  ▼
Recruiter navigates to RecruiterCandidatesPage.tsx
  │  Queries matched candidates: GET /api/candidates
  ▼
[matchingService.calculateMatch(candidateId, jobId)]
  │  1. Computes Required Skill Coverage (weighted sum, weighted at 70%):
  │     - Verified competency = 1.0 multiplier
  │     - Pending verification = 0.6 multiplier
  │     - Self-reported only = 0.3 multiplier
  │     - Fulfillment ratio: min(candidate_prof / target_prof, 1.0)
  │  2. Computes Preferred Skill Coverage (weighted sum, weighted at 20%)
  │  3. Computes Assessment Bonus (weighted at 10%):
  │     - +5% per passed practical assessment (capped at +10%)
  │  4. Formula:
  │     Match Score = min(100, round((RequiredCoverage * 0.70) + (PreferredCoverage * 0.20) + AssessmentBonus))
  │  5. Computes Evidence Uncertainty Index:
  │     - Verified coverage >= 80% -> LOW UNCERTAINTY
  │     - Verified coverage >= 40% -> MEDIUM UNCERTAINTY
  │     - Verified coverage < 40%  -> HIGH UNCERTAINTY
  │  6. Generates deterministic human-in-the-loop explanation string
  ▼
RecruiterPipelinePage.tsx
  │  Recruiter drags candidate card to advance hiring stage
  │  PUT /api/pipeline/:id/stage updates applications and inserts application_stage_history
```

### Flow F: Recruiter Business Verification Workflow `[BUILT]`

```
Recruiter (RecruiterCompanyPage.tsx)
  │  Uploads business registration / tax document: POST /api/verifications/upload
  ▼
[verificationRoutes.js -> adminApprovalService]
  │  1. Validates document MIME type (.pdf, .png, .jpg) and file size
  │  2. Saves attachment to server/data/uploads/ with sanitized filename
  │  3. Calculates SHA-256 hash of uploaded file
  │  4. Inserts into business_verifications with status = 'pending'
  ▼
Platform Admin (AdminApprovalsPage.tsx)
  │  1. Loads approval queue: GET /api/admin/approvals?status=pending
  │  2. approvalHintEngine analyzes registration:
  │     - Checks corporate email domain match against company name
  │     - Checks tax identifier format validity
  │     - Flags duplicate submissions across organizations
  │  3. Admin views document: GET /api/admin/approvals/:id/document (Path-traversal defended)
  │  4. Admin submits decision: POST /api/admin/approvals/:id/decision
  ▼
[adminApprovalService.submitDecision()]
  │  Executes atomic transaction:
  │  1. Updates business_verifications record (status: approve/reject, decision_reason, reviewed_by)
  │  2. Updates organisations table (verification_status: verified / rejected)
  │  3. Inserts in-app notification record in notifications table for recruiter user
  │  4. Logs tamper-evident audit record in admin_audit_log with SHA-256 hash chaining
  ▼
Recruiter Portal
  │  Polls/fetches notifications; displays verified enterprise badge upon approval
```
*Note on Delivery Mechanism:* Business verification notifications are delivered strictly **in-app** through the SQLite `notifications` table. No outbound email delivery service is connected.

### Flow G: Anti-Cheat Telemetry, Risk Scoring & Reviewer Decision `[BUILT]`

```
Candidate Browser (AssessmentPage.tsx)
  │  Proctoring hooks record client telemetry during test sitting:
  │  - Window blur, tab switch, full-screen exit (ts, duration)
  │  - Massive paste events (pasted length, char count)
  │  - Solve time duration and first-try test passes
  ▼
POST /api/assessments/v2/integrity/events
  │  Batches and stores raw events in integrity_events table (rate limited)
  ▼
Submission / Test Completion
  │
  ▼
[integrityRiskService.calculateFeatures() & scoreFeatures()]
  │  1. Extracts 8 normalized feature vectors (0 to 1):
  │     - paste (paste count / 5)
  │     - pasteRatio (pasted chars / total code chars)
  │     - blur (tab switches / 10)
  │     - blurTime (unfocused seconds / 120)
  │     - fast (peer solve-time z-score)
  │     - camera (camera loss ratio, if camera enabled)
  │     - similarity (5-token shingled Jaccard match vs past peer submissions)
  │     - firstTry (instant pass on 1st compile)
  │  2. Computes Logistic Regression Risk Score:
  │     x = sum(weight_i * feature_i) - bias
  │     Risk Score = round(100 / (1 + e^(-x)))
  │  3. Categorizes Risk Band:
  │     - 0–34: LOW RISK
  │     - 35–65: MEDIUM RISK
  │     - 66–100: HIGH RISK
  │  4. Extracts top 3 plain-English contributing factors
  │  5. Persists score in integrity_risk_scores table (Strictly advisory, non-punitive)
  ▼
Reviewer / Platform Admin Console (AdminIntegrityPage.tsx)
  │  1. Displays flagged sessions sorted by risk score
  │  2. Opens CodeDiffViewer.tsx to compare side-by-side token shingle similarity vs matched peers
  │  3. Human Reviewer records decision: POST /api/admin/integrity/sessions/:id/review
  │  4. Persists verdict in integrity_reviews and logs admin audit record
```

### Flow H: AI Career Copilot Request Flow `[BUILT]`

```
User (FloatingChatbot.tsx / AdminCopilotPage.tsx)
  │  Sends chat message: POST /api/chat/message (or /api/admin/copilot/chat)
  ▼
[chatRoutes.js]
  │  1. Verifies Bearer JWT authentication (extracts candidate or admin context)
  │  2. Validates rate limit: checkChatRateLimit() allows max 25 req/min per user
  │  3. Validates message length: capped at 1500 characters
  ▼
[aiChatService.getAIProviderConfig()]
  │  Checks environment variables in order:
  │  1. process.env.GEMINI_API_KEY -> Provider: 'gemini' (Model: gemini-1.5-flash)
  │  2. process.env.OPENAI_API_KEY -> Provider: 'openai' (Model: gpt-4o-mini)
  │  3. Neither configured          -> Provider: 'none' (Model: sarathi-local-knowledge)
  │
  ├── IF Provider === 'gemini':
  │     Builds context payload (candidate verified skills, targets, roadmaps)
  │     POST https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent
  │     Timeout: 25000ms. If network error occurs, falls back to local knowledge engine.
  │
  ├── IF Provider === 'openai':
  │     Builds messages array with system prompt and student context
  │     POST https://api.openai.com/v1/chat/completions
  │     Timeout: 25000ms. If network error occurs, falls back to local knowledge engine.
  │
  └── IF Provider === 'none' (or error fallback):
        Invokes studentCopilotEngine.js (Local deterministic rule engine)
        - Analyzes user intent (roadmap advice, job recommendations, skill gaps, learning tips)
        - Ingests SQLite student records and returns formatted Markdown response
        - Appends transparent disclaimer: "Generated by Sarathi Local Knowledge Engine"
  ▼
Frontend (FloatingChatbot.tsx)
  │  Renders streaming or markdown response with suggested action chips
```

---

## SECTION 6 — EXTERNAL SERVICES AND INFRASTRUCTURE

### 6.1 External Dependencies & Third-Party Service Integrations

| Service / Dependency | Architectural Purpose | Calling File / Module | Environment Variables | Required or Optional | Behavior When Unavailable | Status | Evidence Path |
| :--- | :--- | :--- | :--- | :---: | :--- | :---: | :--- |
| **Google Sign-In (OAuth 2.0)** | Cryptographic user authentication and Google SSO | `server/src/services/googleAuthService.js` | `GOOGLE_CLIENT_ID`, `VITE_GOOGLE_CLIENT_ID`, `GOOGLE_NONCE_TTL_MS` | Optional | Email/password authentication remains fully operational. In demo mode, simulated tokens allowed. | `[BUILT]` | [`server/src/services/googleAuthService.js:L1-270`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/googleAuthService.js#L1-L270) |
| **Google Gemini API** | Multi-turn career guidance & AI Copilot | `server/src/services/aiChatService.js` | `GEMINI_API_KEY`, `GOOGLE_API_KEY`, `GEMINI_MODEL` | Optional | Automatically falls back to OpenAI; if unavailable, falls back to `sarathi-local-knowledge` rule engine. | `[BUILT]` | [`server/src/services/aiChatService.js:L59-87`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/aiChatService.js#L59-L87) |
| **OpenAI API** | Secondary AI Copilot provider | `server/src/services/aiChatService.js` | `OPENAI_API_KEY`, `OPENAI_MODEL` | Optional | Automatically falls back to local knowledge engine. | `[BUILT]` | [`server/src/services/aiChatService.js:L72-87`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/aiChatService.js#L72-L87) |
| **GitHub REST API** | Public repository inspection, tech stack inference, README parsing | `server/src/services/githubService.js` | `GITHUB_TOKEN` | Optional | Unauthenticated public requests (subject to 60 req/hr GitHub rate limit); cached 30 min. | `[BUILT]` | [`server/src/services/githubService.js:L218-235`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/githubService.js#L218-L235) |
| **Judge0 CE (Docker)** | Remote sandboxed code execution in isolated Linux cgroups | `server/src/services/runner/judge0Driver.js` | `JUDGE0_URL`, `JUDGE0_API_KEY`, `RUNNER_DRIVER=judge0` | Optional | Fails with explicit error; in dev, runner falls back to `isolated-vm` or `pythonDriver`. | `[PARTIAL]` | [`server/src/services/runner/judge0Driver.js:L1-137`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/runner/judge0Driver.js#L1-L137), [`docker-compose.judge0.yml`](file:///C:/Users/Nishant/Documents/SARATHI/docker-compose.judge0.yml) |
| **Local JavaScript Isolate (`isolated-vm`)** | In-process V8 isolate execution for candidate JS/TS code | `server/src/services/runner/isolatedVmDriver.js` | `ASSESSMENT_V2_ENABLED`, `ASSESSMENT_RUNNER_TIMEOUT_MS` | Required for JS assessments | Spawns child worker process; times out cleanly after 5000ms. | `[BUILT]` | [`server/src/services/runner/isolatedVmDriver.js:L1-127`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/runner/isolatedVmDriver.js#L1-L127) |
| **Python Host Process** | Python candidate code execution | `server/src/services/runner/pythonDriver.js` | `PYTHON_PATH`, `ASSESSMENT_RUNNER_TIMEOUT_MS` | Optional (Host Python) | Returns structured diagnostic `runtime_unavailable` if host Python 3 is missing. | `[BUILT]` | [`server/src/services/runner/pythonDriver.js:L14-82`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/runner/pythonDriver.js#L14-L82) |
| **In-Memory SQLite Sandbox** | Hardened read-only SQL execution sandbox | `server/src/services/runner/sqlDriver.js` | None | Required for SQL assessments | Operates on ephemeral `:memory:` SQLite instance completely isolated from application DB. | `[BUILT]` | [`server/src/services/runner/sqlDriver.js:L1-185`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/runner/sqlDriver.js#L1-L185) |
| **Email Service Provider (SMTP/SES)** | Outbound transactional emails | `NOT FOUND IN REPOSITORY` | None | N/A | In-app notification table used exclusively. | `NOT FOUND IN REPOSITORY` | No email provider code or SMTP client exists in repo. |
| **Cloud Object Storage (S3/GCS)** | Remote file and document storage | `NOT FOUND IN REPOSITORY` | None | N/A | Uploads are stored on the local filesystem (`server/data/uploads/`). | `NOT FOUND IN REPOSITORY` | Stored locally via `fs.writeFileSync`. |

### 6.2 Deployment & Infrastructure Configuration
- **Containerization:** Self-hosted Judge0 CE configured via [`docker-compose.judge0.yml`](file:///C:/Users/Nishant/Documents/SARATHI/docker-compose.judge0.yml) (Judge0 v1.13.0, PostgreSQL 15, Redis 7). The main application itself does not have a root Dockerfile.
- **Port Allocations:**
  - Frontend Dev Server: Port `5173` (Vite)
  - Backend API Server: Port `4000` (Express)
  - Judge0 Service: Port `2358`
- **Development Startup Scripts:**
  - `npm run dev`: Executes [`scripts/dev.js`](file:///C:/Users/Nishant/Documents/SARATHI/scripts/dev.js) (concurrently launches Vite frontend and Express server).
  - `start_server.bat` / `run_all.bat`: Windows batch startup automation.
- **Production Build Commands:**
  - Frontend: `npm run build` (`tsc -b && vite build`)
  - Backend: `npm --prefix server run start` (`node src/index.js`)
- **Document Storage Safeguards:** Uploaded verification files reside in `server/data/uploads/`. Document streaming via [`adminApprovalService.streamDocument()`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/admin/adminApprovalService.js#L340-L413) enforces strict path traversal checks (`path.resolve` containment validation), rejects symbolic links, and whitelists MIME types (`.pdf`, `.png`, `.jpg`, `.jpeg`).

---

## SECTION 7 — CODE EXECUTION SANDBOX

SARATHI features a modular multi-language code execution architecture implemented in `server/src/services/runner/`.

```
                        RunnerDriver.run({ language, code, tests, limits })
                                                │
                 ┌──────────────────────────────┼──────────────────────────────┐
                 ▼                              ▼                              ▼
          language === 'sql'            language === 'python'          language === 'javascript'
                 │                              │                              │
                 ▼                              ▼                              ▼
           [SqlDriver]                   [PythonDriver]            driverType || assessmentV2.runnerDriver
                 │                              │                              │
       Ephemeral :memory:               Host Python 3 Child Process            ├─ 'isolated-vm' ──> [IsolatedVmDriver]
     SQLite Instance + Strict AST       with Isolated Temp Directory           ├─ 'judge0'      ──> [Judge0Driver]
      Read-Only SELECT Whitelist        & 5000ms Hard Process Watchdog         └─ 'local-dev'   ──> [LocalDevDriver] (Dev only)
```

### 7.1 Detailed Driver Specifications

| Execution Driver | Implementation File | Invoked in Active Flow? | Runtime & Isolation Model | Time Limit | Memory Limit | Output Limit | Security Safeguards & Restrictions | Production Status |
| :--- | :--- | :---: | :--- | :---: | :---: | :---: | :--- | :---: |
| **`IsolatedVmDriver`** | [`server/src/services/runner/isolatedVmDriver.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/runner/isolatedVmDriver.js) | Yes (`javascript`) | Node.js child process running an isolated V8 Isolate (`isolated-vm`). Candidate code never executes in API process. | 5,000ms wall-clock watchdog | 128 MB V8 Isolate heap limit | 20,480 bytes max stdout/stderr | CommonJS `require()` prohibited (except mock solution). Host filesystem, globals, and networking completely detached. | `[BUILT]` (Ready for production) |
| **`PythonDriver`** | [`server/src/services/runner/pythonDriver.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/runner/pythonDriver.js) | Yes (`python`) | Ephemeral host Python 3 subprocess spawned in isolated temporary scratch directory (`tmpdir/sarathi-py-*`). | 5,000ms per test case | OS Process Limit (No cgroup enforcement) | 20,480 bytes max output | Scratch folder created and destroyed in `finally` block. Subprocess killed on timeout. Does NOT run in a Docker container. | `[BUILT]` (Host-dependent) |
| **`SqlDriver`** | [`server/src/services/runner/sqlDriver.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/runner/sqlDriver.js) | Yes (`sql`) | In-memory ephemeral `node:sqlite` instance (`DatabaseSync(':memory:')`) seeded with sandbox schema. | Synchronous statement timeout (busy timeout 5000ms) | SQLite memory budget | 100 max result rows | Strict comment-stripping parser. Multi-statement queries banned (semicolon check). Only `SELECT` and `WITH` CTEs allowed; all mutating keywords (`INSERT`, `UPDATE`, `DROP`, `PRAGMA`, etc.) strictly rejected. | `[BUILT]` (Fully hardened) |
| **`Judge0Driver`** | [`server/src/services/runner/judge0Driver.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/runner/judge0Driver.js) | Conditional (`RUNNER_DRIVER=judge0`) | External Judge0 CE daemon executing code inside Linux kernel cgroups and seccomp filters. | Configurable (5,000ms default) | 128 MB cgroup limit | Configurable | Strict Linux container sandbox with `network: false` flag disabling all socket and outbound network calls. | `[PARTIAL]` (Requires running Docker service) |
| **`LocalDevDriver`** | [`server/src/services/runner/localDevDriver.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/runner/localDevDriver.js) | Dev/Demo fallback | Spawns local Node child process in scratch folder. | 4,000ms watchdog | None | Unbounded | Hardcoded security gate: Throws fatal error immediately if `process.env.NODE_ENV === 'production'`. | `[BUILT]` (Dev only; blocked in prod) |

*Important Architectural Distinction:* `PythonDriver` enforces an **application-level timeout** via `child.kill('SIGKILL')`, not an OS-level cgroup or Docker sandbox. For production deployments requiring untrusted Python code isolation, the `Judge0Driver` with Docker Compose must be utilized.

---

## SECTION 8 — SECURITY AND ACCESS CONTROL

### 8.1 End-to-End Request-to-Database Security Pipeline

```
[Browser Client Request]
  │
  ├── 1. Transport & Reverse Proxy Boundary
  │      TLS Termination (in production) -> Vite Proxy (Dev: port 5173 -> 4000)
  │
  ├── 2. Security Headers (Helmet) [server/src/index.js:L74-87]
  │      X-Content-Type-Options: nosniff, Cross-Origin-Resource-Policy, CSP in production
  │
  ├── 3. CORS Policy Verification [server/src/index.js:L90-105]
  │      Validates origin against corsOrigins whitelist; handles preflight OPTIONS
  │
  ├── 4. Request Payload Parsing & Size Clamping [server/src/index.js:L107]
  │      express.json({ limit: '5mb' }) prevents memory exhaustion DoS
  │
  ├── 5. Sliding-Window Rate Limiting [server/src/middleware/rateLimiter.js]
  │      - Admin Routes: createAdminRateLimiter (120 req / 60s window)
  │      - AI Chat: checkChatRateLimit (25 req / 60s window)
  │
  ├── 6. Token Verification & Authentication [server/src/middleware/authMiddleware.js]
  │      Extracts Authorization: Bearer <token>. Verifies JWT signature (HS256) & expiry.
  │      Binds req.user = { id, email, role, status, institutionId }
  │
  ├── 7. Account Status Verification [server/src/middleware/authMiddleware.js:L27-33]
  │      Verifies req.user.status !== 'suspended' (Returns HTTP 403 Forbidden)
  │
  ├── 8. Role Authorization Enforcement [server/src/middleware/authMiddleware.js:requireRole]
  │      Checks req.user.role against allowedRoles (platform_admin, recruiter, college, candidate)
  │
  ├── 9. Multi-Tenant Organization Scoping [server/src/middleware/authMiddleware.js:L77-105]
  │      Extracts x-org-id header; verifies user's active membership in organisation_memberships
  │      Binds req.orgId to scope all operational queries
  │
  ├── 10. Input Validation & Request Sanitization [server/src/middleware/validate.js]
  │       Validates req.body and req.query against strict Zod schemas; rejects malformed data (HTTP 400)
  │
  ├── 11. Business Service Logic [server/src/services/]
  │       Enforces state machine transitions, capping rules, SLA thresholds, and authorization logic
  │
  ├── 12. Parameterized SQL Database Execution [server/src/data/repository.js]
  │       100% prepared statements (PRAGMA foreign_keys = ON); SQL injection eliminated
  │
  └── 13. Cryptographic Audit Trail [server/src/services/admin/adminAuditService.js]
          Administrative mutations recorded with SHA-256 hash chaining (GENESIS_HASH -> H_n)
```

### 8.2 Cryptographic & Security Mechanisms Summary
- **Password Hashing:** `bcryptjs` with **10 salt rounds** ([`authService.js:L9`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/authService.js#L9)).
- **JWT Signing:** HMAC SHA-256 (`HS256`) signed with `JWT_SECRET`. Enforces 32-character minimum secret in production via [`validateConfig()`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/config/index.js#L40-L58). Default validity: 7 days (`7d`).
- **Google SSO Replay Defense:** Cryptographic single-use nonce (24 random bytes hex) stored in `auth_nonces` table with 10-minute TTL. Nonce is marked consumed atomically upon initial verification.
- **SQL Parameterization:** Zero string-concatenated SQL queries in active data paths. All repository operations utilize `DatabaseSync.prepare(sql).all(...params)` or `.run(...params)`.
- **Tamper-Evident Audit Hash Chain:** Implemented in [`adminAuditService.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/admin/adminAuditService.js).
  - Uses `GENESIS_HASH` (`0000000000000000000000000000000000000000000000000000000000000000`).
  - Serializes audit payloads using canonical deterministic JSON key sorting.
  - Formula: $H_n = \text{SHA-256}(H_{n-1} : \text{canonicalJson}(\text{payload}))$.
  - Chain continuity verified on demand via `verifyAuditChain()` (checks both `prev_hash` continuity and recomputed current `hash`).
  - *Audit Claim Boundary:* The audit chain is **tamper-evident** (detects retroactive DB edits or deleted rows), not tamper-proof (an attacker with direct write access to the host SQLite database file could theoretically re-hash the entire chain if unmonitored).

---

## SECTION 9 — CROSS-CUTTING FEATURES

| Feature Domain | Implementation Status | Implementation Location | Description & Realized Capabilities |
| :--- | :---: | :--- | :--- |
| **In-App Notifications** | `[BUILT]` | [`server/src/services/notificationService.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/notificationService.js) | User notifications stored in SQLite `notifications` table; tracks read/unread flags and target links. |
| **System Announcements** | `[BUILT]` | [`server/src/routes/announcementRoutes.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/routes/announcementRoutes.js) | Role-targeted broadcast banners with user dismissals tracked in `announcement_dismissals`. |
| **Cryptographic Audit Trail** | `[BUILT]` | [`server/src/services/admin/adminAuditService.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/admin/adminAuditService.js) | Tamper-evident administrative audit log with SHA-256 hash chaining and exportable CSV. |
| **Dynamic Feature Flags** | `[BUILT]` | [`server/src/services/admin/featureFlagService.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/admin/featureFlagService.js) | Database-persisted switches in `feature_flags` table controlling runtime flags without restarts. |
| **Document Storage & Streaming** | `[BUILT]` | [`server/src/services/admin/adminApprovalService.js:L340`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/admin/adminApprovalService.js#L340) | Files stored in `server/data/uploads/`; streamed with path traversal and symlink guards. |
| **Public Passport Sharing** | `[BUILT]` | [`server/src/routes/passportShareRoutes.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/routes/passportShareRoutes.js) | Public UUID tokens in `passport_shares` with configurable section visibility toggles. |
| **Request Telemetry Metrics** | `[BUILT]` | [`server/src/middleware/requestMetricsMiddleware.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/middleware/requestMetricsMiddleware.js) | In-memory sliding-window telemetry capturing latency percentiles (p50/p95/p99) and status codes. |
| **Database Backup & Restore** | `[BUILT]` | [`server/src/services/admin/adminSystemService.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/admin/adminSystemService.js) | Streams full binary SQLite backup file (`.db`) and supports single-table CSV exports. |
| **Privacy Cohort Suppression** | `[BUILT]` | [`server/src/services/collegeAnalyticsService.js:L3`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/collegeAnalyticsService.js#L3) | D-09 rule: Suppresses department aggregates when student cohort $N < 3$ to prevent deanonymization. |
| **In-Memory Caching** | `[BUILT]` | GitHub service (30-min TTL), Analytics service (30s TTL) | Native JavaScript `Map` caches with periodic timestamp eviction. No Redis cache in core API. |
| **Scheduled Background Cron** | `[PARTIAL]` | Node `setInterval` in `aiChatService.js` and `requestMetricsMiddleware.js` | In-process periodic memory cleanup. No external worker queue (BullMQ/Celery) present. |
| **Email Delivery Channel** | `NOT FOUND IN REPOSITORY` | N/A | No SMTP client, SendGrid, Resend, or AWS SES adapter exists. All notifications are strictly in-app. |

---

## SECTION 10 — VERIFIED REPOSITORY NUMBERS

All metrics below were computed directly from repository files, schemas, and manifests:

```
========================================================================================
SARATHI REPOSITORY METRIC INVENTORY
========================================================================================
Frontend Source Files (src/):                  260 files
Frontend Lines of Code (src/):                 57,558 LOC
Backend Source Files (server/src/):            113 files
Backend Lines of Code (server/src/):           31,098 LOC
----------------------------------------------------------------------------------------
Total Source Files (excluding vendor/docs):    373 files
Total Source Lines of Code:                    88,656 LOC
----------------------------------------------------------------------------------------
Test Files Count:                              107 files
  - Server Test Files (server/src/test/):       57 files (10,936 LOC)
  - Client Test Files (src/test/ + src/):       50 files (9,210 LOC)
Total Test Lines of Code:                      20,146 LOC
----------------------------------------------------------------------------------------
Page Components (src/pages/):                  48 primary page components
Auxiliary Page Modals/Drawers (src/pages/):    38 files
Total Files in src/pages/:                     86 files
Total Reusable UI Components (src/components): 100 components
----------------------------------------------------------------------------------------
Server Route Files (server/src/routes/):       30 files (29 mounted, 1 unmounted)
Total Registered Backend Endpoints:            237 explicit endpoints
Server Business Services (server/src/services): 64 service modules
----------------------------------------------------------------------------------------
Database Engine:                               node:sqlite (Node.js 22+ built-in)
Current Database Schema Version:               16 (tracked in schema_migrations)
Total SQLite Database Tables:                  76 tables (75 operational + 1 migration)
Total Explicit Database Indexes:               64 indexes
Total Enforced Foreign Key Constraints:        119 foreign keys
----------------------------------------------------------------------------------------
Key Dependency Versions (from package manifests):
  - React:                                     ^19.2.8
  - React Router DOM:                          ^7.18.4
  - Vite:                                      ^8.3.0
  - Tailwind CSS:                              ^4.3.3
  - Express:                                   ^5.1.0 / ^5.3.0
  - isolated-vm:                               ^7.0.1
  - bcryptjs:                                  ^3.0.3
  - jsonwebtoken:                              ^9.0.3
  - google-auth-library:                       ^11.3.1
  - helmet:                                    ^8.3.0
  - zod:                                       ^4.6.7
  - recharts:                                  ^3.10.1
  - @monaco-editor/react:                      ^4.7.0
  - lucide-react:                              ^1.55.0
  - oxlint:                                    ^1.81.0
  - vitest:                                    ^5.0.5
========================================================================================
```

*Counting Methodology Rules:*
- Line counts exclude `node_modules`, `dist`, build output, `scratch/`, and generated report text files.
- Extensions included: `.ts`, `.tsx`, `.js`, `.mjs`, `.json`, `.css`, `.html`.
- Registered endpoint count (237) is calculated by summing explicit `router.METHOD()` registrations across all route files mounted in `server/src/index.js` plus the `/api/health` probe.

---

## SECTION 11 — ASCII SYSTEM ARCHITECTURE SKETCH

```
+=============================================================================================================+
|                                        STAKEHOLDERS & CLIENT PORTALS                                        |
+=============================================================================================================+
|  [Student / Candidate]  |   [Recruiter & Employer]   |   [College & TPO]   |      [Platform Admin]          |
|  /student/*             |   /recruiter/*             |   /college/*        |      /admin/*                  |
|  - Skill Passport       |   - Candidate Sourcing     |   - Cohort Analytics|      - KYC Verification Desk   |
|  - Sandboxed Tests      |   - Job Requisitions       |   - Placement Drives|      - Anti-Cheat Console      |
|  - Career Roadmaps      |   - Match Scoring (70/20)  |   - At-Risk Tracking|      - SHA-256 Audit Trail     |
+-------------------------+----------------------------+---------------------+--------------------------------+
                                                         │
                                                         ▼
+=============================================================================================================+
|                                    REACT 19 FRONTEND APPLICATION (SPA)                                      |
+=============================================================================================================+
| Layout Shells: PublicLayout | StudentLayout | RecruiterLayout | CollegeLayout | AdminLayout (RequireRole)  |
| State Management: AuthContext (JWT Web Storage) | StudentContext | RecruiterContext (Tenant Org Scope)      |
| UI System: Tailwind CSS v4 | Lucide Icons | Monaco Code Editor | Recharts Visualization                     |
| Global Component: FloatingChatbot (Interactive Student Career Copilot)                                     |
| API Client: src/services/apiClient.ts (Auto Bearer token injection, retry on 503/504, 401 dispatch)       |
+=============================================================================================================+
                                                         │ HTTP Requests via Vite Proxy / Reverse Proxy
                                                         ▼
+=============================================================================================================+
|                                      EXPRESS 5 BACKEND API & SECURITY GATEWAY                                |
+=============================================================================================================+
| [1] validateConfig() -> [2] runMigrations(v16) -> [3] Helmet Headers -> [4] CORS -> [5] JSON Parser (5MB)  |
| [6] requestMetricsMiddleware -> [7] /api/health -> [8] authenticate (JWT HS256) -> [9] maintenanceMiddleware |
+-------------------------------------------------------------------------------------------------------------+
                                                         │
            ┌────────────────────────────────────────────┼────────────────────────────────────────────┐
            ▼                                            ▼                                            ▼
   [Public & Auth Routes]                      [Student & Career Routes]                    [Recruiter & Sourcing]
   /api/auth (14)                              /api/candidates (10)                         /api/jobs (7)
   /api/passport (5)                           /api/roadmap (4)                             /api/pipeline (11)
   /api/resources (7)                          /api/resumes (6)                             /api/verifications (3)
            │                                            │                                            │
            ▼                                            ▼                                            ▼
   [College & Analytics]                       [Assessments & Proctoring]                   [Platform Admin Routes]
   /api/college (13)                           /api/assessments (6)                         /api/admin (23)
   /api/analytics (4)                          /api/assessments/v2 (16)                     /api/admin/content (24)
   /api/skills (18)                            /api/chat (3)                                /api/admin/system (11)
+=============================================================================================================+
                                                         │
                                                         ▼
+=============================================================================================================+
|                                             BUSINESS SERVICE LAYER                                          |
+=============================================================================================================+
|  authService & googleAuthService: Nonce replay validation & OAuth identity linking                         |
|  skillEvidenceEngine: SHA-256 deduplication, anti-inflation capping rules (L2/L3/L5), canonical sync        |
|  matchingService: Deterministic 70/20/10 fit scoring with uncertainty index (LOW/MED/HIGH)                  |
|  dependencyGraphService: Skill DAG building, cycle validation, foundational blocker sorting                 |
|  adminAuditService: SHA-256 hash chaining (GENESIS -> H_n) with verifyAuditChain tool                      |
|  integrityRiskService: 8-feature logistic regression anti-cheat model (0-100 advisory score)               |
|  collegeAnalyticsService: Department placement readiness with D-09 cohort suppression (N >= 3)             |
|  aiChatService: Dynamic provider fallback (Gemini -> OpenAI -> sarathi-local-knowledge engine)             |
+=============================================================================================================+
            │                                            │                                            │
            ▼                                            ▼                                            ▼
+───────────────────────────+    +──────────────────────────────────────────+    +────────────────────────────+
|   CODE EXECUTION SANDBOX  |    |     DATA ACCESS & REPOSITORY LAYER       |    |     EXTERNAL ADAPTERS      |
+───────────────────────────+    +──────────────────────────────────────────+    +────────────────────────────+
| RunnerDriver (Factory)    |    | server/src/data/repository.js            |    | Google OAuth2 Library      |
|  ├─ isolated-vm Driver    |    | 100% Prepared Statements (? params)      |    |  (verifyIdToken)           |
|  │  (V8 Isolate Child)    |    | PRAGMA busy_timeout = 5000               |    | GitHub REST API            |
|  ├─ PythonDriver          |    | PRAGMA foreign_keys = ON (119 FKs)       |    |  (Public Repo Analyzer)    |
|  │  (Host Python 3)       |    | PRAGMA journal_mode = WAL                |    | Generative Language API    |
|  ├─ SqlDriver             |    +──────────────────────────────────────────+    |  (Gemini-1.5-flash)        |
|  │  (Hardened :memory:)   |                         │                          | OpenAI Chat API            |
|  └─ Judge0 Driver [PARTIAL]|                         ▼                          |  (gpt-4o-mini)             |
|     (Docker cgroups)      |    +──────────────────────────────────────────+    | Judge0 CE (Docker: 2358)   |
+───────────────────────────+    |     EMBEDDED SQLite DATABASE (v16)       |    +────────────────────────────+
                                 +──────────────────────────────────────────+
                                 | 76 Total Tables Across 13 Domains:       |
                                 |  - Identity & Access (7 tables)          |
                                 |  - Profiles & Skills (11 tables)         |
                                 |  - Organizations & Jobs (13 tables)      |
                                 |  - Assessments & Grading (14 tables)     |
                                 |  - Integrity Events & Scores (3 tables)  |
                                 |  - Roadmaps & Learning (10 tables)       |
                                 |  - College Placement Drives (5 tables)   |
                                 |  - Audit, Flags & System (8 tables)      |
                                 | Physical file: server/data/database.db   |
                                 +──────────────────────────────────────────+
```

---

## SECTION 12 — TOP EIGHT COMPONENTS FOR A ONE-SLIDE PRESENTATION

When presenting SARATHI to academic examiners or technical jury members on a single slide, highlight these eight core architectural pillars:

| Component / Flow | Architectural Significance | Repository Evidence | Status | Slide vs Backup |
| :--- | :--- | :--- | :---: | :--- |
| **1. Evidence-Based Skill Passport & Capped Provenance Ledger** | Replaces unverified resume claims with immutable, anti-inflation proficiency ratings (Levels 1–5) capped by evidence count. | [`server/src/services/skillEvidenceEngine.js:L157-265`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/skillEvidenceEngine.js#L157-L265) | `[BUILT]` | **Primary Slide** |
| **2. Multi-Language Sandboxed Assessment Runner** | Executes student code across JavaScript (V8 Isolate), Python (subprocess), and SQL (hardened in-memory) without compromising host server security. | [`server/src/services/runner/runnerDriver.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/runner/runnerDriver.js), [`isolatedVmDriver.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/runner/isolatedVmDriver.js), [`sqlDriver.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/runner/sqlDriver.js) | `[BUILT]` | **Primary Slide** |
| **3. Deterministic Explainable Match Engine** | Transparent 70% Required + 20% Preferred + 10% Assessment formula featuring explicit uncertainty ratings (LOW/MED/HIGH) and anti-bias disclaimers. | [`server/src/services/matchingService.js:L100-195`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/matchingService.js#L100-L195) | `[BUILT]` | **Primary Slide** |
| **4. 8-Feature Logistic Anti-Cheat & Code Diff Model** | Computes 0–100 advisory integrity risk scores from telemetry and token shingle Jaccard matching without automated punitive bans. | [`server/src/services/admin/integrityRiskService.js:L59-245`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/admin/integrityRiskService.js#L59-L245) | `[BUILT]` | **Primary Slide** |
| **5. Tamper-Evident SHA-256 Admin Audit Log** | Cryptographically links all administrative actions into a verifiable hash chain ($H_n = \text{sha256}(H_{n-1} : \text{payload})$), exposing retroactive DB edits. | [`server/src/services/admin/adminAuditService.js:L75-170`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/admin/adminAuditService.js#L75-L170) | `[BUILT]` | **Primary Slide** |
| **6. Multi-Tenant Role & Organization Scoping** | Clean separation of 4 portal experiences with organization-level data boundaries, tenant headers (`x-org-id`), and strict RBAC. | [`server/src/middleware/authMiddleware.js:L77-105`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/middleware/authMiddleware.js#L77-L105), [`src/components/admin/RequireRole.tsx`](file:///C:/Users/Nishant/Documents/SARATHI/src/components/admin/RequireRole.tsx) | `[BUILT]` | **Primary Slide** |
| **7. Multi-Tier AI Copilot with Local Fallback Engine** | Interactive student career guide dynamically selecting Gemini -> OpenAI -> `sarathi-local-knowledge` rule-based engine when offline. | [`server/src/services/aiChatService.js:L59-87`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/aiChatService.js#L59-L87), [`studentCopilotEngine.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/studentCopilotEngine.js) | `[BUILT]` | **Primary Slide** |
| **8. Privacy-Preserving Institutional Analytics (D-09 Rule)** | Real-time college cohort readiness dashboard enforcing minimum-cohort size ($N \ge 3$) suppression to guarantee student privacy. | [`server/src/services/collegeAnalyticsService.js:L3-16`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/collegeAnalyticsService.js#L3-L16) | `[BUILT]` | **Primary Slide** |

### 12.2 Recommended One-Slide Visual Layout

```
+---------------------------------------------------------------------------------------------------------+
|                               SARATHI: SYSTEM ARCHITECTURE & DATA FLOW                                  |
+---------------------------------------------------------------------------------------------------------+
| [PORTALS]          Student Portal        Recruiter Enterprise      College Dashboard     Admin Console  |
|                 (Skill Passport / Tests) (Sourcing / 70:20 Match) (D-09 Privacy N>=3)  (Audit / KYC)   |
+---------------------------------------------------------------------------------------------------------+
| [API GATEWAY]   Express 5 Pipeline: Helmet Security -> CORS -> JWT HS256 Authentication -> RBAC        |
|                 Sliding-Window Rate Limiting -> Zod Input Validation -> Tenant Scoping (x-org-id)      |
+---------------------------------------------------------------------------------------------------------+
| [CORE ENGINES]  [Evidence Ledger Engine]    [Matching Engine]      [Anti-Cheat Model]  [AI Copilot Engine]|
|                 SHA-256 Deduplication       70% Req / 20% Pref     8-Feature Logistic  Gemini -> OpenAI   |
|                 Anti-Inflation Caps (L1-L5) 10% Assessment Bonus   Token Shingling     Local Fallback     |
+---------------------------------------------------------------------------------------------------------+
| [EXECUTION &    [V8 Isolate Child Runner]   [Host Python 3 Runner] [Hardened SQL]      [Judge0 CE Docker] |
|  DATA ACCESS]   isolated-vm 128MB Watchdog  Isolated Scratch Dir   Ephemeral :memory:  cgroups / seccomp  |
+---------------------------------------------------------------------------------------------------------+
| [DATA STORAGE]  Embedded SQLite 3 (node:sqlite, WAL Mode, Foreign Keys ON, Schema v16)                  |
|                 76 Tables Across 13 Domains | 119 Foreign Keys | SHA-256 Cryptographic Hash Chaining   |
+---------------------------------------------------------------------------------------------------------+
```

*Presentation Slide vs Speaker Notes Boundary:*
- **Keep on Main Slide:** The 5-layer vertical flow, 4 stakeholder portals, 70/20 matching formula, multi-language sandbox drivers, and SQLite WAL database box.
- **Move to Speaker Viva Notes:** Specific regex token shingling parameters, SQLite PRAGMA tuning details, individual Zod schema property lists, and exact SQLite table counts.

---

## SECTION 13 — LIMITATIONS, CONTRADICTIONS, AND UNVERIFIED CLAIMS

To uphold architectural honesty during technical audits and project defenses, the following gaps and implementation boundaries are documented:

1. **Email Notification Channel Not Implemented:**
   - *Status:* `NOT FOUND IN REPOSITORY`.
   - *Evidence:* While email addresses and notification records exist, [`notificationService.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/notificationService.js) exclusively executes `INSERT INTO notifications`. No SMTP, AWS SES, or SendGrid integration exists.
2. **Cloud Object Storage Not Implemented:**
   - *Status:* `NOT FOUND IN REPOSITORY`.
   - *Evidence:* Document uploads in [`adminApprovalService.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/admin/adminApprovalService.js) write to local disk (`server/data/uploads/`). There is no S3 or GCS bucket adapter.
3. **Python Execution Sandbox Boundary:**
   - *Status:* `[PARTIAL]`.
   - *Evidence:* [`pythonDriver.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/runner/pythonDriver.js) relies on an application-level child process timeout. It does not run inside a Linux cgroup or Docker container; host-level resource exhaustion (e.g. fork bombs) is mitigated via process watchdogs but not OS-level container isolation.
4. **Judge0 Driver Production Prerequisite:**
   - *Status:* `[PARTIAL]`.
   - *Evidence:* The Judge0 driver code exists in [`judge0Driver.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/runner/judge0Driver.js) and Docker Compose configuration is present in [`docker-compose.judge0.yml`](file:///C:/Users/Nishant/Documents/SARATHI/docker-compose.judge0.yml), but it requires an independently running Docker container daemon and is not active in default development mode.
5. **Unmounted Route File Discrepancy:**
   - *Status:* Discrepancy Identified.
   - *Evidence:* [`server/src/routes/studentAnalyticsRoutes.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/routes/studentAnalyticsRoutes.js) exists in the repository but is not imported or mounted by [`server/src/index.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/index.js). Its route (`GET /student`) was superseded by [`analyticsRoutes.js:L21`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/routes/analyticsRoutes.js#L21).
6. **Audit Hash Chain Claim Boundary:**
   - *Status:* Tamper-evident, not tamper-proof.
   - *Evidence:* The SHA-256 hash chain in [`adminAuditService.js`](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/admin/adminAuditService.js) effectively detects modified records or deleted rows when validated via `verifyAuditChain()`. However, because it resides in the same SQLite file as application data without a third-party trusted timestamp authority or external append-only ledger, an attacker with root database access could re-hash historical records.
7. **Single-Process SQLite Concurrency Limits:**
   - *Status:* `[BUILT]` (Architectural trade-off).
   - *Evidence:* Node.js 22 built-in `node:sqlite` (`DatabaseSync`) executes synchronously. While WAL mode enables concurrent reads, all writes to the single `database.db` file block other write operations across worker threads.
8. **Client Test Pass/Fail Telemetry:**
   - *Status:* Verified via static analysis; full test suite was not executed during this audit to obey strict non-destructive audit rules. 107 test files (57 server, 50 client) exist with 20,146 test lines of code. Server test logs in `server_test_output.txt` confirm unit test pass rates.
