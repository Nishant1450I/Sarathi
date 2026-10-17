import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Clock,
  Globe
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { apiClient } from '../../services/apiClient';

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
  isBookmarked: boolean;
  progressStatus: 'not_started' | 'in_progress' | 'completed';
}

const DOMAIN_FILTERS = [
  { id: 'all', label: 'All Domains' },
  { id: 'dom-frontend', label: 'Frontend & Web' },
  { id: 'dom-backend', label: 'Backend & System Design' },
  { id: 'dom-aiml', label: 'AI & Machine Learning' },
  { id: 'dom-clouddevops', label: 'Cloud & DevOps' },
  { id: 'dom-cybersecurity', label: 'Cybersecurity' },
];

export const ResourcesPage: React.FC = () => {
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [freeOnly, setFreeOnly] = useState<boolean>(false);
  const [bookmarkedOnly, setBookmarkedOnly] = useState<boolean>(false);

  const fetchResources = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (selectedDomain !== 'all') queryParams.append('domain', selectedDomain);
      if (searchQuery.trim()) queryParams.append('search', searchQuery.trim());
      if (freeOnly) queryParams.append('isFree', 'true');
      if (bookmarkedOnly) queryParams.append('bookmarkedOnly', 'true');

      const url = `/api/resources?${queryParams.toString()}`;
      const res = await apiClient.get<{ success: boolean; data: LearningResource[] }>(url);
      if (res?.data) {
        setResources(res.data);
      }
    } catch (err) {
      console.warn('Failed to load learning resources:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [selectedDomain, freeOnly, bookmarkedOnly]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchResources();
  };

  const handleToggleBookmark = async (resourceId: string) => {
    try {
      const res = await apiClient.post<{ success: boolean; bookmarked: boolean }>(
        `/api/resources/${resourceId}/bookmark`
      );
      if (res && typeof res.bookmarked === 'boolean') {
        setResources((prev) =>
          prev.map((r) =>
            r.id === resourceId ? { ...r, isBookmarked: res.bookmarked } : r
          )
        );
      }
    } catch (err) {
      console.warn('Failed to toggle bookmark:', err);
    }
  };

  const handleUpdateProgress = async (
    resourceId: string,
    status: 'not_started' | 'in_progress' | 'completed'
  ) => {
    try {
      await apiClient.post(`/api/resources/${resourceId}/progress`, { status });
      setResources((prev) =>
        prev.map((r) => (r.id === resourceId ? { ...r, progressStatus: status } : r))
      );
    } catch (err) {
      console.warn('Failed to update progress:', err);
    }
  };

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

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      <PageHeader
        title="Curated Learning Library"
        description="Verified interactive tutorials, documentation, and handbooks aligned with high-growth tech careers."
      />

      {/* Filters and Search Bar */}
      <Card className="p-6 space-y-4">
        {/* Domain Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {DOMAIN_FILTERS.map((df) => (
            <button
              key={df.id}
              onClick={() => setSelectedDomain(df.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedDomain === df.id
                  ? 'bg-gradient-to-r from-[#087BFA] to-[#603DF5] text-white shadow-sm'
                  : 'bg-[#F4F7FC] text-[#405B8B] hover:text-[#0B1B43] hover:bg-slate-200'
              }`}
            >
              {df.label}
            </button>
          ))}
        </div>

        {/* Search & Toggles Row */}
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

          <div className="flex items-center gap-4 text-xs font-semibold text-[#0B1B43] w-full sm:w-auto justify-end">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={freeOnly}
                onChange={(e) => setFreeOnly(e.target.checked)}
                className="w-4 h-4 rounded text-[#087BFA] focus:ring-[#087BFA]"
              />
              <span>Free Resources Only</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={bookmarkedOnly}
                onChange={(e) => setBookmarkedOnly(e.target.checked)}
                className="w-4 h-4 rounded text-[#087BFA] focus:ring-[#087BFA]"
              />
              <span>Bookmarked Only</span>
            </label>
          </div>
        </div>
      </Card>

      {/* Resource Cards Grid */}
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
          title="No resources match your filter"
          description="Try broadening your search query or selecting 'All Domains' to see all available learning resources."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedDomain('all');
                setSearchQuery('');
                setFreeOnly(false);
                setBookmarkedOnly(false);
              }}
            >
              Clear All Filters
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map((resource) => (
            <Card
              key={resource.id}
              className="p-6 flex flex-col justify-between space-y-4 hover:border-[#087BFA] transition-all duration-200 shadow-xs hover:shadow-md group"
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

                  <button
                    onClick={() => handleToggleBookmark(resource.id)}
                    className="p-1.5 rounded-lg text-[#405B8B] hover:text-[#087BFA] hover:bg-slate-100 transition-colors"
                    title={resource.isBookmarked ? 'Remove Bookmark' : 'Bookmark Resource'}
                  >
                    {resource.isBookmarked ? (
                      <BookmarkCheck className="w-5 h-5 text-[#087BFA] fill-[#087BFA]" />
                    ) : (
                      <Bookmark className="w-5 h-5" />
                    )}
                  </button>
                </div>

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
                {/* Progress status selector */}
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

                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
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
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
