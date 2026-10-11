import type { SkillCategory, VerificationStatus } from './skill';

export type PriorityLevel = 'High' | 'Medium' | 'Low';

export interface SkillGapItem {
  skillName: string;
  category: SkillCategory;
  requiredProficiency: number; // 1-5
  currentProficiency: number;  // 1-5
  gapLevel: number;            // required - current
  priority: PriorityLevel;
  whyItMatters: string;
  recommendedAction: string;
  verificationStatus: VerificationStatus;
  domainId?: string;
  isOutsideTargetRole?: boolean; // When student has demonstrated skills not required by current role
}

export interface RoleSkillRequirement {
  skillName: string;
  category: SkillCategory;
  requiredProficiency: number; // 1-5
  whyItMatters: string;
  importance?: 'Critical' | 'Core' | 'Secondary';
}

export interface CareerRoleRequirements {
  roleTitle: string;
  domainId?: string;
  domainTitle?: string;
  description: string;
  typicalTools?: string[];
  requiredSkills: RoleSkillRequirement[];
}
