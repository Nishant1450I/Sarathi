import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID as uuidv4 } from 'node:crypto';
import { repository } from '../data/repository.js';
import { auth as authConfig } from '../config/index.js';

export const authService = {
  async hashPassword(password) {
    return bcrypt.hash(password, 10);
  },

  async comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
  },

  generateToken(user, orgId = null, role = null) {
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.full_name,
      globalRole: user.role,
      orgId: orgId || null,
      orgRole: role || null,
    };
    return jwt.sign(payload, authConfig.secret, { expiresIn: authConfig.expiresIn });
  },

  verifyToken(token) {
    try {
      return jwt.verify(token, authConfig.secret);
    } catch {
      return null;
    }
  },

  findUserByEmailOrId(email, id = null) {
    if (id) {
      return repository.queryOne(
        'SELECT * FROM users WHERE (email = ? OR id = ?) AND deleted_at IS NULL;',
        [email.toLowerCase().trim(), id]
      );
    }
    return repository.queryOne(
      'SELECT * FROM users WHERE email = ? AND deleted_at IS NULL;',
      [email.toLowerCase().trim()]
    );
  },

  async login(email, password, requestedOrgId = null) {
    if (!password) {
      throw new Error('Invalid email or password');
    }

    let searchEmail = (email || '').toLowerCase().trim();
    if (authConfig.enableDemoAuth && (searchEmail === 'recruiter@nextech.com' || searchEmail === 'recruiter@sarathi.local')) {
      searchEmail = 'recruiter@sarathi.ai';
    }

    const user = repository.queryOne(
      'SELECT * FROM users WHERE email = ? AND deleted_at IS NULL;',
      [searchEmail]
    );

    if (!user || !user.password_hash) {
      throw new Error('Invalid email or password');
    }

    const match = await this.comparePassword(password, user.password_hash);
    if (!match) {
      throw new Error('Invalid email or password');
    }

    // Determine organisation membership
    let membership = null;
    if (requestedOrgId) {
      membership = repository.queryOne(
        "SELECT * FROM organisation_memberships WHERE org_id = ? AND user_id = ? AND status = 'active';",
        [requestedOrgId, user.id]
      );
    } else {
      membership = repository.queryOne(
        `SELECT m.*, o.name as org_name, o.slug as org_slug 
         FROM organisation_memberships m 
         JOIN organisations o ON o.id = m.org_id 
         WHERE m.user_id = ? AND m.status = 'active' 
         ORDER BY m.created_at ASC LIMIT 1;`,
        [user.id]
      );
    }

    const orgId = membership?.org_id || null;
    const orgRole = membership?.role || null;
    const token = this.generateToken(user, orgId, orgRole);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        companyName: user.company_name,
        institution: user.institution,
        avatarUrl: user.avatar_url,
      },
      organization: membership ? {
        id: membership.org_id,
        role: membership.role,
        name: membership.org_name || null,
      } : null,
    };
  },

  async getUserById(userId) {
    return repository.queryOne(
      'SELECT id, email, full_name, role, company_name, institution, timezone, avatar_url, created_at FROM users WHERE id = ?;',
      [userId]
    );
  },

  async getUserOrganizations(userId) {
    return repository.query(
      `SELECT o.id, o.name, o.slug, o.timezone, o.currency, m.role, m.status, m.created_at as joined_at
       FROM organisations o
       JOIN organisation_memberships m ON m.org_id = o.id
       WHERE m.user_id = ? AND m.status = 'active'
       ORDER BY o.name ASC;`,
      [userId]
    );
  },

  async getOrCreateRecruiterSession({ email, orgId } = {}) {
    const targetEmail = (email || 'recruiter@sarathi.local').toLowerCase().trim();
    let recruiter = repository.queryOne(
      "SELECT * FROM users WHERE email = ? AND role = 'recruiter' AND deleted_at IS NULL;",
      [targetEmail]
    );
    if (!recruiter) {
      recruiter = repository.queryOne(
        "SELECT * FROM users WHERE role = 'recruiter' AND deleted_at IS NULL LIMIT 1;"
      );
    }
    if (!recruiter) {
      throw new Error('No active recruiter account found');
    }

    const targetOrgId = orgId || 'org-demo-1';
    let membership = repository.queryOne(
      "SELECT * FROM organisation_memberships WHERE org_id = ? AND user_id = ? AND status = 'active';",
      [targetOrgId, recruiter.id]
    );
    if (!membership) {
      membership = repository.queryOne(
        "SELECT * FROM organisation_memberships WHERE user_id = ? AND status = 'active' LIMIT 1;",
        [recruiter.id]
      );
    }

    const resolvedOrgId = membership?.org_id || targetOrgId;
    const resolvedOrgRole = membership?.role || 'recruiter';
    const token = this.generateToken(recruiter, resolvedOrgId, resolvedOrgRole);

    return {
      token,
      user: {
        id: recruiter.id,
        email: recruiter.email,
        fullName: recruiter.full_name,
        role: recruiter.role,
        orgId: resolvedOrgId,
        orgRole: resolvedOrgRole,
      },
      organization: {
        id: resolvedOrgId,
        role: resolvedOrgRole,
      }
    };
  },

  async getOrCreateStudentSession({ id, email, fullName, institution, targetRole, bio } = {}) {
    if (!email) {
      throw new Error('Email is required for student session');
    }
    const cleanEmail = email.toLowerCase().trim();
    const cleanName = (fullName || cleanEmail.split('@')[0].replace(/[._-]/g, ' ')).trim();
    const cleanId = id || `usr-student-${cleanEmail.replace(/[^a-z0-9]/g, '-')}`;
    const now = new Date().toISOString();

    const candidate = repository.transaction((repo) => {
      let existingUser = repo.queryOne(
        'SELECT * FROM users WHERE email = ? OR id = ?;',
        [cleanEmail, cleanId]
      );

      let finalUserId = cleanId;

      if (!existingUser) {
        repo.execute(
          `INSERT INTO users (id, email, full_name, role, institution, created_at, updated_at)
           VALUES (?, ?, ?, 'candidate', ?, ?, ?);`,
          [cleanId, cleanEmail, cleanName, institution || '', now, now]
        );
      } else {
        finalUserId = existingUser.id;
        repo.execute(
          `UPDATE users SET full_name = COALESCE(?, full_name), institution = COALESCE(?, institution), updated_at = ?
           WHERE id = ?;`,
          [cleanName, institution || null, now, finalUserId]
        );
      }

      const existingProfile = repo.queryOne(
        'SELECT id FROM candidate_profiles WHERE id = ?;',
        [finalUserId]
      );

      if (!existingProfile) {
        repo.execute(
          `INSERT INTO candidate_profiles (
            id, headline, target_role, bio, experience_years, location,
            work_preference, visibility, created_at, updated_at
          ) VALUES (?, ?, ?, ?, 0, 'India', 'flexible', 'public', ?, ?);`,
          [
            finalUserId,
            targetRole ? `Aspiring ${targetRole}` : 'Student Candidate',
            targetRole || 'Full-Stack Developer',
            bio || 'Dedicated student eager to demonstrate verified capabilities.',
            now,
            now
          ]
        );
      }

      return repo.queryOne(
        `SELECT u.id, u.email, u.full_name, u.role, u.institution,
                cp.headline, cp.target_role, cp.bio
         FROM users u
         JOIN candidate_profiles cp ON cp.id = u.id
         WHERE u.id = ?;`,
        [finalUserId]
      );
    });

    const token = this.generateToken(candidate, null, 'candidate');

    return {
      token,
      user: {
        id: candidate.id,
        email: candidate.email,
        fullName: candidate.full_name,
        role: candidate.role,
        institution: candidate.institution,
        headline: candidate.headline,
        targetRole: candidate.target_role,
      }
    };
  }
};
