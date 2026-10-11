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
  degree?: string;
  graduationYear?: string;
  location?: string;
  createdAt: string;
}

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isDemo: boolean;
}
