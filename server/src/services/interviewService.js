import { randomUUID as uuidv4 } from 'node:crypto';
import { repository } from '../data/repository.js';
import { notificationService } from './notificationService.js';
import { emailService } from './emailService.js';

export const interviewService = {
  getInterviews(orgId, { candidateId, jobId, status, limit = 50, offset = 0 } = {}) {
    let sql = `
      SELECT i.*,
             j.title as job_title, j.department as job_department,
             u.full_name as candidate_name, u.email as candidate_email, u.avatar_url as candidate_avatar,
             u_cre.full_name as created_by_name,
             (SELECT COUNT(*) FROM interview_feedback ifb WHERE ifb.interview_id = i.id) as feedback_count
      FROM interviews i
      JOIN jobs j ON j.id = i.job_id
      JOIN users u ON u.id = i.candidate_id
      JOIN users u_cre ON u_cre.id = i.created_by
      WHERE i.org_id = ?
    `;
    const params = [orgId];

    if (candidateId) {
      sql += ' AND i.candidate_id = ?';
      params.push(candidateId);
    }
    if (jobId) {
      sql += ' AND i.job_id = ?';
      params.push(jobId);
    }
    if (status && status !== 'all') {
      sql += ' AND i.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY i.scheduled_at ASC LIMIT ? OFFSET ?;';
    params.push(Number(limit), Number(offset));

    return repository.query(sql, params);
  },

  getInterviewById(orgId, interviewId) {
    const interview = repository.queryOne(
      `SELECT i.*,
              j.title as job_title, j.department as job_department,
              u.full_name as candidate_name, u.email as candidate_email, u.avatar_url as candidate_avatar,
              cp.headline, cp.target_role, cp.experience_years
       FROM interviews i
       JOIN jobs j ON j.id = i.job_id
       JOIN users u ON u.id = i.candidate_id
       JOIN candidate_profiles cp ON cp.id = u.id
       WHERE i.id = ? AND i.org_id = ?;`,
      [interviewId, orgId]
    );

    if (!interview) return null;

    const participants = repository.query(
      `SELECT ip.*, u.full_name, u.email, u.avatar_url
       FROM interview_participants ip
       JOIN users u ON u.id = ip.user_id
       WHERE ip.interview_id = ?;`,
      [interviewId]
    );

    const feedback = repository.query(
      `SELECT ifb.*, u.full_name as interviewer_name
       FROM interview_feedback ifb
       JOIN users u ON u.id = ifb.interviewer_id
       WHERE ifb.interview_id = ?;`,
      [interviewId]
    );

    return {
      ...interview,
      participants,
      feedback,
    };
  },

  scheduleInterview(orgId, createdBy, data) {
    const {
      jobId,
      candidateId,
      applicationId = null,
      title,
      interviewType = 'technical',
      scheduledAt,
      durationMinutes = 45,
      timezone = 'Asia/Kolkata',
      meetingLink = 'https://meet.google.com/sarathi-tech-eval',
      location = null,
      interviewerIds = []
    } = data;

    if (!jobId || !candidateId || !title || !scheduledAt) {
      throw new Error('Job, candidate, title, and scheduled time are required');
    }

    const id = `int-${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();

    const createdInterview = repository.transaction((repo) => {
      repo.execute(
        `INSERT INTO interviews (
          id, org_id, job_id, candidate_id, application_id, title,
          interview_type, scheduled_at, duration_minutes, timezone,
          meeting_link, location, status, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, ?);`,
        [
          id, orgId, jobId, candidateId, applicationId, title.trim(),
          interviewType, scheduledAt, Number(durationMinutes), timezone,
          meetingLink, location, createdBy, now, now
        ]
      );

      // Add participants
      for (const uid of interviewerIds) {
        repo.execute(
          `INSERT INTO interview_participants (id, interview_id, user_id, role, created_at)
           VALUES (?, ?, ?, 'interviewer', ?);`,
          [`ip-${uuidv4().slice(0, 8)}`, id, uid, now]
        );
      }

      // Add creator as participant if not already in list
      if (!interviewerIds.includes(createdBy)) {
        repo.execute(
          `INSERT INTO interview_participants (id, interview_id, user_id, role, created_at)
           VALUES (?, ?, ?, 'organizer', ?);`,
          [`ip-${uuidv4().slice(0, 8)}`, id, createdBy, now]
        );
      }

      // Audit event
      repo.execute(
        `INSERT INTO audit_events (
          id, org_id, actor_id, action, resource_type, resource_id, payload, created_at
        ) VALUES (?, ?, ?, 'interview.schedule', 'interviews', ?, ?, ?);`,
        [
          `ae-${uuidv4().slice(0, 8)}`,
          orgId,
          createdBy,
          id,
          JSON.stringify({ jobId, candidateId, scheduledAt, interviewType }),
          now
        ]
      );

      return this.getInterviewById(orgId, id);
    });

    // Notify candidate of scheduled interview (non-blocking)
    try {
      const job = repository.queryOne('SELECT title FROM jobs WHERE id = ?;', [jobId]);
      const candidate = repository.queryOne('SELECT full_name, email FROM users WHERE id = ?;', [candidateId]);
      const jobTitle = job?.title || 'the position';

      const scheduledDateStr = new Date(scheduledAt).toLocaleString('en-US', {
        timeZone: timezone || 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short'
      });
      const notifTitle = `Interview Scheduled: ${title}`;
      const notifBody = `An interview "${title}" (${interviewType}) has been scheduled for "${jobTitle}" on ${scheduledDateStr} (${timezone || 'Asia/Kolkata'}). Meeting details: ${meetingLink || location || 'Virtual'}.`;

      notificationService.createNotification({
        userId: candidateId,
        type: 'info',
        title: notifTitle,
        body: notifBody,
        link: '/student/interviews'
      });

      if (candidate?.email) {
        emailService.sendCandidateNotificationEmail({
          to: candidate.email,
          candidateName: candidate.full_name,
          title: notifTitle,
          body: notifBody,
          actionLink: meetingLink || '/student/interviews'
        }).catch(() => {});
      }
    } catch {
      // Notification failure must not disrupt core workflow
    }

    return createdInterview;
  },

  submitFeedback(orgId, interviewId, interviewerId, {
    technicalRating = 4,
    communicationRating = 4,
    overallRecommendation = 'hire',
    feedbackNotes,
    confidentialNotes = ''
  }) {
    if (!feedbackNotes || feedbackNotes.trim().length === 0) {
      throw new Error('Feedback notes are required');
    }

    const interview = repository.queryOne(
      'SELECT id FROM interviews WHERE id = ? AND org_id = ?;',
      [interviewId, orgId]
    );
    if (!interview) throw new Error('Interview not found');

    const now = new Date().toISOString();
    const id = `ifb-${uuidv4().slice(0, 8)}`;

    repository.transaction((repo) => {
      // Upsert feedback
      repo.execute(
        `INSERT INTO interview_feedback (
          id, interview_id, interviewer_id, technical_rating, communication_rating,
          overall_recommendation, feedback_notes, confidential_notes, submitted_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(interview_id, interviewer_id) DO UPDATE SET
          technical_rating = excluded.technical_rating,
          communication_rating = excluded.communication_rating,
          overall_recommendation = excluded.overall_recommendation,
          feedback_notes = excluded.feedback_notes,
          confidential_notes = excluded.confidential_notes,
          submitted_at = excluded.submitted_at;`,
        [
          id, interviewId, interviewerId, Number(technicalRating), Number(communicationRating),
          overallRecommendation, feedbackNotes.trim(), confidentialNotes?.trim() || null, now, now
        ]
      );

      // Mark interview as completed if feedback provided
      repo.execute(
        "UPDATE interviews SET status = 'completed', updated_at = ? WHERE id = ?;",
        [now, interviewId]
      );
    });

    return { success: true, interviewId, submittedAt: now };
  },

  cancelInterview(orgId, interviewId, reason = '') {
    const interview = repository.queryOne(
      `SELECT i.*, j.title as job_title, u.full_name as candidate_name, u.email as candidate_email
       FROM interviews i
       JOIN jobs j ON j.id = i.job_id
       JOIN users u ON u.id = i.candidate_id
       WHERE i.id = ? AND i.org_id = ?;`,
      [interviewId, orgId]
    );
    if (!interview) {
      throw new Error('Interview not found');
    }

    const now = new Date().toISOString();
    const cleanReason = reason?.trim() || 'Cancelled by recruiter';

    repository.transaction((repo) => {
      repo.execute(
        "UPDATE interviews SET status = 'cancelled', cancelled_reason = ?, updated_at = ? WHERE id = ? AND org_id = ?;",
        [cleanReason, now, interviewId, orgId]
      );

      repo.execute(
        `INSERT INTO audit_events (
          id, org_id, actor_id, action, resource_type, resource_id, payload, created_at
        ) VALUES (?, ?, NULL, 'interview.cancel', 'interviews', ?, ?, ?);`,
        [
          `ae-${uuidv4().slice(0, 8)}`,
          orgId,
          interviewId,
          JSON.stringify({ reason: cleanReason }),
          now
        ]
      );
    });

    try {
      const scheduledDateStr = new Date(interview.scheduled_at).toLocaleString('en-US', {
        timeZone: interview.timezone || 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short'
      });
      const notifTitle = `Interview Cancelled: ${interview.title}`;
      const notifBody = `Your scheduled interview for "${interview.job_title || 'the position'}" on ${scheduledDateStr} has been cancelled. Note: ${cleanReason}`;

      notificationService.createNotification({
        userId: interview.candidate_id,
        type: 'warning',
        title: notifTitle,
        body: notifBody,
        link: '/student/interviews'
      });

      if (interview.candidate_email) {
        emailService.sendCandidateNotificationEmail({
          to: interview.candidate_email,
          candidateName: interview.candidate_name,
          title: notifTitle,
          body: notifBody,
          actionLink: '/student/interviews'
        }).catch(() => {});
      }
    } catch {
      // Notification failure must not disrupt core workflow
    }

    return { success: true, id: interviewId, status: 'cancelled' };
  },

  rescheduleInterview(orgId, interviewId, data, actorId = null) {
    const {
      scheduledAt,
      durationMinutes,
      timezone,
      meetingLink,
      location,
      reason = ''
    } = data;

    if (!scheduledAt) {
      throw new Error('New scheduled time (scheduledAt) is required');
    }

    const interview = repository.queryOne(
      `SELECT i.*, j.title as job_title, u.full_name as candidate_name, u.email as candidate_email
       FROM interviews i
       JOIN jobs j ON j.id = i.job_id
       JOIN users u ON u.id = i.candidate_id
       WHERE i.id = ? AND i.org_id = ?;`,
      [interviewId, orgId]
    );
    if (!interview) {
      throw new Error('Interview not found');
    }

    const now = new Date().toISOString();
    const newTz = timezone || interview.timezone || 'Asia/Kolkata';
    const newLink = meetingLink !== undefined ? meetingLink : interview.meeting_link;
    const newLoc = location !== undefined ? location : interview.location;
    const newDuration = durationMinutes !== undefined ? Number(durationMinutes) : interview.duration_minutes;

    repository.transaction((repo) => {
      repo.execute(
        `UPDATE interviews SET
          scheduled_at = ?,
          duration_minutes = ?,
          timezone = ?,
          meeting_link = ?,
          location = ?,
          status = 'scheduled',
          updated_at = ?
        WHERE id = ? AND org_id = ?;`,
        [scheduledAt, newDuration, newTz, newLink, newLoc, now, interviewId, orgId]
      );

      repo.execute(
        `INSERT INTO audit_events (
          id, org_id, actor_id, action, resource_type, resource_id, payload, created_at
        ) VALUES (?, ?, ?, 'interview.reschedule', 'interviews', ?, ?, ?);`,
        [
          `ae-${uuidv4().slice(0, 8)}`,
          orgId,
          actorId,
          interviewId,
          JSON.stringify({
            previousScheduledAt: interview.scheduled_at,
            newScheduledAt: scheduledAt,
            reason: reason?.trim() || null
          }),
          now
        ]
      );
    });

    try {
      const scheduledDateStr = new Date(scheduledAt).toLocaleString('en-US', {
        timeZone: newTz,
        dateStyle: 'medium',
        timeStyle: 'short'
      });
      const notifTitle = `Interview Rescheduled: ${interview.title}`;
      const notifBody = `Your interview for "${interview.job_title || 'the position'}" has been rescheduled to ${scheduledDateStr} (${newTz}). Meeting link / location: ${newLink || newLoc || 'Virtual'}.${reason?.trim() ? ` Note: ${reason.trim()}` : ''}`;

      notificationService.createNotification({
        userId: interview.candidate_id,
        type: 'info',
        title: notifTitle,
        body: notifBody,
        link: '/student/interviews'
      });

      if (interview.candidate_email) {
        emailService.sendCandidateNotificationEmail({
          to: interview.candidate_email,
          candidateName: interview.candidate_name,
          title: notifTitle,
          body: notifBody,
          actionLink: newLink || '/student/interviews'
        }).catch(() => {});
      }
    } catch {
      // Notification failure must not disrupt core workflow
    }

    return this.getInterviewById(orgId, interviewId);
  }
};
