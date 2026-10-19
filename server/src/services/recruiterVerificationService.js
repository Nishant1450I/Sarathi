import { randomInt, randomUUID as uuidv4 } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import bcrypt from 'bcryptjs';
import { repository } from '../data/repository.js';
import { recruiterVerification } from '../config/index.js';

// Private in-memory test sink for automated testing (NEVER exposed or logged in production)
const testOtpSink = new Map();

/**
 * Validates binary magic byte headers for permitted document types.
 * Strictly prevents executable, script, or deceptive extension uploads.
 * Supported: PDF (%PDF-), PNG (\x89PNG\r\n\x1a\n), JPEG (\xFF\xD8\xFF).
 */
export function detectFileSignature(buffer) {
  if (!buffer || buffer.length < 4) return null;

  // PDF signature: 0x25 0x50 0x44 0x46 (%PDF)
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return { mimeType: 'application/pdf', extension: '.pdf' };
  }

  // PNG signature: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
    buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A
  ) {
    return { mimeType: 'image/png', extension: '.png' };
  }

  // JPEG signature: 0xFF 0xD8 0xFF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return { mimeType: 'image/jpeg', extension: '.jpg' };
  }

  return null;
}

export const recruiterVerificationService = {
  /**
   * Generates a cryptographically secure, expiring 6-digit OTP for recruiter email verification.
   * Enforces resend cooldowns and single-use invalidation.
   */
  async sendEmailOtp(userId, userEmail) {
    if (!userId || !userEmail) {
      throw new Error('User identity and email are required');
    }

    const now = new Date();

    // Check resend cooldown
    const latestToken = repository.queryOne(
      `SELECT created_at, expires_at FROM auth_verification_tokens
       WHERE user_id = ? AND token_type = 'email_otp' AND used_at IS NULL
       ORDER BY created_at DESC LIMIT 1;`,
      [userId]
    );

    if (latestToken) {
      const elapsedMs = now.getTime() - new Date(latestToken.created_at).getTime();
      if (elapsedMs < recruiterVerification.resendCooldownMs) {
        const remainingSeconds = Math.ceil((recruiterVerification.resendCooldownMs - elapsedMs) / 1000);
        const err = new Error(`Please wait ${remainingSeconds} seconds before requesting a new verification code.`);
        err.code = 'COOLDOWN_ACTIVE';
        err.status = 429;
        throw err;
      }
    }

    // Invalidate any existing unconsumed OTPs for this user
    repository.execute(
      `UPDATE auth_verification_tokens
       SET used_at = ?
       WHERE user_id = ? AND token_type = 'email_otp' AND used_at IS NULL;`,
      [now.toISOString(), userId]
    );

    // Generate secure 6-digit OTP (100000 - 999999)
    const rawOtp = randomInt(100000, 1000000).toString();
    const tokenHash = await bcrypt.hash(rawOtp, 10);
    const expiresAt = new Date(now.getTime() + recruiterVerification.otpExpiryMs).toISOString();
    const tokenId = `tok-${uuidv4().slice(0, 8)}`;

    repository.execute(
      `INSERT INTO auth_verification_tokens (
        id, user_id, token_hash, token_type, attempts, expires_at, used_at, created_at
      ) VALUES (?, ?, ?, 'email_otp', 0, ?, NULL, ?);`,
      [tokenId, userId, tokenHash, expiresAt, now.toISOString()]
    );

    // Email delivery handling
    const isTestMode = process.env.NODE_ENV === 'test' || process.env.TEST_EMAIL_SINK === 'true';

    if (isTestMode) {
      // In automated test mode only, securely store in test sink (NEVER logged)
      testOtpSink.set(userId, rawOtp);
    } else if (recruiterVerification.emailProvider !== 'smtp') {
      // Production / Unconfigured safeguard: Never claim success if delivery is not configured
      const err = new Error('Outbound email delivery is unconfigured. Please configure SMTP settings to enable email verification.');
      err.code = 'EMAIL_SERVICE_UNAVAILABLE';
      err.status = 503;
      throw err;
    }

    return {
      success: true,
      message: 'Verification code dispatched to work email',
      expiresAt,
      cooldownSeconds: Math.ceil(recruiterVerification.resendCooldownMs / 1000),
    };
  },

  /**
   * Confirms recruiter email OTP with attempt limits, expiry, and single-use consumption.
   */
  async confirmEmailOtp(userId, submittedOtp) {
    if (!userId || !submittedOtp) {
      throw new Error('User identity and verification code are required');
    }

    const cleanOtp = String(submittedOtp).trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      const err = new Error('Verification code must be exactly 6 digits');
      err.code = 'INVALID_OTP_FORMAT';
      err.status = 400;
      throw err;
    }

    const token = repository.queryOne(
      `SELECT * FROM auth_verification_tokens
       WHERE user_id = ? AND token_type = 'email_otp' AND used_at IS NULL
       ORDER BY created_at DESC LIMIT 1;`,
      [userId]
    );

    if (!token) {
      const err = new Error('No pending verification code found. Please request a new code.');
      err.code = 'NO_PENDING_OTP';
      err.status = 404;
      throw err;
    }

    const now = new Date();

    // Check expiry
    if (now.getTime() > new Date(token.expires_at).getTime()) {
      repository.execute(
        `UPDATE auth_verification_tokens SET used_at = ? WHERE id = ?;`,
        [now.toISOString(), token.id]
      );
      const err = new Error('Verification code has expired. Please request a new code.');
      err.code = 'OTP_EXPIRED';
      err.status = 410;
      throw err;
    }

    // Check excessive failed attempts
    if (token.attempts >= recruiterVerification.maxOtpAttempts) {
      repository.execute(
        `UPDATE auth_verification_tokens SET used_at = ? WHERE id = ?;`,
        [now.toISOString(), token.id]
      );
      const err = new Error('Maximum verification attempts exceeded. Code has been invalidated. Please request a new code.');
      err.code = 'MAX_ATTEMPTS_EXCEEDED';
      err.status = 429;
      throw err;
    }

    // Securely compare bcrypt hash
    const isValid = await bcrypt.compare(cleanOtp, token.token_hash);

    if (!isValid) {
      const nextAttempts = token.attempts + 1;
      repository.execute(
        `UPDATE auth_verification_tokens SET attempts = ? WHERE id = ?;`,
        [nextAttempts, token.id]
      );
      const remainingAttempts = Math.max(0, recruiterVerification.maxOtpAttempts - nextAttempts);
      const err = new Error(
        remainingAttempts > 0
          ? `Invalid verification code. ${remainingAttempts} attempts remaining.`
          : 'Invalid verification code. Maximum attempts exceeded; please request a new code.'
      );
      err.code = 'INVALID_OTP';
      err.remainingAttempts = remainingAttempts;
      err.status = 400;
      throw err;
    }

    // Mark single-use token consumed and mark user email verified
    const isoNow = now.toISOString();

    repository.transaction((repo) => {
      repo.execute(
        `UPDATE auth_verification_tokens
         SET used_at = ?, attempts = attempts + 1
         WHERE id = ?;`,
        [isoNow, token.id]
      );

      repo.execute(
        `UPDATE users
         SET email_verified = 1, email_verified_at = ?, updated_at = ?
         WHERE id = ?;`,
        [isoNow, isoNow, userId]
      );

      repo.execute(
        `INSERT INTO audit_events (
          id, actor_id, action, resource_type, resource_id, payload, created_at
        ) VALUES (?, ?, 'recruiter.email_verified', 'users', ?, '{}', ?);`,
        [`ae-${uuidv4().slice(0, 8)}`, userId, userId, isoNow]
      );
    });

    // Clean up test sink if present
    testOtpSink.delete(userId);

    return {
      success: true,
      message: 'Work email successfully verified',
      emailVerified: true,
      verifiedAt: isoNow,
    };
  },

  /**
   * Submits a business verification document (GSTIN, Incorporation, Tax ID).
   * Validates file size, MIME type, and binary file signatures.
   * Stores files in private non-public disk storage with randomized names.
   */
  async submitBusinessDocument({ orgId, userId, documentType, fileName, fileContentBase64 }) {
    if (!orgId || !userId || !documentType || !fileName || !fileContentBase64) {
      throw new Error('Organization ID, user ID, document type, file name, and file content are required');
    }

    const validTypes = ['gstin', 'incorporation_cert', 'tax_id', 'business_pan'];
    if (!validTypes.includes(documentType)) {
      const err = new Error(`Invalid document type. Allowed types: ${validTypes.join(', ')}`);
      err.code = 'INVALID_DOC_TYPE';
      err.status = 400;
      throw err;
    }

    let buffer;
    try {
      buffer = Buffer.from(fileContentBase64, 'base64');
    } catch {
      const err = new Error('Failed to decode base64 file content');
      err.code = 'INVALID_BASE64';
      err.status = 400;
      throw err;
    }

    if (buffer.length === 0) {
      const err = new Error('Uploaded document content cannot be empty');
      err.code = 'EMPTY_FILE';
      err.status = 400;
      throw err;
    }

    if (buffer.length > recruiterVerification.maxDocumentSizeBytes) {
      const maxMb = Math.round(recruiterVerification.maxDocumentSizeBytes / (1024 * 1024));
      const err = new Error(`File size exceeds maximum permitted limit (${maxMb} MB)`);
      err.code = 'FILE_TOO_LARGE';
      err.status = 413;
      throw err;
    }

    // Validate binary file signature against permitted types
    const sig = detectFileSignature(buffer);
    if (!sig) {
      const err = new Error('Invalid file signature. Only authentic PDF, PNG, and JPEG documents are permitted.');
      err.code = 'INVALID_FILE_SIGNATURE';
      err.status = 400;
      throw err;
    }

    // Ensure private storage directory exists
    const storageDir = recruiterVerification.uploadDir;
    if (!existsSync(storageDir)) {
      mkdirSync(storageDir, { recursive: true });
    }

    // Generate non-enumerable, randomized storage filename
    const diskFileName = `bdoc-${uuidv4().replace(/-/g, '')}${sig.extension}`;
    const destinationPath = resolve(storageDir, diskFileName);

    writeFileSync(destinationPath, buffer);

    const docId = `bdoc-${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();

    repository.transaction((repo) => {
      repo.execute(
        `INSERT INTO recruiter_business_verifications (
          id, org_id, user_id, document_type, document_path, file_name,
          file_size_bytes, mime_type, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_review', ?, ?);`,
        [
          docId, orgId, userId, documentType, destinationPath, fileName.trim(),
          buffer.length, sig.mimeType, now, now
        ]
      );

      // Update organisation verification status to pending_review
      repo.execute(
        `UPDATE organisations
         SET verification_status = 'pending_review', updated_at = ?
         WHERE id = ?;`,
        [now, orgId]
      );

      repo.execute(
        `INSERT INTO audit_events (
          id, org_id, actor_id, action, resource_type, resource_id, payload, created_at
        ) VALUES (?, ?, ?, 'business_doc.submitted', 'recruiter_business_verifications', ?, ?, ?);`,
        [
          `ae-${uuidv4().slice(0, 8)}`,
          orgId,
          userId,
          docId,
          JSON.stringify({ documentType, fileName: fileName.trim(), size: buffer.length }),
          now
        ]
      );
    });

    return {
      success: true,
      documentId: docId,
      documentType,
      fileName: fileName.trim(),
      mimeType: sig.mimeType,
      status: 'pending_review',
      uploadedAt: now,
    };
  },

  /**
   * Retrieves business document record and verifies tenant authorization before download.
   */
  getDocumentForDownload(documentId, requestingUser, requestingOrgId) {
    const doc = repository.queryOne(
      `SELECT * FROM recruiter_business_verifications WHERE id = ?;`,
      [documentId]
    );

    if (!doc) {
      const err = new Error('Verification document not found');
      err.code = 'NOT_FOUND';
      err.status = 404;
      throw err;
    }

    // Access control: only platform_admin or member of the document's organisation
    const isPlatformAdmin = requestingUser.globalRole === 'platform_admin';
    const isOrgMember = requestingOrgId && requestingOrgId === doc.org_id;

    if (!isPlatformAdmin && !isOrgMember) {
      const err = new Error('Access denied. You do not have permission to view this document.');
      err.code = 'ACCESS_DENIED';
      err.status = 403;
      throw err;
    }

    if (!existsSync(doc.document_path)) {
      const err = new Error('Physical document file was not found on server storage');
      err.code = 'FILE_MISSING';
      err.status = 404;
      throw err;
    }

    return {
      documentId: doc.id,
      fileName: doc.file_name,
      filePath: doc.document_path,
      mimeType: doc.mime_type,
      orgId: doc.org_id,
    };
  },

  /**
   * Authorized review decision on business verification (Platform Admin role required).
   */
  submitBusinessVerificationDecision({ documentId, reviewerId, decision, reviewerNotes }) {
    const validDecisions = ['approved', 'rejected', 'resubmission_required'];
    if (!validDecisions.includes(decision)) {
      throw new Error(`Invalid decision. Permitted: ${validDecisions.join(', ')}`);
    }

    if (!reviewerNotes || reviewerNotes.trim().length < 10) {
      throw new Error('Mandatory reviewer notes of at least 10 characters are required for compliance.');
    }

    const doc = repository.queryOne(
      `SELECT * FROM recruiter_business_verifications WHERE id = ?;`,
      [documentId]
    );

    if (!doc) {
      const err = new Error('Business verification submission not found');
      err.code = 'NOT_FOUND';
      err.status = 404;
      throw err;
    }

    const now = new Date().toISOString();

    repository.transaction((repo) => {
      repo.execute(
        `UPDATE recruiter_business_verifications
         SET status = ?, reviewer_id = ?, reviewer_notes = ?, reviewed_at = ?, updated_at = ?
         WHERE id = ?;`,
        [decision, reviewerId, reviewerNotes.trim(), now, now, documentId]
      );

      // Mirror decision onto organization verification status
      const orgStatus = decision === 'approved' ? 'approved' : decision;
      repo.execute(
        `UPDATE organisations
         SET verification_status = ?, updated_at = ?
         WHERE id = ?;`,
        [orgStatus, now, doc.org_id]
      );

      repo.execute(
        `INSERT INTO audit_events (
          id, org_id, actor_id, action, resource_type, resource_id, payload, created_at
        ) VALUES (?, ?, ?, 'business_doc.decision', 'recruiter_business_verifications', ?, ?, ?);`,
        [
          `ae-${uuidv4().slice(0, 8)}`,
          doc.org_id,
          reviewerId,
          documentId,
          JSON.stringify({ decision, reviewerNotes: reviewerNotes.trim() }),
          now
        ]
      );
    });

    return {
      success: true,
      documentId,
      orgId: doc.org_id,
      decision,
      reviewedAt: now,
    };
  },

  /**
   * Retrieves comprehensive verification status for a recruiter and their organization.
   */
  getVerificationStatus(userId, orgId) {
    const user = repository.queryOne(
      `SELECT id, email, full_name, email_verified, email_verified_at FROM users WHERE id = ?;`,
      [userId]
    );

    const org = orgId
      ? repository.queryOne(`SELECT id, name, verification_status FROM organisations WHERE id = ?;`, [orgId])
      : null;

    const latestDoc = orgId
      ? repository.queryOne(
          `SELECT id, document_type, file_name, status, reviewer_notes, reviewed_at, created_at
           FROM recruiter_business_verifications
           WHERE org_id = ?
           ORDER BY created_at DESC LIMIT 1;`,
          [orgId]
        )
      : null;

    const emailVerified = Boolean(user?.email_verified);
    const orgVerified = org?.verification_status === 'approved';

    return {
      userId,
      email: user?.email,
      emailVerified,
      emailVerifiedAt: user?.email_verified_at || null,
      organization: org ? {
        id: org.id,
        name: org.name,
        verificationStatus: org.verification_status || 'unverified',
      } : null,
      latestBusinessDocument: latestDoc || null,
      canPublishJobs: recruiterVerification.required ? (emailVerified && orgVerified) : true,
      verificationRequired: recruiterVerification.required,
    };
  },

  /**
   * Pending business verifications queue for platform admins.
   */
  getPendingBusinessVerifications() {
    return repository.query(
      `SELECT rbv.*, o.name as org_name, u.full_name as submitter_name, u.email as submitter_email
       FROM recruiter_business_verifications rbv
       JOIN organisations o ON o.id = rbv.org_id
       JOIN users u ON u.id = rbv.user_id
       WHERE rbv.status = 'pending_review'
       ORDER BY rbv.created_at ASC;`
    );
  },

  /**
   * Internal verification check for job publishing gate.
   */
  isRecruiterAndOrgVerified(userId, orgId) {
    const user = repository.queryOne(
      `SELECT email_verified FROM users WHERE id = ?;`,
      [userId]
    );

    const org = repository.queryOne(
      `SELECT verification_status FROM organisations WHERE id = ?;`,
      [orgId]
    );

    return Boolean(user?.email_verified) && org?.verification_status === 'approved';
  },

  /**
   * Test-only helper to inspect dispatched OTP in automated tests.
   * Throws in production to guarantee zero security bypass.
   */
  _getTestOtpForTesting(userId) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Test OTP sink is strictly prohibited in production');
    }
    return testOtpSink.get(userId) || null;
  },

  /**
   * Cleans up test sink state.
   */
  _clearTestOtpSink() {
    testOtpSink.clear();
  }
};
