import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle2, ArrowRight, Sparkles, Lock, Mail } from 'lucide-react';
import { Logo } from '../../components/common/Logo';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { GoogleLoginButton } from '../../components/auth/GoogleLoginButton';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types/user';


export const LoginPage: React.FC = () => {
  const { login, isLoading, isDemo, loginAsNewStudent } = useAuth();
  const [email, setEmail] = useState(() => (import.meta.env.VITE_APP_MODE === 'production' ? '' : 'student@sarathi.ai'));
  const [password, setPassword] = useState(() => (import.meta.env.VITE_APP_MODE === 'production' ? '' : 'password123'));
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>('student');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    try {
      await login(email, password, role);
      if (role === 'recruiter') navigate('/recruiter/dashboard');
      else if (role === 'college') navigate('/college/dashboard');
      else navigate('/student/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="min-h-screen flex bg-[#F4F7FC]">
      {/* LEFT PANEL (Desktop Only) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#0B1B43] via-[#087BFA] to-[#603DF5] p-12 text-white flex-col justify-between relative overflow-hidden">
        {/* Decorative Circles */}
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />

        <div className="relative z-10">
          <Logo size="lg" lightMode={true} showTagline={true} />
        </div>

        <div className="relative z-10 space-y-6 max-w-lg">
          <Badge variant="purple" className="bg-white/10 text-blue-100 border-white/20">
            AI-POWERED CAREER INTELLIGENCE
          </Badge>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white">
            Your journey to career readiness starts here.
          </h1>
          <p className="text-blue-100 text-sm leading-relaxed">
            SARATHI provides a clear, evidence-backed evaluation of your technical skills, gap analysis, and tailored learning paths.
          </p>

          <div className="space-y-4 pt-4 text-sm">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-blue-300 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block">Discover Your Skills</span>
                <span className="text-blue-100 text-xs">Diagnostic assessments across frontend, backend, databases, and DevOps.</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-blue-300 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block">Build Your Roadmap</span>
                <span className="text-blue-100 text-xs">Personalized learning modules mapped to actual industry standards.</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-blue-300 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block">Unlock Opportunities</span>
                <span className="text-blue-100 text-xs">Match with recruiters looking for transparent, verified project evidence.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-blue-200 border-t border-white/10 pt-4">
          © {new Date().getFullYear()} SARATHI Platform. All rights reserved.
        </div>
      </div>

      {/* RIGHT PANEL (Form) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8 bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-[#E0E7F2]">
          {/* Header Mobile Logo */}
          <div className="lg:hidden text-center mb-6">
            <Logo size="md" showTagline={true} className="justify-center" />
          </div>

          <div>
            <h2 className="text-2xl font-extrabold text-[#0B1B43] tracking-tight">Welcome Back</h2>
            <p className="text-xs text-[#405B8B] mt-1">Sign in to your SARATHI account to continue your learning journey.</p>
          </div>

          {isDemo && (
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 shrink-0 text-indigo-600" />
                  <span><strong>Quick Access:</strong> Select a role to auto-fill credentials.</span>
                </div>
              </div>

              {/* Role selector tabs */}
              <div className="grid grid-cols-3 gap-2 p-1 bg-[#F4F7FC] rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setRole('student');
                    setEmail('student@sarathi.ai');
                    setPassword('password123');
                  }}
                  className={`py-2 rounded-lg transition-all ${role === 'student' ? 'bg-white text-[#087BFA] shadow-xs font-bold' : 'text-[#405B8B]'}`}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRole('recruiter');
                    setEmail('recruiter@sarathi.ai');
                    setPassword('password123');
                  }}
                  className={`py-2 rounded-lg transition-all ${role === 'recruiter' ? 'bg-white text-[#603DF5] shadow-xs font-bold' : 'text-[#405B8B]'}`}
                >
                  Recruiter
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRole('college');
                    setEmail('placement@nit.edu');
                    setPassword('password123');
                  }}
                  className={`py-2 rounded-lg transition-all ${role === 'college' ? 'bg-white text-[#16A34A] shadow-xs font-bold' : 'text-[#405B8B]'}`}
                >
                  College
                </button>
              </div>

              <button
                type="button"
                onClick={async () => {
                  await loginAsNewStudent('Brand-New Student');
                  navigate('/student/dashboard');
                }}
                className="w-full py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#087BFA] text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border border-blue-200 cursor-pointer"
              >
                <span>🚀 Quick Start as New Student (Zero Progress)</span>
              </button>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-[#DC2626] text-xs font-medium border border-red-200">
              {error}
            </div>
          )}

          {/* Google Sign-In (Unrestricted for any user/account) */}
          <div className="space-y-4">
            <GoogleLoginButton
              role={role}
              text={`Continue with Google as ${role === 'recruiter' ? 'Recruiter' : 'Student'}`}
            />

            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-gray-200"></div>
              <span className="bg-white px-3 text-xs text-gray-400 font-medium uppercase tracking-wider relative">
                or sign in with email
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label className="block text-xs font-bold text-[#0B1B43] mb-1.5 uppercase tracking-wide">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#405B8B] absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E0E7F2] text-sm text-[#0B1B43] focus:outline-none focus:ring-2 focus:ring-[#087BFA] bg-[#F4F7FC]/40"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0B1B43] mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#405B8B] absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#E0E7F2] text-sm text-[#0B1B43] focus:outline-none focus:ring-2 focus:ring-[#087BFA] bg-[#F4F7FC]/40"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-[#405B8B] hover:text-[#0B1B43]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-[#405B8B] cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-[#E0E7F2] text-[#087BFA] focus:ring-[#087BFA]"
                />
                <span>Remember me</span>
              </label>
              <Link to="/forgot-password" className="font-semibold text-[#087BFA] hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In to SARATHI
            </Button>
          </form>

          <div className="text-center pt-2 text-xs text-[#405B8B]">
            Don't have an account?{' '}
            <Link to="/signup" className="font-bold text-[#087BFA] hover:underline">
              Create an Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
