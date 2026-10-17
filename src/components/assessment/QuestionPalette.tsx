import React from 'react';
import type { V2QuestionClient } from '../../types/assessmentV2';

interface QuestionPaletteProps {
  questions: V2QuestionClient[];
  currentIndex: number;
  onSelect: (index: number) => void;
  answeredMap: Record<string, boolean>;
}

export const QuestionPalette: React.FC<QuestionPaletteProps> = ({
  questions,
  currentIndex,
  onSelect,
  answeredMap,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3 text-xs">
        <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">
          Question Palette
        </span>
        <span className="text-slate-500">
          {Object.values(answeredMap).filter(Boolean).length}/{questions.length} Completed
        </span>
      </div>

      <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-8 gap-2">
        {questions.map((q, idx) => {
          const isCurrent = currentIndex === idx;
          const isAnswered = Boolean(answeredMap[q.id]);

          let typeColor = 'text-slate-400';
          if (q.type === 'code') typeColor = 'text-sky-500';
          else if (q.type === 'sql') typeColor = 'text-amber-500';
          else if (q.type === 'project') typeColor = 'text-purple-500';

          return (
            <button
              key={q.id || idx}
              type="button"
              onClick={() => onSelect(idx)}
              className={`h-11 rounded-lg border flex flex-col items-center justify-center transition-all ${
                isCurrent
                  ? 'border-indigo-600 dark:border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-bold'
                  : isAnswered
                  ? 'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 font-medium'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              <span className="text-xs">{idx + 1}</span>
              <span className={`text-[9px] uppercase tracking-tighter font-semibold ${typeColor}`}>
                {q.type === 'mcq' ? 'MCQ' : q.type === 'code' ? 'Code' : q.type === 'sql' ? 'SQL' : 'Proj'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block" /> Current
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Answered
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700 inline-block" /> Remaining
        </span>
      </div>
    </div>
  );
};
