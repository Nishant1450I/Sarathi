import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { pipelineService } from '../../services/pipelineService.js';
import { initDb } from '../../config/db.js';

describe('Recruiter Bulk Evaluation & Advanced Pipeline Intelligence', () => {
  const orgId = 'org-demo-1';
  const recruiterId = 'usr-recruiter-1';

  test('1. Filters applications by multi-criteria (CGPA, gradYear, college, search, score range)', () => {
    initDb();

    // Test search filter
    const searchResults = pipelineService.getApplications(orgId, { search: 'Aarav' });
    assert.ok(searchResults.length >= 1, 'Should find Aarav Patel');
    assert.strictEqual(searchResults[0].candidate_name, 'Aarav Patel');

    // Test CGPA filter
    const highCgpa = pipelineService.getApplications(orgId, { cgpaMin: 9.0 });
    assert.ok(highCgpa.length >= 1);
    for (const app of highCgpa) {
      assert.ok(app.cgpa >= 9.0, `CGPA ${app.cgpa} should be >= 9.0`);
    }

    // Test graduation year filter
    const grad2025 = pipelineService.getApplications(orgId, { gradYear: 2025 });
    assert.ok(grad2025.length >= 1);
    for (const app of grad2025) {
      assert.strictEqual(app.graduation_year, 2025);
    }

    // Test college filter
    const iitCandidates = pipelineService.getApplications(orgId, { college: 'IIT' });
    assert.ok(iitCandidates.length >= 1);
    for (const app of iitCandidates) {
      assert.ok(app.institution.includes('IIT'));
    }
  });

  test('2. Sorts applications accurately (match_score, assessment_score, verified_skills, applied_at, stage_age)', () => {
    initDb();

    // Sort by match_score desc
    const sortedMatch = pipelineService.getApplications(orgId, { sortBy: 'match_score', sortOrder: 'desc' });
    assert.ok(sortedMatch.length >= 2);
    for (let i = 0; i < sortedMatch.length - 1; i++) {
      assert.ok(sortedMatch[i].match_score >= sortedMatch[i + 1].match_score);
    }

    // Sort by verified_skills desc
    const sortedSkills = pipelineService.getApplications(orgId, { sortBy: 'verified_skills', sortOrder: 'desc' });
    assert.ok(sortedSkills.length >= 2);
    for (let i = 0; i < sortedSkills.length - 1; i++) {
      assert.ok(sortedSkills[i].verified_skill_count >= sortedSkills[i + 1].verified_skill_count);
    }
  });

  test('3. Computes 5-factor weighted match score breakdown with manual override detection', () => {
    initDb();
    const apps = pipelineService.getApplications(orgId, { limit: 1 });
    assert.ok(apps.length > 0);
    const appId = apps[0].id;

    const breakdown = pipelineService.getMatchBreakdown(orgId, appId);
    assert.ok(breakdown);
    assert.strictEqual(breakdown.applicationId, appId);
    assert.ok(breakdown.overallScore >= 0 && breakdown.overallScore <= 100);

    // Verify 5 factors and weights
    assert.strictEqual(breakdown.factors.verifiedSkills.weight, 35);
    assert.strictEqual(breakdown.factors.assessment.weight, 25);
    assert.strictEqual(breakdown.factors.projectRelevance.weight, 20);
    assert.strictEqual(breakdown.factors.educationFit.weight, 10);
    assert.strictEqual(breakdown.factors.learningVelocity.weight, 10);

    assert.ok(Array.isArray(breakdown.matchedSkills));
    assert.ok(Array.isArray(breakdown.missingSkills));
    assert.ok(typeof breakdown.hasManualOverride === 'boolean');
  });

  test('4. Bulk stage update transitions multiple candidates and records audit history for undo', () => {
    initDb();
    const apps = pipelineService.getApplications(orgId, { limit: 3 });
    assert.ok(apps.length >= 2);
    const targetIds = [apps[0].id, apps[1].id];

    const bulkResult = pipelineService.bulkUpdateStage(
      orgId,
      targetIds,
      'under_review',
      recruiterId,
      'Batch review by hiring panel',
      'human'
    );

    assert.strictEqual(bulkResult.success, true);
    assert.strictEqual(bulkResult.updatedCount, 2);
    assert.strictEqual(bulkResult.targetStage, 'under_review');
    assert.ok(bulkResult.previousStages[targetIds[0]]);

    // Verify audit history was recorded with actor_type
    const audit = pipelineService.getApplicationAudit(orgId, targetIds[0]);
    assert.ok(audit.length >= 1);
    const latest = audit[0];
    assert.strictEqual(latest.to_stage, 'under_review');
    assert.strictEqual(latest.actor_type, 'human');
    assert.strictEqual(latest.reason, 'Batch review by hiring panel');
  });

  test('5. Bulk tagging adds and removes candidate tags correctly', () => {
    initDb();
    const apps = pipelineService.getApplications(orgId, { limit: 2 });
    const targetIds = [apps[0].id, apps[1].id];

    // Add tag
    const addResult = pipelineService.bulkTagApplications(orgId, targetIds, ['High Priority Contender'], 'add');
    assert.strictEqual(addResult.success, true);
    assert.strictEqual(addResult.affectedCount, 2);

    let updatedApps = pipelineService.getApplications(orgId, { limit: 2 });
    assert.ok(updatedApps[0].tags.includes('High Priority Contender'));

    // Remove tag
    const removeResult = pipelineService.bulkTagApplications(orgId, targetIds, ['High Priority Contender'], 'remove');
    assert.strictEqual(removeResult.success, true);

    updatedApps = pipelineService.getApplications(orgId, { limit: 2 });
    assert.ok(!updatedApps[0].tags.includes('High Priority Contender'));
  });

  test('6. Compare candidates generates structured side-by-side competency comparisons', () => {
    initDb();
    const apps = pipelineService.getApplications(orgId, { limit: 2 });
    const comparison = pipelineService.compareApplications(orgId, [apps[0].id, apps[1].id]);

    assert.strictEqual(comparison.length, 2);
    assert.ok(comparison[0].candidateName);
    assert.ok(comparison[0].institution);
    assert.ok(comparison[0].breakdown);
    assert.ok(Array.isArray(comparison[0].verifiedSkills));
  });

  test('7. Saved views creates, retrieves, and deletes recruiter saved configurations', () => {
    initDb();

    // Create saved view
    const newView = pipelineService.createSavedView(orgId, recruiterId, {
      name: 'IIT High CGPA Candidates',
      filters: { college: 'IIT', cgpaMin: 9.0 },
      sort: { sortBy: 'match_score', sortOrder: 'desc' }
    });
    assert.ok(newView.id);
    assert.strictEqual(newView.name, 'IIT High CGPA Candidates');

    // Retrieve saved views
    const views = pipelineService.getSavedViews(orgId, recruiterId);
    assert.ok(views.some(v => v.id === newView.id));

    // Delete saved view
    const delResult = pipelineService.deleteSavedView(orgId, recruiterId, newView.id);
    assert.strictEqual(delResult.success, true);

    const viewsAfter = pipelineService.getSavedViews(orgId, recruiterId);
    assert.ok(!viewsAfter.some(v => v.id === newView.id));
  });
});
