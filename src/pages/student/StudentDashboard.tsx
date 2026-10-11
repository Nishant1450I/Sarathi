import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain,
  Map,
  FolderGit2,
  Award,
  AlertCircle,
  Sparkles,
  TrendingUp,
  Play,
  Briefcase,
  CheckCircle2,
  Target,
  ChevronRight,
  X,
  ExternalLink,
  Clock,
  ShieldCheck,
  HelpCircle,
  Activity,
  FileCheck2,
  Layers,
  ListChecks,
  Code2
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { ProgressBar } from '../../components/common/ProgressBar';
import { Modal } from '../../components/common/Modal';
import { useStudent } from '../../context/StudentContext';
import { useAuth } from '../../context/AuthContext';
import { mockOpportunitiesData } from '../../data/mockOpportunities';
import { OpportunityService } from '../../services/opportunityService';
import type { OpportunityItem } from '../../types/opportunity';
import { getRoleRequirements } from '../../data/domainsCatalog';
import { DomainRoleSelector } from '../../components/common/DomainRoleSelector';

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const {
    targetDomain,
    setTargetDomain,
    targetRole,
    setTargetRole,
    skills,
    roadmap,
    projects,
    skillGaps,
    overallReadinessScore,
    assessedSkillsCount,
    selfReportedSkillsCount,
    assessmentHistory,
    hasReviewedGaps,
    onboardingDismissed,
    setOnboardingDismissed,
    generateRoadmap
  } = useStudent();
  const navigate = useNavigate();

  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [readinessExplainerOpen, setReadinessExplainerOpen] = useState(false);
  const [selectedRoleOption, setSelectedRoleOption] = useState(targetRole || 'Full-Stack Developer');
  const [selectedDomainOption, setSelectedDomainOption] = useState(targetDomain || 'web-dev');

  const highPriorityGaps = skillGaps.filter(g => g.priority === 'High');
  const mediumPriorityGaps = skillGaps.filter(g => g.priority === 'Medium');
  const hasTargetRole = Boolean(targetRole && targetRole !== 'Not selected yet');
  const roleReqs = getRoleRequirements(targetRole);

  // Latest assessment details
  const latestAssessment = assessmentHistory && assessmentHistory.length > 0
    ? assessmentHistory[assessmentHistory.length - 1]
    : null;

  // Check onboarding checklist states
  const hasBasicProfile = Boolean(user?.institution && user?.degree);
  const hasCompletedAssessment = assessedSkillsCount > 0;
  const hasRoadmap = Boolean(roadmap && roadmap.stages && roadmap.stages.length > 0);
  const hasProjects = projects.length > 0;

  const onboardingSteps = [
    { id: 1, title: 'Complete Basic Profile', isDone: hasBasicProfile, path: '/student/profile' },
    { id: 2, title: 'Select Target Career Role', isDone: hasTargetRole, action: () => setRoleModalOpen(true) },
    { id: 3, title: 'Take Skill Assessment', isDone: hasCompletedAssessment, path: '/student/assessment' },
    { id: 4, title: 'Review Skill Gap Analysis', isDone: hasReviewedGaps, path: '/student/skill-gap' },
    { id: 5, title: 'Generate Personalized Roadmap', isDone: hasRoadmap, action: () => generateRoadmap() },
    { id: 6, title: 'Add Project Evidence', isDone: hasProjects, path: '/student/projects' }
  ];

  const completedStepsCount = onboardingSteps.filter(s => s.isDone).length;
  const showOnboardingGuide = !onboardingDismissed && completedStepsCount < onboardingSteps.length;

  // Chart data combining required skills with assessed skills
  const chartData = React.useMemo(() => {
    if (!hasCompletedAssessment) {
      return [];
    }

    if (roleReqs.requiredSkills.length > 0) {
      return roleReqs.requiredSkills.slice(0, 6).map(req => {
        const studentSkill = skills.find(s => s.name.toLowerCase() === req.skillName.toLowerCase());
        const isAssessed = studentSkill && studentSkill.status !== 'self-reported';
        const isSelfReported = studentSkill && studentSkill.status === 'self-reported';
        return {
          name: req.skillName,
          level: studentSkill ? studentSkill.proficiencyLevel : 0,
          target: req.requiredProficiency,
          status: isAssessed ? 'assessed' : isSelfReported ? 'self-reported' : 'unassessed'
        };
      });
    }

    return skills.slice(0, 6).map(s => ({
      name: s.name,
      level: s.proficiencyLevel,
      target: 4,
      status: s.status === 'self-reported' ? 'self-reported' : 'assessed'
    }));
  }, [hasCompletedAssessment, roleReqs, skills]);

  const [liveOpportunities, setLiveOpportunities] = useState<OpportunityItem[]>([]);

  React.useEffect(() => {
    let mounted = true;
    OpportunityService.fetchPublicOpportunities()
      .then(jobs => {
        if (mounted && jobs && jobs.length > 0) {
          setLiveOpportunities(jobs);
        }
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  // Calculate opportunity matches for widgets
  const topMatchedOpportunities = React.useMemo(() => {
    if (!hasTargetRole || !hasCompletedAssessment) {
      return [];
    }

    const sourceOpportunities = liveOpportunities.length > 0 ? liveOpportunities : mockOpportunitiesData;

    return sourceOpportunities
      .map(opp => ({
        opportunity: opp,
        match: OpportunityService.calculateSkillMatch(opp, skills)
      }))
      .sort((a, b) => b.match.overallMatchScore - a.match.overallMatchScore)
      .slice(0, 2);
  }, [hasTargetRole, hasCompletedAssessment, skills, liveOpportunities]);

  // Determine next recommended task strictly based on sequence & roadmap
  const recommendedNextAction = React.useMemo(() => {
    // 1. Basic profile
    if (!hasBasicProfile) {
      return {
        badge: 'Step 1: Profile',
        title: 'Complete Your Basic Profile',
        description: 'Add your institution, degree program, and graduation year to calibrate recommendations and passport credentials.',
        actionLabel: 'Complete Profile',
        action: () => navigate('/student/profile')
      };
    }

    // 2. Target role
    if (!hasTargetRole) {
      return {
        badge: 'Step 2: Career Goal',
        title: 'Choose Your Target Career Role',
        description: 'Select your target engineering specialization to calibrate benchmark requirements and gap analysis.',
        actionLabel: 'Choose Target Role',
        action: () => setRoleModalOpen(true)
      };
    }

    // 3. Skill Assessment
    if (!hasCompletedAssessment) {
      return {
        badge: 'Step 3: Diagnostic Assessment',
        title: 'Take Technical Skill Assessment',
        description: `Complete diagnostic evaluation questions for ${targetRole} to benchmark your baseline proficiency without fabricated claims.`,
        actionLabel: 'Start Skill Assessment',
        action: () => navigate('/student/assessment')
      };
    }

    // 4. Review Gaps
    if (!hasReviewedGaps) {
      return {
        badge: 'Step 4: Skill Gaps',
        title: 'Review Your Skill Gap Analysis',
        description: 'Inspect where your assessed skills match industry benchmarks and identify high-priority skill gaps.',
        actionLabel: 'Review Skill Gaps',
        action: () => navigate('/student/skill-gap')
      };
    }

    // 5. Generate Roadmap
    if (!hasRoadmap) {
      return {
        badge: 'Step 5: Personalized Roadmap',
        title: 'Generate Personalized Learning Roadmap',
        description: `Generate a structured, milestone curriculum with curated free resources for ${targetRole}.`,
        actionLabel: 'Generate Roadmap',
        action: () => {
          generateRoadmap();
          navigate('/student/roadmap');
        }
      };
    }

    // 6. Next Task from Roadmap (prefer recommendedNextTaskId or first incomplete)
    if (roadmap && roadmap.stages.length > 0) {
      if (roadmap.recommendedNextTaskId) {
        for (const stage of roadmap.stages) {
          const matchedTask = stage.tasks.find(t => t.id === roadmap.recommendedNextTaskId && !t.isCompleted);
          if (matchedTask) {
            return {
              badge: `${stage.title} • Priority Task`,
              title: matchedTask.topic,
              description: matchedTask.description,
              duration: matchedTask.estimatedDuration,
              resourceUrl: matchedTask.resourceUrl,
              resourceName: matchedTask.resourceName,
              actionLabel: 'Start Task',
              action: () => navigate('/student/roadmap')
            };
          }
        }
      }

      for (const stage of roadmap.stages) {
        const nextTask = stage.tasks.find(t => !t.isCompleted);
        if (nextTask) {
          return {
            badge: `${stage.title} • Task`,
            title: nextTask.topic,
            description: nextTask.description,
            duration: nextTask.estimatedDuration,
            resourceUrl: nextTask.resourceUrl,
            resourceName: nextTask.resourceName,
            actionLabel: 'Start Task',
            action: () => navigate('/student/roadmap')
          };
        }
      }
    }

    // 7. Add Project Evidence
    return {
      badge: 'Step 7: Project Portfolio',
      title: 'Add Project Evidence to Skill Passport',
      description: 'Submit your code repository links to demonstrate verified proof of work for recruiters.',
      actionLabel: 'Add Project',
      action: () => navigate('/student/projects')
    };
  }, [
    hasBasicProfile,
    hasTargetRole,
    hasCompletedAssessment,
    hasReviewedGaps,
    hasRoadmap,
    targetRole,
    roadmap,
    navigate,
    generateRoadmap
  ]);

  const handleSaveRole = () => {
    if (selectedRoleOption) {
      setTargetRole(selectedRoleOption, selectedDomainOption);
      if (selectedDomainOption) setTargetDomain(selectedDomainOption);
      setRoleModalOpen(false);
    }
  };

  // Readiness Calculation Breakdown (transparent explainability)
  const requiredCount = roleReqs.requiredSkills.length || 6;
  const benchmarkCoveragePct = Math.round(Math.min(100, (assessedSkillsCount / Math.max(1, requiredCount)) * 100));
  const verifiedProjectsCount = projects.filter(p => p.verificationStatus === 'verified').length;

  return (
    <div className="space-y-8 pb-12">
      {/* 1. WELCOME SECTION WITH STUDENT NAME & CAREER DOMAIN */}
      <div className="rounded-3xl bg-gradient-to-r from-[#0B1B43] via-[#087BFA] to-[#603DF5] p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-white/10">
        <div className="absolute -right-10 -top-10 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center flex-wrap gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                <span>Domain: <strong>{roadmap?.domainTitle || targetDomain.toUpperCase()}</strong></span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-blue-100 text-xs font-medium">
                <Target className="w-3.5 h-3.5 text-blue-200" />
                <span>Target Role: <strong>{hasTargetRole ? targetRole : 'Not selected yet'}</strong></span>
              </span>
              {user?.degree && (
                <span className="text-xs text-blue-200/80 hidden sm:inline">
                  • {user.degree} {user.institution ? `at ${user.institution}` : ''}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
              {user?.fullName ? `Welcome back, ${user.fullName}!` : 'Welcome to SARATHI!'}
            </h1>

            <p className="text-blue-100 text-xs sm:text-sm leading-relaxed max-w-xl">
              {!hasTargetRole ? (
                'Your career journey starts here. Select your target role to calibrate industry benchmarks, unlock diagnostic assessments, and generate your personalized roadmap.'
              ) : !hasCompletedAssessment ? (
                `You are tracking towards ${targetRole}. Take your diagnostic skill assessment to identify strengths, reveal high-priority skill gaps, and activate learning milestones.`
              ) : (
                <>
                  Your career readiness is at{' '}
                  <span className="font-black text-white px-1.5 py-0.5 rounded-md bg-white/20">{overallReadinessScore}%</span>.
                  {' '}Follow your domain roadmap below to close remaining skill gaps and strengthen your verifiable Skill Passport.
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0 self-stretch sm:self-auto">
            <Button
              variant="white"
              size="sm"
              className="font-extrabold shadow-lg text-xs"
              onClick={() => {
                setSelectedRoleOption(targetRole || 'Full-Stack Developer');
                setSelectedDomainOption(targetDomain || 'web-dev');
                setRoleModalOpen(true);
              }}
              leftIcon={<Target className="w-4 h-4 text-[#603DF5]" />}
            >
              Change Career Domain
            </Button>

            {!hasCompletedAssessment ? (
              <Button
                variant="white"
                size="sm"
                className="font-extrabold shadow-lg text-xs"
                onClick={() => navigate('/student/assessment')}
                leftIcon={<Brain className="w-4 h-4 text-[#603DF5]" />}
              >
                Start Assessment
              </Button>
            ) : (
              <Button
                variant="white"
                size="sm"
                className="font-extrabold shadow-lg text-xs"
                onClick={() => navigate('/student/roadmap')}
                leftIcon={<Map className="w-4 h-4 text-[#603DF5]" />}
              >
                Continue Roadmap
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ONBOARDING PROGRESS CHECKLIST */}
      {showOnboardingGuide && (
        <Card className="p-6 bg-white border border-[#E0E7F2] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 text-[#087BFA] shrink-0">
                <ListChecks className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-extrabold text-[#0B1B43] text-sm tracking-tight">Career Journey Onboarding Milestones</h2>
                <p className="text-xs text-[#405B8B]">Complete these sequential steps to establish your verifiable hiring credentials</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-[#087BFA] px-2.5 py-1 rounded-full bg-blue-50">
                {completedStepsCount} of {onboardingSteps.length} Completed
              </span>
              <button
                onClick={() => setOnboardingDismissed(true)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                title="Dismiss checklist"
                aria-label="Dismiss checklist"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <ProgressBar
            progress={Math.round((completedStepsCount / onboardingSteps.length) * 100)}
            color="gradient"
            size="sm"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {onboardingSteps.map(step => (
              <div
                key={step.id}
                onClick={() => {
                  if (step.action) step.action();
                  else if (step.path) navigate(step.path);
                }}
                className={`p-3.5 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-all ${
                  step.isDone
                    ? 'bg-emerald-50/60 border-emerald-200 text-[#0B1B43] hover:border-emerald-300'
                    : 'bg-[#F8FAFC] border-[#E0E7F2] hover:border-[#087BFA] hover:bg-white text-[#0B1B43] hover:shadow-2xs'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {step.isDone ? (
                    <CheckCircle2 className="w-4.5 h-4.5 text-[#16A34A] shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-slate-300 text-[10px] font-bold flex items-center justify-center text-slate-500 shrink-0">
                      {step.id}
                    </div>
                  )}
                  <span className={`font-semibold truncate ${step.isDone ? 'text-slate-600' : 'text-[#0B1B43]'}`}>
                    {step.title}
                  </span>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 shrink-0 ml-2 ${step.isDone ? 'text-emerald-500' : 'text-slate-400'}`} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 2. CAREER READINESS OVERVIEW WITH CLEARLY EXPLAINED METRICS */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-black text-[#0B1B43] tracking-tight">Career Readiness Overview</h2>
            <p className="text-xs text-[#405B8B]">Explainable readiness metrics benchmarked against verified hiring criteria</p>
          </div>
          <button
            onClick={() => setReadinessExplainerOpen(true)}
            className="text-xs font-bold text-[#087BFA] hover:text-blue-700 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>How is readiness calculated?</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Overall Readiness */}
          <Card hoverEffect borderAccent="blue" className="flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-[#405B8B] uppercase tracking-wider">Career Readiness</span>
                <div className="p-2 rounded-xl bg-blue-50 text-[#087BFA]">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-[#0B1B43] mb-2 tracking-tight">
                {overallReadinessScore !== null ? `${overallReadinessScore}%` : 'Not assessed'}
              </div>
            </div>
            <div className="space-y-1.5 pt-1">
              <ProgressBar progress={overallReadinessScore || 0} color="gradient" size="sm" />
              <div className="flex items-center justify-between text-[11px] text-[#405B8B]">
                <span>{benchmarkCoveragePct}% benchmark coverage</span>
                <span className="font-semibold text-[#087BFA]">
                  {overallReadinessScore && overallReadinessScore >= 80 ? 'Job Ready' : 'Developing'}
                </span>
              </div>
            </div>
          </Card>

          {/* Card 2: Assessed vs Self-Reported */}
          <Card hoverEffect borderAccent="purple" className="flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-[#405B8B] uppercase tracking-wider">Assessed Skills</span>
                <div className="p-2 rounded-xl bg-purple-50 text-[#603DF5]">
                  <Brain className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-[#0B1B43] mb-2 tracking-tight">
                {assessedSkillsCount}
              </div>
            </div>
            <div className="pt-1 text-[11px] text-[#405B8B] flex items-center justify-between">
              <span>{selfReportedSkillsCount} unverified self-claims</span>
              <button
                onClick={() => navigate('/student/assessment')}
                className="font-bold text-[#603DF5] hover:underline cursor-pointer"
              >
                Assess More
              </button>
            </div>
          </Card>

          {/* Card 3: High Priority Gaps */}
          <Card hoverEffect borderAccent="amber" className="flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-[#405B8B] uppercase tracking-wider">High Priority Gaps</span>
                <div className="p-2 rounded-xl bg-amber-50 text-[#D97706]">
                  <AlertCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-[#0B1B43] mb-2 tracking-tight">
                {!hasCompletedAssessment ? 'Pending test' : highPriorityGaps.length}
              </div>
            </div>
            <div className="pt-1 text-[11px] text-[#D97706] font-semibold truncate flex items-center justify-between">
              <span className="truncate">
                {!hasCompletedAssessment
                  ? 'Take assessment to calculate'
                  : highPriorityGaps.length > 0
                  ? highPriorityGaps.map(g => g.skillName).join(', ')
                  : 'All core gaps bridged!'}
              </span>
              <button
                onClick={() => navigate('/student/skill-gap')}
                className="font-bold text-[#D97706] hover:underline ml-1 shrink-0 cursor-pointer"
              >
                View
              </button>
            </div>
          </Card>

          {/* Card 4: Roadmap Progress */}
          <Card hoverEffect borderAccent="green" className="flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-[#405B8B] uppercase tracking-wider">Roadmap Progress</span>
                <div className="p-2 rounded-xl bg-emerald-50 text-[#16A34A]">
                  <Map className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-[#0B1B43] mb-2 tracking-tight">
                {!hasRoadmap || !roadmap ? 'Not created' : `${roadmap.overallProgress}%`}
              </div>
            </div>
            <div className="space-y-1.5 pt-1">
              <ProgressBar progress={roadmap?.overallProgress || 0} color="green" size="sm" />
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#405B8B]">
                  {!hasRoadmap || !roadmap ? 'Generate to start path' : `${roadmap.stages.length} Active Stages`}
                </span>
                <button
                  onClick={() => navigate('/student/roadmap')}
                  className="text-[#16A34A] font-bold hover:underline cursor-pointer"
                >
                  View Track
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* 3. THE 3 CORE PILLARS: CLEARLY DISTINGUISHED CONTAINER SECTIONS */}
      {/* SECTION HEADER: Distinguishing Assessment, Gap Analysis, and Roadmap */}
      <div className="space-y-6">
        <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#087BFA]" />
            <h2 className="text-lg font-black text-[#0B1B43] tracking-tight">
              Three-Pillar Career Engine
            </h2>
          </div>
          <span className="text-xs font-semibold text-[#405B8B]">
            Assessment → Gap Analysis → Structured Roadmap
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* PILLAR 1: SKILL ASSESSMENT (Measuring Current Skills) */}
          <Card borderAccent="purple" className="flex flex-col justify-between space-y-4 bg-gradient-to-b from-purple-50/30 to-white">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-100 text-[#603DF5]">
                    <Brain className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#603DF5] block">Pillar 1 • Diagnostic</span>
                    <h3 className="font-extrabold text-[#0B1B43] text-sm">Skill Assessment</h3>
                  </div>
                </div>
                <Badge variant="purple" size="xs">Measure Current</Badge>
              </div>

              <p className="text-xs text-[#405B8B] leading-relaxed">
                Objective evaluations measuring your baseline technical capabilities against standard rubrics.
              </p>

              {/* Assessment Status Box */}
              <div className="p-3.5 rounded-xl bg-white border border-purple-100 space-y-2 text-xs">
                {latestAssessment ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#0B1B43]">Latest Diagnostic Score:</span>
                      <span className="font-black text-[#603DF5] text-sm">{latestAssessment.overallScore}%</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#405B8B]">
                      <span>Questions Evaluated:</span>
                      <span>{latestAssessment.answersSummary?.length || 0} questions</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#405B8B]">
                      <span>Evaluated On:</span>
                      <span>{new Date(latestAssessment.completedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="pt-1.5 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Verified Test Record in Dossier</span>
                    </div>
                  </>
                ) : (
                  <div className="py-2 text-center text-[#405B8B] space-y-2">
                    <p className="text-[11px]">No diagnostic assessments completed for this domain yet.</p>
                    <span className="inline-block text-[10px] px-2 py-0.5 rounded bg-purple-50 text-[#603DF5] font-semibold">
                      Diagnostic questions available
                    </span>
                  </div>
                )}
              </div>
            </div>

            <Button
              variant="purple"
              size="sm"
              className="w-full"
              onClick={() => navigate('/student/assessment')}
              leftIcon={<Brain className="w-3.5 h-3.5" />}
            >
              {hasCompletedAssessment ? 'Retake / Add Assessment' : 'Take Skill Assessment'}
            </Button>
          </Card>

          {/* PILLAR 2: SKILL GAP ANALYSIS (Identifying Missing Skills) */}
          <Card borderAccent="amber" className="flex flex-col justify-between space-y-4 bg-gradient-to-b from-amber-50/30 to-white">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-100 text-[#D97706]">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#D97706] block">Pillar 2 • Variance</span>
                    <h3 className="font-extrabold text-[#0B1B43] text-sm">Skill Gap Analysis</h3>
                  </div>
                </div>
                <Badge variant="warning" size="xs">Identify Missing</Badge>
              </div>

              <p className="text-xs text-[#405B8B] leading-relaxed">
                Pinpoints the exact variance between your evaluated skills and employer hiring benchmarks for {targetRole || 'your target role'}.
              </p>

              {/* Top Gaps List */}
              <div className="p-3.5 rounded-xl bg-white border border-amber-100 space-y-2 text-xs">
                {!hasCompletedAssessment ? (
                  <div className="py-3 text-center text-[#405B8B] text-[11px]">
                    Complete diagnostic assessment to calculate high-priority missing skills.
                  </div>
                ) : highPriorityGaps.length === 0 && mediumPriorityGaps.length === 0 ? (
                  <div className="py-2 text-center text-emerald-700 text-xs font-semibold flex flex-col items-center gap-1">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>All benchmark skills at target proficiency!</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-[#405B8B]">
                      <span>Top Target Role Gaps</span>
                      <span>Priority</span>
                    </div>
                    {highPriorityGaps.slice(0, 2).map(gap => (
                      <div key={gap.skillName} className="flex items-center justify-between text-xs py-0.5">
                        <span className="font-bold text-[#0B1B43] truncate max-w-[140px]">{gap.skillName}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                          High (Lvl {gap.currentProficiency} → {gap.requiredProficiency})
                        </span>
                      </div>
                    ))}
                    {mediumPriorityGaps.slice(0, 1).map(gap => (
                      <div key={gap.skillName} className="flex items-center justify-between text-xs py-0.5">
                        <span className="font-semibold text-slate-700 truncate max-w-[140px]">{gap.skillName}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                          Med (Lvl {gap.currentProficiency} → {gap.requiredProficiency})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full border-amber-300 text-[#D97706] hover:bg-amber-50"
              onClick={() => navigate('/student/skill-gap')}
              leftIcon={<AlertCircle className="w-3.5 h-3.5" />}
            >
              View Full Gap Matrix
            </Button>
          </Card>

          {/* PILLAR 3: CAREER ROADMAP (Guiding What to Learn Next) */}
          <Card borderAccent="blue" className="flex flex-col justify-between space-y-4 bg-gradient-to-b from-blue-50/30 to-white">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-100 text-[#087BFA]">
                    <Map className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#087BFA] block">Pillar 3 • Curriculum</span>
                    <h3 className="font-extrabold text-[#0B1B43] text-sm">Career Roadmap</h3>
                  </div>
                </div>
                <Badge variant="blue" size="xs">Guide Next Steps</Badge>
              </div>

              <p className="text-xs text-[#405B8B] leading-relaxed">
                Structured domain curriculum with milestones, estimated timelines, and free curated technical resources.
              </p>

              {/* Active Roadmap Status */}
              <div className="p-3.5 rounded-xl bg-white border border-blue-100 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#0B1B43] truncate">{roadmap?.domainTitle || roadmap?.targetRole || targetDomain}</span>
                  <span className="font-black text-[#087BFA]">{roadmap?.overallProgress || 0}%</span>
                </div>
                <ProgressBar progress={roadmap?.overallProgress || 0} color="gradient" size="sm" />
                <div className="flex items-center justify-between text-[11px] text-[#405B8B] pt-1">
                  <span>{roadmap?.stages?.length || 0} Structured Stages</span>
                  <span className="font-medium text-emerald-700">Free Curated Docs</span>
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              className="w-full"
              onClick={() => navigate('/student/roadmap')}
              leftIcon={<Map className="w-3.5 h-3.5" />}
            >
              Open Full Roadmap
            </Button>
          </Card>
        </div>
      </div>

      {/* RECOMMENDED NEXT TASK SPOTLIGHT (Connecting Roadmap & Skill Gaps) */}
      <Card borderAccent="purple" className="p-6 space-y-4 bg-gradient-to-r from-purple-50/40 via-white to-blue-50/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-100 text-[#603DF5] shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-[#0B1B43] text-base">Recommended Next Learning Task</h3>
                <Badge variant="purple" size="xs">Prioritized by Skill Gap</Badge>
              </div>
              <p className="text-xs text-[#405B8B]">Direct curriculum step specifically chosen to increase your readiness score</p>
            </div>
          </div>
          <Badge variant="purple" size="sm">{recommendedNextAction.badge}</Badge>
        </div>

        <div className="pt-3 border-t border-slate-200/80 space-y-3">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <span className="font-extrabold text-sm sm:text-base text-[#0B1B43]">{recommendedNextAction.title}</span>
            {recommendedNextAction.duration && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-purple-100 text-[#603DF5] flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{recommendedNextAction.duration}</span>
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-[#405B8B] leading-relaxed">
            {recommendedNextAction.description}
          </p>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            {recommendedNextAction.resourceUrl ? (
              <a
                href={recommendedNextAction.resourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-[#087BFA] hover:underline flex items-center gap-1.5"
              >
                <span>{recommendedNextAction.resourceName || 'Open Curated Learning Resource'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <span className="text-xs text-[#405B8B]">Step to calibrate your verified career profile</span>
            )}

            <Button
              size="sm"
              variant="purple"
              onClick={recommendedNextAction.action}
              leftIcon={<Play className="w-3.5 h-3.5" />}
            >
              {recommendedNextAction.actionLabel}
            </Button>
          </div>
        </div>
      </Card>

      {/* SKILL PROFICIENCY CHART & VERIFIED EVIDENCE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Skill Chart & Projects (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Skill Proficiency Chart */}
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-[#0B1B43]">Benchmark Skill Proficiency</h3>
                <p className="text-xs text-[#405B8B]">
                  {hasCompletedAssessment
                    ? 'Evaluated proficiency level (1-5) vs Target requirement (Level 4 benchmark)'
                    : 'Take an assessment to display benchmarked skill proficiencies'}
                </p>
              </div>
              {hasCompletedAssessment && (
                <Button variant="ghost" size="sm" onClick={() => navigate('/student/skill-gap')}>
                  View Gap Analysis
                </Button>
              )}
            </div>

            {!hasCompletedAssessment ? (
              <div className="h-64 w-full flex flex-col items-center justify-center bg-[#F8FAFC] rounded-2xl border border-dashed border-[#E0E7F2] p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#087BFA] flex items-center justify-center">
                  <Brain className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-[#0B1B43]">No skills assessed yet</h4>
                  <p className="text-xs text-[#405B8B] max-w-sm">
                    Take a diagnostic skill assessment to benchmark your technical proficiency against {targetRole || 'industry standards'}.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => navigate('/student/assessment')}
                  leftIcon={<Brain className="w-3.5 h-3.5" />}
                >
                  Start Skill Assessment
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="h-68 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 15, right: 15, left: -15, bottom: 25 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#405B8B' }} angle={-15} textAnchor="end" />
                      <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11, fill: '#405B8B' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0B1B43',
                          borderRadius: '12px',
                          color: '#fff',
                          fontSize: '12px',
                          border: 'none',
                          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)'
                        }}
                        formatter={(val: any) => [`Level ${val}/5`, 'Current Level']}
                      />
                      <Bar dataKey="level" radius={[6, 6, 0, 0]} maxBarSize={45}>
                        {chartData.map((entry, index) => {
                          const fillColor =
                            entry.status === 'unassessed'
                              ? '#94A3B8'
                              : entry.status === 'self-reported'
                              ? '#D97706'
                              : entry.level >= 4
                              ? '#16A34A'
                              : '#087BFA';
                          return <Cell key={`cell-${index}`} fill={fillColor} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center justify-center gap-4 text-xs pt-3 border-t border-[#E0E7F2]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#16A34A]" />
                    <span className="text-[#405B8B] font-medium">Assessed (Level 4+)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#087BFA]" />
                    <span className="text-[#405B8B] font-medium">Developing (Level 1-3)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#D97706]" />
                    <span className="text-[#405B8B] font-medium">Self-Reported (Unverified)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#94A3B8]" />
                    <span className="text-[#405B8B] font-medium">Not Yet Assessed</span>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Projects and Portfolio */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-extrabold text-[#0B1B43] text-base">Projects & Portfolio Evidence</h3>
                <p className="text-xs text-[#405B8B]">Code repositories and peer-reviewed proof of work</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/student/projects')}>
                Manage Portfolio
              </Button>
            </div>

            {projects.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#F8FAFC] border border-dashed border-[#E0E7F2] text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#087BFA] flex items-center justify-center mx-auto">
                  <FolderGit2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-[#0B1B43]">No projects added yet</h4>
                  <p className="text-xs text-[#405B8B] max-w-sm mx-auto">
                    Add project evidence to build verified proof of competency on your Skill Passport.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => navigate('/student/projects')}
                  leftIcon={<FolderGit2 className="w-3.5 h-3.5" />}
                >
                  Add Project Evidence
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {projects.map((proj) => (
                  <div key={proj.id} className="p-4 rounded-xl border border-[#E0E7F2] hover:border-blue-200 bg-[#F8FAFC]/50 hover:bg-white transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-[#0B1B43] truncate">{proj.title}</h4>
                        <Badge
                          variant={proj.verificationStatus === 'verified' ? 'success' : 'purple'}
                          size="xs"
                        >
                          {proj.verificationStatus}
                        </Badge>
                      </div>
                      <p className="text-xs text-[#405B8B] line-clamp-1">{proj.description}</p>
                      <div className="flex gap-1.5 flex-wrap pt-1">
                        {proj.skillsDemonstrated.map(skill => (
                          <span key={skill} className="text-[10px] bg-slate-100 text-[#0B1B43] px-2 py-0.5 rounded-md font-medium">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <a
                      href={proj.repositoryUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 text-xs font-bold text-[#087BFA] hover:underline flex items-center gap-1.5 self-start sm:self-auto"
                    >
                      <FolderGit2 className="w-4 h-4" />
                      <span>View Repo</span>
                    </a>
                  </div>
                ))}

                {/* Portfolio Next Steps Recommendation */}
                <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-[#087BFA] font-medium">
                    <Code2 className="w-4 h-4 shrink-0" />
                    <span>Next step: Add a full-stack deployment with live demo to earn Verified Gold status</span>
                  </div>
                  <button
                    onClick={() => navigate('/student/projects')}
                    className="font-bold text-[#087BFA] hover:underline shrink-0 ml-2 cursor-pointer"
                  >
                    Add Evidence
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Matched Jobs & Skill Passport & Recent Activity */}
        <div className="space-y-6">
          {/* Matched Opportunities */}
          <Card borderAccent="blue">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-[#0B1B43] text-base">Recommended Opportunities</h3>
                {topMatchedOpportunities.length > 0 && (
                  <Badge variant="blue" size="xs">AI Matched</Badge>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/student/opportunities')}>
                View All
              </Button>
            </div>

            {topMatchedOpportunities.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-dashed border-[#E0E7F2] text-center space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#087BFA] flex items-center justify-center mx-auto">
                  <Briefcase className="w-5 h-5" />
                </div>
                <p className="text-xs text-[#405B8B] leading-relaxed">
                  Job & internship recommendations calibrated for {targetRole || 'your profile'} will appear here as you take assessments.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('/student/opportunities')}
                >
                  Explore Jobs Catalog
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {topMatchedOpportunities.map(({ opportunity, match }) => (
                  <div key={opportunity.id} className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E0E7F2] hover:border-blue-200 transition-all space-y-2.5">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-[#0B1B43] truncate">{opportunity.title}</h4>
                        <p className="text-xs text-[#405B8B] truncate">{opportunity.companyName}</p>
                      </div>
                      <Badge variant={match.overallMatchScore >= 80 ? 'success' : 'purple'} size="sm">
                        {match.overallMatchScore}% Match
                      </Badge>
                    </div>

                    <div className="text-[11px] text-[#405B8B] truncate">
                      <span className="font-semibold text-emerald-700">Matches: </span>
                      {match.matchingSkills.length > 0 ? match.matchingSkills.join(', ') : 'Pending evaluation'}
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs"
                      onClick={() => navigate('/student/opportunities')}
                    >
                      View Breakdown & Apply
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Skill Passport Callout */}
          <Card className="bg-gradient-to-br from-[#0B1B43] via-[#1E1B4B] to-[#603DF5] text-white p-6 space-y-4 border border-white/10 shadow-lg">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-white/10 text-yellow-300">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-base text-white tracking-tight">Your Skill Passport</h3>
                <span className="text-[10px] text-blue-200 font-semibold uppercase tracking-wider">Verifiable Credentials</span>
              </div>
            </div>
            
            <p className="text-xs text-blue-100 leading-relaxed">
              Your tamper-proof digital credential dossier. Backed by diagnostic test results, verified GitHub repositories, and institution degree verification.
            </p>

            <div className="p-3 rounded-xl bg-white/10 border border-white/15 space-y-1.5 text-xs text-blue-100">
              <div className="flex items-center justify-between">
                <span>Verified Skills:</span>
                <span className="font-bold text-white">{assessedSkillsCount} assessed</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Peer-Reviewed Repos:</span>
                <span className="font-bold text-white">{verifiedProjectsCount} verified</span>
              </div>
            </div>

            <Button
              variant="purple"
              className="w-full bg-white text-[#0B1B43] hover:bg-slate-100 font-bold shadow-md text-xs"
              onClick={() => navigate('/student/skill-passport')}
              leftIcon={<ShieldCheck className="w-4 h-4 text-[#087BFA]" />}
            >
              Open Skill Passport
            </Button>
          </Card>

          {/* Recent Activity & Pending Actions */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#087BFA]" />
                <h4 className="font-extrabold text-[#0B1B43] text-sm">Recent Activity</h4>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Live Log</span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50">
                <FileCheck2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-bold text-[#0B1B43] truncate">Career domain set to {roadmap?.domainTitle || roadmap?.targetRole || targetDomain}</p>
                  <span className="text-[10px] text-slate-400">Roadmap curriculum synchronized</span>
                </div>
              </div>

              {latestAssessment && (
                <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50">
                  <Brain className="w-4 h-4 text-[#603DF5] shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-bold text-[#0B1B43] truncate">Completed Diagnostic Evaluation</p>
                    <span className="text-[10px] text-slate-400">Scored {latestAssessment.overallScore}% in baseline test</span>
                  </div>
                </div>
              )}

              {projects.length > 0 && (
                <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50">
                  <FolderGit2 className="w-4 h-4 text-[#087BFA] shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-bold text-[#0B1B43] truncate">Project repository submitted</p>
                    <span className="text-[10px] text-slate-400">{projects[0].title}</span>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* HOW READINESS IS CALCULATED MODAL */}
      <Modal
        isOpen={readinessExplainerOpen}
        onClose={() => setReadinessExplainerOpen(false)}
        title="Understanding Your Career Readiness Score"
        subtitle="Transparent, explainable criteria calibrated for hiring managers and recruiters."
      >
        <div className="space-y-4 text-xs text-[#405B8B]">
          <p className="leading-relaxed">
            Unlike traditional platforms that rely on self-reported endorsements, your SARATHI Career Readiness Score is calculated from three verifiable pillars:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-purple-50 border border-purple-100 space-y-1">
              <span className="font-black text-[#603DF5] text-sm">45% Weight</span>
              <h5 className="font-bold text-[#0B1B43]">Diagnostic Depth</h5>
              <p className="text-[11px]">Evaluated technical scores in timed, objective assessments.</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 space-y-1">
              <span className="font-black text-[#087BFA] text-sm">30% Weight</span>
              <h5 className="font-bold text-[#0B1B43]">Benchmark Coverage</h5>
              <p className="text-[11px]">Ratio of target role required skills evaluated at Level 3+.</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 space-y-1">
              <span className="font-black text-[#16A34A] text-sm">25% Weight</span>
              <h5 className="font-bold text-[#0B1B43]">Project Proof</h5>
              <p className="text-[11px]">Peer-reviewed Git repository code artifacts and commit history.</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="font-bold text-[#0B1B43]">Current Candidate Profile:</span>
            <p className="text-[11px]">
              Target Role: <strong className="text-[#0B1B43]">{targetRole || 'Not selected'}</strong> •
              Assessed Skills: <strong className="text-[#0B1B43]">{assessedSkillsCount}</strong> •
              Verified Projects: <strong className="text-[#0B1B43]">{verifiedProjectsCount}</strong>
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="primary" size="sm" onClick={() => setReadinessExplainerOpen(false)}>
              Got It
            </Button>
          </div>
        </div>
      </Modal>

      {/* TARGET ROLE SELECTION MODAL */}
      <Modal
        isOpen={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        title="Choose Your Target Career Role"
        subtitle="Select a technology domain and career specialization to calibrate benchmark skills and roadmap."
        maxWidth="5xl"
      >
        <div className="space-y-5">
          <DomainRoleSelector
            selectedDomainId={targetDomain || 'web-dev'}
            selectedRoleTitle={selectedRoleOption}
            onSelectRole={(roleName, domainId) => {
              setSelectedRoleOption(roleName);
              setSelectedDomainOption(domainId);
            }}
            variant="modal"
            showOverview={true}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-[#E0E7F2]">
            <Button variant="secondary" onClick={() => setRoleModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveRole}>
              Confirm Target Role
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
