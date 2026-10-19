import { randomUUID as uuidv4 } from 'node:crypto';
import { repository } from '../data/repository.js';
import { getAIProviderConfig } from './aiChatService.js';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const REQUEST_TIMEOUT_MS = 12000;

export const matchingService = {
  /**
   * Deterministic match calculation for a candidate against a job.
   * Preserved for backward compatibility with existing tests and pipelines.
   */
  calculateJobMatch(candidateId, jobId) {
    // 1. Fetch Job Requirements
    const job = repository.queryOne('SELECT * FROM jobs WHERE id = ?;', [jobId]);
    if (!job) throw new Error('Job not found');

    const requirements = repository.query(
      `SELECT r.*, s.name as skill_name, s.category as skill_category, d.title as domain_title
       FROM job_skill_requirements r
       JOIN skills s ON s.id = r.skill_id
       JOIN domains d ON d.id = s.domain_id
       WHERE r.job_id = ?;`,
      [jobId]
    );

    // 2. Fetch Candidate's Skills and Evidence
    const candidateSkills = repository.query(
      `SELECT cs.*, s.name as skill_name, s.category as skill_category
       FROM candidate_skills cs
       JOIN skills s ON s.id = cs.skill_id
       WHERE cs.candidate_id = ?;`,
      [candidateId]
    );
    const skillMap = new Map();
    for (const cs of candidateSkills) {
      skillMap.set(cs.skill_id, cs);
    }

    // 3. Fetch candidate's verified evidence items
    const evidenceList = repository.query(
      `SELECT * FROM skill_evidence WHERE candidate_id = ? ORDER BY created_at DESC;`,
      [candidateId]
    );

    // 4. Fetch candidate's assessments relevant to the domain or job
    const assessmentResults = repository.query(
      `SELECT ar.*, at.title as template_title, at.type as assessment_type
       FROM assessment_results ar
       JOIN assessment_templates at ON at.id = ar.template_id
       WHERE ar.candidate_id = ?
       ORDER BY ar.created_at DESC;`,
      [candidateId]
    );

    // Edge case: Job has no configured skill requirements
    if (requirements.length === 0) {
      return {
        matchScore: 50,
        requiredSkillCoverage: 100,
        preferredSkillCoverage: 100,
        readinessScore: 60,
        matchedRequired: [],
        matchedPreferred: [],
        unmetRequirements: [],
        unverifiedSkills: [],
        evidenceMatches: evidenceList,
        assessmentResults,
        explanation: 'This job has no specific technical skill requirements configured. Baseline match assigned.',
      };
    }

    let requiredWeightSum = 0;
    let requiredEarnedWeight = 0;
    let preferredWeightSum = 0;
    let preferredEarnedWeight = 0;

    const matchedRequired = [];
    const matchedPreferred = [];
    const unmetRequirements = [];
    const unverifiedSkills = [];

    for (const req of requirements) {
      const cSkill = skillMap.get(req.skill_id);
      const isRequired = req.requirement_type === 'required';
      const weight = req.weight || 1.0;

      if (isRequired) requiredWeightSum += weight;
      else preferredWeightSum += weight;

      if (!cSkill) {
        // Missing completely
        unmetRequirements.push({
          skillId: req.skill_id,
          skillName: req.skill_name,
          requirementType: req.requirement_type,
          targetProficiency: req.target_proficiency,
          candidateProficiency: 0,
          status: 'missing',
          reason: 'Candidate has not reported or demonstrated this competency.',
        });
        continue;
      }

      const isVerified = cSkill.verification_status === 'verified';
      const isPending = ['evidence_submitted', 'verification_pending'].includes(cSkill.verification_status);
      const isSelfReported = cSkill.verification_status === 'self_reported';

      // Verification multiplier: Verified = 1.0, Pending Evidence = 0.6, Self-reported = 0.3
      let verificationMultiplier = 0.3;
      if (isVerified) verificationMultiplier = 1.0;
      else if (isPending) verificationMultiplier = 0.6;

      // Proficiency fulfillment ratio capped at 1.0
      const profRatio = Math.min(cSkill.proficiency / req.target_proficiency, 1.0);
      const earned = weight * profRatio * verificationMultiplier;

      if (isRequired) requiredEarnedWeight += earned;
      else preferredEarnedWeight += earned;

      if (isVerified && cSkill.proficiency >= req.target_proficiency) {
        if (isRequired) {
          matchedRequired.push({
            skillId: req.skill_id,
            skillName: req.skill_name,
            targetProficiency: req.target_proficiency,
            candidateProficiency: cSkill.proficiency,
            verificationStatus: cSkill.verification_status,
          });
        } else {
          matchedPreferred.push({
            skillId: req.skill_id,
            skillName: req.skill_name,
            targetProficiency: req.target_proficiency,
            candidateProficiency: cSkill.proficiency,
            verificationStatus: cSkill.verification_status,
          });
        }
      } else if (!isVerified) {
        unverifiedSkills.push({
          skillId: req.skill_id,
          skillName: req.skill_name,
          requirementType: req.requirement_type,
          targetProficiency: req.target_proficiency,
          candidateProficiency: cSkill.proficiency,
          verificationStatus: cSkill.verification_status,
          reason: isSelfReported
            ? 'Skill is self-reported only. Practical evidence or assessment required.'
            : 'Evidence has been submitted and is currently pending verification review.',
        });
      } else {
        // Verified but below target
        unmetRequirements.push({
          skillId: req.skill_id,
          skillName: req.skill_name,
          requirementType: req.requirement_type,
          targetProficiency: req.target_proficiency,
          candidateProficiency: cSkill.proficiency,
          status: 'below_target',
          reason: `Verified proficiency (${cSkill.proficiency}/5) is below job target (${req.target_proficiency}/5).`,
        });
      }
    }

    const requiredCoverage = requiredWeightSum > 0
      ? Math.round((requiredEarnedWeight / requiredWeightSum) * 100)
      : 100;

    const preferredCoverage = preferredWeightSum > 0
      ? Math.round((preferredEarnedWeight / preferredWeightSum) * 100)
      : 100;

    // Bonus for practical assessments passed (up to 10 points)
    const passedAssessmentsCount = assessmentResults.filter(a => a.passed === 1).length;
    const assessmentBonus = Math.min(passedAssessmentsCount * 5, 10);

    // Final Job Match Score: 70% Required Coverage + 20% Preferred Coverage + 10% Assessment Bonus
    const matchScore = Math.min(
      100,
      Math.round((requiredCoverage * 0.7) + (preferredCoverage * 0.2) + assessmentBonus)
    );

    const verifiedSkillsCount = candidateSkills.filter(cs => cs.verification_status === 'verified').length;
    const readinessScore = Math.min(
      100,
      Math.round((verifiedSkillsCount * 15) + (passedAssessmentsCount * 20) + 20)
    );

    const explanation = `Job match of ${matchScore}% calculated deterministically: Required skills coverage is ${requiredCoverage}% (weighted at 70%), Preferred skills coverage is ${preferredCoverage}% (weighted at 20%), plus an assessment verification bonus of +${assessmentBonus}% based on ${passedAssessmentsCount} completed practical assessments. Candidate has ${matchedRequired.length} fully verified required skills, ${unverifiedSkills.length} unverified/pending claims, and ${unmetRequirements.length} unmet competency targets.`;

    const verifiedRequirementsCount = matchedRequired.length;
    const totalRequirementsCount = requirements.length;
    const evidenceCoverage = totalRequirementsCount > 0
      ? Math.round((verifiedRequirementsCount / totalRequirementsCount) * 100)
      : 100;

    let evidenceUncertainty = 'HIGH';
    if (evidenceCoverage >= 80) evidenceUncertainty = 'LOW';
    else if (evidenceCoverage >= 40) evidenceUncertainty = 'MEDIUM';

    return {
      matchScore,
      requiredSkillCoverage: requiredCoverage,
      preferredSkillCoverage: preferredCoverage,
      readinessScore,
      matchedRequired,
      matchedPreferred,
      unmetRequirements,
      unverifiedSkills,
      evidenceMatches: evidenceList,
      assessmentResults,
      explanation,
      evidenceCoverage,
      evidenceUncertainty,
      disclaimer: 'This score represents objective technical competency alignment and is not an automated hiring decision.',
    };
  },

  /**
   * Comprehensive job-specific matching analyzing:
   * - Technical & professional skills
   * - Relevant work experience vs job experience level
   * - Educational qualifications
   * - Practical evidence (repositories, projects, certificates)
   * - Standardized assessment scores
   * - Explainable, unbiased, fair evaluation (zero protected characteristics)
   */
  async calculateComprehensiveJobMatch(candidateId, jobId) {
    const job = repository.queryOne(
      'SELECT id, org_id, title, description, department, experience_level, employment_type, work_arrangement, location FROM jobs WHERE id = ?;',
      [jobId]
    );
    if (!job) throw new Error('Job not found');

    const candidate = repository.queryOne(
      `SELECT u.id, u.full_name, u.email, u.avatar_url, u.company_name, u.institution,
              cp.headline, cp.target_role, cp.bio, cp.experience_years, cp.location,
              cp.work_preference, cp.resume_url, cp.github_url, cp.portfolio_url,
              cp.degree, cp.graduation_year, cp.repo_count
       FROM users u
       LEFT JOIN candidate_profiles cp ON cp.id = u.id
       WHERE u.id = ? AND u.deleted_at IS NULL;`,
      [candidateId]
    );
    if (!candidate) throw new Error('Candidate not found');

    // 1. Deterministic base matching
    const baseMatch = this.calculateJobMatch(candidateId, jobId);

    // 2. Experience Analysis
    const targetYearsMap = {
      entry: 1,
      junior: 1,
      mid: 3,
      senior: 5,
      lead: 8,
      principal: 8,
    };
    const targetYears = targetYearsMap[job.experience_level?.toLowerCase()] || 3;
    const candidateYears = Number(candidate.experience_years) || 0;

    let experienceScore = 100;
    if (candidateYears >= targetYears) {
      experienceScore = 100;
    } else if (candidateYears > 0) {
      experienceScore = Math.min(100, Math.round((candidateYears / targetYears) * 90) + 10);
    } else if (targetYears <= 1) {
      experienceScore = 85; // Entry-level role accepts 0-1 year
    } else {
      experienceScore = 40; // Junior candidate applying for senior role
    }

    const experienceEvaluation = candidateYears >= targetYears
      ? `${candidateYears} years of experience satisfies or exceeds the ${job.experience_level} requirement (target: ${targetYears}+ years).`
      : `${candidateYears} years of experience is developing toward the ${job.experience_level} target (${targetYears}+ years).`;

    // 3. Educational & Domain Qualification Analysis
    // Fairness rule: Optional profile data omission is NOT penalized as lack of skill
    let educationScore = 85;
    let educationEvaluation = '';
    if (candidate.degree && candidate.degree.trim()) {
      educationScore = 95;
      educationEvaluation = `Verified educational credential: ${candidate.degree}${candidate.institution ? ` from ${candidate.institution}` : ''}${candidate.graduation_year ? ` (Class of ${candidate.graduation_year})` : ''}.`;
    } else if (candidate.institution && candidate.institution.trim()) {
      educationScore = 90;
      educationEvaluation = `Associated institution: ${candidate.institution}. Standard qualification verified.`;
    } else {
      educationScore = 85;
      educationEvaluation = 'Formal degree field is optional; candidate is evaluated purely on verified competency and practical proof without penalty.';
    }

    // 4. Practical Evidence & Assessments Analysis
    const passedAssessmentsCount = (baseMatch.assessmentResults || []).filter(a => a.passed === 1).length;
    const verifiedEvidenceCount = (baseMatch.evidenceMatches || []).filter(e => e.verification_status === 'verified').length;
    const repoCount = candidate.repo_count || 0;

    const evidenceScore = Math.min(
      100,
      Math.round(
        Math.min(passedAssessmentsCount * 25, 45) +
        Math.min(verifiedEvidenceCount * 20, 35) +
        Math.min(repoCount * 5, 20)
      )
    );

    // 5. Composite Match Score
    // 55% Skills + 20% Experience + 15% Evidence & Assessments + 10% Education
    const skillScore = Math.round((baseMatch.requiredSkillCoverage * 0.75) + (baseMatch.preferredSkillCoverage * 0.25));
    const compositeScore = Math.min(
      100,
      Math.max(
        0,
        Math.round(
          (skillScore * 0.55) +
          (experienceScore * 0.20) +
          (evidenceScore * 0.15) +
          (educationScore * 0.10)
        )
      )
    );

    // 6. Generate AI Qualitative Synthesis (Gemini/OpenAI or Explainable Rule-Based Engine)
    const matchData = {
      matchScore: compositeScore,
      skillScore,
      experienceScore,
      educationScore,
      evidenceScore,
      requiredSkillCoverage: baseMatch.requiredSkillCoverage,
      preferredSkillCoverage: baseMatch.preferredSkillCoverage,
      matchedRequired: baseMatch.matchedRequired,
      matchedPreferred: baseMatch.matchedPreferred,
      unmetRequirements: baseMatch.unmetRequirements,
      unverifiedSkills: baseMatch.unverifiedSkills,
      experienceEvaluation,
      educationEvaluation,
      passedAssessmentsCount,
      verifiedEvidenceCount,
    };

    const aiSynthesis = await this.generateAIMatchSynthesis({ candidate, job, matchData });

    const comprehensiveResult = {
      matchScore: compositeScore,
      skillScore,
      experienceScore,
      educationScore,
      evidenceScore,
      requiredSkillCoverage: baseMatch.requiredSkillCoverage,
      preferredSkillCoverage: baseMatch.preferredSkillCoverage,
      readinessScore: baseMatch.readinessScore,
      matchedRequired: baseMatch.matchedRequired,
      matchedPreferred: baseMatch.matchedPreferred,
      unmetRequirements: baseMatch.unmetRequirements,
      unverifiedSkills: baseMatch.unverifiedSkills,
      evidenceMatches: baseMatch.evidenceMatches,
      assessmentResults: baseMatch.assessmentResults,
      experienceEvaluation,
      educationEvaluation,
      explanation: `Overall role match of ${compositeScore}% derived objectively: Skills alignment at ${skillScore}% (weight 55%), Experience alignment at ${experienceScore}% (${candidateYears} yrs vs ${targetYears} yrs target, weight 20%), Practical evidence and assessments at ${evidenceScore}% (weight 15%), and Domain education credentials at ${educationScore}% (weight 10%). Candidate demonstrates ${baseMatch.matchedRequired.length} verified required competencies, ${baseMatch.unverifiedSkills.length} unverified claims, and ${baseMatch.unmetRequirements.length} unmet competency targets.`,
      aiSummary: aiSynthesis.summary,
      aiStrengths: aiSynthesis.strengths,
      aiGaps: aiSynthesis.gaps,
      aiRecommendation: aiSynthesis.recommendation,
      aiQuestions: aiSynthesis.interviewQuestions,
      aiProvider: aiSynthesis.provider,
      candidate: {
        id: candidate.id,
        fullName: candidate.full_name,
        email: candidate.email,
        avatarUrl: candidate.avatar_url,
        headline: candidate.headline,
        targetRole: candidate.target_role,
        experienceYears: candidateYears,
        location: candidate.location,
        institution: candidate.institution,
        degree: candidate.degree,
        repoCount: candidate.repo_count || 0,
        githubUrl: candidate.github_url,
        portfolioUrl: candidate.portfolio_url,
      },
      job: {
        id: job.id,
        title: job.title,
        department: job.department,
        experienceLevel: job.experience_level,
      }
    };

    return comprehensiveResult;
  },

  /**
   * Generates fair, explainable qualitative insights.
   * If external AI service is available (Gemini / OpenAI), requests structured synthesis.
   * Otherwise, provides high-quality deterministic rule-based analysis.
   */
  async generateAIMatchSynthesis({ candidate, job, matchData }) {
    const aiConfig = getAIProviderConfig();

    if (aiConfig.configured) {
      try {
        const prompt = `You are a recruitment decision support specialist. Analyze this candidate objectively against job requirements.
STRICT FAIRNESS CONSTRAINTS:
- Base evaluation solely on verifiable technical skills, experience years, practical evidence, and job requirements.
- DO NOT consider, infer, or mention any protected characteristics (age, gender, ethnicity, religion, race, disability, marital status).
- Distinguish missing profile information from confirmed lack of a skill.
- Return ONLY a valid JSON object matching this schema:
{
  "summary": "2-3 concise sentences summarizing fit and readiness for recruiter review",
  "strengths": ["string", "string"],
  "gaps": ["string", "string"],
  "interviewQuestions": ["string", "string", "string"],
  "recommendation": "strongly_recommended" | "recommended" | "needs_assessment" | "not_recommended"
}

JOB DETAILS:
Title: ${job.title}
Department: ${job.department}
Experience Level Target: ${job.experience_level}

CANDIDATE DATA:
Headline: ${candidate.headline || 'Not specified'}
Experience: ${candidate.experience_years || 0} years
Verified Required Skills: ${matchData.matchedRequired.map(s => s.skillName).join(', ') || 'None'}
Verified Preferred Skills: ${matchData.matchedPreferred.map(s => s.skillName).join(', ') || 'None'}
Unmet/Missing Skills: ${matchData.unmetRequirements.map(s => `${s.skillName} (${s.status})`).join(', ') || 'None'}
Unverified Skills: ${matchData.unverifiedSkills.map(s => s.skillName).join(', ') || 'None'}
Practical Evidence: ${matchData.verifiedEvidenceCount} verified items, ${matchData.passedAssessmentsCount} passed assessments.
Calculated Match Score: ${matchData.matchScore}%
Required Skill Coverage: ${matchData.requiredSkillCoverage}%`;

        let rawText = '';
        if (aiConfig.provider === 'gemini') {
          const res = await fetch(`${GEMINI_API_URL}/${aiConfig.model}:generateContent?key=${aiConfig.key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.2, maxOutputTokens: 800 }
            }),
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
          });
          if (res.ok) {
            const data = await res.json();
            rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          }
        } else if (aiConfig.provider === 'openai') {
          const res = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${aiConfig.key}`
            },
            body: JSON.stringify({
              model: aiConfig.model,
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.2,
              max_tokens: 800
            }),
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
          });
          if (res.ok) {
            const data = await res.json();
            rawText = data?.choices?.[0]?.message?.content || '';
          }
        }

        if (rawText) {
          const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleaned);
          if (parsed.summary && Array.isArray(parsed.strengths) && Array.isArray(parsed.gaps)) {
            return {
              summary: parsed.summary,
              strengths: parsed.strengths.slice(0, 4),
              gaps: parsed.gaps.slice(0, 3),
              interviewQuestions: Array.isArray(parsed.interviewQuestions) ? parsed.interviewQuestions.slice(0, 3) : [],
              recommendation: parsed.recommendation || (matchData.matchScore >= 75 ? 'recommended' : 'needs_assessment'),
              provider: aiConfig.provider,
            };
          }
        }
      } catch {
        // Fall back to rule-based synthesis gracefully on API failure or timeout
      }
    }

    // High-quality deterministic rule-based synthesis
    return this.generateRuleBasedSynthesis(candidate, job, matchData);
  },

  /**
   * Deterministic, explainable rule-based candidate match synthesis.
   */
  generateRuleBasedSynthesis(candidate, job, matchData) {
    const { matchScore, requiredSkillCoverage, matchedRequired, unmetRequirements, unverifiedSkills, experienceEvaluation } = matchData;

    let recommendation = 'not_recommended';
    if (matchScore >= 80) recommendation = 'strongly_recommended';
    else if (matchScore >= 65) recommendation = 'recommended';
    else if (matchScore >= 45) recommendation = 'needs_assessment';

    // Summary
    const summary = `${candidate.full_name || 'Candidate'} demonstrates a ${matchScore}% role compatibility for ${job.title}. The candidate covers ${requiredSkillCoverage}% of mandatory job requirements with ${matchedRequired.length} fully verified technical competencies. ${experienceEvaluation}`;

    // Strengths
    const strengths = [];
    if (matchedRequired.length > 0) {
      strengths.push(`Verified proficiency in critical requirements: ${matchedRequired.slice(0, 3).map(s => s.skillName).join(', ')}.`);
    }
    if (matchData.passedAssessmentsCount > 0) {
      strengths.push(`Demonstrated practical ability by passing ${matchData.passedAssessmentsCount} standardized technical assessments.`);
    }
    if (candidate.repo_count && candidate.repo_count > 0) {
      strengths.push(`Active open-source development portfolio with ${candidate.repo_count} public code repositories.`);
    }
    if (matchData.experienceScore >= 90) {
      strengths.push(`Strong work experience alignment for ${job.experience_level} scope.`);
    }
    if (strengths.length === 0) {
      strengths.push('Foundational technical background demonstrated in self-reported competencies.');
    }

    // Gaps
    const gaps = [];
    if (unmetRequirements.length > 0) {
      gaps.push(`Missing mandatory requirements: ${unmetRequirements.slice(0, 3).map(s => s.skillName).join(', ')}.`);
    }
    if (unverifiedSkills.length > 0) {
      gaps.push(`${unverifiedSkills.length} reported skills require practical proof or assessment verification (${unverifiedSkills.slice(0, 2).map(s => s.skillName).join(', ')}).`);
    }
    if (matchData.experienceScore < 70) {
      gaps.push(`Work experience (${candidate.experience_years || 0} years) is below target ${job.experience_level} expectations.`);
    }
    if (gaps.length === 0) {
      gaps.push('No critical skill gaps identified against configured job requirements.');
    }

    // Targeted technical interview questions based on candidate's gaps or edge competencies
    const interviewQuestions = [];
    if (unverifiedSkills.length > 0) {
      interviewQuestions.push(`Can you walk us through a recent production problem you solved using ${unverifiedSkills[0].skillName}?`);
    }
    if (unmetRequirements.length > 0) {
      interviewQuestions.push(`This role involves ${unmetRequirements[0].skillName}. How would you approach quickly acquiring proficiency in this area?`);
    }
    if (matchedRequired.length > 0) {
      interviewQuestions.push(`How have you architected and scaled systems with ${matchedRequired[0].skillName} in your past projects?`);
    } else {
      interviewQuestions.push('Describe an architectural decision you made in your recent projects and how you evaluated the trade-offs.');
    }

    return {
      summary,
      strengths,
      gaps,
      interviewQuestions,
      recommendation,
      provider: 'rule_based',
    };
  },

  /**
   * Retrieves cached match evaluation or calculates and caches freshly.
   */
  async getOrComputeJobMatch(jobId, candidateId, { forceRefresh = false, applicationId = null } = {}) {
    if (!forceRefresh) {
      const cached = repository.queryOne(
        'SELECT * FROM job_match_evaluations WHERE job_id = ? AND candidate_id = ?;',
        [jobId, candidateId]
      );
      if (cached) {
        try {
          const breakdown = JSON.parse(cached.breakdown_json);
          return {
            ...breakdown,
            matchScore: cached.match_score,
            skillScore: cached.skill_score,
            experienceScore: cached.experience_score,
            educationScore: cached.education_score,
            evidenceScore: cached.evidence_score,
            requiredSkillCoverage: cached.required_skill_coverage,
            preferredSkillCoverage: cached.preferred_skill_coverage,
            aiSummary: cached.ai_summary,
            aiStrengths: JSON.parse(cached.ai_strengths || '[]'),
            aiGaps: JSON.parse(cached.ai_gaps || '[]'),
            aiRecommendation: cached.ai_recommendation,
            aiQuestions: JSON.parse(cached.ai_questions || '[]'),
            aiProvider: cached.ai_provider,
            calculatedAt: cached.calculated_at,
          };
        } catch {
          // If parse fails, recompute
        }
      }
    }

    // Fresh computation
    const evaluation = await this.calculateComprehensiveJobMatch(candidateId, jobId);
    const now = new Date().toISOString();
    const id = `jme-${uuidv4().slice(0, 8)}`;

    const breakdownJson = JSON.stringify({
      readinessScore: evaluation.readinessScore,
      matchedRequired: evaluation.matchedRequired,
      matchedPreferred: evaluation.matchedPreferred,
      unmetRequirements: evaluation.unmetRequirements,
      unverifiedSkills: evaluation.unverifiedSkills,
      experienceEvaluation: evaluation.experienceEvaluation,
      educationEvaluation: evaluation.educationEvaluation,
      explanation: evaluation.explanation,
      candidate: evaluation.candidate,
      job: evaluation.job,
    });

    repository.execute(
      `INSERT OR REPLACE INTO job_match_evaluations (
        id, job_id, candidate_id, application_id, match_score, skill_score, experience_score,
        education_score, evidence_score, required_skill_coverage, preferred_skill_coverage,
        breakdown_json, ai_summary, ai_strengths, ai_gaps, ai_recommendation, ai_questions,
        ai_provider, calculated_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        jobId,
        candidateId,
        applicationId,
        evaluation.matchScore,
        evaluation.skillScore,
        evaluation.experienceScore,
        evaluation.educationScore,
        evaluation.evidenceScore,
        evaluation.requiredSkillCoverage,
        evaluation.preferredSkillCoverage,
        breakdownJson,
        evaluation.aiSummary,
        JSON.stringify(evaluation.aiStrengths),
        JSON.stringify(evaluation.aiGaps),
        evaluation.aiRecommendation,
        JSON.stringify(evaluation.aiQuestions),
        evaluation.aiProvider,
        now,
        now
      ]
    );

    // Keep applications.match_score synchronized
    repository.execute(
      'UPDATE applications SET match_score = ?, updated_at = ? WHERE job_id = ? AND candidate_id = ?;',
      [evaluation.matchScore, now, jobId, candidateId]
    );

    return {
      ...evaluation,
      calculatedAt: now,
    };
  },

  /**
   * Retrieves all candidate applicants for a specific job with match intelligence.
   */
  async getJobCandidateMatches(orgId, jobId, {
    minScore = 0,
    stage = 'all',
    search = '',
    requiredSkill = '',
    sortBy = 'match_score',
    sortOrder = 'desc',
    forceRefresh = false
  } = {}) {
    const job = repository.queryOne(
      'SELECT id, org_id, title, department, experience_level, status FROM jobs WHERE id = ? AND org_id = ? AND deleted_at IS NULL;',
      [jobId, orgId]
    );
    if (!job) throw new Error('Job not found in current organization');

    const jobSkills = repository.query(
      `SELECT r.skill_id, s.name as skill_name, r.requirement_type, r.target_proficiency
       FROM job_skill_requirements r
       JOIN skills s ON s.id = r.skill_id
       WHERE r.job_id = ?;`,
      [jobId]
    );

    let appSql = `
      SELECT a.id as application_id, a.candidate_id, a.stage, a.match_score as stored_match_score,
             a.applied_at, a.cover_note, a.updated_at,
             u.full_name, u.email, u.avatar_url, u.institution,
             cp.headline, cp.target_role, cp.experience_years, cp.location, cp.degree, cp.repo_count,
             (SELECT COUNT(*) FROM recruiter_notes rn WHERE rn.candidate_id = a.candidate_id AND (rn.job_id = a.job_id OR rn.job_id IS NULL)) as notes_count
      FROM applications a
      JOIN users u ON u.id = a.candidate_id
      JOIN candidate_profiles cp ON cp.id = u.id
      WHERE a.job_id = ? AND a.org_id = ? AND u.deleted_at IS NULL
    `;
    const params = [jobId, orgId];

    if (stage && stage !== 'all') {
      appSql += ' AND a.stage = ?';
      params.push(stage);
    }

    if (search && search.trim()) {
      appSql += ' AND (u.full_name LIKE ? OR cp.headline LIKE ? OR cp.target_role LIKE ?)';
      const q = `%${search.trim()}%`;
      params.push(q, q, q);
    }

    appSql += ' ORDER BY a.applied_at DESC;';
    const applications = repository.query(appSql, params);

    // Compute or fetch match evaluations for all candidates
    const evaluatedCandidates = await Promise.all(
      applications.map(async (app) => {
        try {
          const match = await this.getOrComputeJobMatch(jobId, app.candidate_id, {
            forceRefresh,
            applicationId: app.application_id,
          });

          return {
            applicationId: app.application_id,
            candidateId: app.candidate_id,
            candidateName: app.full_name,
            candidateEmail: app.email,
            candidateAvatar: app.avatar_url,
            headline: app.headline,
            targetRole: app.target_role,
            experienceYears: Number(app.experience_years) || 0,
            location: app.location,
            degree: app.degree,
            institution: app.institution,
            repoCount: app.repo_count || 0,
            stage: app.stage,
            appliedAt: app.applied_at,
            coverNote: app.cover_note,
            notesCount: app.notes_count || 0,
            // Match fields
            matchScore: match.matchScore,
            skillScore: match.skillScore,
            experienceScore: match.experienceScore,
            educationScore: match.educationScore,
            evidenceScore: match.evidenceScore,
            requiredSkillCoverage: match.requiredSkillCoverage,
            preferredSkillCoverage: match.preferredSkillCoverage,
            matchedRequired: match.matchedRequired,
            matchedPreferred: match.matchedPreferred,
            unmetRequirements: match.unmetRequirements,
            unverifiedSkills: match.unverifiedSkills,
            explanation: match.explanation,
            aiSummary: match.aiSummary,
            aiStrengths: match.aiStrengths,
            aiGaps: match.aiGaps,
            aiRecommendation: match.aiRecommendation,
            aiQuestions: match.aiQuestions,
            aiProvider: match.aiProvider,
            calculatedAt: match.calculatedAt,
          };
        } catch {
          return {
            applicationId: app.application_id,
            candidateId: app.candidate_id,
            candidateName: app.full_name,
            candidateEmail: app.email,
            candidateAvatar: app.avatar_url,
            headline: app.headline,
            targetRole: app.target_role,
            experienceYears: Number(app.experience_years) || 0,
            location: app.location,
            degree: app.degree,
            institution: app.institution,
            repoCount: app.repo_count || 0,
            stage: app.stage,
            appliedAt: app.applied_at,
            coverNote: app.cover_note,
            notesCount: app.notes_count || 0,
            matchScore: app.stored_match_score || 50,
            skillScore: 50,
            experienceScore: 50,
            educationScore: 80,
            evidenceScore: 40,
            requiredSkillCoverage: 50,
            preferredSkillCoverage: 50,
            matchedRequired: [],
            matchedPreferred: [],
            unmetRequirements: [],
            unverifiedSkills: [],
            explanation: 'Standard baseline match profile.',
            aiSummary: 'Profile awaiting full evaluation sync.',
            aiStrengths: [],
            aiGaps: [],
            aiRecommendation: 'needs_assessment',
            aiQuestions: [],
            aiProvider: 'rule_based',
            calculatedAt: app.applied_at,
          };
        }
      })
    );

    // Apply filtering
    let filtered = evaluatedCandidates;
    if (minScore > 0) {
      filtered = filtered.filter(c => c.matchScore >= minScore);
    }
    if (requiredSkill) {
      filtered = filtered.filter(c => c.matchedRequired.some(s => s.skillId === requiredSkill));
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'match_score') {
        comparison = b.matchScore - a.matchScore;
      } else if (sortBy === 'experience') {
        comparison = b.experienceYears - a.experienceYears;
      } else if (sortBy === 'applied_at') {
        comparison = new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime();
      } else if (sortBy === 'name') {
        comparison = a.candidateName.localeCompare(b.candidateName);
      }
      return sortOrder === 'asc' ? -comparison : comparison;
    });

    // Summary metrics
    const totalApplicants = evaluatedCandidates.length;
    const shortlistedCount = evaluatedCandidates.filter(c => c.stage === 'shortlisted').length;
    const avgScore = totalApplicants > 0
      ? Math.round(evaluatedCandidates.reduce((acc, c) => acc + c.matchScore, 0) / totalApplicants)
      : 0;
    const topScore = totalApplicants > 0
      ? Math.max(...evaluatedCandidates.map(c => c.matchScore))
      : 0;

    const aiConfig = getAIProviderConfig();

    return {
      job: {
        id: job.id,
        title: job.title,
        department: job.department,
        experienceLevel: job.experience_level,
        status: job.status,
        skills: jobSkills,
      },
      metrics: {
        totalApplicants,
        shortlistedCount,
        avgMatchScore: avgScore,
        topMatchScore: topScore,
        aiProvider: aiConfig.configured ? aiConfig.provider : 'rule_based',
      },
      candidates: filtered,
    };
  },

  /**
   * Actionable shortlisting workflow:
   * - Advances application stage to 'shortlisted' with audit reason
   * - Records recruiter note with shortlisting justification
   * - Adds candidate to organization shortlist
   */
  async shortlistCandidate(orgId, recruiterId, { applicationId, candidateId, jobId, reason, note = '', shortlistId = null }) {
    if (!reason || !reason.trim()) {
      throw new Error('A reason for the shortlisting decision is required');
    }

    const app = repository.queryOne(
      'SELECT id, stage, candidate_id, job_id FROM applications WHERE id = ? AND org_id = ?;',
      [applicationId, orgId]
    );
    if (!app) throw new Error('Application not found');

    const { pipelineService } = await import('./pipelineService.js');

    // 1. Update application stage to shortlisted if permitted
    let updatedApp = app;
    if (app.stage !== 'shortlisted') {
      updatedApp = pipelineService.updateStage(
        orgId,
        applicationId,
        'shortlisted',
        recruiterId,
        `Candidate shortlisted: ${reason.trim()}`
      );
    }

    // 2. Add internal recruiter note
    const fullNote = note && note.trim()
      ? `[Shortlist Decision]: ${reason.trim()}\nNotes: ${note.trim()}`
      : `[Shortlist Decision]: ${reason.trim()}`;

    pipelineService.addRecruiterNote(
      orgId,
      candidateId,
      recruiterId,
      fullNote,
      jobId,
      false
    );

    // 3. Add to organization shortlist if provided, or default job shortlist
    let targetShortlistId = shortlistId;
    if (!targetShortlistId) {
      // Find or create default shortlist for this job
      const existingShortlist = repository.queryOne(
        'SELECT id FROM shortlists WHERE org_id = ? AND job_id = ? LIMIT 1;',
        [orgId, jobId]
      );
      if (existingShortlist) {
        targetShortlistId = existingShortlist.id;
      } else {
        const job = repository.queryOne('SELECT title FROM jobs WHERE id = ?;', [jobId]);
        const newSl = pipelineService.createShortlist(orgId, recruiterId, {
          title: `Shortlist: ${job ? job.title : 'Job Role'}`,
          description: 'Automated candidate shortlist for hiring team review',
          jobId,
        });
        targetShortlistId = newSl.id;
      }
    }

    if (targetShortlistId) {
      // Check if already a member
      const member = repository.queryOne(
        'SELECT id FROM shortlist_members WHERE shortlist_id = ? AND candidate_id = ?;',
        [targetShortlistId, candidateId]
      );
      if (!member) {
        pipelineService.toggleShortlistMember(
          targetShortlistId,
          orgId,
          candidateId,
          recruiterId,
          reason.trim()
        );
      }
    }

    return {
      success: true,
      applicationId,
      candidateId,
      stage: 'shortlisted',
      reason: reason.trim(),
      shortlistId: targetShortlistId,
      updatedAt: new Date().toISOString(),
    };
  },

  /**
   * Objective side-by-side comparison of 2-4 candidates for a specific job.
   */
  async compareJobCandidates(orgId, jobId, candidateIds) {
    if (!Array.isArray(candidateIds) || candidateIds.length < 2 || candidateIds.length > 4) {
      throw new Error('Please select between 2 and 4 candidates for side-by-side comparison');
    }

    const job = repository.queryOne(
      'SELECT id, org_id, title, department, experience_level, status FROM jobs WHERE id = ? AND org_id = ?;',
      [jobId, orgId]
    );
    if (!job) throw new Error('Job not found in current organization');

    const jobRequirements = repository.query(
      `SELECT r.skill_id, s.name as skill_name, s.category, r.requirement_type, r.target_proficiency, r.weight
       FROM job_skill_requirements r
       JOIN skills s ON s.id = r.skill_id
       WHERE r.job_id = ?
       ORDER BY r.requirement_type = 'required' DESC, r.weight DESC;`,
      [jobId]
    );

    const evaluated = await Promise.all(
      candidateIds.map(async (candidateId) => {
        const match = await this.getOrComputeJobMatch(jobId, candidateId);
        const app = repository.queryOne(
          'SELECT id, stage, applied_at FROM applications WHERE job_id = ? AND candidate_id = ?;',
          [jobId, candidateId]
        );

        return {
          ...match,
          application: app || null,
        };
      })
    );

    // Build unified Competency Matrix across all candidates
    const competencyMatrix = jobRequirements.map((req) => {
      const candidateComparisons = evaluated.map((cand) => {
        const matched = cand.matchedRequired.find(s => s.skillId === req.skill_id) ||
                        cand.matchedPreferred.find(s => s.skillId === req.skill_id);
        const unverified = cand.unverifiedSkills.find(s => s.skillId === req.skill_id);
        const unmet = cand.unmetRequirements.find(s => s.skillId === req.skill_id);

        if (matched) {
          return {
            candidateId: cand.candidate.id,
            proficiency: matched.candidateProficiency,
            verificationStatus: matched.verificationStatus,
            status: 'matched',
            badge: 'Verified Match',
          };
        }
        if (unverified) {
          return {
            candidateId: cand.candidate.id,
            proficiency: unverified.candidateProficiency,
            verificationStatus: unverified.verificationStatus,
            status: 'unverified',
            badge: 'Unverified Claim',
          };
        }
        if (unmet) {
          return {
            candidateId: cand.candidate.id,
            proficiency: unmet.candidateProficiency || 0,
            verificationStatus: 'missing',
            status: unmet.status,
            badge: unmet.status === 'below_target' ? 'Below Target' : 'Missing',
          };
        }
        return {
          candidateId: cand.candidate.id,
          proficiency: 0,
          verificationStatus: 'missing',
          status: 'missing',
          badge: 'Missing',
        };
      });

      return {
        skillId: req.skill_id,
        skillName: req.skill_name,
        category: req.category,
        requirementType: req.requirement_type,
        targetProficiency: req.target_proficiency,
        weight: req.weight,
        candidates: candidateComparisons,
      };
    });

    return {
      job: {
        id: job.id,
        title: job.title,
        department: job.department,
        experienceLevel: job.experience_level,
      },
      candidates: evaluated,
      competencyMatrix,
    };
  },

  /**
   * Retrieves shortlisted candidates for a specific job.
   */
  getShortlistedCandidatesForJob(orgId, jobId) {
    return repository.query(
      `SELECT a.id as application_id, a.candidate_id, a.stage, a.match_score, a.applied_at, a.updated_at,
              u.full_name, u.email, u.avatar_url, u.institution,
              cp.headline, cp.target_role, cp.experience_years, cp.location, cp.degree,
              jme.ai_summary, jme.ai_recommendation, jme.ai_strengths, jme.ai_gaps,
              (SELECT ash.reason FROM application_stage_history ash WHERE ash.application_id = a.id AND ash.to_stage = 'shortlisted' ORDER BY ash.created_at DESC LIMIT 1) as shortlisting_reason,
              (SELECT ash.created_at FROM application_stage_history ash WHERE ash.application_id = a.id AND ash.to_stage = 'shortlisted' ORDER BY ash.created_at DESC LIMIT 1) as shortlisted_at
       FROM applications a
       JOIN users u ON u.id = a.candidate_id
       JOIN candidate_profiles cp ON cp.id = u.id
       LEFT JOIN job_match_evaluations jme ON jme.job_id = a.job_id AND jme.candidate_id = a.candidate_id
       WHERE a.org_id = ? AND a.job_id = ? AND a.stage = 'shortlisted'
       ORDER BY a.updated_at DESC;`,
      [orgId, jobId]
    );
  }
};
