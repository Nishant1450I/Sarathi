import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Sparkles,
  Users,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  GitCompare,
  RotateCw,
  Search,
  LayoutGrid,
  List,
  Eye,
  Star,
  ShieldCheck,
  Check,
  X
} from 'lucide-react';
import { recruiterApi } from '../../services/recruiterApiService';
import type {
  JobItem,
  CandidateJobMatchItem,
  JobComparisonResult,
  CandidatePassport
} from '../../services/recruiterApiService';
import { useRecruiter } from '../../context/RecruiterContext';
import { CandidatePassportModal } from '../../components/recruiter/CandidatePassportModal';
import { PageHeader, Card, Badge, Button, Modal, EmptyState } from '../../components/common';

export const RecruiterCandidateMatchingPage: React.FC = () => {
  const { activeOrgId, refreshKey, showToast } = useRecruiter();
  const [searchParams, setSearchParams] = useSearchParams();

  // Navigation state
  const [activeTab, setActiveTab] = useState<'dashboard' | 'compare' | 'shortlist'>('dashboard');

  // Job selection
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [loadingJobs, setLoadingJobs] = useState<boolean>(true);

  // Match dashboard data
  const [candidates, setCandidates] = useState<CandidateJobMatchItem[]>([]);
  const [metrics, setMetrics] = useState({
    totalApplicants: 0,
    shortlistedCount: 0,
    avgMatchScore: 0,
    topMatchScore: 0,
    aiProvider: 'rule_based',
  });
  const [loadingCandidates, setLoadingCandidates] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [minScoreFilter, setMinScoreFilter] = useState<number>(0);
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [selectedSkillFilter, setSelectedSkillFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('match_score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Candidate comparison state
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [comparisonResult, setComparisonResult] = useState<JobComparisonResult | null>(null);
  const [loadingComparison, setLoadingComparison] = useState<boolean>(false);

  // Shortlisted candidates review tab state
  const [shortlistedCandidates, setShortlistedCandidates] = useState<any[]>([]);
  const [loadingShortlisted, setLoadingShortlisted] = useState<boolean>(false);

  // Modals state
  const [selectedPassport, setSelectedPassport] = useState<CandidatePassport | null>(null);
  const [aiInsightsCandidate, setAiInsightsCandidate] = useState<CandidateJobMatchItem | null>(null);

  // Shortlist action modal
  const [shortlistModal, setShortlistModal] = useState<{
    candidate: CandidateJobMatchItem | null;
    reason: string;
    note: string;
    submitting: boolean;
  }>({
    candidate: null,
    reason: '',
    note: '',
    submitting: false,
  });

  // Stage change modal
  const [stageChangeModal, setStageChangeModal] = useState<{
    applicationId: string;
    candidateName: string;
    targetStage: string;
    reason: string;
    submitting: boolean;
  } | null>(null);

  // 1. Load active published jobs
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoadingJobs(true);
        const data = await recruiterApi.getJobs('published');
        setJobs(data);
        const paramJobId = searchParams.get('jobId');
        if (paramJobId && data.some(j => j.id === paramJobId)) {
          setSelectedJobId(paramJobId);
        } else if (data.length > 0) {
          setSelectedJobId(data[0].id);
        }
      } catch {
        showToast('Failed to load published job postings', 'error');
      } finally {
        setLoadingJobs(false);
      }
    };
    fetchJobs();
  }, [activeOrgId, refreshKey, searchParams, showToast]);

  // Sync selected job to URL query params
  const handleJobSelect = (jobId: string) => {
    setSelectedJobId(jobId);
    setSearchParams(jobId ? { jobId } : {});
    setSelectedCandidateIds([]);
  };

  // 2. Load candidates matching data for selected job
  const loadJobCandidates = async (forceRefresh: boolean = false) => {
    if (!selectedJobId) {
      setCandidates([]);
      return;
    }

    try {
      if (forceRefresh) setIsRefreshing(true);
      else setLoadingCandidates(true);

      const res = await recruiterApi.getJobCandidateMatches(selectedJobId, {
        minScore: minScoreFilter > 0 ? minScoreFilter : undefined,
        stage: stageFilter === 'all' ? undefined : stageFilter,
        search: searchQuery || undefined,
        requiredSkill: selectedSkillFilter || undefined,
        sortBy,
        sortOrder,
        forceRefresh,
      });

      setCandidates(res.candidates);
      setMetrics(res.metrics);
      if (forceRefresh) {
        showToast('Candidate match scores re-evaluated successfully', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to evaluate candidate matches', 'error');
    } finally {
      setLoadingCandidates(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (selectedJobId) {
      loadJobCandidates();
    }
  }, [selectedJobId, minScoreFilter, stageFilter, selectedSkillFilter, sortBy, sortOrder, refreshKey]);

  // 3. Load comparison data when switching to comparison tab
  useEffect(() => {
    if (activeTab === 'compare' && selectedJobId && selectedCandidateIds.length >= 2) {
      const fetchComparison = async () => {
        try {
          setLoadingComparison(true);
          const result = await recruiterApi.compareJobCandidates(selectedJobId, selectedCandidateIds);
          setComparisonResult(result);
        } catch (err: any) {
          showToast(err.message || 'Failed to compare candidates', 'error');
        } finally {
          setLoadingComparison(false);
        }
      };
      fetchComparison();
    }
  }, [activeTab, selectedJobId, selectedCandidateIds, showToast]);

  // 4. Load shortlisted candidates when switching to shortlist review tab
  useEffect(() => {
    if (activeTab === 'shortlist' && selectedJobId) {
      const fetchShortlisted = async () => {
        try {
          setLoadingShortlisted(true);
          const list = await recruiterApi.getJobShortlistedCandidates(selectedJobId);
          setShortlistedCandidates(list);
        } catch (err: any) {
          showToast(err.message || 'Failed to load shortlisted candidates', 'error');
        } finally {
          setLoadingShortlisted(false);
        }
      };
      fetchShortlisted();
    }
  }, [activeTab, selectedJobId, showToast]);

  // Current selected job object
  const activeJob = useMemo(() => jobs.find(j => j.id === selectedJobId), [jobs, selectedJobId]);

  // Multi-select for side-by-side comparison
  const toggleCandidateSelection = (candidateId: string) => {
    setSelectedCandidateIds(prev => {
      if (prev.includes(candidateId)) {
        return prev.filter(id => id !== candidateId);
      }
      if (prev.length >= 4) {
        showToast('Maximum 4 candidates can be compared side-by-side', 'info');
        return prev;
      }
      return [...prev, candidateId];
    });
  };

  // Inspect full passport modal
  const handleInspectPassport = async (candidateId: string) => {
    try {
      const passport = await recruiterApi.getCandidatePassport(candidateId, selectedJobId || undefined);
      setSelectedPassport(passport);
    } catch (err: any) {
      showToast(err.message || 'Failed to open candidate passport', 'error');
    }
  };

  // Open shortlisting modal
  const openShortlistModal = (candidate: CandidateJobMatchItem) => {
    setShortlistModal({
      candidate,
      reason: `Demonstrates ${candidate.matchScore}% role alignment with ${candidate.matchedRequired.length} verified required technical competencies.`,
      note: '',
      submitting: false,
    });
  };

  // Confirm shortlisting
  const handleConfirmShortlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shortlistModal.candidate || !shortlistModal.reason.trim()) {
      showToast('Please provide a reason for the shortlisting decision', 'error');
      return;
    }

    try {
      setShortlistModal(prev => ({ ...prev, submitting: true }));
      await recruiterApi.shortlistCandidateWithReason({
        applicationId: shortlistModal.candidate.applicationId,
        candidateId: shortlistModal.candidate.candidateId,
        jobId: selectedJobId,
        reason: shortlistModal.reason.trim(),
        note: shortlistModal.note.trim() || undefined,
      });

      showToast(`${shortlistModal.candidate.candidateName} marked as Shortlisted`, 'success');
      setShortlistModal({ candidate: null, reason: '', note: '', submitting: false });
      loadJobCandidates();
    } catch (err: any) {
      showToast(err.message || 'Failed to shortlist candidate', 'error');
      setShortlistModal(prev => ({ ...prev, submitting: false }));
    }
  };

  // Confirm stage change
  const handleConfirmStageChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stageChangeModal) return;

    try {
      setStageChangeModal(prev => prev ? { ...prev, submitting: true } : null);
      await recruiterApi.updateApplicationStage(
        stageChangeModal.applicationId,
        stageChangeModal.targetStage,
        stageChangeModal.reason.trim() || undefined
      );

      showToast(`Application moved to ${stageChangeModal.targetStage.replace('_', ' ')}`, 'success');
      setStageChangeModal(null);
      loadJobCandidates();
    } catch (err: any) {
      showToast(err.message || 'Stage transition failed', 'error');
      setStageChangeModal(prev => prev ? { ...prev, submitting: false } : null);
    }
  };

  // Score badge helper
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-700 bg-emerald-50 border-emerald-200 ring-emerald-500/20';
    if (score >= 65) return 'text-indigo-700 bg-indigo-50 border-indigo-200 ring-indigo-500/20';
    if (score >= 45) return 'text-amber-700 bg-amber-50 border-amber-200 ring-amber-500/20';
    return 'text-slate-700 bg-slate-100 border-slate-200 ring-slate-500/20';
  };

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <PageHeader
        title="AI Candidate–Job Matching & Shortlisting"
        description="Explainable candidate-job compatibility scoring, verified competency evidence, and human-in-the-loop shortlisting workflows."
        badge={
          <Badge variant="indigo" size="sm" dot>
            {metrics.aiProvider === 'gemini' ? 'Gemini AI Active' : 'Explainable Rule-Based Engine'}
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="md"
              icon={<RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
              onClick={() => loadJobCandidates(true)}
              disabled={isRefreshing || !selectedJobId}
              id="recalculate-matches-btn"
            >
              Re-evaluate Matches
            </Button>
          </div>
        }
      />

      {/* JOB SELECTOR & KEY REQUIREMENTS CARD */}
      <Card className="p-5 sm:p-6 bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <label htmlFor="job-selector" className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Active Job Posting *
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <select
                id="job-selector"
                value={selectedJobId}
                onChange={(e) => handleJobSelect(e.target.value)}
                disabled={loadingJobs}
                className="w-full sm:w-80 md:w-96 p-2.5 rounded-xl border border-slate-200 text-xs font-black text-slate-900 bg-slate-50 hover:bg-white focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              >
                {jobs.map(job => (
                  <option key={job.id} value={job.id}>
                    {job.title} — {job.department} ({job.applicant_count || 0} applicants)
                  </option>
                ))}
              </select>

              {activeJob && (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="indigo" size="sm">
                    {activeJob.department}
                  </Badge>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-semibold text-slate-700 capitalize">
                    {activeJob.experience_level} Level
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-semibold text-slate-700 capitalize">
                    {activeJob.work_arrangement}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                    {activeJob.status}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Fairness assurance tag */}
          <div className="flex items-center gap-2 p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-900">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
            <div className="text-[11px] leading-tight">
              <span className="font-bold">Fair Matching Verified:</span> Scores strictly evaluate verifiable technical competencies, assessments, and work proof without demographic signals.
            </div>
          </div>
        </div>
      </Card>

      {/* METRICS KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Applicants</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">{metrics.totalApplicants}</p>
          <p className="text-[11px] text-slate-500 font-medium mt-1">Submitted for active role</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Top Match Score</span>
            <Sparkles className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-600">
            {metrics.topMatchScore > 0 ? `${metrics.topMatchScore}%` : 'N/A'}
          </p>
          <p className="text-[11px] text-slate-500 font-medium mt-1">Highest role compatibility</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Average Role Fit</span>
            <Star className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">{metrics.avgMatchScore}%</p>
          <p className="text-[11px] text-slate-500 font-medium mt-1">Across pool of applicants</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Shortlisted</span>
            <CheckCircle2 className="w-4 h-4 text-teal-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-teal-600">{metrics.shortlistedCount}</p>
          <p className="text-[11px] text-slate-500 font-medium mt-1">Advanced to hiring review</p>
        </div>
      </div>

      {/* VIEW TABS BAR */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            id="tab-match-dashboard"
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'dashboard'
                ? 'border-indigo-600 text-indigo-600 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Match Dashboard ({candidates.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('compare')}
            id="tab-side-by-side-comparison"
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'compare'
                ? 'border-indigo-600 text-indigo-600 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <GitCompare className="w-4 h-4" />
            <span>Compare Candidates ({selectedCandidateIds.length}/4)</span>
          </button>

          <button
            onClick={() => setActiveTab('shortlist')}
            id="tab-shortlist-review"
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'shortlist'
                ? 'border-indigo-600 text-indigo-600 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Shortlist Review</span>
          </button>
        </div>
      </div>

      {/* ===================== TAB 1: MATCH DASHBOARD ===================== */}
      {activeTab === 'dashboard' && (
        <div className="space-y-4">
          {/* FILTER CONTROLS BAR */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              {/* Search */}
              <div className="md:col-span-4 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') loadJobCandidates(); }}
                  placeholder="Filter candidate by name or target role..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* Min Score Filter */}
              <div className="md:col-span-2">
                <select
                  value={minScoreFilter}
                  onChange={(e) => setMinScoreFilter(Number(e.target.value))}
                  className="w-full p-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50"
                  aria-label="Filter by Minimum Match Score"
                >
                  <option value={0}>All Match Scores</option>
                  <option value={80}>80%+ High Fit</option>
                  <option value={60}>60%+ Moderate Fit</option>
                  <option value={40}>40%+ Developing Fit</option>
                </select>
              </div>

              {/* Stage Filter */}
              <div className="md:col-span-2">
                <select
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50"
                  aria-label="Filter by Pipeline Stage"
                >
                  <option value="all">All Stages</option>
                  <option value="new_applicant">New Applicants</option>
                  <option value="under_review">Under Review</option>
                  <option value="shortlisted">Shortlisted</option>
                  <option value="assessment_invited">Assessment Invited</option>
                  <option value="interview_scheduled">Interview Scheduled</option>
                  <option value="hired">Hired</option>
                </select>
              </div>

              {/* Required Skill Filter */}
              <div className="md:col-span-2">
                <select
                  value={selectedSkillFilter}
                  onChange={(e) => setSelectedSkillFilter(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50"
                  aria-label="Filter by Required Skill"
                >
                  <option value="">All Required Skills</option>
                  {activeJob?.skills?.map((s: any) => (
                    <option key={s.skillId || s.skill_id} value={s.skillId || s.skill_id}>
                      {s.skill_name || s.skillId}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort By & Order */}
              <div className="md:col-span-2 flex gap-1">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="flex-1 p-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50"
                  aria-label="Sort Candidates By"
                >
                  <option value="match_score">Match Score</option>
                  <option value="experience">Experience</option>
                  <option value="applied_at">Applied Date</option>
                  <option value="name">Candidate Name</option>
                </select>
                <button
                  type="button"
                  onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                  className="px-2.5 py-1 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors"
                  title={`Sort order: ${sortOrder.toUpperCase()}`}
                  aria-label="Toggle sort order"
                >
                  {sortOrder === 'desc' ? '↓' : '↑'}
                </button>
              </div>

              {/* View toggle */}
              <div className="md:col-span-1 flex items-center justify-end gap-1">
                <div className="p-1 rounded-xl bg-slate-100 border border-slate-200 flex gap-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                      viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-2xs font-bold' : 'text-slate-400 hover:text-slate-700'
                    }`}
                    title="Grid View"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                      viewMode === 'list' ? 'bg-white text-indigo-600 shadow-2xs font-bold' : 'text-slate-400 hover:text-slate-700'
                    }`}
                    title="Table View"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Side-by-side selection action banner */}
            {selectedCandidateIds.length > 0 && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-indigo-900 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <GitCompare className="w-4 h-4 text-indigo-600" />
                  <span className="font-extrabold">{selectedCandidateIds.length} of 4</span> candidates selected for side-by-side comparison
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedCandidateIds([])}
                    className="text-xs text-slate-500 hover:text-slate-800 font-semibold underline"
                  >
                    Clear selection
                  </button>
                  <Button
                    variant="indigo"
                    size="sm"
                    onClick={() => setActiveTab('compare')}
                    disabled={selectedCandidateIds.length < 2}
                  >
                    Compare Selected ({selectedCandidateIds.length})
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* CANDIDATES LIST */}
          {loadingCandidates ? (
            <Card className="p-12 text-center text-slate-400 animate-pulse">
              Evaluating candidate applications against job requirements...
            </Card>
          ) : candidates.length === 0 ? (
            <Card className="p-12">
              <EmptyState
                icon={Users}
                title="No Applicants Found"
                description={
                  searchQuery || minScoreFilter > 0 || stageFilter !== 'all'
                    ? 'No candidates match the selected filters. Try broadening your criteria.'
                    : 'No candidates have submitted applications for this opportunity yet.'
                }
                variant="indigo"
              />
            </Card>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {candidates.map(candidate => {
                const isSelected = selectedCandidateIds.includes(candidate.candidateId);
                const scoreColor = getScoreColor(candidate.matchScore);

                return (
                  <div
                    key={candidate.candidateId}
                    className={`bg-white rounded-2xl border transition-all p-5 flex flex-col justify-between space-y-4 shadow-2xs ${
                      isSelected
                        ? 'border-indigo-500 ring-2 ring-indigo-200/60 bg-indigo-50/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Header */}
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleCandidateSelection(candidate.candidateId)}
                            className="mt-1 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                            title="Select candidate for comparison"
                            aria-label={`Select ${candidate.candidateName} for comparison`}
                          />
                          <img
                            src={candidate.candidateAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${candidate.candidateName}`}
                            alt={candidate.candidateName}
                            className="w-11 h-11 rounded-xl object-cover bg-slate-100 ring-2 ring-slate-100"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-black text-slate-900 leading-tight">
                                {candidate.candidateName}
                              </h4>
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                {candidate.stage.replace('_', ' ')}
                              </span>
                            </div>
                            <p className="text-xs text-indigo-600 font-semibold truncate max-w-[220px]">
                              {candidate.headline || candidate.targetRole || 'Software Professional'}
                            </p>
                            <p className="text-[11px] text-slate-400 font-medium">
                              {candidate.experienceYears} yrs exp • {candidate.location || 'Location flexible'}
                            </p>
                          </div>
                        </div>

                        {/* Match Score Badge */}
                        <div className={`px-3 py-1.5 rounded-xl border text-center ${scoreColor}`}>
                          <div className="text-lg font-black leading-none">{candidate.matchScore}%</div>
                          <div className="text-[9px] font-extrabold uppercase tracking-wider mt-0.5">Match</div>
                        </div>
                      </div>

                      {/* Sub-scores breakdown */}
                      <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-slate-50 rounded-xl text-center text-xs">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Required Skills</span>
                          <span className="font-black text-indigo-600">{candidate.requiredSkillCoverage}%</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Experience</span>
                          <span className="font-black text-slate-700">{candidate.experienceYears} Years</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Evidence Score</span>
                          <span className="font-black text-emerald-600">{candidate.evidenceScore}%</span>
                        </div>
                      </div>

                      {/* Matching Skills */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                          Matching Competencies ({candidate.matchedRequired.length}):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {candidate.matchedRequired.slice(0, 4).map(s => (
                            <span
                              key={s.skillId}
                              className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200"
                            >
                              <Check className="w-3 h-3 text-emerald-600" />
                              {s.skillName}
                            </span>
                          ))}
                          {candidate.matchedRequired.length === 0 && (
                            <span className="text-[11px] text-slate-400 italic">No fully verified required skills</span>
                          )}
                          {candidate.matchedRequired.length > 4 && (
                            <span className="text-[11px] text-slate-500 font-bold px-1.5 py-0.5">
                              +{candidate.matchedRequired.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Missing / Gap Skills */}
                      {candidate.unmetRequirements.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                            Unmet Requirements ({candidate.unmetRequirements.length}):
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {candidate.unmetRequirements.slice(0, 3).map(s => (
                              <span
                                key={s.skillId}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200"
                              >
                                <X className="w-3 h-3 text-rose-500" />
                                {s.skillName}
                              </span>
                            ))}
                            {candidate.unmetRequirements.length > 3 && (
                              <span className="text-[11px] text-slate-500 font-bold px-1.5 py-0.5">
                                +{candidate.unmetRequirements.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Explanation Snippet */}
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                        {candidate.aiSummary || candidate.explanation}
                      </p>
                    </div>

                    {/* Bottom Actions */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<Eye className="w-3.5 h-3.5" />}
                          onClick={() => handleInspectPassport(candidate.candidateId)}
                        >
                          Passport
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Sparkles className="w-3.5 h-3.5 text-indigo-600" />}
                          onClick={() => setAiInsightsCandidate(candidate)}
                        >
                          Insights
                        </Button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {candidate.stage !== 'shortlisted' ? (
                          <Button
                            variant="indigo"
                            size="sm"
                            icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                            onClick={() => openShortlistModal(candidate)}
                          >
                            Shortlist
                          </Button>
                        ) : (
                          <span className="px-2.5 py-1 text-xs font-bold text-teal-700 bg-teal-50 rounded-lg border border-teal-200">
                            Shortlisted
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-2xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase tracking-wider text-[11px]">
                    <th className="p-4 w-10">
                      <span className="sr-only">Select</span>
                    </th>
                    <th className="p-4">Candidate</th>
                    <th className="p-4">Match %</th>
                    <th className="p-4">Required Skills</th>
                    <th className="p-4">Experience</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {candidates.map(candidate => {
                    const isSelected = selectedCandidateIds.includes(candidate.candidateId);
                    const scoreColor = getScoreColor(candidate.matchScore);

                    return (
                      <tr key={candidate.candidateId} className="hover:bg-slate-50/70">
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleCandidateSelection(candidate.candidateId)}
                            className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                            aria-label={`Select ${candidate.candidateName}`}
                          />
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={candidate.candidateAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${candidate.candidateName}`}
                              alt={candidate.candidateName}
                              className="w-9 h-9 rounded-xl object-cover bg-slate-100 ring-1 ring-slate-200"
                            />
                            <div>
                              <h5 className="font-black text-slate-900">{candidate.candidateName}</h5>
                              <p className="text-[11px] text-indigo-600 font-medium truncate max-w-[180px]">
                                {candidate.headline || candidate.targetRole}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`inline-block px-2.5 py-1 rounded-xl font-black border text-center ${scoreColor}`}>
                            {candidate.matchScore}%
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="font-bold text-slate-800">{candidate.requiredSkillCoverage}%</span>
                          <span className="text-[11px] text-slate-400 block">
                            {candidate.matchedRequired.length} verified skills
                          </span>
                        </td>
                        <td className="p-4 font-semibold text-slate-700">
                          {candidate.experienceYears} Years
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] uppercase">
                            {candidate.stage.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setAiInsightsCandidate(candidate)}
                              title="View AI Explanation"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleInspectPassport(candidate.candidateId)}
                            >
                              Passport
                            </Button>
                            {candidate.stage !== 'shortlisted' && (
                              <Button
                                variant="indigo"
                                size="sm"
                                onClick={() => openShortlistModal(candidate)}
                              >
                                Shortlist
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===================== TAB 2: SIDE-BY-SIDE COMPARISON ===================== */}
      {activeTab === 'compare' && (
        <div className="space-y-4">
          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900">Compare Candidates Side-by-Side</h3>
                <p className="text-xs text-slate-500">
                  Select between 2 and 4 applicants to benchmark required competencies, verified proof, and experience side by side.
                </p>
              </div>
              <span className="text-xs font-bold text-indigo-600">
                {selectedCandidateIds.length} of 4 selected
              </span>
            </div>

            {/* Quick Candidate selector pills */}
            <div className="flex flex-wrap gap-2 pt-1">
              {candidates.map(cand => {
                const isSelected = selectedCandidateIds.includes(cand.candidateId);
                return (
                  <button
                    key={cand.candidateId}
                    type="button"
                    onClick={() => toggleCandidateSelection(cand.candidateId)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>{cand.candidateName}</span>
                    <span className="text-[10px] opacity-80">({cand.matchScore}%)</span>
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white ml-0.5" />}
                  </button>
                );
              })}
            </div>
          </Card>

          {loadingComparison ? (
            <Card className="p-12 text-center text-slate-400 animate-pulse">
              Generating candidate side-by-side competency matrix...
            </Card>
          ) : selectedCandidateIds.length < 2 ? (
            <Card className="p-12">
              <EmptyState
                icon={GitCompare}
                title="Select at least 2 candidates"
                description="Choose 2 to 4 candidates from the applicant list above to benchmark their skills, experience, and verified proof side-by-side."
                variant="indigo"
              />
            </Card>
          ) : comparisonResult ? (
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-4 sm:p-5 font-black text-slate-500 uppercase tracking-wider min-w-[200px] sticky left-0 bg-slate-50 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                        Evaluation Dimension
                      </th>
                      {comparisonResult.candidates.map(c => (
                        <th key={c.candidate.id} className="p-4 sm:p-5 text-center border-l border-slate-200 min-w-[220px]">
                          <img
                            src={c.candidate.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.candidate.fullName}`}
                            alt={c.candidate.fullName}
                            className="w-12 h-12 rounded-2xl mx-auto mb-2 object-cover bg-slate-100 ring-2 ring-indigo-100"
                          />
                          <h4 className="text-sm font-black text-slate-900">{c.candidate.fullName}</h4>
                          <p className="text-[11px] text-indigo-600 font-semibold truncate max-w-[180px] mx-auto">
                            {c.candidate.headline || c.candidate.targetRole}
                          </p>
                          <div className="mt-2">
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] uppercase">
                              {c.application ? c.application.stage.replace('_', ' ') : 'Applicant'}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {/* Role Match Score */}
                    <tr className="hover:bg-slate-50/50">
                      <td className="p-4 font-black text-slate-900 sticky left-0 bg-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                        Role Match Score
                      </td>
                      {comparisonResult.candidates.map(c => (
                        <td key={c.candidate.id} className="p-4 text-center border-l border-slate-100">
                          <span className={`text-xl font-black px-3 py-1 rounded-xl border ${getScoreColor(c.matchScore)}`}>
                            {c.matchScore}%
                          </span>
                        </td>
                      ))}
                    </tr>

                    {/* Required Skills Coverage */}
                    <tr className="hover:bg-slate-50/50">
                      <td className="p-4 font-bold text-slate-800 sticky left-0 bg-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                        Required Skills Coverage
                      </td>
                      {comparisonResult.candidates.map(c => (
                        <td key={c.candidate.id} className="p-4 text-center border-l border-slate-100 font-black text-indigo-600">
                          {c.requiredSkillCoverage}%
                        </td>
                      ))}
                    </tr>

                    {/* Work Experience */}
                    <tr className="hover:bg-slate-50/50">
                      <td className="p-4 font-bold text-slate-800 sticky left-0 bg-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                        Relevant Work Experience
                      </td>
                      {comparisonResult.candidates.map(c => (
                        <td key={c.candidate.id} className="p-4 text-center border-l border-slate-100 font-semibold text-slate-700">
                          <div className="font-bold">{c.candidate.experienceYears} Years</div>
                          <span className="text-[10px] text-slate-400 block">{c.experienceEvaluation}</span>
                        </td>
                      ))}
                    </tr>

                    {/* Verified Evidence & Repos */}
                    <tr className="hover:bg-slate-50/50">
                      <td className="p-4 font-bold text-slate-800 sticky left-0 bg-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                        Verified Evidence & Repos
                      </td>
                      {comparisonResult.candidates.map(c => (
                        <td key={c.candidate.id} className="p-4 text-center border-l border-slate-100 font-semibold text-slate-700">
                          <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                            {c.evidenceMatches?.length || 0} Verified Proofs • {c.candidate.repoCount || 0} Repos
                          </span>
                        </td>
                      ))}
                    </tr>

                    {/* Standardized Tests Passed */}
                    <tr className="hover:bg-slate-50/50">
                      <td className="p-4 font-bold text-slate-800 sticky left-0 bg-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                        Standardized Tests Passed
                      </td>
                      {comparisonResult.candidates.map(c => (
                        <td key={c.candidate.id} className="p-4 text-center border-l border-slate-100 font-bold text-slate-700">
                          {(c.assessmentResults || []).filter((a: any) => a.passed === 1).length} Tests Passed
                        </td>
                      ))}
                    </tr>

                    {/* Competency Matrix Section Header */}
                    <tr className="bg-slate-100/70">
                      <td colSpan={comparisonResult.candidates.length + 1} className="p-3 font-black text-slate-600 uppercase tracking-wider text-[10px]">
                        Required Competency Fulfillment Breakdown:
                      </td>
                    </tr>

                    {/* Competency rows */}
                    {comparisonResult.competencyMatrix.map(row => (
                      <tr key={row.skillId} className="hover:bg-slate-50/50">
                        <td className="p-4 font-semibold text-slate-800 sticky left-0 bg-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                          <div className="font-bold text-slate-900">{row.skillName}</div>
                          <span className="text-[10px] text-slate-400 capitalize">
                            {row.requirementType} • Target Level {row.targetProficiency}/5
                          </span>
                        </td>
                        {row.candidates.map(cComp => (
                          <td key={cComp.candidateId} className="p-4 text-center border-l border-slate-100">
                            {cComp.status === 'matched' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200">
                                <Check className="w-3 h-3 text-emerald-600" />
                                Level {cComp.proficiency}/5 (Verified)
                              </span>
                            ) : cComp.status === 'unverified' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 font-bold text-[11px] border border-amber-200">
                                <HelpCircle className="w-3 h-3 text-amber-600" />
                                Level {cComp.proficiency}/5 (Unverified)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 font-semibold text-[11px] border border-rose-200">
                                <X className="w-3 h-3 text-rose-600" />
                                {cComp.badge}
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}

                    {/* AI Recommendation */}
                    <tr className="hover:bg-slate-50/50 bg-indigo-50/20">
                      <td className="p-4 font-black text-indigo-900 sticky left-0 bg-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                        AI Recommendation
                      </td>
                      {comparisonResult.candidates.map(c => (
                        <td key={c.candidate.id} className="p-4 text-center border-l border-slate-100">
                          <span className="capitalize font-black text-xs text-indigo-700 block">
                            {c.aiRecommendation?.replace('_', ' ') || 'Needs Assessment'}
                          </span>
                          <span className="text-[10px] text-slate-500 mt-1 block px-2 line-clamp-2">
                            {c.aiSummary}
                          </span>
                        </td>
                      ))}
                    </tr>

                    {/* Action Row */}
                    <tr className="bg-slate-50">
                      <td className="p-4 font-bold text-slate-600 sticky left-0 bg-slate-50 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                        Hiring Actions
                      </td>
                      {comparisonResult.candidates.map(c => {
                        const originalCandidate = candidates.find(cand => cand.candidateId === c.candidate.id);
                        const isShortlisted = c.application?.stage === 'shortlisted';

                        return (
                          <td key={c.candidate.id} className="p-4 text-center border-l border-slate-200">
                            {isShortlisted ? (
                              <span className="px-3 py-1.5 rounded-xl bg-teal-50 text-teal-700 font-bold text-xs border border-teal-200 inline-block">
                                Shortlisted
                              </span>
                            ) : originalCandidate ? (
                              <Button
                                variant="indigo"
                                size="sm"
                                onClick={() => openShortlistModal(originalCandidate)}
                              >
                                Shortlist
                              </Button>
                            ) : (
                              <span className="text-xs text-slate-400">N/A</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ===================== TAB 3: SHORTLIST REVIEW ===================== */}
      {activeTab === 'shortlist' && (
        <div className="space-y-4">
          <Card className="p-5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900">Shortlisted Candidate Review</h3>
              <p className="text-xs text-slate-500">
                Review applicants previously approved for advancement, shortlisting decision rationale, and next hiring milestones.
              </p>
            </div>
            <Badge variant="indigo" size="md">
              {shortlistedCandidates.length} Shortlisted Candidates
            </Badge>
          </Card>

          {loadingShortlisted ? (
            <Card className="p-12 text-center text-slate-400 animate-pulse">
              Loading shortlisted candidates...
            </Card>
          ) : shortlistedCandidates.length === 0 ? (
            <Card className="p-12">
              <EmptyState
                icon={CheckCircle2}
                title="No Shortlisted Candidates"
                description="No applicants have been shortlisted for this position yet. Review applicants on the Match Dashboard and click Shortlist."
                variant="indigo"
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {shortlistedCandidates.map((cand: any) => (
                <div
                  key={cand.candidate_id}
                  className="bg-white rounded-2xl border border-teal-200 p-5 space-y-3 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <img
                        src={cand.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${cand.full_name}`}
                        alt={cand.full_name}
                        className="w-11 h-11 rounded-xl object-cover bg-slate-100 ring-2 ring-teal-100"
                      />
                      <div>
                        <h4 className="text-sm font-black text-slate-900">{cand.full_name}</h4>
                        <p className="text-xs text-indigo-600 font-semibold">{cand.headline || cand.target_role}</p>
                        <p className="text-[11px] text-slate-400">
                          {cand.experience_years} yrs exp • {cand.location || 'Location flexible'}
                        </p>
                      </div>
                    </div>

                    <div className="px-2.5 py-1 rounded-xl bg-teal-50 text-teal-700 font-black text-sm border border-teal-200 text-center">
                      {cand.match_score || 50}%
                    </div>
                  </div>

                  {/* Decision rationale card */}
                  <div className="bg-teal-50/50 border border-teal-100 rounded-xl p-3 text-xs space-y-1">
                    <span className="font-bold text-teal-900 block">Shortlisting Decision Rationale:</span>
                    <p className="text-teal-800 leading-relaxed">
                      {cand.shortlisting_reason || 'Candidate approved by recruiter evaluation.'}
                    </p>
                    {cand.shortlisted_at && (
                      <span className="text-[10px] text-teal-600 font-medium block pt-1">
                        Recorded on {new Date(cand.shortlisted_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleInspectPassport(cand.candidate_id)}
                    >
                      Inspect Passport
                    </Button>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="indigo"
                        size="sm"
                        onClick={() => {
                          setStageChangeModal({
                            applicationId: cand.application_id,
                            candidateName: cand.full_name,
                            targetStage: 'interview_scheduled',
                            reason: 'Candidate shortlisted; advancing to interview round',
                            submitting: false,
                          });
                        }}
                      >
                        Advance to Interview
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===================== MODAL: SHORTLIST ACTION ===================== */}
      <Modal
        isOpen={Boolean(shortlistModal.candidate)}
        onClose={() => setShortlistModal({ candidate: null, reason: '', note: '', submitting: false })}
        title="Shortlist Candidate for Hiring Team Review"
        subtitle={`Role: ${activeJob?.title || 'Job Posting'}`}
        maxWidth="md"
      >
        {shortlistModal.candidate && (
          <form onSubmit={handleConfirmShortlist} className="space-y-4">
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between text-xs">
              <div>
                <h5 className="font-black text-indigo-950">{shortlistModal.candidate.candidateName}</h5>
                <p className="text-indigo-700 text-[11px]">{shortlistModal.candidate.headline || shortlistModal.candidate.targetRole}</p>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-indigo-700">{shortlistModal.candidate.matchScore}%</span>
                <span className="text-[10px] font-bold text-indigo-500 block uppercase">Match Score</span>
              </div>
            </div>

            <div>
              <label htmlFor="shortlist-reason" className="text-xs font-bold text-slate-700 block mb-1">
                Shortlisting Decision Rationale *
              </label>
              <textarea
                id="shortlist-reason"
                value={shortlistModal.reason}
                onChange={(e) => setShortlistModal(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Explain why this candidate is being shortlisted (e.g. strong technical assessment score, verified open source repositories, etc.)..."
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-100 outline-none h-20"
                required
              />
              <span className="text-[11px] text-slate-400">
                This rationale will be recorded in the candidate's application history and visible to hiring managers.
              </span>
            </div>

            <div>
              <label htmlFor="internal-note" className="text-xs font-bold text-slate-700 block mb-1">
                Internal Recruiter Note (Optional)
              </label>
              <textarea
                id="internal-note"
                value={shortlistModal.note}
                onChange={(e) => setShortlistModal(prev => ({ ...prev, note: e.target.value }))}
                placeholder="Private note for the recruitment team regarding salary expectations, availability, or interviewer instructions..."
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-100 outline-none h-16"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShortlistModal({ candidate: null, reason: '', note: '', submitting: false })}
                disabled={shortlistModal.submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="indigo"
                size="sm"
                icon={<CheckCircle2 className="w-4 h-4" />}
                disabled={shortlistModal.submitting}
              >
                {shortlistModal.submitting ? 'Shortlisting...' : 'Confirm Shortlist Decision'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ===================== MODAL: STAGE CHANGE ===================== */}
      <Modal
        isOpen={Boolean(stageChangeModal)}
        onClose={() => setStageChangeModal(null)}
        title="Advance Candidate Stage"
        subtitle={`Candidate: ${stageChangeModal?.candidateName || ''}`}
        maxWidth="md"
      >
        {stageChangeModal && (
          <form onSubmit={handleConfirmStageChange} className="space-y-4">
            <div>
              <label htmlFor="target-stage" className="text-xs font-bold text-slate-700 block mb-1">
                Target Pipeline Stage *
              </label>
              <select
                id="target-stage"
                value={stageChangeModal.targetStage}
                onChange={(e) => setStageChangeModal(prev => prev ? { ...prev, targetStage: e.target.value } : null)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50"
              >
                <option value="under_review">Under Review</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="assessment_invited">Assessment Invited</option>
                <option value="interview_scheduled">Interview Scheduled</option>
                <option value="offer_extended">Offer Extended</option>
                <option value="hired">Hired</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label htmlFor="stage-reason" className="text-xs font-bold text-slate-700 block mb-1">
                Reason for Stage Change
              </label>
              <textarea
                id="stage-reason"
                value={stageChangeModal.reason}
                onChange={(e) => setStageChangeModal(prev => prev ? { ...prev, reason: e.target.value } : null)}
                placeholder="Reason recorded in pipeline audit log..."
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-100 outline-none h-20"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStageChangeModal(null)}
                disabled={stageChangeModal.submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="indigo"
                size="sm"
                disabled={stageChangeModal.submitting}
              >
                {stageChangeModal.submitting ? 'Updating...' : 'Confirm Stage Change'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ===================== MODAL: AI INSIGHTS & EXPLANATION ===================== */}
      <Modal
        isOpen={Boolean(aiInsightsCandidate)}
        onClose={() => setAiInsightsCandidate(null)}
        title="AI Role Compatibility & Interview Guide"
        subtitle={`Candidate: ${aiInsightsCandidate?.candidateName || ''} • Match: ${aiInsightsCandidate?.matchScore || 0}%`}
        maxWidth="lg"
      >
        {aiInsightsCandidate && (
          <div className="space-y-4">
            {/* Executive Summary */}
            <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  Executive Compatibility Summary
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white text-indigo-700 font-extrabold text-[10px] uppercase border border-indigo-100">
                  {aiInsightsCandidate.aiRecommendation?.replace('_', ' ') || 'Recommended'}
                </span>
              </div>
              <p className="text-xs text-indigo-950 leading-relaxed font-medium">
                {aiInsightsCandidate.aiSummary || aiInsightsCandidate.explanation}
              </p>
            </div>

            {/* Strengths & Gaps Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-2xl space-y-2">
                <span className="text-xs font-black text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Key Strengths
                </span>
                <ul className="space-y-1.5 text-xs text-emerald-950">
                  {aiInsightsCandidate.aiStrengths?.map((st, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>{st}</span>
                    </li>
                  ))}
                  {(!aiInsightsCandidate.aiStrengths || aiInsightsCandidate.aiStrengths.length === 0) && (
                    <li className="text-slate-400 italic">No specific strengths recorded</li>
                  )}
                </ul>
              </div>

              <div className="p-3.5 bg-amber-50/60 border border-amber-100 rounded-2xl space-y-2">
                <span className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  Areas to Probe / Skill Gaps
                </span>
                <ul className="space-y-1.5 text-xs text-amber-950">
                  {aiInsightsCandidate.aiGaps?.map((gp, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-amber-600 font-bold">•</span>
                      <span>{gp}</span>
                    </li>
                  ))}
                  {(!aiInsightsCandidate.aiGaps || aiInsightsCandidate.aiGaps.length === 0) && (
                    <li className="text-slate-400 italic">No major gaps identified</li>
                  )}
                </ul>
              </div>
            </div>

            {/* Targeted Technical Interview Questions */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                Targeted Technical Interview Questions
              </span>
              <p className="text-[11px] text-slate-500">
                Recommended by AI to validate candidate competency in areas with unverified claims or partial evidence:
              </p>
              <div className="space-y-2 pt-1">
                {aiInsightsCandidate.aiQuestions?.map((q, idx) => (
                  <div key={idx} className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 flex items-start gap-2 shadow-2xs">
                    <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="leading-snug">{q}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Evidence & Fairness statement */}
            <div className="text-[11px] text-slate-400 p-2 text-center">
              Evaluation provider: {aiInsightsCandidate.aiProvider === 'gemini' ? 'Google Gemini 1.5' : 'SARATHI Deterministic Engine'} • Based on job requirements and verified evidence records.
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAiInsightsCandidate(null)}
              >
                Close
              </Button>
              {aiInsightsCandidate.stage !== 'shortlisted' && (
                <Button
                  variant="indigo"
                  size="sm"
                  onClick={() => {
                    const c = aiInsightsCandidate;
                    setAiInsightsCandidate(null);
                    openShortlistModal(c);
                  }}
                >
                  Shortlist Candidate
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ===================== MODAL: CANDIDATE PASSPORT ===================== */}
      {selectedPassport && (
        <CandidatePassportModal
          passport={selectedPassport}
          onClose={() => setSelectedPassport(null)}
          onRefresh={() => {
            loadJobCandidates();
          }}
        />
      )}
    </div>
  );
};

export default RecruiterCandidateMatchingPage;
