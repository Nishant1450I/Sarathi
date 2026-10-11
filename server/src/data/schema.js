// Canonical DDL for the SARATHI Recruiter & Employer application database.
//
// Design discipline:
//  - Every operational entity is scoped to an organisation (org_id) except platform-level
//    taxonomies (domains, skills) and global user identities.
//  - Foreign keys are enforced. Deletions on dependent relationships preserve audit integrity.
//  - Timestamps are ISO-8601 UTC.
//  - Multi-tenant RBAC and candidate privacy boundaries are enforced at the schema and service level.

export const SCHEMA_VERSION = 1;

export const ddl = `
-- ============ ORGANISATIONS ============
CREATE TABLE IF NOT EXISTS organisations (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  timezone   TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  currency   TEXT NOT NULL DEFAULT 'INR',
  settings   TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- ============ USERS ============
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  full_name     TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'candidate',
  company_name  TEXT,
  institution   TEXT,
  timezone      TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  avatar_url    TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  deleted_at    TEXT
);

-- ============ ORGANISATION MEMBERSHIPS ============
CREATE TABLE IF NOT EXISTS organisation_memberships (
  id            TEXT PRIMARY KEY,
  org_id        TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role          TEXT NOT NULL DEFAULT 'recruiter',
  status        TEXT NOT NULL DEFAULT 'active',
  invited_by    TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  UNIQUE(org_id, user_id)
);

-- ============ PROFILE FIELDS ============
CREATE TABLE IF NOT EXISTS candidate_profiles (
  id               TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  headline         TEXT,
  target_role      TEXT,
  bio              TEXT,
  experience_years REAL DEFAULT 0,
  location         TEXT,
  work_preference  TEXT DEFAULT 'flexible',
  resume_url       TEXT,
  profile_url      TEXT,
  github_url       TEXT,
  portfolio_url    TEXT,
  repo_count       INTEGER DEFAULT 0,
  visibility       TEXT NOT NULL DEFAULT 'public',
  consent_at       TEXT,
  consent_until    TEXT,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL,
  deleted_at       TEXT
);

CREATE TABLE IF NOT EXISTS recruiter_profiles (
  user_id      TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  title        TEXT,
  department   TEXT,
  bio          TEXT,
  linkedin_url TEXT,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

-- ============ SKILL TAXONOMY ============
CREATE TABLE IF NOT EXISTS domains (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon_name   TEXT,
  badge_color TEXT,
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS skills (
  id                     TEXT PRIMARY KEY,
  domain_id              TEXT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  name                   TEXT NOT NULL,
  description            TEXT NOT NULL DEFAULT '',
  category               TEXT,
  proficiency_scale      TEXT NOT NULL DEFAULT '1-5',
  accepted_evidence_types TEXT NOT NULL DEFAULT '["github_pr","project_repo","assessment_score","certificate","code_sample"]',
  assessment_types       TEXT NOT NULL DEFAULT '["practical_coding","mcq","code_review"]',
  active                 INTEGER NOT NULL DEFAULT 1,
  created_at             TEXT NOT NULL,
  updated_at             TEXT NOT NULL,
  UNIQUE(domain_id, name)
);

-- ============ JOBS & REQUIREMENTS ============
CREATE TABLE IF NOT EXISTS jobs (
  id                   TEXT PRIMARY KEY,
  org_id               TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  creator_id           TEXT NOT NULL REFERENCES users(id),
  title                TEXT NOT NULL,
  description          TEXT NOT NULL,
  responsibilities     TEXT NOT NULL DEFAULT '[]',
  department           TEXT,
  domain_id            TEXT REFERENCES domains(id),
  experience_level     TEXT NOT NULL DEFAULT 'mid',
  employment_type      TEXT NOT NULL DEFAULT 'full_time',
  work_arrangement     TEXT NOT NULL DEFAULT 'hybrid',
  location             TEXT NOT NULL DEFAULT 'Bangalore, India',
  salary_min           REAL,
  salary_max           REAL,
  currency             TEXT NOT NULL DEFAULT 'INR',
  application_deadline TEXT,
  status               TEXT NOT NULL DEFAULT 'draft',
  created_at           TEXT NOT NULL,
  updated_at           TEXT NOT NULL,
  deleted_at           TEXT
);

CREATE TABLE IF NOT EXISTS job_skill_requirements (
  id                     TEXT PRIMARY KEY,
  job_id                 TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  skill_id               TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  requirement_type       TEXT NOT NULL DEFAULT 'required',
  target_proficiency     INTEGER NOT NULL DEFAULT 3,
  weight                 REAL NOT NULL DEFAULT 1.0,
  accepted_evidence_types TEXT NOT NULL DEFAULT '[]',
  assessment_required    INTEGER NOT NULL DEFAULT 0,
  created_at             TEXT NOT NULL,
  updated_at             TEXT NOT NULL,
  UNIQUE(job_id, skill_id)
);

-- ============ CANDIDATE SKILLS & EVIDENCE ============
CREATE TABLE IF NOT EXISTS candidate_skills (
  id                  TEXT PRIMARY KEY,
  candidate_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id            TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  proficiency         INTEGER NOT NULL DEFAULT 1,
  verification_status TEXT NOT NULL DEFAULT 'self_reported',
  source              TEXT NOT NULL DEFAULT 'candidate_profile',
  last_verified_at    TEXT,
  verified_by         TEXT REFERENCES users(id),
  notes               TEXT,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL,
  UNIQUE(candidate_id, skill_id)
);

CREATE TABLE IF NOT EXISTS skill_evidence (
  id                  TEXT PRIMARY KEY,
  candidate_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id            TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  evidence_type       TEXT NOT NULL,
  title               TEXT NOT NULL,
  reference_url       TEXT NOT NULL,
  metadata            TEXT NOT NULL DEFAULT '{}',
  source              TEXT NOT NULL DEFAULT 'manual_submission',
  verification_status TEXT NOT NULL DEFAULT 'pending_review',
  decision_rationale  TEXT,
  verified_by         TEXT REFERENCES users(id),
  verified_at         TEXT,
  expiry_at           TEXT,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS verification_reviews (
  id                 TEXT PRIMARY KEY,
  evidence_id        TEXT NOT NULL REFERENCES skill_evidence(id) ON DELETE CASCADE,
  reviewer_id        TEXT NOT NULL REFERENCES users(id),
  previous_status    TEXT NOT NULL,
  new_status         TEXT NOT NULL,
  decision_rationale TEXT NOT NULL,
  rubric_evaluations TEXT NOT NULL DEFAULT '{}',
  created_at         TEXT NOT NULL
);

-- ============ ASSESSMENTS ============
CREATE TABLE IF NOT EXISTS assessment_templates (
  id               TEXT PRIMARY KEY,
  domain_id        TEXT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT NOT NULL,
  type             TEXT NOT NULL DEFAULT 'practical_coding',
  duration_minutes INTEGER NOT NULL DEFAULT 45,
  passing_score    REAL NOT NULL DEFAULT 70.0,
  scoring_rubric   TEXT NOT NULL DEFAULT '{}',
  assessed_skills  TEXT NOT NULL DEFAULT '[]',
  active           INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assessment_assignments (
  id            TEXT PRIMARY KEY,
  org_id        TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  template_id   TEXT NOT NULL REFERENCES assessment_templates(id),
  candidate_id  TEXT NOT NULL REFERENCES users(id),
  job_id        TEXT REFERENCES jobs(id) ON DELETE SET NULL,
  assigned_by   TEXT NOT NULL REFERENCES users(id),
  deadline_at   TEXT,
  status        TEXT NOT NULL DEFAULT 'invited',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assessment_attempts (
  id                 TEXT PRIMARY KEY,
  assignment_id      TEXT NOT NULL REFERENCES assessment_assignments(id) ON DELETE CASCADE,
  candidate_id       TEXT NOT NULL REFERENCES users(id),
  attempt_number     INTEGER NOT NULL DEFAULT 1,
  started_at         TEXT NOT NULL,
  submitted_at       TEXT,
  submission_payload TEXT NOT NULL DEFAULT '{}',
  status             TEXT NOT NULL DEFAULT 'in_progress',
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assessment_results (
  id                     TEXT PRIMARY KEY,
  attempt_id             TEXT NOT NULL REFERENCES assessment_attempts(id) ON DELETE CASCADE,
  candidate_id           TEXT NOT NULL REFERENCES users(id),
  template_id            TEXT NOT NULL REFERENCES assessment_templates(id),
  score                  REAL NOT NULL,
  max_score              REAL NOT NULL DEFAULT 100.0,
  passed                 INTEGER NOT NULL DEFAULT 0,
  rubric_scores          TEXT NOT NULL DEFAULT '{}',
  reviewer_feedback      TEXT,
  verified_skill_awards  TEXT NOT NULL DEFAULT '[]',
  graded_by              TEXT REFERENCES users(id),
  graded_at              TEXT NOT NULL,
  created_at             TEXT NOT NULL
);

-- ============ SKILL GAP ANALYSES ============
CREATE TABLE IF NOT EXISTS skill_gap_analyses (
  id                       TEXT PRIMARY KEY,
  candidate_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id                   TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  overall_match_score      REAL NOT NULL DEFAULT 0.0,
  required_skill_coverage  REAL NOT NULL DEFAULT 0.0,
  preferred_skill_coverage REAL NOT NULL DEFAULT 0.0,
  summary                  TEXT,
  calculated_at            TEXT NOT NULL,
  UNIQUE(candidate_id, job_id)
);

CREATE TABLE IF NOT EXISTS skill_gap_items (
  id                    TEXT PRIMARY KEY,
  analysis_id           TEXT NOT NULL REFERENCES skill_gap_analyses(id) ON DELETE CASCADE,
  skill_id              TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  requirement_type      TEXT NOT NULL,
  target_proficiency    INTEGER NOT NULL,
  candidate_proficiency INTEGER NOT NULL,
  verification_status   TEXT NOT NULL,
  gap_status            TEXT NOT NULL,
  recommendation        TEXT,
  created_at            TEXT NOT NULL
);

-- ============ APPLICATIONS & PIPELINE ============
CREATE TABLE IF NOT EXISTS applications (
  id                TEXT PRIMARY KEY,
  org_id            TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  job_id            TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stage             TEXT NOT NULL DEFAULT 'new_applicant',
  match_score       REAL NOT NULL DEFAULT 0.0,
  cover_note        TEXT,
  rejection_reason  TEXT,
  withdrawal_reason TEXT,
  applied_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  UNIQUE(job_id, candidate_id)
);

CREATE TABLE IF NOT EXISTS application_stage_history (
  id             TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  from_stage     TEXT,
  to_stage       TEXT NOT NULL,
  changed_by     TEXT NOT NULL REFERENCES users(id),
  reason         TEXT,
  created_at     TEXT NOT NULL
);

-- ============ SHORTLISTS ============
CREATE TABLE IF NOT EXISTS shortlists (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  creator_id  TEXT NOT NULL REFERENCES users(id),
  job_id      TEXT REFERENCES jobs(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  description TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shortlist_members (
  id           TEXT PRIMARY KEY,
  shortlist_id TEXT NOT NULL REFERENCES shortlists(id) ON DELETE CASCADE,
  candidate_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notes        TEXT,
  added_by     TEXT NOT NULL REFERENCES users(id),
  created_at   TEXT NOT NULL,
  UNIQUE(shortlist_id, candidate_id)
);

-- ============ INTERVIEWS & FEEDBACK ============
CREATE TABLE IF NOT EXISTS interviews (
  id               TEXT PRIMARY KEY,
  org_id           TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  job_id           TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  application_id   TEXT REFERENCES applications(id) ON DELETE SET NULL,
  title            TEXT NOT NULL,
  interview_type   TEXT NOT NULL DEFAULT 'technical',
  scheduled_at     TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 45,
  timezone         TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  meeting_link     TEXT,
  location         TEXT,
  status           TEXT NOT NULL DEFAULT 'scheduled',
  cancelled_reason TEXT,
  created_by       TEXT NOT NULL REFERENCES users(id),
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS interview_participants (
  id           TEXT PRIMARY KEY,
  interview_id TEXT NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role         TEXT NOT NULL DEFAULT 'interviewer',
  created_at   TEXT NOT NULL,
  UNIQUE(interview_id, user_id)
);

CREATE TABLE IF NOT EXISTS interview_feedback (
  id                      TEXT PRIMARY KEY,
  interview_id            TEXT NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  interviewer_id          TEXT NOT NULL REFERENCES users(id),
  technical_rating        INTEGER,
  communication_rating    INTEGER,
  overall_recommendation  TEXT NOT NULL,
  feedback_notes          TEXT NOT NULL,
  confidential_notes      TEXT,
  submitted_at            TEXT NOT NULL,
  created_at              TEXT NOT NULL,
  UNIQUE(interview_id, interviewer_id)
);

-- ============ RECRUITER NOTES ============
CREATE TABLE IF NOT EXISTS recruiter_notes (
  id           TEXT PRIMARY KEY,
  org_id       TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  candidate_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id       TEXT REFERENCES jobs(id) ON DELETE SET NULL,
  author_id    TEXT NOT NULL REFERENCES users(id),
  note         TEXT NOT NULL,
  is_private   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

-- ============ AUDIT TRAIL ============
CREATE TABLE IF NOT EXISTS audit_events (
  id            TEXT PRIMARY KEY,
  org_id        TEXT,
  actor_id      TEXT,
  action        TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id   TEXT,
  payload       TEXT NOT NULL DEFAULT '{}',
  ip_address    TEXT,
  created_at    TEXT NOT NULL
);

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_memberships_user ON organisation_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_org_status ON jobs(org_id, status);
CREATE INDEX IF NOT EXISTS idx_job_skills_job ON job_skill_requirements(job_id);
CREATE INDEX IF NOT EXISTS idx_skills_domain ON skills(domain_id);
CREATE INDEX IF NOT EXISTS idx_candidate_skills_user ON candidate_skills(candidate_id, verification_status);
CREATE INDEX IF NOT EXISTS idx_skill_evidence_candidate ON skill_evidence(candidate_id, verification_status);
CREATE INDEX IF NOT EXISTS idx_applications_org_job ON applications(org_id, job_id, stage);
CREATE INDEX IF NOT EXISTS idx_applications_candidate ON applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interviews_org_date ON interviews(org_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_audit_org_action ON audit_events(org_id, action, created_at);
`;
