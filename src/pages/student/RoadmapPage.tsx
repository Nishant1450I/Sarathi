import React, { useState } from 'react';
import {
  Map,
  CheckCircle2,
  Circle,
  ExternalLink,
  Clock,
  BookOpen,
  Sparkles,
  Layers,
  AlertTriangle
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { ProgressBar } from '../../components/common/ProgressBar';
import { DomainRoleSelector } from '../../components/common/DomainRoleSelector';
import { useStudent } from '../../context/StudentContext';

export const RoadmapPage: React.FC = () => {
  const {
    roadmap,
    toggleTaskCompletion,
    targetRole,
    targetDomain,
    setTargetRole,
    setTargetDomain,
    generateRoadmap
  } = useStudent();
  const [showRoleSelector, setShowRoleSelector] = useState(false);

  if (!roadmap || !roadmap.stages || roadmap.stages.length === 0) {
    return (
      <div className="space-y-8 pb-12">
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E0E7F2] shadow-sm space-y-4">
          <Badge variant="purple" icon={<Map className="w-3.5 h-3.5" />}>PERSONALIZED LEARNING ROADMAP</Badge>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold text-[#0B1B43]">
                Learning Path for {targetRole || 'Your Target Role'}
              </h2>
              <p className="text-xs text-[#405B8B]">Structured learning path with verified free curated resources.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRoleSelector(!showRoleSelector)}
              leftIcon={<Layers className="w-4 h-4 text-[#087BFA]" />}
            >
              {showRoleSelector ? 'Hide Career Tracks' : 'Select Career Track'}
            </Button>
          </div>
        </div>

        {showRoleSelector && (
          <DomainRoleSelector
            selectedDomainId={targetDomain || 'web-dev'}
            selectedRoleTitle={targetRole || ''}
            onSelectRole={(newRole, domainId) => {
              setTargetRole(newRole, domainId);
              setTargetDomain(domainId);
              setShowRoleSelector(false);
            }}
            showOverview={false}
          />
        )}

        <Card className="text-center p-12 max-w-2xl mx-auto space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 text-[#087BFA] flex items-center justify-center mx-auto shadow-inner">
            <Map className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-extrabold text-[#0B1B43]">Roadmap Ready for Generation</h3>
            <p className="text-xs text-[#405B8B] max-w-md mx-auto leading-relaxed">
              Your personalized curriculum will be constructed for <strong className="text-[#0B1B43]">{targetRole || 'your chosen role'}</strong> and tailored with diagnostic skill gap priorities.
            </p>
          </div>
          <div className="pt-2">
            <Button
              size="lg"
              variant="primary"
              onClick={() => generateRoadmap()}
              leftIcon={<Sparkles className="w-5 h-5 text-yellow-300" />}
            >
              Generate Personalized Roadmap
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* HEADER HERO */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E0E7F2] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="purple" icon={<Map className="w-3.5 h-3.5" />}>PERSONALIZED LEARNING ROADMAP</Badge>
              {roadmap.targetRole && (
                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                  Track: {roadmap.targetRole}
                </span>
              )}
            </div>
            <h2 className="text-2xl font-extrabold text-[#0B1B43] mt-1">
              Learning Path for {targetRole || roadmap.targetRole}
            </h2>
            <p className="text-xs text-[#405B8B]">
              Structured into {roadmap.stages.length} progressive stages with verified free resources.
            </p>
          </div>

          <div className="flex items-center gap-4 sm:shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRoleSelector(!showRoleSelector)}
              leftIcon={<Layers className="w-4 h-4 text-[#087BFA]" />}
            >
              {showRoleSelector ? 'Hide Career Tracks' : 'Change Career Domain'}
            </Button>

            <div className="text-right space-y-1">
              <span className="text-xs font-bold text-[#405B8B]">Roadmap Completion</span>
              <div className="text-3xl font-black text-[#087BFA]">{roadmap.overallProgress}%</div>
            </div>
          </div>
        </div>

        <ProgressBar progress={roadmap.overallProgress} color="gradient" size="md" />
      </div>

      {/* TWO-TIER DOMAIN & ROLE SELECTOR (Collapsible) */}
      {showRoleSelector && (
        <DomainRoleSelector
          selectedDomainId={targetDomain || 'web-dev'}
          selectedRoleTitle={targetRole || ''}
          onSelectRole={(newRole, domainId) => {
            setTargetRole(newRole, domainId);
            setTargetDomain(domainId);
            setShowRoleSelector(false);
          }}
          showOverview={false}
        />
      )}

      {/* STAGES LIST */}
      <div className="space-y-8">
        {roadmap.stages.map((stage) => {
          const completedCount = stage.tasks.filter(t => t.isCompleted).length;
          const isStageFinished = completedCount === stage.tasks.length && stage.tasks.length > 0;

          return (
            <div key={stage.id} className="space-y-4">
              {/* Stage Header */}
              <div className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl border border-[#E0E7F2]">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl font-black text-sm flex items-center justify-center ${
                      isStageFinished
                        ? 'bg-emerald-500 text-white'
                        : 'bg-[#087BFA]/10 text-[#087BFA]'
                    }`}
                  >
                    {isStageFinished ? <CheckCircle2 className="w-5 h-5" /> : stage.stageNumber}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-[#0B1B43]">{stage.title}</h3>
                    <p className="text-xs text-[#405B8B]">{stage.description}</p>
                  </div>
                </div>

                <Badge variant={isStageFinished ? 'success' : 'blue'}>
                  {completedCount} / {stage.tasks.length} Tasks Done
                </Badge>
              </div>

              {/* Tasks List */}
              <div className="grid grid-cols-1 gap-4 pl-4 sm:pl-8 border-l-2 border-slate-200">
                {stage.tasks.map((task) => (
                  <Card
                    key={task.id}
                    className={`transition-all ${
                      task.isCompleted ? 'bg-slate-50/70 border-emerald-200 opacity-90' : 'bg-white'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Checkbox & Details */}
                      <div className="flex items-start gap-4">
                        <button
                          onClick={() => toggleTaskCompletion(task.id)}
                          className="mt-1 shrink-0 p-1 text-slate-400 hover:text-[#087BFA] transition-colors cursor-pointer"
                        >
                          {task.isCompleted ? (
                            <CheckCircle2 className="w-6 h-6 text-[#16A34A]" />
                          ) : (
                            <Circle className="w-6 h-6 text-slate-300" />
                          )}
                        </button>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4
                              className={`font-bold text-sm ${
                                task.isCompleted ? 'line-through text-[#405B8B]' : 'text-[#0B1B43]'
                              }`}
                            >
                              {task.topic}
                            </h4>
                            <Badge variant={task.difficulty === 'Beginner' ? 'blue' : task.difficulty === 'Intermediate' ? 'purple' : 'warning'} size="sm">
                              {task.difficulty}
                            </Badge>
                            {task.isFreeResource && (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                                Free Resource
                              </span>
                            )}
                            {task.prioritySkillGap && (
                              <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-rose-500" />
                                Priority Skill Gap
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-[#405B8B]">{task.description}</p>

                          <div className="text-[11px] text-[#405B8B] pt-1">
                            <span className="font-semibold text-[#0B1B43]">Relevance: </span>
                            {task.relevanceToRole}
                          </div>
                        </div>
                      </div>

                      {/* Resource Link & Action */}
                      <div className="flex flex-col sm:items-end gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                        <div className="flex items-center gap-1.5 text-xs text-[#405B8B]">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{task.estimatedDuration}</span>
                        </div>

                        <a
                          href={task.resourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold text-[#087BFA] hover:underline"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>{task.resourceName}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>

                        <Button
                          size="sm"
                          variant={task.isCompleted ? 'secondary' : 'primary'}
                          onClick={() => toggleTaskCompletion(task.id)}
                        >
                          {task.isCompleted ? 'Mark Incomplete' : 'Mark Completed'}
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
