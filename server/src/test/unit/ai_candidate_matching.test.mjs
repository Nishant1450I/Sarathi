import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { matchingService } from '../../services/matchingService.js';
import { initDb } from '../../config/db.js';

describe('AI-Powered Candidate–Job Matching & Shortlisting Engine', () => {
  const orgId = 'org-demo-1';
  const fullStackJobId = 'job-1'; // Senior Full-Stack Engineer
  const aiScientistJobId = 'job-2'; // Lead AI & Machine Learning Scientist
  const candidateAarav = 'usr-cand-1'; // Full stack React/Node
  const candidateRohan = 'usr-cand-3'; // Backend Go/Distributed Systems
  const recruiterId = 'usr-recruiter-1';

  test('1. Calculates comprehensive multi-dimensional match (skills, experience, education, evidence)', async () => {
    initDb();

    const result = await matchingService.calculateComprehensiveJobMatch(candidateAarav, fullStackJobId);

    // Score ranges
    assert.ok(result.matchScore >= 0 && result.matchScore <= 100);
    assert.ok(result.skillScore >= 0 && result.skillScore <= 100);
    assert.ok(result.experienceScore >= 0 && result.experienceScore <= 100);
    assert.ok(result.educationScore >= 0 && result.educationScore <= 100);
    assert.ok(result.evidenceScore >= 0 && result.evidenceScore <= 100);
    assert.ok(result.requiredSkillCoverage >= 0 && result.requiredSkillCoverage <= 100);

    // Competency breakdown
    assert.ok(Array.isArray(result.matchedRequired));
    assert.ok(Array.isArray(result.matchedPreferred));
    assert.ok(Array.isArray(result.unmetRequirements));
    assert.ok(Array.isArray(result.unverifiedSkills));

    // Explanation & evaluations
    assert.ok(result.explanation.includes('Overall role match of'));
    assert.ok(result.experienceEvaluation.length > 10);
    assert.ok(result.educationEvaluation.length > 10);

    // AI Qualitative Synthesis
    assert.ok(typeof result.aiSummary === 'string' && result.aiSummary.length > 10);
    assert.ok(Array.isArray(result.aiStrengths) && result.aiStrengths.length > 0);
    assert.ok(Array.isArray(result.aiGaps));
    assert.ok(Array.isArray(result.aiQuestions) && result.aiQuestions.length > 0);
    assert.ok(['strongly_recommended', 'recommended', 'needs_assessment', 'not_recommended'].includes(result.aiRecommendation));
    assert.ok(typeof result.aiProvider === 'string');
  });

  test('2. Different jobs produce distinct, role-specific match evaluations based on requirements', async () => {
    initDb();

    const fullStackMatch = await matchingService.calculateComprehensiveJobMatch(candidateAarav, fullStackJobId);
    const aiScientistMatch = await matchingService.calculateComprehensiveJobMatch(candidateAarav, aiScientistJobId);

    // Candidate Aarav is specialized in React/TypeScript, not AI/ML Research
    assert.ok(
      fullStackMatch.matchScore > aiScientistMatch.matchScore,
      `Expected full stack match (${fullStackMatch.matchScore}%) to exceed AI scientist match (${aiScientistMatch.matchScore}%)`
    );
    assert.ok(aiScientistMatch.unmetRequirements.length > 0, 'AI role must flag missing ML competencies');
  });

  test('3. Explainable Fairness: missing optional profile fields do not trigger harsh penalty', async () => {
    initDb();

    const match = await matchingService.calculateComprehensiveJobMatch(candidateRohan, fullStackJobId);

    // Rohan is evaluated on verifiable signals, missing optional fields are not penalized as negative competency
    assert.ok(match.educationScore >= 80, 'Optional education field omission should not reduce score below neutral baseline');
    assert.ok(match.explanation.length > 20);
  });

  test('4. Caching: evaluates once and reuses cached evaluation unless forceRefresh is set', async () => {
    initDb();

    const first = await matchingService.getOrComputeJobMatch(fullStackJobId, candidateAarav, { forceRefresh: true });
    assert.ok(first.calculatedAt);

    const cached = await matchingService.getOrComputeJobMatch(fullStackJobId, candidateAarav, { forceRefresh: false });
    assert.strictEqual(cached.matchScore, first.matchScore);
    assert.strictEqual(cached.calculatedAt, first.calculatedAt);
  });

  test('5. Shortlisting Workflow: requires valid reason and updates stage, notes, and shortlist membership', async () => {
    initDb();

    // Verify rejection on missing reason
    await assert.rejects(
      async () => {
        await matchingService.shortlistCandidate(orgId, recruiterId, {
          applicationId: 'app-5',
          candidateId: candidateRohan,
          jobId: fullStackJobId,
          reason: '',
        });
      },
      /reason for the shortlisting decision is required/
    );

    // Valid shortlisting
    const result = await matchingService.shortlistCandidate(orgId, recruiterId, {
      applicationId: 'app-5',
      candidateId: candidateRohan,
      jobId: fullStackJobId,
      reason: 'Strong backend systems foundation and fast learner for full stack transition',
      note: 'Discuss React learning plan during interview.',
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.stage, 'shortlisted');
    assert.ok(result.shortlistId);

    // Review shortlisted candidates for job
    const shortlisted = matchingService.getShortlistedCandidatesForJob(orgId, fullStackJobId);
    assert.ok(shortlisted.length >= 1);
    const rohanRecord = shortlisted.find(s => s.candidate_id === candidateRohan);
    assert.ok(rohanRecord, 'Rohan must appear in shortlisted review');
    assert.ok(rohanRecord.shortlisting_reason.includes('Strong backend systems foundation'));
  });

  test('6. Candidate Comparison: generates side-by-side competency matrix for 2-4 applicants', async () => {
    initDb();

    // Rejects invalid candidate counts
    await assert.rejects(
      async () => {
        await matchingService.compareJobCandidates(orgId, fullStackJobId, [candidateAarav]);
      },
      /between 2 and 4 candidates/
    );

    const comparison = await matchingService.compareJobCandidates(orgId, fullStackJobId, [candidateAarav, candidateRohan]);

    assert.strictEqual(comparison.candidates.length, 2);
    assert.ok(Array.isArray(comparison.competencyMatrix));
    assert.ok(comparison.competencyMatrix.length > 0);

    // Each row in competency matrix contains comparisons for both candidates
    for (const row of comparison.competencyMatrix) {
      assert.strictEqual(row.candidates.length, 2);
      assert.ok(row.skillName);
      assert.ok(['required', 'preferred'].includes(row.requirementType));
    }
  });
});
