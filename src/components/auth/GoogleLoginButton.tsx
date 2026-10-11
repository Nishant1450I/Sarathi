import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types/user';
import { X, CheckCircle2, Sparkles, KeyRound, ExternalLink } from 'lucide-react';

interface GoogleLoginButtonProps {
  role?: UserRole;
  text?: string;
  className?: string;
  onSuccess?: () => void;
}

export const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({
  role = 'student',
  text = 'Continue with Google',
  className = '',
  onSuccess,
}) => {
  const { loginWithGoogle, isLoading } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>(role);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [customClientId, setCustomClientId] = useState(() => localStorage.getItem('sarathi_google_client_id') || '');
  const [showConfigGuide, setShowConfigGuide] = useState(false);
  const googleBtnContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const activeClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || customClientId;

  // Sync selectedRole when prop changes
  useEffect(() => {
    setSelectedRole(role);
  }, [role]);

  // Load Google Identity Services script
  useEffect(() => {
    if (!document.getElementById('google-gsi-script')) {
      const script = document.createElement('script');
      script.id = 'google-gsi-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, []);

  // Initialize Google OAuth Token Client or Render Button if Client ID is configured
  useEffect(() => {
    if (!activeClientId) return;

    const checkGsi = setInterval(() => {
      const google = (window as any).google;
      if (google?.accounts) {
        clearInterval(checkGsi);

        // 1. Initialize standard ID with select_account
        try {
          google.accounts.id.initialize({
            client_id: activeClientId,
            callback: handleGoogleJwtCredentialResponse,
            auto_select: false,
          });

          // Render official button if container exists
          if (googleBtnContainerRef.current) {
            google.accounts.id.renderButton(googleBtnContainerRef.current, {
              theme: 'outline',
              size: 'large',
              type: 'standard',
              text: 'continue_with',
              shape: 'rectangular',
              logo_alignment: 'left',
              width: 380,
            });
          }
        } catch (e) {
          console.warn('GSI init warning:', e);
        }
      }
    }, 200);

    return () => clearInterval(checkGsi);
  }, [activeClientId, selectedRole]);

  // Handle Google JWT response
  const handleGoogleJwtCredentialResponse = async (response: any) => {
    try {
      setSubmitting(true);
      setError('');
      const base64Url = response.credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const payload = JSON.parse(jsonPayload);

      await loginWithGoogle({
        email: payload.email,
        fullName: payload.name || payload.given_name || 'Google User',
        avatarUrl: payload.picture,
        role: selectedRole,
      });

      onSuccess?.();
      if (selectedRole === 'recruiter') navigate('/recruiter/dashboard');
      else if (selectedRole === 'college') navigate('/college/dashboard');
      else navigate('/student/dashboard');
    } catch (err: any) {
      setError(err.message || 'Google authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Trigger Google's native popup showing all logged-in Google accounts on this PC
  const triggerNativeGoogleAccountChooser = () => {
    const google = (window as any).google;
    if (!google?.accounts?.oauth2) {
      setError('Google Identity Services is loading. Please try again in 1 second.');
      return;
    }

    try {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: activeClientId,
        scope: 'email profile openid',
        prompt: 'select_account', // Forces Google to display the list of all accounts signed in on the PC
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            setError(tokenResponse.error_description || 'Account selection was cancelled');
            return;
          }

          try {
            setSubmitting(true);
            // Fetch Google user profile using the access token
            const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
            });

            if (!userInfoRes.ok) {
              throw new Error('Failed to fetch Google profile information');
            }

            const userInfo = await userInfoRes.json();

            await loginWithGoogle({
              email: userInfo.email,
              fullName: userInfo.name || userInfo.given_name || 'Google User',
              avatarUrl: userInfo.picture,
              role: selectedRole,
            });

            setModalOpen(false);
            onSuccess?.();
            if (selectedRole === 'recruiter') navigate('/recruiter/dashboard');
            else if (selectedRole === 'college') navigate('/college/dashboard');
            else navigate('/student/dashboard');
          } catch (err: any) {
            setError(err.message || 'Failed to authenticate Google user');
          } finally {
            setSubmitting(false);
          }
        },
      });

      // Request token with account selection popup
      client.requestAccessToken({ prompt: 'select_account' });
    } catch (err: any) {
      setError(err.message || 'Failed to open Google account chooser');
    }
  };

  const handleButtonClick = () => {
    setError('');
    if (activeClientId) {
      // Client ID is set -> trigger native Google popup showing accounts on the PC!
      triggerNativeGoogleAccountChooser();
    } else {
      // Client ID not yet set -> open Google dialog with instructions + quick login
      setModalOpen(true);
    }
  };

  const handleSaveCustomClientId = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customClientId.trim()) return;
    localStorage.setItem('sarathi_google_client_id', customClientId.trim());
    triggerNativeGoogleAccountChooser();
  };

  const handleCustomGoogleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter your Google email address');
      return;
    }

    const finalEmail = cleanEmail.includes('@') ? cleanEmail : `${cleanEmail}@gmail.com`;

    try {
      setSubmitting(true);
      const finalName = fullName.trim() || finalEmail.split('@')[0].replace(/[._-]/g, ' ');

      await loginWithGoogle({
        email: finalEmail,
        fullName: finalName,
        role: selectedRole,
      });

      setModalOpen(false);
      onSuccess?.();
      if (selectedRole === 'recruiter') navigate('/recruiter/dashboard');
      else if (selectedRole === 'college') navigate('/college/dashboard');
      else navigate('/student/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickAccount = async (quickEmail: string, quickName: string) => {
    try {
      setSubmitting(true);
      setError('');
      await loginWithGoogle({
        email: quickEmail,
        fullName: quickName,
        role: selectedRole,
      });
      setModalOpen(false);
      onSuccess?.();
      if (selectedRole === 'recruiter') navigate('/recruiter/dashboard');
      else if (selectedRole === 'college') navigate('/college/dashboard');
      else navigate('/student/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={isLoading || submitting}
        className={`w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-[#D0D7E2] bg-white hover:bg-gray-50 text-[#1F2937] font-semibold text-sm transition-all shadow-xs hover:shadow cursor-pointer disabled:opacity-50 ${className}`}
      >
        {/* Official Google 'G' Logo SVG */}
        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
          />
        </svg>
        <span>{submitting ? 'Connecting to Google...' : text}</span>
      </button>

      {/* Hidden container for Google GSI button */}
      <div ref={googleBtnContainerRef} className="hidden" />

      {/* Google Setup & Account Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200">
            {/* Modal Header */}
            <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span className="font-bold text-gray-800 text-lg">Sign in with Google</span>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
              {/* Native Account Picker Explanation Box */}
              <div className="p-3.5 rounded-xl bg-blue-50/90 border border-blue-200 text-xs text-blue-900 space-y-2">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Want the popup with all accounts on your PC?</span>
                    <span>
                      Google requires a free <strong>Client ID</strong> from Google Cloud Console to read your browser accounts.
                    </span>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowConfigGuide(!showConfigGuide)}
                    className="text-blue-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>{showConfigGuide ? 'Hide Client ID Setup' : 'How to add your Client ID (2 min)'}</span>
                  </button>
                </div>

                {showConfigGuide && (
                  <div className="pt-2 border-t border-blue-200/60 space-y-2 text-[11px] text-blue-800">
                    <ol className="list-decimal pl-4 space-y-1">
                      <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="underline font-bold inline-flex items-center gap-0.5">Google Cloud Credentials <ExternalLink className="w-2.5 h-2.5" /></a></li>
                      <li>Click <strong>Create Credentials → OAuth client ID</strong> (Web application)</li>
                      <li>Add <code>http://localhost:5173</code> under <em>Authorized JavaScript origins</em></li>
                      <li>Paste the Client ID below or in your <code>.env</code> file:</li>
                    </ol>

                    <form onSubmit={handleSaveCustomClientId} className="flex gap-1.5 pt-1">
                      <input
                        type="text"
                        value={customClientId}
                        onChange={(e) => setCustomClientId(e.target.value)}
                        placeholder="...apps.googleusercontent.com"
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-blue-300 bg-white text-xs text-gray-800"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shrink-0 cursor-pointer"
                      >
                        Activate Popup
                      </button>
                    </form>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-50 text-red-600 text-xs font-medium border border-red-200">
                  {error}
                </div>
              )}

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Sign in as
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('student')}
                    className={`py-2 rounded-lg transition-all ${
                      selectedRole === 'student'
                        ? 'bg-white text-blue-600 shadow-xs font-bold'
                        : 'text-gray-600'
                    }`}
                  >
                    Student / Candidate
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole('recruiter')}
                    className={`py-2 rounded-lg transition-all ${
                      selectedRole === 'recruiter'
                        ? 'bg-white text-purple-600 shadow-xs font-bold'
                        : 'text-gray-600'
                    }`}
                  >
                    Recruiter / Employer
                  </button>
                </div>
              </div>

              {/* Instant Email Sign-In */}
              <form onSubmit={handleCustomGoogleSubmit} className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Enter any Google or Gmail Account
                  </label>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="yourname@gmail.com"
                    required
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Display Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Authenticating...' : `Sign in as ${selectedRole === 'recruiter' ? 'Recruiter' : 'Student'}`}
                </button>
              </form>

              {/* Quick Select Accounts */}
              <div className="pt-2 border-t border-gray-100">
                <span className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Or instant 1-Click with demo accounts:
                </span>
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => handleQuickAccount('alex.chen.dev@gmail.com', 'Alex Chen')}
                    disabled={submitting}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 text-left text-xs transition-colors border border-transparent hover:border-gray-200"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px]">
                        AC
                      </div>
                      <div>
                        <span className="font-semibold text-gray-800 block">Alex Chen</span>
                        <span className="text-gray-500 text-[11px]">alex.chen.dev@gmail.com</span>
                      </div>
                    </div>
                    <CheckCircle2 className="w-3.5 h-3.5 text-gray-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickAccount('priya.sharma.tech@gmail.com', 'Priya Sharma')}
                    disabled={submitting}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 text-left text-xs transition-colors border border-transparent hover:border-gray-200"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-[10px]">
                        PS
                      </div>
                      <div>
                        <span className="font-semibold text-gray-800 block">Priya Sharma</span>
                        <span className="text-gray-500 text-[11px]">priya.sharma.tech@gmail.com</span>
                      </div>
                    </div>
                    <CheckCircle2 className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
