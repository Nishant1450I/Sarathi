import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Search,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Clock,
  Globe,
  Sparkles,
  CheckCircle2,
  Award,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { ProgressBar } from '../../components/common/ProgressBar';
import { apiClient } from '../../services/apiClient';
import { useStudent } from '../../context/StudentContext';

interface LearningResource {
  id: string;
  domain: string;
  skillTags: string[];
  title: string;
  provider: string;
  type: string;
  url: string;
  isFree: boolean;
  level: string;
  duration: string;
  language: string;
  description?: string;
  learningObjectives?: string[];
  prerequisites?: string[];
  isBookmarked: boolean;
  collectionName?: string;
  progressStatus: 'not_started' | 'in_progress' | 'completed';
  percentComplete?: number;
  progressNotes?: string;
  completedAt?: string;
  isRecommended?: boolean;
  recommendationReason?: string;
}

const DOMAIN_FILTERS = [
  { id: 'all', label: 'All Domains' },
  { id: 'dom-frontend', label: 'Frontend & Web' },
  { id: 'dom-backend', label: 'Backend & System Design' },
  { id: 'dom-aiml', label: 'AI & Machine Learning' },
  { id: 'dom-clouddevops', label: 'Cloud & DevOps' },
  { id: 'dom-cybersecurity', label: 'Cybersecurity' },
];

const LEVEL_FILTERS = [
  { id: 'all', label: 'All Levels' },
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
];

type MainTab = 'all' | 'recommended' | 'in_progress' | 'completed' | 'bookmarked';

export const ResourcesPage: React.FC = () => {
  const { targetRole, targetDomain, skillGaps } = useStudent();

  const [resources, setResources] = useState<LearningResource[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<MainTab>('all');
  const [selectedCollection, setSelectedCollection] = useState<'all' | 'my_list' | 'learn_next'>('all');
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [freeOnly, setFreeOnly] = useState<boolean>(false);

  // Modal states
  const [detailModalResource, setDetailModalResource] = useState<LearningResource | null>(null);
  const [passportModalResource, setPassportModalResource] = useState<LearningResource | null>(null);
  const [isSubmittingPassport, setIsSubmittingPassport] = useState<boolean>(false);
  const [passportSuccessMessage, setPassportSuccessMessage] = useState<string | null>(null);

  const fetchResources = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'recommended') {
        const queryParams = new URLSearchParams();
        if (targetRole) queryParams.append('targetRole', targetRole);
        if (targetDomain) queryParams.append('domainId', targetDomain);

        const res = await apiClient.get<{ success: boolean; data: LearningResource[] }>(
          `/api/resources/recommendations?${queryParams.toString()}`
        );
        if (res?.data) {
          setResources(res.data);
        }
      } else {
        const queryParams = new URLSearchParams();
        if (selectedDomain !== 'all') queryParams.append('domain', selectedDomain);
        if (selectedLevel !== 'all') queryParams.append('level', selectedLevel);
        if (searchQuery.trim()) queryParams.append('search', searchQuery.trim());
        if (freeOnly) queryParams.append('isFree', 'true');
        if (activeTab === 'bookmarked') {
          queryParams.append('bookmarkedOnly', 'true');
          if (selectedCollection !== 'all') {
            queryParams.append('collection', selectedCollection);
          }
        }
        if (activeTab === 'in_progress') queryParams.append('status', 'in_progress');
        if (activeTab === 'completed') queryParams.append('status', 'completed');

        const url = `/api/resources?${queryParams.toString()}`;
        const res = await apiClient.get<{ success: boolean; data: LearningResource[] }>(url);
        if (res?.data) {
          setResources(res.data);
        }
      }
    } catch (err) {
      console.warn('Failed to load learning resources:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [selectedDomain, selectedLevel, freeOnly, activeTab, selectedCollection]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchResources();
  };

  const handleToggleBookmark = async (resourceId: string, collectionName: string = 'my_list') => {
    try {
      const res = await apiClient.post<{ success: boolean; data: { bookmarked: boolean; collectionName: string } }>(
        `/api/resources/${resourceId}/bookmark`,
        { collectionName }
      );
      if (res?.data && typeof res.data.bookmarked === 'boolean') {
        setResources((prev) =>
          prev.map((r) =>
            r.id === resourceId
              ? { ...r, isBookmarked: res.data.bookmarked, collectionName: res.data.collectionName }
              : r
          )
        );
      }
    } catch (err) {
      console.warn('Failed to toggle bookmark:', err);
    }
  };

  const handleUpdateProgress = async (
    resourceId: string,
    status: 'not_started' | 'in_progress' | 'completed',
    percentComplete?: number
  ) => {
    try {
      let effPercent = percentComplete;
      if (effPercent === undefined) {
        if (status === 'completed') effPercent = 100;
        else if (status === 'not_started') effPercent = 0;
        else effPercent = 25;
      }

      await apiClient.post(`/api/resources/${resourceId}/progress`, {
        status,
        percentComplete: effPercent,
      });

      setResources((prev) =>
        prev.map((r) =>
          r.id === resourceId
            ? {
                ...r,
                progressStatus: status,
                percentComplete: effPercent,
                completedAt: status === 'completed' ? new Date().toISOString() : r.completedAt,
              }
            : r
        )
      );

      // If user marks resource as completed, prompt to add to Skill Passport as learning evidence
      if (status === 'completed') {
        const target = resources.find((r) => r.id === resourceId);
        if (target) {
          setPassportModalResource(target);
        }
      }
    } catch (err) {
      console.warn('Failed to update progress:', err);
    }
  };

  const handleAddLearningEvidence = async (resourceId: string) => {
    setIsSubmittingPassport(true);
    setPassportSuccessMessage(null);
    try {
      const res = await apiClient.post<{ success: boolean; message: string }>(
        `/api/resources/${resourceId}/add-to-passport`,
        {}
      );
      if (res?.success) {
        setPassportSuccessMessage(res.message || 'Evidence successfully added to your Skill Passport.');
        setTimeout(() => {
          setPassportModalResource(null);
          setPassportSuccessMessage(null);
        }, 2000);
      }
    } catch (err: any) {
      console.warn('Failed to add learning evidence:', err);
    } finally {
      setIsSubmittingPassport(false);
    }
  };

  const stats = useMemo(() => {
    const inProgressCount = resources.filter((r) => r.progressStatus === 'in_progress').length;
    const completedCount = resources.filter((r) => r.progressStatus === 'completed').length;
    const bookmarkedCount = resources.filter((r) => r.isBookmarked).length;
    return { inProgressCount, completedCount, bookmarkedCount };
  }, [resources]);

  const getLevelVariant = (level: string): 'success' | 'blue' | 'purple' | 'gray' => {
    switch (level.toLowerCase()) {
      case 'beginner':
        return 'success';
      case 'intermediate':
        return 'blue';
      case 'advanced':
        return 'purple';
      default:
        return 'gray';
    }
  };

  // Find if resource matches a student's high priority skill gap
  const getResourceGapMatch = (resource: LearningResource) => {
    if (!skillGaps || skillGaps.length === 0) return null;
    for (const tag of resource.skillTags) {
      const match = skillGaps.find(
        (g) => g.skillName.toLowerCase() === tag.toLowerCase() && g.priority === 'High'
      );
      if (match) return match.skillName;
    }
    return null;
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      <PageHeader
        title="Curated Learning Library"
        description="Interactive tutorials, documentation, and handbooks personalized to close your skill gaps and advance your tech career."
      />

      {/* QUICK SUMMARY & CONTINUOUS LEARNING BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#E0E7F2] shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-bold text-[#405B8B] uppercase tracking-wider">In Progress</span>
            <div className="text-2xl font-black text-[#0B1B43]">{stats.inProgressCount}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E0E7F2] shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-bold text-[#405B8B] uppercase tracking-wider">Completed Learning</span>
            <div className="text-2xl font-black text-emerald-600">{stats.completedCount}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E0E7F2] shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-bold text-[#405B8B] uppercase tracking-wider">Saved in My List</span>
            <div className="text-2xl font-black text-[#087BFA]">{stats.bookmarkedCount}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-50 text-[#087BFA]">
            <Bookmark className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS & FILTERS */}
      <Card className="p-6 space-y-4">
        {/* Main Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-[#E0E7F2]">
          <button
            onClick={() => setActiveTab('all')}
            className={`pb-3 px-3 text-xs font-bold transition-all whitespace-nowrap cursor-pointer border-b-2 ${
              activeTab === 'all'
                ? 'border-[#087BFA] text-[#087BFA]'
                : 'border-transparent text-[#405B8B] hover:text-[#0B1B43]'
            }`}
          >
            All Resources
          </button>

          <button
            onClick={() => setActiveTab('recommended')}
            className={`pb-3 px-3 text-xs font-bold transition-all whitespace-nowrap cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === 'recommended'
                ? 'border-[#603DF5] text-[#603DF5]'
                : 'border-transparent text-[#405B8B] hover:text-[#0B1B43]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#603DF5]" />
            <span>Recommended for You</span>
          </button>

          <button
            onClick={() => setActiveTab('in_progress')}
            className={`pb-3 px-3 text-xs font-bold transition-all whitespace-nowrap cursor-pointer border-b-2 ${
              activeTab === 'in_progress'
                ? 'border-[#087BFA] text-[#087BFA]'
                : 'border-transparent text-[#405B8B] hover:text-[#0B1B43]'
            }`}
          >
            In Progress
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`pb-3 px-3 text-xs font-bold transition-all whitespace-nowrap cursor-pointer border-b-2 ${
              activeTab === 'completed'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-[#405B8B] hover:text-[#0B1B43]'
            }`}
          >
            Completed
          </button>

          <button
            onClick={() => setActiveTab('bookmarked')}
            className={`pb-3 px-3 text-xs font-bold transition-all whitespace-nowrap cursor-pointer border-b-2 flex items-center gap-1 ${
              activeTab === 'bookmarked'
                ? 'border-[#087BFA] text-[#087BFA]'
                : 'border-transparent text-[#405B8B] hover:text-[#0B1B43]'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Saved Collections</span>
          </button>
        </div>

        {/* Domain Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {DOMAIN_FILTERS.map((df) => (
            <button
              key={df.id}
              onClick={() => setSelectedDomain(df.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedDomain === df.id
                  ? 'bg-gradient-to-r from-[#087BFA] to-[#603DF5] text-white shadow-xs'
                  : 'bg-[#F4F7FC] text-[#405B8B] hover:text-[#0B1B43] hover:bg-slate-200'
              }`}
            >
              {df.label}
            </button>
          ))}
        </div>

        {/* Collection Filter Chips (Visible when on Saved Collections tab) */}
        {activeTab === 'bookmarked' && (
          <div className="flex items-center gap-2 pt-2 border-t border-[#E0E7F2]">
            <span className="text-[11px] font-bold text-[#405B8B] uppercase">Collection:</span>
            {(
              [
                { id: 'all', label: 'All Saved' },
                { id: 'my_list', label: 'My Learning List' },
                { id: 'learn_next', label: 'Learn Next' },
              ] as const
            ).map((col) => (
              <button
                key={col.id}
                onClick={() => setSelectedCollection(col.id)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedCollection === col.id
                    ? 'bg-[#087BFA] text-white shadow-2xs'
                    : 'bg-[#F4F7FC] text-[#405B8B] hover:text-[#0B1B43]'
                }`}
              >
                {col.label}
              </button>
            ))}
          </div>
        )}

        {/* Search, Level and Toggles Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-[#E0E7F2]">
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-[#405B8B] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search skills, topics, providers..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E0E7F2] text-xs text-[#0B1B43] focus:border-[#087BFA] outline-none"
            />
          </form>

          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-[#0B1B43] w-full sm:w-auto justify-end">
            {/* Level Filter Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#405B8B] font-bold">Level:</span>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-[#E0E7F2] text-xs font-semibold text-[#0B1B43] bg-white outline-none cursor-pointer"
              >
                {LEVEL_FILTERS.map((lf) => (
                  <option key={lf.id} value={lf.id}>
                    {lf.label}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={freeOnly}
                onChange={(e) => setFreeOnly(e.target.checked)}
                className="w-4 h-4 rounded text-[#087BFA] focus:ring-[#087BFA]"
              />
              <span>Free Only</span>
            </label>
          </div>
        </div>
      </Card>

      {/* RESOURCE CARDS GRID */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <Card key={idx} className="p-6 space-y-4 animate-pulse">
              <div className="h-5 bg-slate-200 rounded-md w-3/4" />
              <div className="h-4 bg-slate-200 rounded-md w-1/2" />
              <div className="h-16 bg-slate-100 rounded-lg" />
              <div className="h-8 bg-slate-200 rounded-md" />
            </Card>
          ))}
        </div>
      ) : resources.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-12 h-12 text-[#8FA1C0]" />}
          title={
            activeTab === 'recommended'
              ? 'No specific recommendations yet'
              : 'No resources match your filter'
          }
          description={
            activeTab === 'recommended'
              ? 'Set your target role or complete a diagnostic skill assessment to see personalized recommendations.'
              : "Try broadening your search query or selecting 'All Domains' to see all available learning resources."
          }
          action={
            activeTab === 'recommended' ? (
              <Link to="/student/skill-gap">
                <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  View Skill Gap Analysis
                </Button>
              </Link>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActiveTab('all');
                  setSelectedDomain('all');
                  setSelectedLevel('all');
                  setSearchQuery('');
                  setFreeOnly(false);
                }}
              >
                Clear All Filters
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map((resource) => {
            const gapMatch = getResourceGapMatch(resource);
            return (
              <Card
                key={resource.id}
                className="p-6 flex flex-col justify-between space-y-4 hover:border-[#087BFA] transition-all duration-200 shadow-xs hover:shadow-md group relative"
              >
                <div className="space-y-3">
                  {/* Badges & Bookmark */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant={getLevelVariant(resource.level)}>
                        {resource.level}
                      </Badge>
                      {resource.isFree ? (
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Free
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          Paid
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {resource.isBookmarked && (
                        <span className="text-[10px] font-semibold text-[#087BFA] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                          {resource.collectionName === 'learn_next' ? 'Learn Next' : 'My List'}
                        </span>
                      )}
                      <button
                        onClick={() =>
                          handleToggleBookmark(
                            resource.id,
                            resource.isBookmarked && resource.collectionName === 'my_list'
                              ? 'learn_next'
                              : 'my_list'
                          )
                        }
                        className="p-1.5 rounded-lg text-[#405B8B] hover:text-[#087BFA] hover:bg-slate-100 transition-colors"
                        title={
                          resource.isBookmarked
                            ? `Saved in ${resource.collectionName === 'learn_next' ? 'Learn Next' : 'My Learning List'} (Click to toggle collection or remove)`
                            : 'Save to My Learning List'
                        }
                      >
                        {resource.isBookmarked ? (
                          <BookmarkCheck className="w-5 h-5 text-[#087BFA] fill-[#087BFA]" />
                        ) : (
                          <Bookmark className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Recommendation pill if matching gap or target career */}
                  {(resource.isRecommended || gapMatch) && (
                    <div className="p-2 rounded-xl bg-purple-50 border border-purple-100 text-[11px] font-bold text-[#603DF5] flex items-start gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">
                        {resource.recommendationReason ||
                          (gapMatch ? `Closes high-priority gap in ${gapMatch}` : `Recommended for ${targetRole || 'your target career'}`)}
                      </span>
                    </div>
                  )}

                  {/* Title & Provider */}
                  <div>
                    <h3 className="font-extrabold text-sm text-[#0B1B43] group-hover:text-[#087BFA] transition-colors line-clamp-2">
                      {resource.title}
                    </h3>
                    <p className="text-xs text-[#405B8B] mt-1 font-medium">
                      by {resource.provider}
                    </p>
                  </div>

                  {/* Meta Attributes */}
                  <div className="flex items-center gap-3 text-[11px] text-[#405B8B] pt-1">
                    {resource.duration && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{resource.duration}</span>
                      </span>
                    )}
                    {resource.language && (
                      <span className="flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5" />
                        <span>{resource.language}</span>
                      </span>
                    )}
                    <span className="capitalize">{resource.type}</span>
                  </div>

                  {/* Skill Tags */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    {resource.skillTags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#F4F7FC] text-[#405B8B]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Progress & External Link Action */}
                <div className="pt-4 border-t border-[#E0E7F2] space-y-3">
                  {/* Progress Status & Percent */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#405B8B]">Status:</span>
                      <select
                        value={resource.progressStatus}
                        onChange={(e) =>
                          handleUpdateProgress(resource.id, e.target.value as any)
                        }
                        className="p-1 px-2 rounded-lg border border-[#E0E7F2] text-[11px] font-bold text-[#0B1B43] bg-[#F4F7FC] outline-none cursor-pointer"
                      >
                        <option value="not_started">⚪ Not Started</option>
                        <option value="in_progress">🟡 In Progress</option>
                        <option value="completed">🟢 Completed</option>
                      </select>
                    </div>

                    {/* Milestone Progress Bar when In Progress */}
                    {resource.progressStatus === 'in_progress' && (
                      <div className="space-y-1 pt-1">
                        <ProgressBar
                          progress={resource.percentComplete || 25}
                          size="sm"
                          showLabel={true}
                          labelPosition="right"
                        />
                        <div className="flex justify-between items-center text-[10px] text-[#405B8B] pt-0.5">
                          <span className="font-bold">Milestone:</span>
                          <div className="flex gap-1">
                            {[25, 50, 75, 100].map((pct) => (
                              <button
                                key={pct}
                                onClick={() =>
                                  handleUpdateProgress(
                                    resource.id,
                                    pct === 100 ? 'completed' : 'in_progress',
                                    pct
                                  )
                                }
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors ${
                                  (resource.percentComplete || 25) >= pct
                                    ? 'bg-blue-100 text-[#087BFA]'
                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                }`}
                              >
                                {pct}%
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-[#405B8B] hover:text-[#0B1B43] px-2.5"
                      onClick={() => setDetailModalResource(resource)}
                    >
                      Details
                    </Button>

                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-center group-hover:bg-[#087BFA] group-hover:text-white transition-colors"
                        rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
                      >
                        Open Resource
                      </Button>
                    </a>
                  </div>

                  {/* Add to Skill Passport prompt when completed */}
                  {resource.progressStatus === 'completed' && (
                    <button
                      onClick={() => setPassportModalResource(resource)}
                      className="w-full py-1.5 px-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#603DF5] text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors border border-purple-200"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>Reflect & Add to Skill Passport</span>
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* RESOURCE DETAILS MODAL */}
      {detailModalResource && (
        <Modal
          isOpen={Boolean(detailModalResource)}
          onClose={() => setDetailModalResource(null)}
          title={detailModalResource.title}
          subtitle={`By ${detailModalResource.provider} • ${detailModalResource.level} Level`}
          maxWidth="2xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button variant="ghost" onClick={() => setDetailModalResource(null)}>
                Close
              </Button>
              <a
                href={detailModalResource.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="primary" rightIcon={<ExternalLink className="w-3.5 h-3.5" />}>
                  Open Learning Portal
                </Button>
              </a>
            </div>
          }
        >
          <div className="space-y-4 text-xs text-[#0B1B43]">
            {detailModalResource.description && (
              <div>
                <h4 className="font-bold text-[#0B1B43] mb-1 text-sm">Course Overview</h4>
                <p className="text-[#405B8B] leading-relaxed">
                  {detailModalResource.description}
                </p>
              </div>
            )}

            {detailModalResource.learningObjectives &&
              detailModalResource.learningObjectives.length > 0 && (
                <div>
                  <h4 className="font-bold text-[#0B1B43] mb-1.5 text-sm">Learning Objectives</h4>
                  <ul className="space-y-1.5 pl-1">
                    {detailModalResource.learningObjectives.map((obj, i) => (
                      <li key={i} className="flex items-start gap-2 text-[#405B8B]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{obj}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            {detailModalResource.prerequisites &&
              detailModalResource.prerequisites.length > 0 && (
                <div className="p-3 rounded-xl bg-[#F4F7FC] border border-[#E0E7F2]">
                  <span className="font-bold text-[#0B1B43] block mb-1">Recommended Prerequisites:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {detailModalResource.prerequisites.map((p, i) => (
                      <span
                        key={i}
                        className="text-[10px] bg-white border border-[#E0E7F2] text-[#405B8B] px-2 py-0.5 rounded-md font-semibold"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#E0E7F2] text-[11px] text-[#405B8B]">
              <div>
                <span className="block font-bold text-[#0B1B43]">Duration</span>
                <span>{detailModalResource.duration || 'Self-paced'}</span>
              </div>
              <div>
                <span className="block font-bold text-[#0B1B43]">Format</span>
                <span className="capitalize">{detailModalResource.type}</span>
              </div>
              <div>
                <span className="block font-bold text-[#0B1B43]">Access</span>
                <span>{detailModalResource.isFree ? '100% Free' : 'Paid Course'}</span>
              </div>
              <div>
                <span className="block font-bold text-[#0B1B43]">Language</span>
                <span>{detailModalResource.language}</span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* REFLECT & ADD TO SKILL PASSPORT MODAL */}
      {passportModalResource && (
        <Modal
          isOpen={Boolean(passportModalResource)}
          onClose={() => setPassportModalResource(null)}
          title="Add Learning Evidence to Skill Passport"
          subtitle={`Connect "${passportModalResource.title}" to your verified credential profile`}
          maxWidth="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button
                variant="ghost"
                onClick={() => setPassportModalResource(null)}
                disabled={isSubmittingPassport}
              >
                Cancel
              </Button>
              <Button
                variant="purple"
                onClick={() => handleAddLearningEvidence(passportModalResource.id)}
                disabled={isSubmittingPassport}
                leftIcon={<Award className="w-4 h-4" />}
              >
                {isSubmittingPassport ? 'Adding Evidence...' : 'Confirm & Add Evidence'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs text-[#0B1B43]">
            {passportSuccessMessage ? (
              <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>{passportSuccessMessage}</span>
              </div>
            ) : (
              <>
                <p className="text-[#405B8B] leading-relaxed">
                  Completing this curriculum demonstrates practical learning in the following technical competencies:
                </p>

                <div className="p-3 rounded-xl bg-[#F4F7FC] border border-[#E0E7F2] space-y-2">
                  <span className="font-bold text-[#0B1B43] block">Skills to record:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {passportModalResource.skillTags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-purple-100 text-[#603DF5] px-2.5 py-1 rounded-lg text-xs font-bold"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-[11px] leading-relaxed">
                  <span className="font-bold block mb-0.5">Platform Verification Transparency:</span>
                  This will link the tutorial proof of work to your Skill Passport as <strong>Self-Reported Learning Evidence</strong>. In accordance with SARATHI verification standards, course completion alone does not claim unexamined proficiency. You can validate mastery anytime via our diagnostic Skill Assessments.
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
