import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Target,
  ArrowRight,
  Brain,
  Sparkles,
  Award,
  Layers,
  BookOpen,
  ExternalLink,
  RotateCcw
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { ProgressBar } from '../../components/common/ProgressBar';
import { DomainRoleSelector } from '../../components/common/DomainRoleSelector';
import { useStudent } from '../../context/StudentContext';
import { apiClient } from '../../services/apiClient';
import { getDomainByRoleTitle } from '../../data/domainsCatalog';
import { getProficiencyLabel } from '../../types/skill';

export const SkillGapPage: React.FC = () => {
  const {
    targetDomain,
    setTargetDomain,
    targetRole,
    setTargetRole,
    skillGaps,
    skills,
    assessmentHistory,
    otherAssessedSkills,
    overallReadinessScore,
    assessedSkillsCount,
    markGapsReviewed
  } = useStudent();
  const navigate = useNavigate();

  const [filterPriority, setFilterPriority] = useState<string>('All');
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [resources, setResources] = useState<any[]>([]);

  useEffect(() => {
    markGapsReviewed();
  }, [markGapsReviewed]);

  useEffect(() => {
    let isMounted = true;
    apiClient.get<{ success: boolean; data: any[] }>('/api/resources')
      .then((res) => {
        if (isMounted && res?.data) {
          setResources(res.data);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const activeDomain = useMemo(() => {
    return getDomainByRoleTitle(targetRole) || { id: targetDomain || 'web-dev', title: 'Technology' };
  }, [targetRole, targetDomain]);

  // Determine whether any assessment data or verified skill data exists
  const hasAssessmentData = useMemo(() => {
    return Boolean(
      assessedSkillsCount > 0 ||
      (assessmentHistory && assessmentHistory.length > 0) ||
      skills.some(s => s.status === 'assessment-completed' || s.status === 'verified')
    );
  }, [assessedSkillsCount, assessmentHistory, skills]);

  const highPriorityGaps = useMemo(() => skillGaps.filter(g => g.priority === 'High'), [skillGaps]);
  const mediumPriorityGaps = useMemo(() => skillGaps.filter(g => g.priority === 'Medium'), [skillGaps]);
  const missingSkills = useMemo(() => skillGaps.filter(g => g.currentProficiency === 0), [skillGaps]);
  const goalsMet = useMemo(() => skillGaps.filter(g => g.gapLevel === 0), [skillGaps]);

  const filteredGaps = useMemo(() => {
    if (filterPriority === 'All') return skillGaps;
    if (filterPriority === 'High') return highPriorityGaps;
    if (filterPriority === 'Medium') return mediumPriorityGaps;
    if (filterPriority === 'Missing') return missingSkills;
    if (filterPriority === 'Met') return goalsMet;
    return skillGaps;
  }, [filterPriority, skillGaps, highPriorityGaps, mediumPriorityGaps, missingSkills, goalsMet]);

  // If the user has not completed an assessment, display ONE clear message and ONE button to start it
  if (!hasAssessmentData) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-12">
        {/* Simple Page Header */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E0E7F2] shadow-xs">
          <Badge variant="purple" icon={<Target className="w-3.5 h-3.5" />}>
            SKILL INTELLIGENCE ENGINE
          </Badge>
          <h1 className="text-2xl font-black text-[#0B1B43] mt-2">
            Skill Gap Analysis
          </h1>
          <p className="text-xs text-[#405B8B] mt-1 max-w-xl">
            Compares your demonstrated proficiency against verified industry benchmarks for <strong className="text-[#0B1B43]">{targetRole || 'your target career'}</strong>.
          </p>
        </div>

        {/* Single Clear Zero State Card */}
        <Card className="text-center p-10 sm:p-14 max-w-2xl mx-auto space-y-5 border-[#E0E7F2]">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 text-[#087BFA] flex items-center justify-center mx-auto shadow-inner">
            <Brain className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-[#0B1B43]">
              No Diagnostic Skill Assessment Completed
            </h2>
            <p className="text-xs sm:text-sm text-[#405B8B] max-w-md mx-auto leading-relaxed">
              To calculate your benchmark competency gaps for <strong className="text-[#0B1B43]">{targetRole || 'your chosen role'}</strong>, please take a diagnostic skill assessment. Your results will automatically populate your skill radar, benchmark gaps, and recommended learning path.
            </p>
          </div>

          <div className="pt-3">
            <Button
              size="lg"
              variant="primary"
              onClick={() => navigate('/student/assessment')}
              rightIcon={<ArrowRight className="w-5 h-5" />}
              className="px-8 py-3 text-sm font-bold shadow-md shadow-blue-500/20"
            >
              Start Diagnostic Skill Assessment
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Active Assessment Gap Breakdown View
  return (
    <div className="space-y-8 pb-12">
      {/* HEADER BAR */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E0E7F2] shadow-xs">
        <div>
          <Badge variant="purple" icon={<Target className="w-3.5 h-3.5" />}>
            SKILL INTELLIGENCE ENGINE
          </Badge>
          <h1 className="text-2xl font-black text-[#0B1B43] mt-1">
            Skill Gap Analysis & Benchmark Comparison
          </h1>
          <p className="text-xs text-[#405B8B] max-w-xl">
            Demonstrated competencies compared against industry standards for <strong className="text-[#0B1B43]">{targetRole || 'your target role'}</strong>.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <Button
            variant={showRoleSelector ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowRoleSelector(!showRoleSelector)}
            leftIcon={<Layers className="w-4 h-4 text-[#087BFA]" />}
          >
            {showRoleSelector ? 'Hide Calibration' : 'Change Target Role'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/student/assessment')}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Retake Assessment
          </Button>
        </div>
      </div>

      {/* COLLAPSIBLE ROLE SELECTOR */}
      {showRoleSelector && (
        <DomainRoleSelector
          selectedDomainId={activeDomain.id}
          selectedRoleTitle={targetRole}
          onSelectRole={(newRole, domainId) => {
            setTargetRole(newRole, domainId);
            setTargetDomain(domainId);
          }}
          onDomainChange={(domainId) => {
            setTargetDomain(domainId);
          }}
        />
      )}

      {/* SUMMARY METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card borderAccent="blue" className="p-5">
          <span className="text-[11px] font-bold text-[#405B8B] uppercase tracking-wider">Role Benchmark Readiness</span>
          <div className="text-2xl font-black text-[#0B1B43] my-1.5">
            {overallReadinessScore !== null ? `${overallReadinessScore}%` : '70%'}
          </div>
          <ProgressBar progress={overallReadinessScore || 70} color="gradient" size="sm" />
          <span className="text-[11px] text-[#405B8B] mt-2 block truncate">Calibrated for {targetRole}</span>
        </Card>

        <Card borderAccent="amber" className="p-5">
          <span className="text-[11px] font-bold text-[#405B8B] uppercase tracking-wider">High-Priority Gaps</span>
          <div className="text-2xl font-black text-rose-600 my-1.5">
            {highPriorityGaps.length}
          </div>
          <span className="text-xs text-[#405B8B] block">
            {highPriorityGaps.length > 0 ? 'Need immediate focus' : 'No critical gaps'}
          </span>
        </Card>

        <Card borderAccent="purple" className="p-5">
          <span className="text-[11px] font-bold text-[#405B8B] uppercase tracking-wider">Missing Competencies</span>
          <div className="text-2xl font-black text-amber-600 my-1.5">
            {missingSkills.length}
          </div>
          <span className="text-xs text-[#405B8B] block">
            {missingSkills.length > 0 ? 'No evidence submitted yet' : 'All required skills started'}
          </span>
        </Card>

        <Card className="p-5 border-emerald-200 bg-emerald-50/20">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Benchmark Goals Met</span>
          <div className="text-2xl font-black text-emerald-600 my-1.5">
            {goalsMet.length}
          </div>
          <span className="text-xs text-emerald-700 block">
            {goalsMet.length} of {skillGaps.length} competencies ready
          </span>
        </Card>
      </div>

      {/* FILTER PILLS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E0E7F2] pb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-extrabold text-[#0B1B43]">
            Required Competencies vs Demonstrated Proficiency
          </h2>
          <Badge variant="blue">{filteredGaps.length} Skills Listed</Badge>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: 'All', label: `All (${skillGaps.length})` },
            { id: 'High', label: `High Priority (${highPriorityGaps.length})` },
            { id: 'Medium', label: `Medium (${mediumPriorityGaps.length})` },
            { id: 'Missing', label: `Missing (${missingSkills.length})` },
            { id: 'Met', label: `Goals Met (${goalsMet.length})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterPriority(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterPriority === tab.id
                  ? 'bg-[#087BFA] text-white shadow-xs'
                  : 'bg-white border border-[#E0E7F2] text-[#405B8B] hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* GAP ITEMS LIST */}
      <div className="space-y-4">
        {filteredGaps.map((gap) => {
          const isMet = gap.gapLevel === 0;
          const isMissing = gap.currentProficiency === 0;

          const reqLabel = getProficiencyLabel(gap.requiredProficiency);
          const currLabel = isMissing ? 'Not Evaluated' : getProficiencyLabel(gap.currentProficiency);

          const statusBadge = isMet
            ? { variant: 'success' as const, label: 'Goal Met' }
            : isMissing
            ? { variant: 'danger' as const, label: 'Missing Competency' }
            : gap.priority === 'High'
            ? { variant: 'danger' as const, label: 'High Priority Gap' }
            : { variant: 'warning' as const, label: 'Medium Priority Gap' };

          return (
            <Card key={gap.skillName} className="p-6 transition-all hover:border-[#087BFA]/40">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                {/* Left: Skill Details */}
                <div className="space-y-2.5 max-w-xl min-w-0 w-full">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-extrabold text-base text-[#0B1B43]">{gap.skillName}</h3>
                    <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                    <Badge variant="gray">{gap.category}</Badge>
                  </div>

                  <p className="text-xs text-[#405B8B] leading-relaxed">
                    <strong className="text-[#0B1B43]">Why it matters: </strong>
                    {gap.whyItMatters}
                  </p>

                  <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-xs text-[#087BFA] font-medium flex items-center gap-2">
                    <Sparkles className="w-4 h-4 shrink-0 text-[#087BFA]" />
                    <span><strong>Action:</strong> {gap.recommendedAction}</span>
                  </div>

                  {/* Curated Resources Matching This Gap */}
                  {gap.gapLevel > 0 && (() => {
                    const normalized = gap.skillName.toLowerCase();
                    const recs = resources
                      .filter((r) =>
                        (r.skillTags || []).some(
                          (tag: string) =>
                            tag.toLowerCase().includes(normalized) ||
                            normalized.includes(tag.toLowerCase())
                        )
                      )
                      .slice(0, 2);

                    if (recs.length === 0) return null;

                    return (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-bold text-[#0B1B43] flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-[#087BFA]" />
                          Recommended Free Learning Modules:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {recs.map((rec) => (
                            <a
                              key={rec.id}
                              href={rec.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-[#087BFA] hover:bg-blue-50/30 transition-all flex items-start justify-between gap-2 group text-left"
                            >
                              <div className="space-y-0.5 min-w-0">
                                <span className="text-xs font-bold text-[#0B1B43] group-hover:text-[#087BFA] truncate block">
                                  {rec.title}
                                </span>
                                <div className="flex items-center gap-1.5 text-[10px] text-[#405B8B]">
                                  <span className="font-semibold">{rec.provider}</span>
                                  <span>•</span>
                                  <span className="text-emerald-600 font-bold">{rec.isFree ? 'Free' : 'Paid'}</span>
                                  <span>•</span>
                                  <span className="capitalize">{rec.level}</span>
                                </div>
                              </div>
                              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#087BFA] shrink-0 mt-0.5" />
                            </a>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Right: Proficiency Comparison */}
                <div className="w-full lg:w-72 bg-[#F8FAFC] p-4 rounded-2xl border border-[#E0E7F2] space-y-3 shrink-0">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#405B8B] font-semibold">Benchmark Required:</span>
                    <span className="font-extrabold text-[#0B1B43]">
                      Level {gap.requiredProficiency} ({reqLabel})
                    </span>
                  </div>

                  <div className="flex justify-between text-xs">
                    <span className="text-[#405B8B] font-semibold">Your Demonstrated:</span>
                    <span className={`font-extrabold ${isMissing ? 'text-slate-400' : 'text-[#087BFA]'}`}>
                      {isMissing ? 'Level 0 (Missing)' : `Level ${gap.currentProficiency} (${currLabel})`}
                    </span>
                  </div>

                  {/* Visual Progress */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase">
                      <span>Benchmark Progress</span>
                      <span>{Math.min(100, Math.round((gap.currentProficiency / gap.requiredProficiency) * 100))}%</span>
                    </div>
                    <ProgressBar
                      progress={Math.min(100, Math.round((gap.currentProficiency / gap.requiredProficiency) * 100))}
                      color={isMet ? 'green' : gap.priority === 'High' ? 'amber' : 'blue'}
                      size="sm"
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Evidence Status:</span>
                    <span className="font-bold text-[#0B1B43] capitalize">
                      {isMissing ? 'Unassessed' : gap.verificationStatus}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* TRANSFERABLE DEMONSTRATED SKILLS (Preserved from other tests) */}
      {otherAssessedSkills.length > 0 && (
        <div className="pt-6 border-t border-[#E0E7F2] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-[#0B1B43] flex items-center gap-2">
                <Award className="w-4 h-4 text-[#603DF5]" />
                Transferable Demonstrated Skills (From Other Roles & Assessments)
              </h2>
              <p className="text-xs text-[#405B8B]">
                These verified skills are preserved in your Skill Passport even if they are not explicitly required for {targetRole}.
              </p>
            </div>
            <Badge variant="purple">{otherAssessedSkills.length} Preserved Skills</Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {otherAssessedSkills.map(skill => (
              <div key={skill.id} className="p-4 rounded-2xl bg-white border border-[#E0E7F2] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-[#0B1B43]">{skill.name}</span>
                  <Badge variant="blue">Level {skill.proficiencyLevel}</Badge>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>{skill.category}</span>
                  <span className="text-emerald-600 font-semibold">{skill.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ROADMAP ACTION FOOTER */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="font-extrabold text-base text-[#0B1B43]">
            Close Your High-Priority Gaps with Guided Roadmaps
          </h3>
          <p className="text-xs text-[#405B8B] max-w-xl">
            SARATHI has mapped your priority gaps. Open your personalized roadmap to complete free curated learning modules and add hands-on projects for evidence.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => navigate('/student/roadmap')}
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          Open My Roadmap
        </Button>
      </Card>
    </div>
  );
};
