import { randomUUID as uuidv4 } from 'node:crypto';
import { repository } from '../data/repository.js';
import { matchingService } from './matchingService.js';
import { notificationService } from './notificationService.js';
import { emailService } from './emailService.js';

export const PIPELINE_STAGES = [
  'new_applicant',
  'under_review',
  'shortlisted',
  'assessment_invited',
  'assessment_completed',
  'interview_scheduled',
  'interview_completed',
  'offer_extended',
  'hired',
  'rejected',
  'withdrawn'
];

export const ALLOWED_STAGE_TRANSITIONS = {
  new_applicant: ['under_review', 'shortlisted', 'assessment_invited', 'interview_scheduled', 'rejected', 'withdrawn'],
  under_review: ['shortlisted', 'assessment_invited', 'interview_scheduled', 'offer_extended', 'rejected', 'withdrawn'],
  shortlisted: ['under_review', 'assessment_invited', 'interview_scheduled', 'offer_extended', 'rejected', 'withdrawn'],
  assessment_invited: ['assessment_completed', 'interview_scheduled', 'rejected', 'withdrawn'],
  assessment_completed: ['shortlisted', 'interview_scheduled', 'offer_extended', 'rejected', 'withdrawn'],
  interview_scheduled: ['interview_completed', 'offer_extended', 'rejected', 'withdrawn'],
  interview_completed: ['interview_scheduled', 'offer_extended', 'rejected', 'withdrawn'],
  offer_extended: ['hired', 'rejected', 'withdrawn'],
  hired: [],
  rejected: ['under_review'],
  withdrawn: [],
};

export const STAGE_NOTIFICATIONS = {
  under_review: {
    type: 'info',
    title: 'Application Under Review',
    message: (jobTitle) => `Your application for "${jobTitle}" is currently under review by the hiring team.`
  },
  shortlisted: {
    type: 'success',
    title: 'Application Shortlisted',
    message: (jobTitle) => `Great news! Your application for "${jobTitle}" has been shortlisted.`
  },
  assessment_invited: {
    type: 'info',
    title: 'Skill Assessment Invitation',
    message: (jobTitle) => `You have been invited to complete a skill assessment for "${jobTitle}". Please check your assessments tab.`
  },
  assessment_completed: {
    type: 'info',
    title: 'Assessment Received',
    message: (jobTitle) => `Your assessment submission for "${jobTitle}" has been received and is being evaluated.`
  },
  interview_scheduled: {
    type: 'info',
    title: 'Interview Scheduled',
    message: (jobTitle) => `An interview has been scheduled for your application to "${jobTitle}".`
  },
  interview_completed: {
    type: 'info',
    title: 'Interview Completed',
    message: (jobTitle) => `Your interview for "${jobTitle}" has been marked as completed. The hiring team will be in touch with next steps.`
  },
  offer_extended: {
    type: 'success',
    title: 'Job Offer Extended',
    message: (jobTitle) => `Congratulations! A job offer has been extended for "${jobTitle}". Please review the offer details.`
  },
  hired: {
    type: 'success',
    title: 'Welcome Aboard!',
    message: (jobTitle) => `Congratulations! You have been hired for "${jobTitle}".`
  },
  rejected: {
    type: 'info',
    title: 'Application Update',
    message: (jobTitle) => `Thank you for your interest in "${jobTitle}". The hiring team has decided to pursue other applicants whose experience more closely matches their current requirements.`
  },
  withdrawn: {
    type: 'info',
    title: 'Application Withdrawn',
    message: (jobTitle) => `Your application for "${jobTitle}" has been withdrawn.`
  }
};

export const pipelineService = {
  getApplications(orgId, {
    jobId = null,
    stage = null,
    search = null,
    skills = null,
    verifiedOnly = false,
    cgpaMin = null,
    cgpaMax = null,
    gradYear = null,
    college = null,
    location = null,
    minScore = null,
    maxScore = null,
    tags = null,
    sortBy = 'match_score',
    sortOrder = 'desc',
    limit = 100,
    offset = 0
  } = {}) {
    let sql = `
      SELECT a.*,
             j.title as job_title, j.department as job_department,
             u.full_name as candidate_name, u.email as candidate_email, u.avatar_url as candidate_avatar,
             u.institution,
             cp.headline, cp.target_role, cp.experience_years, cp.location, cp.degree, cp.graduation_year, cp.cgpa,
             (SELECT COUNT(*) FROM candidate_skills cs WHERE cs.candidate_id = u.id AND cs.verification_status = 'verified') as verified_skill_count,
             (SELECT COUNT(*) FROM interviews i WHERE i.application_id = a.id AND i.status = 'scheduled') as scheduled_interviews_count,
             (SELECT COUNT(*) FROM skill_evidence se WHERE se.candidate_id = u.id AND se.evidence_type = 'project_repo') as project_count,
             (SELECT COUNT(*) FROM assessment_results ar WHERE ar.candidate_id = u.id) as assessment_count,
             (SELECT COUNT(*) FROM skill_evidence se WHERE se.candidate_id = u.id AND se.evidence_type = 'certificate') as certification_count,
             (SELECT ROUND(AVG(ar.score), 0) FROM assessment_results ar WHERE ar.candidate_id = u.id) as assessment_score
      FROM applications a
      JOIN jobs j ON j.id = a.job_id
      JOIN users u ON u.id = a.candidate_id
      JOIN candidate_profiles cp ON cp.id = u.id
      WHERE a.org_id = ? AND j.deleted_at IS NULL
    `;
    const params = [orgId];

    if (jobId) {
      sql += ' AND a.job_id = ?';
      params.push(jobId);
    }

    if (stage && stage !== 'all') {
      if (Array.isArray(stage)) {
        sql += ` AND a.stage IN (${stage.map(() => '?').join(',')})`;
        params.push(...stage);
      } else if (stage.includes(',')) {
        const stageList = stage.split(',').map(s => s.trim()).filter(Boolean);
        sql += ` AND a.stage IN (${stageList.map(() => '?').join(',')})`;
        params.push(...stageList);
      } else {
        sql += ' AND a.stage = ?';
        params.push(stage);
      }
    }

    if (cgpaMin !== null && cgpaMin !== undefined && cgpaMin !== '') {
      sql += ' AND cp.cgpa >= ?';
      params.push(Number(cgpaMin));
    }
    if (cgpaMax !== null && cgpaMax !== undefined && cgpaMax !== '') {
      sql += ' AND cp.cgpa <= ?';
      params.push(Number(cgpaMax));
    }

    if (gradYear) {
      sql += ' AND cp.graduation_year = ?';
      params.push(Number(gradYear));
    }

    if (college) {
      sql += ' AND u.institution LIKE ?';
      params.push(`%${college}%`);
    }

    if (location) {
      sql += ' AND cp.location LIKE ?';
      params.push(`%${location}%`);
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      sql += ` AND (
        u.full_name LIKE ? OR
        j.title LIKE ? OR
        cp.headline LIKE ? OR
        u.institution LIKE ? OR
        cp.degree LIKE ? OR
        EXISTS (
          SELECT 1 FROM candidate_skills cs
          JOIN skills s ON s.id = cs.skill_id
          WHERE cs.candidate_id = u.id AND s.name LIKE ?
        ) OR
        EXISTS (
          SELECT 1 FROM skill_evidence se
          WHERE se.candidate_id = u.id AND se.title LIKE ?
        )
      )`;
      params.push(q, q, q, q, q, q, q);
    }

    // Determine ORDER BY
    const orderDirection = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    let orderBySql = 'a.updated_at DESC';
    if (sortBy === 'match_score') {
      orderBySql = `a.match_score ${orderDirection}, a.updated_at DESC`;
    } else if (sortBy === 'assessment_score') {
      orderBySql = `assessment_score ${orderDirection}, a.match_score DESC`;
    } else if (sortBy === 'verified_skills') {
      orderBySql = `verified_skill_count ${orderDirection}, a.match_score DESC`;
    } else if (sortBy === 'applied_at') {
      orderBySql = `a.applied_at ${orderDirection}`;
    } else if (sortBy === 'stage_age') {
      // Longer time in stage means earlier updated_at
      orderBySql = orderDirection === 'DESC' ? 'a.updated_at ASC' : 'a.updated_at DESC';
    }

    sql += ` ORDER BY ${orderBySql};`;

    const rawRows = repository.query(sql, params);

    // Fetch tags and skills for all returned applications efficiently
    const appIds = rawRows.map(r => r.id);
    const tagsMap = new Map();
    if (appIds.length > 0) {
      const placeholders = appIds.map(() => '?').join(',');
      const tagRows = repository.query(
        `SELECT application_id, tag, color FROM application_tags WHERE application_id IN (${placeholders});`,
        appIds
      );
      for (const t of tagRows) {
        if (!tagsMap.has(t.application_id)) tagsMap.set(t.application_id, []);
        tagsMap.get(t.application_id).push(t.tag);
      }
    }

    // Candidate skills lookup
    const candIds = [...new Set(rawRows.map(r => r.candidate_id))];
    const skillsMap = new Map();
    if (candIds.length > 0) {
      const placeholders = candIds.map(() => '?').join(',');
      const skillRows = repository.query(
        `SELECT cs.candidate_id, s.name as skill_name, cs.verification_status, cs.proficiency
         FROM candidate_skills cs
         JOIN skills s ON s.id = cs.skill_id
         WHERE cs.candidate_id IN (${placeholders});`,
        candIds
      );
      for (const sr of skillRows) {
        if (!skillsMap.has(sr.candidate_id)) skillsMap.set(sr.candidate_id, []);
        skillsMap.get(sr.candidate_id).push(sr);
      }
    }

    // Job required skills (must-have gates)
    const jobIds = [...new Set(rawRows.map(r => r.job_id))];
    const jobReqsMap = new Map();
    if (jobIds.length > 0) {
      const placeholders = jobIds.map(() => '?').join(',');
      const reqRows = repository.query(
        `SELECT jsr.job_id, s.name as skill_name, jsr.skill_id, jsr.requirement_type
         FROM job_skill_requirements jsr
         JOIN skills s ON s.id = jsr.skill_id
         WHERE jsr.job_id IN (${placeholders}) AND jsr.requirement_type = 'required';`,
        jobIds
      );
      for (const rr of reqRows) {
        if (!jobReqsMap.has(rr.job_id)) jobReqsMap.set(rr.job_id, []);
        jobReqsMap.get(rr.job_id).push(rr);
      }
    }

    // Enrich rows
    const nowMs = Date.now();
    let enriched = rawRows.map(app => {
      const candSkills = skillsMap.get(app.candidate_id) || [];
      const verifiedSkills = candSkills
        .filter(s => s.verification_status === 'verified')
        .map(s => s.skill_name);
      const allSkills = candSkills.map(s => s.skill_name);
      const tagsList = tagsMap.get(app.id) || [];

      // Calculate days in stage
      const updatedMs = new Date(app.updated_at).getTime();
      const daysInStage = Math.max(0, Math.floor((nowMs - updatedMs) / (1000 * 60 * 60 * 24)));

      // Manual override detection
      const advancedStages = ['interview_scheduled', 'interview_completed', 'offer_extended', 'hired'];
      const hasManualOverride =
        (app.match_score < 65 && advancedStages.includes(app.stage)) ||
        (app.match_score < 50 && app.stage === 'shortlisted');

      // Must-have skills gate check
      const jobRequired = jobReqsMap.get(app.job_id) || [];
      let isBelowBar = false;
      let missingMustHave = [];
      if (jobRequired.length > 0) {
        const verifiedSet = new Set(verifiedSkills.map(s => s.toLowerCase()));
        for (const req of jobRequired) {
          if (!verifiedSet.has(req.skill_name.toLowerCase())) {
            isBelowBar = true;
            missingMustHave.push(req.skill_name);
          }
        }
      }

      return {
        ...app,
        days_in_stage: daysInStage,
        has_manual_override: hasManualOverride,
        is_below_bar: isBelowBar,
        missing_must_have: missingMustHave,
        tags: tagsList,
        top_skills: verifiedSkills.slice(0, 3),
        verified_skills: verifiedSkills,
        all_skills: allSkills,
        institution: app.institution || 'University Candidate',
        degree: app.degree || 'Degree Candidate',
        graduation_year: app.graduation_year || 2025,
        cgpa: app.cgpa !== null && app.cgpa !== undefined ? Number(app.cgpa) : 0,
        project_count: app.project_count || 0,
        assessment_count: app.assessment_count || 0,
        certification_count: app.certification_count || 0,
        assessment_score: app.assessment_score !== null ? Number(app.assessment_score) : null
      };
    });

    // In-memory filters for nested attributes (tags, skills, score range)
    if (tags) {
      const tagFilterList = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim().toLowerCase());
      enriched = enriched.filter(a => {
        const lowerTags = a.tags.map(t => t.toLowerCase());
        return tagFilterList.some(ft => lowerTags.includes(ft));
      });
    }

    if (skills) {
      const skillFilterList = Array.isArray(skills) ? skills : skills.split(',').map(s => s.trim().toLowerCase());
      enriched = enriched.filter(a => {
        const targetList = verifiedOnly ? a.verified_skills : a.all_skills;
        const lowerList = targetList.map(s => s.toLowerCase());
        return skillFilterList.every(fs => lowerList.includes(fs));
      });
    }

    if (minScore !== null && minScore !== undefined && minScore !== '') {
      enriched = enriched.filter(a => a.assessment_score !== null && a.assessment_score >= Number(minScore));
    }
    if (maxScore !== null && maxScore !== undefined && maxScore !== '') {
      enriched = enriched.filter(a => a.assessment_score !== null && a.assessment_score <= Number(maxScore));
    }

    // Pagination slice if limit is applied
    if (limit && Number(limit) > 0) {
      const start = Number(offset) || 0;
      return enriched.slice(start, start + Number(limit));
    }

    return enriched;
  },

  getApplicationById(orgId, applicationId) {
    const app = repository.queryOne(
      `SELECT a.*,
              j.title as job_title, j.department as job_department,
              u.full_name as candidate_name, u.email as candidate_email, u.avatar_url as candidate_avatar,
              u.institution,
              cp.headline, cp.target_role, cp.experience_years, cp.location, cp.github_url, cp.portfolio_url,
              cp.degree, cp.graduation_year, cp.cgpa,
              (SELECT COUNT(*) FROM candidate_skills cs WHERE cs.candidate_id = u.id AND cs.verification_status = 'verified') as verified_skill_count,
              (SELECT COUNT(*) FROM skill_evidence se WHERE se.candidate_id = u.id AND se.evidence_type = 'project_repo') as project_count,
              (SELECT COUNT(*) FROM assessment_results ar WHERE ar.candidate_id = u.id) as assessment_count,
              (SELECT COUNT(*) FROM skill_evidence se WHERE se.candidate_id = u.id AND se.evidence_type = 'certificate') as certification_count,
              (SELECT ROUND(AVG(ar.score), 0) FROM assessment_results ar WHERE ar.candidate_id = u.id) as assessment_score
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       JOIN users u ON u.id = a.candidate_id
       JOIN candidate_profiles cp ON cp.id = u.id
       WHERE a.id = ? AND a.org_id = ?;`,
      [applicationId, orgId]
    );

    if (!app) return null;

    // Stage history
    const stageHistory = repository.query(
      `SELECT ash.*, COALESCE(u.full_name, 'Recruiter') as changed_by_name
       FROM application_stage_history ash
       LEFT JOIN users u ON u.id = ash.changed_by
       WHERE ash.application_id = ?
       ORDER BY ash.created_at ASC;`,
      [applicationId]
    );

    // Notes
    const notes = repository.query(
      `SELECT rn.*, u.full_name as author_name
       FROM recruiter_notes rn
       JOIN users u ON u.id = rn.author_id
       WHERE rn.candidate_id = ? AND (rn.job_id = ? OR rn.job_id IS NULL)
       ORDER BY rn.created_at DESC;`,
      [app.candidate_id, app.job_id]
    );

    // Tags
    const tags = repository.query(
      `SELECT tag, color FROM application_tags WHERE application_id = ?;`,
      [applicationId]
    );

    // Verified skills
    const skills = repository.query(
      `SELECT cs.*, s.name as skill_name, s.category
       FROM candidate_skills cs
       JOIN skills s ON s.id = cs.skill_id
       WHERE cs.candidate_id = ?;`,
      [app.candidate_id]
    );

    // Projects
    const projects = repository.query(
      `SELECT * FROM skill_evidence WHERE candidate_id = ? AND evidence_type = 'project_repo' ORDER BY created_at DESC;`,
      [app.candidate_id]
    );

    // Assessments
    const assessments = repository.query(
      `SELECT ar.*, at.title as template_title, at.type as assessment_type
       FROM assessment_results ar
       JOIN assessment_templates at ON at.id = ar.template_id
       WHERE ar.candidate_id = ?
       ORDER BY ar.created_at DESC;`,
      [app.candidate_id]
    );

    const nowMs = Date.now();
    const updatedMs = new Date(app.updated_at).getTime();
    const daysInStage = Math.max(0, Math.floor((nowMs - updatedMs) / (1000 * 60 * 60 * 24)));

    return {
      ...app,
      stageHistory,
      notes,
      tags: tags.map(t => t.tag),
      skills,
      projects,
      assessments,
      days_in_stage: daysInStage,
      institution: app.institution || 'University Candidate',
      degree: app.degree || 'Degree Candidate',
      graduation_year: app.graduation_year || 2025,
      cgpa: app.cgpa !== null && app.cgpa !== undefined ? Number(app.cgpa) : 0
    };
  },

  createApplication(orgId, jobId, candidateId, coverNote = '') {
    const existing = repository.queryOne(
      'SELECT id FROM applications WHERE job_id = ? AND candidate_id = ?;',
      [jobId, candidateId]
    );
    if (existing) {
      throw new Error('Candidate has already applied for this job');
    }

    // Compute initial match score
    let matchScore = 50;
    try {
      const match = matchingService.calculateJobMatch(candidateId, jobId);
      matchScore = match.matchScore;
    } catch {
      // ignore
    }

    const id = `app-${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();

    try {
      const createdApp = repository.transaction((repo) => {
        repo.execute(
          `INSERT INTO applications (
            id, org_id, job_id, candidate_id, stage, match_score, cover_note, applied_at, updated_at
          ) VALUES (?, ?, ?, ?, 'new_applicant', ?, ?, ?, ?);`,
          [id, orgId, jobId, candidateId, matchScore, coverNote, now, now]
        );

        repo.execute(
          `INSERT INTO application_stage_history (
            id, application_id, from_stage, to_stage, changed_by, reason, created_at
          ) VALUES (?, ?, NULL, 'new_applicant', ?, 'Application submitted', ?);`,
          [`ash-${uuidv4().slice(0, 8)}`, id, candidateId, now]
        );

        return this.getApplicationById(orgId, id);
      });

      // Candidate lifecycle notification (non-blocking)
      try {
        const job = repository.queryOne('SELECT title FROM jobs WHERE id = ?;', [jobId]);
        const candidate = repository.queryOne('SELECT full_name, email FROM users WHERE id = ?;', [candidateId]);
        const jobTitle = job?.title || 'the position';

        notificationService.createNotification({
          userId: candidateId,
          type: 'info',
          title: 'Application Submitted',
          body: `Your application for "${jobTitle}" has been submitted successfully.`,
          link: `/student/applications/${id}`
        });

        if (candidate?.email) {
          emailService.sendCandidateNotificationEmail({
            to: candidate.email,
            candidateName: candidate.full_name,
            title: 'Application Submitted',
            body: `Your application for "${jobTitle}" has been submitted successfully to the hiring team.`,
            actionLink: `/student/applications/${id}`
          }).catch(() => {});
        }
      } catch {
        // Notification failure must not disrupt core workflow
      }

      return createdApp;
    } catch (err) {
      if (err.message && (err.message.includes('UNIQUE constraint') || err.message.includes('already applied'))) {
        throw new Error('Candidate has already applied for this job');
      }
      throw err;
    }
  },

  updateStage(orgId, applicationId, newStage, changedBy, reason = '') {
    if (!PIPELINE_STAGES.includes(newStage)) {
      throw new Error(`Invalid pipeline stage: ${newStage}`);
    }

    const app = repository.queryOne(
      'SELECT * FROM applications WHERE id = ? AND org_id = ?;',
      [applicationId, orgId]
    );
    if (!app) throw new Error('Application not found');

    if (app.stage === newStage) {
      return this.getApplicationById(orgId, applicationId);
    }

    const allowedNext = ALLOWED_STAGE_TRANSITIONS[app.stage];
    if (allowedNext && !allowedNext.includes(newStage)) {
      throw new Error(`Invalid stage transition from "${app.stage}" to "${newStage}"`);
    }

    const now = new Date().toISOString();

    repository.transaction((repo) => {
      repo.execute(
        'UPDATE applications SET stage = ?, updated_at = ? WHERE id = ?;',
        [newStage, now, applicationId]
      );

      repo.execute(
        `INSERT INTO application_stage_history (
          id, application_id, from_stage, to_stage, changed_by, reason, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [`ash-${uuidv4().slice(0, 8)}`, applicationId, app.stage, newStage, changedBy, reason, now]
      );

      repo.execute(
        `INSERT INTO audit_events (
          id, org_id, actor_id, action, resource_type, resource_id, payload, created_at
        ) VALUES (?, ?, ?, 'application.stage_change', 'applications', ?, ?, ?);`,
        [
          `ae-${uuidv4().slice(0, 8)}`,
          orgId,
          changedBy,
          applicationId,
          JSON.stringify({ from: app.stage, to: newStage, reason }),
          now
        ]
      );
    });

    // Notify candidate of stage transition without exposing recruiter's internal reason or notes
    try {
      const job = repository.queryOne('SELECT title FROM jobs WHERE id = ?;', [app.job_id]);
      const candidate = repository.queryOne('SELECT full_name, email FROM users WHERE id = ?;', [app.candidate_id]);
      const jobTitle = job?.title || 'the position';

      const stageInfo = STAGE_NOTIFICATIONS[newStage] || {
        type: 'info',
        title: 'Application Update',
        message: (t) => `Your application for "${t}" has transitioned to ${newStage.replace(/_/g, ' ')}.`
      };

      const notifTitle = stageInfo.title;
      const notifBody = stageInfo.message(jobTitle);

      notificationService.createNotification({
        userId: app.candidate_id,
        type: stageInfo.type,
        title: notifTitle,
        body: notifBody,
        link: `/student/applications/${applicationId}`
      });

      if (candidate?.email) {
        emailService.sendCandidateNotificationEmail({
          to: candidate.email,
          candidateName: candidate.full_name,
          title: notifTitle,
          body: notifBody,
          actionLink: `/student/applications/${applicationId}`
        }).catch(() => {});
      }
    } catch {
      // Notification failure must not disrupt core workflow
    }

    return this.getApplicationById(orgId, applicationId);
  },

  addRecruiterNote(orgId, candidateId, authorId, note, jobId = null, isPrivate = false) {
    if (!note || note.trim().length === 0) {
      throw new Error('Note content cannot be empty');
    }
    const id = `rn-${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();

    repository.execute(
      `INSERT INTO recruiter_notes (
        id, org_id, candidate_id, job_id, author_id, note, is_private, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [id, orgId, candidateId, jobId, authorId, note.trim(), isPrivate ? 1 : 0, now, now]
    );

    return { id, candidateId, note, createdAt: now };
  },

  // Shortlists
  getShortlists(orgId) {
    const shortlists = repository.query(
      `SELECT s.*, j.title as job_title, u.full_name as creator_name,
        (SELECT COUNT(*) FROM shortlist_members sm WHERE sm.shortlist_id = s.id) as member_count
       FROM shortlists s
       LEFT JOIN jobs j ON j.id = s.job_id
       LEFT JOIN users u ON u.id = s.creator_id
       WHERE s.org_id = ?
       ORDER BY s.created_at DESC;`,
      [orgId]
    );
    return shortlists;
  },

  getShortlistMembers(shortlistId, orgId = null) {
    if (orgId) {
      const shortlist = repository.queryOne(
        'SELECT id FROM shortlists WHERE id = ? AND org_id = ?;',
        [shortlistId, orgId]
      );
      if (!shortlist) {
        return null;
      }
    } else {
      const shortlist = repository.queryOne(
        'SELECT id FROM shortlists WHERE id = ?;',
        [shortlistId]
      );
      if (!shortlist) {
        return null;
      }
    }

    return repository.query(
      `SELECT sm.*, u.full_name, u.email, u.avatar_url,
              cp.headline, cp.target_role, cp.experience_years, cp.location,
              (SELECT COUNT(*) FROM candidate_skills cs WHERE cs.candidate_id = u.id AND cs.verification_status = 'verified') as verified_skill_count
       FROM shortlist_members sm
       JOIN users u ON u.id = sm.candidate_id
       JOIN candidate_profiles cp ON cp.id = u.id
       WHERE sm.shortlist_id = ?
       ORDER BY sm.created_at DESC;`,
      [shortlistId]
    );
  },

  createShortlist(orgId, creatorId, { title, description = '', jobId = null }) {
    if (!title || !title.trim()) throw new Error('Shortlist title is required');
    const id = `sl-${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();

    repository.execute(
      `INSERT INTO shortlists (id, org_id, creator_id, job_id, title, description, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [id, orgId, creatorId, jobId, title.trim(), description.trim(), now, now]
    );

    return repository.queryOne('SELECT * FROM shortlists WHERE id = ?;', [id]);
  },

  toggleShortlistMember(shortlistId, orgIdOrCandidateId, candidateIdOrAddedBy, addedByOrNotes = '', maybeNotes = '') {
    let orgId = null;
    let candidateId;
    let addedBy;
    let notes = '';

    if (arguments.length >= 5 || (typeof orgIdOrCandidateId === 'string' && orgIdOrCandidateId.startsWith('org-'))) {
      orgId = orgIdOrCandidateId;
      candidateId = candidateIdOrAddedBy;
      addedBy = addedByOrNotes;
      notes = maybeNotes || '';
    } else {
      candidateId = orgIdOrCandidateId;
      addedBy = candidateIdOrAddedBy;
      notes = addedByOrNotes || '';
    }

    if (orgId) {
      const shortlist = repository.queryOne(
        'SELECT id FROM shortlists WHERE id = ? AND org_id = ?;',
        [shortlistId, orgId]
      );
      if (!shortlist) {
        return null;
      }
    }

    const existing = repository.queryOne(
      'SELECT id FROM shortlist_members WHERE shortlist_id = ? AND candidate_id = ?;',
      [shortlistId, candidateId]
    );

    if (existing) {
      repository.execute('DELETE FROM shortlist_members WHERE id = ?;', [existing.id]);
      return { member: false, candidateId };
    } else {
      const id = `sm-${uuidv4().slice(0, 8)}`;
      repository.execute(
        `INSERT INTO shortlist_members (id, shortlist_id, candidate_id, notes, added_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?);`,
        [id, shortlistId, candidateId, notes, addedBy, new Date().toISOString()]
      );
      return { member: true, candidateId, id };
    }
  },

  // Bulk stage update with audit tracking & undo support
  bulkUpdateStage(orgId, applicationIds, targetStage, changedBy, reason = '', actorType = 'human') {
    if (!PIPELINE_STAGES.includes(targetStage)) {
      throw new Error(`Invalid target stage: ${targetStage}`);
    }
    if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
      throw new Error('applicationIds must be a non-empty array');
    }

    const previousStages = {};
    const updatedApps = [];
    const now = new Date().toISOString();

    repository.transaction((repo) => {
      for (const appId of applicationIds) {
        const app = repo.queryOne(
          'SELECT id, stage, candidate_id, job_id FROM applications WHERE id = ? AND org_id = ?;',
          [appId, orgId]
        );
        if (!app) continue;

        previousStages[appId] = app.stage;

        repo.execute(
          'UPDATE applications SET stage = ?, updated_at = ? WHERE id = ?;',
          [targetStage, now, appId]
        );

        repo.execute(
          `INSERT INTO application_stage_history (
            id, application_id, from_stage, to_stage, changed_by, actor_type, reason, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
          [`ash-${uuidv4().slice(0, 8)}`, appId, app.stage, targetStage, changedBy, actorType, reason || 'Bulk stage transition', now]
        );

        repo.execute(
          `INSERT INTO audit_events (
            id, org_id, actor_id, action, resource_type, resource_id, payload, created_at
          ) VALUES (?, ?, ?, 'application.bulk_stage_change', 'applications', ?, ?, ?);`,
          [
            `ae-${uuidv4().slice(0, 8)}`,
            orgId,
            changedBy,
            appId,
            JSON.stringify({ from: app.stage, to: targetStage, reason, actorType }),
            now
          ]
        );

        updatedApps.push(appId);
      }
    });

    return {
      success: true,
      updatedCount: updatedApps.length,
      targetStage,
      previousStages
    };
  },

  // Bulk tag management (add / remove)
  bulkTagApplications(orgId, applicationIds, tags, action = 'add') {
    if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
      throw new Error('applicationIds must be a non-empty array');
    }
    if (!Array.isArray(tags) || tags.length === 0) {
      throw new Error('tags must be a non-empty array');
    }

    const now = new Date().toISOString();
    let affectedCount = 0;

    repository.transaction((repo) => {
      for (const appId of applicationIds) {
        const app = repo.queryOne('SELECT id FROM applications WHERE id = ? AND org_id = ?;', [appId, orgId]);
        if (!app) continue;

        for (const tag of tags) {
          const cleanTag = tag.trim();
          if (!cleanTag) continue;

          if (action === 'remove') {
            repo.execute('DELETE FROM application_tags WHERE application_id = ? AND tag = ?;', [appId, cleanTag]);
            affectedCount++;
          } else {
            const tagId = `tag-${appId}-${cleanTag.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;
            repo.execute(
              `INSERT OR REPLACE INTO application_tags (id, application_id, tag, color, created_at)
               VALUES (?, ?, ?, 'indigo', ?);`,
              [tagId, appId, cleanTag, now]
            );
            affectedCount++;
          }
        }
      }
    });

    return { success: true, affectedCount, action, tags };
  },

  // Match score breakdown: 35/25/20/10/10 weighted formula with manual override detection
  getMatchBreakdown(orgId, applicationId) {
    const app = this.getApplicationById(orgId, applicationId);
    if (!app) return null;

    // 1. Fetch Job Requirements
    const requirements = repository.query(
      `SELECT jsr.*, s.name as skill_name, s.category as skill_category
       FROM job_skill_requirements jsr
       JOIN skills s ON s.id = jsr.skill_id
       WHERE jsr.job_id = ?;`,
      [app.job_id]
    );

    // 2. Fetch Candidate Verified Skills
    const candidateSkills = repository.query(
      `SELECT cs.*, s.name as skill_name, s.category as skill_category
       FROM candidate_skills cs
       JOIN skills s ON s.id = cs.skill_id
       WHERE cs.candidate_id = ?;`,
      [app.candidate_id]
    );
    const candidateSkillMap = new Map(candidateSkills.map(s => [s.skill_id, s]));

    const matchedSkills = [];
    const missingSkills = [];
    let reqCount = requirements.length;
    let reqEarned = 0;

    for (const req of requirements) {
      const cs = candidateSkillMap.get(req.skill_id);
      if (cs && cs.verification_status === 'verified') {
        matchedSkills.push(req.skill_name);
        reqEarned++;
      } else {
        missingSkills.push(req.skill_name);
      }
    }

    if (reqCount === 0) {
      for (const cs of candidateSkills) {
        if (cs.verification_status === 'verified') {
          matchedSkills.push(cs.skill_name);
        }
      }
    }

    // Component 1: Verified Skills (Weight: 35)
    const verifiedSkillScore = reqCount > 0
      ? Math.round((reqEarned / reqCount) * 35)
      : Math.min(35, Math.round(candidateSkills.filter(s => s.verification_status === 'verified').length * 7));

    // Component 2: Assessment Performance (Weight: 25)
    const assessments = repository.query(
      `SELECT ar.*, at.title as template_title
       FROM assessment_results ar
       JOIN assessment_templates at ON at.id = ar.template_id
       WHERE ar.candidate_id = ?;`,
      [app.candidate_id]
    );
    const avgAssessment = assessments.length > 0
      ? assessments.reduce((sum, a) => sum + (Number(a.score) || 0), 0) / assessments.length
      : 0;
    const assessmentScore = Math.min(25, Math.round((avgAssessment / 100) * 25));

    // Component 3: Project Relevance & Depth (Weight: 20)
    const projects = repository.query(
      `SELECT * FROM skill_evidence WHERE candidate_id = ? AND evidence_type = 'project_repo';`,
      [app.candidate_id]
    );
    const projectScore = projects.length >= 3 ? 20 : (projects.length === 2 ? 16 : (projects.length === 1 ? 12 : 5));

    // Component 4: Education Fit (Weight: 10)
    const cgpa = Number(app.cgpa) || 7.5;
    const educationScore = Math.min(10, Math.round((cgpa / 10) * 10));

    // Component 5: Learning Velocity (Weight: 10)
    const certs = repository.query(
      `SELECT * FROM skill_evidence WHERE candidate_id = ? AND evidence_type = 'certificate';`,
      [app.candidate_id]
    );
    const velocityScore = Math.min(10, Math.round(5 + (certs.length * 2.5)));

    const overallScore = Math.min(100, Math.round(verifiedSkillScore + assessmentScore + projectScore + educationScore + velocityScore));

    const advancedStages = ['interview_scheduled', 'interview_completed', 'offer_extended', 'hired'];
    const hasManualOverride = (overallScore < 65 && advancedStages.includes(app.stage)) || (overallScore < 50 && app.stage === 'shortlisted');

    return {
      applicationId: app.id,
      candidateId: app.candidate_id,
      jobId: app.job_id,
      overallScore,
      currentStage: app.stage,
      hasManualOverride,
      overrideReason: hasManualOverride
        ? `Stage is "${app.stage.replace(/_/g, ' ')}" despite composite match score of ${overallScore}%. Recruiter manual override applied.`
        : null,
      factors: {
        verifiedSkills: {
          weight: 35,
          score: verifiedSkillScore,
          maxScore: 35,
          label: 'Verified Skills (35%)',
          details: reqCount > 0
            ? `${reqEarned} of ${reqCount} required skills verified`
            : `${candidateSkills.filter(s => s.verification_status === 'verified').length} verified skills on passport`
        },
        assessment: {
          weight: 25,
          score: assessmentScore,
          maxScore: 25,
          label: 'Assessment Performance (25%)',
          details: assessments.length > 0
            ? `Average score: ${Math.round(avgAssessment)}% across ${assessments.length} assessment${assessments.length > 1 ? 's' : ''}`
            : 'No assessments completed yet'
        },
        projectRelevance: {
          weight: 20,
          score: projectScore,
          maxScore: 20,
          label: 'Project Relevance & Depth (20%)',
          details: `${projects.length} verified project repositories evaluated`
        },
        educationFit: {
          weight: 10,
          score: educationScore,
          maxScore: 10,
          label: 'Education Fit (10%)',
          details: `${app.degree || 'Degree'} from ${app.institution || 'University'} (CGPA: ${cgpa})`
        },
        learningVelocity: {
          weight: 10,
          score: velocityScore,
          maxScore: 10,
          label: 'Learning Velocity (10%)',
          details: `${certs.length} active industry certifications & recent progress`
        }
      },
      matchedSkills,
      missingSkills
    };
  },

  // Audit history for candidate application
  getApplicationAudit(orgId, applicationId) {
    const app = repository.queryOne(
      'SELECT id FROM applications WHERE id = ? AND org_id = ?;',
      [applicationId, orgId]
    );
    if (!app) return null;

    return repository.query(
      `SELECT ash.id, ash.application_id, ash.from_stage, ash.to_stage,
              ash.changed_by, ash.actor_type, ash.reason, ash.created_at,
              COALESCE(u.full_name, 'Recruiter') as changed_by_name
       FROM application_stage_history ash
       LEFT JOIN users u ON u.id = ash.changed_by
       WHERE ash.application_id = ?
       ORDER BY ash.created_at DESC;`,
      [applicationId]
    );
  },

  // Compare 2 to 4 candidates side-by-side
  compareApplications(orgId, applicationIds) {
    if (!Array.isArray(applicationIds) || applicationIds.length < 2 || applicationIds.length > 4) {
      throw new Error('Compare requires between 2 and 4 application IDs');
    }

    const comparisons = [];
    for (const appId of applicationIds) {
      const app = this.getApplicationById(orgId, appId);
      if (!app) continue;

      const breakdown = this.getMatchBreakdown(orgId, appId);
      const verifiedSkills = repository.query(
        `SELECT s.id, s.name, s.category, cs.proficiency
         FROM candidate_skills cs
         JOIN skills s ON s.id = cs.skill_id
         WHERE cs.candidate_id = ? AND cs.verification_status = 'verified';`,
        [app.candidate_id]
      );

      const projects = repository.query(
        `SELECT title, reference_url, metadata FROM skill_evidence
         WHERE candidate_id = ? AND evidence_type = 'project_repo';`,
        [app.candidate_id]
      );

      const assessments = repository.query(
        `SELECT ar.score, ar.passed, at.title as template_title
         FROM assessment_results ar
         JOIN assessment_templates at ON at.id = ar.template_id
         WHERE ar.candidate_id = ?;`,
        [app.candidate_id]
      );

      const certs = repository.query(
        `SELECT title, reference_url FROM skill_evidence
         WHERE candidate_id = ? AND evidence_type = 'certificate';`,
        [app.candidate_id]
      );

      const tags = repository.query(
        `SELECT tag, color FROM application_tags WHERE application_id = ?;`,
        [appId]
      );

      comparisons.push({
        applicationId: app.id,
        candidateId: app.candidate_id,
        candidateName: app.candidate_name,
        candidateAvatar: app.candidate_avatar,
        headline: app.headline,
        institution: app.institution || 'University',
        degree: app.degree,
        graduationYear: app.graduation_year,
        cgpa: app.cgpa,
        location: app.location,
        stage: app.stage,
        jobTitle: app.job_title,
        appliedAt: app.applied_at,
        daysInStage: Math.max(0, Math.floor((Date.now() - new Date(app.updated_at).getTime()) / (1000 * 60 * 60 * 24))),
        matchScore: app.match_score,
        breakdown,
        verifiedSkills,
        projects,
        assessments,
        certs,
        tags: tags.map(t => t.tag)
      });
    }

    return comparisons;
  },

  // Saved Views per recruiter
  getSavedViews(orgId, recruiterId) {
    const views = repository.query(
      `SELECT * FROM recruiter_saved_views WHERE org_id = ? AND recruiter_id = ? ORDER BY created_at DESC;`,
      [orgId, recruiterId]
    );
    return views.map(v => ({
      id: v.id,
      name: v.name,
      filters: JSON.parse(v.filters_json || '{}'),
      sort: JSON.parse(v.sort_json || '{}'),
      createdAt: v.created_at,
      updatedAt: v.updated_at
    }));
  },

  createSavedView(orgId, recruiterId, { name, filters, sort }) {
    if (!name || !name.trim()) throw new Error('Saved view name is required');
    const id = `rsv-${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();
    repository.execute(
      `INSERT INTO recruiter_saved_views (id, recruiter_id, org_id, name, filters_json, sort_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [id, recruiterId, orgId, name.trim(), JSON.stringify(filters || {}), JSON.stringify(sort || {}), now, now]
    );
    return { id, name: name.trim(), filters, sort, createdAt: now, updatedAt: now };
  },

  deleteSavedView(orgId, recruiterId, viewId) {
    repository.execute(
      `DELETE FROM recruiter_saved_views WHERE id = ? AND org_id = ? AND recruiter_id = ?;`,
      [viewId, orgId, recruiterId]
    );
    return { success: true, deletedId: viewId };
  }
};
