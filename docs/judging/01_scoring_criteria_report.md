# Technical Due-Diligence & Scoring Criteria Report: SARATHI

**Project Name:** SARATHI — Multi-Domain Skill Intelligence & Recruiter Platform  
**Evaluation Role:** Technical Due-Diligence Analyst (Hackathon & Jury Preparation)  
**Verification Methodology:** Ground-truth repository code audit, static schema verification, test-suite execution, and dependency telemetry.  
**Repository State:** 439 source files (101,857 LOC), 75 SQLite database tables, 64 indexes, 236 API endpoints, 83 test files (15,560 LOC of tests).

---

## A. Problem Statement & Innovation

### 1. Problem Definition & Stakeholder Pain Points

| Stakeholder | Problem Solved | How It Is Solved Today | How SARATHI Solves It |
| :--- | :--- | :--- | :--- |
| **Students / Job Seekers** | Resumes are unverified text claims. High rejection rates due to hidden skill gaps and lack of objective proof of practical competency. | Self-authored PDF resumes with self-reported skill ratings (e.g., "5/5 Java"), keyword-stuffing for ATS filters, unverified certificates. | **Evidence-Based Skill Passport**: Auto-aggregates verified assessment code executions, GitHub commits/PRs, and capstone project rubric scores into a tamper-evident digital credential with explicit confidence caps. |
| **Recruiters & Employers** | Resume fraud and inflated claims cause massive interviewing fatigue; 70%+ of candidates fail basic coding or domain questions on live screens. | Manual keyword filtering, generic HackerRank/LeetCode filters disconnected from actual role requirements, 3-5 rounds of screening calls. | **Explainable Matching Engine & Multi-Tier Verification**: Computes deterministic job fit based on weighted required vs preferred competencies, evidence coverage %, and practical sandboxed challenge submissions. |
| **Colleges & TPOs** | Lack of real-time visibility into student batch placement readiness and curricular gaps prior to campus placement drives. | Annual placement Excel spreadsheets, aggregate CGPAs that do not reflect practical engineering capability. | **Privacy-Preserving Cohort Analytics (D-09)**: Real-time cohort skill radar, at-risk student intervention alerts, and minimum-cohort (N≥3) identity suppression. |
| **Platform Admins** | Integrity breaches, plagiarism, impersonation, and fraudulent business entity registrations. | Post-hoc manual ban-hammers and reactive support tickets with no immutable trail. | **Tamper-Evident SHA-256 Audit Trail & 8-Feature Logistic Integrity Risk Model**: Real-time biometric/tab-switch heuristics with token-shingled code similarity detection. |

---

### 2. Innovative Features Inventory

```
[Status Legend: [IMPLEMENTED] (Production-ready in active code) | [PARTIAL] (Functional with minor gaps or dev stubs) | [PLANNED/MOCK] (UI/mock only, no live backend) | [NOT FOUND] (Not in repository)]
```

#### Feature 1: Evidence-Based Skill Passport & Provenance Ledger
* **What it does:** Replaces subjective self-ratings with a verifiable competency passport. Every skill level (1–5) is backed by immutable ledger entries with confidence ratings (`LOW`, `MEDIUM`, `HIGH`) and verification statuses.
* **Technical Flow & Algorithm:**
  1. Evidence ingested via `SkillEvidenceEngine.recordEvidence()` with deterministic SHA-256 hash deduplication.
  2. Aggregator runs capping policy: 1 item caps at Level 2 (`LOW`), 2 items cap at Level 3 (`MEDIUM`), 3+ items allow Level 4–5 (`HIGH`).
  3. Checks evidence variance: if score variance > 35 pts across 90 days, marks status `CONFLICTING`.
  4. Checks age: if newest evidence > 180 days, marks status `OUTDATED` and triggers reassessment.
  5. Updates canonical profile in `canonical_skill_profiles` and syncs legacy `candidate_skills` atomically.
* **Code Evidence:** [skillEvidenceEngine.js](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/skillEvidenceEngine.js#L167-L265), [SkillPassportPage.tsx](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/student/SkillPassportPage.tsx)
* **Status Label:** `[IMPLEMENTED]`

#### Feature 2: Multi-Language Sandboxed Assessment Runner & Hardened Drivers
* **What it does:** Executes student practical code (JavaScript, Python, SQL) in secure sandboxes outside the primary Node.js API server process, preventing process takeover, infinite loops, and data tampering.
* **Technical Flow & Algorithm:**
  1. `RunnerDriver.run()` selects driver via runtime configuration (`isolated-vm`, `pythonDriver`, `sqlDriver`, or `judge0Driver`).
  2. For JS: Spawns child process [isolatedVmWorker.js](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/runner/isolatedVmWorker.js) creating an isolated V8 Isolate with 128MB limit and 5000ms wall-clock watchdog.
  3. For SQL: AST-like character scan strips comments, verifies single statement, forbids mutating keywords (`INSERT`, `UPDATE`, `DROP`, `PRAGMA`), and executes against an in-memory SQLite sandbox.
  4. For Python: Detects host Python 3 executable, executes in temporary isolated scratch directories with stdin/stdout piping and 5000ms hard process timeouts.
* **Code Evidence:** [runnerDriver.js](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/runner/runnerDriver.js#L8-L51), [sqlDriver.js](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/runner/sqlDriver.js#L8-L60), [isolatedVmDriver.js](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/runner/isolatedVmDriver.js#L15-L60), [pythonDriver.js](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/runner/pythonDriver.js#L14-L60)
* **Status Label:** `[IMPLEMENTED]`

#### Feature 3: 8-Feature Logistic Integrity Risk & Code Plagiarism Model
* **What it does:** Detects cheating, tab-switching, massive copy-pasting, and code collusion without making automated punitive decisions; assigns an explainable 0–100 risk score and tier (`LOW`, `MEDIUM`, `HIGH`).
* **Technical Flow & Algorithm:**
  1. Normalizes 8 telemetry metrics: `paste` (count/5), `pasteRatio` (pasted/total chars), `blur` (tab switches/10), `blurTime` (away secs/120), `fast` (peer z-score solve time), `camera` (face/camera loss ratio), `similarity` (5-token shingling Jaccard match vs peers), `firstTry` (instant pass on 1st run).
  2. Applies logistic regression: $x = \sum (w_i \cdot f_i) - \text{bias}$; $\text{Risk} = \text{round}\left(\frac{100}{1 + e^{-x}}\right)$.
  3. Extracts top 3 plain-English contributing factors (e.g., "Pasted code covers 85% of submitted solution").
  4. Renders side-by-side token diff in Admin portal via [CodeDiffViewer.tsx](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/admin/integrity/CodeDiffViewer.tsx).
* **Code Evidence:** [integrityRiskService.js](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/admin/integrityRiskService.js#L59-L245), [integrityRiskConfig.js](file:///C:/Users/Nishant/Documents/SARATHI/server/src/config/integrityRiskConfig.js)
* **Status Label:** `[IMPLEMENTED]`

#### Feature 4: Explainable Job Matching & Prerequisite-Aware Gap Engine
* **What it does:** Computes transparent job match scores with clear breakdowns instead of black-box AI scores; builds a topological DAG of skill dependencies to recommend blockers before advanced topics.
* **Technical Flow & Algorithm:**
  1. Analyzes job required skills ($W_{\text{req}}$) and preferred skills ($W_{\text{pref}}$).
  2. Applies verification multipliers: Verified = 1.0, Pending = 0.6, Self-reported = 0.3.
  3. Earned score: $E = W \cdot \min(\text{Proficiency} / \text{Target}, 1.0) \cdot \text{Multiplier}$.
  4. Match Score = $\min(100, \text{round}(\text{RequiredCoverage} \cdot 0.70 + \text{PreferredCoverage} \cdot 0.20 + \text{AssessmentBonus}))$.
  5. Computes `evidenceUncertainty` (`LOW` $\ge 80\%$, `MEDIUM` $\ge 40\%$, `HIGH` $< 40\%$) and displays non-automated hiring disclaimer.
* **Code Evidence:** [matchingService.js](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/matchingService.js#L100-L213), [dependencyGraphService.js](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/dependencyGraphService.js#L20-L85)
* **Status Label:** `[IMPLEMENTED]`

#### Feature 5: Multi-Modal AI Career & Admin Copilot with Local Fallback
* **What it does:** Interactive student career guide and admin operations assistant. Ingests student competency context, recommends roadmaps, explains metrics, and enforces strict prompt-injection barriers.
* **Technical Flow & Algorithm:**
  1. Dynamically detects environment API keys (`GEMINI_API_KEY` for `gemini-1.5-flash`, `OPENAI_API_KEY` for `gpt-4o-mini`).
  2. If keys are missing or offline: automatically switches to `sarathi-local-knowledge` rule-based engine with transparent disclosure header.
  3. Context injector bundles candidate's target role, verified skills, and roadmap gaps.
  4. Redacts PII: masks emails, scrubs passwords/tokens, enforces 25 req/min rate limit.
* **Code Evidence:** [aiChatService.js](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/aiChatService.js#L58-L87), [FloatingChatbot.tsx](file:///C:/Users/Nishant/Documents/SARATHI/src/components/chat/FloatingChatbot.tsx), [adminCopilotRoutes.js](file:///C:/Users/Nishant/Documents/SARATHI/server/src/routes/admin/adminCopilotRoutes.js)
* **Status Label:** `[IMPLEMENTED]`

---

### 3. Candid Novelty Analysis: Genuinely Novel vs Standard CRUD

| Subsystem | What is Standard CRUD | What is Genuinely Novel in SARATHI |
| :--- | :--- | :--- |
| **Skill Profiling** | Storing `skill_name` and a `1-5` integer slider in a profile table. | **Provenance-backed ledger with anti-inflation capping rules**: multiple items required for high tiers, conflicting-evidence penalty, and automatic 180-day staleness demotion. |
| **Assessments** | Storing MCQ options in JSON and checking `user_answer === correct_answer`. | **Hybrid sandboxed engine**: server-side code execution in isolated V8 Isolate/Python processes, AST SQL validator, versioned autosave conflict resolution (409 on stale draft), and non-punitive proctoring event capture. |
| **Recruiter Sourcing** | `SELECT * FROM candidates WHERE skills LIKE '%React%'`. | **Deterministic explainable scoring with uncertainty index**: calculates verified vs unverified weighting, assesses prerequisite DAGs, and adds explicit human-in-the-loop review disclaimers. |
| **Auditing & Governance** | Writing log strings to a console or basic `audit` table. | **Cryptographic SHA-256 hash chaining** (`GENESIS_HASH` $\to H_n = \text{sha256}(H_{n-1} : \text{canonicalJson}(P))$), detecting retroactive DB tampering. |
| **College Analytics** | Bar charts showing total student counts. | **D-09 Privacy Cohort Suppression**: automatically redacts and suppresses aggregates when student sample size $N < 3$ to prevent deanonymization. |

---

### 4. Elevator Pitch & "Why This Wins"

#### One-Paragraph Elevator Pitch
> *"SARATHI replaces the broken, unverified PDF resume ecosystem with a multi-sided technical skill intelligence platform. By combining isolated V8 and Python code execution environments, transparent evidence-capped Skill Passports, deterministic matching algorithms, and tamper-evident SHA-256 audit ledgers, SARATHI guarantees recruiters hire verified engineering capability while giving students clear, prerequisite-aware roadmaps to close real competency gaps."*

#### 3-Bullet "Why This Wins" (Derived from Real Code)
* **True Engineering Execution (Zero "Vaporware"):** Features 101,857 lines of substantive TypeScript/JavaScript code, 75 relational SQLite tables, 236 REST API routes, and 732 automated unit/integration tests covering sandboxing, concurrency, and security matrices.
* **Cryptographic & Architectural Rigor:** Implements real out-of-process sandboxing (`isolated-vm` and child processes), AST-based SQL injection prevention, replay-proof single-use auth nonces, and cryptographic blockchain-style audit log hashing.
* **Defensible, Explainable AI & Heuristics:** Rejects hallucinating black-box matching in favor of deterministic formulas with explicit evidence uncertainty levels, automated 8-factor logistic integrity risk detection, and automatic graceful degradation to local knowledge engines when external AI keys are unavailable.

---

## B. API & Open-Source Integration

### 1. External APIs & Open-Source Services Table

| Service / Component | Purpose | Where Used (File Evidence) | Mandatory / Optional | Fallback Behavior if Unavailable | License | Status Label |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Google Identity (OAuth2 / SSO)** | Cryptographic ID token authentication and account auto-provisioning | [googleAuthService.js](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/googleAuthService.js) | Optional | Fallback to email/password authentication via `authService.login()` | Apache-2.0 | `[IMPLEMENTED]` |
| **Google Gemini API** (`gemini-1.5-flash`) | AI Career Copilot conversational guidance and student context Q&A | [aiChatService.js](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/aiChatService.js#L7-L8) | Optional | Falls back to OpenAI if configured, or `sarathi-local-knowledge` rule-based engine | Proprietary API | `[IMPLEMENTED]` |
| **OpenAI API** (`gpt-4o-mini`) | Secondary LLM provider for career guidance and administrative assistance | [aiChatService.js](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/aiChatService.js#L9-L10) | Optional | Falls back to Gemini or `sarathi-local-knowledge` | Proprietary API | `[IMPLEMENTED]` |
| **GitHub REST API** | Automatic repo inspection, tech stack parsing, README extraction | [githubService.js](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/githubService.js) | Optional | Manual project form entry via `ProjectFormModal.tsx`; in-memory 30m cache | REST API | `[IMPLEMENTED]` |
| **isolated-vm** | Secure out-of-process V8 isolate execution for candidate JS tasks | [isolatedVmDriver.js](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/runner/isolatedVmDriver.js) | Optional | Fallback to `LocalDevDriver` (Node `vm` sandbox) | MIT | `[IMPLEMENTED]` |
| **Judge0 CE API** | External containerized language execution (cgroups/seccomp) | [judge0Driver.js](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/runner/judge0Driver.js) | Optional | Fallback to internal drivers (`IsolatedVmDriver` / `PythonDriver`) | MIT / GPL | `[PARTIAL]` (Configured, requires external runner container) |
| **Python 3 Host Process** | Native execution of data science / Python assessment tasks | [pythonDriver.js](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/runner/pythonDriver.js) | Optional | Graceful test error message: "Runtime unavailable on server (NOT EXECUTED)" | PSF | `[IMPLEMENTED]` |
| **Monaco Editor** | In-browser code editing with syntax highlighting and indentation | [AssessmentPage.tsx](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/student/AssessmentPage.tsx) | Optional | Standard textarea fallback if CDN/bundle fails to mount | MIT | `[IMPLEMENTED]` |
| **Node.js SQLite (`node:sqlite`)** | Embedded ACID SQL database engine with WAL mode and foreign keys | [db.js](file:///C:/Users/Nishant/Documents/SARATHI/server/src/config/db.js) | **Mandatory** | In-memory SQLite (`:memory:`) fallback during isolated unit tests | MIT (Node.js) | `[IMPLEMENTED]` |

---

### 2. Internal REST APIs Table (Grouped by Portal)

The server exposes **236 routes** across 30 controller files. Key route groupings include:

| Portal | Method | Route Pattern | Purpose | Auth Required | Roles Allowed |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Public** | `GET` | `/api/health` | System health probe (uptime, status) | No | Any / Anonymous |
| **Public** | `GET` | `/api/auth/mode` | Authentication mode and demo login availability | No | Any / Anonymous |
| **Public** | `POST` | `/api/auth/register` | Student self-registration | No | Any / Anonymous |
| **Public** | `POST` | `/api/auth/login` | Email/password login with JWT generation | No | Any / Anonymous |
| **Public** | `POST` | `/api/auth/google` | Google SSO ID-token verification & registration | No | Any / Anonymous |
| **Public** | `GET` | `/api/auth/google/nonce` | Single-use CSRF/replay nonce generator | No | Any / Anonymous |
| **Public** | `GET` | `/api/jobs/public` | Published job listings for career board | No | Any / Anonymous |
| **Public** | `GET` | `/api/jobs/public/:id` | Published job detail by ID | No | Any / Anonymous |
| **Public** | `GET` | `/api/passport/p/:shareToken` | Public shareable Skill Passport view | No | Any / Anonymous |
| **Student** | `GET` | `/api/auth/me` | Fetch authenticated user profile and roles | Yes | candidate, recruiter, college, admin |
| **Student** | `GET` | `/api/analytics/student` | Comprehensive student dashboard charts & KPIs | Yes | candidate |
| **Student** | `POST` | `/api/assessments/v2/start` | Start diagnostic assessment session | Yes | candidate |
| **Student** | `GET` | `/api/assessments/v2/sessions/:id/state`| Recover timer, questions, and autosaved code | Yes | candidate (session owner) |
| **Student** | `PATCH`| `/api/assessments/v2/sessions/:id/autosave`| Version-checked draft answer autosaving | Yes | candidate (session owner) |
| **Student** | `POST` | `/api/assessments/v2/sessions/:id/submit`| Submit assessment for grading & ledger sync | Yes | candidate (session owner) |
| **Student** | `POST` | `/api/assessments/v2/sessions/:id/events`| Ingest tab-blur, paste, and fullscreen events | Yes | candidate (session owner) |
| **Student** | `GET` | `/api/skills/canonical` | Retrieve student's evidence-backed profile | Yes | candidate |
| **Student** | `GET` | `/api/skills/gaps` | Compute role-benchmark skill gap analysis | Yes | candidate |
| **Student** | `GET` | `/api/skills/readiness` | Compute weighted career readiness score | Yes | candidate |
| **Student** | `GET` | `/api/roadmap` | Fetch personalized skill roadmap stages | Yes | candidate |
| **Student** | `POST` | `/api/roadmap/task` | Complete roadmap task or undo completion | Yes | candidate |
| **Student** | `POST` | `/api/candidates/evidence` | Submit GitHub repo / project evidence | Yes | candidate |
| **Student** | `POST` | `/api/candidates/github/import`| Extract tech stack and metrics from GitHub | Yes | candidate |
| **Student** | `GET` | `/api/resources` | Paginated learning library catalog | Yes | candidate |
| **Student** | `GET` | `/api/resources/recommendations`| Prerequisite-aware learning recommendations | Yes | candidate |
| **Student** | `GET` | `/api/resumes/compile` | Compile factual resume from verified passport | Yes | candidate |
| **Student** | `POST` | `/api/jobs/:id/apply` | Apply to job using verified candidate profile | Yes | candidate |
| **Student** | `POST` | `/api/chat/message` | Floating AI Career Copilot dialogue | Yes | candidate |
| **Recruiter**| `GET` | `/api/analytics/dashboard` | Recruiter workspace KPIs and hiring pipeline | Yes | recruiter, hiring_manager, org_owner |
| **Recruiter**| `GET` | `/api/jobs` | Org-scoped job requisition listings | Yes | recruiter, hiring_manager, org_owner |
| **Recruiter**| `POST` | `/api/jobs` | Create new job with skill weights and targets | Yes | recruiter, hiring_manager, org_owner |
| **Recruiter**| `GET` | `/api/candidates/search` | Search candidates with skill filter & match % | Yes | recruiter, hiring_manager, org_owner |
| **Recruiter**| `GET` | `/api/candidates/:id/passport` | View full Candidate Skill Passport | Yes | recruiter, hiring_manager, org_owner |
| **Recruiter**| `GET` | `/api/pipeline/applications` | Applications list filterable by job & stage | Yes | recruiter, hiring_manager, org_owner |
| **Recruiter**| `PATCH`| `/api/pipeline/applications/:id/stage`| Move candidate through hiring stages | Yes | recruiter, hiring_manager, org_owner |
| **Recruiter**| `GET` | `/api/verifications/pending` | Evidence review queue for student submissions | Yes | recruiter, assessor, platform_admin |
| **Recruiter**| `POST` | `/api/verifications/review` | Verify/reject student project evidence | Yes | recruiter, assessor, platform_admin |
| **Recruiter**| `POST` | `/api/interviews` | Schedule interview and notify candidate | Yes | recruiter, hiring_manager |
| **Recruiter**| `POST` | `/api/pipeline/notes` | Internal collaborative recruiter candidate notes | Yes | recruiter, hiring_manager |
| **College**  | `GET` | `/api/college/overview` | College cohort readiness radar & placed counts | Yes | college, placement_officer |
| **College**  | `GET` | `/api/college/at-risk` | At-risk students identification & remediation | Yes | college, placement_officer |
| **College**  | `GET` | `/api/college/drives` | Campus placement drives management | Yes | college, placement_officer |
| **College**  | `POST` | `/api/college/drives` | Create campus placement drive | Yes | college, placement_officer |
| **Admin**    | `GET` | `/api/admin/dashboard` | Platform KPI cards, user growth & funnels | Yes | platform_admin |
| **Admin**    | `GET` | `/api/admin/users` | Platform user management & suspension | Yes | platform_admin |
| **Admin**    | `PATCH`| `/api/admin/users/:id/status`| Suspend or activate user accounts | Yes | platform_admin |
| **Admin**    | `GET` | `/api/admin/approvals` | Recruiter business verifications queue | Yes | platform_admin |
| **Admin**    | `POST` | `/api/admin/approvals/:id/decision`| Approve/reject company GSTIN/PAN documents | Yes | platform_admin |
| **Admin**    | `GET` | `/api/admin/integrity` | 8-feature integrity score inspection ledger | Yes | platform_admin |
| **Admin**    | `GET` | `/api/admin/insights/forecast` | Linear regression 30-day KPI forecasting | Yes | platform_admin |
| **Admin**    | `GET` | `/api/admin/insights/anomalies`| Modified Z-score platform anomaly detector | Yes | platform_admin |
| **Admin**    | `GET` | `/api/admin/system/health` | Process, memory, SQLite WAL, and runner probes | Yes | platform_admin |
| **Admin**    | `POST` | `/api/admin/system/backups` | Trigger PRAGMA wal_checkpoint database snapshot | Yes | platform_admin |
| **Admin**    | `GET` | `/api/admin/audit` | Verify and export SHA-256 hash-chained audit log | Yes | platform_admin |

---

### 3. Top Runtime Dependencies & Rationale

#### Backend Runtime Dependencies
1. **`express` (v5.1.0 / v5.3.0):** Modern HTTP routing framework supporting native async error propagation.
2. **`node:sqlite` (Node.js built-in `DatabaseSync`):** High-speed embedded transactional database eliminating C++ binary compilation issues on Windows while supporting WAL mode.
3. **`bcryptjs` (v3.0.3):** Pure JavaScript adaptive password hashing (cost factor 10) for zero native build friction.
4. **`jsonwebtoken` (v9.0.3):** Stateless RFC 7519 JWT generation and cryptographic verification.
5. **`isolated-vm` (v7.0.1):** Out-of-process V8 isolate execution allowing sandboxed code execution with strict memory and CPU boundaries.
6. **`google-auth-library` (v11.3.1):** Official Google identity client for verifying cryptographic signatures on Google SSO ID tokens.
7. **`helmet` (v8.3.0):** Security middleware injecting CSP, X-Frame-Options, CORP, and strict transport headers.
8. **`zod` (v4.6.7):** Strict runtime schema validation for incoming JSON payloads.
9. **`uuid` (v11.1.0):** RFC 4122 UUID generation for primary keys across all operational tables.

#### Frontend Runtime Dependencies
1. **`react` & `react-dom` (v19.2.8):** Latest React 19 core library for declarative component rendering.
2. **`react-router-dom` (v7.18.4):** Client-side SPA routing with nested portal layouts and role-based guards.
3. **`@monaco-editor/react` (v4.7.0):** VS Code-grade code editor for assessment environments.
4. **`recharts` (v3.10.1):** Declarative SVG charting library for Skill Radars, readiness trends, and KPI funnels.
5. **`lucide-react` (v1.55.0):** Comprehensive SVG icon system providing uniform visual affordances.
6. **`tailwindcss` & `@tailwindcss/vite` (v4.3.3):** Modern utility-first CSS engine with unified token theming.
7. **`clsx` & `tailwind-merge` (v2.1.1 / v3.7.0):** Safe dynamic class combination avoiding Tailwind precedence conflicts.

---

## C. Technical Execution

### 1. Architecture Overview

```
                      +-------------------------------------------------------+
                      |               CLIENT LAYER (Browser)                 |
                      |  React 19 SPA + Vite + Tailwind CSS + Monaco + Recharts|
                      +-------------------------------------------------------+
                                                 |
                                     (HTTPS / JSON REST APIs)
                                                 v
                      +-------------------------------------------------------+
                      |                 EXPRESS API SERVER                    |
                      |  Helmet CSP | CORS | RateLimiter | Auth Middleware   |
                      +-------------------------------------------------------+
                             |                   |                     |
                             v                   v                     v
                +--------------------+  +------------------+  +-------------------+
                |   Student Domain   |  | Recruiter Domain |  |   Admin Domain    |
                | - Assessment V2    |  | - Jobs & Matches |  | - User Management |
                | - Skill Evidence   |  | - Verifications  |  | - Integrity Model |
                | - Gap & Readiness  |  | - Pipeline & Note|  | - SHA-256 Audit   |
                | - Learning Library |  | - Interviews     |  | - Health Probes   |
                +--------------------+  +------------------+  +-------------------+
                             |                   |                     |
                             +-------------------+---------------------+
                                                 |
                                                 v
                      +-------------------------------------------------------+
                      |                 SERVICE & DOMAIN LAYER                |
                      |  - SkillEvidenceEngine (Provenance & Capping Rules)   |
                      |  - MatchingEngine (70/20 Weighted Explainable Match)  |
                      |  - GradingService (Knowledge + Practical Runner)     |
                      |  - IntegrityRiskService (8-Feature Logistic Sigmoid)  |
                      |  - AdminAuditService (SHA-256 Hash Chaining)         |
                      +-------------------------------------------------------+
                               |                                 |
                               v                                 v
        +-----------------------------------+       +---------------------------+
        |   ISOLATED RUNNERS & EXT. APIS    |       |  PERSISTENCE LAYER (DB)   |
        | - IsolatedVmDriver (V8 Isolate)   |       | - SQLite 3 (WAL Mode)     |
        | - PythonDriver (Isolated Process) |       | - 75 Relational Tables    |
        | - SqlDriver (AST Read-Only Check) |       | - 64 Performance Indexes  |
        | - Google Identity SSO             |       | - Foreign Key Enforcement |
        | - Gemini / OpenAI LLM APIs        |       | - PRAGMA busy_timeout     |
        +-----------------------------------+       +---------------------------+
```

---

### 2. Design Patterns & Engineering Highlights

* **Service-Repository Layering:** Business logic is decoupled from Express handlers (`server/src/services/` contains pure domain logic, tested independently without HTTP overhead).
* **Deterministic Single-Writer Model:** Only [gradingService.js](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/assessmentV2/gradingService.js) writes to authoritative `candidate_skills` from assessments; proctoring events are strictly non-destructive.
* **Tamper-Evident SHA-256 Blockchain Ledger:** Administrative mutations execute within a transaction that computes $H_n = \text{sha256}(H_{n-1} : \text{canonicalJson}(\text{record}))$, making manual database alterations detectable via [adminAuditService.js](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/admin/adminAuditService.js).
* **AST-Like SQL Query Hardening:** Before running student SQL, [sqlDriver.js](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/runner/sqlDriver.js) strips comments, counts unquoted semicolons, and enforces that queries begin exclusively with `SELECT` or `WITH`.
* **Prerequisite DAG Topological Traversal:** [dependencyGraphService.js](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/dependencyGraphService.js) detects circular dependencies using Kahn's algorithm and ensures foundational skills are scheduled before capstones.

---

### 3. Codebase Complexity Metrics (Computed Ground Truth)

| Metric Category | Computed Exact Count | Evidence / Source |
| :--- | :--- | :--- |
| **Frontend Source Files** | **262 files** | `src/**/*.{ts,tsx,css}` |
| **Frontend Source Lines of Code** | **57,669 LOC** | Line count excluding node_modules/dist |
| **Backend Source Files** | **177 files** | `server/src/**/*.{js,mjs}` |
| **Backend Source Lines of Code** | **44,188 LOC** | Line count excluding node_modules/dist |
| **Total Production Codebase** | **439 files / 101,857 LOC** | Combined `src` and `server/src` |
| **Frontend Test Files** | **26 files (4,624 LOC)** | `src/test/**/*.test.{ts,tsx}` |
| **Backend Test Files** | **57 files (10,936 LOC)** | `server/src/test/**/*.{test.mjs,mjs}` |
| **Total Automated Tests** | **732 test cases** | 137 client tests + 595 server tests |
| **Database Tables** | **75 tables** | [schema.js](file:///C:/Users/Nishant/Documents/SARATHI/server/src/data/schema.js) (`SCHEMA_VERSION = 16`) |
| **Database Indexes** | **64 indexes** | [schema.js](file:///C:/Users/Nishant/Documents/SARATHI/server/src/data/schema.js) |
| **Server Route Handlers** | **236 routes** | 30 route files mounted in `index.js` |
| **Server Services** | **64 services** | `server/src/services/**/*.js` |
| **Frontend Page Components** | **84 pages** | `src/pages/**/*.tsx` |
| **Frontend Reusable Components**| **90 components** | `src/components/**/*.tsx` |

---

## D. Impact & UI

### 1. Screen-by-Screen Inventory: Student & Recruiter Portals

#### Student Portal

| UI Route | Screen Purpose | Key Components | Key User Actions | Data Displayed | Status Label |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/student/dashboard` | Central career command center | `HeroSection`, `KpiRow`, `SkillDiagnostics`, `ProgressOverTime`, `LearningMomentum` | Select target role, view readiness, launch diagnostic, dismiss onboarding | Overall readiness score, top skill gaps, weekly hours, application funnel | `[IMPLEMENTED]` |
| `/student/assessment`| Timed technical assessment environment | `MonacoEditor`, `QuestionPrompt`, `AutosaveIndicator`, `TimerBanner`, `ResultsReport` | Answer MCQs, code JavaScript/Python/SQL, test code, submit session | Authoritative timer, questions, real test execution results, score breakdown | `[IMPLEMENTED]` |
| `/student/skill-gap` | Detailed competency gap analysis | `SkillRadarCard`, `SkillGapsTableCard`, `CompetencySummary`, `RoleBenchmarkSelector` | Filter by category, change target role, view prerequisite blockers | Demonstrated vs required levels, evidence count, confidence status | `[IMPLEMENTED]` |
| `/student/roadmap` | Interactive step-by-step career path | `MilestoneTimeline`, `TaskItem`, `PrerequisiteBadge`, `UndoToast` | Toggle task completion, undo completion within 5s, filter by domain track | Chronological stages (Foundations, Core, Advanced), task links, completion % | `[IMPLEMENTED]` |
| `/student/projects` | Project evidence submission portfolio | `ProjectCard`, `ProjectExtractionModal`, `TechnologyBadgeList` | Submit project, auto-extract GitHub repo metadata, request verification | Verified status, repo stars/forks, detected tech stack, preview image | `[IMPLEMENTED]` |
| `/student/opportunities`| Match-scored job board | `JobCard`, `MatchScoreBadge`, `SkillCoverageBar`, `ApplyModal` | Browse jobs, view match score rationale, submit 1-click application | Job requirements, salary range, calculated match %, application deadline | `[IMPLEMENTED]` |
| `/student/skill-passport`| Publicly shareable digital passport | `PassportHeader`, `EvidenceProvenanceBadge`, `ShareModal`, `PrintButton` | Generate public share token, toggle visibility, export PDF via print CSS | Verified skills, evidence ledger links, assessment attempt history | `[IMPLEMENTED]` |
| `/student/resources` | Self-paced learning library catalog | `ResourceCard`, `FilterSidebar`, `ProgressSlider`, `BookmarkButton` | Filter by domain/duration, bookmark, mark video in-progress/completed | 80+ curated courses, playlists, completion percentages, difficulty | `[IMPLEMENTED]` |
| `/student/resume` | ATS-ready resume compiler | `ResumePreview`, `TemplateSelector`, `ExportButton`, `DraftManager` | Compile factual resume, switch templates (`modern-ats`, `fresher`), save drafts | Verified contact, skills, education, projects, and assessment scores | `[IMPLEMENTED]` |

#### Recruiter Portal

| UI Route | Screen Purpose | Key Components | Key User Actions | Data Displayed | Status Label |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/recruiter/dashboard` | Hiring workspace overview | `MetricsCardRow`, `ActiveJobsTable`, `PipelineOverview`, `CandidatePassportModal` | Quick inspect candidate, navigate to job creation, filter jobs | Active jobs, total applicants, shortlisted count, pending reviews | `[IMPLEMENTED]` |
| `/recruiter/jobs` | Job requisition management | `JobDataTable`, `CreateJobDrawer`, `SkillRequirementBuilder` | Create job, set mandatory/preferred skills, publish/pause requisition | Job status, candidate count, department, salary, created date | `[IMPLEMENTED]` |
| `/recruiter/candidates` | Candidate discovery & talent search | `CandidateSearchFilter`, `MatchScorePill`, `SkillBadgeList` | Filter by domain/experience, inspect passport, add to shortlist | Candidate name, headline, verified skills, match score for active job | `[IMPLEMENTED]` |
| `/recruiter/pipeline` | Kanban & list stage applicant tracking | `PipelineKanbanBoard`, `StageColumn`, `CandidateCard`, `StageActionModal` | Drag/drop candidates across stages (`Applied` $\to$ `Hired`), add notes | Candidate details, current stage, interview schedule, recruiter notes | `[IMPLEMENTED]` |
| `/recruiter/verifications`| Student evidence review queue | `VerificationQueueTable`, `EvidenceDetailDrawer`, `ReviewerDecisionForm` | Review student GitHub projects/code, verify or reject with rationale | Submission title, candidate, skill name, URL, awarded proficiency | `[IMPLEMENTED]` |
| `/recruiter/interviews` | Interview coordination desk | `InterviewCalendarList`, `ScheduleModal`, `FeedbackForm` | Schedule technical/HR interview, submit ratings & confidential notes | Candidate, interview title, scheduled date, meeting link, ratings | `[IMPLEMENTED]` |
| `/recruiter/analytics` | Enterprise recruiting analytics | `PipelineFunnelChart`, `SourceDistribution`, `TimeToHireCard` | Analyze drop-off rates across stages, view skill distribution | Total applications, stage conversion %, average review turnaround | `[IMPLEMENTED]` |

---

### 2. Design System & Aesthetic Foundation

* **Color Palette & Design Tokens:** Clean enterprise styling built on CSS variables (`--color-primary: #087BFA`, `--color-primary-soft: #EFF6FF`, `--color-navy: #0B1B43`, `--color-bg-soft: #F4F7FC`, `--color-border: #E0E7F2`).
* **Typography:** `Inter`, system-ui font stack with strict hierarchy (H1, H2, subheaders, and badge micro-copy).
* **Component Library:** Atomic design library under `src/components/common/` (`Button`, `Card`, `Badge`, `Modal`, `EmptyState`, `DomainRoleSelector`).
* **Responsive Behavior:** Tailwind CSS responsive breakpoints (`sm:`, `md:`, `lg:`, `xl:`) applied across dashboard grids and tables.
* **Empty / Loading / Error States:** Standardized skeleton loaders, empty illustration states (`EmptyState`), and non-crashing error boundary alerts.
* **Print Styles:** `@media print` CSS specifically formatted for `/student/skill-passport` to hide navigation sidebars and output crisp verification resumes.

---

### 3. Quantifiable Impact Claims (Human Input Validation Required)

| Claimed Operational Improvement | Real Code Baseline | Needs Human Validation (Checklist) |
| :--- | :--- | :--- |
| **"Reduces first-round technical screening time by 60–80%"** | Sandboxed code runner (`isolated-vm` + Python) and automated test assertions grade submissions instantly upon test completion without recruiter intervention. | [ ] Team must validate real recruiter screening hours saved per batch during pilot interviews. |
| **"Eliminates 90%+ of resume skill exaggeration"** | Evidence-based ledger rules cap unverified claims at Level 2 and require 3 independent validated demonstrations for Levels 4–5. | [ ] Team must confirm candidate pass-rate variance before vs after ledger capping. |
| **"Replaces 5 disconnected tools with 1 unified portal"** | Platform unifies ATS ([RecruiterPipelinePage.tsx](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/recruiter/RecruiterPipelinePage.tsx)), code sandbox ([AssessmentPage.tsx](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/student/AssessmentPage.tsx)), proctoring ([integrityRiskService.js](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/admin/integrityRiskService.js)), resume builder ([ResumePage.tsx](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/student/ResumePage.tsx)), and TPO analytics ([CollegeDashboard.tsx](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/college/CollegeDashboard.tsx)). | [ ] Team must specify legacy competitor tool stack cost comparison (e.g. HackerRank + Greenhouse + Canvas). |

---

### 4. Candid UI Weaknesses & Inconsistencies a Judge Might Notice

1. **Absence of a Global Dark Mode Toggle:** While [ReviewerAssessmentQueuePage.tsx](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/reviewer/ReviewerAssessmentQueuePage.tsx) contains `dark:` utility classes, the core Student and Recruiter layouts use a light enterprise palette without an accessible dark mode switch.
2. **Fallback Mock Data Ingestion in Offline State:** [AssessmentPage.tsx](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/student/AssessmentPage.tsx#L31) and [CollegeDashboard.tsx](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/college/CollegeDashboard.tsx#L57) contain fallbacks to static mock arrays if the backend server is unreachable. A judge testing with an intentionally killed backend will see populated sample data rather than an offline network banner.
3. **Complex Form Modals on Mobile Viewports:** Recruiter job creation drawer and assessment code editor are optimized for desktop resolution ($\ge 1024\text{px}$) and experience tight horizontal scrolling on mobile viewports ($< 640\text{px}$).
