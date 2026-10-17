import React, { useState } from 'react';
import { FolderGit2, Globe, FileCode2, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import type { V2QuestionClient } from '../../types/assessmentV2';

interface ProjectTaskProps {
  question: V2QuestionClient;
  code: string;
  onCodeChange: (code: string) => void;
  repoUrl?: string;
  onRepoUrlChange?: (url: string) => void;
  demoUrl?: string;
  onDemoUrlChange?: (url: string) => void;
}

export const ProjectTask: React.FC<ProjectTaskProps> = ({
  question,
  code,
  onCodeChange,
  repoUrl = '',
  onRepoUrlChange,
  demoUrl = '',
  onDemoUrlChange,
}) => {
  const [rubricOpen, setRubricOpen] = useState(true);

  return (
    <div className="space-y-6">
      {/* Project Brief */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
            Mini-Project Challenge • {question.skillName}
          </span>
          <span className="text-xs text-slate-500 font-mono">Rubric-Evaluated</span>
        </div>

        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
          Architecture & Implementation Challenge
        </h2>

        <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed mb-5">
          {question.prompt}
        </div>

        {/* Rubric Criteria Accordion */}
        {question.rubric && question.rubric.length > 0 && (
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setRubricOpen(!rubricOpen)}
              className="w-full bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                Transparent Evaluation Rubric ({question.rubric.length} Criteria)
              </span>
              {rubricOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {rubricOpen && (
              <div className="p-4 bg-white dark:bg-slate-900 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {question.rubric.map((r) => (
                  <div key={r.key} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-900 dark:text-white">{r.label}</span>
                      <span className="text-purple-600 dark:text-purple-400 font-mono font-bold">{r.weight}%</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-normal">{r.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Submission Inputs: Code Editor Text & Repository Links */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <FileCode2 className="w-4 h-4 text-sky-500" /> Source Code & Implementation Deliverables
        </h3>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Key Code Snippet / Module Text (Markdown or Source)
          </label>
          <textarea
            value={code}
            onChange={(e) => onCodeChange(e.target.value)}
            rows={10}
            placeholder="Paste your core implementation, route handlers, or architectural code here..."
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 outline-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <FolderGit2 className="w-3.5 h-3.5 text-slate-400" /> GitHub Repository URL (Optional)
            </label>
            <input
              type="url"
              value={repoUrl}
              onChange={(e) => onRepoUrlChange?.(e.target.value)}
              placeholder="https://github.com/username/project"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-purple-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-slate-400" /> Live Demo / Deployment URL (Optional)
            </label>
            <input
              type="url"
              value={demoUrl}
              onChange={(e) => onDemoUrlChange?.(e.target.value)}
              placeholder="https://my-app.vercel.app"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-purple-500 outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
