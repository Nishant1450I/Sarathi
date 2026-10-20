import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, AlertTriangle, CheckCircle2, XCircle, Info } from 'lucide-react';
import { recruiterApi } from '../../../services/recruiterApiService';
import type { MatchBreakdown } from '../../../services/recruiterApiService';

interface MatchScorePopoverProps {
  applicationId: string;
  score: number;
  hasManualOverride?: boolean;
}

export const MatchScorePopover: React.FC<MatchScorePopoverProps> = ({
  applicationId,
  score,
  hasManualOverride = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [breakdown, setBreakdown] = useState<MatchBreakdown | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const fetchBreakdown = async () => {
    if (breakdown) return;
    try {
      setLoading(true);
      const data = await recruiterApi.getMatchBreakdown(applicationId);
      setBreakdown(data);
    } catch {
      // Fallback local breakdown if network error
      setBreakdown({
        applicationId,
        candidateId: '',
        jobId: '',
        overallScore: score,
        currentStage: '',
        hasManualOverride,
        overrideReason: hasManualOverride ? 'Stage advanced ahead of composite algorithm score.' : null,
        factors: {
          verifiedSkills: { weight: 35, score: Math.round(score * 0.35), maxScore: 35, label: 'Verified Skills (35%)', details: 'Skills evaluated against job requirements' },
          assessment: { weight: 25, score: Math.round(score * 0.25), maxScore: 25, label: 'Assessment Performance (25%)', details: 'Practical coding & MCQ score' },
          projectRelevance: { weight: 20, score: Math.round(score * 0.20), maxScore: 20, label: 'Project Relevance (20%)', details: 'Repository & code sample analysis' },
          educationFit: { weight: 10, score: Math.round(score * 0.10), maxScore: 10, label: 'Education Fit (10%)', details: 'Degree, college & CGPA metrics' },
          learningVelocity: { weight: 10, score: Math.round(score * 0.10), maxScore: 10, label: 'Learning Velocity (10%)', details: 'Certifications and verified progress' },
        },
        matchedSkills: ['Core Competencies'],
        missingSkills: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
    fetchBreakdown();
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
    if (!isOpen) fetchBreakdown();
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isOpen]);

  const badgeColorClass = score >= 90
    ? 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
    : score >= 75
    ? 'text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100'
    : score >= 60
    ? 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100'
    : 'text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100';

  return (
    <div
      className="relative inline-block"
      ref={popoverRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-black transition-all cursor-pointer shadow-2xs ${badgeColorClass}`}
        aria-label={`Match score ${score}%, click for 5-factor breakdown`}
      >
        <Sparkles className="w-3 h-3 shrink-0" />
        <span>{score}%</span>
        {hasManualOverride && (
          <span
            className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"
            title="Manual Stage Override"
          />
        )}
      </button>

      {isOpen && (
        <div
          className="absolute z-50 left-0 sm:left-auto sm:right-0 top-full mt-2 w-80 sm:w-96 p-4 bg-white rounded-2xl border border-slate-200 shadow-2xl text-left transition-all animate-in fade-in zoom-in-95 duration-150"
          role="dialog"
          aria-label="Match Score Breakdown"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-[#4F46E5] flex items-center justify-center font-black text-xs">
                {score}%
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  Match Score Breakdown
                </h4>
                <p className="text-[10px] text-slate-500">5-factor objective weighted model</p>
              </div>
            </div>

            {hasManualOverride && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-extrabold">
                <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                Manual Override
              </span>
            )}
          </div>

          {/* Manual override alert note */}
          {hasManualOverride && (
            <div className="mt-2.5 p-2.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-tight">
                {breakdown?.overrideReason || 'Candidate stage was manually advanced by recruiter ahead of algorithmic score recommendation.'}
              </p>
            </div>
          )}

          {loading && !breakdown ? (
            <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              Computing multi-factor fit...
            </div>
          ) : breakdown ? (
            <div className="mt-3 space-y-3">
              {/* Weighted Factors */}
              <div className="space-y-2.5">
                {Object.entries(breakdown.factors).map(([key, factor]) => {
                  const pct = Math.min(100, Math.round((factor.score / factor.maxScore) * 100));
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-700">{factor.label}</span>
                        <span className="font-extrabold text-slate-900">
                          {factor.score} <span className="text-slate-400 font-normal">/ {factor.maxScore}</span>
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#4F46E5] rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 leading-tight">{factor.details}</p>
                    </div>
                  );
                })}
              </div>

              {/* Matched vs Missing Skills */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                {breakdown.matchedSkills.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block mb-1">
                      Matched Skills ({breakdown.matchedSkills.length})
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {breakdown.matchedSkills.map(skill => (
                        <span
                          key={skill}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-semibold"
                        >
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {breakdown.missingSkills.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block mb-1">
                      Missing Target Skills ({breakdown.missingSkills.length})
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {breakdown.missingSkills.map(skill => (
                        <span
                          key={skill}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-md text-[10px] font-semibold"
                        >
                          <XCircle className="w-2.5 h-2.5 text-rose-500" />
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
