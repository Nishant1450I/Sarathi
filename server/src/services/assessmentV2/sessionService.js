import { randomUUID as uuidv4 } from 'node:crypto';
import { initDb } from '../../config/db.js';
import { assessmentV2 } from '../../config/index.js';
import { QuestionBankService } from './questionBankService.js';

export class SessionService {
  /**
   * Create a new assessment session
   */
  static createSession({ userId, mode = 'practice', domainId, role = 'Software Engineer', scope = 'full', consent = {}, accommodation = {} }) {
    const db = initDb();

    if (mode === 'secure' && (!consent || !consent.agreed)) {
      throw new Error('Consent is required to start a Secure assessment session.');
    }

    const clientQuestions = QuestionBankService.sampleQuestionsForSession(domainId, role, scope);
    const questionIds = clientQuestions.map(q => q.id);

    // Calculate time limit
    const baseMinutes = scope === 'quiz_only' ? 20 : scope === 'practical_only' ? 35 : 45;
    const multiplier = Number(accommodation?.extendedTimeMultiplier || (accommodation?.extendedTime ? 1.5 : 1.0));
    const totalMinutes = Math.round(baseMinutes * multiplier);

    const now = new Date();
    const expires = new Date(now.getTime() + totalMinutes * 60 * 1000);

    const sessionId = `sess-${Date.now()}-${uuidv4().slice(0, 8)}`;
    const startedAt = now.toISOString();
    const expiresAt = expires.toISOString();
    const deadlineAt = expiresAt;

    const rules = {
      timeLimitMinutes: totalMinutes,
      pasteAllowed: mode === 'practice' || Boolean(accommodation?.disabledRestrictions || accommodation?.screenReaderMode),
      blurTracking: mode === 'secure',
      cameraRequired: mode === 'secure' && assessmentV2.cameraEnabled,
      accommodationsAllowed: true,
    };

    const sessionData = {
      consent,
      rules,
      draftAnswers: {},
    };

    db.prepare(`
      INSERT INTO assessment_sessions (
        id, user_id, mode, domain_id, role, question_ids, bank_version,
        status, started_at, expires_at, deadline_at, save_version,
        consent_json, accommodation_json, engine_version
      ) VALUES (?, ?, ?, ?, ?, ?, 1, 'in_progress', ?, ?, ?, 1, ?, ?, 'v2')
    `).run(
      sessionId,
      userId,
      mode,
      domainId,
      role,
      JSON.stringify(questionIds),
      startedAt,
      expiresAt,
      deadlineAt,
      JSON.stringify(sessionData),
      JSON.stringify(accommodation)
    );

    return {
      sessionId,
      mode,
      domainId,
      role,
      status: 'in_progress',
      startedAt,
      expiresAt,
      deadlineAt,
      saveVersion: 1,
      questions: clientQuestions,
      rules,
      accommodation,
    };
  }

  /**
   * Resume an existing session by ID
   */
  static getSession(sessionId, userId) {
    const db = initDb();
    const session = db.prepare(`
      SELECT * FROM assessment_sessions WHERE id = ?
    `).get(sessionId);

    if (!session) {
      const err = new Error('Assessment session not found.');
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (session.user_id !== userId) {
      const err = new Error('Unauthorized to access this assessment session.');
      err.code = 'FORBIDDEN';
      throw err;
    }

    // Check expiration
    const now = new Date();
    const expires = new Date(session.deadline_at || session.expires_at);
    if (session.status === 'in_progress' && now > expires) {
      db.prepare(`UPDATE assessment_sessions SET status = 'expired' WHERE id = ?`).run(sessionId);
      session.status = 'expired';
    }

    let questionIds = [];
    try { questionIds = JSON.parse(session.question_ids || '[]'); } catch {}

    const questions = QuestionBankService.sampleQuestionsForSession(session.domain_id);
    const filteredQuestions = questions.filter(q => questionIds.includes(q.id));

    let sessionData = {};
    try { sessionData = JSON.parse(session.consent_json || '{}'); } catch {}

    let accommodation = {};
    try { accommodation = JSON.parse(session.accommodation_json || '{}'); } catch {}

    // Fetch latest code snapshots
    const snapshots = db.prepare(`
      SELECT question_id, code, language, reason, created_at
      FROM submission_snapshots
      WHERE session_id = ?
      ORDER BY created_at DESC
    `).all(sessionId);

    const latestSnapshots = {};
    for (const s of snapshots) {
      if (!latestSnapshots[s.question_id]) {
        latestSnapshots[s.question_id] = s;
      }
    }

    return {
      sessionId: session.id,
      mode: session.mode,
      domainId: session.domain_id,
      role: session.role,
      status: session.status,
      startedAt: session.started_at,
      expiresAt: session.expires_at,
      deadlineAt: session.deadline_at || session.expires_at,
      saveVersion: session.save_version || 1,
      questions: filteredQuestions,
      rules: sessionData.rules || {
        timeLimitMinutes: 45,
        pasteAllowed: session.mode === 'practice',
        blurTracking: session.mode === 'secure',
        cameraRequired: false,
        accommodationsAllowed: true,
      },
      accommodation,
      draftAnswers: sessionData.draftAnswers || {},
      snapshots: latestSnapshots,
    };
  }

  /**
   * Lightweight session state retrieval for authoritative sync and resume
   */
  static getSessionState(sessionId, userId) {
    const db = initDb();
    const session = db.prepare(`
      SELECT id, user_id, mode, status, started_at, expires_at, deadline_at, save_version, consent_json
      FROM assessment_sessions WHERE id = ?
    `).get(sessionId);

    if (!session) {
      const err = new Error('Assessment session not found.');
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (session.user_id !== userId) {
      const err = new Error('Unauthorized to access this assessment session.');
      err.code = 'FORBIDDEN';
      throw err;
    }

    const deadlineStr = session.deadline_at || session.expires_at;
    const deadlineMs = new Date(deadlineStr).getTime();
    const remainingSeconds = Math.max(0, Math.floor((deadlineMs - Date.now()) / 1000));

    let sessionData = {};
    try { sessionData = JSON.parse(session.consent_json || '{}'); } catch {}

    // Fetch latest code snapshots
    const snapshots = db.prepare(`
      SELECT question_id, code, language, reason, created_at
      FROM submission_snapshots
      WHERE session_id = ?
      ORDER BY created_at DESC
    `).all(sessionId);

    const latestSnapshots = {};
    for (const s of snapshots) {
      if (!latestSnapshots[s.question_id]) {
        latestSnapshots[s.question_id] = s;
      }
    }

    return {
      sessionId: session.id,
      status: session.status,
      startedAt: session.started_at,
      deadlineAt: deadlineStr,
      remainingSeconds,
      saveVersion: session.save_version || 1,
      draftAnswers: sessionData.draftAnswers || {},
      snapshots: latestSnapshots,
      lastSavedAt: new Date().toISOString(),
    };
  }

  /**
   * Autosave answers (MCQ choices and explanation text) with optimistic version control
   */
  static saveAnswers(sessionId, userId, answers, clientSaveVersion = undefined) {
    const db = initDb();
    const session = db.prepare(`SELECT * FROM assessment_sessions WHERE id = ?`).get(sessionId);

    if (!session || session.user_id !== userId) {
      const err = new Error('Session not found or unauthorized.');
      err.code = 'FORBIDDEN';
      throw err;
    }

    if (session.status !== 'in_progress') {
      const err = new Error(`Cannot update answers for session in status: ${session.status}`);
      err.code = 'INVALID_STATE';
      throw err;
    }

    const currentVersion = Number(session.save_version || 1);

    // Version conflict detection for concurrent/stale tab edits
    if (clientSaveVersion !== undefined && Number(clientSaveVersion) < currentVersion) {
      const err = new Error(`Save conflict: client saveVersion ${clientSaveVersion} is behind server version ${currentVersion}.`);
      err.code = 'VERSION_CONFLICT';
      throw err;
    }

    let sessionData = {};
    try { sessionData = JSON.parse(session.consent_json || '{}'); } catch {}

    sessionData.draftAnswers = {
      ...(sessionData.draftAnswers || {}),
      ...answers,
    };

    const nextVersion = currentVersion + 1;

    db.prepare(`
      UPDATE assessment_sessions
      SET consent_json = ?, save_version = ?
      WHERE id = ?
    `).run(JSON.stringify(sessionData), nextVersion, sessionId);

    return { success: true, savedAt: new Date().toISOString(), saveVersion: nextVersion };
  }

  /**
   * Save a code snapshot
   */
  static saveSnapshot(sessionId, userId, { questionId, code, language = 'javascript', reason = 'autosave' }) {
    const db = initDb();
    const session = db.prepare(`SELECT * FROM assessment_sessions WHERE id = ?`).get(sessionId);

    if (!session || session.user_id !== userId) {
      const err = new Error('Session not found or unauthorized.');
      err.code = 'FORBIDDEN';
      throw err;
    }

    if (session.status !== 'in_progress') {
      const err = new Error('Session is no longer active.');
      err.code = 'INVALID_STATE';
      throw err;
    }

    // Size limit check (20 KB max)
    const codeBytes = Buffer.byteLength(code || '', 'utf8');
    if (codeBytes > assessmentV2.codeMaxBytes) {
      const err = new Error(`Code size (${codeBytes} bytes) exceeds limit of ${assessmentV2.codeMaxBytes} bytes.`);
      err.code = 'PAYLOAD_TOO_LARGE';
      throw err;
    }

    const snapshotId = `snap-${Date.now()}-${uuidv4().slice(0, 6)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO submission_snapshots (id, session_id, question_id, code, language, reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(snapshotId, sessionId, questionId, code, language, reason, now);

    return { success: true, snapshotId, timestamp: now };
  }
}
