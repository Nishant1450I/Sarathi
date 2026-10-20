import React from 'react';
import {
  MessageSquare,
  ExternalLink,
  GraduationCap,
  FolderGit2,
  FileCheck2,
  Award,
  Clock,
  AlertCircle,
  Check
} from 'lucide-react';
import type { ApplicationItem } from '../../../services/recruiterApiService';
import { MatchScorePopover } from './MatchScorePopover';

interface CandidatePipelineCardProps {
  application: ApplicationItem;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onOpenPreview: (app: ApplicationItem) => void;
  onOpenPassport: (candidateId: string) => void;
  onOpenNoteModal: (app: ApplicationItem) => void;
  onStageChange: (applicationId: string, targetStage: string, candidateName: string) => void;
  pipelineStages: Array<{ id: string; label: string }>;
  blindReview?: boolean;
}

export const CandidatePipelineCard: React.FC<CandidatePipelineCardProps> = ({
  application,
  isSelected,
  onToggleSelect,
  onOpenPreview,
  onOpenPassport,
  onOpenNoteModal,
  onStageChange,
  pipelineStages,
  blindReview = false,
}) => {
  const displayName = blindReview
    ? `Applicant #${application.id.slice(-4).toUpperCase()}`
    : application.candidate_name;

  const displayAvatar = blindReview
    ? `https://api.dicebear.com/7.x/identicon/svg?seed=${application.id}`
    : (application.candidate_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(application.candidate_name)}`);

  const displayCollege = blindReview
    ? 'Verified University'
    : (application.institution || 'University Candidate');

  const gradYearStr = application.graduation_year ? `'${String(application.graduation_year).slice(-2)}` : '';

  return (
    <div
      className={`p-4 rounded-2xl bg-white border transition-all duration-150 space-y-3 group relative cursor-pointer ${
        isSelected
          ? 'border-[#4F46E5] ring-2 ring-indigo-100 shadow-md bg-indigo-50/20'
          : 'border-slate-200 hover:border-indigo-300 shadow-2xs hover:shadow-md'
      }`}
      onClick={() => onOpenPreview(application)}
    >
      {/* Top Header: Checkbox + Name + Match Badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          {/* Multi-select Checkbox */}
          <div
            className="pt-0.5"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect(application.id);
            }}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => {}}
              aria-label={`Select ${displayName}`}
              className="w-4 h-4 rounded text-[#4F46E5] border-slate-300 focus:ring-indigo-500 cursor-pointer"
            />
          </div>

          {/* Avatar */}
          <img
            src={displayAvatar}
            alt={displayName}
            className="w-9 h-9 rounded-xl object-cover bg-slate-100 shrink-0 border border-slate-100"
          />

          {/* Name & Academic info */}
          <div className="min-w-0">
            <h4
              className="text-xs font-black text-slate-900 truncate group-hover:text-[#4F46E5] transition-colors"
              title={displayName}
            >
              {displayName}
            </h4>

            {/* College & Grad Year */}
            <div className="flex items-center gap-1 text-[11px] text-slate-500 truncate mt-0.5">
              <GraduationCap className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate">{displayCollege} {gradYearStr}</span>
              {application.cgpa && application.cgpa > 0 ? (
                <span className="font-semibold text-slate-600 shrink-0">· {application.cgpa} CGPA</span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Match score badge with 5-factor breakdown popover */}
        <div onClick={(e) => e.stopPropagation()}>
          <MatchScorePopover
            applicationId={application.id}
            score={application.match_score}
            hasManualOverride={application.has_manual_override}
          />
        </div>
      </div>

      {/* Headline / Summary */}
      {application.headline && (
        <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
          {application.headline}
        </p>
      )}

      {/* Verified Skills chips (Top 3 + Overflow) */}
      {application.top_skills && application.top_skills.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 pt-0.5">
          {application.top_skills.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-slate-100/90 text-slate-700 rounded-md text-[10px] font-semibold border border-slate-200/60"
            >
              <Check className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
              <span className="truncate max-w-[90px]">{skill}</span>
            </span>
          ))}

          {application.verified_skill_count > application.top_skills.length && (
            <span className="px-1.5 py-0.5 bg-indigo-50 text-[#4F46E5] rounded-md text-[10px] font-extrabold border border-indigo-100">
              +{application.verified_skill_count - application.top_skills.length}
            </span>
          )}
        </div>
      )}

      {/* Student Metrics: Projects, Assessments, Certifications */}
      <div className="grid grid-cols-3 gap-1 py-1.5 px-2 bg-slate-50 border border-slate-100 rounded-xl text-center text-[10px]">
        <div className="flex items-center justify-center gap-1 text-slate-600" title="Verified Projects">
          <FolderGit2 className="w-3 h-3 text-indigo-500 shrink-0" />
          <span className="font-bold">{application.project_count || 0}</span>
          <span className="text-slate-400">Proj</span>
        </div>
        <div className="flex items-center justify-center gap-1 text-slate-600 border-x border-slate-200/80" title="Completed Assessments">
          <FileCheck2 className="w-3 h-3 text-emerald-500 shrink-0" />
          <span className="font-bold">
            {application.assessment_score ? `${application.assessment_score}%` : (application.assessment_count || 0)}
          </span>
          <span className="text-slate-400">{application.assessment_score ? 'Asmt' : 'Tests'}</span>
        </div>
        <div className="flex items-center justify-center gap-1 text-slate-600" title="Verified Certifications">
          <Award className="w-3 h-3 text-amber-500 shrink-0" />
          <span className="font-bold">{application.certification_count || 0}</span>
          <span className="text-slate-400">Cert</span>
        </div>
      </div>

      {/* Tags and Stage Age */}
      <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-100 text-slate-400">
        {/* Stage-age chip */}
        <span className="inline-flex items-center gap-1 text-slate-500 font-medium">
          <Clock className="w-3 h-3 text-slate-400" />
          {application.days_in_stage !== undefined ? (
            application.days_in_stage === 0 ? 'Today' : `${application.days_in_stage}d in stage`
          ) : 'Active'}
        </span>

        {/* Tags or below-bar warning */}
        <div className="flex items-center gap-1 overflow-hidden">
          {application.is_below_bar && (
            <span
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[9px] font-bold"
              title={`Missing required skills: ${(application.missing_must_have || []).join(', ')}`}
            >
              <AlertCircle className="w-2.5 h-2.5 text-rose-500" />
              Below Bar
            </span>
          )}

          {application.tags && application.tags.length > 0 && (
            <span className="px-1.5 py-0.5 bg-indigo-50/80 text-indigo-700 rounded text-[9px] font-bold border border-indigo-100 truncate max-w-[100px]">
              {application.tags[0]}
              {application.tags.length > 1 && ` +${application.tags.length - 1}`}
            </span>
          )}
        </div>
      </div>

      {/* Card Actions Footer */}
      <div
        className="flex items-center justify-between gap-1 pt-1"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onOpenNoteModal(application)}
            className="p-1.5 text-slate-400 hover:text-[#4F46E5] hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
            title="Add Internal Recruiter Note"
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onOpenPassport(application.candidate_id)}
            className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#4F46E5] hover:text-indigo-800 hover:underline px-1 py-1 rounded cursor-pointer"
            title="Open Full Verified Skill Passport"
          >
            <span>Passport</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </button>
        </div>

        {/* Move stage dropdown */}
        <select
          value={application.stage}
          onChange={(e) => {
            const newStage = e.target.value;
            if (newStage && newStage !== application.stage) {
              onStageChange(application.id, newStage, application.candidate_name);
            }
          }}
          className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 py-1 px-1.5 rounded-lg outline-none cursor-pointer border border-transparent focus:border-indigo-300"
          aria-label={`Move stage for ${displayName}`}
        >
          <option value={application.stage}>Move To...</option>
          {pipelineStages.map((c) => (
            <option key={c.id} value={c.id} disabled={c.id === application.stage}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
