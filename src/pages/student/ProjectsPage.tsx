import React, { useState, useMemo } from 'react';
import {
  FolderGit2,
  Plus,
  GitBranch,
  Globe,
  Trash2,
  Edit,
  ExternalLink,
  Image as ImageIcon
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { useStudent } from '../../context/StudentContext';
import { apiClient } from '../../services/apiClient';
import type { ProjectItem } from '../../types/project';

export const ProjectsPage: React.FC = () => {
  const { user } = useAuth();
  const { projects, addProject, updateProject, deleteProject } = useStudent();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectItem | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [technologies, setTechnologies] = useState('');
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [liveDemoUrl, setLiveDemoUrl] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [skillsDemonstrated, setSkillsDemonstrated] = useState('');
  const [error, setError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  // Calculate language distribution for GitHub card
  const languageDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    projects.forEach((p) => {
      p.technologies.forEach((t) => {
        counts[t] = (counts[t] || 0) + 1;
      });
    });
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    if (total === 0) return [];
    const colors = ['#087BFA', '#603DF5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([lang, count], i) => ({
        name: lang,
        count,
        pct: Math.round((count / total) * 100),
        color: colors[i % colors.length],
      }));
  }, [projects]);

  const handleGithubImport = async () => {
    if (!repositoryUrl || !repositoryUrl.includes('github.com')) {
      setError('Please enter a valid GitHub repository URL first (e.g. https://github.com/owner/repo)');
      return;
    }

    setIsImporting(true);
    setError('');
    try {
      const res = await apiClient.post<{
        success: boolean;
        data: {
          title: string;
          description: string;
          repositoryUrl: string;
          homepage: string;
          languages: string[];
          topics: string[];
        };
      }>('/api/candidates/github/import', { repoUrl: repositoryUrl });

      if (res?.success && res.data) {
        if (!title || title.trim() === '') setTitle(res.data.title);
        if (!description || description.trim() === '') setDescription(res.data.description);
        if (res.data.languages && res.data.languages.length > 0) {
          const combined = Array.from(new Set([...res.data.languages, ...(res.data.topics || [])])).join(', ');
          setTechnologies(combined);
          setSkillsDemonstrated(res.data.languages.slice(0, 3).join(', '));
        }
        if (res.data.homepage && !liveDemoUrl) {
          setLiveDemoUrl(res.data.homepage);
        }
        setImportSuccess(true);
        setTimeout(() => setImportSuccess(false), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Could not auto-fill from GitHub');
    } finally {
      setIsImporting(false);
    }
  };

  const openAddModal = () => {
    setEditingProject(null);
    setTitle('');
    setDescription('');
    setTechnologies('');
    setRepositoryUrl('');
    setLiveDemoUrl('');
    setScreenshotUrl('');
    setSkillsDemonstrated('');
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (proj: ProjectItem) => {
    setEditingProject(proj);
    setTitle(proj.title);
    setDescription(proj.description);
    setTechnologies(proj.technologies.join(', '));
    setRepositoryUrl(proj.repositoryUrl);
    setLiveDemoUrl(proj.liveDemoUrl || '');
    setScreenshotUrl(proj.screenshotUrl || '');
    setSkillsDemonstrated(proj.skillsDemonstrated.join(', '));
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim() || !description.trim() || !repositoryUrl.trim()) {
      setError('Title, description, and repository URL are required.');
      return;
    }

    const GITHUB_REPO_REGEX = /^https?:\/\/(www\.)?github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+/i;
    if (!GITHUB_REPO_REGEX.test(repositoryUrl.trim())) {
      setError('Repository URL is required and must match github.com/{owner}/{repo} (e.g. https://github.com/facebook/react)');
      return;
    }

    const techArray = technologies.split(',').map(t => t.trim()).filter(Boolean);
    const skillsArray = skillsDemonstrated.split(',').map(s => s.trim()).filter(Boolean);

    if (editingProject) {
      updateProject({
        ...editingProject,
        title: title.trim(),
        description: description.trim(),
        technologies: techArray,
        repositoryUrl: repositoryUrl.trim(),
        liveDemoUrl: liveDemoUrl.trim() || undefined,
        screenshotUrl: screenshotUrl.trim() || undefined,
        skillsDemonstrated: skillsArray
      });
    } else {
      addProject({
        title: title.trim(),
        description: description.trim(),
        technologies: techArray,
        repositoryUrl: repositoryUrl.trim(),
        liveDemoUrl: liveDemoUrl.trim() || undefined,
        screenshotUrl: screenshotUrl.trim() || undefined,
        skillsDemonstrated: skillsArray
      });
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* HEADER BAR */}
      <PageHeader
        title="Projects & Proof of Work"
        description="Submit code repositories and live demos to verify your practical skills and build evidence for recruiters."
        badge={
          <Badge variant="purple" icon={<FolderGit2 className="w-3.5 h-3.5" />}>
            PROJECT EVIDENCE PORTFOLIO
          </Badge>
        }
        actions={
          <Button
            variant="primary"
            onClick={openAddModal}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add New Project
          </Button>
        }
      />

      {/* GITHUB DEVELOPER PROFILE CARD */}
      <Card className="p-6 border-[#E0E7F2] bg-gradient-to-r from-slate-900 via-[#0B1B43] to-[#081B3B] text-white shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0">
              <GitBranch className="w-6 h-6 text-[#087BFA]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white">GitHub Developer Profile</h2>
                <Badge variant="purple">Evidence Hub</Badge>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {user?.githubUrl ? (
                  <a
                    href={user.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline text-[#087BFA] font-bold inline-flex items-center gap-1"
                  >
                    <span>{user.githubUrl.replace(/^https?:\/\/(www\.)?github\.com\//, '@')}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span>Connect your GitHub repository URLs below to build verifiable evidence.</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 self-start md:self-auto">
            <div className="text-left md:text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Public Repositories
              </span>
              <span className="text-2xl font-black text-white">{projects.length}</span>
            </div>
          </div>
        </div>

        {/* Top Languages Breakdown Bar */}
        {languageDistribution.length > 0 && (
          <div className="mt-5 pt-4 border-t border-white/10 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <span className="font-bold text-slate-300">Top Languages Across Repositories</span>
              <div className="flex flex-wrap items-center gap-3">
                {languageDistribution.map((l) => (
                  <div key={l.name} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color }} />
                    <span className="font-semibold">{l.name}</span>
                    <span className="text-slate-400">({l.pct}%)</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden flex bg-white/10 p-0.5">
              {languageDistribution.map((l) => (
                <div
                  key={l.name}
                  style={{ width: `${l.pct}%`, backgroundColor: l.color }}
                  title={`${l.name}: ${l.pct}%`}
                  className="h-full rounded-xs transition-all"
                />
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* PROJECTS LIST GRID */}
      {projects.length === 0 ? (
        <Card className="max-w-2xl mx-auto">
          <EmptyState
            icon={<FolderGit2 className="w-8 h-8" />}
            title="No projects added yet"
            description="Add your first project to start building evidence of your skills. Code repositories and live demos serve as verifiable proof for recruiters."
            variant="blue"
            action={
              <Button
                variant="primary"
                onClick={openAddModal}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Your First Project
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((proj) => (
            <Card key={proj.id} hoverEffect className="space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="text-lg font-bold text-[#0B1B43] leading-snug">{proj.title}</h3>
                  <Badge
                    variant={
                      proj.verificationStatus === 'verified'
                        ? 'success'
                        : proj.verificationStatus === 'evidence-submitted'
                        ? 'purple'
                        : proj.verificationStatus === 'rejected'
                        ? 'danger'
                        : 'blue'
                    }
                  >
                    {proj.verificationStatus === 'verified'
                      ? 'Verified Credential'
                      : proj.verificationStatus === 'evidence-submitted'
                      ? 'Pending Review'
                      : proj.verificationStatus === 'rejected'
                      ? 'Needs Revision'
                      : 'Draft Evidence'}
                  </Badge>
                </div>

                <p className="text-xs text-[#405B8B] leading-relaxed">{proj.description}</p>

                {/* Reviewer Note if present */}
                {proj.reviewerNote && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-0.5">
                    <span className="font-bold text-[#0B1B43] block">Reviewer Feedback:</span>
                    <span className="text-[#405B8B] leading-relaxed">{proj.reviewerNote}</span>
                  </div>
                )}

                {/* Screenshot preview if present */}
                {proj.screenshotUrl && (
                  <div className="pt-1">
                    <a
                      href={proj.screenshotUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-[#087BFA] hover:underline font-semibold"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>View Screenshot Preview</span>
                    </a>
                  </div>
                )}

                {/* Tech stack tags */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#0B1B43] uppercase tracking-wide">Technologies:</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {proj.technologies.map(tech => (
                      <span key={tech} className="text-[11px] bg-slate-100 text-[#0B1B43] px-2 py-0.5 rounded-md font-semibold">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Demonstrated Skills */}
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] font-bold text-[#603DF5] uppercase tracking-wide">Demonstrated Skills:</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {proj.skillsDemonstrated.map(skill => (
                      <span key={skill} className="text-[11px] bg-purple-50 text-[#603DF5] px-2 py-0.5 rounded-md font-semibold">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Links & Actions */}
              <div className="pt-4 border-t border-[#E0E7F2] flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3">
                  <a
                    href={proj.repositoryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-[#087BFA] hover:underline flex items-center gap-1.5"
                  >
                    <GitBranch className="w-4 h-4" />
                    <span>Open Repo</span>
                  </a>

                  {proj.liveDemoUrl && (
                    <a
                      href={proj.liveDemoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-[#16A34A] hover:underline flex items-center gap-1.5"
                    >
                      <Globe className="w-4 h-4" />
                      <span>Live Demo</span>
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(proj)}
                    className="p-1.5 text-slate-400 hover:text-[#087BFA] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => deleteProject(proj.id)}
                    className="p-1.5 text-slate-400 hover:text-[#DC2626] hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ADD / EDIT PROJECT MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProject ? 'Edit Project Details' : 'Add New Project Evidence'}
        subtitle="Submit code repository and demo links to verify skills in your passport."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-[#DC2626] text-xs font-medium border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#0B1B43] mb-1">Project Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. DevTracker Task & Analytics Web App"
              className="w-full p-2.5 rounded-xl border border-[#E0E7F2] text-sm text-[#0B1B43]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0B1B43] mb-1">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of features, architecture, and problems solved..."
              className="w-full p-2.5 rounded-xl border border-[#E0E7F2] text-sm text-[#0B1B43]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0B1B43] mb-1">Technologies Used (comma separated)</label>
            <input
              type="text"
              value={technologies}
              onChange={(e) => setTechnologies(e.target.value)}
              placeholder="React, TypeScript, Node.js, PostgreSQL, Tailwind"
              className="w-full p-2.5 rounded-xl border border-[#E0E7F2] text-sm text-[#0B1B43]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-[#0B1B43]">Repository URL (GitHub / GitLab)</label>
              <button
                type="button"
                onClick={handleGithubImport}
                disabled={isImporting}
                className="text-[11px] font-bold text-[#087BFA] hover:text-[#065ec0] flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <GitBranch className="w-3 h-3" />
                {isImporting ? 'Importing...' : 'Auto-fill from GitHub'}
              </button>
            </div>
            <input
              type="url"
              value={repositoryUrl}
              onChange={(e) => setRepositoryUrl(e.target.value)}
              placeholder="https://github.com/username/repo-name"
              className="w-full p-2.5 rounded-xl border border-[#E0E7F2] text-sm text-[#0B1B43]"
              required
            />
            {importSuccess && (
              <p className="text-[11px] text-emerald-600 font-bold mt-1">Repository metadata imported successfully!</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0B1B43] mb-1">Live Demo URL (Optional)</label>
            <input
              type="url"
              value={liveDemoUrl}
              onChange={(e) => setLiveDemoUrl(e.target.value)}
              placeholder="https://my-app.vercel.app"
              className="w-full p-2.5 rounded-xl border border-[#E0E7F2] text-sm text-[#0B1B43]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0B1B43] mb-1">Project Screenshot / Preview URL (Optional)</label>
            <input
              type="url"
              value={screenshotUrl}
              onChange={(e) => setScreenshotUrl(e.target.value)}
              placeholder="https://images.unsplash.com/... or cloud image URL"
              className="w-full p-2.5 rounded-xl border border-[#E0E7F2] text-sm text-[#0B1B43]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0B1B43] mb-1">Demonstrated Skills (comma separated)</label>
            <input
              type="text"
              value={skillsDemonstrated}
              onChange={(e) => setSkillsDemonstrated(e.target.value)}
              placeholder="React.js, Node.js & Express, RESTful API Design"
              className="w-full p-2.5 rounded-xl border border-[#E0E7F2] text-sm text-[#0B1B43]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#E0E7F2]">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editingProject ? 'Save Changes' : 'Submit Project'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
