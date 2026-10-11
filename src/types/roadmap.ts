export interface RoadmapTask {
  id: string;
  stageId: string;
  topic: string;
  description: string;
  relevanceToRole: string;
  estimatedDuration: string; // e.g. "4 hours"
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  resourceName: string;
  resourceUrl: string;
  isFreeResource: boolean;
  isCompleted: boolean;
  prioritySkillGap?: boolean;
  relatedSkill?: string;
}

export interface RoadmapStage {
  id: string;
  title: string;
  description: string;
  stageNumber: number;
  tasks: RoadmapTask[];
}

export interface StudentRoadmap {
  targetRole: string;
  domainId?: string;
  domainTitle?: string;
  overallProgress: number; // percentage 0-100
  stages: RoadmapStage[];
  recommendedNextTaskId: string;
}
