import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AuditAction, AuditLog } from '../types';
import { History, Search, Filter, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [actionFilter, setActionFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadAuditLogs = async () => {
    setIsLoading(true);
    try {
      const res = await api.getAuditLogs({
        action: actionFilter || undefined,
        search: searchQuery || undefined,
        page,
        limit: 15,
      });
      setLogs(res.logs);
      setTotalPages(res.totalPages);
      setTotal(res.total);
    } catch (err) {
      console.error('Error loading audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, [actionFilter, searchQuery, page]);

  const getActionBadge = (action: string) => {
    if (action.includes('VERIFIED')) {
      return <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-mono text-[10px] font-bold border border-emerald-200">VERIFIED</span>;
    }
    if (action.includes('REJECTED')) {
      return <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded font-mono text-[10px] font-bold border border-rose-200">REJECTED</span>;
    }
    if (action.includes('UPLOADED') || action.includes('REPLACED')) {
      return <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-mono text-[10px] font-bold border border-blue-200">UPLOAD / REPLACEMENT</span>;
    }
    return <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono text-[10px] border border-slate-200">{action}</span>;
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 uppercase tracking-tight">
              CORPORATE AUDIT TRAIL & LOGS
            </h1>
            <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200">
              IMMUTABLE RECORD ({total})
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Complete cryptographic audit trail of all logins, uploads, replacements, and Head Office verification decisions.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs shadow-sm">
        
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search user, document #, details..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Action Filter */}
        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Action Types</option>
          <option value={AuditAction.DOCUMENT_VERIFIED}>DOCUMENT_VERIFIED</option>
          <option value={AuditAction.DOCUMENT_REJECTED}>DOCUMENT_REJECTED</option>
          <option value={AuditAction.DOCUMENT_UPLOADED}>DOCUMENT_UPLOADED</option>
          <option value={AuditAction.DOCUMENT_REPLACED}>DOCUMENT_REPLACED</option>
          <option value={AuditAction.DOCUMENT_VIEWED}>DOCUMENT_VIEWED</option>
          <option value={AuditAction.USER_LOGIN}>USER_LOGIN</option>
        </select>

      </div>

      {/* Audit Logs Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3">Timestamp</th>
                <th className="py-3 px-3">Action</th>
                <th className="py-3 px-3">User / Actor</th>
                <th className="py-3 px-3">Role</th>
                <th className="py-3 px-3">Entity</th>
                <th className="py-3 px-3">Details & Audit Metadata</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading audit records...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No audit records found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">{getActionBadge(log.action)}</td>
                    <td className="py-3 px-3 font-semibold text-slate-900">{log.userName}</td>
                    <td className="py-3 px-3 text-[10px] text-slate-500">{log.userRole}</td>
                    <td className="py-3 px-3 font-mono text-[11px] text-blue-600 font-bold">{log.entity}</td>
                    <td className="py-3 px-3 text-slate-600">{log.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span>
              Page {page} of {totalPages} ({total} audit logs)
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded bg-white hover:bg-slate-100 border border-slate-200 disabled:opacity-40 text-slate-700 shadow-xs"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 font-semibold text-slate-800">{page}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded bg-white hover:bg-slate-100 border border-slate-200 disabled:opacity-40 text-slate-700 shadow-xs"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
