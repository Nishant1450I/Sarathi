import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '../../../services/apiClient';
import { useAuth } from '../../../context/AuthContext';
import { useStudent } from '../../../context/StudentContext';
import {
  mapSkillRadar,
  mapTopGaps,
  mapReadinessTrend,
  mapAssessmentHistory,
  mapLearningActivity,
  mapRoadmapStages,
  mapApplicationFunnel,
  type CategoryScore,
  type SkillGapItem,
  type ReadinessPoint,
  type AssessmentAttempt,
  type ActivityWeek,
  type RoadmapStageItem,
  type FunnelStageItem,
} from './chartMappers';

export interface DashboardJobMatch {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  salary: string;
  matchScore: number;
}

export interface DashboardKPIs {
  readinessScore: number;
  readinessChange: number;
  verifiedSkillsCount: number;
  highPriorityGapsCount: number;
  roadmapProgressPct: number;
  streakDays: number;
  totalHoursLearned: number;
}

export interface DashboardData {
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  hasData: boolean;
  targetRole: string;
  kpis: DashboardKPIs;
  categoryScores: CategoryScore[];
  topGaps: SkillGapItem[];
  readinessTrend: ReadinessPoint[];
  assessmentHistory: AssessmentAttempt[];
  learningActivity: {
    weeks: ActivityWeek[];
    totalTasks: number;
    totalHours: number;
  };
  roadmapByStage: RoadmapStageItem[];
  applicationFunnel: FunnelStageItem[];
  topJobMatches: DashboardJobMatch[];
}

export function useDashboardData(): DashboardData {
  const { user } = useAuth();
  const {
    targetRole,
    skills,
    skillGaps,
    overallReadinessScore,
    assessedSkillsCount,
    roadmap,
    projects,
  } = useStudent();

  const [rawServerData, setRawServerData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<{ success: boolean; data: any }>('/api/analytics/student');
      if (res && res.data) {
        setRawServerData(res.data);
      } else {
        setRawServerData(null);
      }
    } catch (err: any) {
      console.warn('Failed to fetch analytics payload, using local context fallback:', err);
      setError(err?.message || 'Unable to sync analytics with server.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Merge server telemetry with client context to ensure single source of truth
  const kpis: DashboardKPIs = useMemo(() => {
    const verifiedCount = skills.filter((s) => s.status === 'verified').length;
    const highGapsCount = skillGaps.filter((g) => g.priority === 'High').length;

    // Use evaluated readiness score from StudentContext if available, otherwise server
    const currentReadiness =
      overallReadinessScore !== null
        ? overallReadinessScore
        : rawServerData?.kpis?.readinessScore ?? rawServerData?.summary?.readinessScore ?? 0;

    const streak = rawServerData?.kpis?.streakDays ?? rawServerData?.summary?.streakDays ?? 3;
    const hours = rawServerData?.kpis?.totalHoursLearned ?? rawServerData?.summary?.totalHoursLearned ?? 12;

    const roadmapPct = roadmap?.overallProgress ?? rawServerData?.kpis?.roadmapProgressPct ?? 0;

    return {
      readinessScore: currentReadiness,
      readinessChange: rawServerData?.kpis?.readinessChange ?? 8,
      verifiedSkillsCount: verifiedCount,
      highPriorityGapsCount: highGapsCount,
      roadmapProgressPct: roadmapPct,
      streakDays: streak,
      totalHoursLearned: hours,
    };
  }, [skills, skillGaps, overallReadinessScore, rawServerData, roadmap]);

  const categoryScores = useMemo(() => {
    const fromServer = rawServerData?.categoryScores || rawServerData?.charts?.skillRadar;
    return mapSkillRadar(fromServer);
  }, [rawServerData]);

  const topGaps = useMemo(() => {
    if (skillGaps && skillGaps.length > 0) {
      return mapTopGaps(
        skillGaps.map((g) => ({
          skill: g.skillName,
          category: g.category || 'Core Skill',
          current: g.currentProficiency,
          required: g.requiredProficiency,
          gap: g.gapLevel,
          priority: g.priority,
          status: g.verificationStatus,
        }))
      );
    }
    const fromServer = rawServerData?.topGaps || rawServerData?.charts?.benchmarkGaps;
    return mapTopGaps(fromServer);
  }, [skillGaps, rawServerData]);

  const readinessTrend = useMemo(() => {
    const fromServer = rawServerData?.readinessTrend || rawServerData?.charts?.readinessTrend;
    return mapReadinessTrend(fromServer, kpis.readinessScore);
  }, [rawServerData, kpis.readinessScore]);

  const assessmentHistory = useMemo(() => {
    const fromServer = rawServerData?.assessmentHistory || rawServerData?.charts?.assessmentHistory;
    return mapAssessmentHistory(fromServer);
  }, [rawServerData]);

  const learningActivity = useMemo(() => {
    const fromServer = rawServerData?.activityByDay || rawServerData?.charts?.learningActivity;
    return mapLearningActivity(fromServer);
  }, [rawServerData]);

  const roadmapByStage = useMemo(() => {
    const fromServer = rawServerData?.roadmapByStage || rawServerData?.charts?.roadmapProgress;
    return mapRoadmapStages(fromServer);
  }, [rawServerData]);

  const applicationFunnel = useMemo(() => {
    const fromServer = rawServerData?.applicationFunnel || rawServerData?.charts?.applicationFunnel;
    return mapApplicationFunnel(fromServer);
  }, [rawServerData]);

  const topJobMatches = useMemo<DashboardJobMatch[]>(() => {
    if (rawServerData?.topJobMatches && rawServerData.topJobMatches.length > 0) {
      return rawServerData.topJobMatches;
    }
    return [
      {
        id: 'job-1',
        title: 'Junior Full-Stack Engineer',
        company: 'CloudScale Dynamics',
        location: 'Bengaluru / Remote',
        type: 'Full-time',
        salary: '₹8 - 14 LPA',
        matchScore: Math.min(95, Math.max(70, kpis.readinessScore + 5)),
      },
      {
        id: 'job-2',
        title: 'Frontend React Developer',
        company: 'Innovate AI Labs',
        location: 'Hyderabad / Hybrid',
        type: 'Full-time',
        salary: '₹7 - 12 LPA',
        matchScore: Math.min(92, Math.max(65, kpis.readinessScore + 2)),
      },
      {
        id: 'job-3',
        title: 'Software Development Engineer - I',
        company: 'NextGen Fintech',
        location: 'Pune / Remote',
        type: 'Full-time',
        salary: '₹9 - 16 LPA',
        matchScore: Math.min(88, Math.max(60, kpis.readinessScore - 3)),
      },
    ];
  }, [rawServerData, kpis.readinessScore]);

  const hasData = Boolean(
    assessedSkillsCount > 0 ||
      skills.length > 0 ||
      projects.length > 0 ||
      (rawServerData?.assessmentHistory && rawServerData.assessmentHistory.length > 0)
  );

  return {
    isLoading,
    error,
    refetch: fetchDashboardData,
    hasData,
    targetRole: targetRole || user?.targetRole || 'Full-Stack Developer',
    kpis,
    categoryScores,
    topGaps,
    readinessTrend,
    assessmentHistory,
    learningActivity,
    roadmapByStage,
    applicationFunnel,
    topJobMatches,
  };
}
