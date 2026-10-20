import React, { useState } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  LayoutGrid,
  Table,
  Eye,
  EyeOff,
  Bookmark,
  Plus,
  Trash2,
  ChevronDown
} from 'lucide-react';
import type { JobItem, PipelineFilterState, SavedViewItem } from '../../../services/recruiterApiService';

interface PipelineToolbarProps {
  jobs: JobItem[];
  selectedJobId: string;
  onSelectJob: (jobId: string) => void;
  filters: PipelineFilterState;
  onFilterChange: (newFilters: PipelineFilterState) => void;
  onOpenFilterDrawer: () => void;
  activeFilterCount: number;
  viewDensity: 'card' | 'table';
  onToggleDensity: (density: 'card' | 'table') => void;
  blindReview: boolean;
  onToggleBlindReview: () => void;
  savedViews: SavedViewItem[];
  onSelectSavedView: (view: SavedViewItem) => void;
  onSaveCurrentView: (name: string) => void;
  onDeleteSavedView: (id: string) => void;
}

export const PipelineToolbar: React.FC<PipelineToolbarProps> = ({
  jobs,
  selectedJobId,
  onSelectJob,
  filters,
  onFilterChange,
  onOpenFilterDrawer,
  activeFilterCount,
  viewDensity,
  onToggleDensity,
  blindReview,
  onToggleBlindReview,
  savedViews,
  onSelectSavedView,
  onSaveCurrentView,
  onDeleteSavedView,
}) => {
  const [isSavedViewsOpen, setIsSavedViewsOpen] = useState(false);
  const [saveViewModalOpen, setSaveViewModalOpen] = useState(false);
  const [newViewName, setNewViewName] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filters, search: e.target.value });
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({
      ...filters,
      sortBy: e.target.value as PipelineFilterState['sortBy'],
    });
  };

  const handleToggleSortOrder = () => {
    const current = filters.sortOrder || 'desc';
    onFilterChange({
      ...filters,
      sortOrder: current === 'desc' ? 'asc' : 'desc',
    });
  };

  const handleConfirmSaveView = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newViewName.trim()) return;
    onSaveCurrentView(newViewName.trim());
    setNewViewName('');
    setSaveViewModalOpen(false);
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-xs space-y-3">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Left: Job selector + Search input */}
        <div className="flex flex-1 items-center gap-2.5 min-w-0">
          {/* Job Dropdown */}
          <select
            value={selectedJobId}
            onChange={(e) => onSelectJob(e.target.value)}
            className="p-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 max-w-[200px] shrink-0"
            aria-label="Filter by job posting"
          >
            <option value="">-- All Active Roles --</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </select>

          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search candidate name, skill, college, project keyword..."
              value={filters.search ?? ''}
              onChange={handleSearchChange}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400"
              aria-label="Search candidates"
            />
          </div>
        </div>

        {/* Right: Filters, Sort, Saved views, Density & Blind Review toggles */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Filters Button with Badge */}
          <button
            type="button"
            onClick={onOpenFilterDrawer}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              activeFilterCount > 0
                ? 'border-[#4F46E5] bg-indigo-50 text-[#4F46E5] shadow-xs'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
            title="Open comprehensive filters"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#4F46E5] text-white text-[10px] font-black flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Sort Dropdown */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
            <select
              value={filters.sortBy || 'match_score'}
              onChange={handleSortChange}
              className="py-2 pl-2.5 pr-1 bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
              aria-label="Sort candidates by"
            >
              <option value="match_score">Sort: Match %</option>
              <option value="assessment_score">Sort: Assessment</option>
              <option value="verified_skills">Sort: Verified Skills</option>
              <option value="applied_at">Sort: Applied Date</option>
              <option value="stage_age">Sort: Time in Stage</option>
            </select>
            <button
              type="button"
              onClick={handleToggleSortOrder}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
              title={`Switch to ${filters.sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
              aria-label="Toggle sort direction"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Saved Views Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsSavedViewsOpen(!isSavedViewsOpen)}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold cursor-pointer"
              title="Recruiter Saved Views"
            >
              <Bookmark className="w-3.5 h-3.5 text-indigo-600" />
              <span>Views</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isSavedViewsOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3 py-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Saved Views ({savedViews.length})
                </div>

                {savedViews.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-slate-400 text-center">No saved views yet</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {savedViews.map((sv) => (
                      <div
                        key={sv.id}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-slate-50 text-xs cursor-pointer group"
                      >
                        <span
                          className="font-bold text-slate-800 truncate flex-1"
                          onClick={() => {
                            onSelectSavedView(sv);
                            setIsSavedViewsOpen(false);
                          }}
                        >
                          {sv.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => onDeleteSavedView(sv.id)}
                          className="p-1 text-slate-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete saved view"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-2 mt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSavedViewsOpen(false);
                      setSaveViewModalOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-[#4F46E5] rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Save Current View</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Blind Review Mode Toggle */}
          <button
            type="button"
            onClick={onToggleBlindReview}
            className={`inline-flex items-center gap-1 px-2.5 py-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
              blindReview
                ? 'bg-purple-50 text-purple-700 border-purple-200'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            title="Blind Review Mode: Hide candidate names, photos, and institutions for unbiased evaluation"
            aria-label="Toggle blind review mode"
          >
            {blindReview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{blindReview ? 'Blind Review ON' : 'Blind Review'}</span>
          </button>

          {/* View Density Toggle: Card vs Table */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5">
            <button
              type="button"
              onClick={() => onToggleDensity('card')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewDensity === 'card'
                  ? 'bg-white text-[#4F46E5] shadow-xs'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Kanban Board View"
              aria-label="Kanban Board View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onToggleDensity('table')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewDensity === 'table'
                  ? 'bg-white text-[#4F46E5] shadow-xs'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Compact Table Grid View"
              aria-label="Compact Table Grid View"
            >
              <Table className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Save View Modal Dialog */}
      {saveViewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 w-full max-w-sm space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-[#4F46E5]" />
              <h4 className="text-sm font-extrabold text-slate-900">Save Current View</h4>
            </div>

            <form onSubmit={handleConfirmSaveView} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">View Name</label>
                <input
                  type="text"
                  placeholder="e.g. Top IIT 2025 Candidates"
                  value={newViewName}
                  onChange={(e) => setNewViewName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-indigo-100"
                  autoFocus
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSaveViewModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer"
                >
                  Save View
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
