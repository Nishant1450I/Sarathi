import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID as uuidv4 } from 'node:crypto';
import app from '../../index.js';
import { initDb, closeDb } from '../../config/db.js';
import { runMigrations } from '../../data/migrate.mjs';
import { repository } from '../../data/repository.js';
import { authService } from '../../services/authService.js';
import { emailService } from '../../services/emailService.js';

describe('Phase 2: Candidate Lifecycle Tracking & Notifications (E2E Integration)', () => {
  let serverInstance;
  let baseUrl;
  let testOrgId;
  let foreignOrgId;
  let recruiterUser;
  let recruiterToken;
  let candidateUser;
  let candidateToken;
  let intruderUser;
  let intruderToken;
  let testJobId;
  let testSkillId;
  let applicationId;
  let interviewId;
  let evidenceId;

  before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.TEST_EMAIL_SINK = 'true';
    emailService._clearTestEmailSink();

    closeDb();
    initDb(':memory:');
    runMigrations(':memory:');

    const now = new Date().toISOString();

    // 1. Create main organisation
    testOrgId = `org-main-${uuidv4().slice(0, 8)}`;
    repository.execute(
      `INSERT INTO organisations (id, name, slug, timezone, currency, settings, created_at, updated_at)
       VALUES (?, 'Innovate Tech Labs', ?, 'Asia/Kolkata', 'INR', '{}', ?, ?);`,
      [testOrgId, `innovate-${uuidv4().slice(0, 8)}`, now, now]
    );

    // 2. Create foreign organisation for multi-tenant tests
    foreignOrgId = `org-foreign-${uuidv4().slice(0, 8)}`;
    repository.execute(
      `INSERT INTO organisations (id, name, slug, timezone, currency, settings, created_at, updated_at)
       VALUES (?, 'Foreign Ventures', ?, 'Asia/Kolkata', 'INR', '{}', ?, ?);`,
      [foreignOrgId, `foreign-${uuidv4().slice(0, 8)}`, now, now]
    );

    // 3. Create recruiter
    recruiterUser = {
      id: `usr-rec-${uuidv4().slice(0, 8)}`,
      email: `talent.partner-${uuidv4().slice(0, 6)}@innovatetech.test`,
      full_name: 'Senior Recruiter Sarah',
      role: 'recruiter',
      status: 'active',
    };
    repository.execute(
      `INSERT INTO users (id, email, password_hash, full_name, role, status, created_at, updated_at)
       VALUES (?, ?, 'hash', ?, ?, ?, ?, ?);`,
      [recruiterUser.id, recruiterUser.email, recruiterUser.full_name, recruiterUser.role, recruiterUser.status, now, now]
    );
    repository.execute(
      `INSERT INTO organisation_memberships (id, org_id, user_id, role, status, created_at, updated_at)
       VALUES (?, ?, ?, 'recruiter', 'active', ?, ?);`,
      [`mem-${uuidv4().slice(0, 8)}`, testOrgId, recruiterUser.id, now, now]
    );
    recruiterToken = authService.generateToken(recruiterUser, testOrgId, 'recruiter');

    // 4. Create foreign intruder recruiter
    intruderUser = {
      id: `usr-intruder-${uuidv4().slice(0, 8)}`,
      email: `intruder-${uuidv4().slice(0, 6)}@foreignventures.test`,
      full_name: 'Foreign Recruiter Frank',
      role: 'recruiter',
      status: 'active',
    };
    repository.execute(
      `INSERT INTO users (id, email, password_hash, full_name, role, status, created_at, updated_at)
       VALUES (?, ?, 'hash', ?, ?, ?, ?, ?);`,
      [intruderUser.id, intruderUser.email, intruderUser.full_name, intruderUser.role, intruderUser.status, now, now]
    );
    repository.execute(
      `INSERT INTO organisation_memberships (id, org_id, user_id, role, status, created_at, updated_at)
       VALUES (?, ?, ?, 'recruiter', 'active', ?, ?);`,
      [`mem-${uuidv4().slice(0, 8)}`, foreignOrgId, intruderUser.id, now, now]
    );
    intruderToken = authService.generateToken(intruderUser, foreignOrgId, 'recruiter');

    // 5. Create student candidate
    candidateUser = {
      id: `usr-cand-${uuidv4().slice(0, 8)}`,
      email: `candidate.priya-${uuidv4().slice(0, 6)}@student.test`,
      full_name: 'Priya Patel',
      role: 'candidate',
      status: 'active',
    };
    repository.execute(
      `INSERT INTO users (id, email, password_hash, full_name, role, status, created_at, updated_at)
       VALUES (?, ?, 'hash', ?, ?, ?, ?, ?);`,
      [candidateUser.id, candidateUser.email, candidateUser.full_name, candidateUser.role, candidateUser.status, now, now]
    );
    repository.execute(
      `INSERT INTO candidate_profiles (id, headline, target_role, experience_years, location, created_at, updated_at)
       VALUES (?, 'Backend Systems Engineer', 'Software Engineer', 1.5, 'Bengaluru', ?, ?);`,
      [candidateUser.id, now, now]
    );
    candidateToken = authService.generateToken(candidateUser, null, null);

    // 6. Create Job in testOrgId
    testJobId = `job-${uuidv4().slice(0, 8)}`;
    repository.execute(
      `INSERT INTO jobs (id, org_id, creator_id, title, description, department, employment_type, experience_level, location, status, created_at, updated_at)
       VALUES (?, ?, ?, 'Platform Infrastructure Engineer', 'Distributed backend systems and cloud platforms.', 'Platform', 'full_time', 'mid', 'Bengaluru', 'published', ?, ?);`,
      [testJobId, testOrgId, recruiterUser.id, now, now]
    );

    // 7. Create Domain and Skill
    const domainId = `dom-${uuidv4().slice(0, 8)}`;
    repository.execute(
      `INSERT INTO domains (id, title, description, badge_color, created_at, updated_at)
       VALUES (?, 'Cloud Infrastructure', 'Cloud platforms and microservices', '#10b981', ?, ?);`,
      [domainId, now, now]
    );
    testSkillId = `skl-${uuidv4().slice(0, 8)}`;
    repository.execute(
      `INSERT INTO skills (id, domain_id, name, category, description, created_at, updated_at)
       VALUES (?, ?, 'Kubernetes & Containerization', 'DevOps', 'Orchestration and cluster operations', ?, ?);`,
      [testSkillId, domainId, now, now]
    );

    // 8. Spin up ephemeral HTTP server
    await new Promise((resolve) => {
      serverInstance = app.listen(0, '127.0.0.1', () => {
        const port = serverInstance.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (serverInstance) {
      await new Promise((resolve) => serverInstance.close(resolve));
    }
  });

  test('Step 1: Candidate submits application via POST /api/pipeline/apply', async () => {
    const res = await fetch(`${baseUrl}/api/pipeline/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${candidateToken}`,
      },
      body: JSON.stringify({
        jobId: testJobId,
        coverNote: 'I have deep hands-on experience deploying Kubernetes clusters.',
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.id);
    applicationId = body.data.id;

    // Verify candidate received in-app notification
    const notifs = repository.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC;',
      [candidateUser.id]
    );
    const appNotif = notifs.find((n) => n.title === 'Application Submitted');
    assert.ok(appNotif, 'Candidate must have Application Submitted notification');
    assert.match(appNotif.body, /Platform Infrastructure Engineer/);

    // Verify email delivery in test sink
    const sentEmails = emailService._getSentEmailsForTesting();
    const appEmail = sentEmails.find((e) => e.to === candidateUser.email.toLowerCase());
    assert.ok(appEmail, 'Candidate must receive submission confirmation email');
    assert.strictEqual(appEmail.subject, '[Sarathi] Application Submitted');
  });

  test('Step 2: Recruiter advances application stage via PATCH /api/pipeline/applications/:id/stage', async () => {
    emailService._clearTestEmailSink();

    const res = await fetch(`${baseUrl}/api/pipeline/applications/${applicationId}/stage`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${recruiterToken}`,
      },
      body: JSON.stringify({
        stage: 'shortlisted',
        reason: 'INTERNAL NOTE: Verified strong GitHub commits to open-source K8s controllers',
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.stage, 'shortlisted');

    // Candidate notification verification
    const notifs = repository.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC;',
      [candidateUser.id]
    );
    const shortlistNotif = notifs.find((n) => n.title === 'Application Shortlisted');
    assert.ok(shortlistNotif, 'Candidate must have Application Shortlisted notification');
    assert.strictEqual(shortlistNotif.type, 'success');
    assert.match(shortlistNotif.body, /Platform Infrastructure Engineer/);

    // CRITICAL: Recruiter internal reason must NOT appear in candidate notification
    assert.doesNotMatch(shortlistNotif.body, /INTERNAL NOTE/);
    assert.doesNotMatch(shortlistNotif.body, /K8s controllers/);

    // Email verification
    const sentEmails = emailService._getSentEmailsForTesting();
    const email = sentEmails.find((e) => e.to === candidateUser.email.toLowerCase());
    assert.ok(email);
    assert.strictEqual(email.subject, '[Sarathi] Application Shortlisted');
    assert.doesNotMatch(email.text, /INTERNAL NOTE/);
  });

  test('Step 3: Recruiter schedules interview via POST /api/interviews', async () => {
    emailService._clearTestEmailSink();
    const scheduledTime = new Date(Date.now() + 86400000 * 2).toISOString();

    const res = await fetch(`${baseUrl}/api/interviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${recruiterToken}`,
      },
      body: JSON.stringify({
        jobId: testJobId,
        candidateId: candidateUser.id,
        applicationId,
        title: 'Cluster Operations Technical Interview',
        interviewType: 'technical',
        scheduledAt: scheduledTime,
        durationMinutes: 60,
        timezone: 'Asia/Kolkata',
        meetingLink: 'https://meet.google.com/sarathi-live-eval',
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.ok(body.id);
    interviewId = body.id;
    assert.strictEqual(body.status, 'scheduled');

    // Candidate notification verification
    const notifs = repository.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC;',
      [candidateUser.id]
    );
    const interviewNotif = notifs.find((n) => n.title.includes('Interview Scheduled'));
    assert.ok(interviewNotif, 'Candidate must receive interview scheduled notification');
    assert.match(interviewNotif.body, /Cluster Operations Technical Interview/);
    assert.match(interviewNotif.body, /meet\.google\.com\/sarathi-live-eval/);

    const sentEmails = emailService._getSentEmailsForTesting();
    const email = sentEmails.find((e) => e.to === candidateUser.email.toLowerCase());
    assert.ok(email);
    assert.match(email.subject, /Interview Scheduled/);
  });

  test('Step 4: Recruiter reschedules interview via PATCH /api/interviews/:id/reschedule', async () => {
    emailService._clearTestEmailSink();
    const newScheduledTime = new Date(Date.now() + 86400000 * 4).toISOString();

    const res = await fetch(`${baseUrl}/api/interviews/${interviewId}/reschedule`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${recruiterToken}`,
      },
      body: JSON.stringify({
        scheduledAt: newScheduledTime,
        durationMinutes: 75,
        meetingLink: 'https://meet.google.com/sarathi-rescheduled-eval',
        reason: 'Adjusting schedule per candidate request',
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.scheduled_at, newScheduledTime);
    assert.strictEqual(body.duration_minutes, 75);

    // Candidate notification verification
    const notifs = repository.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC;',
      [candidateUser.id]
    );
    const reschedNotif = notifs.find((n) => n.title.includes('Interview Rescheduled'));
    assert.ok(reschedNotif, 'Candidate must receive interview rescheduled notification');
    assert.match(reschedNotif.body, /rescheduled-eval/);

    const sentEmails = emailService._getSentEmailsForTesting();
    const email = sentEmails.find((e) => e.to === candidateUser.email.toLowerCase());
    assert.ok(email);
    assert.match(email.subject, /Interview Rescheduled/);
  });

  test('Step 5: Recruiter cancels interview via PATCH /api/interviews/:id/cancel', async () => {
    emailService._clearTestEmailSink();

    const res = await fetch(`${baseUrl}/api/interviews/${interviewId}/cancel`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${recruiterToken}`,
      },
      body: JSON.stringify({
        reason: 'Candidate advanced to final round without separate screening',
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, 'cancelled');

    // Candidate notification verification
    const notifs = repository.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC;',
      [candidateUser.id]
    );
    const cancelNotif = notifs.find((n) => n.title.includes('Interview Cancelled'));
    assert.ok(cancelNotif, 'Candidate must receive interview cancellation notification');
    assert.strictEqual(cancelNotif.type, 'warning');

    const sentEmails = emailService._getSentEmailsForTesting();
    const email = sentEmails.find((e) => e.to === candidateUser.email.toLowerCase());
    assert.ok(email);
    assert.match(email.subject, /Interview Cancelled/);
  });

  test('Step 6: Recruiter requests skill evidence via POST /api/verifications/request', async () => {
    emailService._clearTestEmailSink();

    const res = await fetch(`${baseUrl}/api/verifications/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${recruiterToken}`,
      },
      body: JSON.stringify({
        candidateId: candidateUser.id,
        skillId: testSkillId,
        message: 'Please provide links to Helm charts or K8s ingress configs you authored.',
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.requestId);

    // Candidate notification verification
    const notifs = repository.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC;',
      [candidateUser.id]
    );
    const reqNotif = notifs.find((n) => n.title.includes('Additional Evidence Requested'));
    assert.ok(reqNotif, 'Candidate must receive evidence request notification');
    assert.match(reqNotif.body, /Kubernetes & Containerization/);
    assert.match(reqNotif.body, /Helm charts/);

    const sentEmails = emailService._getSentEmailsForTesting();
    const email = sentEmails.find((e) => e.to === candidateUser.email.toLowerCase());
    assert.ok(email);
    assert.match(email.subject, /Additional Evidence Requested/);
  });

  test('Step 7: Recruiter reviews and approves skill evidence via POST /api/verifications/review', async () => {
    emailService._clearTestEmailSink();
    evidenceId = `evi-${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();
    repository.execute(
      `INSERT INTO skill_evidence (id, candidate_id, skill_id, evidence_type, title, reference_url, metadata, verification_status, created_at, updated_at)
       VALUES (?, ?, ?, 'repository', 'Production Helm Charts', 'https://github.com/priya/helm-charts', '{"type":"k8s"}', 'pending_review', ?, ?);`,
      [evidenceId, candidateUser.id, testSkillId, now, now]
    );

    const res = await fetch(`${baseUrl}/api/verifications/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${recruiterToken}`,
      },
      body: JSON.stringify({
        evidenceId,
        decision: 'verified',
        decisionRationale: 'Verified robust ingress routing and resource quota configurations.',
        awardedProficiency: 4,
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.decision, 'verified');

    // Candidate notification verification
    const notifs = repository.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC;',
      [candidateUser.id]
    );
    const verifNotif = notifs.find((n) => n.title.includes('Skill Verified'));
    assert.ok(verifNotif, 'Candidate must receive Skill Verified notification');
    assert.strictEqual(verifNotif.type, 'success');
    assert.match(verifNotif.body, /Kubernetes & Containerization/);

    const sentEmails = emailService._getSentEmailsForTesting();
    const email = sentEmails.find((e) => e.to === candidateUser.email.toLowerCase());
    assert.ok(email);
    assert.match(email.subject, /Skill Verified/);
  });

  test('Step 8: Candidate views their live lifecycle notifications via GET /api/notifications', async () => {
    const res = await fetch(`${baseUrl}/api/notifications`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${candidateToken}`,
      },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 6, 'Candidate should have full history of lifecycle notifications');
    assert.ok(body.unreadCount >= 6, 'Unread count reflects all delivered notifications');
  });

  test('Step 9: Candidate marks notification as read via PATCH /api/notifications/:id/read', async () => {
    const getRes = await fetch(`${baseUrl}/api/notifications`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${candidateToken}`,
      },
    });
    const { data: initialNotifs, unreadCount: initialUnread } = await getRes.json();
    const firstNotif = initialNotifs[0];

    const markRes = await fetch(`${baseUrl}/api/notifications/${firstNotif.id}/read`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${candidateToken}`,
      },
    });

    assert.strictEqual(markRes.status, 200);

    const refreshedRes = await fetch(`${baseUrl}/api/notifications`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${candidateToken}`,
      },
    });
    const { data: refreshedNotifs, unreadCount: refreshedUnread } = await refreshedRes.json();
    const updated = refreshedNotifs.find((n) => n.id === firstNotif.id);
    assert.strictEqual(updated.isRead, true);
    assert.strictEqual(refreshedUnread, initialUnread - 1);
  });

  test('Step 10: Multi-tenant isolation: Foreign recruiter cannot reschedule or cancel interview', async () => {
    // Intruder attempts to reschedule interview belonging to testOrgId
    const resResched = await fetch(`${baseUrl}/api/interviews/${interviewId}/reschedule`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${intruderToken}`,
      },
      body: JSON.stringify({
        scheduledAt: new Date(Date.now() + 86400000 * 5).toISOString(),
      }),
    });
    assert.strictEqual(resResched.status, 404, 'Foreign tenant must not see interview');

    // Intruder attempts to cancel interview belonging to testOrgId
    const resCancel = await fetch(`${baseUrl}/api/interviews/${interviewId}/cancel`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${intruderToken}`,
      },
      body: JSON.stringify({
        reason: 'Malicious cancellation',
      }),
    });
    assert.strictEqual(resCancel.status, 404, 'Foreign tenant cannot cancel interview');
  });
});
