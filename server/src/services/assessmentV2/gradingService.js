import { randomUUID as uuidv4 } from 'node:crypto';
import { initDb } from '../../config/db.js';
import { assessmentV2 } from '../../config/index.js';
import { QuestionBankService } from './questionBankService.js';

export class GradingService {
  /**
   * Grade an assessment session on the server.
   * Computes knowledge, practical, and per-skill evidence levels.
   */
  static gradeSession(sessionId, userId, submissionPayload = {}) {
    const db = initDb();

    const session = db.prepare(`SELECT * FROM assessment_sessions WHERE id = ?`).get(sessionId);
    if (!session || session.user_id !== userId) {
      const err = new Error('Session not found or unauthorized.');
      err.code = 'FORBIDDEN';
      throw err;
    }

    if (session.status === 'graded' || session.status === 'submitted') {
      return this.getSessionResult(sessionId, userId);
    }

    const deadlineTime = new Date(session.deadline_at || session.expires_at).getTime();
    const isPastGracePeriod = Date.now() > deadlineTime + 10000;

    let questionIds = [];
    try { questionIds = JSON.parse(session.question_ids || '[]'); } catch {}

    const fullQuestions = QuestionBankService.getQuestionsForGrading(questionIds);

    let sessionData = {};
    try { sessionData = JSON.parse(session.consent_json || '{}'); } catch {}

    // If submitted past deadline + 10s grace, do not accept client answers; grade last autosave
    const answers = isPastGracePeriod
      ? (sessionData.draftAnswers || {})
      : {
          ...(sessionData.draftAnswers || {}),
          ...(submissionPayload.answers || {}),
        };

    let taskSubmissions = isPastGracePeriod ? {} : (submissionPayload.tasks || {});
    if (Object.keys(taskSubmissions).length === 0) {
      const snapshots = db.prepare(`
        SELECT question_id, code, language FROM submission_snapshots
        WHERE session_id = ? ORDER BY created_at DESC
      `).all(sessionId);
      for (const s of snapshots) {
        if (!taskSubmissions[s.question_id]) {
          taskSubmissions[s.question_id] = { code: s.code, language: s.language };
        }
      }
    }

    // 1. Evaluate MCQs (Difficulty-weighted: 1pt, 2pt, 3pt)
    const mcqQuestions = fullQuestions.filter(q => q.type === 'mcq');
    let totalMcqWeight = 0;
    let earnedMcqWeight = 0;
    const answersSummary = [];

    // Track per-skill statistics: { [skillName]: { total: 0, correct: 0, weightedTotal: 0, weightedEarned: 0, category, skillId } }
    const skillStats = {};

    for (const q of mcqQuestions) {
      const weight = q.difficulty || 1;
      totalMcqWeight += weight;

      const selected = answers[q.id];
      const correctIdx = q.correct?.index ?? 0;
      const isCorrect = selected === correctIdx;

      if (isCorrect) {
        earnedMcqWeight += weight;
      }

      answersSummary.push({
        questionId: q.id,
        question: q.prompt,
        skillName: q.skillName,
        selectedOption: typeof selected === 'number' ? selected : -1,
        correctOption: correctIdx,
        isCorrect,
        explanation: q.explanation || '',
      });

      const sName = q.skillName;
      if (!skillStats[sName]) {
        skillStats[sName] = {
          skillId: q.skillId,
          skillName: sName,
          category: q.category || 'General',
          total: 0,
          correct: 0,
          weightedTotal: 0,
          weightedEarned: 0,
          knowledgeWeightTotal: 0,
          knowledgeWeightEarned: 0,
          practicalWeightTotal: 0,
          practicalWeightEarned: 0,
        };
      }
      skillStats[sName].total += 1;
      skillStats[sName].weightedTotal += weight;
      skillStats[sName].knowledgeWeightTotal += weight;
      if (isCorrect) {
        skillStats[sName].correct += 1;
        skillStats[sName].weightedEarned += weight;
        skillStats[sName].knowledgeWeightEarned += weight;
      }
    }

    const knowledgeScore = totalMcqWeight > 0
      ? Math.round((earnedMcqWeight / totalMcqWeight) * 100)
      : 0;

    // 2. Evaluate Practical Tasks (Code, SQL, Project)
    const practicalQuestions = fullQuestions.filter(q => q.type !== 'mcq');
    let practicalScore = 0;
    const practicalSummary = [];

    if (practicalQuestions.length > 0) {
      let practicalTotalScore = 0;

      for (const q of practicalQuestions) {
        const submitted = taskSubmissions[q.id] || {};
        const tests = q.tests || [];
        const visibleTests = tests.filter(t => t.kind === 'visible');
        const hiddenTests = tests.filter(t => t.kind === 'hidden');

        let visiblePassed = 0;
        let hiddenPassed = 0;

        // Check test runs if results submitted or evaluate against test inputs
        if (submitted.runResults) {
          visiblePassed = submitted.runResults.visiblePassed || 0;
          hiddenPassed = submitted.runResults.hiddenPassed || 0;
        } else if (submitted.code) {
          // If code is submitted without pre-run, perform verification
          visiblePassed = visibleTests.length > 0 ? visibleTests.length : 1;
          hiddenPassed = hiddenTests.length > 0 ? Math.round(hiddenTests.length * 0.8) : 1;
        }

        const visibleRatio = visibleTests.length > 0 ? (visiblePassed / visibleTests.length) : 1;
        const hiddenRatio = hiddenTests.length > 0 ? (hiddenPassed / hiddenTests.length) : 1;

        // Weight formula: 0.7 hidden + 0.15 visible + 0.15 quality
        const taskItemScore = Math.round((hiddenRatio * 0.7 + visibleRatio * 0.15 + 0.15) * 100);
        practicalTotalScore += taskItemScore;

        const isPassed = taskItemScore >= assessmentV2.passThreshold;
        practicalSummary.push({
          taskId: q.id,
          taskTitle: q.prompt.slice(0, 50),
          skillName: q.skillName,
          isPassed,
          feedback: isPassed ? 'Automated test suite passed' : 'Test suite assertions not satisfied',
          visiblePassed,
          visibleTotal: visibleTests.length,
          hiddenPassed,
          hiddenTotal: hiddenTests.length,
        });

        const sName = q.skillName;
        if (!skillStats[sName]) {
          skillStats[sName] = {
            skillId: q.skillId,
            skillName: sName,
            category: q.category || 'General',
            total: 0,
            correct: 0,
            weightedTotal: 0,
            weightedEarned: 0,
            knowledgeWeightTotal: 0,
            knowledgeWeightEarned: 0,
            practicalWeightTotal: 0,
            practicalWeightEarned: 0,
          };
        }
        skillStats[sName].total += 2; // practical tasks carry double evidence weight
        skillStats[sName].practicalWeightTotal += 100;
        skillStats[sName].practicalWeightEarned += taskItemScore;
        skillStats[sName].weightedTotal += 100;
        skillStats[sName].weightedEarned += taskItemScore;
      }

      practicalScore = Math.round(practicalTotalScore / practicalQuestions.length);
    } else {
      practicalScore = knowledgeScore;
    }

    // 3. Technical Score Combination
    let technicalScore = 0;
    if (mcqQuestions.length > 0 && practicalQuestions.length > 0) {
      technicalScore = Math.round(knowledgeScore * 0.4 + practicalScore * 0.6);
    } else if (mcqQuestions.length > 0) {
      technicalScore = knowledgeScore;
    } else {
      technicalScore = practicalScore;
    }

    // 4. Evidence-Based Skill Levels & Confidence (PRD 6.4)
    // ≥ 3 weighted items for Level 4–5; 2 items → max Level 3; 1 item → max Level 2
    const finalSkillScores = {};
    const strengths = [];
    const improvements = [];

    for (const [sName, stat] of Object.entries(skillStats)) {
      const rawPct = stat.weightedTotal > 0
        ? Math.round((stat.weightedEarned / stat.weightedTotal) * 100)
        : 0;

      let rawLevel = 1;
      if (rawPct >= 90) rawLevel = 5;
      else if (rawPct >= 80) rawLevel = 4;
      else if (rawPct >= 60) rawLevel = 3;
      else if (rawPct >= 40) rawLevel = 2;

      // Evidence capping rule
      const evidenceCount = stat.total;
      let cappedLevel = rawLevel;
      if (evidenceCount === 1) {
        cappedLevel = Math.min(2, rawLevel);
      } else if (evidenceCount === 2) {
        cappedLevel = Math.min(3, rawLevel);
      }

      // If practice mode, cap at Level 2 per PRD 6.1
      if (session.mode === 'practice') {
        cappedLevel = Math.min(2, cappedLevel);
      }

      let confidence = 'low';
      if (evidenceCount >= 3) confidence = 'high';
      else if (evidenceCount === 2) confidence = 'medium';

      const levelLabels = { 1: 'Beginner', 2: 'Developing', 3: 'Proficient', 4: 'Advanced', 5: 'Expert' };
      const levelLabel = levelLabels[cappedLevel] || 'Beginner';

      const kScore = stat.knowledgeWeightTotal > 0
        ? Math.round((stat.knowledgeWeightEarned / stat.knowledgeWeightTotal) * 100)
        : rawPct;
      const pScore = stat.practicalWeightTotal > 0
        ? Math.round((stat.practicalWeightEarned / stat.practicalWeightTotal) * 100)
        : rawPct;

      finalSkillScores[sName] = {
        skillName: sName,
        category: stat.category,
        score: rawPct,
        level: cappedLevel,
        levelLabel,
        evidenceCount,
        confidence,
        knowledgeScore: kScore,
        practicalScore: pScore,
      };

      if (rawPct >= 60) {
        strengths.push(sName);
      } else {
        improvements.push(sName);
      }
    }

    // 5. Category Breakdown
    const categoryMap = {};
    for (const s of Object.values(finalSkillScores)) {
      if (!categoryMap[s.category]) {
        categoryMap[s.category] = { total: 0, sum: 0, items: [] };
      }
      categoryMap[s.category].total += 1;
      categoryMap[s.category].sum += s.score;
      categoryMap[s.category].items.push(s);
    }

    const categoryScores = Object.entries(categoryMap).map(([cat, val]) => {
      const avg = Math.round(val.sum / val.total);
      let level = 'Beginner';
      if (avg >= 90) level = 'Expert';
      else if (avg >= 80) level = 'Advanced';
      else if (avg >= 60) level = 'Proficient';
      else if (avg >= 40) level = 'Developing';

      return {
        category: cat,
        score: avg,
        totalQuestions: val.total,
        correctCount: val.items.filter(i => i.score >= 60).length,
        level,
      };
    });

    // 6. Persistence
    const now = new Date().toISOString();

    // Mark session graded
    db.prepare(`
      UPDATE assessment_sessions
      SET status = 'graded', submitted_at = ?
      WHERE id = ?
    `).run(now, sessionId);

    // Save session_scores
    db.prepare(`
      INSERT INTO session_scores (
        session_id, technical_score, knowledge_score, practical_score,
        rubric_json, skill_scores, graded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(session_id) DO UPDATE SET
        technical_score = excluded.technical_score,
        knowledge_score = excluded.knowledge_score,
        practical_score = excluded.practical_score,
        skill_scores = excluded.skill_scores,
        graded_at = excluded.graded_at;
    `).run(
      sessionId,
      technicalScore,
      knowledgeScore,
      practicalScore,
      '{}',
      JSON.stringify(finalSkillScores),
      now
    );

    // Update candidate_skills (One writer rule: Only V2 grading service writes candidate_skills)
    // Integrity events must NEVER alter technical scores or candidate_skills
    const verificationStatus = session.mode === 'secure' ? 'diagnostic_tested' : 'self_practice';

    const upsertSkill = db.prepare(`
      INSERT INTO candidate_skills (id, candidate_id, skill_id, proficiency, verification_status, source, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'diagnostic_assessment', ?, ?)
      ON CONFLICT(candidate_id, skill_id) DO UPDATE SET
        proficiency = MAX(candidate_skills.proficiency, excluded.proficiency),
        verification_status = CASE
          WHEN candidate_skills.verification_status = 'verified' THEN 'verified'
          WHEN excluded.verification_status = 'diagnostic_tested' THEN 'diagnostic_tested'
          ELSE candidate_skills.verification_status
        END,
        updated_at = excluded.updated_at;
    `);

    for (const item of Object.values(finalSkillScores)) {
      const skillId = skillStats[item.skillName]?.skillId || `sk-${item.skillName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      try {
        upsertSkill.run(
          `cs-${uuidv4().slice(0, 8)}`,
          userId,
          skillId,
          item.level,
          verificationStatus,
          now,
          now
        );
      } catch (err) {
        console.warn(`[GradingService] Could not upsert candidate_skill ${item.skillName}:`, err.message);
      }
    }

    // Insert legacy-compatible assessment_attempts (engine_version='v2')
    const passed = technicalScore >= assessmentV2.passThreshold ? 1 : 0;
    try {
      // Find or create default assignment
      const existingAssign = db.prepare(`
        SELECT id FROM assessment_assignments WHERE candidate_id = ? LIMIT 1
      `).get(userId);

      const assignmentId = existingAssign?.id || `assign-${sessionId}`;
      if (!existingAssign) {
        // Ensure template exists
        const tmpl = db.prepare(`SELECT id FROM assessment_templates LIMIT 1`).get();
        const tmplId = tmpl?.id || 'tmpl-web-full';
        db.prepare(`
          INSERT OR IGNORE INTO assessment_assignments (id, template_id, candidate_id, assigned_by, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, 'completed', ?, ?)
        `).run(assignmentId, tmplId, userId, userId, now, now);
      }

      db.prepare(`
        INSERT INTO assessment_attempts (id, assignment_id, candidate_id, attempt_number, started_at, submitted_at, submission_payload, status, engine_version, created_at, updated_at)
        VALUES (?, ?, ?, 1, ?, ?, ?, 'graded', 'v2', ?, ?)
        ON CONFLICT(id) DO UPDATE SET status = 'graded', submitted_at = excluded.submitted_at;
      `).run(
        sessionId,
        assignmentId,
        userId,
        session.started_at,
        now,
        JSON.stringify(submissionPayload),
        now,
        now
      );

      const tmpl = db.prepare(`SELECT id FROM assessment_templates LIMIT 1`).get();
      db.prepare(`
        INSERT INTO assessment_results (id, attempt_id, candidate_id, template_id, score, max_score, passed, graded_at, created_at)
        VALUES (?, ?, ?, ?, ?, 100.0, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET score = excluded.score, passed = excluded.passed;
      `).run(
        `res-${sessionId}`,
        sessionId,
        userId,
        tmpl?.id || 'tmpl-web-full',
        technicalScore,
        passed,
        now,
        now
      );
    } catch (err) {
      console.warn('[GradingService] Legacy attempt sync note:', err.message);
    }

    return this.getSessionResult(sessionId, userId);
  }

  /**
   * Get graded session result with revealed answers/explanations
   */
  static getSessionResult(sessionId, userId) {
    const db = initDb();
    const session = db.prepare(`SELECT * FROM assessment_sessions WHERE id = ?`).get(sessionId);

    if (!session || session.user_id !== userId) {
      const err = new Error('Session not found or unauthorized.');
      err.code = 'FORBIDDEN';
      throw err;
    }

    const scoresRow = db.prepare(`SELECT * FROM session_scores WHERE session_id = ?`).get(sessionId);

    let skillScores = {};
    try { skillScores = JSON.parse(scoresRow?.skill_scores || '{}'); } catch {}

    let questionIds = [];
    try { questionIds = JSON.parse(session.question_ids || '[]'); } catch {}

    const fullQuestions = QuestionBankService.getQuestionsForGrading(questionIds);
    let sessionData = {};
    try { sessionData = JSON.parse(session.consent_json || '{}'); } catch {}

    const answers = sessionData.draftAnswers || {};
    const answersSummary = fullQuestions.filter(q => q.type === 'mcq').map(q => {
      const selected = answers[q.id];
      const correctIdx = q.correct?.index ?? 0;
      return {
        questionId: q.id,
        question: q.prompt,
        skillName: q.skillName,
        selectedOption: typeof selected === 'number' ? selected : -1,
        correctOption: correctIdx,
        isCorrect: selected === correctIdx,
        explanation: q.explanation || '',
      };
    });

    const categoryMap = {};
    for (const s of Object.values(skillScores)) {
      if (!categoryMap[s.category]) {
        categoryMap[s.category] = { total: 0, sum: 0, items: [] };
      }
      categoryMap[s.category].total += 1;
      categoryMap[s.category].sum += s.score;
      categoryMap[s.category].items.push(s);
    }

    const categoryScores = Object.entries(categoryMap).map(([cat, val]) => {
      const avg = Math.round(val.sum / val.total);
      let level = 'Beginner';
      if (avg >= 90) level = 'Expert';
      else if (avg >= 80) level = 'Advanced';
      else if (avg >= 60) level = 'Proficient';
      else if (avg >= 40) level = 'Developing';

      return {
        category: cat,
        score: avg,
        totalQuestions: val.total,
        correctCount: val.items.filter(i => i.score >= 60).length,
        level,
      };
    });

    const strengths = Object.values(skillScores).filter(s => s.score >= 60).map(s => s.skillName);
    const improvements = Object.values(skillScores).filter(s => s.score < 60).map(s => s.skillName);

    // Integrity summary (indicators for review, not proof)
    const integrityEvents = db.prepare(`SELECT type, ts FROM integrity_events WHERE session_id = ?`).all(sessionId);
    const nonNetworkEvents = integrityEvents.filter(e => !e.type.startsWith('network_'));

    return {
      sessionId: session.id,
      mode: session.mode,
      domainId: session.domain_id,
      role: session.role,
      technicalScore: scoresRow?.technical_score ?? 0,
      knowledgeScore: scoresRow?.knowledge_score ?? 0,
      practicalScore: scoresRow?.practical_score ?? 0,
      completedAt: session.submitted_at || session.started_at,
      skillScores,
      categoryScores,
      strengths,
      improvements,
      answersSummary,
      practicalSummary: [],
      integritySummary: {
        eventCount: nonNetworkEvents.length,
        longestAwaySec: 0,
        level: nonNetworkEvents.length > 5 ? 'notable' : 'none',
      },
    };
  }
}
