import React from 'react';
import {
  MessageSquare,
  Clock
} from 'lucide-react';
import type { ApplicationItem } from '../../../services/recruiterApiService';
import { MatchScorePopover } from './MatchScorePopover';

interface PipelineTableViewProps {
  applications: ApplicationItem[];
  selectedAppIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onOpenPreview: (app: ApplicationItem) => void;
  onOpenPassport: (candidateId: string) => void;
  onOpenNoteModal: (app: ApplicationItem) => void;
  onStageChange: (applicationId: string, targetStage: string, candidateName: string) => void;
  pipelineStages: Array<{ id: string; label: string }>;
  blindReview?: boolean;
}

export const PipelineTableView: React.FC<PipelineTableViewProps> = ({
  applications,
  selectedAppIds,
  onToggleSelect,
  onSelectAll,
  onOpenPreview,
  onOpenPassport,
  onOpenNoteModal,
  onStageChange,
  pipelineStages,
  blindReview = false,
}) => {
  const allSelected = applications.length > 0 && applications.every((a) => selectedAppIds.has(a.id));
  const someSelected = applications.some((a) => selectedAppIds.has(a.id)) && !allSelected;

  return (
    <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-200 select-none">
            <tr>
              <th className="p-4 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={onSelectAll}
                  className="w-4 h-4 rounded text-[#4F46E5] border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  title="Select all visible candidates"
                />
              </th>
              <th className="py-4 px-3">Candidate</th>
              <th className="py-4 px-3">Education & CGPA</th>
              <th className="py-4 px-3">Verified Skills</th>
              <th className="py-4 px-3 text-center">Score</th>
              <th className="py-4 px-3 text-center">Match %</th>
              <th className="py-4 px-3">Stage & Age</th>
              <th className="py-4 px-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {applications.map((app) => {
              const isSelected = selectedAppIds.has(app.id);
              const displayName = blindReview
                ? `Applicant #${app.id.slice(-4).toUpperCase()}`
                : app.candidate_name;

              const displayCollege = blindReview
                ? 'Verified University'
                : (app.institution || 'University');

              const displayAvatar = blindReview
                ? `https://api.dicebear.com/7.x/identicon/svg?seed=${app.id}`
                : (app.candidate_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(app.candidate_name)}`);

              return (
                <tr
                  key={app.id}
                  onClick={() => onOpenPreview(app)}
                  className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                    isSelected ? 'bg-indigo-50/20' : ''
                  }`}
                >
                  {/* Select Checkbox */}
                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(app.id)}
                      className="w-4 h-4 rounded text-[#4F46E5] border-slate-300 focus:ring-indigo-500 cursor-pointer"
                      aria-label={`Select ${displayName}`}
                    />
                  </td>

                  {/* Candidate Info */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-3 min-w-0 max-w-[240px]">
                      <img
                        src={displayAvatar}
                        alt={displayName}
                        className="w-8 h-8 rounded-xl object-cover bg-slate-100 shrink-0 border border-slate-100"
                      />
                      <div className="min-w-0">
                        <span className="font-extrabold text-slate-900 block truncate hover:text-[#4F46E5]">
                          {displayName}
                        </span>
                        <span className="text-[11px] text-slate-500 truncate block">
                          {app.job_title}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Education & CGPA */}
                  <td className="py-3 px-3">
                    <div className="space-y-0.5 max-w-[200px]">
                      <span className="font-bold text-slate-800 truncate block">
                        {displayCollege}
                      </span>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <span>Class of {app.graduation_year || 2025}</span>
                        {app.cgpa && app.cgpa > 0 ? (
                          <span className="font-black text-[#4F46E5]">· {app.cgpa} CGPA</span>
                        ) : null}
                      </div>
                    </div>
                  </td>

                  {/* Top Skills */}
                  <td className="py-3 px-3">
                    <div className="flex flex-wrap gap-1 max-w-[240px]">
                      {(app.top_skills || []).slice(0, 2).map((s) => (
                        <span
                          key={s}
                          className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold"
                        >
                          {s}
                        </span>
                      ))}
                      {app.verified_skill_count > 2 && (
                        <span className="px-1.5 py-0.5 bg-indigo-50 text-[#4F46E5] rounded text-[10px] font-extrabold">
                          +{app.verified_skill_count - 2}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Assessment Score */}
                  <td className="py-3 px-3 text-center">
                    <span className="font-black text-slate-800 text-xs">
                      {app.assessment_score ? `${app.assessment_score}%` : '—'}
                    </span>
                  </td>

                  {/* Match Score */}
                  <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <MatchScorePopover
                      applicationId={app.id}
                      score={app.match_score}
                      hasManualOverride={app.has_manual_override}
                    />
                  </td>

                  {/* Stage & Age */}
                  <td className="py-3 px-3">
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-800 uppercase text-[10px] tracking-wider block">
                        {app.stage.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {app.days_in_stage !== undefined ? `${app.days_in_stage}d in stage` : 'Active'}
                      </span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onOpenNoteModal(app)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                        title="Add Note"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenPassport(app.candidate_id)}
                        className="text-[11px] font-bold text-[#4F46E5] hover:underline px-1 cursor-pointer"
                      >
                        Passport
                      </button>

                      <select
                        value={app.stage}
                        onChange={(e) => onStageChange(app.id, e.target.value, app.candidate_name)}
                        className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 py-1 px-1.5 rounded-lg outline-none cursor-pointer"
                      >
                        <option value={app.stage}>Move...</option>
                        {pipelineStages.map((s) => (
                          <option key={s.id} value={s.id} disabled={s.id === app.stage}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
