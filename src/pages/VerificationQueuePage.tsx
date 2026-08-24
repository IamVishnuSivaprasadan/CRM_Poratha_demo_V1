import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Branch, Department, DocumentRecord, DocumentStatus, RejectionReasonCode, UserRole } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Eye,
  CheckSquare,
  Square,
  Search,
  Building2,
  Layers,
  Sparkles,
} from 'lucide-react';

interface VerificationQueuePageProps {
  onOpenDocument: (docId: string) => void;
  onRefreshGlobal?: () => void;
}

export const VerificationQueuePage: React.FC<VerificationQueuePageProps> = ({
  onOpenDocument,
  onRefreshGlobal,
}) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Bulk verify dialog
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkComments, setBulkComments] = useState('');
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);

  const isHeadOffice = user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.HEAD_OFFICE_ADMIN;

  const loadQueue = async () => {
    setIsLoading(true);
    try {
      const [docRes, brRes, deptRes] = await Promise.all([
        api.getDocuments({
          status: DocumentStatus.PENDING_VERIFICATION,
          branchId: selectedBranch || undefined,
          departmentId: selectedDepartment || undefined,
          search: searchQuery || undefined,
          limit: 100,
        }),
        api.getBranches(),
        api.getDepartments(),
      ]);
      setDocuments(docRes.documents);
      setBranches(brRes.branches);
      setDepartments(deptRes.departments);
    } catch (err) {
      console.error('Error loading verification queue:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, [selectedBranch, selectedDepartment, searchQuery]);

  const handleSelectAll = () => {
    if (selectedDocIds.length === documents.length) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(documents.map((d) => d.id));
    }
  };

  const handleToggleDoc = (id: string) => {
    setSelectedDocIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleBulkVerifyConfirm = async () => {
    if (selectedDocIds.length === 0) return;
    setIsBulkSubmitting(true);
    try {
      await api.bulkVerify(selectedDocIds, bulkComments || 'Bulk verified by Head Office Document Control.');
      setShowBulkModal(false);
      setBulkComments('');
      setSelectedDocIds([]);
      await loadQueue();
      if (onRefreshGlobal) onRefreshGlobal();
    } catch (err: any) {
      alert(err.message || 'Bulk verification failed');
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 uppercase tracking-tight">
              HEAD OFFICE VERIFICATION QUEUE
            </h1>
            <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200">
              {documents.length} AWAITING REVIEW
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Statutory documents uploaded by regional branch operations requiring Corporate sign-off.
          </p>
        </div>

        {/* Bulk Action Button */}
        {isHeadOffice && selectedDocIds.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBulkModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shadow-sm flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Bulk Verify ({selectedDocIds.length} Selected)</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col sm:flex-row items-center gap-3 text-xs">
        
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by title, document number, personnel..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Branch Filter */}
        <select
          value={selectedBranch}
          onChange={(e) => setSelectedBranch(e.target.value)}
          className="w-full sm:w-48 bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        {/* Department Filter */}
        <select
          value={selectedDepartment}
          onChange={(e) => setSelectedDepartment(e.target.value)}
          className="w-full sm:w-48 bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

      </div>

      {/* Verification Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                {isHeadOffice && (
                  <th className="py-3 px-3 w-8">
                    <button
                      onClick={handleSelectAll}
                      className="text-slate-400 hover:text-slate-600"
                      title="Select / Deselect All"
                    >
                      {documents.length > 0 && selectedDocIds.length === documents.length ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                )}
                <th className="py-3 px-3">Doc Number</th>
                <th className="py-3 px-3">Document Title</th>
                <th className="py-3 px-3">Branch</th>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3">Personnel</th>
                <th className="py-3 px-3">Version</th>
                <th className="py-3 px-3">Submitted</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Review Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading queue submissions...</span>
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-60" />
                    <p className="font-semibold text-slate-800">Verification Queue is Empty</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">All branch documents have been reviewed and processed.</p>
                  </td>
                </tr>
              ) : (
                documents.map((doc) => {
                  const isSelected = selectedDocIds.includes(doc.id);
                  return (
                    <tr
                      key={doc.id}
                      className={`hover:bg-slate-50 transition ${isSelected ? 'bg-blue-50/50' : ''}`}
                    >
                      {isHeadOffice && (
                        <td className="py-3 px-3">
                          <button
                            onClick={() => handleToggleDoc(doc.id)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      )}
                      <td className="py-3 px-3 font-mono font-bold text-blue-600">{doc.documentNumber}</td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{doc.title}</div>
                        <div className="text-[10px] text-slate-500">{doc.requirementName}</div>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-700">{doc.branchName}</td>
                      <td className="py-3 px-3 text-slate-600">{doc.departmentName}</td>
                      <td className="py-3 px-3">
                        {doc.employeeName ? (
                          <div>
                            <span className="font-medium text-slate-800">{doc.employeeName}</span>
                            <span className="text-[10px] text-slate-500 block font-mono">({doc.employeeNumber})</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Branch Facility Record</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px]">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                          v{doc.currentVersionNumber}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[11px] text-slate-500">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={doc.status} size="sm" />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => onOpenDocument(doc.id)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold transition shadow-sm inline-flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Review & Verify</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* BULK VERIFY MODAL */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Bulk Verify {selectedDocIds.length} Documents</h3>
                <p className="text-xs text-slate-500">All selected documents will be signed off and marked as verified.</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Batch Approval Comments (Optional)
              </label>
              <textarea
                value={bulkComments}
                onChange={(e) => setBulkComments(e.target.value)}
                placeholder="e.g., Verified against Corporate Safety and Quality standard."
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowBulkModal(false)}
                disabled={isBulkSubmitting}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkVerifyConfirm}
                disabled={isBulkSubmitting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shadow-sm flex items-center gap-1.5"
              >
                {isBulkSubmitting ? 'Processing Batch...' : 'Confirm Bulk Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
