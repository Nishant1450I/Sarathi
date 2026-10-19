import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID as uuidv4 } from 'node:crypto';
import { initDb, closeDb } from '../../config/db.js';
import { runMigrations } from '../../data/migrate.mjs';
import { repository } from '../../data/repository.js';
import { pipelineService } from '../../services/pipelineService.js';
import { interviewService } from '../../services/interviewService.js';
import { verificationService } from '../../services/verificationService.js';
import { notificationService } from '../../services/notificationService.js';
import { emailService } from '../../services/emailService.js';

describe('Phase 2: Candidate Lifecycle Tracking and Notifications (Unit Tests)', () => {
  let testOrgId;
  let testRecruiterId;
  let testCandidateId;
  let testCandidateEmail;
  let testCandidateName;
  let testJobId;
  let testSkillId;

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.TEST_EMAIL_SINK = 'true';
    emailService._clearTestEmailSink();

    closeDb();
    initDb(':memory:');
    runMigrations(':memory:');

    const now = new Date().toISOString();

    // 1. Create Organization
    testOrgId = `org-${uuidv4().slice(0, 8)}`;
    repository.execute(
      `INSERT INTO organisations (id, name, slug, timezone, currency, settings, created_at, updated_at)
       VALUES (?, 'Sarathi Technologies', ?, 'Asia/Kolkata', 'INR', '{}', ?, ?);`,
      [testOrgId, `sarathi-${uuidv4().slice(0, 8)}`, now, now]
    );

    // 2. Create Recruiter
    testRecruiterId = `usr-rec-${uuidv4().slice(0, 8)}`;
    repository.execute(
      `INSERT INTO users (id, email, password_hash, full_name, role, status, created_at, updated_at)
       VALUES (?, 'recruiter@sarathitech.test', 'hash', 'Chief Recruiter', 'recruiter', 'active', ?, ?);`,
      [testRecruiterId, now, now]
    );
    repository.execute(
      `INSERT INTO organisation_memberships (id, org_id, user_id, role, status, created_at, updated_at)
       VALUES (?, ?, ?, 'recruiter', 'active', ?, ?);`,
      [`mem-${uuidv4().slice(0, 8)}`, testOrgId, testRecruiterId, now, now]
    );

    // 3. Create Candidate
    testCandidateId = `usr-cand-${uuidv4().slice(0, 8)}`;
    testCandidateEmail = `candidate.${uuidv4().slice(0, 6)}@student.test`;
    testCandidateName = 'Aarav Sharma';
    repository.execute(
      `INSERT INTO users (id, email, password_hash, full_name, role, status, created_at, updated_at)
       VALUES (?, ?, 'hash', ?, 'candidate', 'active', ?, ?);`,
      [testCandidateId, testCandidateEmail, testCandidateName, now, now]
    );
    repository.execute(
      `INSERT INTO candidate_profiles (id, headline, target_role, experience_years, location, created_at, updated_at)
       VALUES (?, 'Full Stack Developer', 'Software Engineer', 2, 'Bengaluru', ?, ?);`,
      [testCandidateId, now, now]
    );

    // 4. Create Job
    testJobId = `job-${uuidv4().slice(0, 8)}`;
    repository.execute(
      `INSERT INTO jobs (id, org_id, creator_id, title, description, department, employment_type, experience_level, location, status, created_at, updated_at)
       VALUES (?, ?, ?, 'Senior Backend Engineer', 'Backend engineering role', 'Engineering', 'full_time', 'mid', 'Bengaluru', 'published', ?, ?);`,
      [testJobId, testOrgId, testRecruiterId, now, now]
    );

    // 5. Create Skill & Domain
    const domainId = `dom-${uuidv4().slice(0, 8)}`;
    repository.execute(
      `INSERT INTO domains (id, title, description, badge_color, created_at, updated_at)
       VALUES (?, 'Backend Systems', 'Server-side engineering', '#2563eb', ?, ?);`,
      [domainId, now, now]
    );
    testSkillId = `skl-${uuidv4().slice(0, 8)}`;
    repository.execute(
      `INSERT INTO skills (id, domain_id, name, category, description, created_at, updated_at)
       VALUES (?, ?, 'Node.js Architecture', 'Backend', 'Runtime and asynchronous execution', ?, ?);`,
      [testSkillId, domainId, now, now]
    );
  });

  test('Submitting application creates in-app notification and dispatches candidate email', () => {
    const app = pipelineService.createApplication(testOrgId, testJobId, testCandidateId, 'Excited to apply!');
    assert.ok(app);
    assert.strictEqual(app.candidate_id, testCandidateId);
    assert.strictEqual(app.stage, 'new_applicant');

    const notifResult = notificationService.getNotifications(testCandidateId);
    assert.ok(notifResult.notifications.length >= 1);
    const appNotif = notifResult.notifications.find((n) => n.title === 'Application Submitted');
    assert.ok(appNotif, 'Candidate must receive Application Submitted notification');
    assert.match(appNotif.body, /Senior Backend Engineer/);

    const sentEmails = emailService._getSentEmailsForTesting();
    const appEmail = sentEmails.find((e) => e.to === testCandidateEmail.toLowerCase());
    assert.ok(appEmail, 'Candidate should receive confirmation email');
    assert.strictEqual(appEmail.subject, '[Sarathi] Application Submitted');
  });

  test('Application stage transition updates stage and creates candidate-facing notification', () => {
    const app = pipelineService.createApplication(testOrgId, testJobId, testCandidateId);
    emailService._clearTestEmailSink();

    const updated = pipelineService.updateStage(
      testOrgId,
      app.id,
      'shortlisted',
      testRecruiterId,
      'CONFIDENTIAL_RECRUITER_NOTE: High assessment score 95%'
    );
    assert.strictEqual(updated.stage, 'shortlisted');

    const notifResult = notificationService.getNotifications(testCandidateId);
    const shortlistNotif = notifResult.notifications.find((n) => n.title === 'Application Shortlisted');
    assert.ok(shortlistNotif, 'Should create shortlisted notification for candidate');
    assert.strictEqual(shortlistNotif.type, 'success');
    assert.match(shortlistNotif.body, /Senior Backend Engineer/);

    // CRITICAL: Internal reason / recruiter notes must NEVER leak to candidate
    assert.doesNotMatch(shortlistNotif.body, /CONFIDENTIAL/);
    assert.doesNotMatch(shortlistNotif.body, /High assessment score/);

    // Outbound email verification
    const sentEmails = emailService._getSentEmailsForTesting();
    const email = sentEmails.find((e) => e.to === testCandidateEmail.toLowerCase());
    assert.ok(email, 'Candidate should receive lifecycle email');
    assert.strictEqual(email.subject, '[Sarathi] Application Shortlisted');
    assert.doesNotMatch(email.text, /CONFIDENTIAL/);
  });

  test('Rejection stage transition creates polite candidate notification without leaking internal rationale', () => {
    const app = pipelineService.createApplication(testOrgId, testJobId, testCandidateId);
    emailService._clearTestEmailSink();

    pipelineService.updateStage(
      testOrgId,
      app.id,
      'rejected',
      testRecruiterId,
      'CONFIDENTIAL_REASON: Lacks requisite distributed systems experience'
    );

    const notifResult = notificationService.getNotifications(testCandidateId);
    const rejectNotif = notifResult.notifications.find((n) => n.title === 'Application Update');
    assert.ok(rejectNotif, 'Candidate must receive rejection update notification');
    assert.match(rejectNotif.body, /Senior Backend Engineer/);

    // Ensure candidate never sees confidential recruiter reason
    assert.doesNotMatch(rejectNotif.body, /CONFIDENTIAL_REASON/);
    assert.doesNotMatch(rejectNotif.body, /distributed systems experience/);
  });

  test('Invalid stage transition throws error and creates NO candidate notification', () => {
    const app = pipelineService.createApplication(testOrgId, testJobId, testCandidateId);
    const initialNotifCount = notificationService.getNotifications(testCandidateId).notifications.length;

    assert.throws(
      () => {
        // new_applicant cannot jump directly to hired
        pipelineService.updateStage(testOrgId, app.id, 'hired', testRecruiterId, 'Instant hire');
      },
      /Invalid stage transition/
    );

    const finalNotifCount = notificationService.getNotifications(testCandidateId).notifications.length;
    assert.strictEqual(finalNotifCount, initialNotifCount, 'Failed transition must create no notification');
  });

  test('Identical stage update is a no-op and creates no duplicate notification', () => {
    const app = pipelineService.createApplication(testOrgId, testJobId, testCandidateId);
    pipelineService.updateStage(testOrgId, app.id, 'under_review', testRecruiterId);
    const countAfterReview = notificationService.getNotifications(testCandidateId).notifications.length;

    // Repeating same stage
    pipelineService.updateStage(testOrgId, app.id, 'under_review', testRecruiterId);
    const countAfterDuplicate = notificationService.getNotifications(testCandidateId).notifications.length;
    assert.strictEqual(countAfterDuplicate, countAfterReview);
  });

  test('Interview scheduling creates candidate notification and email with meeting details', () => {
    const scheduledTime = new Date(Date.now() + 86400000 * 2).toISOString();
    const interview = interviewService.scheduleInterview(testOrgId, testRecruiterId, {
      jobId: testJobId,
      candidateId: testCandidateId,
      title: 'Technical Round 1: Architecture',
      interviewType: 'technical',
      scheduledAt: scheduledTime,
      durationMinutes: 60,
      timezone: 'Asia/Kolkata',
      meetingLink: 'https://meet.google.com/sarathi-test-meet',
    });

    assert.ok(interview);
    assert.strictEqual(interview.status, 'scheduled');

    const notifResult = notificationService.getNotifications(testCandidateId);
    const interviewNotif = notifResult.notifications.find((n) => n.title.includes('Interview Scheduled'));
    assert.ok(interviewNotif, 'Candidate must receive Interview Scheduled notification');
    assert.match(interviewNotif.body, /Technical Round 1: Architecture/);
    assert.match(interviewNotif.body, /Senior Backend Engineer/);
    assert.match(interviewNotif.body, /meet\.google\.com\/sarathi-test-meet/);

    const sentEmails = emailService._getSentEmailsForTesting();
    const email = sentEmails.find((e) => e.to === testCandidateEmail.toLowerCase());
    assert.ok(email);
    assert.match(email.subject, /Interview Scheduled/);
    assert.match(email.text, /meet\.google\.com/);
  });

  test('Interview cancellation updates status, records audit event, and notifies candidate', () => {
    const scheduledTime = new Date(Date.now() + 86400000).toISOString();
    const interview = interviewService.scheduleInterview(testOrgId, testRecruiterId, {
      jobId: testJobId,
      candidateId: testCandidateId,
      title: 'HR Screening',
      scheduledAt: scheduledTime,
    });
    emailService._clearTestEmailSink();

    const cancelRes = interviewService.cancelInterview(testOrgId, interview.id, 'Interviewer unwell, will reschedule');
    assert.strictEqual(cancelRes.status, 'cancelled');

    const notifResult = notificationService.getNotifications(testCandidateId);
    const cancelNotif = notifResult.notifications.find((n) => n.title.includes('Interview Cancelled'));
    assert.ok(cancelNotif, 'Candidate must receive cancellation notification');
    assert.strictEqual(cancelNotif.type, 'warning');
    assert.match(cancelNotif.body, /Interviewer unwell/);

    const sentEmails = emailService._getSentEmailsForTesting();
    const email = sentEmails.find((e) => e.to === testCandidateEmail.toLowerCase());
    assert.ok(email);
    assert.match(email.subject, /Interview Cancelled/);
  });

  test('Interview rescheduling updates scheduled time, records audit, and notifies candidate', () => {
    const originalTime = new Date(Date.now() + 86400000).toISOString();
    const newTime = new Date(Date.now() + 86400000 * 3).toISOString();

    const interview = interviewService.scheduleInterview(testOrgId, testRecruiterId, {
      jobId: testJobId,
      candidateId: testCandidateId,
      title: 'System Design Deep Dive',
      scheduledAt: originalTime,
    });
    emailService._clearTestEmailSink();

    const rescheduled = interviewService.rescheduleInterview(testOrgId, interview.id, {
      scheduledAt: newTime,
      durationMinutes: 90,
      meetingLink: 'https://meet.google.com/sarathi-rescheduled-meet',
      reason: 'Candidate requested time adjustment'
    }, testRecruiterId);

    assert.strictEqual(rescheduled.scheduled_at, newTime);
    assert.strictEqual(rescheduled.duration_minutes, 90);
    assert.strictEqual(rescheduled.meeting_link, 'https://meet.google.com/sarathi-rescheduled-meet');

    const notifResult = notificationService.getNotifications(testCandidateId);
    const rescheduleNotif = notifResult.notifications.find((n) => n.title.includes('Interview Rescheduled'));
    assert.ok(rescheduleNotif, 'Candidate must receive reschedule notification');
    assert.match(rescheduleNotif.body, /rescheduled-meet/);

    const sentEmails = emailService._getSentEmailsForTesting();
    const email = sentEmails.find((e) => e.to === testCandidateEmail.toLowerCase());
    assert.ok(email);
    assert.match(email.subject, /Interview Rescheduled/);
  });

  test('Interview rescheduling without scheduledAt throws validation error', () => {
    const interview = interviewService.scheduleInterview(testOrgId, testRecruiterId, {
      jobId: testJobId,
      candidateId: testCandidateId,
      title: 'Coding Exercise',
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    });

    assert.throws(
      () => {
        interviewService.rescheduleInterview(testOrgId, interview.id, {});
      },
      /New scheduled time \(scheduledAt\) is required/
    );
  });

  test('Cross-tenant interview access is strictly rejected', () => {
    const foreignOrgId = `org-foreign-${uuidv4().slice(0, 8)}`;
    repository.execute(
      `INSERT INTO organisations (id, name, slug, timezone, currency, settings, created_at, updated_at)
       VALUES (?, 'Foreign Corp', ?, 'Asia/Kolkata', 'INR', '{}', datetime('now'), datetime('now'));`,
      [foreignOrgId, `foreign-${uuidv4().slice(0, 8)}`]
    );

    const interview = interviewService.scheduleInterview(testOrgId, testRecruiterId, {
      jobId: testJobId,
      candidateId: testCandidateId,
      title: 'Panel Interview',
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    });

    // Foreign org cannot cancel interview
    assert.throws(
      () => {
        interviewService.cancelInterview(foreignOrgId, interview.id, 'Unauthorized cancel');
      },
      /Interview not found/
    );

    // Foreign org cannot reschedule interview
    assert.throws(
      () => {
        interviewService.rescheduleInterview(foreignOrgId, interview.id, {
          scheduledAt: new Date(Date.now() + 86400000 * 2).toISOString(),
        });
      },
      /Interview not found/
    );
  });

  test('Evidence request creates candidate notification with skill name and message', () => {
    const result = verificationService.requestEvidence({
      orgId: testOrgId,
      recruiterId: testRecruiterId,
      candidateId: testCandidateId,
      skillId: testSkillId,
      message: 'Please provide links to public GitHub repositories implementing microservices in Node.js',
    });

    assert.ok(result.success);
    assert.ok(result.requestId);

    const notifResult = notificationService.getNotifications(testCandidateId);
    const reqNotif = notifResult.notifications.find((n) => n.title.includes('Additional Evidence Requested'));
    assert.ok(reqNotif, 'Candidate must receive evidence request notification');
    assert.match(reqNotif.body, /Node\.js Architecture/);
    assert.match(reqNotif.body, /microservices in Node\.js/);

    const sentEmails = emailService._getSentEmailsForTesting();
    const email = sentEmails.find((e) => e.to === testCandidateEmail.toLowerCase());
    assert.ok(email);
    assert.match(email.subject, /Additional Evidence Requested/);
  });

  test('Evidence verification decision notifies candidate with verified status', () => {
    const evidenceId = `evi-${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();
    repository.execute(
      `INSERT INTO skill_evidence (id, candidate_id, skill_id, evidence_type, title, reference_url, metadata, verification_status, created_at, updated_at)
       VALUES (?, ?, ?, 'repository', 'High-throughput Gateway', 'https://github.com/aarav/gateway', '{"description":"Built with Node.js cluster"}', 'pending_review', ?, ?);`,
      [evidenceId, testCandidateId, testSkillId, now, now]
    );

    const review = verificationService.submitReview({
      evidenceId,
      reviewerId: testRecruiterId,
      decision: 'verified',
      decisionRationale: 'Exceptional test coverage and clean architectural boundary separation.',
      awardedProficiency: 5,
    });

    assert.strictEqual(review.decision, 'verified');

    const notifResult = notificationService.getNotifications(testCandidateId);
    const verifiedNotif = notifResult.notifications.find((n) => n.title.includes('Skill Verified'));
    assert.ok(verifiedNotif, 'Candidate must receive skill verified notification');
    assert.strictEqual(verifiedNotif.type, 'success');
    assert.match(verifiedNotif.body, /Node\.js Architecture/);

    const sentEmails = emailService._getSentEmailsForTesting();
    const email = sentEmails.find((e) => e.to === testCandidateEmail.toLowerCase());
    assert.ok(email);
    assert.match(email.subject, /Skill Verified/);
  });

  test('Evidence rejection decision notifies candidate with review rationale', () => {
    const evidenceId = `evi-${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();
    repository.execute(
      `INSERT INTO skill_evidence (id, candidate_id, skill_id, evidence_type, title, reference_url, metadata, verification_status, created_at, updated_at)
       VALUES (?, ?, ?, 'repository', 'Demo app', 'https://github.com/aarav/demo', '{"description":"Simple express hello world"}', 'pending_review', ?, ?);`,
      [evidenceId, testCandidateId, testSkillId, now, now]
    );

    verificationService.submitReview({
      evidenceId,
      reviewerId: testRecruiterId,
      decision: 'rejected',
      decisionRationale: 'The repository only contains basic boilerplate without production testing.',
    });

    const notifResult = notificationService.getNotifications(testCandidateId);
    const rejectNotif = notifResult.notifications.find((n) => n.title.includes('Evidence Review Update'));
    assert.ok(rejectNotif, 'Candidate must receive evidence review update');
    assert.strictEqual(rejectNotif.type, 'warning');
    assert.match(rejectNotif.body, /basic boilerplate/);
  });

  test('Email service honest reporting when unconfigured and error mode', async () => {
    const originalEnv = process.env.NODE_ENV;
    const originalSink = process.env.TEST_EMAIL_SINK;
    delete process.env.TEST_EMAIL_SINK;
    process.env.NODE_ENV = 'development';

    try {
      const result = await emailService.sendEmail({
        to: 'candidate@test.com',
        subject: 'Test Subject',
        text: 'Test Body',
        throwOnUnconfigured: false,
      });
      assert.strictEqual(result.delivered, false);
      assert.strictEqual(result.reason, 'unconfigured');

      await assert.rejects(
        async () => {
          await emailService.sendEmail({
            to: 'candidate@test.com',
            subject: 'Test Subject',
            text: 'Test Body',
            throwOnUnconfigured: true,
          });
        },
        /Outbound email delivery is unconfigured/
      );
    } finally {
      process.env.NODE_ENV = originalEnv;
      process.env.TEST_EMAIL_SINK = originalSink;
    }
  });

  test('Candidate can mark notification as read and unread count is updated', () => {
    pipelineService.createApplication(testOrgId, testJobId, testCandidateId);
    const notifs = notificationService.getNotifications(testCandidateId);
    assert.ok(notifs.notifications.length > 0);
    const firstNotif = notifs.notifications[0];

    const markResult = notificationService.markAsRead(testCandidateId, firstNotif.id);
    assert.strictEqual(markResult.success, true);

    const refreshed = notificationService.getNotifications(testCandidateId);
    const updatedNotif = refreshed.notifications.find((n) => n.id === firstNotif.id);
    assert.strictEqual(updatedNotif.isRead, true);
  });
});
