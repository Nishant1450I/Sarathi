import React from 'react';
import { Target, BookOpen, Calendar, ArrowRight, Sparkles } from 'lucide-react';
import type { SkillScoreV2 } from '../../types/assessmentV2';

interface SkillGapPlanProps {
  weakestSkills: SkillScoreV2[];
  onStartPracticeTask?: (skillName: string) => void;
  onExploreResource?: (skillName: string) => void;
}

export const SkillGapPlan: React.FC<SkillGapPlanProps> = ({
  weakestSkills,
  onStartPracticeTask,
  onExploreResource,
}) => {
  if (!weakestSkills || weakestSkills.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-500" /> Targeted Skill Diagnostic Action Plan
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Prioritized practice tasks & curated catalog roadmaps to close your highest competency gaps.
          </p>
        </div>

        <div className="px-3 py-1 bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 rounded-full text-xs font-semibold flex items-center gap-1.5 border border-amber-200 dark:border-amber-900/60">
          <Calendar className="w-3.5 h-3.5" /> Retest recommended in 7 days
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {weakestSkills.slice(0, 3).map((skill) => (
          <div
            key={skill.skillName}
            className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                  Current: Level {skill.level} ({skill.score}%)
                </span>
                <span className="text-[11px] text-slate-400 font-mono">{skill.category}</span>
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2">{skill.skillName}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 leading-normal">
                Focus on fundamental assertions, hands-on tasks, and system design patterns in {skill.skillName}.
              </p>
            </div>

            <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-800/80">
              <button
                type="button"
                onClick={() => onStartPracticeTask?.(skill.skillName)}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" /> Practice Challenge
              </button>
              <button
                type="button"
                onClick={() => onExploreResource?.(skill.skillName)}
                className="w-full py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5 text-slate-400" /> Free Curated Resources <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
