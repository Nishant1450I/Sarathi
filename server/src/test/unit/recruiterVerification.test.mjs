import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID as uuidv4 } from 'node:crypto';
import { initDb, closeDb } from '../../config/db.js';
import { runMigrations } from '../../data/migrate.mjs';
import { repository } from '../../data/repository.js';
import { recruiterVerification } from '../../config/index.js';
import {
  recruiterVerificationService,
  detectFileSignature,
} from '../../services/recruiterVerificationService.js';
import { jobService } from '../../services/jobService.js';

describe('Phase 1: Recruiter Verification Engine Unit Tests', () => {
  let testRecruiterId;
  let testRecruiterEmail;
  let testOrgId;
  let foreignOrgId;
  let platformAdminId;

  beforeEach(() => {
    // Enable test sink for automated testing
    process.env.NODE_ENV = 'test';
    process.env.TEST_EMAIL_SINK = 'true';
    recruiterVerificationService._clearTestOtpSink();

    closeDb();
    initDb(':memory:');
    runMigrations(':memory:');

    const now = new Date().toISOString();

    // Create unique test orgs
    testOrgId = `org-test-${uuidv4().slice(0, 6)}`;
    foreignOrgId = `org-foreign-${uuidv4().slice(0, 6)}`;

    repository.execute(
      `INSERT INTO organisations (id, name, slug, timezone, currency, settings, created_at, updated_at)
       VALUES (?, 'Test Corp', ?, 'Asia/Kolkata', 'INR', '{}', ?, ?);`,
      [testOrgId, `test-corp-${uuidv4().slice(0, 6)}`, now, now]
    );

    repository.execute(
      `INSERT INTO organisations (id, name, slug, timezone, currency, settings, created_at, updated_at)
       VALUES (?, 'Foreign Corp', ?, 'Asia/Kolkata', 'INR', '{}', ?, ?);`,
      [foreignOrgId, `foreign-corp-${uuidv4().slice(0, 6)}`, now, now]
    );

    // Create test recruiter
    testRecruiterId = `usr-rec-${uuidv4().slice(0, 6)}`;
    testRecruiterEmail = `recruiter.${uuidv4().slice(0, 6)}@testcorp.com`;
    repository.execute(
      `INSERT INTO users (id, email, password_hash, full_name, role, status, created_at, updated_at)
       VALUES (?, ?, 'hash', 'Test Recruiter', 'recruiter', 'active', ?, ?);`,
      [testRecruiterId, testRecruiterEmail, now, now]
    );

    repository.execute(
      `INSERT INTO organisation_memberships (id, org_id, user_id, role, status, created_at, updated_at)
       VALUES (?, ?, ?, 'recruiter', 'active', ?, ?);`,
      [`mem-${uuidv4().slice(0, 6)}`, testOrgId, testRecruiterId, now, now]
    );

    // Create platform admin
    platformAdminId = `usr-adm-${uuidv4().slice(0, 6)}`;
    const platformAdminEmail = `admin-${uuidv4().slice(0, 6)}@platform.test`;
    repository.execute(
      `INSERT INTO users (id, email, password_hash, full_name, role, status, created_at, updated_at)
       VALUES (?, ?, 'hash', 'Platform Admin', 'platform_admin', 'active', ?, ?);`,
      [platformAdminId, platformAdminEmail, now, now]
    );
  });

  test('1. detectFileSignature correctly identifies PDF, PNG, JPEG and rejects invalid signatures', () => {
    // Valid PDF (%PDF-1.4)
    const pdfBuf = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34]);
    const pdfSig = detectFileSignature(pdfBuf);
    assert.strictEqual(pdfSig?.mimeType, 'application/pdf');
    assert.strictEqual(pdfSig?.extension, '.pdf');

    // Valid PNG (\x89PNG\r\n\x1a\n)
    const pngBuf = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00]);
    const pngSig = detectFileSignature(pngBuf);
    assert.strictEqual(pngSig?.mimeType, 'image/png');
    assert.strictEqual(pngSig?.extension, '.png');

    // Valid JPEG (\xFF\xD8\xFF)
    const jpegBuf = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
    const jpegSig = detectFileSignature(jpegBuf);
    assert.strictEqual(jpegSig?.mimeType, 'image/jpeg');
    assert.strictEqual(jpegSig?.extension, '.jpg');

    // Fake text pretending to be PDF
    const fakeTextBuf = Buffer.from('Hello this is a plain text file not a PDF');
    assert.strictEqual(detectFileSignature(fakeTextBuf), null);

    // Executable / script disguised as PNG
    const scriptBuf = Buffer.from('<?php echo "evil"; ?>');
    assert.strictEqual(detectFileSignature(scriptBuf), null);
  });

  test('2. sendEmailOtp generates secure OTP, stores bcrypt hash, and enables test sink retrieval without logging', async () => {
    const res = await recruiterVerificationService.sendEmailOtp(testRecruiterId, testRecruiterEmail);
    assert.strictEqual(res.success, true);
    assert.ok(res.expiresAt);

    // Verify stored in DB as hash, NOT plaintext
    const tokenRecord = repository.queryOne(
      `SELECT * FROM auth_verification_tokens WHERE user_id = ? AND used_at IS NULL;`,
      [testRecruiterId]
    );
    assert.ok(tokenRecord);
    assert.strictEqual(tokenRecord.token_type, 'email_otp');
    assert.strictEqual(tokenRecord.attempts, 0);

    // The token hash must be a bcrypt string starting with $2
    assert.ok(tokenRecord.token_hash.startsWith('$2'));

    // Retrieve via test-only sink
    const dispatchedOtp = recruiterVerificationService._getTestOtpForTesting(testRecruiterId);
    assert.ok(dispatchedOtp);
    assert.strictEqual(dispatchedOtp.length, 6);
    assert.match(dispatchedOtp, /^\d{6}$/);

    // Verify raw OTP does not match hash string directly
    assert.notStrictEqual(dispatchedOtp, tokenRecord.token_hash);
  });

  test('3. Resend cooldown rejects rapid OTP requests within 60 seconds', async () => {
    await recruiterVerificationService.sendEmailOtp(testRecruiterId, testRecruiterEmail);

    await assert.rejects(
      async () => {
        await recruiterVerificationService.sendEmailOtp(testRecruiterId, testRecruiterEmail);
      },
      (err) => {
        assert.strictEqual(err.code, 'COOLDOWN_ACTIVE');
        assert.strictEqual(err.status, 429);
        return true;
      }
    );
  });

  test('4. confirmEmailOtp verifies valid OTP, marks email_verified, and records audit event', async () => {
    await recruiterVerificationService.sendEmailOtp(testRecruiterId, testRecruiterEmail);
    const validOtp = recruiterVerificationService._getTestOtpForTesting(testRecruiterId);

    const result = await recruiterVerificationService.confirmEmailOtp(testRecruiterId, validOtp);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.emailVerified, true);
    assert.ok(result.verifiedAt);

    // Verify user record updated in database
    const user = repository.queryOne(`SELECT email_verified, email_verified_at FROM users WHERE id = ?;`, [testRecruiterId]);
    assert.strictEqual(user.email_verified, 1);
    assert.ok(user.email_verified_at);

    // Verify token record marked consumed (used_at IS NOT NULL)
    const token = repository.queryOne(`SELECT used_at, attempts FROM auth_verification_tokens WHERE user_id = ?;`, [testRecruiterId]);
    assert.ok(token.used_at);
    assert.strictEqual(token.attempts, 1);

    // Verify audit event logged
    const auditEvent = repository.queryOne(
      `SELECT * FROM audit_events WHERE actor_id = ? AND action = 'recruiter.email_verified';`,
      [testRecruiterId]
    );
    assert.ok(auditEvent);
  });

  test('5. confirmEmailOtp rejects wrong OTP and tracks remaining attempts', async () => {
    await recruiterVerificationService.sendEmailOtp(testRecruiterId, testRecruiterEmail);

    await assert.rejects(
      async () => {
        await recruiterVerificationService.confirmEmailOtp(testRecruiterId, '999999');
      },
      (err) => {
        assert.strictEqual(err.code, 'INVALID_OTP');
        assert.match(err.message, /attempts remaining/);
        return true;
      }
    );

    const token = repository.queryOne(`SELECT attempts, used_at FROM auth_verification_tokens WHERE user_id = ?;`, [testRecruiterId]);
    assert.strictEqual(token.attempts, 1);
    assert.strictEqual(token.used_at, null);
  });

  test('6. Excessive failed attempts invalidates OTP and locks verification', async () => {
    await recruiterVerificationService.sendEmailOtp(testRecruiterId, testRecruiterEmail);

    // Attempt 5 incorrect guesses
    for (let i = 0; i < 5; i++) {
      try {
        await recruiterVerificationService.confirmEmailOtp(testRecruiterId, `11111${i}`);
      } catch {
        // expected
      }
    }

    // 6th attempt should be blocked as MAX_ATTEMPTS_EXCEEDED
    await assert.rejects(
      async () => {
        await recruiterVerificationService.confirmEmailOtp(testRecruiterId, '123456');
      },
      (err) => {
        assert.strictEqual(err.code, 'MAX_ATTEMPTS_EXCEEDED');
        assert.strictEqual(err.status, 429);
        return true;
      }
    );
  });

  test('7. Single-use consumption: Already used OTP cannot be verified twice', async () => {
    await recruiterVerificationService.sendEmailOtp(testRecruiterId, testRecruiterEmail);
    const validOtp = recruiterVerificationService._getTestOtpForTesting(testRecruiterId);

    // First use: success
    await recruiterVerificationService.confirmEmailOtp(testRecruiterId, validOtp);

    // Second use: must be rejected with NO_PENDING_OTP
    await assert.rejects(
      async () => {
        await recruiterVerificationService.confirmEmailOtp(testRecruiterId, validOtp);
      },
      (err) => {
        assert.strictEqual(err.code, 'NO_PENDING_OTP');
        assert.strictEqual(err.status, 404);
        return true;
      }
    );
  });

  test('8. Expired OTP is rejected and invalidated', async () => {
    await recruiterVerificationService.sendEmailOtp(testRecruiterId, testRecruiterEmail);
    const validOtp = recruiterVerificationService._getTestOtpForTesting(testRecruiterId);

    // Manually backdate the token expiry to simulate passage of time
    const pastTime = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    repository.execute(
      `UPDATE auth_verification_tokens SET expires_at = ? WHERE user_id = ?;`,
      [pastTime, testRecruiterId]
    );

    await assert.rejects(
      async () => {
        await recruiterVerificationService.confirmEmailOtp(testRecruiterId, validOtp);
      },
      (err) => {
        assert.strictEqual(err.code, 'OTP_EXPIRED');
        assert.strictEqual(err.status, 410);
        return true;
      }
    );
  });

  test('9. submitBusinessDocument validates file signature and stores valid document', async () => {
    // Valid PDF bytes encoded in base64
    const validPdfBytes = Buffer.from('%PDF-1.4 sample business certificate document content');
    const validBase64 = validPdfBytes.toString('base64');

    const result = await recruiterVerificationService.submitBusinessDocument({
      orgId: testOrgId,
      userId: testRecruiterId,
      documentType: 'gstin',
      fileName: 'gstin_certificate.pdf',
      fileContentBase64: validBase64,
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.documentType, 'gstin');
    assert.strictEqual(result.status, 'pending_review');
    assert.strictEqual(result.mimeType, 'application/pdf');

    // Verify organization status updated to pending_review
    const org = repository.queryOne(`SELECT verification_status FROM organisations WHERE id = ?;`, [testOrgId]);
    assert.strictEqual(org.verification_status, 'pending_review');

    // Verify database record in recruiter_business_verifications
    const docRecord = repository.queryOne(
      `SELECT * FROM recruiter_business_verifications WHERE id = ?;`,
      [result.documentId]
    );
    assert.ok(docRecord);
    assert.strictEqual(docRecord.status, 'pending_review');
    assert.ok(docRecord.document_path.includes('bdoc-'));
  });

  test('10. submitBusinessDocument rejects invalid file signature, fake content, and invalid types', async () => {
    // Plain text masquerading as PDF
    const fakeContent = Buffer.from('Plain text fake document').toString('base64');

    await assert.rejects(
      async () => {
        await recruiterVerificationService.submitBusinessDocument({
          orgId: testOrgId,
          userId: testRecruiterId,
          documentType: 'gstin',
          fileName: 'fake.pdf',
          fileContentBase64: fakeContent,
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'INVALID_FILE_SIGNATURE');
        return true;
      }
    );

    // Invalid document type
    const validPdfBytes = Buffer.from('%PDF-1.4 content').toString('base64');
    await assert.rejects(
      async () => {
        await recruiterVerificationService.submitBusinessDocument({
          orgId: testOrgId,
          userId: testRecruiterId,
          documentType: 'unsupported_passport',
          fileName: 'passport.pdf',
          fileContentBase64: validPdfBytes,
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'INVALID_DOC_TYPE');
        return true;
      }
    );
  });

  test('11. Document access control enforces tenant isolation and allows platform admin', async () => {
    const validPdfBytes = Buffer.from('%PDF-1.4 test document').toString('base64');
    const uploadRes = await recruiterVerificationService.submitBusinessDocument({
      orgId: testOrgId,
      userId: testRecruiterId,
      documentType: 'incorporation_cert',
      fileName: 'incorporation.pdf',
      fileContentBase64: validPdfBytes,
    });

    const docId = uploadRes.documentId;

    // 1. Same organization recruiter: ALLOWED
    const sameOrgUser = { id: testRecruiterId, globalRole: 'recruiter' };
    const sameOrgDownload = recruiterVerificationService.getDocumentForDownload(docId, sameOrgUser, testOrgId);
    assert.strictEqual(sameOrgDownload.documentId, docId);

    // 2. Platform Admin: ALLOWED
    const adminUser = { id: platformAdminId, globalRole: 'platform_admin' };
    const adminDownload = recruiterVerificationService.getDocumentForDownload(docId, adminUser, null);
    assert.strictEqual(adminDownload.documentId, docId);

    // 3. Foreign organization recruiter: STRICTLY REJECTED
    const foreignUser = { id: 'usr-foreign', globalRole: 'recruiter' };
    assert.throws(
      () => {
        recruiterVerificationService.getDocumentForDownload(docId, foreignUser, foreignOrgId);
      },
      (err) => {
        assert.strictEqual(err.code, 'ACCESS_DENIED');
        assert.strictEqual(err.status, 403);
        return true;
      }
    );
  });

  test('12. Platform admin can approve business verification and update organization status', async () => {
    const validPdfBytes = Buffer.from('%PDF-1.4 certificate').toString('base64');
    const uploadRes = await recruiterVerificationService.submitBusinessDocument({
      orgId: testOrgId,
      userId: testRecruiterId,
      documentType: 'tax_id',
      fileName: 'tax_cert.pdf',
      fileContentBase64: validPdfBytes,
    });

    const decisionRes = recruiterVerificationService.submitBusinessVerificationDecision({
      documentId: uploadRes.documentId,
      reviewerId: platformAdminId,
      decision: 'approved',
      reviewerNotes: 'Verified official tax registration document against state authority.',
    });

    assert.strictEqual(decisionRes.success, true);
    assert.strictEqual(decisionRes.decision, 'approved');

    // Verify organization status is now 'approved'
    const org = repository.queryOne(`SELECT verification_status FROM organisations WHERE id = ?;`, [testOrgId]);
    assert.strictEqual(org.verification_status, 'approved');

    // Verify document status is 'approved'
    const doc = repository.queryOne(`SELECT status, reviewer_id FROM recruiter_business_verifications WHERE id = ?;`, [uploadRes.documentId]);
    assert.strictEqual(doc.status, 'approved');
    assert.strictEqual(doc.reviewer_id, platformAdminId);
  });

  test('13. Job publishing gate: blocks unverified publishing when RECRUITER_VERIFICATION_REQUIRED=true', () => {
    // Enable verification gate
    recruiterVerification.required = true;

    // 1. Recruiter is NOT email verified and Org is NOT approved
    assert.throws(
      () => {
        jobService.createJob(testOrgId, testRecruiterId, {
          title: 'Senior Distributed Systems Architect',
          description: 'High-scale distributed systems architect role.',
          status: 'published',
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'RECRUITER_VERIFICATION_REQUIRED');
        assert.strictEqual(err.status, 403);
        return true;
      }
    );

    // 2. Draft job creation is ALWAYS permitted without verification
    const draftJob = jobService.createJob(testOrgId, testRecruiterId, {
      title: 'Senior Distributed Systems Architect Draft',
      description: 'Draft job role description.',
      status: 'draft',
    });
    assert.strictEqual(draftJob.status, 'draft');

    // 3. Trying to update draft to 'published' is blocked
    assert.throws(
      () => {
        jobService.updateJob(testOrgId, draftJob.id, { status: 'published' });
      },
      (err) => {
        assert.strictEqual(err.code, 'RECRUITER_VERIFICATION_REQUIRED');
        return true;
      }
    );

    // 4. Now fulfill verification (mark user email verified and org approved)
    repository.execute(`UPDATE users SET email_verified = 1 WHERE id = ?;`, [testRecruiterId]);
    repository.execute(`UPDATE organisations SET verification_status = 'approved' WHERE id = ?;`, [testOrgId]);

    // 5. Publishing now succeeds!
    const publishedJob = jobService.updateJob(testOrgId, draftJob.id, { status: 'published' });
    assert.strictEqual(publishedJob.status, 'published');

    // Reset verification setting for other tests
    recruiterVerification.required = false;
  });
});
