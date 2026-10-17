import React, { useState, useEffect } from 'react';
import {
  Award,
  Printer,
  ShieldCheck,
  FolderGit2,
  GraduationCap,
  Share2,
  Clock,
  ExternalLink,
  Copy,
  Check,
  X,
  Globe
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Logo } from '../../components/common/Logo';
import { useStudent } from '../../context/StudentContext';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/apiClient';

export const SkillPassportPage: React.FC = () => {
  const { user } = useAuth();
  const {
    targetRole,
    skills,
    projects,
    roadmap,
    overallReadinessScore,
    assessedSkillsCount
  } = useStudent();

  const [shareData, setShareData] = useState<{ publicId: string; isEnabled: boolean } | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchShare = async () => {
      try {
        const res = await apiClient.get<{ success: boolean; data: { publicId: string; isEnabled: boolean } }>('/api/passport/share');
        if (res?.success) {
          setShareData(res.data);
        }
      } catch (err) {
        console.warn('Failed to fetch passport share info', err);
      }
    };
    fetchShare();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleToggleShare = async () => {
    setIsToggling(true);
    try {
      const res = await apiClient.post<{ success: boolean; data: { publicId: string; isEnabled: boolean } }>('/api/passport/share/toggle', {});
      if (res?.success) {
        setShareData(res.data);
      }
    } catch (err) {
      console.error('Failed to toggle share state', err);
    } finally {
      setIsToggling(false);
    }
  };

  const publicUrl = shareData ? `${window.location.origin}/passport/${shareData.publicId}` : '';

  const handleCopyLink = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const isVerified = skills.some(s => s.status === 'verified') || projects.some(p => p.verificationStatus === 'verified');

  const getStatusBadge = (status: string, level: number) => {
    switch (status) {
      case 'verified':
        return { variant: 'success' as const, label: `Level ${level} • Verified Credential` };
      case 'assessment-completed':
        return { variant: 'blue' as const, label: `Level ${level} • Diagnostic Evaluated` };
      case 'evidence-submitted':
        return { variant: 'purple' as const, label: `Level ${level} • Pending Review` };
      default:
        return { variant: 'gray' as const, label: `Level ${level} • Self-Reported` };
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* ACTION BAR (Hidden during printing) */}
      <div className="no-print flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E0E7F2] shadow-sm">
        <div>
          <Badge variant="purple" icon={<Award className="w-3.5 h-3.5" />}>VERIFIABLE CREDENTIAL PASSPORT</Badge>
          <h2 className="text-2xl font-extrabold text-[#0B1B43] mt-1">Skill Passport</h2>
          <p className="text-xs text-[#405B8B]">Official evidence profile for recruiters and academic partners.</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => setShowShareModal(true)}
            leftIcon={<Share2 className="w-4 h-4" />}
          >
            Share Link
          </Button>

          <Button
            variant="purple"
            onClick={handlePrint}
            leftIcon={<Printer className="w-4 h-4" />}
          >
            Export / Print Passport
          </Button>
        </div>
      </div>

      {/* PRINT-FRIENDLY PASSPORT CARD CONTAINER */}
      <div className="print-card bg-white rounded-2xl border border-[#E0E7F2] p-8 sm:p-10 shadow-lg space-y-8 max-w-4xl mx-auto">
        {/* PASSPORT HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start border-b border-[#E0E7F2] pb-6 gap-4">
          <div className="space-y-2">
            <Logo size="md" showTagline={true} />
            <h1 className="text-3xl font-black text-[#0B1B43] pt-2">{user?.fullName || 'Student'}</h1>
            <p className="text-sm font-bold text-[#087BFA]">
              Target Role: {targetRole || 'Not selected yet'}
            </p>
            <div className="flex items-center gap-4 text-xs text-[#405B8B] pt-1">
              <span className="flex items-center gap-1 font-medium">
                <GraduationCap className="w-4 h-4 text-[#603DF5]" />{' '}
                {user?.institution || 'Institution not specified'}
              </span>
              <span>•</span>
              <span>
                {user?.degree || 'Degree not specified'}{' '}
                {user?.graduationYear ? `(${user.graduationYear})` : ''}
              </span>
            </div>
          </div>

          <div className="text-left sm:text-right space-y-2 shrink-0">
            <div className="inline-flex flex-col items-start sm:items-end">
              <span className="text-[10px] font-bold text-[#405B8B] uppercase">Readiness Index</span>
              <div className="text-3xl sm:text-4xl font-black text-[#087BFA]">
                {overallReadinessScore !== null ? `${overallReadinessScore}%` : 'Not assessed'}
              </div>
              <span className="text-[11px] font-medium text-[#405B8B] mt-0.5">
                {assessedSkillsCount} evaluated {assessedSkillsCount === 1 ? 'skill' : 'skills'}
              </span>
            </div>
            <div className="block">
              {isVerified ? (
                <Badge variant="success" icon={<ShieldCheck className="w-3.5 h-3.5" />}>
                  Verified Credential Status
                </Badge>
              ) : (
                <Badge variant="purple" icon={<Clock className="w-3.5 h-3.5" />}>
                  Awaiting Assessment & Verification
                </Badge>
              )}
            </div>
            <span className="text-[10px] text-[#405B8B] block">
              Passport ID: {user?.id ? `SAR-${user.id.slice(-6).toUpperCase()}` : 'SAR-PENDING'}
            </span>
          </div>
        </div>

        {/* SECTION 1: EVALUATED SKILLS MATRIX */}
        <div className="space-y-4">
          <h3 className="text-lg font-extrabold text-[#0B1B43] border-l-4 border-l-[#087BFA] pl-3">
            Assessed Skill Matrix
          </h3>

          {skills.length === 0 ? (
            <div className="p-6 rounded-2xl bg-[#F4F7FC]/70 border border-[#E0E7F2] text-xs text-[#405B8B] text-center">
              No skills assessed yet. Complete your diagnostic skill assessment to populate verified proficiency levels.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {skills.map((skill) => {
                const badgeInfo = getStatusBadge(skill.status, skill.proficiencyLevel);
                return (
                  <div key={skill.id} className="p-3.5 rounded-2xl bg-[#F4F7FC] border border-[#E0E7F2] flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-[#0B1B43] block">{skill.name}</span>
                      <span className="text-[11px] text-[#405B8B]">Category: {skill.category}</span>
                    </div>

                    <div className="text-right space-y-1">
                      <Badge variant={badgeInfo.variant} size="sm">
                        {badgeInfo.label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 2: VERIFIED PROJECTS PORTFOLIO */}
        <div className="space-y-4 pt-4 border-t border-[#E0E7F2]">
          <h3 className="text-lg font-extrabold text-[#0B1B43] border-l-4 border-l-[#603DF5] pl-3">
            Verified Project Evidence ({projects.length})
          </h3>

          {projects.length === 0 ? (
            <div className="p-6 rounded-2xl bg-[#F4F7FC]/70 border border-[#E0E7F2] text-xs text-[#405B8B] text-center">
              No project evidence submitted yet. Add code repositories and live demos to demonstrate verified practical skills.
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map((proj) => (
                <div key={proj.id} className="p-4 rounded-2xl border border-[#E0E7F2] space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-sm text-[#0B1B43]">{proj.title}</h4>
                    <Badge variant={proj.verificationStatus === 'verified' ? 'success' : 'purple'} size="sm">
                      {proj.verificationStatus}
                    </Badge>
                  </div>

                  <p className="text-[#405B8B]">{proj.description}</p>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2">
                    <div className="flex gap-1 flex-wrap">
                      {proj.skillsDemonstrated.map(s => (
                        <span key={s} className="bg-purple-50 text-[#603DF5] px-2 py-0.5 rounded text-[10px] font-bold">
                          {s}
                        </span>
                      ))}
                    </div>

                    <a
                      href={proj.repositoryUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-[#087BFA] hover:underline flex items-center gap-1 truncate max-w-full sm:max-w-xs shrink-0"
                    >
                      <FolderGit2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{proj.repositoryUrl.replace('https://', '')}</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 3: LEARNING MILESTONES */}
        <div className="pt-4 border-t border-[#E0E7F2] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-[#405B8B]">
          <div>
            <span className="font-bold text-[#0B1B43]">Learning Roadmap Milestones: </span>
            <span>
              {!roadmap
                ? 'Roadmap not created yet'
                : `${roadmap.overallProgress}% Completed across ${roadmap.stages.length} stages`}
            </span>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-[10px] uppercase font-bold text-[#405B8B] block">Issuing Platform</span>
            <span className="font-bold text-[#0B1B43]">SARATHI AI Platform</span>
          </div>
        </div>
      </div>

      {/* SHARE MODAL */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-[#0B1B43]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#E0E7F2] space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-50 text-[#603DF5] rounded-xl">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[#0B1B43]">Share Skill Passport</h3>
                  <p className="text-xs text-[#405B8B]">Create a public, tamper-verifiable credential link</p>
                </div>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1 text-[#405B8B] hover:text-[#0B1B43] rounded-lg hover:bg-[#F4F7FC]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E0E7F2] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-[#0B1B43]">Public Link Access</p>
                  <p className="text-xs text-[#405B8B]">
                    {shareData?.isEnabled
                      ? 'Anyone with this link can view your verified credential profile.'
                      : 'Public access is disabled. The link will show an unavailable notice.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleShare}
                  disabled={isToggling}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    shareData?.isEnabled ? 'bg-[#087BFA]' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      shareData?.isEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {shareData?.isEnabled && (
                <div className="pt-2">
                  <label className="text-xs font-semibold text-[#405B8B] block mb-1">Public Passport URL</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={publicUrl}
                      className="flex-1 bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-xs font-mono text-[#0B1B43] focus:outline-none select-all"
                    />
                    <Button
                      variant={copied ? 'success' : 'outline'}
                      size="sm"
                      onClick={handleCopyLink}
                      leftIcon={copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              {shareData?.isEnabled ? (
                <a
                  href={`/passport/${shareData.publicId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-[#087BFA] hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Preview Public View
                </a>
              ) : (
                <span className="text-xs text-amber-600 font-medium">Enable public access to share</span>
              )}

              <Button variant="primary" onClick={() => setShowShareModal(false)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
