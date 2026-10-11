import React, { useState, useEffect } from 'react';
import { Save, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';
import { useStudent } from '../../context/StudentContext';
import { techDomains } from '../../data/domainsCatalog';

export const ProfilePage: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const { targetRole, setTargetRole } = useStudent();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [selectedRole, setSelectedRole] = useState(targetRole || user?.targetRole || '');
  const [institution, setInstitution] = useState(user?.institution || '');
  const [degree, setDegree] = useState(user?.degree || '');
  const [graduationYear, setGraduationYear] = useState(user?.graduationYear || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setInstitution(user.institution || '');
      setDegree(user.degree || '');
      setGraduationYear(user.graduationYear || '');
      setBio(user.bio || '');
    }
  }, [user]);

  useEffect(() => {
    if (targetRole) {
      setSelectedRole(targetRole);
    }
  }, [targetRole]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRole) {
      setTargetRole(selectedRole);
    }
    await updateProfile({
      fullName,
      targetRole: selectedRole || undefined,
      institution,
      degree,
      graduationYear,
      bio
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto pb-12">
      <Card className="p-8 space-y-6">
        <div className="flex items-center gap-4 border-b border-[#E0E7F2] pb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#087BFA] to-[#603DF5] flex items-center justify-center text-white font-bold text-2xl shadow-md">
            {fullName ? fullName.charAt(0).toUpperCase() : 'S'}
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-[#0B1B43]">{fullName || 'Student'}</h2>
            <p className="text-xs text-[#405B8B]">{user?.email}</p>
            <Badge variant="purple" className="mt-1">Student Account</Badge>
          </div>
        </div>

        {savedSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 text-[#16A34A] text-xs font-bold border border-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Profile information saved successfully!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#0B1B43] mb-1 uppercase">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full p-2.5 rounded-xl border border-[#E0E7F2] text-sm text-[#0B1B43]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0B1B43] mb-1 uppercase">Target Career Role</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-[#E0E7F2] text-sm text-[#0B1B43] font-semibold bg-[#F4F7FC]"
            >
              <option value="">-- Select Your Target Role --</option>
              {techDomains.map(domain => (
                <optgroup key={domain.id} label={domain.title}>
                  {domain.roleTitles.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#0B1B43] mb-1 uppercase">Institution / College</label>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="e.g. National Institute of Technology"
                className="w-full p-2.5 rounded-xl border border-[#E0E7F2] text-sm text-[#0B1B43]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0B1B43] mb-1 uppercase">Degree Program</label>
              <input
                type="text"
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
                placeholder="e.g. B.Tech Computer Science"
                className="w-full p-2.5 rounded-xl border border-[#E0E7F2] text-sm text-[#0B1B43]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0B1B43] mb-1 uppercase">Graduation Year</label>
            <input
              type="text"
              value={graduationYear}
              onChange={(e) => setGraduationYear(e.target.value)}
              placeholder="e.g. 2026"
              className="w-full p-2.5 rounded-xl border border-[#E0E7F2] text-sm text-[#0B1B43]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0B1B43] mb-1 uppercase">Bio / Summary</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Brief summary of your background, career interests, and goals..."
              className="w-full p-2.5 rounded-xl border border-[#E0E7F2] text-sm text-[#0B1B43]"
            />
          </div>

          <Button type="submit" variant="primary" leftIcon={<Save className="w-4 h-4" />}>
            Save Profile Changes
          </Button>
        </form>
      </Card>
    </div>
  );
};
