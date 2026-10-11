import type { VerificationStatus } from './skill';

export interface ProjectItem {
  id: string;
  title: string;
  description: string;
  technologies: string[];
  repositoryUrl: string;
  liveDemoUrl?: string;
  skillsDemonstrated: string[];
  verificationStatus: VerificationStatus;
  createdAt: string;
  updatedAt?: string;
}
