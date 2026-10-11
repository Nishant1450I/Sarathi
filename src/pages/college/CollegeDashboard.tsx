import React, { useState } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Download,
  RefreshCw,
  Award,
  CheckCircle2,
  Users,
  Briefcase,
  ShieldCheck,
  Building2,
  ArrowUpRight,
  GraduationCap,
  BookOpen,
  ShieldAlert
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  CartesianGrid
} from 'recharts';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { ProgressBar } from '../../components/common/ProgressBar';
import { PageHeader } from '../../components/common/PageHeader';
import { mockCollegeAnalyticsData } from '../../data/mockRecruiterCollege';
import { useAuth } from '../../context/AuthContext';

export const CollegeDashboard: React.FC = () => {
  const { user } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');
  const data = mockCollegeAnalyticsData;
  const institutionName = user?.institution || data.institutionName;

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  // Department / Cohort performance breakdown data
  const departmentsData = [
    {
      id: 'cse',
      name: 'Computer Science & Engineering',
      code: 'CSE',
      studentsCount: 160,
      assessedRate: 92,
      avgReadiness: 82,
      placedRate: 81,
      topSkill: 'React.js & Cloud',
      atRiskCount: 8
    },
    {
      id: 'it',
      name: 'Information Technology',
      code: 'IT',
      studentsCount: 120,
      assessedRate: 88,
      avgReadiness: 78,
      placedRate: 74,
      topSkill: 'Node.js & Databases',
      atRiskCount: 11
    },
    {
      id: 'ai-ds',
      name: 'AI & Data Science',
      code: 'AI/DS',
      studentsCount: 80,
      assessedRate: 85,
      avgReadiness: 79,
      placedRate: 70,
      topSkill: 'Python & Machine Learning',
      atRiskCount: 7
    },
    {
      id: 'ece',
      name: 'Electronics & Communication',
      code: 'ECE',
      studentsCount: 60,
      assessedRate: 65,
      avgReadiness: 66,
      placedRate: 58,
      topSkill: 'Embedded C & Python',
      atRiskCount: 16
    }
  ];

  // Campus Placement Drives Schedule & Status
  const placementDrives = [
    {
      id: 'drive-1',
      company: 'Razorpay Technologies',
      role: 'Full-Stack Software Engineer',
      package: '₹14 - 18 LPA',
      date: 'Next Week (Oct 18)',
      status: 'upcoming',
      eligibleStudents: 142,
      appliedCount: 118
    },
    {
      id: 'drive-2',
      company: 'TCS Digital & Innovator',
      role: 'System Engineer & Cloud Specialist',
      package: '₹7.5 - 11 LPA',
      date: 'In Progress (Oct 10-14)',
      status: 'active',
      eligibleStudents: 220,
      appliedCount: 184
    },
    {
      id: 'drive-3',
      company: 'Swiggy / Bundl Technologies',
      role: 'Backend & Platform Engineer',
      package: '₹16 - 22 LPA',
      date: 'Completed (Sep 28)',
      status: 'completed',
      eligibleStudents: 95,
      appliedCount: 82,
      offersReleased: 14
    }
  ];

  // At-risk students requiring early intervention
  const atRiskStudents = [
    {
      id: 'stu-101',
      name: 'Vikram Joshi',
      department: 'ECE',
      readinessScore: 52,
      missingCoreSkills: ['Data Structures', 'Git & GitHub'],
      status: 'Needs Immediate Mentoring'
    },
    {
      id: 'stu-102',
      name: 'Ananya Deshmukh',
      department: 'IT',
      readinessScore: 56,
      missingCoreSkills: ['Unit Testing', 'TypeScript'],
      status: 'Roadmap Remediation Assigned'
    },
    {
      id: 'stu-103',
      name: 'Karan Singhal',
      department: 'CSE',
      readinessScore: 58,
      missingCoreSkills: ['SQL & Databases', 'System Design'],
      status: 'Needs Diagnostic Retest'
    }
  ];

  const handleExport = () => {
    const reportData = {
      institution: institutionName,
      generatedAt: new Date().toISOString(),
      metrics: {
        totalStudentsEnrolled: data.totalStudentsEnrolled,
        assessmentsCompleted: data.assessmentsCompleted,
        avgReadinessScore: data.avgReadinessScore,
        roadmapCompletionRate: data.roadmapCompletionRate,
        verifiedPassportRate: 78
      },
      placementOutcomes: {
        offersAccepted: 348,
        inInterviewPipelines: 112,
        verifiedPassports: 410,
        activeEmployerPartners: 18
      },
      departments: departmentsData,
      placementDrives,
      atRiskCount: 42,
      skillGaps: data.commonSkillGaps,
      readinessTrends: data.readinessTrends
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${institutionName.replace(/\s+/g, '_')}_placement_intelligence_report.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* 1. HEADER BAR WITH EXPORT & REFRESH */}
      <PageHeader
        title={institutionName}
        description="Institutional placement intelligence, batch skill readiness, departmental benchmarks, and employer placement drive tracking."
        badge={
          <Badge variant="emerald" dot>
            COLLEGE & INSTITUTIONAL PORTAL
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="w-4 h-4 text-[#087BFA]" />}
              onClick={handleExport}
            >
              Export Report
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isRefreshing}
              leftIcon={<RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
              onClick={handleRefresh}
            >
              Sync Analytics
            </Button>
          </div>
        }
      />

      {/* 2. 4 INSTITUTIONAL STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card hoverEffect borderAccent="blue" className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#405B8B] uppercase tracking-wider">Total Enrolled</span>
              <div className="p-2 rounded-xl bg-blue-50 text-[#087BFA]">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-[#0B1B43] tracking-tight mb-1">{data.totalStudentsEnrolled}</div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-[#087BFA] font-bold">CSE, IT, AI/DS & ECE</span>
            <span className="text-slate-400 font-medium">Batch of 2026</span>
          </div>
        </Card>

        <Card hoverEffect borderAccent="purple" className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#405B8B] uppercase tracking-wider">Diagnostic Tests Taken</span>
              <div className="p-2 rounded-xl bg-purple-50 text-[#603DF5]">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-[#0B1B43] tracking-tight mb-1">{data.assessmentsCompleted}</div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-[#603DF5] font-bold">82.1% Cohort Participation</span>
            <span className="text-slate-400 font-medium">Objective Tests</span>
          </div>
        </Card>

        <Card hoverEffect borderAccent="green" className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#405B8B] uppercase tracking-wider">Average Readiness Score</span>
              <div className="p-2 rounded-xl bg-emerald-50 text-[#16A34A]">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-[#16A34A] tracking-tight mb-1">{data.avgReadinessScore}%</div>
          </div>
          <div className="space-y-1.5 pt-1">
            <ProgressBar progress={data.avgReadinessScore} color="green" size="sm" />
            <span className="text-[11px] text-[#405B8B] block truncate">+8% Above Regional Benchmark</span>
          </div>
        </Card>

        <Card hoverEffect borderAccent="amber" className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#405B8B] uppercase tracking-wider">Verified Passport Rate</span>
              <div className="p-2 rounded-xl bg-amber-50 text-[#D97706]">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-[#D97706] tracking-tight mb-1">78%</div>
          </div>
          <div className="space-y-1.5 pt-1">
            <ProgressBar progress={78} color="amber" size="sm" />
            <span className="text-[11px] text-[#405B8B] block truncate">328 Students with Verified Repos</span>
          </div>
        </Card>
      </div>

      {/* 3. PLACEMENT OUTCOMES & RECRUITER PIPELINE INTELLIGENCE */}
      <div className="bg-white rounded-3xl border border-[#E0E7F2] p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="indigo" size="xs">Institutional Outcomes</Badge>
              <span className="text-xs font-bold text-slate-400">• Verified Placement Statistics</span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-[#0B1B43] tracking-tight">
              Placement Readiness & Career Outcomes Summary
            </h2>
          </div>
          <div className="text-xs text-[#405B8B] bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 self-start sm:self-auto font-medium">
            Live Synchronized Cohort Data
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100/80 space-y-1">
            <div className="flex items-center justify-between text-emerald-700">
              <span className="text-[11px] font-bold uppercase tracking-wider">Offers Accepted</span>
              <Briefcase className="w-4 h-4" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-800">348</div>
            <p className="text-[11px] text-emerald-700/80 font-medium">72.5% of graduating cohort placed</p>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100/80 space-y-1">
            <div className="flex items-center justify-between text-indigo-700">
              <span className="text-[11px] font-bold uppercase tracking-wider">Active In Pipeline</span>
              <Building2 className="w-4 h-4" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-indigo-900">112</div>
            <p className="text-[11px] text-indigo-700/80 font-medium">Under active employer review</p>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100/80 space-y-1">
            <div className="flex items-center justify-between text-blue-700">
              <span className="text-[11px] font-bold uppercase tracking-wider">Verified Passports</span>
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-blue-900">410</div>
            <p className="text-[11px] text-blue-700/80 font-medium">Students with peer-reviewed repos</p>
          </div>

          <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100/80 space-y-1">
            <div className="flex items-center justify-between text-purple-700">
              <span className="text-[11px] font-bold uppercase tracking-wider">Partner Companies</span>
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-purple-900">18</div>
            <p className="text-[11px] text-purple-700/80 font-medium">Tech companies recruiting on Sarathi</p>
          </div>
        </div>
      </div>

      {/* 4. DEPARTMENT & COHORT PERFORMANCE BREAKDOWN */}
      <Card className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <GraduationCap className="w-4 h-4 text-[#087BFA]" />
              <h3 className="text-base sm:text-lg font-black text-[#0B1B43]">Departmental Readiness & Cohort Performance</h3>
            </div>
            <p className="text-xs text-[#405B8B]">Comparative skill readiness, assessment completion, and placement rates across engineering branches</p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
            {['all', 'cse', 'it', 'ai-ds', 'ece'].map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedDeptFilter(filter)}
                className={`px-3 py-1 rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
                  selectedDeptFilter === filter
                    ? 'bg-white text-[#0B1B43] shadow-2xs font-extrabold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {departmentsData
            .filter(d => selectedDeptFilter === 'all' || d.id === selectedDeptFilter)
            .map((dept) => (
              <div
                key={dept.id}
                className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E0E7F2] hover:border-blue-200 transition-all space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-[#0B1B43]">{dept.name}</span>
                  <Badge variant="blue" size="xs">{dept.code}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                  <div className="p-2 rounded-xl bg-white border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Enrolled</span>
                    <span className="text-base font-black text-[#0B1B43]">{dept.studentsCount}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Readiness</span>
                    <span className="text-base font-black text-[#16A34A]">{dept.avgReadiness}%</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Assessed</span>
                    <span className="text-base font-black text-[#603DF5]">{dept.assessedRate}%</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Placed</span>
                    <span className="text-base font-black text-[#087BFA]">{dept.placedRate}%</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/80 text-[11px] flex items-center justify-between text-[#405B8B]">
                  <span>Leading Skill: <strong className="text-[#0B1B43]">{dept.topSkill}</strong></span>
                  {dept.atRiskCount > 0 && (
                    <span className="text-red-600 font-bold">{dept.atRiskCount} at-risk</span>
                  )}
                </div>
              </div>
            ))}
        </div>
      </Card>

      {/* 5. CAMPUS PLACEMENT DRIVES & AT-RISK STUDENTS EARLY INTERVENTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols): Active & Upcoming Placement Drives */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#087BFA]" />
                  <h3 className="text-base font-extrabold text-[#0B1B43]">Campus Placement Drives Schedule</h3>
                </div>
                <p className="text-xs text-[#405B8B]">Active and scheduled recruitment drives with employer eligibility criteria</p>
              </div>
              <Badge variant="purple" size="xs">Drive Operations</Badge>
            </div>

            <div className="space-y-3">
              {placementDrives.map((drive) => (
                <div
                  key={drive.id}
                  className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E0E7F2] hover:border-blue-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm text-[#0B1B43]">{drive.company}</h4>
                      <Badge
                        variant={drive.status === 'active' ? 'emerald' : drive.status === 'upcoming' ? 'blue' : 'purple'}
                        size="xs"
                      >
                        {drive.status}
                      </Badge>
                      <span className="text-xs font-bold text-emerald-700 px-2 py-0.5 rounded bg-emerald-50">
                        {drive.package}
                      </span>
                    </div>
                    <p className="text-xs text-[#405B8B]">{drive.role} • {drive.date}</p>
                    <div className="flex items-center gap-3 text-[11px] text-[#405B8B] pt-1">
                      <span>Eligible: <strong className="text-[#0B1B43]">{drive.eligibleStudents}</strong></span>
                      <span>Applied: <strong className="text-[#0B1B43]">{drive.appliedCount}</strong></span>
                      {drive.offersReleased && (
                        <span className="text-emerald-700 font-bold">Offers: {drive.offersReleased}</span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 self-start sm:self-auto">
                    <Button variant="outline" size="sm" className="text-xs">
                      View Eligible Students
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column (1 Col): At-Risk Students & Early Intervention */}
        <div className="space-y-6">
          <Card borderAccent="amber" className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                <h4 className="text-sm font-extrabold text-[#0B1B43]">At-Risk Students Intervention</h4>
              </div>
              <Badge variant="warning" size="xs">42 Total</Badge>
            </div>

            <p className="text-xs text-[#405B8B] leading-relaxed">
              Students falling below the 60% placement benchmark. Proactively assign remediation roadmaps before drive deadlines.
            </p>

            <div className="space-y-2.5">
              {atRiskStudents.map((stu) => (
                <div key={stu.id} className="p-3 rounded-xl bg-amber-50/40 border border-amber-100 text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-[#0B1B43]">
                    <span>{stu.name} ({stu.department})</span>
                    <span className="text-red-600 font-black">{stu.readinessScore}%</span>
                  </div>
                  <div className="text-[11px] text-[#405B8B]">
                    Gaps: {stu.missingCoreSkills.join(', ')}
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-amber-100/80">
                    <span className="text-[10px] text-amber-800 font-semibold">{stu.status}</span>
                    <button className="text-[11px] font-bold text-[#087BFA] hover:underline cursor-pointer">
                      Remediate
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs text-[#D97706] border-amber-300 hover:bg-amber-50"
              onClick={handleExport}
            >
              Export Full At-Risk Cohort (CSV)
            </Button>
          </Card>
        </div>
      </div>

      {/* 6. MAIN ANALYTICS CHARTS */}
      <div id="benchmarks" className="grid grid-cols-1 lg:grid-cols-2 gap-8 scroll-mt-20">
        {/* Readiness Trend Chart */}
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-[#0B1B43]">Batch Readiness Growth Trend</h3>
                <p className="text-xs text-[#405B8B]">Average student readiness index over time (6-month progress curve)</p>
              </div>
              <Badge variant="success" icon={<TrendingUp className="w-3.5 h-3.5" />}>+16% Growth</Badge>
            </div>

            <div className="h-68 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.readinessTrends} margin={{ top: 15, right: 20, left: -5, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#405B8B' }} />
                  <YAxis domain={[50, 100]} tick={{ fontSize: 11, fill: '#405B8B' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0B1B43',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                      border: 'none',
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)'
                    }}
                    formatter={(val: any) => [`${val}% Readiness`, 'Average Score']}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgScore"
                    stroke="#087BFA"
                    strokeWidth={3}
                    dot={{ r: 5, fill: '#603DF5', stroke: '#fff', strokeWidth: 2 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="pt-3 border-t border-[#E0E7F2] flex items-center justify-between text-xs text-[#405B8B]">
            <span>Baseline: 62% in May</span>
            <span className="font-bold text-[#16A34A]">Current: 78% in October</span>
          </div>
        </Card>

        {/* Top Skills Distribution Chart */}
        <Card id="domains" className="scroll-mt-20 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-[#0B1B43]">Top Assessed Technical Skills</h3>
                <p className="text-xs text-[#405B8B]">Average score per technical domain across all engineering cohorts</p>
              </div>
              <Badge variant="blue">Skill Intelligence</Badge>
            </div>

            <div className="h-68 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.topSkillsAssessed} margin={{ top: 15, right: 15, left: -5, bottom: 35 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="skill" tick={{ fontSize: 10, fill: '#405B8B' }} angle={-15} textAnchor="end" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#405B8B' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0B1B43',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                      border: 'none',
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)'
                    }}
                    formatter={(val: any) => [`${val}% Benchmark Score`, 'Batch Average']}
                  />
                  <Bar dataKey="avgScore" radius={[6, 6, 0, 0]} maxBarSize={45}>
                    {data.topSkillsAssessed.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#087BFA' : '#603DF5'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="pt-3 border-t border-[#E0E7F2] flex items-center justify-between text-xs text-[#405B8B]">
            <span>Strongest: HTML & CSS (88%)</span>
            <span>Target Benchmark: 70%+</span>
          </div>
        </Card>
      </div>

      {/* 7. CURRICULUM GAP ANALYSIS & ACADEMIC INTERVENTIONS */}
      <Card id="skill-gaps" borderAccent="amber" className="scroll-mt-20 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 text-[#D97706]">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-[#0B1B43]">Batch Curriculum Skill Gaps & Academic Recommendations</h3>
              <p className="text-xs text-[#405B8B]">Identified curricular areas with greatest variance against employer hiring benchmarks</p>
            </div>
          </div>
          <Badge variant="warning">Curriculum Action Needed</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {data.commonSkillGaps.map((gap) => (
            <div key={gap.skill} className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E0E7F2] hover:border-amber-200 transition-all space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-sm text-[#0B1B43] truncate">{gap.skill}</span>
                <Badge variant={gap.priority === 'High' ? 'danger' : 'warning'} size="xs">
                  {gap.priority}
                </Badge>
              </div>

              <div>
                <div className="text-2xl font-black text-[#DC2626] tracking-tight">{gap.gapPercentage}%</div>
                <span className="text-[11px] text-[#405B8B] block mt-0.5">Students below hiring benchmark</span>
              </div>

              <div className="pt-2 border-t border-slate-200/80">
                <ProgressBar
                  progress={100 - gap.gapPercentage}
                  color={gap.priority === 'High' ? 'amber' : 'green'}
                  size="sm"
                />
                <span className="text-[10px] text-slate-500 font-semibold block mt-1">
                  {100 - gap.gapPercentage}% Competency Attainment
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Academic Actionable Recommendations */}
        <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-[#087BFA] font-bold">
            <BookOpen className="w-4 h-4" />
            <span>Recommended Academic Interventions:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-[#405B8B]">
            <li>Integrate a 2-week practical Docker & DevOps deployment module into the Semester 6 Web Engineering lab.</li>
            <li>Mandate Jest/React Testing Library test suites in final-year capstone project evaluation rubrics to address the 58% testing gap.</li>
            <li>Conduct a weekend intensive bootcamp on TypeScript to accelerate full-stack readiness before upcoming campus placement drives.</li>
          </ul>
        </div>
      </Card>
    </div>
  );
};

export default CollegeDashboard;
