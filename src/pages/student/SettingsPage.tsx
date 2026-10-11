import React, { useState } from 'react';
import { Settings, Bell, Database, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const SettingsPage: React.FC = () => {
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [roadmapReminders, setRoadmapReminders] = useState(true);
  const [jobMatchAlerts, setJobMatchAlerts] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto pb-12">
      <Card className="p-8 space-y-6">
        <div className="flex items-center gap-3 border-b border-[#E0E7F2] pb-4">
          <Settings className="w-6 h-6 text-[#087BFA]" />
          <div>
            <h2 className="text-xl font-extrabold text-[#0B1B43]">Account & Security Settings</h2>
            <p className="text-xs text-[#405B8B]">Manage security settings, notifications, and backend sync options.</p>
          </div>
        </div>

        {saved && (
          <div className="p-3 rounded-xl bg-emerald-50 text-[#16A34A] text-xs font-bold border border-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Settings updated successfully.</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Notification settings */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-[#0B1B43] flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#603DF5]" /> Notification Preferences
            </h3>

            <div className="space-y-2 text-xs">
              <label className="flex items-center justify-between p-3 rounded-xl bg-[#F4F7FC] border border-[#E0E7F2] cursor-pointer">
                <span>Email digests for learning progress</span>
                <input
                  type="checkbox"
                  checked={emailNotifs}
                  onChange={(e) => setEmailNotifs(e.target.checked)}
                  className="rounded text-[#087BFA] focus:ring-[#087BFA]"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-[#F4F7FC] border border-[#E0E7F2] cursor-pointer">
                <span>Weekly roadmap task reminders</span>
                <input
                  type="checkbox"
                  checked={roadmapReminders}
                  onChange={(e) => setRoadmapReminders(e.target.checked)}
                  className="rounded text-[#087BFA] focus:ring-[#087BFA]"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-[#F4F7FC] border border-[#E0E7F2] cursor-pointer">
                <span>New skill-matched job & internship alerts</span>
                <input
                  type="checkbox"
                  checked={jobMatchAlerts}
                  onChange={(e) => setJobMatchAlerts(e.target.checked)}
                  className="rounded text-[#087BFA] focus:ring-[#087BFA]"
                />
              </label>
            </div>
          </div>

          {/* Database connection state */}
          <div className="space-y-3 pt-4 border-t border-[#E0E7F2]">
            <h3 className="text-sm font-bold text-[#0B1B43] flex items-center gap-2">
              <Database className="w-4 h-4 text-[#087BFA]" /> Backend & Persistence Integration
            </h3>

            <div className="p-4 rounded-2xl bg-slate-50 border border-[#E0E7F2] flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-[#0B1B43] block">SARATHI Database & API Engine</span>
                <span className="text-[#405B8B]">
                  Connected to live SQLite persistence engine
                </span>
              </div>
              <Badge variant="success">
                Connected
              </Badge>
            </div>
          </div>

          <Button type="submit" variant="primary">
            Save Preferences
          </Button>
        </form>
      </Card>
    </div>
  );
};
