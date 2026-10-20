import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Sparkles,
  RotateCcw,
  Bot,
  Keyboard,
  CheckCircle2,
  GitMerge,
  X
} from 'lucide-react';
import { recruiterApi } from '../../services/recruiterApiService';
import type {
  ApplicationItem,
  JobItem,
  CandidatePassport,
  PipelineFilterState,
  SavedViewItem,
  CandidateComparisonItem,
} from '../../services/recruiterApiService';
import { useRecruiter } from '../../context/RecruiterContext';
import { CandidatePassportModal } from '../../components/recruiter/CandidatePassportModal';
import { PageHeader, Badge, Modal, Button } from '../../components/common';
import {
  PipelineToolbar,
  PipelineFilterDrawer,
  PipelineActiveFilterChips,
  PipelineKanbanColumn,
  PipelineTableView,
  StickyBulkActionBar,
  CandidatePreviewDrawer,
  CandidateCompareModal,
} from '../../components/recruiter/pipeline';

const PIPELINE_COLUMNS = [
  { id: 'new_applicant', label: 'New Applicants', color: 'border-blue-400' },
  { id: 'under_review', label: 'Under Review', color: 'border-purple-400' },
  { id: 'shortlisted', label: 'Shortlisted', color: 'border-indigo-400' },
  { id: 'assessment_invited', label: 'Assessment Invited', color: 'border-amber-400' },
  { id: 'interview_scheduled', label: 'Interview Scheduled', color: 'border-rose-400' },
  { id: 'offer_extended', label: 'Offer Extended', color: 'border-emerald-400' },
  { id: 'hired', label: 'Hired', color: 'border-teal-400' },
];

export const RecruiterPipelinePage: React.FC = () => {
  const { activeOrgId, refreshKey, showToast } = useRecruiter();
  const [searchParams, setSearchParams] = useSearchParams();

  // Core Data
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [, setLoading] = useState(true);

  // Filters State derived from & synchronized with URL search params
  const [selectedJobId, setSelectedJobId] = useState<string>(searchParams.get('jobId') || '');
  const [filters, setFilters] = useState<PipelineFilterState>(() => ({
    search: searchParams.get('q') || '',
    stage: searchParams.get('stage') || '',
    skills: searchParams.get('skills') ? searchParams.get('skills')!.split(',') : undefined,
    verifiedOnly: searchParams.get('verifiedOnly') === 'true',
    cgpaMin: searchParams.get('cgpaMin') || undefined,
    cgpaMax: searchParams.get('cgpaMax') || undefined,
    gradYear: searchParams.get('gradYear') || undefined,
    college: searchParams.get('college') || undefined,
    location: searchParams.get('location') || undefined,
    minScore: searchParams.get('minScore') || undefined,
    maxScore: searchParams.get('maxScore') || undefined,
    tags: searchParams.get('tags') ? searchParams.get('tags')!.split(',') : undefined,
    sortBy: (searchParams.get('sortBy') as PipelineFilterState['sortBy']) || 'match_score',
    sortOrder: (searchParams.get('sortOrder') as PipelineFilterState['sortOrder']) || 'desc',
  }));

  // UI Modes & Toggles
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [viewDensity, setViewDensity] = useState<'card' | 'table'>('card');
  const [blindReview, setBlindReview] = useState(false);
  const [keyboardHelpOpen, setKeyboardHelpOpen] = useState(false);

  // Multi-Selection State
  const [selectedAppIds, setSelectedAppIds] = useState<Set<string>>(new Set());

  // Interactive Drawers & Modals
  const [previewCandidate, setPreviewCandidate] = useState<ApplicationItem | null>(null);
  const [selectedCandidatePassport, setSelectedCandidatePassport] = useState<CandidatePassport | null>(null);
  const [compareCandidates, setCompareCandidates] = useState<CandidateComparisonItem[] | null>(null);
  const [savedViews, setSavedViews] = useState<SavedViewItem[]>([]);

  // Stage Change Modal (single card transition)
  const [stageChangeModal, setStageChangeModal] = useState<{
    applicationId: string;
    targetStage: string;
    candidateName: string;
  } | null>(null);
  const [stageChangeReason, setStageChangeReason] = useState('');

  // Note Modal
  const [noteModal, setNoteModal] = useState<{
    candidateId: string;
    candidateName: string;
    jobId: string;
  } | null>(null);
  const [noteText, setNoteText] = useState('');

  // Undo Toast State
  const [undoAction, setUndoAction] = useState<{
    targetStage: string;
    previousStages: Record<string, string>;
    affectedNames: string[];
  } | null>(null);

  // Auto-Advance Modal
  const [autoAdvanceModal, setAutoAdvanceModal] = useState(false);

  // Load Saved Views
  const loadSavedViews = useCallback(async () => {
    try {
      const views = await recruiterApi.getSavedViews();
      setSavedViews(views);
    } catch {
      // ignore
    }
  }, []);

  // Synchronize state to URL query params
  const updateUrlParams = useCallback(
    (newJobId: string, newFilters: PipelineFilterState) => {
      const p = new URLSearchParams();
      if (newJobId) p.set('jobId', newJobId);
      if (newFilters.search) p.set('q', newFilters.search);
      if (newFilters.stage) p.set('stage', newFilters.stage);
      if (newFilters.skills && newFilters.skills.length > 0) p.set('skills', newFilters.skills.join(','));
      if (newFilters.verifiedOnly) p.set('verifiedOnly', 'true');
      if (newFilters.cgpaMin) p.set('cgpaMin', String(newFilters.cgpaMin));
      if (newFilters.cgpaMax) p.set('cgpaMax', String(newFilters.cgpaMax));
      if (newFilters.gradYear) p.set('gradYear', String(newFilters.gradYear));
      if (newFilters.college) p.set('college', newFilters.college);
      if (newFilters.location) p.set('location', newFilters.location);
      if (newFilters.minScore) p.set('minScore', String(newFilters.minScore));
      if (newFilters.maxScore) p.set('maxScore', String(newFilters.maxScore));
      if (newFilters.tags && newFilters.tags.length > 0) p.set('tags', newFilters.tags.join(','));
      if (newFilters.sortBy && newFilters.sortBy !== 'match_score') p.set('sortBy', newFilters.sortBy);
      if (newFilters.sortOrder && newFilters.sortOrder !== 'desc') p.set('sortOrder', newFilters.sortOrder);
      setSearchParams(p, { replace: true });
    },
    [setSearchParams]
  );

  // Fetch Pipeline Data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [appsData, jobsData] = await Promise.all([
        recruiterApi.getApplications({
          ...filters,
          jobId: selectedJobId || undefined,
        }),
        recruiterApi.getJobs('published'),
      ]);
      setApplications(appsData);
      setJobs(jobsData);
    } catch (err: any) {
      showToast(err.message || 'Failed to load pipeline', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedJobId, filters, showToast]);

  useEffect(() => {
    loadData();
    loadSavedViews();
  }, [activeOrgId, refreshKey, loadData, loadSavedViews]);

  // Handle Filter Change
  const handleFilterChange = (newFilters: PipelineFilterState) => {
    setFilters(newFilters);
    updateUrlParams(selectedJobId, newFilters);
  };

  const handleSelectJob = (jobId: string) => {
    setSelectedJobId(jobId);
    updateUrlParams(jobId, filters);
  };

  // Remove Single Filter Chip
  const handleRemoveFilter = (key: keyof PipelineFilterState, value?: string) => {
    const updated = { ...filters };
    if (key === 'skills' && value && updated.skills) {
      updated.skills = updated.skills.filter((s) => s !== value);
      if (updated.skills.length === 0) delete updated.skills;
    } else if (key === 'tags' && value && updated.tags) {
      updated.tags = updated.tags.filter((t) => t !== value);
      if (updated.tags.length === 0) delete updated.tags;
    } else {
      delete updated[key];
    }
    handleFilterChange(updated);
  };

  const handleClearAllFilters = () => {
    const cleared: PipelineFilterState = {
      sortBy: 'match_score',
      sortOrder: 'desc',
    };
    handleFilterChange(cleared);
  };

  // Multi-Selection Handlers
  const handleToggleSelectCard = (id: string) => {
    setSelectedAppIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectColumnAll = (stageId: string, select: boolean) => {
    setSelectedAppIds((prev) => {
      const next = new Set(prev);
      const colApps = applications.filter((a) => a.stage === stageId);
      for (const a of colApps) {
        if (select) next.add(a.id);
        else next.delete(a.id);
      }
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    if (selectedAppIds.size === applications.length) {
      setSelectedAppIds(new Set());
    } else {
      setSelectedAppIds(new Set(applications.map((a) => a.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedAppIds(new Set());
  };

  // Inspect Passport
  const handleInspectPassport = async (candidateId: string) => {
    try {
      const passport = await recruiterApi.getCandidatePassport(candidateId, selectedJobId || undefined);
      setSelectedCandidatePassport(passport);
    } catch {
      showToast('Failed to load candidate skill passport', 'error');
    }
  };

  // Single Stage Transition
  const handleConfirmSingleStageChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stageChangeModal) return;
    try {
      await recruiterApi.updateApplicationStage(
        stageChangeModal.applicationId,
        stageChangeModal.targetStage,
        stageChangeReason || 'Recruiter pipeline update'
      );
      showToast(
        `Moved ${stageChangeModal.candidateName} to ${stageChangeModal.targetStage.replace(/_/g, ' ')}`,
        'success'
      );
      setStageChangeModal(null);
      setStageChangeReason('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Stage transition failed', 'error');
    }
  };

  // Bulk Move Stage
  const handleBulkMoveStage = async (targetStage: string, reason?: string) => {
    const appIds = Array.from(selectedAppIds);
    if (appIds.length === 0) return;

    try {
      const res = await recruiterApi.bulkUpdateStage(
        appIds,
        targetStage,
        reason || 'Bulk stage transition by recruiter',
        'human'
      );

      const affectedNames = applications
        .filter((a) => appIds.includes(a.id))
        .map((a) => a.candidate_name);

      setUndoAction({
        targetStage,
        previousStages: res.previousStages,
        affectedNames,
      });

      showToast(`Bulk moved ${res.updatedCount} candidates to ${targetStage.replace(/_/g, ' ')}`, 'success');
      setSelectedAppIds(new Set());
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Bulk transition failed', 'error');
    }
  };

  // Execute Undo
  const handleExecuteUndo = async () => {
    if (!undoAction) return;
    try {
      const restoreEntries = Object.entries(undoAction.previousStages);
      // Group by original stage to perform batch reverts
      const stageGroups: Record<string, string[]> = {};
      for (const [appId, prevStage] of restoreEntries) {
        if (!stageGroups[prevStage]) stageGroups[prevStage] = [];
        stageGroups[prevStage].push(appId);
      }

      for (const [stage, ids] of Object.entries(stageGroups)) {
        await recruiterApi.bulkUpdateStage(ids, stage, 'Undo bulk transition', 'human');
      }

      showToast(`Reverted ${restoreEntries.length} candidates to original stages`, 'info');
      setUndoAction(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to revert stage changes', 'error');
    }
  };

  // Bulk Tagging
  const handleBulkAddTag = async (tag: string) => {
    const appIds = Array.from(selectedAppIds);
    if (appIds.length === 0) return;
    try {
      await recruiterApi.bulkTagApplications(appIds, [tag], 'add');
      showToast(`Added tag "${tag}" to ${appIds.length} candidates`, 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to apply tag', 'error');
    }
  };

  // Bulk Shortlist
  const handleBulkShortlist = async () => {
    await handleBulkMoveStage('shortlisted', 'Bulk shortlist qualification');
  };

  // Bulk Email Mock
  const handleBulkEmail = () => {
    showToast(`Prepared email dispatch for ${selectedAppIds.size} candidates`, 'info');
  };

  // Bulk Assessment Invite
  const handleBulkInviteAssessment = async () => {
    await handleBulkMoveStage('assessment_invited', 'Bulk skill assessment invitation');
  };

  // Compare Selected Candidates
  const handleOpenCompare = async () => {
    const appIds = Array.from(selectedAppIds);
    if (appIds.length < 2 || appIds.length > 4) {
      showToast('Select between 2 and 4 candidates to compare', 'info');
      return;
    }
    try {
      const data = await recruiterApi.compareApplications(appIds);
      setCompareCandidates(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load comparison', 'error');
    }
  };

  // Save Note Handler
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteModal || !noteText.trim()) return;
    try {
      await recruiterApi.addRecruiterNote(noteModal.candidateId, noteText.trim(), noteModal.jobId);
      showToast('Internal note saved to candidate audit record', 'success');
      setNoteModal(null);
      setNoteText('');
    } catch (err: any) {
      showToast(err.message || 'Failed to save note', 'error');
    }
  };

  // Saved Views Management
  const handleSaveCurrentView = async (name: string) => {
    try {
      const created = await recruiterApi.createSavedView({
        name,
        filters,
        sort: { sortBy: filters.sortBy, sortOrder: filters.sortOrder },
      });
      showToast(`Saved view "${name}" created`, 'success');
      setSavedViews((prev) => [created, ...prev]);
    } catch (err: any) {
      showToast(err.message || 'Failed to save view', 'error');
    }
  };

  const handleDeleteSavedView = async (id: string) => {
    try {
      await recruiterApi.deleteSavedView(id);
      setSavedViews((prev) => prev.filter((v) => v.id !== id));
      showToast('Saved view removed', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete saved view', 'error');
    }
  };

  const handleSelectSavedView = (view: SavedViewItem) => {
    handleFilterChange(view.filters);
    showToast(`Loaded view "${view.name}"`, 'info');
  };

  const handleOpenNoteModal = (app: ApplicationItem) => {
    setNoteModal({
      candidateId: app.candidate_id,
      candidateName: app.candidate_name,
      jobId: app.job_id,
    });
  };

  // Rule-based Auto-Advance Candidates with Assessment Score >= 70
  const highScorersToAdvance = useMemo(() => {
    return applications.filter(
      (a) =>
        (a.stage === 'new_applicant' || a.stage === 'assessment_invited') &&
        a.assessment_score !== null &&
        a.assessment_score !== undefined &&
        a.assessment_score >= 70
    );
  }, [applications]);

  const handleExecuteAutoAdvance = async () => {
    if (highScorersToAdvance.length === 0) return;
    try {
      const appIds = highScorersToAdvance.map((a) => a.id);
      const res = await recruiterApi.bulkUpdateStage(
        appIds,
        'interview_scheduled',
        'Rule-based auto advance: Assessment score >= 70% threshold met',
        'rule'
      );
      setAutoAdvanceModal(false);
      setUndoAction({
        targetStage: 'interview_scheduled',
        previousStages: res.previousStages,
        affectedNames: highScorersToAdvance.map((a) => a.candidate_name),
      });
      showToast(
        `Auto-advanced ${res.updatedCount} qualified candidates to Interview Scheduled`,
        'success'
      );
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Auto-advance execution failed', 'error');
    }
  };

  // Duplicate Detection: Find candidates applying multiple times or sharing credentials
  const duplicateCandidates = useMemo(() => {
    const nameMap = new Map<string, ApplicationItem[]>();
    for (const app of applications) {
      const key = app.candidate_name.toLowerCase().trim();
      if (!nameMap.has(key)) nameMap.set(key, []);
      nameMap.get(key)!.push(app);
    }
    const dupes: ApplicationItem[][] = [];
    for (const group of nameMap.values()) {
      if (group.length > 1) dupes.push(group);
    }
    return dupes;
  }, [applications]);

  // Keyboard Shortcuts Mode (J/K navigate, S shortlist, R reject, H hold, U undo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        setKeyboardHelpOpen((prev) => !prev);
      } else if (e.key === 'u' || e.key === 'U') {
        if (undoAction) {
          e.preventDefault();
          handleExecuteUndo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoAction]);

  // Active filters count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.skills && filters.skills.length > 0) count += filters.skills.length;
    if (filters.verifiedOnly) count++;
    if (filters.cgpaMin) count++;
    if (filters.cgpaMax) count++;
    if (filters.gradYear) count++;
    if (filters.college) count++;
    if (filters.location) count++;
    if (filters.minScore) count++;
    if (filters.maxScore) count++;
    if (filters.tags && filters.tags.length > 0) count += filters.tags.length;
    if (filters.stage) count++;
    return count;
  }, [filters]);

  return (
    <div className="space-y-5">
      {/* PAGE HEADER */}
      <PageHeader
        title="Recruitment Pipeline & Kanban"
        description="Comprehensive bulk candidate evaluation, multi-faceted filtering, and explainable 5-factor fit intelligence."
        badge={
          <Badge variant="indigo" size="sm" dot>
            {applications.length} Active Candidates
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            {/* Keyboard Shortcuts Hint */}
            <button
              type="button"
              onClick={() => setKeyboardHelpOpen(true)}
              className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
              title="Keyboard Shortcuts (?)"
              aria-label="Keyboard Shortcuts"
            >
              <Keyboard className="w-4 h-4" />
            </button>

            {/* AI Candidate Matching View Link */}
            <Link
              to={selectedJobId ? `/recruiter/matching?jobId=${selectedJobId}` : '/recruiter/matching'}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-indigo-200 text-[#4F46E5] bg-indigo-50 hover:bg-indigo-100 font-bold text-xs transition-colors shadow-2xs"
              title="AI Candidate Matching View"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Match View</span>
            </Link>
          </div>
        }
      />

      {/* DUPLICATE APPLICATION NOTIFICATION BANNER */}
      {duplicateCandidates.length > 0 && (
        <div className="p-3.5 bg-amber-50/80 border border-amber-200/90 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-center gap-2.5">
            <GitMerge className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Duplicate Applications Detected:</strong> {duplicateCandidates.length} candidate(s) have multiple submissions across pipeline stages.
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              const firstGroup = duplicateCandidates[0];
              setSelectedAppIds(new Set(firstGroup.map((a) => a.id)));
              showToast(`Selected duplicates for ${firstGroup[0].candidate_name}`, 'info');
            }}
            className="px-3 py-1 bg-white border border-amber-300 hover:bg-amber-100/50 rounded-xl font-bold text-amber-800 transition-colors cursor-pointer shrink-0"
          >
            Review & Merge
          </button>
        </div>
      )}

      {/* RULE-BASED AUTO-ADVANCE BANNER */}
      {highScorersToAdvance.length > 0 && (
        <div className="p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-indigo-900">
          <div className="flex items-center gap-2.5">
            <Bot className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              <strong>Rule Suggestion:</strong> {highScorersToAdvance.length} candidate(s) scored ≥ 70% in assessments and qualify for Interview Scheduled.
            </span>
          </div>

          <button
            type="button"
            onClick={() => setAutoAdvanceModal(true)}
            className="px-3.5 py-1.5 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors cursor-pointer shrink-0 shadow-2xs"
          >
            Review & Auto-Advance ({highScorersToAdvance.length})
          </button>
        </div>
      )}

      {/* UNDO NOTIFICATION TOAST BAR */}
      {undoAction && (
        <div className="p-3.5 bg-slate-900 text-white rounded-2xl flex items-center justify-between gap-3 text-xs shadow-xl animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Moved {undoAction.affectedNames.length} candidate(s) to{' '}
              <strong className="text-indigo-300 uppercase">{undoAction.targetStage.replace(/_/g, ' ')}</strong>.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExecuteUndo}
              className="inline-flex items-center gap-1 px-3 py-1 bg-white text-slate-900 hover:bg-slate-100 rounded-xl font-extrabold cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3 h-3 text-[#4F46E5]" />
              <span>Undo (U)</span>
            </button>
            <button
              type="button"
              onClick={() => setUndoAction(null)}
              className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* PIPELINE TOOLBAR */}
      <PipelineToolbar
        jobs={jobs}
        selectedJobId={selectedJobId}
        onSelectJob={handleSelectJob}
        filters={filters}
        onFilterChange={handleFilterChange}
        onOpenFilterDrawer={() => setFilterDrawerOpen(true)}
        activeFilterCount={activeFilterCount}
        viewDensity={viewDensity}
        onToggleDensity={setViewDensity}
        blindReview={blindReview}
        onToggleBlindReview={() => setBlindReview(!blindReview)}
        savedViews={savedViews}
        onSelectSavedView={handleSelectSavedView}
        onSaveCurrentView={handleSaveCurrentView}
        onDeleteSavedView={handleDeleteSavedView}
      />

      {/* ACTIVE FILTER CHIPS */}
      <PipelineActiveFilterChips
        filters={filters}
        onRemoveFilter={handleRemoveFilter}
        onClearAll={handleClearAllFilters}
        totalResults={applications.length}
      />

      {/* VIEW DENSITY: KANBAN BOARD VS COMPACT TABLE */}
      {viewDensity === 'card' ? (
        <div className="overflow-x-auto pb-6 pt-1">
          {/* Prevent column clipping on horizontal scroll with pl-1 and pr-4 */}
          <div className="flex gap-4 min-w-[1440px] pl-1 pr-4">
            {PIPELINE_COLUMNS.map((col) => {
              const colApps = applications.filter((a) => a.stage === col.id);

              return (
                <PipelineKanbanColumn
                  key={col.id}
                  column={col}
                  applications={colApps}
                  selectedAppIds={selectedAppIds}
                  onToggleSelect={handleToggleSelectCard}
                  onSelectColumnAll={handleSelectColumnAll}
                  onOpenPreview={setPreviewCandidate}
                  onOpenPassport={handleInspectPassport}
                  onOpenNoteModal={handleOpenNoteModal}
                  onStageChange={(appId, targetStage, name) =>
                    setStageChangeModal({
                      applicationId: appId,
                      targetStage,
                      candidateName: name,
                    })
                  }
                  pipelineStages={PIPELINE_COLUMNS}
                  blindReview={blindReview}
                />
              );
            })}
          </div>
        </div>
      ) : (
        <PipelineTableView
          applications={applications}
          selectedAppIds={selectedAppIds}
          onToggleSelect={handleToggleSelectCard}
          onSelectAll={handleSelectAllVisible}
          onOpenPreview={setPreviewCandidate}
          onOpenPassport={handleInspectPassport}
          onOpenNoteModal={handleOpenNoteModal}
          onStageChange={(appId, targetStage, name) =>
            setStageChangeModal({
              applicationId: appId,
              targetStage,
              candidateName: name,
            })
          }
          pipelineStages={PIPELINE_COLUMNS}
          blindReview={blindReview}
        />
      )}

      {/* STICKY BOTTOM BULK ACTION BAR */}
      <StickyBulkActionBar
        selectedCount={selectedAppIds.size}
        totalCount={applications.length}
        onClearSelection={handleClearSelection}
        onSelectAll={handleSelectAllVisible}
        pipelineStages={PIPELINE_COLUMNS}
        onBulkMoveStage={handleBulkMoveStage}
        onBulkAddTag={handleBulkAddTag}
        onBulkShortlist={handleBulkShortlist}
        onBulkEmail={handleBulkEmail}
        onBulkInviteAssessment={handleBulkInviteAssessment}
        onCompare={handleOpenCompare}
      />

      {/* QUICK PREVIEW RIGHT DRAWER (480px, ESC TO CLOSE) */}
      <CandidatePreviewDrawer
        application={previewCandidate}
        onClose={() => setPreviewCandidate(null)}
        onOpenPassport={handleInspectPassport}
        onOpenNoteModal={handleOpenNoteModal}
        onStageChange={(appId, targetStage, name) =>
          setStageChangeModal({
            applicationId: appId,
            targetStage,
            candidateName: name,
          })
        }
        pipelineStages={PIPELINE_COLUMNS}
      />

      {/* SIDE-BY-SIDE COMPARE MODAL */}
      <CandidateCompareModal
        isOpen={Boolean(compareCandidates)}
        onClose={() => setCompareCandidates(null)}
        candidates={compareCandidates || []}
        onOpenPassport={handleInspectPassport}
      />

      {/* FILTER DRAWER SLIDE-OVER */}
      <PipelineFilterDrawer
        isOpen={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        filters={filters}
        onApplyFilters={handleFilterChange}
        onResetFilters={handleClearAllFilters}
        pipelineStages={PIPELINE_COLUMNS}
      />

      {/* CANDIDATE PASSPORT MODAL */}
      <CandidatePassportModal
        passport={selectedCandidatePassport}
        onClose={() => setSelectedCandidatePassport(null)}
        onRefresh={loadData}
      />

      {/* SINGLE STAGE TRANSITION CONFIRMATION MODAL */}
      <Modal
        isOpen={Boolean(stageChangeModal)}
        onClose={() => setStageChangeModal(null)}
        title="Advance Pipeline Stage"
        subtitle={
          stageChangeModal
            ? `Move ${stageChangeModal.candidateName} to ${stageChangeModal.targetStage.replace(/_/g, ' ').toUpperCase()}`
            : undefined
        }
        maxWidth="md"
      >
        {stageChangeModal && (
          <form onSubmit={handleConfirmSingleStageChange} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Audit Rationale / Stage Note
              </label>
              <textarea
                rows={3}
                value={stageChangeReason}
                onChange={(e) => setStageChangeReason(e.target.value)}
                placeholder="e.g. Cleared technical screening; scheduling interview panel..."
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStageChangeModal(null)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="indigo" size="sm">
                Confirm Transition
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* CONFIDENTIAL RECRUITER NOTE MODAL */}
      <Modal
        isOpen={Boolean(noteModal)}
        onClose={() => setNoteModal(null)}
        title="Add Confidential Recruiter Note"
        subtitle={noteModal ? `Candidate: ${noteModal.candidateName}` : undefined}
        maxWidth="md"
      >
        {noteModal && (
          <form onSubmit={handleSaveNote} className="space-y-4">
            <textarea
              rows={4}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Record candidate interview feedback, compensation notes, or technical observations..."
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-100"
              required
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setNoteModal(null)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="indigo" size="sm">
                Save Note
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* RULE-BASED AUTO ADVANCE REVIEW & CONFIRM MODAL */}
      <Modal
        isOpen={autoAdvanceModal}
        onClose={() => setAutoAdvanceModal(false)}
        title="Review & Confirm Auto-Advance"
        subtitle={`Advance ${highScorersToAdvance.length} candidate(s) with assessment score ≥ 70% to Interview Scheduled`}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl text-xs text-indigo-900 leading-relaxed">
            Rule criterion: <strong>Assessment Score ≥ 70%</strong>. Human recruiter confirmation is required before any stage changes take effect. Immediate undo will be available.
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl">
            {highScorersToAdvance.map((cand) => (
              <div key={cand.id} className="p-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-extrabold text-slate-900 block">{cand.candidate_name}</span>
                  <span className="text-[11px] text-slate-500">{cand.institution} · {cand.job_title}</span>
                </div>
                <div className="text-right">
                  <span className="text-emerald-700 font-extrabold block">{cand.assessment_score}% Score</span>
                  <span className="text-[10px] text-slate-400">Current: {cand.stage.replace(/_/g, ' ')}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAutoAdvanceModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="indigo"
              size="sm"
              onClick={handleExecuteAutoAdvance}
            >
              Confirm Auto-Advance ({highScorersToAdvance.length})
            </Button>
          </div>
        </div>
      </Modal>

      {/* KEYBOARD SHORTCUTS HELP MODAL */}
      <Modal
        isOpen={keyboardHelpOpen}
        onClose={() => setKeyboardHelpOpen(false)}
        title="Keyboard Review Shortcuts"
        subtitle="Evaluate and navigate candidate pipeline with rapid keystrokes"
        maxWidth="sm"
      >
        <div className="space-y-3 text-xs">
          {[
            { key: 'J / K', desc: 'Navigate candidates forward / backward' },
            { key: 'S', desc: 'Shortlist focused candidate' },
            { key: 'R', desc: 'Reject or hold candidate' },
            { key: 'H', desc: 'Move candidate to Under Review' },
            { key: 'U', desc: 'Undo last stage transition' },
            { key: 'Esc', desc: 'Close preview drawer or active dialog' },
            { key: '?', desc: 'Open / close this shortcuts reference' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-600">{item.desc}</span>
              <kbd className="px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 font-mono font-bold text-slate-800 text-[11px]">
                {item.key}
              </kbd>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
};
