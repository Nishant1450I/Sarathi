import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { UserProfile, UserRole, AuthState } from '../types/user';
import {
  StorageService,
  defaultDemoCollege
} from '../services/storageService';
import { recruiterApi } from '../services/recruiterApiService';
import { OpportunityService } from '../services/opportunityService';

interface AuthContextType extends AuthState {
  appMode: 'demo' | 'production';
  token: string | null;
  activeOrgId?: string | null;
  login: (email: string, passwordOrRole?: string | UserRole, role?: UserRole) => Promise<void>;
  loginWithGoogle: (googleData: { email: string; fullName?: string; avatarUrl?: string; role?: UserRole }) => Promise<void>;
  signup: (fullName: string, email: string, role: UserRole) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  logout: () => void;
  switchDemoRole: (role: UserRole) => Promise<void>;
  loginAsNewStudent: (name?: string, email?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mapBackendUserToProfile = (serverUser: any, organization?: any): UserProfile => {
  const mappedRole: UserRole =
    serverUser.role === 'recruiter' ? 'recruiter' :
    serverUser.role === 'college' ? 'college' : 'student';

  return {
    id: serverUser.id,
    email: serverUser.email,
    fullName: serverUser.fullName || serverUser.full_name || 'Sarathi User',
    role: mappedRole,
    roles: [mappedRole],
    companyName: organization?.name || serverUser.companyName || serverUser.company_name || (mappedRole === 'recruiter' ? 'NexTech Innovations' : undefined),
    institution: serverUser.institution || (mappedRole === 'student' ? 'National Institute of Technology' : undefined),
    avatarUrl: serverUser.avatarUrl || serverUser.avatar_url,
    targetRole: serverUser.targetRole || serverUser.target_role || 'Full-Stack Developer',
    createdAt: serverUser.createdAt || serverUser.created_at || new Date().toISOString(),
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem('sarathi_auth_token'));
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [appMode, setAppMode] = useState<'demo' | 'production'>('demo');
  const [isDemo, setIsDemo] = useState<boolean>(true);

  const logout = useCallback(() => {
    const currentToken = token || sessionStorage.getItem('sarathi_auth_token');
    if (currentToken) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${currentToken}` }
      }).catch(() => {});
    }

    setUser(null);
    setToken(null);
    setActiveOrgId(null);
    sessionStorage.removeItem('sarathi_auth_token');
    sessionStorage.removeItem('sarathi_auth_user');
    sessionStorage.removeItem('sarathi_demo_college');
    recruiterApi.clearAuthCache();
    OpportunityService.clearAuthToken();
    StorageService.setActiveUser(null);
  }, [token]);

  // Query server mode and restore session on mount
  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      // 1. Detect server mode
      let currentMode: 'demo' | 'production' = 'demo';
      try {
        const modeRes = await fetch('/api/auth/mode');
        if (modeRes.ok) {
          const modeData = await modeRes.json();
          currentMode = modeData.mode === 'production' ? 'production' : 'demo';
        }
      } catch {
        currentMode = 'demo';
      }

      if (!isMounted) return;
      setAppMode(currentMode);
      setIsDemo(currentMode === 'demo');

      // 2. Check for existing session token
      const savedToken = sessionStorage.getItem('sarathi_auth_token');
      if (savedToken) {
        try {
          const meRes = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${savedToken}` }
          });

          if (meRes.ok) {
            const meData = await meRes.json();
            const activeOrg = meData.organizations?.find((o: any) => o.id === meData.activeOrgId) || meData.organizations?.[0];
            const profile = mapBackendUserToProfile(meData.user, activeOrg);

            if (isMounted) {
              setUser(profile);
              setToken(savedToken);
              setActiveOrgId(meData.activeOrgId || activeOrg?.id || null);

              if (profile.role === 'recruiter') {
                recruiterApi.setAuthToken(savedToken, meData.activeOrgId || activeOrg?.id);
              } else if (profile.role === 'student') {
                OpportunityService.setAuthToken(savedToken);
              }
            }
          } else {
            // Token is invalid/expired
            if (isMounted) {
              logout();
            }
          }
        } catch {
          // If offline, check for cached user in sessionStorage
          const cachedUserStr = sessionStorage.getItem('sarathi_auth_user');
          if (cachedUserStr && isMounted) {
            try {
              const cachedUser = JSON.parse(cachedUserStr);
              setUser(cachedUser);
              setToken(savedToken);
            } catch {
              logout();
            }
          }
        }
      } else {
        // Check if demo college was active in demo mode
        const isDemoCollege = sessionStorage.getItem('sarathi_demo_college');
        if (isDemoCollege && currentMode === 'demo' && isMounted) {
          setUser(defaultDemoCollege);
        }
      }

      if (isMounted) {
        setIsLoading(false);
      }
    }

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, [logout]);

  const login = async (email: string, passwordOrRole?: string | UserRole, roleParam?: UserRole) => {
    setIsLoading(true);
    try {
      const cleanEmail = email.toLowerCase().trim();

      // Normalize parameters
      let password = '';
      let targetRole: UserRole | undefined = roleParam;
      if (typeof passwordOrRole === 'string') {
        if (passwordOrRole === 'student' || passwordOrRole === 'recruiter' || passwordOrRole === 'college') {
          targetRole = passwordOrRole;
        } else {
          password = passwordOrRole;
        }
      }

      // College presentation demo account
      if (cleanEmail === defaultDemoCollege.email.toLowerCase() || targetRole === 'college') {
        if (appMode === 'demo') {
          setUser(defaultDemoCollege);
          sessionStorage.setItem('sarathi_demo_college', 'true');
          sessionStorage.removeItem('sarathi_auth_token');
          sessionStorage.removeItem('sarathi_auth_user');
          return;
        } else {
          throw new Error('Institutional college accounts must be provisioned by institution administrator in production mode.');
        }
      }

      // In demo mode, if password was omitted, supply default demo credential
      if (!password && appMode === 'demo') {
        password = 'password123';
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Invalid email or password');
      }

      const data = await res.json();
      const profile = mapBackendUserToProfile(data.user, data.organization);
      setUser(profile);
      setToken(data.token);
      setActiveOrgId(data.organization?.id || null);

      sessionStorage.setItem('sarathi_auth_token', data.token);
      sessionStorage.setItem('sarathi_auth_user', JSON.stringify(profile));
      sessionStorage.removeItem('sarathi_demo_college');

      if (profile.role === 'recruiter') {
        recruiterApi.setAuthToken(data.token, data.organization?.id);
      } else if (profile.role === 'student') {
        OpportunityService.setAuthToken(data.token);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (fullName: string, email: string, role: UserRole) => {
    setIsLoading(true);
    try {
      const cleanEmail = email.toLowerCase().trim();

      if (role === 'student' && appMode === 'demo') {
        await loginAsNewStudent(fullName, cleanEmail);
        return;
      }

      // Local fallback for demo accounts
      const newProfile: UserProfile = {
        id: `usr-${role}-${Date.now()}`,
        email: cleanEmail,
        fullName: fullName.trim(),
        role,
        companyName: role === 'recruiter' ? 'NexTech Innovations' : undefined,
        institution: role === 'student' ? 'National Institute of Technology' : undefined,
        createdAt: new Date().toISOString()
      };
      setUser(newProfile);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    const updatedUser: UserProfile = {
      ...user,
      ...updates
    };
    setUser(updatedUser);
    sessionStorage.setItem('sarathi_auth_user', JSON.stringify(updatedUser));
  };

  const switchDemoRole = async (role: UserRole) => {
    if (appMode !== 'demo') return;
    if (role === 'student') {
      await login('student@sarathi.ai', 'password123', 'student');
    } else if (role === 'recruiter') {
      await login('recruiter@sarathi.ai', 'password123', 'recruiter');
    } else if (role === 'college') {
      await login('placement@nit.edu', 'password123', 'college');
    }
  };

  const loginAsNewStudent = async (name: string = 'Brand-New Student', email?: string) => {
    if (appMode !== 'demo') {
      throw new Error('Quick start is only permitted in demo mode.');
    }
    const cleanEmail = email || `student-${Date.now()}@sarathi.test`;
    const res = await fetch('/api/auth/student-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: name,
        email: cleanEmail,
        institution: 'Demonstration University',
        targetRole: 'Junior Developer'
      })
    });
    if (res.ok) {
      const data = await res.json();
      const profile = mapBackendUserToProfile(data.user);
      setUser(profile);
      setToken(data.token);
      sessionStorage.setItem('sarathi_auth_token', data.token);
      sessionStorage.setItem('sarathi_auth_user', JSON.stringify(profile));
      sessionStorage.removeItem('sarathi_demo_college');
      OpportunityService.setAuthToken(data.token);
    }
  };

  const loginWithGoogle = async (googleData: { email: string; fullName?: string; avatarUrl?: string; role?: UserRole }) => {
    setIsLoading(true);
    try {
      const cleanEmail = googleData.email.toLowerCase().trim();
      const targetRole = googleData.role || 'student';

      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          fullName: googleData.fullName,
          avatarUrl: googleData.avatarUrl,
          role: targetRole,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to authenticate with Google');
      }

      const data = await res.json();
      const profile = mapBackendUserToProfile(data.user, data.organization);
      setUser(profile);
      setToken(data.token);
      setActiveOrgId(data.organization?.id || null);

      sessionStorage.setItem('sarathi_auth_token', data.token);
      sessionStorage.setItem('sarathi_auth_user', JSON.stringify(profile));
      sessionStorage.removeItem('sarathi_demo_college');

      if (profile.role === 'recruiter') {
        recruiterApi.setAuthToken(data.token, data.organization?.id);
      } else if (profile.role === 'student') {
        OpportunityService.setAuthToken(data.token);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isDemo,
        appMode,
        token,
        activeOrgId,
        login,
        loginWithGoogle,
        signup,
        updateProfile,
        logout,
        switchDemoRole,
        loginAsNewStudent
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
