import { Database } from '../db/database.js';
import { DocumentStatus, Employee, DocumentRequirement, DocumentRecord } from '../types/index.js';

export interface ComplianceScore {
  totalRequired: number;
  verified: number;
  pending: number;
  rejected: number;
  expired: number;
  notUploaded: number;
  complianceRate: number; // percentage 0-100
  verificationRate: number; // percentage of uploaded docs that are verified
  totalUploaded: number;
}

export interface EmployeeComplianceProfile {
  employee: Employee;
  score: ComplianceScore;
  requirements: Array<{
    requirement: DocumentRequirement;
    document?: DocumentRecord | null;
    status: DocumentStatus;
    statusLabel: string;
    isCompliant: boolean;
  }>;
}

export class ComplianceService {
  public static calculateBranchCompliance(branchId: string): ComplianceScore {
    const db = Database.getInstance();
    const branchEmployees = db.getEmployees().filter((e) => e.branchId === branchId && e.status !== 'INACTIVE');
    const branchDocs = db.getDocuments().filter((d) => d.branchId === branchId);
    const requirements = db.getRequirements();

    let totalRequired = 0;
    let verified = 0;
    let pending = 0;
    let rejected = 0;
    let expired = 0;
    let notUploaded = 0;

    branchEmployees.forEach((emp) => {
      const applicableReqs = requirements.filter(
        (r) => r.departmentId === emp.departmentId && (!r.applicableBranchId || r.applicableBranchId === branchId) && r.isRequired
      );

      applicableReqs.forEach((req) => {
        totalRequired++;
        const doc = branchDocs.find((d) => d.employeeId === emp.id && d.requirementId === req.id);
        if (!doc || doc.status === DocumentStatus.NOT_UPLOADED) {
          notUploaded++;
        } else if (doc.status === DocumentStatus.VERIFIED) {
          verified++;
        } else if (doc.status === DocumentStatus.PENDING_VERIFICATION) {
          pending++;
        } else if (doc.status === DocumentStatus.REJECTED) {
          rejected++;
        } else if (doc.status === DocumentStatus.EXPIRED) {
          expired++;
        }
      });
    });

    const totalUploaded = verified + pending + rejected + expired;
    const complianceRate = totalRequired > 0 ? Math.round((verified / totalRequired) * 1000) / 10 : 100;
    const verificationRate = totalUploaded > 0 ? Math.round((verified / totalUploaded) * 1000) / 10 : 0;

    return {
      totalRequired,
      verified,
      pending,
      rejected,
      expired,
      notUploaded,
      complianceRate,
      verificationRate,
      totalUploaded,
    };
  }

  public static calculateDepartmentCompliance(branchId: string | null, departmentId: string): ComplianceScore {
    const db = Database.getInstance();
    const employees = db
      .getEmployees()
      .filter((e) => e.departmentId === departmentId && (!branchId || e.branchId === branchId) && e.status !== 'INACTIVE');
    const docs = db.getDocuments().filter((d) => d.departmentId === departmentId && (!branchId || d.branchId === branchId));
    const requirements = db.getRequirements().filter((r) => r.departmentId === departmentId && r.isRequired);

    let totalRequired = 0;
    let verified = 0;
    let pending = 0;
    let rejected = 0;
    let expired = 0;
    let notUploaded = 0;

    employees.forEach((emp) => {
      const applicableReqs = requirements.filter(
        (r) => !r.applicableBranchId || r.applicableBranchId === emp.branchId
      );

      applicableReqs.forEach((req) => {
        totalRequired++;
        const doc = docs.find((d) => d.employeeId === emp.id && d.requirementId === req.id);
        if (!doc || doc.status === DocumentStatus.NOT_UPLOADED) {
          notUploaded++;
        } else if (doc.status === DocumentStatus.VERIFIED) {
          verified++;
        } else if (doc.status === DocumentStatus.PENDING_VERIFICATION) {
          pending++;
        } else if (doc.status === DocumentStatus.REJECTED) {
          rejected++;
        } else if (doc.status === DocumentStatus.EXPIRED) {
          expired++;
        }
      });
    });

    const totalUploaded = verified + pending + rejected + expired;
    const complianceRate = totalRequired > 0 ? Math.round((verified / totalRequired) * 1000) / 10 : 100;
    const verificationRate = totalUploaded > 0 ? Math.round((verified / totalUploaded) * 1000) / 10 : 0;

    return {
      totalRequired,
      verified,
      pending,
      rejected,
      expired,
      notUploaded,
      complianceRate,
      verificationRate,
      totalUploaded,
    };
  }

  public static calculateCompanyCompliance(): ComplianceScore {
    const db = Database.getInstance();
    const branches = db.getBranches().filter((b) => b.isActive);

    let totalRequired = 0;
    let verified = 0;
    let pending = 0;
    let rejected = 0;
    let expired = 0;
    let notUploaded = 0;

    branches.forEach((branch) => {
      const branchScore = this.calculateBranchCompliance(branch.id);
      totalRequired += branchScore.totalRequired;
      verified += branchScore.verified;
      pending += branchScore.pending;
      rejected += branchScore.rejected;
      expired += branchScore.expired;
      notUploaded += branchScore.notUploaded;
    });

    const totalUploaded = verified + pending + rejected + expired;
    const complianceRate = totalRequired > 0 ? Math.round((verified / totalRequired) * 1000) / 10 : 100;
    const verificationRate = totalUploaded > 0 ? Math.round((verified / totalUploaded) * 1000) / 10 : 0;

    return {
      totalRequired,
      verified,
      pending,
      rejected,
      expired,
      notUploaded,
      complianceRate,
      verificationRate,
      totalUploaded,
    };
  }

  public static getEmployeeProfile(employeeId: string): EmployeeComplianceProfile | null {
    const db = Database.getInstance();
    const employee = db.getEmployees().find((e) => e.id === employeeId);
    if (!employee) return null;

    const applicableReqs = db
      .getRequirements()
      .filter(
        (r) =>
          r.departmentId === employee.departmentId &&
          (!r.applicableBranchId || r.applicableBranchId === employee.branchId)
      );

    const employeeDocs = db.getDocuments().filter((d) => d.employeeId === employeeId);

    let totalRequired = 0;
    let verified = 0;
    let pending = 0;
    let rejected = 0;
    let expired = 0;
    let notUploaded = 0;

    const requirementsList = applicableReqs.map((req) => {
      if (req.isRequired) totalRequired++;
      const doc = employeeDocs.find((d) => d.requirementId === req.id);
      let status = doc ? doc.status : DocumentStatus.NOT_UPLOADED;

      if (status === DocumentStatus.VERIFIED) {
        if (req.isRequired) verified++;
      } else if (status === DocumentStatus.PENDING_VERIFICATION) {
        if (req.isRequired) pending++;
      } else if (status === DocumentStatus.REJECTED) {
        if (req.isRequired) rejected++;
      } else if (status === DocumentStatus.EXPIRED) {
        if (req.isRequired) expired++;
      } else {
        if (req.isRequired) notUploaded++;
      }

      return {
        requirement: req,
        document: doc || null,
        status,
        statusLabel: status.replace(/_/g, ' '),
        isCompliant: status === DocumentStatus.VERIFIED,
      };
    });

    const totalUploaded = verified + pending + rejected + expired;
    const complianceRate = totalRequired > 0 ? Math.round((verified / totalRequired) * 1000) / 10 : 100;
    const verificationRate = totalUploaded > 0 ? Math.round((verified / totalUploaded) * 1000) / 10 : 0;

    return {
      employee,
      score: {
        totalRequired,
        verified,
        pending,
        rejected,
        expired,
        notUploaded,
        complianceRate,
        verificationRate,
        totalUploaded,
      },
      requirements: requirementsList,
    };
  }
}
