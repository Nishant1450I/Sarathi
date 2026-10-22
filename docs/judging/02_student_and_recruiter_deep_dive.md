# Deep-Dive Technical Audit: Student & Recruiter Portals (With College & Admin Overviews)

**Project:** SARATHI — Multi-Domain Skill Intelligence & Recruiter Platform  
**Target Audience:** Hackathon Technical Judges & Industry Jury  
**Audit Scope:** Deep-dive analysis of Student and Recruiter portals, end-to-end data flows, exact algorithm implementations, AI safety, demo scripts, and cross-portal interplay.

---

## PART 1: THE STUDENT PORTAL DEEP DIVE

### 1. Purpose & Target User Persona
* **Primary Persona:** Engineering students, recent STEM graduates, and self-taught developers seeking verified credentials for entry-level and junior software roles.
* **Core Value Proposition:** Discovers personalized career readiness, pinpoints verified skill gaps against real industry benchmarks, takes sandboxed coding assessments, builds proof-of-work project portfolios, and exports an ATS-proof verified Skill Passport.

---

### 2. Complete Student Feature List

```
[Status Legend: [IMPLEMENTED] | [PARTIAL] | [PLANNED/MOCK] | [NOT FOUND]]
```

#### Feature S-1: Interactive Role-Calibrated Career Dashboard
* **Description:** Unified command center rendering readiness score, active target role benchmark, onboarding step guide, KPI cards, radar chart, learning momentum, and application pipeline funnel.
* **UI File & Route:** [DashboardPage.tsx](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/student/dashboard/DashboardPage.tsx) (`/student/dashboard`)
* **API Endpoints:** `GET /api/analytics/student`, `GET /api/auth/me`
* **DB Tables Touched:** `users`, `candidate_profiles`, `canonical_skill_profiles`, `assessment_sessions`, `session_scores`, `applications`, `student_roadmaps`
* **Business Rules & Validations:**
  - New students with 0 attempts see a truthful zero-state rather than dummy 85% readiness scores.
  - Overall readiness score is suppressed (`null`) until at least 1 diagnostic or project evidence is verified.
* **Edge Cases Handled:** Stale local storage fallback handled gracefully in [useDashboardData.ts](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/student/dashboard/useDashboardData.ts#L90); non-crashing state when zero jobs exist.
* **Status Label:** `[IMPLEMENTED]`
* **Demo Readiness:** **High**. Pre-seeded student `student@sarathi.ai` has active KPIs, history charts, and role calibrations ready for live inspection.

#### Feature S-2: Sandboxed Diagnostic & Practical Assessment Engine (V2.1)
* **Description:** Integrated testing environment with timed MCQs, live code editor (Monaco), isolated multi-language code runner (JS, Python, SQL), versioned autosave, and proctoring telemetry.
* **UI File & Route:** [AssessmentPage.tsx](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/student/AssessmentPage.tsx) (`/student/assessment`)
* **API Endpoints:** `POST /api/assessments/v2/start`, `GET /api/assessments/v2/sessions/:id/state`, `PATCH /api/assessments/v2/sessions/:id/autosave`, `POST /api/assessments/v2/sessions/:id/submit`, `POST /api/assessments/v2/sessions/:id/events`
* **DB Tables Touched:** `assessment_sessions`, `assessment_questions`, `submission_snapshots`, `session_scores`, `integrity_events`, `candidate_skills`, `skill_evidence_ledger`
* **Business Rules & Validations:**
  - Strict 45-minute countdown clock enforced on server: submissions > 10s past deadline reject client answers and grade the last valid autosaved snapshot.
  - Candidate code executes in an isolated child process ([isolatedVmWorker.js](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/runner/isolatedVmWorker.js)) or in-memory SQLite sandbox; candidate code never executes inside the main Express process.
  - Copy-paste restrictions: copy/paste events trigger warning dialogs and record telemetry in `integrity_events`.
* **Edge Cases Handled:** 409 conflict detection on out-of-order autosaves; browser refresh seamlessly recovers session state without resetting timer.
* **Status Label:** `[IMPLEMENTED]`
* **Demo Readiness:** **High**. Reliable live coding execution; returns instant test-assertion feedback.

#### Feature S-3: Prerequisite-Aware Skill Gap Diagnostics
* **Description:** Identifies technical discrepancies between demonstrated proficiency and industry benchmark requirements.
* **UI File & Route:** [SkillGapPage.tsx](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/student/SkillGapPage.tsx) (`/student/skill-gap`)
* **API Endpoints:** `GET /api/skills/gaps`, `GET /api/skills/canonical`, `GET /api/skills/readiness`
* **DB Tables Touched:** `canonical_skill_profiles`, `skills`, `role_benchmarks`, `role_benchmark_skills`
* **Business Rules & Validations:**
  - Calculates gap as $\max(0, \text{Required} - \text{Demonstrated})$.
  - Identifies prerequisite blockers using topological sort (e.g. flags "Must master JavaScript Basics before React State Management").
  - Categorizes status into: `BENCHMARK_MET`, `VERIFIED_GAP`, `PRELIMINARY_GAP`, `EVIDENCE_NEEDED`, or `REASSESSMENT_RECOMMENDED`.
* **Edge Cases Handled:** Explicitly marks unassessed skills with `null` demonstrated proficiency; never invents baseline scores.
* **Status Label:** `[IMPLEMENTED]`
* **Demo Readiness:** **High**. Visualizes Radar charts and gap tables with actionable recommendations.

#### Feature S-4: Domain Career Roadmap with 5-Second Undo
* **Description:** Interactive multi-stage learning path structured into Foundations, Core Skills, and Advanced Specializations.
* **UI File & Route:** [RoadmapPage.tsx](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/student/RoadmapPage.tsx) (`/student/roadmap`)
* **API Endpoints:** `GET /api/roadmap`, `POST /api/roadmap/task`
* **DB Tables Touched:** `student_roadmaps`, `user_settings`
* **Business Rules & Validations:**
  - Marking a task completed triggers a floating undo toast with a 5-second countdown timer.
  - Domain switching instantly re-calibrates tracks without leaking progress between domains.
* **Edge Cases Handled:** Network disconnections fall back to local storage and sync on reconnection.
* **Status Label:** `[IMPLEMENTED]`
* **Demo Readiness:** **High**. Smooth UI transitions, interactive checkboxes, and working undo toasts.

#### Feature S-5: Automated GitHub Project Extraction & Proof-of-Work Portfolio
* **Description:** Portfolio manager where students register capstone projects. Includes automated GitHub repo parsing to verify dependencies, tech stack tags, commit activity, and README preview images.
* **UI File & Route:** [ProjectsPage.tsx](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/student/ProjectsPage.tsx) (`/student/projects`)
* **API Endpoints:** `POST /api/candidates/github/import`, `POST /api/candidates/evidence`
* **DB Tables Touched:** `skill_evidence`, `skill_evidence_ledger`, `canonical_skill_profiles`
* **Business Rules & Validations:**
  - Ingests public GitHub URLs, parses `package.json` or `requirements.txt` to verify claimed technologies automatically.
  - Submissions are initially placed in `evidence_submitted` state until reviewed by an assessor or verified by automated code checks.
* **Edge Cases Handled:** Rejects invalid URLs, gracefully handles rate limits on GitHub API using an in-memory 30-minute cache.
* **Status Label:** `[IMPLEMENTED]`
* **Demo Readiness:** **High**. Live repository extraction works with any public GitHub repository.

#### Feature S-6: Verifiable Digital Skill Passport & Public Share URL
* **Description:** Tamper-evident credential displaying verified skills, assessment results, and evidence provenance. Includes privacy visibility toggles and cryptographic public sharing tokens.
* **UI File & Route:** [SkillPassportPage.tsx](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/student/SkillPassportPage.tsx) (`/student/skill-passport`), [PublicPassportPage.tsx](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/public/PublicPassportPage.tsx) (`/passport/:publicId`)
* **API Endpoints:** `GET /api/passport`, `POST /api/passport/share`, `GET /api/passport/p/:shareToken`
* **DB Tables Touched:** `passport_shares`, `canonical_skill_profiles`, `skill_evidence_ledger`, `assessment_attempts`
* **Business Rules & Validations:**
  - Passport sharing can be toggled on/off instantly. Revoking the token immediately invalidates public links.
  - Dedicated print stylesheet (`@media print`) formats the passport cleanly for PDF export without website chrome.
* **Edge Cases Handled:** Direct URL access to non-existent or revoked share tokens returns a clean 404 security card.
* **Status Label:** `[IMPLEMENTED]`
* **Demo Readiness:** **High**. Live public links can be opened in an incognito window.

#### Feature S-7: Factual Resume Compiler
* **Description:** Compiles verified profile details, skills, and assessment tiers into structured, ATS-friendly resume formats.
* **UI File & Route:** [ResumePage.tsx](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/student/ResumePage.tsx) (`/student/resume`)
* **API Endpoints:** `GET /api/resumes/compile`, `GET /api/resumes`, `POST /api/resumes`
* **DB Tables Touched:** `student_resumes`, `candidate_profiles`, `candidate_skills`
* **Business Rules & Validations:**
  - Prevents hallucinated or unverified resume bullet points by drawing directly from the verified database records.
  - Supports switching templates: `modern-ats`, `technical`, `fresher`.
* **Edge Cases Handled:** Missing candidate headline or education gracefully replaced with clean fallback defaults.
* **Status Label:** `[IMPLEMENTED]`
* **Demo Readiness:** **High**. Real-time preview and instant template toggling.

---

### 3. Student Data Flows (Top 3 Features)

#### Flow 1: Taking an Assessment & Multi-Language Sandboxed Grading
```
[Browser: Monaco Editor / AssessmentPage.tsx]
       |  1. POST /api/assessments/v2/start { domainId: 'dom-web', mode: 'secure' }
       v
[Express Controller: assessmentV2Routes.js]
       |  2. SessionService.createSession()
       v
[Database: SQLite] ---> (Inserts assessment_sessions row, sets deadline_at = now + 45m)
       |
       |  3. Student types code -> PATCH /api/assessments/v2/sessions/:id/autosave
       v
[Database: SQLite] ---> (Upserts submission_snapshots with save_version check)
       |
       |  4. Student clicks submit -> POST /api/assessments/v2/sessions/:id/submit
       v
[GradingService.js]
       |  5. Checks deadline_at (+10s grace); fetches hidden & visible test cases
       |  6. Invokes RunnerDriver.run()
       v
[IsolatedVmDriver.js / isolatedVmWorker.js (Child Process)]
       |  7. Executes user code inside isolated V8 Isolate (128MB, 5000ms limit)
       |  8. Returns assertion results ({ visiblePassed, hiddenPassed })
       v
[GradingService.js]
       |  9. Computes Composite Score = Knowledge * 0.4 + Practical * 0.6
       |  10. Atomically inserts session_scores, assessment_results, and updates candidate_skills
       v
[SkillEvidenceEngine.js] ---> (Appends evidence to skill_evidence_ledger; updates canonical_skill_profiles)
       |
       v  11. Returns full diagnostic result with Tier badge and breakdown
[Browser: ResultsReport.tsx]
```

#### Flow 2: Automated GitHub Project Extraction & Evidence Ingestion
```
[Browser: ProjectExtractionModal.tsx]
       |  1. Student enters "https://github.com/alexmorgan/fullstack-ecommerce"
       |  2. POST /api/candidates/github/import { repoUrl }
       v
[GitHubService.js]
       |  3. Checks in-memory cache (30-min TTL)
       |  4. Queries GitHub REST API: /repos/:owner/:repo and /contents/package.json
       |  5. Decodes base64 package.json; maps dependencies against PACKAGE_TECH_MAP
       |  6. Scans README markdown for screenshot image URLs
       v
[Browser: ProjectExtractionModal.tsx]
       |  7. Pre-fills project form with title, stars, tech stack tags, and screenshot
       |  8. Student clicks Confirm -> POST /api/candidates/evidence
       v
[SkillEvidenceEngine.js]
       |  9. Computes SHA-256 evidenceHash for deduplication
       |  10. Inserts into skill_evidence_ledger with validity_status = 'VALID'
       |  11. Re-aggregates student canonical profile with provisional cap rules
       v
[Database: SQLite] ---> (Ledger and profile updated; visible in Recruiter Verification Queue)
```

#### Flow 3: Factual Resume Compilation
```
[Browser: ResumePage.tsx]
       |  1. GET /api/resumes/compile?targetRole=Full-Stack+Engineer
       v
[Express Controller: resumeRoutes.js]
       |  2. resumeService.compileStudentResume(userId, { targetRole })
       v
[Database: SQLite]
       |  3. Queries candidate_profiles, users, candidate_skills, skill_evidence, assessment_results
       v
[resumeService.js]
       |  4. Filters verified vs self-reported skills; groups by domain
       |  5. Synthesizes ATS-structured JSON (contact, verified competencies, capstones, test scores)
       v
[Browser: ResumePage.tsx]
       |  6. Renders live resume layout; user toggles 'modern-ats' vs 'technical' template
```

---

## PART 2: THE RECRUITER PORTAL DEEP DIVE

### 1. Purpose & Target User Persona
* **Primary Persona:** Technical recruiters, talent acquisition leads, and engineering hiring managers at tech startups and enterprises.
* **Core Value Proposition:** Slashes interviewing time by replacing unverified resumes with an explainable 70/20 candidate matching engine, candidate Skill Passports, live project code verification queues, and structured applicant tracking pipelines.

---

### 2. Complete Recruiter Feature List

#### Feature R-1: Recruiter Hiring Workspace Dashboard
* **Description:** Unified hiring command center displaying requisition KPIs (active jobs, candidate volume, shortlisted count, pending verification count), active job cards, and quick candidate passport inspection.
* **UI File & Route:** [RecruiterDashboard.tsx](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/recruiter/RecruiterDashboard.tsx) (`/recruiter/dashboard`)
* **API Endpoints:** `GET /api/analytics/dashboard`, `GET /api/jobs`
* **DB Tables Touched:** `organisations`, `jobs`, `applications`, `shortlist_members`, `skill_evidence`
* **Business Rules & Validations:** Multi-tenant scoping: all queries filtered strictly by `org_id` extracted from authenticated recruiter session or `x-org-id` header.
* **Status Label:** `[IMPLEMENTED]`
* **Demo Readiness:** **High**. Seeded with 4 active jobs, 12 applications, and pre-computed pipeline metrics.

#### Feature R-2: Job Requisition Manager with Weighted Competencies
* **Description:** Complete job requisition lifecycle management (Draft, Published, Paused, Closed) with fine-grained technical requirement configuration.
* **UI File & Route:** [RecruiterJobsPage.tsx](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/recruiter/RecruiterJobsPage.tsx) (`/recruiter/jobs`)
* **API Endpoints:** `GET /api/jobs`, `POST /api/jobs`, `PATCH /api/jobs/:id/status`
* **DB Tables Touched:** `jobs`, `job_skill_requirements`, `skills`, `domains`
* **Business Rules & Validations:**
  - Allows marking skills as `required` (mandatory) or `preferred`.
  - Assigns target proficiency levels (1–5) and relative importance weights (e.g., 1.0 to 3.0).
* **Status Label:** `[IMPLEMENTED]`
* **Demo Readiness:** **High**.

#### Feature R-3: Candidate Discovery & Explainable Match Sourcing
* **Description:** Searchable talent pool with real-time match scoring against any selected active job requisition.
* **UI File & Route:** [RecruiterCandidatesPage.tsx](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/recruiter/RecruiterCandidatesPage.tsx) (`/recruiter/candidates`)
* **API Endpoints:** `GET /api/candidates/search`, `GET /api/candidates/:id/passport`
* **DB Tables Touched:** `candidate_profiles`, `users`, `candidate_skills`, `job_skill_requirements`
* **Business Rules & Validations:**
  - Renders match percentage accompanied by explicit breakdown pill: Required Coverage %, Preferred Coverage %, and Assessment Bonus.
  - Displays evidence uncertainty level (`LOW`, `MEDIUM`, `HIGH`) and statutory non-automated hiring disclaimer.
* **Status Label:** `[IMPLEMENTED]`
* **Demo Readiness:** **High**.

#### Feature R-4: Kanban Applicant Tracking Pipeline (ATS)
* **Description:** Visual hiring pipeline tracking candidates across stages: `Applied` $\to$ `Screening` $\to$ `Assessment` $\to$ `Interview` $\to$ `Offered` $\to$ `Hired` $\to$ `Rejected`.
* **UI File & Route:** [RecruiterPipelinePage.tsx](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/recruiter/RecruiterPipelinePage.tsx) (`/recruiter/pipeline`)
* **API Endpoints:** `GET /api/pipeline/applications`, `PATCH /api/pipeline/applications/:id/stage`, `POST /api/pipeline/notes`
* **DB Tables Touched:** `applications`, `application_stage_history`, `recruiter_notes`
* **Business Rules & Validations:** Every stage transition creates an audit log entry in `application_stage_history` preserving timestamp, actor, and optional transition reason.
* **Status Label:** `[IMPLEMENTED]`
* **Demo Readiness:** **High**.

#### Feature R-5: Proof-of-Work Verification Review Queue
* **Description:** Evidence review interface where recruiters and technical assessors review student GitHub submissions, inspect code diffs/rubrics, and officially award verified proficiency.
* **UI File & Route:** [RecruiterVerificationsPage.tsx](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/recruiter/RecruiterVerificationsPage.tsx) (`/recruiter/verifications`)
* **API Endpoints:** `GET /api/verifications/pending`, `POST /api/verifications/review`
* **DB Tables Touched:** `skill_evidence`, `verification_reviews`, `candidate_skills`, `canonical_skill_profiles`
* **Business Rules & Validations:**
  - Submitting a review requires a minimum 5-character written decision rationale.
  - Approving evidence promotes skill status to `verified` and unlocks higher confidence tiers on the candidate's public passport.
* **Status Label:** `[IMPLEMENTED]`
* **Demo Readiness:** **High**.

#### Feature R-6: Interview Scheduling & Structured Evaluation Desk
* **Description:** Coordination portal for technical and behavioral interviews with structured scorecards.
* **UI File & Route:** [RecruiterInterviewsPage.tsx](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/recruiter/RecruiterInterviewsPage.tsx) (`/recruiter/interviews`)
* **API Endpoints:** `GET /api/interviews`, `POST /api/interviews`, `POST /api/interviews/:id/feedback`
* **DB Tables Touched:** `interviews`, `interview_feedback`, `interview_participants`
* **Business Rules & Validations:** Captures numerical ratings for technical competence and communication, plus an overall hiring recommendation (`Strong Yes`, `Yes`, `Neutral`, `No`).
* **Status Label:** `[IMPLEMENTED]`
* **Demo Readiness:** **High**.

---

### 3. Recruiter Data Flows (Top 3 Features)

#### Flow 1: Candidate Search & Explainable Match Score Calculation
```
[Browser: RecruiterCandidatesPage.tsx]
       |  1. Recruiter selects Job: "Full-Stack Engineer (Mid)"
       |  2. GET /api/candidates/search?jobId=job-demo-1&query=React
       v
[Express Controller: candidateRoutes.js]
       |  3. candidateService.searchCandidates({ orgId, jobId, query })
       v
[matchingService.js]
       |  4. Fetches job skill requirements (e.g. React weight 2.0, Node.js weight 1.5)
       |  5. Fetches candidate verified skills, evidence ledger, and passed assessments
       |  6. Computes earned weights with multipliers:
       |     - Verified: 1.0x
       |     - Pending:  0.6x
       |     - Self-rep: 0.3x
       |  7. MatchScore = min(100, round(ReqCov * 0.7 + PrefCov * 0.2 + min(PassedTests * 5, 10)))
       v
[Browser: RecruiterCandidatesPage.tsx]
       |  8. Displays candidate card with 88% Match pill, breakdown tooltip, and low uncertainty badge
```

#### Flow 2: Moving a Candidate Across the ATS Pipeline
```
[Browser: RecruiterPipelinePage.tsx]
       |  1. Recruiter drags "Alex Morgan" from 'Screening' to 'Interview' column
       |  2. PATCH /api/pipeline/applications/app-demo-1/stage { stage: 'interview', reason: 'Passed code screen' }
       v
[Express Controller: pipelineRoutes.js]
       |  3. pipelineService.updateApplicationStage()
       v
[Database: SQLite]
       |  4. UPDATE applications SET current_stage = 'interview', updated_at = now
       |  5. INSERT INTO application_stage_history (application_id, from_stage, to_stage, changed_by, reason)
       v
[Browser: RecruiterPipelinePage.tsx]
       |  6. Optimistic UI updates column count; success toast displayed
```

#### Flow 3: Reviewing & Approving Student Project Evidence
```
[Browser: RecruiterVerificationsPage.tsx]
       |  1. Recruiter reviews Alex Morgan's GitHub Capstone submission
       |  2. POST /api/verifications/review
       |     { evidenceId: 'ev-demo-1', decision: 'verified', awardedProficiency: 4, decisionRationale: 'Clean clean architecture and full test coverage' }
       v
[Express Controller: verificationRoutes.js]
       |  3. verificationService.submitReview()
       v
[Database: SQLite]
       |  4. INSERT INTO verification_reviews (evidence_id, reviewer_id, decision, decision_rationale)
       |  5. UPDATE skill_evidence SET verification_status = 'verified' WHERE id = ?
       |  6. UPDATE candidate_skills SET proficiency = 4, verification_status = 'verified' WHERE candidate_id = ?
       v
[SkillEvidenceEngine.js] ---> (Re-aggregates canonical profile; marks confidence = HIGH)
       |
       v  7. Recruiter receives confirmation; candidate's passport immediately reflects verified badge
[Browser: RecruiterVerificationsPage.tsx]
```

---

## PART 3: CORE ALGORITHMS & MATHEMATICAL FORMULAS

### 1. Job Match Score Formula
*Source: [matchingService.js](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/matchingService.js#L104-L175)*

$$\text{EarnedWeight} = \text{Weight} \times \min\left(\frac{\text{CandidateProficiency}}{\text{TargetProficiency}}, 1.0\right) \times \text{Multiplier}$$

Where:
$$\text{Multiplier} = \begin{cases} 1.0 & \text{if verification\_status} = \text{'verified'} \\ 0.6 & \text{if verification\_status} \in \{\text{'evidence\_submitted'}, \text{'verification\_pending'}\} \\ 0.3 & \text{if verification\_status} = \text{'self\_reported'} \end{cases}$$

$$\text{RequiredCoverage} = \frac{\sum \text{EarnedWeight}_{\text{req}}}{\sum \text{Weight}_{\text{req}}} \times 100$$
$$\text{PreferredCoverage} = \frac{\sum \text{EarnedWeight}_{\text{pref}}}{\sum \text{Weight}_{\text{pref}}} \times 100$$
$$\text{AssessmentBonus} = \min(\text{PassedAssessments} \times 5, 10)$$

$$\mathbf{MatchScore} = \min\left(100, \text{round}\left(\text{RequiredCoverage} \times 0.70 + \text{PreferredCoverage} \times 0.20 + \text{AssessmentBonus}\right)\right)$$

---

### 2. Career Readiness Formula
*Source: [skillEvidenceEngine.js](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/skillEvidenceEngine.js#L518-L535)*

$$\mathbf{CareerReadiness} = 100 \times \frac{\sum_{i \in \text{BenchmarkSkills}} \left(W_i \times \min(R_i, D_i)\right)}{\sum_{i \in \text{BenchmarkSkills}} \left(W_i \times R_i\right)}$$

Where:
* $W_i$: Importance weight of skill $i$ defined in role benchmark.
* $R_i$: Target required proficiency level (1–5).
* $D_i$: Demonstrated proficiency level (unassessed competencies contribute strictly $0$ to the numerator, but contribute their full points to the denominator).
* Evidence Uncertainty: $\text{LOW}$ if Evidence Coverage $\ge 80\%$, $\text{MEDIUM}$ if $\ge 40\%$, $\text{HIGH}$ if $< 40\%$.

---

### 3. Assessment Composite Grading & Tier Assignment
*Source: [gradingService.js](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/assessmentV2/gradingService.js#L288-L325)*

$$\text{KnowledgeScore} = \frac{\sum \text{EarnedMCQPoints}}{\sum \text{TotalMCQPoints}} \times 100$$
$$\text{PracticalScore} = \frac{\sum_{\text{Tasks}} \text{TaskScore}}{N_{\text{tasks}}}$$
$$\mathbf{TechnicalScore} = \text{round}(\text{KnowledgeScore} \times 0.40 + \text{PracticalScore} \times 0.60)$$

**Evidence Capping Rule:**
* $\text{DemonstratedItems} = 1 \implies \text{Capped Level} = \min(2, \text{RawLevel})$, Confidence = `LOW`
* $\text{DemonstratedItems} = 2 \implies \text{Capped Level} = \min(3, \text{RawLevel})$, Confidence = `MEDIUM`
* $\text{DemonstratedItems} \ge 3 \implies \text{Capped Level} = \text{RawLevel}$ (Up to 5), Confidence = `HIGH`

---

### 4. 8-Feature Logistic Integrity Risk Model
*Source: [integrityRiskService.js](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/admin/integrityRiskService.js#L203-L218)*

$$x = \sum_{i=1}^{8} (w_i \cdot f_i) - \text{bias}$$
$$\mathbf{RiskScore} = \text{round}\left(\frac{100}{1 + e^{-x}}\right)$$

Where features ($f_i \in [0, 1]$) are:
1. `paste`: $\min(\text{pasteCount} / 5, 1)$ ($w=1.2$)
2. `pasteRatio`: $\min(\text{pastedChars} / \text{totalChars}, 1)$ ($w=1.8$)
3. `blur`: $\min(\text{tabSwitches} / 10, 1)$ ($w=1.0$)
4. `blurTime`: $\min(\text{awaySeconds} / 120, 1)$ ($w=1.5$)
5. `fast`: Peer solve-time z-score $\text{clamp}(-Z / 3, 0, 1)$ ($w=1.2$)
6. `camera`: Camera absence ratio ($w=1.6$)
7. `similarity`: 5-token shingle Jaccard similarity vs peer submissions ($w=2.2$)
8. `firstTry`: Instant pass on initial execution with high speed ($w=1.0$)
* $\text{bias} = 2.5$; Bands: `LOW` ($< 30$), `MEDIUM` ($30–69$), `HIGH` ($\ge 70$).

---

## PART 4: AI ARCHITECTURE, PROMPTS & SAFEGUARDS

### 1. Model Configuration & Fallback Hierarchy
* **Primary Cloud Provider:** Google Gemini API (`gemini-1.5-flash`) via official REST endpoints.
* **Secondary Cloud Provider:** OpenAI API (`gpt-4o-mini`).
* **Zero-Dependency Local Engine:** `sarathi-local-knowledge` rule-based expert system ([aiChatService.js](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/aiChatService.js#L454-L510)).
* **Fallback Behavior:** If neither API key is supplied in `.env` or network connectivity fails, the chat engine seamlessly shifts to `sarathi-local-knowledge` without throwing 500 errors, prepending a clear transparency badge: `> **[Sarathi Copilot • Local Knowledge Mode]**`.

### 2. Prompting Strategy & Student Context Injection
* **Context Payload:** The server automatically fetches candidate data from SQLite ([aiChatService.js](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/aiChatService.js#L92-L130)) including target role, verified skills list, identified skill gaps, and current roadmap stage.
* **Prompt Instructions:**
  - Instructs LLM to act as a supportive technical career mentor.
  - References the student's real recorded gaps and roadmap milestones.
  - Strict tone: forbids making hiring promises or inventing non-existent assessment scores.

### 3. Safety, Security & Redaction Safeguards
* **Prompt-Injection Defense:** Sanitizes all input characters; discards system-prompt override attempts (`"ignore all previous instructions"`).
* **PII & Secrets Scrubbing:** Regex pass scrubs email addresses, passwords, authorization tokens, and API keys prior to sending prompts to external APIs.
* **In-Memory Rate Limiting:** Enforces maximum 25 requests per minute per IP address ([aiChatService.js](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/aiChatService.js#L19-L42)).
* **Human-in-the-Loop Transparency:** All AI recommendations contain explicit user notices that suggestions are advisory and non-binding.

---

## PART 5: NOTIFICATIONS, EXPORT, CACHING & BACKGROUND JOBS

* **Notifications:** Stored in the `notifications` SQLite table; retrieved via `GET /api/notifications` and marked read individually or in bulk (`PATCH /api/notifications/read-all`).
* **Export Features:**
  - Skill Passport: Dedicated `@media print` CSS enables browser Print-to-PDF with clean formatting.
  - ATS Resume: Exportable JSON schema and direct clipboard copy.
  - Admin Audit Log: Direct CSV streaming export via `GET /api/admin/audit/export`.
* **Caching Mechanisms:**
  - GitHub Repository Metadata: In-memory Map cache with 30-minute TTL ([githubService.js](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/githubService.js#L1-L3)).
  - System Integrity Check: PRAGMA integrity check cached for 10 minutes ([adminSystemService.js](file:///C:/Users/Nishant/Documents/SARATHI/server/src/services/admin/adminSystemService.js#L16)).
* **Background Jobs:**
  - Rate limit map pruning runs every 5 minutes (`setInterval().unref()`).
  - Auth nonce cleanup prunes expired CSRF records on every new nonce generation.

---

## PART 6: CODE HYGIENE & SEEDED DEMO DATA

### 1. Code Hygiene & Search Findings
* A full grep search of `server/src` and `src` reveals **zero** occurrences of `TODO`, `FIXME`, or `HACK` in active backend routes and services.
* Legacy mock data (`mockAssessments.ts`, `mockRoadmaps.ts`) is strictly isolated as a fallback inside UI test fixtures and disconnected dev fallbacks.

### 2. Authoritative Seed Accounts (For Demo)
*(All demo accounts use password: `password123` as documented in [seeder.mjs](file:///C:/Users/Nishant/Documents/SARATHI/server/src/seeder/seeder.mjs#L14). Never use production credentials.)*

| Role / Portal | Demo Email Address | Password Note | Sample Data Ingested |
| :--- | :--- | :--- | :--- |
| **Student** | `student@sarathi.ai` | `password123` | Target: Full-Stack Developer; 4 verified skills, active roadmap, 2 projects. |
| **Recruiter** | `recruiter@sarathi.ai` | `password123` | Org: Sarathi Enterprise Systems; 4 active job requisitions, 12 pipeline applicants. |
| **College (TPO)** | `admin@apex.edu` | `password123` | Institution: Apex Institute of Technology; 420 students across CSE, IT, AI/DS, ECE. |
| **Platform Admin**| `admin@sarathi.dev` | `password123` | Full administrative root access; system health probes, integrity review queue. |

---

## PART 7: 5-MINUTE LIVE DEMO SCRIPTS

### Script 1: Student Portal (5 Minutes)
1. **0:00 - 1:00 (Login & Command Center):** Navigate to `/login`, select **Student** tab, log in with `student@sarathi.ai`. Highlight the Hero section with verified readiness score (78%), active target role (Full-Stack Developer), and calibrated radar chart.
2. **1:00 - 2:30 (Live Sandboxed Coding Assessment):** Navigate to `/student/assessment`. Choose the practice or secure diagnostic. Show the Monaco editor. Write a valid solution for the JavaScript array task. Click "Run Tests" — show live assertion execution in the sandbox. Submit and show the immediate Tier badge and skill breakdown.
3. **2:30 - 3:30 (Skill Gap & Prerequisite Roadmap):** Navigate to `/student/skill-gap`. Show the gap table and highlight prerequisite warnings. Jump to `/student/roadmap`. Check off a milestone task, show the 5-second floating Undo toast, and click Undo to demonstrate server-side synchronization.
4. **3:30 - 4:15 (GitHub Auto-Extraction):** Navigate to `/student/projects`. Click "Submit Project". Enter `https://github.com/facebook/react` or a personal repo. Click "Analyze Repository". Show the automated extraction of tech stack tags and stars.
5. **4:15 - 5:00 (Verified Skill Passport):** Navigate to `/student/skill-passport`. Show verified badges, evidence provenance links, and click "Share Passport" to generate a live public URL. Open in Incognito to prove public accessibility.

*What could break during demo:* If testing with no internet, external GitHub import will fail; use pre-seeded projects. Ensure backend server is running on port 4000.

---

### Script 2: Recruiter Portal (5 Minutes)
1. **0:00 - 1:00 (Workspace & Active Requisitions):** Log in as `recruiter@sarathi.ai`. Highlight dashboard KPIs: 4 active jobs, 12 applicants in pipeline, and organization verification badge.
2. **1:00 - 2:15 (Explainable Sourcing & Match Breakdown):** Navigate to `/recruiter/candidates`. Select the "Full-Stack Developer" job requisition. Point out Alex Morgan's 88% Match score. Hover over the match score pill to show the tooltip: 70% required coverage, 20% preferred coverage, and assessment bonus. Click "Inspect Passport" to open the candidate's verified credential drawer.
3. **2:15 - 3:15 (Visual ATS Pipeline):** Navigate to `/recruiter/pipeline`. Filter by "Full-Stack Developer". Drag candidate Alex Morgan from `Screening` to `Interview`. Add an internal recruiter note ("Strong practical coding execution"). Show the stage history ledger.
4. **3:15 - 4:15 (Evidence Verification Queue):** Navigate to `/recruiter/verifications`. Open a pending project evidence submission from a candidate. Review the submitted GitHub link and code description. Click "Verify Evidence", award Proficiency Level 4, write a rationale, and submit.
5. **4:15 - 5:00 (Interview Scheduling & Analytics):** Navigate to `/recruiter/interviews`. Show the scheduled interview calendar. Navigate to `/recruiter/analytics` to view the stage-by-stage hiring funnel drop-off rates.

*What could break during demo:* Ensure you switch between student and recruiter in separate incognito windows or log out cleanly so session JWTs do not overlap.

---

## PART 8: STUDENT-RECRUITER INTERPLAY

The platform forms a closed-loop verified talent feedback loop:
1. **Creation:** A student takes an assessment or links a GitHub repo on the Student portal.
2. **Ingestion & Capping:** The `SkillEvidenceEngine` registers the evidence in the `skill_evidence_ledger` and recalculates the candidate's canonical skill profile.
3. **Surfacing:** The candidate's updated profile immediately affects recruiter search queries (`/api/candidates/search`), updating match scores dynamically.
4. **Verification:** The recruiter reviews the project in `/recruiter/verifications`, approving it with an audit rationale.
5. **Elevation:** Upon recruiter verification, the student's Skill Passport updates from `evidence_submitted` to `verified`, raising the student's overall career readiness score and removing evidence uncertainty for future employer views.

---

## PART 9: COLLEGE & ADMIN PORTAL SUMMARIES

### 1. College Portal Summary
* **Target Persona:** College Deans, Department Heads, and Training & Placement Officers (TPOs).
* **Key Features:**
  - **Batch Placement Readiness Radar:** Real-time departmental readiness breakdown across CSE, IT, AI/DS, and ECE ([CollegeDashboard.tsx](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/college/CollegeDashboard.tsx)).
  - **At-Risk Student Discovery:** Flags students with low assessment scores or stalled roadmaps before placement season starts ([CollegeAtRiskPage.tsx](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/college/CollegeAtRiskPage.tsx)).
  - **Campus Placement Drives Desk:** Coordinates company recruitment visits and tracks branch eligibility ([CollegeDrivesPage.tsx](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/college/CollegeDrivesPage.tsx)).
* **Privacy Boundary (D-09):** Implements strict minimum-cohort suppression ($N < 3$ candidates redacts aggregate charts) to protect student privacy and comply with educational data guidelines.
* **Status:** `[IMPLEMENTED]`

### 2. Platform Admin / Reviewer Portal Summary
* **Target Persona:** Platform compliance officers, proctoring reviewers, and infrastructure operations admins.
* **Key Features:**
  - **Tamper-Evident SHA-256 Audit Ledger:** Cryptographic hash-chained immutable audit log ([AdminAuditPage.tsx](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/admin/system/AdminAuditPage.tsx)).
  - **Integrity Risk & Code Diff Inspector:** 8-feature logistic cheat detection with side-by-side token shingle similarity viewer ([AdminIntegrityPage.tsx](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/admin/integrity/AdminIntegrityPage.tsx)).
  - **Recruiter Business Entity Approvals:** Advisory hint engine checking GSTIN, PAN structure, and freemail domains ([AdminApprovalsPage.tsx](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/admin/approvals/AdminApprovalsPage.tsx)).
  - **System Operations & WAL Backups:** Live process uptime, memory probes, runner health, and `PRAGMA wal_checkpoint` snapshots ([AdminSystemPage.tsx](file:///C:/Users/Nishant/Documents/SARATHI/src/pages/admin/system/AdminSystemPage.tsx)).
* **Status:** `[IMPLEMENTED]`
