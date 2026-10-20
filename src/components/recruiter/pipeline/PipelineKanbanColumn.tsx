import React, { useState } from 'react';
import { ChevronDown, ChevronRight, ChevronLeft, AlertCircle, Layers } from 'lucide-react';
import type { ApplicationItem } from '../../../services/recruiterApiService';
import { CandidatePipelineCard } from './CandidatePipelineCard';

interface PipelineKanbanColumnProps {
  column: {
    id: string;
    label: string;
    color: string;
  };
  applications: ApplicationItem[];
  selectedAppIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectColumnAll: (stageId: string, select: boolean) => void;
  onOpenPreview: (app: ApplicationItem) => void;
  onOpenPassport: (candidateId: string) => void;
  onOpenNoteModal: (app: ApplicationItem) => void;
  onStageChange: (applicationId: string, targetStage: string, candidateName: string) => void;
  pipelineStages: Array<{ id: string; label: string }>;
  blindReview?: boolean;
}

const PAGE_SIZE = 25;

export const PipelineKanbanColumn: React.FC<PipelineKanbanColumnProps> = ({
  column,
  applications,
  selectedAppIds,
  onToggleSelect,
  onSelectColumnAll,
  onOpenPreview,
  onOpenPassport,
  onOpenNoteModal,
  onStageChange,
  pipelineStages,
  blindReview = false,
}) => {
  const [isRailCollapsed, setIsRailCollapsed] = useState(applications.length === 0);
  const [isBelowBarOpen, setIsBelowBarOpen] = useState(false);
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);

  // Separate candidates into qualified vs below bar (missing must-have skills)
  const qualifiedApps = applications.filter((a) => !a.is_below_bar);
  const belowBarApps = applications.filter((a) => a.is_below_bar);

  const visibleApps = qualifiedApps.slice(0, displayCount);
  const hasMore = qualifiedApps.length > displayCount;

  // Column select-all state
  const allSelected = applications.length > 0 && applications.every((a) => selectedAppIds.has(a.id));
  const someSelected = applications.some((a) => selectedAppIds.has(a.id)) && !allSelected;

  // If thin rail collapsed view
  if (isRailCollapsed) {
    return (
      <div
        className="w-12 bg-slate-100/80 hover:bg-slate-200/80 border border-slate-200 rounded-3xl p-3 flex flex-col items-center justify-between cursor-pointer transition-all shrink-0 select-none group"
        onClick={() => setIsRailCollapsed(false)}
        title={`Expand ${column.label} (${applications.length} candidates)`}
      >
        <div className="flex flex-col items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full border-2 ${column.color} bg-white shrink-0`} />
          <span className="px-1.5 py-0.5 rounded-full bg-white text-slate-700 font-extrabold text-[10px] shadow-2xs">
            {applications.length}
          </span>
        </div>

        {/* Vertical Text */}
        <div className="[writing-mode:vertical-lr] rotate-180 text-xs font-black text-slate-600 uppercase tracking-widest py-4">
          {column.label}
        </div>

        <div className="w-6 h-6 rounded-lg bg-white/70 text-slate-500 group-hover:text-indigo-600 flex items-center justify-center">
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-100/70 border border-slate-200/90 rounded-3xl p-4 flex flex-col space-y-3 min-w-[280px] max-w-[340px] shrink-0">
      {/* Sticky Column Header */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
        <div className="flex items-center gap-2 min-w-0">
          {/* Select all checkbox for this column */}
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = someSelected;
            }}
            onChange={(e) => onSelectColumnAll(column.id, e.target.checked)}
            className="w-4 h-4 rounded text-[#4F46E5] border-slate-300 focus:ring-indigo-500 cursor-pointer"
            title={`Select all in ${column.label}`}
          />

          <span className={`w-2.5 h-2.5 rounded-full border-2 ${column.color} bg-white shrink-0`} />
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider truncate">
            {column.label}
          </h3>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="px-2 py-0.5 rounded-full bg-white text-slate-700 font-extrabold text-[11px] shadow-2xs">
            {applications.length}
          </span>

          {/* Collapse into rail button */}
          <button
            type="button"
            onClick={() => setIsRailCollapsed(true)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200/60 cursor-pointer transition-colors"
            title="Collapse column into thin rail"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Card List with virtualized/paginated scroll */}
      <div className="space-y-3 flex-1 overflow-y-auto max-h-[720px] pr-1">
        {/* Qualified Candidates */}
        {visibleApps.map((app) => (
          <CandidatePipelineCard
            key={app.id}
            application={app}
            isSelected={selectedAppIds.has(app.id)}
            onToggleSelect={onToggleSelect}
            onOpenPreview={onOpenPreview}
            onOpenPassport={onOpenPassport}
            onOpenNoteModal={onOpenNoteModal}
            onStageChange={onStageChange}
            pipelineStages={pipelineStages}
            blindReview={blindReview}
          />
        ))}

        {/* Load More within Column */}
        {hasMore && (
          <button
            type="button"
            onClick={() => setDisplayCount((prev) => prev + PAGE_SIZE)}
            className="w-full py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-colors cursor-pointer"
          >
            Load {qualifiedApps.length - displayCount} More Candidates
          </button>
        )}

        {/* Must-Have Skills: Below-Bar Collapsible Group */}
        {belowBarApps.length > 0 && (
          <div className="pt-2 border-t border-slate-200/80">
            <button
              type="button"
              onClick={() => setIsBelowBarOpen(!isBelowBarOpen)}
              className="w-full flex items-center justify-between px-3 py-2 bg-amber-50/70 hover:bg-amber-100/70 border border-amber-200/80 rounded-xl text-left cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Below Bar ({belowBarApps.length})</span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-amber-600 transition-transform ${
                  isBelowBarOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isBelowBarOpen && (
              <div className="mt-2.5 space-y-3">
                <p className="text-[10px] text-slate-500 px-1">
                  Candidates missing one or more required job skills. Retained for human review.
                </p>
                {belowBarApps.map((app) => (
                  <CandidatePipelineCard
                    key={app.id}
                    application={app}
                    isSelected={selectedAppIds.has(app.id)}
                    onToggleSelect={onToggleSelect}
                    onOpenPreview={onOpenPreview}
                    onOpenPassport={onOpenPassport}
                    onOpenNoteModal={onOpenNoteModal}
                    onStageChange={onStageChange}
                    pipelineStages={pipelineStages}
                    blindReview={blindReview}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {applications.length === 0 && (
          <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl text-[11px] text-slate-400 space-y-1">
            <Layers className="w-5 h-5 mx-auto text-slate-300" />
            <p>No candidates in this stage</p>
          </div>
        )}
      </div>
    </div>
  );
};
