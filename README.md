# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Smart Assessment Engine V2

SARATHI includes a server-trusted, evidence-based skill assessment system with sandboxed code runners and integrity monitoring.

### Configuration & Feature Flags

Assessment V2 operates strictly behind feature flags:

| Flag | Location | Default | Description |
|---|---|---|---|
| `ASSESSMENT_V2_ENABLED` | `server/.env` | `false` | Enables V2 server routes (`/api/assessments/v2/*`) and blocks legacy heuristic submissions (410 Gone) |
| `VITE_ASSESSMENT_V2` | `.env` | `false` | Mounts V2 assessment shell on `/student/assessment` |
| `ASSESSMENT_RUNNER_DRIVER` | `server/.env` | `local_dev` | Code runner driver (`local_dev`, `sql`, `judge0`) |
| `ASSESSMENT_CAMERA_ENABLED`| `server/.env` / `.env` | `false` | Camera monitoring preview (local browser only, no video stored/uploaded) |

### Testing & Validation

```bash
# Run all server tests (123 tests across 20 suites)
npm --prefix server test

# Run all client tests (103 tests across 19 suites)
npm run test:client

# Typecheck and linting
npx tsc -b
npx oxlint
npx vite build
```

## Recruiter Bulk Evaluation & Pipeline Intelligence

The Recruitment Pipeline (`/recruiter/pipeline`) empowers talent acquisition teams to evaluate student applicants at scale without sacrificing individual candidate depth or fairness.

### Key Capabilities

1. **Multi-Criteria Toolbar & Active Filter Chips**:
   - Live search across applicant full names, skill keywords, college names, and project repositories.
   - Comprehensive filtering: Skills (with verified-only switch), CGPA min/max range, graduation year, college, location, assessment score range, tags, and stage.
   - Active removable chips with live result counts, persisted bidirectionally in URL query parameters.
   - Presets / Saved Views per recruiter stored in the database.

2. **5-Factor Objective Match Score**:
   Every candidate's score is computed against job requirements with transparent, explainable weights:
   - **Verified Skills (35%)**: Validated competencies through automated assessments and evidence.
   - **Assessment Performance (25%)**: Proctored practical coding benchmarks and technical evaluations.
   - **Project Relevance (20%)**: Semantic code quality and architecture analysis of student GitHub projects.
   - **Education Fit (10%)**: Degree, college tier, and CGPA metrics.
   - **Learning Velocity (10%)**: Course completion velocity and verified skill momentum.
   - **Manual Override Indicator**: Emits a visible amber alert if a candidate's pipeline stage is ahead of algorithmic recommendation, preventing silent bias while honoring recruiter discretion.

3. **Multi-Select Bulk Operations with Instant Undo**:
   - Select individual cards or select all candidates in a pipeline column.
   - Sticky bottom bulk action bar with candidate count, Compare trigger (2–4 candidates), Move to Stage with required compliance reason, Add Tag, Shortlist, and Templated Communications.
   - Reversible transitions: confirmation dialog and 10-second undo toast with zero data loss.

4. **480px Quick-Preview Drawer**:
   - Accessible via card click or keyboard navigation (`J`/`K`).
   - 3-line AI summary (Key Strengths, Skill Gaps, Hiring Risk) explicitly labeled with evidence links.
   - Embedded Skill Passport summary with verified skill chips.
   - Project repository metrics and assessment breakdowns.
   - Complete Stage Audit Timeline tracking actor (`human`, `rule`, `ai`), transition notes, and timestamps.

5. **Phase 2 & Phase 3 Advanced Intelligence**:
   - **Density Toggle**: Switch seamlessly between Card Kanban and Compact Table Row view.
   - **Side-by-Side Comparison**: Multi-candidate competency matrix (2–4 applicants) highlighting verified skills, scores, and repositories.
   - **Must-Have Skill Gates**: Recruiter specifies mandatory job competencies; candidates lacking them are placed in a collapsible "Below Bar" group (never auto-deleted).
   - **Duplicate Application Detection**: Automatic detection of duplicate applications across jobs with single-click merge recommendations.
   - **Rule-Based Auto-Advance**: Configurable score thresholds (e.g. Assessment ≥ 70%) with mandatory human review-and-confirm step.
   - **Keyboard Review Mode**: Recruiter hotkeys (`J` next, `K` previous, `S` shortlist, `R` reject, `H` hold, `U` undo, `?` shortcuts cheat sheet).
   - **Blind Review Mode**: One-click toggle that obfuscates candidate name, avatar, and college to eliminate unconscious bias.

### REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/pipeline/applications` | Multi-criteria filtered, sorted & paginated applicant pool |
| `PATCH` | `/api/pipeline/applications/bulk-stage` | Bulk stage update with audit tracking & undo metadata |
| `POST` | `/api/pipeline/applications/bulk-tag` | Bulk tag application & removal |
| `GET` | `/api/pipeline/applications/:id/match-breakdown` | 5-factor weighted score calculation & manual override detection |
| `GET` | `/api/pipeline/applications/:id/audit` | Comprehensive stage transition timeline |
| `POST` | `/api/pipeline/applications/compare` | Side-by-side competency matrix for 2–4 candidates |
| `GET/POST/DELETE` | `/api/pipeline/saved-views` | Recruiter view preferences & filter configurations |


