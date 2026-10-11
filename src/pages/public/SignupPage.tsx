import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, CheckCircle2, ArrowRight } from 'lucide-react';
import { Logo } from '../../components/common/Logo';
import { Button } from '../../components/common/Button';
import { GoogleLoginButton } from '../../components/auth/GoogleLoginButton';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types/user';


export const SignupPage: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [error, setError] = useState('');

  const { signup, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName || !email || !password || !confirmPassword) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      await signup(fullName, email, role);
      if (role === 'recruiter') navigate('/recruiter/dashboard');
      else if (role === 'college') navigate('/college/dashboard');
      else navigate('/student/dashboard');
    } catch (err: any) {
      setError(err.message || 'Signup failed.');
    }
  };

  return (
    <div className="min-h-screen flex bg-[#F4F7FC]">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#0B1B43] via-[#603DF5] to-[#087BFA] p-12 text-white flex-col justify-between relative overflow-hidden">
        <div className="relative z-10">
          <Logo size="lg" lightMode={true} showTagline={true} />
        </div>

        <div className="relative z-10 space-y-6 max-w-lg">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight">
            Start Your Journey With SARATHI AI.
          </h1>
          <p className="text-blue-100 text-sm leading-relaxed">
            Create your profile to assess skills, receive a personalized roadmap, and unlock verifiable career credentials.
          </p>

          <div className="space-y-3 pt-2 text-xs">
            <div className="p-4 rounded-2xl bg-white/10 border border-white/10 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>For Students: Get tailored skill gap analysis and step-by-step roadmaps.</span>
            </div>
            <div className="p-4 rounded-2xl bg-white/10 border border-white/10 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-purple-300 shrink-0" />
              <span>For Recruiters: Access candidate skill profiles backed by code repositories.</span>
            </div>
            <div className="p-4 rounded-2xl bg-white/10 border border-white/10 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-blue-300 shrink-0" />
              <span>For Colleges: View aggregate batch readiness and skill distribution analytics.</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-blue-200">
          Already have an account? <Link to="/login" className="underline font-bold text-white">Sign In</Link>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-6 bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-[#E0E7F2]">
          <div className="lg:hidden text-center mb-4">
            <Logo size="md" showTagline={true} className="justify-center" />
          </div>

          <div>
            <h2 className="text-2xl font-extrabold text-[#0B1B43]">Create an Account</h2>
            <p className="text-xs text-[#405B8B] mt-1">Select your role and enter your details to get started.</p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-[#DC2626] text-xs font-medium border border-red-200">
              {error}
            </div>
          )}

          {/* Google Sign-Up Button */}
          <div className="space-y-4">
            <GoogleLoginButton
              role={role}
              text={`Sign up with Google as ${role === 'recruiter' ? 'Recruiter' : 'Student'}`}
            />

            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-gray-200"></div>
              <span className="bg-white px-3 text-xs text-gray-400 font-medium uppercase tracking-wider relative">
                or sign up with email
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role selection */}
            <div>
              <label className="block text-xs font-bold text-[#0B1B43] mb-1.5 uppercase tracking-wide">
                Select Your Role
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('student')}
                  className={`p-3 rounded-xl border text-xs font-bold text-center transition-all ${
                    role === 'student'
                      ? 'border-[#087BFA] bg-blue-50/80 text-[#087BFA]'
                      : 'border-[#E0E7F2] text-[#405B8B] hover:bg-slate-50'
                  }`}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setRole('recruiter')}
                  className={`p-3 rounded-xl border text-xs font-bold text-center transition-all ${
                    role === 'recruiter'
                      ? 'border-[#603DF5] bg-purple-50/80 text-[#603DF5]'
                      : 'border-[#E0E7F2] text-[#405B8B] hover:bg-slate-50'
                  }`}
                >
                  Recruiter
                </button>
                <button
                  type="button"
                  onClick={() => setRole('college')}
                  className={`p-3 rounded-xl border text-xs font-bold text-center transition-all ${
                    role === 'college'
                      ? 'border-[#16A34A] bg-emerald-50/80 text-[#16A34A]'
                      : 'border-[#E0E7F2] text-[#405B8B] hover:bg-slate-50'
                  }`}
                >
                  College
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0B1B43] mb-1 uppercase tracking-wide">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#405B8B] absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#E0E7F2] text-sm text-[#0B1B43] focus:outline-none focus:ring-2 focus:ring-[#087BFA]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0B1B43] mb-1 uppercase tracking-wide">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#405B8B] absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@example.com"
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#E0E7F2] text-sm text-[#0B1B43] focus:outline-none focus:ring-2 focus:ring-[#087BFA]"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#0B1B43] mb-1 uppercase tracking-wide">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#405B8B] absolute left-3 top-3" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E0E7F2] text-sm text-[#0B1B43] focus:outline-none focus:ring-2 focus:ring-[#087BFA]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0B1B43] mb-1 uppercase tracking-wide">
                  Confirm
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#405B8B] absolute left-3 top-3" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E0E7F2] text-sm text-[#0B1B43] focus:outline-none focus:ring-2 focus:ring-[#087BFA]"
                    required
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full mt-2"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Create {role === 'student' ? 'Student' : role === 'recruiter' ? 'Recruiter' : 'College'} Account
            </Button>
          </form>

          <div className="text-center text-xs text-[#405B8B]">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-[#087BFA] hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
