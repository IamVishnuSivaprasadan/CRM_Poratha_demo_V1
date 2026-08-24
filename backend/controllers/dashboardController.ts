import { Response } from 'express';
import { Database } from '../db/database.js';
import { AuthenticatedRequest, checkBranchAccess } from '../auth/authMiddleware.js';
import { ComplianceService } from '../services/complianceService.js';
import { DocumentStatus, RejectionReasonCode, UserRole } from '../types/index.js';

export class DashboardController {
  public static async getHeadOfficeDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    const db = Database.getInstance();
    const docs = db.getDocuments();
    const branches = db.getBranches().filter((b) => b.isActive);
    const departments = db.getDepartments().filter((d) => d.isActive);
    const employees = db.getEmployees().filter((e) => e.status !== 'INACTIVE');

    const companyScore = ComplianceService.calculateCompanyCompliance();

    const todayIso = new Date().toISOString().split('T')[0];
    const docsUploadedToday = docs.filter((d) => d.createdAt && d.createdAt.startsWith(todayIso)).length;
    const docsVerifiedToday = docs.filter((d) => d.lastVerifiedAt && d.lastVerifiedAt.startsWith(todayIso)).length;

    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);
    const in30DaysIso = in30Days.toISOString().split('T')[0];

    const expiringSoonCount = docs.filter(
      (d) => d.expiryDate && d.expiryDate >= todayIso && d.expiryDate <= in30DaysIso
    ).length;

    // Branch breakdown for charts & table
    const branchPerformance = branches.map((branch) => {
      const stats = ComplianceService.calculateBranchCompliance(branch.id);
      const branchEmployees = employees.filter((e) => e.branchId === branch.id);
      return {
        id: branch.id,
        code: branch.code,
        name: branch.name,
        location: branch.location,
        employeeCount: branchEmployees.length,
        ...stats,
      };
    });

    // Department breakdown
    const departmentPerformance = departments.map((dept) => {
      const stats = ComplianceService.calculateDepartmentCompliance(null, dept.id);
      return {
        id: dept.id,
        code: dept.code,
        name: dept.name,
        ...stats,
      };
    });

    // Rejection reasons breakdown
    const rejectionCounts: Record<string, number> = {};
    docs.forEach((d) => {
      if (d.status === DocumentStatus.REJECTED && d.lastRejectionReason) {
        rejectionCounts[d.lastRejectionReason] = (rejectionCounts[d.lastRejectionReason] || 0) + 1;
      }
    });

    const rejectionBreakdown = Object.keys(rejectionCounts).map((reason) => ({
      reason: reason.replace(/_/g, ' '),
      code: reason,
      count: rejectionCounts[reason],
    }));

    // Status distribution
    const statusDistribution = [
      { name: 'Verified', count: companyScore.verified, color: '#10b981' },
      { name: 'Pending Verification', count: companyScore.pending, color: '#f59e0b' },
      { name: 'Rejected', count: companyScore.rejected, color: '#ef4444' },
      { name: 'Expired', count: companyScore.expired, color: '#f97316' },
      { name: 'Not Uploaded', count: companyScore.notUploaded, color: '#dc2626' },
    ];

    // Priority Pending Review Queue (Oldest pending first)
    const pendingQueue = docs
      .filter((d) => d.status === DocumentStatus.PENDING_VERIFICATION && d.currentVersionId)
      .sort((a, b) => new Date(a.updatedAt || a.createdAt).getTime() - new Date(b.updatedAt || b.createdAt).getTime())
      .slice(0, 15);

    // Recent Activity / Audit Stream
    const recentAudits = db.getAuditLogs().slice(0, 10);

    res.json({
      title: 'PORATHA DOCUMENT CONTROL — HEAD OFFICE',
      kpis: {
        totalDocuments: docs.length,
        totalRequired: companyScore.totalRequired,
        verified: companyScore.verified,
        pending: companyScore.pending,
        rejected: companyScore.rejected,
        notUploaded: companyScore.notUploaded,
        expired: companyScore.expired,
        complianceRate: companyScore.complianceRate,
        verificationRate: companyScore.verificationRate,
        docsUploadedToday,
        docsVerifiedToday,
        expiringSoonCount,
        totalEmployees: employees.length,
        totalBranches: branches.length,
        totalDepartments: departments.length,
      },
      statusDistribution,
      branchPerformance,
      departmentPerformance,
      rejectionBreakdown,
      pendingQueue,
      recentAudits,
    });
  }

  public static async getBranchDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { branchId } = req.params;
    const user = req.user!;

    if (!checkBranchAccess(user, branchId)) {
      res.status(403).json({ error: 'Access denied: Unauthorized branch.' });
      return;
    }

    const db = Database.getInstance();
    const branch = db.getBranches().find((b) => b.id === branchId);

    if (!branch) {
      res.status(404).json({ error: 'Branch not found.' });
      return;
    }

    const branchDocs = db.getDocuments().filter((d) => d.branchId === branchId);
    const branchEmployees = db.getEmployees().filter((e) => e.branchId === branchId && e.status !== 'INACTIVE');
    const departments = db.getDepartments().filter((d) => d.isActive);

    const stats = ComplianceService.calculateBranchCompliance(branchId);

    // Department breakdown within this branch
    const departmentBreakdown = departments.map((dept) => {
      const deptStats = ComplianceService.calculateDepartmentCompliance(branchId, dept.id);
      const empCount = branchEmployees.filter((e) => e.departmentId === dept.id).length;
      return {
        ...dept,
        id: dept.id,
        code: dept.code,
        name: dept.name,
        description: dept.description,
        employeeCount: empCount,
        stats: deptStats,
        ...deptStats,
      };
    });

    // Action Required: Rejected Documents needing replacement
    const actionRequiredDocs = branchDocs
      .filter((d) => d.status === DocumentStatus.REJECTED)
      .slice(0, 10);

    // Pending Verification in this branch
    const branchPendingDocs = branchDocs
      .filter((d) => d.status === DocumentStatus.PENDING_VERIFICATION)
      .slice(0, 10);

    // Expiring within 30 days
    const todayIso = new Date().toISOString().split('T')[0];
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);
    const in30DaysIso = in30Days.toISOString().split('T')[0];

    const expiringDocs = branchDocs
      .filter((d) => d.expiryDate && d.expiryDate >= todayIso && d.expiryDate <= in30DaysIso)
      .slice(0, 10);

    const kpis = {
      totalRequired: stats.totalRequired,
      totalUploaded: stats.totalUploaded,
      verified: stats.verified,
      pending: stats.pending,
      rejected: stats.rejected,
      notUploaded: stats.notUploaded,
      expired: stats.expired,
      complianceRate: stats.complianceRate,
      verificationRate: stats.verificationRate,
      employeeCount: branchEmployees.length,
    };

    res.json({
      branch,
      stats,
      kpis,
      departments: departmentBreakdown,
      departmentBreakdown,
      rejectedDocs: actionRequiredDocs,
      actionRequiredDocs,
      pendingDocs: branchPendingDocs,
      branchPendingDocs,
      expiringSoonDocs: expiringDocs,
      expiringDocs,
      totalEmployees: branchEmployees.length,
    });
  }

  public static async getDepartmentDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { departmentId } = req.params;
    const branchId = (req.query.branchId as string) || (req.user?.branchId || null);
    const user = req.user!;

    const db = Database.getInstance();
    const department = db.getDepartments().find((d) => d.id === departmentId);

    if (!department) {
      res.status(404).json({ error: 'Department not found.' });
      return;
    }

    const stats = ComplianceService.calculateDepartmentCompliance(branchId, departmentId);
    const employees = db
      .getEmployees()
      .filter((e) => e.departmentId === departmentId && (!branchId || e.branchId === branchId));

    res.json({
      department,
      branchId,
      stats,
      employeesCount: employees.length,
    });
  }
}
