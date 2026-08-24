import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Branch, Department, DocumentRecord, DocumentStatus, UserRole } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  Files,
  Search,
  Filter,
  Upload,
  Eye,
  Download,
  Calendar,
  Building2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';

interface DocumentsPageProps {
  onOpenDocument: (docId: string) => void;
  onUploadDocument: () => void;
  onUploadReplacement: (doc: DocumentRecord) => void;
  initialStatusFilter?: string;
}

export const DocumentsPage: React.FC<DocumentsPageProps> = ({
  onOpenDocument,
  onUploadDocument,
  onUploadReplacement,
  initialStatusFilter,
}) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [statusFilter, setStatusFilter] = useState(initialStatusFilter || '');
  const [branchFilter, setBranchFilter] = useState(user?.branchId || '');
  const [departmentFilter, setDepartmentFilter] = useState(user?.departmentId || '');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const isBranchScoped = user?.role === UserRole.BRANCH_MANAGER || user?.role === UserRole.DEPARTMENT_USER;

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const [docsRes, brRes, deptRes] = await Promise.all([
        api.getDocuments({
          status: statusFilter || undefined,
          branchId: branchFilter || undefined,
          departmentId: departmentFilter || undefined,
          category: categoryFilter || undefined,
          search: searchQuery || undefined,
          page,
          limit: 12,
        }),
        api.getBranches(),
        api.getDepartments(),
      ]);

      setDocuments(docsRes.documents);
      setTotalPages(docsRes.totalPages);
      setTotalCount(docsRes.total);
      setBranches(brRes.branches);
      setDepartments(deptRes.departments);
    } catch (err) {
      console.error('Error loading documents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [statusFilter, branchFilter, departmentFilter, categoryFilter, searchQuery, page]);

  const statusTabs = [
    { label: 'All Documents', value: '' },
    { label: 'Pending Verification', value: DocumentStatus.PENDING_VERIFICATION },
    { label: 'Verified', value: DocumentStatus.VERIFIED },
    { label: 'Rejected', value: DocumentStatus.REJECTED },
    { label: 'Not Uploaded', value: DocumentStatus.NOT_UPLOADED },
    { label: 'Expired', value: DocumentStatus.EXPIRED },
  ];

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 uppercase tracking-tight">
              CENTRAL DOCUMENT REGISTRY
            </h1>
            <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200">
              {totalCount} RECORDS
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Complete inventory of technical, statutory, personnel certifications and engineering compliance records.
          </p>
        </div>

        <button
          onClick={onUploadDocument}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition shadow-sm flex items-center gap-2 shrink-0"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Quick Status Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {statusTabs.map((tab) => {
          const isActive = statusFilter === tab.value;
          return (
            <button
              key={tab.label}
              onClick={() => {
                setStatusFilter(tab.value);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 shadow-xs'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        
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
            placeholder="Search title, document #, employee..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Branch Filter */}
        <select
          value={branchFilter}
          onChange={(e) => {
            setBranchFilter(e.target.value);
            setPage(1);
          }}
          disabled={isBranchScoped}
          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <option value="">All Regional Branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        {/* Department Filter */}
        <select
          value={departmentFilter}
          onChange={(e) => {
            setDepartmentFilter(e.target.value);
            setPage(1);
          }}
          disabled={user?.role === UserRole.DEPARTMENT_USER}
          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Document Categories</option>
          <option value="HSE & Safety Certification">HSE & Safety Certification</option>
          <option value="QAQC & Technical Accreditation">QAQC & Technical Accreditation</option>
          <option value="Engineering & Statutory Machinery">Engineering & Statutory Machinery</option>
        </select>

      </div>

      {/* Main Documents Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3">Doc Number</th>
                <th className="py-3 px-3">Document Title</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Branch Location</th>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3">Personnel</th>
                <th className="py-3 px-3">Expiry Date</th>
                <th className="py-3 px-3">Version</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading documents registry...</span>
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <Files className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-60" />
                    <p className="font-semibold text-slate-800">No documents found matching filters</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Try resetting search filters or upload a new record.</p>
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3 font-mono font-bold text-blue-600">{doc.documentNumber}</td>
                    <td className="py-3 px-3 font-semibold text-slate-900 max-w-[200px] truncate">
                      {doc.title}
                    </td>
                    <td className="py-3 px-3 text-slate-500">{doc.category}</td>
                    <td className="py-3 px-3 font-medium text-slate-700">{doc.branchName}</td>
                    <td className="py-3 px-3 text-slate-500">{doc.departmentName}</td>
                    <td className="py-3 px-3">
                      {doc.employeeName ? (
                        <div>
                          <span className="font-medium text-slate-800">{doc.employeeName}</span>
                          <span className="text-[10px] text-slate-500 block font-mono">({doc.employeeNumber})</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Facility Record</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-[11px] ${doc.expiryDate ? 'text-orange-600 font-mono font-medium' : 'text-slate-400'}`}>
                        {doc.expiryDate || 'N/A'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px]">
                      {doc.currentVersionNumber > 0 ? (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                          v{doc.currentVersionNumber}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={doc.status} size="sm" />
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onOpenDocument(doc.id)}
                          className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-md text-xs font-semibold transition shadow-xs"
                        >
                          View
                        </button>
                        {doc.status === DocumentStatus.REJECTED && (
                          <button
                            onClick={() => onUploadReplacement(doc)}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-semibold transition shadow-xs"
                          >
                            Replace
                          </button>
                        )}
                        {doc.status === DocumentStatus.NOT_UPLOADED && (
                          <button
                            onClick={() => onUploadReplacement(doc)}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold transition shadow-xs"
                          >
                            Upload
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing Page {page} of {totalPages} ({totalCount} total items)
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-slate-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 font-semibold text-slate-800">{page}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-slate-700"
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
