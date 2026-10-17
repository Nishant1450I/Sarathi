import { Router } from 'express';
import { z } from 'zod';
import { randomUUID as uuidv4 } from 'node:crypto';
import { repository } from '../data/repository.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const roadmapUpdateSchema = z.object({
  trackKey: z.string().min(1, 'trackKey is required').max(100),
  completedTaskIds: z.array(z.string().max(100)),
});

router.get('/', requireAuth, (req, res, next) => {
  try {
    const userId = req.user.id;
    const { trackKey } = req.query;

    if (trackKey) {
      const row = repository.queryOne(
        'SELECT track_key, completed_task_ids, updated_at FROM student_roadmaps WHERE user_id = ? AND track_key = ?;',
        [userId, String(trackKey)]
      );

      let completedTaskIds = [];
      if (row?.completed_task_ids) {
        try {
          completedTaskIds = JSON.parse(row.completed_task_ids);
        } catch {
          completedTaskIds = [];
        }
      }

      return res.json({
        success: true,
        data: {
          trackKey: String(trackKey),
          completedTaskIds,
          updatedAt: row?.updated_at || null,
        },
      });
    }

    const rows = repository.query(
      'SELECT track_key, completed_task_ids, updated_at FROM student_roadmaps WHERE user_id = ?;',
      [userId]
    );

    const roadmaps = {};
    for (const row of rows) {
      try {
        roadmaps[row.track_key] = JSON.parse(row.completed_task_ids);
      } catch {
        roadmaps[row.track_key] = [];
      }
    }

    res.json({
      success: true,
      data: roadmaps,
    });
  } catch (err) {
    next(err);
  }
});

router.put('/', requireAuth, validateBody(roadmapUpdateSchema), (req, res, next) => {
  try {
    const userId = req.user.id;
    const { trackKey, completedTaskIds } = req.body;
    const now = new Date().toISOString();
    const id = `rdm-${uuidv4().slice(0, 8)}`;
    const jsonStr = JSON.stringify(completedTaskIds);

    repository.execute(
      `INSERT INTO student_roadmaps (id, user_id, track_key, completed_task_ids, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id, track_key) DO UPDATE SET
         completed_task_ids = excluded.completed_task_ids,
         updated_at = excluded.updated_at;`,
      [id, userId, trackKey, jsonStr, now]
    );

    res.json({
      success: true,
      data: {
        trackKey,
        completedTaskIds,
        updatedAt: now,
      },
      message: 'Roadmap progress saved successfully',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
