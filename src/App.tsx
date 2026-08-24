import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar, TabType } from './components/Sidebar';
import { DocumentViewerModal } from './components/DocumentViewerModal';
import { UploadDocumentModal } from './components/UploadDocumentModal';
import { TestSuiteModal } from './components/TestSuiteModal';
import { LoginPage } from './pages/LoginPage';
import { HeadOfficeDashboard } from './pages/HeadOfficeDashboard';
import { BranchDashboard } from './pages/BranchDashboard';
import { VerificationQueuePage } from './pages/VerificationQueuePage';
import { DocumentsPage } from './pages/DocumentsPage';
import { BranchesPage } from './pages/BranchesPage';
import { DepartmentsPage } from './pages/DepartmentsPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { RequirementsPage } from './pages/RequirementsPage';
import { ExpiringPage } from './pages/ExpiringPage';
import { ReportsPage } from './pages/ReportsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { DocumentRecord, UserRole } from './types';
import { api } from './services/api';

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

  // Modals state
  const [reviewDocId, setReviewDocId] = useState<string | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadTargetDoc, setUploadTargetDoc] = useState<DocumentRecord | null>(null);
  const [uploadTargetEmpId, setUploadTargetEmpId] = useState<string | null>(null);
  const [testSuiteOpen, setTestSuiteOpen] = useState(false);

  // Counters
  const [pendingCount, setPendingCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const loadBadges = async () => {
    if (!user) return;
    try {
      if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.HEAD_OFFICE_ADMIN) {
        const res = await api.getHeadOfficeDashboard();
        setPendingCount(res.kpis?.pending || 0);
      } else if (user.branchId) {
        const res = await api.getBranchDashboard(user.branchId);
        setRejectedCount(res.stats?.rejected || 0);
        setPendingCount(res.stats?.pending || 0);
      }
    } catch {}
  };

  useEffect(() => {
    loadBadges();
  }, [user, refreshTrigger]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center text-slate-600">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold tracking-wide text-slate-700">Initializing Poratha Security & DCS...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const isHeadOfficeOrAdmin = user.role === UserRole.SUPER_ADMIN || user.role === UserRole.HEAD_OFFICE_ADMIN || user.role === UserRole.VIEW_ONLY;

  const handleOpenDoc = (docId: string) => {
    setReviewDocId(docId);
  };

  const handleUploadNew = () => {
    setUploadTargetDoc(null);
    setUploadTargetEmpId(null);
    setUploadModalOpen(true);
  };

  const handleUploadReplacement = (doc: DocumentRecord) => {
    setUploadTargetDoc(doc);
    setUploadTargetEmpId(null);
    setUploadModalOpen(true);
  };

  const handleUploadForEmployee = (empId: string) => {
    setUploadTargetDoc(null);
    setUploadTargetEmpId(empId);
    setUploadModalOpen(true);
  };

  const handleSelectBranch = (branchId: string) => {
    setSelectedBranchId(branchId);
    setActiveTab('dashboard');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      
      {/* Top Navbar */}
      <Navbar
        onOpenTestSuite={() => setTestSuiteOpen(true)}
        onSelectDocument={handleOpenDoc}
      />

      {/* Main Workspace Layout */}
      <div className="flex flex-1 w-full">
        
        {/* Role-Aware Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => {
            if (tab === 'dashboard') {
              // Reset manual branch override if returning to default dashboard
              setSelectedBranchId(null);
            }
            setActiveTab(tab);
          }}
          pendingCount={pendingCount}
          rejectedCount={rejectedCount}
        />

        {/* Content View Area */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto max-w-full bg-[#F8FAFC]">
          
          {/* Dashboard View */}
          {activeTab === 'dashboard' && (
            <>
              {selectedBranchId ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setSelectedBranchId(null)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                    >
                      ← Back to Corporate HQ Overview
                    </button>
                  </div>
                  <BranchDashboard
                    branchId={selectedBranchId}
                    onOpenDocument={handleOpenDoc}
                    onUploadDocument={handleUploadNew}
                    onUploadReplacement={handleUploadReplacement}
                  />
                </div>
              ) : isHeadOfficeOrAdmin ? (
                <HeadOfficeDashboard
                  onOpenDocument={handleOpenDoc}
                  onNavigateToQueue={() => setActiveTab('verification-queue')}
                  onSelectBranch={handleSelectBranch}
                />
              ) : (
                <BranchDashboard
                  onOpenDocument={handleOpenDoc}
                  onUploadDocument={handleUploadNew}
                  onUploadReplacement={handleUploadReplacement}
                />
              )}
            </>
          )}

          {/* Verification Queue (Head Office review) */}
          {activeTab === 'verification-queue' && (
            <VerificationQueuePage
              onOpenDocument={handleOpenDoc}
              onRefreshGlobal={() => setRefreshTrigger((t) => t + 1)}
            />
          )}

          {/* Documents Registry */}
          {activeTab === 'documents' && (
            <DocumentsPage
              onOpenDocument={handleOpenDoc}
              onUploadDocument={handleUploadNew}
              onUploadReplacement={handleUploadReplacement}
            />
          )}

          {/* Regional Branches */}
          {activeTab === 'branches' && (
            <BranchesPage onSelectBranch={handleSelectBranch} />
          )}

          {/* Departments */}
          {activeTab === 'departments' && <DepartmentsPage />}

          {/* Employees & Compliance Profiles */}
          {activeTab === 'employees' && (
            <EmployeesPage
              onOpenDocument={handleOpenDoc}
              onUploadReplacement={handleUploadReplacement}
              onUploadNewDocForEmployee={handleUploadForEmployee}
            />
          )}

          {/* Document Requirements Rulebook */}
          {activeTab === 'requirements' && <RequirementsPage />}

          {/* Expiry Radar */}
          {activeTab === 'expiring' && (
            <ExpiringPage
              onOpenDocument={handleOpenDoc}
              onUploadReplacement={handleUploadReplacement}
            />
          )}

          {/* Reports & CSV Exports */}
          {activeTab === 'reports' && <ReportsPage />}

          {/* Audit Logs */}
          {activeTab === 'audit-logs' && <AuditLogsPage />}

        </main>
      </div>

      {/* Global Document Viewer / Verification Modal */}
      {reviewDocId && (
        <DocumentViewerModal
          documentId={reviewDocId}
          onClose={() => setReviewDocId(null)}
          onRefresh={() => setRefreshTrigger((t) => t + 1)}
          onUploadReplacement={(doc) => {
            setReviewDocId(null);
            handleUploadReplacement(doc);
          }}
        />
      )}

      {/* Upload Document / Replacement Modal */}
      {uploadModalOpen && (
        <UploadDocumentModal
          initialDoc={uploadTargetDoc}
          initialEmployeeId={uploadTargetEmpId}
          onClose={() => {
            setUploadModalOpen(false);
            setUploadTargetDoc(null);
            setUploadTargetEmpId(null);
          }}
          onSuccess={() => {
            setRefreshTrigger((t) => t + 1);
          }}
        />
      )}

      {/* Automated Test Suite Modal */}
      {testSuiteOpen && (
        <TestSuiteModal onClose={() => setTestSuiteOpen(false)} />
      )}

    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
