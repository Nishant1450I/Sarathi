import React, { useState } from 'react';
import {
  FolderGit2,
  Plus,
  GitBranch,
  Globe,
  Trash2,
  Edit
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { useStudent } from '../../context/StudentContext';
import type { ProjectItem } from '../../types/project';

export const ProjectsPage: React.FC = () => {
  const { projects, addProject, updateProject, deleteProject } = useStudent();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectItem | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [technologies, setTechnologies] = useState('');
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [liveDemoUrl, setLiveDemoUrl] = useState('');
  const [skillsDemonstrated, setSkillsDemonstrated] = useState('');
  const [error, setError] = useState('');

  const openAddModal = () => {
    setEditingProject(null);
    setTitle('');
    setDescription('');
    setTechnologies('');
    setRepositoryUrl('');
    setLiveDemoUrl('');
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
    setSkillsDemonstrated(proj.skillsDemonstrated.join(', '));
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title || !description || !repositoryUrl) {
      setError('Title, description, and repository URL are required.');
      return;
    }

    if (!repositoryUrl.startsWith('http://') && !repositoryUrl.startsWith('https://')) {
      setError('Repository URL must start with http:// or https://');
      return;
    }

    const techArray = technologies.split(',').map(t => t.trim()).filter(Boolean);
    const skillsArray = skillsDemonstrated.split(',').map(s => s.trim()).filter(Boolean);

    if (editingProject) {
      updateProject({
        ...editingProject,
        title,
        description,
        technologies: techArray,
        repositoryUrl,
        liveDemoUrl: liveDemoUrl || undefined,
        skillsDemonstrated: skillsArray
      });
    } else {
      addProject({
        title,
        description,
        technologies: techArray,
        repositoryUrl,
        liveDemoUrl: liveDemoUrl || undefined,
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
                        : 'blue'
                    }
                  >
                    {proj.verificationStatus === 'verified'
                      ? 'Verified Credential'
                      : proj.verificationStatus === 'evidence-submitted'
                      ? 'Pending Review'
                      : 'Draft Evidence'}
                  </Badge>
                </div>

                <p className="text-xs text-[#405B8B] leading-relaxed">{proj.description}</p>

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
                    rel="noreferrer"
                    className="font-bold text-[#087BFA] hover:underline flex items-center gap-1"
                  >
                    <GitBranch className="w-4 h-4" />
                    <span>Repository</span>
                  </a>

                  {proj.liveDemoUrl && (
                    <a
                      href={proj.liveDemoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-[#16A34A] hover:underline flex items-center gap-1"
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
            <label className="block text-xs font-bold text-[#0B1B43] mb-1">Repository URL (GitHub / GitLab)</label>
            <input
              type="url"
              value={repositoryUrl}
              onChange={(e) => setRepositoryUrl(e.target.value)}
              placeholder="https://github.com/username/repo-name"
              className="w-full p-2.5 rounded-xl border border-[#E0E7F2] text-sm text-[#0B1B43]"
              required
            />
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
