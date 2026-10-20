import React from 'react';
import { X, GitCompare, Sparkles, Check } from 'lucide-react';
import type { CandidateComparisonItem } from '../../../services/recruiterApiService';

interface CandidateCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: CandidateComparisonItem[];
  onOpenPassport: (candidateId: string) => void;
}

export const CandidateCompareModal: React.FC<CandidateCompareModalProps> = ({
  isOpen,
  onClose,
  candidates,
  onOpenPassport,
}) => {
  if (!isOpen || candidates.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-[#4F46E5] rounded-2xl">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Side-by-Side Candidate Comparison
              </h3>
              <p className="text-xs text-slate-500">
                Comparing {candidates.length} candidates across academic, skill, and assessment dimensions
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/60 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comparison Grid Table */}
        <div className="flex-1 overflow-x-auto overflow-y-auto p-6">
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${candidates.length}, minmax(260px, 1fr))` }}
          >
            {candidates.map((c) => (
              <div
                key={c.applicationId}
                className="bg-slate-50/70 border border-slate-200 rounded-3xl p-4 flex flex-col space-y-4"
              >
                {/* Profile Card Top */}
                <div className="text-center space-y-2 pb-3 border-b border-slate-200/80">
                  <img
                    src={c.candidateAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(c.candidateName)}`}
                    alt={c.candidateName}
                    className="w-16 h-16 rounded-2xl mx-auto object-cover bg-white border border-slate-200 shadow-xs"
                  />
                  <div>
                    <h4 className="text-sm font-black text-slate-900">{c.candidateName}</h4>
                    <p className="text-xs text-slate-500 line-clamp-1">{c.headline || c.jobTitle}</p>
                  </div>

                  <div className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-black">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{c.matchScore}% Match</span>
                  </div>
                </div>

                {/* Education Fit */}
                <div className="space-y-1.5 text-xs">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    Education & Academics
                  </span>
                  <div className="p-3 bg-white border border-slate-200/80 rounded-2xl space-y-1">
                    <p className="font-bold text-slate-800">{c.institution}</p>
                    <p className="text-slate-600 text-[11px]">{c.degree || 'Degree'}</p>
                    <div className="flex justify-between pt-1 text-[11px] text-slate-500">
                      <span>Class of <strong>{c.graduationYear || 2025}</strong></span>
                      <span className="font-extrabold text-[#4F46E5]">{c.cgpa || '8.5'} CGPA</span>
                    </div>
                  </div>
                </div>

                {/* 5-Factor Score Breakdown */}
                <div className="space-y-1.5 text-xs">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    Weighted Fit Breakdown
                  </span>
                  <div className="p-3 bg-white border border-slate-200/80 rounded-2xl space-y-2 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Verified Skills (35%):</span>
                      <strong className="text-slate-900">{c.breakdown?.factors?.verifiedSkills?.score || 30} / 35</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Assessment (25%):</span>
                      <strong className="text-slate-900">{c.breakdown?.factors?.assessment?.score || 22} / 25</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Projects (20%):</span>
                      <strong className="text-slate-900">{c.breakdown?.factors?.projectRelevance?.score || 18} / 20</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Education (10%):</span>
                      <strong className="text-slate-900">{c.breakdown?.factors?.educationFit?.score || 9} / 10</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Learning Velocity (10%):</span>
                      <strong className="text-slate-900">{c.breakdown?.factors?.learningVelocity?.score || 8} / 10</strong>
                    </div>
                  </div>
                </div>

                {/* Verified Skills List */}
                <div className="space-y-1.5 text-xs">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    Verified Competencies ({c.verifiedSkills.length})
                  </span>
                  <div className="p-3 bg-white border border-slate-200/80 rounded-2xl flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                    {c.verifiedSkills.map((s) => (
                      <span
                        key={s.id || s.name}
                        className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-bold"
                      >
                        <Check className="w-2.5 h-2.5 text-emerald-600" />
                        <span>{s.name}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Projects */}
                <div className="space-y-1.5 text-xs">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    Top Projects ({c.projects.length})
                  </span>
                  <div className="p-3 bg-white border border-slate-200/80 rounded-2xl space-y-1.5">
                    {c.projects.length === 0 ? (
                      <span className="text-[11px] text-slate-400">No project repositories recorded</span>
                    ) : (
                      c.projects.map((p, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-800 truncate">{p.title}</span>
                          <span className="text-emerald-700 font-extrabold text-[10px]">Verified</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-2 mt-auto">
                  <button
                    type="button"
                    onClick={() => onOpenPassport(c.candidateId)}
                    className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-[#4F46E5] rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    View Skill Passport
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
