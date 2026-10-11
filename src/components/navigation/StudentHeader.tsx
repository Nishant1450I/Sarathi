import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Bell, LogOut, ChevronDown, User, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';


interface StudentHeaderProps {
  onMobileMenuToggle: () => void;
  pageTitle: string;
  sectionTitle?: string;
}

export const StudentHeader: React.FC<StudentHeaderProps> = ({
  onMobileMenuToggle,
  pageTitle,
  sectionTitle
}) => {
  const { user, switchDemoRole, logout } = useAuth();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-20 w-full bg-white/90 backdrop-blur-md border-b border-[#E0E7F2] px-4 sm:px-6 py-3.5">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Page Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMobileMenuToggle}
            className="lg:hidden p-2 text-[#0B1B43] hover:bg-slate-100 rounded-lg focus:outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-[#087BFA]"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            {sectionTitle && (
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#8FA1C0] leading-none mb-1">
                <span>Student</span>
                <span>/</span>
                <span className="text-[#405B8B] font-medium">{sectionTitle}</span>
              </div>
            )}
            <h1 className="text-xl font-extrabold text-[#0B1B43] tracking-tight">{pageTitle}</h1>
          </div>
        </div>

        {/* Right Actions: Notifications, User Menu */}
        <div className="flex items-center gap-3">


          {/* Notifications Dropdown Toggle */}
          <div className="relative" ref={notifMenuRef}>
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowProfileMenu(false);
              }}
              className="p-2 text-[#405B8B] hover:text-[#0B1B43] hover:bg-slate-100 rounded-xl relative transition-colors focus-visible:ring-2 focus-visible:ring-[#087BFA]"
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#087BFA] rounded-full ring-2 ring-white animate-pulse" />
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-[#E0E7F2] p-4 z-50">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="font-bold text-sm text-[#0B1B43]">Notifications</span>
                  <span className="text-xs text-[#087BFA] cursor-pointer hover:underline">Mark all read</span>
                </div>
                <div className="py-2 space-y-3">
                  <div className="p-2.5 rounded-xl bg-blue-50/60 text-xs">
                    <p className="font-semibold text-[#0B1B43]">Roadmap Task Ready!</p>
                    <p className="text-[#405B8B] mt-0.5">JWT Authentication & Security task recommended for today.</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50/60 text-xs">
                    <p className="font-semibold text-[#0B1B43]">New Job Match (84%)</p>
                    <p className="text-[#405B8B] mt-0.5">Junior Full-Stack Web Developer at NexTech Innovations.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Profile Menu Dropdown */}
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition-colors focus-visible:ring-2 focus-visible:ring-[#087BFA]"
              aria-label="User profile menu"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#087BFA] to-[#603DF5] flex items-center justify-center text-white font-bold text-xs shadow-xs">
                {user?.fullName ? user.fullName.charAt(0) : 'A'}
              </div>
              <ChevronDown className="w-4 h-4 text-[#405B8B]" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-[#E0E7F2] py-2 z-50">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="font-bold text-xs text-[#0B1B43]">{user?.fullName || 'Student'}</p>
                  <p className="text-[11px] text-[#405B8B]">{user?.email || ''}</p>
                </div>

                {/* Direct Page Navigation */}
                <div className="py-1 border-b border-slate-100">
                  <Link
                    to="/student/profile"
                    onClick={() => setShowProfileMenu(false)}
                    className="w-full text-left px-4 py-2 text-xs text-[#0B1B43] hover:bg-slate-50 flex items-center gap-2.5 font-medium transition-colors"
                  >
                    <User className="w-3.5 h-3.5 text-[#405B8B]" />
                    <span>My Profile</span>
                  </Link>
                  <Link
                    to="/student/settings"
                    onClick={() => setShowProfileMenu(false)}
                    className="w-full text-left px-4 py-2 text-xs text-[#0B1B43] hover:bg-slate-50 flex items-center gap-2.5 font-medium transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5 text-[#405B8B]" />
                    <span>Account Settings</span>
                  </Link>
                </div>
                
                {/* Switch Authorized Role (only for accounts explicitly authorized for multiple roles) */}
                {user?.roles && user.roles.length > 1 && (
                  <div className="py-1">
                    <div className="px-4 py-1.5 text-[10px] font-bold text-[#405B8B] uppercase">Authorized Portals</div>
                    {user.roles.includes('student') && (
                      <button
                        onClick={() => {
                          switchDemoRole('student');
                          setShowProfileMenu(false);
                          navigate('/student/dashboard');
                        }}
                        className="w-full text-left px-4 py-1.5 text-xs text-[#0B1B43] hover:bg-slate-50 flex items-center justify-between cursor-pointer"
                      >
                        <span>Student Portal</span>
                        {user?.role === 'student' && <span className="w-1.5 h-1.5 bg-[#087BFA] rounded-full" />}
                      </button>
                    )}
                    {user.roles.includes('recruiter') && (
                      <button
                        onClick={() => {
                          switchDemoRole('recruiter');
                          setShowProfileMenu(false);
                          navigate('/recruiter/dashboard');
                        }}
                        className="w-full text-left px-4 py-1.5 text-xs text-[#0B1B43] hover:bg-slate-50 flex items-center justify-between cursor-pointer"
                      >
                        <span>Recruiter Platform</span>
                        {user?.role === 'recruiter' && <span className="w-1.5 h-1.5 bg-[#603DF5] rounded-full" />}
                      </button>
                    )}
                    {user.roles.includes('college') && (
                      <button
                        onClick={() => {
                          switchDemoRole('college');
                          setShowProfileMenu(false);
                          navigate('/college/dashboard');
                        }}
                        className="w-full text-left px-4 py-1.5 text-xs text-[#0B1B43] hover:bg-slate-50 flex items-center justify-between cursor-pointer"
                      >
                        <span>College Portal</span>
                        {user?.role === 'college' && <span className="w-1.5 h-1.5 bg-[#16A34A] rounded-full" />}
                      </button>
                    )}
                  </div>
                )}

                <div className="pt-1 border-t border-slate-100">
                  <button
                    onClick={() => logout()}
                    className="w-full text-left px-4 py-2 text-xs text-[#DC2626] font-semibold hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
