import React, { useState } from 'react';
import { X, Filter, RotateCcw, Check } from 'lucide-react';
import type { PipelineFilterState } from '../../../services/recruiterApiService';

interface PipelineFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: PipelineFilterState;
  onApplyFilters: (newFilters: PipelineFilterState) => void;
  onResetFilters: () => void;
  availableSkills?: string[];
  availableColleges?: string[];
  availableTags?: string[];
  pipelineStages: Array<{ id: string; label: string }>;
}

const COMMON_SKILLS = [
  'React.js',
  'TypeScript',
  'Node.js',
  'Go (Golang)',
  'Python',
  'Kubernetes',
  'Docker',
  'Terraform (IaC)',
  'PostgreSQL',
  'Redis Caching',
  'Apache Kafka',
  'PyTorch',
  'RAG & Vector Search',
  'Tailwind CSS',
  'Next.js',
];

const COMMON_COLLEGES = [
  'IIT Bombay',
  'IIT Delhi',
  'IIT Madras',
  'IIT Kharagpur',
  'IIT Roorkee',
  'BITS Pilani',
  'IIIT Hyderabad',
  'NIT Trichy',
  'NIT Calicut',
  'Delhi Technological University (DTU)',
  'RV College of Engineering',
  'PSG College of Technology',
  'COEP Technological University',
];

const COMMON_TAGS = [
  'Top 5%',
  'Top 1%',
  'Hackathon Winner',
  'Immediate Joiner',
  'GSoC Contributor',
  'Strong DS/Algo',
  'Frontend Star',
  'Core Contributor',
  'Published Research',
  'Cloud Certified',
];

export const PipelineFilterDrawer: React.FC<PipelineFilterDrawerProps> = ({
  isOpen,
  onClose,
  filters,
  onApplyFilters,
  onResetFilters,
  pipelineStages,
}) => {
  const [draft, setDraft] = useState<PipelineFilterState>({ ...filters });

  if (!isOpen) return null;

  const handleSkillToggle = (skill: string) => {
    const current = draft.skills || [];
    const updated = current.includes(skill)
      ? current.filter((s) => s !== skill)
      : [...current, skill];
    setDraft({ ...draft, skills: updated });
  };

  const handleTagToggle = (tag: string) => {
    const current = draft.tags || [];
    const updated = current.includes(tag)
      ? current.filter((t) => t !== tag)
      : [...current, tag];
    setDraft({ ...draft, tags: updated });
  };

  const handleStageToggle = (stageId: string) => {
    const currentStages = draft.stage ? draft.stage.split(',').filter(Boolean) : [];
    const updated = currentStages.includes(stageId)
      ? currentStages.filter((s) => s !== stageId)
      : [...currentStages, stageId];
    setDraft({ ...draft, stage: updated.join(',') });
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    onApplyFilters(draft);
    onClose();
  };

  const handleReset = () => {
    setDraft({});
    onResetFilters();
    onClose();
  };

  const selectedStages = draft.stage ? draft.stage.split(',').filter(Boolean) : [];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-50 text-[#4F46E5] rounded-xl">
                <Filter className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Pipeline Filters</h3>
                <p className="text-xs text-slate-500">Target specific candidate criteria</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/60 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Filter Body */}
          <form onSubmit={handleApply} className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Skills with Verified Only switch */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">Skills</label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={draft.verifiedOnly ?? false}
                    onChange={(e) => setDraft({ ...draft, verifiedOnly: e.target.checked })}
                    className="w-3.5 h-3.5 rounded text-[#4F46E5] border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>Verified Only</span>
                </label>
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-1 bg-slate-50 border border-slate-200 rounded-2xl">
                {COMMON_SKILLS.map((skill) => {
                  const active = (draft.skills || []).includes(skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => handleSkillToggle(skill)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        active
                          ? 'bg-[#4F46E5] text-white shadow-xs'
                          : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {active && <Check className="w-3 h-3" />}
                      <span>{skill}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CGPA Range */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800">CGPA Range (0 - 10)</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-slate-500 block mb-0.5">Min CGPA</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    placeholder="e.g. 8.0"
                    value={draft.cgpaMin ?? ''}
                    onChange={(e) => setDraft({ ...draft, cgpaMin: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block mb-0.5">Max CGPA</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    placeholder="e.g. 10.0"
                    value={draft.cgpaMax ?? ''}
                    onChange={(e) => setDraft({ ...draft, cgpaMax: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>
            </div>

            {/* Graduation Year */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800">Graduation Year</label>
              <div className="grid grid-cols-4 gap-2">
                {[2024, 2025, 2026, 2027].map((year) => {
                  const isSelected = draft.gradYear === year || draft.gradYear === String(year);
                  return (
                    <button
                      key={year}
                      type="button"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          gradYear: isSelected ? undefined : year,
                        })
                      }
                      className={`py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#4F46E5] text-white border-transparent'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {year}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* College / Institution */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800">College / Institution</label>
              <input
                type="text"
                placeholder="e.g. IIT, BITS, NIT, IIIT..."
                value={draft.college ?? ''}
                onChange={(e) => setDraft({ ...draft, college: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-indigo-100"
              />
              <div className="flex flex-wrap gap-1 mt-1">
                {COMMON_COLLEGES.slice(0, 5).map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setDraft({ ...draft, college: col })}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[10px] font-semibold cursor-pointer"
                  >
                    {col.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Assessment Score Range */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800">Assessment Score Range (%)</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-slate-500 block mb-0.5">Min Score</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="e.g. 70"
                    value={draft.minScore ?? ''}
                    onChange={(e) => setDraft({ ...draft, minScore: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block mb-0.5">Max Score</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="e.g. 100"
                    value={draft.maxScore ?? ''}
                    onChange={(e) => setDraft({ ...draft, maxScore: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>
            </div>

            {/* Candidate Tags */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800">Candidate Tags</label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_TAGS.map((tag) => {
                  const active = (draft.tags || []).includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleTagToggle(tag)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        active
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {active && <Check className="w-3 h-3" />}
                      <span>{tag}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stages Filter */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800">Pipeline Stages</label>
              <div className="grid grid-cols-2 gap-2">
                {pipelineStages.map((st) => {
                  const isChecked = selectedStages.includes(st.id);
                  return (
                    <label
                      key={st.id}
                      className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-indigo-50 border-indigo-200 text-[#4F46E5]'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleStageToggle(st.id)}
                        className="w-3.5 h-3.5 rounded text-[#4F46E5] border-slate-300 focus:ring-indigo-500"
                      />
                      <span className="truncate">{st.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </form>

          {/* Footer Actions */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset All
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="px-5 py-2 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
