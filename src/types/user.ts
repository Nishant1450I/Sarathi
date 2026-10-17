export type UserRole = 'student' | 'recruiter' | 'college';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  roles?: UserRole[];
  avatarUrl?: string;
  targetRole?: string;
  institution?: string;
  companyName?: string;
  bio?: string;
  headline?: string;
  degree?: string;
  graduationYear?: string | number;
  location?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  resumeUrl?: string;
  experienceYears?: number;
  workPreference?: string;
  createdAt: string;
}

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isDemo: boolean;
}
