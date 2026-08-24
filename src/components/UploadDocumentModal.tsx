import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Branch, Department, DocumentRecord, DocumentRequirement, Employee, UserRole } from '../types';
import { api } from '../services/api';
import { Upload, X, FileUp, AlertCircle, Calendar, Check, Info } from 'lucide-react';

interface UploadDocumentModalProps {
  initialDoc?: DocumentRecord | null;
  initialEmployeeId?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const UploadDocumentModal: React.FC<UploadDocumentModalProps> = ({
  initialDoc,
  initialEmployeeId,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [requirements, setRequirements] = useState<DocumentRequirement[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [selectedRequirementId, setSelectedRequirementId] = useState(initialDoc?.requirementId || '');
  const [selectedBranchId, setSelectedBranchId] = useState(initialDoc?.branchId || user?.branchId || 'br_01');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(initialDoc?.departmentId || user?.departmentId || 'dept_01');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(initialDoc?.employeeId || initialEmployeeId || '');
  const [expiryDate, setExpiryDate] = useState(initialDoc?.expiryDate || '');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const isReplacement = Boolean(initialDoc && initialDoc.currentVersionNumber >= 1);

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [reqRes, brRes, deptRes, empRes] = await Promise.all([
          api.getRequirements(),
          api.getBranches(),
          api.getDepartments(),
          api.getEmployees({ branchId: selectedBranchId }),
        ]);
        setRequirements(reqRes.requirements);
        setBranches(brRes.branches);
        setDepartments(deptRes.departments);
        setEmployees(empRes.employees);

        if (!selectedRequirementId && reqRes.requirements.length > 0) {
          setSelectedRequirementId(reqRes.requirements[0].id);
        }
      } catch (err) {
        console.error('Error loading metadata:', err);
      }
    };
    loadMetadata();
  }, [selectedBranchId]);

  const selectedReq = requirements.find((r) => r.id === selectedRequirementId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert('Please select a file to upload.');
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('file', file);
    if (expiryDate) formData.append('expiryDate', expiryDate);
    if (issueDate) formData.append('issueDate', issueDate);
    if (notes) formData.append('notes', notes);

    try {
      if (isReplacement && initialDoc) {
        await api.uploadReplacementVersion(initialDoc.id, formData);
      } else {
        formData.append('requirementId', selectedRequirementId);
        formData.append('branchId', selectedBranchId);
        formData.append('departmentId', selectedDepartmentId);
        if (selectedEmployeeId) formData.append('employeeId', selectedEmployeeId);

        await api.uploadDocument(formData);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Upload failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <FileUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isReplacement ? `Upload Replacement Version ${initialDoc!.currentVersionNumber + 1}` : 'Upload Document'}
              </h2>
              <p className="text-xs text-slate-500">
                {isReplacement
                  ? `Replacing ${initialDoc?.documentNumber} (${initialDoc?.title})`
                  : 'Document will enter PENDING VERIFICATION status for Head Office review.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
          
          {/* Important Rule Banner */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Core Verification Rule:</span>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Uploaded documents do not automatically become verified. The document status will immediately be set to{' '}
                <strong className="text-amber-800">PENDING VERIFICATION</strong> and routed to the Head Office Review Queue.
              </p>
            </div>
          </div>

          {/* Drag & Drop File Upload Area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                setFile(e.dataTransfer.files[0]);
              }
            }}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
              dragOver
                ? 'border-blue-500 bg-blue-50/50'
                : file
                ? 'border-emerald-500/60 bg-emerald-50/40'
                : 'border-slate-300 hover:border-slate-400 bg-slate-50'
            }`}
          >
            <input
              type="file"
              id="file-upload"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setFile(e.target.files[0]);
                }
              }}
              className="hidden"
            />
            <label htmlFor="file-upload" className="cursor-pointer block">
              <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
              {file ? (
                <div className="text-slate-800">
                  <span className="font-bold text-emerald-600">{file.name}</span>
                  <span className="text-slate-500 block text-[11px] mt-0.5">
                    ({(file.size / 1024).toFixed(1)} KB) — Click to choose different file
                  </span>
                </div>
              ) : (
                <div className="text-slate-600">
                  <span className="font-semibold text-blue-600">Click to upload file</span> or drag and drop here
                  <p className="text-[11px] text-slate-400 mt-1">Accepted formats: PDF, JPG, PNG, WEBP (Max 50MB)</p>
                </div>
              )}
            </label>
          </div>

          {/* Form Fields */}
          {!isReplacement && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Document Requirement <span className="text-rose-600">*</span>
                </label>
                <select
                  value={selectedRequirementId}
                  onChange={(e) => setSelectedRequirementId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {requirements.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Branch Station <span className="text-rose-600">*</span>
                </label>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  disabled={user?.role === UserRole.BRANCH_MANAGER || user?.role === UserRole.DEPARTMENT_USER}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Department <span className="text-rose-600">*</span>
                </label>
                <select
                  value={selectedDepartmentId}
                  onChange={(e) => setSelectedDepartmentId(e.target.value)}
                  disabled={user?.role === UserRole.DEPARTMENT_USER}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Employee / Personnel (Optional)
                </label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- General Department Record --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.employeeNumber})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Expiry Date & Issue Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Document Expiry Date {selectedReq?.expiryRequired && <span className="text-orange-600">*</span>}
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                required={selectedReq?.expiryRequired}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[10px] text-slate-400">
                {selectedReq?.expiryRequired ? 'Mandatory for this document category.' : 'Optional if certificate has no expiry.'}
              </span>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Issue Date</label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Upload Notes / Remarks</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Renewed certificate for 2026 site mobilization..."
              rows={2}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !file}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-semibold shadow-xs transition flex items-center gap-1.5"
            >
              {isSubmitting ? 'Uploading & Processing...' : isReplacement ? 'Submit Replacement Version' : 'Upload Document'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
