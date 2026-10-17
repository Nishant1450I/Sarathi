# SARATHI Student Portal — PRD + Master Prompt (v2)

**Stack:** React 19 + TS + Vite + Tailwind 4 | Express 5 + `node:sqlite` | Recharts
**Goal:** Make the Student Portal fully persistent, bug-free, analytics-rich and production-ready. SQLite is the single source of truth; `localStorage` is cache only.

---

## 1. Problems to Fix (from audit)

| ID | Problem | Fix |
|---|---|---|
| P0-1 | `node_modules` missing, server tests fail | `npm install` in root + `server/`; add npm workspaces |
| P0-2 | Profile edits lost on refresh | `PUT /api/candidates/profile`, wire `updateProfile` |
| P1-1 | Roadmaps only in localStorage | `student_roadmaps` table + `GET/PUT /api/roadmap` |
| P1-2 | Settings not saved | `user_settings` table + `GET/PUT /api/settings` |
| P1-3 | Forgot password is a mock | `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` |
| P2-1 | Notifications hardcoded | `notifications` table + real events |
| P2-2 | Passport share link is private | Public `/passport/:publicId` |
| P3-1 | Dead Supabase code | Delete `supabase.ts`, uninstall package |
| P3-2 | No frontend tests | Add Vitest + RTL |

---

## 2. Target Architecture

- **Rule:** UI → Context → Service → REST → SQLite. Context hydrates from API on login; writes are optimistic with rollback on error; localStorage only caches.
- **API layer:** one `apiClient.ts` (auth header, 401 → logout, error normalisation, retry on network failure, loading/error state).
- **Validation:** server-side on every write (use `zod`); consistent error shape `{ error: { code, message } }`.
- **Prod safety:** refuse to start if `NODE_ENV=production` and `JWT_SECRET` missing or `ENABLE_DEMO_AUTH=true`. Add `helmet`, CORS allowlist, rate limit on auth routes.

### New tables
```
student_roadmaps(id, user_id, track_key, completed_task_ids JSON, updated_at, UNIQUE(user_id,track_key))
user_settings(user_id PK, email_digest, roadmap_reminders, job_alerts, updated_at)
notifications(id, user_id, type, title, body, link, is_read, created_at)
password_resets(id, user_id, token_hash, expires_at, used_at)
passport_shares(user_id PK, public_id UNIQUE, is_public, created_at)
learning_resources(id, domain, skill_tags JSON, title, provider, type, url, is_free, level, duration, language)
resource_bookmarks(user_id, resource_id, created_at, PK(user_id,resource_id))
resource_progress(user_id, resource_id, status, updated_at)
```
Also add to `candidate_profiles`: `github_url, linkedin_url, portfolio_url`.

### New endpoints
`PUT /api/candidates/profile` · `GET/PUT /api/roadmap` · `GET/PUT /api/settings` · `POST /api/auth/change-password` · `POST /api/auth/forgot-password` · `POST /api/auth/reset-password` · `GET /api/notifications` · `PATCH /api/notifications/read-all` · `PATCH /api/notifications/:id/read` · `GET/POST/DELETE /api/passport/share` · `GET /api/public/passport/:publicId` (no auth, no email/phone) · `GET /api/resources?domain=&skill=&type=&free=` · `POST/DELETE /api/resources/:id/bookmark` · `PUT /api/resources/:id/progress` · `GET /api/analytics/student` · `POST /api/candidates/github/import`

Notification triggers: application stage change, project verified/rejected, assessment completed, roadmap stage completed, new job ≥ 75% match.

---

## 3. Features & Acceptance Criteria

### 3.1 Profile
Edit name, institution, degree, grad year, bio, GitHub/LinkedIn/portfolio URLs. URL validation. Persists after refresh and on another browser. Skeleton loader while fetching.

### 3.2 Projects (GitHub-focused)
- Fields: title, description, tech, skills, **GitHub repo URL (required, must match `github.com/{user}/{repo}`)**, live demo URL, optional screenshot URL.
- Show GitHub icon button on each card; "Open Repo" and "Live Demo" links (`target=_blank rel=noopener noreferrer`).
- **Repo auto-fill:** `POST /api/candidates/github/import` fetches public repo metadata (name, description, languages, stars, last push) from the GitHub REST API (unauthenticated, cached, handles 403/404/rate limit gracefully) and pre-fills the form.
- Profile-level "GitHub Profile" card: top languages bar, public repo count.
- Status badges: Draft → Pending Review → Verified / Rejected (with reviewer note).

### 3.3 Roadmap
Server-persisted per `(user, track)`. Task toggle = optimistic update + debounce save. Stage unlocks, % per stage, overall %. Each task links to a resource from the catalog.

### 3.4 Courses & Free Resources (see §5)
Browse by domain/skill/type/level; filter "Free only"; bookmark; mark Not started / In progress / Completed. Skill-gap page shows "Recommended resources" for each high-priority gap (match by `skill_tags`). Completed resources raise the roadmap progress and feed the activity chart.

### 3.5 Analytics Dashboard (statistical charts) — `/student/analytics` + dashboard widgets
All from `GET /api/analytics/student`; every chart has loading, empty, and error states, tooltips, ARIA labels, and is responsive (<400px: horizontal bars, truncated labels).

| Chart | Type | Data |
|---|---|---|
| Skill radar | Radar | current vs required, per skill category |
| Benchmark gap | Horizontal grouped bar | current vs required per skill |
| Readiness trend | Line | readiness score by week/assessment |
| Assessment history | Bar + line | score % per attempt, by category |
| Gap priority split | Donut | high / medium / low counts |
| Roadmap progress | Stacked bar | % per stage |
| Learning activity | Heatmap or area | tasks/resources completed per day (last 12 weeks) |
| Application funnel | Funnel/bar | applied → review → shortlist → interview → offer |
| Job match distribution | Histogram | match % buckets of open jobs |
| Resource mix | Pie | videos / courses / docs / practice |
| GitHub languages | Donut | from imported repos |

Add summary stats: streak days, hours learned, avg assessment score, percentile vs cohort (only if ≥ 20 students, else hide). Export analytics as PDF via print stylesheet.

### 3.6 Settings
Persisted preferences, change password (current + new), delete-account request. Logged out on password change elsewhere = token version bump.

### 3.7 Notifications
Bell with unread count (poll 60s), real list, mark one/all read, click navigates to `link`.

### 3.8 Password reset
Hashed single-use token, 30-min expiry, same response whether email exists or not, dev mode logs reset link to console (plug SMTP later via env).

### 3.9 Public Skill Passport
Student toggles public; random `publicId` (not the user id); shows only verified skills, verified projects, readiness; "Copy public link"; revoke at any time.

### 3.10 Help & Feedback
`/student/help`: FAQ accordion + feedback form (`feedback` table: user_id, category, message, created_at).

### 3.11 Resume (phase 3)
Add `resume_url` field + simple auto-generated resume PDF/print page from profile, verified skills and projects. (File upload deferred.)

---

## 4. Non-Functional Requirements
- No `console.error` or unhandled promise rejections in normal flows; zero TS errors, zero lint errors; `vite build` clean.
- Every async action: loading, success, error UI. Every list: empty state.
- A11y: keyboard-operable clickable cards (`role=button`, Enter/Space), contrast ≥ 4.5:1 (fix `#8FA1C0` 10px labels), focus rings, labelled charts.
- Split `StudentDashboard.tsx` (1,200+ lines) into section components.
- Code editor textarea uses `font-mono`.
- Token expiry mid-assessment: save draft, show re-login prompt, restore draft.
- Migrations are idempotent (`CREATE TABLE IF NOT EXISTS`, guarded `ALTER`).
- Tests: server unit + integration for every new route (auth, ownership, validation); Vitest for readiness score, gap priority, roadmap %, analytics mappers, ProfilePage save. Target 100% pass.

---

## 5. Resource Catalog (seed `learning_resources`)

> Seed top-level, stable URLs only. Add `scripts/check-links.mjs` that HEAD-requests every URL and reports dead ones; run it before release. Mark `is_free` honestly (course audit/free tier = free; certificates may cost).

**General / Software Eng.** — CS50x (cs50.harvard.edu), freeCodeCamp (freecodecamp.org), The Odin Project (theodinproject.com), roadmap.sh, MIT OpenCourseWare (ocw.mit.edu), NPTEL (nptel.ac.in), GeeksforGeeks, Git: Pro Git book (git-scm.com/book)

**Web Dev** — MDN Web Docs (developer.mozilla.org), javascript.info, React docs (react.dev), Full Stack Open (fullstackopen.com), web.dev/learn, Node.js docs

**AI/ML & Data Science** — Andrew Ng ML Specialization (Coursera, audit free), fast.ai, Kaggle Learn (kaggle.com/learn), Google ML Crash Course, Hugging Face Course (huggingface.co/learn), scikit-learn docs, Pandas docs, SQLBolt, Mode SQL tutorial

**Cybersecurity** — TryHackMe (free tier), OverTheWire, PortSwigger Web Security Academy, OWASP Top 10, Cisco Networking Academy (free courses), Google Cybersecurity Certificate (Coursera, audit)

**Cloud/DevOps** — Microsoft Learn, AWS Skill Builder (free tier), Google Cloud Skills Boost (free labs), Docker docs, Kubernetes docs (kubernetes.io/docs/tutorials), KodeKloud free labs, Linux Journey

**Mobile** — Android Developers (Kotlin courses), Flutter docs & codelabs, Apple Develop in Swift tutorials, React Native docs

**YouTube channels (free)** — freeCodeCamp.org, Traversy Media, Fireship, CodeWithHarry (Hindi), Apna College (Hindi), Love Babbar (DSA), Striver / take U forward (DSA), Krish Naik (ML), StatQuest, 3Blue1Brown, Sentdex, Tech With Tim, NetworkChuck, John Hammond / LiveOverflow (security), TechWorld with Nana (DevOps), Hussein Nasser (backend), Programming with Mosh, Corey Schafer (Python), Philipp Lackner (Android), Flutter official channel, Simplilearn / Edureka (free full-length courses).

Resource schema example:
```json
{ "domain":"web-dev","skill_tags":["JavaScript","DOM"],"title":"JavaScript Algorithms and Data Structures",
  "provider":"freeCodeCamp","type":"course","url":"https://www.freecodecamp.org/","is_free":true,"level":"beginner","duration":"~300h","language":"en" }
```
Types: `course | video | playlist | docs | practice | book`. Each domain needs ≥ 15 resources (≥ 5 YouTube, ≥ 5 courses, rest docs/practice) mapped to its skills, with ≥ 1 Hindi option where available. Direct-link YouTube **channels/playlists** only after verifying them; never invent video IDs.

---

## 6. Delivery Phases
1. **Foundation:** install deps, workspaces, fix tests green, `apiClient`, zod validation, prod guards, remove Supabase.
2. **Persistence:** profile, roadmap, settings, change/forgot/reset password.
3. **Engagement:** notifications, resource catalog + bookmarks + progress, GitHub import, projects UI.
4. **Insight:** analytics endpoint + all charts, public passport, help/feedback.
5. **Quality:** split dashboard, a11y fixes, Vitest suite, link checker, final regression.

## 7. Definition of Done
All items in the audit checklist (§L) ticked; every acceptance criterion above verified; `npm test` (server + client), `tsc -b`, `oxlint`, `vite build` all pass with zero errors; manual E2E: signup → profile → domain → assessment → gap → roadmap → resource → project (GitHub) → apply → notification → public passport → logout.

---

# MASTER PROMPT (paste into your AI coding agent)

```
You are a senior full-stack engineer, architect, UI/UX reviewer and QA lead working in the repo
c:/Users/Nishant/Documents/SARATHI (React 19 + TS + Vite + Tailwind 4 frontend, Express 5 + node:sqlite backend).
Scope: STUDENT PORTAL ONLY (do not break recruiter/college flows).

SOURCE OF TRUTH: Follow the PRD in SARATHI_STUDENT_PORTAL_PRD.md (sections 1-7) exactly. Where I did not
specify something, choose the simplest robust option and note it in docs/CHANGELOG.md.

WORKING RULES
1. Work phase by phase (PRD §6). Before each phase: list files you will touch. After each phase: run
   `npm install` (if needed), `npm --prefix server test`, client tests, `tsc -b`, `oxlint`, `vite build`.
   Do not start the next phase until all are green. Paste the command results.
2. SQLite is the source of truth. localStorage is cache only. Never trust the client: derive user id from the
   JWT, validate all input with zod, use parameterized SQL, check ownership on every query.
3. Migrations must be idempotent and must not delete existing data.
4. Every async UI action needs loading, success and error states; every list needs an empty state; every chart
   needs loading/empty/error, tooltips, ARIA labels and mobile layout (<400px).
5. No placeholder or mock data in production paths. No TODOs left. No dead imports. No console errors.
6. Write tests for every new endpoint (success, validation error, unauthorized, forbidden/other-user) and for
   client logic (readiness score, gap priority, roadmap %, analytics mappers, ProfilePage save). Fix root causes,
   never skip or weaken a test.
7. Keep changes minimal and consistent with existing design tokens (#0B1B43, #087BFA, #603DF5, #F4F7FC) and
   components (Card, Button, Badge, ProgressBar, EmptyState).
8. Resources: seed learning_resources per PRD §5 using only top-level URLs you are confident are real; build
   scripts/check-links.mjs; never fabricate YouTube video IDs or course URLs. If unsure about a URL, omit it
   and list it under "needs manual verification" in the changelog.
9. If you find a bug not in the PRD, fix it and log it; if a fix would change architecture beyond the PRD,
   stop and ask me first.

DELIVERABLES
- Working code for all PRD features, new migrations, routes, services, tests.
- docs/CHANGELOG.md (what changed, why, assumptions), updated .env.example, README run steps.
- A final report: checklist from the PRD §7 with PASS/FAIL and evidence (command output, file links),
  plus remaining risks.

START NOW with Phase 1. First print your plan, then implement. Be honest: if something cannot be verified,
say "not verified" rather than claiming it works.
```
