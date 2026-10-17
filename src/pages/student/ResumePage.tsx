import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Printer,
  ArrowLeft,
  Mail,
  MapPin,
  GraduationCap,
  GitBranch,
  Link2,
  Globe,
  ExternalLink,
  Award,
  FolderGit2,
  CheckCircle2,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';
import { useStudent } from '../../context/StudentContext';
import { getProficiencyLabel } from '../../types/skill';

export const ResumePage: React.FC = () => {
  const { user } = useAuth();
  const { skills, projects, targetRole, overallReadinessScore } = useStudent();
  const navigate = useNavigate();

  const handlePrint = () => {
    window.print();
  };

  const verifiedSkills = skills.filter(
    (s) => s.status === 'verified' || s.status === 'assessment-completed' || s.status === 'evidence-submitted'
  );

  const displaySkills = verifiedSkills.length > 0 ? verifiedSkills : skills;

  // Group skills by category
  const skillsByCategory = displaySkills.reduce<Record<string, typeof displaySkills>>((acc, s) => {
    const cat = s.category || 'Core Technologies';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-6 pb-16 max-w-4xl mx-auto">
      {/* ACTION TOOLBAR (Hidden in Print) */}
      <div className="no-print flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-[#E0E7F2] shadow-xs">
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/student/dashboard')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Dashboard
          </Button>
          <div>
            <h1 className="text-base font-extrabold text-[#0B1B43]">
              Auto-Generated Skill Resume
            </h1>
            <p className="text-xs text-[#405B8B]">
              Compiled directly from your verified passport credentials and project evidence.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {user?.resumeUrl && (
            <a
              href={user.resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#087BFA] bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>External Document</span>
            </a>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={handlePrint}
            leftIcon={<Printer className="w-4 h-4" />}
          >
            Print / Save PDF
          </Button>
        </div>
      </div>

      {/* PRINT-OPTIMIZED RESUME SHEET */}
      <div className="resume-sheet bg-white p-8 sm:p-12 rounded-2xl border border-[#E0E7F2] shadow-sm space-y-8 text-[#0B1B43]">
        {/* HEADER SECTION */}
        <div className="border-b-2 border-[#0B1B43] pb-6 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
            <div>
              <h1 className="text-3xl font-black text-[#0B1B43] tracking-tight">
                {user?.fullName || 'Candidate Name'}
              </h1>
              <p className="text-base font-bold text-[#087BFA] mt-0.5">
                {user?.headline || targetRole || 'Software Engineer'}
              </p>
            </div>

            {overallReadinessScore !== null && (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl self-start text-xs font-bold text-[#0B1B43]">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Verified Readiness: {overallReadinessScore}%</span>
              </div>
            )}
          </div>

          {/* Contact Details & Links Grid */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-[#405B8B] pt-1">
            {user?.email && (
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <a href={`mailto:${user.email}`} className="hover:underline text-[#0B1B43]">
                  {user.email}
                </a>
              </span>
            )}

            {user?.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{user.location}</span>
              </span>
            )}

            {(user?.degree || user?.institution) && (
              <span className="flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {[user?.degree, user?.institution, user?.graduationYear].filter(Boolean).join(' • ')}
                </span>
              </span>
            )}

            {user?.githubUrl && (
              <span className="flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-slate-400" />
                <a
                  href={user.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline text-[#087BFA] font-medium"
                >
                  GitHub Profile
                </a>
              </span>
            )}

            {user?.linkedinUrl && (
              <span className="flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-slate-400" />
                <a
                  href={user.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline text-[#087BFA] font-medium"
                >
                  LinkedIn
                </a>
              </span>
            )}

            {user?.portfolioUrl && (
              <span className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <a
                  href={user.portfolioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline text-emerald-600 font-medium"
                >
                  Portfolio
                </a>
              </span>
            )}
          </div>
        </div>

        {/* PROFESSIONAL SUMMARY */}
        {user?.bio && (
          <div className="space-y-2">
            <h2 className="text-xs font-black uppercase tracking-wider text-[#0B1B43] border-b border-slate-200 pb-1">
              Professional Summary
            </h2>
            <p className="text-xs leading-relaxed text-[#405B8B]">
              {user.bio}
            </p>
          </div>
        )}

        {/* VERIFIED SKILLS & COMPETENCIES */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1">
            <h2 className="text-xs font-black uppercase tracking-wider text-[#0B1B43] flex items-center gap-1.5">
              <Award className="w-4 h-4 text-[#087BFA]" />
              Verified Competencies & Skills
            </h2>
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">
              Evidence-Backed
            </span>
          </div>

          <div className="space-y-3">
            {Object.entries(skillsByCategory).map(([category, catSkills]) => (
              <div key={category} className="space-y-1.5">
                <span className="text-[11px] font-bold text-[#0B1B43]">{category}:</span>
                <div className="flex flex-wrap gap-1.5">
                  {catSkills.map((s) => (
                    <span
                      key={s.id}
                      className="inline-flex items-center gap-1 text-[11px] bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md font-medium text-[#0B1B43]"
                    >
                      <span>{s.name}</span>
                      <span className="text-[10px] text-[#087BFA] font-bold">
                        (Lvl {s.proficiencyLevel} • {getProficiencyLabel(s.proficiencyLevel)})
                      </span>
                      {s.status === 'verified' && (
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PROJECTS & PROOF OF WORK */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1">
            <h2 className="text-xs font-black uppercase tracking-wider text-[#0B1B43] flex items-center gap-1.5">
              <FolderGit2 className="w-4 h-4 text-[#603DF5]" />
              Projects & Verifiable Proof of Work
            </h2>
            <span className="text-[10px] text-[#405B8B]">
              {projects.length} repository {projects.length === 1 ? 'project' : 'projects'}
            </span>
          </div>

          {projects.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No projects recorded yet.</p>
          ) : (
            <div className="space-y-4">
              {projects.map((proj) => (
                <div key={proj.id} className="space-y-1.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-extrabold text-[#0B1B43]">{proj.title}</h3>
                      <Badge
                        variant={
                          proj.verificationStatus === 'verified'
                            ? 'success'
                            : proj.verificationStatus === 'evidence-submitted'
                            ? 'purple'
                            : 'gray'
                        }
                      >
                        {proj.verificationStatus === 'verified'
                          ? 'Verified'
                          : proj.verificationStatus === 'evidence-submitted'
                          ? 'Submitted'
                          : 'Draft'}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      {proj.repositoryUrl && (
                        <a
                          href={proj.repositoryUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#087BFA] font-bold hover:underline flex items-center gap-1"
                        >
                          <GitBranch className="w-3.5 h-3.5" />
                          <span>Code Repo</span>
                        </a>
                      )}
                      {proj.liveDemoUrl && (
                        <a
                          href={proj.liveDemoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 font-bold hover:underline flex items-center gap-1"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span>Live Demo</span>
                        </a>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-[#405B8B] leading-relaxed">{proj.description}</p>

                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {proj.technologies.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-1.5 py-0.5 rounded"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FOOTER AUDIT NOTE */}
        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[10px] text-[#405B8B]">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#087BFA]" />
            <span>Generated by SARATHI Skill Intelligence Platform • Tamper-Verifiable Evidence</span>
          </div>
          <span>Valid as of {new Date().toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
};
