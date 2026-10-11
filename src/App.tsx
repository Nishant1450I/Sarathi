import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PublicLayout } from './layouts/PublicLayout';
import { StudentLayout } from './layouts/StudentLayout';
import { RecruiterLayout } from './layouts/RecruiterLayout';
import { CollegeLayout } from './layouts/CollegeLayout';

// Public pages
import { LandingPage } from './pages/public/LandingPage';
import { LoginPage } from './pages/public/LoginPage';
import { SignupPage } from './pages/public/SignupPage';
import { ForgotPasswordPage } from './pages/public/ForgotPasswordPage';

// Student pages
import { StudentDashboard } from './pages/student/StudentDashboard';
import { AssessmentPage } from './pages/student/AssessmentPage';
import { SkillGapPage } from './pages/student/SkillGapPage';
import { RoadmapPage } from './pages/student/RoadmapPage';
import { ProjectsPage } from './pages/student/ProjectsPage';
import { OpportunitiesPage } from './pages/student/OpportunitiesPage';
import { SkillPassportPage } from './pages/student/SkillPassportPage';
import { ProfilePage } from './pages/student/ProfilePage';
import { SettingsPage } from './pages/student/SettingsPage';

// Recruiter enterprise platform pages
import { RecruiterDashboard } from './pages/recruiter/RecruiterDashboard';
import { RecruiterJobsPage } from './pages/recruiter/RecruiterJobsPage';
import { RecruiterCandidatesPage } from './pages/recruiter/RecruiterCandidatesPage';
import { RecruiterPipelinePage } from './pages/recruiter/RecruiterPipelinePage';
import { RecruiterVerificationsPage } from './pages/recruiter/RecruiterVerificationsPage';
import { RecruiterAssessmentsPage } from './pages/recruiter/RecruiterAssessmentsPage';
import { RecruiterSkillGapPage } from './pages/recruiter/RecruiterSkillGapPage';
import { RecruiterComparisonsPage } from './pages/recruiter/RecruiterComparisonsPage';
import { RecruiterInterviewsPage } from './pages/recruiter/RecruiterInterviewsPage';
import { RecruiterAnalyticsPage } from './pages/recruiter/RecruiterAnalyticsPage';
import { RecruiterCompanyPage } from './pages/recruiter/RecruiterCompanyPage';
import { RecruiterTeamPage } from './pages/recruiter/RecruiterTeamPage';
import { RecruiterSettingsPage } from './pages/recruiter/RecruiterSettingsPage';

// College Dashboard & 404
import { CollegeDashboard } from './pages/college/CollegeDashboard';
import { NotFoundPage } from './pages/NotFoundPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
          </Route>

          {/* Standalone Auth Pages */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Student Portal Routes (Preserved Intact) */}
          <Route path="/student" element={<StudentLayout />}>
            <Route index element={<Navigate to="/student/dashboard" replace />} />
            <Route path="dashboard" element={<StudentDashboard />} />
            <Route path="assessment" element={<AssessmentPage />} />
            <Route path="skill-gap" element={<SkillGapPage />} />
            <Route path="roadmap" element={<RoadmapPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="opportunities" element={<OpportunitiesPage />} />
            <Route path="skill-passport" element={<SkillPassportPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Recruiter & Employer Enterprise Platform */}
          <Route path="/recruiter" element={<RecruiterLayout />}>
            <Route index element={<Navigate to="/recruiter/dashboard" replace />} />
            <Route path="dashboard" element={<RecruiterDashboard />} />
            <Route path="overview" element={<Navigate to="/recruiter/dashboard" replace />} />
            <Route path="jobs" element={<RecruiterJobsPage />} />
            <Route path="candidates" element={<RecruiterCandidatesPage />} />
            <Route path="pipeline" element={<RecruiterPipelinePage />} />
            <Route path="verifications" element={<RecruiterVerificationsPage />} />
            <Route path="assessments" element={<RecruiterAssessmentsPage />} />
            <Route path="skill-gap" element={<RecruiterSkillGapPage />} />
            <Route path="comparisons" element={<RecruiterComparisonsPage />} />
            <Route path="interviews" element={<RecruiterInterviewsPage />} />
            <Route path="analytics" element={<RecruiterAnalyticsPage />} />
            <Route path="company" element={<RecruiterCompanyPage />} />
            <Route path="team" element={<RecruiterTeamPage />} />
            <Route path="settings" element={<RecruiterSettingsPage />} />
          </Route>

          {/* College Portal */}
          <Route path="/college" element={<CollegeLayout />}>
            <Route index element={<Navigate to="/college/dashboard" replace />} />
            <Route path="dashboard" element={<CollegeDashboard />} />
          </Route>

          {/* Catch-all 404 Route */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
