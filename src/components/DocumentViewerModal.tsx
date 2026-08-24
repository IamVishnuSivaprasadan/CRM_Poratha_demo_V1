import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { DocumentRecord, DocumentStatus, DocumentVersion, DocumentVerification, RejectionReasonCode, UserRole } from '../types';
import { api } from '../services/api';
import { StatusBadge } from './StatusBadge';
import {
  X,
  CheckCircle2,
  XCircle,
  Download,
  Upload,
  History,
  FileText,
  Building2,
  User,
  Calendar,
  AlertTriangle,
  Eye,
  ShieldCheck,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Info,
} from 'lucide-react';

interface DocumentViewerModalProps {
  documentId: string | null;
  onClose: () => void;
  onRefresh: () => void;
  onUploadReplacement: (doc: DocumentRecord) => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  documentId,
  onClose,
  onRefresh,
  onUploadReplacement,
}) => {
  const { user } = useAuth();
  const [doc, setDoc] = useState<DocumentRecord | null>(null);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [verifications, setVerifications] = useState<DocumentVerification[]>([]);
  const [requirement, setRequirement] = useState<any>(null);
  const [selectedVersion, setSelectedVersion] = useState<DocumentVersion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verification & Rejection dialog states
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [verifyComments, setVerifyComments] = useState('');
  const [rejectReasonCode, setRejectReasonCode] = useState<RejectionReasonCode>(RejectionReasonCode.POOR_SCAN_QUALITY);
  const [rejectComments, setRejectComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Preview zoom & rotation controls
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  const isHeadOfficeOrAdmin = user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.HEAD_OFFICE_ADMIN;

  const loadDocumentDetails = async () => {
    if (!documentId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getDocument(documentId);
      setDoc(res.document);
      setVersions(res.versions);
      setVerifications(res.verifications);
      setRequirement(res.requirement);
      if (res.versions.length > 0) {
        // Default to latest version
        setSelectedVersion(res.versions[res.versions.length - 1]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load document');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocumentDetails();
  }, [documentId]);

  if (!documentId) return null;

  const handleVerify = async () => {
    if (!doc) return;
    setIsSubmitting(true);
    try {
      await api.verifyDocument(doc.id, verifyComments);
      setIsVerifying(false);
      setVerifyComments('');
      await loadDocumentDetails();
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Verification failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!doc) return;
    if (!rejectReasonCode) {
      alert('Please select a rejection reason code.');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.rejectDocument(doc.id, rejectReasonCode, rejectComments || rejectReasonCode);
      setIsRejecting(false);
      setRejectComments('');
      await loadDocumentDetails();
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Rejection failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = () => {
    if (!doc || !selectedVersion) return;
    const url = `/api/documents/${doc.id}/versions/${selectedVersion.id}/file?download=true`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 truncate">
            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 truncate">{doc?.title || 'Document Review'}</h2>
                {doc && <StatusBadge status={doc.status} size="sm" />}
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {doc?.documentNumber} • {doc?.branchName} • {doc?.departmentName}
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left / Top: Document Preview Area (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col bg-slate-50 border border-slate-200 rounded-xl overflow-hidden min-h-[380px]">
            {/* Preview Toolbar */}
            <div className="p-2.5 bg-white border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900">
                  {selectedVersion ? `Version ${selectedVersion.versionNumber}` : 'No File Uploaded'}
                </span>
                {selectedVersion && (
                  <span className="text-[11px] text-slate-400 truncate max-w-[180px]">
                    ({selectedVersion.originalFilename})
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setZoom((z) => Math.max(50, z - 20))}
                  title="Zoom Out"
                  className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-900"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-[11px] text-slate-500 font-mono">{zoom}%</span>
                <button
                  onClick={() => setZoom((z) => Math.min(200, z + 20))}
                  title="Zoom In"
                  className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-900"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  title="Rotate"
                  className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-900 ml-1"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                {selectedVersion && (
                  <button
                    onClick={handleDownload}
                    title="Download Authorized Copy"
                    className="flex items-center gap-1 ml-2 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-[11px] font-medium transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                )}
              </div>
            </div>

            {/* Document Canvas / Preview Stage */}
            <div className="flex-1 flex items-center justify-center p-6 bg-slate-100 overflow-hidden relative">
              {isLoading ? (
                <div className="text-slate-500 text-xs flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span>Loading document stream...</span>
                </div>
              ) : selectedVersion ? (
                <div
                  style={{
                    transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                    transition: 'transform 0.2s ease-out',
                  }}
                  className="w-full max-w-md bg-white text-slate-900 rounded-lg shadow-xl p-8 border border-slate-200"
                >
                  <div className="border-4 border-slate-900 p-6 flex flex-col items-center text-center space-y-4">
                    <div className="text-sm font-black tracking-widest uppercase text-slate-900">
                      PORATHA CORPORATION
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                      Engineering & Technical Document Archive
                    </div>
                    <div className="w-16 h-0.5 bg-blue-600 my-1" />
                    
                    <div className="text-xs font-bold text-slate-800 mt-2">
                      {doc?.requirementName || 'Certificate of Verification'}
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded p-3 w-full text-left space-y-1.5 text-[11px]">
                      <div>
                        <span className="text-slate-500">Document No:</span>{' '}
                        <span className="font-mono font-bold text-slate-900">{doc?.documentNumber}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Personnel / Unit:</span>{' '}
                        <span className="font-semibold text-slate-900">{doc?.employeeName || 'Site Department Record'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Branch Station:</span>{' '}
                        <span className="text-slate-800">{doc?.branchName}</span>
                      </div>
                      {doc?.expiryDate && (
                        <div>
                          <span className="text-slate-500">Validity Expiry:</span>{' '}
                          <span className="font-semibold text-slate-900">{doc.expiryDate}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-slate-500">Version Hash:</span>{' '}
                        <span className="font-mono text-[9px] text-slate-500 truncate block">
                          {selectedVersion.checksum.substring(0, 24)}...
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-200 w-full flex items-center justify-between text-[10px] text-slate-500">
                      <span>Uploaded By: {selectedVersion.uploadedByName}</span>
                      <span className="font-mono text-emerald-600 font-bold">VERIFIED AUTHENTIC</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center p-8 text-slate-500">
                  <AlertTriangle className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                  <p className="font-semibold text-slate-800">No Document Uploaded Yet</p>
                  <p className="text-xs mt-1 text-slate-500">Status is currently NOT UPLOADED (Missing Requirement).</p>
                  {doc && (
                    <button
                      onClick={() => onUploadReplacement(doc)}
                      className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-2 shadow-xs transition"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Upload Document Now</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Version Selector Carousel */}
            {versions.length > 1 && (
              <div className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2 overflow-x-auto">
                <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider shrink-0">
                  Versions:
                </span>
                {versions.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVersion(v)}
                    className={`px-3 py-1 rounded text-xs font-medium shrink-0 transition ${
                      selectedVersion?.id === v.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    v{v.versionNumber} ({new Date(v.uploadedAt).toLocaleDateString()})
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Metadata & Audit Workflow Panel (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            
            {/* Status Alert Banner */}
            {doc?.status === DocumentStatus.REJECTED && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs">
                <div className="flex items-center gap-2 font-bold text-rose-700">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span>ACTION REQUIRED: DOCUMENT REJECTED</span>
                </div>
                <div className="mt-1.5 text-slate-700">
                  <span className="font-semibold text-rose-700">Reason: </span>
                  {doc.lastRejectionReason?.replace(/_/g, ' ')}
                </div>
                {doc.lastRejectionComments && (
                  <div className="mt-1 text-slate-600">
                    <span className="font-semibold text-rose-700">Comments: </span>
                    {doc.lastRejectionComments}
                  </div>
                )}
                <button
                  onClick={() => onUploadReplacement(doc)}
                  className="mt-2.5 w-full py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold flex items-center justify-center gap-1.5 transition text-xs shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Replacement Version</span>
                </button>
              </div>
            )}

            {doc?.status === DocumentStatus.PENDING_VERIFICATION && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-800">Awaiting Head Office Verification.</span>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Uploaded documents require explicit verification by Corporate Document Controllers before being marked as compliant.
                  </p>
                </div>
              </div>
            )}

            {/* Metadata Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
              <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] border-b border-slate-200 pb-2">
                Document Metadata
              </h3>

              <div className="grid grid-cols-2 gap-2 text-slate-700">
                <div>
                  <span className="text-slate-500 block text-[10px]">Requirement</span>
                  <span className="font-semibold text-slate-900">{doc?.requirementName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Category</span>
                  <span className="font-semibold text-slate-900">{doc?.category}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Branch Location</span>
                  <span className="font-medium text-slate-800">{doc?.branchName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Department</span>
                  <span className="font-medium text-slate-800">{doc?.departmentName}</span>
                </div>
                {doc?.employeeName && (
                  <div>
                    <span className="text-slate-500 block text-[10px]">Employee / Personnel</span>
                    <span className="font-semibold text-slate-900">{doc.employeeName}</span>
                    <span className="text-[10px] text-slate-500 block font-mono">({doc.employeeNumber})</span>
                  </div>
                )}
                <div>
                  <span className="text-slate-500 block text-[10px]">Expiry Date</span>
                  <span className={`font-semibold ${doc?.expiryDate ? 'text-orange-600' : 'text-slate-400'}`}>
                    {doc?.expiryDate || 'No Expiry Required'}
                  </span>
                </div>
              </div>
            </div>

            {/* Version & Verification Audit History */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex-1 flex flex-col min-h-[160px]">
              <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] border-b border-slate-200 pb-2 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-blue-600" />
                <span>Verification Audit Trail</span>
              </h3>

              <div className="mt-3 space-y-3 overflow-y-auto max-h-48 flex-1 pr-1">
                {verifications.length === 0 ? (
                  <div className="text-slate-400 text-[11px] py-4 text-center">No review decisions logged yet.</div>
                ) : (
                  verifications.map((v) => (
                    <div key={v.id} className="text-xs border-l-2 pl-3 py-1 space-y-0.5 border-slate-300">
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-bold ${
                            v.action === 'VERIFIED' ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {v.action}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(v.createdAt).toLocaleDateString()} {new Date(v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-slate-700 text-[11px]">By: {v.verifiedByName}</div>
                      {v.comments && <div className="text-slate-500 text-[11px] italic">"{v.comments}"</div>}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Action Bar (Verify / Reject / Replace) */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2">
              {isHeadOfficeOrAdmin && doc?.status === DocumentStatus.PENDING_VERIFICATION && (
                <>
                  <button
                    onClick={() => setIsVerifying(true)}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition shadow-xs"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verify Document</span>
                  </button>

                  <button
                    onClick={() => setIsRejecting(true)}
                    className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition shadow-xs"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject</span>
                  </button>
                </>
              )}

              {(!isHeadOfficeOrAdmin || doc?.status !== DocumentStatus.PENDING_VERIFICATION) && doc && (
                <button
                  onClick={() => onUploadReplacement(doc)}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition shadow-xs"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload New / Replacement Version</span>
                </button>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* VERIFY CONFIRMATION MODAL */}
      {isVerifying && (
        <div className="fixed inset-0 z-60 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-emerald-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Verify & Sign Off Document</h3>
                <p className="text-xs text-slate-500">Mark this version as verified and compliant.</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Verification Comments / Notes (Optional)
              </label>
              <textarea
                value={verifyComments}
                onChange={(e) => setVerifyComments(e.target.value)}
                placeholder="e.g., Verified against DOSH accreditation registry. Valid until 2026."
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsVerifying(false)}
                disabled={isSubmitting}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={handleVerify}
                disabled={isSubmitting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-xs"
              >
                {isSubmitting ? 'Verifying...' : 'Confirm Sign-Off'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL WITH MANDATORY REASON */}
      {isRejecting && (
        <div className="fixed inset-0 z-60 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-rose-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Reject Document</h3>
                <p className="text-xs text-slate-500">Branch user will be required to upload a replacement.</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Rejection Reason Code <span className="text-rose-600">*</span>
              </label>
              <select
                value={rejectReasonCode}
                onChange={(e) => setRejectReasonCode(e.target.value as RejectionReasonCode)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value={RejectionReasonCode.POOR_SCAN_QUALITY}>Poor scan quality / Unreadable</option>
                <option value={RejectionReasonCode.DOCUMENT_EXPIRED}>Document is already expired</option>
                <option value={RejectionReasonCode.INCORRECT_DOCUMENT}>Incorrect document submitted</option>
                <option value={RejectionReasonCode.MISSING_PAGE}>Missing page / Incomplete record</option>
                <option value={RejectionReasonCode.NAME_MISMATCH}>Name or IC number mismatch</option>
                <option value={RejectionReasonCode.INVALID_CERTIFICATE}>Invalid / unaccredited certificate</option>
                <option value={RejectionReasonCode.INCORRECT_INFORMATION}>Incorrect information or metadata</option>
                <option value={RejectionReasonCode.DUPLICATE_DOCUMENT}>Duplicate document</option>
                <option value={RejectionReasonCode.OTHER}>Other feedback</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Actionable Feedback for Branch <span className="text-rose-600">*</span>
              </label>
              <textarea
                value={rejectComments}
                onChange={(e) => setRejectComments(e.target.value)}
                placeholder="Explain exactly what the branch needs to correct before re-uploading..."
                rows={3}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsRejecting(false)}
                disabled={isSubmitting}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={isSubmitting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-xs"
              >
                {isSubmitting ? 'Rejecting...' : 'Reject Document'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
