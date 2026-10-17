import { initDb } from '../../config/db.js';

export class QuestionBankService {
  /**
   * Sample questions for an assessment session without leaking correct answers or hidden tests.
   */
  static sampleQuestionsForSession(domainId, roleTitle = null, scope = 'full') {
    const db = initDb();

    // Query active questions for the domain
    const questions = db.prepare(`
      SELECT q.id, q.version, q.domain_id, q.skill_id, s.name as skill_name, s.category,
             q.type, q.difficulty, q.prompt, q.options, q.starter_code, q.language
      FROM assessment_questions q
      LEFT JOIN skills s ON q.skill_id = s.id
      WHERE q.domain_id = ? AND q.status = 'active'
      ORDER BY q.difficulty ASC, q.id ASC
    `).all(domainId);

    if (!questions || questions.length === 0) {
      // Fallback: check if domain has questions
      throw new Error(`No active assessment questions found for domain: ${domainId}`);
    }

    const mcqs = questions.filter(q => q.type === 'mcq');
    const coding = questions.filter(q => q.type === 'code');
    const sql = questions.filter(q => q.type === 'sql');
    const projects = questions.filter(q => q.type === 'project');

    // Sample question subsets per PRD
    let selectedMcqs = [];
    let selectedCoding = [];
    let selectedSql = [];
    let selectedProjects = [];

    if (scope === 'quiz_only') {
      selectedMcqs = mcqs.slice(0, 10);
    } else if (scope === 'practical_only') {
      selectedCoding = coding.slice(0, 2);
      selectedSql = sql.slice(0, 1);
      selectedProjects = projects.slice(0, 1);
    } else {
      // Combined / full (default)
      selectedMcqs = mcqs.slice(0, 8);
      selectedCoding = coding.slice(0, 2);
      selectedSql = sql.slice(0, 1);
      selectedProjects = projects.slice(0, 1);
    }

    const combined = [...selectedMcqs, ...selectedCoding, ...selectedSql, ...selectedProjects];

    // Hydrate visible tests and rubrics (HIDDEN tests are strictly excluded here!)
    const getVisibleTests = db.prepare(`
      SELECT id, kind, input, expected_output, timeout_ms
      FROM code_tests
      WHERE question_id = ? AND kind = 'visible'
      ORDER BY id ASC
    `);

    const getRubric = db.prepare(`
      SELECT criteria
      FROM project_rubrics
      WHERE question_id = ?
    `);

    return combined.map(q => {
      let parsedOptions = [];
      try {
        parsedOptions = JSON.parse(q.options || '[]');
      } catch {}

      const clientQuestion = {
        id: q.id,
        version: q.version,
        domainId: q.domain_id,
        skillId: q.skill_id,
        skillName: q.skill_name || q.skill_id,
        category: q.category || 'General',
        type: q.type,
        difficulty: q.difficulty,
        prompt: q.prompt,
        options: q.type === 'mcq' ? parsedOptions : undefined,
        starterCode: q.starter_code || undefined,
        language: q.language || undefined,
      };

      if (q.type === 'code' || q.type === 'sql') {
        const tests = getVisibleTests.all(q.id);
        clientQuestion.visibleTests = tests.map(t => ({
          id: t.id,
          kind: 'visible',
          input: t.input,
          expectedOutput: t.expected_output,
          timeoutMs: t.timeout_ms,
        }));
      }

      if (q.type === 'project') {
        const rubricRow = getRubric.get(q.id);
        if (rubricRow) {
          try {
            clientQuestion.rubric = JSON.parse(rubricRow.criteria || '[]');
          } catch {}
        }
      }

      return clientQuestion;
    });
  }

  /**
   * Internal / Server-Only: fetch questions with correct answers, hidden tests, and rubrics for grading.
   */
  static getQuestionsForGrading(questionIds) {
    const db = initDb();
    if (!questionIds || questionIds.length === 0) return [];

    const placeholders = questionIds.map(() => '?').join(',');
    const questions = db.prepare(`
      SELECT q.id, q.version, q.domain_id, q.skill_id, s.name as skill_name, s.category,
             q.type, q.difficulty, q.prompt, q.options, q.correct, q.explanation,
             q.starter_code, q.language
      FROM assessment_questions q
      LEFT JOIN skills s ON q.skill_id = s.id
      WHERE q.id IN (${placeholders})
    `).all(...questionIds);

    const getAllTests = db.prepare(`
      SELECT id, kind, input, expected_output, weight, timeout_ms
      FROM code_tests
      WHERE question_id = ?
      ORDER BY kind ASC, id ASC
    `);

    const getRubric = db.prepare(`
      SELECT criteria
      FROM project_rubrics
      WHERE question_id = ?
    `);

    return questions.map(q => {
      let correct = {};
      let options = [];
      try { correct = JSON.parse(q.correct || '{}'); } catch {}
      try { options = JSON.parse(q.options || '[]'); } catch {}

      const item = {
        id: q.id,
        version: q.version,
        domainId: q.domain_id,
        skillId: q.skill_id,
        skillName: q.skill_name || q.skill_id,
        category: q.category || 'General',
        type: q.type,
        difficulty: q.difficulty,
        prompt: q.prompt,
        options,
        correct,
        explanation: q.explanation,
        starterCode: q.starter_code,
        language: q.language,
      };

      if (q.type === 'code' || q.type === 'sql') {
        item.tests = getAllTests.all(q.id);
      }

      if (q.type === 'project') {
        const rubricRow = getRubric.get(q.id);
        if (rubricRow) {
          try { item.rubric = JSON.parse(rubricRow.criteria || '[]'); } catch {}
        }
      }

      return item;
    });
  }
}
