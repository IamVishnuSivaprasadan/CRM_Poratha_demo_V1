import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import {
  FileCheck2,
  Clock,
  XCircle,
  AlertTriangle,
  FileText,
  TrendingUp,
  Building2,
  Calendar,
  Eye,
  CheckCircle2,
  ShieldCheck,
  AlertOctagon,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface HeadOfficeDashboardProps {
  onOpenDocument: (docId: string) => void;
  onNavigateToQueue: () => void;
  onSelectBranch: (branchId: string) => void;
}

export const HeadOfficeDashboard: React.FC<HeadOfficeDashboardProps> = ({
  onOpenDocument,
  onNavigateToQueue,
  onSelectBranch,
}) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboard = async () => {
    setIsLoading(true);
    try {
      const res = await api.getHeadOfficeDashboard();
      setData(res);
    } catch (err) {
      console.error('Error loading HQ dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (isLoading || !data) {
    return (
      <div className="p-12 text-center text-slate-500 space-y-3">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-medium">Loading Poratha Head Office Analytics...</p>
      </div>
    );
  }

  const kpis = data?.kpis || {
    totalDocuments: 0,
    totalRequired: 0,
    verified: 0,
    pending: 0,
    rejected: 0,
    notUploaded: 0,
    expired: 0,
    complianceRate: 0,
    verificationRate: 0,
    docsUploadedToday: 0,
    docsVerifiedToday: 0,
    expiringSoonCount: 0,
    totalEmployees: 0,
    totalBranches: 0,
    totalDepartments: 0,
  };
  const statusDistribution = data?.statusDistribution || [];
  const branchPerformance = data?.branchPerformance || [];
  const departmentPerformance = data?.departmentPerformance || [];
  const rejectionBreakdown = data?.rejectionBreakdown || [];
  const pendingQueue = data?.pendingQueue || [];
  const recentAudits = data?.recentAudits || [];

  const COLORS = ['#10b981', '#3b82f6', '#ef4444', '#f97316', '#64748b'];

  return (
    <div className="space-y-6">
      
      {/* Dashboard Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 uppercase tracking-tight">
              PORATHA DOCUMENT CONTROL — HEAD OFFICE
            </h1>
            <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200">
              HQ CENTRAL CONTROL
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time compliance monitoring across {kpis.totalBranches} regional branch operations and {kpis.totalEmployees} industrial personnel.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onNavigateToQueue}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition shadow-sm flex items-center gap-2"
          >
            <Clock className="w-4 h-4 text-white" />
            <span>Open Review Queue ({kpis.pending})</span>
          </button>
        </div>
      </div>

      {/* Top 6 Primary Status KPI Cards (Section 8) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        
        {/* TOTAL DOCUMENTS */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Documents</span>
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">{kpis.totalDocuments}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Required: {kpis.totalRequired}</div>
          </div>
        </div>

        {/* VERIFIED */}
        <div className="bg-white border border-emerald-200/80 p-4 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-[11px] font-bold uppercase tracking-wider">Verified</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-600">{kpis.verified}</div>
            <div className="text-[11px] text-emerald-700/80 mt-0.5">Rate: {kpis.complianceRate}%</div>
          </div>
        </div>

        {/* PENDING VERIFICATION */}
        <div className="bg-white border border-blue-200/80 p-4 rounded-xl shadow-sm flex flex-col justify-between cursor-pointer hover:border-blue-400 transition" onClick={onNavigateToQueue}>
          <div className="flex items-center justify-between text-blue-600">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pending Review</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-blue-600">{kpis.pending}</div>
            <div className="text-[11px] text-blue-700/80 mt-0.5">Awaiting HQ action</div>
          </div>
        </div>

        {/* REJECTED */}
        <div className="bg-white border border-rose-200/80 p-4 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-600">
            <span className="text-[11px] font-bold uppercase tracking-wider">Rejected</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-rose-600">{kpis.rejected}</div>
            <div className="text-[11px] text-rose-700/80 mt-0.5">Action required by branch</div>
          </div>
        </div>

        {/* NOT UPLOADED (MISSING) */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Not Uploaded</span>
            <AlertOctagon className="w-4 h-4 text-slate-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-700">{kpis.notUploaded}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Missing statutory slots</div>
          </div>
        </div>

        {/* EXPIRED */}
        <div className="bg-white border border-orange-200/80 p-4 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-orange-600">
            <span className="text-[11px] font-bold uppercase tracking-wider">Expired</span>
            <AlertTriangle className="w-4 h-4 text-orange-600" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-orange-600">{kpis.expired}</div>
            <div className="text-[11px] text-orange-700/80 mt-0.5">Expiring (30d): {kpis.expiringSoonCount}</div>
          </div>
        </div>

      </div>

      {/* Secondary Performance Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white border border-slate-200 p-5 rounded-xl shadow-sm text-xs">
        <div>
          <span className="text-slate-500 text-[10px] uppercase font-bold block">Company Compliance Rate</span>
          <span className="text-base font-bold text-slate-900">{kpis.complianceRate}%</span>
          <span className="text-[10px] text-slate-500 block">Verified / Total Required</span>
        </div>
        <div>
          <span className="text-slate-500 text-[10px] uppercase font-bold block">HQ Verification Efficiency</span>
          <span className="text-base font-bold text-emerald-600">{kpis.verificationRate}%</span>
          <span className="text-[10px] text-slate-500 block">Verified / Total Uploaded</span>
        </div>
        <div>
          <span className="text-slate-500 text-[10px] uppercase font-bold block">Uploaded Today</span>
          <span className="text-base font-bold text-blue-600">{kpis.docsUploadedToday} docs</span>
          <span className="text-[10px] text-slate-500 block">Ingress volume</span>
        </div>
        <div>
          <span className="text-slate-500 text-[10px] uppercase font-bold block">Verified Today</span>
          <span className="text-base font-bold text-emerald-600">{kpis.docsVerifiedToday} docs</span>
          <span className="text-[10px] text-slate-500 block">Sign-off volume</span>
        </div>
      </div>

      {/* Charts Section: Verification Rate by Branch & Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Branch Verification Performance Chart (7 Cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 shadow-sm rounded-xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Verification & Compliance Rate by Regional Branch
              </h3>
              <p className="text-[11px] text-slate-500">Comparison across Pasir Gudang, Kertih, Bintulu, PIC, and Gebeng</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis
                  dataKey="code"
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  interval={0}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  domain={[0, 100]}
                  unit="%"
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(val: any) => [`${val}%`, 'Compliance Rate']}
                />
                <Bar dataKey="complianceRate" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Interactive Branch Quick Links */}
          <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-5 gap-2">
            {branchPerformance.map((b: any) => (
              <button
                key={b.id}
                onClick={() => onSelectBranch(b.id)}
                className="p-2.5 bg-slate-50 border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 rounded-lg text-left transition"
              >
                <div className="text-[10px] font-mono text-blue-600 font-bold">{b.code}</div>
                <div className="text-xs font-bold text-slate-800 mt-0.5">{b.complianceRate}%</div>
                <div className="text-[10px] text-slate-500">{b.verified}/{b.totalRequired} docs</div>
              </button>
            ))}
          </div>
        </div>

        {/* Document Status Distribution (5 Cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 shadow-sm rounded-xl p-5 flex flex-col">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-1">
            Global Status Distribution
          </h3>
          <p className="text-[11px] text-slate-500 mb-2">Total {kpis.totalRequired} statutory document records</p>

          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="count"
                >
                  {statusDistribution.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 mt-2">
            {statusDistribution.map((s: any) => (
              <div key={s.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                <span className="truncate">{s.name}:</span>
                <span className="font-bold text-slate-900">{s.count}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Priority Head Office Verification Queue Snippet */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Priority Verification Queue (Oldest Submissions First)</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Documents submitted by branch stations awaiting Head Office review and sign-off.
            </p>
          </div>
          <button
            onClick={onNavigateToQueue}
            className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
          >
            <span>View Full Queue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3">Doc Number</th>
                <th className="py-3 px-3">Title / Requirement</th>
                <th className="py-3 px-3">Branch</th>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3">Personnel</th>
                <th className="py-3 px-3">Version</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {pendingQueue.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No pending documents in verification queue. All submissions verified!
                  </td>
                </tr>
              ) : (
                pendingQueue.slice(0, 5).map((doc: any) => (
                  <tr key={doc.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3 font-mono font-bold text-blue-600">{doc.documentNumber}</td>
                    <td className="py-3 px-3 font-semibold text-slate-800 max-w-[200px] truncate">{doc.title}</td>
                    <td className="py-3 px-3 text-slate-600">{doc.branchName}</td>
                    <td className="py-3 px-3 text-slate-600">{doc.departmentName}</td>
                    <td className="py-3 px-3 font-medium text-slate-800">{doc.employeeName || 'Site Record'}</td>
                    <td className="py-3 px-3 font-mono text-[11px]">v{doc.currentVersionNumber}</td>
                    <td className="py-3 px-3">
                      <StatusBadge status={doc.status} size="sm" />
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onOpenDocument(doc.id)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[11px] font-semibold transition shadow-sm"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
