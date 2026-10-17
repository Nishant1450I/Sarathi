# SARATHI — Merge Dashboard + Student Analytics & Skill Diagnostics (PRD + Prompt)

**Scope:** Student Portal only. Replaces the separate Dashboard and "Student Analytics & Skill Diagnostics" pages with **one unified Dashboard**.

---

## 1. Problem
- Dashboard (`/student/dashboard`, 1,200+ lines) and Analytics/Diagnostics duplicate the same data (readiness, gaps, assessments).
- Too many charts with little meaning (pies, histograms, decorative donuts). The student cannot tell "what should I do next?".

## 2. Goal
One page that answers five questions in order:
1. **Where am I?** (readiness, verified skills)
2. **What is my gap?** (vs target role)
3. **Am I improving?** (trend over time)
4. **What should I do next?** (action + resources)
5. **Is it paying off?** (applications, matches)

## 3. Routes
- Keep `/student/dashboard` as the only page. Remove the Analytics nav item from `StudentSidebar`.
- `/student/analytics` and any old diagnostics route → `<Navigate to="/student/dashboard" replace />` (no broken links/bookmarks).
- Data comes from one hook/endpoint: `GET /api/analytics/student` (extend if it exists; otherwise build it) consumed via a single `useDashboardData()` hook. Remove duplicate fetches.

## 4. Layout (top → bottom, mobile = single column)

| # | Section | Content |
|---|---|---|
| 1 | **Hero** | Name, target role/domain, domain switcher, one-line status |
| 2 | **KPI row (4)** | Readiness score (+ change since last assessment), Verified skills, High-priority gaps, Roadmap progress |
| 3 | **Next Best Action** | Single deterministic card (existing logic) + 2 recommended free resources for the top gap |
| 4 | **Skill Diagnostics** | Radar (by category) + Top-gaps bar chart + gap table with priority chips |
| 5 | **Progress Over Time** | Readiness trend line + Assessment history |
| 6 | **Learning Momentum** | Activity heatmap (12 wks) + Roadmap progress by stage |
| 7 | **Opportunities** | Application funnel + top 3 job matches |
| 8 | Onboarding checklist | Only shown until complete or dismissed; goes under the hero |

Skill Diagnostics sections must support: skill category filter, priority filter (High/Med/Low), and "Retake assessment" CTA per weak category.

## 5. Chart Decisions

### KEEP (each answers a real question)
| Chart | Type | Question it answers |
|---|---|---|
| Skill radar | Radar (current vs required, by category, max 8 axes) | Which areas of my profile are weak? |
| Top gaps | Horizontal bar, current vs required, **top 8 gaps only**, sorted by gap size | Which skills should I fix first? |
| Readiness trend | Line (score per assessment/week) with target line | Am I improving? |
| Assessment history | Bar (score % per attempt), colored by category | Which attempts/categories went well? |
| Learning activity | Heatmap (tasks + resources per day) with streak count | Am I consistent? |
| Roadmap by stage | Segmented progress bars (not a chart lib) | How far in each stage? |
| Application funnel | Horizontal funnel bars: Applied → Review → Shortlist → Interview → Offer | Are applications converting? |

### REMOVE (no decision value)
Gap-priority donut (replace with 3 count chips), resource-mix pie, job-match histogram, GitHub-language donut on dashboard (move to Profile page only), cohort percentile, any duplicate benchmark chart, any chart with < 3 data points (show an empty-state message instead), decorative gradients/3D/animations on charts.

Max **7 visuals** on the page. Do not add new chart types without a stated question it answers.

## 6. Chart Rules
- Always show: title, one-line "so what" caption (computed, e.g. "3 of your 5 high-priority gaps are in Backend"), units, legend only when 2+ series.
- States: loading skeleton, empty (with CTA, e.g. "Take your first assessment"), error (with retry).
- Colors: use existing tokens (#087BFA current, #603DF5 required, #0B1B43 text); red/amber/green only for priority. Not color-only: add labels/patterns.
- Tooltips, `aria-label` on each chart, text-table fallback (`<details>View data</details>`).
- Mobile (<400px): radar → hidden, replaced with category list bars; bar charts become horizontal with truncated labels; heatmap scrolls horizontally.
- Lazy-load chart components (`React.lazy`) to cut bundle size; no layout shift.

## 7. Code Restructure
Split `StudentDashboard.tsx` into `src/pages/student/dashboard/`:
`DashboardPage.tsx` (composition only), `HeroSection`, `KpiRow`, `NextActionCard`, `SkillDiagnostics` (Radar, TopGapsChart, GapTable), `ProgressOverTime`, `LearningMomentum`, `OpportunitiesPanel`, `useDashboardData.ts`, `chartMappers.ts` (pure functions, unit-tested).
Each file < 250 lines. Delete old Analytics page, its components, unused chart components and dead imports.

## 8. Acceptance Criteria
- Only one dashboard route; old routes redirect; sidebar has no duplicate entry.
- No duplicated API calls (verify in network tab: one analytics call per load).
- ≤ 7 visuals; every visual has a caption, empty/loading/error state, and a data-table fallback.
- Numbers agree everywhere (KPI readiness = last point of trend = value in Skill Passport).
- Works with 0 data, 1 assessment, and full data (seed script for each case).
- Lighthouse a11y ≥ 90; no text contrast below 4.5:1; keyboard accessible filters.
- `tsc -b`, `oxlint`, `vite build`, client tests and server tests all pass with zero errors/warnings introduced.
- Tests: `chartMappers` (radar, top gaps, trend, funnel, heatmap, streak), `useDashboardData` states, redirect from old route.

---

# PROMPT (paste into your AI coding agent)

```
You are a senior React/TypeScript engineer and data-visualization designer working in
c:/Users/Nishant/Documents/SARATHI (Student Portal only). Follow SARATHI_DASHBOARD_MERGE_PRD.md exactly.

TASK: Merge the Student Dashboard and the "Student Analytics & Skill Diagnostics" page into ONE dashboard at
/student/dashboard, remove low-value charts, and keep only the meaningful ones defined in PRD §5.

STEPS
1. Discovery: locate every file/route/nav item for the Dashboard and the Analytics/Diagnostics page (grep for
   "analytics", "diagnostic", chart imports). List them with line counts and the charts each uses. Print a table of
   every existing chart -> KEEP / MERGE / REMOVE with a one-line reason based on PRD §5. Wait for no approval;
   proceed unless a chart is not covered by the PRD (then ask me).
2. Data: create one `useDashboardData()` hook and, if missing, extend `GET /api/analytics/student` to return:
   kpis, categoryScores (current vs required), topGaps, readinessTrend, assessmentHistory, activityByDay + streak,
   roadmapByStage, applicationFunnel, topJobMatches. Server derives user from JWT; parameterized SQL; add tests.
3. UI: build the page in the layout order of PRD §4 using the split structure in PRD §7. Reuse existing design tokens
   and components (Card, Badge, ProgressBar, EmptyState, Recharts). Implement chart rules from PRD §6 (caption,
   empty/loading/error, aria-label, data-table fallback, mobile layout, lazy loading).
4. Routing: remove the Analytics sidebar entry; redirect old routes to /student/dashboard.
5. Cleanup: delete the old Analytics page and unused chart components/imports; keep the page <= 7 visuals.
6. Tests: unit tests for chartMappers and the hook; a test for the redirect; seed fixtures for 0 / 1 / full data.
7. Verify: run `tsc -b`, `oxlint`, `vite build`, client tests and `npm --prefix server test`. Fix root causes; never
   skip or weaken tests. Manually check the 3 data scenarios and mobile width 375px.

RULES
- No mock/hardcoded numbers in production paths. Numbers must be consistent across KPI, trend, and passport.
- Do not add any chart that does not answer a question listed in PRD §5.
- Do not touch recruiter/college portals. Keep changes minimal outside the dashboard.
- If something cannot be verified, say "not verified" instead of claiming success.

DELIVERABLES: working merged dashboard, removed old page, tests green, and a short report with: before/after
chart table, files added/deleted, command outputs, PRD §8 checklist with PASS/FAIL, remaining risks.

Start with step 1 and print the chart decision table first.
```
