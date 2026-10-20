import React from 'react';
import { X, RotateCcw } from 'lucide-react';
import type { PipelineFilterState } from '../../../services/recruiterApiService';

interface PipelineActiveFilterChipsProps {
  filters: PipelineFilterState;
  onRemoveFilter: (key: keyof PipelineFilterState, value?: string) => void;
  onClearAll: () => void;
  totalResults: number;
}

export const PipelineActiveFilterChips: React.FC<PipelineActiveFilterChipsProps> = ({
  filters,
  onRemoveFilter,
  onClearAll,
  totalResults,
}) => {
  const chips: Array<{ key: keyof PipelineFilterState; label: string; value?: string }> = [];

  if (filters.search) {
    chips.push({ key: 'search', label: `Search: "${filters.search}"` });
  }

  if (filters.skills && filters.skills.length > 0) {
    filters.skills.forEach((s) => {
      chips.push({ key: 'skills', label: `Skill: ${s}`, value: s });
    });
  }

  if (filters.verifiedOnly) {
    chips.push({ key: 'verifiedOnly', label: 'Verified Skills Only' });
  }

  if (filters.cgpaMin) {
    chips.push({ key: 'cgpaMin', label: `CGPA ≥ ${filters.cgpaMin}` });
  }

  if (filters.cgpaMax) {
    chips.push({ key: 'cgpaMax', label: `CGPA ≤ ${filters.cgpaMax}` });
  }

  if (filters.gradYear) {
    chips.push({ key: 'gradYear', label: `Grad: ${filters.gradYear}` });
  }

  if (filters.college) {
    chips.push({ key: 'college', label: `College: ${filters.college}` });
  }

  if (filters.location) {
    chips.push({ key: 'location', label: `Loc: ${filters.location}` });
  }

  if (filters.minScore) {
    chips.push({ key: 'minScore', label: `Score ≥ ${filters.minScore}%` });
  }

  if (filters.maxScore) {
    chips.push({ key: 'maxScore', label: `Score ≤ ${filters.maxScore}%` });
  }

  if (filters.tags && filters.tags.length > 0) {
    filters.tags.forEach((t) => {
      chips.push({ key: 'tags', label: `Tag: ${t}`, value: t });
    });
  }

  if (chips.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
      <span className="text-xs font-bold text-slate-500">
        Showing <span className="font-extrabold text-slate-900">{totalResults}</span> matches:
      </span>

      {chips.map((chip, idx) => (
        <span
          key={`${chip.key}-${chip.value || idx}`}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-50 border border-indigo-200 text-[#4F46E5] text-xs font-bold shadow-2xs"
        >
          <span>{chip.label}</span>
          <button
            type="button"
            onClick={() => onRemoveFilter(chip.key, chip.value)}
            className="p-0.5 hover:bg-indigo-100 rounded-md cursor-pointer transition-colors"
            title="Remove filter"
            aria-label={`Remove filter ${chip.label}`}
          >
            <X className="w-3 h-3 text-[#4F46E5]" />
          </button>
        </span>
      ))}

      <button
        type="button"
        onClick={onClearAll}
        className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
      >
        <RotateCcw className="w-3 h-3" />
        <span>Clear all</span>
      </button>
    </div>
  );
};
