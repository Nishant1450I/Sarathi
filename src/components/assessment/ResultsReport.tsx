import React, { useState } from 'react';
import { CheckCircle2, XCircle, Award, Shield, ChevronDown, ChevronUp, RotateCcw, ArrowRight } from 'lucide-react';
import type { V2SessionResult } from '../../types/assessmentV2';

interface ResultsReportProps {
  result: V2SessionResult;
  onRetake: () => void;
  onNavigateRoadmap: () => void;
  onNavigateSkillGap: () => void;
}

export const ResultsReport: React.FC<ResultsReportProps> = ({
  result,
  onRetake,
  onNavigateRoadmap,
  onNavigateSkillGap,
}) => {
  const [openQuestionIdx, setOpenQuestionIdx] = useState<number | null>(null);

  const getTier = (score: number) => {
    if (score >= 85) return { label: 'Interview Ready (Tier 1)', color: 'bg-emerald-50 text-emerald-700 border-emerald-300' };
    if (score >= 70) return { label: 'Benchmark Competent (Tier 2)', color: 'bg-blue-50 text-blue-700 border-blue-300' };
    return { label: 'Developing Competency (Tier 3)', color: 'bg-amber-50 text-amber-700 border-amber-300' };
  };

  const tier = getTier(result.technicalScore);

  return (
    <div className="space-y-6">
      {/* Hero Summary Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${tier.color}`}>
                {tier.label}
              </span>
              <span className="text-xs text-slate-400 capitalize">{result.mode} Mode Assessment</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Demonstrated Competency Report</h1>
          </div>

          <div className="text-right flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-indigo-600 dark:text-indigo-400">{result.technicalScore}%</span>
            <span className="text-xs text-slate-500 font-semibold uppercase">Overall</span>
          </div>
        </div>

        {/* Score split bars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 py-6">
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              <span>Knowledge Quiz Score</span>
              <span>{result.knowledgeScore}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full" style={{ width: `${result.knowledgeScore}%` }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              <span>Practical Workbench Score</span>
              <span>{result.practicalScore}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${result.practicalScore}%` }} />
            </div>
          </div>
        </div>

        {/* Verification Status Banner */}
        {result.mode === 'secure' && (
          <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Shield className="w-4 h-4 text-sky-500 shrink-0" />
              <span>
                {result.integritySummary?.level === 'notable'
                  ? 'Verification Status: Under reviewer check. Verified credentials will update on your Skill Passport.'
                  : 'Verification Status: Diagnostic testing completed and recorded to your verified profile.'}
              </span>
            </div>
            {result.integritySummary && (
              <span className="text-slate-400 font-mono text-[11px]">{result.integritySummary.eventCount} integrity signals</span>
            )}
          </div>
        )}
      </div>

      {/* Per-Skill Demonstrated Evidence Levels */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-indigo-500" /> Evaluated Skill Competency Levels
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {Object.values(result.skillScores || {}).map((s) => (
            <div key={s.skillName} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">{s.skillName}</span>
                <span className="text-xs px-2 py-0.5 rounded font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200">
                  Level {s.level} • {s.levelLabel}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-2">
                <span>Score: {s.score}%</span>
                <span>Evidence: {s.evidenceCount} items ({s.confidence} confidence)</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Question-by-Question Review Accordion */}
      {result.answersSummary && result.answersSummary.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
            Question Explanations & Review ({result.answersSummary.length})
          </h2>
          <div className="space-y-3">
            {result.answersSummary.map((q, idx) => {
              const isOpen = openQuestionIdx === idx;
              return (
                <div key={q.questionId || idx} className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenQuestionIdx(isOpen ? null : idx)}
                    className="w-full text-left p-4 bg-slate-50 dark:bg-slate-950 flex items-center justify-between text-xs font-medium"
                  >
                    <span className="flex items-center gap-2.5 truncate pr-2">
                      {q.isCorrect ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                      )}
                      <span className="text-slate-800 dark:text-slate-200 font-semibold truncate">Q{idx + 1}: {q.question}</span>
                    </span>
                    {isOpen ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
                  </button>
                  {isOpen && (
                    <div className="p-4 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <div><strong className="text-slate-900 dark:text-white">Explanation:</strong> {q.explanation}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action CTAs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onRetake}
          className="px-4 py-2.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl flex items-center gap-2 transition-colors"
        >
          <RotateCcw className="w-4 h-4" /> Retake Assessment
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onNavigateSkillGap}
            className="px-4 py-2.5 border border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 font-semibold text-xs rounded-xl transition-colors"
          >
            Skill Gap Analysis
          </button>
          <button
            type="button"
            onClick={onNavigateRoadmap}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl flex items-center gap-2 transition-colors shadow-sm"
          >
            View Career Roadmap <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
