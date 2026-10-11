import React, { useState } from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { StudentSidebar, studentNavSections } from '../components/navigation/StudentSidebar';
import { StudentHeader } from '../components/navigation/StudentHeader';
import { StudentProvider } from '../context/StudentContext';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const StudentLayout: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();

  if (isLoading) {
    return <LoadingSpinner fullScreen variant="blue" message="Loading student portal..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Enforce role authorization: users without student authorization are redirected to their portal
  if (user.role !== 'student' && !user.roles?.includes('student')) {
    const redirectPath = user.role === 'recruiter' ? '/recruiter/dashboard' : '/college/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  const getPageMeta = (path: string) => {
    for (const section of studentNavSections) {
      const item = section.items.find(
        i => path === i.path || (i.path !== '/student/dashboard' && path.startsWith(i.path))
      );
      if (item) {
        return {
          section: section.title,
          title: item.label === 'Dashboard' ? 'Student Dashboard' : item.label,
        };
      }
    }
    if (path.startsWith('/student/settings')) {
      return { section: 'Account', title: 'Account Settings' };
    }
    return { section: 'Student Portal', title: 'Student Portal' };
  };

  const pageMeta = getPageMeta(location.pathname);

  return (
    <StudentProvider>
      <div className="min-h-screen flex bg-[#F4F7FC]">
        <StudentSidebar
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <StudentHeader
            onMobileMenuToggle={() => setMobileSidebarOpen(true)}
            pageTitle={pageMeta.title}
            sectionTitle={pageMeta.section}
          />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </StudentProvider>
  );
};
