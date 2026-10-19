import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { authService } from '../../services/authService.js';
import { initDb } from '../../config/db.js';
import app from '../../index.js';

describe('AI Candidate Matching & Shortlisting API Endpoints', () => {
  let serverInstance;
  let baseUrl;
  let recruiterToken;
  let candidateToken;
  const orgId = 'org-demo-1';
  const jobId = 'job-1'; // Senior Full-Stack Engineer

  before(async () => {
    initDb();

    await new Promise((resolve) => {
      serverInstance = app.listen(0, '127.0.0.1', () => {
        const port = serverInstance.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    const recruiterSession = await authService.getOrCreateRecruiterSession({
      email: 'recruiter.matching.test@sarathi.local',
      orgId,
    });
    recruiterToken = recruiterSession.token;

    const studentSession = await authService.getOrCreateStudentSession({
      id: `usr-match-student-${Date.now()}`,
      email: `student.matching.${Date.now()}@sarathi.local`,
      fullName: 'Matching Test Student',
      institution: 'Sarathi Institute',
      targetRole: 'Full-Stack Developer',
    });
    candidateToken = studentSession.token;
  });

  after(() => {
    if (serverInstance) {
      serverInstance.close();
    }
  });

  test('1. GET /api/matching/jobs/:jobId/candidates requires authentication (401)', async () => {
    const res = await fetch(`${baseUrl}/api/matching/jobs/${jobId}/candidates`);
    assert.strictEqual(res.status, 401);
  });

  test('2. Candidates cannot access recruiter candidate matching endpoints (403)', async () => {
    const res = await fetch(`${baseUrl}/api/matching/jobs/${jobId}/candidates`, {
      headers: {
        'Authorization': `Bearer ${candidateToken}`,
        'x-org-id': orgId,
      },
    });
    assert.strictEqual(res.status, 403);
  });

  test('3. Authorized recruiter can retrieve job applicants with match scores and AI synthesis', async () => {
    const res = await fetch(`${baseUrl}/api/matching/jobs/${jobId}/candidates`, {
      headers: {
        'Authorization': `Bearer ${recruiterToken}`,
        'x-org-id': orgId,
      },
    });
    assert.strictEqual(res.status, 200);

    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(json.data.job);
    assert.ok(json.data.metrics);
    assert.ok(Array.isArray(json.data.candidates));
    assert.ok(json.data.candidates.length > 0);

    const candidate = json.data.candidates[0];
    assert.ok(candidate.candidateId);
    assert.ok(candidate.candidateName);
    assert.ok(typeof candidate.matchScore === 'number');
    assert.ok(typeof candidate.requiredSkillCoverage === 'number');
    assert.ok(Array.isArray(candidate.matchedRequired));
    assert.ok(Array.isArray(candidate.unmetRequirements));
    assert.ok(typeof candidate.explanation === 'string');
    assert.ok(typeof candidate.aiSummary === 'string');
    assert.ok(Array.isArray(candidate.aiStrengths));
    assert.ok(Array.isArray(candidate.aiGaps));
    assert.ok(candidate.aiRecommendation);
  });

  test('4. Filtering by minScore and stage filters candidate results accurately', async () => {
    const res = await fetch(`${baseUrl}/api/matching/jobs/${jobId}/candidates?minScore=50&stage=all`, {
      headers: {
        'Authorization': `Bearer ${recruiterToken}`,
        'x-org-id': orgId,
      },
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();

    for (const c of json.data.candidates) {
      assert.ok(c.matchScore >= 50, `Candidate score ${c.matchScore} should be >= 50`);
    }
  });

  test('5. POST /api/matching/shortlist validates reason and shortlists candidate', async () => {
    // Rejects empty reason
    const failRes = await fetch(`${baseUrl}/api/matching/shortlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${recruiterToken}`,
        'x-org-id': orgId,
      },
      body: JSON.stringify({
        applicationId: 'app-1',
        candidateId: 'usr-cand-1',
        jobId,
        reason: '',
      }),
    });
    assert.strictEqual(failRes.status, 400);

    // Valid shortlist submission
    const successRes = await fetch(`${baseUrl}/api/matching/shortlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${recruiterToken}`,
        'x-org-id': orgId,
      },
      body: JSON.stringify({
        applicationId: 'app-1',
        candidateId: 'usr-cand-1',
        jobId,
        reason: 'Outstanding React & TypeScript practical assessment score with verified repositories',
        note: 'Shortlisted for technical round panel interview.',
      }),
    });
    assert.strictEqual(successRes.status, 200);
    const successJson = await successRes.json();
    assert.strictEqual(successJson.success, true);
    assert.strictEqual(successJson.data.stage, 'shortlisted');
  });

  test('6. POST /api/matching/compare validates candidates and returns competency matrix', async () => {
    // Rejects single candidate
    const failRes = await fetch(`${baseUrl}/api/matching/compare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${recruiterToken}`,
        'x-org-id': orgId,
      },
      body: JSON.stringify({
        jobId,
        candidateIds: ['usr-cand-1'],
      }),
    });
    assert.strictEqual(failRes.status, 400);

    // Compares 2 candidates
    const res = await fetch(`${baseUrl}/api/matching/compare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${recruiterToken}`,
        'x-org-id': orgId,
      },
      body: JSON.stringify({
        jobId,
        candidateIds: ['usr-cand-1', 'usr-cand-3'],
      }),
    });
    assert.strictEqual(res.status, 200);

    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.candidates.length, 2);
    assert.ok(Array.isArray(json.data.competencyMatrix));
    assert.ok(json.data.competencyMatrix.length > 0);
  });

  test('7. GET /api/matching/jobs/:jobId/shortlisted returns shortlisted candidates with decision audit reasons', async () => {
    const res = await fetch(`${baseUrl}/api/matching/jobs/${jobId}/shortlisted`, {
      headers: {
        'Authorization': `Bearer ${recruiterToken}`,
        'x-org-id': orgId,
      },
    });
    assert.strictEqual(res.status, 200);

    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(Array.isArray(json.data));
    assert.ok(json.data.length >= 1);
    const aarav = json.data.find(c => c.candidate_id === 'usr-cand-1');
    assert.ok(aarav);
    assert.ok(aarav.shortlisting_reason);
  });
});
