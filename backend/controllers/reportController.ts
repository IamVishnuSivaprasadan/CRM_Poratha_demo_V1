import { Response } from 'express';
import { Database } from '../db/database.js';
import { AuthenticatedRequest, checkBranchAccess } from '../auth/authMiddleware.js';
import { ComplianceService } from '../services/complianceService.js';
import { DocumentStatus } from '../types/index.js';

export class ReportController {
  public static async getComplianceReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    const db = Database.getInstance();
    const branches = db.getBranches().filter((b) => b.isActive);
    const format = req.query.format;

    const reportData = branches.map((branch) => {
      const stats = ComplianceService.calculateBranchCompliance(branch.id);
      const employees = db.getEmployees().filter((e) => e.branchId === branch.id && e.status !== 'INACTIVE');
      return {
        branchCode: branch.code,
        branchName: branch.name,
        location: branch.location,
        employeeCount: employees.length,
        totalRequired: stats.totalRequired,
        totalUploaded: stats.totalUploaded,
        verified: stats.verified,
        pending: stats.pending,
        rejected: stats.rejected,
        notUploaded: stats.notUploaded,
        expired: stats.expired,
        complianceRate: `${stats.complianceRate}%`,
        verificationRate: `${stats.verificationRate}%`,
      };
    });

    if (format === 'csv') {
      const headers = ['Branch Code', 'Branch Name', 'Location', 'Active Employees', 'Total Required', 'Uploaded', 'Verified', 'Pending', 'Rejected', 'Missing', 'Expired', 'Compliance %', 'Verification %'];
      const rows = reportData.map((d) => [
        `"${d.branchCode}"`,
        `"${d.branchName}"`,
        `"${d.location}"`,
        d.employeeCount,
        d.totalRequired,
        d.totalUploaded,
        d.verified,
        d.pending,
        d.rejected,
        d.notUploaded,
        d.expired,
        d.complianceRate,
        d.verificationRate,
      ].join(','));

      const csv = [headers.join(','), ...rows].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="poratha_branch_compliance_report_${Date.now()}.csv"`);
      res.send(csv);
      return;
    }

    res.json({
      reportTitle: 'Poratha Corporate Branch Compliance & Document Control Report',
      generatedAt: new Date().toISOString(),
      branches: reportData.map((b) => ({
        ...b,
        code: b.branchCode,
        name: b.branchName,
      })),
      data: reportData,
    });
  }

  public static async getPendingReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    const db = Database.getInstance();
    const format = req.query.format;
    const docs = db
      .getDocuments()
      .filter((d) => d.status === DocumentStatus.PENDING_VERIFICATION && d.currentVersionId)
      .sort((a, b) => new Date(a.updatedAt || a.createdAt).getTime() - new Date(b.updatedAt || b.createdAt).getTime());

    const reportData = docs.map((d) => ({
      id: d.id,
      documentNumber: d.documentNumber,
      title: d.title,
      requirement: d.requirementName,
      requirementName: d.requirementName,
      branch: d.branchName,
      branchName: d.branchName,
      department: d.departmentName,
      departmentName: d.departmentName,
      employee: d.employeeName || 'N/A',
      employeeName: d.employeeName,
      employeeId: d.employeeNumber || 'N/A',
      employeeNumber: d.employeeNumber,
      expiryDate: d.expiryDate,
      status: d.status,
      version: `v${d.currentVersionNumber}`,
      uploadedAt: d.updatedAt || d.createdAt,
      waitingHours: Math.round((Date.now() - new Date(d.updatedAt || d.createdAt).getTime()) / 3600000),
    }));

    if (format === 'csv') {
      const headers = ['Doc Number', 'Title', 'Requirement', 'Branch', 'Department', 'Employee Name', 'Employee No', 'Version', 'Uploaded Date', 'Waiting Hours'];
      const rows = reportData.map((d) => [
        `"${d.documentNumber}"`,
        `"${d.title}"`,
        `"${d.requirement}"`,
        `"${d.branch}"`,
        `"${d.department}"`,
        `"${d.employee}"`,
        `"${d.employeeId}"`,
        `"${d.version}"`,
        `"${d.uploadedAt}"`,
        d.waitingHours,
      ].join(','));

      const csv = [headers.join(','), ...rows].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="poratha_pending_review_queue_${Date.now()}.csv"`);
      res.send(csv);
      return;
    }

    res.json({
      reportTitle: 'Poratha Pending Verification Review Queue',
      generatedAt: new Date().toISOString(),
      totalPending: reportData.length,
      documents: reportData,
      data: reportData,
    });
  }

  public static async getRejectedReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    const db = Database.getInstance();
    const format = req.query.format;
    const docs = db.getDocuments().filter((d) => d.status === DocumentStatus.REJECTED);

    const reportData = docs.map((d) => ({
      id: d.id,
      documentNumber: d.documentNumber,
      title: d.title,
      branch: d.branchName,
      branchName: d.branchName,
      department: d.departmentName,
      departmentName: d.departmentName,
      employee: d.employeeName || 'N/A',
      employeeName: d.employeeName,
      rejectionReason: d.lastRejectionReason || 'Other',
      lastRejectionReason: d.lastRejectionReason || 'Other',
      rejectionComments: d.lastRejectionComments || '',
      lastRejectionComments: d.lastRejectionComments || '',
      updatedAt: d.updatedAt,
    }));

    if (format === 'csv') {
      const headers = ['Doc Number', 'Title', 'Branch', 'Department', 'Employee Name', 'Reason Code', 'Feedback Comments', 'Rejected Date'];
      const rows = reportData.map((d) => [
        `"${d.documentNumber}"`,
        `"${d.title}"`,
        `"${d.branch}"`,
        `"${d.department}"`,
        `"${d.employee}"`,
        `"${d.rejectionReason}"`,
        `"${(d.rejectionComments || '').replace(/"/g, '""')}"`,
        `"${d.updatedAt}"`,
      ].join(','));

      const csv = [headers.join(','), ...rows].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="poratha_rejected_documents_${Date.now()}.csv"`);
      res.send(csv);
      return;
    }

    res.json({
      reportTitle: 'Poratha Rejected Documents Audit',
      generatedAt: new Date().toISOString(),
      totalRejected: reportData.length,
      documents: reportData,
      data: reportData,
    });
  }

  public static async getExpiringReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    const db = Database.getInstance();
    const format = req.query.format;
    const today = new Date().toISOString().split('T')[0];

    const docs = db
      .getDocuments()
      .filter((d) => d.expiryDate)
      .sort((a, b) => (a.expiryDate! > b.expiryDate! ? 1 : -1));

    const reportData = docs.map((d) => {
      const isExpired = d.expiryDate! < today;
      const daysDiff = Math.round((new Date(d.expiryDate!).getTime() - new Date(today).getTime()) / (1000 * 3600 * 24));

      return {
        id: d.id,
        documentNumber: d.documentNumber,
        title: d.title,
        branch: d.branchName,
        branchName: d.branchName,
        department: d.departmentName,
        departmentName: d.departmentName,
        employee: d.employeeName || 'N/A',
        employeeName: d.employeeName,
        expiryDate: d.expiryDate,
        daysRemaining: daysDiff,
        status: isExpired ? 'EXPIRED' : daysDiff <= 30 ? 'EXPIRING_URGENT' : 'ACTIVE',
      };
    });

    if (format === 'csv') {
      const headers = ['Doc Number', 'Title', 'Branch', 'Department', 'Employee Name', 'Expiry Date', 'Days Remaining', 'Status'];
      const rows = reportData.map((d) => [
        `"${d.documentNumber}"`,
        `"${d.title}"`,
        `"${d.branch}"`,
        `"${d.department}"`,
        `"${d.employee}"`,
        `"${d.expiryDate}"`,
        d.daysRemaining,
        `"${d.status}"`,
      ].join(','));

      const csv = [headers.join(','), ...rows].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="poratha_expiring_documents_${Date.now()}.csv"`);
      res.send(csv);
      return;
    }

    res.json({
      reportTitle: 'Poratha Document Expiry & Renewal Forecast',
      generatedAt: new Date().toISOString(),
      documents: reportData,
      data: reportData,
    });
  }
}
