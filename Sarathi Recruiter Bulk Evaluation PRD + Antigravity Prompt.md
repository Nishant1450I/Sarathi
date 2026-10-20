# Sarathi: Recruiter Bulk Evaluation (Pipeline Triage)

PRD, idea list and Antigravity build prompt for the Applicants & Pipeline screen.

## 1. What the screenshot shows

The current Kanban is a good start, but a recruiter reviewing dozens or hundreds of students will hit these problems:

- **Cards are identical and low-signal.** Every card in a column reads "Student Candidate, 0 Yrs Exp, 17%". Nothing helps a recruiter tell one student from another.
- **Names are truncated** ("Pipeline Unit ...", "Senior Full-Sta..."), and the title shown ("Senior Full-Stack") is the job, not the candidate.
- **Duplicate-looking cards.** The same "Anita Roy" and "Pipeline Unit" cards repeat. The recruiter cannot tell whether these are duplicates, multiple applications, or test data.
- **No bulk actions.** Moving candidates one by one through a small "Move To..." dropdown does not scale.
- **No sort, filter or search inside the board.** A column with 5+ cards forces long vertical scrolling, and the board scrolls horizontally with a clipped first column.
- **The match % has no explanation.** 17% appears on a candidate marked "Hired", so the score and the stage contradict each other and trust drops.
- **"0 Verified" and "0 Yrs Exp" are dead space** for students. Projects, assessments, certifications and internships should replace experience.
- **Empty stages take as much room as full ones.**

## 2. Core idea

Shift the recruiter from reading every profile to **reviewing a ranked, explained shortlist and acting in bulk**. Every feature below serves one of three jobs: **Narrow, Compare, Decide.**

## 3. Ideas, grouped by job

### Narrow (cut the pile fast)

1. **Smart filters and saved views.** Skills (verified only), CGPA range, graduation year, college tier, location, assessment score, availability. Save as views such as "Verified React, 2026 grads".
2. **Must-have / nice-to-have gates.** The recruiter marks job requirements as hard gates. Candidates failing a gate are auto-collapsed into a "Below bar" group instead of cluttering the board.
3. **Duplicate and test-data detection.** Merge duplicate applications from the same candidate and flag obvious test or placeholder profiles.
4. **Auto-triage inbox.** New applicants land in a "Needs review" queue with AI buckets: Strong fit, Possible, Weak fit. Recruiters clear it with keyboard shortcuts.
5. **Search inside the pipeline** by name, skill, college or project keyword.

### Compare (judge fairly, quickly)

6. **Explainable match score.** Break the score into skills match, verified skills, assessment performance, project relevance and learning velocity. Show "why 82%" on hover, with the matched and missing skills.
7. **Compact vs rich card density toggle.** Dense table-row mode for 100+ candidates, card mode for small pools.
8. **Side-by-side compare** for 2 to 4 candidates, with skills, assessment scores, projects and verification status.
9. **Quick-preview drawer.** Click a candidate to open a right-side drawer with a skill-passport summary, top 3 projects, assessment results and an AI summary, without leaving the board.
10. **AI candidate summary in 3 lines:** strengths, gaps, one risk. Always labelled AI-generated and linked to the evidence it used.
11. **Evidence-first signals for students.** Verified skills, assessment percentile, GitHub or project quality, certifications, internships and hackathons replace "Yrs Exp".

### Decide (act without friction)

12. **Multi-select and bulk actions.** Move stage, invite to assessment, schedule interviews, send rejection or hold email, add to shortlist, add tag.
13. **Keyboard-driven review mode** (swipe-style): next, shortlist, reject, hold, with undo.
14. **Assessment auto-advance rules.** For example, score of 70 or more moves to Interview Scheduled automatically, and below 40 goes to a review-to-reject list. Recruiters stay in control with a confirmation step.
15. **Interview scheduling in bulk** with panel availability and one-click slot links for students.
16. **Scorecards and structured feedback** with a rubric per job, so interview results become comparable.
17. **Audit trail and human-review controls.** Every automated move records who or what did it and why. Required for the platform's "complete audit history" promise.
18. **Fairness guardrails.** Option for blind review (hide name, college, photo) during first screening, and bias checks on rejection patterns.

### Board hygiene

19. **Collapse empty columns** and show counts. Pin the stages the recruiter cares about.
20. **Per-job board scoping.** Default to one job at a time, because mixing postings creates the duplicate-looking cards.
21. **Stage aging.** Highlight candidates stuck in a stage for more than N days (SLA chip).
22. **Pagination or virtualised lists** per column with "Load more" so 500 applicants do not slow the page.

## 4. PRD

### 4.1 Overview

**Product:** Sarathi, Employer module, Talent Acquisition, Applicants & Pipeline. **Feature name:** Recruiter Bulk Evaluation (Pipeline Triage). **Owner:** Product (Lead Recruiter persona: Vikram Mehta). **Status:** Draft v1.

### 4.2 Problem statement

Recruiters receive many student applications for each posting. Student profiles lack work experience, so cards look alike and the current board gives no way to rank, compare, filter or act in bulk. Result: slow screening, inconsistent decisions, low trust in the match score, and strong candidates missed.

### 4.3 Goals and non-goals

**Goals**

- Reduce time to screen 100 applicants from hours to under 30 minutes.
- Make every shortlist decision explainable and auditable.
- Let recruiters act on many candidates at once.

**Non-goals (v1)**

- Replacing the recruiter's final decision with full automation.
- A new assessment engine (reuse the existing Assessments module).
- Candidate-side UI changes.

### 4.4 Personas

- **Lead Recruiter (primary):** screens high volume, needs speed and defensible decisions.
- **Hiring Manager (secondary):** reviews the shortlist and gives interview feedback.
- **Admin / Compliance (tertiary):** needs audit logs and fairness controls.

### 4.5 User stories

1. As a recruiter, I can filter and sort applicants by verified skills, assessment score and match so I only look at relevant ones.
2. As a recruiter, I can see why a candidate has a given match percentage.
3. As a recruiter, I can select many candidates and move, tag, email or schedule them in one action.
4. As a recruiter, I can open a candidate preview without leaving the board.
5. As a recruiter, I can compare up to 4 candidates side by side.
6. As a recruiter, I can switch between card and compact list density.
7. As a recruiter, I can set automation rules and review what they did.
8. As a compliance admin, I can see a full audit trail for every stage change.

### 4.6 Functional requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Filter bar: skills, verified-only, CGPA, grad year, college, location, assessment score range, availability, tags | P0 |
| FR-2 | Sort by match %, assessment score, verified skill count, applied date, time in stage | P0 |
| FR-3 | Multi-select with checkbox on each card, "select all in column", floating bulk-action bar | P0 |
| FR-4 | Bulk actions: move stage, add tag, add to shortlist, send templated email, invite to assessment | P0 |
| FR-5 | Match score breakdown popover with matched and missing skills and weights | P0 |
| FR-6 | Card redesign: full name (no truncation, tooltip), college, grad year, top 3 verified skills, assessment score, match badge | P0 |
| FR-7 | Density toggle: Card / Compact table | P1 |
| FR-8 | Quick-preview side drawer with skill passport summary, projects, assessments, AI summary | P0 |
| FR-9 | Side-by-side compare for 2 to 4 candidates | P1 |
| FR-10 | Must-have gates that auto-group failing candidates into "Below bar" (collapsible, never deleted) | P1 |
| FR-11 | Duplicate application detection and merge suggestion | P1 |
| FR-12 | Rule-based auto-advance with confirmation and undo | P2 |
| FR-13 | Keyboard review mode (J/K navigate, S shortlist, R reject, H hold, U undo) | P2 |
| FR-14 | Blind-review toggle hiding name, photo, college | P2 |
| FR-15 | Stage aging chips and SLA warnings | P2 |
| FR-16 | Audit log for every move: actor (human, rule or AI), reason, timestamp | P0 |
| FR-17 | Per-column pagination or virtual scroll; empty columns collapse | P1 |
| FR-18 | Saved views per recruiter | P1 |

### 4.7 Match score rules

- Score is a weighted sum shown as a percentage with a visible breakdown.
- Default weights: verified skills 35, assessment 25, project relevance 20, education/graduation fit 10, learning velocity 10. Recruiters may adjust weights per job.
- Stage and score must be consistent. If a candidate is advanced manually despite a low score, show a "Manual override" badge and log the reason.
- AI summaries must cite their evidence and be labelled as AI-generated.

### 4.8 UX notes

- Board header gains a toolbar: Search, Filters, Sort, Density, Compare, Saved views.
- Selecting any card reveals a sticky bottom action bar with the count of selected candidates.
- Right-side drawer is 480px wide and keyboard dismissible (Esc).
- Empty stages collapse to a thin rail with the count.
- Accessibility: all actions keyboard reachable, colour never the only signal, WCAG AA contrast.

### 4.9 Data and API needs

- Candidate record: id, name, college, gradYear, cgpa, location, skills\[\] (with verified flag and level), assessments\[\], projects\[\], matchScore, matchBreakdown{}, tags\[\], stage, stageEnteredAt.
- Application record: id, candidateId, jobId, stage, history\[\].
- Endpoints (example): list applications with filter, sort, pagination; bulk update stage; bulk tag; get match breakdown; compare; audit log; automation rules CRUD.

### 4.10 Success metrics

- Median time to first-screen decision per candidate: under 20 seconds (baseline TBD).
- Time to clear a 100-applicant queue: under 30 minutes.
- Share of stage moves done in bulk: at least 40%.
- Shortlist-to-interview conversion improves by 15%.
- Recruiter satisfaction (CSAT) of 4.2 or higher on screening.
- Zero unlogged stage changes.

### 4.11 Risks and mitigations

- **Algorithmic bias:** blind review, weight transparency, rejection-pattern reports, human final decision.
- **Over-trust in AI score:** show breakdown and evidence, label AI output.
- **Accidental bulk actions:** confirmation dialog, undo toast, audit log.
- **Performance with large pools:** virtualisation and server-side filtering.

### 4.12 Rollout

- **Phase 1 (P0):** filters, sort, card redesign, multi-select and bulk actions, score breakdown, preview drawer, audit log.
- **Phase 2 (P1):** density toggle, compare, gates, duplicate detection, saved views, virtualisation.
- **Phase 3 (P2):** automation rules, keyboard mode, blind review, aging chips.

### 4.13 Open questions

- Are "Pipeline Unit" and "Anita Roy" test fixtures or real duplicates? Clean the seed data either way.
- Who may configure score weights: any recruiter or only admins?
- Which email and calendar providers must bulk scheduling support?

## 5. Antigravity prompt

Paste the block below into Antigravity (Agent Manager or Editor agent). Adjust the stack line if your project differs.

```text
ROLE
You are a senior full-stack engineer and product designer working inside the existing "Sarathi" recruiting platform codebase. Do not rebuild the app. Extend the existing Employer > Talent Acquisition > Applicants & Pipeline screen (Recruitment Pipeline & Kanban).

CONTEXT
The board currently has stages (including Assessment Invited, Interview Scheduled, Offer Extended, Hired) and candidate cards showing name, job title, match %, "Student Candidate", "0 Yrs Exp", "N Verified", a Passport link and a "Move To..." dropdown. Problems: cards look identical and names are truncated; match % is unexplained and can contradict the stage; there is no search, filter, sort, compare or bulk action; first column is clipped on horizontal scroll; empty columns waste space; duplicate-looking cards appear. Recruiters must evaluate many student applicants quickly and fairly.

FIRST, INSPECT (do not code yet)
1. Explore the repo. Identify the framework, component library, styling system, state management, routing and the files for the Applicants & Pipeline page, candidate card, Kanban column and any pipeline API or mock data.
2. Produce a short Implementation Plan artifact listing files to change, new components, data-model changes and risks. Wait for my approval before large edits.

GOAL
Implement "Recruiter Bulk Evaluation" in three phases, reusing the existing design system, tokens and icons. Keep the current look and feel.

PHASE 1 (must ship)
1. Toolbar above the board: search (name, skill, college, project keyword), Filters, Sort, Density toggle, Saved views.
2. Filters: skills (with verified-only switch), CGPA range, graduation year, college, location, assessment score range, tags, stage. Show active filters as removable chips and a result count. Persist in URL query params.
3. Sort: match %, assessment score, verified skill count, applied date, time in stage.
4. Card redesign: full name (no truncation, tooltip on overflow), college and grad year, top 3 verified skill chips, assessment score, match badge, stage-age chip. Replace "0 Yrs Exp" for students with projects / assessments / certifications counts.
5. Match score breakdown: clicking or hovering the match badge opens a popover with weighted components (verified skills 35, assessment 25, project relevance 20, education fit 10, learning velocity 10), matched and missing skills. Show a "Manual override" badge when a candidate's stage is ahead of what the score suggests.
6. Multi-select: checkbox on each card, select-all per column, sticky bottom bulk-action bar showing selected count. Bulk actions: Move to stage, Add tag, Add to shortlist, Send templated email, Invite to assessment. Confirmation dialog plus undo toast.
7. Quick-preview right drawer (480px): skill passport summary, top projects, assessment results, AI summary (3 lines: strengths, gaps, risk, labelled AI-generated with evidence links), and primary actions. Esc to close.
8. Audit log: record every stage change with actor (human / rule / AI), reason, timestamp. Show in the drawer as a History tab.
9. Layout fixes: stop clipping the first column, make columns equal width with sticky headers, collapse empty columns into thin rails showing counts, and add per-column virtualised scrolling with "Load more".

PHASE 2
10. Density toggle: Card vs Compact table rows.
11. Compare view for 2 to 4 selected candidates, side-by-side.
12. Must-have gates: recruiter marks job skills as required; failing candidates go to a collapsible "Below bar" group (never deleted).
13. Duplicate application detection with a merge suggestion banner.
14. Saved views per recruiter.

PHASE 3
15. Rule-based auto-advance (for example assessment score >= 70 moves to Interview Scheduled) with a review-and-confirm step and undo.
16. Keyboard review mode: J/K navigate, S shortlist, R reject, H hold, U undo.
17. Blind-review toggle hiding name, photo and college.

TECHNICAL REQUIREMENTS
- Use the existing stack and conventions. TypeScript types for Candidate, Application, MatchBreakdown, AuditEvent, FilterState.
- Server-side filtering, sorting and pagination if a backend exists; otherwise implement against the mock layer with the same interface so a backend can swap in.
- Bulk endpoints: PATCH /applications/bulk-stage, POST /applications/bulk-tag, GET /applications/:id/match-breakdown, GET /applications/:id/audit, POST /applications/compare.
- Accessibility: keyboard reachable, ARIA labels, visible focus, WCAG AA contrast, colour is never the only signal.
- Performance: board remains smooth with 500+ applicants; memoise cards, virtualise lists.
- Clean up the seed data so cards are not identical duplicates; generate realistic varied student candidates.
- Never let AI auto-reject. AI output only suggests; a human confirms.

VERIFICATION
- Add unit tests for filter and sort logic, score breakdown and bulk actions.
- Use the browser agent to open the page, run through: filter, sort, select 5 cards, bulk move, undo, open drawer, open score popover, collapse empty columns. Capture screenshots and attach them as artifacts.
- Check at 1440px, 1024px and mobile widths.

DELIVERABLES
- Implementation Plan artifact (first), then Task List artifact updated as you go.
- Code changes per phase in separate commits or clearly separated diffs.
- Short README section describing the new features, data model and score weights.

Start now with the inspection step and the Implementation Plan. Stop after the plan and wait for my approval.
```

## 6. Suggested order of work

1. Fix the data and card clarity first, since cheap changes make the board readable immediately.
2. Add filters, sort and bulk actions, which give the biggest time savings.
3. Add the score breakdown and audit log together, so trust and compliance arrive with the AI features.
4. Add compare, gates and automation once recruiters are comfortable with the basics.
