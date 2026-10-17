# SARATHI — Smart Coding Skill Assessment & Integrity System (PRD v1)

**Scope:** Student Portal → `/student/assessment` (+ minimal reviewer view). Stack: React 19 + TS + Vite + Tailwind 4 | Express 5 + `node:sqlite`.
**Source idea:** `new_idea_for_skill_assi__.md` | **Baseline audit:** `Skill_Assessment_info_by_antigravity.md`

---

## 1. Goal
Replace the client-graded quiz + keyword check with a **server-trusted** assessment: real code execution against hidden tests, mini-projects with rubrics, Practice vs Secure modes, privacy-conscious integrity logging, and skill-gap output that feeds the existing Dashboard, Skill Gap and Skill Passport **without changing how they consume data**.

**Non-goals (v1):** mandatory camera monitoring, automatic cheating penalties, languages beyond JS / Python / SQL, recruiter-side changes, live proctoring or video recording.

---

## 2. Integration Rules (no mess) — NON-NEGOTIABLE

1. **Additive only.** New tables, new routes (`/api/assessments/v2/*`), new components. Do not rename or drop existing tables, columns or routes.
2. **Feature flags.** `ASSESSMENT_V2_ENABLED` (server) and `VITE_ASSESSMENT_V2` (client). Flag off → today's behaviour untouched. Flag on → new flow.
3. **Frozen output contract.** Before coding, capture the current `AssessmentResult` shape (`src/types/assessment.ts`) and what `StudentContext.recordFullAssessmentResult` expects. Build `toLegacyAssessmentResult(v2Result)` so Dashboard, Skill Gap, Skill Passport, readiness formula and `assessmentHistory` need **zero changes**. Add a contract test with a golden fixture.
4. **Old data stays valid.** Existing attempts/results/candidate_skills still render. V2 rows carry `engine_version='v2'`; legacy rows default to `'v1'`.
5. **Reuse the existing skill taxonomy** (`domainsCatalog.ts` / `skills` table). No parallel skill list.
6. **Legacy endpoint** `POST /api/assessments/student-submit`: when V2 is on, it must stop accepting client-computed scores for new writes (return 410 with a message). This closes the score-forgery hole.
7. **One writer.** Only the V2 grading service writes `candidate_skills` from assessments.
8. **Integrity ≠ competency.** Integrity events never change technical scores or `candidate_skills`.
9. **One phase per PR**; every phase leaves the app working with all tests green.

---

## 3. Architecture

```
AssessmentPage (shell) ── useAssessmentEngine ── assessmentV2Service.ts ──► /api/assessments/v2/*
   ├─ ModeSelect / RulesConsent        │                                      ├─ questionBankService (no answers leaked)
   ├─ QuizPanel (MCQ + palette)        └─ adapter → StudentContext            ├─ gradingService (server only)
   ├─ CodeWorkbench (Monaco)              (recordFullAssessmentResult)         ├─ codeRunner (driver interface)
   ├─ ProjectTask (rubric)                                                      ├─ integrityService (separate log)
   ├─ IntegrityMonitor (hook)                                                   └─ reviewService (reviewer roles)
   └─ ResultsReport + SkillGapPlan
```

**Code runner = pluggable driver** (`server/src/services/runner/`):
- `RunnerDriver.run({language, code, tests, limits}) → {status, stdout, stderr, results[], timeMs, memKb}`
- `judge0` driver (self-hosted Docker) — **production**: isolated, CPU/memory/time limits, no network.
- `sql` driver: in-memory `node:sqlite`, seeded dataset, read-only statements only, row/time caps.
- `local-dev` driver (child_process, hard timeout, temp dir): **development only**, refuses to run when `NODE_ENV=production`; documented as not a security boundary.
- `node:vm` is NOT a sandbox and must not be used as one.
- Hidden tests and expected outputs live only in the DB; never serialized to the client.

---

## 4. Data Model (new, additive)

```
assessment_questions(id, version, domain_id, skill_id, type['mcq'|'code'|'sql'|'project'], difficulty 1-3,
                     prompt, options JSON, correct JSON, explanation, starter_code, language, status, created_at)
code_tests(id, question_id, kind['visible'|'hidden'], input, expected_output, weight, timeout_ms)
project_rubrics(id, question_id, criteria JSON [{key,label,weight,description}])
assessment_sessions(id, user_id, mode['practice'|'secure'], domain_id, role, question_ids JSON, bank_version,
                    status['in_progress'|'submitted'|'graded'|'expired'], started_at, expires_at, submitted_at,
                    consent_json, accommodation_json, engine_version DEFAULT 'v2')
submission_snapshots(id, session_id, question_id, code, language, reason['autosave'|'run'|'submit'], created_at)
run_results(id, session_id, question_id, visible_passed, visible_total, status, stdout, stderr, time_ms, created_at)
explanation_answers(id, session_id, question_id, text, rubric_score, needs_review, created_at)
session_scores(session_id PK, technical_score, knowledge_score, practical_score, rubric_json,
               skill_scores JSON, graded_at)
integrity_events(id, session_id, type, ts, meta JSON)            -- separate from scores
integrity_reviews(id, session_id, reviewer_id, decision['no_concern'|'needs_followup'|'concern_confirmed'], note, created_at)
```
Add `engine_version TEXT DEFAULT 'v1'` to `assessment_attempts` via guarded `ALTER`. Migrations are idempotent and non-destructive. Questions are seeded from versioned JSON in `server/src/data/seeds/assessment/` so they are reviewable in git.

**Seed minimums per domain:** ≥ 20 MCQ (all skills, 3 difficulties), ≥ 4 coding tasks (≥ 3 visible + ≥ 5 hidden tests each), ≥ 2 SQL tasks, ≥ 1 mini-project with rubric. Roles without their own content must not fall back to Web Dev.

---

## 5. API (`/api/assessments/v2`, JWT, role `candidate` unless stated)

| Method & Path | Purpose |
|---|---|
| `POST /sessions` `{mode, domainId, role, scope, consent}` | Create session, sample questions (no answers or hidden tests), return `{sessionId, expiresAt, questions, rules}` |
| `GET /sessions/:id` | Resume (owner only) |
| `PUT /sessions/:id/answers` | Autosave MCQ answers + explanation text |
| `POST /sessions/:id/snapshots` | Save code snapshot (throttled, size-capped) |
| `POST /sessions/:id/run` | Run code against **visible** tests only; rate-limited |
| `POST /sessions/:id/integrity-events` | Batch events (secure mode only) |
| `POST /sessions/:id/submit` | Server grades everything; returns result + legacy-compatible payload |
| `GET /sessions/:id/result` | Result with answers/explanations revealed **after** grading |
| `GET /history` | v1 + v2 attempts merged in legacy shape |
| `GET /reviews/queue`, `GET/POST /reviews/:sessionId` | Reviewer roles only (`college` / `admin`) |

Validate every input (zod), check ownership, use one error shape `{error:{code,message}}`.

---

## 6. Feature Requirements

### 6.1 Modes
| | Practice | Secure |
|---|---|---|
| Paste, docs, AI help | Allowed | Paste restriction configurable |
| Hints & instant explanations | Yes | After submit only |
| Timer | Optional | Required, server-authoritative, auto-submit |
| Integrity logging | Off | On, with consent |
| `candidate_skills` | `self_practice`, capped Level 2 | `diagnostic_tested` |
| Readiness / dashboard trend | Excluded (history only, tagged "Practice") | Included |

A rules screen before start explains what is recorded, what is not, who can see it, retention, and how to request an accessible alternative. Consent is stored per session; Secure mode cannot start without it.

### 6.2 Coding Workbench
Monaco (lazy-loaded): syntax highlighting, line numbers, theme, language selector (JS, Python, SQL), problem panel, visible-tests panel, Run button, output console (stdout / stderr / time), submission-history drawer. Autosave snapshots about every 30 s and on Run/Submit. All execution is server-side. Network drop → local buffer, banner, resume.

### 6.3 Mini-Projects
Brief + transparent rubric (functionality, correctness, code quality, problem-solving, requirements). Submit code text and/or GitHub repo URL (+ optional demo URL). Auto-checkable items are scored automatically; the rest are `pending_review`, shown as provisional and finalised by a reviewer. Never invent a rubric score.

### 6.4 Scoring (server only, constants in one config file)
- Knowledge: difficulty-weighted MCQ (1/2/3 points).
- Practical: `0.7 × hidden-test weight + 0.15 × visible + 0.15 × quality/efficiency checks`.
- Explanation question: low weight (≤ 10%), keyword/rubric scored, marked `needs_review` when uncertain.
- **Per-skill level needs evidence:** ≥ 3 weighted items for Level 4–5; 2 items → max Level 3; 1 item → max Level 2. Each skill stores `{level, evidenceCount, confidence: low|medium|high}`.
- Pass threshold from template (default 60). Integrity data is excluded from every formula.

### 6.5 Integrity (Secure mode only)
- Events: `visibility_hidden/visible`, `window_blur/focus`, `copy_blocked`, `paste_blocked` (if enabled), `fullscreen_exit` (if enabled), `network_offline/online`, `session_resume`. Timestamp + small meta only. **No keystroke logging, no screen capture.**
- Tolerance: ≤ 2 tab switches silently logged; at the configured threshold a non-accusatory warning ("Activity is recorded and may be reviewed"). Never auto-fail or auto-submit because of events.
- Offline periods are tagged `network` and excluded from the suspicion summary.
- `integrity_summary {eventCount, longestAwaySec, level: none|notable}` is an **indicator for review, not proof**. The student sees their own summary on the results page.
- Accommodation path: extended time / disabled restrictions, visible to reviewers.
- Retention: events deleted after `INTEGRITY_RETENTION_DAYS` (default 90) by a cleanup job.

### 6.6 Optional Camera (Phase 5, off by default)
Flag `ASSESSMENT_CAMERA_ENABLED=false`. Explicit opt-in with plain-language explanation. Presence/availability check processed in the browser; **no video or images uploaded or stored.** At most timestamp-only events (`camera_unavailable`, `face_not_detected`), never auto-penalised. Denying camera has no score impact and offers the non-camera path. Needs institutional sign-off before enabling.

### 6.7 Results & Skill Gap Plan
Overall score, quiz vs practical split, per-skill level + confidence, rubric breakdown, test-case summary, per-question review (after grading), integrity summary (secure). "Next steps": 3–5 weakest skills → practice tasks from the bank + roadmap tasks/free resources from the existing catalog + "retest in 7 days". Keep the Retake / View Roadmap / Skill Gap CTAs.

### 6.8 Reviewer View (minimal v1)
Roles `college` / `admin` via the existing role guard. Queue of attempts with `integrity.level = notable` or `pending_review` items. Detail: scores, test results, snapshot timeline and diff, event timeline, accommodation flag, decision form (decision + required note). Audit trail in `integrity_reviews`. Reviewers may only finalise `pending_review` rubric items (logged); they cannot edit other technical scores.

### 6.9 Component Split (< 200 lines each)
`AssessmentPage` (shell), `ModeSelect`, `RulesConsent`, `QuestionPalette`, `QuizPanel`, `CodeWorkbench`, `TestOutputConsole`, `ProjectTask`, `IntegrityBanner`, `ResultsReport`, `SkillGapPlan`; hooks `useAssessmentEngine`, `useIntegrityMonitor`, `useAutosave`, `useCountdown`.

---

## 7. Dashboard / Passport Integration
- Graded Secure session → adapter → existing `recordFullAssessmentResult` → readiness, gaps, passport update as today.
- Assessment history bar shows a mode tag; the readiness trend uses Secure sessions only. Changes go through existing `useDashboardData` mappers; no new dashboard charts.
- Passport badge for V2 skills: "Diagnostic Evaluated" with evidence count/confidence in a tooltip. Existing badge tiers unchanged.

---

## 8. Phases (each shippable, flag-guarded)
1. **Foundation:** baseline + golden fixture, migrations, seed loader, question-bank service, session create/resume, server-side MCQ grading, adapter, legacy-endpoint guard.
2. **Workbench & Runner:** Monaco, RunnerDriver (local-dev, sql, judge0 + docker-compose), visible/hidden tests, snapshots, rate limits.
3. **Scoring & Results:** evidence-based levels, mini-project rubrics, explanation questions, results report, skill-gap plan, merged history.
4. **Integrity & Review:** consent screen, event logger, warnings, accommodations, retention job, reviewer queue + decisions.
5. **Optional camera + polish:** flagged camera opt-in, a11y pass, performance, docs.

---

## 9. Non-Functional
- **Security:** no answers or hidden tests in client responses before grading; per-user rate limits; code ≤ 20 KB; output truncated; runner limits (e.g. 5 s CPU, 128 MB, no network); no secrets in runner env.
- **Fairness:** autosave + resume after refresh/disconnect; `expires_at` is server-authoritative, tolerant of clock skew.
- **A11y:** keyboard-operable palette, screen-reader labels, contrast ≥ 4.5:1, reduced-motion respected.
- **Performance:** Monaco and workbench lazy-loaded; shell stays light before the workbench loads.
- **Observability:** structured logs for runner/grading failures; never log student code.

## 10. Testing & Definition of Done
- **Contract:** v2 result → legacy adapter matches the golden fixture; existing Dashboard/Gap/Passport tests unchanged and green.
- **Server:** every route (success, validation, unauthorized, other user, expired session, flag off); grading unit tests incl. evidence caps; runner tests (timeout, infinite loop, memory, SQL write attempt blocked); migration idempotency; legacy endpoint returns 410 when flag on.
- **Client:** engine hook, autosave/resume, countdown/auto-submit, integrity hook (visibility events, threshold warning), consent gating, workbench run flow (mocked API).
- **Manual E2E:** practice run → secure run → refresh mid-test → tab switches → submit → results → dashboard/gap/passport updated → reviewer decision.
- **DoD:** `tsc -b`, `oxlint`, `vite build`, client + server tests pass; flag OFF behaves identically to baseline; no TODOs; CHANGELOG, `.env.example` and runner docs updated; each item above marked PASS/FAIL with evidence.

## 11. Risks
- Judge0 needs Docker; the local-dev driver is for development only. Production must use an isolated runner.
- Question-bank quality is the largest content task: review seeds with a mentor.
- Review and camera features carry privacy obligations (consent, retention, access control).

---

# PROMPT FOR ANTIGRAVITY (paste as-is)

```
You are a senior full-stack engineer, security-minded architect and QA lead working in
c:/Users/Nishant/Documents/SARATHI (React 19 + TS + Vite + Tailwind 4; Express 5 + node:sqlite).
Scope: the Student Portal Skill Assessment slide (/student/assessment) plus a minimal reviewer view.

SOURCE OF TRUTH: SARATHI_SMART_ASSESSMENT_PRD.md. Read it fully first. Also read
Skill_Assessment_info_by_antigravity.md (baseline audit) and new_idea_for_skill_assi__.md (product idea).
Where the PRD is silent, choose the simplest robust option and log it in docs/CHANGELOG.md.

MOST IMPORTANT RULE - DO NOT MAKE A MESS IN INTEGRATION
- Everything is ADDITIVE and behind flags (ASSESSMENT_V2_ENABLED on server, VITE_ASSESSMENT_V2 on client).
  With flags OFF the app must behave exactly as it does today.
- Do not rename/drop existing tables, columns, routes, types or context APIs. Do not change how StudentContext,
  Dashboard (useDashboardData), SkillGapPage or SkillPassportPage consume assessment data.
- Build toLegacyAssessmentResult() so V2 output flows through the existing recordFullAssessmentResult unchanged.
  Capture a golden fixture of the current AssessmentResult shape BEFORE coding and add a contract test.
- Reuse the existing skill taxonomy (domainsCatalog.ts / skills table). Never create a parallel skill list.
- Integrity events must never alter technical scores or candidate_skills.
- Only the server grades. Correct answers, hidden tests and expected outputs must never reach the client before
  grading. When V2 is on, the legacy student-submit endpoint must stop accepting client-computed scores.

HOW TO WORK
1. Phase 0 (no feature code): run current server + client tests, tsc, oxlint and vite build; record the baseline.
   Print an impact map: files you will ADD, files you will MODIFY (with the exact reason), files you will NOT touch.
   Keep the MODIFY list as small as possible.
2. Implement PRD section 8 phases 1 to 5 strictly in order. After each phase run: npm --prefix server test, client
   tests, tsc -b, oxlint, vite build, and a manual check with the flag OFF and ON. Do not start the next phase until
   everything is green. Paste command results at the end of each phase.
3. Migrations must be idempotent and non-destructive (CREATE TABLE IF NOT EXISTS, guarded ALTER, default
   engine_version='v1'). Include a rollback note.
4. Code runner: implement RunnerDriver with judge0, sql and local-dev drivers per PRD section 3. local-dev must refuse
   to run when NODE_ENV=production. Never use node:vm as a security boundary. Add docker-compose + docs for Judge0.
   State clearly in the report what is and is not isolated.
5. Privacy and fairness: consent screen before Secure mode, non-accusatory wording, no keystroke logging, no screen
   capture, accommodation path, retention cleanup job. Camera stays OFF by default behind its own flag and must not
   upload or store video or images.
6. Content: seed the question bank per PRD section 4 as versioned JSON in server/src/data/seeds/assessment/. Keep
   questions technically correct; list any you are unsure about under "needs human review".
7. Split AssessmentPage.tsx into the components/hooks in PRD section 6.9 (< 200 lines each). Lazy-load Monaco.
8. Tests are mandatory per PRD section 10. Fix root causes; never skip, delete or weaken existing tests.
9. If something needs a decision outside the PRD (changing existing tables, roles, etc.), STOP and ask me.
10. Be honest: anything you cannot verify here (e.g. Docker/Judge0) must be reported as "not verified" with the
    manual steps I need to run.

DELIVERABLES
- Working V2 behind flags: migrations, seeds, routes, services, components, hooks, tests.
- docs/CHANGELOG.md, updated .env.example (all new env vars), README section for runner + flags.
- Final report: planned vs actual changes, PRD section 10 checklist PASS/FAIL with evidence, flags-off regression
  result, open risks, and the "needs human review" list.

START NOW with Phase 0: print the baseline results and the impact map before writing any feature code.
```
