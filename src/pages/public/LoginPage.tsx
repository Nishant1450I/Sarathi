import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ArrowRight, Sparkles, Building2, Briefcase, GraduationCap } from 'lucide-react';
import { Logo } from '../../components/common/Logo';
import { Button } from '../../components/common/Button';
import { GoogleLoginButton } from '../../components/auth/GoogleLoginButton';
import { useAuth } from '../../context/AuthContext';
import type { UserRole, UserProfile } from '../../types/user';

function sanitizeReturnTo(param: string | null): string | null {
  if (!param) return null;
  const decoded = decodeURIComponent(param).trim();
  // Reject absolute URLs, scheme-relative URLs, javascript, and protocol escapes
  if (decoded.startsWith('//') || decoded.includes('://') || decoded.startsWith('javascript:')) {
    return null;
  }
  return decoded.startsWith('/') ? decoded : `/${decoded}`;
}

export const LoginPage: React.FC = () => {
  const { user, isAuthenticated, isLoading: isAuthLoading, login, isDemo, appMode, loginAsNewStudent } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawReturnTo = searchParams.get('returnTo');
  const safeReturnTo = sanitizeReturnTo(rawReturnTo);

  const [activeTab, setActiveTab] = useState<UserRole>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [portalNotice, setPortalNotice] = useState<string | null>(null);

  // If already authenticated, redirect to legitimate dashboard
  useEffect(() => {
    if (isAuthenticated && user) {
      const destination = safeReturnTo || (
        user.role === 'recruiter' ? '/recruiter/dashboard' :
        user.role === 'college' ? '/college/dashboard' : '/student/dashboard'
      );
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, user, safeReturnTo, navigate]);

  const handleAuthSuccess = (profile: UserProfile) => {
    // If user signed in with a different role than the cosmetic tab, give honest notice
    if (profile.role !== activeTab) {
      setPortalNotice(`Note: Your account is verified as a ${profile.role}. Redirecting to your authorized portal...`);
    }

    const destination = safeReturnTo || (
      profile.role === 'recruiter' ? '/recruiter/dashboard' :
      profile.role === 'college' ? '/college/dashboard' : '/student/dashboard'
    );

    setTimeout(() => {
      navigate(destination, { replace: true });
    }, portalNotice ? 800 : 0);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setPortalNotice(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const profile = await login(cleanEmail, password, activeTab, rememberMe);
      handleAuthSuccess(profile);
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTabChange = (newRole: UserRole) => {
    setActiveTab(newRole);
    setErrorMessage(null);
    if (isDemo && appMode === 'demo') {
      if (newRole === 'student') {
        setEmail('student@sarathi.ai');
        setPassword('password123');
      } else if (newRole === 'recruiter') {
        setEmail('recruiter@sarathi.ai');
        setPassword('password123');
      } else if (newRole === 'college') {
        setEmail('placement@nit.edu');
        setPassword('password123');
      }
    }
  };

  if (isAuthLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F7FC]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#087BFA]" aria-label="Loading session" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#F4F7FC]">
      {/* LEFT BRAND PANEL (Desktop Only) */}
      <aside aria-label="Sarathi Platform Overview" className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#0B1B43] via-[#087BFA] to-[#603DF5] p-12 text-white flex-col justify-between relative overflow-hidden">
        <div className="relative z-10">
          <Logo size="lg" lightMode={true} showTagline={true} />
        </div>
        <div className="relative z-10 space-y-5 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-blue-100 text-xs font-semibold tracking-wide border border-white/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ENTERPRISE SKILL INTELLIGENCE</span>
          </div>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white">
            One platform connecting students, recruiters, and colleges.
          </h1>
          <p className="text-blue-100 text-sm leading-relaxed">
            Verify diagnostic skills with automated code evaluation, discover qualified candidates, and track institutional career readiness.
          </p>
        </div>
        <div className="relative z-10 text-xs text-blue-200 border-t border-white/10 pt-4">
          © {new Date().getFullYear()} SARATHI AI Platform. All rights reserved.
        </div>
      </aside>

      {/* RIGHT AUTH PANEL */}
      <main className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-6 bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-[#E0E7F2]">
          <div className="lg:hidden text-center mb-4">
            <Logo size="md" showTagline={true} className="justify-center" />
          </div>

          <div>
            <h2 className="text-2xl font-extrabold text-[#0B1B43] tracking-tight">Sign in to SARATHI</h2>
            <p className="text-xs text-[#405B8B] mt-1">Single sign-on access to Student, Recruiter, and College portals.</p>
          </div>

          {/* 1. Portal Selector Tabs (Cosmetic Hint) */}
          <div role="tablist" aria-label="Portal Selection" className="grid grid-cols-3 gap-1.5 p-1 bg-[#F4F7FC] rounded-xl text-xs font-semibold">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'student'}
              onClick={() => handleTabChange('student')}
              className={`py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer ${
                activeTab === 'student' ? 'bg-white text-[#087BFA] shadow-xs font-bold' : 'text-[#405B8B] hover:text-[#0B1B43]'
              }`}
            >
              <GraduationCap className="w-4 h-4 shrink-0" />
              <span>Student</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'recruiter'}
              onClick={() => handleTabChange('recruiter')}
              className={`py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer ${
                activeTab === 'recruiter' ? 'bg-white text-[#603DF5] shadow-xs font-bold' : 'text-[#405B8B] hover:text-[#0B1B43]'
              }`}
            >
              <Briefcase className="w-4 h-4 shrink-0" />
              <span>Recruiter</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'college'}
              onClick={() => handleTabChange('college')}
              className={`py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer ${
                activeTab === 'college' ? 'bg-white text-[#16A34A] shadow-xs font-bold' : 'text-[#405B8B] hover:text-[#0B1B43]'
              }`}
            >
              <Building2 className="w-4 h-4 shrink-0" />
              <span>College</span>
            </button>
          </div>

          {/* Alert Messages */}
          {errorMessage && (
            <div id="login-error-alert" role="alert" className="p-3 rounded-xl bg-red-50 text-[#DC2626] text-xs font-medium border border-red-200">
              {errorMessage}
            </div>
          )}
          {portalNotice && (
            <div role="status" className="p-3 rounded-xl bg-blue-50 text-[#087BFA] text-xs font-medium border border-blue-200">
              {portalNotice}
            </div>
          )}

          {/* 2. Google SSO Button */}
          <GoogleLoginButton
            role={activeTab}
            rememberMe={rememberMe}
            text={`Continue with Google`}
            onSuccess={handleAuthSuccess}
          />

          {/* 3. Divider */}
          <div className="relative flex items-center justify-center">
            <div className="w-full border-t border-gray-200" />
            <span className="bg-white px-3 text-[11px] text-gray-400 font-semibold uppercase tracking-wider relative">
              or sign in with email
            </span>
          </div>

          {/* 4. Password Form */}
          <form onSubmit={handlePasswordSubmit} aria-describedby={errorMessage ? 'login-error-alert' : undefined} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-bold text-[#0B1B43] mb-1.5 uppercase tracking-wide">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#405B8B] absolute left-3.5 top-3.5" aria-hidden="true" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 min-h-[44px] rounded-xl border border-[#E0E7F2] text-sm text-[#0B1B43] focus:outline-none focus:ring-2 focus:ring-[#087BFA] bg-[#F4F7FC]/40"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-bold text-[#0B1B43] mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#405B8B] absolute left-3.5 top-3.5" aria-hidden="true" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-10 py-2.5 min-h-[44px] rounded-xl border border-[#E0E7F2] text-sm text-[#0B1B43] focus:outline-none focus:ring-2 focus:ring-[#087BFA] bg-[#F4F7FC]/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-3 text-[#405B8B] hover:text-[#0B1B43] p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-[#405B8B] cursor-pointer min-h-[32px]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[#E0E7F2] text-[#087BFA] focus:ring-[#087BFA]"
                />
                <span>Remember me</span>
              </label>
              <Link to="/forgot-password" className="font-semibold text-[#087BFA] hover:underline py-1">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              className="w-full min-h-[44px]"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In to SARATHI
            </Button>
          </form>

          {/* 5. Student Registration Link */}
          <div className="text-center pt-1 text-xs text-[#405B8B]">
            Need a student account?{' '}
            <Link to="/signup" className="font-bold text-[#087BFA] hover:underline">
              Create an Account
            </Link>
          </div>

          {/* 6. Demo Quick-Fill Block (Strictly Gated to Demo Mode) */}
          {isDemo && appMode === 'demo' && (
            <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 space-y-2">
              <div className="flex items-center gap-1.5 font-bold">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Demo Mode Quick Access</span>
              </div>
              <p className="text-[11px] text-indigo-700">
                Click a portal tab above to auto-fill credentials, or launch a zero-progress student sandbox:
              </p>
              <button
                type="button"
                onClick={async () => {
                  await loginAsNewStudent('Brand-New Student');
                  navigate('/student/dashboard');
                }}
                className="w-full py-2 px-3 rounded-lg bg-white hover:bg-indigo-100/60 text-indigo-700 font-bold text-xs border border-indigo-300 transition-colors cursor-pointer text-center"
              >
                🚀 Quick Start as New Student
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
