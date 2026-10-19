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
  getApplications(orgId, { jobId = null, stage = null, search = null, limit = 50, offset = 0 } = {}) {
    let sql = `
      SELECT a.*,
             j.title as job_title, j.department as job_department,
             u.full_name as candidate_name, u.email as candidate_email, u.avatar_url as candidate_avatar,
             cp.headline, cp.target_role, cp.experience_years, cp.location,
             (SELECT COUNT(*) FROM candidate_skills cs WHERE cs.candidate_id = u.id AND cs.verification_status = 'verified') as verified_skill_count,
             (SELECT COUNT(*) FROM interviews i WHERE i.application_id = a.id AND i.status = 'scheduled') as scheduled_interviews_count
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
      sql += ' AND a.stage = ?';
      params.push(stage);
    }
    if (search) {
      sql += ' AND (u.full_name LIKE ? OR j.title LIKE ? OR cp.headline LIKE ?)';
      const q = `%${search}%`;
      params.push(q, q, q);
    }

    sql += ' ORDER BY a.updated_at DESC LIMIT ? OFFSET ?;';
    params.push(Number(limit), Number(offset));

    return repository.query(sql, params);
  },

  getApplicationById(orgId, applicationId) {
    const app = repository.queryOne(
      `SELECT a.*,
              j.title as job_title, j.department as job_department,
              u.full_name as candidate_name, u.email as candidate_email, u.avatar_url as candidate_avatar,
              cp.headline, cp.target_role, cp.experience_years, cp.location, cp.github_url, cp.portfolio_url
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
      `SELECT ash.*, u.full_name as changed_by_name
       FROM application_stage_history ash
       JOIN users u ON u.id = ash.changed_by
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

    return {
      ...app,
      stageHistory,
      notes,
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
  }
};
