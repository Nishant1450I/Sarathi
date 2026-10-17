import { repository } from '../data/repository.js';
import { seedLearningResources } from '../data/resourceSeeder.js';

export const resourceService = {
  ensureSeeded() {
    seedLearningResources();
  },

  listResources({ domain = null, skill = null, isFree = null, search = '', bookmarkedOnly = false, userId = null } = {}) {
    this.ensureSeeded();

    let sql = `
      SELECT lr.*,
             CASE WHEN rb.user_id IS NOT NULL THEN 1 ELSE 0 END as is_bookmarked,
             COALESCE(rp.status, 'not_started') as progress_status,
             rp.updated_at as progress_updated_at
      FROM learning_resources lr
      LEFT JOIN resource_bookmarks rb ON rb.resource_id = lr.id AND rb.user_id = ?
      LEFT JOIN resource_progress rp ON rp.resource_id = lr.id AND rp.user_id = ?
      WHERE 1=1
    `;
    const params = [userId || 'anonymous', userId || 'anonymous'];

    if (domain && domain !== 'all') {
      sql += ' AND lr.domain = ?';
      params.push(domain);
    }

    if (isFree !== null && isFree !== undefined && isFree !== 'all') {
      sql += ' AND lr.is_free = ?';
      params.push(isFree === 'true' || isFree === true || isFree === 1 ? 1 : 0);
    }

    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      sql += ' AND (LOWER(lr.title) LIKE ? OR LOWER(lr.provider) LIKE ? OR LOWER(lr.skill_tags) LIKE ?)';
      params.push(q, q, q);
    }

    if (bookmarkedOnly) {
      sql += ' AND rb.user_id IS NOT NULL';
    }

    sql += ' ORDER BY lr.created_at ASC;';

    const rows = repository.query(sql, params);

    return rows.map((r) => {
      let skillTags = [];
      try {
        skillTags = JSON.parse(r.skill_tags);
      } catch {
        skillTags = [];
      }

      return {
        id: r.id,
        domain: r.domain,
        skillTags,
        title: r.title,
        provider: r.provider,
        type: r.type,
        url: r.url,
        isFree: Boolean(r.is_free),
        level: r.level,
        duration: r.duration,
        language: r.language,
        isBookmarked: Boolean(r.is_bookmarked),
        progressStatus: r.progress_status,
        progressUpdatedAt: r.progress_updated_at,
      };
    });
  },

  toggleBookmark(userId, resourceId) {
    this.ensureSeeded();
    const existing = repository.queryOne(
      'SELECT * FROM resource_bookmarks WHERE user_id = ? AND resource_id = ?;',
      [userId, resourceId]
    );

    if (existing) {
      repository.execute(
        'DELETE FROM resource_bookmarks WHERE user_id = ? AND resource_id = ?;',
        [userId, resourceId]
      );
      return { bookmarked: false, resourceId };
    } else {
      const now = new Date().toISOString();
      repository.execute(
        'INSERT INTO resource_bookmarks (user_id, resource_id, created_at) VALUES (?, ?, ?);',
        [userId, resourceId, now]
      );
      return { bookmarked: true, resourceId };
    }
  },

  updateProgress(userId, resourceId, status) {
    this.ensureSeeded();
    const validStatuses = ['not_started', 'in_progress', 'completed'];
    const safeStatus = validStatuses.includes(status) ? status : 'in_progress';
    const now = new Date().toISOString();

    repository.execute(
      `INSERT INTO resource_progress (user_id, resource_id, status, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, resource_id) DO UPDATE SET
         status = excluded.status,
         updated_at = excluded.updated_at;`,
      [userId, resourceId, safeStatus, now]
    );

    return {
      success: true,
      resourceId,
      status: safeStatus,
      updatedAt: now,
    };
  },
};
