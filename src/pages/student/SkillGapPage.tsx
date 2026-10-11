import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Target,
  ArrowRight,
  Info,
  Brain,
  Sparkles,
  Award,
  Layers
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { ProgressBar } from '../../components/common/ProgressBar';
import { DomainRoleSelector } from '../../components/common/DomainRoleSelector';
import { useStudent } from '../../context/StudentContext';
import { getDomainByRoleTitle } from '../../data/domainsCatalog';
import { getProficiencyLabel } from '../../types/skill';

export const SkillGapPage: React.FC = () => {
  const {
    targetDomain,
    setTargetDomain,
    targetRole,
    setTargetRole,
    skillGaps,
    otherAssessedSkills,
    overallReadinessScore,
    assessedSkillsCount,
    markGapsReviewed
  } = useStudent();
  const navigate = useNavigate();

  const [filterPriority, setFilterPriority] = useState<string>('All');
  const [showRoleSelector, setShowRoleSelector] = useState(false);

  useEffect(() => {
    markGapsReviewed();
  }, [markGapsReviewed]);

  const activeDomain = useMemo(() => {
    return getDomainByRoleTitle(targetRole) || { id: targetDomain || 'web-dev', title: 'Technology' };
  }, [targetRole, targetDomain]);

  const highPriorityGaps = skillGaps.filter(g => g.priority === 'High');
  const mediumPriorityGaps = skillGaps.filter(g => g.priority === 'Medium');

  const filteredGaps = skillGaps.filter(g => {
    if (filterPriority === 'All') return true;
    return g.priority === filterPriority;
  });

  return (
    <div className="space-y-8 pb-12">
      {/* HEADER BAR */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E0E7F2] shadow-xs">
        <div>
          <Badge variant="purple" icon={<Target className="w-3.5 h-3.5" />}>
            SKILL INTELLIGENCE ENGINE
          </Badge>
          <h2 className="text-2xl font-black text-[#0B1B43] mt-1">
            Skill Gap Analysis & Benchmark Comparison
          </h2>
          <p className="text-xs text-[#405B8B] max-w-xl">
            Compares your demonstrated proficiency against verified industry benchmarks for <span className="font-bold text-[#0B1B43]">{targetRole || 'your chosen role'}</span>.
          </p>
        </div>

        {/* Action to switch/calibrate target role */}
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <Button
            variant={showRoleSelector ? 'secondary' : 'outline'}
            size="md"
            onClick={() => setShowRoleSelector(!showRoleSelector)}
            leftIcon={<Layers className="w-4 h-4 text-[#087BFA]" />}
          >
            {showRoleSelector ? 'Hide Role Calibration' : 'Change Target Role / Domain'}
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/student/assessment')}
            leftIcon={<Brain className="w-4 h-4" />}
          >
            Take Assessment
          </Button>
        </div>
      </div>

      {/* TWO-TIER DOMAIN & ROLE SELECTOR (Collapsible or toggleable) */}
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

      {/* VERIFICATION LEVEL LEGEND */}
      <div className="p-4 rounded-2xl bg-white border border-[#E0E7F2] flex flex-wrap items-center justify-between gap-4 text-xs">
        <span className="font-bold text-[#0B1B43] flex items-center gap-1.5">
          <Info className="w-4 h-4 text-[#087BFA]" /> Skill Verification Hierarchy:
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-medium border border-slate-200">
            1. Self-Reported (Unverified)
          </span>
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-blue-50 text-[#087BFA] font-medium border border-blue-200">
            2. Assessment Completed (Diagnostic Tested)
          </span>
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-purple-50 text-[#603DF5] font-medium border border-purple-200">
            3. Evidence Submitted (Project Code Proof)
          </span>
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
            4. Verified Credential (Proctored / Endorsed)
          </span>
        </div>
      </div>

      {/* SUMMARY METRIC CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card borderAccent="blue">
          <span className="text-xs font-bold text-[#405B8B] uppercase">Role Readiness Benchmark</span>
          <div className="text-2xl sm:text-3xl font-black text-[#0B1B43] my-2">
            {overallReadinessScore !== null ? `${overallReadinessScore}%` : 'Not assessed'}
          </div>
          <ProgressBar progress={overallReadinessScore || 0} color="gradient" size="sm" />
          <span className="text-[11px] text-[#405B8B] mt-2 block">
            {overallReadinessScore !== null
              ? `Calibrated for ${targetRole}`
              : 'Requires completing diagnostic assessment'}
          </span>
        </Card>

        <Card borderAccent="amber">
          <span className="text-xs font-bold text-[#405B8B] uppercase">High Priority Gaps</span>
          <div className="text-2xl sm:text-3xl font-black text-[#D97706] my-2">
            {assessedSkillsCount === 0 ? 'Not analyzed' : highPriorityGaps.length}
          </div>
          <span className="text-xs text-[#405B8B]">
            {assessedSkillsCount === 0
              ? 'Take assessment to calculate gap urgency'
              : `${highPriorityGaps.length} competencies need immediate focus`}
          </span>
        </Card>

        <Card borderAccent="purple">
          <span className="text-xs font-bold text-[#405B8B] uppercase">Medium Priority Gaps</span>
          <div className="text-2xl sm:text-3xl font-black text-[#603DF5] my-2">
            {assessedSkillsCount === 0 ? 'Not analyzed' : mediumPriorityGaps.length}
          </div>
          <span className="text-xs text-[#405B8B]">
            {assessedSkillsCount === 0
              ? 'Requires diagnostic baseline'
              : `${mediumPriorityGaps.length} competencies within 1-2 levels`}
          </span>
        </Card>
      </div>

      {/* ZERO STATE: NO ASSESSMENT TAKEN */}
      {assessedSkillsCount === 0 ? (
        <Card className="text-center p-12 max-w-2xl mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#087BFA] flex items-center justify-center mx-auto shadow-inner">
            <Brain className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-extrabold text-[#0B1B43]">
              No Skill Assessment Completed for {targetRole || 'Your Target Role'}
            </h3>
            <p className="text-xs text-[#405B8B] max-w-md mx-auto leading-relaxed">
              Complete your diagnostic skill assessment to measure your current demonstrated proficiency against {targetRole} benchmark requirements and uncover high-priority learning gaps.
            </p>
          </div>
          <div className="pt-2">
            <Button
              size="lg"
              variant="primary"
              onClick={() => navigate('/student/assessment')}
              rightIcon={<ArrowRight className="w-5 h-5" />}
            >
              Start Skill Assessment
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* FILTER PILLS */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E0E7F2] pb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-[#0B1B43]">
                Required Competencies vs Demonstrated Proficiency
              </h3>
              <Badge variant="blue">{skillGaps.length} Required Skills</Badge>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {['All', 'High', 'Medium', 'Low'].map(p => (
                <button
                  key={p}
                  onClick={() => setFilterPriority(p)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    filterPriority === p
                      ? 'bg-[#087BFA] text-white shadow-xs'
                      : 'bg-white border border-[#E0E7F2] text-[#405B8B] hover:bg-slate-50'
                  }`}
                >
                  {p === 'All' ? 'All Gaps' : `${p} Priority`}
                </button>
              ))}
            </div>
          </div>

          {/* GAP ITEMS LIST */}
          <div className="space-y-4">
            {filteredGaps.map((gap) => {
              const statusBadgeVariant =
                gap.verificationStatus === 'verified' ? 'success' :
                gap.verificationStatus === 'evidence-submitted' ? 'purple' :
                gap.verificationStatus === 'assessment-completed' ? 'blue' : 'gray';

              const priorityBadge =
                gap.priority === 'High' ? 'danger' :
                gap.priority === 'Medium' ? 'warning' : 'success';

              const reqLabel = getProficiencyLabel(gap.requiredProficiency);
              const currLabel = getProficiencyLabel(gap.currentProficiency);

              return (
                <Card key={gap.skillName} className="p-6 transition-all hover:border-[#087BFA]/40">
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    {/* Left: Skill Info & Why It Matters */}
                    <div className="space-y-2 max-w-xl min-w-0 w-full">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h4 className="font-extrabold text-base text-[#0B1B43] break-words">{gap.skillName}</h4>
                        <Badge variant={priorityBadge}>
                          {gap.gapLevel > 0 ? `${gap.priority} Priority Gap` : 'Proficiency Goal Met'}
                        </Badge>
                        <Badge variant="gray">{gap.category}</Badge>
                      </div>

                      <p className="text-xs text-[#405B8B] leading-relaxed">
                        <span className="font-bold text-[#0B1B43]">Why it matters: </span>
                        {gap.whyItMatters}
                      </p>

                      <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100/80 text-xs text-[#087BFA] font-medium flex items-center gap-2">
                        <Sparkles className="w-4 h-4 shrink-0 text-[#087BFA]" />
                        <span>Recommended action: {gap.recommendedAction}</span>
                      </div>
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
                        <span className="font-extrabold text-[#087BFA]">
                          Level {gap.currentProficiency} ({currLabel})
                        </span>
                      </div>

                      {/* Visual gap indicator */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase">
                          <span>Progress to Goal</span>
                          <span>{Math.min(100, Math.round((gap.currentProficiency / gap.requiredProficiency) * 100))}%</span>
                        </div>
                        <ProgressBar
                          progress={Math.min(100, Math.round((gap.currentProficiency / gap.requiredProficiency) * 100))}
                          color={gap.gapLevel === 0 ? 'green' : gap.priority === 'High' ? 'amber' : 'blue'}
                          size="sm"
                        />
                      </div>

                      <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Status:</span>
                        <Badge variant={statusBadgeVariant}>
                          {gap.verificationStatus}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* TRANSFERABLE / OTHER DEMONSTRATED SKILLS SECTION */}
          {otherAssessedSkills.length > 0 && (
            <div className="pt-6 border-t border-[#E0E7F2] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-[#0B1B43] flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#603DF5]" />
                    Transferable Demonstrated Skills (From Other Roles & Assessments)
                  </h3>
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

          {/* NEXT STEPS CARD */}
          <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="font-extrabold text-base text-[#0B1B43]">
                Close Your High-Priority Gaps with Guided Roadmaps
              </h4>
              <p className="text-xs text-[#405B8B] max-w-xl">
                SARATHI has identified your priority gaps. Open your personalized roadmap to complete free curated learning modules and add hands-on projects for evidence.
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
      )}
    </div>
  );
};
