import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { DocumentRecord, DocumentStatus } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { ClockAlert, Calendar, AlertTriangle, Eye, Upload, Filter, Download } from 'lucide-react';

interface ExpiringPageProps {
  onOpenDocument: (docId: string) => void;
  onUploadReplacement: (doc: DocumentRecord) => void;
}

export const ExpiringPage: React.FC<ExpiringPageProps> = ({ onOpenDocument, onUploadReplacement }) => {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [filterDays, setFilterDays] = useState<number>(30);
  const [isLoading, setIsLoading] = useState(true);

  const loadExpiringDocs = async () => {
    setIsLoading(true);
    try {
      const res = await api.getExpiringReport();
      // Filter by days
      let list = res.documents || [];
      if (filterDays === 0) {
        list = list.filter((d: any) => d.status === DocumentStatus.EXPIRED || (d.daysRemaining !== undefined && d.daysRemaining < 0));
      } else {
        list = list.filter((d: any) => d.daysRemaining !== undefined && d.daysRemaining <= filterDays);
      }
      setDocuments(list);
    } catch (err) {
      console.error('Error loading expiring docs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExpiringDocs();
  }, [filterDays]);

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 uppercase tracking-tight">
              EXPIRY & RENEWAL RADAR
            </h1>
            <span className="bg-orange-50 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded border border-orange-200">
              {documents.length} EXPIRING / EXPIRED
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Proactive statutory certification renewals radar (30, 60, 90-day warning horizon).
          </p>
        </div>

        {/* Quick Expiry Horizon Filter */}
        <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200 text-xs">
          <button
            onClick={() => setFilterDays(0)}
            className={`px-3 py-1 rounded-lg font-semibold transition ${
              filterDays === 0 ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Already Expired
          </button>
          <button
            onClick={() => setFilterDays(30)}
            className={`px-3 py-1 rounded-lg font-semibold transition ${
              filterDays === 30 ? 'bg-orange-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            &lt; 30 Days
          </button>
          <button
            onClick={() => setFilterDays(60)}
            className={`px-3 py-1 rounded-lg font-semibold transition ${
              filterDays === 60 ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            &lt; 60 Days
          </button>
          <button
            onClick={() => setFilterDays(90)}
            className={`px-3 py-1 rounded-lg font-semibold transition ${
              filterDays === 90 ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            &lt; 90 Days
          </button>
        </div>
      </div>

      {/* Expiring List Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3">Doc Number</th>
                <th className="py-3 px-3">Document Title</th>
                <th className="py-3 px-3">Branch</th>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3">Personnel</th>
                <th className="py-3 px-3">Expiry Date</th>
                <th className="py-3 px-3">Days Remaining</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Renewal Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Analyzing certificate expiry dates...</span>
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <ClockAlert className="w-8 h-8 text-emerald-600 mx-auto mb-2 opacity-70" />
                    <p className="font-semibold text-slate-800">No documents in this expiry horizon</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">All certifications in this window are in valid standing.</p>
                  </td>
                </tr>
              ) : (
                documents.map((doc: any) => {
                  const days = doc.daysRemaining !== undefined ? doc.daysRemaining : 0;
                  const isPast = days < 0;

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-3 font-mono font-bold text-blue-600">{doc.documentNumber}</td>
                      <td className="py-3 px-3 font-semibold text-slate-900">{doc.title}</td>
                      <td className="py-3 px-3 text-slate-600">{doc.branchName}</td>
                      <td className="py-3 px-3 text-slate-500">{doc.departmentName}</td>
                      <td className="py-3 px-3 font-medium text-slate-800">{doc.employeeName || 'Site Facility'}</td>
                      <td className="py-3 px-3 font-mono font-semibold text-slate-700">{doc.expiryDate}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`font-bold font-mono px-2 py-0.5 rounded text-[11px] ${
                            isPast
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : days <= 30
                              ? 'bg-orange-50 text-orange-700 border border-orange-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {isPast ? `EXPIRED (${Math.abs(days)}d ago)` : `${days} Days Left`}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={doc.status} size="sm" />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onOpenDocument(doc.id)}
                            className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-md text-xs font-semibold shadow-xs"
                          >
                            View
                          </button>
                          <button
                            onClick={() => onUploadReplacement(doc)}
                            className="px-2.5 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-xs font-semibold transition flex items-center gap-1 shadow-xs"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Renew</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
