import React from 'react';
import { HelpCircle, ChevronLeft, ChevronRight, MessageSquareText } from 'lucide-react';
import type { V2QuestionClient } from '../../types/assessmentV2';

interface QuizPanelProps {
  question: V2QuestionClient;
  currentIndex: number;
  totalQuestions: number;
  selectedOption: number | undefined;
  onSelectOption: (optionIndex: number) => void;
  explanationText?: string;
  onExplanationChange?: (text: string) => void;
  onNext: () => void;
  onPrev: () => void;
}

export const QuizPanel: React.FC<QuizPanelProps> = ({
  question,
  currentIndex,
  totalQuestions,
  selectedOption,
  onSelectOption,
  explanationText = '',
  onExplanationChange,
  onNext,
  onPrev,
}) => {
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col justify-between min-h-[480px]">
      <div>
        {/* Header badges */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
              {question.skillName} • Difficulty {question.difficulty}/3
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Q{currentIndex + 1} of {totalQuestions}
            </span>
          </div>
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5" /> Multiple Choice
          </span>
        </div>

        {/* Question Prompt */}
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-6 leading-relaxed">
          {question.prompt}
        </h2>

        {/* Tactile Option Selectors */}
        <div className="space-y-3 mb-6">
          {question.options?.map((option, idx) => {
            const isSelected = selectedOption === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectOption(idx)}
                className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3.5 text-sm ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 dark:border-indigo-500 text-indigo-950 dark:text-indigo-200 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {letters[idx] || idx + 1}
                </span>
                <span className="leading-snug pt-0.5">{option}</span>
              </button>
            );
          })}
        </div>

        {/* Short Explanation Justification Box */}
        {onExplanationChange && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
              <MessageSquareText className="w-3.5 h-3.5 text-slate-400" />
              Briefly explain your reasoning (Optional - evaluates understanding)
            </label>
            <input
              type="text"
              value={explanationText}
              onChange={(e) => onExplanationChange(e.target.value)}
              placeholder="e.g. useCallback caches function references across re-renders to maintain referential equality..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>
        )}
      </div>

      {/* Footer Navigation Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800 mt-6">
        <button
          type="button"
          onClick={onPrev}
          disabled={currentIndex === 0}
          className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>

        <button
          type="button"
          onClick={onNext}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
        >
          {currentIndex === totalQuestions - 1 ? 'Review & Submit' : 'Next Question'}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
