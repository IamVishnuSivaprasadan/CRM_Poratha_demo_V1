import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import {
  Building2,
  FileCheck2,
  Clock,
  XCircle,
  AlertTriangle,
  FileText,
  AlertOctagon,
  Upload,
  UserCheck,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface BranchDashboardProps {
  branchId?: string;
  onOpenDocument: (docId: string) => void;
  onUploadDocument: () => void;
  onUploadReplacement: (doc: any) => void;
}

export const BranchDashboard: React.FC<BranchDashboardProps> = ({
  branchId,
  onOpenDocument,
  onUploadDocument,
  onUploadReplacement,
}) => {
  const { user } = useAuth();
  const effectiveBranchId = branchId || user?.branchId || 'br_01';

  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadBranchDashboard = async () => {
    setIsLoading(true);
    try {
      const res = await api.getBranchDashboard(effectiveBranchId);
      setData(res);
    } catch (err) {
      console.error('Error loading branch dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBranchDashboard();
  }, [effectiveBranchId]);

  if (isLoading || !data) {
    return (
      <div className="p-12 text-center text-slate-500 space-y-3">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-medium">Loading Branch Operations Dashboard...</p>
      </div>
    );
  }

  const branch = data?.branch || { name: 'Branch Operations', code: 'BR', location: '', state: '', contactPerson: '', email: '' };
  const stats = data?.stats || data?.kpis || {
    totalRequired: 0,
    verified: 0,
    pending: 0,
    rejected: 0,
    notUploaded: 0,
    expired: 0,
    complianceRate: 0,
    verificationRate: 0,
  };
  const departments = data?.departments || data?.departmentBreakdown || [];
  const rejectedDocs = data?.rejectedDocs || data?.actionRequiredDocs || [];
  const pendingDocs = data?.pendingDocs || data?.branchPendingDocs || [];
  const expiringSoonDocs = data?.expiringSoonDocs || data?.expiringDocs || [];
  const totalEmployees = data?.totalEmployees || stats.employeeCount || 0;

  return (
    <div className="space-y-6">
      
      {/* Branch Header Banner */}
      <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 uppercase tracking-tight">
                {branch.name}
              </h1>
              <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200 font-mono">
                {branch.code}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Location: {branch.location}, {branch.state} • Contact: {branch.contactPerson} ({branch.email})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onUploadDocument}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition shadow-sm flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* Top 6 Branch Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        
        {/* TOTAL REQUIRED */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="text-slate-500 text-[11px] font-bold uppercase tracking-wider flex items-center justify-between">
            <span>Required</span>
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-3">{stats.totalRequired}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Statutory items</div>
        </div>

        {/* VERIFIED */}
        <div className="bg-white border border-emerald-200/80 p-4 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="text-emerald-600 text-[11px] font-bold uppercase tracking-wider flex items-center justify-between">
            <span>Verified</span>
            <FileCheck2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-3">{stats.verified}</div>
          <div className="text-[10px] text-emerald-700 mt-0.5">Compliance: {stats.complianceRate}%</div>
        </div>

        {/* PENDING VERIFICATION */}
        <div className="bg-white border border-blue-200/80 p-4 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="text-blue-600 text-[11px] font-bold uppercase tracking-wider flex items-center justify-between">
            <span>Pending HQ</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-600 mt-3">{stats.pending}</div>
          <div className="text-[10px] text-blue-700 mt-0.5">Under HQ review</div>
        </div>

        {/* REJECTED */}
        <div className="bg-white border border-rose-200/80 p-4 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="text-rose-600 text-[11px] font-bold uppercase tracking-wider flex items-center justify-between">
            <span>Rejected</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-600 mt-3">{stats.rejected}</div>
          <div className="text-[10px] text-rose-700 font-semibold mt-0.5">Must replace</div>
        </div>

        {/* NOT UPLOADED (MISSING) */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="text-slate-500 text-[11px] font-bold uppercase tracking-wider flex items-center justify-between">
            <span>Missing</span>
            <AlertOctagon className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-700 mt-3">{stats.notUploaded}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Not yet submitted</div>
        </div>

        {/* EXPIRED */}
        <div className="bg-white border border-orange-200/80 p-4 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="text-orange-600 text-[11px] font-bold uppercase tracking-wider flex items-center justify-between">
            <span>Expired</span>
            <AlertTriangle className="w-4 h-4 text-orange-600" />
          </div>
          <div className="text-2xl font-bold text-orange-600 mt-3">{stats.expired}</div>
          <div className="text-[10px] text-orange-700 mt-0.5">Renewal required</div>
        </div>

      </div>

      {/* ACTION REQUIRED: Rejected Documents Box (Section 8 & 16) */}
      {rejectedDocs.length > 0 && (
        <div className="bg-rose-50/50 border border-rose-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-rose-800">
                ACTION REQUIRED: REJECTED DOCUMENTS ({rejectedDocs.length})
              </h2>
            </div>
            <span className="text-[11px] text-rose-700 font-semibold">
              Please upload corrected replacement files
            </span>
          </div>

          <div className="divide-y divide-rose-100">
            {rejectedDocs.map((doc: any) => (
              <div key={doc.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-rose-700">{doc.documentNumber}</span>
                    <span className="font-semibold text-slate-900">{doc.title}</span>
                    <span className="text-slate-500 text-[11px]">({doc.departmentName})</span>
                  </div>
                  <div className="mt-1 text-[11px] text-rose-700">
                    <strong className="text-rose-800 font-semibold">HQ Rejection Reason: </strong>
                    <span>{doc.lastRejectionReason?.replace(/_/g, ' ')}</span>
                    {doc.lastRejectionComments && (
                      <span className="text-slate-600 block italic mt-0.5">"{doc.lastRejectionComments}"</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onOpenDocument(doc.id)}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-md text-xs font-medium transition shadow-sm"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => onUploadReplacement(doc)}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-semibold transition shadow-sm flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Replacement</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Departments Performance Grid */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-4">
          Department Compliance Breakdown in {branch.name}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {departments.map((dept: any) => {
            const deptStats = dept.stats || {
              complianceRate: dept.complianceRate ?? 0,
              verified: dept.verified ?? 0,
              pending: dept.pending ?? 0,
              notUploaded: dept.notUploaded ?? 0,
            };
            return (
              <div key={dept.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-blue-600 font-bold">{dept.code}</span>
                    <span className="text-xs font-bold text-slate-900">{deptStats.complianceRate}%</span>
                  </div>
                  <h3 className="font-semibold text-slate-800 text-xs mt-1">{dept.name}</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">{dept.description}</p>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${deptStats.complianceRate}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-200 text-[10px] text-center">
                  <div>
                    <span className="text-slate-500 block">Verified</span>
                    <span className="font-bold text-emerald-600">{deptStats.verified}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Pending</span>
                    <span className="font-bold text-blue-600">{deptStats.pending}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Missing</span>
                    <span className="font-bold text-slate-600">{deptStats.notUploaded}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
