import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Logo } from '../../components/common/Logo';
import { Button } from '../../components/common/Button';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) setSubmitted(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#F4F7FC]">
      <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-[#E0E7F2] space-y-6">
        <div className="text-center">
          <Logo size="md" showTagline={false} className="justify-center mb-4" />
          <h2 className="text-2xl font-extrabold text-[#0B1B43]">Reset Your Password</h2>
          <p className="text-xs text-[#405B8B] mt-1">Enter your registered email address to receive password reset instructions.</p>
        </div>

        {submitted ? (
          <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-[#16A34A] mx-auto" />
            <h3 className="font-bold text-sm text-[#0B1B43]">Reset Instructions Sent!</h3>
            <p className="text-xs text-[#405B8B]">
              We have sent an email to <span className="font-bold text-[#0B1B43]">{email}</span> with a secure link to reset your password.
            </p>
            <div className="pt-2">
              <Link to="/login">
                <Button variant="secondary" size="sm">Back to Sign In</Button>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E0E7F2] text-sm text-[#0B1B43] focus:outline-none focus:ring-2 focus:ring-[#087BFA]"
                  required
                />
              </div>
            </div>

            <Button type="submit" variant="primary" size="lg" className="w-full">
              Send Reset Link
            </Button>

            <div className="text-center pt-2">
              <Link to="/login" className="inline-flex items-center gap-1 text-xs font-semibold text-[#405B8B] hover:text-[#0B1B43]">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
