import { describe, it, expect, vi, beforeEach } from 'vitest';
import { recruiterNavSections } from '../layouts/RecruiterLayout';
import { recruiterApi } from '../services/recruiterApiService';

describe('Recruiter Candidate Matching & Shortlisting (Feature Enhancement)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('preserves layout architecture and includes Candidate Matching in Talent Acquisition navigation', () => {
    const talentSection = recruiterNavSections.find(s => s.id === 'talent-acquisition');
    expect(talentSection).toBeDefined();

    const matchingNav = talentSection?.items.find(item => item.path === '/recruiter/matching');
    expect(matchingNav).toBeDefined();
    expect(matchingNav?.label).toBe('Candidate Matching');

    // Confirm existing navigation items remain fully intact
    const existingPaths = talentSection?.items.map(i => i.path);
    expect(existingPaths).toContain('/recruiter/dashboard');
    expect(existingPaths).toContain('/recruiter/candidates');
    expect(existingPaths).toContain('/recruiter/jobs');
    expect(existingPaths).toContain('/recruiter/pipeline');
  });

  it('recruiterApi.getJobCandidateMatches calls the backend endpoint with filters', async () => {
    const mockResponse = {
      success: true,
      data: {
        job: { id: 'job-1', title: 'Senior Full-Stack Engineer', department: 'Engineering', experienceLevel: 'senior', status: 'published', skills: [] },
        metrics: { totalApplicants: 3, shortlistedCount: 1, avgMatchScore: 82, topMatchScore: 92, aiProvider: 'rule_based' },
        candidates: [
          {
            applicationId: 'app-1',
            candidateId: 'usr-cand-1',
            candidateName: 'Aarav Patel',
            candidateEmail: 'aarav@example.com',
            candidateAvatar: null,
            headline: 'Senior Full Stack Engineer',
            targetRole: 'Full-Stack Developer',
            experienceYears: 4,
            location: 'Bangalore',
            degree: 'B.Tech CS',
            institution: 'IIT Delhi',
            repoCount: 8,
            stage: 'shortlisted',
            appliedAt: '2026-03-01T10:00:00Z',
            coverNote: 'Excited to apply',
            notesCount: 1,
            matchScore: 92,
            skillScore: 90,
            experienceScore: 100,
            educationScore: 95,
            evidenceScore: 85,
            requiredSkillCoverage: 95,
            preferredSkillCoverage: 80,
            matchedRequired: [{ skillId: 'sk-react', skillName: 'React.js', targetProficiency: 4, candidateProficiency: 4, verificationStatus: 'verified' }],
            matchedPreferred: [],
            unmetRequirements: [],
            unverifiedSkills: [],
            explanation: 'Strong fit',
            aiSummary: 'Excellent role compatibility',
            aiStrengths: ['React.js mastery'],
            aiGaps: [],
            aiRecommendation: 'strongly_recommended',
            aiQuestions: ['Explain scaling patterns'],
            aiProvider: 'rule_based',
            calculatedAt: '2026-03-01T10:00:00Z',
          }
        ],
      }
    };

    const requestSpy = vi.spyOn(recruiterApi as any, 'request').mockResolvedValue(mockResponse);

    const result = await recruiterApi.getJobCandidateMatches('job-1', {
      minScore: 80,
      stage: 'shortlisted',
      sortBy: 'match_score',
      sortOrder: 'desc',
    });

    expect(requestSpy).toHaveBeenCalledWith(
      '/matching/jobs/job-1/candidates?minScore=80&stage=shortlisted&sortBy=match_score&sortOrder=desc'
    );
    expect(result.metrics.topMatchScore).toBe(92);
    expect(result.candidates.length).toBe(1);
    expect(result.candidates[0].candidateName).toBe('Aarav Patel');
  });

  it('recruiterApi.shortlistCandidateWithReason submits structured shortlisting rationale', async () => {
    const mockResponse = {
      success: true,
      data: {
        success: true,
        applicationId: 'app-5',
        candidateId: 'usr-cand-3',
        stage: 'shortlisted',
        reason: 'Demonstrates deep backend expertise',
        updatedAt: '2026-03-01T12:00:00Z',
      }
    };

    const requestSpy = vi.spyOn(recruiterApi as any, 'request').mockResolvedValue(mockResponse);

    const result = await recruiterApi.shortlistCandidateWithReason({
      applicationId: 'app-5',
      candidateId: 'usr-cand-3',
      jobId: 'job-1',
      reason: 'Demonstrates deep backend expertise',
      note: 'Advance to system design round',
    });

    expect(requestSpy).toHaveBeenCalledWith(
      '/matching/shortlist',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          applicationId: 'app-5',
          candidateId: 'usr-cand-3',
          jobId: 'job-1',
          reason: 'Demonstrates deep backend expertise',
          note: 'Advance to system design round',
        }),
      })
    );
    expect(result.stage).toBe('shortlisted');
  });

  it('recruiterApi.compareJobCandidates retrieves side-by-side competency matrix', async () => {
    const mockResponse = {
      success: true,
      data: {
        job: { id: 'job-1', title: 'Senior Full-Stack Engineer', department: 'Engineering', experienceLevel: 'senior' },
        candidates: [],
        competencyMatrix: [
          {
            skillId: 'sk-react',
            skillName: 'React.js',
            requirementType: 'required',
            targetProficiency: 4,
            weight: 1.5,
            candidates: [
              { candidateId: 'usr-cand-1', proficiency: 4, verificationStatus: 'verified', status: 'matched', badge: 'Verified Match' },
              { candidateId: 'usr-cand-3', proficiency: 0, verificationStatus: 'missing', status: 'missing', badge: 'Missing' },
            ]
          }
        ]
      }
    };

    const requestSpy = vi.spyOn(recruiterApi as any, 'request').mockResolvedValue(mockResponse);

    const result = await recruiterApi.compareJobCandidates('job-1', ['usr-cand-1', 'usr-cand-3']);

    expect(requestSpy).toHaveBeenCalledWith(
      '/matching/compare',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          jobId: 'job-1',
          candidateIds: ['usr-cand-1', 'usr-cand-3'],
        }),
      })
    );
    expect(result.competencyMatrix.length).toBe(1);
    expect(result.competencyMatrix[0].candidates.length).toBe(2);
  });
});
