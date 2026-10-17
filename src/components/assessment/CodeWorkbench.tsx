import React, { useState, Suspense, lazy } from 'react';
import { Play, Loader2, Code2, ShieldAlert } from 'lucide-react';
import type { V2QuestionClient } from '../../types/assessmentV2';
import { TestOutputConsole, type TestResultItem } from './TestOutputConsole';

const MonacoEditor = lazy(() => import('@monaco-editor/react'));

interface CodeWorkbenchProps {
  question: V2QuestionClient;
  code: string;
  onCodeChange: (code: string) => void;
  onRun: (questionId: string, code: string, language: string) => Promise<void>;
  isRunning?: boolean;
  runResults?: {
    status: 'idle' | 'running' | 'success' | 'failed' | 'error';
    visiblePassed: number;
    visibleTotal: number;
    results: TestResultItem[];
    stdout?: string;
    stderr?: string;
    timeMs?: number;
    isolationNotice?: string;
  };
  pasteAllowed?: boolean;
  onPasteBlocked?: () => void;
}

export const CodeWorkbench: React.FC<CodeWorkbenchProps> = ({
  question,
  code,
  onCodeChange,
  onRun,
  isRunning = false,
  runResults = { status: 'idle', visiblePassed: 0, visibleTotal: 0, results: [] },
  pasteAllowed = true,
  onPasteBlocked,
}) => {
  const [selectedLang, setSelectedLang] = useState<string>(question.language || 'javascript');

  const handleEditorPaste = (e: any) => {
    if (!pasteAllowed) {
      if (typeof e?.preventDefault === 'function') e.preventDefault();
      onPasteBlocked?.();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-14rem)] min-h-[580px]">
      {/* Left Column: Problem Brief & Visible Tests */}
      <div className="lg:col-span-5 flex flex-col gap-4 overflow-y-auto pr-1">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
              {question.skillName} • Difficulty {question.difficulty}/3
            </span>
            <span className="text-xs text-slate-500 uppercase tracking-wider font-mono">
              {question.type}
            </span>
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">
            Task Description
          </h2>
          <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
            {question.prompt}
          </div>
        </div>

        {/* Visible Tests List */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
            Visible Test Cases ({question.visibleTests?.length || 0})
          </h3>
          <div className="space-y-2.5">
            {question.visibleTests?.map((t, idx) => (
              <div key={t.id || idx} className="bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-mono">
                <div className="text-slate-400 mb-1 text-[11px]">Test Case #{idx + 1}</div>
                <div className="text-slate-600 dark:text-slate-400 truncate">Input: {t.input}</div>
                <div className="text-emerald-600 dark:text-emerald-400 font-semibold mt-1">Expected: {t.expectedOutput}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column: Code Editor & Execution Console */}
      <div className="lg:col-span-7 flex flex-col gap-4">
        {/* Editor Shell */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col flex-1 shadow-md">
          {/* Editor Header Bar */}
          <div className="bg-slate-900/90 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Code2 className="w-4 h-4 text-sky-400" />
              <select
                aria-label="Programming Language"
                value={selectedLang}
                onChange={(e) => setSelectedLang(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded px-2.5 py-1 focus:ring-1 focus:ring-sky-500 outline-none"
              >
                <option value="javascript">JavaScript (Node.js)</option>
                <option value="python">Python 3</option>
                <option value="sql">SQL (SQLite 3)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              {!pasteAllowed && (
                <span className="text-[11px] text-amber-400/90 flex items-center gap-1 font-mono">
                  <ShieldAlert className="w-3.5 h-3.5" /> Paste Restricted
                </span>
              )}
              <button
                type="button"
                onClick={() => onRun(question.id, code, selectedLang)}
                disabled={isRunning}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-medium text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" /> Run Verification Check
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Monaco Lazy-Loaded Container */}
          <div className="flex-1 min-h-[260px] relative" onPaste={handleEditorPaste}>
            <Suspense
              fallback={
                <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
                  Loading Monaco IDE Engine...
                </div>
              }
            >
              <MonacoEditor
                height="100%"
                language={selectedLang}
                theme="vs-dark"
                value={code}
                onChange={(val) => onCodeChange(val || '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                }}
              />
            </Suspense>
          </div>
        </div>

        {/* Console Drawer */}
        <div className="h-56">
          <TestOutputConsole
            status={isRunning ? 'running' : runResults.status}
            visiblePassed={runResults.visiblePassed}
            visibleTotal={runResults.visibleTotal}
            results={runResults.results}
            stdout={runResults.stdout}
            stderr={runResults.stderr}
            timeMs={runResults.timeMs}
            isolationNotice={runResults.isolationNotice}
          />
        </div>
      </div>
    </div>
  );
};
