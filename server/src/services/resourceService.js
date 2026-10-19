import { repository } from '../data/repository.js';
import { seedLearningResources } from '../data/resourceSeeder.js';
import { v4 as uuidv4 } from 'uuid';

export const resourceService = {
  ensureSeeded() {
    seedLearningResources();
  },

  listResources({
    domain = null,
    skill = null,
    isFree = null,
    level = null,
    status = null,
    collection = null,
    search = '',
    bookmarkedOnly = false,
    userId = null
  } = {}) {
    this.ensureSeeded();

    let sql = `
      SELECT lr.*,
             CASE WHEN rb.user_id IS NOT NULL THEN 1 ELSE 0 END as is_bookmarked,
             COALESCE(rb.collection_name, 'my_list') as collection_name,
             COALESCE(rp.status, 'not_started') as progress_status,
             COALESCE(rp.percent_complete, 0) as percent_complete,
             COALESCE(rp.notes, '') as progress_notes,
             rp.completed_at as progress_completed_at,
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

    if (level && level !== 'all') {
      sql += ' AND LOWER(lr.level) = LOWER(?)';
      params.push(level);
    }

    if (isFree !== null && isFree !== undefined && isFree !== 'all') {
      sql += ' AND lr.is_free = ?';
      params.push(isFree === 'true' || isFree === true || isFree === 1 ? 1 : 0);
    }

    if (status && status !== 'all') {
      sql += ' AND COALESCE(rp.status, \'not_started\') = ?';
      params.push(status);
    }

    if (collection && collection !== 'all') {
      sql += ' AND rb.user_id IS NOT NULL AND rb.collection_name = ?';
      params.push(collection);
    }

    if (skill && skill.trim()) {
      const s = `%${skill.trim().toLowerCase()}%`;
      sql += ' AND LOWER(lr.skill_tags) LIKE ?';
      params.push(s);
    }

    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      sql += ' AND (LOWER(lr.title) LIKE ? OR LOWER(lr.provider) LIKE ? OR LOWER(lr.skill_tags) LIKE ? OR LOWER(lr.description) LIKE ?)';
      params.push(q, q, q, q);
    }

    if (bookmarkedOnly) {
      sql += ' AND rb.user_id IS NOT NULL';
    }

    sql += ' ORDER BY lr.created_at ASC;';

    const rows = repository.query(sql, params);

    return rows.map((r) => {
      let skillTags = [];
      try {
        skillTags = JSON.parse(r.skill_tags || '[]');
      } catch {
        skillTags = [];
      }

      let learningObjectives = [];
      try {
        learningObjectives = JSON.parse(r.learning_objectives || '[]');
      } catch {
        learningObjectives = [];
      }

      let prerequisites = [];
      try {
        prerequisites = JSON.parse(r.prerequisites || '[]');
      } catch {
        prerequisites = [];
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
        description: r.description || '',
        learningObjectives,
        prerequisites,
        isBookmarked: Boolean(r.is_bookmarked),
        collectionName: r.collection_name,
        progressStatus: r.progress_status,
        percentComplete: Number(r.percent_complete) || 0,
        progressNotes: r.progress_notes || '',
        completedAt: r.progress_completed_at,
        progressUpdatedAt: r.progress_updated_at,
      };
    });
  },

  toggleBookmark(userId, resourceId, collectionName = 'my_list') {
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
      return { bookmarked: false, resourceId, collectionName: null };
    } else {
      const now = new Date().toISOString();
      const safeCollection = collectionName || 'my_list';
      repository.execute(
        'INSERT INTO resource_bookmarks (user_id, resource_id, collection_name, created_at) VALUES (?, ?, ?, ?);',
        [userId, resourceId, safeCollection, now]
      );
      return { bookmarked: true, resourceId, collectionName: safeCollection };
    }
  },

  updateProgress(userId, resourceId, { status = 'in_progress', percentComplete = null, notes = null } = {}) {
    this.ensureSeeded();
    const validStatuses = ['not_started', 'in_progress', 'completed'];
    const safeStatus = validStatuses.includes(status) ? status : 'in_progress';
    const now = new Date().toISOString();

    let effPercent = percentComplete;
    if (effPercent === null || effPercent === undefined) {
      if (safeStatus === 'completed') effPercent = 100;
      else if (safeStatus === 'not_started') effPercent = 0;
      else effPercent = 25;
    }
    effPercent = Math.max(0, Math.min(100, Math.round(Number(effPercent) || 0)));

    const completedAt = safeStatus === 'completed' ? now : null;

    repository.execute(
      `INSERT INTO resource_progress (user_id, resource_id, status, percent_complete, notes, completed_at, updated_at)
       VALUES (?, ?, ?, ?, COALESCE(?, ''), ?, ?)
       ON CONFLICT(user_id, resource_id) DO UPDATE SET
         status = excluded.status,
         percent_complete = excluded.percent_complete,
         notes = CASE WHEN excluded.notes != '' THEN excluded.notes ELSE resource_progress.notes END,
         completed_at = CASE WHEN excluded.status = 'completed' THEN COALESCE(resource_progress.completed_at, excluded.completed_at) ELSE NULL END,
         updated_at = excluded.updated_at;`,
      [userId, resourceId, safeStatus, effPercent, notes, completedAt, now]
    );

    return {
      success: true,
      resourceId,
      status: safeStatus,
      percentComplete: effPercent,
      completedAt,
      updatedAt: now,
    };
  },

  getRecommendations(userId, { targetRole = '', domainId = '' } = {}) {
    this.ensureSeeded();
    const allResources = this.listResources({ userId });

    // Retrieve candidate profile and skills
    let candidateRole = targetRole;
    let candidateSkills = [];
    if (userId) {
      const profile = repository.queryOne('SELECT target_role FROM candidate_profiles WHERE id = ?;', [userId]);
      if (profile?.target_role && !candidateRole) {
        candidateRole = profile.target_role;
      }

      candidateSkills = repository.query(
        `SELECT cs.*, s.name as skill_name, s.category as skill_category
         FROM candidate_skills cs
         JOIN skills s ON s.id = cs.skill_id
         WHERE cs.candidate_id = ?;`,
        [userId]
      );
    }

    const candidateSkillMap = new Map();
    candidateSkills.forEach(cs => {
      candidateSkillMap.set((cs.skill_name || '').toLowerCase(), cs);
    });

    // Score and annotate each resource
    return allResources.map(resource => {
      let score = 0;
      let reasons = [];

      // Check role relevance
      const targetLower = (candidateRole || '').toLowerCase();
      const domainLower = (domainId || '').toLowerCase();

      // Check if domain matches
      if (domainLower && resource.domain.toLowerCase().includes(domainLower.replace('dom-', ''))) {
        score += 30;
        reasons.push('Matches your selected technical domain');
      }

      // Check if resource skill tags intersect with candidate's unverified or low-proficiency skills
      let matchingGapSkill = null;
      for (const tag of resource.skillTags) {
        const tagLower = tag.toLowerCase();
        const existingSkill = candidateSkillMap.get(tagLower);

        if (!existingSkill) {
          // Missing skill
          if (targetLower.includes('full-stack') || targetLower.includes('web') || targetLower.includes('developer')) {
            score += 25;
            matchingGapSkill = tag;
          }
        } else if (existingSkill.proficiency < 3 || existingSkill.verification_status === 'self_reported') {
          score += 35;
          matchingGapSkill = tag;
          reasons.push(`Targeted to elevate your proficiency in ${tag}`);
          break;
        }
      }

      if (matchingGapSkill && !reasons.some(r => r.includes(matchingGapSkill))) {
        reasons.push(`Covers ${matchingGapSkill} required for ${candidateRole || 'software engineering careers'}`);
      }

      // If user is actively progressing on it
      if (resource.progressStatus === 'in_progress') {
        score += 15;
        reasons.push('Currently in progress — continue learning');
      }

      // Free resource bonus
      if (resource.isFree) {
        score += 5;
      }

      const isRecommended = score >= 30;
      const recommendationReason = reasons.length > 0
        ? reasons[0]
        : `Recommended foundational resource for ${candidateRole || 'technology roles'}`;

      return {
        ...resource,
        isRecommended,
        recommendationScore: score,
        recommendationReason,
      };
    }).sort((a, b) => b.recommendationScore - a.recommendationScore);
  },

  addLearningEvidenceToPassport(userId, resourceId) {
    this.ensureSeeded();
    const resource = repository.queryOne(
      'SELECT * FROM learning_resources WHERE id = ?;',
      [resourceId]
    );

    if (!resource) {
      throw new Error('Resource not found');
    }

    let skillTags = [];
    try {
      skillTags = JSON.parse(resource.skill_tags || '[]');
    } catch {
      skillTags = [];
    }

    const now = new Date().toISOString();
    let createdCount = 0;
    const addedEvidenceIds = [];

    repository.transaction(repo => {
      for (const skillName of skillTags) {
        // Find or locate skill in taxonomy
        let skillRow = repo.queryOne(
          'SELECT id FROM skills WHERE LOWER(name) = LOWER(?);',
          [skillName.trim()]
        );

        if (!skillRow) {
          // Link to general domain skill or create platform skill
          const domainId = resource.domain || 'dom-frontend';
          const newSkillId = `skl-${uuidv4().slice(0, 8)}`;
          repo.execute(
            `INSERT OR IGNORE INTO skills (id, domain_id, name, description, category, created_at, updated_at)
             VALUES (?, ?, ?, ?, 'Technical', ?, ?);`,
            [newSkillId, domainId, skillName.trim(), `Skill acquired through ${resource.title}`, now, now]
          );
          skillRow = repo.queryOne('SELECT id FROM skills WHERE LOWER(name) = LOWER(?);', [skillName.trim()]);
        }

        if (!skillRow) continue;

        const metadata = JSON.stringify({
          provider: resource.provider,
          duration: resource.duration,
          learningResourceType: resource.type,
          level: resource.level,
          evidenceSource: 'Learning Library Completion',
          completedAt: now,
        });

        // Insert learning evidence (clearly labeled as self_reported / learning evidence - NEVER verified!)
        const evidenceId = `se-learn-${uuidv4().slice(0, 8)}`;
        repo.execute(
          `INSERT INTO skill_evidence (
            id, candidate_id, skill_id, evidence_type, title, reference_url, metadata, source, verification_status, created_at, updated_at
          ) VALUES (?, ?, ?, 'course', ?, ?, ?, 'learning_library', 'self_reported', ?, ?);`,
          [
            evidenceId,
            userId,
            skillRow.id,
            `Completed: ${resource.title}`,
            resource.url,
            metadata,
            now,
            now
          ]
        );
        addedEvidenceIds.push(evidenceId);
        createdCount++;

        // Ensure candidate_skills record exists without falsely asserting verified proficiency
        const existingCS = repo.queryOne(
          'SELECT * FROM candidate_skills WHERE candidate_id = ? AND skill_id = ?;',
          [userId, skillRow.id]
        );

        if (!existingCS) {
          repo.execute(
            `INSERT INTO candidate_skills (
              id, candidate_id, skill_id, proficiency, verification_status, source, notes, created_at, updated_at
            ) VALUES (?, ?, ?, 1, 'self_reported', 'learning_library', 'Supported by completed learning resource evidence', ?, ?);`,
            [`cs-${uuidv4().slice(0, 8)}`, userId, skillRow.id, now, now]
          );
        }
      }
    });

    return {
      success: true,
      createdCount,
      evidenceIds: addedEvidenceIds,
      resourceTitle: resource.title,
      skillsCredited: skillTags,
      message: `Added learning evidence for ${skillTags.join(', ')} to your Skill Passport.`
    };
  }
};
