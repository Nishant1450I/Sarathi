import { Router } from 'express';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { repository } from '../data/repository.js';
import { candidateService } from '../services/candidateService.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const toggleSchema = z.object({
  isPublic: z.boolean(),
});

// Authenticated: Get or create candidate's shareable passport configuration
router.get('/share', requireAuth, (req, res, next) => {
  try {
    const userId = req.user.id;
    let share = repository.queryOne(
      'SELECT public_id, is_public, created_at FROM passport_shares WHERE user_id = ?;',
      [userId]
    );

    if (!share) {
      const publicId = `pass-${randomBytes(6).toString('hex')}`;
      const now = new Date().toISOString();
      repository.execute(
        `INSERT INTO passport_shares (user_id, public_id, is_public, created_at)
         VALUES (?, ?, 1, ?);`,
        [userId, publicId, now]
      );
      share = {
        public_id: publicId,
        is_public: 1,
        created_at: now,
      };
    }

    res.json({
      success: true,
      data: {
        publicId: share.public_id,
        isPublic: Boolean(share.is_public),
        shareUrl: `/passport/${share.public_id}`,
        createdAt: share.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Authenticated: Toggle public visibility on or off
router.post('/share/toggle', requireAuth, validateBody(toggleSchema), (req, res, next) => {
  try {
    const userId = req.user.id;
    const { isPublic } = req.body;
    const now = new Date().toISOString();

    let share = repository.queryOne(
      'SELECT public_id FROM passport_shares WHERE user_id = ?;',
      [userId]
    );

    let publicId = share?.public_id;
    if (!share) {
      publicId = `pass-${randomBytes(6).toString('hex')}`;
      repository.execute(
        `INSERT INTO passport_shares (user_id, public_id, is_public, created_at)
         VALUES (?, ?, ?, ?);`,
        [userId, publicId, isPublic ? 1 : 0, now]
      );
    } else {
      repository.execute(
        'UPDATE passport_shares SET is_public = ? WHERE user_id = ?;',
        [isPublic ? 1 : 0, userId]
      );
    }

    res.json({
      success: true,
      data: {
        publicId,
        isPublic,
        shareUrl: `/passport/${publicId}`,
      },
      message: isPublic
        ? 'Skill Passport is now publicly visible via share link'
        : 'Skill Passport is now private',
    });
  } catch (err) {
    next(err);
  }
});

// Public: View verified Skill Passport by public ID
router.get('/public/:publicId', (req, res, next) => {
  try {
    const { publicId } = req.params;
    const share = repository.queryOne(
      'SELECT user_id, is_public FROM passport_shares WHERE public_id = ?;',
      [publicId]
    );

    if (!share || !share.is_public) {
      return res.status(404).json({
        error: 'Skill Passport not found or is currently private.',
        code: 'PASSPORT_NOT_FOUND',
      });
    }

    const passport = candidateService.getCandidatePassport(share.user_id);
    if (!passport) {
      return res.status(404).json({
        error: 'Candidate profile details could not be found.',
        code: 'PROFILE_NOT_FOUND',
      });
    }

    res.json({
      success: true,
      data: passport,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
