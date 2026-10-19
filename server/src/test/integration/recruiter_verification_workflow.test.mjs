import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID as uuidv4 } from 'node:crypto';
import app from '../../index.js';
import { initDb, closeDb } from '../../config/db.js';
import { runMigrations } from '../../data/migrate.mjs';
import { repository } from '../../data/repository.js';
import { authService } from '../../services/authService.js';
import { recruiterVerificationService } from '../../services/recruiterVerificationService.js';
import { recruiterVerification } from '../../config/index.js';

describe('Recruiter Verification Workflow End-to-End Integration', () => {
  let serverInstance;
  let baseUrl;
  let testOrgId;
  let recruiterUser;
  let recruiterToken;
  let intruderUser;
  let intruderToken;
  let platformAdminUser;
  let platformAdminToken;
  let uploadedDocId;

  before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.TEST_EMAIL_SINK = 'true';
    recruiterVerification.required = true;

    closeDb();
    initDb(':memory:');
    runMigrations(':memory:');

    const now = new Date().toISOString();

    // 1. Create test organisation
    testOrgId = `org-e2e-${uuidv4().slice(0, 6)}`;
    repository.execute(
      `INSERT INTO organisations (id, name, slug, timezone, currency, settings, created_at, updated_at)
       VALUES (?, 'E2E Tech Labs', ?, 'Asia/Kolkata', 'INR', '{}', ?, ?);`,
      [testOrgId, `e2e-labs-${uuidv4().slice(0, 6)}`, now, now]
    );

    // 2. Create recruiter user
    recruiterUser = {
      id: `usr-rec-${uuidv4().slice(0, 6)}`,
      email: `lead.recruiter-${uuidv4().slice(0, 6)}@e2etech.com`,
      full_name: 'Lead Recruiter',
      role: 'recruiter',
      status: 'active',
      email_verified: 0,
    };
    repository.execute(
      `INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified, created_at, updated_at)
       VALUES (?, ?, 'hash', ?, ?, ?, 0, ?, ?);`,
      [recruiterUser.id, recruiterUser.email, recruiterUser.full_name, recruiterUser.role, recruiterUser.status, now, now]
    );
    repository.execute(
      `INSERT INTO organisation_memberships (id, org_id, user_id, role, status, created_at, updated_at)
       VALUES (?, ?, ?, 'recruiter', 'active', ?, ?);`,
      [`mem-${uuidv4().slice(0, 6)}`, testOrgId, recruiterUser.id, now, now]
    );
    recruiterToken = authService.generateToken(recruiterUser, testOrgId, 'recruiter');

    // 3. Create intruder candidate user (different tenant & unauthorized)
    intruderUser = {
      id: `usr-cand-${uuidv4().slice(0, 6)}`,
      email: `candidate-${uuidv4().slice(0, 6)}@sarathi.test`,
      full_name: 'Job Seeker',
      role: 'candidate',
      status: 'active',
    };
    repository.execute(
      `INSERT INTO users (id, email, password_hash, full_name, role, status, created_at, updated_at)
       VALUES (?, ?, 'hash', ?, ?, ?, ?, ?);`,
      [intruderUser.id, intruderUser.email, intruderUser.full_name, intruderUser.role, intruderUser.status, now, now]
    );
    intruderToken = authService.generateToken(intruderUser, null, null);

    // 4. Create platform admin user
    platformAdminUser = {
      id: `usr-adm-${uuidv4().slice(0, 6)}`,
      email: `superadmin-${uuidv4().slice(0, 6)}@sarathi.internal`,
      full_name: 'Trust Platform Administrator',
      role: 'platform_admin',
      status: 'active',
    };
    repository.execute(
      `INSERT INTO users (id, email, password_hash, full_name, role, status, created_at, updated_at)
       VALUES (?, ?, 'hash', ?, ?, ?, ?, ?);`,
      [platformAdminUser.id, platformAdminUser.email, platformAdminUser.full_name, platformAdminUser.role, platformAdminUser.status, now, now]
    );
    platformAdminToken = authService.generateToken(platformAdminUser, null, null);

    // 5. Spin up ephemeral HTTP server
    await new Promise((resolve) => {
      serverInstance = app.listen(0, '127.0.0.1', () => {
        const port = serverInstance.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    recruiterVerification.required = false;
    if (serverInstance) {
      await new Promise((resolve) => serverInstance.close(resolve));
    }
  });

  test('Step 1: Unauthenticated request to /api/recruiter/verify/status is rejected with 401', async () => {
    const res = await fetch(`${baseUrl}/api/recruiter/verify/status`);
    assert.strictEqual(res.status, 401);
  });

  test('Step 2: Initial recruiter status shows email unverified and business unverified', async () => {
    const res = await fetch(`${baseUrl}/api/recruiter/verify/status`, {
      headers: {
        Authorization: `Bearer ${recruiterToken}`,
        'x-org-id': testOrgId,
      },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.data.emailVerified, false);
    assert.strictEqual(body.data.organization?.verificationStatus, 'unverified');
    assert.strictEqual(body.data.canPublishJobs, false);
  });

  test('Step 3: Recruiter attempts to publish job while unverified -> blocked by publishing gate', async () => {
    const res = await fetch(`${baseUrl}/api/jobs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${recruiterToken}`,
        'x-org-id': testOrgId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Platform Infrastructure Lead',
        description: 'Lead Kubernetes and cloud infrastructure.',
        status: 'published',
      }),
    });

    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.code, 'RECRUITER_VERIFICATION_REQUIRED');
  });

  test('Step 4: Recruiter requests verification OTP via /email/send-otp', async () => {
    const res = await fetch(`${baseUrl}/api/recruiter/verify/email/send-otp`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${recruiterToken}`,
        'x-org-id': testOrgId,
      },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.message.includes('Verification code dispatched'));
  });

  test('Step 5: Immediate resend triggers cooldown 429', async () => {
    const res = await fetch(`${baseUrl}/api/recruiter/verify/email/send-otp`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${recruiterToken}`,
        'x-org-id': testOrgId,
      },
    });

    assert.strictEqual(res.status, 429);
    const body = await res.json();
    assert.strictEqual(body.error?.code, 'COOLDOWN_ACTIVE');
  });

  test('Step 6: Wrong OTP returns 400 and reveals remaining attempts', async () => {
    const res = await fetch(`${baseUrl}/api/recruiter/verify/email/confirm-otp`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${recruiterToken}`,
        'x-org-id': testOrgId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ otp: '000000' }),
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.error?.code, 'INVALID_OTP');
    assert.strictEqual(body.remainingAttempts, 4);
  });

  test('Step 7: Valid OTP confirms email verification', async () => {
    const validOtp = recruiterVerificationService._getTestOtpForTesting(recruiterUser.id);
    assert.ok(validOtp);

    const res = await fetch(`${baseUrl}/api/recruiter/verify/email/confirm-otp`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${recruiterToken}`,
        'x-org-id': testOrgId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ otp: validOtp }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.emailVerified, true);
  });

  test('Step 8: Uploading non-PDF/image document fails file signature validation with 400', async () => {
    const res = await fetch(`${baseUrl}/api/recruiter/verify/business/document`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${recruiterToken}`,
        'x-org-id': testOrgId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documentType: 'incorporation_cert',
        fileName: 'malicious.pdf',
        fileContentBase64: Buffer.from('<?php system($_GET["cmd"]); ?>').toString('base64'),
      }),
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.error?.code, 'INVALID_FILE_SIGNATURE');
  });

  test('Step 9: Uploading valid PDF document succeeds and queues for review', async () => {
    // Valid minimal PDF header %PDF-1.4 followed by binary stream
    const validPdfBytes = Buffer.concat([
      Buffer.from('%PDF-1.4\n%'),
      Buffer.from([0xe2, 0xe3, 0xcf, 0xd3]),
      Buffer.from('\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< >>\n%%EOF'),
    ]);

    const res = await fetch(`${baseUrl}/api/recruiter/verify/business/document`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${recruiterToken}`,
        'x-org-id': testOrgId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documentType: 'incorporation_cert',
        fileName: 'incorporation_cert_2026.pdf',
        fileContentBase64: validPdfBytes.toString('base64'),
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.status, 'pending_review');
    assert.ok(body.documentId);
    uploadedDocId = body.documentId;
  });

  test('Step 10: Unauthorized candidate cannot download recruiter business document', async () => {
    const res = await fetch(`${baseUrl}/api/recruiter/verify/business/document/${uploadedDocId}/download`, {
      headers: {
        Authorization: `Bearer ${intruderToken}`,
      },
    });

    assert.ok([403, 404].includes(res.status));
  });

  test('Step 11: Non-admin recruiter cannot access platform admin verification review endpoints', async () => {
    const res = await fetch(`${baseUrl}/api/recruiter/verify/admin/business/pending`, {
      headers: {
        Authorization: `Bearer ${recruiterToken}`,
        'x-org-id': testOrgId,
      },
    });

    assert.strictEqual(res.status, 403);
  });

  test('Step 12: Platform admin retrieves pending verification queue and approves document', async () => {
    // List pending
    const listRes = await fetch(`${baseUrl}/api/recruiter/verify/admin/business/pending`, {
      headers: {
        Authorization: `Bearer ${platformAdminToken}`,
      },
    });
    assert.strictEqual(listRes.status, 200);
    const body = await listRes.json();
    const queue = body.data;
    const item = queue.find((doc) => doc.id === uploadedDocId);
    assert.ok(item, 'Uploaded document must appear in admin pending queue');

    // Submit review decision
    const decisionRes = await fetch(`${baseUrl}/api/recruiter/verify/admin/business/${uploadedDocId}/decision`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${platformAdminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        decision: 'approved',
        reviewerNotes: 'Verified official corporate registrar incorporation document.',
      }),
    });

    assert.strictEqual(decisionRes.status, 200);
    const decisionBody = await decisionRes.json();
    assert.strictEqual(decisionBody.success, true);
    assert.strictEqual(decisionBody.decision, 'approved');
  });

  test('Step 13: Recruiter verification status now shows full verification and permission to publish jobs', async () => {
    const res = await fetch(`${baseUrl}/api/recruiter/verify/status`, {
      headers: {
        Authorization: `Bearer ${recruiterToken}`,
        'x-org-id': testOrgId,
      },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.data.emailVerified, true);
    assert.strictEqual(body.data.organization?.verificationStatus, 'approved');
    assert.strictEqual(body.data.canPublishJobs, true);
  });

  test('Step 14: Recruiter can now create and publish jobs successfully', async () => {
    const res = await fetch(`${baseUrl}/api/jobs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${recruiterToken}`,
        'x-org-id': testOrgId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Platform Infrastructure Lead',
        description: 'Lead Kubernetes and cloud infrastructure.',
        status: 'published',
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.title, 'Platform Infrastructure Lead');
    assert.strictEqual(body.status, 'published');
  });
});
