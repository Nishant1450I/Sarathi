import React, { useState } from 'react';
import {
  ArrowRight,
  Tag,
  Star,
  Mail,
  FileCheck2,
  GitCompare,
  X,
  AlertTriangle
} from 'lucide-react';

interface StickyBulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  onClearSelection: () => void;
  onSelectAll: () => void;
  pipelineStages: Array<{ id: string; label: string }>;
  onBulkMoveStage: (targetStage: string, reason?: string) => Promise<void>;
  onBulkAddTag: (tag: string) => Promise<void>;
  onBulkShortlist: () => void;
  onBulkEmail: () => void;
  onBulkInviteAssessment: () => void;
  onCompare: () => void;
}

export const StickyBulkActionBar: React.FC<StickyBulkActionBarProps> = ({
  selectedCount,
  totalCount,
  onClearSelection,
  onSelectAll,
  pipelineStages,
  onBulkMoveStage,
  onBulkAddTag,
  onBulkShortlist,
  onBulkEmail,
  onBulkInviteAssessment,
  onCompare,
}) => {
  const [confirmStageModal, setConfirmStageModal] = useState<string | null>(null);
  const [stageReason, setStageReason] = useState('');
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);

  if (selectedCount === 0) return null;

  const handleStageSelect = (stageId: string) => {
    if (!stageId) return;
    setConfirmStageModal(stageId);
  };

  const handleExecuteStageMove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmStageModal) return;
    try {
      setIsExecuting(true);
      await onBulkMoveStage(confirmStageModal, stageReason);
      setConfirmStageModal(null);
      setStageReason('');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleExecuteTagAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTag.trim()) return;
    try {
      setIsExecuting(true);
      await onBulkAddTag(selectedTag.trim());
      setSelectedTag('');
      setTagModalOpen(false);
    } finally {
      setIsExecuting(false);
    }
  };

  const targetStageLabel = pipelineStages.find((s) => s.id === confirmStageModal)?.label || confirmStageModal;

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-4xl bg-slate-900 text-white rounded-3xl shadow-2xl p-3 sm:px-5 sm:py-3.5 flex flex-wrap items-center justify-between gap-3 border border-slate-800 animate-in slide-in-from-bottom-6 duration-200">
        {/* Left: Count + Select All / Clear */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-[#4F46E5] text-white flex items-center justify-center font-black text-xs">
              {selectedCount}
            </span>
            <span className="text-xs font-bold text-slate-200">
              Candidate{selectedCount > 1 ? 's' : ''} Selected
            </span>
          </div>

          <div className="h-4 w-px bg-slate-700 hidden sm:block" />

          {selectedCount < totalCount && (
            <button
              type="button"
              onClick={onSelectAll}
              className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer hidden sm:inline"
            >
              Select All ({totalCount})
            </button>
          )}

          <button
            type="button"
            onClick={onClearSelection}
            className="text-[11px] font-semibold text-slate-400 hover:text-white cursor-pointer"
          >
            Deselect
          </button>
        </div>

        {/* Right: Bulk Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Compare (2 to 4 candidates) */}
          <button
            type="button"
            onClick={onCompare}
            disabled={selectedCount < 2 || selectedCount > 4}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedCount >= 2 && selectedCount <= 4
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
            }`}
            title={
              selectedCount < 2
                ? 'Select at least 2 candidates to compare'
                : selectedCount > 4
                ? 'Maximum 4 candidates can be compared side-by-side'
                : 'Compare side-by-side'
            }
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>Compare</span>
          </button>

          {/* Move to Stage Dropdown */}
          <div className="relative">
            <select
              onChange={(e) => {
                handleStageSelect(e.target.value);
                e.target.value = '';
              }}
              defaultValue=""
              className="py-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold outline-none border border-slate-700 cursor-pointer"
              aria-label="Bulk Move to Stage"
            >
              <option value="" disabled>
                Move to Stage...
              </option>
              {pipelineStages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Add Tag */}
          <button
            type="button"
            onClick={() => setTagModalOpen(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer transition-colors"
            title="Add Tag to Selected"
          >
            <Tag className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Tag</span>
          </button>

          {/* Add to Shortlist */}
          <button
            type="button"
            onClick={onBulkShortlist}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer transition-colors"
            title="Add to Shortlist"
          >
            <Star className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Shortlist</span>
          </button>

          {/* Send Templated Email */}
          <button
            type="button"
            onClick={onBulkEmail}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer transition-colors"
            title="Send Templated Email to Selected"
          >
            <Mail className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Email</span>
          </button>

          {/* Invite to Assessment */}
          <button
            type="button"
            onClick={onBulkInviteAssessment}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer transition-colors"
            title="Invite Selected to Skill Assessment"
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Assessment</span>
          </button>

          {/* Dismiss selection button */}
          <button
            type="button"
            onClick={onClearSelection}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer ml-1"
            title="Dismiss Selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Confirmation Modal: Move Stage */}
      {confirmStageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white text-slate-900 rounded-3xl border border-slate-200 shadow-2xl p-6 w-full max-w-md space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-50 text-[#4F46E5] rounded-2xl">
                <ArrowRight className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">
                  Bulk Advance Pipeline Stage
                </h4>
                <p className="text-xs text-slate-500">
                  Moving {selectedCount} candidate{selectedCount > 1 ? 's' : ''} to "{targetStageLabel}"
                </p>
              </div>
            </div>

            <form onSubmit={handleExecuteStageMove} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Audit Reason / Transition Note (Required for Compliance)
                </label>
                <textarea
                  rows={3}
                  value={stageReason}
                  onChange={(e) => setStageReason(e.target.value)}
                  placeholder="e.g. Cleared automated screening threshold; advancing to assessment..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-100"
                  required
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-tight">
                  This action will update candidate application stages and log audit records. You can immediately undo from the confirmation toast.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setConfirmStageModal(null)}
                  disabled={isExecuting}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isExecuting}
                  className="px-5 py-2 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer flex items-center gap-2"
                >
                  {isExecuting && (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>Confirm Move ({selectedCount})</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Tag Modal */}
      {tagModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white text-slate-900 rounded-3xl border border-slate-200 shadow-2xl p-6 w-full max-w-sm space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-50 text-[#4F46E5] rounded-2xl">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">Add Tag to Candidates</h4>
                <p className="text-xs text-slate-500">Apply tag to {selectedCount} candidate{selectedCount > 1 ? 's' : ''}</p>
              </div>
            </div>

            <form onSubmit={handleExecuteTagAdd} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Tag Name</label>
                <input
                  type="text"
                  placeholder="e.g. Fast-Track, Hackathon Winner, Priority..."
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-indigo-100"
                  autoFocus
                  required
                />
              </div>

              <div className="flex flex-wrap gap-1">
                {['Top 5%', 'Hackathon Winner', 'Immediate Joiner', 'Strong DS/Algo'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setSelectedTag(preset)}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[10px] font-semibold cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTagModalOpen(false)}
                  disabled={isExecuting}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isExecuting}
                  className="px-5 py-2 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer flex items-center gap-2"
                >
                  {isExecuting && (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>Apply Tag</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
