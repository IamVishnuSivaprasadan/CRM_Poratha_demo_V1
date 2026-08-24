import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { FileSpreadsheet, Download, RefreshCw, CheckCircle2, Building2, Network, XCircle, ClockAlert } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [reportType, setReportType] = useState<'compliance' | 'pending' | 'rejected' | 'expiring'>('compliance');
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadReport = async () => {
    setIsLoading(true);
    try {
      let res;
      if (reportType === 'compliance') res = await api.getComplianceReport();
      else if (reportType === 'pending') res = await api.getPendingReport();
      else if (reportType === 'rejected') res = await api.getRejectedReport();
      else if (reportType === 'expiring') res = await api.getExpiringReport();
      setData(res);
    } catch (err) {
      console.error('Error loading report:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [reportType]);

  const handleExportCsv = () => {
    const url = `/api/reports/${reportType}?format=csv`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 uppercase tracking-tight">
              CORPORATE COMPLIANCE & AUDIT REPORTS
            </h1>
            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200">
              OFFICIAL STATUTORY EXPORTS
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Generate executive compliance summaries, verification logs, and external audit spreadsheets.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shadow-sm flex items-center gap-2 shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Export Official CSV</span>
        </button>
      </div>

      {/* Report Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setReportType('compliance')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
            reportType === 'compliance'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Branch Compliance Matrix</span>
        </button>

        <button
          onClick={() => setReportType('pending')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
            reportType === 'pending'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs'
          }`}
        >
          <ClockAlert className="w-4 h-4" />
          <span>Pending Verification Queue</span>
        </button>

        <button
          onClick={() => setReportType('rejected')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
            reportType === 'rejected'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs'
          }`}
        >
          <XCircle className="w-4 h-4" />
          <span>Rejection Log & Feedback</span>
        </button>

        <button
          onClick={() => setReportType('expiring')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
            reportType === 'expiring'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs'
          }`}
        >
          <ClockAlert className="w-4 h-4" />
          <span>Expiring Certifications</span>
        </button>
      </div>

      {/* Report Content Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="py-16 text-center text-slate-500">
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Compiling report data...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {reportType === 'compliance' && (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-3">Branch Code</th>
                    <th className="py-3 px-3">Branch Location</th>
                    <th className="py-3 px-3">Required Documents</th>
                    <th className="py-3 px-3">Verified</th>
                    <th className="py-3 px-3">Pending HQ</th>
                    <th className="py-3 px-3">Rejected</th>
                    <th className="py-3 px-3">Expired</th>
                    <th className="py-3 px-3">Missing</th>
                    <th className="py-3 px-3 font-bold text-right">Compliance Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {(data?.branches || data?.data || []).map((b: any, idx: number) => (
                    <tr key={b.code || b.branchCode || idx} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-3 font-mono font-bold text-blue-600">{b.code || b.branchCode}</td>
                      <td className="py-3 px-3 font-bold text-slate-900">{b.name || b.branchName}</td>
                      <td className="py-3 px-3 font-semibold">{b.totalRequired ?? 0}</td>
                      <td className="py-3 px-3 text-emerald-600 font-bold">{b.verified ?? 0}</td>
                      <td className="py-3 px-3 text-blue-600 font-bold">{b.pending ?? 0}</td>
                      <td className="py-3 px-3 text-rose-600 font-bold">{b.rejected ?? 0}</td>
                      <td className="py-3 px-3 text-orange-600">{b.expired ?? 0}</td>
                      <td className="py-3 px-3 text-slate-400 font-medium">{b.notUploaded ?? 0}</td>
                      <td className="py-3 px-3 text-right">
                        <span className="font-mono text-sm font-bold text-emerald-600">
                          {b.complianceRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!data?.branches && !data?.data) || (data?.branches || data?.data || []).length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        No compliance data available.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            )}

            {reportType === 'rejected' && (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-3">Doc #</th>
                    <th className="py-3 px-3">Document Title</th>
                    <th className="py-3 px-3">Branch</th>
                    <th className="py-3 px-3">Personnel</th>
                    <th className="py-3 px-3">Rejection Reason Code</th>
                    <th className="py-3 px-3">Auditor Comments</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {(data?.documents || data?.data || []).map((d: any, idx: number) => (
                    <tr key={d.id || idx} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-3 font-mono font-bold text-rose-600">{d.documentNumber}</td>
                      <td className="py-3 px-3 font-semibold text-slate-900">{d.title}</td>
                      <td className="py-3 px-3">{d.branchName || d.branch}</td>
                      <td className="py-3 px-3 font-medium text-slate-800">{d.employeeName || d.employee || 'Facility Record'}</td>
                      <td className="py-3 px-3 font-mono text-rose-600 font-medium">{d.lastRejectionReason || d.rejectionReason}</td>
                      <td className="py-3 px-3 text-slate-500 italic max-w-xs truncate">{d.lastRejectionComments || d.rejectionComments || '-'}</td>
                    </tr>
                  ))}
                  {(!data?.documents && !data?.data) || (data?.documents || data?.data || []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No rejected documents on record.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            )}

            {(reportType === 'pending' || reportType === 'expiring') && (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-3">Doc #</th>
                    <th className="py-3 px-3">Document Title</th>
                    <th className="py-3 px-3">Branch</th>
                    <th className="py-3 px-3">Department</th>
                    <th className="py-3 px-3">Personnel</th>
                    <th className="py-3 px-3">Expiry Date</th>
                    <th className="py-3 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {(data?.documents || data?.data || []).map((d: any, idx: number) => (
                    <tr key={d.id || idx} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-3 font-mono font-bold text-blue-600">{d.documentNumber}</td>
                      <td className="py-3 px-3 font-semibold text-slate-900">{d.title}</td>
                      <td className="py-3 px-3">{d.branchName || d.branch}</td>
                      <td className="py-3 px-3 text-slate-500">{d.departmentName || d.department}</td>
                      <td className="py-3 px-3 font-medium text-slate-800">{d.employeeName || d.employee || 'Facility Record'}</td>
                      <td className="py-3 px-3 font-mono text-orange-600 font-medium">{d.expiryDate || 'N/A'}</td>
                      <td className="py-3 px-3 font-semibold text-slate-700">{d.status}</td>
                    </tr>
                  ))}
                  {(!data?.documents && !data?.data) || (data?.documents || data?.data || []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No documents found for this report.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

    </div>
  );
};
