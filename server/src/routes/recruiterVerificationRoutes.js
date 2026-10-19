import { Router } from 'express';
import { z } from 'zod';
import { recruiterVerificationService } from '../services/recruiterVerificationService.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validate.js';
import { createAuthRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

const RECRUITER_ROLES = ['platform_admin', 'org_owner', 'recruiter'];

const otpRateLimiter = createAuthRateLimiter({
  prefix: 'recruiter_otp',
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 5 requests per 15 minutes
});

const confirmOtpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, 'Verification code must be exactly 6 digits'),
});

const documentUploadSchema = z.object({
  documentType: z.enum(['gstin', 'incorporation_cert', 'tax_id', 'business_pan'], {
    errorMap: () => ({ message: 'Document type must be one of: gstin, incorporation_cert, tax_id, business_pan' })
  }),
  fileName: z.string().min(1, 'File name is required').max(255),
  fileContentBase64: z.string().min(1, 'File content (base64) is required'),
});

const adminDecisionSchema = z.object({
  decision: z.enum(['approved', 'rejected', 'resubmission_required'], {
    errorMap: () => ({ message: 'Decision must be approved, rejected, or resubmission_required' })
  }),
  reviewerNotes: z.string().min(10, 'Reviewer notes must be at least 10 characters for audit compliance'),
});

// 1. Send / Resend Email Verification OTP
router.post('/email/send-otp', requireAuth, requireRole(RECRUITER_ROLES), otpRateLimiter, async (req, res, next) => {
  try {
    const result = await recruiterVerificationService.sendEmailOtp(req.user.id, req.user.email);
    res.json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        error: { code: err.code || 'OTP_ERROR', message: err.message },
        message: err.message,
      });
    }
    next(err);
  }
});

// 2. Confirm Email Verification OTP
router.post('/email/confirm-otp', requireAuth, validateBody(confirmOtpSchema), async (req, res, next) => {
  try {
    const result = await recruiterVerificationService.confirmEmailOtp(req.user.id, req.body.otp);
    res.json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        error: {
          code: err.code || 'OTP_CONFIRM_ERROR',
          message: err.message,
          remainingAttempts: err.remainingAttempts,
        },
        message: err.message,
        remainingAttempts: err.remainingAttempts,
      });
    }
    next(err);
  }
});

// 3. Submit Business Verification Document
router.post('/business/document', requireAuth, requireRole(RECRUITER_ROLES), validateBody(documentUploadSchema), async (req, res, next) => {
  try {
    if (!req.orgId) {
      return res.status(403).json({
        error: { code: 'ORG_CONTEXT_REQUIRED', message: 'Organization context required for business verification' }
      });
    }

    const { documentType, fileName, fileContentBase64 } = req.body;
    const result = await recruiterVerificationService.submitBusinessDocument({
      orgId: req.orgId,
      userId: req.user.id,
      documentType,
      fileName,
      fileContentBase64,
    });

    res.status(201).json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        error: { code: err.code || 'UPLOAD_ERROR', message: err.message },
        message: err.message,
      });
    }
    next(err);
  }
});

// 4. Download / Inspect Verification Document (Authenticated & Role-Checked)
router.get('/business/document/:id/download', requireAuth, (req, res, next) => {
  try {
    const fileInfo = recruiterVerificationService.getDocumentForDownload(req.params.id, req.user, req.orgId);
    res.setHeader('Content-Type', fileInfo.mimeType);
    res.download(fileInfo.filePath, fileInfo.fileName);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        error: { code: err.code || 'DOWNLOAD_ERROR', message: err.message },
        message: err.message,
      });
    }
    next(err);
  }
});

// 5. Verification Status Check
router.get('/status', requireAuth, (req, res, next) => {
  try {
    const status = recruiterVerificationService.getVerificationStatus(req.user.id, req.orgId);
    res.json({
      success: true,
      data: status,
    });
  } catch (err) {
    next(err);
  }
});

// 6. Admin Review Queue: List Pending Business Verifications
router.get('/admin/business/pending', requireAuth, requireRole(['platform_admin']), (req, res, next) => {
  try {
    const pending = recruiterVerificationService.getPendingBusinessVerifications();
    res.json({
      success: true,
      count: pending.length,
      data: pending,
    });
  } catch (err) {
    next(err);
  }
});

// 7. Admin Review Decision
router.post('/admin/business/:id/decision', requireAuth, requireRole(['platform_admin']), validateBody(adminDecisionSchema), (req, res, next) => {
  try {
    const { decision, reviewerNotes } = req.body;
    const result = recruiterVerificationService.submitBusinessVerificationDecision({
      documentId: req.params.id,
      reviewerId: req.user.id,
      decision,
      reviewerNotes,
    });
    res.json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        error: { code: err.code || 'DECISION_ERROR', message: err.message },
        message: err.message,
      });
    }
    next(err);
  }
});

export default router;
